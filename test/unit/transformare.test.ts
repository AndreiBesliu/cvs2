import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transforma } from '../../src/model/transformare.ts';
import { incarca } from '../../src/model/incarcare.ts';
import type { Document, FormaDoc } from '../../src/model/document.ts';
import { docDin, ID } from './ajutor-document.ts';

/** Transformările (ADR 0052), pure: rotirea, scalarea exactă a geometriei și refuzurile, cu valori pe hârtie. */

const STOC = { latime: 300, inaltime: 200, grosime: 18 };
const doc1 = (forma: FormaDoc, e = 10, f = 20): Document => docDin(STOC, { id: 'p', forma, matrice: { ...ID, e, f } });
const R = { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 } as const;

test('rotirea: unghiul se adună, locul se rotește în jurul centrului', () => {
  const r = transforma(doc1(R), 0, ['p'], { fel: 'rotire', unghi: 90, centru: { x: 0, y: 0 } });
  assert.ok(r.ok);
  const i = r.ok ? r.instante[0] : undefined;
  assert.ok(Math.abs((i?.x ?? 0) + 20) < 1e-12 && Math.abs((i?.y ?? 0) - 10) < 1e-12);
  assert.equal(i?.rotire, 90);
  const r2 = transforma(doc1(R), 0, ['p'], { fel: 'rotire', unghi: -450, centru: { x: 10, y: 20 } });
  assert.equal(r2.ok ? r2.instante[0]?.rotire : -1, 270);
});

test('scalarea dreptunghiului: laturile, locul față de ancoră; neuniformă pe o instanță rotită cu 90° își schimbă axele', () => {
  const r = transforma(doc1(R), 0, ['p'], { fel: 'scalare', sx: 1.5, sy: 2, ancora: { x: 10, y: 20 } });
  assert.ok(r.ok);
  if (!r.ok) return;
  const f = r.piese[0]?.radacina.tip === 'element' ? r.piese[0].radacina.forma : null;
  assert.deepEqual(f, { tip: 'dreptunghi', latime: 150, inaltime: 120, razaColt: 0 });
  assert.deepEqual([r.instante[0]?.x, r.instante[0]?.y], [10, 20], 'ancora în colț: colțul rămâne');
  // Rotită cu 90°: sx al foii scalează înălțimea piesei.
  const d = doc1(R);
  const i0 = d.foi[0]?.instante[0];
  if (i0) i0.rotire = 90;
  const q = transforma(d, 0, ['p'], { fel: 'scalare', sx: 2, sy: 1, ancora: { x: 0, y: 0 } });
  const g = q.ok && q.piese[0]?.radacina.tip === 'element' ? q.piese[0].radacina.forma : null;
  assert.deepEqual(g, { tip: 'dreptunghi', latime: 100, inaltime: 120, razaColt: 0 });
  assert.deepEqual(q.ok ? [q.instante[0]?.x, q.instante[0]?.y] : [], [20, 20]);
});

test('cercul și calea: uniform exact; cubicele își scalează punctele de control; arcele trec doar uniform', () => {
  const c = transforma(doc1({ tip: 'cerc', raza: 10 }), 0, ['p'], { fel: 'scalare', sx: 3, sy: 3, ancora: { x: 0, y: 0 } });
  assert.deepEqual(c.ok && c.piese[0]?.radacina.tip === 'element' ? c.piese[0].radacina.forma : null, { tip: 'cerc', raza: 30 });
  assert.deepEqual(transforma(doc1({ tip: 'cerc', raza: 10 }), 0, ['p'], { fel: 'scalare', sx: 2, sy: 1, ancora: { x: 0, y: 0 } }), { ok: false, motiv: 'neuniform-cerc' });
  const cale: FormaDoc = { tip: 'cale', inchis: true, varfuri: [
    { p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 1, y: 2 }, c2: { x: 3, y: 4 } } }, { p: { x: 10, y: 0 }, s: { tip: 'L' } }, { p: { x: 10, y: 10 }, s: { tip: 'L' } },
  ] };
  const k = transforma(doc1(cale), 0, ['p'], { fel: 'scalare', sx: 2, sy: 0.5, ancora: { x: 10, y: 20 } });
  const fk = k.ok && k.piese[0]?.radacina.tip === 'element' ? k.piese[0].radacina.forma : null;
  assert.ok(fk && fk.tip === 'cale');
  if (fk?.tip === 'cale') {
    assert.deepEqual(fk.varfuri.map((v) => v.p), [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 5 }]);
    assert.deepEqual(fk.varfuri[0]?.s, { tip: 'C', c1: { x: 2, y: 1 }, c2: { x: 6, y: 2 } });
  }
  const arc: FormaDoc = { tip: 'cale', inchis: true, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'A', bulge: 1 } }, { p: { x: 10, y: 0 }, s: { tip: 'A', bulge: 1 } }] };
  assert.deepEqual(transforma(doc1(arc), 0, ['p'], { fel: 'scalare', sx: 2, sy: 1, ancora: { x: 0, y: 0 } }), { ok: false, motiv: 'neuniform-arc' });
  assert.ok(transforma(doc1(arc), 0, ['p'], { fel: 'scalare', sx: 2, sy: 2, ancora: { x: 0, y: 0 } }).ok);
});

test('refuzurile: colțul rotunjit neuniform, rotirea oblică neuniformă, scara zero sau negativă, piesa împărțită', () => {
  assert.deepEqual(transforma(doc1({ ...R, razaColt: 5 }), 0, ['p'], { fel: 'scalare', sx: 2, sy: 1, ancora: { x: 0, y: 0 } }), { ok: false, motiv: 'neuniform-colt' });
  const d = doc1(R);
  const i0 = d.foi[0]?.instante[0];
  if (i0) i0.rotire = 30;
  assert.deepEqual(transforma(d, 0, ['p'], { fel: 'scalare', sx: 2, sy: 1, ancora: { x: 0, y: 0 } }), { ok: false, motiv: 'neuniform-rotit' });
  assert.ok(transforma(d, 0, ['p'], { fel: 'scalare', sx: 2, sy: 2, ancora: { x: 0, y: 0 } }).ok, 'uniform merge și oblic');
  for (const s of [0, -1, Number.NaN]) assert.deepEqual(transforma(doc1(R), 0, ['p'], { fel: 'scalare', sx: s, sy: 1, ancora: { x: 0, y: 0 } }), { ok: false, motiv: 'scara-invalida' });
  const imp = doc1(R);
  imp.foi[0]?.instante.push({ id: 'q', piesa: 'p', x: 0, y: 0, rotire: 0 });
  assert.deepEqual(transforma(imp, 0, ['p'], { fel: 'scalare', sx: 2, sy: 2, ancora: { x: 0, y: 0 } }), { ok: false, motiv: 'piesa-impartita' });
});

test('documentul după o scalare trece de ușă', () => {
  const d = doc1(R);
  const r = transforma(d, 0, ['p'], { fel: 'scalare', sx: 1.25, sy: 0.75, ancora: { x: 60, y: 50 } });
  assert.ok(r.ok);
  if (!r.ok) return;
  const nou: Document = { ...d, piese: r.piese.slice(), foi: [{ ...d.foi[0], id: 'f1', stoc: STOC, instante: r.instante.slice() }] };
  const u = incarca(JSON.parse(JSON.stringify(nou)));
  assert.ok(u.ok, u.ok ? '' : u.motiv);
});
