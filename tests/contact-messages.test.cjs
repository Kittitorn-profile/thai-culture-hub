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
function fixture({ permitted = true, fail = false } = {}) {
  const calls = [];
  let inserted;
  const client = {
    from(table) {
      calls.push(['from', table]);
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          calls.push(['eq', k, v]);
          return q;
        },
        neq(k, v) {
          calls.push(['neq', k, v]);
          return q;
        },
        order() {
          return q;
        },
        limit() {
          return q;
        },
        insert(value) {
          inserted = value;
          return q;
        },
        update(value) {
          calls.push(['update', value]);
          return q;
        },
        maybeSingle() {
          return Promise.resolve({
            data: { id: 'message-id', status: 'reviewed' },
            error: fail ? {} : null,
          });
        },
        then(resolve, reject) {
          return Promise.resolve({ data: [], error: fail ? {} : null }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  return {
    calls,
    get inserted() {
      return inserted;
    },
    mocks: {
      'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: true, client }) },
      'src/server/admin-api-auth': {
        verifyAdminAccessToken: async () =>
          permitted
            ? { ok: true, user: { role: 'admin' } }
            : { ok: false, status: 403, message: 'Forbidden' },
      },
    },
  };
}
const valid = {
  name: 'ผู้ติดต่อ',
  email: 'test@example.com',
  phone: '0812345678',
  area: 'ขอนแก่น',
  message: 'ข้อมูลสถานที่ควรปรับปรุง',
};
const request = (body) => ({ json: async () => body, headers: new Headers() });
test('contact form saves its sender, area and message with a server-controlled source/status', async () => {
  const db = fixture();
  const response = await load('src/app/api/contact-messages/route.ts', db.mocks).POST(
    request({ ...valid, path: '/admin', status: 'archived' })
  );
  assert.equal(response.status, 201);
  assert.equal(db.inserted.path, '/contact-us');
  assert.equal(db.inserted.status, 'new');
  assert.equal(db.inserted.name, valid.name);
  assert.equal(db.inserted.contact, `${valid.email}\nโทร: ${valid.phone}`);
  assert.match(db.inserted.message, /พื้นที่: ขอนแก่น/);
  assert.match(db.inserted.message, /ข้อมูลสถานที่/);
});
test('invalid contact submissions never reach storage', async () => {
  const db = fixture();
  const { POST } = load('src/app/api/contact-messages/route.ts', db.mocks);
  for (const body of [null, {}, { ...valid, email: 'invalid' }, { ...valid, message: ' ' }])
    assert.equal((await POST(request(body))).status, 400);
  assert.equal(db.calls.length, 0);
});
test('storage failures cannot be reported as successful sends', async () => {
  const db = fixture({ fail: true });
  assert.equal(
    (await load('src/app/api/contact-messages/route.ts', db.mocks).POST(request(valid))).status,
    500
  );
});
test('admin contact inbox is protected and scoped to the contact form', async () => {
  const denied = fixture({ permitted: false });
  const a = load('src/app/admin/feedback/actions.ts', denied.mocks);
  assert.equal((await a.getFeedbackAction('token', true)).status, 403);
  assert.equal(
    (await a.updateFeedbackStatusAction('token', 'message-id', 'reviewed', true)).status,
    403
  );
  assert.equal(denied.calls.length, 0);
  const db = fixture();
  await load('src/app/admin/feedback/actions.ts', db.mocks).getFeedbackAction('token', true);
  assert.ok(
    db.calls.some((call) => call[0] === 'eq' && call[1] === 'path' && call[2] === '/contact-us')
  );
});
test('status changes are validated and cannot update other message sources', async () => {
  const db = fixture();
  const a = load('src/app/admin/feedback/actions.ts', db.mocks);
  assert.equal(
    (await a.updateFeedbackStatusAction('token', 'message-id', 'invalid', true)).status,
    400
  );
  assert.equal(db.calls.length, 0);
  assert.equal(
    (await a.updateFeedbackStatusAction('token', 'message-id', 'reviewed', true)).ok,
    true
  );
  assert.ok(
    db.calls.some((call) => call[0] === 'eq' && call[1] === 'path' && call[2] === '/contact-us')
  );
});
