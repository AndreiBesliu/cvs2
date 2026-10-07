import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listaDesen } from '../../src/app/desen.ts';
import { documentNou, type Document } from '../../src/model/document.ts';
import { elementLa } from '../../src/ui/actiuniDocument.ts';

const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const doc: Document = {
  ...documentNou({ latime: 300, inaltime: 200, grosime: 18 }),
  elemente: [
    { id: 'e1', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'e2', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 70, f: 50 } },
  ],
};

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
  assert.equal(elementLa(doc, 70, 50, 0.5), 'e2', 'centrul cercului: cercul e deasupra dreptunghiului');
  assert.equal(elementLa(doc, 85.3, 50, 0.5), 'e2', 'lângă marginea cercului, în toleranță');
  assert.equal(elementLa(doc, 30, 30, 0.5), 'e1', 'în dreptunghi, departe de cerc');
  assert.equal(elementLa(doc, 19.7, 50, 0.5), 'e1', 'lângă latura stângă, din afară');
  assert.equal(elementLa(doc, 200, 150, 0.5), null, 'în afara oricărei forme');
});
