/**
 * Cazurile oracolului intrărilor (ADR 0030), cu ZERO importuri din `src/`:
 * - `CAZURI_INTRARI`: cazurile pe hârtie din §8, fiecare cu documentul v7 și, pe fiecare formă, valorile CERUTE scrise
 *   de mână (numere): p₀, C, ρ, partea deșeului, A (startul intrării) și B (capătul ieșirii), sau `null` (intrarea
 *   omisă). Vârful 0 de pe hârtie e startul traseului analitic orientat (`drumCerut`, pornirea 0): pe dreptunghi,
 *   începutul laturii de jos (după colțul din stânga-jos); pe cerc, unghiul 0. În lipire, vârful 0 al aplicației se
 *   citește din programul ei fără intrări, iar hârtia se aplică doar dacă e același punct;
 * - un SCRIITOR „cum cere contractul” (`programIntrari`), cu propria lui copie a geometriei de la §2 (n, C, A, B, sensul
 *   arcelor; NU cea din `intrari.ts`) și a programului de la §5, peste scriitorul urechilor (`programUrechi`, pentru
 *   bucla pornită din p₀, cu urechile ei), plus MARTORII NEGATIVI din §8 ca mutații ale lui;
 * - `corpusIntrari`: corpusul 2.4 (`corpusUrechi`, toate colțurile, ambele Z0, toate laturile, ambele sensuri, urechi
 *   care încap) adus la v7, fără rampă, cu intrări alese de un PRNG propriu pe o parte din operații (raza 0,5–20).
 */
import { migreazaV5V6O, migreazaV6V7O, type DocV6O, type DocV7O, type IntrariO, type UrechiO } from './document.ts';
import { lungime, punctLa, startul, arc as arcP, segment as segmentP, type Primitiva } from './regiune.ts';
import { aleator, cerc, drept, laMasina, type Montaj, type Stoc } from './regiune.cazuri.ts';
import { corpusUrechi, docUrechi, drumCerut, programUrechi, type CazCorpusUrechi, type FormaUrechi } from './urechi.cazuri.ts';

type P2 = { readonly x: number; readonly y: number };
export type ParteH = 'stanga' | 'dreapta';
export type AsteptatH = { readonly p0: P2; readonly C: P2; readonly rho: number; readonly parte: ParteH; readonly A: P2; readonly B: P2 } | null;

// ---------------------------------------------------------------------------------------------------------------
// Documentele.

/** Un document v7 cu o operație pe fiecare formă, toate cu aceleași urechi, intrări, adâncime și pas (fără rampă). */
export function docIntrari(
  stoc: Stoc, forme: readonly FormaUrechi[],
  o: { readonly diametru: number; readonly adancime: number; readonly pas: number; readonly urechi: UrechiO | null; readonly intrari: IntrariO | null },
): DocV7O {
  const v7 = migreazaV6V7O(migreazaV5V6O(docUrechi(stoc, forme, o)));
  for (const p of v7.piese) for (const op of p.operatii) op.intrari = o.intrari === null || op.latura === 'pe-linie' ? null : { ...o.intrari };
  return v7;
}

// ---------------------------------------------------------------------------------------------------------------
// Cazurile pe hârtie (ADR 0030 §8). Freza Ø6 (R = 3), raza 3, foaia de 6 mm, adâncimea 6 în doi pași de 3.

export type CazIntrari = {
  readonly nume: string;
  readonly stoc: Stoc;
  readonly forme: readonly FormaUrechi[];
  readonly diametru: number;
  readonly adancime: number;
  readonly pas: number;
  readonly urechi: UrechiO | null;
  readonly raza: number;
  /** Urechile pe formă (după id), când diferă între forme (cazul urechilor vecinei); lipsă = `urechi` pe toate. */
  readonly urechiPe?: Readonly<Record<string, UrechiO | null>>;
  /** Pe fiecare formă (după id), ce cere hârtia. */
  readonly asteptat: Readonly<Record<string, AsteptatH>>;
  readonly doc: DocV7O;
};

const FOAIE: Stoc = { latime: 400, inaltime: 300, grosime: 6 };
const p = (x: number, y: number): P2 => ({ x, y });
const caz = (
  nume: string, forme: readonly FormaUrechi[], asteptat: Record<string, AsteptatH>, urechi: UrechiO | null = null, raza = 3,
  o: { readonly stoc?: Stoc; readonly urechiPe?: Readonly<Record<string, UrechiO | null>> } = {},
): CazIntrari => {
  const stoc = o.stoc ?? FOAIE;
  const doc = docIntrari(stoc, forme, { diametru: 6, adancime: 6, pas: 3, urechi, intrari: { raza } });
  // `simple` dă fiecărei forme o piesă cu id-ul ei.
  if (o.urechiPe) for (const pz of doc.piese) for (const op of pz.operatii) if (Object.hasOwn(o.urechiPe, pz.id)) op.urechi = o.urechiPe[pz.id] ?? null;
  return { nume, stoc, forme, diametru: 6, adancime: 6, pas: 3, urechi, raza, asteptat, doc, ...(o.urechiPe ? { urechiPe: o.urechiPe } : {}) };
};

const RAMA: FormaUrechi = { id: 'a', forma: drept(100, 60), x: 50, y: 50, latura: 'exterior', sens: 'urcare' };
/**
 * Dreptunghiul 100 × 60 în (50, 50), exterior, Ø6: bucla e la 3 mm, cu colțurile arce de rază 3; vârful 0 = (50, 47).
 * Urcare (orar, ADR 0027): în (50, 47) bucla merge spre stânga, t₀ = (−1, 0); deșeul e în stânga, n = (0, −1);
 * C = (50, 44); arcul trigonometric: A = C + (3, 0) = (53, 44), B = C − (3, 0) = (47, 44).
 */
const RAMA_URCARE: AsteptatH = { p0: p(50, 47), C: p(50, 44), rho: 3, parte: 'stanga', A: p(53, 44), B: p(47, 44) };

export const CAZURI_INTRARI: readonly CazIntrari[] = [
  caz('dreptunghi 100 × 60, exterior, urcare: intrarea în vârful 0', [RAMA], { a: RAMA_URCARE }),
  // Opoziție (trigonometric): în (50, 47) bucla merge spre dreapta, t₀ = (1, 0); deșeul în dreapta, n = (0, −1);
  // C = (50, 44); arcul orar: A = (47, 44), B = (53, 44).
  caz('dreptunghi 100 × 60, exterior, opoziție: intrarea în vârful 0, arcele orare', [{ ...RAMA, sens: 'opozitie' }], {
    a: { p0: p(50, 47), C: p(50, 44), rho: 3, parte: 'dreapta', A: p(47, 44), B: p(53, 44) },
  }),
  // Gaura 60 × 40 în (100, 100), interior, urcare (trigonometric): bucla [103, 157] × [103, 137] are colțuri ascuțite;
  // vârful 0 = (103, 103) mușcă (A ar fi (100, 106), pe peretele găurii); latura de jos (54, indicele 0) bate latura de
  // sus (54, indicele 2): p₀ = (130, 103), t₀ = (1, 0), n = (0, 1), C = (130, 106), A = (127, 106), B = (133, 106).
  caz('gaura dreptunghiulară 60 × 40 (interior): vârful 0 e un colț ascuțit care mușcă, p₀ trece la mijlocul laturii de jos', [
    { id: 'h', forma: drept(60, 40), x: 100, y: 100, latura: 'interior', sens: 'urcare' },
  ], { h: { p0: p(130, 103), C: p(130, 106), rho: 3, parte: 'stanga', A: p(127, 106), B: p(133, 106) } }),
  // Gaura R5,5 în (100, 100): bucla R2,5, vârful 0 = (102,5, 100), t₀ = (0, 1), n = (−1, 0). Cu ρ = 3, punctul de la 90°
  // e la √(0,5² + 3²) = 3,041 de centru > 2,5 + ε: nu încape. Cu ρ = 1,5: √(1² + 1,5²) = 1,803 ≤ 2,5: încape.
  // C = (101, 100), A = (101, 98,5), B = (101, 101,5).
  caz('gaura circulară R5,5: raza se înjumătățește (ρ = 1,5)', [{ id: 'c', forma: cerc(5.5), x: 100, y: 100, latura: 'interior', sens: 'urcare' }], {
    c: { p0: p(102.5, 100), C: p(101, 100), rho: 1.5, parte: 'stanga', A: p(101, 98.5), B: p(101, 101.5) },
  }),
  // Gaura R4: bucla R1; ρ = 3 și ρ = 1,5 ies amândouă (√(0,5² + 1,5²) = 1,581 > 1): intrarea omisă, cu avertisment.
  caz('gaura circulară R4: intrarea omisă (ρ = 3 și 1,5 nu încap), bucla tăiată din vârful 0', [{ id: 'c', forma: cerc(4), x: 100, y: 100, latura: 'interior', sens: 'urcare' }], { c: null }),
  // Vecina b: 140 × 20 în (30, 22), latura de sus la y = 42, sub rama a. Semicercul din vârful 0 al lui a (C = (50, 44))
  // coboară cu discul până la y = 41: mușcă 1 mm. Mijlocul laturii de jos (100, 47) mușcă la fel. Latura de sus (100,
  // indicele 3 în mers, orar din vârful 0) încape: p₀ = (100, 113), t₀ = (1, 0), n = (0, 1), C = (100, 116),
  // A = (97, 116), B = (103, 116). Vecina își ia intrarea în vârful ei 0, (30, 19): C = (30, 16), A = (33, 16), B = (27, 16).
  caz('două piese apropiate: vârful 0 al ramei ar mușca din vecină, p₀ trece la mijlocul laturii de sus', [
    RAMA, { id: 'b', forma: drept(140, 20), x: 30, y: 22, latura: 'exterior', sens: 'urcare' },
  ], {
    a: { p0: p(100, 113), C: p(100, 116), rho: 3, parte: 'stanga', A: p(97, 116), B: p(103, 116) },
    b: { p0: p(30, 19), C: p(30, 16), rho: 3, parte: 'stanga', A: p(33, 16), B: p(27, 16) },
  }),
  // Inelul: rama și gaura R15 în (100, 80) (inelul golului are părinte piesa). Gaura: bucla R12, vârful 0 = (112, 80),
  // t₀ = (0, 1), n = (−1, 0), C = (109, 80), A = (109, 77), B = (109, 83).
  caz('inelul: rama cu o gaură R15, intrările amândouă pe partea deșeului', [
    RAMA, { id: 'g', forma: cerc(15), x: 100, y: 80, latura: 'interior', sens: 'urcare' },
  ], { a: RAMA_URCARE, g: { p0: p(112, 80), C: p(109, 80), rho: 3, parte: 'stanga', A: p(109, 77), B: p(109, 83) } }),
  // Ca la piesele apropiate, cu urechi 4 × 8 × 2 (vârful la 4; trecerea de 6 le traversează): pozițiile urechilor se
  // numără din p₀ = (100, 113): centrele la (k + ½)·P/4, P = 2·(106 + 66) − 4·6 + 6π = 320 + 6π.
  caz('cu urechi 4 × 8 × 2: pozițiile urechilor se mută odată cu p₀', [
    RAMA, { id: 'b', forma: drept(140, 20), x: 30, y: 22, latura: 'exterior', sens: 'urcare' },
  ], {
    a: { p0: p(100, 113), C: p(100, 116), rho: 3, parte: 'stanga', A: p(97, 116), B: p(103, 116) },
    b: { p0: p(30, 19), C: p(30, 16), rho: 3, parte: 'stanga', A: p(33, 16), B: p(27, 16) },
  }, { numar: 4, latime: 8, grosime: 2 }),
  // Precizarea din 10.10, b (foaia): rama 100 × 60 în (7, 7) pe foaia 300 × 200. Vârful 0 = (7, 4), C = (7, 1): discul
  // pe semicerc coboară la y = 1 − 3 = −2, deci iese 2 mm pe jos, iar bucla (y ≥ 4, discul ≥ 1) nu iese deloc. Latura de
  // sus (100, indicele 3 în mers) încape: p₀ = (57, 70), t₀ = (1, 0), n = (0, 1), C = (57, 73), A = (54, 73), B = (60, 73).
  caz('precizarea b: rama la 7 mm de marginea de jos; intrarea din vârful 0 ar ieși din foaie, p₀ trece la mijlocul laturii de sus', [
    { ...RAMA, x: 7, y: 7 },
  ], { a: { p0: p(57, 70), C: p(57, 73), rho: 3, parte: 'stanga', A: p(54, 73), B: p(60, 73) } }, null, 3, { stoc: { latime: 300, inaltime: 200, grosime: 6 } }),
  // Precizarea din 10.10, c (urechile altor bucle): t = rama 100 × 60 în (50, 50) cu urechi 4 × 8 × 2 (bucla ei sus la
  // y = 113); n = 80 × 20 în (60, 122), fără urechi. Vârful 0 al lui n = (60, 119), C = (60, 116): semicercul coboară la
  // y = 116, la 3 mm de bucla cu urechi (< D + 1 = 7), deși discul stă la 6 mm de piesa t (a trece). Latura de sus a lui n
  // (80, indicele 3): p₀ = (100, 145), C = (100, 148), A = (97, 148), B = (103, 148). Rama își ia intrarea în vârful 0.
  caz('precizarea c: vecina fără urechi, deasupra ramei cu urechi; intrarea din vârful 0 al vecinei ar trece la 3 mm de bucla cu urechi', [
    { ...RAMA, id: 't' }, { id: 'n', forma: drept(80, 20), x: 60, y: 122, latura: 'exterior', sens: 'urcare' },
  ], {
    t: { p0: p(50, 47), C: p(50, 44), rho: 3, parte: 'stanga', A: p(53, 44), B: p(47, 44) },
    n: { p0: p(100, 145), C: p(100, 148), rho: 3, parte: 'stanga', A: p(97, 148), B: p(103, 148) },
  }, null, 3, { urechiPe: { t: { numar: 4, latime: 8, grosime: 2 }, n: null } }),
  // Avertismentul (precizarea din 10.10): gaura R3,7 cu raza 0,8: bucla R0,7; ρ = 0,8 iese (√(0,1² + 0,8²) = 0,806 >
  // 0,705), iar raza / 2 = 0,4 < 0,5 nu se încearcă: intrarea omisă, iar avertismentul nu pomenește 0,4.
  caz('gaura R3,7 cu raza 0,8: intrarea omisă, raza / 2 = 0,4 nu se încearcă', [{ id: 'c', forma: cerc(3.7), x: 100, y: 100, latura: 'interior', sens: 'urcare' }], { c: null }, null, 0.8),
];

/** Perimetrul buclei ramei (P al cazului cu urechi), pe hârtie. */
export const P_RAMA = 320 + 6 * Math.PI;

// ---------------------------------------------------------------------------------------------------------------
// Scriitorul „cum cere contractul”, cu propria copie a geometriei de la §2, și martorii negativi de la §8.

export type MartorIntrari =
  | 'parte-pastrata' | 'varf0' | 'omisa' | 'iesire-opusa' | 'pe-bucla'
  | 'raza-gresita' | 'necandidat' | 'sfert-scurt' | 'treceri-diferite' | 'intrare-dreapta' | 'fara-iesire'
  /** Sensul arcului corect, dar centrul pe partea păstrată (intrarea sosește în p₀ în sens invers, un vârf ascuțit). */
  | 'centru-opus'
  /** Sensul corect, centrul rotit cu 45° față de n: intrarea și ieșirea nu sunt tangente la buclă. */
  | 'netangenta'
  /** Prima trecere fără intrări (plonjare în p₀, pe buclă), a doua cu ele: §3 cere aceeași alegere la toate. */
  | 'amestecate'
  /**
   * Centrul rotit doar cu 0,02 rad: discul abia trece dincolo de tangentă (ρθ²/2 = 0,0006 mm cu ρ = 3, sub ε), deci
   * semicercul „încape”; doar cerința de tangență (normala în p₀) îl prinde.
   */
  | 'netangenta-mica';

const f3 = (v: number): string => {
  const s = v.toFixed(3);
  return s === '-0.000' ? '0.000' : s;
};
const d2 = (a: P2, b: P2): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Direcția de mers la începutul unei primitive. */
function tStart(q: Primitiva): P2 {
  if (q.tip === 'segment') { const L = d2(q.a, q.b); return { x: (q.b.x - q.a.x) / L, y: (q.b.y - q.a.y) / L }; }
  if (q.tip === 'arc') return q.du > 0 ? { x: -Math.sin(q.u0), y: Math.cos(q.u0) } : { x: Math.sin(q.u0), y: -Math.cos(q.u0) };
  return { x: 1, y: 0 };
}

/** Bucla `drum` (din vârful 0) pornită din p₀: p₀ e un vârf, sau o tai în primitiva care îl conține (§4). */
export function dinP0(drum: readonly Primitiva[], p0: P2): Primitiva[] {
  for (let k = 0; k < drum.length; k++) {
    if (d2(startul(drum[k]!), p0) <= 1e-9) return [...drum.slice(k), ...drum.slice(0, k)];
  }
  for (let k = 0; k < drum.length; k++) {
    const q = drum[k]!;
    if (q.tip === 'segment') {
      const L = d2(q.a, q.b);
      const s = ((p0.x - q.a.x) * (q.b.x - q.a.x) + (p0.y - q.a.y) * (q.b.y - q.a.y)) / L;
      if (s <= 0 || s >= L || d2(punctLa(q, s), p0) > 1e-6) continue;
      return [segmentP(p0, q.b), ...drum.slice(k + 1), ...drum.slice(0, k), segmentP(q.a, p0)];
    }
    if (q.tip === 'arc') {
      if (Math.abs(d2(q.c, p0) - q.r) > 1e-6) continue;
      let f = ((Math.atan2(p0.y - q.c.y, p0.x - q.c.x) - q.u0) * Math.sign(q.du)) % (2 * Math.PI);
      if (f < 0) f += 2 * Math.PI;
      f /= Math.abs(q.du);
      if (f <= 0 || f >= 1) continue;
      return [arcP(q.c, q.r, q.u0 + q.du * f, q.du * (1 - f)), ...drum.slice(k + 1), ...drum.slice(0, k), arcP(q.c, q.r, q.u0, q.du * f)];
    }
  }
  throw new Error(`p₀ (${p0.x}, ${p0.y}) nu e pe buclă`);
}

/** §2, a doua copie: centrul și capetele semicercului, sensul arcelor (+1 trigonometric). */
function geometria(p0: P2, t0: P2, parte: ParteH, rho: number): { C: P2; A: P2; B: P2; s: 1 | -1 } {
  const n = parte === 'stanga' ? { x: -t0.y, y: t0.x } : { x: t0.y, y: -t0.x };
  const C = { x: p0.x + rho * n.x, y: p0.y + rho * n.y };
  const v = { x: p0.x - C.x, y: p0.y - C.y };
  const s: 1 | -1 = parte === 'stanga' ? 1 : -1;
  // A = C + rot(v, −s·90°), B = C + rot(v, +s·90°); rot(v, +90°) = (−v.y, v.x).
  const plus = { x: -v.y, y: v.x }, minus = { x: v.y, y: -v.x };
  const A = s > 0 ? { x: C.x + minus.x, y: C.y + minus.y } : { x: C.x + plus.x, y: C.y + plus.y };
  const B = s > 0 ? { x: C.x + plus.x, y: C.y + plus.y } : { x: C.x + minus.x, y: C.y + minus.y };
  return { C, A, B, s };
}

/** Un arc de la `a` la `b` în jurul lui C, cu I / J din startul rotunjit (ca postul); `unghi` < 90° pentru martor. */
function linieArc(M: (x: number, y: number, z: number) => [number, number, number], a: P2, b: P2, C: P2, s: 1 | -1): string {
  const [xa, ya] = M(a.x, a.y, 0), [xb, yb] = M(b.x, b.y, 0), [cx, cy] = M(C.x, C.y, 0);
  return `${s > 0 ? 'G3' : 'G2'} X${f3(xb)} Y${f3(yb)} I${f3(cx - Number(f3(xa)))} J${f3(cy - Number(f3(ya)))} F1000.0`;
}

/**
 * Programul unui caz, cu intrările de pe hârtie (sau cu un martor). Pe fiecare formă: bucla din p₀ (`dinP0`), scrisă
 * de `programUrechi` (ridicare între treceri), apoi, pe fiecare trecere, rapida deasupra lui A, plonjarea în A, intrarea
 * (sfertul care se termină în p₀), bucla, ieșirea (sfertul următor), ridicarea (§5).
 */
export function programIntrari(c: CazIntrari, montaj: Montaj, o: { readonly martor?: MartorIntrari; readonly pentru?: string } = {}): string {
  const M = laMasina(montaj);
  const zSus = M(0, 0, 5)[2];
  const L: string[] = ['(CNC Vector Studio)', 'G90 G17 G21 G94', 'G54', `G0 Z${f3(zSus)}`, 'M3 S18000', 'G4 P3.000'];
  for (const f of c.forme) {
    const drum0 = drumCerut(f, c.diametru, 0);
    let a = c.asteptat[f.id] ?? null;
    const martor = o.pentru === undefined || o.pentru === f.id ? o.martor : undefined;
    const urechi = c.urechiPe && Object.hasOwn(c.urechiPe, f.id) ? c.urechiPe[f.id] ?? null : c.urechi;
    const tx = { eticheta: `${f.id}/${f.id}: ${f.forma.tip}, ${f.latura}, ${c.adancime} mm`, adancime: c.adancime, pas: c.pas, grosimeFoaie: c.stoc.grosime, urechi, intre: 'ridica' as const };
    if (martor === 'varf0' && a) {
      const v0 = startul(drum0[0]!);
      const g = geometria(v0, tStart(drum0[0]!), a.parte, a.rho);
      a = { ...a, p0: v0, C: g.C, A: g.A, B: g.B };
    }
    if (martor === 'necandidat' && a && drum0.some((q) => q.tip === 'segment')) {
      // p₀ la o treime din cea mai lungă latură: nici vârf, nici mijloc.
      const lunga = drum0.filter((q) => q.tip === 'segment').reduce((x, q) => (lungime(q) > lungime(x) ? q : x));
      const p0 = punctLa(lunga, lungime(lunga) / 3);
      const t = tStart(lunga);
      const g = geometria(p0, t, a.parte, a.rho);
      a = { ...a, p0, C: g.C, A: g.A, B: g.B };
    }
    if (a === null || martor === 'omisa') {
      const corp = programUrechi([{ ...tx, drum: drum0 }], montaj).split('\n');
      L.push(...corp.slice(6, corp.indexOf('M5')));
      continue;
    }
    const drum = dinP0(drum0, a.p0);
    const t0 = tStart(drum[0]!);
    const rho = martor === 'raza-gresita' ? 0.8 * a.rho : a.rho;
    const bun = geometria(a.p0, t0, a.parte, rho);
    const opusa = geometria(a.p0, t0, a.parte === 'stanga' ? 'dreapta' : 'stanga', rho);
    // Martorii care păstrează sensul arcului, cu centrul în altă parte: p₀ rămâne pe cerc, A și B se rotesc cu el.
    const cuCentrul = (unghi: number): { C: P2; A: P2; B: P2; s: 1 | -1 } => {
      const n = a!.parte === 'stanga' ? { x: -t0.y, y: t0.x } : { x: t0.y, y: -t0.x };
      const c = Math.cos(unghi), si = Math.sin(unghi);
      const m = { x: c * n.x - si * n.y, y: si * n.x + c * n.y };
      const C = { x: a!.p0.x + rho * m.x, y: a!.p0.y + rho * m.y };
      const v = { x: a!.p0.x - C.x, y: a!.p0.y - C.y };
      const s = bun.s;
      const plus = { x: -v.y, y: v.x }, minus = { x: v.y, y: -v.x };
      return s > 0
        ? { C, A: { x: C.x + minus.x, y: C.y + minus.y }, B: { x: C.x + plus.x, y: C.y + plus.y }, s }
        : { C, A: { x: C.x + plus.x, y: C.y + plus.y }, B: { x: C.x + minus.x, y: C.y + minus.y }, s };
    };
    const rotit = martor === 'centru-opus' ? Math.PI : martor === 'netangenta' ? Math.PI / 4 : martor === 'netangenta-mica' ? 0.02 : null;
    const gIn = martor === 'parte-pastrata' ? opusa : rotit !== null ? cuCentrul(rotit) : bun;
    const gOut = martor === 'parte-pastrata' || martor === 'iesire-opusa' ? opusa : rotit !== null ? cuCentrul(rotit) : bun;
    const corp = programUrechi([{ ...tx, drum }], montaj).split('\n');
    const pana = corp.slice(6, corp.indexOf('M5'));
    let trecere = 0;
    const iesire = (): string[] => {
      if (martor === 'fara-iesire' || (martor === 'amestecate' && trecere === 1)) return [];
      const g = martor === 'treceri-diferite' && trecere === 2 ? geometria(a!.p0, t0, a!.parte, rho / 2) : gOut;
      if (martor === 'sfert-scurt') {
        const u = Math.atan2(a!.p0.y - g.C.y, a!.p0.x - g.C.x) + g.s * (Math.PI / 3);
        return [linieArc(M, a!.p0, { x: g.C.x + rho * Math.cos(u), y: g.C.y + rho * Math.sin(u) }, g.C, g.s)];
      }
      return [linieArc(M, a!.p0, g.B, g.C, g.s)];
    };
    for (let k = 0; k < pana.length; k++) {
      const linie = pana[k]!;
      if (/^G1 Z[-\d.]+ F300\.0$/.test(linie)) {
        trecere++;
        const g = martor === 'treceri-diferite' && trecere === 2 ? geometria(a.p0, t0, a.parte, rho / 2) : gIn;
        const [xA, yA] = M(g.A.x, g.A.y, 0);
        const [xp, yp] = M(a.p0.x, a.p0.y, 0);
        // Rapida deasupra lui A (în locul celei deasupra lui p₀ la prima trecere; după ridicare la celelalte).
        if (L[L.length - 1]?.startsWith('G0 X')) L.pop();
        const peBucla = martor === 'pe-bucla' || (martor === 'amestecate' && trecere === 1);
        if (!peBucla) L.push(`G0 X${f3(xA)} Y${f3(yA)}`);
        else L.push(`G0 X${f3(xp)} Y${f3(yp)}`);
        L.push(linie);
        if (peBucla) continue;
        if (martor === 'intrare-dreapta') { L.push(`G1 X${f3(xp)} Y${f3(yp)} F1000.0`); continue; }
        if (martor === 'sfert-scurt') {
          const u = Math.atan2(a.p0.y - g.C.y, a.p0.x - g.C.x) - g.s * (Math.PI / 3);
          const A2 = { x: g.C.x + rho * Math.cos(u), y: g.C.y + rho * Math.sin(u) };
          const [x2, y2] = M(A2.x, A2.y, 0);
          L.pop(); L.pop();
          L.push(`G0 X${f3(x2)} Y${f3(y2)}`, linie, linieArc(M, A2, a.p0, g.C, g.s));
          continue;
        }
        L.push(linieArc(M, g.A, a.p0, g.C, g.s));
        continue;
      }
      if (/^G0 Z/.test(linie)) L.push(...iesire());
      L.push(linie);
    }
  }
  L.push('M5', 'M30');
  return `${L.join('\n')}\n`;
}

// ---------------------------------------------------------------------------------------------------------------
// Corpusul pentru lipire: corpusul 2.4 adus la v7, cu intrări la întâmplare.

export type CazCorpusIntrari = Omit<CazCorpusUrechi, 'doc'> & { readonly doc: DocV7O; readonly v6: DocV6O; readonly cuIntrari: number };

/**
 * Corpusul 2.4 (`corpusUrechi()`) adus la v7, fără rampă. Pe fiecare operație care nu e `pe-linie`, cu probabilitatea
 * 0,65: intrările cu raza 3 (dialogul), 0,5 (minimul de la §6), 20, sau una log-uniformă în [0,5; 20]. `v6` e același
 * document fără intrări; `pasCaz` rărește corpusul pentru buget.
 */
export function corpusIntrari(samanta = 0x25b0, pasCaz = 1): CazCorpusIntrari[] {
  const r = aleator(samanta);
  return corpusUrechi().filter((_, k) => k % pasCaz === 0).map((c) => {
    const v6 = migreazaV5V6O(c.doc);
    const v7 = migreazaV6V7O(v6);
    let cuIntrari = 0;
    for (const pz of v7.piese) {
      for (const op of pz.operatii) {
        if (op.latura === 'pe-linie' || r() >= 0.65) continue;
        const x = r();
        const raza = x < 0.3 ? 3 : x < 0.4 ? 0.5 : x < 0.5 ? 20 : Math.round(0.5 * Math.exp(r() * Math.log(40)) * 1000) / 1000;
        op.intrari = { raza };
        cuIntrari++;
      }
    }
    return { ...c, doc: v7, v6, cuIntrari };
  });
}
