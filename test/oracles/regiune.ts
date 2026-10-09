/**
 * ORACOLUL regiunii păstrate și al invariantei 2 (ADR 0026, felia 2.3a), cu ZERO importuri din `src/`. Scris doar din
 * textul ADR 0026 (plus ADR 0024 / 0025 pentru document, prin oracolul documentului, și ADR 0003 pentru `evenodd`).
 *
 * Ce face, literal din contract:
 * - §1 inelele: pe foaia 0, fiecare element în lume cu cel puțin o operație `exterior` (→ piesă) sau `interior` (→ gol)
 *   dă un inel, conturul lui exact în lume (dreptunghiul cu colțuri rotunjite sau cercul, sub matricea din lume). Un
 *   element cu ambele laturi e o problemă (refuz), nu un inel. Mai multe operații pe aceeași latură = un singur inel;
 * - §2 două inele la mai puțin de 1e-6 mm (atingere, intersecție, coincidență) sunt o problemă (refuz);
 * - §3 pădurea: B e în A dacă un punct al lui B e strict în A; părintele lui B e inelul cu aria cea mai mică dintre cele
 *   care îl conțin (pe inele care nu se ating, cel mai mic = cel mai adânc);
 * - §4 K: un punct care nu stă pe un inel e în K dacă și numai dacă cel mai mic inel care îl conține e piesă;
 * - §5 partea proprie S(C): interiorul piesei, exteriorul golului; contează doar pentru tăieturile lui C;
 * - §6 invarianta 2: fiecare punct p al unei mișcări de tăiere pe inelul C stă în afara lui K ∪ S(C), la cel puțin
 *   R − ε de el (ε = 0,005 mm) pe traseul EXACT (aici: offsetul ideal); pe textul G-code poarta adaugă rotunjirea
 *   postului (0,002 mm, `TOL_ROTUNJIRE` din poartă), deci R − ε − 0,002; niciun prag nu coboară sub 1e-6 mm (la R = ε,
 *   o traversare a marginii rămâne încălcare). Amendamentul din 09.10 (commit 415b10d).
 *
 * Două metode, ca să se verifice una pe alta:
 * - `prezice` (documentul, pe offsetul IDEAL, analitic: piesa → conturul crescut cu R, golul → micșorat cu R) măsoară
 *   EXACT distanța de la traseul ideal la inelele care mărginesc K, cu formulele închise segment–segment, segment–arc,
 *   arc–arc (punctele critice: capetele, piciorul perpendicularei, linia centrelor, intersecțiile);
 * - `verificaMutarea` (poarta, pe textul G-code) EȘANTIONEAZĂ mișcarea cu pași de „sferă” (distanța la inele e
 *   1-lipschitziană pe lungimea drumului): din punctul cu distanța d ≥ T (pragul), următorul punct e la
 *   max(d − T, PAS_MIN) mai departe. Toleranța declarată: între două eșantioane distanța poate coborî cu cel mult
 *   PAS_MIN / 2 = 5e-5 mm sub T, deci poarta poate rata doar o pătrundere cu mai puțin de 5e-5 mm peste prag. Când
 *   T < 2·PAS_MIN (freze sub ~Ø0,0142 pe G-code) poarta clasifică fiecare eșantion, deci o traversare se vede și cu
 *   pragul de 1e-6; scapă doar o intrare și o ieșire mai scurte, împreună, decât PAS_MIN.
 *
 * Doar distanța la inelele care MĂRGINESC K ∪ S(C) contează: piesele, inelele al căror părinte e piesă și C însuși.
 * Un gol fără părinte (gaura din schelet) sau un gol într-un gol nu mărginește K: de o parte și de alta e deșeu.
 * Pe o mișcare care nu atinge aceste inele, apartenența la K și la S(C) e constantă, deci se clasifică un singur punct.
 *
 * Alegerile mele unde textul tace sunt în raportul oracolului (și marcate „ALEGERE” aici).
 */
import { taieturiV3O, type DocV3O, type LaturaO, type MatriceO } from './document.ts';

/** §6: pe traseul exact, distanța la marginea lui K ∪ S(C) e cel puțin R − ε. */
export const EPS_REGIUNE = 0.005;
/** §2: inelele mai apropiate de atât se ating. */
export const ATINGERE = 1e-6;
/** §6: niciun prag nu coboară sub atât. */
export const PRAG_MINIM = 1e-6;
/**
 * ALEGERE: la predicție, o distanță la mai puțin de atât de prag e „la limită” (aplicația poate face oricare): la egalitate
 * exactă (de exemplu două piese la D − ε) rotunjirea aplicației și a oracolului poate cădea de o parte sau de alta.
 */
export const BANDA_NUMERICA = 1e-7;
/** §6: pragul distanței; `rotunjire` = 0 pe traseul exact, 0,002 pe textul G-code. */
export const prag = (R: number, rotunjire = 0): number => Math.max(R - EPS_REGIUNE - rotunjire, PRAG_MINIM);
/** Pasul minim al eșantionării în poartă; toleranța declarată e jumătate din el. */
export const PAS_MIN = 1e-4;
export const TOL_ESANTION = PAS_MIN / 2;
/** Pasul în interiorul unei încălcări (doar pentru adâncimea raportată: ±0,005 mm). */
const PAS_INCALCARE = 0.01;

// ---------------------------------------------------------------------------------------------------------------
// Primitivele: segmentul, arcul (centrul, raza, unghiul de start u0 și unghiul parcurs du, cu semn: + trigonometric)
// și punctul (plonjarea pe verticală).

export type Pt = { readonly x: number; readonly y: number };
export type Segment = { readonly tip: 'segment'; readonly a: Pt; readonly b: Pt };
export type Arc = { readonly tip: 'arc'; readonly c: Pt; readonly r: number; readonly u0: number; readonly du: number };
export type PunctP = { readonly tip: 'punct'; readonly p: Pt };
export type Primitiva = Segment | Arc | PunctP;
export type Cutie = { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number };

const DOI_PI = 2 * Math.PI;
/** Toleranța unghiulară a capetelor unui arc (un punct calculat chiar pe capăt rămâne pe arc). */
const TOL_UNGHI = 1e-12;

export const pt = (x: number, y: number): Pt => ({ x, y });
export const segment = (a: Pt, b: Pt): Segment => ({ tip: 'segment', a, b });
export const arc = (c: Pt, r: number, u0: number, du: number): Arc => ({ tip: 'arc', c, r, u0, du });
export const punct = (p: Pt): PunctP => ({ tip: 'punct', p });
export const cercP = (c: Pt, r: number): Arc => arc(c, r, 0, DOI_PI);

const dist = (p: Pt, q: Pt): number => Math.hypot(p.x - q.x, p.y - q.y);
const peCerc = (c: Pt, r: number, u: number): Pt => pt(c.x + r * Math.cos(u), c.y + r * Math.sin(u));

/** Capetele arcului, în sensul parcurgerii. */
export function capeteArc(a: Arc): readonly [Pt, Pt] {
  return [peCerc(a.c, a.r, a.u0), peCerc(a.c, a.r, a.u0 + a.du)];
}

/** Unghiul u (oricare reprezentant) e pe arc, cu capetele incluse. */
export function inUnghi(a: Arc, u: number): boolean {
  const len = Math.abs(a.du);
  if (len >= DOI_PI - TOL_UNGHI) return true;
  const start = a.du >= 0 ? a.u0 : a.u0 + a.du;
  let t = (u - start) % DOI_PI;
  if (t < 0) t += DOI_PI;
  return t <= len + TOL_UNGHI || t >= DOI_PI - TOL_UNGHI;
}

export function lungime(p: Primitiva): number {
  if (p.tip === 'segment') return dist(p.a, p.b);
  if (p.tip === 'arc') return p.r * Math.abs(p.du);
  return 0;
}

/** Punctul de la lungimea s pe primitivă (s în [0, lungime]). */
export function punctLa(p: Primitiva, s: number): Pt {
  if (p.tip === 'punct') return p.p;
  if (p.tip === 'segment') {
    const L = dist(p.a, p.b);
    if (L === 0) return p.a;
    const t = s / L;
    return pt(p.a.x + (p.b.x - p.a.x) * t, p.a.y + (p.b.y - p.a.y) * t);
  }
  if (p.r === 0) return p.c;
  return peCerc(p.c, p.r, p.u0 + Math.sign(p.du) * (s / p.r));
}

export const startul = (p: Primitiva): Pt => (p.tip === 'punct' ? p.p : p.tip === 'segment' ? p.a : capeteArc(p)[0]);
export const capatul = (p: Primitiva): Pt => (p.tip === 'punct' ? p.p : p.tip === 'segment' ? p.b : capeteArc(p)[1]);

function cutiaPunctelor(ps: readonly Pt[]): Cutie {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of ps) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

/** Cutia exactă: capetele și, la arc, punctele cardinale aflate pe el. */
export function cutiePrimitiva(p: Primitiva): Cutie {
  if (p.tip === 'punct') return cutiaPunctelor([p.p]);
  if (p.tip === 'segment') return cutiaPunctelor([p.a, p.b]);
  const ps: Pt[] = [...capeteArc(p)];
  for (let k = 0; k < 4; k++) if (inUnghi(p, (k * Math.PI) / 2)) ps.push(peCerc(p.c, p.r, (k * Math.PI) / 2));
  return cutiaPunctelor(ps);
}

export function cutieLista(ps: readonly Primitiva[]): Cutie {
  const c = ps.map(cutiePrimitiva);
  return {
    minX: Math.min(...c.map((x) => x.minX)), maxX: Math.max(...c.map((x) => x.maxX)),
    minY: Math.min(...c.map((x) => x.minY)), maxY: Math.max(...c.map((x) => x.maxY)),
  };
}

/** O margine de jos a distanței dintre două mulțimi, din cutiile lor. */
export function distantaCutii(a: Cutie, b: Cutie): number {
  const dx = Math.max(0, a.minX - b.maxX, b.minX - a.maxX);
  const dy = Math.max(0, a.minY - b.maxY, b.minY - a.maxY);
  return Math.hypot(dx, dy);
}

// ---------------------------------------------------------------------------------------------------------------
// Distanța de la un punct (pentru eșantioane) și distanța EXACTĂ între două primitive (pentru predicție și atingeri).

export function dPunctSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2 : 0;
  t = Math.min(1, Math.max(0, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function dPunctArc(p: Pt, a: Arc): number {
  const vx = p.x - a.c.x, vy = p.y - a.c.y;
  const rho = Math.hypot(vx, vy);
  if (rho === 0) return a.r;
  if (inUnghi(a, Math.atan2(vy, vx))) return Math.abs(rho - a.r);
  const [e0, e1] = capeteArc(a);
  return Math.min(dist(p, e0), dist(p, e1));
}

export function dPunct(p: Pt, q: Primitiva): number {
  if (q.tip === 'punct') return dist(p, q.p);
  if (q.tip === 'segment') return dPunctSegment(p, q.a, q.b);
  return dPunctArc(p, q);
}

export function dPunctLista(p: Pt, qs: readonly Primitiva[]): number {
  let d = Infinity;
  for (const q of qs) {
    const x = dPunct(p, q);
    if (x < d) d = x;
  }
  return d;
}

const orient = (a: Pt, b: Pt, c: Pt): number => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

/** Segmentele se taie propriu (atingerile și suprapunerile coliniare dau 0 prin distanțele capetelor). */
function seTaieSegmente(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  return ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0));
}

function dSegmentSegment(s: Segment, t: Segment): number {
  if (seTaieSegmente(s.a, s.b, t.a, t.b)) return 0;
  return Math.min(dPunctSegment(s.a, t.a, t.b), dPunctSegment(s.b, t.a, t.b), dPunctSegment(t.a, s.a, s.b), dPunctSegment(t.b, s.a, s.b));
}

/**
 * Segment–arc. Intersecția cu cercul (pe arc) dă 0. Altfel minimul e într-un punct critic: un capăt al unuia față de
 * celălalt, sau piciorul perpendicularei din centru pe segment, cu punctul radial al arcului (dacă e pe arc). Când
 * dreapta trece prin centru, punctele radiale sunt pe normala segmentului, la distanța r.
 */
function dSegmentArc(s: Segment, a: Arc): number {
  const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y;
  const A = dx * dx + dy * dy;
  if (A === 0) return dPunctArc(s.a, a);
  const fx = s.a.x - a.c.x, fy = s.a.y - a.c.y;
  const B = 2 * (fx * dx + fy * dy);
  const C0 = fx * fx + fy * fy - a.r * a.r;
  const disc = B * B - 4 * A * C0;
  if (disc >= 0) {
    const sq = Math.sqrt(disc);
    for (const t of [(-B - sq) / (2 * A), (-B + sq) / (2 * A)]) {
      if (t < 0 || t > 1) continue;
      const qx = s.a.x + t * dx - a.c.x, qy = s.a.y + t * dy - a.c.y;
      if (inUnghi(a, Math.atan2(qy, qx))) return 0;
    }
  }
  const [e0, e1] = capeteArc(a);
  let d = Math.min(dPunctArc(s.a, a), dPunctArc(s.b, a), dPunctSegment(e0, s.a, s.b), dPunctSegment(e1, s.a, s.b));
  const t = Math.min(1, Math.max(0, -(fx * dx + fy * dy) / A));
  const vx = fx + t * dx, vy = fy + t * dy;
  const rho = Math.hypot(vx, vy);
  if (rho > 1e-12 * Math.max(1, a.r)) {
    if (inUnghi(a, Math.atan2(vy, vx))) d = Math.min(d, Math.abs(rho - a.r));
  } else {
    const u = Math.atan2(dy, dx);
    if (inUnghi(a, u + Math.PI / 2) || inUnghi(a, u - Math.PI / 2)) d = Math.min(d, a.r);
  }
  return d;
}

/**
 * Arc–arc. Intersecția cercurilor (pe ambele arce) dă 0. Altfel punctele critice: capetele fiecăruia față de celălalt
 * și perechile de pe linia centrelor (Lagrange: ambele puncte radiale, paralele, deci pe linia centrelor).
 */
function dArcArc(p: Arc, q: Arc): number {
  const dx = q.c.x - p.c.x, dy = q.c.y - p.c.y;
  const d = Math.hypot(dx, dy);
  const [p0, p1] = capeteArc(p);
  const [q0, q1] = capeteArc(q);
  let best = Math.min(dPunctArc(p0, q), dPunctArc(p1, q), dPunctArc(q0, p), dPunctArc(q1, p));
  // Concentrice: dacă unghiurile se suprapun, un capăt al unuia e în unghiul celuilalt (două intervale de pe cerc care se
  // suprapun au un capăt al unuia în celălalt), iar distanța lui până la celălalt arc e chiar |r1 − r2|: capetele ajung.
  if (d === 0) return best;
  if (d <= p.r + q.r && d >= Math.abs(p.r - q.r)) {
    const a = (p.r * p.r - q.r * q.r + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, p.r * p.r - a * a));
    const mx = p.c.x + (a * dx) / d, my = p.c.y + (a * dy) / d;
    for (const sg of [1, -1]) {
      const X = pt(mx - (sg * h * dy) / d, my + (sg * h * dx) / d);
      if (inUnghi(p, Math.atan2(X.y - p.c.y, X.x - p.c.x)) && inUnghi(q, Math.atan2(X.y - q.c.y, X.x - q.c.x))) return 0;
    }
  }
  const phi = Math.atan2(dy, dx);
  for (const u1 of [phi, phi + Math.PI]) {
    if (!inUnghi(p, u1)) continue;
    for (const u2 of [phi, phi + Math.PI]) {
      if (!inUnghi(q, u2)) continue;
      best = Math.min(best, dist(peCerc(p.c, p.r, u1), peCerc(q.c, q.r, u2)));
    }
  }
  return best;
}

/** Distanța exactă (până la rotunjire) dintre două primitive. */
export function distantaExacta(p: Primitiva, q: Primitiva): number {
  if (p.tip === 'punct') return dPunct(p.p, q);
  if (q.tip === 'punct') return dPunct(q.p, p);
  if (p.tip === 'segment') return q.tip === 'segment' ? dSegmentSegment(p, q) : dSegmentArc(p, q);
  return q.tip === 'segment' ? dSegmentArc(q, p) : dArcArc(p, q);
}

/** Distanța exactă dintre două liste de primitive (contururi sau trasee). */
export function distantaListe(ps: readonly Primitiva[], qs: readonly Primitiva[], prag = Infinity): number {
  let d = prag;
  const cq = qs.map(cutiePrimitiva);
  for (const p of ps) {
    const cp = cutiePrimitiva(p);
    for (let j = 0; j < qs.length; j++) {
      if (distantaCutii(cp, cq[j]!) >= d) continue;
      const x = distantaExacta(p, qs[j]!);
      if (x < d) d = x;
    }
  }
  return d;
}

// ---------------------------------------------------------------------------------------------------------------
// Contururile exacte, din forma documentului și matricea în lume (ADR 0024: x′ = a·x + c·y + e, y′ = b·x + d·y + f).

export type FormaO =
  | { readonly tip: 'cerc'; readonly raza: number }
  | { readonly tip: 'dreptunghi'; readonly latime: number; readonly inaltime: number; readonly razaColt: number };

const aplica = (m: MatriceO, p: Pt): Pt => pt(m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f);
const det = (m: MatriceO): number => m.a * m.d - m.b * m.c;

function inversa(m: MatriceO): MatriceO {
  const D = det(m);
  return {
    a: m.d / D, b: -m.b / D, c: -m.c / D, d: m.a / D,
    e: (m.c * m.f - m.d * m.e) / D, f: (m.b * m.e - m.a * m.f) / D,
  };
}

/** Rotire + scalare uniformă, eventual cu oglindire (ADR 0024, precizarea 5). ALEGERE: toleranța relativă 1e-9. */
export function esteSimilitudine(m: MatriceO): boolean {
  const s = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
  const tol = 1e-9 * Math.max(1, s);
  const directa = Math.abs(m.a - m.d) <= tol && Math.abs(m.b + m.c) <= tol;
  const oglindita = Math.abs(m.a + m.d) <= tol && Math.abs(m.b - m.c) <= tol;
  return (directa || oglindita) && det(m) !== 0;
}

/** O primitivă locală dusă în lume printr-o similitudine (arcul își păstrează forma, sensul se schimbă la oglindire). */
function mapeazaSimilitudine(m: MatriceO, p: Primitiva): Primitiva {
  if (p.tip === 'punct') return punct(aplica(m, p.p));
  if (p.tip === 'segment') return segment(aplica(m, p.a), aplica(m, p.b));
  const s = Math.sqrt(Math.abs(det(m)));
  const c = aplica(m, p.c);
  const st = aplica(m, peCerc(p.c, p.r, p.u0));
  return arc(c, p.r * s, Math.atan2(st.y - c.y, st.x - c.x), det(m) > 0 ? p.du : -p.du);
}

/**
 * Dreptunghiul [x0, x1] × [y0, y1] cu colțurile rotunjite cu raza r (r = 0: colțuri ascuțite), în sens trigonometric,
 * fără segmentele de lungime 0. Centrele colțurilor: (x0 + r, y0 + r) etc.
 */
function dreptunghiLocal(x0: number, y0: number, x1: number, y1: number, r: number): Primitiva[] {
  const rez: Primitiva[] = [];
  const seg = (a: Pt, b: Pt): void => { if (a.x !== b.x || a.y !== b.y) rez.push(segment(a, b)); };
  const col = (cx: number, cy: number, u0: number): void => { if (r > 0) rez.push(arc(pt(cx, cy), r, u0, Math.PI / 2)); };
  seg(pt(x0 + r, y0), pt(x1 - r, y0));
  col(x1 - r, y0 + r, -Math.PI / 2);
  seg(pt(x1, y0 + r), pt(x1, y1 - r));
  col(x1 - r, y1 - r, 0);
  seg(pt(x1 - r, y1), pt(x0 + r, y1));
  col(x0 + r, y1 - r, Math.PI / 2);
  seg(pt(x0, y1 - r), pt(x0, y0 + r));
  col(x0 + r, y0 + r, Math.PI);
  return rez;
}

export type Contur = {
  readonly tip: 'cerc' | 'dreptunghi';
  /** Conturul închis, în lume. */
  readonly primitive: readonly Primitiva[];
  /** Cutia fiecărei primitive, în aceeași ordine. */
  readonly cutiiPrimitive: readonly Cutie[];
  readonly cutie: Cutie;
  readonly arie: number;
  /** Un punct al conturului (pentru includere, §3). */
  readonly punct: Pt;
  /** Strict înăuntru (regula `evenodd` pe un contur convex simplu = interiorul lui). */
  readonly contine: (p: Pt) => boolean;
  /**
   * Traseul ideal al centrului sculei de rază R (§9): `exterior` = conturul crescut cu R, `interior` = micșorat cu R.
   * `null` dacă scula nu încape (alt refuz al aplicației, nu al regiunii).
   */
  readonly drumIdeal: (R: number, latura: 'exterior' | 'interior') => Primitiva[] | null;
};

export function contur(forma: FormaO, m: MatriceO): Contur {
  if (det(m) === 0 || ![m.a, m.b, m.c, m.d, m.e, m.f].every(Number.isFinite)) throw new Error('matrice degenerată');
  if (forma.tip === 'cerc') {
    if (!esteSimilitudine(m)) throw new Error('cerc sub o matrice care nu e similitudine');
    const c = aplica(m, pt(0, 0));
    const rho = forma.raza * Math.sqrt(Math.abs(det(m)));
    return {
      tip: 'cerc',
      primitive: [cercP(c, rho)],
      cutiiPrimitive: [{ minX: c.x - rho, maxX: c.x + rho, minY: c.y - rho, maxY: c.y + rho }],
      cutie: { minX: c.x - rho, maxX: c.x + rho, minY: c.y - rho, maxY: c.y + rho },
      arie: Math.PI * rho * rho,
      punct: pt(c.x + rho, c.y),
      contine: (p) => dist(p, c) < rho,
      drumIdeal: (R, latura) => {
        if (latura === 'exterior') return [cercP(c, rho + R)];
        const rest = rho - R;
        return rest > 0 ? [cercP(c, rest)] : rest === 0 ? [punct(c)] : null;
      },
    };
  }
  const { latime: w, inaltime: h, razaColt: rc } = forma;
  const inv = inversa(m);
  const contineLocal = (q: Pt): boolean => {
    if (!(q.x > 0 && q.x < w && q.y > 0 && q.y < h)) return false;
    const dx = Math.max(rc - q.x, q.x - (w - rc), 0), dy = Math.max(rc - q.y, q.y - (h - rc), 0);
    return !(dx > 0 && dy > 0 && dx * dx + dy * dy >= rc * rc);
  };
  const contine = (p: Pt): boolean => contineLocal(aplica(inv, p));
  const arie = Math.abs(det(m)) * (w * h - (4 - Math.PI) * rc * rc);
  if (esteSimilitudine(m)) {
    const s = Math.sqrt(Math.abs(det(m)));
    const lume = (ps: Primitiva[]): Primitiva[] => ps.map((p) => mapeazaSimilitudine(m, p));
    const primitive = lume(dreptunghiLocal(0, 0, w, h, rc));
    return {
      tip: 'dreptunghi', primitive, cutiiPrimitive: primitive.map(cutiePrimitiva), cutie: cutieLista(primitive), arie,
      punct: startul(primitive[0]!), contine,
      drumIdeal: (R, latura) => {
        const Rl = R / s;
        if (latura === 'exterior') return lume(dreptunghiLocal(-Rl, -Rl, w + Rl, h + Rl, rc + Rl));
        if (w - 2 * Rl < 0 || h - 2 * Rl < 0) return null;
        const drum = lume(dreptunghiLocal(Rl, Rl, w - Rl, h - Rl, Math.max(rc - Rl, 0)));
        return drum.length ? drum : [punct(aplica(m, pt(w / 2, h / 2)))];
      },
    };
  }
  if (rc !== 0) throw new Error('dreptunghi rotunjit sub o matrice care nu e similitudine');
  // Paralelogramul (orice matrice afină, colțuri ascuțite), în sens trigonometric.
  const V0 = [pt(0, 0), pt(w, 0), pt(w, h), pt(0, h)].map((p) => aplica(m, p));
  const V = det(m) > 0 ? V0 : [...V0].reverse();
  const n = V.map((p, i) => {
    const q = V[(i + 1) % 4]!;
    const L = dist(p, q);
    return pt((q.y - p.y) / L, -(q.x - p.x) / L); // normala exterioară, pentru sensul trigonometric
  });
  const primitive = V.map((p, i) => segment(p, V[(i + 1) % 4]!));
  return {
    tip: 'dreptunghi', primitive, cutiiPrimitive: primitive.map(cutiePrimitiva), cutie: cutieLista(primitive), arie, punct: V[0]!, contine,
    drumIdeal: (R, latura) => {
      if (latura === 'exterior') {
        const rez: Primitiva[] = [];
        for (let i = 0; i < 4; i++) {
          const a = V[i]!, b = V[(i + 1) % 4]!, ni = n[i]!, nj = n[(i + 1) % 4]!;
          rez.push(segment(pt(a.x + R * ni.x, a.y + R * ni.y), pt(b.x + R * ni.x, b.y + R * ni.y)));
          const u0 = Math.atan2(ni.y, ni.x);
          let du = Math.atan2(nj.y, nj.x) - u0;
          while (du <= 0) du += DOI_PI;
          rez.push(arc(b, R, u0, du));
        }
        return rez;
      }
      // Înălțimea pe fiecare latură trebuie să încapă 2R; vârfurile noi = intersecțiile laturilor mutate cu R înăuntru.
      for (let i = 0; i < 4; i++) {
        const ni = n[i]!, k = ni.x * V[i]!.x + ni.y * V[i]!.y;
        const inaltime = Math.max(...V.map((p) => k - (ni.x * p.x + ni.y * p.y)));
        if (inaltime < 2 * R) return null;
      }
      const W = V.map((_, i) => {
        const a = n[(i + 3) % 4]!, b = n[i]!;
        const ka = a.x * V[(i + 3) % 4]!.x + a.y * V[(i + 3) % 4]!.y - R;
        const kb = b.x * V[i]!.x + b.y * V[i]!.y - R;
        const D = a.x * b.y - a.y * b.x;
        return pt((ka * b.y - kb * a.y) / D, (a.x * kb - b.x * ka) / D);
      });
      return W.map((p, i) => segment(p, W[(i + 1) % 4]!));
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Regiunea păstrată.

export type Rol = 'piesa' | 'gol';
export type Inel = { readonly idLume: string; readonly rol: Rol; readonly contur: Contur };
export type ProblemaRegiune = { readonly tip: 'ambele-laturi' | 'atingere'; readonly elemente: readonly string[]; readonly mesaj: string };
/** Ce tăieturi are un element în lume: tipul formei și, pe fiecare latură, adâncimile operațiilor (pentru etichete). */
export type TaieturaDoc = { readonly tip: string; readonly laturi: ReadonlyMap<LaturaO, readonly number[]> };

export type Regiune = {
  readonly inele: readonly Inel[];
  /** Indicele părintelui fiecărui inel (−1: niciunul). */
  readonly parinte: readonly number[];
  /** Inelul mărginește K: e piesă, sau părintele lui e piesă. */
  readonly margineK: readonly boolean[];
  readonly probleme: readonly ProblemaRegiune[];
  readonly taieturi: ReadonlyMap<string, TaieturaDoc>;
};

/** Pădurea, marginea lui K și atingerile, din inele. */
export function regiuneDinInele(
  inele: readonly Inel[], probleme: readonly ProblemaRegiune[] = [], taieturi: ReadonlyMap<string, TaieturaDoc> = new Map(),
): Regiune {
  const toate = [...probleme];
  for (let i = 0; i < inele.length; i++) {
    for (let j = i + 1; j < inele.length; j++) {
      const a = inele[i]!, b = inele[j]!;
      if (distantaCutii(a.contur.cutie, b.contur.cutie) >= ATINGERE) continue;
      const d = distantaListe(a.contur.primitive, b.contur.primitive);
      if (d < ATINGERE) {
        toate.push({ tip: 'atingere', elemente: [a.idLume, b.idLume], mesaj: `inelele ${a.idLume} și ${b.idLume} se ating (la ${d.toExponential(2)} mm)` });
      }
    }
  }
  const parinte = inele.map((b, j) => {
    let cel = -1;
    for (let i = 0; i < inele.length; i++) {
      if (i === j) continue;
      const a = inele[i]!;
      if (!a.contur.contine(b.contur.punct)) continue;
      if (cel < 0 || a.contur.arie < inele[cel]!.contur.arie) cel = i;
    }
    return cel;
  });
  const margineK = inele.map((x, i) => x.rol === 'piesa' || (parinte[i]! >= 0 && inele[parinte[i]!]!.rol === 'piesa'));
  return { inele, parinte, margineK, probleme: toate, taieturi };
}

/** §1: inelele foii 0, din tăieturile documentului (oracolul documentului dă matricea în lume și ordinea). */
export function regiuneDinDocument(doc: DocV3O): Regiune {
  type Acum = { forma: FormaO; matrice: MatriceO; laturi: Map<LaturaO, number[]> };
  const pe = new Map<string, Acum>();
  for (const t of taieturiV3O(doc, 0)) {
    let x = pe.get(t.idLume);
    if (!x) {
      x = { forma: t.forma as FormaO, matrice: t.matrice, laturi: new Map() };
      pe.set(t.idLume, x);
    }
    const l = x.laturi.get(t.latura) ?? [];
    l.push(t.adancime);
    x.laturi.set(t.latura, l);
  }
  const inele: Inel[] = [];
  const probleme: ProblemaRegiune[] = [];
  const taieturi = new Map<string, TaieturaDoc>();
  for (const [idLume, x] of pe) {
    taieturi.set(idLume, { tip: x.forma.tip, laturi: x.laturi });
    const ext = x.laturi.has('exterior'), int = x.laturi.has('interior');
    if (ext && int) {
      probleme.push({ tip: 'ambele-laturi', elemente: [idLume], mesaj: `${idLume} are operații și pe exterior, și pe interior` });
      continue;
    }
    if (ext || int) inele.push({ idLume, rol: ext ? 'piesa' : 'gol', contur: contur(x.forma, x.matrice) });
  }
  return regiuneDinInele(inele, probleme, taieturi);
}

/** Cel mai mic inel care conține strict punctul (−1: niciunul). */
export function celMaiMic(reg: Regiune, p: Pt): number {
  let cel = -1;
  for (let i = 0; i < reg.inele.length; i++) {
    const c = reg.inele[i]!.contur;
    if (!c.contine(p)) continue;
    if (cel < 0 || c.arie < reg.inele[cel]!.contur.arie) cel = i;
  }
  return cel;
}

/** §4, pentru un punct care nu stă pe un inel. */
export function inK(reg: Regiune, p: Pt): boolean {
  const i = celMaiMic(reg, p);
  return i >= 0 && reg.inele[i]!.rol === 'piesa';
}

/** §5: partea proprie a inelului i (piesa: înăuntru; golul: în afară). */
export function inParteaProprie(reg: Regiune, i: number, p: Pt): boolean {
  const c = reg.inele[i]!;
  return c.rol === 'piesa' ? c.contur.contine(p) : !c.contur.contine(p);
}

/** Inelele care contează pentru tăietura inelului i: marginile lui K și i însuși. */
function relevante(reg: Regiune, i: number): number[] {
  return reg.inele.flatMap((_, j) => (j === i || reg.margineK[j] ? [j] : []));
}

// ---------------------------------------------------------------------------------------------------------------
// Predicția, pe offsetul ideal (§9): exact.

export type Patrundere = {
  readonly idLume: string;
  /** Cât intră discul sculei în K ∪ S(C) pe traseul ideal: R − distanța (≥ R dacă centrul e înăuntru). */
  readonly patrundere: number;
  readonly in: string;
  /** Față de pragul exact max(R − ε, 1e-6): sub el (`incalca`), la ±BANDA_NUMERICA de el (`limita`), peste (`ok`). */
  readonly stare: 'incalca' | 'limita' | 'ok';
};
export type Predictie = {
  readonly probleme: readonly ProblemaRegiune[];
  /** Inelele în care scula nu încape (alt refuz al aplicației). */
  readonly nuIncape: readonly string[];
  /** Inelele cu pătrundere > 0 pe traseul ideal. */
  readonly patrunderi: readonly Patrundere[];
  /**
   * `refuz`: o problemă de inele sau un traseu ideal sub prag (aplicația TREBUIE să refuze); `curat`: niciunul (aplicația
   * NU are voie să refuze cu `regiunea păstrată:`); `banda`: un traseu la ±1e-7 de prag, oricare.
   */
  readonly verdict: 'refuz' | 'curat' | 'banda';
};

export function prezice(reg: Regiune, diametru: number): Predictie {
  const R = diametru / 2;
  const P = prag(R);
  const nuIncape: string[] = [];
  const patrunderi: Patrundere[] = [];
  reg.inele.forEach((inel, i) => {
    const drum = inel.contur.drumIdeal(R, inel.rol === 'piesa' ? 'exterior' : 'interior');
    if (drum === null) {
      nuIncape.push(inel.idLume);
      return;
    }
    const cutieDrum = cutieLista(drum);
    let dmin = Infinity;
    let in_ = '';
    for (const j of relevante(reg, i)) {
      if (j === i) continue; // traseul ideal stă, prin construcție, la exact R de propriul inel
      const x = reg.inele[j]!;
      if (distantaCutii(cutieDrum, x.contur.cutie) >= R) continue;
      const d = distantaListe(drum, x.contur.primitive, Math.min(dmin, R));
      if (d < dmin) {
        dmin = d;
        in_ = x.idLume;
      }
    }
    let pen = Math.max(0, R - dmin);
    let inauntru = false;
    if (dmin > 0) {
      // Fără atingeri cu marginile, apartenența e constantă pe traseu: un punct ajunge.
      const p0 = startul(drum[0]!);
      const k = celMaiMic(reg, p0);
      if (k >= 0 && reg.inele[k]!.rol === 'piesa') { inauntru = true; in_ = reg.inele[k]!.idLume; }
      else if (inParteaProprie(reg, i, p0)) { inauntru = true; in_ = inel.idLume; }
      if (inauntru) pen = Math.max(pen, R);
    }
    const stare = inauntru || dmin < P - BANDA_NUMERICA ? 'incalca' : dmin <= P + BANDA_NUMERICA ? 'limita' : 'ok';
    if (pen > 0 || stare !== 'ok') patrunderi.push({ idLume: inel.idLume, patrundere: pen, in: in_, stare });
  });
  const verdict = reg.probleme.length > 0 || patrunderi.some((p) => p.stare === 'incalca')
    ? 'refuz'
    : patrunderi.some((p) => p.stare === 'limita') ? 'banda' : 'curat';
  return { probleme: reg.probleme, nuIncape, patrunderi, verdict };
}

// ---------------------------------------------------------------------------------------------------------------
// Poarta: o mișcare de tăiere (în coordonatele documentului), eșantionată.

export type IncalcareMutare = { readonly patrundere: number; readonly la: Pt; readonly in: string };

/**
 * Invarianta 2 pe o primitivă a unei mișcări de tăiere pe inelul i: fiecare punct în afara lui K ∪ S(C), la cel puțin
 * `T` (pragul: `prag(R, rotunjire)`). Întoarce cea mai adâncă încălcare găsită (sau null).
 */
/** Distanța de la un punct la o primitivă, cu capetele arcului calculate o singură dată (bucla fierbinte a porții). */
function distantaPregatita(q: Primitiva): (p: Pt) => number {
  if (q.tip === 'punct') return (p) => dist(p, q.p);
  if (q.tip === 'segment') return (p) => dPunctSegment(p, q.a, q.b);
  const [e0, e1] = capeteArc(q);
  return (p) => {
    const vx = p.x - q.c.x, vy = p.y - q.c.y;
    const rho = Math.hypot(vx, vy);
    if (rho === 0) return q.r;
    if (inUnghi(q, Math.atan2(vy, vx))) return Math.abs(rho - q.r);
    return Math.min(dist(p, e0), dist(p, e1));
  };
}

export function verificaMutarea(reg: Regiune, i: number, prim: Primitiva, R: number, T: number): IncalcareMutare | null {
  const filtru = Math.max(T, PAS_MIN);
  const cutieM = cutiePrimitiva(prim);
  // Doar primitivele inelelor relevante a căror cutie e la mai puțin de T de cutia mișcării: celelalte sunt, în tot
  // lungul mișcării, la cel puțin T (deci nici nu încalcă, nici nu pot fi traversate).
  const aproape: Array<{ readonly d: (p: Pt) => number; readonly inel: number }> = [];
  for (const j of relevante(reg, i)) {
    const c = reg.inele[j]!.contur;
    if (distantaCutii(cutieM, c.cutie) >= filtru) continue;
    c.primitive.forEach((q, k) => { if (distantaCutii(cutieM, c.cutiiPrimitive[k]!) < filtru) aproape.push({ d: distantaPregatita(q), inel: j }); });
  }
  const clasificaMereu = T < 2 * PAS_MIN;
  const L = lungime(prim);
  let rau: IncalcareMutare | null = null;
  const noteaza = (x: IncalcareMutare): void => { if (!rau || x.patrundere > rau.patrundere) rau = x; };
  for (let s = 0; ; ) {
    const p = punctLa(prim, s);
    let d = Infinity;
    let cine = -1;
    for (const q of aproape) {
      const x = q.d(p);
      if (x < d) { d = x; cine = q.inel; }
    }
    if (d < T) noteaza({ patrundere: R - d, la: p, in: reg.inele[cine]!.idLume });
    if ((s === 0 || clasificaMereu) && d > 0) {
      const k = celMaiMic(reg, p);
      const adanc = R + (Number.isFinite(d) ? d : 0);
      if (k >= 0 && reg.inele[k]!.rol === 'piesa') noteaza({ patrundere: adanc, la: p, in: reg.inele[k]!.idLume });
      else if (inParteaProprie(reg, i, p)) noteaza({ patrundere: adanc, la: p, in: reg.inele[i]!.idLume });
    }
    if (s >= L) break;
    s = Math.min(L, s + (d < T ? PAS_INCALCARE : Math.max(d - T, PAS_MIN)));
  }
  return rau;
}

// ---------------------------------------------------------------------------------------------------------------
// Etichetele (§7): `(<idLume>: <tip>, <latura>, <adâncime> mm)`.

export type Eticheta = { readonly idLume: string; readonly tip: string; readonly latura: LaturaO; readonly adancime: number };

const ETICHETA = /^\(([A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_-]{1,64}): ([a-z]+), (exterior|interior|pe-linie), (\d+(?:[.,]\d+)?) mm\)$/;
/** Un comentariu care începe ca o etichetă („id/id:”) sau numește o latură, dar nu e una bine formată. */
const SEAMANA_ETICHETA = /^\(\s*[A-Za-z0-9_-]+\s*\/\s*[A-Za-z0-9_-]+\s*:|\b(exterior|interior|pe-linie)\b/;

/** Eticheta din comentariu; 'stricata' dacă seamănă cu una fără să fie bine formată; null dacă nu e etichetă. */
export function citesteEticheta(text: string): Eticheta | 'stricata' | null {
  const m = ETICHETA.exec(text);
  if (m) return { idLume: m[1]!, tip: m[2]!, latura: m[3] as LaturaO, adancime: Number(m[4]!.replace(',', '.')) };
  return SEAMANA_ETICHETA.test(text) ? 'stricata' : null;
}

/** Eticheta trebuie să fie a unei tăieturi a documentului (elementul, tipul, latura, adâncimea unei operații). */
export function verificaEticheta(reg: Regiune, e: Eticheta): string | null {
  const t = reg.taieturi.get(e.idLume);
  if (!t) return `${e.idLume} nu are tăieturi pe foaia 0`;
  if (t.tip !== e.tip) return `${e.idLume} e ${t.tip}, nu ${e.tip}`;
  const ad = t.laturi.get(e.latura);
  if (!ad) return `${e.idLume} n-are operații ${e.latura}`;
  if (!ad.some((a) => Math.abs(a - e.adancime) <= 0.0005 + 1e-9)) return `${e.idLume} n-are o operație ${e.latura} de ${e.adancime} mm`;
  return null;
}
