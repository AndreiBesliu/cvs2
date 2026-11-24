/**
 * Extensia deschisă, ținută minte la reîncărcarea paginii (ADR 0232 §A.3): id-ul ei, în browser. Se scrie abia când extensia
 * a pornit și se șterge când omul o închide ori când n-a pornit; la pornirea aplicației, gazda redeschide extensia ținută,
 * dacă mai e instalată și adresa nu cere altceva. Fără nicio cerere de rețea. Doar o comoditate, ca fereastra ținută (ADR
 * 0132 §3): o stocare care aruncă (fereastra privată, datele site-ului blocate) sau o valoare ciudată nu redeschid nimic.
 */
export const CHEIE_EXTENSIE_DESCHISA = 'cncvs2.extensie-deschisa';

export type StocareExtensie = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Stocarea browserului, dacă se poate atinge (accesul la `localStorage` poate arunca). */
function stocareBrowser(): StocareExtensie | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Id-ul unei extensii, cum îl cere și pachetul (`pachet.ts`). */
const ID = /^[a-z0-9-]{1,40}$/;

export function tineExtensia(id: string, stocare: StocareExtensie | null = stocareBrowser()): void {
  try {
    stocare?.setItem(CHEIE_EXTENSIE_DESCHISA, id);
  } catch {
    // Fără stocare, extensia doar nu se redeschide la reîncărcare.
  }
}

export function uitaExtensia(stocare: StocareExtensie | null = stocareBrowser()): void {
  try {
    stocare?.removeItem(CHEIE_EXTENSIE_DESCHISA);
  } catch {
    // La fel.
  }
}

/** Id-ul extensiei ținute, sau null (nimic ținut, o valoare care nu e un id, o stocare care aruncă). */
export function extensiaTinuta(stocare: StocareExtensie | null = stocareBrowser()): string | null {
  try {
    const v = stocare?.getItem(CHEIE_EXTENSIE_DESCHISA) ?? null;
    return v !== null && ID.test(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Extensia de redeschis la pornire: cea ținută, dacă mai e instalată. O adresă care cere altceva are întâietate: instalarea
 * dintr-un link, biblioteca, primirea unei lucrări, testul pas cu pas. `adresa` e cea de la pornire (gazda își șterge
 * ancorele după ce le citește).
 */
export function deRedeschis<T extends { readonly id: string }>(
  tinuta: string | null, instalate: readonly T[], adresa: { readonly hash: string; readonly search: string },
): T | null {
  if (tinuta === null) return null;
  if (['#instaleaza=', '#biblioteca', '#primeste-lucrare'].some((a) => adresa.hash.startsWith(a))) return null;
  if (new URLSearchParams(adresa.search).has('test')) return null;
  return instalate.find((x) => x.id === tinuta) ?? null;
}
