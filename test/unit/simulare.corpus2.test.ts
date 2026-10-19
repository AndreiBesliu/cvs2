import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cazul } from '../oracles/simulare.cazuri.ts';
import { bucatiCaz, PIESE_2, verificariNucleu } from './ajutor-simulare.ts';

/** A doua jumătate a corpusului (vezi `simulare.corpus.test.ts`). */
for (const id of PIESE_2) {
  const c = cazul(id);
  test(`nucleul pe ${id}: ${c.descriere}`, () => {
    assert.deepEqual(verificariNucleu(c, bucatiCaz(c)), []);
  });
}
