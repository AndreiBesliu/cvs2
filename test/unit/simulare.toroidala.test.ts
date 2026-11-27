/**
 * Nucleul simulării cu freza toroidală (ADR 0303 §2, felia 16.A↑e-1): discul plat de rază a = R − ρ și sfertul de cerc de rază
 * ρ în jurul lui. Proba e oracolul simulării (`test/oracles/simulare.ts`, felul `toroidala`, cu h scris altfel decât nucleul:
 * ρ·(1 − cos(asin((r − a)/ρ)))), pe plonjări, linii orizontale și înclinate (în ambele sensuri, cu panta mai mică și mai mare
 * decât a sculei), linii oblice în XY și arce la Z constant: pe fiecare piesă, nucleul nu e mai sus decât oracolul cu peste
 * 10 nm și nici mai jos peste marjă. Pe hârtie: secțiunea canelurii (fundul cât discul, apoi sfertul de cerc) și punctul de
 * pe axa unei rampe, z = z_P − |m|·a + ρ·(1 − √(1 + m²)).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AXE_XYZ, type FormaScula, type Miscare, type Program } from '../../src/ir/ir.ts';
import { campNou, compacteaza } from '../../src/sim/camp.ts';
import { ruleaza } from '../../src/sim/nucleu.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { scrieGcode, type MutareCaz } from '../oracles/simulare.cazuri.ts';
import { compara, judeca, silueta, type GrilaOracol, type P3, type SculaOracol } from '../oracles/simulare.ts';
import { densPe, parametriGrila } from './ajutor-simulare.ts';

/** Programul IR al mutărilor, cu legătura corpusului (Z5, rapida la start, coborârea), ca `programCaz`. */
function program(mutari: readonly MutareCaz[], diametru: number, forma: FormaScula): Program {
  const m: Miscare[] = [{ tip: 'rapida', la: { Z: 5 } }];
  let poz: P3 | undefined;
  for (const x of mutari) {
    const [ax, ay, az] = x.a;
    if (!poz || poz[0] !== ax || poz[1] !== ay || poz[2] !== az) {
      m.push({ tip: 'rapida', la: { Z: 5 } }, { tip: 'rapida', la: { X: ax, Y: ay } }, { tip: 'taiere', la: { Z: az }, avans: 300 });
    }
    const [bx, by, bz] = x.b;
    m.push(x.tip === 'linie'
      ? { tip: 'taiere', la: { X: bx, Y: by, Z: bz }, avans: 1000 }
      : { tip: 'arc', la: { X: bx, Y: by, Z: bz }, centru: { x: x.centru[0], y: x.centru[1] }, sens: x.sens, avans: 1000 });
    poz = x.b;
  }
  m.push({ tip: 'rapida', la: { Z: 5 } });
  return { axe: AXE_XYZ, scula: { numar: 1, nume: 'toroidala', diametru, forma }, turatie: 18000, zSigur: 5, miscari: m };
}

function nucleu(mutari: readonly MutareCaz[], grila: GrilaOracol, diametru: number, forma: FormaScula): Float64Array {
  const p = pregatesteProgram(program(mutari, diametru, forma), 0);
  assert.ok(p.ok, p.ok ? '' : p.motiv);
  if (!p.ok) return new Float64Array();
  const F = campNou(parametriGrila(grila));
  ruleaza(F, p.scula, p.mutari);
  compacteaza(F);
  return densPe(F, grila);
}

const L = (a: P3, b: P3): MutareCaz => ({ tip: 'linie', a, b });
const A = (sens: 'orar' | 'trigonometric', a: P3, b: P3, c: readonly [number, number]): MutareCaz => ({ tip: 'arc', sens, a, b, centru: c });
const G: GrilaOracol = { x0: 0, y0: 0, latime: 30, inaltime: 20, celula: 0.05 };

const PIESE: ReadonlyArray<{ readonly id: string; readonly diametru: number; readonly raza: number; readonly mutari: readonly MutareCaz[] }> = [
  { id: 'linie la −1 (sub raza colțului), Ø6 r1,5', diametru: 6, raza: 1.5, mutari: [L([5, 10, -1], [25, 10, -1])] },
  { id: 'linie la −3 (peste raza colțului), Ø6 r1', diametru: 6, raza: 1, mutari: [L([5, 10, -3], [25, 10, -3])] },
  { id: 'linie oblică în XY la −0,6, Ø8 r0,5', diametru: 8, raza: 0.5, mutari: [L([4, 4, -0.6], [26, 15, -0.6])] },
  // Pantă mică (|m| = 0,075): punctul staționar pe sfertul de cerc, pe celulele de lângă axă și pe cele de pe disc.
  { id: 'rampă lină 0 → −1,5, Ø6 r1,5', diametru: 6, raza: 1.5, mutari: [L([4, 10, 0], [24, 10, -1.5])] },
  { id: 'rampă lină oblică în XY, care urcă −2 → −0,4, Ø6 r2', diametru: 6, raza: 2, mutari: [L([5, 5, -2], [25, 13, -0.4])] },
  // Pantă mare (|m| = 2): capătul segmentului, sau punctul de pe sfertul de cerc unde panta lui ajunge la m.
  { id: 'coborâre abruptă și ieșirea lină, Ø4 r0,8', diametru: 4, raza: 0.8, mutari: [L([10, 10, -0.2], [11, 10, -2.2]), L([11, 10, -2.2], [20, 10, -0.5])] },
  { id: 'arc la −0,8 și cercul întreg la −2,5, Ø6 r1', diametru: 6, raza: 1, mutari: [
    A('trigonometric', [20, 10, -0.8], [10, 10, -0.8], [15, 10]), A('orar', [7, 4, -2.5], [7, 4, -2.5], [7, 7]),
  ] },
  { id: 'plonjări: −1 și −3, Ø8 r2', diametru: 8, raza: 2, mutari: [L([8, 8, 0], [8, 8, -1]), L([20, 12, 0], [20, 12, -3])] },
];

for (const c of PIESE) {
  test(`toroidala: nucleul față de oracol, ${c.id}`, () => {
    const s: SculaOracol = { tip: 'toroidala', diametru: c.diametru, raza: c.raza };
    const o = judeca(scrieGcode(c.mutari), G, s);
    const z = nucleu(c.mutari, G, c.diametru, { tip: 'toroidala', raza: c.raza });
    const cmp = compara(z, o, s);
    assert.equal(cmp.maiSus, 0, `nucleul mai sus pe ${cmp.maiSus} celule (max ${cmp.maiSusMax}, prima ${JSON.stringify(cmp.primaMaiSus)})`);
    assert.equal(cmp.maiJosPesteMarja, 0, `nucleul sub marja ${cmp.marja} pe ${cmp.maiJosPesteMarja} celule`);
    // Proba are dinți: bila de același diametru (fără discul plat) pică pe aceeași piesă.
    const bila = nucleu(c.mutari, G, c.diametru, { tip: 'bila' });
    const alt = compara(bila, o, s);
    assert.ok(alt.maiSus > 0 || alt.maiJosPesteMarja > 0, 'bila trece și ea: piesa nu vede discul toroidalei');
  });
}

test('toroidala în oracol, pe hârtie: Ø10 cu raza colțului 2 (a = 3): h(0) = h(3) = 0, h(4) = 2 − √3, h(5) = 2', () => {
  const S = silueta({ tip: 'toroidala', diametru: 10, raza: 2 });
  assert.equal(S.raza, 5);
  for (const [r, h] of [[0, 0], [1.5, 0], [3, 0], [4, 2 - Math.sqrt(3)], [5, 2]] as const) {
    assert.ok(Math.abs(S.h(r) - h) < 1e-12, `h(${r}) = ${S.h(r)} în loc de ${h}`);
  }
  for (const raza of [0, -1, 5, 6, Number.NaN]) {
    assert.throws(() => silueta({ tip: 'toroidala', diametru: 10, raza }), /raza colțului/, `raza ${raza}`);
  }
});

test('toroidala pe hârtie: canelura la −1 cu Ø6 r1,5 (a = 1,5): fundul cât discul, apoi sfertul de cerc; lățimea 2·(a + √(ρ² − (ρ − d)²)) = 5,828 mm', () => {
  const g: GrilaOracol = { x0: 10, y0: 6.9, latime: 2, inaltime: 6.2, celula: 0.005 };
  const z = nucleu([L([5, 10, -1], [25, 10, -1])], g, 6, { tip: 'toroidala', raza: 1.5 });
  const nx = 400, i = 200, ny = 1240; // coloana x = 11,0025, departe de capete
  const a = 1.5, rho = 1.5, d = 1;
  for (let j = 0; j < ny; j++) {
    const y = g.y0 + (j + 0.5) * g.celula, q = Math.abs(y - 10);
    // Pe hârtie: −1 pe disc (q ≤ a), apoi −1 + ρ − √(ρ² − (q − a)²) până la față (q ≤ R = 3), fața dincolo.
    const ideal = q <= a ? -d : q <= 3 ? Math.min(0, -d + rho - Math.sqrt(rho * rho - (q - a) * (q - a))) : 0;
    // Câmpul ține Z-ul pe 32 de biți (`camp.ts`): 1e-7 mm.
    assert.ok(Math.abs(z[j * nx + i]! - ideal) <= 1e-7, `y = ${y}: ${z[j * nx + i]} în loc de ${ideal}`);
  }
  const latime = 2 * (a + Math.sqrt(rho * rho - (rho - d) * (rho - d)));
  assert.ok(Math.abs(latime - 5.8284) < 1e-4);
});

test('toroidala pe hârtie: pe axa unei rampe line (m = −0,1), Ø6 r1,5, z = z_P − |m|·a + ρ·(1 − √(1 + m²))', () => {
  // Rampa de la (5, 10, 0) la (25, 10, −2): pe axa ei, la x = 15, z_P = −1; cel mai jos punct al sculei deasupra celulei e
  // pe sfertul de cerc, unde panta lui e |m|: e = ρ·|m| / √(1 + m²) dincolo de disc.
  const g: GrilaOracol = { x0: 14.9, y0: 9.9, latime: 0.2, inaltime: 0.2, celula: 0.01 };
  const z = nucleu([L([5, 10, 0], [25, 10, -2])], g, 6, { tip: 'toroidala', raza: 1.5 });
  const nx = 20;
  for (const [i, j] of [[9, 9], [10, 10], [3, 10], [16, 9]] as const) {
    const x = g.x0 + (i + 0.5) * g.celula, y = g.y0 + (j + 0.5) * g.celula;
    if (Math.abs(y - 10) > 0.006) continue; // doar celulele de pe axă (y = 9,995 și 10,005 sunt la 0,005 de ea)
    const m = -0.1, zP = -(x - 5) * 0.1, a = 1.5, rho = 1.5;
    // La 0,005 de axă, discul acoperă celula: cel mai jos punct e tot pe axa de mișcare, cu e mutat cu sub 1e-5 mm.
    const ideal = zP - Math.abs(m) * a + rho * (1 - Math.sqrt(1 + m * m));
    assert.ok(Math.abs(z[j * nx + i]! - ideal) <= 2e-6, `(${x}, ${y}): ${z[j * nx + i]} în loc de ${ideal}`);
  }
});

test('toroidala nevalidă e refuzată de simulare, cu motiv: raza colțului ≤ 0, cât jumătatea diametrului sau peste, nefinită', () => {
  for (const raza of [0, -0.5, 3, 4, Number.NaN]) {
    const p = pregatesteProgram(program([L([5, 10, -1], [25, 10, -1])], 6, { tip: 'toroidala', raza }), 0);
    assert.ok(!p.ok && /raza colțului/.test(p.motiv), `${raza}: ${p.ok ? 'acceptat' : p.motiv}`);
  }
});

test('elicea cu toroidala se simulează din e-2 (simulare.elice.test.ts); cea cu freza plată, ca azi', () => {
  const elice = [A('trigonometric', [20, 10, -0.5], [20, 10, -1.5], [15, 10])];
  const p = pregatesteProgram(program(elice, 6, { tip: 'toroidala', raza: 1 }), 0);
  assert.ok(p.ok, p.ok ? '' : p.motiv);
  assert.ok(pregatesteProgram(program(elice, 6, { tip: 'plata' }), 0).ok);
});
