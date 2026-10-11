import { cerculArcului, inSensTrigonometric, inverseaza, type Contur, type Punct, type Segment } from '../geom/contur.ts';
import type { Miscare } from '../ir/ir.ts';
import type { Sens } from './profil.ts';

/**
 * Degajările colțurilor (ADR 0032): o freză rotundă nu intră într-un colț ascuțit al materialului păstrat K. Pe fiecare colț
 * de degajat, traseul face un drum dus-întors Q → E → Q, din colțul traseului până acolo unde cercul frezei trece exact
 * prin colțul V al piesei: degajarea minimă. Dog-bone pune E pe bisectoare, T-bone în peretele mai lung.
 */
export type TipColturi = 'dog-bone' | 't-bone';

/** Un colț de degajat: colțul piesei V, vârful traseului Q (la R de ambele laturi) și capătul drumului E. */
export type Degajare = { readonly v: Punct; readonly q: Punct; readonly e: Punct };

/** Cât scoate cel puțin o degajare, R / cos(θ/2) − R (ADR 0032 §2): rezoluția declarată (mm). */
export const REST_MINIM = 0.01;

/** Două laturi care diferă cu cel mult atât sunt egale, la alegerea peretelui T-bone-ului (ADR 0032 §3). */
const EPS_LATURA = 1e-6;

/** Un vârf al traseului e Q dacă stă la cel mult atât de punctul socotit (mm). */
export const EPS_COLT = 1e-6;

const unitar = (x: number, y: number): Punct => {
  const l = Math.hypot(x, y);
  return { x: x / l, y: y / l };
};

/**
 * Colțurile de degajat ale elementului (ADR 0032 §2–§3). `element` e conturul desenului, în coordonatele foii. Pe
 * `exterior`, K e interiorul lui; pe `interior`, exteriorul. Cu M3, la urcare K e în dreapta sensului de mers (ADR 0027).
 * Conturul se parcurge în sensul de mers; un colț de degajat e un vârf între două linii în care mersul se rupe spre
 * deșeu (la stânga cu K în dreapta), cu restul de cel puțin `REST_MINIM`. Q și E se socotesc pe hârtie; potrivirea lui Q
 * cu un vârf al traseului o face apelantul.
 */
export function colturiDeDegajat(element: Contur, latura: 'exterior' | 'interior', sens: Sens, R: number, tip: TipColturi): Degajare[] {
  if (!element.inchis || element.varfuri.length < 3) return [];
  const kDreapta = sens === 'urcare';
  const c = inSensulDeMers(element, latura, sens);
  const n = c.varfuri.length;
  const rez: Degajare[] = [];
  for (let i = 0; i < n; i++) {
    const prev = c.varfuri[(i - 1 + n) % n];
    const v = c.varfuri[i];
    const next = c.varfuri[(i + 1) % n];
    if (!prev || !v || !next) continue;
    // Ambele laturi din V sunt linii (§2): segmentul care intră e al vârfului de dinainte, cel care pleacă, al lui V.
    if (prev.s.tip !== 'L' || v.s.tip !== 'L') continue;
    const Lin = Math.hypot(v.p.x - prev.p.x, v.p.y - prev.p.y);
    const Lout = Math.hypot(next.p.x - v.p.x, next.p.y - v.p.y);
    if (!(Lin > 0 && Lout > 0)) continue;
    const dIn = unitar(v.p.x - prev.p.x, v.p.y - prev.p.y);
    const dOut = unitar(next.p.x - v.p.x, next.p.y - v.p.y);
    const cruce = dIn.x * dOut.y - dIn.y * dOut.x;
    // Mersul se rupe spre deșeu: la stânga cu K în dreapta, la dreapta cu K în stânga.
    if (!(kDreapta ? cruce > 0 : cruce < 0)) continue;
    const cosJumatate = Math.sqrt(Math.max(0, (1 + (dIn.x * dOut.x + dIn.y * dOut.y)) / 2));
    if (!(cosJumatate > 0) || R / cosJumatate - R < REST_MINIM) continue;
    // u: bisectoarea din V spre deșeu, a unghiului mai mic dintre laturile din V.
    const u = unitar(dOut.x - dIn.x, dOut.y - dIn.y);
    const q = { x: v.p.x + (R / cosJumatate) * u.x, y: v.p.y + (R / cosJumatate) * u.y };
    let e: Punct;
    if (tip === 'dog-bone') {
      e = { x: v.p.x + R * u.x, y: v.p.y + R * u.y };
    } else {
      // T-bone: crestătura intră în peretele mai lung, deci E = V + R·m, cu m normala spre deșeu a laturii mai scurte. La
      // egalitate, peretele laturii de după V (cea care pleacă), deci m e normala laturii care intră.
      const d = Lout < Lin - EPS_LATURA ? dOut : dIn;
      let m = { x: -d.y, y: d.x };
      if (m.x * u.x + m.y * u.y < 0) m = { x: -m.x, y: -m.y };
      e = { x: v.p.x + R * m.x, y: v.p.y + R * m.y };
    }
    rez.push({ v: v.p, q, e });
  }
  return rez;
}

/** Conturul închis, parcurs în sensul de mers: cu K în dreapta, în afara conturului (o gaură) e trigonometric. */
function inSensulDeMers(element: Contur, latura: 'exterior' | 'interior', sens: Sens): Contur {
  const trig = inSensTrigonometric(element);
  return (sens === 'urcare') !== (latura === 'exterior') ? trig : inverseaza(trig);
}

/**
 * Razele arcelor concave pentru K mai mici decât raza frezei (ADR 0032, precizarea din 11.10): acolo freza lasă raza ei, iar
 * colțul nu primește degajare (degajarea pe arce vine cu importul SVG). Un arc e concav pentru K dacă se curbează spre
 * deșeu: la stânga cu K în dreapta.
 */
export function arceSubRaza(element: Contur, latura: 'exterior' | 'interior', sens: Sens, R: number): number[] {
  if (!element.inchis || element.varfuri.length < 2) return [];
  const kDreapta = sens === 'urcare';
  const c = inSensulDeMers(element, latura, sens);
  const n = c.varfuri.length;
  const rez: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = c.varfuri[i];
    const b = c.varfuri[(i + 1) % n];
    if (!v || !b || v.s.tip !== 'A') continue;
    if (!(kDreapta ? v.s.bulge > 0 : v.s.bulge < 0)) continue;
    const { raza } = cerculArcului(v.p, b.p, v.s.bulge);
    if (raza < R) rez.push(raza);
  }
  return rez;
}

/**
 * Direcția de mers la un capăt (0 = în a, 1 = în b) al segmentului desenat de la a la b: linia; arcul, coarda rotită cu
 * ∓2·atan(bulge); cubica, mânerul (cel retras cade pe celălalt, apoi pe coardă). Sau null, pe un segment nul.
 */
function directieDesen(a: Punct, b: Punct, s: Segment, la: 0 | 1): Punct | null {
  const unit = (x: number, y: number): Punct | null => { const l = Math.hypot(x, y); return l > 1e-9 ? { x: x / l, y: y / l } : null; };
  if (s.tip === 'C') {
    const [p, q, r] = la === 0 ? [s.c1, s.c2, b] : [s.c2, s.c1, a];
    const capat = la === 0 ? a : b;
    for (const alt of [p, q, r]) {
      const d = la === 0 ? unit(alt.x - capat.x, alt.y - capat.y) : unit(capat.x - alt.x, capat.y - alt.y);
      if (d) return d;
    }
    return null;
  }
  const c = unit(b.x - a.x, b.y - a.y);
  if (!c || s.tip !== 'A') return c;
  const fi = (la === 0 ? -2 : 2) * Math.atan(s.bulge);
  return { x: c.x * Math.cos(fi) - c.y * Math.sin(fi), y: c.x * Math.sin(fi) + c.y * Math.cos(fi) };
}

/**
 * Colțurile desenului cu o latură curbă (arc sau cubică) în care mersul se rupe spre deșeu, cu restul de cel puțin
 * `REST_MINIM` (recenzia 2.7b): ADR 0032 degajează doar colțurile dintre două linii, deci lucrarea le spune omului, ca o
 * degajare să nu lipsească pe tăcute. `element` e desenul exact (cu cubice), în coordonatele foii.
 */
export function colturiCurbe(element: Contur, latura: 'exterior' | 'interior', sens: Sens, R: number): Array<{ readonly v: Punct; readonly cosJumatate: number }> {
  if (!element.inchis || element.varfuri.length < 2) return [];
  const kDreapta = sens === 'urcare';
  const c = inSensulDeMers(element, latura, sens);
  const n = c.varfuri.length;
  const rez: Array<{ v: Punct; cosJumatate: number }> = [];
  for (let i = 0; i < n; i++) {
    const prev = c.varfuri[(i - 1 + n) % n], v = c.varfuri[i], next = c.varfuri[(i + 1) % n];
    if (!prev || !v || !next || (prev.s.tip === 'L' && v.s.tip === 'L')) continue;
    const dIn = directieDesen(prev.p, v.p, prev.s, 1), dOut = directieDesen(v.p, next.p, v.s, 0);
    if (!dIn || !dOut) continue;
    const cruce = dIn.x * dOut.y - dIn.y * dOut.x;
    if (!(kDreapta ? cruce > 0 : cruce < 0)) continue;
    const cosJumatate = Math.sqrt(Math.max(0, (1 + (dIn.x * dOut.x + dIn.y * dOut.y)) / 2));
    if (!(cosJumatate > 0) || R / cosJumatate - R < REST_MINIM) continue;
    rez.push({ v: v.p, cosJumatate });
  }
  return rez;
}

/**
 * Cubicele desenului care se strâng spre deșeu sub raza frezei: punctul cu raza de curbură cea mai mică, pe partea concavă
 * pentru K (recenzia 2.7b, la avertismentul arcelor sub rază: o dată pe curba desenată, nu pe fiecare arc al biarcelor).
 * Raza de curbură, |B′|³ / |B′ × B″|, pe 64 de eșantioane, rafinată prin secțiunea de aur în jurul celui mai strâns.
 */
export function cubiceSubRaza(element: Contur, latura: 'exterior' | 'interior', sens: Sens, R: number): Array<{ readonly p: Punct; readonly raza: number }> {
  if (!element.inchis) return [];
  const kDreapta = sens === 'urcare';
  const c = inSensulDeMers(element, latura, sens);
  const n = c.varfuri.length;
  const rez: Array<{ p: Punct; raza: number }> = [];
  for (let i = 0; i < n; i++) {
    const v = c.varfuri[i], b = c.varfuri[(i + 1) % n];
    if (!v || !b || v.s.tip !== 'C') continue;
    const { c1, c2 } = v.s;
    const a = v.p;
    const raza = (t: number): number => {
      const u = 1 - t;
      const d1 = { x: 3 * (u * u * (c1.x - a.x) + 2 * u * t * (c2.x - c1.x) + t * t * (b.p.x - c2.x)), y: 3 * (u * u * (c1.y - a.y) + 2 * u * t * (c2.y - c1.y) + t * t * (b.p.y - c2.y)) };
      const d2 = { x: 6 * (u * (c2.x - 2 * c1.x + a.x) + t * (b.p.x - 2 * c2.x + c1.x)), y: 6 * (u * (c2.y - 2 * c1.y + a.y) + t * (b.p.y - 2 * c2.y + c1.y)) };
      const cruce = d1.x * d2.y - d1.y * d2.x;
      if (!(kDreapta ? cruce > 0 : cruce < 0)) return Infinity;
      return Math.hypot(d1.x, d1.y) ** 3 / Math.abs(cruce);
    };
    let tMin = 0, rMin = Infinity;
    for (let k = 0; k <= 64; k++) {
      const r = raza(k / 64);
      if (r < rMin) { rMin = r; tMin = k / 64; }
    }
    if (!(rMin < Infinity)) continue;
    let lo = Math.max(0, tMin - 1 / 64), hi = Math.min(1, tMin + 1 / 64);
    for (let it = 0; it < 40; it++) {
      const m1 = hi - 0.618 * (hi - lo), m2 = lo + 0.618 * (hi - lo);
      if (raza(m1) <= raza(m2)) hi = m2; else lo = m1;
    }
    const tm = (lo + hi) / 2;
    const rm = Math.min(rMin, raza(tm));
    if (!(rm < R)) continue;
    const t = raza(tm) <= rMin ? tm : tMin, u = 1 - t;
    const p = {
      x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.p.x,
      y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.p.y,
    };
    rez.push({ p, raza: rm });
  }
  return rez;
}

/**
 * Drumul de degajare la o sosire în punctul p (ADR 0032 §4): dacă p e Q-ul unei degajări, Q → E → Q, două linii la Z-ul
 * curent, cu avansul de tăiere.
 */
export function degajeaza(m: Miscare[], p: Punct, degajari: readonly Degajare[] | undefined, avans: number): void {
  if (!degajari) return;
  for (const d of degajari) {
    if (Math.hypot(p.x - d.q.x, p.y - d.q.y) > EPS_COLT) continue;
    m.push({ tip: 'taiere', la: { X: d.e.x, Y: d.e.y }, avans });
    // Înapoi exact în vârful buclei (nu în Q-ul socotit, care poate diferi cu sub 1e-6 mm): bucla continuă de acolo.
    m.push({ tip: 'taiere', la: { X: p.x, Y: p.y }, avans });
    return;
  }
}
