/**
 * Unealta Pen (ADR 0063), partea pură: nodul pus de un clic sau de o tragere și forma care iese din nodurile puse. Nodurile au
 * tipurile comune cu unealta Noduri (`src/model/noduri.ts`): colț, curbă pe ambele părți, curbă pe o parte.
 */
import { caleDinNoduri, type NodCuManere } from '../model/noduri.ts';
import type { FormaDesenata } from './desenCalcul.ts';

type P = { readonly x: number; readonly y: number };

/**
 * Pură: nodul pus în `a` cu mausul lăsat în `b` (mm ai foii). Fără tragere, un colț; cu tragere, mânerul de înainte în `b` și,
 * pe ambele părți, cel de înapoi în oglindă (nodul neted); `oParte` (Shift) lasă doar mânerul de înainte: segmentul care vine
 * intră drept în nod, cel care pleacă face curbă.
 */
export function nodPus(a: P, b: P | null, oParte: boolean): NodCuManere {
  const p = { x: a.x, y: a.y };
  if (!b || (b.x === a.x && b.y === a.y)) return { p, inapoi: null, inainte: null };
  return { p, inainte: { x: b.x, y: b.y }, inapoi: oParte ? null : { x: 2 * a.x - b.x, y: 2 * a.y - b.y } };
}

/** Pură: o cale închisă cere cel puțin 3 noduri, sau 2 cu o curbă între ele (altfel ar fi o linie dusă și întoarsă). */
export function sePoateInchide(noduri: readonly NodCuManere[]): boolean {
  return noduri.length >= 3 || (noduri.length === 2 && noduri.some((n) => n.inainte !== null || n.inapoi !== null));
}

/**
 * Pură: forma nodurilor puse (mm ai foii), cu originea piesei în primul nod; `null` dacă nu e încă o formă (sub 2 noduri,
 * sau închisă fără destule).
 */
export function formaPen(noduri: readonly NodCuManere[], inchis: boolean): FormaDesenata | null {
  const o = noduri[0];
  if (!o || noduri.length < 2 || (inchis && !sePoateInchide(noduri))) return null;
  const rel = (q: P | null): P | null => (q ? { x: q.x - o.p.x, y: q.y - o.p.y } : null);
  const locale = noduri.map((n) => ({ p: rel(n.p)!, inapoi: rel(n.inapoi), inainte: rel(n.inainte) }));
  return { forma: caleDinNoduri(locale, inchis), x: o.p.x, y: o.p.y };
}
