/**
 * Cazurile pe hârtie ale oracolului pereților drepți (ADR 0171): desenul (poligoane pe foaie, în mm), frezele plate, valorile
 * incrustației și ce trebuie să iasă, socotit aici din geometrie, nu din cod. R e raza celei mai mici freze a locașului, r a
 * celei mai mici a dopului, c jocul lateral, ρ = max(0, r − c):
 * - vârful locașului (colțul convex al desenului, cu unghiul α) se retrage pe bisectoare cu R / sin(α/2) − R;
 * - unghiul intrând (pana bazei, cu unghiul γ) se rotunjește cu ρ: peretele se mută în pană cu ρ / sin(γ/2) − ρ;
 * - jocul e c pe tot conturul; oprirea și spațiul rămas, după sprijin (pe fund: H; pe față: g; decupat: H).
 * `raze`: unde întâlnește peretele locașului raza din p pe direcția d, pe hârtie.
 */
import type { DesenO, PunctO } from './incrustatie.ts';

export type FrezaPlataCaz = { readonly numar: number; readonly diametru: number; readonly pasLateral: number };
export type RazaCaz = { readonly p: PunctO; readonly d: PunctO; readonly lungime: number; readonly asteptat: number; readonly ce: string };
export type CazDreapta = {
  readonly id: string;
  readonly desen: DesenO;
  readonly D: number; readonly pas: number; readonly c: number;
  readonly dop: 'ridicat' | 'decupat';
  readonly sprijin: 'fund' | 'fata';
  readonly H: number; readonly g: number; readonly margine: number;
  /** Frezele locașului: prima, apoi frezele de rest. */
  readonly locas: readonly FrezaPlataCaz[];
  /** Frezele dopului, dacă are altele. */
  readonly frezeDop?: readonly FrezaPlataCaz[];
  readonly raze: readonly RazaCaz[];
  readonly hartie: string;
};

const dreptunghi = (x: number, y: number, w: number, h: number): PunctO[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

/** Steaua cu 5 colțuri, cu vârful în sus, în sens trigonometric. */
export function stea(cx: number, cy: number, R: number, r: number): PunctO[] {
  const p: PunctO[] = [];
  for (let k = 0; k < 10; k++) {
    const u = Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 === 0 ? R : r;
    p.push([cx + q * Math.cos(u), cy + q * Math.sin(u)]);
  }
  return p;
}

/** Unghiul dintre a − v și b − v, în radiani. */
function unghi(a: PunctO, v: PunctO, b: PunctO): number {
  const ux = a[0] - v[0], uy = a[1] - v[1], wx = b[0] - v[0], wy = b[1] - v[1];
  return Math.acos((ux * wx + uy * wy) / (Math.hypot(ux, uy) * Math.hypot(wx, wy)));
}

/** Cât se retrage un colț de unghi `u` (radiani) rotunjit cu raza `r`, pe bisectoare. */
const retragere = (u: number, r: number): number => r / Math.sin(u / 2) - r;

const S1 = stea(40, 40, 12, 5);
const alfa = unghi(S1[9]!, S1[0]!, S1[1]!); // vârful, 40,55°
const gamma = unghi(S1[0]!, S1[1]!, S1[2]!); // pana bazei la unghiul intrând, 112,55°
const SQ = Math.SQRT2 - 1;
const L = (x: number, y: number): PunctO[] => [[x, y], [x + 16, y], [x + 16, y + 6], [x + 6, y + 6], [x + 6, y + 20], [x, y + 20]];
const F3 = { numar: 1, diametru: 3, pasLateral: 1.2 } as const;

export const CAZURI_DREAPTA: readonly CazDreapta[] = [
  {
    id: 'stea', desen: [S1], D: 6, pas: 3, c: 0.1, dop: 'ridicat', sprijin: 'fund', H: 2, g: 0.5, margine: 5, locas: [F3],
    raze: [
      { p: [40, 40], d: [0, 1], lungime: 12, asteptat: 12 - retragere(alfa, 1.5), ce: 'vârful de sus, retras cu R / sin(α/2) − R' },
      {
        p: [40, 40], d: [Math.cos((126 * Math.PI) / 180), Math.sin((126 * Math.PI) / 180)], lungime: 8, asteptat: 5 + retragere(gamma, 1.4),
        ce: 'unghiul intrând, rotunjit cu ρ = R − c = 1,4',
      },
    ],
    hartie: 'criteriul din prag: steaua cu raza 12 și 5, Ø3, adâncimea 6, jocul 0,1; vârful (40,55°) se retrage 2,828, unghiul intrând (112,55°) cu 0,284; dopul pe fund, h = D + H = 8',
  },
  {
    id: 'dreptunghi-fata', desen: [dreptunghi(20, 60, 20, 12)], D: 4, pas: 2, c: 0.1, dop: 'ridicat', sprijin: 'fata', H: 2, g: 0.5, margine: 5,
    locas: [{ numar: 1, diametru: 6, pasLateral: 2.4 }],
    raze: [{ p: [40, 72], d: [-1, -1], lungime: 3, asteptat: 3 * SQ, ce: 'colțul, rotunjit cu R3: 3·(√2 − 1) pe diagonală' }],
    hartie: 'dreptunghiul 20 × 12 cu Ø6: colțurile locașului R3, ale dopului R2,9; dopul pe față, h = D − g = 3,5, deci sub el rămân 0,5',
  },
  {
    id: 'L', desen: [L(60, 80)], D: 3, pas: 1.5, c: 0.1, dop: 'ridicat', sprijin: 'fund', H: 2, g: 0.5, margine: 5, locas: [F3],
    raze: [
      { p: [66, 86], d: [1, 1], lungime: 2, asteptat: 1.4 * SQ, ce: 'unghiul intrând, rotunjit cu ρ = 1,4: 1,4·(√2 − 1)' },
      { p: [76, 80], d: [-1, 1], lungime: 2, asteptat: 1.5 * SQ, ce: 'vârful piciorului, rotunjit cu R1,5' },
    ],
    hartie: 'un L, nesimetric față de verticală: dopul ridicat e oglindit pe X (un dop neoglindit nu s-ar potrivi); unghiul intrând R1,4, vârfurile R1,5',
  },
  {
    id: 'inel', desen: [dreptunghi(130, 20, 14, 14), dreptunghi(134, 24, 6, 6)], D: 3, pas: 1.5, c: 0.1, dop: 'ridicat', sprijin: 'fund', H: 2,
    g: 0.5, margine: 5, locas: [F3],
    raze: [
      { p: [134, 24], d: [1, 1], lungime: 2, asteptat: 1.4 * SQ, ce: 'colțul insulei (pana bazei), rotunjit cu ρ = 1,4' },
      { p: [130, 20], d: [1, 1], lungime: 2, asteptat: 1.5 * SQ, ce: 'colțul exterior, rotunjit cu R1,5' },
    ],
    hartie: 'o literă cu gol (pătratul în pătrat): insula de lemn rămâne în locaș, cu colțurile rotunjite cu ρ; dopul e un inel care o ocolește cu jocul c',
  },
  {
    id: 'decupat', desen: [L(60, 80)], D: 3, pas: 1.5, c: 0.1, dop: 'decupat', sprijin: 'fund', H: 2, g: 0.5, margine: 5, locas: [F3],
    raze: [{ p: [66, 86], d: [1, 1], lungime: 2, asteptat: 1.4 * SQ, ce: 'unghiul intrând, rotunjit cu ρ = 1,4' }],
    hartie: 'același L, cu dopul decupat prin placa lui de D + H = 5 mm, cu punți, neoglindit (intră fără întoarcere); iese 2 mm peste placă',
  },
  {
    id: 'freze-dop', desen: [L(60, 80)], D: 3, pas: 1.5, c: 0.1, dop: 'ridicat', sprijin: 'fund', H: 2, g: 0.5, margine: 5, locas: [F3],
    frezeDop: [{ numar: 2, diametru: 2, pasLateral: 0.8 }],
    raze: [
      { p: [66, 86], d: [1, 1], lungime: 2, asteptat: 0.9 * SQ, ce: 'unghiul intrând, rotunjit cu ρ = r − c = 1 − 0,1 = 0,9 (freza dopului, Ø2)' },
      { p: [76, 80], d: [-1, 1], lungime: 2, asteptat: 1.5 * SQ, ce: 'vârful, rotunjit cu R1,5 (freza locașului)' },
    ],
    hartie: 'frezele dopului ale lui (Ø2): locașul se închide cu raza frezei dopului minus jocul, deci unghiul dopului are exact R1, cât freza lui',
  },
];
