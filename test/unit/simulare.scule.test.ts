/**
 * Simularea peste schimbările sculei (ADR 0084, felia 3.8b): fiecare schimbare începe un grup cu scula ei, tăiat pe același
 * câmp; pe hârtie, două canale (Ø6 la Y 50, 2 mm; Ø20 la Y 120, 3 mm): marginile fiecăruia după raza sculei lui. Bazinul
 * (1 sau 3 benzi) dă amprenta nucleului rulat grup cu grup; o sculă greșită în grupul al doilea e refuzată cu motiv.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AXE_XYZ, type Miscare, type Program } from '../../src/ir/ir.ts';
import { simuleazaInBazin } from '../../src/jobs/bazin.ts';
import { amprentaCamp } from '../../src/sim/banda.ts';
import { campNou, compacteaza, valoare } from '../../src/sim/camp.ts';
import { ruleaza } from '../../src/sim/nucleu.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';

const MISCARI: readonly Miscare[] = [
  { tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: 20, Y: 50 } },
  { tip: 'taiere', la: { Z: -2 }, avans: 300 }, { tip: 'taiere', la: { X: 80 }, avans: 1000 }, { tip: 'rapida', la: { Z: 5 } },
  { tip: 'schimba-scula', scula: { numar: 2, nume: 'freza mare', diametru: 20 }, turatie: 12000 },
  { tip: 'rapida', la: { X: 20, Y: 120 } },
  { tip: 'taiere', la: { Z: -3 }, avans: 300 }, { tip: 'taiere', la: { X: 80 }, avans: 1000 }, { tip: 'rapida', la: { Z: 5 } },
];
const PROGRAM: Program = { axe: AXE_XYZ, scula: { numar: 1, nume: 'freza plata', diametru: 6 }, turatie: 18000, zSigur: 5, miscari: MISCARI };
const CAMP = { x0: 0, y0: 0, latime: 100, inaltime: 160, celula: 0.25, sus: 0 };
/** Z-ul câmpului în punctul (x, y) al documentului (celula care-l conține). */
const z = (F: ReturnType<typeof campNou>, x: number, y: number): number => valoare(F, Math.floor(x / 0.25), Math.floor(y / 0.25));

test('două scule: grupul al doilea taie cu raza lui (10, nu 3), pe același câmp; marginile pe hârtie', () => {
  const p = pregatesteProgram(PROGRAM, 0);
  assert.ok(p.ok, p.ok ? '' : p.motiv);
  if (!p.ok) return;
  assert.equal(p.scula.diametru, 6);
  assert.equal(p.apoi?.length, 1);
  assert.equal(p.apoi?.[0]?.scula.diametru, 20);
  const F = campNou(CAMP);
  ruleaza(F, p.scula, p.mutari);
  for (const g of p.apoi ?? []) ruleaza(F, g.scula, g.mutari);
  compacteaza(F);
  // Canalul Ø6 (raza 3) la Y 50, 2 mm; canalul Ø20 (raza 10) la Y 120, 3 mm.
  assert.deepEqual([z(F, 50, 50), z(F, 50, 52.5), z(F, 50, 53.5)], [-2, -2, 0]);
  assert.deepEqual([z(F, 50, 120), z(F, 50, 129.5), z(F, 50, 130.5), z(F, 50, 110.6)], [-3, -3, 0, -3]);
  // Un program cu o singură sculă nu primește `apoi`.
  const unu = pregatesteProgram({ ...PROGRAM, miscari: MISCARI.slice(0, 5) }, 0);
  assert.ok(unu.ok && unu.apoi === undefined);
});

test('bazinul (1 și 3 benzi) dă amprenta nucleului rulat grup cu grup; fără grupul al doilea, alta', async () => {
  const p = pregatesteProgram(PROGRAM, 0);
  assert.ok(p.ok);
  if (!p.ok) return;
  const F = campNou(CAMP);
  ruleaza(F, p.scula, p.mutari);
  for (const g of p.apoi ?? []) ruleaza(F, g.scula, g.mutari);
  compacteaza(F);
  const cerere = () => ({ camp: CAMP, scula: p.scula, mutari: p.mutari.slice(), apoi: (p.apoi ?? []).map((g) => ({ scula: g.scula, mutari: g.mutari.slice() })), fund: -18 });
  const unu = await simuleazaInBazin(cerere(), 1);
  const trei = await simuleazaInBazin(cerere(), 3);
  assert.equal(unu.amprenta, amprentaCamp(F));
  assert.equal(trei.amprenta, unu.amprenta);
  assert.equal(unu.adancimeMax, 3);
  const fara = await simuleazaInBazin({ camp: CAMP, scula: p.scula, mutari: p.mutari.slice(), fund: -18 }, 1);
  assert.notEqual(fara.amprenta, unu.amprenta);
  assert.equal(fara.adancimeMax, 2);
});

test('o sculă nevalidă după schimbare e refuzată la mișcarea ei, cu motiv', () => {
  const r = pregatesteProgram({ ...PROGRAM, miscari: MISCARI.map((m) => (m.tip === 'schimba-scula' ? { ...m, scula: { ...m.scula, diametru: 0 } } : m)) }, 0);
  assert.deepEqual(r.ok ? null : [r.motiv, r.miscare], ['scula are diametrul 0, în afara (0, 1000] mm', 5]);
});
