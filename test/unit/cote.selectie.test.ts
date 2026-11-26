import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coteSelectie } from '../../src/model/coteSelectie.ts';
import { indexLume, punctAncora, valoareCota } from '../../src/model/cote.ts';
import { documentNou, type Cota, type Document } from '../../src/model/document.ts';

/**
 * „Cotează selecția” (ADR 0330 §4, felia 10.4↑d-1), pură: lățimea și înălțimea cutiei fiecărei piese alese, legate de colțurile
 * cutiei elementelor de la margini, cu linia la distanța setată sub piesă (lățimea) și la dreapta ei (înălțimea). Valorile
 * sunt pe hârtie.
 *
 * Documentul (foaia 300 × 200):
 * - „i1”, piesa „p”: dreptunghiul 100 × 50 la (10, 20): cutia (10, 20)–(110, 70);
 * - „i2”, piesa „q”, la (200, 100): dreptunghiul 20 × 10 („r”, cutia (200, 100)–(220, 110)) și cercul R5 cu centrul în (40, 30)
 *   din piesă („c”, cutia (235, 125)–(245, 135)): cutia piesei (200, 100)–(245, 135);
 * - „i3”, piesa „l”: linia orizontală (0, 0) → (40, 0) la (20, 150): lată de 40, înaltă de 0.
 */
const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
function document(): Document {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  const f = d.foi[0];
  if (!f) throw new Error('fără foaie');
  return {
    ...d,
    piese: [
      { id: 'p', operatii: [], radacina: { tip: 'element', id: 'r', matrice: { ...ID }, forma: { tip: 'dreptunghi', latime: 100, inaltime: 50, razaColt: 0 } } },
      {
        id: 'q', operatii: [], radacina: {
          tip: 'grup', id: 'g', matrice: { ...ID }, copii: [
            { tip: 'element', id: 'r', matrice: { ...ID }, forma: { tip: 'dreptunghi', latime: 20, inaltime: 10, razaColt: 0 } },
            { tip: 'element', id: 'c', matrice: { ...ID, e: 40, f: 30 }, forma: { tip: 'cerc', raza: 5 } },
          ],
        },
      },
      {
        id: 'l', operatii: [], radacina: {
          tip: 'element', id: 'e', matrice: { ...ID }, forma: { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 40, y: 0 }, s: { tip: 'L' } }] },
        },
      },
    ],
    foi: [{
      ...f, instante: [
        { id: 'i1', piesa: 'p', x: 10, y: 20, rotire: 0 },
        { id: 'i2', piesa: 'q', x: 200, y: 100, rotire: 0 },
        { id: 'i3', piesa: 'l', x: 20, y: 150, rotire: 0 },
      ],
    }],
  };
}

const puncte = (doc: Document, c: Cota): { x: number; y: number }[] => {
  const lume = indexLume(doc, 0);
  return (c.puncte ?? []).map((a) => {
    const p = punctAncora(a, lume);
    assert.equal(p.stare, a.legatura ? 'legata' : 'libera');
    return { x: Math.round(p.p.x * 1e9) / 1e9, y: Math.round(p.p.y * 1e9) / 1e9 };
  });
};

test('o piesă dintr-un dreptunghi: lățimea 100 sub ea (linia la y = 10), înălțimea 50 la dreapta (linia la x = 120)', () => {
  const doc = document();
  const cote = coteSelectie(doc, 0, ['i1'], 10, [], true);
  assert.equal(cote.length, 2);
  const [l, h] = cote as [Cota, Cota];
  assert.equal(l.fel, 'orizontala');
  assert.deepEqual(puncte(doc, l), [{ x: 10, y: 20 }, { x: 110, y: 20 }]);
  assert.deepEqual(l.linie, { d: -10 });
  assert.equal(valoareCota(l, puncte(doc, l)), 100);
  assert.equal(h.fel, 'verticala');
  assert.deepEqual(puncte(doc, h), [{ x: 110, y: 20 }, { x: 110, y: 70 }]);
  // Linia verticalei la x = mijloc − d = 110 − d = 120: d = −10.
  assert.deepEqual(h.linie, { d: -10 });
  assert.equal(valoareCota(h, puncte(doc, h)), 50);
  // Legate de colțurile cutiei dreptunghiului: stânga-jos (0), dreapta-jos (2), dreapta-sus (8).
  assert.deepEqual(l.puncte?.map((a) => a.legatura?.loc), [{ fel: 'cutie', i: 0 }, { fel: 'cutie', i: 2 }]);
  assert.deepEqual(h.puncte?.map((a) => a.legatura?.loc), [{ fel: 'cutie', i: 2 }, { fel: 'cutie', i: 8 }]);
  assert.deepEqual(l.puncte?.map((a) => a.legatura?.instanta), ['i1', 'i1']);
});

test('o piesă cu două elemente: capetele pe elementele de la margini, liniile la y = 90 și x = 255', () => {
  const doc = document();
  const [l, h] = coteSelectie(doc, 0, ['i2'], 10, [], true) as [Cota, Cota];
  // Lățimea: de la colțul stânga-jos al dreptunghiului (200, 100) la colțul dreapta-jos al cutiei cercului (245, 125).
  assert.deepEqual(puncte(doc, l), [{ x: 200, y: 100 }, { x: 245, y: 125 }]);
  assert.deepEqual(l.puncte?.map((a) => a.legatura?.nod), ['r', 'c']);
  assert.equal(valoareCota(l, puncte(doc, l)), 45);
  // Linia y = 90 = 112,5 + d: d = −22,5.
  assert.deepEqual(l.linie, { d: -22.5 });
  // Înălțimea: de la colțul dreapta-jos al dreptunghiului (220, 100) la colțul dreapta-sus al cercului (245, 135).
  assert.deepEqual(puncte(doc, h), [{ x: 220, y: 100 }, { x: 245, y: 135 }]);
  assert.equal(valoareCota(h, puncte(doc, h)), 35);
  // Linia x = 255 = 232,5 − d: d = −22,5.
  assert.deepEqual(h.linie, { d: -22.5 });
});

test('mai multe piese alese: câte două cote fiecare, în ordinea alegerii, cu id-uri după cele de pe foaie', () => {
  const doc = document();
  const vechi: Cota[] = [{ id: 'c3', fel: 'aliniata' }];
  const cote = coteSelectie(doc, 0, ['i2', 'i1'], 10, vechi, true);
  assert.deepEqual(cote.map((c) => c.id), ['c4', 'c5', 'c6', 'c7']);
  assert.deepEqual(cote.map((c) => c.puncte?.[0]?.legatura?.instanta), ['i2', 'i2', 'i1', 'i1']);
});

test('o linie orizontală: doar lățimea (înălțimea ar fi zero); o instanță care nu e pe foaie: nimic', () => {
  const doc = document();
  const cote = coteSelectie(doc, 0, ['i3', 'nu-e'], 10, [], true);
  assert.equal(cote.length, 1);
  assert.equal(cote[0]?.fel, 'orizontala');
  assert.equal(valoareCota(cote[0]!, puncte(doc, cote[0]!)), 40);
});

test('cu „Cotele noi sunt legate” oprită: capetele libere, în aceleași puncte', () => {
  const doc = document();
  const [l] = coteSelectie(doc, 0, ['i1'], 10, [], false) as [Cota];
  assert.deepEqual(l.puncte, [{ x: 10, y: 20 }, { x: 110, y: 20 }]);
});

test('distanța din setări: la 25, lățimea are linia la y = 20 − 25 = −5', () => {
  const doc = document();
  const [l, h] = coteSelectie(doc, 0, ['i1'], 25, [], true) as [Cota, Cota];
  assert.deepEqual(l.linie, { d: -25 });
  assert.deepEqual(h.linie, { d: -25 });
});
