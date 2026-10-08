/**
 * CAZURILE oracolului documentului v2 (ADR 0024), cu ZERO importuri din `src/`:
 * - `CAZURI_HARTIE`: documente v2 cu punctele în lume calculate de mână, pe hârtie, scrise ca numere (nu calculate
 *   aici). Coordonatele sunt întregi sau puteri ale lui 2, ca egalitatea să fie exactă (`===`);
 * - `MIGRARI_HARTIE`: documente v1 cu documentul v2 cerut de contract, scris de mână;
 * - `CORPUS_V1`: documente v1 valide, scrise de mână (capcanele) și generate cu un PRNG propriu, determinist;
 * - `REFUZATE_V1`: documente v1 pe care ușa le refuză (margini, formă, ciocniri, adâncime, schema 1), fiecare cu
 *   singura categorie pe care o raportează `verificaV1`;
 * - `OTRAVURI_V2`: documente v2 nevalide, fiecare cu singura categorie pe care trebuie s-o raporteze oracolul;
 * - `VALIDE_DIFICILE`: documente v2 valide care seamănă cu niște otrăvuri.
 */
import type {
  CategorieO, DocV1O, DocV2O, ElementO, ElementV1O, FoaieO, GrupO, InstantaO, Liber, MatriceO, NodO, PiesaO, PunctO,
} from './document.ts';

type MatriceScrisa = { -readonly [K in keyof MatriceO]: number };

/** Liste imbricate pe `k` niveluri: `adanc(1)` = `[]`, `adanc(2)` = `[[]]`. */
const adanc = (k: number): unknown[] => {
  let x: unknown[] = [];
  for (let i = 1; i < k; i++) x = [x];
  return x;
};

// ---------------------------------------------------------------------------------------------------------------
// Constructori mici: fiecare apel dă obiecte noi, ca nimic să nu fie împărțit între documente.

const M = (a: number, b: number, c: number, d: number, e: number, f: number): MatriceO => ({ a, b, c, d, e, f });
const I = (): MatriceO => M(1, 0, 0, 1, 0, 0);
const T = (e: number, f: number): MatriceO => M(1, 0, 0, 1, e, f);
const dr = (latime = 40, inaltime = 20, razaColt = 0): Liber => ({ tip: 'dreptunghi', latime, inaltime, razaColt });
const cerc = (raza = 5): Liber => ({ tip: 'cerc', raza });
const grup = (id: string, matrice: MatriceO, copii: NodO[]): GrupO => ({ tip: 'grup', id, matrice, copii });
const el = (id: string, matrice: MatriceO, forma: Liber = dr()): ElementO => ({ tip: 'element', id, forma, matrice });
const piesa = (id: string, radacina: NodO): PiesaO => ({ id, radacina });
const inst = (id: string, p: string, x: number, y: number, rotire: number): InstantaO => ({ id, piesa: p, x, y, rotire });
const foaie = (id: string, instante: InstantaO[]): FoaieO => ({
  id, stoc: { latime: 2000, inaltime: 1000, grosime: 18 }, instante,
});
const doc = (piese: PiesaO[], foi: FoaieO[]): DocV2O => ({ schema: 2, rev: 0, piese, foi });

// ---------------------------------------------------------------------------------------------------------------
// Pe hârtie.

export type PunctHartie = { readonly idLume: string; readonly punctLocal: PunctO; readonly punctLume: PunctO };
export type CazHartie = {
  readonly nume: string;
  readonly doc: DocV2O;
  readonly indexFoaie: number;
  /** Toate elementele în lume ale foii, în ordine. */
  readonly ordine: readonly string[];
  readonly puncte: readonly PunctHartie[];
};

/** Un punct: (xl, yl) în coordonatele elementului ajunge în (xw, yw) pe foaie. */
const P = (idLume: string, xl: number, yl: number, xw: number, yw: number): PunctHartie => ({
  idLume, punctLocal: { x: xl, y: yl }, punctLume: { x: xw, y: yw },
});

const docH13 = (): DocV2O => doc(
  [piesa('p1', el('r', M(3, 0, 0, 0.25, 1, 1))), piesa('p2', el('r', I(), cerc()))],
  [
    foaie('fa', [inst('i1', 'p1', 0, 0, 0)]),
    foaie('fb', []),
    foaie('fc', [inst('i2', 'p1', 0, 0, 0), inst('i3', 'p2', 50, 50, 270), inst('i4', 'p1', -100, 8, 90)]),
  ],
);

/** Exact la margini (precizarea 5): totul la limită, nimic peste. */
const docLaMargini = (): DocV2O => doc(
  [
    piesa('p1', el('r1', M(10_000, -10_000, -10_000, 10_000, 10_000_000, -10_000_000))),
    piesa('p2', grup('g1', T(5_000_000, -5_000_000), [grup('g2', M(100, 0, 0, 100, 0, 0), [el('r2', M(100, 0, 0, -100, 50_000, 0))])])),
  ],
  [foaie('f1', [inst('i1', 'p1', 10_000_000, -10_000_000, 0), inst('i2', 'p2', -10_000_000, 10_000_000, 90)])],
);

/** Marginile sunt ale matricei COMPUSE față de rădăcină, nu ale celei locale. */
const docSubParinte = (): DocV2O => doc(
  [piesa('p1', grup('g', M(1 / 1024, 0, 0, 1 / 1024, 0, 0), [el('e', M(16_384, 0, 0, 16_384, 10_240_000, 0))]))],
  [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
);

const docH08 = (): DocV2O => doc(
  [piesa('p1', el('e1', I())), piesa('p2', grup('g1', T(5, 5), [el('e2', M(2, 0, 0, 2, 0, 0))]))],
  [
    foaie('f1', [inst('i1', 'p1', 0, 0, 0)]),
    foaie('f2', [inst('i2', 'p2', 10, 10, 270), inst('i3', 'p1', 300, 300, 0)]),
  ],
);

export const CAZURI_HARTIE: readonly CazHartie[] = [
  {
    // (x, y) → (x + 100, y + 50).
    nume: 'H01 rotire 0: doar translația instanței',
    doc: doc([piesa('p1', el('e1', I()))], [foaie('f1', [inst('i1', 'p1', 100, 50, 0)])]),
    indexFoaie: 0,
    ordine: ['i1/e1'],
    puncte: [P('i1/e1', 0, 0, 100, 50), P('i1/e1', 10, 20, 110, 70)],
  },
  {
    // Rotire 90: (x, y) → (−y, x), apoi + (100, 50).
    nume: 'H02 rotire 90 pe instanță',
    doc: doc([piesa('p1', el('e1', I()))], [foaie('f1', [inst('i1', 'p1', 100, 50, 90)])]),
    indexFoaie: 0,
    ordine: ['i1/e1'],
    puncte: [P('i1/e1', 0, 0, 100, 50), P('i1/e1', 10, 20, 80, 60), P('i1/e1', 30, 0, 100, 80)],
  },
  {
    // Rotire 180: (x, y) → (−x, −y), apoi + (100, 50).
    nume: 'H03 rotire 180 pe instanță',
    doc: doc([piesa('p1', el('e1', I()))], [foaie('f1', [inst('i1', 'p1', 100, 50, 180)])]),
    indexFoaie: 0,
    ordine: ['i1/e1'],
    puncte: [P('i1/e1', 10, 20, 90, 30), P('i1/e1', 0, 5, 100, 45)],
  },
  {
    // Rotire 270: (x, y) → (y, −x), apoi + (100, 50).
    nume: 'H04 rotire 270 pe instanță',
    doc: doc([piesa('p1', el('e1', I()))], [foaie('f1', [inst('i1', 'p1', 100, 50, 270)])]),
    indexFoaie: 0,
    ordine: ['i1/e1'],
    puncte: [P('i1/e1', 10, 20, 120, 40), P('i1/e1', 7, 0, 100, 43)],
  },
  {
    // Elementul: (2x + 5, 3y + 7); (1, 1) → (7, 10) → rotire 90: (−10, 7) → + (1000, 0).
    nume: 'H05 matricea elementului: scalare neuniformă și translație, sub rotire 90',
    doc: doc([piesa('p1', el('e1', M(2, 0, 0, 3, 5, 7)))], [foaie('f1', [inst('i1', 'p1', 1000, 0, 90)])]),
    indexFoaie: 0,
    ordine: ['i1/e1'],
    puncte: [P('i1/e1', 1, 1, 990, 7), P('i1/e1', 0, 0, 993, 5)],
  },
  {
    // (1, 1): e1 → (1, 3); g3 (oglindire + 3) → (2, 3); g2 (rotire 90) → (−3, 2); g1 → (7, 2); instanța → (107, 202).
    nume: 'H06 trei grupuri: translație, rotire 90, oglindire (a: −1)',
    doc: doc(
      [piesa('p1', grup('g1', T(10, 0), [grup('g2', M(0, 1, -1, 0, 0, 0), [grup('g3', M(-1, 0, 0, 1, 3, 0), [el('e1', T(0, 2))])])]))],
      [foaie('f1', [inst('i1', 'p1', 100, 200, 0)])],
    ),
    indexFoaie: 0,
    ordine: ['i1/e1'],
    puncte: [P('i1/e1', 1, 1, 107, 202), P('i1/e1', 0, 0, 108, 203), P('i1/e1', 2, -1, 109, 201)],
  },
  {
    // a = (10, 0) și b = (0, 10) în piesă; i2 le rotește cu 90, i3 cu 180.
    nume: 'H07 trei instanțe ale aceleiași piese pe o foaie (0, 90, 180)',
    doc: doc(
      [piesa('p1', grup('g', I(), [el('a', T(10, 0), cerc()), el('b', T(0, 10))]))],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0), inst('i2', 'p1', 100, 0, 90), inst('i3', 'p1', 0, 100, 180)])],
    ),
    indexFoaie: 0,
    ordine: ['i1/a', 'i1/b', 'i2/a', 'i2/b', 'i3/a', 'i3/b'],
    puncte: [
      P('i1/a', 0, 0, 10, 0), P('i1/b', 0, 0, 0, 10),
      P('i2/a', 0, 0, 100, 10), P('i2/b', 0, 0, 90, 0), P('i2/a', 1, 2, 98, 11),
      P('i3/a', 0, 0, -10, 100), P('i3/b', 0, 0, 0, 90),
    ],
  },
  {
    // i2/e2, (1, 2): e2 → (2, 4); g1 → (7, 9); rotire 270 → (9, −7); + (10, 10) → (19, 3).
    nume: 'H08 a doua foaie (indexFoaie 1)',
    doc: docH08(),
    indexFoaie: 1,
    ordine: ['i2/e2', 'i3/e1'],
    puncte: [P('i2/e2', 1, 2, 19, 3), P('i3/e1', 1, 2, 301, 302)],
  },
  {
    nume: 'H08b prima foaie a aceluiași document nu vede foaia a doua',
    doc: docH08(),
    indexFoaie: 0,
    ordine: ['i1/e1'],
    puncte: [P('i1/e1', 1, 2, 1, 2)],
  },
  {
    // (6, 2): e1 (oglindire Y) → (6, −2); g1 (0,5 × 4) → (3, −8); rotire 90 → (8, 3); + (20, 30) → (28, 33).
    nume: 'H09 scalare neuniformă pe grup, oglindire pe element, rotire 90',
    doc: doc(
      [piesa('p1', grup('g1', M(0.5, 0, 0, 4, 0, 0), [el('e1', M(1, 0, 0, -1, 0, 0))]))],
      [foaie('f1', [inst('i1', 'p1', 20, 30, 90)])],
    ),
    indexFoaie: 0,
    ordine: ['i1/e1'],
    puncte: [P('i1/e1', 6, 2, 28, 33), P('i1/e1', -4, 1, 24, 28)],
  },
  {
    // (1, 1): e1 (forfecare x + 2y) → (3, 1); g3 → (9, 1); g2 → (6, 1); g1 (rotire 270, + (0, 10)) → (1, 4);
    // rotire 180 → (−1, −4); + (50, 60) → (49, 56).
    nume: 'H10 patru niveluri: rotire 270, translație, scalare, forfecare; instanța la 180',
    doc: doc(
      [piesa('p1', grup('g1', M(0, -1, 1, 0, 0, 10), [grup('g2', T(-3, 0), [grup('g3', M(3, 0, 0, 1, 0, 0), [el('e1', M(1, 0, 2, 1, 0, 0))])])]))],
      [foaie('f1', [inst('i9', 'p1', 50, 60, 180)])],
    ),
    indexFoaie: 0,
    ordine: ['i9/e1'],
    puncte: [P('i9/e1', 1, 1, 49, 56), P('i9/e1', 0, 2, 48, 59)],
  },
  {
    // Preordinea: n5, n3, n1, n4, n2 (nu după id, nu pe niveluri, nu invers). Instanțele: z9, apoi a1 (nu după id).
    nume: 'H11 ordinea: preordine în piesă, instanțele în ordinea foii',
    doc: doc(
      [
        piesa('p0', el('k', I())),
        piesa('pZ', grup('G0', I(), [
          el('n5', T(1, 0)),
          grup('G1', T(0, 10), [el('n3', T(2, 0)), grup('G2', T(0, 100), [el('n1', T(3, 0))]), el('n4', T(4, 0))]),
          el('n2', T(5, 0)),
        ])),
      ],
      [foaie('f1', [inst('z9', 'pZ', 0, 0, 0), inst('a1', 'p0', 1000, 0, 0)])],
    ),
    indexFoaie: 0,
    ordine: ['z9/n5', 'z9/n3', 'z9/n1', 'z9/n4', 'z9/n2', 'a1/k'],
    puncte: [
      P('z9/n5', 0, 0, 1, 0), P('z9/n3', 0, 0, 2, 10), P('z9/n1', 0, 0, 3, 110), P('z9/n4', 0, 0, 4, 10),
      P('z9/n2', 0, 0, 5, 0), P('a1/k', 0, 0, 1000, 0),
    ],
  },
  {
    // (2, 3): e (oglindire X) → (−2, 3); g (rotire 180 + (10, 20)) → (12, 17); rotire 90 → (−17, 12); + (7, −3).
    nume: 'H12 oglindire pe element, rotire 180 scrisă ca matrice pe grup, instanța la 90',
    doc: doc(
      [piesa('p1', grup('g', M(-1, 0, 0, -1, 10, 20), [el('e', M(-1, 0, 0, 1, 0, 0))]))],
      [foaie('f1', [inst('i1', 'p1', 7, -3, 90)])],
    ),
    indexFoaie: 0,
    ordine: ['i1/e'],
    puncte: [P('i1/e', 2, 3, -10, 9), P('i1/e', 0, 0, -13, 7)],
  },
  {
    // p1/r: (3x + 1, 0,25y + 1); (4, 8) → (13, 3). i3: p2 → (4, 8) → rotire 270 → (8, −4) → + (50, 50).
    // i4: (13, 3) → rotire 90 → (−3, 13) → + (−100, 8).
    nume: 'H13 a treia foaie: aceeași piesă de două ori, alta între ele, același id de nod în două piese',
    doc: docH13(),
    indexFoaie: 2,
    ordine: ['i2/r', 'i3/r', 'i4/r'],
    puncte: [P('i2/r', 4, 8, 13, 3), P('i3/r', 4, 8, 58, 46), P('i4/r', 4, 8, -103, 21)],
  },
  {
    nume: 'H14 o foaie fără instanțe nu are elemente în lume',
    doc: docH13(),
    indexFoaie: 1,
    ordine: [],
    puncte: [],
  },
  {
    // (1, 0): e → (2, 1); g4 → (−2, 1); g3 → (4, 2); g2 → (−2, 6); g1 → (−5, −2).
    nume: 'H15 cinci niveluri: rotiri 90 și 270 scrise ca matrice, cu oglindire',
    doc: doc(
      [piesa('p1', grup('g1', M(0, 1, -1, 0, 1, 0), [
        grup('g2', M(0, 1, -1, 0, 0, 2), [grup('g3', M(0, -1, 1, 0, 3, 0), [grup('g4', M(-1, 0, 0, 1, 0, 0), [el('e', T(1, 1))])])]),
      ]))],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ),
    indexFoaie: 0,
    ordine: ['i1/e'],
    puncte: [P('i1/e', 1, 0, -5, -2), P('i1/e', 0, 0, -5, -1)],
  },
  {
    // (1, 1): e1 → (0,625; 0,5); rotire 90 → (−0,5; 0,625); + (0,5; −0,25) → (0; 0,375).
    nume: 'H16 coordonate fracționare exacte (puteri ale lui 2)',
    doc: doc([piesa('p1', el('e1', M(0.5, 0, 0, 0.5, 0.125, 0)))], [foaie('f1', [inst('i1', 'p1', 0.5, -0.25, 90)])]),
    indexFoaie: 0,
    ordine: ['i1/e1'],
    puncte: [P('i1/e1', 1, 1, 0, 0.375), P('i1/e1', 2, -4, 2.5, 0.875)],
  },
  {
    // Instanța „b” pune piesa „a”, iar instanța „a” piesa „b”: piesa se caută după `piesa`, nu după id-ul instanței.
    nume: 'H17 id-ul instanței e id-ul altei piese',
    doc: doc(
      [piesa('a', el('ea', T(1, 0))), piesa('b', el('eb', T(0, 1)))],
      [foaie('f1', [inst('b', 'a', 0, 0, 0), inst('a', 'b', 10, 10, 0)])],
    ),
    indexFoaie: 0,
    ordine: ['b/ea', 'a/eb'],
    puncte: [P('b/ea', 0, 0, 1, 0), P('a/eb', 0, 0, 10, 11)],
  },
  {
    // r1: (1, 0) → (10 000 + 10 000 000, −10 000 − 10 000 000); + (10 000 000, −10 000 000).
    // r2, compusă față de rădăcină: (10 000, 0, 0, −10 000, 10 000 000, −5 000 000); (1, 1) → (10 010 000, −5 010 000);
    // rotire 90 → (5 010 000, 10 010 000); + (−10 000 000, 10 000 000).
    nume: 'H18 exact la margini: coeficienți ±10 000, translații compuse ±10 000 000, x și y ±10 000 000',
    doc: docLaMargini(),
    indexFoaie: 0,
    ordine: ['i1/r1', 'i2/r2'],
    puncte: [
      P('i1/r1', 1, 0, 20_010_000, -20_010_000), P('i1/r1', 0, 1, 19_990_000, -19_990_000),
      P('i2/r2', 1, 1, -4_990_000, 20_010_000),
    ],
  },
  {
    // e: (1, 1) → (16 384 + 10 240 000, 16 384); g (1/1024) → (10 016, 16).
    nume: 'H19 matrice locală peste margini (16 384; 10 240 000), compusă în margini sub un părinte de 1/1024',
    doc: docSubParinte(),
    indexFoaie: 0,
    ordine: ['i1/e'],
    puncte: [P('i1/e', 1, 1, 10_016, 16), P('i1/e', 0, 0, 10_000, 0)],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Migrări pe hârtie: documentul v2 scris de mână, din textul contractului.

export const MIGRARI_HARTIE: ReadonlyArray<{ readonly nume: string; readonly v1: DocV1O; readonly v2: Liber }> = [
  {
    nume: 'M01 gol',
    v1: { schema: 1, rev: 0, foaie: { latime: 100, inaltime: 100, grosime: 10 }, elemente: [] },
    v2: { schema: 2, rev: 0, piese: [], foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 10 }, instante: [] }] },
  },
  {
    nume: 'M02 două elemente, nume, câmpuri necunoscute pe toate nivelurile',
    v1: {
      schema: 1, rev: 7, autor: 'A',
      foaie: { latime: 600, inaltime: 400, grosime: 18, material: 'MDF' },
      elemente: [
        { id: 'a', nume: 'Raft', forma: { tip: 'dreptunghi', latime: 100, inaltime: 50, razaColt: 5 }, matrice: M(0, 1, -1, 0, 30, 40), strat: 'sus' },
        { id: 'b', forma: { tip: 'cerc', raza: 10 }, matrice: M(1, 0, 0, 1, -5, 0) },
      ],
    },
    v2: {
      schema: 2, rev: 7, autor: 'A',
      piese: [
        {
          id: 'a', nume: 'Raft',
          radacina: {
            tip: 'element', id: 'a', forma: { tip: 'dreptunghi', latime: 100, inaltime: 50, razaColt: 5 },
            matrice: { a: 0, b: 1, c: -1, d: 0, e: 0, f: 0 }, strat: 'sus',
          },
        },
        { id: 'b', radacina: { tip: 'element', id: 'b', forma: { tip: 'cerc', raza: 10 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } } },
      ],
      foi: [{
        id: 'f1',
        stoc: { latime: 600, inaltime: 400, grosime: 18, material: 'MDF' },
        instante: [{ id: 'a', piesa: 'a', x: 30, y: 40, rotire: 0 }, { id: 'b', piesa: 'b', x: -5, y: 0, rotire: 0 }],
      }],
    },
  },
  {
    // Câmpurile necunoscute ale foii care seamănă cu ale foii v2 (id, nume, instante) merg tot pe stoc; cele ale
    // elementului care seamănă cu ale instanței (x, rotire, piesa) merg pe rădăcină, nu pe instanță.
    nume: 'M03 capcane de nume: id, nume, instante pe foaie; x, rotire, piesa pe element; elementul f1',
    v1: {
      schema: 1, rev: 3,
      foaie: { latime: 50, inaltime: 60, grosime: 3, id: 'X', nume: 'Placa', instante: 'nu' },
      elemente: [{ id: 'f1', forma: { tip: 'cerc', raza: 2 }, matrice: M(1, 0, 0, 1, 7, 8), x: 99, rotire: 45, piesa: 'q' }],
    },
    v2: {
      schema: 2, rev: 3,
      piese: [{
        id: 'f1',
        radacina: { tip: 'element', id: 'f1', forma: { tip: 'cerc', raza: 2 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, x: 99, rotire: 45, piesa: 'q' },
      }],
      foi: [{
        id: 'f1',
        stoc: { latime: 50, inaltime: 60, grosime: 3, id: 'X', nume: 'Placa', instante: 'nu' },
        instante: [{ id: 'f1', piesa: 'f1', x: 7, y: 8, rotire: 0 }],
      }],
    },
  },
  {
    // Precizările 6 și 7: câmpurile necunoscute ale matricei rămân (cu e și f puse pe 0); `copii` e doar un câmp.
    nume: 'M04 câmpuri necunoscute în matrice; un câmp copii pe element',
    v1: {
      schema: 1, rev: 5,
      foaie: { latime: 10, inaltime: 10, grosime: 1 },
      elemente: [{
        id: 'a', forma: { tip: 'cerc', raza: 1 },
        matrice: { a: 2, b: 0, c: 0, d: 2, e: 3, f: -4, nota: 'm' } as MatriceO,
        copii: [{ tip: 'element', id: 'x' }],
      }],
    },
    v2: {
      schema: 2, rev: 5,
      piese: [{
        id: 'a',
        radacina: {
          tip: 'element', id: 'a', forma: { tip: 'cerc', raza: 1 },
          matrice: { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0, nota: 'm' }, copii: [{ tip: 'element', id: 'x' }],
        },
      }],
      foi: [{ id: 'f1', stoc: { latime: 10, inaltime: 10, grosime: 1 }, instante: [{ id: 'a', piesa: 'a', x: 3, y: -4, rotire: 0 }] }],
    },
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Corpusul v1: valid după schema 1 (`src/model/document.ts`, citit doar pentru format și plafoane).

export type CazV1 = { readonly nume: string; readonly doc: DocV1O };

const foaieV1 = (latime = 1000, inaltime = 600, grosime = 18): DocV1O['foaie'] => ({ latime, inaltime, grosime });
const elV1 = (id: string, matrice: MatriceO, forma: Liber = dr(), extra: Liber = {}): ElementV1O => ({ ...extra, id, forma, matrice });
const v1 = (elemente: ElementV1O[], extra: Liber = {}, foaie: DocV1O['foaie'] = foaieV1()): DocV1O => ({
  ...extra, schema: 1, rev: 1, foaie, elemente,
});

/** Un câmp `copii` care arată ca un arbore de 41 de niveluri, cu un element „fals” la capăt. */
const copiiFalsi = (): unknown => {
  let x: unknown = [{ tip: 'element', id: 'fals', forma: { tip: 'cerc', raza: 1 }, matrice: T(1e9, 0) }];
  for (let k = 0; k < 40; k++) x = [{ tip: 'grup', id: `g${k}`, matrice: T(0, 0), copii: x }];
  return x;
};

/** Id de 64 de caractere, cu tot alfabetul permis. */
export const ID_64 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';

const SCRISE_DE_MANA: readonly CazV1[] = [
  { nume: 'C01 gol', doc: v1([]) },
  { nume: 'C02 un dreptunghi la identitate', doc: v1([elV1('e1', I())]) },
  {
    nume: 'C03 nume: diacritice, 200 de caractere, gol',
    doc: v1([
      elV1('a', T(10, 10), dr(), { nume: 'Ușă stânga, țâțână' }),
      elV1('b', T(20, 10), cerc(), { nume: 'x'.repeat(200) }),
      elV1('c', T(30, 10), dr(), { nume: '' }),
    ]),
  },
  {
    nume: 'C04 câmpuri necunoscute pe primul nivel',
    doc: v1([elV1('e1', T(5, 5))], { autor: 'Andrei', meta: { a: [1, 2, { b: null }], c: true }, note: null, numar: -0.5 }),
  },
  {
    nume: 'C05 câmpuri necunoscute pe foaie',
    doc: v1([elV1('e1', I())], {}, { latime: 1220, inaltime: 2440, grosime: 18, material: 'MDF', furnir: { grosime: 0.6 }, note: null }),
  },
  {
    nume: 'C06 câmpuri necunoscute pe element',
    doc: v1([
      elV1('e1', T(1, 2), dr(), { strat: 'contur', etichete: ['a', 'b'], adancimeTaiere: 3 }),
      elV1('e2', T(3, 4), cerc(), { culoare: '#ff0000' }),
    ]),
  },
  {
    nume: 'C07 −0 în matrice',
    doc: v1([elV1('e1', M(1, -0, -0, 1, -0, -0)), elV1('e2', M(-0, 1, -1, -0, 5, -0)), elV1('e3', M(-1, -0, -0, -1, -0, 7))]),
  },
  {
    nume: 'C08 oglindiri',
    doc: v1([elV1('x', M(-1, 0, 0, 1, 50, 0)), elV1('y', M(1, 0, 0, -1, 0, 80)), elV1('xy', M(-1, 0, 0, -1, 10, 10))]),
  },
  {
    // Un dreptunghi drept (fără arce) poate sta sub orice matrice; cercul, doar sub o similitudine (precizarea 5).
    nume: 'C09 scalare neuniformă sub un dreptunghi drept; cerc sub scalare uniformă',
    doc: v1([elV1('s1', M(2.5, 0, 0, 0.3, 10, 20)), elV1('s2', M(1e-3, 0, 0, 1e3, 0.1, 0.2)), elV1('s3', M(2.5, 0, 0, 2.5, 1, 1), cerc())]),
  },
  {
    nume: 'C10 rotiri la 90, 180, 270 scrise ca matrice exacte',
    doc: v1([elV1('r90', M(0, 1, -1, 0, 100, 0)), elV1('r180', M(-1, 0, 0, -1, 100, 100)), elV1('r270', M(0, -1, 1, 0, 0, 100))]),
  },
  {
    nume: 'C11 plafoanele: latura 10 000, raza 10 000, razaColt 5 000 (jumătate din latură), grosimea 1 000',
    doc: v1(
      [elV1('d', I(), dr(10_000, 10_000, 5_000)), elV1('c', T(5000, 5000), cerc(10_000))],
      {},
      foaieV1(10_000, 10_000, 1_000),
    ),
  },
  {
    nume: 'C12 id-uri de 64 de caractere și de un caracter',
    doc: v1([elV1(ID_64, T(1, 1)), elV1('-', T(2, 2)), elV1('_', T(3, 3)), elV1('0', T(4, 4)), elV1('Z'.repeat(64), T(5, 5))]),
  },
  { nume: 'C13 elementul cu id-ul f1 (ca foaia de după migrare)', doc: v1([elV1('f1', T(10, 20)), elV1('f2', T(30, 40))]) },
  {
    nume: 'C14 capcane pe foaie: id, nume, instante, stoc necunoscute',
    doc: v1([elV1('e1', I())], {}, { latime: 50, inaltime: 60, grosime: 3, id: 'X', nume: 'Placa 1', instante: [], stoc: 'nu' }),
  },
  {
    nume: 'C15 capcane pe element: x, y, rotire, piesa, campuri necunoscute',
    doc: v1([elV1('e1', T(7, 8), cerc(), { x: 99, y: -1, rotire: 45, piesa: 'q', campuri: { a: 1 } })]),
  },
  {
    nume: 'C16 câmpuri necunoscute în formă',
    doc: v1([
      elV1('e1', I(), { tip: 'dreptunghi', latime: 10, inaltime: 20, razaColt: 1, colturi: [1, 2], nota: 'x' }),
      elV1('e2', T(1, 1), { tip: 'cerc', raza: 3, segmente: 64 }),
    ]),
  },
  {
    nume: 'C17 exact la margini: coeficienți ±10 000, translații ±10 000 000, 5e−324; cerc sub oglindire la margine',
    doc: v1([
      elV1('m1', M(10_000, -10_000, -10_000, 10_000, 10_000_000, -10_000_000)),
      elV1('m2', M(-0, 10_000, 5e-324, -10_000, -10_000_000, 10_000_000)),
      elV1('m3', M(-0, 10_000, 10_000, -0, 1, 2), cerc()),
    ]),
  },
  { nume: 'C18 rev mare (2^53 − 1)', doc: { ...v1([elV1('e1', T(1, 1))]), rev: 9007199254740991 } },
  { nume: 'C19 rev 0', doc: { ...v1([elV1('e1', T(1, 1))]), rev: 0 } },
  {
    nume: 'C20 rotiri oarecare (cos și sin neexacte)',
    doc: v1([
      elV1('r1', M(0.955336489125606, 0.29552020666133955, -0.29552020666133955, 0.955336489125606, 12.5, -7.25)),
      elV1('r2', M(0.7071067811865476, 0.7071067811865475, -0.7071067811865475, 0.7071067811865476, 0, 0)),
    ]),
  },
  {
    nume: 'C21 translații fracționare neexacte (0,1; 0,2; 1/3)',
    doc: v1([elV1('t1', M(1, 0, 0, 1, 0.1, 0.2)), elV1('t2', M(1, 0, 0, 1, 1 / 3, -2 / 3), cerc())]),
  },
  {
    nume: 'C22 ordinea elementelor nu e alfabetică',
    doc: v1([elV1('z', T(1, 0)), elV1('a', T(2, 0)), elV1('m', T(3, 0)), elV1('B', T(4, 0)), elV1('0', T(5, 0))]),
  },
  {
    // Chei proprii (din JSON.parse, ca la un fișier sau la IndexedDB) pe care unele validatoare le taie în tăcere
    // (valibot 1.5: `looseObject` și `record` lasă afară `__proto__`, `constructor`, `prototype`).
    nume: 'C23 câmpuri necunoscute numite __proto__, constructor, prototype',
    doc: JSON.parse(
      '{"schema":1,"rev":2,"prototype":"p","foaie":{"latime":100,"inaltime":100,"grosime":10,"constructor":"c"},'
      + '"elemente":[{"id":"e1","forma":{"tip":"cerc","raza":5},"matrice":{"a":1,"b":0,"c":0,"d":1,"e":3,"f":4},'
      + '"__proto__":"x","constructor":"Ion"}]}',
    ) as DocV1O,
  },
  {
    // Precizarea 7: `copii` pe un element e doar un câmp. Înăuntru: 41 de niveluri de „noduri” și o matrice peste
    // margini; o ușă care l-ar citi ca arbore ar refuza documentul sau ar desena elementul „fals”.
    nume: 'C24 un câmp necunoscut copii pe element, adânc, cu noduri false (nu e arbore)',
    doc: v1([elV1('e1', T(1, 2), dr(), { copii: copiiFalsi() }), elV1('e2', I(), cerc(), { copii: [] })]),
  },
  {
    nume: 'C25 câmpuri necunoscute în matrice (precizarea 6)',
    doc: v1([
      elV1('e1', { ...T(3, 4), nota: 'm', z: { k: [1, null] } } as MatriceO),
      elV1('e2', { ...M(0, 1, -1, 0, 5, 6), unitate: 'mm' } as MatriceO, cerc()),
    ]),
  },
  {
    // Un câmp de sus rămâne la același nivel după migrare: 1 + 199 = 200 de niveluri și în v1, și în v2.
    nume: 'C27 JSON adânc de exact 200 de niveluri (un câmp de sus)',
    doc: { ...v1([elV1('e1', I())]), adanc: adanc(199) },
  },
];

/** PRNG propriu (mulberry32), determinist: niciun `Math.random`. */
function aleator(samanta: number): () => number {
  let s = samanta >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LITERE_NUME = 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJ0123456789ăâîșțĂÂÎȘȚ-_.,';
const CHEI_DOC = ['autor', 'meta', 'creatDe', 'versiuneScriere', 'note'] as const;
const CHEI_FOAIE = ['material', 'culoare', 'furnir', 'note', 'nume', 'id'] as const;
const CHEI_ELEMENT = ['strat', 'culoare', 'etichete', 'note', 'x', 'y', 'rotire', 'piesa'] as const;
const CHEI_FORMA = ['culoare', 'nota'] as const;

/**
 * Un document v1 din sămânță, valid și în margini (precizarea 5): coeficienții în ±10 000, translațiile în
 * ±10 000 000, formele cu arce doar sub similitudini. `numar` fixează câte elemente are. Cu `peste`, un coeficient al
 * unui element iese din margini (rămânând finit), deci ușa trebuie să refuze documentul.
 */
export function genereazaV1(samanta: number, numar?: number, peste = false): DocV1O {
  const r = aleator(samanta);
  const intreg = (min: number, max: number): number => min + Math.floor(r() * (max - min + 1));
  const alege = <V>(lista: readonly V[]): V => lista[Math.floor(r() * lista.length)] as V;
  /** În (0, max], uneori exact max. */
  const dimensiune = (max: number): number => (r() < 0.1 ? max : (1 - r()) * max);
  const oarecare = (): number => alege([
    () => (r() - 0.5) * 2e4,
    () => intreg(-20_000, 20_000),
    () => (r() - 0.5) * 1e-6,
    () => -0,
    () => 0,
    () => (r() < 0.5 ? -1 : 1) * r() * 1e300,
  ])();
  /** Un coeficient a–d în margini: [−10 000, 10 000], uneori exact la margine. */
  const coeficient = (): number => alege([
    () => (r() - 0.5) * 2e4,
    () => intreg(-10_000, 10_000),
    () => (r() - 0.5) * 1e-6,
    () => -0,
    () => 0,
    () => (r() < 0.5 ? -1 : 1) * 10_000,
  ])();
  /** O translație e / f în margini: [−10 000 000, 10 000 000], uneori exact la margine. */
  const translatie = (): number => alege([
    () => (r() - 0.5) * 2e7,
    () => intreg(-10_000_000, 10_000_000),
    () => (r() - 0.5) * 2e4,
    () => (r() - 0.5) * 1e-6,
    () => -0,
    () => 0,
    () => (r() < 0.5 ? -1 : 1) * 10_000_000,
  ])();
  const valoare = (adancime: number): unknown => {
    const tip = intreg(0, adancime > 2 ? 4 : 6);
    if (tip === 0) return null;
    if (tip === 1) return r() < 0.5;
    if (tip === 2) return oarecare();
    if (tip === 3 || tip === 4) return Array.from({ length: intreg(0, 6) }, () => alege(LITERE_NUME.split(''))).join('');
    if (tip === 5) return Array.from({ length: intreg(0, 3) }, () => valoare(adancime + 1));
    return Object.fromEntries(Array.from({ length: intreg(0, 3) }, (_, k) => [`k${k}`, valoare(adancime + 1)]));
  };
  const extra = (chei: readonly string[], p: number): Liber => {
    const o: Liber = {};
    for (const k of chei) if (r() < p) o[k] = valoare(0);
    return o;
  };
  const ids = new Set<string>();
  const idNou = (): string => {
    for (;;) {
      const lungime = r() < 0.15 ? 64 : intreg(1, 10);
      let s = '';
      for (let k = 0; k < lungime; k++) s += ID_64[intreg(0, 63)];
      if (!ids.has(s)) { ids.add(s); return s; }
    }
  };
  const matrice = (arce: boolean): MatriceO => {
    const x = translatie();
    const y = translatie();
    if (arce) {
      // O formă cu arce stă doar sub o similitudine: translație, rotire exactă, rotire cu scalare uniformă, oglindire.
      // Produsul s · cos se calculează o dată și se folosește de două ori, deci a = ±d și b = ∓c exact.
      const felS = intreg(0, 3);
      if (felS === 0) return M(1, 0, 0, 1, x, y);
      if (felS === 1) return alege([M(0, 1, -1, 0, x, y), M(-1, 0, 0, -1, x, y), M(0, -1, 1, 0, x, y), M(-0, 1, -1, -0, x, y)]);
      const t = r() * 2 * Math.PI;
      const s = alege([1, 1e-3 + r() * 9_999, 10_000]);
      const cos = s * Math.cos(t);
      const sin = s * Math.sin(t);
      return felS === 2 ? M(cos, sin, -sin, cos, x, y) : M(cos, sin, sin, -cos, x, y);
    }
    const fel = intreg(0, 5);
    if (fel === 0) return M(1, 0, 0, 1, x, y);
    if (fel === 1) return alege([M(0, 1, -1, 0, x, y), M(-1, 0, 0, -1, x, y), M(0, -1, 1, 0, x, y)]);
    if (fel === 2) { const t = r() * 2 * Math.PI; return M(Math.cos(t), Math.sin(t), -Math.sin(t), Math.cos(t), x, y); }
    if (fel === 3) return M((r() - 0.5) * 8, 0, 0, (r() - 0.5) * 8, x, y);
    if (fel === 4) return M(coeficient(), coeficient(), coeficient(), coeficient(), x, y);
    return M(-0, alege([1, -1, -0]), alege([1, -1, -0]), -0, -0, y);
  };
  const forma = (): Liber => {
    const baza: Liber = r() < 0.6
      ? (() => {
        const latime = dimensiune(10_000);
        const inaltime = dimensiune(10_000);
        return { tip: 'dreptunghi', latime, inaltime, razaColt: r() < 0.3 ? 0 : r() * Math.min(latime, inaltime) / 2 };
      })()
      : { tip: 'cerc', raza: dimensiune(10_000) };
    return { ...extra(CHEI_FORMA, 0.1), ...baza };
  };
  const n = numar ?? intreg(peste ? 1 : 0, 12);
  const elemente: ElementV1O[] = [];
  for (let k = 0; k < n; k++) {
    const f = forma();
    const arce = f['tip'] === 'cerc' || (f['razaColt'] as number) > 0;
    const e: ElementV1O = { ...extra(CHEI_ELEMENT, 0.08), id: idNou(), forma: f, matrice: matrice(arce) };
    if (r() < 0.4) e.nume = Array.from({ length: intreg(0, r() < 0.1 ? 200 : 20) }, () => alege(LITERE_NUME.split(''))).join('');
    elemente.push(e);
  }
  if (peste && n > 0) {
    const e = elemente[intreg(0, n - 1)] as ElementV1O;
    const k = alege(['a', 'b', 'c', 'd', 'e', 'f'] as const);
    const margine = k === 'e' || k === 'f' ? 10_000_000 : 10_000;
    const m: MatriceScrisa = { ...e.matrice };
    m[k] = (r() < 0.5 ? -1 : 1) * (margine + alege([1e-6, 0.5, 1, 1e3, 1e300]));
    e.matrice = m;
  }
  return {
    ...extra(CHEI_DOC, 0.3),
    schema: 1,
    rev: intreg(0, 1_000_000),
    foaie: { ...extra(CHEI_FOAIE, 0.3), latime: dimensiune(10_000), inaltime: dimensiune(10_000), grosime: dimensiune(1_000) },
    elemente,
  };
}

const GENERATE: readonly CazV1[] = [
  ...Array.from({ length: 16 }, (_, k) => ({ nume: `G${String(k + 1).padStart(2, '0')} generat, sămânța ${1000 + k}`, doc: genereazaV1(1000 + k) })),
  { nume: 'G17 generat mare: 3 000 de elemente, sămânța 77', doc: genereazaV1(77, 3000) },
];

export const CORPUS_V1: readonly CazV1[] = [...SCRISE_DE_MANA, ...GENERATE];

/**
 * Plafonul v1 (100 000 de elemente) dă exact plafonul de elemente în lume v2 (precizarea 5): încape. Stă separat de
 * corpus, ca testele lui de idempotență să nu-l încarce de opt ori.
 */
export const V1_LA_PLAFON: CazV1 = {
  nume: 'V1 la plafon: 100 000 de elemente (100 000 de elemente în lume)',
  doc: v1(Array.from({ length: 100_000 }, (_, k) => elV1(`e${k}`, T(k % 1000, Math.floor(k / 1000))))),
};

// ---------------------------------------------------------------------------------------------------------------
// v1 refuzate la ușă, fiecare cu singura categorie pe care o raportează `verificaV1`.

export type Refuzat = { readonly nume: string; readonly doc: unknown; readonly motiv: CategorieO };

const bazaV1 = (): DocV1O => v1([elV1('e1', T(10, 20)), elV1('e2', I(), cerc())]);
const el0 = (d: DocV1O): ElementV1O => d.elemente[0] as ElementV1O;
const refuzat = (nume: string, motiv: CategorieO, strica: (d: DocV1O) => void): Refuzat => {
  const d = bazaV1();
  strica(d);
  return { nume, doc: d, motiv };
};

export const REFUZATE_V1: readonly Refuzat[] = [
  {
    nume: 'R01 valori extreme, dar finite, în matrice (fostul C17)',
    motiv: 'margini',
    doc: v1([
      elV1('e1', M(5e-324, -1.7976931348623157e308, 1e-300, 1e300, 1e308, -1e308)),
      elV1('e2', M(Number.MAX_VALUE, Number.MIN_VALUE, -Number.MAX_VALUE, -Number.MIN_VALUE, 2 ** -1074, -(2 ** 1023))),
    ]),
  },
  refuzat('R02 coeficient a = 10 000,5', 'margini', (d) => { el0(d).matrice = M(10_000.5, 0, 0, 1, 0, 0); }),
  refuzat('R03 coeficient c = −10 001', 'margini', (d) => { el0(d).matrice = M(1, 0, -10_001, 1, 0, 0); }),
  refuzat('R04 translație e = 10 000 001 (x-ul instanței)', 'margini', (d) => { el0(d).matrice = T(10_000_001, 0); }),
  refuzat('R05 translație f = −10 000 000,5 (y-ul instanței)', 'margini', (d) => { el0(d).matrice = T(0, -10_000_000.5); }),
  ...Array.from({ length: 4 }, (_, k): Refuzat => ({
    nume: `R${String(6 + k).padStart(2, '0')} generat, peste margini, sămânța ${2000 + k}`,
    motiv: 'margini',
    doc: genereazaV1(2000 + k, undefined, true),
  })),
  refuzat('R10 câmp de sus „piese”', 'ciocnire', (d) => { d['piese'] = []; }),
  refuzat('R11 câmp de sus „foi”', 'ciocnire', (d) => { d['foi'] = 'x'; }),
  refuzat('R12 element cu câmpul „tip”', 'ciocnire', (d) => { el0(d)['tip'] = 'grup'; }),
  refuzat('R13 element cu „tip: element” (chiar valoarea pe care ar scrie-o migrarea)', 'ciocnire', (d) => { el0(d)['tip'] = 'element'; }),
  refuzat('R14 două elemente cu același id', 'unic-elemente', (d) => { (d.elemente[1] as ElementV1O).id = 'e1'; }),
  refuzat('R15 nume de 201 de caractere', 'plafon', (d) => { el0(d).nume = 'x'.repeat(201); }),
  refuzat('R16 forma.tip necunoscut', 'schema', (d) => { el0(d).forma = { tip: 'elipsa', rx: 1, ry: 2 }; }),
  refuzat('R17 NaN în matrice', 'finit', (d) => { el0(d).matrice = M(1, 0, 0, 1, Number.NaN, 0); }),
  refuzat('R18 lățimea foii 0', 'pozitiv', (d) => { d.foaie.latime = 0; }),
  refuzat('R19 id cu spațiu', 'id', (d) => { el0(d).id = 'e 1'; }),
  refuzat('R20 foaia lipsă', 'schema', (d) => { delete (d as Liber)['foaie']; }),
  refuzat('R21 rev −1', 'schema', (d) => { d.rev = -1; }),
  refuzat('R22 rev 2^53 (nu e întreg sigur)', 'schema', (d) => { d.rev = 2 ** 53; }),
  refuzat('R23 cerc sub scalare neuniformă (fostul C09 s2; elipsa vine cu o schemă nouă)', 'forma', (d) => {
    (d.elemente[1] as ElementV1O).matrice = M(1e-3, 0, 0, 1e3, 0.1, 0.2);
  }),
  refuzat('R24 dreptunghi rotunjit sub forfecare', 'forma', (d) => { el0(d).forma = dr(40, 20, 5); el0(d).matrice = M(1, 0, 0.5, 1, 0, 0); }),
  refuzat('R25 razaColt peste jumătate din latura mică (10,5 la 40 × 20)', 'forma', (d) => { el0(d).forma = dr(40, 20, 10.5); }),
  refuzat('R26 JSON adânc de 201 de niveluri (un câmp de sus)', 'adancime', (d) => { d['adanc'] = adanc(200); }),
  // Interpretarea oracolului: se judecă documentul migrat. Foaia v1 (nivelul 2) devine stocul (nivelul 4): +2.
  refuzat('R27 adâncimea crește la migrare: 200 de niveluri pe foaia v1, 202 pe stocul v2', 'adancime', (d) => {
    d.foaie['adanc'] = adanc(198);
  }),
  // Elementul v1 (nivelul 3) devine rădăcina piesei (nivelul 4): +1.
  refuzat('R28 adâncimea crește la migrare: 200 de niveluri pe elementul v1, 201 pe rădăcina v2', 'adancime', (d) => {
    el0(d)['adanc'] = adanc(197);
  }),
];

// ---------------------------------------------------------------------------------------------------------------
// Otrăvuri v2: fiecare încalcă un singur lucru, deci oracolul raportează o singură categorie.

export type Otrava = { readonly nume: string; readonly doc: unknown; readonly categorie: CategorieO };

/** Documentul valid de la care pleacă otrăvurile. */
const baza = (): DocV2O => doc(
  [piesa('p1', grup('g', I(), [el('e1', I()), el('e2', T(10, 0), cerc())]))],
  [foaie('f1', [inst('i1', 'p1', 10, 10, 0)])],
);

const scrie = (o: object, cheie: string, valoare: unknown): void => { (o as Liber)[cheie] = valoare; };
const sterge = (o: object, cheie: string): void => { delete (o as Liber)[cheie]; };
const f0 = (d: DocV2O): FoaieO => d.foi[0] as FoaieO;
const i0 = (d: DocV2O): InstantaO => f0(d).instante[0] as InstantaO;
const p0 = (d: DocV2O): PiesaO => d.piese[0] as PiesaO;
const g0 = (d: DocV2O): GrupO => p0(d).radacina as GrupO;
const e0 = (d: DocV2O): ElementO => g0(d).copii[0] as ElementO;
/** Cercul bazei. */
const e1 = (d: DocV2O): ElementO => g0(d).copii[1] as ElementO;

const otrava = (nume: string, categorie: CategorieO, strica: (d: DocV2O) => void): Otrava => {
  const d = baza();
  strica(d);
  return { nume, doc: d, categorie };
};

/** Un lanț de grupuri cu matricea `pas`, cu un cerc la capăt. */
const lantCerc = (grupuri: number, pas: MatriceO): NodO => {
  let nod: NodO = el('cerc', I(), cerc());
  for (let k = grupuri; k >= 1; k--) nod = grup(`r${k}`, { ...pas }, [nod]);
  return nod;
};

/** Un lanț de `niveluri` noduri: grupuri, cu un element la capăt. Rădăcina e nivelul 1. */
const lant = (niveluri: number, pas: MatriceO = I()): NodO => {
  let nod: NodO = el('frunza', I());
  for (let k = niveluri - 1; k >= 1; k--) nod = grup(`g${k}`, { ...pas }, [nod]);
  return nod;
};

export const OTRAVURI_V2: readonly Otrava[] = [
  otrava('O01 instanța trimite la piesa lipsă p9', 'referinta', (d) => { i0(d).piesa = 'p9'; }),
  otrava('O02 instanța trimite la id-ul unui nod, nu al unei piese', 'referinta', (d) => { i0(d).piesa = 'e1'; }),
  otrava('O03 instanța trimite la id-ul altei instanțe', 'referinta', (d) => {
    f0(d).instante.push(inst('i2', 'i1', 0, 0, 0));
  }),
  otrava('O04 două piese cu același id', 'unic-piese', (d) => { d.piese.push(piesa('p1', el('altul', I()))); }),
  otrava('O05 două foi cu același id', 'unic-foi', (d) => { d.foi.push(foaie('f1', [])); }),
  otrava('O06 aceeași instanță pe două foi', 'unic-instante', (d) => { d.foi.push(foaie('f2', [inst('i1', 'p1', 0, 0, 0)])); }),
  otrava('O07 același id de nod în ramuri diferite ale aceleiași piese', 'unic-noduri', (d) => {
    p0(d).radacina = grup('g', I(), [grup('a', I(), [el('x', I())]), grup('b', I(), [el('x', T(1, 0))])]);
  }),
  otrava('O08 același id la rădăcină și la un copil', 'unic-noduri', (d) => { e0(d).id = 'g'; }),
  otrava('O09 adâncimea 33 (33 de niveluri, rădăcina e nivelul 1)', 'adancime', (d) => { p0(d).radacina = lant(33); }),
  otrava('O10 adâncimea 50 000 (fără depășirea stivei)', 'adancime', (d) => { p0(d).radacina = lant(50_000); }),
  otrava('O11 rotire 360', 'rotire', (d) => { i0(d).rotire = 360; }),
  otrava('O12 rotire −90', 'rotire', (d) => { i0(d).rotire = -90; }),
  otrava('O13 rotire NaN', 'rotire', (d) => { i0(d).rotire = Number.NaN; }),
  otrava('O14 rotire Infinity', 'rotire', (d) => { i0(d).rotire = Number.POSITIVE_INFINITY; }),
  otrava('O15 NaN în matricea unui nod', 'finit', (d) => { e0(d).matrice = M(1, 0, 0, 1, Number.NaN, 0); }),
  otrava('O16 Infinity în x-ul instanței', 'finit', (d) => { i0(d).x = Number.POSITIVE_INFINITY; }),
  otrava('O17 −Infinity în grosimea stocului', 'finit', (d) => { f0(d).stoc.grosime = Number.NEGATIVE_INFINITY; }),
  otrava('O18 id de piesă cu spațiu', 'id', (d) => { p0(d).id = 'p 1'; i0(d).piesa = 'p 1'; }),
  otrava('O19 id de instanță de 65 de caractere', 'id', (d) => { i0(d).id = `${ID_64}x`; }),
  otrava('O20 id de foaie gol', 'id', (d) => { f0(d).id = ''; }),
  otrava('O21 id de nod cu linie nouă la capăt', 'id', (d) => { e0(d).id = 'e1\n'; }),
  otrava('O22 id de piesă cu diacritice', 'id', (d) => { p0(d).id = 'piesă'; i0(d).piesa = 'piesă'; }),
  otrava('O23 zero foi', 'foi', (d) => { d.foi = []; }),
  otrava('O24 schema 1 cu forma v2', 'schema', (d) => { scrie(d, 'schema', 1); }),
  otrava('O25 schema "2" (text)', 'schema', (d) => { scrie(d, 'schema', '2'); }),
  otrava('O26 grup fără copii', 'schema', (d) => { sterge(g0(d), 'copii'); }),
  otrava('O27 element cu forma.tip necunoscut', 'schema', (d) => { e0(d).forma = { tip: 'elipsa', rx: 3, ry: 2 }; }),
  otrava('O28 nod cu tip necunoscut', 'schema', (d) => { scrie(e0(d), 'tip', 'cerc'); }),
  otrava('O29 rev lipsă', 'schema', (d) => { sterge(d, 'rev'); }),
  otrava('O30 stoc lipsă', 'schema', (d) => { sterge(f0(d), 'stoc'); }),
  otrava('O31 instante lipsă', 'schema', (d) => { sterge(f0(d), 'instante'); }),
  otrava('O32 piesa instanței e număr', 'schema', (d) => { scrie(i0(d), 'piesa', 1); }),
  otrava('O33 campuri cu o valoare număr', 'schema', (d) => { scrie(i0(d), 'campuri', { cod: 'A1', bucati: 3 }); }),
  otrava('O34 matricea fără f', 'schema', (d) => { const m: Liber = { ...e0(d).matrice }; delete m['f']; scrie(e0(d), 'matrice', m); }),
  otrava('O35 nume de piesă număr', 'schema', (d) => { scrie(p0(d), 'nume', 7); }),
  { nume: 'O36 documentul e o listă', categorie: 'schema', doc: [baza()] },
  otrava('O37 latura 10 001', 'plafon', (d) => { e0(d).forma = dr(10_001, 20, 0); }),
  otrava('O38 raza 10 001', 'plafon', (d) => { e0(d).forma = cerc(10_001); }),
  // razaColt > 10 000 nu se mai poate fără [forma] (latura ≤ 10 000, deci razaColt ≤ 5 000): O39 e acum înălțimea.
  otrava('O39 înălțimea 10 001', 'plafon', (d) => { e0(d).forma = dr(20, 10_001, 0); }),
  otrava('O40 stocul de 10 001 lățime', 'plafon', (d) => { f0(d).stoc.latime = 10_001; }),
  otrava('O41 grosimea 1 001', 'plafon', (d) => { f0(d).stoc.grosime = 1_001; }),
  otrava('O42 1 001 de foi', 'plafon', (d) => { for (let k = 2; k <= 1001; k++) d.foi.push(foaie(`f${k}`, [])); }),
  // O piesă fără elemente: 100 001 de instanțe, dar 0 elemente în lume (altfel ar fi și [margini]).
  otrava('O43 100 001 de instanțe pe o foaie (ale unei piese goale)', 'plafon', (d) => {
    p0(d).radacina = grup('g', I(), []);
    for (let k = 2; k <= 100_001; k++) f0(d).instante.push(inst(`i${k}`, 'p1', 0, 0, 0));
  }),
  otrava('O44 100 002 noduri într-o piesă (1 grup + 100 001 elemente), fără instanțe', 'plafon', (d) => {
    p0(d).radacina = grup('g', I(), Array.from({ length: 100_001 }, (_, k) => el(`e${k}`, I())));
    f0(d).instante = [];
  }),
  otrava('O45 lățimea 0', 'pozitiv', (d) => { e0(d).forma = dr(0, 20, 0); }),
  otrava('O46 raza negativă', 'pozitiv', (d) => { e0(d).forma = cerc(-1); }),
  otrava('O47 nume de piesă de 201 de caractere', 'plafon', (d) => { p0(d).nume = 'x'.repeat(201); }),
  otrava('O48 nume de nod de 201 de caractere', 'plafon', (d) => { e0(d).nume = 'ș'.repeat(201); }),
  // Precizarea 5: marginile lumii.
  otrava('O49 coeficient compus 100 000: cinci grupuri cu scara 10 (fiecare matrice locală e mică)', 'margini', (d) => {
    p0(d).radacina = lant(6, M(10, 0, 0, 10, 0, 0));
  }),
  otrava('O50 translație compusă 10 000 001 (5 000 000 + 5 000 001)', 'margini', (d) => {
    p0(d).radacina = grup('g', T(5_000_000, 0), [el('e', T(5_000_001, 0))]);
  }),
  otrava('O51 translație compusă prin scalare: 1 000 × 10 001', 'margini', (d) => {
    p0(d).radacina = grup('g', M(1000, 0, 0, 1000, 0, 0), [el('e', T(10_001, 0))]);
  }),
  otrava('O52 coeficient local 10 001 la rădăcină', 'margini', (d) => { g0(d).matrice = M(10_001, 0, 0, 1, 0, 0); }),
  otrava('O53 compunerea ajunge la Infinity (10 000 × 1e305)', 'margini', (d) => {
    p0(d).radacina = grup('g', M(1e4, 0, 0, 1e4, 0, 0), [el('e', M(1e305, 0, 0, 1, 0, 0))]);
  }),
  otrava('O54 compunerea dă NaN (∞ − ∞) doar pe a; ceilalți coeficienți rămân în margini', 'margini', (d) => {
    p0(d).radacina = grup('g', M(1e4, 0, 1e4, 1e-305, 0, 0), [el('e', M(1e305, -1e305, 0, 1, 0, 0))]);
  }),
  otrava('O55 x = 10 000 001', 'margini', (d) => { i0(d).x = 10_000_001; }),
  otrava('O56 y = −10 000 000,5', 'margini', (d) => { i0(d).y = -10_000_000.5; }),
  otrava('O57 100 001 elemente în lume: 1 000 de instanțe × 100 de elemente, plus una × 1', 'margini', (d) => {
    p0(d).radacina = grup('g', I(), Array.from({ length: 100 }, (_, k) => el(`e${k}`, I())));
    for (let k = 2; k <= 1000; k++) f0(d).instante.push(inst(`i${k}`, 'p1', 0, 0, 0));
    d.piese.push(piesa('p2', el('e', I())));
    f0(d).instante.push(inst('unu', 'p2', 0, 0, 0));
  }),
  otrava('O58 100 001 elemente în lume pe două foi (60 000 + 40 001; fiecare foaie e sub plafon)', 'margini', (d) => {
    p0(d).radacina = grup('g', I(), Array.from({ length: 100 }, (_, k) => el(`e${k}`, I())));
    for (let k = 2; k <= 600; k++) f0(d).instante.push(inst(`i${k}`, 'p1', 0, 0, 0));
    d.piese.push(piesa('p2', el('e', I())));
    d.foi.push(foaie('f2', [...Array.from({ length: 400 }, (_, k) => inst(`j${k}`, 'p1', 0, 0, 0)), inst('unu', 'p2', 0, 0, 0)]));
  }),
  otrava('O59 margini depășite într-o piesă fără instanțe', 'margini', (d) => { d.piese.push(piesa('p2', el('e', T(10_000_001, 0)))); }),
  // Precizarea 5, ultimul punct: tot JSON-ul, cu câmpurile necunoscute, are cel mult 200 de niveluri.
  otrava('O60 JSON adânc de 201 de niveluri (un câmp de sus)', 'adancime', (d) => { scrie(d, 'adanc', adanc(200)); }),
  // e1 e pe nivelul 6 (document, piese, piesa, rădăcina, copii, e1), forma pe 7: 7 + 194 = 201.
  otrava('O61 JSON adânc de 201 de niveluri, în forma unui element', 'adancime', (d) => { e0(d).forma = { ...dr(), adanc: adanc(194) }; }),
  // Precizarea 4: campuri.
  otrava('O62 campuri cu 201 de chei', 'plafon', (d) => {
    i0(d).campuri = Object.fromEntries(Array.from({ length: 201 }, (_, k) => [`k${k}`, 'v']));
  }),
  otrava('O63 o cheie din campuri de 201 de caractere', 'plafon', (d) => { i0(d).campuri = { ['K'.repeat(201)]: 'v' }; }),
  otrava('O64 o valoare din campuri de 10 001 de caractere', 'plafon', (d) => { i0(d).campuri = { cod: 'v'.repeat(10_001) }; }),
  otrava('O65 rev 2^53 (nu e întreg sigur)', 'schema', (d) => { d.rev = 2 ** 53; }),
  otrava('O66 rev 1,5', 'schema', (d) => { d.rev = 1.5; }),
  // Precizarea 5: forme pe care consumatorii nu le pot desena.
  otrava('O67 razaColt peste jumătate din latura mică (25,5 la 100 × 50)', 'forma', (d) => { e0(d).forma = dr(100, 50, 25.5); }),
  otrava('O68 cerc sub o scalare locală neuniformă (2 × 1)', 'forma', (d) => { e1(d).matrice = M(2, 0, 0, 1, 10, 0); }),
  otrava('O69 cerc sub o matrice locală similitudine, dar compusă neuniformă (grupul 1 × 2)', 'forma', (d) => {
    g0(d).matrice = M(1, 0, 0, 2, 0, 0);
  }),
  otrava('O70 dreptunghi rotunjit sub forfecare', 'forma', (d) => { e0(d).forma = dr(40, 20, 5); e0(d).matrice = M(1, 0, 0.5, 1, 0, 0); }),
  otrava('O71 cerc sub scalarea 0 (similitudine degenerată, determinant 0)', 'forma', (d) => { g0(d).matrice = M(0, 0, 0, 0, 0, 0); }),
  otrava('O72 cerc sub d = 1 + 1e−9 (peste toleranța 1e−12)', 'forma', (d) => { e1(d).matrice = M(1, 0, 0, 1 + 1e-9, 10, 0); }),
];

// ---------------------------------------------------------------------------------------------------------------
// Valide, dar dificile: seamănă cu otrăvurile. Precizarea 3 fixează parantezele și formula, deci aplicația și oracolul
// trebuie să dea aceiași biți și pe valorile neexacte (D05, D19, D20, D23).

export type CazValid = { readonly nume: string; readonly doc: DocV2O };

const CAMPURI_CAPCANA = JSON.parse('{"__proto__": "x", "constructor": "Ion", "toString": "t", "": ""}') as { [cheie: string]: string };

const docNecunoscute = (): DocV2O => ({
  schema: 2, rev: 4, autor: 'Andrei', meta: { a: [1, { b: null }] },
  piese: [{
    id: 'p1', nume: 'Raft', culoare: 'stejar',
    radacina: {
      tip: 'grup', id: 'g', matrice: { ...T(1, 2), nota: 'm' } as MatriceO, strat: 3,
      copii: [{ tip: 'element', id: 'e', forma: { ...dr(), segmente: 32 }, matrice: I(), adancime: [1, 2] }],
    },
  }],
  foi: [{
    id: 'f1', nume: 'Placa', fata: 'sus',
    stoc: { latime: 1220, inaltime: 2440, grosime: 18, material: 'MDF' },
    instante: [{ id: 'i1', piesa: 'p1', x: 5, y: 6, rotire: 90, campuri: { cod: 'A1', bucati: '3' }, legata: false }],
  }],
});

export const VALIDE_DIFICILE: readonly CazValid[] = [
  {
    nume: 'D01 același id de nod în două piese diferite',
    doc: doc(
      [piesa('p1', grup('g', I(), [el('e', I())])), piesa('p2', grup('g', T(5, 0), [el('e', T(0, 5), cerc())]))],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0), inst('i2', 'p2', 100, 0, 0)])],
    ),
  },
  {
    nume: 'D02 o piesă fără instanțe',
    doc: doc([piesa('p1', el('e1', I())), piesa('p2', el('e1', I()))], [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])]),
  },
  {
    nume: 'D03 același text ca id de piesă, de nod, de instanță și de foaie',
    doc: doc(
      [piesa('x', el('x', I())), piesa('y', grup('x', I(), [el('y', T(1, 1))]))],
      [foaie('x', [inst('x', 'x', 0, 0, 0), inst('y', 'y', 10, 0, 0)]), foaie('y', [inst('p', 'x', 0, 0, 0)])],
    ),
  },
  {
    nume: 'D04 instanța cu id-ul altei piese (spații de nume separate)',
    doc: doc(
      [piesa('a', el('ea', T(1, 0))), piesa('b', el('eb', T(0, 1)))],
      [foaie('f1', [inst('b', 'a', 0, 0, 0), inst('a', 'b', 10, 10, 0)])],
    ),
  },
  {
    nume: 'D05 rotire −0 și 359,999999 (încă în [0, 360))',
    doc: doc([piesa('p1', el('e1', T(1, 0)))], [foaie('f1', [inst('i1', 'p1', 0, 0, -0), inst('i2', 'p1', 0, 0, 359.999999)])]),
  },
  {
    nume: 'D06 adâncimea 32 (32 de niveluri)',
    doc: doc([piesa('p1', lant(32, T(1, 0)))], [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])]),
  },
  {
    nume: 'D07 foaie fără instanțe și grup fără copii',
    doc: doc(
      [piesa('p1', el('e1', I())), piesa('gol', grup('g', I(), []))],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0), inst('i2', 'gol', 0, 0, 0)]), foaie('f2', [])],
    ),
  },
  { nume: 'D08 câmpuri necunoscute pe toate nivelurile (și în matrice, și în formă)', doc: docNecunoscute() },
  {
    nume: 'D09 campuri cu chei capcană (__proto__, constructor, toString, gol)',
    doc: doc([piesa('p1', el('e1', I()))], [foaie('f1', [{ ...inst('i1', 'p1', 0, 0, 0), campuri: CAMPURI_CAPCANA }])]),
  },
  {
    nume: 'D10 id-uri de 64 de caractere și de un caracter',
    doc: doc(
      [piesa(ID_64, el(ID_64, I())), piesa('-', el('_', T(1, 0)))],
      [foaie(ID_64, [inst(ID_64, ID_64, 0, 0, 0), inst('0', '-', 0, 0, 270)])],
    ),
  },
  {
    nume: 'D11 plafoanele atinse: latura 10 000, raza 10 000, razaColt 5 000 (jumătate din latură), grosimea 1 000',
    doc: {
      ...doc(
        [piesa('p1', grup('g', I(), [el('d', I(), dr(10_000, 10_000, 5_000)), el('c', I(), cerc(10_000))]))],
        [foaie('f1', [inst('i1', 'p1', 0, 0, 180)])],
      ),
      foi: [{ id: 'f1', stoc: { latime: 10_000, inaltime: 10_000, grosime: 1_000 }, instante: [inst('i1', 'p1', 0, 0, 180)] }],
    },
  },
  {
    nume: 'D12 o mie de foi',
    doc: doc([piesa('p1', el('e1', I()))], Array.from({ length: 1000 }, (_, k) => foaie(`f${k}`, [inst(`i${k}`, 'p1', k, 0, 0)]))),
  },
  {
    nume: 'D13 100 000 de noduri într-o piesă (1 grup + 99 999 de elemente)',
    doc: doc(
      [piesa('p1', grup('g', I(), Array.from({ length: 99_999 }, (_, k) => el(`e${k}`, T(k, 0)))))],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ),
  },
  {
    nume: 'D14 100 000 de instanțe pe o foaie (exact 100 000 de elemente în lume)',
    doc: doc([piesa('p1', el('e1', I()))], [foaie('f1', Array.from({ length: 100_000 }, (_, k) => inst(`i${k}`, 'p1', k, 0, 0)))]),
  },
  {
    nume: 'D15 aceeași piesă pe două foi',
    doc: doc([piesa('p1', el('e1', I()))], [foaie('f1', [inst('i1', 'p1', 0, 0, 90)]), foaie('f2', [inst('i2', 'p1', 0, 0, 180)])]),
  },
  { nume: 'D16 exact la margini: coeficienți ±10 000, translații compuse ±10 000 000, x și y ±10 000 000', doc: docLaMargini() },
  { nume: 'D17 matrice locală peste margini, compusă în margini sub un părinte de 1/1024', doc: docSubParinte() },
  {
    nume: 'D18 exact 100 000 de elemente în lume, adunate de pe 1 000 de foi (o instanță × 100 de elemente pe fiecare)',
    doc: doc(
      [piesa('p1', grup('g', I(), Array.from({ length: 100 }, (_, k) => el(`e${k}`, T(k, 0)))))],
      Array.from({ length: 1000 }, (_, k) => foaie(`f${k}`, [inst(`i${k}`, 'p1', 0, k, 0)])),
    ),
  },
  {
    // Unghiurile de aici nu se schimbă prin `((r % 360) + 360) % 360`, deci cazul izolează ordinea compunerii.
    nume: 'D19 rotiri oarecare și matrice neexacte, compuse pe șase niveluri (egal la bit cu oracolul)',
    doc: doc(
      [piesa('p1', grup('g1', M(0.8, 0.6, -0.6, 0.8, 0.1, 0.2), [
        grup('g2', M(1.1, 0.3, -0.2, 0.9, 1 / 3, -2 / 7), [
          grup('g3', M(0.7071067811865476, 0.7071067811865475, -0.7071067811865475, 0.7071067811865476, 12.345, 6.789), [
            grup('g4', M(1.5, 0, 0.25, 0.75, -3.3, 4.4), [
              grup('g5', M(0.9998476951563913, 0.01745240643728351, -0.01745240643728351, 0.9998476951563913, 0.001, 0.002), [
                el('e', M(1.01, 0.02, 0.03, 0.99, 7.7, 8.8)), el('f', M(2.2, 0, 0, 0.45, 0.1, 0.3)),
              ]),
            ]),
          ]),
        ]),
      ]))],
      [foaie('f1', [inst('i1', 'p1', 123.456, 789.012, 45), inst('i2', 'p1', -0.1, 0.7, 30.5), inst('i3', 'p1', 1e6 / 3, 7, 359.999999)])],
    ),
  },
  {
    // Un r deja în [0, 360) e „adus în [0, 360)” fără nicio operație; `((r % 360) + 360) % 360` l-ar muta în ultimii
    // biți (89,9 → 89,89999999999998), iar cosinusul s-ar schimba.
    nume: 'D20 rotiri neîntregi deja în [0, 360) se folosesc neschimbate (89,9; 270,3; 0,1; 123,456)',
    doc: doc(
      [piesa('p1', el('e1', T(10, 0)))],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 89.9), inst('i2', 'p1', 0, 0, 270.3), inst('i3', 'p1', 0, 0, 0.1), inst('i4', 'p1', 0, 0, 123.456)])],
    ),
  },
  {
    nume: 'D21 nume de 200 de caractere pe piesă, pe nod și pe foaie',
    doc: doc(
      [{ ...piesa('p1', { ...el('e1', I()), nume: 'ă'.repeat(200) }), nume: 'x'.repeat(200) }],
      [{ ...foaie('f1', [inst('i1', 'p1', 0, 0, 0)]), nume: 'Z'.repeat(200) }],
    ),
  },
  {
    nume: 'D22 forme cu arce sub similitudini (rotire cu scalare, oglindire); dreptunghi rotunjit cu 2 · razaColt = latura mică',
    doc: doc(
      [piesa('p1', grup('g', I(), [
        el('c1', M(0, 3, -3, 0, 0, 0), cerc()),
        el('c2', M(-2, 0, 0, 2, 50, 0), cerc()),
        el('r1', M(0.6, 0.8, -0.8, 0.6, 100, 0), dr(100, 50, 25)),
        el('r2', T(200, 0), dr(100, 50, 25)),
      ]))],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 90)])],
    ),
  },
  {
    // p1: local 2 × 1, apoi 1 × 2: compus 2 × 2, similitudine. p2: d = 1 + 1e−13, în toleranța 1e−12. p3: cinci rotiri
    // neexacte de 0,1 rad compuse.
    nume: 'D23 cerc sub similitudini compuse din matrice neuniforme, în toleranță, sub rotiri neexacte',
    doc: doc(
      [
        piesa('p1', grup('g', M(2, 0, 0, 1, 0, 0), [el('c', M(1, 0, 0, 2, 0, 0), cerc())])),
        piesa('p2', el('c', M(1, 0, 0, 1 + 1e-13, 0, 0), cerc())),
        piesa('p3', lantCerc(5, M(0.9950041652780258, 0.09983341664682815, -0.09983341664682815, 0.9950041652780258, 1, 0))),
      ],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0), inst('i2', 'p2', 0, 0, 45), inst('i3', 'p3', 5, 5, 0)])],
    ),
  },
  { nume: 'D24 JSON adânc de exact 200 de niveluri (un câmp de sus)', doc: { ...baza(), adanc: adanc(199) } },
  {
    nume: 'D25 campuri la plafon: 200 de chei, o cheie de 200 de caractere, o valoare de 10 000',
    doc: doc([piesa('p1', el('e1', I()))], [foaie('f1', [{
      ...inst('i1', 'p1', 0, 0, 0),
      campuri: Object.fromEntries([...Array.from({ length: 199 }, (_, k) => [`k${k}`, 'v']), ['K'.repeat(200), 'v'.repeat(10_000)]]),
    }])]),
  },
  { nume: 'D26 rev 2^53 − 1 (cel mai mare întreg sigur)', doc: { ...baza(), rev: Number.MAX_SAFE_INTEGER } },
];
