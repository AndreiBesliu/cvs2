/**
 * Desenul unei cote (ADR 0330 §4, §5, §6), pur, în mm ai foii: linia de cotă (sau arcul unghiului), liniile de extensie,
 * capetele și locul cifrei, după stilul din setări. Pânza îl desenează (feliile 10.4↑a-2, b), exportul îl va scrie (felia c),
 * deci ce se vede e ce se exportă. Cotele liniare întâi; raza, diametrul și unghiul (felia b) la capăt (`desenRadial`,
 * `desenUnghi`, `desenCota`).
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
/** Linia razei (ADR 0330 §6): din centru, din afară (spre punctul de pe cerc), sau după locul cifrei (înăuntru sau afară). */
export const LINII_RAZEI = ['loc', 'centru', 'afara'] as const;
export type LiniaRazei = (typeof LINII_RAZEI)[number];

/** Stilul desenului, în mm pe foaie, din setările cotelor (ADR 0330 §6); implicitele sunt cele din tabelul de acolo. */
export type StilCota = {
  readonly gol: number;
  readonly depasire: number;
  readonly capat: number;
  readonly inaltime: number;
  readonly capete: FelCapat;
  readonly extensii: boolean;
  readonly loc: LocCifra;
  readonly raza: LiniaRazei;
};
export const STIL_IMPLICIT: StilCota = { gol: 1, depasire: 2, capat: 2.5, inaltime: 3.5, capete: 'plina', extensii: true, loc: 'deasupra', raza: 'loc' };

export type Bucata = readonly [Punct, Punct];
/** Un capăt desenat: o săgeată (plină sau doar conturul), o bară sau un punct. */
export type CapatDesen =
  | { readonly fel: 'sageata'; readonly puncte: readonly [varf: Punct, baza1: Punct, baza2: Punct]; readonly plina: boolean }
  | { readonly fel: 'bara'; readonly bucata: Bucata }
  | { readonly fel: 'punct'; readonly centru: Punct; readonly raza: number };

/** Un arc al cotei unghiului, în lume: centrul, raza, unghiul de start și baleiajul (radiani, în sens trigonometric, ≥ 0). */
export type ArcDesen = { readonly centru: Punct; readonly raza: number; readonly de: number; readonly baleiaj: number };

export type DesenCota = {
  readonly picioare: Bucata;
  /**
   * Toată linia de cotă (pentru alegere); se desenează `bucati`, care o întrerup sub cifra pusă în linie. La unghi, linia e
   * arcul (`arc`), desenat în `arce`, iar `linie` e doar coarda capetelor lui (alegerea o sare).
   */
  readonly linie: Bucata;
  readonly bucati: readonly Bucata[];
  /** Arcul întreg al unghiului (pentru alegere), sau null la celelalte feluri. */
  readonly arc: ArcDesen | null;
  readonly arce: readonly ArcDesen[];
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
 * Cifra pe o linie de cotă dreaptă (`linie`, de direcție `u`), centrată pe punctul `m` al liniei: citibilă (unghiul în
 * (−90°, 90°]), „deasupra” fiind stânga direcției de citire. Deasupra liniei (baza la 0,3 × înălțimea), în linie (linia
 * întreruptă cât cifra, cu câte 0,3 × înălțimea de o parte și de alta) sau mereu orizontală (lângă `m`, de partea normalei
 * care urcă, ori spre stânga la o linie verticală). Comună cotelor liniare, razei și diametrului.
 */
function textPeLinie(m: Punct, u: Punct, linie: Bucata, text: string, s: StilCota): { readonly bucati: Bucata[]; readonly text: DesenCota['text'] } {
  const n = { x: -u.y, y: u.x };
  let unghi = (Math.atan2(u.y, u.x) * 180) / Math.PI;
  if (unghi > 90 + 1e-9) unghi -= 180;
  else if (unghi <= -90 + 1e-9) unghi += 180;
  if (Math.abs(unghi) < 1e-12) unghi = 0;
  const r = (unghi * Math.PI) / 180, citire = { x: Math.cos(r), y: Math.sin(r) }, sus = { x: -Math.sin(r), y: Math.cos(r) };
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
    // Cutia cifrei, orizontală, lângă `m`, de partea normalei care urcă (sau spre stânga, la o linie verticală).
    const nn = n.y > 1e-12 || (Math.abs(n.y) <= 1e-12 && n.x < 0) ? n : { x: -n.x, y: -n.y };
    const ext = (Math.abs(nn.x) * latimeText(text, h)) / 2 + (Math.abs(nn.y) * h) / 2;
    const centru = plus(m, nn, gol + ext);
    pText = { x: centru.x, y: centru.y - h / 2 };
    unghi = 0;
  } else {
    pText = plus(m, sus, gol);
  }
  return { bucati, text: { p: pText, unghi, inaltime: h } };
}

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
  const t = textPeLinie({ x: (fa.x + fb.x) / 2, y: (fa.y + fb.y) / 2 }, u, linie, text, s);
  return { picioare: [fa, fb], linie, bucati: t.bucati, arc: null, arce: [], extensii, capete, text: t.text };
}

/**
 * Un capăt într-un punct al unei linii de cotă, cu baza spre `spre` (unitar): săgeata (plină sau doar conturul), bara oblică
 * (la 45° față de linie, „/” pe o linie care merge spre dreapta), punctul, sau nimic. Al razei, al diametrului și al unghiului.
 */
function capatIn(f: Punct, spre: Punct, s: StilCota): CapatDesen | null {
  if (s.capete === 'plina' || s.capete === 'deschisa') return sageata(f, spre, s.capat, s.capete === 'plina');
  if (s.capete === 'oblica') {
    const r = { x: (spre.x - spre.y) / Math.SQRT2, y: (spre.x + spre.y) / Math.SQRT2 };
    return { fel: 'bara', bucata: [plus(f, r, -s.capat / 2), plus(f, r, s.capat / 2)] };
  }
  if (s.capete === 'punct') return { fel: 'punct', centru: f, raza: s.capat / 4 };
  return null;
}
const capete = (...c: (CapatDesen | null)[]): CapatDesen[] => c.filter((x): x is CapatDesen => x !== null);
const intre = (v: number, min: number, max: number, altfel: number): number => (max < min ? altfel : Math.min(max, Math.max(min, v)));

export type FelRadial = 'raza' | 'diametru';

/**
 * Desenul razei sau al diametrului (ADR 0330 §4, §6), sau null (punctul de pe cerc chiar în centru). Puncte: centrul `c` și
 * punctul `p` de pe cerc; linia merge pe direcția c → p, iar `d` e locul cifrei față de `p`, pe acea direcție (pozitiv:
 * afară, negativ: înăuntru).
 *
 * - **Raza**, după „Linia razei”: din centru (linia c → p, săgeata cu vârful în `p`, spre afară), din afară (linia vine de
 *   dincolo de `p`, săgeata cu vârful în `p`, spre centru), sau după loc (cifra afară: din afară; înăuntru: din centru).
 * - **Diametrul:** linia trece prin centru, de la punctul opus lui `p` la `p`, cu câte o săgeată spre afară la fiecare capăt;
 *   cifra afară, pe prelungirea de dincolo de `p`, sau înăuntru, pe linie.
 * - Cifra: afară, la cel puțin un gol (și, din afară, încă un capăt) de cerc; înăuntru, între centru (sau capătul opus) și
 *   săgeată, cât încape. Linia trece pe sub toată cifra.
 */
export function desenRadial(fel: FelRadial, c: Punct, p: Punct, d: number, s: StilCota, text = ''): DesenCota | null {
  const r = Math.hypot(p.x - c.x, p.y - c.y);
  if (!(r > 1e-12)) return null;
  const u = { x: (p.x - c.x) / r, y: (p.y - c.y) / r }, minus = { x: -u.x, y: -u.y };
  const h = s.inaltime, w = latimeText(text, h), gol = 0.3 * h;
  const afara = d > 0;
  const mod = fel === 'diametru' || s.raza === 'loc' ? (afara ? 'afara' : 'centru') : s.raza;
  let t0: number, tm: number, t1: number, cap: CapatDesen[];
  if (fel === 'diametru') {
    t0 = -r;
    cap = capete(capatIn(p, minus, s), capatIn(plus(c, u, -r), u, s));
    const lim = r - s.capat - gol - w / 2;
    tm = afara ? r + Math.max(d, gol + w / 2) : intre(r + d, -lim, lim, 0);
  } else if (mod === 'afara') {
    t0 = r;
    cap = capete(capatIn(p, u, s));
    tm = r + Math.max(d, s.capat + gol + w / 2);
  } else {
    t0 = 0;
    cap = capete(capatIn(p, minus, s));
    tm = afara ? r + Math.max(d, gol + w / 2) : intre(r + d, gol + w / 2, r - s.capat - gol - w / 2, r / 2);
  }
  t1 = Math.max(r, tm + w / 2);
  const linie: Bucata = [plus(c, u, t0), plus(c, u, t1)];
  const t = textPeLinie(plus(c, u, tm), u, linie, text, s);
  return { picioare: [c, p], linie, bucati: t.bucati, arc: null, arce: [], extensii: [], capete: cap, text: t.text };
}

/** Locul cifrei razei sau diametrului din cursor: proiecția pe direcția c → p, față de cerc (inversa desenului). */
export function distantaRadiala(c: Punct, p: Punct, cursor: Punct): number {
  const r = Math.hypot(p.x - c.x, p.y - c.y);
  if (!(r > 1e-12)) return 0;
  return ((cursor.x - c.x) * (p.x - c.x) + (cursor.y - c.y) * (p.y - c.y)) / r - r;
}

/**
 * Vârful și laturile unghiului (ADR 0330 §4): trei puncte (vârful, apoi câte un punct pe fiecare latură) sau patru (două
 * laturi, prin capetele lor; vârful e încrucișarea dreptelor lor). Null: o latură de lungime zero sau două laturi paralele.
 */
export function laturiUnghi(p: readonly Punct[]): { readonly v: Punct; readonly e1: Punct; readonly e2: Punct; readonly laturi: readonly [readonly Punct[], readonly Punct[]] } | null {
  const [a, b, x, y] = p;
  if (!a || !b || !x) return null;
  const e1 = { x: b.x - a.x, y: b.y - a.y };
  const e2 = y ? { x: y.x - x.x, y: y.y - x.y } : { x: x.x - a.x, y: x.y - a.y };
  const l1 = Math.hypot(e1.x, e1.y), l2 = Math.hypot(e2.x, e2.y);
  if (!(l1 > 1e-12) || !(l2 > 1e-12)) return null;
  if (!y) return { v: a, e1, e2, laturi: [[a, b], [a, x]] };
  const cr = e1.x * e2.y - e1.y * e2.x;
  if (Math.abs(cr) <= 1e-12 * l1 * l2) return null;
  // a + t·e1 = x + s·e2: t din produsul vectorial cu e2.
  const tt = ((x.x - a.x) * e2.y - (x.y - a.y) * e2.x) / cr;
  return { v: plus(a, e1, tt), e1, e2, laturi: [[a, b], [x, y]] };
}

/**
 * Linia unghiului din cursor (inversa desenului): raza arcului e distanța cursorului de vârf, iar semidreptele (`s1`, `s2`) sunt
 * cele ale sectorului în care stă cursorul: cursorul = α·e1 + β·e2, cu s1 = semnul lui α și s2 al lui β. Null: unghi fără
 * vârf (laturi paralele, de lungime zero) sau cursorul chiar în vârf.
 */
export function linieUnghiDinCursor(p: readonly Punct[], cursor: Punct): { readonly d: number; readonly s1: number; readonly s2: number } | null {
  const l = laturiUnghi(p);
  if (!l) return null;
  const q = { x: cursor.x - l.v.x, y: cursor.y - l.v.y }, d = Math.hypot(q.x, q.y);
  if (!(d > 1e-12)) return null;
  const cr = l.e1.x * l.e2.y - l.e1.y * l.e2.x;
  const alfa = (q.x * l.e2.y - q.y * l.e2.x) / cr, beta = (l.e1.x * q.y - l.e1.y * q.x) / cr;
  return { d, s1: alfa < 0 ? -1 : 1, s2: beta < 0 ? -1 : 1 };
}

const peArc = (a: ArcDesen, t: number): Punct => ({ x: a.centru.x + a.raza * Math.cos(t), y: a.centru.y + a.raza * Math.sin(t) });

/**
 * Desenul unghiului (ADR 0330 §4), sau null (fără vârf, ori raza arcului zero). `d` e raza arcului, `s1` și `s2` (±1) aleg
 * semidreptele de pe fiecare latură, deci sectorul (unghiul din cele patru), sub 180°.
 *
 * - Arcul merge, în sens trigonometric, de la o semidreaptă la cealaltă, prin sector; capetele lui sunt pe semidrepte.
 * - Liniile de extensie: pe semidreapta unei laturi care nu ajunge la arc, de la golul de după capătul ei (sau de după vârf)
 *   până la depășirea de dincolo de arc; la o latură care începe dincolo de arc, invers.
 * - Capetele: săgețile înăuntrul arcului, pe coarda unui capăt; când arcul e mai scurt decât două capete, în afară, cu arcul
 *   prelungit cu câte două capete.
 * - Cifra, la mijlocul arcului, citibilă (după tangentă): deasupra (în afara arcului), în linie (arcul întrerupt cât cifra)
 *   sau mereu orizontală (afară, lângă mijloc).
 */
export function desenUnghi(p: readonly Punct[], d: number, s1: number, s2: number, s: StilCota, text = ''): DesenCota | null {
  const l = laturiUnghi(p);
  const R = Math.abs(d);
  if (!l || !(R > 1e-9)) return null;
  const { v } = l;
  const unit = (e: Punct, k: number): Punct => { const n = Math.hypot(e.x, e.y); return { x: (k * e.x) / n, y: (k * e.y) / n }; };
  const d1 = unit(l.e1, s1 === -1 ? -1 : 1), d2 = unit(l.e2, s2 === -1 ? -1 : 1);
  const unghi = Math.atan2(Math.abs(d1.x * d2.y - d1.y * d2.x), d1.x * d2.x + d1.y * d2.y);
  // Arcul în sens trigonometric: de la d1 la d2 dacă d2 e la stânga lui d1, altfel de la d2 la d1.
  const deLa = d1.x * d2.y - d1.y * d2.x >= 0 ? d1 : d2;
  const arc: ArcDesen = { centru: v, raza: R, de: Math.atan2(deLa.y, deLa.x), baleiaj: unghi };
  const P0 = peArc(arc, arc.de), P1 = peArc(arc, arc.de + arc.baleiaj);
  // Extensiile, pe fiecare semidreaptă, după cât acoperă latura ei (proiecțiile punctelor laturii pe semidreaptă).
  const extensii: Bucata[] = [];
  if (s.extensii) {
    for (const [k, di] of [d1, d2].entries()) {
      const t = (l.laturi[k] ?? []).map((q) => scalar({ x: q.x - v.x, y: q.y - v.y }, di));
      const tmax = Math.max(...t), tmin = Math.min(...t);
      if (R > tmax + s.gol) extensii.push([plus(v, di, Math.max(tmax, 0) + s.gol), plus(v, di, R + s.depasire)]);
      else if (R < tmin - s.gol) extensii.push([plus(v, di, Math.max(R - s.depasire, 0)), plus(v, di, tmin - s.gol)]);
    }
  }
  // Capetele: pe coarda de lungime `capat` a arcului (înăuntru), sau pe prelungirea lui (în afară, când nu încap).
  const inauntru = R * unghi >= 2 * s.capat;
  const dt = s.capat / R;
  let desenat = arc;
  if (!inauntru && (s.capete === 'plina' || s.capete === 'deschisa')) desenat = { ...arc, de: arc.de - 2 * dt, baleiaj: arc.baleiaj + 4 * dt };
  const spre = (f: Punct, t: number): Punct => { const q = peArc(arc, t); const n = Math.hypot(q.x - f.x, q.y - f.y); return { x: (q.x - f.x) / n, y: (q.y - f.y) / n }; };
  const sg = inauntru || !(s.capete === 'plina' || s.capete === 'deschisa') ? 1 : -1;
  const cap = capete(capatIn(P0, spre(P0, arc.de + sg * dt), s), capatIn(P1, spre(P1, arc.de + arc.baleiaj - sg * dt), s));
  // Cifra, la mijlocul arcului.
  const am = arc.de + arc.baleiaj / 2, dm = { x: Math.cos(am), y: Math.sin(am) };
  const tg = { x: -dm.y, y: dm.x };
  let ung = (Math.atan2(tg.y, tg.x) * 180) / Math.PI;
  if (ung > 90 + 1e-9) ung -= 180;
  else if (ung <= -90 + 1e-9) ung += 180;
  if (Math.abs(ung) < 1e-12) ung = 0;
  const rr = (ung * Math.PI) / 180, sus = { x: -Math.sin(rr), y: Math.cos(rr) };
  const h = s.inaltime, w = latimeText(text, h), gol = 0.3 * h;
  let arce: ArcDesen[] = [desenat];
  let pText: Punct;
  if (s.loc === 'in-linie') {
    pText = plus(plus(v, dm, R), sus, -h / 2);
    const jum = (w / 2 + gol) / R;
    const capat = desenat.de + desenat.baleiaj;
    arce = [];
    if (am - jum > desenat.de) arce.push({ ...desenat, baleiaj: am - jum - desenat.de });
    if (am + jum < capat) arce.push({ ...desenat, de: am + jum, baleiaj: capat - am - jum });
  } else if (s.loc === 'orizontala') {
    const ext = (Math.abs(dm.x) * w) / 2 + (Math.abs(dm.y) * h) / 2;
    const centru = plus(v, dm, R + gol + ext);
    pText = { x: centru.x, y: centru.y - h / 2 };
    ung = 0;
  } else {
    // Deasupra = în afara arcului: baza la un gol de arc, sau la un gol și o înălțime, când „sus”-ul cifrei e spre vârf.
    pText = plus(v, dm, R + gol + (scalar(sus, dm) >= 0 ? 0 : h));
  }
  return { picioare: [P0, P1], linie: [P0, P1], bucati: [], arc, arce, extensii, capete: cap, text: { p: pText, unghi: ung, inaltime: h } };
}

/**
 * Calea SVG a unui arc, pe un ecran cu Y în jos: `sx` și `sy` duc un punct al foii pe ecran, `k` e scara (raza pe ecran). Cu
 * Y întors, sensul trigonometric al foii rămâne cel invers acelor de ceasornic la vedere, iar în SVG (Y în jos) acela e
 * sensul unghiurilor negative: sweep-flag 0.
 */
export function caleArc(a: ArcDesen, sx: (x: number) => number, sy: (y: number) => number, k: number): string {
  const p0 = peArc(a, a.de), p1 = peArc(a, a.de + a.baleiaj), r = a.raza * k;
  return `M${sx(p0.x)} ${sy(p0.y)} A${r} ${r} 0 ${a.baleiaj > Math.PI ? 1 : 0} 0 ${sx(p1.x)} ${sy(p1.y)}`;
}

/** Desenul oricărei cote cunoscute, după felul ei, cu punctele citite; null pentru un fel necunoscut sau fără desen. */
export function desenCota(c: Cota, p: readonly Punct[], s: StilCota, text = ''): DesenCota | null {
  const [a, b] = p;
  if (!a || !b || !c.linie) return null;
  if (c.fel === 'orizontala' || c.fel === 'verticala' || c.fel === 'aliniata') return p.length === 2 ? desenLiniar(c.fel, a, b, c.linie.d, s, text) : null;
  if (c.fel === 'raza' || c.fel === 'diametru') return p.length === 2 ? desenRadial(c.fel, a, b, c.linie.d, s, text) : null;
  if (c.fel === 'unghi') return p.length === 3 || p.length === 4 ? desenUnghi(p, c.linie.d, c.linie.s1 ?? 1, c.linie.s2 ?? 1, s, text) : null;
  return null;
}

/**
 * Cum se scrie cifra (ADR 0330 §6, grupurile Cifrele și „Raza, diametrul, unghiul”): unitatea (inch în fracții: `fractie` e
 * numitorul cel mai mare, 2–64), zecimalele (cele efective, după unitate), zerourile de la coadă, pasul rotunjirii (în
 * unitatea arătată; null: la zecimale), virgula zecimală, unitatea scrisă după cifră; prefixele razei și diametrului; unghiul
 * în grade zecimale sau în grade-minute-secunde, cu zecimalele lui (la secunde, în grade-minute-secunde).
 */
export type FormatCifre = {
  readonly unitate: 'mm' | 'cm' | 'inch' | 'fractii';
  readonly zecimale: number;
  readonly zerouri: 'taiate' | 'pastrate';
  readonly pas: number | null;
  readonly virgula: boolean;
  readonly cuUnitate: boolean;
  readonly fractie: number;
  readonly prefixR: string;
  readonly prefixD: string;
  readonly unghi: 'zecimale' | 'gms';
  readonly zecimaleUnghi: number;
};
const MM_PE_UNITATE = { mm: 1, cm: 10, inch: 25.4, fractii: 25.4 } as const;
const SUFIX = { mm: ' mm', cm: ' cm', inch: ' in', fractii: ' in' } as const;

/** Câte zecimale are pasul (0,25 → 2): cifra le arată pe toate, chiar dacă zecimalele cerute sunt mai puține. */
function zecimalePas(pas: number): number {
  const s = String(pas);
  const m = /\.(\d+)$/.exec(s);
  return m?.[1] ? Math.min(6, m[1].length) : 0;
}

/** Un număr pozitiv cu `z` zecimale, cu zerourile de la coadă tăiate sau păstrate, cu separatorul ales. */
function cuZecimale(v: number, z: number, zerouri: FormatCifre['zerouri'], virgula: boolean): string {
  let s = v.toFixed(z);
  if (zerouri === 'taiate' && s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return virgula ? s.replace('.', ',') : s;
}

const cmmdc = (a: number, b: number): number => (b === 0 ? a : cmmdc(b, a % b));

/** Inch în fracții: întregul și fracția simplificată, la cel mult 1/`n` („1 1/2”, „3/8”, „0”). */
function fractii(inch: number, n: number): string {
  const unitati = Math.round(Math.abs(inch) * n);
  const intreg = Math.floor(unitati / n), rest = unitati % n;
  let s: string;
  if (rest === 0) s = String(intreg);
  else {
    const g = cmmdc(rest, n);
    s = `${intreg > 0 ? `${intreg} ` : ''}${rest / g}/${n / g}`;
  }
  return inch < 0 && unitati !== 0 ? `-${s}` : s;
}

/** Cifra unei mărimi din mm, după format: în unitatea aleasă, rotunjită, fără „-0”. */
export function scrieCifra(mm: number, f: FormatCifre): string {
  if (f.unitate === 'fractii') return fractii(mm / 25.4, f.fractie) + (f.cuUnitate ? SUFIX.fractii : '');
  let v = mm / MM_PE_UNITATE[f.unitate];
  let z = f.zecimale;
  if (f.pas !== null && f.pas > 0) {
    v = Math.round(v / f.pas) * f.pas;
    z = Math.max(z, zecimalePas(f.pas));
  }
  const k = 10 ** z;
  const r = Math.round(Math.abs(v) * k) / k;
  let s = cuZecimale(r, z, f.zerouri, f.virgula);
  if (v < 0 && r !== 0) s = `-${s}`;
  return f.cuUnitate ? s + SUFIX[f.unitate] : s;
}

/**
 * Cifra unui unghi în grade (≥ 0): grade zecimale („30,5°”) sau grade-minute-secunde („30°30′0″”), rotunjite la zecimalele
 * unghiului (ale secundelor, în grade-minute-secunde), cu zerourile și separatorul cifrelor.
 */
export function scrieUnghi(grade: number, f: FormatCifre): string {
  const z = f.zecimaleUnghi, k = 10 ** z;
  if (f.unghi === 'zecimale') return `${cuZecimale(Math.round(Math.abs(grade) * k) / k, z, f.zerouri, f.virgula)}°`;
  // În unități de 1/k secunde, întregi: gradele, minutele și secundele nu pot da „60″” după rotunjire.
  const n = Math.round(Math.abs(grade) * 3600 * k);
  const g = Math.floor(n / (3600 * k)), m = Math.floor((n - g * 3600 * k) / (60 * k)), sec = (n - g * 3600 * k - m * 60 * k) / k;
  return `${g}°${m}′${cuZecimale(sec, z, f.zerouri, f.virgula)}″`;
}

/** Cifra unei cote, după felul ei: raza și diametrul cu prefixul lor, unghiul în grade, restul în unitatea aleasă. */
export function cifraCota(fel: string, valoare: number, f: FormatCifre): string {
  if (fel === 'unghi') return scrieUnghi(valoare, f);
  const c = scrieCifra(valoare, f);
  return fel === 'raza' ? f.prefixR + c : fel === 'diametru' ? f.prefixD + c : c;
}

/**
 * Toleranța unei cote (felia 10.4↑e-1): abaterea de sus și cea de jos, cu semnul lor, în unitatea măsurii (mm; la unghi,
 * grade), fiecare cel mult `TOLERANTA_MAXIMA`, cea de sus nu sub cea de jos. Două zerouri nu sunt o toleranță.
 */
export type Toleranta = { readonly sus: number; readonly jos: number };
export const TOLERANTA_MAXIMA = 100;
const abatereBuna = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= TOLERANTA_MAXIMA;

/** Toleranța cotei, sau null: lipsă, stricată (a unei versiuni mai noi sau scrisă de mână) ori zero și zero. */
export function tolerantaCota(c: Cota): Toleranta | null {
  const t = c['toleranta'];
  if (typeof t !== 'object' || t === null || Array.isArray(t)) return null;
  const { sus, jos } = t as Record<string, unknown>;
  if (!abatereBuna(sus) || !abatereBuna(jos) || sus < jos || (sus === 0 && jos === 0)) return null;
  return { sus, jos };
}

/**
 * Toleranța scrisă după cifră, cu spațiul dinainte: simetrică, „ ±0,1”; altfel, întâi abaterea de sus, apoi cea de jos, cu
 * semnele lor („ +0,2 -0,1”; zero fără semn). În unitatea și cu zecimalele cifrei, fără pasul ei de rotunjire și fără
 * unitate (ea vine după toleranță); la unghi, ca unghiurile.
 */
export function scrieToleranta(fel: string, t: Toleranta, f: FormatCifre): string {
  const g: FormatCifre = { ...f, pas: null, cuUnitate: false };
  const abs = (x: number): string => (fel === 'unghi' ? scrieUnghi(Math.abs(x), g) : scrieCifra(Math.abs(x), g));
  const cuSemn = (x: number): string => {
    const s = abs(x);
    // Ce se scrie zero (rotunjit: nicio cifră nenulă) nu are semn.
    return /[1-9]/.test(s) ? `${x < 0 ? '-' : '+'}${s}` : s;
  };
  if (t.sus === -t.jos) return ` ±${abs(t.sus)}`;
  return ` ${cuSemn(t.sus)} ${cuSemn(t.jos)}`;
}

/** Cifra unei cote cu toleranța ei, înaintea unității (dacă unitatea se scrie): „100 ±0,1 mm”, „R10 +0,2 -0,1”. */
export function cifraCuToleranta(c: Cota, valoare: number, f: FormatCifre): string {
  const t = tolerantaCota(c);
  if (!t) return cifraCota(c.fel, valoare, f);
  const unitate = f.cuUnitate && c.fel !== 'unghi' ? SUFIX[f.unitate] : '';
  return cifraCota(c.fel, valoare, { ...f, cuUnitate: false }) + scrieToleranta(c.fel, t, f) + unitate;
}

/** Scrierea implicită a cifrelor, cu virgula sau punctul (probele, cota de probă a ferestrei Setări). */
export const formatImplicit = (virgula: boolean): FormatCifre => ({
  unitate: 'mm', zecimale: 2, zerouri: 'taiate', pas: null, virgula, cuUnitate: false, fractie: 16, prefixR: 'R', prefixD: 'Ø', unghi: 'zecimale', zecimaleUnghi: 2,
});

/** Valoarea în mm, rotunjită la `zecimale` (implicit 2), cu zerourile de la coadă tăiate (măsura, lângă cursor). */
export function textValoare(v: number, virgula: boolean, zecimale = 2): string {
  return scrieCifra(v, { ...formatImplicit(virgula), zecimale });
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

/** Distanța de la `p` la un arc. */
function laArc(p: Punct, a: ArcDesen): number {
  const t = Math.atan2(p.y - a.centru.y, p.x - a.centru.x);
  const rel = (((t - a.de) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (rel <= a.baleiaj) return Math.abs(Math.hypot(p.x - a.centru.x, p.y - a.centru.y) - a.raza);
  const q0 = peArc(a, a.de), q1 = peArc(a, a.de + a.baleiaj);
  return Math.min(Math.hypot(p.x - q0.x, p.y - q0.y), Math.hypot(p.x - q1.x, p.y - q1.y));
}

/**
 * Distanța de la `p` la desenul cotei: la linie (la unghi, la arc), la extensii, la cutia cifrei (0 înăuntru). Alegerea cu
 * clicul o folosește.
 */
export function distantaLaDesen(dc: DesenCota, text: string, p: Punct): number {
  let d = dc.arc ? laArc(p, dc.arc) : laBucata(p, dc.linie);
  for (const e of dc.extensii) d = Math.min(d, laBucata(p, e));
  // Cutia cifrei, în axele ei: de la bază în sus cât înălțimea, cât lățimea de o parte și de alta a mijlocului.
  const r = (dc.text.unghi * Math.PI) / 180, ux = Math.cos(r), uy = Math.sin(r);
  const qx = p.x - dc.text.p.x, qy = p.y - dc.text.p.y;
  const lx = qx * ux + qy * uy, ly = -qx * uy + qy * ux;
  const hw = latimeText(text, dc.text.inaltime) / 2;
  const ex = Math.max(0, Math.abs(lx) - hw), ey = Math.max(0, -ly, ly - dc.text.inaltime);
  return Math.min(d, Math.hypot(ex, ey));
}
