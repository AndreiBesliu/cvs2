/**
 * Cazurile pe hârtie ale oracolului buzunarului (felia 5.1↑b), cu ZERO importuri din `src/`: documentele (JSON-ul salvat,
 * v18), montajul exportului și valorile socotite pe hârtie, cu socoteala lângă fiecare. Proba
 * (`test/unit/buzunar.oracol.test.ts`) le trece prin ușă, le exportă cu aplicația, cere oracolului verdictul curat și
 * compară măsurile lui cu valorile de aici. Coordonatele sunt ale foii (stânga-jos, Y în sus); dreptunghiul are colțul
 * stânga-jos în (x, y), calea e închisă, cu vârfurile mutate cu (x, y).
 *
 * - `dreptunghi-100x60` (ADR 0069, Probele): Ø6, s = 2,4: inelele la d = 3 + 2,4·k cât 60 − 2d > 0, deci k = 0…11 (3 …
 *   29,4); cel mai adânc e (100 − 58,8) × (60 − 58,8) = 41,2 × 1,2, iar peretele 94 × 54. Trecerile: 6 mm în pași de 3.
 * - același, exportat cu originea în dreapta-sus și Z0 jos: montajul e o translație (ADR 0008), deci aceleași măsuri.
 * - `L-opozitie` (ADR 0069: „L-ul cu s = R în opoziție”): brațele de 32 mm (δ maxim 16 în ele), dar la îmbinare δ e mai
 *   mare: cercul tangent la cele două margini din afară și care trece prin vârful intrând (52, 52) are ρ√2 + ρ = 32√2, deci
 *   ρ = 32(2 − √2) = 18,745; inelele la 3, 6, …, 18 (cel de la 18, doar în colț); peretele = L-ul strâns cu 3:
 *   84 × 26 + 26 × 74 − 26² = 3 432, plus colțul de lângă vârful intrând, din pătratul de 3 × 3 fără sfertul de disc:
 *   9 − 9π/4; în opoziție, bucla e orară (aria negativă).
 * - `insula` (ADR 0073, Probele): dreptunghiul 100 × 60 cu insula 20 × 20 la mijloc, din altă piesă, aceeași adâncime: 8
 *   niveluri (3 … 19,8: golul de 40 mm dintre insulă și pereții laterali), 16 bucle (la 3, 5,4, 7,8 câte două, de la 10,2
 *   stânga și dreapta); bucla insulei la d e pătratul de 20 + 2d cu colțurile rotunjite cu d: (20 + 2d)² − d²(4 − π), orară.
 * - `canal-ingust`: un 60 × 40 cu un canal de 4 × 30 pe latura dreaptă, mai îngust decât freza de 6: canalul rămâne netăiat
 *   (peretele), iar inelul de lângă perete intră în gura lui pe arcele de rază 3 din jurul colțurilor (80, 38) și (80, 42),
 *   până la x = 80 − √5; aria lui: 54 × 34 + 2 ∫₀² (3 − √(9 − u²)) du = 1 836 + 12 − 2 (√5 + 4,5 · asin(2/3)). Cu freza de
 *   rest Ø3, canalul se golește: centrul ei ajunge la 110 − 1,5 = 108,5.
 * - `paralel-0`, `paralel-30` (ADR 0094, Probele): 80 × 40 cu Ø12, s = 4,8: zona centrului [26, 94] × [26, 54]; la 0°,
 *   liniile la y = 26 + 4,8·k (30,8 … 50); la 30°, y′ = −x·sin 30° + y·cos 30°, cu minimul zonei în (94, 26):
 *   y′ = −47 + 13√3, liniile la y′ + 4,8·k cât rămân sub maximul din (26, 54), −13 + 27√3: k = 1…12. Trecerea de profil e
 *   bucla zonei, 68 × 28 = 1 904, trigonometric.
 * - `coborare-*` (ADR 0076, Probele): 100 × 60 cu centrul în (90, 70), Ø6, pasul 3, unghiul atan 0,1: rampa și elicea au
 *   panta 0,1; zigzagul de 20 mm face ⌈3 / (20 · 0,1)⌉ = 2 rampe, deci panta 3 / 40 = 0,075; nicio coborâre verticală în
 *   material.
 * - `cerc-R20` (ADR 0069: „cercul R20 cu s = 3 dă cercurile 2, 5, …, 17”): inelele la d = 3, 6, …, 18, cercuri de rază
 *   20 − d, cu aria π(20 − d)².
 * - `cerc-R20-insula-R5` (ADR 0073: „cercul R20 cu insula R5, s = 3: coroanele 17 / 8 și 14 / 11”): coroana are 15 mm,
 *   deci δ maxim 7,5 și inelele la 3 și 6, fiecare cu cercul din afară (20 − d) și cel din jurul insulei (5 + d), orar.
 * - refuzurile: buzunarul de 4 mm cu freza de 6 (δ maxim 2 < 3), pasul lateral 3,5 > 3, liniile cu rampă, freza de rest cât
 *   cea dinainte.
 */
import type { Montaj } from './buzunar.ts';

type Rec = Record<string, unknown>;
type Cutie = readonly [number, number, number, number];
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const F = (numar: number, diametru: number): Rec => ({ numar, nume: `freza ${diametru}`, diametru });
const buzunar = (noduri: readonly string[], extra: Rec = {}): Rec => ({
  id: 'o', tip: 'buzunar', noduri, scula: F(1, 6), latura: 'interior', sens: 'urcare', adancime: 6, pas: 3, pasLateral: 2.4,
  urechi: null, rampa: null, intrari: null, colturi: null, ...extra,
});

type Forma = { readonly id: string; readonly forma: Rec; readonly x: number; readonly y: number };
const DR = (id: string, latime: number, inaltime: number, x: number, y: number): Forma => ({ id, forma: { tip: 'dreptunghi', latime, inaltime, razaColt: 0 }, x, y });
const CERC = (id: string, raza: number, x: number, y: number): Forma => ({ id, forma: { tip: 'cerc', raza }, x, y });
const CALE = (id: string, puncte: ReadonlyArray<readonly [number, number]>, x: number, y: number): Forma => ({
  id, forma: { tip: 'cale', inchis: true, varfuri: puncte.map(([px, py]) => ({ p: { x: px, y: py }, s: { tip: 'L' } })) }, x, y,
});
const piesa = (id: string, forme: readonly Forma[], operatii: readonly Rec[]): Rec => ({
  id,
  radacina: { tip: 'grup', id: `${id}-r`, matrice: { ...I }, copii: forme.map((f) => ({ tip: 'element', id: f.id, matrice: { ...I, e: f.x, f: f.y }, forma: f.forma })) },
  operatii,
});
const FOAIE = { latime: 300, inaltime: 200, grosime: 18 };
/** Documentul salvat (schema 18), cu fiecare piesă într-o instanță la (0, 0); eticheta unei tăieturi e `i-<piesă>/<element>`. */
const documentul = (piese: readonly Rec[]): Rec => ({
  schema: 18, rev: 1, piese, foi: [{ id: 'f1', stoc: { ...FOAIE }, instante: piese.map((p) => ({ id: `i-${String(p['id'])}`, piesa: p['id'], x: 0, y: 0, rotire: 0 })) }],
});

/** O buclă așteptată: nivelul (dacă se cere), aria cu semn și cutia (dacă se cere). */
export type BuclaAsteptata = { readonly d?: number; readonly aria: number; readonly cutie?: Cutie };

export type AsteptatBuzunar = {
  /** Eticheta bucății: `i-<piesă>/<element>` al conturului din afară. */
  readonly id: string;
  readonly treceri?: readonly number[];
  readonly niveluri?: readonly number[];
  readonly numarInele?: number;
  readonly inele?: readonly BuclaAsteptata[];
  readonly perete?: readonly BuclaAsteptata[];
  readonly bucleDePerete?: number;
  readonly linii?: readonly number[];
  readonly panta?: number;
  readonly plonjariInMaterial?: number;
  readonly rest?: ReadonlyArray<{ readonly numar: number; readonly cutie: Cutie }>;
};

export type CazBuzunar = {
  readonly id: string;
  readonly document: Rec;
  readonly montaj?: Montaj;
  /** Oracolul prezice un refuz al lucrării: aplicația trebuie să refuze, cu un motiv care se potrivește cu ăsta. */
  readonly refuz?: RegExp;
  readonly asteptat?: readonly AsteptatBuzunar[];
};

const DREPTUNGHI = documentul([piesa('p', [DR('a', 100, 60, 20, 20)], [buzunar(['a'])])]);
const NIVELURI_100X60 = Array.from({ length: 12 }, (_, k) => 3 + 2.4 * k);
const ASTEPTAT_100X60: AsteptatBuzunar = {
  id: 'i-p/a', treceri: [-3, -6], niveluri: NIVELURI_100X60, numarInele: 12, bucleDePerete: 2,
  inele: [{ d: 29.4, aria: 41.2 * 1.2, cutie: [49.4, 49.4, 90.6, 50.6] }, { d: 3, aria: 94 * 54, cutie: [23, 23, 117, 77] }],
  perete: [{ aria: 94 * 54, cutie: [23, 23, 117, 77] }],
};

const COLT = 9 - (9 * Math.PI) / 4;
const insulaLa = (d: number): number => -((20 + 2 * d) ** 2 - d * d * (4 - Math.PI));
const GURA = 1836 + 12 - 2 * (Math.sqrt(5) + 4.5 * Math.asin(2 / 3));
const CANAL: ReadonlyArray<readonly [number, number]> = [[0, 0], [60, 0], [60, 18], [90, 18], [90, 22], [60, 22], [60, 40], [0, 40]];
const PARALEL = (unghi: number): Rec => documentul([piesa('p', [DR('a', 80, 40, 20, 20)], [buzunar(['a'], {
  scula: F(1, 12), adancime: 10, pas: 5, pasLateral: 4.8, strategie: { fel: 'paralel', unghi },
})])]);
const Y_MIN_30 = -47 + 13 * Math.sqrt(3);
const UNGHI_01 = (Math.atan(0.1) * 180) / Math.PI;
const COBORARE = (coborare: Rec): Rec => documentul([piesa('p', [DR('a', 100, 60, 40, 40)], [buzunar(['a'], { coborare })])]);

export const CAZURI: readonly CazBuzunar[] = [
  { id: 'dreptunghi-100x60', document: DREPTUNGHI, asteptat: [ASTEPTAT_100X60] },
  { id: 'dreptunghi-100x60-dreapta-sus-z0-jos', document: DREPTUNGHI, montaj: { origine: 'dreapta-sus', z0: 'jos' }, asteptat: [ASTEPTAT_100X60] },
  {
    id: 'L-opozitie',
    document: documentul([piesa('p', [CALE('a', [[0, 0], [90, 0], [90, 32], [32, 32], [32, 80], [0, 80]], 20, 20)], [
      buzunar(['a'], { sens: 'opozitie', pasLateral: 3, adancime: 4, pas: 2 }),
    ])]),
    asteptat: [{
      id: 'i-p/a', treceri: [-2, -4], niveluri: [3, 6, 9, 12, 15, 18], numarInele: 6, bucleDePerete: 2,
      perete: [{ aria: -(84 * 26 + 26 * 74 - 26 * 26 + COLT), cutie: [23, 23, 107, 97] }],
    }],
  },
  {
    id: 'insula',
    document: documentul([
      piesa('p', [DR('a', 100, 60, 20, 20)], [buzunar(['a'])]),
      piesa('i', [DR('i', 20, 20, 60, 40)], [buzunar(['i'])]),
    ]),
    asteptat: [{
      id: 'i-p/a', treceri: [-3, -6], niveluri: [3, 5.4, 7.8, 10.2, 12.6, 15, 17.4, 19.8], numarInele: 16, bucleDePerete: 4,
      inele: [
        { d: 5.4, aria: 89.2 * 49.2 }, { d: 5.4, aria: insulaLa(5.4) }, { d: 7.8, aria: 84.4 * 44.4 }, { d: 7.8, aria: insulaLa(7.8) },
      ],
      perete: [{ aria: 94 * 54, cutie: [23, 23, 117, 77] }, { aria: insulaLa(3), cutie: [57, 37, 83, 63] }],
    }],
  },
  {
    id: 'canal-ingust',
    document: documentul([piesa('p', [CALE('a', CANAL, 20, 20)], [buzunar(['a'], { adancime: 4, pas: 2 })])]),
    asteptat: [{
      id: 'i-p/a', treceri: [-2, -4], niveluri: [3, 5.4, 7.8, 10.2, 12.6, 15, 17.4, 19.8], bucleDePerete: 2,
      perete: [{ aria: GURA, cutie: [23, 23, 80 - Math.sqrt(5), 57] }],
    }],
  },
  {
    id: 'canal-ingust-rest',
    document: documentul([piesa('p', [CALE('a', CANAL, 20, 20)], [buzunar(['a'], { adancime: 4, pas: 2, rest: [{ scula: F(2, 3), pasLateral: 1.2 }] })])]),
    asteptat: [{ id: 'i-p/a', treceri: [-2, -4], perete: [{ aria: GURA }], rest: [{ numar: 2, cutie: [21.5, 21.5, 108.5, 58.5] }] }],
  },
  {
    id: 'paralel-0',
    document: PARALEL(0),
    asteptat: [{
      id: 'i-p/a', treceri: [-5, -10], linii: [30.8, 35.6, 40.4, 45.2, 50], bucleDePerete: 2, perete: [{ aria: 68 * 28, cutie: [26, 26, 94, 54] }],
    }],
  },
  {
    id: 'paralel-30',
    document: PARALEL(30),
    asteptat: [{
      id: 'i-p/a', treceri: [-5, -10], linii: Array.from({ length: 12 }, (_, k) => Y_MIN_30 + 4.8 * (k + 1)), bucleDePerete: 2,
      perete: [{ aria: 68 * 28, cutie: [26, 26, 94, 54] }],
    }],
  },
  { id: 'coborare-rampa', document: COBORARE({ fel: 'rampa', unghi: UNGHI_01 }), asteptat: [{ id: 'i-p/a', treceri: [-3, -6], panta: 0.1, plonjariInMaterial: 0 }] },
  {
    id: 'coborare-zigzag', document: COBORARE({ fel: 'zigzag', unghi: UNGHI_01, lungime: 20 }),
    asteptat: [{ id: 'i-p/a', treceri: [-3, -6], panta: 3 / 40, plonjariInMaterial: 0 }],
  },
  { id: 'coborare-elice', document: COBORARE({ fel: 'elice', unghi: UNGHI_01, raza: 3 }), asteptat: [{ id: 'i-p/a', treceri: [-3, -6], panta: 0.1, plonjariInMaterial: 0 }] },
  {
    id: 'cerc-R20',
    document: documentul([piesa('p', [CERC('a', 20, 100, 100)], [buzunar(['a'], { pasLateral: 3 })])]),
    asteptat: [{
      id: 'i-p/a', treceri: [-3, -6], niveluri: [3, 6, 9, 12, 15, 18], numarInele: 6,
      inele: [2, 5, 8, 11, 14, 17].map((r) => ({ d: 20 - r, aria: Math.PI * r * r })),
      perete: [{ aria: Math.PI * 17 * 17, cutie: [83, 83, 117, 117] }],
    }],
  },
  {
    id: 'cerc-R20-insula-R5',
    document: documentul([
      piesa('p', [CERC('a', 20, 100, 100)], [buzunar(['a'], { pasLateral: 3 })]),
      piesa('i', [CERC('i', 5, 100, 100)], [buzunar(['i'])]),
    ]),
    asteptat: [{
      id: 'i-p/a', treceri: [-3, -6], niveluri: [3, 6], numarInele: 4,
      inele: [{ d: 3, aria: Math.PI * 17 * 17 }, { d: 3, aria: -Math.PI * 8 * 8 }, { d: 6, aria: Math.PI * 14 * 14 }, { d: 6, aria: -Math.PI * 11 * 11 }],
      perete: [{ aria: Math.PI * 17 * 17 }, { aria: -Math.PI * 8 * 8, cutie: [92, 92, 108, 108] }],
    }],
  },
  { id: 'refuz-prea-ingust', document: documentul([piesa('p', [DR('a', 4, 30, 20, 20)], [buzunar(['a'])])]), refuz: /încape/ },
  { id: 'refuz-pas-peste-raza', document: documentul([piesa('p', [DR('a', 60, 40, 20, 20)], [buzunar(['a'], { pasLateral: 3.5 })])]), refuz: /pasul lateral/ },
  {
    id: 'refuz-linii-cu-rampa',
    document: documentul([piesa('p', [DR('a', 60, 40, 20, 20)], [buzunar(['a'], { strategie: { fel: 'paralel', unghi: 0 }, coborare: { fel: 'rampa', unghi: 3 } })])]),
    refuz: /plonjare/,
  },
  {
    id: 'refuz-rest-cat-freza',
    document: documentul([piesa('p', [DR('a', 60, 40, 20, 20)], [buzunar(['a'], { rest: [{ scula: F(2, 6), pasLateral: 2 }] })])]),
    refuz: /mai mică/,
  },
];
