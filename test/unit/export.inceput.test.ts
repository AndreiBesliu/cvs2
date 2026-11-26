/**
 * Începutul programului, la vedere în fereastra exportului (ADR 0292, felia 28.8↑r): după Exportă, Rezultatul arată primele
 * linii ale fiecărui fișier scris, până la prima mișcare de tăiere inclusiv (G1, G2 sau G3), cel mult 40.
 * - pe hârtie: comentariile dialectului (între paranteze, după apostrof, niciunul) nu sunt cod; `G17`, `G21`, `G20` nu sunt
 *   tăieri, `G01` și `G2` sunt; fără tăiere, toate liniile (cel mult 40); plafonul; linia goală de la capăt nu se numără;
 * - pe corpusul CAM, pe toate posturile, în mm și în inch: începutul e un prefix al textului descărcat, iar cititorul
 *   dialectelor (scris doar după sonda s8, fără nimic din post) vede în el o singură mișcare de lucru, ultima linie, cu axul
 *   pornit și Z-ul sigur înaintea ei;
 * - cu Z-ul sigur ales, linia lui; cu „Toate foile”, fișierele foii active, cu numele lor din arhivă (arhiva nu e text).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './limbi.ts';
import { INCEPUT_MAXIM, inceputProgram } from '../../src/post/inceput.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import type { ParametriExport } from '../../src/jobs/protocolCam.ts';
import type { InceputFisier } from '../../src/ui/actiuniExportTipuri.ts';
import { CONTRACTE, ID_CONTRACTE, type IdContract } from '../../src/post/contracte/index.ts';
import { documentNou, type Document } from '../../src/model/document.ts';
import { doarFoaia } from '../../src/model/foi.ts';
import { citesteProgram, type DialectCitit } from './ajutor-dialecte.ts';
import { CORPUS_CAM } from './ajutor-corpus-cam.ts';
import { documentCaz } from './ajutor-incrustatie.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { CAZURI_INCRUSTATIE } from '../oracles/incrustatie.cazuri.ts';
import { docDin, ID } from './ajutor-document.ts';

const PARANTEZE = { deschidere: '(', inchidere: ')' } as const;
const APOSTROF = { deschidere: "'", inchidere: '' } as const;

test('pe hârtie: antetul, linia modală, WCS-ul, Z-ul sigur și axul, apoi prima tăiere, inclusiv; restul numărat', () => {
  const text = [
    '(CNC Vector Studio)', '(post GRBL 1.1h)', '(scula T1 Plata D6.000)', 'G21 G90 G94 G17', 'G54', 'G0 Z5.000', 'M3 S18000',
    'G4 P1.000', 'G0 X10.000 Y10.000', 'G1 Z-3.000 F300.0', 'G1 X20.000 F1000.0', 'G0 Z5.000', 'M5', 'M30', '',
  ].join('\n');
  const r = inceputProgram(text, PARANTEZE);
  assert.equal(r.taiere, true);
  assert.deepEqual(r.linii, text.split('\n').slice(0, 10));
  assert.equal(r.linii.at(-1), 'G1 Z-3.000 F300.0');
  // Linia goală de la capăt nu e o linie a programului: rămân patru (G1, G0, M5, M30).
  assert.equal(r.restul, 4);
});

test('pe hârtie: un comentariu cu „G1” nu e o tăiere, în niciun dialect; G17, G21 și G20 nu sunt tăieri, G01 și G2 sunt', () => {
  const cuParanteze = ['(G1 X0 Y0 nu e cod)', 'G21 G17', 'G20', 'G0 X1 (G1 nici aici)', 'G01 Z-1 F100', 'G1 X5'].join('\n');
  assert.deepEqual(inceputProgram(cuParanteze, PARANTEZE).linii, ['(G1 X0 Y0 nu e cod)', 'G21 G17', 'G20', 'G0 X1 (G1 nici aici)', 'G01 Z-1 F100']);
  // NcStudio: apostroful ține până la capătul rândului; parantezele nu sunt comentarii acolo, dar nici nu ascund cod aici.
  const cuApostrof = ["'G1 X0 nu e cod", 'G0 X1', "G0 Z5 'G2 nici aici", 'G2 X3 Y0 I1.5 J0 F100', 'G1 X9'].join('\n');
  const a = inceputProgram(cuApostrof, APOSTROF);
  assert.deepEqual(a.linii, ["'G1 X0 nu e cod", 'G0 X1', "G0 Z5 'G2 nici aici", 'G2 X3 Y0 I1.5 J0 F100']);
  assert.equal(a.restul, 1);
  // RichAuto: fără comentarii, orice linie e cod.
  assert.deepEqual(inceputProgram(['G90 G21', 'G3 X1 Y1 I0 J1 F50', 'G1 X2'].join('\n'), null).linii, ['G90 G21', 'G3 X1 Y1 I0 J1 F50']);
  // Un comentariu neînchis ascunde restul rândului.
  assert.equal(inceputProgram(['(fără capăt G1 X0', 'G1 X1'].join('\n'), PARANTEZE).linii.length, 2);
});

test(`pe hârtie: fără nicio tăiere, toate liniile; peste ${INCEPUT_MAXIM} înaintea tăierii, primele ${INCEPUT_MAXIM}, cu restul numărat`, () => {
  assert.equal(INCEPUT_MAXIM, 40);
  const fara = inceputProgram(['G21', 'G0 Z5', 'M30', ''].join('\n'), PARANTEZE);
  assert.deepEqual(fara, { linii: ['G21', 'G0 Z5', 'M30'], taiere: false, restul: 0 });
  const antet = Array.from({ length: 45 }, (_, i) => `(rândul ${i + 1})`);
  const lung = inceputProgram([...antet, 'G1 X1', 'M30'].join('\n'), PARANTEZE);
  assert.equal(lung.linii.length, 40);
  assert.equal(lung.taiere, false);
  assert.equal(lung.restul, 7);
  // Tăierea chiar pe rândul 40 intră; pe rândul 41, nu.
  const la40 = inceputProgram([...antet.slice(0, 39), 'G1 X1', 'M30'].join('\n'), PARANTEZE);
  assert.equal(la40.taiere, true);
  assert.equal(la40.linii.length, 40);
  const la41 = inceputProgram([...antet.slice(0, 40), 'G1 X1'].join('\n'), PARANTEZE);
  assert.equal(la41.taiere, false);
  assert.equal(la41.restul, 1);
  assert.deepEqual(inceputProgram('', PARANTEZE), { linii: [], taiere: false, restul: 0 });
  // O linie goală în mijlocul programului e tot o linie a lui: stă în început, la locul ei.
  assert.deepEqual(inceputProgram(['G21', '', 'G1 X1', 'M30'].join('\n'), PARANTEZE), { linii: ['G21', '', 'G1 X1'], taiere: true, restul: 1 });
});

const dialect = (id: IdContract): DialectCitit => {
  const k = CONTRACTE[id];
  return { comentariu: k.comentariu === null ? 'niciunul' : k.comentariu.deschidere === "'" ? 'apostrof' : 'paranteze', pauza: k.pauza?.unitate ?? 's' };
};
/** Mișcările de lucru (G1, G2, G3) văzute de cititorul dialectelor în liniile date. */
const lucru = (linii: readonly string[], d: DialectCitit): number =>
  citesteProgram(`${linii.join('\n')}\n`, d).evenimente.filter((e) => e.tip === 'miscare' && e.g !== 0).length;

test('pe corpusul CAM, pe toate posturile, în mm și în inch: un prefix al fișierului, oprit la prima mișcare de lucru, cu axul și Z-ul sigur înainte', async () => {
  const placa = CORPUS_CAM.find((c) => c.id === 'placa-01')!;
  const cazuri: Array<{ readonly id: string; readonly doc: Document; readonly p: ParametriExport }> = [
    ...CORPUS_CAM.flatMap((c) => c.parametri.map((p, k) => ({ id: `${c.id}[${k}]`, doc: c.doc, p }))),
    ...ID_CONTRACTE.flatMap((post) => (['mm', 'inch'] as const).filter((u) => u === 'mm' || CONTRACTE[post].unitati.inch !== null)
      .map((unitati) => ({ id: `placa-01/${post}/${unitati}`, doc: placa.doc, p: { origine: 'stanga-jos' as const, z0: 'sus' as const, post, unitati } }))),
    // Incrustațiile: fișierele dopurilor, după ale foii.
    ...CAZURI_INCRUSTATIE.slice(0, 3).flatMap((c, k) => {
      const d = incarca(documentCaz(c));
      return d.ok ? [{ id: `incrustatia-${k}`, doc: d.doc, p: { origine: 'stanga-jos' as const, z0: 'sus' as const } }] : [];
    }),
  ];
  let fisiere = 0, dopuri = 0;
  for (const { id, doc, p } of cazuri) {
    const r = await calculeazaExport(doc, p);
    if (!r.ok) continue;
    const post = p.post ?? 'grbl-11', d = dialect(post);
    const scrise = [...r.fisiere, ...r.dopuri.flatMap((x) => x.fisiere)];
    dopuri += r.dopuri.length;
    assert.deepEqual(r.inceput.map((x) => x.nume), scrise.map((f) => f.nume), `${id}: câte un început pe fișier, în ordinea lor`);
    for (const [k, f] of scrise.entries()) {
      const inc: InceputFisier = r.inceput[k]!;
      const toate = f.text.split('\n').filter((l, i, a) => i < a.length - 1 || l !== '');
      assert.deepEqual(inc.linii, toate.slice(0, inc.linii.length), `${id}/${f.nume}: nu e un prefix`);
      assert.equal(inc.restul, toate.length - inc.linii.length, `${id}/${f.nume}: restul`);
      assert.ok(inc.taiere, `${id}/${f.nume}: tăierea nu vine în ${INCEPUT_MAXIM} de linii`);
      assert.equal(lucru(inc.linii, d), 1, `${id}/${f.nume}: o singură mișcare de lucru în început`);
      assert.equal(lucru(inc.linii.slice(0, -1), d), 0, `${id}/${f.nume}: ultima linie e prima mișcare de lucru`);
      const ev = citesteProgram(`${inc.linii.join('\n')}\n`, d).evenimente;
      assert.ok(ev.some((e) => e.tip === 'ax'), `${id}/${f.nume}: axul nu pornește înaintea tăierii`);
      assert.ok(ev.some((e) => e.tip === 'miscare' && e.g === 0 && e.z !== null && e.x === null && e.y === null), `${id}/${f.nume}: fără Z-ul sigur`);
      fisiere++;
    }
  }
  assert.ok(fisiere >= 30, `doar ${fisiere} fișiere`);
  assert.ok(dopuri >= 2, `doar ${dopuri} dopuri`);
});

test('cu Z-ul sigur ales, începutul îl arată; numele ales de om e și al începutului', async () => {
  const placa = CORPUS_CAM.find((c) => c.id === 'placa-01')!;
  const r = await calculeazaExport(placa.doc, { origine: 'stanga-jos', z0: 'sus', zSigur: 20 });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.ok(r.inceput[0]!.linii.includes('G0 Z20.000'), r.inceput[0]!.linii.join('\n'));
  assert.equal(r.inceput[0]!.nume, r.fisiere[0]!.nume);
  // Numele ales de om (ADR 0291 §5) e și al începutului.
  const numit = await calculeazaExport(placa.doc, { origine: 'stanga-jos', z0: 'sus', numeFisier: 'placa-mea' });
  assert.ok(numit.ok);
  if (numit.ok) assert.deepEqual(numit.inceput.map((x) => x.nume), numit.fisiere.map((f) => f.nume));
});

/** Două foi cu ce tăia (un dreptunghi, un cerc) și una goală; foaia activă e a doua. */
function treiFoi(): Document {
  const d = docDin({ latime: 300, inaltime: 200, grosime: 18 },
    { id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'c', forma: { tip: 'cerc', raza: 20 }, matrice: { ...ID, e: 150, f: 100 } });
  const [r, c] = d.foi[0]!.instante;
  const nou = documentNou(d.foi[0]!.stoc).foi[0]!;
  return { ...d, foi: [{ ...nou, id: 'f1', instante: [r!] }, { ...nou, id: 'f2', instante: [c!] }, { ...nou, id: 'f3', instante: [] }] };
}

test('cu „Toate foile”: începutul fișierelor foii active, cu numele lor din arhivă; arhiva nu are început', async () => {
  const d = treiFoi();
  const p = { origine: 'stanga-jos', z0: 'sus' } as const;
  const r = await calculeazaExport(doarFoaia(d, 'f2'), { ...p, toateFoile: true }, undefined, d);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  const singura = await calculeazaExport(doarFoaia(d, 'f2'), p);
  assert.ok(singura.ok);
  if (!singura.ok) return;
  assert.deepEqual(r.inceput.map((x) => x.nume), ['cncvs2-stanga-jos-foaia-2.nc']);
  assert.deepEqual(r.inceput[0]!.linii, singura.inceput[0]!.linii, 'începutul foii active e cel al foii exportate singure');
  assert.ok(!r.inceput.some((x) => x.nume.endsWith('.zip')));
});
