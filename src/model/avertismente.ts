import { areDepasire, cutieContur, depasire, type Depasire } from '../geom/cutie.ts';
import type { Document } from './document.ts';
import { conturElement } from './forme.ts';

/**
 * Avertismentele documentului: o singură funcție, rulată după fiecare comandă, care nu scrie nimic în document. Un
 * avertisment nu repară nimic: forma care iese din foaie rămâne unde a pus-o omul (`LECTII.md` §5.3: mărimea și locul le
 * schimbă doar omul).
 *
 * Unde se arată (owner-ul, la încercarea prototipului de planșe, 07.10.2026): în bara de jos și, când va exista, în lista
 * de vectori, cu roșu. Niciodată pe pânză: „încarcă spațiul de lucru”.
 */
export type Avertisment = {
  /** Forma trece de marginea foii. Poate fi intenționat (freza urmează vectorul și în afara foii), iar exportul cere atunci confirmare. */
  readonly tip: 'iese-din-foaie';
  readonly id: string;
  readonly depasire: Depasire;
};

export function avertismente(doc: Document): Avertisment[] {
  const rez: Avertisment[] = [];
  for (const e of doc.elemente) {
    const d = depasire(cutieContur(conturElement(e)), doc.foaie.latime, doc.foaie.inaltime);
    if (areDepasire(d)) rez.push({ tip: 'iese-din-foaie', id: e.id, depasire: d });
  }
  return rez;
}
