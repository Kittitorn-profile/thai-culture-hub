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



test('overview explains datasets, counts categories and preserves source attribution', async () => {
  const snapshot = require('../data/cultural-artists/registry.json');
  const service = load('src/server/cultural-data-overview.ts', {
    'src/server/cultural-artists': { getCulturalArtistDirectory: async () => snapshot },
    'src/server/cultural-heritage': { HERITAGE_SOURCE_URL: 'https://data.go.th/dataset/ich_51_02', getAllHeritageRecords: async () => [{ categories: ['ศิลปะการแสดง', 'งานช่างฝีมือดั้งเดิม'] }] },
    'src/server/cultural-data-inventory': { getCulturalDataInventory: async () => ({ checkedAt: '2026-11-08', data: [{ key: 'places_all', count: 3 }, { key: 'categories', count: 12 }] }) },
  });
  const db = { from() { return { select() { return this; }, eq(_field, value) { this.key = value; return this; }, async abortSignal() { return { count: this.key === 'temple' ? 2 : 0, error: null }; } }; } };
  const result = await service.getCulturalDataOverview(db);
  assert.equal(result.sections.length, 5);
  assert.equal(result.sections[0].rows.find((row) => row.key === 'other').count, 1);
  const artists = result.sections.find((section) => section.key === 'artists');
  assert.equal(artists.total, 1636);
  assert.equal(artists.rows.find((row) => row.key === 'performing_artist').count, 33);
  const heritage = result.sections.find((section) => section.key === 'heritage');
  assert.equal(heritage.total, 1);
  assert.equal(heritage.rows.filter((row) => row.count === 1).length, 2);
  const community = result.sections.find((section) => section.key === 'community');
  assert.equal(community.total, 55);
  assert.equal(community.rows.find((row) => row.key === 'mats').count, 2);
  assert.ok(community.sources.every((source) => source.url.startsWith('https://')));
});
test('overview navigation has a permission and stable menu groups', () => {
  const permissions = load('src/auth/admin-permissions.ts');
  assert.equal(permissions.getAdminPermissionFromPath('/admin/cultural-data'), 'cultural_places');
  const groups = load('src/lib/cultural-data-groups.ts');
  assert.equal(new Set(groups.COMMUNITY_GROUPS.map((group) => group.key)).size, 7);
  assert.equal(new Set(groups.ARTIST_GROUPS.map((group) => group.key)).size, 6);
});

test('overview endpoint checks permissions before collecting data', async () => {
  const api = load('src/app/api/admin/cultural-data-overview/route.ts', {
    'src/server/admin-api-auth': { verifyAdminRequest: async (_request, permission) => { assert.equal(permission, 'cultural_places'); return false; } },
    'src/server/supabase-admin': { getSupabaseAdmin() { throw Error('Must not connect'); } },
  });
  assert.equal((await api.GET({})).status, 401);
});
