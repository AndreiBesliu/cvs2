import { test } from 'node:test';
import assert from 'node:assert/strict';
import { licentaDin, licentaPermisa } from '../../scripts/licente.ts';

test('licențele permisive trec', () => {
  for (const l of ['MIT', 'ISC', 'Apache-2.0', 'BSD-3-Clause', '0BSD']) assert.equal(licentaPermisa(l), true, l);
});

test('copyleft-ul, licența necunoscută și lipsa ei sunt refuzate', () => {
  for (const l of ['GPL-3.0', 'AGPL-3.0-only', 'LGPL-2.1', 'SSPL-1.0', 'UNLICENSED', '', undefined]) {
    assert.equal(licentaPermisa(l), false, String(l));
  }
});

test('expresiile SPDX: OR cere una permisă, AND le cere pe toate', () => {
  assert.equal(licentaPermisa('(MIT OR Apache-2.0)'), true);
  assert.equal(licentaPermisa('(MIT OR GPL-3.0)'), true);
  assert.equal(licentaPermisa('MIT AND GPL-3.0'), false);
  assert.equal(licentaPermisa('(MIT AND BSD-3-Clause)'), true);
});

test('licența se citește și din forma veche, cu listă', () => {
  assert.equal(licentaDin({ license: 'MIT' }), 'MIT');
  assert.equal(licentaDin({ licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }] }), 'MIT OR Apache-2.0');
  assert.equal(licentaDin({ license: { type: 'ISC' } }), 'ISC');
  assert.equal(licentaDin({}), undefined);
});
