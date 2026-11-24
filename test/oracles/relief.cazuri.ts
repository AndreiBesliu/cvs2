/**
 * Cazurile pe hârtie ale oracolului reliefului (ADR 0311). Valorile așteptate sunt scrise din contract, de mână; amprentele,
 * calculate separat, cu Python (`hashlib`, `struct.pack('<dd', …)`, `'<65536H'`), nu cu oracolul. Un caz nou = imaginea sau
 * valorile lui aici, cu rezultatul pe hârtie.
 */
import type { ModO, OptiuniReliefO, SursaO } from './relief.ts';

const G = NaN;

export type CazImagineO = {
  readonly nume: string;
  readonly latime: number;
  readonly inaltime: number;
  /** Pixelii, rând cu rând de sus în jos, ca [R, G, B, A]. */
  readonly pixeli: readonly (readonly [number, number, number, number])[];
  readonly optiuni: OptiuniReliefO;
  /** Înălțimile așteptate, j · nx + i, cu j în sus (NaN = gol), înainte de rotunjirea la Float32. */
  readonly asteptat: readonly number[];
};

const opt = (sursa: SursaO, inaltime: number, sigma = 0, baza = 0, albSus = true): OptiuniReliefO => ({ sursa, sigma, inaltime, baza, albSus });
const gri = (v: number): readonly [number, number, number, number] => [v, v, v, 255];

export const CAZURI_IMAGINE: readonly CazImagineO[] = [
  {
    nume: 'luminanța Rec. 709',
    latime: 4, inaltime: 1,
    pixeli: [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255], [10, 20, 30, 255]],
    optiuni: opt('l', 10),
    // 2126 · 255 / 2 550 000 = 0,2126; 7152 · 255 / … = 0,7152; 0,0722; (21 260 + 143 040 + 21 660) / 2 550 000.
    asteptat: [2.126, 7.152, 0.722, (185_960 / 2_550_000) * 10],
  },
  {
    nume: 'canalul roșu',
    latime: 4, inaltime: 1,
    pixeli: [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255], [10, 20, 30, 255]],
    optiuni: opt('r', 10),
    asteptat: [10, 0, 0, (10 / 255) * 10],
  },
  {
    nume: 'canalul albastru',
    latime: 2, inaltime: 1,
    pixeli: [[255, 0, 51, 255], [0, 255, 204, 255]],
    optiuni: opt('b', 5),
    asteptat: [1, 4],
  },
  {
    nume: 'alfa: sub 128 e gol',
    latime: 2, inaltime: 1,
    pixeli: [[255, 255, 255, 127], [255, 255, 255, 128]],
    optiuni: opt('l', 5),
    asteptat: [G, 5],
  },
  {
    nume: 'orientarea: rândul de sus al imaginii e j = ny − 1',
    latime: 2, inaltime: 2,
    pixeli: [gri(0), gri(255), gri(51), gri(102)],
    optiuni: opt('r', 10),
    // jos (j = 0): 51 / 255 = 0,2 → 2; 102 / 255 = 0,4 → 4. Sus (j = 1): 0 și 10.
    asteptat: [2, 4, 0, 10],
  },
  {
    nume: 'negru sus, cu baza',
    latime: 2, inaltime: 2,
    pixeli: [gri(0), gri(255), gri(51), gri(102)],
    optiuni: opt('r', 10, 0, 1, false),
    // h = 1 + (1 − g) · 10: jos 9 și 7, sus 11 și 1.
    asteptat: [9, 7, 11, 1],
  },
  {
    nume: 'netezirea pe un rând, σ = 0,5 (nucleul [1, 2, 1] / 4)',
    latime: 3, inaltime: 1,
    pixeli: [gri(0), gri(255), gri(0)],
    optiuni: opt('r', 12, 0.5),
    // i = 0: (½ · 0 + ¼ · 1) / ¾ = ⅓; i = 1: ½; i = 2: ⅓. Pe j nu are vecini. · 12.
    asteptat: [4, 6, 4],
  },
  {
    nume: 'netezirea sare golul și nu-l umple',
    latime: 3, inaltime: 1,
    pixeli: [gri(0), [255, 255, 255, 0], gri(255)],
    optiuni: opt('r', 12, 0.5),
    // i = 0: doar el (vecinul din dreapta e gol) → 0; i = 1 rămâne gol; i = 2: doar el → 1.
    asteptat: [0, G, 12],
  },
  {
    nume: 'netezirea în două treceri, 3 × 3, un singur punct alb',
    latime: 3, inaltime: 3,
    pixeli: [gri(0), gri(0), gri(0), gri(0), gri(255), gri(0), gri(0), gri(0), gri(0)],
    optiuni: opt('r', 36, 0.5),
    // Pe i, rândul din mijloc devine ⅓, ½, ⅓; pe j: colțurile ¼ · ⅓ / ¾ = 1/9, laturile 1/6, centrul ¼. · 36.
    asteptat: [4, 6, 4, 6, 9, 6, 4, 6, 4],
  },
];

export type CazDalaO = {
  readonly nume: string;
  /** Valorile negoale ale dalei, după indicele k = b · 256 + a; restul sunt goale (sau toate, cu `toate`). */
  readonly valori: Readonly<Record<number, number>>;
  readonly toate?: number;
  readonly asteptat:
    | { readonly fel: 'gol' }
    | { readonly fel: 'constanta'; readonly m: number }
    | {
      readonly fel: 'coduri'; readonly m: number; readonly p: number;
      readonly coduri: Readonly<Record<number, number>>;
      /** Valorile citite, pe indicii dați. */
      readonly citite: Readonly<Record<number, number>>;
      /** Amprenta octeților, din Python. */
      readonly amprenta: string;
    };
};

export const CAZURI_DALA: readonly CazDalaO[] = [
  {
    nume: 'coduri: m = 0, p = 1/1024, round la jumătate în sus, golul 65 535',
    valori: { 0: 0, 1: 1.5, 2: 63.998046875, 3: 0.00048828125, 4: Math.fround(0.0004) },
    asteptat: {
      fel: 'coduri', m: 0, p: 1 / 1024,
      // 1,5 · 1024 = 1536; 65 534 / 1024 → 65 534; 0,5 → 1 (round); 0,4096 → 0.
      coduri: { 0: 0, 1: 1536, 2: 65_534, 3: 1, 4: 0, 5: 65_535, 65_535: 65_535 },
      citite: { 0: 0, 1: 1.5, 2: 63.998046875, 3: 0.0009765625, 4: 0, 5: G },
      amprenta: 'a99bb8c666ddd875a262b9c57cf19afa289a4b1d52f36de8e847c55a697b5f51',
    },
  },
  { nume: 'constanta', valori: {}, toate: 2.5, asteptat: { fel: 'constanta', m: 2.5 } },
  { nume: 'goală', valori: {}, asteptat: { fel: 'gol' } },
  {
    nume: 'aceeași valoare, cu goluri: coduri cu p = 0',
    valori: { 0: 1.5 },
    asteptat: {
      fel: 'coduri', m: 1.5, p: 0, coduri: { 0: 0, 1: 65_535 }, citite: { 0: 1.5, 1: G },
      amprenta: '5c0712d0d0fa487181ec9d4b70ce7a1e527f66200181dcaab997df2a3c53d650',
    },
  },
];

/** Harta unei grile 2 × 1, [1,5; gol]: o singură dală, cea de mai sus; textul și amprenta, din Python. */
export const HARTA_2X1 = {
  nx: 2, ny: 1, valori: [1.5, G],
  text: '{"dale":["5c0712d0d0fa487181ec9d4b70ce7a1e527f66200181dcaab997df2a3c53d650"],"nx":2,"ny":1,"v":1}',
  amprenta: '30e429aae9e9ca5d7eaad5e50eddc2c7c0c24a4478dd7aee416a53730f87b08a',
} as const;

/**
 * Compunerea pe 4 celule, pe hârtie (§7), de jos în sus, de la R = 0:
 * - celula 0: +1 → 1; max(1, 3) = 3; 3 − 0,5 = 2,5; · 2 = 5; „jos” gol → 5;
 * - celula 1: +2 → 2; max(2, 1) = 2; „scade” gol; · 2 = 4; „înlocuiește” ascuns; min(4, 3) = 3;
 * - celula 2: „adună” gol → 0; max(0, 5) = 5; 5 − 1 = 4; · 2 = 8; min(8, 10) = 8;
 * - celula 3: +4 → 4; „înalt” gol; 4 − 1 = 3; · 0,5 = 1,5; min(1,5, 1) = 1.
 */
export const COMPUNERE_HARTIE: { readonly straturi: readonly { readonly mod: ModO; readonly vizibil: boolean; readonly valori: readonly number[] }[]; readonly asteptat: readonly number[] } = {
  straturi: [
    { mod: 'aduna', vizibil: true, valori: [1, 2, G, 4] },
    { mod: 'inalt', vizibil: true, valori: [3, 1, 5, G] },
    { mod: 'scade', vizibil: true, valori: [0.5, G, 1, 1] },
    { mod: 'inmulteste', vizibil: true, valori: [2, 2, 2, 0.5] },
    { mod: 'inlocuieste', vizibil: false, valori: [G, 7, G, G] },
    { mod: 'jos', vizibil: true, valori: [G, 3, 10, 1] },
  ],
  asteptat: [5, 3, 8, 1],
};
