/**
 * CAZURILE oracolului documentului (ADR 0024 + 0025 + 0027 + 0028 + 0029, documentul v6), cu ZERO importuri din `src/`:
 * - `CAZURI_HARTIE`: documente v2 cu punctele în lume calculate de mână, pe hârtie, scrise ca numere (nu calculate
 *   aici). Coordonatele sunt întregi sau puteri ale lui 2, ca egalitatea să fie exactă (`===`). La ușă se migrează la
 *   v4, iar geometria nu se schimbă;
 * - `CAZURI_TAIETURI`: documente v3 (și unul v2), care la ușă primesc `sens: 'urcare'`, și documente v4 cu ambele
 *   sensuri, cu lista tăieturilor unei foi scrisă de mână, câmp cu câmp (și sensul), ca literal;
 * - `MIGRARI_HARTIE` (v1 → v4, în lanț), `MIGRARI_V2_HARTIE` (v2 → v4) și `MIGRARI_V3_HARTIE` (v3 → v4): documentul
 *   cerut de contracte, scris de mână;
 * - `CORPUS_V1`, `CORPUS_V2`, `CORPUS_V3`, `CORPUS_V4`: documente valide, scrise de mână (capcanele) și generate cu un
 *   PRNG propriu, determinist; v1, v2 și v3 trebuie să se migreze la v4;
 * - `REFUZATE_V1`, `REFUZATE_V2`, `REFUZATE_V3`: documente vechi pe care ușa le refuză, fiecare cu singura categorie
 *   raportată (v3: o operație care are deja `sens`);
 * - `OTRAVURI_V2`, `OTRAVURI_V3`, `OTRAVURI_V4`: documente nevalide, fiecare cu singura categorie pe care trebuie s-o
 *   raporteze oracolul (`OTRAVURI_V3` = otrăvurile v2 aduse la forma v3, plus cele ale operațiilor; `OTRAVURI_V4` =
 *   aceleași aduse la forma v4, plus cele ale sensului);
 * - `VALIDE_DIFICILE` (v2), `VALIDE_DIFICILE_V3` și `VALIDE_DIFICILE_V4`: documente valide care seamănă cu niște otrăvuri;
 * - v5 (ADR 0028, la sfârșitul fișierului): `MIGRARI_V4_HARTIE` (v4 → v5 pe hârtie), `CORPUS_V5` (generat), `REFUZATE_V4`
 *   (o operație v4 sau v3 care are deja `urechi`: ciocnire), `OTRAVURI_V5` (cele v4 aduse la v5, plus `OTRAVURI_URECHI`,
 *   doar `[urechi]`) și `VALIDE_DIFICILE_V5`. Capcanele `urechi` scrise pe operații înainte de ADR 0028 (MV3-01, W10 și
 *   corpusul v3 / v4) sunt acum ciocniri: `areUrechiPeOperatii` le găsește, `faraUrechiPeOperatii` le mută în
 *   `urechiVechi`, ca restul documentului să treacă mai departe.
 * - v6 (ADR 0029, felia 2.5a, tot la sfârșit): `MIGRARI_V5_HARTIE` (v5 → v6 pe hârtie), `CORPUS_V6` (generat),
 *   `REFUZATE_V5` (o operație v5, v4 sau v3 care are deja `rampa`: ciocnire), `OTRAVURI_V6` (cele v5 aduse la v6, plus
 *   `OTRAVURI_RAMPA`, doar `[rampa]`) și `VALIDE_DIFICILE_V6`. Niciun corpus mai vechi nu are `rampa` pe operații.
 */
import type {
  CategorieO, DocV1O, DocV2O, DocV3O, DocV4O, DocV5O, DocV6O, ElementO, ElementV1O, FoaieO, GrupO, InstantaO, LaturaO, Liber,
  MatriceO, NodO, OperatieO, OperatieV4O, OperatieV5O, OperatieV6O, PiesaO, PiesaV3O, PiesaV4O, PiesaV5O, PiesaV6O, PunctO,
  RampaO, SculaO, SensO, TaieturaV4O, UrechiO,
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

// v3.
/** Scula implicită a migrării și a celor mai multe cazuri. */
const S1 = (): SculaO => ({ numar: 1, nume: 'freza plata', diametru: 6 });
const S2 = (): SculaO => ({ numar: 2, nume: 'V 90', diametru: 3.175 });
const S3 = (): SculaO => ({ numar: 3, nume: 'freza 8', diametru: 8 });
const op = (id: string, noduri: string[], latura: LaturaO, adancime = 3, pas = 3, scula: SculaO = S1()): OperatieO => ({
  id, tip: 'profil', noduri, scula, latura, adancime, pas,
});
const piesa3 = (id: string, radacina: NodO, operatii: OperatieO[]): PiesaV3O => ({ id, radacina, operatii });
const doc3 = (piese: PiesaV3O[], foi: FoaieO[]): DocV3O => ({ schema: 3, rev: 0, piese, foi });

// v4 (ADR 0027).
const op4 = (id: string, noduri: string[], latura: LaturaO, sens: SensO, adancime = 3, pas = 3, scula: SculaO = S1()): OperatieV4O => ({
  id, tip: 'profil', noduri, scula, latura, adancime, pas, sens,
});
const piesa4 = (id: string, radacina: NodO, operatii: OperatieV4O[]): PiesaV4O => ({ id, radacina, operatii });
const doc4 = (piese: PiesaV4O[], foi: FoaieO[]): DocV4O => ({ schema: 4, rev: 0, piese, foi });
const esteObiectL = (v: unknown): v is Liber => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Forma v4 a unui document v3 (sau a unei otrăvi v3): schema 3 devine 4 („3” devine „4”; altă schemă greșită rămâne
 * greșită) și fiecare operație-obiect care n-are `sens` primește sensul dat de `sens(k)` (k = al câtelea, în tot
 * documentul). Pe loc; întoarce documentul.
 */
const laV4 = (d: unknown, sens: (k: number) => SensO = () => 'urcare'): unknown => {
  if (!esteObiectL(d)) return d;
  if (d['schema'] === 3) d['schema'] = 4;
  else if (d['schema'] === '3') d['schema'] = '4';
  const piese = d['piese'];
  let k = 0;
  if (Array.isArray(piese)) {
    for (const p of piese) {
      if (!esteObiectL(p) || !Array.isArray(p['operatii'])) continue;
      for (const o of p['operatii'] as unknown[]) if (esteObiectL(o) && !Object.hasOwn(o, 'sens')) o['sens'] = sens(k++);
    }
  }
  return d;
};
/** Sensurile pe rând (urcare, opoziție, urcare, …): un v4 valid cu ambele valori. */
const alternant = (k: number): SensO => (k % 2 === 0 ? 'urcare' : 'opozitie');

// ---------------------------------------------------------------------------------------------------------------
// Pe hârtie: geometria (documente v2; ușa le migrează, geometria rămâne).

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
// Pe hârtie: tăieturile (ADR 0025, cu sensul din ADR 0027). Fiecare tăietură e scrisă de mână, câmp cu câmp;
// matricele sunt calculate pe hârtie (comentariile), cu rotiri exacte, ca egalitatea să fie `===` (−0 = 0).

export type CazTaieturi = {
  readonly nume: string;
  /**
   * Un v3 (la ușă, fiecare operație primește `urcare`); T08 e un v2, ale cărui tăieturi vin din operațiile implicite
   * ale migrării; T10–T12 sunt v4, cu ambele sensuri.
   */
  readonly doc: DocV4O | DocV3O | DocV2O;
  readonly indexFoaie: number;
  /** Toate tăieturile foii, în ordine, fiecare cu sensul operației ei. */
  readonly taieturi: readonly TaieturaV4O[];
};

/** O tăietură scrisă de mână (fiecare argument e o valoare literală; `idLume` se scrie, nu se calculează). */
const t = (
  idLume: string, instanta: string, piesaT: string, operatie: string, nod: string, latura: LaturaO,
  adancime: number, pas: number, scula: SculaO, forma: Liber, matrice: MatriceO, sens: SensO,
): TaieturaV4O => ({ idLume, instanta, piesa: piesaT, operatie, nod, latura, adancime, pas, scula, forma, matrice, sens });

/** T05: trei piese (una fără operații), două foi. */
const docT05 = (): DocV3O => doc3(
  [
    piesa3('pA', el('e', I(), cerc(4)), [op('o', ['e'], 'interior', 6, 3)]),
    piesa3('pB', grup('g', T(5, 5), [el('x', T(1, 0)), el('y', T(0, 1))]), [op('k', ['y', 'x'], 'exterior', 18, 6, S3())]),
    piesa3('pC', el('z', I()), []),
  ],
  [
    foaie('f1', [inst('iA1', 'pA', 0, 0, 0)]),
    foaie('f2', [inst('iB', 'pB', 100, 0, 270), inst('iC', 'pC', 0, 0, 0), inst('iA2', 'pA', 50, 50, 90)]),
  ],
);

/** T07: un element fără operație nu se taie; trei foi. */
const docT07 = (): DocV3O => doc3(
  [piesa3('pX', el('e', T(3, 4)), [op('o', ['e'], 'exterior')]), piesa3('pY', el('e', I(), cerc()), [])],
  [
    foaie('f1', [inst('iY', 'pY', 0, 0, 0)]),
    foaie('f2', []),
    foaie('f3', [inst('iX', 'pX', 10, 10, 0), inst('iY2', 'pY', 0, 0, 0)]),
  ],
);

export const CAZURI_TAIETURI: readonly CazTaieturi[] = [
  {
    // Instanța: T(100, 50). r = T(10, 0) → (110, 50); c = T(0, 10) → (100, 60); l = T(5, 5) → (105, 55).
    // Operațiile, în ordinea piesei: ext, pe linie, int; tăieturile: int, pe linie, ext.
    nume: 'T01 ordinea claselor: interior, pe-linie, exterior (operațiile piesei sunt invers)',
    doc: doc3(
      [piesa3(
        'p1',
        grup('g', I(), [el('r', T(10, 0)), el('c', T(0, 10), cerc()), el('l', T(5, 5))]),
        [op('o-ext', ['r'], 'exterior', 18, 6), op('o-lin', ['l'], 'pe-linie', 2, 1), op('o-int', ['c'], 'interior', 10, 5)],
      )],
      [foaie('f1', [inst('i1', 'p1', 100, 50, 0)])],
    ),
    indexFoaie: 0,
    taieturi: [
      t('i1/c', 'i1', 'p1', 'o-int', 'c', 'interior', 10, 5, S1(), cerc(), M(1, 0, 0, 1, 100, 60), 'urcare'),
      t('i1/l', 'i1', 'p1', 'o-lin', 'l', 'pe-linie', 2, 1, S1(), dr(), M(1, 0, 0, 1, 105, 55), 'urcare'),
      t('i1/r', 'i1', 'p1', 'o-ext', 'r', 'exterior', 18, 6, S1(), dr(), M(1, 0, 0, 1, 110, 50), 'urcare'),
    ],
  },
  {
    // i2 = T(200, 100) ∘ R90 = (0, 1, −1, 0, 200, 100): a = T(10, 0) → (200 − 0, 100 + 10) = (200, 110);
    // b = T(0, 20) → (200 − 20, 100 + 0) = (180, 100). În clasă: i1 (g1, g2), apoi i2 (g1, g2), nu g1 pe ambele.
    nume: 'T02 două instanțe ale aceleiași piese, două operații în aceeași clasă: instanța înaintea operației',
    doc: doc3(
      [piesa3(
        'p1',
        grup('g', I(), [el('a', T(10, 0), cerc()), el('b', T(0, 20), cerc(3)), el('r', I(), dr())]),
        [op('g1', ['a'], 'interior', 5, 5), op('g2', ['b'], 'interior', 6, 3), op('contur', ['r'], 'exterior', 18, 6)],
      )],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0), inst('i2', 'p1', 200, 100, 90)])],
    ),
    indexFoaie: 0,
    taieturi: [
      t('i1/a', 'i1', 'p1', 'g1', 'a', 'interior', 5, 5, S1(), cerc(), M(1, 0, 0, 1, 10, 0), 'urcare'),
      t('i1/b', 'i1', 'p1', 'g2', 'b', 'interior', 6, 3, S1(), cerc(3), M(1, 0, 0, 1, 0, 20), 'urcare'),
      t('i2/a', 'i2', 'p1', 'g1', 'a', 'interior', 5, 5, S1(), cerc(), M(0, 1, -1, 0, 200, 110), 'urcare'),
      t('i2/b', 'i2', 'p1', 'g2', 'b', 'interior', 6, 3, S1(), cerc(3), M(0, 1, -1, 0, 180, 100), 'urcare'),
      t('i1/r', 'i1', 'p1', 'contur', 'r', 'exterior', 18, 6, S1(), dr(), M(1, 0, 0, 1, 0, 0), 'urcare'),
      t('i2/r', 'i2', 'p1', 'contur', 'r', 'exterior', 18, 6, S1(), dr(), M(0, 1, -1, 0, 200, 100), 'urcare'),
    ],
  },
  {
    // Instanța T(10, 20) ∘ R180 = (−1, 0, −0, −1, 10, 20); rădăcina e elementul (identitate). Trei tăieturi cu același
    // idLume, câte una pe operație; operația „r” are id-ul nodului (spații de nume separate).
    nume: 'T03 trei operații pe același element (clase diferite, altă sculă la marcaj): același idLume de trei ori',
    doc: doc3(
      [piesa3(
        'p1',
        el('r', I(), dr(100, 50, 0)),
        [op('marcaj', ['r'], 'pe-linie', 1, 1, S2()), op('decupare', ['r'], 'exterior', 18, 6), op('r', ['r'], 'interior', 0.5, 0.5)],
      )],
      [foaie('f1', [inst('i1', 'p1', 10, 20, 180)])],
    ),
    indexFoaie: 0,
    taieturi: [
      t('i1/r', 'i1', 'p1', 'r', 'r', 'interior', 0.5, 0.5, S1(), dr(100, 50, 0), M(-1, 0, 0, -1, 10, 20), 'urcare'),
      t('i1/r', 'i1', 'p1', 'marcaj', 'r', 'pe-linie', 1, 1, S2(), dr(100, 50, 0), M(-1, 0, 0, -1, 10, 20), 'urcare'),
      t('i1/r', 'i1', 'p1', 'decupare', 'r', 'exterior', 18, 6, S1(), dr(100, 50, 0), M(-1, 0, 0, -1, 10, 20), 'urcare'),
    ],
  },
  {
    // G = T(1000, 0); H = G ∘ R90 = (0, 1, −1, 0, 1000, 0); n1 = H ∘ T(10, 0) = (0, 1, −1, 0, 1000, 10);
    // n2 = G ∘ T(0, 5) = (1, 0, 0, 1, 1000, 5); n3 = G. Preordinea e n1, n2, n3, n4; operația cere n2, apoi n1. n4 n-are
    // operație.
    nume: 'T04 o operație cu două noduri: în ordinea operației (n2, n1), nu în preordine; un element fără operație',
    doc: doc3(
      [piesa3(
        'p1',
        grup('G', T(1000, 0), [
          grup('H', M(0, 1, -1, 0, 0, 0), [el('n1', T(10, 0), cerc(2))]),
          el('n2', T(0, 5), cerc(2)),
          el('n3', I(), dr()),
          el('n4', T(7, 7), dr()),
        ]),
        [op('gauri', ['n2', 'n1'], 'interior', 12, 4), op('o3', ['n3'], 'exterior', 18, 9)],
      )],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ),
    indexFoaie: 0,
    taieturi: [
      t('i1/n2', 'i1', 'p1', 'gauri', 'n2', 'interior', 12, 4, S1(), cerc(2), M(1, 0, 0, 1, 1000, 5), 'urcare'),
      t('i1/n1', 'i1', 'p1', 'gauri', 'n1', 'interior', 12, 4, S1(), cerc(2), M(0, 1, -1, 0, 1000, 10), 'urcare'),
      t('i1/n3', 'i1', 'p1', 'o3', 'n3', 'exterior', 18, 9, S1(), dr(), M(1, 0, 0, 1, 1000, 0), 'urcare'),
    ],
  },
  {
    // iA2 = T(50, 50) ∘ R90 = (0, 1, −1, 0, 50, 50). iB = T(100, 0) ∘ R270 = (0, −1, 1, 0, 100, 0);
    // g = iB ∘ T(5, 5) = (0, −1, 1, 0, 105, −5); x = g ∘ T(1, 0) = (…, 105, −6); y = g ∘ T(0, 1) = (…, 106, −5).
    // iC (piesa fără operații) nu dă nimic; iA1 stă pe prima foaie.
    nume: 'T05 a doua foaie (indexFoaie 1): rotiri 90 și 270, o piesă fără operații, altă sculă',
    doc: docT05(),
    indexFoaie: 1,
    taieturi: [
      t('iA2/e', 'iA2', 'pA', 'o', 'e', 'interior', 6, 3, S1(), cerc(4), M(0, 1, -1, 0, 50, 50), 'urcare'),
      t('iB/y', 'iB', 'pB', 'k', 'y', 'exterior', 18, 6, S3(), dr(), M(0, -1, 1, 0, 106, -5), 'urcare'),
      t('iB/x', 'iB', 'pB', 'k', 'x', 'exterior', 18, 6, S3(), dr(), M(0, -1, 1, 0, 105, -6), 'urcare'),
    ],
  },
  {
    nume: 'T05b prima foaie a aceluiași document nu vede foaia a doua',
    doc: docT05(),
    indexFoaie: 0,
    taieturi: [t('iA1/e', 'iA1', 'pA', 'o', 'e', 'interior', 6, 3, S1(), cerc(4), M(1, 0, 0, 1, 0, 0), 'urcare')],
  },
  {
    // Instanțele: z9, a1, m5 (nu după id); operațiile lui pZ: z, b, a (nu după id). m = T(1, 0), a = T(2, 0), k = I.
    nume: 'T06 ordinea foii și a piesei, nu a id-urilor; două piese întrețesute în aceeași clasă',
    doc: doc3(
      [
        piesa3(
          'pZ',
          grup('G', I(), [el('m', T(1, 0), cerc(1)), el('a', T(2, 0))]),
          [op('z', ['a'], 'pe-linie', 1, 1), op('b', ['m'], 'interior', 4, 2), op('a', ['m'], 'interior', 2, 2)],
        ),
        piesa3('pA', el('k', I()), [op('k', ['k'], 'interior', 3, 3)]),
      ],
      [foaie('f1', [inst('z9', 'pZ', 0, 0, 0), inst('a1', 'pA', 1000, 0, 0), inst('m5', 'pZ', 0, 500, 0)])],
    ),
    indexFoaie: 0,
    taieturi: [
      t('z9/m', 'z9', 'pZ', 'b', 'm', 'interior', 4, 2, S1(), cerc(1), M(1, 0, 0, 1, 1, 0), 'urcare'),
      t('z9/m', 'z9', 'pZ', 'a', 'm', 'interior', 2, 2, S1(), cerc(1), M(1, 0, 0, 1, 1, 0), 'urcare'),
      t('a1/k', 'a1', 'pA', 'k', 'k', 'interior', 3, 3, S1(), dr(), M(1, 0, 0, 1, 1000, 0), 'urcare'),
      t('m5/m', 'm5', 'pZ', 'b', 'm', 'interior', 4, 2, S1(), cerc(1), M(1, 0, 0, 1, 1, 500), 'urcare'),
      t('m5/m', 'm5', 'pZ', 'a', 'm', 'interior', 2, 2, S1(), cerc(1), M(1, 0, 0, 1, 1, 500), 'urcare'),
      t('z9/a', 'z9', 'pZ', 'z', 'a', 'pe-linie', 1, 1, S1(), dr(), M(1, 0, 0, 1, 2, 0), 'urcare'),
      t('m5/a', 'm5', 'pZ', 'z', 'a', 'pe-linie', 1, 1, S1(), dr(), M(1, 0, 0, 1, 2, 500), 'urcare'),
    ],
  },
  {
    nume: 'T07a o foaie cu o singură instanță, a unei piese fără operații: nicio tăietură',
    doc: docT07(),
    indexFoaie: 0,
    taieturi: [],
  },
  {
    nume: 'T07b o foaie fără instanțe: nicio tăietură',
    doc: docT07(),
    indexFoaie: 1,
    taieturi: [],
  },
  {
    // iX = T(10, 10); e = T(3, 4) → (13, 14). iY2 (fără operații) nu dă nimic.
    nume: 'T07c doar elementul cu operație se taie',
    doc: docT07(),
    indexFoaie: 2,
    taieturi: [t('iX/e', 'iX', 'pX', 'o', 'e', 'exterior', 3, 3, S1(), dr(), M(1, 0, 0, 1, 13, 14), 'urcare')],
  },
  {
    // Un v2: migrarea dă r → exterior 3 3, c → interior 8 4, c2 → interior 8 4, scula { 1, 'freza plata', 6 }.
    // i1 = T(100, 100): c = T(20, 10) → (120, 110), r = I → (100, 100). i2 = R90: c2 = (0, 1, −1, 0, 0, 0).
    nume: 'T08 dintr-un v2: operațiile implicite ale migrării, cercurile întâi',
    doc: doc(
      [piesa('p1', grup('g', I(), [el('r', I()), el('c', T(20, 10), cerc())])), piesa('p2', el('c2', I(), cerc(3)))],
      [foaie('f1', [inst('i1', 'p1', 100, 100, 0), inst('i2', 'p2', 0, 0, 90)])],
    ),
    indexFoaie: 0,
    taieturi: [
      t('i1/c', 'i1', 'p1', 'c', 'c', 'interior', 8, 4, { numar: 1, nume: 'freza plata', diametru: 6 }, cerc(), M(1, 0, 0, 1, 120, 110), 'urcare'),
      t('i2/c2', 'i2', 'p2', 'c2', 'c2', 'interior', 8, 4, { numar: 1, nume: 'freza plata', diametru: 6 }, cerc(3), M(0, 1, -1, 0, 0, 0), 'urcare'),
      t('i1/r', 'i1', 'p1', 'r', 'r', 'exterior', 3, 3, { numar: 1, nume: 'freza plata', diametru: 6 }, dr(), M(1, 0, 0, 1, 100, 100), 'urcare'),
    ],
  },
  {
    // g = (−1, 0, 0, 1, 50, 0) (oglindire). i1 (identitate): r = g ∘ T(10, 0) = (−1, 0, 0, 1, 40, 0), determinant −1;
    // c = g ∘ (1, 0, 0, −1, 0, 30) = (−1, 0, −0, −1, 50, 30). i2 = R90 + (0, 100): g → (−0, −1, −1, 0, 0, 150);
    // r → (−0, −1, −1, 0, 0, 140), determinant −1; c → (−0, −1, 1, −0, −30, 150).
    // Latura e a formei: sub oglindire, „exterior” rămâne afară (CAM-ul nu are voie să o întoarcă după sensul conturului).
    nume: 'T09 oglindire în arbore (determinant −1): latura rămâne a formei, matricea se dă așa cum e',
    doc: doc3(
      [piesa3(
        'p1',
        grup('g', M(-1, 0, 0, 1, 50, 0), [el('r', T(10, 0), dr(20, 10, 2)), el('c', M(1, 0, 0, -1, 0, 30), cerc(5))]),
        [op('contur', ['r'], 'exterior', 18, 6), op('gaura', ['c'], 'interior', 18, 6)],
      )],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0), inst('i2', 'p1', 0, 100, 90)])],
    ),
    indexFoaie: 0,
    taieturi: [
      t('i1/c', 'i1', 'p1', 'gaura', 'c', 'interior', 18, 6, S1(), cerc(5), M(-1, 0, 0, -1, 50, 30), 'urcare'),
      t('i2/c', 'i2', 'p1', 'gaura', 'c', 'interior', 18, 6, S1(), cerc(5), M(0, -1, 1, 0, -30, 150), 'urcare'),
      t('i1/r', 'i1', 'p1', 'contur', 'r', 'exterior', 18, 6, S1(), dr(20, 10, 2), M(-1, 0, 0, 1, 40, 0), 'urcare'),
      t('i2/r', 'i2', 'p1', 'contur', 'r', 'exterior', 18, 6, S1(), dr(20, 10, 2), M(0, -1, -1, 0, 0, 140), 'urcare'),
    ],
  },
  {
    // ADR 0027: sensul e al operației. Degroșarea și finisarea aceluiași contur, aceeași latură și aceeași adâncime, în
    // sensuri diferite (motivul din „Ce am respins”); `pe-linie` își păstrează câmpul. i1 = T(100, 50): c = T(20, 10)
    // → (120, 60); l = T(5, 5) → (105, 55); r = I → (100, 50). Clasele: interior, pe-linie, exterior; în exterior,
    // operațiile în ordinea piesei (deg, apoi fin).
    nume: 'T10 v4: degroșare în urcare și finisare în opoziție pe același contur; gaura în opoziție; pe-linie în opoziție',
    doc: doc4(
      [piesa4(
        'p1',
        grup('g', I(), [el('r', I(), dr()), el('c', T(20, 10), cerc()), el('l', T(5, 5))]),
        [
          op4('deg', ['r'], 'exterior', 'urcare', 6, 3), op4('fin', ['r'], 'exterior', 'opozitie', 6, 6),
          op4('g', ['c'], 'interior', 'opozitie', 8, 4), op4('m', ['l'], 'pe-linie', 'opozitie', 1, 1),
        ],
      )],
      [foaie('f1', [inst('i1', 'p1', 100, 50, 0)])],
    ),
    indexFoaie: 0,
    taieturi: [
      t('i1/c', 'i1', 'p1', 'g', 'c', 'interior', 8, 4, S1(), cerc(), M(1, 0, 0, 1, 120, 60), 'opozitie'),
      t('i1/l', 'i1', 'p1', 'm', 'l', 'pe-linie', 1, 1, S1(), dr(), M(1, 0, 0, 1, 105, 55), 'opozitie'),
      t('i1/r', 'i1', 'p1', 'deg', 'r', 'exterior', 6, 3, S1(), dr(), M(1, 0, 0, 1, 100, 50), 'urcare'),
      t('i1/r', 'i1', 'p1', 'fin', 'r', 'exterior', 6, 6, S1(), dr(), M(1, 0, 0, 1, 100, 50), 'opozitie'),
    ],
  },
  {
    // Același arbore oglindit ca T09 (aceleași matrice, calculate acolo), cu sensurile schimbate: oglindirea nu atinge
    // sensul, care e al operației (contorul trebuie să-l întoarcă CAM-ul, nu documentul).
    nume: 'T11 v4 oglindit (determinant −1): sensul rămâne al operației, pe ambele instanțe',
    doc: doc4(
      [piesa4(
        'p1',
        grup('g', M(-1, 0, 0, 1, 50, 0), [el('r', T(10, 0), dr(20, 10, 2)), el('c', M(1, 0, 0, -1, 0, 30), cerc(5))]),
        [op4('contur', ['r'], 'exterior', 'opozitie', 18, 6), op4('gaura', ['c'], 'interior', 'urcare', 18, 6)],
      )],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0), inst('i2', 'p1', 0, 100, 90)])],
    ),
    indexFoaie: 0,
    taieturi: [
      t('i1/c', 'i1', 'p1', 'gaura', 'c', 'interior', 18, 6, S1(), cerc(5), M(-1, 0, 0, -1, 50, 30), 'urcare'),
      t('i2/c', 'i2', 'p1', 'gaura', 'c', 'interior', 18, 6, S1(), cerc(5), M(0, -1, 1, 0, -30, 150), 'urcare'),
      t('i1/r', 'i1', 'p1', 'contur', 'r', 'exterior', 18, 6, S1(), dr(20, 10, 2), M(-1, 0, 0, 1, 40, 0), 'opozitie'),
      t('i2/r', 'i2', 'p1', 'contur', 'r', 'exterior', 18, 6, S1(), dr(20, 10, 2), M(0, -1, -1, 0, 0, 140), 'opozitie'),
    ],
  },
  {
    // Ca T05 (a doua foaie, aceleași matrice), cu o operație în opoziție și una în urcare, pe piese diferite.
    nume: 'T12 v4 a doua foaie: sensul vine din piesa fiecărei instanțe (pA în opoziție, pB în urcare)',
    doc: doc4(
      [
        piesa4('pA', el('e', I(), cerc(4)), [op4('o', ['e'], 'interior', 'opozitie', 6, 3)]),
        piesa4('pB', grup('g', T(5, 5), [el('x', T(1, 0)), el('y', T(0, 1))]), [op4('k', ['y', 'x'], 'exterior', 'urcare', 18, 6, S3())]),
        piesa4('pC', el('z', I()), []),
      ],
      [
        foaie('f1', [inst('iA1', 'pA', 0, 0, 0)]),
        foaie('f2', [inst('iB', 'pB', 100, 0, 270), inst('iC', 'pC', 0, 0, 0), inst('iA2', 'pA', 50, 50, 90)]),
      ],
    ),
    indexFoaie: 1,
    taieturi: [
      t('iA2/e', 'iA2', 'pA', 'o', 'e', 'interior', 6, 3, S1(), cerc(4), M(0, 1, -1, 0, 50, 50), 'opozitie'),
      t('iB/y', 'iB', 'pB', 'k', 'y', 'exterior', 18, 6, S3(), dr(), M(0, -1, 1, 0, 106, -5), 'urcare'),
      t('iB/x', 'iB', 'pB', 'k', 'x', 'exterior', 18, 6, S3(), dr(), M(0, -1, 1, 0, 105, -6), 'urcare'),
    ],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Migrări pe hârtie: documentul v4 scris de mână, din textul contractelor (v1 → v2 → v3 → v4, în lanț): operațiile
// implicite ale lui v3, fiecare cu `sens: 'urcare'` (ADR 0027 §5).

export const MIGRARI_HARTIE: ReadonlyArray<{ readonly nume: string; readonly v1: DocV1O; readonly v4: Liber }> = [
  {
    nume: 'M01 gol',
    v1: { schema: 1, rev: 0, foaie: { latime: 100, inaltime: 100, grosime: 10 }, elemente: [] },
    v4: { schema: 4, rev: 0, piese: [], foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 10 }, instante: [] }] },
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
    v4: {
      schema: 4, rev: 7, autor: 'A',
      piese: [
        {
          id: 'a', nume: 'Raft',
          radacina: {
            tip: 'element', id: 'a', forma: { tip: 'dreptunghi', latime: 100, inaltime: 50, razaColt: 5 },
            matrice: { a: 0, b: 1, c: -1, d: 0, e: 0, f: 0 }, strat: 'sus',
          },
          operatii: [{
            id: 'a', tip: 'profil', noduri: ['a'], scula: { numar: 1, nume: 'freza plata', diametru: 6 },
            latura: 'exterior', adancime: 3, pas: 3, sens: 'urcare',
          }],
        },
        {
          id: 'b',
          radacina: { tip: 'element', id: 'b', forma: { tip: 'cerc', raza: 10 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
          operatii: [{
            id: 'b', tip: 'profil', noduri: ['b'], scula: { numar: 1, nume: 'freza plata', diametru: 6 },
            latura: 'interior', adancime: 8, pas: 4, sens: 'urcare',
          }],
        },
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
    v4: {
      schema: 4, rev: 3,
      piese: [{
        id: 'f1',
        radacina: { tip: 'element', id: 'f1', forma: { tip: 'cerc', raza: 2 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, x: 99, rotire: 45, piesa: 'q' },
        operatii: [{
          id: 'f1', tip: 'profil', noduri: ['f1'], scula: { numar: 1, nume: 'freza plata', diametru: 6 },
          latura: 'interior', adancime: 8, pas: 4, sens: 'urcare',
        }],
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
    v4: {
      schema: 4, rev: 5,
      piese: [{
        id: 'a',
        radacina: {
          tip: 'element', id: 'a', forma: { tip: 'cerc', raza: 1 },
          matrice: { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0, nota: 'm' }, copii: [{ tip: 'element', id: 'x' }],
        },
        operatii: [{
          id: 'a', tip: 'profil', noduri: ['a'], scula: { numar: 1, nume: 'freza plata', diametru: 6 },
          latura: 'interior', adancime: 8, pas: 4, sens: 'urcare',
        }],
      }],
      foi: [{ id: 'f1', stoc: { latime: 10, inaltime: 10, grosime: 1 }, instante: [{ id: 'a', piesa: 'a', x: 3, y: -4, rotire: 0 }] }],
    },
  },
  {
    // Un câmp necunoscut „operatii” pe elementul v1 ajunge pe RĂDĂCINA piesei (un nod), nu pe piesă: nu e o ciocnire,
    // iar operațiile piesei sunt cele implicite. Unul de sus rămâne sus.
    nume: 'M05 câmpul operatii pe elementul v1 și pe primul nivel (nu e ciocnire în lanț)',
    v1: {
      schema: 1, rev: 2, operatii: 'sus',
      foaie: { latime: 10, inaltime: 10, grosime: 1 },
      elemente: [{ id: 'e', forma: { tip: 'dreptunghi', latime: 4, inaltime: 2, razaColt: 0 }, matrice: M(1, 0, 0, 1, 1, 1), operatii: [{ id: 'x' }] }],
    },
    v4: {
      schema: 4, rev: 2, operatii: 'sus',
      piese: [{
        id: 'e',
        radacina: {
          tip: 'element', id: 'e', forma: { tip: 'dreptunghi', latime: 4, inaltime: 2, razaColt: 0 },
          matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, operatii: [{ id: 'x' }],
        },
        operatii: [{
          id: 'e', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: 'freza plata', diametru: 6 },
          latura: 'exterior', adancime: 3, pas: 3, sens: 'urcare',
        }],
      }],
      foi: [{ id: 'f1', stoc: { latime: 10, inaltime: 10, grosime: 1 }, instante: [{ id: 'e', piesa: 'e', x: 1, y: 1, rotire: 0 }] }],
    },
  },
];

/** Migrări v2 → v4 pe hârtie (ADR 0025 + 0027): o operație pe element, în preordine, cu implicitele formei și `urcare`. */
export const MIGRARI_V2_HARTIE: ReadonlyArray<{ readonly nume: string; readonly v2: DocV2O; readonly v4: Liber }> = [
  {
    nume: 'MV01 un cerc: interior, 8, 4',
    v2: {
      schema: 2, rev: 5,
      piese: [{ id: 'p1', radacina: { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 10 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } } }],
      foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 18 }, instante: [{ id: 'i1', piesa: 'p1', x: 50, y: 50, rotire: 0 }] }],
    },
    v4: {
      schema: 4, rev: 5,
      piese: [{
        id: 'p1',
        radacina: { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 10 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
        operatii: [{
          id: 'c', tip: 'profil', noduri: ['c'], scula: { numar: 1, nume: 'freza plata', diametru: 6 },
          latura: 'interior', adancime: 8, pas: 4, sens: 'urcare',
        }],
      }],
      foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 18 }, instante: [{ id: 'i1', piesa: 'p1', x: 50, y: 50, rotire: 0 }] }],
    },
  },
  {
    nume: 'MV02 un dreptunghi rotunjit, cu nume și câmpuri necunoscute: exterior, 3, 3',
    v2: {
      schema: 2, rev: 11, autor: 'A',
      piese: [{
        id: 'raft', nume: 'Raft', culoare: 'stejar',
        radacina: {
          tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 600, inaltime: 300, razaColt: 10 },
          matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, strat: 'sus',
        },
      }],
      foi: [{
        id: 'f1', stoc: { latime: 2000, inaltime: 1000, grosime: 18 },
        instante: [{ id: 'i1', piesa: 'raft', x: 0, y: 0, rotire: 90, campuri: { cod: 'R1' } }],
      }],
    },
    v4: {
      schema: 4, rev: 11, autor: 'A',
      piese: [{
        id: 'raft', nume: 'Raft', culoare: 'stejar',
        radacina: {
          tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 600, inaltime: 300, razaColt: 10 },
          matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, strat: 'sus',
        },
        operatii: [{
          id: 'r', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 6 },
          latura: 'exterior', adancime: 3, pas: 3, sens: 'urcare',
        }],
      }],
      foi: [{
        id: 'f1', stoc: { latime: 2000, inaltime: 1000, grosime: 18 },
        instante: [{ id: 'i1', piesa: 'raft', x: 0, y: 0, rotire: 90, campuri: { cod: 'R1' } }],
      }],
    },
  },
  {
    nume: 'MV03 un grup cu două elemente (dreptunghi, apoi cerc): operațiile în preordine, nu în ordinea claselor',
    v2: {
      schema: 2, rev: 0,
      piese: [{
        id: 'p1',
        radacina: {
          tip: 'grup', id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
          copii: [
            { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
            { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 5 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 10 } },
          ],
        },
      }],
      foi: [{ id: 'f1', stoc: { latime: 2000, inaltime: 1000, grosime: 18 }, instante: [] }],
    },
    v4: {
      schema: 4, rev: 0,
      piese: [{
        id: 'p1',
        radacina: {
          tip: 'grup', id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
          copii: [
            { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
            { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 5 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 10 } },
          ],
        },
        operatii: [
          {
            id: 'r', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 6 },
            latura: 'exterior', adancime: 3, pas: 3, sens: 'urcare',
          },
          {
            id: 'c', tip: 'profil', noduri: ['c'], scula: { numar: 1, nume: 'freza plata', diametru: 6 },
            latura: 'interior', adancime: 8, pas: 4, sens: 'urcare',
          },
        ],
      }],
      foi: [{ id: 'f1', stoc: { latime: 2000, inaltime: 1000, grosime: 18 }, instante: [] }],
    },
  },
  {
    // Preordinea: n5, n3, n1, n4, n2. „operatii” mai apare sus, pe foaie, pe instanță și pe un nod: nu e ciocnire.
    nume: 'MV04 arbore pe trei niveluri (preordine), o piesă cu grupul gol, câmpul operatii în alte locuri',
    v2: {
      schema: 2, rev: 9, operatii: null,
      piese: [
        {
          id: 'p1',
          radacina: grup('G0', I(), [
            el('n5', T(1, 0), cerc()),
            grup('G1', T(0, 10), [
              { ...el('n3', T(2, 0)), operatii: ['n3'] },
              grup('G2', T(0, 100), [el('n1', T(3, 0), cerc())]),
              el('n4', T(4, 0)),
            ]),
            el('n2', T(5, 0), cerc()),
          ]),
        },
        { id: 'gol', radacina: grup('g', I(), []) },
      ],
      foi: [{
        id: 'f1', operatii: 'foaie', stoc: { latime: 2000, inaltime: 1000, grosime: 18 },
        instante: [{ id: 'i1', piesa: 'p1', x: 0, y: 0, rotire: 0, operatii: 7 }, { id: 'i2', piesa: 'gol', x: 0, y: 0, rotire: 0 }],
      }],
    },
    v4: {
      schema: 4, rev: 9, operatii: null,
      piese: [
        {
          id: 'p1',
          radacina: grup('G0', I(), [
            el('n5', T(1, 0), cerc()),
            grup('G1', T(0, 10), [
              { ...el('n3', T(2, 0)), operatii: ['n3'] },
              grup('G2', T(0, 100), [el('n1', T(3, 0), cerc())]),
              el('n4', T(4, 0)),
            ]),
            el('n2', T(5, 0), cerc()),
          ]),
          operatii: [
            { id: 'n5', tip: 'profil', noduri: ['n5'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 8, pas: 4, sens: 'urcare' },
            { id: 'n3', tip: 'profil', noduri: ['n3'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'exterior', adancime: 3, pas: 3, sens: 'urcare' },
            { id: 'n1', tip: 'profil', noduri: ['n1'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 8, pas: 4, sens: 'urcare' },
            { id: 'n4', tip: 'profil', noduri: ['n4'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'exterior', adancime: 3, pas: 3, sens: 'urcare' },
            { id: 'n2', tip: 'profil', noduri: ['n2'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 8, pas: 4, sens: 'urcare' },
          ],
        },
        { id: 'gol', radacina: grup('g', I(), []), operatii: [] },
      ],
      foi: [{
        id: 'f1', operatii: 'foaie', stoc: { latime: 2000, inaltime: 1000, grosime: 18 },
        instante: [{ id: 'i1', piesa: 'p1', x: 0, y: 0, rotire: 0, operatii: 7 }, { id: 'i2', piesa: 'gol', x: 0, y: 0, rotire: 0 }],
      }],
    },
  },
];

/**
 * Migrări v3 → v4 pe hârtie (ADR 0027 §5): `schema: 4` și `sens: 'urcare'` pe fiecare operație, și pe `pe-linie`; tot
 * restul rămâne, cu câmpurile necunoscute. Un câmp `sens` în altă parte decât pe operație nu e o ciocnire.
 */
export const MIGRARI_V3_HARTIE: ReadonlyArray<{ readonly nume: string; readonly v3: DocV3O; readonly v4: Liber }> = [
  {
    nume: 'MV3-01 trei operații (exterior, interior, pe-linie), câmpuri necunoscute; „sens” pe sculă, nod, piesă, instanță, foaie și sus',
    v3: {
      schema: 3, rev: 12, sens: 'sus',
      piese: [{
        id: 'p1', sens: 'piesa',
        radacina: {
          tip: 'grup', id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, sens: 'nod',
          copii: [
            { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
            { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 5 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 10 }, sens: 'element' },
          ],
        },
        operatii: [
          { id: 'o1', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 6, sens: 'scula' }, latura: 'exterior', adancime: 3, pas: 3, urechi: [] },
          { id: 'o2', tip: 'profil', noduri: ['c'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 8, pas: 4, note: 'gaura' },
          { id: 'o3', tip: 'profil', noduri: ['c', 'r'], scula: { numar: 2, nume: 'V 90', diametru: 3.175 }, latura: 'pe-linie', adancime: 1, pas: 1 },
        ],
      }],
      foi: [{
        id: 'f1', sens: 'foaie', stoc: { latime: 600, inaltime: 400, grosime: 18 },
        instante: [{ id: 'i1', piesa: 'p1', x: 10, y: 10, rotire: 0, sens: 'instanta' }],
      }],
    },
    v4: {
      schema: 4, rev: 12, sens: 'sus',
      piese: [{
        id: 'p1', sens: 'piesa',
        radacina: {
          tip: 'grup', id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, sens: 'nod',
          copii: [
            { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
            { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 5 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 10 }, sens: 'element' },
          ],
        },
        operatii: [
          { id: 'o1', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 6, sens: 'scula' }, latura: 'exterior', adancime: 3, pas: 3, urechi: [], sens: 'urcare' },
          { id: 'o2', tip: 'profil', noduri: ['c'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 8, pas: 4, note: 'gaura', sens: 'urcare' },
          { id: 'o3', tip: 'profil', noduri: ['c', 'r'], scula: { numar: 2, nume: 'V 90', diametru: 3.175 }, latura: 'pe-linie', adancime: 1, pas: 1, sens: 'urcare' },
        ],
      }],
      foi: [{
        id: 'f1', sens: 'foaie', stoc: { latime: 600, inaltime: 400, grosime: 18 },
        instante: [{ id: 'i1', piesa: 'p1', x: 10, y: 10, rotire: 0, sens: 'instanta' }],
      }],
    },
  },
  {
    nume: 'MV3-02 două piese, una fără operații (lista goală rămâne goală), fără instanțe; ordinea operațiilor rămâne',
    v3: {
      schema: 3, rev: 0,
      piese: [
        { id: 'a', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [] },
        {
          id: 'b', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
          operatii: [
            { id: 'z', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 2, pas: 1 },
            { id: 'a', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 4, pas: 1 },
          ],
        },
      ],
      foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 10 }, instante: [] }],
    },
    v4: {
      schema: 4, rev: 0,
      piese: [
        { id: 'a', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [] },
        {
          id: 'b', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
          operatii: [
            { id: 'z', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 2, pas: 1, sens: 'urcare' },
            { id: 'a', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 4, pas: 1, sens: 'urcare' },
          ],
        },
      ],
      foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 10 }, instante: [] }],
    },
  },
  {
    // Cheile capcană rămân date (ADR 0024, precizarea 9), și pe operația care primește `sens`.
    nume: 'MV3-03 chei capcană pe operație și pe sculă (din JSON.parse)',
    v3: JSON.parse(
      '{"schema":3,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":5},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6,"__proto__":"s"},'
      + '"latura":"interior","adancime":8,"pas":4,"__proto__":"x","constructor":"Ion","prototype":"p"}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as DocV3O,
    v4: JSON.parse(
      '{"schema":4,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":5},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6,"__proto__":"s"},'
      + '"latura":"interior","adancime":8,"pas":4,"__proto__":"x","constructor":"Ion","prototype":"p","sens":"urcare"}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as Liber,
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Corpusul v1: valid după schema 1 (`src/model/document.ts` din etapa 1, citit doar pentru format și plafoane).

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
    // Un câmp de sus rămâne la același nivel după migrare: 1 + 199 = 200 de niveluri în v1, în v2 și în v3.
    nume: 'C27 JSON adânc de exact 200 de niveluri (un câmp de sus)',
    doc: { ...v1([elV1('e1', I())]), adanc: adanc(199) },
  },
  {
    // ADR 0025, în lanț: câmpul elementului ajunge pe rădăcina piesei (un nod), deci piesa v2 n-are „operatii”.
    nume: 'C28 un câmp necunoscut operatii pe element și pe primul nivel (nu e ciocnire în lanț)',
    doc: v1([elV1('e1', T(1, 1), dr(), { operatii: [{ id: 'o', latura: 'interior' }] }), elV1('e2', I(), cerc())], { operatii: 'sus' }),
  },
  {
    // Câmpuri cu numele parametrilor pe element și în formă: migrarea nu le citește, implicitele vin din `forma.tip`.
    nume: 'C29 câmpuri latura, adancime, pas, scula pe element și în formă (ignorate de migrare)',
    doc: v1([
      elV1('c', T(5, 5), { tip: 'cerc', raza: 2, latura: 'exterior', adancime: 30 }, { latura: 'pe-linie', pas: 99, scula: { numar: 7 } }),
      elV1('d', T(9, 9), { tip: 'dreptunghi', latime: 4, inaltime: 4, razaColt: 0, latura: 'interior' }),
    ]),
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
 * Plafonul v1 (100 000 de elemente) dă exact plafonul de elemente în lume v2 (precizarea 5) și, în lanț, exact
 * plafoanele v3: 100 000 de operații și 100 000 de tăieturi. Stă separat de corpus, ca testele lui de idempotență să
 * nu-l încarce de opt ori.
 */
export const V1_LA_PLAFON: CazV1 = {
  nume: 'V1 la plafon: 100 000 de elemente (100 000 de elemente în lume, de operații și de tăieturi)',
  doc: v1(Array.from({ length: 100_000 }, (_, k) => elV1(`e${k}`, T(k % 1000, Math.floor(k / 1000)), k % 2 === 0 ? dr() : cerc()))),
};

// ---------------------------------------------------------------------------------------------------------------
// Corpusul v2: documente v2 valide, care trebuie să se migreze la v3.

export type CazV2 = { readonly nume: string; readonly doc: DocV2O };

/** Un lanț de `niveluri` noduri: grupuri, cu un element la capăt. Rădăcina e nivelul 1. */
const lant = (niveluri: number, pas: MatriceO = I()): NodO => {
  let nod: NodO = el('frunza', I());
  for (let k = niveluri - 1; k >= 1; k--) nod = grup(`g${k}`, { ...pas }, [nod]);
  return nod;
};

const SCRISE_V2: readonly CazV2[] = [
  { nume: 'V2-01 gol: nicio piesă, o foaie fără instanțe', doc: doc([], [foaie('f1', [])]) },
  {
    nume: 'V2-02 arbore pe trei niveluri: operațiile în preordine (n5, n3, n1, n4, n2), nu pe niveluri sau după id',
    doc: doc(
      [piesa('pZ', grup('G0', I(), [
        el('n5', T(1, 0), cerc()),
        grup('G1', T(0, 10), [el('n3', T(2, 0)), grup('G2', T(0, 100), [el('n1', T(3, 0), cerc())]), el('n4', T(4, 0))]),
        el('n2', T(5, 0)),
      ]))],
      [foaie('f1', [inst('z9', 'pZ', 0, 0, 0), inst('a1', 'pZ', 1000, 0, 90)])],
    ),
  },
  {
    nume: 'V2-03 câmpul operatii sus, pe foaie, pe stoc, pe instanță, pe un grup, pe un element și în formă (nu e ciocnire)',
    doc: {
      ...doc(
        [piesa('p1', { ...grup('g', I(), [{ ...el('e', I(), { ...cerc(), operatii: 1 }), operatii: [] }]), operatii: 'grup' })],
        [{ ...foaie('f1', [{ ...inst('i1', 'p1', 0, 0, 0), operatii: { a: 1 } }]), operatii: true, stoc: { latime: 10, inaltime: 10, grosime: 1, operatii: 'stoc' } }],
      ),
      operatii: [{ id: 'sus', tip: 'profil' }],
    },
  },
  {
    nume: 'V2-04 câmpuri numite latura, adancime, pas, scula, noduri pe element și în formă (migrarea nu le citește)',
    doc: doc(
      [piesa('p1', grup('g', I(), [
        { ...el('c', T(3, 3), { ...cerc(2), latura: 'exterior', adancime: 30, pas: 30 }), latura: 'pe-linie', scula: { numar: 9, diametru: 1 } },
        { ...el('d', I(), { ...dr(), latura: 'interior', noduri: ['c'] }), adancime: 0.1 },
      ]))],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ),
  },
  {
    nume: 'V2-05 o piesă fără instanțe primește tot operații; o piesă cu grupul gol primește lista goală',
    doc: doc(
      [piesa('p1', el('e', I(), cerc())), piesa('p2', grup('g', I(), [el('a', I()), el('b', T(1, 1), cerc())])), piesa('gol', grup('g', I(), []))],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0), inst('i2', 'gol', 5, 5, 0)])],
    ),
  },
  {
    nume: 'V2-06 dreptunghi rotunjit (arce) e tot exterior 3 3; cerc sub oglindire și rotire cu scalare e tot interior',
    doc: doc(
      [piesa('p1', grup('g', M(-1, 0, 0, 1, 0, 0), [el('r', T(10, 0), dr(40, 20, 10)), el('c', M(0, 2, -2, 0, 5, 5), cerc(3))]))],
      [foaie('f1', [inst('i1', 'p1', 100, 100, 180)])],
    ),
  },
  {
    nume: 'V2-07 același id de element în două piese, egal cu id-ul piesei, al instanței și al foii',
    doc: doc(
      [piesa('x', el('x', I(), cerc())), piesa('y', grup('g', I(), [el('x', I()), el('y', T(2, 2), cerc())]))],
      [foaie('x', [inst('x', 'x', 0, 0, 0), inst('y', 'y', 10, 0, 270)])],
    ),
  },
  {
    nume: 'V2-08 chei __proto__, constructor, prototype pe document, pe piesă, pe nod (din JSON.parse)',
    doc: JSON.parse(
      '{"schema":2,"rev":3,"__proto__":"d","piese":[{"id":"p1","constructor":"c","prototype":"p","radacina":'
      + '{"tip":"grup","id":"g","__proto__":{"a":1},"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0},"copii":['
      + '{"tip":"element","id":"e","constructor":"Ion","forma":{"tip":"cerc","raza":5},"matrice":{"a":1,"b":0,"c":0,"d":1,"e":1,"f":1}}]}}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":10},"instante":[{"id":"i1","piesa":"p1","x":0,"y":0,"rotire":0,'
      + '"campuri":{"__proto__":"x"}}]}]}',
    ) as DocV2O,
  },
  {
    nume: 'V2-09 rev 2^53 − 1 păstrat; nume pe piesă, pe nod, pe foaie',
    doc: {
      ...doc(
        [{ ...piesa('p1', { ...el('e', I()), nume: 'Ușă' }), nume: 'Dulap' }],
        [{ ...foaie('f1', [inst('i1', 'p1', 0, 0, 0)]), nume: 'Placa 1' }],
      ),
      rev: Number.MAX_SAFE_INTEGER,
    },
  },
  {
    // ADR 0025: adâncimea față de grosimea foii o judecă CAM-ul, nu ușa. Implicitul cercului (8) e mai mare decât foaia.
    nume: 'V2-10 o foaie de 3 mm cu cercuri: operațiile implicite au adâncimea 8 (ușa le primește, CAM-ul judecă)',
    doc: doc(
      [piesa('p1', grup('g', I(), [el('c1', T(10, 10), cerc(4)), el('c2', T(30, 10), cerc(4))]))],
      [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 3 }, instante: [inst('i1', 'p1', 0, 0, 0)] }],
    ),
  },
  {
    nume: 'V2-11 un element pe nivelul 32 (31 de grupuri): operația lui e ultima în preordine',
    doc: doc(
      [piesa('p1', grup('r', I(), [el('sus', I(), cerc()), lant(31, T(1, 0))]))],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ),
  },
  {
    nume: 'V2-12 multe foi și instanțe, rotiri neexacte (89,9; 0,1; −0)',
    doc: doc(
      [piesa('p1', grup('g', I(), [el('a', T(1, 0)), el('b', T(0, 1), cerc())])), piesa('p2', el('c', I(), cerc(1)))],
      [
        foaie('f1', [inst('i1', 'p1', 0, 0, 89.9), inst('i2', 'p2', 5, 5, 0.1)]),
        foaie('f2', [inst('i3', 'p1', 0, 0, -0), inst('i4', 'p1', 50, 50, 270), inst('i5', 'p2', 0, 0, 359.999999)]),
        foaie('f3', []),
      ],
    ),
  },
];

const CHEI_DOC_V2 = ['autor', 'meta', 'operatii', 'note'] as const;
const CHEI_PIESA_V2 = ['culoare', 'note', 'cod'] as const;
const CHEI_NOD_V2 = ['strat', 'note', 'operatii', 'latura', 'adancime'] as const;
const CHEI_FORMA_V2 = ['nota', 'latura', 'pas'] as const;
const CHEI_FOAIE_V2 = ['material', 'operatii', 'note'] as const;
const CHEI_INSTANTA_V2 = ['legata', 'operatii', 'note'] as const;
const POOL_ID = ['a', 'b', 'c', 'e1', 'e2', 'g', 'p1', 'i1', 'f1', 'x', '0', '-', '_', ID_64] as const;

/**
 * Un document v2 din sămânță, valid: piese cu arbori (grupuri sub similitudini cu scara în [0,5; 2], cel mult 5
 * niveluri), forme cu arce doar sub similitudini, câmpuri necunoscute (și unele numite „operatii”, dar NICIODATĂ pe
 * piesă), id-uri din același bazin în piese, noduri, foi și instanțe. Cu `mare`, mai multe piese și instanțe.
 */
export function genereazaV2(samanta: number, mare = false): DocV2O {
  const r = aleator(samanta);
  const intreg = (min: number, max: number): number => min + Math.floor(r() * (max - min + 1));
  const alege = <V>(lista: readonly V[]): V => lista[Math.floor(r() * lista.length)] as V;
  const idDin = (folosite: Set<string>): string => {
    for (;;) {
      const s = r() < 0.5 ? alege(POOL_ID) : Array.from({ length: intreg(1, 8) }, () => ID_64[intreg(0, 63)]).join('');
      if (!folosite.has(s)) { folosite.add(s); return s; }
    }
  };
  const valoare = (adancime: number): unknown => {
    const tip = intreg(0, adancime > 2 ? 3 : 5);
    if (tip === 0) return null;
    if (tip === 1) return r() < 0.5;
    if (tip === 2) return alege([0, -0, 1.5, -7, 1e300]);
    if (tip === 3) return Array.from({ length: intreg(0, 5) }, () => alege(LITERE_NUME.split(''))).join('');
    if (tip === 4) return Array.from({ length: intreg(0, 3) }, () => valoare(adancime + 1));
    return Object.fromEntries(Array.from({ length: intreg(0, 3) }, (_, k) => [`k${k}`, valoare(adancime + 1)]));
  };
  const extra = (chei: readonly string[], p: number): Liber => {
    const o: Liber = {};
    for (const k of chei) if (r() < p) o[k] = valoare(0);
    return o;
  };
  const translatie = (): number => alege([() => (r() - 0.5) * 2e4, () => intreg(-10_000, 10_000), () => 0, () => -0, () => (r() - 0.5) * 1e-6])();
  /** Similitudine cu scara în [0,5; 2]; produsul s · cos se folosește de două ori, deci e exactă. */
  const similitudine = (): MatriceO => {
    const x = translatie();
    const y = translatie();
    const fel = intreg(0, 4);
    if (fel === 0) return M(1, 0, 0, 1, x, y);
    if (fel === 1) return alege([M(0, 1, -1, 0, x, y), M(-1, 0, 0, -1, x, y), M(0, -1, 1, 0, x, y), M(-1, 0, 0, 1, x, y), M(1, 0, 0, -1, x, y)]);
    const s = alege([1, 0.5 + r() * 1.5, 2]);
    if (fel === 4) return M(s, 0, 0, s, x, y);
    const u = r() * 2 * Math.PI;
    const cos = s * Math.cos(u);
    const sin = s * Math.sin(u);
    return fel === 2 ? M(cos, sin, -sin, cos, x, y) : M(cos, sin, sin, -cos, x, y);
  };
  /** Orice matrice cu coeficienții în [−4, 4] (doar sub un dreptunghi drept). */
  const oarecare = (): MatriceO => {
    const x = translatie();
    const y = translatie();
    const fel = intreg(0, 2);
    if (fel === 0) return M((r() - 0.5) * 8, 0, 0, (r() - 0.5) * 8, x, y);
    if (fel === 1) return M(1, 0, (r() - 0.5) * 4, 1, x, y);
    return M((r() - 0.5) * 8, (r() - 0.5) * 8, (r() - 0.5) * 8, (r() - 0.5) * 8, x, y);
  };
  const dimensiune = (max: number): number => (r() < 0.1 ? max : (1 - r()) * max);
  const forma = (): Liber => {
    const baza: Liber = r() < 0.55
      ? (() => {
        const latime = dimensiune(1000);
        const inaltime = dimensiune(1000);
        return { tip: 'dreptunghi', latime, inaltime, razaColt: r() < 0.4 ? 0 : r() * Math.min(latime, inaltime) / 2 };
      })()
      : { tip: 'cerc', raza: dimensiune(1000) };
    return { ...extra(CHEI_FORMA_V2, 0.1), ...baza };
  };
  const arbore = (folosite: Set<string>, nivel: number, buget: { n: number }): NodO => {
    buget.n--;
    const id = idDin(folosite);
    const nume = r() < 0.15 ? { nume: Array.from({ length: intreg(0, 12) }, () => alege(LITERE_NUME.split(''))).join('') } : {};
    if (nivel < 5 && buget.n > 0 && r() < (nivel === 1 ? 0.7 : 0.4)) {
      const copii: NodO[] = [];
      const k = intreg(nivel === 1 ? 1 : 0, 4);
      for (let j = 0; j < k && buget.n > 0; j++) copii.push(arbore(folosite, nivel + 1, buget));
      return { ...extra(CHEI_NOD_V2, 0.1), ...nume, tip: 'grup', id, matrice: similitudine(), copii };
    }
    const f = forma();
    const arce = f['tip'] === 'cerc' || (f['razaColt'] as number) > 0;
    return { ...extra(CHEI_NOD_V2, 0.1), ...nume, tip: 'element', id, forma: f, matrice: arce || r() < 0.5 ? similitudine() : oarecare() };
  };
  const idPiese = new Set<string>();
  const piese: PiesaO[] = Array.from({ length: mare ? 40 : intreg(0, 5) }, () => {
    const id = idDin(idPiese);
    const p: PiesaO = { ...extra(CHEI_PIESA_V2, 0.15), id, radacina: arbore(new Set(), 1, { n: mare ? 60 : intreg(1, 15) }) };
    if (r() < 0.2) p.nume = Array.from({ length: intreg(0, 20) }, () => alege(LITERE_NUME.split(''))).join('');
    return p;
  });
  const idFoi = new Set<string>();
  const idInstante = new Set<string>();
  const foi: FoaieO[] = Array.from({ length: mare ? 3 : intreg(1, 3) }, () => ({
    ...extra(CHEI_FOAIE_V2, 0.2),
    id: idDin(idFoi),
    stoc: { latime: dimensiune(10_000), inaltime: dimensiune(10_000), grosime: dimensiune(1_000) },
    instante: piese.length === 0 ? [] : Array.from({ length: intreg(0, mare ? 60 : 5) }, () => {
      const i: InstantaO = {
        ...extra(CHEI_INSTANTA_V2, 0.15),
        id: idDin(idInstante),
        piesa: alege(piese).id,
        x: r() < 0.05 ? alege([10_000_000, -10_000_000]) : translatie(),
        y: r() < 0.05 ? alege([10_000_000, -10_000_000]) : translatie(),
        rotire: alege([0, 90, 180, 270, -0, r() * 360, 359.999999, 0.1]),
      };
      if (r() < 0.2) i.campuri = { cod: 'A1', bucati: String(intreg(1, 9)) };
      return i;
    }),
  }));
  return { ...extra(CHEI_DOC_V2, 0.3), schema: 2, rev: intreg(0, 1_000_000), piese, foi };
}

const GENERATE_V2: readonly CazV2[] = [
  ...Array.from({ length: 16 }, (_, k) => ({ nume: `GV2-${String(k + 1).padStart(2, '0')} generat, sămânța ${4000 + k}`, doc: genereazaV2(4000 + k) })),
  { nume: 'GV2-17 generat mare: 40 de piese, 3 foi, sămânța 99', doc: genereazaV2(99, true) },
];

export const CORPUS_V2: readonly CazV2[] = [...SCRISE_V2, ...GENERATE_V2];

/**
 * Un document v3 din sămânță, valid: geometria lui `genereazaV2(samanta)`, cu 0–4 operații pe piesă (subseturi
 * amestecate de elemente, clase și scule oarecare, id-uri de operații din bazinul id-urilor de noduri), uneori cu
 * câmpuri necunoscute pe operație și pe sculă.
 */
export function genereazaV3(samanta: number, mare = false): DocV3O {
  const v2 = genereazaV2(samanta, mare);
  const r = aleator(samanta + 0x5eed);
  const intreg = (min: number, max: number): number => min + Math.floor(r() * (max - min + 1));
  const alege = <V>(lista: readonly V[]): V => lista[Math.floor(r() * lista.length)] as V;
  const scule = [S1, S2, S3, (): SculaO => ({ numar: 999, nume: '', diametru: 100 }), (): SculaO => ({ ...S1(), producator: 'X' })];
  const elementeDin = (radacina: NodO): string[] => {
    const rez: string[] = [];
    const stiva: NodO[] = [radacina];
    for (let n = stiva.pop(); n !== undefined; n = stiva.pop()) {
      if (n.tip === 'element') rez.push(n.id);
      else for (let k = n.copii.length - 1; k >= 0; k--) stiva.push(n.copii[k] as NodO);
    }
    return rez;
  };
  const amesteca = (lista: readonly string[]): string[] => {
    const a = [...lista];
    for (let k = a.length - 1; k > 0; k--) {
      const j = intreg(0, k);
      [a[k], a[j]] = [a[j] as string, a[k] as string];
    }
    return a;
  };
  const piese: PiesaV3O[] = v2.piese.map((p) => {
    const elemente = elementeDin(p.radacina);
    const folosite = new Set<string>();
    const operatii: OperatieO[] = Array.from({ length: elemente.length === 0 ? 0 : intreg(0, 4) }, () => {
      let id = '';
      do id = r() < 0.4 ? alege(elemente) : alege(['o1', 'o2', 'O1', 'a', 'g', '-', ID_64]); while (folosite.has(id));
      folosite.add(id);
      const o: OperatieO = {
        ...(r() < 0.15 ? { urechi: [], note: 'n' } : {}),
        id, tip: 'profil',
        noduri: amesteca(elemente).slice(0, intreg(1, elemente.length)),
        scula: alege(scule)(),
        latura: alege(['interior', 'pe-linie', 'exterior'] as const),
        adancime: alege([3, 8, 18, 1000, (1 - r()) * 1000, 0.1]),
        pas: alege([3, 4, 1000, (1 - r()) * 50, 0.5]),
      };
      return o;
    });
    return { ...p, operatii };
  });
  return { ...v2, schema: 3, piese };
}

export type CazV3 = { readonly nume: string; readonly doc: DocV3O };

export const CORPUS_V3: readonly CazV3[] = [
  ...Array.from({ length: 16 }, (_, k) => ({ nume: `GV3-${String(k + 1).padStart(2, '0')} generat, sămânța ${5000 + k}`, doc: genereazaV3(5000 + k) })),
  { nume: 'GV3-17 generat mare: 40 de piese, 3 foi, sămânța 98', doc: genereazaV3(98, true) },
];

/**
 * Un document v4 din sămânță, valid: `genereazaV3(samanta)` (aceeași geometrie și aceleași operații), cu un sens ales
 * la întâmplare pe fiecare operație (alt șir de numere, ca v3-ul să rămână neschimbat) și, uneori, capcane: un câmp
 * necunoscut numit `sens` pe sculă, pe piesă sau sus (ADR 0027 nu-l citește acolo).
 */
export function genereazaV4(samanta: number, mare = false): DocV4O {
  const v3 = genereazaV3(samanta, mare);
  const r = aleator(samanta + 0x5e45);
  const piese: PiesaV4O[] = v3.piese.map((p) => ({
    ...(r() < 0.1 ? { sens: 3 } : {}),
    ...p,
    operatii: p.operatii.map((o): OperatieV4O => ({
      ...o,
      ...(r() < 0.1 ? { scula: { ...o.scula, sens: 'invers' } } : {}),
      sens: r() < 0.5 ? 'urcare' : 'opozitie',
    })),
  }));
  return { ...(r() < 0.3 ? { sens: null } : {}), ...v3, schema: 4, piese };
}

export type CazV4 = { readonly nume: string; readonly doc: DocV4O };

export const CORPUS_V4: readonly CazV4[] = [
  ...Array.from({ length: 16 }, (_, k) => ({ nume: `GV4-${String(k + 1).padStart(2, '0')} generat, sămânța ${5000 + k}`, doc: genereazaV4(5000 + k) })),
  { nume: 'GV4-17 generat mare: 40 de piese, 3 foi, sămânța 98', doc: genereazaV4(98, true) },
];

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
// v2 refuzate la migrare (ADR 0025): o piesă v2 cu un câmp propriu „operatii”, oricare i-ar fi valoarea. Singura
// categorie raportată de `verificaV2V3` e `[ciocnire]`.

/** Un v2 valid, cu două elemente într-un grup (dreptunghi, cerc). */
const bazaV2 = (): DocV2O => doc(
  [piesa('p1', grup('g', I(), [el('e1', I()), el('e2', T(10, 0), cerc())]))],
  [foaie('f1', [inst('i1', 'p1', 10, 10, 0)])],
);

const refuzatV2 = (nume: string, strica: (d: DocV2O) => void): Refuzat => {
  const d = bazaV2();
  strica(d);
  return { nume, doc: d, motiv: 'ciocnire' };
};

export const REFUZATE_V2: readonly Refuzat[] = [
  refuzatV2('Z01 piesă v2 cu operatii: [] (chiar valoarea pe care ar scrie-o o piesă fără elemente)', (d) => {
    (d.piese[0] as PiesaO)['operatii'] = [];
  }),
  refuzatV2('Z02 piesă v2 cu exact operațiile pe care le-ar scrie migrarea', (d) => {
    (d.piese[0] as PiesaO)['operatii'] = [op('e1', ['e1'], 'exterior', 3, 3), op('e2', ['e2'], 'interior', 8, 4)];
  }),
  refuzatV2('Z03 a doua piesă are operatii: null', (d) => { d.piese.push({ id: 'p2', radacina: el('x', I()), operatii: null }); }),
  refuzatV2('Z04 piesă v2 cu operatii: "x"', (d) => { (d.piese[0] as PiesaO)['operatii'] = 'x'; }),
  {
    nume: 'Z05 piesă v2 cu __proto__ și operatii (din JSON.parse)',
    motiv: 'ciocnire',
    doc: JSON.parse(
      '{"schema":2,"rev":0,"piese":[{"id":"p1","__proto__":"x","operatii":{"o":1},"radacina":{"tip":"element","id":"e",'
      + '"forma":{"tip":"cerc","raza":1},"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}}}],'
      + '"foi":[{"id":"f1","stoc":{"latime":10,"inaltime":10,"grosime":1},"instante":[]}]}',
    ),
  },
];

// ---------------------------------------------------------------------------------------------------------------
// v3 refuzate la migrare (ADR 0027 §5): o operație v3 care are deja un câmp propriu „sens”, oricare i-ar fi valoarea.
// Documentul v3 e valid (câmpul e necunoscut acolo); singura categorie raportată de `verificaV3V4` e `[ciocnire]`.

const bazaV3 = (): DocV3O => doc3(
  [piesa3('p1', grup('g', I(), [el('e1', I()), el('e2', T(10, 0), cerc())]), [op('o1', ['e1'], 'exterior'), op('o2', ['e2'], 'interior', 8, 4)])],
  [foaie('f1', [inst('i1', 'p1', 10, 10, 0)])],
);

const refuzatV3 = (nume: string, strica: (d: DocV3O) => void): Refuzat => {
  const d = bazaV3();
  strica(d);
  return { nume, doc: d, motiv: 'ciocnire' };
};
const opV3 = (d: DocV3O, piesa: number, k: number): Liber => ((d.piese[piesa] as PiesaV3O).operatii[k] as OperatieO);

export const REFUZATE_V3: readonly Refuzat[] = [
  refuzatV3('Y01 operație v3 cu sens: "urcare" (chiar valoarea pe care ar scrie-o migrarea)', (d) => { opV3(d, 0, 0)['sens'] = 'urcare'; }),
  refuzatV3('Y02 operație v3 cu sens: "opozitie"', (d) => { opV3(d, 0, 1)['sens'] = 'opozitie'; }),
  refuzatV3('Y03 operație v3 cu sens: null', (d) => { opV3(d, 0, 0)['sens'] = null; }),
  refuzatV3('Y04 operație v3 cu sens: "invers" (o valoare pe care v4 n-o primește)', (d) => { opV3(d, 0, 1)['sens'] = 'invers'; }),
  refuzatV3('Y05 doar operația a doua piese, fără instanțe, are sens', (d) => {
    d.piese.push(piesa3('p2', el('x', I()), [op('a', ['x'], 'exterior'), { ...op('b', ['x'], 'pe-linie', 1, 1), sens: { v: 1 } }]));
  }),
  refuzatV3('Y06 operație pe-linie cu sens (ciocnirea nu depinde de latură)', (d) => {
    (d.piese[0] as PiesaV3O).operatii.push({ ...op('l', ['e1'], 'pe-linie', 1, 1), sens: 'urcare' });
  }),
  {
    nume: 'Y07 operație v3 cu __proto__ și sens (din JSON.parse)',
    motiv: 'ciocnire',
    doc: JSON.parse(
      '{"schema":3,"rev":0,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":1},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"f","diametru":6},"latura":"interior","adancime":1,"pas":1,"__proto__":"x","sens":"urcare"}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":10,"inaltime":10,"grosime":1},"instante":[]}]}',
    ),
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Otrăvuri: fiecare încalcă un singur lucru, deci oracolul raportează o singură categorie.

export type Otrava = { readonly nume: string; readonly doc: unknown; readonly categorie: CategorieO };

/** Documentul v2 valid de la care pleacă otrăvurile vechi. */
const baza = (): DocV2O => doc(
  [piesa('p1', grup('g', I(), [el('e1', I()), el('e2', T(10, 0), cerc())]))],
  [foaie('f1', [inst('i1', 'p1', 10, 10, 0)])],
);

const esteObiectC = (v: unknown): v is Liber => typeof v === 'object' && v !== null && !Array.isArray(v);
const scrie = (o: object, cheie: string, valoare: unknown): void => { (o as Liber)[cheie] = valoare; };
const sterge = (o: object, cheie: string): void => { delete (o as Liber)[cheie]; };
const f0 = (d: DocV2O | DocV3O): FoaieO => d.foi[0] as FoaieO;
const i0 = (d: DocV2O | DocV3O): InstantaO => f0(d).instante[0] as InstantaO;
const p0 = (d: DocV2O): PiesaO => d.piese[0] as PiesaO;
const g0 = (d: DocV2O): GrupO => p0(d).radacina as GrupO;
const e0 = (d: DocV2O): ElementO => g0(d).copii[0] as ElementO;
/** Cercul bazei. */
const e1 = (d: DocV2O): ElementO => g0(d).copii[1] as ElementO;

/** Un lanț de grupuri cu matricea `pas`, cu un cerc la capăt. */
const lantCerc = (grupuri: number, pas: MatriceO): NodO => {
  let nod: NodO = el('cerc', I(), cerc());
  for (let k = grupuri; k >= 1; k--) nod = grup(`r${k}`, { ...pas }, [nod]);
  return nod;
};

/**
 * Forma v3 a unei otrăvi v2: schema 3 (o schemă greșită rămâne greșită: 1 rămâne 1, „2” devine „3”) și `operatii: []`
 * pe fiecare piesă-obiect care n-o are. Lista goală e validă, deci otrava rămâne cu aceeași singură categorie.
 */
const laV3 = (d: unknown): unknown => {
  if (!esteObiectC(d)) return d;
  if (d['schema'] === 2) d['schema'] = 3;
  else if (d['schema'] === '2') d['schema'] = '3';
  const piese = d['piese'];
  if (Array.isArray(piese)) for (const p of piese) if (esteObiectC(p) && !Object.hasOwn(p, 'operatii')) p['operatii'] = [];
  return d;
};

/** Otrăvurile documentului v2 (ADR 0024); `versiune` 3 le aduce la forma v3 (`laV3`), 4 la forma v4 (`laV4`). */
function otravuriArbore(versiune: 2 | 3 | 4): Otrava[] {
  const forma = (d: DocV2O): unknown => (versiune === 4 ? laV4(laV3(d)) : versiune === 3 ? laV3(d) : d);
  const eticheta = versiune === 4 ? 'v4 ' : versiune === 3 ? 'v3 ' : '';
  const otrava = (nume: string, categorie: CategorieO, strica: (d: DocV2O) => void): Otrava => {
    const d = baza();
    strica(d);
    return { nume: `${eticheta}${nume}`, doc: forma(d), categorie };
  };
  return [
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
    otrava('O24 schema 1 cu forma documentului nou', 'schema', (d) => { scrie(d, 'schema', 1); }),
    otrava('O25 schema ca text', 'schema', (d) => { scrie(d, 'schema', '2'); }),
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
    { nume: `${eticheta}O36 documentul e o listă`, categorie: 'schema', doc: [forma(baza())] },
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
}

export const OTRAVURI_V2: readonly Otrava[] = otravuriArbore(2);

/**
 * Documentul v3 valid de la care pleacă otrăvurile operațiilor: un grup cu un dreptunghi (e1, operația o1, exterior)
 * și un cerc (e2, operația o2, interior), o instanță.
 */
const baza3 = (): DocV3O => doc3(
  [piesa3('p1', grup('g', I(), [el('e1', I()), el('e2', T(10, 0), cerc())]), [op('o1', ['e1'], 'exterior'), op('o2', ['e2'], 'interior', 8, 4)])],
  [foaie('f1', [inst('i1', 'p1', 10, 10, 0)])],
);
const q0 = (d: DocV3O): PiesaV3O => d.piese[0] as PiesaV3O;
const op0 = (d: DocV3O): OperatieO => q0(d).operatii[0] as OperatieO;
const sc0 = (d: DocV3O): SculaO => op0(d).scula;
const operatiiPe = (n: number, nod: string): OperatieO[] => Array.from({ length: n }, (_, k) => op(`o${k}`, [nod], 'exterior'));

/**
 * Otrăvurile operațiilor (ADR 0025), în forma v3 sau, cu `versiune` 4, aduse la forma v4 DUPĂ stricare (`laV4`: fiecare
 * operație-obiect primește `sens: 'urcare'`, deci și cele construite de otravă), ca fiecare să rămână cu o singură
 * categorie. „Schema 4” nu mai e o otravă în v4: devine „schema 5”.
 */
function otravuriOperatii(versiune: 3 | 4): Otrava[] {
  const otrava3 = (nume: string, categorie: CategorieO, strica: (d: DocV3O) => void): Otrava => {
    const d = baza3();
    strica(d);
    return versiune === 4 ? { nume: `v4 ${nume}`, doc: laV4(d), categorie } : { nume, doc: d, categorie };
  };

  return [
    // [operatie]: lista și câmpurile operației.
    otrava3('P01 o piesă fără câmpul operatii', 'operatie', (d) => { sterge(q0(d), 'operatii'); }),
    otrava3('P02 operatii e un obiect (după id), nu o listă', 'operatie', (d) => { scrie(q0(d), 'operatii', { o1: op0(d) }); }),
    otrava3('P03 operatii e null', 'operatie', (d) => { scrie(q0(d), 'operatii', null); }),
    otrava3('P04 o operație e text', 'operatie', (d) => { (q0(d).operatii as unknown[]).push('o3'); }),
    otrava3('P05 tip „buzunar” (necunoscut)', 'operatie', (d) => { scrie(op0(d), 'tip', 'buzunar'); }),
    otrava3('P06 tip lipsă', 'operatie', (d) => { sterge(op0(d), 'tip'); }),
    otrava3('P07 tip „Profil” (majusculă)', 'operatie', (d) => { scrie(op0(d), 'tip', 'Profil'); }),
    otrava3('P08 latura „Exterior” (majusculă)', 'operatie', (d) => { scrie(op0(d), 'latura', 'Exterior'); }),
    otrava3('P09 latura lipsă', 'operatie', (d) => { sterge(op0(d), 'latura'); }),
    otrava3('P10 latura „pe linie” (fără cratimă)', 'operatie', (d) => { scrie(op0(d), 'latura', 'pe linie'); }),
    otrava3('P11 adancime 0', 'operatie', (d) => { op0(d).adancime = 0; }),
    otrava3('P12 adancime 1 000,0001', 'operatie', (d) => { op0(d).adancime = 1000.0001; }),
    otrava3('P13 adancime NaN', 'operatie', (d) => { op0(d).adancime = Number.NaN; }),
    otrava3('P14 adancime „3” (text)', 'operatie', (d) => { scrie(op0(d), 'adancime', '3'); }),
    otrava3('P15 pas −1', 'operatie', (d) => { op0(d).pas = -1; }),
    otrava3('P16 pas Infinity', 'operatie', (d) => { op0(d).pas = Number.POSITIVE_INFINITY; }),
    otrava3('P17 pas lipsă', 'operatie', (d) => { sterge(op0(d), 'pas'); }),
    otrava3('P18 adancime −0', 'operatie', (d) => { op0(d).adancime = -0; }),
    otrava3('P19 noduri goale', 'operatie', (d) => { op0(d).noduri = []; }),
    otrava3('P20 noduri e text („e1”), nu listă', 'operatie', (d) => { scrie(op0(d), 'noduri', 'e1'); }),
    otrava3('P21 același nod de două ori într-o operație', 'operatie', (d) => { op0(d).noduri = ['e1', 'e1']; }),
    otrava3('P22 un număr în noduri', 'operatie', (d) => { scrie(op0(d), 'noduri', ['e1', 7]); }),
    // [unic-operatii]
    otrava3('P23 două operații cu același id în aceeași piesă', 'unic-operatii', (d) => { (q0(d).operatii[1] as OperatieO).id = 'o1'; }),
    otrava3('P24 trei operații, a treia cu id-ul primei (clase și noduri diferite)', 'unic-operatii', (d) => {
      q0(d).operatii.push(op('o1', ['e2'], 'pe-linie', 1, 1));
    }),
    // [id]
    otrava3('P25 id de operație cu spațiu', 'id', (d) => { op0(d).id = 'o 1'; }),
    otrava3('P26 id de operație de 65 de caractere', 'id', (d) => { op0(d).id = `${ID_64}x`; }),
    otrava3('P27 id de operație gol', 'id', (d) => { op0(d).id = ''; }),
    otrava3('P28 id de operație cu „/” (ca un id în lume)', 'id', (d) => { op0(d).id = 'i1/e1'; }),
    otrava3('P29 id de operație număr', 'schema', (d) => { scrie(op0(d), 'id', 1); }),
    // [referinta-op]
    otrava3('P30 nodul e grupul rădăcinii', 'referinta-op', (d) => { op0(d).noduri = ['g']; }),
    // Piesa străină stă ÎNAINTEA piesei verificate (o mulțime de elemente pe tot documentul ar vedea-o deja), apoi după.
    otrava3('P31 nodul e un element al altei piese, așezate înainte', 'referinta-op', (d) => {
      const p1 = q0(d);
      d.piese.unshift(piesa3('p2', el('x', I()), []));
      (p1.operatii[0] as OperatieO).noduri = ['x'];
    }),
    otrava3('P31b nodul e un element al altei piese, așezate după', 'referinta-op', (d) => {
      d.piese.push(piesa3('p2', el('x', I()), []));
      op0(d).noduri = ['x'];
    }),
    otrava3('P32 nodul nu există', 'referinta-op', (d) => { op0(d).noduri = ['e9']; }),
    otrava3('P33 nodul e id-ul piesei', 'referinta-op', (d) => { op0(d).noduri = ['p1']; }),
    otrava3('P34 nodul e id-ul instanței', 'referinta-op', (d) => { op0(d).noduri = ['i1']; }),
    otrava3('P35 nodul e un grup din mijlocul arborelui', 'referinta-op', (d) => {
      q0(d).radacina = grup('g', I(), [grup('h', I(), [el('e1', I())]), el('e2', T(10, 0), cerc())]);
      op0(d).noduri = ['h'];
    }),
    otrava3('P36 nodul e id-ul altei operații', 'referinta-op', (d) => { op0(d).noduri = ['o2']; }),
    otrava3('P37 nodul cu un spațiu la capăt („e1 ”)', 'referinta-op', (d) => { op0(d).noduri = ['e1 ']; }),
    otrava3('P38 nodul e un element, al doilea e grupul', 'referinta-op', (d) => { op0(d).noduri = ['e1', 'g']; }),
    // [scula]
    otrava3('P39 scula lipsă', 'scula', (d) => { sterge(op0(d), 'scula'); }),
    otrava3('P40 scula e o listă', 'scula', (d) => { scrie(op0(d), 'scula', [1, 'freza plata', 6]); }),
    otrava3('P41 numar 0', 'scula', (d) => { sc0(d).numar = 0; }),
    otrava3('P42 numar 1 000', 'scula', (d) => { sc0(d).numar = 1000; }),
    otrava3('P43 numar 1,5', 'scula', (d) => { sc0(d).numar = 1.5; }),
    otrava3('P44 numar „1” (text)', 'scula', (d) => { scrie(sc0(d), 'numar', '1'); }),
    otrava3('P45 numar NaN', 'scula', (d) => { sc0(d).numar = Number.NaN; }),
    otrava3('P46 numar lipsă', 'scula', (d) => { sterge(sc0(d), 'numar'); }),
    otrava3('P47 nume lipsă', 'scula', (d) => { sterge(sc0(d), 'nume'); }),
    otrava3('P48 nume de 201 de caractere', 'scula', (d) => { sc0(d).nume = 'ș'.repeat(201); }),
    otrava3('P49 nume număr', 'scula', (d) => { scrie(sc0(d), 'nume', 6); }),
    otrava3('P50 diametru 0', 'scula', (d) => { sc0(d).diametru = 0; }),
    otrava3('P51 diametru 100,0001', 'scula', (d) => { sc0(d).diametru = 100.0001; }),
    otrava3('P52 diametru negativ', 'scula', (d) => { sc0(d).diametru = -6; }),
    otrava3('P53 diametru Infinity', 'scula', (d) => { sc0(d).diametru = Number.POSITIVE_INFINITY; }),
    otrava3('P54 diametru lipsă', 'scula', (d) => { sterge(sc0(d), 'diametru'); }),
    otrava3('P55 diametru „6” (text)', 'scula', (d) => { scrie(sc0(d), 'diametru', '6'); }),
    otrava3('P56 diametru −0', 'scula', (d) => { sc0(d).diametru = -0; }),
    // [plafon]
    otrava3('P57 o operație cu 10 001 noduri', 'plafon', (d) => {
      const ids = Array.from({ length: 10_001 }, (_, k) => `e${k}`);
      q0(d).radacina = grup('g', I(), ids.map((id) => el(id, I())));
      q0(d).operatii = [op('o', ids, 'exterior')];
    }),
    otrava3('P58 100 001 de operații într-o piesă fără instanțe', 'plafon', (d) => {
      q0(d).radacina = el('e', I());
      q0(d).operatii = operatiiPe(100_001, 'e');
      f0(d).instante = [];
    }),
    otrava3('P59 100 001 de operații în două piese (60 000 + 40 001), fără instanțe', 'plafon', (d) => {
      q0(d).radacina = el('e', I());
      q0(d).operatii = operatiiPe(60_000, 'e');
      d.piese.push(piesa3('p2', el('e', I()), operatiiPe(40_001, 'e')));
      f0(d).instante = [];
    }),
    // Instanțele (50 001) și elementele în lume (50 001) sunt sub plafoane; tăieturile, 2 × 50 001 = 100 002.
    otrava3('P60 100 002 tăieturi în lume: 50 001 de instanțe × 2 operații pe același element', 'plafon', (d) => {
      q0(d).radacina = el('e', I());
      q0(d).operatii = [op('a', ['e'], 'exterior'), op('b', ['e'], 'pe-linie', 1, 1)];
      f0(d).instante = Array.from({ length: 50_001 }, (_, k) => inst(`i${k}`, 'p1', 0, 0, 0));
    }),
    // 16 667 de instanțe × (3 operații × 2 noduri) = 100 002; instanțe × operații = 50 001; elemente în lume 33 334.
    otrava3('P61 100 002 tăieturi în lume: 16 667 de instanțe × 3 operații × 2 noduri', 'plafon', (d) => {
      q0(d).radacina = grup('g', I(), [el('a', I()), el('b', T(1, 0))]);
      q0(d).operatii = [op('x', ['a', 'b'], 'exterior'), op('y', ['b', 'a'], 'interior'), op('z', ['a', 'b'], 'pe-linie', 1, 1)];
      f0(d).instante = Array.from({ length: 16_667 }, (_, k) => inst(`i${k}`, 'p1', 0, 0, 0));
    }),
    // Fiecare foaie e sub plafon (60 000 și 40 002 de tăieturi); documentul are 100 002.
    otrava3('P62 100 002 tăieturi în lume pe două foi (30 000 + 20 001 de instanțe × 2)', 'plafon', (d) => {
      q0(d).radacina = el('e', I());
      q0(d).operatii = [op('a', ['e'], 'exterior'), op('b', ['e'], 'interior')];
      f0(d).instante = Array.from({ length: 30_000 }, (_, k) => inst(`i${k}`, 'p1', 0, 0, 0));
      d.foi.push(foaie('f2', Array.from({ length: 20_001 }, (_, k) => inst(`j${k}`, 'p1', 0, 0, 0))));
    }),
    // [schema]
    otrava3('P63 schema 2 cu forma v3 (ușa ar vedea o ciocnire, nu o migrare)', 'schema', (d) => { scrie(d, 'schema', 2); }),
    versiune === 4
      ? otrava3('P64 schema 5', 'schema', (d) => { scrie(d, 'schema', 5); })
      : otrava3('P64 schema 4', 'schema', (d) => { scrie(d, 'schema', 4); }),
    // În v4, `laV4` duce textul „3” în „4”: tot text.
    otrava3(`P65 schema „${versiune}” (text)`, 'schema', (d) => { scrie(d, 'schema', '3'); }),
    // [adancime]: operația e pe nivelul 5 (document, piese, piesa, operatii, operația), câmpul ei pe 6: 6 + 195 = 201.
    otrava3('P66 JSON adânc de 201 de niveluri, într-un câmp necunoscut al operației', 'adancime', (d) => { scrie(op0(d), 'adanc', adanc(196)); }),
    // Scula e pe nivelul 6, câmpul ei pe 7: 7 + 194 = 201.
    otrava3('P67 JSON adânc de 201 de niveluri, într-un câmp necunoscut al sculei', 'adancime', (d) => { scrie(sc0(d), 'adanc', adanc(195)); }),
    // [operatie] pe a doua piesă.
    otrava3('P68 doar a doua piesă n-are operatii', 'operatie', (d) => { d.piese.push({ id: 'p2', radacina: el('x', I()) } as unknown as PiesaV3O); }),
  ];
}

export const OTRAVURI_V3: readonly Otrava[] = [...otravuriArbore(3), ...otravuriOperatii(3)];

/**
 * Otrăvurile sensului (ADR 0027 §5): documentul v4 valid de la care pleacă e `baza3` adus la v4 (o1 exterior, o2
 * interior, ambele `urcare`); fiecare strică doar sensul, deci singura categorie e `[sens]`.
 */
const baza4 = (): DocV4O => laV4(baza3()) as DocV4O;
const q4 = (d: DocV4O, k = 0): PiesaV4O => d.piese[k] as PiesaV4O;
const o4 = (d: DocV4O, k = 0, piesa = 0): Liber => q4(d, piesa).operatii[k] as OperatieV4O;
const otravaSens = (nume: string, strica: (d: DocV4O) => void): Otrava => {
  const d = baza4();
  strica(d);
  return { nume, doc: d, categorie: 'sens' };
};

/** Otrăvurile sensului, construite din nou la fiecare apel (v5 le aduce la forma ei pe loc, fără să le copieze). */
const otravuriSens = (): Otrava[] => [
  otravaSens('S01 sens lipsă', (d) => { delete o4(d)['sens']; }),
  otravaSens('S02 sens „Urcare” (majusculă)', (d) => { o4(d)['sens'] = 'Urcare'; }),
  otravaSens('S03 sens „URCARE”', (d) => { o4(d)['sens'] = 'URCARE'; }),
  otravaSens('S04 sens „opoziție” (cu diacritice)', (d) => { o4(d)['sens'] = 'opoziție'; }),
  otravaSens('S05 sens „urcare ” (spațiu la capăt)', (d) => { o4(d)['sens'] = 'urcare '; }),
  otravaSens('S06 sens „climb” (numele englezesc)', (d) => { o4(d)['sens'] = 'climb'; }),
  otravaSens('S07 sens „trigonometric” (sensul de mers, nu al tăierii)', (d) => { o4(d)['sens'] = 'trigonometric'; }),
  otravaSens('S08 sens gol', (d) => { o4(d)['sens'] = ''; }),
  otravaSens('S09 sens null', (d) => { o4(d)['sens'] = null; }),
  otravaSens('S10 sens true', (d) => { o4(d)['sens'] = true; }),
  otravaSens('S11 sens 0', (d) => { o4(d)['sens'] = 0; }),
  otravaSens('S12 sens [„urcare”] (listă)', (d) => { o4(d)['sens'] = ['urcare']; }),
  otravaSens('S13 sens { valoare: „urcare” } (obiect)', (d) => { o4(d)['sens'] = { valoare: 'urcare' }; }),
  otravaSens('S14 sens undefined, ca proprietate proprie', (d) => { o4(d)['sens'] = undefined; }),
  otravaSens('S15 doar a doua operație n-are sens', (d) => { delete o4(d, 1)['sens']; }),
  otravaSens('S16 o operație pe-linie fără sens (câmpul e obligatoriu și acolo)', (d) => {
    const o: Liber = { ...op('l', ['e1'], 'pe-linie', 1, 1) };
    (q4(d).operatii as unknown[]).push(o);
  }),
  otravaSens('S17 operația fără sens e a unei piese fără instanțe', (d) => {
    d.piese.push(piesa4('p2', el('x', I()), [{ ...op('a', ['x'], 'exterior'), sens: 'invers' } as unknown as OperatieV4O]));
  }),
  otravaSens('S18 un v3 etichetat schema 4 (nicio operație n-are sens)', (d) => {
    for (const o of q4(d).operatii) delete (o as Liber)['sens'];
  }),
  otravaSens('S19 sensul pus pe sculă, nu pe operație', (d) => {
    const o = o4(d);
    delete o['sens'];
    o['scula'] = { ...(o['scula'] as SculaO), sens: 'urcare' };
  }),
];

const OTRAVURI_SENS: readonly Otrava[] = otravuriSens();

export const OTRAVURI_V4: readonly Otrava[] = [...otravuriArbore(4), ...otravuriOperatii(4), ...OTRAVURI_SENS];

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

// ---------------------------------------------------------------------------------------------------------------
// Valide v3, dar dificile (ADR 0025).

export type CazValidV3 = { readonly nume: string; readonly doc: DocV3O };

/** Un element `e` și `n` operații pe el, cu clasele pe rând (interior, pe-linie, exterior). */
const operatiiAlternante = (n: number): OperatieO[] => Array.from(
  { length: n },
  (_, k) => op(`o${k}`, ['e'], (['interior', 'pe-linie', 'exterior'] as const)[k % 3] as LaturaO),
);

export const VALIDE_DIFICILE_V3: readonly CazValidV3[] = [
  {
    nume: 'W01 o piesă fără operații, cu instanță (nu se taie nimic)',
    doc: doc3([piesa3('p1', el('e1', I()), [])], [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])]),
  },
  {
    nume: 'W02 un element referit de trei operații (aceeași clasă și clase diferite)',
    doc: doc3(
      [piesa3(
        'p1',
        grup('g', I(), [el('e1', I()), el('e2', T(10, 0), cerc())]),
        [op('a', ['e1'], 'exterior'), op('b', ['e1', 'e2'], 'interior', 5, 5), op('c', ['e1'], 'exterior', 18, 6)],
      )],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ),
  },
  {
    nume: 'W03 id-ul operației = id-ul nodului = id-ul piesei = id-ul instanței = id-ul foii',
    doc: doc3([piesa3('x', el('x', I()), [op('x', ['x'], 'exterior')])], [foaie('x', [inst('x', 'x', 0, 0, 0)])]),
  },
  {
    nume: 'W04 același id de operație în două piese diferite',
    doc: doc3(
      [piesa3('p1', el('e', I()), [op('o', ['e'], 'exterior')]), piesa3('p2', el('e', I(), cerc()), [op('o', ['e'], 'interior', 8, 4)])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0), inst('i2', 'p2', 100, 0, 0)])],
    ),
  },
  {
    // 25 000 de instanțe × 2 operații × 2 noduri; elementele în lume, 50 000.
    nume: 'W05 exact 100 000 de tăieturi în lume (25 000 de instanțe × 2 operații × 2 noduri)',
    doc: doc3(
      [piesa3('p1', grup('g', I(), [el('a', I()), el('b', T(1, 0))]), [op('o1', ['a', 'b'], 'interior'), op('o2', ['b', 'a'], 'exterior')])],
      [foaie('f1', Array.from({ length: 25_000 }, (_, k) => inst(`i${k}`, 'p1', k % 1000, Math.floor(k / 1000), 0)))],
    ),
  },
  {
    nume: 'W06 exact 100 000 de operații pe un singur element, o instanță (și exact 100 000 de tăieturi)',
    doc: doc3([piesa3('p1', el('e', I()), operatiiAlternante(100_000))], [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])]),
  },
  {
    nume: 'W07 o operație cu exact 10 000 de noduri, în ordinea inversă preordinii',
    doc: doc3(
      [piesa3(
        'p1',
        grup('g', I(), Array.from({ length: 10_000 }, (_, k) => el(`e${k}`, T(k, 0)))),
        [op('tot', Array.from({ length: 10_000 }, (_, k) => `e${9_999 - k}`), 'exterior')],
      )],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ),
  },
  {
    // Tăieturile se numără pe instanțe: o piesă fără instanțe nu taie nimic, oricâte referințe ar avea.
    nume: 'W08 100 000 de referințe într-o piesă fără instanțe (10 operații × 10 000 de noduri), plus o piesă tăiată',
    doc: doc3(
      [
        piesa3(
          'mare',
          grup('g', I(), Array.from({ length: 10_000 }, (_, k) => el(`e${k}`, T(k, 0)))),
          Array.from({ length: 10 }, (_, j) => op(`o${j}`, Array.from({ length: 10_000 }, (_, k) => `e${k}`), 'exterior')),
        ),
        piesa3('p2', el('e', I()), [op('o', ['e'], 'interior')]),
      ],
      [foaie('f1', [inst('i1', 'p2', 0, 0, 0)])],
    ),
  },
  {
    nume: 'W09 la plafoane: scula 1 și 999, nume gol și de 200, diametru 100 și 5e−324; adâncime și pas 1 000 și 5e−324',
    doc: doc3(
      [piesa3(
        'p1',
        grup('g', I(), [el('e1', I()), el('e2', T(50, 0), cerc())]),
        [
          op('a', ['e1'], 'exterior', 1000, 1000, { numar: 1, nume: '', diametru: 100 }),
          op('b', ['e2'], 'interior', 5e-324, 5e-324, { numar: 999, nume: 'ș'.repeat(200), diametru: 5e-324 }),
        ],
      )],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ),
  },
  {
    nume: 'W10 câmpuri necunoscute pe operație și pe sculă: __proto__, constructor, prototype, urechi, intrări (din JSON.parse)',
    doc: JSON.parse(
      '{"schema":3,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":5},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6,"__proto__":"s","producator":"X","lungime":{"utila":22}},'
      + '"latura":"interior","adancime":8,"pas":4,"__proto__":"x","constructor":"Ion","prototype":"p",'
      + '"urechi":[{"lungime":5}],"intrari":null,"note":"de pastrat"}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as DocV3O,
  },
  {
    // ADR 0025: exportul refuză două scule într-un program (`sculaUnicaO`); ușa le primește.
    nume: 'W11 scule diferite pe aceeași foaie (număr și diametru): documentul e valid, exportul le refuză',
    doc: doc3(
      [piesa3('p1', grup('g', I(), [el('e1', I()), el('e2', T(50, 0), cerc())]), [op('a', ['e1'], 'exterior'), op('b', ['e2'], 'interior', 2, 1, S2())])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ),
  },
  {
    nume: 'W12 nodurile operației din grupuri diferite, în altă ordine decât preordinea (b1, a2, a1)',
    doc: doc3(
      [piesa3(
        'p1',
        grup('G', I(), [grup('A', T(0, 100), [el('a1', T(1, 0), cerc()), el('a2', T(2, 0), cerc())]), grup('B', M(0, 1, -1, 0, 0, 0), [el('b1', T(3, 0), cerc())])]),
        [op('gauri', ['b1', 'a2', 'a1'], 'interior', 10, 5)],
      )],
      [foaie('f1', [inst('i1', 'p1', 500, 500, 270)])],
    ),
  },
  {
    nume: 'W13 pasul mai mare decât adâncimea (10 > 3): ușa nu le leagă',
    doc: doc3([piesa3('p1', el('e', I()), [op('o', ['e'], 'exterior', 3, 10)])], [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])]),
  },
  {
    // Operația pe nivelul 5, câmpul ei pe 6: 6 + 194 = 200. Scula pe 6, câmpul ei pe 7: 7 + 193 = 200.
    nume: 'W14 JSON adânc de exact 200 de niveluri, într-un câmp al operației și într-unul al sculei',
    doc: doc3(
      [piesa3('p1', el('e', I()), [{ ...op('o', ['e'], 'exterior'), adanc: adanc(195), scula: { ...S1(), adanc: adanc(194) } }])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ),
  },
  {
    nume: 'W15 latura nu depinde de formă: cerc exterior, dreptunghi interior, cerc pe linie',
    doc: doc3(
      [piesa3(
        'p1',
        grup('g', I(), [el('c', I(), cerc()), el('r', T(20, 0)), el('k', T(0, 20), cerc(2))]),
        [op('o1', ['c'], 'exterior'), op('o2', ['r'], 'interior'), op('o3', ['k'], 'pe-linie', 1, 1)],
      )],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ),
  },
  {
    nume: 'W16 id-uri de operații care diferă doar prin majuscule (O1, o1) în aceeași piesă',
    doc: doc3(
      [piesa3('p1', el('e', I()), [op('O1', ['e'], 'exterior'), op('o1', ['e'], 'interior')])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ),
  },
  {
    nume: 'W17 aceeași piesă cu operații pe două foi (fiecare foaie își taie instanțele ei)',
    doc: doc3(
      [piesa3('p1', grup('g', I(), [el('a', I()), el('b', T(5, 5), cerc())]), [op('o', ['b', 'a'], 'interior')])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 90)]), foaie('f2', [inst('i2', 'p1', 0, 0, 180), inst('i3', 'p1', 10, 10, 0)])],
    ),
  },
  {
    nume: 'W18 id-uri de operații de 64 de caractere și de un caracter (-, _)',
    doc: doc3(
      [piesa3('p1', el('e', I()), [op(ID_64, ['e'], 'exterior'), op('-', ['e'], 'interior'), op('_', ['e'], 'pe-linie', 1, 1)])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ),
  },
  {
    nume: 'W19 operații pe o piesă fără instanțe (nu se taie); toate listele goale în rest',
    doc: doc3(
      [piesa3('p1', el('e', I()), [op('o', ['e'], 'exterior')]), piesa3('p2', grup('g', I(), []), [])],
      [foaie('f1', [inst('i1', 'p2', 0, 0, 0)]), foaie('f2', [])],
    ),
  },
  {
    nume: 'W20 același element în două operații de aceeași clasă, cu scule diferite, pe două instanțe',
    doc: doc3(
      [piesa3('p1', el('e', I(), cerc(10)), [op('a', ['e'], 'interior', 2, 2, S2()), op('b', ['e'], 'interior', 18, 6)])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0), inst('i2', 'p1', 100, 0, 90)])],
    ),
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Valide v4, dar dificile (ADR 0027).

export type CazValidV4 = { readonly nume: string; readonly doc: DocV4O };

export const VALIDE_DIFICILE_V4: readonly CazValidV4[] = [
  // Fiecare W de mai sus, adus la v4 cu sensurile pe rând (urcare, opoziție, …): aceleași capcane, cu ambele valori.
  ...VALIDE_DIFICILE_V3.map((c) => ({ nume: `${c.nume} (v4, sensuri pe rând)`, doc: laV4(structuredClone(c.doc), alternant) as DocV4O })),
  {
    nume: 'X01 pe-linie în opoziție: câmpul se păstrează, deși nu schimbă traseul (ADR 0027 §3)',
    doc: doc4([piesa4('p1', el('e', I()), [op4('o', ['e'], 'pe-linie', 'opozitie', 1, 1)])], [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])]),
  },
  {
    nume: 'X02 degroșarea și finisarea aceluiași contur, aceeași latură și adâncime, în sensuri diferite',
    doc: doc4(
      [piesa4('p1', el('e', I(), dr(80, 50, 6)), [op4('deg', ['e'], 'exterior', 'urcare', 12, 4), op4('fin', ['e'], 'exterior', 'opozitie', 12, 12)])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ),
  },
  {
    nume: 'X03 un câmp necunoscut „sens” pe sculă, nod, piesă, instanță, foaie și sus (nu e al operației)',
    doc: {
      schema: 4, rev: 3, sens: 'sus',
      piese: [{
        id: 'p1', sens: 'opozitie',
        radacina: { ...grup('g', I(), [{ ...el('e', I()), sens: 'urcare' }]), sens: ['x'] },
        operatii: [{ ...op4('o', ['e'], 'exterior', 'opozitie'), scula: { ...S1(), sens: 'urcare' } }],
      }],
      foi: [{ ...foaie('f1', [{ ...inst('i1', 'p1', 0, 0, 0), sens: 1 }]), sens: null }],
    },
  },
  {
    nume: 'X04 chei capcană pe operația v4 (din JSON.parse), sens opozitie',
    doc: JSON.parse(
      '{"schema":4,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":5},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6},"latura":"interior","adancime":8,"pas":4,'
      + '"__proto__":"x","constructor":"Ion","sens":"opozitie"}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as DocV4O,
  },
  {
    nume: 'X05 aceeași piesă pe două instanțe și o operație cu două noduri, în opoziție: sensul e al operației, pe toate',
    doc: doc4(
      [piesa4('p1', grup('g', I(), [el('a', I(), cerc(3)), el('b', T(10, 0), cerc(3))]), [op4('o', ['b', 'a'], 'interior', 'opozitie', 5, 5)])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0), inst('i2', 'p1', 50, 0, 180)])],
    ),
  },
];

// ---------------------------------------------------------------------------------------------------------------
// v5 (ADR 0028): urechile operației.

/**
 * Forma v5 a unui document v4 (sau a unei otrăvi v4): schema 4 devine 5, iar o schemă 5 (otrava „schema mai nouă” a
 * lui v4) devine 6, ca să rămână otravă; „4” devine „5”. Fiecare operație-obiect care n-are `urechi` primește
 * `urechi(k)` (implicit `null`; k = a câta, în tot documentul). Pe loc; întoarce documentul.
 */
const laV5 = (d: unknown, urechi: (k: number) => UrechiO | null = () => null): unknown => {
  if (!esteObiectL(d)) return d;
  if (d['schema'] === 4) d['schema'] = 5;
  else if (d['schema'] === 5) d['schema'] = 6;
  else if (d['schema'] === '4') d['schema'] = '5';
  const piese = d['piese'];
  let k = 0;
  if (Array.isArray(piese)) {
    for (const p of piese) {
      if (!esteObiectL(p) || !Array.isArray(p['operatii'])) continue;
      for (const o of p['operatii'] as unknown[]) if (esteObiectL(o) && !Object.hasOwn(o, 'urechi')) o['urechi'] = urechi(k++);
    }
  }
  return d;
};

const ur = (numar: number, latime: number, grosime: number): UrechiO => ({ numar, latime, grosime });
/** Urechile pe rând: fără, 4 × 8 × 2 (dialogul), 1 × 0,5 × 0,1, 100 × 10 000 × 1 000 (plafoanele). */
const urechiPeRand = (k: number): UrechiO | null => [null, ur(4, 8, 2), ur(1, 0.5, 0.1), ur(100, 10_000, 1_000)][k % 4]!;

/** Operațiile unui document au un câmp propriu `urechi` (capcanele scrise înainte de ADR 0028, ciocniri în v5). */
export function areUrechiPeOperatii(d: unknown): boolean {
  if (!esteObiectL(d) || !Array.isArray(d['piese'])) return false;
  return (d['piese'] as unknown[]).some((p) => esteObiectL(p) && Array.isArray(p['operatii'])
    && (p['operatii'] as unknown[]).some((o) => esteObiectL(o) && Object.hasOwn(o, 'urechi')));
}

/** O copie fără câmpul `urechi` pe operații: aceeași capcană, mutată în `urechiVechi`, care nu se mai ciocnește. */
export function faraUrechiPeOperatii<D>(d: D): D {
  const c = structuredClone(d) as unknown;
  if (!esteObiectL(c) || !Array.isArray(c['piese'])) return c as D;
  for (const p of c['piese'] as unknown[]) {
    if (!esteObiectL(p) || !Array.isArray(p['operatii'])) continue;
    for (const o of p['operatii'] as unknown[]) {
      if (esteObiectL(o) && Object.hasOwn(o, 'urechi')) {
        o['urechiVechi'] = o['urechi'];
        delete o['urechi'];
      }
    }
  }
  return c as D;
}

/**
 * Migrări v4 → v5 pe hârtie (ADR 0028 §1): `schema: 5` și `urechi: null` pe fiecare operație, și pe `pe-linie`; tot
 * restul rămâne, cu câmpurile necunoscute. Un câmp `urechi` în altă parte decât pe operație nu e o ciocnire.
 */
export const MIGRARI_V4_HARTIE: ReadonlyArray<{ readonly nume: string; readonly v4: DocV4O; readonly v5: Liber }> = [
  {
    nume: 'MV4-01 trei operații (exterior opoziție, interior, pe-linie), câmpuri necunoscute; „urechi” pe sculă, nod, formă, piesă, instanță, foaie și sus',
    v4: {
      schema: 4, rev: 7, urechi: 'sus',
      piese: [{
        id: 'p1', urechi: 4,
        radacina: {
          tip: 'grup', id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, urechi: { numar: 4 },
          copii: [
            { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
            { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 5, urechi: null }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 10 } },
          ],
        },
        operatii: [
          { id: 'o1', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 6, urechi: [1] }, latura: 'exterior', adancime: 3, pas: 3, sens: 'opozitie', punti: 2 },
          { id: 'o2', tip: 'profil', noduri: ['c'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 8, pas: 4, sens: 'urcare' },
          { id: 'o3', tip: 'profil', noduri: ['c', 'r'], scula: { numar: 2, nume: 'V 90', diametru: 3.175 }, latura: 'pe-linie', adancime: 1, pas: 1, sens: 'opozitie' },
        ],
      }],
      foi: [{
        id: 'f1', urechi: false, stoc: { latime: 600, inaltime: 400, grosime: 18 },
        instante: [{ id: 'i1', piesa: 'p1', x: 10, y: 10, rotire: 0, urechi: 'i' }],
      }],
    },
    v5: {
      schema: 5, rev: 7, urechi: 'sus',
      piese: [{
        id: 'p1', urechi: 4,
        radacina: {
          tip: 'grup', id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, urechi: { numar: 4 },
          copii: [
            { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
            { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 5, urechi: null }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 10 } },
          ],
        },
        operatii: [
          { id: 'o1', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 6, urechi: [1] }, latura: 'exterior', adancime: 3, pas: 3, sens: 'opozitie', punti: 2, urechi: null },
          { id: 'o2', tip: 'profil', noduri: ['c'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 8, pas: 4, sens: 'urcare', urechi: null },
          { id: 'o3', tip: 'profil', noduri: ['c', 'r'], scula: { numar: 2, nume: 'V 90', diametru: 3.175 }, latura: 'pe-linie', adancime: 1, pas: 1, sens: 'opozitie', urechi: null },
        ],
      }],
      foi: [{
        id: 'f1', urechi: false, stoc: { latime: 600, inaltime: 400, grosime: 18 },
        instante: [{ id: 'i1', piesa: 'p1', x: 10, y: 10, rotire: 0, urechi: 'i' }],
      }],
    },
  },
  {
    nume: 'MV4-02 două piese, una fără operații, fără instanțe; ordinea operațiilor rămâne',
    v4: {
      schema: 4, rev: 0,
      piese: [
        { id: 'a', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [] },
        {
          id: 'b', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
          operatii: [
            { id: 'z', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 2, pas: 1, sens: 'opozitie' },
            { id: 'a', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 4, pas: 1, sens: 'urcare' },
          ],
        },
      ],
      foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 10 }, instante: [] }],
    },
    v5: {
      schema: 5, rev: 0,
      piese: [
        { id: 'a', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [] },
        {
          id: 'b', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
          operatii: [
            { id: 'z', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 2, pas: 1, sens: 'opozitie', urechi: null },
            { id: 'a', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 4, pas: 1, sens: 'urcare', urechi: null },
          ],
        },
      ],
      foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 10 }, instante: [] }],
    },
  },
  {
    nume: 'MV4-03 chei capcană pe operație și pe sculă (din JSON.parse)',
    v4: JSON.parse(
      '{"schema":4,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":5},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6,"__proto__":"s"},'
      + '"latura":"interior","adancime":8,"pas":4,"__proto__":"x","constructor":"Ion","sens":"urcare"}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as DocV4O,
    v5: JSON.parse(
      '{"schema":5,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":5},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6,"__proto__":"s"},'
      + '"latura":"interior","adancime":8,"pas":4,"__proto__":"x","constructor":"Ion","sens":"urcare","urechi":null}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as Liber,
  },
];

/**
 * Un document v5 din sămânță, valid: `genereazaV4(samanta)` fără capcanele `urechi` de pe operații (mutate în
 * `urechiVechi`), cu urechi alese la întâmplare pe fiecare operație (fără, sau valori din tot intervalul și de la
 * margini) și, uneori, capcane: un câmp `urechi` necunoscut pe sculă, pe piesă sau sus, un câmp necunoscut în urechi.
 */
export function genereazaV5(samanta: number, mare = false): DocV5O {
  const v4 = faraUrechiPeOperatii(genereazaV4(samanta, mare));
  const r = aleator(samanta + 0x0e5e);
  const valoare = (): UrechiO | null => {
    const x = r();
    if (x < 0.35) return null;
    if (x < 0.45) return ur(1, 5e-324, 5e-324);
    if (x < 0.5) return ur(100, 10_000, 1_000);
    const u: UrechiO = { numar: 1 + Math.floor(r() * 100), latime: (1 - r()) * 50, grosime: (1 - r()) * 20 };
    return r() < 0.1 ? { ...u, forma: 'dreptunghiulara' } : u;
  };
  const piese: PiesaV5O[] = v4.piese.map((p) => ({
    ...(r() < 0.1 ? { urechi: 3 } : {}),
    ...p,
    operatii: p.operatii.map((o): OperatieV5O => ({
      ...o,
      ...(r() < 0.1 ? { scula: { ...o.scula, urechi: 'scula' } } : {}),
      urechi: valoare(),
    })),
  }));
  return { ...(r() < 0.3 ? { urechi: [] } : {}), ...v4, schema: 5, piese };
}

export type CazV5 = { readonly nume: string; readonly doc: DocV5O };

export const CORPUS_V5: readonly CazV5[] = [
  ...Array.from({ length: 16 }, (_, k) => ({ nume: `GV5-${String(k + 1).padStart(2, '0')} generat, sămânța ${5000 + k}`, doc: genereazaV5(5000 + k) })),
  { nume: 'GV5-17 generat mare: 40 de piese, 3 foi, sămânța 98', doc: genereazaV5(98, true) },
];

// v4 refuzate la migrare (ADR 0028 §1): o operație v4 care are deja un câmp propriu „urechi”, oricare i-ar fi
// valoarea. Documentul v4 e valid (câmpul e necunoscut acolo); singura categorie raportată de `verificaV4V5` e
// `[ciocnire]`. La fel un v3 cu „urechi” pe o operație: lanțul v3 → v4 îl păstrează, v4 → v5 se ciocnește.

const bazaV4 = (): DocV4O => laV4(bazaV3()) as DocV4O;
const opV4 = (d: DocV4O, piesa: number, k: number): Liber => ((d.piese[piesa] as PiesaV4O).operatii[k] as OperatieV4O);
const refuzatV4 = (nume: string, strica: (d: DocV4O) => void): Refuzat => {
  const d = bazaV4();
  strica(d);
  return { nume, doc: d, motiv: 'ciocnire' };
};

export const REFUZATE_V4: readonly Refuzat[] = [
  refuzatV4('Z01 operație v4 cu urechi: null (chiar valoarea pe care ar scrie-o migrarea)', (d) => { opV4(d, 0, 0)['urechi'] = null; }),
  refuzatV4('Z02 operație v4 cu urechi: { numar: 4, latime: 8, grosime: 2 } (o valoare v5 bună)', (d) => { opV4(d, 0, 1)['urechi'] = ur(4, 8, 2); }),
  refuzatV4('Z03 operație v4 cu urechi: [] (capcana din corpusurile v3)', (d) => { opV4(d, 0, 0)['urechi'] = []; }),
  refuzatV4('Z04 operație v4 cu urechi: "4x8"', (d) => { opV4(d, 0, 1)['urechi'] = '4x8'; }),
  refuzatV4('Z05 operație v4 cu urechi: undefined, ca proprietate proprie', (d) => { opV4(d, 0, 0)['urechi'] = undefined; }),
  refuzatV4('Z06 doar operația pe-linie a unei piese fără instanțe are urechi', (d) => {
    d.piese.push(piesa4('p2', el('x', I()), [op4('a', ['x'], 'exterior', 'urcare'), { ...op4('b', ['x'], 'pe-linie', 'opozitie', 1, 1), urechi: { v: 1 } } as OperatieV4O]));
  }),
  {
    nume: 'Z07 operație v4 cu __proto__ și urechi (din JSON.parse)',
    motiv: 'ciocnire',
    doc: JSON.parse(
      '{"schema":4,"rev":0,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":1},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"f","diametru":6},"latura":"interior","adancime":1,"pas":1,"sens":"urcare","__proto__":"x","urechi":null}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":10,"inaltime":10,"grosime":1},"instante":[]}]}',
    ),
  },
  // Lanțul: un v3 cu urechi pe operație trece v3 → v4 (câmp necunoscut) și se ciocnește la v4 → v5.
  refuzatV3('Z08 operație v3 cu urechi: null (lanțul v3 → v4 → v5)', (d) => { opV3(d, 0, 0)['urechi'] = null; }),
  refuzatV3('Z09 operație v3 cu urechi: [] (capcana din corpusul v3)', (d) => { opV3(d, 0, 1)['urechi'] = []; }),
];

/**
 * Otrăvurile v5: cele v4 aduse la forma v5 (`laV5` DUPĂ stricare: fiecare operație-obiect primește `urechi: null`,
 * deci și cele construite de otravă), plus cele ale urechilor. Documentul v5 valid de la care pleacă cele noi e
 * `baza3` adus la v4 și la v5, cu o1 (exterior) cu urechi 4 × 8 × 2 și o2 (interior) fără.
 */
const baza5 = (): DocV5O => laV5(laV4(baza3()), (k) => (k === 0 ? ur(4, 8, 2) : null)) as DocV5O;
const o5 = (d: DocV5O, k = 0, piesa = 0): Liber => (d.piese[piesa] as PiesaV5O).operatii[k] as OperatieV5O;
const u5 = (d: DocV5O, k = 0): Liber => o5(d, k)['urechi'] as Liber;
const otravaUrechi = (nume: string, strica: (d: DocV5O) => void): Otrava => {
  const d = baza5();
  strica(d);
  return { nume, doc: d, categorie: 'urechi' };
};

export const OTRAVURI_URECHI: readonly Otrava[] = [
  otravaUrechi('U01 urechi lipsă (un v4 etichetat schema 5)', (d) => { delete o5(d, 1)['urechi']; }),
  otravaUrechi('U02 urechi undefined, ca proprietate proprie', (d) => { o5(d)['urechi'] = undefined; }),
  otravaUrechi('U03 urechi false (oprite, dar nu ca null)', (d) => { o5(d)['urechi'] = false; }),
  otravaUrechi('U04 urechi 0', (d) => { o5(d)['urechi'] = 0; }),
  otravaUrechi('U05 urechi [] (listă goală)', (d) => { o5(d)['urechi'] = []; }),
  otravaUrechi('U06 urechi [4, 8, 2] (listă, nu obiect)', (d) => { o5(d)['urechi'] = [4, 8, 2]; }),
  otravaUrechi('U07 urechi „4 × 8 × 2” (text)', (d) => { o5(d)['urechi'] = '4 × 8 × 2'; }),
  otravaUrechi('U08 numar 0', (d) => { u5(d)['numar'] = 0; }),
  otravaUrechi('U09 numar 101 (peste PLAFON.urechi)', (d) => { u5(d)['numar'] = 101; }),
  otravaUrechi('U10 numar 4,5 (nu e întreg)', (d) => { u5(d)['numar'] = 4.5; }),
  otravaUrechi('U11 numar „4” (text)', (d) => { u5(d)['numar'] = '4'; }),
  otravaUrechi('U12 numar −4', (d) => { u5(d)['numar'] = -4; }),
  otravaUrechi('U13 numar NaN', (d) => { u5(d)['numar'] = NaN; }),
  otravaUrechi('U14 numar Infinity', (d) => { u5(d)['numar'] = Infinity; }),
  otravaUrechi('U15 numar lipsă', (d) => { delete u5(d)['numar']; }),
  otravaUrechi('U16 numar 1 + 2^−52 (aproape întreg)', (d) => { u5(d)['numar'] = 1 + 2 ** -52; }),
  otravaUrechi('U17 latime 0', (d) => { u5(d)['latime'] = 0; }),
  otravaUrechi('U18 latime −8', (d) => { u5(d)['latime'] = -8; }),
  otravaUrechi('U19 latime 10 000,001 (peste PLAFON.latura)', (d) => { u5(d)['latime'] = 10_000.001; }),
  otravaUrechi('U20 latime Infinity', (d) => { u5(d)['latime'] = Infinity; }),
  otravaUrechi('U21 latime NaN', (d) => { u5(d)['latime'] = NaN; }),
  otravaUrechi('U22 latime „8” (text)', (d) => { u5(d)['latime'] = '8'; }),
  otravaUrechi('U23 latime lipsă', (d) => { delete u5(d)['latime']; }),
  otravaUrechi('U24 grosime 0', (d) => { u5(d)['grosime'] = 0; }),
  otravaUrechi('U25 grosime −2', (d) => { u5(d)['grosime'] = -2; }),
  otravaUrechi('U26 grosime 1 000,5 (peste PLAFON.grosime)', (d) => { u5(d)['grosime'] = 1000.5; }),
  otravaUrechi('U27 grosime null', (d) => { u5(d)['grosime'] = null; }),
  otravaUrechi('U28 grosime lipsă', (d) => { delete u5(d)['grosime']; }),
  otravaUrechi('U29 o operație pe-linie fără urechi (câmpul e obligatoriu și acolo)', (d) => {
    (d.piese[0] as PiesaV5O).operatii.push({ ...op4('l', ['e1'], 'pe-linie', 'urcare', 1, 1) } as unknown as OperatieV5O);
  }),
  otravaUrechi('U30 operația cu urechi greșite e a unei piese fără instanțe', (d) => {
    d.piese.push({ id: 'p2', radacina: el('x', I()), operatii: [{ ...op4('a', ['x'], 'exterior', 'urcare'), urechi: ur(0, 8, 2) }] } as PiesaV5O);
  }),
  otravaUrechi('U31 urechile puse pe sculă, nu pe operație', (d) => {
    const o = o5(d);
    o['scula'] = { ...(o['scula'] as SculaO), urechi: o['urechi'] };
    delete o['urechi'];
  }),
  otravaUrechi('U32 doar a doua operație are numar 0', (d) => { o5(d, 1)['urechi'] = ur(0, 8, 2); }),
];

export const OTRAVURI_V5: readonly Otrava[] = [
  // Construite din nou (unele sunt prea adânci pentru `structuredClone`), apoi aduse la v5 pe loc.
  ...[...otravuriArbore(4), ...otravuriOperatii(4), ...otravuriSens()].map((o) => ({
    nume: o.nume.startsWith('v4 ') ? `v5 ${o.nume.slice(3)}` : `v5 ${o.nume}`, doc: laV5(o.doc), categorie: o.categorie,
  })),
  ...OTRAVURI_URECHI,
];

export type CazValidV5 = { readonly nume: string; readonly doc: DocV5O };

export const VALIDE_DIFICILE_V5: readonly CazValidV5[] = [
  // Fiecare X / W de mai sus, adus la v5 (fără capcanele `urechi` de pe operații), cu urechile pe rând.
  ...VALIDE_DIFICILE_V4.map((c) => ({ nume: `${c.nume} (v5, urechi pe rând)`, doc: laV5(faraUrechiPeOperatii(c.doc), urechiPeRand) as DocV5O })),
  {
    nume: 'V01 la plafoane: numar 1 și 100, latime 10 000 și 5e−324, grosime 1 000 și 5e−324',
    doc: laV5(laV4(doc3(
      [piesa3('p1', grup('g', I(), [el('e1', I()), el('e2', T(50, 0), cerc())]), [op('a', ['e1'], 'exterior'), op('b', ['e2'], 'interior', 8, 4)])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    )), (k) => (k === 0 ? ur(1, 10_000, 1_000) : ur(100, 5e-324, 5e-324))) as DocV5O,
  },
  {
    nume: 'V02 urechi pe pe-linie, pe exterior și pe interior, cu sensuri diferite',
    doc: laV5(doc4([piesa4('p1', grup('g', I(), [el('a', I(), dr(80, 50, 6)), el('b', T(100, 0), cerc(10))]), [
      op4('l', ['a'], 'pe-linie', 'opozitie', 1, 1), op4('e', ['a'], 'exterior', 'urcare', 12, 4), op4('i', ['b'], 'interior', 'opozitie', 6, 2),
    ])], [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])]), (k) => ur(k + 2, 6 + k, 1.5)) as DocV5O,
  },
  {
    // ADR 0028 §2–§3: încăperea urechilor și grosimea punții față de foaie sunt ale exportului, nu ale ușii.
    nume: 'V03 urechi care nu încap (100 × 10 000) și puntea mai groasă decât foaia (1 000 pe foaia de 18): documentul e valid',
    doc: laV5(laV4(baza3()), () => ur(100, 10_000, 1_000)) as DocV5O,
  },
  {
    nume: 'V04 numar 4.0 (întreg în JS) și un câmp necunoscut în urechi (forma, note) se păstrează',
    doc: laV5(laV4(baza3()), (k) => (k === 0 ? { numar: 4.0, latime: 8, grosime: 2, forma: 'triunghi', note: { a: 1 } } : null)) as DocV5O,
  },
  {
    nume: 'V05 degroșarea și finisarea aceluiași contur, aceeași adâncime, una fără urechi, alta cu',
    doc: laV5(doc4(
      [piesa4('p1', el('e', I(), dr(80, 50, 6)), [op4('deg', ['e'], 'exterior', 'urcare', 12, 4), op4('fin', ['e'], 'exterior', 'urcare', 12, 12)])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ), (k) => (k === 0 ? null : ur(4, 8, 2))) as DocV5O,
  },
  {
    nume: 'V06 chei capcană în urechi și pe operație (din JSON.parse)',
    doc: JSON.parse(
      '{"schema":5,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":5},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6},"latura":"interior","adancime":8,"pas":4,'
      + '"__proto__":"x","sens":"opozitie","urechi":{"numar":3,"latime":6,"grosime":2,"__proto__":"u","constructor":"c"}}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as DocV5O,
  },
  {
    nume: 'V07 un câmp necunoscut „urechi” pe sculă, nod, piesă, instanță, foaie și sus, cu operația fără urechi',
    doc: {
      schema: 5, rev: 3, urechi: 'sus',
      piese: [{
        id: 'p1', urechi: { numar: 0 },
        radacina: { ...grup('g', I(), [{ ...el('e', I()), urechi: 'x' }]), urechi: ['x'] },
        operatii: [{ ...op4('o', ['e'], 'exterior', 'opozitie'), scula: { ...S1(), urechi: ur(4, 8, 2) }, urechi: null }],
      }],
      foi: [{ ...foaie('f1', [{ ...inst('i1', 'p1', 0, 0, 0), urechi: 1 }]), urechi: null }],
    } as DocV5O,
  },
];

// ---------------------------------------------------------------------------------------------------------------
// v6 (ADR 0029): rampa operației.

/**
 * Forma v6 a unui document v5 (sau a unei otrăvi v5): schema 5 devine 6, iar o schemă 6 (otrava „schema mai nouă” a
 * lui v5) devine 7, ca să rămână otravă; „5” devine „6”. Fiecare operație-obiect care n-are `rampa` primește
 * `rampa(k)` (implicit `null`; k = a câta, în tot documentul). Pe loc; întoarce documentul.
 */
const laV6 = (d: unknown, rampa: (k: number) => RampaO | null = () => null): unknown => {
  if (!esteObiectL(d)) return d;
  if (d['schema'] === 5) d['schema'] = 6;
  else if (d['schema'] === 6) d['schema'] = 7;
  else if (d['schema'] === '5') d['schema'] = '6';
  const piese = d['piese'];
  let k = 0;
  if (Array.isArray(piese)) {
    for (const p of piese) {
      if (!esteObiectL(p) || !Array.isArray(p['operatii'])) continue;
      for (const o of p['operatii'] as unknown[]) if (esteObiectL(o) && !Object.hasOwn(o, 'rampa')) o['rampa'] = rampa(k++);
    }
  }
  return d;
};

const rp = (lungime: number): RampaO => ({ lungime });
/** Rampele pe rând: fără, 10 (dialogul), 5e−324 (cea mai mică), 10 000 (`PLAFON.latura`). */
const rampePeRand = (k: number): RampaO | null => [null, rp(10), rp(5e-324), rp(10_000)][k % 4]!;

/** Operațiile unui document au un câmp propriu `rampa` (ciocniri la v5 → v6). */
export function areRampaPeOperatii(d: unknown): boolean {
  if (!esteObiectL(d) || !Array.isArray(d['piese'])) return false;
  return (d['piese'] as unknown[]).some((p) => esteObiectL(p) && Array.isArray(p['operatii'])
    && (p['operatii'] as unknown[]).some((o) => esteObiectL(o) && Object.hasOwn(o, 'rampa')));
}

/**
 * Migrări v5 → v6 pe hârtie (ADR 0029 §1): `schema: 6` și `rampa: null` pe fiecare operație, și pe `pe-linie`, și pe
 * cele cu urechi; tot restul rămâne, cu câmpurile necunoscute. Un câmp `rampa` în altă parte decât pe operație (pe
 * sculă, în urechi, pe nod, pe formă, pe piesă, pe instanță, pe foaie, sus) nu e o ciocnire.
 */
export const MIGRARI_V5_HARTIE: ReadonlyArray<{ readonly nume: string; readonly v5: DocV5O; readonly v6: Liber }> = [
  {
    nume: 'MV5-01 trei operații (exterior cu urechi, interior, pe-linie), câmpuri necunoscute; „rampa” pe sculă, în urechi, pe nod, formă, piesă, instanță, foaie și sus',
    v5: {
      schema: 5, rev: 9, rampa: 'sus',
      piese: [{
        id: 'p1', rampa: 4,
        radacina: {
          tip: 'grup', id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, rampa: { lungime: 10 },
          copii: [
            { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
            { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 5, rampa: null }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 10 } },
          ],
        },
        operatii: [
          { id: 'o1', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 6, rampa: [1] }, latura: 'exterior', adancime: 12, pas: 4, sens: 'opozitie', urechi: { numar: 4, latime: 8, grosime: 2, rampa: 'u' }, intrari: 2 },
          { id: 'o2', tip: 'profil', noduri: ['c'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 8, pas: 4, sens: 'urcare', urechi: null },
          { id: 'o3', tip: 'profil', noduri: ['c', 'r'], scula: { numar: 2, nume: 'V 90', diametru: 3.175 }, latura: 'pe-linie', adancime: 1, pas: 1, sens: 'opozitie', urechi: null },
        ],
      }],
      foi: [{
        id: 'f1', rampa: false, stoc: { latime: 600, inaltime: 400, grosime: 18 },
        instante: [{ id: 'i1', piesa: 'p1', x: 10, y: 10, rotire: 0, rampa: 'i' }],
      }],
    },
    v6: {
      schema: 6, rev: 9, rampa: 'sus',
      piese: [{
        id: 'p1', rampa: 4,
        radacina: {
          tip: 'grup', id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, rampa: { lungime: 10 },
          copii: [
            { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
            { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 5, rampa: null }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 10 } },
          ],
        },
        operatii: [
          { id: 'o1', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 6, rampa: [1] }, latura: 'exterior', adancime: 12, pas: 4, sens: 'opozitie', urechi: { numar: 4, latime: 8, grosime: 2, rampa: 'u' }, intrari: 2, rampa: null },
          { id: 'o2', tip: 'profil', noduri: ['c'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 8, pas: 4, sens: 'urcare', urechi: null, rampa: null },
          { id: 'o3', tip: 'profil', noduri: ['c', 'r'], scula: { numar: 2, nume: 'V 90', diametru: 3.175 }, latura: 'pe-linie', adancime: 1, pas: 1, sens: 'opozitie', urechi: null, rampa: null },
        ],
      }],
      foi: [{
        id: 'f1', rampa: false, stoc: { latime: 600, inaltime: 400, grosime: 18 },
        instante: [{ id: 'i1', piesa: 'p1', x: 10, y: 10, rotire: 0, rampa: 'i' }],
      }],
    },
  },
  {
    nume: 'MV5-02 două piese, una fără operații, fără instanțe; ordinea operațiilor rămâne',
    v5: {
      schema: 5, rev: 0,
      piese: [
        { id: 'a', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [] },
        {
          id: 'b', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
          operatii: [
            { id: 'z', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 2, pas: 1, sens: 'opozitie', urechi: { numar: 1, latime: 6, grosime: 1 } },
            { id: 'a', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 4, pas: 1, sens: 'urcare', urechi: null },
          ],
        },
      ],
      foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 10 }, instante: [] }],
    },
    v6: {
      schema: 6, rev: 0,
      piese: [
        { id: 'a', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [] },
        {
          id: 'b', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
          operatii: [
            { id: 'z', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 2, pas: 1, sens: 'opozitie', urechi: { numar: 1, latime: 6, grosime: 1 }, rampa: null },
            { id: 'a', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 4, pas: 1, sens: 'urcare', urechi: null, rampa: null },
          ],
        },
      ],
      foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 10 }, instante: [] }],
    },
  },
  {
    nume: 'MV5-03 chei capcană pe operație, pe sculă și în urechi (din JSON.parse)',
    v5: JSON.parse(
      '{"schema":5,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":5},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6,"__proto__":"s"},'
      + '"latura":"interior","adancime":8,"pas":4,"__proto__":"x","constructor":"Ion","sens":"urcare",'
      + '"urechi":{"numar":3,"latime":6,"grosime":2,"__proto__":"u"}}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as DocV5O,
    v6: JSON.parse(
      '{"schema":6,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":5},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6,"__proto__":"s"},'
      + '"latura":"interior","adancime":8,"pas":4,"__proto__":"x","constructor":"Ion","sens":"urcare",'
      + '"urechi":{"numar":3,"latime":6,"grosime":2,"__proto__":"u"},"rampa":null}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as Liber,
  },
];

/**
 * Un document v6 din sămânță, valid: `genereazaV5(samanta)` cu o rampă aleasă la întâmplare pe fiecare operație (fără,
 * 10, margini, sau o lungime din tot intervalul) și, uneori, capcane: un câmp `rampa` necunoscut pe sculă, în urechi, pe
 * piesă sau sus, un câmp necunoscut în rampă.
 */
export function genereazaV6(samanta: number, mare = false): DocV6O {
  const v5 = genereazaV5(samanta, mare);
  const r = aleator(samanta + 0x0a29);
  const valoare = (): RampaO | null => {
    const x = r();
    if (x < 0.35) return null;
    if (x < 0.5) return rp(10);
    if (x < 0.55) return rp(5e-324);
    if (x < 0.6) return rp(10_000);
    const o: RampaO = { lungime: (1 - r()) * 200 };
    return r() < 0.1 ? { ...o, unghi: 3 } : o;
  };
  const piese: PiesaV6O[] = v5.piese.map((p) => ({
    ...(r() < 0.1 ? { rampa: 3 } : {}),
    ...p,
    operatii: p.operatii.map((o): OperatieV6O => ({
      ...o,
      ...(r() < 0.1 ? { scula: { ...o.scula, rampa: 'scula' } } : {}),
      ...(o.urechi !== null && r() < 0.2 ? { urechi: { ...o.urechi, rampa: 1 } } : {}),
      rampa: valoare(),
    })),
  }));
  return { ...(r() < 0.3 ? { rampa: [] } : {}), ...v5, schema: 6, piese };
}

export type CazV6 = { readonly nume: string; readonly doc: DocV6O };

export const CORPUS_V6: readonly CazV6[] = [
  ...Array.from({ length: 16 }, (_, k) => ({ nume: `GV6-${String(k + 1).padStart(2, '0')} generat, sămânța ${5000 + k}`, doc: genereazaV6(5000 + k) })),
  { nume: 'GV6-17 generat mare: 40 de piese, 3 foi, sămânța 98', doc: genereazaV6(98, true) },
];

// v5 refuzate la migrare (ADR 0029 §1): o operație v5 care are deja un câmp propriu „rampa”, oricare i-ar fi
// valoarea. Documentul v5 e valid (câmpul e necunoscut acolo); singura categorie raportată de `verificaV5V6` e
// `[ciocnire]`. La fel un v4 sau un v3 cu „rampa” pe o operație: lanțul îl păstrează până la v5 și se ciocnește la v6.

const bazaV5 = (): DocV5O => laV5(laV4(bazaV3()), (k) => (k === 0 ? ur(4, 8, 2) : null)) as DocV5O;
const opV5 = (d: DocV5O, piesa: number, k: number): Liber => ((d.piese[piesa] as PiesaV5O).operatii[k] as OperatieV5O);
const refuzatV5 = (nume: string, strica: (d: DocV5O) => void): Refuzat => {
  const d = bazaV5();
  strica(d);
  return { nume, doc: d, motiv: 'ciocnire' };
};

export const REFUZATE_V5: readonly Refuzat[] = [
  refuzatV5('Y01 operație v5 cu rampa: null (chiar valoarea pe care ar scrie-o migrarea)', (d) => { opV5(d, 0, 0)['rampa'] = null; }),
  refuzatV5('Y02 operație v5 cu rampa: { lungime: 10 } (o valoare v6 bună)', (d) => { opV5(d, 0, 1)['rampa'] = rp(10); }),
  refuzatV5('Y03 operație v5 cu rampa: []', (d) => { opV5(d, 0, 0)['rampa'] = []; }),
  refuzatV5('Y04 operație v5 cu rampa: "10 mm"', (d) => { opV5(d, 0, 1)['rampa'] = '10 mm'; }),
  refuzatV5('Y05 operație v5 cu rampa: undefined, ca proprietate proprie', (d) => { opV5(d, 0, 0)['rampa'] = undefined; }),
  refuzatV5('Y06 doar operația pe-linie a unei piese fără instanțe are rampa', (d) => {
    d.piese.push({
      id: 'p2', radacina: el('x', I()),
      operatii: [{ ...op4('a', ['x'], 'exterior', 'urcare'), urechi: null }, { ...op4('b', ['x'], 'pe-linie', 'opozitie', 1, 1), urechi: null, rampa: { v: 1 } }],
    } as PiesaV5O);
  }),
  {
    nume: 'Y07 operație v5 cu __proto__ și rampa (din JSON.parse)',
    motiv: 'ciocnire',
    doc: JSON.parse(
      '{"schema":5,"rev":0,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":1},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"f","diametru":6},"latura":"interior","adancime":1,"pas":1,"sens":"urcare","urechi":null,"__proto__":"x","rampa":null}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":10,"inaltime":10,"grosime":1},"instante":[]}]}',
    ),
  },
  // Lanțul: un v4 sau un v3 cu rampa pe operație trece până la v5 (câmp necunoscut) și se ciocnește la v5 → v6.
  refuzatV4('Y08 operație v4 cu rampa: null (lanțul v4 → v5 → v6)', (d) => { opV4(d, 0, 0)['rampa'] = null; }),
  refuzatV4('Y09 operație v4 cu rampa: { lungime: 10 }', (d) => { opV4(d, 0, 1)['rampa'] = rp(10); }),
  refuzatV3('Y10 operație v3 cu rampa: null (lanțul v3 → … → v6)', (d) => { opV3(d, 0, 0)['rampa'] = null; }),
];

/**
 * Otrăvurile v6: cele v5 aduse la forma v6 (`laV6` DUPĂ stricare: fiecare operație-obiect primește `rampa: null`, deci
 * și cele construite de otravă), plus cele ale rampei. Documentul v6 valid de la care pleacă cele noi e `baza5` adus la
 * v6, cu o1 (exterior, cu urechi) cu rampa 10 și o2 (interior) fără.
 */
const baza6 = (): DocV6O => laV6(baza5(), (k) => (k === 0 ? rp(10) : null)) as DocV6O;
const o6 = (d: DocV6O, k = 0, piesa = 0): Liber => (d.piese[piesa] as PiesaV6O).operatii[k] as OperatieV6O;
const r6 = (d: DocV6O, k = 0): Liber => o6(d, k)['rampa'] as Liber;
const otravaRampa = (nume: string, strica: (d: DocV6O) => void): Otrava => {
  const d = baza6();
  strica(d);
  return { nume, doc: d, categorie: 'rampa' };
};

export const OTRAVURI_RAMPA: readonly Otrava[] = [
  otravaRampa('R01 rampa lipsă (un v5 etichetat schema 6)', (d) => { delete o6(d, 1)['rampa']; }),
  otravaRampa('R02 rampa undefined, ca proprietate proprie', (d) => { o6(d)['rampa'] = undefined; }),
  otravaRampa('R03 rampa false (oprită, dar nu ca null)', (d) => { o6(d)['rampa'] = false; }),
  otravaRampa('R04 rampa 0', (d) => { o6(d)['rampa'] = 0; }),
  otravaRampa('R05 rampa 10 (număr, nu obiect)', (d) => { o6(d)['rampa'] = 10; }),
  otravaRampa('R06 rampa [] (listă goală)', (d) => { o6(d)['rampa'] = []; }),
  otravaRampa('R07 rampa [10] (listă, nu obiect)', (d) => { o6(d)['rampa'] = [10]; }),
  otravaRampa('R08 rampa „10” (text)', (d) => { o6(d)['rampa'] = '10'; }),
  otravaRampa('R09 rampa {} (fără lungime)', (d) => { o6(d)['rampa'] = {}; }),
  otravaRampa('R10 lungime 0', (d) => { r6(d)['lungime'] = 0; }),
  otravaRampa('R11 lungime −0', (d) => { r6(d)['lungime'] = -0; }),
  otravaRampa('R12 lungime −10', (d) => { r6(d)['lungime'] = -10; }),
  otravaRampa('R13 lungime 10 000,001 (peste PLAFON.latura)', (d) => { r6(d)['lungime'] = 10_000.001; }),
  otravaRampa('R14 lungime Infinity', (d) => { r6(d)['lungime'] = Infinity; }),
  otravaRampa('R15 lungime NaN', (d) => { r6(d)['lungime'] = NaN; }),
  otravaRampa('R16 lungime „10” (text)', (d) => { r6(d)['lungime'] = '10'; }),
  otravaRampa('R17 lungime null', (d) => { r6(d)['lungime'] = null; }),
  otravaRampa('R18 lungime lipsă, cu un alt câmp (unghi)', (d) => { o6(d)['rampa'] = { unghi: 3 }; }),
  otravaRampa('R19 lungime true', (d) => { r6(d)['lungime'] = true; }),
  otravaRampa('R20 o operație pe-linie fără rampa (câmpul e obligatoriu și acolo)', (d) => {
    (d.piese[0] as PiesaV6O).operatii.push({ ...op4('l', ['e1'], 'pe-linie', 'urcare', 1, 1), urechi: null } as unknown as OperatieV6O);
  }),
  otravaRampa('R21 operația cu rampa greșită e a unei piese fără instanțe', (d) => {
    d.piese.push({ id: 'p2', radacina: el('x', I()), operatii: [{ ...op4('a', ['x'], 'exterior', 'urcare'), urechi: null, rampa: rp(0) }] } as PiesaV6O);
  }),
  otravaRampa('R22 rampa pusă pe sculă, nu pe operație', (d) => {
    const o = o6(d);
    o['scula'] = { ...(o['scula'] as SculaO), rampa: o['rampa'] };
    delete o['rampa'];
  }),
  otravaRampa('R23 rampa pusă în urechi, nu pe operație', (d) => {
    const o = o6(d);
    o['urechi'] = { ...(o['urechi'] as UrechiO), rampa: o['rampa'] };
    delete o['rampa'];
  }),
  otravaRampa('R24 doar a doua operație are lungimea 0', (d) => { o6(d, 1)['rampa'] = rp(0); }),
];

export const OTRAVURI_V6: readonly Otrava[] = [
  // Construite din nou (unele sunt prea adânci pentru `structuredClone`), aduse la v5, apoi la v6, pe loc.
  ...[...otravuriArbore(4), ...otravuriOperatii(4), ...otravuriSens()].map((o) => ({
    nume: o.nume.startsWith('v4 ') ? `v6 ${o.nume.slice(3)}` : `v6 ${o.nume}`, doc: laV6(laV5(o.doc)), categorie: o.categorie,
  })),
  ...OTRAVURI_URECHI.map((o) => ({ nume: `v6 ${o.nume}`, doc: laV6(structuredClone(o.doc)), categorie: o.categorie })),
  ...OTRAVURI_RAMPA,
];

export type CazValidV6 = { readonly nume: string; readonly doc: DocV6O };

export const VALIDE_DIFICILE_V6: readonly CazValidV6[] = [
  // Fiecare document valid dificil v5, adus la v6, cu rampele pe rând.
  ...VALIDE_DIFICILE_V5.map((c) => ({ nume: `${c.nume} (v6, rampe pe rând)`, doc: laV6(structuredClone(c.doc), rampePeRand) as DocV6O })),
  {
    nume: 'X01 la plafoane: lungimea 10 000 și 5e−324',
    doc: laV6(laV5(laV4(doc3(
      [piesa3('p1', grup('g', I(), [el('e1', I()), el('e2', T(50, 0), cerc())]), [op('a', ['e1'], 'exterior'), op('b', ['e2'], 'interior', 8, 4)])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ))), (k) => (k === 0 ? rp(10_000) : rp(5e-324))) as DocV6O,
  },
  {
    nume: 'X02 rampa pe pe-linie, pe exterior (cu urechi) și pe interior, cu sensuri diferite',
    doc: laV6(laV5(doc4([piesa4('p1', grup('g', I(), [el('a', I(), dr(80, 50, 6)), el('b', T(100, 0), cerc(10))]), [
      op4('l', ['a'], 'pe-linie', 'opozitie', 1, 1), op4('e', ['a'], 'exterior', 'urcare', 12, 4), op4('i', ['b'], 'interior', 'opozitie', 6, 2),
    ])], [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])]), (k) => (k === 1 ? ur(4, 8, 2) : null)), (k) => rp(5 + 5 * k)) as DocV6O,
  },
  {
    // ADR 0029 §2: Lr = min(lungime, P / 2) e al exportului; o rampă mai lungă decât orice buclă e un document valid.
    nume: 'X03 rampa de 10 000 pe un cerc R5 (mai lungă decât bucla): documentul e valid',
    doc: laV6(laV5(laV4(baza3())), () => rp(10_000)) as DocV6O,
  },
  {
    nume: 'X04 un câmp necunoscut în rampă (unghi, note) se păstrează; lungimea 10.0',
    doc: laV6(laV5(laV4(baza3())), (k) => (k === 0 ? { lungime: 10.0, unghi: 3, note: { a: 1 } } : null)) as DocV6O,
  },
  {
    nume: 'X05 degroșarea și finisarea aceluiași contur, aceeași adâncime, una cu rampă, alta fără',
    doc: laV6(laV5(doc4(
      [piesa4('p1', el('e', I(), dr(80, 50, 6)), [op4('deg', ['e'], 'exterior', 'urcare', 12, 4), op4('fin', ['e'], 'exterior', 'urcare', 12, 12)])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ), () => ur(4, 8, 2)), (k) => (k === 0 ? rp(10) : null)) as DocV6O,
  },
  {
    nume: 'X06 chei capcană în rampă și pe operație (din JSON.parse)',
    doc: JSON.parse(
      '{"schema":6,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":5},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6},"latura":"interior","adancime":8,"pas":4,'
      + '"__proto__":"x","sens":"opozitie","urechi":null,"rampa":{"lungime":7.5,"__proto__":"r","constructor":"c"}}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as DocV6O,
  },
  {
    nume: 'X07 un câmp necunoscut „rampa” pe sculă, în urechi, pe nod, piesă, instanță, foaie și sus, cu operația fără rampă',
    doc: {
      schema: 6, rev: 3, rampa: 'sus',
      piese: [{
        id: 'p1', rampa: { lungime: 0 },
        radacina: { ...grup('g', I(), [{ ...el('e', I()), rampa: 'x' }]), rampa: ['x'] },
        operatii: [{ ...op4('o', ['e'], 'exterior', 'opozitie'), scula: { ...S1(), rampa: rp(10) }, urechi: { ...ur(4, 8, 2), rampa: rp(-1) }, rampa: null }],
      }],
      foi: [{ ...foaie('f1', [{ ...inst('i1', 'p1', 0, 0, 0), rampa: 1 }]), rampa: null }],
    } as DocV6O,
  },
];
