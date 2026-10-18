/**
 * Publicarea (ADR 0044): instanțele cu proiectele lor și amprenta `meta/deployment`, un document pe instanță, scris de
 * scriptul de publicare după fiecare publicare reușită și citit de Diagnoză (decizia owner-ului din 15.08: „amprenta”;
 * `docs/faza2/admin/RAPORT.md` §5.1, punctul 6: cu sha-ul fiecărei ținte). Pur: îl folosesc scriptul (Node) și pagina
 * `/admin`, fără Firebase.
 */

/** Proiectul Firebase al fiecărei instanțe publicabile: sursa unică (scriptul, workflow-ul, Diagnoza). */
export const PROIECTE = { test: 'cncvectorstudio-test', live: 'cncvectorstudio' } as const;
export type Instanta = keyof typeof PROIECTE;

export function esteInstanta(x: unknown): x is Instanta {
  return x === 'test' || x === 'live';
}

export const SCHEMA_AMPRENTA = 1;
export const APP = 'cncvs2';

/**
 * Țintele unei publicări, cu cheia lor din amprentă (fără caractere speciale: cheile devin căi de câmp în Firestore) și
 * ținta lui `firebase deploy --only`.
 */
export const TINTE = {
  hosting: 'hosting',
  functii: 'functions:cncvs2',
  reguli: 'firestore:rules',
  indecsi: 'firestore:indexes',
} as const;
export type Tinta = keyof typeof TINTE;
export const TOATE_TINTELE: readonly Tinta[] = ['hosting', 'functii', 'reguli', 'indecsi'];
export const TINTE_SERVER: readonly Tinta[] = ['functii', 'reguli', 'indecsi'];

/** Ce s-a publicat pe o țintă. */
export interface Publicare {
  /** Commit-ul, 40 de caractere hex. */
  readonly gitSha: string;
  /** Ramura (sau `HEAD`, detașat). */
  readonly gitRef: string;
  /** Fără modificări necomise. Pe live e mereu adevărat (workflow-ul publică un checkout curat). */
  readonly arboreCurat: boolean;
  /** ISO. */
  readonly deployedAt: string;
  /** `github:<actor> #<rulare>` sau `local`. */
  readonly deployedBy: string;
  /** Doar la hosting: când s-a făcut build-ul din `dist/` (ISO). */
  readonly builtAt?: string;
}

export interface Amprenta {
  readonly schema: typeof SCHEMA_AMPRENTA;
  readonly app: typeof APP;
  readonly projectId: string;
  /** Ținta publicată cel mai recent, fiecare cu publicarea ei; o țintă niciodată publicată prin script lipsește. */
  readonly tinte: Readonly<Partial<Record<Tinta, Publicare>>>;
}

export const SHA_COMPLET = /^[0-9a-f]{40}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function publicareDin(x: unknown, tinta: Tinta): Publicare | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  const { gitSha, gitRef, arboreCurat, deployedAt, deployedBy, builtAt } = o;
  if (typeof gitSha !== 'string' || !SHA_COMPLET.test(gitSha)) return null;
  if (typeof gitRef !== 'string' || gitRef === '' || gitRef.length > 200) return null;
  if (typeof arboreCurat !== 'boolean') return null;
  if (typeof deployedAt !== 'string' || !ISO.test(deployedAt)) return null;
  if (typeof deployedBy !== 'string' || deployedBy === '' || deployedBy.length > 200) return null;
  if (builtAt !== undefined && (tinta !== 'hosting' || typeof builtAt !== 'string' || !ISO.test(builtAt))) return null;
  return { gitSha, gitRef, arboreCurat, deployedAt, deployedBy, ...(typeof builtAt === 'string' ? { builtAt } : {}) };
}

/** Amprenta citită (documentul ca obiect simplu), validată; orice abatere de la formă = `nevalid`. */
export function amprentaDin(x: unknown): Amprenta | 'nevalid' {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return 'nevalid';
  const o = x as Record<string, unknown>;
  if (o['schema'] !== SCHEMA_AMPRENTA || o['app'] !== APP) return 'nevalid';
  const projectId = o['projectId'];
  if (typeof projectId !== 'string' || projectId === '') return 'nevalid';
  const t = o['tinte'];
  if (typeof t !== 'object' || t === null || Array.isArray(t)) return 'nevalid';
  const tinte: Partial<Record<Tinta, Publicare>> = {};
  for (const [cheie, valoare] of Object.entries(t)) {
    if (!(TOATE_TINTELE as readonly string[]).includes(cheie)) return 'nevalid';
    const p = publicareDin(valoare, cheie as Tinta);
    if (!p) return 'nevalid';
    tinte[cheie as Tinta] = p;
  }
  return { schema: SCHEMA_AMPRENTA, app: APP, projectId, tinte };
}

/** Primele 12 caractere ale sha-ului: așa îl poartă build-ul (`__VERSIUNE__`, `vite.config.ts`). */
export function shaScurt(sha: string): string {
  return sha.slice(0, 12);
}
