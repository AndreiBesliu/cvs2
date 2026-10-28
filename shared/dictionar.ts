/**
 * Partea mesajelor-ca-date pe care o cere pornirea (ADR 0095): adresa dicționarului de bază al unei limbi și verificarea formei
 * unui dicționar. Stă separat de `shared/mesaje.ts` (fișierele modulelor la cerere, ADR 0086), ca bucata de pornire să le
 * aibă doar pe ele, nu și lista modulelor sau forma fișierelor lor.
 */
/** Aceleași forme ca în `src/i18n/tipuri.ts` (`shared/` nu importă din `src/`): limba și mesajul, text sau plural. */
export type Limba = 'ro' | 'en';
export type Mesaj = string | { readonly one: string; readonly few?: string; readonly other: string };

/** Rădăcina fișierelor generate, în `dist/` și pe hosting. */
export const DIR_MESAJE = 'mesaje';
/**
 * Dicționarul de bază al unei limbi: câte un fișier pe limbă, fiindcă pornirea aduce doar limba activă, înaintea primei
 * randări, iar cealaltă vine în fundal. Ca manualul și dicționarul codurilor: `<dosar>/<limbă>.json` (calea din `dist/`,
 * fără `/` în față).
 */
export const fisierBaza = (l: Limba): string => `${DIR_MESAJE}/${l}.json`;

const sir = (x: unknown): x is string => typeof x === 'string';

function esteMesaj(x: unknown): x is Mesaj {
  if (sir(x)) return true;
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false;
  const p = x as Record<string, unknown>;
  return sir(p.one) && sir(p.other) && (p.few === undefined || sir(p.few)) && Object.keys(p).every((k) => k === 'one' || k === 'few' || k === 'other');
}

/** Verificarea formei, la citirea din rețea: cheie → text sau plural, cel puțin o cheie. */
export function esteDictionarMesaje(x: unknown): x is Readonly<Record<string, Mesaj>> {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false;
  const v = Object.entries(x);
  return v.length > 0 && v.every(([k, m]) => k !== '' && esteMesaj(m));
}
