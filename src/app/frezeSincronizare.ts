/**
 * Sincronizarea bibliotecii unui cont cu contul (ADR 0300 §7, felia 16.A↑c): ia schimbările din cont (pe pagini, de la
 * versiunea știută), apoi trimite ce s-a schimbat aici (în loturi, cu versiunea văzută); un conflict la scriere se îmbină ca
 * o venire din cont și, dacă s-a îmbinat, pleacă din nou. Biblioteca din browser e mereu cea de lucru: fără rețea, fără
 * dreptul de scriere sau cu contul plin, rămâne aici, iar starea o spune.
 *
 * Se sincronizează la deschiderea ferestrei, după fiecare schimbare (2 s fără alta) și la revenirea rețelei; niciodată la
 * pornirea aplicației. Cererile pleacă prin bucata contului (`PanouCont.tsx`), adusă la nevoie: modulul ăsta n-are Firebase.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { LOT_FREZE, type CerereFreze, type RaspunsListaFreze, type RaspunsScrieFreze, type StergereTrimisa, type FrezaTrimisa } from '../../shared/freze.ts';
import {
  cuDinCont, cuListaCompleta, cuRezultate, deTrimis, rezolva, type Alegere, type BibliotecaCont, type DeTrimis,
} from '../model/frezeSincron.ts';
import type { Config } from './config.ts';
import { frezeMele, idFreza, type FrezeMele } from './frezeMele.ts';

/** O cerere către callable-ul `freze`; aruncă erorile clientului Firebase (cu `code`). */
export type Cheama = (c: CerereFreze) => Promise<RaspunsListaFreze | RaspunsScrieFreze>;

/**
 * Cum s-a încheiat sincronizarea: la zi; fără rețea (se reia la reconectare); doar citire (planul fără capabilitatea
 * `cloud`); contul (altul logat, ieșit, sau neconfirmat); altă eroare a serverului.
 */
export type FelSincronizare = 'la-zi' | 'fara-retea' | 'citire' | 'cont' | 'eroare';

/** Felul unei erori a cererii. */
export function felEroare(e: unknown): FelSincronizare {
  const cod = (e as { code?: unknown } | null)?.code;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'fara-retea';
  switch (cod) {
    case 'functions/unavailable': case 'functions/deadline-exceeded': case 'functions/cancelled': return 'fara-retea';
    case 'functions/permission-denied': return 'citire';
    case 'functions/unauthenticated': case 'functions/failed-precondition': case 'cont/altul': case 'cont/indisponibil': return 'cont';
    default:
      // Bucata contului n-a venit (fără rețea): importul cade cu o eroare de tip, fără cod.
      return cod === undefined && e instanceof TypeError ? 'fara-retea' : 'eroare';
  }
}

/** Biblioteca de acum, ca bibliotecă a contului (o citire, fără scriere). */
async function citeste(b: FrezeMele): Promise<BibliotecaCont | null> {
  let c: BibliotecaCont | null = null;
  await b.schimbaCont((x) => { c = x; return null; });
  return c;
}

function* loturi<T>(l: readonly T[]): Generator<readonly T[]> {
  for (let i = 0; i < l.length; i += LOT_FREZE) yield l.slice(i, i + LOT_FREZE);
}

/** O trecere: ia din cont, apoi trimite (de cel mult trei ori, cât îmbinările mai lasă ceva de trimis). */
export async function sincronizeaza(b: FrezeMele, cheama: Cheama): Promise<FelSincronizare> {
  try {
    const inceput = await citeste(b);
    if (!inceput) return 'eroare';
    let pana = inceput.sincron.dupa, complet = false, primul = true, poateScrie = true;
    const vazute = new Set<string>();
    for (let pagini = 0; pagini < 1000; pagini++) {
      const r = await cheama({ actiune: 'lista', dupa: pana }) as RaspunsListaFreze;
      if (primul && r.complet) complet = true;
      primul = false;
      poateScrie = r.poateScrie;
      for (const f of r.freze) vazute.add(f.id);
      if (r.freze.length > 0 || r.pana !== pana) await b.schimbaCont((c) => cuDinCont(c, r.freze, r.pana));
      pana = r.pana;
      if (!r.mai) break;
    }
    if (complet) await b.schimbaCont((c) => cuListaCompleta(c, vazute));
    if (!poateScrie) return 'citire';
    const refuzate = new Set<string>();
    for (let runda = 0; runda < 3; runda++) {
      const acum = await citeste(b);
      if (!acum) break;
      const t = deTrimis(acum);
      const scrise = t.scrise.filter((f) => !refuzate.has(f.id) && !(runda > 0 && acum.sincron.plina.includes(f.id)));
      const sterse = t.sterse;
      if (scrise.length === 0 && sterse.length === 0) break;
      const trimite = async (lot: DeTrimis, cerere: CerereFreze): Promise<void> => {
        const r = await cheama(cerere) as RaspunsScrieFreze;
        for (const x of r.rezultate) if (x.stare === 'plina') refuzate.add(x.id);
        await b.schimbaCont((c) => cuRezultate(c, lot, r.rezultate));
      };
      for (const l of loturi<FrezaTrimisa>(scrise)) await trimite({ scrise: l, sterse: [], mari: [] }, { actiune: 'scrie', freze: l });
      for (const l of loturi<StergereTrimisa>(sterse)) await trimite({ scrise: [], sterse: l, mari: [] }, { actiune: 'sterge', freze: l });
    }
    return 'la-zi';
  } catch (e) {
    return felEroare(e);
  }
}

/** Conflictul unei freze, la alegerea omului (pleacă la sincronizarea următoare). */
export async function rezolvaConflictul(b: FrezeMele, id: string, alegere: Alegere, idNou: () => string = idFreza, acum: number = Date.now()): Promise<void> {
  await b.schimbaCont((c) => (c.sincron.conflicte.has(id) ? rezolva(c, id, alegere, idNou, acum) : null));
}

/* ── În fereastră: o sincronizare pe bibliotecă, programată ──────────────────────────────────────────────────────── */

/** Starea legăturii cu contul: se sincronizează acum, sau cum s-a încheiat ultima trecere (null: încă niciuna). */
export type StareLegatura = { readonly ruleaza: boolean; readonly ultima: FelSincronizare | null };

type Legatura = {
  stare: StareLegatura;
  readonly ascultatori: Set<() => void>;
  dinNou: boolean;
  ceas: ReturnType<typeof setTimeout> | null;
  cheama: Cheama | null;
};
const legaturi = new Map<string, Legatura>();

function legatura(cheie: string): Legatura {
  let l = legaturi.get(cheie);
  if (!l) {
    l = { stare: { ruleaza: false, ultima: null }, ascultatori: new Set(), dinNou: false, ceas: null, cheama: null };
    legaturi.set(cheie, l);
  }
  return l;
}

function puneStare(l: Legatura, s: StareLegatura): void {
  l.stare = s;
  for (const f of l.ascultatori) f();
}

/** Pornește o trecere acum (sau după cea care rulează). */
function porneste(cheie: string): void {
  const l = legatura(cheie);
  if (!l.cheama) return;
  if (l.stare.ruleaza) { l.dinNou = true; return; }
  const cheama = l.cheama;
  puneStare(l, { ...l.stare, ruleaza: true });
  void sincronizeaza(frezeMele(cheie), cheama).then((fel) => {
    puneStare(l, { ruleaza: false, ultima: fel });
    if (l.dinNou) { l.dinNou = false; porneste(cheie); }
  });
}

/** După o schimbare a omului: o trecere la 2 s fără altă schimbare. */
function programeaza(cheie: string): void {
  const l = legatura(cheie);
  if (l.ceas !== null) clearTimeout(l.ceas);
  l.ceas = setTimeout(() => { l.ceas = null; porneste(cheie); }, 2000);
}

export type Sincronizare = {
  readonly stare: StareLegatura;
  /** După o schimbare a omului. */
  readonly programeaza: () => void;
  /** Acum (butonul „Sincronizează”). */
  readonly acum: () => void;
  readonly rezolva: (id: string, alegere: Alegere) => Promise<void>;
};

/**
 * Sincronizarea bibliotecii din fereastră: doar pentru biblioteca unui cont (`uid`), cu configurația aplicației; o trecere
 * la deschidere și la revenirea rețelei. Fără cont (sau fără configurație), nimic.
 */
export function useSincronizare(cheie: string, uid: string | null, config: Config | null): Sincronizare {
  const l = legatura(cheie);
  const activa = uid !== null && config !== null;
  useEffect(() => {
    if (!activa) { l.cheama = null; return; }
    l.cheama = (c) => import('./PanouCont.tsx').then((m) => m.cheamaFrezele(config, uid, c));
    porneste(cheie);
    const online = (): void => { porneste(cheie); };
    window.addEventListener('online', online);
    return () => { window.removeEventListener('online', online); };
  }, [cheie, uid, config, activa, l]);
  const stare = useSyncExternalStore((f) => { l.ascultatori.add(f); return () => { l.ascultatori.delete(f); }; }, () => l.stare);
  return useMemo(() => ({
    stare,
    programeaza: () => { if (activa) programeaza(cheie); },
    acum: () => { if (activa) porneste(cheie); },
    rezolva: async (id, alegere) => {
      await rezolvaConflictul(frezeMele(cheie), id, alegere);
      if (activa) porneste(cheie);
    },
  }), [stare, activa, cheie]);
}
