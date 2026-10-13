/**
 * ORACOLUL normalizării `nonzero` (felia 2.7d, ADR 0036), cu ZERO importuri din `src/`. Geometria e scrisă aici din nou,
 * din textul ADR-ului (și din instrumentul judecății 2.7d, o a patra sesiune care n-a importat nimic din prototipuri):
 * înfășurarea exactă cu semn pe L / A / C, distanța la primitive, blossom-ul (sub-curba exactă de Casteljau), grupurile și
 * toleranța τ. Nu calculează aranjamentul: judecă ieșirea, nu o reface.
 *
 * Ce judecă (`judecaNormalizarea`, pe intrarea dată, regula și rezultatul funcției):
 * - forma rezultatului: `{ ok: true, cai, info }` sau `{ ok: false, motiv }`, cu motivul începând cu unul din codurile §8
 *   (`CODURI_MOTIV`); o excepție e întotdeauna o greșeală (o prinde apelantul);
 * - NESCHIMBAT (§6): `cai === intrare` (același obiect) ⇔ `info.neschimbat`; atunci regiunea intrării sub regulă trebuie să
 *   fie deja cea `evenodd` (nicio sondă, mai departe de τ de frontieră, nu le deosebește) și intrarea nu are muchii
 *   coincidente; invers, hârtia (`asteptat`) poate cere neschimbat. Amendamentul §6 (12.10, K7): „deja evenodd” se judecă
 *   la precizia τ, deci o intrare pe care oracolul o vede deja evenodd (nicio sondă dincolo de τ, nicio muchie coincidentă)
 *   poate ieși schimbată, chiar goală, DOAR cu un martor de proximitate la τ (`martorTau`: un vârf la τ de un segment care
 *   nu-l are drept capăt, sau două segmente nevecine apropiate sub τ, departe de capetele comune, fără să se taie acolo);
 *   fără martor trebuie să fie chiar intrarea;
 * - REGIUNEA (§4): în fiecare sondă mai departe de τ (al grupului ei) de frontiera intrării, umplerea intrării sub regulă =
 *   umplerea ieșirii sub `evenodd`. Sondele: aleatoare în cutia fiecărui grup, de o parte și de alta a fiecărui segment
 *   (intrare și ieșire) la distanțe relative de τ și de întinderea grupului, și pe cercuri în jurul fiecărui vârf
 *   (intrare și ieșire);
 * - UMPLEREA ÎN STÂNGA (§7): pe o ieșire schimbată, înfășurarea cu semn a ieșirii e 0 sau 1 în fiecare sondă (exterioarele
 *   trigonometric, găurile orar, contururile nu se taie și nu se suprapun);
 * - GEOMETRIA SURSEI (§5): fiecare linie pe purtătorul unei linii-sursă; fiecare arc pe cercul unui arc-sursă, cu baleiajul
 *   4·atan(bulge) = unghiul capetelor pe cercul sursei (semnul inclus); fiecare cubică o sub-curbă exactă a unei
 *   cubice-sursă (blossom: cele patru puncte de control); fiecare vârf, un vârf-sursă bit cu bit sau la εv de cel puțin
 *   două primitive-sursă (excepția: mijlocul buclei dintr-o singură cubică, §7);
 * - DISTANȚELE, în ambele sensuri: ieșire → sursă (eșantioane pe fiecare segment al ieșirii, cu maximul rafinat prin
 *   secțiunea de aur) și adevăr → ieșire (punctele frontierei adevărate: o bucată a intrării cu umplerea diferită de o parte
 *   și de alta, sondată curat, trebuie să aibă ieșirea la εd);
 * - TOPOLOGIA (§7): fiecare contur ≥ 2 vârfuri; nicio linie / arc cu capetele egale, nicio cubică cu toate punctele egale;
 *   nicio muchie coincidentă (nici dus-întors, nici ac); niciun contur nu trece de două ori prin același vârf (amendamentul
 *   §7: un ciclu se taie la vârful repetat, frontierele care se ating ies în contururi separate);
 * - INFO: `contururiIntrare`, `contururiIesire`, `grupuri` (§3, cutiile exacte care se ating, tranzitiv), `tau` (§4);
 * - PRAFUL (opțiunea `praf`, doar la ușa SVG: ADR 0037 §11, sub-felia 2.3c-1): un contur al regiunii adevărate cu
 *   diagonala cutiei exacte sub rezoluție lipsește din ieșire. Oracolul nu face aranjamentul întreg: în jurul fiecărei
 *   sonde în dezacord și al fiecărui punct al frontierei adevărate fără ieșire, construiește aranjamentul LOCAL (o
 *   fereastră de 1,25 × rezoluția: primitivele intrării ca polilinii cu eroarea de coardă ≤ 1e-11 mm, tăiate la
 *   încrucișări, fiecare bucată judecată cu înfășurarea EXACTĂ a intrării de o parte și de alta, buclele frontierei
 *   închise cu regula „primul la dreapta”, deci contururile care se ating într-un vârf ies separate, ca la §7). O buclă
 *   închisă în fereastră, cu diagonala sub rezoluție și mai groasă decât τ (2·aria / perimetrul > 2τ), e un contur de praf:
 *   sondele din ea și punctele frontierei de pe ea se scutesc; restul rămâne strict. Un contur păstrat în ieșire cu
 *   diagonala sub rezoluție e o greșeală. `masuri.praf` = contururile de praf găsite (ușa le compară cu `sub-rezolutie`);
 *   `prafAdevarat` le caută pe toate (ferestrele în fiecare încrucișare a intrării: un contur de praf nu poate fi o cale
 *   întreagă a intrării, ușa le-a sărit înainte, deci trece printr-o încrucișare).
 *
 * Toleranțele (pe grup g, cu D = diagonala cutiei exacte și M = cea mai mare |coordonată| a ei):
 * - τ = 1e-10·D + 64·ulp(M) (§4, formula ADR-ului);
 * - εv = 1e-12·D + 64·ulp(M): un vârf rafinat la intersecție stă la εv de ambele primitive (reziduul în double e de ordinul
 *   ulp; judecata 2.7d a măsurat ≤ 2,3e-12 mm la 2 440). Pe un desen de 100 mm la origine εv ≈ 1,4e-10 mm, deci o eroare
 *   cunoscută de 1e-9 mm (ADR: „controale cu o eroare cunoscută de 1e-9 mm”) e prinsă;
 * - εc = 4·εv pentru punctele de control ale sub-curbelor; εd = 4·εv pentru distanțele ieșire ↔ sursă.
 * La ușa SVG (`tolSursa`), sursa e citirea oracolului SVG, deci fiecare primitivă-sursă își adaugă toleranța citirii ei.
 *
 * Alegerile mele unde ADR-ul tace (spuse și în raport):
 * - „cutia” grupului e cutia EXACTĂ (cu extremele arcelor și ale cubicelor), iar „se ating” include atingerea pe margine;
 *   M = cea mai mare |coordonată| a cutiei exacte;
 * - neschimbat se judecă pe toată intrarea (§6 vorbește de „chiar intrarea”); topologia §7 se cere pe orice ieșire
 *   schimbată, întreagă (și pe grupurile care, singure, ar fi rămas neschimbate);
 * - o intrare cu un contur sub 2 vârfuri, un număr nefinit, un tip necunoscut, un arc cu bulge 0 sau capete egale e
 *   „invalidă” (ADR 0034 §2): refuz `intrare` (fosta constatare K1, reparată în aplicație pe 12.10);
 * - `info.tau` poate fi 0 pe o intrare neschimbată (calea rapidă de la §3 nu folosește toleranță).
 */

export type P = { readonly x: number; readonly y: number };
export type SegN = { readonly tip: 'L' } | { readonly tip: 'A'; readonly bulge: number } | { readonly tip: 'C'; readonly c1: P; readonly c2: P };
export type VarfN = { readonly p: P; readonly s: SegN };
export type CaleN = readonly VarfN[];

/** Codurile refuzului (§8), în ordinea din brief. */
export const CODURI_MOTIV = ['intrare', 'toleranta', 'plafon', 'nedecis', 'autoverificare', 'inchidere', 'control', 'sfert', 'topologie', 'interna'] as const;
export type CodMotiv = (typeof CODURI_MOTIV)[number];

export const CONST_N = {
  /** §4: τ = 1e-10 · D + 64 · ulp(M). */
  tauRel: 1e-10,
  tauUlp: 64,
  /** τ ≤ TOLERANTA_IMPORT (§4). */
  tolImport: 1e-6,
  /** Precizia cerută ieșirii (vârfuri, purtători): 1e-12 · D + 64 · ulp(M). */
  epsRel: 1e-12,
  epsUlp: 64,
  /** ADR 0034 §2: raza unui arc ≤ 10 000 mm. */
  razaArc: 10_000,
} as const;

const DOIPI = 2 * Math.PI;

/** ulp(x): distanța de la |x| la următorul double (x = 0: cel mai mic subnormal). */
export function ulp(x: number): number {
  const a = Math.abs(x);
  if (a === 0) return Number.MIN_VALUE;
  if (!Number.isFinite(a)) return Infinity;
  let e = Math.floor(Math.log2(a));
  if (2 ** e > a) e--;
  else if (2 ** (e + 1) <= a) e++;
  return 2 ** Math.max(e - 52, -1074);
}

// ---------------------------------------------------------------------------------------------------------------------
// Primitivele.

export type Prim = {
  readonly tip: 'L' | 'A' | 'C';
  readonly a: P;
  readonly b: P;
  /** Calea și vârful din care pleacă. */
  readonly ci: number;
  readonly vi: number;
  id: number;
  /** Arc: centrul, raza, unghiul de start, baleiajul cu semn, bulge. */
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly a0: number;
  readonly sw: number;
  readonly bulge: number;
  /** Cubica: punctele de control. */
  readonly p1: P;
  readonly p2: P;
  /** Toleranța sursei (la ușa SVG: a citirii); 0 pentru intrarea dată direct. */
  tol: number;
};

const finit = (p: unknown): p is P => typeof p === 'object' && p !== null && Number.isFinite((p as P).x) && Number.isFinite((p as P).y);
const egale = (u: P, v: P): boolean => u.x === v.x && u.y === v.y;

/** Arcul din coardă și bulge (bulge > 0: trigonometric): centrul, raza, unghiul de start, baleiajul. */
export function arcDinBulge(a: P, b: P, bu: number): { cx: number; cy: number; r: number; a0: number; sw: number } {
  const dx = b.x - a.x, dy = b.y - a.y, c = Math.hypot(dx, dy);
  const k = (c * (1 - bu * bu)) / (4 * bu);
  const cx = (a.x + b.x) / 2 - (dy / c) * k, cy = (a.y + b.y) / 2 + (dx / c) * k;
  const r = (c * (1 + bu * bu)) / (4 * Math.abs(bu));
  return { cx, cy, r, a0: Math.atan2(a.y - cy, a.x - cx), sw: 4 * Math.atan(bu) };
}

/** Primitivele unei căi; segmentele nule (linie / arc cu capete egale, cubică cu toate punctele egale) se sar. */
export function primitive(cale: CaleN, ci: number): Prim[] {
  const n = cale.length;
  const out: Prim[] = [];
  for (let i = 0; i < n; i++) {
    const v = cale[i] as VarfN, w = cale[(i + 1) % n] as VarfN;
    const a = v.p, b = w.p, s = v.s;
    const baza = { a, b, ci, vi: i, id: 0, cx: 0, cy: 0, r: 0, a0: 0, sw: 0, bulge: 0, p1: a, p2: b, tol: 0 };
    if (s.tip === 'L') {
      if (egale(a, b)) continue;
      out.push({ ...baza, tip: 'L' });
    } else if (s.tip === 'A') {
      if (egale(a, b)) continue;
      out.push({ ...baza, tip: 'A', bulge: s.bulge, ...arcDinBulge(a, b, s.bulge) });
    } else {
      if (egale(a, b) && egale(s.c1, a) && egale(s.c2, a)) continue;
      out.push({ ...baza, tip: 'C', p1: s.c1, p2: s.c2 });
    }
  }
  return out;
}
export function toatePrimitivele(cai: readonly CaleN[]): Prim[] {
  const r: Prim[] = [];
  cai.forEach((c, ci) => r.push(...primitive(c, ci)));
  r.forEach((s, k) => { s.id = k; });
  return r;
}

export function ev(s: Prim, t: number): P {
  if (t === 0) return s.a;
  if (t === 1) return s.b;
  if (s.tip === 'L') return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
  if (s.tip === 'A') {
    const u = s.a0 + s.sw * t;
    return { x: s.cx + s.r * Math.cos(u), y: s.cy + s.r * Math.sin(u) };
  }
  const m = 1 - t, A = m * m * m, B = 3 * m * m * t, C = 3 * m * t * t, D = t * t * t;
  return { x: A * s.a.x + B * s.p1.x + C * s.p2.x + D * s.b.x, y: A * s.a.y + B * s.p1.y + C * s.p2.y + D * s.b.y };
}
export function d1(s: Prim, t: number): P {
  if (s.tip === 'L') return { x: s.b.x - s.a.x, y: s.b.y - s.a.y };
  if (s.tip === 'A') {
    const u = s.a0 + s.sw * t;
    return { x: -s.r * Math.sin(u) * s.sw, y: s.r * Math.cos(u) * s.sw };
  }
  const m = 1 - t;
  const f = (k: 'x' | 'y'): number => 3 * (m * m * (s.p1[k] - s.a[k]) + 2 * m * t * (s.p2[k] - s.p1[k]) + t * t * (s.b[k] - s.p2[k]));
  return { x: f('x'), y: f('y') };
}

/** Parametrii din (0, 1) unde coordonata k atinge un extrem. */
function extreme(s: Prim, k: 'x' | 'y'): number[] {
  if (s.tip === 'L') return [];
  if (s.tip === 'A') {
    const tinta = k === 'y' ? Math.PI / 2 : 0;
    const r: number[] = [];
    const lo = Math.min(s.a0, s.a0 + s.sw), hi = Math.max(s.a0, s.a0 + s.sw);
    for (let j = Math.ceil((lo - tinta) / Math.PI); tinta + j * Math.PI <= hi; j++) {
      const t = (tinta + j * Math.PI - s.a0) / s.sw;
      if (t > 0 && t < 1) r.push(t);
    }
    return r.sort((x, y) => x - y);
  }
  const a = s.p1[k] - s.a[k], b = s.p2[k] - s.p1[k], c = s.b[k] - s.p2[k];
  const A = a - 2 * b + c, B = 2 * (b - a), C = a;
  const r: number[] = [];
  if (Math.abs(A) < 1e-14 * (Math.abs(a) + Math.abs(b) + Math.abs(c))) {
    if (B !== 0) r.push(-C / B);
  } else {
    const D = B * B - 4 * A * C;
    if (D >= 0) {
      const q = -0.5 * (B + Math.sign(B || 1) * Math.sqrt(D));
      r.push(q / A);
      if (q !== 0) r.push(C / q);
    }
  }
  return r.filter((t) => t > 0 && t < 1).sort((x, y) => x - y);
}

export type Cutie = { x0: number; y0: number; x1: number; y1: number };
export function cutiePrim(s: Prim): Cutie {
  const pts = [s.a, s.b];
  for (const t of [...extreme(s, 'x'), ...extreme(s, 'y')]) pts.push(ev(s, t));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return { x0, y0, x1, y1 };
}
const uneste = (c: Cutie, d: Cutie): Cutie => ({ x0: Math.min(c.x0, d.x0), y0: Math.min(c.y0, d.y0), x1: Math.max(c.x1, d.x1), y1: Math.max(c.y1, d.y1) });
const GOALA: Cutie = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
export const seAting = (c: Cutie, d: Cutie): boolean => c.x0 <= d.x1 && d.x0 <= c.x1 && c.y0 <= d.y1 && d.y0 <= c.y1;

/** Cutia exactă a unei căi (vârfurile ei, chiar și ale segmentelor nule, plus extremele curbelor). */
export function cutieCale(cale: CaleN): Cutie {
  let c = GOALA;
  for (const v of cale) c = uneste(c, { x0: v.p.x, y0: v.p.y, x1: v.p.x, y1: v.p.y });
  for (const s of primitive(cale, 0)) c = uneste(c, cutiePrim(s));
  return c;
}

/** Cutia exactă plus punctele de control ale cubicelor (cealaltă lectură a „cutiei” de la §3–§4). */
export function cutieCaleControl(cale: CaleN): Cutie {
  let c = cutieCale(cale);
  for (const v of cale) if (v.s.tip === 'C') for (const q of [v.s.c1, v.s.c2]) c = uneste(c, { x0: q.x, y0: q.y, x1: q.x, y1: q.y });
  return c;
}

// ---------------------------------------------------------------------------------------------------------------------
// Grupurile (§3) și toleranța (§4).

export type Grup = { readonly cai: number[]; readonly cutie: Cutie; readonly D: number; readonly M: number; readonly tau: number; readonly eps: number };

export function tauDin(c: Cutie): { D: number; M: number; tau: number; eps: number } {
  const D = Math.hypot(c.x1 - c.x0, c.y1 - c.y0);
  const M = Math.max(Math.abs(c.x0), Math.abs(c.x1), Math.abs(c.y0), Math.abs(c.y1));
  return { D, M, tau: CONST_N.tauRel * D + CONST_N.tauUlp * ulp(M), eps: CONST_N.epsRel * D + CONST_N.epsUlp * ulp(M) };
}

/** Grupurile: căile ale căror cutii exacte se ating, tranzitiv (union-find, cu baleiere pe x). */
export function grupuri(cai: readonly CaleN[], cutiiDate?: readonly Cutie[]): Grup[] {
  const cutii = cutiiDate ?? cai.map(cutieCale);
  const n = cutii.length;
  const tata = Array.from({ length: n }, (_, i) => i);
  const rad = (i: number): number => {
    while (tata[i] !== i) { tata[i] = tata[tata[i] as number] as number; i = tata[i] as number; }
    return i;
  };
  const ord = Array.from({ length: n }, (_, i) => i).sort((i, j) => (cutii[i] as Cutie).x0 - (cutii[j] as Cutie).x0);
  const activ: number[] = [];
  for (const i of ord) {
    const c = cutii[i] as Cutie;
    for (let k = activ.length - 1; k >= 0; k--) if ((cutii[activ[k] as number] as Cutie).x1 < c.x0) activ.splice(k, 1);
    for (const j of activ) if (seAting(c, cutii[j] as Cutie)) { const a = rad(i), b = rad(j); if (a !== b) tata[a] = b; }
    activ.push(i);
  }
  const m = new Map<number, number[]>();
  for (let i = 0; i < n; i++) { const r = rad(i); const l = m.get(r) ?? []; l.push(i); m.set(r, l); }
  return [...m.values()].map((l) => {
    const c = l.reduce((acc, i) => uneste(acc, cutii[i] as Cutie), GOALA);
    return { cai: l, cutie: c, ...tauDin(c) };
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Înfășurarea exactă cu semn (raza spre +x), pe bucăți monotone pe y.

type Bucata = { s: Prim; ta: number; tb: number; ya: number; yb: number; ylo: number; yhi: number; xmin: number; xmax: number };
export type IndexInfasurare = { buc: Bucata[]; galeti: Bucata[][]; Y0: number; h: number; nb: number };

export function indexInfasurare(segs: readonly Prim[]): IndexInfasurare {
  const buc: Bucata[] = [];
  let Y0 = Infinity, Y1 = -Infinity;
  for (const s of segs) {
    const ts = [0, ...extreme(s, 'y'), 1];
    const ps = ts.map((t) => ev(s, t));
    const tx = extreme(s, 'x');
    for (let i = 0; i + 1 < ts.length; i++) {
      const pa = ps[i] as P, pb = ps[i + 1] as P;
      if (pa.y === pb.y) continue;
      let xmin = Math.min(pa.x, pb.x), xmax = Math.max(pa.x, pb.x);
      for (const t of tx) if (t > (ts[i] as number) && t < (ts[i + 1] as number)) { const q = ev(s, t); xmin = Math.min(xmin, q.x); xmax = Math.max(xmax, q.x); }
      buc.push({ s, ta: ts[i] as number, tb: ts[i + 1] as number, ya: pa.y, yb: pb.y, ylo: Math.min(pa.y, pb.y), yhi: Math.max(pa.y, pb.y), xmin, xmax });
      Y0 = Math.min(Y0, pa.y, pb.y);
      Y1 = Math.max(Y1, pa.y, pb.y);
    }
  }
  const nb = Math.max(1, Math.min(8192, Math.ceil(Math.sqrt(buc.length) * 4)));
  const h = (Y1 - Y0) / nb || 1;
  const galeti: Bucata[][] = Array.from({ length: nb }, () => []);
  for (const b of buc) {
    const i0 = Math.max(0, Math.min(nb - 1, Math.floor((b.ylo - Y0) / h))), i1 = Math.max(0, Math.min(nb - 1, Math.floor((b.yhi - Y0) / h)));
    for (let i = i0; i <= i1; i++) (galeti[i] as Bucata[]).push(b);
  }
  return { buc, galeti, Y0, h, nb };
}

/** Înfășurarea cu semn în q; `amb`: o traversare la cel mult eta de q (punctul e practic pe frontieră). */
export function infasurare(ix: IndexInfasurare, q: P, eta: number): { w: number; amb: boolean } {
  if (ix.buc.length === 0) return { w: 0, amb: false };
  const i = Math.floor((q.y - ix.Y0) / ix.h);
  if (!(i >= 0 && i < ix.nb)) {
    // Sub sau peste toate bucățile: doar capătul de sus poate fi egal (regula semideschisă îl exclude).
    return { w: 0, amb: false };
  }
  let w = 0, amb = false;
  for (const b of ix.galeti[i] as Bucata[]) {
    if (!(b.ylo <= q.y && q.y < b.yhi)) continue;
    const sus = b.yb > b.ya;
    if (q.x < b.xmin - eta) { w += sus ? 1 : -1; continue; }
    if (q.x > b.xmax + eta) continue;
    if (b.s.tip === 'L') {
      // Linia: traversarea direct (fără bisecție).
      const s = b.s;
      const x = s.a.x + ((q.y - s.a.y) * (s.b.x - s.a.x)) / (s.b.y - s.a.y);
      if (Math.abs(x - q.x) <= eta) amb = true;
      if (x > q.x) w += sus ? 1 : -1;
      continue;
    }
    let lo = b.ta, hi = b.tb;
    for (let k = 0; k < 90; k++) {
      const m = (lo + hi) / 2;
      if (m === lo || m === hi) break;
      const y = ev(b.s, m).y;
      if ((y < q.y) === sus) lo = m;
      else hi = m;
    }
    const x = ev(b.s, (lo + hi) / 2).x;
    if (Math.abs(x - q.x) <= eta) amb = true;
    if (x > q.x) w += sus ? 1 : -1;
  }
  return { w, amb };
}

// ---------------------------------------------------------------------------------------------------------------------
// Distanța punct – primitivă și indexul de distanță.

export type Dist = { d: number; t: number; minime: Array<{ t: number; d: number }> };

export function newtonPolish(s: Prim, q: P, t0: number): { t: number; d: number } {
  let t = t0, p = ev(s, t);
  let bt = t, bd = Math.hypot(p.x - q.x, p.y - q.y);
  for (let i = 0; i < 12; i++) {
    const v = d1(s, t);
    const e = 1e-7;
    const v2 = d1(s, Math.min(1, t + e)), v1 = d1(s, Math.max(0, t - e));
    const dd = { x: (v2.x - v1.x) / (Math.min(1, t + e) - Math.max(0, t - e)), y: (v2.y - v1.y) / (Math.min(1, t + e) - Math.max(0, t - e)) };
    const ex = p.x - q.x, ey = p.y - q.y;
    const f = ex * v.x + ey * v.y, fp = v.x * v.x + v.y * v.y + ex * dd.x + ey * dd.y;
    if (!(fp > 0)) break;
    let tn = t - f / fp;
    tn = Math.max(0, Math.min(1, tn));
    if (tn === t) break;
    t = tn;
    p = ev(s, t);
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < bd) { bd = d; bt = t; }
  }
  return { t: bt, d: bd };
}

export function distSeg(s: Prim, q: P): Dist {
  if (s.tip === 'L') {
    const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y, L2 = dx * dx + dy * dy;
    let t = ((q.x - s.a.x) * dx + (q.y - s.a.y) * dy) / L2;
    t = Math.max(0, Math.min(1, t));
    const p = ev(s, t);
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    return { d, t, minime: [{ t, d }] };
  }
  if (s.tip === 'A') {
    const rx = q.x - s.cx, ry = q.y - s.cy, rr = Math.hypot(rx, ry);
    let rel = s.sw > 0 ? Math.atan2(ry, rx) - s.a0 : s.a0 - Math.atan2(ry, rx);
    rel = ((rel % DOIPI) + DOIPI) % DOIPI;
    const cand: Array<{ t: number; d: number }> = [];
    if (rr > 0 && rel <= Math.abs(s.sw)) cand.push({ d: Math.abs(rr - s.r), t: rel / Math.abs(s.sw) });
    cand.push({ d: Math.hypot(q.x - s.a.x, q.y - s.a.y), t: 0 }, { d: Math.hypot(q.x - s.b.x, q.y - s.b.y), t: 1 });
    cand.sort((u, v) => u.d - v.d);
    const c0 = cand[0] as { t: number; d: number };
    return { d: c0.d, t: c0.t, minime: cand };
  }
  // Cubica: minimele locale ale |B(t) − q| (schimbările de semn ale lui (B − q)·B′ pe 96 de eșantioane, bisecție), plus
  // secțiunea de aur în jurul celui mai bun eșantion, plus capetele; fiecare candidat lustruit cu Newton (pe forma
  // Bernstein). Căutarea folosește baza puterilor relativă la p0 (fără alocări; coordonatele mari se scad întâi).
  const N = 96;
  const ox = s.a.x, oy = s.a.y;
  const cx3 = 3 * (s.p1.x - ox), bx3 = 3 * (s.p2.x - 2 * s.p1.x + ox), ax3 = s.b.x - 3 * s.p2.x + 3 * s.p1.x - ox;
  const cy3 = 3 * (s.p1.y - oy), by3 = 3 * (s.p2.y - 2 * s.p1.y + oy), ay3 = s.b.y - 3 * s.p2.y + 3 * s.p1.y - oy;
  const qx = q.x - ox, qy = q.y - oy;
  const f = (t: number): number => {
    const ex = ((ax3 * t + bx3) * t + cx3) * t - qx, ey = ((ay3 * t + by3) * t + cy3) * t - qy;
    return ex * ((3 * ax3 * t + 2 * bx3) * t + cx3) + ey * ((3 * ay3 * t + 2 * by3) * t + cy3);
  };
  const D = (t: number): number => Math.hypot(((ax3 * t + bx3) * t + cx3) * t - qx, ((ay3 * t + by3) * t + cy3) * t - qy);
  const Dex = (t: number): number => { const p = ev(s, t); return Math.hypot(p.x - q.x, p.y - q.y); };
  const cand: number[] = [0, 1];
  let fp = f(0), best = 0, bd = D(0);
  for (let i = 1; i <= N; i++) {
    const t = i / N, fc = f(t), dc = D(t);
    if (dc < bd) { bd = dc; best = i; }
    if (fp < 0 && fc >= 0) {
      let lo = (i - 1) / N, hi = t;
      for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (m === lo || m === hi) break; if (f(m) < 0) lo = m; else hi = m; }
      cand.push((lo + hi) / 2);
    }
    fp = fc;
  }
  {
    let lo = Math.max(0, (best - 1) / N), hi = Math.min(1, (best + 1) / N);
    const g = (Math.sqrt(5) - 1) / 2;
    let x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo), f1 = D(x1), f2 = D(x2);
    for (let k = 0; k < 60; k++) {
      if (f1 < f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - g * (hi - lo); f1 = D(x1); }
      else { lo = x1; x1 = x2; f1 = f2; x2 = lo + g * (hi - lo); f2 = D(x2); }
    }
    cand.push((lo + hi) / 2);
  }
  const minime: Array<{ t: number; d: number }> = [];
  for (const t of cand) {
    const dt = Dex(t);
    const n = t === 0 || t === 1 ? { t, d: dt } : newtonPolish(s, q, t);
    minime.push(n.d <= dt ? n : { t, d: dt });
  }
  minime.sort((u, v) => u.d - v.d);
  const m0 = minime[0] as { t: number; d: number };
  return { d: m0.d, t: m0.t, minime };
}

export type IndexDistanta = {
  segs: readonly Prim[]; cut: Cutie[]; X0: number; Y0: number; cs: number; nx: number; ny: number;
  cel: Map<number, number[]>; viz: Int32Array; stamp: number;
};

export function indexDistanta(segs: readonly Prim[]): IndexDistanta {
  const cut = segs.map(cutiePrim);
  let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
  for (const c of cut) { X0 = Math.min(X0, c.x0); Y0 = Math.min(Y0, c.y0); X1 = Math.max(X1, c.x1); Y1 = Math.max(Y1, c.y1); }
  const G = Math.max(1, Math.min(1024, Math.ceil(Math.sqrt(segs.length) * 1.5)));
  const W = Math.max(X1 - X0, Y1 - Y0, 1e-300);
  const cs = W / G;
  const nx = Math.min(4096, Math.floor((X1 - X0) / cs) + 1), ny = Math.min(4096, Math.floor((Y1 - Y0) / cs) + 1);
  const cel = new Map<number, number[]>();
  const cl = (v: number, n: number): number => Math.max(0, Math.min(n - 1, v));
  segs.forEach((_, k) => {
    const c = cut[k] as Cutie;
    const i0 = cl(Math.floor((c.x0 - X0) / cs), nx), i1 = cl(Math.floor((c.x1 - X0) / cs), nx);
    const j0 = cl(Math.floor((c.y0 - Y0) / cs), ny), j1 = cl(Math.floor((c.y1 - Y0) / cs), ny);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const key = i * 65536 + j;
      let a = cel.get(key);
      if (a === undefined) { a = []; cel.set(key, a); }
      a.push(k);
    }
  });
  return { segs, cut, X0, Y0, cs, nx, ny, cel, viz: new Int32Array(segs.length), stamp: 0 };
}

/** Cea mai apropiată primitivă (fără cele din `exclus`): { d, k, t }, sau d = Infinity. */
export function celMaiAproape(ix: IndexDistanta, q: P, exclus?: ReadonlySet<number>): { d: number; k: number; t: number } {
  if (ix.segs.length === 0) return { d: Infinity, k: -1, t: 0 };
  const st = ++ix.stamp;
  const ci = Math.max(0, Math.min(ix.nx - 1, Math.floor((q.x - ix.X0) / ix.cs))), cj = Math.max(0, Math.min(ix.ny - 1, Math.floor((q.y - ix.Y0) / ix.cs)));
  let best = { d: Infinity, k: -1, t: 0 };
  for (let r = 0; ; r++) {
    const i0 = ci - r, i1 = ci + r, j0 = cj - r, j1 = cj + r;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      if (i !== i0 && i !== i1 && j !== j0 && j !== j1) continue;
      if (i < 0 || j < 0 || i >= ix.nx || j >= ix.ny) continue;
      const a = ix.cel.get(i * 65536 + j);
      if (a === undefined) continue;
      for (const k of a) {
        if (ix.viz[k] === st) continue;
        ix.viz[k] = st;
        if (exclus !== undefined && exclus.has(k)) continue;
        const c = ix.cut[k] as Cutie;
        const lb = Math.hypot(Math.max(0, c.x0 - q.x, q.x - c.x1), Math.max(0, c.y0 - q.y, q.y - c.y1));
        if (lb >= best.d) continue;
        const r2 = distSeg(ix.segs[k] as Prim, q);
        if (r2.d < best.d) best = { d: r2.d, k, t: r2.t };
      }
    }
    if (i0 <= 0 && j0 <= 0 && i1 >= ix.nx - 1 && j1 >= ix.ny - 1) break;
    const bx0 = ix.X0 + Math.max(0, i0) * ix.cs, bx1 = ix.X0 + Math.min(ix.nx, i1 + 1) * ix.cs;
    const by0 = ix.Y0 + Math.max(0, j0) * ix.cs, by1 = ix.Y0 + Math.min(ix.ny, j1 + 1) * ix.cs;
    const lim = Math.min(i0 <= 0 ? Infinity : q.x - bx0, i1 >= ix.nx - 1 ? Infinity : bx1 - q.x, j0 <= 0 ? Infinity : q.y - by0, j1 >= ix.ny - 1 ? Infinity : by1 - q.y);
    if (best.d <= Math.max(0, lim)) break;
  }
  return best;
}

/** Toate primitivele la cel mult dMax de q, sortate după distanță. */
export function toateAproape(ix: IndexDistanta, q: P, dMax: number): Array<{ k: number; d: number; dist: Dist }> {
  const r: Array<{ k: number; d: number; dist: Dist }> = [];
  if (ix.segs.length === 0) return r;
  const cl = (v: number, n: number): number => Math.max(0, Math.min(n - 1, v));
  const i0 = cl(Math.floor((q.x - dMax - ix.X0) / ix.cs), ix.nx), i1 = cl(Math.floor((q.x + dMax - ix.X0) / ix.cs), ix.nx);
  const j0 = cl(Math.floor((q.y - dMax - ix.Y0) / ix.cs), ix.ny), j1 = cl(Math.floor((q.y + dMax - ix.Y0) / ix.cs), ix.ny);
  const st = ++ix.stamp;
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const a = ix.cel.get(i * 65536 + j);
    if (a === undefined) continue;
    for (const k of a) {
      if (ix.viz[k] === st) continue;
      ix.viz[k] = st;
      const c = ix.cut[k] as Cutie;
      const lb = Math.hypot(Math.max(0, c.x0 - q.x, q.x - c.x1), Math.max(0, c.y0 - q.y, q.y - c.y1));
      if (lb > dMax) continue;
      const dist = distSeg(ix.segs[k] as Prim, q);
      if (dist.d <= dMax) r.push({ k, d: dist.d, dist });
    }
  }
  return r.sort((u, v) => u.d - v.d);
}

// ---------------------------------------------------------------------------------------------------------------------
// Blossom: sub-curba exactă a unei cubice.

export function blossom(s: Prim, u: number, v: number, w: number): P {
  const Q = [s.a, s.p1, s.p2, s.b] as const;
  const l = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const L1 = [l(Q[0], Q[1], u), l(Q[1], Q[2], u), l(Q[2], Q[3], u)] as const;
  const L2 = [l(L1[0], L1[1], v), l(L1[1], L1[2], v)] as const;
  return l(L2[0], L2[1], w);
}
export const subCurba = (s: Prim, t0: number, t1: number): [P, P, P, P] =>
  [blossom(s, t0, t0, t0), blossom(s, t0, t0, t1), blossom(s, t0, t1, t1), blossom(s, t1, t1, t1)];
export const dist = (a: P, b: P): number => Math.hypot(a.x - b.x, a.y - b.y);

// ---------------------------------------------------------------------------------------------------------------------
// Aria cu semn (pentru rapoarte).

export function arieSemn(segs: readonly Prim[]): number {
  let A = 0;
  const G = [[0, 0.5688888888888889], [-0.5384693101056831, 0.4786286704993665], [0.5384693101056831, 0.4786286704993665], [-0.906179845938664, 0.2369268850561891], [0.906179845938664, 0.2369268850561891]] as const;
  for (const s of segs) {
    if (s.tip === 'L') A += (s.a.x * s.b.y - s.b.x * s.a.y) / 2;
    else if (s.tip === 'A') { A += (s.a.x * s.b.y - s.b.x * s.a.y) / 2; A += (s.r * s.r * (s.sw - Math.sin(s.sw))) / 2; }
    else for (const [z, wg] of G) { const t = (z + 1) / 2, p = ev(s, t), v = d1(s, t); A += (wg * 0.5 * (p.x * v.y - p.y * v.x)) / 2; }
  }
  return A;
}

// ---------------------------------------------------------------------------------------------------------------------
// Validarea intrării (ADR 0034 §2, cu ce cere ADR 0036 §1).

/** Problema intrării (o cale sub 2 vârfuri, un număr nefinit, un tip necunoscut, un arc fără cerc), sau null. */
export function problemaIntrare(cai: unknown): string | null {
  if (!Array.isArray(cai)) return 'intrarea nu e listă';
  for (const [ci, c] of cai.entries()) {
    if (!Array.isArray(c)) return `calea ${ci} nu e listă`;
    if (c.length < 2) return `calea ${ci} are ${c.length} vârfuri`;
    for (const [vi, v] of c.entries()) {
      if (typeof v !== 'object' || v === null) return `calea ${ci}, vârful ${vi} nu e obiect`;
      const x = v as { p?: unknown; s?: { tip?: unknown; bulge?: unknown; c1?: unknown; c2?: unknown } };
      if (!finit(x.p)) return `calea ${ci}, vârful ${vi}: p nefinit`;
      const s = x.s;
      if (typeof s !== 'object' || s === null) return `calea ${ci}, vârful ${vi}: s lipsă`;
      if (s.tip === 'L') continue;
      if (s.tip === 'A') {
        if (typeof s.bulge !== 'number' || !Number.isFinite(s.bulge) || s.bulge === 0) return `calea ${ci}, vârful ${vi}: bulge`;
        const w = c[(vi + 1) % c.length] as { p?: unknown };
        if (finit(w?.p) && egale(x.p, w.p)) return `calea ${ci}, vârful ${vi}: arc cu capetele egale`;
        continue;
      }
      if (s.tip === 'C') { if (!finit(s.c1) || !finit(s.c2)) return `calea ${ci}, vârful ${vi}: cubică nefinită`; continue; }
      return `calea ${ci}, vârful ${vi}: tipul ${String(s.tip)}`;
    }
  }
  return null;
}

/** Codul refuzului: primul cuvânt al motivului, dacă e unul din cele zece; altfel null. */
export function codMotiv(motiv: unknown): CodMotiv | null {
  if (typeof motiv !== 'string') return null;
  const m = /^([a-z]+)\b/.exec(motiv);
  return m !== null && (CODURI_MOTIV as readonly string[]).includes(m[1] as string) ? (m[1] as CodMotiv) : null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Muchiile coincidente.

/** Perechile de primitive care au în comun o bucată de lungime pozitivă (cel mult `max` exemple). */
export function muchiiCoincidente(segs: readonly Prim[], epsDe: (s: Prim) => number, max = 5): Array<[number, number]> {
  const ix = indexDistanta(segs);
  const r: Array<[number, number]> = [];
  const peSeg = (s: Prim, q: P, e: number): boolean => distSeg(s, q).d <= e;
  for (const A of segs) {
    const cA = ix.cut[A.id] as Cutie;
    const e0 = epsDe(A);
    // Candidatele: cutiile care se ating (cu marginea e).
    const cand = new Set<number>();
    const cl = (v: number, n: number): number => Math.max(0, Math.min(n - 1, v));
    const i0 = cl(Math.floor((cA.x0 - e0 - ix.X0) / ix.cs), ix.nx), i1 = cl(Math.floor((cA.x1 + e0 - ix.X0) / ix.cs), ix.nx);
    const j0 = cl(Math.floor((cA.y0 - e0 - ix.Y0) / ix.cs), ix.ny), j1 = cl(Math.floor((cA.y1 + e0 - ix.Y0) / ix.cs), ix.ny);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const k of ix.cel.get(i * 65536 + j) ?? []) if (k > A.id) cand.add(k);
    for (const k of cand) {
      const B = segs[k] as Prim;
      const cB = ix.cut[k] as Cutie;
      const e = Math.max(e0, epsDe(B));
      if (!(cA.x0 <= cB.x1 + e && cB.x0 <= cA.x1 + e && cA.y0 <= cB.y1 + e && cB.y0 <= cA.y1 + e)) continue;
      let coincid = false;
      if (A.tip === 'L' && B.tip === 'L') {
        const dx = A.b.x - A.a.x, dy = A.b.y - A.a.y, L = Math.hypot(dx, dy);
        const lat = (p: P): number => Math.abs((p.x - A.a.x) * dy - (p.y - A.a.y) * dx) / L;
        if (lat(B.a) <= e && lat(B.b) <= e) {
          const pr = (p: P): number => ((p.x - A.a.x) * dx + (p.y - A.a.y) * dy) / L;
          const lo = Math.max(0, Math.min(pr(B.a), pr(B.b))), hi = Math.min(L, Math.max(pr(B.a), pr(B.b)));
          coincid = hi - lo > 2 * e;
        }
      } else {
        // O bucată comună mai scurtă de 4e nu contează (e sub precizie, nu o muchie).
        const lung = (X: Prim): number => { let L = 0, p = ev(X, 0); for (let j = 1; j <= 16; j++) { const q = ev(X, j / 16); L += dist(p, q); p = q; } return L; };
        const LA = lung(A), LB = lung(B);
        // Aceleași capete (dus-întors, dubluri scurte): trei puncte interioare ale lui A pe B.
        const capete = (egale(A.a, B.a) && egale(A.b, B.b)) || (egale(A.a, B.b) && egale(A.b, B.a));
        if (capete && LA > 4 * e && peSeg(B, ev(A, 0.25), e) && peSeg(B, ev(A, 0.5), e) && peSeg(B, ev(A, 0.75), e)) coincid = true;
        else {
          // Eșantioane interioare: o serie de eșantioane vecine pe cealaltă primitivă, mai lungă de 4e = o bucată comună.
          const proba = (X: Prim, Y: Prim, LX: number): boolean => {
            let serie = 0;
            for (let j = 1; j < 16; j++) {
              if (peSeg(Y, ev(X, j / 16), e)) { serie++; if (serie >= 2 && ((serie - 1) / 16) * LX > 4 * e) return true; }
              else serie = 0;
            }
            return false;
          };
          coincid = proba(A, B, LA) || proba(B, A, LB);
        }
      }
      if (coincid) { r.push([A.id, k]); if (r.length >= max) return r; }
    }
  }
  return r;
}

// ---------------------------------------------------------------------------------------------------------------------
// Judecata.

export type RezultatN =
  | { ok: true; cai: CaleN[]; info: Record<string, unknown> }
  | { ok: false; motiv: string };

export type OptiuniN = {
  /** Hârtia: ce trebuie să iasă. Fără ea, orice rezultat valid trece (refuzul doar cu `refuzPermis`). */
  asteptat?: 'neschimbat' | 'schimbat' | 'refuz';
  /** Cazurile prost condiționate: un refuz cu motiv e acceptat. */
  refuzPermis?: boolean;
  /** Codul refuzului cerut (de exemplu `intrare`). */
  cod?: CodMotiv;
  /** Densitatea sondelor (1 = implicit). */
  densitate?: number;
  /** Toleranța sursei pe primitivă (ușa SVG: citirea oracolului); 0 implicit. */
  tolSursa?: (ci: number, vi: number) => number;
  /** Vârfurile-sursă bit cu bit (fals la ușa SVG, unde sursa e o predicție). */
  biti?: boolean;
  /** Info se judecă (fals la ușa SVG, unde info nu se vede). */
  info?: boolean;
  /** Sămânța sondelor aleatoare. */
  samanta?: number;
  /** Martorul de proximitate la τ, dacă apelantul l-a calculat deja (ușa SVG); null = fără martor. */
  martor?: string | null;
  /**
   * Praful ieșirii (ADR 0037 §11, la ușa SVG, sub-felia 2.3c-1): rezoluția, în mm. Un contur al regiunii adevărate cu
   * diagonala cutiei exacte sub ea lipsește din ieșire (sărit, numărat de ușă la `sub-rezolutie`); unul păstrat e o
   * greșeală. Fără opțiune (normalizarea singură), ieșirea trebuie să aibă toate contururile.
   */
  praf?: number;
};

export type MasuriN = {
  sonde: number; ambigue: number; aproape: number; dezacorduri: number; adancime: number;
  orientare: number; iesireSursa: number; adevarIesire: number; adevarEsantioane: number;
  varfMax: number; cubMax: number; arcMax: number; liniiMax: number; grupuri: number; tau: number[]; atingeri: number; martor?: string;
  /**
   * Cu `praf`: contururile de praf ale regiunii adevărate găsite (distincte), sondele și punctele frontierei scutite pentru
   * că stau în ele (sau pe ele), și ferestrele locale calculate.
   */
  praf?: number; prafScutite?: number; prafFerestre?: number; prafBucle?: BuclaPraf[];
};

export function aleatorN(samanta: number): () => number {
  let a = samanta >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Forma ieșirii: căi de vârfuri finite cu tipuri valide; textul problemei, sau null. */
function problemaForma(cai: unknown): string | null {
  if (!Array.isArray(cai)) return 'cai nu e listă';
  for (const [ci, c] of cai.entries()) {
    if (!Array.isArray(c)) return `ieșirea ${ci} nu e listă`;
    for (const [vi, v] of c.entries()) {
      const x = v as { p?: unknown; s?: { tip?: unknown; bulge?: unknown; c1?: unknown; c2?: unknown } } | null;
      if (typeof x !== 'object' || x === null || !finit(x.p)) return `ieșirea ${ci}, vârful ${vi}: p`;
      const s = x.s;
      if (typeof s !== 'object' || s === null) return `ieșirea ${ci}, vârful ${vi}: s`;
      if (s.tip === 'L') continue;
      if (s.tip === 'A') { if (typeof s.bulge !== 'number' || !Number.isFinite(s.bulge) || s.bulge === 0) return `ieșirea ${ci}, vârful ${vi}: bulge ${String(s.bulge)}`; continue; }
      if (s.tip === 'C') { if (!finit(s.c1) || !finit(s.c2)) return `ieșirea ${ci}, vârful ${vi}: c1/c2`; continue; }
      return `ieșirea ${ci}, vârful ${vi}: tipul ${String(s.tip)}`;
    }
  }
  return null;
}

type Context = {
  rule: 'nonzero' | 'evenodd';
  sS: Prim[]; wS: IndexInfasurare; dS: IndexDistanta;
  gr: Grup[]; grupPrim: Int32Array; tauMax: number;
  rnd: () => number; dens: number;
};

function context(intrare: readonly CaleN[], regula: 'nonzero' | 'evenodd', opt: OptiuniN): Context {
  const sS = toatePrimitivele(intrare);
  if (opt.tolSursa !== undefined) for (const s of sS) s.tol = opt.tolSursa(s.ci, s.vi);
  const gr = grupuri(intrare);
  const grupCale = new Int32Array(intrare.length);
  gr.forEach((g, k) => { for (const c of g.cai) grupCale[c] = k; });
  const grupPrim = new Int32Array(sS.length);
  sS.forEach((s, k) => { grupPrim[k] = grupCale[s.ci] as number; });
  return {
    rule: regula, sS, wS: indexInfasurare(sS), dS: indexDistanta(sS), gr, grupPrim,
    tauMax: gr.reduce((m, g) => Math.max(m, g.tau), 0), rnd: aleatorN(opt.samanta ?? 12345), dens: opt.densitate ?? 1,
  };
}

/** Grupul (intrării) cel mai apropiat de q, după cutie. */
function grupLa(ctx: Context, q: P): Grup {
  let best = ctx.gr[0] as Grup, bd = Infinity;
  for (const g of ctx.gr) {
    const c = g.cutie;
    const d = Math.hypot(Math.max(0, c.x0 - q.x, q.x - c.x1), Math.max(0, c.y0 - q.y, q.y - c.y1));
    if (d < bd) { bd = d; best = g; }
  }
  return best;
}

/** Punctul q e la cel mult τ (al grupului primitivei) + toleranța sursei de frontiera intrării? */
function langaFrontiera(ctx: Context, q: P): boolean {
  if (ctx.sS.length === 0) return false;
  const tolMax = ctx.sS.reduce((m, s) => Math.max(m, s.tol), 0);
  for (const c of toateAproape(ctx.dS, q, ctx.tauMax * 1.01 + tolMax)) {
    const s = ctx.sS[c.k] as Prim;
    const g = ctx.gr[ctx.grupPrim[c.k] as number] as Grup;
    if (c.d <= g.tau * 1.01 + s.tol) return true;
  }
  return false;
}

/** Sondele: aleatoare în fiecare grup, lângă segmente (normalele) și pe cercuri în jurul vârfurilor. */
function sonde(ctx: Context, sO: readonly Prim[], iesire: readonly CaleN[], intrare: readonly CaleN[]): P[] {
  const q: P[] = [];
  const r = ctx.rnd;
  for (const g of ctx.gr) {
    const c = g.cutie, w = c.x1 - c.x0, h = c.y1 - c.y0, ex = 0.05 * Math.max(w, h);
    const n = Math.ceil(Math.min(2000, 60 + 40 * g.cai.length) * ctx.dens);
    for (let i = 0; i < n; i++) q.push({ x: c.x0 - ex + r() * (w + 2 * ex), y: c.y0 - ex + r() * (h + 2 * ex) });
  }
  const langa = (s: Prim, g: Grup, K: number): void => {
    const dist = [2 * g.tau, 40 * g.tau, 3e3 * g.tau, 1e-6 * g.D, 1e-3 * g.D];
    for (let k = 0; k < K; k++) {
      const t = (k + 0.5 + 0.3 * (r() - 0.5)) / K, p = ev(s, t), v = d1(s, t), nn = Math.hypot(v.x, v.y);
      if (!(nn > 0)) continue;
      const nx = -v.y / nn, ny = v.x / nn;
      for (const d of dist) { q.push({ x: p.x + d * nx, y: p.y + d * ny }); q.push({ x: p.x - d * nx, y: p.y - d * ny }); }
    }
  };
  const K = Math.max(1, Math.round(3 * ctx.dens));
  // Bugetul sondelor (1,5 milioane × densitatea): peste el, segmentele și vârfurile se iau cu un pas.
  const nV = [...intrare, ...iesire].reduce((t, c) => t + c.length, 0);
  const cerute = (ctx.sS.length + sO.length) * K * 10 + nV * 24;
  const pas = Math.max(1, Math.ceil(cerute / (1.5e6 * ctx.dens)));
  ctx.sS.forEach((s, i) => { if (i % pas === 0) langa(s, ctx.gr[ctx.grupPrim[s.id] as number] as Grup, K); });
  sO.forEach((s, i) => { if (i % pas === 0) langa(s, grupLa(ctx, ev(s, 0.5)), K); });
  // Pe bisectoarele sectoarelor: la intersecțiile intrării (fețele mici stau acolo) și la vârfurile intrării și ale ieșirii
  // (între tangenta care intră și cea care iese).
  const razeB = (g: Grup): number[] => [3 * g.tau, 100 * g.tau, 1e4 * g.tau, 1e-4 * g.D, 1e-2 * g.D];
  for (const x of intersectiiAprox(ctx.sS, Math.ceil(50_000 * ctx.dens), Math.ceil(4e6 * Math.min(1, ctx.dens)))) sondeBisectoare(x.p, x.ta, x.tb, razeB(grupLa(ctx, x.p)), q);
  for (const c of [...intrare, ...iesire]) {
    const pr = primitive(c, 0);
    pr.forEach((s, i) => {
      if (i % pas !== 0) return;
      const prec = pr[(i - 1 + pr.length) % pr.length] as Prim;
      if (prec === s || !egale(prec.b, s.a)) return;
      const tin = d1(prec, 1), tout = d1(s, 0);
      sondeBisectoare(s.a, { x: -tin.x, y: -tin.y }, tout, razeB(grupLa(ctx, s.a)), q);
    });
  }
  let iv = 0;
  for (const c of [...intrare, ...iesire]) for (const v of c) {
    if (iv++ % pas !== 0) continue;
    const g = grupLa(ctx, v.p);
    for (const rr of [3 * g.tau, 300 * g.tau, 3e4 * g.tau]) for (let j = 0; j < 8; j++) {
      const a = ((j + 0.5) * Math.PI) / 4;
      q.push({ x: v.p.x + rr * Math.cos(a), y: v.p.y + rr * Math.sin(a) });
    }
  }
  return q;
}

const umple = (w: number, regula: 'nonzero' | 'evenodd'): boolean => (regula === 'nonzero' ? w !== 0 : (Math.abs(w) & 1) === 1);

/** Regiunea intrării sub regulă față de `evenodd` (pentru „neschimbat”): numărul sondelor curate care le deosebesc. */
export function regiuneaDifera(intrare: readonly CaleN[], regula: 'nonzero' | 'evenodd', opt: OptiuniN = {}): { dezacorduri: number; exemplu?: P } {
  const ctx = context(intrare, regula, opt);
  let dez = 0, exemplu: P | undefined;
  for (const q of sonde(ctx, [], [], intrare)) {
    const g = grupLa(ctx, q);
    const a = infasurare(ctx.wS, q, Math.max(1e-12 * g.D, 8 * ulp(g.M)));
    if (a.amb) continue;
    // Distanța la frontieră se cere doar unde regulile diferă (o sondă la τ de frontieră nu se judecă).
    if (umple(a.w, regula) !== umple(a.w, 'evenodd') && !langaFrontiera(ctx, q)) { dez++; exemplu ??= q; }
  }
  return exemplu === undefined ? { dezacorduri: dez } : { dezacorduri: dez, exemplu };
}

/**
 * Judecă rezultatul lui `normalizeaza(intrare, { regula })`. Întoarce problemele (gol = trece) și măsurile.
 */
export function judecaNormalizarea(intrare: readonly CaleN[], regula: 'nonzero' | 'evenodd', rez: unknown, opt: OptiuniN = {}): { probleme: string[]; masuri: MasuriN } {
  const M: MasuriN = { sonde: 0, ambigue: 0, aproape: 0, dezacorduri: 0, adancime: 0, orientare: 0, iesireSursa: 0, adevarIesire: 0, adevarEsantioane: 0, varfMax: 0, cubMax: 0, arcMax: 0, liniiMax: 0, grupuri: 0, tau: [], atingeri: 0 };
  const pr: string[] = [];
  if (typeof rez !== 'object' || rez === null) return { probleme: ['rezultatul nu e obiect'], masuri: M };
  const R = rez as { ok?: unknown; cai?: unknown; info?: unknown; motiv?: unknown };
  const invalida = problemaIntrare(intrare);
  if (R.ok === false) {
    const cod = codMotiv(R.motiv);
    if (cod === null) return { probleme: [`refuz fără cod: ${String(R.motiv)}`], masuri: M };
    if (opt.cod !== undefined && cod !== opt.cod) pr.push(`refuzul ${cod} ≠ ${opt.cod} (${String(R.motiv)})`);
    if (invalida !== null) { if (cod !== 'intrare') pr.push(`intrarea invalidă (${invalida}) refuzată cu ${cod}`); return { probleme: pr, masuri: M }; }
    if (opt.asteptat === 'refuz' || opt.refuzPermis === true || opt.cod !== undefined) return { probleme: pr, masuri: M };
    return { probleme: [...pr, `refuzat (${String(R.motiv)}), dar hârtia cere ${opt.asteptat ?? 'un rezultat'}`], masuri: M };
  }
  if (R.ok !== true) return { probleme: [`ok = ${String(R.ok)}`], masuri: M };
  if (invalida !== null) return { probleme: [`intrarea invalidă (${invalida}) n-a fost refuzată (ok)`], masuri: M };
  if (opt.asteptat === 'refuz' || opt.cod !== undefined) pr.push(`trebuia refuzat (${opt.cod ?? 'refuz'}), dar ok`);
  const f = problemaForma(R.cai);
  if (f !== null) return { probleme: [...pr, f], masuri: M };
  const iesire = R.cai as CaleN[];
  const info = (typeof R.info === 'object' && R.info !== null ? R.info : {}) as Record<string, unknown>;
  const ctx = context(intrare, regula, opt);
  M.grupuri = ctx.gr.length;
  M.tau = ctx.gr.map((g) => g.tau);
  const acelasi = iesire === intrare;

  // --- info
  if (opt.info !== false) {
    if (typeof R.info !== 'object' || R.info === null) pr.push('info lipsește');
    if (info['neschimbat'] !== acelasi) pr.push(`info.neschimbat = ${String(info['neschimbat'])}, dar ${acelasi ? 'e' : 'nu e'} același obiect`);
    if (info['contururiIntrare'] !== intrare.length) pr.push(`info.contururiIntrare = ${String(info['contururiIntrare'])} ≠ ${intrare.length}`);
    if (info['contururiIesire'] !== iesire.length) pr.push(`info.contururiIesire = ${String(info['contururiIesire'])} ≠ ${iesire.length}`);
    // „Cutia” (§3, §4) nu e numită exactă: se acceptă și cutia cu punctele de control ale cubicelor (ALEGERE, în raport).
    const grC = grupuri(intrare, intrare.map(cutieCaleControl));
    if (info['grupuri'] !== ctx.gr.length && info['grupuri'] !== grC.length) pr.push(`info.grupuri = ${String(info['grupuri'])} ∉ {${ctx.gr.length}, ${grC.length}} (cutiile exacte / de control care se ating)`);
    const tau = info['tau'];
    const toate = [...ctx.gr, ...grC].map((g) => g.tau);
    if (typeof tau !== 'number' || !Number.isFinite(tau) || tau < 0) pr.push(`info.tau = ${String(tau)}`);
    // ALEGERE: pe o intrare neschimbată, τ poate lipsi (0: nu s-a calculat; info nu e în ADR).
    else if (acelasi && tau === 0) { /* neschimbat, τ necalculat */ }
    else if (toate.length > 0) {
      const mx = Math.max(...toate), mn = Math.min(...toate);
      if (!(tau <= mx * (1 + 1e-12) && tau >= mn * (1 - 1e-12))) pr.push(`info.tau = ${tau} în afara [${mn}, ${mx}] (1e-10·D + 64·ulp(M) pe grupuri)`);
    }
    if (ctx.gr.every((g) => g.D <= 9000) && typeof tau === 'number' && !(tau <= CONST_N.tolImport)) pr.push(`info.tau = ${String(tau)} > TOLERANTA_IMPORT`);
    for (const k of ['intersectii', 'tangente', 'noduriContopite', 'muchiiScoase', 'suprapuneri', 'lucru']) {
      const v = info[k];
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) pr.push(`info.${k} = ${String(v)}`);
    }
  }

  // --- neschimbat
  if (acelasi) {
    if (opt.asteptat === 'schimbat') pr.push('neschimbat, dar hârtia cere o ieșire schimbată');
    const dif = regiuneaDifera(intrare, regula, opt);
    if (dif.dezacorduri > 0) pr.push(`neschimbat, dar regiunea ${regula} ≠ evenodd în ${dif.dezacorduri} sonde (de exemplu ${JSON.stringify(dif.exemplu)})`);
    const co = muchiiCoincidente(ctx.sS, (s) => (ctx.gr[ctx.grupPrim[s.id] as number] as Grup).eps + s.tol);
    if (co.length > 0) pr.push(`neschimbat, dar intrarea are muchii coincidente (primitivele ${JSON.stringify(co)})`);
    return { probleme: pr, masuri: M };
  }
  if (opt.asteptat === 'neschimbat') pr.push('schimbat, dar hârtia cere neschimbat (același obiect)');

  const sO = toatePrimitivele(iesire);
  const epsPrim = (q: P): number => grupLa(ctx, q).eps;

  // --- topologia
  iesire.forEach((c, ci) => {
    if (c.length < 2) pr.push(`ieșirea ${ci} are ${c.length} vârfuri`);
    // §7 (recenzia 2.7d): un ciclu se taie la vârful repetat; fiecare contur trece o singură dată prin fiecare vârf.
    const vazute = new Set<string>();
    for (const v of c) {
      const k = `${v.p.x},${v.p.y}`;
      if (vazute.has(k)) { pr.push(`ieșirea ${ci} trece de două ori prin vârful (${v.p.x}, ${v.p.y}) (§7: se taie la vârful repetat)`); break; }
      vazute.add(k);
    }
    c.forEach((v, vi) => {
      const w = c[(vi + 1) % c.length] as VarfN;
      if (v.s.tip !== 'C' && egale(v.p, w.p)) pr.push(`ieșirea ${ci}, vârful ${vi}: segment ${v.s.tip} nul`);
      if (v.s.tip === 'C' && egale(v.p, w.p) && egale(v.s.c1, v.p) && egale(v.s.c2, v.p)) pr.push(`ieșirea ${ci}, vârful ${vi}: cubică nulă`);
      if (v.s.tip === 'C' && egale(v.p, w.p) && c.length === 1) pr.push(`ieșirea ${ci}: buclă dintr-o singură cubică neîmpărțită`);
      if (v.s.tip === 'A' && !egale(v.p, w.p)) {
        const ch = dist(v.p, w.p), b = Math.abs(v.s.bulge);
        if (!((ch / 4) * (b + 1 / b) <= CONST_N.razaArc)) pr.push(`ieșirea ${ci}, vârful ${vi}: arc cu raza peste 10 000 mm`);
      }
    });
  });
  // ADR 0037 §11 (praful ieșirii, la ușa SVG): un contur al ieșirii cu diagonala cutiei exacte sub rezoluție trebuia sărit.
  if (opt.praf !== undefined) {
    iesire.forEach((c, ci) => {
      const k = cutieCale(c), d = Math.hypot(k.x1 - k.x0, k.y1 - k.y0);
      if (d < opt.praf!) pr.push(`ieșirea ${ci}: un contur sub rezoluție (diagonala cutiei ${d.toExponential(3)} mm < ${opt.praf}) păstrat; ADR 0037 §11: se sare, numărat sub-rezolutie`);
    });
  }
  const co = muchiiCoincidente(sO, (s) => epsPrim(ev(s, 0.5)));
  for (const [i, j] of co) {
    const A = sO[i] as Prim, B = sO[j] as Prim;
    pr.push(`muchii coincidente în ieșire: ${A.ci}/${A.vi} (${A.tip}) și ${B.ci}/${B.vi} (${B.tip})`);
  }

  // --- vârfurile și purtătorii.
  // Un vârf al ieșirii e: un vârf-sursă bit cu bit, o intersecție (la εv de două primitive), mijlocul buclei dintr-o
  // singură cubică (§7), sau o ATINGERE (§4: o trăsătură mai subțire decât τ, închisă sau contopită): la τ, nu la εv, de
  // primitivele lui. Un segment al ieșirii stă pe purtătorul lui (linia, cercul sau cubica-sursă) la 4εv; capetele lui care
  // se abat mai mult, dar cel mult τ, sunt și ele atingeri, iar segmentul se judecă atunci la τ. Atingerile se numără: cel
  // mult de două ori tangentele + nodurile contopite declarate în `info` (o atingere dă cel mult câte un vârf în fiecare din
  // cele două contururi care se ating). Fără `info` (ușa SVG), numărul nu se judecă.
  const varfSursa = new Set<string>();
  for (const c of intrare) for (const v of c) varfSursa.add(`${v.p.x},${v.p.y}`);
  const tolMax = ctx.sS.reduce((m, s) => Math.max(m, s.tol), 0);
  const atingere = new Set<string>();
  const cheieV = (ci: number, vi: number): string => `${ci}/${vi}`;
  iesire.forEach((c, ci) => c.forEach((v, vi) => {
    if (opt.biti !== false && varfSursa.has(`${v.p.x},${v.p.y}`)) return;
    const g = grupLa(ctx, v.p);
    const l = toateAproape(ctx.dS, v.p, g.tau + tolMax).filter((x) => x.d <= g.tau + (ctx.sS[x.k] as Prim).tol);
    const peEps = l.filter((x) => x.d <= g.eps + (ctx.sS[x.k] as Prim).tol);
    const d0 = l.length > 0 ? (l[0] as { d: number }).d : celMaiAproape(ctx.dS, v.p).d;
    M.varfMax = Math.max(M.varfMax, peEps.length >= 2 ? (peEps[1] as { d: number }).d : d0);
    if (peEps.length >= 2) return;
    // Autointersecția unei cubice: același purtător, doi parametri diferiți, ambii la εv.
    if (peEps.length === 1) {
      const x = peEps[0] as { k: number; dist: Dist };
      if ((ctx.sS[x.k] as Prim).tip === 'C') {
        const tt = x.dist.minime.filter((m) => m.d <= g.eps + (ctx.sS[x.k] as Prim).tol).map((m) => m.t).sort((a, b) => a - b);
        if (tt.length >= 2 && (tt[tt.length - 1] as number) - (tt[0] as number) > 1e-6) return;
      }
    }
    if (opt.biti === false) {
      // La ușa SVG: un vârf-sursă prezis (la toleranța citirii).
      for (const cc of intrare) for (const w of cc) if (dist(w.p, v.p) <= g.eps + tolMax) return;
    }
    // Mijlocul buclei dintr-o singură cubică (§7): conturul are 2 cubice, ambele pe aceeași cubică-sursă.
    if (peEps.length === 1 && c.length === 2 && c.every((x) => x.s.tip === 'C') && (ctx.sS[(peEps[0] as { k: number }).k] as Prim).tip === 'C') return;
    let langaSursa = false;
    for (const cc of intrare) for (const w of cc) if (dist(w.p, v.p) <= g.tau + tolMax) langaSursa = true;
    if ((peEps.length >= 1 && l.length >= 2) || langaSursa) { atingere.add(cheieV(ci, vi)); return; }
    pr.push(`ieșirea ${ci}, vârful ${vi} (${v.p.x}, ${v.p.y}): ${l.length === 0 ? `la ${d0.toExponential(3)} de sursă` : `la εv de ${peEps.length} și la τ de ${l.length} primitive-sursă, nu e vârf-sursă`} (εv ${g.eps.toExponential(2)}, τ ${g.tau.toExponential(2)})`);
  }));

  // Potrivirea fiecărui segment pe purtătorul lui: abaterea capetelor (da, db) și a interiorului (er).
  type Potrivire = { da: number; db: number; er: number; tip: string; q: Prim; u: number; w: number } | null;
  const potriviri: Potrivire[] = sO.map((s) => {
    const g = grupLa(ctx, ev(s, 0.5));
    const raza = g.tau + tolMax;
    const cand = toateAproape(ctx.dS, ev(s, 0.5), raza).filter((x) => x.d <= g.tau + (ctx.sS[x.k] as Prim).tol).map((x) => ctx.sS[x.k] as Prim);
    let best: Potrivire = null;
    const ia = (da: number, db: number, er: number, q: Prim, u = 0, w = 1): void => {
      const m = Math.max(da, db, er);
      if (best === null || m < Math.max(best.da, best.db, best.er)) best = { da: Math.max(0, da - q.tol), db: Math.max(0, db - q.tol), er: Math.max(0, er - q.tol), tip: q.tip, q, u, w };
    };
    for (const q of cand) {
      // O linie pe o cubică-sursă DREAPTĂ (punctele de control pe coardă, la εv): aceeași mulțime de puncte, exactă
      // (ALEGERE: ADR-ul nu vorbește de cubicele degenerate; judecata 2.7d le număra separat, „LpeC”).
      if (s.tip === 'L' && q.tip === 'C' && !egale(q.a, q.b)) {
        const dx = q.b.x - q.a.x, dy = q.b.y - q.a.y, n = Math.hypot(dx, dy);
        const dl = (p: P): number => Math.abs((p.x - q.a.x) * dy - (p.y - q.a.y) * dx) / n;
        if (dl(q.p1) <= g.eps && dl(q.p2) <= g.eps) ia(dl(s.a), dl(s.b), 0, q);
        continue;
      }
      if (q.tip !== s.tip) continue;
      if (s.tip === 'L') {
        const dx = q.b.x - q.a.x, dy = q.b.y - q.a.y, n = Math.hypot(dx, dy);
        const dl = (p: P): number => Math.abs((p.x - q.a.x) * dy - (p.y - q.a.y) * dx) / n;
        ia(dl(s.a), dl(s.b), 0, q);
      } else if (s.tip === 'A') {
        const dr = (p: P): number => Math.abs(Math.hypot(p.x - q.cx, p.y - q.cy) - q.r);
        let delta = Math.atan2(s.b.y - q.cy, s.b.x - q.cx) - Math.atan2(s.a.y - q.cy, s.a.x - q.cx);
        if (s.bulge > 0) { delta = ((delta % DOIPI) + DOIPI) % DOIPI; if (delta === 0) delta = DOIPI; }
        else { delta = -((((-delta) % DOIPI) + DOIPI) % DOIPI); if (delta === 0) delta = -DOIPI; }
        // Baleiajul din bulge față de unghiurile capetelor pe cercul sursei, ca lungime de arc (semnul inclus).
        ia(dr(s.a), dr(s.b), Math.abs(4 * Math.atan(s.bulge) - delta) * q.r, q);
      } else {
        const tq = g.tau + q.tol;
        const ma = distSeg(q, s.a).minime.filter((c) => c.d <= tq), mb = distSeg(q, s.b).minime.filter((c) => c.d <= tq);
        for (const u of ma) for (const w of mb) {
          if (u.t === w.t) continue;
          const sc = subCurba(q, u.t, w.t);
          // Interiorul: punctele de control față de sub-curbă; capetele: distanța la purtător.
          ia(u.d, w.d, Math.max(dist(sc[1], s.p1), dist(sc[2], s.p2), Math.max(0, dist(sc[0], s.a) - u.d), Math.max(0, dist(sc[3], s.b) - w.d)), q, u.t, w.t);
        }
      }
    }
    return best;
  });
  sO.forEach((s, k) => {
    const pt = potriviri[k];
    if (pt === null || pt === undefined) return;
    const g = grupLa(ctx, ev(s, 0.5));
    const n = (iesire[s.ci] as CaleN).length;
    if (pt.da > 4 * g.eps && pt.da <= g.tau) atingere.add(cheieV(s.ci, s.vi));
    if (pt.db > 4 * g.eps && pt.db <= g.tau) atingere.add(cheieV(s.ci, (s.vi + 1) % n));
  });
  M.atingeri = atingere.size;
  if (opt.info !== false && atingere.size > 0) {
    const t = Number(info['tangente'] ?? 0) + Number(info['noduriContopite'] ?? 0);
    if (!(atingere.size <= 2 * t)) pr.push(`${atingere.size} vârfuri de atingere (la τ, nu la εv, de primitivele lor), dar info declară ${String(info['tangente'])} tangente și ${String(info['noduriContopite'])} noduri contopite`);
  }
  /** Toleranța unui segment al ieșirii: τ dacă un capăt e o atingere, altfel 4εv. */
  const tolSeg = (s: Prim, g: Grup): number => {
    const n = (iesire[s.ci] as CaleN).length;
    return atingere.has(cheieV(s.ci, s.vi)) || atingere.has(cheieV(s.ci, (s.vi + 1) % n)) ? g.tau : 4 * g.eps;
  };

  // --- geometria sursei, pe fiecare segment al ieșirii
  sO.forEach((s, k) => {
    const g = grupLa(ctx, ev(s, 0.5));
    const e = tolSeg(s, g);
    const unde = `ieșirea ${s.ci}, vârful ${s.vi} (${s.tip})`;
    const pt = potriviri[k];
    const fel = s.tip === 'L' ? 'linie-sursă' : s.tip === 'A' ? 'arc-sursă (cercul și unghiurile)' : 'cubică-sursă (sub-curbă, blossom)';
    if (pt === null || pt === undefined) pr.push(`${unde}: nu stă pe nicio ${fel}`);
    else {
      const m = Math.max(pt.da, pt.db, pt.er);
      if (s.tip === 'L') M.liniiMax = Math.max(M.liniiMax, m);
      else if (s.tip === 'A') M.arcMax = Math.max(M.arcMax, m);
      else M.cubMax = Math.max(M.cubMax, m);
      if (!(m <= e)) pr.push(`${unde}: la ${m.toExponential(3)} de ${fel} (capetele ${pt.da.toExponential(2)}, ${pt.db.toExponential(2)}; interiorul ${pt.er.toExponential(2)}; tol ${e.toExponential(2)})`);
    }
    // Ieșire → sursă: 9 eșantioane, maximul rafinat cu secțiunea de aur.
    // Întâi purtătorul (la cubică, Newton pornit din parametrul sub-curbei: o margine de sus), apoi, dacă nu ajunge,
    // toată sursa (indexul).
    const h = (t: number): number => {
      const q = ev(s, t);
      if (pt !== null && pt !== undefined) {
        const dp = pt.q.tip === 'C' ? newtonPolish(pt.q, q, Math.max(0, Math.min(1, pt.u + (pt.w - pt.u) * t))).d : distSeg(pt.q, q).d;
        if (dp - pt.q.tol <= e) return dp - pt.q.tol;
      }
      const c = celMaiAproape(ctx.dS, q);
      return c.k < 0 ? Infinity : c.d - (ctx.sS[c.k] as Prim).tol;
    };
    let mx = -Infinity, unde2 = 0;
    for (let k = 0; k <= 8; k++) { const v = h(k / 8); if (v > mx) { mx = v; unde2 = k / 8; } }
    {
      let lo = Math.max(0, unde2 - 1 / 8), hi = Math.min(1, unde2 + 1 / 8);
      const gg = (Math.sqrt(5) - 1) / 2;
      let x1 = hi - gg * (hi - lo), x2 = lo + gg * (hi - lo), f1 = h(x1), f2 = h(x2);
      for (let it = 0; it < 30; it++) {
        if (f1 > f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - gg * (hi - lo); f1 = h(x1); }
        else { lo = x1; x1 = x2; f1 = f2; x2 = lo + gg * (hi - lo); f2 = h(x2); }
      }
      mx = Math.max(mx, f1, f2);
    }
    M.iesireSursa = Math.max(M.iesireSursa, mx);
    if (!(mx <= e)) pr.push(`${unde}: la ${mx.toExponential(3)} de sursă (tol ${e.toExponential(2)})`);
  });

  // --- regiunea și orientarea
  const wO = indexInfasurare(sO), dO = indexDistanta(sO);
  let exemplu: { q: P; wS: number; wO: number; ds: number } | null = null;
  let exOrient: { q: P; wO: number; ds: number } | null = null;
  let dezIntrare = 0;
  // Cu `praf`, dezacordurile se adună întâi: cele din contururile de praf ale regiunii adevărate se scutesc mai jos.
  const dezacordPraf: Array<{ q: P; wS: number; wO: number; ds: number }> = [];
  for (const q of sonde(ctx, sO, iesire, intrare)) {
    const g = grupLa(ctx, q);
    const eta = Math.max(1e-12 * g.D, 8 * ulp(g.M));
    const a = infasurare(ctx.wS, q, eta), b = infasurare(wO, q, eta);
    if (a.amb || b.amb) { M.ambigue++; continue; }
    // Intrarea însăși: regula față de evenodd (pentru §6: era deja evenodd?).
    if (umple(a.w, regula) !== umple(a.w, 'evenodd') && !langaFrontiera(ctx, q)) dezIntrare++;
    const rau = (b.w !== 0 && b.w !== 1) || umple(a.w, regula) !== umple(b.w, 'evenodd');
    // Distanța la frontiera intrării se cere doar pe o sondă care ar pica: la cel mult τ, nu se judecă (§4).
    if (rau && langaFrontiera(ctx, q)) { M.aproape++; continue; }
    M.sonde++;
    if (b.w !== 0 && b.w !== 1) { M.orientare++; exOrient ??= { q, wO: b.w, ds: celMaiAproape(ctx.dS, q).d }; }
    if (umple(a.w, regula) !== umple(b.w, 'evenodd')) {
      const ds = celMaiAproape(ctx.dS, q).d;
      if (opt.praf !== undefined) { dezacordPraf.push({ q, wS: a.w, wO: b.w, ds }); continue; }
      M.dezacorduri++;
      if (ds > M.adancime) { M.adancime = ds; exemplu = { q, wS: a.w, wO: b.w, ds }; }
    }
  }
  // --- adevăr → ieșire: punctele frontierei adevărate au ieșirea la εd. Se adună aici (sondele de praf le folosesc),
  // problemele se scriu la urmă, ca înainte.
  const orfane: Array<{ p: P; tol: number; mesaj: string }> = [];
  for (const s of ctx.sS) {
    const g = ctx.gr[ctx.grupPrim[s.id] as number] as Grup;
    const K = Math.max(2, Math.round(6 * ctx.dens));
    const exclus = new Set<number>([s.id]);
    for (let k = 0; k < K; k++) {
      const t = (k + 0.5) / K, p = ev(s, t), v = d1(s, t), n = Math.hypot(v.x, v.y);
      if (!(n > 0)) continue;
      const nx = -v.y / n, ny = v.x / n;
      for (const d of [4 * g.tau, 1e3 * g.tau, 1e-4 * g.D]) {
        const q1 = { x: p.x + d * nx, y: p.y + d * ny }, q2 = { x: p.x - d * nx, y: p.y - d * ny };
        // Bucata lui p e singura frontieră la mai puțin de d de p (altfel frontiera de ieșire poate sta pe alta).
        if (celMaiAproape(ctx.dS, p, exclus).d < 1.5 * d + s.tol) continue;
        const eta = Math.max(1e-12 * g.D, 8 * ulp(g.M));
        const a = infasurare(ctx.wS, q1, eta), b = infasurare(ctx.wS, q2, eta);
        if (a.amb || b.amb || umple(a.w, regula) === umple(b.w, regula)) continue;
        M.adevarEsantioane++;
        const cel = sO.length > 0 ? celMaiAproape(dO, p) : { d: Infinity, k: -1 };
        const dout = cel.d - s.tol;
        // Lângă o atingere (§4), ieșirea poate sta la τ (segmentul atingerii); altfel la εd.
        const tolA = cel.k >= 0 ? tolSeg(sO[cel.k] as Prim, g) : 4 * g.eps;
        if (!(dout <= tolA)) {
          const mesaj = `adevăr → ieșire: punctul (${p.x}, ${p.y}) al frontierei adevărate (sursa ${s.ci}/${s.vi}) la ${dout.toExponential(3)} de ieșire (tol ${tolA.toExponential(2)})`;
          if (opt.praf === undefined) M.adevarIesire = Math.max(M.adevarIesire, dout);
          orfane.push({ p, tol: s.tol + 4 * g.tau, mesaj });
          break;
        }
        M.adevarIesire = Math.max(M.adevarIesire, dout);
        break;
      }
    }
  }
  // --- praful (ADR 0037 §11): sondele în dezacord și punctele frontierei fără ieșire se explică prin contururile de praf ale
  // regiunii adevărate (aranjamentul local în jurul lor); ce nu se explică rămâne greșeală.
  if (opt.praf !== undefined) {
    const bucle: BuclaPraf[] = [];
    const seminte = [...dezacordPraf.map((x) => x.q), ...orfane.map((x) => x.p)];
    M.prafFerestre = seminte.length > 0 ? cautaPraf(ctx, seminte, opt.praf, bucle, 400) : 0;
    M.praf = bucle.length;
    M.prafBucle = bucle;
    M.prafScutite = 0;
    const dEx = (q: P): number => 16 * EPS_POLI + 4 * grupLa(ctx, q).tau;
    for (const x of dezacordPraf) {
      if (inPraf(bucle, x.q, dEx(x.q))) { M.prafScutite++; continue; }
      M.dezacorduri++;
      if (x.ds > M.adancime) { M.adancime = x.ds; exemplu = x; }
    }
    for (let i = orfane.length - 1; i >= 0; i--) if (inPraf(bucle, (orfane[i] as { p: P }).p, dEx((orfane[i] as { p: P }).p) + (orfane[i] as { tol: number }).tol)) { M.prafScutite++; orfane.splice(i, 1); }
  }
  if (M.dezacorduri > 0) pr.push(`regiunea: ${M.dezacorduri} sonde din ${M.sonde} în dezacord (cea mai adâncă la ${M.adancime.toExponential(3)} de frontieră: ${JSON.stringify(exemplu)})`);
  if (M.orientare > 0) pr.push(`orientarea: înfășurarea ieșirii ∉ {0, 1} în ${M.orientare} sonde (umplerea nu e în stânga sau contururile se suprapun; de exemplu ${JSON.stringify(exOrient)})`);
  if (M.sonde < 50) pr.push(`prea puține sonde curate (${M.sonde})`);
  // §6 (amendamentul K7): o intrare deja evenodd (nicio sondă dincolo de τ nu le deosebește, nicio muchie coincidentă) se
  // poate schimba doar cu un martor de proximitate la τ; altfel trebuia întoarsă chiar ea.
  if (dezIntrare === 0 && muchiiCoincidente(ctx.sS, (s) => (ctx.gr[ctx.grupPrim[s.id] as number] as Grup).eps + s.tol).length === 0) {
    const m = opt.martor !== undefined ? opt.martor : martorTau(intrare);
    if (m === null) pr.push('§6: intrarea e deja evenodd (nicio sondă dincolo de τ, nicio muchie coincidentă) și n-are niciun martor la τ: trebuia întoarsă chiar ea (același obiect)');
    else M.martor = m;
  }
  for (const o of orfane) pr.push(o.mesaj);
  return { probleme: pr.slice(0, 40), masuri: M };
}

/** Câte sonde curate (mai departe de τ de frontieră) sunt umplute sub regulă: 0 = regiunea e (practic) vidă. */
export function sondeUmplute(intrare: readonly CaleN[], regula: 'nonzero' | 'evenodd', opt: OptiuniN = {}): number {
  const ctx = context(intrare, regula, opt);
  let n = 0;
  for (const q of sonde(ctx, [], [], intrare)) {
    const g = grupLa(ctx, q);
    const a = infasurare(ctx.wS, q, Math.max(1e-12 * g.D, 8 * ulp(g.M)));
    if (a.amb || !umple(a.w, regula)) continue;
    if (!langaFrontiera(ctx, q)) n++;
  }
  return n;
}

/**
 * Un contur simplu din linii (fără autointersecții, fără atingeri, fără întoarceri pe aceeași dreaptă): regiunea lui
 * nonzero e cea evenodd și nu are muchii coincidente. Verificarea e exactă pe perechi (orientarea cu semn); `null` dacă
 * conturul are și curbe sau e prea mare pentru perechi.
 */
export function conturSimpluDinLinii(c: CaleN): boolean | null {
  if (c.some((v) => v.s.tip !== 'L')) return null;
  const p = c.map((v) => v.p);
  const n = p.length;
  if (n < 3) return false;
  const or = (a: P, b: P, q: P): number => (b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x);
  const pe = (a: P, b: P, q: P): boolean => Math.min(a.x, b.x) <= q.x && q.x <= Math.max(a.x, b.x) && Math.min(a.y, b.y) <= q.y && q.y <= Math.max(a.y, b.y);
  const seTaie = (a: P, b: P, c2: P, d: P): boolean => {
    const o1 = or(a, b, c2), o2 = or(a, b, d), o3 = or(c2, d, a), o4 = or(c2, d, b);
    if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))) return true;
    return (o1 === 0 && pe(a, b, c2)) || (o2 === 0 && pe(a, b, d)) || (o3 === 0 && pe(c2, d, a)) || (o4 === 0 && pe(c2, d, b));
  };
  for (let i = 0; i < n; i++) {
    const a = p[i] as P, b = p[(i + 1) % n] as P, c2 = p[(i + 2) % n] as P;
    if (egale(a, b)) return false;
    // Întoarcerea pe aceeași dreaptă (dus-întors).
    if (or(a, b, c2) === 0 && (b.x - a.x) * (c2.x - b.x) + (b.y - a.y) * (c2.y - b.y) < 0) return false;
  }
  // Perechile neadiacente, prin grilă (laturile care împart o celulă).
  let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
  for (const q of p) { X0 = Math.min(X0, q.x); X1 = Math.max(X1, q.x); Y0 = Math.min(Y0, q.y); Y1 = Math.max(Y1, q.y); }
  const G = Math.max(1, Math.min(1024, Math.ceil(Math.sqrt(n))));
  const cs = Math.max(X1 - X0, Y1 - Y0, 1e-300) / G;
  const cel = new Map<number, number[]>();
  let perechi = 0;
  for (let i = 0; i < n; i++) {
    const a = p[i] as P, b = p[(i + 1) % n] as P;
    const i0 = Math.floor((Math.min(a.x, b.x) - X0) / cs), i1 = Math.floor((Math.max(a.x, b.x) - X0) / cs);
    const j0 = Math.floor((Math.min(a.y, b.y) - Y0) / cs), j1 = Math.floor((Math.max(a.y, b.y) - Y0) / cs);
    for (let x = i0; x <= i1; x++) for (let y = j0; y <= j1; y++) {
      const key = x * 65536 + y;
      let l = cel.get(key);
      if (l === undefined) { l = []; cel.set(key, l); }
      for (const j of l) {
        if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
        if (++perechi > 20_000_000) return null;
        if (seTaie(a, b, p[j] as P, p[(j + 1) % n] as P)) return false;
      }
      l.push(i);
    }
  }
  return true;
}

// ---------------------------------------------------------------------------------------------------------------------
// Intersecțiile (aproximative, doar pentru sonde): fețele mici (o înfășurare 2 într-un colț de câțiva µm) stau lângă
// intersecții, iar oracolul nu are aranjamentul. Fiecare primitivă devine o polilinie (32 de bucăți la curbe), intersecțiile
// poliliniilor se rafinează cu Newton pe curbele adevărate, iar sondele se pun pe bisectoarele celor patru sectoare.

export type Intersectie = { p: P; ta: P; tb: P };

export function intersectiiAprox(segs: readonly Prim[], max = 200_000, bugetPerechi = 4_000_000): Intersectie[] {
  type Bucata = { s: number; t0: number; t1: number; a: P; b: P };
  const buc: Bucata[] = [];
  for (const s of segs) {
    const n = s.tip === 'L' ? 1 : 32;
    let a = ev(s, 0);
    for (let i = 1; i <= n; i++) { const b = ev(s, i / n); buc.push({ s: s.id, t0: (i - 1) / n, t1: i / n, a, b }); a = b; }
  }
  if (buc.length === 0) return [];
  let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
  for (const b of buc) { X0 = Math.min(X0, b.a.x, b.b.x); X1 = Math.max(X1, b.a.x, b.b.x); Y0 = Math.min(Y0, b.a.y, b.b.y); Y1 = Math.max(Y1, b.a.y, b.b.y); }
  const G = Math.max(1, Math.min(2048, Math.ceil(Math.sqrt(buc.length))));
  const cs = Math.max(X1 - X0, Y1 - Y0, 1e-300) / G;
  const cel = new Map<number, number[]>();
  buc.forEach((b, k) => {
    const i0 = Math.floor((Math.min(b.a.x, b.b.x) - X0) / cs), i1 = Math.floor((Math.max(b.a.x, b.b.x) - X0) / cs);
    const j0 = Math.floor((Math.min(b.a.y, b.b.y) - Y0) / cs), j1 = Math.floor((Math.max(b.a.y, b.b.y) - Y0) / cs);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const key = i * 65536 + j; let l = cel.get(key); if (l === undefined) { l = []; cel.set(key, l); } l.push(k); }
  });
  const out: Intersectie[] = [];
  const vazut = new Set<string>();
  const or = (a: P, b: P, c: P): number => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  let perechi = 0;
  for (const l of cel.values()) {
    for (let x = 0; x < l.length; x++) for (let y = x + 1; y < l.length; y++) {
      if (++perechi > bugetPerechi) return out;
      const B1 = buc[l[x] as number] as Bucata, B2 = buc[l[y] as number] as Bucata;
      if (B1.s === B2.s && Math.abs(B1.t0 - B2.t0) <= 1 / 32 + 1e-12) continue;
      const cheie = `${l[x]},${l[y]}`;
      if (vazut.has(cheie)) continue;
      vazut.add(cheie);
      const o1 = or(B1.a, B1.b, B2.a), o2 = or(B1.a, B1.b, B2.b), o3 = or(B2.a, B2.b, B1.a), o4 = or(B2.a, B2.b, B1.b);
      if (!((o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0))) continue;
      const s1 = segs[B1.s] as Prim, s2 = segs[B2.s] as Prim;
      // Estimarea din polilinii, apoi Newton pe A(u) − B(v) = 0.
      let u = B1.t0 + (B1.t1 - B1.t0) * (o3 / (o3 - o4)), v = B2.t0 + (B2.t1 - B2.t0) * (o1 / (o1 - o2));
      for (let it = 0; it < 30; it++) {
        const pa = ev(s1, u), pb = ev(s2, v), da = d1(s1, u), db = d1(s2, v);
        const fx = pa.x - pb.x, fy = pa.y - pb.y;
        const det = -da.x * db.y + db.x * da.y;
        if (det === 0) break;
        const du = (-fx * db.y + db.x * fy) / det, dv = (da.x * fy - da.y * fx) / det;
        const un = Math.max(0, Math.min(1, u - du)), vn = Math.max(0, Math.min(1, v - dv));
        if (un === u && vn === v) break;
        u = un;
        v = vn;
      }
      out.push({ p: ev(s1, u), ta: d1(s1, u), tb: d1(s2, v) });
      if (out.length >= max) return out;
    }
  }
  return out;
}

/** Sondele pe bisectoarele sectoarelor dintre două direcții, la razele date. */
export function sondeBisectoare(p: P, ta: P, tb: P, raze: readonly number[], q: P[]): void {
  const na = Math.hypot(ta.x, ta.y), nb = Math.hypot(tb.x, tb.y);
  if (!(na > 0 && nb > 0)) return;
  const u = { x: ta.x / na, y: ta.y / na }, w = { x: tb.x / nb, y: tb.y / nb };
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
    let dx = sx * u.x + sy * w.x, dy = sx * u.y + sy * w.y;
    const n = Math.hypot(dx, dy);
    if (!(n > 1e-12)) { dx = -u.y * sx; dy = u.x * sx; } else { dx /= n; dy /= n; }
    for (const r of raze) q.push({ x: p.x + r * dx, y: p.y + r * dy });
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Martorul de proximitate la τ (ADR 0036 §6, amendamentul K7, 12.10): „deja evenodd” se judecă la precizia τ, deci o
// intrare pe care oracolul o vede deja evenodd poate ieși schimbată (chiar goală) doar dacă are o trăsătură mai subțire
// decât τ. Martorul e unul din:
// - un vârf al intrării la cel mult τ de un segment care nu-l are drept capăt;
// - două segmente NEVECINE (nu consecutive în același contur) care, departe (peste 2τ) de capetele lor comune, se apropie
//   sub τ fără să se taie acolo (două segmente vecine la un unghi ascuțit nu sunt un martor: orice colț ascuțit ar fi).
// Fără martor, ieșirea trebuie să fie chiar intrarea.

export function martorTau(intrare: readonly CaleN[]): string | null {
  const sS = toatePrimitivele(intrare);
  if (sS.length === 0) return null;
  const gr = grupuri(intrare);
  const tauCale = new Float64Array(intrare.length);
  for (const g of gr) for (const c of g.cai) tauCale[c] = g.tau;
  const tauMax = gr.reduce((m, g) => Math.max(m, g.tau), 0);
  const dS = indexDistanta(sS);
  // 1. Un vârf la τ de un segment care nu-l are drept capăt.
  for (const [ci, c] of intrare.entries()) {
    const t = tauCale[ci] as number;
    for (const v of c) {
      for (const x of toateAproape(dS, v.p, t)) {
        const s = sS[x.k] as Prim;
        if (egale(s.a, v.p) || egale(s.b, v.p)) continue;
        return `vârful (${v.p.x}, ${v.p.y}) al căii ${ci} la ${x.d.toExponential(2)} de segmentul ${s.ci}/${s.vi} (τ ${t.toExponential(2)})`;
      }
    }
  }
  // 2. Două segmente nevecine apropiate sub τ, departe de capetele comune, fără să se taie acolo.
  const cl = (v: number, n: number): number => Math.max(0, Math.min(n - 1, v));
  // Vecinătatea: primitivele consecutive (ciclic) ale aceluiași contur.
  const pozitie = new Int32Array(sS.length), numar = new Int32Array(intrare.length);
  for (const s of sS) { pozitie[s.id] = numar[s.ci] as number; numar[s.ci] = (numar[s.ci] as number) + 1; }
  const vecine = (X: Prim, Y: Prim): boolean => {
    if (X.ci !== Y.ci) return false;
    const n = numar[X.ci] as number, d = Math.abs((pozitie[X.id] as number) - (pozitie[Y.id] as number));
    return d === 1 || d === n - 1;
  };
  for (const A of sS) {
    const t = tauCale[A.ci] as number;
    const cA = dS.cut[A.id] as Cutie;
    const cand = new Set<number>();
    const i0 = cl(Math.floor((cA.x0 - tauMax - dS.X0) / dS.cs), dS.nx), i1 = cl(Math.floor((cA.x1 + tauMax - dS.X0) / dS.cs), dS.nx);
    const j0 = cl(Math.floor((cA.y0 - tauMax - dS.Y0) / dS.cs), dS.ny), j1 = cl(Math.floor((cA.y1 + tauMax - dS.Y0) / dS.cs), dS.ny);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const k of dS.cel.get(i * 65536 + j) ?? []) if (k > A.id) cand.add(k);
    for (const k of cand) {
      const B = sS[k] as Prim;
      if (vecine(A, B)) continue;
      const cB = dS.cut[k] as Cutie;
      if (Math.hypot(Math.max(0, cA.x0 - cB.x1, cB.x0 - cA.x1), Math.max(0, cA.y0 - cB.y1, cB.y0 - cA.y1)) > t) continue;
      const comune = [A.a, A.b].filter((p) => egale(p, B.a) || egale(p, B.b));
      const f = (u: number): number => distSeg(B, ev(A, u)).d;
      let bu = 0, bd = Infinity;
      for (let j = 0; j <= 32; j++) { const u = j / 32, d = f(u); if (d < bd) { bd = d; bu = u; } }
      let lo = Math.max(0, bu - 1 / 32), hi = Math.min(1, bu + 1 / 32);
      const g = (Math.sqrt(5) - 1) / 2;
      let x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo), f1 = f(x1), f2 = f(x2);
      for (let it = 0; it < 60; it++) {
        if (f1 < f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - g * (hi - lo); f1 = f(x1); }
        else { lo = x1; x1 = x2; f1 = f2; x2 = lo + g * (hi - lo); f2 = f(x2); }
      }
      const us = f1 < f2 ? x1 : x2;
      const ds = Math.min(f1, f2, bd);
      const u = ds === bd ? bu : us;
      if (!(ds < t)) continue;
      const q = ev(A, u);
      if (comune.some((p) => dist(p, q) <= 2 * t)) continue;
      // Se taie acolo? Latura punctelor lui A față de tangenta lui B, de o parte și de alta a apropierii.
      const sB = distSeg(B, q).t, pB = ev(B, sB), tB = d1(B, sB);
      const latura = (w: number): number => { const r = ev(A, Math.max(0, Math.min(1, w))); return tB.x * (r.y - pB.y) - tB.y * (r.x - pB.x); };
      const st = latura(u - 1e-3), dr = latura(u + 1e-3);
      if ((st > 0 && dr < 0) || (st < 0 && dr > 0)) continue;
      return `segmentele ${A.ci}/${A.vi} și ${B.ci}/${B.vi} la ${ds.toExponential(2)} lângă (${q.x}, ${q.y}), fără să se taie (τ ${t.toExponential(2)})`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Praful ieșirii (ADR 0037 §11, la ușa SVG, sub-felia 2.3c-1): contururile regiunii adevărate cu diagonala cutiei exacte
// sub rezoluție, găsite prin aranjamentul LOCAL al intrării (o fereastră pătrată în jurul unui punct), nu prin cel întreg.

/** Un contur de praf al regiunii adevărate: polilinia lui (umplerea în stânga), cutia, diagonala, aria cu semn, perimetrul. */
export type BuclaPraf = { pts: P[]; cutie: Cutie; diag: number; arie: number; perimetru: number };

/** Eroarea de coardă a poliliniilor locale (mm). */
const EPS_POLI = 1e-11;

type RunL = { pts: P[]; t0: number; t1: number };
type SegL = { a: P; b: P; run: number; k: number };
/** O bucată a frontierei candidate: punctele, segmentul-sursă al fiecărei muchii (în `segs`), capetele. */
type PiesaL = { pts: P[]; seg: number[]; de: string; la: string; deschisa: boolean; folosita: boolean };

const cheieP = (p: P): string => `${p.x},${p.y}`;

/** Bucățile primitivei care ating cutia W, ca polilinii (capetele t = 0 / 1 sunt exact vârfurile primitivei). */
function poliliniiInFereastra(s: Prim, W: Cutie, eps: number): RunL[] {
  const runs: RunL[] = [];
  let cur: RunL | null = null;
  const pct = (t: number): P => (t === 0 ? s.a : t === 1 ? s.b : ev(s, t));
  const cutieBuc = (t0: number, t1: number): { c: Cutie; plat: boolean } => {
    const p0 = pct(t0), p1 = pct(t1);
    if (s.tip === 'L') return { c: { x0: Math.min(p0.x, p1.x), y0: Math.min(p0.y, p1.y), x1: Math.max(p0.x, p1.x), y1: Math.max(p0.y, p1.y) }, plat: true };
    if (s.tip === 'A') {
      const unghi = Math.abs(s.sw) * (t1 - t0);
      const sag = s.r * (1 - Math.cos(unghi / 2));
      // Un arc de cel mult o jumătate stă la cel mult săgeata lui de coardă.
      const e = unghi <= Math.PI ? sag : 2 * s.r;
      return { c: { x0: Math.min(p0.x, p1.x) - e, y0: Math.min(p0.y, p1.y) - e, x1: Math.max(p0.x, p1.x) + e, y1: Math.max(p0.y, p1.y) + e }, plat: unghi <= Math.PI && sag <= eps };
    }
    const q = subCurba(s, t0, t1);
    const xs = q.map((u) => u.x), ys = q.map((u) => u.y);
    const c = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
    // Abaterea curbei de la coardă ≤ abaterea punctelor de control (învelitoarea convexă).
    const a = q[0], b = q[3], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
    const dl = (u: P): number => (L > 0 ? Math.abs((u.x - a.x) * dy - (u.y - a.y) * dx) / L : dist(u, a));
    return { c, plat: Math.max(dl(q[1]), dl(q[2])) <= eps };
  };
  const rec = (t0: number, t1: number, adanc: number): void => {
    const { c, plat } = cutieBuc(t0, t1);
    if (!seAting(c, W)) { cur = null; return; }
    if (plat || adanc >= 52) {
      if (cur === null) { cur = { pts: [pct(t0)], t0, t1 }; runs.push(cur); }
      cur.pts.push(pct(t1));
      cur.t1 = t1;
      return;
    }
    const m = (t0 + t1) / 2;
    rec(t0, m, adanc + 1);
    rec(m, t1, adanc + 1);
  };
  rec(0, 1, 0);
  return runs;
}

/** Distanța punct – segment. */
function distPS(p: P, a: P, b: P): number {
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
}

/** Polilinia închisă `pts` înconjoară q (înfășurarea ≠ 0)? */
function inPoligon(pts: readonly P[], q: P): boolean {
  let w = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i] as P, b = pts[(i + 1) % pts.length] as P;
    const o = (b.x - a.x) * (q.y - a.y) - (q.x - a.x) * (b.y - a.y);
    if (a.y <= q.y) { if (b.y > q.y && o > 0) w++; }
    else if (b.y <= q.y && o < 0) w--;
  }
  return w !== 0;
}
function distPoligon(pts: readonly P[], q: P): number {
  let d = Infinity;
  for (let i = 0; i < pts.length; i++) d = Math.min(d, distPS(q, pts[i] as P, pts[(i + 1) % pts.length] as P));
  return d;
}

/**
 * Buclele frontierei regiunii adevărate (intrarea sub regulă) din fereastra pătrată de semilatură R în jurul lui c,
 * închise în fereastră, cu diagonala cutiei sub `rezolutie` și mai groase decât τ: contururile de praf de acolo.
 */
function bucleInFereastra(ctx: Context, c: P, R: number, rezolutie: number): BuclaPraf[] {
  const W: Cutie = { x0: c.x - R, y0: c.y - R, x1: c.x + R, y1: c.y + R };
  const marg = 0.02 * R;
  const We: Cutie = { x0: W.x0 - marg, y0: W.y0 - marg, x1: W.x1 + marg, y1: W.y1 + marg };
  const g = grupLa(ctx, c);
  const eta = Math.max(1e-12 * g.D, 8 * ulp(g.M));
  const prag = 8 * (EPS_POLI + eta);
  // 1. Poliliniile primitivelor care ating fereastra.
  const runs: RunL[] = [];
  for (const x of toateAproape(ctx.dS, c, R * Math.SQRT2 + marg)) runs.push(...poliliniiInFereastra(ctx.sS[x.k] as Prim, We, EPS_POLI));
  const segs: SegL[] = [];
  const bazaRun: number[] = [];
  runs.forEach((r, ri) => { bazaRun.push(segs.length); for (let k = 0; k + 1 < r.pts.length; k++) segs.push({ a: r.pts[k] as P, b: r.pts[k + 1] as P, run: ri, k }); });
  // 2. Grila segmentelor (pe fereastra lărgită).
  const G = 128, cs = (We.x1 - We.x0) / G;
  const cl = (v: number): number => Math.max(0, Math.min(G - 1, v));
  const cel = new Map<number, number[]>();
  segs.forEach((sg, i) => {
    const i0 = cl(Math.floor((Math.min(sg.a.x, sg.b.x) - We.x0) / cs)), i1 = cl(Math.floor((Math.max(sg.a.x, sg.b.x) - We.x0) / cs));
    const j0 = cl(Math.floor((Math.min(sg.a.y, sg.b.y) - We.y0) / cs)), j1 = cl(Math.floor((Math.max(sg.a.y, sg.b.y) - We.y0) / cs));
    for (let x = i0; x <= i1; x++) for (let y = j0; y <= j1; y++) { const k = x * 4096 + y; let l = cel.get(k); if (l === undefined) { l = []; cel.set(k, l); } l.push(i); }
  });
  // 3. Încrucișările (și atingerile într-un vârf al poliliniei): tăieturile pe segment, cu punctul comun (aceeași cheie).
  const taieturi = new Map<number, Array<{ u: number; p: P }>>();
  const adauga = (i: number, u: number, p: P): void => { let l = taieturi.get(i); if (l === undefined) { l = []; taieturi.set(i, l); } l.push({ u, p }); };
  const vazut = new Set<number>();
  const TOL_U = 1e-12;
  for (const l of cel.values()) {
    for (let x = 0; x < l.length; x++) for (let y = x + 1; y < l.length; y++) {
      const i = Math.min(l[x] as number, l[y] as number), j = Math.max(l[x] as number, l[y] as number);
      const ch = i * segs.length + j;
      if (vazut.has(ch)) continue;
      vazut.add(ch);
      const A = segs[i] as SegL, B = segs[j] as SegL;
      if (A.run === B.run && Math.abs(A.k - B.k) <= 1) continue;
      if (egale(A.a, B.a) || egale(A.a, B.b) || egale(A.b, B.a) || egale(A.b, B.b)) continue;
      const rx = A.b.x - A.a.x, ry = A.b.y - A.a.y, sx = B.b.x - B.a.x, sy = B.b.y - B.a.y;
      const den = rx * sy - ry * sx;
      if (den === 0) continue;
      const qx = B.a.x - A.a.x, qy = B.a.y - A.a.y;
      let ua = (qx * sy - qy * sx) / den, ub = (qx * ry - qy * rx) / den;
      if (ua < -TOL_U || ua > 1 + TOL_U || ub < -TOL_U || ub > 1 + TOL_U) continue;
      ua = ua < TOL_U ? 0 : ua > 1 - TOL_U ? 1 : ua;
      ub = ub < TOL_U ? 0 : ub > 1 - TOL_U ? 1 : ub;
      const p = ua === 0 ? A.a : ua === 1 ? A.b : ub === 0 ? B.a : ub === 1 ? B.b : { x: A.a.x + ua * rx, y: A.a.y + ua * ry };
      adauga(i, ua, p);
      adauga(j, ub, p);
    }
  }
  // 4. Bucățile: fiecare polilinie tăiată la încrucișări; un capăt care nu e vârf al primitivei (ieșirea din fereastră), sau
  // care stă în afara ferestrei, e deschis.
  const piese: PiesaL[] = [];
  const inW = (p: P): boolean => p.x > W.x0 && p.x < W.x1 && p.y > W.y0 && p.y < W.y1;
  runs.forEach((r, ri) => {
    const baza = bazaRun[ri] as number;
    let cur: P[] = [r.pts[0] as P];
    let curSeg: number[] = [];
    let deschisStart = r.t0 !== 0;
    const inchide = (deschisCapat: boolean): void => {
      if (cur.length >= 2) {
        const a = cur[0] as P, b = cur[cur.length - 1] as P;
        piese.push({ pts: cur, seg: curSeg, de: cheieP(a), la: cheieP(b), deschisa: deschisStart || deschisCapat || !inW(a) || !inW(b), folosita: false });
      }
    };
    const nou = (p: P): void => { cur = [p]; curSeg = []; deschisStart = false; };
    for (let k = 0; k + 1 < r.pts.length; k++) {
      const t = (taieturi.get(baza + k) ?? []).slice().sort((u, v) => u.u - v.u);
      for (const x of t) {
        if (egale(x.p, cur[cur.length - 1] as P)) {
          // Tăietura în vârful curent (u = 0, sau o dublură): bucata se termină acolo.
          if (cur.length >= 2) { inchide(false); nou(x.p); }
          continue;
        }
        if (x.u === 1) continue;
        cur.push(x.p);
        curSeg.push(baza + k);
        inchide(false);
        nou(x.p);
      }
      const urm = r.pts[k + 1] as P;
      if (!egale(urm, cur[cur.length - 1] as P)) { cur.push(urm); curSeg.push(baza + k); }
      if (t.some((x) => x.u === 1) && cur.length >= 2) { inchide(false); nou(urm); }
    }
    inchide(r.t1 !== 1);
  });
  // 5. Frontiera: fiecare bucată judecată cu înfășurarea EXACTĂ a intrării, de o parte și de alta a segmentului ei cel mai
  // lung, la un sfert din segment și din cea mai apropiată altă polilinie; orientată cu umplerea în stânga. O bucată pe care
  // judecata nu se poate face (prea aproape de alta, sau ambiguă) e deschisă: bucla ei nu scutește nimic.
  const vecinMin = (m: P, r0: number, propriu: number): number => {
    let d = r0;
    const sp = segs[propriu] as SegL;
    const i0 = cl(Math.floor((m.x - r0 - We.x0) / cs)), i1 = cl(Math.floor((m.x + r0 - We.x0) / cs));
    const j0 = cl(Math.floor((m.y - r0 - We.y0) / cs)), j1 = cl(Math.floor((m.y + r0 - We.y0) / cs));
    for (let x = i0; x <= i1; x++) for (let y = j0; y <= j1; y++) for (const i of cel.get(x * 4096 + y) ?? []) {
      const sg = segs[i] as SegL;
      // Segmentul-sursă al muchiei și vecinii lui din aceeași polilinie nu contează.
      if (i === propriu || (sg.run === sp.run && Math.abs(sg.k - sp.k) <= 1)) continue;
      d = Math.min(d, distPS(m, sg.a, sg.b));
    }
    return d;
  };
  const frontiera: PiesaL[] = [];
  for (const pc of piese) {
    let best = 0, L = -1;
    for (let k = 0; k + 1 < pc.pts.length; k++) { const l = dist(pc.pts[k] as P, pc.pts[k + 1] as P); if (l > L) { L = l; best = k; } }
    const a = pc.pts[best] as P, b = pc.pts[best + 1] as P;
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
    const delta = Math.min(L / 4, vecinMin(m, L, pc.seg[best] as number) / 4);
    if (!(delta >= prag)) { pc.deschisa = true; frontiera.push(pc); continue; }
    const st = infasurare(ctx.wS, { x: m.x + delta * nx, y: m.y + delta * ny }, eta);
    const dr = infasurare(ctx.wS, { x: m.x - delta * nx, y: m.y - delta * ny }, eta);
    if (st.amb || dr.amb) { pc.deschisa = true; frontiera.push(pc); continue; }
    const fs = umple(st.w, ctx.rule), fd = umple(dr.w, ctx.rule);
    if (fs === fd) continue;
    if (!fs) { pc.pts = pc.pts.slice().reverse(); const t = pc.de; pc.de = pc.la; pc.la = t; }
    frontiera.push(pc);
  }
  // 6. Buclele: din capătul fiecărei bucăți, următoarea e prima la dreapta (cea mai mică rotire în sensul acelor de la
  // direcția întoarsă), deci contururile care se ating într-un vârf ies separate (ADR 0036 §7).
  const iese = new Map<string, PiesaL[]>();
  for (const pc of frontiera) { const l = iese.get(pc.de) ?? []; l.push(pc); iese.set(pc.de, l); }
  const ung = (u: P): number => Math.atan2(u.y, u.x);
  const bucle: BuclaPraf[] = [];
  for (const start of frontiera) {
    if (start.folosita || start.deschisa) continue;
    const lant: PiesaL[] = [];
    let pc: PiesaL = start, inchisa = false, buna = true;
    for (let pas = 0; pas < 100_000; pas++) {
      pc.folosita = true;
      lant.push(pc);
      if (pc.deschisa) { buna = false; break; }
      const n = pc.pts.length;
      const din = { x: (pc.pts[n - 2] as P).x - (pc.pts[n - 1] as P).x, y: (pc.pts[n - 2] as P).y - (pc.pts[n - 1] as P).y };
      let urm: PiesaL | null = null, bestCw = Infinity;
      for (const q of iese.get(pc.la) ?? []) {
        const spre = { x: (q.pts[1] as P).x - (q.pts[0] as P).x, y: (q.pts[1] as P).y - (q.pts[0] as P).y };
        let cw = ung(din) - ung(spre);
        cw = ((cw % DOIPI) + DOIPI) % DOIPI;
        if (cw === 0) cw = DOIPI;
        if (cw < bestCw) { bestCw = cw; urm = q; }
      }
      if (urm === null) { buna = false; break; }
      if (urm === start) { inchisa = true; break; }
      if (urm.folosita) { buna = false; break; }
      pc = urm;
    }
    if (!inchisa || !buna) continue;
    const pts: P[] = [];
    for (const x of lant) for (let k = 0; k + 1 < x.pts.length; k++) pts.push(x.pts[k] as P);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, A = 0, Lp = 0;
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length] as P;
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
      A += (p.x * q.y - q.x * p.y) / 2;
      Lp += dist(p, q);
    });
    const diag = Math.hypot(x1 - x0, y1 - y0);
    // Mai groasă decât τ (ALEGERE: raza înscrisă 2·aria / perimetrul peste 2τ, deci lățimea peste ~4τ): o trăsătură mai
    // subțire o închide, o contopește sau o refuză normalizarea (ADR 0036 §4, §8), deci nu e un contur al ieșirii.
    if (diag < rezolutie && Lp > 0 && (2 * Math.abs(A)) / Lp > 2 * g.tau) bucle.push({ pts, cutie: { x0, y0, x1, y1 }, diag, arie: A, perimetru: Lp });
  }
  return bucle;
}

/** Adaugă contururile de praf noi, fără dubluri (aceeași cutie la 1e-9 mm și aceeași arie la 1e-6 relativ). */
function adaugaBucle(toate: BuclaPraf[], noi: readonly BuclaPraf[]): void {
  const e = 1e-9;
  for (const b of noi) {
    const dublu = toate.some((x) => Math.abs(x.cutie.x0 - b.cutie.x0) <= e && Math.abs(x.cutie.y0 - b.cutie.y0) <= e && Math.abs(x.cutie.x1 - b.cutie.x1) <= e
      && Math.abs(x.cutie.y1 - b.cutie.y1) <= e && Math.abs(x.arie - b.arie) <= 1e-6 * Math.abs(b.arie));
    if (!dublu) toate.push(b);
  }
}

/** Punctul q stă într-un contur de praf, sau la cel mult d de el? */
function inPraf(bucle: readonly BuclaPraf[], q: P, d: number): boolean {
  return bucle.some((b) => q.x >= b.cutie.x0 - d && q.x <= b.cutie.x1 + d && q.y >= b.cutie.y0 - d && q.y <= b.cutie.y1 + d && (inPoligon(b.pts, q) || distPoligon(b.pts, q) <= d));
}

/**
 * Ferestrele în jurul semințelor (cel mult `maxFerestre`); o sămânță la cel mult R − rezoluția (pe fiecare axă) de un
 * centru deja calculat e acoperită: contururile de praf care o conțin stau întregi în fereastra aceea. Întoarce câte
 * ferestre a calculat.
 */
function cautaPraf(ctx: Context, seminte: readonly P[], rezolutie: number, bucle: BuclaPraf[], maxFerestre: number): number {
  const R = 1.25 * rezolutie;
  const centre: P[] = [];
  for (const q of seminte) {
    if (centre.length >= maxFerestre) break;
    if (centre.some((c) => Math.max(Math.abs(c.x - q.x), Math.abs(c.y - q.y)) <= R - rezolutie)) continue;
    // Mai departe de rezoluție de frontiera intrării: niciun contur de praf nu-l poate conține.
    if (!(celMaiAproape(ctx.dS, q).d <= rezolutie)) continue;
    centre.push(q);
    adaugaBucle(bucle, bucleInFereastra(ctx, q, R, rezolutie));
  }
  return centre.length;
}

/**
 * Toate contururile de praf ale regiunii adevărate (intrarea sub regulă): ferestrele în fiecare încrucișare a intrării.
 * Un contur de praf nu e o cale întreagă a intrării (ușa sare subcăile-praf înaintea normalizării), deci trece printr-o
 * încrucișare a ei (și a unei cubice cu ea însăși).
 */
export function prafAdevarat(intrare: readonly CaleN[], regula: 'nonzero' | 'evenodd', rezolutie: number, opt: OptiuniN = {}): BuclaPraf[] {
  const ctx = context(intrare, regula, opt);
  const bucle: BuclaPraf[] = [];
  cautaPraf(ctx, intersectiiAprox(ctx.sS).map((x) => x.p), rezolutie, bucle, 100_000);
  return bucle;
}
