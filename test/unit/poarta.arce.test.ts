/**
 * Invarianta 6, arcul de peste 180° pe un bloc: semicercurile postului rotunjite la 3 zecimale (180.00x°) trec, cercul fals
 * (blocul care se închide, 360° pe GRBL) și arcul adevărat de 181° rămân prinse. Pragul: π + min(2·TOL_ROTUNJIRE / r, π/2).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poarta, type ContextPoarta } from '../oracles/poarta.ts';
import { regulaArcGrbl, type Mutare } from '../oracles/gcode.ts';

const CTX: ContextPoarta = {
  foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 4, supracursa: 0, asteptareAx: 3,
};
const prog = (...linii: string[]): string =>
  `${['G90 G17 G21 G94', 'G54', 'G0 Z5.000', 'M3 S18000', 'G4 P3.000', ...linii, 'G0 Z5.000', 'M5', 'M30'].join('\n')}\n`;
const arce6 = (text: string): string[] => poarta(text, CTX).filter((i) => i.invarianta === 6).map((i) => i.mesaj);
const f3 = (v: number): string => (v.toFixed(3) === '-0.000' ? '0.000' : v.toFixed(3));
const r3 = (v: number): number => Number(f3(v));

test('(a) semicercul aplicației din (159.589, 75.463), G3 X110.725 Y93.248 I-24.432 J8.893: 180.002° pe GRBL, trece invarianta 6', () => {
  const t = prog('G0 X159.589 Y75.463', 'G1 Z-1.000 F300.0', 'G3 X110.725 Y93.248 I-24.432 J8.893 F1000.0');
  const m: Mutare = { cod: 3, linia: 0, startCunoscut: true, a: [159.589, 75.463, -1], b: [110.725, 93.248, -1], i: -24.432, j: 8.893 };
  const { unghi, raza } = regulaArcGrbl(m);
  // Pragul vechi (π + 1e-6) îl prindea: 3.6e-5 rad peste π. Toleranța nouă la r = 26: 0.004 / 26 = 1.5e-4 rad.
  assert.ok(Math.abs(unghi) - Math.PI > 1e-6 && Math.abs(unghi) - Math.PI < (2 * 0.002) / raza, `${Math.abs(unghi) - Math.PI}`);
  assert.deepEqual(arce6(t), []);
});

test('(b) semicercul cu cea mai rea rotunjire a postului (capetele și I/J din startul rotunjit, la 3 zecimale) trece, la r = 0.05 … 50', () => {
  // Pentru fiecare rază: centrul exact (100 + u, 100 + v), u, v pe o grilă de 0.0001 în [0, 0.001); startul la k·5°;
  // G3 (spre +180°) și G2 (spre −180°). Postul: startul rotunjit, I/J = centrul − startul rotunjit, rotunjite; capătul
  // rotunjit. Se caută cea mai mare depășire a lui π, apoi programul ei trece prin poartă.
  const rapoarte: string[] = [];
  for (const r of [0.05, 0.5, 5, 50]) {
    let rau = { peste: -Infinity, linii: [] as string[] };
    for (let ui = 0; ui < 10; ui++) {
      for (let vi = 0; vi < 10; vi++) {
        const cx = 100 + ui * 1e-4, cy = 100 + vi * 1e-4;
        for (let k = 0; k < 72; k++) {
          const t0 = (k * 5 * Math.PI) / 180;
          for (const cod of [2, 3] as const) {
            const t1 = t0 + (cod === 3 ? Math.PI : -Math.PI);
            const sx = r3(cx + r * Math.cos(t0)), sy = r3(cy + r * Math.sin(t0));
            const i = r3(cx - sx), j = r3(cy - sy);
            const ex = r3(cx + r * Math.cos(t1)), ey = r3(cy + r * Math.sin(t1));
            const m: Mutare = { cod, linia: 0, startCunoscut: true, a: [sx, sy, -1], b: [ex, ey, -1], i, j };
            const { unghi, eroare33 } = regulaArcGrbl(m);
            assert.ok(!eroare33);
            const peste = Math.abs(unghi) - Math.PI;
            if (peste > rau.peste) {
              rau = { peste, linii: [`G0 X${f3(sx)} Y${f3(sy)}`, 'G1 Z-1.000 F300.0', `G${cod} X${f3(ex)} Y${f3(ey)} I${f3(i)} J${f3(j)} F1000.0`] };
            }
          }
        }
      }
    }
    // Cel mai rău caz depășește pragul vechi (deci testul chiar probează ceva) și stă sub 2·0.002 / r.
    assert.ok(rau.peste > 1e-6, `r = ${r}: ${rau.peste}`);
    assert.ok(rau.peste * r < 0.004, `r = ${r}: depășirea ${rau.peste} × r = ${rau.peste * r}`);
    assert.deepEqual(arce6(prog(...rau.linii)), [], `r = ${r}: ${rau.linii.join(' | ')}`);
    rapoarte.push(`r ${r}: ${(rau.peste * r).toExponential(2)} rad·mm`);
  }
  assert.equal(rapoarte.length, 4);
});

test('(c) cercul fals (blocul care se închide, 360° pe GRBL) și arcul de 181° rămân prinse, la orice rază', () => {
  // Cercul fals: capătul = startul, deci GRBL adaugă 2π. La r = 10, 0.5 și 0.001 (toleranța plafonată la π/2).
  for (const [x, i] of [['30.000', '-10.000'], ['100.500', '-0.500'], ['100.001', '-0.001']] as const) {
    const t = prog(`G0 X${x} Y20.000`, 'G1 Z-1.000 F300.0', `G3 X${x} Y20.000 I${i} J0.000 F1000.0`);
    assert.deepEqual(arce6(t), ['arc de 360.0° pe un bloc (cerc fals?)'], `I${i}`);
  }
  // 181° în jurul (100, 100): la r = 10, capătul (90.002, 99.825); la r = 0.5, (99.500, 99.991). Depășirea 0.0175 rad e
  // peste toleranța 0.0004 (r = 10), respectiv 0.008 (r = 0.5).
  const r10 = prog('G0 X110.000 Y100.000', 'G1 Z-1.000 F300.0', 'G3 X90.002 Y99.825 I-10.000 J0.000 F1000.0');
  assert.deepEqual(arce6(r10), ['arc de 181.0° pe un bloc (cerc fals?)']);
  const r05 = prog('G0 X100.500 Y100.000', 'G1 Z-1.000 F300.0', 'G3 X99.500 Y99.991 I-0.500 J0.000 F1000.0');
  assert.deepEqual(arce6(r05), ['arc de 181.0° pe un bloc (cerc fals?)']);
});
