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
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    filename
  );
  return mod.exports;
}

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function heroDatabase(content, error = null) {
  const query = {
    select: () => query,
    eq: (key, value) => {
      assert.equal(key, 'section_key');
      assert.equal(value, 'hero-images');
      return query;
    },
    abortSignal: () => query,
    maybeSingle: async () => ({ data: { content }, error }),
  };
  return { getSupabaseAdmin: () => ({ ok: true, client: { from: () => query } }) };
}
test('first render receives published active images directly from the database', async () => {
  const images = [
    { id: 'published', imageUrl: 'https://example.com/live.jpg', alt: 'ภาพจริง', isActive: true },
    { id: 'inactive', imageUrl: 'https://example.com/hidden.jpg', alt: 'ซ่อน', isActive: false },
  ];
  const loader = load('src/server/home-hero', {
    'src/server/supabase-admin': heroDatabase({ images }),
  });
  assert.deepEqual(await loader.getPublishedHomeHeroImages(), [images[0]]);
  const page = load('src/app/(home)/page', {
    'src/server/home-hero': { getPublishedHomeHeroImages: async () => [images[0]] },
    'src/sections/home/view': { HomeView: () => null },
  });
  assert.equal(page.dynamic, 'force-dynamic');
  assert.deepEqual((await page.default()).props.heroImages, [images[0]]);
});
test('empty, disabled or invalid published settings never replace them with the old default image', async () => {
  for (const content of [
    undefined,
    {},
    { images: [] },
    {
      images: [{ id: 'off', imageUrl: 'https://example.com/off.jpg', alt: 'ปิด', isActive: false }],
    },
  ]) {
    const loader = load('src/server/home-hero', {
      'src/server/supabase-admin': heroDatabase(content),
    });
    assert.deepEqual(await loader.getPublishedHomeHeroImages(), []);
  }
  const loader = load('src/server/home-hero', {
    'src/server/supabase-admin': { getSupabaseAdmin: () => ({ ok: false }) },
  });
  assert.deepEqual(await loader.getPublishedHomeHeroImages(), []);
});
test('hero renders the supplied image immediately and has no default image while empty', () => {
  const { HomeHeroSection } = load('src/sections/home/components/home-hero-section', {
    'src/routes/components': { RouterLink: (props) => React.createElement('a', props) },
  });
  const image = {
    id: 'actual',
    imageUrl: 'https://example.com/current.jpg',
    alt: 'ภาพปัจจุบัน',
    isActive: true,
  };
  const html = renderToStaticMarkup(React.createElement(HomeHeroSection, { images: [image] }));
  assert.ok(html.includes(image.imageUrl));
  assert.ok(!html.includes('/assets/th-hub/hub-bg.png'));
  const empty = renderToStaticMarkup(React.createElement(HomeHeroSection));
  assert.ok(!empty.includes('/assets/th-hub/hub-bg.png'));
});
function renderHeader(auth, profile) {
  const { CultureHeader } = load('src/layouts/main/culture-header', {
    'src/auth/hooks': { useAuthContext: () => auth },
    '@tanstack/react-query': {
      useQuery: ({ queryKey }) => {
        assert.equal(queryKey[1], auth.user?.id);
        return profile;
      },
      useQueryClient: () => ({}),
    },
    'src/components/logo': { Logo: () => React.createElement('div', null, 'logo') },
    'src/routes/components': { RouterLink: (props) => React.createElement('a', props) },
    'src/sections/creator/creator-api': {},
    'src/utils/creator-avatar': { getCreatorAvatarUrl: () => '' },
    'src/layouts/components/account-popover': {
      AccountPopover: ({ account }) =>
        React.createElement('div', { 'data-account': 'ready' }, account?.displayName),
    },
    'src/layouts/nav-config-account': { _account: [], _accountCreator: [] },
  });
  return renderToStaticMarkup(React.createElement(CultureHeader, { pathname: '/' }));
}
test('header waits for the auth session instead of flashing login controls', () => {
  const html = renderHeader({ user: null, loading: true }, { isPending: false });
  assert.ok(html.includes('กำลังตรวจสอบบัญชี'));
  assert.ok(!html.includes('เข้าสู่ระบบ'));
  assert.ok(!html.includes('ลงทะเบียน'));
  const guest = renderHeader({ user: null, loading: false }, { isPending: false });
  assert.ok(guest.includes('เข้าสู่ระบบ'));
  assert.ok(!guest.includes('กำลังตรวจสอบบัญชี'));
});
test('creator account waits for its own profile and does not show an older auth display name', () => {
  const user = {
    id: 'creator-123',
    role: 'creator',
    accessToken: 'token',
    displayName: 'OLD AUTH NAME',
  };
  const pending = renderHeader({ user, loading: false }, { isPending: true });
  assert.ok(pending.includes('กำลังตรวจสอบบัญชี'));
  assert.ok(!pending.includes('OLD AUTH NAME'));
  assert.ok(!pending.includes('data-account'));
  const ready = renderHeader(
    { user, loading: false },
    {
      isPending: false,
      data: {
        data: { id: 'profile-123', displayName: 'ชื่อที่บันทึกจริง', email: 'member@example.com' },
      },
    }
  );
  assert.ok(ready.includes('ชื่อที่บันทึกจริง'));
  assert.ok(!ready.includes('กำลังตรวจสอบบัญชี'));
  assert.ok(!ready.includes('OLD AUTH NAME'));
});
