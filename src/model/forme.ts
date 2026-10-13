import { conturCerc, conturDreptunghi, LINIE, type Contur, type Segment } from '../geom/contur.ts';
import { cutieContur, type Cutie } from '../geom/cutie.ts';
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
 * calea (ADR 0034) își are vârfurile chiar în coordonatele elementului. Calea își păstrează `inchis` (ADR 0037 §2): una
 * deschisă citită ca închisă ar primi coarda de închidere, iar freza ar tăia-o prin material.
 */
export function conturElement(e: { readonly forma: FormaDoc; readonly matrice: Matrice }): Contur {
  const f = e.forma;
  const local: Contur = f.tip === 'dreptunghi'
    ? conturDreptunghi(0, 0, f.latime, f.inaltime, f.razaColt)
    : f.tip === 'cerc'
      ? conturCerc(0, 0, f.raza)
      : { inchis: f.inchis, varfuri: f.varfuri.map((x) => ({ p: { x: x.p.x, y: x.p.y }, s: segmentCale(x.s) })) };
  return transformaContur(local, e.matrice);
}

/** Cutiile exacte, după formă (obiectul ei) și matrice: documentul nu se schimbă pe loc, deci o formă veche nu revine. */
const CUTII = new WeakMap<FormaDoc, Map<string, Cutie>>();

/**
 * Cutia exactă a elementului în lume (cu extremele arcelor și ale cubicelor), ținută între apeluri: clicul și lista o cer
 * la fiecare gest, iar o cale are până la 50 000 de vârfuri (recenzia 2.7b).
 */
export function cutieElement(e: { readonly forma: FormaDoc; readonly matrice: Matrice }): Cutie {
  let pe = CUTII.get(e.forma);
  if (!pe) { pe = new Map(); CUTII.set(e.forma, pe); }
  const m = e.matrice;
  const cheie = `${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f}`;
  let c = pe.get(cheie);
  if (!c) { c = cutieContur(conturElement(e)); pe.set(cheie, c); }
  return c;
}
