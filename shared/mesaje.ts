/**
 * Mesajele, ca date (ADR 0086, dicționarele de bază: ADR 0095): forma fișierelor pe care build-ul le scrie în `dist/mesaje/`, unul pe modul,
 * cu ambele limbi (le aduce oricum împreună; comprimate laolaltă ies cu ~12 % mai mici decât despărțite) (generatorul:
 * `scripts/mesaje.ts`, din `src/i18n/<modul>.en.ts` și `.ro.ts`, care rămân sursa, cu paritatea verificată de compilator) și
 * pe care aplicația le cere când încarcă modulul (`src/i18n/laCerere.ts`). Ca manualul și dicționarul codurilor, intră în
 * precache: aplicația merge întreagă și fără rețea.
 */
import { DIR_MESAJE, esteDictionarMesaje, type Limba, type Mesaj } from './dictionar.ts';

// Pornirea cere doar adresa dicționarului de bază și forma lui (ADR 0095): stau în `dictionar.ts`.
export { DIR_MESAJE, esteDictionarMesaje, fisierBaza, type Limba } from './dictionar.ts';

/** Modulele ale căror mesaje sunt date. `/admin` și testul pas cu pas (doar online, în afara totalului) le țin în cod. */
export const MODULE_MESAJE = ['carcasa', 'editare', 'export', 'import', 'masina', 'simulare', 'traseu'] as const;
export type ModulMesaje = (typeof MODULE_MESAJE)[number];

/** Fișierul mesajelor unui modul, cu ambele limbi (calea din `dist/`, fără `/` în față). */
export const fisierMesaje = (m: ModulMesaje): string => `${DIR_MESAJE}/${m}.json`;

/** Fișierul unui modul: dicționarul fiecărei limbi, cu exact aceleași chei. */
export type FisierMesaje = Readonly<Record<Limba, Readonly<Record<string, Mesaj>>>>;

export function esteFisierMesaje(x: unknown): x is FisierMesaje {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false;
  const f = x as Record<string, unknown>;
  if (Object.keys(f).sort().join(',') !== 'en,ro' || !esteDictionarMesaje(f.ro) || !esteDictionarMesaje(f.en)) return false;
  const ro = Object.keys(f.ro).sort(), en = Object.keys(f.en).sort();
  return ro.length === en.length && ro.every((k, i) => k === en[i]);
}
