/**
 * Ieșirea din foaie (decizia owner-ului din 07.10.2026): formele pot ieși intenționat, avertismentul stă în bara de jos,
 * iar exportul cere confirmare și o scrie în antet. Valorile sunt pe hârtie: freza Ø6 (R3), foaia 300 × 200.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iesireDinFoaie } from '../../src/cam/iesire.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import type { Program } from '../../src/ir/ir.ts';
import { avertismente } from '../../src/model/avertismente.ts';
import { documentNou, type Document, type ElementDoc } from '../../src/model/document.ts';

const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const dreptunghi = (id: string, x: number, y: number): ElementDoc =>
  ({ id, forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: x, f: y } });
const cerc = (id: string, x: number, y: number, raza = 15): ElementDoc => ({ id, forma: { tip: 'cerc', raza }, matrice: { ...ID, e: x, f: y } });
const doc = (...elemente: ElementDoc[]): Document => ({ ...documentNou({ latime: 300, inaltime: 200, grosime: 18 }), elemente });
const SCULA = { numar: 1, nume: 'freza plata', diametru: 6 };

function program(d: Document): Program {
  const j = programDinDocument(d, new Map(), SCULA);
  if (!j.ok) throw new Error(j.motiv);
  return j.program;
}

test('avertismentul: doar formele care trec de marginea foii, cu cât trec; cea lipită de margine nu', () => {
  assert.deepEqual(avertismente(doc(dreptunghi('e1', 20, 20))), []);
  // 100 × 60 cu colțul în (250, 20): ajunge la X 350, deci 50 mm peste latura dreaptă.
  assert.deepEqual(avertismente(doc(dreptunghi('e1', 20, 20), dreptunghi('e2', 250, 20))),
    [{ tip: 'iese-din-foaie', id: 'e2', depasire: { stanga: 0, dreapta: 50, jos: 0, sus: 0 } }]);
  // Lipit de margine (X 200…300): nu iese.
  assert.deepEqual(avertismente(doc(dreptunghi('e1', 200, 140))), []);
  // Cercul R15 cu centrul în (10, 190): 5 mm la stânga și 5 mm sus, prin punctele lui de pe axe.
  const [a] = avertismente(doc(cerc('e1', 10, 190)));
  assert.ok(a);
  assert.ok(Math.abs(a.depasire.stanga - 5) < 1e-9 && Math.abs(a.depasire.sus - 5) < 1e-9 && a.depasire.dreapta === 0 && a.depasire.jos === 0);
});

test('traseul: insula plăcii 1 nu iese; mutată la 1 mm de margine, discul trece cu 5 mm (centrul la −2, raza 3)', () => {
  assert.equal(iesireDinFoaie(program(doc(dreptunghi('e1', 20, 20))), { latime: 300, inaltime: 200 }), null);
  const r = iesireDinFoaie(program(doc(dreptunghi('e1', 1, 20))), { latime: 300, inaltime: 200 });
  assert.ok(r);
  assert.deepEqual(r.depasire, { stanga: 5, dreapta: 0, jos: 0, sus: 0 });
  assert.deepEqual(r.etichete, ['e1: dreptunghi, exterior, 3 mm']);
});

test('traseul: forma în foaie, dar discul exteriorului trece de margine (la 4 mm: −1 − 3 = 2 mm)', () => {
  // Vectorul nu iese (avertismentul tace), dar freza da: exportul tot cere confirmare.
  assert.deepEqual(avertismente(doc(dreptunghi('e1', 4, 20))), []);
  assert.deepEqual(iesireDinFoaie(program(doc(dreptunghi('e1', 4, 20))), { latime: 300, inaltime: 200 })?.depasire,
    { stanga: 2, dreapta: 0, jos: 0, sus: 0 });
  // La 6 mm, discul atinge exact marginea: nu iese.
  assert.equal(iesireDinFoaie(program(doc(dreptunghi('e1', 6, 20))), { latime: 300, inaltime: 200 }), null);
});

test('traseul: gaura R15 sus, la Y 186: vârful arcului (nu capetele lui) trece cu 1 mm (186 + 12 + 3 − 200)', () => {
  // Interiorul cercului R15 cu freza R3: traseul are raza 12 și pornește din punctul de la 0°; capetele arcelor sunt la 0°
  // și 180°, deci Y-ul maxim vine doar din punctul de la 90°.
  const r = iesireDinFoaie(program(doc(cerc('e1', 100, 186))), { latime: 300, inaltime: 200 });
  assert.ok(r);
  assert.ok(Math.abs(r.depasire.sus - 1) < 1e-9, `sus ${r.depasire.sus}`);
  assert.equal(r.depasire.stanga + r.depasire.dreapta + r.depasire.jos, 0);
});

test('rapidele nu contează; plonjarea în afara foii da, cu toată raza', () => {
  const p = (miscari: Program['miscari']): Program => ({ axe: ['X', 'Y', 'Z'], scula: SCULA, turatie: 18000, zSigur: 5, miscari });
  const foaie = { latime: 300, inaltime: 200 };
  // O rapidă la Z sigur, departe în afara foii: aer.
  assert.equal(iesireDinFoaie(p([{ tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: -50, Y: -50 } }]), foaie), null);
  // O tăiere la Z sigur, în afara foii, nu atinge materialul.
  assert.equal(iesireDinFoaie(p([{ tip: 'rapida', la: { Z: 5 } }, { tip: 'taiere', la: { X: -50, Y: 50 }, avans: 1000 }]), foaie), null);
  // O plonjare în (−10, 50): discul ajunge la −13.
  const r = iesireDinFoaie(p([
    { tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: -10, Y: 50 } }, { tip: 'taiere', la: { Z: -1 }, avans: 300 },
  ]), foaie);
  assert.deepEqual(r?.depasire, { stanga: 13, dreapta: 0, jos: 0, sus: 0 });
  assert.deepEqual(r?.etichete, ['']);
});
