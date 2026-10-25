/**
 * Booleanul formelor (ADR 0067), partea pură: unirea, scăderea și intersecția a exact două forme închise alese. Contururile
 * sunt cele pe care le-ar tăia CAM-ul (în lume; cubicele ca biarce la toleranța proiectului), iar operația vine din cavalier
 * (prin fațada `geom/offset.ts`): liniile și arcele rămân exacte, cercurile rămân cercuri. Scăderea scoate din PRIMA formă
 * aleasă pe ULTIMA. Rezultatul înlocuiește cele două forme: fiecare regiune devine o piesă nouă (un singur contur: o cale;
 * cu găuri: un grup, ca la import, cu operația exterioară pe contur și cea interioară pe găuri). Modulul se încarcă la
 * cerere (cavalier nu intră în pornire).
 */
import { conturFaraCubice } from '../geom/biarce.ts';
import type { Contur } from '../geom/conturBaza.ts';
import { booleanContururi, type OperatieBoolean } from '../geom/offset.ts';
import { TOLERANTA_PROIECT } from '../geom/toleranta.ts';
import type { Document, FormaDoc, VarfDoc } from './document.ts';
import { conturElement } from './forme.ts';
import { elementeFoaie } from './lume.ts';

export type { OperatieBoolean };

/** De ce booleanul nu se poate face. */
export type MotivBoolean = 'doua' | 'compusa' | 'deschisa' | 'disjuncte' | 'nimic-comun' | 'gol' | 'esuat';

/** O formă nouă a rezultatului: conturul exterior, găurile (în aceleași coordonate) și locul instanței (mm ai foii). */
export type FormaBoolean = { readonly forma: FormaDoc; readonly gauri: readonly FormaDoc[]; readonly x: number; readonly y: number };

/** Pură: calea unui contur, cu originea în `o` (linii, arce; cubicele nu mai sunt). */
function caleDin(k: Contur, o: { readonly x: number; readonly y: number }): FormaDoc {
  const rel = (q: { readonly x: number; readonly y: number }) => ({ x: q.x - o.x, y: q.y - o.y });
  return {
    tip: 'cale', inchis: true,
    varfuri: k.varfuri.map((v): VarfDoc => ({
      p: rel(v.p), s: v.s.tip === 'A' ? { tip: 'A', bulge: v.s.bulge } : v.s.tip === 'C' ? { tip: 'C', c1: rel(v.s.c1), c2: rel(v.s.c2) } : { tip: 'L' },
    })),
  };
}

/**
 * Pură: booleanul celor două forme alese (`selectie`, în ordinea alegerii), sau motivul: nu sunt exact două, una are mai
 * multe contururi sau e deschisă, nu se ating (unirea și scăderea n-ar schimba nimic), nu au nimic comun (intersecția),
 * nu rămâne nimic (scăderea), sau motorul a refuzat. Întoarce formele noi și instanțele de șters (cele două alese).
 */
export function booleanSelectie(doc: Document, indexFoaie: number, selectie: readonly string[], op: OperatieBoolean): { readonly forme: readonly FormaBoolean[]; readonly sterse: readonly string[] } | MotivBoolean {
  const foaie = doc.foi[indexFoaie];
  const ids = [...new Set(selectie)].filter((id) => foaie?.instante.some((i) => i.id === id));
  if (ids.length !== 2) return 'doua';
  const elemente = elementeFoaie(doc, indexFoaie);
  const contururi: Contur[] = [];
  for (const id of ids) {
    const ale = elemente.filter((e) => e.instanta === id);
    if (ale.length !== 1) return 'compusa';
    const c = conturElement(ale[0]!);
    if (!c.inchis) return 'deschisa';
    const f = c.varfuri.some((v) => v.s.tip === 'C') ? conturFaraCubice(c, TOLERANTA_PROIECT) : { ok: true as const, contur: c };
    if (!f.ok) return 'esuat';
    contururi.push(f.contur);
  }
  const r = booleanContururi(contururi[0]!, contururi[1]!, op);
  if (!r.ok) return 'esuat';
  if (r.regiuni.length === 0) return op === 'intersectie' ? 'nimic-comun' : 'gol';
  if (r.relatie === 'disjuncte') return op === 'intersectie' ? 'nimic-comun' : 'disjuncte';
  const forme = r.regiuni.map((g): FormaBoolean => {
    const o = g.exterior.varfuri[0]?.p ?? { x: 0, y: 0 };
    return { forma: caleDin(g.exterior, o), gauri: g.gauri.map((h) => caleDin(h, o)), x: o.x, y: o.y };
  });
  return { forme, sterse: ids };
}
