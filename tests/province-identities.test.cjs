const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const identities = require('../data/province-identities/identities.json');

test('identity directory covers all canonical provinces and keeps source attribution', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/data/thailand-culture/provinces.ts'), 'utf8');
  const codes = [...source.matchAll(/code: '(TH-\d+)'/g)].map(match => match[1]);
  assert.equal(identities.length, 77);
  assert.deepEqual(identities.map(item => item.code).sort(), codes.sort());
  for (const item of identities) {
    assert.ok(item.motto && item.motto.length < 1000);
    assert.match(item.sealUrl, /^https:\/\/upload.wikimedia.org\/wikipedia\/commons\//);
    assert.match(item.sealSourceUrl, /^https:\/\/commons.wikimedia.org\/wiki\/File:/);
    assert.match(item.sourceUrl, /^https:\/\//);
    if (item.colorsStatus === 'verified') {
      assert.ok(item.colors.length > 0);
      assert.match(item.colorsSourceUrl, /^https:\/\//);
    } else assert.deepEqual(item.colors, []);
  }
});
test('Maha Sarakham colours cite primary documentation and do not imply official HEX specifications', () => {
  const item = identities.find(row => row.code === 'TH-44');
  assert.deepEqual(item.colors.map(color => color.name), ['น้ำตาล', 'เหลือง']);
  assert.equal(item.colorsStatus, 'verified');
  assert.match(item.colorsSourceUrl, /mvc\.ac\.th/);
});

test('all province seals are served from validated local assets without runtime external requests', () => {
  const seals = require('../data/province-identities/local-seals.json');
  assert.equal(Object.keys(seals).length, 77);
  for (const item of identities) {
    const url = seals[item.code];
    assert.match(url, /^\/assets\/province-seals\/TH-\d+\.(svg|png|jpe?g|webp)$/);
    const data = fs.readFileSync(path.join(__dirname, '../public', url));
    assert.ok(data.length > 100);
    if (url.endsWith('.svg')) assert.ok(data.toString().includes('<svg'));
    else if (url.endsWith('.webp')) assert.equal(data.toString('ascii', 8, 12), 'WEBP');
    else assert.ok(data.subarray(0, 4).equals(Buffer.from([137, 80, 78, 71])) || data.subarray(0, 2).equals(Buffer.from([255, 216])));
  }
});
