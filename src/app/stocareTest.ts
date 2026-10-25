/**
 * Rezultatele și pozele testului pas cu pas (ADR 0072), doar în browser: baza `cncvs2-test`, separată de proiecte
 * (`proiectLocal.ts`). Nimic nu pleacă pe server; raportul se face din ele, la cerere, ca un fișier descărcat.
 */

export type StarePas = 'bine' | 'nu' | 'sarit';
export type RezultatPas = { readonly stare: StarePas | null; readonly nota: string; readonly la: number };
/** Pasul la care a rămas omul (indexul în lista pașilor) și rezultatele, după id-ul pasului. */
export type StareTest = { readonly pas: number; readonly rezultate: Readonly<Record<string, RezultatPas>> };
export type Poza = { readonly id: number; readonly test: string; readonly pas: string; readonly la: number; readonly imagine: Blob };

const BAZA = 'cncvs2-test';
const STARI = 'stari';
const POZE = 'poze';

const cerere = <T>(r: IDBRequest<T>): Promise<T> => new Promise((ok, eroare) => {
  r.onsuccess = () => { ok(r.result); };
  r.onerror = () => { eroare(r.error); };
});
const gata = (tx: IDBTransaction): Promise<void> => new Promise((ok, eroare) => {
  tx.oncomplete = () => { ok(); };
  tx.onerror = () => { eroare(tx.error); };
  tx.onabort = () => { eroare(tx.error ?? new Error('tranzacția s-a oprit')); };
});

export function deschideStocarea(idb: IDBFactory = indexedDB): Promise<IDBDatabase> {
  const r = idb.open(BAZA, 1);
  r.onupgradeneeded = () => {
    r.result.createObjectStore(STARI);
    r.result.createObjectStore(POZE, { keyPath: 'id', autoIncrement: true }).createIndex('test', 'test');
  };
  return cerere(r);
}

export async function citesteStarea(db: IDBDatabase, test: string): Promise<StareTest | undefined> {
  return await cerere(db.transaction(STARI).objectStore(STARI).get(test)) as StareTest | undefined;
}

export async function scrieStarea(db: IDBDatabase, test: string, stare: StareTest): Promise<void> {
  const tx = db.transaction(STARI, 'readwrite');
  tx.objectStore(STARI).put(stare, test);
  await gata(tx);
}

export async function adaugaPoza(db: IDBDatabase, test: string, pas: string, imagine: Blob, la: number): Promise<number> {
  const tx = db.transaction(POZE, 'readwrite');
  const id = await cerere(tx.objectStore(POZE).add({ test, pas, la, imagine }));
  await gata(tx);
  return id as number;
}

/** Pozele testului, în ordinea în care au fost făcute. */
export async function pozele(db: IDBDatabase, test: string): Promise<Poza[]> {
  return await cerere(db.transaction(POZE).objectStore(POZE).index('test').getAll(test)) as Poza[];
}

/** Începe din nou: starea și pozele testului se șterg (ale altor teste rămân). */
export async function stergeTestul(db: IDBDatabase, test: string): Promise<void> {
  const tx = db.transaction([STARI, POZE], 'readwrite');
  tx.objectStore(STARI).delete(test);
  for (const k of await cerere(tx.objectStore(POZE).index('test').getAllKeys(test))) tx.objectStore(POZE).delete(k);
  await gata(tx);
}
