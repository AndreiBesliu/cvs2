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
import type { Document } from '../../src/model/document.ts';
import { docDin, ID, type FormaSimpla } from './ajutor-document.ts';

const dreptunghi = (id: string, x: number, y: number): FormaSimpla =>
  ({ id, forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: x, f: y } });
const cerc = (id: string, x: number, y: number, raza = 15): FormaSimpla => ({ id, forma: { tip: 'cerc', raza }, matrice: { ...ID, e: x, f: y } });
const doc = (...elemente: FormaSimpla[]): Document => docDin({ latime: 300, inaltime: 200, grosime: 18 }, ...elemente);
/** Scula programelor scrise de mână de mai jos. */
const SCULA = { numar: 1, nume: 'freza plata', diametru: 6 };

function program(d: Document): Program {
  const j = programDinDocument(d);
  if (!j.ok) throw new Error(j.motiv);
  return j.program;
}

test('avertismentul: doar formele care trec de marginea foii, cu cât trec; cea lipită de margine nu', () => {
  assert.deepEqual(avertismente(doc(dreptunghi('e1', 20, 20))), []);
  // 100 × 60 cu colțul în (250, 20): ajunge la X 350, deci 50 mm peste latura dreaptă.
  assert.deepEqual(avertismente(doc(dreptunghi('e1', 20, 20), dreptunghi('e2', 250, 20))),
    [{ tip: 'iese-din-foaie', id: 'e2/e2', instanta: 'e2', depasire: { stanga: 0, dreapta: 50, jos: 0, sus: 0 } }]);
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
  assert.deepEqual(r.elemente, ['e1/e1']);
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
  // Fără etichetă de element (un program scris de mână), ieșirea se măsoară, dar nu are cui s-o pună în seamă.
  assert.deepEqual(r?.elemente, []);
});

const prog = (miscari: Program['miscari'], diametru = 6): Program => ({ axe: ['X', 'Y', 'Z'], scula: { ...SCULA, diametru }, turatie: 18000, zSigur: 5, miscari });
const FOAIA = { latime: 300, inaltime: 200 };

test('rampa care trece prin fața de sus: contează doar porțiunea de sub Z 0, tăiată exact acolo', () => {
  // Din (−10, 50, Z 0,5) în (10, 50, Z −2): Z = 0 la 0,5 / 2,5 = 1/5 din drum, deci la X −10 + 20/5 = −6. Discul: −9.
  const r = iesireDinFoaie(prog([
    { tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: -10, Y: 50 } }, { tip: 'taiere', la: { Z: 0.5 }, avans: 300 },
    { tip: 'taiere', la: { X: 10, Y: 50, Z: -2 }, avans: 1000 },
  ]), FOAIA);
  assert.ok(r);
  assert.ok(Math.abs(r.depasire.stanga - 9) < 1e-9, `stanga ${r.depasire.stanga}`);
});

test('elicea care trece prin fața de sus: doar arcul de sub Z 0 (3 mm), nu tot arcul (13 mm)', () => {
  // Centrul (0, 50), raza 10, trigonometric din (−10, 50, Z 1) în (10, 50, Z −1): Z = 0 la jumătatea unghiului, în
  // punctul de jos (0, 40). Sub suprafață e doar sfertul (0, 40) → (10, 50): X minim 0, discul −3. Tot arcul ar da −13.
  const r = iesireDinFoaie(prog([
    { tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: -10, Y: 50 } }, { tip: 'taiere', la: { Z: 1 }, avans: 300 },
    { tip: 'arc', la: { X: 10, Y: 50, Z: -1 }, centru: { x: 0, y: 50 }, sens: 'trigonometric', avans: 1000 },
  ]), FOAIA);
  assert.ok(r);
  assert.ok(Math.abs(r.depasire.stanga - 3) < 1e-9, `stanga ${r.depasire.stanga}`);
});

test('un arc cu capetele aproape suprapuse: CAM-ul și postul văd același arc pe orice colț de origine', async () => {
  // Baleiajul de ~1e-12 rad e la pragul cercului întreg. Calculat o dată pe coordonatele documentului, CAM-ul și postul
  // decid la fel: un arc minuscul, nu un cerc întreg care ar ieși 1,9 mm din foaie fără declarație.
  const { posteaza } = await import('../../src/post/post.ts');
  const { GRBL_11 } = await import('../../src/post/contracte/grbl11.ts');
  const { poarta } = await import('../oracles/poarta.ts');
  // Două arce găsite prin căutare: pe document, primul e minuscul, iar pe mașină (dreapta-sus) ar fi cerc întreg;
  // al doilea, invers. Calculat pe numere diferite, baleiajul le-ar despărți.
  const cazuri = [
    { c: { x: 4.0864197523, y: 100.6913580247 }, u: 4.326237921249265 },
    { c: { x: 4.1728395046, y: 101.3827160494 }, u: 2.369290535318944 },
  ];
  for (const { c, u } of cazuri) {
  const start = { x: c.x + 3 * Math.cos(u), y: c.y + 3 * Math.sin(u) };
  const capat = { x: c.x + 3 * Math.cos(u + 1e-12), y: c.y + 3 * Math.sin(u + 1e-12) };
  const p = prog([
    { tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: start.x, Y: start.y } }, { tip: 'taiere', la: { Z: -1 }, avans: 300 },
    { tip: 'arc', la: { X: capat.x, Y: capat.y }, centru: c, sens: 'trigonometric', avans: 1000 },
  ]);
  const iesire = iesireDinFoaie(p, FOAIA);
  for (const origine of ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const) {
    const r = posteaza(p, { foaie: { ...FOAIA, grosime: 18 }, origine, z0: 'sus' }, GRBL_11, {
      asteptareAx: 3, ...(iesire ? { iesireConfirmata: iesire.depasire } : {}),
    });
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    if (!r.ok) continue;
    // Cercul întreg (raza 3, centrul la X ~4,1) iese ~1,9 mm; arcul minuscul, doar câteva sutimi.
    const cerc = /^G[23] /m.test(r.text);
    const cercCAM = (iesire?.depasire.stanga ?? 0) > 1;
    assert.equal(cerc, cercCAM, `${origine}: postul a scris ${cerc ? 'un cerc' : 'o linie'}, CAM-ul a măsurat ${JSON.stringify(iesire?.depasire)}`);
    // Oracolul independent: ce a declarat CAM-ul e exact ce taie programul scris (invarianta 5). Arcul degenerat poate
    // atinge alte reguli ale controlerului (cercul fals, invarianta 6); aici contează doar acordul asupra ieșirii.
    const ctx = { foaie: { ...FOAIA, grosime: 18 }, origine, z0: 'sus' as const, diametruScula: 6, pas: 4, supracursa: 0, asteptareAx: 3 };
    assert.deepEqual(poarta(r.text, ctx).filter((i) => i.invarianta === 5), [], origine);
  }
  }
});
