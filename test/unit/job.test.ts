import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { programDinDocument } from '../../src/cam/job.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { documentNou, type Document, type Operatie } from '../../src/model/document.ts';
import { cuDiametru, cuOperatie, docDin, ID } from './ajutor-document.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { posteaza } from '../../src/post/post.ts';

const doc = (latime: number, inaltime: number): Document => docDin(
  { latime, inaltime, grosime: 18 },
  // Ordinea din document: întâi dreptunghiul. Lucrarea trebuie să taie totuși gaura (interiorul) prima.
  { id: 'e1', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } },
  { id: 'e2', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 70, f: 50 } },
);
const faraComentarii = (text: string): string[] => text.split('\n').filter((l) => l !== '' && !l.startsWith('('));
const etichete = (d: Document): string[] => {
  const job = programDinDocument(d);
  assert.ok(job.ok, job.ok ? '' : job.motiv);
  return job.ok ? job.program.miscari.flatMap((m) => (m.tip === 'eticheta' ? [m.text] : [])) : [];
};

test('exportul din document, cu implicitele, dă exact liniile de G-code ale plăcii 1 A (comentariile diferă)', () => {
  const aur = faraComentarii(readFileSync(new URL('../placi/placa-01/placa-01-A.nc', import.meta.url), 'utf8'));
  for (const [w, h] of [[140, 100], [300, 200]] as const) {
    const job = programDinDocument(doc(w, h));
    assert.ok(job.ok, job.ok ? '' : job.motiv);
    if (!job.ok) continue;
    const r = posteaza(job.program, { foaie: { latime: w, inaltime: h, grosime: 18 }, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, { asteptareAx: 3 });
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(faraComentarii(r.text), aur, `foaia ${w} × ${h}`);
  }
});

test('interioarele se taie primele, oricare ar fi ordinea din document', () => {
  assert.deepEqual(etichete(doc(300, 200)), ['e2/e2: cerc, interior, 8 mm', 'e1/e1: dreptunghi, exterior, 3 mm']);
});

test('un document gol, unul fără operații și o sculă care nu încape dau motivul, nu un program', () => {
  assert.equal(programDinDocument(documentNou({ latime: 100, inaltime: 100, grosime: 18 })).ok, false);
  const faraOp = programDinDocument({ ...doc(300, 200), piese: doc(300, 200).piese.map((p) => ({ ...p, operatii: [] })) });
  assert.match(faraOp.ok ? '' : faraOp.motiv, /nicio formă n-are o operație de tăiere/);
  const r = programDinDocument(cuDiametru(cuOperatie(doc(300, 200), 'e2', { latura: 'interior', adancime: 3, pas: 3 }), 40));
  assert.match(r.ok ? '' : r.motiv, /e2\/e2: scula nu încape/);
});

test('mai adânc decât foaia (în masa de sacrificiu) e refuzat; exact grosimea foii trece', () => {
  const d = doc(300, 200);
  const prea = programDinDocument(cuOperatie(d, 'e1', { latura: 'exterior', adancime: 30, pas: 5 }));
  assert.match(prea.ok ? '' : prea.motiv, /e1\/e1: adâncimea 30 mm trece de grosimea foii \(18 mm\)/);
  assert.ok(programDinDocument(cuOperatie(d, 'e1', { latura: 'exterior', adancime: 18, pas: 6 })).ok);
});

test('un pas absurd de mic e refuzat cu motiv, nu cu stiva depășită; o mie de treceri încă trec', () => {
  const d = doc(300, 200);
  const mic = programDinDocument(cuOperatie(d, 'e1', { latura: 'exterior', adancime: 3, pas: 0.0002 }));
  assert.match(mic.ok ? '' : mic.motiv, /e1\/e1: 15000 treceri/);
  assert.ok(programDinDocument(cuOperatie(d, 'e1', { latura: 'exterior', adancime: 10, pas: 0.01 })).ok);
});

test('parametrii vin din operațiile documentului: latura, adâncimea, pasul și freza de acolo (ADR 0025)', () => {
  const d = cuDiametru(cuOperatie(doc(300, 200), 'e2', { latura: 'pe-linie', adancime: 5, pas: 2.5 }), 3.175);
  assert.deepEqual(etichete(d), ['e2/e2: cerc, pe-linie, 5 mm', 'e1/e1: dreptunghi, exterior, 3 mm']);
  const job = programDinDocument(d);
  assert.ok(job.ok);
  if (job.ok) assert.deepEqual(job.program.scula, { numar: 1, nume: 'freza plata', diametru: 3.175 });
});

test('o singură sculă pe program: altă freză (număr sau diametru) e refuzată cu motiv, până la schimbarea sculei', () => {
  const d = doc(300, 200);
  const altNumar = programDinDocument(cuOperatie(d, 'e1', { scula: { numar: 2, nume: 'freza plata', diametru: 6 } }));
  assert.match(altNumar.ok ? '' : altNumar.motiv, /e1\/e1: altă sculă \(T2, Ø6\) decât T1, Ø6/);
  const altDiametru = programDinDocument(cuOperatie(d, 'e1', { scula: { numar: 1, nume: 'freza plata', diametru: 8 } }));
  assert.match(altDiametru.ok ? '' : altDiametru.motiv, /e1\/e1: altă sculă \(T1, Ø8\)/);
  // Doar numele diferă: aceeași sculă pentru mașină.
  assert.ok(programDinDocument(cuOperatie(d, 'e1', { scula: { numar: 1, nume: 'alt nume', diametru: 6 } })).ok);
});

test('ordinea tăieturilor: latura, apoi instanța, apoi operația, apoi nodul din operație; elementul fără operație nu se taie', () => {
  const M = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const op = (id: string, noduri: string[], latura: Operatie['latura']): Operatie =>
    ({ id, tip: 'profil', noduri, scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura, adancime: 3, pas: 3 });
  const baza = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  const d: Document = {
    ...baza,
    piese: [{
      id: 'p',
      radacina: {
        tip: 'grup', id: 'g', matrice: M, copii: [
          { tip: 'element', id: 'a', forma: { tip: 'cerc', raza: 5 }, matrice: { ...M, e: 20, f: 20 } },
          { tip: 'element', id: 'b', forma: { tip: 'cerc', raza: 5 }, matrice: { ...M, e: 40, f: 20 } },
          { tip: 'element', id: 'c', forma: { tip: 'dreptunghi', latime: 60, inaltime: 30, razaColt: 0 }, matrice: { ...M, e: 10, f: 5 } },
          { tip: 'element', id: 'fara', forma: { tip: 'cerc', raza: 2 }, matrice: { ...M, e: 60, f: 40 } },
        ],
      },
      // Operațiile în altă ordine decât arborele: exteriorul întâi, iar nodurile operației interioare inversate.
      operatii: [op('o-ext', ['c'], 'exterior'), op('o-int', ['b', 'a'], 'interior'), op('o-lin', ['c'], 'pe-linie')],
    }],
    foi: [{ ...baza.foi[0]!, instante: [{ id: 'i2', piesa: 'p', x: 150, y: 100, rotire: 0 }, { id: 'i1', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
  assert.deepEqual(etichete(d).map((t) => t.split(':')[0] + ' ' + (t.split(', ')[1] ?? '')), [
    'i2/b interior', 'i2/a interior', 'i1/b interior', 'i1/a interior',
    'i2/c pe-linie', 'i1/c pe-linie',
    'i2/c exterior', 'i1/c exterior',
  ]);
  assert.ok(!etichete(d).some((t) => t.includes('/fara')), 'elementul fără operație nu apare');
});

test('un element oglindit (determinant −1) se taie pe aceeași latură și în același sens ca cel neoglindit', () => {
  // Același dreptunghi și același cerc în lume: o dată cu matricea identitate, o dată oglindite pe X în piesă (x' = 100 − x
  // pentru dreptunghi, x' = −x pentru cercul centrat în instanță). Offsetul nu are voie să schimbe latura după sensul conturului.
  const drept = docDin({ latime: 300, inaltime: 200, grosime: 18 },
    { id: 'e1', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 4 }, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'e2', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 70, f: 50 } });
  const oglindit: Document = {
    ...drept,
    piese: drept.piese.map((p) => ({
      ...p,
      radacina: p.radacina.tip === 'element'
        ? { ...p.radacina, matrice: { ...p.radacina.matrice, a: -1, e: p.radacina.forma.tip === 'dreptunghi' ? 100 : 0 } }
        : p.radacina,
    })),
  };
  // Oglindirea chiar e acolo: determinantul în lume e −1 pentru ambele elemente.
  assert.deepEqual(elementeFoaie(oglindit).map((e) => e.matrice.a * e.matrice.d - e.matrice.b * e.matrice.c), [-1, -1]);
  const amprenta = (d: Document) => {
    const job = programDinDocument(d);
    assert.ok(job.ok, job.ok ? '' : job.motiv);
    if (!job.ok) return null;
    const jos = job.program.miscari.flatMap((m) => ((m.tip === 'taiere' || m.tip === 'arc') && (m.la.Z ?? -1) < 0 ? [m] : []));
    const xs = jos.flatMap((m) => (m.la.X === undefined ? [] : [m.la.X]));
    const ys = jos.flatMap((m) => (m.la.Y === undefined ? [] : [m.la.Y]));
    const r = (v: number): number => Math.round(v * 1e6) / 1e6;
    return {
      cadru: [r(Math.min(...xs)), r(Math.max(...xs)), r(Math.min(...ys)), r(Math.max(...ys))],
      sensuri: [...new Set(job.program.miscari.flatMap((m) => (m.tip === 'arc' ? [m.sens] : [])))].sort(),
    };
  };
  const a = amprenta(drept);
  const b = amprenta(oglindit);
  // Pe hârtie: exteriorul dreptunghiului 20…120 × 20…80 cu freza R3 merge pe 17…123 × 17…83.
  assert.deepEqual(a?.cadru, [17, 123, 17, 83]);
  assert.deepEqual(b, a);
});
