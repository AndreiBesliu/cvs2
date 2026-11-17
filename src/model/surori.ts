import type { Document } from './document.ts';

/**
 * Piesele puse de mai multe ori, la tăiere și la conversie (felia 10.3↑m, ADR 0180): partea ușoară, pentru calculul cu
 * întrebarea (`actiuniExportCalcul.ts`): tipurile și cine are surori. Comenzile (`taiereSurori.ts`, cu desprinderea și deci cu
 * plăcuțele) vin cu acțiunile, iar calculul le aduce la cerere, doar la «Desprinde și …»: altfel modulele pieselor legate ar
 * ieși din bucata acțiunilor într-una comună (+1,9 kB, măsurat).
 */
export type AlegereSurori = 'desprinde' | 'piesa';

/**
 * O tăiere calculată cu surori, pentru comandă: «Desprinde și taie» (pe documentul desprins; `ids`, instanțele de desprins
 * acum) sau «Taie piesa».
 */
export type SuroriTaiere = { readonly mod: 'desprinde'; readonly ids: readonly string[] } | { readonly mod: 'piesa' };

/**
 * O conversie calculată cu surori: «Desprinde și convertește» (pe documentul `desprins`, cu instanțele `alese` cu surori ale
 * foii `foaie` desprinse) sau «Convertește piesa» (piesa, în locul ei: nimic în plus de făcut).
 */
export type SuroriConversie =
  | { readonly mod: 'desprinde'; readonly desprins: Document; readonly alese: readonly string[]; readonly foaie: string }
  | { readonly mod: 'piesa' };

/**
 * Cuțitele la care «Taie piesa» are sens: tăietura cade pe desenul instanței alese, fără să depindă de alte forme. Decuparea,
 * intersecțiile și retezatul depind de ce e în jurul fiecărei instanțe: acolo, doar «Desprinde și taie». Stă aici, nu în
 * `taiere.ts`, ca, importată de calcul, să nu tragă după ea modulele tăierii (+1,4 kB într-o bucată comună, măsurat); felurile
 * cuțitului (`Cutit` din `taiere.ts`), ca șiruri: un import al tipului ar închide un ciclu.
 */
export const CUTITE_PIESA: ReadonlySet<string> = new Set(['x', 'y', 'unghi', 'ghidaj', 'forma', 'forme', 'cale', 'foarfeca']);

/** De câte ori e pusă fiecare piesă, pe toate foile. */
function puse(doc: Document): Map<string, number> {
  const n = new Map<string, number>();
  for (const f of doc.foi) for (const i of f.instante) n.set(i.piesa, (n.get(i.piesa) ?? 0) + 1);
  return n;
}

/** Instanțele alese ale foii `idFoaie`, în ordinea foii, ale căror piese sunt puse de mai multe ori (pe orice foaie). */
export function aleseCuSurori(doc: Document, idFoaie: string, alese: readonly string[]): string[] {
  const n = puse(doc);
  const a = new Set(alese);
  return (doc.foi.find((f) => f.id === idFoaie)?.instante ?? []).filter((i) => a.has(i.id) && (n.get(i.piesa) ?? 0) > 1).map((i) => i.id);
}

/** De câte ori e pusă cea mai folosită dintre piesele instanțelor `ids` ale foii (pentru întrebare); 0 fără ele. */
export function catePuse(doc: Document, idFoaie: string, ids: readonly string[]): number {
  const n = puse(doc);
  const a = new Set(ids);
  let m = 0;
  for (const i of doc.foi.find((f) => f.id === idFoaie)?.instante ?? []) if (a.has(i.id)) m = Math.max(m, n.get(i.piesa) ?? 0);
  return m;
}
