/**
 * Proba oracolului degroșării (felia 18.1↑d-0, ADR 0313), înaintea CAM-ului: pe hârtie, fără cod din `src/`.
 * - CL-ul cu adaosul pe un plan e cel de pe hârtie: (R + a) · g + a deasupra planului, în axă; pe normală, de la buza de sus a
 *   frezei la plan, a · (1 + g) / √(1 + g²), deci cel puțin a; pe o semisferă, CL-ul frezei plate de rază R + a, plus a;
 *   podeaua e un plan al modelului (podeaua plus a).
 * - Distanța 3D de la freza plată (cilindrul) la model, la CL-ul cu adaosul, nu coboară sub a (verificat pe eșantioane ale
 *   frezei, cu distanța punct–triunghi din oracol).
 * - Simulatorul pe operații la rând: o degroșare cu freza plată, apoi o finisare cu bila, pe același lemn, cu adâncimile pe
 *   hârtie; lemnul rămas, pe hârtie.
 * - Controalele negative cad: un vârf cu 0,01 mm sub CL-ul cu adaosul, o mutare cu 0,5 mm peste pas, o rapidă prin lemn, un
 *   vârf sub podea.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adaosPePlan, clAdaos, clExact, clPlan, clRadial, distantaPunctTriunghiO, IndexO, judecaDegrosarea, materialSecventaO, ramasO, triunghiuriModel,
  type PasO,
} from '../oracles/relief3d.ts';

const GRAD = Math.PI / 180;

function grila(nx: number, ny: number, c: number, z: (x: number, y: number) => number): Float64Array {
  const v = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = z((i + 0.5) * c, (j + 0.5) * c);
  return v;
}

test('CL-ul cu adaosul pe un plan: (R + a) · g + a deasupra planului în axă; pe normală, a · (1 + g) / √(1 + g²) ≥ a', () => {
  const c = 0.5, n = 80;
  for (const [g, R, a] of [[0, 3, 0.5], [Math.tan(30 * GRAD), 3, 0.5], [1, 2, 0.3], [0.2, 4, 1]] as const) {
    const z0 = -4;
    const ix = new IndexO(triunghiuriModel(grila(n, n, c, (x) => g * x + z0), n, n, c), 2);
    for (const [x, y] of [[20, 20], [17.3, 22.9]] as const) {
      const e = clAdaos(ix, R, a, x, y), h = g * x + z0 + adaosPePlan(R, a, g).vertical;
      assert.ok(Math.abs(e - h) < 1e-9, `g ${g}: ${e} ≠ ${h}`);
      // Și pe hârtie, din CL-ul frezei plate: clPlan(plata R + a) + a.
      assert.ok(Math.abs(e - (clPlan({ fel: 'plata', R: R + a }, g, 0, z0, x, y) + a)) < 1e-9);
    }
    const { normala } = adaosPePlan(R, a, g);
    assert.ok(normala >= a - 1e-12, `pe normală ${normala} < ${a}`);
    // Buza de sus a frezei, la (x + R, zv): distanța pe normală la plan.
    const x = 20, zv = g * x + z0 + adaosPePlan(R, a, g).vertical;
    assert.ok(Math.abs((zv - (g * (x + R) + z0)) / Math.sqrt(1 + g * g) - normala) < 1e-12);
  }
});

test('CL-ul cu adaosul pe o semisferă: între freza plată de rază R + a pe sfera înscrisă și pe sfera întreagă, plus a', () => {
  const Rs = 10, c = 0.25, n = 100, cx = 12.5, cy = 12.5;
  const sfera = (x: number, y: number): number => { const d2 = (x - cx) ** 2 + (y - cy) ** 2; return d2 < Rs * Rs ? Math.sqrt(Rs * Rs - d2) : 0; };
  const T = triunghiuriModel(grila(n, n, c, sfera), n, n, c), ix = new IndexO(T, 2);
  // ρ_min: distanța cea mai mică de la centru la triunghiurile capacului (departe de ecuator, unde panta crește fără margine).
  let rho = Infinity;
  for (let k = 0; k < T.length; k += 9) {
    const v = [0, 1, 2].map((q) => [T[k + 3 * q]!, T[k + 3 * q + 1]!, T[k + 3 * q + 2]!] as const);
    if (v.some(([x, y]) => Math.hypot(x - cx, y - cy) > 0.8 * Rs)) continue;
    rho = Math.min(rho, distantaPunctTriunghiO([cx, cy, 0], v[0]!, v[1]!, v[2]!));
  }
  assert.ok(rho > Rs - 0.01 && rho < Rs, `ρ_min = ${rho}`);
  const R = 2, a = 0.5;
  // Contactul frezei de rază R + a cade la d − (R + a) de axă: cel mult 0,8 · Rs (pe capac).
  for (const d of [0, 1.5, 4, 7, 9.5, 10.5]) {
    const e = clAdaos(ix, R, a, cx + d, cy);
    const sus = clRadial({ fel: 'plata', R: R + a }, d, Rs) + a, jos = clRadial({ fel: 'plata', R: R + a }, d, rho) + a;
    assert.ok(e <= sus + 1e-9 && e >= jos - 1e-9, `d ${d}: ${e} nu e în [${jos}, ${sus}]`);
  }
});

test('podeaua e un plan al modelului: deasupra lui, CL-ul cu adaosul e podeaua plus a', () => {
  const c = 0.5, n = 40;
  const ix = new IndexO(triunghiuriModel(grila(n, n, c, () => -9), n, n, c), 2);
  assert.ok(Math.abs(clAdaos(ix, 3, 0.5, 10, 10, -6) - -5.5) < 1e-12);
  assert.ok(Math.abs(clAdaos(ix, 3, 0.5, 10, 10, -12) - -8.5) < 1e-12);
});

test('la CL-ul cu adaosul, distanța 3D de la freza plată la model nu coboară sub a (eșantioane ale cilindrului, pe valuri)', () => {
  const c = 0.5, n = 40, R = 2, a = 0.6;
  const valuri = (x: number, y: number): number => -6 + 2 * Math.sin(x * 0.7) * Math.cos(y * 0.5) + 0.8 * Math.sin(x * 2.1 + y);
  const T = triunghiuriModel(grila(n, n, c, valuri), n, n, c), ix = new IndexO(T, 2);
  let cel = Infinity;
  for (const [x, y] of [[8, 8], [10.3, 12.1], [12.7, 6.4], [6.2, 13.3]] as const) {
    const z = clAdaos(ix, R, a, x, y);
    // Eșantioanele frezei: discul de jos și peretele, până la 3 mm deasupra vârfului.
    const pts: Array<readonly [number, number, number]> = [];
    for (let q = 0; q <= 8; q++) {
      const r = (q / 8) * R;
      for (let t = 0; t < 48; t++) pts.push([x + r * Math.cos((t * 2 * Math.PI) / 48), y + r * Math.sin((t * 2 * Math.PI) / 48), z]);
    }
    for (let h = 0; h <= 30; h++) for (let t = 0; t < 48; t++) pts.push([x + R * Math.cos((t * 2 * Math.PI) / 48), y + R * Math.sin((t * 2 * Math.PI) / 48), z + h * 0.1]);
    for (let k = 0; k < T.length; k += 9) {
      const A = [T[k]!, T[k + 1]!, T[k + 2]!] as const, B = [T[k + 3]!, T[k + 4]!, T[k + 5]!] as const, C = [T[k + 6]!, T[k + 7]!, T[k + 8]!] as const;
      if (Math.min(A[0], B[0], C[0]) > x + R + a + 1 || Math.max(A[0], B[0], C[0]) < x - R - a - 1) continue;
      if (Math.min(A[1], B[1], C[1]) > y + R + a + 1 || Math.max(A[1], B[1], C[1]) < y - R - a - 1) continue;
      for (const p of pts) cel = Math.min(cel, distantaPunctTriunghiO(p, A, B, C));
    }
  }
  assert.ok(cel >= a - 1e-9, `cel mai aproape: ${cel} < ${a}`);
  // Martorul: fără adaos (CL-ul plat de rază R), freza atinge modelul.
  assert.ok(clExact(ix, { fel: 'plata', R }, 8, 8) < clAdaos(ix, R, a, 8, 8) - a);
});

const zona = { x0: 0, y0: 0, x1: 20, y1: 20 };
const P = (x: number, y: number, z: number, rapida = false): PasO => ({ x, y, z, rapida });

test('simulatorul pe operații la rând: degroșarea plată, apoi finisarea cu bila, pe același lemn; lemnul rămas pe hârtie', () => {
  // Degroșarea: freza plată R2 coboară 2 mm la (10, 10), apoi taie spre (14, 10).
  const deg = [P(10, 10, 5, true), P(10, 10, 1, true), P(10, 10, -2), P(14, 10, -2), P(14, 10, 5)];
  // Finisarea: bila R1 coboară în șanțul degroșării la −2,5 (0,5 sub fund), apoi iese prin lemnul nescos la (17, 10).
  const fin = [P(12, 10, 5, true), P(12, 10, 0, true), P(12, 10, -2.5), P(17, 10, -2.5), P(17, 10, 5)];
  const r = materialSecventaO([{ pasi: deg, f: { fel: 'plata', R: 2 } }, { pasi: fin, f: { fel: 'bila', R: 1 } }], zona, 0.05, 0, 0.01);
  assert.ok(Math.abs(r.blocuri[0]!.taiere - 2) < 0.02, `degroșarea: ${r.blocuri[0]!.taiere}`);
  assert.equal(r.blocuri[0]!.rapida, 0);
  // Bila intră 0,5 sub fundul șanțului; ieșind la x = 17, lemnul nescos de după x = 16 e la fața plăcii: 2,5 mm.
  assert.ok(Math.abs(r.blocuri[1]!.taiere - 2.5) < 0.03, `finisarea: ${r.blocuri[1]!.taiere}`);
  // Lemnul rămas deasupra unui model plan la −3, pe linia y = 10 (coloanele de la 0,025 de ea): unde a trecut doar freza
  // plată, 1 mm (fundul −2); sub axa bilei, 0,5 (fundul −2,5).
  const plata = ramasO(r.lemn, () => -3, 0, (x, y) => x > 8.5 && x < 9.5 && Math.abs(y - 10) < 0.03);
  assert.ok(Math.abs(plata.min - 1) < 1e-9 && Math.abs(plata.max - 1) < 1e-9, `doar plata: ${plata.min} … ${plata.max}`);
  const bila = ramasO(r.lemn, () => -3, 0, (x, y) => x > 12.5 && x < 13.5 && Math.abs(y - 10) < 0.03);
  assert.ok(Math.abs(bila.min - 0.5) < 1e-3 && Math.abs(bila.max - 0.5) < 1e-3, `sub bilă: ${bila.min} … ${bila.max}`);
  assert.ok(plata.coloane > 0 && bila.coloane > 0);
});

test('judecaDegrosarea: un traseu la CL-ul cu adaosul trece; sub el cu 0,01, sub podea, prea adânc sau o rapidă prin lemn, cade', () => {
  const c = 0.5, n = 40, R = 2, a = 0.5;
  const ix = new IndexO(triunghiuriModel(grila(n, n, c, () => -6), n, n, c), 2);
  const zonaM = { x0: -5, y0: -5, x1: 25, y1: 25 };
  const bun = [P(10, 10, 5, true), P(10, 10, 0.2, true), P(10, 10, -2), P(14, 10, -2), P(14, 10, -4), P(10, 10, -4), P(10, 10, -5.5), P(14, 10, -5.5), P(14, 10, 5)];
  const o = { podea: -20, pas: 2, zona: zonaM, pasGrila: 0.1, tol: 1e-6 };
  assert.deepEqual(judecaDegrosarea(ix, R, a, bun, o), []);
  const sub = bun.map((p, k) => (k === 7 ? { ...p, z: -5.51 } : p));
  assert.ok(judecaDegrosarea(ix, R, a, sub, o).some((q) => q.fel === 'adaos'));
  assert.ok(judecaDegrosarea(ix, R, a, bun, { ...o, podea: -5 }).some((q) => q.fel === 'podea'));
  const adanc = [P(10, 10, 5, true), P(10, 10, 0.2, true), P(10, 10, -2.5), P(14, 10, -2.5), P(14, 10, 5)];
  assert.ok(judecaDegrosarea(ix, R, a, adanc, o).some((q) => q.fel === 'adancime'));
  const rapida = [...bun.slice(0, 4), P(12, 10, -2.1, true), P(14, 10, 5)];
  assert.ok(judecaDegrosarea(ix, R, a, rapida, o).some((q) => q.fel === 'rapida'));
});
