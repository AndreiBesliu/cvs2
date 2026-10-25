import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arieCuSemn, type Contur } from '../../src/geom/contur.ts';
import { cerculArcului } from '../../src/geom/conturBaza.ts';
import { booleanSelectie, type FormaBoolean } from '../../src/model/boolean.ts';
import type { Document } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { istoricNou } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import { motivDesen } from '../../src/ui/actiuniDocumentCalcul.ts';
import { docDin, ID } from './ajutor-document.ts';

/**
 * Booleanul (ADR 0067), pe hârtie: două pătrate 10 × 10 suprapuse pe un sfert (colțul celui de-al doilea în centrul primului):
 * unirea are aria 175, intersecția 25 (un pătrat 5 × 5), scăderea 75; dreptunghiul 100 × 60 minus un cerc R10 din interior: o
 * piesă cu o gaură, cercul rămas cerc (arce de rază 10); două cercuri R10 cu centrele la 10 mm: unirea are aria 2·π·100 −
 * lentila (122,837) și doar arce; motivele; prin `document.deseneaza`, formele alese se înlocuiesc într-un singur pas.
 */

const stoc = { latime: 300, inaltime: 200, grosime: 18 };
const patrat = (id: string, x: number, y: number) => ({ id, forma: { tip: 'dreptunghi' as const, latime: 10, inaltime: 10, razaColt: 0 }, matrice: { ...ID, e: x, f: y } });
const cerc = (id: string, x: number, y: number, r = 10) => ({ id, forma: { tip: 'cerc' as const, raza: r }, matrice: { ...ID, e: x, f: y } });
const aproape = (a: number, b: number, mesaj: string, eps = 1e-9): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };
/** Conturul în lume al formei noi (cu matricea de loc). */
const contur = (f: FormaBoolean, forma = f.forma): Contur => conturElement({ forma, matrice: { ...ID, e: f.x, f: f.y } });
const reusit = (r: ReturnType<typeof booleanSelectie>) => { assert.notEqual(typeof r, 'string', String(r)); return r as Exclude<typeof r, string>; };

test('două pătrate suprapuse pe un sfert: unirea 175, intersecția 25 (pătratul 5 × 5), scăderea 75; doar linii', () => {
  const d = docDin(stoc, patrat('a', 0, 0), patrat('b', 5, 5));
  const u = reusit(booleanSelectie(d, 0, ['a', 'b'], 'reuniune'));
  assert.equal(u.forme.length, 1);
  aproape(Math.abs(arieCuSemn(contur(u.forme[0]!))), 175, 'unirea');
  assert.deepEqual(u.sterse, ['a', 'b']);
  const i = reusit(booleanSelectie(d, 0, ['a', 'b'], 'intersectie'));
  aproape(Math.abs(arieCuSemn(contur(i.forme[0]!))), 25, 'intersecția');
  const xs = contur(i.forme[0]!).varfuri.map((v) => v.p.x), ys = contur(i.forme[0]!).varfuri.map((v) => v.p.y);
  assert.deepEqual([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)], [5, 10, 5, 10], 'pătratul comun');
  const s = reusit(booleanSelectie(d, 0, ['a', 'b'], 'diferenta'));
  aproape(Math.abs(arieCuSemn(contur(s.forme[0]!))), 75, 'scăderea: primul minus ultimul');
  const s2 = reusit(booleanSelectie(d, 0, ['b', 'a'], 'diferenta'));
  const c2 = contur(s2.forme[0]!);
  aproape(Math.abs(arieCuSemn(c2)), 75, 'invers');
  assert.ok(Math.max(...c2.varfuri.map((v) => v.p.x)) === 15, 'din b se scoate a: rămâne partea lui b');
  for (const r of [u, i, s]) assert.ok(r.forme.every((f) => f.forma.tip === 'cale' && f.forma.varfuri.every((v) => v.s.tip === 'L')));
});

test('dreptunghiul minus un cerc dinăuntru: o formă cu o gaură, cercul rămas cerc (arce de rază 10, același centru)', () => {
  const d = docDin(stoc, { id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } }, cerc('c', 70, 50));
  const r = reusit(booleanSelectie(d, 0, ['r', 'c'], 'diferenta'));
  assert.equal(r.forme.length, 1);
  const f = r.forme[0]!;
  assert.equal(f.gauri.length, 1);
  aproape(Math.abs(arieCuSemn(contur(f))), 6000, 'exteriorul');
  const g = contur(f, f.gauri[0]!);
  aproape(Math.abs(arieCuSemn(g)), Math.PI * 100, 'gaura, cât cercul');
  for (let k = 0; k < g.varfuri.length; k++) {
    const v = g.varfuri[k]!, w = g.varfuri[(k + 1) % g.varfuri.length]!;
    assert.equal(v.s.tip, 'A', 'doar arce');
    if (v.s.tip !== 'A') continue;
    const c = cerculArcului(v.p, w.p, v.s.bulge);
    aproape(c.raza, 10, 'raza'); aproape(c.centru.x, 70, 'centrul x'); aproape(c.centru.y, 50, 'centrul y');
  }
});

test('două cercuri R10 la 10 mm: unirea are aria 2·π·100 − lentila, doar arce; intersecția e lentila', () => {
  const d = docDin(stoc, cerc('a', 50, 50), cerc('b', 60, 50));
  const lentila = 2 * 100 * Math.acos(0.5) - 5 * Math.sqrt(300);
  const u = reusit(booleanSelectie(d, 0, ['a', 'b'], 'reuniune'));
  const cu = contur(u.forme[0]!);
  aproape(Math.abs(arieCuSemn(cu)), 2 * Math.PI * 100 - lentila, 'unirea', 1e-7);
  assert.ok(cu.varfuri.every((v) => v.s.tip === 'A'), 'doar arce');
  const i = reusit(booleanSelectie(d, 0, ['a', 'b'], 'intersectie'));
  aproape(Math.abs(arieCuSemn(contur(i.forme[0]!))), lentila, 'lentila', 1e-7);
});

test('motivele: nu două forme, deschisă, compusă, disjuncte, nimic comun, nimic rămas', () => {
  const linie = { id: 'l', forma: { tip: 'cale' as const, inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' as const } }, { p: { x: 10, y: 0 }, s: { tip: 'L' as const } }] }, matrice: { ...ID, e: 0, f: 0 } };
  const d = docDin(stoc, patrat('a', 0, 0), patrat('b', 50, 50), linie, cerc('mare', 5, 5, 30), cerc('mic', 5, 5, 2));
  assert.equal(booleanSelectie(d, 0, ['a'], 'reuniune'), 'doua');
  assert.equal(booleanSelectie(d, 0, ['a', 'b', 'mic'], 'reuniune'), 'doua');
  assert.equal(booleanSelectie(d, 0, ['a', 'l'], 'reuniune'), 'deschisa');
  assert.equal(booleanSelectie(d, 0, ['a', 'b'], 'reuniune'), 'disjuncte');
  assert.equal(booleanSelectie(d, 0, ['a', 'b'], 'diferenta'), 'disjuncte');
  assert.equal(booleanSelectie(d, 0, ['a', 'b'], 'intersectie'), 'nimic-comun');
  assert.equal(booleanSelectie(d, 0, ['a', 'mare'], 'diferenta'), 'gol', 'cercul mare acoperă pătratul');
  const comp: Document = { ...d, piese: d.piese.map((p) => (p.id === 'b' ? { ...p, radacina: { tip: 'grup' as const, id: 'g', matrice: ID, copii: [{ ...p.radacina, id: 'b1' }, { ...p.radacina, id: 'b2' }] } } : p)) };
  assert.equal(booleanSelectie(comp, 0, ['a', 'b'], 'reuniune'), 'compusa');
  // Cuprins: unirea dă exteriorul, intersecția interiorul.
  const u = booleanSelectie(d, 0, ['a', 'mic'], 'reuniune');
  assert.ok(typeof u !== 'string');
  aproape(Math.abs(arieCuSemn(contur(u.forme[0]!))), 100, 'a cuprinde cercul mic: unirea = a');
  const g = booleanSelectie(d, 0, ['a', 'mic'], 'diferenta');
  assert.ok(typeof g !== 'string' && g.forme[0]!.gauri.length === 1, 'scăderea lasă o gaură');
});

test('o curbă (cubică) intră ca biarce la toleranța proiectului: aria pătratului cu o latură bombată, în toleranță', () => {
  const bombat = { id: 'p', forma: { tip: 'cale' as const, inchis: true, varfuri: [
    { p: { x: 0, y: 0 }, s: { tip: 'C' as const, c1: { x: 3, y: -4 }, c2: { x: 7, y: -4 } } }, { p: { x: 10, y: 0 }, s: { tip: 'L' as const } },
    { p: { x: 10, y: 10 }, s: { tip: 'L' as const } }, { p: { x: 0, y: 10 }, s: { tip: 'L' as const } },
  ] }, matrice: { ...ID, e: 0, f: 0 } };
  const d = docDin(stoc, bombat, patrat('b', 20, 20));
  const r = reusit(booleanSelectie(docDin(stoc, bombat, patrat('b', 5, 5)), 0, ['p', 'b'], 'reuniune'));
  // Aria bombăturii (sub axa x), pe hârtie: x = 9t + 3t² − 2t³, y = −12·t(1 − t); ∫ y dx = −12·∫ u(9 + 6u) dt, u = t − t²,
  // = −108/6 − 72/30 = −20,4 → 20,4 mm² în plus; cu pătratul (5, 5) suprapus pe 25: 100 + 20,4 + 100 − 25.
  aproape(Math.abs(arieCuSemn(contur(r.forme[0]!))), 195.4, 'unirea cu bombătura', 0.01);
  assert.ok(r.forme[0]!.forma.tip === 'cale' && r.forme[0]!.forma.varfuri.every((v) => v.s.tip !== 'C'), 'fără cubice');
  assert.equal(booleanSelectie(d, 0, ['p', 'b'], 'reuniune'), 'disjuncte');
});

test('prin `document.deseneaza` cu `sterge`: cele două forme alese se înlocuiesc într-un pas; gaura stă în aceeași piesă; anularea', () => {
  const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const doc = docDin(stoc, { id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } }, cerc('c', 70, 50), patrat('z', 200, 150));
  const b = reusit(booleanSelectie(doc, 0, ['r', 'c'], 'diferenta'));
  let h = istoricNou(doc);
  let s: readonly string[] = ['r', 'c'];
  const c: ContextDocument = { istoric: () => h, scrie: (n) => { h = n; }, selectie: () => s, selecteaza: (ids) => { s = ids; }, formaNoua: () => b.forme, sterge: () => b.sterse };
  assert.equal(motivDesen(doc, b.forme, false, b.sterse), null);
  assert.deepEqual(ruleaza(R, 'document.deseneaza', c), { ok: true });
  const inst = h.doc.foi[0]!.instante.map((i) => i.id);
  assert.ok(!inst.includes('r') && !inst.includes('c') && inst.includes('z'), JSON.stringify(inst));
  assert.equal(inst.length, 2);
  assert.equal(s.length, 1);
  const noua = elementeFoaie(h.doc, 0).filter((e) => e.instanta === s[0]);
  assert.equal(noua.length, 2, 'conturul și gaura, în aceeași piesă');
  const piesa = h.doc.piese.find((p) => p.id === h.doc.foi[0]!.instante.find((i) => i.id === s[0])!.piesa)!;
  assert.deepEqual(piesa.operatii.map((o) => [o.id, o.latura, o.noduri]), [['exterior', 'exterior', ['c1']], ['interior', 'interior', ['c2']]]);
  assert.ok(incarca(JSON.parse(JSON.stringify(h.doc))).ok, 'documentul se redeschide');
  assert.equal(h.trecut.length, 1, 'un singur pas');
  ruleaza(R, 'istoric.anuleaza', c);
  assert.deepEqual(h.doc.foi[0]!.instante.map((i) => i.id), ['r', 'c', 'z']);
});
