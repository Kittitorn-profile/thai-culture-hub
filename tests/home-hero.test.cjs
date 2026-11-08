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

const validImages = [
  { id: 'a', imageUrl: 'https://example.com/one.jpg', alt: 'ภาพหนึ่ง', isActive: true },
  { id: 'b', imageUrl: '/assets/two.jpg', alt: 'ภาพสอง', isActive: false },
];
test('hero settings validate multiple images, identities and safe URLs while preserving empty galleries', () => {
  const { homeHeroSchema, parseHeroImages, DEFAULT_HERO_IMAGES } = load('src/lib/home-hero.ts');
  assert.deepEqual(parseHeroImages(undefined), DEFAULT_HERO_IMAGES);
  assert.deepEqual(parseHeroImages({ images: [] }), []);
  assert.deepEqual(homeHeroSchema.parse({ images: validImages }).images, validImages);
  for (const imageUrl of [
    'javascript:alert(1)',
    'data:image/svg+xml;base64,x',
    '//example.com/a.jpg',
  ]) {
    assert.equal(
      homeHeroSchema.safeParse({ images: [{ ...validImages[0], imageUrl }] }).success,
      false
    );
  }
  assert.equal(
    homeHeroSchema.safeParse({ images: [validImages[0], validImages[0]] }).success,
    false
  );
  assert.equal(
    homeHeroSchema.safeParse({
      images: Array.from({ length: 21 }, (_, i) => ({ ...validImages[0], id: String(i) })),
    }).success,
    false
  );
});

test('hero write API checks home-content permission before accessing body or database', async () => {
  const route = load('src/app/api/admin/home-content/route.ts', {
    'src/server/admin-api-auth': {
      verifyAdminRequest: async (_request, permission) => {
        assert.equal(permission, 'home_content');
        return false;
      },
    },
    'src/server/supabase-admin': {
      getSupabaseAdmin() {
        throw Error('Unauthorized database access');
      },
    },
  });
  assert.equal(
    (
      await route.PUT({
        json() {
          throw Error('Unauthorized body access');
        },
      })
    ).status,
    401
  );
});

test('hero API saves all images in order and persists deletion without creating a new table', async () => {
  const saved = [];
  const route = load('src/app/api/admin/home-content/route.ts', {
    'src/server/admin-api-auth': { verifyAdminRequest: async () => true },
    'src/server/supabase-admin': {
      getSupabaseAdmin: () => ({
        ok: true,
        client: {
          from(table) {
            assert.equal(table, 'home_content_sections');
            return {
              upsert(row) {
                saved.push(row);
                return this;
              },
              select() {
                return this;
              },
              single: async () => ({ data: saved.at(-1), error: null }),
            };
          },
        },
      }),
    },
  });
  const request = (content) => ({ json: async () => ({ sectionKey: 'hero-images', content }) });
  assert.equal((await route.PUT(request({ images: [...validImages].reverse() }))).status, 200);
  assert.deepEqual(
    saved[0].content.images.map((image) => image.id),
    ['b', 'a']
  );
  assert.equal((await route.PUT(request({ images: [validImages[0]] }))).status, 200);
  assert.equal(saved[1].content.images.length, 1);
  assert.equal((await route.PUT(request({ images: [] }))).status, 200);
  assert.deepEqual(saved[2].content.images, []);
  const writes = saved.length;
  assert.equal(
    (await route.PUT(request({ images: [{ ...validImages[0], alt: '' }] }))).status,
    400
  );
  assert.equal(saved.length, writes);
});

test('public home content returns only published hero images in saved order', async () => {
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
              neq() {
                return this;
              },
              then(resolve, reject) {
                return Promise.resolve({
                  data: [
                    {
                      section_key: 'hero-images',
                      content: { images: [validImages[1], validImages[0]] },
                    },
                  ],
                  error: null,
                }).then(resolve, reject);
              },
            };
          },
        },
      }),
    },
  });
  const body = await (await route.GET()).json();
  assert.deepEqual(
    body.data['hero-images'].images.map((image) => image.id),
    ['a']
  );
});

test('hero upload checks permission and rejects unsupported files before touching storage', async () => {
  let authorized = false;
  const route = load('src/app/api/admin/home-content/hero-upload/route.ts', {
    'src/server/admin-api-auth': { verifyAdminRequest: async () => authorized },
    'src/server/supabase-admin': {
      getSupabaseAdmin() {
        throw Error('Should not access storage');
      },
    },
  });
  assert.equal(
    (
      await route.POST({
        formData() {
          throw Error('Should not read form');
        },
      })
    ).status,
    401
  );
  authorized = true;
  for (const file of [
    new File(['svg'], 'x.svg', { type: 'image/svg+xml' }),
    new File([new Uint8Array(1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' }),
  ]) {
    assert.equal(
      (await route.POST({ formData: async () => new Map([['file', file]]) })).status,
      400
    );
  }
});

test('hero upload writes an image to the existing public asset bucket with a generated path', async () => {
  let uploaded;
  const route = load('src/app/api/admin/home-content/hero-upload/route.ts', {
    'src/server/admin-api-auth': { verifyAdminRequest: async () => true },
    'src/server/supabase-admin': {
      getSupabaseAdmin: () => ({
        ok: true,
        client: {
          storage: {
            from() {
              return {
                upload: async (path, bytes, options) => {
                  uploaded = { path, bytes, options };
                  return { error: null };
                },
                getPublicUrl: (path) => ({ data: { publicUrl: `https://example.com/${path}` } }),
              };
            },
          },
        },
      }),
    },
  });
  const response = await route.POST({
    formData: async () =>
      new Map([['file', new File(['image bytes'], '../unsafe.png', { type: 'image/png' })]]),
  });
  assert.equal(response.status, 200);
  assert.match(uploaded.path, /^home-hero\/[a-f0-9-]+\.png$/);
  assert.equal(uploaded.options.upsert, false);
  assert.equal(uploaded.bytes.toString(), 'image bytes');
});

test('per-image CRUD preserves unrelated images and applies order changes by record identity', () => {
  const { applyHomeHeroOperation } = load('src/lib/home-hero-crud');
  const original = validImages.map((image) => ({ ...image }));
  const added = {
    id: 'c',
    imageUrl: 'https://example.com/three.jpg',
    alt: 'ภาพสาม',
    isActive: false,
  };
  const created = applyHomeHeroOperation(original, { action: 'create', image: added });
  assert.deepEqual(created, [...original, added]);
  assert.deepEqual(original, validImages);
  const updated = applyHomeHeroOperation(created, {
    action: 'update',
    id: 'b',
    expected: original[1],
    patch: { alt: 'แก้ภาพสอง' },
  });
  assert.equal(updated[1].alt, 'แก้ภาพสอง');
  assert.deepEqual(updated[0], original[0]);
  assert.deepEqual(updated[2], added);
  const moved = applyHomeHeroOperation(updated, { action: 'move', id: 'c', direction: -1 });
  assert.deepEqual(
    moved.map((image) => image.id),
    ['a', 'c', 'b']
  );
  const removed = applyHomeHeroOperation(moved, { action: 'delete', id: 'c', expected: added });
  assert.deepEqual(
    removed.map((image) => image.id),
    ['a', 'b']
  );
  assert.equal(removed[1].alt, 'แก้ภาพสอง');
});
test('per-image validation rejects stale edits, missing targets, duplicate records and invalid patches', () => {
  const { applyHomeHeroOperation, homeHeroOperationSchema } = load('src/lib/home-hero-crud');
  assert.throws(
    () =>
      applyHomeHeroOperation(validImages, {
        action: 'update',
        id: 'a',
        expected: { ...validImages[0], alt: 'stale' },
        patch: { alt: 'new' },
      }),
    (e) => e.status === 409
  );
  assert.throws(
    () =>
      applyHomeHeroOperation(validImages, {
        action: 'delete',
        id: 'a',
        expected: { ...validImages[0], isActive: false },
      }),
    (e) => e.status === 409
  );
  assert.throws(
    () =>
      applyHomeHeroOperation(validImages, {
        action: 'delete',
        id: 'missing',
        expected: validImages[0],
      }),
    (e) => e.status === 404
  );
  assert.throws(
    () => applyHomeHeroOperation(validImages, { action: 'create', image: validImages[0] }),
    (e) => e.status === 409
  );
  assert.equal(
    homeHeroOperationSchema.safeParse({
      action: 'update',
      id: 'a',
      expected: validImages[0],
      patch: {},
    }).success,
    false
  );
  assert.equal(
    homeHeroOperationSchema.safeParse({
      action: 'update',
      id: 'a',
      expected: validImages[0],
      patch: { imageUrl: 'javascript:alert(1)' },
    }).success,
    false
  );
  // Updating a different field can merge with another administrator's description edit.
  const changed = [{ ...validImages[0], alt: 'another admin' }, validImages[1]];
  const result = applyHomeHeroOperation(changed, {
    action: 'update',
    id: 'a',
    expected: validImages[0],
    patch: { isActive: false },
  });
  assert.equal(result[0].alt, 'another admin');
  assert.equal(result[0].isActive, false);
});
function mockHeroStore(initial, interrupt) {
  let row = initial ? structuredClone(initial) : null;
  let interrupted = false;
  let writes = 0;
  const db = {
    from: () => {
      let mode = 'read',
        payload,
        expected;
      const builder = {
        select: () => builder,
        eq: (key, value) => {
          if (key === 'updated_at') expected = value;
          return builder;
        },
        abortSignal: () => builder,
        update: (value) => {
          mode = 'update';
          payload = value;
          return builder;
        },
        insert: async (value) => {
          if (row) return { error: { code: '23505' } };
          row = structuredClone(value);
          return { error: null };
        },
        maybeSingle: async () => {
          if (mode === 'read') return { data: structuredClone(row), error: null };
          if (interrupt && !interrupted) {
            interrupted = true;
            row = interrupt(row);
          }
          if (row.updated_at !== expected) return { data: null, error: null };
          assert.ok(Date.parse(payload.updated_at) > Date.parse(row.updated_at));
          row = { ...row, ...structuredClone(payload) };
          writes++;
          return { data: { section_key: row.section_key }, error: null };
        },
      };
      return builder;
    },
  };
  return { db, row: () => row, writes: () => writes };
}
test('concurrent edits to another record are preserved when the saved section revision changes', async () => {
  const store = mockHeroStore(
    {
      section_key: 'hero-images',
      content: { images: validImages },
      updated_at: '2026-11-09T00:00:00.123456+00:00',
    },
    (row) => ({
      ...row,
      updated_at: '2026-11-09T00:00:01.000000+00:00',
      content: {
        images: [
          row.content.images[0],
          { ...row.content.images[1], alt: 'another admin changed B' },
        ],
      },
    })
  );
  const { mutateHomeHeroRecord } = load('src/server/home-hero-crud');
  const result = await mutateHomeHeroRecord(store.db, {
    action: 'update',
    id: 'a',
    expected: validImages[0],
    patch: { alt: 'changed A' },
  });
  assert.equal(result[0].alt, 'changed A');
  assert.equal(result[1].alt, 'another admin changed B');
  assert.equal(store.writes(), 1);
  assert.deepEqual(store.row().content.images, result);
});
test('concurrent changes to the same field are rejected without overwriting saved data', async () => {
  const store = mockHeroStore(
    {
      section_key: 'hero-images',
      content: { images: validImages },
      updated_at: '2026-11-09T00:00:00Z',
    },
    (row) => ({
      ...row,
      updated_at: '2026-11-09T00:00:01Z',
      content: {
        images: [{ ...row.content.images[0], alt: 'new saved title' }, row.content.images[1]],
      },
    })
  );
  const { mutateHomeHeroRecord } = load('src/server/home-hero-crud');
  await assert.rejects(
    mutateHomeHeroRecord(store.db, {
      action: 'update',
      id: 'a',
      expected: validImages[0],
      patch: { alt: 'stale draft' },
    }),
    (e) => e.status === 409
  );
  assert.equal(store.writes(), 0);
  assert.equal(store.row().content.images[0].alt, 'new saved title');
});
test('creating the first image starts with an empty collection and does not insert a default banner', async () => {
  const store = mockHeroStore(null);
  const { mutateHomeHeroRecord } = load('src/server/home-hero-crud');
  const result = await mutateHomeHeroRecord(store.db, { action: 'create', image: validImages[1] });
  assert.deepEqual(result, [validImages[1]]);
  assert.deepEqual(store.row().content, { images: [validImages[1]] });
});
test('per-record endpoints authenticate before accessing request data or storage', async () => {
  const route = load('src/app/api/admin/home-content/hero/route', {
    'src/server/admin-api-auth': {
      verifyAdminRequest: async (_request, permission) => {
        assert.equal(permission, 'home_content');
        return false;
      },
    },
    'src/server/supabase-admin': {
      getSupabaseAdmin: () => {
        throw Error('must not access database');
      },
    },
  });
  const request = {
    json: () => {
      throw Error('must not read body');
    },
  };
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE'])
    assert.equal((await route[method](request)).status, 401);
});
