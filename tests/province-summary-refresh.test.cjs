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

function setup({ stale = false, sourceError = false, placeCount } = {}) {
  const provinces = require('../docs/data-audits/province-summary-audit.json').results;
  const scheduled = [],
    saved = [],
    reads = [],
    sourceOrders = [];
  const rows = provinces.map((province) => ({
    province_code: province.code,
    counts: { temple: 1 },
    dominant_category: 'temple',
    total: 1,
    refreshed_at: stale ? '2000-01-01' : new Date().toISOString(),
  }));
  const client = {
    from(table) {
      const query = {
        select() {
          return this;
        },
        order(column) {
          if (table === 'cultural_places') sourceOrders.push(column);
          return this;
        },
        range(from, to) {
          this.from = from;
          this.to = to;
          return this;
        },
        returns() {
          return this;
        },
        eq() {
          return this;
        },
        upsert(value) {
          saved.push(value);
          this.write = true;
          return this;
        },
        then(resolve, reject) {
          reads.push(table);
          const source = table !== 'province_place_summaries';
          let data =
            table === 'province_place_summaries'
              ? rows
              : table === 'cultural_places'
                ? [
                    {
                      id: 'first',
                      province_code: 'TH-44',
                      name: 'Temple',
                      district: 'City',
                      category: 'temple',
                      lat: 16,
                      lng: 103,
                      image_urls: [],
                    },
                    {
                      id: 'duplicate',
                      province_code: 'TH-44',
                      name: 'Temple',
                      district: 'City',
                      category: 'temple',
                      lat: 16,
                      lng: 103,
                      image_urls: [],
                    },
                  ]
                : [];
          if (table === 'cultural_places') {
            if (placeCount != null)
              data = Array.from({ length: placeCount }, (_, index) => ({
                id: `place-${index}`,
                province_code: 'TH-44',
                name: `Temple ${index}`,
                district: 'City',
                category: 'temple',
                lat: 16,
                lng: 103,
                image_urls: [],
                updated_at: '2026-01-01',
              }));
            data = data.slice(this.from ?? 0, (this.to ?? data.length - 1) + 1);
          }
          return Promise.resolve({
            data,
            error: source && sourceError ? { message: 'Read failed' } : null,
          }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const route = load('src/app/api/culture/province-places/route.ts', {
    'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client }) },
    'next/server': {
      NextResponse: { json: (value, init) => new Response(JSON.stringify(value), init) },
      after: (callback) => scheduled.push(callback),
    },
  });
  const request = {
    nextUrl: new URL('https://local.test/api/culture/province-places?summary=true'),
  };
  return { route, request, scheduled, saved, reads, sourceOrders };
}

test('fresh province totals use the summary table without loading all places', async () => {
  const fixture = setup();
  const response = await fixture.route.GET(fixture.request);
  assert.equal(response.status, 200);
  assert.equal(Object.keys((await response.json()).summaries).length, 77);
  assert.deepEqual(fixture.reads, ['province_place_summaries']);
  assert.equal(fixture.scheduled.length, 0);
});

test('stale totals refresh after the response and deduplicate the same way as the map', async () => {
  const fixture = setup({ stale: true });
  const response = await fixture.route.GET(fixture.request);
  assert.equal(response.status, 200);
  assert.equal(fixture.scheduled.length, 1);
  assert.equal(fixture.saved.length, 0);
  await fixture.scheduled[0]();
  assert.equal(fixture.saved.length, 1);
  assert.equal(fixture.saved[0].length, 77);
  const summary = fixture.saved[0].find((row) => row.province_code === 'TH-44');
  assert.equal(summary.total, 1);
  assert.equal(summary.counts.temple, 1);
  assert.match(response.headers.get('Cache-Control'), /s-maxage=300/);
});

test('a failed source read retains previous totals instead of writing zero counts', async () => {
  const fixture = setup({ stale: true, sourceError: true });
  await fixture.route.GET(fixture.request);
  const warn = console.warn;
  console.warn = () => {};
  try {
    await fixture.scheduled[0]();
  } finally {
    console.warn = warn;
  }
  assert.equal(fixture.saved.length, 0);
});

test('summary refresh reads past 1000 records with a stable id tie-breaker', async () => {
  const fixture = setup({ stale: true, placeCount: 1001 });
  await fixture.route.GET(fixture.request);
  await fixture.scheduled[0]();
  const summary = fixture.saved[0].find((row) => row.province_code === 'TH-44');
  assert.equal(summary.total, 1001);
  assert.equal(fixture.reads.filter((table) => table === 'cultural_places').length, 2);
  assert.deepEqual(fixture.sourceOrders, ['updated_at', 'id', 'updated_at', 'id']);
});
