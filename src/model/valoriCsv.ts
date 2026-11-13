/**
 * Valorile plăcuțelor din CSV (ADR 0210 §4, răspunsul 4): fiecare câmp al șablonului ia o coloană (potrivită singură după
 * nume, fără litere mari și diacritice), o valoare scrisă sau numerotarea (de la, pas, cifre); un rând al tabelului dă
 * valorile unei plăcuțe. Pur, fără font și fără document.
 */

/** De unde își ia un câmp valoarea: coloana (de la 0), un text scris, sau numerotarea plăcuțelor (a k-a: `start + k · pas`). */
export type SursaCamp =
  | { readonly fel: 'coloana'; readonly coloana: number }
  | { readonly fel: 'valoare'; readonly text: string }
  | { readonly fel: 'numar'; readonly start: number; readonly pas: number; readonly cifre: number };

/** Cel mai mare număr de cifre al numerotării (cu zerouri în față). */
export const CIFRE_MAXIM = 12;

/**
 * Numele, pentru potrivirea unui câmp cu o coloană: fără diacritice (și `ș`, `ț` cu virgulă sau cu sedilă), cu litere mici,
 * fără spațiile de la capete și cu cele dinăuntru strânse.
 */
export function numeComparabil(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Sursele implicite ale câmpurilor: coloana cu același nume (`numeComparabil`); un câmp fără ea ia prima coloană rămasă
 * nefolosită (un tabel fără antet, sau cu alte nume), altfel valoarea goală.
 */
export function surseImplicite(campuri: readonly string[], antet: readonly string[] | null, coloane: number): Record<string, SursaCamp> {
  const rez: Record<string, SursaCamp> = {};
  const folosite = new Set<number>();
  const dupaNume = new Map<string, number>();
  antet?.forEach((n, k) => { const c = numeComparabil(n); if (c !== '' && !dupaNume.has(c)) dupaNume.set(c, k); });
  for (const c of campuri) {
    const k = dupaNume.get(numeComparabil(c));
    if (k !== undefined && !folosite.has(k)) {
      Object.defineProperty(rez, c, { value: { fel: 'coloana', coloana: k }, enumerable: true, writable: true, configurable: true });
      folosite.add(k);
    }
  }
  for (const c of campuri) {
    if (Object.hasOwn(rez, c)) continue;
    let k = 0;
    while (k < coloane && folosite.has(k)) k++;
    const sursa: SursaCamp = k < coloane ? { fel: 'coloana', coloana: k } : { fel: 'valoare', text: '' };
    if (sursa.fel === 'coloana') folosite.add(k);
    Object.defineProperty(rez, c, { value: sursa, enumerable: true, writable: true, configurable: true });
  }
  return rez;
}

/** Numărul plăcuței `k` (de la 0) al numerotării, cu cel puțin `cifre` cifre (zerouri în față; semnul rămâne în față). */
export function numarPlacuta(s: Extract<SursaCamp, { fel: 'numar' }>, k: number): string {
  const n = s.start + k * s.pas;
  const cifre = Math.max(1, Math.min(CIFRE_MAXIM, Math.trunc(s.cifre)));
  const abs = String(Math.abs(n)).padStart(cifre, '0');
  return n < 0 ? `-${abs}` : abs;
}

/**
 * Valorile plăcuței `k` (a k-a dintre cele făcute, de la 0) din rândul `rand`: fiecare câmp după sursa lui; o coloană lipsă
 * din rând e o celulă goală. Ca proprietăți proprii (un câmp se poate numi și `__proto__`, ADR 0024 §9).
 */
export function valoriRand(
  campuri: readonly string[], surse: Readonly<Record<string, SursaCamp>>, rand: readonly string[], k: number,
): Record<string, string> {
  const rez: Record<string, string> = {};
  for (const c of campuri) {
    const s: SursaCamp = Object.hasOwn(surse, c) ? surse[c]! : { fel: 'valoare', text: '' };
    const v = s.fel === 'coloana' ? rand[s.coloana] ?? '' : s.fel === 'valoare' ? s.text : numarPlacuta(s, k);
    Object.defineProperty(rez, c, { value: v.trim(), enumerable: true, writable: true, configurable: true });
  }
  return rez;
}

/**
 * Textul cu bucata [inceput, sfarsit) (unități UTF-16) înlocuită de câmpul `{nume}` („Fă din textul ales câmpul”, răspunsul
 * 4b): numele fără acolade (un câmp nu le poate avea), sau null dacă nu rămâne nimic din el ori bucata e goală.
 */
export function cuCamp(text: string, inceput: number, sfarsit: number, nume: string): string | null {
  const n = nume.replace(/[{}]/g, '').trim();
  const a = Math.max(0, Math.min(inceput, sfarsit)), b = Math.min(text.length, Math.max(inceput, sfarsit));
  if (n === '' || a === b) return null;
  return `${text.slice(0, a)}{${n}}${text.slice(b)}`;
}
