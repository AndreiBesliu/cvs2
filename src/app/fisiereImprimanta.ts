/**
 * Fișierele trimise la imprimantă din cvs2 („Din desen…” și „Trimite un fișier…”), ținute în browser ca placa din fereastră
 * să le poată desena straturile cât imprimă (felia 3.6q, ADR 0193 §B.7): o bază IndexedDB a lor, ultimele `MAX_FISIERE`, cel
 * mult `MAX_OCTETI`, cu numele și mărimea de pe imprimantă (un fișier din imprimantă nu se înlocuiește: unul nou cu același
 * nume primește „-2”). Fără depozit (o fereastră privată, stocarea blocată), nimic nu se ține, iar placa arată doar piesele.
 *
 * Numele pieselor din cvs2 (cu diacritice) nu intră în fișier, care rămâne ASCII: vin cu el, în `etichete` (după numele cu
 * majuscule spus de imprimantă), puse de „Din desen…” prin `DIN_DESEN`.
 *
 * Din felia 3.6t (ADR 0194 §B), aceeași bază ține și istoricul cvs2 (magazia `imprimari`, ultimele 500): cererile lui merg pe
 * rând, ca o citire să nu întreacă o scriere de dinaintea ei.
 */
import { cuImprimare, imprimareCvs2, type ImprimareCvs2 } from './istoricImprimari.ts';

const BAZA = 'cvs2-imprimanta';
const MAGAZIE = 'fisiere';
const IMPRIMARI = 'imprimari';
export const MAX_FISIERE = 5;
export const MAX_OCTETI = 100 * 1024 * 1024;

export type FisierTinut = {
  readonly nume: string;
  readonly marime: number;
  /** Când a fost trimis (ms). */
  readonly la: number;
  readonly date: Blob;
  /** Numele din cvs2 ale pieselor, după numele lor cu majuscule din fișier (null: un fișier de pe calculator). */
  readonly etichete: Readonly<Record<string, string>> | null;
  /** Notele pauzelor scrise în cvs2, cu diacritice, după stratul lor (fișierul are doar nota ASCII); null: niciuna (3.6s). */
  readonly note?: Readonly<Record<string, string>> | null;
  /** Estimarea feliatorului (s) și materialul (numele din listă), pentru istoric (3.6t); null: un fișier de pe calculator. */
  readonly estimare?: number | null;
  readonly material?: string | null;
};

type Inregistrare = FisierTinut & { readonly cheie: string };

/**
 * Ce știe „Din desen…” despre un fișier feliat, până la trimitere (cheia: fișierul): numele pieselor, notele pauzelor, după
 * strat (3.6s), estimarea feliatorului și materialul (3.6t).
 */
export type DinDesen = {
  readonly etichete: Readonly<Record<string, string>>;
  readonly note: Readonly<Record<string, string>>;
  readonly estimare: number;
  readonly material: string;
};
export const DIN_DESEN = new WeakMap<Blob, DinDesen>();

export const cheieFisier = (nume: string, marime: number): string => `${nume}|${marime}`;

/** Ce rămâne, din intrările date (cele mai noi întâi): cel mult `MAX_FISIERE`, cel mult `MAX_OCTETI` (cel mai nou rămâne oricum). */
export function dePastrat(intrari: readonly { readonly cheie: string; readonly marime: number; readonly la: number }[]): string[] {
  const rez: string[] = [];
  let octeti = 0;
  for (const x of [...intrari].sort((a, b) => b.la - a.la)) {
    if (rez.length >= MAX_FISIERE) break;
    if (rez.length > 0 && octeti + x.marime > MAX_OCTETI) break;
    rez.push(x.cheie);
    octeti += x.marime;
  }
  return rez;
}

function deschide(): Promise<IDBDatabase | null> {
  return new Promise((rezolva) => {
    try {
      // Versiunea 2 (3.6t): și magazia istoricului.
      const r = indexedDB.open(BAZA, 2);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(MAGAZIE)) db.createObjectStore(MAGAZIE, { keyPath: 'cheie' });
        if (!db.objectStoreNames.contains(IMPRIMARI)) db.createObjectStore(IMPRIMARI, { keyPath: 'id' });
      };
      r.onsuccess = () => { rezolva(r.result); };
      r.onerror = () => { rezolva(null); };
      r.onblocked = () => { rezolva(null); };
    } catch {
      rezolva(null);
    }
  });
}

const cerere = <T>(r: IDBRequest<T>): Promise<T> => new Promise((rezolva, respinge) => {
  r.onsuccess = () => { rezolva(r.result); };
  r.onerror = () => { respinge(r.error ?? new Error('IndexedDB')); };
});

/** Ține un fișier trimis; cele vechi ies (`dePastrat`). O eroare a depozitului nu ajunge la trimitere. */
export async function tineFisier(f: FisierTinut): Promise<void> {
  const db = await deschide();
  if (db === null) return;
  try {
    const tx = db.transaction(MAGAZIE, 'readwrite');
    const m = tx.objectStore(MAGAZIE);
    await cerere(m.put({ ...f, cheie: cheieFisier(f.nume, f.marime) } satisfies Inregistrare));
    const toate = await cerere(m.getAll() as IDBRequest<Inregistrare[]>);
    const raman = new Set(dePastrat(toate));
    for (const x of toate) if (!raman.has(x.cheie)) m.delete(x.cheie);
    await new Promise<void>((g) => { tx.oncomplete = () => { g(); }; tx.onerror = () => { g(); }; tx.onabort = () => { g(); }; });
  } catch {
    // Fără loc sau depozitul blocat: placa va arăta doar piesele.
  } finally {
    db.close();
  }
}

/** Fișierul ținut cu numele (și mărimea, dacă imprimanta o spune) dat; cel mai nou cu numele, fără mărime; null: niciunul. */
export async function gasesteFisier(nume: string, marime: number | null): Promise<FisierTinut | null> {
  const db = await deschide();
  if (db === null) return null;
  try {
    const m = db.transaction(MAGAZIE, 'readonly').objectStore(MAGAZIE);
    if (marime !== null) {
      const x = await cerere(m.get(cheieFisier(nume, marime)) as IDBRequest<Inregistrare | undefined>);
      return x ?? null;
    }
    const toate = await cerere(m.getAll() as IDBRequest<Inregistrare[]>);
    return toate.filter((x) => x.nume === nume).sort((a, b) => b.la - a.la)[0] ?? null;
  } catch {
    return null;
  } finally {
    db.close();
  }
}

/** Cererile istoricului cvs2 (3.6t), pe rând. */
let coada: Promise<unknown> = Promise.resolve();
function peRand<T>(f: () => Promise<T>): Promise<T> {
  const p = coada.then(f, f);
  coada = p.catch(() => undefined);
  return p;
}

const incheiata = (tx: IDBTransaction): Promise<boolean> => new Promise((g) => {
  tx.oncomplete = () => { g(true); }; tx.onerror = () => { g(false); }; tx.onabort = () => { g(false); };
});

/** O operație pe magazia istoricului; null: fără depozit sau cu o eroare (fereastra merge mai departe, fără istoricul cvs2). */
function cuImprimari<T>(mod: IDBTransactionMode, f: (m: IDBObjectStore, vechi: ImprimareCvs2[]) => T): Promise<T | null> {
  return peRand(async () => {
    const db = await deschide();
    if (db === null) return null;
    try {
      const tx = db.transaction(IMPRIMARI, mod);
      const m = tx.objectStore(IMPRIMARI);
      const vechi = (await cerere(m.getAll() as IDBRequest<unknown[]>)).map(imprimareCvs2).filter((x): x is ImprimareCvs2 => x !== null);
      const rez = f(m, vechi);
      return (await incheiata(tx)) ? rez : null;
    } catch {
      return null;
    } finally {
      db.close();
    }
  });
}

/** Istoricul cvs2, cele mai noi întâi. */
export const citesteImprimari = (): Promise<readonly ImprimareCvs2[] | null> =>
  cuImprimari('readonly', (_, vechi) => vechi.sort((a, b) => b.inceput - a.inceput));

/** Ține o imprimare (`cuImprimare`: aceeași lucrare se contopește, cele vechi ies); întoarce istoricul nou. */
export const tineImprimare = (r: ImprimareCvs2): Promise<readonly ImprimareCvs2[] | null> => cuImprimari('readwrite', (m, vechi) => {
  const { lista, nou } = cuImprimare(vechi, r);
  const raman = new Set(lista.map((x) => x.id));
  for (const x of vechi) if (!raman.has(x.id)) m.delete(x.id);
  if (raman.has(nou.id)) m.put(nou);
  return lista;
});

/** Golește istoricul cvs2 (al imprimantei rămâne în ea). */
export const golesteImprimari = (): Promise<readonly ImprimareCvs2[] | null> => cuImprimari('readwrite', (m) => {
  m.clear();
  return [];
});
