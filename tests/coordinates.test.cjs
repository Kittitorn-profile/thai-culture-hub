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

const { parseCoordinate, isValidCoordinatePair } = load('src/utils/coordinates.ts');
test('missing coordinates never become zero', () => {
  for (const value of [null, undefined, '', '   ', '-', false, [], {}])
    assert.equal(parseCoordinate(value), null);
});
test('accepts decimal latitude and longitude strings', () => {
  assert.equal(parseCoordinate(' 16.1845 '), 16.1845);
  assert.equal(parseCoordinate('103.3017'), 103.3017);
  assert.equal(isValidCoordinatePair(16.1845, 103.3017), true);
});
test('rejects non-numeric, infinite, zero and out-of-range locations', () => {
  for (const [lat, lng] of [
    [null, 103],
    ['', 103],
    [0, 0],
    [NaN, 103],
    [Infinity, 103],
    [91, 103],
    [16, 181],
    ['16abc', 103],
  ])
    assert.equal(isValidCoordinatePair(lat, lng), false);
});
