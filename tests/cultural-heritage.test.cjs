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
  const data = await getCulturalHeritage({ collection: 'community', limit: 100 });
  assert.equal(data.total, 55);
  assert.equal(new Set(data.data.map((item) => item.province).filter(Boolean)).size, 39);
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
  assert.equal(secondPage.total, 55);
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
  assert.equal(mats.collectionTotal, 55);
  assert.equal(mats.collectionProvinces, 39);
  assert.ok(mats.categories.includes('ศูนย์ศิลปาชีพ'));
  const centers = await getCulturalHeritage({ collection: 'community', category: 'ศูนย์ศิลปาชีพ' });
  assert.equal(centers.total, 2);
  const otop = await getCulturalHeritage({ collection: 'community', category: 'OTOP ตามแหล่งอ้างอิง' });
  assert.equal(otop.total, 2);
  assert.ok(otop.data.every((item) => item.sourceUrl && item.organization));
  assert.equal((await getCulturalHeritage({ collection: 'community', category: 'จักสาน', province: 'ชลบุรี' })).total, 1);
  assert.equal(new Set((await getCulturalHeritage({ collection: 'community', limit: 100 })).data.map((item) => item.id)).size, 55);
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

test('reviewed weaving additions retain provenance, valid provinces and unique local identities', async () => {
  const weaving = require('../data/cultural-heritage/community-weaving.json');
  const provinces = load('src/data/thailand-culture/provinces.ts').default;
  const reviewedIds = ['community-khubua-weaving', 'community-phathang-weaving', 'community-wiangyong-weaving', 'community-chonnabot-mudmee', 'community-hatsiao-weaving', 'community-nakhon-raised-weaving', 'community-huachang-saeo', 'community-srichomchuen-khit', 'community-maikaen-weaving', 'community-thungmok-tailue'];
  const additions = weaving.filter(item => reviewedIds.includes(item.id));
  assert.equal(additions.length, 10);
  assert.equal(new Set(weaving.map(item => item.id)).size, weaving.length);
  assert.equal(new Set(weaving.map(item => `${item.province}:${item.name}`)).size, weaving.length);
  for (const item of additions) {
    assert.ok(provinces.some(province => province.name === item.province));
    assert.ok(item.categories.includes('การทอผ้า'));
    assert.ok(item.practice && item.description && item.technique && item.lifestyle && item.organization);
    assert.equal(new URL(item.sourceUrl).protocol, 'https:');
  }
  const { getCulturalHeritage } = load('src/server/cultural-heritage.ts');
  const filtered = await getCulturalHeritage({ collection: 'community', category: 'การทอผ้า', province: 'อุทัยธานี', query: 'ผาทั่ง' });
  assert.equal(filtered.total, 1);
  assert.equal(filtered.data[0].id, 'community-phathang-weaving');
  assert.equal(filtered.data[0].nationalYear, '');
});

test('MSU source search includes weaving and upcycling while retaining original research attribution', async () => {
  const { getCulturalHeritage } = load('src/server/cultural-heritage.ts');
  const sourced = await getCulturalHeritage({ collection: 'community', query: 'มหาวิทยาลัยมหาสารคาม', limit: 100 });
  assert.equal(sourced.total, 5);
  for (const item of sourced.data) {
    assert.ok(new URL(item.sourceUrl).hostname.endsWith('.msu.ac.th'));
    assert.equal(item.checkedAt, '2026-11-09');
  }
  const archive = sourced.data.find(item => item.id === 'community-msu-thasawang-research');
  assert.ok(archive.organization.includes('มหาวิทยาลัยราชภัฏสุรินทร์'));
  assert.equal(archive.province, 'สุรินทร์');
  const weaving = await getCulturalHeritage({ collection: 'community', query: 'มหาวิทยาลัยมหาสารคาม', category: 'การทอผ้า' });
  assert.equal(weaving.total, 4);
  const products = await getCulturalHeritage({ collection: 'community', query: 'มหาวิทยาลัยมหาสารคาม', category: 'ผลิตภัณฑ์ชุมชน' });
  assert.equal(products.total, 1);
  assert.equal(products.data[0].id, 'community-msu-kampu-silk-upcycling');
});

test('Sakon Nakhon indigo additions are searchable and preserve university attribution', async () => {
  const { getCulturalHeritage } = load('src/server/cultural-heritage.ts');
  const result = await getCulturalHeritage({ collection: 'community', category: 'การทอผ้า', province: 'สกลนคร', query: 'คราม', limit: 100 });
  assert.equal(result.total, 4);
  assert.equal(new Set(result.data.map(item => item.id)).size, 4);
  assert.ok(result.data.some(item => item.id === 'community-khamkha'));
  for (const id of ['community-sakon-donkoi-indigo', 'community-sakon-nongkhrong-indigo', 'community-msu-sakon-indigo-identity']) {
    const item = result.data.find(record => record.id === id);
    assert.ok(item && item.sourceUrl && item.organization && item.technique);
  }
  const archive = result.data.find(item => item.id === 'community-msu-sakon-indigo-identity');
  assert.ok(archive.organization.includes('มหาวิทยาลัยราชภัฏสกลนคร'));
  assert.ok(archive.organization.includes('มหาวิทยาลัยราชภัฏอุดรธานี'));
});

test('red-footed silk is one documented record searchable by both Buriram districts', async () => {
  const { getCulturalHeritage } = load('src/server/cultural-heritage.ts');
  for (const query of ['ซิ่นตีนแดง', 'นาโพธิ์', 'พุทไธสง']) {
    const result = await getCulturalHeritage({ collection: 'community', category: 'การทอผ้า', province: 'บุรีรัมย์', query });
    assert.equal(result.total, 1);
    assert.equal(result.data[0].id, 'community-buriram-sin-tin-daeng');
    assert.equal(result.data[0].sourceUrl, 'https://qsds.go.th/silkcotton/k_16.php');
    assert.ok(result.data[0].practice.includes('อำเภอนาโพธิ์ และอำเภอพุทไธสง'));
  }
});

test('QSDS index covers all 28 topics through existing identities and ten new records', async () => {
  const catalog = require('../data/cultural-heritage/qsds-textiles.json');
  const community = require('../data/cultural-heritage/community-weaving.json');
  const { getCulturalHeritage } = load('src/server/cultural-heritage.ts');
  assert.equal(catalog.items.length, 28);
  assert.equal(new Set(catalog.items.map(item => item.sourceUrl)).size, 28);
  assert.equal(community.filter(item => item.id.startsWith('community-qsds-')).length, 10);
  for (const source of catalog.items.filter(item => item.recordType === 'community')) {
    const record = community.find(item => item.id === source.recordId);
    assert.ok(record, source.recordId);
    const result = await getCulturalHeritage({ collection: 'community', query: record.name, limit: 100 });
    assert.ok(result.data.find(item => item.id === record.id).sourceUrls.includes(source.sourceUrl));
  }
  const regional = community.find(item => item.id === 'community-qsds-5');
  assert.equal(regional.province, '');
  assert.match(regional.practice, /ไม่ได้เจาะจงจังหวัด/);
});

test('khit and Kalasin details enrich existing community records', async () => {
  const { getCulturalHeritage } = load('src/server/cultural-heritage.ts');
  const khit = await getCulturalHeritage({ collection: 'community', query: 'ผ้าลายขิด', limit: 100 });
  assert.ok(khit.data.some(item => item.id === 'community-srichomchuen-khit' && item.technique.includes('เส้นพุ่งพิเศษ')));
  const kalasin = await getCulturalHeritage({ collection: 'community', province: 'กาฬสินธุ์', category: 'การทอผ้า' });
  assert.equal(kalasin.total, 1);
  assert.equal(kalasin.data[0].id, 'community-praewa');
  assert.ok(kalasin.data[0].technique.includes('เก็บลายขิด'));
  assert.ok(kalasin.data[0].sourceUrls.includes('https://qsds.go.th/silkcotton/k_19.php'));
});

test('national additions cover six regions with validated provinces and keep batik separate from weaving', async () => {
  const rows = require('../data/cultural-heritage/community-weaving.json');
  const additions = rows.filter(item => item.id.startsWith('community-national-'));
  const provinces = load('src/data/thailand-culture/provinces.ts').default;
  assert.equal(additions.length, 12);
  assert.equal(new Set(additions.map(item => item.region)).size, 6);
  for (const item of additions) {
    assert.ok(provinces.some(province => province.name === item.province));
    assert.ok(item.description && item.practice && item.technique && item.lifestyle && item.organization);
    assert.equal(new URL(item.sourceUrl).protocol, 'https:');
  }
  const { getCulturalHeritage } = load('src/server/cultural-heritage.ts');
  const bangkok = await getCulturalHeritage({ collection: 'community', province: 'กรุงเทพมหานคร', query: 'บ้านครัว' });
  assert.equal(bangkok.total, 1);
  const batik = await getCulturalHeritage({ collection: 'community', category: 'ผ้าเขียนลายและมัดย้อม' });
  assert.equal(batik.total, 4);
  assert.ok(batik.data.every(item => !item.categories.includes('การทอผ้า')));
  const weaving = await getCulturalHeritage({ collection: 'community', category: 'การทอผ้า', query: 'บาติก' });
  assert.equal(weaving.total, 0);
});

test('national coverage audit retains source evidence for each of the 77 provinces', () => {
  const audit = require('../docs/data-audits/textile-national-coverage.json');
  const rows = require('../data/cultural-heritage/community-weaving.json');
  assert.equal(audit.provinces.length, 77);
  assert.equal(new Set(audit.provinces.map(item => item.code)).size, 77);
  assert.equal(audit.communityRecordCount, rows.length);
  for (const province of audit.provinces) {
    assert.ok(province.communityRecords.length || province.registryRecords.length);
    for (const record of province.communityRecords) {
      assert.ok(rows.some(item => item.id === record.id && item.province === province.province && item.sourceUrl === record.sourceUrl));
    }
  }
});

test('community edits merge before filtering and preserve group and record lookup', async () => {
  const record = { id: 'community-praewa', group: 'weaving', name: 'ชื่อแก้ไข', province: 'กาฬสินธุ์', region: 'ภาคตะวันออกเฉียงเหนือ', categories: ['การทอผ้า'], description: 'เรื่องราว', sourceUrl: 'https://example.com', practice: '', technique: '', lifestyle: '', organization: 'ชุมชน', checkedAt: '' };
  const service = load('src/server/cultural-heritage.ts', {
    'src/server/community-heritage-edits': { getCommunityHeritageEdits: async () => [record, { ...record, id: 'new-mat', group: 'mats', categories: ['ทอเสื่อ/สาด'] }] },
  });
  const result = await service.getCulturalHeritage({ collection: 'community', recordId: record.id, category: 'การทอผ้า' });
  assert.equal(result.total, 1);
  assert.equal(result.data[0].name, 'ชื่อแก้ไข');
  const mats = await service.getCulturalHeritage({ collection: 'community', recordId: 'new-mat', category: 'ทอเสื่อ/สาด' });
  assert.equal(mats.total, 1);
});

test('community create and edit validate group, check permission and detect concurrent changes', async () => {
  let allowed = false;
  let conflict = false;
  let row = null;
  const client = { from: () => ({
    select() { return this; }, eq() { return this; },
    async maybeSingle() { return { data: row, error: null }; },
    insert(payload) { return { async select() { row = payload; return { data: [{}], error: null }; } }; },
    update(payload) { return { eq() { return this; }, async select() { if (!conflict) row = payload; return { data: conflict ? [] : [{}], error: null }; } }; },
  }) };
  const api = load('src/app/api/admin/cultural-heritage/route.ts', {
    'src/server/admin-api-auth': { verifyAdminAccessToken: async () => allowed ? { ok: true } : { ok: false, status: 403, message: 'Forbidden' } },
    'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client }) },
  });
  const input = { group: 'weaving', name: 'รายการทดสอบ', province: 'เชียงใหม่', practice: 'ชุมชน', description: 'เรื่องราว', technique: '', lifestyle: '', organization: 'ชุมชน', sourceUrl: 'https://example.com' };
  const request = (data) => new Request('https://local.test/api/admin/cultural-heritage', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
  assert.equal((await api.POST(request(input))).status, 403);
  allowed = true;
  assert.equal((await api.POST(request({ ...input, group: 'other' }))).status, 400);
  assert.equal((await api.POST(request({ ...input, province: 'invalid' }))).status, 400);
  const response = await api.POST(request(input));
  assert.equal(response.status, 201);
  const record = (await response.json()).data;
  assert.equal(record.region, 'ภาคเหนือ');
  assert.deepEqual(record.categories, ['การทอผ้า', 'งานช่างฝีมือดั้งเดิม']);
  assert.equal((await api.PATCH(request({ ...input, id: record.id, name: 'แก้ไขแล้ว' }))).status, 200);
  assert.equal(row.content.items.length, 1);
  assert.equal(row.content.items[0].name, 'แก้ไขแล้ว');
  assert.equal((await api.PATCH(request({ ...input, id: record.id, group: 'mats' }))).status, 404);
  conflict = true;
  assert.equal((await api.PATCH(request({ ...input, id: record.id }))).status, 409);
});

test('community photos validate signature and credit, persist previews and clean up conflicts', async () => {
  let row = null;
  let conflict = false;
  let uploads = 0;
  let removed = 0;
  const client = {
    storage: { from: () => ({
      async upload() { uploads++; return { error: null }; },
      getPublicUrl() { return { data: { publicUrl: 'https://example.com/craft.jpg' } }; },
      async remove() { removed++; return { error: null }; },
    }) },
    from: () => ({
      select() { return this; }, eq() { return this; },
      async maybeSingle() { return { data: row, error: null }; },
      insert(payload) { return { async select() { row = payload; return { data: [{}], error: null }; } }; },
      update(payload) { return { eq() { return this; }, async select() { if (!conflict) row = payload; return { data: conflict ? [] : [{}], error: null }; } }; },
    }),
  };
  const api = load('src/app/api/admin/cultural-heritage/route.ts', {
    'src/server/admin-api-auth': { verifyAdminAccessToken: async () => ({ ok: true }) },
    'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client }) },
  });
  const input = { group: 'mats', name: 'เสื่อทดสอบภาพ', province: 'เชียงใหม่', practice: '', description: 'เรื่องราว', technique: '', lifestyle: '', organization: 'ชุมชน', sourceUrl: 'https://example.com', imageCredit: 'ช่างภาพ', imageSourceUrl: 'https://example.com/original' };
  const request = (data, bytes) => {
    const form = new FormData();
    form.set('data', JSON.stringify(data));
    if (bytes) form.set('file', new File([bytes], 'image.jpg', { type: 'image/jpeg' }));
    return new Request('https://local.test/api/admin/cultural-heritage', { method: 'POST', body: form });
  };
  const jpeg = new Uint8Array([255, 216, 255, 0]);
  assert.equal((await api.POST(request(input, 'invalid'))).status, 400);
  assert.equal((await api.POST(request({ ...input, imageCredit: '' }, jpeg))).status, 400);
  assert.equal((await api.POST(request({ ...input, imageSourceUrl: 'javascript:alert(1)' }, jpeg))).status, 400);
  assert.equal(uploads, 0);
  const created = await api.POST(request(input, jpeg));
  assert.equal(created.status, 201);
  const record = (await created.json()).data;
  assert.deepEqual(record.image, { url: 'https://example.com/craft.jpg', credit: 'ช่างภาพ', sourceUrl: 'https://example.com/original' });
  const { mapHeritageRecord } = load('src/server/cultural-heritage.ts');
  assert.deepEqual(mapHeritageRecord({ ...record, Name: record.name }).image, record.image);
  assert.equal((await api.PATCH(request({ ...input, id: record.id, imageSourceUrl: '' }))).status, 200);
  assert.equal(row.content.items[0].image.sourceUrl, undefined);
  conflict = true;
  assert.equal((await api.PATCH(request({ ...input, id: record.id }, jpeg))).status, 409);
  assert.equal(removed, 1);
  conflict = false;
  assert.equal((await api.PATCH(request({ ...input, id: record.id, removeImage: true }))).status, 200);
  assert.equal(row.content.items[0].image, undefined);
});

test('all seven community groups support create, update and delete with permission and conflict checks', async () => {
  const { COMMUNITY_GROUPS } = load('src/lib/cultural-data-groups.ts');
  let allowed = true;
  let conflict = false;
  let row = null;
  const api = load('src/app/api/admin/cultural-heritage/route.ts', {
    'src/server/admin-api-auth': { verifyAdminAccessToken: async () => allowed ? { ok: true } : { ok: false, status: 403, message: 'Forbidden' } },
    'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client: { from: () => ({
      select() { return this; }, eq() { return this; },
      async maybeSingle() { return { data: row, error: null }; },
      insert(payload) { return { async select() { if (!conflict) row = payload; return { data: conflict ? [] : [{}], error: null }; } }; },
      update(payload) { return { eq() { return this; }, async select() { if (!conflict) row = payload; return { data: conflict ? [] : [{}], error: null }; } }; },
    }) } }) },
  });
  const request = (data) => new Request('https://local.test/api/admin/cultural-heritage', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
  for (const group of COMMUNITY_GROUPS) {
    const input = { group: group.key, name: `ทดสอบ ${group.key}`, province: 'เชียงใหม่', practice: '', description: 'เรื่องราว', technique: '', lifestyle: '', organization: 'ชุมชน', sourceUrl: 'https://example.com' };
    const created = await api.POST(request(input));
    assert.equal(created.status, 201);
    const record = (await created.json()).data;
    assert.ok(record.categories.includes(group.category));
    assert.equal((await api.PATCH(request({ ...input, id: record.id, name: `แก้ไข ${group.key}` }))).status, 200);
    allowed = false;
    assert.equal((await api.DELETE(request({ id: record.id, group: group.key }))).status, 403);
    allowed = true;
    conflict = true;
    assert.equal((await api.DELETE(request({ id: record.id, group: group.key }))).status, 409);
    conflict = false;
    assert.equal((await api.DELETE(request({ id: record.id, group: group.key }))).status, 200);
    assert.equal((await api.PATCH(request({ ...input, id: record.id }))).status, 404);
  }
  assert.equal(row.content.items.filter((item) => item.deleted).length, 7);
  const service = load('src/server/cultural-heritage.ts', {
    'src/server/community-heritage-edits': { getCommunityHeritageEdits: async () => [...row.content.items, { id: 'community-praewa', deleted: true, group: 'weaving' }] },
  });
  for (const item of row.content.items) assert.equal((await service.getCulturalHeritage({ collection: 'community', recordId: item.id })).total, 0);
  assert.equal((await service.getCulturalHeritage({ collection: 'community', recordId: 'community-praewa' })).total, 0);
});
