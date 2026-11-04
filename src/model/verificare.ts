/**
 * Verificarea vectorilor (ADR 0124, felia 10.1↑): ce e în neregulă cu contururile foii, fără să schimbe nimic. Cinci feluri,
 * fiecare cu formele lui (id-urile în lume, ADR 0024) și locul lui (puncte în lume, pe care le arată pânza):
 * - `duplicat`: același contur de mai multe ori, în toleranță; prima formă rămâne, celelalte sunt copii (§2);
 * - `intersectie`: două forme se taie, se ating sau se suprapun (§3);
 * - `autointersectie`: o formă se taie sau se atinge singură, cu bucla mai mică pe care o desparte locul (§4);
 * - `noduri`: noduri prea apropiate, într-o formă (segmente sub toleranță) sau între două forme (§5);
 * - `deschis`: o cale deschisă, cu golul dintre capete (§6).
 * O problemă cu o singură formă e „în aceeași formă”, una cu mai multe e „între forme” (culorile de pe pânză). Copiile unui
 * duplicat nu-și mai spun alte probleme: sunt aceeași formă ca prima. Calculul e al workerului CAM (cererea `verificare`,
 * ADR 0109): foaia poate avea 10⁶ vârfuri.
 */
import { cubicaInArce } from '../geom/biarce.ts';
import { arieCuSemn, cerculArcului, inverseaza, LINIE, numarSegmente, segment, type Contur, type Punct, type Segment, type Varf } from '../geom/contur.ts';
import { cutieContur, type Cutie } from '../geom/cutie.ts';
import { autointersectii, EPS_ATINGERE, indexCutii, intersectiiIntre, parteDin, type Atingere } from '../geom/offset.ts';
import { TOLERANTA_PROIECT } from '../geom/toleranta.ts';
import type { Document } from './document.ts';
import { conturElement } from './forme.ts';
import { elementeFoaie } from './lume.ts';
import { TOLERANTA_MAXIMA, TOLERANTA_MINIMA } from './verificareLimite.ts';

export { TOLERANTA_VERIFICARE } from './verificareLimite.ts';

/** Cele mai multe probleme spuse: peste ele, verificarea se oprește, iar rezultatul spune că lista e tăiată (`oprit`). */
export const PLAFON_PROBLEME = 5_000;
/** Cele mai multe perechi cercetate (de noduri și de forme): peste ele, verificarea se oprește (`oprit`). */
export const PLAFON_PERECHI = 5_000_000;

export type Bucla = {
  /** Aria celei mai mici dintre cele două bucle pe care le desparte locul, în mm² (pe o cale deschisă, a buclei închise). */
  readonly arie: number;
  /** Cât e ea din suma ariilor celor două bucle, în procente; null pe o cale deschisă (n-are arie). */
  readonly procent: number | null;
};

export type Problema =
  /** Locul: centrul cutiei primei forme, care rămâne. */
  | { readonly fel: 'duplicat'; readonly elemente: readonly string[]; readonly puncte: readonly [Punct] }
  /** Un punct (tăietură sau atingere) sau capetele bucății comune (suprapunere). */
  | { readonly fel: 'intersectie'; readonly elemente: readonly [string, string]; readonly puncte: readonly [Punct] | readonly [Punct, Punct] }
  | { readonly fel: 'autointersectie'; readonly elemente: readonly [string]; readonly puncte: readonly [Punct] | readonly [Punct, Punct]; readonly bucla: Bucla | null }
  /** `capete`: ambele noduri sunt capete de căi deschise (o înlănțuire ruptă). */
  | { readonly fel: 'noduri'; readonly elemente: readonly [string] | readonly [string, string]; readonly puncte: readonly [Punct, Punct]; readonly distanta: number; readonly capete: boolean }
  | { readonly fel: 'deschis'; readonly elemente: readonly [string]; readonly puncte: readonly [Punct, Punct]; readonly distanta: number };

export type OptiuniVerificare = {
  /** În mm, între `TOLERANTA_MINIMA` și `TOLERANTA_MAXIMA`. */
  readonly toleranta: number;
  /** Doar formele instanțelor alese (selecția aplicației), cercetate între ele; null: toată foaia. */
  readonly alese: readonly string[] | null;
};

export type RezultatVerificare =
  | {
    readonly ok: true;
    readonly probleme: readonly Problema[];
    /** Câte forme s-au verificat. */
    readonly forme: number;
    /** Formele fără căutarea intersecțiilor: o cubică pe care biarcele n-o prind sub toleranța proiectului. */
    readonly neverificate: number;
    /** Verificarea s-a oprit la un plafon (`PLAFON_PROBLEME`, `PLAFON_PERECHI`): lista e incompletă. */
    readonly oprit: boolean;
  }
  | { readonly ok: false; readonly motiv: 'toleranta' };

/** O formă de verificat: conturul în lume, cutia și conturul pentru cavalier (cubicele ca biarce, fără segmentele nule). */
type Forma = {
  readonly id: string;
  readonly contur: Contur;
  readonly cutie: Cutie;
  readonly lucru: { readonly contur: Contur } | null;
};

type Stare = { perechi: number; oprit: boolean };

const dist = (p: Punct, q: Punct): number => Math.hypot(p.x - q.x, p.y - q.y);

/** Încă o pereche cercetată; peste plafon, verificarea se oprește. */
function pereche(st: Stare): boolean {
  if (st.oprit) return false;
  if (++st.perechi > PLAFON_PERECHI) st.oprit = true;
  return !st.oprit;
}

/** Lungimea segmentului pe curbă; la cubică, a poligonului de control (cel puțin cât curba). */
function lungime(a: Punct, b: Punct, s: Segment): number {
  if (s.tip === 'L') return dist(a, b);
  if (s.tip === 'C') return dist(a, s.c1) + dist(s.c1, s.c2) + dist(s.c2, b);
  const { raza, baleiaj } = cerculArcului(a, b, s.bulge);
  return Number.isFinite(raza) ? raza * Math.abs(baleiaj) : dist(a, b);
}

/** Punctul liniei sau al arcului la fracțiunea t din baleiaj (la linie, din coardă). */
function punctPe(a: Punct, b: Punct, s: Segment, t: number): Punct {
  if (s.tip !== 'A' || Math.abs(s.bulge) < 1e-9) return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
  const u = start + baleiaj * t;
  return { x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) };
}

/**
 * Conturul pentru cavalier (§3): fiecare cubică devine lanțul ei de biarce sub toleranța proiectului (ADR 0033), iar un
 * vârf la mai puțin de `EPS_ATINGERE` de cel dinainte se scoate (cel dinainte îi ia segmentul): un segment nul n-are
 * direcție. Null: n-a rămas nimic de intersectat; 'esuat': o cubică nu încape în biarce. Cu `orig`, primește pentru fiecare
 * segment al rezultatului segmentul conturului din care vine (reparația buclelor, §11).
 */
export function pentruCavalier(c: Contur, orig?: number[]): Contur | null | 'esuat' {
  const m = numarSegmente(c), n = c.varfuri.length;
  const v: Varf[] = [];
  const o: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = c.varfuri[i] as Varf;
    if (x.s.tip !== 'C') { v.push(x); o.push(i); continue; }
    if (i >= m) { v.push({ p: x.p, s: LINIE }); o.push(i); continue; }
    const r = cubicaInArce(x.p, x.s.c1, x.s.c2, (c.varfuri[(i + 1) % n] as Varf).p, TOLERANTA_PROIECT);
    if (!r.ok) return 'esuat';
    for (const y of r.varfuri) { v.push(y); o.push(i); }
  }
  const w: Varf[] = [];
  const wo: number[] = [];
  v.forEach((x, k) => {
    const ultim = w[w.length - 1];
    if (ultim && dist(ultim.p, x.p) < EPS_ATINGERE) { w[w.length - 1] = { p: ultim.p, s: x.s }; wo[wo.length - 1] = o[k] as number; }
    else { w.push(x); wo.push(o[k] as number); }
  });
  while (c.inchis && w.length > 1 && dist((w[w.length - 1] as Varf).p, (w[0] as Varf).p) < EPS_ATINGERE) { w.pop(); wo.pop(); }
  if (w.length < 2) return null;
  if (orig) for (const x of wo) orig.push(x);
  return { inchis: c.inchis, varfuri: w };
}

/**
 * Forma canonică a duplicatelor (§2): un vârf la capătul unui segment de cel mult `tol` (pe curbă), la cel mult `tol` de
 * ultimul vârf păstrat, se scoate, iar cel păstrat îi ia segmentul. Două copii ale aceluiași contur, una cu un nod dublat,
 * ajung la aceleași vârfuri.
 */
function canonic(c: Contur, tol: number): Contur {
  const w: Varf[] = [];
  for (let k = 0; k < c.varfuri.length; k++) {
    const x = c.varfuri[k] as Varf, prev = c.varfuri[k - 1], ultim = w[w.length - 1];
    if (ultim && prev && lungime(prev.p, x.p, prev.s) <= tol && dist(ultim.p, x.p) <= tol) w[w.length - 1] = { p: ultim.p, s: x.s };
    else w.push(x);
  }
  while (c.inchis && w.length > 1) {
    const u = w[w.length - 1] as Varf, f = w[0] as Varf;
    if (lungime(u.p, f.p, u.s) > tol || dist(u.p, f.p) > tol) break;
    w.pop();
  }
  return { inchis: c.inchis, varfuri: w };
}

/** Vârfurile lui b, pornite din `s`, cad pe ale lui a, iar segmentele lor (linia și arcul la ¼, ½, ¾; cubica pe mânere) la fel. */
function aliniate(a: Contur, b: Contur, s: number, tol: number): boolean {
  const n = a.varfuri.length;
  for (let k = 0; k < n; k++) if (dist((a.varfuri[k] as Varf).p, (b.varfuri[(k + s) % n] as Varf).p) > tol) return false;
  for (let k = 0; k < numarSegmente(a); k++) {
    const x = segment(a, k), y = segment(b, (k + s) % n);
    if ((x.s.tip === 'C') !== (y.s.tip === 'C')) return false;
    if (x.s.tip === 'C' && y.s.tip === 'C') {
      if (dist(x.s.c1, y.s.c1) > tol || dist(x.s.c2, y.s.c2) > tol) return false;
      continue;
    }
    for (const t of [0.25, 0.5, 0.75]) if (dist(punctPe(x.a, x.b, x.s, t), punctPe(y.a, y.b, y.s, t)) > tol) return false;
  }
  return true;
}

/** Același contur, în toleranță: același număr de vârfuri canonice, cu orice start (închis) și în oricare sens. */
function laFel(a: Contur, b: Contur, tol: number): boolean {
  const n = a.varfuri.length;
  if (a.inchis !== b.inchis || n !== b.varfuri.length || n === 0) return false;
  for (const c of [b, inverseaza(b)]) {
    for (let s = 0; s < (a.inchis ? n : 1); s++) if (aliniate(a, c, s, tol)) return true;
  }
  return false;
}

/** Grupurile de duplicate (§2), fiecare în ordinea foii: candidații au cutiile la cel mult `tol`, apoi forma canonică decide. */
function duplicate(forme: readonly Forma[], tol: number, st: Stare): number[][] {
  const index = indexCutii(forme.map((f) => ({ minX: f.cutie.minX, minY: f.cutie.minY, maxX: f.cutie.minX, maxY: f.cutie.minY })));
  const parinte = forme.map((_, k) => k);
  const radacina = (k: number): number => {
    let r = k;
    while (parinte[r] !== r) r = parinte[r] as number;
    return r;
  };
  const canonice = new Map<number, Contur>();
  const canon = (k: number): Contur => {
    let c = canonice.get(k);
    if (!c) { c = canonic((forme[k] as Forma).contur, tol); canonice.set(k, c); }
    return c;
  };
  for (let i = 0; i < forme.length && !st.oprit; i++) {
    const a = (forme[i] as Forma).cutie;
    index.vizita({ minX: a.minX - tol, minY: a.minY - tol, maxX: a.minX + tol, maxY: a.minY + tol }, (j) => {
      if (j <= i || !pereche(st)) return;
      const b = (forme[j] as Forma).cutie;
      if (Math.abs(a.minX - b.minX) > tol || Math.abs(a.minY - b.minY) > tol || Math.abs(a.maxX - b.maxX) > tol || Math.abs(a.maxY - b.maxY) > tol) return;
      const ri = radacina(i), rj = radacina(j);
      if (ri !== rj && laFel(canon(i), canon(j), tol)) parinte[Math.max(ri, rj)] = Math.min(ri, rj);
    });
  }
  const grupuri = new Map<number, number[]>();
  forme.forEach((_, k) => { const r = radacina(k); grupuri.set(r, [...(grupuri.get(r) ?? []), k]); });
  return [...grupuri.values()].filter((g) => g.length > 1);
}

/**
 * Șirurile de segmente de cel mult `tol` (pe curbă) ale conturului (§5): fiecare de la vârful `a` la vârful `b` (segmentele
 * a … b − 1; pe un contur închis, indicii trec de capătul listei și se citesc modulo numărul vârfurilor). 'praf': tot
 * conturul e sub toleranță.
 */
export function siruriMici(c: Contur, tol: number): Array<{ readonly a: number; readonly b: number }> | 'praf' {
  const m = numarSegmente(c);
  const mic = Array.from({ length: m }, (_, k) => { const s = segment(c, k); return lungime(s.a, s.b, s.s) <= tol; });
  if (!mic.includes(true)) return [];
  if (!mic.includes(false)) return 'praf';
  // Pe un contur închis, șirurile pornesc după un segment care nu e mic, ca unul să nu fie rupt de capătul listei.
  const start = c.inchis ? mic.indexOf(false) + 1 : 0;
  const rez: Array<{ a: number; b: number }> = [];
  let inceput: number | null = null;
  for (let q = start; q < start + m; q++) {
    const k = q % m;
    if (mic[k] && inceput === null) inceput = q;
    if (!mic[k] && inceput !== null) { rez.push({ a: inceput, b: q }); inceput = null; }
  }
  if (inceput !== null) rez.push({ a: inceput, b: start + m });
  return rez;
}

/** Segmentele de cel mult `tol` (pe curbă) ale conturului, unite pe șiruri consecutive: capetele fiecărui șir (§5). */
function noduriInForma(c: Contur, tol: number): Array<readonly [Punct, Punct]> {
  const n = c.varfuri.length;
  const p = (k: number): Punct => (c.varfuri[k % n] as Varf).p;
  const siruri = siruriMici(c, tol);
  if (siruri === 'praf') {
    // Tot conturul e sub toleranță (praf): un singur loc, de la primul vârf la cel mai depărtat de el.
    let departe = p(0);
    for (const v of c.varfuri) if (dist(v.p, p(0)) > dist(departe, p(0))) departe = v.p;
    return [[p(0), departe]];
  }
  return siruri.map(({ a, b }) => [p(a), p(b)] as const);
}

type PerecheNoduri = { readonly a: Punct; readonly b: Punct; readonly d: number; readonly capete: boolean };

/**
 * Nodurile prea apropiate dintre forme diferite (§5): toate vârfurile, ordonate pe x, cu fereastra `tol`; fiecare pereche
 * de forme își strânge perechile, cea mai apropiată întâi, una pe loc (mijloacele la peste `tol` una de alta).
 */
function noduriIntre(forme: readonly Forma[], activ: (k: number) => boolean, tol: number, st: Stare): Map<string, PerecheNoduri[]> {
  const xs: number[] = [], ys: number[] = [], al: number[] = [], capat: boolean[] = [];
  forme.forEach((f, k) => {
    if (!activ(k)) return;
    const n = f.contur.varfuri.length;
    f.contur.varfuri.forEach((v, q) => { xs.push(v.p.x); ys.push(v.p.y); al.push(k); capat.push(!f.contur.inchis && (q === 0 || q === n - 1)); });
  });
  const ord = Array.from(xs, (_, k) => k).sort((u, v) => (xs[u] as number) - (xs[v] as number));
  const gasite = new Map<string, PerecheNoduri[]>();
  for (let a = 0; a < ord.length && !st.oprit; a++) {
    const i = ord[a] as number;
    for (let b = a + 1; b < ord.length; b++) {
      const j = ord[b] as number;
      if ((xs[j] as number) - (xs[i] as number) > tol || !pereche(st)) break;
      if (al[i] === al[j] || Math.abs((ys[j] as number) - (ys[i] as number)) > tol) continue;
      const d = Math.hypot((xs[j] as number) - (xs[i] as number), (ys[j] as number) - (ys[i] as number));
      if (d > tol) continue;
      const [u, v] = (al[i] as number) < (al[j] as number) ? [i, j] : [j, i];
      const cheie = `${al[u]},${al[v]}`;
      gasite.set(cheie, [...(gasite.get(cheie) ?? []), {
        a: { x: xs[u] as number, y: ys[u] as number }, b: { x: xs[v] as number, y: ys[v] as number }, d, capete: (capat[u] && capat[v]) === true,
      }]);
    }
  }
  for (const [cheie, perechi] of gasite) {
    const pastrate: PerecheNoduri[] = [];
    for (const x of [...perechi].sort((u, v) => u.d - v.d)) {
      const m = { x: (x.a.x + x.b.x) / 2, y: (x.a.y + x.b.y) / 2 };
      if (pastrate.every((y) => dist(m, { x: (y.a.x + y.b.x) / 2, y: (y.a.y + y.b.y) / 2 }) > tol)) pastrate.push(x);
    }
    gasite.set(cheie, pastrate);
  }
  return gasite;
}

/** Distanța de la p la segmentul drept dintre a și b (capetele unei suprapuneri). */
function laCoarda(p: Punct, a: Punct, b: Punct): number {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export type Loc = { readonly puncte: readonly [Punct] | readonly [Punct, Punct]; readonly at: Atingere };

/**
 * Locurile distincte ale unor atingeri (§3, §4): suprapunerile, unite capăt la capăt (o latură comună tăiată de un vârf e o
 * singură suprapunere); apoi punctele care nu cad, la `tol`, lângă un punct păstrat (o tăietură printr-un vârf poate fi
 * spusă de ambele segmente ale vârfului). Un punct la capătul unei suprapuneri nu vine de la cavalier (măsurat, ADR 0124 §3).
 */
export function locuri(at: readonly Atingere[], tol: number): Loc[] {
  const supra: Array<{ a: Punct; b: Punct; at: Atingere }> = at.filter((x) => x.puncte.length === 2).map((x) => ({ a: x.puncte[0], b: x.puncte[1] as Punct, at: x }));
  for (let unit = true; unit;) {
    unit = false;
    for (let i = 0; i < supra.length && !unit; i++) {
      for (let j = i + 1; j < supra.length && !unit; j++) {
        const u = supra[i] as (typeof supra)[number], v = supra[j] as (typeof supra)[number];
        const capete = dist(u.b, v.a) <= tol ? [u.a, v.b] : dist(u.b, v.b) <= tol ? [u.a, v.a] : dist(u.a, v.a) <= tol ? [u.b, v.b] : dist(u.a, v.b) <= tol ? [u.b, v.a] : null;
        if (capete) { supra[i] = { a: capete[0] as Punct, b: capete[1] as Punct, at: u.at }; supra.splice(j, 1); unit = true; }
      }
    }
  }
  const rez: Loc[] = supra.map((s) => ({ puncte: [s.a, s.b], at: s.at }));
  for (const x of at) {
    if (x.puncte.length !== 1) continue;
    const p = x.puncte[0];
    if (rez.some((l) => l.puncte.length === 1 && dist(l.puncte[0], p) <= tol)) continue;
    rez.push({ puncte: [p], at: x });
  }
  return rez;
}

/**
 * Bucla unei autointersecții (§4) în X, între segmentele i și j ale conturului (fără cubice): de la X, pe segmentele dintre
 * ele, înapoi în X; cealaltă buclă a unui contur închis are aria întregului minus a ei (ariile cu semn se adună). Se spune
 * cea mai mică, cu procentul ei din suma celor două.
 */
export function buclaLa(c: Contur, i: number, j: number, X: Punct): Bucla | null {
  if (i === j) return null;
  const a = Math.min(i, j), b = Math.max(i, j);
  const sa = segment(c, a), sb = segment(c, b);
  const varfuri: Varf[] = [{ p: X, s: parteDin(sa.a, sa.b, sa.s, X, false) }];
  for (let k = a + 1; k <= b; k++) {
    const v = c.varfuri[k] as Varf;
    varfuri.push(k === b ? { p: v.p, s: parteDin(sb.a, sb.b, sb.s, X, true) } : v);
  }
  const inauntru = arieCuSemn({ inchis: true, varfuri });
  if (!c.inchis) return { arie: Math.abs(inauntru), procent: null };
  const afara = arieCuSemn(c) - inauntru;
  const mica = Math.min(Math.abs(inauntru), Math.abs(afara)), suma = Math.abs(inauntru) + Math.abs(afara);
  return { arie: mica, procent: suma > 0 ? (100 * mica) / suma : null };
}

/** Verifică formele foii (sau doar cele alese, între ele), fără să schimbe documentul. */
export function verificaVectorii(doc: Document, o: OptiuniVerificare, indexFoaie = 0): RezultatVerificare {
  const tol = o.toleranta;
  if (!(tol >= TOLERANTA_MINIMA && tol <= TOLERANTA_MAXIMA)) return { ok: false, motiv: 'toleranta' };
  const alese = o.alese ? new Set(o.alese) : null;
  const forme: Forma[] = [];
  let neverificate = 0;
  for (const e of elementeFoaie(doc, indexFoaie)) {
    if (alese && !alese.has(e.instanta)) continue;
    let contur: Contur;
    try {
      contur = conturElement(e);
    } catch {
      // Un arc printr-o matrice neuniformă (ușa documentului nu-l primește): fără geometrie de verificat.
      neverificate++;
      continue;
    }
    if (contur.varfuri.length === 0) continue;
    const lucru = pentruCavalier(contur);
    if (lucru === 'esuat') neverificate++;
    forme.push({ id: e.idLume, contur, cutie: cutieContur(contur), lucru: lucru === null || lucru === 'esuat' ? null : { contur: lucru } });
  }
  const st: Stare = { perechi: 0, oprit: false };
  const id = (k: number): string => (forme[k] as Forma).id;

  // §2 Duplicatele: copiile ies din restul verificării.
  const grupuri = duplicate(forme, tol, st);
  const copii = new Set(grupuri.flatMap((g) => g.slice(1)));
  const activ = (k: number): boolean => !copii.has(k);
  const dup: Problema[] = grupuri.map((g) => {
    const c = (forme[g[0] as number] as Forma).cutie;
    return { fel: 'duplicat', elemente: g.map(id), puncte: [{ x: (c.minX + c.maxX) / 2, y: (c.minY + c.maxY) / 2 }] };
  });

  // §5 Nodurile din aceeași formă și dintre forme.
  const inForma = new Map<number, Array<readonly [Punct, Punct]>>();
  forme.forEach((f, k) => { if (activ(k)) inForma.set(k, noduriInForma(f.contur, tol)); });
  const intre = noduriIntre(forme, activ, tol, st);

  // §3 Intersecțiile dintre forme: perechile cu cutiile atinse, apoi cavalier.
  const index = indexCutii(forme.map((f) => f.cutie));
  const atinse = new Map<string, Loc[]>();
  forme.forEach((f, i) => {
    if (!activ(i) || !f.lucru || st.oprit) return;
    const ci = f.lucru.contur;
    index.vizita(f.cutie, (j) => {
      const g = forme[j];
      if (j <= i || !activ(j) || !g?.lucru || !pereche(st)) return;
      const l = locuri(intersectiiIntre(ci, g.lucru.contur), tol);
      if (l.length > 0) atinse.set(`${i},${j}`, l);
    });
  });
  // O tăietură la capetele apropiate a două căi deschise e înlănțuirea lor (§5): rămân nodurile. Altfel, perechea de noduri
  // de lângă o atingere e chiar atingerea: rămâne intersecția.
  const inter: Problema[] = [];
  const nodIntre: Problema[] = [];
  const chei = new Set([...atinse.keys(), ...intre.keys()]);
  for (const cheie of [...chei].sort((u, v) => compara(u, v))) {
    const [i, j] = cheie.split(',').map(Number) as [number, number];
    const perechi = intre.get(cheie) ?? [], loc = atinse.get(cheie) ?? [];
    const langa = (p: Punct, l: Loc): boolean => (l.puncte.length === 1 ? dist(p, l.puncte[0]) <= tol : laCoarda(p, l.puncte[0], l.puncte[1]) <= tol);
    const ramase = loc.filter((l) => l.puncte.length === 2 || !perechi.some((q) => q.capete && (langa(q.a, l) || langa(q.b, l))));
    for (const l of ramase) inter.push({ fel: 'intersectie', elemente: [id(i), id(j)], puncte: l.puncte });
    for (const q of perechi) {
      if (!q.capete && ramase.some((l) => langa(q.a, l) || langa(q.b, l))) continue;
      nodIntre.push({ fel: 'noduri', elemente: [id(i), id(j)], puncte: [q.a, q.b], distanta: q.d, capete: q.capete });
    }
  }

  // §4 Autointersecțiile și §6 căile deschise; locurile de lângă nodurile prea apropiate ale formei sau de lângă capetele
  // unei căi aproape închise sunt ale acelora.
  const auto: Problema[] = [];
  const nodForma: Problema[] = [];
  const deschise: Problema[] = [];
  forme.forEach((f, k) => {
    if (!activ(k)) return;
    const runde = inForma.get(k) ?? [];
    for (const [a, b] of runde) nodForma.push({ fel: 'noduri', elemente: [f.id], puncte: [a, b], distanta: dist(a, b), capete: false });
    const p0 = (f.contur.varfuri[0] as Varf).p, pn = (f.contur.varfuri[f.contur.varfuri.length - 1] as Varf).p;
    const gol = f.contur.inchis ? Infinity : dist(p0, pn);
    if (!f.contur.inchis) deschise.push({ fel: 'deschis', elemente: [f.id], puncte: [p0, pn], distanta: gol });
    if (!f.lucru || !pereche(st)) return;
    const lucru = f.lucru.contur;
    const ocupat = (p: Punct): boolean => runde.some(([a, b]) => dist(p, a) <= tol || dist(p, b) <= tol) || (gol <= tol && (dist(p, p0) <= tol || dist(p, pn) <= tol));
    for (const l of locuri(autointersectii(lucru), tol)) {
      if (l.puncte.every(ocupat)) continue;
      auto.push({ fel: 'autointersectie', elemente: [f.id], puncte: l.puncte, bucla: l.puncte.length === 1 ? buclaLa(lucru, l.at.i, l.at.j, l.puncte[0]) : null });
    }
  });

  const probleme = [...dup, ...inter, ...auto, ...nodIntre, ...nodForma, ...deschise];
  const oprit = st.oprit || probleme.length > PLAFON_PROBLEME;
  return { ok: true, probleme: probleme.slice(0, PLAFON_PROBLEME), forme: forme.length, neverificate, oprit };
}

/** Ordinea perechilor de forme: după prima, apoi după a doua (ordinea foii). */
function compara(u: string, v: string): number {
  const [a, b] = u.split(',').map(Number) as [number, number], [c, d] = v.split(',').map(Number) as [number, number];
  return a - c || b - d;
}
