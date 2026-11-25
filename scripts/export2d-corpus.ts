/**
 * Corpusul exportului 2D (ADR 0088, ADR 0089): un document cu cazurile grele, trecut prin ușă, exportat ca `corpus.dxf`,
 * `corpus.svg`, `corpus.pdf` și `corpus.eps` în dosarul dat. Oracolul independent (`test/oracles-py/export2d.py`, ezdxf) îl recitește și îl compară cu
 * valorile pe hârtie, scrise acolo din aceeași descriere, nu din cod. Descrierea, pe scurt (foaia 600 × 400):
 * - piesa A (instanța în (0, 0)):
 *   - `drept`: dreptunghiul 200 × 100 cu colțurile R10, rotit 30° în jurul colțului lui stânga-jos, mutat în (150, 100);
 *     profil exterior;
 *   - `cerc`: R50 în (400, 250), profil interior; `mic`: R0,01 în (10, 10), fără operație; `mare`: R10 sub scara 2,5,
 *     rotit 45°, în (300, 330), adică R25, tot interior;
 *   - `s`: calea deschisă: cubica (300, 50) → (400, 50) cu punctele (330, 110), (370, −10), linia până la (450, 50), apoi
 *     semicercul cu bulge 1 până la (500, 50) (centrul (475, 50), R25, trece prin (475, 25)); profil pe linie;
 *   - `oval`: calea închisă din 4 cubice, „elipsa” 40 × 20 cu centrul (100, 300), k = 0,5522847498; buzunar;
 *   - `d`: calea închisă amestecată: (200, 300) L (260, 300) C[(290, 300), (290, 350)] (260, 350) L (200, 350)
 *     A[bulge −0,5] (200, 300); profil exterior;
 * - piesa B (instanța în (0, 0)), rădăcina oglindită (x → 560 − x): dreptunghiul 40 × 20 cu colțurile R5 în (0, 0) și
 *   cercul R3 în (20, 380), cu găurire;
 * - piesa C, instanța rotită 90° în (580, 20): cercul R5 în (10, 0) al piesei ajunge în (580, 30); profil exterior.
 * Cu conturul foii (stratul FOAIE).
 *
 * Al doilea document, al cotelor (ADR 0330 §7, felia 10.4↑c-1), exportat ca `cote.dxf`, `cote.svg`, `cote.pdf` și `cote.eps`
 * prin intrarea aplicației (`exportaVectori`, cu „Cu cotele”): foaia 300 × 200 cu conturul ei, fără forme, cu patru cote
 * dezlegate, desenate cu stilul și cifrele implicite (săgeți pline de 2,5 mm, cifrele de 3,5 mm deasupra, golul 1, depășirea
 * 2; zecimalele tăiate, virgula), pe stratul `DIM_1`, portocaliu (#ff8800), cu liniile de 0,25 mm:
 * - `h`: orizontala între (20, 20) și (120, 40), cu linia la d = 15;
 * - `v`: verticala între (200, 20) și (210, 80), cu linia la d = 20;
 * - `u`: unghiul cu vârful (40, 120), laturile spre (60, 120) și (40, 140), arcul de rază 25;
 * - `d`: diametrul cercului cu centrul (240, 150) și punctul (260, 150), cifra în afară, la d = 8.
 * Cifrele sunt trăsăturile fontului inclus cu o singură linie (Relief SingleLine), citit aici de cititorul aplicației.
 * Fișierele `cote.*` se scriu cu felul de dinainte (cotele DXF-ului ca linii și cifre, cifrele ca trăsături).
 *
 * Al treilea document (felia 10.4↑c-2): aceleași patru cote, plus încă trei, toate dezlegate, pe același strat:
 * - `a`: aliniata între (130, 80) și (160, 120), lungă de 50, cu linia la d = 10;
 * - `r`: raza cercului cu centrul (110, 175) prin (125, 175), R15, cifra în afară, la d = 6;
 * - `w`: unghiul dintre laturile (245, 30)–(285, 30) și (250, 45)–(270, 65), cu arcul de rază 30 și textul „2x<>”.
 * Exportat ca `cote-dim.dxf` (cotele ca DIMENSION, cifrele ca trăsături) și `cote-text.dxf`, `.svg`, `.pdf`, `.eps` (cotele ca
 * DIMENSION, cifrele ca text).
 *
 * Al patrulea document (felia 10.4↑c-2), exportat ca `cote-ascii.pdf`, cu cifrele ca text: o orizontală între (20, 100) și
 * (280, 100), cu linia la d = 20 și textul ei, `TEXT_ASCII`: toate semnele ASCII tipăribile (fără `<>` alăturate), apoi ° ± × Ø;
 * centrarea lui în PDF cere lățimea lui Helvetica a fiecărui semn.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { incarca } from '../src/model/incarcare.ts';
import { vectoriFoaie } from '../src/io/vectori.ts';
import { scrieDxf } from '../src/io/dxfExport.ts';
import { scrieSvg } from '../src/io/svgExport.ts';
import { scriePdf } from '../src/io/pdfExport.ts';
import { scrieEps } from '../src/io/epsExport.ts';
import { readFileSync } from 'node:fs';
import { exportaVectori } from '../src/io/exportVectori.ts';
import { formatImplicit, STIL_IMPLICIT } from '../src/model/desenCota.ts';
import { cifreDinFont } from '../src/text/cifreCote.ts';
import { citesteFont } from '../src/text/font.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const SCULA = { numar: 1, nume: 'freza plata', diametru: 6 };
type Op = Record<string, unknown>;
const op = (id: string, noduri: string[], extra: Op = {}): Op => ({
  id, tip: 'profil', noduri, scula: { ...SCULA }, latura: 'exterior', sens: 'urcare', adancime: 3, pas: 3,
  urechi: null, rampa: null, intrari: null, colturi: null, ...extra,
});
const L = { tip: 'L' }, A = (bulge: number) => ({ tip: 'A', bulge }), C = (c1: [number, number], c2: [number, number]) => ({ tip: 'C', c1: { x: c1[0], y: c1[1] }, c2: { x: c2[0], y: c2[1] } });
const v = (x: number, y: number, s: object) => ({ p: { x, y }, s });
const K = 0.5522847498;
const cos30 = Math.cos(Math.PI / 6), sin30 = Math.sin(Math.PI / 6);

export const CORPUS = {
  schema: 13, rev: 0,
  piese: [
    {
      id: 'A',
      radacina: {
        tip: 'grup', id: 'ra', matrice: { ...I }, copii: [
          { tip: 'element', id: 'drept', matrice: { a: cos30, b: sin30, c: -sin30, d: cos30, e: 150, f: 100 }, forma: { tip: 'dreptunghi', latime: 200, inaltime: 100, razaColt: 10 } },
          { tip: 'element', id: 'cerc', matrice: { ...I, e: 400, f: 250 }, forma: { tip: 'cerc', raza: 50 } },
          { tip: 'element', id: 'mic', matrice: { ...I, e: 10, f: 10 }, forma: { tip: 'cerc', raza: 0.01 } },
          { tip: 'element', id: 'mare', matrice: { a: 2.5 * Math.SQRT1_2, b: 2.5 * Math.SQRT1_2, c: -2.5 * Math.SQRT1_2, d: 2.5 * Math.SQRT1_2, e: 300, f: 330 }, forma: { tip: 'cerc', raza: 10 } },
          {
            tip: 'element', id: 's', matrice: { ...I }, forma: {
              tip: 'cale', inchis: false, varfuri: [v(300, 50, C([330, 110], [370, -10])), v(400, 50, L), v(450, 50, A(1)), v(500, 50, L)],
            },
          },
          {
            tip: 'element', id: 'oval', matrice: { ...I }, forma: {
              tip: 'cale', inchis: true, varfuri: [
                v(140, 300, C([140, 300 + 20 * K], [100 + 40 * K, 320])),
                v(100, 320, C([100 - 40 * K, 320], [60, 300 + 20 * K])),
                v(60, 300, C([60, 300 - 20 * K], [100 - 40 * K, 280])),
                v(100, 280, C([100 + 40 * K, 280], [140, 300 - 20 * K])),
              ],
            },
          },
          {
            tip: 'element', id: 'd', matrice: { ...I }, forma: {
              tip: 'cale', inchis: true, varfuri: [v(200, 300, L), v(260, 300, C([290, 300], [290, 350])), v(260, 350, L), v(200, 350, A(-0.5))],
            },
          },
        ],
      },
      operatii: [
        op('o1', ['drept', 'd']),
        op('o2', ['cerc', 'mare'], { latura: 'interior' }),
        op('o3', ['s'], { latura: 'pe-linie' }),
        op('o4', ['oval'], { tip: 'buzunar', latura: 'interior', pasLateral: 2.4 }),
      ],
    },
    {
      id: 'B',
      radacina: {
        tip: 'grup', id: 'rb', matrice: { a: -1, b: 0, c: 0, d: 1, e: 560, f: 0 }, copii: [
          { tip: 'element', id: 'mdrept', matrice: { ...I }, forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 5 } },
          { tip: 'element', id: 'gaura', matrice: { ...I, e: 20, f: 380 }, forma: { tip: 'cerc', raza: 3 } },
        ],
      },
      operatii: [op('o5', ['gaura'], { tip: 'gaurire', latura: 'interior' })],
    },
    {
      id: 'C',
      radacina: { tip: 'element', id: 'rc', matrice: { ...I, e: 10, f: 0 }, forma: { tip: 'cerc', raza: 5 } },
      operatii: [op('o6', ['rc'])],
    },
  ],
  foi: [{
    id: 'f1', stoc: { latime: 600, inaltime: 400, grosime: 18 }, instante: [
      { id: 'ia', piesa: 'A', x: 0, y: 0, rotire: 0 },
      { id: 'ib', piesa: 'B', x: 0, y: 0, rotire: 0 },
      { id: 'ic', piesa: 'C', x: 580, y: 20, rotire: 90 },
    ],
  }],
};

const Q = (x: number, y: number): { x: number; y: number } => ({ x, y });
export const CORPUS_COTE = {
  schema: 28, rev: 0, piese: [],
  foi: [{
    id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [], cote: [
      { id: 'h', fel: 'orizontala', puncte: [Q(20, 20), Q(120, 40)], linie: { d: 15 } },
      { id: 'v', fel: 'verticala', puncte: [Q(200, 20), Q(210, 80)], linie: { d: 20 } },
      { id: 'u', fel: 'unghi', puncte: [Q(40, 120), Q(60, 120), Q(40, 140)], linie: { d: 25, s1: 1, s2: 1 } },
      { id: 'd', fel: 'diametru', puncte: [Q(240, 150), Q(260, 150)], linie: { d: 8 } },
    ],
  }],
};
export const STRAT_COTE = { nume: 'DIM_1', culoare: '#ff8800', grosime: 0.25 };
export const TEXT_ASCII = `${Array.from({ length: 95 }, (_, k) => String.fromCharCode(32 + k)).join('')}°±×Ø`;
export const CORPUS_COTE_ASCII = {
  ...CORPUS_COTE,
  foi: [{ ...CORPUS_COTE.foi[0]!, cote: [{ id: 'q', fel: 'orizontala', puncte: [Q(20, 100), Q(280, 100)], linie: { d: 20 }, text: TEXT_ASCII }] }],
};
export const CORPUS_COTE_2 = {
  ...CORPUS_COTE,
  foi: [{
    ...CORPUS_COTE.foi[0]!, cote: [
      ...CORPUS_COTE.foi[0]!.cote,
      { id: 'a', fel: 'aliniata', puncte: [Q(130, 80), Q(160, 120)], linie: { d: 10 } },
      { id: 'r', fel: 'raza', puncte: [Q(110, 175), Q(125, 175)], linie: { d: 6 } },
      { id: 'w', fel: 'unghi', puncte: [Q(245, 30), Q(285, 30), Q(250, 45), Q(270, 65)], linie: { d: 30, s1: 1, s2: 1 }, text: '2x<>' },
    ],
  }],
};

// Doar pornit direct (`node scripts/export2d-corpus.ts <dosar>`): testele îl importă pentru CORPUS, fără să scrie nimic.
const dosar = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href ? process.argv[2] : undefined;
if (dosar) {
  const r = incarca(structuredClone(CORPUS));
  if (!r.ok) throw new Error(`corpusul nu trece de ușă: ${r.motiv}`);
  const vec = vectoriFoaie(r.doc, 0, true);
  mkdirSync(dosar, { recursive: true });
  writeFileSync(join(dosar, 'corpus.dxf'), scrieDxf(vec));
  writeFileSync(join(dosar, 'corpus.svg'), scrieSvg(vec));
  writeFileSync(join(dosar, 'corpus.pdf'), scriePdf(vec));
  writeFileSync(join(dosar, 'corpus.eps'), scrieEps(vec, 'corpus'));
  console.log(`corpusul exportului 2D: ${vec.entitati.length} entități, în ${dosar}`);
  const rc = incarca(structuredClone(CORPUS_COTE));
  if (!rc.ok) throw new Error(`corpusul cotelor nu trece de ușă: ${rc.motiv}`);
  const f = citesteFont(new Uint8Array(readFileSync(new URL('../public/fonturi/relief-singleline.ttf', import.meta.url))));
  if (!f.ok) throw new Error('fontul cifrelor nu s-a citit');
  const cerute = { stil: STIL_IMPLICIT, format: formatImplicit(true), cifre: cifreDinFont(f.font), strat: STRAT_COTE, dxf: 'linii', ca: 'trasaturi' } as const;
  for (const fmt of ['dxf', 'svg', 'pdf', 'eps'] as const) {
    const x = exportaVectori(rc.doc, 0, fmt, true, cerute);
    if (x.cote !== 4 || x.lipsa.length > 0) throw new Error(`corpusul cotelor: ${x.cote} cote, lipsă: ${x.lipsa.join(' ')}`);
    writeFileSync(join(dosar, `cote.${fmt}`), x.text);
  }
  const r2 = incarca(structuredClone(CORPUS_COTE_2));
  if (!r2.ok) throw new Error(`corpusul al doilea al cotelor nu trece de ușă: ${r2.motiv}`);
  const scrie = (fisier: string, fmt: 'dxf' | 'svg' | 'pdf' | 'eps', ca: 'trasaturi' | 'text'): void => {
    const x = exportaVectori(r2.doc, 0, fmt, true, { ...cerute, dxf: 'dimension', ca });
    if (x.cote !== 7 || x.lipsa.length > 0) throw new Error(`corpusul al doilea al cotelor: ${x.cote} cote, lipsă: ${x.lipsa.join(' ')}`);
    writeFileSync(join(dosar, fisier), x.text);
  };
  scrie('cote-dim.dxf', 'dxf', 'trasaturi');
  for (const fmt of ['dxf', 'svg', 'pdf', 'eps'] as const) scrie(`cote-text.${fmt}`, fmt, 'text');
  const r3 = incarca(structuredClone(CORPUS_COTE_ASCII));
  if (!r3.ok) throw new Error(`corpusul ASCII al cotelor nu trece de ușă: ${r3.motiv}`);
  const ascii = exportaVectori(r3.doc, 0, 'pdf', false, { ...cerute, dxf: 'dimension', ca: 'text' });
  if (ascii.cote !== 1 || ascii.lipsa.length > 0) throw new Error(`corpusul ASCII al cotelor: ${ascii.cote} cote, lipsă: ${ascii.lipsa.join(' ')}`);
  writeFileSync(join(dosar, 'cote-ascii.pdf'), ascii.text);
  console.log(`corpusul cotelor: 4 cote, apoi 7 (ca DIMENSION și cu cifrele ca text), în ${dosar}`);
}
