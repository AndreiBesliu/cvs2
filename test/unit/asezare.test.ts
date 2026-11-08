/**
 * „Așază pe foi” (ADR 0210 §3, felia 11.3↑), pe hârtie: proba din prag (25 de plăcuțe de 80 × 30 pe foi de 300 × 200, cu
 * marginea 10 și distanța 5: 3 pe rând, la x = 10 / 95 / 180, și 5 rânduri, la y = 160 / 125 / 90 / 55 / 20; deci 15 pe
 * foaie și 25 = 15 + 10), colțurile, ocolirea pieselor rămase (cu freza lor), distanța sub freză, piesa prea mare, ordinea,
 * rotirea cu 90° doar când încap mai multe, foaia următoare goală și „Mută și așază la capăt” pe altă foaie. Comenzile se
 * aplică într-un pas, cu inversa exactă, iar documentul de după trece de ușă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ASEZARE_IMPLICITA, comenziAsezare, distantaMinima, peFoi, planAsezare, type OptiuniAsezare, type PlanAsezare,
} from '../../src/model/asezare.ts';
import { documentNou, operatieImplicita, type Document, type Foaie, type Instanta, type Operatie, type Piesa } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { jsonCanonic } from '../../src/model/jsonCanonic.ts';
import { anuleaza, executa, istoricNou, type Comanda } from '../../src/model/jurnal.ts';

const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Un dreptunghi `l × h`, cu colțul stânga-jos în originea piesei; profil exterior cu freza `freza`, dacă se cere. */
function dreptunghi(id: string, l: number, h: number, freza = 0): Piesa {
  const forma = { tip: 'dreptunghi', latime: l, inaltime: h, razaColt: 0 } as const;
  const o = operatieImplicita(id, forma);
  const operatii: Operatie[] = freza > 0 ? [{ ...o, latura: 'exterior', scula: { ...o.scula, diametru: freza } }] : [];
  return { id, radacina: { tip: 'element', id, forma, matrice: ID }, operatii };
}

const inst = (id: string, piesa: string, x = 0, y = 0, rotire = 0): Instanta => ({ id, piesa, x, y, rotire });
const foaie = (id: string, instante: Instanta[] = [], latime = 300, inaltime = 200): Foaie => ({ id, stoc: { latime, inaltime, grosime: 10 }, instante });
const proiect = (foi: Foaie[], piese: Piesa[]): Document => ({ ...documentNou({ latime: 300, inaltime: 200, grosime: 10 }), piese, foi });
const opt = (o: Partial<OptiuniAsezare> = {}): OptiuniAsezare => ({ ...ASEZARE_IMPLICITA, ...o });
const bun = (p: PlanAsezare): Extract<PlanAsezare, { ok: true }> => {
  if (!p.ok) throw new Error(`refuz: ${p.motiv}`);
  return p;
};
const xy = (p: Extract<PlanAsezare, { ok: true }>, foaieId: string | number): number[][] => p.locuri.filter((l) => l.foaie === foaieId).map((l) => [l.x, l.y]);

/** Comenzile într-un pas: documentul de după trece de ușă, iar anularea dă exact documentul de dinainte. */
function aplica(doc: Document, comenzi: Comanda[]): Document {
  const h = executa(istoricNou(doc), comenzi.length === 1 && comenzi[0] ? comenzi[0] : { tip: 'lot', comenzi });
  assert.ok(incarca(JSON.parse(JSON.stringify(h.doc))).ok, 'documentul de după trece de ușă');
  assert.equal(jsonCanonic({ ...anuleaza(h).doc, rev: doc.rev }), jsonCanonic(doc), 'anularea dă documentul de dinainte');
  return h.doc;
}

const RANDURI = [160, 125, 90, 55, 20];
const COLOANE = [10, 95, 180];

test('proba din prag, pe hârtie: 25 de plăcuțe de 80 × 30 → 15 pe foaie (3 × 5) și 10 pe o foaie nouă, din stânga-sus', () => {
  const ids = Array.from({ length: 25 }, (_, k) => `i${k + 1}`);
  const doc = proiect([foaie('f1', ids.map((id) => inst(id, 'p')))], [dreptunghi('p', 80, 30)]);
  const p = bun(planAsezare(doc, ids, 'f1', opt()));
  assert.deepEqual(xy(p, 'f1'), RANDURI.flatMap((y) => COLOANE.map((x) => [x, y])));
  assert.deepEqual(xy(p, 0), [...RANDURI.slice(0, 3).flatMap((y) => COLOANE.map((x) => [x, y])), [10, 55]]);
  assert.equal(p.foiNoi, 1);
  assert.equal(p.dupa, 'f1');
  assert.deepEqual(peFoi(p), [['f1', 15], [0, 10]]);
  assert.deepEqual(p.preaMari, []);
  const d = aplica(doc, comenziAsezare(doc, 'f1', p));
  assert.equal(d.foi.length, 2);
  assert.deepEqual(d.foi.map((f) => f.instante.length), [15, 10]);
  assert.deepEqual(d.foi[1]?.stoc, doc.foi[0]?.stoc, 'foaia nouă e ca foaia pe care se așază');
  assert.deepEqual(d.foi[1]?.instante.map((i) => i.id), ids.slice(15), 'în ordinea așezării, la capătul foii noi');
  assert.equal(d.piese.length, 1, 'piesele nu se ating');
});

test('colțurile: din dreapta-jos, din stânga-jos și din dreapta-sus, rândurile pornesc de la colțul ales', () => {
  const ids = ['a', 'b', 'c', 'd'];
  const doc = proiect([foaie('f1', ids.map((id) => inst(id, 'p', 5, 5)))], [dreptunghi('p', 80, 30)]);
  assert.deepEqual(xy(bun(planAsezare(doc, ids, 'f1', opt({ colt: 'dreapta-jos' }))), 'f1'), [[210, 10], [125, 10], [40, 10], [210, 45]]);
  assert.deepEqual(xy(bun(planAsezare(doc, ids, 'f1', opt({ colt: 'stanga-jos' }))), 'f1'), [[10, 10], [95, 10], [180, 10], [10, 45]]);
  assert.deepEqual(xy(bun(planAsezare(doc, ids, 'f1', opt({ colt: 'dreapta-sus' }))), 'f1'), [[210, 160], [125, 160], [40, 160], [210, 125]]);
  // Marginile și distanțele pe X și pe Y, diferite: X 20, Y 15; distanța X 10, Y 3.
  assert.deepEqual(xy(bun(planAsezare(doc, ids, 'f1', opt({ margineX: 20, margineY: 15, distantaX: 10, distantaY: 3 }))), 'f1'),
    [[20, 155], [110, 155], [200, 155], [20, 122]]);
});

test('piesele care rămân pe foaie se ocolesc, la distanța aleasă sau cât freza lor, dacă e mai mare', () => {
  // Rămâne plăcuța „r” în stânga-sus (10, 160): se așază după ea.
  const doc = proiect([foaie('f1', [inst('r', 'p', 10, 160), inst('a', 'p'), inst('b', 'p'), inst('c', 'p')])], [dreptunghi('p', 80, 30)]);
  assert.deepEqual(xy(bun(planAsezare(doc, ['a', 'b', 'c'], 'f1', opt())), 'f1'), [[95, 160], [180, 160], [10, 125]]);
  // Cu un profil exterior Ø8 pe piesa care rămâne: 8 mm de ea, pe X și pe Y (rândul al doilea, 45 < 40 + 8, o ocolește și el).
  const cuFreza = proiect([foaie('f1', [inst('r', 'q', 10, 160), inst('a', 'p'), inst('b', 'p'), inst('c', 'p')])], [dreptunghi('p', 80, 30), dreptunghi('q', 80, 30, 8)]);
  assert.deepEqual(xy(bun(planAsezare(cuFreza, ['a', 'b', 'c'], 'f1', opt())), 'f1'), [[98, 160], [183, 160], [98, 125]]);
});

test('distanța e cel puțin freza profilelor exterioare: sub ea, refuz; valorile greșite și nimicul, refuzate', () => {
  const doc = proiect([foaie('f1', [inst('a', 'p'), inst('b', 'p')])], [dreptunghi('p', 80, 30, 6)]);
  assert.equal(distantaMinima(doc, ['a', 'b'], 'f1'), 6);
  assert.deepEqual(planAsezare(doc, ['a', 'b'], 'f1', opt()), { ok: false, motiv: 'distanta' });
  assert.deepEqual(planAsezare(doc, ['a', 'b'], 'f1', opt({ distantaX: 6, distantaY: 5.9 })), { ok: false, motiv: 'distanta' });
  assert.deepEqual(xy(bun(planAsezare(doc, ['a', 'b'], 'f1', opt({ distantaX: 6, distantaY: 6 }))), 'f1'), [[10, 160], [96, 160]]);
  for (const rea of [{ margineX: -1 }, { distantaY: Number.NaN }, { distantaX: 1001 }, { margineX: 150 }, { margineY: 100 }] as const) {
    assert.deepEqual(planAsezare(doc, ['a', 'b'], 'f1', opt({ distantaX: 6, distantaY: 6, ...rea })), { ok: false, motiv: 'valori' }, JSON.stringify(rea));
  }
  assert.deepEqual(planAsezare(doc, [], 'f1', opt({ distantaX: 6, distantaY: 6 })), { ok: false, motiv: 'nimic' });
  assert.deepEqual(planAsezare(doc, ['a'], 'nu-e', opt({ distantaX: 6, distantaY: 6 })), { ok: false, motiv: 'nimic' });
});

test('o piesă mai mare decât foaia (290 > 300 − 2 · 10) rămâne pe loc; celelalte se așază', () => {
  const doc = proiect([foaie('f1', [inst('mare', 'm', 3, 4), inst('a', 'p'), inst('b', 'p')])], [dreptunghi('m', 290, 30), dreptunghi('p', 80, 30)]);
  const p = bun(planAsezare(doc, ['mare', 'a', 'b'], 'f1', opt()));
  assert.deepEqual(p.preaMari, ['mare']);
  assert.deepEqual(p.locuri.map((l) => l.id), ['a', 'b']);
  const d = aplica(doc, comenziAsezare(doc, 'f1', p));
  assert.deepEqual(d.foi[0]?.instante.find((i) => i.id === 'mare'), inst('mare', 'm', 3, 4), 'rămâne pe loc');
});

test('ordinea: cele mai mari (după arie) întâi; ca în listă, implicit', () => {
  const doc = proiect([foaie('f1', [inst('A', 'a'), inst('B', 'b'), inst('C', 'c')])], [dreptunghi('a', 50, 20), dreptunghi('b', 100, 60), dreptunghi('c', 80, 30)]);
  // Mari: B (6 000), C (2 400), A (1 000), pe același rând: x 10, 115, 200; fiecare cu fața de sus la 190.
  const mari = bun(planAsezare(doc, ['A', 'B', 'C'], 'f1', opt({ ordinea: 'mari' })));
  assert.deepEqual(mari.locuri.map((l) => [l.id, l.x, l.y]), [['B', 10, 130], ['C', 115, 160], ['A', 200, 170]]);
  const lista = bun(planAsezare(doc, ['A', 'B', 'C'], 'f1', opt()));
  assert.deepEqual(lista.locuri.map((l) => [l.id, l.x, l.y]), [['A', 10, 170], ['B', 65, 130], ['C', 170, 160]]);
});

test('rotirea cu 90° doar când încap mai multe: 6 piese de 50 × 110 încap culcate pe o foaie (2 × 3), nu în picioare (5 + 1)', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  const doc = proiect([foaie('f1', ids.map((id) => inst(id, 'p')))], [dreptunghi('p', 50, 110)]);
  const fara = bun(planAsezare(doc, ids, 'f1', opt()));
  assert.deepEqual(peFoi(fara), [['f1', 5], [0, 1]]);
  const cu = bun(planAsezare(doc, ids, 'f1', opt({ rotirea: '90' })));
  assert.deepEqual(peFoi(cu), [['f1', 6]]);
  assert.equal(cu.rotite, 6);
  // Culcată (rotită cu 90° în jurul originii), cutia e [−110, 0] × [0, 50]: colțul cutiei în (10, 140) cere instanța în (120, 140).
  assert.deepEqual(cu.locuri.map((l) => [l.x, l.y, l.rotire]), [[120, 140, 90], [235, 140, 90], [120, 85, 90], [235, 85, 90], [120, 30, 90], [235, 30, 90]]);
  aplica(doc, comenziAsezare(doc, 'f1', cu));
  // Plăcuțele de 80 × 30 sunt deja culcate: în picioare ar încăpea mai puține, deci rămân nerotite.
  const placute = proiect([foaie('f1', ids.map((id) => inst(id, 'q')))], [dreptunghi('q', 80, 30)]);
  const r = bun(planAsezare(placute, ids, 'f1', opt({ rotirea: '90' })));
  assert.equal(r.rotite, 0);
  // O piesă care încape doar rotită (210 de înălțime pe 200) se rotește, chiar și fără alte câștiguri.
  const inalta = proiect([foaie('f1', [inst('t', 't')])], [dreptunghi('t', 40, 210)]);
  assert.deepEqual(bun(planAsezare(inalta, ['t'], 'f1', opt())).preaMari, ['t']);
  const rotita = bun(planAsezare(inalta, ['t'], 'f1', opt({ rotirea: '90' })));
  assert.deepEqual(rotita.locuri.map((l) => [l.x, l.y, l.rotire]), [[220, 150, 90]]);
});

test('vărsarea: întâi foaia următoare, dacă e goală; una cu piese oprește șirul, iar foile noi vin după ultima folosită', () => {
  const ids = Array.from({ length: 17 }, (_, k) => `i${k}`);
  const doc = proiect([foaie('f1', ids.map((id) => inst(id, 'p'))), foaie('f2'), foaie('f3', [inst('x', 'p', 10, 10)])], [dreptunghi('p', 80, 30)]);
  // 15 pe f1, 2 pe f2 (goală), nimic pe f3.
  const p = bun(planAsezare(doc, ids, 'f1', opt()));
  assert.deepEqual(peFoi(p), [['f1', 15], ['f2', 2]]);
  assert.equal(p.foiNoi, 0);
  // 32: 15 + 15 pe f1 și f2, apoi 2 pe o foaie nouă, după f2 (înaintea lui f3).
  const multe = Array.from({ length: 32 }, (_, k) => `j${k}`);
  const doc2 = proiect([foaie('f1', multe.map((id) => inst(id, 'p'))), foaie('f2'), foaie('f3', [inst('x', 'p', 10, 10)])], [dreptunghi('p', 80, 30)]);
  const p2 = bun(planAsezare(doc2, multe, 'f1', opt()));
  assert.deepEqual(peFoi(p2), [['f1', 15], ['f2', 15], [0, 2]]);
  assert.equal(p2.dupa, 'f2');
  const d = aplica(doc2, comenziAsezare(doc2, 'f1', p2));
  assert.deepEqual(d.foi.map((f) => [f.id, f.instante.length]), [['f1', 15], ['f2', 15], ['f4', 2], ['f3', 1]]);
});

test('„Mută și așază la capăt”: pe altă foaie, după piesele ei, la capătul listei ei; foaia de unde pleacă le pierde', () => {
  const doc = proiect([foaie('f1', [inst('a', 'p', 3, 3), inst('b', 'p', 100, 3), inst('c', 'p', 200, 3)]), foaie('f2', [inst('r', 'p', 10, 160)])], [dreptunghi('p', 80, 30)]);
  const p = bun(planAsezare(doc, ['a', 'c'], 'f1', opt(), 'f2'));
  assert.equal(p.spre, 'f2');
  assert.deepEqual(xy(p, 'f2'), [[95, 160], [180, 160]]);
  const d = aplica(doc, comenziAsezare(doc, 'f1', p));
  assert.deepEqual(d.foi[0]?.instante.map((i) => i.id), ['b']);
  assert.deepEqual(d.foi[1]?.instante.map((i) => [i.id, i.x, i.y]), [['r', 10, 160], ['a', 95, 160], ['c', 180, 160]]);
});
