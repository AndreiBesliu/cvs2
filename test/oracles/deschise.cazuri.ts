/**
 * Cazurile căilor deschise în poartă (ADR 0037 §7, §8, §9, §13; felia 2.3c-2, sesiune independentă, scrise doar din
 * ADR), cu ZERO importuri din `src/`: documente v10 scrise de mână și programe scrise de mână (prin scriitorul de G-code
 * din `regiune.cazuri.ts`, rotunjit la 3 zecimale ca postul, sau linie cu linie).
 *
 * Freza Ø6 (R = 3), pasul 3, Z sigur 5, F1000, plonjarea la F300, originea stânga-jos, Z0 sus, foaia 300 × 200 × 6
 * (o adâncime de 6 mm trece prin foaie). Valorile de pe hârtie sunt cele din ADR 0037, „Ce verifică oracolul”:
 * - D1, linia (10,50)→(110,50), pe linie, 3 mm: G0 X10 Y50 · G1 Z-3 F300 · G1 X110 Y50 (valoarea 1);
 * - D2, linia (0,0)→(100,0) pusă în (20, 50), pe linie, 6 mm cu pasul 3: două treceri, la −3 și −6, fiecare din vârful 0,
 *   cu ridicare și întoarcere între ele (valoarea 2);
 * - D3, semicercul R50 (50,0)→(−50,0) cu bulge 1, pus în (100, 30), pe linie (geometria valorii 3);
 * - D4, L-ul (0,0)→(100,0)→(100,100) pus în (20, 10), pe linie, 6 mm (geometria valorii 4);
 * - D5, ordinea de la §8 pe o foaie: o gaură (interior, clasa 0) într-o piesă (exterior, clasa 2), un pătrat-cale închis
 *   gravat pe linie (clasa 1), o fantă deschisă prin foaie, nemarcată (clasa 1), și o linie de la o margine a foii la
 *   cealaltă, prin foaie, marcată `despartire` (clasa 3, valoarea 14); ieșirea din foaie a liniei (R pe stânga și pe
 *   dreapta) e declarată. Nemarcată, linia se oprește la 10 mm de margini (clasa 1): de la o margine la cealaltă, §8 o
 *   refuză (martorul M17);
 * - D6, oglindirea: matricea (a = −1, e = 150, f = 50), linia (0,0)→(100,0): pe linie, din (150, 50) în (50, 50);
 * - D7, o cale care se încrucișează (permis pe linie, §4); D8, o cale deschisă care se întoarce în vârful 0; D9, o
 *   cubică deschisă.
 * Martorii negativi (poarta trebuie să iasă roșie pe fiecare) sunt în `martoriDeschise`, fiecare cu invarianta și linia
 * care trebuie să-l prindă.
 */
import type { ColturiO, IntrariO, LaturaV10O, MatriceO, RampaO, SensO, UrechiO } from './document.ts';
import type { DocV10O } from './document.v10.ts';
import { ID, inverseaza, programDinTrasee, type Montaj, type Stoc, type Traseu } from './regiune.cazuri.ts';
import { regiuneDinDocument, segment, type FormaO, type Primitiva, type VarfCale } from './regiune.ts';
import type { ContextPoarta } from './poarta.ts';

export const STOC_D: Stoc = { latime: 300, inaltime: 200, grosime: 6 };
export const DIAMETRU_D = 6;
export const PAS_D = 3;
export const MONTAJ_D: Montaj = { foaie: STOC_D, origine: 'stanga-jos', z0: 'sus' };

// ---------------------------------------------------------------------------------------------------------------
// Formele și documentul.

export const vL = (x: number, y: number): VarfCale => ({ p: { x, y }, s: { tip: 'L' } });
export const vA = (x: number, y: number, bulge: number): VarfCale => ({ p: { x, y }, s: { tip: 'A', bulge } });
export const vC = (x: number, y: number, c1x: number, c1y: number, c2x: number, c2y: number): VarfCale =>
  ({ p: { x, y }, s: { tip: 'C', c1: { x: c1x, y: c1y }, c2: { x: c2x, y: c2y } } });
/** O cale deschisă (v10): segmentul ultimului vârf trebuie să fie L. */
export const deschisa = (varfuri: readonly VarfCale[]): FormaO => ({ tip: 'cale', inchis: false, varfuri });
export const inchisa = (varfuri: readonly VarfCale[]): FormaO => ({ tip: 'cale', inchis: true, varfuri });

export type ElemD = {
  readonly id: string; readonly forma: FormaO; readonly matrice?: MatriceO; readonly latura: LaturaV10O; readonly adancime: number;
  readonly sens?: SensO; readonly despartire?: boolean;
  readonly urechi?: UrechiO | null; readonly rampa?: RampaO | null; readonly intrari?: IntrariO | null; readonly colturi?: ColturiO | null;
};
export type PiesaD = { readonly id: string; readonly x: number; readonly y: number; readonly elemente: readonly ElemD[] };

/**
 * Un document v10: fiecare piesă pusă o dată (`<piesă>/<element>` în lume), rădăcina un grup cu elementele ei, câte o
 * operație de profil pe element, în ordine, toate cu freza T1 Ø6 și pasul dat; `despartire` doar dacă e dat.
 */
export function docV10(piese: readonly PiesaD[], o: { readonly stoc?: Stoc; readonly pas?: number; readonly diametru?: number } = {}): DocV10O {
  const scula = { numar: 1, nume: 'freza plata', diametru: o.diametru ?? DIAMETRU_D };
  return {
    schema: 10,
    rev: 0,
    piese: piese.map((pz) => {
      let n = 0;
      return {
        id: pz.id,
        radacina: { tip: 'grup', id: 'rad', matrice: { ...ID }, copii: pz.elemente.map((e) => ({ tip: 'element', id: e.id, forma: structuredClone(e.forma), matrice: { ...(e.matrice ?? ID) } })) },
        operatii: pz.elemente.map((e) => ({
          id: `op${++n}`, tip: 'profil' as const, noduri: [e.id], scula: { ...scula }, latura: e.latura, adancime: e.adancime, pas: o.pas ?? PAS_D,
          sens: e.sens ?? 'urcare', urechi: e.urechi ?? null, rampa: e.rampa ?? null, intrari: e.intrari ?? null, colturi: e.colturi ?? null,
          ...(e.despartire === undefined ? {} : { despartire: e.despartire }),
        })),
      };
    }),
    foi: [{ id: 'f1', stoc: { ...(o.stoc ?? STOC_D) }, instante: piese.map((pz) => ({ id: pz.id, piesa: pz.id, x: pz.x, y: pz.y, rotire: 0 })) }],
  } as DocV10O;
}

/** Contextul porții pentru documentele de aici (freza Ø6, pasul 3, montajul stânga-jos / Z0 sus, regiunea din document). */
export function ctxD(doc: DocV10O, o: { readonly pas?: number; readonly stoc?: Stoc } = {}): ContextPoarta {
  return {
    foaie: { ...(o.stoc ?? STOC_D) }, origine: 'stanga-jos', z0: 'sus', diametruScula: DIAMETRU_D, pas: o.pas ?? PAS_D, supracursa: 0, asteptareAx: 3,
    regiune: regiuneDinDocument(doc), avansPlonjare: 300,
  };
}

// Documentele de pe hârtie (antetul).
export const D1 = (o: Partial<ElemD> = {}): DocV10O => docV10([{ id: 'a', x: 0, y: 0, elemente: [{ id: 'l', forma: deschisa([vL(10, 50), vL(110, 50)]), latura: 'pe-linie', adancime: 3, ...o }] }]);
export const D2 = (o: Partial<ElemD> = {}): DocV10O => docV10([{ id: 'b', x: 20, y: 50, elemente: [{ id: 'l', forma: deschisa([vL(0, 0), vL(100, 0)]), latura: 'pe-linie', adancime: 6, ...o }] }]);
export const D3 = (): DocV10O => docV10([{ id: 'c', x: 100, y: 30, elemente: [{ id: 's', forma: deschisa([vA(50, 0, 1), vL(-50, 0)]), latura: 'pe-linie', adancime: 3 }] }]);
export const D4 = (o: Partial<ElemD> = {}): DocV10O => docV10([{ id: 'e', x: 20, y: 10, elemente: [{ id: 'l', forma: deschisa([vL(0, 0), vL(100, 0), vL(100, 100)]), latura: 'pe-linie', adancime: 6, ...o }] }]);
/**
 * D5: ordinea. `marcata` (implicit): linia prin foaie are `despartire: true` (clasa 3); nemarcată, e în clasa 1.
 * `laMargine` (implicit: marcata): linia merge de la o margine a foii la cealaltă, (0, 150) → (300, 150); altfel
 * (10, 150) → (290, 150), la 10 mm de margini, peste R + 1 = 4 mm (§8: o linie nemarcată prin foaie care ajunge la
 * margine e refuzată; asta nu ajunge). `peste`: câmpuri schimbate pe câte o tăietură (după id-ul elementului).
 */
export function D5(o: { readonly marcata?: boolean; readonly laMargine?: boolean; readonly peste?: Readonly<Record<string, Partial<ElemD>>> } = {}): DocV10O {
  const p = (id: string): Partial<ElemD> => o.peste?.[id] ?? {};
  const laMargine = o.laMargine ?? o.marcata !== false;
  return docV10([
    {
      id: 'p', x: 20, y: 20, elemente: [
        { id: 'r', forma: { tip: 'dreptunghi', latime: 60, inaltime: 40, razaColt: 0 }, latura: 'exterior', adancime: 6, ...p('r') },
        { id: 'g', forma: { tip: 'cerc', raza: 8 }, matrice: { ...ID, e: 30, f: 20 }, latura: 'interior', adancime: 6, ...p('g') },
      ],
    },
    { id: 'q', x: 120, y: 20, elemente: [{ id: 'k', forma: inchisa([vL(0, 0), vL(20, 0), vL(20, 20), vL(0, 20)]), latura: 'pe-linie', adancime: 1, ...p('k') }] },
    { id: 's', x: 200, y: 20, elemente: [{ id: 'f', forma: deschisa([vL(0, 0), vL(0, 60)]), latura: 'pe-linie', adancime: 6, ...p('f') }] },
    {
      id: 'd', x: 0, y: 150, elemente: [{
        id: 'l', forma: deschisa(laMargine ? [vL(0, 0), vL(300, 0)] : [vL(10, 0), vL(290, 0)]), latura: 'pe-linie', adancime: 6,
        ...(o.marcata === false ? {} : { despartire: true }), ...p('l'),
      }],
    },
  ]);
}
export const D6 = (): DocV10O => docV10([{ id: 'm', x: 0, y: 0, elemente: [{ id: 'l', forma: deschisa([vL(0, 0), vL(100, 0)]), matrice: { a: -1, b: 0, c: 0, d: 1, e: 150, f: 50 }, latura: 'pe-linie', adancime: 3 }] }]);
export const D7 = (): DocV10O => docV10([{ id: 'x', x: 0, y: 0, elemente: [{ id: 'z', forma: deschisa([vL(20, 20), vL(80, 80), vL(80, 20), vL(20, 80)]), latura: 'pe-linie', adancime: 3 }] }]);
export const D8 = (): DocV10O => docV10([{ id: 't', x: 0, y: 0, elemente: [{ id: 'v', forma: deschisa([vL(20, 20), vL(80, 20), vL(80, 80), vL(20, 20)]), latura: 'pe-linie', adancime: 3 }] }]);
export const D9 = (): DocV10O => docV10([{ id: 'w', x: 0, y: 30, elemente: [{ id: 'c', forma: deschisa([vC(10, 10, 40, 60, 80, -40), vL(110, 10)]), latura: 'pe-linie', adancime: 3 }] }]);

// ---------------------------------------------------------------------------------------------------------------
// Programele.

/** Calea desenată a unei tăieturi, în lume, din regiunea oracolului (pe o cale deschisă: fără coarda de închidere). */
export function caleaDin(doc: DocV10O, idLume: string): Primitiva[] {
  const c = regiuneDinDocument(doc).taieturi.get(idLume)?.contur;
  if (!c) throw new Error(`${idLume}: fără contur`);
  return [...c.primitive];
}

/** Bucla exteriorului (urcare: orar, deci offsetul trigonometric întors) și a interiorului (urcare: trigonometric). */
export function buclaProfil(doc: DocV10O, idLume: string, latura: 'exterior' | 'interior'): Primitiva[] {
  const c = regiuneDinDocument(doc).taieturi.get(idLume)?.contur;
  const d = c?.drumIdeal(DIAMETRU_D / 2, latura);
  if (!d) throw new Error(`${idLume}: fără drum ideal`);
  return latura === 'exterior' ? inverseaza(d) : d;
}

/** Trecerile de la §7: la −3, −6, … până la adâncime, cu ridicare și întoarcere în start între ele. */
export const treceri = (adancime: number, pas = PAS_D): number[] => {
  const n = Math.ceil(adancime / pas - 1e-9);
  return Array.from({ length: n }, (_, k) => (k === n - 1 ? adancime : (k + 1) * pas));
};

export type TaieturaP = { readonly idLume: string; readonly tip: string; readonly latura: string; readonly adancime: number; readonly drum: readonly Primitiva[] };

/** Programul cu tăieturile date, în ordinea dată, fiecare cu trecerile ei (ridicare între ele). */
export function programD(taieturi: readonly TaieturaP[], extra: readonly string[] = []): string {
  const trasee: Traseu[] = taieturi.map((t) => ({
    eticheta: `${t.idLume}: ${t.tip}, ${t.latura}, ${t.adancime} mm`, primitive: t.drum, adancime: t.adancime, treceri: treceri(t.adancime), intre: 'ridica',
  }));
  return programDinTrasee(trasee, MONTAJ_D, extra);
}

/** Tăietura pe linie a unei căi, cu drumul ei din document (sau cel dat). */
export const peLinie = (doc: DocV10O, idLume: string, adancime: number, drum?: readonly Primitiva[], tip = 'cale', latura = 'pe-linie'): TaieturaP =>
  ({ idLume, tip, latura, adancime, drum: drum ?? caleaDin(doc, idLume) });

/** Declarația ieșirii din foaie a liniei din D5 (discul trece cu R pe stânga și pe dreapta). */
export const IESIRE_D5 = ['(CONFIRMAT: freza iese din foaie)', '(iesire mm: st 3.000 dr 3.000 jos 0.000 sus 0.000)'] as const;

/** O tăietură a lui D5, după litera elementului (g, k, f, r, l). */
export function taietD5(doc: DocV10O, c: string): TaieturaP {
  if (c === 'g') return { idLume: 'p/g', tip: 'cerc', latura: 'interior', adancime: 6, drum: buclaProfil(doc, 'p/g', 'interior') };
  if (c === 'k') return peLinie(doc, 'q/k', 1);
  if (c === 'f') return peLinie(doc, 's/f', 6);
  if (c === 'r') return { idLume: 'p/r', tip: 'dreptunghi', latura: 'exterior', adancime: 6, drum: buclaProfil(doc, 'p/r', 'exterior') };
  if (c === 'l') return peLinie(doc, 'd/l', 6);
  throw new Error(`D5 n-are tăietura ${c}`);
}

/** Linia din D5 merge de la o margine la cealaltă (vârful 0 pe marginea stângă). */
const liniaLaMargine = (doc: DocV10O): boolean => {
  const d = doc.piese.find((x) => x.id === 'd');
  const e = d && (d.radacina as unknown as { copii: Array<{ forma: { varfuri: Array<{ p: { x: number } }> } }> }).copii[0];
  return e?.forma.varfuri[0]?.p.x === 0;
};

/** D5 tăiat în ordinea dată (literele elementelor); declarația ieșirii doar dacă linia tăiată iese din foaie (cu R). */
export function programD5(doc: DocV10O, ordine: string): string {
  return programD([...ordine].map((c) => taietD5(doc, c)), ordine.includes('l') && liniaLaMargine(doc) ? IESIRE_D5 : []);
}

/** Programele corecte ale documentelor de pe hârtie, cu documentul lor. */
export function corecte(): Array<{ readonly nume: string; readonly doc: DocV10O; readonly text: string }> {
  const rez: Array<{ nume: string; doc: DocV10O; text: string }> = [];
  const una = (nume: string, doc: DocV10O, id: string, adancime: number): void => { rez.push({ nume, doc, text: programD([peLinie(doc, id, adancime)]) }); };
  una('D1 linia, pe linie, 3 mm', D1(), 'a/l', 3);
  una('D2 linia, pe linie, 6 mm în două treceri', D2(), 'b/l', 6);
  una('D3 semicercul R50, pe linie', D3(), 'c/s', 3);
  una('D4 L-ul, pe linie, 6 mm', D4(), 'e/l', 6);
  const d5 = D5();
  rez.push({ nume: 'D5 ordinea §8 (interior, pe linie, fanta, exterior, despărțirea)', doc: d5, text: programD5(d5, 'gkfrl') });
  const d5n = D5({ marcata: false });
  rez.push({ nume: 'D5 cu linia nemarcată (clasa 1, înaintea exteriorului)', doc: d5n, text: programD5(d5n, 'gkflr') });
  una('D6 oglindirea, pe linie', D6(), 'm/l', 3);
  una('D7 calea care se încrucișează, pe linie', D7(), 'x/z', 3);
  una('D8 calea deschisă care se întoarce în vârful 0', D8(), 't/v', 3);
  una('D9 cubica deschisă, pe linie', D9(), 'w/c', 3);
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------
// Programele scrise linie cu linie (antetul scriitorului din `regiune.cazuri.ts`).

const ANTET = ['(CNC Vector Studio)', 'G90 G17 G21 G94', 'G54', 'G0 Z5.000', 'M3 S18000', 'G4 P3.000'];
/** Un program din corpul dat (eticheta inclusă), cu antetul și finalul scriitorului de mână. */
export const programLinii = (corp: readonly string[]): string => `${[...ANTET, ...corp, 'G0 Z5.000', 'M5', 'M30'].join('\n')}\n`;

// ---------------------------------------------------------------------------------------------------------------
// Martorii negativi.

export type MartorDeschis = {
  readonly nume: string;
  readonly doc: DocV10O;
  readonly text: string;
  /** Încălcările care TREBUIE să apară: invarianta, linia (0 = pe document) și un tipar al mesajului. */
  readonly cere: ReadonlyArray<{ readonly invarianta: number; readonly linia: number; readonly tipar: RegExp }>;
};

/** Linia (numerotată de la 1) a primei apariții a textului dat, în program. */
export const liniaLui = (text: string, cauta: string, dupa = 0): number => {
  const linii = text.split('\n');
  for (let k = dupa; k < linii.length; k++) if (linii[k] === cauta) return k + 1;
  throw new Error(`„${cauta}” nu e în program`);
};

export function martoriDeschise(): MartorDeschis[] {
  const rez: MartorDeschis[] = [];
  // M1: coarda de închidere tăiată (un G1 de la Pₙ la P₀ la adâncime), pe L-ul D4: iese de pe cale și trece de capăt.
  {
    const doc = D4();
    const drum = [...caleaDin(doc, 'e/l'), segment({ x: 120, y: 110 }, { x: 20, y: 10 })];
    const text = programD([peLinie(doc, 'e/l', 6, drum)]);
    const coarda = liniaLui(text, 'G1 X20.000 Y10.000 F1000.0');
    rez.push({
      nume: 'M1 coarda de închidere tăiată pe L (ultimul vârf → vârful 0)', doc, text,
      cere: [
        { invarianta: 14, linia: coarda, tipar: /^pe linie: mișcarea iese de pe calea lui e\/l/ },
        { invarianta: 11, linia: coarda, tipar: /se oprește în \(20\.000, 10\.000\), nu în celălalt capăt \(120\.000, 110\.000\)/ },
        { invarianta: 11, linia: coarda, tipar: /o trecere e o singură parcurgere/ },
      ],
    });
  }
  // M1b: coarda pe linia dreaptă D1 stă chiar pe linie (14 (i) n-o vede): o prinde doar 11 (capătul și lungimea).
  {
    const doc = D1();
    const drum = [...caleaDin(doc, 'a/l'), segment({ x: 110, y: 50 }, { x: 10, y: 50 })];
    const text = programD([peLinie(doc, 'a/l', 3, drum)]);
    const coarda = liniaLui(text, 'G1 X10.000 Y50.000 F1000.0');
    rez.push({
      nume: 'M1b coarda de închidere pe linia dreaptă (înapoi pe linie)', doc, text,
      cere: [
        { invarianta: 11, linia: coarda, tipar: /se oprește în \(10\.000, 50\.000\), nu în celălalt capăt \(110\.000, 50\.000\)/ },
        { invarianta: 11, linia: coarda, tipar: /are 200\.000 mm în plan, iar calea 100\.000 mm/ },
      ],
    });
  }
  // M2: rampa pe o cale deschisă (ce ar face parcurgerea desfășurată, „Ce am măsurat”, punctul 6): coborârea pe segmentul
  // 0, apoi, după ultimul vârf, un G1 drept la adâncime spre începutul căii; operația are rampă (refuzul §9).
  const rampaLinii = [
    '(e/l: cale, pe-linie, 6 mm)', 'G0 X20.000 Y10.000', 'G1 Z0.000 F300.0',
    'G1 X30.000 Y10.000 Z-3.000 F1000.0', 'G1 X120.000 Y10.000', 'G1 X120.000 Y110.000', 'G1 X20.000 Y10.000',
    'G1 X30.000 Y10.000 Z-6.000', 'G1 X120.000 Y10.000', 'G1 X120.000 Y110.000', 'G1 X20.000 Y10.000', 'G1 X30.000 Y10.000',
  ];
  {
    const doc = D4({ rampa: { lungime: 10 } });
    const text = programLinii(rampaLinii);
    const intoarcere = liniaLui(text, 'G1 X20.000 Y10.000');
    rez.push({
      nume: 'M2 rampa pe o cale deschisă (G1 la adâncime de la capăt spre segmentul 0), operația cu rampă', doc, text,
      cere: [
        { invarianta: 11, linia: 0, tipar: /^căile deschise \(§9\): operația e\/op1 are cel puțin un nod deschis și rampă/ },
        { invarianta: 14, linia: intoarcere, tipar: /^pe linie: mișcarea iese de pe calea lui e\/l/ },
        { invarianta: 11, linia: liniaLui(text, 'G1 X30.000 Y10.000 Z-3.000 F1000.0'), tipar: /nu începe cu o plonjare pe verticală din aer/ },
      ],
    });
  }
  {
    const doc = D4();
    const text = programLinii(rampaLinii);
    rez.push({
      nume: 'M2b același program de rampă, pe o operație fără rampă (doar forma programului)', doc, text,
      cere: [
        { invarianta: 14, linia: liniaLui(text, 'G1 X20.000 Y10.000'), tipar: /^pe linie: mișcarea iese de pe calea lui e\/l/ },
        { invarianta: 11, linia: liniaLui(text, 'G1 X30.000 Y10.000 Z-3.000 F1000.0'), tipar: /nu începe cu o plonjare pe verticală din aer/ },
        { invarianta: 11, linia: liniaLui(text, 'G1 X30.000 Y10.000 Z-6.000'), tipar: /nu stă la adâncimea plonjării/ },
      ],
    });
  }
  // M3: zig-zag-ul la a doua trecere: la capăt, coborârea la −6 fără ridicare și drumul înapoi la adâncime.
  {
    const doc = D2();
    const text = programLinii(['(b/l: cale, pe-linie, 6 mm)', 'G0 X20.000 Y50.000', 'G1 Z-3.000 F300.0', 'G1 X120.000 Y50.000 F1000.0', 'G1 Z-6.000 F300.0', 'G1 X20.000 Y50.000 F1000.0']);
    rez.push({
      nume: 'M3 zig-zag la a doua trecere (dus-întors la adâncime)', doc, text,
      cere: [
        { invarianta: 11, linia: liniaLui(text, 'G1 Z-6.000 F300.0'), tipar: /coboară pe verticală de la -3\.000 la -6\.000 fără ridicare/ },
        { invarianta: 11, linia: liniaLui(text, 'G1 X20.000 Y50.000 F1000.0'), tipar: /nu în celălalt capăt \(120\.000, 50\.000\)/ },
      ],
    });
  }
  // M4: exteriorul pe o cale deschisă, tăiat pe linie (ediția întâi): refuzul §9 e o încălcare.
  {
    const doc = D1({ latura: 'exterior' });
    const text = programD([peLinie(doc, 'a/l', 3, undefined, 'cale', 'exterior')]);
    rez.push({
      nume: 'M4 exteriorul pe o cale deschisă, tăiat pe linie (ediția întâi)', doc, text,
      cere: [{ invarianta: 2, linia: 0, tipar: /^căile deschise \(§9\): a\/l e o cale deschisă cu profilul exterior/ }],
    });
  }
  // M5: despărțirea tăiată înaintea exteriorului.
  {
    const doc = D5();
    const text = programD5(doc, 'gkflr');
    rez.push({
      nume: 'M5 despărțirea tăiată înaintea exterioarelor', doc, text,
      cere: [{ invarianta: 14, linia: liniaLui(text, '(p/r: dreptunghi, exterior, 6 mm)'), tipar: /^ordinea \(§8\): tăietura lui p\/r .*clasa 2.* vine după tăietura lui d\/l .*clasa 3/ }],
    });
  }
  // M6: o tăietură deschisă prin foaie, NEMARCATĂ, pusă în clasa despărțirilor (după exterior): fanta din D5.
  {
    const doc = D5();
    const text = programD5(doc, 'gkrfl');
    rez.push({
      nume: 'M6 fanta deschisă prin foaie, nemarcată, tăiată după exterior (în clasa despărțirilor)', doc, text,
      cere: [{ invarianta: 14, linia: liniaLui(text, '(s/f: cale, pe-linie, 6 mm)'), tipar: /^ordinea \(§8\): tăietura lui s\/f .*clasa 1.* vine după tăietura lui p\/r .*clasa 2/ }],
    });
  }
  // M6b: linia prin foaie, NEMARCATĂ (oprită la 10 mm de margini), tăiată la urmă ca o despărțire: aplicația nu
  // ghicește despărțirea.
  {
    const doc = D5({ marcata: false });
    const text = programD5(doc, 'gkfrl');
    rez.push({
      nume: 'M6b linia prin foaie, nemarcată (la 10 mm de margini), tăiată la urmă (ghicită ca despărțire)', doc, text,
      cere: [{ invarianta: 14, linia: liniaLui(text, '(d/l: cale, pe-linie, 6 mm)'), tipar: /^ordinea \(§8\): tăietura lui d\/l .*clasa 1.* vine după tăietura lui p\/r .*clasa 2/ }],
    });
  }
  // M17: §8, ca în textul acceptat: linia de la margine la margine, prin foaie, NEMARCATĂ, ajunge la marginea foii și o
  // poate despărți: exportul o refuză (aici, tăiată chiar în clasa ei, 1, înaintea exteriorului).
  {
    const doc = D5({ marcata: false, laMargine: true });
    rez.push({
      nume: 'M17 linia de la margine la margine, prin foaie, nemarcată (§8: exportul o refuză)', doc, text: programD5(doc, 'gkflr'),
      cere: [{ invarianta: 14, linia: 0, tipar: /^ordinea \(§8\): tăietura lui d\/l .* e o tăietură deschisă prin foaie, nemarcată, care ajunge la marginea foii \(capătul \(0\.000, 150\.000\) e la 0\.000 mm de ea/ }],
    });
  }
  // M7: pe linie, de la capătul celălalt (sensul desenului ignorat).
  {
    const doc = D1();
    const text = programD([peLinie(doc, 'a/l', 3, [segment({ x: 110, y: 50 }, { x: 10, y: 50 })])]);
    rez.push({
      nume: 'M7 pe linie, pornit din ultimul vârf', doc, text,
      cere: [{ invarianta: 11, linia: liniaLui(text, 'G1 Z-3.000 F300.0'), tipar: /plonjează în \(110\.000, 50\.000\), nu în vârful 0 \(10\.000, 50\.000\)/ }],
    });
  }
  // M8: fără ridicare: după prima trecere, un G0 la adâncime înapoi în start (prin canalul tăiat, deci invarianta 3 nu-l
  // vede), apoi coborârea la −6.
  {
    const doc = D2();
    const text = programLinii(['(b/l: cale, pe-linie, 6 mm)', 'G0 X20.000 Y50.000', 'G1 Z-3.000 F300.0', 'G1 X120.000 Y50.000 F1000.0', 'G0 X20.000 Y50.000', 'G1 Z-6.000 F300.0', 'G1 X120.000 Y50.000 F1000.0']);
    rez.push({
      nume: 'M8 fără ridicare între treceri (G0 la adâncime prin canal)', doc, text,
      cere: [
        { invarianta: 11, linia: liniaLui(text, 'G0 X20.000 Y50.000', 8), tipar: /scula nu se ridică pe verticală din material/ },
        { invarianta: 11, linia: liniaLui(text, 'G1 Z-6.000 F300.0'), tipar: /nu începe cu o plonjare pe verticală din aer/ },
      ],
    });
  }
  // M9: a doua trecere pornește din celălalt capăt (dus, apoi întors, cu ridicare): toate trecerile din același capăt.
  {
    const doc = D2();
    const text = programLinii([
      '(b/l: cale, pe-linie, 6 mm)', 'G0 X20.000 Y50.000', 'G1 Z-3.000 F300.0', 'G1 X120.000 Y50.000 F1000.0', 'G0 Z5.000',
      'G1 Z-6.000 F300.0', 'G1 X20.000 Y50.000 F1000.0',
    ]);
    rez.push({
      nume: 'M9 a doua trecere din celălalt capăt', doc, text,
      cere: [
        { invarianta: 11, linia: liniaLui(text, 'G1 Z-6.000 F300.0'), tipar: /toate trecerile pornesc din același capăt/ },
        { invarianta: 11, linia: liniaLui(text, 'G1 Z-6.000 F300.0'), tipar: /nu în vârful 0/ },
      ],
    });
  }
  // M10: o trecere lipsește (doar −3 din 6 mm).
  {
    const doc = D2();
    const text = programLinii(['(b/l: cale, pe-linie, 6 mm)', 'G0 X20.000 Y50.000', 'G1 Z-3.000 F300.0', 'G1 X120.000 Y50.000 F1000.0']);
    rez.push({
      nume: 'M10 a doua trecere lipsește', doc, text,
      cere: [{ invarianta: 11, linia: liniaLui(text, '(b/l: cale, pe-linie, 6 mm)'), tipar: /ajunge la 3\.000, nu la adâncimea operației \(6 mm\)/ }],
    });
  }
  // M11–M13: urechile, intrările, degajările pe o operație cu un nod deschis (refuzurile §9).
  for (const [nume, inv, peste] of [
    ['urechi', 10, { urechi: { numar: 2, latime: 8, grosime: 2 } }], ['intrări', 12, { intrari: { raza: 3 } }], ['degajări', 13, { colturi: { tip: 'dog-bone' } }],
  ] as const) {
    const doc = D1(peste as Partial<ElemD>);
    rez.push({
      nume: `M${inv === 10 ? 11 : inv === 12 ? 12 : 13} ${nume} pe o operație cu un nod deschis`, doc, text: programD([peLinie(doc, 'a/l', 3)]),
      cere: [{ invarianta: inv, linia: 0, tipar: new RegExp(`^căile deschise \\(§9\\): operația a/op1 are cel puțin un nod deschis și ${nume}`) }],
    });
  }
  // M14: marcajul despărțirii pe o cale închisă (pătratul gravat din D5) și pe o adâncime sub grosimea foii.
  {
    const doc = D5({ peste: { k: { despartire: true } } });
    rez.push({
      nume: 'M14 despărțirea marcată pe un contur închis', doc, text: programD5(doc, 'gkfrl'),
      cere: [{ invarianta: 14, linia: 0, tipar: /^ordinea \(§8\): tăietura lui q\/k .* e marcată despărțire pe un contur închis/ }],
    });
  }
  {
    const doc = D5({ peste: { l: { adancime: 3 } } });
    rez.push({
      nume: 'M14b despărțirea marcată, la 3 mm într-o foaie de 6', doc,
      text: programD([...'gkfr'].map((c) => taietD5(doc, c)).concat(peLinie(doc, 'd/l', 3)), IESIRE_D5),
      cere: [{ invarianta: 14, linia: 0, tipar: /^ordinea \(§8\): tăietura lui d\/l .* adâncimea e sub grosimea foii/ }],
    });
  }
  // M15: calea deschisă degenerată (0,005 mm, sub rezoluție).
  {
    const doc = docV10([{ id: 'g', x: 0, y: 0, elemente: [{ id: 'l', forma: deschisa([vL(10, 50), vL(10.005, 50)]), latura: 'pe-linie', adancime: 3 }] }]);
    rez.push({
      nume: 'M15 calea deschisă degenerată (0,005 mm)', doc, text: programLinii(['(g/l: cale, pe-linie, 3 mm)', 'G0 X10.000 Y50.000', 'G1 Z-3.000 F300.0', 'G1 X10.005 Y50.000 F1000.0']),
      cere: [{ invarianta: 14, linia: 0, tipar: /^căile deschise \(§4\): calea lui g\/l e degenerată/ }],
    });
  }
  // M16: o tăietură a foii lipsește din program (despărțirea).
  {
    const doc = D5();
    rez.push({
      nume: 'M16 despărțirea lipsește din program', doc, text: programD5(doc, 'gkfr'),
      cere: [{ invarianta: 14, linia: 0, tipar: /^ordinea \(§8\): tăietura lui d\/l .* lipsește din program/ }],
    });
  }
  return rez;
}
