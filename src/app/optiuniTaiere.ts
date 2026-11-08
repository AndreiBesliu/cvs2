/**
 * Opțiunile tăierii (ADR 0180 §3, ADR 0181 §2), ținute în browser pentru toate proiectele și aceleași în panoul Taie și în bara
 * uneltei Cuțit (o singură setare): „Închide bucățile” (implicit bifată; cheia ei de dinainte rămâne), „Prelungește capetele”
 * (nu), „Păstrează” (ambele părți) și „șterge cuțitul-formă după tăiere” (nu). Un singur depozit: ce se schimbă într-un loc
 * se vede pe loc și în celălalt.
 */
import { useSyncExternalStore } from 'react';
import type { Pastrare, Prelungire } from '../model/taiere.ts';

export type OptiuniTaiere = {
  readonly inchide: boolean;
  readonly prelungeste: Prelungire;
  readonly pastreaza: Pastrare;
  readonly stergeCutitul: boolean;
};

const CHEI = {
  inchide: 'cncvs2.taiere-inchide',
  prelungeste: 'cncvs2.taiere-prelungeste',
  pastreaza: 'cncvs2.taiere-pastreaza',
  stergeCutitul: 'cncvs2.taiere-sterge-cutitul',
} as const;

function citeste(): OptiuniTaiere {
  const ia = (k: string): string | null => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const p = ia(CHEI.prelungeste), s = ia(CHEI.pastreaza);
  return {
    inchide: ia(CHEI.inchide) !== '0',
    prelungeste: p === 'forma' || p === 'intreaga' ? p : 'nu',
    pastreaza: s === 'stanga' || s === 'dreapta' ? s : 'ambele',
    stergeCutitul: ia(CHEI.stergeCutitul) === '1',
  };
}

let acum: OptiuniTaiere | null = null;
const ascultatori = new Set<() => void>();

/** Opțiunile de acum (citite din browser la prima cerere). */
export function optiuniTaiere(): OptiuniTaiere {
  acum ??= citeste();
  return acum;
}

/** Schimbă opțiunile date: pe loc pentru toți cei care le arată, apoi în browser (fără stocare: cât ține pagina). */
export function schimbaOptiuniTaiere(o: Partial<OptiuniTaiere>): void {
  acum = { ...optiuniTaiere(), ...o };
  try {
    if (o.inchide !== undefined) localStorage.setItem(CHEI.inchide, o.inchide ? '1' : '0');
    if (o.prelungeste !== undefined) localStorage.setItem(CHEI.prelungeste, o.prelungeste);
    if (o.pastreaza !== undefined) localStorage.setItem(CHEI.pastreaza, o.pastreaza);
    if (o.stergeCutitul !== undefined) localStorage.setItem(CHEI.stergeCutitul, o.stergeCutitul ? '1' : '0');
  } catch {
    // Fără stocare (fereastră privată, date blocate): alegerea ține doar cât pagina.
  }
  for (const f of ascultatori) f();
}

function asculta(f: () => void): () => void {
  ascultatori.add(f);
  return () => { ascultatori.delete(f); };
}

/** Opțiunile tăierii, ținute la zi în componentă (panoul Taie, bara Cuțitului). */
export function useOptiuniTaiere(): OptiuniTaiere {
  return useSyncExternalStore(asculta, optiuniTaiere, optiuniTaiere);
}
