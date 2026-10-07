import { conturCerc, conturDreptunghi, type Contur } from '../geom/contur.ts';
import { transformaContur } from '../geom/matrice.ts';
import type { ElementDoc } from './document.ts';

/**
 * Conturul exact al unui element: forma parametrică în coordonatele ei, apoi matricea elementului. Dreptunghiul are
 * colțul stânga-jos în (0, 0), iar cercul centrul în (0, 0); matricea le așază pe foaie.
 */
export function conturElement(e: ElementDoc): Contur {
  const local = e.forma.tip === 'dreptunghi'
    ? conturDreptunghi(0, 0, e.forma.latime, e.forma.inaltime, e.forma.razaColt)
    : conturCerc(0, 0, e.forma.raza);
  return transformaContur(local, e.matrice);
}
