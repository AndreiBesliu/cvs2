/**
 * Latura fiecărei căi a unui import, din imbricare (ADR 0035 §8, ADR 0034 §7): adâncimea e numărul celorlalte căi care
 * conțin primul ei vârf (`evenodd`, includerea exactă a clicului); pară → exterior, impară → interior. Cu un buget de lucru
 * (candidații vizitați plus vârfurile căilor măsurate): contururile suprapuse fac judecata pătratică (recenzia 2.7c: 50 000
 * de dreptunghiuri identice, 334 s). Peste buget, null: importul e refuzat. Judecata e cea din `src/geom/imbricare.ts`
 * (comună cu rolul de tăiere, ADR 0112); aici, candidații vin din indexul de cutii.
 *
 * Căile deschise (ADR 0037 §11) nu intră în imbricare: nu conțin nimic și nu primesc o parte; latura lor e „pe linie”.
 */
import { cutieContur } from '../geom/cutie.ts';
import { adancimiImbricare } from '../geom/imbricare.ts';
import { indexCutii } from '../geom/offset.ts';
import type { Latura } from '../model/document.ts';
import { caleInchisa, type CaleImport } from './piesa.ts';

/** Fără buget, imbricarea întreagă; cu buget (importul: `PLAFON_IMPORT.includeri`), null când se termină. */
export function laturiDinImbricare(cai: ReadonlyArray<CaleImport>): Latura[];
export function laturiDinImbricare(cai: ReadonlyArray<CaleImport>, buget: number): Latura[] | null;
export function laturiDinImbricare(cai: ReadonlyArray<CaleImport>, buget = Infinity): Latura[] | null {
  const contururi = cai.map((c) => ({ inchis: caleInchisa(c), varfuri: c.varfuri }));
  // Indexul întoarce un superset (cutii lărgite); includerea exactă decide.
  const index = indexCutii(contururi.map(cutieContur));
  const adancimi = adancimiImbricare(contururi, (p, vizita) => { index.vizita({ minX: p.x, minY: p.y, maxX: p.x, maxY: p.y }, vizita); }, buget);
  return adancimi && adancimi.map((a): Latura => (a < 0 ? 'pe-linie' : a % 2 === 0 ? 'exterior' : 'interior'));
}
