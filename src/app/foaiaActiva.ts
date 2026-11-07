/**
 * Foaia activă a ferestrei (ADR 0210 §1), ținută în browser: la redeschidere, proiectul se deschide pe ea. E o vedere, nu o
 * dată a documentului (ca fereastra de acum, `fereastra.ts`): un id necunoscut (foaia ștearsă, alt proiect), lipsa lui sau o
 * stocare care aruncă (navigarea privată, datele site-ului șterse) dau prima foaie. Doar o comoditate: nimic nu depinde de ea.
 */
export const CHEIE_FOAIA = 'cncvs2.foaia';

export type StocareFoaie = Pick<Storage, 'getItem' | 'setItem'>;

function stocareBrowser(): StocareFoaie | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Id-ul foii ținute, sau null. */
export function foaiaTinuta(stocare: StocareFoaie | null = stocareBrowser()): string | null {
  try {
    const v = stocare?.getItem(CHEIE_FOAIA) ?? null;
    return v !== null && /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

/** Ține minte foaia activă; fără stocare (plină, refuzată), aplicația merge mai departe. */
export function tineFoaia(id: string, stocare: StocareFoaie | null = stocareBrowser()): void {
  try {
    stocare?.setItem(CHEIE_FOAIA, id);
  } catch {
    // Fără stocare, următoarea pornire începe cu prima foaie.
  }
}
