import { useSyncExternalStore } from 'react';
import {
  citesteRoluri, cuNumeNou, cuRolNou, faraRol, textRoluri, type MotivRol, type RezultatLista, type RolPersonal, type SablonRol,
} from '../model/rolPersonal.ts';

/** Cheia listei în `localStorage` (ADR 0114 §3). */
export const CHEIE_ROLURI = 'cncvs2.roluri';

/** Ce citește și scrie stocarea: în browser `localStorage`, în teste un fals. */
export type DepozitRoluri = { getItem(cheie: string): string | null; setItem(cheie: string, valoare: string): void };

export type StareRoluri = {
  readonly roluri: readonly RolPersonal[];
  /** Lista e în stocarea browserului; altfel ține doar cât fila (fereastră privată, date blocate, spațiul plin). */
  readonly pastrate: boolean;
  /** Lista se poate schimba: nu e a unei versiuni mai noi a aplicației. */
  readonly scriere: boolean;
};

export type RezultatRol = { readonly ok: true } | { readonly ok: false; readonly motiv: MotivRol; readonly nume?: string };

export type RoluriMele = {
  readonly stare: () => StareRoluri;
  readonly aboneaza: (f: () => void) => () => void;
  /** Citește din nou lista (altă filă a schimbat-o); lista ținută doar în memorie rămâne. */
  readonly reincarca: () => void;
  readonly adauga: (nume: string, s: SablonRol) => RezultatRol;
  readonly redenumeste: (id: string, nume: string) => RezultatRol;
  readonly sterge: (id: string) => RezultatRol;
};

/**
 * Lista rolurilor personalizate ale omului (ADR 0114 §3), peste un depozit. Fiecare schimbare citește întâi lista din depozit
 * (o altă filă poate s-o fi schimbat), apoi o scrie înapoi; un depozit care aruncă lasă lista în memorie, iar starea o spune.
 */
export function creeazaRoluriMele(depozit: DepozitRoluri | null, idNou: () => string): RoluriMele {
  let stare: StareRoluri = { roluri: [], pastrate: false, scriere: true };
  const ascultatori = new Set<() => void>();
  const citeste = (): StareRoluri => {
    if (!depozit) return { roluri: stare.roluri, pastrate: false, scriere: true };
    try {
      const c = citesteRoluri(depozit.getItem(CHEIE_ROLURI));
      return { roluri: c.roluri, pastrate: true, scriere: c.scriere };
    } catch {
      return { roluri: stare.roluri, pastrate: false, scriere: true };
    }
  };
  const pune = (s: StareRoluri): void => {
    stare = s;
    for (const f of ascultatori) f();
  };
  const schimba = (f: (roluri: readonly RolPersonal[]) => RezultatLista): RezultatRol => {
    // Lista ținută doar în memorie nu se recitește: ar pierde rolurile care n-au încăput în depozit.
    const acum = stare.pastrate ? citeste() : stare;
    if (!acum.scriere) {
      pune(acum);
      return { ok: false, motiv: 'versiune' };
    }
    const r = f(acum.roluri);
    if (!r.ok) return r;
    let pastrate = false;
    try {
      if (depozit) {
        depozit.setItem(CHEIE_ROLURI, textRoluri(r.roluri));
        pastrate = true;
      }
    } catch {
      // Spațiul plin sau datele blocate: lista ține cât fila, iar panoul o spune.
    }
    pune({ roluri: r.roluri, pastrate, scriere: true });
    return { ok: true };
  };
  stare = citeste();
  return {
    stare: () => stare,
    aboneaza: (f) => {
      ascultatori.add(f);
      return () => { ascultatori.delete(f); };
    },
    reincarca: () => {
      if (stare.pastrate) pune(citeste());
    },
    adauga: (nume, s) => schimba((roluri) => cuRolNou(roluri, nume, s, idNou())),
    redenumeste: (id, nume) => schimba((roluri) => cuNumeNou(roluri, id, nume)),
    sterge: (id) => schimba((roluri) => faraRol(roluri, id)),
  };
}

/** `localStorage` poate lipsi sau arunca (fereastră privată, date blocate): atunci lista ține cât fila. */
function depozitBrowser(): DepozitRoluri | null {
  try {
    const d = window.localStorage;
    d.getItem(CHEIE_ROLURI);
    return d;
  } catch {
    return null;
  }
}

/** Un id nou pentru un rol: UUID-ul browserului, sau 32 de cifre hexa aleatoare unde lipsește. */
function idRol(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

let lista: RoluriMele | null = null;

/** Rolurile omului din browserul acesta: o singură listă pe filă, la zi cu celelalte file (evenimentul `storage`). */
export function roluriMele(): RoluriMele {
  if (lista) return lista;
  const r = creeazaRoluriMele(depozitBrowser(), idRol);
  window.addEventListener('storage', (e) => {
    if (e.key === CHEIE_ROLURI || e.key === null) r.reincarca();
  });
  lista = r;
  return r;
}

/** Starea listei, pentru React; se schimbă doar când lista se schimbă (aceeași referință până atunci). */
export function useRoluriMele(): StareRoluri {
  const r = roluriMele();
  return useSyncExternalStore(r.aboneaza, r.stare);
}
