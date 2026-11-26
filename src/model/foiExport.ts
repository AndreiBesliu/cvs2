/**
 * Grupele foilor în fereastra exportului, cu „Toate foile” (ADR 0291, 7a, felia 28.8↑q), pure. Operațiile stau pe piesă, nu pe
 * instanță: o piesă pusă pe mai multe foi (o copie legată a foii, plăcuțele din CSV, ADR 0210 §2, §4) are aceleași operații
 * pe toate. Fereastra îi arată rândurile o singură dată, la prima foaie pe care e pusă (în ordinea foilor, apoi a instanțelor),
 * cu prima ei instanță de acolo; pe foile de după, piesa e „comună” cu foaia ei de început.
 */
import type { Document } from './document.ts';

/** O piesă a grupei, cu instanța ei pe foaia grupei (prima de acolo). */
export type PiesaGrupa = { readonly piesa: string; readonly instanta: string };

export type GrupaFoii = {
  /** Indicele foii în document. */
  readonly k: number;
  /** Piesele puse prima dată pe foaia asta, în ordinea instanțelor. */
  readonly piese: readonly PiesaGrupa[];
  /** Piesele foii puse deja pe foi de dinainte, după foaia lor de început (`k`), în ordinea foilor; fiecare piesă o dată. */
  readonly comune: readonly { readonly k: number; readonly piese: readonly string[] }[];
  /** Foaia n-are nicio piesă (din documentul de acum). */
  readonly goala: boolean;
};

/** Grupele foilor documentului, câte una pe foaie, în ordinea lor. O instanță a unei piese care lipsește se sare. */
export function grupeFoi(doc: Document): GrupaFoii[] {
  const piese = new Set(doc.piese.map((p) => p.id));
  const inceput = new Map<string, number>();
  return doc.foi.map((f, k) => {
    const proprii: PiesaGrupa[] = [];
    const comune = new Map<number, string[]>();
    const vazute = new Set<string>();
    for (const i of f.instante) {
      if (!piese.has(i.piesa) || vazute.has(i.piesa)) continue;
      vazute.add(i.piesa);
      const j = inceput.get(i.piesa);
      if (j === undefined) {
        inceput.set(i.piesa, k);
        proprii.push({ piesa: i.piesa, instanta: i.id });
      } else comune.set(j, [...(comune.get(j) ?? []), i.piesa]);
    }
    return {
      k, piese: proprii, comune: [...comune.entries()].sort((a, b) => a[0] - b[0]).map(([j, p]) => ({ k: j, piese: p })), goala: vazute.size === 0,
    };
  });
}
