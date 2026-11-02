/**
 * Fereastra în care a rămas omul (ADR 0132 §2), ținută în browser: la pornire, aplicația se deschide în ea. O valoare
 * necunoscută (altă versiune, o fereastră scoasă din aranjament), lipsa ei sau o stocare care aruncă (navigarea privată,
 * datele site-ului șterse) dau prima fereastră a listei. Doar o comoditate: nimic nu depinde de ea.
 */
export const CHEIE_FEREASTRA = 'cncvs2.fereastra';

export type StocareFereastra = Pick<Storage, 'getItem' | 'setItem'>;

/** Stocarea browserului, dacă se poate atinge (accesul la `localStorage` poate arunca). */
function stocareBrowser(): StocareFereastra | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Fereastra ținută, dacă e în listă; altfel prima din listă. */
export function fereastraTinuta<F extends string>(ferestre: readonly F[], stocare: StocareFereastra | null = stocareBrowser()): F {
  const prima = ferestre[0] as F;
  try {
    const v = stocare?.getItem(CHEIE_FEREASTRA) ?? null;
    return ferestre.find((f) => f === v) ?? prima;
  } catch {
    return prima;
  }
}

/** Ține minte fereastra de acum; fără stocare (plină, refuzată), aplicația merge mai departe. */
export function tineFereastra(f: string, stocare: StocareFereastra | null = stocareBrowser()): void {
  try {
    stocare?.setItem(CHEIE_FEREASTRA, f);
  } catch {
    // Fără stocare, următoarea pornire începe cu prima fereastră.
  }
}
