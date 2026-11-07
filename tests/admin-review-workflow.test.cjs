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

function setup({
  permitted = true,
  userId = 'reviewer-1',
  required = 2,
  assigned = ['reviewer-1', 'reviewer-2'],
  reviews = [],
  status = 'pending_review',
} = {}) {
  let saved;
  const client = {
    from(table) {
      const q = {
        select() {
          return q;
        },
        eq() {
          return q;
        },
        neq() {
          return q;
        },
        or() {
          return q;
        },
        order() {
          return q;
        },
        update(value) {
          saved = value;
          return q;
        },
        maybeSingle: async () => ({
          data: {
            status,
            approval_required_count: required,
            approval_reviewer_ids: assigned,
            approval_reviews: reviews,
          },
          error: null,
        }),
        single: async () => ({ data: { id: 'article', ...saved }, error: null }),
        then(resolve) {
          return Promise.resolve({
            data:
              table === 'reviewers'
                ? assigned.map((id) => ({
                    user_id: id,
                    display_name: id,
                    reviewer_status: 'verified',
                    can_approve: true,
                  }))
                : [],
            error: null,
          }).then(resolve);
        },
      };
      return q;
    },
  };
  const mocks = {
    'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client }) },
    'src/server/admin-api-auth': {
      verifyAdminAccessToken: async () =>
        permitted
          ? { ok: true, user: { id: userId, email: 'reviewer@example.com' } }
          : { ok: false, status: 403, message: 'Forbidden' },
    },
    'src/server/creator-auth': {
      cleanText: (v) => (typeof v === 'string' ? v.trim() : ''),
      getBearerToken: () => '',
      mapCreatorArticle: (v) => v,
    },
  };
  return { route: load('src/app/api/admin/creator-articles/route.ts', mocks), saved: () => saved };
}
function request(body) {
  return new Request('https://local.test/api/admin/creator-articles', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
test('article APIs reject users without menu permission', async () => {
  const f = setup({ permitted: false });
  assert.equal((await f.route.PATCH(request({ id: 'article', status: 'published' }))).status, 403);
  assert.equal(f.saved(), undefined);
});
test('a client cannot lower the stored required approval count', async () => {
  const f = setup();
  const res = await f.route.PATCH(
    request({
      id: 'article',
      status: 'published',
      approvalRequiredCount: 1,
      approvalReviewerIds: [],
    })
  );
  assert.equal(res.status, 200);
  assert.equal(f.saved().status, 'pending_review');
  assert.equal(f.saved().approval_required_count, 2);
  assert.deepEqual(f.saved().approval_reviewer_ids, ['reviewer-1', 'reviewer-2']);
});
test('unassigned reviewers cannot bypass assignment by submitting an empty list', async () => {
  const f = setup({ userId: 'other' });
  assert.equal(
    (await f.route.PATCH(request({ id: 'article', status: 'published', approvalReviewerIds: [] })))
      .status,
    403
  );
  assert.equal(f.saved(), undefined);
});
test('rejection does not add an approval vote', async () => {
  const f = setup({ reviews: [{ userId: 'reviewer-1' }] });
  assert.equal(
    (
      await f.route.PATCH(
        request({ id: 'article', status: 'rejected', rejectReason: 'Needs source' })
      )
    ).status,
    200
  );
  assert.equal(f.saved().status, 'rejected');
  assert.deepEqual(f.saved().approval_reviews, []);
});
test('publication requires enough distinct assigned reviewers', async () => {
  const f = setup({ reviews: [{ userId: 'reviewer-2' }] });
  assert.equal((await f.route.PATCH(request({ id: 'article', status: 'published' }))).status, 200);
  assert.equal(f.saved().status, 'published');
  assert.equal(f.saved().approval_reviews.length, 2);
});
test('malformed null JSON returns validation error', async () => {
  const f = setup();
  assert.equal((await f.route.PATCH(request(null))).status, 400);
});
test('draft articles cannot be reviewed', async () => {
  const f = setup({ status: 'draft' });
  assert.equal((await f.route.PATCH(request({ id: 'article', status: 'published' }))).status, 404);
  assert.equal(f.saved(), undefined);
});

for (const endpoint of [
  'reviewers',
  'reviewers/settings',
  'creators/settings',
  'creator-articles/settings',
]) {
  test(`${endpoint} rejects access without its menu permission`, async () => {
    const checked = [];
    const route = load(`src/app/api/admin/${endpoint}/route.ts`, {
      'src/server/supabase-admin': {
        getSupabaseAdmin() {
          throw Error('Database must not be accessed');
        },
      },
      'src/server/admin-api-auth': {
        verifyAdminAccessToken: async (_token, permission) => {
          checked.push(permission);
          return { ok: false, status: 403, message: 'Forbidden' };
        },
      },
    });
    for (const method of ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']) {
      if (!route[method]) continue;
      const r = new Request('https://local.test/api/admin/' + endpoint, {
        method,
        headers: { Authorization: 'Bearer test' },
      });
      assert.equal((await route[method](r)).status, 403);
    }
    assert.ok(checked.length > 0);
    assert.ok(
      checked.every(
        (permission) => permission === (endpoint.startsWith('reviewers') ? 'reviewers' : 'creators')
      )
    );
  });
}

for (const [status, requestedActive, expectedActive] of [
  ['pending', true, false],
  ['rejected', true, false],
  ['approved', true, true],
  ['approved', false, false],
]) {
  test(`creator ${status} with active=${requestedActive} saves effective active=${expectedActive}`, async () => {
    let accountUpdate;
    const client = {
      from(table) {
        const q = {
          update(value) {
            if (table === 'user') accountUpdate = value;
            return q;
          },
          eq() {
            return q;
          },
          select() {
            return q;
          },
          single: async () => ({
            data: { id: 'profile', user_id: 'account', status },
            error: null,
          }),
          maybeSingle: async () => ({ data: { id: 'account' }, error: null }),
        };
        return q;
      },
    };
    const route = load('src/app/api/admin/creators/route.ts', {
      'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client }) },
      'src/server/admin-api-auth': {
        verifyAdminAccessToken: async () => ({ ok: true, user: { id: 'admin' } }),
      },
      'src/server/creator-auth': {
        getBearerToken: () => '',
        cleanText: (v) => (typeof v === 'string' ? v.trim() : ''),
        mapCreatorProfile: (v) => v,
      },
    });
    const response = await route.PATCH(
      request({ id: 'profile', status, isActive: requestedActive, rejectReason: 'Not eligible' })
    );
    assert.equal(response.status, 200);
    assert.equal(accountUpdate.is_active, expectedActive);
    assert.equal(accountUpdate.role, 'creator');
  });
}
