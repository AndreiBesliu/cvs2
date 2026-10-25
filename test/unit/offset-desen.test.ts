import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offsetSelectie, type Offset } from '../../src/app/offsetCalcul.ts';
import { arieCuSemn } from '../../src/geom/contur.ts';
import { cutieElement } from '../../src/model/forme.ts';
import { istoricNou } from '../../src/model/jurnal.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument, type FormaNoua } from '../../src/ui/actiuniDocument.ts';
import { motivDesen } from '../../src/ui/actiuniDocumentCalcul.ts';
import { docDin, ID } from './ajutor-document.ts';

/**
 * Offsetul formelor în desen (ADR 0064): pe hârtie, dreptunghiul 100 × 60 decalat cu 5 mm spre exterior are 110 × 70, cu
 * colțurile arce de rază 5 (aria 6000 + 2·5·160 + π·25), iar spre interior 90 × 50, cu colțuri drepte; cercul R15 devine R20;
 * rotirea instanței nu schimbă aria; formele deschise se sar; motivele. Formele noi intră printr-un singur pas de anulare.
 */

const stoc = { latime: 300, inaltime: 200, grosime: 18 };
const dreptunghi = { id: 'r', forma: { tip: 'dreptunghi' as const, latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } };
const cerc = { id: 'c', forma: { tip: 'cerc' as const, raza: 15 }, matrice: { ...ID, e: 200, f: 100 } };
const linie = { id: 'l', forma: { tip: 'cale' as const, inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' as const } }, { p: { x: 50, y: 10 }, s: { tip: 'L' as const } }] }, matrice: { ...ID, e: 10, f: 150 } };
const doc = docDin(stoc, dreptunghi, cerc, linie);

const cutie = (f: FormaNoua) => cutieElement({ forma: f.forma, matrice: { ...ID, e: f.x, f: f.y } });
const aproape = (a: number, b: number, mesaj: string, eps = 1e-6): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };
const reusit = (r: Offset | string): Offset => {
  assert.notEqual(typeof r, 'string', String(r));
  return r as Offset;
};

test('dreptunghiul spre exterior: 110 × 70, colțurile arce de rază 5, aria pe hârtie', () => {
  const r = reusit(offsetSelectie(doc, ['r'], 5));
  assert.equal(r.forme.length, 1);
  const b = cutie(r.forme[0]!);
  for (const [k, v] of [['minX', 15], ['minY', 15], ['maxX', 125], ['maxY', 85]] as const) aproape(b[k], v, k);
  const f = r.forme[0]!.forma;
  assert.ok(f.tip === 'cale' && f.inchis);
  const arce = f.varfuri.filter((v) => v.s.tip === 'A');
  assert.equal(arce.length, 4);
  for (const v of arce) if (v.s.tip === 'A') aproape(Math.abs(v.s.bulge), Math.tan(Math.PI / 8), 'un sfert de cerc');
  aproape(Math.abs(arieCuSemn(r.contururi[0]!)), 6000 + 2 * 5 * 160 + Math.PI * 25, 'aria', 1e-6);
  assert.equal(r.sarite, 0);
});

test('dreptunghiul spre interior: 90 × 50, colțuri drepte; prea adânc = nu încape', () => {
  const r = reusit(offsetSelectie(doc, ['r'], -5));
  const b = cutie(r.forme[0]!);
  for (const [k, v] of [['minX', 25], ['minY', 25], ['maxX', 115], ['maxY', 75]] as const) aproape(b[k], v, k);
  const f = r.forme[0]!.forma;
  assert.ok(f.tip === 'cale' && f.varfuri.every((v) => v.s.tip === 'L'), 'doar linii');
  assert.equal(offsetSelectie(doc, ['r'], -31), 'nu-incape', '60 / 2 = 30 < 31');
});

test('o formă în L: spre exterior se rotunjesc cele 5 colțuri ieșite, spre interior doar colțul intrând', () => {
  const L0 = { tip: 'L' as const };
  const varfuri = [[0, 0], [60, 0], [60, 20], [20, 20], [20, 60], [0, 60]].map(([x, y]) => ({ p: { x: x!, y: y! }, s: L0 }));
  const d = docDin(stoc, { id: 'L', forma: { tip: 'cale', inchis: true, varfuri }, matrice: { ...ID, e: 50, f: 50 } });
  const arce = (r: Offset): number => r.contururi[0]!.varfuri.filter((v) => v.s.tip === 'A' && Math.abs(v.s.bulge) > 1e-9).length;
  assert.equal(arce(reusit(offsetSelectie(d, ['L'], 5))), 5);
  assert.equal(arce(reusit(offsetSelectie(d, ['L'], -5))), 1);
});

test('cercul R15 devine R20 (arce ale aceluiași centru); rotirea instanței nu schimbă aria', () => {
  const r = reusit(offsetSelectie(doc, ['c'], 5));
  const b = cutie(r.forme[0]!);
  for (const [k, v] of [['minX', 180], ['minY', 80], ['maxX', 220], ['maxY', 120]] as const) aproape(b[k], v, k);
  aproape(Math.abs(arieCuSemn(r.contururi[0]!)), Math.PI * 400, 'aria cercului R20');
  const rotit = { ...doc, foi: doc.foi.map((f) => ({ ...f, instante: f.instante.map((i) => (i.id === 'r' ? { ...i, rotire: 30 } : i)) })) };
  const q = reusit(offsetSelectie(rotit, ['r'], 5));
  aproape(Math.abs(arieCuSemn(q.contururi[0]!)), 6000 + 2 * 5 * 160 + Math.PI * 25, 'aria, rotit cu 30°', 1e-6);
});

test('formele deschise se sar (numărate); doar deschise = motiv; distanța și selecția goală = motiv', () => {
  const r = reusit(offsetSelectie(doc, ['r', 'l'], 5));
  assert.equal(r.forme.length, 1);
  assert.equal(r.sarite, 1);
  assert.equal(offsetSelectie(doc, ['l'], 5), 'deschise');
  assert.equal(offsetSelectie(doc, [], 5), 'nimic');
  for (const d of [0, 0.001, -0.009, 1000.5, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(offsetSelectie(doc, ['r'], d), 'distanta', String(d));
  assert.notEqual(typeof offsetSelectie(doc, ['r'], 0.01), 'string', 'rezoluția trece');
});

test('formele offsetului intră prin `document.deseneaza`, într-un singur pas de anulare, toate alese; verdictul comun', () => {
  const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  let h = istoricNou(doc);
  let s: readonly string[] = [];
  const forme = reusit(offsetSelectie(doc, ['r', 'c'], 5)).forme;
  const c: ContextDocument = { istoric: () => h, scrie: (n) => { h = n; }, selectie: () => s, selecteaza: (ids) => { s = ids; }, formaNoua: () => forme };
  assert.equal(motivDesen(doc, forme, false), null);
  assert.equal(motivDesen(doc, forme, true), 'motiv.doar-citire');
  assert.equal(motivDesen(doc, [], false), 'motiv.nimic-ales');
  assert.deepEqual(ruleaza(R, 'document.deseneaza', c), { ok: true });
  assert.equal(h.doc.foi[0]!.instante.length, 5);
  assert.equal(s.length, 2, 'ambele forme noi alese');
  assert.ok(s.every((id) => !['r', 'c', 'l'].includes(id)));
  assert.equal(h.trecut.length, 1, 'un singur pas');
  ruleaza(R, 'istoric.anuleaza', c);
  assert.equal(h.doc.foi[0]!.instante.length, 3);
  assert.deepEqual(stare(R, 'document.deseneaza', { ...c, formaNoua: () => [] }), { ok: false, motiv: 'motiv.nimic-ales' });
});
