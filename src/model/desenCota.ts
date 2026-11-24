/**
 * Desenul unei cote liniare (ADR 0330 §4, §5), pur, în mm ai foii: linia de cotă, liniile de extensie, capetele și locul
 * cifrei. Pânza îl desenează (felia 10.4↑a-2), exportul îl va scrie (felia c), deci ce se vede e ce se exportă.
 *
 * - Direcția măsurată `u`: orizontala (1, 0), verticala (0, 1), aliniata de la a la b; normala `n` e `u` rotit cu 90° (în sus,
 *   spre stânga, în stânga drumului a → b).
 * - Linia de cotă stă la `d` mm pe normală față de mijlocul celor două puncte (pe normală), deci schimbarea capetelor între
 *   ele, cu `d` cu semnul invers, dă același desen. Picioarele sunt punctele proiectate pe ea.
 * - Liniile de extensie pleacă la `gol` mm de punct și trec cu `depasire` mm de linie; un punct chiar pe linie (sub gol) n-are.
 * - Capetele: triunghiuri pline, lungi de `capat`, late de `capat / 3`, înăuntru; în afară când linia e mai scurtă decât două
 *   capete (și linia se prelungește cu câte două capete).
 * - Cifra: la mijlocul liniei, cu baza la 0,3 × înălțimea deasupra ei, citibilă: unghiul în (−90°, 90°], „deasupra” fiind
 *   stânga direcției de citire.
 */
import type { Punct } from '../geom/conturBaza.ts';
import type { Cota } from './document.ts';

export type FelLiniar = 'orizontala' | 'verticala' | 'aliniata';

/** Stilul desenului, în mm pe foaie. Setările lui vin în fereastra Setări (felia a-3); până atunci, implicitele din ADR 0330 §6. */
export type StilCota = { readonly gol: number; readonly depasire: number; readonly capat: number; readonly inaltime: number };
export const STIL_IMPLICIT: StilCota = { gol: 1, depasire: 2, capat: 2.5, inaltime: 3.5 };

export type Bucata = readonly [Punct, Punct];
export type Capat = readonly [varf: Punct, baza1: Punct, baza2: Punct];

export type DesenCota = {
  readonly picioare: Bucata;
  readonly linie: Bucata;
  readonly extensii: readonly Bucata[];
  readonly capete: readonly Capat[];
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

/** Capătul din piciorul `f`, cu vârful acolo și baza spre `v` (unitar). */
function capat(f: Punct, v: Punct, l: number): Capat {
  const baza = plus(f, v, l), np = { x: -v.y, y: v.x }, w = l / 6;
  return [f, plus(baza, np, w), plus(baza, np, -w)];
}

/** Desenul cotei liniare, sau null (aliniata între două puncte identice). */
export function desenLiniar(fel: FelLiniar, a: Punct, b: Punct, d: number, s: StilCota): DesenCota | null {
  const dir = directii(fel, a, b);
  if (!dir) return null;
  const { u, n } = dir;
  const nivel = (scalar(a, n) + scalar(b, n)) / 2 + d;
  const fa = plus(a, n, nivel - scalar(a, n)), fb = plus(b, n, nivel - scalar(b, n));
  const extensii: Bucata[] = [];
  for (const p of [a, b]) {
    const t = nivel - scalar(p, n);
    if (Math.abs(t) <= s.gol) continue;
    const sg = t >= 0 ? 1 : -1;
    extensii.push([plus(p, n, sg * s.gol), plus(p, n, t + sg * s.depasire)]);
  }
  const lung = Math.hypot(fb.x - fa.x, fb.y - fa.y);
  const w = lung > 1e-12 ? { x: (fb.x - fa.x) / lung, y: (fb.y - fa.y) / lung } : u;
  const minus = { x: -w.x, y: -w.y };
  const inauntru = lung >= 2 * s.capat;
  const capete = inauntru ? [capat(fa, w, s.capat), capat(fb, minus, s.capat)] : [capat(fa, minus, s.capat), capat(fb, w, s.capat)];
  const linie: Bucata = inauntru ? [fa, fb] : [plus(fa, w, -2 * s.capat), plus(fb, w, 2 * s.capat)];
  // Cifra: citibilă (unghiul în (−90°, 90°]), deasupra liniei în sensul citirii.
  let unghi = (Math.atan2(u.y, u.x) * 180) / Math.PI;
  if (unghi > 90 + 1e-9) unghi -= 180;
  else if (unghi <= -90 + 1e-9) unghi += 180;
  const r = (unghi * Math.PI) / 180, sus = { x: -Math.sin(r), y: Math.cos(r) };
  const m = { x: (fa.x + fb.x) / 2, y: (fa.y + fb.y) / 2 };
  return { picioare: [fa, fb], linie, extensii, capete, text: { p: plus(m, sus, 0.3 * s.inaltime), unghi: Math.abs(unghi) < 1e-12 ? 0 : unghi, inaltime: s.inaltime } };
}

/** Valoarea scrisă: rotunjită la `zecimale` (implicit 2), cu zerourile de la coadă tăiate, virgula în română, fără „-0”. */
export function textValoare(v: number, virgula: boolean, zecimale = 2): string {
  const k = 10 ** zecimale;
  const r = Math.round(Math.abs(v) * k) / k;
  let s = r.toFixed(zecimale);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (v < 0 && r !== 0) s = `-${s}`;
  return virgula ? s.replace('.', ',') : s;
}

/** Textul cotei: al ei, cu `<>` pentru valoare (ADR 0330 §5), sau doar valoarea. */
export function textCota(c: Cota, valoare: number, virgula: boolean): string {
  const v = textValoare(valoare, virgula);
  return typeof c.text === 'string' ? c.text.replaceAll('<>', v) : v;
}

/** Distanța de la `p` la bucata [a, b]. */
function laBucata(p: Punct, [a, b]: Bucata): number {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y);
}

/** Lățimea aproximativă a unui text de înălțime `h`: 0,6 h pe semn (cifrele lui Relief SingleLine stau sub ea). */
export const latimeText = (text: string, h: number): number => [...text].length * 0.6 * h;

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
