/**
 * Oracolul și poarta invariantelor, probate fără postul nostru: programe scrise de mână, unul curat și câte o otravă
 * pentru fiecare invariantă (`PLAN.md` §4.2: o metrică intră în poartă abia după ce o otravă o înroșește).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { poarta, type ContextPoarta } from '../oracles/poarta.ts';

const CTX: ContextPoarta = {
  foaie: { latime: 140, inaltime: 100, grosime: 18 },
  origine: 'stanga-jos',
  z0: 'sus',
  diametruScula: 6,
  pas: 4,
  supracursa: 0,
  asteptareAx: 3,
};

const ANTET = ['G90 G17 G21 G94', 'G54', 'G0 Z5.000', 'M3 S18000', 'G4 P3.000'];
const prog = (...linii: string[]): string => `${[...ANTET, ...linii, 'G0 Z5.000', 'M5', 'M30'].join('\n')}\n`;

/** Un pătrat de 20 × 20 tăiat pe linie, în două treceri de 4: curat. */
const CURAT = prog(
  'G0 X20.000 Y20.000', 'G1 Z-4.000 F300.0', 'G1 X40.000 F1000.0', 'G1 Y40.000', 'G1 X20.000', 'G1 Y20.000',
  'G1 Z-8.000 F300.0', 'G1 X40.000 F1000.0', 'G1 Y40.000', 'G1 X20.000', 'G1 Y20.000',
);

const invariante = (text: string, ctx: ContextPoarta = CTX): number[] => [...new Set(poarta(text, ctx).map((i) => i.invarianta))].sort();

test('controlul: programul curat trece de toate invariantele', () => {
  assert.deepEqual(poarta(CURAT, CTX), []);
});

test('1, pasul: o plonjare de 8 mm dintr-o dată, cu pasul de 4, e prinsă', () => {
  assert.deepEqual(invariante(prog('G0 X20.000 Y20.000', 'G1 Z-8.000 F300.0', 'G1 X40.000 F1000.0')), [1]);
});

test('3, rapidele: un G0 prin material e prins', () => {
  const t = prog('G0 X20.000 Y20.000', 'G1 Z-2.000 F300.0', 'G1 X30.000 F1000.0', 'G0 X60.000 Y60.000');
  assert.deepEqual(invariante(t), [3]);
});

test('5, limitele: sub fața de jos și în afara foii sunt prinse', () => {
  const sub = prog('G0 X20.000 Y20.000', 'G1 Z-4.000 F300.0', 'G1 Z-8.000', 'G1 Z-12.000', 'G1 Z-16.000', 'G1 Z-19.000');
  assert.ok(invariante(sub, { ...CTX, pas: 4 }).includes(5));
  const afara = prog('G0 X500.000 Y20.000', 'G1 Z-2.000 F300.0');
  assert.ok(invariante(afara).includes(5));
  // controlul: cu supracursa permisă, aceeași adâncime trece de 5
  assert.ok(!invariante(sub, { ...CTX, supracursa: 1.5 }).includes(5));
});

test('6, controlerul: număr fără punct, linie prea lungă, M6, arc cu error:33 și cerc fals sunt prinse', () => {
  assert.deepEqual(invariante(prog('G0 X20 Y20.000')), [6]);
  assert.deepEqual(invariante(prog(`(${'x'.repeat(80)})`)), [6]);
  assert.deepEqual(invariante(prog('T2 M6')), [6]);
  // Arcul de la (30, 20) la (10, 20) cu centrul (20, 20): I = −10. Cu I = −10.2, raza nu se mai potrivește: error:33.
  const arc = (i: string): string => prog('G0 X30.000 Y20.000', 'G1 Z-1.000 F300.0', `G3 X10.000 Y20.000 I${i} J0.000 F1000.0`);
  assert.deepEqual(invariante(arc('-10.000')), []);
  assert.deepEqual(invariante(arc('-10.200')), [6]);
  // Un arc minuscul al cărui capăt cade pe start devine cerc întreg pe GRBL.
  assert.deepEqual(invariante(prog('G0 X30.000 Y20.000', 'G1 Z-1.000 F300.0', 'G3 X30.000 Y20.000 I-10.000 J0.000 F1000.0')), [6]);
});

test('7, axul: tăiere cu axul oprit sau fără pauza de pornire e prinsă', () => {
  const faraAx = `${['G90 G17 G21 G94', 'G54', 'G0 Z5.000', 'G0 X20.000 Y20.000', 'G1 Z-2.000 F300.0', 'M30'].join('\n')}\n`;
  assert.deepEqual(invariante(faraAx), [7]);
  const faraPauza = `${['G90 G17 G21 G94', 'G54', 'G0 Z5.000', 'M3 S18000', 'G0 X20.000 Y20.000', 'G1 Z-2.000 F300.0', 'M5', 'M30'].join('\n')}\n`;
  assert.deepEqual(invariante(faraPauza), [7]);
  const pauzaScurta = faraPauza.replace('M3 S18000\n', 'M3 S18000\nG4 P1.000\n');
  assert.deepEqual(invariante(pauzaScurta), [7]);
});

test('8, cadrul: aceeași tăietură, judecată cu alt colț de origine, e prinsă', () => {
  const cadru = { minX: 20, maxX: 40, minY: 20, maxY: 40 };
  assert.deepEqual(poarta(CURAT, { ...CTX, cadru }), []);
  // Programul a fost scris pentru stânga-jos; citit ca dreapta-sus, cutia lui cade în altă parte a foii.
  assert.ok(invariante(CURAT, { ...CTX, origine: 'dreapta-sus', cadru }).includes(8));
});

test('pornirea: poziția inițială e necunoscută, dar un G0 care se termină în material e prins', () => {
  // Cu Z0 jos, (0, 0, 0) al mașinii e sub material: prima ridicare nu trebuie judecată de acolo.
  const jos: ContextPoarta = { ...CTX, z0: 'jos' };
  const curatJos = CURAT.replaceAll('Z5.000', 'Z23.000').replaceAll('Z-4.000', 'Z14.000').replaceAll('Z-8.000', 'Z10.000');
  assert.deepEqual(poarta(curatJos, jos), []);
  const intra = `${['G90 G17 G21 G94', 'G54', 'G0 X50.000 Y50.000 Z-2.000'].join('\n')}\n`;
  assert.ok(invariante(intra).includes(3));
});
