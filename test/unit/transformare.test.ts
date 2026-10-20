import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transforma } from '../../src/model/transformare.ts';
import { incarca } from '../../src/model/incarcare.ts';
import type { Document, FormaDoc } from '../../src/model/document.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { conturElement, cutieElement } from '../../src/model/forme.ts';

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

// ── Oglindirea (ADR 0054) ────────────────────────────────────────────────────────────────────────────────────────────

/** Documentul cu piesele și instanțele întoarse de `transforma` puse în locul celor vechi. */
function cuRezultat(d: Document, t: Parameters<typeof transforma>[3], ids: readonly string[]): Document {
  const r = transforma(d, 0, ids, t);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return d;
  const piese = new Map(r.piese.map((p) => [p.id, p]));
  const inst = new Map(r.instante.map((i) => [i.id, i]));
  const f = d.foi[0];
  if (!f) throw new Error('fără foaie');
  return { ...d, piese: d.piese.map((p) => piese.get(p.id) ?? p), foi: [{ ...f, instante: f.instante.map((i) => inst.get(i.id) ?? i) }] };
}

test('oglindirea: locul în oglindă, reflexia în rădăcina piesei, rotirea rămâne; de două ori = documentul de la început', () => {
  const d = doc1(R, 10, 20);
  const o = cuRezultat(d, { fel: 'oglindire', directie: 'orizontal', centru: { x: 0, y: 0 } }, ['p']);
  assert.deepEqual([o.foi[0]?.instante[0]?.x, o.foi[0]?.instante[0]?.y, o.foi[0]?.instante[0]?.rotire], [-10, 20, 0]);
  assert.deepEqual(o.piese[0]?.radacina.matrice, { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  // Cutia în lume: 10…110 × 20…80 oglindită față de x = 0.
  const e = elementeFoaie(o, 0)[0];
  assert.ok(e);
  if (e) assert.deepEqual(cutieElement(e), { minX: -110, minY: 20, maxX: -10, maxY: 80 });
  // De două ori, pe aceeași axă: exact documentul de la început.
  assert.deepEqual(cuRezultat(o, { fel: 'oglindire', directie: 'orizontal', centru: { x: 0, y: 0 } }, ['p']), d);
  const v = cuRezultat(d, { fel: 'oglindire', directie: 'vertical', centru: { x: 0, y: 50 } }, ['p']);
  assert.deepEqual([v.foi[0]?.instante[0]?.x, v.foi[0]?.instante[0]?.y], [10, 80]);
  assert.deepEqual(v.piese[0]?.radacina.matrice, { a: 1, b: 0, c: 0, d: -1, e: 0, f: 0 });
});

test('oglindirea în lume, la 0°, 90° și 30°: fiecare vârf și punct de control e oglinda lui (sub 1e-9), arcele își schimbă semnul', () => {
  const cale: FormaDoc = { tip: 'cale', inchis: true, varfuri: [
    { p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 40, y: 0 }, s: { tip: 'A', bulge: 0.4 } },
    { p: { x: 40, y: 30 }, s: { tip: 'C', c1: { x: 30, y: 45 }, c2: { x: 10, y: 40 } } }, { p: { x: 5, y: 25 }, s: { tip: 'L' } },
  ] };
  const aproape = (p: { x: number; y: number }, q: { x: number; y: number }): boolean => Math.abs(p.x - q.x) <= 1e-9 && Math.abs(p.y - q.y) <= 1e-9;
  for (const rotire of [0, 90, 30]) {
    for (const directie of ['orizontal', 'vertical'] as const) {
      const d = doc1(cale, 60, 70);
      const i0 = d.foi[0]?.instante[0];
      if (i0) i0.rotire = rotire;
      const centru = { x: 123.4, y: 56.7 };
      const o = cuRezultat(d, { fel: 'oglindire', directie, centru }, ['p']);
      const oglinda = (q: { x: number; y: number }) => (directie === 'orizontal' ? { x: 2 * centru.x - q.x, y: q.y } : { x: q.x, y: 2 * centru.y - q.y });
      const ea = elementeFoaie(d, 0)[0];
      const eb = elementeFoaie(o, 0)[0];
      if (!ea || !eb) throw new Error('fără element');
      const a = conturElement(ea);
      const b = conturElement(eb);
      assert.equal(b.varfuri.length, a.varfuri.length);
      a.varfuri.forEach((va, k) => {
        const vb = b.varfuri[k];
        const unde = `${rotire}°, ${directie}, vârful ${k}`;
        assert.ok(vb && aproape(oglinda(va.p), vb.p), unde);
        if (va.s.tip === 'A') assert.ok(vb?.s.tip === 'A' && Math.abs(vb.s.bulge + va.s.bulge) <= 1e-12, unde);
        if (va.s.tip === 'C') assert.ok(vb?.s.tip === 'C' && aproape(oglinda(va.s.c1), vb.s.c1) && aproape(oglinda(va.s.c2), vb.s.c2), unde);
      });
      assert.equal(o.foi[0]?.instante[0]?.rotire, rotire, 'rotirea instanței rămâne');
    }
  }
});

test('oglindirea selecției față de centrul ei comun; piesa împărțită e refuzată', () => {
  const d = docDin(STOC,
    { id: 'a', forma: R, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'b', forma: { tip: 'cerc', raza: 10 }, matrice: { ...ID, e: 250, f: 100 } });
  const o = cuRezultat(d, { fel: 'oglindire', directie: 'orizontal', centru: { x: 140, y: 0 } }, ['a', 'b']);
  assert.deepEqual(o.foi[0]?.instante.map((i) => [i.id, i.x, i.y]), [['a', 260, 20], ['b', 30, 100]]);
  const imp = doc1(R);
  imp.foi[0]?.instante.push({ id: 'q', piesa: 'p', x: 0, y: 0, rotire: 0 });
  assert.deepEqual(transforma(imp, 0, ['p'], { fel: 'oglindire', directie: 'vertical', centru: { x: 0, y: 0 } }), { ok: false, motiv: 'piesa-impartita' });
});

/**
 * Tăieturile în plan ale unui program, ca mulțime: fiecare linie sau arc cu capetele neordonate, centrul și sensul arcului, la
 * 1e-6 mm. Coborârile și ridicările (doar pe Z) rămân pe dinafară: oglinda inversează sensul de rotire, iar ca tăierea să
 * rămână în urcare bucla se parcurge invers, deci freza intră la celălalt capăt al ei. Sensul arcelor e același după oglindire
 * (oglinda îl întoarce, parcurgerea inversă îl întoarce la loc): așa se vede că urcarea s-a păstrat.
 */
function taieturi(d: Document, oglinda?: (x: number) => number): string[] {
  const job = programDinDocument(d);
  assert.ok(job.ok, job.ok ? '' : job.motiv);
  if (!job.ok) return [];
  const r = (v: number): string => (Math.round(v * 1e6) / 1e6 + 0).toFixed(6);
  const X = (x: number): number => (oglinda ? oglinda(x) : x);
  let poz = { x: Number.NaN, y: Number.NaN, z: Number.NaN };
  const rez: string[] = [];
  for (const m of job.program.miscari) {
    if (m.tip !== 'rapida' && m.tip !== 'taiere' && m.tip !== 'arc') continue;
    const nou = { x: m.la.X ?? poz.x, y: m.la.Y ?? poz.y, z: m.la.Z ?? poz.z };
    if (m.tip !== 'rapida' && Number.isFinite(poz.x) && (nou.x !== poz.x || nou.y !== poz.y)) {
      const capete = [`${r(X(poz.x))},${r(poz.y)},${r(poz.z)}`, `${r(X(nou.x))},${r(nou.y)},${r(nou.z)}`].sort().join(' ');
      rez.push(m.tip === 'arc' ? `A ${capete} c ${r(X(m.centru.x))},${r(m.centru.y)} ${m.sens}` : `L ${capete}`);
    }
    poz = nou;
  }
  return rez.sort();
}

test('ce se taie după oglindire e oglinda a ce se tăia: exteriorul, gaura și linia tăiată pe o parte (partea se inversează)', () => {
  const linie: FormaDoc = { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 50, y: 20 }, s: { tip: 'L' } }] };
  let d = docDin(STOC,
    { id: 'e1', forma: R, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'e2', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 70, f: 50 } },
    { id: 'e3', forma: linie, matrice: { ...ID, e: 160, f: 120 } });
  d = cuOperatie(d, 'e3', { latura: 'stanga', adancime: 1, pas: 1 });
  const o = cuRezultat(d, { fel: 'oglindire', directie: 'orizontal', centru: { x: 150, y: 0 } }, ['e1', 'e2', 'e3']);
  const inainte = taieturi(d, (x) => 300 - x);
  assert.ok(inainte.length > 10, `${inainte.length} tăieturi`);
  assert.deepEqual(taieturi(o), inainte);
  // Martorul: cu partea liniei schimbată în document, tăieturile nu mai sunt oglinda.
  assert.notDeepEqual(taieturi(cuOperatie(o, 'e3', { latura: 'dreapta' })), inainte);
});
