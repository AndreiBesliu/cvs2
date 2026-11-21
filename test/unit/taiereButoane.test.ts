/**
 * Tăierea din butoane mari a Atelierului (ADR 0250, felia 28.1↑d), pe hârtie: − / + mută adâncimea și pasul cu 0,5 mm, fără
 * zecimalele lungi ale virgulei mobile și fără să ajungă la zero; freza comună a operațiilor alese (aceeași freză doar cu
 * același număr, diametru, unghi și vârf); numele rolului cu majusculă, ca pe planșă. „Trimite la mașină” e o acțiune a
 * registrului exportului, cu aceeași stare ca „Exportă G-code”.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentNou, type Document, type Operatie } from '../../src/model/document.ts';
import { creeazaRegistru, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_EXPORT, type ContextExport } from '../../src/ui/actiuniExport.ts';
import { cuMajuscula, frezaComuna, PAS_PLUS_MINUS, plusMinus } from '../../src/app/taiereButoane.ts';
import { docDin, ID } from './ajutor-document.ts';

test('− / + mută cu 0,5 mm, la micron; valorile diferite nu au de la ce porni; − nu ajunge la zero', () => {
  assert.equal(PAS_PLUS_MINUS, 0.5);
  assert.equal(plusMinus(3, 1), 3.5);
  assert.equal(plusMinus(3, -1), 2.5);
  // 0,1 + 0,5 = 0,6 (nu 0,6000000000000001): valoarea se scrie în document și se arată în câmp.
  assert.equal(plusMinus(0.1, 1), 0.6);
  assert.equal(plusMinus(18.25, -1), 17.75);
  assert.equal(plusMinus(null, 1), null);
  assert.equal(plusMinus(null, -1), null);
  // La 0,5 mm, − ar da 0: butonul se oprește; la 0,6, mai merge o dată (0,1).
  assert.equal(plusMinus(0.5, -1), null);
  assert.equal(plusMinus(0.4, -1), null);
  assert.equal(plusMinus(0.6, -1), 0.1);
});

const op = (scula: Operatie['scula']): Operatie => ({ scula } as unknown as Operatie);
const plata = (numar: number, diametru: number): Operatie['scula'] => ({ numar, nume: `freza ${diametru}`, diametru });

test('freza comună: aceeași doar cu același număr, diametru, unghi și vârf; altfel nimic', () => {
  assert.equal(frezaComuna([]), null);
  const t1 = plata(1, 6);
  assert.equal(frezaComuna([op(t1)]), t1);
  // Numele intern al frezei nu contează, ci ce taie.
  assert.equal(frezaComuna([op(t1), op({ ...t1, nume: 'alt nume' })]), t1);
  assert.equal(frezaComuna([op(t1), op(plata(2, 6))]), null);
  assert.equal(frezaComuna([op(t1), op(plata(1, 3.175))]), null);
  const v60 = { ...plata(3, 6), forma: { tip: 'v' as const, unghi: 60 } };
  assert.equal(frezaComuna([op(v60), op({ ...v60 })]), v60);
  assert.equal(frezaComuna([op(v60), op({ ...v60, forma: { tip: 'v', unghi: 90 } })]), null);
  assert.equal(frezaComuna([op(v60), op({ ...v60, forma: { tip: 'v', unghi: 60, varf: 0.2 } })]), null);
  // O freză plată și o V cu același număr și diametru nu sunt aceeași.
  assert.equal(frezaComuna([op({ ...v60, numar: 1 }), op(t1)]), null);
});

test('numele rolului pe buton: prima literă mare, restul neatins', () => {
  assert.equal(cuMajuscula('pe linie', 'ro'), 'Pe linie');
  assert.equal(cuMajuscula('găurire', 'ro'), 'Găurire');
  assert.equal(cuMajuscula('incrustație în V', 'ro'), 'Incrustație în V');
  assert.equal(cuMajuscula('V-carve', 'ro'), 'V-carve');
  assert.equal(cuMajuscula('on line', 'en'), 'On line');
  assert.equal(cuMajuscula('', 'ro'), '');
});

const ctx = (d: Document): ContextExport => ({
  document: () => d,
  parametri: () => ({ origine: 'stanga-jos', z0: 'sus' }),
  rezultat: () => undefined,
});

test('„Trimite la mașină” e în registrul exportului, cu starea lui „Exportă G-code”: fără forme, fără operații, activ', () => {
  const r = creeazaRegistru(ACTIUNI_EXPORT, () => true);
  assert.ok(r.actiuni.has('export.trimite'));
  assert.equal(r.actiuni.get('export.trimite')?.eticheta, 'actiune.trimite-masina');
  const gol = documentNou({ latime: 300, inaltime: 200, grosime: 18 });
  const d = docDin({ latime: 300, inaltime: 200, grosime: 18 }, { id: 'e1', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 70, f: 50 } });
  const faraOp: Document = { ...d, piese: d.piese.map((p) => ({ ...p, operatii: [] })) };
  for (const x of [gol, d, faraOp]) assert.deepEqual(stare(r, 'export.trimite', ctx(x)), stare(r, 'export.gcode', ctx(x)));
  assert.deepEqual(stare(r, 'export.trimite', ctx(gol)), { ok: false, motiv: 'motiv.nimic-de-exportat' });
  assert.deepEqual(stare(r, 'export.trimite', ctx(faraOp)), { ok: false, motiv: 'motiv.nicio-operatie' });
  assert.deepEqual(stare(r, 'export.trimite', ctx(d)), { ok: true });
  // Fără licența exportului (capabilitatea lui), și trimiterea e oprită: e tot un program G-code.
  const faraLicenta = creeazaRegistru(ACTIUNI_EXPORT, (c) => c !== 'export-gcode');
  assert.equal(stare(faraLicenta, 'export.trimite', ctx(d)).ok, false);
});
