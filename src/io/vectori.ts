/**
 * Vectorii unei foi, pentru exportul 2D (ADR 0088): formele așezate, în mm, în coordonatele foii (originea în colțul
 * stânga-jos), ca entitățile pe care le scriu DXF-ul și SVG-ul, fără nicio aproximare:
 * - cercul (forma `cerc`, sub o asemănare: ușa refuză arcele sub o matrice neuniformă) e un cerc, cu centrul și raza;
 * - liniile și arcele vecine ale unui contur sunt o polilinie cu `bulge` (ca LWPOLYLINE), închisă dacă tot conturul e așa;
 * - cubicele vecine sunt o curbă Bézier în lanț (3k + 1 puncte), adică o SPLINE de grad 3 cu nodurile triple, exactă.
 * Stratul e rolul formei: felul primei operații a piesei care o taie (în ordinea documentului), sau „fără operație”.
 * Conturul foii intră doar la cerere, pe stratul lui.
 */
import { numarSegmente, segment, type Contur, type Punct } from '../geom/conturBaza.ts';
import type { Document, Operatie } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { elementeFoaie } from '../model/lume.ts';

/** Straturile, în ordinea în care se scriu; numele sunt ASCII, ca orice program să le citească la fel. */
export const STRATURI = ['EXTERIOR', 'INTERIOR', 'PE_LINIE', 'PE_O_PARTE', 'BUZUNAR', 'GAURIRE', 'FARA_OPERATIE', 'FOAIE'] as const;
export type Strat = (typeof STRATURI)[number];

export type VarfPolilinie = { readonly x: number; readonly y: number; readonly bulge: number };
export type Entitate =
  | { readonly fel: 'cerc'; readonly strat: Strat; readonly element: string; readonly centru: Punct; readonly raza: number }
  | { readonly fel: 'polilinie'; readonly strat: Strat; readonly element: string; readonly inchis: boolean; readonly varfuri: readonly VarfPolilinie[] }
  | { readonly fel: 'spline'; readonly strat: Strat; readonly element: string; readonly puncte: readonly Punct[] };

export type VectoriFoaie = {
  readonly latime: number;
  readonly inaltime: number;
  readonly entitati: readonly Entitate[];
};

/** Rolul unei forme, după prima operație care o taie. */
export function stratOperatiei(o: Operatie | undefined): Strat {
  if (!o) return 'FARA_OPERATIE';
  if (o.tip === 'buzunar') return 'BUZUNAR';
  if (o.tip === 'gaurire') return 'GAURIRE';
  return o.latura === 'exterior' ? 'EXTERIOR' : o.latura === 'interior' ? 'INTERIOR' : o.latura === 'pe-linie' ? 'PE_LINIE' : 'PE_O_PARTE';
}

/**
 * Conturul, în bucăți: liniile și arcele vecine într-o polilinie, cubicele vecine într-o curbă. Un contur închis numai din
 * linii și arce rămâne o polilinie închisă; unul amestecat pornește de la o schimbare de fel, ca nicio bucată să nu
 * treacă peste vârful 0.
 */
export function bucatiContur(c: Contur, strat: Strat, element: string): Entitate[] {
  const m = numarSegmente(c);
  if (m === 0) return [];
  const cubica = (i: number): boolean => segment(c, i % m).s.tip === 'C';
  const toateLaFel = Array.from({ length: m }, (_, i) => cubica(i)).every((x) => x === cubica(0));
  if (c.inchis && toateLaFel && !cubica(0)) {
    return [{ fel: 'polilinie', strat, element, inchis: true, varfuri: c.varfuri.map((v) => ({ x: v.p.x, y: v.p.y, bulge: v.s.tip === 'A' ? v.s.bulge : 0 })) }];
  }
  let start = 0;
  if (c.inchis && !toateLaFel) {
    for (let i = 1; i <= m; i++) if (cubica(i) !== cubica(i - 1)) { start = i % m; break; }
  }
  const rez: Entitate[] = [];
  let i = 0;
  while (i < m) {
    const fel = cubica(start + i);
    let j = i;
    while (j + 1 < m && cubica(start + j + 1) === fel) j++;
    const seg = (k: number) => segment(c, (start + k) % m);
    if (fel) {
      const puncte: Punct[] = [seg(i).a];
      for (let k = i; k <= j; k++) {
        const { b, s } = seg(k);
        if (s.tip !== 'C') throw new Error('bucată de cubice cu altă primitivă');
        puncte.push(s.c1, s.c2, b);
      }
      rez.push({ fel: 'spline', strat, element, puncte });
    } else {
      const varfuri: VarfPolilinie[] = [];
      for (let k = i; k <= j; k++) {
        const { a, s } = seg(k);
        varfuri.push({ x: a.x, y: a.y, bulge: s.tip === 'A' ? s.bulge : 0 });
      }
      const ultim = seg(j).b;
      varfuri.push({ x: ultim.x, y: ultim.y, bulge: 0 });
      rez.push({ fel: 'polilinie', strat, element, inchis: false, varfuri });
    }
    i = j + 1;
  }
  return rez;
}

/** Vectorii foii `indexFoaie`, cu conturul ei dacă `cuFoaia`. */
export function vectoriFoaie(doc: Document, indexFoaie: number, cuFoaia: boolean): VectoriFoaie {
  const foaie = doc.foi[indexFoaie];
  if (!foaie) throw new Error(`foaia ${indexFoaie} nu există`);
  const { latime, inaltime } = foaie.stoc;
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const entitati: Entitate[] = [];
  for (const e of elementeFoaie(doc, indexFoaie)) {
    const strat = stratOperatiei(piese.get(e.piesa)?.operatii.find((o) => o.noduri.includes(e.nod)));
    if (e.forma.tip === 'cerc') {
      const m = e.matrice;
      entitati.push({ fel: 'cerc', strat, element: e.idLume, centru: { x: m.e, y: m.f }, raza: e.forma.raza * Math.hypot(m.a, m.b) });
    } else {
      for (const x of bucatiContur(conturElement(e), strat, e.idLume)) entitati.push(x);
    }
  }
  if (cuFoaia) {
    entitati.push({
      fel: 'polilinie', strat: 'FOAIE', element: foaie.id, inchis: true,
      varfuri: [{ x: 0, y: 0, bulge: 0 }, { x: latime, y: 0, bulge: 0 }, { x: latime, y: inaltime, bulge: 0 }, { x: 0, y: inaltime, bulge: 0 }],
    });
  }
  return { latime, inaltime, entitati };
}
