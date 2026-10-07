import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentNou, VERSIUNE_SCHEMA, type Document } from '../../src/model/document.ts';
import { incarca, jsonCanonic } from '../../src/model/incarcare.ts';
import { anuleaza, executa, istoricNou, PLAFON_ISTORIC, reface } from '../../src/model/jurnal.ts';

const FOAIA = { latime: 140, inaltime: 100, grosime: 18 };
const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const dreptunghi = (id: string) => ({ id, forma: { tip: 'dreptunghi' as const, latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } });
const cerc = (id: string) => ({ id, forma: { tip: 'cerc' as const, raza: 15 }, matrice: { ...ID, e: 70, f: 50 } });

function doc(...elemente: Document['elemente']): Document {
  return { ...documentNou(FOAIA), elemente };
}

test('un document valid trece prin ușa unică, neschimbat', () => {
  const d = doc(dreptunghi('e1'), cerc('e2'));
  const r = incarca(JSON.parse(JSON.stringify(d)));
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (r.ok) assert.deepEqual(r.doc, d);
});

test('ușa refuză, cu motiv: ce nu e obiect, fără versiune, dintr-o versiune mai nouă, cu valori absurde', () => {
  assert.equal(incarca(null).ok, false);
  assert.equal(incarca([]).ok, false);
  assert.equal(incarca({ ...doc(), schema: undefined }).ok, false);
  const nou = incarca({ ...doc(), schema: VERSIUNE_SCHEMA + 1 });
  assert.match(nou.ok ? '' : nou.motiv, /versiune mai nouă/);
  const negativ = incarca(doc({ ...dreptunghi('e1'), forma: { tip: 'dreptunghi', latime: -5, inaltime: 60, razaColt: 0 } }));
  assert.match(negativ.ok ? '' : negativ.motiv, /elemente\.0\.forma\.latime/);
  assert.equal(incarca(doc({ ...cerc('e1'), matrice: { ...ID, e: Number.NaN } })).ok, false);
  assert.equal(incarca(doc(cerc('e1'), cerc('e1'))).ok, false, 'două elemente cu același id');
  assert.equal(incarca(doc({ ...cerc('x y'), id: 'x y' })).ok, false, 'id cu spațiu');
});

test('câmpurile necunoscute se păstrează: un document dintr-o versiune viitoare nu pierde date pe aici', () => {
  const brut = { ...doc({ ...cerc('e1'), viitor: { strat: 3 } }), extra: 'păstrat' };
  const r = incarca(brut);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal((r.doc as unknown as { extra: string }).extra, 'păstrat');
  assert.deepEqual((r.doc.elemente[0] as unknown as { viitor: unknown }).viitor, { strat: 3 });
});

test('JSON-ul canonic nu depinde de ordinea cheilor și refuză numerele nefinite', () => {
  assert.equal(jsonCanonic({ b: 1, a: [2, { d: 3, c: 4 }] }), jsonCanonic({ a: [2, { c: 4, d: 3 }], b: 1 }));
  assert.equal(jsonCanonic({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.throws(() => jsonCanonic({ x: Number.POSITIVE_INFINITY }));
});

test('jurnalul: adaugă, anulează, reface, iar o comandă nouă golește refacerile', () => {
  let h = istoricNou(doc());
  h = executa(h, { tip: 'adauga', element: dreptunghi('e1'), pozitie: 0 });
  h = executa(h, { tip: 'adauga', element: cerc('e2'), pozitie: 1 });
  assert.deepEqual(h.doc.elemente.map((e) => e.id), ['e1', 'e2']);
  h = anuleaza(h);
  assert.deepEqual(h.doc.elemente.map((e) => e.id), ['e1']);
  h = reface(h);
  assert.deepEqual(h.doc.elemente.map((e) => e.id), ['e1', 'e2']);
  h = anuleaza(h);
  h = executa(h, { tip: 'sterge', element: dreptunghi('e1'), pozitie: 0 });
  assert.equal(h.viitor.length, 0);
  assert.deepEqual(h.doc.elemente, []);
  // Ștergerea anulată pune elementul înapoi pe aceeași poziție.
  h = executa(istoricNou(doc(dreptunghi('e1'), cerc('e2'))), { tip: 'sterge', element: dreptunghi('e1'), pozitie: 0 });
  assert.deepEqual(anuleaza(h).doc.elemente.map((e) => e.id), ['e1', 'e2']);
});

test('jurnalul: o înlocuire anulată revine exact la valorile vechi', () => {
  const vechi = cerc('e1');
  const nou = { ...vechi, matrice: { ...vechi.matrice, e: 99 } };
  const h = executa(istoricNou(doc(vechi)), { tip: 'inlocuieste', vechi, nou });
  assert.equal(h.doc.elemente[0]?.matrice.e, 99);
  assert.deepEqual(anuleaza(h).doc.elemente[0], vechi);
});

test(`jurnalul ține cel mult ${PLAFON_ISTORIC} de comenzi, iar comenzile imposibile aruncă`, () => {
  let h = istoricNou(doc());
  for (let i = 0; i < PLAFON_ISTORIC + 20; i++) h = executa(h, { tip: 'adauga', element: cerc(`e${i}`), pozitie: i });
  assert.equal(h.trecut.length, PLAFON_ISTORIC);
  assert.throws(() => executa(h, { tip: 'adauga', element: cerc('e0'), pozitie: 0 }), /există deja/);
  assert.throws(() => executa(h, { tip: 'sterge', element: cerc('nu-exista'), pozitie: 0 }), /nu există/);
});
