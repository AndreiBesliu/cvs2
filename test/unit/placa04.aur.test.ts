/**
 * Programele plăcii 4 comise (`docs/etape/placa-04.md`): exact cele generate, octet cu octet, câte unul pe freză. Cotele lor,
 * prezise de oracolul simulării, le probează `placa04.test.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fisiere } from '../placi/placa-04/genereaza.ts';

test('programele plăcii 4 sunt cele de aur, octet cu octet; câte unul pe freză, sub 300 de linii', () => {
  const f = fisiere();
  assert.deepEqual(f.map((x) => x.nume), ['placa-04-T1.nc', 'placa-04-T2.nc', 'placa-04-T3.nc', 'placa-04-T4.nc']);
  for (const x of f) {
    assert.equal(readFileSync(new URL(`../placi/placa-04/${x.nume}`, import.meta.url), 'ascii'), x.text, `${x.nume}: rulează node test/placi/placa-04/genereaza.ts`);
    assert.ok(x.text.split('\n').length < 300);
  }
});
