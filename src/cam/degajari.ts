import { cerculArcului, inSensTrigonometric, inverseaza, type Contur, type Punct } from '../geom/contur.ts';
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
