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
