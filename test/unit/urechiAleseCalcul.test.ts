/**
 * Modul urechilor alese (ADR 0211, felia 11.3↑d), partea pură, pe hârtie: dreptunghiul 80 × 30 (piesa `p`, elementul `e`)
 * pus de două ori, în (50, 50) și, rotit cu 90°, în (200, 50). Locurile se țin în coordonatele formei, deci o ureche pusă pe
 * o copie apare pe amândouă; între centre, cel puțin W / 0,9 pe contur (6a); plafonul de 100 pe element.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  conturLovit, contururiUrechi, distantaMinima, locuriOperatiei, mutaUreche, numarLocuri, puneUreche, scoateUreche, urecheLovita,
  type ConturUrechi, type Locuri,
} from '../../src/app/urechiAleseCalcul.ts';
import { aplica } from '../../src/geom/matrice.ts';
import type { Document, FormaDoc, UrechiOperatie } from '../../src/model/document.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
function documentCu(urechi: UrechiOperatie | null, id = 'e', forma: FormaDoc | null = null): Document {
  return {
    schema: 26, rev: 0,
    piese: [{
      id: 'p', radacina: { tip: 'element', id, forma: forma ?? { tip: 'dreptunghi', latime: 80, inaltime: 30, razaColt: 0 }, matrice: { ...I } },
      operatii: [{
        id: 'x1', tip: 'profil', noduri: [id], scula: { numar: 1, nume: 'freza plata', diametru: 3.175 }, latura: 'exterior', sens: 'urcare',
        adancime: 18, pas: 6, urechi, rampa: null, intrari: null, colturi: null,
      }],
    }],
    foi: [{
      id: 'f1', stoc: { latime: 400, inaltime: 300, grosime: 18 },
      instante: [{ id: 'i1', piesa: 'p', x: 50, y: 50, rotire: 0 }, { id: 'i2', piesa: 'p', x: 200, y: 50, rotire: 90 }],
    }],
  };
}
const W = 6;
const aproape = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-9;
const k1 = (cs: readonly ConturUrechi[]): ConturUrechi => cs.find((k) => k.instanta === 'i1') as ConturUrechi;
const k2 = (cs: readonly ConturUrechi[]): ConturUrechi => cs.find((k) => k.instanta === 'i2') as ConturUrechi;
const bun = (r: ReturnType<typeof puneUreche>): Locuri => {
  assert.ok(r && r.ok, JSON.stringify(r));
  return r.locuri;
};

test('contururile: un contur pe instanță, în lume, cu lungimea lui', () => {
  const cs = contururiUrechi(documentCu(null), 0, 'p', 'x1');
  assert.deepEqual(cs.map((k) => [k.instanta, k.nod]), [['i1', 'e'], ['i2', 'e']]);
  for (const k of cs) assert.ok(aproape(k.lungime, 220), String(k.lungime));
  assert.deepEqual(contururiUrechi(documentCu(null), 0, 'p', 'alta'), []);
});

test('punerea: pe cel mai apropiat punct al conturului, ca punct al formei; apare pe toate copiile', () => {
  const cs = contururiUrechi(documentCu(null), 0, 'p', 'x1');
  // Lângă latura stângă a copiei 1, la 1 mm de ea: pe (0, 15) al formei.
  const l1 = bun(puneUreche({}, k1(cs), { x: 49, y: 65 }, W, 2));
  assert.deepEqual(l1, { e: [{ x: 0, y: 15 }] });
  // Pe copia 2 (rotită cu 90°), același loc al formei e în (185, 50).
  const p2 = aplica(k2(cs).matrice, { x: 0, y: 15 });
  assert.ok(aproape(p2.x, 185) && aproape(p2.y, 50), JSON.stringify(p2));
  // Un clic pe copia 2, la mijlocul laturii de jos a formei (lumea: (200, 90)), dă (40, 0).
  const l2 = bun(puneUreche(l1, k2(cs), { x: 200, y: 90 }, W, 2));
  assert.deepEqual(l2, { e: [{ x: 0, y: 15 }, { x: 40, y: 0 }] });
  assert.equal(numarLocuri(l2), 2);
  // Departe de contur: nimic.
  assert.equal(puneUreche(l2, k1(cs), { x: 90, y: 65 }, W, 2), null);
});

test('distanța: cel puțin W / 0,9 între centre, pe contur, de jur împrejur', () => {
  assert.ok(aproape(distantaMinima(6), 6 / 0.9));
  const cs = contururiUrechi(documentCu(null), 0, 'p', 'x1');
  const l = bun(puneUreche({}, k1(cs), { x: 50, y: 65 }, W, 2));
  // La 5 mm (pe aceeași latură): prea aproape; la 7 mm: bine.
  assert.deepEqual(puneUreche(l, k1(cs), { x: 50, y: 70 }, W, 2), { ok: false, motiv: 'aproape' });
  assert.ok(puneUreche(l, k1(cs), { x: 50, y: 72 }, W, 2)?.ok);
  // Peste colț: (0, 2) și (2, 0) sunt la 4 mm pe contur.
  const c = bun(puneUreche({}, k1(cs), { x: 50, y: 52 }, W, 2));
  assert.deepEqual(puneUreche(c, k1(cs), { x: 52, y: 50 }, W, 2), { ok: false, motiv: 'aproape' });
  // Peste vârful 0 al conturului (colțul (0, 0)): (0, 3) și (4, 0) sunt la 7 mm.
  const z = bun(puneUreche({}, k1(cs), { x: 50, y: 53 }, W, 2));
  assert.ok(puneUreche(z, k1(cs), { x: 54, y: 50 }, W, 2)?.ok);
});

test('mutarea: urechea alunecă pe contur oricât de departe ar fi mausul, dar nu lângă alta', () => {
  const cs = contururiUrechi(documentCu(null), 0, 'p', 'x1');
  const l = bun(puneUreche(bun(puneUreche({}, k1(cs), { x: 50, y: 65 }, W, 2)), k1(cs), { x: 90, y: 50 }, W, 2));
  const m = mutaUreche(l, k1(cs), 0, { x: 30, y: 75 }, W);
  assert.ok(m && m.ok);
  assert.deepEqual(m.locuri, { e: [{ x: 0, y: 25 }, { x: 40, y: 0 }] });
  // Lângă cealaltă (40, 0): refuzată.
  assert.deepEqual(mutaUreche(l, k1(cs), 0, { x: 93, y: 49 }, W), { ok: false, motiv: 'aproape' });
  // Lângă ea însăși: se poate.
  assert.ok(mutaUreche(l, k1(cs), 1, { x: 92, y: 49 }, W)?.ok);
  assert.equal(mutaUreche(l, k1(cs), 5, { x: 92, y: 49 }, W), null);
});

test('scoaterea; lista goală pleacă', () => {
  const l: Locuri = { e: [{ x: 0, y: 15 }, { x: 40, y: 0 }] };
  assert.deepEqual(scoateUreche(l, 'e', 0), { e: [{ x: 40, y: 0 }] });
  assert.deepEqual(scoateUreche(scoateUreche(l, 'e', 0), 'e', 0), {});
});

test('lovirea: urechea cea mai apropiată, pe oricare copie, și conturul de sub maus', () => {
  const cs = contururiUrechi(documentCu(null), 0, 'p', 'x1');
  const l: Locuri = { e: [{ x: 0, y: 15 }] };
  const u = urecheLovita(cs, l, { x: 186, y: 51 }, 2);
  assert.ok(u && u.k.instanta === 'i2' && u.index === 0);
  assert.equal(urecheLovita(cs, l, { x: 120, y: 120 }, 2), null);
  assert.equal(conturLovit(cs, { x: 131, y: 70 }, 2)?.instanta, 'i1');
  assert.equal(conturLovit(cs, { x: 100, y: 70 }, 2), null);
});

test('plafonul de 100 pe element și conturul prea scurt pentru o ureche', () => {
  const cs = contururiUrechi(documentCu(null), 0, 'p', 'x1');
  const o = Array.from({ length: 100 }, (_, k) => ({ x: k * 0.8, y: 0 }));
  assert.deepEqual(puneUreche({ e: o }, k1(cs), { x: 50, y: 65 }, 0.1, 2), { ok: false, motiv: 'plafon' });
  // Un cerc cu raza 1: conturul are 6,28 mm, sub 6 / 0,9 = 6,67.
  const mic = contururiUrechi(documentCu(null, 'e', { tip: 'cerc', raza: 1 }), 0, 'p', 'x1');
  assert.deepEqual(puneUreche({}, k1(mic), { x: 51, y: 50 }, W, 2), { ok: false, motiv: 'scurt' });
});

test('locurile din document: doar pe elementele operației, doar cu „alese”; cheia „__proto__” rămâne a ei', () => {
  const alese = (locuri: Record<string, { x: number; y: number }[]>): UrechiOperatie => ({ numar: 2, latime: 6, grosime: 2, mod: 'alese', locuri });
  assert.deepEqual(locuriOperatiei(documentCu(alese({ e: [{ x: 0, y: 15 }], x: [{ x: 1, y: 1 }] })), 'p', 'x1'), { e: [{ x: 0, y: 15 }] });
  assert.deepEqual(locuriOperatiei(documentCu({ numar: 2, latime: 6, grosime: 2 }), 'p', 'x1'), {});
  const d = documentCu(alese(JSON.parse('{"__proto__": [{"x": 0, "y": 15}]}') as Record<string, { x: number; y: number }[]>), '__proto__');
  const l = locuriOperatiei(d, 'p', 'x1');
  assert.ok(Object.hasOwn(l, '__proto__'));
  assert.equal(numarLocuri(l), 1);
  const cs = contururiUrechi(d, 0, 'p', 'x1');
  const r = puneUreche(l, k1(cs), { x: 90, y: 50 }, W, 2);
  assert.ok(r && r.ok);
  assert.deepEqual(Object.getOwnPropertyDescriptor(r.locuri, '__proto__')?.value, [{ x: 0, y: 15 }, { x: 40, y: 0 }]);
  assert.equal(Object.getPrototypeOf(r.locuri), Object.prototype);
});
