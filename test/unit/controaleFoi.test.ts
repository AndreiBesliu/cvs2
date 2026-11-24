// Comenzile foii pe pânză (ADR 0210 §1, felia 11.1↑c): partea pură, cu valorile pe hârtie.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUTOANE_RAND, DISTANTA_RAND_PX, INALTIME_RAND_PX, felRand, foaiaDeSub, latimeRand, loculRandului, RANDURI_FOAIE, stangaInPanza, type FoaiePePanza,
} from '../../src/ui/controaleFoiCalcul.ts';

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

test('lățimea rândului, pe hârtie: n butoane, câte 2 px între ele, 3 px de fiecare margine (umplutura și bordura)', () => {
  assert.equal(BUTOANE_RAND, 7);
  // 7 butoane de 28 px: 196 + 6 × 2 + 2 × 3 = 214; de 48 px (densitatea mare): 336 + 12 + 6 = 354.
  assert.equal(latimeRand(7, 28), 214);
  assert.equal(latimeRand(7, 48), 354);
  // Un singur buton: 28 + 6 = 34; 48 + 6 = 54.
  assert.equal(latimeRand(1, 28), 34);
  assert.equal(latimeRand(1, 48), 54);
});

test('rândul nu trece de lățimea foii lui: întreg cât încape, strâns într-un buton sub ea, ascuns sub un buton (capturile owner-ului din 24.11)', () => {
  // Foaia de 300 mm la 2 px pe mm are 600 px: rândul de 214 px încape.
  assert.equal(felRand(600, 28), 'intreg');
  // Granița: exact cât rândul întreg, încă întreg; cu un pixel mai puțin, strâns.
  assert.equal(felRand(214, 28), 'intreg');
  assert.equal(felRand(213.99, 28), 'strans');
  // Capturile: foaia de ~172 px, cu butoane de 48 px (rândul întreg, 354 px): strâns, nu peste foaia vecină.
  assert.equal(felRand(172, 48), 'strans');
  assert.equal(felRand(354, 48), 'intreg');
  assert.equal(felRand(353, 48), 'strans');
  // Sub lățimea unui buton cu marginile lui, rândul nu se arată.
  assert.equal(felRand(34, 28), 'strans');
  assert.equal(felRand(33.9, 28), 'ascuns');
  assert.equal(felRand(54, 48), 'strans');
  assert.equal(felRand(53, 48), 'ascuns');
  // Valori stricate: nimic.
  assert.equal(felRand(0, 28), 'ascuns');
  assert.equal(felRand(Number.NaN, 28), 'ascuns');
  assert.equal(felRand(600, 0), 'ascuns');
});

test('un rând deschis peste lățimea foii rămâne în pânză: nu iese în dreapta, nici în stânga', () => {
  // Pânza de 800 px, rândul de 354: la 100 px încape; la 600 ar ieși (954 > 796): se trage la 800 − 354 − 4 = 442.
  assert.equal(stangaInPanza(100, 354, 800), 100);
  assert.equal(stangaInPanza(600, 354, 800), 442);
  assert.equal(stangaInPanza(442, 354, 800), 442);
  // În stânga, cel puțin la 4 px de margine; o pânză mai îngustă decât rândul îl ține la stânga.
  assert.equal(stangaInPanza(-50, 354, 800), 4);
  assert.equal(stangaInPanza(100, 354, 300), 4);
  // Fără măsuri (înainte de prima măsurare), locul rămâne cel al foii.
  assert.equal(stangaInPanza(600, 0, 800), 600);
  assert.equal(stangaInPanza(600, 354, 0), 600);
});
