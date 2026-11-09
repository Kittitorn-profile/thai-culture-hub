import test from 'node:test';
import assert from 'node:assert/strict';

import { SOURCE_KEYS, datasetVisibilitySchema, isDatasetEnabled, normalizeHiddenSources, isPublicPlaceVisible } from '../src/lib/dataset-visibility.ts';

test('settings accept source identifiers and reject invalid input', () => {
  assert.deepEqual(datasetVisibilitySchema.parse({ hidden: ['tat', 'finearts_museum'] }), { hidden: ['tat', 'finearts_museum'] });
  assert.equal(datasetVisibilitySchema.safeParse({ hidden: ['unknown-source'] }).success, false);
  assert.equal(datasetVisibilitySchema.safeParse({ hidden: 'tat' }).success, false);
});
test('hiding TAT removes only TAT records irrespective of their category', () => {
  const records = [{ source: 'tat', category: 'temple' }, { source: 'religious_places', category: 'temple' }, { source: 'tat', category: 'local_food' }];
  assert.deepEqual(records.filter((record) => isPublicPlaceVisible(record.source, ['tat'])), [records[1]]);
  assert.equal(isDatasetEnabled('places', ['tat']), true);
});
test('imported and original product/fabric/ethnic datasets share source controls', () => {
  for (const [group, source] of [['products', 'cpot_products'], ['fabric', 'thai_fabric_wisdom']]) {
    assert.equal(isDatasetEnabled(group, [source]), false);
    assert.equal(isPublicPlaceVisible(source, [source]), false);
    assert.equal(isDatasetEnabled(group, []), true);
    assert.equal(isPublicPlaceVisible(source, []), true);
  }
  assert.equal(isDatasetEnabled('ethnic', ['ethnic_groups']), true);
  assert.equal(isDatasetEnabled('ethnic', ['ethnic_groups', 'ethnic_supplements']), false);
});
test('craft and community pages remain visible while any constituent source is enabled', () => {
  assert.equal(isDatasetEnabled('crafts', ['thai_fabric_wisdom']), true);
  assert.equal(isDatasetEnabled('community', ['community_weaving']), true);
  assert.equal(isDatasetEnabled('community', ['community_weaving', 'community_crafts']), false);
  assert.equal(isDatasetEnabled('crafts', ['community_weaving', 'community_crafts', 'thai_fabric_wisdom']), false);
});
test('local records can be hidden without affecting imported sources', () => {
  assert.equal(isPublicPlaceVisible(null, ['local']), false);
  assert.equal(isPublicPlaceVisible(undefined, ['local']), false);
  assert.equal(isPublicPlaceVisible('local', ['local']), false);
  assert.equal(isPublicPlaceVisible('tat', ['local']), true);
});
test('old saved group settings migrate to explicit source IDs without data deletion', () => {
  const hidden = normalizeHiddenSources(['artists', 'products', 'tat', 'tat']);
  assert.deepEqual(hidden, ['artists_registry', 'cpot_products', 'tat']);
  assert.equal(isDatasetEnabled('artists', hidden), false);
  assert.equal(isDatasetEnabled('artists', []), true);
});
test('disabling all known sources hides all collections and re-enabling restores them', () => {
  for (const group of ['places', 'artists', 'heritage', 'community', 'ethnic', 'products', 'crafts']) {
    assert.equal(isDatasetEnabled(group, SOURCE_KEYS), false);
    assert.equal(isDatasetEnabled(group, []), true);
  }
});
