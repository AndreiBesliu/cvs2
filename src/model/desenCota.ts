/**
 * Desenul unei cote liniare (ADR 0330 §4, §5, §6), pur, în mm ai foii: linia de cotă, liniile de extensie, capetele și locul
 * cifrei, după stilul din setări. Pânza îl desenează (felia 10.4↑a-2), exportul îl va scrie (felia c), deci ce se vede e ce
 * se exportă.
 *
 * - Direcția măsurată `u`: orizontala (1, 0), verticala (0, 1), aliniata de la a la b; normala `n` e `u` rotit cu 90° (în sus,
 *   spre stânga, în stânga drumului a → b).
 * - Linia de cotă stă la `d` mm pe normală față de mijlocul celor două puncte (pe normală), deci schimbarea capetelor între
 *   ele, cu `d` cu semnul invers, dă același desen. Picioarele sunt punctele proiectate pe ea.
 * - Liniile de extensie (dacă sunt arătate) pleacă la `gol` mm de punct și trec cu `depasire` mm de linie; un punct chiar pe
 *   linie (sub gol) n-are.
 * - Capetele: săgeata plină sau deschisă (lungă de `capat`, lată de `capat / 3`, înăuntru; în afară când linia e mai scurtă
 *   decât două capete, și linia se prelungește cu câte două capete), bara oblică (la 45°, lungă cât capătul), punctul (cu
 *   raza un sfert din capăt) sau nimic.
 * - Cifra, citibilă (unghiul în (−90°, 90°]): deasupra liniei (baza la 0,3 × înălțimea), în linie (linia întreruptă cât
 *   cifra, cu câte 0,3 × înălțimea de o parte și de alta) sau mereu orizontală (lângă mijlocul liniei, de partea normalei).
 */
import type { Punct } from '../geom/conturBaza.ts';
import type { Cota } from './document.ts';

export type FelLiniar = 'orizontala' | 'verticala' | 'aliniata';
export const FELURI_CAPAT = ['plina', 'deschisa', 'oblica', 'punct', 'fara'] as const;
export type FelCapat = (typeof FELURI_CAPAT)[number];
export const LOCURI_CIFRA = ['deasupra', 'in-linie', 'orizontala'] as const;
export type LocCifra = (typeof LOCURI_CIFRA)[number];

/** Stilul desenului, în mm pe foaie, din setările cotelor (ADR 0330 §6); implicitele sunt cele din tabelul de acolo. */
export type StilCota = {
  readonly gol: number;
  readonly depasire: number;
  readonly capat: number;
  readonly inaltime: number;
  readonly capete: FelCapat;
  readonly extensii: boolean;
  readonly loc: LocCifra;
};
export const STIL_IMPLICIT: StilCota = { gol: 1, depasire: 2, capat: 2.5, inaltime: 3.5, capete: 'plina', extensii: true, loc: 'deasupra' };

export type Bucata = readonly [Punct, Punct];
/** Un capăt desenat: o săgeată (plină sau doar conturul), o bară sau un punct. */
export type CapatDesen =
  | { readonly fel: 'sageata'; readonly puncte: readonly [varf: Punct, baza1: Punct, baza2: Punct]; readonly plina: boolean }
  | { readonly fel: 'bara'; readonly bucata: Bucata }
  | { readonly fel: 'punct'; readonly centru: Punct; readonly raza: number };

export type DesenCota = {
  readonly picioare: Bucata;
  /** Toată linia de cotă (pentru alegere); se desenează `bucati`, care o întrerup sub cifra pusă în linie. */
  readonly linie: Bucata;
  readonly bucati: readonly Bucata[];
  readonly extensii: readonly Bucata[];
  readonly capete: readonly CapatDesen[];
  /** Mijlocul bazei cifrei și unghiul ei, în grade (citibil). */
  readonly text: { readonly p: Punct; readonly unghi: number; readonly inaltime: number };
};

const plus = (a: Punct, v: Punct, k: number): Punct => ({ x: a.x + v.x * k, y: a.y + v.y * k });
const scalar = (a: Punct, v: Punct): number => a.x * v.x + a.y * v.y;

/** Direcția măsurată și normala ei, sau null (aliniata între două puncte identice). */
export function directii(fel: FelLiniar, a: Punct, b: Punct): { readonly u: Punct; readonly n: Punct } | null {
  let u: Punct;
  if (fel === 'orizontala') u = { x: 1, y: 0 };
  else if (fel === 'verticala') u = { x: 0, y: 1 };
  else {
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (!(l > 1e-12)) return null;
    u = { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
  }
  return { u, n: { x: -u.y, y: u.x } };
}

/** Distanța liniei de cotă (semnată, pe normală, față de mijlocul punctelor) care trece prin cursor: inversa desenului. */
export function distantaDinCursor(fel: FelLiniar, a: Punct, b: Punct, cursor: Punct): number {
  const dir = directii(fel, a, b);
  if (!dir) return 0;
  return scalar(cursor, dir.n) - (scalar(a, dir.n) + scalar(b, dir.n)) / 2;
}

/**
 * Felul ales de Automată după locul liniei (ADR 0330 §4): cursorul deasupra sau dedesubtul celor două puncte dă orizontala,
 * la stânga sau la dreapta verticala, înăuntrul cutiei lor aliniata; în colț, axa pe care a ieșit mai mult.
 */
export function felAutomat(a: Punct, b: Punct, cursor: Punct): FelLiniar {
  const iese = (v: number, x: number, y: number): number => (v < Math.min(x, y) ? Math.min(x, y) - v : v > Math.max(x, y) ? v - Math.max(x, y) : 0);
  const ex = iese(cursor.x, a.x, b.x), ey = iese(cursor.y, a.y, b.y);
  if (ex === 0 && ey === 0) return 'aliniata';
  return ey >= ex ? 'orizontala' : 'verticala';
}

/** Săgeata din piciorul `f`, cu vârful acolo și baza spre `v` (unitar). */
function sageata(f: Punct, v: Punct, l: number, plina: boolean): CapatDesen {
  const baza = plus(f, v, l), np = { x: -v.y, y: v.x }, w = l / 6;
  return { fel: 'sageata', puncte: [f, plus(baza, np, w), plus(baza, np, -w)], plina };
}

/** Lățimea aproximativă a unui text de înălțime `h`: 0,6 h pe semn (cifrele lui Relief SingleLine stau sub ea). */
export const latimeText = (text: string, h: number): number => [...text].length * 0.6 * h;

/**
 * Desenul cotei liniare, sau null (aliniata între două puncte identice). `text` e cifra scrisă (lățimea ei întrerupe linia
 * când stă în linie și o așază când e mereu orizontală).
 */
export function desenLiniar(fel: FelLiniar, a: Punct, b: Punct, d: number, s: StilCota, text = ''): DesenCota | null {
  const dir = directii(fel, a, b);
  if (!dir) return null;
  const { u, n } = dir;
  const nivel = (scalar(a, n) + scalar(b, n)) / 2 + d;
  const fa = plus(a, n, nivel - scalar(a, n)), fb = plus(b, n, nivel - scalar(b, n));
  const extensii: Bucata[] = [];
  if (s.extensii) {
    for (const p of [a, b]) {
      const t = nivel - scalar(p, n);
      if (Math.abs(t) <= s.gol) continue;
      const sg = t >= 0 ? 1 : -1;
      extensii.push([plus(p, n, sg * s.gol), plus(p, n, t + sg * s.depasire)]);
    }
  }
  const lung = Math.hypot(fb.x - fa.x, fb.y - fa.y);
  const w = lung > 1e-12 ? { x: (fb.x - fa.x) / lung, y: (fb.y - fa.y) / lung } : u;
  const minus = { x: -w.x, y: -w.y };
  let capete: CapatDesen[] = [];
  let linie: Bucata = [fa, fb];
  if (s.capete === 'plina' || s.capete === 'deschisa') {
    const plina = s.capete === 'plina';
    if (lung >= 2 * s.capat) capete = [sageata(fa, w, s.capat, plina), sageata(fb, minus, s.capat, plina)];
    else {
      capete = [sageata(fa, minus, s.capat, plina), sageata(fb, w, s.capat, plina)];
      linie = [plus(fa, w, -2 * s.capat), plus(fb, w, 2 * s.capat)];
    }
  } else if (s.capete === 'oblica') {
    // La 45° față de linie, rotită în sens trigonometric față de direcția ei („/” pe o cotă orizontală), centrată pe picior.
    const r = { x: (w.x - w.y) / Math.SQRT2, y: (w.x + w.y) / Math.SQRT2 };
    capete = [fa, fb].map((f): CapatDesen => ({ fel: 'bara', bucata: [plus(f, r, -s.capat / 2), plus(f, r, s.capat / 2)] }));
  } else if (s.capete === 'punct') {
    capete = [fa, fb].map((f): CapatDesen => ({ fel: 'punct', centru: f, raza: s.capat / 4 }));
  }
  // Cifra: citibilă (unghiul în (−90°, 90°]), „deasupra” fiind stânga direcției de citire.
  let unghi = (Math.atan2(u.y, u.x) * 180) / Math.PI;
  if (unghi > 90 + 1e-9) unghi -= 180;
  else if (unghi <= -90 + 1e-9) unghi += 180;
  if (Math.abs(unghi) < 1e-12) unghi = 0;
  const r = (unghi * Math.PI) / 180, citire = { x: Math.cos(r), y: Math.sin(r) }, sus = { x: -Math.sin(r), y: Math.cos(r) };
  const m = { x: (fa.x + fb.x) / 2, y: (fa.y + fb.y) / 2 };
  const h = s.inaltime, gol = 0.3 * h;
  let bucati: Bucata[] = [linie];
  let pText: Punct;
  if (s.loc === 'in-linie') {
    // Baza cifrei la jumătate de înălțime sub linie (cifra centrată pe ea), iar linia întreruptă cât cifra și golurile ei.
    pText = plus(m, sus, -h / 2);
    const jum = latimeText(text, h) / 2 + gol;
    const [l0, l1] = linie;
    const t0 = scalar({ x: l0.x - m.x, y: l0.y - m.y }, citire), t1 = scalar({ x: l1.x - m.x, y: l1.y - m.y }, citire);
    const [tmin, tmax] = t0 <= t1 ? [t0, t1] : [t1, t0];
    bucati = [];
    if (tmin < -jum) bucati.push([plus(m, citire, tmin), plus(m, citire, -jum)]);
    if (tmax > jum) bucati.push([plus(m, citire, jum), plus(m, citire, tmax)]);
  } else if (s.loc === 'orizontala') {
    // Cutia cifrei, orizontală, lângă mijlocul liniei, de partea normalei care urcă (sau spre stânga, la o linie verticală).
    const nn = n.y > 1e-12 || (Math.abs(n.y) <= 1e-12 && n.x < 0) ? n : { x: -n.x, y: -n.y };
    const ext = (Math.abs(nn.x) * latimeText(text, h)) / 2 + (Math.abs(nn.y) * h) / 2;
    const centru = plus(m, nn, gol + ext);
    pText = { x: centru.x, y: centru.y - h / 2 };
    unghi = 0;
  } else {
    pText = plus(m, sus, gol);
  }
  return { picioare: [fa, fb], linie, bucati, extensii, capete, text: { p: pText, unghi, inaltime: h } };
}

/**
 * Cum se scrie cifra (ADR 0330 §6, grupul Cifrele): unitatea, zecimalele (cele efective, după unitate), zerourile de la
 * coadă, pasul rotunjirii (în unitatea arătată; null: la zecimale), virgula zecimală și unitatea scrisă după cifră.
 */
export type FormatCifre = {
  readonly unitate: 'mm' | 'cm' | 'inch';
  readonly zecimale: number;
  readonly zerouri: 'taiate' | 'pastrate';
  readonly pas: number | null;
  readonly virgula: boolean;
  readonly cuUnitate: boolean;
};
const MM_PE_UNITATE = { mm: 1, cm: 10, inch: 25.4 } as const;
const SUFIX = { mm: ' mm', cm: ' cm', inch: ' in' } as const;

/** Câte zecimale are pasul (0,25 → 2): cifra le arată pe toate, chiar dacă zecimalele cerute sunt mai puține. */
function zecimalePas(pas: number): number {
  const s = String(pas);
  const m = /\.(\d+)$/.exec(s);
  return m?.[1] ? Math.min(6, m[1].length) : 0;
}

/** Cifra unei mărimi din mm, după format: în unitatea aleasă, rotunjită, fără „-0”. */
export function scrieCifra(mm: number, f: FormatCifre): string {
  let v = mm / MM_PE_UNITATE[f.unitate];
  let z = f.zecimale;
  if (f.pas !== null && f.pas > 0) {
    v = Math.round(v / f.pas) * f.pas;
    z = Math.max(z, zecimalePas(f.pas));
  }
  const k = 10 ** z;
  const r = Math.round(Math.abs(v) * k) / k;
  let s = r.toFixed(z);
  if (f.zerouri === 'taiate' && s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (v < 0 && r !== 0) s = `-${s}`;
  if (f.virgula) s = s.replace('.', ',');
  return f.cuUnitate ? s + SUFIX[f.unitate] : s;
}

/** Valoarea în mm, rotunjită la `zecimale` (implicit 2), cu zerourile de la coadă tăiate (măsura, lângă cursor). */
export function textValoare(v: number, virgula: boolean, zecimale = 2): string {
  return scrieCifra(v, { unitate: 'mm', zecimale, zerouri: 'taiate', pas: null, virgula, cuUnitate: false });
}

/** Textul cotei: al ei, cu `<>` pentru cifră (ADR 0330 §5), sau doar cifra. */
export function textCota(c: Cota, cifra: string): string {
  return typeof c.text === 'string' ? c.text.replaceAll('<>', cifra) : cifra;
}

/** Distanța de la `p` la bucata [a, b]. */
function laBucata(p: Punct, [a, b]: Bucata): number {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y);
}

/** Distanța de la `p` la desenul cotei: la linie, la extensii, la cutia cifrei (0 înăuntru). Alegerea cu clicul o folosește. */
export function distantaLaDesen(dc: DesenCota, text: string, p: Punct): number {
  let d = laBucata(p, dc.linie);
  for (const e of dc.extensii) d = Math.min(d, laBucata(p, e));
  // Cutia cifrei, în axele ei: de la bază în sus cât înălțimea, cât lățimea de o parte și de alta a mijlocului.
  const r = (dc.text.unghi * Math.PI) / 180, ux = Math.cos(r), uy = Math.sin(r);
  const qx = p.x - dc.text.p.x, qy = p.y - dc.text.p.y;
  const lx = qx * ux + qy * uy, ly = -qx * uy + qy * ux;
  const hw = latimeText(text, dc.text.inaltime) / 2;
  const ex = Math.max(0, Math.abs(lx) - hw), ey = Math.max(0, -ly, ly - dc.text.inaltime);
  return Math.min(d, Math.hypot(ex, ey));
}
