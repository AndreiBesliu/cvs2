import { areDepasire, cutieContur, depasire, type Depasire } from '../geom/cutie.ts';
import type { Document } from './document.ts';
import { conturElement } from './forme.ts';
import { elementeFoaie } from './lume.ts';

/**
 * Avertismentele documentului: o singură funcție, rulată după fiecare comandă, care nu scrie nimic în document. Un
 * avertisment nu repară nimic: forma care iese din foaie rămâne unde a pus-o omul (`LECTII.md` §5.3: mărimea și locul le
 * schimbă doar omul).
 *
 * Unde se arată (owner-ul, la încercarea prototipului de planșe, 07.10.2026): în bara de jos și, cu roșu, în lista de
 * vectori. Niciodată pe pânză: „încarcă spațiul de lucru”.
 */
export type Avertisment = {
  /** Forma trece de marginea foii. Poate fi intenționat (freza urmează vectorul și în afara foii), iar exportul cere atunci confirmare. */
  readonly tip: 'iese-din-foaie';
  /** Elementul în lume (`<instanță>/<element>`) și instanța lui, pe care o arată lista de vectori. */
  readonly id: string;
  readonly instanta: string;
  readonly depasire: Depasire;
};

export function avertismente(doc: Document, indexFoaie = 0): Avertisment[] {
  const foaie = doc.foi[indexFoaie];
  if (!foaie) return [];
  const rez: Avertisment[] = [];
  for (const e of elementeFoaie(doc, indexFoaie)) {
    const d = depasire(cutieContur(conturElement(e)), foaie.stoc.latime, foaie.stoc.inaltime);
    if (areDepasire(d)) rez.push({ tip: 'iese-din-foaie', id: e.idLume, instanta: e.instanta, depasire: d });
  }
  return rez;
}
