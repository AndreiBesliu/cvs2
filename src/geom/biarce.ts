import { arc, cerculArcului, LINIE, numarSegmente, segment, type Contur, type Punct, type Varf } from './contur.ts';
import { distantaLaContur } from './distanta.ts';
import { TINTA_APROXIMARE } from './toleranta.ts';

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
 * Valorile t din (0, 1) unde cross(B′, B″) = 0: inflexiunile și vârfurile (în vârf B′ = 0). Expresia e de gradul 2 în t.
 */
function taieturi(q: Cubica): number[] {
  const ax = -q.a.x + 3 * q.c1.x - 3 * q.c2.x + q.b.x, ay = -q.a.y + 3 * q.c1.y - 3 * q.c2.y + q.b.y;
  const bx = q.a.x - 2 * q.c1.x + q.c2.x, by = q.a.y - 2 * q.c1.y + q.c2.y;
  const cx = q.c1.x - q.a.x, cy = q.c1.y - q.a.y;
  const A = ax * by - ay * bx, B = ax * cy - ay * cx, C = bx * cy - by * cx;
  const scara = Math.max(Math.abs(A), Math.abs(B), Math.abs(C));
  const radacini: number[] = [];
  if (scara === 0) return [];
  if (Math.abs(A) > 1e-12 * scara) {
    const D = B * B - 4 * A * C;
    if (D >= 0) {
      const r = Math.sqrt(D);
      radacini.push((-B + r) / (2 * A), (-B - r) / (2 * A));
    }
  } else if (Math.abs(B) > 1e-12 * scara) {
    radacini.push(-C / B);
  }
  return radacini.filter((t) => t > 1e-9 && t < 1 - 1e-9).sort((u, v) => u - v);
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
 * Biarcul cu tangente egale (Bolton): de la p0 (tangenta t0) la p1 (tangenta t1), prin J. Întoarce vârfurile [p0, J], cu
 * arcele lor, sau null dacă nu există.
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
  return [{ p: p0, s: Math.abs(b1) < 1e-12 ? LINIE : arc(b1) }, { p: j, s: Math.abs(b2) < 1e-12 ? LINIE : arc(b2) }];
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

/**
 * Abaterea dintre bucata [t0, t1] și lanțul `varfuri` (de la p0 la p1), în ambele sensuri, pe `ESANTIOANE` de puncte pe
 * fiecare sens, plus capetele.
 */
function abatere(q: Cubica, t0: number, t1: number, varfuri: readonly Varf[], p1: Punct): number {
  const lant: Contur = { inchis: false, varfuri: [...varfuri, { p: p1, s: LINIE }] };
  let e = 0;
  for (let i = 1; i < ESANTIOANE; i++) e = Math.max(e, distantaLaContur(punctCubica(q, t0 + ((t1 - t0) * i) / ESANTIOANE), lant));
  for (let k = 0; k < numarSegmente(lant); k++) {
    const { a, b, s } = segment(lant, k);
    for (let i = 0; i <= ESANTIOANE; i++) {
      const f = i / ESANTIOANE;
      let p: Punct;
      if (s.tip === 'A') {
        const k = cerculArcului(a, b, s.bulge);
        const u = k.start + k.baleiaj * f;
        p = { x: k.centru.x + k.raza * Math.cos(u), y: k.centru.y + k.raza * Math.sin(u) };
      } else {
        p = lerp(a, b, f);
      }
      e = Math.max(e, laCubica(q, p, t0, t1));
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
  const punct = (t: number): Punct => (t === 0 ? a : t === 1 ? b : punctCubica(q, t));
  const potriveste = (t0: number, t1: number): void => {
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
    const coarda = scade(p1, p0);
    const ta = tangenta(q, t0, 1, coarda), tb = tangenta(q, t1, -1, coarda);
    const cand = ta && tb && lungime(coarda) >= EPS_PUNCT ? biarc(p0, ta, p1, tb) : null;
    if (cand && abatere(q, t0, t1, cand, p1) <= tinta) {
      bucati += cand.length;
      if (bucati > PLAFON_BUCATI) { depasit = true; return; }
      for (const v of cand) rez.push(v);
      return;
    }
    if (bucati + 2 > PLAFON_BUCATI || t1 - t0 < 1e-12) { depasit = true; return; }
    const tm = (t0 + t1) / 2;
    potriveste(t0, tm);
    potriveste(tm, t1);
  };
  const ts = [0, ...taieturi(q), 1];
  for (let i = 0; i + 1 < ts.length; i++) potriveste(ts[i] as number, ts[i + 1] as number);
  if (depasit) return { ok: false, motiv: `cubica nu încape sub ${tol} mm în ${PLAFON_BUCATI} de bucăți` };
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
