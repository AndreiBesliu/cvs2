/**
 * Rolul „Relief 3D” (ADR 0310 §6, ADR 0313 §6; felia 18.1↑d-1): degroșarea și finisarea aceluiași relief, într-un singur rol.
 * Oferit doar pe o piesă cu reliefuri, după „finisarea reliefului”; operațiile lui trec de ușă și se recunosc: întâi
 * degroșarea (freza plată de același diametru, adaosul 0,5 mm, pasul lateral 40 % din freză), apoi finisarea (ca la rolul ei).
 * Marginea și planul zero ale degroșării sunt ale finisării (lucrarea le cere egale); numărul T al frezei plate nu ia numărul
 * bilei; din nou rolul, valorile ambelor rămân; înapoi la „finisarea reliefului”, finisarea își păstrează valorile și id-ul.
 * Un rol personalizat nu se salvează din „Relief 3D” (două operații cu valori diferite).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import type { Document, Operatie, Piesa } from '../../src/model/document.ts';
import { operatiiPentruRol, roluriOferite, rolPiesei } from '../../src/model/rol.ts';
import { cuDegrosare } from '../../src/model/finisare.ts';
import { sablonDinPiese } from '../../src/model/rolPersonal.ts';
import { operatieInMargini } from '../../src/model/schemaDocument.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const relief = (id: string): unknown => ({
  tip: 'element', id, forma: { tip: 'relief', nx: 10, ny: 10, celula: 1, straturi: [{ id: 's', mod: 'aduna', vizibil: true, dale: 'ab'.repeat(32) }] }, matrice: { ...I },
});
const dreptunghi = (id: string): unknown => ({ tip: 'element', id, forma: { tip: 'dreptunghi', latime: 20, inaltime: 10, razaColt: 0 }, matrice: { ...I } });

function doc(copii: readonly unknown[], operatii: readonly unknown[] = []): Document {
  const r = incarca({
    schema: 32, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'grup', id: 'g', matrice: { ...I }, copii: [...copii] }, operatii: [...operatii] }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
}
const piesa = (d: Document): Piesa => d.piese[0]!;

test('rolurile oferite: „Relief 3D” după finisare, doar pe o piesă cu reliefuri', () => {
  assert.deepEqual(roluriOferite(piesa(doc([relief('r'), relief('r2')]))), ['finisare', 'relief3d']);
  assert.ok(!roluriOferite(piesa(doc([relief('r'), dreptunghi('e')]))).includes('relief3d'));
  assert.ok(!roluriOferite(piesa(doc([dreptunghi('e')]))).includes('relief3d'));
});

test('operațiile rolului: întâi degroșarea (plata, adaosul 0,5, 40 %), apoi finisarea (bila); trec de ușă și se recunosc; T diferit', () => {
  const d = doc([relief('r'), relief('r2')]);
  const ops = operatiiPentruRol(d, piesa(d), 'relief3d');
  assert.ok(ops && ops.length === 2);
  const [deg, fin] = ops as [Operatie, Operatie];
  assert.equal(deg.tip, 'degrosare');
  assert.equal(fin.tip, 'finisare');
  assert.deepEqual(deg.noduri, ['r', 'r2']);
  assert.deepEqual(fin.noduri, ['r', 'r2']);
  assert.equal(deg.scula.forma, undefined);
  assert.equal(deg.scula.diametru, 6);
  assert.deepEqual(fin.scula.forma, { tip: 'bila' });
  assert.notEqual(deg.scula.numar, fin.scula.numar);
  assert.equal(deg.pasLateral, 2.4);
  assert.deepEqual(deg.degrosare, { adaos: 0.5, unghi: 0 });
  assert.equal(deg.adancime, 18);
  assert.equal(deg.latura, 'pe-linie');
  assert.ok(operatieInMargini(deg) && operatieInMargini(fin));
  assert.notEqual(deg.id, fin.id);
  const cu = doc([relief('r'), relief('r2')], ops);
  assert.equal(rolPiesei(piesa(cu)), 'relief3d');
  // Rolul personalizat nu se salvează din două operații cu valori diferite.
  const s = sablonDinPiese([piesa(cu)]);
  assert.ok(!s.ok && s.motiv === 'invalid');
});

test('din nou rolul: valorile rămân, marginea și planul zero ale degroșării urmează finisarea; înapoi la finisare, finisarea rămâne', () => {
  const d = doc([relief('r')]);
  const [deg, fin] = operatiiPentruRol(d, piesa(d), 'relief3d') as [Operatie, Operatie];
  const deg2 = { ...deg, pasLateral: 2, pas: 2, scula: { ...deg.scula, diametru: 8 }, degrosare: { adaos: 0.8, unghi: 90, margine: 'trece' as const } };
  const fin2 = { ...fin, pasLateral: 0.4, finisare: { unghi: 45, planZero: 2 } };
  const din = doc([relief('r')], [deg2, fin2]);
  const [a, b] = operatiiPentruRol(din, piesa(din), 'relief3d') as [Operatie, Operatie];
  assert.equal(a.pasLateral, 2);
  assert.equal(a.pas, 2);
  assert.equal(a.scula.diametru, 8);
  // Adaosul și unghiul ale degroșării; marginea și planul zero, ale finisării (perete, 2 mm).
  assert.deepEqual(a.degrosare, { adaos: 0.8, unghi: 90, planZero: 2 });
  assert.equal(b.pasLateral, 0.4);
  assert.deepEqual(b.finisare, { unghi: 45, planZero: 2 });
  assert.equal(a.id, deg2.id);
  assert.equal(b.id, fin2.id);
  // Înapoi la „finisarea reliefului”: o singură operație, finisarea de dinainte, cu id-ul ei.
  const doar = operatiiPentruRol(din, piesa(din), 'finisare')!;
  assert.equal(doar.length, 1);
  assert.equal(doar[0]!.id, fin2.id);
  assert.equal(doar[0]!.pasLateral, 0.4);
  assert.deepEqual(doar[0]!.finisare, { unghi: 45, planZero: 2 });
  assert.equal(doar[0]!.degrosare, undefined);
  // Din finisare în „Relief 3D”: finisarea rămâne, degroșarea vine cu implicitele, cu planul zero al finisării.
  const f = doc([relief('r')], [fin2]);
  const [c, e] = operatiiPentruRol(f, piesa(f), 'relief3d') as [Operatie, Operatie];
  assert.deepEqual(c.degrosare, { adaos: 0.5, unghi: 0, planZero: 2 });
  assert.equal(e.id, fin2.id);
});

test('valorile degroșării: îmbinate, `null` scoate câmpul; pe alt fel, nimic', () => {
  const o = { id: 'd', tip: 'degrosare', degrosare: { adaos: 0.5, unghi: 0, nota: 'x' } } as unknown as Operatie;
  assert.deepEqual(cuDegrosare(o, { adaos: 1, unghi: 45, planZero: 2 }).degrosare, { adaos: 1, unghi: 45, nota: 'x', planZero: 2 });
  assert.deepEqual(cuDegrosare(cuDegrosare(o, { margine: 'trece', planZero: 1 }), { margine: null, planZero: null }).degrosare, { adaos: 0.5, unghi: 0, nota: 'x' });
  const p = { id: 'f', tip: 'finisare' } as unknown as Operatie;
  assert.equal(cuDegrosare(p, { adaos: 1 }), p);
});
