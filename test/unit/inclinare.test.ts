import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arieCuSemn } from '../../src/geom/contur.ts';
import { aplica, determinant } from '../../src/geom/matrice.ts';
import type { Document, Nod } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import { istoricNou } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { matriceInclinare, transforma, type Transformare } from '../../src/model/transformare.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';
import { docDin, ID } from './ajutor-document.ts';

/**
 * Înclinarea (ADR 0065): pe hârtie, dreptunghiul 100 × 60 din (20, 20), înclinat orizontal cu 45° față de centrul lui (70, 50),
 * are vârfurile (−10, 20), (90, 20), (150, 80), (50, 80); în lume, fiecare punct ajunge în H·p și pe o instanță rotită, și într-o
 * piesă cu noduri; aria se păstrează (determinantul 1); cubicele rămân exacte; arcele, piesa împărțită și unghiul prea mare se
 * refuză; prin `document.transforma`, un pas de anulare.
 */

const stoc = { latime: 300, inaltime: 200, grosime: 18 };
const P = (x: number, y: number) => ({ x, y });
const L = { tip: 'L' as const };
const aproape = (a: { x: number; y: number }, b: { x: number; y: number }, mesaj: string): void => {
  assert.ok(Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9, `${mesaj}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
};
/** Documentul de după transformare (piesele înlocuite, instanțele mutate). */
function aplicat(doc: Document, ids: readonly string[], t: Transformare): Document {
  const r = transforma(doc, 0, ids, t);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  const piese = new Map(r.piese.map((p) => [p.id, p]));
  const inst = new Map(r.instante.map((i) => [i.id, i]));
  return { ...doc, piese: doc.piese.map((p) => piese.get(p.id) ?? p), foi: doc.foi.map((f) => ({ ...f, instante: f.instante.map((i) => inst.get(i.id) ?? i) })) };
}
/** Vârfurile (și punctele de control) ale fiecărui element, în lume. */
function puncteLume(doc: Document, id: string): { x: number; y: number }[] {
  return elementeFoaie(doc, 0).filter((e) => e.instanta === id).flatMap((e) => conturElement(e).varfuri.flatMap((v) => (v.s.tip === 'C' ? [v.p, v.s.c1, v.s.c2] : [v.p])));
}

test('matricea înclinării: orizontal mută x cu tan(unghi) · dy, vertical mută y; determinantul 1', () => {
  const H = matriceInclinare(45, 0, P(0, 0));
  aproape(aplica(H, P(0, 10)), P(10, 10), 'sus se mută la dreapta');
  aproape(aplica(H, P(10, 0)), P(10, 0), 'pe axă rămâne');
  aproape(aplica(matriceInclinare(0, 45, P(5, 5)), P(15, 5)), P(15, 15), 'vertical, față de centru');
  for (const [x, y] of [[30, 20], [-60, 75], [75, -75]] as const) assert.ok(Math.abs(determinant(matriceInclinare(x, y, P(3, 4))) - 1) < 1e-12);
});

test('dreptunghiul 100 × 60, orizontal 45° față de centru: paralelogramul de pe hârtie, aceeași arie, o cale', () => {
  const doc = docDin(stoc, { id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } });
  const d = aplicat(doc, ['r'], { fel: 'inclinare', unghiX: 45, unghiY: 0, centru: P(70, 50) });
  const pts = puncteLume(d, 'r');
  for (const [k, q] of [P(-10, 20), P(90, 20), P(150, 80), P(50, 80)].entries()) aproape(pts[k]!, q, `vârful ${k}`);
  const e = elementeFoaie(d, 0)[0]!;
  assert.equal(e.forma.tip, 'cale');
  assert.ok(Math.abs(Math.abs(arieCuSemn(conturElement(e))) - 6000) < 1e-9, 'aria rămâne 100 × 60');
  assert.deepEqual(d.foi[0]!.instante, doc.foi[0]!.instante, 'locul și rotirea instanței rămân');
});

test('în lume, fiecare punct ajunge în H·p: pe o instanță rotită, într-o piesă cu noduri, cu cubice', () => {
  const cub = { tip: 'cale' as const, inchis: true, varfuri: [{ p: P(0, 0), s: { tip: 'C' as const, c1: P(10, -5), c2: P(20, 5) } }, { p: P(30, 0), s: L }, { p: P(15, 25), s: L }] };
  let doc = docDin(stoc, { id: 'c', forma: cub, matrice: { ...ID, e: 100, f: 60 } });
  doc = { ...doc, foi: doc.foi.map((f) => ({ ...f, instante: f.instante.map((i) => ({ ...i, rotire: 30 })) })) };
  // A doua piesă: un grup scalat de 2 și rotit cu 90°, cu două elemente (unul rotit cu 15° și mutat).
  const elem = (id: string, m: Nod['matrice']): Nod => ({ tip: 'element', id, forma: { tip: 'dreptunghi', latime: 10, inaltime: 4, razaColt: 0 }, matrice: m });
  const c15 = Math.cos(Math.PI / 12), s15 = Math.sin(Math.PI / 12);
  const grup: Nod = { tip: 'grup', id: 'g', matrice: { a: 0, b: 2, c: -2, d: 0, e: 5, f: -3 }, copii: [elem('g1', ID), elem('g2', { a: c15, b: s15, c: -s15, d: c15, e: 7, f: 2 })] };
  doc = { ...doc, piese: [...doc.piese, { id: 'g', radacina: grup, operatii: [] }], foi: doc.foi.map((f) => ({ ...f, instante: [...f.instante, { id: 'g', piesa: 'g', x: 200, y: 50, rotire: 10 }] })) };
  const t: Transformare = { fel: 'inclinare', unghiX: 20, unghiY: -35, centru: P(150, 70) };
  const H = matriceInclinare(20, -35, P(150, 70));
  const d = aplicat(doc, ['c', 'g'], t);
  for (const id of ['c', 'g']) {
    const inainte = puncteLume(doc, id), dupa = puncteLume(d, id);
    assert.equal(dupa.length, inainte.length, id);
    inainte.forEach((q, k) => { aproape(dupa[k]!, aplica(H, q), `${id}, punctul ${k}`); });
  }
  assert.equal(elementeFoaie(d, 0).find((e) => e.instanta === 'c')!.forma.tip, 'cale');
});

test('refuzurile: cercul, colțurile rotunjite, o cale cu arce, piesa împărțită, unghiul peste 75°', () => {
  const doc = docDin(stoc,
    { id: 'o', forma: { tip: 'cerc', raza: 10 }, matrice: { ...ID, e: 50, f: 50 } },
    { id: 'r', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 3 }, matrice: { ...ID, e: 100, f: 50 } },
    { id: 'a', forma: { tip: 'cale', inchis: true, varfuri: [{ p: P(0, 0), s: { tip: 'A', bulge: 0.5 } }, { p: P(20, 0), s: L }, { p: P(10, 10), s: L }] }, matrice: { ...ID, e: 150, f: 50 } },
    { id: 'p', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }, matrice: { ...ID, e: 200, f: 50 } });
  const t = (unghiX: number): Transformare => ({ fel: 'inclinare', unghiX, unghiY: 0, centru: P(0, 0) });
  for (const id of ['o', 'r', 'a']) assert.deepEqual(transforma(doc, 0, [id], t(20)), { ok: false, motiv: 'inclinare-arc' }, id);
  const imp = { ...doc, foi: doc.foi.map((f) => ({ ...f, instante: [...f.instante, { id: 'p2', piesa: 'p', x: 0, y: 0, rotire: 0 }] })) };
  assert.deepEqual(transforma(imp, 0, ['p'], t(20)), { ok: false, motiv: 'piesa-impartita' });
  for (const u of [75.5, -80, Number.NaN]) assert.deepEqual(transforma(doc, 0, ['p'], t(u)), { ok: false, motiv: 'unghi-invalid' }, String(u));
  assert.ok(transforma(doc, 0, ['p'], t(75)).ok, '75° trece');
});

test('prin `document.transforma`: un pas de anulare, iar anularea readuce dreptunghiul', () => {
  const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  let h = istoricNou(docDin(stoc, { id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } }));
  let s: readonly string[] = ['r'];
  const c: ContextDocument = {
    istoric: () => h, scrie: (n) => { h = n; }, selectie: () => s, selecteaza: (ids) => { s = ids; },
    transformare: () => ({ fel: 'inclinare', unghiX: 30, unghiY: 0, centru: P(70, 50) }),
  };
  assert.deepEqual(ruleaza(R, 'document.transforma', c), { ok: true });
  assert.equal(h.doc.piese[0]!.radacina.tip === 'element' && h.doc.piese[0]!.radacina.forma.tip, 'cale');
  assert.equal(h.trecut.length, 1);
  ruleaza(R, 'istoric.anuleaza', c);
  assert.equal(h.doc.piese[0]!.radacina.tip === 'element' && h.doc.piese[0]!.radacina.forma.tip, 'dreptunghi');
});
