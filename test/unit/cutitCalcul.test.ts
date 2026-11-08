/**
 * Unealta Cuțit (ADR 0181 §1; felia 10.3↑f), partea pură (`src/app/cutitCalcul.ts`): formele de tăiat (răspunsul 2a: cele
 * alese, sau, fără alegere, toate de pe foaie; niciodată cuțitul), urma mâinii libere (un punct nou doar la un pixel de ultimul),
 * calea cuțitului din urmă (prea scurtă: nimic), calea Pen-ului mutată pe foaie (cu mânerele) și locurile aproximative arătate
 * cât tragi (pătratul trecut de o linie oblică: două locuri, pe laturi).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adaugaLaUrma, bucataSub, caleCutit, caleDinPen, conturAproximat, cutiePuncte, esteModCutit, locuriAproximative, locuriComune, lungimeUrma,
  selectieDupa, subPolilinie, tinteCutit,
} from '../../src/app/cutitCalcul.ts';
import { docDin, ID } from './ajutor-document.ts';

const stoc = { latime: 1000, inaltime: 1000, grosime: 18 };
const patrat = (id: string, x: number, y: number) => ({ id, forma: { tip: 'dreptunghi' as const, latime: 100, inaltime: 100, razaColt: 0 }, matrice: { ...ID, e: x, f: y } });

test('formele de tăiat: cele alese fără cuțit; fără alegere, toate ale foii fără cuțit (răspunsul 2a)', () => {
  const d = docDin(stoc, patrat('a', 0, 0), patrat('b', 200, 0), patrat('k', 400, 0));
  assert.deepEqual(tinteCutit(d, ['a'], []), ['a']);
  assert.deepEqual(tinteCutit(d, ['a', 'k'], ['k']), ['a'], 'cuțitul ales nu se taie');
  assert.deepEqual(tinteCutit(d, [], []), ['a', 'b', 'k'], 'fără alegere, toate');
  assert.deepEqual(tinteCutit(d, [], ['k']), ['a', 'b'], 'fără alegere, toate, fără cuțit');
  assert.deepEqual(tinteCutit(d, ['k'], ['k']), [], 'doar cuțitul ales: nimic de tăiat');
});

test('urma mâinii libere: un punct nou doar la cel puțin un pas de ultimul; lungimea ei', () => {
  let u = adaugaLaUrma([], { x: 0, y: 0 }, 1);
  u = adaugaLaUrma(u, { x: 0.5, y: 0 }, 1);
  assert.equal(u.length, 1, 'prea aproape: nu intră');
  u = adaugaLaUrma(u, { x: 3, y: 4 }, 1);
  assert.deepEqual(u, [{ x: 0, y: 0 }, { x: 3, y: 4 }]);
  assert.equal(lungimeUrma(u), 5);
});

test('calea cuțitului din urmă: linii, punctele repetate sărite; prea scurtă, nimic', () => {
  const c = caleCutit([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }], 1);
  assert.ok(c);
  assert.equal(c.inchis, false);
  assert.deepEqual(c.varfuri.map((v) => [v.p.x, v.p.y, v.s.tip]), [[0, 0, 'L'], [10, 0, 'L'], [10, 5, 'L']]);
  assert.equal(caleCutit([{ x: 0, y: 0 }, { x: 0.5, y: 0 }], 1), null, 'mai scurtă decât minimul');
  assert.equal(caleCutit([{ x: 0, y: 0 }], 0), null, 'un singur punct');
});

test('calea Pen-ului, mutată pe foaie din originea ei, cu mânerele cubicelor', () => {
  const c = caleDinPen({
    forma: { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 5, y: 10 }, c2: { x: 15, y: 10 } } }, { p: { x: 20, y: 0 }, s: { tip: 'L' } }] },
    x: 100, y: 50,
  });
  assert.ok(c);
  assert.deepEqual(c.varfuri, [
    { p: { x: 100, y: 50 }, s: { tip: 'C', c1: { x: 105, y: 60 }, c2: { x: 115, y: 60 } } },
    { p: { x: 120, y: 50 }, s: { tip: 'L' } },
  ]);
  assert.equal(caleDinPen({ forma: { tip: 'cerc', raza: 5 }, x: 0, y: 0 }), null, 'Pen-ul dă doar căi');
});

test('locurile aproximative: o linie oblică trece pătratul pe două laturi, cu tăieturile pe ele', () => {
  const p = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
  const forme = [{ puncte: p, inchis: true, cutie: cutiePuncte(p) }];
  const l = locuriAproximative([{ x: -10, y: 20 }, { x: 110, y: 60 }], forme);
  assert.equal(l.length, 2);
  const s = [...l].sort((a, b) => a.x - b.x);
  assert.ok(Math.abs((s[0]?.x ?? 1) - 0) < 1e-9 && Math.abs((s[0]?.y ?? 0) - 70 / 3) < 1e-9);
  assert.ok(Math.abs((s[1]?.x ?? 0) - 100) < 1e-9 && Math.abs((s[1]?.y ?? 0) - 170 / 3) < 1e-9);
  assert.deepEqual(locuriAproximative([{ x: 200, y: 200 }, { x: 300, y: 300 }], forme), [], 'departe: nimic');
  assert.deepEqual(locuriAproximative([{ x: -10, y: 20 }, { x: 110, y: 60 }], forme, 1).length, 1, 'cel mult cât plafonul');
});

test('felurile cuțitului: doar cele știute trec', () => {
  for (const m of ['linie', 'pen', 'liber', 'forma', 'foarfeca', 'reteaza']) assert.ok(esteModCutit(m), m);
  for (const m of ['decupare', '', null, 3]) assert.ok(!esteModCutit(m), String(m));
});

test('selecția după tăiere: nimic ales rămâne nimic; o formă aleasă tăiată, înlocuită de bucățile ei; una ștearsă iese', () => {
  const degrupate = [{ instanta: { id: 'a' }, parti: [{ instanta: { id: 'a1' } }, { instanta: { id: 'a2' } }] }];
  assert.deepEqual(selectieDupa([], degrupate, []), []);
  assert.deepEqual(selectieDupa(['a', 'b'], degrupate, []), ['a1', 'a2', 'b']);
  assert.deepEqual(selectieDupa(['b', 'c'], degrupate, ['c']), ['b']);
});

test('bucata de sub maus (Retează): între cele mai apropiate locuri comune; fără ele, tot conturul; punctele ei, pentru marcaj', () => {
  // „#”: orizontala y = 20 și verticalele x = 20, x = 80, toate de la 0 la 100.
  const h = conturAproximat([{ x: 0, y: 20 }, { x: 100, y: 20 }], false, 'd');
  const v1 = conturAproximat([{ x: 20, y: 0 }, { x: 20, y: 100 }], false, 'd');
  const v2 = conturAproximat([{ x: 80, y: 0 }, { x: 80, y: 100 }], false, 'd');
  const forme = [h, v1, v2];
  const locuri = locuriComune(forme);
  assert.ok(locuri);
  assert.deepEqual(locuri[0], [20, 80], 'pe orizontală, la x = 20 și x = 80');
  assert.deepEqual(locuri[1], [20], 'și pe verticala x = 20, la y = 20');
  const capat = bucataSub(forme, locuri, { x: 90, y: 20.5 }, 1);
  assert.deepEqual(capat, { i: 0, de: 80, pana: 100, tot: false });
  assert.deepEqual(subPolilinie(h, 80, 100), [{ x: 80, y: 20 }, { x: 100, y: 20 }]);
  assert.deepEqual(bucataSub(forme, locuri, { x: 50, y: 20 }, 1), { i: 0, de: 20, pana: 80, tot: false }, 'mijlocul');
  assert.equal(bucataSub(forme, locuri, { x: 50, y: 50 }, 1), null, 'departe de contururi');
  // Un pătrat închis trecut de o singură verticală: două locuri, bucata din dreapta trece prin colțuri, peste capăt.
  const p = conturAproximat([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }], true, 'p');
  const l = conturAproximat([{ x: 50, y: -10 }, { x: 50, y: 110 }], false, 'l');
  const lp = locuriComune([p, l]);
  assert.ok(lp);
  // Latura de jos, la 50; cea de sus se parcurge de la (100, 100) spre stânga: (50, 100) e la 200 + 50.
  assert.deepEqual(lp[0], [50, 250]);
  const dreapta = bucataSub([p, l], lp, { x: 100, y: 50 }, 1);
  assert.deepEqual(dreapta, { i: 0, de: 50, pana: 250, tot: false });
  assert.deepEqual(subPolilinie(p, 50, 250), [{ x: 50, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 50, y: 100 }]);
  // Înaintea primului loc (jos, la x = 20): bucata vine de la ultimul loc, peste capăt.
  assert.deepEqual(bucataSub([p, l], lp, { x: 20, y: 0 }, 1), { i: 0, de: 250, pana: 50, tot: false });
  const stanga = bucataSub([p, l], lp, { x: 0, y: 50 }, 1);
  assert.deepEqual(stanga, { i: 0, de: 250, pana: 50, tot: false });
  assert.deepEqual(subPolilinie(p, 250, 50), [{ x: 50, y: 100 }, { x: 0, y: 100 }, { x: 0, y: 0 }, { x: 50, y: 0 }]);
  // Fără nicio altă formă: tot pătratul.
  assert.deepEqual(bucataSub([p], [[]], { x: 100, y: 50 }, 1), { i: 0, de: 0, pana: 400, tot: true });
  // Peste plafonul perechilor cercetate: nimic de arătat.
  assert.equal(locuriComune([p, l], 1), null);
});
