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

async function withKey(value, fn) {
  const old = process.env.FINE_ARTS_API_KEY,
    alt = process.env.NEXT_PRIVATE_FINE_ARTS_API_KEY;
  delete process.env.NEXT_PRIVATE_FINE_ARTS_API_KEY;
  if (value) process.env.FINE_ARTS_API_KEY = value;
  else delete process.env.FINE_ARTS_API_KEY;
  try {
    await fn();
  } finally {
    if (old === undefined) delete process.env.FINE_ARTS_API_KEY;
    else process.env.FINE_ARTS_API_KEY = old;
    if (alt !== undefined) process.env.NEXT_PRIVATE_FINE_ARTS_API_KEY = alt;
  }
}
const { NextRequest } = require('next/server');
test('Fine Arts missing configuration is explicit 503', async () =>
  withKey('', async () => {
    const route = load('src/app/api/finearts/sync/route.ts');
    const res = await route.GET(
      new NextRequest('https://local.test/api/finearts/sync?provinceCode=TH-10')
    );
    assert.equal(res.status, 503);
    assert.match((await res.json()).message, /FINE_ARTS_API_KEY/);
  }));
test('Fine Arts write requires cultural places permission', async () => {
  const route = load('src/app/api/finearts/sync/route.ts', {
    'src/server/admin-api-auth': {
      verifyAdminAccessToken: async (_token, permission) => {
        assert.equal(permission, 'cultural_places');
        return { ok: false, status: 403, message: 'Forbidden' };
      },
    },
  });
  const res = await route.POST(
    new NextRequest('https://local.test/api/finearts/sync', {
      method: 'POST',
      body: JSON.stringify({ provinceCode: 'TH-10' }),
    })
  );
  assert.equal(res.status, 403);
});
test('Fine Arts dry run reports upstream timeout instead of success with zero rows', async () =>
  withKey('test', async () => {
    const original = global.fetch;
    global.fetch = async () => {
      throw new DOMException('Timed out', 'TimeoutError');
    };
    try {
      const route = load('src/app/api/finearts/sync/route.ts');
      const res = await route.GET(
        new NextRequest('https://local.test/api/finearts/sync?provinceCode=TH-10&sources=monument')
      );
      assert.equal(res.status, 504);
      assert.equal((await res.json()).upserted, 0);
    } finally {
      global.fetch = original;
    }
  }));
test('Fine Arts uses a single API-key header value', async () => {
  const original = global.fetch;
  global.fetch = async (_url, options) => {
    assert.equal(new Headers(options.headers).get('x-api-key'), 'test-key');
    return new Response(JSON.stringify({ data: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    const { fetchFineArtsPlaces } = load('src/app/api/finearts/fetch-finearts-places.ts');
    assert.equal(
      (await fetchFineArtsPlaces({ source: 'monument', provinceCode: 'TH-10', apiKey: 'test-key' }))
        .status,
      200
    );
  } finally {
    global.fetch = original;
  }
});
test('Ethnic sync returns structured failure when CKAN reports failure', async () => {
  const original = global.fetch;
  global.fetch = async () =>
    new Response(JSON.stringify({ success: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  try {
    const route = load('src/app/api/culture/ethnic-groups-sync/route.ts');
    const res = await route.GET(
      new NextRequest('https://local.test/api/culture/ethnic-groups-sync?dryRun=true')
    );
    assert.equal(res.status, 502);
    assert.ok((await res.json()).message);
  } finally {
    global.fetch = original;
  }
});
