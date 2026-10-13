/**
 * CAZURILE v10 ale oracolului documentului (ADR 0037 §2 și §8; felia 2.3c-2, sesiune independentă, scrise doar din
 * textul ADR-ului), cu ZERO importuri din `src/`:
 * - `VALIDE_V10`: căi deschise (linii, arce și cubice pe cele n − 1 segmente reale, ultimul segment L), câmpuri
 *   necunoscute pe formă, vârf, segment (și pe L-ul ultimului vârf) și punct, laturile `stanga` / `dreapta`, marcajul
 *   `despartire` (true / false), plus ce NU judecă ușa (potrivirea laturii cu `inchis`, geometria căii deschise);
 * - `OTRAVURI_V10`: câte o categorie fiecare (`inchis` care nu e boolean, ultimul segment care nu e L, sub 2 vârfuri,
 *   arcele reale, laturile scrise greșit, `despartire` care nu e boolean, plafonul, schema);
 * - `REFUZATE_V9` / `PRIMITE_V9`: un document marcat v9 cu conținut v10 (refuzat) și cu `despartire` necunoscut în
 *   afara operației (primit);
 * - `MIGRARI_V9_HARTIE`: v9 → v10 pe hârtie (doar numărul);
 * - `DOC_ORDINE`: ordinea de la §8 pe hârtie, cu două instanțe și patru operații pe aceeași piesă.
 */
import type { CategorieO, Liber, MatriceO } from './document.ts';
import { bulgeLaRaza } from './document.v9.cazuri.ts';
import type { DocV10O } from './document.v10.ts';

const I = (): MatriceO => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
const pc = (x: number, y: number): Liber => ({ x, y });
const vL = (x: number, y: number): Liber => ({ p: pc(x, y), s: { tip: 'L' } });
const vA = (x: number, y: number, bulge: number): Liber => ({ p: pc(x, y), s: { tip: 'A', bulge } });
const vC = (x: number, y: number, c1x: number, c1y: number, c2x: number, c2y: number): Liber => ({ p: pc(x, y), s: { tip: 'C', c1: pc(c1x, c1y), c2: pc(c2x, c2y) } });
export const deschisaO = (varfuri: Liber[], extra: Liber = {}): Liber => ({ ...extra, tip: 'cale', inchis: false, varfuri });
export const inchisaO = (varfuri: Liber[], extra: Liber = {}): Liber => ({ ...extra, tip: 'cale', inchis: true, varfuri });
/** Calea deschisă de bază: linie, arc (bulge 0,4), cubică, iar ultimul vârf (0, 15) cu segmentul L obligatoriu. */
export const deschisaMixta = (): Liber => deschisaO([vL(0, 0), vA(30, 0, 0.4), vC(30, 15, 22, 24, 8, 24), vL(0, 15)]);
/** O cale deschisă cu n vârfuri pe o spirală (linii), pentru plafon. */
export const deschisaLunga = (n: number): Liber => deschisaO(Array.from({ length: n }, (_, k) => vL(k * 0.01, Math.sin(k / 50))));

/** O operație de profil completă (v10), pe nodul `e`; `v` o schimbă. */
export const opV10 = (v: Liber = {}): Liber => ({
  id: 'o1', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'pe-linie', adancime: 3, pas: 3,
  sens: 'urcare', urechi: null, rampa: null, intrari: null, colturi: null, ...v,
});

/** Un v10 cu o piesă, un element `e` (forma dată, sub matricea dată), operațiile date, pus o dată. */
export function docV10O(forma: Liber, operatii: Liber[] = [opV10()], o: { readonly matrice?: MatriceO; readonly schema?: number } = {}): DocV10O {
  return {
    schema: o.schema ?? 10, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'element', id: 'e', forma, matrice: o.matrice ?? I() }, operatii }],
    foi: [{ id: 'f1', stoc: { latime: 400, inaltime: 300, grosime: 18 }, instante: [{ id: 'i0', piesa: 'p', x: 50, y: 50, rotire: 0 }] }],
  } as unknown as DocV10O;
}

export type CazV10 = { readonly nume: string; readonly doc: DocV10O };
export type OtravaV10 = { readonly nume: string; readonly doc: unknown; readonly categorie: CategorieO };

const formaDin = (d: DocV10O): Liber => (d.piese[0]!.radacina as unknown as Liber)['forma'] as Liber;
const varf = (f: Liber, k: number): Liber => (f['varfuri'] as Liber[])[k]!;
const ultim = (f: Liber): Liber => (f['varfuri'] as Liber[]).at(-1)!;
const SHEAR: MatriceO = { a: 1, b: 0, c: 0.5, d: 1, e: 0, f: 0 };
const OGLINDA: MatriceO = { a: -1, b: 0, c: 0, d: 1, e: 100, f: 0 };
const capcane = JSON.parse('{"__proto__": "x", "constructor": "c", "toString": "t"}') as Liber;

export const VALIDE_V10: readonly CazV10[] = [
  { nume: 'V01 linia deschisă (două vârfuri), pe linie', doc: docV10O(deschisaO([vL(10, 50), vL(110, 50)])) },
  { nume: 'V02 deschisă cu linie, arc și cubică; ultimul vârf cu L', doc: docV10O(deschisaMixta()) },
  {
    nume: 'V03 câmpuri necunoscute pe formă, pe vârf, pe segment, pe punct și pe L-ul ultimului vârf (și capcane de prototip)',
    doc: docV10O(deschisaO([
      { p: { ...pc(0, 0), z: 1 }, s: { tip: 'L', nota: 'a' }, culoare: 'rosu' }, { p: pc(30, 0), s: { tip: 'A', bulge: 0.4, sursa: 'svg' } },
      { p: pc(30, 15), s: { tip: 'C', c1: { ...pc(22, 24), w: 1 }, c2: pc(8, 24) } }, { p: { ...pc(0, 15), ...capcane }, s: { tip: 'L', ...capcane, final: true }, ultim: 1 },
    ], { strat: 'GRAVARE', ...capcane })),
  },
  { nume: 'V04 latura stanga pe o cale deschisă', doc: docV10O(deschisaMixta(), [opV10({ latura: 'stanga' })]) },
  { nume: 'V05 latura dreapta pe o cale deschisă, cu opoziție', doc: docV10O(deschisaMixta(), [opV10({ latura: 'dreapta', sens: 'opozitie' })]) },
  { nume: 'V06 stanga și dreapta pe același element (refuzul e al CAM-ului)', doc: docV10O(deschisaMixta(), [opV10({ latura: 'stanga' }), opV10({ id: 'o2', latura: 'dreapta' })]) },
  { nume: 'V07 stanga pe o cale închisă (potrivirea laturii nu e a ușii)', doc: docV10O(inchisaO([vL(0, 0), vL(40, 0), vL(40, 40), vL(0, 40)]), [opV10({ latura: 'stanga' })]) },
  { nume: 'V08 exterior pe o cale deschisă (potrivirea laturii nu e a ușii)', doc: docV10O(deschisaMixta(), [opV10({ latura: 'exterior' })]) },
  { nume: 'V09 despartire true, prin foaie', doc: docV10O(deschisaO([vL(0, 0), vL(300, 0)]), [opV10({ adancime: 18, despartire: true })]) },
  { nume: 'V10 despartire false (explicit)', doc: docV10O(deschisaMixta(), [opV10({ despartire: false })]) },
  { nume: 'V11 despartire true pe o cale închisă, la 3 mm (refuzul e al CAM-ului)', doc: docV10O(inchisaO([vL(0, 0), vL(40, 0), vL(40, 40)]), [opV10({ despartire: true })]) },
  { nume: 'V12 capetele coincid: o cale deschisă care se întoarce în vârful 0', doc: docV10O(deschisaO([vL(0, 0), vL(40, 0), vL(40, 40), vL(0, 0)])) },
  { nume: 'V13 două vârfuri identice (lungimea 0: geometria nu e a ușii)', doc: docV10O(deschisaO([vL(5, 5), vL(5, 5)])) },
  { nume: 'V14 se încrucișează (autointersecția nu e a ușii)', doc: docV10O(deschisaO([vL(0, 0), vL(40, 40), vL(40, 0), vL(0, 40)])) },
  { nume: 'V15 arcul pe ultimul segment REAL, până într-un ultim vârf egal cu primul', doc: docV10O(deschisaO([vL(0, 0), vL(10, 0), vA(10, 10, 0.5), vL(0, 0)])) },
  { nume: 'V16 deschisă cu arce sub o oglindire (similitudine)', doc: docV10O(deschisaMixta(), [opV10()], { matrice: OGLINDA }) },
  { nume: 'V17 deschisă fără arce sub o forfecare', doc: docV10O(deschisaO([vL(0, 0), vC(30, 0, 40, 10, 40, 20), vL(30, 30)]), [opV10()], { matrice: SHEAR }) },
  { nume: 'V18 arc cu raza exact la plafon pe un segment real', doc: docV10O(deschisaO([vA(0, 0, -bulgeLaRaza(15, 9_999.99)), vL(15, 0)])) },
  { nume: 'V19 fără nicio operație (o linie desenată, netăiată)', doc: docV10O(deschisaMixta(), []) },
];

/** O otravă pe calea deschisă de bază: `strica` schimbă forma (sau documentul) pe loc. */
const otrava = (nume: string, categorie: CategorieO, strica: (f: Liber, d: DocV10O) => void, o: Parameters<typeof docV10O>[2] = {}, ops?: Liber[]): OtravaV10 => {
  const d = docV10O(deschisaMixta(), ops ?? [opV10()], o);
  strica(formaDin(d), d);
  return { nume, doc: d, categorie };
};
const op0 = (d: DocV10O): Liber => (d.piese[0]!.operatii as unknown as Liber[])[0]!;

export const OTRAVURI_V10: readonly OtravaV10[] = [
  otrava('X01 inchis „false” (text)', 'cale', (f) => { f['inchis'] = 'false'; }),
  otrava('X02 inchis 0', 'cale', (f) => { f['inchis'] = 0; }),
  otrava('X03 inchis null', 'cale', (f) => { f['inchis'] = null; }),
  otrava('X04 inchis lipsă', 'cale', (f) => { delete f['inchis']; }),
  otrava('X05 ultimul segment al căii deschise e un arc', 'cale', (f) => { ultim(f)['s'] = { tip: 'A', bulge: 0.5 }; }),
  otrava('X06 ultimul segment al căii deschise e o cubică', 'cale', (f) => { ultim(f)['s'] = { tip: 'C', c1: pc(1, 1), c2: pc(2, 2) }; }),
  otrava('X07 ultimul segment are tipul „Q”', 'cale', (f) => { ultim(f)['s'] = { tip: 'Q' }; }),
  otrava('X08 ultimul vârf fără s', 'cale', (f) => { delete ultim(f)['s']; }),
  otrava('X09 s-ul ultimului vârf e textul „L”', 'cale', (f) => { ultim(f)['s'] = 'L'; }),
  otrava('X10 un singur vârf', 'cale', (f) => { f['varfuri'] = [vL(0, 0)]; }),
  otrava('X11 niciun vârf', 'cale', (f) => { f['varfuri'] = []; }),
  otrava('X12 arcul real cu capetele în același punct', 'cale', (f) => { (varf(f, 2)['p'] as Liber)['x'] = 30; (varf(f, 2)['p'] as Liber)['y'] = 0; }),
  otrava('X13 arcul real cu raza peste plafon (10 000,01 mm)', 'plafon', (f) => { (varf(f, 1)['s'] as Liber)['bulge'] = bulgeLaRaza(15, 10_000.01); }),
  otrava('X14 arcul real cu bulge 0', 'cale', (f) => { (varf(f, 1)['s'] as Liber)['bulge'] = 0; }),
  otrava('X15 latura „stânga” (cu diacritice)', 'operatie', (_f, d) => { op0(d)['latura'] = 'stânga'; }),
  otrava('X16 latura „Dreapta” (majusculă)', 'operatie', (_f, d) => { op0(d)['latura'] = 'Dreapta'; }),
  otrava('X17 latura „left”', 'operatie', (_f, d) => { op0(d)['latura'] = 'left'; }),
  otrava('X18 latura lipsă', 'operatie', (_f, d) => { delete op0(d)['latura']; }),
  otrava('X19 despartire „true” (text)', 'despartire', (_f, d) => { op0(d)['despartire'] = 'true'; }),
  otrava('X20 despartire 1', 'despartire', (_f, d) => { op0(d)['despartire'] = 1; }),
  otrava('X21 despartire null', 'despartire', (_f, d) => { op0(d)['despartire'] = null; }),
  otrava('X22 despartire {}', 'despartire', (_f, d) => { op0(d)['despartire'] = {}; }),
  // §2: arcele se judecă doar pe cele n − 1 segmente reale. Citită închis, ultimul vârf ar da un arc spre vârful 0 cu
  // raza 2,5·10⁹ mm (X23) sau cu capetele în același punct (X24): problema e DOAR regula ultimului segment.
  otrava('X23 ultimul vârf cu un arc care, citit închis, ar avea raza 2,5·10⁹ mm', 'cale', (f) => { f['varfuri'] = [vL(0, 0), vA(10, 0, 1e-9)]; }),
  otrava('X24 ultimul vârf cu un arc care, citit închis, ar avea capetele în același punct', 'cale', (f) => { f['varfuri'] = [vL(0, 0), vL(10, 5), vA(0, 0, 0.3)]; }),
  { nume: 'X25 o cale deschisă cu 50 001 de vârfuri', categorie: 'plafon', doc: docV10O(deschisaLunga(50_001)) },
  otrava('X26 p.y NaN pe ultimul vârf (punctul lui se judecă)', 'finit', (f) => { (ultim(f)['p'] as Liber)['y'] = NaN; }),
  otrava('X27 schema 11', 'schema', (_f, d) => { (d as unknown as Liber)['schema'] = 11; }),
  otrava('X28 cale deschisă cu arce sub o forfecare', 'forma', () => {}, { matrice: SHEAR }),
];

/** Documentele la plafon (mari): exact 50 000 de vârfuri pe o cale deschisă, cu tot cu vârful final. */
export const VALIDE_PLAFON_V10: readonly CazV10[] = [{ nume: 'V20 o cale deschisă cu exact 50 000 de vârfuri', doc: docV10O(deschisaLunga(50_000)) }];

/** Un document marcat v9 (altfel valid) cu conținut doar-v10: refuzat, cu categoria. */
export type RefuzatV9 = { readonly nume: string; readonly doc: unknown; readonly categorie: CategorieO };
const v9 = (forma: Liber, ops: Liber[]): unknown => docV10O(forma, ops, { schema: 9 });
const patratInchis = (): Liber => inchisaO([vL(0, 0), vL(40, 0), vL(40, 40), vL(0, 40)]);
export const REFUZATE_V9: readonly RefuzatV9[] = [
  { nume: 'R01 v9 cu inchis: false', categorie: 'cale', doc: v9(deschisaMixta(), [opV10()]) },
  { nume: 'R02 v9 cu latura stanga', categorie: 'operatie', doc: v9(patratInchis(), [opV10({ latura: 'stanga' })]) },
  { nume: 'R03 v9 cu latura dreapta', categorie: 'operatie', doc: v9(patratInchis(), [opV10({ latura: 'dreapta' })]) },
  { nume: 'R04 v9 cu despartire: true pe o operație (ciocnire, ALEGERE)', categorie: 'ciocnire', doc: v9(patratInchis(), [opV10({ despartire: true })]) },
  { nume: 'R05 v9 cu despartire: false pe o operație (ciocnire, ALEGERE)', categorie: 'ciocnire', doc: v9(patratInchis(), [opV10({ despartire: false })]) },
  { nume: 'R06 v9 cu despartire: "x" pe o operație (ciocnire, ALEGERE)', categorie: 'ciocnire', doc: v9(patratInchis(), [opV10({ despartire: 'x' })]) },
];

/** Un v9 cu `despartire` în afara operației (formă, sculă, piesă, sus, instanță): câmp necunoscut oarecare, primit. */
export const PRIMITE_V9: readonly CazV10[] = [
  { nume: 'A01 despartire pe formă', doc: v9(inchisaO([vL(0, 0), vL(40, 0), vL(40, 40)], { despartire: true }), [opV10()]) as DocV10O },
  { nume: 'A02 despartire pe sculă', doc: v9(patratInchis(), [opV10({ scula: { numar: 1, nume: 'f', diametru: 6, despartire: true } })]) as DocV10O },
  {
    nume: 'A03 despartire pe piesă, sus și pe instanță', doc: (() => {
      const d = v9(patratInchis(), [opV10()]) as Liber;
      d['despartire'] = 'sus';
      ((d['piese'] as Liber[])[0]!)['despartire'] = 1;
      (((d['foi'] as Liber[])[0]!['instante'] as Liber[])[0]!)['despartire'] = false;
      return d as unknown as DocV10O;
    })(),
  },
];

/** v9 → v10 pe hârtie: doar `schema` (o cale închisă cu arce, laturile vechi, câmpuri necunoscute oriunde). */
export const MIGRARI_V9_HARTIE: ReadonlyArray<{ readonly nume: string; readonly v9: unknown; readonly v10: unknown }> = [
  {
    nume: 'MV9-01 o cale închisă, trei operații (exterior, pe-linie, interior), câmpuri necunoscute; „inchis” și „despartire” pe formă',
    v9: {
      schema: 9, rev: 7, nota: 'sus',
      piese: [{
        id: 'p', culoare: 'x',
        radacina: { tip: 'grup', id: 'g', matrice: I(), copii: [{ tip: 'element', id: 'e', forma: { tip: 'cale', inchis: true, varfuri: [vL(0, 0), vA(40, 0, 0.3), vL(40, 40), vL(0, 40)], despartire: 'pe formă' }, matrice: I() }] },
        operatii: [opV10({ latura: 'exterior', adancime: 18, pas: 6 }), opV10({ id: 'o2', latura: 'pe-linie', adancime: 1 }), opV10({ id: 'o3', latura: 'interior' })],
      }],
      foi: [{ id: 'f1', stoc: { latime: 400, inaltime: 300, grosime: 18 }, instante: [{ id: 'i0', piesa: 'p', x: 10, y: 20, rotire: 90 }] }],
    },
    v10: {
      schema: 10, rev: 7, nota: 'sus',
      piese: [{
        id: 'p', culoare: 'x',
        radacina: { tip: 'grup', id: 'g', matrice: I(), copii: [{ tip: 'element', id: 'e', forma: { tip: 'cale', inchis: true, varfuri: [vL(0, 0), vA(40, 0, 0.3), vL(40, 40), vL(0, 40)], despartire: 'pe formă' }, matrice: I() }] },
        operatii: [opV10({ latura: 'exterior', adancime: 18, pas: 6 }), opV10({ id: 'o2', latura: 'pe-linie', adancime: 1 }), opV10({ id: 'o3', latura: 'interior' })],
      }],
      foi: [{ id: 'f1', stoc: { latime: 400, inaltime: 300, grosime: 18 }, instante: [{ id: 'i0', piesa: 'p', x: 10, y: 20, rotire: 90 }] }],
    },
  },
];

/**
 * §8 pe hârtie: piesa `p` cu cinci elemente și cinci operații, pusă de două ori (instanțele `a`, `b`), plus piesa `z`
 * (o linie, marcată) pusă o dată între ele. Operațiile, în ordinea piesei: o1 marcată despărțire pe `d1` (deschisă) și
 * pe `k` (ÎNCHISĂ: un refuz al CAM-ului, dar clasa ei rămâne a laturii, 1: §8 numește despărțiri doar tăieturile
 * DESCHISE marcate), o2 exteriorul `r`, o3 pe linie pe `d2` (deschisă, nemarcată) și pe `k`, o4 interiorul `g`, o5 pe
 * linie pe `d1` (nemarcată). Ordinea cerută (clasa, apoi instanța, operația, nodul), scrisă de mână în `ORDINE_HARTIE`.
 */
export const DOC_ORDINE: DocV10O = {
  schema: 10, rev: 0,
  piese: [
    {
      id: 'p',
      radacina: {
        tip: 'grup', id: 'g0', matrice: I(), copii: [
          { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 50, inaltime: 30, razaColt: 0 }, matrice: I() },
          { tip: 'element', id: 'g', forma: { tip: 'cerc', raza: 5 }, matrice: { ...I(), e: 25, f: 15 } },
          { tip: 'element', id: 'k', forma: inchisaO([vL(5, 5), vL(15, 5), vL(15, 10)]), matrice: I() },
          { tip: 'element', id: 'd1', forma: deschisaO([vL(-10, 40), vL(60, 40)]), matrice: I() },
          { tip: 'element', id: 'd2', forma: deschisaO([vL(30, 5), vL(40, 5)]), matrice: I() },
        ],
      },
      operatii: [
        opV10({ id: 'o1', noduri: ['d1', 'k'], adancime: 18, despartire: true }),
        opV10({ id: 'o2', noduri: ['r'], latura: 'exterior', adancime: 18 }),
        opV10({ id: 'o3', noduri: ['d2', 'k'], adancime: 1 }),
        opV10({ id: 'o4', noduri: ['g'], latura: 'interior', adancime: 18 }),
        opV10({ id: 'o5', noduri: ['d1'], adancime: 2 }),
      ],
    },
    { id: 'z', radacina: { tip: 'element', id: 'l', forma: deschisaO([vL(0, 0), vL(400, 0)]), matrice: I() }, operatii: [opV10({ id: 'o1', noduri: ['l'], adancime: 18, despartire: true })] },
  ],
  foi: [{
    id: 'f1', stoc: { latime: 400, inaltime: 300, grosime: 18 },
    instante: [{ id: 'a', piesa: 'p', x: 20, y: 20, rotire: 0 }, { id: 'm', piesa: 'z', x: 0, y: 150, rotire: 0 }, { id: 'b', piesa: 'p', x: 200, y: 20, rotire: 0 }],
  }],
} as unknown as DocV10O;

/** Ordinea cerută pentru `DOC_ORDINE`: [idLume, latura, operația, clasa]. */
export const ORDINE_HARTIE: ReadonlyArray<readonly [string, string, string, number]> = [
  ['a/g', 'interior', 'o4', 0], ['b/g', 'interior', 'o4', 0],
  ['a/k', 'pe-linie', 'o1', 1], ['a/d2', 'pe-linie', 'o3', 1], ['a/k', 'pe-linie', 'o3', 1], ['a/d1', 'pe-linie', 'o5', 1],
  ['b/k', 'pe-linie', 'o1', 1], ['b/d2', 'pe-linie', 'o3', 1], ['b/k', 'pe-linie', 'o3', 1], ['b/d1', 'pe-linie', 'o5', 1],
  ['a/r', 'exterior', 'o2', 2], ['b/r', 'exterior', 'o2', 2],
  ['a/d1', 'pe-linie', 'o1', 3], ['m/l', 'pe-linie', 'o1', 3], ['b/d1', 'pe-linie', 'o1', 3],
];
