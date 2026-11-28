/**
 * Calculatorul avansului (ADR 0305 §4, felia 16.A↑g-3): turația din viteza de așchiere și diametru, n = Vc · 1000 / (π · D),
 * rotunjită la 10 rot/min; fără Vc, turația de acum; avansul F = n · z · fz, rotunjit la 1 mm/min. Fără tăișuri sau cu un
 * rezultat în afara marginilor frezei, motivul, fără rezultat. Valorile de mai jos sunt socotite de mână.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculeazaAvans, MARGINI_FZ, MARGINI_VC } from '../../src/model/calculatorAvans.ts';

test('cu Vc: turația din diametru, la 10 rot/min; avansul din tăișuri și fz, la 1 mm/min', () => {
  // 300 000 / (π · 6) = 15 915,49… → 15 920; 15 920 · 2 · 0,05 = 1 592.
  assert.deepEqual(calculeazaAvans({ diametru: 6, taisuri: 2, fz: 0.05, vc: 300, turatie: 18000 }), { ok: true, turatie: 15920, avans: 1592 });
  // 200 000 / (π · 3,175) = 20 050,8… → 20 050; 20 050 · 1 · 0,03 = 601,5 → 602.
  assert.deepEqual(calculeazaAvans({ diametru: 3.175, taisuri: 1, fz: 0.03, vc: 200, turatie: 18000 }), { ok: true, turatie: 20050, avans: 602 });
  // 500 000 / (π · 12) = 13 262,9… → 13 260; 13 260 · 3 · 0,1 = 3 978.
  assert.deepEqual(calculeazaAvans({ diametru: 12, taisuri: 3, fz: 0.1, vc: 500, turatie: 1 }), { ok: true, turatie: 13260, avans: 3978 });
});

test('fără Vc: turația de acum rămâne, avansul din ea', () => {
  assert.deepEqual(calculeazaAvans({ diametru: 6, taisuri: 2, fz: 0.1, vc: null, turatie: 18000 }), { ok: true, turatie: 18000, avans: 3600 });
  // 12 345 · 1 · 0,0333 = 411,0885 → 411.
  assert.deepEqual(calculeazaAvans({ diametru: Number.NaN, taisuri: 1, fz: 0.0333, vc: null, turatie: 12345 }), { ok: true, turatie: 12345, avans: 411 });
});

test('motivele: tăișurile, fz, Vc, diametrul, turația de acum, rezultatele în afara marginilor', () => {
  assert.deepEqual(calculeazaAvans({ diametru: 6, taisuri: undefined, fz: 0.05, vc: 300, turatie: 18000 }), { ok: false, motiv: 'taisuri' });
  assert.deepEqual(calculeazaAvans({ diametru: 6, taisuri: 0, fz: 0.05, vc: 300, turatie: 18000 }), { ok: false, motiv: 'taisuri' });
  assert.deepEqual(calculeazaAvans({ diametru: 6, taisuri: 2.5, fz: 0.05, vc: 300, turatie: 18000 }), { ok: false, motiv: 'taisuri' });
  assert.deepEqual(calculeazaAvans({ diametru: 6, taisuri: 2, fz: 0, vc: 300, turatie: 18000 }), { ok: false, motiv: 'fz' });
  assert.deepEqual(calculeazaAvans({ diametru: 6, taisuri: 2, fz: MARGINI_FZ + 0.001, vc: 300, turatie: 18000 }), { ok: false, motiv: 'fz' });
  assert.deepEqual(calculeazaAvans({ diametru: 6, taisuri: 2, fz: Number.NaN, vc: 300, turatie: 18000 }), { ok: false, motiv: 'fz' });
  assert.deepEqual(calculeazaAvans({ diametru: 6, taisuri: 2, fz: 0.05, vc: 0, turatie: 18000 }), { ok: false, motiv: 'vc' });
  assert.deepEqual(calculeazaAvans({ diametru: 6, taisuri: 2, fz: 0.05, vc: MARGINI_VC + 1, turatie: 18000 }), { ok: false, motiv: 'vc' });
  assert.deepEqual(calculeazaAvans({ diametru: Number.NaN, taisuri: 2, fz: 0.05, vc: 300, turatie: 18000 }), { ok: false, motiv: 'diametru' });
  assert.deepEqual(calculeazaAvans({ diametru: 6, taisuri: 2, fz: 0.05, vc: null, turatie: Number.NaN }), { ok: false, motiv: 'turatie' });
  assert.deepEqual(calculeazaAvans({ diametru: 6, taisuri: 2, fz: 0.05, vc: null, turatie: 1000.5 }), { ok: false, motiv: 'turatie' });
  // 500 000 / (π · 0,5) = 318 309,9 → peste 100 000 rot/min.
  assert.deepEqual(calculeazaAvans({ diametru: 0.5, taisuri: 2, fz: 0.01, vc: 500, turatie: 18000 }), { ok: false, motiv: 'margini-turatie' });
  // 100 000 · 12 · 0,1 = 120 000 → peste 100 000 mm/min.
  assert.deepEqual(calculeazaAvans({ diametru: 6, taisuri: 12, fz: 0.1, vc: null, turatie: 100000 }), { ok: false, motiv: 'margini-avans' });
  // Un rezultat rotunjit la 0 (o turație mică, un fz mic) nu e un avans.
  assert.deepEqual(calculeazaAvans({ diametru: 6, taisuri: 1, fz: 0.001, vc: null, turatie: 10 }), { ok: false, motiv: 'margini-avans' });
});
