/**
 * Ce face un text care iese din plăcuță (ADR 0210 §4, răspunsul 5; felia 11.4↑c), ales în fereastra «Din CSV…» și ținut în
 * browser, ca „Ține minte” al grupării: avertismentul (implicit: în bara de jos, cu roșu în listă, și o notă la export) sau,
 * în plus, confirmarea la export (Exportă rămâne oprit până omul bifează plăcuțele văzute). O valoare necunoscută sau o
 * stocare care aruncă (navigarea privată) dau implicitul.
 */
export type IesireText = 'avertisment' | 'confirmare';

export const CHEIE_IESIRE_TEXT = 'cncvs2.placute.iesire';

type Stocare = Pick<Storage, 'getItem' | 'setItem'>;

function stocareBrowser(): Stocare | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Alegerea ținută; implicitul (avertismentul), dacă nu e nimic ținut sau dacă ce e ținut nu e una din cele două. */
export function iesireTextTinuta(stocare: Stocare | null = stocareBrowser()): IesireText {
  try {
    return stocare?.getItem(CHEIE_IESIRE_TEXT) === 'confirmare' ? 'confirmare' : 'avertisment';
  } catch {
    return 'avertisment';
  }
}

/** Ține minte alegerea; fără stocare, data viitoare e din nou avertismentul. */
export function tineIesireaTextului(v: IesireText, stocare: Stocare | null = stocareBrowser()): void {
  try {
    stocare?.setItem(CHEIE_IESIRE_TEXT, v);
  } catch {
    // Fără stocare: implicitul, data viitoare.
  }
}
