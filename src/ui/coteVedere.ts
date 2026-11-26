/**
 * Cotele văzute în afara uneltei (ADR 0330 §5, felia 10.4↑a-4): un depozit mic, fără model, prin care unealta Cote (o bucată
 * la cerere) spune panoului de proprietăți și listei ce cotă e aleasă și ce rânduri are foaia, iar lista îi cere unealta cu o
 * cotă aleasă. Tot aici, foile cu cotele ascunse de ochiul listei, ținute în browser (`cncvs2.cote-ascunse`). Nu importă nimic
 * din model: panoul și lista îl pot citi fără să tragă codul cotelor în bucata lor.
 */
import { useSyncExternalStore } from 'react';
import type { RezultatActiune } from './actiuni.ts';

/** Un rând al listei: cota, felul, cifra ei (cum e desenată) și dacă e dezlegată. */
export type RandCota = { readonly id: string; readonly fel: string; readonly cifra: string; readonly dezlegata: boolean };

/** Ce arată panoul pentru cota aleasă: felul, valoarea exactă (mm sau grade), cifra, textul, legătura și distanța liniei. */
export type CotaPanou = {
  readonly foaie: string;
  readonly id: string;
  readonly fel: string;
  readonly valoare: number | null;
  readonly cifra: string;
  /** Textul scris de om (cu `<>` pentru valoare), sau gol: doar cifra. */
  readonly text: string;
  readonly stare: 'libera' | 'legata' | 'dezlegata';
  readonly motiv: 'forma' | 'noduri' | null;
  readonly d: number;
  readonly actiuni: {
    readonly dezleaga: () => RezultatActiune;
    readonly text: (text: string) => RezultatActiune;
    readonly distanta: (d: number) => RezultatActiune;
    readonly sterge: () => RezultatActiune;
    /** „Fă desen din cotă” (felia 10.4↑d-2), cu „Șterge cota” sau fără: vine după fontul cifrelor, deci la o promisiune. */
    readonly desen: (sterge: boolean) => Promise<RezultatActiune>;
  };
};

type Stare = {
  /** Cota aleasă (a uneltei Cote), pe foaia ei. */
  readonly aleasa: { readonly foaie: string; readonly id: string } | null;
  readonly panou: CotaPanou | null;
  readonly randuri: { readonly foaie: string; readonly randuri: readonly RandCota[] } | null;
  /** Câte cereri a făcut lista („treci la Cote cu cota asta”): editorul ascultă schimbarea. */
  readonly cereri: number;
};

let stare: Stare = { aleasa: null, panou: null, randuri: null, cereri: 0 };
const ascultatori = new Set<() => void>();
const schimba = (s: Stare): void => {
  stare = s;
  for (const f of ascultatori) f();
};
function asculta(f: () => void): () => void {
  ascultatori.add(f);
  return () => { ascultatori.delete(f); };
}
const citeste = (): Stare => stare;

/** Starea de acum (pentru cod fără React și pentru probe). */
export const stareCote = citeste;

export function useStareCote(): Stare {
  return useSyncExternalStore(asculta, citeste, citeste);
}

/** Alege o cotă (sau niciuna) pe o foaie: unealta Cote o arată aleasă, panoul o descrie. */
export function alegeCota(foaie: string, id: string | null): void {
  const a = stare.aleasa;
  if (id === null ? a === null : a?.foaie === foaie && a.id === id) return;
  schimba({ ...stare, aleasa: id === null ? null : { foaie, id } });
}

/** Lista cere unealta Cote, cu o cotă aleasă: editorul trece la ea. */
export function cereCota(foaie: string, id: string): void {
  schimba({ ...stare, aleasa: { foaie, id }, cereri: stare.cereri + 1 });
}

/**
 * Editorul ascultă cererile listei fără să se redeseneze la fiecare schimbare a depozitului: `f` se cheamă doar când lista
 * cere unealta Cote.
 */
export function laCerereaListei(f: () => void): () => void {
  let vazute = stare.cereri;
  return asculta(() => {
    if (stare.cereri === vazute) return;
    vazute = stare.cereri;
    f();
  });
}

/** Unealta Cote își publică cota aleasă pentru panou (sau niciuna). */
export function publicaPanou(p: CotaPanou | null): void {
  if (p === stare.panou) return;
  schimba({ ...stare, panou: p });
}

/** Unealta Cote își publică rândurile foii active pentru listă. */
export function publicaRanduri(foaie: string, randuri: readonly RandCota[]): void {
  const r = stare.randuri;
  if (r?.foaie === foaie && r.randuri.length === randuri.length && r.randuri.every((x, k) => {
    const y = randuri[k];
    return y !== undefined && x.id === y.id && x.fel === y.fel && x.cifra === y.cifra && x.dezlegata === y.dezlegata;
  })) return;
  schimba({ ...stare, randuri: { foaie, randuri } });
}

// Foile cu cotele ascunse de ochiul listei: o vedere, ținută în browser, nu în proiect.
export const CHEIE_ASCUNSE = 'cncvs2.cote-ascunse';

/** Pură: foile ascunse din textul ținut (o listă de id-uri); orice altceva, niciuna. */
export function citesteAscunse(text: string | null): ReadonlySet<string> {
  try {
    const x: unknown = text === null ? null : JSON.parse(text);
    return new Set(Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string') : []);
  } catch {
    return new Set();
  }
}

export const textAscunse = (s: ReadonlySet<string>): string => JSON.stringify([...s]);

let ascunse: ReadonlySet<string> | null = null;
const ascultatoriAscunse = new Set<() => void>();
function citesteAscunseAcum(): ReadonlySet<string> {
  if (ascunse) return ascunse;
  let text: string | null = null;
  try {
    text = localStorage.getItem(CHEIE_ASCUNSE);
  } catch {
    // Fără stocare: nicio foaie ascunsă.
  }
  ascunse = citesteAscunse(text);
  return ascunse;
}

/** Ochiul listei: ascunde sau arată cotele unei foi pe pânză (nu le șterge). */
export function comutaAscunsa(foaie: string): void {
  const s = new Set(citesteAscunseAcum());
  if (s.has(foaie)) s.delete(foaie);
  else s.add(foaie);
  ascunse = s;
  try {
    localStorage.setItem(CHEIE_ASCUNSE, textAscunse(s));
  } catch {
    // Fără stocare: ține cât pagina.
  }
  for (const f of ascultatoriAscunse) f();
}

function ascultaAscunse(f: () => void): () => void {
  ascultatoriAscunse.add(f);
  return () => { ascultatoriAscunse.delete(f); };
}

export function useAscunse(): ReadonlySet<string> {
  return useSyncExternalStore(ascultaAscunse, citesteAscunseAcum, citesteAscunseAcum);
}
