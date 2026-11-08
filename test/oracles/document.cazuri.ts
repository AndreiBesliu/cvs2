/**
 * CAZURILE oracolului documentului (ADR 0024 + 0025 + 0027 + 0028 + 0029 + 0030 + 0032, documentul v8), cu ZERO importuri din `src/`:
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
 * - v7 (ADR 0030, felia 2.5b, sesiune independentă, tot la sfârșit): `MIGRARI_V6_HARTIE` (v6 → v7 pe hârtie),
 *   `CORPUS_V7` (generat), `REFUZATE_V6` (o operație v6, v5, v4 sau v3 care are deja `intrari`: ciocnire),
 *   `OTRAVURI_V7` (cele v6 aduse la v7, plus `OTRAVURI_INTRARI`, doar `[intrari]`) și `VALIDE_DIFICILE_V7`. Capcanele
 *   `intrari` scrise pe operații înainte de ADR 0030 (W10 în v3; MV5-01 în v5 / v6) sunt acum ciocniri:
 *   `areIntrariPeOperatii` le găsește, `faraIntrariPeOperatii` le mută în `intrariVechi`.
 * - v8 (ADR 0032, felia 2.6, sesiune independentă, tot la sfârșit): `MIGRARI_V7_HARTIE` (v7 → v8 pe hârtie), `CORPUS_V8`
 *   (generat), `REFUZATE_V7` (o operație v7, v6, v5, v4 sau v3 care are deja `colturi`: ciocnire), `OTRAVURI_V8` (cele
 *   v7 aduse la v8, plus `OTRAVURI_COLTURI`, doar `[colturi]`) și `VALIDE_DIFICILE_V8`. Niciun corpus mai vechi nu are
 *   `colturi` pe operații (`areColturiPeOperatii`); capcana `colturi` din v1 (C-…, pe formă) rămâne un câmp necunoscut.
 * - v9 (ADR 0034, felia 2.7b): în `document.v9.cazuri.ts`, ca fișierele care nu-l folosesc să nu-l construiască; de aceea
 *   `aleator`, `laV5` … `laV8` și generatorii otrăvurilor (`otravuriArbore`, `otravuriOperatii`, `otravuriSens`) sunt
 *   exportate.
 * - v23 (ADR 0210 §7, felia 11.4↑: literele plăcuțelor din CSV, `Instanta.texte`): la capăt, după v11–v22, cu antetul lui.
 */
import type {
  CategorieO, DocV1O, DocV2O, DocV3O, DocV4O, DocV5O, DocV6O, ElementO, ElementV1O, FoaieO, GrupO, InstantaO, LaturaO, Liber,
  MatriceO, NodO, OperatieO, OperatieV4O, OperatieV5O, OperatieV6O, PiesaO, PiesaV3O, PiesaV4O, PiesaV5O, PiesaV6O, PunctO,
  RampaO, SculaO, SensO, TaieturaV4O, UrechiO, DocV7O, IntrariO, OperatieV7O, PiesaV7O, ColturiO, DocV8O, OperatieV8O, PiesaV8O,
} from './document.ts';
// v23 (ADR 0105 §4): amprenta unui bloc e o funcție a literelor șablonului, nu o regulă: o calculează oracolul.
import { amprentaContururiO } from './document.ts';

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

/**
 * Felia 2.7b: un caz al cărui document se construiește la prima citire, apoi rămâne același (copiile pe versiuni ale
 * documentelor de 100 000 de noduri și operații costau secunde la fiecare import, și în fișierele care nu le citesc).
 * Funcțiile de mai jos (`laV4` … `laV8`, `alternant`, `urechiPeRand` …) sunt pure, deci ordinea citirilor nu contează.
 */
export function lenes<D>(nume: string, f: () => D): { readonly nume: string; readonly doc: D } {
  let d: D | undefined;
  return { nume, get doc(): D { return (d ??= f()); } };
}

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
export function aleator(samanta: number): () => number {
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
export function otravuriArbore(versiune: 2 | 3 | 4): Otrava[] {
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
export function otravuriOperatii(versiune: 3 | 4): Otrava[] {
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
export const otravuriSens = (): Otrava[] => [
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
  ...VALIDE_DIFICILE_V3.map((c) => lenes(`${c.nume} (v4, sensuri pe rând)`, () => laV4(structuredClone(c.doc), alternant) as DocV4O)),
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
export const laV5 = (d: unknown, urechi: (k: number) => UrechiO | null = () => null): unknown => {
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
  ...VALIDE_DIFICILE_V4.map((c) => lenes(`${c.nume} (v5, urechi pe rând)`, () => laV5(faraUrechiPeOperatii(c.doc), urechiPeRand) as DocV5O)),
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
export const laV6 = (d: unknown, rampa: (k: number) => RampaO | null = () => null): unknown => {
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
  ...VALIDE_DIFICILE_V5.map((c) => lenes(`${c.nume} (v6, rampe pe rând)`, () => laV6(structuredClone(c.doc), rampePeRand) as DocV6O)),
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

// ---------------------------------------------------------------------------------------------------------------
// v7 (ADR 0030): intrările operației. Sesiune independentă, scrise doar din textul ADR-ului.

/**
 * Forma v7 a unui document v6 (sau a unei otrăvi v6): schema 6 devine 7, iar o schemă 7 (otrava „schema mai nouă” a
 * lui v6) devine 8, ca să rămână otravă; „6” devine „7”. Fiecare operație-obiect care n-are `intrari` primește
 * `intrari(k)` (implicit `null`; k = a câta, în tot documentul). Pe loc; întoarce documentul.
 */
export const laV7 = (d: unknown, intrari: (k: number) => IntrariO | null = () => null): unknown => {
  if (!esteObiectL(d)) return d;
  if (d['schema'] === 6) d['schema'] = 7;
  else if (d['schema'] === 7) d['schema'] = 8;
  else if (d['schema'] === '6') d['schema'] = '7';
  const piese = d['piese'];
  let k = 0;
  if (Array.isArray(piese)) {
    for (const p of piese) {
      if (!esteObiectL(p) || !Array.isArray(p['operatii'])) continue;
      for (const o of p['operatii'] as unknown[]) if (esteObiectL(o) && !Object.hasOwn(o, 'intrari')) o['intrari'] = intrari(k++);
    }
  }
  return d;
};

const ir = (raza: number): IntrariO => ({ raza });
/** Intrările pe rând: fără, 3 (dialogul), 5e−324 (cea mai mică pozitivă: ușa o primește, exportul o refuză), 10 000. */
const intrariPeRand = (k: number): IntrariO | null => [null, ir(3), ir(5e-324), ir(10_000)][k % 4]!;

/** Operațiile unui document au un câmp propriu `intrari` (capcanele scrise înainte de ADR 0030, ciocniri în v7). */
export function areIntrariPeOperatii(d: unknown): boolean {
  if (!esteObiectL(d) || !Array.isArray(d['piese'])) return false;
  return (d['piese'] as unknown[]).some((p) => esteObiectL(p) && Array.isArray(p['operatii'])
    && (p['operatii'] as unknown[]).some((o) => esteObiectL(o) && Object.hasOwn(o, 'intrari')));
}

/** O copie fără câmpul `intrari` pe operații: aceeași capcană, mutată în `intrariVechi`, care nu se mai ciocnește. */
export function faraIntrariPeOperatii<D>(d: D): D {
  const c = structuredClone(d) as unknown;
  if (!esteObiectL(c) || !Array.isArray(c['piese'])) return c as D;
  for (const p of c['piese'] as unknown[]) {
    if (!esteObiectL(p) || !Array.isArray(p['operatii'])) continue;
    for (const o of p['operatii'] as unknown[]) {
      if (esteObiectL(o) && Object.hasOwn(o, 'intrari')) {
        o['intrariVechi'] = o['intrari'];
        delete o['intrari'];
      }
    }
  }
  return c as D;
}

/**
 * Migrări v6 → v7 pe hârtie (ADR 0030 §1): `schema: 7` și `intrari: null` pe fiecare operație, și pe `pe-linie`, și pe
 * cele cu urechi sau rampă; tot restul rămâne, cu câmpurile necunoscute. Un câmp `intrari` în altă parte decât pe
 * operație (pe sculă, în urechi, în rampă, pe nod, pe formă, pe piesă, pe instanță, pe foaie, sus) nu e o ciocnire.
 */
export const MIGRARI_V6_HARTIE: ReadonlyArray<{ readonly nume: string; readonly v6: DocV6O; readonly v7: Liber }> = [
  {
    nume: 'MV6-01 trei operații (exterior cu urechi și rampă, interior, pe-linie), câmpuri necunoscute; „intrari” pe sculă, în urechi, în rampă, pe nod, formă, piesă, instanță, foaie și sus',
    v6: {
      schema: 6, rev: 9, intrari: 'sus',
      piese: [{
        id: 'p1', intrari: 4,
        radacina: {
          tip: 'grup', id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, intrari: { raza: 3 },
          copii: [
            { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 80, inaltime: 50, razaColt: 6 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, intrari: null },
            { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 5, intrari: null }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 10 } },
          ],
        },
        operatii: [
          { id: 'o1', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 6, intrari: [1] }, latura: 'exterior', adancime: 12, pas: 4, sens: 'opozitie', urechi: { numar: 4, latime: 8, grosime: 2, intrari: 'u' }, rampa: { lungime: 10, intrari: { raza: 1 } }, note: 'de pastrat' },
          { id: 'o2', tip: 'profil', noduri: ['c'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 8, pas: 4, sens: 'urcare', urechi: null, rampa: null },
          { id: 'o3', tip: 'profil', noduri: ['c', 'r'], scula: { numar: 2, nume: 'V 90', diametru: 3.175 }, latura: 'pe-linie', adancime: 1, pas: 1, sens: 'opozitie', urechi: null, rampa: null },
        ],
      }],
      foi: [{
        id: 'f1', intrari: false, stoc: { latime: 600, inaltime: 400, grosime: 18 },
        instante: [{ id: 'i1', piesa: 'p1', x: 10, y: 10, rotire: 0, intrari: 'i' }],
      }],
    },
    v7: {
      schema: 7, rev: 9, intrari: 'sus',
      piese: [{
        id: 'p1', intrari: 4,
        radacina: {
          tip: 'grup', id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, intrari: { raza: 3 },
          copii: [
            { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 80, inaltime: 50, razaColt: 6 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, intrari: null },
            { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 5, intrari: null }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 10 } },
          ],
        },
        operatii: [
          { id: 'o1', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 6, intrari: [1] }, latura: 'exterior', adancime: 12, pas: 4, sens: 'opozitie', urechi: { numar: 4, latime: 8, grosime: 2, intrari: 'u' }, rampa: { lungime: 10, intrari: { raza: 1 } }, note: 'de pastrat', intrari: null },
          { id: 'o2', tip: 'profil', noduri: ['c'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 8, pas: 4, sens: 'urcare', urechi: null, rampa: null, intrari: null },
          { id: 'o3', tip: 'profil', noduri: ['c', 'r'], scula: { numar: 2, nume: 'V 90', diametru: 3.175 }, latura: 'pe-linie', adancime: 1, pas: 1, sens: 'opozitie', urechi: null, rampa: null, intrari: null },
        ],
      }],
      foi: [{
        id: 'f1', intrari: false, stoc: { latime: 600, inaltime: 400, grosime: 18 },
        instante: [{ id: 'i1', piesa: 'p1', x: 10, y: 10, rotire: 0, intrari: 'i' }],
      }],
    },
  },
  {
    nume: 'MV6-02 o piesă fără operații și una cu două operații pe același cerc; ordinea operațiilor rămâne',
    v6: {
      schema: 6, rev: 0,
      piese: [
        { id: 'a', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [] },
        {
          id: 'b', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
          operatii: [
            { id: 'z', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 2, pas: 1, sens: 'opozitie', urechi: null, rampa: { lungime: 1 } },
            { id: 'a', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 4, pas: 1, sens: 'urcare', urechi: null, rampa: null },
          ],
        },
      ],
      foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 10 }, instante: [] }],
    },
    v7: {
      schema: 7, rev: 0,
      piese: [
        { id: 'a', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [] },
        {
          id: 'b', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
          operatii: [
            { id: 'z', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 2, pas: 1, sens: 'opozitie', urechi: null, rampa: { lungime: 1 }, intrari: null },
            { id: 'a', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 4, pas: 1, sens: 'urcare', urechi: null, rampa: null, intrari: null },
          ],
        },
      ],
      foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 10 }, instante: [] }],
    },
  },
  {
    nume: 'MV6-03 chei capcană pe operație, pe sculă și în rampă (din JSON.parse)',
    v6: JSON.parse(
      '{"schema":6,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":5},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6,"__proto__":"s"},'
      + '"latura":"interior","adancime":8,"pas":4,"__proto__":"x","constructor":"Ion","sens":"urcare",'
      + '"urechi":null,"rampa":{"lungime":7,"__proto__":"r"}}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as DocV6O,
    v7: JSON.parse(
      '{"schema":7,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":5},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6,"__proto__":"s"},'
      + '"latura":"interior","adancime":8,"pas":4,"__proto__":"x","constructor":"Ion","sens":"urcare",'
      + '"urechi":null,"rampa":{"lungime":7,"__proto__":"r"},"intrari":null}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as Liber,
  },
];

/**
 * Un document v7 din sămânță, valid: `genereazaV6(samanta)` fără capcanele `intrari` vechi, cu intrări alese la
 * întâmplare pe fiecare operație (fără, 3, margini, sau o rază din tot intervalul) și, uneori, capcane: un câmp
 * `intrari` necunoscut pe sculă, în urechi, în rampă, pe piesă sau sus, un câmp necunoscut în intrări.
 */
export function genereazaV7(samanta: number, mare = false): DocV7O {
  const v6 = faraIntrariPeOperatii(genereazaV6(samanta, mare));
  const r = aleator(samanta + 0x0a30);
  const valoare = (): IntrariO | null => {
    const x = r();
    if (x < 0.35) return null;
    if (x < 0.5) return ir(3);
    if (x < 0.55) return ir(5e-324);
    if (x < 0.6) return ir(10_000);
    const o: IntrariO = { raza: (1 - r()) * 50 };
    return r() < 0.1 ? { ...o, forma: 'arc' } : o;
  };
  const piese: PiesaV7O[] = v6.piese.map((p) => ({
    ...(r() < 0.1 ? { intrari: 3 } : {}),
    ...p,
    operatii: p.operatii.map((o): OperatieV7O => ({
      ...o,
      ...(r() < 0.1 ? { scula: { ...o.scula, intrari: 'scula' } } : {}),
      ...(o.urechi !== null && r() < 0.2 ? { urechi: { ...o.urechi, intrari: 1 } } : {}),
      ...(o.rampa !== null && r() < 0.2 ? { rampa: { ...o.rampa, intrari: { raza: 0 } } } : {}),
      intrari: valoare(),
    })),
  }));
  return { ...(r() < 0.3 ? { intrari: [] } : {}), ...v6, schema: 7, piese };
}

export type CazV7 = { readonly nume: string; readonly doc: DocV7O };

export const CORPUS_V7: readonly CazV7[] = [
  ...Array.from({ length: 16 }, (_, k) => ({ nume: `GV7-${String(k + 1).padStart(2, '0')} generat, sămânța ${7000 + k}`, doc: genereazaV7(7000 + k) })),
  { nume: 'GV7-17 generat mare: 40 de piese, 3 foi, sămânța 97', doc: genereazaV7(97, true) },
];

// v6 refuzate la migrare (ADR 0030 §1): o operație v6 care are deja un câmp propriu „intrari”, oricare i-ar fi
// valoarea. Documentul v6 e valid (câmpul e necunoscut acolo); singura categorie raportată de `verificaV6V7` e
// `[ciocnire]`. La fel un v5, v4 sau v3 cu „intrari” pe o operație: lanțul îl păstrează până la v6 și se ciocnește la v7.

const bazaV6 = (): DocV6O => laV6(laV5(laV4(bazaV3())), (k) => (k === 0 ? rp(10) : null)) as DocV6O;
const opV6 = (d: DocV6O, piesa: number, k: number): Liber => ((d.piese[piesa] as PiesaV6O).operatii[k] as OperatieV6O);
const refuzatV6 = (nume: string, strica: (d: DocV6O) => void): Refuzat => {
  const d = bazaV6();
  strica(d);
  return { nume, doc: d, motiv: 'ciocnire' };
};

export const REFUZATE_V6: readonly Refuzat[] = [
  refuzatV6('Z01 operație v6 cu intrari: null (chiar valoarea pe care ar scrie-o migrarea)', (d) => { opV6(d, 0, 0)['intrari'] = null; }),
  refuzatV6('Z02 operație v6 cu intrari: { raza: 3 } (o valoare v7 bună)', (d) => { opV6(d, 0, 1)['intrari'] = ir(3); }),
  refuzatV6('Z03 operație v6 cu intrari: []', (d) => { opV6(d, 0, 0)['intrari'] = []; }),
  refuzatV6('Z04 operație v6 cu intrari: "3 mm"', (d) => { opV6(d, 0, 1)['intrari'] = '3 mm'; }),
  refuzatV6('Z05 operație v6 cu intrari: undefined, ca proprietate proprie', (d) => { opV6(d, 0, 0)['intrari'] = undefined; }),
  refuzatV6('Z06 doar operația pe-linie a unei piese fără instanțe are intrari', (d) => {
    d.piese.push({
      id: 'p2', radacina: el('x', I()),
      operatii: [
        { ...op4('a', ['x'], 'exterior', 'urcare'), urechi: null, rampa: null },
        { ...op4('b', ['x'], 'pe-linie', 'opozitie', 1, 1), urechi: null, rampa: null, intrari: { raza: 1 } },
      ],
    } as PiesaV6O);
  }),
  {
    nume: 'Z07 operație v6 cu __proto__ și intrari (din JSON.parse)',
    motiv: 'ciocnire',
    doc: JSON.parse(
      '{"schema":6,"rev":0,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":1},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"f","diametru":6},"latura":"interior","adancime":1,"pas":1,"sens":"urcare","urechi":null,"rampa":null,"__proto__":"x","intrari":null}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":10,"inaltime":10,"grosime":1},"instante":[]}]}',
    ),
  },
  // Lanțul: un v5, v4 sau v3 cu intrari pe operație trece până la v6 (câmp necunoscut) și se ciocnește la v6 → v7.
  { nume: 'Z08 operație v5 cu intrari: null (lanțul v5 → v6 → v7)', motiv: 'ciocnire', doc: (() => { const d = bazaV5(); opV5(d, 0, 0)['intrari'] = null; return d; })() },
  refuzatV4('Z09 operație v4 cu intrari: { raza: 3 } (lanțul v4 → … → v7)', (d) => { opV4(d, 0, 1)['intrari'] = ir(3); }),
  refuzatV3('Z10 operație v3 cu intrari: null (lanțul v3 → … → v7)', (d) => { opV3(d, 0, 0)['intrari'] = null; }),
];

/**
 * Otrăvurile v7: cele v6 aduse la forma v7 (`laV7` DUPĂ stricare: fiecare operație-obiect primește `intrari: null`),
 * plus cele ale intrărilor. Documentul v7 valid de la care pleacă cele noi e `baza6` adus la v7, cu o1 (exterior, cu
 * urechi și rampă) fără intrări și o2 (interior) cu raza 3. ALEGERE: o1 are rampă, deci intrările nu-i pot fi puse
 * fără refuzul EXPORTULUI (§6); ușa le-ar primi, dar otrăvurile de mai jos stau pe o2.
 */
const baza7 = (): DocV7O => laV7(baza6(), (k) => (k === 1 ? ir(3) : null)) as DocV7O;
const o7 = (d: DocV7O, k = 1, piesa = 0): Liber => (d.piese[piesa] as PiesaV7O).operatii[k] as OperatieV7O;
const i7 = (d: DocV7O, k = 1): Liber => o7(d, k)['intrari'] as Liber;
const otravaIntrari = (nume: string, strica: (d: DocV7O) => void): Otrava => {
  const d = baza7();
  strica(d);
  return { nume, doc: d, categorie: 'intrari' };
};

export const OTRAVURI_INTRARI: readonly Otrava[] = [
  otravaIntrari('I01 intrari lipsă (un v6 etichetat schema 7)', (d) => { delete o7(d, 0)['intrari']; }),
  otravaIntrari('I02 intrari undefined, ca proprietate proprie', (d) => { o7(d)['intrari'] = undefined; }),
  otravaIntrari('I03 intrari false (oprite, dar nu ca null)', (d) => { o7(d)['intrari'] = false; }),
  otravaIntrari('I04 intrari true', (d) => { o7(d)['intrari'] = true; }),
  otravaIntrari('I05 intrari 3 (număr, nu obiect)', (d) => { o7(d)['intrari'] = 3; }),
  otravaIntrari('I06 intrari [] (listă goală)', (d) => { o7(d)['intrari'] = []; }),
  otravaIntrari('I07 intrari [{ raza: 3 }] (listă, nu obiect)', (d) => { o7(d)['intrari'] = [ir(3)]; }),
  otravaIntrari('I08 intrari „3” (text)', (d) => { o7(d)['intrari'] = '3'; }),
  otravaIntrari('I09 intrari {} (fără rază)', (d) => { o7(d)['intrari'] = {}; }),
  otravaIntrari('I10 raza 0', (d) => { i7(d)['raza'] = 0; }),
  otravaIntrari('I11 raza −0', (d) => { i7(d)['raza'] = -0; }),
  otravaIntrari('I12 raza −3', (d) => { i7(d)['raza'] = -3; }),
  otravaIntrari('I13 raza 10 000,001 (peste PLAFON.latura)', (d) => { i7(d)['raza'] = 10_000.001; }),
  otravaIntrari('I14 raza Infinity', (d) => { i7(d)['raza'] = Infinity; }),
  otravaIntrari('I15 raza NaN', (d) => { i7(d)['raza'] = NaN; }),
  otravaIntrari('I16 raza „3” (text)', (d) => { i7(d)['raza'] = '3'; }),
  otravaIntrari('I17 raza null', (d) => { i7(d)['raza'] = null; }),
  otravaIntrari('I18 raza lipsă, cu alt câmp (diametru)', (d) => { o7(d)['intrari'] = { diametru: 6 }; }),
  otravaIntrari('I19 raza [3]', (d) => { i7(d)['raza'] = [3]; }),
  otravaIntrari('I20 o operație pe-linie fără intrari (câmpul e obligatoriu și acolo)', (d) => {
    (d.piese[0] as PiesaV7O).operatii.push({ ...op4('l', ['e1'], 'pe-linie', 'urcare', 1, 1), urechi: null, rampa: null } as unknown as OperatieV7O);
  }),
  otravaIntrari('I21 operația cu raza 0 e a unei piese fără instanțe', (d) => {
    d.piese.push({ id: 'p2', radacina: el('x', I()), operatii: [{ ...op4('a', ['x'], 'exterior', 'urcare'), urechi: null, rampa: null, intrari: ir(0) }] } as PiesaV7O);
  }),
  otravaIntrari('I22 intrari puse pe sculă, nu pe operație', (d) => {
    const o = o7(d);
    o['scula'] = { ...(o['scula'] as SculaO), intrari: o['intrari'] };
    delete o['intrari'];
  }),
  otravaIntrari('I23 intrari puse în rampă, nu pe operație', (d) => {
    const o = o7(d, 0);
    o['rampa'] = { ...(o['rampa'] as RampaO), intrari: ir(3) };
    delete o['intrari'];
  }),
  otravaIntrari('I24 doar prima operație are raza −1', (d) => { o7(d, 0)['intrari'] = ir(-1); }),
];

export const OTRAVURI_V7: readonly Otrava[] = [
  // Otrăvurile v6 construite din nou (unele sunt prea adânci pentru `structuredClone`), aduse la v7, pe loc.
  ...[...otravuriArbore(4), ...otravuriOperatii(4), ...otravuriSens()].map((o) => ({
    nume: o.nume.startsWith('v4 ') ? `v7 ${o.nume.slice(3)}` : `v7 ${o.nume}`, doc: laV7(laV6(laV5(o.doc))), categorie: o.categorie,
  })),
  ...OTRAVURI_URECHI.map((o) => ({ nume: `v7 ${o.nume}`, doc: laV7(laV6(structuredClone(o.doc))), categorie: o.categorie })),
  ...OTRAVURI_RAMPA.map((o) => ({ nume: `v7 ${o.nume}`, doc: laV7(structuredClone(o.doc)), categorie: o.categorie })),
  ...OTRAVURI_INTRARI,
];

export type CazValidV7 = { readonly nume: string; readonly doc: DocV7O };

export const VALIDE_DIFICILE_V7: readonly CazValidV7[] = [
  // Fiecare document valid dificil v6, adus la v7, cu intrările pe rând (capcanele `intrari` vechi mutate deoparte).
  ...VALIDE_DIFICILE_V6.map((c) => lenes(`${c.nume} (v7, intrări pe rând)`, () => laV7(faraIntrariPeOperatii(c.doc), intrariPeRand) as DocV7O)),
  {
    nume: 'Q01 la plafoane: raza 10 000 și 5e−324 (ușa le primește; 5e−324 e refuzul EXPORTULUI, §6)',
    doc: laV7(laV6(laV5(laV4(doc3(
      [piesa3('p1', grup('g', I(), [el('e1', I()), el('e2', T(50, 0), cerc())]), [op('a', ['e1'], 'exterior'), op('b', ['e2'], 'interior', 8, 4)])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    )))), (k) => (k === 0 ? ir(10_000) : ir(5e-324))) as DocV7O,
  },
  {
    // ADR 0030 §6: intrările pe pe-linie și intrările cu rampă sunt refuzuri ale exportului, nu ale ușii.
    nume: 'Q02 intrări pe pe-linie, pe exterior (cu urechi și rampă) și pe interior, cu sensuri diferite',
    doc: laV7(laV6(laV5(doc4([piesa4('p1', grup('g', I(), [el('a', I(), dr(80, 50, 6)), el('b', T(100, 0), cerc(10))]), [
      op4('l', ['a'], 'pe-linie', 'opozitie', 1, 1), op4('e', ['a'], 'exterior', 'urcare', 12, 4), op4('i', ['b'], 'interior', 'opozitie', 6, 2),
    ])], [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])]), (k) => (k === 1 ? ur(4, 8, 2) : null)), (k) => (k === 1 ? rp(10) : null)), (k) => ir(1 + k)) as DocV7O,
  },
  {
    nume: 'Q03 raza 0,4 (sub minimul exportului, §6) și raza 0,5 (chiar minimul): documentul e valid',
    doc: laV7(laV6(laV5(laV4(doc3(
      [piesa3('p1', grup('g', I(), [el('e1', I()), el('e2', T(50, 0), cerc())]), [op('a', ['e1'], 'exterior'), op('b', ['e2'], 'interior', 8, 4)])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    )))), (k) => (k === 0 ? ir(0.4) : ir(0.5))) as DocV7O,
  },
  {
    nume: 'Q04 un câmp necunoscut în intrări (forma, note) se păstrează; raza 3.0',
    doc: laV7(laV6(laV5(laV4(baza3()))), (k) => (k === 0 ? { raza: 3.0, forma: 'arc', note: { a: 1 } } : null)) as DocV7O,
  },
  {
    nume: 'Q05 degroșarea și finisarea aceluiași contur, aceeași adâncime, una cu intrări, alta fără',
    doc: laV7(laV6(laV5(doc4(
      [piesa4('p1', el('e', I(), dr(80, 50, 6)), [op4('deg', ['e'], 'exterior', 'urcare', 12, 4), op4('fin', ['e'], 'exterior', 'urcare', 12, 12)])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    ), () => ur(4, 8, 2))), (k) => (k === 0 ? ir(3) : null)) as DocV7O,
  },
  {
    nume: 'Q06 chei capcană în intrări și pe operație (din JSON.parse)',
    doc: JSON.parse(
      '{"schema":7,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":5},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6},"latura":"interior","adancime":8,"pas":4,'
      + '"__proto__":"x","sens":"opozitie","urechi":null,"rampa":null,"intrari":{"raza":2.5,"__proto__":"i","constructor":"c"}}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as DocV7O,
  },
  {
    nume: 'Q07 un câmp necunoscut „intrari” pe sculă, în urechi, în rampă, pe nod, piesă, instanță, foaie și sus, cu operația fără intrări',
    doc: {
      schema: 7, rev: 3, intrari: 'sus',
      piese: [{
        id: 'p1', intrari: { raza: 0 },
        radacina: { ...grup('g', I(), [{ ...el('e', I()), intrari: 'x' }]), intrari: ['x'] },
        operatii: [{ ...op4('o', ['e'], 'exterior', 'opozitie'), scula: { ...S1(), intrari: ir(3) }, urechi: { ...ur(4, 8, 2), intrari: ir(-1) }, rampa: { ...rp(10), intrari: 0 }, intrari: null }],
      }],
      foi: [{ ...foaie('f1', [{ ...inst('i1', 'p1', 0, 0, 0), intrari: 1 }]), intrari: null }],
    } as DocV7O,
  },
];

// ---------------------------------------------------------------------------------------------------------------
// v8 (ADR 0032): degajările colțurilor. Sesiune independentă, scrise doar din textul ADR-ului.

/**
 * Forma v8 a unui document v7 (sau a unei otrăvi v7): schema 7 devine 8, iar o schemă 8 (otrava „schema mai nouă” a
 * lui v7) devine 9, ca să rămână otravă; „7” devine „8”. Fiecare operație-obiect care n-are `colturi` primește
 * `colturi(k)` (implicit `null`; k = a câta, în tot documentul). Pe loc; întoarce documentul.
 */
export const laV8 = (d: unknown, colturi: (k: number) => ColturiO | null = () => null): unknown => {
  if (!esteObiectL(d)) return d;
  if (d['schema'] === 7) d['schema'] = 8;
  else if (d['schema'] === 8) d['schema'] = 9;
  else if (d['schema'] === '7') d['schema'] = '8';
  const piese = d['piese'];
  let k = 0;
  if (Array.isArray(piese)) {
    for (const p of piese) {
      if (!esteObiectL(p) || !Array.isArray(p['operatii'])) continue;
      for (const o of p['operatii'] as unknown[]) if (esteObiectL(o) && !Object.hasOwn(o, 'colturi')) o['colturi'] = colturi(k++);
    }
  }
  return d;
};

const cl = (tip: 'dog-bone' | 't-bone'): ColturiO => ({ tip });
/** Colțurile pe rând: fără, dog-bone, T-bone, fără. */
const colturiPeRand = (k: number): ColturiO | null => [null, cl('dog-bone'), cl('t-bone'), null][k % 4]!;

/** Operațiile unui document au un câmp propriu `colturi` (ciocniri în v8). */
export function areColturiPeOperatii(d: unknown): boolean {
  if (!esteObiectL(d) || !Array.isArray(d['piese'])) return false;
  return (d['piese'] as unknown[]).some((p) => esteObiectL(p) && Array.isArray(p['operatii'])
    && (p['operatii'] as unknown[]).some((o) => esteObiectL(o) && Object.hasOwn(o, 'colturi')));
}

/**
 * Migrări v7 → v8 pe hârtie (ADR 0032 §1): `schema: 8` și `colturi: null` pe fiecare operație, și pe `pe-linie`, și pe
 * cele cu urechi, rampă sau intrări; tot restul rămâne, cu câmpurile necunoscute. Un câmp `colturi` în altă parte decât
 * pe operație (pe formă, pe sculă, în urechi, în rampă, în intrări, pe nod, pe piesă, pe instanță, pe foaie, sus) nu e o
 * ciocnire.
 */
export const MIGRARI_V7_HARTIE: ReadonlyArray<{ readonly nume: string; readonly v7: DocV7O; readonly v8: Liber }> = [
  {
    nume: 'MV7-01 trei operații (exterior cu urechi și rampă, interior cu intrări, pe-linie), câmpuri necunoscute; „colturi” pe formă, sculă, urechi, rampă, intrări, nod, piesă, instanță, foaie și sus',
    v7: {
      schema: 7, rev: 11, colturi: 'sus',
      piese: [{
        id: 'p1', colturi: { tip: 'dog-bone' },
        radacina: {
          tip: 'grup', id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, colturi: 4,
          copii: [
            { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 80, inaltime: 50, razaColt: 0, colturi: 't-bone' }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, colturi: null },
            { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 5 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 10 } },
          ],
        },
        operatii: [
          { id: 'o1', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 6, colturi: [1] }, latura: 'exterior', adancime: 12, pas: 4, sens: 'opozitie', urechi: { numar: 4, latime: 8, grosime: 2, colturi: 'u' }, rampa: { lungime: 10, colturi: { tip: 't-bone' } }, intrari: null, note: 'de pastrat' },
          { id: 'o2', tip: 'profil', noduri: ['c'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 8, pas: 4, sens: 'urcare', urechi: null, rampa: null, intrari: { raza: 3, colturi: null } },
          { id: 'o3', tip: 'profil', noduri: ['c', 'r'], scula: { numar: 2, nume: 'V 90', diametru: 3.175 }, latura: 'pe-linie', adancime: 1, pas: 1, sens: 'opozitie', urechi: null, rampa: null, intrari: null },
        ],
      }],
      foi: [{
        id: 'f1', colturi: false, stoc: { latime: 600, inaltime: 400, grosime: 18 },
        instante: [{ id: 'i1', piesa: 'p1', x: 10, y: 10, rotire: 0, colturi: 'i' }],
      }],
    } as DocV7O,
    v8: {
      schema: 8, rev: 11, colturi: 'sus',
      piese: [{
        id: 'p1', colturi: { tip: 'dog-bone' },
        radacina: {
          tip: 'grup', id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, colturi: 4,
          copii: [
            { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 80, inaltime: 50, razaColt: 0, colturi: 't-bone' }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, colturi: null },
            { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 5 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 10 } },
          ],
        },
        operatii: [
          { id: 'o1', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 6, colturi: [1] }, latura: 'exterior', adancime: 12, pas: 4, sens: 'opozitie', urechi: { numar: 4, latime: 8, grosime: 2, colturi: 'u' }, rampa: { lungime: 10, colturi: { tip: 't-bone' } }, intrari: null, note: 'de pastrat', colturi: null },
          { id: 'o2', tip: 'profil', noduri: ['c'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 8, pas: 4, sens: 'urcare', urechi: null, rampa: null, intrari: { raza: 3, colturi: null }, colturi: null },
          { id: 'o3', tip: 'profil', noduri: ['c', 'r'], scula: { numar: 2, nume: 'V 90', diametru: 3.175 }, latura: 'pe-linie', adancime: 1, pas: 1, sens: 'opozitie', urechi: null, rampa: null, intrari: null, colturi: null },
        ],
      }],
      foi: [{
        id: 'f1', colturi: false, stoc: { latime: 600, inaltime: 400, grosime: 18 },
        instante: [{ id: 'i1', piesa: 'p1', x: 10, y: 10, rotire: 0, colturi: 'i' }],
      }],
    },
  },
  {
    nume: 'MV7-02 o piesă fără operații și una cu două operații pe același dreptunghi; ordinea operațiilor rămâne',
    v7: {
      schema: 7, rev: 0,
      piese: [
        { id: 'a', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [] },
        {
          id: 'b', radacina: { tip: 'element', id: 'e', forma: { tip: 'dreptunghi', latime: 40, inaltime: 30, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
          operatii: [
            { id: 'z', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 2, pas: 1, sens: 'opozitie', urechi: null, rampa: { lungime: 1 }, intrari: { raza: 1 } },
            { id: 'a', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 4, pas: 1, sens: 'urcare', urechi: null, rampa: null, intrari: null },
          ],
        },
      ],
      foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 10 }, instante: [] }],
    } as DocV7O,
    v8: {
      schema: 8, rev: 0,
      piese: [
        { id: 'a', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 3 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [] },
        {
          id: 'b', radacina: { tip: 'element', id: 'e', forma: { tip: 'dreptunghi', latime: 40, inaltime: 30, razaColt: 0 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
          operatii: [
            { id: 'z', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 2, pas: 1, sens: 'opozitie', urechi: null, rampa: { lungime: 1 }, intrari: { raza: 1 }, colturi: null },
            { id: 'a', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: '', diametru: 6 }, latura: 'interior', adancime: 4, pas: 1, sens: 'urcare', urechi: null, rampa: null, intrari: null, colturi: null },
          ],
        },
      ],
      foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 10 }, instante: [] }],
    },
  },
  {
    nume: 'MV7-03 chei capcană pe operație, pe sculă și în intrări (din JSON.parse)',
    v7: JSON.parse(
      '{"schema":7,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"dreptunghi","latime":20,"inaltime":10,"razaColt":0},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6,"__proto__":"s"},'
      + '"latura":"interior","adancime":8,"pas":4,"__proto__":"x","constructor":"Ion","sens":"urcare",'
      + '"urechi":null,"rampa":null,"intrari":{"raza":2,"__proto__":"i"}}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as DocV7O,
    v8: JSON.parse(
      '{"schema":8,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"dreptunghi","latime":20,"inaltime":10,"razaColt":0},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6,"__proto__":"s"},'
      + '"latura":"interior","adancime":8,"pas":4,"__proto__":"x","constructor":"Ion","sens":"urcare",'
      + '"urechi":null,"rampa":null,"intrari":{"raza":2,"__proto__":"i"},"colturi":null}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as Liber,
  },
];

/**
 * Un document v8 din sămânță, valid: `genereazaV7(samanta)` (fără `colturi` pe operații), cu colțuri alese la
 * întâmplare pe fiecare operație (fără, dog-bone, T-bone; uneori cu un câmp necunoscut în obiect) și, uneori, capcane:
 * un câmp `colturi` necunoscut pe sculă, în urechi, în rampă, în intrări, pe piesă sau sus.
 */
export function genereazaV8(samanta: number, mare = false): DocV8O {
  const v7 = genereazaV7(samanta, mare);
  const r = aleator(samanta + 0x0a32);
  const valoare = (): ColturiO | null => {
    const x = r();
    if (x < 0.4) return null;
    const o = cl(x < 0.7 ? 'dog-bone' : 't-bone');
    return r() < 0.1 ? { ...o, joc: 0.1 } : o;
  };
  const piese: PiesaV8O[] = v7.piese.map((p) => ({
    ...(r() < 0.1 ? { colturi: 'dog-bone' } : {}),
    ...p,
    operatii: p.operatii.map((o): OperatieV8O => ({
      ...o,
      ...(r() < 0.1 ? { scula: { ...o.scula, colturi: 't-bone' } } : {}),
      ...(o.urechi !== null && r() < 0.2 ? { urechi: { ...o.urechi, colturi: 1 } } : {}),
      ...(o.rampa !== null && r() < 0.2 ? { rampa: { ...o.rampa, colturi: null } } : {}),
      ...(o.intrari !== null && r() < 0.2 ? { intrari: { ...o.intrari, colturi: { tip: 'x' } } } : {}),
      colturi: valoare(),
    })),
  }));
  return { ...(r() < 0.3 ? { colturi: [] } : {}), ...v7, schema: 8, piese };
}

export type CazV8 = { readonly nume: string; readonly doc: DocV8O };

export const CORPUS_V8: readonly CazV8[] = [
  ...Array.from({ length: 16 }, (_, k) => ({ nume: `GV8-${String(k + 1).padStart(2, '0')} generat, sămânța ${8000 + k}`, doc: genereazaV8(8000 + k) })),
  { nume: 'GV8-17 generat mare: 40 de piese, 3 foi, sămânța 98', doc: genereazaV8(98, true) },
];

// v7 refuzate la migrare (ADR 0032 §1): o operație v7 care are deja un câmp propriu „colturi”, oricare i-ar fi
// valoarea. Documentul v7 e valid (câmpul e necunoscut acolo); singura categorie raportată de `verificaV7V8` e
// `[ciocnire]`. La fel un v6, v5, v4 sau v3 cu „colturi” pe o operație: lanțul îl păstrează până la v7 și se ciocnește.

const bazaV7 = (): DocV7O => laV7(laV6(laV5(laV4(bazaV3())), (k) => (k === 0 ? rp(10) : null)), (k) => (k === 1 ? ir(3) : null)) as DocV7O;
const opV7 = (d: DocV7O, piesa: number, k: number): Liber => ((d.piese[piesa] as PiesaV7O).operatii[k] as OperatieV7O);
const refuzatV7 = (nume: string, strica: (d: DocV7O) => void): Refuzat => {
  const d = bazaV7();
  strica(d);
  return { nume, doc: d, motiv: 'ciocnire' };
};

export const REFUZATE_V7: readonly Refuzat[] = [
  refuzatV7('Y01 operație v7 cu colturi: null (chiar valoarea pe care ar scrie-o migrarea)', (d) => { opV7(d, 0, 0)['colturi'] = null; }),
  refuzatV7('Y02 operație v7 cu colturi: { tip: dog-bone } (o valoare v8 bună)', (d) => { opV7(d, 0, 1)['colturi'] = cl('dog-bone'); }),
  refuzatV7('Y03 operație v7 cu colturi: []', (d) => { opV7(d, 0, 0)['colturi'] = []; }),
  refuzatV7('Y04 operație v7 cu colturi: "t-bone"', (d) => { opV7(d, 0, 1)['colturi'] = 't-bone'; }),
  refuzatV7('Y05 operație v7 cu colturi: undefined, ca proprietate proprie', (d) => { opV7(d, 0, 0)['colturi'] = undefined; }),
  refuzatV7('Y06 doar operația pe-linie a unei piese fără instanțe are colturi', (d) => {
    d.piese.push({
      id: 'p2', radacina: el('x', I()),
      operatii: [
        { ...op4('a', ['x'], 'exterior', 'urcare'), urechi: null, rampa: null, intrari: null },
        { ...op4('b', ['x'], 'pe-linie', 'opozitie', 1, 1), urechi: null, rampa: null, intrari: null, colturi: { tip: 'dog-bone' } },
      ],
    } as PiesaV7O);
  }),
  {
    nume: 'Y07 operație v7 cu __proto__ și colturi (din JSON.parse)',
    motiv: 'ciocnire',
    doc: JSON.parse(
      '{"schema":7,"rev":0,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"cerc","raza":1},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"f","diametru":6},"latura":"interior","adancime":1,"pas":1,"sens":"urcare","urechi":null,"rampa":null,"intrari":null,"__proto__":"x","colturi":null}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":10,"inaltime":10,"grosime":1},"instante":[]}]}',
    ),
  },
  // Lanțul: un v6, v5, v4 sau v3 cu colturi pe operație trece până la v7 (câmp necunoscut) și se ciocnește la v7 → v8.
  { nume: 'Y08 operație v6 cu colturi: null (lanțul v6 → v7 → v8)', motiv: 'ciocnire', doc: (() => { const d = bazaV6(); opV6(d, 0, 0)['colturi'] = null; return d; })() },
  { nume: 'Y09 operație v5 cu colturi: { tip: t-bone } (lanțul v5 → … → v8)', motiv: 'ciocnire', doc: (() => { const d = bazaV5(); opV5(d, 0, 1)['colturi'] = cl('t-bone'); return d; })() },
  refuzatV4('Y10 operație v4 cu colturi: "dog-bone" (lanțul v4 → … → v8)', (d) => { opV4(d, 0, 0)['colturi'] = 'dog-bone'; }),
  refuzatV3('Y11 operație v3 cu colturi: null (lanțul v3 → … → v8)', (d) => { opV3(d, 0, 1)['colturi'] = null; }),
];

/**
 * Otrăvurile v8: cele v7 aduse la forma v8 (`laV8` DUPĂ stricare: fiecare operație-obiect primește `colturi: null`),
 * plus cele ale colțurilor. Documentul v8 valid de la care pleacă cele noi e `baza7` adus la v8, cu o1 (exterior, cu
 * urechi și rampă) fără colțuri și o2 (interior, cu intrări) cu dog-bone; otrăvurile stau pe o2.
 */
const baza8 = (): DocV8O => laV8(baza7(), (k) => (k === 1 ? cl('dog-bone') : null)) as DocV8O;
const o8 = (d: DocV8O, k = 1, piesa = 0): Liber => (d.piese[piesa] as PiesaV8O).operatii[k] as OperatieV8O;
const c8 = (d: DocV8O, k = 1): Liber => o8(d, k)['colturi'] as Liber;
const otravaColturi = (nume: string, strica: (d: DocV8O) => void): Otrava => {
  const d = baza8();
  strica(d);
  return { nume, doc: d, categorie: 'colturi' };
};

export const OTRAVURI_COLTURI: readonly Otrava[] = [
  otravaColturi('K01 colturi lipsă (un v7 etichetat schema 8)', (d) => { delete o8(d, 0)['colturi']; }),
  otravaColturi('K02 colturi undefined, ca proprietate proprie', (d) => { o8(d)['colturi'] = undefined; }),
  otravaColturi('K03 colturi false (oprite, dar nu ca null)', (d) => { o8(d)['colturi'] = false; }),
  otravaColturi('K04 colturi true', (d) => { o8(d)['colturi'] = true; }),
  otravaColturi('K05 colturi „dog-bone” (text, nu obiect)', (d) => { o8(d)['colturi'] = 'dog-bone'; }),
  otravaColturi('K06 colturi 1 (număr)', (d) => { o8(d)['colturi'] = 1; }),
  otravaColturi('K07 colturi [] (listă goală)', (d) => { o8(d)['colturi'] = []; }),
  otravaColturi('K08 colturi [{ tip: dog-bone }] (listă, nu obiect)', (d) => { o8(d)['colturi'] = [cl('dog-bone')]; }),
  otravaColturi('K09 colturi {} (fără tip)', (d) => { o8(d)['colturi'] = {}; }),
  otravaColturi('K10 tip „Dog-bone” (majusculă)', (d) => { c8(d)['tip'] = 'Dog-bone'; }),
  otravaColturi('K11 tip „dogbone” (fără cratimă)', (d) => { c8(d)['tip'] = 'dogbone'; }),
  otravaColturi('K12 tip „dog bone” (cu spațiu)', (d) => { c8(d)['tip'] = 'dog bone'; }),
  otravaColturi('K13 tip „T-bone” (majusculă)', (d) => { c8(d)['tip'] = 'T-bone'; }),
  otravaColturi('K14 tip „t_bone”', (d) => { c8(d)['tip'] = 't_bone'; }),
  otravaColturi('K15 tip „ dog-bone” (spațiu înainte)', (d) => { c8(d)['tip'] = ' dog-bone'; }),
  otravaColturi('K16 tip null', (d) => { c8(d)['tip'] = null; }),
  otravaColturi('K17 tip 1', (d) => { c8(d)['tip'] = 1; }),
  otravaColturi('K18 tip [„dog-bone”]', (d) => { c8(d)['tip'] = ['dog-bone']; }),
  otravaColturi('K19 tip lipsă, cu alt câmp (forma: dog-bone)', (d) => { o8(d)['colturi'] = { forma: 'dog-bone' }; }),
  otravaColturi('K20 tip „degajare”', (d) => { c8(d)['tip'] = 'degajare'; }),
  otravaColturi('K21 o operație pe-linie fără colturi (câmpul e obligatoriu și acolo)', (d) => {
    (d.piese[0] as PiesaV8O).operatii.push({ ...op4('l', ['e1'], 'pe-linie', 'urcare', 1, 1), urechi: null, rampa: null, intrari: null } as unknown as OperatieV8O);
  }),
  otravaColturi('K22 operația cu tip „x” e a unei piese fără instanțe', (d) => {
    d.piese.push({ id: 'p2', radacina: el('x', I()), operatii: [{ ...op4('a', ['x'], 'exterior', 'urcare'), urechi: null, rampa: null, intrari: null, colturi: { tip: 'x' } }] } as unknown as PiesaV8O);
  }),
  otravaColturi('K23 colturi puse pe sculă, nu pe operație', (d) => {
    const o = o8(d);
    o['scula'] = { ...(o['scula'] as SculaO), colturi: o['colturi'] };
    delete o['colturi'];
  }),
  otravaColturi('K24 colturi puse în intrări, nu pe operație', (d) => {
    const o = o8(d);
    o['intrari'] = { ...(o['intrari'] as IntrariO), colturi: cl('t-bone') };
    delete o['colturi'];
  }),
  otravaColturi('K25 doar prima operație are tip „tbone”', (d) => { o8(d, 0)['colturi'] = { tip: 'tbone' }; }),
];

export const OTRAVURI_V8: readonly Otrava[] = [
  // Otrăvurile v7 construite din nou (unele sunt prea adânci pentru `structuredClone`), aduse la v8, pe loc.
  ...[...otravuriArbore(4), ...otravuriOperatii(4), ...otravuriSens()].map((o) => ({
    nume: o.nume.startsWith('v4 ') ? `v8 ${o.nume.slice(3)}` : `v8 ${o.nume}`, doc: laV8(laV7(laV6(laV5(o.doc)))), categorie: o.categorie,
  })),
  ...OTRAVURI_URECHI.map((o) => ({ nume: `v8 ${o.nume}`, doc: laV8(laV7(laV6(structuredClone(o.doc)))), categorie: o.categorie })),
  ...OTRAVURI_RAMPA.map((o) => ({ nume: `v8 ${o.nume}`, doc: laV8(laV7(structuredClone(o.doc))), categorie: o.categorie })),
  ...OTRAVURI_INTRARI.map((o) => ({ nume: `v8 ${o.nume}`, doc: laV8(structuredClone(o.doc)), categorie: o.categorie })),
  ...OTRAVURI_COLTURI,
];

export type CazValidV8 = { readonly nume: string; readonly doc: DocV8O };

export const VALIDE_DIFICILE_V8: readonly CazValidV8[] = [
  // Fiecare document valid dificil v7, adus la v8, cu colțurile pe rând.
  ...VALIDE_DIFICILE_V7.map((c) => lenes(`${c.nume} (v8, colțuri pe rând)`, () => laV8(structuredClone(c.doc), colturiPeRand) as DocV8O)),
  {
    // ADR 0032 §6: degajările pe pe-linie sunt un refuz al exportului, nu al ușii (ALEGERE din antetul oracolului).
    nume: 'R01 colturi pe pe-linie, pe exterior (cu urechi și rampă) și pe interior (cu intrări), cu sensuri diferite',
    doc: laV8(laV7(laV6(laV5(doc4([piesa4('p1', grup('g', I(), [el('a', I(), dr(80, 50, 0)), el('b', T(100, 0), dr(30, 20, 0))]), [
      op4('l', ['a'], 'pe-linie', 'opozitie', 1, 1), op4('e', ['a'], 'exterior', 'urcare', 12, 4), op4('i', ['b'], 'interior', 'opozitie', 6, 2),
    ])], [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])]), (k) => (k === 1 ? ur(4, 8, 2) : null)), (k) => (k === 1 ? rp(10) : null)), (k) => (k === 2 ? ir(3) : null)), (k) => cl(k === 1 ? 't-bone' : 'dog-bone')) as DocV8O,
  },
  {
    nume: 'R02 un câmp necunoscut în colturi (joc, note) se păstrează',
    doc: laV8(laV7(laV6(laV5(laV4(baza3()))), (k) => (k === 1 ? ir(3) : null)), (k) => (k === 1 ? { tip: 't-bone', joc: 0.2, note: { a: 1 } } : null)) as DocV8O,
  },
  {
    nume: 'R03 chei capcană în colturi și pe operație (din JSON.parse)',
    doc: JSON.parse(
      '{"schema":8,"rev":1,"piese":[{"id":"p1","radacina":{"tip":"element","id":"e","forma":{"tip":"dreptunghi","latime":20,"inaltime":10,"razaColt":0},'
      + '"matrice":{"a":1,"b":0,"c":0,"d":1,"e":0,"f":0}},"operatii":[{"id":"o","tip":"profil","noduri":["e"],'
      + '"scula":{"numar":1,"nume":"freza plata","diametru":6},"latura":"interior","adancime":8,"pas":4,'
      + '"__proto__":"x","sens":"opozitie","urechi":null,"rampa":null,"intrari":null,"colturi":{"tip":"dog-bone","__proto__":"c","constructor":"k"}}]}],'
      + '"foi":[{"id":"f1","stoc":{"latime":100,"inaltime":100,"grosime":18},"instante":[{"id":"i1","piesa":"p1","x":50,"y":50,"rotire":0}]}]}',
    ) as DocV8O,
  },
  {
    nume: 'R04 un câmp necunoscut „colturi” pe formă, sculă, urechi, rampă, intrări, nod, piesă, instanță, foaie și sus, cu operația fără colțuri',
    doc: {
      schema: 8, rev: 3, colturi: 'sus',
      piese: [{
        id: 'p1', colturi: { tip: 'dog-bone' },
        radacina: { ...grup('g', I(), [{ ...el('e', I(), { ...dr(), colturi: 1 }), colturi: 'x' }]), colturi: ['x'] },
        operatii: [{
          ...op4('o', ['e'], 'exterior', 'opozitie'), scula: { ...S1(), colturi: cl('t-bone') }, urechi: { ...ur(4, 8, 2), colturi: null }, rampa: { ...rp(10), colturi: 0 },
          intrari: null, colturi: null,
        }],
      }],
      foi: [{ ...foaie('f1', [{ ...inst('i1', 'p1', 0, 0, 0), colturi: 1 }]), colturi: null }],
    } as DocV8O,
  },
  {
    nume: 'R05 degroșarea și finisarea aceluiași contur, aceeași adâncime, una cu dog-bone, alta cu T-bone',
    doc: laV8(laV7(laV6(laV5(doc4(
      [piesa4('p1', el('e', I(), dr(80, 50, 0)), [op4('deg', ['e'], 'interior', 'urcare', 12, 4), op4('fin', ['e'], 'interior', 'urcare', 12, 12)])],
      [foaie('f1', [inst('i1', 'p1', 0, 0, 0)])],
    )))), (k) => cl(k === 0 ? 'dog-bone' : 't-bone')) as DocV8O,
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Documentul v11–v18 (felia 5.1↑c).

/**
 * CAZURILE documentului v11–v18 (felia 5.1↑c, sesiune independentă, scrise doar din textul ADR-urilor 0069, 0076, 0087,
 * 0090–0094, 0024, 0025 și 0070), pentru partea v11–v18 a oracolului (secțiunea de la finalul lui `document.ts`) și
 * pentru `test/unit/document.v18.oracol.test.ts`. Fiecare verdict e scris aici, pe hârtie, nu cerut oracolului:
 * - `VALIDE_V18`: documente v18 pe care ușa le primește NESCHIMBATE (ADR 0024, precizarea 10), inclusiv ce nu judecă ușa
 *   (potrivirea felului cu forma, cu latura, cu freza: refuzurile lucrării);
 * - `MIGRARI_V18_HARTIE`: documente vechi (v1, v3, v10 … v17) și documentul v18 care iese din ușă, scris întreg (v1, v3,
 *   v10) sau ca „același, cu `schema: 18`” (v11 … v17: migrările schimbă doar numărul);
 * - `NECIOCNIRI_V18`: un câmp nou în afara locului lui (pe sculă, pe piesă, pe operație în locul sculei): un câmp
 *   necunoscut oarecare, deci primit, cu el păstrat;
 * - `FRONTIERE_V18`: fiecare câmp nou, cu valori de o parte și de alta a marginilor din ADR (și lipsa lui), fiecare cu
 *   verdictul de pe hârtie;
 * - `REFUZATE_V18`: documente stricate, fiecare cu un singur defect: câmpul (calea, ca în motivul ușii), categoria
 *   oracolului, motivul (cu paragraful ADR-ului) și, unde ADR-ul citează textul refuzului, textul;
 * - `VECHI_NOI`: câte un document valid din fiecare versiune v10 … v17, pentru ușile v11 … v17;
 * - `AMBIGUE_V18` (și `ambigue` din frontiere): ce nu hotărăște textul, cu ALEGEREA oracolului; aplicația doar se raportează.
 *
 * Un caz nou = documentul și verdictul lui pe hârtie, aici; un câmp nou al documentului (v19) își aduce frontierele.
 */

/** Marcajul „câmpul lipsește” în tabelele de frontieră. */
export const LIPSA = Symbol('lipsă');

const dreptunghi = (latime = 100, inaltime = 60): Liber => ({ tip: 'dreptunghi', latime, inaltime, razaColt: 0 });
/** O linie deschisă (v10, ADR 0037): două vârfuri, ultimul segment L. */
const linie = (): Liber => ({ tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 80, y: 0 }, s: { tip: 'L' } }] });

/** Freza plată T`numar` Ø`diametru`. */
const plata = (numar: number, diametru: number): Liber => ({ numar, nume: 'freza plata', diametru });
/** Freza în V T`numar` Ø`diametru`, cu unghiul (și vârful, de la v16). */
const inV = (numar: number, diametru: number, unghi: number, varf?: number): Liber => ({
  numar, nume: `freza V${unghi}`, diametru, forma: varf === undefined ? { tip: 'v', unghi } : { tip: 'v', unghi, varf },
});

/** O operație completă, cu câmpurile v10 (profil interior, T1 Ø6, 6 / 3, urcare, nimic din profil); `v` o schimbă. */
export const opV18 = (v: Liber = {}): Liber => ({
  id: 'o1', tip: 'profil', noduri: ['e'], scula: plata(1, 6), latura: 'interior', adancime: 6, pas: 3,
  sens: 'urcare', urechi: null, rampa: null, intrari: null, colturi: null, ...v,
});
/** Un buzunar 100 × 60 cu Ø6 și pasul 2,4 (exemplul ADR 0069). */
const buzunar = (v: Liber = {}): Liber => opV18({ id: 'b1', tip: 'buzunar', pasLateral: 2.4, ...v });
/** O găurire cu Ø6 pe un cerc de Ø6, 10 mm cu pasul 3 (exemplul ADR 0087). */
const gaurire = (v: Liber = {}): Liber => opV18({ id: 'g1', tip: 'gaurire', adancime: 10, pas: 3, ...v });
/** Un V-carve cu V90 Ø6, 3 mm cu pasul 1,2 (exemplul ADR 0090). */
const vcarve = (v: Liber = {}): Liber => opV18({ id: 'v1', tip: 'vcarve', scula: inV(2, 6, 90), adancime: 3, pas: 1.2, ...v });
/** Fundul plat cu freza dreaptă Ø3,175 și pasul 1,2 (implicitele ADR 0091 §4: T-ul V-ului + 1). */
const fund = (v: Liber = {}): Liber => ({ scula: plata(3, 3.175), pasLateral: 1.2, ...v });
/** O freză de rest. */
const rest1 = (numar: number, diametru: number, pasLateral: number): Liber => ({ scula: plata(numar, diametru), pasLateral });

/** Un document cu o piesă `p` (elementul `e`, forma dată), operațiile date, pus o dată pe foaie. */
export function docV18(forma: Liber, operatii: readonly Liber[], schema = 18): Liber {
  return {
    schema, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'element', id: 'e', forma, matrice: I() }, operatii: [...operatii] }],
    foi: [{ id: 'f1', stoc: { latime: 400, inaltime: 300, grosime: 18 }, instante: [{ id: 'i0', piesa: 'p', x: 50, y: 50, rotire: 0 }] }],
  };
}

/** Același document, cu alt număr (migrările v10 → … → v18 schimbă doar numărul). */
export const cuSchema = (d: Liber, schema: number): Liber => ({ ...structuredClone(d), schema });

/** `{ a: { a: … 1 } }` cu `n` obiecte unul în altul. */
const imbricat = (n: number): unknown => {
  let v: unknown = 1;
  for (let k = 0; k < n; k++) v = { a: v };
  return v;
};
const capcane = (): Liber => JSON.parse('{"__proto__": {"x": 1}, "constructor": "c", "prototype": 2}') as Liber;

export type CazV18 = { readonly nume: string; readonly doc: Liber };

// ---------------------------------------------------------------------------------------------------------------
// Documente v18 valide: ușa le primește neschimbate.

export const VALIDE_V18: readonly CazV18[] = [
  { nume: 'A01 buzunarul 100 × 60, Ø6, pasul 2,4 (ADR 0069 §1)', doc: docV18(dreptunghi(), [buzunar()]) },
  { nume: 'A02 buzunarul cu pasul exact 50 (marginea de sus)', doc: docV18(dreptunghi(), [buzunar({ pasLateral: 50 })]) },
  { nume: 'A03 buzunarul fără pas (potrivirea e a lucrării: „n-are pasul lateral”)', doc: docV18(dreptunghi(), [opV18({ id: 'b1', tip: 'buzunar' })]) },
  {
    nume: 'A04 buzunarul pe exterior, cu urechi, rampă, intrări și degajări (nimic din profil e al lucrării)',
    doc: docV18(dreptunghi(), [buzunar({
      latura: 'exterior', urechi: { numar: 4, latime: 8, grosime: 2 }, rampa: { lungime: 10 }, intrari: { raza: 3 }, colturi: { tip: 'dog-bone' },
    })]),
  },
  { nume: 'A05 buzunarul pe o cale deschisă (refuzul e al lucrării, ADR 0069 §6)', doc: docV18(linie(), [buzunar({ latura: 'pe-linie' })]) },
  { nume: 'A06 profilul cu pasul lateral (ADR 0069 §1: „nu schimbă nimic”)', doc: docV18(dreptunghi(), [opV18({ pasLateral: 2 })]) },
  { nume: 'A07 coborârea plonjare, scrisă (ADR 0076 §1)', doc: docV18(dreptunghi(), [buzunar({ coborare: { fel: 'plonjare' } })]) },
  { nume: 'A08 rampa pe inel, cu 45° (marginea de sus)', doc: docV18(dreptunghi(), [buzunar({ coborare: { fel: 'rampa', unghi: 45 } })]) },
  { nume: 'A09 zigzagul de 20 mm, cu 3°', doc: docV18(dreptunghi(), [buzunar({ coborare: { fel: 'zigzag', unghi: 3, lungime: 20 } })]) },
  { nume: 'A10 elicea de rază 3, cu 3°', doc: docV18(dreptunghi(), [buzunar({ coborare: { fel: 'elice', unghi: 3, raza: 3 } })]) },
  {
    nume: 'A11 sub pragurile lucrării (0,3°, zigzagul de 0,5 mm, raza 0,2): ușa le lasă, lucrarea le refuză (ADR 0076 §1)',
    doc: docV18(dreptunghi(), [
      buzunar({ coborare: { fel: 'zigzag', unghi: 0.3, lungime: 0.5 } }),
      buzunar({ id: 'b2', coborare: { fel: 'elice', unghi: 3, raza: 0.2 } }),
    ]),
  },
  {
    nume: 'A12 coborârea cu câmpuri necunoscute și capcane de prototip (obiecte deschise, ADR 0076 §7)',
    doc: docV18(dreptunghi(), [buzunar({ coborare: { fel: 'elice', unghi: 3, raza: 3, nota: 'x', ...capcane() } })]),
  },
  { nume: 'A13 zigzagul la 10 000 mm (plafonul ales: PLAFON.latura) și elicea de rază 100', doc: docV18(dreptunghi(), [buzunar({ coborare: { fel: 'zigzag', unghi: 1, lungime: 10_000 } }), buzunar({ id: 'b2', coborare: { fel: 'elice', unghi: 1, raza: 100 } })]) },
  { nume: 'A14 găurirea cu Ø6 pe un cerc de Ø6, ieșirea implicită (lipsă = 1, ADR 0087 §1)', doc: docV18(cerc(3), [gaurire()]) },
  { nume: 'A15 găurirea cu ieșirea la 1 și la 100 (marginile)', doc: docV18(cerc(3), [gaurire({ retragereCompleta: 1 }), gaurire({ id: 'g2', retragereCompleta: 100 })]) },
  { nume: 'A16 găurirea pe un dreptunghi (refuzul e al lucrării, ADR 0087 §4)', doc: docV18(dreptunghi(), [gaurire({ retragereCompleta: 2 })]) },
  { nume: 'A17 V-carve-ul cu V90 Ø6 (ADR 0090)', doc: docV18(dreptunghi(), [vcarve()]) },
  { nume: 'A18 freza în V la 1° și la 179° (marginile), cu câmpuri necunoscute în formă', doc: docV18(dreptunghi(), [vcarve({ scula: { ...inV(2, 6, 1), forma: { tip: 'v', unghi: 1, producator: 'x' } } }), vcarve({ id: 'v2', scula: inV(3, 6, 179) })]) },
  { nume: 'A19 V-carve-ul cu freza plată și freza în V pe exterior (refuzuri ale lucrării, ADR 0090 §4, ADR 0092 §3)', doc: docV18(dreptunghi(), [vcarve({ scula: plata(2, 6) }), opV18({ id: 'o2', latura: 'exterior', scula: inV(3, 6, 90) })]) },
  { nume: 'A20 fundul plat cu Ø3,175 și pasul 1,2 (ADR 0091 §1)', doc: docV18(dreptunghi(), [vcarve({ fundPlat: fund() })]) },
  {
    nume: 'A21 fundul plat cu pasul 50, cu o formă pe freza lui și câmpuri necunoscute (potrivirea e a lucrării)',
    doc: docV18(dreptunghi(), [vcarve({ fundPlat: { ...fund({ pasLateral: 50 }), scula: { ...inV(3, 3.175, 90, 0.5), nota: 1 }, nota: 2 } })]),
  },
  { nume: 'A22 fundul plat pe un buzunar și pe un profil (ADR 0091 §1: lucrarea îl refuză)', doc: docV18(dreptunghi(), [buzunar({ fundPlat: fund() }), opV18({ id: 'o2', fundPlat: fund() })]) },
  { nume: 'A23 freza de gravare: V30 cu vârful 0,25 (ADR 0092 §1), pe linie, cu direcția invers', doc: docV18(linie(), [opV18({ latura: 'pe-linie', adancime: 1, pas: 1, scula: inV(2, 3.175, 30, 0.25), directie: 'invers' })]) },
  { nume: 'A24 vârful 100 (marginea de sus), mai mare decât diametrul (potrivirea e a lucrării)', doc: docV18(dreptunghi(), [vcarve({ scula: inV(2, 6, 90, 100) })]) },
  { nume: 'A25 direcția „scurt” pe linie și „invers” pe exterior (lucrarea o refuză pe exterior)', doc: docV18(linie(), [opV18({ latura: 'pe-linie', directie: 'scurt' }), opV18({ id: 'o2', latura: 'exterior', directie: 'invers' })]) },
  {
    nume: 'A26 gravarea inteligentă: fundul plat cu V30 vârful 0,25 și freza dreaptă Ø2 (ADR 0092 §2)',
    doc: docV18(dreptunghi(20, 20), [vcarve({ adancime: 2, pas: 1, scula: inV(2, 3.175, 30, 0.25), fundPlat: { scula: plata(3, 2), pasLateral: 0.8 } })]),
  },
  { nume: 'A27 frezele de rest: Ø12, apoi Ø3 (ADR 0093)', doc: docV18(dreptunghi(80, 40), [buzunar({ scula: plata(1, 12), adancime: 10, pas: 5, pasLateral: 4.8, rest: [rest1(2, 3, 1.2)] })]) },
  {
    nume: 'A28 opt freze de rest (marginea), cu câmpuri necunoscute',
    doc: docV18(dreptunghi(), [buzunar({ scula: plata(1, 12), rest: [8, 7, 6, 5, 4, 3, 2, 1].map((d, k) => ({ ...rest1(k + 2, d, d / 4), nota: k })) })]),
  },
  { nume: 'A29 fundul plat cu o freză de rest (ADR 0093 §1: `fundPlat.rest`)', doc: docV18(dreptunghi(), [vcarve({ fundPlat: fund({ scula: plata(3, 6), pasLateral: 2.4, rest: [rest1(4, 2, 0.8)] }) })]) },
  {
    nume: 'A30 frezele de rest care nu scad, în V, pe un profil (refuzuri ale lucrării, ADR 0093 §1)',
    doc: docV18(dreptunghi(), [buzunar({ rest: [rest1(2, 6, 2.4), { scula: inV(3, 6, 90), pasLateral: 1 }] }), opV18({ id: 'o2', rest: [rest1(4, 3, 1)] })]),
  },
  { nume: 'A31 strategia paralelă la 0° și la 30° (ADR 0094)', doc: docV18(dreptunghi(80, 40), [buzunar({ strategie: { fel: 'paralel', unghi: 0 } }), buzunar({ id: 'b2', strategie: { fel: 'paralel', unghi: 30 } })]) },
  { nume: 'A32 strategia la 179,999° (sub margine) și la −0 (= 0)', doc: docV18(dreptunghi(), [buzunar({ strategie: { fel: 'paralel', unghi: 179.999 } }), buzunar({ id: 'b2', strategie: { fel: 'paralel', unghi: -0 } })]) },
  {
    nume: 'A33 strategia pe un profil și cu coborârea în rampă, cu câmpuri necunoscute (refuzuri ale lucrării, ADR 0094 §1)',
    doc: docV18(dreptunghi(), [opV18({ strategie: { fel: 'paralel', unghi: 45, nota: 'x' } }), buzunar({ id: 'b2', coborare: { fel: 'rampa', unghi: 3 }, strategie: { fel: 'paralel', unghi: 90 } })]),
  },
  {
    nume: 'A34 coborârea, ieșirea și direcția pe alte feluri (ușa judecă schema, ALEGERE din antetul oracolului)',
    doc: docV18(dreptunghi(), [opV18({ coborare: { fel: 'elice', unghi: 3, raza: 3 }, retragereCompleta: 4, directie: 'invers' })]),
  },
  {
    nume: 'A35 imbricarea la 200 de niveluri, într-un câmp necunoscut al coborârii (ADR 0024, precizarea 5)',
    // documentul 1, piese 2, piesa 3, operatii 4, operația 5, coborarea 6, `x` 7 … 200: 194 de obiecte.
    doc: docV18(dreptunghi(), [buzunar({ coborare: { fel: 'plonjare', x: imbricat(194) } })]),
  },
  {
    nume: 'A36 toate felurile într-un document, pe două piese și două instanțe',
    doc: {
      schema: 18, rev: 12, autor: 'atelier',
      piese: [
        {
          id: 'cutie', nume: 'Cutie',
          radacina: { tip: 'grup', id: 'g', matrice: I(), copii: [
            { tip: 'element', id: 'fund', forma: dreptunghi(200, 120), matrice: I() },
            { tip: 'element', id: 'gaura', forma: cerc(3), matrice: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 20 } },
            { tip: 'element', id: 'logo', forma: dreptunghi(40, 20), matrice: { a: 1, b: 0, c: 0, d: 1, e: 80, f: 50 } },
          ] },
          operatii: [
            buzunar({ id: 'b', noduri: ['fund'], adancime: 5, coborare: { fel: 'elice', unghi: 2, raza: 4 }, rest: [rest1(2, 3, 1.2)], strategie: { fel: 'paralel', unghi: 15 } }),
            gaurire({ id: 'gaura', noduri: ['gaura'], retragereCompleta: 2 }),
            vcarve({ id: 'v', noduri: ['logo'], scula: inV(4, 6, 60, 0.2), fundPlat: fund({ scula: plata(5, 3.175), rest: [rest1(6, 1, 0.4)] }) }),
            opV18({ id: 'contur', noduri: ['fund'], latura: 'exterior', scula: plata(7, 6), urechi: { numar: 4, latime: 8, grosime: 2 } }),
          ],
        },
        { id: 'semn', radacina: { tip: 'element', id: 's', forma: linie(), matrice: I() }, operatii: [opV18({ id: 'l', noduri: ['s'], latura: 'pe-linie', adancime: 1, pas: 1, scula: inV(8, 6, 90), directie: 'scurt' })] },
      ],
      foi: [{ id: 'f1', stoc: { latime: 600, inaltime: 400, grosime: 18 }, instante: [{ id: 'c1', piesa: 'cutie', x: 20, y: 20, rotire: 0 }, { id: 's1', piesa: 'semn', x: 300, y: 300, rotire: 90 }] }],
    },
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Documente vechi și ce iese din ușă (v18).

/** Operația pe care o pune migrarea v2 → v3 (ADR 0025), cu câmpurile v4 … v8 (ADR 0027–0032): sens, apoi patru `null`. */
const opMigrata = (id: string, latura: 'interior' | 'exterior', adancime: number, pas: number): Liber => ({
  id, tip: 'profil', noduri: [id], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura, adancime, pas,
  sens: 'urcare', urechi: null, rampa: null, intrari: null, colturi: null,
});

const V10_PROFIL = docV18(dreptunghi(), [opV18({ latura: 'exterior', despartire: false })], 10);
const V11_BUZUNAR = docV18(dreptunghi(), [buzunar()], 11);
const V12_ELICE = docV18(dreptunghi(), [buzunar({ coborare: { fel: 'elice', unghi: 3, raza: 3 } })], 12);
const V13_GAURA = docV18(cerc(3), [gaurire({ retragereCompleta: 3 })], 13);
const V14_VCARVE = docV18(dreptunghi(12, 6), [vcarve()], 14);
const V15_FUND = docV18(dreptunghi(40, 20), [vcarve({ fundPlat: fund({ scula: plata(3, 3), pasLateral: 1.2 }) })], 15);
const V16_GRAVARE = docV18(linie(), [opV18({ latura: 'pe-linie', adancime: 1, pas: 1, scula: inV(2, 3.175, 30, 0.25), directie: 'invers' })], 16);
const V17_REST = docV18(dreptunghi(80, 40), [buzunar({ scula: plata(1, 12), adancime: 10, pas: 5, pasLateral: 4.8, rest: [rest1(2, 3, 1.2)] })], 17);

export const MIGRARI_V18_HARTIE: ReadonlyArray<{ readonly nume: string; readonly vechi: Liber; readonly v18: Liber }> = [
  {
    nume: 'M01 un v1 (un cerc și un dreptunghi cu nume) urcă la v18: piese, instanțe, operațiile implicite, apoi doar numărul',
    vechi: {
      schema: 1, rev: 4, foaie: { latime: 500, inaltime: 300, grosime: 18 },
      elemente: [
        { id: 'g', forma: cerc(10), matrice: { a: 1, b: 0, c: 0, d: 1, e: 100, f: 50 } },
        { id: 'r', nume: 'Raft', forma: dreptunghi(80, 40), matrice: { a: 1, b: 0, c: 0, d: 1, e: 200, f: 100 } },
      ],
    },
    v18: {
      schema: 18, rev: 4,
      piese: [
        { id: 'g', radacina: { tip: 'element', id: 'g', forma: { tip: 'cerc', raza: 10 }, matrice: I() }, operatii: [opMigrata('g', 'interior', 8, 4)] },
        {
          id: 'r', nume: 'Raft',
          radacina: { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 80, inaltime: 40, razaColt: 0 }, matrice: I() },
          operatii: [opMigrata('r', 'exterior', 3, 3)],
        },
      ],
      foi: [{
        id: 'f1', stoc: { latime: 500, inaltime: 300, grosime: 18 },
        instante: [{ id: 'g', piesa: 'g', x: 100, y: 50, rotire: 0 }, { id: 'r', piesa: 'r', x: 200, y: 100, rotire: 0 }],
      }],
    },
  },
  {
    nume: 'M02 un v3 cu o operație proprie (T2 Ø3, 5 / 2,5) urcă la v18: sens urcare, urechi, rampă, intrări, colțuri null',
    vechi: {
      schema: 3, rev: 1,
      piese: [{ id: 'p', radacina: { tip: 'element', id: 'e', forma: cerc(20), matrice: I() }, operatii: [
        { id: 'o', tip: 'profil', noduri: ['e'], scula: { numar: 2, nume: 'freza 3', diametru: 3 }, latura: 'interior', adancime: 5, pas: 2.5, nota: 'x' },
      ] }],
      foi: [{ id: 'f1', stoc: { latime: 400, inaltime: 300, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 50, y: 50, rotire: 0 }] }],
    },
    v18: {
      schema: 18, rev: 1,
      piese: [{ id: 'p', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 20 }, matrice: I() }, operatii: [{
        id: 'o', tip: 'profil', noduri: ['e'], scula: { numar: 2, nume: 'freza 3', diametru: 3 }, latura: 'interior', adancime: 5, pas: 2.5, nota: 'x',
        sens: 'urcare', urechi: null, rampa: null, intrari: null, colturi: null,
      }] }],
      foi: [{ id: 'f1', stoc: { latime: 400, inaltime: 300, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 50, y: 50, rotire: 0 }] }],
    },
  },
  {
    nume: 'M03 un v10 (profil exterior, despartire false) urcă la v18 cu doar numărul (ADR 0069 §2)',
    vechi: V10_PROFIL,
    v18: {
      schema: 18, rev: 0,
      piese: [{ id: 'p', radacina: { tip: 'element', id: 'e', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: I() }, operatii: [{
        id: 'o1', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'exterior', adancime: 6, pas: 3,
        sens: 'urcare', urechi: null, rampa: null, intrari: null, colturi: null, despartire: false,
      }] }],
      foi: [{ id: 'f1', stoc: { latime: 400, inaltime: 300, grosime: 18 }, instante: [{ id: 'i0', piesa: 'p', x: 50, y: 50, rotire: 0 }] }],
    },
  },
  { nume: 'M04 un v11 cu un buzunar: doar numărul (ADR 0076 §7)', vechi: V11_BUZUNAR, v18: cuSchema(V11_BUZUNAR, 18) },
  { nume: 'M05 un v12 cu elicea: doar numărul (ADR 0087 §6)', vechi: V12_ELICE, v18: cuSchema(V12_ELICE, 18) },
  { nume: 'M06 un v13 cu o găurire ieșind la al treilea pas: doar numărul (ADR 0090 §5)', vechi: V13_GAURA, v18: cuSchema(V13_GAURA, 18) },
  { nume: 'M07 un v14 cu V-carve-ul V90: doar numărul (ADR 0091 §1)', vechi: V14_VCARVE, v18: cuSchema(V14_VCARVE, 18) },
  { nume: 'M08 un v15 cu fundul plat: doar numărul (ADR 0092 §1)', vechi: V15_FUND, v18: cuSchema(V15_FUND, 18) },
  { nume: 'M09 un v16 cu freza de gravare și direcția: doar numărul (ADR 0093 §1)', vechi: V16_GRAVARE, v18: cuSchema(V16_GRAVARE, 18) },
  { nume: 'M10 un v17 cu frezele de rest: doar numărul (ADR 0094 §1)', vechi: V17_REST, v18: cuSchema(V17_REST, 18) },
];

/** Un document marcat N, valid pentru vN, și ce iese din ușă: fiecare versiune cu ce avea deja (pentru ușile v11 … v17). */
export const VECHI_NOI: ReadonlyArray<{ readonly versiune: number; readonly doc: Liber }> = [
  { versiune: 10, doc: V10_PROFIL }, { versiune: 11, doc: V11_BUZUNAR }, { versiune: 12, doc: V12_ELICE }, { versiune: 13, doc: V13_GAURA },
  { versiune: 14, doc: V14_VCARVE }, { versiune: 15, doc: V15_FUND }, { versiune: 16, doc: V16_GRAVARE }, { versiune: 17, doc: V17_REST },
];

// ---------------------------------------------------------------------------------------------------------------
// Câmpurile noi în afara locului lor: câmpuri necunoscute, primite (și păstrate).

/** Documentul dat, cu câmpul `camp: valoare` pus pe piesa lui (nu pe operație). */
const cuPePiesa = (d: Liber, camp: string, valoare: unknown): Liber => {
  const c = structuredClone(d);
  ((c['piese'] as Liber[])[0] as Liber)[camp] = valoare;
  return c;
};
const N01 = docV18(dreptunghi(), [opV18({ scula: { ...plata(1, 6), pasLateral: 2 } })], 10);
const N02 = cuPePiesa(docV18(dreptunghi(), [buzunar()], 11), 'coborare', { fel: 'rampa', unghi: 3 });
const N03 = docV18(cerc(3), [buzunar({ scula: { ...plata(1, 6), retragereCompleta: 2 } })], 12);
const N04 = docV18(dreptunghi(), [opV18({ forma: { tip: 'v', unghi: 90 } })], 13);
const N05 = docV18(dreptunghi(), [vcarve({ scula: { ...inV(2, 6, 90), fundPlat: fund() } })], 14);
const N06 = docV18(dreptunghi(), [vcarve({ scula: { ...inV(2, 6, 90), varf: 0.5 }, fundPlat: fund({ directie: 'invers' }) })], 15);
const N07 = docV18(dreptunghi(), [buzunar({ scula: { ...plata(1, 6), rest: [rest1(2, 3, 1)] } })], 16);
const N08 = docV18(dreptunghi(), [vcarve({ scula: { ...inV(2, 6, 90), strategie: 1 }, fundPlat: fund({ strategie: { fel: 'paralel', unghi: 0 } }) })], 17);
const foaieV3 = (): Liber => ({ id: 'f1', stoc: { latime: 400, inaltime: 300, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 50, y: 50, rotire: 0 }] });

export const NECIOCNIRI_V18: ReadonlyArray<CazV18 & { readonly v18: Liber }> = [
  { nume: 'N01 un v10 cu `pasLateral` pe sculă (ciocnirea e doar pe operație)', doc: N01, v18: cuSchema(N01, 18) },
  { nume: 'N02 un v11 cu `coborare` pe piesă', doc: N02, v18: cuSchema(N02, 18) },
  { nume: 'N03 un v12 cu `retragereCompleta` pe sculă', doc: N03, v18: cuSchema(N03, 18) },
  { nume: 'N04 un v13 cu `forma` pe operație (nu pe sculă)', doc: N04, v18: cuSchema(N04, 18) },
  { nume: 'N05 un v14 cu `fundPlat` pe sculă', doc: N05, v18: cuSchema(N05, 18) },
  { nume: 'N06 un v15 cu `varf` pe sculă, în afara formei, și `directie` pe fundul plat', doc: N06, v18: cuSchema(N06, 18) },
  { nume: 'N07 un v16 cu `rest` pe sculă', doc: N07, v18: cuSchema(N07, 18) },
  { nume: 'N08 un v17 cu `strategie` pe fundul plat și pe sculă', doc: N08, v18: cuSchema(N08, 18) },
  {
    nume: 'N09 un v3 cu `pasLateral` pe nod (urcă la v18 cu el pe nod)',
    doc: {
      schema: 3, rev: 0,
      piese: [{ id: 'p', radacina: { tip: 'element', id: 'e', forma: cerc(20), matrice: I(), pasLateral: 3 }, operatii: [
        { id: 'o', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: 'f', diametru: 6 }, latura: 'interior', adancime: 5, pas: 5 },
      ] }],
      foi: [foaieV3()],
    },
    v18: {
      schema: 18, rev: 0,
      piese: [{ id: 'p', radacina: { tip: 'element', id: 'e', forma: { tip: 'cerc', raza: 20 }, matrice: I(), pasLateral: 3 }, operatii: [{
        id: 'o', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: 'f', diametru: 6 }, latura: 'interior', adancime: 5, pas: 5,
        sens: 'urcare', urechi: null, rampa: null, intrari: null, colturi: null,
      }] }],
      foi: [foaieV3()],
    },
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Frontierele: fiecare câmp nou, pe operația unui document v18 altfel valid; `cale` e relativă la operație.

export type FrontieraV18 = {
  /** Calea câmpului pe operație, cu `.` (indicii listelor ca numere). */
  readonly cale: string;
  /** Operația pe care se pune valoarea (documentul: `docV18(forma, [operatie])`). */
  readonly operatie: Liber;
  readonly forma: Liber;
  /** Categoria oracolului când valoarea e refuzată. */
  readonly categorie: string;
  readonly adr: string;
  /** Valoarea (sau `LIPSA`) și verdictul de pe hârtie: `true` = primit. */
  readonly valori: ReadonlyArray<readonly [unknown, boolean]>;
  /** Valori pe care ADR-ul nu le hotărăște (AMBIGUU): verdictul ALEGERII oracolului și de ce; aplicația doar se raportează. */
  readonly ambigue?: ReadonlyArray<readonly [unknown, boolean, string]>;
};

const NUMERE_RELE: ReadonlyArray<readonly [unknown, boolean]> = [[Number.POSITIVE_INFINITY, false], [Number.NaN, false], [null, false], [true, false]];
const D = dreptunghi();

export const FRONTIERE_V18: readonly FrontieraV18[] = [
  {
    cale: 'tip', operatie: opV18(), forma: D, categorie: 'operatie', adr: 'ADR 0069 §1, ADR 0087 §6, ADR 0090 §5: profil, buzunar, gaurire, vcarve',
    valori: [['profil', true], ['buzunar', true], ['gaurire', true], ['vcarve', true], ['Buzunar', false], ['pocket', false], ['gaurire ', false], ['', false], [LIPSA, false], [null, false], [11, false]],
  },
  {
    cale: 'pasLateral', operatie: buzunar(), forma: D, categorie: 'pas-lateral', adr: 'ADR 0069 §1: în (0, 50]; lipsa e a lucrării',
    valori: [[0, false], [-0, false], [-1, false], [1e-9, true], [2.4, true], [50, true], [50.000001, false], ['2.4', false], [LIPSA, true], ...NUMERE_RELE],
  },
  {
    cale: 'coborare', operatie: buzunar(), forma: D, categorie: 'coborare', adr: 'ADR 0076 §1: un obiect cu felul; lipsa = plonjarea',
    valori: [[LIPSA, true], [{ fel: 'plonjare' }, true], [null, false], [[], false], ['rampa', false], [3, false], [{}, false]],
  },
  {
    cale: 'coborare.fel', operatie: buzunar({ coborare: { fel: 'elice', unghi: 3, lungime: 20, raza: 3 } }), forma: D, categorie: 'coborare',
    adr: 'ADR 0076 §1: plonjare, rampa, zigzag, elice (parametrii tuturor sunt în obiect)',
    valori: [['plonjare', true], ['rampa', true], ['zigzag', true], ['elice', true], ['Rampa', false], ['rampa ', false], ['spirala', false], ['', false], [LIPSA, false], [null, false]],
  },
  {
    cale: 'coborare.unghi', operatie: buzunar({ coborare: { fel: 'rampa', unghi: 3 } }), forma: D, categorie: 'coborare',
    adr: 'ADR 0076 §1: unghiul în (0, 45], obligatoriu pe rampă',
    valori: [[0, false], [1e-6, true], [0.3, true], [3, true], [45, true], [45.000001, false], [90, false], [-3, false], ['3', false], [LIPSA, false], ...NUMERE_RELE],
  },
  {
    cale: 'coborare.unghi', operatie: buzunar({ coborare: { fel: 'elice', unghi: 3, raza: 3 } }), forma: D, categorie: 'coborare',
    adr: 'ADR 0076 §1: unghiul în (0, 45], obligatoriu pe elice',
    valori: [[45, true], [45.5, false], [0, false], [LIPSA, false]],
  },
  {
    cale: 'coborare.lungime', operatie: buzunar({ coborare: { fel: 'zigzag', unghi: 3, lungime: 20 } }), forma: D, categorie: 'coborare',
    adr: 'ADR 0076 §1: lungimea pozitivă, sub plafon (ALEGERE: 10 000 mm), obligatorie pe zigzag',
    valori: [[0, false], [-20, false], [0.5, true], [20, true], [10_000, true], [10_000.001, false], ['20', false], [LIPSA, false], ...NUMERE_RELE],
  },
  {
    cale: 'coborare.raza', operatie: buzunar({ coborare: { fel: 'elice', unghi: 3, raza: 3 } }), forma: D, categorie: 'coborare',
    adr: 'ADR 0076 §1: raza pozitivă, sub plafon (ALEGERE: 10 000 mm), obligatorie pe elice',
    valori: [[0, false], [-3, false], [0.2, true], [3, true], [100, true], [10_000.5, false], ['3', false], [LIPSA, false], ...NUMERE_RELE],
    ambigue: [
      [101, true, 'ADR 0076 §1 nu numește plafonul razei; ALEGERE: PLAFON.latura (10 000 mm), ca razele din ADR 0024'],
      [10_000, true, 'ADR 0076 §1 nu numește plafonul razei; ALEGERE: PLAFON.latura (10 000 mm), ca razele din ADR 0024'],
    ],
  },
  {
    cale: 'retragereCompleta', operatie: gaurire(), forma: cerc(3), categorie: 'retragere', adr: 'ADR 0087 §1, §6: un întreg 1–100; lipsa = 1',
    valori: [[LIPSA, true], [1, true], [3, true], [100, true], [0, false], [101, false], [2.5, false], [-1, false], ['3', false], ...NUMERE_RELE],
  },
  {
    cale: 'scula.forma', operatie: vcarve(), forma: D, categorie: 'scula', adr: 'ADR 0090 §1: { tip: \'v\', unghi }; lipsa = plată',
    valori: [[LIPSA, true], [{ tip: 'v', unghi: 60 }, true], [null, false], ['v', false], [[], false], [{}, false], [{ tip: 'plata' }, false]],
  },
  {
    cale: 'scula.forma.tip', operatie: vcarve(), forma: D, categorie: 'scula', adr: 'ADR 0090 §5: `tip: \'v\'`',
    valori: [['v', true], ['V', false], ['plata', false], ['', false], [LIPSA, false], [null, false]],
  },
  {
    cale: 'scula.forma.unghi', operatie: vcarve(), forma: D, categorie: 'scula', adr: 'ADR 0090 §1, §5: unghiul finit în [1, 179]',
    valori: [[1, true], [0.999, false], [60, true], [179, true], [179.001, false], [180, false], [0, false], ['60', false], [LIPSA, false], ...NUMERE_RELE],
  },
  {
    cale: 'scula.forma.varf', operatie: vcarve(), forma: D, categorie: 'scula', adr: 'ADR 0092 §1: în (0, 100]; lipsa = ascuțit',
    valori: [[LIPSA, true], [0.25, true], [100, true], [0, false], [-0.1, false], [100.001, false], ['0.25', false], ...NUMERE_RELE],
  },
  {
    cale: 'fundPlat', operatie: vcarve(), forma: D, categorie: 'fund-plat', adr: 'ADR 0091 §1: { scula, pasLateral }; lipsa = ca v14',
    valori: [[LIPSA, true], [fund(), true], [null, false], [[], false], [{}, false], ['da', false], [{ pasLateral: 1.2 }, false]],
  },
  {
    cale: 'fundPlat.pasLateral', operatie: vcarve({ fundPlat: fund() }), forma: D, categorie: 'fund-plat', adr: 'ADR 0091 §1: pozitiv, cel mult 50',
    valori: [[1.2, true], [50, true], [0, false], [50.001, false], [-1, false], ['1.2', false], [LIPSA, false], ...NUMERE_RELE],
  },
  {
    cale: 'fundPlat.scula.numar', operatie: vcarve({ fundPlat: fund() }), forma: D, categorie: 'fund-plat', adr: 'ADR 0091 §1 (ADR 0025): întreg 1–999',
    valori: [[1, true], [999, true], [0, false], [1000, false], [2.5, false], ['3', false], [LIPSA, false], ...NUMERE_RELE],
  },
  {
    cale: 'fundPlat.scula.nume', operatie: vcarve({ fundPlat: fund() }), forma: D, categorie: 'fund-plat', adr: 'ADR 0025: text de cel mult 200 de caractere',
    valori: [['', true], ['x'.repeat(200), true], ['x'.repeat(201), false], [7, false], [null, false], [LIPSA, false]],
  },
  {
    cale: 'fundPlat.scula.diametru', operatie: vcarve({ fundPlat: fund() }), forma: D, categorie: 'fund-plat', adr: 'ADR 0091 §1 (ADR 0025): în (0, 100]',
    valori: [[3.175, true], [100, true], [0, false], [100.001, false], [-3, false], ['3', false], [LIPSA, false], ...NUMERE_RELE],
  },
  {
    cale: 'fundPlat.scula', operatie: vcarve({ fundPlat: fund() }), forma: D, categorie: 'fund-plat', adr: 'ADR 0091 §1: scula e obligatorie',
    valori: [[plata(3, 2), true], [LIPSA, false], [null, false], ['T3', false], [[], false]],
  },
  {
    cale: 'fundPlat.scula.forma.unghi', operatie: vcarve({ fundPlat: fund({ scula: inV(3, 3.175, 90) }) }), forma: D, categorie: 'fund-plat',
    adr: 'ADR 0091 §1, ADR 0092 §1: forma frezei fundului, judecată ca a operației (lucrarea o refuză)',
    valori: [[90, true], [1, true], [0, false], [180, false], [LIPSA, false]],
  },
  {
    cale: 'fundPlat.scula.forma.varf', operatie: vcarve({ fundPlat: fund({ scula: inV(3, 3.175, 90) }) }), forma: D, categorie: 'fund-plat',
    adr: 'ADR 0092 §1: vârful și pe scula fundului plat, în (0, 100]',
    valori: [[LIPSA, true], [0.5, true], [0, false], [101, false]],
  },
  {
    cale: 'directie', operatie: opV18({ latura: 'pe-linie' }), forma: linie(), categorie: 'directie', adr: 'ADR 0092 §1: invers sau scurt; lipsa = ca desenul',
    valori: [[LIPSA, true], ['invers', true], ['scurt', true], ['Invers', false], ['desen', false], ['', false], [null, false], [1, false]],
  },
  {
    cale: 'rest', operatie: buzunar({ scula: plata(1, 12) }), forma: D, categorie: 'rest', adr: 'ADR 0093 §1: 1–8 freze',
    valori: [
      [LIPSA, true], [[rest1(2, 3, 1.2)], true], [[1, 2, 3, 4, 5, 6, 7, 8].map((k) => rest1(k + 1, 9 - k, 1)), true],
      [[], false], [[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => rest1(k + 1, 10 - k, 1)), false], [null, false], [{}, false], [rest1(2, 3, 1.2), false],
    ],
  },
  {
    cale: 'rest.0', operatie: buzunar({ scula: plata(1, 12), rest: [rest1(2, 3, 1.2)] }), forma: D, categorie: 'rest', adr: 'ADR 0093 §1: fiecare freză e { scula, pasLateral }',
    valori: [[rest1(2, 6, 2), true], [null, false], ['T2', false], [[], false], [{ pasLateral: 1.2 }, false]],
  },
  {
    cale: 'rest.0.pasLateral', operatie: buzunar({ scula: plata(1, 12), rest: [rest1(2, 3, 1.2)] }), forma: D, categorie: 'rest', adr: 'ADR 0093 §1: în (0, 50]',
    valori: [[1.2, true], [50, true], [0, false], [50.5, false], ['1.2', false], [LIPSA, false], ...NUMERE_RELE],
  },
  {
    cale: 'rest.0.scula.diametru', operatie: buzunar({ scula: plata(1, 12), rest: [rest1(2, 3, 1.2)] }), forma: D, categorie: 'rest', adr: 'ADR 0093 §1 (ADR 0025): în (0, 100]',
    valori: [[3, true], [100, true], [0, false], [100.5, false], [LIPSA, false]],
  },
  {
    cale: 'rest.0.scula.numar', operatie: buzunar({ scula: plata(1, 12), rest: [rest1(2, 3, 1.2)] }), forma: D, categorie: 'rest', adr: 'ADR 0093 §1 (ADR 0025): întreg 1–999',
    valori: [[2, true], [0, false], [1.5, false], [LIPSA, false]],
  },
  {
    cale: 'rest.0.scula.forma.unghi', operatie: buzunar({ scula: plata(1, 12), rest: [{ scula: inV(2, 3, 90), pasLateral: 1 }] }), forma: D, categorie: 'rest',
    adr: 'ADR 0093 §1: scula ca a operației, deci și forma ei (lucrarea o refuză)',
    valori: [[90, true], [0, false]],
  },
  {
    cale: 'fundPlat.rest', operatie: vcarve({ fundPlat: fund({ scula: plata(3, 6) }) }), forma: D, categorie: 'fund-plat', adr: 'ADR 0093 §1: `fundPlat.rest`, 1–8 freze',
    valori: [[LIPSA, true], [[rest1(4, 2, 0.8)], true], [[], false], [null, false], [[{ scula: plata(4, 2) }], false], [[{ ...rest1(4, 2, 0.8), pasLateral: 0 }], false]],
  },
  {
    cale: 'strategie', operatie: buzunar(), forma: D, categorie: 'strategie', adr: 'ADR 0094 §1: { fel: \'paralel\', unghi }; lipsa = inelele',
    valori: [[LIPSA, true], [{ fel: 'paralel', unghi: 30 }, true], [null, false], [[], false], ['paralel', false], [{}, false]],
  },
  {
    cale: 'strategie.fel', operatie: buzunar({ strategie: { fel: 'paralel', unghi: 30 } }), forma: D, categorie: 'strategie', adr: 'ADR 0094 §1: `paralel`',
    valori: [['paralel', true], ['inele', false], ['Paralel', false], ['', false], [LIPSA, false], [null, false]],
  },
  {
    cale: 'strategie.unghi', operatie: buzunar({ strategie: { fel: 'paralel', unghi: 30 } }), forma: D, categorie: 'strategie', adr: 'ADR 0094 §1: în [0, 180)',
    valori: [[0, true], [-0, true], [30, true], [179.999, true], [180, false], [-1e-9, false], [-1, false], [360, false], ['30', false], [LIPSA, false], ...NUMERE_RELE],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Ce nu hotărăște textul (AMBIGUU): verdictul ALEGERII oracolului; aplicația doar se raportează, fără judecată.

export const AMBIGUE_V18: ReadonlyArray<CazV18 & { readonly alegere: boolean; readonly adr: string }> = [
  {
    nume: 'Z01 elicea de rază 10 000 mm', doc: docV18(dreptunghi(), [buzunar({ coborare: { fel: 'elice', unghi: 3, raza: 10_000 } })]), alegere: true,
    adr: 'ADR 0076 §1: „lungimea și raza pozitive, sub plafoanele lor”, fără plafon numit; ALEGERE: PLAFON.latura (razele ≤ 10 000, ADR 0024)',
  },
  {
    nume: 'Z02 elicea de rază 101 mm', doc: docV18(dreptunghi(), [buzunar({ coborare: { fel: 'elice', unghi: 3, raza: 101 } })]), alegere: true,
    adr: 'ADR 0076 §1: plafonul razei nenumit (ca Z01)',
  },
  {
    nume: 'Z03 o rampă cu `raza: -1` (parametrul altui fel)', doc: docV18(dreptunghi(), [buzunar({ coborare: { fel: 'rampa', unghi: 3, raza: -1 } })]), alegere: true,
    adr: 'ADR 0076 §1, §5: fiecare fel are parametrii lui, iar „valorile tuturor felurilor rămân scrise”; ALEGERE: ai altui fel sunt câmpuri necunoscute',
  },
  {
    nume: 'Z04 un zigzag cu `raza: 0`', doc: docV18(dreptunghi(), [buzunar({ coborare: { fel: 'zigzag', unghi: 3, lungime: 20, raza: 0 } })]), alegere: true,
    adr: 'ADR 0076 §1, §5: ca Z03',
  },
  {
    nume: 'Z05 o plonjare cu `unghi: 90`', doc: docV18(dreptunghi(), [buzunar({ coborare: { fel: 'plonjare', unghi: 90 } })]), alegere: true,
    adr: 'ADR 0076 §1: plonjarea n-are parametri; ALEGERE: unghiul de pe ea e un câmp necunoscut',
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Documente stricate: un singur defect fiecare.

export type RefuzV18 = {
  readonly nume: string;
  readonly doc: unknown;
  /** Categoria oracolului. */
  readonly categorie: string;
  /** Calea câmpului, ca în motivul ușii (`piese.0.operatii.0.pasLateral`); `''` = documentul întreg. */
  readonly camp: string;
  /** De ce, cu paragraful ADR-ului. */
  readonly motiv: string;
  /** Textul refuzului, unde ADR-ul îl citează. */
  readonly text?: string;
};

const opC = 'piese.0.operatii.0';
const docV = (schema: number, op: Liber, forma: Liber = dreptunghi()): Liber => docV18(forma, [op], schema);
/** Un v4 (sens, fără urechi) cu operația dată. */
const docV4 = (v: Liber): Liber => {
  const o = opV18(v);
  for (const c of ['urechi', 'rampa', 'intrari', 'colturi']) delete o[c];
  return docV18(dreptunghi(), [o], 4);
};
const faraSchema = (d: Liber): Liber => {
  const c = structuredClone(d);
  delete c['schema'];
  return c;
};
/** Un v7 (fără colțuri) cu operația dată. */
const docV7 = (v: Liber): Liber => {
  const o = opV18(v);
  delete o['colturi'];
  return docV18(dreptunghi(), [o], 7);
};

export const REFUZATE_V18: readonly RefuzV18[] = [
  // Versiunea.
  { nume: 'R01 scris de o versiune mai nouă (v19)', doc: docV(19, buzunar()), categorie: 'schema', camp: 'schema', motiv: 'ADR 0069 §2, ADR 0070 §2: o versiune mai veche refuză una mai nouă', text: 'versiune mai nouă' },
  { nume: 'R02 versiunea 18.5', doc: docV(18.5, buzunar()), categorie: 'schema', camp: 'schema', motiv: 'ADR 0070 §2: o versiune întreagă' },
  { nume: 'R03 versiunea „18” (text)', doc: { ...docV(18, buzunar()), schema: '18' }, categorie: 'schema', camp: 'schema', motiv: 'ADR 0070 §2: o versiune întreagă' },
  { nume: 'R04 versiunea 0', doc: docV(0, buzunar()), categorie: 'schema', camp: 'schema', motiv: 'ADR 0070 §2: versiunile încep de la 1' },
  { nume: 'R05 fără versiune', doc: faraSchema(docV(18, buzunar())), categorie: 'schema', camp: 'schema', motiv: 'ADR 0070 §2: fără versiune' },
  { nume: 'R06 documentul e o listă', doc: [docV(18, buzunar())], categorie: 'schema', camp: '', motiv: 'ADR 0070 §2: stricat' },
  // Câmpurile v18, câte unul.
  { nume: 'R10 buzunarul cu pasul 0', doc: docV(18, buzunar({ pasLateral: 0 })), categorie: 'pas-lateral', camp: `${opC}.pasLateral`, motiv: 'ADR 0069 §1: în (0, 50]' },
  { nume: 'R11 buzunarul cu pasul 60', doc: docV(18, buzunar({ pasLateral: 60 })), categorie: 'pas-lateral', camp: `${opC}.pasLateral`, motiv: 'ADR 0069 §1: în (0, 50]' },
  { nume: 'R12 felul „pocket”', doc: docV(18, opV18({ tip: 'pocket' })), categorie: 'operatie', camp: `${opC}.tip`, motiv: 'ADR 0069 §1, 0087 §6, 0090 §5: patru feluri' },
  { nume: 'R13 coborârea null', doc: docV(18, buzunar({ coborare: null })), categorie: 'coborare', camp: `${opC}.coborare`, motiv: 'ADR 0076 §1: un obiect; lipsa e plonjarea' },
  { nume: 'R14 rampa fără unghi', doc: docV(18, buzunar({ coborare: { fel: 'rampa' } })), categorie: 'coborare', camp: `${opC}.coborare`, motiv: 'ADR 0076 §1: rampa are unghiul' },
  { nume: 'R15 rampa cu 60°', doc: docV(18, buzunar({ coborare: { fel: 'rampa', unghi: 60 } })), categorie: 'coborare', camp: `${opC}.coborare`, motiv: 'ADR 0076 §1: unghiul în (0, 45]' },
  { nume: 'R16 zigzagul fără lungime', doc: docV(18, buzunar({ coborare: { fel: 'zigzag', unghi: 3 } })), categorie: 'coborare', camp: `${opC}.coborare`, motiv: 'ADR 0076 §1: zigzagul are lungimea' },
  { nume: 'R17 elicea cu raza 0', doc: docV(18, buzunar({ coborare: { fel: 'elice', unghi: 3, raza: 0 } })), categorie: 'coborare', camp: `${opC}.coborare`, motiv: 'ADR 0076 §1: raza pozitivă' },
  { nume: 'R18 coborârea de felul „spirala”', doc: docV(18, buzunar({ coborare: { fel: 'spirala', unghi: 3 } })), categorie: 'coborare', camp: `${opC}.coborare`, motiv: 'ADR 0076 §1: patru feluri' },
  { nume: 'R19 găurirea cu ieșirea la 0', doc: docV(18, gaurire({ retragereCompleta: 0 }), cerc(3)), categorie: 'retragere', camp: `${opC}.retragereCompleta`, motiv: 'ADR 0087 §6: un întreg 1–100' },
  { nume: 'R20 găurirea cu ieșirea la 2,5', doc: docV(18, gaurire({ retragereCompleta: 2.5 }), cerc(3)), categorie: 'retragere', camp: `${opC}.retragereCompleta`, motiv: 'ADR 0087 §6: un întreg' },
  { nume: 'R21 freza în V cu 180°', doc: docV(18, vcarve({ scula: inV(2, 6, 180) })), categorie: 'scula', camp: `${opC}.scula.forma`, motiv: 'ADR 0090 §5: unghiul în [1, 179]' },
  { nume: 'R22 forma frezei „plata”', doc: docV(18, vcarve({ scula: { ...plata(2, 6), forma: { tip: 'plata' } } })), categorie: 'scula', camp: `${opC}.scula.forma`, motiv: 'ADR 0090 §5: `tip: \'v\'`' },
  { nume: 'R23 forma frezei null', doc: docV(18, vcarve({ scula: { ...plata(2, 6), forma: null } })), categorie: 'scula', camp: `${opC}.scula.forma`, motiv: 'ADR 0090 §1: lipsa = plată; null nu e o formă (ALEGERE)' },
  { nume: 'R24 vârful 0', doc: docV(18, vcarve({ scula: inV(2, 6, 90, 0) })), categorie: 'scula', camp: `${opC}.scula.forma`, motiv: 'ADR 0092 §1: în (0, 100]' },
  { nume: 'R25 fundul plat fără scula', doc: docV(18, vcarve({ fundPlat: { pasLateral: 1.2 } })), categorie: 'fund-plat', camp: `${opC}.fundPlat`, motiv: 'ADR 0091 §1: { scula, pasLateral }' },
  { nume: 'R26 fundul plat cu pasul 51', doc: docV(18, vcarve({ fundPlat: fund({ pasLateral: 51 }) })), categorie: 'fund-plat', camp: `${opC}.fundPlat`, motiv: 'ADR 0091 §1: cel mult 50' },
  { nume: 'R27 freza fundului cu T0', doc: docV(18, vcarve({ fundPlat: fund({ scula: plata(0, 3) }) })), categorie: 'fund-plat', camp: `${opC}.fundPlat`, motiv: 'ADR 0091 §1: numărul întreg 1–999' },
  { nume: 'R28 freza fundului cu numele de 201 caractere', doc: docV(18, vcarve({ fundPlat: fund({ scula: { numar: 3, nume: 'x'.repeat(201), diametru: 3 } }) })), categorie: 'fund-plat', camp: `${opC}.fundPlat`, motiv: 'ADR 0025: numele, cel mult 200' },
  { nume: 'R29 freza fundului cu Ø120', doc: docV(18, vcarve({ fundPlat: fund({ scula: plata(3, 120) }) })), categorie: 'fund-plat', camp: `${opC}.fundPlat`, motiv: 'ADR 0091 §1: diametrul în (0, 100]' },
  { nume: 'R30 vârful 0 pe freza fundului', doc: docV(18, vcarve({ fundPlat: fund({ scula: inV(3, 3, 90, 0) }) })), categorie: 'fund-plat', camp: `${opC}.fundPlat`, motiv: 'ADR 0092 §1: în (0, 100]' },
  { nume: 'R31 direcția „Invers”', doc: docV(18, opV18({ latura: 'pe-linie', directie: 'Invers' }), linie()), categorie: 'directie', camp: `${opC}.directie`, motiv: 'ADR 0092 §1: invers sau scurt' },
  { nume: 'R32 o listă de rest goală', doc: docV(18, buzunar({ rest: [] })), categorie: 'rest', camp: `${opC}.rest`, motiv: 'ADR 0093 §1: 1–8 freze' },
  { nume: 'R33 nouă freze de rest', doc: docV(18, buzunar({ scula: plata(1, 20), rest: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => rest1(k + 1, 10 - k, 1)) })), categorie: 'rest', camp: `${opC}.rest`, motiv: 'ADR 0093 §1: cel mult 8' },
  { nume: 'R34 o freză de rest fără pas', doc: docV(18, buzunar({ rest: [{ scula: plata(2, 3) }] })), categorie: 'rest', camp: `${opC}.rest`, motiv: 'ADR 0093 §1: { scula, pasLateral }' },
  { nume: 'R35 o freză de rest cu Ø0', doc: docV(18, buzunar({ rest: [rest1(2, 0, 1)] })), categorie: 'rest', camp: `${opC}.rest`, motiv: 'ADR 0093 §1: scula ca a operației' },
  { nume: 'R36 fundul plat cu o listă de rest goală', doc: docV(18, vcarve({ fundPlat: fund({ rest: [] }) })), categorie: 'fund-plat', camp: `${opC}.fundPlat`, motiv: 'ADR 0093 §1: `fundPlat.rest`, 1–8 freze' },
  { nume: 'R37 strategia „inele”', doc: docV(18, buzunar({ strategie: { fel: 'inele', unghi: 0 } })), categorie: 'strategie', camp: `${opC}.strategie`, motiv: 'ADR 0094 §1: `fel: \'paralel\'`' },
  { nume: 'R38 strategia la 180°', doc: docV(18, buzunar({ strategie: { fel: 'paralel', unghi: 180 } })), categorie: 'strategie', camp: `${opC}.strategie`, motiv: 'ADR 0094 §1: în [0, 180)' },
  { nume: 'R39 strategia fără unghi', doc: docV(18, buzunar({ strategie: { fel: 'paralel' } })), categorie: 'strategie', camp: `${opC}.strategie`, motiv: 'ADR 0094 §1: { fel, unghi }' },
  {
    nume: 'R40 imbricarea la 201 niveluri, într-un câmp necunoscut al coborârii',
    doc: docV(18, buzunar({ coborare: { fel: 'plonjare', x: imbricat(195) } })), categorie: 'adancime', camp: '', motiv: 'ADR 0024, precizarea 5: cel mult 200 de niveluri (al documentului întreg)',
  },
  // Migrările: un document marcat vN cu un câmp al lui vN+1 (ciocnirea) sau cu un fel nou (schema vN).
  { nume: 'R50 un v10 cu un buzunar (fără pas: doar felul)', doc: docV(10, opV18({ id: 'b1', tip: 'buzunar' })), categorie: 'operatie', camp: `${opC}.tip`, motiv: 'ADR 0069 §2: schema v10 n-are buzunarul', text: 'nu e un document v10 valid' },
  { nume: 'R51 un v10 cu `pasLateral` pe un profil', doc: docV(10, opV18({ pasLateral: 2 })), categorie: 'ciocnire', camp: `${opC}.pasLateral`, motiv: 'ADR 0069 §2', text: 'nu e un document v10 valid' },
  { nume: 'R52 un v7 cu un buzunar, fără pas (tot lanțul, ADR 0070)', doc: docV7({ id: 'b1', tip: 'buzunar' }), categorie: 'operatie', camp: `${opC}.tip`, motiv: 'ADR 0070, „Respinse”: verificarea apără tot lanțul' },
  { nume: 'R53 un v4 cu `pasLateral` pe o operație (ciocnirea la v10 → v11)', doc: docV4({ pasLateral: 2 }), categorie: 'ciocnire', camp: `${opC}.pasLateral`, motiv: 'ADR 0069 §2, ADR 0070: tot lanțul' },
  { nume: 'R54 un v11 cu coborârea', doc: docV(11, buzunar({ coborare: { fel: 'rampa', unghi: 3 } })), categorie: 'ciocnire', camp: `${opC}.coborare`, motiv: 'ADR 0076 §7', text: 'nu e un document v11 valid' },
  { nume: 'R55 un v10 cu coborârea (ciocnirea la v11 → v12)', doc: docV(10, opV18({ coborare: { fel: 'plonjare' } })), categorie: 'ciocnire', camp: `${opC}.coborare`, motiv: 'ADR 0076 §7, ADR 0070: tot lanțul' },
  { nume: 'R56 un v12 cu o găurire', doc: docV(12, gaurire(), cerc(3)), categorie: 'operatie', camp: `${opC}.tip`, motiv: 'ADR 0087 §6: schema v12 n-are găurirea', text: 'nu e un document v12 valid' },
  { nume: 'R57 un v12 cu ieșirea la al doilea pas', doc: docV(12, buzunar({ retragereCompleta: 2 })), categorie: 'ciocnire', camp: `${opC}.retragereCompleta`, motiv: 'ADR 0087 §6', text: 'nu e un document v12 valid' },
  { nume: 'R58 un v13 cu un V-carve', doc: docV(13, vcarve({ scula: plata(2, 6) })), categorie: 'operatie', camp: `${opC}.tip`, motiv: 'ADR 0090 §5: schema v13 n-are V-carve-ul', text: 'nu e un document v13 valid' },
  { nume: 'R59 un v13 cu forma frezei', doc: docV(13, opV18({ latura: 'pe-linie', scula: inV(2, 6, 90) }), linie()), categorie: 'ciocnire', camp: `${opC}.scula.forma`, motiv: 'ADR 0090 §5', text: 'nu e un document v13 valid' },
  { nume: 'R60 un v3 cu forma frezei (ciocnirea la v13 → v14)', doc: {
    schema: 3, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'element', id: 'e', forma: cerc(20), matrice: I() }, operatii: [
      { id: 'o', tip: 'profil', noduri: ['e'], scula: { ...plata(1, 6), forma: { tip: 'v', unghi: 90 } }, latura: 'interior', adancime: 5, pas: 5 },
    ] }],
    foi: [{ id: 'f1', stoc: { latime: 400, inaltime: 300, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 50, y: 50, rotire: 0 }] }],
  }, categorie: 'ciocnire', camp: `${opC}.scula.forma`, motiv: 'ADR 0090 §5, ADR 0070: tot lanțul' },
  { nume: 'R61 un v14 cu fundul plat', doc: docV(14, vcarve({ fundPlat: fund() })), categorie: 'ciocnire', camp: `${opC}.fundPlat`, motiv: 'ADR 0091 §1', text: 'nu e un document v14 valid' },
  { nume: 'R62 un v15 cu direcția', doc: docV(15, opV18({ latura: 'pe-linie', directie: 'invers' }), linie()), categorie: 'ciocnire', camp: `${opC}.directie`, motiv: 'ADR 0092 §1', text: 'nu e un document v15 valid' },
  { nume: 'R63 un v15 cu vârful frezei', doc: docV(15, vcarve({ scula: inV(2, 6, 90, 0.5) })), categorie: 'ciocnire', camp: `${opC}.scula.forma.varf`, motiv: 'ADR 0092 §1', text: 'nu e un document v15 valid' },
  { nume: 'R64 un v15 cu vârful frezei fundului plat', doc: docV(15, vcarve({ fundPlat: fund({ scula: inV(3, 3, 90, 0.5) }) })), categorie: 'ciocnire', camp: `${opC}.fundPlat.scula.forma.varf`, motiv: 'ADR 0092 §1', text: 'nu e un document v15 valid' },
  { nume: 'R65 un v16 cu frezele de rest', doc: docV(16, buzunar({ rest: [rest1(2, 3, 1)] })), categorie: 'ciocnire', camp: `${opC}.rest`, motiv: 'ADR 0093 §1' },
  { nume: 'R66 un v16 cu frezele de rest pe fundul plat', doc: docV(16, vcarve({ fundPlat: fund({ rest: [rest1(4, 2, 0.8)] }) })), categorie: 'ciocnire', camp: `${opC}.fundPlat.rest`, motiv: 'ADR 0093 §1' },
  { nume: 'R67 un v17 cu strategia', doc: docV(17, buzunar({ strategie: { fel: 'paralel', unghi: 0 } })), categorie: 'ciocnire', camp: `${opC}.strategie`, motiv: 'ADR 0094 §1' },
  { nume: 'R68 un v16 cu `rest: []` (orice valoare se ciocnește)', doc: docV(16, buzunar({ rest: [] })), categorie: 'ciocnire', camp: `${opC}.rest`, motiv: 'ADR 0093 §1: câmpul propriu, oricare ar fi valoarea' },
  // Câmpurile unei versiuni mai noi, judecate în versiunea lor (un v14 cu fundPlat greșit e oricum o ciocnire; aici, vN cu câmpul lui vN greșit).
  { nume: 'R70 un v11 cu pasul 0', doc: docV(11, buzunar({ pasLateral: 0 })), categorie: 'pas-lateral', camp: `${opC}.pasLateral`, motiv: 'ADR 0069 §1' },
  { nume: 'R71 un v12 cu rampa de 50°', doc: docV(12, buzunar({ coborare: { fel: 'rampa', unghi: 50 } })), categorie: 'coborare', camp: `${opC}.coborare`, motiv: 'ADR 0076 §1' },
  { nume: 'R72 un v13 cu ieșirea la 101', doc: docV(13, gaurire({ retragereCompleta: 101 }), cerc(3)), categorie: 'retragere', camp: `${opC}.retragereCompleta`, motiv: 'ADR 0087 §6' },
  { nume: 'R73 un v14 cu freza în V la 0,5°', doc: docV(14, vcarve({ scula: inV(2, 6, 0.5) })), categorie: 'scula', camp: `${opC}.scula.forma`, motiv: 'ADR 0090 §5' },
  { nume: 'R74 un v15 cu fundul plat fără pas', doc: docV(15, vcarve({ fundPlat: { scula: plata(3, 3) } })), categorie: 'fund-plat', camp: `${opC}.fundPlat`, motiv: 'ADR 0091 §1' },
  { nume: 'R75 un v16 cu direcția „desen”', doc: docV(16, opV18({ latura: 'pe-linie', directie: 'desen' }), linie()), categorie: 'directie', camp: `${opC}.directie`, motiv: 'ADR 0092 §1' },
  { nume: 'R76 un v17 cu nouă freze de rest', doc: docV(17, buzunar({ scula: plata(1, 20), rest: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => rest1(k + 1, 10 - k, 1)) })), categorie: 'rest', camp: `${opC}.rest`, motiv: 'ADR 0093 §1' },
];

// ---------------------------------------------------------------------------------------------------------------
// Documentul v19 (felia 5.9↑, ADR 0133 §1): rangul operației, pe hârtie. Cazurile v18 de mai sus rămân ale contractului
// v18; la ușa v19, un v18 valid urcă schimbând doar numărul, iar frontierele se judecă pe un document al versiunii curente.

/** Un document al cazurilor v18, adus la v19: doar numărul (ADR 0133 §1). */
const laV19 = (d: Liber): Liber => cuSchema(d, 19);

/** Documente v19 valide: ușa le primește neschimbate (v18-urile valide, renumerotate, și rangurile la frontieră). */
export const VALIDE_V19: readonly CazV18[] = [
  ...VALIDE_V18.map((c) => ({ nume: `${c.nume} (v19)`, doc: laV19(c.doc) })),
  { nume: 'B01 fără rang: ordinea automată (ADR 0133 §1)', doc: docV18(D, [opV18()], 19) },
  { nume: 'B02 rangul 0', doc: docV18(D, [opV18({ rang: 0 })], 19) },
  { nume: 'B03 rangul 100 000, plafonul operațiilor', doc: docV18(D, [opV18({ rang: 100_000 })], 19) },
  { nume: 'B04 două operații cu același rang (ordinea dintre ele e a lucrării)', doc: docV18(D, [opV18({ id: 'o1', rang: 2 }), opV18({ id: 'o2', rang: 2 })], 19) },
  { nume: 'B05 rangul pe un buzunar și pe un V-carve (pe orice fel)', doc: docV18(D, [buzunar({ rang: 4 }), vcarve({ rang: 1 })], 19) },
  { nume: 'B06 rangul pe o operație și lipsă pe alta (cea fără vine la capăt, în lucrare)', doc: docV18(D, [opV18({ id: 'o1', rang: 7 }), opV18({ id: 'o2' })], 19) },
];

/** Documentele vechi urcă la v19: ce dădea hârtia la v18, cu numărul 19; un v18 curat urcă doar cu numărul. */
export const MIGRARI_V19_HARTIE: ReadonlyArray<{ readonly nume: string; readonly vechi: Liber; readonly v19: Liber }> = [
  ...MIGRARI_V18_HARTIE.map((c) => ({ nume: c.nume, vechi: c.vechi, v19: laV19(c.v18) })),
  {
    nume: 'M19 un v18 cu strategia paralelă urcă la v19 doar cu numărul',
    vechi: docV18(D, [buzunar({ strategie: { fel: 'paralel', unghi: 30 } })]),
    v19: docV18(D, [buzunar({ strategie: { fel: 'paralel', unghi: 30 } })], 19),
  },
];

/** `rang` în afara operației e un câmp necunoscut oarecare: primit și păstrat (ALEGEREA părții v11–v18, ciocnirea doar pe operație). */
export const NECIOCNIRI_V19: ReadonlyArray<CazV18 & { readonly v19: Liber }> = [
  ...NECIOCNIRI_V18.map((c) => ({ nume: c.nume, doc: c.doc, v19: laV19(c.v18) })),
  (() => {
    const d = docV18(D, [opV18({ scula: { ...plata(1, 6), rang: 3 } })]);
    return { nume: 'N19a un v18 cu `rang` pe sculă', doc: d, v19: laV19(d) };
  })(),
  (() => {
    const d = docV18(D, [opV18()]);
    ((d['piese'] as Liber[])[0] as Liber)['rang'] = 1;
    return { nume: 'N19b un v18 cu `rang` pe piesă', doc: d, v19: laV19(d) };
  })(),
];

/** Frontierele v19: cele v18, plus rangul (ADR 0133 §1: un întreg în [0, 100 000]; lipsa = ordinea automată). */
export const FRONTIERE_V19: readonly FrontieraV18[] = [
  ...FRONTIERE_V18,
  {
    cale: 'rang', operatie: opV18(), forma: D, categorie: 'rang', adr: 'ADR 0133 §1: un întreg în [0, 100 000]; lipsa = ordinea automată',
    valori: [[LIPSA, true], [0, true], [-0, true], [1, true], [99_999, true], [100_000, true], [-1, false], [100_001, false], [1.5, false],
      [100_000.5, false], ['1', false], [[1], false], [{}, false], ...NUMERE_RELE],
  },
];

/** Refuzurile v19: cele v18 (versiunea mai nouă e acum v20), plus rangul greșit și ciocnirea lui. */
export const REFUZATE_V19: readonly RefuzV18[] = [
  ...REFUZATE_V18.filter((r) => !r.nume.startsWith('R01 ')),
  { nume: 'R01 scris de o versiune mai nouă (v20)', doc: docV(20, buzunar()), categorie: 'schema', camp: 'schema', motiv: 'ADR 0070 §2: o versiune mai veche refuză una mai nouă', text: 'versiune mai nouă' },
  { nume: 'R80 un v18 cu rangul', doc: docV(18, opV18({ rang: 0 })), categorie: 'ciocnire', camp: `${opC}.rang`, motiv: 'ADR 0133 §1', text: 'nu e un document v18 valid' },
  { nume: 'R81 un v18 cu `rang: null` (orice valoare se ciocnește)', doc: docV(18, opV18({ rang: null })), categorie: 'ciocnire', camp: `${opC}.rang`, motiv: 'ADR 0133 §1: câmpul propriu, oricare ar fi valoarea' },
  { nume: 'R82 un v17 cu rangul (trece de v17 → v18, se ciocnește la v18 → v19)', doc: docV(17, opV18({ rang: 1 })), categorie: 'ciocnire', camp: `${opC}.rang`, motiv: 'ADR 0133 §1, ADR 0070: tot lanțul', text: 'nu e un document v18 valid' },
  { nume: 'R83 un v19 cu rangul −1', doc: docV(19, opV18({ rang: -1 })), categorie: 'rang', camp: `${opC}.rang`, motiv: 'ADR 0133 §1' },
  { nume: 'R84 un v19 cu rangul 2,5', doc: docV(19, opV18({ rang: 2.5 })), categorie: 'rang', camp: `${opC}.rang`, motiv: 'ADR 0133 §1' },
  { nume: 'R85 un v19 cu rangul peste plafon', doc: docV(19, opV18({ rang: 100_001 })), categorie: 'rang', camp: `${opC}.rang`, motiv: 'ADR 0133 §1' },
];

// ---------------------------------------------------------------------------------------------------------------
// Documentul v20 (felia 12.1↑, ADR 0170 §1, „Contractul ușii”): incrustația, pe hârtie. Cazurile v19 de mai sus rămân ale
// contractului v19; la ușa v20, un v19 valid urcă schimbând doar numărul, iar frontierele se judecă pe un document al
// versiunii curente.

/** Un document al cazurilor v19, adus la v20: doar numărul (ADR 0170 §1). */
const laV20 = (d: Liber): Liber => cuSchema(d, 20);
/** Incrustația din ADR 0170 §1, cu valorile implicite ale răspunsurilor (jocul 0,5, fierăstrăul 2, marginea 5, fața). */
const inc = (v: Liber = {}): Liber => ({ fel: 'v', joc: 0.5, fierastrau: 2, margine: 5, jurDop: 'fata', ...v });
/** Incrustația fără un câmp cerut. */
const incFara = (camp: string): Liber => {
  const i = inc();
  delete i[camp];
  return i;
};

/** Documente v20 valide: ușa le primește neschimbate (v19-urile valide, renumerotate, și incrustațiile la frontieră). */
export const VALIDE_V20: readonly CazV18[] = [
  ...VALIDE_V19.map((c) => ({ nume: `${c.nume} (v20)`, doc: laV20(c.doc) })),
  { nume: 'I01 fără incrustație: un V-carve obișnuit (ADR 0170 §1)', doc: docV18(D, [vcarve()], 20) },
  { nume: 'I02 incrustația pe un V-carve, cu fața coborâtă', doc: docV18(D, [vcarve({ incrustatie: inc() })], 20) },
  { nume: 'I03 cu banda îngustă (ușa o primește; lucrarea o aduce în 12.1↑c)', doc: docV18(D, [vcarve({ incrustatie: inc({ jurDop: 'banda' }) })], 20) },
  { nume: 'I04 marginea 0, jocul și fierăstrăul la plafon', doc: docV18(D, [vcarve({ incrustatie: inc({ joc: 1_000, fierastrau: 1_000, margine: 0 }) })], 20) },
  { nume: 'I05 pe un buzunar (ușa, pe orice fel; refuzul e al lucrării)', doc: docV18(D, [buzunar({ incrustatie: inc() })], 20) },
  { nume: 'I06 cu un câmp necunoscut în incrustație (păstrat)', doc: docV18(D, [vcarve({ incrustatie: inc({ alt: { x: 1 } }) })], 20) },
  { nume: 'I07 cu rangul și incrustația pe aceeași operație', doc: docV18(D, [vcarve({ rang: 2, incrustatie: inc({ joc: 0.1, fierastrau: 0.1 }) })], 20) },
];

/** Documentele vechi urcă la v20: ce dădea hârtia la v19, cu numărul 20; un v19 curat urcă doar cu numărul. */
export const MIGRARI_V20_HARTIE: ReadonlyArray<{ readonly nume: string; readonly vechi: Liber; readonly v20: Liber }> = [
  ...MIGRARI_V19_HARTIE.map((c) => ({ nume: c.nume, vechi: c.vechi, v20: laV20(c.v19) })),
  {
    nume: 'M20 un v19 cu rangul și un V-carve urcă la v20 doar cu numărul',
    vechi: docV18(D, [vcarve({ rang: 3 })], 19),
    v20: docV18(D, [vcarve({ rang: 3 })], 20),
  },
];

/** `incrustatie` în afara operației e un câmp necunoscut oarecare: primit și păstrat (ciocnirea, doar pe operație). */
export const NECIOCNIRI_V20: ReadonlyArray<CazV18 & { readonly v20: Liber }> = [
  ...NECIOCNIRI_V19.map((c) => ({ nume: c.nume, doc: c.doc, v20: laV20(c.v19) })),
  (() => {
    const d = docV18(D, [opV18({ scula: { ...plata(1, 6), incrustatie: 1 } })], 19);
    return { nume: 'N20a un v19 cu `incrustatie` pe sculă', doc: d, v20: laV20(d) };
  })(),
  (() => {
    const d = docV18(D, [opV18()], 19);
    ((d['piese'] as Liber[])[0] as Liber)['incrustatie'] = inc();
    return { nume: 'N20b un v19 cu `incrustatie` pe piesă', doc: d, v20: laV20(d) };
  })(),
  (() => {
    const d = docV18(D, [vcarve({ fundPlat: { scula: plata(3, 3), pasLateral: 1.2, incrustatie: inc() } })], 19);
    return { nume: 'N20c un v19 cu `incrustatie` pe fundul plat', doc: d, v20: laV20(d) };
  })(),
];

/** Frontierele v20: cele v19, plus incrustația, câmp cu câmp (ADR 0170 §1, „Contractul ușii”). */
export const FRONTIERE_V20: readonly FrontieraV18[] = [
  ...FRONTIERE_V19,
  {
    cale: 'incrustatie', operatie: vcarve(), forma: D, categorie: 'incrustatie', adr: 'ADR 0170 §1: un obiect; lipsa = un V-carve obișnuit',
    valori: [[LIPSA, true], [inc(), true], [null, false], [1, false], ['v', false], [[], false], [true, false]],
  },
  {
    cale: 'incrustatie.fel', operatie: vcarve({ incrustatie: inc() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0170 §1: v',
    valori: [['v', true], ['V', false], ['drept', false], ['', false], [LIPSA, false], [1, false], [null, false]],
  },
  {
    cale: 'incrustatie.joc', operatie: vcarve({ incrustatie: inc() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0170 §1: finit în (0, 1 000]',
    valori: [[0.5, true], [0.001, true], [1_000, true], [0, false], [-0, false], [-0.5, false], [1_000.001, false], ['0.5', false], [LIPSA, false], ...NUMERE_RELE],
  },
  {
    cale: 'incrustatie.fierastrau', operatie: vcarve({ incrustatie: inc() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0170 §1: finit în (0, 1 000]',
    valori: [[2, true], [0.001, true], [1_000, true], [0, false], [-2, false], [1_000.5, false], ['2', false], [LIPSA, false], ...NUMERE_RELE],
  },
  {
    cale: 'incrustatie.margine', operatie: vcarve({ incrustatie: inc() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0170 §1: finită în [0, 10 000]',
    valori: [[5, true], [0, true], [-0, true], [10_000, true], [-0.001, false], [10_000.001, false], ['5', false], [LIPSA, false], ...NUMERE_RELE],
  },
  {
    cale: 'incrustatie.jurDop', operatie: vcarve({ incrustatie: inc() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0170 §1: fata sau banda',
    valori: [['fata', true], ['banda', true], ['Fata', false], ['față', false], ['', false], [LIPSA, false], [null, false], [1, false]],
  },
];

/** Refuzurile v20: cele v19 (versiunea mai nouă e acum v21), plus incrustația greșită și ciocnirea ei. */
export const REFUZATE_V20: readonly RefuzV18[] = [
  ...REFUZATE_V19.filter((r) => !r.nume.startsWith('R01 ')),
  { nume: 'R01 scris de o versiune mai nouă (v21)', doc: docV(21, buzunar()), categorie: 'schema', camp: 'schema', motiv: 'ADR 0070 §2: o versiune mai veche refuză una mai nouă', text: 'versiune mai nouă' },
  { nume: 'R90 un v19 cu incrustația', doc: docV(19, vcarve({ incrustatie: inc() })), categorie: 'ciocnire', camp: `${opC}.incrustatie`, motiv: 'ADR 0170 §1', text: 'nu e un document v19 valid' },
  { nume: 'R91 un v19 cu `incrustatie: null` (orice valoare se ciocnește)', doc: docV(19, vcarve({ incrustatie: null })), categorie: 'ciocnire', camp: `${opC}.incrustatie`, motiv: 'ADR 0170 §1: câmpul propriu, oricare ar fi valoarea' },
  { nume: 'R92 un v18 cu incrustația (trece de v18 → v19, se ciocnește la v19 → v20)', doc: docV(18, vcarve({ incrustatie: inc() })), categorie: 'ciocnire', camp: `${opC}.incrustatie`, motiv: 'ADR 0170 §1, ADR 0070: tot lanțul', text: 'nu e un document v19 valid' },
  { nume: 'R93 un v20 cu jocul 0', doc: docV(20, vcarve({ incrustatie: inc({ joc: 0 }) })), categorie: 'incrustatie', camp: `${opC}.incrustatie`, motiv: 'ADR 0170 §1' },
  { nume: 'R94 un v20 cu felul „drept” (pereții drepți au felia și ADR-ul lor)', doc: docV(20, vcarve({ incrustatie: inc({ fel: 'drept' }) })), categorie: 'incrustatie', camp: `${opC}.incrustatie`, motiv: 'ADR 0170 §1' },
  { nume: 'R95 un v20 cu lemnul din jurul dopului „cerc”', doc: docV(20, vcarve({ incrustatie: inc({ jurDop: 'cerc' }) })), categorie: 'incrustatie', camp: `${opC}.incrustatie`, motiv: 'ADR 0170 §1' },
  { nume: 'R96 un v20 cu marginea negativă', doc: docV(20, vcarve({ incrustatie: inc({ margine: -1 }) })), categorie: 'incrustatie', camp: `${opC}.incrustatie`, motiv: 'ADR 0170 §1' },
  { nume: 'R97 un v20 cu incrustația fără fierăstrău', doc: docV(20, vcarve({ incrustatie: incFara('fierastrau') })), categorie: 'incrustatie', camp: `${opC}.incrustatie`, motiv: 'ADR 0170 §1: toate cinci cerute' },
];

// Documentul v21 (felia 12.1↑b, ADR 0171 §1): incrustația cu pereți drepți, pe hârtie. Cazurile v20 de mai sus rămân ale
// contractului v20; la ușa v21, un v20 valid urcă schimbând doar numărul, iar frontierele se judecă pe un document al
// versiunii curente.

/** Un document al cazurilor v20, adus la v21: doar numărul (ADR 0171 §1). */
const laV21 = (d: Liber): Liber => cuSchema(d, 21);
/** Incrustația cu pereți drepți din ADR 0171 §1, cu valorile implicite (jocul lateral 0,1, ridicat, pe fund, 0,5 și 2, marginea 5). */
const incD = (v: Liber = {}): Liber => ({ fel: 'drept', jocLateral: 0.1, dop: 'ridicat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 5, ...v });
/** Incrustația cu pereți drepți fără un câmp cerut. */
const incDFara = (camp: string): Liber => {
  const i = incD();
  delete i[camp];
  return i;
};

/** Documente v21 valide: ușa le primește neschimbate (v20-urile valide, renumerotate, și incrustațiile drepte la frontieră). */
export const VALIDE_V21: readonly CazV18[] = [
  ...VALIDE_V20.map((c) => ({ nume: `${c.nume} (v21)`, doc: laV21(c.doc) })),
  { nume: 'J01 incrustația cu pereți drepți pe un buzunar (ADR 0171 §1)', doc: docV18(D, [buzunar({ incrustatie: incD() })], 21) },
  { nume: 'J02 dopul decupat', doc: docV18(D, [buzunar({ incrustatie: incD({ dop: 'decupat' }) })], 21) },
  { nume: 'J03 dopul ridicat, sprijinit pe față', doc: docV18(D, [buzunar({ incrustatie: incD({ sprijin: 'fata' }) })], 21) },
  { nume: 'J04 cu frezele dopului ale lui (o listă ca frezele de rest)', doc: docV18(D, [buzunar({ incrustatie: incD({ frezeDop: [{ scula: plata(5, 2), pasLateral: 0.8 }] }) })], 21) },
  { nume: 'J05 jocul lateral și jocurile la plafon, marginea 0', doc: docV18(D, [buzunar({ incrustatie: incD({ jocLateral: 1_000, joc: 1_000, fierastrau: 1_000, margine: 0 }) })], 21) },
  { nume: 'J06 pe un V-carve (ușa, pe orice fel; refuzul e al lucrării)', doc: docV18(D, [vcarve({ incrustatie: incD() })], 21) },
  { nume: 'J07 cu un câmp necunoscut (și `jurDop`, necunoscut la pereții drepți)', doc: docV18(D, [buzunar({ incrustatie: incD({ jurDop: 'fata', alt: { x: 1 } }) })], 21) },
];

/** Documentele vechi urcă la v21: ce dădea hârtia la v20, cu numărul 21; un v20 curat urcă doar cu numărul. */
export const MIGRARI_V21_HARTIE: ReadonlyArray<{ readonly nume: string; readonly vechi: Liber; readonly v21: Liber }> = [
  ...MIGRARI_V20_HARTIE.map((c) => ({ nume: c.nume, vechi: c.vechi, v21: laV21(c.v20) })),
  {
    nume: 'M21 un v20 cu incrustația în V urcă la v21 doar cu numărul',
    vechi: docV18(D, [vcarve({ incrustatie: inc() })], 20),
    v21: docV18(D, [vcarve({ incrustatie: inc() })], 21),
  },
];

/** `jocLateral`, `dop`, `sprijin`, `frezeDop` în afara incrustației sunt câmpuri necunoscute oarecare: primite și păstrate. */
export const NECIOCNIRI_V21: ReadonlyArray<CazV18 & { readonly v21: Liber }> = [
  ...NECIOCNIRI_V20.map((c) => ({ nume: c.nume, doc: c.doc, v21: laV21(c.v20) })),
  (() => {
    const d = docV18(D, [opV18({ jocLateral: 0.1, sprijin: 'fund' })], 20);
    return { nume: 'N21a un v20 cu `jocLateral` și `sprijin` pe operație, nu în incrustație', doc: d, v21: laV21(d) };
  })(),
  (() => {
    const d = docV18(D, [vcarve({ fundPlat: { scula: plata(3, 3), pasLateral: 1.2, dop: 'ridicat' } })], 20);
    return { nume: 'N21b un v20 cu `dop` pe fundul plat', doc: d, v21: laV21(d) };
  })(),
];

/** Frontierele v21: cele v20, plus incrustația cu pereți drepți, câmp cu câmp (ADR 0171 §1). */
export const FRONTIERE_V21: readonly FrontieraV18[] = [
  // Felul celălalt (v pe o incrustație dreaptă, drept pe una în V) cere câmpurile lui: refuzul numește câmpurile lipsă, nu felul,
  // deci stă în REFUZATE_V21 (RA8, RA9), nu printre frontierele unui singur câmp.
  ...FRONTIERE_V20.filter((f) => f.cale !== 'incrustatie.fel'),
  {
    cale: 'incrustatie.fel', operatie: vcarve({ incrustatie: inc() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0170 §1, ADR 0171 §1: v',
    valori: [['v', true], ['V', false], ['', false], [LIPSA, false], [1, false], [null, false]],
  },
  {
    cale: 'incrustatie.fel', operatie: buzunar({ incrustatie: incD() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0171 §1: drept (cu câmpurile ei)',
    valori: [['drept', true], ['Drept', false], ['', false], [LIPSA, false], [null, false]],
  },
  {
    cale: 'incrustatie.jocLateral', operatie: buzunar({ incrustatie: incD() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0171 §1: finit în (0, 1 000]',
    valori: [[0.1, true], [0.001, true], [1_000, true], [0, false], [-0.1, false], [1_000.001, false], ['0.1', false], [LIPSA, false], ...NUMERE_RELE],
  },
  {
    cale: 'incrustatie.dop', operatie: buzunar({ incrustatie: incD() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0171 §1: ridicat sau decupat',
    valori: [['ridicat', true], ['decupat', true], ['Ridicat', false], ['lipit', false], ['', false], [LIPSA, false], [null, false], [1, false]],
  },
  {
    cale: 'incrustatie.sprijin', operatie: buzunar({ incrustatie: incD() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0171 §1: fund sau fata',
    valori: [['fund', true], ['fata', true], ['față', false], ['Fund', false], [LIPSA, false], [null, false]],
  },
  {
    cale: 'incrustatie.joc', operatie: buzunar({ incrustatie: incD() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0171 §1: ca la V, finit în (0, 1 000]',
    valori: [[0.5, true], [1_000, true], [0, false], [-0.5, false], [LIPSA, false], ...NUMERE_RELE],
  },
  {
    cale: 'incrustatie.fierastrau', operatie: buzunar({ incrustatie: incD() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0171 §1: ca la V, finit în (0, 1 000]',
    valori: [[2, true], [0.001, true], [0, false], [1_000.5, false], [LIPSA, false], ...NUMERE_RELE],
  },
  {
    cale: 'incrustatie.margine', operatie: buzunar({ incrustatie: incD() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0171 §1: ca la V, finită în [0, 10 000]',
    valori: [[0, true], [10_000, true], [-0.001, false], [10_000.001, false], [LIPSA, false], ...NUMERE_RELE],
  },
  {
    cale: 'incrustatie.frezeDop', operatie: buzunar({ incrustatie: incD() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0171 §1: opțional, o listă ca frezele de rest',
    valori: [[LIPSA, true], [[{ scula: plata(5, 2), pasLateral: 0.8 }], true], [[], false], [null, false], [1, false], [[{ scula: plata(5, 2) }], false]],
  },
];

/** Refuzurile v21: cele v20 (versiunea mai nouă e acum v22), plus incrustația dreaptă greșită și ciocnirile ei. */
export const REFUZATE_V21: readonly RefuzV18[] = [
  ...REFUZATE_V20.filter((r) => !r.nume.startsWith('R01 ')),
  { nume: 'R01 scris de o versiune mai nouă (v22)', doc: docV(22, buzunar()), categorie: 'schema', camp: 'schema', motiv: 'ADR 0070 §2: o versiune mai veche refuză una mai nouă', text: 'versiune mai nouă' },
  { nume: 'RA0 un v20 cu `jocLateral` în incrustație', doc: docV(20, vcarve({ incrustatie: inc({ jocLateral: 0.1 }) })), categorie: 'ciocnire', camp: `${opC}.incrustatie.jocLateral`, motiv: 'ADR 0171 §1', text: 'nu e un document v20 valid' },
  { nume: 'RA1 un v20 cu `dop` în incrustație', doc: docV(20, vcarve({ incrustatie: inc({ dop: 'ridicat' }) })), categorie: 'ciocnire', camp: `${opC}.incrustatie.dop`, motiv: 'ADR 0171 §1', text: 'nu e un document v20 valid' },
  { nume: 'RA2 un v20 cu `sprijin` în incrustație', doc: docV(20, vcarve({ incrustatie: inc({ sprijin: 'fund' }) })), categorie: 'ciocnire', camp: `${opC}.incrustatie.sprijin`, motiv: 'ADR 0171 §1', text: 'nu e un document v20 valid' },
  { nume: 'RA3 un v20 cu `frezeDop` în incrustație', doc: docV(20, vcarve({ incrustatie: inc({ frezeDop: [] }) })), categorie: 'ciocnire', camp: `${opC}.incrustatie.frezeDop`, motiv: 'ADR 0171 §1: câmpul propriu, oricare ar fi valoarea', text: 'nu e un document v20 valid' },
  { nume: 'RA4 un v21 cu jocul lateral 0', doc: docV(21, buzunar({ incrustatie: incD({ jocLateral: 0 }) })), categorie: 'incrustatie', camp: `${opC}.incrustatie`, motiv: 'ADR 0171 §1' },
  { nume: 'RA5 un v21 cu dopul „lipit”', doc: docV(21, buzunar({ incrustatie: incD({ dop: 'lipit' }) })), categorie: 'incrustatie', camp: `${opC}.incrustatie`, motiv: 'ADR 0171 §1' },
  { nume: 'RA6 un v21 fără sprijin', doc: docV(21, buzunar({ incrustatie: incDFara('sprijin') })), categorie: 'incrustatie', camp: `${opC}.incrustatie`, motiv: 'ADR 0171 §1: toate cerute' },
  { nume: 'RA7 un v21 cu frezele dopului goale', doc: docV(21, buzunar({ incrustatie: incD({ frezeDop: [] }) })), categorie: 'incrustatie', camp: `${opC}.incrustatie`, motiv: 'ADR 0171 §1: o listă de 1–8' },
  { nume: 'RA8 un v21 cu o incrustație în V trecută pe „drept”, fără câmpurile ei', doc: docV(21, vcarve({ incrustatie: inc({ fel: 'drept' }) })), categorie: 'incrustatie', camp: `${opC}.incrustatie.jocLateral`, motiv: 'ADR 0171 §1: felul drept cere jocul lateral, dopul și sprijinul' },
  { nume: 'RA9 un v21 cu o incrustație dreaptă trecută pe „v”, fără lemnul din jurul dopului', doc: docV(21, buzunar({ incrustatie: incD({ fel: 'v' }) })), categorie: 'incrustatie', camp: `${opC}.incrustatie.jurDop`, motiv: 'ADR 0170 §1: felul v cere jurDop' },
];

// Documentul v22 (felia 12.1↑c, ADR 0172): banda dopului în V, pe hârtie. Cazurile v21 de mai sus rămân ale contractului v21;
// la ușa v22, un v21 valid urcă schimbând doar numărul, iar frontierele se judecă pe un document al versiunii curente.

/** Un document al cazurilor v21, adus la v22: doar numărul (ADR 0172). */
const laV22 = (d: Liber): Liber => cuSchema(d, 22);
/** Banda din ADR 0172, cu valorile implicite (decuparea, placa de 5,5 mm, 4 punți de 4 × 1 mm). */
const banda = (v: Liber = {}): Liber => ({ decupare: true, grosimePlaca: 5.5, punti: { numar: 4, latime: 4, grosime: 1 }, ...v });
/** Banda fără un câmp cerut. */
const bandaFara = (camp: string): Liber => {
  const b = banda();
  delete b[camp];
  return b;
};
/** Incrustația în V cu banda (ADR 0172). */
const incB = (b: Liber = banda()): Liber => inc({ jurDop: 'banda', banda: b });

/** Documente v22 valide: ușa le primește neschimbate (v21-urile valide, renumerotate, și banda la frontieră). */
export const VALIDE_V22: readonly CazV18[] = [
  ...VALIDE_V21.map((c) => ({ nume: `${c.nume} (v22)`, doc: laV22(c.doc) })),
  { nume: 'K01 banda cu valorile implicite (ADR 0172)', doc: docV18(D, [vcarve({ incrustatie: incB() })], 22) },
  { nume: 'K02 banda lată, fără decupare', doc: docV18(D, [vcarve({ incrustatie: incB(banda({ latime: 9, decupare: false })) })], 22) },
  { nume: 'K03 banda cu freza decupării', doc: docV18(D, [vcarve({ incrustatie: incB(banda({ freza: plata(5, 3) })) })], 22) },
  { nume: 'K04 banda și punțile la plafon', doc: docV18(D, [vcarve({ incrustatie: incB(banda({ latime: 10_000, grosimePlaca: 1_000, punti: { numar: 100, latime: 10_000, grosime: 5 } })) })], 22) },
  { nume: 'K05 banda cu un câmp necunoscut, și în punți', doc: docV18(D, [vcarve({ incrustatie: incB(banda({ nota: 'x', punti: { numar: 4, latime: 4, grosime: 1, alt: 1 } })) })], 22) },
  { nume: 'K06 banda pe fața coborâtă (ușa o primește; lucrarea o lasă)', doc: docV18(D, [vcarve({ incrustatie: inc({ jurDop: 'fata', banda: banda() }) })], 22) },
];

/** Documentele vechi urcă la v22: ce dădea hârtia la v21, cu numărul 22; un v21 curat urcă doar cu numărul. */
export const MIGRARI_V22_HARTIE: ReadonlyArray<{ readonly nume: string; readonly vechi: Liber; readonly v22: Liber }> = [
  ...MIGRARI_V21_HARTIE.map((c) => ({ nume: c.nume, vechi: c.vechi, v22: laV22(c.v21) })),
  {
    nume: 'M22 un v21 cu incrustația în V, pe bandă, urcă la v22 doar cu numărul',
    vechi: docV18(D, [vcarve({ incrustatie: inc({ jurDop: 'banda' }) })], 21),
    v22: docV18(D, [vcarve({ incrustatie: inc({ jurDop: 'banda' }) })], 22),
  },
];

/** `banda` în afara incrustației e un câmp necunoscut oarecare: primit și păstrat. */
export const NECIOCNIRI_V22: ReadonlyArray<CazV18 & { readonly v22: Liber }> = [
  ...NECIOCNIRI_V21.map((c) => ({ nume: c.nume, doc: c.doc, v22: laV22(c.v21) })),
  (() => {
    const d = docV18(D, [vcarve({ banda: 1, incrustatie: inc() })], 21);
    return { nume: 'N22a un v21 cu `banda` pe operație, nu în incrustație', doc: d, v22: laV22(d) };
  })(),
  (() => {
    const d = docV18(D, [vcarve({ fundPlat: { scula: plata(3, 3), pasLateral: 1.2, banda: 2 } })], 21);
    return { nume: 'N22b un v21 cu `banda` pe fundul plat', doc: d, v22: laV22(d) };
  })(),
];

/** Frontierele v22: cele v21, plus banda, câmp cu câmp (ADR 0172). */
export const FRONTIERE_V22: readonly FrontieraV18[] = [
  ...FRONTIERE_V21,
  {
    cale: 'incrustatie.banda.decupare', operatie: vcarve({ incrustatie: incB() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0172: true / false',
    valori: [[true, true], [false, true], ['da', false], [1, false], [null, false], [LIPSA, false]],
  },
  {
    cale: 'incrustatie.banda.grosimePlaca', operatie: vcarve({ incrustatie: incB() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0172: finită în (0, 1 000]',
    valori: [[5.5, true], [0.001, true], [1_000, true], [0, false], [-1, false], [1_000.001, false], ['5.5', false], [LIPSA, false], ...NUMERE_RELE],
  },
  {
    cale: 'incrustatie.banda.latime', operatie: vcarve({ incrustatie: incB() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0172: opțională, finită în (0, 10 000]',
    valori: [[LIPSA, true], [6.5, true], [10_000, true], [0, false], [-1, false], [10_000.001, false], ['6.5', false], ...NUMERE_RELE],
  },
  {
    cale: 'incrustatie.banda.punti.numar', operatie: vcarve({ incrustatie: incB() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0172: ca urechile, un întreg 1–100',
    valori: [[4, true], [1, true], [100, true], [0, false], [101, false], [2.5, false], [LIPSA, false]],
  },
  {
    cale: 'incrustatie.banda.punti.grosime', operatie: vcarve({ incrustatie: incB() }), forma: D, categorie: 'incrustatie', adr: 'ADR 0172: ca urechile, pozitivă',
    valori: [[1, true], [0.5, true], [0, false], [-1, false], [LIPSA, false]],
  },
  {
    cale: 'incrustatie.banda.freza.diametru', operatie: vcarve({ incrustatie: incB(banda({ freza: plata(5, 3) })) }), forma: D, categorie: 'incrustatie', adr: 'ADR 0172: ca scula operației',
    valori: [[3, true], [0.1, true], [0, false], [-3, false], [LIPSA, false]],
  },
];

/** Refuzurile v22: cele v21 (versiunea mai nouă e acum v23), plus banda greșită și ciocnirea ei. */
export const REFUZATE_V22: readonly RefuzV18[] = [
  ...REFUZATE_V21.filter((r) => !r.nume.startsWith('R01 ')),
  { nume: 'R01 scris de o versiune mai nouă (v23)', doc: docV(23, buzunar()), categorie: 'schema', camp: 'schema', motiv: 'ADR 0070 §2: o versiune mai veche refuză una mai nouă', text: 'versiune mai nouă' },
  { nume: 'RB0 un v21 cu `banda` în incrustație', doc: docV(21, vcarve({ incrustatie: incB() })), categorie: 'ciocnire', camp: `${opC}.incrustatie.banda`, motiv: 'ADR 0172: câmpul propriu', text: 'nu e un document v21 valid' },
  { nume: 'RB1 un v22 cu banda fără placă', doc: docV(22, vcarve({ incrustatie: incB(bandaFara('grosimePlaca')) })), categorie: 'incrustatie', camp: `${opC}.incrustatie.banda.grosimePlaca`, motiv: 'ADR 0172: cerută' },
  { nume: 'RB2 un v22 cu punțile null', doc: docV(22, vcarve({ incrustatie: incB(banda({ punti: null })) })), categorie: 'incrustatie', camp: `${opC}.incrustatie.banda.punti`, motiv: 'ADR 0172: un obiect, ca urechile' },
  { nume: 'RB3 un v22 cu banda ca text', doc: docV(22, vcarve({ incrustatie: inc({ jurDop: 'banda', banda: 'da' }) })), categorie: 'incrustatie', camp: `${opC}.incrustatie.banda`, motiv: 'ADR 0172: un obiect' },
  { nume: 'RB4 un v22 cu banda fără decupare', doc: docV(22, vcarve({ incrustatie: incB(bandaFara('decupare')) })), categorie: 'incrustatie', camp: `${opC}.incrustatie.banda.decupare`, motiv: 'ADR 0172: cerută' },
];

// ---------------------------------------------------------------------------------------------------------------
// Documentul v23 (felia 11.4↑, ADR 0210 §4 și §7): literele plăcuțelor din CSV, pe hârtie.

/**
 * CAZURILE documentului v23 (sesiune independentă, scrise doar din ADR 0210 §4, §7 și răspunsurile owner-ului 4–5, ADR 0105,
 * 0138, 0142, 0024, 0070 și 0121), pentru partea v23 a oracolului (capătul lui `document.ts`) și pentru
 * `test/unit/document.v23.oracol.test.ts`. Fiecare verdict e scris aici, pe hârtie; doar amprenta blocurilor (ADR 0105 §4) o
 * calculează oracolul (`amprentaContururiO`), fiindcă e o funcție a literelor șablonului, nu o regulă:
 * - `VALIDE_V23`: documente v23 primite NESCHIMBATE: v22-urile valide renumerotate și plăcuțele (`P..`);
 * - `MIGRARI_V23_HARTIE`: documente vechi și v23-ul care iese din ușă (doar numărul, de la v10);
 * - `NECIOCNIRI_V23`: `texte` în afara instanței (pe piesă, nod, foaie, operație, sus, ca valoare în `campuri`): un câmp
 *   necunoscut, primit și păstrat;
 * - `FRONTIERE_V23`: câmpurile literelor plăcuței (și ale blocului șablonului), cu valori de o parte și de alta a marginilor,
 *   fiecare cu verdictul de pe hârtie;
 * - `REFUZATE_V23`: un singur defect fiecare, cu categoria oracolului și calea câmpului (ca în motivul ușii);
 * - `AMBIGUE_V23` și `plafoaneV23().ambigue`: ce nu hotărăște textul (punctele DESCHISE din antetul părții v23 a
 *   oracolului), cu verdictul ALEGERII; aplicația doar se raportează;
 * - `plafoaneV23()` (la cerere, documente mari): plafoanele de ansamblu cu literele plăcuțelor, la margine și peste ea;
 * - `CORPUS_V23` și `OTRAVURI_V23`: documente generate cu plăcuțe (PRNG-ul `aleator`), valide și stricate câte un fel.
 */

/** Un document al cazurilor v22, adus la v23: doar numărul (ADR 0210 §7: „Migrarea schimbă doar numărul”). */
const laV23 = (d: Liber): Liber => cuSchema(d, 23);

/** Conturul închis al unei litere (linii și o cubică), cu colțul în (x0, y0). */
const conturLitera = (x0: number, y0: number, l: number, h: number): Liber => ({
  tip: 'cale', inchis: true, varfuri: [
    { p: { x: x0, y: y0 }, s: { tip: 'L' } },
    { p: { x: x0 + l, y: y0 }, s: { tip: 'C', c1: { x: x0 + l + 1, y: y0 + 2 }, c2: { x: x0 + l + 1, y: y0 + h - 2 } } },
    { p: { x: x0 + l, y: y0 + h }, s: { tip: 'L' } },
    { p: { x: x0, y: y0 + h }, s: { tip: 'L' } },
  ],
});
/** O literă cum o face textul (ADR 0105 §4: un grup pe literă): conturul `<id>c` și, dacă are, golul `<id>g`. */
const litera = (id: string, x: number, gol = false): Liber => ({
  tip: 'grup', id, matrice: T(x, 0), copii: [
    { tip: 'element', id: `${id}c`, forma: conturLitera(0, 0, 4, 7), matrice: I() },
    ...(gol ? [{ tip: 'element', id: `${id}g`, forma: conturLitera(1, 2, 2, 3), matrice: I() }] : []),
  ],
});
/** O literă cu un arc (cum are aldinul, ADR 0123): conturul `<id>c`. */
const literaArc = (id: string, x: number): Liber => ({
  tip: 'grup', id, matrice: T(x, 0), copii: [{
    tip: 'element', id: `${id}c`, matrice: I(),
    forma: { tip: 'cale', inchis: true, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'A', bulge: 0.5 } }, { p: { x: 4, y: 0 }, s: { tip: 'L' } }, { p: { x: 4, y: 7 }, s: { tip: 'L' } }] },
  }],
});
/** O literă pe `niveluri` niveluri (grupuri unul în altul, conturul `<p>0` jos, grupul `<p><niveluri − 1>` sus). */
const literaAdanca = (p: string, niveluri: number): Liber => {
  let n: Liber = { tip: 'element', id: `${p}0`, forma: conturLitera(0, 0, 4, 7), matrice: I() };
  for (let k = 1; k < niveluri; k++) n = { tip: 'grup', id: `${p}${k}`, matrice: I(), copii: [n] };
  return n;
};
/** Blocul de text al unui grup cu copiii dați (ADR 0105 §3–§4): Roboto, 7 mm, la stânga; amprenta e a copiilor. */
const blocO = (continut: string, copii: unknown, v: Liber = {}): Liber => ({
  continut, font: 'roboto', inaltime: 7, spatiere: 0, interlinie: 1, aliniere: 'stanga', ...v, amprenta: amprentaContururiO(copii),
});
/** Un grup de text (ADR 0105 §4; ADR 0130: pe orice grup al piesei), cu literele șablonului și blocul lor. */
const grupText = (id: string, continut: string, copii: Liber[], v: Liber = {}, matrice: MatriceO = T(10, 10)): Liber => ({
  tip: 'grup', id, matrice, text: blocO(continut, copii, v), copii,
});
/** Literele șablonului „{nume}” (trei, cum le-ar da fontul; ușa nu le citește). */
const sablonNume = (): Liber[] => [litera('s1', 0), litera('s2', 6, true), litera('s3', 12)];
/** Amprenta literelor șablonului „{nume}” (ADR 0105 §4). */
const AMPRENTA_SABLON = amprentaContururiO(sablonNume());
/** Operațiile plăcuței: rama pe exterior, gaura de prindere, literele pe exterior și golurile lor (ca la un import, ADR 0105 §4). */
const operatiiPlacuta = (): Liber[] => [
  opV18({ id: 'o1', noduri: ['rama'], latura: 'exterior' }),
  opV18({ id: 'o2', noduri: ['gaura'], latura: 'interior' }),
  opV18({ id: 'o3', noduri: ['s1c', 's2c', 's3c'], latura: 'exterior', scula: plata(2, 1), adancime: 2, pas: 1 }),
  opV18({ id: 'o4', noduri: ['s2g'], latura: 'interior', scula: plata(2, 1), adancime: 2, pas: 1 }),
];
/**
 * Plăcuța-șablon `pl` (ADR 0210 §4: „Șablonul e o piesă”): rama 80 × 30, o gaură, grupul de text `t` cu „{nume}” (sau textul
 * dat, cu câmpurile blocului date), al treilea copil al rădăcinii `r`.
 */
function piesaPlacuta(o: { readonly continut?: string; readonly bloc?: Liber; readonly grup?: Liber; readonly id?: string } = {}): Liber {
  return {
    id: o.id ?? 'pl', nume: 'Plăcuța',
    radacina: { tip: 'grup', id: 'r', matrice: I(), copii: [
      { tip: 'element', id: 'rama', forma: dreptunghi(80, 30), matrice: I() },
      { tip: 'element', id: 'gaura', forma: cerc(2), matrice: T(5, 15) },
      o.grup ?? grupText('t', o.continut ?? '{nume}', sablonNume(), o.bloc ?? {}),
    ] },
    operatii: operatiiPlacuta(),
  };
}
/** Literele plăcuței „Ana” (ușa nu le așază: contează id-urile, forma și operațiile), cu prefixul id-urilor. */
const litereAna = (p = 'q'): Liber[] => [litera(`${p}1`, 0, true), litera(`${p}2`, 6), litera(`${p}3`, 12, true)];
/** Ce taie operațiile piesei din literele „Ana”: contururile cu `o3`, golurile cu `o4`. */
const operatiiAna = (p = 'q'): Liber => ({ o3: [`${p}1c`, `${p}2c`, `${p}3c`], o4: [`${p}1g`, `${p}3g`] });
/** O intrare din `texte` (ADR 0210 §7: textul așezat, literele, operația → literele tăiate), cu câmpurile date în plus. */
const intrareText = (continut: string, copii: Liber[] = litereAna(), operatii: Liber = operatiiAna(), v: Liber = {}): Liber => ({ continut, copii, operatii, ...v });
/** O instanță a plăcuței, cu valorile ei și (dacă e dat) `texte`. */
const placuta = (
  id: string, campuri: Liber | undefined, texte?: unknown,
  o: { readonly x?: number; readonly y?: number; readonly rotire?: number; readonly piesa?: string } = {},
): Liber => ({
  id, piesa: o.piesa ?? 'pl', x: o.x ?? 10, y: o.y ?? 10, rotire: o.rotire ?? 0,
  ...(campuri !== undefined ? { campuri } : {}), ...(texte !== undefined ? { texte } : {}),
});
/** Foaia 300 × 200 × 18 cu instanțele date. */
const foaieV23 = (id: string, instante: readonly Liber[]): Liber => ({ id, stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [...instante] });
/** Un document cu piesele date și instanțele date, pe o foaie. */
export function docV23(piese: readonly Liber[], instante: readonly Liber[], schema = 23): Liber {
  return { schema, rev: 0, piese: [...piese], foi: [foaieV23('f1', instante)] };
}
/** Documentul de bază: o plăcuță „Ana” (valoarea `nume`, literele ei și ce taie fiecare operație). */
export const docAna = (schema = 23): Liber => docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') })], schema);
/** Plăcuța „Ana” fără operații pe litere (id-urile literelor se pot schimba fără să rupă o trimitere). */
const docAnaFaraOps = (): Liber => docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana', litereAna(), {}) })]);
/** Literele șablonului „Clasa {clasa}”. */
const sablonClasa = (): Liber[] => [litera('v1', 0), litera('v2', 6)];
/** Piesa `pd` cu două grupuri de text: `t` („{nume}”) și `u` („Clasa {clasa}”), cu operația `o5` pe literele lui `u`. */
function piesaDoua(): Liber {
  return {
    id: 'pd',
    radacina: { tip: 'grup', id: 'r', matrice: I(), copii: [
      { tip: 'element', id: 'rama', forma: dreptunghi(120, 40), matrice: I() },
      grupText('t', '{nume}', sablonNume()),
      grupText('u', 'Clasa {clasa}', sablonClasa(), {}, T(10, 25)),
    ] },
    operatii: [
      ...operatiiPlacuta().filter((o) => o['id'] !== 'o2'),
      opV18({ id: 'o5', noduri: ['v1c', 'v2c'], latura: 'exterior', scula: plata(2, 1), adancime: 2, pas: 1 }),
    ],
  };
}
/** O plăcuță a piesei `pd`, cu ambele texte (literele lui `u`: `w1`, `w2`). */
const placutaDoua = (id: string): Liber => placuta(id, { nume: 'Ana', clasa: 'a V-a' }, {
  t: intrareText('Ana'),
  u: intrareText('Clasa a V-a', [litera('w1', 0), litera('w2', 6)], { o5: ['w1c', 'w2c'] }),
}, { piesa: 'pd' });
/** Curba unui text pe curbă (ADR 0108): un arc, apoi o linie. */
const curbaText = (): Liber => ({
  inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'A', bulge: 0.4 } }, { p: { x: 60, y: 0 }, s: { tip: 'L' } }],
  s: 0, pozitie: 'baza', distanta: 0, invers: false, orientare: 'rotita', intinsa: false,
});
/** Piesa doar cu textul (ADR 0105 §4: blocul pe grupul rădăcină). */
const piesaDoarText = (): Liber => ({
  id: 'pt', radacina: grupText('t', '{nume}', sablonNume(), {}, I()),
  operatii: operatiiPlacuta().filter((o) => o['id'] === 'o3' || o['id'] === 'o4'),
});
/** Un v3 (operațiile fără sens, urechi, rampă, intrări, colțuri), din documentul v23 dat. */
const caV3 = (d: Liber): Liber => {
  const c = structuredClone(d);
  c['schema'] = 3;
  for (const p of c['piese'] as Liber[]) for (const o of p['operatii'] as Liber[]) for (const k of ['sens', 'urechi', 'rampa', 'intrari', 'colturi']) delete o[k];
  return c;
};

/** Prima instanță a documentului. */
const inst0 = (d: Liber): Liber => (((d['foi'] as Liber[])[0] as Liber)['instante'] as Liber[])[0] as Liber;
/** Intrarea `g` a primei instanțe. */
const intrare0 = (d: Liber, g = 't'): Liber => (inst0(d)['texte'] as Liber)[g] as Liber;
/** Litera `k` (de sus) a intrării `g` a primei instanțe. */
const litera0 = (d: Liber, k: number, g = 't'): Liber => (intrare0(d, g)['copii'] as Liber[])[k] as Liber;
/** Grupul de text `t` al primei piese (al treilea copil al rădăcinii). */
const grupT0 = (d: Liber): Liber => ((((d['piese'] as Liber[])[0] as Liber)['radacina'] as Liber)['copii'] as Liber[])[2] as Liber;
/** Documentul de bază (sau cel dat), stricat de `strica`. */
const stricat = (strica: (d: Liber) => void, baza: () => Liber = docAna): Liber => {
  const d = baza();
  strica(d);
  return d;
};

// ---------------------------------------------------------------------------------------------------------------
// Documente v23 valide: ușa le primește neschimbate.

export const VALIDE_V23: readonly CazV18[] = [
  ...VALIDE_V22.map((c) => ({ nume: `${c.nume} (v23)`, doc: laV23(c.doc) })),
  { nume: 'P01 o plăcuță „Ana”: textul așezat, literele și ce taie fiecare operație (ADR 0210 §7)', doc: docAna() },
  {
    nume: 'P02 trei plăcuțe ale aceleiași piese, fiecare cu numele ei; literele au aceleași id-uri pe fiecare (unice pe instanță)',
    doc: docV23([piesaPlacuta()], [
      placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') }),
      placuta('i2', { nume: 'Mihaela' }, { t: intrareText('Mihaela') }, { y: 50 }),
      placuta('i3', { nume: 'Ștefan' }, { t: intrareText('Ștefan') }, { y: 90 }),
    ]),
  },
  { nume: 'P03 „Masa {nr}”: textul din jurul câmpului rămâne (ADR 0210 §4)', doc: docV23([piesaPlacuta({ continut: 'Masa {nr}' })], [placuta('i1', { nr: '12' }, { t: intrareText('Masa 12') })]) },
  {
    nume: 'P04 două câmpuri, unul de două ori: fiecare apariție primește valoarea',
    doc: docV23([piesaPlacuta({ continut: '{nume} {prenume} ({nume})' })], [placuta('i1', { nume: 'Pop', prenume: 'Ana' }, { t: intrareText('Pop Ana (Pop)') })]),
  },
  { nume: 'P05 două câmpuri lipite', doc: docV23([piesaPlacuta({ continut: '{nr}{litera}' })], [placuta('i1', { nr: '7', litera: 'B' }, { t: intrareText('7B') })]) },
  {
    nume: 'P06 o valoare cu „$&”, „$1”, „$$”, „$\'” și „$`”: intră așa cum e (o verificare de șiruri, ADR 0210 §7)',
    doc: docV23([piesaPlacuta()], [placuta('i1', { nume: "$& $1 $$ $' $`" }, { t: intrareText("$& $1 $$ $' $`") })]),
  },
  {
    nume: 'P07 o valoare cu acolade: se înlocuiesc câmpurile textului blocului, o dată („{b}” rămâne „{b}”)',
    doc: docV23([piesaPlacuta({ continut: '{a}' })], [placuta('i1', { a: '{b}', b: 'X' }, { t: intrareText('{b}') })]),
  },
  { nume: 'P08 diacriticele (ș, ț cu virgulă) și un caracter din afara planului de bază', doc: docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ștefan Țărnă 😀' }, { t: intrareText('Ștefan Țărnă 😀') })]) },
  {
    nume: 'P09 două rânduri (Enter), cu câte un câmp',
    doc: docV23([piesaPlacuta({ continut: '{nume}\nClasa {clasa}' })], [placuta('i1', { nume: 'Ana', clasa: 'a V-a' }, { t: intrareText('Ana\nClasa a V-a') })]),
  },
  {
    nume: 'P10 rândurile despărțite cu „\\r\\n” rămân exact',
    doc: docV23([piesaPlacuta({ continut: '{nume}\r\nMasa {nr}' })], [placuta('i1', { nume: 'Ana', nr: '3' }, { t: intrareText('Ana\r\nMasa 3') })]),
  },
  {
    nume: 'P11 o plăcuță fără litere (numele din spații): copii și operatii goale (ALEGERE: ușa nu așază textul)',
    doc: docV23([piesaPlacuta()], [placuta('i1', { nume: '   ' }, { t: intrareText('   ', [], {}) })]),
  },
  { nume: 'P12 blocul pe o curbă (ADR 0108), cu câmpul', doc: docV23([piesaPlacuta({ bloc: { curba: curbaText() } })], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') })]) },
  {
    nume: 'P13 „Limitat de casetă” pe șablon (răspunsul 5, ADR 0142): un nume lung, micșorat (geometria nu e a ușii)',
    doc: docV23(
      [piesaPlacuta({ bloc: { inaltime: 5.2, caseta: { fel: 'limita', latime: 70, inaltime: 20, ceruta: 7 } } })],
      [placuta('i1', { nume: 'Maximilian-Alexandru' }, { t: intrareText('Maximilian-Alexandru') })],
    ),
  },
  {
    nume: 'P14 blocul cu toate câmpurile lui opționale (ADR 0123, 0138): proporțiile, cursivul, aldinul, spațierile, punctele',
    doc: docV23(
      [piesaPlacuta({ bloc: { numeFont: 'Roboto', proportii: { latime: 80, inaltime: 120 }, cursiv: 12, aldin: 0.5, spatieri: [{ dupa: 0, mm: 0.5 }], unitate: 'pt', crenare: false } })],
      [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') })],
    ),
  },
  { nume: 'P15 textul e chiar rădăcina piesei (ADR 0105 §4)', doc: docV23([piesaDoarText()], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') }, { piesa: 'pt' })]) },
  { nume: 'P16 două grupuri de text, amândouă cu literele plăcuței (id-uri diferite între ele)', doc: docV23([piesaDoua()], [placutaDoua('i1')]) },
  {
    nume: 'P17 două grupuri de text, doar unul cu literele plăcuței (ADR-ul nu le cere pe toate)',
    doc: docV23([piesaDoua()], [placuta('i1', { nume: 'Ana', clasa: 'a V-a' }, { t: intrareText('Ana') }, { piesa: 'pd' })]),
  },
  {
    nume: 'P18 o instanță a șablonului fără texte (taie „{nume}”, ca până la v22), lângă o plăcuță',
    doc: docV23([piesaPlacuta()], [placuta('i0', { nume: 'Ana' }), placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') }, { y: 50 })]),
  },
  {
    nume: 'P19 o operație a piesei fără literele plăcuței (o3 lipsește: nu taie nimic din ele)',
    doc: docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana', litereAna(), { o4: ['q1g', 'q3g'] }) })]),
  },
  {
    nume: 'P20 operația ramei (o1) taie și o literă a plăcuței (o operație a piesei, pe o literă din copii)',
    doc: docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana', litereAna(), { ...operatiiAna(), o1: ['q2c'] }) })]),
  },
  {
    nume: 'P21 câmpuri necunoscute în intrare și pe litere (păstrate, ADR 0024)',
    doc: docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ana' }, {
      t: intrareText('Ana', [{ ...litera('q1', 0, true), stil: 'x' }, litera('q2', 6), { ...litera('q3', 12, true), culoare: 3 }], operatiiAna(), { nota: { de: 'csv' }, micsorare: 0.9 }),
    })]),
  },
  {
    nume: 'P22 grupul de text cu id-ul „constructor”, iar câmpul și cheia din campuri la fel (date, ADR 0024 §9)',
    doc: docV23([piesaPlacuta({ grup: grupText('constructor', '{constructor}', sablonNume()) })], [placuta('i1', { constructor: 'Ana' }, { constructor: intrareText('Ana') })]),
  },
  {
    nume: 'P23 grupul de text „__proto__”, câmpul {__proto__} și cheile din campuri și din texte (date, ADR 0024 §9)',
    doc: docV23(
      [piesaPlacuta({ grup: grupText('__proto__', '{__proto__}', sablonNume()) })],
      [placuta('i1', JSON.parse('{"__proto__": "Ana"}') as Liber, JSON.parse(`{"__proto__": ${JSON.stringify(intrareText('Ana'))}}`) as Liber)],
    ),
  },
  {
    nume: 'P24 litere cu arce, pe plăcuțe rotite cu 90° și cu 30° (similitudini în lume, ADR 0034 §2)',
    doc: docV23([piesaPlacuta()], [
      placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana', [literaArc('q1', 0), literaArc('q2', 6)], { o3: ['q1c', 'q2c'] }) }, { x: 100, rotire: 90 }),
      placuta('i2', { nume: 'Ana' }, { t: intrareText('Ana', [literaArc('q1', 0), literaArc('q2', 6)], { o3: ['q1c', 'q2c'] }) }, { y: 100, rotire: 30 }),
    ]),
  },
  {
    nume: 'P25 literele cu id-urile instanței, ale pieselor, ale unei operații, ale foii și ale nodului altei piese (alte spații de nume)',
    doc: docV23(
      [piesaPlacuta(), { id: 'px', radacina: { tip: 'element', id: 'e', forma: dreptunghi(10, 10), matrice: I() }, operatii: [] }],
      [placuta('i1', { nume: 'Ana' }, {
        t: intrareText('Ana', [litera('i1', 0), litera('pl', 6), litera('o3', 12), litera('f1', 18), litera('e', 24)], { o3: ['i1c', 'plc', 'o3c', 'f1c', 'ec'] }),
      })],
    ),
  },
  {
    nume: 'P26 o literă care ajunge pe nivelul 32 (grupul pe 2, literele pe 3 … 32: la margine în orice citire)',
    doc: docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana', [literaAdanca('qa', 30)], { o3: ['qa0'] }) })]),
  },
  {
    nume: 'P27 imbricarea la 200 de niveluri, într-un câmp necunoscut al intrării (ADR 0024, precizarea 5)',
    // documentul 1, foi 2, foaia 3, instante 4, instanța 5, texte 6, intrarea 7, `nota` 8 … 200: 193 de obiecte.
    doc: docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana', litereAna(), operatiiAna(), { nota: imbricat(193) }) })]),
  },
  {
    nume: 'P28 șablonul fără litere (blocul cu amprenta listei goale), plăcuța cu litere tăiate de operația ramei',
    doc: docV23(
      [{ ...piesaPlacuta({ grup: grupText('t', '{nume}', []) }), operatii: operatiiPlacuta().filter((o) => o['id'] === 'o1' || o['id'] === 'o2') }],
      [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana', litereAna(), { o1: ['q1c', 'q2c', 'q3c'] }) })],
    ),
  },
  (() => {
    const inst = (k: number): Liber => placuta(`i${k}`, { nume: `Elev ${k}` }, { t: intrareText(`Elev ${k}`) }, { x: 10 + ((k - 1) % 3) * 85, y: 10 + Math.floor(((k - 1) % 15) / 3) * 35 });
    return {
      nume: 'P29 30 de plăcuțe pe două foi (15 + 15), fiecare cu numele ei (prototipul, ADR 0210)',
      doc: { schema: 23, rev: 3, piese: [piesaPlacuta()], foi: [
        foaieV23('f1', Array.from({ length: 15 }, (_, k) => inst(k + 1))),
        { ...foaieV23('f2', Array.from({ length: 15 }, (_, k) => inst(k + 16))), nume: 'Foaia 2' },
      ] },
    };
  })(),
  { nume: 'P30 `texte` pe piesă e un câmp necunoscut, lângă o plăcuță', doc: { ...docAna(), piese: [{ ...piesaPlacuta(), texte: { t: 1 } }] } },
  (() => {
    const p = piesaPlacuta();
    (p['radacina'] as Liber)['matrice'] = M(0, 1, -1, 0, 30, 0);
    return { nume: 'P31 rădăcina piesei rotită cu 90° (literele, sub grupul lor, ca orice nod)', doc: docV23([p], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') })]) };
  })(),
  { nume: 'P32 campuri cu chei pe care textul nu le folosește', doc: docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ana', clasa: 'a V-a', nota: '' }, { t: intrareText('Ana') })]) },
  { nume: 'P33 fontul unui sistem (ADR 0106), cu numele lui', doc: docV23([piesaPlacuta({ bloc: { font: 'g:Roboto:700', numeFont: 'Roboto Bold' } })], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') })]) },
  {
    nume: 'P34 aceeași piesă pe două foi, cu plăcuțe pe amândouă',
    doc: { schema: 23, rev: 0, piese: [piesaPlacuta()], foi: [
      foaieV23('f1', [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') })]),
      foaieV23('f2', [placuta('i2', { nume: 'Ion' }, { t: intrareText('Ion', [litera('q1', 0), litera('q2', 6)], { o3: ['q1c', 'q2c'] }) })]),
    ] },
  },
  { nume: 'P35 valoarea e chiar „{nume}”: textul plăcuței e „{nume}”', doc: docV23([piesaPlacuta()], [placuta('i1', { nume: '{nume}' }, { t: intrareText('{nume}') })]) },
];

// ---------------------------------------------------------------------------------------------------------------
// Documente vechi și ce iese din ușa v23.

/** Plăcuța-șablon cu două instanțe și valorile lor, fără literele plăcuțelor (cum o putea scrie v22). */
const SABLON_V22 = docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ana' }), placuta('i2', { nume: 'Ion' }, undefined, { y: 50 })], 22);
const SABLON_V10 = docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ana' })], 10);

export const MIGRARI_V23_HARTIE: ReadonlyArray<{ readonly nume: string; readonly vechi: Liber; readonly v23: Liber }> = [
  ...MIGRARI_V22_HARTIE.map((c) => ({ nume: c.nume, vechi: c.vechi, v23: laV23(c.v22) })),
  { nume: 'M23a un v22 cu plăcuța-șablon și valorile pe instanțe, fără literele plăcuțelor: doar numărul (ADR 0210 §7)', vechi: SABLON_V22, v23: laV23(SABLON_V22) },
  { nume: 'M23b un v10 cu plăcuța-șablon (blocul, un câmp necunoscut al grupului): doar numărul', vechi: SABLON_V10, v23: cuSchema(SABLON_V10, 23) },
];

/** `texte` în afara instanței e un câmp necunoscut oarecare: primit și păstrat (ciocnirea e doar pe instanță, ADR 0210 §7). */
export const NECIOCNIRI_V23: ReadonlyArray<CazV18 & { readonly v23: Liber }> = [
  ...NECIOCNIRI_V22.map((c) => ({ nume: c.nume, doc: c.doc, v23: laV23(c.v22) })),
  ...([
    ['N23a un v22 cu `texte` pe piesă', (d: Liber) => { ((d['piese'] as Liber[])[0] as Liber)['texte'] = { t: intrareText('Ana') }; }],
    ['N23b un v22 cu `texte` pe rădăcina piesei', (d: Liber) => { (((d['piese'] as Liber[])[0] as Liber)['radacina'] as Liber)['texte'] = 1; }],
    ['N23c un v22 cu `texte` pe foaie', (d: Liber) => { ((d['foi'] as Liber[])[0] as Liber)['texte'] = []; }],
    ['N23d un v22 cu `texte` sus', (d: Liber) => { d['texte'] = 'x'; }],
    ['N23e un v22 cu `texte` pe o operație', (d: Liber) => { (((d['piese'] as Liber[])[0] as Liber)['operatii'] as Liber[])[0]!['texte'] = {}; }],
    ['N23f un v22 cu `texte` ca valoare în campuri', (d: Liber) => { (inst0(d)['campuri'] as Liber)['texte'] = 'Ana'; }],
    ['N23g un v22 cu `texte` în stocul foii', (d: Liber) => { (((d['foi'] as Liber[])[0] as Liber)['stoc'] as Liber)['texte'] = 0; }],
    ['N23h un v22 cu `texte` pe grupul de text, lângă bloc', (d: Liber) => { grupT0(d)['texte'] = { t: 1 }; }],
  ] as const).map(([nume, pune]) => {
    const d = structuredClone(SABLON_V22);
    pune(d);
    return { nume, doc: d, v23: laV23(d) };
  }),
  (() => {
    const d = structuredClone(SABLON_V10);
    ((d['piese'] as Liber[])[0] as Liber)['texte'] = { t: intrareText('Ana') };
    return { nume: 'N23i un v10 cu `texte` pe piesă (prin tot lanțul)', doc: d, v23: cuSchema(d, 23) };
  })(),
];

// ---------------------------------------------------------------------------------------------------------------
// Frontierele: o valoare pusă la o cale a documentului de bază, cu verdictul de pe hârtie.

export type FrontieraV23 = {
  /** Calea câmpului în document (cu `.`; indicii listelor ca numere). */
  readonly cale: string;
  /** Documentul pe care se pune valoarea (o copie nouă la fiecare chemare). */
  readonly baza: () => Liber;
  /** Categoria oracolului când valoarea e refuzată. */
  readonly categorie: CategorieO;
  /** Ce trebuie să numească motivul oracolului (calea, ca în mesajele lui). */
  readonly mesaj: string;
  readonly adr: string;
  /** Valoarea (sau `LIPSA`) și verdictul de pe hârtie: `true` = primit. */
  readonly valori: ReadonlyArray<readonly [unknown, boolean]>;
  /** Valori pe care ADR-ul nu le hotărăște (DESCHIS): verdictul ALEGERII oracolului și de ce; aplicația doar se raportează. */
  readonly ambigue?: ReadonlyArray<readonly [unknown, boolean, string]>;
};

const CI0 = 'foi.0.instante.0';
const CT0 = `${CI0}.texte`;
const CB0 = 'piese.0.radacina.copii.2.text';

export const FRONTIERE_V23: readonly FrontieraV23[] = [
  {
    cale: CT0, baza: docAna, categorie: 'texte', mesaj: 'texte', adr: 'ADR 0210 §7: opțional; un dicționar grupul piesei → literele',
    valori: [
      [LIPSA, true], [{ t: intrareText('Ana') }, true], [null, false], [[], false], ['t', false], [1, false], [true, false],
      [{ r: intrareText('Ana') }, false], [{ rama: intrareText('Ana') }, false], [{ gaura: intrareText('Ana') }, false],
      [{ zz: intrareText('Ana') }, false], [{ T: intrareText('Ana') }, false], [{ s1: intrareText('Ana') }, false],
    ],
    ambigue: [[{}, true, 'DESCHIS: `texte: {}` (nicio intrare); ALEGERE: primit']],
  },
  {
    cale: `${CT0}.t`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0210 §7: { continut, copii, operatii }',
    valori: [[intrareText('Ana'), true], [null, false], [[], false], ['Ana', false], [{}, false], [{ continut: 'Ana', operatii: {} }, false]],
  },
  {
    cale: `${CT0}.t.continut`, baza: docAna, categorie: 'texte', mesaj: 'texte.t.continut', adr: 'ADR 0210 §7: textul blocului cu valorile din campuri, exact',
    valori: [
      ['Ana', true], ['ana', false], ['ANA', false], ['Ana ', false], [' Ana', false], ['Ana\n', false], ['', false], ['{nume}', false],
      ['Ană', false], [LIPSA, false], [null, false], [7, false], [['Ana'], false], [{ text: 'Ana' }, false],
    ],
  },
  {
    cale: `${CI0}.campuri.nume`, baza: docAna, categorie: 'texte', mesaj: 'texte.t.continut', adr: 'ADR 0210 §7: valoarea din campuri dă textul plăcuței',
    valori: [['Ana', true], ['ana', false], ['Ana ', false], ['', false], ['{nume}', false]],
    ambigue: [[LIPSA, false, 'DESCHIS: câmpul fără valoare în campuri; ALEGERE: refuz']],
  },
  {
    cale: `${CT0}.t.copii`, baza: docAnaFaraOps, categorie: 'texte', mesaj: 'texte.t.copii', adr: 'ADR 0210 §7: literele, o listă de noduri',
    valori: [[litereAna(), true], [[], true], [[litera('q1', 0)], true], [LIPSA, false], [null, false], [{}, false], ['q1', false], [litera('q1', 0), false]],
  },
  {
    cale: `${CT0}.t.operatii`, baza: docAna, categorie: 'texte', mesaj: 'texte.t.operatii', adr: 'ADR 0210 §7: id-ul operației piesei → literele tăiate',
    valori: [
      [operatiiAna(), true], [{}, true], [{ o4: ['q1g'] }, true], [null, false], [[], false], ['o3', false], [{ ox: [] }, false],
      [{ ...operatiiAna(), o9: ['q1c'] }, false],
    ],
    ambigue: [[LIPSA, false, 'DESCHIS: intrarea fără operatii; ALEGERE: refuz (valoarea are trei câmpuri)']],
  },
  {
    cale: `${CT0}.t.operatii.o3`, baza: docAna, categorie: 'texte', mesaj: 'texte.t.operatii.o3', adr: 'ADR 0210 §7: operațiile ale piesei, pe literele din copii',
    valori: [
      [LIPSA, true], [['q1c'], true], [['q1c', 'q2c', 'q3c'], true], [['q1g', 'q3g'], true], [['q3c', 'q1c'], true], [['zz'], false],
      [['s1c'], false], [['rama'], false], [['q1c', 'zz'], false], [[1], false], ['q1c', false], [null, false], [{}, false], [[null], false],
    ],
    ambigue: [
      [[], true, 'DESCHIS: o listă goală; ALEGERE: primită (nicio literă tăiată)'],
      [['q1c', 'q1c'], false, 'DESCHIS: o literă de două ori; ALEGERE: refuz (ca noduri, ADR 0025)'],
      [['q1'], false, 'DESCHIS: grupul literei, nu conturul; ALEGERE: refuz (operațiile taie elemente, ADR 0025)'],
    ],
  },
  {
    cale: `${CT0}.t.copii.0.id`, baza: docAna, categorie: 'texte', mesaj: 'texte.t.copii[0].id', adr: 'ADR 0210 §7: id-urile literelor unice și diferite de ale piesei',
    valori: [
      ['q1', true], ['qq', true], ['i1', true], ['pl', true], ['o3', true], ['f1', true], ['x'.repeat(64), true],
      ['r', false], ['rama', false], ['gaura', false], ['t', false], ['s1', false], ['s2g', false], ['q2', false], ['q3', false], ['q1c', false], ['q1g', false],
    ],
  },
  {
    cale: `${CT0}.t.copii.0.id`, baza: docAna, categorie: 'id', mesaj: 'texte.t.copii[0].id', adr: 'ADR 0024: un id, ^[A-Za-z0-9_-]+$, 1–64 de caractere',
    valori: [['q-1_A', true], ['a b', false], ['', false], ['x'.repeat(65), false], ['ș', false]],
  },
  {
    cale: `${CT0}.t.copii.0.id`, baza: docAna, categorie: 'schema', mesaj: 'texte.t.copii[0].id', adr: 'ADR 0024: id-ul e un text',
    valori: [[7, false], [null, false], [LIPSA, false]],
  },
  {
    cale: `${CT0}.t.copii.0.copii.0.id`, baza: docAnaFaraOps, categorie: 'texte', mesaj: 'texte.t.copii[0].copii[0].id', adr: 'ADR 0210 §7: și conturul unei litere e o literă',
    valori: [['q1c', true], ['zz', true], ['rama', false], ['q1', false], ['q3g', false], ['s3c', false], ['q2c', false]],
  },
  {
    cale: `${CT0}.t.copii.0.matrice.e`, baza: docAna, categorie: 'margini', mesaj: 'texte.t.copii[0]', adr: 'ADR 0024, precizarea 5: |e| ≤ 10 000 000 față de rădăcina piesei (grupul e la x 10)',
    valori: [[0, true], [9_999_990, true], [-10_000_010, true], [9_999_990.5, false], [-10_000_010.5, false], [2e7, false]],
  },
  { cale: `${CT0}.t.copii.0.matrice.e`, baza: docAna, categorie: 'finit', mesaj: 'texte.t.copii[0]', adr: 'ADR 0024, precizarea 5: finită', valori: [[Number.POSITIVE_INFINITY, false], [Number.NaN, false]] },
  { cale: `${CT0}.t.copii.0.matrice.e`, baza: docAna, categorie: 'schema', mesaj: 'texte.t.copii[0]', adr: 'ADR 0024: un număr', valori: [['0', false], [null, false], [LIPSA, false]] },
  {
    cale: `${CT0}.t.copii.0.matrice.a`, baza: docAna, categorie: 'margini', mesaj: 'texte.t.copii[0]', adr: 'ADR 0024, precizarea 5: |a| ≤ 10 000 (fără arce, orice afină)',
    valori: [[1, true], [10_000, true], [-10_000, true], [0, true], [10_000.5, false], [-10_001, false]],
  },
  {
    cale: `${CT0}.t.copii.1.copii.0.forma.inchis`, baza: docAna, categorie: 'cale', mesaj: 'texte.t.copii[1].copii[0].forma', adr: 'ADR 0037 §2: inchis e boolean',
    valori: [[true, true], [false, true], ['da', false], [LIPSA, false], [1, false]],
  },
  {
    cale: `${CT0}.t.copii.0.tip`, baza: docAnaFaraOps, categorie: 'schema', mesaj: 'texte.t.copii[0]', adr: 'ADR 0024: grup sau element (cu formă)',
    valori: [['grup', true], ['element', false], ['litera', false], [LIPSA, false], [null, false]],
  },
  {
    cale: `${CT0}.t.copii.0.nume`, baza: docAna, categorie: 'plafon', mesaj: 'texte.t.copii[0].nume', adr: 'ADR 0024, precizarea 4: numele, cel mult 200',
    valori: [[LIPSA, true], ['A', true], ['x'.repeat(200), true], ['x'.repeat(201), false]],
  },
  { cale: `${CT0}.t.copii.0.nume`, baza: docAna, categorie: 'schema', mesaj: 'texte.t.copii[0].nume', adr: 'ADR 0024: un text', valori: [[7, false], [null, false]] },
  // Blocul grupului de text (ADR 0105 §3–§4, 0123, 0138, 0141, 0142): un bloc stricat nu mai e valid, deci intrarea e refuzată.
  {
    cale: `${CB0}.inaltime`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0105 §3: 0,1–1 000 mm',
    valori: [[0.1, true], [7, true], [1_000, true], [0.0999, false], [0, false], [-7, false], [1_000.001, false], ['7', false], [LIPSA, false], ...NUMERE_RELE],
  },
  { cale: `${CB0}.spatiere`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0105 §3: ± 1 000 mm', valori: [[-1_000, true], [1_000, true], [0, true], [-1_000.001, false], [1_000.5, false], ['0', false], [LIPSA, false]] },
  { cale: `${CB0}.interlinie`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0105 §3: 0,5–5', valori: [[0.5, true], [5, true], [1.15, true], [0.49, false], [5.01, false], [LIPSA, false], [Number.NaN, false]] },
  {
    cale: `${CB0}.aliniere`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0105 §3: stânga, centru, dreapta',
    valori: [['stanga', true], ['centru', true], ['dreapta', true], ['Stanga', false], ['stânga', false], ['', false], [LIPSA, false], [0, false]],
  },
  {
    cale: `${CB0}.font`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0105, 0106: id-ul fontului, 1–128',
    valori: [['roboto', true], ['g:Roboto:700', true], ['x'.repeat(128), true], ['', false], ['x'.repeat(129), false], [7, false], [LIPSA, false]],
  },
  { cale: `${CB0}.numeFont`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0106: cel mult 128', valori: [[LIPSA, true], ['', true], ['x'.repeat(128), true], ['x'.repeat(129), false], [null, false]] },
  {
    cale: `${CB0}.amprenta`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0105 §4: amprenta contururilor grupului',
    valori: [[AMPRENTA_SABLON, true], ['0000000000000000', false], ['', false], ['x'.repeat(65), false], [LIPSA, false], [7, false]],
  },
  {
    cale: `${CB0}.aldin`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0123: 0 sau 0,01 … o cincime din majusculă (7 · 0,2 = 1,4)',
    valori: [[LIPSA, true], [0, true], [-0, true], [0.01, true], [1.4, true], [1.400000002, false], [0.005, false], [-0.1, false], ['0', false], [201, false]],
  },
  { cale: `${CB0}.cursiv`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0123: ± 45°', valori: [[LIPSA, true], [-45, true], [45, true], [0, true], [45.001, false], [-46, false], ['5', false]] },
  { cale: `${CB0}.vertical`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0141: lipsă sau true', valori: [[LIPSA, true], [true, true], [false, false], [1, false], ['true', false]] },
  { cale: `${CB0}.crenare`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0138 §3: lipsă sau false', valori: [[LIPSA, true], [false, true], [true, false], [0, false]] },
  { cale: `${CB0}.unitate`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0138 §1: lipsă (mm), pt, in', valori: [[LIPSA, true], ['pt', true], ['in', true], ['mm', false], ['PT', false], ['', false]] },
  {
    cale: `${CB0}.proportii`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0138 §2: lățimea și înălțimea în 10–1 000 %',
    valori: [[LIPSA, true], [{ latime: 10, inaltime: 1_000 }, true], [{ latime: 100, inaltime: 100, x: 1 }, true], [{ latime: 9.9, inaltime: 100 }, false], [{ latime: 100 }, false], [null, false], [[100, 100], false]],
  },
  {
    cale: `${CB0}.caseta`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0142 §5: limitat (cu ceruta) sau scalat, 0,1–10 000 mm',
    valori: [
      [LIPSA, true], [{ fel: 'limita', latime: 70, inaltime: 20, ceruta: 7 }, true], [{ fel: 'scala', latime: 0.1, inaltime: 10_000 }, true],
      [{ fel: 'limita', latime: 70, inaltime: 20 }, false], [{ fel: 'scala', latime: 10_000.1, inaltime: 20 }, false], [{ fel: 'umple', latime: 1, inaltime: 1 }, false], [null, false],
    ],
  },
  {
    cale: `${CB0}.spatieri`, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0138 §5: sortate, unice, nenule, după un caracter cu altul după el („{nume}” are 6)',
    valori: [
      [LIPSA, true], [[], true], [[{ dupa: 0, mm: 1 }], true], [[{ dupa: 4, mm: -1 }], true], [[{ dupa: 0, mm: 1 }, { dupa: 3, mm: 2 }], true],
      [[{ dupa: 5, mm: 1 }], false], [[{ dupa: 0, mm: 0 }], false], [[{ dupa: 1, mm: 1 }, { dupa: 0, mm: 1 }], false], [[{ dupa: 0, mm: 1 }, { dupa: 0, mm: 2 }], false],
      [[{ dupa: 0.5, mm: 1 }], false], [[{ dupa: 0, mm: 1_001 }], false], [{ dupa: 0, mm: 1 }, false],
    ],
  },
  { cale: CB0, baza: docAna, categorie: 'texte', mesaj: 'texte.t', adr: 'ADR 0105 §4: blocul de text al grupului', valori: [[LIPSA, false], [null, false], ['{nume}', false], [[], false]] },
];

// ---------------------------------------------------------------------------------------------------------------
// Documente stricate: un singur defect fiecare.

export const REFUZATE_V23: readonly RefuzV18[] = [
  ...REFUZATE_V22.filter((r) => !r.nume.startsWith('R01 ')),
  { nume: 'R01 scris de o versiune mai nouă (v24)', doc: docV(24, buzunar()), categorie: 'schema', camp: 'schema', motiv: 'ADR 0070 §2: o versiune mai veche refuză una mai nouă', text: 'versiune mai nouă' },
  // Forma lui `texte`.
  { nume: 'TA0 texte null', doc: stricat((d) => { inst0(d)['texte'] = null; }), categorie: 'texte', camp: CT0, motiv: 'ADR 0210 §7: un dicționar grupul → literele' },
  { nume: 'TA1 texte o listă', doc: stricat((d) => { inst0(d)['texte'] = [intrareText('Ana')]; }), categorie: 'texte', camp: CT0, motiv: 'ADR 0210 §7: un dicționar' },
  { nume: 'TA2 texte un text', doc: stricat((d) => { inst0(d)['texte'] = 'Ana'; }), categorie: 'texte', camp: CT0, motiv: 'ADR 0210 §7: un dicționar' },
  // Grupul: al piesei, un grup, cu blocul valid și cu câmpuri.
  { nume: 'TB0 cheia nu e un nod al piesei', doc: stricat((d) => { inst0(d)['texte'] = { zz: intrareText('Ana') }; }), categorie: 'texte', camp: `${CT0}.zz`, motiv: 'ADR 0210 §7: grupul e al piesei' },
  { nume: 'TB1 cheia e un element (rama)', doc: stricat((d) => { inst0(d)['texte'] = { rama: intrareText('Ana') }; }), categorie: 'texte', camp: `${CT0}.rama`, motiv: 'ADR 0210 §7: un grup' },
  { nume: 'TB2 cheia e rădăcina, un grup fără bloc', doc: stricat((d) => { inst0(d)['texte'] = { r: intrareText('Ana') }; }), categorie: 'texte', camp: `${CT0}.r`, motiv: 'ADR 0210 §7: cu bloc valid' },
  {
    nume: 'TB3 cheia e grupul de text al altei piese',
    doc: docV23([piesaPlacuta(), piesaDoua()], [placuta('i1', { nume: 'Ana', clasa: 'a V-a' }, { t: intrareText('Ana'), u: intrareText('Clasa a V-a', [litera('w1', 0)], {}) })]),
    categorie: 'texte', camp: `${CT0}.u`, motiv: 'ADR 0210 §7: grupul e al piesei instanței',
  },
  { nume: 'TB4 blocul grupului cu înălțimea 0', doc: docV23([piesaPlacuta({ bloc: { inaltime: 0 } })], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') })]), categorie: 'texte', camp: `${CT0}.t`, motiv: 'ADR 0105 §3: 0,1–1 000 mm, deci blocul nu e valid' },
  {
    nume: 'TB5 amprenta veche: o literă a șablonului mutată pe altă cale',
    doc: stricat((d) => { (((grupT0(d)['copii'] as Liber[])[0] as Liber)['matrice'] as Liber)['e'] = 1; }),
    categorie: 'texte', camp: `${CT0}.t`, motiv: 'ADR 0105 §4: contururile schimbate pe altă cale fac blocul nevalid',
  },
  { nume: 'TB6 textul grupului fără câmpuri („LEMN”)', doc: docV23([piesaPlacuta({ continut: 'LEMN' })], [placuta('i1', { nume: 'Ana' }, { t: intrareText('LEMN') })]), categorie: 'texte', camp: `${CT0}.t`, motiv: 'ADR 0210 §7: cu câmpuri' },
  { nume: 'TB7 „}nume{”: acoladele întoarse nu fac un câmp', doc: docV23([piesaPlacuta({ continut: '}nume{' })], [placuta('i1', { nume: 'Ana' }, { t: intrareText('}nume{') })]), categorie: 'texte', camp: `${CT0}.t`, motiv: 'ADR 0210 §4: `{nume}`' },
  {
    nume: 'TB8 blocul pe o curbă și în casetă',
    doc: docV23([piesaPlacuta({ bloc: { curba: curbaText(), caseta: { fel: 'scala', latime: 70, inaltime: 20 } } })], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') })]),
    categorie: 'texte', camp: `${CT0}.t`, motiv: 'ADR 0142 §5: un text în casetă nu stă pe o curbă',
  },
  { nume: 'TB9 blocul cu `vertical: false`', doc: docV23([piesaPlacuta({ bloc: { vertical: false } })], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') })]), categorie: 'texte', camp: `${CT0}.t`, motiv: 'ADR 0141: lipsă sau true' },
  // Intrarea și textul așezat.
  { nume: 'TC0 intrarea null', doc: stricat((d) => { (inst0(d)['texte'] as Liber)['t'] = null; }), categorie: 'texte', camp: `${CT0}.t`, motiv: 'ADR 0210 §7: { continut, copii, operatii }' },
  { nume: 'TC1 intrarea fără continut', doc: stricat((d) => { delete intrare0(d)['continut']; }), categorie: 'texte', camp: `${CT0}.t.continut`, motiv: 'ADR 0210 §7: textul așezat' },
  { nume: 'TC2 continut un număr', doc: stricat((d) => { intrare0(d)['continut'] = 7; }), categorie: 'texte', camp: `${CT0}.t.continut`, motiv: 'ADR 0210 §7: un text' },
  { nume: 'TC3 continut cu un spațiu în plus', doc: stricat((d) => { intrare0(d)['continut'] = 'Ana '; }), categorie: 'texte', camp: `${CT0}.t.continut`, motiv: 'ADR 0210 §7: o verificare de șiruri' },
  { nume: 'TC4 continut e textul șablonului', doc: stricat((d) => { intrare0(d)['continut'] = '{nume}'; }), categorie: 'texte', camp: `${CT0}.t.continut`, motiv: 'ADR 0210 §7: cu valorile din campuri' },
  {
    nume: 'TC5 „Ş” cu sedilă (U+015E) în locul lui „Ș” cu virgulă (U+0218)', doc: docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ștefan' }, { t: intrareText('Ştefan') })]),
    categorie: 'texte', camp: `${CT0}.t.continut`, motiv: 'ADR 0210 §7: o verificare de șiruri, fără normalizare',
  },
  {
    nume: 'TC6 „Ș” descompus (S urmat de U+0326)', doc: docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ștefan' }, { t: intrareText('Ștefan') })]),
    categorie: 'texte', camp: `${CT0}.t.continut`, motiv: 'ADR 0210 §7: o verificare de șiruri, fără normalizare',
  },
  {
    nume: 'TC7 valoarea „$&” scrisă cum o lasă `replace` cu un text de înlocuire („{nume}”)', doc: docV23([piesaPlacuta()], [placuta('i1', { nume: '$&' }, { t: intrareText('{nume}') })]),
    categorie: 'texte', camp: `${CT0}.t.continut`, motiv: 'ADR 0210 §7: valoarea intră așa cum e',
  },
  {
    nume: 'TC8 valoarea „{b}” înlocuită încă o dată („X”)', doc: docV23([piesaPlacuta({ continut: '{a}' })], [placuta('i1', { a: '{b}', b: 'X' }, { t: intrareText('X') })]),
    categorie: 'texte', camp: `${CT0}.t.continut`, motiv: 'ADR 0210 §7: câmpurile sunt ale textului blocului, nu ale valorilor',
  },
  {
    nume: 'TC9 câmpul {toString} fără valoare, cu textul funcției din prototip (greșit în orice citire a valorii lipsă)',
    doc: docV23([piesaPlacuta({ continut: '{toString}' })], [placuta('i1', {}, { t: intrareText(String(Object.prototype.toString)) })]),
    categorie: 'texte', camp: `${CT0}.t.continut`, motiv: 'ADR 0024 §9: cheile sunt date; campuri n-are toString',
  },
  {
    nume: 'TC10 câmpul fără valoare, cu „undefined” (greșit în orice citire a valorii lipsă)', doc: docV23([piesaPlacuta()], [placuta('i1', {}, { t: intrareText('undefined') })]),
    categorie: 'texte', camp: `${CT0}.t.continut`, motiv: 'ADR 0210 §7',
  },
  // Literele.
  { nume: 'TD0 intrarea fără copii', doc: stricat((d) => { delete intrare0(d)['copii']; }), categorie: 'texte', camp: `${CT0}.t.copii`, motiv: 'ADR 0210 §7: literele' },
  { nume: 'TD1 copii un obiect', doc: stricat((d) => { intrare0(d)['copii'] = {}; }), categorie: 'texte', camp: `${CT0}.t.copii`, motiv: 'ADR 0210 §7: o listă de litere' },
  { nume: 'TD2 o literă cu id-ul unui nod al piesei (rama)', doc: stricat((d) => { litera0(d, 1)['id'] = 'rama'; }), categorie: 'texte', camp: `${CT0}.t.copii.1.id`, motiv: 'ADR 0210 §7: diferite de ale piesei' },
  { nume: 'TD3 o literă cu id-ul unei litere a șablonului (s1)', doc: stricat((d) => { litera0(d, 0)['id'] = 's1'; }), categorie: 'texte', camp: `${CT0}.t.copii.0.id`, motiv: 'ADR 0210 §7: literele șablonului sunt noduri ale piesei' },
  { nume: 'TD4 o literă cu id-ul grupului de text (t)', doc: stricat((d) => { litera0(d, 2)['id'] = 't'; }), categorie: 'texte', camp: `${CT0}.t.copii.2.id`, motiv: 'ADR 0210 §7: diferite de ale piesei' },
  { nume: 'TD5 două litere cu același id', doc: stricat((d) => { litera0(d, 2)['id'] = 'q1'; }), categorie: 'texte', camp: `${CT0}.t.copii.2.id`, motiv: 'ADR 0210 §7: unice' },
  {
    nume: 'TD6 conturul unei litere cu id-ul literei', doc: stricat((d) => { ((litera0(d, 1)['copii'] as Liber[])[0] as Liber)['id'] = 'q2'; }),
    categorie: 'texte', camp: `${CT0}.t.copii.1.copii.0.id`, motiv: 'ADR 0210 §7: unice (la orice adâncime)',
  },
  {
    nume: 'TD7 același id în două intrări ale aceleiași instanțe (ALEGERE: unice pe instanță, id-ul în lume e instanța/nodul)',
    doc: (() => {
      const d = docV23([piesaDoua()], [placutaDoua('i1')]);
      intrare0(d, 'u')['copii'] = [{ ...litera('w1', 0), id: 'q2' }, litera('w2', 6)];
      return d;
    })(),
    categorie: 'texte', camp: `${CT0}.u.copii.0.id`, motiv: 'ADR 0210 §7: unice; ADR 0024: id-ul în lume',
  },
  { nume: 'TD8 o literă cu id-ul „a b”', doc: stricat((d) => { litera0(d, 0)['id'] = 'a b'; }), categorie: 'id', camp: `${CT0}.t.copii.0.id`, motiv: 'ADR 0024: formatul id-ului' },
  { nume: 'TD9 o literă cu id-ul 7', doc: stricat((d) => { litera0(d, 0)['id'] = 7; }), categorie: 'schema', camp: `${CT0}.t.copii.0.id`, motiv: 'ADR 0024: id-ul e un text' },
  { nume: 'TE0 matricea unei litere cu NaN', doc: stricat((d) => { (litera0(d, 0)['matrice'] as Liber)['e'] = Number.NaN; }), categorie: 'finit', camp: `${CT0}.t.copii.0.matrice`, motiv: 'ADR 0024, precizarea 5: nimic NaN pe pânză' },
  { nume: 'TE1 o literă fără matrice', doc: stricat((d) => { delete litera0(d, 0)['matrice']; }), categorie: 'schema', camp: `${CT0}.t.copii.0.matrice`, motiv: 'ADR 0024: nodul are matricea' },
  {
    nume: 'TE2 conturul unei litere cu o formă necunoscută', doc: stricat((d) => { ((litera0(d, 1)['copii'] as Liber[])[0] as Liber)['forma'] = { tip: 'litera' }; }),
    categorie: 'schema', camp: `${CT0}.t.copii.1.copii.0.forma`, motiv: 'ADR 0024, 0034: formele cunoscute',
  },
  {
    nume: 'TE3 conturul unei litere cu un singur vârf',
    doc: stricat((d) => { ((litera0(d, 1)['copii'] as Liber[])[0] as Liber)['forma'] = { tip: 'cale', inchis: true, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }] }; }),
    categorie: 'cale', camp: `${CT0}.t.copii.1.copii.0.forma`, motiv: 'ADR 0034 §2: cel puțin 2 vârfuri',
  },
  { nume: 'TE4 un grup de literă fără copii', doc: stricat((d) => { (intrare0(d)['copii'] as Liber[]).push({ tip: 'grup', id: 'q4', matrice: I() }); }), categorie: 'schema', camp: `${CT0}.t.copii.3`, motiv: 'ADR 0024: grupul are copii' },
  { nume: 'TE5 o literă dusă afară din margini (10 000 000 mm)', doc: stricat((d) => { litera0(d, 0)['matrice'] = T(10_000_000, 0); }), categorie: 'margini', camp: `${CT0}.t.copii.0`, motiv: 'ADR 0024, precizarea 5: lumea e mărginită' },
  {
    nume: 'TE6 o literă cu arce sub o scalare neuniformă', doc: stricat((d) => { (intrare0(d)['copii'] as Liber[]).push({ tip: 'grup', id: 'q4', matrice: M(2, 0, 0, 1, 20, 0), copii: [literaArc('q5', 0)] }); }),
    categorie: 'forma', camp: `${CT0}.t.copii.3`, motiv: 'ADR 0024, precizarea 5: arcele doar sub o similitudine',
  },
  {
    nume: 'TE7 o literă dreptunghi cu lățimea negativă',
    doc: stricat((d) => { (intrare0(d)['copii'] as Liber[]).push({ tip: 'element', id: 'q4', forma: { tip: 'dreptunghi', latime: -1, inaltime: 1, razaColt: 0 }, matrice: I() }); }),
    categorie: 'pozitiv', camp: `${CT0}.t.copii.3.forma`, motiv: 'ADR 0024, precizarea 4: mărimile strict pozitive',
  },
  { nume: 'TE8 o literă cu numele de 201 caractere', doc: stricat((d) => { litera0(d, 0)['nume'] = 'x'.repeat(201); }), categorie: 'plafon', camp: `${CT0}.t.copii.0.nume`, motiv: 'ADR 0024, precizarea 4: cel mult 200' },
  { nume: 'TE9 o literă de tipul „nod”', doc: stricat((d) => { (intrare0(d)['copii'] as Liber[]).push({ tip: 'nod', id: 'q4', matrice: I() }); }), categorie: 'schema', camp: `${CT0}.t.copii.3.tip`, motiv: 'ADR 0024: grup sau element' },
  // Operațiile: ale piesei, pe literele din copii.
  { nume: 'TF1 operatii o listă', doc: stricat((d) => { intrare0(d)['operatii'] = []; }), categorie: 'texte', camp: `${CT0}.t.operatii`, motiv: 'ADR 0210 §7: operația → literele' },
  { nume: 'TF2 operatii un text', doc: stricat((d) => { intrare0(d)['operatii'] = 'o3'; }), categorie: 'texte', camp: `${CT0}.t.operatii`, motiv: 'ADR 0210 §7: un dicționar' },
  { nume: 'TF3 o operație care nu e a piesei (ox)', doc: stricat((d) => { intrare0(d)['operatii'] = { ...operatiiAna(), ox: ['q1c'] }; }), categorie: 'texte', camp: `${CT0}.t.operatii.ox`, motiv: 'ADR 0210 §7: operațiile ale piesei' },
  { nume: 'TF4 o operație scrisă cu majusculă (O3)', doc: stricat((d) => { intrare0(d)['operatii'] = { O3: ['q1c'], o4: ['q1g', 'q3g'] }; }), categorie: 'texte', camp: `${CT0}.t.operatii.O3`, motiv: 'ADR 0210 §7: id-ul exact al operației' },
  { nume: 'TF5 literele unei operații ca text', doc: stricat((d) => { (intrare0(d)['operatii'] as Liber)['o3'] = 'q1c'; }), categorie: 'texte', camp: `${CT0}.t.operatii.o3`, motiv: 'ADR 0210 §7: literele tăiate, o listă' },
  { nume: 'TF6 o literă necunoscută (zz)', doc: stricat((d) => { (intrare0(d)['operatii'] as Liber)['o3'] = ['q1c', 'zz']; }), categorie: 'texte', camp: `${CT0}.t.operatii.o3`, motiv: 'ADR 0210 §7: pe literele din copii' },
  { nume: 'TF7 o literă a șablonului (s1c), nu a plăcuței', doc: stricat((d) => { (intrare0(d)['operatii'] as Liber)['o3'] = ['q1c', 's1c']; }), categorie: 'texte', camp: `${CT0}.t.operatii.o3`, motiv: 'ADR 0210 §7: pe literele din copii' },
  { nume: 'TF8 un element al piesei (rama)', doc: stricat((d) => { (intrare0(d)['operatii'] as Liber)['o3'] = ['rama']; }), categorie: 'texte', camp: `${CT0}.t.operatii.o3`, motiv: 'ADR 0210 §7: pe literele din copii' },
  { nume: 'TF9 un număr în locul unei litere', doc: stricat((d) => { (intrare0(d)['operatii'] as Liber)['o3'] = ['q1c', 7]; }), categorie: 'texte', camp: `${CT0}.t.operatii.o3`, motiv: 'ADR 0210 §7: id-urile literelor' },
  // Ciocnirile migrării (ADR 0210 §7: „o instanță care are deja un câmp necunoscut `texte` e refuzată, cu motiv”).
  { nume: 'TG0 un v22 cu literele plăcuței pe instanță', doc: docAna(22), categorie: 'ciocnire', camp: CT0, motiv: 'ADR 0210 §7: ciocnire, ca la ADR 0024 §7' },
  { nume: 'TG1 un v22 cu `texte: null` (orice valoare se ciocnește)', doc: stricat((d) => { inst0(d)['texte'] = null; }, () => docAna(22)), categorie: 'ciocnire', camp: CT0, motiv: 'ADR 0210 §7: câmpul propriu, oricare ar fi valoarea' },
  { nume: 'TG2 un v22 cu `texte: {}`', doc: stricat((d) => { inst0(d)['texte'] = {}; }, () => docAna(22)), categorie: 'ciocnire', camp: CT0, motiv: 'ADR 0210 §7: câmpul propriu, oricare ar fi valoarea' },
  { nume: 'TG3 un v21 cu literele plăcuței (trece de v21 → v22, se ciocnește la v22 → v23)', doc: docAna(21), categorie: 'ciocnire', camp: CT0, motiv: 'ADR 0210 §7, ADR 0070: tot lanțul' },
  { nume: 'TG4 un v10 cu literele plăcuței', doc: docAna(10), categorie: 'ciocnire', camp: CT0, motiv: 'ADR 0210 §7, ADR 0070: tot lanțul' },
  {
    nume: 'TG5 un v3 cu literele plăcuței (piesa fără căi, pe care v3 nu le are; literele, un câmp necunoscut până la v22)',
    doc: caV3(docV23([{ id: 'p', radacina: { tip: 'element', id: 'e', forma: dreptunghi(80, 30), matrice: I() }, operatii: [opV18({ noduri: ['e'] })] }], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') }, { piesa: 'p' })])),
    categorie: 'ciocnire', camp: CT0, motiv: 'ADR 0210 §7, ADR 0070: tot lanțul',
  },
  {
    nume: 'TG6 un v22 cu literele pe a doua instanță a celei de-a doua foi',
    doc: { ...docV23([piesaPlacuta()], [], 22), foi: [foaieV23('f1', [placuta('i1', { nume: 'Ana' })]), foaieV23('f2', [placuta('i2', { nume: 'Ion' }), placuta('i3', { nume: 'Ana' }, { t: intrareText('Ana') }, { y: 60 })])] },
    categorie: 'ciocnire', camp: 'foi.1.instante.1.texte', motiv: 'ADR 0210 §7: pe orice instanță',
  },
  // Imbricarea și o instanță fără piesă.
  {
    nume: 'TH0 imbricarea la 201 niveluri, într-un câmp necunoscut al intrării',
    doc: docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana', litereAna(), operatiiAna(), { nota: imbricat(194) }) })]),
    categorie: 'adancime', camp: '', motiv: 'ADR 0024, precizarea 5: cel mult 200 de niveluri (al documentului întreg)',
  },
  {
    nume: 'TI0 campuri o listă goală, fără texte (ADR 0024: „un dicționar text → text”, ca `texte` și `operatii`)',
    doc: stricat((d) => { const i = inst0(d); delete i['texte']; i['campuri'] = []; }),
    categorie: 'schema', camp: `${CI0}.campuri`, motiv: 'ADR 0024: campuri e un dicționar',
  },
  {
    nume: 'TH1 o plăcuță care trimite la o piesă lipsă: doar trimiterea (literele n-au ce înlocui)',
    doc: docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') }, { piesa: 'lipsa' })]),
    categorie: 'referinta', camp: `${CI0}.piesa`, motiv: 'ADR 0024: piesa există',
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Ce nu hotărăște textul (DESCHIS, antetul părții v23 a oracolului): verdictul ALEGERII; aplicația doar se raportează.

export const AMBIGUE_V23: ReadonlyArray<CazV18 & { readonly alegere: boolean; readonly adr: string }> = [
  { nume: 'Z01 un câmp fără valoare în campuri, cu textul gol', doc: docV23([piesaPlacuta()], [placuta('i1', {}, { t: intrareText('', [], {}) })]), alegere: false, adr: 'ADR 0210 §7 nu spune ce se scrie pentru o valoare lipsă; ALEGERE: refuz (textul nu se poate scrie)' },
  { nume: 'Z02 un câmp fără valoare, cu textul șablonului păstrat', doc: docV23([piesaPlacuta()], [placuta('i1', {}, { t: intrareText('{nume}') })]), alegere: false, adr: 'ca Z01' },
  { nume: 'Z03 o plăcuță fără campuri', doc: docV23([piesaPlacuta()], [placuta('i1', undefined, { t: intrareText('{nume}') })]), alegere: false, adr: 'ca Z01' },
  { nume: 'Z04 numele câmpului cu majusculă ({Nume}, campuri.nume)', doc: docV23([piesaPlacuta({ continut: '{Nume}' })], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') })]), alegere: false, adr: 'ADR 0210 §4: potrivirea „fără litere mari și diacritice” e a coloanelor CSV; ALEGERE: la ușă, cheia exactă' },
  { nume: 'Z05 „{}” în text, lângă un câmp', doc: docV23([piesaPlacuta({ continut: '{} {nume}' })], [placuta('i1', { nume: 'Ana' }, { t: intrareText('{} Ana') })]), alegere: true, adr: 'sintaxa câmpului nu e scrisă; ALEGERE: un nume nevid, deci „{}” e text' },
  { nume: 'Z06 „{{nume}}”', doc: docV23([piesaPlacuta({ continut: '{{nume}}' })], [placuta('i1', { nume: 'Ana' }, { t: intrareText('{Ana}') })]), alegere: true, adr: 'ALEGERE: acoladele dinafară rămân text (fără „scăpare”)' },
  { nume: 'Z07 un nume cu spațiu ({nume complet})', doc: docV23([piesaPlacuta({ continut: '{nume complet}' })], [placuta('i1', { 'nume complet': 'Ana Pop' }, { t: intrareText('Ana Pop') })]), alegere: true, adr: 'ADR 0210 §4: „Fă din textul ales câmpul {Coloana}” scrie numele coloanei; ALEGERE: spațiile fac parte din nume' },
  { nume: 'Z08 un nume cu diacritice ({prénom})', doc: docV23([piesaPlacuta({ continut: '{prénom}' })], [placuta('i1', { prénom: 'Zoë' }, { t: intrareText('Zoë') })]), alegere: true, adr: 'ca Z07' },
  { nume: 'Z09 spații în acolade ({ nume }), cu campuri.nume', doc: docV23([piesaPlacuta({ continut: '{ nume }' })], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana') })]), alegere: false, adr: 'ALEGERE: numele nu se taie, deci „ nume ” n-are valoare' },
  { nume: 'Z10 un Enter în acolade', doc: docV23([piesaPlacuta({ continut: '{a\nb}' })], [placuta('i1', { 'a\nb': 'X' }, { t: intrareText('X') })]), alegere: true, adr: 'ALEGERE: orice în afară de acolade' },
  { nume: 'Z11 o acoladă neînchisă înaintea unui câmp', doc: docV23([piesaPlacuta({ continut: '{nume {nr}' })], [placuta('i1', { nr: '12' }, { t: intrareText('{nume 12') })]), alegere: true, adr: 'ALEGERE: „{nume ” rămâne text' },
  {
    nume: 'Z12 „\\n” în locul lui „\\r\\n”', doc: docV23([piesaPlacuta({ continut: '{nume}\r\nMasa {nr}' })], [placuta('i1', { nume: 'Ana', nr: '3' }, { t: intrareText('Ana\nMasa 3') })]),
    alegere: false, adr: 'ADR 0210 §7: „o verificare de șiruri”; ALEGERE: exactă (spațierile ADR 0138 numără fără \\r, ușa nu)',
  },
  { nume: 'Z13 textul plăcuței gol (o celulă goală din CSV)', doc: docV23([piesaPlacuta()], [placuta('i1', { nume: '' }, { t: intrareText('', [], {}) })]), alegere: true, adr: 'marginea 1–1 000 e a blocului (ADR 0105 §3), nu a plăcuței; ALEGERE: primit' },
  { nume: 'Z14 textul plăcuței de 1 200 de caractere', doc: docV23([piesaPlacuta()], [placuta('i1', { nume: 'x'.repeat(1_200) }, { t: intrareText('x'.repeat(1_200)) })]), alegere: true, adr: 'ca Z13' },
  { nume: 'Z15 `texte: {}`', doc: stricat((d) => { inst0(d)['texte'] = {}; }), alegere: true, adr: 'ADR 0210 §7 nu spune; ALEGERE: nicio intrare de judecat, primit' },
  { nume: 'Z16 o operație cu o listă goală', doc: stricat((d) => { (intrare0(d)['operatii'] as Liber)['o4'] = []; }), alegere: true, adr: 'ALEGERE: nicio literă tăiată de ea, primit' },
  { nume: 'Z17 o literă de două ori în lista unei operații', doc: stricat((d) => { (intrare0(d)['operatii'] as Liber)['o3'] = ['q1c', 'q1c', 'q2c']; }), alegere: false, adr: 'ALEGERE: ca noduri (ADR 0025: id-uri distincte)' },
  { nume: 'Z18 grupul unei litere în lista unei operații', doc: stricat((d) => { (intrare0(d)['operatii'] as Liber)['o3'] = ['q1', 'q2c', 'q3c']; }), alegere: false, adr: 'ALEGERE: operațiile taie elemente (ADR 0025), nu grupuri' },
  {
    nume: 'Z19 o literă a altei intrări a instanței în lista unei operații',
    doc: (() => {
      const d = docV23([piesaDoua()], [placutaDoua('i1')]);
      intrare0(d, 'u')['operatii'] = { o5: ['w1c', 'w2c', 'q1c'] };
      return d;
    })(),
    alegere: false, adr: 'ADR 0210 §7: „pe literele din copii”; ALEGERE: copii intrării ei',
  },
  {
    nume: 'Z20 literele ca elemente, fără grupul literei', alegere: true, adr: 'forma literelor nu e scrisă; ALEGERE: orice nod valid',
    doc: docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana', [{ tip: 'element', id: 'q1c', forma: conturLitera(0, 0, 4, 7), matrice: I() }, { tip: 'element', id: 'q2c', forma: conturLitera(6, 0, 4, 7), matrice: I() }], { o3: ['q1c', 'q2c'] }) })]),
  },
  { nume: 'Z21 un cerc ca literă', doc: docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana', [{ tip: 'element', id: 'q1', forma: cerc(2), matrice: T(3, 3) }], {}) })]), alegere: true, adr: 'ca Z20' },
  {
    nume: 'Z22 un grup cu literele plăcuței în alt grup cu literele plăcuței (un bloc printre literele altui bloc)', alegere: false,
    adr: 'ADR 0210 §7 nu spune; ALEGERE: refuz (literele grupului dinăuntru sunt printre literele șablonului celui dinafară, înlocuite)',
    doc: (() => {
      const interior = grupText('u', '{nr}', [litera('v1', 0)], {}, T(0, -10));
      const piesa = piesaPlacuta({ grup: grupText('t', '{nume}', [...sablonNume(), interior]) });
      return docV23([piesa], [placuta('i1', { nume: 'Ana', nr: '7' }, { t: intrareText('Ana'), u: intrareText('7', [litera('x1', 0)], {}) })]);
    })(),
  },
  { nume: 'Z23 literele până pe nivelul 33 (grupul pe 2, literele 31 de niveluri)', doc: docV23([piesaPlacuta()], [placuta('i1', { nume: 'Ana' }, { t: intrareText('Ana', [literaAdanca('qa', 31)], { o3: ['qa0'] }) })]), alegere: false, adr: 'ADR 0024, precizarea 1; ALEGERE: nivelurile se socotesc de la grupul literelor' },
  { nume: 'Z24 intrarea fără operatii', doc: stricat((d) => { delete intrare0(d)['operatii']; }), alegere: false, adr: 'ADR 0210 §7 numește trei câmpuri; ALEGERE: toate cerute' },
  { nume: 'Z25 „{}” singur, cu campuri[""]', doc: docV23([piesaPlacuta({ continut: '{}' })], [placuta('i1', { '': 'x' }, { t: intrareText('x') })]), alegere: false, adr: 'ALEGERE: „{}” nu e câmp, deci textul n-are câmpuri' },
];

// ---------------------------------------------------------------------------------------------------------------
// Plafoanele de ansamblu cu literele plăcuțelor (ADR 0210 §7: „100 000 de elemente în lume, cu literele plăcuțelor”),
// la margine și peste ea. Documente mari: se construiesc la cerere, o dată.

type PlafoaneV23 = {
  readonly valide: readonly CazV18[];
  readonly refuzate: ReadonlyArray<CazV18 & { readonly categorie: CategorieO }>;
  readonly ambigue: ReadonlyArray<CazV18 & { readonly alegere: boolean; readonly adr: string }>;
};
let plafoaneConstruite: PlafoaneV23 | undefined;

/**
 * Plăcuțele la plafoane. Piesa `pm`: rădăcina `r` cu rame mici (`e1` …) și grupul de text `t` („{n}”), fără litere în
 * șablon (amprenta listei goale), deci literele plăcuțelor stau în lume la fel în orice citire (în locul literelor
 * șablonului sau pe lângă ele); cazurile cu o literă în șablon sunt ambigue.
 */
export function plafoaneV23(): PlafoaneV23 {
  if (plafoaneConstruite !== undefined) return plafoaneConstruite;
  const rame = (n: number): Liber[] => Array.from({ length: n }, (_, k) => ({ tip: 'element', id: `e${k + 1}`, forma: dreptunghi(2, 2), matrice: T(k * 3, 0) }));
  const piesa = (nRame: number, sablon: Liber[], operatii: Liber[] = []): Liber => ({
    id: 'pm', radacina: { tip: 'grup', id: 'r', matrice: I(), copii: [...rame(nRame), grupText('t', '{n}', sablon)] }, operatii,
  });
  const plac = (k: number, litere: Liber[], operatii: Liber = {}): Liber => placuta(`i${k}`, { n: 'x' }, { t: intrareText('x', litere, operatii) }, { piesa: 'pm', x: (k % 100) * 3, y: Math.floor(k / 100) * 3 });
  const doc = (p: Liber, instante: Liber[]): Liber => ({ schema: 23, rev: 0, piese: [p], foi: [{ id: 'f1', stoc: { latime: 3_000, inaltime: 3_000, grosime: 18 }, instante }] });
  const o12 = (nRame: number): Liber[] => {
    const noduri = Array.from({ length: nRame }, (_, k) => `e${k + 1}`);
    return [opV18({ id: 'o1', noduri, latura: 'exterior' }), opV18({ id: 'o2', noduri, latura: 'interior' })];
  };
  const multeLitere = (n: number): Liber[] => Array.from({ length: n }, (_, k) => litera(`q${k}`, k * 6));
  // 1 000 de plăcuțe cu 99 de rame și o literă fiecare: 1 000 · (99 + 1) = 100 000 de elemente în lume.
  const elemente = (prima: Liber[], sablon: Liber[] = []): Liber => doc(piesa(99, sablon), Array.from({ length: 1_000 }, (_, k) => plac(k + 1, k === 0 ? prima : [litera('q', 0)])));
  // 1 000 de plăcuțe cu 49 de rame tăiate de două operații (98) și o literă tăiată de amândouă (2): 100 000 de tăieturi în lume.
  const taieturi = (prima: Liber[], opsPrima: Liber): Liber => doc(piesa(49, [], o12(49)), Array.from({ length: 1_000 }, (_, k) => plac(k + 1, k === 0 ? prima : [litera('q', 0)], k === 0 ? opsPrima : { o1: ['qc'], o2: ['qc'] })));
  // O plăcuță cu n litere tăiate toate de o operație (`noduri` are cel mult 10 000, ADR 0025): de `o1`, a ramei `e1`, deci
  // în lumea instanței `o1` taie 1 + n noduri; sau, cu litera `s` în șablon, de `o3` (pe `sc`, înlocuită): n, sau 1 + n
  // dacă litera șablonului rămâne lângă ele.
  const lista = (n: number, sablon = false): Liber => {
    const litere = multeLitere(n);
    const ids = litere.map((l) => `${String(l['id'])}c`);
    const o3 = opV18({ id: 'o3', noduri: ['sc'], latura: 'exterior', scula: plata(2, 1), adancime: 1, pas: 1 });
    const ops = [opV18({ id: 'o1', noduri: ['e1'], latura: 'exterior' }), ...(sablon ? [o3] : [])];
    return doc(piesa(1, sablon ? [litera('s', 0)] : [], ops), [plac(1, litere, sablon ? { o3: ids } : { o1: ids })]);
  };
  plafoaneConstruite = {
    valide: [
      { nume: 'L01 100 000 de elemente în lume, cu literele plăcuțelor (1 000 · (99 de rame + 1 literă))', doc: elemente([litera('q', 0)]) },
      { nume: 'L03 100 000 de tăieturi în lume, cu literele plăcuțelor (1 000 · (98 + 2))', doc: taieturi([litera('q', 0)], { o1: ['qc'], o2: ['qc'] }) },
      { nume: 'L05 o operație care taie rama și 9 999 de litere ale unei plăcuțe: 10 000 de noduri (cât `noduri`, în orice citire)', doc: lista(9_999) },
    ],
    refuzate: [
      { nume: 'L02 100 001 elemente în lume: o plăcuță cu o literă în plus', doc: elemente([litera('q', 0), litera('q2', 6)]), categorie: 'margini' },
      { nume: 'L04 100 001 tăieturi în lume: o plăcuță cu o literă în plus, tăiată o dată', doc: taieturi([litera('q', 0), litera('q2', 6)], { o1: ['qc', 'q2c'], o2: ['qc'] }), categorie: 'plafon' },
    ],
    ambigue: [
      {
        nume: 'Z30 100 000 de elemente în lume cu literele plăcuțelor în locul celei a șablonului (101 000 dacă stau pe lângă ea)',
        doc: elemente([litera('q', 0)], [litera('s', 0)]), alegere: true,
        adr: 'ADR 0210 §4, §7: „lume.ts le pune în locul literelor șablonului”; ALEGERE: în locul lor, deci 100 000',
      },
      {
        nume: 'Z31 100 001 noduri, cu literele plăcuței (49 999 de litere, câte un grup și un contur, plus 3 noduri ale piesei)',
        doc: doc(piesa(1, []), [plac(1, multeLitere(49_999))]), alegere: false,
        adr: 'ADR 0024: „cel mult 100 000 de noduri” pe document; ALEGERE: literele plăcuțelor sunt noduri ale documentului',
      },
      {
        nume: 'Z32 o operație care taie rama și 10 000 de litere ale unei plăcuțe (10 001 în lume, lista de 10 000)', doc: lista(10_000), alegere: false,
        adr: 'ADR 0025: cel mult 10 000 de noduri într-o operație; ALEGERE: pe ce taie ea în lumea instanței, nu doar pe listă',
      },
      {
        nume: 'Z33 o operație a literei șablonului care taie 10 000 de litere ale unei plăcuțe (10 001 dacă litera șablonului rămâne)', doc: lista(10_000, true), alegere: true,
        adr: 'ADR 0210 §4: literele plăcuței stau în locul literelor șablonului; ALEGERE: 10 000',
      },
    ],
  };
  return plafoaneConstruite;
}

// ---------------------------------------------------------------------------------------------------------------
// Documente v23 generate: plăcuțe pe una sau două foi, cu textul, literele și operațiile lor, și câte un defect.

const VALORI_V23 = ['Ana', 'Mihaela', 'Ștefan', 'Ţuică', '12', 'a V-a', '$& $1', '{nume}', "O'Brien", 'Zoë 😀', 'Maximilian-Alexandru', '  ', 'Popescu-Ionescu'] as const;
const CAMPURI_V23 = ['nume', 'nr', 'Clasa', 'oras_1'] as const;
/** Un grup de text generat: textul e `parti[0] {c0} parti[1] … {cn} parti[n + 1]`, iar operațiile literelor lui. */
type GrupGeneratV23 = { readonly id: string; readonly parti: readonly string[]; readonly campuri: readonly string[]; readonly opContur?: string; readonly opGol?: string };

/**
 * Un document v23 din sămânță: 1–3 piese, fiecare cu 0–2 rame și 1–2 grupuri de text (câte 1–2 câmpuri, 0–4 litere în
 * șablon, alte câmpuri ale blocului), 1–2 foi cu 1–5 plăcuțe; fiecare plăcuță are valorile tuturor câmpurilor piesei ei și,
 * pe cele mai multe grupuri, literele ei (0–5), cu operațiile piesei pe ele. Textul plăcuței se scrie din aceleași bucăți
 * ca textul blocului, cu valorile puse direct (nu prin oracol).
 */
export function genereazaV23(samanta: number): Liber {
  const r = aleator(samanta);
  const intreg = (min: number, max: number): number => min + Math.floor(r() * (max - min + 1));
  const alege = <V,>(lista: readonly V[]): V => lista[Math.floor(r() * lista.length)] as V;
  const piese: Liber[] = [];
  const grupuriPiesa = new Map<string, GrupGeneratV23[]>();
  const nrPiese = intreg(1, 3);
  for (let p = 0; p < nrPiese; p++) {
    const copii: Liber[] = [];
    const operatii: Liber[] = [];
    const nrRame = intreg(0, 2);
    for (let e = 0; e < nrRame; e++) {
      copii.push({ tip: 'element', id: `e${e}`, forma: r() < 0.6 ? dreptunghi(intreg(20, 200), intreg(10, 80)) : cerc(intreg(1, 10)), matrice: T(intreg(0, 40), intreg(0, 40)) });
    }
    if (nrRame > 0) operatii.push(opV18({ id: 'o1', noduri: Array.from({ length: nrRame }, (_, e) => `e${e}`), latura: 'exterior' }));
    const grupuri: GrupGeneratV23[] = [];
    const nrGrupuri = intreg(1, 2);
    for (let g = 0; g < nrGrupuri; g++) {
      const nrCampuri = intreg(1, 2);
      const campuri: string[] = [];
      while (campuri.length < nrCampuri) {
        const c = alege(CAMPURI_V23);
        if (!campuri.includes(c)) campuri.push(c);
      }
      const parti = [alege(['', 'Masa ', 'Nr. ', 'Clasa ']), ...campuri.slice(1).map(() => alege([' ', ' · ', '\n'])), alege(['', '', ' 2026', '\nAtelier'])];
      const text = (parti[0] as string) + campuri.map((c, k) => `{${c}}${parti[k + 1] as string}`).join('');
      const sablon = Array.from({ length: intreg(0, 4) }, (_, k) => litera(`s${g}${k}`, k * 6, r() < 0.3));
      const contururi = sablon.map((l) => `${String(l['id'])}c`);
      const goluri = sablon.filter((l) => (l['copii'] as Liber[]).length > 1).map((l) => `${String(l['id'])}g`);
      const optiuni = alege<Liber>([{}, { aliniere: 'centru' }, { caseta: { fel: 'limita', latime: 70, inaltime: 20, ceruta: 7 } }, { proportii: { latime: 80, inaltime: 100 } }, { cursiv: 10, spatiere: 0.5 }, { unitate: 'pt' }, { aldin: 0.3 }]);
      copii.push(grupText(`t${g}`, text, sablon, optiuni, T(intreg(0, 20), intreg(0, 20))));
      const opContur = contururi.length > 0 ? `o${2 + 2 * g}` : undefined;
      const opGol = goluri.length > 0 ? `o${3 + 2 * g}` : undefined;
      if (opContur !== undefined) operatii.push(opV18({ id: opContur, noduri: contururi, latura: 'exterior', scula: plata(2, 1), adancime: 1, pas: 1 }));
      if (opGol !== undefined) operatii.push(opV18({ id: opGol, noduri: goluri, latura: 'interior', scula: plata(2, 1), adancime: 1, pas: 1 }));
      grupuri.push({ id: `t${g}`, parti, campuri, ...(opContur !== undefined ? { opContur } : {}), ...(opGol !== undefined ? { opGol } : {}) });
    }
    piese.push({ id: `p${p}`, radacina: { tip: 'grup', id: 'r', matrice: alege([I(), M(0, 1, -1, 0, 100, 0)]), copii }, operatii });
    grupuriPiesa.set(`p${p}`, grupuri);
  }
  const foi: Liber[] = [];
  let n = 0;
  const nrFoi = intreg(1, 2);
  for (let f = 0; f < nrFoi; f++) {
    const instante: Liber[] = [];
    const nrInst = intreg(1, 5);
    for (let k = 0; k < nrInst; k++) {
      const piesa = alege(piese);
      const grupuri = grupuriPiesa.get(String(piesa['id'])) ?? [];
      const campuri: Liber = {};
      for (const g of grupuri) for (const c of g.campuri) campuri[c] ??= alege(VALORI_V23);
      if (r() < 0.2) campuri['nota'] = 'în plus';
      const texte: Liber = {};
      let l = 0;
      for (const g of grupuri) {
        if (r() < 0.15) continue;
        const continut = (g.parti[0] as string) + g.campuri.map((c, j) => `${campuri[c] as string}${g.parti[j + 1] as string}`).join('');
        const litere = Array.from({ length: intreg(0, 5) }, (_, j) => litera(`q${++l}`, j * 6, r() < 0.3));
        const contur = litere.map((x) => `${String(x['id'])}c`);
        const gol = litere.filter((x) => (x['copii'] as Liber[]).length > 1).map((x) => `${String(x['id'])}g`);
        const ops: Liber = {};
        if (g.opContur !== undefined && contur.length > 0) ops[g.opContur] = contur;
        if (g.opGol !== undefined && gol.length > 0) ops[g.opGol] = gol;
        if (contur.length > 0 && r() < 0.15 && (piesa['operatii'] as Liber[]).some((o) => o['id'] === 'o1')) ops['o1'] = [contur[0] as string];
        texte[g.id] = { continut, copii: litere, operatii: ops, ...(r() < 0.1 ? { nota: 'din CSV' } : {}) };
      }
      instante.push({
        id: `i${n++}`, piesa: piesa['id'], x: intreg(0, 200), y: intreg(0, 150), rotire: alege([0, 90, 180, 270, 30]), campuri,
        ...(Object.keys(texte).length > 0 ? { texte } : {}),
      });
    }
    foi.push({ id: `f${f + 1}`, stoc: { latime: 600, inaltime: 400, grosime: 18 }, instante });
  }
  return { schema: 23, rev: intreg(0, 50), piese, foi };
}

/** Felurile de defecte puse într-un document generat, fiecare cu o singură categorie a oracolului. */
export const FELURI_STRICARE_V23 = [
  'continut', 'grup-lipsa', 'grup-fara-bloc', 'litera-piesa', 'litera-dubla', 'op-straina', 'ref-straina', 'amprenta', 'fara-campuri',
  'litera-nan', 'texte-null', 'ciocnire',
] as const;
export type FelStricareV23 = (typeof FELURI_STRICARE_V23)[number];

/** O copie a documentului generat, stricată într-un singur fel, cu categoria oracolului; nimic dacă felul nu se aplică. */
export function stricaV23(doc: Liber, fel: FelStricareV23): { readonly doc: Liber; readonly categorie: CategorieO } | undefined {
  const d = structuredClone(doc);
  const intrari: Array<{ readonly inst: Liber; readonly g: string; readonly intrare: Liber }> = [];
  for (const f of d['foi'] as Liber[]) {
    for (const inst of f['instante'] as Liber[]) {
      const t = inst['texte'];
      if (esteObiectC(t)) for (const [g, x] of Object.entries(t)) intrari.push({ inst, g, intrare: x as Liber });
    }
  }
  const prima = intrari[0];
  const cuLitere = intrari.find((x) => (x.intrare['copii'] as Liber[]).length > 0);
  const cuLista = intrari.find((x) => Object.values(x.intrare['operatii'] as Liber).some((l) => Array.isArray(l) && l.length > 0));
  const grupul = (x: { readonly inst: Liber; readonly g: string }): Liber => {
    const piesa = (d['piese'] as Liber[]).find((p) => p['id'] === x.inst['piesa']) as Liber;
    return ((piesa['radacina'] as Liber)['copii'] as Liber[]).find((c) => c['id'] === x.g) as Liber;
  };
  const muta = (x: { readonly inst: Liber; readonly g: string }, cheie: string): void => {
    const t = x.inst['texte'] as Liber;
    t[cheie] = t[x.g];
    delete t[x.g];
  };
  if (prima === undefined) return undefined;
  switch (fel) {
    case 'continut':
      prima.intrare['continut'] = `${String(prima.intrare['continut'])}·`;
      return { doc: d, categorie: 'texte' };
    case 'grup-lipsa':
      muta(prima, 'nuexista');
      return { doc: d, categorie: 'texte' };
    case 'grup-fara-bloc':
      muta(prima, 'r');
      return { doc: d, categorie: 'texte' };
    case 'litera-piesa':
      if (cuLitere === undefined) return undefined;
      ((cuLitere.intrare['copii'] as Liber[])[0] as Liber)['id'] = 'r';
      return { doc: d, categorie: 'texte' };
    case 'litera-dubla': {
      if (cuLitere === undefined) return undefined;
      const l = (cuLitere.intrare['copii'] as Liber[])[0] as Liber;
      ((l['copii'] as Liber[])[0] as Liber)['id'] = l['id'];
      return { doc: d, categorie: 'texte' };
    }
    case 'op-straina':
      (prima.intrare['operatii'] as Liber)['ox'] = [];
      return { doc: d, categorie: 'texte' };
    case 'ref-straina': {
      if (cuLista === undefined) return undefined;
      const ops = cuLista.intrare['operatii'] as Liber;
      const cheie = Object.keys(ops).find((k) => Array.isArray(ops[k]) && (ops[k] as unknown[]).length > 0) as string;
      (ops[cheie] as unknown[]).push('zz');
      return { doc: d, categorie: 'texte' };
    }
    case 'amprenta':
      (grupul(prima)['text'] as Liber)['amprenta'] = '0'.repeat(16);
      return { doc: d, categorie: 'texte' };
    case 'fara-campuri':
      (grupul(prima)['text'] as Liber)['continut'] = 'LEMN';
      return { doc: d, categorie: 'texte' };
    case 'litera-nan':
      if (cuLitere === undefined) return undefined;
      (((cuLitere.intrare['copii'] as Liber[])[0] as Liber)['matrice'] as Liber)['e'] = Number.NaN;
      return { doc: d, categorie: 'finit' };
    case 'texte-null':
      prima.inst['texte'] = null;
      return { doc: d, categorie: 'texte' };
    case 'ciocnire':
      d['schema'] = 22;
      return { doc: d, categorie: 'ciocnire' };
  }
}

/** Documentele v23 generate, valide (sămânțele 23 000 …). */
export const CORPUS_V23: readonly CazV18[] = Array.from({ length: 30 }, (_, k) => ({ nume: `GV23-${String(k + 1).padStart(2, '0')} generat, sămânța ${23_000 + k}`, doc: genereazaV23(23_000 + k) }));

/** Primele 12 documente generate, stricate în fiecare fel care se aplică (un defect, o categorie). */
export const OTRAVURI_V23: ReadonlyArray<{ readonly nume: string; readonly doc: Liber; readonly categorie: CategorieO }> = CORPUS_V23.slice(0, 12).flatMap((c) =>
  FELURI_STRICARE_V23.flatMap((fel) => {
    const s = stricaV23(c.doc, fel);
    return s === undefined ? [] : [{ nume: `${c.nume}, stricat: ${fel}`, doc: s.doc, categorie: s.categorie }];
  }));
