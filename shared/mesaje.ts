/**
 * Mesajele modulelor la cerere, ca date (ADR 0086): forma fișierelor pe care build-ul le scrie în `dist/mesaje/`, unul pe modul,
 * cu ambele limbi (le aduce oricum împreună; comprimate laolaltă ies cu ~12 % mai mici decât despărțite) (generatorul:
 * `scripts/mesaje.ts`, din `src/i18n/<modul>.en.ts` și `.ro.ts`, care rămân sursa, cu paritatea verificată de compilator) și
 * pe care aplicația le cere când încarcă modulul (`src/i18n/laCerere.ts`). Ca manualul și dicționarul codurilor, intră în
 * precache: aplicația merge întreagă și fără rețea.
 */
/** Aceleași forme ca în `src/i18n/tipuri.ts` (`shared/` nu importă din `src/`): limba și mesajul, text sau plural. */
export type Limba = 'ro' | 'en';
type Mesaj = string | { readonly one: string; readonly few?: string; readonly other: string };

/** Modulele ale căror mesaje sunt date. `/admin` și testul pas cu pas (doar online, în afara totalului) le țin în cod. */
export const MODULE_MESAJE = ['carcasa', 'editare', 'export', 'import', 'masina', 'simulare', 'traseu'] as const;
export type ModulMesaje = (typeof MODULE_MESAJE)[number];

/** Rădăcina fișierelor generate, în `dist/` și pe hosting. */
export const DIR_MESAJE = 'mesaje';
/** Fișierul mesajelor unui modul, cu ambele limbi (calea din `dist/`, fără `/` în față). */
export const fisierMesaje = (m: ModulMesaje): string => `${DIR_MESAJE}/${m}.json`;

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

/** Fișierul unui modul: dicționarul fiecărei limbi, cu exact aceleași chei. */
export type FisierMesaje = Readonly<Record<Limba, Readonly<Record<string, Mesaj>>>>;

export function esteFisierMesaje(x: unknown): x is FisierMesaje {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false;
  const f = x as Record<string, unknown>;
  if (Object.keys(f).sort().join(',') !== 'en,ro' || !esteDictionarMesaje(f.ro) || !esteDictionarMesaje(f.en)) return false;
  const ro = Object.keys(f.ro).sort(), en = Object.keys(f.en).sort();
  return ro.length === en.length && ro.every((k, i) => k === en[i]);
}
