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
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    filename
  );
  return mod.exports;
}

const { parseCoordinate, isValidCoordinatePair } = load('src/utils/coordinates.ts');

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const styles = require('@mui/material/styles');
function renderMap({ paletteReady, summaryReady }) {
  const palette = { temple: { key: 'temple', label: 'ศาสนสถาน', color: '#123456' } };
  const queries = {
    'category-config': { data: paletteReady ? palette : undefined, isPending: !paletteReady },
    'home-map-paths': {
      data: [
        {
          id: 'TH-44',
          pathData: 'M0,0L10,0L10,10Z',
          province: { iso: 'TH-44', name: 'Maha Sarakham' },
          provinceCenter: { lat: 16, lng: 103 },
        },
      ],
      isLoading: false,
    },
    'province-category-summaries': {
      data: summaryReady
        ? { 'TH-44': { total: 145, counts: { temple: 65 }, dominantCategory: 'temple' } }
        : undefined,
      isPending: !summaryReady,
    },
  };
  const map = load('src/sections/home/view/thailand-map.tsx', {
    '@tanstack/react-query': {
      useQuery: ({ queryKey }) => ({ ...queries[queryKey[1]], isError: false, refetch() {} }),
    },
    '@mui/material/styles': {
      ...styles,
      useTheme: () =>
        styles.createTheme({ palette: { primary: { main: '#293c34', darker: '#111111' } } }),
    },
    'src/routes/hooks': { useRouter: () => ({ push() {} }) },
    'src/components/iconify': { Iconify: () => null },
    'src/components/analytics': { trackAnalyticsEvent() {} },
  }).default;
  const html = renderToStaticMarkup(React.createElement(map));
  const path = html.match(/<path[^>]*aria-label="Select มหาสารคาม"[^>]*>/)?.[0];
  assert.ok(path, 'province outline remains visible while data loads');
  return { html, fill: path.match(/fill="([^"]+)"/)[1] };
}

test('summaries arriving before category colors never display temporary hash colors', () => {
  const result = renderMap({ paletteReady: false, summaryReady: true });
  assert.equal(result.fill, '#e4e8e3');
  assert.match(result.html, /กำลังโหลดข้อมูลแผนที่/);
});

test('category colors arriving before summaries keep the map neutral', () => {
  assert.equal(renderMap({ paletteReady: true, summaryReady: false }).fill, '#e4e8e3');
});

test('the first colored render uses the saved palette and matching legend', () => {
  const result = renderMap({ paletteReady: true, summaryReady: true });
  assert.equal(result.fill, '#123456');
  assert.match(result.html, /ศาสนสถาน/);
  assert.doesNotMatch(result.html, /กำลังโหลดข้อมูลแผนที่/);
});
