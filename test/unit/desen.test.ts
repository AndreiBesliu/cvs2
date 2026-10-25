import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listaDesen } from '../../src/app/desen.ts';
import type { Document } from '../../src/model/document.ts';
import { instantaLa } from '../../src/ui/actiuniAlegere.ts';
import { docDin, ID } from './ajutor-document.ts';

const doc: Document = docDin(
  { latime: 300, inaltime: 200, grosime: 18 },
  { id: 'e1', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } },
  { id: 'e2', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 70, f: 50 } },
);

test('lista de desen: dreptunghiul ca M + 4 L + Z, cercul ca M + 2 arce de 180° + Z, în coordonatele foii', () => {
  const [d, c] = listaDesen(doc);
  assert.deepEqual(d?.cale.map((k) => k.t).join(''), 'MLLLLZ');
  assert.deepEqual(d?.cale[0], { t: 'M', x: 20, y: 20 });
  assert.deepEqual(c?.cale.map((k) => k.t).join(''), 'MAAZ');
  const arc = c?.cale[1];
  assert.ok(arc && arc.t === 'A');
  if (arc?.t !== 'A') return;
  assert.equal(arc.r, 15);
  assert.deepEqual([arc.cx, arc.cy], [70, 50]);
  assert.ok(arc.trigonometric);
  assert.ok(Math.abs(arc.a1 - arc.a0 - Math.PI) < 1e-12);
});

test('selecția la clic: pe contur în toleranță, înăuntru, iar cel de deasupra câștigă', () => {
  assert.equal(instantaLa(doc, 70, 50, 0.5), 'e2', 'centrul cercului: cercul e deasupra dreptunghiului');
  assert.equal(instantaLa(doc, 85.3, 50, 0.5), 'e2', 'lângă marginea cercului, în toleranță');
  assert.equal(instantaLa(doc, 30, 30, 0.5), 'e1', 'în dreptunghi, departe de cerc');
  assert.equal(instantaLa(doc, 19.7, 50, 0.5), 'e1', 'lângă latura stângă, din afară');
  assert.equal(instantaLa(doc, 200, 150, 0.5), null, 'în afara oricărei forme');
});

test('selecția la clic (ADR 0074 §1): forma dinăuntrul alteia, desenată înaintea ei, rămâne de ales; conturul cel mai apropiat câștigă', () => {
  // Testul owner-ului: după un offset spre exterior, conturul nou (deasupra, mai mare) prindea orice clic dinăuntru.
  const d: Document = docDin(
    { latime: 300, inaltime: 200, grosime: 18 },
    { id: 'mic', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'mare', forma: { tip: 'dreptunghi', latime: 110, inaltime: 70, razaColt: 5 }, matrice: { ...ID, e: 15, f: 15 } },
  );
  assert.equal(instantaLa(d, 70, 50, 0.5), 'mic', 'înăuntrul ambelor: cea mai mică');
  assert.equal(instantaLa(d, 17, 50, 0.5), 'mare', 'între contururi: doar cea mare cuprinde punctul');
  assert.equal(instantaLa(d, 15.2, 50, 0.5), 'mare', 'pe conturul celei mari');
  assert.equal(instantaLa(d, 20.1, 50, 0.5), 'mic', 'pe conturul celei mici, deși cea mare e deasupra');
  // Două contururi în toleranță: cel mai apropiat, nu cel de deasupra.
  const strans: Document = docDin(
    { latime: 300, inaltime: 200, grosime: 18 },
    { id: 'a', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'b', forma: { tip: 'dreptunghi', latime: 100.6, inaltime: 60.6, razaColt: 0 }, matrice: { ...ID, e: 19.7, f: 19.7 } },
  );
  assert.equal(instantaLa(strans, 20.05, 50, 0.5), 'a');
  assert.equal(instantaLa(strans, 19.75, 50, 0.5), 'b');
});
