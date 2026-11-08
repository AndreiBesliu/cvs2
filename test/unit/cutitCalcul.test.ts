/**
 * Unealta Cuțit (ADR 0181 §1; felia 10.3↑f), partea pură (`src/app/cutitCalcul.ts`): formele de tăiat (răspunsul 2a: cele
 * alese, sau, fără alegere, toate de pe foaie; niciodată cuțitul), urma mâinii libere (un punct nou doar la un pixel de ultimul),
 * calea cuțitului din urmă (prea scurtă: nimic), calea Pen-ului mutată pe foaie (cu mânerele) și locurile aproximative arătate
 * cât tragi (pătratul trecut de o linie oblică: două locuri, pe laturi).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaugaLaUrma, caleCutit, caleDinPen, cutiePuncte, esteModCutit, locuriAproximative, lungimeUrma, tinteCutit } from '../../src/app/cutitCalcul.ts';
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
  for (const m of ['linie', 'pen', 'liber', 'forma']) assert.ok(esteModCutit(m), m);
  for (const m of ['foarfeca', '', null, 3]) assert.ok(!esteModCutit(m), String(m));
});
