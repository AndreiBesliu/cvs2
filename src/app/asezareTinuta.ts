import { ASEZARE_IMPLICITA, COLTURI_ASEZARE, optiuniValide, type OptiuniAsezare } from '../model/asezare.ts';

/**
 * Alegerile ultimei „Așază pe foi” (ADR 0210 §3), ținute în browser: dialogul pornește cu ele, iar „Mută și așază la capăt”
 * le folosește fără să întrebe. O valoare stricată sau o stocare care aruncă (navigarea privată) dă implicitele.
 */
export const CHEIE_ASEZARE = 'cncvs2.asezare';

type Stocare = Pick<Storage, 'getItem' | 'setItem'>;

function stocareBrowser(): Stocare | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Alegerile ținute, completate cu implicitele; implicitele, dacă nu e nimic ținut sau dacă ce e ținut nu e valid. */
export function optiuniTinute(stocare: Stocare | null = stocareBrowser()): OptiuniAsezare {
  try {
    const brut: unknown = JSON.parse(stocare?.getItem(CHEIE_ASEZARE) ?? 'null');
    if (typeof brut !== 'object' || brut === null) return ASEZARE_IMPLICITA;
    const o = { ...ASEZARE_IMPLICITA, ...(brut as Partial<OptiuniAsezare>) };
    const curat: OptiuniAsezare = {
      colt: o.colt, margineX: o.margineX, margineY: o.margineY, distantaX: o.distantaX, distantaY: o.distantaY,
      ordinea: o.ordinea, rotirea: o.rotirea,
    };
    return COLTURI_ASEZARE.includes(curat.colt) && optiuniValide(curat) ? curat : ASEZARE_IMPLICITA;
  } catch {
    return ASEZARE_IMPLICITA;
  }
}

/** Ține minte alegerile; fără stocare, data viitoare dialogul pornește cu implicitele. */
export function tineOptiunile(o: OptiuniAsezare, stocare: Stocare | null = stocareBrowser()): void {
  try {
    stocare?.setItem(CHEIE_ASEZARE, JSON.stringify(o));
  } catch {
    // Fără stocare: implicitele, data viitoare.
  }
}
