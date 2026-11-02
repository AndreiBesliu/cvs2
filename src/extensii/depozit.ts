/**
 * Extensiile instalate (ADR 0127 §B), în browserul omului: IndexedDB `cncvs2-extensii`, un rând pe extensie, cu manifestul,
 * fișierele, de unde au venit și când. Merge și offline; nu e al contului. O instalare cu același id înlocuiește rândul.
 */
import type { Manifest } from './pachet.ts';

export type SursaExtensie = { readonly fel: 'fisier'; readonly nume: string } | { readonly fel: 'adresa'; readonly adresa: string };
export type ExtensieInstalata = {
  readonly id: string;
  readonly manifest: Manifest;
  readonly fisiere: Readonly<Record<string, Uint8Array>>;
  readonly octeti: number;
  readonly sursa: SursaExtensie;
  /** Data instalării, ISO. */
  readonly instalat: string;
};

const BAZA = 'cncvs2-extensii';
const EXTENSII = 'extensii';

/** Browserul nu ține nimic (fereastră privată, date blocate): extensiile nu se pot instala. */
export class FaraStocare extends Error {}

let deschisa: Promise<IDBDatabase> | null = null;

function deschide(): Promise<IDBDatabase> {
  deschisa ??= new Promise<IDBDatabase>((rezolva, respinge) => {
    let r: IDBOpenDBRequest;
    try {
      r = indexedDB.open(BAZA, 1);
    } catch (e) {
      respinge(new FaraStocare(String(e)));
      return;
    }
    r.onupgradeneeded = () => { r.result.createObjectStore(EXTENSII, { keyPath: 'id' }); };
    r.onsuccess = () => {
      const db = r.result;
      db.onversionchange = () => { db.close(); deschisa = null; };
      rezolva(db);
    };
    r.onerror = () => respinge(new FaraStocare(String(r.error)));
    r.onblocked = () => respinge(new FaraStocare('baza extensiilor e blocată de altă filă'));
  });
  void deschisa.catch(() => { deschisa = null; });
  return deschisa;
}

function cere<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((rezolva, respinge) => {
    r.onsuccess = () => rezolva(r.result);
    r.onerror = () => respinge(r.error);
  });
}

async function magazin(mod: IDBTransactionMode): Promise<{ readonly s: IDBObjectStore; readonly gata: Promise<void> }> {
  const t = (await deschide()).transaction(EXTENSII, mod);
  const gata = new Promise<void>((rezolva, respinge) => {
    t.oncomplete = () => rezolva();
    t.onerror = () => respinge(t.error);
    t.onabort = () => respinge(t.error ?? new Error('tranzacție oprită'));
  });
  return { s: t.objectStore(EXTENSII), gata };
}

/** Extensiile instalate, după nume. */
export async function listaExtensii(): Promise<readonly ExtensieInstalata[]> {
  const { s } = await magazin('readonly');
  const toate = await cere(s.getAll() as IDBRequest<ExtensieInstalata[]>);
  return toate.sort((a, b) => a.manifest.nume.localeCompare(b.manifest.nume) || a.id.localeCompare(b.id));
}

export async function scrieExtensia(e: ExtensieInstalata): Promise<void> {
  const { s, gata } = await magazin('readwrite');
  s.put(e);
  await gata;
}

export async function scoateExtensia(id: string): Promise<void> {
  const { s, gata } = await magazin('readwrite');
  s.delete(id);
  await gata;
}
