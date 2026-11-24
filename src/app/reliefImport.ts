/**
 * Relieful din imagine ca import (ADR 0310 §7, felia 18.1↑a): piesa cu un singur element, forma `relief`, cu un strat
 * („adună”, vizibil) a cărui hartă e deja în baza reliefurilor. Fără operații: relieful se taie din felia 18.1↑c. Merge prin
 * aceeași acțiune ca orice import (`document.importa`): locul lăsat pe planșă, ușa documentului, un singur pas de anulare.
 */
import { incarca } from '../model/incarcare.ts';
import { PLAFON } from '../model/document.ts';
import type { ImportPregatit } from '../io/piesa.ts';
import { numeDinFisier } from '../io/piesa.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } as const;

/** Ce a făcut workerul: grila, celula și amprenta hărții stratului (păstrată în bază înaintea importului). */
export type ReliefDeImportat = { readonly nx: number; readonly ny: number; readonly celula: number; readonly amprenta: string };

/** Importul pregătit al unui relief din fișierul `fisier`: colțul stânga-jos al reliefului în originea paginii. */
export function pregatitRelief(r: ReliefDeImportat, fisier: string): ImportPregatit {
  const nume = numeDinFisier(fisier);
  const strat = fisier.slice(0, PLAFON.numeLungime);
  const latime = r.nx * r.celula, inaltime = r.ny * r.celula;
  return {
    nume, cai: [], laturi: [], pagina: { latime, inaltime },
    piesa: (id) => ({
      piesa: {
        id, nume, operatii: [],
        radacina: {
          tip: 'grup', id: 'g', matrice: { ...I },
          copii: [{
            tip: 'element', id: 'r1', nume, matrice: { ...I },
            forma: { tip: 'relief', nx: r.nx, ny: r.ny, celula: r.celula, straturi: [{ id: 's1', nume: strat, mod: 'aduna', vizibil: true, dale: r.amprenta }] },
          }],
        },
      },
      x: 0, y: 0, latime, inaltime,
    }),
    treceDeUsa: (doc) => incarca(doc).ok,
  };
}
