/**
 * CAZURILE v9 ale oracolului documentului (ADR 0034, felia 2.7b, sesiune independentă, scrise doar din textul ADR-ului),
 * cu ZERO importuri din `src/`. Separate de `document.cazuri.ts` ca fișierele de teste v1–v8 să nu le construiască:
 * - `MIGRARI_V8_HARTIE`: v8 → v9 pe hârtie (doar numărul; „cale” și „varfuri” necunoscute oriunde rămân);
 * - `CORPUS_V9`: generat (`genereazaV8` adus la v9, cu o parte din forme înlocuite de căi: cu arce doar unde matricea
 *   compusă e o similitudine; câmpuri necunoscute pe formă, vârf, segment, punct);
 * - `OTRAVURI_V9`: cele v8 aduse la v9 (construite din nou, unele sunt prea adânci pentru `structuredClone`), plus
 *   `OTRAVURI_CALE` (§1–§2, câte o categorie);
 * - `OTRAVURI_PLAFOANE_CALE` și `VALIDE_PLAFOANE_CALE`: documente mari, peste și exact la cele trei plafoane (50 000 pe
 *   cale, 200 000 în piese, 1 000 000 în lume);
 * - `REFUZATE_V8` (un v8 cu o cale) și `VALIDE_DIFICILE_V9` (cele v8 aduse la v9, plus căi care seamănă cu otrăvuri).
 */
import type { CategorieO, DocV8O, DocV9O, InstantaO, Liber, MatriceO, NodO } from './document.ts';
import {
  aleator, genereazaV8, laV5, lenes, laV6, laV7, laV8, OTRAVURI_COLTURI, OTRAVURI_INTRARI, OTRAVURI_RAMPA, OTRAVURI_URECHI, otravuriArbore,
  otravuriOperatii, otravuriSens, VALIDE_DIFICILE_V8, type Otrava, type Refuzat,
} from './document.cazuri.ts';

const esteObiectL = (v: unknown): v is Liber => typeof v === 'object' && v !== null && !Array.isArray(v);
const I = (): MatriceO => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
const inst = (id: string, p: string, x: number, y: number, rotire: number): InstantaO => ({ id, piesa: p, x, y, rotire });

/**
 * Forma v9 a unui document v8 (sau a unei otrăvi v8): schema 8 devine 9, iar o schemă 9 (otrava „schema mai nouă” a
 * lui v8) devine 11, ca să rămână otravă; „8” devine „9”. Nimic altceva (ADR 0034 §3). Pe loc; întoarce documentul.
 * Felia 2.3c-2 (ADR 0037): 11, nu 10: ușa curentă (a oracolului și a aplicației) e v10, deci „mai nouă” e de acum 11.
 * Felia 5.1↑ (ADR 0069): 12, nu 11: ușa curentă e v11.
 */
const laV9 = (d: unknown): unknown => {
  if (!esteObiectL(d)) return d;
  if (d['schema'] === 8) d['schema'] = 9;
  else if (d['schema'] === 9) d['schema'] = 16;
  else if (d['schema'] === '8') d['schema'] = '9';
  return d;
};

/** Constructorii căii (coordonatele elementului). */
const pc = (x: number, y: number): Liber => ({ x, y });
const vL = (x: number, y: number): Liber => ({ p: pc(x, y), s: { tip: 'L' } });
const vA = (x: number, y: number, bulge: number): Liber => ({ p: pc(x, y), s: { tip: 'A', bulge } });
const vC = (x: number, y: number, c1x: number, c1y: number, c2x: number, c2y: number): Liber => ({ p: pc(x, y), s: { tip: 'C', c1: pc(c1x, c1y), c2: pc(c2x, c2y) } });
export const formaCale = (varfuri: Liber[], extra: Liber = {}): Liber => ({ ...extra, tip: 'cale', inchis: true, varfuri });
/** Calea amestecată: linie, arc, cubică, linie (40 × 20 de cutie). */
export const caleMixta = (): Liber => formaCale([vL(0, 0), vA(30, 0, 0.4), vC(30, 15, 22, 24, 8, 24), vL(0, 15)]);
/** Fără arce: linii și o cubică (trece prin orice matrice afină). */
export const caleFaraArce = (): Liber => formaCale([vL(0, 0), vL(30, 0), vC(30, 15, 22, 24, 8, 24), vL(0, 15)]);
/** O cale cu n vârfuri pe un cerc de rază r (linii), pentru plafoane. */
export function caleLunga(n: number, r = 100): Liber {
  return formaCale(Array.from({ length: n }, (_, k) => vL(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n))));
}
/** Câte vârfuri de cale are un document (toate piesele), pentru filtrarea documentelor mari. */
export function varfuriDeCale(d: unknown): number {
  if (!esteObiectL(d) || !Array.isArray(d['piese'])) return 0;
  let n = 0;
  const stiva: unknown[] = (d['piese'] as unknown[]).map((p) => (esteObiectL(p) ? p['radacina'] : null));
  for (let x = stiva.pop(); x !== undefined; x = stiva.pop()) {
    if (!esteObiectL(x)) continue;
    if (Array.isArray(x['copii'])) stiva.push(...(x['copii'] as unknown[]));
    const f = x['forma'];
    if (esteObiectL(f) && f['tip'] === 'cale' && Array.isArray(f['varfuri'])) n += (f['varfuri'] as unknown[]).length;
  }
  return n;
}

/**
 * Migrări v8 → v9 pe hârtie (ADR 0034 §3): doar `schema: 9`; tot restul rămâne, cu câmpurile necunoscute (și un câmp
 * necunoscut „cale” sau „varfuri” oriunde: nu e o ciocnire, v9 n-are câmpuri noi).
 */
export const MIGRARI_V8_HARTIE: ReadonlyArray<{ readonly nume: string; readonly v8: DocV8O; readonly v9: Liber }> = [
  {
    nume: 'MV8-01 o piesă cu dreptunghi și cerc, operații cu toți parametrii; „cale” și „varfuri” necunoscute pe formă, piesă, operație, sus',
    v8: {
      schema: 8, rev: 4, cale: 'sus', varfuri: [1],
      piese: [{
        id: 'p1', cale: { tip: 'cale' },
        radacina: {
          tip: 'grup', id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
          copii: [
            { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 80, inaltime: 50, razaColt: 0, varfuri: 'x' }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
            { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 5 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 10 } },
          ],
        },
        operatii: [
          { id: 'o1', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'exterior', adancime: 12, pas: 4, sens: 'opozitie', urechi: { numar: 4, latime: 8, grosime: 2 }, rampa: { lungime: 10 }, intrari: null, colturi: null, cale: 1 },
          { id: 'o2', tip: 'profil', noduri: ['c'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 8, pas: 4, sens: 'urcare', urechi: null, rampa: null, intrari: { raza: 3 }, colturi: { tip: 'dog-bone', joc: 1 } },
        ],
      }],
      foi: [{ id: 'f1', stoc: { latime: 600, inaltime: 400, grosime: 18 }, instante: [{ id: 'i1', piesa: 'p1', x: 10, y: 10, rotire: 0 }] }],
    } as DocV8O,
    v9: {
      schema: 9, rev: 4, cale: 'sus', varfuri: [1],
      piese: [{
        id: 'p1', cale: { tip: 'cale' },
        radacina: {
          tip: 'grup', id: 'g', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
          copii: [
            { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 80, inaltime: 50, razaColt: 0, varfuri: 'x' }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } },
            { tip: 'element', id: 'c', forma: { tip: 'cerc', raza: 5 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 20, f: 10 } },
          ],
        },
        operatii: [
          { id: 'o1', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'exterior', adancime: 12, pas: 4, sens: 'opozitie', urechi: { numar: 4, latime: 8, grosime: 2 }, rampa: { lungime: 10 }, intrari: null, colturi: null, cale: 1 },
          { id: 'o2', tip: 'profil', noduri: ['c'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 8, pas: 4, sens: 'urcare', urechi: null, rampa: null, intrari: { raza: 3 }, colturi: { tip: 'dog-bone', joc: 1 } },
        ],
      }],
      foi: [{ id: 'f1', stoc: { latime: 600, inaltime: 400, grosime: 18 }, instante: [{ id: 'i1', piesa: 'p1', x: 10, y: 10, rotire: 0 }] }],
    },
  },
  {
    nume: 'MV8-02 un document gol (o foaie, nicio piesă)',
    v8: { schema: 8, rev: 0, piese: [], foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 10 }, instante: [] }] } as DocV8O,
    v9: { schema: 9, rev: 0, piese: [], foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 100, grosime: 10 }, instante: [] }] },
  },
];

/**
 * Un document v9 din sămânță, valid: `genereazaV8(samanta)` adus la v9, cu o parte din forme înlocuite de căi: o cale CU
 * arce doar unde forma veche avea arce (cercul, dreptunghiul rotunjit: matricea compusă e acolo o similitudine), altfel
 * doar linii și cubice (orice matrice afină); uneori câmpuri necunoscute pe formă, pe vârf, pe segment și pe punct.
 */
export function genereazaV9(samanta: number, mare = false): DocV9O {
  const v9 = laV9(genereazaV8(samanta, mare)) as DocV9O;
  const r = aleator(samanta + 0x0a34);
  const extra = (): Liber => (r() < 0.15 ? { nota: `n${Math.floor(r() * 100)}` } : {});
  const punct = (x: number, y: number): Liber => ({ ...extra(), x, y });
  const cale = (cuArce: boolean): Liber => {
    const n = 2 + Math.floor(r() * 7);
    const varfuri: Liber[] = [];
    for (let k = 0; k < n; k++) {
      const u = (2 * Math.PI * k) / n, raza = 5 + 20 * r();
      const x = Math.round(raza * Math.cos(u) * 1000) / 1000, y = Math.round(raza * Math.sin(u) * 1000) / 1000;
      const t = r();
      const s: Liber = t < 0.4 ? { tip: 'L' }
        : t < 0.65 && cuArce ? { tip: 'A', bulge: (r() < 0.5 ? -1 : 1) * (0.05 + 0.9 * r()) }
          : { tip: 'C', c1: punct(x + 10 * (r() - 0.5), y + 10 * (r() - 0.5)), c2: punct(x + 10 * (r() - 0.5), y + 10 * (r() - 0.5)) };
      varfuri.push({ ...extra(), p: punct(x, y), s: { ...extra(), ...s } });
    }
    // Un arc între două vârfuri identice n-ar avea cerc: n ≥ 2 vârfuri pe un cerc, deci distincte.
    return { ...extra(), tip: 'cale', inchis: true, varfuri };
  };
  const stiva: Liber[] = v9.piese.map((p) => p.radacina as unknown as Liber);
  for (let x = stiva.pop(); x !== undefined; x = stiva.pop()) {
    if (x['tip'] === 'grup') { stiva.push(...(x['copii'] as Liber[])); continue; }
    if (r() > 0.3) continue;
    const f = x['forma'] as Liber;
    const cuArce = f['tip'] === 'cerc' || (f['tip'] === 'dreptunghi' && (f['razaColt'] as number) > 0);
    x['forma'] = cale(cuArce);
  }
  return v9;
}

export type CazV9 = { readonly nume: string; readonly doc: DocV9O };

export const CORPUS_V9: readonly CazV9[] = [
  ...Array.from({ length: 16 }, (_, k) => ({ nume: `GV9-${String(k + 1).padStart(2, '0')} generat, sămânța ${9000 + k}`, doc: genereazaV9(9000 + k) })),
  { nume: 'GV9-17 generat mare: 40 de piese, 3 foi, sămânța 99', doc: genereazaV9(99, true) },
];

/** Un v9 cu o singură piesă, un singur element (forma dată, sub matricea dată), pusă cu `instante` instanțe. */
export function docCale(forma: Liber, o: { readonly matrice?: MatriceO; readonly instante?: number; readonly grup?: MatriceO } = {}): DocV9O {
  const element: Liber = { tip: 'element', id: 'e', forma, matrice: o.matrice ?? I() };
  return {
    schema: 9, rev: 0,
    piese: [{ id: 'p', radacina: (o.grup ? { tip: 'grup', id: 'g', matrice: o.grup, copii: [element] } : element) as unknown as NodO, operatii: [] }],
    foi: [{ id: 'f1', stoc: { latime: 400, inaltime: 300, grosime: 18 }, instante: Array.from({ length: o.instante ?? 1 }, (_, k) => inst(`i${k}`, 'p', 50, 50, 0)) }],
  } as DocV9O;
}

/** Un v9 cu `n` piese, fiecare cu o cale de `varfuri` vârfuri, cu `instante[k]` instanțe pentru piesa k (implicit 1). */
export function docPieseCale(varfuri: readonly number[], instante: readonly number[] = []): DocV9O {
  const piese = varfuri.map((n, k) => ({ id: `p${k}`, radacina: { tip: 'element', id: 'e', forma: caleLunga(n), matrice: I() } as unknown as NodO, operatii: [] }));
  const lista: InstantaO[] = [];
  varfuri.forEach((_, k) => { for (let j = 0; j < (instante[k] ?? 1); j++) lista.push(inst(`i${k}x${j}`, `p${k}`, 200 + j, 150, 0)); });
  return { schema: 9, rev: 0, piese, foi: [{ id: 'f1', stoc: { latime: 400, inaltime: 300, grosime: 18 }, instante: lista }] } as DocV9O;
}

/** Calea de bază a otrăvurilor (mixtă), sub identitate; `strica` o schimbă pe loc. */
const otravaCale = (nume: string, categorie: CategorieO, strica: (f: Liber, d: DocV9O) => void, o: Parameters<typeof docCale>[1] = {}): Otrava => {
  const d = docCale(caleMixta(), o);
  strica(((d.piese[0]!.radacina as unknown as Liber)['tip'] === 'grup'
    ? (((d.piese[0]!.radacina as unknown as Liber)['copii'] as Liber[])[0]!['forma'])
    : (d.piese[0]!.radacina as unknown as Liber)['forma']) as Liber, d);
  return { nume, doc: d, categorie };
};
const varf = (f: Liber, k: number): Liber => (f['varfuri'] as Liber[])[k]!;
/** Bulge-ul (sub 1) al arcului cu coarda c și raza r: rădăcina mică a lui b + 1/b = 4r / c, scrisă fără scădere. */
export const bulgeLaRaza = (c: number, r: number): number => { const q = (4 * r) / c; return 2 / (q + Math.sqrt(q * q - 4)); };
const seg = (f: Liber, k: number): Liber => varf(f, k)['s'] as Liber;
const SHEAR: MatriceO = { a: 1, b: 0, c: 0.5, d: 1, e: 0, f: 0 };

export const OTRAVURI_CALE: readonly Otrava[] = [
  otravaCale('L01 inchis false (o cale deschisă, a lui 2.3c)', 'cale', (f) => { f['inchis'] = false; }),
  otravaCale('L02 inchis lipsă', 'cale', (f) => { delete f['inchis']; }),
  otravaCale('L03 inchis „true” (text)', 'cale', (f) => { f['inchis'] = 'true'; }),
  otravaCale('L04 inchis 1', 'cale', (f) => { f['inchis'] = 1; }),
  otravaCale('L05 varfuri lipsă', 'cale', (f) => { delete f['varfuri']; }),
  otravaCale('L06 varfuri {} (nu listă)', 'cale', (f) => { f['varfuri'] = {}; }),
  otravaCale('L07 nicio vârf', 'cale', (f) => { f['varfuri'] = []; }),
  otravaCale('L08 un singur vârf', 'cale', (f) => { f['varfuri'] = [vL(0, 0)]; }),
  otravaCale('L09 un vârf care nu e obiect (3)', 'cale', (f) => { (f['varfuri'] as unknown[])[1] = 3; }),
  otravaCale('L10 un vârf fără p', 'cale', (f) => { delete varf(f, 2)['p']; }),
  otravaCale('L11 p.x „3” (text)', 'schema', (f) => { (varf(f, 1)['p'] as Liber)['x'] = '3'; }),
  otravaCale('L12 p.y NaN', 'finit', (f) => { (varf(f, 1)['p'] as Liber)['y'] = NaN; }),
  otravaCale('L13 p.x Infinity', 'finit', (f) => { (varf(f, 0)['p'] as Liber)['x'] = Infinity; }),
  otravaCale('L14 p.x 10 000 000,001 (peste PLAFON.translatie)', 'margini', (f) => { (varf(f, 3)['p'] as Liber)['x'] = 10_000_000.001; }),
  otravaCale('L15 p.y −10 000 001', 'margini', (f) => { (varf(f, 3)['p'] as Liber)['y'] = -10_000_001; }),
  otravaCale('L16 un vârf fără s', 'cale', (f) => { delete varf(f, 0)['s']; }),
  otravaCale('L17 s „L” (text, nu obiect)', 'cale', (f) => { varf(f, 0)['s'] = 'L'; }),
  otravaCale('L18 s.tip „Q” (necunoscut)', 'cale', (f) => { seg(f, 0)['tip'] = 'Q'; }),
  otravaCale('L19 s.tip „l” (literă mică)', 'cale', (f) => { seg(f, 0)['tip'] = 'l'; }),
  otravaCale('L20 s fără tip', 'cale', (f) => { delete seg(f, 0)['tip']; }),
  otravaCale('L21 arc cu bulge 0', 'cale', (f) => { seg(f, 1)['bulge'] = 0; }),
  otravaCale('L22 arc cu bulge −0', 'cale', (f) => { seg(f, 1)['bulge'] = -0; }),
  otravaCale('L23 arc fără bulge', 'schema', (f) => { delete seg(f, 1)['bulge']; }),
  otravaCale('L24 arc cu bulge NaN', 'finit', (f) => { seg(f, 1)['bulge'] = NaN; }),
  otravaCale('L25 arc cu bulge Infinity', 'finit', (f) => { seg(f, 1)['bulge'] = Infinity; }),
  otravaCale('L26 arc cu capetele în același punct (vârful următor identic)', 'cale', (f) => { (varf(f, 2)['p'] as Liber)['x'] = 30; (varf(f, 2)['p'] as Liber)['y'] = 0; }),
  otravaCale('L27 arcul ultimului vârf, spre primul, în același punct', 'cale', (f) => { f['varfuri'] = [vL(0, 0), vL(10, 5), vL(5, 5), vA(0, 0, 0.3)]; }),
  otravaCale('L28 cubică fără c1', 'cale', (f) => { delete seg(f, 2)['c1']; }),
  otravaCale('L29 cubică cu c2.x peste 10⁷', 'margini', (f) => { (seg(f, 2)['c2'] as Liber)['x'] = 2e7; }),
  otravaCale('L30 cubică cu c1.y NaN', 'finit', (f) => { (seg(f, 2)['c1'] as Liber)['y'] = NaN; }),
  otravaCale('L31 cale cu arce sub o forfecare (arcul ar deveni elipsă)', 'forma', () => {}, { matrice: SHEAR }),
  otravaCale('L32 cale cu arce sub un grup scalat neuniform (matricea compusă)', 'forma', () => {}, { grup: { a: 2, b: 0, c: 0, d: 1, e: 0, f: 0 } }),
  otravaCale('L33 tipul formei „Cale”', 'schema', (f) => { f['tip'] = 'Cale'; }),
  // ADR 0034 §2 (precizarea recenziei): raza (c / 4)·(b + 1/b) cel mult `PLAFON.latura` = 10 000 mm. Arcul căii mixte
  // are coarda 15: bulge 1e-6 dă 3,75·10⁶ mm, bulge 10⁶ tot 3,75·10⁶ (aproape un cerc întreg), iar `bulgeLaRaza` dă raza
  // cerută exact.
  otravaCale('L34 arc cu bulge 1e-6 pe coarda de 15 (raza 3,75·10⁶ mm, un cerc aproape plat)', 'plafon', (f) => { seg(f, 1)['bulge'] = 1e-6; }),
  otravaCale('L35 arc cu bulge 10⁶ pe coarda de 15 (raza 3,75·10⁶ mm, aproape un cerc întreg)', 'plafon', (f) => { seg(f, 1)['bulge'] = 1e6; }),
  otravaCale('L36 arc cu raza 10 000,01 mm (chiar peste plafon), bulge negativ', 'plafon', (f) => { seg(f, 1)['bulge'] = -bulgeLaRaza(15, 10_000.01); }),
];

/** Otrăvurile plafoanelor (documente mari). */
export const OTRAVURI_PLAFOANE_CALE: readonly Otrava[] = [
  { nume: 'P01 o cale cu 50 001 de vârfuri', categorie: 'plafon', doc: docCale(caleLunga(50_001)) },
  // Exact cu unu peste fiecare plafon (felia 2.7b, după trecerea de sabotaj: cu doi peste, un plafon greșit cu unu trecea).
  { nume: 'P02 trei căi de 50 000, una de 49 999 și una de 2: 200 001 de vârfuri în piese', categorie: 'plafon', doc: docPieseCale([50_000, 50_000, 50_000, 49_999, 2]) },
  { nume: 'P03 piesele fără instanțe se numără: 200 001 în piese, doar prima pusă', categorie: 'plafon', doc: docPieseCale([50_000, 50_000, 50_000, 49_999, 2], [1, 0, 0, 0, 0]) },
  { nume: 'P04 în lume: o cale de 50 000 pusă de 19 ori, una de 49 999 și una de 2, puse o dată (1 000 001)', categorie: 'margini', doc: docPieseCale([50_000, 49_999, 2], [19, 1, 1]) },
];

export const OTRAVURI_V9: readonly Otrava[] = [
  // Otrăvurile v8 construite din nou (unele sunt prea adânci pentru `structuredClone`), aduse la v9, pe loc.
  ...[...otravuriArbore(4), ...otravuriOperatii(4), ...otravuriSens()].map((o) => ({
    nume: o.nume.startsWith('v4 ') ? `v9 ${o.nume.slice(3)}` : `v9 ${o.nume}`, doc: laV9(laV8(laV7(laV6(laV5(o.doc))))), categorie: o.categorie,
  })),
  ...OTRAVURI_URECHI.map((o) => ({ nume: `v9 ${o.nume}`, doc: laV9(laV8(laV7(laV6(structuredClone(o.doc))))), categorie: o.categorie })),
  ...OTRAVURI_RAMPA.map((o) => ({ nume: `v9 ${o.nume}`, doc: laV9(laV8(laV7(structuredClone(o.doc)))), categorie: o.categorie })),
  ...OTRAVURI_INTRARI.map((o) => ({ nume: `v9 ${o.nume}`, doc: laV9(laV8(structuredClone(o.doc))), categorie: o.categorie })),
  ...OTRAVURI_COLTURI.map((o) => ({ nume: `v9 ${o.nume}`, doc: laV9(structuredClone(o.doc)), categorie: o.categorie })),
  ...OTRAVURI_CALE,
];

/**
 * Un v8 cu o formă `cale`: nu e un v8 valid (forma nu există acolo), deci ușa îl refuză, cu motiv, nu-l migrează (ADR 0034
 * §3, precizarea din 11.10, la constatarea oracolului).
 */
export const REFUZATE_V8: readonly Refuzat[] = [
  { nume: 'Z11 un v8 cu o formă cale (scris greșit ca 8)', motiv: 'schema', doc: { ...docCale(caleMixta()), schema: 8 } },
];

export type CazValidV9 = { readonly nume: string; readonly doc: DocV9O };

const capcane = JSON.parse('{"__proto__": "x", "constructor": "c", "toString": "t"}') as Liber;

export const VALIDE_DIFICILE_V9: readonly CazValidV9[] = [
  // Documentele v8 n-au căi, deci niciunul nu e mare după vârfuri; copiate la prima citire (`lenes`).
  ...VALIDE_DIFICILE_V8.map((c) => lenes(`${c.nume} (v9)`, () => laV9(structuredClone(c.doc)) as DocV9O)),
  {
    nume: 'K01 câmpuri necunoscute pe formă, pe vârf, pe segment și pe punct (și chei capcană din JSON.parse)',
    doc: docCale({
      ...capcane, culoare: 'rosu', tip: 'cale', inchis: true,
      varfuri: [
        { ...capcane, nota: 1, p: { ...capcane, x: 0, y: 0, z: 3 }, s: { ...capcane, tip: 'L', grosime: 2 } },
        { p: { x: 30, y: 0, ce: [1] }, s: { tip: 'A', bulge: 0.4, sens: 'x' } },
        { p: { x: 30, y: 15 }, s: { tip: 'C', c1: { x: 22, y: 24, z: null }, c2: { ...capcane, x: 8, y: 24 }, nume: 'c' } },
        { p: { x: 0, y: 15 }, s: { tip: 'L' }, rol: 'colt' },
      ],
    }),
  },
  { nume: 'K02 doar linii și cubice sub o forfecare (trec prin orice matrice afină)', doc: docCale(caleFaraArce(), { matrice: SHEAR }) },
  { nume: 'K03 doar linii și cubice sub un grup scalat neuniform', doc: docCale(caleFaraArce(), { grup: { a: 3, b: 0, c: 0, d: 0.5, e: 0, f: 0 } }) },
  { nume: 'K04 exact 2 vârfuri: o lentilă din două arce', doc: docCale(formaCale([vA(0, 0, 0.5), vA(20, 0, 0.5)])) },
  { nume: 'K05 exact 2 vârfuri: o linie și o cubică', doc: docCale(formaCale([vL(0, 0), vC(20, 0, 15, 10, 5, 10)])) },
  // Felia 2.7b (recenzia, ADR 0034 §2): bulge −1e-12 ar da o rază de 3,5·10¹² mm, acum refuzată; −4e-4 dă 8 839 mm.
  { nume: 'K06 un arc cu capetele la 1e-9 mm (nu identice) și bulge 10⁶ (raza 2,5e-4 mm), apoi unul cu bulge −4e-4 (raza 8 839 mm)', doc: docCale(formaCale([vA(0, 0, 1e6), vA(1e-9, 0, -4e-4), vL(10, 10)])) },
  {
    // Recenzia (ADR 0034 §2): un grup cu forfecarea 10 000 compensat exact de element (în piesă: identitatea), sub
    // instanța rotită 239°: în lume, rotunjirile celor două ordini lasă o abatere de ~8,8e-13 (relativ), sub 2e-12. Cazul
    // ține verificarea lumii pe un caz neexact (o rotire cu sinusul exact ar da zero).
    nume: 'K12 cale cu arce sub un grup cu forfecarea 10 000 compensat de element, instanța rotită 239°: în lume ~8,8e-13, trece la 2e-12',
    doc: ((): DocV9O => {
      const d = docCale(caleMixta(), { grup: { a: 1, b: 0, c: 10_000, d: 1, e: 0, f: 0 }, matrice: { a: 1, b: 0, c: -10_000, d: 1, e: 0, f: 0 } });
      (d.foi[0]!.instante[0] as { rotire: number }).rotire = 239;
      return d;
    })(),
  },
  { nume: 'K11 un arc cu raza 9 999,99 mm (chiar sub plafon) pe coarda de 15', doc: docCale(formaCale([vL(0, 0), vA(30, 0, bulgeLaRaza(15, 9_999.99)), vC(30, 15, 22, 24, 8, 24), vL(0, 15)])) },
  { nume: 'K07 coordonate exact la ±10⁷ (p, c1, c2)', doc: docCale(formaCale([vL(-1e7, 1e7), vC(1e7, -1e7, 1e7, 1e7, -1e7, -1e7), vL(0, 0)])) },
  { nume: 'K08 segmente nule, vârfuri repetate și o cale care se taie singură (ușa nu judecă geometria)', doc: docCale(formaCale([vL(0, 0), vL(0, 0), vL(20, 20), vL(20, 0), vL(0, 20), vL(0, 20)])) },
  { nume: 'K09 cale cu arce sub o similitudine oglindită, rotită și scalată', doc: docCale(caleMixta(), { matrice: { a: 0, b: -2, c: -2, d: 0, e: 100, f: 50 } }) },
  { nume: 'K10 un v9 fără nicio cale (conținut v8)', doc: laV9(structuredClone(VALIDE_DIFICILE_V8[1]!.doc)) as DocV9O },
];

/** Documentele valide la plafoane (mari: se încarcă o singură dată în lipire). */
export const VALIDE_PLAFOANE_CALE: readonly CazValidV9[] = [
  { nume: 'M01 o cale cu exact 50 000 de vârfuri', doc: docCale(caleLunga(50_000)) },
  { nume: 'M02 patru căi de 50 000: exact 200 000 de vârfuri în piese', doc: docPieseCale([50_000, 50_000, 50_000, 50_000]) },
  { nume: 'M03 în lume: o cale de 50 000 pusă de 20 de ori (exact 1 000 000)', doc: docPieseCale([50_000], [20]) },
];

/** Un document „mare” pentru v9: peste 20 000 de vârfuri de cale (testele repetate îl sar). */
export function mareV9(d: unknown): boolean {
  return varfuriDeCale(d) > 20_000;
}
