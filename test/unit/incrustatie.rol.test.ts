/**
 * Rolul „Incrustație în V” (ADR 0170 §5, răspunsul 5a): oferit unde e oferit V-carve-ul (contururi închise), recunoscut după
 * câmpul `incrustatie` (un V-carve fără el rămâne rolul V-carve), cu valorile implicite ale răspunsurilor (jocul 0,5, fierăstrăul
 * 2 cât lasă conul, marginea 5, fața coborâtă) și cu freza dreaptă a feței dopului; trecut pe alt rol, nu lasă nici incrustația,
 * nici fundul plat în urmă. Pe hârtie: V60 Ø6 are conul 3 / tan 30° = 5,196 mm.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { operatiiPentruRol, roluriOferite, rolPiesei } from '../../src/model/rol.ts';
import type { Document } from '../../src/model/document.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const dreptunghi = { tip: 'dreptunghi', latime: 20, inaltime: 10, razaColt: 0 };
const linie = { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 10, y: 0 }, s: { tip: 'L' } }] };

function doc(forma: unknown, operatii: unknown[] = []): Document {
  const r = incarca({
    schema: 20, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'element', id: 'a', matrice: I, forma }, operatii }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 100, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
}
const exterior = { id: 'a', tip: 'profil', noduri: ['a'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'exterior', sens: 'urcare', adancime: 3, pas: 1.5, urechi: null, rampa: null, intrari: null, colturi: null };

test('rolul e oferit pe contururi închise, ca V-carve-ul; nu pe o cale deschisă', () => {
  assert.ok(roluriOferite(doc(dreptunghi).piese[0]!).includes('incrustatie'));
  assert.ok(!roluriOferite(doc(linie).piese[0]!).includes('incrustatie'));
});

test('din exterior în incrustație: V60 cu același diametru, adâncimea 3, valorile implicite, freza plată de dinainte ca fund plat', () => {
  const d = doc(dreptunghi, [exterior]);
  const ops = operatiiPentruRol(d, d.piese[0]!, 'incrustatie');
  assert.ok(ops && ops.length === 1);
  const o = ops[0]!;
  assert.equal(o.tip, 'vcarve');
  assert.equal(o.latura, 'interior');
  assert.deepEqual(o.scula.forma, { tip: 'v', unghi: 60 });
  assert.equal(o.scula.diametru, 6);
  assert.equal(o.adancime, 3);
  // S = 3 − 0,5 = 2,5; conul 5,196 lasă H cel mult 2,696, deci rămâne 2.
  assert.deepEqual(o.incrustatie, { fel: 'v', joc: 0.5, fierastrau: 2, margine: 5, jurDop: 'fata' });
  assert.deepEqual(o.fundPlat, { scula: { numar: 1, nume: 'freza plata', diametru: 6 }, pasLateral: 2.4 });
  assert.notEqual(o.scula.numar, 1, 'V-ul are alt număr decât freza plată');
});

test('recunoașterea: un V-carve cu incrustație e rolul incrustației; fără ea, rolul V-carve', () => {
  const d = doc(dreptunghi, [exterior]);
  const inc = operatiiPentruRol(d, d.piese[0]!, 'incrustatie')!;
  const cu = doc(dreptunghi, inc);
  assert.equal(rolPiesei(cu.piese[0]!), 'incrustatie');
  const { incrustatie: _i, ...fara } = inc[0]!;
  void _i;
  assert.equal(rolPiesei(doc(dreptunghi, [fara]).piese[0]!), 'vcarve');
});

test('spațiul pentru fierăstrău se strânge cât lasă conul: V90 Ø6 (conul 3), adâncimea 3, jocul 0,5 → H = 0,5', () => {
  const v90 = { ...exterior, scula: { numar: 2, nume: 'freza V90', diametru: 6, forma: { tip: 'v', unghi: 90 } }, tip: 'vcarve', latura: 'interior' };
  const d = doc(dreptunghi, [v90]);
  const o = operatiiPentruRol(d, d.piese[0]!, 'incrustatie')![0]!;
  assert.equal(o.incrustatie?.fierastrau, 0.5);
});

test('din incrustație în alt rol: nici incrustația, nici fundul plat nu rămân', () => {
  const d = doc(dreptunghi, [exterior]);
  const inc = doc(dreptunghi, operatiiPentruRol(d, d.piese[0]!, 'incrustatie')!);
  for (const rol of ['vcarve', 'exterior', 'buzunar'] as const) {
    const ops = operatiiPentruRol(inc, inc.piese[0]!, rol)!;
    for (const o of ops) {
      assert.equal(o.incrustatie, undefined, rol);
      assert.equal(o.fundPlat, undefined, rol);
    }
  }
});

test('incrustația de dinainte rămâne când rolul se alege din nou (jocul și fierăstrăul omului)', () => {
  const d = doc(dreptunghi, [exterior]);
  const prima = operatiiPentruRol(d, d.piese[0]!, 'incrustatie')!;
  const cu = doc(dreptunghi, [{ ...prima[0]!, incrustatie: { fel: 'v', joc: 0.3, fierastrau: 1.5, margine: 8, jurDop: 'fata' } }]);
  const iar = operatiiPentruRol(cu, cu.piese[0]!, 'incrustatie')![0]!;
  assert.deepEqual(iar.incrustatie, { fel: 'v', joc: 0.3, fierastrau: 1.5, margine: 8, jurDop: 'fata' });
});
