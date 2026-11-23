/**
 * Desenele ferestrei exportului spun ce face programul (ADR 0290, „Probele”: „Desenele spun adevărul”; felia 28.8↑b): trecerile
 * din desenul adâncimii sunt cele ale lucrării (`adancimiTreceri`), iar urechile desenate stau unde le pune lucrarea, la
 * distanțe egale (`geometrieUrechi`) și după reguli (`urechiPeLaturi`, pe un dreptunghi cu laturile desenului).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adancimiTreceri } from '../../src/cam/profil.ts';
import { geometrieUrechi } from '../../src/cam/urechi.ts';
import { urechiPeLaturi } from '../../src/cam/urechiLaturi.ts';
import { conturDreptunghi } from '../../src/geom/contur.ts';
import { centreUrechiDesen, treceriEgale } from '../../src/ui/exportDeseneCalcul.ts';

const aproape = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

test('trecerile din desen sunt ale lucrării: același număr, fiecare de A / n, ultima la A', () => {
  const cazuri: Array<readonly [number, number]> = [[10, 4], [18, 6], [18, 6.0000001], [6, 3], [3, 6], [1, 1], [0.3, 0.1], [12.5, 2.5], [25, 3.175],
    [19.05, 1.5875], [5, 0.001]];
  for (const [a, p] of cazuri) {
    const lucrare = adancimiTreceri(a, p), desen = treceriEgale(a, p);
    if (typeof lucrare === 'string') { assert.equal(desen, null, `${a} / ${p}: lucrarea refuză (${lucrare})`); continue; }
    assert.ok(desen, `${a} / ${p}`);
    assert.equal(desen.n, lucrare.length, `${a} / ${p}: numărul trecerilor`);
    lucrare.forEach((z, i) => assert.ok(aproape(z, (i + 1) * desen.d), `${a} / ${p}: trecerea ${i + 1} la ${z}, desenul ${(i + 1) * desen.d}`));
  }
  // Pe hârtie: 10 mm cu pasul 4 = 3 treceri de 3,33 mm (nu două de 5, mai adânci decât pasul).
  assert.deepEqual(treceriEgale(10, 4), { n: 3, d: 10 / 3 });
  for (const [a, p] of [[0, 3], [5, 0], [-1, 1], [null, 3], [5, null], [Number.NaN, 1], [Number.POSITIVE_INFINITY, 1]] as const) assert.equal(treceriEgale(a, p), null);
});

test('urechile desenate stau unde le pune lucrarea, la distanțe egale și pe laturi', () => {
  // Laturile desenului (lată și înaltă) și ale unui pătrat, unde toate laturile sunt „cele mai lungi”.
  for (const [w, h] of [[116, 78], [80, 30], [30, 80], [50, 50]] as const) {
    const laturi = [w, h, w, h], P = 2 * (w + h);
    for (let n = 1; n <= 7; n++) {
      const g = geometrieUrechi(P, { numar: n, latime: 0.5, varf: 0 });
      assert.ok(typeof g !== 'string');
      assert.deepEqual(centreUrechiDesen('egale', n, laturi).map((x) => +x.toFixed(9)), g.centre.map((x) => +x.toFixed(9)), `egale ${w}×${h}, ${n}`);
      for (const regula of ['lungi', 'scurte', 'mijloc'] as const) {
        const l = urechiPeLaturi(conturDreptunghi(0, 0, w, h), regula, 0.5, n);
        assert.ok(l, `${regula} ${w}×${h}`);
        const desen = centreUrechiDesen(regula, n, laturi).map((x) => +x.toFixed(9)).sort((a, b) => a - b);
        assert.deepEqual(desen, l.centre.map((x) => +x.toFixed(9)), `${regula} ${w}×${h}, ${n}`);
      }
    }
  }
  // Pe hârtie (ca `urechi.laturi.test.ts`): 80 × 30, două pe laturile lungi, la mijlocul lor; patru la mijloc, oricare număr.
  assert.deepEqual(centreUrechiDesen('lungi', 2, [80, 30, 80, 30]), [40, 150]);
  assert.deepEqual(centreUrechiDesen('mijloc', 7, [80, 30, 80, 30]), [40, 95, 150, 205]);
  assert.deepEqual(centreUrechiDesen('egale', 0, [80, 30, 80, 30]), []);
});
