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

function browser() {
  const events = new EventTarget();
  const storage = () => {
    const values = new Map();
    return {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
      values,
    };
  };
  return {
    localStorage: storage(),
    sessionStorage: storage(),
    location: { pathname: '/' },
    dispatchEvent: (event) => events.dispatchEvent(event),
    addEventListener: (...args) => events.addEventListener(...args),
  };
}
test('cookie choice defaults to no analytics and requires a current explicit choice', () => {
  global.window = browser();
  try {
    const preferences = load('src/lib/cookie-preferences');
    assert.equal(preferences.readCookiePreference(), null);
    window.localStorage.setItem('thch_cookie_consent', 'accepted');
    assert.equal(preferences.readCookiePreference(), null);
    preferences.saveCookiePreference('all');
    assert.equal(preferences.readCookiePreference(), 'all');
  } finally {
    delete global.window;
  }
});
test('withdrawal removes analytics identifiers but preserves authentication and notifies listeners', () => {
  global.window = browser();
  try {
    const preferences = load('src/lib/cookie-preferences');
    window.localStorage.setItem('thch_visitor_id', 'visitor');
    window.sessionStorage.setItem('thch_session_id', 'session');
    window.localStorage.setItem('auth-token', 'keep');
    let events = 0;
    window.addEventListener(preferences.COOKIE_PREFERENCE_EVENT, () => events++);
    preferences.saveCookiePreference('necessary');
    assert.equal(window.localStorage.getItem('thch_visitor_id'), null);
    assert.equal(window.sessionStorage.getItem('thch_session_id'), null);
    assert.equal(window.localStorage.getItem('auth-token'), 'keep');
    assert.equal(events, 1);
  } finally {
    delete global.window;
  }
});
test('blocked browser storage fails closed for analytics', () => {
  global.window = browser();
  try {
    window.localStorage.getItem = () => {
      throw Error('blocked');
    };
    const preferences = load('src/lib/cookie-preferences');
    assert.equal(preferences.readCookiePreference(), null);
  } finally {
    delete global.window;
  }
});
test('tracking cannot send events or create visitor identifiers before consent or after withdrawal', () => {
  global.window = browser();
  try {
    const track = load('src/components/analytics/track-event');
    track.trackAnalyticsEvent('test', 'before consent');
    track.trackAnalyticsPageView({ path: '/' });
    assert.equal(window.localStorage.getItem('thch_visitor_id'), null);
    assert.equal(window.sessionStorage.getItem('thch_session_id'), null);
    assert.equal(track.shouldSkipAnalytics(), true);
    window.localStorage.setItem('thch_cookie_consent_v2', 'all');
    assert.equal(track.shouldSkipAnalytics(), false);
    window.location.pathname = '/admin/users';
    assert.equal(track.shouldSkipAnalytics(), true);
    window.location.pathname = '/';
    window.localStorage.setItem('thch_cookie_consent_v2', 'necessary');
    track.trackAnalyticsEvent('test', 'withdrawn');
    assert.equal(track.shouldSkipAnalytics(), true);
  } finally {
    delete global.window;
  }
});
