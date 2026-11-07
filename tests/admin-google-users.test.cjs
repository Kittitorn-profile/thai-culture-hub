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

function setup() {
  let payload;
  const current = {
    id: 'target',
    email: 'person@example.com',
    app_metadata: { role: 'creator' },
    user_metadata: {
      full_name: 'Google Name',
      avatar_url: 'https://lh3.googleusercontent.com/avatar',
    },
  };
  const client = {
    auth: {
      admin: {
        getUserById: async () => ({ data: { user: current }, error: null }),
        createUser: async (value) => {
          payload = value;
          return { data: { user: { ...current, ...value } }, error: null };
        },
        updateUserById: async (id, value) => {
          payload = value;
          return { data: { user: { ...current, ...value } }, error: null };
        },
      },
    },
  };
  const route = load('src/app/api/admin/users/route.ts', {
    'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client }) },
    'src/server/admin-api-auth': {
      verifyAdminAccessToken: async () => ({ ok: true, user: { id: 'owner', role: 'admin' } }),
    },
  });
  return { route, payload: () => payload };
}
function request(body) {
  return new Request('https://local.test/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
test('Google accounts can be created without generating a password', async () => {
  const f = setup();
  const res = await f.route.POST(
    request({ email: 'person@example.com', role: 'reviewer', displayName: 'Reviewer' })
  );
  assert.equal(res.status, 201);
  assert.equal('password' in f.payload(), false);
  assert.equal(f.payload().app_metadata.role, 'reviewer');
  assert.deepEqual(f.payload().app_metadata.admin_permissions, ['creators']);
});
test('admin edits cannot overwrite names or avatars from Google', async () => {
  const f = setup();
  const res = await f.route.PATCH(
    request({ id: 'target', displayName: 'Updated Name', isActive: true })
  );
  assert.equal(res.status, 200);
  assert.equal('user_metadata' in f.payload(), false);
  assert.equal(f.payload().app_metadata.role, 'creator');
  assert.equal('password' in f.payload(), false);
  assert.equal('email' in f.payload(), false);
});
test('switching to reviewer assigns article permission', async () => {
  const f = setup();
  const res = await f.route.PATCH(request({ id: 'target', role: 'reviewer', permissions: [] }));
  assert.equal(res.status, 200);
  assert.equal(f.payload().app_metadata.role, 'reviewer');
  assert.deepEqual(f.payload().app_metadata.admin_permissions, ['creators']);
});
