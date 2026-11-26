/**
 * Rolul „finisarea reliefului” (ADR 0312, felia 18.1↑c-3): oferit doar pe o piesă cu reliefuri (fără contururi); operațiile lui
 * trec de ușă (bila de același diametru, pasul lateral 10 % din freză, liniile la 0°, podeaua cât placa); rolul se recunoaște;
 * frezele se potrivesc la schimbarea rolului (bila doar pe finisare); valorile finisării se scriu îmbinat, iar `null` scoate un
 * câmp opțional; freza finisării se schimbă cu numărul T al unei freze identice sau cel mai mic liber.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import type { Document, Operatie, Piesa } from '../../src/model/document.ts';
import { frezaFinisare, frezaPentruRol, operatiiPentruRol, pasLateralFinisare, roluriOferite, rolPiesei } from '../../src/model/rol.ts';
import { cuFinisare, formaFinisare } from '../../src/model/finisare.ts';
import { operatieInMargini } from '../../src/model/schemaDocument.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const relief = (id: string): unknown => ({
  tip: 'element', id, forma: { tip: 'relief', nx: 10, ny: 10, celula: 1, straturi: [{ id: 's', mod: 'aduna', vizibil: true, dale: 'ab'.repeat(32) }] }, matrice: { ...I },
});
const dreptunghi = (id: string): unknown => ({ tip: 'element', id, forma: { tip: 'dreptunghi', latime: 20, inaltime: 10, razaColt: 0 }, matrice: { ...I } });

function doc(copii: readonly unknown[], operatii: readonly unknown[] = []): Document {
  const r = incarca({
    schema: 31, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'grup', id: 'g', matrice: { ...I }, copii: [...copii] }, operatii: [...operatii] }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
}
const piesa = (d: Document): Piesa => d.piese[0]!;

test('rolurile oferite: finisarea doar pe o piesă cu reliefuri; contururile își păstrează rolurile, fără finisare', () => {
  assert.deepEqual(roluriOferite(piesa(doc([relief('r'), relief('r2')]))), ['finisare', 'relief3d']);
  const amestec = roluriOferite(piesa(doc([relief('r'), dreptunghi('e')])));
  assert.ok(!amestec.includes('finisare') && amestec.includes('exterior'));
  assert.ok(!roluriOferite(piesa(doc([dreptunghi('e')]))).includes('finisare'));
});

test('operațiile rolului: o finisare pe toate reliefurile, cu bila, 10 % pas lateral, podeaua cât placa; trec de ușă și rolul se recunoaște', () => {
  const d = doc([relief('r'), relief('r2')]);
  const ops = operatiiPentruRol(d, piesa(d), 'finisare');
  assert.ok(ops && ops.length === 1);
  const o = ops[0]!;
  assert.equal(o.tip, 'finisare');
  assert.deepEqual(o.noduri, ['r', 'r2']);
  assert.deepEqual(o.scula.forma, { tip: 'bila' });
  assert.equal(o.scula.diametru, 6);
  assert.equal(o.pasLateral, 0.6);
  assert.deepEqual(o.finisare, { unghi: 0 });
  assert.equal(o.adancime, 18);
  assert.equal(o.latura, 'pe-linie');
  assert.ok(operatieInMargini(o));
  const cu = doc([relief('r'), relief('r2')], ops);
  assert.equal(rolPiesei(piesa(cu)), 'finisare');
  // Din nou rolul pe o finisare: valorile ei rămân (pasul, unghiul, podeaua, bila).
  const schimbata = { ...o, pasLateral: 0.4, adancime: 9, finisare: { unghi: 90, margine: 'trece' as const } };
  const din = doc([relief('r'), relief('r2')], [schimbata]);
  const iar = operatiiPentruRol(din, piesa(din), 'finisare')![0]!;
  assert.equal(iar.pasLateral, 0.4);
  assert.equal(iar.adancime, 9);
  assert.deepEqual(iar.finisare, { unghi: 90, margine: 'trece' });
  assert.equal(pasLateralFinisare(3.175), 0.317);
});

test('frezele la schimbarea rolului: bila pe finisare, plată la buzunar, V la V-carve; o bilă rămâne bilă pe finisare', () => {
  const d = doc([dreptunghi('e')]);
  const plata = { numar: 1, nume: 'freza plata', diametru: 6 };
  const b = frezaPentruRol(d, plata, 'finisare');
  assert.deepEqual(b.forma, { tip: 'bila' });
  assert.equal(frezaPentruRol(d, b, 'finisare'), b);
  assert.equal(frezaPentruRol(d, b, 'buzunar').forma, undefined);
  assert.equal(frezaPentruRol(d, b, 'vcarve').forma?.tip, 'v');
});

test('valorile finisării: îmbinate, `null` scoate câmpul; pe alt fel, nimic; forma frezei', () => {
  const o = { id: 'f', tip: 'finisare', finisare: { unghi: 0, nota: 'x' } } as unknown as Operatie;
  assert.deepEqual(cuFinisare(o, { unghi: 45, nealiniat: true, planZero: 2 }).finisare, { unghi: 45, nota: 'x', nealiniat: true, planZero: 2 });
  assert.deepEqual(cuFinisare(cuFinisare(o, { margine: 'trece', planZero: 1 }), { margine: null, planZero: null }).finisare, { unghi: 0, nota: 'x' });
  const p = { id: 'o', tip: 'profil' } as unknown as Operatie;
  assert.equal(cuFinisare(p, { unghi: 10 }), p);
  assert.equal(formaFinisare({ numar: 1, nume: '', diametru: 6, forma: { tip: 'bila' } }), 'bila');
  assert.equal(formaFinisare({ numar: 1, nume: '', diametru: 6, forma: { tip: 'v', unghi: 60 } }), 'v');
  assert.equal(formaFinisare({ numar: 1, nume: '', diametru: 6 }), 'plata');
});

test('freza finisării schimbată: numărul unei freze identice din proiect, altfel cel mai mic liber; aceeași freză rămâne', () => {
  // Profilul are T1 plată Ø6; finisarea are T2 bilă Ø6.
  const profil = { id: 'o', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'exterior', sens: 'urcare', adancime: 3, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null };
  const d = doc([dreptunghi('e')], [profil]);
  const bila = { numar: 2, nume: 'freza bila', diametru: 6, forma: { tip: 'bila' as const } };
  assert.equal(frezaFinisare(d, bila, 'bila', 6), bila);
  assert.equal(frezaFinisare(d, bila, 'plata', 6).numar, 1);
  const b4 = frezaFinisare(d, bila, 'bila', 4);
  assert.deepEqual([b4.numar, b4.nume, b4.diametru, b4.forma], [2, 'freza bila', 4, { tip: 'bila' }]);
  assert.equal(frezaFinisare(d, bila, 'v', 6).forma?.tip, 'v');
});
