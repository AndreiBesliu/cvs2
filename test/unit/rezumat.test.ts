import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Miscare, Program } from '../../src/ir/ir.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { exporta } from '../../src/post/export.ts';
import { posteaza } from '../../src/post/post.ts';
import { calculeazaExport, rezumatJob } from '../../src/ui/actiuniExportCalcul.ts';
import { documentPlaca02, programPlaca02, SCULA } from '../placi/placa-02/genereaza.ts';

/** Rezumatul jobului (ADR 0046): secțiunile postului, împărțirea pe operații, profilul mașinii din `$$`. */

const FOAIA = { latime: 100, inaltime: 100, grosime: 18 };
const MONTAJ = { foaie: FOAIA, origine: 'stanga-jos', z0: 'sus' } as const;
const program = (miscari: readonly Miscare[]): Program => ({
  axe: ['X', 'Y', 'Z'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, turatie: 18000, zSigur: 5, miscari,
});
const OP_A: readonly Miscare[] = [
  { tip: 'eticheta', text: 'a', element: 'i1/e1', operatie: 'p1/o1' },
  { tip: 'rapida', la: { X: 10, Y: 0 } },
  { tip: 'taiere', la: { Z: -1 }, avans: 300 },
  { tip: 'taiere', la: { X: 20 }, avans: 1000 },
  { tip: 'rapida', la: { Z: 5 } },
];

const aproape = (real: number, asteptat: number, tol: number, ce: string): void => {
  assert.ok(Math.abs(real - asteptat) <= tol, `${ce}: ${real} față de ${asteptat} (±${tol})`);
};

test('secțiunile postului: linia comentariului fiecărei etichete cu element sau operație, apoi finalul; octeții nu se schimbă', () => {
  const miscari: Miscare[] = [
    ...OP_A,
    { tip: 'eticheta', text: 'fără element' },
    { tip: 'eticheta', text: 'b', element: 'i1/e2', operatie: 'p1/o2' },
    { tip: 'taiere', la: { Z: -1 }, avans: 300 },
    { tip: 'taiere', la: { X: 30 }, avans: 1000 },
  ];
  const r = posteaza(program(miscari), MONTAJ, GRBL_11, { asteptareAx: 3 });
  assert.ok(r.ok);
  if (!r.ok) return;
  const linii = r.text.split('\n');
  assert.equal(r.sectiuni.length, 3);
  const [a, b, fin] = r.sectiuni;
  assert.ok(a && b && fin);
  assert.deepEqual({ ...a, linie: undefined }, { linie: undefined, element: 'i1/e1', operatie: 'p1/o1' });
  assert.equal(linii[a.linie], '(a)');
  assert.deepEqual({ ...b, linie: undefined }, { linie: undefined, element: 'i1/e2', operatie: 'p1/o2' });
  assert.equal(linii[b.linie], '(b)');
  assert.equal(fin.element, undefined);
  assert.equal(linii[fin.linie], 'G0 Z5.000', 'finalul începe cu retragerea');
  // Aceleași mișcări fără `element` / `operatie`: același text, octet cu octet.
  const fara = posteaza(program(miscari.map((m) => (m.tip === 'eticheta' ? { tip: 'eticheta', text: m.text } : m))), MONTAJ, GRBL_11, { asteptareAx: 3 });
  assert.ok(fara.ok);
  if (fara.ok) {
    assert.equal(fara.text, r.text);
    assert.deepEqual(fara.sectiuni, [{ linie: fin.linie }]);
  }
});

test('rezumatul pe hârtie, implicitele GRBL 1.1h: pornirea (G0 Z5 + G4 P3) și o operație cu patru colțuri de 90°', async () => {
  // Pornirea: Z5 din Z0, triunghi (5 mm < v²/a = 6,9): 2·√(5/10) = 1,41421; pauza 3,0. Joncțiunile de 90°: v_j² =
  // (10/sin 45°)·0,01·√0,5/(1 − √0,5) = 0,341421. Blocurile, cu v = 8,333 mm/s (F1000 tăiat de $110 = 500):
  // X10: 1,976951; Z5 → Z−1 (6 mm) la F300 (5 mm/s), trapez între v_j și v_j: 1,589966; X20: 1,920568; Z5 (6 mm),
  // triunghi: 1,492964.
  const e = await exporta(program(OP_A), MONTAJ, GRBL_11, { asteptareAx: 3 });
  assert.ok(e.ok);
  if (!e.ok) return;
  const r = rezumatJob(e.exportat, program(OP_A).scula, undefined);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  aproape(r.restul.secunde, 4.414213562, 1e-6, 'restul');
  aproape(r.restul.pauze, 3, 1e-12, 'pauza după M3');
  assert.equal(r.peOperatie.length, 1);
  aproape(r.peOperatie[0]?.secunde ?? 0, 6.980448684, 1e-6, 'operația');
  aproape(r.total.secunde, 11.394662246, 1e-6, 'totalul');
  aproape(r.total.taiere, 16, 1e-9, 'tăierea: Z5 → Z−1 și X10 → X20');
  aproape(r.total.rapide, 5 + 10 + 6, 1e-9, 'rapidele: Z5, X10, Z5');
  assert.equal(r.liniiLimitate, 1, 'F1000 pe X peste $110 = 500');
  assert.deepEqual(r.masina, { nume: 'GRBL 1.1h', sursa: 'implicit', vitezaMaxima: [500, 500, 500], acceleratie: [10, 10, 10] });
  assert.deepEqual(r.peScula, [{ numar: 1, nume: 'freza plata', diametru: 6, ...r.total }]);
});

test('două operații despărțite de o pauză: fiecare are timpul ei pe hârtie (o rotire a timpilor între operații pică)', async () => {
  // Operația b începe cu G4 P1 (golirea bufferului), deci a se termină oprită ca înainte (6,980449 s), iar b e
  // 1 + G0 X30 din (20, 0) din repaus în repaus: 10 / 8,333 + 8,333 / 10 = 2,033333; total 4,414214 + 6,980449 + 3,033333.
  const miscari: Miscare[] = [
    ...OP_A,
    { tip: 'eticheta', text: 'b', element: 'i1/e2', operatie: 'p1/o2' },
    { tip: 'pauza', secunde: 1 },
    { tip: 'rapida', la: { X: 30 } },
  ];
  const e = await exporta(program(miscari), MONTAJ, GRBL_11, { asteptareAx: 3 });
  assert.ok(e.ok);
  if (!e.ok) return;
  const r = rezumatJob(e.exportat, program(miscari).scula, undefined);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  assert.deepEqual(r.peOperatie.map((o) => o.operatie), ['p1/o1', 'p1/o2']);
  aproape(r.peOperatie[0]?.secunde ?? 0, 6.980448684, 1e-6, 'operația a');
  aproape(r.peOperatie[1]?.secunde ?? 0, 3.033333333, 1e-6, 'operația b');
  aproape(r.peOperatie[1]?.pauze ?? 0, 1, 1e-12, 'pauza e a operației b');
  aproape(r.restul.secunde, 4.414213562, 1e-6, 'restul');
  aproape(r.total.secunde, 14.427995579, 1e-6, 'totalul');
});

test('placa 2: fiecare operație are timpul ei, iar operațiile plus restul dau totalul; `$$` mai rapid scurtează jobul', async () => {
  const pr = await programPlaca02();
  const doc = documentPlaca02();
  const r = rezumatJob(pr, SCULA, undefined);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  const chei = doc.piese.flatMap((p) => p.operatii.map((o) => `${p.id}/${o.id}`)).sort();
  assert.deepEqual(r.peOperatie.map((o) => o.operatie).sort(), chei);
  for (const o of r.peOperatie) assert.ok(o.secunde > 0 && o.taiere > 0, o.operatie);
  const suma = r.peOperatie.reduce((s, o) => s + o.secunde, r.restul.secunde);
  aproape(suma, r.total.secunde, 1e-6, 'suma');
  aproape(r.total.pauze, 3, 1e-12, 'o singură pauză, după M3');
  const rapid = rezumatJob(pr, SCULA, '$110=5000\n$111=5000\n$112=1000\n$120=500\n$121=500\n$122=200\n');
  assert.ok(rapid.ok, rapid.ok ? '' : rapid.motiv);
  if (!rapid.ok) return;
  assert.equal(rapid.masina.sursa, 'setari');
  assert.ok(rapid.total.secunde < r.total.secunde / 1.5, `${rapid.total.secunde} față de ${r.total.secunde}`);
  assert.equal(rapid.liniiLimitate, 0);
  aproape(rapid.total.taiere, r.total.taiere, 1e-9, 'distanțele nu depind de viteze');
});

test('`$$` greșit nu oprește exportul: programul iese, rezumatul spune linia', async () => {
  const doc = documentPlaca02();
  const r = await calculeazaExport(doc, { origine: 'stanga-jos', z0: 'sus', setariMasina: '$110=500\n$120=abc\n' });
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  assert.equal(r.rezumat.ok, false);
  if (!r.rezumat.ok) assert.deepEqual([r.rezumat.sursa, r.rezumat.linie], ['setari', 2]);
  const fara = await calculeazaExport(doc, { origine: 'stanga-jos', z0: 'sus' });
  assert.ok(fara.ok);
  if (fara.ok) {
    assert.equal(fara.program.sha256, r.program.sha256, 'setările mașinii nu schimbă programul');
    assert.equal(fara.rezumat.ok, true);
  }
});
