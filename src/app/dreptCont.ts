import { useSyncExternalStore } from 'react';
import type { Capabilitate } from '../../shared/capabilitati.ts';
import { dreptBun, permite, type Drept, type RaspunsDeschide } from '../../shared/conturi.ts';

/**
 * Contul ținut de aplicație (ADR 0116 §8): cine e logat și ultimul drept primit de la server, în `localStorage`, ca exportul
 * și senderul să se judece și fără rețea, fără Firebase în pachetul de pornire. Îl scrie panoul contului (și reconfirmarea
 * de la pornire); altă filă îl vede prin evenimentul `storage`. Fără cont ținut, aplicația merge ca până acum.
 */

export const CHEIE_CONT = 'cncvs2.cont';

export type ContTinut = {
  readonly uid: string;
  readonly email: string;
  readonly nume: string;
  /** Ultimul drept primit; null = adresa încă neconfirmată (fără probă, deci ca fără cont). */
  readonly drept: Drept | null;
};

function contBun(x: unknown): x is ContTinut {
  if (typeof x !== 'object' || x === null) return false;
  const c = x as Record<string, unknown>;
  return typeof c['uid'] === 'string' && c['uid'] !== '' && typeof c['email'] === 'string' && typeof c['nume'] === 'string'
    && (c['drept'] === null || dreptBun(c['drept']));
}

/** Pură: contul de ținut din răspunsul serverului, cu dreptul lui, sau fără (adresa neconfirmată). */
export function contDinRaspuns(uid: string, r: RaspunsDeschide): ContTinut {
  return r.verificat ? { uid, email: r.email, nume: r.nume, drept: r.drept } : { uid, email: r.email, nume: r.email, drept: null };
}

/** Pură: contul din textul stocării, sau null (lipsă, stricat, altă formă). */
export function contDinText(text: string | null): ContTinut | null {
  if (text === null) return null;
  try {
    const x: unknown = JSON.parse(text);
    return contBun(x) ? x : null;
  } catch {
    return null;
  }
}

function citeste(): ContTinut | null {
  try {
    return contDinText(localStorage.getItem(CHEIE_CONT));
  } catch {
    return null;
  }
}

let tinut: ContTinut | null | undefined;
const ascultatori = new Set<() => void>();
let ascultaAltaFila = false;

function anunta(): void {
  for (const f of ascultatori) f();
}

/** Contul ținut acum (aceeași referință până la o schimbare). */
export function contTinut(): ContTinut | null {
  if (tinut === undefined) tinut = citeste();
  return tinut;
}

/** Scrie contul (null: ieșirea); fără stocare (fereastră privată), ține cât fila. */
export function puneCont(c: ContTinut | null): void {
  tinut = c;
  try {
    if (c) localStorage.setItem(CHEIE_CONT, JSON.stringify(c));
    else localStorage.removeItem(CHEIE_CONT);
  } catch {
    // Fără stocare: contul ține cât fila.
  }
  anunta();
}

export function aboneazaCont(f: () => void): () => void {
  if (!ascultaAltaFila && typeof window !== 'undefined') {
    ascultaAltaFila = true;
    window.addEventListener('storage', (e) => {
      if (e.key !== CHEIE_CONT && e.key !== null) return;
      tinut = citeste();
      anunta();
    });
  }
  ascultatori.add(f);
  return () => { ascultatori.delete(f); };
}

export function useContTinut(): ContTinut | null {
  return useSyncExternalStore(aboneazaCont, contTinut);
}

/** Permite contul ținut capabilitatea, acum? Fără cont sau cu adresa neconfirmată, da (ADR 0116 §9). */
export function contulPermite(c: Capabilitate, acum: number = Date.now()): boolean {
  return permite(contTinut()?.drept ?? null, c, acum);
}
