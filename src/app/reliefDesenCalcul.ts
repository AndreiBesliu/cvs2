/**
 * Desenul unui relief (ADR 0310 §7), adus la cerere de `reliefDesen.ts`: straturile citite din baza reliefurilor, compuse și
 * umbrite în workerul reliefului (octeții dalelor trec acolo fără copie).
 */
import { reliefInBazin } from '../jobs/bazinRelief.ts';
import type { FormaRelief } from '../model/document.ts';
import type { Umbrit } from '../relief/umbrire.ts';
import { citesteStrat } from './reliefStocare.ts';

/** Un relief desenat: imaginea umbrită și Z-ul compusului (null: toate celulele goale). */
export type DesenFacut = { readonly umbrit: Umbrit; readonly z: { readonly min: number; readonly max: number } | null };

/** Câte desene se țin: fiecare are cel mult 2048² px (16 MB). */
export const DESENE_TINUTE = 12;

/**
 * Imaginea umbrită a reliefului și Z-ul compusului, ori null dacă un strat vizibil lipsește din browser (șters, ori un proiect
 * adus din alt browser).
 */
export async function deseneazaRelief(f: FormaRelief): Promise<DesenFacut | null> {
  const straturi = [];
  for (const s of f.straturi) {
    if (!s.vizibil) continue;
    const st = await citesteStrat(s.dale);
    if (!st) return null;
    straturi.push({ mod: s.mod, vizibil: true, harta: st.text, octeti: st.octeti });
  }
  const r = await reliefInBazin({ tip: 'desen', nx: f.nx, ny: f.ny, celula: f.celula, straturi }, { transfera: true });
  return r.ok && r.tip === 'desen' ? { umbrit: r.umbrit, z: r.z } : null;
}

/**
 * Pură: harta desenelor cu cele noi adăugate la capăt; peste plafon, pleacă cele mai vechi pe care nu le mai folosește foaia
 * (`folosite`: cele de pe foaie rămân oricâte ar fi, altfel s-ar recalcula una pe alta la nesfârșit).
 */
export function cuPlafon<V>(
  h: ReadonlyMap<string, V>, noi: ReadonlyArray<readonly [string, V]>, folosite: ReadonlySet<string>, plafon = DESENE_TINUTE,
): Map<string, V> {
  const m = new Map(h);
  for (const [k, v] of noi) { m.delete(k); m.set(k, v); }
  for (const k of [...m.keys()]) {
    if (m.size <= plafon) break;
    if (!folosite.has(k)) m.delete(k);
  }
  return m;
}
