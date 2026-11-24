// Comenzile foii pe pânză (ADR 0210 §1, felia 11.1↑c): partea pură, cu valorile pe hârtie.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISTANTA_RAND_PX, INALTIME_RAND_PX, foaiaDeSub, loculRandului, RANDURI_FOAIE, type FoaiePePanza } from '../../src/ui/controaleFoiCalcul.ts';

// Două foi de 300 × 200, la 100 mm una de alta: cea activă la 0, vecina la −400 (ca în `locuriFoi`).
const ACTIVA: FoaiePePanza = { id: 'f2', nume: 'Foaia 2', x: 0, latime: 300, inaltime: 200, piese: 1, activa: true };
const VECINA: FoaiePePanza = { id: 'f1', nume: 'Foaia 1', x: -400, latime: 300, inaltime: 200, piese: 2, activa: false };
const FOI = [VECINA, ACTIVA];

test('foaia de sub cursor: înăuntrul foii, pe margini, între foi și în afara lor', () => {
  assert.equal(foaiaDeSub({ x: 150, y: 100 }, FOI, 2), 'f2');
  assert.equal(foaiaDeSub({ x: -200, y: 100 }, FOI, 2), 'f1');
  // Marginile țin de foaie.
  assert.equal(foaiaDeSub({ x: 0, y: 0 }, FOI, 2), 'f2');
  assert.equal(foaiaDeSub({ x: 300, y: 200 }, FOI, 2), 'f2');
  assert.equal(foaiaDeSub({ x: -100, y: 200 }, FOI, 2), 'f1');
  // Între foi (100 mm de fundal), deasupra și la dreapta: nimic.
  assert.equal(foaiaDeSub({ x: -50, y: 100 }, FOI, 2), null);
  assert.equal(foaiaDeSub({ x: 150, y: 200.01 }, FOI, 2), null);
  assert.equal(foaiaDeSub({ x: 300.01, y: 100 }, FOI, 2), null);
  // Fără cursor (mausul pe o bară sau în afara pânzei): nimic.
  assert.equal(foaiaDeSub(null, FOI, 2), null);
});

test('fâșia de sub foaie, cât rândul comenzilor, ține de ea: pe hârtie, (6 + 34) px la scara vederii', () => {
  // La 2 px pe mm, fâșia are 40 px = 20 mm; la 0,5 px pe mm, 80 mm.
  assert.equal(DISTANTA_RAND_PX + INALTIME_RAND_PX, 40);
  assert.equal(foaiaDeSub({ x: 150, y: -20 }, FOI, 2), 'f2');
  assert.equal(foaiaDeSub({ x: 150, y: -20.01 }, FOI, 2), null);
  assert.equal(foaiaDeSub({ x: -200, y: -80 }, FOI, 0.5), 'f1');
  assert.equal(foaiaDeSub({ x: -200, y: -80.01 }, FOI, 0.5), null);
  // Fâșia e doar sub foaie, nu și pe lângă ea.
  assert.equal(foaiaDeSub({ x: -50, y: -10 }, FOI, 2), null);
  // O scară stricată nu aruncă și nu alege nimic.
  assert.equal(foaiaDeSub({ x: 150, y: 100 }, FOI, 0), null);
  assert.equal(foaiaDeSub({ x: 150, y: 100 }, FOI, Number.NaN), null);
});

test('locul rândului pe ecran: la stânga foii, la 6 px sub marginea ei de jos', () => {
  // Vederea: 2 px pe mm, originea foii active la (500, 700) px; Y-ul ecranului crește în jos, deci y = 0 e la 700.
  const v = { scara: 2, tx: 500, ty: 700 };
  assert.deepEqual(loculRandului(ACTIVA, v), { stanga: 500, sus: 706 });
  // Vecina, la −400 mm: cu 800 px mai la stânga, la aceeași înălțime.
  assert.deepEqual(loculRandului(VECINA, v), { stanga: -300, sus: 706 });
});

test('rândurile registrului sunt cele cinci ale meniului foii, în ordinea lui, cu ștergerea la capăt', () => {
  assert.deepEqual(RANDURI_FOAIE.map(([id]) => id), ['foaie.duplica', 'foaie.duplica-legat', 'foaie.muta-sus', 'foaie.muta-jos', 'foaie.sterge']);
  assert.deepEqual(RANDURI_FOAIE.map(([, e]) => e), [
    'actiune.foaie-duplica', 'actiune.foaie-duplica-legat', 'actiune.foaie-muta-sus', 'actiune.foaie-muta-jos', 'actiune.foaie-sterge',
  ]);
});
