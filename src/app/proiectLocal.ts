import type { Document } from '../model/document.ts';
import { incarca, jsonCanonic } from '../model/incarcare.ts';

/**
 * Proiectul salvat în browser (`PLAN.md` §3.6, ADR 0016): o singură bază IndexedDB, cu nume nou (datele aplicației vechi
 * rămân neatinse), și un singur scriitor între file (Web Locks).
 *
 * - **Versiunile:** fiecare schimbare scrie documentul ca JSON canonic sub cheia `[proiect, rev]`, într-o tranzacție. O
 *   tranzacție întreruptă lasă versiunea dinainte întreagă. Se păstrează ultimele `VERSIUNI_PASTRATE`.
 * - **Deschiderea** trece prin singura ușă (`incarca`). Un proiect care nu se poate deschide (scris de o versiune mai
 *   nouă, stricat) NU se acoperă: fila lucrează în memorie și o spune.
 * - **A doua filă** doar citește: vede ultima versiune salvată, dar nu schimbă și nu scrie nimic.
 */
export const BAZA = 'cncvs2-proiecte';
const VERSIUNE_BAZA = 1;
const VERSIUNI = 'versiuni';
const META = 'meta';
const PROIECT = 'proiect';
export const VERSIUNI_PASTRATE = 20;
const BLOCARE = 'cncvs2-proiect-scriitor';
/** Peste atât, deschiderea bazei se consideră blocată: aplicația pornește în memorie, nu rămâne albă. */
const TERMEN_MS = 4000;

export type DepozitProiect = { readonly scrie: (doc: Document) => Promise<void> };

export type ProiectDeschis =
  /** Fila asta scrie proiectul; `doc` e cel salvat, sau null dacă nu e niciunul. */
  | { readonly mod: 'scriitor'; readonly doc: Document | null; readonly depozit: DepozitProiect }
  /** Altă filă scrie: aici doar se citește ultima versiune salvată. */
  | { readonly mod: 'doar-citire'; readonly doc: Document | null }
  /** Proiectul salvat nu s-a putut deschide; fila lucrează în memorie, fără să-l acopere. */
  | { readonly mod: 'nu-se-deschide'; readonly motiv: string }
  /** Browserul nu dă memorie locală (fereastră privată, date blocate). */
  | { readonly mod: 'fara-memorie' };

function cerere<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((ok, eroare) => {
    r.onsuccess = () => { ok(r.result); };
    r.onerror = () => { eroare(r.error ?? new Error('IndexedDB')); };
  });
}

function deschideBaza(idb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((ok, eroare) => {
    const r = idb.open(BAZA, VERSIUNE_BAZA);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(VERSIUNI)) db.createObjectStore(VERSIUNI);
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    r.onsuccess = () => { ok(r.result); };
    r.onerror = () => { eroare(r.error ?? new Error('IndexedDB')); };
    r.onblocked = () => { eroare(new Error('baza e blocată de altă filă')); };
  });
}

/** Ultima versiune salvată a proiectului, ca text, sau null. */
async function ultimaVersiune(db: IDBDatabase): Promise<string | null> {
  const tx = db.transaction(VERSIUNI, 'readonly');
  const interval = IDBKeyRange.bound([PROIECT, 0], [PROIECT, Number.MAX_SAFE_INTEGER]);
  const cursor = await cerere(tx.objectStore(VERSIUNI).openCursor(interval, 'prev'));
  const valoare: unknown = cursor?.value;
  return typeof valoare === 'string' ? valoare : null;
}

function terminata(tx: IDBTransaction): Promise<void> {
  return new Promise((ok, eroare) => {
    tx.oncomplete = () => { ok(); };
    tx.onerror = () => { eroare(tx.error ?? new Error('IndexedDB')); };
    tx.onabort = () => { eroare(tx.error ?? new Error('tranzacția a fost întreruptă')); };
  });
}

function depozit(db: IDBDatabase): DepozitProiect {
  // Scrierile pleacă în ordine: o salvare lentă nu e întrecută de una mai nouă.
  let coada: Promise<void> = Promise.resolve();
  return {
    scrie: (doc) => {
      const text = jsonCanonic(doc);
      const rev = doc.rev;
      coada = coada.catch(() => undefined).then(async () => {
        const tx = db.transaction([VERSIUNI, META], 'readwrite');
        const versiuni = tx.objectStore(VERSIUNI);
        versiuni.put(text, [PROIECT, rev]);
        tx.objectStore(META).put({ proiect: PROIECT, rev }, 'activ');
        // Versiunile mai vechi decât ultimele păstrate pleacă în aceeași tranzacție.
        const chei = await cerere(versiuni.getAllKeys(IDBKeyRange.bound([PROIECT, 0], [PROIECT, Number.MAX_SAFE_INTEGER])));
        for (const k of chei.slice(0, Math.max(0, chei.length - VERSIUNI_PASTRATE))) versiuni.delete(k);
        await terminata(tx);
      });
      return coada;
    },
  };
}

/** Scriitorul unic: blocarea se ține cât trăiește fila. Fără Web Locks (browser vechi), fila scrie. */
function cereBlocarea(): Promise<boolean> {
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  if (!locks) return Promise.resolve(true);
  return new Promise((ok) => {
    void locks.request(BLOCARE, { ifAvailable: true }, (lock) => {
      ok(lock !== null);
      // Blocarea rămâne a filei până la închiderea ei.
      return lock ? new Promise<void>(() => undefined) : undefined;
    });
  });
}

function cuTermen<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, eroare) => { setTimeout(() => { eroare(new Error('timp depășit')); }, ms); })]);
}

async function deschide(idb: IDBFactory): Promise<ProiectDeschis> {
  const db = await deschideBaza(idb);
  const scriitor = await cereBlocarea();
  const text = await ultimaVersiune(db);
  let doc: Document | null = null;
  if (text !== null) {
    let brut: unknown;
    try {
      brut = JSON.parse(text);
    } catch {
      return { mod: 'nu-se-deschide', motiv: 'textul salvat nu e JSON' };
    }
    const r = incarca(brut);
    if (!r.ok) return { mod: 'nu-se-deschide', motiv: r.motiv };
    doc = r.doc;
  }
  if (!scriitor) return { mod: 'doar-citire', doc };
  void navigator.storage?.persist?.().catch(() => false);
  return { mod: 'scriitor', doc, depozit: depozit(db) };
}

export async function deschideProiect(): Promise<ProiectDeschis> {
  try {
    const idb = globalThis.indexedDB;
    if (!idb) return { mod: 'fara-memorie' };
    return await cuTermen(deschide(idb), TERMEN_MS);
  } catch {
    return { mod: 'fara-memorie' };
  }
}
