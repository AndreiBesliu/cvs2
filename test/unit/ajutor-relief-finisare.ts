/**
 * Ce împart probele finisării reliefului (`reliefFinisare.test.ts`, `reliefFinisare.toroidala.test.ts`; felia 18.1↑e-1): grilele,
 * reliefurile în lume, modelul exact cu rama plăcii, pașii vârfului din mișcări și judecata unei finisări de către oracolul 3D
 * (fără scobituri, podeaua, pasul pe material, rapidele).
 */
import assert from 'node:assert/strict';
import { finisareRelief, type FrezaFinisare, type ParametriFinisare, type ReliefCam } from '../../src/cam/reliefFinisare.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import { IndexO, judecaTraseul, materialO, triunghiuriModel, type FrezaO, type PasO } from '../oracles/relief3d.ts';

export const Z_SIGUR = 5;

/** O grilă din funcție, în centrele celulelor (rândul j în sus). */
export function grila(nx: number, ny: number, c: number, z: (x: number, y: number) => number): Float64Array {
  const v = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = z((i + 0.5) * c, (j + 0.5) * c);
  return v;
}

export type M = ReliefCam['m'];
export const T = (e: number, f: number): M => ({ a: 1, b: 0, c: 0, d: 1, e, f });
/** Rotire cu `grade` (și oglindire pe X, la cerere), apoi mutare. */
export function rot(grade: number, e: number, f: number, oglinda = false): M {
  const t = (grade * Math.PI) / 180, co = Math.cos(t), si = Math.sin(t), s = oglinda ? -1 : 1;
  return { a: co * s, b: si * s, c: -si, d: co, e, f };
}

/** Un relief cu valorile date, mutat cu `dz` (cotele în lume), în transformarea `m`. */
export function relief(valori: Float64Array, nx: number, ny: number, c: number, m: M, dz: number): ReliefCam {
  return { nx, ny, celula: c, z: valori.map((v) => v + dz), m };
}

/** Triunghiurile modelului unui relief, în lume. */
export function triunghiuriLume(r: ReliefCam): Float64Array {
  const T0 = triunghiuriModel(r.z, r.nx, r.ny, r.celula), out = new Float64Array(T0.length);
  for (let k = 0; k < T0.length; k += 3) {
    const x = T0[k]!, y = T0[k + 1]!;
    out[k] = r.m.a * x + r.m.c * y + r.m.e; out[k + 1] = r.m.b * x + r.m.d * y + r.m.f; out[k + 2] = T0[k + 2]!;
  }
  return out;
}

/** Fața plăcii (Z = 0) în jurul dreptunghiului reliefului, o ramă lată `l`, în lume (marginea „perete”). */
export function rama(r: ReliefCam, l: number): Float64Array {
  const W = r.nx * r.celula, H = r.ny * r.celula, out: number[] = [];
  const quad = (x0: number, y0: number, x1: number, y1: number): void => {
    const p = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [r.m.a * x! + r.m.c * y! + r.m.e, r.m.b * x! + r.m.d * y! + r.m.f, 0]);
    out.push(...p[0]!, ...p[1]!, ...p[2]!, ...p[0]!, ...p[2]!, ...p[3]!);
  };
  quad(-l, -l, W + l, 0); quad(-l, H, W + l, H + l); quad(-l, 0, 0, H); quad(W, 0, W + l, H);
  return Float64Array.from(out);
}

export const concat = (...a: Float64Array[]): Float64Array => {
  const out = new Float64Array(a.reduce((s, x) => s + x.length, 0));
  let o = 0;
  for (const x of a) { out.set(x, o); o += x.length; }
  return out;
};

/** Pozițiile vârfului, din mișcări, pornind din (x0, y0, Z sigur). */
export function pasi(miscari: readonly Miscare[], x0: number, y0: number): PasO[] {
  let x = x0, y = y0, z = Z_SIGUR;
  const out: PasO[] = [{ x, y, z, rapida: true }];
  for (const m of miscari) {
    if (m.tip !== 'rapida' && m.tip !== 'taiere') continue;
    x = m.la.X ?? x; y = m.la.Y ?? y; z = m.la.Z ?? z;
    out.push({ x, y, z, rapida: m.tip === 'rapida' });
  }
  return out;
}

export const frezaO = (f: FrezaFinisare): FrezaO => (f.fel === 'v' ? { fel: 'v', R: f.raza, alfa: (f.unghi * Math.PI) / 360, t: f.varf / 2 }
  : f.fel === 'toroidala' ? { fel: 'toroidala', R: f.raza, rho: f.colt } : { fel: f.fel, R: f.raza });

export type Caz = {
  readonly nume: string; readonly reliefuri: readonly ReliefCam[]; readonly freza: FrezaFinisare;
  readonly unghi?: number; readonly nealiniat?: boolean; readonly margine?: 'perete' | 'trece';
  readonly pasLateral: number; readonly pas: number; readonly adancime: number;
};

/** Rulează finisarea și o judecă cu oracolul: scobitura, podeaua, rapidele, pasul pe trecere pe material. */
export function judeca(c: Caz): { readonly miscari: Miscare[]; readonly pasi: PasO[]; readonly treceri: number } {
  const o: ParametriFinisare = {
    reliefuri: c.reliefuri, freza: c.freza, unghi: c.unghi ?? 0, nealiniat: c.nealiniat ?? false, margine: c.margine ?? 'perete',
    pasLateral: c.pasLateral, pas: c.pas, adancime: c.adancime, zSigur: Z_SIGUR, avans: 1000, avansPlonjare: 300,
  };
  const r = finisareRelief(o);
  if (!r.ok) assert.fail(`${c.nume}: ${r.motiv}`);
  const f = frezaO(c.freza);
  const tri = concat(...c.reliefuri.map(triunghiuriLume), ...(o.margine === 'perete' ? c.reliefuri.map((x) => rama(x, f.R + 2)) : []));
  const ix = new IndexO(tri, 2);
  const p = pasi(r.miscari, 0, 0);
  // Invarianta 4 și podeaua, pe tot traseul (rapidele stau la Z sigur, deasupra a tot).
  const probleme = judecaTraseul(ix, f, p, { podea: -c.adancime, tol: 1e-6, sub: 16 });
  assert.deepEqual(probleme.slice(0, 3), [], `${c.nume}: scobituri (${probleme.length})`);
  assert.ok(p.every((q) => q.z >= -c.adancime - 1e-9), `${c.nume}: sub podea`);
  // Pasul pe trecere și rapidele, pe material.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of p) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
  const mat = materialO(p, f, { x0: x0 - f.R - 1, y0: y0 - f.R - 1, x1: x1 + f.R + 1, y1: y1 + f.R + 1 }, 0.2, 0, 0.04);
  assert.ok(mat.taiere <= c.pas + 0.03, `${c.nume}: o mutare intră ${mat.taiere} mm în lemn (pasul ${c.pas}) la ${JSON.stringify(mat.unde)}`);
  assert.equal(mat.rapida, 0, `${c.nume}: o rapidă atinge lemnul (${mat.rapida} mm la ${JSON.stringify(mat.undeRapida)})`);
  return { miscari: r.miscari, pasi: p, treceri: r.treceri };
}
