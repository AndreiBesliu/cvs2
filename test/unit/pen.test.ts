import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as v from 'valibot';
import { formaPen, nodPus, sePoateInchide } from '../../src/app/penCalcul.ts';
import { caleDinNoduri, manereNod, mutaManer, neted, schimbaTipNod, tipNod, type FormaCale, type NodCuManere } from '../../src/model/noduri.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { docDin, ID } from './ajutor-document.ts';

/**
 * Tipurile nodurilor și unealta Pen (ADR 0063): colțul, curba pe ambele părți (mânerele pe aceeași dreaptă), curba pe o parte
 * (și trecerea pe cealaltă), refuzurile lângă arce și la capete; mânerul tras pe un nod neted îl rotește pe celălalt; nodurile
 * Pen-ului și forma care iese din ele, validă în schemă.
 */

const P = (x: number, y: number) => ({ x, y });
const L = { tip: 'L' as const };
const patrat: FormaCale = { tip: 'cale', inchis: true, varfuri: [{ p: P(0, 0), s: L }, { p: P(30, 0), s: L }, { p: P(30, 30), s: L }, { p: P(0, 30), s: L }] };
const aproape = (a: { x: number; y: number } | null, b: { x: number; y: number }, mesaj: string): void => {
  assert.ok(a && Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9, `${mesaj}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
};
const valida = (f: FormaCale): boolean => v.is(SchemaDocument, docDin({ latime: 300, inaltime: 200, grosime: 18 }, { id: 'p', forma: f, matrice: ID }));

test('tipul nodului vine din mânere: o linie sau un punct de control lipit de nod = fără mâner', () => {
  for (let i = 0; i < 4; i++) assert.equal(tipNod(patrat, i), 'colt');
  const c: FormaCale = { tip: 'cale', inchis: false, varfuri: [
    { p: P(0, 0), s: { tip: 'C', c1: P(0, 0), c2: P(5, 10) } }, { p: P(10, 10), s: { tip: 'C', c1: P(15, 10), c2: P(20, 5) } }, { p: P(20, 0), s: L },
  ] };
  assert.equal(tipNod(c, 0), 'colt', 'c1 pe nod');
  assert.equal(tipNod(c, 1), 'ambele');
  assert.equal(tipNod(c, 2), 'inapoi');
  assert.equal(tipNod({ ...c, varfuri: c.varfuri.map((x, k) => (k === 1 ? { ...x, s: { tip: 'C' as const, c1: P(15, 10), c2: P(20, 0) } } : x)) }, 2), 'colt', 'c2 pe nod');
  assert.deepEqual(manereNod(c, 1), { inapoi: P(5, 10), inainte: P(15, 10) });
});

test('colțul pătratului devine curbă pe ambele părți: mânerele pe bisectoare, o treime din latură, netede; colțul îl readuce exact', () => {
  const r = schimbaTipNod(patrat, 1, 'ambele');
  assert.ok(typeof r !== 'string');
  assert.equal(tipNod(r, 1), 'ambele');
  assert.ok(neted(r, 1));
  const k = 10 / Math.SQRT2;
  const m = manereNod(r, 1);
  aproape(m.inainte, P(30 + k, k), 'înainte, pe bisectoarea (1, 1)');
  aproape(m.inapoi, P(30 - k, -k), 'înapoi, în oglindă');
  assert.equal(r.varfuri[0]!.s.tip, 'C');
  assert.equal(r.varfuri[2]!.s.tip, 'L', 'segmentele nevecine rămân linii');
  assert.ok(valida(r));
  assert.deepEqual(schimbaTipNod(r, 1, 'colt'), patrat, 'cubicele fără mânere redevin linii');
});

test('curba pe o parte: în prelungirea liniei care vine; cerută din nou trece pe cealaltă parte, pe aceeași dreaptă', () => {
  const a = schimbaTipNod(patrat, 1, 'o-parte');
  assert.ok(typeof a !== 'string');
  assert.equal(tipNod(a, 1), 'inainte');
  aproape(manereNod(a, 1).inainte, P(40, 0), 'linia (0,0)→(30,0) continuă drept în curbă');
  assert.equal(a.varfuri[0]!.s.tip, 'L', 'partea dinainte rămâne linie');
  const b = schimbaTipNod(a, 1, 'o-parte');
  assert.ok(typeof b !== 'string');
  assert.equal(tipNod(b, 1), 'inapoi');
  aproape(manereNod(b, 1).inapoi, P(20, 0), 'pe dreapta mânerului de dinainte');
  assert.equal(b.varfuri[1]!.s.tip, 'L', 'cubica rămasă fără mânere redevine linie');
  const c = schimbaTipNod(b, 1, 'o-parte');
  assert.ok(typeof c !== 'string');
  assert.equal(tipNod(c, 1), 'inainte');
  // Din ambele, pe o parte păstrează mânerul de înainte.
  const d = schimbaTipNod(schimbaTipNod(patrat, 2, 'ambele') as FormaCale, 2, 'o-parte') as FormaCale;
  assert.equal(tipNod(d, 2), 'inainte');
});

test('refuzurile: lângă un arc (nu se aproximează), la capătul unei căi deschise; colțul trece și lângă arc', () => {
  const cuArc: FormaCale = { tip: 'cale', inchis: true, varfuri: [{ p: P(0, 0), s: L }, { p: P(30, 0), s: { tip: 'A', bulge: 0.4 } }, { p: P(30, 30), s: L }, { p: P(0, 30), s: L }] };
  assert.equal(schimbaTipNod(cuArc, 1, 'ambele'), 'arc');
  assert.equal(schimbaTipNod(cuArc, 2, 'ambele'), 'arc');
  assert.equal(schimbaTipNod(cuArc, 1, 'o-parte'), 'arc', 'înainte e arcul');
  assert.equal(tipNod(schimbaTipNod(cuArc, 2, 'o-parte') as FormaCale, 2), 'inainte', 'înainte de nodul 2 e o linie');
  assert.notEqual(typeof schimbaTipNod(cuArc, 1, 'colt'), 'string');
  const deschisa: FormaCale = { tip: 'cale', inchis: false, varfuri: [{ p: P(0, 0), s: L }, { p: P(10, 0), s: L }, { p: P(20, 5), s: L }] };
  assert.equal(schimbaTipNod(deschisa, 0, 'ambele'), 'capat');
  assert.equal(schimbaTipNod(deschisa, 2, 'ambele'), 'capat');
  assert.equal(tipNod(schimbaTipNod(deschisa, 0, 'o-parte') as FormaCale, 0), 'inainte', 'începutul are doar partea dinainte');
  const sfarsit = schimbaTipNod(deschisa, 2, 'o-parte') as FormaCale;
  assert.equal(tipNod(sfarsit, 2), 'inapoi');
  assert.equal(schimbaTipNod(sfarsit, 2, 'o-parte'), 'capat', 'sfârșitul n-are partea dinainte');
  assert.ok(valida(sfarsit));
});

test('mânerul tras pe un nod neted îl rotește pe celălalt (cu lungimea lui); Alt îi desparte; pe nod, mânerul dispare', () => {
  const r = schimbaTipNod(patrat, 1, 'ambele') as FormaCale;
  const lung = Math.hypot(manereNod(r, 1).inapoi!.x - 30, manereNod(r, 1).inapoi!.y);
  const m = mutaManer(r, 1, 'inainte', P(30, 20), false);
  aproape(manereNod(m, 1).inainte, P(30, 20), 'mânerul tras');
  aproape(manereNod(m, 1).inapoi, P(30, -lung), 'celălalt, rotit în oglindă, cu lungimea lui');
  assert.ok(neted(m, 1));
  const rupt = mutaManer(r, 1, 'inainte', P(30, 20), true);
  assert.deepEqual(manereNod(rupt, 1).inapoi, manereNod(r, 1).inapoi);
  assert.equal(neted(rupt, 1), false);
  assert.equal(tipNod(rupt, 1), 'ambele', 'tot curbă pe ambele părți, dar ruptă');
  const pe = mutaManer(rupt, 1, 'inainte', P(30, 0), false);
  assert.equal(tipNod(pe, 1), 'inapoi');
  assert.equal(mutaManer(patrat, 1, 'inainte', P(1, 1), false), patrat, 'un colț n-are mâner de tras');
});

test('Pen: clicul pune un colț, tragerea mânerele în oglindă, Shift doar pe cel de înainte; forma pornește din primul nod', () => {
  assert.deepEqual(nodPus(P(5, 5), null, false), { p: P(5, 5), inapoi: null, inainte: null });
  assert.deepEqual(nodPus(P(5, 5), P(5, 5), false), { p: P(5, 5), inapoi: null, inainte: null }, 'fără tragere');
  assert.deepEqual(nodPus(P(5, 5), P(9, 8), false), { p: P(5, 5), inapoi: P(1, 2), inainte: P(9, 8) });
  assert.deepEqual(nodPus(P(5, 5), P(9, 8), true), { p: P(5, 5), inapoi: null, inainte: P(9, 8) });
  const noduri: NodCuManere[] = [nodPus(P(20, 20), null, false), nodPus(P(60, 20), P(70, 30), false), nodPus(P(100, 20), null, false)];
  const f = formaPen(noduri, false);
  assert.ok(f && f.forma.tip === 'cale');
  assert.deepEqual([f.x, f.y], [20, 20]);
  assert.deepEqual(f.forma.varfuri.map((x) => x.p), [P(0, 0), P(40, 0), P(80, 0)]);
  assert.deepEqual(f.forma.varfuri.map((x) => x.s.tip), ['C', 'C', 'L'], 'calea deschisă se termină cu L');
  assert.deepEqual(f.forma.varfuri[0]!.s, { tip: 'C', c1: P(0, 0), c2: P(30, -10) });
  assert.ok(valida(f.forma));
  assert.equal(formaPen(noduri.slice(0, 1), false), null, 'un nod nu e o formă');
});

test('Pen: închiderea cere 3 noduri sau 2 cu o curbă; segmentul care închide ține mânerele capetelor', () => {
  const doua = [nodPus(P(0, 0), null, false), nodPus(P(40, 0), null, false)];
  assert.equal(sePoateInchide(doua), false);
  assert.equal(formaPen(doua, true), null);
  const lentila = [nodPus(P(0, 0), null, false), nodPus(P(40, 0), P(40, 20), false)];
  assert.ok(sePoateInchide(lentila));
  const f = formaPen(lentila, true);
  assert.ok(f && f.forma.tip === 'cale' && f.forma.inchis);
  assert.deepEqual(f.forma.varfuri.map((x) => x.s.tip), ['C', 'C']);
  assert.ok(valida(f.forma));
  const triunghi = formaPen([nodPus(P(0, 0), null, false), nodPus(P(40, 0), null, false), nodPus(P(20, 30), null, false)], true);
  assert.ok(triunghi && triunghi.forma.tip === 'cale');
  assert.deepEqual(triunghi.forma.varfuri.map((x) => x.s.tip), ['L', 'L', 'L']);
  assert.deepEqual(caleDinNoduri([], false).varfuri, []);
});
