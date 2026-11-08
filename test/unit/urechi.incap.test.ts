/**
 * Câte urechi încap pe o buclă (`urechiCareIncap`, pentru punțile dopurilor, ADR 0171, ADR 0172): aceeași regulă ca a lucrării
 * (`geometrieUrechi`, W ≤ 0,9·P / n). Pe orice buclă, numărul dat e primit de lucrare, iar unul în plus (cât timp e sub cele
 * cerute) e refuzat; nicio buclă nu primește mai multe decât cele cerute. Pe hârtie: punctul unui „i” cu banda (bucla de
 * 24,85 mm, palierul 4 + 3 = 7) primește 3; cercul R2 cu Ø1 la dopul drept (bucla 2π·2,4 = 15,08, palierul 5), 2.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geometrieUrechi, urechiCareIncap } from '../../src/cam/urechi.ts';

test('pe hârtie: punctul unui „i” cu banda primește 3 punți, cercul R2 al dopului drept 2, o buclă lungă cele cerute', () => {
  assert.equal(urechiCareIncap(24.85, 7, 4), 3);
  assert.equal(urechiCareIncap(2 * Math.PI * 2.4, 5, 4), 2);
  assert.equal(urechiCareIncap(500, 7, 4), 4);
  assert.equal(urechiCareIncap(5, 7, 4), 0);
  assert.equal(urechiCareIncap(0, 7, 4), 0);
  assert.equal(urechiCareIncap(10, 0, 4), 0);
});

test('aceeași regulă ca lucrarea: numărul dat e primit, unul în plus e refuzat, niciodată peste cele cerute', () => {
  // Generator determinist (LCG), ca proba să fie aceeași la fiecare rulare.
  let x = 12345;
  const urmator = (): number => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  for (let k = 0; k < 5000; k++) {
    const L = 0.5 + urmator() * 400, W = 0.2 + urmator() * 30, cerute = 1 + Math.floor(urmator() * 12);
    const n = urechiCareIncap(L, W, cerute);
    assert.ok(n >= 0 && n <= cerute, `L ${L}, W ${W}: ${n} din ${cerute}`);
    if (n > 0) assert.equal(typeof geometrieUrechi(L, { numar: n, latime: W, varf: 1 }), 'object', `L ${L}, W ${W}: ${n} ar trebui să încapă`);
    if (n < cerute) assert.equal(typeof geometrieUrechi(L, { numar: n + 1, latime: W, varf: 1 }), 'string', `L ${L}, W ${W}: ${n + 1} n-ar trebui să încapă`);
  }
});
