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
 *
 * Felia 2.3b (ADR 0027): tăieturile documentului poartă și sensul fiecărei operații (`TaieturaDoc.sensuri`, în
 * paralel cu adâncimile), citit de invarianta 9 (`sens.ts`). Un document v3 se aduce întâi la v4 (migrarea oracolului
 * dă `urcare`), ca sensul așteptat să fie cel cu care aplicația v4 taie un proiect vechi.
 *
 * Felia 2.4 (ADR 0028): tăieturile poartă și urechile fiecărei operații (`TaieturaDoc.urechi`, tot în paralel cu
 * adâncimile), iar regiunea ține grosimea foii 0 (`grosimeFoaie`): invarianta 10 (`urechi.ts`) socotește vârful urechii
 * de la fața de jos a foii (varf = grosimeFoaie − g). Un document mai vechi se aduce întâi la v5 (`urechi: null`).
 *
 * Felia 2.5a (ADR 0029): tăieturile poartă și rampa fiecărei operații (`TaieturaDoc.rampe`, tot în paralel cu
 * adâncimile), citită de invariantele 10 (amendată) și 11 (`rampa.ts`). Un document mai vechi se aduce întâi la v6
 * (`rampa: null`).
 *
 * Felia 2.5b (ADR 0030, sesiune independentă): tăieturile poartă și intrările fiecărei operații (`TaieturaDoc.intrari`,
 * tot în paralel cu adâncimile), citite de invariantele 9, 11 (amendate) și 12 (`intrari.ts`). Un document mai vechi se
 * aduce întâi la v7 (`intrari: null`).
 *
 * Felia 2.6 (ADR 0032, sesiune independentă): tăieturile poartă și degajările fiecărei operații (`TaieturaDoc.colturi`,
 * tot în paralel cu adâncimile), citite de invariantele 2 (amendată) și 13 (`degajari.ts`). Un document mai vechi se
 * aduce întâi la v8 (`colturi: null`).
 *
 * Felia 2.7b (ADR 0034, sesiune independentă): forma `cale` (linii, arce cu `bulge`, cubice), în documentul v9 (primit
 * ca atare; unul mai vechi se aduce întâi la v9). Conturul ei în lume (`contur`), MĂSURA MEA, nu biarcele aplicației:
 * - liniile: segmente exacte; arcele: arce exacte (centrul și raza din coardă și `bulge`, sub similitudine, ca la
 *   dreptunghiul rotunjit; o cale cu arce sub altă matrice aruncă, ca acolo);
 * - cubicele: imaginea afină a unei cubice e cubica punctelor de control transformate (exact), apoi împărțită de
 *   Casteljau până când fiecare bucată e PLATĂ: c1 și c2 la cel mult `SAGETA_CUBICA` = 1e-4 mm de coarda ei. Curba stă
 *   în învelitoarea convexă a punctelor de control, deci la cel mult 1e-4 de coardă, iar proiecția ei pe coardă o
 *   acoperă: distanța Hausdorff dintre curbă și polilinie e ≤ 1e-4 mm, în ambele sensuri;
 * - de ce ajunge: invarianta 2 cere distanța traseului ≥ R − ε − rotunjirea (ε = 0,005, rotunjirea 0,002). Traseul
 *   aplicației stă la R − 0,00099 (biarcele, ADR 0033) de calea exactă, iar măsura mea greșește cu cel mult 1e-4; rămân
 *   ~0,004 mm de rezervă până la prag, deci verdictul nu depinde de aproximarea mea decât la o pătrundere reală mai mică
 *   de 1e-4 mm peste prag (declarată). Includerea (`evenodd`) se face pe aceeași polilinie, cu arcele aproximate la fel
 *   (1e-4): greșește doar pentru puncte la sub 1e-4 mm de contur, unde invarianta 2 judecă distanța, nu apartenența;
 * - `drumIdeal` nu există pentru o cale (offsetul exact al unei căi oarecare nu e scris aici): predicția (`prezice`) o
 *   trece la „scula nu încape”, iar oracolele care cer bucla exactă (intrările: candidații; degajările: §5) folosesc,
 *   pentru căi, bucla citită din program (`degajari.ts`) sau sar verificarea (intrările), cu limitele spuse în raport;
 * - `laturiCale`: laturile căii în lume, cu tipul lor (L, A, C), pentru colțurile degajărilor (§2: doar L–L);
 * - RECENZIA (11.10, ADR 0034 §6): `laturiCale` poartă și tangentele de capăt (arcul: din arcul în lume; cubica: mânerul,
 *   celălalt mâner, coarda), arcul în lume și punctele de control (colțurile curbe, curbele strânse, arcele sub R ale
 *   desenului, în `degajari.ts`); pragul atingerii a două inele e 1e-6 + 0,001 · câte dintre ele vin din căi cu cubice
 *   (`cuCubice`), fiindcă inelul aplicației, din biarce, stă la cel mult 0,001 de desen.
 *
 * Felia 2.3c-2 (ADR 0037, documentul v10; sesiune independentă): `regiuneDinDocument` primește și un v10. Tăieturile vin
 * în ordinea de la §8 (`taieturiV10O`, ținute întregi în `Regiune.ordine`, cu marcajul despărțirii și clasa); o cale cu
 * `inchis: false` rămâne DESCHISĂ (`contur(…, deschise)`: doar cele n − 1 segmente reale, fără coarda de închidere, cu
 * capetele în lume), primește `TaieturaDoc.inchis = false` și nu devine inel (§10: K nu se schimbă). Laturile
 * `stanga` / `dreapta` nu intră în hărțile tăieturilor (le judecă 2.3c-5), ci doar în `ordine`. Alături,
 * `Regiune.inainteDe0037` e regiunea pe care o construia oracolul de dinainte din același document (orice cale închisă,
 * ordinea din ADR 0025): o citește poarta în modul `inainteDe0037`. Un document v3 … v9 se construiește exact ca înainte.
 *
 * Felia 2.3c-5 (ADR 0037 §3, §10, §13; sesiune independentă): laturile `stanga` / `dreapta` intră și ele în hărțile
 * tăieturilor (`TaieturaDoc.laturi`, `sensuri`, …), deci etichetele lor se leagă de operație ca oricare alta, iar
 * eticheta `(<idLume>: cale, stanga|dreapta, <adâncime> mm)` e recunoscută (`citesteEticheta`; modul `inainteDe0037`
 * citește cu regexul de dinainte). Regiunea ține PEREȚII (`Regiune.pereti`, §10): fiecare cale deschisă cu o operație
 * pe o parte dă un perete, cu conturul ei deschis în lume și partea sculei în lume, `parteaLume` = latura XOR (det < 0)
 * a matricei în lume (§3). K nu se schimbă: un perete nu e inel. Judecata pereților e în `parte.ts`.
 */
import {
  ridicaV9O, taieturiV8O, type ColturiO, type DocV3O, type DocV4O, type DocV5O, type DocV6O, type DocV7O, type DocV8O, type DocV9O, type IntrariO, type LaturaO,
  type DocV10O, type DocV11O, type DocV12O, type LaturaV10O, type MatriceO, type RampaO, type SensO, type UrechiO,
} from './document.ts';
import { esteDeschisaO, taieturiV10O, type TaieturaV10O } from './document.v10.ts';

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

/** ADR 0034: un vârf al căii (coordonatele elementului) și segmentul care pleacă din el. */
export type VarfCale = {
  readonly p: Pt;
  readonly s: { readonly tip: 'L' } | { readonly tip: 'A'; readonly bulge: number } | { readonly tip: 'C'; readonly c1: Pt; readonly c2: Pt };
};
/** O latură a căii în lume, cu tipul ei (pentru colțurile degajărilor) și capetele. */
export type LaturaCale = {
  readonly tip: 'L' | 'A' | 'C'; readonly a: Pt; readonly b: Pt;
  /**
   * Felia 2.7b (recenzia, ADR 0034 §6): tangentele de capăt, în lume (nenormate): la linie, coarda; la arc, din arcul în
   * lume (deci și sub o oglindire); la cubică, mânerul, apoi celălalt mâner, apoi coarda. Plus arcul în lume și
   * punctele de control ale cubicei în lume.
   */
  readonly t0?: Pt; readonly t1?: Pt; readonly arc?: Arc; readonly c1?: Pt; readonly c2?: Pt;
};
/** Săgeata la care se aproximează o cubică (antetul). */
export const SAGETA_CUBICA = 1e-4;

export type FormaO =
  | { readonly tip: 'cale'; readonly inchis: boolean; readonly varfuri: readonly VarfCale[] }
  | { readonly tip: 'cerc'; readonly raza: number }
  | { readonly tip: 'dreptunghi'; readonly latime: number; readonly inaltime: number; readonly razaColt: number };

const aplica = (m: MatriceO, p: Pt): Pt => pt(m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f);
const det = (m: MatriceO): number => m.a * m.d - m.b * m.c;

/** ADR 0037 §3: o latură pe o parte (partea pe care merge freza, în sensul desenului). */
export type ParteO = 'stanga' | 'dreapta';
export const peOParte = (l: string | null | undefined): l is ParteO => l === 'stanga' || l === 'dreapta';
/**
 * ADR 0037 §3: partea sculei pe foaie. Partea se socotește în coordonatele elementului; sub o matrice în lume cu
 * determinantul negativ (o oglindire), ea se inversează odată cu forma: `parteaLume = latura XOR (det < 0)`.
 */
export function parteaLume(latura: ParteO, m: MatriceO): ParteO {
  return det(m) < 0 ? (latura === 'stanga' ? 'dreapta' : 'stanga') : latura;
}

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
  readonly tip: 'cerc' | 'dreptunghi' | 'cale';
  /** Conturul închis, în lume (ADR 0037: la o cale deschisă, doar cele n − 1 segmente reale, fără coarda de închidere). */
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
  /** Doar la cale: laturile ei în lume, cu tipul lor, în ordinea căii, și sensul ei (+1 = trigonometric, din aria cu semn). */
  readonly laturiCale?: readonly LaturaCale[];
  readonly orientare?: 1 | -1;
  /** Doar la cale: are cel puțin o cubică (ADR 0034 §6, recenzia: pragul atingerii crește cu 0,001). */
  readonly cuCubice?: boolean;
  /** ADR 0037: calea e deschisă (documentul v10, `inchis: false`), cu capetele ei în lume: vârful 0 și ultimul vârf. */
  readonly deschis?: true;
  readonly capete?: readonly [Pt, Pt];
};

/** Punctul de la fracțiunea t al cubicei (a, c1, c2, b). */
function deCasteljau(a: Pt, c1: Pt, c2: Pt, b: Pt, t: number): readonly [readonly [Pt, Pt, Pt, Pt], readonly [Pt, Pt, Pt, Pt]] {
  const l = (p: Pt, q: Pt): Pt => pt(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t);
  const ab = l(a, c1), bc = l(c1, c2), cd = l(c2, b);
  const abc = l(ab, bc), bcd = l(bc, cd);
  const m = l(abc, bcd);
  return [[a, ab, abc, m], [m, bcd, cd, b]];
}

/** Cubica (în lume) ca polilinie cu săgeata cel mult `sageata` (antetul): segmentele, în ordine. */
export function cubicaPolilinie(a: Pt, c1: Pt, c2: Pt, b: Pt, sageata = SAGETA_CUBICA): Segment[] {
  const rez: Segment[] = [];
  const pas = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, adanc: number): void => {
    const plata = Math.max(dPunctSegment(p1, p0, p3), dPunctSegment(p2, p0, p3));
    if (plata <= sageata || adanc >= 40) {
      if (p0.x !== p3.x || p0.y !== p3.y) rez.push(segment(p0, p3));
      return;
    }
    const [st, dr] = deCasteljau(p0, p1, p2, p3, 0.5);
    pas(st[0], st[1], st[2], st[3], adanc + 1);
    pas(dr[0], dr[1], dr[2], dr[3], adanc + 1);
  };
  pas(a, c1, c2, b, 0);
  return rez;
}

/** Arcul de la a la b cu `bulge` (local, ADR 0001: bulge = tan(baleiaj / 4), pozitiv trigonometric); null fără cerc. */
export function arcBulge(a: Pt, b: Pt, bulge: number): Arc | null {
  const c = dist(a, b);
  if (!(c > 0) || bulge === 0 || !Number.isFinite(bulge)) return null;
  const ux = (b.x - a.x) / c, uy = (b.y - a.y) / c;
  const h = (c * (1 - bulge * bulge)) / (4 * bulge);
  const cen = pt((a.x + b.x) / 2 - uy * h, (a.y + b.y) / 2 + ux * h);
  const r = (c * (1 + bulge * bulge)) / (4 * Math.abs(bulge));
  return arc(cen, r, Math.atan2(a.y - cen.y, a.x - cen.x), 4 * Math.atan(bulge));
}

/** Punctele unei liste de primitive, ca poligon închis (arcele la săgeata dată), pentru includere și arie. */
function poligon(ps: readonly Primitiva[], sageata: number): Pt[] {
  const rez: Pt[] = [];
  for (const q of ps) {
    if (q.tip === 'punct') { rez.push(q.p); continue; }
    if (q.tip === 'segment') { rez.push(q.a); continue; }
    const pasU = q.r > sageata ? 2 * Math.acos(1 - sageata / q.r) : Math.PI / 2;
    const n = Math.max(1, Math.ceil(Math.abs(q.du) / pasU));
    for (let k = 0; k < n; k++) rez.push(peCerc(q.c, q.r, q.u0 + (q.du * k) / n));
  }
  return rez;
}

/** `evenodd` pe un poligon (punctul strict înăuntru; pe margine, oricum). */
function inPoligon(vs: readonly Pt[], p: Pt): boolean {
  let in_ = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const a = vs[i]!, b = vs[j]!;
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) in_ = !in_;
  }
  return in_;
}

/**
 * ADR 0034: conturul unei căi în lume (antetul). ADR 0037 §2 (felia 2.3c-2): cu `deschise`, o cale cu `inchis: false` e
 * DESCHISĂ: doar cele n − 1 segmente reale, fără coarda de închidere (segmentul ultimului vârf nu e o latură), fără
 * interior și fără arie, cu capetele în lume. Fără `deschise` (poarta de dinainte de ADR 0037), orice cale se închide,
 * exact ca înainte.
 */
function conturCale(forma: Extract<FormaO, { tip: 'cale' }>, m: MatriceO, deschise = false): Contur {
  const vs = forma.varfuri;
  const deschis = deschise && forma.inchis === false;
  const areArce = vs.some((v) => v.s.tip === 'A');
  if (areArce && !esteSimilitudine(m)) throw new Error('cale cu arce sub o matrice care nu e similitudine');
  const primitive: Primitiva[] = [];
  const laturi: LaturaCale[] = [];
  (deschis ? vs.slice(0, -1) : vs).forEach((v, k) => {
    const urm = vs[(k + 1) % vs.length]!;
    const a = aplica(m, v.p), b = aplica(m, urm.p);
    const coarda = pt(b.x - a.x, b.y - a.y);
    if (v.s.tip === 'L') {
      laturi.push({ tip: 'L', a, b, t0: coarda, t1: coarda });
      if (a.x !== b.x || a.y !== b.y) primitive.push(segment(a, b));
      return;
    }
    if (v.s.tip === 'A') {
      const local = arcBulge(v.p, urm.p, v.s.bulge);
      const lume = local ? mapeazaSimilitudine(m, local) : null;
      if (lume && lume.tip === 'arc') {
        const tang = (u: number): Pt => pt(-Math.sign(lume.du) * Math.sin(u), Math.sign(lume.du) * Math.cos(u));
        laturi.push({ tip: 'A', a, b, t0: tang(lume.u0), t1: tang(lume.u0 + lume.du), arc: lume });
        primitive.push(lume);
      } else laturi.push({ tip: 'A', a, b });
      return;
    }
    const c1 = aplica(m, v.s.c1), c2 = aplica(m, v.s.c2);
    const nenul = (...vs: Pt[]): Pt => vs.find((q) => q.x !== 0 || q.y !== 0) ?? coarda;
    laturi.push({
      tip: 'C', a, b, c1, c2,
      t0: nenul(pt(c1.x - a.x, c1.y - a.y), pt(c2.x - a.x, c2.y - a.y), coarda), t1: nenul(pt(b.x - c2.x, b.y - c2.y), pt(b.x - c1.x, b.y - c1.y), coarda),
    });
    primitive.push(...cubicaPolilinie(a, c1, c2, b));
  });
  if (primitive.length === 0) throw new Error('cale fără nicio latură nenulă');
  if (deschis) {
    // ADR 0037 §2, §10: o cale deschisă nu e inel: nu conține nimic, n-are arie, nici sens de parcurgere al unei bucle.
    return {
      tip: 'cale', primitive, cutiiPrimitive: primitive.map(cutiePrimitiva), cutie: cutieLista(primitive), arie: 0,
      punct: aplica(m, vs[0]!.p), contine: () => false, drumIdeal: () => null, laturiCale: laturi,
      cuCubice: vs.slice(0, -1).some((v) => v.s.tip === 'C'), deschis: true, capete: [aplica(m, vs[0]!.p), aplica(m, vs[vs.length - 1]!.p)],
    };
  }
  const vsPoligon = poligon(primitive, SAGETA_CUBICA);
  let A = 0;
  for (let i = 0; i < vsPoligon.length; i++) {
    const p = vsPoligon[i]!, q = vsPoligon[(i + 1) % vsPoligon.length]!;
    A += p.x * q.y - q.x * p.y;
  }
  return {
    tip: 'cale', primitive, cutiiPrimitive: primitive.map(cutiePrimitiva), cutie: cutieLista(primitive), arie: Math.abs(A / 2),
    punct: aplica(m, vs[0]!.p), contine: (p) => inPoligon(vsPoligon, p), drumIdeal: () => null, laturiCale: laturi, orientare: A > 0 ? 1 : -1,
    cuCubice: vs.some((v) => v.s.tip === 'C'),
  };
}

/** Conturul exact în lume; `deschise` (ADR 0037): o cale cu `inchis: false` rămâne deschisă (`conturCale`). */
export function contur(forma: FormaO, m: MatriceO, deschise = false): Contur {
  if (det(m) === 0 || ![m.a, m.b, m.c, m.d, m.e, m.f].every(Number.isFinite)) throw new Error('matrice degenerată');
  if (forma.tip === 'cale') return conturCale(forma, m, deschise);
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
/**
 * `contur` (felia 2.7b, ALEGERE): o cale primită de ușă (ADR 0034 §2: ușa nu judecă geometria) al cărei contur nu se
 * poate construi (toate laturile nule), pe o latură `exterior` / `interior`: CAM-ul trebuie s-o refuze (gărzile
 * offsetului), iar un program care o taie totuși încalcă invarianta 2 (ca celelalte probleme ale documentului).
 */
export type ProblemaRegiune = { readonly tip: 'ambele-laturi' | 'atingere' | 'contur'; readonly elemente: readonly string[]; readonly mesaj: string };
/**
 * Ce tăieturi are un element în lume: tipul formei și, pe fiecare latură, adâncimile operațiilor (pentru etichete) și
 * sensurile lor (ADR 0027, în aceeași ordine: ordinea tăieturilor, adică a operațiilor în piesă).
 */
export type TaieturaDoc = {
  readonly tip: string;
  /** Felia 2.3c-5: cheile sunt laturile v10 (`stanga` / `dreapta` doar într-o regiune construită dintr-un v10). */
  readonly laturi: ReadonlyMap<LaturaV10O, readonly number[]>;
  readonly sensuri: ReadonlyMap<LaturaV10O, readonly SensO[]>;
  /** ADR 0028: urechile fiecărei operații (`null` = fără), în aceeași ordine; lipsă (regiune construită de mână) = fără. */
  readonly urechi?: ReadonlyMap<LaturaV10O, ReadonlyArray<UrechiO | null>>;
  /** ADR 0029: rampa fiecărei operații (`null` = fără), în aceeași ordine; lipsă (regiune construită de mână) = fără. */
  readonly rampe?: ReadonlyMap<LaturaV10O, ReadonlyArray<RampaO | null>>;
  /** ADR 0030: intrările fiecărei operații (`null` = fără), în aceeași ordine; lipsă (regiune construită de mână) = fără. */
  readonly intrari?: ReadonlyMap<LaturaV10O, ReadonlyArray<IntrariO | null>>;
  /** ADR 0032: degajările fiecărei operații (`null` = fără), în aceeași ordine; lipsă (regiune construită de mână) = fără. */
  readonly colturi?: ReadonlyMap<LaturaV10O, ReadonlyArray<ColturiO | null>>;
  /**
   * ADR 0030 §3 c (precizarea din 10.10): conturul exact al elementului, și pentru cele doar `pe-linie` (care nu sunt
   * inele), ca traseul buclelor cu urechi să poată fi socotit; lipsă dacă forma nu se poate contura.
   */
  readonly contur?: Contur;
  /**
   * ADR 0037 (documentul v10): `false` dacă elementul e o cale deschisă, `true` altfel; lipsă la un document mai vechi
   * (regiunea de dinainte de ADR 0037, unde orice cale e închisă). Așa află poarta că eticheta e a unei căi deschise.
   */
  readonly inchis?: boolean;
};

/**
 * ADR 0037 §10 (felia 2.3c-5): peretele unei căi deschise tăiate pe o parte. `contur` = conturul ei deschis, în lume (cu
 * capetele); `parte` = partea sculei pe foaie (`parteaLume`, §3), `null` dacă elementul are și stânga, și dreapta (§9:
 * refuzat; peretele rămâne, ca margine, dar partea lui nu se știe).
 */
export type Perete = { readonly idLume: string; readonly contur: Contur; readonly parte: ParteO | null };

export type Regiune = {
  readonly inele: readonly Inel[];
  /** Indicele părintelui fiecărui inel (−1: niciunul). */
  readonly parinte: readonly number[];
  /** Inelul mărginește K: e piesă, sau părintele lui e piesă. */
  readonly margineK: readonly boolean[];
  readonly probleme: readonly ProblemaRegiune[];
  readonly taieturi: ReadonlyMap<string, TaieturaDoc>;
  /** Grosimea foii 0 a documentului (ADR 0028 §2: vârful urechii); lipsă = cea din contextul porții. */
  readonly grosimeFoaie?: number;
  /**
   * ADR 0037 §8 (documentul v10): toate tăieturile foii 0, în ordinea de la §8 (`taieturiV10O`), cu marcajul despărțirii,
   * calea deschisă și clasa; lipsă la un document mai vechi. Le citesc 14 (iii) și refuzurile (`deschise.ts`).
   */
  readonly ordine?: readonly TaieturaV10O[];
  /** ADR 0037 §8 (documentul v10): foaia 0 a documentului, pentru refuzul tăieturii nemarcate care ajunge la margine. */
  readonly foaieDocument?: { readonly latime: number; readonly inaltime: number };
  /**
   * ADR 0037 §13 (modul `inainteDe0037`): regiunea pe care o construia oracolul de dinainte din același document v10
   * (orice cale închisă, laturile noi și `despartire` necunoscute, ordinea din ADR 0025); lipsă = aceeași regiune.
   */
  readonly inainteDe0037?: Regiune;
  /** ADR 0037 §10 (felia 2.3c-5): pereții foii 0, în ordinea tăieturilor; lipsă = niciunul (document mai vechi). */
  readonly pereti?: readonly Perete[];
};

/** Pădurea, marginea lui K și atingerile, din inele. */
export function regiuneDinInele(
  inele: readonly Inel[], probleme: readonly ProblemaRegiune[] = [], taieturi: ReadonlyMap<string, TaieturaDoc> = new Map(),
  grosimeFoaie?: number,
): Regiune {
  const toate = [...probleme];
  for (let i = 0; i < inele.length; i++) {
    for (let j = i + 1; j < inele.length; j++) {
      const a = inele[i]!, b = inele[j]!;
      // ADR 0034 §6 (recenzia): pragul crește cu 0,001 (`TOLERANTA_PROIECT`) pentru fiecare inel dintr-o cale cu cubice.
      const prag = ATINGERE + 0.001 * ((a.contur.cuCubice ? 1 : 0) + (b.contur.cuCubice ? 1 : 0));
      if (distantaCutii(a.contur.cutie, b.contur.cutie) >= prag) continue;
      const d = distantaListe(a.contur.primitive, b.contur.primitive);
      if (d < prag) {
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
  return { inele, parinte, margineK, probleme: toate, taieturi, ...(grosimeFoaie === undefined ? {} : { grosimeFoaie }) };
}

/**
 * §1: inelele foii 0, din tăieturile documentului (oracolul documentului dă matricea în lume și ordinea). Un v3, …,
 * v7 se aduce întâi la v8 (sensul `urcare`, ADR 0027 §5; urechile `null`, ADR 0028 §1; rampa `null`, ADR 0029 §1;
 * intrările `null`, ADR 0030 §1; degajările `null`, ADR 0032 §1). Un v10 (ADR 0037) se citește ca atare: vezi mai jos.
 */
export function regiuneDinDocument(doc: DocV3O | DocV4O | DocV5O | DocV6O | DocV7O | DocV8O | DocV9O | DocV10O | DocV11O | DocV12O): Regiune {
  // ADR 0076 (felia 5.3↑): coborârea în buzunar nu schimbă regiunea; un v12 se citește ca un v11.
  if (doc.schema === 12) return regiuneDinDocument({ ...doc, schema: 11 } as unknown as DocV11O);
  if (doc.schema === 11) {
    // ADR 0069 §4 (felia 5.1↑, scris de sesiunea aplicației): un buzunar nu e inel, deci K nu se schimbă; restul se
    // citește ca în v10. Poarta nu judecă încă traseul buzunarului față de K (îl judecă oracolul simulării).
    const piese = doc.piese.map((p) => ({ ...p, operatii: p.operatii.filter((o) => o.tip !== 'buzunar') }));
    return regiuneDinDocument({ ...doc, schema: 10, piese } as unknown as DocV10O);
  }
  if (doc.schema === 10) {
    // ADR 0037 (felia 2.3c-2): tăieturile în ordinea de la §8, căile deschise rămân deschise și nu sunt inele; alături,
    // regiunea pe care o construia oracolul de dinainte din același document (pentru modul `inainteDe0037`).
    const ordine = taieturiV10O(doc, 0);
    const grosime = doc.foi[0]?.stoc.grosime;
    // Felia 2.3c-5: și laturile `stanga` / `dreapta` (pereții, §10); înainte, doar cele trei de dinainte.
    const nou = construiesteRegiune(ordine, typeof grosime === 'number' ? grosime : undefined, true);
    const stoc = doc.foi[0]?.stoc;
    return {
      ...nou, ordine, inainteDe0037: construiesteRegiuneVeche(doc as unknown as DocV9O),
      ...(stoc ? { foaieDocument: { latime: stoc.latime, inaltime: stoc.inaltime } } : {}),
    };
  }
  return construiesteRegiuneVeche(doc);
}

/** Regiunea, exact cum o construia oracolul de dinainte de ADR 0037 (orice cale închisă). */
function construiesteRegiuneVeche(doc: DocV3O | DocV4O | DocV5O | DocV6O | DocV7O | DocV8O | DocV9O): Regiune {
  // Felia 2.7b: un v9 se citește ca atare (un v9 trecut prin `ridicaO` ca „vechi” și-ar pierde parametrii operațiilor).
  // Felia 2.3c-2: `ridicaO` dă acum v10; lanțul de dinainte (până la 9) e `ridicaV9O`.
  const v5 = doc.schema === 9 ? doc : ridicaV9O(doc);
  const grosime = v5.foi[0]?.stoc.grosime;
  return construiesteRegiune(taieturiV8O(v5, 0), typeof grosime === 'number' ? grosime : undefined, false);
}

/** O tăietură, cât îi trebuie regiunii (`TaieturaV8O`, sau `TaieturaV10O` pe toate laturile din felia 2.3c-5). */
type TaieturaRegiune = {
  readonly idLume: string; readonly forma: unknown; readonly matrice: MatriceO; readonly latura: LaturaV10O; readonly adancime: number;
  readonly sens: SensO; readonly urechi: UrechiO | null; readonly rampa: RampaO | null; readonly intrari: IntrariO | null; readonly colturi: ColturiO | null;
};

/**
 * Inelele și tăieturile din tăieturile foii 0, în ordinea lor. `deschise` (ADR 0037): o cale cu `inchis: false` rămâne
 * deschisă, primește `inchis: false` și NU devine inel, oricare i-ar fi latura (§10: K nu se schimbă; exteriorul /
 * interiorul pe ea e un refuz, judecat în `deschise.ts`); fără `deschise`, exact construcția de dinainte.
 */
function construiesteRegiune(taieturiFoaie: Iterable<TaieturaRegiune>, grosime: number | undefined, deschise: boolean): Regiune {
  type Acum = {
    forma: FormaO; matrice: MatriceO; laturi: Map<LaturaV10O, number[]>; sensuri: Map<LaturaV10O, SensO[]>;
    urechi: Map<LaturaV10O, Array<UrechiO | null>>; rampe: Map<LaturaV10O, Array<RampaO | null>>; intrari: Map<LaturaV10O, Array<IntrariO | null>>;
    colturi: Map<LaturaV10O, Array<ColturiO | null>>;
  };
  const pe = new Map<string, Acum>();
  for (const t of taieturiFoaie) {
    let x = pe.get(t.idLume);
    if (!x) {
      x = {
        forma: t.forma as FormaO, matrice: t.matrice, laturi: new Map(), sensuri: new Map(), urechi: new Map(), rampe: new Map(), intrari: new Map(),
        colturi: new Map(),
      };
      pe.set(t.idLume, x);
    }
    const cc = x.colturi.get(t.latura) ?? [];
    cc.push(t.colturi);
    x.colturi.set(t.latura, cc);
    const ii = x.intrari.get(t.latura) ?? [];
    ii.push(t.intrari);
    x.intrari.set(t.latura, ii);
    const u = x.urechi.get(t.latura) ?? [];
    u.push(t.urechi);
    x.urechi.set(t.latura, u);
    const r = x.rampe.get(t.latura) ?? [];
    r.push(t.rampa);
    x.rampe.set(t.latura, r);
    const l = x.laturi.get(t.latura) ?? [];
    l.push(t.adancime);
    x.laturi.set(t.latura, l);
    const s = x.sensuri.get(t.latura) ?? [];
    s.push(t.sens);
    x.sensuri.set(t.latura, s);
  }
  const inele: Inel[] = [];
  const probleme: ProblemaRegiune[] = [];
  const taieturi = new Map<string, TaieturaDoc>();
  const pereti: Perete[] = [];
  for (const [idLume, x] of pe) {
    let c: Contur | undefined;
    try { c = contur(x.forma, x.matrice, deschise); } catch { c = undefined; }
    const deschisa = deschise && esteDeschisaO(x.forma);
    taieturi.set(idLume, {
      tip: x.forma.tip, laturi: x.laturi, sensuri: x.sensuri, urechi: x.urechi, rampe: x.rampe, intrari: x.intrari, colturi: x.colturi,
      ...(c ? { contur: c } : {}), ...(deschise ? { inchis: !deschisa } : {}),
    });
    // ADR 0037 §10 (felia 2.3c-5): o cale deschisă cu o operație pe o parte dă un perete (cu partea în lume, §3). Fără
    // contur (calea nu se poate construi: refuzul căii degenerate, `deschise.ts`), fără perete.
    const parti = (['stanga', 'dreapta'] as const).filter((l) => x.laturi.has(l));
    if (deschisa && c && parti.length > 0) {
      pereti.push({ idLume, contur: c, parte: parti.length === 1 ? parteaLume(parti[0]!, x.matrice) : null });
    }
    // ADR 0037 §10: o cale deschisă nu e inel (exteriorul / interiorul pe ea e refuzul de la §9, judecat în `deschise.ts`).
    if (deschisa) continue;
    const ext = x.laturi.has('exterior'), int = x.laturi.has('interior');
    if (ext && int) {
      probleme.push({ tip: 'ambele-laturi', elemente: [idLume], mesaj: `${idLume} are operații și pe exterior, și pe interior` });
      continue;
    }
    if (!ext && !int) continue;
    if (!c) {
      let motiv = '?';
      try { contur(x.forma, x.matrice, deschise); } catch (e) { motiv = e instanceof Error ? e.message : String(e); }
      probleme.push({ tip: 'contur', elemente: [idLume], mesaj: `conturul lui ${idLume} nu se poate construi: ${motiv}` });
      continue;
    }
    inele.push({ idLume, rol: ext ? 'piesa' : 'gol', contur: c });
  }
  const reg = regiuneDinInele(inele, probleme, taieturi, grosime);
  // Fără pereți (orice document fără tăieturi pe o parte), regiunea e exact cea de dinainte.
  return pereti.length ? { ...reg, pereti } : reg;
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
 * `T` (pragul: `prag(R, rotunjire)`). Întoarce cea mai adâncă încălcare găsită (sau null). Felia 2.3c-5: cu i = −1 (o
 * tăietură pe o parte, care nu e inel, ADR 0037 §10), doar K: marginile lui K, fără parte proprie.
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
      else if (i >= 0 && inParteaProprie(reg, i, p)) noteaza({ patrundere: adanc, la: p, in: reg.inele[i]!.idLume });
    }
    if (s >= L) break;
    s = Math.min(L, s + (d < T ? PAS_INCALCARE : Math.max(d - T, PAS_MIN)));
  }
  return rau;
}

// ---------------------------------------------------------------------------------------------------------------
// Etichetele (§7): `(<idLume>: <tip>, <latura>, <adâncime> mm)`.

export type Eticheta = { readonly idLume: string; readonly tip: string; readonly latura: LaturaV10O; readonly adancime: number };

const ETICHETA = /^\(([A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_-]{1,64}): ([a-z]+), (exterior|interior|pe-linie|stanga|dreapta), (\d+(?:[.,]\d+)?) mm\)$/;
/** Eticheta de dinainte de felia 2.3c-5 (modul `inainteDe0037`): `stanga` / `dreapta` nu erau etichete, ci „stricate”. */
const ETICHETA_INAINTE = /^\(([A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_-]{1,64}): ([a-z]+), (exterior|interior|pe-linie), (\d+(?:[.,]\d+)?) mm\)$/;
/** Un comentariu care începe ca o etichetă („id/id:”) sau numește o latură, dar nu e una bine formată. */
const SEAMANA_ETICHETA = /^\(\s*[A-Za-z0-9_-]+\s*\/\s*[A-Za-z0-9_-]+\s*:|\b(exterior|interior|pe-linie)\b/;

/**
 * Eticheta din comentariu; 'stricata' dacă seamănă cu una fără să fie bine formată; null dacă nu e etichetă. `parti`
 * (implicit): laturile pe o parte sunt etichete (ADR 0037 §13); fără, regexul de dinainte (modul `inainteDe0037`).
 */
export function citesteEticheta(text: string, parti = true): Eticheta | 'stricata' | null {
  const m = (parti ? ETICHETA : ETICHETA_INAINTE).exec(text);
  if (m) return { idLume: m[1]!, tip: m[2]!, latura: m[3] as LaturaV10O, adancime: Number(m[4]!.replace(',', '.')) };
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
