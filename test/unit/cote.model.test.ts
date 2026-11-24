import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexLume, punctAncora, valoareCota, type PunctCota } from '../../src/model/cote.ts';
import { documentNou, type AncoraCota, type Cota, type Document, type LocCota } from '../../src/model/document.ts';

/**
 * Cotele, pure (ADR 0330 §2–§4): punctul fiecărei ancore, citit din lume (vârful, mijlocul, centrul, cadranul, cutia), cu
 * dezlegarea cinstită (forma lipsă, alte noduri), și valoarea fiecărui fel. Valorile sunt pe hârtie.
 *
 * Documentul: piesa „p” cu trei elemente, pusă o dată (instanța „i1”) la (10, 20), rotită cu 90°, deci (x, y) → (10 − y, 20 + x):
 * - „r”: dreptunghiul 100 × 50, colțurile drepte (vârfurile (0,0), (100,0), (100,50), (0,50));
 * - „c”: cercul R10, cu centrul în (150, 25) în piesă;
 * - „a”: calea deschisă (200,0) → (240,0), apoi semicercul trigonometric (bulge 1) până în (240,40): centrul (240,20), R20,
 *   mijlocul arcului (260,20).
 */
const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
function document(): Document {
  const d = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  const f = d.foi[0];
  if (!f) throw new Error('fără foaie');
  return {
    ...d,
    piese: [{
      id: 'p', operatii: [],
      radacina: {
        tip: 'grup', id: 'g', matrice: { ...ID }, copii: [
          { tip: 'element', id: 'r', matrice: { ...ID }, forma: { tip: 'dreptunghi', latime: 100, inaltime: 50, razaColt: 0 } },
          { tip: 'element', id: 'c', matrice: { ...ID, e: 150, f: 25 }, forma: { tip: 'cerc', raza: 10 } },
          {
            tip: 'element', id: 'a', matrice: { ...ID }, forma: {
              tip: 'cale', inchis: false, varfuri: [
                { p: { x: 200, y: 0 }, s: { tip: 'L' } }, { p: { x: 240, y: 0 }, s: { tip: 'A', bulge: 1 } }, { p: { x: 240, y: 40 }, s: { tip: 'L' } },
              ],
            },
          },
        ],
      },
    }],
    foi: [{ ...f, instante: [{ id: 'i1', piesa: 'p', x: 10, y: 20, rotire: 90 }] }],
  };
}

const lume = indexLume(document(), 0);
const legata = (nod: string, loc: LocCota, n: number): AncoraCota => ({ x: -999, y: -999, legatura: { instanta: 'i1', nod, loc, n } });
const aproape = (r: PunctCota, x: number, y: number, unde: string): void => {
  assert.ok(Math.abs(r.p.x - x) < 1e-9 && Math.abs(r.p.y - y) < 1e-9, `${unde}: (${r.p.x}, ${r.p.y}), nu (${x}, ${y})`);
};

test('ancora liberă: punctul ei, neatins', () => {
  const r = punctAncora({ x: 12.5, y: -3 }, lume);
  assert.deepEqual(r, { p: { x: 12.5, y: -3 }, stare: 'libera' });
});

test('ancora legată: vârful, mijlocul și cutia dreptunghiului, prin instanța rotită cu 90°', () => {
  const v1 = punctAncora(legata('r', { fel: 'varf', k: 1 }, 4), lume);
  assert.equal(v1.stare, 'legata');
  aproape(v1, 10, 120, 'vârful (100, 0)');
  aproape(punctAncora(legata('r', { fel: 'varf', k: 2 }, 4), lume), -40, 120, 'vârful (100, 50)');
  aproape(punctAncora(legata('r', { fel: 'mijloc', k: 0 }, 4), lume), 10, 70, 'mijlocul laturii de jos (50, 0)');
  aproape(punctAncora(legata('r', { fel: 'cutie', i: 0 }, 4), lume), -40, 20, 'cutia, stânga-jos');
  aproape(punctAncora(legata('r', { fel: 'cutie', i: 4 }, 4), lume), -15, 70, 'cutia, centrul');
  aproape(punctAncora(legata('r', { fel: 'cutie', i: 8 }, 4), lume), 10, 120, 'cutia, dreapta-sus');
  aproape(punctAncora(legata('r', { fel: 'cutie', i: 5 }, 99), lume), 10, 70, 'cutia nu ține de noduri');
});

test('ancora legată: centrul și cadranele cercului, mijlocul și centrul unui arc din cale', () => {
  aproape(punctAncora(legata('c', { fel: 'centru', k: 0 }, 2), lume), -15, 170, 'centrul cercului (150, 25)');
  aproape(punctAncora(legata('c', { fel: 'centru', k: 1 }, 2), lume), -15, 170, 'centrul, din al doilea semicerc');
  aproape(punctAncora(legata('c', { fel: 'cadran', k: 0, q: 0 }, 2), lume), -15, 180, 'cadranul 0: (160, 25) în piesă');
  aproape(punctAncora(legata('c', { fel: 'cadran', k: 0, q: 1 }, 2), lume), -25, 170, 'cadranul 1: (150, 35) în piesă');
  aproape(punctAncora(legata('c', { fel: 'cadran', k: 1, q: 3 }, 2), lume), -5, 170, 'cadranul 3: (150, 15) în piesă');
  aproape(punctAncora(legata('a', { fel: 'centru', k: 1 }, 2), lume), -10, 260, 'centrul arcului (240, 20)');
  aproape(punctAncora(legata('a', { fel: 'mijloc', k: 1 }, 2), lume), -10, 280, 'mijlocul arcului (260, 20)');
  aproape(punctAncora(legata('a', { fel: 'varf', k: 2 }, 2), lume), -30, 260, 'ultimul vârf al căii deschise (240, 40)');
});

test('dezlegarea: forma lipsă, alte noduri, un loc care nu mai e pe formă; punctul rămâne cel văzut ultima oară', () => {
  const a: AncoraCota = { x: 7, y: 8, legatura: { instanta: 'nu-exista', nod: 'r', loc: { fel: 'varf', k: 0 }, n: 4 } };
  assert.deepEqual(punctAncora(a, lume), { p: { x: 7, y: 8 }, stare: 'dezlegata', motiv: 'forma' });
  const cu = (loc: LocCota, n: number): PunctCota => punctAncora({ x: 7, y: 8, legatura: { instanta: 'i1', nod: 'r', loc, n } }, lume);
  assert.deepEqual(cu({ fel: 'varf', k: 0 }, 5), { p: { x: 7, y: 8 }, stare: 'dezlegata', motiv: 'noduri' }, 'alt număr de segmente');
  assert.equal(cu({ fel: 'varf', k: 4 }, 4).motiv, 'noduri', 'vârful 4 nu există');
  assert.equal(cu({ fel: 'mijloc', k: 4 }, 4).motiv, 'noduri', 'segmentul 4 nu există');
  assert.equal(cu({ fel: 'centru', k: 0 }, 4).motiv, 'noduri', 'segmentul 0 e o linie: n-are centru');
  assert.equal(cu({ fel: 'cadran', k: 1, q: 0 }, 4).motiv, 'noduri', 'segmentul 1 e o linie: n-are cadrane');
  assert.equal(punctAncora({ x: 7, y: 8, legatura: { instanta: 'i1', nod: 'g', loc: { fel: 'cutie', i: 0 }, n: 0 } }, lume).motiv, 'forma', 'un grup nu e o formă');
});

const cota = (fel: string, linie: Cota['linie'] = { d: 1 }): Cota => ({ id: 'x', fel, puncte: [], linie });
const P = (x: number, y: number): { x: number; y: number } => ({ x, y });

test('valorile, pe hârtie: liniare, raza, diametrul', () => {
  assert.equal(valoareCota(cota('orizontala'), [P(0, 0), P(30, 40)]), 30);
  assert.equal(valoareCota(cota('orizontala'), [P(30, 0), P(0, 40)]), 30, 'fără semn');
  assert.equal(valoareCota(cota('verticala'), [P(0, 0), P(30, -40)]), 40);
  assert.equal(valoareCota(cota('aliniata'), [P(0, 0), P(30, 40)]), 50);
  assert.equal(valoareCota(cota('raza'), [P(1, 1), P(4, 5)]), 5);
  assert.equal(valoareCota(cota('diametru'), [P(1, 1), P(4, 5)]), 10);
});

test('valorile, pe hârtie: unghiul din trei puncte și dintre două laturi, cu semidreptele alese; paralelele n-au unghi', () => {
  const grade = (v: number | null): number => (v === null ? Number.NaN : v);
  const t = Math.atan2(40, 55) * 180 / Math.PI;
  assert.ok(Math.abs(grade(valoareCota(cota('unghi'), [P(0, 0), P(55, 0), P(55, 40)])) - t) < 1e-12, '36,03°');
  assert.ok(Math.abs(grade(valoareCota(cota('unghi', { d: 5, s1: -1 }), [P(0, 0), P(55, 0), P(55, 40)])) - (180 - t)) < 1e-12, 'suplementul');
  assert.ok(Math.abs(grade(valoareCota(cota('unghi'), [P(0, 0), P(10, 0), P(0, 10)])) - 90) < 1e-12, '90°');
  assert.ok(Math.abs(grade(valoareCota(cota('unghi'), [P(0, 0), P(10, 0), P(0, 5), P(10, 15)])) - 45) < 1e-12, 'două laturi, 45°');
  assert.ok(Math.abs(grade(valoareCota(cota('unghi', { d: 5, s2: -1 }), [P(0, 0), P(10, 0), P(0, 5), P(10, 15)])) - 135) < 1e-12, 'două laturi, 135°');
  assert.equal(valoareCota(cota('unghi'), [P(0, 0), P(10, 0), P(0, 5), P(10, 5)]), null, 'laturile paralele');
  assert.equal(valoareCota(cota('unghi'), [P(0, 0), P(0, 0), P(0, 5)]), null, 'o latură de lungime zero');
});

test('valorile: un fel necunoscut sau prea puține puncte n-au valoare', () => {
  assert.equal(valoareCota(cota('toleranta-din-viitor'), [P(0, 0), P(1, 1)]), null);
  assert.equal(valoareCota(cota('orizontala'), [P(0, 0)]), null);
  assert.equal(valoareCota(cota('unghi'), [P(0, 0), P(1, 0)]), null);
});
