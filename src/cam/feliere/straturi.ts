/**
 * Geometria straturilor unei piese plate (ADR 0191 §A): piesa e o prismă, deci un strat diferă de altul doar prin rol. Se
 * calculează o dată fiecare fel de strat folosit (primul, plin la 45° sau 135°, suprafața de sus la 45° sau 135°, umplerea
 * rară), ca un șablon: căile în ordinea imprimării, insulă cu insulă, ca OrcaSlicer (pereții interiori, cel exterior, apoi
 * umplerea).
 *
 * - Pereții: inele spre interior (`offsetFigura`, pe contururile cu arce), la pasul liniilor (`pas`): primul la w/2 de
 *   margine, al doilea la (pasul exterior + pasul interior) / 2 după el, restul la pasul interior. Pe primul strat, toate cu
 *   lățimea primului strat, plus compensarea „piciorului de elefant”.
 * - Umplerea: linii paralele aliniate la pat (aceleași poziții pe fiecare strat și în fiecare insulă), tăiate par-impar de
 *   regiunea dinăuntrul pereților (lărgită peste ei cu suprapunerea), legate în lanțuri în zigzag; o legătură scurtă (cel mult
 *   un pas de-a lungul) se extrudă, altfel deplasare. Grila: ambele direcții, la 2·w / densitate.
 * - O cusătură aliniată: fiecare buclă începe în punctul ei cel mai din spate (y cel mai mare, apoi x cel mai mic).
 */
import { cerculArcului, numarSegmente, segment, type Contur } from '../../geom/conturBaza.ts';
import { arieCuSemn } from '../../geom/contur.ts';
import { inRegiune } from '../../geom/distanta.ts';
import { offsetFigura, type Regiune } from '../../geom/offset.ts';
import { pas, type SetariFeliere } from './profil.ts';

export type Rol = 'exterior' | 'interior' | 'plin' | 'sus' | 'rar' | 'brim';
/** O cale de extrudat: punctele (x, y, x, y, …), închisă sau nu, cu lățimea liniei și rolul. */
export type Cale = { readonly rol: Rol; readonly p: Float64Array; readonly inchisa: boolean; readonly w: number };
export type FelStrat = 'prim' | 'plin45' | 'plin135' | 'sus45' | 'sus135' | 'rar';

/** Săgeata coardelor cu care se aplatizează arcele (mm): rezoluția profilului K1C (0,012). */
export const SAGEATA = 0.012;
/** Sub atâta arie (mm²), umplerea rară a unei insule devine plină (`minimum_sparse_infill_area`). */
export const ARIE_MINIMA_RARA = 15;

/** Punctele unui contur închis, aplatizat (fără punctul de închidere repetat). */
export function puncte(c: Contur): number[] {
  const r: number[] = [];
  const n = numarSegmente(c);
  for (let i = 0; i < n; i++) {
    const { a, b, s } = segment(c, i);
    if (i === 0) r.push(a.x, a.y);
    if (s.tip === 'A') {
      const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
      const pasU = raza > SAGEATA ? 2 * Math.acos(1 - SAGEATA / raza) : Math.PI / 2;
      const k = Math.max(1, Math.ceil(Math.abs(baleiaj) / pasU));
      for (let j = 1; j < k; j++) { const u = start + (baleiaj * j) / k; r.push(centru.x + raza * Math.cos(u), centru.y + raza * Math.sin(u)); }
    }
    if (!(c.inchis && i === n - 1)) r.push(b.x, b.y);
  }
  return r;
}

/** Aria (cu semn) a unui poligon dat prin puncte. */
export function arie(p: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0, n = p.length; i < n; i += 2) { const j = (i + 2) % n; s += p[i]! * p[j + 1]! - p[j]! * p[i + 1]!; }
  return s / 2;
}

/** O buclă închisă, începută în punctul ei cel mai din spate (cusătura aliniată). */
function cusatura(p: number[]): Float64Array {
  let k = 0;
  for (let i = 2; i < p.length; i += 2) if (p[i + 1]! > p[k + 1]! + 1e-9 || (Math.abs(p[i + 1]! - p[k + 1]!) <= 1e-9 && p[i]! < p[k]!)) k = i;
  return Float64Array.from([...p.slice(k), ...p.slice(0, k)]);
}

/** Regiunile la distanța `d` spre interior (`d` < 0: spre exterior), sau [] dacă nu mai încape nimic, sau motivul. */
function laDistanta(c: readonly Contur[], d: number): Regiune[] | string {
  if (c.length === 0) return [];
  const r = offsetFigura(c, -d);
  if (r.ok) return [...r.regiuni];
  return r.motiv.startsWith('scula nu încape') ? [] : r.motiv;
}

const contururiDin = (r: readonly Regiune[]): Contur[] => r.flatMap((x) => [x.exterior, ...x.gauri]);

/** Liniile paralele (unghiul în grade, pasul s) ale poligoanelor (par-impar), pe pozițiile aliniate la pat: intervalele pe linie. */
export function intervale(pol: readonly ArrayLike<number>[], unghi: number, s: number): Map<number, [number, number][]> {
  const u = (unghi * Math.PI) / 180, co = Math.cos(u), si = Math.sin(u);
  const rot = pol.map((p) => { const q = new Float64Array(p.length); for (let i = 0; i < p.length; i += 2) { q[i] = p[i]! * co + p[i + 1]! * si; q[i + 1] = -p[i]! * si + p[i + 1]! * co; } return q; });
  let y0 = Infinity, y1 = -Infinity;
  for (const q of rot) for (let i = 1; i < q.length; i += 2) { y0 = Math.min(y0, q[i]!); y1 = Math.max(y1, q[i]!); }
  const rez = new Map<number, [number, number][]>();
  for (let k = Math.ceil(y0 / s - 0.5); (k + 0.5) * s < y1; k++) {
    const y = (k + 0.5) * s, xs: number[] = [];
    for (const q of rot) {
      for (let i = 0, n = q.length; i < n; i += 2) {
        const j = (i + 2) % n, ya = q[i + 1]!, yb = q[j + 1]!;
        if ((ya > y) !== (yb > y)) xs.push(q[i]! + ((y - ya) * (q[j]! - q[i]!)) / (yb - ya));
      }
    }
    xs.sort((a, b) => a - b);
    const l: [number, number][] = [];
    for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1]! - xs[i]! > 1e-6) l.push([xs[i]!, xs[i + 1]!]);
    if (l.length > 0) rez.set(k, l);
  }
  return rez;
}

/**
 * Lanțurile în zigzag ale intervalelor: pe linii consecutive, intervalele care se suprapun se leagă; o legătură se extrudă
 * dacă e scurtă (|Δx| ≤ legaturaMax, în reperul liniilor), altfel lanțul se rupe. Căile, în coordonatele patului.
 */
export function zigzag(iv: Map<number, [number, number][]>, unghi: number, s: number, legaturaMax: number, rol: Rol, w: number): Cale[] {
  const u = (unghi * Math.PI) / 180, co = Math.cos(u), si = Math.sin(u);
  type Lant = { k: number; a: number; b: number; pts: number[]; dreapta: boolean };
  const deschise: Lant[] = [], gata: number[][] = [];
  const pune = (l: Lant, x: number, k: number): void => { const y = (k + 0.5) * s; l.pts.push(x * co - y * si, x * si + y * co); };
  const chei = [...iv.keys()].sort((a, b) => a - b);
  for (const k of chei) {
    const folosite = new Set<Lant>();
    for (const [a, b] of iv.get(k)!) {
      const l = deschise.find((x) => !folosite.has(x) && x.k === k - 1 && x.a < b && a < x.b);
      if (l) {
        const capat = l.dreapta ? l.b : l.a, start = l.dreapta ? b : a;
        if (Math.abs(start - capat) > legaturaMax) { gata.push(l.pts); l.pts = []; }
        l.dreapta = !l.dreapta;
        pune(l, l.dreapta ? a : b, k);
        pune(l, l.dreapta ? b : a, k);
        l.k = k; l.a = a; l.b = b;
        folosite.add(l);
      } else {
        const n: Lant = { k, a, b, pts: [], dreapta: true };
        pune(n, a, k); pune(n, b, k);
        deschise.push(n);
        folosite.add(n);
      }
    }
    for (let i = deschise.length - 1; i >= 0; i--) if (deschise[i]!.k !== k) { gata.push(deschise[i]!.pts); deschise.splice(i, 1); }
  }
  for (const l of deschise) gata.push(l.pts);
  return gata.filter((p) => p.length >= 4).map((p) => ({ rol, p: Float64Array.from(p), inchisa: false, w }));
}

/** Ordinea căilor: cea mai apropiată de poziția curentă, întoarsă dacă celălalt capăt e mai aproape (buclele, doar ordonate). */
export function ordoneaza(cai: readonly Cale[], x: number, y: number): { cai: Cale[]; x: number; y: number } {
  const rest = [...cai], rez: Cale[] = [];
  while (rest.length > 0) {
    let best = 0, bd = Infinity, inv = false;
    rest.forEach((c, i) => {
      const n = c.p.length;
      const d0 = (c.p[0]! - x) ** 2 + (c.p[1]! - y) ** 2;
      if (d0 < bd) { bd = d0; best = i; inv = false; }
      if (!c.inchisa) { const d1 = (c.p[n - 2]! - x) ** 2 + (c.p[n - 1]! - y) ** 2; if (d1 < bd) { bd = d1; best = i; inv = true; } }
    });
    let c = rest.splice(best, 1)[0]!;
    if (inv) { const q = new Float64Array(c.p.length); for (let i = 0; i < q.length; i += 2) { q[i] = c.p[c.p.length - 2 - i]!; q[i + 1] = c.p[c.p.length - 1 - i]!; } c = { ...c, p: q }; }
    rez.push(c);
    const n = c.p.length;
    [x, y] = c.inchisa ? [c.p[0]!, c.p[1]!] : [c.p[n - 2]!, c.p[n - 1]!];
  }
  return { cai: rez, x, y };
}

/** Șablonul unei piese: căile fiecărui fel de strat, brim-ul, conturul (pentru deplasări și previzualizare) și ce nu iese. */
export type SablonPiesa = {
  readonly fel: ReadonlyMap<FelStrat, readonly Cale[]>;
  readonly brim: readonly Cale[];
  /** Conturul piesei, aplatizat: poligoanele par-impar. */
  readonly contur: readonly Float64Array[];
  /** Aria piesei și cea care nu iese (mai îngustă decât o linie), mm². */
  readonly arie: number; readonly subtire: number;
};

type Insula = { readonly ext: Contur; readonly cont: readonly Contur[] };

/** Insula (regiunea pereților exteriori) care cuprinde punctul, sau -1. */
const insulaLui = (ins: readonly Insula[], p: { x: number; y: number }): number => ins.findIndex((i) => inRegiune(p, i.cont));

/**
 * Șablonul unei piese (contururi închise, care nu se ating, par-impar) pentru felurile date. Sau motivul, dacă geometria
 * refuză (un offset eșuat, nu doar o parte prea subțire).
 */
export function sablonPiesa(contururi: readonly Contur[], s: SetariFeliere, feluri: ReadonlySet<FelStrat>, brim: boolean): SablonPiesa | string {
  const contur = contururi.map((c) => Float64Array.from(puncte(c)));
  // Aria, par-impar: un contur cuprins într-un număr impar de altele e gol.
  let arieTotala = 0;
  contururi.forEach((c, i) => {
    const p = c.varfuri[0]!.p;
    const adancime = contururi.filter((alt, j) => j !== i && inRegiune(p, [alt])).length;
    arieTotala += (adancime % 2 === 0 ? 1 : -1) * Math.abs(arieCuSemn(c));
  });
  const fel = new Map<FelStrat, Cale[]>();
  // Pereții (două variante: primul strat și restul) și regiunile umplerii (după distanță) se calculează o singură dată.
  const memoPereti = new Map<boolean, ReturnType<typeof pereti0>>();
  const pereti = (h: number, prim: boolean): ReturnType<typeof pereti0> => {
    let r = memoPereti.get(prim);
    if (r === undefined) { r = pereti0(h, prim); memoPereti.set(prim, r); }
    return r;
  };
  const memoRegiuni = new Map<string, Regiune[] | string>();
  const regiuniLa = (d: number): Regiune[] | string => {
    const k = d.toFixed(6);
    let r = memoRegiuni.get(k);
    if (r === undefined) { r = laDistanta(contururi, d); memoRegiuni.set(k, r); }
    return r;
  };
  function pereti0(h: number, prim: boolean): { insule: Insula[]; cai: Cale[][]; dInterior: number; wUltim: number } | string {
    const wE = prim ? s.wPrim : s.wExterior, wI = prim ? s.wPrim : s.wInterior, e = prim ? s.piciorElefant : 0;
    const insule: Insula[] = [], cai: Cale[][] = [];
    let d = e + wE / 2, dInterior = e, wUltim = wE;
    for (let k = 0; k < s.pereti; k++) {
      if (k === 1) d += (pas(wE, h) + pas(wI, h)) / 2; else if (k > 1) d += pas(wI, h);
      const r = regiuniLa(d);
      if (typeof r === 'string') return r;
      if (r.length === 0) break;
      dInterior = d + (k === 0 ? wE : wI) / 2; wUltim = k === 0 ? wE : wI;
      if (k === 0) for (const g of r) { insule.push({ ext: g.exterior, cont: [g.exterior, ...g.gauri] }); cai.push([]); }
      for (const g of r) {
        const i = k === 0 ? insule.findIndex((x) => x.ext === g.exterior) : insulaLui(insule, g.exterior.varfuri[0]!.p);
        if (i < 0) continue;
        for (const c of [g.exterior, ...g.gauri]) cai[i]!.unshift({ rol: k === 0 ? 'exterior' : 'interior', p: cusatura(puncte(c)), inchisa: true, w: k === 0 ? wE : wI });
      }
    }
    return { insule, cai, dInterior, wUltim };
  }
  const umplere = (h: number, prim: boolean, w: number, suprapunere: number, unghiuri: readonly number[], rol: Rol, sp: number, rar: boolean): Cale[][] | string => {
    const pr = pereti(h, prim);
    if (typeof pr === 'string') return pr;
    const cai = pr.cai.map((x) => [...x]);
    if (pr.insule.length === 0 || (rar && s.umplere <= 0)) return cai;
    const r = regiuniLa(pr.dInterior - suprapunere * w);
    if (typeof r === 'string') return r;
    for (const g of r) {
      const i = insulaLui(pr.insule, g.exterior.varfuri[0]!.p);
      if (i < 0) continue;
      const pol = [g.exterior, ...g.gauri].map((c) => puncte(c));
      const mica = rar && pol.reduce((a, p) => a + arie(p), 0) < ARIE_MINIMA_RARA;
      const unghiuriAici = mica ? [unghiuri[0]!] : unghiuri, pasAici = mica ? pas(w, h) : sp;
      for (const u of unghiuriAici) {
        const linii = zigzag(intervale(pol, u, pasAici), u, pasAici, rar && !mica ? 0 : pasAici, mica ? 'plin' : rol, w);
        cai[i]!.push(...ordoneaza(linii, linii[0]?.p[0] ?? 0, linii[0]?.p[1] ?? 0).cai);
      }
    }
    return cai;
  };
  const h = s.strat;
  for (const f of feluri) {
    let r: Cale[][] | string;
    if (f === 'prim') r = umplere(s.strat1, true, s.wPrim, s.suprapunerePlin, [45], 'plin', pas(s.wPrim, s.strat1), false);
    else if (f === 'rar') {
      r = s.umplere >= 0.999
        ? umplere(h, false, s.wPlin, s.suprapunerePlin, [45], 'plin', pas(s.wPlin, h), false)
        : umplere(h, false, s.wRar, s.suprapunereRar, [45, 135], 'rar', (2 * s.wRar) / Math.max(s.umplere, 0.01), true);
    } else {
      const sus = f.startsWith('sus'), w = sus ? s.wSus : s.wPlin;
      r = umplere(h, false, w, s.suprapunerePlin, [f.endsWith('135') ? 135 : 45], sus ? 'sus' : 'plin', pas(w, h), false);
    }
    if (typeof r === 'string') return r;
    fel.set(f, r.flat());
  }
  // Brim-ul: bucle spre exterior, doar exterioarele, de la cea mai depărtată spre piesă.
  const caiBrim: Cale[] = [];
  if (brim && s.latimeBrim > 0) {
    const p = pas(s.wPrim, s.strat1), n = Math.max(1, Math.round(s.latimeBrim / p));
    for (let k = n - 1; k >= 0; k--) {
      const r = laDistanta(contururi, -(s.golBrim + s.wPrim / 2 + k * p));
      if (typeof r === 'string') return r;
      for (const g of r) caiBrim.push({ rol: 'brim', p: cusatura(puncte(g.exterior)), inchisa: true, w: s.wPrim });
    }
  }
  // Ce nu iese: regiunea minus deschiderea ei (strânsă cu w/2, apoi lărgită la loc).
  let subtire = 0;
  const strans = laDistanta(contururi, s.wExterior / 2);
  if (typeof strans !== 'string') {
    const larg = strans.length === 0 ? [] : laDistanta(contururiDin(strans), -s.wExterior / 2);
    const ramas = typeof larg === 'string' ? arieTotala : larg.reduce((a, g) => a + Math.abs(arieCuSemn(g.exterior)) - g.gauri.reduce((b, x) => b + Math.abs(arieCuSemn(x)), 0), 0);
    subtire = Math.max(0, arieTotala - ramas);
    if (subtire < Math.max(0.05, 0.002 * arieTotala)) subtire = 0;
  }
  return { fel, brim: caiBrim, contur, arie: arieTotala, subtire };
}
