import { MIGRARI } from './migrari.ts';
import { incarcaCu, type RezultatIncarcare } from './usaCurenta.ts';

/**
 * Singura ușă de încărcare (T16): orice document, din fișier, din IndexedDB sau din cloud, intră doar pe aici.
 * 1. versiunea: una mai veche trece prin migrările pure, una mai nouă e refuzată (nu ghicim ce n-am scris);
 * 2. schema, cu plafoanele ei;
 * 3. rezultatul e documentul curent, sau un motiv scris.
 */
export type { RezultatIncarcare } from './usaCurenta.ts';
export { MIGRARI } from './migrari.ts';

/**
 * Ușa întreagă, sincronă: verificările (`usaCurenta.ts`, ADR 0070) cu toate migrările. O folosesc importul, acțiunile și
 * probele; pornirea aduce întâi doar ușa documentului curent.
 */
export function incarca(brut: unknown): RezultatIncarcare {
  return incarcaCu(brut, MIGRARI);
}

/** JSON-ul canonic stă în modulul lui (felia „loc la pornire”): salvarea îl folosește fără să aducă ușa la pornire. */
export { jsonCanonic } from './jsonCanonic.ts';
