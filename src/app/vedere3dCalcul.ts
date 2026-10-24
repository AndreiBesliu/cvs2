/**
 * Calculul vederii 3D (ADR 0057), fără DOM și fără WebGL: camera care orbitează în jurul unei ținte, matricile ei,
 * raza de sub cursor, apropierea spre cursor și panoramarea „apucată”, fereastra fină de 0,1 mm. Lumea e a documentului:
 * X spre dreapta, Y în sus pe planșă (în 3D: departe de om), Z în sus; fața plăcii la Z 0, fundul la −grosime.
 */
import type { FereastraRelief } from '../ui/actiuniExportTipuri.ts';

export type Vec3 = { readonly x: number; readonly y: number; readonly z: number };

/** `giratie`: rotirea în jurul verticalei (0: omul stă în fața marginii de jos); `inclinare`: deasupra orizontului. */
export type Camera = { readonly tinta: Vec3; readonly distanta: number; readonly giratie: number; readonly inclinare: number };

/** Unghiul vizual vertical. */
export const CAMP_VIZUAL = (35 * Math.PI) / 180;
export const INCLINARE_MINIMA = (10 * Math.PI) / 180;
export const INCLINARE_MAXIMA = (89.5 * Math.PI) / 180;
export const INCLINARE_IMPLICITA = (55 * Math.PI) / 180;
export const DISTANTA_MINIMA = 5;
export const DISTANTA_MAXIMA = 100_000;

/** Celula ferestrei fine (ADR 0010: 0,1 mm pe o fereastră) și latura ei: 2048 de celule, un relief la blocul 1. */
export const CELULA_FINA = 0.1;
export const LATURA_FINA = 2048 * CELULA_FINA;
/** Fereastra fină pornește când ce se vede la țintă încape în atât din latura ei (rămâne loc de panoramat). */
export const PRAG_FIN = 0.8;
/** Fereastra începe pe grila de dale a celulei fine (16 celule): aceleași celule, oricât s-ar muta. */
const PAS_FEREASTRA = 16 * CELULA_FINA;

const limiteaza = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

/** De unde privește camera. */
export function ochi(c: Camera): Vec3 {
  const o = Math.cos(c.inclinare) * c.distanta;
  return { x: c.tinta.x + Math.sin(c.giratie) * o, y: c.tinta.y - Math.cos(c.giratie) * o, z: c.tinta.z + Math.sin(c.inclinare) * c.distanta };
}

/** Un dreptunghi al imaginii, în coordonate normalizate (−1 … 1, Y în sus): zona liberă a pânzei. */
export type ZonaNdc = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

/** Marginea încadrării, din fiecare latură a zonei. */
const MARGINE_INCADRARE = 0.06;

/**
 * Camera care arată toată placa în zona liberă: ținta în centrul feței, înclinarea implicită, iar distanța cea mai mică la
 * care toate cele 8 colțuri ale plăcii (cu grosimea) cad în zonă, cu o margine. Perspectiva face marginea apropiată mai
 * mare decât cea depărtată, deci distanța se caută (bisecție pe colțurile proiectate), nu se calculează din laturi.
 */
export function incadreaza(foaie: { readonly latime: number; readonly inaltime: number; readonly grosime: number }, aspect: number,
  zona: ZonaNdc = { x0: -1, y0: -1, x1: 1, y1: 1 }): Camera {
  const baza = { tinta: { x: foaie.latime / 2, y: foaie.inaltime / 2, z: 0 }, giratie: 0, inclinare: INCLINARE_IMPLICITA };
  const centru = { x: (zona.x0 + zona.x1) / 2, y: (zona.y0 + zona.y1) / 2 };
  const mx = (zona.x1 - zona.x0) * MARGINE_INCADRARE, my = (zona.y1 - zona.y0) * MARGINE_INCADRARE;
  const colturi = [0, foaie.latime].flatMap((x) => [0, foaie.inaltime].flatMap((y) => [0, -foaie.grosime].map((z) => ({ x, y, z }))));
  const incape = (distanta: number): boolean => {
    const { pv } = matrici({ ...baza, distanta }, aspect, centru);
    return colturi.every((p) => {
      const w = pv[3]! * p.x + pv[7]! * p.y + pv[11]! * p.z + pv[15]!;
      if (!(w > 0)) return false;
      const x = (pv[0]! * p.x + pv[4]! * p.y + pv[8]! * p.z + pv[12]!) / w, y = (pv[1]! * p.x + pv[5]! * p.y + pv[9]! * p.z + pv[13]!) / w;
      return x >= zona.x0 + mx && x <= zona.x1 - mx && y >= zona.y0 + my && y <= zona.y1 - my;
    });
  };
  let jos = DISTANTA_MINIMA, sus = DISTANTA_MAXIMA;
  if (incape(jos)) return { ...baza, distanta: jos };
  if (!incape(sus)) return { ...baza, distanta: sus };
  for (let k = 0; k < 60; k++) {
    const d = Math.sqrt(jos * sus);
    if (incape(d)) sus = d;
    else jos = d;
  }
  return { ...baza, distanta: sus };
}

/** Rotirea cu mausul (pixeli trași): giratia liberă, înclinarea între margini. */
export function roteste(c: Camera, dx: number, dy: number): Camera {
  return { ...c, giratie: c.giratie - dx * 0.008, inclinare: limiteaza(c.inclinare + dy * 0.006, INCLINARE_MINIMA, INCLINARE_MAXIMA) };
}

/** Matricea 4 × 4, pe coloane (cum o cere WebGL). */
export type Matrice = Float64Array;

function inmulteste(a: Matrice, b: Matrice): Matrice {
  const r = new Float64Array(16);
  for (let c = 0; c < 4; c++) for (let l = 0; l < 4; l++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + l]! * b[c * 4 + k]!;
    r[c * 4 + l] = s;
  }
  return r;
}

function inversa(m: Matrice): Matrice | null {
  // Gauss–Jordan pe [m | I], pe rânduri (m e pe coloane: elementul (l, c) = m[c·4 + l]).
  const A = [0, 1, 2, 3].map((l) => Float64Array.from({ length: 8 }, (_, k) => (k < 4 ? m[k * 4 + l]! : k - 4 === l ? 1 : 0)));
  for (let c = 0; c < 4; c++) {
    let p = c;
    for (let l = c + 1; l < 4; l++) if (Math.abs(A[l]![c]!) > Math.abs(A[p]![c]!)) p = l;
    const rp = A[p]!;
    if (Math.abs(rp[c]!) < 1e-300) return null;
    A[p] = A[c]!;
    A[c] = rp;
    const v = rp[c]!;
    for (let k = 0; k < 8; k++) rp[k] = rp[k]! / v;
    for (let l = 0; l < 4; l++) {
      const rl = A[l]!, f = rl[c]!;
      if (l === c || f === 0) continue;
      for (let k = 0; k < 8; k++) rl[k] = rl[k]! - f * rp[k]!;
    }
  }
  const r = new Float64Array(16);
  for (let l = 0; l < 4; l++) for (let c = 0; c < 4; c++) r[c * 4 + l] = A[l]![4 + c]!;
  return r;
}

/**
 * Proiecția și vederea camerei, într-o singură matrice (`pv`), pentru un canvas cu `aspect`; `centru` mută centrul
 * imaginii (în coordonate normalizate, −1 … 1) în centrul zonei libere, fără să rotească nimic (o lentilă deplasată).
 */
export function matrici(c: Camera, aspect: number, centru: { readonly x: number; readonly y: number } = { x: 0, y: 0 }): { readonly pv: Matrice; readonly ochi: Vec3 } {
  const e = ochi(c);
  // Baza camerei: înainte (spre țintă), dreapta, sus; verticala lumii e Z (înclinarea rămâne sub 90°).
  let fx = c.tinta.x - e.x, fy = c.tinta.y - e.y, fz = c.tinta.z - e.z;
  const lf = Math.hypot(fx, fy, fz);
  fx /= lf; fy /= lf; fz /= lf;
  let rx = fy, ry = -fx;
  const lr = Math.hypot(rx, ry) || 1;
  rx /= lr; ry /= lr;
  const ux = ry * fz, uy = -rx * fz, uz = rx * fy - ry * fx;
  const v = new Float64Array([
    rx, ux, -fx, 0,
    ry, uy, -fy, 0,
    0, uz, -fz, 0,
    -(rx * e.x + ry * e.y), -(ux * e.x + uy * e.y + uz * e.z), fx * e.x + fy * e.y + fz * e.z, 1,
  ]);
  const aproape = Math.max(0.01, c.distanta / 1000), departe = c.distanta * 50 + 20_000;
  const f = 1 / Math.tan(CAMP_VIZUAL / 2), a = aspect > 0 ? aspect : 1;
  const p = new Float64Array([
    f / a, 0, 0, 0,
    0, f, 0, 0,
    -centru.x, -centru.y, (departe + aproape) / (aproape - departe), -1,
    0, 0, (2 * departe * aproape) / (aproape - departe), 0,
  ]);
  return { pv: inmulteste(p, v), ochi: e };
}

/** Punctul de pe planul Z = `z` de sub un punct al imaginii (coordonate normalizate); `null` dacă raza nu-l atinge în față. */
export function subCursor(pv: Matrice, ndcX: number, ndcY: number, z = 0): Vec3 | null {
  const inv = inversa(pv);
  if (!inv) return null;
  const punct = (adancime: number): Vec3 => {
    const x = inv[0]! * ndcX + inv[4]! * ndcY + inv[8]! * adancime + inv[12]!;
    const y = inv[1]! * ndcX + inv[5]! * ndcY + inv[9]! * adancime + inv[13]!;
    const zz = inv[2]! * ndcX + inv[6]! * ndcY + inv[10]! * adancime + inv[14]!;
    const w = inv[3]! * ndcX + inv[7]! * ndcY + inv[11]! * adancime + inv[15]!;
    return { x: x / w, y: y / w, z: zz / w };
  };
  const a = punct(-1), b = punct(1), dz = b.z - a.z;
  if (Math.abs(dz) < 1e-12) return null;
  const t = (z - a.z) / dz;
  if (!(t > 0)) return null;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z };
}

/**
 * Apropierea cu factorul `k` (< 1: mai aproape) spre punctul `p` al lumii: o omotetie în jurul lui, deci punctul rămâne
 * sub cursor; fără punct (cursorul pe cer), spre țintă. Distanța rămâne între margini (factorul se taie odată cu ea).
 */
export function apropie(c: Camera, p: Vec3 | null, k: number): Camera {
  const d = limiteaza(c.distanta * k, DISTANTA_MINIMA, DISTANTA_MAXIMA), f = d / c.distanta;
  if (!p) return { ...c, distanta: d };
  const t = c.tinta;
  return { ...c, distanta: d, tinta: { x: p.x + (t.x - p.x) * f, y: p.y + (t.y - p.y) * f, z: p.z + (t.z - p.z) * f } };
}

/** Panoramarea „apucată”: punctul de sub cursor (`de`) ajunge sub noua poziție a cursorului (`la`), pe planul feței. */
export function panorameaza(c: Camera, de: Vec3, la: Vec3): Camera {
  return { ...c, tinta: { x: c.tinta.x + de.x - la.x, y: c.tinta.y + de.y - la.y, z: c.tinta.z } };
}

/** Ce se vede la distanța țintei (mm), pe lățime și pe înălțime. */
export function vizibil(c: Camera, aspect: number): { readonly latime: number; readonly inaltime: number } {
  const h = 2 * c.distanta * Math.tan(CAMP_VIZUAL / 2);
  return { latime: h * (aspect > 0 ? aspect : 1), inaltime: h };
}

/**
 * Fereastra fină pentru camera de acum (ADR 0057 §4): `null` cât ce se vede la țintă nu încape în `PRAG_FIN` din latura
 * ferestrei, sau dacă placa e deja la celula fină. Altfel, latura întreagă (cât de mult de panoramat fără o simulare
 * nouă), centrată pe țintă, pe grila de dale a celulei fine, în placă.
 */
export function fereastraFina(c: Camera, aspect: number, foaie: { readonly latime: number; readonly inaltime: number }, celulaPlaca: number): FereastraRelief | null {
  if (celulaPlaca <= CELULA_FINA) return null;
  const v = vizibil(c, aspect);
  if (Math.max(v.latime, v.inaltime) > PRAG_FIN * LATURA_FINA) return null;
  const axa = (t: number, lung: number): { readonly a: number; readonly l: number } => {
    if (lung <= LATURA_FINA) return { a: 0, l: lung };
    const k = Math.floor(limiteaza(t - LATURA_FINA / 2, 0, lung - LATURA_FINA) / PAS_FEREASTRA);
    const a = k * 16 * CELULA_FINA;
    return { a, l: Math.min(LATURA_FINA, lung - a) };
  };
  // Ținta în afara plăcii (panoramată departe): nimic de rafinat.
  if (c.tinta.x < 0 || c.tinta.y < 0 || c.tinta.x > foaie.latime || c.tinta.y > foaie.inaltime) return null;
  const x = axa(c.tinta.x, foaie.latime), y = axa(c.tinta.y, foaie.inaltime);
  return { x0: x.a, y0: y.a, latime: x.l, inaltime: y.l, celula: CELULA_FINA };
}

/** Fereastra `f` cuprinde ce se vede la țintă (cu partea din placă): nu e nevoie de una nouă. */
export function cuprinde(f: FereastraRelief, c: Camera, aspect: number, foaie: { readonly latime: number; readonly inaltime: number }): boolean {
  const v = vizibil(c, aspect);
  const x0 = Math.max(0, c.tinta.x - v.latime / 2), x1 = Math.min(foaie.latime, c.tinta.x + v.latime / 2);
  const y0 = Math.max(0, c.tinta.y - v.inaltime / 2), y1 = Math.min(foaie.inaltime, c.tinta.y + v.inaltime / 2);
  const e = 1e-9;
  return x0 >= f.x0 - e && y0 >= f.y0 - e && x1 <= f.x0 + f.latime + e && y1 <= f.y0 + f.inaltime + e;
}

/** O culoare `#rrggbb` ca RGB în [0, 1]; altfel `implicit`. */
export function rgb(css: string, implicit: readonly [number, number, number]): readonly [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(css.trim());
  if (!m) return implicit;
  return [parseInt(m[1]!, 16) / 255, parseInt(m[2]!, 16) / 255, parseInt(m[3]!, 16) / 255];
}
