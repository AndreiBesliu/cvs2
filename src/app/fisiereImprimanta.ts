/**
 * Fișierele trimise la imprimantă din cvs2 („Din desen…” și „Trimite un fișier…”), ținute în browser ca placa din fereastră
 * să le poată desena straturile cât imprimă (felia 3.6q, ADR 0193 §B.7): o bază IndexedDB a lor, ultimele `MAX_FISIERE`, cel
 * mult `MAX_OCTETI`, cu numele și mărimea de pe imprimantă (un fișier din imprimantă nu se înlocuiește: unul nou cu același
 * nume primește „-2”). Fără depozit (o fereastră privată, stocarea blocată), nimic nu se ține, iar placa arată doar piesele.
 *
 * Numele pieselor din cvs2 (cu diacritice) nu intră în fișier, care rămâne ASCII: vin cu el, în `etichete` (după numele cu
 * majuscule spus de imprimantă), puse de „Din desen…” prin `ETICHETE`.
 */
const BAZA = 'cvs2-imprimanta';
const MAGAZIE = 'fisiere';
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
};

type Inregistrare = FisierTinut & { readonly cheie: string };

/** Numele pieselor unui fișier făcut în „Din desen…”, până la trimitere (cheia: fișierul). */
export const ETICHETE = new WeakMap<Blob, Readonly<Record<string, string>>>();

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
      const r = indexedDB.open(BAZA, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(MAGAZIE)) r.result.createObjectStore(MAGAZIE, { keyPath: 'cheie' }); };
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
