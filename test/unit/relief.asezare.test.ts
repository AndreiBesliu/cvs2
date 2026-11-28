/**
 * Imaginea pusă ca strat nou pe un relief (ADR 0320, felia 18.1↑j): valorile imaginii (un pixel de `pixel` mm), centrate pe
 * grila reliefului; fiecare celulă ia pixelul în care îi cade centrul (cel mai apropiat, fără amestec: la aceeași scară,
 * stratul e imaginea, pixel cu pixel), iar ce nu cade în imagine e gol (NaN: compunerea îl sare). Imaginea mai mare decât
 * relieful se taie. Intervalul unui pixel e închis la stânga și jos, deschis la dreapta și sus. Totul pe hârtie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asezaPeGrila } from '../../src/relief/asezare.ts';

const N = NaN;
const lista = (a: ArrayLike<number>): number[] => Array.from(a, (x) => (Number.isNaN(x) ? -1 : x));

test('aceeași mărime și aceeași scară: stratul e imaginea, cu golurile ei', () => {
  const v = [1, 2, N, 4, 5, 6];
  assert.deepEqual(lista(asezaPeGrila(v, 3, 2, 0.5, { nx: 3, ny: 2, celula: 0.5 })), lista(v));
});

test('o imagine mai mică, centrată: 2 × 2 pixeli de 1 mm pe 4 × 4 celule de 1 mm, restul gol', () => {
  const r = asezaPeGrila([1, 2, 3, 4], 2, 2, 1, { nx: 4, ny: 4, celula: 1 });
  // Imaginea stă în [1, 3] × [1, 3]: celulele (1, 1), (2, 1), (1, 2), (2, 2); rândul j = 0 e jos, ca în grilă.
  assert.deepEqual(lista(r), [-1, -1, -1, -1, -1, 1, 2, -1, -1, 3, 4, -1, -1, -1, -1, -1]);
});

test('alt pixel: 4 × 4 pixeli de 0,5 mm pe 2 × 2 celule de 1 mm iau pixelii 1 și 3 pe fiecare axă', () => {
  const v = Array.from({ length: 16 }, (_, k) => k);
  // Centrele celulelor la 0,5 și 1,5 mm cad în pixelii ⌊0,5 / 0,5⌋ = 1 și ⌊1,5 / 0,5⌋ = 3.
  assert.deepEqual(lista(asezaPeGrila(v, 4, 4, 0.5, { nx: 2, ny: 2, celula: 1 })), [5, 7, 13, 15]);
});

test('o imagine mai mare se taie: 6 × 2 pixeli pe 2 × 2 celule iau coloanele din mijloc', () => {
  const v = [0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15];
  // x0 = 1 − 3 = −2: centrele 0,5 și 1,5 cad în pixelii 2 și 3; y0 = 1 − 1 = 0.
  assert.deepEqual(lista(asezaPeGrila(v, 6, 2, 1, { nx: 2, ny: 2, celula: 1 })), [2, 3, 12, 13]);
});

test('marginea: un centru pe marginea din stânga e înăuntru, pe cea din dreapta e afară', () => {
  // 3 pixeli de 1 mm pe 4 celule de 1 mm: imaginea în [0,5, 3,5]; centrele 0,5 1,5 2,5 înăuntru, 3,5 afară.
  assert.deepEqual(lista(asezaPeGrila([7, 8, 9], 3, 1, 1, { nx: 4, ny: 1, celula: 1 })), [7, 8, 9, -1]);
});

test('o imagine fără pixeli sau cu pixelul nepozitiv: totul gol', () => {
  assert.deepEqual(lista(asezaPeGrila([], 0, 0, 1, { nx: 2, ny: 1, celula: 1 })), [-1, -1]);
  assert.deepEqual(lista(asezaPeGrila([1], 1, 1, 0, { nx: 2, ny: 1, celula: 1 })), [-1, -1]);
});
