/**
 * Ajutoare comune probelor care judecă plasele motorului Easy 3Draw (`extensii/trenulet/sursa/lego/lego.ts`):
 * - motorul, încărcat ca în pagină (`teste/incarca.js`), și verificarea plasei (muchii deschise, corpuri, volume negative);
 * - **numărul de înfășurare** al plasei în jurul unui punct: proba întreabă „în lemn” sau „în gol” fără să știe din ce
 *   bucăți a fost făcută piesa (corpurile motorului se suprapun puțin, deci „în lemn” e ≥ 1);
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

/** Numărul de înfășurare al plasei în jurul punctului: ≥ 1 înseamnă „în lemn”. */
export function infasurare(tri: readonly Tri[], p: P3): number {
  const d: P3 = [0.5399, 0.2931, 0.7889];
  let n = 0;
  for (const [a, b, c] of tri) {
    const e1: P3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2: P3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const h: P3 = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
    const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
    if (Math.abs(det) < 1e-12) continue;
    const s: P3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], u = (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]) / det;
    if (u < 0 || u > 1) continue;
    const q: P3 = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det;
    if (v < 0 || u + v > 1) continue;
    const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det;
    if (t <= 1e-9) continue;
    // det = −d·n: negativ când raza iese prin triunghi (normala lui, spre afară, e în sensul razei), pozitiv când intră
    n += det < 0 ? 1 : -1;
  }
  return n;
}
/** Punctul e în materialul piesei. */
export const plin = (p: Piesa, q: P3): boolean => infasurare(p.tri, q) >= 1;
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
