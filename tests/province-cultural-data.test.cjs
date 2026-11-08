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


const artistSnapshot = require('../data/cultural-artists/registry.json');
function service() {
  const actual = load('src/server/cultural-artists.ts');
  return load('src/server/province-cultural-data.ts', {
    'src/server/cultural-artists': { ...actual, getCulturalArtistDirectory: async () => artistSnapshot },
    'src/server/cultural-heritage': { getCulturalHeritage: async ({ province, page, limit, collection }) => ({ total: 1, data: [{ id: 'heritage', name: 'ภูมิปัญญา', province, description: '', practice: province, note: '', sourceUrl: 'https://example.com', latitude: null, longitude: null, categories: [collection], technique: '', lifestyle: '', nationalYear: '', provincialYear: '', organization: '' }] }) },
    'src/server/ethnic-groups': { filterEthnicGroups: (rows, { province }) => rows.filter((row) => row.province === province), getEthnicGroupDirectory: async () => [
      { id: 'community', village: 'บ้านตัวอย่าง', title: 'ชุมชน', groups: ['ผู้ไท'], province: 'มหาสารคาม', subDistrict: '', district: '', description: 'รายละเอียด', sourceUrl: 'https://example.com', sourceName: 'แหล่งอ้างอิง', latitude: 16, longitude: 103 },
      { id: 'other-province', province: 'กาฬสินธุ์' },
    ] },
  });
}
test('province cultural data uses documented artist relationships and exact community province', async () => {
  const s = service();
  const artists = await s.getProvinceCulturalSection({}, 'TH-44', 'มหาสารคาม', 'artists');
  assert.equal(artists.total, 2);
  assert.ok(artists.data.every((artist) => artist.details.some((detail) => detail.label === 'ความเกี่ยวข้องกับจังหวัด')));
  const ethnic = await s.getProvinceCulturalSection({}, 'TH-44', 'มหาสารคาม', 'ethnic');
  assert.equal(ethnic.total, 1);
  assert.match(ethnic.data[0].mapUrl, /16,103/);
  const heritage = await s.getProvinceCulturalSection({}, 'TH-44', 'มหาสารคาม', 'heritage');
  assert.equal(heritage.data[0].mapUrl, undefined);
});
test('product projection excludes contact data and groups exclude unpublished and other-province records', async () => {
  const rows = [{ id: 'p', product_name: 'งานหัตถกรรม', province: 'มหาสารคาม', source_uri: 'https://example.com', contact_phone: 'private', contact_email: 'private' }];
  let selection = '';
  const db = { from() { return { select(fields) { selection = fields; return this; }, or() { return this; }, order() { return this; }, eq() { return this; }, range() { return Promise.resolve({ data: rows, count: 1, error: null }); }, async maybeSingle() { return { data: { content: { groups: [
    { id: 'public', name: 'วงจังหวัดนี้', provinceCode: 'TH-44', isPublished: true, contactPhone: 'private' },
    { id: 'hidden', name: 'วงฉบับร่าง', provinceCode: 'TH-44', isPublished: false },
    { id: 'other', name: 'วงต่างจังหวัด', provinceCode: 'TH-40', isPublished: true },
  ] } }, error: null }; } }; } };
  const s = service();
  const products = await s.getProvinceCulturalSection(db, 'TH-44', 'มหาสารคาม', 'cpot');
  assert.equal(products.total, 1);
  assert.equal(selection.includes('contact'), false);
  assert.equal(JSON.stringify(products).includes('private'), false);
  const groups = await s.getProvinceCulturalSection(db, 'TH-44', 'มหาสารคาม', 'groups');
  assert.equal(groups.total, 1);
  assert.equal(groups.data[0].id, 'public');
  assert.equal(JSON.stringify(groups).includes('private'), false);
});
test('public province data endpoint validates codes and isolates failed sources', async () => {
  const route = load('src/app/api/culture/province-data/route.ts', {
    'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client: {} }) },
    'src/server/province-cultural-data': { PROVINCE_DATA_SECTIONS: ['artists', 'heritage'], getProvinceCulturalSection: async (_db, code, name, key) => {
      assert.equal(code, 'TH-44'); assert.equal(name, 'มหาสารคาม');
      if (key === 'heritage') throw Error('Source failed');
      return { key, total: 1, data: [], page: 0, pageSize: 9 };
    } },
  });
  assert.equal((await route.GET({ nextUrl: new URL('https://local.test?provinceCode=TH-99') })).status, 400);
  const response = await route.GET({ nextUrl: new URL('https://local.test?provinceCode=TH-44&name=wrong') });
  const body = await response.json();
  assert.equal(body.sections[0].total, 1);
  assert.equal(body.sections[1].total, null);
  assert.ok(body.sections[1].error);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('province highlights match verified attraction names and prefer existing photos from the same place', () => {
  const { getProvinceHighlights } = load('src/sections/province/province-highlights.ts');
  const places = [
    { id: 'no-photo', name: 'พระธาตุนาดูน', imageUrls: [] },
    { id: 'with-photo', name: 'พระบรมธาตุนาดูน', imageUrls: ['https://example.com/nadun.jpg'] },
    { id: 'unrelated', name: 'ศาลหลวงปู่จ้อยอำเภอแกดำ', imageUrls: ['https://example.com/other.jpg'] },
    { id: 'bridge', name: 'สะพานไม้แกดำ', imageUrls: [] },
  ];
  const result = getProvinceHighlights('TH-44', places);
  assert.equal(result.length, 2);
  assert.equal(result[0].place.id, 'with-photo');
  assert.equal(result[1].place.id, 'bridge');
  assert.equal(result.some((item) => item.place.id === 'unrelated'), false);
  assert.ok(result.every((item) => item.sourceUrl.startsWith('https://mahasarakham.prd.go.th/')));
  assert.deepEqual(getProvinceHighlights('TH-99', places), []);
});

test('curated province highlights cover all 77 provinces with official record provenance', () => {
  const { PROVINCE_HIGHLIGHTS } = load('src/sections/province/province-highlights.ts');
  const evidence = require('../data/province-highlights/highlights.json');
  const provinces = load('src/data/thailand-culture/provinces.ts').default;
  assert.equal(Object.keys(PROVINCE_HIGHLIGHTS).length, 77);
  assert.equal(Object.values(evidence).reduce((sum, rows) => sum + rows.length, 0), 208);
  for (const province of provinces) {
    const rows = PROVINCE_HIGHLIGHTS[province.code];
    assert.ok(rows.length >= 2 && rows.length <= 4);
    assert.equal(new Set(rows.map((row) => row.title)).size, rows.length);
    for (const item of evidence[province.code]) {
      assert.equal(item.provinceName, province.name);
      assert.ok(item.sourceRecordId);
      assert.match(item.sourceUrl, /^https:\/\/datacatalog\.tat\.or\.th\//);
    }
  }
});

test('national directories include all artists, support search, and retain documented provinces', async () => {
  const s = service();
  const all = await s.getProvinceCulturalSection({}, '', '', 'artists', 0, 12);
  assert.equal(all.total, artistSnapshot.artists.length);
  assert.equal(all.data.length, 12);
  const target = artistSnapshot.artists.find(a => a.provinceAssociations.length);
  const filtered = await s.getProvinceCulturalSection({}, '', '', 'artists', 0, 12, target.name);
  assert.ok(filtered.data.some(item => item.title === target.name));
  const item = filtered.data.find(item => item.title === target.name);
  assert.ok(item.details.some(detail => detail.label === 'จังหวัดที่มีหลักฐาน' && detail.value.includes(target.provinceAssociations[0].provinceName)));
});

test('public group endpoint validates allowlist, province, page, and maps product group safely', async () => {
  let args;
  let fail = false;
  const route = load('src/app/api/culture/data-groups/route.ts', {
    'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client: {} }) },
    'src/server/province-cultural-data': { getProvinceCulturalSection: async (...values) => {
      args = values;
      if (fail) throw new Error('sensitive upstream error');
      return { total: 2, data: [], page: values[4], pageSize: 12 };
    } },
  });
  const request = (search) => ({ nextUrl: new URL(`https://local.test?${search}`) });
  for (const search of ['group=groups', 'group=artists&province=TH-99', 'group=fabric&page=-1', 'group=places', 'group=crafts&category=invalid']) {
    assert.equal((await route.GET(request(search))).status, 400);
  }
  const response = await route.GET(request('group=products&province=TH-44&q=test&page=1'));
  assert.equal(response.status, 200);
  assert.deepEqual(args.slice(1), ['TH-44', 'มหาสารคาม', 'cpot', 1, 12, 'test']);
  await route.GET(request('group=artists'));
  assert.deepEqual(args.slice(1), ['', '', 'artists', 0, 12, '']);
  await route.GET(request('group=crafts&category=weaving'));
  assert.deepEqual(args.slice(1), ['', '', 'crafts', 0, 12, '', { category: 'weaving' }]);
  fail = true;
  const failure = await route.GET(request('group=heritage'));
  assert.equal(failure.status, 503);
  assert.ok(!JSON.stringify(await failure.json()).includes('sensitive'));
});

test('national product search uses bounded database pagination and safe public projection', async () => {
  let filtered = false;
  const db = { from() { return {
    select(fields) { assert.ok(!fields.includes('contact')); return this; },
    or() { throw Error('National query must not restrict province'); },
    ilike(field, query) { assert.equal(field, 'product_name'); assert.equal(query, '%test%'); filtered = true; return this; },
    order(field) { assert.equal(field, 'id'); return this; },
    range(start, end) { assert.equal(start, 12); assert.equal(end, 23); return Promise.resolve({ data: [], count: 25, error: null }); },
  }; } };
  const result = await service().getProvinceCulturalSection(db, '', '', 'cpot', 1, 12, 'test');
  assert.ok(filtered);
  assert.equal(result.total, 25);
});

test('fabric images match exact record identity and preserve source credit', async () => {
  const manifest = require('../data/cultural-images/fabric-images.json');
  assert.equal(manifest.length, 4);
  for (const image of manifest) {
    const db = { from() { return { select() { return this; }, order() { return this; }, range: async () => ({ data: [image], count: 1 }) }; } };
    const result = await service().getProvinceCulturalSection(db, '', '', 'fabric');
    assert.equal(result.data[0].imageUrl, image.imageUrl);
    assert.equal(result.data[0].imageCredit, image.imageCredit);
    assert.ok(result.data[0].sourceUrls.includes(image.sourceUrl));
  }
});

test('merged crafts paginate across local and database boundary without missing or repeating rows', async () => {
  const s = load('src/server/province-cultural-data.ts');
  const community = await s.getProvinceCulturalSection({}, '', '', 'community', 0, 100);
  const fabricRows = Array.from({ length: 8 }, (_, i) => ({ id: String(i), title: `ผ้า ${i}`, province: 'เชียงใหม่', source_uri: 'https://example.com/fabric' }));
  const ranges = [];
  const db = { from() { return {
    select() { return this; }, order() { return this; },
    range(start, end) { ranges.push([start, end]); return Promise.resolve({ data: fabricRows.slice(start, end + 1), count: fabricRows.length }); },
  }; } };
  const collected = [];
  for (let page = 0; page < Math.ceil((community.total + fabricRows.length) / 4); page++) {
    const result = await s.getProvinceCulturalSection(db, '', '', 'crafts', page, 4);
    assert.equal(result.total, community.total + fabricRows.length);
    collected.push(...result.data);
  }
  assert.equal(collected.length, community.total + fabricRows.length);
  assert.equal(new Set(collected.map(item => item.id)).size, collected.length);
  assert.ok(collected.every(item => item.sourceUrl));
  assert.ok(ranges.every(([start, end]) => end - start < 4));
});

test('craft subcategories combine weaving sources and keep non-fabric categories local', async () => {
  const s = load('src/server/province-cultural-data.ts');
  const noDb = { from() { throw Error('Non-fabric categories must not query fabric'); } };
  const mats = await s.getProvinceCulturalSection(noDb, '', '', 'crafts', 0, 12, '', { category: 'mats' });
  assert.equal(mats.total, 2);
  assert.ok(mats.data.every(item => item.subtitle.includes('ทอเสื่อ/สาด')));
  const filtered = await s.getProvinceCulturalSection(noDb, 'TH-57', 'เชียงราย', 'crafts', 0, 12, 'ไตหย่า', { category: 'mats' });
  assert.equal(filtered.total, 1);
  const db = { from() { return { select() { return this; }, order() { return this; }, range: async () => ({ data: [{ id: 'test', title: 'ผ้าตัวอย่าง' }], count: 1 }) }; } };
  const weaving = await s.getProvinceCulturalSection(db, '', '', 'crafts', 0, 100, '', { category: 'weaving' });
  assert.ok(weaving.data.some(item => item.id === 'fabric:test'));
  assert.ok(weaving.data.filter(item => item.id.startsWith('community:')).every(item => item.subtitle.includes('การทอผ้า')));
  assert.equal(weaving.total, weaving.data.length);
});

test('QSDS enriches eight existing database identities and does not add duplicate fabric rows', async () => {
  const sources = require('../data/cultural-heritage/qsds-textiles.json').items.filter(item => item.recordType === 'fabric');
  assert.equal(sources.length, 8);
  const rows = sources.map(item => ({ id: item.recordId, title: item.recordTitle, province: item.province, source_uri: 'https://example.com/registry' }));
  const db = { from() { return { select() { return this; }, order() { return this; }, range: async () => ({ data: rows, count: rows.length }) }; } };
  const result = await service().getProvinceCulturalSection(db, '', '', 'fabric', 0, 12);
  assert.equal(result.total, 8);
  assert.equal(result.data.length, 8);
  for (const source of sources) {
    const item = result.data.find(record => record.id === source.recordId);
    assert.ok(item.sourceUrls.includes(source.sourceUrl));
    assert.ok(item.details.some(detail => detail.value === source.technique));
  }
  rows[0].title = 'different fabric';
  const mismatched = await service().getProvinceCulturalSection(db, '', '', 'fabric', 0, 12);
  assert.ok(!mismatched.data[0].sourceUrls.includes(sources[0].sourceUrl));
});

test('batik subcategory reads local textile evidence without fetching the weaving registry', async () => {
  const db = { from() { throw Error('Batik must not query the weaving registry'); } };
  const s = load('src/server/province-cultural-data.ts');
  const result = await s.getProvinceCulturalSection(db, '', '', 'crafts', 0, 12, '', { category: 'dyeing' });
  assert.equal(result.total, 4);
  assert.ok(result.data.some(item => item.title.includes('เกาะยาวน้อย')));
  const phuket = await s.getProvinceCulturalSection(db, 'TH-83', 'ภูเก็ต', 'crafts', 0, 12, '', { category: 'dyeing' });
  assert.equal(phuket.total, 1);
  assert.ok(phuket.data[0].title.includes('ภูเก็ต'));
});

test('craft category counts use aggregate database count and count all matching local records', async () => {
  const { getCraftCategoryCounts } = load('src/server/craft-category-counts.ts');
  let filters = [];
  const db = { from() { return {
    select(fields, options) { assert.equal(options.head, true); assert.equal(options.count, 'exact'); return this; },
    or(value) { filters.push(value); return this; },
    ilike(field, value) { filters.push([field, value]); return this; },
    abortSignal: async () => ({ count: 76, error: null }),
  }; } };
  const all = await getCraftCategoryCounts(db);
  assert.equal(all.counts.all, 131);
  assert.equal(all.counts.weaving, 118);
  assert.equal(all.counts.dyeing, 4);
  assert.equal(all.counts.mats, 2);
  assert.equal(all.complete, true);
  await getCraftCategoryCounts(db, 'TH-10', 'กรุงเทพมหานคร', 'บ้าน%ครัว_');
  assert.deepEqual(filters, ['province_code.eq.TH-10,province.eq.กรุงเทพมหานคร', ['title', '%บ้านครัว%']]);
});

test('unavailable registry counts remain unknown while local category counts are still returned', async () => {
  const { getCraftCategoryCounts } = load('src/server/craft-category-counts.ts');
  const db = { from() { return { select() { return this; }, abortSignal: async () => ({ count: null, error: new Error('offline') }) }; } };
  const result = await getCraftCategoryCounts(db);
  assert.equal(result.counts.all, null);
  assert.equal(result.counts.weaving, null);
  assert.equal(result.counts.dyeing, 4);
  assert.equal(result.complete, false);
});

test('public craft categories form a complete partition and counts match each category list', async () => {
  const { CRAFT_CATEGORIES, getPrimaryCraftCategory, normalizeCraftCategory } = load('src/lib/public-cultural-data.ts');
  assert.equal(getPrimaryCraftCategory(['ทอเสื่อ/สาด', 'ผลิตภัณฑ์ชุมชน', 'วิถีชีวิตชุมชน']), 'mats');
  assert.equal(getPrimaryCraftCategory(['จักสาน', 'ผลิตภัณฑ์ชุมชน']), 'basketry');
  assert.equal(normalizeCraftCategory('products'), 'stories');
  assert.equal(normalizeCraftCategory('lifestyle'), 'stories');
  const rows = Array.from({ length: 76 }, (_, i) => ({ id: `f-${i}`, title: `ผ้า ${i}` }));
  const db = { from() { return {
    select() { return this; }, order() { return this; },
    range: async (start, end) => ({ data: rows.slice(start, end + 1), count: rows.length }),
    abortSignal: async () => ({ count: rows.length, error: null }),
  }; } };
  const s = load('src/server/province-cultural-data.ts');
  const { getCraftCategoryCounts } = load('src/server/craft-category-counts.ts');
  const { counts } = await getCraftCategoryCounts(db);
  const all = await s.getProvinceCulturalSection(db, '', '', 'crafts', 0, 1000);
  const ids = [];
  for (const category of CRAFT_CATEGORIES) {
    const result = await s.getProvinceCulturalSection(db, '', '', 'crafts', 0, 1000, '', { category: category.key });
    assert.equal(result.total, counts[category.key], category.key);
    assert.equal(result.data.length, result.total);
    ids.push(...result.data.map(item => item.id));
  }
  assert.equal(ids.length, all.total);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(new Set(ids), new Set(all.data.map(item => item.id)));
  assert.equal(CRAFT_CATEGORIES.reduce((sum, category) => sum + counts[category.key], 0), counts.all);
  const legacy = await s.getProvinceCulturalSection(db, '', '', 'crafts', 0, 1000, '', { category: 'products' });
  assert.equal(legacy.total, counts.stories);
});
