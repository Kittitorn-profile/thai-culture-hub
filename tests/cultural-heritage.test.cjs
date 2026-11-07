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

test('maps CKAN fields without inventing dates or coordinates', () => {
  const { mapHeritageRecord } = load('src/server/cultural-heritage.ts');
  const r = mapHeritageRecord({
    _id: 1,
    Name: 'งานฝีมือ',
    Craft: 2,
    TH_Year: '-',
    Latitude: '',
    Longitude: 181,
  });
  assert.equal(r.name, 'งานฝีมือ');
  assert.deepEqual(r.categories, ['งานช่างฝีมือดั้งเดิม']);
  assert.equal(r.nationalYear, '');
  assert.equal(r.latitude, null);
  assert.equal(r.longitude, null);
});
function route(permitted = true) {
  return load('src/app/api/admin/cultural-heritage/route.ts', {
    'src/server/admin-api-auth': {
      verifyAdminAccessToken: async (_token, permission) => {
        assert.equal(permission, 'cultural_heritage');
        return permitted ? { ok: true } : { ok: false, status: 403, message: 'Forbidden' };
      },
    },
    'src/server/cultural-heritage': {
      getCulturalHeritage: async (options) => ({ data: [], total: 0, ...options }),
    },
  });
}
test('new menu API requires its own permission', async () => {
  assert.equal(
    (await route(false).GET(new Request('https://local.test/api/admin/cultural-heritage'))).status,
    403
  );
});
test('rejects invalid paging parameters', async () => {
  for (const query of ['page=-1', 'page=1.5', 'limit=10000', 'limit=NaN'])
    assert.equal(
      (await route().GET(new Request('https://local.test/api/admin/cultural-heritage?' + query)))
        .status,
      400
    );
});
test('passes bounded searches and pagination to source', async () => {
  const r = await route().GET(
    new Request('https://local.test/api/admin/cultural-heritage?page=2&limit=50&q=craft')
  );
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.page, 2);
  assert.equal(body.limit, 50);
  assert.equal(body.query, 'craft');
});
test('CKAN failures are not displayed as an empty successful result', async () => {
  const original = global.fetch;
  global.fetch = async () =>
    new Response(JSON.stringify({ success: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  try {
    const { getCulturalHeritage } = load('src/server/cultural-heritage.ts');
    await assert.rejects(() => getCulturalHeritage({}), /CKAN/);
  } finally {
    global.fetch = original;
  }
});
