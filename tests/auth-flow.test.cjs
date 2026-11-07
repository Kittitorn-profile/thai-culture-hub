const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function load(file, mocks = {}, cache = new Map()) {
  let filename = path.resolve(root, file);
  if (!fs.existsSync(filename)) filename += fs.existsSync(filename + '.ts') ? '.ts' : '.tsx';
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = new Module(filename);
  module.filename = filename;
  module.paths = Module._nodeModulePaths(path.dirname(filename));
  cache.set(filename, module);
  module.require = (id) => {
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
    if (resolved) return load(resolved, mocks, cache);
    return require(id);
  };
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    filename
  );
  return module.exports;
}

function database(options = {}) {
  const calls = [];
  const account =
    options.account === undefined
      ? {
          id: 'creator-1',
          email: 'creator@example.com',
          username: 'creator@example.com',
          role: 'creator',
          is_active: true,
          password_hash: 'sha256:' + crypto.createHash('sha256').update('password1').digest('hex'),
        }
      : options.account;
  const profile =
    options.profile === undefined
      ? {
          id: 'profile-1',
          user_id: 'creator-1',
          email: 'creator@example.com',
          display_name: 'Creator',
          status: 'approved',
        }
      : options.profile;
  function query(table) {
    const state = { table, action: 'select', filters: {} };
    const chain = {
      select() {
        return chain;
      },
      eq(key, value) {
        state.filters[key] = value;
        return chain;
      },
      insert(value) {
        state.action = 'insert';
        state.value = value;
        return chain;
      },
      delete() {
        state.action = 'delete';
        return chain;
      },
      update(value) {
        state.action = 'update';
        state.value = value;
        return chain;
      },
      single() {
        return finish();
      },
      maybeSingle() {
        return finish();
      },
      then(resolve, reject) {
        return finish().then(resolve, reject);
      },
    };
    async function finish() {
      calls.push({ ...state });
      if (state.table === 'creator_profiles' && options.profileError)
        return { data: null, error: { message: 'profile lookup failed' } };
      if (state.action === 'delete') return { data: null, error: null };
      if (state.action === 'insert')
        return {
          data:
            state.table === 'user'
              ? { id: 'new-user' }
              : { id: 'new-profile', user_id: 'new-user', ...state.value },
          error: null,
        };
      const value = state.table === 'user' ? account : profile;
      const matches =
        value &&
        Object.entries(state.filters).every(
          ([key, expected]) => String(value[key]) === String(expected)
        );
      return { data: matches ? value : null, error: null };
    }
    return chain;
  }
  const client = {
    from: query,
    auth: {
      admin: { updateUserById: async () => ({ data: {}, error: null }) },
      getUser: async () => ({
        data: {
          user: options.googleUser ?? {
            id: 'google-id',
            email: 'creator@example.com',
            identities: [{ provider: 'google' }],
            user_metadata: { full_name: 'Creator' },
            app_metadata: {},
          },
        },
        error: null,
      }),
    },
  };
  return {
    calls,
    account,
    profile,
    mocks: { 'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client }) } },
  };
}
const request = (body, authorization) => ({
  json: async () => body,
  headers: new Headers(authorization ? { authorization: `Bearer ${authorization}` } : {}),
});
const { getSafeRoleRedirectPath, getRoleHomePath } = load('src/auth/utils/role-redirect.ts');

test('unknown Google identities never receive an admin destination', () => {
  assert.equal(getRoleHomePath({ app_metadata: {} }), '/');
  const { getAdminRole } = load('src/auth/admin-permissions.ts');
  assert.equal(getAdminRole({ user_metadata: { role: 'admin' } }), '');
});
test('role redirects reject external URLs, guest loops, and cross-role paths', () => {
  const creator = { role: 'creator' };
  for (const target of [
    'https://evil.invalid',
    '//evil.invalid',
    '/\\evil.invalid',
    '/admin/users',
    '/creator/../admin',
    '/creator/sign-in/',
    '/creator/register?returnTo=x',
    '/%2f%2fevil.invalid',
  ]) {
    assert.equal(getSafeRoleRedirectPath(creator, target), '/creator/articles', target);
  }
  assert.equal(
    getSafeRoleRedirectPath(creator, '/creator/profile?tab=details'),
    '/creator/profile?tab=details'
  );
  assert.equal(getSafeRoleRedirectPath({ role: 'admin' }, '/creator/profile'), '/admin');
});
test('salted password hashing preserves whitespace and legacy password compatibility', async () => {
  const { hashPassword, verifyPassword } = load('src/server/password.ts');
  const first = await hashPassword(' password1 ');
  const second = await hashPassword(' password1 ');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(' password1 ', first), true);
  assert.equal(await verifyPassword('password1', first), false);
  assert.equal(await verifyPassword('x', 'scrypt:invalid:hash'), false);
  const digest = crypto.createHash('sha256').update('password1').digest('hex');
  assert.equal(await verifyPassword('password1', `sha256:${digest}`), true);
  assert.equal(await verifyPassword('password1', `sha256$${digest}`), true);
  assert.equal(await verifyPassword('wrong', `sha256:${digest}`), false);
});
test('malformed login and registration requests return 400 without database access', async () => {
  for (const route of [
    'src/app/api/admin/auth/route.ts',
    'src/app/api/creator/register/route.ts',
    'src/app/api/creator/google-auth/route.ts',
  ]) {
    const db = database();
    const { POST } = load(route, db.mocks);
    for (const body of [null, [], { email: 42, password: true }, {}])
      assert.equal((await POST(request(body))).status, 400);
    assert.equal(db.calls.length, 0);
  }
});
test('password login requires an active, approved Creator and accepted terms', async () => {
  for (const [options, body, expected] of [
    [{}, { email: 'creator@example.com', password: 'password1', acceptTerms: true }, 200],
    [{}, { email: 'creator@example.com', password: 'wrong', acceptTerms: true }, 401],
    [{}, { email: 'creator@example.com', password: 'password1' }, 400],
    [
      { profile: { user_id: 'creator-1', status: 'pending' } },
      { email: 'creator@example.com', password: 'password1', acceptTerms: true },
      403,
    ],
  ]) {
    const db = database(options);
    const mocks = {
      ...db.mocks,
      'src/server/admin-api-auth': {
        createAdminToken: () => ({ ok: true, token: 'test-token', expiresAt: 1 }),
      },
    };
    assert.equal(
      (await load('src/app/api/admin/auth/route.ts', mocks).POST(request(body))).status,
      expected
    );
  }
  const db = database();
  db.account.is_active = false;
  assert.equal(
    (
      await load('src/app/api/admin/auth/route.ts', db.mocks).POST(
        request({ email: 'creator@example.com', password: 'password1', acceptTerms: true })
      )
    ).status,
    401
  );
});
test('registration validates terms, email, province and confirmation before insert', async () => {
  const db = database({ account: null });
  const { POST } = load('src/app/api/creator/register/route.ts', db.mocks);
  const valid = {
    email: 'new@example.com',
    password: ' password1 ',
    confirmPassword: ' password1 ',
    displayName: 'New Creator',
    provinceCode: 'TH-10',
    acceptTerms: true,
  };
  for (const change of [
    { acceptTerms: false },
    { email: 'invalid' },
    { provinceCode: 'unknown' },
    { confirmPassword: 'password1' },
  ])
    assert.equal((await POST(request({ ...valid, ...change }))).status, 400);
  assert.equal(db.calls.length, 0);
  assert.equal((await POST(request(valid))).status, 201);
  const inserted = db.calls.find((call) => call.table === 'user' && call.action === 'insert').value;
  assert.equal(inserted.is_active, false);
  assert.match(inserted.password_hash, /^scrypt:/);
  assert.equal(
    await load('src/server/password.ts').verifyPassword(' password1 ', inserted.password_hash),
    true
  );
});
test('Google sign-in does not auto-register unknown users', async () => {
  const db = database({ account: null });
  const response = await load('src/app/api/creator/google-auth/route.ts', db.mocks).POST(
    request({ intent: 'sign-in', acceptTerms: true }, 'google-token')
  );
  assert.equal(response.status, 404);
  assert.equal(
    db.calls.some((call) => call.action !== 'select'),
    false
  );
});
test('Google requires consent and valid registration data', async () => {
  const db = database();
  const { POST } = load('src/app/api/creator/google-auth/route.ts', db.mocks);
  assert.equal((await POST(request({ intent: 'register' }, 'google-token'))).status, 400);
  assert.equal(
    (await POST(request({ intent: 'register', acceptTerms: true }, 'google-token'))).status,
    400
  );
  assert.equal(db.calls.length, 0);
});
test('a failed Google profile lookup never deletes an existing user', async () => {
  const db = database({ profileError: true });
  const response = await load('src/app/api/creator/google-auth/route.ts', db.mocks).POST(
    request(
      { intent: 'register', acceptTerms: true, displayName: 'Creator', provinceCode: 'TH-10' },
      'google-token'
    )
  );
  assert.equal(response.status, 500);
  assert.equal(
    db.calls.some((call) => call.action === 'delete'),
    false
  );
});
test('unassigned Supabase identities cannot access admin APIs', async () => {
  const db = database();
  const result = await load('src/server/admin-api-auth.ts', db.mocks).verifyAdminAccessToken(
    'google-token'
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});
test('Creator tokens require current approval and active account, including after suspension', async () => {
  const secret = 'unit-test-secret';
  const payload = Buffer.from(
    JSON.stringify({ sub: 'creator-1', role: 'creator', exp: Math.floor(Date.now() / 1000) + 60 })
  ).toString('base64url');
  const token =
    payload + '.' + crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  for (const [status, active, expected] of [
    ['approved', true, true],
    ['pending', true, false],
    ['approved', false, false],
    ['rejected', true, false],
  ]) {
    const db = database();
    db.profile.status = status;
    db.account.is_active = active;
    const auth = load('src/server/creator-auth.ts', {
      ...db.mocks,
      'src/server/admin-api-auth': { getAdminSecret: () => secret },
    });
    assert.equal((await auth.verifyCreatorAccessToken(token)).ok, expected);
    assert.equal((await auth.verifyCreatorAccessToken(token + '.extra')).ok, false);
    assert.equal((await auth.verifyCreatorAccessToken(token.slice(0, -3) + 'bad')).ok, false);
  }
});

test('Google approved login issues a token; pending, rejected and other roles stay restricted', async () => {
  for (const [status, role, active, expected, hasToken] of [
    ['approved', 'creator', true, 200, true],
    ['pending', 'creator', false, 200, false],
    ['rejected', 'creator', false, 403, false],
    ['approved', 'creator', false, 403, false],
    ['approved', 'admin', true, 409, false],
  ]) {
    const db = database();
    db.profile.status = status;
    db.account.role = role;
    db.account.is_active = active;
    const { POST } = load('src/app/api/creator/google-auth/route.ts', {
      ...db.mocks,
      'src/server/admin-api-auth': { createAdminToken: () => ({ ok: true, token: 'test-token' }) },
    });
    const response = await POST(request({ intent: 'sign-in', acceptTerms: true }, 'google-token'));
    assert.equal(response.status, expected);
    const json = await response.json();
    assert.equal(Boolean(json.token), hasToken);
    assert.equal(
      db.calls.some((call) => call.action !== 'select'),
      false
    );
  }
});

test('Google registration creates pending profiles, never active sessions', async () => {
  const db = database({ account: null, profile: null });
  const { POST } = load('src/app/api/creator/google-auth/route.ts', db.mocks);
  const response = await POST(
    request(
      { intent: 'register', acceptTerms: true, displayName: 'New Creator', provinceCode: 'TH-10' },
      'google-token'
    )
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.data.status, 'pending');
  assert.equal(data.token, null);
  const insert = db.calls.find((call) => call.table === 'user' && call.action === 'insert');
  assert.equal(insert.value.is_active, false);
});

test('a new user is rolled back if Google profile creation fails', async () => {
  const db = database({ account: null, profileError: true });
  const response = await load('src/app/api/creator/google-auth/route.ts', db.mocks).POST(
    request(
      { intent: 'register', acceptTerms: true, displayName: 'New Creator', provinceCode: 'TH-10' },
      'google-token'
    )
  );
  assert.equal(response.status, 500);
  assert.equal(db.calls.find((call) => call.action === 'delete').filters.id, 'new-user');
});

test('expired Creator tokens cannot restore a session', async () => {
  const db = database();
  const secret = 'unit-test-secret';
  const payload = Buffer.from(
    JSON.stringify({ sub: 'creator-1', role: 'creator', exp: Math.floor(Date.now() / 1000) - 60 })
  ).toString('base64url');
  const token =
    payload + '.' + crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const auth = load('src/server/creator-auth.ts', {
    ...db.mocks,
    'src/server/admin-api-auth': { getAdminSecret: () => secret },
  });
  assert.equal((await auth.verifyCreatorAccessToken(token)).status, 401);
});

function providerHarness({
  creatorToken,
  creatorResponse,
  session,
  verifiedUser,
  verificationError,
} = {}) {
  const changes = [];
  const store = new Map(creatorToken ? [['creator_access_token', creatorToken]] : []);
  let userChecks = 0;
  const mocks = {
    react: {
      useRef: (value) => ({ current: value }),
      useMemo: (fn) => fn(),
      useEffect: () => {},
      useCallback: (fn) => fn,
    },
    'minimal-shared/hooks': {
      useSetState: () => ({
        state: { user: null, loading: true },
        setState: (value) => changes.push(value),
      }),
    },
    'src/lib/supabase': {
      supabase: {
        auth: {
          getSession: async () => ({ data: { session: session ?? null }, error: null }),
          getUser: async () => {
            userChecks++;
            return { data: { user: verifiedUser }, error: verificationError };
          },
        },
      },
    },
    'src/lib/axios': { defaults: { headers: { common: {} } } },
    'src/components/analytics/track-event': { setAdminAnalyticsDisabled: () => {} },
    'src/auth/context/auth-context': { AuthContext: 'auth-context' },
    'react/jsx-runtime': { jsx: (_type, props) => props },
  };
  const originalStorage = global.sessionStorage;
  const originalFetch = global.fetch;
  global.sessionStorage = {
    getItem: (key) => store.get(key) ?? null,
    removeItem: (key) => store.delete(key),
  };
  global.fetch = async () =>
    new Response(JSON.stringify(creatorResponse?.body ?? {}), {
      status: creatorResponse?.status ?? 401,
    });
  const { AuthProvider } = load('src/auth/context/supabase/auth-provider.tsx', mocks);
  const output = AuthProvider({ children: null });
  return {
    check: output.value.checkUserSession,
    changes,
    store,
    userChecks: () => userChecks,
    restore: () => {
      global.sessionStorage = originalStorage;
      global.fetch = originalFetch;
    },
  };
}

test('a verified Creator session takes priority over a leftover Google session', async () => {
  const harness = providerHarness({
    creatorToken: 'creator-token',
    creatorResponse: {
      status: 200,
      body: {
        data: {
          userId: 'creator-1',
          email: 'creator@example.com',
          displayName: 'Creator',
          status: 'approved',
        },
      },
    },
    session: { user: { id: 'google-id' } },
  });
  try {
    await harness.check();
    assert.equal(harness.changes.at(-1).user.role, 'creator');
    assert.equal(harness.userChecks(), 0);
  } finally {
    harness.restore();
  }
});
test('Google identity alone is not an authenticated application user', async () => {
  const identity = {
    id: 'google-id',
    email: 'creator@example.com',
    app_metadata: {},
    user_metadata: {},
  };
  const harness = providerHarness({
    session: { user: identity, access_token: 'google-token' },
    verifiedUser: identity,
  });
  try {
    await harness.check();
    assert.equal(harness.changes.at(-1).user, null);
  } finally {
    harness.restore();
  }
});
test('a revoked Creator token is removed from browser session storage', async () => {
  const harness = providerHarness({
    creatorToken: 'revoked-token',
    creatorResponse: { status: 403 },
  });
  try {
    await harness.check();
    assert.equal(harness.store.size, 0);
    assert.equal(harness.changes.at(-1).user, null);
  } finally {
    harness.restore();
  }
});
test('logout clears the Creator token and signs out the shared Supabase session', async () => {
  let removed = false;
  let signedOut = false;
  const originalStorage = global.sessionStorage;
  global.sessionStorage = {
    removeItem: (key) => {
      assert.equal(key, 'creator_access_token');
      removed = true;
    },
  };
  try {
    const action = load('src/auth/context/supabase/action.tsx', {
      'src/routes/paths': { paths: {} },
      'src/lib/supabase': {
        supabase: {
          auth: {
            signOut: async () => {
              signedOut = true;
              return { error: null };
            },
          },
        },
      },
      'src/auth/context/supabase/auth-provider': { CREATOR_AUTH_TOKEN_KEY: 'creator_access_token' },
    });
    await action.signOut();
    assert.equal(removed, true);
    assert.equal(signedOut, true);
  } finally {
    global.sessionStorage = originalStorage;
  }
});

test('authenticated users cannot remain on registration or sign-in screens', () => {
  const redirects = [];
  const { GuestGuard } = load('src/auth/guard/guest-guard.tsx', {
    react: { useEffect: (fn) => fn() },
    'src/routes/hooks': {
      useRouter: () => ({ replace: (url) => redirects.push(url) }),
      useSearchParams: () => new URLSearchParams('returnTo=/creator/register/'),
    },
    'src/auth/hooks': {
      useAuthContext: () => ({ user: { role: 'creator' }, loading: false, authenticated: true }),
    },
    'src/components/loading-screen': { SplashScreen: 'splash' },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
  });
  assert.equal(GuestGuard({ children: 'registration-form' }).type, 'splash');
  assert.deepEqual(redirects, ['/creator/articles']);
});

test('protected pages stop rendering immediately after logout', () => {
  const redirects = [];
  const { AuthGuard } = load('src/auth/guard/auth-guard.tsx', {
    react: { useEffect: (fn) => fn() },
    'src/routes/hooks': {
      useRouter: () => ({ replace: (url) => redirects.push(url) }),
      usePathname: () => '/creator/articles',
    },
    'src/routes/paths': {
      paths: {
        auth: {
          jwt: {},
          auth0: {},
          amplify: {},
          firebase: {},
          supabase: { signIn: '/admin-login' },
        },
      },
    },
    'src/global-config': { CONFIG: { auth: { method: 'supabase' } } },
    'src/auth/hooks': { useAuthContext: () => ({ loading: false, authenticated: false }) },
    'src/components/loading-screen': { SplashScreen: 'splash' },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
  });
  assert.equal(
    AuthGuard({ children: 'private-data', signInPath: '/creator/sign-in' }).type,
    'splash'
  );
  assert.deepEqual(redirects, ['/creator/sign-in?returnTo=%2Fcreator%2Farticles']);
});

test('Google identity verification cannot persist or replace the shared application session', () => {
  let options;
  load('src/lib/creator-google-auth.ts', {
    '@supabase/supabase-js': {
      createClient: (_url, _key, config) => {
        options = config.auth;
        return {};
      },
    },
    'src/global-config': {
      CONFIG: { supabase: { url: 'https://test.invalid', key: 'test-public-key' } },
    },
  });
  assert.equal(options.persistSession, false);
  assert.equal(options.autoRefreshToken, false);
  assert.equal(options.detectSessionInUrl, false);
  assert.equal(options.storageKey, 'creator-google-verification');
});

test('Google lookup on registration detects existing accounts without signing in or creating a request', async () => {
  const db = database();
  const response = await load('src/app/api/creator/google-auth/route.ts', db.mocks).POST(
    request({ intent: 'lookup' }, 'google-token')
  );
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.outcome, 'existing');
  assert.equal(result.data.status, 'approved');
  assert.equal(result.token, undefined);
  assert.equal(
    db.calls.some((call) => call.action !== 'select'),
    false
  );
});

test('approved but inactive accounts get the same blocked result from login, registration and lookup', async () => {
  const messages = [];
  for (const intent of ['sign-in', 'register', 'lookup']) {
    const db = database();
    db.account.is_active = false;
    const response = await load('src/app/api/creator/google-auth/route.ts', db.mocks).POST(
      request(
        { intent, acceptTerms: true, displayName: 'Creator', provinceCode: 'TH-10' },
        'google-token'
      )
    );
    assert.equal(response.status, 403);
    const result = await response.json();
    messages.push(result.message);
    assert.match(result.message, /ได้รับอนุมัติแล้ว.*ปิดใช้งาน/);
    assert.equal(result.token, undefined);
    assert.equal(
      db.calls.some((call) => call.action !== 'select'),
      false
    );
  }
  assert.equal(new Set(messages).size, 1);
});

test('existing pending accounts are never described by the API as newly submitted registrations', async () => {
  for (const intent of ['sign-in', 'register']) {
    const db = database();
    db.account.is_active = false;
    db.profile.status = 'pending';
    const response = await load('src/app/api/creator/google-auth/route.ts', db.mocks).POST(
      request(
        { intent, acceptTerms: true, displayName: 'Creator', provinceCode: 'TH-10' },
        'google-token'
      )
    );
    const result = await response.json();
    assert.equal(result.outcome, 'pending');
    assert.equal(result.isNewCreator, false);
    assert.equal(result.token, null);
    assert.equal(
      db.calls.some((call) => call.action !== 'select'),
      false
    );
  }
});

test('typing or toggling terms does not repeatedly initialize the Google button', () => {
  const previousWindow = global.window;
  const previousClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
  let renderCalls = 0;
  let callback;
  global.window = {
    google: {
      accounts: {
        id: {
          initialize: (options) => {
            callback = options.callback;
          },
          renderButton: () => {
            renderCalls++;
          },
        },
      },
    },
  };
  const hooks = [];
  let index = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((item, i) => item === b[i]);
  const react = {
    useRef(value) {
      const i = index++;
      if (!hooks[i])
        hooks[i] = { current: value === null ? { clientWidth: 400, replaceChildren() {} } : value };
      return hooks[i];
    },
    useCallback(fn, deps) {
      const i = index++;
      if (!hooks[i] || !same(hooks[i].deps, deps)) hooks[i] = { fn, deps };
      return hooks[i].fn;
    },
    useEffect(fn, deps) {
      const i = index++;
      if (!hooks[i] || !same(hooks[i].deps, deps)) {
        hooks[i] = { deps };
        fn();
      }
    },
  };
  try {
    const { GoogleIdentityButton } = load(
      'src/sections/creator/components/google-identity-button.tsx',
      {
        react,
        'next/script': () => null,
        '@mui/material/Box': () => null,
        '@mui/material/Button': () => null,
        'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
      }
    );
    let received = '';
    GoogleIdentityButton({
      onCredential: () => {
        received = 'old';
      },
      onConfigError() {},
    });
    index = 0;
    GoogleIdentityButton({
      onCredential: () => {
        received = 'current';
      },
      onConfigError() {},
    });
    assert.equal(renderCalls, 1);
    callback({ credential: 'test-credential' });
    assert.equal(received, 'current');
  } finally {
    global.window = previousWindow;
    if (previousClientId === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    else process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = previousClientId;
  }
});
