import { conturCerc, conturDreptunghi, type Contur } from '../geom/contur.ts';
import { transformaContur, type Matrice } from '../geom/matrice.ts';
import type { FormaDoc } from './document.ts';

/**
 * Conturul exact al unei forme așezate: forma parametrică în coordonatele ei, apoi matricea dată (pentru un element în
 * lume, matricea lui din `elementeFoaie`). Dreptunghiul are colțul stânga-jos în (0, 0), iar cercul centrul în (0, 0).
 */
export function conturElement(e: { readonly forma: FormaDoc; readonly matrice: Matrice }): Contur {
  const local = e.forma.tip === 'dreptunghi'
    ? conturDreptunghi(0, 0, e.forma.latime, e.forma.inaltime, e.forma.razaColt)
    : conturCerc(0, 0, e.forma.raza);
  return transformaContur(local, e.matrice);
}
