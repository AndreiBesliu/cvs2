/**
 * Catalogul de freze (ADR 0302 §1, felia 16.A↑h-3), pe hârtie: felurile de azi (plată, planare, V, gravare) cu mărimile lor
 * standard, în milimetri și în țoli; valorile de pornire, din fel și diametru; fiecare freză a catalogului e una bună și trece
 * de schema operației; „Pune în frezele mele”: frezele care sunt deja în bibliotecă se sar, numele luat primește „(2)”, T-ul
 * e primul liber, iar peste plafonul bibliotecii nu intră nimic.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CATALOG_FREZE, cuDinCatalog, GRUPURI_CATALOG, tolFreza, type FrezaCatalog,
} from '../../src/model/catalogFreze.ts';
import { FELURI_CU_CAM, MARGINI_FREZA, problemeFreza, sculaDinFreza, type Freza, type FrezaSalvata } from '../../src/model/freza.ts';
import { operatieImplicita, type FormaDoc } from '../../src/model/document.ts';
import { operatieInMargini } from '../../src/model/schemaDocument.ts';

const din = (g: string): readonly FrezaCatalog[] => CATALOG_FREZE.filter((f) => f.grupCatalog === g);
const cu = (f: FrezaCatalog, nume: string = f.id): Freza => ({ ...f, nume });
const salvata = (f: Freza, id: string): FrezaSalvata => ({ ...f, id, rev: 1, schimbatLa: 1_000 });

test('grupurile și mărimile, ca în ADR 0302 §1', () => {
  assert.deepEqual(GRUPURI_CATALOG, ['plata', 'planare', 'v', 'gravare', 'bila', 'toroidala', 'conica', 'burghiu', 'rotunjire', 'ogee', 'ogee-roman', 'panou']);
  assert.deepEqual(din('plata').map((f) => f.diametru), [1, 1.5, 2, 2.5, 3, 3.175, 4, 5, 6, 6.35, 8, 9.525, 10, 12, 12.7, 16, 19.05]);
  assert.deepEqual(din('planare').map((f) => f.diametru), [19.05, 25.4, 31.75, 38.1, 50.8]);
  assert.deepEqual(din('v').map((f) => `${f.unghi}/${f.diametru}`), [
    '30/6', '30/12.7', '45/6', '45/12.7', '60/6', '60/12', '60/12.7', '60/25.4',
    '90/6', '90/12', '90/12.7', '90/25.4', '90/31.75', '120/12.7', '120/25.4', '150/12.7', '150/25.4',
  ]);
  const g = din('gravare');
  assert.equal(g.length, 30);
  assert.deepEqual([...new Set(g.map((f) => f.unghi))], [10, 15, 20, 30, 45, 60]);
  assert.deepEqual([...new Set(g.filter((f) => f.diametru === 3.175).map((f) => f.varf))], [0.1, 0.2, 0.3, 0.5]);
  assert.deepEqual(g.filter((f) => f.diametru === 6).map((f) => `${f.unghi}/${f.varf}`), ['30/0.2', '30/0.5', '45/0.2', '45/0.5', '60/0.2', '60/0.5']);
  // Felurile noi (16.A↑h-4): bila, toroidala, conica cu vârf rotund pe 1/4", burghiul din 0,5 în 0,5.
  assert.deepEqual(din('bila').map((f) => f.diametru), [1, 1.5, 2, 3, 3.175, 4, 6, 6.35, 8, 10, 12, 12.7]);
  assert.deepEqual(din('toroidala').map((f) => `${f.diametru}/${f.raza}`), ['6/0.5', '6/1', '8/1', '10/1', '10/2', '12/2']);
  assert.deepEqual(din('conica').map((f) => `${f.unghi}/${f.raza}/${f.diametru}`), [
    '10/0.25/6.35', '10/0.5/6.35', '10/1/6.35', '15/0.25/6.35', '15/0.5/6.35', '15/1/6.35', '20/0.25/6.35', '20/0.5/6.35', '20/1/6.35',
  ]);
  assert.deepEqual(din('burghiu').map((f) => f.diametru), Array.from({ length: 23 }, (_, i) => 1 + i / 2));
  assert.ok(din('burghiu').every((f) => f.unghi === 118));
  // Profilurile (16.A↑h-5): rotunjirile și ogee-urile cu vârful de Ø6 (D = 2r + 6, 4r + 6, 4r + 2t + 6), ogee-ul roman cu
  // treapta 1,5; panourile de 1 1/2" și 2" cu fundul plat de 1/4", drepte la 10°, 12°, 15° și cu scobitura R1/4" la 12°.
  const nr3 = (x: number): number => Math.round(x * 1000) / 1000;
  assert.deepEqual(din('rotunjire').map((f) => `${f.raza}/${nr3(f.diametru)}`), [
    '2/10', '3/12', '3.175/12.35', '4/14', '5/16', '6/18', '6.35/18.7', '8/22', '9.525/25.05', '10/26', '12.7/31.4',
  ]);
  assert.deepEqual(din('ogee').map((f) => `${f.raza}/${nr3(f.diametru)}`), ['2/14', '3/18', '3.175/18.7', '4/22', '5/26', '6/30', '6.35/31.4']);
  assert.deepEqual(din('ogee-roman').map((f) => `${f.raza}/${f.treapta}/${nr3(f.diametru)}`), ['3/1.5/21', '4/1.5/25', '5/1.5/29', '6/1.5/33']);
  assert.deepEqual(din('panou').map((f) => `${f.unghi}/${f.varf}/${f.raza ?? '-'}/${f.diametru}`), [
    '10/6.35/-/38.1', '12/6.35/-/38.1', '15/6.35/-/38.1', '12/6.35/6.35/38.1',
    '10/6.35/-/50.8', '12/6.35/-/50.8', '15/6.35/-/50.8', '12/6.35/6.35/50.8',
  ]);
  assert.equal(CATALOG_FREZE.length, 17 + 5 + 17 + 30 + 12 + 6 + 9 + 23 + 11 + 7 + 4 + 8);
  // Felurile: planarea e o freză plată mare; V-ul și gravarea au unghiul; doar gravarea are vârful.
  assert.ok(din('planare').every((f) => f.fel === 'plata'));
  assert.ok(din('v').every((f) => f.fel === 'v' && f.varf === undefined));
  assert.ok(g.every((f) => f.fel === 'gravare'));
  // Id-urile, fixe și unice.
  assert.equal(new Set(CATALOG_FREZE.map((f) => f.id)).size, CATALOG_FREZE.length);
  assert.equal(din('v').find((f) => f.unghi === 90 && f.diametru === 12.7)?.id, 'cat-v-90-12.7');
});

test('fiecare freză a catalogului e bună și trece de schema operației (ușa documentului)', () => {
  const forma: FormaDoc = { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 0 };
  for (const f of CATALOG_FREZE) {
    assert.deepEqual(problemeFreza(cu(f)), {}, f.id);
    // Felurile fără CAM încă (conica, burghiul) n-au copie pentru document; bila are, din v29, toroidala din v31, profilurile
    // din v32 (ADR 0304, ca linii).
    if ((FELURI_CU_CAM as readonly string[]).includes(f.fel)) {
      assert.ok(operatieInMargini({ ...operatieImplicita('e', forma), scula: sculaDinFreza(cu(f)) }), f.id);
    }
    assert.ok(f.pasLateral <= MARGINI_FREZA.pasLateral, f.id);
  }
});

test('valorile de pornire, pe hârtie: turația după diametru, avansul din tăișuri și așchia pe dinte, plonjarea o treime', () => {
  const pe = (id: string): FrezaCatalog => CATALOG_FREZE.find((f) => f.id === id)!;
  const v = (f: FrezaCatalog): unknown[] => [f.turatie, f.taisuri, f.avans, f.plonjare, f.pas, f.pasLateral, f.tais];
  // Plată Ø6: 18 000 · 2 · 0,05 = 1 800; pasul Ø/2 = 3; tăișul 22.
  assert.deepEqual(v(pe('cat-plata-6')), [18000, 2, 1800, 600, 3, 40, 22]);
  // Plată Ø1: 20 000 · 2 · 0,02 = 800; plonjarea 800 / 3 → 250 (din 50 în 50); pasul 0,5; tăișul 6.
  assert.deepEqual(v(pe('cat-plata-1')), [20000, 2, 800, 250, 0.5, 40, 6]);
  // Plată Ø3,175: 20 000 · 2 · 0,03 = 1 200; pasul 1,6 (Ø/2 la zecime).
  assert.deepEqual(v(pe('cat-plata-3.175')), [20000, 2, 1200, 400, 1.6, 40, 12]);
  // Plată Ø12: 16 000 · 2 · 0,08 = 2 560 → 2 550; pasul la cel mult 4.
  assert.deepEqual(v(pe('cat-plata-12')), [16000, 2, 2550, 850, 4, 40, 30]);
  // Planarea Ø25,4: 12 000 · 2 · 0,1 = 2 400; pasul 1, pasul lateral 50 %, tăișul 12.
  assert.deepEqual(v(pe('cat-planare-25.4')), [12000, 2, 2400, 800, 1, 50, 12]);
  // V90 Ø12,7: ca plata de același diametru, pasul 2, fără tăiș (conul îl dă).
  assert.deepEqual(v(pe('cat-v-90-12.7')), [16000, 2, 2550, 850, 2, 40, undefined]);
  // V60 Ø6: pasul 1,5.
  assert.deepEqual(v(pe('cat-v-60-6')), [18000, 2, 1800, 600, 1.5, 40, undefined]);
  // Gravarea: 20 000 rot/min, un tăiș, 800 și 250 mm/min, pasul 0,5.
  assert.deepEqual(v(pe('cat-gravare-30-0.2-3.175')), [20000, 1, 800, 250, 0.5, 40, undefined]);
});

test('țolii: nota mărimilor în țoli; mărimile metrice n-au notă', () => {
  assert.equal(tolFreza(3.175), '1/8"');
  assert.equal(tolFreza(6.35), '1/4"');
  assert.equal(tolFreza(9.525), '3/8"');
  assert.equal(tolFreza(12.7), '1/2"');
  assert.equal(tolFreza(19.05), '3/4"');
  assert.equal(tolFreza(25.4), '1"');
  assert.equal(tolFreza(31.75), '1 1/4"');
  assert.equal(tolFreza(38.1), '1 1/2"');
  assert.equal(tolFreza(50.8), '2"');
  assert.equal(tolFreza(6), undefined);
  assert.equal(tolFreza(12), undefined);
});

test('„Pune în frezele mele”: cele care sunt deja se sar, numele luat primește „(2)”, T-ul e primul liber', () => {
  const p6 = CATALOG_FREZE.find((f) => f.id === 'cat-plata-6')!;
  const p8 = CATALOG_FREZE.find((f) => f.id === 'cat-plata-8')!;
  const v90 = CATALOG_FREZE.find((f) => f.id === 'cat-v-90-12')!;
  // În bibliotecă: o plată Ø6 (alt nume, alte valori: tot ea e), o freză cu numele „Plată Ø8”, dar Ø7, pe T1 și T2.
  const lista = [
    salvata({ ...cu(p6, 'A mea'), numar: 1, avans: 900 }, 'a'),
    salvata({ ...cu(p8, 'Plată Ø8'), diametru: 7, numar: 2 }, 'b'),
  ];
  let k = 0;
  const r = cuDinCatalog(lista, [cu(p6, 'Plată Ø6'), cu(p8, 'Plată Ø8'), cu(v90, 'V90 Ø12')], () => `n${++k}`, 7);
  assert.equal(r.adaugate, 2);
  assert.equal(r.existente, 1);
  assert.equal(r.plina, false);
  const noi = r.lista.slice(2);
  assert.deepEqual(noi.map((f) => [f.nume, f.numar, f.diametru]), [['Plată Ø8 (2)', 3, 8], ['V90 Ø12', 4, 12]]);
  assert.deepEqual(noi.map((f) => [f.id, f.rev, f.schimbatLa]), [['n1', 1, 7], ['n2', 1, 7]]);
  // Câmpurile catalogului (id-ul și grupul lui) nu intră în freza din bibliotecă.
  assert.ok(noi.every((f) => !('grupCatalog' in f)));
  // Aceeași cerere încă o dată: toate sunt deja.
  const d = cuDinCatalog(r.lista, [cu(p6), cu(p8), cu(v90)], () => 'x', 8);
  assert.deepEqual([d.adaugate, d.existente, d.lista], [0, 3, r.lista]);
});

test('„Pune în frezele mele”, profilurile (16.A↑h-5): geometria ține și treapta ogee-ului roman, fundul plat și scobitura panoului', () => {
  const ogr = CATALOG_FREZE.find((f) => f.id === 'cat-ogee-roman-3-1.5')!;
  const pan = CATALOG_FREZE.find((f) => f.id === 'cat-panou-12-50.8')!;
  const lista = [salvata({ ...cu(ogr, 'A'), treapta: 1 }, 'a'), salvata({ ...cu(pan, 'B'), varf: 8 }, 'b')];
  let k = 0;
  const r = cuDinCatalog(lista, [cu(ogr), cu(pan), cu(CATALOG_FREZE.find((f) => f.id === 'cat-panou-12-r6.35-50.8')!)], () => `n${++k}`, 7);
  assert.deepEqual([r.adaugate, r.existente], [3, 0]);
  // Aceleași, încă o dată: toate sunt deja.
  const d = cuDinCatalog(r.lista, [cu(ogr), cu(pan)], () => 'x', 8);
  assert.deepEqual([d.adaugate, d.existente], [0, 2]);
});

test('„Pune în frezele mele”: plafonul bibliotecii (500): cât încape, iar restul se spune', () => {
  const p = CATALOG_FREZE.find((f) => f.id === 'cat-plata-6')!;
  const lista = Array.from({ length: MARGINI_FREZA.freze - 1 }, (_, i) => salvata({ ...cu(p, `F${i}`), diametru: 1 + i / 10, numar: (i % 999) + 1 }, `f${i}`));
  const alese = ['cat-v-90-12', 'cat-v-60-6', 'cat-v-120-12.7'].map((id) => cu(CATALOG_FREZE.find((f) => f.id === id)!));
  let k = 0;
  const r = cuDinCatalog(lista, alese, () => `n${++k}`, 7);
  assert.equal(r.adaugate, 1);
  assert.equal(r.plina, true);
  assert.equal(r.lista.length, MARGINI_FREZA.freze);
});
