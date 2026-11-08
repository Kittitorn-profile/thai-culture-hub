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


const fixture = [
  { ethnic_id: null, title: 'มานิ', ip_group: 'Mani', province: 'สตูล', district_th: 'ทุ่งหว้า', village_name_th: 'กลุ่มวังคราม', lat: 7.1, lng: 99.8 },
  { ethnic_id: null, title: 'มานิ', ip_group: 'Mani', province: 'ตรัง', village_name_th: 'ชุมชนตัวอย่าง', lat: '', lng: null },
  { ethnic_id: 2, title: 'ไตหย่า', ip_group: 'Tai Ya', province: 'เชียงราย', description_th: 'ภูมิปัญญาสาดไตหย่า', lat: 0, lng: 0 },
];
test('ethnic records preserve source labels and do not invent missing coordinates or identities', () => {
  const service = load('src/server/ethnic-groups.ts');
  const rows = fixture.map(service.mapEthnicGroup);
  assert.equal(rows[0].group, 'Mani');
  assert.equal(rows[0].title, 'มานิ');
  assert.notEqual(rows[0].id, rows[1].id);
  assert.equal(rows[1].latitude, null);
  assert.equal(rows[2].longitude, null);
  assert.equal(service.filterEthnicGroups(rows, { group: 'Mani' }).length, 2);
  assert.equal(service.filterEthnicGroups(rows, { group: 'Mani', province: 'ตรัง' }).length, 1);
  assert.equal(service.filterEthnicGroups(rows, { q: 'สาด' })[0].province, 'เชียงราย');
});
test('ethnic directory surfaces database failures rather than an empty successful dataset', async () => {
  const service = load('src/server/ethnic-groups.ts');
  const db = { from() { return { select() { return this; }, order() { return this; }, range() { return this; }, async abortSignal() { return { data: null, error: { message: 'Failed' } }; } }; } };
  await assert.rejects(() => service.getEthnicGroupDirectory(db), /อ่านข้อมูล/);
});
function route(allowed) {
  const service = load('src/server/ethnic-groups.ts');
  return load('src/app/api/admin/ethnic-groups/route.ts', {
    'src/server/admin-api-auth': { verifyAdminRequest: async (_request, permission) => { assert.equal(permission, 'cultural_places'); return allowed; } },
    'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client: {} }) },
    'src/server/ethnic-groups': { ...service, getEthnicGroupDirectory: async () => fixture.map(service.mapEthnicGroup) },
  });
}
test('ethnic API enforces permissions and validates pagination', async () => {
  assert.equal((await route(false).GET({})).status, 401);
  assert.equal((await route(true).GET({ nextUrl: new URL('https://local.test?limit=-1') })).status, 400);
});
test('ethnic API separates filtered records from source label and province statistics', async () => {
  const res = await route(true).GET({ nextUrl: new URL('https://local.test?group=Mani&province='+encodeURIComponent('ตรัง')) });
  const body = await res.json();
  assert.equal(body.total, 1);
  assert.equal(body.coverage.records, 3);
  assert.equal(body.coverage.groupLabels, 2);
  assert.equal(body.coverage.provinces, 3);
  assert.equal(body.data[0].province, 'ตรัง');
  assert.match(body.sourceUrl, /opendevelopmentmekong/);
  const permissions = load('src/auth/admin-permissions.ts');
  assert.equal(permissions.getAdminPermissionFromPath('/admin/ethnic-groups/'), 'cultural_places');
});

test('reviewed SAC supplements have per-community coordinate evidence and defer conflicting points', () => {
  const { ethnicSupplementDirectorySchema } = load('src/server/ethnic-supplements.ts');
  const items = require('../data/ethnic-groups/community-supplements.json');
  const parsed = ethnicSupplementDirectorySchema.parse({ schemaVersion: 1, items });
  assert.equal(parsed.items.length, 26);
  assert.equal(new Set(items.map((item) => item.id)).size, 26);
  assert.equal(items.some((item) => ['sac-community-478','sac-community-1521'].includes(item.id)), false);
  for (const item of items) {
    assert.equal(item.coordinateSourceUrl, item.sourceUrl);
    assert.match(item.sourceUrl, new RegExp(item.id.split('-').pop()+'$'));
    assert.equal(item.coordinateKind, 'community_reference');
  }
  const service = load('src/server/ethnic-groups.ts');
  const mixed = items.find((item) => item.id === 'sac-community-1431');
  assert.ok(mixed.groups.length > 1);
  assert.equal(service.filterEthnicGroups([mixed], { group: mixed.groups[1] }).length, 1);
});

test('supplement import is idempotent and checks communities across data sources', () => {
  const { mergeSupplement } = require('../scripts/import-ethnic-community-supplements.cjs');
  const items = require('../data/ethnic-groups/community-supplements.json');
  const first = mergeSupplement(null, items, []);
  assert.equal(first.stats.added, 26);
  const second = mergeSupplement(first.content, items, []);
  assert.equal(second.stats.added, 0);
  assert.equal(second.stats.unchanged, 26);
  assert.deepEqual(second.content, first.content);
  const duplicate = { province: items[0].province, district_th: items[0].district, sub_district_th: items[0].subDistrict, village_name_th: items[0].village };
  const deduped = mergeSupplement(null, items, [duplicate]);
  assert.equal(deduped.stats.added, 25);
  assert.deepEqual(deduped.stats.duplicates, [items[0].id]);
});

test('directory combines original records with the validated supplemental registry', async () => {
  const items = require('../data/ethnic-groups/community-supplements.json');
  const service = load('src/server/ethnic-groups.ts');
  const db = { from(table) {
    return { select() { return this; }, order() { return this; }, range() { return this; }, eq() { return this; },
      abortSignal() { return table === 'ethnic_groups' ? Promise.resolve({ data: fixture, error: null }) : this; },
      async maybeSingle() { return { data: { content: { schemaVersion: 1, items } }, error: null }; },
    };
  } };
  const records = await service.getEthnicGroupDirectory(db);
  assert.equal(records.length, fixture.length + 26);
  const merged = records.find((item) => item.id === 'sac-community-850');
  assert.equal(merged.latitude, 19.523333);
  assert.match(merged.sourceName, /ศูนย์มานุษยวิทยา/);
  assert.match(records[0].sourceUrl, /opendevelopmentmekong/);
});
