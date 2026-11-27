/**
 * Freza toroidală în oracolul 3D al reliefului (felia 18.1↑e-0, ADR 0319; ADR 0303 răspunsul 4a: finisarea reliefului cu
 * toroidala e a liniei reliefului), înaintea CAM-ului: discul plat de rază a = R − ρ cu sfertul de cerc de rază ρ în jurul lui.
 * Pe hârtie: urcarea la o rază; CL-ul pe un plan, z0 + g · a + ρ · (√(1 + g²) − 1) (bila e a = 0, plata ρ = 0); CL-ul pe o
 * semisferă, între sfera înscrisă și cea întreagă; creasta pe plan, ρ − √(ρ² − ((s − 2a) / 2)²) peste 2a, 0 sub. Controalele
 * negative cad: fără fețe sau fără muchii, CL-ul iese din margini.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clExact, clPlan, clRadial, creastaPlanFreza, creastaSimulataFreza, distantaPunctTriunghiO, IndexO, materialO, triunghiuriModel, urcareO,
  type FrezaO, type LipsaO, type PunctO,
} from '../oracles/relief3d.ts';

const GRAD = Math.PI / 180;
const TOROIDALE: readonly FrezaO[] = [{ fel: 'toroidala', R: 3, rho: 1 }, { fel: 'toroidala', R: 3, rho: 2.5 }, { fel: 'toroidala', R: 2, rho: 0.5 }];

function grila(nx: number, ny: number, c: number, z: (x: number, y: number) => number): Float64Array {
  const v = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = z((i + 0.5) * c, (j + 0.5) * c);
  return v;
}

test('urcarea toroidalei, pe hârtie: zero pe disc, sfertul de cerc în jurul lui', () => {
  const f: FrezaO = { fel: 'toroidala', R: 3, rho: 1 };
  assert.equal(urcareO(f, 0), 0);
  assert.equal(urcareO(f, 2), 0);
  assert.ok(Math.abs(urcareO(f, 3) - 1) < 1e-12);
  // La a + ρ · sin 30°: ρ · (1 − cos 30°).
  assert.ok(Math.abs(urcareO(f, 2.5) - (1 - Math.cos(30 * GRAD))) < 1e-12);
  // Cazurile de capăt: ρ = R e bila, ρ → 0 e plata.
  for (const r of [0, 0.7, 1.9, 2.6, 3]) {
    assert.ok(Math.abs(urcareO({ fel: 'toroidala', R: 3, rho: 3 }, r) - urcareO({ fel: 'bila', R: 3 }, r)) < 1e-12, `bila la ${r}`);
    assert.ok(urcareO({ fel: 'toroidala', R: 3, rho: 1e-9 }, r) < 1e-8, `plata la ${r}`);
  }
});

test('pe un plan (departe de margini), drop-cutter-ul exact cu toroidala dă CL-ul de pe hârtie', () => {
  const c = 0.5, n = 80;
  for (const [a, b, z0] of [[0, 0, 5], [Math.tan(30 * GRAD), 0, 2], [0.3, 0.4, 3], [-0.6, 0.2, 9]] as const) {
    const ix = new IndexO(triunghiuriModel(grila(n, n, c, (x, y) => a * x + b * y + z0), n, n, c), 2);
    for (const f of TOROIDALE) {
      for (const [x, y] of [[20, 20], [17.3, 22.9], [20.25, 19.75]] as const) {
        const e = clExact(ix, f, x, y), h = clPlan(f, a, b, z0, x, y);
        assert.ok(Math.abs(e - h) < 1e-9, `toroidala R${f.R} ρ${f.fel === 'toroidala' ? f.rho : ''} pe planul ${a}, ${b}: ${e} ≠ ${h}`);
      }
    }
  }
  // Formula de pe hârtie, la capete: cu ρ = R, bila; cu ρ → 0, plata.
  const g = Math.hypot(0.3, 0.4);
  assert.ok(Math.abs(clPlan({ fel: 'toroidala', R: 3, rho: 3 }, 0.3, 0.4, 1, 0, 0) - (1 + 3 * (Math.sqrt(1 + g * g) - 1))) < 1e-12);
  assert.ok(Math.abs(clPlan({ fel: 'toroidala', R: 3, rho: 1e-12 }, 0.3, 0.4, 1, 0, 0) - (1 + 3 * g)) < 1e-9);
});

test('pe o semisferă: CL-ul toroidalei stă între sfera înscrisă și sfera întreagă; fără fețe sau fără muchii, iese', () => {
  const Rs = 12, c = 0.8, n = 40, cx = 16, cy = 16;
  const sfera = (x: number, y: number): number => { const d2 = (x - cx) ** 2 + (y - cy) ** 2; return d2 < Rs * Rs ? Math.sqrt(Rs * Rs - d2) : 0; };
  const T = triunghiuriModel(grila(n, n, c, sfera), n, n, c), ix = new IndexO(T, 2);
  let rho = Infinity;
  for (let k = 0; k < T.length; k += 9) {
    const v = [0, 1, 2].map((q) => [T[k + 3 * q]!, T[k + 3 * q + 1]!, T[k + 3 * q + 2]!] as const);
    if (v.some(([x, y]) => Math.hypot(x - cx, y - cy) > 0.8 * Rs)) continue;
    rho = Math.min(rho, distantaPunctTriunghiO([cx, cy, 0], v[0]!, v[1]!, v[2]!));
  }
  const puncte: Array<readonly [number, number]> = [];
  for (let q = 0; q < 200; q++) { const r = (q % 20) * 0.25, u = q * 2.399; puncte.push([cx + r * Math.cos(u), cy + r * Math.sin(u)]); }
  const afara = (f: FrezaO, lipsa: LipsaO): number => puncte.filter(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy), e = clExact(ix, f, x, y, 0, lipsa);
    return e < clRadial(f, d, rho) - 1e-9 || e > clRadial(f, d, Rs) + 1e-9;
  }).length;
  for (const f of [...TOROIDALE, { fel: 'toroidala', R: 1, rho: 0.4 } as const]) assert.equal(afara(f, null), 0, JSON.stringify(f));
  // R0,8 cu ρ0,7 (discul plat de 0,1): pe celula de 0,8, contactele cad și pe fețe, și pe muchii (sondat: 11, 4, 151).
  const mica: FrezaO = { fel: 'toroidala', R: 0.8, rho: 0.7 };
  assert.ok(afara(mica, 'fete') >= 5, `fără fețe: ${afara(mica, 'fete')}`);
  assert.ok(afara(mica, 'muchii') >= 1, `fără muchii: ${afara(mica, 'muchii')}`);
  assert.ok(afara(mica, 'noduri') >= 50, `doar în noduri: ${afara(mica, 'noduri')}`);
  // Semisfera pe hârtie: pe axă, discul plat stă pe vârful ei; la distanța d > a, tubul atinge sfera.
  const f: FrezaO = { fel: 'toroidala', R: 3, rho: 1 };
  assert.equal(clRadial(f, 1.5, 12), 12);
  assert.ok(Math.abs(clRadial(f, 6, 12) - (Math.sqrt(13 * 13 - 16) - 1)) < 1e-12);
});

test('creasta pe un plan, cu toroidala: simulatorul dă ρ − √(ρ² − ((s − 2a) / 2)²) peste 2a, zero sub', () => {
  const pasEs = 0.02;
  for (const [R, rho, s] of [[3, 1, 4.6], [3, 1, 5.5], [3, 2.5, 2], [3, 1, 3.5], [2, 0.5, 3.5]] as const) {
    const f: FrezaO = { fel: 'toroidala', R, rho };
    const treceri: PunctO[][] = [-1, 0, 1, 2].map((k) => [{ x: k * s, y: -5, z: 0 }, { x: k * s, y: 5, z: 0 }]);
    const puncte: Array<readonly [number, number]> = [];
    for (let q = 0; q <= 200; q++) puncte.push([(q / 200) * s, 0]);
    const h = creastaSimulataFreza(treceri, f, puncte, () => 0, pasEs);
    const a = R - rho, pe = s > 2 * a ? rho - Math.sqrt(rho * rho - ((s - 2 * a) / 2) ** 2) : 0;
    assert.ok(Math.abs(h - pe) < 1e-9, `R${R} ρ${rho} s${s}: ${h} ≠ ${pe}`);
    assert.ok(Math.abs(creastaPlanFreza(f, s) - pe) < 1e-12);
  }
  // Bila prin aceleași funcții: R − √(R² − (s / 2)²).
  assert.ok(Math.abs(creastaPlanFreza({ fel: 'bila', R: 3 }, 1) - (3 - Math.sqrt(9 - 0.25))) < 1e-12);
});

test('simulatorul de material cu toroidala: o plonjare măsoară adâncimea ei; pe o linie, lemnul ia forma frezei', () => {
  const f: FrezaO = { fel: 'toroidala', R: 3, rho: 1 };
  const zona = { x0: -10, y0: -10, x1: 10, y1: 10 };
  const m = materialO([{ x: 0, y: 0, z: 5, rapida: true }, { x: 0, y: 0, z: -2, rapida: false }], f, zona, 0.1);
  assert.ok(Math.abs(m.taiere - 2) < 1e-9, `plonjarea: ${m.taiere}`);
  assert.equal(m.rapida, 0);
});
