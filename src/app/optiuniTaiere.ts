/**
 * Opțiunile tăierii (ADR 0180 §3, ADR 0181 §2, §6), ținute în browser pentru toate proiectele și aceleași în panoul Taie și în
 * bara uneltei Cuțit (o singură setare): „Închide bucățile” (implicit bifată; cheia ei de dinainte rămâne), „Prelungește
 * capetele” (nu), „Păstrează” (ambele părți), „șterge cuțitul-formă după tăiere” (nu), „Între bucăți” (nimic; spațiul sau
 * suprapunerea, cu lățimea lor, implicit 3 mm) și „Îmbinarea” (dreaptă; un model, cu pasul 40, înălțimea 20 și raza 3 mm). Un
 * singur depozit: ce se schimbă într-un loc se vede pe loc și în celălalt.
 */
import { useSyncExternalStore } from 'react';
import { IMBINARE_MAXIMA, MODELE_IMBINARE, type Imbinare, type ModelImbinare } from '../model/imbinare.ts';
import { LATIME_IMPLICITA, latimeBuna } from '../model/intreBucati.ts';
import type { Intre, Pastrare, Prelungire } from '../model/taiere.ts';

/** Ce stă între bucăți: nimic, un spațiu sau o suprapunere (ADR 0181 §2). */
export type FelIntre = 'nimic' | Intre['fel'];
/** Marginea nouă: dreaptă sau un model de îmbinare (ADR 0181 §6). */
export type FelImbinare = 'dreapta' | ModelImbinare;

export type OptiuniTaiere = {
  readonly inchide: boolean;
  readonly prelungeste: Prelungire;
  readonly pastreaza: Pastrare;
  readonly stergeCutitul: boolean;
  readonly intre: FelIntre;
  /** Lățimea spațiului sau a suprapunerii, în mm (mereu una bună: un câmp greșit nu ajunge aici). */
  readonly latime: number;
  readonly imbinare: FelImbinare;
  /** Pasul, înălțimea și raza îmbinării, în mm (mereu bune). */
  readonly pas: number;
  readonly inaltime: number;
  readonly raza: number;
};

const CHEI = {
  inchide: 'cncvs2.taiere-inchide',
  prelungeste: 'cncvs2.taiere-prelungeste',
  pastreaza: 'cncvs2.taiere-pastreaza',
  stergeCutitul: 'cncvs2.taiere-sterge-cutitul',
  intre: 'cncvs2.taiere-intre',
  latime: 'cncvs2.taiere-latime',
  imbinare: 'cncvs2.taiere-imbinare',
} as const;

/** Îmbinarea de la început: dreaptă, cu valorile implicite ale modelelor. */
const IMBINARE_IMPLICITA = { imbinare: 'dreapta', pas: 40, inaltime: 20, raza: 3 } as const;

/** O mărime a îmbinării bună: pozitivă (raza: cel puțin 0), cel mult 1 000 mm. */
export const marimeImbinareBuna = (x: number, zero = false): boolean => (zero ? x >= 0 : x > 0) && x <= IMBINARE_MAXIMA;

function citeste(): OptiuniTaiere {
  const ia = (k: string): string | null => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const p = ia(CHEI.prelungeste), s = ia(CHEI.pastreaza), i = ia(CHEI.intre), l = Number(ia(CHEI.latime) ?? Number.NaN);
  let m: Record<string, unknown> = {};
  try {
    const x: unknown = JSON.parse(ia(CHEI.imbinare) ?? '{}');
    if (x && typeof x === 'object') m = x as Record<string, unknown>;
  } catch {
    // O valoare stricată în browser: îmbinarea de la început.
  }
  const nr = (v: unknown, implicit: number, zero = false): number => (typeof v === 'number' && marimeImbinareBuna(v, zero) ? v : implicit);
  return {
    inchide: ia(CHEI.inchide) !== '0',
    prelungeste: p === 'forma' || p === 'intreaga' ? p : 'nu',
    pastreaza: s === 'stanga' || s === 'dreapta' ? s : 'ambele',
    stergeCutitul: ia(CHEI.stergeCutitul) === '1',
    intre: i === 'spatiu' || i === 'suprapunere' ? i : 'nimic',
    latime: latimeBuna(l) ? l : LATIME_IMPLICITA,
    imbinare: (MODELE_IMBINARE as readonly unknown[]).includes(m['imbinare']) ? (m['imbinare'] as ModelImbinare) : 'dreapta',
    pas: nr(m['pas'], IMBINARE_IMPLICITA.pas),
    inaltime: nr(m['inaltime'], IMBINARE_IMPLICITA.inaltime),
    raza: nr(m['raza'], IMBINARE_IMPLICITA.raza, true),
  };
}

let acum: OptiuniTaiere | null = null;
const ascultatori = new Set<() => void>();

/** Opțiunile de acum (citite din browser la prima cerere). */
export function optiuniTaiere(): OptiuniTaiere {
  acum ??= citeste();
  return acum;
}

/**
 * Schimbă opțiunile date: pe loc pentru toți cei care le arată, apoi în browser (fără stocare: cât ține pagina). O lățime sau o
 * mărime a îmbinării care nu e bună nu schimbă nimic.
 */
export function schimbaOptiuniTaiere(o: Partial<OptiuniTaiere>): void {
  if (o.latime !== undefined && !latimeBuna(o.latime)) return;
  if ((o.pas !== undefined && !marimeImbinareBuna(o.pas)) || (o.inaltime !== undefined && !marimeImbinareBuna(o.inaltime))) return;
  if (o.raza !== undefined && !marimeImbinareBuna(o.raza, true)) return;
  acum = { ...optiuniTaiere(), ...o };
  try {
    if (o.inchide !== undefined) localStorage.setItem(CHEI.inchide, o.inchide ? '1' : '0');
    if (o.prelungeste !== undefined) localStorage.setItem(CHEI.prelungeste, o.prelungeste);
    if (o.pastreaza !== undefined) localStorage.setItem(CHEI.pastreaza, o.pastreaza);
    if (o.stergeCutitul !== undefined) localStorage.setItem(CHEI.stergeCutitul, o.stergeCutitul ? '1' : '0');
    if (o.intre !== undefined) localStorage.setItem(CHEI.intre, o.intre);
    if (o.latime !== undefined) localStorage.setItem(CHEI.latime, String(o.latime));
    if (o.imbinare !== undefined || o.pas !== undefined || o.inaltime !== undefined || o.raza !== undefined) {
      localStorage.setItem(CHEI.imbinare, JSON.stringify({ imbinare: acum.imbinare, pas: acum.pas, inaltime: acum.inaltime, raza: acum.raza }));
    }
  } catch {
    // Fără stocare (fereastră privată, date blocate): alegerea ține doar cât pagina.
  }
  for (const f of ascultatori) f();
}

/** Spațiul sau suprapunerea de cerut (ADR 0181 §2): doar cu închidere (fără ea, bucățile n-au o margine de mutat). */
export function intreDin(o: OptiuniTaiere): Intre | undefined {
  return o.inchide && o.intre !== 'nimic' ? { fel: o.intre, latime: o.latime } : undefined;
}

/** Îmbinarea de cerut (ADR 0181 §6): doar cu închidere și doar pe o tăietură dreaptă (`dreapta`). */
export function imbinareDin(o: OptiuniTaiere, dreapta: boolean): Imbinare | undefined {
  return o.inchide && dreapta && o.imbinare !== 'dreapta' ? { model: o.imbinare, pas: o.pas, inaltime: o.inaltime, raza: o.raza } : undefined;
}

function asculta(f: () => void): () => void {
  ascultatori.add(f);
  return () => { ascultatori.delete(f); };
}

/** Opțiunile tăierii, ținute la zi în componentă (panoul Taie, bara Cuțitului). */
export function useOptiuniTaiere(): OptiuniTaiere {
  return useSyncExternalStore(asculta, optiuniTaiere, optiuniTaiere);
}
