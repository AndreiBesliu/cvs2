import type { ImagineFoaie } from '../model/document.ts';

/**
 * Mânerele unei imagini desfăcute de pe foaie (ADR 0272 §4), ca socoteală pură: colțurile ei rotite, mânerul lovit de o
 * apăsare (rotirea, un colț, interiorul) și așezarea după gest: mutarea, scalarea proporțională dintr-un colț (colțul opus
 * rămâne pe loc) și rotirea în jurul centrului (Shift: pași de 15°). Totul în mm ai foii (Y în sus), cu rotirea în grade,
 * trigonometric, ca la instanțe.
 */

export type Punct = { readonly x: number; readonly y: number };
/** Așezarea unei imagini: centrul, mărimea și rotirea. */
export type Asezare = Pick<ImagineFoaie, 'x' | 'y' | 'latime' | 'inaltime' | 'rotire'>;
export type ColtImagine = 'sv' | 'se' | 'ne' | 'nv';
export type ManerImagine = ColtImagine | 'rotire' | 'mutare';
type Vedere = { readonly tx: number; readonly ty: number; readonly scara: number };

/** Mânerul de rotire stă deasupra laturii de sus a imaginii, la atâția pixeli ai ecranului (ca la forme). */
export const ROTIRE_IMAGINE_PX = 24;
/** Cât de departe de un mâner prinde apăsarea, în pixeli ai ecranului. */
export const PRINDE_IMAGINE_PX = 7;
/** Cea mai mică latură a unei imagini scalate (mm): scalarea se oprește acolo. */
export const LATURA_MINIMA_IMAGINE = 1;
export const COLTURI_IMAGINE: readonly ColtImagine[] = ['sv', 'se', 'ne', 'nv'];

/** Semnele colțurilor, în coordonatele imaginii (din centru, nerotite; Y în sus). */
const SEMNE: Readonly<Record<ColtImagine, readonly [number, number]>> = { sv: [-1, -1], se: [1, -1], ne: [1, 1], nv: [-1, 1] };
const OPUS: Readonly<Record<ColtImagine, ColtImagine>> = { sv: 'ne', se: 'nv', ne: 'sv', nv: 'se' };
const rad = (g: number): number => (g * Math.PI) / 180;

/** Un punct dat în coordonatele imaginii (din centrul ei, în mm, nerotite), pe foaie. */
export function peFoaie(a: Asezare, u: number, w: number): Punct {
  const c = Math.cos(rad(a.rotire)), s = Math.sin(rad(a.rotire));
  return { x: a.x + c * u - s * w, y: a.y + s * u + c * w };
}

/** Un punct al foii, în coordonatele imaginii (din centrul ei, nerotite). */
export function inImagine(a: Asezare, p: Punct): { readonly u: number; readonly w: number } {
  const c = Math.cos(rad(a.rotire)), s = Math.sin(rad(a.rotire));
  const dx = p.x - a.x, dy = p.y - a.y;
  return { u: c * dx + s * dy, w: -s * dx + c * dy };
}

/** Un colț al imaginii, pe foaie. */
export function coltImagine(a: Asezare, k: ColtImagine): Punct {
  const [su, sw] = SEMNE[k];
  return peFoaie(a, (su * a.latime) / 2, (sw * a.inaltime) / 2);
}

/** Mânerul de rotire, pe foaie: deasupra laturii de sus (sus-ul imaginii), la `ROTIRE_IMAGINE_PX` pixeli la scara dată. */
export function punctRotireImagine(a: Asezare, scara: number): Punct {
  return peFoaie(a, 0, a.inaltime / 2 + ROTIRE_IMAGINE_PX / scara);
}

/**
 * Mânerul lovit de apăsarea din punctul (px, py) al ecranului (pixeli din colțul pânzei): rotirea, apoi colțurile, apoi
 * interiorul (mutarea); altfel null.
 */
export function manerImagineLovit(a: Asezare, v: Vedere, px: number, py: number): ManerImagine | null {
  const aproape = (p: Punct): boolean => Math.hypot(v.tx + p.x * v.scara - px, v.ty - p.y * v.scara - py) <= PRINDE_IMAGINE_PX;
  if (aproape(punctRotireImagine(a, v.scara))) return 'rotire';
  for (const k of COLTURI_IMAGINE) if (aproape(coltImagine(a, k))) return k;
  const { u, w } = inImagine(a, { x: (px - v.tx) / v.scara, y: (v.ty - py) / v.scara });
  return Math.abs(u) <= a.latime / 2 && Math.abs(w) <= a.inaltime / 2 ? 'mutare' : null;
}

/** Rotirea adusă în [0, 360). */
export function rotireNormala(r: number): number {
  const n = ((r % 360) + 360) % 360;
  return n >= 360 || Object.is(n, -0) ? 0 : n;
}

/**
 * Așezarea după gestul mânerului `m`, de la apăsarea `start` la cursorul `q` (mm ai foii): mutarea cu deplasarea lor;
 * rotirea cu unghiul dintre ele, văzut din centru (Shift: rotirea rezultată, la 15°); scalarea dintr-un colț, proporțională,
 * cu colțul opus pe loc și factorul dat de proiecția cursorului pe diagonală (cel puțin cât să rămână o latură de
 * `LATURA_MINIMA_IMAGINE`).
 */
export function asezareDupaGest(a: Asezare, m: ManerImagine, start: Punct, q: Punct, shift = false): Asezare {
  if (m === 'mutare') return { ...a, x: a.x + q.x - start.x, y: a.y + q.y - start.y };
  if (m === 'rotire') {
    const d = ((Math.atan2(q.y - a.y, q.x - a.x) - Math.atan2(start.y - a.y, start.x - a.x)) * 180) / Math.PI;
    const r = a.rotire + d;
    return { ...a, rotire: rotireNormala(shift ? Math.round(r / 15) * 15 : r) };
  }
  const [su, sw] = SEMNE[m];
  const fix = inImagine(a, coltImagine(a, OPUS[m]));
  const p = inImagine(a, q);
  const du = su * a.latime, dw = sw * a.inaltime;
  const k = Math.max(((p.u - fix.u) * du + (p.w - fix.w) * dw) / (du * du + dw * dw), LATURA_MINIMA_IMAGINE / Math.min(a.latime, a.inaltime));
  const latime = a.latime * k, inaltime = a.inaltime * k;
  const c = peFoaie(a, fix.u + (su * latime) / 2, fix.w + (sw * inaltime) / 2);
  return { ...a, x: c.x, y: c.y, latime, inaltime };
}
