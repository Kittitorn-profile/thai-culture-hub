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

const id = '11111111-1111-4111-8111-111111111111';
test('only Google images are proxied; uploaded images remain unchanged', () => {
  const { getCreatorAvatarUrl } = load('src/utils/creator-avatar.ts');
  assert.equal(
    getCreatorAvatarUrl(id, 'https://lh3.googleusercontent.com/photo'),
    `/api/creator-avatar/${id}`
  );
  assert.equal(
    getCreatorAvatarUrl(id, 'https://storage.example/avatar.png'),
    'https://storage.example/avatar.png'
  );
  assert.equal(getCreatorAvatarUrl(id, ''), '');
});
function route(url) {
  const q = {
    select() {
      return q;
    },
    eq() {
      return q;
    },
    maybeSingle: async () => ({ data: { avatar_url: url }, error: null }),
  };
  return load('src/app/api/creator-avatar/[profileId]/route.ts', {
    'src/server/supabase-admin': {
      getSupabaseAdmin: () => ({ ok: true, client: { from: () => q } }),
    },
  });
}
test('avatar endpoint refuses non-Google stored URLs', async () => {
  const res = await route('https://example.com/picture').GET(new Request('https://local.test'), {
    params: Promise.resolve({ profileId: id }),
  });
  assert.equal(res.status, 404);
});
test('avatar endpoint serves verified image bytes with the proper content type', async () => {
  const original = global.fetch;
  global.fetch = async () =>
    new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } });
  try {
    const res = await route('https://lh3.googleusercontent.com/photo').GET(
      new Request('https://local.test'),
      { params: Promise.resolve({ profileId: id }) }
    );
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/png');
    assert.equal((await res.arrayBuffer()).byteLength, 3);
  } finally {
    global.fetch = original;
  }
});
test('upstream errors do not get returned as image content', async () => {
  const original = global.fetch;
  global.fetch = async () => new Response('blocked', { status: 429 });
  try {
    const res = await route('https://lh3.googleusercontent.com/photo').GET(
      new Request('https://local.test'),
      { params: Promise.resolve({ profileId: id }) }
    );
    assert.equal(res.status, 502);
  } finally {
    global.fetch = original;
  }
});
