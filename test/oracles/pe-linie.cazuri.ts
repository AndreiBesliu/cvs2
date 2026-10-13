/**
 * Cazurile invariantei 14 (i) (ADR 0037 §13; felia 2.3c, sesiune independentă), cu ZERO importuri din `src/`.
 *
 * - **Martorul** (ADR 0037, „Ce am măsurat”, punctul 2): pătratul 10…60 mm al cărui vârf (60, 60) poartă un arc cu
 *   `bulge` 1e-13 până în (60, 60 + 1e-11), pe linie, freza Ø6, adâncimea 1, pasul 1, GRBL 1.1, originea stânga-jos.
 *   `PROGRAM_ED5CD65` e textul exact scris de aplicație la `ed5cd65` (înaintea reparației), rulat în sesiunea oracolului:
 *   cercul Ø50 ascuns în două semicercuri, fiecare cu capetele pe latura de sus. `PROGRAM_REPARAT`: același program, cu
 *   cercul înlocuit de un G1.
 * - **Martorii negativi** (`martor14`): transformări deliberate ale programului reparat, fiecare cu sensul care trebuie
 *   s-o prindă (înainte / acoperirea).
 * - **Cazul cel mai rău legal** (`celMaiRauArc`): un cerc pe linie, tăiat ca de biarcele de la limita lor (raza + 0,00099,
 *   ADR 0033 §1) și rotunjit de un post la 3 zecimale în cel mai rău fel găsit (startul și I / J), cu I / J din startul
 *   rotunjit (A) sau din cel exact (B). Abaterea lui trece de 0,001 + 0,002: fără marja declarată, poarta ar refuza un
 *   program legal.
 */
import { regulaArcGrbl, type Mutare } from './gcode.ts';
import { regiuneDinDocument } from './regiune.ts';
import { cerc, simple, type Stoc } from './regiune.cazuri.ts';
import { cale, docCaleCam, vA, vL } from './poarta-cale.cazuri.ts';
import type { ContextPoarta } from './poarta.ts';
import type { DocV4O, DocV9O } from './document.ts';

export const STOC_14: Stoc = { latime: 120, inaltime: 100, grosime: 18 };

/** Pătratul martorului, ca o cale în lume (piesa la (0, 0), matricea identitate): `p/k`. */
export const patratCuArcMic = () => cale([vL(10, 10), vL(60, 10), vA(60, 60, 1e-13), vL(60, 60 + 1e-11), vL(10, 60)]);

/** Documentul martorului: o operație pe linie, Ø6, cu adâncimea dată și pasul 1. */
export function docMartor(adancime = 1): DocV9O {
  return docCaleCam(STOC_14, [{ id: 'p', x: 0, y: 0, elemente: [{ id: 'k', forma: patratCuArcMic(), latura: 'pe-linie', adancime }] }], { diametru: 6, pas: 1 });
}

/** Contextul porții: foaia, montajul stânga-jos / Z0 sus, freza Ø6, pasul 1, regiunea din document. */
export function ctx14(doc: DocV4O | DocV9O, stoc: Stoc = STOC_14): ContextPoarta {
  return {
    foaie: { ...stoc }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 1, supracursa: 0, asteptareAx: 3,
    regiune: regiuneDinDocument(doc), avansPlonjare: 300,
  };
}

const antet = (stoc: Stoc): string[] => [
  '(CNC Vector Studio)',
  '(post GRBL 1.1)',
  `(origine stanga-jos, Z0 sus, foaia ${stoc.latime.toFixed(3)} x ${stoc.inaltime.toFixed(3)} x ${stoc.grosime.toFixed(3)} mm)`,
  '(scula T1 freza plata D6.000)',
  'G90 G17 G21 G94',
  'G40 G49 G80',
  'G54',
  'G0 Z5.000',
  'M3 S18000',
  'G4 P3.000',
];
const final = ['G0 Z5.000', 'M5', 'M30'];
const program = (corp: readonly string[], stoc: Stoc = STOC_14): string => `${[...antet(stoc), ...corp, ...final].join('\n')}\n`;

/** Programul aplicației la `ed5cd65`, octet cu octet (liniile 16 și 17: cercul Ø50). */
export const PROGRAM_ED5CD65 = program([
  '(p/k: cale, pe-linie, 1 mm)',
  'G0 X10.000 Y10.000',
  'G1 Z-1.000 F300.0',
  'G1 X60.000 Y10.000 F1000.0',
  'G1 X60.000 Y60.000',
  'G3 X10.013 Y60.000 I-24.993 J0.000',
  'G3 X60.000 Y60.000 I24.994 J0.000',
  'G1 X10.000 Y60.000',
  'G1 X10.000 Y10.000',
]);
/** Liniile semicercurilor în `PROGRAM_ED5CD65`. */
export const LINII_CERC = [16, 17] as const;

/** Același program, cu cercul înlocuit de un G1 (arcul de 1e-11 mm, ca linie, ADR 0037 §1). */
export const PROGRAM_REPARAT = PROGRAM_ED5CD65.replace('G3 X10.013 Y60.000 I-24.993 J0.000\nG3 X60.000 Y60.000 I24.994 J0.000\n', 'G1 X60.000 Y60.000\n');

/** Corpul unei treceri complete pe pătrat, la adâncimea z (fără eticheta și fără ridicare). */
const trecere = (z: string, fara?: 'ultima-latura'): string[] => [
  'G0 X10.000 Y10.000', `G1 Z${z} F300.0`, 'G1 X60.000 Y10.000 F1000.0', 'G1 X60.000 Y60.000', 'G1 X60.000 Y60.000', 'G1 X10.000 Y60.000',
  ...(fara === 'ultima-latura' ? [] : ['G1 X10.000 Y10.000']),
];

/** Două treceri pe pătrat (adâncimea 2, pasul 1), cu ridicare între ele; `lipsa`: a doua sare latura stângă. */
export function douaTreceri(lipsa: boolean): string {
  return program(['(p/k: cale, pe-linie, 2 mm)', ...trecere('-1.000'), 'G0 Z5.000', ...trecere('-2.000', lipsa ? 'ultima-latura' : undefined)]);
}

/** Martorii negativi: transformări ale programului reparat; `sens` = direcția care trebuie s-o prindă, `linia` = unde. */
export type Martor14 = {
  readonly nume: string;
  readonly text: string;
  readonly sens: 'inainte' | 'acoperire' | 'fara-taiere';
  /** Linia la care trebuie raportată încălcarea (înainte: mișcarea; acoperirea: eticheta). */
  readonly linia: number;
  /** Documentul (adâncimea etichetei). */
  readonly doc: DocV9O;
};

const muta = (text: string, f: (linie: string, nr: number) => string | readonly string[] | null): string =>
  `${text.trimEnd().split('\n').flatMap((l, k) => { const x = f(l, k + 1); return x === null ? [] : typeof x === 'string' ? [x] : [...x]; }).join('\n')}\n`;

export function martori14(): Martor14[] {
  const r = PROGRAM_REPARAT;
  const d1 = docMartor(1), d2 = docMartor(2);
  return [
    {
      // N2: totul mutat cu 0,004 mm pe X (peste orice abatere legală, ~0,0032): laturile verticale ies de pe cale.
      nume: 'N2 mutat cu 0,004 mm pe X', sens: 'inainte', linia: 15, doc: d1,
      text: muta(r, (l, nr) => (nr > 11 && /^G[0-3] .*X\d/.test(l) ? l.replace(/X(\d+\.\d+)/, (_, x: string) => `X${(Number(x) + 0.004).toFixed(3)}`) : l)),
    },
    {
      // N3: ultima latură lipsește: fiecare mișcare stă pe cale, dar latura stângă nu e tăiată.
      nume: 'N3 ultima latură lipsește', sens: 'acoperire', linia: 11, doc: d1,
      text: muta(r, (l, nr) => (nr === 18 && l === 'G1 X10.000 Y10.000' ? null : l)),
    },
    {
      // N4: o bucată a laturii stângi devine un arc cu săgeata 0,05 mm (capetele pe cale): doar rafinarea arcului îl vede
      // înainte (raza 250,025, I = 250,025 − 0,05).
      nume: 'N4 arc cu săgeata 0,05 mm pe latura stângă', sens: 'inainte', linia: 19, doc: d1,
      text: muta(r, (l, nr) => (nr === 18 && l === 'G1 X10.000 Y10.000' ? ['G1 X10.000 Y40.000', 'G3 X10.000 Y30.000 I249.975 J-5.000', 'G1 X10.000 Y10.000'] : l)),
    },
    {
      // N5: două treceri, a doua sare latura stângă: acoperirea se cere fiecărei treceri, nu reuniunii lor.
      nume: 'N5 a doua trecere sare o latură', sens: 'acoperire', linia: 11, doc: d2, text: douaTreceri(true),
    },
    {
      // N6: plonjarea cade la 0,5 mm de cale (și drumul până pe cale).
      nume: 'N6 plonjarea lângă cale', sens: 'inainte', linia: 13, doc: d1,
      text: muta(r, (l, nr) => (nr === 12 ? 'G0 X10.000 Y9.500' : l)),
    },
    {
      // N8: o cocoașă scurtă: un arc cu coarda 0,8 mm și săgeata 0,05 mm pe latura de jos (raza 1,625, centrul sub
      // latură). Capetele lui stau pe cale; o rafinare care se oprește la bucăți de ~1 mm nu-l mai vede înainte.
      nume: 'N8 cocoașă scurtă (coarda 0,8 mm, săgeata 0,05 mm)', sens: 'inainte', linia: 15, doc: d1,
      text: muta(r, (l, nr) => (nr === 14 ? ['G1 X30.000 Y10.000 F1000.0', 'G2 X30.800 Y10.000 I0.400 J-1.575', 'G1 X60.000 Y10.000'] : l)),
    },
    {
      // N7: eticheta pe linie, fără nicio tăiere.
      nume: 'N7 eticheta fără tăiere', sens: 'fara-taiere', linia: 11, doc: d1,
      text: muta(r, (l, nr) => (nr >= 12 && nr <= 18 ? null : l)),
    },
  ];
}

// ---------------------------------------------------------------------------------------------------------------
// Cazul cel mai rău legal: biarcele la limită + rotunjirea postului pe arc.

const r3 = (v: number): number => Number((Math.round(v * 1000) / 1000).toFixed(3));
const f3 = (v: number): string => { const s = v.toFixed(3); return s === '-0.000' ? '0.000' : s; };
/** ADR 0033 §1: fitter-ul țintește 0,99 × 0,001. */
export const BIARC_LIMITA = 0.00099;

/** Abaterea maximă (eșantionată des, independent de poartă) a unui arc executat de GRBL față de cercul (C, ρ). */
export function abatereArc(m: Mutare, C: readonly [number, number], rho: number, n = 20000): number {
  const { unghi } = regulaArcGrbl(m);
  const cx = m.a[0] + (m.i ?? 0), cy = m.a[1] + (m.j ?? 0), r = Math.hypot(m.i ?? 0, m.j ?? 0);
  const u0 = Math.atan2(m.a[1] - cy, m.a[0] - cx);
  let mx = 0;
  for (let k = 0; k <= n; k++) {
    const u = u0 + (unghi * k) / n;
    mx = Math.max(mx, Math.abs(Math.hypot(cx + r * Math.cos(u) - C[0], cy + r * Math.sin(u) - C[1]) - rho));
  }
  return mx;
}

export type CelMaiRau = { readonly doc: DocV4O; readonly text: string; readonly abatere: number; readonly descriere: string };

/**
 * Căutarea: startul rotunjit S′ = (100, 100), startul exact cu ±0,00049 pe fiecare axă (se rotunjește la S′), centrul pe
 * o diagonală la raza r ∈ [20; 20,03), cercul tăiat ca două semicercuri G3 (S′ → E′ → S′). Postul A ia I / J din startul
 * rotunjit, B din cel exact. Conturul documentului e cercul cu raza r − `BIARC_LIMITA` (drumul stă la limita biarcelor),
 * pe linie, adâncimea 1. Întoarce programul cu abaterea cea mai mare.
 */
export function celMaiRauArc(): CelMaiRau {
  let rau: { abatere: number; C: [number, number]; rho: number; corp: string[]; descriere: string } | null = null;
  for (const post of ['A', 'B'] as const) {
    for (const sx of [1, -1]) {
      for (const sy of [1, -1]) {
        for (const hs of [1, -1]) {
          for (let k = 0; k < 400; k++) {
            const r = 20 + k * 0.0000731;
            const h = 0.00049 * hs;
            const Sp: [number, number] = [100, 100];
            const S: [number, number] = [Sp[0] - h * sx, Sp[1] - h * sy];
            const C: [number, number] = [S[0] - (r * sx) / Math.SQRT2, S[1] - (r * sy) / Math.SQRT2];
            const E: [number, number] = [2 * C[0] - S[0], 2 * C[1] - S[1]];
            const Ep: [number, number] = [r3(E[0]), r3(E[1])];
            const b1 = post === 'A' ? Sp : S, b2 = post === 'A' ? Ep : E;
            const I1 = r3(C[0] - b1[0]), J1 = r3(C[1] - b1[1]), I2 = r3(C[0] - b2[0]), J2 = r3(C[1] - b2[1]);
            const m1: Mutare = { cod: 3, linia: 0, startCunoscut: true, a: [Sp[0], Sp[1], -1], b: [Ep[0], Ep[1], -1], i: I1, j: J1 };
            const m2: Mutare = { cod: 3, linia: 0, startCunoscut: true, a: [Ep[0], Ep[1], -1], b: [Sp[0], Sp[1], -1], i: I2, j: J2 };
            const rho = r - BIARC_LIMITA;
            const d = Math.max(abatereArc(m1, C, rho, 2000), abatereArc(m2, C, rho, 2000));
            if (rau === null || d > rau.abatere) {
              rau = {
                abatere: d, C, rho, descriere: `post ${post}, r ${r.toFixed(7)}, centrul (${C[0].toFixed(7)}, ${C[1].toFixed(7)})`,
                corp: [
                  `G0 X${f3(Sp[0])} Y${f3(Sp[1])}`, 'G1 Z-1.000 F300.0',
                  `G3 X${f3(Ep[0])} Y${f3(Ep[1])} I${f3(I1)} J${f3(J1)} F1000.0`, `G3 X${f3(Sp[0])} Y${f3(Sp[1])} I${f3(I2)} J${f3(J2)}`,
                ],
              };
            }
          }
        }
      }
    }
  }
  const x = rau!;
  const stoc: Stoc = { latime: 250, inaltime: 250, grosime: 18 };
  const doc = simple(stoc, [{ id: 'c', forma: cerc(x.rho), x: x.C[0], y: x.C[1], laturi: ['pe-linie'], adancime: 1 }], { diametru: 6, pas: 1 });
  const text = program(['(c/c: cerc, pe-linie, 1 mm)', ...x.corp], stoc);
  // Abaterea, remăsurată des pe programul scris (independent de poartă).
  const C = x.C;
  const ms: Mutare[] = [];
  let a: [number, number, number] = [0, 0, 0];
  for (const l of x.corp) {
    const v = (lit: string): number | undefined => { const m = new RegExp(`${lit}(-?\\d+\\.\\d+)`).exec(l); return m ? Number(m[1]) : undefined; };
    const b: [number, number, number] = [v('X') ?? a[0], v('Y') ?? a[1], v('Z') ?? a[2]];
    if (l.startsWith('G3')) ms.push({ cod: 3, linia: 0, startCunoscut: true, a, b, i: v('I')!, j: v('J')! });
    a = b;
  }
  const abatere = Math.max(...ms.map((m) => abatereArc(m, C, x.rho)));
  return { doc, text, abatere, descriere: x.descriere };
}
