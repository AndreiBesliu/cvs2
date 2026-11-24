/**
 * Sincronizarea bibliotecii de freze cu contul (ADR 0300 §7, felia 16.A↑c), pură. Pentru fiecare freză știută din cont
 * se ține baza: versiunea ei în cont și JSON-ul de atunci (ultima versiune comună). O freză de aici diferită de bază e o
 * schimbare de trimis; una din cont cu altă versiune e o schimbare venită. Când s-au schimbat amândouă, se îmbină pe
 * câmpuri, față de bază: un câmp schimbat pe o singură parte se ia de acolo, unul schimbat pe ambele (sau o freză ștearsă
 * pe o parte și schimbată pe cealaltă) e un conflict, pe care îl hotărăște omul.
 *
 * Frezele pe care versiunea de azi nu le citește (ale unei versiuni mai noi) stau neatinse între cele „brute”: se iau din
 * cont, nu se trimit niciodată.
 */
import { esteIdFreza, OCTETI_FREZA, octeti, type FrezaInCont, type FrezaTrimisa, type RezultatFreza, type StergereTrimisa } from '../../shared/freze.ts';
import { cheieNume, frezaDinDate, numeLiber, type FrezaSalvata } from './freza.ts';

/** Ultima versiune comună a unei freze: versiunea ei în cont și JSON-ul de atunci (null: ștearsă). */
export type Baza = { readonly versiune: number; readonly json: string | null };
/** O freză în conflict: ce e în cont, până alege omul, cu câmpurile schimbate pe ambele părți (`*`: ștearsă pe una). */
export type Conflict = Baza & { readonly campuri: readonly string[] };

export type StareSincron = {
  /** Versiunea contului până la care s-au luat schimbările. */
  readonly dupa: number;
  readonly baze: ReadonlyMap<string, Baza>;
  readonly conflicte: ReadonlyMap<string, Conflict>;
  /** Frezele noi pe care contul nu le-a mai primit (plin). */
  readonly plina: readonly string[];
};

export const SINCRON_GOL: StareSincron = { dupa: 0, baze: new Map(), conflicte: new Map(), plina: [] };

/** Biblioteca unui cont: frezele citite, cele brute (necitite de versiunea de azi) și starea sincronizării. */
export type BibliotecaCont = {
  readonly freze: readonly FrezaSalvata[];
  readonly brute: readonly unknown[];
  readonly sincron: StareSincron;
};

type Obiect = Readonly<Record<string, unknown>>;
const obiect = (x: unknown): x is Obiect => typeof x === 'object' && x !== null && !Array.isArray(x);

/** JSON-ul cu cheile în ordine, la orice adâncime: aceeași freză dă același text pe orice calculator. */
export function jsonCanonic(x: unknown): string {
  const ordonat = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(ordonat);
    if (!obiect(v)) return v;
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) if (v[k] !== undefined) o[k] = ordonat(v[k]);
    return o;
  };
  return JSON.stringify(ordonat(x));
}

/** Câmpurile care nu se îmbină: identitatea și versiunea frezei. */
const META = new Set(['id', 'rev', 'schimbatLa']);
const continut = (x: Obiect): string => jsonCanonic(Object.fromEntries(Object.entries(x).filter(([k]) => !META.has(k))));
const valoare = (x: Obiect | null, k: string): string => (x && x[k] !== undefined ? jsonCanonic(x[k]) : '');
const numar = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0);

export type Imbinare = { readonly ok: true; readonly rezultat: Obiect | null } | { readonly ok: false; readonly campuri: readonly string[] };

/**
 * Îmbinarea pe câmpuri a frezei mele cu cea din cont, față de bază (null: ștearsă, sau fără bază). Rezultatul îmbinat are
 * versiunea peste amândouă și data cea mai nouă; trebuie să fie o freză bună, altfel e conflict pe câmpurile care diferă.
 */
export function imbina(baza: Obiect | null, mea: Obiect | null, cont: Obiect | null): Imbinare {
  const egale = (a: Obiect | null, b: Obiect | null): boolean => (a === null || b === null ? a === b : continut(a) === continut(b));
  if (baza !== null && egale(mea, baza)) return { ok: true, rezultat: cont };
  if (baza !== null && egale(cont, baza)) return { ok: true, rezultat: mea };
  if (mea === null || cont === null) return mea === cont ? { ok: true, rezultat: null } : { ok: false, campuri: ['*'] };
  if (egale(mea, cont)) return { ok: true, rezultat: numar(cont['rev']) >= numar(mea['rev']) ? cont : mea };
  const chei = [...new Set([...Object.keys(mea), ...Object.keys(cont), ...Object.keys(baza ?? {})])].filter((k) => !META.has(k)).sort();
  const rezultat: Record<string, unknown> = {
    id: cont['id'], rev: Math.max(numar(mea['rev']), numar(cont['rev'])) + 1, schimbatLa: Math.max(numar(mea['schimbatLa']), numar(cont['schimbatLa'])),
  };
  const campuri: string[] = [];
  for (const k of chei) {
    const b = valoare(baza, k), m = valoare(mea, k), c = valoare(cont, k);
    const ia = m === b ? cont : c === b || m === c ? mea : null;
    if (ia === null) campuri.push(k);
    else if (ia[k] !== undefined) rezultat[k] = ia[k];
  }
  if (campuri.length > 0) return { ok: false, campuri };
  if (frezaDinDate(rezultat) === null) return { ok: false, campuri: chei.filter((k) => valoare(mea, k) !== valoare(cont, k)) };
  return { ok: true, rezultat };
}

const parsat = (json: string | null): Obiect | null => {
  if (json === null) return null;
  try {
    const x: unknown = JSON.parse(json);
    return obiect(x) ? x : null;
  } catch {
    return null;
  }
};
const idDin = (x: unknown): string | null => (obiect(x) && typeof x['id'] === 'string' ? x['id'] : null);

/** Biblioteca de lucru: frezele (citite sau brute) după id, în ordine, și starea, schimbate pe loc într-o copie. */
class Lucru {
  readonly ordine: string[] = [];
  readonly citite = new Map<string, FrezaSalvata>();
  readonly brute = new Map<string, unknown>();
  readonly faraId: unknown[] = [];
  dupa: number;
  readonly baze: Map<string, Baza>;
  readonly conflicte: Map<string, Conflict>;
  plina: string[];
  /** Frezele venite din cont acum, pentru numele luate. */
  readonly venite = new Set<string>();

  constructor(b: BibliotecaCont) {
    for (const f of b.freze) { this.ordine.push(f.id); this.citite.set(f.id, f); }
    for (const x of b.brute) {
      const id = idDin(x);
      if (id === null || this.citite.has(id) || this.brute.has(id)) this.faraId.push(x);
      else { this.ordine.push(id); this.brute.set(id, x); }
    }
    this.dupa = b.sincron.dupa;
    this.baze = new Map(b.sincron.baze);
    this.conflicte = new Map(b.sincron.conflicte);
    this.plina = [...b.sincron.plina];
  }

  /** Freza de aici (citită), ca obiect; null dacă lipsește. */
  mea(id: string): Obiect | null {
    return this.citite.get(id) ?? null;
  }

  /** Pune freza (sau o scoate, cu null): citită dacă se poate, altfel brută. */
  pune(id: string, x: Obiect | null): void {
    this.citite.delete(id);
    this.brute.delete(id);
    if (x === null) {
      const i = this.ordine.indexOf(id);
      if (i >= 0) this.ordine.splice(i, 1);
      return;
    }
    if (!this.ordine.includes(id)) this.ordine.push(id);
    const f = frezaDinDate(x);
    if (f && f.id === id) this.citite.set(id, f);
    else this.brute.set(id, x);
  }

  /** O versiune a frezei venită din cont (o pagină a listei sau un conflict la scriere). */
  vine(s: FrezaInCont): void {
    const baza = this.baze.get(s.id);
    if (baza && s.versiune <= baza.versiune) return;
    this.venite.add(s.id);
    const deAici = this.mea(s.id);
    const brutaAici = this.brute.has(s.id);
    const cont = parsat(s.json);
    // O freză brută (sau una pe care n-o mai citim) nu se schimbă aici: se ia din cont.
    const schimbataAici = !brutaAici && (baza ? (deAici === null ? baza.json !== null : jsonCanonic(deAici) !== baza.json) : deAici !== null);
    if (!schimbataAici) {
      this.pune(s.id, cont);
      this.baze.set(s.id, { versiune: s.versiune, json: s.json });
      this.conflicte.delete(s.id);
      return;
    }
    const r = imbina(parsat(baza?.json ?? null), deAici, cont);
    if (!r.ok) {
      this.conflicte.set(s.id, { versiune: s.versiune, json: s.json, campuri: r.campuri });
      return;
    }
    this.pune(s.id, r.rezultat);
    this.baze.set(s.id, { versiune: s.versiune, json: s.json });
    this.conflicte.delete(s.id);
  }

  /**
   * Numele luate (frezele au nume unice): o freză venită din cont cu numele altei freze de aici. Una nouă de aici, netrimisă
   * încă, primește un nume liber; altfel, cea venită (o schimbare de aici, care pleacă).
   */
  numeUnice(): void {
    for (const id of this.venite) {
      const venita = this.citite.get(id);
      if (!venita) continue;
      const alta = [...this.citite.values()].find((x) => x.id !== id && cheieNume(x.nume) === cheieNume(venita.nume));
      if (!alta) continue;
      const deRedenumit = !this.baze.has(alta.id) ? alta : venita;
      const altele = [...this.citite.values()].filter((x) => x.id !== deRedenumit.id);
      this.citite.set(deRedenumit.id, { ...deRedenumit, nume: numeLiber(deRedenumit.nume, altele, this.numeBrute()) });
    }
    this.venite.clear();
  }

  numeBrute(): string[] {
    return [...this.brute.values()].flatMap((b) => (obiect(b) && typeof b['nume'] === 'string' ? [b['nume']] : []));
  }

  gata(): BibliotecaCont {
    this.numeUnice();
    const freze: FrezaSalvata[] = [], brute: unknown[] = [];
    for (const id of this.ordine) {
      const f = this.citite.get(id);
      if (f) freze.push(f);
      else if (this.brute.has(id)) brute.push(this.brute.get(id));
    }
    return { freze, brute: [...brute, ...this.faraId], sincron: { dupa: this.dupa, baze: this.baze, conflicte: this.conflicte, plina: this.plina } };
  }
}

/** Biblioteca după o pagină a listei din cont (în ordinea versiunilor). `pana`: versiunea contului până la care s-a luat. */
export function cuDinCont(b: BibliotecaCont, venite: readonly FrezaInCont[], pana?: number): BibliotecaCont {
  const l = new Lucru(b);
  for (const s of venite) l.vine(s);
  if (pana !== undefined) l.dupa = pana;
  return l.gata();
}

/**
 * La capătul unei liste întregi (calculatorul rămăsese în urma semnelor ștergerii din cont): o freză știută din cont care n-a
 * venit a fost ștearsă acolo; neschimbată aici, pleacă și de aici; schimbată, e conflict.
 */
export function cuListaCompleta(b: BibliotecaCont, vazute: ReadonlySet<string>): BibliotecaCont {
  const l = new Lucru(b);
  for (const [id, baza] of b.sincron.baze) {
    if (vazute.has(id)) continue;
    if (baza.json === null) { l.baze.delete(id); continue; }
    const deAici = l.mea(id);
    const schimbata = deAici !== null && jsonCanonic(deAici) !== baza.json;
    if (schimbata) { l.conflicte.set(id, { versiune: 0, json: null, campuri: ['*'] }); continue; }
    l.pune(id, null);
    l.baze.delete(id);
    l.conflicte.delete(id);
  }
  return l.gata();
}

export type DeTrimis = {
  readonly scrise: readonly FrezaTrimisa[];
  readonly sterse: readonly StergereTrimisa[];
  /** Frezele peste plafonul unei freze în cont: rămân doar aici. */
  readonly mari: readonly string[];
};

/** Ce pleacă: frezele noi sau schimbate (cu versiunea văzută) și cele șterse aici; nu cele în conflict. */
export function deTrimis(b: BibliotecaCont): DeTrimis {
  const scrise: FrezaTrimisa[] = [], sterse: StergereTrimisa[] = [], mari: string[] = [];
  const aici = new Set<string>();
  for (const f of b.freze) {
    aici.add(f.id);
    if (b.sincron.conflicte.has(f.id) || !esteIdFreza(f.id)) continue;
    const json = jsonCanonic(f);
    const baza = b.sincron.baze.get(f.id);
    if (baza?.json === json) continue;
    if (octeti(json) > OCTETI_FREZA) { mari.push(f.id); continue; }
    scrise.push({ id: f.id, vazuta: baza?.versiune ?? 0, json });
  }
  for (const x of b.brute) { const id = idDin(x); if (id !== null) aici.add(id); }
  for (const [id, baza] of b.sincron.baze) {
    if (baza.json !== null && !aici.has(id) && !b.sincron.conflicte.has(id)) sterse.push({ id, vazuta: baza.versiune });
  }
  return { scrise, sterse, mari };
}

/** Biblioteca după răspunsul serverului la cele trimise: bazele noi, conflictele (îmbinate ca o venire), contul plin. */
export function cuRezultate(b: BibliotecaCont, trimise: DeTrimis, rezultate: readonly RezultatFreza[]): BibliotecaCont {
  const l = new Lucru(b);
  const json = new Map<string, string | null>([...trimise.scrise.map((f) => [f.id, f.json] as const), ...trimise.sterse.map((f) => [f.id, null] as const)]);
  for (const r of rezultate) {
    if (!json.has(r.id)) continue;
    if (r.stare === 'plina') {
      if (!l.plina.includes(r.id)) l.plina.push(r.id);
    } else if (r.stare === 'conflict') {
      l.vine({ id: r.id, versiune: r.versiune, json: r.json });
    } else {
      l.plina = l.plina.filter((x) => x !== r.id);
      if (r.versiune === 0) l.baze.delete(r.id);
      else l.baze.set(r.id, { versiune: r.versiune, json: json.get(r.id) ?? null });
    }
  }
  return l.gata();
}

export type Alegere = 'mea' | 'cont' | 'amandoua';

/**
 * Conflictul, la alegerea omului: „a mea” pleacă peste cea din cont (cu versiunea ei văzută); „din cont” o înlocuiește pe a
 * mea; „amândouă” ia freza din cont și păstrează a mea ca o freză nouă, cu un nume liber. Fără conflict, nimic.
 */
export function rezolva(b: BibliotecaCont, id: string, alegere: Alegere, idNou: () => string, acum: number): BibliotecaCont {
  const c = b.sincron.conflicte.get(id);
  if (!c) return b;
  const l = new Lucru(b);
  l.conflicte.delete(id);
  const mea = l.citite.get(id) ?? null;
  const cont = parsat(c.json);
  const alesa = alegere === 'amandoua' ? (mea === null ? 'cont' : cont === null ? 'mea' : 'amandoua') : alegere;
  l.baze.set(id, { versiune: c.versiune, json: c.json });
  if (alesa === 'mea') return l.gata();
  l.pune(id, cont);
  if (alesa === 'amandoua' && mea) {
    const copie: FrezaSalvata = { ...mea, id: idNou(), rev: 1, schimbatLa: acum, nume: numeLiber(mea.nume, [...l.citite.values()], l.numeBrute()) };
    l.ordine.push(copie.id);
    l.citite.set(copie.id, copie);
  }
  return l.gata();
}

/** Frezele bibliotecii fără cont pe care contul nu le știe (nici aici, nici în bazele lui): cele de adus la prima logare. */
export function deAdusDinBrowser(b: BibliotecaCont, locale: readonly FrezaSalvata[]): readonly FrezaSalvata[] {
  const stiute = new Set<string>([...b.freze.map((f) => f.id), ...b.sincron.baze.keys()]);
  for (const x of b.brute) { const id = idDin(x); if (id !== null) stiute.add(id); }
  return locale.filter((f) => !stiute.has(f.id));
}

/**
 * „Adaugi frezele din acest browser în cont?” (ADR 0300 §7): cele pe care contul nu le știe intră în biblioteca lui, cu id-ul
 * lor (deci întrebarea nu mai vine) și cu un nume liber, până la plafonul bibliotecii; le trimite sincronizarea următoare.
 */
export function cuFrezeleBrowserului(b: BibliotecaCont, locale: readonly FrezaSalvata[], plafon: number): { readonly b: BibliotecaCont; readonly adaugate: number; readonly sarite: number } {
  const noi = deAdusDinBrowser(b, locale);
  const freze = [...b.freze];
  const brute = b.brute.flatMap((x) => (obiect(x) && typeof x['nume'] === 'string' ? [x['nume']] : []));
  let adaugate = 0;
  for (const f of noi) {
    if (freze.length >= plafon) break;
    freze.push({ ...f, nume: numeLiber(f.nume, freze, brute) });
    adaugate++;
  }
  return { b: { ...b, freze }, adaugate, sarite: noi.length - adaugate };
}

/* ── Starea ținută (în înregistrarea bibliotecii, ca date simple) ─────────────────────────────────────────────────────── */

type Date_ = {
  readonly dupa: number;
  readonly baze: readonly { readonly id: string; readonly versiune: number; readonly json: string | null }[];
  readonly conflicte: readonly { readonly id: string; readonly versiune: number; readonly json: string | null; readonly campuri: readonly string[] }[];
  readonly plina: readonly string[];
};

export function sincronDate(s: StareSincron): Date_ {
  return {
    dupa: s.dupa,
    baze: [...s.baze].map(([id, b]) => ({ id, versiune: b.versiune, json: b.json })),
    conflicte: [...s.conflicte].map(([id, c]) => ({ id, versiune: c.versiune, json: c.json, campuri: [...c.campuri] })),
    plina: [...s.plina],
  };
}

const versiuneBuna = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;
const jsonBun = (x: unknown): x is string | null => x === null || typeof x === 'string';

/** Starea din înregistrare; ce nu are forma ei (cheile periculoase, versiunile greșite) se aruncă. */
export function sincronDin(x: unknown): StareSincron {
  if (!obiect(x)) return SINCRON_GOL;
  const baze = new Map<string, Baza>();
  for (const e of Array.isArray(x['baze']) ? x['baze'] as unknown[] : []) {
    if (obiect(e) && esteIdFreza(e['id']) && versiuneBuna(e['versiune']) && jsonBun(e['json'])) baze.set(e['id'], { versiune: e['versiune'], json: e['json'] });
  }
  const conflicte = new Map<string, Conflict>();
  for (const e of Array.isArray(x['conflicte']) ? x['conflicte'] as unknown[] : []) {
    if (!obiect(e) || !esteIdFreza(e['id']) || !versiuneBuna(e['versiune']) || !jsonBun(e['json'])) continue;
    const campuri = e['campuri'];
    if (!Array.isArray(campuri) || !campuri.every((c) => typeof c === 'string')) continue;
    conflicte.set(e['id'], { versiune: e['versiune'], json: e['json'], campuri: campuri as string[] });
  }
  const plina = Array.isArray(x['plina']) ? (x['plina'] as unknown[]).filter(esteIdFreza) : [];
  return { dupa: versiuneBuna(x['dupa']) ? x['dupa'] : 0, baze, conflicte, plina };
}
