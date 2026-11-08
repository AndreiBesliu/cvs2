/**
 * Unealta Noduri (ADR 0062), partea pură a editării: ce formă se poate edita, matricea ei în lume și inversa, nodul și latura de
 * sub cursor, drumul SVG al conturului pentru previzualizare. Calea însăși (mutarea, adăugarea, scoaterea) e în
 * `src/model/noduri.ts`.
 */
import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from '../geom/conturBaza.ts';
import { inversa } from '../geom/inversa.ts';
import { aplica, type Matrice } from '../geom/matrice.ts';
import { laturaLovita } from '../geom/apropiat.ts';
import type { Document, FormaDoc } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { elementeFoaie } from '../model/lume.ts';
import { FOAIA } from '../ui/actiuniDocument.ts';

/** Un contur de sub unealtă: id-ul elementului în piesă, forma lui și matricea lui în lume. */
export type ElementNoduri = { readonly nod: string; readonly forma: FormaDoc; readonly matrice: Matrice };
/** Forma de sub unealtă: instanța și contururile piesei ei (unul la o formă desenată; mai multe la un import sau un boolean cu găuri). */
export type FormaNoduri = { readonly instanta: string; readonly elemente: readonly ElementNoduri[] };
export type MotivNoduri = 'nimic' | 'mai-multe' | 'piesa-impartita';

/**
 * Pură: forma pe care unealta Noduri o poate edita: o singură instanță aleasă, cu piesa doar a ei, cu toate contururile ei
 * (fiecare se editează separat, prin `document.forma` cu elementul lui, ADR 0068); altfel motivul.
 */
export function formaNoduri(doc: Document, selectie: readonly string[]): FormaNoduri | MotivNoduri {
  if (selectie.length === 0) return 'nimic';
  if (selectie.length > 1) return 'mai-multe';
  const foaie = doc.foi[FOAIA];
  const i = foaie?.instante.find((x) => x.id === selectie[0]);
  const piesa = i ? doc.piese.find((p) => p.id === i.piesa) : undefined;
  if (!i || !piesa) return 'nimic';
  let folosiri = 0;
  for (const f of doc.foi) for (const x of f.instante) if (x.piesa === piesa.id) folosiri++;
  if (folosiri > 1) return 'piesa-impartita';
  const elemente = elementeFoaie(doc, FOAIA).filter((x) => x.instanta === i.id).map((x) => ({ nod: x.nod, forma: x.forma, matrice: x.matrice }));
  return elemente.length > 0 ? { instanta: i.id, elemente } : 'nimic';
}

/** Inversa unei matrice afine (din `geom/inversa.ts`, locul ei). */
export { inversa };
/** Latura lovită (din `geom/apropiat.ts`, comună cu cuțitul). */
export { laturaLovita };

/** Indexul nodului (din punctele lui pe ecran) cel mai apropiat de (px, py), la cel mult `raza` px; sau `null`. */
export function nodLovit(noduri: readonly Punct[], px: number, py: number, raza: number): number | null {
  let cel: number | null = null, d0 = raza;
  noduri.forEach((q, k) => {
    const d = Math.hypot(q.x - px, q.y - py);
    if (d <= d0) { d0 = d; cel = k; }
  });
  return cel;
}

/** Conturul formei în lume (cu matricea ei), pentru desen și pentru latura lovită. */
export function conturNoduri(forma: FormaDoc, matrice: Matrice): Contur {
  return conturElement({ forma, matrice });
}

/** Drumul SVG al conturului (în lume), pe ecran: liniile, arcele (cu raza și sensul lor) și cubicele. */
export function drumSvg(c: Contur, v: { readonly scara: number; readonly tx: number; readonly ty: number }): string {
  const e = (q: Punct): string => `${v.tx + q.x * v.scara} ${v.ty - q.y * v.scara}`;
  const p0 = c.varfuri[0]?.p;
  if (!p0) return '';
  let d = `M ${e(p0)}`;
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
      const r = cerculArcului(a, b, s.bulge).raza * v.scara;
      // Y e întors pe ecran: un arc trigonometric (bulge > 0) se desenează în sensul acelor (sweep 0).
      d += ` A ${r} ${r} 0 ${Math.abs(s.bulge) > 1 ? 1 : 0} ${s.bulge > 0 ? 0 : 1} ${e(b)}`;
    } else if (s.tip === 'C') d += ` C ${e(s.c1)} ${e(s.c2)} ${e(b)}`;
    else d += ` L ${e(b)}`;
  }
  return c.inchis ? `${d} Z` : d;
}

/** Punctele nodurilor pe ecran (vârfurile căii, cu matricea în lume). */
export function noduriPeEcran(varfuri: readonly { readonly p: Punct }[], matrice: Matrice, v: { readonly scara: number; readonly tx: number; readonly ty: number }): Punct[] {
  return varfuri.map((x) => {
    const q = aplica(matrice, x.p);
    return { x: v.tx + q.x * v.scara, y: v.ty - q.y * v.scara };
  });
}
