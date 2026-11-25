/**
 * Ajutoare comune probelor care judecă plasele motorului Easy 3Draw (`extensii/trenulet/sursa/lego/lego.ts`):
 * - motorul, încărcat ca în pagină (`teste/incarca.js`), și verificarea plasei (muchii deschise, corpuri, volume negative);
 * - **numărul de înfășurare** al plasei în jurul unui punct: proba întreabă „în lemn” sau „în gol” fără să știe din ce
 *   bucăți a fost făcută piesa (corpurile motorului se suprapun puțin, deci „în lemn” e ≥ 1); `plin` îl socotește doar pe
 *   triunghiurile din dreptul punctului (o grilă în planul perpendicular pe rază, ținută pe plasă), cu aceeași aritmetică
 *   pe triunghi ca `infasurare` (o probă le compară);
 * - cotele, copiate în tărâmul probei (tablourile motorului vin din alt tărâm, `vm`, și `deepEqual` cade pe ele).
 */
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

export type P3 = [number, number, number];
export type Tri = [P3, P3, P3];
export type Piesa = { tri: Tri[]; dim: number[]; avert: string[]; baza: number[] };
export type Lego = {
  efective(): Record<string, number>;
  parametri(): Record<string, number>;
  construieste(d: Record<string, unknown>): Piesa;
  tipuri: readonly string[];
};

const cere = createRequire(import.meta.url);
const incarcate = cere('../../extensii/trenulet/sursa/teste/incarca.js') as {
  motoare(): { L: Lego }; plasa(tri: readonly Tri[]): { deschise: number; corpuri: number; negative: number };
};
export const { L } = incarcate.motoare();
export const plasa = incarcate.plasa;

/** Direcția razei cu care se numără înfășurarea (oarecare, ca să nu cadă pe muchiile pieselor). */
const RAZA: P3 = [0.5399, 0.2931, 0.7889];
/** Ce adaugă un triunghi la numărul de înfășurare al punctului: +1 când raza iese prin el, −1 când intră, 0 când nu-l taie. */
function trece([a, b, c]: Tri, p: P3): number {
  const d = RAZA;
  const e1: P3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2: P3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const h: P3 = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
  const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
  if (Math.abs(det) < 1e-12) return 0;
  const s: P3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], u = (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]) / det;
  if (u < 0 || u > 1) return 0;
  const q: P3 = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
  const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det;
  if (v < 0 || u + v > 1) return 0;
  const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det;
  if (t <= 1e-9) return 0;
  // det = −d·n: negativ când raza iese prin triunghi (normala lui, spre afară, e în sensul razei), pozitiv când intră
  return det < 0 ? 1 : -1;
}
/** Numărul de înfășurare al plasei în jurul punctului: ≥ 1 înseamnă „în lemn”. Pe toate triunghiurile, unul câte unul. */
export function infasurare(tri: readonly Tri[], p: P3): number {
  let n = 0;
  for (const t of tri) n += trece(t, p);
  return n;
}
// Grila plasei: raza unui punct se vede, în planul perpendicular pe ea, ca un singur punct, deci o pot tăia doar triunghiurile
// a căror umbră în planul acela îl cuprinde. Umbrele se țin pe o grilă; un punct întreabă doar triunghiurile din căsuța lui.
const PLAN_U: P3 = [RAZA[1], -RAZA[0], 0], PLAN_V: P3 = [RAZA[0] * RAZA[2], RAZA[1] * RAZA[2], -(RAZA[0] * RAZA[0] + RAZA[1] * RAZA[1])];
const peU = (q: P3) => q[0] * PLAN_U[0] + q[1] * PLAN_U[1], peV = (q: P3) => q[0] * PLAN_V[0] + q[1] * PLAN_V[1] + q[2] * PLAN_V[2];
type Grila = { u0: number; v0: number; pas: number; nu: number; nv: number; casute: (number[] | undefined)[] };
const grile = new WeakMap<readonly Tri[], Grila>();
function grila(tri: readonly Tri[]): Grila {
  let g = grile.get(tri);
  if (g) return g;
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  const umbre = tri.map((t) => { const us = t.map(peU), vs = t.map(peV); return [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)] as const; });
  for (const [a, b, c, d] of umbre) { u0 = Math.min(u0, a); u1 = Math.max(u1, b); v0 = Math.min(v0, c); v1 = Math.max(v1, d); }
  const n = Math.max(8, Math.min(256, Math.ceil(Math.sqrt(tri.length)))), pas = Math.max(u1 - u0, v1 - v0, 1e-6) / n + 1e-9;
  g = { u0, v0, pas, nu: Math.floor((u1 - u0) / pas) + 1, nv: Math.floor((v1 - v0) / pas) + 1, casute: [] };
  const m = 1e-6;
  umbre.forEach(([a, b, c, d], k) => {
    for (let i = Math.max(0, Math.floor((a - m - u0) / pas)); i <= Math.min(g!.nu - 1, Math.floor((b + m - u0) / pas)); i++)
      for (let j = Math.max(0, Math.floor((c - m - v0) / pas)); j <= Math.min(g!.nv - 1, Math.floor((d + m - v0) / pas)); j++) (g!.casute[i * g!.nv + j] ??= []).push(k);
  });
  grile.set(tri, g);
  return g;
}
/** Numărul de înfășurare, doar pe triunghiurile din dreptul punctului (același rezultat ca `infasurare`). */
export function infasurareRepede(tri: readonly Tri[], p: P3): number {
  const g = grila(tri), i = Math.floor((peU(p) - g.u0) / g.pas), j = Math.floor((peV(p) - g.v0) / g.pas);
  if (i < 0 || j < 0 || i >= g.nu || j >= g.nv) return 0;
  let n = 0;
  for (const k of g.casute[i * g.nv + j] ?? []) n += trece(tri[k]!, p);
  return n;
}
/** Punctul e în materialul piesei. */
export const plin = (p: Piesa, q: P3): boolean => infasurareRepede(p.tri, q) >= 1;
/** Cotele piesei, rotunjite la miimi, în tărâmul probei. */
export const cote = (p: Piesa): number[] => Array.from(p.dim, (v) => Math.round(v * 1000) / 1000);
/** Un punct dat în coordonatele motorului (dinaintea mutării în origine), dus în coordonatele plasei întoarse. */
export const dinMotor = (p: Piesa, q: P3): P3 => [q[0] - p.baza[0]!, q[1] - p.baza[1]!, q[2] - p.baza[2]!];
/** Amprenta plasei (triunghi cu triunghi): două piese cu aceeași amprentă sunt aceeași plasă; un mesaj de eroare scurt. */
export const amprentaPlasei = (p: Piesa): string => createHash('sha256').update(JSON.stringify(p.tri)).digest('hex').slice(0, 16);
/**
 * Muchiile care n-au exact o pereche, judecate ca într-un STL citit de altcineva (numere pe 32 de biți, vârfurile unite la
 * miimi): prinde și două corpuri închise care își împart o muchie, pe lângă plasa deschisă.
 */
export function muchiiFaraPereche(p: Piesa): number {
  const m = new Map<string, number>();
  for (const t of p.tri) {
    const s = t.map((q) => q.map((x) => Math.fround(x).toFixed(3)).join(','));
    for (let k = 0; k < 3; k++) { const e = s[k] + '>' + s[(k + 1) % 3]; m.set(e, (m.get(e) ?? 0) + 1); }
  }
  let n = 0;
  for (const [e, c] of m) { const [a, b] = e.split('>'); if (c !== 1 || m.get(b + '>' + a) !== 1) n++; }
  return n;
}
