/**
 * Rolul „incrustație cu pereți drepți” (ADR 0171 §5, răspunsul 6a): oferit unde e oferit buzunarul (contururi închise),
 * recunoscut după `incrustatie.fel` = 'drept' (un buzunar fără ea rămâne rolul buzunar), cu valorile implicite ale
 * răspunsurilor (jocul lateral 0,1, dopul ridicat, pe fund; g 0,5 și H 2 ca la V; marginea 5), cu freza plată; trecut pe alt
 * rol, nu lasă incrustația în urmă; ales din nou, își păstrează valorile, cu frezele dopului.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { operatiiPentruRol, roluriOferite, rolPiesei } from '../../src/model/rol.ts';
import type { Document } from '../../src/model/document.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const dreptunghi = { tip: 'dreptunghi', latime: 20, inaltime: 10, razaColt: 0 };
const linie = { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 10, y: 0 }, s: { tip: 'L' } }] };
const IMPLICITA = { fel: 'drept', jocLateral: 0.1, dop: 'ridicat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 5 } as const;

function doc(forma: unknown, operatii: unknown[] = []): Document {
  const r = incarca({
    schema: 21, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'element', id: 'a', matrice: I, forma }, operatii }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 100, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
}
const baza = { noduri: ['a'], sens: 'urcare', pas: 1.5, urechi: null, rampa: null, intrari: null, colturi: null } as const;
const exterior = { ...baza, id: 'a', tip: 'profil', scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'exterior', adancime: 3 };

test('rolul e oferit pe contururi închise, ca buzunarul; nu pe o cale deschisă', () => {
  assert.ok(roluriOferite(doc(dreptunghi).piese[0]!).includes('incrustatie-drept'));
  assert.ok(!roluriOferite(doc(linie).piese[0]!).includes('incrustatie-drept'));
});

test('din exterior: un buzunar cu freza plată de dinainte, pasul lateral 40 %, valorile implicite; recunoscut ca rolul lui', () => {
  const d = doc(dreptunghi, [exterior]);
  const ops = operatiiPentruRol(d, d.piese[0]!, 'incrustatie-drept');
  assert.ok(ops && ops.length === 1);
  const o = ops[0]!;
  assert.equal(o.tip, 'buzunar');
  assert.equal(o.latura, 'interior');
  assert.deepEqual(o.scula, { numar: 1, nume: 'freza plata', diametru: 6 });
  assert.equal(o.pasLateral, 2.4);
  assert.deepEqual(o.incrustatie, IMPLICITA);
  assert.ok(!Object.hasOwn(o, 'fundPlat'));
  assert.equal(rolPiesei({ ...d.piese[0]!, operatii: ops }), 'incrustatie-drept');
});

test('din V-carve cu freza în V: freza devine plată, cu un număr al ei', () => {
  const vcarve = { ...baza, id: 'a', tip: 'vcarve', scula: { numar: 2, nume: 'freza V60', diametru: 6, forma: { tip: 'v', unghi: 60 } }, latura: 'interior', adancime: 3 };
  const d = doc(dreptunghi, [vcarve]);
  const o = operatiiPentruRol(d, d.piese[0]!, 'incrustatie-drept')![0]!;
  assert.equal(o.scula.forma, undefined);
  assert.equal(o.scula.nume, 'freza plata');
  assert.equal(o.scula.diametru, 6);
});

test('adâncimea mică: jocul de sub dop e cel mult jumătate din ea (rotunjit în jos), cel puțin 0,1', () => {
  const d = doc(dreptunghi, [{ ...exterior, adancime: 0.6 }]);
  assert.equal(operatiiPentruRol(d, d.piese[0]!, 'incrustatie-drept')![0]!.incrustatie?.joc, 0.3);
  const d2 = doc(dreptunghi, [{ ...exterior, adancime: 0.15 }]);
  assert.equal(operatiiPentruRol(d2, d2.piese[0]!, 'incrustatie-drept')![0]!.incrustatie?.joc, 0.1);
});

test('un buzunar fără incrustație e rolul buzunar; trecut pe buzunar, incrustația pleacă', () => {
  const d = doc(dreptunghi, [exterior]);
  const drept = operatiiPentruRol(d, d.piese[0]!, 'incrustatie-drept')!;
  const d2 = doc(dreptunghi, drept);
  const buzunar = operatiiPentruRol(d2, d2.piese[0]!, 'buzunar')!;
  assert.ok(!Object.hasOwn(buzunar[0]!, 'incrustatie'));
  assert.equal(rolPiesei({ ...d2.piese[0]!, operatii: buzunar }), 'buzunar');
});

test('ales din nou, rolul își păstrează valorile, cu frezele dopului; numărul unei freze noi le ocolește pe ale dopului', () => {
  const inc = { ...IMPLICITA, jocLateral: 0.2, dop: 'decupat', margine: 8, frezeDop: [{ scula: { numar: 2, nume: 'freza plata', diametru: 2 }, pasLateral: 0.8 }] };
  const op = { ...baza, id: 'a', tip: 'buzunar', scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'interior', adancime: 4, pasLateral: 2.4, incrustatie: inc };
  const d = doc(dreptunghi, [op]);
  assert.deepEqual(operatiiPentruRol(d, d.piese[0]!, 'incrustatie-drept')![0]!.incrustatie, inc);
  // Pe incrustația în V, freza V60 Ø6 e nouă: primește primul număr liber, nu T2 (al dopului).
  assert.equal(operatiiPentruRol(d, d.piese[0]!, 'incrustatie')![0]!.scula.numar, 3);
});
