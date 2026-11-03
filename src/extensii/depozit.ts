/**
 * Extensiile instalate (ADR 0127 §B), în browserul omului: IndexedDB `cncvs2-extensii`, un rând pe extensie, cu manifestul,
 * fișierele, de unde au venit și când. Merge și offline; nu e al contului. O instalare cu același id înlocuiește rândul.
 *
 * Din versiunea 2 a bazei (ADR 0128 §B), și datele fiecărei extensii: `date` (valorile) și `marimi` (octeții fiecărei chei,
 * citiți la plafon fără să aducă valorile), cu cheia `[id, cheie]`. Scoaterea extensiei le șterge în aceeași tranzacție.
 */
import type { Manifest } from './pachet.ts';
import type { DepozitDate } from './stocare.ts';

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
const DATE = 'date';
const MARIMI = 'marimi';
/** Toate cheile `[id, …]` ale unei extensii: o listă mai scurtă e înaintea oricărei chei, iar o listă după orice șir. */
const aleExtensiei = (id: string): IDBKeyRange => IDBKeyRange.bound([id], [id, []]);

/** Browserul nu ține nimic (fereastră privată, date blocate): extensiile nu se pot instala. */
export class FaraStocare extends Error {}

let deschisa: Promise<IDBDatabase> | null = null;

function deschide(): Promise<IDBDatabase> {
  deschisa ??= new Promise<IDBDatabase>((rezolva, respinge) => {
    let r: IDBOpenDBRequest;
    try {
      r = indexedDB.open(BAZA, 2);
    } catch (e) {
      respinge(new FaraStocare(String(e)));
      return;
    }
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(EXTENSII)) db.createObjectStore(EXTENSII, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(DATE)) db.createObjectStore(DATE, { keyPath: ['id', 'cheie'] });
      if (!db.objectStoreNames.contains(MARIMI)) db.createObjectStore(MARIMI, { keyPath: ['id', 'cheie'] });
    };
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

async function tranzactie(magazine: readonly string[], mod: IDBTransactionMode): Promise<{ readonly t: IDBTransaction; readonly gata: Promise<void> }> {
  const t = (await deschide()).transaction([...magazine], mod);
  const gata = new Promise<void>((rezolva, respinge) => {
    t.oncomplete = () => rezolva();
    t.onerror = () => respinge(t.error);
    t.onabort = () => respinge(t.error ?? new Error('tranzacție oprită'));
  });
  return { t, gata };
}

async function magazin(mod: IDBTransactionMode): Promise<{ readonly s: IDBObjectStore; readonly gata: Promise<void> }> {
  const { t, gata } = await tranzactie([EXTENSII], mod);
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

/** Scoate extensia și datele ei, într-o singură tranzacție. */
export async function scoateExtensia(id: string): Promise<void> {
  const { t, gata } = await tranzactie([EXTENSII, DATE, MARIMI], 'readwrite');
  t.objectStore(EXTENSII).delete(id);
  t.objectStore(DATE).delete(aleExtensiei(id));
  t.objectStore(MARIMI).delete(aleExtensiei(id));
  await gata;
}

/** Datele extensiilor (ADR 0128 §B), pentru serviciul `stocare.*`. */
export const depozitDate: DepozitDate = {
  async citeste(id, cheie) {
    const { t } = await tranzactie([DATE], 'readonly');
    const r = await cere(t.objectStore(DATE).get([id, cheie]) as IDBRequest<{ readonly valoare: unknown } | undefined>);
    return r?.valoare;
  },
  async scrie(id, cheie, valoare, octeti) {
    const { t, gata } = await tranzactie([DATE, MARIMI], 'readwrite');
    t.objectStore(DATE).put({ id, cheie, valoare });
    t.objectStore(MARIMI).put({ id, cheie, octeti });
    await gata;
  },
  async sterge(id, cheie) {
    const { t, gata } = await tranzactie([DATE, MARIMI], 'readwrite');
    t.objectStore(DATE).delete([id, cheie]);
    t.objectStore(MARIMI).delete([id, cheie]);
    await gata;
  },
  async marimi(id) {
    const { t } = await tranzactie([MARIMI], 'readonly');
    const toate = await cere(t.objectStore(MARIMI).getAll(aleExtensiei(id)) as IDBRequest<{ readonly cheie: string; readonly octeti: number }[]>);
    return new Map(toate.map((r) => [r.cheie, r.octeti]));
  },
};

/** Câți octeți ocupă datele unei extensii (gestionarea le arată). */
export async function octetiDate(id: string): Promise<number> {
  let n = 0;
  for (const m of (await depozitDate.marimi(id)).values()) n += m;
  return n;
}
