/**
 * Corpusul probei „același G-code prin workerul CAM” (ADR 0109). Conține plăcile 1 și 2 și câte un document pe fiecare fel
 * de lucrare, făcut din formele operațiilor folosite de testele lor:
 * - buzunarul cu insule și trepte, coborârea, strategia paralelă, frezele de rest;
 * - V-carve-ul cu fundul plat, găurirea, gravarea pe linie;
 * - profilul cu urechi, rampă, intrări și degajări, căile deschise;
 * - mai multe freze, cu toate posturile, unitățile și strategiile schimbării;
 * - ieșirea din foaie (cu confirmare), o tăietură sub foaie (refuzată fără supracursă) și un refuz.
 * Fiecare trece prin ușa documentului (`incarca`), ca un proiect salvat. Îl folosesc testele unitare (calculul direct față
 * de bazin) și e2e-ul (workerul construit, în Edge, prin `test/e2e/cam-node.ts`).
 */
import type { ParametriExport } from '../../src/jobs/protocolCam.ts';
import type { Document } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { documentPlaca02 } from '../placi/placa-02/genereaza.ts';
import { docDin, ID } from './ajutor-document.ts';

type Rec = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const F = (numar: number, diametru: number): Rec => ({ numar, nume: `freza ${diametru}`, diametru });
const V = (numar: number, diametru: number, unghi: number, varf?: number): Rec => ({
  numar, nume: `freza V${unghi}`, diametru, forma: { tip: 'v', unghi, ...(varf !== undefined ? { varf } : {}) },
});
const op = (id: string, noduri: readonly string[], extra: Rec = {}): Rec => ({
  id, tip: 'profil', noduri, scula: F(1, 6), latura: 'exterior', sens: 'urcare', adancime: 6, pas: 3,
  urechi: null, rampa: null, intrari: null, colturi: null, ...extra,
});
const buzunar = (id: string, noduri: readonly string[], extra: Rec = {}): Rec => op(id, noduri, { tip: 'buzunar', latura: 'interior', pasLateral: 2.4, ...extra });

type Forma = { readonly id: string; readonly forma: Rec; readonly x?: number; readonly y?: number };
const DR = (id: string, latime: number, inaltime: number, x: number, y: number, razaColt = 0): Forma => ({ id, forma: { tip: 'dreptunghi', latime, inaltime, razaColt }, x, y });
const CERC = (id: string, raza: number, x: number, y: number): Forma => ({ id, forma: { tip: 'cerc', raza }, x, y });
const CALE = (id: string, puncte: ReadonlyArray<readonly [number, number]>): Forma => ({
  id, forma: { tip: 'cale', inchis: false, varfuri: puncte.map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' } })) },
});

/** O piesă: formele ei (un grup, fiecare la locul ei) și operațiile ei, într-o instanță la (0, 0). */
const piesa = (id: string, forme: readonly Forma[], operatii: readonly Rec[]): Rec => ({
  id,
  radacina: { tip: 'grup', id: `${id}-r`, matrice: { ...I }, copii: forme.map((f) => ({ tip: 'element', id: f.id, matrice: { ...I, e: f.x ?? 0, f: f.y ?? 0 }, forma: f.forma })) },
  operatii,
});

/** Documentul, prin ușă, ca un proiect salvat (schema de acum). */
function document(stoc: { latime: number; inaltime: number; grosime: number }, piese: readonly Rec[]): Document {
  const r = incarca({
    schema: 18, rev: 1, piese,
    foi: [{ id: 'f1', stoc, instante: piese.map((p) => ({ id: `i-${String(p['id'])}`, piesa: p['id'], x: 0, y: 0, rotire: 0 })) }],
  });
  if (!r.ok) throw new Error(`corpusul CAM: ușa refuză documentul: ${r.motiv}`);
  return r.doc;
}

/**
 * Documentul mare al măsurătorii (ADR 0109): pe o foaie de 2 440 × 1 220 × 18, o grilă de n × n/2 rame de 40 mm (profil
 * exterior, colțuri R3, 18 mm în pași de 6), fiecare cu un buzunar rotund Ø24 de 6 mm înăuntru. La n = 48: 2 304 de forme,
 * ~78 000 de mișcări.
 */
export function documentMare(n: number): Document {
  const piese: Rec[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n / 2; j++) {
      const x = 10 + i * 50, y = 10 + j * 50;
      piese.push(piesa(`r${i}-${j}`, [DR('r', 40, 40, x, y, 3)], [op('o', ['r'], { adancime: 18, pas: 6 })]));
      piese.push(piesa(`c${i}-${j}`, [CERC('c', 12, x + 20, y + 20)], [buzunar('o', ['c'], { adancime: 6, pas: 3 })]));
    }
  }
  return document({ latime: 2440, inaltime: 1220, grosime: 18 }, piese);
}

/**
 * Documentul greu pentru CAM, ușor pentru interfață (poarta e2e a bazinului, ADR 0109). E o singură piesă, într-o singură
 * instanță, cu n × n/2 rame de 34 mm (profil exterior, 18 mm în pași de 6) și câte un buzunar Ø20 de 6 mm, cu pasul lateral
 * de 1,2 mm. CAM-ul are de lucru cât pe documentul mare, dar interfața randează un singur rând. Golurile măsurate cât
 * calculează workerul sunt deci ale firului principal, nu ale randării.
 */
export function documentGreu(n: number): Document {
  const forme: Forma[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n / 2; j++) {
      const x = 10 + i * 42, y = 10 + j * 42;
      forme.push(DR(`r${i}-${j}`, 34, 34, x, y, 3), CERC(`c${i}-${j}`, 10, x + 17, y + 17));
    }
  }
  const ids = (p: string): string[] => forme.filter((f) => f.id.startsWith(p)).map((f) => f.id);
  return document({ latime: 2440, inaltime: 1220, grosime: 18 }, [piesa('p', forme, [
    op('o', ids('r'), { adancime: 18, pas: 6 }), buzunar('b', ids('c'), { adancime: 6, pas: 3, pasLateral: 1.2 }),
  ])]);
}

export type CazCam = {
  readonly id: string;
  readonly doc: Document;
  /** Parametrii exporturilor de comparat (primul = implicitul dialogului). */
  readonly parametri: readonly ParametriExport[];
};

const IMPLICIT: ParametriExport = { origine: 'stanga-jos', z0: 'sus' };
const FOAIE = { latime: 300, inaltime: 200, grosime: 18 };

export const CORPUS_CAM: readonly CazCam[] = [
  {
    // Placa 1 ca document (ca în `export.calcul.test.ts`): liniile ei sunt cele ale plăcii 1 A.
    id: 'placa-01',
    doc: docDin(FOAIE, { id: 'e1', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } }, { id: 'e2', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 70, f: 50 } }),
    parametri: [IMPLICIT, { origine: 'dreapta-sus', z0: 'jos' }, { ...IMPLICIT, unitati: 'inch' }],
  },
  { id: 'placa-02', doc: documentPlaca02(), parametri: [IMPLICIT, { origine: 'stanga-sus', z0: 'sus', post: 'grblhal' }] },
  {
    // Insula (cercul în dreptunghi, aceeași adâncime) și o treaptă (alt buzunar, altă adâncime).
    id: 'buzunar-insule-trepte',
    doc: document(FOAIE, [
      piesa('b', [DR('a', 100, 60, 20, 20), CERC('i', 10, 70, 50)], [buzunar('o', ['a', 'i'])]),
      piesa('t', [DR('t', 40, 30, 150, 30)], [buzunar('o', ['t'], { adancime: 3 })]),
    ]),
    parametri: [IMPLICIT],
  },
  {
    id: 'buzunar-coborare',
    doc: document(FOAIE, [
      piesa('z', [DR('z', 60, 40, 20, 20)], [buzunar('o', ['z'], { coborare: { fel: 'zigzag', unghi: 3, lungime: 20 } })]),
      piesa('e', [DR('e', 60, 40, 110, 20)], [buzunar('o', ['e'], { coborare: { fel: 'elice', unghi: 3, raza: 3 } })]),
      piesa('r', [DR('r', 60, 40, 200, 20)], [buzunar('o', ['r'], { coborare: { fel: 'rampa', unghi: 3 } })]),
    ]),
    parametri: [IMPLICIT],
  },
  {
    // Strategia paralelă la 30°, cu frezele de rest (Ø12, apoi Ø3).
    id: 'buzunar-paralel-rest',
    doc: document(FOAIE, [
      piesa('p', [DR('a', 80, 40, 20, 20)], [buzunar('o', ['a'], {
        scula: F(1, 12), adancime: 10, pas: 5, pasLateral: 4.8, strategie: { fel: 'paralel', unghi: 30 }, rest: [{ scula: F(2, 3), pasLateral: 1.2 }],
      })]),
    ]),
    parametri: [IMPLICIT, { ...IMPLICIT, strategieScula: 'fisiere-separate' }],
  },
  {
    // V-carve cu fundul plat (freza dreaptă Ø6) și freza de rest a fundului (Ø2).
    id: 'vcarve-fund-rest',
    doc: document(FOAIE, [
      piesa('v', [DR('a', 40, 20, 20, 20), DR('b', 24, 16, 90, 20)], [op('v', ['a', 'b'], {
        tip: 'vcarve', latura: 'interior', scula: V(1, 20, 90), adancime: 3, pas: 1,
        fundPlat: { scula: F(2, 6), pasLateral: 2.4, rest: [{ scula: F(3, 2), pasLateral: 0.8 }] },
      })]),
    ]),
    parametri: [IMPLICIT, { ...IMPLICIT, post: 'grblhal', strategieScula: 'm6-controler' }],
  },
  {
    // Cercul cât freza (ciocănit) și cel până la 2·D (elicea), cu ieșirea la al doilea pas.
    id: 'gaurire',
    doc: document(FOAIE, [
      piesa('g', [CERC('a', 3, 30, 30), CERC('b', 5, 60, 30)], [op('g', ['a', 'b'], { tip: 'gaurire', latura: 'interior', adancime: 10, pas: 3, retragereCompleta: 2 })]),
    ]),
    parametri: [IMPLICIT],
  },
  {
    // Gravarea pe linie cu freza în V cu vârf plat, cu direcția inversă, și gravarea unei căi deschise.
    id: 'gravare-pe-linie',
    doc: document(FOAIE, [
      piesa('l', [DR('a', 50, 30, 20, 20), CALE('c', [[100, 20], [140, 60], [180, 20]])], [op('l', ['a', 'c'], {
        latura: 'pe-linie', scula: V(1, 6, 60, 0.5), adancime: 1, pas: 1, directie: 'invers',
      })]),
    ]),
    parametri: [IMPLICIT],
  },
  {
    // Profilul cu urechi, rampă și intrări (exteriorul rotunjit) și degajările dog-bone (gaura cu colțuri drepte).
    id: 'profil-complet',
    doc: document(FOAIE, [
      piesa('p', [DR('a', 120, 80, 20, 20, 10), DR('g', 40, 30, 60, 45)], [
        op('ext', ['a'], { adancime: 18, pas: 6, urechi: { numar: 4, latime: 8, grosime: 2 }, rampa: { lungime: 10 }, intrari: { raza: 3 } }),
        op('int', ['g'], { latura: 'interior', adancime: 12, pas: 4, colturi: { tip: 'dog-bone' } }),
      ]),
    ]),
    parametri: [IMPLICIT, { origine: 'dreapta-jos', z0: 'sus', post: 'fluidnc' }],
  },
  {
    // Căile deschise: pe stânga, pe dreapta și pe linie.
    id: 'deschise',
    doc: document(FOAIE, [
      piesa('s', [CALE('s', [[20, 50], [120, 50]])], [op('s', ['s'], { latura: 'stanga', adancime: 3, pas: 3 })]),
      piesa('d', [CALE('d', [[20, 100], [120, 100], [150, 140]])], [op('d', ['d'], { latura: 'dreapta', adancime: 3, pas: 3 })]),
      piesa('l', [CALE('l', [[180, 30], [260, 170]])], [op('l', ['l'], { latura: 'pe-linie', adancime: 2, pas: 1 })]),
    ]),
    parametri: [IMPLICIT],
  },
  {
    // Trei freze în clasele contractului: interiorul (Ø3), gravarea (V90), exteriorul (Ø6), cu fiecare strategie.
    id: 'mai-multe-freze',
    doc: document(FOAIE, [
      piesa('p', [DR('a', 140, 100, 20, 20), DR('b', 40, 30, 50, 50), CALE('c', [[100, 60], [140, 90]])], [
        op('ext', ['a'], { adancime: 9, pas: 3 }),
        buzunar('buz', ['b'], { scula: F(2, 3), pasLateral: 1.2, adancime: 4, pas: 2 }),
        op('grav', ['c'], { latura: 'pe-linie', scula: V(3, 6, 90), adancime: 1, pas: 1 }),
      ]),
    ]),
    parametri: [
      IMPLICIT, { ...IMPLICIT, strategieScula: 'fisiere-separate' }, { ...IMPLICIT, strategieScula: 'm0-comentariu' },
      { ...IMPLICIT, post: 'grblhal', strategieScula: 'm6-controler', unitati: 'inch' },
      { ...IMPLICIT, setariMasina: '$11=0.02\n$12=0.004\n$110=3000\n$111=3000\n$112=800\n$120=200\n$121=200\n$122=100' },
    ],
  },
  {
    // Freza iese din foaie (dreptunghiul lipit de marginea stângă): exportul cere confirmarea, apoi o scrie în antet.
    id: 'iesire-din-foaie',
    doc: document(FOAIE, [piesa('a', [DR('a', 60, 40, 1, 20)], [op('o', ['a'])])]),
    parametri: [IMPLICIT],
  },
  {
    // O tăietură sub fața de jos a foii (18,5 pe 18): fără supracursă, implicitul aplicației, lucrarea o refuză; cu 1 mm, o taie.
    id: 'sub-foaie',
    doc: document(FOAIE, [piesa('a', [DR('a', 60, 40, 20, 20)], [op('o', ['a'], { adancime: 18.5, pas: 6 })])]),
    parametri: [IMPLICIT, { ...IMPLICIT, supracursa: 1 }],
  },
  {
    // Două buzunare de aceeași adâncime care se intersectează: lucrarea le refuză, cu motivul.
    id: 'refuz-buzunare',
    doc: document(FOAIE, [piesa('r', [DR('a', 60, 40, 20, 20), DR('b', 60, 40, 50, 40)], [buzunar('o', ['a', 'b'])])]),
    parametri: [IMPLICIT],
  },
];
