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

test('community weaving collection filters local evidence without fetching CKAN or inventing registration', async () => {
  const { getCulturalHeritage } = load('src/server/cultural-heritage.ts');
  const data = await getCulturalHeritage({ collection: 'community' });
  assert.equal(data.total, 15);
  assert.equal(new Set(data.data.map((item) => item.province)).size, 12);
  for (const item of data.data) {
    assert.ok(item.name && item.description && item.technique && item.lifestyle);
    assert.match(item.sourceUrl, /^https:\/\//);
    assert.equal(item.nationalYear, '');
    assert.equal(item.provincialYear, '');
    assert.equal(item.latitude, null);
    assert.equal(item.longitude, null);
  }
  const filtered = await getCulturalHeritage({ collection: 'community', query: 'ความเชื่อ', province: 'เชียงใหม่' });
  assert.equal(filtered.total, 1);
  assert.match(filtered.data[0].name, /แม่แจ่ม/);
  const secondPage = await getCulturalHeritage({ collection: 'community', page: 1, limit: 3 });
  assert.equal(secondPage.data.length, 3);
  assert.equal(secondPage.total, 15);
});

test('heritage API rejects unknown collection selectors', async () => {
  const res = await route().GET(new Request('https://local.test/api/admin/cultural-heritage?collection=unknown'));
  assert.equal(res.status, 400);
});

test('community craft category filters retain provenance and do not conflate OTOP with all crafts', async () => {
  const { getCulturalHeritage } = load('src/server/cultural-heritage.ts');
  const mats = await getCulturalHeritage({ collection: 'community', category: 'ทอเสื่อ/สาด' });
  assert.equal(mats.total, 2);
  assert.ok(mats.data.some((item) => item.name.includes('สาดไตหย่า') && item.province === 'เชียงราย'));
  assert.equal(mats.collectionTotal, 15);
  assert.equal(mats.collectionProvinces, 12);
  assert.ok(mats.categories.includes('ศูนย์ศิลปาชีพ'));
  const centers = await getCulturalHeritage({ collection: 'community', category: 'ศูนย์ศิลปาชีพ' });
  assert.equal(centers.total, 2);
  const otop = await getCulturalHeritage({ collection: 'community', category: 'OTOP ตามแหล่งอ้างอิง' });
  assert.equal(otop.total, 2);
  assert.ok(otop.data.every((item) => item.sourceUrl && item.organization));
  assert.equal((await getCulturalHeritage({ collection: 'community', category: 'จักสาน', province: 'ชลบุรี' })).total, 1);
  assert.equal(new Set((await getCulturalHeritage({ collection: 'community' })).data.map((item) => item.id)).size, 15);
});

test('heritage category totals read every source page including rows with multiple category flags', async () => {
  const original = global.fetch;
  const rows = Array.from({ length: 5 }, (_, i) => ({ _id: i + 1, Name: `Item ${i}`, Arts: i % 2 ? 2 : 0, Province: 'เชียงใหม่' }));
  global.fetch = async (url) => {
    const params = new URL(url).searchParams;
    const offset = Number(params.get('offset'));
    const size = Math.min(Number(params.get('limit')), 2);
    return new Response(JSON.stringify({ success: true, result: { total: rows.length, records: rows.slice(offset, offset + size) } }));
  };
  try {
    const service = load('src/server/cultural-heritage.ts');
    assert.equal((await service.getAllHeritageRecords()).length, 5);
    const filtered = await service.getCulturalHeritage({ category: 'ศิลปะการแสดง', limit: 1, page: 1 });
    assert.equal(filtered.total, 2);
    assert.equal(filtered.data.length, 1);
    assert.equal(filtered.data[0].id, '4');
    global.fetch = async () => new Response(JSON.stringify({ success: true, result: { total: 2, records: [rows[0], rows[0]] } }));
    await assert.rejects(() => service.getAllHeritageRecords(), /ครบชุด/);
  } finally { global.fetch = original; }
});
