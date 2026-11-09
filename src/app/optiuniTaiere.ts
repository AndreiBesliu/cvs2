/**
 * Opțiunile tăierii (ADR 0180 §3, ADR 0181 §2), ținute în browser pentru toate proiectele și aceleași în panoul Taie și în bara
 * uneltei Cuțit (o singură setare): „Închide bucățile” (implicit bifată; cheia ei de dinainte rămâne), „Prelungește capetele”
 * (nu), „Păstrează” (ambele părți), „șterge cuțitul-formă după tăiere” (nu) și „Între bucăți” (nimic; spațiul sau suprapunerea,
 * cu lățimea lor, implicit 3 mm). Un singur depozit: ce se schimbă într-un loc se vede pe loc și în celălalt.
 */
import { useSyncExternalStore } from 'react';
import { LATIME_IMPLICITA, latimeBuna } from '../model/intreBucati.ts';
import type { Intre, Pastrare, Prelungire } from '../model/taiere.ts';

/** Ce stă între bucăți: nimic, un spațiu sau o suprapunere (ADR 0181 §2). */
export type FelIntre = 'nimic' | Intre['fel'];

export type OptiuniTaiere = {
  readonly inchide: boolean;
  readonly prelungeste: Prelungire;
  readonly pastreaza: Pastrare;
  readonly stergeCutitul: boolean;
  readonly intre: FelIntre;
  /** Lățimea spațiului sau a suprapunerii, în mm (mereu una bună: un câmp greșit nu ajunge aici). */
  readonly latime: number;
};

const CHEI = {
  inchide: 'cncvs2.taiere-inchide',
  prelungeste: 'cncvs2.taiere-prelungeste',
  pastreaza: 'cncvs2.taiere-pastreaza',
  stergeCutitul: 'cncvs2.taiere-sterge-cutitul',
  intre: 'cncvs2.taiere-intre',
  latime: 'cncvs2.taiere-latime',
} as const;

function citeste(): OptiuniTaiere {
  const ia = (k: string): string | null => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const p = ia(CHEI.prelungeste), s = ia(CHEI.pastreaza), i = ia(CHEI.intre), l = Number(ia(CHEI.latime) ?? Number.NaN);
  return {
    inchide: ia(CHEI.inchide) !== '0',
    prelungeste: p === 'forma' || p === 'intreaga' ? p : 'nu',
    pastreaza: s === 'stanga' || s === 'dreapta' ? s : 'ambele',
    stergeCutitul: ia(CHEI.stergeCutitul) === '1',
    intre: i === 'spatiu' || i === 'suprapunere' ? i : 'nimic',
    latime: latimeBuna(l) ? l : LATIME_IMPLICITA,
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
 * Schimbă opțiunile date: pe loc pentru toți cei care le arată, apoi în browser (fără stocare: cât ține pagina). O lățime care
 * nu e bună nu schimbă nimic.
 */
export function schimbaOptiuniTaiere(o: Partial<OptiuniTaiere>): void {
  if (o.latime !== undefined && !latimeBuna(o.latime)) return;
  acum = { ...optiuniTaiere(), ...o };
  try {
    if (o.inchide !== undefined) localStorage.setItem(CHEI.inchide, o.inchide ? '1' : '0');
    if (o.prelungeste !== undefined) localStorage.setItem(CHEI.prelungeste, o.prelungeste);
    if (o.pastreaza !== undefined) localStorage.setItem(CHEI.pastreaza, o.pastreaza);
    if (o.stergeCutitul !== undefined) localStorage.setItem(CHEI.stergeCutitul, o.stergeCutitul ? '1' : '0');
    if (o.intre !== undefined) localStorage.setItem(CHEI.intre, o.intre);
    if (o.latime !== undefined) localStorage.setItem(CHEI.latime, String(o.latime));
  } catch {
    // Fără stocare (fereastră privată, date blocate): alegerea ține doar cât pagina.
  }
  for (const f of ascultatori) f();
}

/** Spațiul sau suprapunerea de cerut (ADR 0181 §2): doar cu închidere (fără ea, bucățile n-au o margine de mutat). */
export function intreDin(o: OptiuniTaiere): Intre | undefined {
  return o.inchide && o.intre !== 'nimic' ? { fel: o.intre, latime: o.latime } : undefined;
}

function asculta(f: () => void): () => void {
  ascultatori.add(f);
  return () => { ascultatori.delete(f); };
}

/** Opțiunile tăierii, ținute la zi în componentă (panoul Taie, bara Cuțitului). */
export function useOptiuniTaiere(): OptiuniTaiere {
  return useSyncExternalStore(asculta, optiuniTaiere, optiuniTaiere);
}
