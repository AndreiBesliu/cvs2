/**
 * Primirea unei lucrări trimise de o altă aplicație (ADR 0126, protocolul „cvs2-lucrare” v1, fixat de Planificatorul
 * Trenuleț). Se aduce la cerere, doar când adresa are `#primeste-lucrare` și fila are `window.opener`.
 *
 * Cum merge:
 * - aplicația care trimite deschide cvs2 într-o filă nouă, la `…/#primeste-lucrare`, și întreabă („cauta”) până primește „gata”;
 * - cvs2 îi spune „gata” ferestrei care l-a deschis (`window.opener`), la pornire și la fiecare „cauta”;
 * - aplicația trimite lucrarea: fișierele G-code (text ASCII cu `\n`), fiecare cu SHA-256-ul lui, în ordinea de tăiere;
 * - cvs2 o arată omului (de unde vine, ce fișiere), iar omul o primește sau nu; fiecare fișier trece prin `incarcaProgram`
 *   cu `sursa: 'fisier'` și amprenta declarată, exact ca unul adus cu „Fișier…” (deci `M6` e refuzat);
 * - cvs2 răspunde „primit”, cu fișierele acceptate și cele refuzate (codul și linia), sau `renuntat: true`.
 * Mesajele se primesc doar de la `window.opener`; răspunsurile nu conțin nimic secret (numele fișierelor, codurile).
 */
import { incarcaProgram, type CodRefuzProgram } from '../machine/program.ts';

export const PROTOCOL = 'cvs2-lucrare';
export const VERSIUNE = 1;
export const ANCORA = '#primeste-lucrare';
export const LIMITE = { fisiere: 64, octetiFisier: 32 * 1024 * 1024, octetiTotal: 128 * 1024 * 1024, nume: 120, titlu: 200 } as const;
export type Limite = { readonly [K in keyof typeof LIMITE]: number };

export type FisierLucrare = {
  readonly nume: string;
  readonly text: string;
  readonly sha256: string;
  readonly rol?: string;
  readonly placa?: number;
  readonly fata?: 1 | 2;
  readonly scula?: string;
  readonly timp_s?: number;
};
export type Lucrare = {
  readonly protocol: typeof PROTOCOL;
  readonly versiune: typeof VERSIUNE;
  readonly tip: 'lucrare';
  readonly id: string;
  readonly de_la: { readonly aplicatie: string; readonly versiune?: string };
  readonly titlu: string;
  readonly fisiere: readonly FisierLucrare[];
};
/** Un fișier primit, gata de încărcat în sender: aceeași formă ca `ExportPentruMasina`, dar încărcat cu `sursa: 'fisier'`. */
export type FisierPrimit = { readonly octeti: Uint8Array; readonly sha256: string; readonly nume: string };
export type RefuzFisier = { readonly nume: string; readonly cod: CodRefuzProgram; readonly linie: number | null };
export type VerificareLucrare = { readonly acceptate: readonly FisierPrimit[]; readonly refuzate: readonly RefuzFisier[] };
/** Lucrarea primită, cum o ține aplicația pentru panoul mașinii (doar în memorie, ADR 0126 §C). */
export type LucrarePrimita = VerificareLucrare & {
  readonly id: string;
  readonly titlu: string;
  readonly de_la: Lucrare['de_la'];
  readonly origine: string;
};

const text = (x: unknown, max: number): string | null => (typeof x === 'string' && x.length > 0 && x.length <= max ? x : null);
/** Numele unui fișier: ASCII vizibil, fără căi (`/`, `\`, `.`, `..`). */
const numeBun = (n: string): boolean => /^[\x21-\x7e]+$/.test(n) && !/[\\/]/.test(n) && n !== '.' && n !== '..';

/** Pură: lucrarea, dacă mesajul are forma ei și încape în limite; altfel motivul (pentru jurnal, nu pentru om). */
export function citesteLucrare(x: unknown, limite: Limite = LIMITE): { readonly ok: true; readonly lucrare: Lucrare } | { readonly ok: false; readonly motiv: string } {
  if (typeof x !== 'object' || x === null) return { ok: false, motiv: 'nu e un obiect' };
  const m = x as Record<string, unknown>;
  if (m.protocol !== PROTOCOL || m.tip !== 'lucrare') return { ok: false, motiv: 'alt mesaj' };
  if (m.versiune !== VERSIUNE) return { ok: false, motiv: `versiunea ${String(m.versiune)}` };
  const id = text(m.id, 80);
  const titlu = typeof m.titlu === 'string' ? m.titlu.slice(0, limite.titlu) : '';
  const de = typeof m.de_la === 'object' && m.de_la !== null ? m.de_la as Record<string, unknown> : null;
  const aplicatie = de ? text(de.aplicatie, 80) : null;
  if (!id || !de || !aplicatie) return { ok: false, motiv: 'fără id sau fără aplicație' };
  if (!Array.isArray(m.fisiere) || m.fisiere.length === 0 || m.fisiere.length > limite.fisiere) return { ok: false, motiv: 'numărul fișierelor' };
  const fisiere: FisierLucrare[] = [], nume = new Set<string>();
  let total = 0;
  for (const f of m.fisiere as unknown[]) {
    if (typeof f !== 'object' || f === null) return { ok: false, motiv: 'fișier fără formă' };
    const g = f as Record<string, unknown>;
    const n = text(g.nume, limite.nume), t = typeof g.text === 'string' ? g.text : null, h = typeof g.sha256 === 'string' ? g.sha256 : '';
    if (!n || !numeBun(n) || nume.has(n)) return { ok: false, motiv: `numele ${String(g.nume)}` };
    if (t === null || t.length > limite.octetiFisier) return { ok: false, motiv: `textul lui ${n}` };
    if (!/^[0-9a-f]{64}$/.test(h)) return { ok: false, motiv: `amprenta lui ${n}` };
    total += t.length;
    if (total > limite.octetiTotal) return { ok: false, motiv: 'prea mare' };
    nume.add(n);
    fisiere.push({
      nume: n, text: t, sha256: h,
      ...(typeof g.rol === 'string' ? { rol: g.rol.slice(0, 20) } : {}),
      ...(Number.isInteger(g.placa) ? { placa: g.placa as number } : {}),
      ...(g.fata === 1 || g.fata === 2 ? { fata: g.fata } : {}),
      ...(typeof g.scula === 'string' ? { scula: g.scula.slice(0, 80) } : {}),
      ...(typeof g.timp_s === 'number' && Number.isFinite(g.timp_s) && g.timp_s >= 0 ? { timp_s: g.timp_s } : {}),
    });
  }
  const versiune = typeof de.versiune === 'string' ? { versiune: de.versiune.slice(0, 20) } : {};
  return { ok: true, lucrare: { protocol: PROTOCOL, versiune: VERSIUNE, tip: 'lucrare', id, de_la: { aplicatie, ...versiune }, titlu, fisiere } };
}

/**
 * Fiecare fișier, ca unul adus cu „Fișier…”: octeții textului (un caracter peste 0x7F îl refuză `incarcaProgram`, ca
 * `non-ascii`), sursa `fisier` (fără `M6`) și amprenta declarată (`hash` dacă nu se potrivește). Ordinea rămâne.
 */
export async function verificaLucrare(l: Lucrare): Promise<VerificareLucrare> {
  const acceptate: FisierPrimit[] = [], refuzate: RefuzFisier[] = [];
  const enc = new TextEncoder();
  for (const f of l.fisiere) {
    const octeti = enc.encode(f.text);
    const rez = await incarcaProgram(octeti, { sursa: 'fisier', sha256: f.sha256 });
    if (rez.ok) acceptate.push({ octeti, sha256: rez.program.sha256, nume: f.nume });
    else refuzate.push({ nume: f.nume, cod: rez.cod, linie: rez.linie });
  }
  return { acceptate, refuzate };
}

/** Mesajele lui cvs2 către aplicația care trimite. */
export const gata = () => ({ protocol: PROTOCOL, versiune: VERSIUNE, tip: 'gata', aplicatie: 'CNC Vector Studio 2' }) as const;
export function primit(id: string, r: VerificareLucrare | null) {
  return r === null
    ? { protocol: PROTOCOL, versiune: VERSIUNE, tip: 'primit', id, renuntat: true, acceptate: [], refuzate: [] }
    : { protocol: PROTOCOL, versiune: VERSIUNE, tip: 'primit', id, acceptate: r.acceptate.map((f) => f.nume), refuzate: r.refuzate };
}

/** Fereastra cât îi trebuie ascultării: `window`, sau în teste o imitație (care dă mesajele ca obiecte simple). */
export type FereastraPrimire = {
  readonly opener: unknown;
  readonly location: { readonly hash: string };
  addEventListener(tip: 'message' | 'hashchange', f: (ev: Event) => void): void;
  removeEventListener(tip: 'message' | 'hashchange', f: (ev: Event) => void): void;
};
type Sursa = { postMessage(m: unknown, tinta: string): void };
type Mesaj = { readonly source: unknown; readonly origin: string; readonly data: unknown };

/**
 * Ascultă lucrările ferestrei care a deschis fila. `primeste(lucrare, origine, raspunde)`: cvs2 întreabă omul, verifică și
 * cheamă `raspunde(primit(...))`. O lucrare cu același id vine o singură dată. Întoarce oprirea.
 */
export function ascultaLucrari(w: FereastraPrimire, primeste: (l: Lucrare, origine: string, raspunde: (m: unknown) => void) => void): () => void {
  const vazute = new Set<string>();
  const catre = (sursa: unknown, origine: string) => (m: unknown): void => {
    // O pagină deschisă din fișier are originea „null”: acolo doar „*” ajunge (mesajele n-au nimic secret).
    (sursa as Sursa).postMessage(m, origine === 'null' ? '*' : origine);
  };
  const anunta = (): void => {
    if (w.location.hash === ANCORA && w.opener) catre(w.opener, '*')(gata());
  };
  const laMesaj = (e: Event): void => {
    const ev = e as unknown as Mesaj;
    if (!w.opener || ev.source !== w.opener) return;
    const d = ev.data as Record<string, unknown> | null;
    if (!d || typeof d !== 'object' || d.protocol !== PROTOCOL) return;
    if (d.tip === 'cauta') { catre(ev.source, ev.origin)(gata()); return; }
    if (d.tip !== 'lucrare') return;
    const r = citesteLucrare(d);
    if (!r.ok || vazute.has(r.lucrare.id)) return;
    vazute.add(r.lucrare.id);
    primeste(r.lucrare, ev.origin, catre(ev.source, ev.origin));
  };
  w.addEventListener('message', laMesaj);
  w.addEventListener('hashchange', anunta);
  anunta();
  return () => {
    w.removeEventListener('message', laMesaj);
    w.removeEventListener('hashchange', anunta);
  };
}
