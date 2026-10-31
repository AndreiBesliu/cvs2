/**
 * „Fonturile mele” (ADR 0106 §2): fonturile încărcate de om și cele descărcate din Google Fonts, ținute în browser
 * (IndexedDB `cncvs2-fonturi`, separat de proiecte), ca textul să meargă și fără rețea și după reîncărcare. Fișierul se
 * ține o dată (după amprentă), iar fiecare față a lui e o intrare (o colecție TTC dă mai multe). Plafoanele: un fișier de
 * 40 MB, 100 de fețe, 300 MB în total. Nimic nu pleacă din browser.
 */
import { felFisier, type CodRefuzFont, type NumeFont } from './font.ts';
import { amprentaFisier, feteDinFisier, idFont, PLAFON_FONTURI, plafonDepasit } from './fonturiOmului.ts';
import { desfaWoff } from './woff.ts';

const BAZA = 'cncvs2-fonturi';
const FONTURI = 'fonturi';
const FISIERE = 'fisiere';

export type FontSalvat = {
  readonly id: string;
  /** Cheia fișierului (amprenta lui) în depozitul fișierelor. */
  readonly amprenta: string;
  readonly fata: number;
  /** Instanța numită a unei fețe variabile (ADR 0113), după indicele ei din `fvar`; lipsă: fața însăși. */
  readonly instanta?: number;
  readonly nume: NumeFont;
  readonly sursa: 'incarcat' | 'google';
  /** Octeții fișierului (ai fontului despachetat, pentru un WOFF). */
  readonly marime: number;
  readonly adaugat: number;
};

export type CodRefuzAdaugare = CodRefuzFont | 'prea-mare' | 'biblioteca-plina';

export type RezultatAdaugare = {
  readonly adaugate: readonly FontSalvat[];
  /** Fețe care erau deja în bibliotecă (același fișier, încărcat din nou). */
  readonly existente: readonly FontSalvat[];
  readonly refuzate: readonly { readonly nume: string; readonly cod: CodRefuzAdaugare }[];
};

/** Browserul nu ține nimic (fereastră privată, date blocate): biblioteca nu se poate folosi. */
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
    r.onupgradeneeded = () => {
      r.result.createObjectStore(FONTURI, { keyPath: 'id' });
      r.result.createObjectStore(FISIERE, { keyPath: 'amprenta' });
    };
    r.onsuccess = () => {
      const db = r.result;
      // O altă filă cu o versiune nouă a bazei: aici se închide, ca acolo să se poată deschide.
      db.onversionchange = () => { db.close(); deschisa = null; };
      rezolva(db);
    };
    r.onerror = () => respinge(new FaraStocare(String(r.error)));
    r.onblocked = () => respinge(new FaraStocare('baza fonturilor e blocată de altă filă'));
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

function gata(t: IDBTransaction): Promise<void> {
  return new Promise((rezolva, respinge) => {
    t.oncomplete = () => rezolva();
    t.onerror = () => respinge(t.error);
    t.onabort = () => respinge(t.error ?? new Error('tranzacție oprită'));
  });
}

/**
 * Fonturile din bibliotecă, ordonate după familie și stil; instanțele numite ale unei fețe variabile (ADR 0113) stau după
 * ea, în ordinea din font (de la subțire la gros).
 */
export async function listaBiblioteca(): Promise<FontSalvat[]> {
  const db = await deschide();
  const toate = await cere(db.transaction(FONTURI).objectStore(FONTURI).getAll() as IDBRequest<FontSalvat[]>);
  return toate.sort((a, b) => (a.nume.familie !== b.nume.familie ? (a.nume.familie < b.nume.familie ? -1 : 1)
    : a.amprenta === b.amprenta && a.fata === b.fata ? (a.instanta ?? -1) - (b.instanta ?? -1)
      : a.nume.stil < b.nume.stil ? -1 : 1));
}

/** Octeții fontului `id` și fața lui; null: nu e în bibliotecă. */
export async function octetiFont(id: string): Promise<{ readonly octeti: Uint8Array; readonly fata: number; readonly nume: NumeFont } | null> {
  const db = await deschide();
  const t = db.transaction([FONTURI, FISIERE]);
  const f = await cere(t.objectStore(FONTURI).get(id) as IDBRequest<FontSalvat | undefined>);
  if (!f) return null;
  const fisier = await cere(t.objectStore(FISIERE).get(f.amprenta) as IDBRequest<{ amprenta: string; octeti: ArrayBuffer } | undefined>);
  return fisier ? { octeti: new Uint8Array(fisier.octeti), fata: f.fata, nume: f.nume } : null;
}

/** Scoate fontul `id`; fișierul lui pleacă odată cu ultima față care îl folosea. */
export async function stergeFont(id: string): Promise<void> {
  const db = await deschide();
  const t = db.transaction([FONTURI, FISIERE], 'readwrite');
  const fonturi = t.objectStore(FONTURI);
  const f = await cere(fonturi.get(id) as IDBRequest<FontSalvat | undefined>);
  if (f) {
    fonturi.delete(id);
    const toate = await cere(fonturi.getAll() as IDBRequest<FontSalvat[]>);
    if (!toate.some((x) => x.id !== id && x.amprenta === f.amprenta)) t.objectStore(FISIERE).delete(f.amprenta);
  }
  await gata(t);
}

/**
 * Fețele bune ale unui fișier sfnt (`doarPrima`: doar fața 0), puse în bibliotecă într-o tranzacție, cu plafoanele
 * verificate pe ce e deja acolo. `id` dă și id-ul unei instanțe numite (ADR 0113), sau null: sursa nu le ține (Google dă
 * fiecare variantă ca font fix).
 */
async function pune(
  sfnt: Uint8Array, numeFisier: string, sursa: FontSalvat['sursa'], id: (fata: number, amprenta: string, instanta?: number) => string | null, doarPrima = false,
): Promise<RezultatAdaugare> {
  const toateFetele = feteDinFisier(sfnt);
  if (!toateFetele) return { adaugate: [], existente: [], refuzate: [{ nume: numeFisier, cod: 'nu-e-font' }] };
  const fete = doarPrima ? { bune: toateFetele.bune.filter((f) => f.fata === 0), refuzate: toateFetele.refuzate.filter((f) => f.fata === 0) } : toateFetele;
  const refuzate = fete.refuzate.map((r) => ({ nume: r.nume, cod: r.cod }));
  if (fete.bune.length === 0) return { adaugate: [], existente: [], refuzate };
  const amprenta = await amprentaFisier(sfnt);
  const db = await deschide();
  const t = db.transaction([FONTURI, FISIERE], 'readwrite');
  const fonturi = t.objectStore(FONTURI);
  const toate = await cere(fonturi.getAll() as IDBRequest<FontSalvat[]>);
  const adaugat = Date.now();
  // Fiecare față, apoi instanțele ei numite (ADR 0113), ca fețe separate în liste.
  const noi = fete.bune.flatMap((f): FontSalvat[] => {
    const fata: FontSalvat = { id: id(f.fata, amprenta)!, amprenta, fata: f.fata, nume: f.nume, sursa, marime: sfnt.byteLength, adaugat };
    return [fata, ...f.instante.flatMap((i) => {
      const idInstanta = id(f.fata, amprenta, i.indice);
      return idInstanta ? [{ ...fata, id: idInstanta, instanta: i.indice, nume: i.nume }] : [];
    })];
  });
  const existente = noi.filter((n) => toate.some((x) => x.id === n.id)).map((n) => toate.find((x) => x.id === n.id)!);
  const adaugate = noi.filter((n) => !toate.some((x) => x.id === n.id));
  if (plafonDepasit(toate, adaugate.filter((x) => x.instanta === undefined).length, amprenta, sfnt.byteLength)) {
    t.abort();
    return { adaugate: [], existente, refuzate: [...refuzate, { nume: numeFisier, cod: 'biblioteca-plina' }] };
  }
  if (adaugate.length > 0) {
    if (!toate.some((x) => x.amprenta === amprenta)) t.objectStore(FISIERE).put({ amprenta, octeti: sfnt.slice().buffer });
    for (const f of adaugate) fonturi.put(f);
  }
  await gata(t);
  return { adaugate, existente, refuzate };
}

/** Despachetarea unui fișier încărcat: sfnt sau TTC ca atare, WOFF despachetat; WOFF2 și restul, refuzate cu motiv. */
async function sfntDin(numeFisier: string, octeti: Uint8Array): Promise<Uint8Array | { readonly nume: string; readonly cod: CodRefuzAdaugare }> {
  if (octeti.byteLength > PLAFON_FONTURI.octetiFisier) return { nume: numeFisier, cod: 'prea-mare' };
  const fel = felFisier(octeti);
  if (fel === 'woff2') return { nume: numeFisier, cod: 'woff2' };
  if (fel === 'woff') {
    try {
      return await desfaWoff(octeti);
    } catch {
      return { nume: numeFisier, cod: 'stricat' };
    }
  }
  return fel === 'necunoscut' ? { nume: numeFisier, cod: 'nu-e-font' } : octeti;
}

/** Un fișier încărcat de om (ADR 0106 §2): fiecare față bună intră în bibliotecă, sub `f:<amprentă>[.<fața>]`. */
export async function adaugaFisier(numeFisier: string, octeti: Uint8Array): Promise<RezultatAdaugare> {
  const sfnt = await sfntDin(numeFisier, octeti);
  if (!(sfnt instanceof Uint8Array)) return { adaugate: [], existente: [], refuzate: [sfnt] };
  return pune(sfnt, numeFisier, 'incarcat', (fata, amprenta, instanta) => idFont({ fel: 'incarcat', amprenta, fata, ...(instanta !== undefined ? { instanta } : {}) }));
}

/** O variantă descărcată din Google Fonts, sub `g:<familia>:<varianta>` (prima față a fișierului). */
export async function adaugaGoogle(familie: string, varianta: string, octeti: Uint8Array): Promise<RezultatAdaugare> {
  const nume = `${familie} ${varianta}`;
  const sfnt = await sfntDin(nume, octeti);
  if (!(sfnt instanceof Uint8Array)) return { adaugate: [], existente: [], refuzate: [sfnt] };
  return pune(sfnt, nume, 'google', (_fata, _amprenta, instanta) => (instanta === undefined ? idFont({ fel: 'google', familie, varianta }) : null), true);
}
