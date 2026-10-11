import { arc, cerculArcului, LINIE, numarSegmente, segment, type Contur, type Punct, type Varf } from './contur.ts';
import { distantaLaContur } from './distanta.ts';
import { RAZA_MAXIMA_ARC, TINTA_APROXIMARE } from './toleranta.ts';

/**
 * Biarcele (ADR 0033): o cubică devine un lanț de linii și arce, cu abaterea Hausdorff în ambele sensuri cel mult
 * toleranța. E singura aproximare de pe drumul spre mașină (ADR 0006). Desenul și exportul păstrează cubicele exacte.
 */
export type RezultatBiarce =
  | { readonly ok: true; readonly varfuri: readonly Varf[]; readonly bucati: number }
  | { readonly ok: false; readonly motiv: string };

/** Peste atâtea bucăți pe o cubică, refuz explicit (ADR 0033 §5): niciodată trunchiere tăcută. */
export const PLAFON_BUCATI = 4096;

/** Câte puncte se măsoară pe fiecare sens, pe fiecare bucată (ADR 0033 §6). */
const ESANTIOANE = 32;

/** Pașii secțiunii de aur cu care se rafinează fiecare maxim local al abaterii eșantionate (ADR 0033 §6). */
const PASI_RAFINARE = 20;

/** Puncte mai apropiate de atât sunt același punct (cubica degenerată, coarda nulă). */
const EPS_PUNCT = 1e-9;

type Cubica = { readonly a: Punct; readonly c1: Punct; readonly c2: Punct; readonly b: Punct };

const scade = (u: Punct, v: Punct): Punct => ({ x: u.x - v.x, y: u.y - v.y });
const scalar = (u: Punct, v: Punct): number => u.x * v.x + u.y * v.y;
const cruce = (u: Punct, v: Punct): number => u.x * v.y - u.y * v.x;
const lungime = (u: Punct): number => Math.hypot(u.x, u.y);
const lerp = (u: Punct, v: Punct, t: number): Punct => ({ x: u.x + (v.x - u.x) * t, y: u.y + (v.y - u.y) * t });

function punctCubica(q: Cubica, t: number): Punct {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * q.a.x + b * q.c1.x + c * q.c2.x + d * q.b.x, y: a * q.a.y + b * q.c1.y + c * q.c2.y + d * q.b.y };
}

function derivata(q: Cubica, t: number): Punct {
  const u = 1 - t;
  return {
    x: 3 * (u * u * (q.c1.x - q.a.x) + 2 * u * t * (q.c2.x - q.c1.x) + t * t * (q.b.x - q.c2.x)),
    y: 3 * (u * u * (q.c1.y - q.a.y) + 2 * u * t * (q.c2.y - q.c1.y) + t * t * (q.b.y - q.c2.y)),
  };
}

function derivata2(q: Cubica, t: number): Punct {
  const u = 1 - t;
  return {
    x: 6 * (u * (q.c2.x - 2 * q.c1.x + q.a.x) + t * (q.b.x - 2 * q.c2.x + q.c1.x)),
    y: 6 * (u * (q.c2.y - 2 * q.c1.y + q.a.y) + t * (q.b.y - 2 * q.c2.y + q.c1.y)),
  };
}

/** Forma polară (blossom) P(u, v, w): bucata [t0, t1] are punctele de control P(t0,t0,t0), P(t0,t0,t1), P(t0,t1,t1), P(t1,t1,t1). */
function polar(q: Cubica, u: number, v: number, w: number): Punct {
  const a1 = [lerp(q.a, q.c1, u), lerp(q.c1, q.c2, u), lerp(q.c2, q.b, u)] as const;
  const a2 = [lerp(a1[0], a1[1], v), lerp(a1[1], a1[2], v)] as const;
  return lerp(a2[0], a2[1], w);
}

/** Distanța de la p la segmentul [a, b]. */
function laSegment(p: Punct, a: Punct, b: Punct): number {
  const d = scade(b, a);
  const l2 = scalar(d, d);
  const t = l2 > 0 ? Math.max(0, Math.min(1, scalar(scade(p, a), d) / l2)) : 0;
  return lungime(scade(p, lerp(a, b, t)));
}

/**
 * Rădăcinile reale ale lui A·t² + B·t + C, cu coeficienții judecați față de cel mai mare. Sub `zero`, polinomul e nul
 * (zgomotul de rotunjire n-are rădăcini).
 */
function radacini2(A: number, B: number, C: number, zero = 0): number[] {
  const scara = Math.max(Math.abs(A), Math.abs(B), Math.abs(C));
  if (scara <= zero) return [];
  if (Math.abs(A) > 1e-12 * scara) {
    const D = B * B - 4 * A * C;
    if (D < 0) return [];
    // Forma fără anulare: −B ± √D scade două numere apropiate când B² ≫ |4AC|; q are mereu semnul lui −B.
    const q = -(B + (B < 0 ? -1 : 1) * Math.sqrt(D)) / 2;
    return q === 0 ? [0, 0] : [q / A, C / q];
  }
  return Math.abs(B) > 1e-12 * scara ? [-C / B] : [];
}

/** Lungimea celei mai lungi laturi a poligonului de control: scara la care se judecă zero-urile. */
const scaraCubicei = (q: Cubica): number =>
  Math.max(lungime(scade(q.c1, q.a)), lungime(scade(q.c2, q.c1)), lungime(scade(q.b, q.c2)));

/**
 * Rădăcinile lui B′x și B′y, pe rând (extremele pe axe). B′/3 = d0 + 2t(d1 − d0) + t²(d0 − 2d1 + d2) pe fiecare
 * componentă. O componentă identic zero (B′y pe o orizontală) are după o rotație doar zgomot, de ordinul 1e-16 × scara.
 */
function radaciniPeAxe(q: Cubica): { readonly x: number[]; readonly y: number[] } {
  const d0 = scade(q.c1, q.a), d1 = scade(q.c2, q.c1), d2 = scade(q.b, q.c2);
  const zero = 1e-12 * scaraCubicei(q);
  const pe = (k: 'x' | 'y'): number[] => radacini2(d0[k] - 2 * d1[k] + d2[k], 2 * (d1[k] - d0[k]), d0[k], zero);
  return { x: pe('x'), y: pe('y') };
}

/** Valorile din (lo, hi), sortate. Două aproape egale dau o bucată cu coarda nulă, pe care regula liniei o sare. */
function inInterval(ts: readonly number[], lo: number, hi: number): number[] {
  return ts.filter((t) => t > lo + 1e-9 && t < hi - 1e-9).sort((u, v) => u - v);
}

/**
 * Tăieturile contractului (ADR 0033 §4), din (0, 1): inflexiunile, unde cross(B′, B″) = 0 (o expresie de gradul 2 în
 * t), și vârfurile, unde B′ = 0. Un vârf e o rădăcină simplă a lui B′x și a lui B′y deodată, deci se caută printre
 * rădăcinile componentei mai mari, păstrate unde și B′ se anulează. Așa nu-l pierde rotunjirea (D puțin sub 0 la rădăcina
 * dublă a lui cross), iar pe o dreaptă, unde cross e identic zero, întoarcerile se găsesc tot.
 */
function taieturi(q: Cubica): number[] {
  const ax = -q.a.x + 3 * q.c1.x - 3 * q.c2.x + q.b.x, ay = -q.a.y + 3 * q.c1.y - 3 * q.c2.y + q.b.y;
  const bx = q.a.x - 2 * q.c1.x + q.c2.x, by = q.a.y - 2 * q.c1.y + q.c2.y;
  const cx = q.c1.x - q.a.x, cy = q.c1.y - q.a.y;
  const scara = scaraCubicei(q);
  const inflexiuni = radacini2(ax * by - ay * bx, ax * cy - ay * cx, bx * cy - by * cx, 1e-12 * scara * scara);
  const r = radaciniPeAxe(q);
  const varfuri = [...r.x, ...r.y].filter((t) => lungime(derivata(q, t)) <= 3e-9 * scara);
  return inInterval([...inflexiuni, ...varfuri], 0, 1);
}

/**
 * Extremele pe axe din (t0, t1): după tăietura lor, bucata e monotonă pe x și pe y, deci tangenta ei stă într-un cadran
 * (se rotește cel mult 90°) și nu se poate întoarce între două eșantioane (recenzia 2.7a: 18–35 × tol fără ea).
 */
function extremeIn(q: Cubica, t0: number, t1: number): number[] {
  const r = radaciniPeAxe(q);
  return inInterval([...r.x, ...r.y], t0, t1);
}

/**
 * Direcția de mers în t, pe partea dată: la început (+1) sau la sfârșit (−1) de bucată. Unde B′ = 0 (un vârf), limita e
 * ±B″; unde și B″ = 0, coarda.
 */
function tangenta(q: Cubica, t: number, parte: 1 | -1, coarda: Punct): Punct | null {
  const d = derivata(q, t);
  const scara = Math.max(lungime(scade(q.c1, q.a)), lungime(scade(q.c2, q.c1)), lungime(scade(q.b, q.c2)), EPS_PUNCT);
  if (lungime(d) > 1e-9 * scara) return { x: d.x / lungime(d), y: d.y / lungime(d) };
  const d2 = derivata2(q, t);
  if (lungime(d2) > 1e-9 * scara) return { x: (parte * d2.x) / lungime(d2), y: (parte * d2.y) / lungime(d2) };
  const l = lungime(coarda);
  return l > 0 ? { x: coarda.x / l, y: coarda.y / l } : null;
}

/** Arcul de la A la B cu tangenta de pornire T: unghiul tangentă–coardă φ dă baleiajul 2φ, deci bulge = tan(φ / 2). */
function bulgeDinStart(A: Punct, T: Punct, B: Punct): number {
  const c = scade(B, A);
  return Math.tan(Math.atan2(cruce(T, c), scalar(T, c)) / 2);
}

/** Arcul de la A la B cu tangenta de sosire T: unghiul coardă–tangentă e același, prin simetrie. */
function bulgeDinSosire(A: Punct, B: Punct, T: Punct): number {
  const c = scade(B, A);
  return Math.tan(Math.atan2(cruce(c, T), scalar(c, T)) / 2);
}

/**
 * Segmentul de la A la B cu bulge-ul dat: arc, sau linie când e plat ori raza lui trece de `RAZA_MAXIMA_ARC` (ADR 0033
 * §4). Se hotărăște înainte de măsurare, deci lanțul măsurat e cel emis. Altfel postul ar aproxima arcul a doua oară, iar
 * razele de 1e6–1e12 mm ale arcelor aproape drepte își pierd și precizia distanței (centrul e la fel de departe).
 */
function arcSauLinie(A: Punct, B: Punct, bulge: number): Varf {
  const raza = (lungime(scade(B, A)) * (1 + bulge * bulge)) / (4 * Math.abs(bulge));
  return { p: A, s: Math.abs(bulge) < 1e-12 || !(raza <= RAZA_MAXIMA_ARC) ? LINIE : arc(bulge) };
}

/**
 * Biarcul cu tangente egale (Bolton): de la p0 (tangenta t0) la p1 (tangenta t1), prin J. Întoarce vârfurile [p0, J], cu
 * arcele lor, sau null dacă nu există. Pe o bucată monotonă (ADR 0033 §4), J nu cade pe un capăt.
 */
function biarc(p0: Punct, t0: Punct, p1: Punct, t1: Punct): Varf[] | null {
  const v = scade(p1, p0);
  const t = { x: t0.x + t1.x, y: t0.y + t1.y };
  const vt = scalar(v, t), vv = scalar(v, v), tt = scalar(t, t);
  const a = tt - 4;
  let d: number;
  if (Math.abs(a) < 1e-12) {
    const num = 4 * scalar(v, t1);
    if (Math.abs(num) < 1e-15) return null;
    d = vv / num;
  } else {
    const disc = vt * vt - a * vv;
    if (disc < 0) return null;
    d = (vt - Math.sqrt(disc)) / a;
  }
  if (!(d > 0) || !Number.isFinite(d)) return null;
  const j = { x: (p0.x + p1.x + d * (t0.x - t1.x)) / 2, y: (p0.y + p1.y + d * (t0.y - t1.y)) / 2 };
  const b1 = bulgeDinStart(p0, t0, j), b2 = bulgeDinSosire(j, p1, t1);
  if (!Number.isFinite(b1) || !Number.isFinite(b2) || Math.abs(b1) > 1 || Math.abs(b2) > 1) return null;
  return [arcSauLinie(p0, j, b1), arcSauLinie(j, p1, b2)];
}

/** Distanța de la p la bucata [t0, t1] a cubicei: cea mai apropiată dintre 16 eșantioane, rafinată cu Newton. */
function laCubica(q: Cubica, p: Punct, t0: number, t1: number): number {
  let tMin = t0, dMin = Infinity;
  for (let i = 0; i <= 16; i++) {
    const t = t0 + ((t1 - t0) * i) / 16;
    const d = lungime(scade(punctCubica(q, t), p));
    if (d < dMin) { dMin = d; tMin = t; }
  }
  let t = tMin;
  for (let k = 0; k < 12; k++) {
    const r = scade(punctCubica(q, t), p);
    const d1 = derivata(q, t), d2 = derivata2(q, t);
    const f = scalar(r, d1), fp = scalar(d1, d1) + scalar(r, d2);
    if (!(Math.abs(fp) > 0)) break;
    const tn = Math.max(t0, Math.min(t1, t - f / fp));
    if (Math.abs(tn - t) < 1e-15) break;
    t = tn;
  }
  return Math.min(dMin, lungime(scade(punctCubica(q, t), p)));
}

/** Punctul de la fracția f pe segmentul de la a la b (linie sau arc). */
function peSegment(a: Punct, b: Punct, s: Varf['s'], f: number): Punct {
  if (s.tip !== 'A') return lerp(a, b, f);
  const k = cerculArcului(a, b, s.bulge);
  const u = k.start + k.baleiaj * f;
  return { x: k.centru.x + k.raza * Math.cos(u), y: k.centru.y + k.raza * Math.sin(u) };
}

/** Maximul lui g pe [lo, hi], prin secțiunea de aur pornită de la valoarea deja văzută `vazut`. */
function maximAur(g: (x: number) => number, lo: number, hi: number, vazut: number): number {
  const r = (Math.sqrt(5) - 1) / 2;
  let a = lo, b = hi, x1 = b - r * (b - a), x2 = a + r * (b - a), g1 = g(x1), g2 = g(x2);
  let max = Math.max(vazut, g1, g2);
  for (let k = 0; k < PASI_RAFINARE; k++) {
    if (g1 < g2) { a = x1; x1 = x2; g1 = g2; x2 = a + r * (b - a); g2 = g(x2); }
    else { b = x2; x2 = x1; g2 = g1; x1 = b - r * (b - a); g1 = g(x1); }
    max = Math.max(max, g1, g2);
  }
  return max;
}

/**
 * Abaterea dintre bucata [t0, t1] și lanțul `varfuri` (de la p0 la p1), în ambele sensuri (ADR 0033 §6): `ESANTIOANE` de
 * puncte pe fiecare sens, plus capetele; apoi fiecare maxim local se rafinează, fiindcă vârful abaterii poate cădea între
 * eșantioane (recenzia 2.7a: +13 % pe un singur biarc). Peste `tinta` din eșantioane, bucata cade oricum: nu se rafinează.
 */
function abatere(q: Cubica, t0: number, t1: number, varfuri: readonly Varf[], p1: Punct, tinta: number): number {
  const lant: Contur = { inchis: false, varfuri: [...varfuri, { p: p1, s: LINIE }] };
  const siruri: Array<{ readonly g: (x: number) => number; readonly x: readonly number[]; readonly d: readonly number[] }> = [];
  const sir = (g: (x: number) => number, lo: number, hi: number): void => {
    const x = Array.from({ length: ESANTIOANE + 1 }, (_, i) => lo + ((hi - lo) * i) / ESANTIOANE);
    siruri.push({ g, x, d: x.map(g) });
  };
  sir((t) => distantaLaContur(punctCubica(q, t), lant), t0, t1);
  for (let k = 0; k < numarSegmente(lant); k++) {
    const { a, b, s } = segment(lant, k);
    sir((f) => laCubica(q, peSegment(a, b, s, f), t0, t1), 0, 1);
  }
  let e = Math.max(...siruri.map((z) => Math.max(...z.d)));
  if (e > tinta) return e;
  for (const { g, x, d } of siruri) {
    for (let i = 0; i <= ESANTIOANE; i++) {
      const di = d[i] as number;
      if (di < (d[i - 1] ?? 0) || di < (d[i + 1] ?? 0)) continue;
      e = Math.max(e, maximAur(g, x[Math.max(0, i - 1)] as number, x[Math.min(ESANTIOANE, i + 1)] as number, di));
    }
  }
  return e;
}

/**
 * Cubica de la a la b (control c1, c2) ca lanț de linii și arce sub `tol` (ADR 0033 §2–§5): vârfurile lanțului, de la a,
 * fiecare cu segmentul lui; b nu e inclus (e vârful următor al conturului).
 */
export function cubicaInArce(a: Punct, c1: Punct, c2: Punct, b: Punct, tol: number): RezultatBiarce {
  if (!(Number.isFinite(tol) && tol > 0)) return { ok: false, motiv: `toleranța biarcelor trebuie să fie un număr pozitiv (${tol})` };
  for (const p of [a, c1, c2, b]) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return { ok: false, motiv: 'cubica are un punct care nu e un număr finit' };
  }
  const q: Cubica = { a, c1, c2, b };
  if ([c1, c2, b].every((p) => lungime(scade(p, a)) < EPS_PUNCT)) return { ok: true, varfuri: [], bucati: 0 };
  const tinta = TINTA_APROXIMARE * tol;
  const rez: Varf[] = [];
  let bucati = 0;
  let depasit = false;
  let subRezolutie = false;
  const punct = (t: number): Punct => (t === 0 ? a : t === 1 ? b : punctCubica(q, t));
  const potriveste = (t0: number, t1: number, deTaiat: boolean): void => {
    if (depasit) return;
    const p0 = punct(t0), p1 = punct(t1);
    const k1 = polar(q, t0, t0, t1), k2 = polar(q, t0, t1, t1);
    // O bucată plată e o linie: curba stă în învelitoarea convexă, la cel mult atât de coardă, în ambele sensuri.
    if (Math.max(laSegment(k1, p0, p1), laSegment(k2, p0, p1)) <= tinta) {
      if (lungime(scade(p1, p0)) < EPS_PUNCT) return;
      bucati++;
      if (bucati > PLAFON_BUCATI) { depasit = true; return; }
      rez.push({ p: p0, s: LINIE });
      return;
    }
    // O bucată care nu e plată se taie întâi la extremele pe axe: biarcele se potrivesc doar pe bucăți monotone.
    const ex = deTaiat ? extremeIn(q, t0, t1) : [];
    if (ex.length > 0) {
      const ts = [t0, ...ex, t1];
      for (let i = 0; i + 1 < ts.length; i++) potriveste(ts[i] as number, ts[i + 1] as number, false);
      return;
    }
    const coarda = scade(p1, p0);
    const ta = tangenta(q, t0, 1, coarda), tb = tangenta(q, t1, -1, coarda);
    const cand = ta && tb && lungime(coarda) >= EPS_PUNCT ? biarc(p0, ta, p1, tb) : null;
    if (cand && abatere(q, t0, t1, cand, p1, tinta) <= tinta) {
      bucati += cand.length;
      if (bucati > PLAFON_BUCATI) { depasit = true; return; }
      for (const v of cand) rez.push(v);
      return;
    }
    if (t1 - t0 < 1e-12) { depasit = true; subRezolutie = true; return; }
    if (bucati + 2 > PLAFON_BUCATI) { depasit = true; return; }
    const tm = (t0 + t1) / 2;
    potriveste(t0, tm, false);
    potriveste(tm, t1, false);
  };
  const ts = [0, ...taieturi(q), 1];
  for (let i = 0; i + 1 < ts.length; i++) potriveste(ts[i] as number, ts[i + 1] as number, true);
  if (subRezolutie) return { ok: false, motiv: `toleranța ${tol} mm e sub rezoluția numerică a coordonatelor cubicei` };
  if (depasit) return { ok: false, motiv: `cubica nu încape sub ${tol} mm în ${PLAFON_BUCATI} de bucăți` };
  // Lanțul începe exact în a (ADR 0033 §4): o primă bucată plată cu coarda sub EPS_PUNCT, sărită, lasă primul vârf lângă a.
  const v0 = rez[0];
  if (v0 && v0.p !== a) rez[0] = { p: a, s: v0.s };
  return { ok: true, varfuri: rez, bucati };
}

/**
 * Conturul cu fiecare cubică înlocuită de lanțul ei de linii și arce (ADR 0033 §2); liniile și arcele rămân. Întoarce și
 * câte bucăți au ieșit din cubice.
 */
export function conturFaraCubice(c: Contur, tol: number): { readonly ok: true; readonly contur: Contur; readonly bucati: number } | { readonly ok: false; readonly motiv: string } {
  const n = c.varfuri.length;
  const varfuri: Varf[] = [];
  let bucati = 0;
  for (let i = 0; i < n; i++) {
    const v = c.varfuri[i] as Varf;
    if (v.s.tip !== 'C') {
      varfuri.push(v);
      continue;
    }
    const urm = c.varfuri[(i + 1) % n];
    // Ultimul vârf al unui contur deschis n-are segment după el: cubica lui nu se desenează, deci nici nu se aproximează.
    if (!urm || (!c.inchis && i === n - 1)) {
      varfuri.push({ p: v.p, s: LINIE });
      continue;
    }
    const r = cubicaInArce(v.p, v.s.c1, v.s.c2, urm.p, tol);
    if (!r.ok) return r;
    bucati += r.bucati;
    for (const x of r.varfuri) varfuri.push(x);
  }
  return { ok: true, contur: { inchis: c.inchis, varfuri }, bucati };
}
