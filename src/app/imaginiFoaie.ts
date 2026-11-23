/**
 * Imaginile foilor (ADR 0272, felia 25.8↑a): octeții lor stau în afara documentului, într-o bază IndexedDB a lor, după
 * amprenta SHA-256 (cheia). Documentul se scrie întreg, ca JSON, la fiecare schimbare, cu ultimele versiuni păstrate: o
 * imagine de câțiva MB nu poate sta în el, iar versiunile o împart pe aceeași. Foaia ține doar amprenta
 * (`ImagineFoaie.sursa`) și așezarea.
 *
 * Curățarea (`curataLaPornire`) se face la pornire, în fila care scrie, cu stiva de anulare încă goală: ce nu mai folosește
 * nici documentul, nici vreo versiune păstrată a proiectului, și a fost pus de cel puțin o zi, se șterge. Ziua e plasa
 * celorlalte file: una care tocmai a pus o imagine n-a salvat-o poate încă în proiect. În timpul lucrului nu se șterge
 * nimic: o imagine scoasă se poate întoarce cu Ctrl+Z.
 */
import type { Document } from '../model/document.ts';
import { texteVersiuni } from './proiectLocal.ts';

/** Opacitatea unei imagini puse pe foaie (ADR 0272 §4): estompată, sub desen. */
export const OPACITATE_IMAGINE = 0.4;

const BAZA = 'cncvs2-imagini';
/** O imagine pusă mai de curând de atât nu se șterge la curățare (altă filă poate n-a salvat-o încă în proiect). */
export const PASTRATA_CEL_PUTIN_MS = 24 * 60 * 60 * 1000;
const IMAGINI = 'imagini';

/** O imagine păstrată: octeții (fișierul, PNG sau JPEG), tipul lor și mărimea în pixeli. */
export interface ImaginePastrata {
  readonly sursa: string;
  readonly tip: string;
  readonly octeti: Blob;
  readonly latimePx: number;
  readonly inaltimePx: number;
  /** Când a fost păstrată întâi (ms de la epocă). */
  readonly la: number;
}

const cerere = <T>(r: IDBRequest<T>): Promise<T> => new Promise((ok, eroare) => {
  r.onsuccess = () => { ok(r.result); };
  r.onerror = () => { eroare(r.error); };
});
const gata = (tx: IDBTransaction): Promise<void> => new Promise((ok, eroare) => {
  tx.oncomplete = () => { ok(); };
  tx.onerror = () => { eroare(tx.error); };
  tx.onabort = () => { eroare(tx.error ?? new Error('tranzacția s-a oprit')); };
});

function deschide(idb: IDBFactory): Promise<IDBDatabase> {
  const r = idb.open(BAZA, 1);
  r.onupgradeneeded = () => { r.result.createObjectStore(IMAGINI, { keyPath: 'sursa' }); };
  return cerere(r);
}

/** Amprenta SHA-256 a octeților, în hexazecimal (64 de caractere): cheia imaginii și `ImagineFoaie.sursa`. */
export async function amprenta(octeti: Uint8Array<ArrayBuffer>): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', octeti));
  let s = '';
  for (const b of h) s += b.toString(16).padStart(2, '0');
  return s;
}

/** Pură: o înregistrare citită din bază are forma unei imagini păstrate. */
export function esteImaginePastrata(x: unknown): x is ImaginePastrata {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o['sursa'] === 'string' && typeof o['tip'] === 'string' && o['octeti'] instanceof Blob
    && typeof o['latimePx'] === 'number' && typeof o['inaltimePx'] === 'number' && typeof o['la'] === 'number';
}

/**
 * Păstrează imaginea (dacă nu e deja) și îi dă amprenta. Aceeași imagine pusă de două ori se păstrează o dată, cu ora
 * primei puneri.
 */
export async function pastreaza(
  octeti: Uint8Array<ArrayBuffer>, tip: string, latimePx: number, inaltimePx: number, idb: IDBFactory = indexedDB,
): Promise<string> {
  const sursa = await amprenta(octeti);
  const db = await deschide(idb);
  try {
    const tx = db.transaction(IMAGINI, 'readwrite');
    const m = tx.objectStore(IMAGINI);
    const exista = await cerere(m.count(sursa));
    if (exista === 0) m.put({ sursa, tip, octeti: new Blob([octeti], { type: tip }), latimePx, inaltimePx, la: Date.now() } satisfies ImaginePastrata);
    await gata(tx);
  } finally {
    db.close();
  }
  return sursa;
}

/** Imaginea cu amprenta dată, sau null dacă nu e (ștearsă, sau dintr-un proiect adus din alt browser). */
export async function citeste(sursa: string, idb: IDBFactory = indexedDB): Promise<ImaginePastrata | null> {
  const db = await deschide(idb);
  try {
    const x: unknown = await cerere(db.transaction(IMAGINI).objectStore(IMAGINI).get(sursa));
    return esteImaginePastrata(x) ? x : null;
  } finally {
    db.close();
  }
}

/** Pură: amprentele imaginilor folosite de documentele date (pe toate foile lor). */
export function surseFolosite(documente: Iterable<Document>): Set<string> {
  const s = new Set<string>();
  for (const d of documente) for (const f of d.foi) for (const im of f.imagini ?? []) s.add(im.sursa);
  return s;
}

/**
 * Pură: amprentele imaginilor din textele versiunilor (JSON-ul salvat), citite fără ușă: doar `foi[].imagini[].sursa`. Un text
 * stricat ori străin nu are niciuna.
 */
export function surseDinTexte(texte: Iterable<unknown>): Set<string> {
  const s = new Set<string>();
  for (const x of texte) {
    if (typeof x !== 'string' || !x.includes('"imagini"')) continue;
    let d: unknown;
    try {
      d = JSON.parse(x);
    } catch {
      continue;
    }
    const foi = (d as { foi?: unknown } | null)?.foi;
    if (!Array.isArray(foi)) continue;
    for (const f of foi as unknown[]) {
      const imagini = (f as { imagini?: unknown } | null)?.imagini;
      if (!Array.isArray(imagini)) continue;
      for (const i of imagini as unknown[]) {
        const sursa = (i as { sursa?: unknown } | null)?.sursa;
        if (typeof sursa === 'string') s.add(sursa);
      }
    }
  }
  return s;
}

/** Pură: amprentele de șters: imaginile pe care nu le folosește nimeni, puse înainte de `pana` (ms de la epocă). */
export function deSters(inregistrari: Iterable<{ readonly sursa: string; readonly la: number }>, folosite: ReadonlySet<string>, pana: number): string[] {
  const r: string[] = [];
  for (const x of inregistrari) if (x.la < pana && !folosite.has(x.sursa)) r.push(x.sursa);
  return r;
}

/** Șterge imaginile nefolosite (`folosite`) puse înainte de `pana`; întoarce câte a șters. */
export async function curata(folosite: ReadonlySet<string>, pana: number, idb: IDBFactory = indexedDB): Promise<number> {
  const db = await deschide(idb);
  try {
    const tx = db.transaction(IMAGINI, 'readwrite');
    const m = tx.objectStore(IMAGINI);
    // Înregistrările vin cu octeții ca Blob: o referință, nu conținutul.
    const toate = (await cerere(m.getAll())).filter(esteImaginePastrata);
    const sterse = deSters(toate, folosite, pana);
    for (const k of sterse) m.delete(k);
    await gata(tx);
    return sterse.length;
  } finally {
    db.close();
  }
}

/**
 * Curățarea la pornire (ADR 0272 §2), în fila care scrie: imaginile pe care nu le folosește nici documentul de acum, nici
 * vreo versiune păstrată a proiectului, puse de cel puțin o zi, se șterg. O bază a imaginilor care nu există nu se creează.
 */
export async function curataLaPornire(doc: Document, idb: IDBFactory = indexedDB): Promise<number> {
  if (typeof idb.databases === 'function' && !(await idb.databases()).some((d) => d.name === BAZA)) return 0;
  const folosite = surseFolosite([doc]);
  for (const s of surseDinTexte(await texteVersiuni(idb))) folosite.add(s);
  return curata(folosite, Date.now() - PASTRATA_CEL_PUTIN_MS, idb);
}
