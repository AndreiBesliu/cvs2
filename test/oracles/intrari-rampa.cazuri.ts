/**
 * Cazurile oracolului intrărilor cu rampă (ADR 0031), cu ZERO importuri din `src/`:
 * - `CAZURI_IR`: cazurile pe hârtie din §6 (plus ρ > R, pentru câmpul de înălțimi), fiecare cu documentul v7, valorile
 *   CERUTE scrise de mână pe fiecare formă (p₀, C, ρ, partea, A, B; `null` = intrarea omisă), fundurile trecerilor,
 *   punctele de pe câmp cu fundul cerut și, pe bucla omisă, perimetrul ANALITIC și intrările rampei din ADR 0029;
 * - un SCRIITOR „cum cere contractul” (`programIR`): pe o formă cu intrare, programul scriitorului ADR 0030
 *   (`programIntrari`, cu propria lui copie a geometriei de la §2) adus la forma ADR 0031 §3 de `laRampaPeIntrare`
 *   (coborârea prin aer doar până la Z = 0, intrarea ca elice de la 0 la −d_k, F = min(avans, avansPlonjare·L₃ / d_k));
 *   pe o formă omisă, scriitorul rampei (`programRampa`, ADR 0029 §2);
 * - MARTORII NEGATIVI (`martorIR`): transformări greșite, deliberate, ale unui program cu rampa pe intrare (al
 *   aplicației, în lipire, sau al scriitorului): ADR 0031 §6 și ai mei;
 * - `corpusIntrariRampa`: corpusul 2.5b (`corpusIntrari`: geometria 2.3a / 2.4, toate colțurile, ambele Z0, toate
 *   laturile, ambele sensuri, urechi care încap, intrări 0,5–20) cu rampe de 1–30 mm alese de un PRNG propriu.
 */
import { migreazaV4V7O, migreazaV6V7O, type DocV7O, type UrechiO } from './document.ts';
import { aleator, cerc, drept, laMasina, PLACA_1, type Montaj, type Stoc } from './regiune.cazuri.ts';
import { corpusIntrari, docIntrari, P_RAMA, programIntrari, type AsteptatH, type CazCorpusIntrari, type CazIntrari } from './intrari.cazuri.ts';
import { corpusRampa, programRampa } from './rampa.cazuri.ts';
import { docPlaca1 } from './sens.cazuri.ts';
import { drumCerut, type FormaUrechi } from './urechi.cazuri.ts';
import { sfertulIncape } from './intrari.ts';

type P2 = { readonly x: number; readonly y: number };
const PI = Math.PI;

// ---------------------------------------------------------------------------------------------------------------
// Cazurile pe hârtie (ADR 0031 §6). Freza Ø6 (R = 3), pasul 3.

/**
 * Un punct al câmpului de înălțimi cu fundul cerut după toate trecerile (mm, în document): un număr, sau formula de pe
 * hârtie, evaluată în centrul celulei care conține punctul (ca discretizarea să nu intre în toleranță).
 */
export type PunctFund = { readonly x: number; readonly y: number; readonly z: number | ((x: number, y: number) => number); readonly de: string };

export type CazIR = {
  readonly nume: string;
  readonly stoc: Stoc;
  readonly forme: readonly FormaUrechi[];
  readonly diametru: number;
  readonly adancime: number;
  readonly pas: number;
  readonly urechi: UrechiO | null;
  readonly urechiPe?: Readonly<Record<string, UrechiO | null>>;
  readonly raza: number;
  readonly rampa: number;
  /** Pe fiecare formă (după id), ce cere hârtia; `null` = intrarea omisă. */
  readonly asteptat: Readonly<Record<string, AsteptatH>>;
  /** Fundurile trecerilor, pe hârtie. */
  readonly d: readonly number[];
  /** Exportul trebuie refuzat (ADR 0031 §2). */
  readonly refuz?: boolean;
  /** Razele încercate, pe hârtie, pomenite de avertismentul intrării omise; razele care NU trebuie pomenite. */
  readonly incercate?: readonly number[];
  readonly neincercate?: readonly number[];
  /** Bucla omisă (ADR 0029 §2, pe hârtie): perimetrul analitic, intrările desfășurate, zonele urechilor (dacă are). */
  readonly omisa?: Readonly<Record<string, { readonly P: number; readonly e: readonly number[]; readonly zone?: ReadonlyArray<{ readonly a: number; readonly b: number }> }>>;
  /** Punctele câmpului (forma cu intrare), cu fundul cerut. */
  readonly puncte?: readonly PunctFund[];
  /**
   * Cât scoate cel mult ieșirea, pe fiecare trecere (pe hârtie): pasul, dacă o parte din discul ei nu e atinsă de bucla
   * aceleiași treceri; 0 într-o gaură pe care bucla o taie toată la −d_k înaintea ieșirii.
   */
  readonly iesireScoate?: number;
  readonly doc: DocV7O;
};

const FOAIE_9: Stoc = { latime: 400, inaltime: 300, grosime: 9 };
const FOAIE_12: Stoc = { latime: 400, inaltime: 300, grosime: 12 };
const FOAIE_6: Stoc = { latime: 400, inaltime: 300, grosime: 6 };
const p = (x: number, y: number): P2 => ({ x, y });

function docIR(stoc: Stoc, forme: readonly FormaUrechi[], adancime: number, urechi: UrechiO | null, raza: number, rampa: number, urechiPe?: Readonly<Record<string, UrechiO | null>>): DocV7O {
  const doc = docIntrari(stoc, forme, { diametru: 6, adancime, pas: 3, urechi, intrari: { raza } });
  for (const pz of doc.piese) {
    for (const op of pz.operatii) {
      if (urechiPe && Object.hasOwn(urechiPe, pz.id)) op.urechi = urechiPe[pz.id] ?? null;
      op.rampa = { lungime: rampa };
    }
  }
  return doc;
}

const caz = (
  nume: string, stoc: Stoc, forme: readonly FormaUrechi[], asteptat: Record<string, AsteptatH>, o: {
    readonly adancime?: number; readonly urechi?: UrechiO | null; readonly urechiPe?: Readonly<Record<string, UrechiO | null>>; readonly raza?: number;
    readonly rampa?: number; readonly refuz?: boolean; readonly incercate?: readonly number[]; readonly neincercate?: readonly number[];
    readonly omisa?: CazIR['omisa']; readonly puncte?: readonly PunctFund[]; readonly iesireScoate?: number;
  } = {},
): CazIR => {
  const adancime = o.adancime ?? stoc.grosime;
  const raza = o.raza ?? 3, rampa = o.rampa ?? 10, urechi = o.urechi ?? null;
  const d = Array.from({ length: Math.round(adancime / 3) }, (_, k) => 3 * (k + 1));
  return {
    nume, stoc, forme, diametru: 6, adancime, pas: 3, urechi, raza, rampa, asteptat, d, doc: docIR(stoc, forme, adancime, urechi, raza, rampa, o.urechiPe),
    ...(o.urechiPe ? { urechiPe: o.urechiPe } : {}), ...(o.refuz ? { refuz: true } : {}), ...(o.incercate ? { incercate: o.incercate } : {}),
    ...(o.neincercate ? { neincercate: o.neincercate } : {}), ...(o.omisa ? { omisa: o.omisa } : {}), ...(o.puncte ? { puncte: o.puncte } : {}),
    ...(o.iesireScoate === undefined ? {} : { iesireScoate: o.iesireScoate }),
  };
};

const RAMA: FormaUrechi = { id: 'a', forma: drept(100, 60), x: 50, y: 50, latura: 'exterior', sens: 'urcare' };

/**
 * Fundul pe hârtie într-un punct Q acoperit DOAR de discul intrării, pe ultima trecere (d_n): intrarea e arcul de rază ρ
 * în jurul lui C, de la unghiul uA (în A) la uA + s·π/2 (în p₀), cu Z = −d_n·t; Q e atins la fracțiunile t pentru care
 * |Q − punct(t)| ≤ R, adică |u − φ| ≤ acos((q² + ρ² − R²) / (2qρ)); fundul = −d_n·(cel mai mare t atins).
 */
export function fundSubIntrare(Q: P2, C: P2, rho: number, uA: number, semn: 1 | -1, dn: number, R: number): number {
  const q = Math.hypot(Q.x - C.x, Q.y - C.y);
  const phi = Math.atan2(Q.y - C.y, Q.x - C.x);
  const c = (q * q + rho * rho - R * R) / (2 * q * rho);
  if (c > 1) return 0;
  const w = c < -1 ? PI : Math.acos(c);
  // Unghiul lui Q față de A, în sensul intrării, adus în (−π, π].
  let rel = (phi - uA) * semn;
  rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  const tMax = Math.min(1, (rel + w) / (PI / 2));
  const tMin = Math.max(0, (rel - w) / (PI / 2));
  return tMax >= tMin ? -dn * tMax : 0;
}

/**
 * Pe hârtie (Ø6, R = 3, pasul 3, rampa 10, urcare):
 * - rama 100 × 60 în (50, 50), exterior, foaia 9 (3 treceri: d = 3, 6, 9), raza 3: vârful 0 = (50, 47), t₀ = (−1, 0),
 *   n = (0, −1), C = (50, 44), A = C + (3, 0) = (53, 44), B = (47, 44); intrarea trigonometrică de la A (unghiul 0 față
 *   de C) la p₀ (90°). F pe elice: L₃ = √((1,5π)² + d²): 558,6 / 381,5 / 338,6. ρ = R: punctul (50, 41) (C − (0, 3)) e
 *   la √(3² + 3²) = 4,243 de orice punct al intrării și la 6 de buclă: fundul 0;
 * - gaura R5,5 în (100, 100), interior: bucla R2,5, ρ = 3 nu încape, ρ = 1,5 da (ADR 0030 §8; sfertul 2,356 ≥ 1):
 *   p₀ = (102,5, 100), C = (101, 100), A = (101, 98,5), B = (101, 101,5). ρ < R: benzile intrării, ieșirii și fanta
 *   buclei se suprapun; tot golul (q ≤ 5,5) e la cel mult 3 de bucla R2,5, deci fundul în C e −9, iar ieșirea nu mai
 *   scoate nimic (bucla aceleiași treceri a tăiat tot golul la −d_k înaintea ei); pe dreptunghiuri, lângă B discul
 *   ieșirii e la peste 6 de buclă: ieșirea scoate pasul;
 * - gaura R4: bucla R1, nici 3, nici 1,5 nu încap: intrarea omisă; rampa ADR 0029 din vârful 0: P = 2π, Lr = π,
 *   intrările e = 0, π, 2π; avertismentul pomenește 3 și 1,5 (amândouă cu sfertul ≥ 1);
 * - cu urechi 4 × 8 × 2 (foaia 6, d = 3, 6; vârful 4): ca la ADR 0030 §8, p₀-ul ramei = (100, 113), al vecinei = (30, 19);
 *   urechile din p₀ pe P = 320 + 6π;
 * - raza 0,6 cu rampă: sfertul 0,3π = 0,942 < 1: refuz;
 * - raza 1 cu rampă, gaura R3,7 (bucla R0,7): ρ = 1 nu încape (√(0,3² + 1²) = 1,044 > 0,705); 0,5 ar încăpea
 *   (√(0,2² + 0,5²)… cel mai departe 0,7 ≤ 0,705), dar sfertul ei e 0,785 < 1, deci nu se încearcă: intrarea omisă;
 *   avertismentul pomenește doar 1; rampa ADR 0029 pe P = 1,4π, Lr = 0,7π, e = 0, 0,7π, 1,4π;
 * - ρ > R: rama cu raza 6, opoziție (trigonometric): în (50, 47) t₀ = (1, 0), deșeul în dreapta, n = (0, −1),
 *   C = (50, 41), intrarea orară: A = C + (−6, 0) = (44, 41), B = (56, 41). C e la 6 de intrare, de ieșire și de buclă:
 *   fundul 0. Punctul de pe intrare la t = 0,1 (unghiul 180° − 9° față de C) e la 6·(1 − sin 9°) = 5,061 de buclă:
 *   doar intrarea îl atinge, până la t = 0,1 + (2/π)·2·asin(3/12) = 0,4217: fundul −9·0,4217 = −3,795.
 */
const UA_R6 = PI; // unghiul lui A față de C, în cazul ρ > R
/** Gaura R8 cu 2 urechi 8 × 2 (bucla R5, P = 10π, S = 5π, h = 4, ℓ = 0,45·(S − 8)): zonele urechilor, pe hârtie. */
const S_R8 = 5 * PI, L_R8 = 0.45 * (5 * PI - 8);
const ZONE_R8 = [0, 1].map((j) => ({ a: (j + 0.5) * S_R8 - 4 - L_R8, b: (j + 0.5) * S_R8 + 4 + L_R8 }));
export const CAZURI_IR: readonly CazIR[] = [
  caz('dreptunghi exterior, 3 treceri, rampa 10, intrările 3: elicea de la (A, 0) la (p₀, −d_k); ρ = R', FOAIE_9, [RAMA], {
    a: { p0: p(50, 47), C: p(50, 44), rho: 3, parte: 'stanga', A: p(53, 44), B: p(47, 44) },
  }, { puncte: [{ x: 50, y: 41, z: 0, de: 'C − (0, 3): în afara oricărui disc' }] }),
  caz('gaura circulară R5,5: raza se înjumătățește (3 → 1,5); ρ < R', FOAIE_9, [{ id: 'c', forma: cerc(5.5), x: 100, y: 100, latura: 'interior', sens: 'urcare' }], {
    c: { p0: p(102.5, 100), C: p(101, 100), rho: 1.5, parte: 'stanga', A: p(101, 98.5), B: p(101, 101.5) },
  }, { puncte: [{ x: 101, y: 100, z: -9, de: 'C: în golul tăiat întreg' }], iesireScoate: 0 }),
  caz('gaura circulară R4: intrarea omisă; rampa ADR 0029 din vârful 0, plus avertismentul (3 și 1,5)', FOAIE_9, [{ id: 'c', forma: cerc(4), x: 100, y: 100, latura: 'interior', sens: 'urcare' }], { c: null }, {
    incercate: [3, 1.5], omisa: { c: { P: 2 * PI, e: [0, PI, 2 * PI] } },
  }),
  caz('cu urechi 4 × 8 × 2: pozițiile urechilor se numără de la p₀', FOAIE_6, [RAMA, { id: 'b', forma: drept(140, 20), x: 30, y: 22, latura: 'exterior', sens: 'urcare' }], {
    a: { p0: p(100, 113), C: p(100, 116), rho: 3, parte: 'stanga', A: p(97, 116), B: p(103, 116) },
    b: { p0: p(30, 19), C: p(30, 16), rho: 3, parte: 'stanga', A: p(33, 16), B: p(27, 16) },
  }, { urechi: { numar: 4, latime: 8, grosime: 2 } }),
  caz('raza 0,6 cu rampă: refuzată (sfertul 0,942 mm)', FOAIE_9, [RAMA], { a: null }, { raza: 0.6, refuz: true }),
  caz('raza 1 cu rampă, gaura R3,7: se încearcă doar 1 (0,5 are sfertul 0,785 mm): intrarea omisă', FOAIE_9, [{ id: 'c', forma: cerc(3.7), x: 100, y: 100, latura: 'interior', sens: 'urcare' }], { c: null }, {
    raza: 1, incercate: [1], neincercate: [0.5], omisa: { c: { P: 1.4 * PI, e: [0, 0.7 * PI, 1.4 * PI] } },
  }),
  caz('ρ > R: rama cu intrările 6, opoziție; C rămâne neatins, fundul sub intrare urmează elicea', FOAIE_9, [{ ...RAMA, sens: 'opozitie' }], {
    a: { p0: p(50, 47), C: p(50, 41), rho: 6, parte: 'dreapta', A: p(44, 41), B: p(56, 41) },
  }, {
    raza: 6,
    puncte: [
      { x: 50, y: 41, z: 0, de: 'C: la ρ = 6 de intrare, ieșire și buclă' },
      // Pe intrare la t = 0,1 (orar de la A, unghiul π − 0,1·π/2 față de C).
      { x: 50 + 6 * Math.cos(UA_R6 - 0.1 * PI / 2), y: 41 + 6 * Math.sin(UA_R6 - 0.1 * PI / 2), z: (x, y) => fundSubIntrare(p(x, y), p(50, 41), 6, UA_R6, -1, 9, 3), de: 'intrarea la t = 0,1: doar elicea o atinge (≈ −3,795)' },
    ],
  }),
  /*
   * Precizarea din 10.10 (urechile buclei înseși; coloana urechii k = [c_k − h + R, c_k + h − R] de la p₀, la cel puțin
   * D = 6 de semicerc):
   * - gaura R20 în (150, 150), interior, 5 urechi 8 × 2, raza 6, foaia 6: bucla R17, P = 34π, S = 6,8π = 21,363;
   *   coloana urechii 0 începe la s = S/2 − 4 + 3 = 9,681 (unghiul 0,5695 rad): Q = (164,319, 159,165). Vârful 0 =
   *   (167, 150), t₀ = (0, 1), n = (−1, 0). ρ = 6: C = (161, 150), |Q − C| − 6 = 9,745 − 6 = 3,745 < 6: nu încape; ρ = 3:
   *   C = (164, 150), |Q − C| − 3 = 9,171 − 3 = 6,171 ≥ 6: încape (a: tangentă la buclă; urechea 4, simetrică, la fel);
   * - gaura R8 în (100, 100), 2 urechi 8 × 2, raza 3, foaia 12 (d = 3, 6, 9, 12; vârful 10): bucla R5, coloana urechii 0
   *   la unghiurile 78,5°–101,5°, (1,0, 4,9) față de centru; ρ = 3: B = (102, 103) e la 2,15 de ea; ρ = 1,5: B = (103,5,
   *   101,5) la 4,22: intrarea omisă (ADR 0029 pe P = 10π, Lr = 10: e = 0, S/2 + h + ℓ, 3S/2 + h + ℓ, P + S/2 + h + ℓ);
   * - colțul ca intrare: gaura 80 × 50 cu colțurile R6 în (100, 100), raza 3: bucla [103, 177] × [103, 147] cu colțurile
   *   R3; vârful 0 = (106, 103), t₀ = (1, 0), n = (0, 1), C = (106, 106) = centrul colțului, A = (103, 106) e chiar pe buclă
   *   (sfertul intrării e colțul din stânga-jos), B = (109, 106).
   */
  caz('urechile proprii: gaura R20 cu 5 urechi 8 × 2, raza 6: ρ = 6 trece la 3,745 de coloana urechii 0, ρ = 3 la 6,171', FOAIE_6, [{ id: 'c', forma: cerc(20), x: 150, y: 150, latura: 'interior', sens: 'urcare' }], {
    c: { p0: p(167, 150), C: p(164, 150), rho: 3, parte: 'stanga', A: p(164, 147), B: p(164, 153) },
  }, { raza: 6, urechi: { numar: 5, latime: 8, grosime: 2 } }),
  caz('urechile proprii: gaura R8 cu 2 urechi 8 × 2, raza 3: nici 3, nici 1,5 nu stau la D de coloane: intrarea omisă, rampa ADR 0029 cu zonele urechilor', FOAIE_12, [{ id: 'c', forma: cerc(8), x: 100, y: 100, latura: 'interior', sens: 'urcare' }], { c: null }, {
    urechi: { numar: 2, latime: 8, grosime: 2 }, incercate: [3, 1.5],
    omisa: { c: { P: 10 * PI, e: [0, ZONE_R8[0]!.b, ZONE_R8[1]!.b, 10 * PI + ZONE_R8[0]!.b], zone: ZONE_R8 } },
  }),
  caz('colțul ca intrare: gaura 80 × 50 R6, raza 3: sfertul intrării e chiar colțul buclei (A pe buclă)', FOAIE_9, [{ id: 'g', forma: drept(80, 50, 6), x: 100, y: 100, latura: 'interior', sens: 'urcare' }], {
    g: { p0: p(106, 103), C: p(106, 106), rho: 3, parte: 'stanga', A: p(103, 106), B: p(109, 106) },
  }),
];

/**
 * Lead-urile care încalcă condiția urechilor proprii (martorul „fără condiție”), pe cazurile cu urechi de mai sus: ρ = 6
 * în vârful 0 al găurii R20 (C = (161, 150), A = (161, 144), B = (161, 156)); ρ = 3 în vârful 0 al găurii R8 (C = (102,
 * 100), A = (102, 97), B = (102, 103)).
 */
export const FARA_URECHI_PROPRII: Readonly<Record<number, AsteptatH>> = {
  7: { p0: p(167, 150), C: p(161, 150), rho: 6, parte: 'stanga', A: p(161, 144), B: p(161, 156) },
  8: { p0: p(105, 100), C: p(102, 100), rho: 3, parte: 'stanga', A: p(102, 97), B: p(102, 103) },
};

/** Perimetrul buclei ramei din cazul cu urechi (ca la ADR 0030). */
export const P_RAMA_IR = P_RAMA;

// ---------------------------------------------------------------------------------------------------------------
// Scriitorul și transformările.

const f3 = (v: number): string => {
  const s = v.toFixed(3);
  return s === '-0.000' ? '0.000' : s;
};
const num = (linie: string, litera: string): number | null => {
  const m = new RegExp(`${litera}(-?\\d+(?:\\.\\d+)?)`).exec(linie.replace(/\([^)]*\)/g, ''));
  return m ? Number(m[1]) : null;
};

/** Z-ul mașinii la fața de sus a documentului. */
const zSusMasina = (m: Montaj): number => laMasina(m)(0, 0, 0)[2];

/** Lungimea în plan a unui arc G2 / G3 scris (din start, capăt, I, J), cum îl execută GRBL (unghiul în (0, 2π]). */
function lungimeArc(start: P2, linie: string): number {
  const x = num(linie, 'X')!, y = num(linie, 'Y')!, i = num(linie, 'I') ?? 0, j = num(linie, 'J') ?? 0;
  const c = { x: start.x + i, y: start.y + j };
  const r = Math.hypot(i, j);
  const ua = Math.atan2(start.y - c.y, start.x - c.x), ub = Math.atan2(y - c.y, x - c.x);
  let du = /^G2/.test(linie) ? ua - ub : ub - ua;
  while (du <= 1e-12) du += 2 * PI;
  return r * du;
}

/**
 * Programul ADR 0030 §5 (plonjare în A la −d_k, intrarea plată) adus la ADR 0031 §3: coborârea prin aer doar până la
 * fața de sus, intrarea ca elice de la 0 la −d_k, cu F = min(1000, 300·L₃ / d_k); mișcarea de după elice primește
 * F1000.0 dacă nu-l are. Se aplică doar plonjărilor urmate de un arc fără Z (o intrare).
 */
export function laRampaPeIntrare(text: string, m: Montaj): string {
  const L = text.split('\n');
  const zTop = zSusMasina(m);
  let pozitie: P2 = { x: 0, y: 0 };
  for (let k = 0; k < L.length; k++) {
    const linie = L[k]!;
    const pl = /^G1 Z(-?\d+\.\d+) F300\.0$/.exec(linie);
    const urm = L[k + 1] ?? '';
    if (pl && /^G[23] X\S+ Y\S+ I\S+ J\S+( F\S+)?$/.test(urm) && Number(pl[1]) < zTop - 1e-9) {
      const zk = Number(pl[1]);
      const dz = zTop - zk;
      const L3 = Math.hypot(lungimeArc(pozitie, urm), dz);
      const F = Math.min(1000, (300 * L3) / dz);
      L[k] = `G1 Z${f3(zTop)} F300.0`;
      L[k + 1] = `${urm.replace(/ F\S+$/, '').replace(/ I/, ` Z${f3(zk)} I`)} F${F.toFixed(1)}`;
      const dupa = L[k + 2] ?? '';
      if (/^G[123] X/.test(dupa) && !/ F\S+/.test(dupa)) L[k + 2] = `${dupa} F1000.0`;
    }
    const x = num(linie, 'X'), y = num(linie, 'Y');
    if (/^G[0-3]/.test(linie)) pozitie = { x: x ?? pozitie.x, y: y ?? pozitie.y };
  }
  return L.join('\n');
}

/** Corpul unui program (fără antet și fără M5 / M30): de la prima linie după `G4 P…` până înaintea lui `M5`. */
function corpul(text: string): string[] {
  const L = text.split('\n');
  return L.slice(L.findIndex((l) => /^G4 P/.test(l)) + 1, L.indexOf('M5'));
}

/** Cazul ADR 0030 echivalent (pentru scriitorul `programIntrari`), cu o singură formă. */
const cazIntrari = (c: CazIR, f: FormaUrechi): CazIntrari => ({
  nume: c.nume, stoc: c.stoc, forme: [f], diametru: c.diametru, adancime: c.adancime, pas: c.pas, urechi: c.urechi, raza: c.raza,
  asteptat: c.asteptat, doc: c.doc, ...(c.urechiPe ? { urechiPe: c.urechiPe } : {}),
});

/**
 * Programul unui caz „cum cere contractul”: pe fiecare formă cu intrare, trecerile ADR 0031 §3; pe fiecare formă omisă,
 * rampa ADR 0029 §2 din vârful 0.
 */
export function programIR(c: CazIR, m: Montaj): string {
  const L: string[] = ['(CNC Vector Studio)', 'G90 G17 G21 G94', 'G54', `G0 Z${f3(laMasina(m)(0, 0, 5)[2])}`, 'M3 S18000', 'G4 P3.000'];
  for (const f of c.forme) {
    const a = c.asteptat[f.id] ?? null;
    if (a) {
      L.push(...corpul(laRampaPeIntrare(programIntrari(cazIntrari(c, f), m), m)));
      continue;
    }
    const urechi = c.urechiPe && Object.hasOwn(c.urechiPe, f.id) ? c.urechiPe[f.id] ?? null : c.urechi;
    L.push(...corpul(programRampa([{
      eticheta: `${f.id}/${f.id}: ${f.forma.tip}, ${f.latura}, ${c.adancime} mm`, drum: drumCerut(f, c.diametru, 0), adancime: c.adancime, pas: c.pas,
      grosimeFoaie: c.stoc.grosime, urechi, rampa: c.rampa,
    }], m)));
  }
  L.push('M5', 'M30');
  return `${L.join('\n')}\n`;
}

/** Martorii negativi (ADR 0031 §6, apoi ai mei). */
export type MartorIR =
  /** §6: intrarea plată la −d_k, cu plonjarea în A (forma ADR 0030 §5, sub rampă). */
  | 'plata'
  /** §6: intrarea care pornește de la −d_{k−1} în A (o coborâre pe verticală în material), de la trecerea 2. */
  | 'de-la-dk-1'
  /** §6: intrarea care coboară doar până la −d_{k−1}, apoi o treaptă pe verticală în p₀ (de la trecerea 2). */
  | 'treapta'
  /** Ieșirea care urcă în Z (respinsă la „Limitele”): de la −d_k la −d_{k−1} (de la trecerea 2). */
  | 'iesire-urca'
  /** Ieșirea care urcă până la fața de sus (la fiecare trecere): lanțul se termină înaintea ei, fără ridicare. */
  | 'iesire-la-suprafata'
  /** Coborârea prin aer cu G0 în loc de G1 cu avansul de plonjare. */
  | 'aer-g0'
  /** Intrarea ca o dreaptă de la (A, 0) la (p₀, −d_k), nu ca arc. */
  | 'elice-dreapta'
  /** Elicea frântă la jumătatea arcului, cu Z = −0,8·d_k acolo (nu liniar), cu F plafonat pe fiecare jumătate. */
  | 'elice-franta'
  /** Elicea cu avansul de tăiere (F1000), nu plafonat (viteza pe verticală peste avansul de plonjare). */
  | 'avans-taiere'
  /** Bucla trecerii care traversează urechile tăiată plat, la −d_k (urechile pierdute). */
  | 'fara-urechi'
  /** Ultima trecere a fiecărei bucle lipsește (bucla nu ajunge la adâncimea operației). */
  | 'fara-ultima-trecere'
  /** Prima trecere a fiecărei bucle e repetată (fundul nu crește). */
  | 'trecere-dubla'
  /** Buclele intercalate: trecerea k a tuturor buclelor, apoi k + 1 (ordinea fără rampă). */
  | 'intercalate'
  /**
   * Pe prima trecere, în mijlocul buclei, o coborâre pe verticală de 0,002 mm (cu F300) și înapoi: sub toleranța Z a
   * profilului (0,002) și a invariantei 1, peste toleranța coborârii pe verticală (d·0,001 / L_in + 0,0005 ≤ 0,0018).
   */
  | 'micro-plonjare';

/** Punctul unui arc G2 / G3 scris (din start, I, J și capăt), la fracțiunea u a unghiului lui. */
function punctPeArc(start: P2, linie: string, u: number): { readonly p: P2; readonly c: P2 } {
  const x = num(linie, 'X')!, y = num(linie, 'Y')!, i = num(linie, 'I') ?? 0, j = num(linie, 'J') ?? 0;
  const c = { x: start.x + i, y: start.y + j };
  const r = Math.hypot(i, j);
  const ua = Math.atan2(start.y - c.y, start.x - c.x), ub = Math.atan2(y - c.y, x - c.x);
  let du = /^G2/.test(linie) ? ua - ub : ub - ua;
  while (du <= 1e-12) du += 2 * PI;
  const v = ua + (/^G2/.test(linie) ? -1 : 1) * du * u;
  return { p: { x: c.x + r * Math.cos(v), y: c.y + r * Math.sin(v) }, c };
}

/**
 * Un martor aplicat unui program cu rampa pe intrare (al aplicației sau al scriitorului). Programul se taie în antet,
 * etichete și blocuri de trecere (de la rapida deasupra punctului de coborâre până la ridicarea de după ea, inclusiv);
 * un bloc cu intrare e recunoscut după perechea `G1 Z<fața de sus> F300.0` + arcul cu Z (elicea). Martorii „de la
 * trecerea 2” lasă prima trecere neschimbată (acolo −d_{k−1} e chiar fața de sus).
 */
export function martorIR(text: string, m: Montaj, martor: MartorIR): string {
  const zTop = zSusMasina(m);
  const L = text.split('\n');
  const cap = L.slice(0, L.findIndex((l) => /^G4 P/.test(l)) + 1);
  const pe: Array<{ eticheta: string; blocuri: string[][] }> = [];
  let acum: string[] | null = null;
  for (const l of corpul(text)) {
    if (/^\(/.test(l)) { pe.push({ eticheta: l, blocuri: [] }); acum = null; continue; }
    if (/^G0 X/.test(l) || !acum) { acum = [l]; pe[pe.length - 1]!.blocuri.push(acum); continue; }
    acum.push(l);
  }
  const cuIntrare = (b: readonly string[]): boolean => /^G1 Z(-?\d+\.\d+) F300\.0$/.test(b[1] ?? '') && Math.abs(num(b[1]!, 'Z')! - zTop) < 1e-9
    && /^G[23] X\S+ Y\S+ Z\S+ I\S+ J\S+ F\S+$/.test(b[2] ?? '');
  const out = [...cap];
  if (martor === 'intercalate') {
    const n = Math.max(...pe.map((x) => x.blocuri.length));
    for (let k = 0; k < n; k++) for (const x of pe) if (x.blocuri[k]) out.push(x.eticheta, ...x.blocuri[k]!);
    out.push('M5', 'M30', '');
    return out.join('\n');
  }
  for (const x of pe) {
    out.push(x.eticheta);
    const lead = x.blocuri.filter(cuIntrare).length > 0;
    const blocuri = !lead ? x.blocuri
      : martor === 'fara-ultima-trecere' ? x.blocuri.slice(0, -1)
        : martor === 'trecere-dubla' ? [x.blocuri[0]!, ...x.blocuri] : x.blocuri;
    let zPrec = zTop;
    blocuri.forEach((b0, k) => {
      if (!cuIntrare(b0)) { out.push(...b0); return; }
      const b = [...b0];
      const elice = b[2]!;
      const zk = num(elice, 'Z')!;
      const A = { x: num(b[0]!, 'X')!, y: num(b[0]!, 'Y')! };
      const doiPlus = k >= 1 && zPrec < zTop - 1e-9;
      if (martor === 'plata') { b[1] = `G1 Z${f3(zk)} F300.0`; b[2] = `${elice.replace(/ Z\S+/, '').replace(/ F\S+$/, '')} F1000.0`; }
      if (martor === 'de-la-dk-1' && doiPlus) b[1] = `G1 Z${f3(zPrec)} F300.0`;
      if (martor === 'treapta' && doiPlus) b.splice(2, 1, elice.replace(/ Z\S+/, ` Z${f3(zPrec)}`), `G1 Z${f3(zk)} F300.0`);
      // Ieșirea = arcul de dinaintea ridicării (penultima linie a blocului).
      if (martor === 'iesire-urca' && doiPlus) b[b.length - 2] = b[b.length - 2]!.replace(/ I/, ` Z${f3(zPrec)} I`);
      if (martor === 'iesire-la-suprafata') b[b.length - 2] = b[b.length - 2]!.replace(/ I/, ` Z${f3(zTop)} I`);
      if (martor === 'aer-g0') b[1] = `G0 Z${f3(zTop)}`;
      if (martor === 'elice-dreapta') b[2] = `G1 X${f3(num(elice, 'X')!)} Y${f3(num(elice, 'Y')!)} Z${f3(zk)} F${num(elice, 'F')!.toFixed(1)}`;
      if (martor === 'avans-taiere') b[2] = elice.replace(/ F\S+$/, ' F1000.0');
      if (martor === 'elice-franta') {
        const { p: q, c } = punctPeArc(A, elice, 0.5);
        const dz = zTop - zk;
        const zq = zTop - 0.8 * dz;
        const Lh = lungimeArc(A, elice) / 2;
        const F1 = Math.min(1000, (300 * Math.hypot(Lh, 0.8 * dz)) / (0.8 * dz)), F2 = Math.min(1000, (300 * Math.hypot(Lh, 0.2 * dz)) / (0.2 * dz));
        const g = elice.slice(0, 2);
        b.splice(2, 1,
          `${g} X${f3(q.x)} Y${f3(q.y)} Z${f3(zq)} I${f3(c.x - A.x)} J${f3(c.y - A.y)} F${F1.toFixed(1)}`,
          `${g} X${f3(num(elice, 'X')!)} Y${f3(num(elice, 'Y')!)} Z${f3(zk)} I${f3(c.x - Number(f3(q.x)))} J${f3(c.y - Number(f3(q.y)))} F${F2.toFixed(1)}`);
      }
      if (martor === 'micro-plonjare' && k === 0) b.splice(5, 0, `G1 Z${f3(zk - 0.002)} F300.0`, `G1 Z${f3(zk)}`);
      if (martor === 'fara-urechi') for (let i = 3; i < b.length - 2; i++) b[i] = b[i]!.replace(/ Z-?\d+\.\d+/, ` Z${f3(zk)}`);
      out.push(...b);
      zPrec = zk;
    });
  }
  out.push('M5', 'M30', '');
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------------------------
// Corpusul pentru lipire.

export type CazCorpusIR = CazCorpusIntrari & { readonly cuIntrariRampa: number; readonly refuzPrezis: boolean };

/** Refuzul de la ADR 0031 §2 (raza cu sfertul sub 1 mm, cu rampă) sau §1 (pe linie cu intrări), pe document. */
export function refuzPrezis(doc: DocV7O): boolean {
  return doc.piese.some((pz) => pz.operatii.some((op) => op.intrari !== null && (op.latura === 'pe-linie' || (op.rampa !== null && !sfertulIncape(op.intrari.raza)))));
}

/**
 * Corpusul 2.5b (`corpusIntrari`) cu rampe: pe fiecare operație care nu e `pe-linie`, cu probabilitatea 0,4 primește
 * intrări (raza log-uniformă 0,5–20) dacă nu le are; cu probabilitatea 0,8, rampa: 10 (implicitul), 1 (minimul), 30, sau
 * o lungime între 1 și 30. Sub rampă, o rază cu sfertul sub 1 mm se ridică, în 4 din 5 cazuri, la una între 2/π și 3
 * (restul rămân refuzuri). Pe `pe-linie`, rampa doar uneori (fără intrări).
 */
export function corpusIntrariRampa(samanta = 0x25c0, pasCaz = 1): CazCorpusIR[] {
  const r = aleator(samanta);
  return corpusIntrari().filter((_, k) => k % pasCaz === 0).map((c) => {
    const doc = structuredClone(c.doc);
    let cu = 0;
    for (const pz of doc.piese) {
      for (const op of pz.operatii) {
        const x = r(), y = r(), z = r(), w = r();
        if (op.latura === 'pe-linie') { if (x < 0.3) op.rampa = { lungime: 10 }; continue; }
        if (op.intrari === null && x < 0.4) op.intrari = { raza: Math.round(0.5 * Math.exp(y * Math.log(40)) * 1000) / 1000 };
        if (z < 0.8) op.rampa = { lungime: w < 0.3 ? 10 : w < 0.4 ? 1 : w < 0.5 ? 30 : Math.round((1 + ((w - 0.5) / 0.5) * 29) * 1000) / 1000 };
        if (op.rampa && op.intrari && !sfertulIncape(op.intrari.raza) && y < 0.8) op.intrari = { raza: Math.round((2 / PI + 0.001 + y * 2.3) * 1000) / 1000 };
        if (op.rampa && op.intrari) cu++;
      }
    }
    return { ...c, doc, cuIntrariRampa: cu, refuzPrezis: refuzPrezis(doc) };
  });
}

/**
 * Documentele cu o singură parte a combinației (sau niciuna), pentru proba „același program, octet cu octet, ca
 * aplicația de dinainte de ADR 0031”: corpusul 2.5b (doar intrări; și v6 fără intrări), corpusul 2.5a (doar rampă) și
 * placa 1 (140 × 100 și 300 × 200, pe cele 8 montaje), toate aduse la v7.
 */
export function documenteFaraCombinatie(): Array<{ readonly familie: string; readonly nume: string; readonly doc: DocV7O; readonly m: { readonly origine: Montaj['origine']; readonly z0: Montaj['z0'] } }> {
  return [
    ...corpusIntrari().map((c) => ({ familie: 'doar intrări (2.5b)', nume: c.nume, doc: c.doc, m: { origine: c.origine, z0: c.z0 } })),
    ...corpusIntrari().map((c) => ({ familie: 'niciuna (2.5b fără intrări)', nume: c.nume, doc: migreazaV6V7O(c.v6), m: { origine: c.origine, z0: c.z0 } })),
    ...corpusRampa().map((c) => ({ familie: 'doar rampă (2.5a)', nume: c.nume, doc: migreazaV6V7O(c.doc), m: { origine: c.origine, z0: c.z0 } })),
    ...(['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const).flatMap((origine) => (['sus', 'jos'] as const).flatMap((z0) => [
      { familie: 'placa 1', nume: `140 × 100, ${origine}, Z0 ${z0}`, doc: migreazaV4V7O(docPlaca1()), m: { origine, z0 } },
      { familie: 'placa 1', nume: `300 × 200, ${origine}, Z0 ${z0}`, doc: migreazaV4V7O(PLACA_1(6)), m: { origine, z0 } },
    ])),
  ];
}
