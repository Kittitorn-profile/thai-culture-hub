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
test('public summary returns aggregate counts only and preserves unavailable counts', async () => {
  const { getCulturalDataSummary } = load('src/server/cultural-data-summary.ts', {
    'src/server/cultural-artists': { getCulturalArtistDirectory: async () => ({ artists: [{ secret: 'private' }, {}] }) },
    'src/server/ethnic-groups': { getEthnicGroupDirectory: async () => [{}, {}, {}] },
    'src/server/cultural-heritage': { getCulturalHeritage: async ({ collection }) => ({ total: collection === 'community' ? 15 : 4718, data: [{ private: true }] }) },
  });
  const db = { from(table) { return { select(fields, options) {
    assert.equal(options.head, true);
    assert.equal(options.count, 'exact');
    return { abortSignal: async () => table === 'thai_fabric_wisdom' ? { error: new Error('offline'), count: null } : { count: 0, error: null } };
  } }; } };
  const summary = await getCulturalDataSummary(db);
  assert.equal(summary.groups.length, 7);
  assert.equal(summary.groups.find(g => g.key === 'places').count, 0);
  assert.equal(summary.groups.find(g => g.key === 'artists').count, 2);
  assert.equal(summary.groups.find(g => g.key === 'ethnic').count, 3);
  assert.equal(summary.groups.find(g => g.key === 'heritage').count, 4718);
  assert.equal(summary.groups.find(g => g.key === 'community').count, 15);
  assert.equal(summary.groups.find(g => g.key === 'fabric').count, null);
  assert.equal(summary.complete, false);
  assert.ok(!JSON.stringify(summary).includes('private'));
  assert.ok(!JSON.stringify(summary).includes('offline'));
});
