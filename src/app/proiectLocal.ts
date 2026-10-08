import type { Document } from '../model/document.ts';
import { incarca, jsonCanonic } from '../model/incarcare.ts';

/**
 * Proiectul salvat în browser (`PLAN.md` §3.6, ADR 0016): o singură bază IndexedDB, cu nume nou (datele aplicației vechi
 * rămân neatinse), și un singur scriitor între file (Web Locks).
 *
 * - **Versiunile:** fiecare schimbare scrie documentul ca JSON canonic sub cheia `[proiect, rev]`, într-o tranzacție. O
 *   tranzacție întreruptă lasă versiunea dinainte întreagă. Se păstrează ultimele `VERSIUNI_PASTRATE`.
 * - **Scrierea compară revizia:** se scrie doar peste versiunea pe care fila a citit-o sau a scris-o ultima. Dacă între timp
 *   a scris altcineva (fără Web Locks, două file pot crede că scriu), nu se acoperă nimic: scrierea e refuzată.
 * - **Deschiderea** trece prin singura ușă (`incarca`). Un proiect care nu se poate deschide (scris de o versiune mai
 *   nouă, stricat) NU se acoperă: fila lucrează în memorie și o spune. Blocarea de scriitor se cere abia după o citire
 *   reușită, și se eliberează dacă deschiderea a depășit timpul.
 * - **A doua filă** doar citește: primește fiecare versiune salvată de scriitor (BroadcastChannel) și devine ea scriitorul
 *   când fila care scria se închide.
 */
export const BAZA = 'cncvs2-proiecte';
const VERSIUNE_BAZA = 1;
const VERSIUNI = 'versiuni';
const PROIECT = 'proiect';
export const VERSIUNI_PASTRATE = 20;
const BLOCARE = 'cncvs2-proiect-scriitor';
const CANAL = 'cncvs2-proiect';
/** Peste atât, deschiderea bazei se consideră blocată: aplicația pornește în memorie, nu rămâne albă. */
const TERMEN_MS = 4000;

/** Altă filă a salvat între timp: fila asta nu mai scrie, ca să nu acopere versiunea aceea. */
export class ConflictDeScriere extends Error {}

export type DepozitProiect = { readonly scrie: (doc: Document) => Promise<void> };

export type Urmarire = {
  /** Fila care scrie a salvat o versiune nouă. */
  readonly laVersiune: (doc: Document) => void;
  /** Fila care scria s-a închis: fila asta devine scriitorul, de la ultima versiune salvată. */
  readonly laScriitor: (depozit: DepozitProiect, doc: Document | null) => void;
  /**
   * Ultima versiune salvată nu se poate deschide aici (de exemplu, a scris-o o versiune mai nouă a aplicației). Fila nu
   * mai scrie și o spune; dacă primise blocarea, o eliberează, ca o filă care o poate citi să devină scriitorul.
   */
  readonly laNecitita: (motiv: string) => void;
};

export type ProiectDeschis =
  /** Fila asta scrie proiectul; `doc` e cel salvat, sau null dacă nu e niciunul. */
  | { readonly mod: 'scriitor'; readonly doc: Document | null; readonly depozit: DepozitProiect }
  /** Altă filă scrie: aici se citește ultima versiune salvată, ținută la zi prin `urmareste`. */
  | { readonly mod: 'doar-citire'; readonly doc: Document | null; readonly urmareste: (u: Urmarire) => () => void }
  /** Proiectul salvat nu s-a putut deschide; fila lucrează în memorie, fără să-l acopere. */
  | { readonly mod: 'nu-se-deschide'; readonly motiv: string }
  /** Browserul nu dă memorie locală (fereastră privată, date blocate), sau deschiderea a eșuat. */
  | { readonly mod: 'fara-memorie'; readonly motiv: string };

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
      if (!r.result.objectStoreNames.contains(VERSIUNI)) r.result.createObjectStore(VERSIUNI);
    };
    r.onsuccess = () => { ok(r.result); };
    r.onerror = () => { eroare(r.error ?? new Error('IndexedDB')); };
    r.onblocked = () => { eroare(new Error('baza e blocată de altă filă')); };
  });
}

const INTERVAL = (): IDBKeyRange => IDBKeyRange.bound([PROIECT, 0], [PROIECT, Number.MAX_SAFE_INTEGER]);

type Versiune = { readonly rev: number; readonly valoare: unknown };

/** Ultima versiune salvată (cea cu revizia cea mai mare), sau null. */
async function ultimaVersiune(store: IDBObjectStore): Promise<Versiune | null> {
  const cursor = await cerere(store.openCursor(INTERVAL(), 'prev'));
  if (!cursor) return null;
  const cheie = cursor.key as [string, number];
  return { rev: cheie[1], valoare: cursor.value };
}

/** Versiunea citită, prin singura ușă. Orice valoare care nu e text e un proiect care nu se deschide, nu „niciun proiect”. */
function documentDin(v: Versiune | null): { readonly ok: true; readonly doc: Document | null } | { readonly ok: false; readonly motiv: string } {
  if (!v) return { ok: true, doc: null };
  if (typeof v.valoare !== 'string') return { ok: false, motiv: 'versiunea salvată nu e text' };
  let brut: unknown;
  try {
    brut = JSON.parse(v.valoare);
  } catch {
    return { ok: false, motiv: 'textul salvat nu e JSON' };
  }
  const r = incarca(brut);
  return r.ok ? { ok: true, doc: r.doc } : r;
}

async function citeste(db: IDBDatabase): Promise<Versiune | null> {
  return ultimaVersiune(db.transaction(VERSIUNI, 'readonly').objectStore(VERSIUNI));
}

function terminata(tx: IDBTransaction): Promise<void> {
  return new Promise((ok, eroare) => {
    tx.oncomplete = () => { ok(); };
    tx.onerror = () => { eroare(tx.error ?? new Error('IndexedDB')); };
    tx.onabort = () => { eroare(tx.error ?? new Error('tranzacția a fost întreruptă')); };
  });
}

function depozit(db: IDBDatabase, revCitita: number | null, canal: BroadcastChannel | null): DepozitProiect {
  // Scrierile pleacă în ordine: o salvare lentă nu e întrecută de una mai nouă.
  let coada: Promise<void> = Promise.resolve();
  let asteptata = revCitita;
  return {
    scrie: (doc) => {
      coada = coada.catch(() => undefined).then(async () => {
        // JSON-ul canonic aici, în coadă: o eroare a lui e o salvare eșuată, cu motiv, nu o cădere a aplicației.
        const text = jsonCanonic(doc);
        const tx = db.transaction(VERSIUNI, 'readwrite');
        const terminare = terminata(tx);
        const versiuni = tx.objectStore(VERSIUNI);
        const ultima = await ultimaVersiune(versiuni);
        if ((ultima?.rev ?? null) !== asteptata || (ultima && doc.rev <= ultima.rev)) {
          tx.abort();
          await terminare.catch(() => undefined);
          throw new ConflictDeScriere('altă filă a salvat proiectul între timp');
        }
        versiuni.put(text, [PROIECT, doc.rev]);
        // Versiunile mai vechi decât ultimele păstrate pleacă în aceeași tranzacție; cea scrisă acum e cea mai nouă.
        const chei = await cerere(versiuni.getAllKeys(INTERVAL()));
        for (const k of chei.slice(0, Math.max(0, chei.length - VERSIUNI_PASTRATE))) versiuni.delete(k);
        await terminare;
        asteptata = doc.rev;
        canal?.postMessage({ rev: doc.rev });
      });
      return coada;
    },
  };
}

type Blocare = { readonly elibereaza: () => void };

/** Cere blocarea de scriitor; `ifAvailable` nu așteaptă. Blocarea se ține până la `elibereaza` (sau închiderea filei). */
function cereBlocarea(asteapta: boolean, semnal?: AbortSignal): Promise<Blocare | null> {
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  // Fără Web Locks (o origine nesigură), fila scrie, iar compararea reviziei la scriere o oprește să acopere pe altcineva.
  if (!locks) return Promise.resolve({ elibereaza: () => undefined });
  return new Promise((ok, eroare) => {
    let elibereaza = (): void => undefined;
    const tinut = new Promise<void>((r) => { elibereaza = r; });
    const optiuni: LockOptions = asteapta ? (semnal ? { signal: semnal } : {}) : { ifAvailable: true };
    locks.request(BLOCARE, optiuni, (lock) => {
      if (!lock) {
        ok(null);
        return undefined;
      }
      ok({ elibereaza });
      return tinut;
    }).catch((e: unknown) => { eroare(e); });
  });
}

function canalNou(): BroadcastChannel | null {
  return typeof BroadcastChannel === 'function' ? new BroadcastChannel(CANAL) : null;
}

async function deschide(idb: IDBFactory, expirat: () => boolean): Promise<ProiectDeschis> {
  const db = await deschideBaza(idb);
  const citita = await citeste(db);
  const d = documentDin(citita);
  if (!d.ok) {
    db.close();
    return { mod: 'nu-se-deschide', motiv: d.motiv };
  }
  const blocare = await cereBlocarea(false);
  if (expirat()) {
    // Răspunsul a venit după termen: aplicația a pornit deja în memorie. Nimic nu rămâne ținut.
    blocare?.elibereaza();
    db.close();
    return { mod: 'fara-memorie', motiv: 'deschiderea a depășit timpul' };
  }
  if (blocare) {
    void navigator.storage?.persist?.().catch(() => false);
    return { mod: 'scriitor', doc: d.doc, depozit: depozit(db, citita?.rev ?? null, canalNou()) };
  }
  return {
    mod: 'doar-citire',
    doc: d.doc,
    urmareste: (u) => {
      const canal = canalNou();
      const oprire = new AbortController();
      let blocareTinuta: Blocare | null = null;
      let oprit = false;
      const reciteste = async (): Promise<{ ok: true; v: Versiune | null; doc: Document | null } | { ok: false; motiv: string }> => {
        const v = await citeste(db);
        const r = documentDin(v);
        return r.ok ? { ok: true, v, doc: r.doc } : r;
      };
      if (canal) {
        canal.onmessage = () => {
          void reciteste().then((r) => {
            if (oprit) return;
            if (!r.ok) u.laNecitita(r.motiv);
            else if (r.doc) u.laVersiune(r.doc);
          }, () => undefined);
        };
      }
      // Când fila care scrie se închide, blocarea vine aici: fila asta devine scriitorul, de la ultima versiune.
      cereBlocarea(true, oprire.signal).then(async (b) => {
        if (!b) return;
        if (oprit) { b.elibereaza(); return; }
        blocareTinuta = b;
        const r = await reciteste();
        if (oprit) return;
        if (!r.ok) {
          // Fila asta n-ar putea scrie fără să acopere o versiune pe care n-o înțelege: lasă blocarea altei file.
          b.elibereaza();
          blocareTinuta = null;
          if (canal) canal.onmessage = null;
          u.laNecitita(r.motiv);
          return;
        }
        // De-acum fila asta scrie: nu mai ascultă versiunile altora.
        if (canal) canal.onmessage = null;
        u.laScriitor(depozit(db, r.v?.rev ?? null, canal), r.doc);
      }, () => undefined);
      return () => {
        oprit = true;
        oprire.abort();
        blocareTinuta?.elibereaza();
        if (canal) canal.onmessage = null;
      };
    },
  };
}

export async function deschideProiect(): Promise<ProiectDeschis> {
  const idb = globalThis.indexedDB;
  if (!idb) return { mod: 'fara-memorie', motiv: 'browserul n-are IndexedDB' };
  let expirat = false;
  let ceas: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      deschide(idb, () => expirat),
      new Promise<ProiectDeschis>((_, eroare) => {
        ceas = setTimeout(() => { expirat = true; eroare(new Error('deschiderea a depășit timpul')); }, TERMEN_MS);
      }),
    ]);
  } catch (e) {
    return { mod: 'fara-memorie', motiv: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(ceas);
  }
}
