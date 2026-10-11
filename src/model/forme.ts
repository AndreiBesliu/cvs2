import { conturCerc, conturDreptunghi, LINIE, type Contur, type Segment } from '../geom/contur.ts';
import { transformaContur, type Matrice } from '../geom/matrice.ts';
import type { FormaDoc, SegmentDoc } from './document.ts';

/** Segmentul căii, în forma geometriei: doar câmpurile cu sens (cele necunoscute rămân în document). */
function segmentCale(s: SegmentDoc): Segment {
  if (s.tip === 'A') return { tip: 'A', bulge: s.bulge };
  if (s.tip === 'C') return { tip: 'C', c1: { x: s.c1.x, y: s.c1.y }, c2: { x: s.c2.x, y: s.c2.y } };
  return LINIE;
}

/**
 * Conturul exact al unei forme așezate: forma parametrică în coordonatele ei, apoi matricea dată (pentru un element în
 * lume, matricea lui din `elementeFoaie`). Dreptunghiul are colțul stânga-jos în (0, 0), cercul centrul în (0, 0), iar
 * calea (ADR 0034) își are vârfurile chiar în coordonatele elementului.
 */
export function conturElement(e: { readonly forma: FormaDoc; readonly matrice: Matrice }): Contur {
  const f = e.forma;
  const local: Contur = f.tip === 'dreptunghi'
    ? conturDreptunghi(0, 0, f.latime, f.inaltime, f.razaColt)
    : f.tip === 'cerc'
      ? conturCerc(0, 0, f.raza)
      : { inchis: true, varfuri: f.varfuri.map((x) => ({ p: { x: x.p.x, y: x.p.y }, s: segmentCale(x.s) })) };
  return transformaContur(local, e.matrice);
}
