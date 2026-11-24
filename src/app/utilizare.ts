import type { PasiCapturati } from '../../shared/pasiEroare.ts';
import type { Eveniment, Fereastra, Sursa } from '../../shared/utilizare.ts';
import type { Config } from './config.ts';
import type { Inregistrator, RezultatPompa } from './utilizareTipuri.ts';

/**
 * Utilizarea aplicației (ADR 0262, felia A.8b), partea din pornire: cât mai mică, fără Firebase. Ține sursa gestului de acum
 * (prinsă înaintea oricărui alt ascultător), face fiecare eveniment cu timpul sesiunii și sursa lui și îl dă înregistratorului
 * (`utilizareLot.ts`, adus imediat după pornire); până vine, evenimentele așteaptă într-un tampon. Aplicația și editarea îi
 * spun ferestrele, unealta și acțiunile care nu trec prin registru; fără înregistrator (`/admin`, probele), tamponul doar se
 * umple, până la plafon.
 */

/** Un gest (apăsarea mausului, o tastă) dă sursa acțiunilor care vin în atâtea ms (și celor terminate după un fișier ales). */
export const DURATA_GEST_MS = 10_000;
/** Câte evenimente așteaptă înregistratorul, cel mult. */
const TAMPON_MAX = 500;

/** Pură: de unde vine un gest, după elementul atins și dacă e o tastă. */
export function sursaDin(e: { closest(selector: string): unknown } | null, tasta: boolean): Sursa {
  if (!e) return tasta ? 'tasta' : 'alt';
  if (e.closest('.paleta')) return 'paleta';
  // O tastă în afara unui câmp e o scurtătură, oriunde ar fi focusul; în câmpul unui panou (Enter), e panoul.
  if (tasta && !e.closest('input, textarea, select, [contenteditable="true"]')) return 'tasta';
  if (e.closest('.meniu-context, .meniu-cont, .meniu-foaie, [role="menu"]')) return 'meniu';
  if (e.closest('[data-panou], .panou-retea, [role="dialog"]')) return 'panou';
  if (e.closest('[role="toolbar"], .meniu-global')) return 'bara';
  if (e.closest('canvas, .panza-cutie')) return 'panza';
  return 'alt';
}

let gest: { readonly de: Sursa; readonly cand: number } = { de: 'alt', cand: -Infinity };
const sursa = (): Sursa => (performance.now() - gest.cand <= DURATA_GEST_MS ? gest.de : 'alt');
const acum = (): number => Math.round(performance.now());

/** Sursa fiecărui gest, din faza de captură: înaintea ascultătorilor aplicației, care pot rula o acțiune. */
export function urmaresteGesturile(w: Window): void {
  const marcheaza = (tasta: boolean) => (e: Event): void => {
    gest = { de: sursaDin(e.target instanceof Element ? e.target : null, tasta), cand: performance.now() };
  };
  w.addEventListener('pointerdown', marcheaza(false), true);
  w.addEventListener('keydown', marcheaza(true), true);
}

let tinta: ((e: Eveniment) => void) | null = null;
let inel: (() => readonly Eveniment[]) | null = null;
const tampon: Eveniment[] = [];
const primeste = (e: Eveniment): void => {
  if (tinta) tinta(e);
  else if (tampon.length < TAMPON_MAX) tampon.push(e);
};

/** Un eveniment fără timp: îl pune fațada. */
export type FaraTimp<E> = E extends unknown ? Omit<E, 't'> : never;

export const utilizarea = {
  actiune: (id: string, rez: string): void => { primeste({ fel: 'actiune', t: acum(), id, de: sursa(), rez }); },
  fereastra: (id: Fereastra): void => { primeste({ fel: 'fereastra', t: acum(), id }); },
  unealta: (id: string): void => { primeste({ fel: 'unealta', t: acum(), id, de: sursa() }); },
  /** Calculele, mașina, imprimanta (felia A.8d), cu valorile brute: treptele le face înregistratorul. */
  eveniment: (e: FaraTimp<Eveniment>): void => { primeste({ ...e, t: acum() } as Eveniment); },
};

/** Pașii dinaintea unei erori, în clipa ei (felia A.11a): o copie a inelului înregistratorului (fără el, niciunul). */
export const pasiAcum = (): PasiCapturati => ({ t: acum(), pasi: inel ? inel().map((e) => ({ ...e })) : [] });

/** Înregistratorul preia evenimentele (întâi cele din tampon, apoi fiecare, cum vine) și dă inelul pașilor. */
export function preiaUtilizarea(f: (e: Eveniment) => void, pasi?: () => readonly Eveniment[]): void {
  tinta = f;
  inel = pasi ?? null;
  for (const e of tampon.splice(0)) f(e);
}

type Trimitere = (c: Config, ins: Pick<Inregistrator, 'loturi' | 'scoate' | 'primesteSetari' | 'golesteTot'>) => Promise<RezultatPompa>;
let trimitere: Trimitere | null = null;
/** Trimiterea cozii, prin bucata contului: o pune editarea, care o aduce oricum (reconfirmarea, panoul). */
export function seteazaTrimiterea(f: Trimitere): void {
  trimitere = f;
}
export const trimiterea = (): Trimitere | null => trimitere;
