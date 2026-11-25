/**
 * Proba oracolului 3D al reliefului (ADR 0310 §10, felia 18.1↑c-0), înaintea CAM-ului finisării: drop-cutter-ul exact pe
 * modelul unui relief dă CL-ul de pe hârtie pe un plan (orizontal, la 30°, oblic) cu bila, plata, V90 și V60; pe o semisferă
 * „înscrisă” (centrele celulelor pe sferă), CL-ul stă între sfera înscrisă și sfera întreagă; simulatorul crestei dă formula
 * pe plan. Controalele negative cad: fără muchii sau fără fețe, CL-ul iese din margini; cu eșantionul în nod, un traseu
 * scobește modelul, iar `judecaTraseul` o vede; un traseu sub fundul trecerii e văzut și el.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clExact, clPlan, clRadial, creastaPlan, creastaSimulata, distantaPunctTriunghiO, IndexO, judecaTraseul, materialO, triunghiuriModel, urcareO,
  type FrezaO, type LipsaO, type PasO, type PunctO,
} from '../oracles/relief3d.ts';

const GRAD = Math.PI / 180;
const FREZE: readonly FrezaO[] = [
  { fel: 'bila', R: 3 }, { fel: 'plata', R: 3 }, { fel: 'v', R: 6, alfa: 45 * GRAD }, { fel: 'v', R: 6, alfa: 30 * GRAD },
  // V-ul cu vârful plat (conul trunchiat; freza de gravare, ADR 0092): raza vârfului 0,5.
  { fel: 'v', R: 6, alfa: 45 * GRAD, t: 0.5 },
];

/** Grila unei funcții, în centrele celulelor (rândul j în sus). */
function grila(nx: number, ny: number, c: number, z: (x: number, y: number) => number): Float64Array {
  const v = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = z((i + 0.5) * c, (j + 0.5) * c);
  return v;
}

test('modelul exact: (nx + 1)(ny + 1) pătrate, două triunghiuri fiecare, rândul de margine cu valoarea celulei de margine', () => {
  const T = triunghiuriModel([1, 2, 3, 4], 2, 2, 0.5);
  assert.equal(T.length, 3 * 3 * 2 * 9);
  // Primul pătrat: colțul (0, 0) al dreptunghiului, (0,25, 0), (0, 0,25), cu valoarea celulei (0, 0).
  assert.deepEqual([...T.subarray(0, 9)], [0, 0, 1, 0.25, 0, 1, 0, 0.25, 1]);
  // Ultimul vârf: colțul (1, 1), cu valoarea celulei (1, 1).
  assert.deepEqual([...T.subarray(T.length - 3)], [0.75, 1, 4]);
});

test('pe un plan (departe de margini), drop-cutter-ul exact dă CL-ul de pe hârtie, cu toate frezele', () => {
  const c = 0.5, n = 80;
  for (const [a, b, z0] of [[0, 0, 5], [Math.tan(30 * GRAD), 0, 2], [0.3, 0.4, 3]] as const) {
    const ix = new IndexO(triunghiuriModel(grila(n, n, c, (x, y) => a * x + b * y + z0), n, n, c), 2);
    for (const f of FREZE) {
      for (const [x, y] of [[20, 20], [17.3, 22.9], [20.25, 19.75]] as const) {
        const e = clExact(ix, f, x, y), h = clPlan(f, a, b, z0, x, y);
        assert.ok(Math.abs(e - h) < 1e-9, `${f.fel} pe planul ${a}, ${b}: ${e} ≠ ${h}`);
      }
    }
  }
});

test('o semisferă cu centrele celulelor pe ea: CL-ul stă între sfera înscrisă (ρ_min) și sfera întreagă; fără muchii, fără fețe sau doar în noduri, iese', () => {
  // Celula de 0,8 mm și bila R1: triunghiurile sunt destul de mari față de bilă ca un contact să cadă pe o față sau pe o muchie.
  const Rs = 12, c = 0.8, n = 40, cx = 16, cy = 16;
  const sfera = (x: number, y: number): number => { const d2 = (x - cx) ** 2 + (y - cy) ** 2; return d2 < Rs * Rs ? Math.sqrt(Rs * Rs - d2) : 0; };
  const T = triunghiuriModel(grila(n, n, c, sfera), n, n, c), ix = new IndexO(T, 2);
  // ρ_min: distanța cea mai mică de la centru la triunghiurile capacului (toate vârfurile pe sferă, departe de ecuator).
  let rho = Infinity;
  for (let k = 0; k < T.length; k += 9) {
    const v = [0, 1, 2].map((q) => [T[k + 3 * q]!, T[k + 3 * q + 1]!, T[k + 3 * q + 2]!] as const);
    if (v.some(([x, y]) => Math.hypot(x - cx, y - cy) > 0.8 * Rs)) continue;
    rho = Math.min(rho, distantaPunctTriunghiO([cx, cy, 0], v[0]!, v[1]!, v[2]!));
  }
  assert.ok(rho > Rs - 0.05 && rho < Rs, `ρ_min = ${rho}`);
  const puncte: Array<readonly [number, number]> = [];
  for (let q = 0; q < 200; q++) { const r = (q % 20) * 0.25, u = q * 2.399; puncte.push([cx + r * Math.cos(u), cy + r * Math.sin(u)]); }
  const afara = (f: FrezaO, lipsa: LipsaO): number => puncte.filter(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy), e = clExact(ix, f, x, y, 0, lipsa);
    return e < clRadial(f, d, rho) - 1e-9 || e > clRadial(f, d, Rs) + 1e-9;
  }).length;
  for (const R of [1, 2, 3, 6]) assert.equal(afara({ fel: 'bila', R }, null), 0, `bila R${R}`);
  const mica: FrezaO = { fel: 'bila', R: 1 };
  assert.ok(afara(mica, 'fete') >= 5, `fără fețe: ${afara(mica, 'fete')} puncte în afara marginilor`);
  assert.ok(afara(mica, 'muchii') >= 1, `fără muchii: ${afara(mica, 'muchii')}`);
  assert.ok(afara(mica, 'noduri') >= 50, `doar în noduri: ${afara(mica, 'noduri')}`);
});

test('judecaTraseul: un traseu din CL-ul exact nu scobește; cel din eșantionul în nod, da; sub fundul trecerii, adâncimea', () => {
  const Rs = 10, c = 0.5, n = 60, cx = 15, cy = 15;
  const sfera = (x: number, y: number): number => { const d2 = (x - cx) ** 2 + (y - cy) ** 2; return d2 < Rs * Rs ? Math.sqrt(Rs * Rs - d2) : 0; };
  const ix = new IndexO(triunghiuriModel(grila(n, n, c, sfera), n, n, c), 2);
  const plata: FrezaO = { fel: 'plata', R: 1.5 };
  const linie = (lipsa: LipsaO): PunctO[] => {
    const p: PunctO[] = [];
    for (let i = 0; i < n; i++) { const x = (i + 0.5) * c, y = 15.1; p.push({ x, y, z: clExact(ix, plata, x, y, 0, lipsa) }); }
    return p;
  };
  assert.deepEqual(judecaTraseul(ix, plata, linie(null), { podea: 0, tol: 1e-9 }), []);
  const nod = judecaTraseul(ix, plata, linie('noduri'), { podea: 0, tol: 1e-6 });
  assert.ok(nod.some((x) => x.fel === 'scobitura' && x.cu > 0.01), `eșantionul în nod: ${Math.max(0, ...nod.map((x) => x.cu))} mm`);
  const adanc = judecaTraseul(ix, plata, linie(null), { podea: 0, fundTrecere: 5, tol: 1e-9 });
  assert.ok(adanc.some((x) => x.fel === 'adancime'), 'traseul coboară sub fundul trecerii (Z 5)');
});

test('creasta: simulatorul independent dă formula pe plan, și cu panta transversală de 20°', () => {
  for (const [R, s, teta] of [[3, 1, 0], [3, 0.5, 0], [1.5, 0.3, 0], [3, 1, 20 * GRAD]] as const) {
    const b = Math.tan(teta), bila: FrezaO = { fel: 'bila', R };
    const treceri: PunctO[][] = [];
    for (let k = -3; k <= 3; k++) {
      const y = 20 + k * s, z = clPlan(bila, 0, b, 5, 0, y);
      treceri.push([{ x: 18, y, z }, { x: 22, y, z }]);
    }
    const puncte: Array<readonly [number, number]> = [];
    for (let q = 0; q <= 400; q++) puncte.push([20, 20 - s + (2 * s * q) / 400]);
    const m = creastaSimulata(treceri, R, puncte, (_x, y) => b * y + 5, 0.01);
    const h = creastaPlan(R, s, teta);
    assert.ok(Math.abs(m - h) < 2e-4 * Math.max(1, h * 10), `R ${R}, s ${s}, θ ${teta}: ${m} ≠ ${h}`);
  }
});

test('materialO: plonjarea măsoară toată adâncimea; tăierea în lemn nou, pasul; aceeași linie a doua oară, nimic; rapida prin lemn se vede', () => {
  const zona = { x0: 0, y0: 0, x1: 20, y1: 20 };
  const P = (x: number, y: number, z: number, rapida = false): PasO => ({ x, y, z, rapida });
  const plata: FrezaO = { fel: 'plata', R: 1 };
  // Plonjarea de la 5 la −2 (o tăiere): 2 mm; apoi linia la −2: 2 mm; înapoi pe ea: nimic.
  assert.ok(Math.abs(materialO([P(5, 5, 5), P(5, 5, -2)], plata, zona, 0.1).taiere - 2) < 1e-9);
  assert.ok(Math.abs(materialO([P(5, 5, 5), P(5, 5, -2), P(8, 5, -2)], plata, zona, 0.1).taiere - 2) < 1e-9);
  const dus = materialO([P(5, 5, 5), P(5, 5, -2), P(8, 5, -2), P(5, 5, -2, false)], plata, zona, 0.1);
  assert.ok(Math.abs(dus.taiere - 2) < 1e-9);
  // Două treceri pe aceeași linie: −2, apoi −4: fiecare intră 2 mm.
  const doua = materialO([P(5, 5, 5), P(5, 5, -2), P(8, 5, -2), P(8, 5, -4), P(5, 5, -4)], plata, zona, 0.1);
  assert.ok(Math.abs(doua.taiere - 2) < 1e-9, `două treceri: ${doua.taiere}`);
  // Rapida în sus, prin golul tăiat: nimic; rapida la −1 prin lemn nou: 1 mm, văzută ca rapidă.
  const sus = materialO([P(5, 5, 5), P(5, 5, -2), P(5, 5, 5, true)], plata, zona, 0.1);
  assert.equal(sus.rapida, 0);
  const prin = materialO([P(5, 5, 5), P(5, 5, -2), P(5, 5, -1, true), P(5, 9, -1, true)], plata, zona, 0.1);
  assert.ok(Math.abs(prin.rapida - 1) < 1e-9, `rapida prin lemn: ${prin.rapida}`);
  // Bila R3 coborâtă la −3 în (10, 10): 3 mm pe axă (coloana cea mai apropiată, la 0,07 mm de axă).
  const bila = materialO([P(10, 10, 5), P(10, 10, -3)], { fel: 'bila', R: 3 }, zona, 0.1);
  assert.ok(Math.abs(bila.taiere - 3) < 1e-3, `bila: ${bila.taiere}`);
  // Controlul: fără mutări care coboară, nimic.
  assert.equal(materialO([P(5, 5, 5), P(9, 9, 5)], plata, zona, 0.1).taiere, 0);
});

/** Cota modelului în (x, y), din triunghiurile indexului (interpolarea pe triunghiul care conține punctul). */
function zModel(ix: IndexO, x: number, y: number): number {
  const T = ix.T;
  for (const k of ix.aproape(x, y, 1e-9)) {
    const o = 9 * k, ax = T[o]!, ay = T[o + 1]!, bx = T[o + 3]!, by = T[o + 4]!, cx = T[o + 6]!, cy = T[o + 7]!;
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (d === 0) continue;
    const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d, l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d, l3 = 1 - l1 - l2;
    if (l1 >= -1e-12 && l2 >= -1e-12 && l3 >= -1e-12) return l1 * T[o + 2]! + l2 * T[o + 5]! + l3 * T[o + 8]!;
  }
  return -Infinity;
}

test('vârful plat al V-ului (conul trunchiat): drop-cutter-ul exact stă peste orice punct eșantionat al modelului și aproape de cel mai înalt', () => {
  // Un relief aspru (valori pseudoaleatoare, deterministe) cu celula de 0,25 mm; V90 cu vârful de raza 0,3, raza 1,5.
  const n = 24, c = 0.25, v = new Float64Array(n * n);
  let s = 7;
  for (let k = 0; k < v.length; k++) { s = (s * 48271) % 2147483647; v[k] = (s / 2147483647) * 0.8; }
  const ix = new IndexO(triunghiuriModel(v, n, n, c), 2);
  for (const f of [{ fel: 'v', R: 1.5, alfa: 45 * GRAD, t: 0.3 }, { fel: 'v', R: 1.5, alfa: 30 * GRAD, t: 0.1 }] as const) {
    for (const [x, y] of [[3, 3], [2.9, 3.37], [3.61, 2.44], [1.8, 4.1]] as const) {
      const e = clExact(ix, f, x, y);
      // Eșantionarea pe discul frezei (inele la 0,01 mm, 720 de unghiuri): o margine de jos a CL-ului.
      let jos = -Infinity;
      for (let r = 0; r <= f.R + 1e-12; r += 0.01) {
        for (let q = 0; q < (r === 0 ? 1 : 720); q++) {
          const u = (q / 720) * 2 * Math.PI, z = zModel(ix, x + r * Math.cos(u), y + r * Math.sin(u));
          if (z > -Infinity) jos = Math.max(jos, z - urcareO(f, r));
        }
      }
      assert.ok(e >= jos - 1e-9, `${f.alfa}, (${x}, ${y}): exactul ${e} sub eșantionat ${jos}`);
      assert.ok(e <= jos + 0.02, `${f.alfa}, (${x}, ${y}): exactul ${e} prea departe de eșantionat ${jos}`);
    }
  }
  // Fără vârful plat, CL-ul e mai jos (conul ascuțit urcă mai repede): vârful contează.
  const ascutit = clExact(ix, { fel: 'v', R: 1.5, alfa: 45 * GRAD }, 3, 3), plat = clExact(ix, { fel: 'v', R: 1.5, alfa: 45 * GRAD, t: 0.3 }, 3, 3);
  assert.ok(plat > ascutit + 0.01, `vârful plat ${plat} ≤ ascuțit ${ascutit}`);
});
