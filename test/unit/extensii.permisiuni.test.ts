/**
 * Ordinea permisiunilor în „Ce poate face” (ADR 0232 §B.6): după cât de sensibile sunt, cu mașina prima, oricum le-ar înșira
 * manifestul. O permisiune pe care lista nu o știe rămâne la urmă, în ordinea ei (nu dispare).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG_PERMISIUNI, dupaSensibilitate, PERMISIUNI_SENSIBILE } from '../../src/extensii/pachet.ts';

test('permisiunile se înșiră după cât de sensibile sunt: mașina, formele, contul, descărcările, datele', () => {
  assert.deepEqual(dupaSensibilitate(['stocare', 'descarcari', 'masina', 'cont', 'forme']), ['masina', 'forme', 'cont', 'descarcari', 'stocare']);
  assert.deepEqual(dupaSensibilitate(['stocare', 'cont']), ['cont', 'stocare']);
  assert.deepEqual(dupaSensibilitate(['forme', 'masina']), ['masina', 'forme']);
  assert.deepEqual(dupaSensibilitate([]), []);
});

test('o permisiune necunoscută listei rămâne la urmă, în ordinea ei; lista primită nu se schimbă', () => {
  const primite = ['zeta', 'stocare', 'alfa', 'masina'];
  assert.deepEqual(dupaSensibilitate(primite), ['masina', 'stocare', 'zeta', 'alfa']);
  assert.deepEqual(primite, ['zeta', 'stocare', 'alfa', 'masina']);
});

test('fiecare permisiune din catalog are locul ei în ordine; mașina e cea marcată ca sensibilă', () => {
  const ordonate = dupaSensibilitate(CATALOG_PERMISIUNI);
  assert.equal(ordonate.length, CATALOG_PERMISIUNI.length);
  assert.deepEqual([...ordonate].sort(), [...CATALOG_PERMISIUNI].sort());
  assert.equal(ordonate[0], 'masina');
  assert.deepEqual([...PERMISIUNI_SENSIBILE], ['masina']);
  // O permisiune nouă în catalog își primește locul anume, nu ajunge la urmă din întâmplare.
  for (const p of CATALOG_PERMISIUNI) assert.ok(dupaSensibilitate([p, 'necunoscuta'])[0] === p, p);
});
