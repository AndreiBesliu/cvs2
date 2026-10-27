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
}
