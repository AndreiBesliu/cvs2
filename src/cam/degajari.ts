import { apropiereSegmente, distantaCutii, segmenteCuCutii } from '../geom/apropiere.ts';
import { cerculArcului, inSensTrigonometric, inverseaza, LINIE, type Contur, type Punct, type Segment } from '../geom/contur.ts';
import type { Cutie } from '../geom/cutie.ts';
import { distantaLaContur, inRegiune } from '../geom/distanta.ts';
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
 * Colțurile de degajat ale elementului (ADR 0032 §2–§3, ADR 0135). `element` e conturul curățat (linii și arce), în
 * coordonatele foii. Pe `exterior`, K e interiorul lui; pe `interior`, exteriorul. Cu M3, la urcare K e în dreapta sensului
 * de mers (ADR 0027). Conturul se parcurge în sensul de mers; un colț de degajat e un vârf în care mersul se rupe spre deșeu
 * (la stânga cu K în dreapta), cu restul de cel puțin `REST_MINIM`. Între două linii, regula din ADR 0032; cu o latură curbă,
 * cea din ADR 0135 (`coltCuArc`). Q și E se socotesc pe hârtie; potrivirea lui Q cu un vârf al traseului o face apelantul.
 */
export function colturiDeDegajat(element: Contur, latura: 'exterior' | 'interior', sens: Sens, R: number, tip: TipColturi): Degajare[] {
  if (!element.inchis || element.varfuri.length < 2) return [];
  const kDreapta = sens === 'urcare';
  const c = inSensulDeMers(element, latura, sens);
  const n = c.varfuri.length;
  const rez: Degajare[] = [];
  for (let i = 0; i < n; i++) {
    const prev = c.varfuri[(i - 1 + n) % n];
    const v = c.varfuri[i];
    const next = c.varfuri[(i + 1) % n];
    if (!prev || !v || !next) continue;
    // Segmentul care intră e al vârfului de dinainte, cel care pleacă, al lui V. Cu o latură curbă: ADR 0135.
    if (prev.s.tip !== 'L' || v.s.tip !== 'L') {
      const d = coltCuArc(c, i, kDreapta, R, tip);
      if (d) rez.push(d);
      continue;
    }
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

/** ADR 0135 §3: o joncțiune e netedă (același perete) dacă tangenta nu se rupe: |sin| ≤ atât, fără întoarcere. */
const NETED = 1e-6;

const cruce2 = (u: Punct, v: Punct): number => u.x * v.y - u.y * v.x;
const scalar = (u: Punct, v: Punct): number => u.x * v.x + u.y * v.y;

/** Lungimea segmentului de la a la b: linia; arcul, pe curbă. */
function lungimeSegment(a: Punct, b: Punct, s: Segment): number {
  const coarda = Math.hypot(b.x - a.x, b.y - a.y);
  if (s.tip !== 'A') return coarda;
  const { raza, baleiaj } = cerculArcului(a, b, s.bulge);
  return Math.abs(baleiaj) * raza;
}

/** Joncțiunea din vârful j al conturului închis c e netedă: tangenta segmentului care intră continuă cu cea a celui care pleacă. */
function jonctiuneNeteda(c: Contur, j: number): boolean {
  const n = c.varfuri.length;
  const a = c.varfuri[(j - 1 + n) % n], v = c.varfuri[j], b = c.varfuri[(j + 1) % n];
  if (!a || !v || !b) return false;
  const tIn = directieDesen(a.p, v.p, a.s, 1), tOut = directieDesen(v.p, b.p, v.s, 0);
  return tIn !== null && tOut !== null && Math.abs(cruce2(tIn, tOut)) <= NETED && scalar(tIn, tOut) > 0;
}

/**
 * Indicii segmentelor peretelui (ADR 0135 §3) din vârful i al conturului închis c: înainte, segmentele i, i + 1, …; înapoi,
 * i − 1, i − 2, …; până la prima joncțiune care nu e netedă (sau până la întoarcerea în i).
 */
function segmentePerete(c: Contur, i: number, inainte: boolean): number[] {
  const n = c.varfuri.length;
  const rez: number[] = [];
  for (let pas = 0; pas < n; pas++) {
    const k = inainte ? (i + pas) % n : (((i - 1 - pas) % n) + n) % n;
    rez.push(k);
    // Joncțiunea de la capătul depărtat al segmentului k: înainte, vârful k + 1; înapoi, vârful k.
    const j = inainte ? (k + 1) % n : k;
    if (j === i || !jonctiuneNeteda(c, j)) break;
  }
  return rez;
}

/** Lungimea peretelui (ADR 0135 §3) din vârful i: suma segmentelor lui, pe curbă. */
function lungimePerete(c: Contur, i: number, inainte: boolean): number {
  const n = c.varfuri.length;
  let L = 0;
  for (const k of segmentePerete(c, i, inainte)) {
    const a = c.varfuri[k], b = c.varfuri[(k + 1) % n];
    if (a && b) L += lungimeSegment(a.p, b.p, a.s);
  }
  return L;
}

/** Curba decalată cu R spre deșeu a unui segment (ADR 0135 §2): o dreaptă (punct și direcție) sau un cerc; null dacă dispare. */
type Decalata = { readonly tip: 'dreapta'; readonly p: Punct; readonly d: Punct } | { readonly tip: 'cerc'; readonly c: Punct; readonly r: number };

function decalata(a: Punct, b: Punct, s: Segment, R: number, laStanga: boolean): Decalata | null {
  if (s.tip !== 'A') {
    const d = unitar(b.x - a.x, b.y - a.y);
    const semn = laStanga ? 1 : -1;
    return { tip: 'dreapta', p: { x: a.x - semn * R * d.y, y: a.y + semn * R * d.x }, d };
  }
  const { centru, raza } = cerculArcului(a, b, s.bulge);
  // Pe un arc trigonometric (bulge > 0), stânga e spre centru.
  const r = (s.bulge > 0) === laStanga ? raza - R : raza + R;
  return r > 1e-9 ? { tip: 'cerc', c: centru, r } : null;
}

/** Intersecțiile a două curbe decalate. */
function intersectii(u: Decalata, v: Decalata): Punct[] {
  if (u.tip === 'dreapta' && v.tip === 'dreapta') {
    const x = cruce2(u.d, v.d);
    if (Math.abs(x) < 1e-15) return [];
    const t = cruce2({ x: v.p.x - u.p.x, y: v.p.y - u.p.y }, v.d) / x;
    return [{ x: u.p.x + t * u.d.x, y: u.p.y + t * u.d.y }];
  }
  if (u.tip === 'cerc' && v.tip === 'cerc') {
    const dx = v.c.x - u.c.x, dy = v.c.y - u.c.y, d = Math.hypot(dx, dy);
    if (d === 0 || d > u.r + v.r || d < Math.abs(u.r - v.r)) return [];
    const a = (u.r * u.r - v.r * v.r + d * d) / (2 * d), h = Math.sqrt(Math.max(0, u.r * u.r - a * a));
    const mx = u.c.x + (a * dx) / d, my = u.c.y + (a * dy) / d;
    return [{ x: mx - (h * dy) / d, y: my + (h * dx) / d }, { x: mx + (h * dy) / d, y: my - (h * dx) / d }];
  }
  const l = (u.tip === 'dreapta' ? u : v) as Extract<Decalata, { tip: 'dreapta' }>;
  const k = (u.tip === 'cerc' ? u : v) as Extract<Decalata, { tip: 'cerc' }>;
  const fx = l.p.x - k.c.x, fy = l.p.y - k.c.y;
  const b = fx * l.d.x + fy * l.d.y, cc = fx * fx + fy * fy - k.r * k.r, disc = b * b - cc;
  if (disc < 0) return [];
  const rd = Math.sqrt(disc);
  return [-b - rd, -b + rd].map((t) => ({ x: l.p.x + t * l.d.x, y: l.p.y + t * l.d.y }));
}

/** Direcția (nenormată) a curbei decalate în punctul ei z: a dreptei, sau perpendiculara pe rază. */
const tangentaDecalatei = (u: Decalata, z: Punct): Punct => (u.tip === 'dreapta' ? u.d : { x: -(z.y - u.c.y), y: z.x - u.c.x });

/** Curbele decalate se încrucișează în z (nu doar se ating): |sin| dintre tangentele lor peste `NETED`. */
function seIncruciseaza(u: Decalata, v: Decalata, z: Punct): boolean {
  const a = tangentaDecalatei(u, z), b = tangentaDecalatei(v, z);
  const la = Math.hypot(a.x, a.y), lb = Math.hypot(b.x, b.y);
  return la > 0 && lb > 0 && Math.abs(cruce2(a, b)) / (la * lb) > NETED;
}

/** Piciorul lui q pe segmentul de la a la b cade pe segment: pe linie, între capete; pe arc, în baleiajul lui (cu o toleranță). */
function piciorPeSegment(q: Punct, a: Punct, b: Punct, s: Segment): boolean {
  if (s.tip !== 'A') {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? ((q.x - a.x) * dx + (q.y - a.y) * dy) / l2 : -1;
    return t >= -1e-9 && t <= 1 + 1e-9;
  }
  const { centru, start, baleiaj } = cerculArcului(a, b, s.bulge);
  const u = Math.atan2(q.y - centru.y, q.x - centru.x);
  const rel = baleiaj >= 0 ? (((u - start) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) : (((start - u) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return rel <= Math.abs(baleiaj) + 1e-9 || rel >= 2 * Math.PI - 1e-9;
}

/**
 * Colțul cu o latură curbă din vârful i al conturului c, parcurs în sensul de mers (ADR 0135): direcțiile sunt tangentele din
 * V; Q e încrucișarea curbelor decalate ale celor doi pereți din V (§3) cea mai apropiată de V, cu piciorul pe câte un segment
 * al fiecăruia; E ca la ADR 0032 §3, cu pereții de la §3 la T-bone. Null dacă nu e colț de degajat.
 */
function coltCuArc(c: Contur, i: number, kDreapta: boolean, R: number, tip: TipColturi): Degajare | null {
  const n = c.varfuri.length;
  const prev = c.varfuri[(i - 1 + n) % n], v = c.varfuri[i], next = c.varfuri[(i + 1) % n];
  if (!prev || !v || !next) return null;
  const dIn = directieDesen(prev.p, v.p, prev.s, 1), dOut = directieDesen(v.p, next.p, v.s, 0);
  if (!dIn || !dOut) return null;
  const cruce = cruce2(dIn, dOut);
  if (!(kDreapta ? cruce > 0 : cruce < 0)) return null;
  const cosJumatate = Math.sqrt(Math.max(0, (1 + scalar(dIn, dOut)) / 2));
  // ADR 0135 §1: tangenta se rupe cel puțin cât lasă restul minim între două linii (ca la plasă, `colturiCurbe`); o
  // joncțiune netedă nu e colț, chiar dacă decalatele pereților se taie mai departe.
  if (!(cosJumatate > 0) || R / cosJumatate - R < REST_MINIM) return null;
  // Q (ADR 0135 §2): pe fiecare perete din V, segmentul pe care cade piciorul lui (la o cubică, una dintre biarce). Deșeul e
  // la stânga sensului de mers când K e în dreapta.
  const peretele = (inainte: boolean): Array<{ readonly a: Punct; readonly b: Punct; readonly s: Segment; readonly dec: Decalata }> =>
    segmentePerete(c, i, inainte).flatMap((k) => {
      const a = c.varfuri[k], b = c.varfuri[(k + 1) % n];
      const dec = a && b ? decalata(a.p, b.p, a.s, R, kDreapta) : null;
      return a && b && dec ? [{ a: a.p, b: b.p, s: a.s, dec }] : [];
    });
  const pIn = peretele(false), pOut = peretele(true);
  let q: Punct | null = null, cel = Infinity;
  for (const x of pIn) {
    for (const y of pOut) {
      for (const z of intersectii(x.dec, y.dec)) {
        // Doar o încrucișare: două decalate care se ating (la o joncțiune netedă, pe un contur cu un singur colț) nu fac un vârf.
        if (!seIncruciseaza(x.dec, y.dec, z) || !piciorPeSegment(z, x.a, x.b, x.s) || !piciorPeSegment(z, y.a, y.b, y.s)) continue;
        const d = Math.hypot(z.x - v.p.x, z.y - v.p.y);
        if (d < cel) { cel = d; q = z; }
      }
    }
  }
  if (!q || cel - R < REST_MINIM) return null;
  const u = unitar(dOut.x - dIn.x, dOut.y - dIn.y);
  let e: Punct;
  if (tip === 'dog-bone') {
    e = { x: v.p.x + R * u.x, y: v.p.y + R * u.y };
  } else {
    const Lin = lungimePerete(c, i, false), Lout = lungimePerete(c, i, true);
    const d = Lout < Lin - EPS_LATURA ? dOut : dIn;
    let m = { x: -d.y, y: d.x };
    if (m.x * u.x + m.y * u.y < 0) m = { x: -m.x, y: -m.y };
    e = { x: v.p.x + R * m.x, y: v.p.y + R * m.y };
  }
  return { v: v.p, q, e };
}

/** ADR 0134 §4: un punct la cel mult atât de contur (mm) stă pe el. */
export const PE_CONTUR = 1e-6;

/** ADR 0134 §2: discul care ajunge la sub R − atât (mm) de un perete trece de el; mai puțin e rotunjirea. */
const EPS_PERETE = 1e-6;

/** K, partea păstrată a elementului (ADR 0134 §4): înăuntrul conturului pe `exterior`, în afara lui pe `interior` (`evenodd`). */
function inK(p: Punct, element: Contur, latura: 'exterior' | 'interior'): boolean {
  return inRegiune(p, [element]) === (latura === 'exterior');
}

const cutieDrum = (d: Degajare): Cutie => ({
  minX: Math.min(d.q.x, d.e.x), maxX: Math.max(d.q.x, d.e.x), minY: Math.min(d.q.y, d.e.y), maxY: Math.max(d.q.y, d.e.y),
});

/**
 * Condiția d (ADR 0134 §2): drumul [Q, E] al colțului V față de pereții elementului care nu se întâlnesc în V. Pe fiecare
 * segment σ, cu c pe drum și p pe σ punctele cele mai apropiate, la δ: discul de rază R nu trece de σ (δ ≥ R − 10⁻⁶), iar sub
 * R + `marja`, punctul discului cel mai apropiat de σ, s = c + R·(p − c) / δ, nu e în K (pe contur e K: discul atinge σ).
 * `element` e conturul curățat dat lui `colturiDeDegajat`, deci V e chiar unul dintre vârfurile lui. `segmente`: ale lui
 * `element`, cu cutiile lor (socotite o dată pe tăietură, nu pe fiecare colț).
 */
export function departeDePereti(
  element: Contur, latura: 'exterior' | 'interior', R: number, d: Degajare, marja: number,
  segmente: ReturnType<typeof segmenteCuCutii> = segmenteCuCutii(element),
): boolean {
  const i = element.varfuri.findIndex((v) => v.p.x === d.v.x && v.p.y === d.v.y);
  // Pereții din V (ADR 0135 §4): întregi, până la prima rupere a tangentei, nu doar segmentul de lângă V.
  const dinV = new Set(i >= 0 ? [...segmentePerete(element, i, true), ...segmentePerete(element, i, false)] : []);
  const drum = { a: d.q, b: d.e, s: LINIE };
  const cd = cutieDrum(d);
  for (const [k, x] of segmente.entries()) {
    if (dinV.has(k)) continue;
    if (distantaCutii(cd, x.cutie) >= R + marja) continue;
    const a = apropiereSegmente(drum, x.s);
    if (a.distanta < R - EPS_PERETE) return false;
    if (a.distanta >= R + marja) continue;
    const t = R / a.distanta;
    const s = { x: a.p.x + t * (a.q.x - a.p.x), y: a.p.y + t * (a.q.y - a.p.y) };
    if (distantaLaContur(s, element) <= PE_CONTUR || inK(s, element, latura)) return false;
  }
  return true;
}

/**
 * Condiția e (ADR 0134 §3): drumurile a doi candidați ai aceleiași bucle lasă între crestături sub 1 mm de material păstrat:
 * sunt la sub `prag` (D + 1) unul de altul, iar unul dintre discurile de rază R intră în K spre celălalt. Proba: punctele
 * discurilor cele mai apropiate de celălalt drum, s₁ = c₁ + R·û și s₂ = c₂ − R·û (û de la c₁ la c₂), strict în K; cu
 * drumurile atinse, punctul de atingere. Pe contur nu e K: acolo două T-bone-uri intră în același perete, din capetele lui,
 * iar crestăturile lor se unesc.
 */
export function materialIntre(x: Degajare, y: Degajare, element: Contur, latura: 'exterior' | 'interior', prag: number, R: number): boolean {
  if (distantaCutii(cutieDrum(x), cutieDrum(y)) >= prag) return false;
  const a = apropiereSegmente({ a: x.q, b: x.e, s: LINIE }, { a: y.q, b: y.e, s: LINIE });
  if (!(a.distanta < prag)) return false;
  const strictInK = (p: Punct): boolean => distantaLaContur(p, element) > PE_CONTUR && inK(p, element, latura);
  if (a.distanta === 0) return strictInK(a.p);
  const t = R / a.distanta;
  const dx = a.q.x - a.p.x, dy = a.q.y - a.p.y;
  return strictInK({ x: a.p.x + t * dx, y: a.p.y + t * dy }) || strictInK({ x: a.q.x - t * dx, y: a.q.y - t * dy });
}

/** Conturul închis, parcurs în sensul de mers: cu K în dreapta, în afara conturului (o gaură) e trigonometric. */
function inSensulDeMers(element: Contur, latura: 'exterior' | 'interior', sens: Sens): Contur {
  const trig = inSensTrigonometric(element);
  return (sens === 'urcare') !== (latura === 'exterior') ? trig : inverseaza(trig);
}

/**
 * Razele arcelor concave pentru K mai mici decât raza frezei (ADR 0032, precizarea din 11.10): acolo freza lasă raza ei, iar
 * colțul nu primește degajare: nu e ascuțit (ADR 0135 §6). Un arc e concav pentru K dacă se curbează spre
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
 * Desenul fără segmentele nule: o linie dintr-un punct în același punct, sau o cubică cu toate punctele lângă capăt. Un
 * vârf dublat (des într-un SVG) ar lăsa colțul de lângă el fără direcție, deci nespus (oracolul 2.7b, cazul C20). Un desen
 * care ar rămâne fără vârfuri rămâne cum e.
 */
function faraSegmenteNule(c: Contur): Contur {
  const n = c.varfuri.length;
  const lang = (a: Punct, b: Punct): boolean => Math.hypot(b.x - a.x, b.y - a.y) < 1e-9;
  const varfuri = c.varfuri.filter((v, i) => {
    const urm = c.varfuri[(i + 1) % n];
    if (!urm || !lang(v.p, urm.p)) return true;
    return !(v.s.tip === 'L' || (v.s.tip === 'C' && lang(v.p, v.s.c1) && lang(v.p, v.s.c2)));
  });
  return varfuri.length >= 2 ? { inchis: c.inchis, varfuri } : c;
}

/**
 * Colțurile desenului cu o latură curbă (arc sau cubică) în care mersul se rupe spre deșeu, cu restul de cel puțin
 * `REST_MINIM` (recenzia 2.7b): ADR 0032 degajează doar colțurile dintre două linii, deci lucrarea le spune omului, ca o
 * degajare să nu lipsească pe tăcute. `element` e desenul exact (cu cubice), în coordonatele foii.
 */
export function colturiCurbe(element: Contur, latura: 'exterior' | 'interior', sens: Sens, R: number): Array<{ readonly v: Punct; readonly cosJumatate: number }> {
  if (!element.inchis || element.varfuri.length < 2) return [];
  const kDreapta = sens === 'urcare';
  const c = inSensulDeMers(faraSegmenteNule(element), latura, sens);
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
