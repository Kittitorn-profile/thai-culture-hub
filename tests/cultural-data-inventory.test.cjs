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


function inventory(heritageFails = false) {
  const filtered = [];
  const db = { from(table) { return {
    source: '', province: '', active: false,
    select(_columns, options) { assert.equal(options.count, 'exact'); assert.equal(options.head, true); return this; },
    eq(key, value) { if (key === 'source') this.source = value; if (key === 'province_code') this.province = value; if (key === 'is_active') this.active = value; return this; },
    async abortSignal() {
      filtered.push({ table, source: this.source, province: this.province, active: this.active });
      return table === 'tat_articles' ? { error: { message: 'Missing table' }, count: null } : { error: null, count: this.source === 'religious_places' ? 10 : 0 };
    },
  }; } };
  const service = load('src/server/cultural-data-inventory.ts', {
    'src/server/cultural-artists': { getCulturalArtistDirectory: async () => ({ artists: [{ provinceAssociations: [{ provinceCode: 'TH-44' }] }, { provinceAssociations: [] }] }) },
    'src/server/cultural-heritage': { getCulturalHeritage: async ({ province }) => { if (heritageFails) throw Error('Offline'); return { total: province ? 3 : 4718 }; } },
  });
  return { db, service, filtered };
}
test('inventory counts present database rows separately from source and project data', async () => {
  const { db, service, filtered } = inventory();
  const result = await service.getCulturalDataInventory(db);
  const row = (key) => result.data.find((item) => item.key === key);
  assert.equal(row('religious_places').count, 10);
  assert.equal(row('finearts_museum').count, 0);
  assert.equal(row('tat_articles').count, null);
  assert.ok(row('tat_articles').error);
  assert.equal(row('artists').count, 2);
  assert.equal(row('heritage').count, 4718);
  assert.match(row('heritage').basis, /CKAN/);
  assert.equal(row('community_weaving').count, 47);
  assert.equal(row('community_crafts').count, 8);
  assert.ok(filtered.find((item) => item.table === 'cultural_categories').active);
});
test('province scoping leaves unsupported tables global and unknown artist provinces unassigned', async () => {
  const { db, service, filtered } = inventory(true);
  const result = await service.getCulturalDataInventory(db, 'TH-44', 'มหาสารคาม');
  assert.equal(result.data.find((item) => item.key === 'artists').count, 1);
  assert.equal(result.data.find((item) => item.key === 'heritage').count, null);
  assert.equal(result.data.find((item) => item.key === 'community_weaving').count, 2);
  assert.equal(result.data.find((item) => item.key === 'tat_routes').scope, 'all');
  assert.ok(filtered.filter((item) => item.table === 'cultural_places').every((item) => item.province === 'TH-44'));
});
test('inventory API rejects unauthorised requests before touching database', async () => {
  const api = load('src/app/api/admin/cultural-data-inventory/route.ts', {
    'src/server/admin-api-auth': { verifyAdminRequest: async (_req, permission) => { assert.equal(permission, 'cultural_places'); return false; } },
    'src/server/supabase-admin': { getSupabaseAdmin() { throw Error('Must not connect'); } },
  });
  assert.equal((await api.GET({})).status, 401);
});
test('inventory API rejects invalid provinces', async () => {
  const api = load('src/app/api/admin/cultural-data-inventory/route.ts', {
    'src/server/admin-api-auth': { verifyAdminRequest: async () => true },
    'src/server/supabase-admin': { getSupabaseAdmin() { throw Error('Must not connect'); } },
  });
  assert.equal((await api.GET({ nextUrl: new URL('https://local.test?provinceCode=TH-99') })).status, 400);
});
