/**
 * Gruparea unei piese puse de mai multe ori (ADR 0210 §2, întrebarea 6): «Doar aceasta» (o desprinde, apoi o grupează) sau
 * «În toate cele N» (formele intră în piesă). „Ține minte alegerea” o ține în browser; fără ea, aplicația întreabă. Rândurile
 * din meniul de clic dreapta aleg de fiecare dată, fără întrebare. O stocare care aruncă (navigarea privată) înseamnă „întreabă”.
 */
export type AlegereGrupare = 'doar' | 'toate';

export const CHEIE_GRUPARE = 'cncvs2.grupare-surori';

type Stocare = Pick<Storage, 'getItem' | 'setItem'>;

function stocareBrowser(): Stocare | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Alegerea ținută, sau null (întreabă). */
export function alegereTinuta(stocare: Stocare | null = stocareBrowser()): AlegereGrupare | null {
  try {
    const v = stocare?.getItem(CHEIE_GRUPARE) ?? null;
    return v === 'doar' || v === 'toate' ? v : null;
  } catch {
    return null;
  }
}

/** Ține minte alegerea; fără stocare, data viitoare aplicația întreabă din nou. */
export function tineAlegerea(alegere: AlegereGrupare, stocare: Stocare | null = stocareBrowser()): void {
  try {
    stocare?.setItem(CHEIE_GRUPARE, alegere);
  } catch {
    // Fără stocare: întrebarea vine din nou.
  }
}
