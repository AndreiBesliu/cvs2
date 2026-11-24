/**
 * Harta dalelor unui strat (ADR 0311 §6): JSON-ul canonic al lui `{ v: 1, nx, ny, dale }`, cu dalele în ordinea tj, apoi ti;
 * fiecare intrare e amprenta dalei, constanta ei sau null (goală). Amprenta textului e `dale` din stratul documentului.
 */
import { jsonCanonic } from '../model/jsonCanonic.ts';
import { dale as numarDale, motivGrila } from './grila.ts';

export type IntrareDala = string | number | null;
export type Harta = { readonly v: 1; readonly nx: number; readonly ny: number; readonly dale: readonly IntrareDala[] };

export const AMPRENTA = /^[0-9a-f]{64}$/;

/** Textul canonic al hărții. */
export function textHarta(h: Harta): string {
  return jsonCanonic({ v: 1, nx: h.nx, ny: h.ny, dale: h.dale });
}

/** Harta citită dintr-un text (din bază): forma, grila și numărul dalelor judecate; altfel null. */
export function hartaDinText(text: string): Harta | null {
  let x: unknown;
  try { x = JSON.parse(text); } catch { return null; }
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  const nx = o['nx'], ny = o['ny'], d = o['dale'];
  if (o['v'] !== 1 || typeof nx !== 'number' || typeof ny !== 'number' || !Array.isArray(d)) return null;
  if (motivGrila({ nx, ny, celula: 1 }) === 'latura') return null;
  const { tx, ty } = numarDale(nx, ny);
  if (d.length !== tx * ty) return null;
  const dale: IntrareDala[] = [];
  for (const e of d as unknown[]) {
    if (e === null || (typeof e === 'number' && Number.isFinite(e) && Math.fround(e) === e) || (typeof e === 'string' && AMPRENTA.test(e))) dale.push(e);
    else return null;
  }
  return { v: 1, nx, ny, dale };
}
