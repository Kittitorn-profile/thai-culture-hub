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
  if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
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

test('submissions validate identifiers, links, reasons and database timestamp precision', () => {
  const { craftSubmissionSchema } = load('src/lib/craft-corrections');
  const body = {
    recordId: 'community:test-record',
    values: {
      description: 'เพิ่มรายละเอียด',
      practice: '',
      technique: '',
      lifestyle: '',
      referenceUrl: 'https://example.com/evidence',
    },
    reason: 'แหล่งข้อมูลเพิ่มเติม',
    revision: '2026-11-09T01:02:03.123456+00:00',
  };
  assert.equal(craftSubmissionSchema.safeParse(body).success, true);
  for (const patch of [
    { recordId: 'places:1' },
    { reason: ' ' },
    { values: { ...body.values, referenceUrl: 'javascript:alert(1)' } },
    { values: { ...body.values, referenceUrl: 'https://' } },
  ])
    assert.equal(craftSubmissionSchema.safeParse({ ...body, ...patch }).success, false);
});
test('approved overrides replace fabric detail aliases and preserve original citations', () => {
  const { applyCraftOverride } = load('src/server/craft-overrides');
  const item = {
    id: '1',
    title: 'ผ้า',
    description: 'เดิม',
    sourceUrl: 'https://original.test',
    details: [
      { label: 'เทคนิค', value: 'เดิม' },
      { label: 'พื้นที่/ชุมชน', value: 'เดิม' },
    ],
  };
  assert.equal(applyCraftOverride(item), item);
  const result = applyCraftOverride(item, {
    payload: {
      description: 'ใหม่',
      technique: 'ทอมือ',
      practice: '',
      referenceUrl: 'https://evidence.test',
    },
  });
  assert.equal(result.description, 'ใหม่');
  assert.deepEqual(result.details, [{ label: 'เทคนิคและภูมิปัญญา', value: 'ทอมือ' }]);
  assert.deepEqual(result.sourceUrls, ['https://original.test', 'https://evidence.test']);
  assert.equal(item.description, 'เดิม');
});
test('creator APIs reject unauthenticated access before reading a body or database', async () => {
  const route = load('src/app/api/creator/craft-corrections/route', {
    'src/server/creator-auth': {
      getBearerToken: () => '',
      verifyCreatorAccessToken: async () => ({ ok: false, status: 401, message: 'login' }),
    },
    'src/server/craft-corrections': {
      getEditableCraft: () => {
        throw Error('must not read');
      },
    },
  });
  const request = {
    headers: new Headers(),
    json: () => {
      throw Error('must not parse');
    },
  };
  assert.equal((await route.GET(request)).status, 401);
  assert.equal((await route.POST(request)).status, 401);
});
test('admin review rejects unauthenticated access before reading request data', async () => {
  const route = load('src/app/api/admin/craft-corrections/route', {
    'src/server/admin-api-auth': {
      verifyAdminAccessToken: async (token, permission) => {
        assert.equal(permission, undefined);
        return { ok: false, status: 403, message: 'forbidden' };
      },
    },
    'src/server/creator-auth': { getBearerToken: () => '' },
    'src/server/craft-corrections': {},
    'src/server/supabase-admin': {
      getSupabaseAdmin: () => {
        throw Error('must not access');
      },
    },
  });
  const request = {
    headers: new Headers(),
    json: () => {
      throw Error('must not parse');
    },
  };
  assert.equal((await route.GET(request)).status, 403);
  assert.equal((await route.PATCH(request)).status, 403);
});
test('member proposals store only changed fields with server-owned identity and pending status', async () => {
  const values = {
    description: 'เดิม',
    practice: '',
    technique: '',
    lifestyle: '',
    referenceUrl: '',
  };
  let inserted;
  const db = {
    from: (table) => {
      assert.equal(table, 'craft_correction_requests');
      return {
        insert: (row) => {
          inserted = row;
          return {
            select: () => ({ single: async () => ({ data: { id: 'saved' }, error: null }) }),
          };
        },
      };
    },
  };
  const route = load('src/app/api/creator/craft-corrections/route', {
    'src/server/creator-auth': {
      getBearerToken: () => 'token',
      verifyCreatorAccessToken: async () => ({
        ok: true,
        user: { id: 'verified-user' },
        supabase: db,
      }),
      getCreatorProfileByUserId: async () => ({
        ok: true,
        profile: { status: 'approved', display_name: 'Verified' },
      }),
    },
    'src/server/craft-corrections': {
      getEditableCraft: async () => ({ title: 'Server title', values, revision: null }),
      CRAFT_REQUEST_SELECT: 'id',
    },
  });
  const response = await route.POST({
    headers: new Headers(),
    json: async () => ({
      recordId: 'community:test',
      values: { ...values, description: 'ใหม่' },
      reason: 'หลักฐาน',
      revision: null,
      status: 'approved',
      requester_user_id: 'attacker',
    }),
  });
  assert.equal(response.status, 201);
  assert.equal(inserted.requester_user_id, 'verified-user');
  assert.equal(inserted.record_title, 'Server title');
  assert.equal(inserted.status, undefined);
  assert.deepEqual(inserted.suggested_payload, { description: 'ใหม่' });
  assert.deepEqual(inserted.original_snapshot, values);
});
test('stale proposals cannot be submitted against an older public revision', async () => {
  const values = {
    description: 'เดิม',
    practice: '',
    technique: '',
    lifestyle: '',
    referenceUrl: '',
  };
  const route = load('src/app/api/creator/craft-corrections/route', {
    'src/server/creator-auth': {
      getBearerToken: () => 'token',
      verifyCreatorAccessToken: async () => ({
        ok: true,
        user: { id: 'verified-user' },
        supabase: {
          from: () => {
            throw Error('must not insert');
          },
        },
      }),
      getCreatorProfileByUserId: async () => ({ ok: true, profile: { status: 'approved' } }),
    },
    'src/server/craft-corrections': {
      getEditableCraft: async () => ({
        title: 'Title',
        values,
        revision: '2026-11-09T00:00:00.123456+00:00',
      }),
    },
  });
  const response = await route.POST({
    headers: new Headers(),
    json: async () => ({ recordId: 'community:test', values, reason: 'ข้อมูล', revision: null }),
  });
  assert.equal(response.status, 409);
});

test('image proposals enforce safe URLs and a maximum gallery size', () => {
  const { craftEditSchema, MAX_CRAFT_IMAGES } = load('src/lib/craft-corrections');
  const base = { description: '', practice: '', technique: '', lifestyle: '', referenceUrl: '' };
  const image = { url: 'https://example.com/image.png', caption: 'ลายผ้า', credit: 'ชุมชน' };
  assert.equal(craftEditSchema.safeParse({ ...base, images: [image] }).success, true);
  assert.equal(craftEditSchema.safeParse({ ...base, images: [] }).success, true);
  for (const url of ['javascript:alert(1)', 'data:image/png;base64,x', 'https://'])
    assert.equal(
      craftEditSchema.safeParse({ ...base, images: [{ ...image, url }] }).success,
      false
    );
  assert.equal(
    craftEditSchema.safeParse({ ...base, images: Array(MAX_CRAFT_IMAGES + 1).fill(image) }).success,
    false
  );
});
test('approved image overrides set the cover, gallery and credit and allow removal', () => {
  const { applyCraftOverride } = load('src/server/craft-overrides');
  const item = {
    id: 'test',
    title: 'ผ้า',
    description: 'เดิม',
    sourceUrl: '',
    details: [],
    imageUrl: 'https://old.test/image.png',
  };
  const images = [
    { url: 'https://new.test/one.png', caption: 'ลายขิด', credit: 'ช่างทอ' },
    { url: 'https://new.test/two.png', caption: 'กี่ทอผ้า', credit: 'ช่างทอ' },
  ];
  assert.equal(applyCraftOverride(item).imageUrl, item.imageUrl);
  const result = applyCraftOverride(item, { payload: { images } });
  assert.equal(result.imageUrl, images[0].url);
  assert.equal(result.imageCredit, 'ช่างทอ');
  assert.deepEqual(result.images, images);
  const removed = applyCraftOverride(result, { payload: { images: [] } });
  assert.equal(removed.imageUrl, undefined);
  assert.deepEqual(removed.images, []);
});
test('upload authenticates and checks member approval before parsing files', async () => {
  for (const approved of [false, true]) {
    const route = load('src/app/api/creator/craft-corrections/upload/route', {
      'src/server/creator-auth': {
        getBearerToken: () => '',
        verifyCreatorAccessToken: async () =>
          approved
            ? { ok: true, user: { id: 'member' } }
            : { ok: false, status: 401, message: 'login' },
        getCreatorProfileByUserId: async () => ({ ok: true, profile: { status: 'pending' } }),
      },
      'src/server/craft-corrections': {
        getEditableCraft: () => {
          throw Error('must not read');
        },
      },
    });
    const response = await route.POST({
      headers: new Headers(),
      formData: () => {
        throw Error('must not parse');
      },
    });
    assert.equal(response.status, approved ? 403 : 401);
  }
});
test('upload rejects spoofed image MIME types without writing storage', async () => {
  const route = load('src/app/api/creator/craft-corrections/upload/route', {
    'src/server/creator-auth': {
      getBearerToken: () => '',
      verifyCreatorAccessToken: async () => ({
        ok: true,
        user: { id: 'member' },
        supabase: {
          storage: {
            from: () => {
              throw Error('must not upload');
            },
          },
        },
      }),
      getCreatorProfileByUserId: async () => ({ ok: true, profile: { status: 'approved' } }),
    },
    'src/server/craft-corrections': {
      getEditableCraft: () => {
        throw Error('must not read');
      },
    },
  });
  const form = new FormData();
  form.append('recordId', 'community:community-praewa');
  form.append(
    'file',
    new File(['<svg onload="alert(1)"></svg>'], 'fake.png', { type: 'image/png' })
  );
  assert.equal(
    (await route.POST({ headers: new Headers(), formData: async () => form })).status,
    400
  );
});
test('upload stores verified images under the authenticated member and record without publishing an override', async () => {
  let uploaded = false;
  const storage = {
    upload: async (path, bytes, options) => {
      assert.match(
        path,
        /^craft-corrections\/verified-member\/community\/community-praewa\/.+\.png$/
      );
      assert.equal(options.contentType, 'image/png');
      assert.ok(bytes.length);
      uploaded = true;
      return { error: null };
    },
    getPublicUrl: (path) => ({ data: { publicUrl: 'https://storage.test/' + path } }),
  };
  const route = load('src/app/api/creator/craft-corrections/upload/route', {
    'src/server/creator-auth': {
      getBearerToken: () => '',
      verifyCreatorAccessToken: async () => ({
        ok: true,
        user: { id: 'verified-member' },
        supabase: {
          storage: { from: () => storage },
          from: () => {
            throw Error('must not publish');
          },
        },
      }),
      getCreatorProfileByUserId: async () => ({ ok: true, profile: { status: 'approved' } }),
    },
    'src/server/craft-corrections': { getEditableCraft: async () => ({ title: 'ผ้าแพรวา' }) },
  });
  const form = new FormData();
  form.append('recordId', 'community:community-praewa');
  form.append(
    'file',
    new File(
      [
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9X8AAAAASUVORK5CYII=',
          'base64'
        ),
      ],
      'photo.png',
      { type: 'image/png' }
    )
  );
  const response = await route.POST({ headers: new Headers(), formData: async () => form });
  assert.equal(response.status, 201);
  assert.equal(uploaded, true);
  assert.match((await response.json()).data.url, /storage.test/);
});
test('image-only proposals are accepted while unchanged galleries do not create a request', async () => {
  const original = {
    description: 'เดิม',
    practice: '',
    technique: '',
    lifestyle: '',
    referenceUrl: '',
    images: [],
  };
  let inserted;
  const db = {
    from: () => ({
      insert: (row) => {
        inserted = row;
        return { select: () => ({ single: async () => ({ data: { id: 'saved' }, error: null }) }) };
      },
    }),
  };
  const route = load('src/app/api/creator/craft-corrections/route', {
    'src/server/creator-auth': {
      getBearerToken: () => '',
      verifyCreatorAccessToken: async () => ({ ok: true, user: { id: 'member' }, supabase: db }),
      getCreatorProfileByUserId: async () => ({
        ok: true,
        profile: { status: 'approved', display_name: 'Member' },
      }),
    },
    'src/server/craft-corrections': {
      getEditableCraft: async () => ({ title: 'ผ้าแพรวา', values: original, revision: null }),
      CRAFT_REQUEST_SELECT: 'id',
    },
  });
  const submit = async (values) =>
    route.POST({
      headers: new Headers(),
      json: async () => ({
        recordId: 'community:community-praewa',
        values,
        reason: 'เพิ่มภาพลายผ้า',
        revision: null,
      }),
    });
  assert.equal((await submit({ ...original, images: [] })).status, 400);
  assert.equal(inserted, undefined);
  const images = [
    { url: 'https://storage.test/image.png', caption: 'ลายผ้าแพรวา', credit: 'ผู้ถ่าย' },
  ];
  assert.equal((await submit({ ...original, images })).status, 201);
  assert.deepEqual(inserted.suggested_payload, { images });
  assert.equal(inserted.status, undefined);
});
test('all six public groups map to safe contribution identities and contextual fields', () => {
  const { craftRecordIdSchema } = load('src/lib/craft-corrections');
  const { getContributionGroup, getCorrectionFieldLabels, mergeContributionCorrections } = load(
    'src/lib/contribution-corrections'
  );
  for (const prefix of ['community', 'fabric', 'artists', 'heritage', 'ethnic', 'products'])
    assert.equal(craftRecordIdSchema.safeParse(prefix + ':sample-1').success, true);
  assert.equal(craftRecordIdSchema.safeParse('places:1').success, false); // Places retain their existing correction flow.
  assert.equal(getContributionGroup('community:one'), 'crafts');
  assert.equal(getContributionGroup('fabric:one'), 'crafts');
  assert.equal(getCorrectionFieldLabels('artists:one').technique, 'ผลงาน / ทักษะ / สาขา');
  const records = ['artists', 'heritage', 'ethnic', 'products', 'community'].map((kind, index) => ({
    id: String(index),
    record_id: kind + ':one',
    record_title: kind,
    reason: 'ข้อมูล',
    original_snapshot: {},
    suggested_payload: {},
    status: 'pending',
    created_at: `2026-11-0${index + 1}T00:00:00Z`,
    review_note: '',
  }));
  const merged = mergeContributionCorrections(
    [
      {
        id: 'place',
        placeId: 'one',
        placeName: 'สถานที่',
        createdAt: '2026-11-09T00:00:00Z',
        status: 'approved',
      },
    ],
    records
  );
  assert.equal(merged.length, 6);
  assert.equal(new Set(merged.map((item) => item.kind)).size, 6);
  assert.equal(merged[0].kind, 'places');
});
test('member contribution list is scoped to the verified user across all record types', async () => {
  let selectedOwner;
  const rows = [{ record_id: 'artists:test', status: 'pending' }];
  const query = {
    select: () => query,
    eq: (key, value) => {
      assert.equal(key, 'requester_user_id');
      selectedOwner = value;
      return query;
    },
    order: async () => ({ data: rows, error: null }),
  };
  const route = load('src/app/api/creator/craft-corrections/route', {
    'src/server/creator-auth': {
      getBearerToken: () => '',
      verifyCreatorAccessToken: async () => ({
        ok: true,
        user: { id: 'verified-owner' },
        supabase: { from: () => query },
      }),
    },
    'src/server/craft-corrections': {
      CRAFT_REQUEST_SELECT: 'id',
      getEditableCraft: () => {
        throw Error('no item lookup for list');
      },
    },
  });
  const response = await route.GET({
    headers: new Headers(),
    nextUrl: new URL('https://local.test/api/creator/craft-corrections/'),
  });
  assert.equal(response.status, 200);
  assert.equal(selectedOwner, 'verified-owner');
  assert.deepEqual((await response.json()).requests, rows);
});
test('legacy craft reviewer cannot approve another contribution category', async () => {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: { record_id: 'artists:one' }, error: null }),
  };
  const route = load('src/app/api/admin/craft-corrections/route', {
    'src/server/admin-api-auth': {
      verifyAdminAccessToken: async () => ({
        ok: true,
        user: { id: 'reviewer', role: 'reviewer', permissions: ['cultural_heritage'] },
      }),
    },
    'src/server/creator-auth': { getBearerToken: () => '' },
    'src/server/craft-corrections': {},
    'src/server/supabase-admin': {
      getSupabaseAdmin: () => ({
        ok: true,
        client: {
          from: () => query,
          rpc: () => {
            throw Error('must not approve');
          },
        },
      }),
    },
  });
  const response = await route.PATCH({
    headers: new Headers(),
    json: async () => ({
      id: '123e4567-e89b-42d3-a456-426614174000',
      decision: 'approved',
      note: '',
    }),
  });
  assert.equal(response.status, 403);
});
test('approved generic record overrides use the labels for their category', () => {
  const { applyCraftOverride } = load('src/server/craft-overrides');
  const record = { id: 'a', title: 'ศิลปิน', description: '', details: [], sourceUrl: '' };
  const result = applyCraftOverride(record, {
    record_id: 'artists:a',
    payload: { technique: 'งานจิตรกรรม', practice: 'เชียงใหม่' },
  });
  assert.ok(
    result.details.some(
      (row) => row.label === 'ผลงาน / ทักษะ / สาขา' && row.value === 'งานจิตรกรรม'
    )
  );
  assert.ok(result.details.some((row) => row.label === 'พื้นที่ทำงาน / ชุมชน'));
});
