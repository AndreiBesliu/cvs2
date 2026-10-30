/**
 * Poza planșei pentru o sugestie (ADR 0110), doar în browser, între editor și pagina `/admin` (aceeași origine): editorul o
 * lasă aici și anunță pe un canal, iar fila Sugestii o ia în formularul sugestiei noi, o arată și o trimite odată cu ea.
 * Un singur loc: o poză nouă o înlocuiește pe cea veche; una neluată într-o zi nu se mai arată.
 */

const BAZA = 'cncvs2-sugestii';
const POZE = 'poze';
const CHEIE = 'ultima';
/** Canalul pe care editorul anunță o poză nouă: o filă `/admin` deja deschisă o ia de acolo. */
export const CANAL_POZA = 'cncvs2-sugestii';
/** Cât rămâne de luat o poză lăsată. */
export const VALABILA_MS = 24 * 3_600_000;

export interface PozaInAsteptare {
  readonly imagine: Blob;
  /** Când a fost făcută (ms de la epocă). */
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
  r.onupgradeneeded = () => { r.result.createObjectStore(POZE); };
  return cerere(r);
}

/** Pură: o poză păstrată are imaginea și ora ei, de cel mult o zi (o oră din viitor nu e una). */
export function estePozaValida(p: unknown, acum: number): p is PozaInAsteptare {
  if (typeof p !== 'object' || p === null) return false;
  const { imagine, la } = p as { imagine?: unknown; la?: unknown };
  return imagine instanceof Blob && typeof la === 'number' && la <= acum && acum - la <= VALABILA_MS;
}

/**
 * Canalul paginii care lasă poze, deschis cât trăiește pagina. Măsurat în e2e, în Edge: un mesaj trimis chiar înaintea unui
 * `window.open`, în aceeași sarcină, nu ajungea la nicio altă filă; de aceea editorul deschide fila întâi (în clic) și lasă
 * poza după (`Editare.tsx`).
 */
let canal: BroadcastChannel | null = null;

/** Lasă poza (o înlocuiește pe cea de dinainte), apoi o anunță pe canal. */
export async function lasaPoza(imagine: Blob, la: number = Date.now(), idb: IDBFactory = indexedDB): Promise<void> {
  const db = await deschide(idb);
  try {
    const tx = db.transaction(POZE, 'readwrite');
    tx.objectStore(POZE).put({ imagine, la }, CHEIE);
    await gata(tx);
  } finally {
    db.close();
  }
  try {
    canal ??= new BroadcastChannel(CANAL_POZA);
    canal.postMessage('poza');
  } catch {
    // Fără canal, fila Sugestii o ia când se deschide sau când revine în față.
  }
}

/** Poza lăsată, dacă e încă de luat; altfel null. */
export async function iaPoza(acum: number = Date.now(), idb: IDBFactory = indexedDB): Promise<PozaInAsteptare | null> {
  const db = await deschide(idb);
  try {
    const p: unknown = await cerere(db.transaction(POZE).objectStore(POZE).get(CHEIE));
    return estePozaValida(p, acum) ? p : null;
  } finally {
    db.close();
  }
}

/** Șterge poza lăsată (trimisă cu sugestia, sau scoasă de om). */
export async function stergePoza(idb: IDBFactory = indexedDB): Promise<void> {
  const db = await deschide(idb);
  try {
    const tx = db.transaction(POZE, 'readwrite');
    tx.objectStore(POZE).delete(CHEIE);
    await gata(tx);
  } finally {
    db.close();
  }
}
