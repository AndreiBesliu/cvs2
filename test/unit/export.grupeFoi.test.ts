/**
 * Grupele foilor în fereastra exportului (ADR 0291, 7a, felia 28.8↑q), pe hârtie: cu „Toate foile”, fiecare piesă își are
 * rândurile o singură dată, la prima foaie (în ordinea foilor) pe care e pusă, cu prima ei instanță de acolo; o foaie cu piese
 * deja puse pe foi de dinainte (o copie legată, plăcuțele din CSV) le spune ca „comune”, pe foaia lor; o foaie fără nicio piesă
 * e goală. O instanță a unei piese care lipsește din document se sare.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentNou, type Document, type Instanta } from '../../src/model/document.ts';
import { grupeFoi } from '../../src/model/foiExport.ts';
import { docDin, ID } from './ajutor-document.ts';

/** Piesele „a” (dreptunghi), „b” (cerc) și „c” (dreptunghi), puse pe foi după `foi` (id-urile pieselor, în ordine). */
function cuFoi(foi: readonly (readonly string[])[]): Document {
  const d = docDin({ latime: 300, inaltime: 200, grosime: 18 },
    { id: 'a', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'b', forma: { tip: 'cerc', raza: 20 }, matrice: { ...ID, e: 150, f: 100 } },
    { id: 'c', forma: { tip: 'dreptunghi', latime: 30, inaltime: 30, razaColt: 0 }, matrice: { ...ID, e: 200, f: 20 } });
  const model = new Map(d.foi[0]!.instante.map((i) => [i.piesa, i]));
  const nou = documentNou(d.foi[0]!.stoc).foi[0]!;
  let n = 0;
  return {
    ...d,
    foi: foi.map((piese, k) => ({
      ...nou, id: `f${k + 1}`,
      instante: piese.map((p): Instanta => ({ ...(model.get(p) ?? { ...model.get('a')!, piesa: p }), id: `i${++n}` })),
    })),
  };
}

test('fiecare piesă la prima ei foaie, cu prima instanță de acolo; pe foile de după, comune cu foaia ei', () => {
  // Foaia 1: a, b; foaia 2: b (copie), c, a (copie); foaia 3: c; foaia 4: nimic; foaia 5: a, a.
  const g = grupeFoi(cuFoi([['a', 'b'], ['b', 'c', 'a'], ['c'], [], ['a', 'a']]));
  assert.deepEqual(g.map((x) => x.k), [0, 1, 2, 3, 4]);
  assert.deepEqual(g.map((x) => x.piese.map((p) => `${p.piesa}@${p.instanta}`)), [['a@i1', 'b@i2'], ['c@i4'], [], [], []]);
  // Comunele: după foaia lor de început, în ordinea foilor, fiecare piesă o dată.
  assert.deepEqual(g.map((x) => x.comune.map((c) => [c.k, [...c.piese]])), [[], [[0, ['b', 'a']]], [[1, ['c']]], [], [[0, ['a']]]]);
  assert.deepEqual(g.map((x) => x.goala), [false, false, false, true, false]);
});

test('o singură foaie: toate piesele ei, fără comune; o instanță a unei piese lipsă se sare', () => {
  const d = cuFoi([['a', 'b', 'c']]);
  const lipsa: Document = { ...d, foi: [{ ...d.foi[0]!, instante: [{ ...d.foi[0]!.instante[0]!, id: 'x', piesa: 'nu-e' }, ...d.foi[0]!.instante] }] };
  const g = grupeFoi(lipsa);
  assert.equal(g.length, 1);
  assert.deepEqual(g[0]!.piese.map((p) => p.piesa), ['a', 'b', 'c']);
  assert.deepEqual(g[0]!.comune, []);
  assert.equal(g[0]!.goala, false);
});

test('o foaie doar cu o piesă lipsă e goală; o copie legată a foii întregi are doar comune', () => {
  const d = cuFoi([['a', 'b'], ['a', 'b']]);
  const g = grupeFoi(d);
  assert.deepEqual(g[1]!.piese, []);
  assert.deepEqual(g[1]!.comune.map((c) => [c.k, [...c.piese]]), [[0, ['a', 'b']]]);
  assert.equal(g[1]!.goala, false);
  const lipsa: Document = { ...d, foi: [d.foi[0]!, { ...d.foi[1]!, instante: [{ ...d.foi[1]!.instante[0]!, piesa: 'nu-e' }] }] };
  assert.equal(grupeFoi(lipsa)[1]!.goala, true);
});
