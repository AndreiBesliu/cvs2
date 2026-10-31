/**
 * ORACOLUL BUZUNARULUI (felia 5.1↑b, 31.10.2026): judecă programul G-code exportat pentru buzunarele unui document, din
 * proprietăți socotite pe hârtie din ADR-uri, nu din codul care l-a scris. Autorul e o sesiune nouă, care a citit doar ADR
 * 0069 (buzunarul), 0073 (insulele), 0076 (coborârea), 0093 (frezele de rest), 0094 (strategia paralelă), 0024 și 0034
 * (formele, matricele), 0008 (montajul), tipurile documentului și ieșirea exportului; n-a văzut `src/cam/` și nici probele
 * vechi ale buzunarului. ZERO importuri din `src/`; din oracole, doar cititorul G-code și silueta sculei din oracolul
 * simulării (`simulare.ts`, independent și el).
 *
 * Ce citește:
 * - documentul (JSON-ul salvat, cu tipurile proprii de mai jos): foaia întâi, instanțele (translație ∘ rotire), arborele
 *   piesei (matricele SVG: x′ = a·x + c·y + e), formele (dreptunghiul cu colțul stânga-jos în origine și colțurile
 *   rotunjite, cercul cu centrul în origine, calea cu linii, arce cu `bulge` = tan(baleiaj / 4), pozitiv trigonometric, și
 *   cubice) și operațiile `buzunar`;
 * - programul (unul, sau fișierele separate în ordinea lor), mutat în coordonatele foii de montaj (ADR 0008: doar o
 *   translație, colțul de origine și Z0); scula fiecărei mutări din `T<n> M6`, `(scula T<n> …)` și `(SCHIMBA SCULA: T<n> …)`,
 *   cu diametrul și forma luate din document după număr; tăietura fiecărei mutări din eticheta `(<instanță>/<element>: …)`
 *   scrisă de post înaintea ei (ADR 0073 §6). O mutare sub fața de sus în afara oricărei etichete e o problemă.
 *
 * Buzunarul: operațiile `buzunar` de pe foaie cu aceeași adâncime formează un grup citit par-impar (ADR 0073 §1): un contur
 * cu un număr par de contururi în jurul lui e marginea unei bucăți, unul impar e insula bucății care îl cuprinde direct.
 * Parametrii bucății (freza, pașii, sensul, coborârea, strategia, frezele de rest) sunt ai conturului din afară. δ(x) e
 * distanța la marginea bucății (conturul și insulele).
 *
 * Ce judecă, pe fiecare bucată:
 *  1. TRECERILE: un câmp de înălțimi pe grilă, tăiat de toate mutările programului, în ordine, cu silueta fiecărei freze.
 *     Înaintea unei mutări a buzunarului, materialul de sub discul frezei e cel mult `pas` deasupra vârfului (nicio trecere
 *     mai adâncă decât pasul, ADR 0069 §4); o rapidă (G0) nu atinge material; nimic sub adâncimea bucății. Câmpul se taie
 *     cu discul lărgit cu jumătate de eșantion, cu eșantioanele la cel mult 0,02 mm în z, deci nu stă deasupra tăierii
 *     exacte cu mai mult de 0,01 mm, sub `TOL.pas`: o alarmă e reală.
 *  2. PERETELE: pe orice mutare sub fața de sus, centrul frezei stă în bucată (par-impar, deci în afara insulelor) și la
 *     cel puțin R − `TOL.perete` de margine. Garanția e exactă, nu eșantionată: δ e 1-Lipschitz pe drum, deci o bucată
 *     de drum de lungime L cu capetele fa, fb nu coboară sub (fa + fb − L) / 2; bisecția se oprește la 1e-4 mm.
 *  3. ACOPERIREA: pe o grilă, fiecare punct al deschiderii (atins de un disc de rază R_min dinăuntru, ADR 0069 §3; R_min =
 *     cea mai mică freză a bucății, ADR 0093) e la cel mult R_t + `TOL.acoperire` de drumul unei freze t la adâncimea
 *     finală. Martorul deschiderii e un punct p cu δ(p) ≥ R_min la cel mult R_min − `TOL.martor`: pe normala celui mai
 *     apropiat punct al marginii, altfel un centru de celulă din zona centrului. PASUL LATERAL: fiecare punct al zonei
 *     centrului (δ ≥ R) e la cel mult s de drumul frezei operației la adâncimea finală (ADR 0069 §3, ADR 0094 §2); pe
 *     inele, fiecare mutare „pe nivel” (δ constant) stă la δ = R + k·s (pragul de topologie o poate aduce cu cel mult
 *     `TOL.nivelJos` mai aproape de margine); pe linii, orice mutare e pe perete, pe o linie (paralelă cu unghiul) sau o
 *     legătură între linii vecine (la s pe normală), iar liniile unei bucăți stau la multipli de s una de alta.
 *  4. SENSUL (ADR 0027, ADR 0069 §4): pe inele, pe orice mutare pe nivel, marginea cea mai apropiată e în dreapta mersului la
 *     urcare și în stânga la opoziție; pe linii, la fel, doar pe buclele închise de pe perete (trecerea de profil).
 *  5. COBORÂREA (ADR 0076): cu rampa, zigzagul sau elicea, nicio mutare care coboară în material nu e mai abruptă decât
 *     unghiul și niciuna nu coboară vertical în material; plonjarea rămâne a buzunarului fără coborâre, a liniilor și a
 *     frezelor de rest (ADR 0093 §2, ADR 0094 §1).
 *  6. FREZELE DE REST (ADR 0093 §2): în orice punct q tăiat de freza de rest de rază R, pentru fiecare freză dinainte (rază
 *     R_a, drumul ei la adâncime cel puțin cât a lui q): dist(q, drum) > R_a − R − `TOL.rest` (altfel tot discul ei e în ce
 *     a scos aceea: taie aer), iar nicio bucată mai lungă de `TOL.restLungime` nu merge pe pragul R_a − R (pe lângă un
 *     perete deja tăiat).
 * Plus refuzurile cerute lucrării de aceleași ADR-uri (0069 §6, 0073 §2, 0076 §1, 0093 §1, 0094 §1): `refuzuriAsteptate`
 * le prezice din document, iar proba le cere și aplicației.
 *
 * Ce NU judecă: avansurile, turația, timpul (le au poarta și `timp.ts`), ordinea inelelor dincolo de pasul pe trecere,
 * celelalte operații ale documentului (doar le taie în câmp), ușa documentului (`document.ts`).
 */
import { citesteGcode, silueta, unghiArc, type MutareOracol, type P3, type SculaOracol } from './simulare.ts';

// ---------------------------------------------------------------------------------------------------------------
// Toleranțele, fiecare cu proveniența ei (mm; panta e adimensională).

export const TOL = {
  /** Rotunjirea programului: 3 zecimale în mm (± 0,0005 pe axă). */
  rotunjire: 0.001,
  /** Fundul: rotunjirea, pe ambele capete. */
  fund: 0.002,
  /** Peretele: o legătură la adâncime stă la cel puțin R − 0,005 de margine (ADR 0069 §5), plus rotunjirea. */
  perete: 0.006,
  /** Acoperirea: fâșiile de cel mult 0,01 mm scăpate de eșantionarea frezelor de rest (ADR 0093 §2), plus rotunjirea. */
  acoperire: 0.015,
  /** Martorul deschiderii: mai aproape de perete nu se judecă (conturul „pe vector” la ± 0,02, ADR 0094). */
  martor: 0.02,
  /** Pasul pe trecere: câmpul tăiat pe eșantioane (σ/2 · panta ≤ 0,01) și rotunjirea. */
  pas: 0.02,
  /** Inelele: pragul de topologie le aduce cu 0,001, 0,01 sau 0,05 mai aproape de margine (ADR 0069 §3); în sus, rotunjirea. */
  nivelJos: 0.11,
  nivelSus: 0.003,
  /** Liniile paralele: abaterea pe normală a unei linii și a distanței dintre linii (rotunjirea pe două capete). */
  linie: 0.003,
  /** Coborârea: Δz ≤ L·tan α + rotunjirea pe două capete. */
  panta: 0.002,
  /** Frezele de rest: pragul R_a − R (rotunjirea pe ambele drumuri) și banda de pe prag. */
  rest: 0.002,
  restBanda: 0.005,
  /**
   * Cât poate merge o freză de rest pe bandă: la capătul unei bucăți, distanța atinge pragul tangent, deci banda ține
   * √(2 · 0,005 · ρ) < 1 mm pentru o rază de curbură ρ < 100 mm. Un perete întreg ține cât peretele.
   */
  restLungime: 2,
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Documentul, cu tipurile oracolului: JSON-ul salvat (v18), citit de aici, nu prin tipurile aplicației.

export type MatO = { readonly a: number; readonly b: number; readonly c: number; readonly d: number; readonly e: number; readonly f: number };
export type PctO = { readonly x: number; readonly y: number };
export type SegO = { readonly tip: 'L' } | { readonly tip: 'A'; readonly bulge: number } | { readonly tip: 'C'; readonly c1: PctO; readonly c2: PctO };
export type FormaO =
  | { readonly tip: 'dreptunghi'; readonly latime: number; readonly inaltime: number; readonly razaColt: number }
  | { readonly tip: 'cerc'; readonly raza: number }
  | { readonly tip: 'cale'; readonly inchis: boolean; readonly varfuri: ReadonlyArray<{ readonly p: PctO; readonly s: SegO }> };
export type NodO =
  | { readonly tip: 'element'; readonly id: string; readonly forma: FormaO; readonly matrice: MatO }
  | { readonly tip: 'grup'; readonly id: string; readonly matrice: MatO; readonly copii: readonly NodO[] };
export type SculaO = { readonly numar: number; readonly diametru: number; readonly forma?: { readonly tip: string; readonly unghi?: number; readonly varf?: number } };
export type CoborareO = { readonly fel: string; readonly unghi?: number; readonly lungime?: number; readonly raza?: number };
export type FrezaRestO = { readonly scula: SculaO; readonly pasLateral: number };
export type OperatieO = {
  readonly id: string; readonly tip: string; readonly noduri: readonly string[]; readonly scula: SculaO; readonly sens: string;
  readonly adancime: number; readonly pas: number; readonly pasLateral?: number; readonly coborare?: CoborareO;
  readonly rest?: readonly FrezaRestO[]; readonly strategie?: { readonly fel: string; readonly unghi: number };
  readonly fundPlat?: { readonly scula: SculaO; readonly rest?: readonly FrezaRestO[] };
};
export type PiesaO = { readonly id: string; readonly radacina: NodO; readonly operatii: readonly OperatieO[] };
export type InstantaO = { readonly id: string; readonly piesa: string; readonly x: number; readonly y: number; readonly rotire: number };
export type FoaieO = { readonly stoc: { readonly latime: number; readonly inaltime: number; readonly grosime: number }; readonly instante: readonly InstantaO[] };
export type DocumentOracol = { readonly piese: readonly PiesaO[]; readonly foi: readonly FoaieO[] };

export type Montaj = { readonly origine: 'stanga-jos' | 'dreapta-jos' | 'dreapta-sus' | 'stanga-sus'; readonly z0: 'sus' | 'jos' };

// ---------------------------------------------------------------------------------------------------------------
// Geometria: primitivele marginii (linii și arce), distanța la ele, apartenența.

const DOI_PI = 2 * Math.PI;
const mod2pi = (u: number): number => ((u % DOI_PI) + DOI_PI) % DOI_PI;

type Pt = { readonly x: number; readonly y: number };
type Linie = { readonly tip: 'L'; readonly a: Pt; readonly b: Pt };
/** Arcul: centrul, raza, unghiul de pornire și baleiajul cu semn (+ trigonometric); |dt| = 2π e cercul întreg. */
type Arc = { readonly tip: 'A'; readonly c: Pt; readonly r: number; readonly t0: number; readonly dt: number };
type Prim = Linie | Arc;
type Cutie = readonly [number, number, number, number];

const pt = (x: number, y: number): Pt => ({ x, y });
const dist = (p: Pt, q: Pt): number => Math.hypot(p.x - q.x, p.y - q.y);

function punctArc(p: Arc, t: number): Pt {
  const u = p.t0 + t * p.dt;
  return pt(p.c.x + p.r * Math.cos(u), p.c.y + p.r * Math.sin(u));
}

function inUnghi(u: number, t0: number, dt: number): boolean {
  if (Math.abs(dt) >= DOI_PI - 1e-12) return true;
  return dt >= 0 ? mod2pi(u - t0) <= dt : mod2pi(t0 - u) <= -dt;
}

/** Cel mai apropiat punct al primitivei de q și distanța până la el (exact, pe linie și pe arc). */
function aproape(q: Pt, p: Prim): { readonly d: number; readonly b: Pt } {
  if (p.tip === 'L') {
    const dx = p.b.x - p.a.x, dy = p.b.y - p.a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((q.x - p.a.x) * dx + (q.y - p.a.y) * dy) / l2)) : 0;
    const b = pt(p.a.x + t * dx, p.a.y + t * dy);
    return { d: dist(q, b), b };
  }
  const vx = q.x - p.c.x, vy = q.y - p.c.y;
  const rq = Math.hypot(vx, vy);
  if (rq > 1e-12 && inUnghi(Math.atan2(vy, vx), p.t0, p.dt)) {
    return { d: Math.abs(rq - p.r), b: pt(p.c.x + (vx * p.r) / rq, p.c.y + (vy * p.r) / rq) };
  }
  const a = punctArc(p, 0), e = punctArc(p, 1);
  const da = dist(q, a), de = dist(q, e);
  return da <= de ? { d: da, b: a } : { d: de, b: e };
}

/** Distanța la cea mai apropiată primitivă și punctul ei. */
function celMaiAproape(q: Pt, prim: readonly Prim[]): { readonly d: number; readonly b: Pt } {
  let best = { d: Infinity, b: q };
  for (const p of prim) {
    const r = aproape(q, p);
    if (r.d < best.d) best = r;
  }
  return best;
}

function delta(q: Pt, prim: readonly Prim[]): number {
  let d = Infinity;
  for (const p of prim) d = Math.min(d, aproape(q, p).d);
  return d;
}

/** Arcul prin trei puncte (p0, mijlocul, p1), în sensul în care le parcurge; coliniare = linia p0 → p1. */
function arcPrin(p0: Pt, pm: Pt, p1: Pt): Prim {
  const bx = pm.x - p0.x, by = pm.y - p0.y, cx = p1.x - p0.x, cy = p1.y - p0.y;
  const d = 2 * (bx * cy - by * cx);
  const l = Math.max(Math.hypot(bx, by), Math.hypot(cx, cy));
  if (Math.abs(d) <= 1e-12 * l * l) return { tip: 'L', a: p0, b: p1 };
  const b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
  const ux = (cy * b2 - by * c2) / d, uy = (bx * c2 - cx * b2) / d;
  const c = pt(p0.x + ux, p0.y + uy);
  const t0 = Math.atan2(p0.y - c.y, p0.x - c.x), t1 = Math.atan2(p1.y - c.y, p1.x - c.x);
  return { tip: 'A', c, r: Math.hypot(ux, uy), t0, dt: d > 0 ? mod2pi(t1 - t0) : -mod2pi(t0 - t1) };
}

/** Săgeata coardelor cu care se aplatizează arcele pentru apartenență (folosită doar la peste 0,01 mm de margine). */
const SAGEATA = 0.0005;

function poligon(prim: readonly Prim[]): Pt[] {
  const rez: Pt[] = [];
  for (const p of prim) {
    if (p.tip === 'L') {
      rez.push(p.a);
      continue;
    }
    const pas = p.r <= SAGEATA ? Math.PI / 2 : 2 * Math.acos(1 - SAGEATA / p.r);
    const n = Math.max(2, Math.ceil(Math.abs(p.dt) / pas));
    for (let k = 0; k < n; k++) rez.push(punctArc(p, k / n));
  }
  return rez;
}

/** Par-impar (raza spre +x). */
function inPoligon(q: Pt, P: readonly Pt[]): boolean {
  let in_ = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[i]!, b = P[j]!;
    if ((a.y > q.y) !== (b.y > q.y) && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) in_ = !in_;
  }
  return in_;
}

/** Abscisele în care orizontala y taie poligonul (aceeași regulă ca `inPoligon`). */
function taieturiRand(y: number, P: readonly Pt[], rez: number[]): void {
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[i]!, b = P[j]!;
    if ((a.y > y) !== (b.y > y)) rez.push(((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x);
  }
}

function cutiePuncte(P: readonly Pt[]): Cutie {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of P) {
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  return [x0 - SAGEATA, y0 - SAGEATA, x1 + SAGEATA, y1 + SAGEATA];
}

function distLaSegment(q: Pt, a: Pt, b: Pt): number {
  return aproape(q, { tip: 'L', a, b }).d;
}

/** Distanța dintre două segmente (0 dacă se taie). */
function distSegmente(a: Pt, b: Pt, c: Pt, d: Pt): number {
  const o = (p: Pt, q: Pt, r: Pt): number => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const o1 = o(a, b, c), o2 = o(a, b, d), o3 = o(c, d, a), o4 = o(c, d, b);
  if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))) return 0;
  return Math.min(distLaSegment(c, a, b), distLaSegment(d, a, b), distLaSegment(a, c, d), distLaSegment(b, c, d));
}

// ---------------------------------------------------------------------------------------------------------------
// Contururile în lume.

const ID: MatO = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** m ∘ n: întâi n, apoi m. */
function compune(m: MatO, n: MatO): MatO {
  return {
    a: m.a * n.a + m.c * n.b, b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d, d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e, f: m.b * n.e + m.d * n.f + m.f,
  };
}

const aplica = (m: MatO, p: PctO): Pt => pt(m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f);

/** Matricea instanței: translație(x, y) ∘ rotire(r), cu sinusul și cosinusul exacte la multiplii de 90° (ADR 0024). */
function matriceInstanta(i: InstantaO): MatO {
  const r = ((i.rotire % 360) + 360) % 360;
  const k = r / 90;
  const exact = Number.isInteger(k);
  const cos = exact ? [1, 0, -1, 0][k]! : Math.cos((r * Math.PI) / 180);
  const sin = exact ? [0, 1, 0, -1][k]! : Math.sin((r * Math.PI) / 180);
  return { a: cos, b: sin, c: -sin, d: cos, e: i.x, f: i.y };
}

type Contur = { readonly id: string; readonly prim: readonly Prim[]; readonly poligon: readonly Pt[]; readonly cutie: Cutie };

function cubica(p0: Pt, p1: Pt, p2: Pt, p3: Pt, L: (a: Pt, b: Pt) => void, adanc: number): void {
  if (adanc > 18 || Math.max(distLaSegment(p1, p0, p3), distLaSegment(p2, p0, p3)) <= 1e-5) {
    L(p0, p3);
    return;
  }
  const m = (a: Pt, b: Pt): Pt => pt((a.x + b.x) / 2, (a.y + b.y) / 2);
  const p01 = m(p0, p1), p12 = m(p1, p2), p23 = m(p2, p3);
  const p012 = m(p01, p12), p123 = m(p12, p23), mij = m(p012, p123);
  cubica(p0, p01, p012, mij, L, adanc + 1);
  cubica(mij, p123, p23, p3, L, adanc + 1);
}

/** Conturul închis al unei forme, în lume (matricea e o similitudine acolo unde forma are arce, ADR 0024 §4). */
function conturForma(id: string, f: FormaO, m: MatO): Contur | string {
  const prim: Prim[] = [];
  const L = (a: Pt, b: Pt): void => {
    if (dist(a, b) > 1e-12) prim.push({ tip: 'L', a, b });
  };
  const A = (p0: PctO, pm: PctO, p1: PctO): void => {
    prim.push(arcPrin(aplica(m, p0), aplica(m, pm), aplica(m, p1)));
  };
  if (f.tip === 'cerc') {
    prim.push({ tip: 'A', c: aplica(m, pt(0, 0)), r: f.raza * Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)), t0: 0, dt: DOI_PI });
  } else if (f.tip === 'dreptunghi') {
    const W = f.latime, H = f.inaltime, r = Math.max(0, f.razaColt);
    const P = (x: number, y: number): Pt => aplica(m, pt(x, y));
    if (r <= 0) {
      L(P(0, 0), P(W, 0)); L(P(W, 0), P(W, H)); L(P(W, H), P(0, H)); L(P(0, H), P(0, 0));
    } else {
      const k = Math.SQRT1_2 * r;
      L(P(r, 0), P(W - r, 0));
      A(pt(W - r, 0), pt(W - r + k, r - k), pt(W, r));
      L(P(W, r), P(W, H - r));
      A(pt(W, H - r), pt(W - r + k, H - r + k), pt(W - r, H));
      L(P(W - r, H), P(r, H));
      A(pt(r, H), pt(r - k, H - r + k), pt(0, H - r));
      L(P(0, H - r), P(0, r));
      A(pt(0, r), pt(r - k, r - k), pt(r, 0));
    }
  } else {
    if (!f.inchis) return `${id}: buzunarul e pe o cale deschisă`;
    const n = f.varfuri.length;
    for (let i = 0; i < n; i++) {
      const v = f.varfuri[i]!, w = f.varfuri[(i + 1) % n]!;
      const s = v.s;
      if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
        // Mijlocul arcului: din mijlocul coardei, spre dreapta ei pentru bulge > 0 (trigonometric), cu săgeata bulge · coardă / 2.
        const mij = pt((v.p.x + w.p.x) / 2 + ((w.p.y - v.p.y) * s.bulge) / 2, (v.p.y + w.p.y) / 2 - ((w.p.x - v.p.x) * s.bulge) / 2);
        A(v.p, mij, w.p);
      } else if (s.tip === 'C') {
        cubica(aplica(m, v.p), aplica(m, s.c1), aplica(m, s.c2), aplica(m, w.p), L, 0);
      } else {
        L(aplica(m, v.p), aplica(m, w.p));
      }
    }
  }
  const P = poligon(prim);
  return { id, prim, poligon: P, cutie: cutiePuncte(P) };
}

/** Elementele de sub fiecare nod al piesei (un element: el însuși), cu matricea compusă de la rădăcină. */
function elementePiesei(rad: NodO): Map<string, Array<{ readonly id: string; readonly forma: FormaO; readonly m: MatO }>> {
  const rez = new Map<string, Array<{ id: string; forma: FormaO; m: MatO }>>();
  const stiva: Array<{ nod: NodO; m: MatO; drum: readonly string[] }> = [{ nod: rad, m: rad.matrice, drum: [rad.id] }];
  while (stiva.length > 0) {
    const { nod, m, drum } = stiva.pop()!;
    if (nod.tip === 'element') {
      for (const id of drum) {
        const l = rez.get(id) ?? [];
        l.push({ id: nod.id, forma: nod.forma, m });
        rez.set(id, l);
      }
      continue;
    }
    for (const c of nod.copii) stiva.push({ nod: c, m: compune(m, c.matrice), drum: [...drum, c.id] });
  }
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------
// Bucățile buzunarelor.

/** O freză a bucății: a operației (prima) sau una de rest, cu raza, pasul lateral și numărul ei. */
type FrezaB = { readonly numar: number; readonly raza: number; readonly pasLateral: number };

type Bucata = {
  /** Eticheta conturului din afară (`instanță/element`), cum o scrie postul. */
  readonly id: string;
  readonly exterior: Contur;
  readonly insule: readonly Contur[];
  /** Marginea: conturul din afară și insulele. */
  readonly prim: readonly Prim[];
  readonly op: OperatieO;
  readonly adancime: number;
  /** Freza operației, apoi frezele de rest, în ordinea lor. */
  readonly freze: readonly FrezaB[];
};

type Taietura = { readonly contur: Contur; readonly op: OperatieO };

export type CitireBuzunare = { readonly bucati: readonly Bucata[]; readonly refuz: readonly string[] };

const unghiValid = (u: unknown): u is number => typeof u === 'number' && u >= 0.5 && u <= 45;

/**
 * Bucățile buzunarelor de pe foaia întâi, plus refuzurile pe care ADR-urile le cer lucrării (cu motiv): calea deschisă
 * (0069 §6), pasul lateral lipsă sau peste rază (0069 §1), contururile de aceeași adâncime care se ating sau se taie și
 * același contur de două ori (0073 §2), coborârea în afara pragurilor (0076 §1), strategia paralelă cu o coborâre sau cu
 * unghiul în afara [0, 180) (0094 §1), frezele de rest care nu scad, în V sau cu pasul peste rază (0093 §1), freza în V
 * pe un buzunar (0092), conturul fără niciun loc pentru freză (0069 §6, doar pe o bucată fără insule).
 */
export function citesteBuzunarele(doc: DocumentOracol): CitireBuzunare {
  const refuz: string[] = [];
  const foaie = doc.foi[0];
  if (!foaie) return { bucati: [], refuz };
  const grupuri = new Map<number, Taietura[]>();
  for (const inst of foaie.instante) {
    const piesa = doc.piese.find((p) => p.id === inst.piesa);
    if (!piesa) continue;
    const mi = matriceInstanta(inst);
    const sub = elementePiesei(piesa.radacina);
    for (const op of piesa.operatii) {
      if (op.tip !== 'buzunar') continue;
      for (const nodId of op.noduri) {
        for (const el of sub.get(nodId) ?? []) {
          const c = conturForma(`${inst.id}/${el.id}`, el.forma, compune(mi, el.m));
          if (typeof c === 'string') {
            refuz.push(c);
            continue;
          }
          const g = grupuri.get(op.adancime) ?? [];
          g.push({ contur: c, op });
          grupuri.set(op.adancime, g);
        }
      }
    }
  }

  const bucati: Bucata[] = [];
  for (const [adancime, taieturi] of grupuri) {
    // Același contur de două ori, apoi contururile care se ating sau se taie (ADR 0073 §2).
    const vazute = new Set<string>();
    for (const t of taieturi) {
      if (vazute.has(t.contur.id)) refuz.push(`${t.contur.id}: același contur de două ori în buzunare de ${adancime} mm`);
      vazute.add(t.contur.id);
    }
    for (let i = 0; i < taieturi.length; i++) {
      for (let j = i + 1; j < taieturi.length; j++) {
        const A = taieturi[i]!.contur, B = taieturi[j]!.contur;
        if (A.id === B.id) continue;
        if (A.cutie[2] < B.cutie[0] || B.cutie[2] < A.cutie[0] || A.cutie[3] < B.cutie[1] || B.cutie[3] < A.cutie[1]) continue;
        if (seAtingSauSeTaie(A.poligon, B.poligon)) refuz.push(`${A.id} și ${B.id}: contururi de aceeași adâncime (${adancime} mm) care se ating sau se taie`);
      }
    }
    if (refuz.length > 0) continue;
    // Par-impar: câte contururi îl cuprind; părintele direct are cu unul mai puțin.
    const adancimi = taieturi.map((t) => taieturi.filter((u) => u !== t && inPoligon(t.contur.poligon[0]!, u.contur.poligon)).length);
    taieturi.forEach((t, i) => {
      const k = adancimi[i]!;
      if (k % 2 !== 0) return;
      const insule = taieturi
        .filter((u, j) => adancimi[j] === k + 1 && inPoligon(u.contur.poligon[0]!, t.contur.poligon))
        .map((u) => u.contur);
      const R = t.op.scula.diametru / 2;
      const freze: FrezaB[] = [{ numar: t.op.scula.numar, raza: R, pasLateral: t.op.pasLateral ?? Number.NaN }];
      for (const r of t.op.rest ?? []) freze.push({ numar: r.scula.numar, raza: r.scula.diametru / 2, pasLateral: r.pasLateral });
      bucati.push({
        id: t.contur.id, exterior: t.contur, insule, prim: [...t.contur.prim, ...insule.flatMap((c) => c.prim)], op: t.op, adancime, freze,
      });
    });
  }

  for (const b of bucati) refuz.push(...refuzuriBucata(b));
  return { bucati, refuz };
}

function seAtingSauSeTaie(P: readonly Pt[], Q: readonly Pt[]): boolean {
  for (let i = 0; i < P.length; i++) {
    const a = P[i]!, b = P[(i + 1) % P.length]!;
    for (let j = 0; j < Q.length; j++) {
      if (distSegmente(a, b, Q[j]!, Q[(j + 1) % Q.length]!) <= 1e-9) return true;
    }
  }
  return false;
}

function refuzuriBucata(b: Bucata): string[] {
  const rez: string[] = [];
  const op = b.op;
  const R = op.scula.diametru / 2;
  if (op.scula.forma?.tip === 'v') rez.push(`${b.id}: freza în V pe un buzunar`);
  if (op.pasLateral === undefined) rez.push(`${b.id}: buzunarul n-are pasul lateral`);
  else if (!(op.pasLateral > 0 && op.pasLateral <= R + 1e-9)) rez.push(`${b.id}: pasul lateral ${op.pasLateral} nu e în (0, ${R}]`);
  const c = op.coborare;
  if (c && c.fel !== 'plonjare') {
    if (!unghiValid(c.unghi)) rez.push(`${b.id}: unghiul coborârii ${String(c.unghi)}° nu e în [0,5°; 45°]`);
    if (c.fel === 'zigzag' && !((c.lungime ?? 0) >= 1)) rez.push(`${b.id}: zigzagul de ${String(c.lungime)} mm e sub 1 mm`);
    if (c.fel === 'elice' && !((c.raza ?? 0) >= 0.5)) rez.push(`${b.id}: raza elicei ${String(c.raza)} mm e sub 0,5 mm`);
  }
  const s = op.strategie;
  if (s && s.fel === 'paralel') {
    if (!(s.unghi >= 0 && s.unghi < 180)) rez.push(`${b.id}: unghiul liniilor ${s.unghi}° nu e în [0, 180)`);
    if (c && c.fel !== 'plonjare') rez.push(`${b.id}: liniile paralele coboară prin plonjare, nu cu ${c.fel}`);
  }
  let inainte = op.scula.diametru;
  for (const r of op.rest ?? []) {
    if (r.scula.forma?.tip === 'v') rez.push(`${b.id}: freza de rest T${r.scula.numar} e în V`);
    if (!(r.scula.diametru < inainte)) rez.push(`${b.id}: freza de rest T${r.scula.numar} nu e mai mică decât cea dinainte`);
    if (!(r.pasLateral > 0 && r.pasLateral <= r.scula.diametru / 2 + 1e-9)) rez.push(`${b.id}: pasul frezei de rest T${r.scula.numar} e peste raza ei`);
    inainte = r.scula.diametru;
  }
  if ((op.rest ?? []).length > 8) rez.push(`${b.id}: peste 8 freze de rest`);
  // Locul frezei: δ maxim pe o grilă de 0,25 mm; sigur prea îngust doar sub R − jumătatea diagonalei celulei.
  if (b.insule.length === 0 && rez.length === 0) {
    const g = grilaBucatii(b, 0.25);
    let max = 0;
    for (const v of g.delta) max = Math.max(max, v);
    if (max < R - 0.25 * Math.SQRT1_2) rez.push(`${b.id}: conturul e prea îngust pentru freza de ${2 * R} mm`);
  }
  return rez;
}

/** Refuzurile pe care lucrarea trebuie să le dea pentru documentul ăsta (goală: niciunul cerut de ADR-urile buzunarului). */
export function refuzuriAsteptate(doc: DocumentOracol): readonly string[] {
  return citesteBuzunarele(doc).refuz;
}

// ---------------------------------------------------------------------------------------------------------------
// Grila unei bucăți: δ în centrul fiecărei celule din bucată (−1 în afara ei).

type Grila = { readonly x0: number; readonly y0: number; readonly c: number; readonly nx: number; readonly ny: number; readonly delta: Float64Array };

function grilaBucatii(b: Bucata, c: number): Grila {
  const [x0, y0, x1, y1] = b.exterior.cutie;
  const nx = Math.max(1, Math.ceil((x1 - x0) / c)), ny = Math.max(1, Math.ceil((y1 - y0) / c));
  const dl = new Float64Array(nx * ny).fill(-1);
  const poligoane = [b.exterior.poligon, ...b.insule.map((i) => i.poligon)];
  const xs: number[] = [];
  for (let j = 0; j < ny; j++) {
    const y = y0 + (j + 0.5) * c;
    xs.length = 0;
    for (const P of poligoane) taieturiRand(y, P, xs);
    xs.sort((u, v) => u - v);
    // Par-impar pe rând: între tăietura 2k și 2k + 1 e în bucată (insulele sunt în exterior, deci paritatea le scoate).
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k]! - x0) / c - 0.5)), i1 = Math.min(nx - 1, Math.floor((xs[k + 1]! - x0) / c - 0.5));
      for (let i = i0; i <= i1; i++) dl[j * nx + i] = delta(pt(x0 + (i + 0.5) * c, y), b.prim);
    }
  }
  return { x0, y0, c, nx, ny, delta: dl };
}

const inBucata = (q: Pt, b: Bucata): boolean => inPoligon(q, b.exterior.poligon) && !b.insule.some((i) => inPoligon(q, i.poligon));

// ---------------------------------------------------------------------------------------------------------------
// Programul: mutările în coordonatele foii, cu scula și tăietura lor.

type Spirala = { readonly c: Pt; readonly r0: number; readonly r1: number; readonly t0: number; readonly dt: number };

type Mutare = {
  /** Ordinea în program (peste fișiere). */
  readonly k: number;
  readonly fisier: number;
  readonly linie: number;
  readonly rapida: boolean;
  readonly a: P3;
  readonly b: P3;
  readonly spirala: Spirala | null;
  /** Drumul în XY, pentru distanțe: linia sau arcul cu raza medie. */
  readonly prim: Prim;
  /** Marginea de sus a lungimii drumului în XY (constanta Lipschitz a poziției în t). */
  readonly lungime: number;
  readonly scula: number | null;
  readonly sectiune: Sectiune | null;
};

type Sectiune = { readonly fisier: number; readonly linie: number; readonly id: string; readonly descriere: string; readonly scula: number | null };

function punctMutare(m: Mutare, t: number): P3 {
  const z = m.a[2] + t * (m.b[2] - m.a[2]);
  if (!m.spirala) return [m.a[0] + t * (m.b[0] - m.a[0]), m.a[1] + t * (m.b[1] - m.a[1]), z];
  const s = m.spirala;
  const u = s.t0 + t * s.dt, r = s.r0 + t * (s.r1 - s.r0);
  return [s.c.x + r * Math.cos(u), s.c.y + r * Math.sin(u), z];
}

/** Direcția mersului în XY, la t. */
function tangenta(m: Mutare, t: number): Pt {
  if (!m.spirala) {
    const l = Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]);
    return pt((m.b[0] - m.a[0]) / l, (m.b[1] - m.a[1]) / l);
  }
  const s = m.spirala;
  const u = s.t0 + t * s.dt, r = s.r0 + t * (s.r1 - s.r0);
  const vx = -r * s.dt * Math.sin(u) + (s.r1 - s.r0) * Math.cos(u), vy = r * s.dt * Math.cos(u) + (s.r1 - s.r0) * Math.sin(u);
  const l = Math.hypot(vx, vy);
  return pt(vx / l, vy / l);
}

const xy = (p: P3): Pt => pt(p[0], p[1]);

/** Intervalul lui t în care mutarea e sub z = −eps (z e liniar în t), sau null. */
function subFata(m: Mutare, eps: number): readonly [number, number] | null {
  const za = m.a[2], zb = m.b[2];
  if (za >= -eps && zb >= -eps) return null;
  if (za < -eps && zb < -eps) return [0, 1];
  const tc = (-eps - za) / (zb - za);
  return za < -eps ? [0, tc] : [tc, 1];
}

const RE_SCULA = /^(?:scula|SCHIMBA SCULA:) T(\d+)\b/;
/** `(<instanță>/<element>: …)`, sau `(<instanță>/<element> +N: …)` pe o tăietură cu mai multe contururi. */
const RE_ETICHETA = /^([A-Za-z0-9_-]+\/[A-Za-z0-9_-]+)(?: \+\d+)?: (.*)$/;

function deplasare(doc: DocumentOracol, montaj: Montaj): P3 {
  const s = doc.foi[0]?.stoc ?? { latime: 0, inaltime: 0, grosime: 0 };
  const ox = montaj.origine === 'dreapta-jos' || montaj.origine === 'dreapta-sus' ? s.latime : 0;
  const oy = montaj.origine === 'stanga-sus' || montaj.origine === 'dreapta-sus' ? s.inaltime : 0;
  return [ox, oy, montaj.z0 === 'jos' ? -s.grosime : 0];
}

function citesteProgramul(texte: readonly string[], depl: P3): { readonly mutari: Mutare[]; readonly sectiuni: Sectiune[] } {
  const mutari: Mutare[] = [];
  const sectiuni: Sectiune[] = [];
  texte.forEach((text, fisier) => {
    const linii = text.split(/\r\n|\n|\r/);
    const curat: string[] = [];
    const stare: Array<{ scula: number | null; sectiune: Sectiune | null; mod: number }> = [];
    let scula: number | null = null;
    let sectiune: Sectiune | null = null;
    let mod = 0;
    linii.forEach((brut, idx) => {
      for (const m of brut.matchAll(/\(([^)]*)\)/g)) {
        const c = (m[1] ?? '').trim();
        const s = RE_SCULA.exec(c);
        if (s) {
          scula = Number(s[1]);
          sectiune = null;
        }
        const e = RE_ETICHETA.exec(c);
        if (e) {
          sectiune = { fisier, linie: idx + 1, id: e[1] ?? '', descriere: e[2] ?? '', scula };
          sectiuni.push(sectiune);
        }
      }
      const cod = brut.replace(/\([^)]*\)/g, ' ').replace(/;.*$/, '').toUpperCase();
      const t = /T\s*(\d+)/.exec(cod);
      // Schimbarea sculei nu e simulată de cititor (o sculă pe judecată): linia îi rămâne goală, iar scula vine de aici.
      if (t || /M\s*0*6(?![\d.])/.test(cod)) {
        if (t) scula = Number(t[1]);
        sectiune = null;
        curat.push('');
      } else {
        curat.push(brut);
      }
      for (const g of cod.matchAll(/G\s*(\d+(?:\.\d+)?)/g)) {
        const v = Number(g[1]);
        if (v === 0 || v === 1 || v === 2 || v === 3 || v === 80) mod = v;
      }
      stare.push({ scula, sectiune, mod });
    });
    for (const m of citesteGcode(curat.join('\n'), depl, 0)) {
      const s = stare[m.linie - 1]!;
      mutari.push(mutareDin(m, mutari.length, fisier, s.mod === 0, s.scula, s.sectiune));
    }
  });
  return { mutari, sectiuni };
}

function mutareDin(m: MutareOracol, k: number, fisier: number, rapida: boolean, scula: number | null, sectiune: Sectiune | null): Mutare {
  const baza = { k, fisier, linie: m.linie, rapida, a: m.a, b: m.b, scula, sectiune };
  if (m.tip === 'linie') {
    return { ...baza, spirala: null, prim: { tip: 'L', a: xy(m.a), b: xy(m.b) }, lungime: Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]) };
  }
  const c = pt(m.centru[0], m.centru[1]);
  const dt = unghiArc(m);
  const r0 = Math.hypot(m.a[0] - c.x, m.a[1] - c.y), r1 = Math.hypot(m.b[0] - c.x, m.b[1] - c.y);
  const t0 = Math.atan2(m.a[1] - c.y, m.a[0] - c.x);
  return {
    ...baza, spirala: { c, r0, r1, t0, dt }, prim: { tip: 'A', c, r: (r0 + r1) / 2, t0, dt },
    lungime: Math.abs(dt) * Math.max(r0, r1) + Math.abs(r1 - r0),
  };
}

/** Felul tăieturii din eticheta postului: buzunarul (freza operației), restul cu o freză, sau altă operație. */
function felSectiune(s: Sectiune): { readonly fel: 'buzunar' } | { readonly fel: 'rest'; readonly numar: number } | { readonly fel: 'alta' } {
  const r = /^buzunar, restul cu T(\d+)\b/.exec(s.descriere);
  if (r) return { fel: 'rest', numar: Number(r[1]) };
  if (/(^|, )buzunar(,|$)/.test(s.descriere)) return { fel: 'buzunar' };
  return { fel: 'alta' };
}

// ---------------------------------------------------------------------------------------------------------------
// Garanția pe drum: cel mai mic f pe [t0, t1], f 1-Lipschitz în lungimea drumului (L = lungimea pe t ∈ [0, 1]).

function subPrag(f: (t: number) => number, L: number, prag: number, t0: number, t1: number): { readonly t: number; readonly v: number } | null {
  const fa0 = f(t0), fb0 = f(t1);
  const stiva: Array<readonly [number, number, number, number]> = [[t0, fa0, t1, fb0]];
  while (stiva.length > 0) {
    const [ta, fa, tb, fb] = stiva.pop()!;
    if (fa < prag) return { t: ta, v: fa };
    if (fb < prag) return { t: tb, v: fb };
    const l = L * (tb - ta);
    if ((fa + fb - l) / 2 >= prag || l <= 1e-4) continue;
    const tm = (ta + tb) / 2, fm = f(tm);
    stiva.push([tm, fm, tb, fb], [ta, fa, tm, fm]);
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Câmpul de înălțimi (pasul pe trecere și rapidele).

type Camp = { readonly x0: number; readonly y0: number; readonly c: number; readonly nx: number; readonly ny: number; readonly H: Float64Array };
type Profil = { readonly raza: number; readonly h: (r: number) => number; readonly plata: boolean };

function profilScula(s: SculaO): Profil {
  const D = s.diametru;
  let so: SculaOracol = { tip: 'plata', diametru: D };
  if (s.forma?.tip === 'v' && typeof s.forma.unghi === 'number') {
    const varf = s.forma.varf ?? 0;
    so = varf > 0 && varf < D
      ? { tip: 'profil', diametru: D, puncte: [[0, 0], [varf / 2, 0], [D / 2, (D / 2 - varf / 2) / Math.tan(((s.forma.unghi / 2) * Math.PI) / 180)]] }
      : { tip: 'v', diametru: D, unghi: s.forma.unghi };
  }
  return { raza: D / 2, h: silueta(so).h, plata: so.tip === 'plata' };
}

/** Pe celulele cu centrul la cel mult `raza` de (x, y): cel mai mult material deasupra suprafeței sculei. */
function materialSub(camp: Camp, x: number, y: number, z: number, p: Profil): number {
  const { x0, y0, c, nx, ny, H } = camp;
  const R = p.raza, r2 = R * R;
  const i0 = Math.max(0, Math.ceil((x - R - x0) / c - 0.5)), i1 = Math.min(nx - 1, Math.floor((x + R - x0) / c - 0.5));
  const j0 = Math.max(0, Math.ceil((y - R - y0) / c - 0.5)), j1 = Math.min(ny - 1, Math.floor((y + R - y0) / c - 0.5));
  let max = -Infinity;
  for (let j = j0; j <= j1; j++) {
    const dy = y0 + (j + 0.5) * c - y;
    for (let i = i0; i <= i1; i++) {
      const dx = x0 + (i + 0.5) * c - x;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const v = H[j * nx + i]! - (p.plata ? z : z + p.h(Math.sqrt(d2)));
      if (v > max) max = v;
    }
  }
  return max;
}

/** Taie discul lărgit cu `marja` (jumătate de eșantion): câmpul nu rămâne niciodată deasupra tăierii exacte. */
function taie(camp: Camp, x: number, y: number, z: number, p: Profil, marja: number): void {
  const { x0, y0, c, nx, ny, H } = camp;
  const R = p.raza + marja, r2 = R * R;
  const i0 = Math.max(0, Math.ceil((x - R - x0) / c - 0.5)), i1 = Math.min(nx - 1, Math.floor((x + R - x0) / c - 0.5));
  const j0 = Math.max(0, Math.ceil((y - R - y0) / c - 0.5)), j1 = Math.min(ny - 1, Math.floor((y + R - y0) / c - 0.5));
  for (let j = j0; j <= j1; j++) {
    const dy = y0 + (j + 0.5) * c - y;
    for (let i = i0; i <= i1; i++) {
      const dx = x0 + (i + 0.5) * c - x;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const v = p.plata ? z : z + p.h(Math.min(p.raza, Math.sqrt(d2)));
      const k = j * nx + i;
      if (v < H[k]!) H[k] = v;
    }
  }
}

/**
 * Taie toate mutările în ordine; pentru cele din `judecate`, întoarce materialul cel mai gros de sub sculă ÎNAINTEA mutării
 * (câmpul de dinaintea ei, pe toată mutarea: o elice care trece peste propriul început e judecată față de ce era).
 */
function treceCampul(mutari: readonly Mutare[], profile: ReadonlyMap<number, Profil>, camp: Camp, judecate: ReadonlySet<number>): Map<number, number> {
  const rez = new Map<number, number>();
  const sigma = camp.c / 2;
  for (const m of mutari) {
    const sub = subFata(m, 1e-9);
    if (!sub || m.scula === null) continue;
    const p = profile.get(m.scula);
    if (!p) continue;
    const [ta, tb] = sub;
    // În plan, la cel mult σ; în z, la cel mult 0,02 mm (pe o rampă, Z-ul unui eșantion e la cel mult 0,01 de cel exact).
    const n = Math.max(1, Math.ceil(Math.max((m.lungime * (tb - ta)) / sigma, (Math.abs(m.b[2] - m.a[2]) * (tb - ta)) / 0.02)));
    const puncte: P3[] = [];
    for (let k = 0; k <= n; k++) puncte.push(punctMutare(m, ta + ((tb - ta) * k) / n));
    if (judecate.has(m.k)) {
      let e = -Infinity;
      for (const q of puncte) e = Math.max(e, materialSub(camp, q[0], q[1], q[2], p));
      rez.set(m.k, e);
    }
    for (const q of puncte) taie(camp, q[0], q[1], q[2], p, sigma / 2);
  }
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------
// Căutarea în drumuri: găleți de 2 mm, fiecare drum pus în gălețile cutiei lui lărgite cu raza de căutare.

type Galeti = { readonly x0: number; readonly y0: number; readonly g: number; readonly nx: number; readonly ny: number; readonly l: Array<number[] | undefined> };

function cutieDrum(p: Prim): Cutie {
  if (p.tip === 'L') return [Math.min(p.a.x, p.b.x), Math.min(p.a.y, p.b.y), Math.max(p.a.x, p.b.x), Math.max(p.a.y, p.b.y)];
  const a = punctArc(p, 0), e = punctArc(p, 1);
  let x0 = Math.min(a.x, e.x), y0 = Math.min(a.y, e.y), x1 = Math.max(a.x, e.x), y1 = Math.max(a.y, e.y);
  for (let k = 0; k < 4; k++) {
    const u = (k * Math.PI) / 2;
    if (!inUnghi(u, p.t0, p.dt)) continue;
    x0 = Math.min(x0, p.c.x + p.r * Math.cos(u)); x1 = Math.max(x1, p.c.x + p.r * Math.cos(u));
    y0 = Math.min(y0, p.c.y + p.r * Math.sin(u)); y1 = Math.max(y1, p.c.y + p.r * Math.sin(u));
  }
  return [x0, y0, x1, y1];
}

function galeti(cutie: Cutie, drumuri: ReadonlyArray<{ readonly prim: Prim; readonly raza: number }>): Galeti {
  const g = 2;
  const nx = Math.max(1, Math.ceil((cutie[2] - cutie[0]) / g)), ny = Math.max(1, Math.ceil((cutie[3] - cutie[1]) / g));
  const l: Array<number[] | undefined> = new Array(nx * ny);
  drumuri.forEach((d, idx) => {
    const [x0, y0, x1, y1] = cutieDrum(d.prim);
    const i0 = Math.max(0, Math.floor((x0 - d.raza - cutie[0]) / g)), i1 = Math.min(nx - 1, Math.floor((x1 + d.raza - cutie[0]) / g));
    const j0 = Math.max(0, Math.floor((y0 - d.raza - cutie[1]) / g)), j1 = Math.min(ny - 1, Math.floor((y1 + d.raza - cutie[1]) / g));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) (l[j * nx + i] ??= []).push(idx);
  });
  return { x0: cutie[0], y0: cutie[1], g, nx, ny, l };
}

function inGaleata(G: Galeti, q: Pt): readonly number[] {
  const i = Math.floor((q.x - G.x0) / G.g), j = Math.floor((q.y - G.y0) / G.g);
  if (i < 0 || j < 0 || i >= G.nx || j >= G.ny) return [];
  return G.l[j * G.nx + i] ?? [];
}

// ---------------------------------------------------------------------------------------------------------------
// Verdictul.

export type FelProblema =
  | 'program' | 'eticheta' | 'trecere' | 'rapida' | 'fund' | 'perete' | 'regiune' | 'acoperire' | 'pas-lateral' | 'nivel'
  | 'linii' | 'sens' | 'coborare' | 'rest';

export type ProblemaBuzunar = { readonly fel: FelProblema; readonly buzunar: string; readonly mesaj: string };

/** O buclă închisă a frezei operației la adâncimea finală: δ, lungimea, aria cu semn (+ trigonometric) și cutia. */
export type Bucla = { readonly d: number; readonly lungime: number; readonly aria: number; readonly cutie: Cutie };

export type MasuriBuzunar = {
  readonly id: string;
  readonly adancime: number;
  readonly insule: number;
  readonly scule: readonly number[];
  /** Z-urile mutărilor orizontale ale frezei operației sub fața de sus (descrescător: prima trecere întâi). */
  readonly treceri: readonly number[];
  /** Pe inele: nivelurile (δ la 0,001) mutărilor pe nivel ale frezei operației la adâncimea finală, crescător. */
  readonly niveluri: readonly number[];
  /** Pe inele: buclele închise pe același nivel, la adâncimea finală, în ordinea programului. */
  readonly inele: readonly Bucla[];
  /** Pe linii: nivelurile y′ (normala la unghi) ale liniilor, crescător. */
  readonly linii: readonly number[];
  /** Buclele închise pe perete (δ = R) la adâncimea finală, și câte sunt pe toate trecerile. */
  readonly perete: readonly Bucla[];
  readonly bucleDePerete: number;
  /** Celulele deschiderii judecate, cele neacoperite și cele ale zonei centrului lăsate la peste s de drum. */
  readonly celule: { readonly deschidere: number; readonly neacoperite: number; readonly zona: number; readonly pesteS: number };
  /** Cea mai mare pantă (Δz / L) a unei coborâri în material a frezei operației, și coborârile verticale în material. */
  readonly pantaMaxima: number;
  readonly plonjariInMaterial: number;
  /** Frezele de rest: lungimea tăiată orizontal sub fața de sus, câte bucăți (porniri după o ridicare) și cutia. */
  readonly rest: ReadonlyArray<{ readonly numar: number; readonly lungime: number; readonly bucati: number; readonly cutie: Cutie }>;
};

export type VerdictBuzunare = {
  readonly refuz: readonly string[];
  readonly probleme: readonly ProblemaBuzunar[];
  readonly buzunare: readonly MasuriBuzunar[];
};

export type IntrareBuzunar = {
  readonly document: DocumentOracol;
  /** Programul: un text, sau fișierele exportului separat, în ordinea în care rulează. */
  readonly program: string | readonly string[];
  /** Montajul exportului; lipsă = stânga-jos, Z0 sus. */
  readonly montaj?: Montaj;
  /** Celula câmpului de înălțimi (mm, implicit 0,2) și a grilei acoperirii (implicit 0,1). */
  readonly celulaCamp?: number;
  readonly celulaAcoperire?: number;
};

/** Cel mult atâtea probleme de același fel pe bucată (restul se numără în ultimul mesaj). */
const PROBLEME_PE_FEL = 5;

export function judecaBuzunarele(x: IntrareBuzunar): VerdictBuzunare {
  const doc = x.document;
  const { bucati, refuz } = citesteBuzunarele(doc);
  if (refuz.length > 0) return { refuz, probleme: [], buzunare: [] };
  const probleme: ProblemaBuzunar[] = [];
  const numarate = new Map<string, number>();
  const raporteaza = (fel: FelProblema, buzunar: string, mesaj: string): void => {
    const cheie = `${buzunar}\u0000${fel}`;
    const n = (numarate.get(cheie) ?? 0) + 1;
    numarate.set(cheie, n);
    if (n <= PROBLEME_PE_FEL) probleme.push({ fel, buzunar, mesaj });
  };

  const texte = typeof x.program === 'string' ? [x.program] : x.program;
  const { mutari } = citesteProgramul(texte, deplasare(doc, x.montaj ?? { origine: 'stanga-jos', z0: 'sus' }));

  // Sculele documentului, după număr (operațiile, frezele de rest, fundul plat al V-carve-ului).
  const profile = new Map<number, Profil>();
  for (const p of doc.piese) {
    for (const op of p.operatii) {
      const toate = [op.scula, ...(op.rest ?? []).map((r) => r.scula), ...(op.fundPlat ? [op.fundPlat.scula, ...(op.fundPlat.rest ?? []).map((r) => r.scula)] : [])];
      for (const s of toate) if (!profile.has(s.numar)) profile.set(s.numar, profilScula(s));
    }
  }

  // Fiecare mutare sub fața de sus are o tăietură și o sculă cunoscută; mutările buzunarelor merg la bucata lor.
  const aleBucatii = new Map<string, Mutare[]>(bucati.map((b) => [b.id, []]));
  for (const m of mutari) {
    const sub = subFata(m, TOL.rotunjire);
    if (sub && !m.sectiune) raporteaza('program', '-', `linia ${m.linie} (fișierul ${m.fisier + 1}): mutare sub fața de sus în afara oricărei tăieturi`);
    if (sub && (m.scula === null || !profile.has(m.scula))) raporteaza('program', '-', `linia ${m.linie}: mutare sub fața de sus cu o sculă necunoscută (${String(m.scula)})`);
    if (!m.sectiune || felSectiune(m.sectiune).fel === 'alta') continue;
    const l = aleBucatii.get(m.sectiune.id);
    if (!l) {
      if (sub) raporteaza('eticheta', m.sectiune.id, `linia ${m.linie}: eticheta de buzunar „${m.sectiune.id}” nu e conturul din afară al niciunei bucăți`);
      continue;
    }
    l.push(m);
  }

  // Câmpul: peste toate bucățile, cu marginea celei mai mari freze a documentului.
  let rMax = 0;
  for (const p of profile.values()) rMax = Math.max(rMax, p.raza);
  const cutie: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const b of bucati) {
    cutie[0] = Math.min(cutie[0], b.exterior.cutie[0]); cutie[1] = Math.min(cutie[1], b.exterior.cutie[1]);
    cutie[2] = Math.max(cutie[2], b.exterior.cutie[2]); cutie[3] = Math.max(cutie[3], b.exterior.cutie[3]);
  }
  const masuri: MasuriBuzunar[] = [];
  if (bucati.length === 0) return { refuz, probleme, buzunare: masuri };
  const c = x.celulaCamp ?? 0.2;
  const camp: Camp = (() => {
    const x0 = cutie[0] - rMax - 1, y0 = cutie[1] - rMax - 1;
    const nx = Math.ceil((cutie[2] + rMax + 1 - x0) / c), ny = Math.ceil((cutie[3] + rMax + 1 - y0) / c);
    return { x0, y0, c, nx, ny, H: new Float64Array(nx * ny) };
  })();
  const judecate = new Set<number>();
  for (const l of aleBucatii.values()) for (const m of l) judecate.add(m.k);
  const material = treceCampul(mutari, profile, camp, judecate);

  for (const b of bucati) {
    masuri.push(judecaBucata(b, aleBucatii.get(b.id) ?? [], material, x.celulaAcoperire ?? 0.1, raporteaza));
  }
  return { refuz, probleme, buzunare: masuri };
}

const rot3 = (v: number): number => Math.round(v * 1000) / 1000;
const rotCutie = (c: Cutie): Cutie => [rot3(c[0]), rot3(c[1]), rot3(c[2]), rot3(c[3])];
const unesteCutii = (u: Cutie, v: Cutie): Cutie => [Math.min(u[0], v[0]), Math.min(u[1], v[1]), Math.max(u[2], v[2]), Math.max(u[3], v[3])];

/** Contribuția mutării la aria cu semn a buclei (Green: ∮ (x dy − y dx) / 2; pe arc, cu raza medie). */
function arieMutare(m: Mutare): number {
  const [ax, ay] = m.a, [bx, by] = m.b;
  if (m.prim.tip === 'L') return (ax * by - bx * ay) / 2;
  const p = m.prim;
  return (p.c.x * (by - ay) - p.c.y * (bx - ax) + p.r * p.r * p.dt) / 2;
}

function buclaDin(ms: readonly Mutare[], d: number): Bucla {
  let lungime = 0, aria = 0;
  let cutie: Cutie = [Infinity, Infinity, -Infinity, -Infinity];
  for (const m of ms) {
    lungime += m.lungime;
    aria += arieMutare(m);
    cutie = unesteCutii(cutie, cutieDrum(m.prim));
  }
  return { d: rot3(d), lungime: rot3(lungime), aria: rot3(aria), cutie: rotCutie(cutie) };
}

function judecaBucata(
  b: Bucata, mutari: readonly Mutare[], material: ReadonlyMap<number, number>, cc: number,
  raporteaza: (fel: FelProblema, buzunar: string, mesaj: string) => void,
): MasuriBuzunar {
  const op = b.op;
  const D = b.adancime;
  const principala = b.freze[0]!;
  const R = principala.raza, s = principala.pasLateral;
  const paralel = op.strategie?.fel === 'paralel';
  const urcare = op.sens !== 'opozitie';
  const cob = op.coborare;
  const cuCoborare = !paralel && cob !== undefined && cob.fel !== 'plonjare';
  const tanCob = cuCoborare ? Math.tan(((cob.unghi ?? 0) * Math.PI) / 180) : Infinity;
  const raport = (fel: FelProblema, mesaj: string): void => raporteaza(fel, b.id, mesaj);
  const unde = (m: Mutare): string => `linia ${m.linie}${m.fisier > 0 ? ` (fișierul ${m.fisier + 1})` : ''}`;

  // Eticheta: freza secțiunii, numărul insulelor.
  const freza = new Map<Mutare, FrezaB>();
  const veziEticheta = new Set<Sectiune>();
  for (const m of mutari) {
    const sec = m.sectiune!;
    const fel = felSectiune(sec);
    const f = fel.fel === 'rest' ? b.freze.find((z, i) => i > 0 && z.numar === fel.numar) : principala;
    if (!veziEticheta.has(sec)) {
      veziEticheta.add(sec);
      if (!f) raport('eticheta', `linia ${sec.linie}: freza de rest T${fel.fel === 'rest' ? fel.numar : '?'} nu e în lista operației`);
      else if (sec.scula !== f.numar) raport('eticheta', `linia ${sec.linie}: tăietura e scrisă pentru T${f.numar}, dar scula montată e T${String(sec.scula)}`);
      const ins = /insule: (\d+)/.exec(sec.descriere);
      if (fel.fel === 'buzunar' && Number(ins?.[1] ?? 0) !== b.insule.length) {
        raport('eticheta', `linia ${sec.linie}: eticheta spune ${ins?.[1] ?? 0} insule, documentul are ${b.insule.length}`);
      }
    }
    if (f && m.scula === f.numar) freza.set(m, f);
    else if (subFata(m, TOL.rotunjire)) raport('eticheta', `${unde(m)}: mutare a buzunarului cu T${String(m.scula)}, alta decât freza tăieturii`);
  }
  if (!mutari.some((m) => freza.get(m) === principala && subFata(m, TOL.rotunjire))) raport('program', 'freza operației nu taie nimic în buzunar');

  const laFund = (m: Mutare): boolean => Math.abs(m.a[2] + D) <= TOL.fund && Math.abs(m.b[2] + D) <= TOL.fund;
  const orizontala = (m: Mutare): boolean => Math.abs(m.b[2] - m.a[2]) <= 1e-9 && m.a[2] < -TOL.rotunjire;

  // 1. Trecerile, rapidele, fundul. 2. Peretele și regiunea.
  const treceri = new Set<number>();
  let pantaMaxima = 0, plonjariInMaterial = 0;
  for (const m of mutari) {
    const f = freza.get(m);
    if (!f) continue;
    const e = material.get(m.k) ?? -Infinity;
    if (m.rapida && e > TOL.rotunjire) raport('rapida', `${unde(m)}: rapida (G0) atinge ${rot3(e)} mm de material`);
    if (!m.rapida && e > op.pas + TOL.pas) raport('trecere', `${unde(m)}: taie ${rot3(e)} mm de material dintr-o dată, peste pasul de ${op.pas} mm`);
    const zMin = Math.min(m.a[2], m.b[2]);
    if (zMin < -D - TOL.fund) raport('fund', `${unde(m)}: coboară la ${rot3(zMin)}, sub adâncimea de ${D} mm`);
    if (f === principala && orizontala(m)) treceri.add(rot3(m.a[2]));
    // Coborârea frezei operației în material.
    const dz = m.a[2] - m.b[2];
    if (f === principala && dz > 1e-9 && e > TOL.pas) {
      if (m.lungime <= 1e-9) {
        plonjariInMaterial++;
        if (cuCoborare) raport('coborare', `${unde(m)}: coboară vertical în material (${rot3(e)} mm), deși coborârea e ${cob.fel}`);
      } else {
        pantaMaxima = Math.max(pantaMaxima, dz / m.lungime);
        if (cuCoborare && dz > m.lungime * tanCob + TOL.panta) {
          raport('coborare', `${unde(m)}: coboară ${rot3(dz)} mm pe ${rot3(m.lungime)} mm, mai abrupt decât ${cob.unghi}°`);
        }
      }
    }
    const sub = subFata(m, TOL.rotunjire);
    if (!sub) continue;
    const prag = f.raza - TOL.perete;
    const rau = subPrag((t) => delta(xy(punctMutare(m, t)), b.prim), m.lungime, prag, sub[0], sub[1]);
    if (rau) {
      const q = punctMutare(m, rau.t);
      raport('perete', `${unde(m)}: centrul frezei T${f.numar} în (${rot3(q[0])}, ${rot3(q[1])}, ${rot3(q[2])}) e la ${rot3(rau.v)} mm de margine, sub ${rot3(f.raza)} − ${TOL.perete}`);
    } else if (!inBucata(xy(punctMutare(m, sub[0])), b)) {
      const q = punctMutare(m, sub[0]);
      raport('regiune', `${unde(m)}: centrul frezei în (${rot3(q[0])}, ${rot3(q[1])}) e în afara buzunarului (afară sau într-o insulă)`);
    }
  }

  // 3. Acoperirea și pasul lateral, pe grilă.
  const laFundToate = mutari.filter((m) => freza.has(m) && laFund(m) && m.lungime > 0);
  const laFundPrincipala = laFundToate.filter((m) => freza.get(m) === principala);
  const rMin = Math.min(...b.freze.map((f) => f.raza));
  const G = grilaBucatii(b, cc);
  const cutieG: Cutie = [G.x0, G.y0, G.x0 + G.nx * G.c, G.y0 + G.ny * G.c];
  const GA = galeti(cutieG, laFundToate.map((m) => ({ prim: m.prim, raza: freza.get(m)!.raza + TOL.acoperire })));
  const GS = galeti(cutieG, laFundPrincipala.map((m) => ({ prim: m.prim, raza: s + TOL.linie })));
  // Martorii din grilă: centrele celulelor zonei centrului lui R_min de pe frontiera ei, în găleți de 1 mm.
  const frontiera: Pt[] = [];
  const idx = (i: number, j: number): number => j * G.nx + i;
  for (let j = 0; j < G.ny; j++) {
    for (let i = 0; i < G.nx; i++) {
      if (!(G.delta[idx(i, j)]! >= rMin)) continue;
      const margine = i === 0 || j === 0 || i === G.nx - 1 || j === G.ny - 1
        || !(G.delta[idx(i - 1, j)]! >= rMin) || !(G.delta[idx(i + 1, j)]! >= rMin) || !(G.delta[idx(i, j - 1)]! >= rMin) || !(G.delta[idx(i, j + 1)]! >= rMin);
      if (margine) frontiera.push(pt(G.x0 + (i + 0.5) * G.c, G.y0 + (j + 0.5) * G.c));
    }
  }
  const GF = galeti(cutieG, frontiera.map((p) => ({ prim: { tip: 'L', a: p, b: p } as Prim, raza: 0 })));
  const martorGrila = (q: Pt): boolean => {
    const rho = rMin - TOL.martor;
    const k = Math.ceil(rho / GF.g);
    const i0 = Math.floor((q.x - GF.x0) / GF.g), j0 = Math.floor((q.y - GF.y0) / GF.g);
    for (let j = j0 - k; j <= j0 + k; j++) {
      for (let i = i0 - k; i <= i0 + k; i++) {
        if (i < 0 || j < 0 || i >= GF.nx || j >= GF.ny) continue;
        for (const id of GF.l[j * GF.nx + i] ?? []) if (dist(q, frontiera[id]!) <= rho) return true;
      }
    }
    return false;
  };
  const razeA = laFundToate.map((m) => freza.get(m)!.raza + TOL.acoperire);
  const acoperita = (q: Pt, k: number): boolean => k >= 0 && aproape(q, laFundToate[k]!.prim).d <= razeA[k]!;
  const aproapeS = (q: Pt, k: number): boolean => k >= 0 && aproape(q, laFundPrincipala[k]!.prim).d <= s + TOL.linie;
  const cauta = (Gx: Galeti, q: Pt, ok: (q: Pt, k: number) => boolean): number => {
    for (const k of inGaleata(Gx, q)) if (ok(q, k)) return k;
    return -1;
  };
  let deschidere = 0, neacoperite = 0, zona = 0, pesteS = 0;
  let ultimA = -1, ultimS = -1;
  for (let j = 0; j < G.ny; j++) {
    for (let i = 0; i < G.nx; i++) {
      const d = G.delta[idx(i, j)]!;
      if (!(d >= TOL.martor)) continue;
      const q = pt(G.x0 + (i + 0.5) * G.c, G.y0 + (j + 0.5) * G.c);
      let inDeschidere = d >= rMin;
      if (!inDeschidere) {
        const { b: bm } = celMaiAproape(q, b.prim);
        const p = pt(bm.x + ((q.x - bm.x) * rMin) / d, bm.y + ((q.y - bm.y) * rMin) / d);
        inDeschidere = (delta(p, b.prim) >= rMin - 1e-9 && inBucata(p, b)) || martorGrila(q);
      }
      if (inDeschidere) {
        deschidere++;
        if (!acoperita(q, ultimA)) {
          ultimA = cauta(GA, q, acoperita);
          if (ultimA < 0) {
            neacoperite++;
            if (neacoperite <= 3) raport('acoperire', `punctul (${rot3(q.x)}, ${rot3(q.y)}), la ${rot3(d)} mm de margine, nu e scos la ${D} mm de nicio freză`);
          }
        }
      }
      if (d >= R) {
        zona++;
        if (!aproapeS(q, ultimS)) {
          ultimS = cauta(GS, q, aproapeS);
          if (ultimS < 0) {
            pesteS++;
            if (pesteS <= 3) raport('pas-lateral', `punctul (${rot3(q.x)}, ${rot3(q.y)}) al zonei centrului e la peste ${s} mm de drumul frezei T${principala.numar}`);
          }
        }
      }
    }
  }
  if (neacoperite > 3) raport('acoperire', `în total ${neacoperite} din ${deschidere} celule ale deschiderii neacoperite`);
  if (pesteS > 3) raport('pas-lateral', `în total ${pesteS} din ${zona} celule ale zonei centrului la peste ${s} mm de drum`);

  // 3'. Inelele pe niveluri, sau liniile. 4. Sensul.
  const pePerete = (m: Mutare): boolean => [0, 0.25, 0.5, 0.75, 1].every((t) => Math.abs(delta(xy(punctMutare(m, t)), b.prim) - R) <= TOL.perete);
  const sensBun = (m: Mutare): boolean => {
    const q = xy(punctMutare(m, 0.5));
    const tg = tangenta(m, 0.5);
    const { b: bm } = celMaiAproape(q, b.prim);
    const latura = tg.x * (bm.y - q.y) - tg.y * (bm.x - q.x);
    return urcare ? latura < 0 : latura > 0;
  };
  // Cercul plin al elicei (ADR 0076 §1) nu e un inel: îl recunoaște raza.
  const elice = (m: Mutare): boolean => cob?.fel === 'elice' && m.prim.tip === 'A' && Math.abs(m.prim.r - (cob.raza ?? -1)) <= 0.01;
  const unghiL = ((op.strategie?.unghi ?? 0) * Math.PI) / 180;
  const yp = (p: P3): number => -p[0] * Math.sin(unghiL) + p[1] * Math.cos(unghiL);
  const peNivel: Array<{ readonly m: Mutare; readonly d: number }> = [];
  const linii: number[] = [];
  for (const m of mutari) {
    if (freza.get(m) !== principala || !orizontala(m) || m.lungime <= 1e-9) continue;
    if (!paralel) {
      if (elice(m)) continue;
      const ds = [0, 0.25, 0.5, 0.75, 1].map((t) => delta(xy(punctMutare(m, t)), b.prim));
      if (Math.max(...ds) - Math.min(...ds) > 0.003) continue; // o legătură: δ se schimbă pe ea
      const dm = ds[2]!;
      if (!sensBun(m)) raport('sens', `${unde(m)}: inelul de la ${rot3(dm)} mm are marginea în ${urcare ? 'stânga' : 'dreapta'} mersului (sensul e ${op.sens})`);
      if (!laFund(m)) continue;
      const k = Math.max(0, Math.round((dm - R) / s));
      const abatere = dm - (R + k * s);
      if (abatere < -TOL.nivelJos || abatere > TOL.nivelSus) {
        raport('nivel', `${unde(m)}: inel la ${rot3(dm)} mm de margine, nu la R + k·s (cel mai aproape: ${rot3(R + k * s)})`);
      }
      peNivel.push({ m, d: dm });
      continue;
    }
    if (!laFund(m) || pePerete(m)) continue;
    if (m.spirala) {
      raport('linii', `${unde(m)}: arc în afara peretelui, cu liniile paralele`);
      continue;
    }
    const dy = Math.abs(yp(m.b) - yp(m.a));
    if (dy <= TOL.linie) linii.push(yp(m.a));
    else if (Math.abs(dy - s) > TOL.linie) raport('linii', `${unde(m)}: nici linie la ${op.strategie?.unghi}°, nici legătură între linii vecine (Δy′ = ${rot3(dy)}), nici pe perete`);
  }
  const liniiUnice: number[] = [];
  for (const v of linii.sort((u, w) => u - w)) if (liniiUnice.length === 0 || v - liniiUnice[liniiUnice.length - 1]! > 0.002) liniiUnice.push(v);
  for (let k = 1; k < liniiUnice.length; k++) {
    const gol = liniiUnice[k]! - liniiUnice[k - 1]!;
    const n = Math.round(gol / s);
    if (n < 1 || Math.abs(gol - n * s) > TOL.linie * n) raport('linii', `liniile de la y′ = ${rot3(liniiUnice[k - 1]!)} și ${rot3(liniiUnice[k]!)} sunt la ${rot3(gol)} mm, nu la un multiplu de ${s}`);
  }
  const niveluri = [...new Set(peNivel.map((x) => rot3(x.d)))].sort((u, v) => u - v);
  // Buclele inelelor: mutări pe nivel consecutive în program, pe același nivel, care se închid.
  const inele: Bucla[] = [];
  for (let i = 0; i < peNivel.length;) {
    let j = i + 1;
    while (j < peNivel.length && peNivel[j]!.m.k === peNivel[j - 1]!.m.k + 1 && Math.abs(peNivel[j]!.d - peNivel[i]!.d) <= 0.003) j++;
    const ms = peNivel.slice(i, j).map((x) => x.m);
    if (dist(xy(ms[0]!.a), xy(ms[ms.length - 1]!.b)) <= 0.002) inele.push(buclaDin(ms, peNivel[i]!.d));
    i = j;
  }

  // Buclele închise de pe perete (trecerea de profil pe linii, inelul de lângă perete pe inele); pe linii, și sensul lor.
  let bucleDePerete = 0;
  const perete: Bucla[] = [];
  let bucla: Mutare[] = [];
  const inchide = (): void => {
    if (bucla.length > 0) {
      const prima = bucla[0]!, ultima = bucla[bucla.length - 1]!;
      if (dist(xy(prima.a), xy(ultima.b)) <= 0.002 && bucla.reduce((u, m) => u + m.lungime, 0) > 0.5) {
        bucleDePerete++;
        if (laFund(prima)) perete.push(buclaDin(bucla, R));
        if (paralel) for (const m of bucla) if (!sensBun(m)) raport('sens', `${unde(m)}: trecerea de profil are marginea în ${urcare ? 'stânga' : 'dreapta'} mersului (sensul e ${op.sens})`);
      }
    }
    bucla = [];
  };
  for (const m of mutari) {
    if (freza.get(m) !== principala) continue;
    if (!(orizontala(m) && m.lungime > 1e-9 && pePerete(m))) {
      inchide();
      continue;
    }
    if (bucla.length > 0 && (m.k !== bucla[bucla.length - 1]!.k + 1 || m.a[2] !== bucla[0]!.a[2])) inchide();
    bucla.push(m);
  }
  inchide();

  // 6. Frezele de rest.
  const rest: Array<{ numar: number; lungime: number; bucati: number; cutie: Cutie }> = [];
  b.freze.forEach((f, i) => {
    if (i === 0) return;
    const ale = mutari.filter((m) => freza.get(m) === f);
    const dinainte = mutari.filter((m) => {
      const g = freza.get(m);
      return g !== undefined && b.freze.indexOf(g) < i && subFata(m, TOL.rotunjire) !== null;
    });
    const sus = TOL.restBanda + 0.01;
    const GR = galeti(b.exterior.cutie, dinainte.map((m) => ({ prim: m.prim, raza: freza.get(m)!.raza - f.raza + sus })));
    // min(sus, min peste drumurile dinainte, la adâncime cel puțin cât q, din dist − (R_a − R)): 1-Lipschitz în poziție.
    const marja = (q: P3): number => {
      let v = sus;
      for (const k of inGaleata(GR, xy(q))) {
        const a = dinainte[k]!;
        if (Math.max(a.a[2], a.b[2]) > q[2] + TOL.fund) continue;
        v = Math.min(v, aproape(xy(q), a.prim).d - (freza.get(a)!.raza - f.raza));
      }
      return v;
    };
    let lungime = 0, bucatiR = 0, peBanda = 0, spus = false, ultima = -2;
    let cutieR: Cutie = [Infinity, Infinity, -Infinity, -Infinity];
    for (const m of ale) {
      const sub = subFata(m, TOL.rotunjire);
      if (!sub) {
        peBanda = 0;
        spus = false;
        continue;
      }
      if (m.k !== ultima + 1) {
        bucatiR++;
        peBanda = 0;
        spus = false;
      }
      ultima = m.k;
      const zq = Math.min(m.a[2], m.b[2]);
      const laZ = (t: number): P3 => {
        const q = punctMutare(m, t);
        return [q[0], q[1], zq];
      };
      const rau = subPrag((t) => marja(laZ(t)), m.lungime, -TOL.rest, sub[0], sub[1]);
      if (rau) {
        const q = laZ(rau.t);
        raport('rest', `${unde(m)}: freza de rest T${f.numar} în (${rot3(q[0])}, ${rot3(q[1])}) taie doar ce a scos o freză dinainte (cu ${rot3(-rau.v)} mm sub prag)`);
      }
      const l = m.lungime * (sub[1] - sub[0]);
      if (orizontala(m)) {
        lungime += l;
        cutieR = unesteCutii(cutieR, cutieDrum(m.prim));
      }
      const n = Math.max(1, Math.ceil(l / 0.05));
      for (let k = 0; k < n; k++) {
        if (marja(laZ(sub[0] + ((sub[1] - sub[0]) * (k + 0.5)) / n)) > TOL.restBanda) {
          peBanda = 0;
          spus = false;
          continue;
        }
        peBanda += l / n;
        if (peBanda > TOL.restLungime && !spus) {
          raport('rest', `${unde(m)}: freza de rest T${f.numar} merge peste ${TOL.restLungime} mm pe lângă ce a tăiat freza dinainte (pragul R_a − R)`);
          spus = true;
        }
      }
    }
    rest.push({ numar: f.numar, lungime: rot3(lungime), bucati: bucatiR, cutie: rotCutie(cutieR) });
  });

  return {
    id: b.id, adancime: D, insule: b.insule.length, scule: b.freze.map((f) => f.numar),
    treceri: [...treceri].sort((u, v) => v - u),
    niveluri, inele, linii: liniiUnice.map(rot3), perete, bucleDePerete,
    celule: { deschidere, neacoperite, zona, pesteS },
    pantaMaxima, plonjariInMaterial, rest,
  };
}
