/**
 * Generatorul mesajelor modulelor la cerere (ADR 0086): dicționarele `src/i18n/<modul>.en.ts` și `.ro.ts` devin
 * `mesaje/<modul>.json` (ambele limbi), scrise de build lângă manual și puse în precache. Aplicația le cere când încarcă modulul
 * (`src/i18n/laCerere.ts`), deci textele nu mai stau în JavaScript-ul ei. Sursa rămâne TypeScript: româna are exact cheile
 * englezei (compilatorul), iar aici se mai verifică forma fiecărui fișier. Dicționarele de bază (`src/i18n/mesaje.<limbă>.ts`,
 * ADR 0095) devin `mesaje/<limbă>.json`, câte unul pe limbă: pornirea le aduce prin `incarcaLimba` (`src/i18n/t.ts`).
 */
import { esteDictionarMesaje, esteFisierMesaje, fisierBaza, fisierMesaje, MODULE_MESAJE, type ModulMesaje } from '../shared/mesaje.ts';
import { enCarcasa } from '../src/i18n/carcasa.en.ts';
import { roCarcasa } from '../src/i18n/carcasa.ro.ts';
import { enEditare } from '../src/i18n/editare.en.ts';
import { roEditare } from '../src/i18n/editare.ro.ts';
import { enExport } from '../src/i18n/export.en.ts';
import { roExport } from '../src/i18n/export.ro.ts';
import { enImport } from '../src/i18n/import.en.ts';
import { roImport } from '../src/i18n/import.ro.ts';
import { en } from '../src/i18n/mesaje.en.ts';
import { ro } from '../src/i18n/mesaje.ro.ts';
import { enMasina } from '../src/i18n/masina.en.ts';
import { roMasina } from '../src/i18n/masina.ro.ts';
import { enSimulare } from '../src/i18n/simulare.en.ts';
import { roSimulare } from '../src/i18n/simulare.ro.ts';
import { enTraseu } from '../src/i18n/traseu.en.ts';
import { roTraseu } from '../src/i18n/traseu.ro.ts';
import { LIMBI, type Limba, type Mesaj } from '../src/i18n/tipuri.ts';

/** Dicționarele fiecărui modul, în ambele limbi (sursa fișierelor; testele le înregistrează direct, fără rețea). */
export const DICTIONARE_MODULE: Readonly<Record<ModulMesaje, Readonly<Record<Limba, Readonly<Record<string, Mesaj>>>>>> = {
  carcasa: { en: enCarcasa, ro: roCarcasa },
  editare: { en: enEditare, ro: roEditare },
  export: { en: enExport, ro: roExport },
  import: { en: enImport, ro: roImport },
  masina: { en: enMasina, ro: roMasina },
  simulare: { en: enSimulare, ro: roSimulare },
  traseu: { en: enTraseu, ro: roTraseu },
};

/** Dicționarele de bază, pe limbă (sursa fișierelor `mesaje/<limbă>.json`; testele le înregistrează direct, fără rețea). */
export const DICTIONARE_BAZA: Readonly<Record<Limba, Readonly<Record<string, Mesaj>>>> = { ro, en };

/**
 * Fișierele mesajelor, cale → conținut: întâi dicționarele de bază, apoi modulele; o formă greșită oprește build-ul. `baza`
 * e doar pentru probe (un dicționar stricat).
 */
export function genereazaMesajele(baza: Readonly<Record<Limba, Readonly<Record<string, Mesaj>>>> = DICTIONARE_BAZA): Map<string, string> {
  const out = new Map<string, string>();
  const chei = (l: Limba): string => Object.keys(baza[l]).sort().join(',');
  for (const l of LIMBI) {
    const d = baza[l];
    if (!esteDictionarMesaje(d)) throw new Error(`Dicționarul de bază ${l} nu are forma citită de aplicație.`);
    if (chei(l) !== chei('ro')) throw new Error(`Dicționarul de bază ${l} are alte chei decât româna.`);
    out.set(fisierBaza(l), JSON.stringify(d));
  }
  for (const m of MODULE_MESAJE) {
    // Româna întâi, ca în `LIMBI`: același fișier la fiecare build.
    const f = Object.fromEntries(LIMBI.map((l) => [l, DICTIONARE_MODULE[m][l]]));
    if (!esteFisierMesaje(f)) throw new Error(`Mesajele ${m} nu au forma citită de aplicație (ambele limbi, aceleași chei).`);
    out.set(fisierMesaje(m), JSON.stringify(f));
  }
  return out;
}
