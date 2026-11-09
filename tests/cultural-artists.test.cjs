const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, mocks = {}, cache = new Map()) {
  let filename = path.resolve(root, file);
  if (!fs.existsSync(filename)) filename += fs.existsSync(filename + '.ts') ? '.ts' : '.tsx';
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  cache.set(filename, mod);
  mod.require = (id) => {
    const resolved = id.startsWith('src/')
      ? path.resolve(root, id)
      : id.startsWith('.')
        ? path.resolve(path.dirname(filename), id)
        : null;
    const key = resolved
      ? path
          .relative(root, resolved)
          .replace(/\\/g, '/')
          .replace(/\.tsx?$/, '')
      : id;
    if (Object.hasOwn(mocks, key)) return mocks[key];
    return resolved ? load(resolved, mocks, cache) : require(id);
  };
  mod._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    filename
  );
  return mod.exports;
}

const { parseCoordinate, isValidCoordinatePair } = load('src/utils/coordinates.ts');

const snapshot = require('../data/cultural-artists/registry.json');
const db = {
  from: () => ({
    select() {
      return this;
    },
    eq() {
      return this;
    },
    abortSignal() {
      return this;
    },
    async maybeSingle() {
      return { data: { content: snapshot }, error: null };
    },
  }),
};
const service = load('src/server/cultural-artists.ts', {
  'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client: db }) },
});

test('the imported directory has evidence for each assigned province', async () => {
  const directory = await service.getCulturalArtistDirectory();
  assert.equal(directory.artists.length, 1636);
  assert.equal(new Set(directory.artists.map((artist) => artist.id)).size, 1636);
  for (const artist of directory.artists) {
    assert.ok(artist.sources.length);
    assert.equal(artist.provinceStatus === 'verified', artist.provinceAssociations.length > 0);
    for (const province of artist.provinceAssociations)
      assert.match(province.sourceUrl, /^https:\/\//);
    for (const field of ['address', 'phone', 'email', 'tel']) assert.equal(field in artist, false);
  }
  assert.equal(directory.rawCounts.art_31_01, 367);
});

test('province and genre filters use verified relationships rather than guessed hometowns', () => {
  const artists = service.filterCulturalArtists(snapshot.artists, {
    provinceCode: 'TH-40',
    genre: 'หมอลำ',
  });
  assert.equal(artists.length, 3);
  assert.ok(
    artists.every((artist) =>
      artist.provinceAssociations.some(
        (province) => province.provinceCode === 'TH-40' && ['work_area', 'birthplace'].includes(province.relationship)
      )
    )
  );
  const maha = service.filterCulturalArtists(snapshot.artists, { provinceCode: 'TH-44' });
  assert.equal(maha.length, 2);
  assert.ok(
    maha.find((a) => a.name === 'ราตรีศรีวิไล บงสิทธิพร').provinceAssociations.some(
      (province) => province.provinceCode === 'TH-44' && province.relationship === 'birthplace'
    )
  );
});

test('local musicians are not labelled as national artists', () => {
  assert.equal(service.filterCulturalArtists(snapshot.artists, { q: 'จรัล มโนเพ็ชร' }).length, 1);
  assert.equal(
    service.filterCulturalArtists(snapshot.artists, { q: 'จรัล มโนเพ็ชร', type: 'national_artist' })
      .length,
    0
  );
  assert.deepEqual(snapshot.nationalRegistryCoverage, { fromBE: 2528, toBE: 2566 });
});

test('artist API validates province filters and paginates without dropping provenance', async () => {
  const route = load('src/app/api/cultural-artists/route.ts', {
    'src/server/cultural-artists': service,
    'src/server/dataset-visibility': { isDatasetVisible: async () => true },
  });
  const invalid = await route.GET({
    nextUrl: new URL('https://local.test/api/cultural-artists?provinceCode=TH-99'),
  });
  assert.equal(invalid.status, 400);
  const response = await route.GET({
    nextUrl: new URL('https://local.test/api/cultural-artists?page=2&pageSize=12'),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.total, 1636);
  assert.equal(body.data.length, 12);
  assert.equal(body.coverage.withVerifiedProvince, 105);
  assert.equal(body.coverage.provinces, 25);
  assert.ok(body.notes.length && body.sources.length);
  assert.ok(body.data.every((artist) => artist.sources.length));
});

test('the home-content API excludes the artist registry from the landing page payload', async () => {
  const rows = [
    { section_key: 'story-media', content: {} },
    { section_key: 'province-artists-v1', content: snapshot },
    { section_key: 'ethnic-community-supplements-v1', content: { items: [] } },
  ];
  const route = load('src/app/api/home-content/route.ts', {
    'src/server/supabase-admin': {
      getSupabaseAdmin: () => ({
        ok: true,
        client: {
          from() {
            return {
              select() {
                return this;
              },
              neq(field, value) {
                this.excluded = [...(this.excluded ?? []), value];
                return this;
              },
              then(resolve, reject) {
                return Promise.resolve({
                  data: rows.filter((row) => !this.excluded.includes(row.section_key)),
                  error: null,
                }).then(resolve, reject);
              },
            };
          },
        },
      }),
    },
  });
  const response = await route.GET();
  const body = await response.json();
  assert.equal('province-artists-v1' in body.data, false);
  assert.equal('ethnic-community-supplements-v1' in body.data, false);
  assert.equal('story-media' in body.data, true);
});

test('the pending-province view contains only artists without province evidence', () => {
  const pending = service.filterCulturalArtists(snapshot.artists, {
    provinceStatus: 'pending_verification',
  });
  assert.equal(pending.length, 1531);
  assert.ok(pending.every((artist) => artist.provinceAssociations.length === 0));
});

test('the artist admin page requires its own permission', () => {
  const permissions = load('src/auth/admin-permissions.ts');
  assert.equal(
    permissions.getAdminPermissionFromPath('/admin/cultural-artists'),
    'cultural_artists'
  );
  assert.equal(
    permissions.canAccessAdminPermission(
      { app_metadata: { role: 'admin' } },
      permissions.ADMIN_PERMISSION.culturalArtists
    ),
    true
  );
  assert.equal(
    permissions.canAccessAdminPermission(
      { app_metadata: { role: 'manage', admin_permissions: ['home_content'] } },
      permissions.ADMIN_PERMISSION.culturalArtists
    ),
    false
  );
});

test('Aof Surapol is searchable by stage name variants without national-artist designation', () => {
  for (const q of ['อ๊อฟ สุรพล', 'ออฟ สุรพล', 'สุรพล ทองด้วง']) {
    const matches = service.filterCulturalArtists(snapshot.artists, { q });
    assert.equal(matches.length, 1);
    assert.equal(matches[0].name, 'สุรพล ทองด้วง');
    assert.ok(matches[0].types.includes('folk_artist'));
    assert.equal(matches[0].types.includes('national_artist'), false);
    assert.equal(matches[0].types.includes('contemporary_artist'), false);
    assert.ok(
      matches[0].provinceAssociations.some(
        (province) => province.provinceCode === 'TH-43' && province.relationship === 'origin'
      )
    );
    assert.equal(matches[0].awards[0].yearBE, 2566);
    assert.equal(matches[0].recognitions.length, 0);
  }
});


test('performer supplement remains separate from official honours and has unique identities', async () => {
  const batch = require('../data/cultural-artists/performers.json');
  assert.equal(batch.length, 33);
  const identities = new Set();
  for (const artist of batch) {
    for (const name of [artist.name, ...artist.aliases]) {
      assert.equal(identities.has(name), false, `Shared identity: ${name}`);
      identities.add(name);
    }
    const matches = service.filterCulturalArtists(snapshot.artists, { q: artist.name });
    assert.equal(matches.length, 1);
    assert.ok(matches[0].types.includes('performing_artist'));
    assert.deepEqual(matches[0].recognitions, []);
    assert.equal('label' in artist, false);
  }
  const vieng = service.filterCulturalArtists(snapshot.artists, { q: 'เวียง นฤมล' })[0];
  assert.equal(vieng.provinceAssociations[0].provinceCode, 'TH-45');
  const ung = service.filterCulturalArtists(snapshot.artists, { q: 'อุ๋งอิ๋ง เพชรบ้านแพง' });
  assert.equal(ung.length, 1);
  assert.equal(ung[0].name, 'อุ๋งอิ๋ง รัตนาภรณ์');
  const kong = service.filterCulturalArtists(snapshot.artists, { q: 'ก้อง ห้วยไร่' })[0];
  assert.equal(kong.provinceStatus, 'pending_verification');
});

test('supplement merge is idempotent and refuses ambiguous stage names', () => {
  const { mergeArtists } = require('../scripts/merge-cultural-artists.cjs');
  const batch = require('../data/cultural-artists/performers.json');
  const merged = mergeArtists(snapshot, batch);
  assert.deepEqual(merged.stats, { added: 0, updated: 0, unchanged: 33 });
  assert.deepEqual(merged.directory, snapshot);
  const ambiguous = structuredClone(snapshot);
  ambiguous.artists.push({ ...structuredClone(batch[0]), id: 'other-id' });
  assert.throws(() => mergeArtists(ambiguous, batch), /Ambiguous artist/);
});

test('JSONB object key order does not cause duplicated evidence on re-import', () => {
  const { mergeArtists } = require('../scripts/merge-cultural-artists.cjs');
  const batch = require('../data/cultural-artists/performers.json');
  const reordered = JSON.parse(JSON.stringify(snapshot, (_, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).reverse()) : value));
  const merged = mergeArtists(reordered, batch);
  assert.deepEqual(merged.stats, { added: 0, updated: 0, unchanged: 33 });
  assert.deepEqual(merged.directory, reordered);
});

test('artist image endpoint rejects unauthorised updates before reading files', async () => {
  const route = load('src/app/api/admin/cultural-artists/image/route.ts', {
    'src/server/admin-api-auth': { verifyAdminRequest: async (_request, permission) => {
      assert.equal(permission, 'cultural_artists');
      return false;
    } },
  });
  const response = await route.POST({ formData() { throw new Error('Must not read body'); } });
  assert.equal(response.status, 401);
});

test('artist image update validates file signatures, preserves profiles and cleans up on conflict', async () => {
  const directory = structuredClone(snapshot);
  const artist = directory.artists[0];
  const savedImage = { url: 'https://example.com/photo.jpg', credit: 'Existing credit' };
  directory.artists[1].image = savedImage;
  let removed = false;
  let updatePayload;
  let conflict = false;
  let uploaded = false;
  const storage = {
    async upload() { uploaded = true; return { error: null }; },
    getPublicUrl() { return { data: { publicUrl: 'https://example.com/new.jpg' } }; },
    async remove() { removed = true; return { error: null }; },
  };
  const client = {
    storage: { from: () => storage },
    from: () => ({
      select() { return this; }, eq() { return this; },
      async single() { return { data: { content: structuredClone(directory), updated_at: 'old' }, error: null }; },
      update(payload) {
        updatePayload = payload;
        return { eq() { return this; }, async select() { return { error: null, data: conflict ? [] : [{ section_key: 'province-artists-v1' }] }; } };
      },
    }),
  };
  const route = load('src/app/api/admin/cultural-artists/image/route.ts', {
    'src/server/admin-api-auth': { verifyAdminRequest: async () => true },
    'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client }) },
  });
  const request = (bytes) => ({ async formData() {
    const form = new FormData();
    form.set('artistId', artist.id); form.set('credit', 'Photographer');
    form.set('file', new File([bytes], 'photo.jpg', { type: 'image/jpeg' }));
    return form;
  } });
  assert.equal((await route.POST(request('not-a-jpeg'))).status, 400);
  assert.equal(uploaded, false);
  const response = await route.POST(request(new Uint8Array([255, 216, 255, 0])));
  assert.equal(response.status, 200);
  assert.equal(updatePayload.content.artists.length, snapshot.artists.length);
  assert.equal(updatePayload.content.artists[0].image.credit, 'Photographer');
  assert.deepEqual(updatePayload.content.artists[1].image, savedImage);
  conflict = true;
  assert.equal((await route.POST(request(new Uint8Array([255, 216, 255, 0])))).status, 409);
  assert.equal(removed, true);
});

test('culture exploration links carry queries and valid provinces across both admin pages', () => {
  const links = load('src/utils/cultural-explore.ts');
  const heritageUrl = new URL(links.culturalExploreUrl('heritage', 'หมอลำ', 'TH-44'), 'https://local.test');
  assert.equal(heritageUrl.pathname, '/admin/cultural-heritage/');
  assert.deepEqual(links.culturalInitialFilters(Object.fromEntries(heritageUrl.searchParams), 'heritage'), { query: 'หมอลำ', province: 'มหาสารคาม' });
  const artistUrl = new URL(links.culturalExploreUrl('artists', 'หมอลำ', 'มหาสารคาม'), 'https://local.test');
  assert.deepEqual(links.culturalInitialFilters(Object.fromEntries(artistUrl.searchParams), 'artists'), { query: 'หมอลำ', province: 'TH-44' });
  assert.deepEqual(links.culturalInitialFilters({ q: ['ignored'], provinceCode: 'TH-99' }, 'artists'), { query: '', province: null });
  assert.deepEqual(links.culturalTopics('การแสดงหมอลำพื้นบ้าน'), ['หมอลำ']);
  assert.deepEqual(links.culturalTopics('พิธีกรรมชุมชน'), []);
});

test('artist creation enforces permission, validates evidence, prevents duplicates and detects conflicts', async () => {
  let authorized = false;
  let conflict = false;
  let saved;
  const route = load('src/app/api/admin/cultural-artists/route.ts', {
    'src/server/admin-api-auth': { verifyAdminRequest: async (_request, permission) => {
      assert.equal(permission, 'cultural_artists');
      return authorized;
    } },
    'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client: {
      from: () => ({
        select() { return this; }, eq() { return this; },
        async single() { return { data: { content: structuredClone(snapshot), updated_at: 'old' }, error: null }; },
        update(payload) { saved = payload; return {
          eq() { return this; },
          async select() { return { data: conflict ? [] : [{ section_key: 'province-artists-v1' }], error: null }; },
        }; },
      }),
    } }) },
  });
  assert.equal((await route.POST({ json() { throw new Error('Must not read body'); } })).status, 401);
  authorized = true;
  const input = { name: 'ศิลปินทดสอบใหม่', aliases: [], types: ['local_artist'], fields: ['ดนตรี'], genres: [], sourceUrl: 'https://example.com/artist', provinceCode: '', relationship: 'origin', provinceSourceUrl: '' };
  const request = (body) => ({ json: async () => body });
  assert.equal((await route.POST(request({ ...input, name: ' ' }))).status, 400);
  assert.equal((await route.POST(request({ ...input, provinceCode: 'TH-40' }))).status, 400);
  assert.equal((await route.POST(request({ ...input, sourceUrl: 'javascript:alert(1)' }))).status, 400);
  assert.equal((await route.POST(request({ ...input, name: snapshot.artists[0].name }))).status, 409);
  const response = await route.POST(request(input));
  assert.equal(response.status, 201);
  const artist = (await response.json()).data;
  assert.equal(artist.provinceStatus, 'pending_verification');
  assert.equal(saved.content.artists.length, snapshot.artists.length + 1);
  assert.deepEqual(saved.content.artists[0], snapshot.artists[0]);
  const verified = await route.POST(request({ ...input, provinceCode: 'TH-40', provinceSourceUrl: 'https://example.com/province' }));
  assert.equal((await verified.json()).data.provinceAssociations[0].provinceName, 'ขอนแก่น');
  conflict = true;
  assert.equal((await route.POST(request(input))).status, 409);
});

test('artist creation with a photo validates bytes and credit and cleans uploads on conflict', async () => {
  let conflict = false;
  let uploadError = false;
  let uploads = 0;
  let removed = 0;
  let saved;
  const route = load('src/app/api/admin/cultural-artists/route.ts', {
    'src/server/admin-api-auth': { verifyAdminRequest: async () => true },
    'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client: {
      storage: { from: () => ({
        async upload() { uploads++; return { error: uploadError ? new Error('upload failed') : null }; },
        getPublicUrl() { return { data: { publicUrl: 'https://example.com/photo.jpg' } }; },
        async remove() { removed++; return { error: null }; },
      }) },
      from: () => ({
        select() { return this; }, eq() { return this; },
        async single() { return { data: { content: structuredClone(snapshot), updated_at: 'old' }, error: null }; },
        update(payload) { saved = payload; return {
          eq() { return this; },
          async select() { return { data: conflict ? [] : [{ section_key: 'province-artists-v1' }], error: null }; },
        }; },
      }),
    } }) },
  });
  const input = { name: 'ศิลปินพร้อมรูปทดสอบ', aliases: [], types: ['local_artist'], fields: ['ดนตรี'], genres: [], sourceUrl: 'https://example.com/artist', provinceCode: '', relationship: 'origin', provinceSourceUrl: '' };
  const request = (bytes, credit = 'Photographer') => ({
    headers: new Headers({ 'content-type': 'multipart/form-data; boundary=test' }),
    async formData() {
      const form = new FormData();
      form.set('data', JSON.stringify(input));
      form.set('credit', credit);
      form.set('file', new File([bytes], 'photo.jpg', { type: 'image/jpeg' }));
      return form;
    },
  });
  const jpeg = new Uint8Array([255, 216, 255, 0]);
  assert.equal((await route.POST(request('invalid'))).status, 400);
  assert.equal((await route.POST(request(jpeg, ''))).status, 400);
  assert.equal((await route.POST(request(new Uint8Array(2 * 1024 * 1024 + 1)))).status, 400);
  assert.equal(uploads, 0);
  const response = await route.POST(request(jpeg));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.image.credit, 'Photographer');
  assert.equal(saved.content.artists.at(-1).image.url, 'https://example.com/photo.jpg');
  conflict = true;
  assert.equal((await route.POST(request(jpeg))).status, 409);
  assert.equal(removed, 1);
  uploadError = true;
  saved = undefined;
  assert.equal((await route.POST(request(jpeg))).status, 500);
  assert.equal(saved, undefined);
});

test('editing an artist preserves other records, honours and additional evidence', async () => {
  const directory = structuredClone(snapshot);
  const artist = directory.artists.find((item) => item.provinceAssociations.length);
  artist.image = { url: 'https://example.com/photo.jpg', credit: 'Original' };
  let saved;
  const route = load('src/app/api/admin/cultural-artists/route.ts', {
    'src/server/admin-api-auth': { verifyAdminRequest: async () => true },
    'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client: {
      from: () => ({
        select() { return this; }, eq() { return this; },
        async single() { return { data: { content: structuredClone(directory), updated_at: 'old' }, error: null }; },
        update(payload) { saved = payload; return { eq() { return this; }, async select() { return { data: [{}], error: null }; } }; },
      }),
    } }) },
  });
  const province = artist.provinceAssociations[0];
  const input = { id: artist.id, name: artist.name, aliases: artist.aliases, types: artist.types, fields: artist.fields.length ? artist.fields : ['ดนตรี'], genres: artist.genres, sourceUrl: artist.sources[0].url, provinceCode: province.provinceCode, relationship: province.relationship, provinceSourceUrl: province.sourceUrl };
  const request = (body) => ({ json: async () => body });
  assert.equal((await route.PATCH(request(input))).status, 200);
  const updated = saved.content.artists.find((item) => item.id === artist.id);
  assert.deepEqual(updated.recognitions, artist.recognitions);
  assert.deepEqual(updated.awards, artist.awards);
  assert.deepEqual(updated.image, artist.image);
  assert.deepEqual(updated.provinceAssociations, artist.provinceAssociations);
  assert.deepEqual(updated.sources, artist.sources);
  assert.equal(saved.content.artists.length, directory.artists.length);
  assert.equal((await route.PATCH(request({ ...input, id: 'missing' }))).status, 404);
  assert.equal((await route.PATCH(request({ ...input, id: undefined }))).status, 400);
  assert.equal((await route.PATCH(request({ ...input, removeImage: true }))).status, 200);
  assert.equal(saved.content.artists.find((item) => item.id === artist.id).image, undefined);
});

test('artist form validates required fields, image credit, province evidence and birth dates', () => {
  const { culturalArtistFormSchema, artistBirthDateSchema } = load('src/lib/cultural-artist-form.ts');
  const input = { name: 'ศิลปิน', aliases: '', types: ['local_artist'], fields: 'ดนตรี', genres: '', birthDate: null, sourceUrl: 'https://example.com', provinceCode: '', relationship: 'origin', provinceSourceUrl: '', image: null, credit: '', imageSourceUrl: '' };
  assert.equal(culturalArtistFormSchema.safeParse(input).success, true);
  for (const value of ['2024-02-29', '']) assert.equal(artistBirthDateSchema.safeParse(value).success, true);
  for (const value of ['2023-02-29', '2100-01-01', 'not-a-date']) assert.equal(artistBirthDateSchema.safeParse(value).success, false);
  for (const change of [{ name: ' ' }, { types: [] }, { sourceUrl: 'invalid' }, { provinceCode: 'TH-40' }, { image: 'https://example.com/photo.jpg' }]) assert.equal(culturalArtistFormSchema.safeParse({ ...input, ...change }).success, false);
});
