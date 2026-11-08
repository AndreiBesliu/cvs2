import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ancoraLipita, ancoraLovita, fractiiDinPunct, fractiiPunct, PUNCTE_CUTIE, punctDinFractii, transformareManer, type PunctCutie,
} from '../../src/app/editareCalcul.ts';
import { lipeste, tinteDin } from '../../src/geom/lipire.ts';
import { transforma } from '../../src/model/transformare.ts';
import { cutieElement } from '../../src/model/forme.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { docDin, ID } from './ajutor-document.ts';
import type { Document } from '../../src/model/document.ts';

/** Ancora transformării (ADR 0240 §A), pură: cele 9 puncte ale cutiei, fracțiile, lipirea ei, transformările în jurul ei. */

const T = (s = '') => ({ shift: s.includes('S'), ctrl: s.includes('C'), alt: s.includes('A') });
const C = { minX: 0, minY: 0, maxX: 40, maxY: 20 };

test('cele 9 puncte ale cutiei, în ordinea selectorului (rândul de sus întâi); fracțiile și punctul lor', () => {
  assert.deepEqual(PUNCTE_CUTIE, ['nv', 'n', 'ne', 'v', 'c', 'e', 'sv', 's', 'se']);
  const pe = (p: PunctCutie) => punctDinFractii(C, fractiiPunct(p));
  assert.deepEqual(PUNCTE_CUTIE.map(pe), [
    { x: 0, y: 20 }, { x: 20, y: 20 }, { x: 40, y: 20 }, { x: 0, y: 10 }, { x: 20, y: 10 }, { x: 40, y: 10 }, { x: 0, y: 0 }, { x: 20, y: 0 }, { x: 40, y: 0 },
  ]);
  // O ancoră liberă, și în afara cutiei: fracțiile o duc înapoi exact.
  for (const p of [{ x: 10, y: 10 }, { x: -15, y: 32.5 }, { x: 40, y: 0 }]) assert.deepEqual(punctDinFractii(C, fractiiDinPunct(C, p)), p);
  // Pe o axă fără lățime (o linie orizontală), ancora stă pe linie, la mijlocul axei: când linia capătă înălțime (rotită din
  // panou, nu în jurul ancorei), ancora e la mijlocul ei.
  const linie = { minX: 0, minY: 5, maxX: 40, maxY: 5 };
  const fl = fractiiDinPunct(linie, { x: 10, y: 9 });
  assert.deepEqual(fl, { u: 0.25, v: 0.5 });
  assert.deepEqual(punctDinFractii(linie, fl), { x: 10, y: 5 });
  assert.deepEqual(punctDinFractii({ minX: 0, minY: -15, maxX: 40, maxY: 25 }, fl), { x: 10, y: 5 });
  // La fel pe o linie verticală.
  assert.deepEqual(fractiiDinPunct({ minX: 7, minY: 0, maxX: 7, maxY: 20 }, { x: 3, y: 5 }), { u: 0.5, v: 0.25 });
});

test('ancora urmează selecția: mutată sau scalată din alt mâner, aceleași fracții; după o rotire în jurul ei, rămâne pe loc', () => {
  // Ancora în (10, 10) pe cutia 0…40 × 0…20: fracțiile (0,25; 0,5).
  const f = fractiiDinPunct(C, { x: 10, y: 10 });
  assert.deepEqual(f, { u: 0.25, v: 0.5 });
  // Mutată cu (100, 50): ancora în (110, 60).
  assert.deepEqual(punctDinFractii({ minX: 100, minY: 50, maxX: 140, maxY: 70 }, f), { x: 110, y: 60 });
  // Scalată ×2 din latura dreaptă (fix stânga): ancora merge cu forma, în (20, 10).
  assert.deepEqual(punctDinFractii({ minX: 0, minY: 0, maxX: 80, maxY: 20 }, f), { x: 20, y: 10 });
});

test('lipirea ancorei: întâi cele 9 puncte ale cutiei, apoi țintele obișnuite; fără lipire, liberă', () => {
  const tinte = tinteDin([{ axa: 'x', poz: 33, de: -Infinity, la: Infinity, fel: 'ghidaj' }]);
  const lip = (p: { x: number; y: number }) => lipeste(tinte, { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y }, 0, 0, { toleranta: 2, grila: null });
  // Lângă colțul ne (40, 20), la 1,5 mm: se prinde de el (cu toleranța de 2 mm).
  assert.deepEqual(ancoraLipita(C, { x: 39, y: 18.9 }, lip, 2).punct, { x: 40, y: 20 });
  // Lângă centru: (20, 10).
  assert.deepEqual(ancoraLipita(C, { x: 21.2, y: 9.5 }, lip, 2).punct, { x: 20, y: 10 });
  // Departe de cele 9, dar lângă ghidajul x = 33: x se lipește, y rămâne.
  const g = ancoraLipita(C, { x: 32.1, y: 4.4 }, lip, 2);
  assert.deepEqual([g.punct, g.linii.map((l) => l.axa)], [{ x: 33, y: 4.4 }, ['x']]);
  // Fără lipire (oprită, sau inversată cu Alt): exact unde a lăsat-o mausul, rotunjită la 0,001 mm.
  assert.deepEqual(ancoraLipita(C, { x: 39.00004, y: 18.9 }, null, 2).punct, { x: 39, y: 18.9 });
});

test('lovitura ancorei: la cel mult 7 px de țintă, pe ecran', () => {
  // Ancora în (20, 10) mm, la 2 px/mm, cu originea foii în (10, 300) pe ecran: ținta în (50, 280).
  const v = { tx: 10, ty: 300, scara: 2 };
  assert.equal(ancoraLovita({ x: 20, y: 10 }, v, 50, 280), true);
  assert.equal(ancoraLovita({ x: 20, y: 10 }, v, 56.9, 280), true);
  assert.equal(ancoraLovita({ x: 20, y: 10 }, v, 50, 287.1), false);
  assert.equal(ancoraLovita(null, v, 50, 280), false, 'fără ancoră (cutia prea mică pe ecran), nimic');
});

/** Dreptunghiul 40 × 20 din (0, 0), ales. */
const doc = (): Document => docDin({ latime: 300, inaltime: 200, grosime: 18 }, { id: 'p', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }, matrice: { ...ID } });
const cutie = (d: Document, piese: ReturnType<typeof transforma>) => {
  if (!piese.ok) throw new Error('refuzat');
  const instante = d.foi[0]!.instante.map((i) => piese.instante.find((x) => x.id === i.id) ?? i);
  const pz = d.piese.map((p) => piese.piese.find((x) => x.id === p.id) ?? p);
  const dupa: Document = { ...d, piese: pz, foi: [{ ...d.foi[0]!, instante }] };
  let r = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const e of elementeFoaie(dupa, 0)) {
    const k = cutieElement(e);
    r = { minX: Math.min(r.minX, k.minX), minY: Math.min(r.minY, k.minY), maxX: Math.max(r.maxX, k.maxX), maxY: Math.max(r.maxY, k.maxY) };
  }
  const z = (v: number) => Math.round(v * 1e9) / 1e9 + 0;
  return { minX: z(r.minX), minY: z(r.minY), maxX: z(r.maxX), maxY: z(r.maxY) };
};

test('pe hârtie (ADR 0240 §Proba): rotirea cu 90° în jurul colțului stânga-jos și în jurul centrului', () => {
  const d = doc();
  // Ancora în sv (0, 0): cutia [−20, 0] × [0, 40].
  const sv = transformareManer(C, 'rotire', { x: 20, y: 0 }, { x: 0, y: 20 }, T(), {}, punctDinFractii(C, fractiiPunct('sv')));
  assert.deepEqual(sv, { fel: 'rotire', unghi: 90, centru: { x: 0, y: 0 } });
  assert.deepEqual(cutie(d, transforma(d, 0, ['p'], sv)), { minX: -20, minY: 0, maxX: 0, maxY: 40 });
  // Ancora în centru (20, 10): cutia [10, 30] × [−10, 30].
  const c = transformareManer(C, 'rotire', { x: 40, y: 10 }, { x: 20, y: 30 }, T(), {}, punctDinFractii(C, fractiiPunct('c')));
  assert.deepEqual(cutie(d, transforma(d, 0, ['p'], c)), { minX: 10, minY: -10, maxX: 30, maxY: 30 });
});

test('pe hârtie: Alt față de ancora liberă (10, 10), oglindirea față de ea', () => {
  const d = doc();
  const a = { x: 10, y: 10 };
  // Latura dreaptă trasă de la 40 la 50 cu Alt: sx = 40 / 30 (rotunjit la 1,3333), cutia [10 − 10 · 1,3333; 50].
  const t = transformareManer(C, 'e', { x: 40, y: 10 }, { x: 50, y: 10 }, T('A'), {}, a);
  const k = cutie(d, transforma(d, 0, ['p'], t));
  assert.ok(Math.abs(k.minX - (10 - 10 * 1.3333)) < 1e-9 && Math.abs(k.maxX - (10 + 30 * 1.3333)) < 1e-9 && k.minY === 0 && k.maxY === 20);
  // Fără Alt: fix latura stângă, cutia [0, 50].
  assert.deepEqual(cutie(d, transforma(d, 0, ['p'], transformareManer(C, 'e', { x: 40, y: 10 }, { x: 50, y: 10 }, T(), {}, a))), { minX: 0, minY: 0, maxX: 50, maxY: 20 });
  // Oglindirea orizontală față de ancoră (dreapta verticală x = 10): cutia [−20, 20].
  assert.deepEqual(cutie(d, transforma(d, 0, ['p'], { fel: 'oglindire', directie: 'orizontal', centru: a })), { minX: -20, minY: 0, maxX: 20, maxY: 20 });
});
