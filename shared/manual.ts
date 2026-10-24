/**
 * Manualul utilizatorului (documentația live, ADR 0058): forma fișierelor pe care build-ul le scrie în `dist/manual/`
 * (generatorul: `scripts/manual.ts`, din `docs/manual/ro.md` și `en.md`) și pe care fereastra manualului din aplicație le
 * cere la deschidere. Spre deosebire de documentația admin, fișierele intră în precache (`shared/precache.ts`): manualul
 * se citește și fără rețea, ca aplicația.
 */

export type LimbaManual = 'ro' | 'en';
export const LIMBI_MANUAL: readonly LimbaManual[] = ['ro', 'en'];

/** Rădăcina fișierelor generate, în `dist/` și pe hosting. */
export const DIR_MANUAL = 'manual';
/** Fișierul manualului într-o limbă (calea din `dist/`, fără `/` în față). */
export const fisierManual = (limba: LimbaManual): string => `${DIR_MANUAL}/${limba}.json`;

export interface CapitolManual {
  /** Același în ambele limbi (`desen`, `export`): ținta linkurilor `#id` și a ajutorului după context (F1). */
  readonly id: string;
  /** Titlul capitolului (markdown inline). */
  readonly titlu: string;
  /** Textul capitolului (markdown), fără titlu și fără rândurile de metadate. */
  readonly text: string;
  /** Ușile interfeței descrise de capitol (`export.gcode`, `unealta.cerc`, `editare.3d`). */
  readonly acopera: readonly string[];
}

export interface Manual {
  readonly schema: 1;
  readonly limba: LimbaManual;
  readonly titlu: string;
  readonly capitole: readonly CapitolManual[];
}

const sir = (x: unknown): x is string => typeof x === 'string';

/** Verificarea formei, la citirea din rețea (un fișier vechi, trunchiat sau al altei versiuni nu trece). */
export function esteManual(x: unknown): x is Manual {
  if (typeof x !== 'object' || x === null) return false;
  const m = x as Record<string, unknown>;
  if (m.schema !== 1 || !(m.limba === 'ro' || m.limba === 'en') || !sir(m.titlu) || !Array.isArray(m.capitole) || m.capitole.length === 0) return false;
  return m.capitole.every((c: unknown) => {
    if (typeof c !== 'object' || c === null) return false;
    const k = c as Record<string, unknown>;
    return sir(k.id) && sir(k.titlu) && sir(k.text) && Array.isArray(k.acopera) && k.acopera.every(sir);
  });
}

/** Capitolul care descrie o ușă a interfeței (primul), pentru ajutorul după context; `null` dacă niciunul. */
export function capitolPentru(m: Manual, usa: string): CapitolManual | null {
  return m.capitole.find((c) => c.acopera.includes(usa)) ?? null;
}
