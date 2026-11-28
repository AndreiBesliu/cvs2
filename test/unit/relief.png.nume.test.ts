/** Numele fișierului reliefului pe 16 biți (ADR 0322): fără extensia imaginii, fără caracterele oprite, cu `-16bit.png`. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numePng } from '../../src/app/reliefPng.ts';

test('numele PNG-ului: numele reliefului, curățat', () => {
  assert.equal(numePng('logo-cvs.png'), 'logo-cvs-16bit.png');
  assert.equal(numePng('a/b:c*d'), 'a-b-c-d-16bit.png');
  assert.equal(numePng('   '), 'relief-16bit.png');
  assert.equal(numePng('medalion'), 'medalion-16bit.png');
  assert.equal(numePng('medalion-16bit'), 'medalion-16bit.png');
  assert.equal(numePng('medalion-16bit.png'), 'medalion-16bit.png');
});
