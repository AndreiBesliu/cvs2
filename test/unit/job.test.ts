import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { programDinDocument } from '../../src/cam/job.ts';
import { documentNou, type Document } from '../../src/model/document.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { posteaza } from '../../src/post/post.ts';

const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const doc = (latime: number, inaltime: number): Document => ({
  ...documentNou({ latime, inaltime, grosime: 18 }),
  elemente: [
    // Ordinea din document: întâi dreptunghiul. Lucrarea trebuie să taie totuși gaura (interiorul) prima.
    { id: 'e1', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'e2', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 70, f: 50 } },
  ],
});
const faraComentarii = (text: string): string[] => text.split('\n').filter((l) => l !== '' && !l.startsWith('('));
const SCULA = { numar: 1, nume: 'freza plata', diametru: 6 };

test('exportul din document, cu implicitele, dă exact liniile de G-code ale plăcii 1 A (comentariile diferă)', () => {
  const aur = faraComentarii(readFileSync(new URL('../placi/placa-01/placa-01-A.nc', import.meta.url), 'utf8'));
  for (const [w, h] of [[140, 100], [300, 200]] as const) {
    const job = programDinDocument(doc(w, h), new Map(), SCULA);
    assert.ok(job.ok, job.ok ? '' : job.motiv);
    if (!job.ok) continue;
    const r = posteaza(job.program, { foaie: { latime: w, inaltime: h, grosime: 18 }, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, { asteptareAx: 3 });
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(faraComentarii(r.text), aur, `foaia ${w} × ${h}`);
  }
});

test('interioarele se taie primele, oricare ar fi ordinea din document', () => {
  const job = programDinDocument(doc(300, 200), new Map(), SCULA);
  assert.ok(job.ok);
  if (!job.ok) return;
  const etichete = job.program.miscari.filter((m) => m.tip === 'eticheta').map((m) => (m.tip === 'eticheta' ? m.text : ''));
  assert.deepEqual(etichete, ['e2: cerc, interior, 8 mm', 'e1: dreptunghi, exterior, 3 mm']);
});

test('un document gol și o sculă care nu încape dau motivul, nu un program', () => {
  assert.equal(programDinDocument(documentNou({ latime: 100, inaltime: 100, grosime: 18 }), new Map(), SCULA).ok, false);
  const r = programDinDocument(doc(300, 200), new Map([['e2', { latura: 'interior', adancime: 3, pas: 3 }]]), { ...SCULA, diametru: 40 });
  assert.match(r.ok ? '' : r.motiv, /e2: scula nu încape/);
});
