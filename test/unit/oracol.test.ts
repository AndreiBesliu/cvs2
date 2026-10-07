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

// ── Invarianta 5, ieșirea din foaie (decizia owner-ului din 07.10.2026) ──────────────────────────────────────────
// Foaia 140 × 100, freza Ø6, deci R = 3. Cât trece discul peste fiecare latură, cu centrul sculei pe eșantioanele de
// tăiere, în document: st = R − min x, dr = max x + R − 140, jos = R − min y, sus = max y + R − 100 (sub 0 → 0).

const A = '(CONFIRMAT: freza iese din foaie)';
const B = (st: string, dr: string, jos: string, sus: string): string => `(iesire mm: st ${st} dr ${dr} jos ${jos} sus ${sus})`;
/** Antetul aplicației: comentariile, apoi declarația (dacă e), apoi programul (care începe cu G90). */
const cuAntet = (declaratie: readonly string[], text: string): string =>
  `${['(CNC Vector Studio)', '(scula T1 freza plata D6.000)', ...declaratie].join('\n')}\n${text}`;
const mesaje5 = (text: string, ctx: ContextPoarta = CTX): string[] =>
  poarta(text, ctx).filter((i) => i.invarianta === 5).map((i) => i.mesaj);

/** Dreptunghiul 1…30 × 20…80 la Z-2: latura din stânga are centrul la x = 1, deci st = 3 − 1 = 2.000, restul 0. */
const IESE_ST = ['G0 X1.000 Y20.000', 'G1 Z-2.000 F300.0', 'G1 Y80.000 F1000.0', 'G1 X30.000', 'G1 Y20.000', 'G1 X1.000'];
const DECL_ST = [A, B('2.000', '0.000', '0.000', '0.000')];

test('5, ieșirea: discul trece de marginea stângă cu 2.000, nedeclarat: prins, o singură dată pe program', () => {
  // Centrul la x = 1 e la mai puțin de R de margine: regula veche (centrul mai departe de R) l-ar fi lăsat să treacă.
  const v = poarta(cuAntet([], prog(...IESE_ST)), CTX);
  assert.deepEqual(v.map((i) => i.invarianta), [5], JSON.stringify(v));
  assert.match(v[0]?.mesaj ?? '', /^tăiere în afara foii, nedeclarată: st 2\.000 mm$/);
  // Prima tăiere care iese e plonjarea: 2 comentarii + 5 linii de antet + G0, deci linia 9.
  assert.equal(v[0]?.linia, 9);
  // Programul vechi, la X500: dr = 500 + 3 − 140 = 363.000.
  assert.deepEqual(mesaje5(prog('G0 X500.000 Y20.000', 'G1 Z-2.000 F300.0')), ['tăiere în afara foii, nedeclarată: dr 363.000 mm']);
});

test('5, controlul: același program cu declarația corectă trece; declarația se compară cu măsura, la 0,005 mm', () => {
  const cu = (st: string): string => cuAntet([A, B(st, '0.000', '0.000', '0.000')], prog(...IESE_ST));
  assert.deepEqual(poarta(cu('2.000'), CTX), []);
  // |2.004 − 2.000| = 0.004 ≤ 0.005: trece. |2.006 − 2.000| = 0.006 și |2.100 − 2.000| = 0.100: prinse.
  assert.deepEqual(poarta(cu('2.004'), CTX), []);
  for (const gresit of ['2.006', '2.100']) {
    assert.deepEqual(invariante(cu(gresit)), [5], gresit);
    assert.deepEqual(mesaje5(cu(gresit)), [`declarația de ieșire nu corespunde: st declarat ${gresit}, măsurat 2.000`]);
  }
});

test('5, o declarație pe un program care rămâne în foaie e prinsă', () => {
  // Pătratul curat are centrul în 20…40 × 20…40: st = 3 − 20 < 0 → 0, nicio latură nu iese.
  const t = cuAntet(DECL_ST, CURAT);
  assert.deepEqual(invariante(t), [5]);
  assert.deepEqual(mesaje5(t), ['declarația de ieșire nu corespunde: st declarat 2.000, măsurat 0.000']);
});

/** Din (139, 50) în jos până la y = 2, apoi spre stânga până la x = 100: dr = 139 + 3 − 140 = 2.000, jos = 3 − 2 = 1.000. */
const IESE_DR_JOS = ['G0 X139.000 Y50.000', 'G1 Z-2.000 F300.0', 'G1 Y2.000 F1000.0', 'G1 X100.000'];

test('5, fiecare latură la locul ei: dreapta 2.000 și jos 1.000 trec; inversate în declarație, sunt prinse', () => {
  assert.deepEqual(poarta(cuAntet([A, B('0.000', '2.000', '1.000', '0.000')], prog(...IESE_DR_JOS)), CTX), []);
  const inversat = cuAntet([A, B('0.000', '1.000', '2.000', '0.000')], prog(...IESE_DR_JOS));
  assert.deepEqual(invariante(inversat), [5]);
  assert.deepEqual(mesaje5(inversat), ['declarația de ieșire nu corespunde: dr declarat 1.000, măsurat 2.000, jos declarat 2.000, măsurat 1.000']);
  assert.deepEqual(mesaje5(prog(...IESE_DR_JOS)), ['tăiere în afara foii, nedeclarată: dr 2.000 mm, jos 1.000 mm']);
});

test('5, declarația incompletă e prinsă: A fără B, B fără A, B stricat, ordinea inversă, o linie între ele, A cu spațiu', () => {
  const b = B('2.000', '0.000', '0.000', '0.000');
  const cazuri: Record<string, string[]> = {
    'A fără B': [A],
    'B fără A': [b],
    'B cu două zecimale': [A, '(iesire mm: st 2.00 dr 0.000 jos 0.000 sus 0.000)'],
    'B înaintea lui A': [b, A],
    'o linie între A și B': [A, '(post GRBL 1.1)', b],
    'A cu un spațiu după': [`${A} `, b],
  };
  // Pe pătratul curat (nu iese din foaie), singurul motiv e declarația ruptă.
  for (const [nume, declaratie] of Object.entries(cazuri)) {
    const t = cuAntet(declaratie, CURAT);
    assert.deepEqual(invariante(t), [5], nume);
    const m = mesaje5(t);
    assert.equal(m.length, 1, nume);
    assert.match(m[0] ?? '', /^declarație de ieșire incompletă: linia \d+ „/, nume);
  }
  // Pe programul care iese, A fără B: o singură încălcare, cu ambele motive.
  const m = mesaje5(cuAntet([A], prog(...IESE_ST)));
  assert.deepEqual(m, [`declarație de ieșire incompletă: linia 3 „${A}”; tăiere în afara foii, nedeclarată: st 2.000 mm`]);
});

test('5, declarația după prima tăiere e prinsă; înaintea ei, după rapide și după un G1 deasupra materialului, trece', () => {
  const [g0 = '', plonjare = '', ...rest] = IESE_ST;
  // Antetul are 5 linii, G0 e linia 6, plonjarea G1 Z-2 (prima tăiere) e linia 7, declarația vine pe 8 și 9.
  const dupa = prog(g0, plonjare, ...DECL_ST, ...rest);
  assert.deepEqual(invariante(dupa), [5]);
  assert.deepEqual(mesaje5(dupa), ['declarația vine după prima tăiere (linia 7)']);
  // G0 și un G1 la Z0.5 (deasupra materialului) nu taie: declarația de după ele, dar înaintea plonjării, e la timp.
  assert.deepEqual(poarta(prog(g0, 'G1 Z0.500 F300.0', ...DECL_ST, plonjare, ...rest), CTX), []);
});

test('5, declarația repetată e prinsă, chiar cu aceleași cote', () => {
  const t = cuAntet([...DECL_ST, ...DECL_ST], prog(...IESE_ST));
  assert.deepEqual(invariante(t), [5]);
  assert.deepEqual(mesaje5(t), ['declarația de ieșire apare de 2 ori']);
});

/**
 * Semicercul G3 din (60, 90) în (40, 90), centrul (50, 90), raza 10, în sens trigonometric: trece prin (50, 100).
 * Capetele au y = 90 (discul urcă până la 93, în foaie); vârful arcului are y = 100, deci sus = 100 + 3 − 100 = 3.000.
 * Restul: st = 3 − 40 → 0, dr = 60 + 3 − 140 → 0, jos = 3 − 90 → 0.
 */
const ARC_SUS = ['G0 X60.000 Y90.000', 'G1 Z-2.000 F300.0', 'G3 X40.000 Y90.000 I-10.000 J0.000 F1000.0'];

test('5, arcul: vârful semicercului, nu capetele lui, trece de marginea de sus cu 3.000', () => {
  assert.deepEqual(poarta(cuAntet([A, B('0.000', '0.000', '0.000', '3.000')], prog(...ARC_SUS)), CTX), []);
  assert.deepEqual(invariante(prog(...ARC_SUS)), [5]);
  assert.deepEqual(mesaje5(prog(...ARC_SUS)), ['tăiere în afara foii, nedeclarată: sus 3.000 mm']);
  // Declarat după capete (sus 0.000), arcul e prins.
  assert.deepEqual(invariante(cuAntet([A, B('0.000', '0.000', '0.000', '0.000')], prog(...ARC_SUS))), [5]);
});

test('5, discul tangent la margine nu iese: centrul la x = R trece fără declarație; la 2.997 iese cu 0.003', () => {
  const linie = (x: string): string => prog(`G0 X${x} Y20.000`, 'G1 Z-2.000 F300.0', 'G1 Y80.000 F1000.0');
  assert.deepEqual(poarta(linie('3.000'), CTX), []); // st = 3 − 3.000 = 0
  assert.deepEqual(poarta(linie('2.999'), CTX), []); // st = 0.001 ≤ 0.002, rotunjirea la 3 zecimale
  assert.deepEqual(mesaje5(linie('2.997')), ['tăiere în afara foii, nedeclarată: st 0.003 mm']); // 0.003 > 0.002
  // Dreptunghiul 3…137 × 3…97 e tangent la toate patru marginile: 3 − 3, 137 + 3 − 140, 3 − 3, 97 + 3 − 100, toate 0.
  const tangent = prog('G0 X3.000 Y3.000', 'G1 Z-2.000 F300.0', 'G1 X137.000 F1000.0', 'G1 Y97.000', 'G1 X3.000', 'G1 Y3.000');
  assert.deepEqual(poarta(tangent, CTX), []);
  // În zona rotunjirii, o declarație de 0.001 pe discul tangent e în toleranță (|0.001 − 0| ≤ 0.005): trece.
  assert.deepEqual(poarta(cuAntet([A, B('0.001', '0.000', '0.000', '0.000')], linie('3.000')), CTX), []);
});

test('5, Z sub fața de jos rămâne prins și cu declarația corectă de ieșire', () => {
  // Plonjări la x = 1 (st = 2.000, declarat corect) până la Z-19, sub fața de jos (grosimea 18, supracursa 0).
  const t = cuAntet(DECL_ST, prog('G0 X1.000 Y20.000', 'G1 Z-4.000 F300.0', 'G1 Z-8.000', 'G1 Z-12.000', 'G1 Z-16.000', 'G1 Z-19.000'));
  // Pe mișcare, ca înainte: plonjarea Z-16 → Z-19 (eșantioane la 3/48 mm: primul sub -18 e -16 − 33·3/48 = -18.0625)
  // și ridicarea G0 care pornește din Z-19. Partea XY (declarația) nu adaugă nimic.
  assert.deepEqual(mesaje5(t), [
    'Z -18.063 trece sub fața de jos (grosimea 18, supracursa 0)',
    'Z -19.000 trece sub fața de jos (grosimea 18, supracursa 0)',
  ]);
  // controlul: cu supracursa de 1.5, același program (cu aceeași declarație) trece de tot
  assert.deepEqual(poarta(t, { ...CTX, supracursa: 1.5 }), []);
});

test('5, originea dreapta-sus cu Z0 jos: alte cote de mașină, aceeași ieșire în document (st 2.000)', () => {
  // Document → mașină: x − 140, y − 100, z + 18. Latura x = 1 devine X-139, x = 30 devine X-110; Z-2 → Z16, Z5 → Z23.
  const ctx: ContextPoarta = { ...CTX, origine: 'dreapta-sus', z0: 'jos' };
  const masina = prog('G0 X-139.000 Y-80.000', 'G1 Z16.000 F300.0', 'G1 Y-20.000 F1000.0', 'G1 X-110.000', 'G1 Y-80.000', 'G1 X-139.000')
    .replaceAll('Z5.000', 'Z23.000');
  assert.deepEqual(poarta(cuAntet(DECL_ST, masina), ctx), []);
  assert.deepEqual(mesaje5(masina, ctx), ['tăiere în afara foii, nedeclarată: st 2.000 mm']);
});
