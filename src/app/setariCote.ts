/**
 * Setările cotelor (ADR 0330 §6), ale aplicației, nu ale unei cote: ținute în browser (`cncvs2.cote`, JSON cu versiune),
 * aplicate pe loc tuturor cotelor. Felia 10.4↑a-2 citește grupurile ei (comportamentul, lipirea, măsurarea); fereastra
 * Setări, care le scrie, vine în a-3. Orice valoare lipsă, de alt tip sau în afara marginilor ia implicitul ei, câmp cu câmp:
 * o setare stricată nu le strică pe celelalte.
 */
import { useSyncExternalStore } from 'react';
import type { FelPunct, OptiuniPuncte } from '../geom/lipirePuncte.ts';

export const FELURI_LIPIRE = ['varf', 'mijloc', 'centru', 'cadran', 'cutie', 'foaie', 'grila'] as const;
export type FelLipire = (typeof FELURI_LIPIRE)[number];

export type SetariCote = {
  readonly comportament: {
    /** Cotele noi sunt legate de forme (da) sau libere. */
    readonly legate: boolean;
    /** Unealta pornește cu Automată, sau cu ultimul fel folosit. */
    readonly pornire: 'automata' | 'ultimul';
    /** După o cotă pusă: unealta rămâne Cote, sau se întoarce la Selecție. */
    readonly dupa: 'ramane' | 'selectie';
  };
  readonly lipire: {
    readonly felurile: Readonly<Record<FelLipire, boolean>>;
    /** Toleranța, în pixeli pe ecran, 4–20. */
    readonly toleranta: number;
    /** Punctul cel mai apropiat de pe contur: cu Ctrl, mereu, niciodată. */
    readonly contur: 'ctrl' | 'mereu' | 'niciodata';
  };
  readonly masurare: {
    readonly distanta: boolean;
    readonly delta: boolean;
    readonly unghi: boolean;
    /** Unde se arată: lângă cursor, în bara de jos. */
    readonly cursor: boolean;
    readonly bara: boolean;
  };
};

export const SETARI_IMPLICITE: SetariCote = {
  comportament: { legate: true, pornire: 'automata', dupa: 'ramane' },
  lipire: { felurile: { varf: true, mijloc: true, centru: true, cadran: true, cutie: true, foaie: true, grila: true }, toleranta: 8, contur: 'ctrl' },
  masurare: { distanta: true, delta: true, unghi: true, cursor: true, bara: true },
};

export const CHEIE_SETARI_COTE = 'cncvs2.cote';
export const TOLERANTA_MINIMA = 4;
export const TOLERANTA_MAXIMA = 20;

type Brut = Record<string, unknown>;
const obiect = (x: unknown): Brut => (typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Brut) : {});
const bif = (x: unknown, implicit: boolean): boolean => (typeof x === 'boolean' ? x : implicit);
const unul = <T extends string>(x: unknown, valori: readonly T[], implicit: T): T => ((valori as readonly unknown[]).includes(x) ? (x as T) : implicit);

/** Pură: setările din textul ținut în browser (sau null), cu implicitul fiecărui câmp lipsă ori greșit. */
export function citesteSetariCote(text: string | null): SetariCote {
  let brut: Brut = {};
  try {
    brut = obiect(text === null ? null : JSON.parse(text));
  } catch {
    // Un text stricat: implicitele.
  }
  const I = SETARI_IMPLICITE;
  const c = obiect(brut['comportament']), l = obiect(brut['lipire']), m = obiect(brut['masurare']), f = obiect(l['felurile']);
  const tol = l['toleranta'];
  return {
    comportament: {
      legate: bif(c['legate'], I.comportament.legate),
      pornire: unul(c['pornire'], ['automata', 'ultimul'], I.comportament.pornire),
      dupa: unul(c['dupa'], ['ramane', 'selectie'], I.comportament.dupa),
    },
    lipire: {
      felurile: Object.fromEntries(FELURI_LIPIRE.map((k) => [k, bif(f[k], I.lipire.felurile[k])])) as Record<FelLipire, boolean>,
      toleranta: typeof tol === 'number' && Number.isFinite(tol) && tol >= TOLERANTA_MINIMA && tol <= TOLERANTA_MAXIMA ? tol : I.lipire.toleranta,
      contur: unul(l['contur'], ['ctrl', 'mereu', 'niciodata'], I.lipire.contur),
    },
    masurare: {
      distanta: bif(m['distanta'], I.masurare.distanta),
      delta: bif(m['delta'], I.masurare.delta),
      unghi: bif(m['unghi'], I.masurare.unghi),
      cursor: bif(m['cursor'], I.masurare.cursor),
      bara: bif(m['bara'], I.masurare.bara),
    },
  };
}

/** Pură: textul de ținut în browser (cu versiunea). */
export const textSetariCote = (s: SetariCote): string => JSON.stringify({ v: 1, ...s });

/**
 * Pură: opțiunile lipirii pe puncte, din setări și din tastele ținute, sau null (lipirea oprită: butonul Lipire oprit, sau
 * pornit cu Alt ținut; Alt inversează, ca peste tot). Toleranța e în pixeli, deci în mm se împarte la scara pânzei.
 */
export function optiuniLipireCote(s: SetariCote, taste: { readonly alt: boolean; readonly ctrl: boolean }, lipire: boolean, grila: number | null, scara: number): OptiuniPuncte | null {
  if (lipire === taste.alt) return null;
  const felurile = new Set<FelPunct>(FELURI_LIPIRE.filter((k) => s.lipire.felurile[k]));
  const peContur = s.lipire.contur === 'mereu' || (s.lipire.contur === 'ctrl' && taste.ctrl);
  return { toleranta: s.lipire.toleranta / scara, felurile, grila, peContur };
}

let acum: SetariCote | null = null;
const ascultatori = new Set<() => void>();

/** Setările de acum (citite din browser la prima cerere; fără stocare, implicitele). */
export function setariCote(): SetariCote {
  if (acum) return acum;
  let text: string | null = null;
  try {
    text = localStorage.getItem(CHEIE_SETARI_COTE);
  } catch {
    // Fără stocare: implicitele.
  }
  acum = citesteSetariCote(text);
  return acum;
}

/** Schimbă setările: pe loc pentru toți cei care le arată, apoi în browser (fără stocare: cât ține pagina). */
export function schimbaSetariCote(s: SetariCote): void {
  acum = citesteSetariCote(textSetariCote(s));
  try {
    localStorage.setItem(CHEIE_SETARI_COTE, textSetariCote(acum));
  } catch {
    // Fără stocare: setarea ține doar cât pagina.
  }
  for (const f of ascultatori) f();
}

function asculta(f: () => void): () => void {
  ascultatori.add(f);
  return () => { ascultatori.delete(f); };
}

/** Setările, ca stare React: o schimbare (din fereastra Setări, din altă parte a aplicației) redesenează pe loc. */
export function useSetariCote(): SetariCote {
  return useSyncExternalStore(asculta, setariCote, setariCote);
}
