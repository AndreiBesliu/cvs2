/**
 * Baza reliefurilor (ADR 0310 §2, felia 18.1↑a): dalele și hărțile lor stau în afara documentului, în IndexedDB
 * `cncvs2-relief`, după amprenta SHA-256 (cheia), ca imaginile foilor (ADR 0272). Documentul ține doar amprenta hărții, pe
 * strat; versiunile proiectului și pașii de anulare împart aceleași dale.
 *
 * Curățarea (`curataLaPornire`) se face la pornire, în fila care scrie, ca la imagini: o hartă pe care n-o folosește nici
 * documentul, nici vreo versiune păstrată, pusă de cel puțin o zi, se șterge; o dală pe care n-o mai cere nicio hartă
 * rămasă, pusă de cel puțin o zi, la fel. În timpul lucrului nu se șterge nimic (Ctrl+Z poate aduce un relief înapoi).
 */
import type { Document, Nod } from '../model/document.ts';
import { texteVersiuni } from './proiectLocal.ts';
import { PASTRATA_CEL_PUTIN_MS } from './imaginiFoaie.ts';

const BAZA = 'cncvs2-relief';
const DALE = 'dale';
const HARTI = 'harti';
const AMPRENTA = /^[0-9a-f]{64}$/;

/** O dală păstrată: octeții ei („CVR1”…, ADR 0311 §5) și când a fost pusă întâi. */
export interface DalaPastrata { readonly amprenta: string; readonly octeti: Uint8Array<ArrayBuffer>; readonly la: number }
/** O hartă păstrată: textul ei canonic (ADR 0311 §6) și când a fost pusă întâi. */
export interface HartaPastrata { readonly amprenta: string; readonly text: string; readonly la: number }

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
  r.onupgradeneeded = () => {
    // Indexul orei: curățarea citește cheile și orele fără octeți (pot fi sute de MB).
    r.result.createObjectStore(DALE, { keyPath: 'amprenta' }).createIndex('la', 'la');
    r.result.createObjectStore(HARTI, { keyPath: 'amprenta' });
  };
  return cerere(r);
}

const esteDala = (x: unknown): x is DalaPastrata => typeof x === 'object' && x !== null
  && typeof (x as DalaPastrata).amprenta === 'string' && (x as DalaPastrata).octeti instanceof Uint8Array && typeof (x as DalaPastrata).la === 'number';
const esteHarta = (x: unknown): x is HartaPastrata => typeof x === 'object' && x !== null
  && typeof (x as HartaPastrata).amprenta === 'string' && typeof (x as HartaPastrata).text === 'string' && typeof (x as HartaPastrata).la === 'number';

/** Pură: amprentele dalelor cu coduri din textul unei hărți (fără ușă: doar intrările care arată ca o amprentă). */
export function daleDinText(text: string): string[] {
  let x: unknown;
  try { x = JSON.parse(text); } catch { return []; }
  const d = (x as { dale?: unknown } | null)?.dale;
  return Array.isArray(d) ? (d as unknown[]).filter((e): e is string => typeof e === 'string' && AMPRENTA.test(e)) : [];
}

/**
 * Păstrează un strat: harta (textul și amprenta) și octeții dalelor ei. Ce e deja păstrat rămâne, cu ora primei puneri; dalele
 * se scriu înaintea hărții, în aceeași tranzacție (o hartă nu stă fără dalele ei).
 */
export async function pastreazaStrat(
  harta: { readonly text: string; readonly amprenta: string }, octeti: Readonly<Record<string, Uint8Array<ArrayBuffer>>>, idb: IDBFactory = indexedDB,
): Promise<void> {
  const db = await deschide(idb);
  try {
    const tx = db.transaction([DALE, HARTI], 'readwrite');
    const dale = tx.objectStore(DALE), harti = tx.objectStore(HARTI), la = Date.now();
    for (const [amprenta, o] of Object.entries(octeti)) {
      if ((await cerere(dale.count(amprenta))) === 0) dale.put({ amprenta, octeti: o, la } satisfies DalaPastrata);
    }
    if ((await cerere(harti.count(harta.amprenta))) === 0) harti.put({ amprenta: harta.amprenta, text: harta.text, la } satisfies HartaPastrata);
    await gata(tx);
  } finally {
    db.close();
  }
}

/**
 * Un strat păstrat: textul hărții și octeții dalelor ei care sunt în bază; null dacă harta lipsește (ștearsă, sau un proiect
 * adus din alt browser). Dalele lipsă nu se inventează: cine desenează le numește.
 */
export async function citesteStrat(amprenta: string, idb: IDBFactory = indexedDB): Promise<{ readonly text: string; readonly octeti: Record<string, Uint8Array<ArrayBuffer>> } | null> {
  const db = await deschide(idb);
  try {
    const tx = db.transaction([DALE, HARTI]);
    const h: unknown = await cerere(tx.objectStore(HARTI).get(amprenta));
    if (!esteHarta(h)) return null;
    const octeti: Record<string, Uint8Array<ArrayBuffer>> = {};
    for (const a of new Set(daleDinText(h.text))) {
      const d: unknown = await cerere(tx.objectStore(DALE).get(a));
      if (esteDala(d)) octeti[a] = d.octeti;
    }
    return { text: h.text, octeti };
  } finally {
    db.close();
  }
}

/** Textul unei hărți păstrate, sau null dacă lipsește (modelul 3D citește întâi hărțile, apoi doar dalele schimbate). */
export async function citesteHarta(amprenta: string, idb: IDBFactory = indexedDB): Promise<string | null> {
  const db = await deschide(idb);
  try {
    const h: unknown = await cerere(db.transaction(HARTI).objectStore(HARTI).get(amprenta));
    return esteHarta(h) ? h.text : null;
  } finally {
    db.close();
  }
}

/** Octeții dalelor date care sunt în bază, după amprentă (cele lipsă nu apar: cine le cere le numește). */
export async function citesteDale(amprente: readonly string[], idb: IDBFactory = indexedDB): Promise<Record<string, Uint8Array<ArrayBuffer>>> {
  const db = await deschide(idb);
  try {
    const st = db.transaction(DALE).objectStore(DALE), octeti: Record<string, Uint8Array<ArrayBuffer>> = {};
    for (const a of new Set(amprente)) {
      const d: unknown = await cerere(st.get(a));
      if (esteDala(d)) octeti[a] = d.octeti;
    }
    return octeti;
  } finally {
    db.close();
  }
}

/** Pură: amprentele hărților din arborele unui nod (straturile formelor `relief`). */
function hartiNod(n: Nod, s: Set<string>): void {
  if (n.tip === 'grup') { for (const c of n.copii) hartiNod(c, s); return; }
  if (n.forma.tip === 'relief') for (const st of n.forma.straturi) s.add(st.dale);
}

/** Pură: amprentele hărților folosite de documentele date (toate piesele lor). */
export function hartiFolosite(documente: Iterable<Document>): Set<string> {
  const s = new Set<string>();
  for (const d of documente) for (const p of d.piese) hartiNod(p.radacina, s);
  return s;
}

/**
 * Pură: amprentele hărților din textele versiunilor (JSON-ul salvat), citite fără ușă: orice obiect cu `tip: 'relief'` și
 * `straturi[].dale`. Un text stricat ori străin nu are niciuna.
 */
export function hartiDinTexte(texte: Iterable<unknown>): Set<string> {
  const s = new Set<string>();
  const umbla = (x: unknown, adancime: number): void => {
    if (adancime > 256 || typeof x !== 'object' || x === null) return;
    if (Array.isArray(x)) { for (const e of x as unknown[]) umbla(e, adancime + 1); return; }
    const o = x as Record<string, unknown>;
    if (o['tip'] === 'relief' && Array.isArray(o['straturi'])) {
      for (const st of o['straturi'] as unknown[]) {
        const d = (st as { dale?: unknown } | null)?.dale;
        if (typeof d === 'string') s.add(d);
      }
    }
    for (const v of Object.values(o)) umbla(v, adancime + 1);
  };
  for (const t of texte) {
    if (typeof t !== 'string' || !t.includes('"relief"')) continue;
    try { umbla(JSON.parse(t), 0); } catch { /* un text stricat nu are hărți */ }
  }
  return s;
}

/**
 * Pură: ce se șterge. Hărțile nefolosite, puse înainte de `pana`; apoi dalele pe care nu le cere nicio hartă rămasă, puse
 * înainte de `pana`.
 */
export function deSters(
  harti: Iterable<HartaPastrata>, dale: Iterable<{ readonly amprenta: string; readonly la: number }>, folosite: ReadonlySet<string>, pana: number,
): { readonly harti: string[]; readonly dale: string[] } {
  const sterseH: string[] = [], cerute = new Set<string>();
  for (const h of harti) {
    if (h.la < pana && !folosite.has(h.amprenta)) sterseH.push(h.amprenta);
    else for (const a of daleDinText(h.text)) cerute.add(a);
  }
  const sterseD: string[] = [];
  for (const d of dale) if (d.la < pana && !cerute.has(d.amprenta)) sterseD.push(d.amprenta);
  return { harti: sterseH, dale: sterseD };
}

/**
 * Curățarea la pornire (ADR 0310 §2), în fila care scrie: hărțile pe care nu le folosește nici documentul de acum, nici vreo
 * versiune păstrată, apoi dalele rămase fără hartă, puse de cel puțin o zi. O bază care nu există nu se creează.
 */
export async function curataLaPornire(doc: Document, idb: IDBFactory = indexedDB): Promise<number> {
  if (typeof idb.databases === 'function' && !(await idb.databases()).some((d) => d.name === BAZA)) return 0;
  const folosite = hartiFolosite([doc]);
  for (const h of hartiDinTexte(await texteVersiuni(idb))) folosite.add(h);
  const db = await deschide(idb);
  try {
    const tx = db.transaction([DALE, HARTI], 'readwrite');
    const harti = (await cerere(tx.objectStore(HARTI).getAll())).filter(esteHarta);
    // Dalele fără octeți: cheia și ora, din indexul orei.
    const dale: { amprenta: string; la: number }[] = [];
    await new Promise<void>((ok, eroare) => {
      const r = tx.objectStore(DALE).index('la').openKeyCursor();
      r.onsuccess = () => {
        const c = r.result;
        if (!c) { ok(); return; }
        if (typeof c.primaryKey === 'string' && typeof c.key === 'number') dale.push({ amprenta: c.primaryKey, la: c.key });
        c.continue();
      };
      r.onerror = () => { eroare(r.error); };
    });
    const s = deSters(harti, dale, folosite, Date.now() - PASTRATA_CEL_PUTIN_MS);
    for (const k of s.harti) tx.objectStore(HARTI).delete(k);
    for (const k of s.dale) tx.objectStore(DALE).delete(k);
    await gata(tx);
    return s.harti.length + s.dale.length;
  } finally {
    db.close();
  }
}
