import { conturFaraCubice } from '../geom/biarce.ts';
import type { Contur } from '../geom/contur.ts';
import type { Matrice } from '../geom/matrice.ts';
import { TOLERANTA_PROIECT } from '../geom/toleranta.ts';
import type { FormaDoc } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';

/**
 * Conturul pe care îl taie CAM-ul (ADR 0034 §6, ADR 0033 §7): cel exact, în lume, cu fiecare cubică înlocuită de biarcele
 * ei la toleranța proiectului. Dreptunghiul și cercul n-au cubice, deci rămân neschimbate. Sau refuzul biarcelor. Stă în
 * CAM, nu în model: biarcele se încarcă doar la export, nu cu pânza.
 */
export function conturDeTaiat(e: { readonly forma: FormaDoc; readonly matrice: Matrice }):
  { readonly ok: true; readonly contur: Contur } | { readonly ok: false; readonly motiv: string } {
  const c = conturElement(e);
  if (!c.varfuri.some((x) => x.s.tip === 'C')) return { ok: true, contur: c };
  const r = conturFaraCubice(c, TOLERANTA_PROIECT);
  return r.ok ? { ok: true, contur: r.contur } : r;
}
