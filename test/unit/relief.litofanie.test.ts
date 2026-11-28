/**
 * Litofania (ADR 0321, felia 18.1↑f): harta grosimilor din griul imaginii, pe hârtie. Lumina liniară:
 * t = t_max − L · (t_max − t_min) (albul subțire, negrul gros); pixelii transparenți la grosimea maximă; din spate, oglindită
 * pe X; rama, o bandă de k celule la grosimea maximă, în jur; lumina din spate a previzualizării, (t_max − t) / (t_max − t_min).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cuRama, grosimi, litofanieDinGri, luminaDinGrosimi, oglindesteX } from '../../src/relief/litofanie.ts';
import { gri } from '../../src/relief/imagine.ts';

const aproape = (a: ArrayLike<number>, b: readonly number[], tol = 1e-6): void => {
  assert.equal(a.length, b.length);
  for (let k = 0; k < b.length; k++) assert.ok(Math.abs((a[k] ?? NaN) - (b[k] ?? NaN)) <= tol, `[${k}] ${a[k]} ≠ ${b[k]}`);
};

test('pătratele de gri: alb 0,8, negru 3, griul 128 (L = 128 / 255) la 3 − 0,50196 · 2,2 = 1,89569 mm', () => {
  // Patru pixeli: alb, negru, gri 128 și unul transparent (la grosimea maximă: opac, ca rama).
  const rgba = [255, 255, 255, 255, 0, 0, 0, 255, 128, 128, 128, 255, 9, 9, 9, 0];
  const g = gri(rgba, 4, 1, 'l');
  aproape(grosimi(g, 0.8, 3), [0.8, 3, 3 - (128 / 255) * 2.2, 3]);
});

test('din spate: oglindită pe X, rând cu rând', () => {
  aproape(oglindesteX(Float32Array.from([1, 2, 3, 4, 5, 6]), 3, 2), [3, 2, 1, 6, 5, 4]);
});

test('rama: k celule în jur, la grosimea dată; relieful crește cu 2k pe fiecare latură', () => {
  const r = cuRama(Float32Array.from([1, 2, 3, 4]), 2, 2, 1, 9);
  assert.deepEqual([r.nx, r.ny], [4, 4]);
  aproape(r.valori, [9, 9, 9, 9, 9, 1, 2, 9, 9, 3, 4, 9, 9, 9, 9, 9]);
  const fara = cuRama(Float32Array.from([1, 2]), 2, 1, 0, 9);
  assert.deepEqual([fara.nx, fara.ny], [2, 1]);
  aproape(fara.valori, [1, 2]);
});

test('litofania întreagă: grosimile, oglinda din spate, apoi rama (în jurul imaginii oglindite)', () => {
  const g = Float64Array.from([1, 0]); // alb, negru (rândul de jos e primul)
  const fata = litofanieDinGri(g, 2, 1, { tmin: 0.8, tmax: 3, rama: 0, spate: false });
  aproape(fata.valori, [0.8, 3]);
  const spate = litofanieDinGri(g, 2, 1, { tmin: 0.8, tmax: 3, rama: 1, spate: true });
  assert.deepEqual([spate.nx, spate.ny], [4, 3]);
  aproape(spate.valori, [3, 3, 3, 3, 3, 3, 0.8, 3, 3, 3, 3, 3]);
});

test('lumina din spate: (t_max − t) / (t_max − t_min), între 0 și 1; golul întunecat', () => {
  aproape(luminaDinGrosimi(Float32Array.from([0.8, 3, 1.9, 5, 0, NaN]), 0.8, 3), [1, 0, 0.5, 0, 1, 0]);
});

test('imaginea luminii: gri cât lumina, rândul de sus al grilei primul', async () => {
  const { imagineLumina } = await import('../../src/relief/litofanie.ts');
  const im = imagineLumina([0, 1, 0.5, 0.25], 2, 2);
  assert.deepEqual([im.latime, im.inaltime], [2, 2]);
  // Rândul j = 1 (sus) e primul în imagine: 0,5 și 0,25.
  assert.deepEqual([...im.rgba], [128, 128, 128, 255, 64, 64, 64, 255, 0, 0, 0, 255, 255, 255, 255, 255]);
});
