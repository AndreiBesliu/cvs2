/**
 * Relieful arătat pe planșă (ADR 0310 §7, felia 18.1↑a): grila redusă pentru desen (media pe blocuri, golurile sărite),
 * intervalul Z și umbrirea cu lumina din stânga-sus. Valorile pe hârtie: un plan înclinat spre lumină e mai luminos decât unul
 * plat, unul înclinat de la ea mai întunecat; golul e transparent; rândul de sus al imaginii e rândul de sus al reliefului.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { factorReducere, intervalZ, LATURA_UMBRIRE, reduce, umbreste } from '../../src/relief/umbrire.ts';

const G = NaN;
const pixel = (u: { latime: number; rgba: Uint8ClampedArray }, x: number, y: number): number[] => {
  const p = 4 * (y * u.latime + x);
  return [u.rgba[p] ?? -1, u.rgba[p + 1] ?? -1, u.rgba[p + 2] ?? -1, u.rgba[p + 3] ?? -1];
};

test('factorul de reducere: cel mult LATURA_UMBRIRE pe latura mare; 1 sub ea', () => {
  assert.equal(LATURA_UMBRIRE, 2048);
  assert.equal(factorReducere(1, 1), 1);
  assert.equal(factorReducere(2048, 100), 1);
  assert.equal(factorReducere(2049, 100), 2);
  assert.equal(factorReducere(100, 4096), 2);
  assert.equal(factorReducere(8192, 8192), 4);
  assert.equal(factorReducere(6145, 10), 4);
});

test('reducerea: media pe blocuri k × k, cu golurile sărite; un bloc doar din goluri rămâne gol; marginea, bloc parțial', () => {
  // 3 × 3, j în sus; k = 2 → 2 × 2: [0,1]×[0,1], [2]×[0,1], [0,1]×[2], [2]×[2].
  const v = Float32Array.from([1, 3, 10, G, 5, G, G, G, 7]);
  const r = reduce(v, 3, 3, 2);
  assert.equal(r.nx, 2);
  assert.equal(r.ny, 2);
  assert.deepEqual([...r.valori], [3, 10, G, 7]);
  // k = 1: aceeași grilă (o copie).
  const s = reduce(v, 3, 3, 1);
  assert.deepEqual([...s.valori], [...v]);
});

test('intervalul Z: min și max ale celulelor negoale; niciuna: null', () => {
  assert.deepEqual(intervalZ(Float32Array.from([2, G, -1.5, 4])), { min: -1.5, max: 4 });
  assert.equal(intervalZ(Float32Array.from([G, G])), null);
  assert.deepEqual(intervalZ(Float32Array.from([3])), { min: 3, max: 3 });
});

test('umbrirea: planul plat, înclinat spre lumină și de la ea; golul transparent', () => {
  // Plan plat: N = (0, 0, 1), L = (−½, ½, √2/2): I = √2/2.
  const plat = umbreste(new Float32Array(9).fill(2), 3, 3, 1);
  assert.equal(plat.latime, 3);
  assert.equal(plat.inaltime, 3);
  const g = Math.round(255 * (0.25 + 0.75 * Math.SQRT1_2));
  assert.deepEqual(pixel(plat, 1, 1), [g, g, g, 255]);
  // Fața spre lumină (urcă spre dreapta, dz/dx = 1): N ∝ (−1, 0, 1) / √2, I = (½ + √2/2) / √2. Fața de la lumină (urcă spre
  // stânga, dz/dx = −1): N ∝ (1, 0, 1) / √2, I = (−½ + √2/2) / √2.
  const spreLumina = umbreste(Float32Array.from([1, 2, 3, 1, 2, 3, 1, 2, 3]), 3, 3, 1);
  const deLaLumina = umbreste(Float32Array.from([3, 2, 1, 3, 2, 1, 3, 2, 1]), 3, 3, 1);
  const is = (0.5 + Math.SQRT1_2) / Math.SQRT2, id = (-0.5 + Math.SQRT1_2) / Math.SQRT2;
  assert.equal(pixel(spreLumina, 1, 1)[0], Math.round(255 * (0.25 + 0.75 * is)), 'panta spre lumină e luminată');
  assert.equal(pixel(deLaLumina, 1, 1)[0], Math.round(255 * (0.25 + 0.75 * id)));
  assert.ok((pixel(spreLumina, 1, 1)[0] ?? 0) > g && (pixel(deLaLumina, 1, 1)[0] ?? 0) < g);
  // Lumina vine și de sus (+y): fața care urcă spre j mic (în jos pe foaie) privește în sus, spre ea.
  const spreSus = umbreste(Float32Array.from([3, 3, 3, 2, 2, 2, 1, 1, 1]), 3, 3, 1);
  assert.equal(pixel(spreSus, 1, 1)[0], Math.round(255 * (0.25 + 0.75 * is)));
  // Golul: transparent; vecinii lui folosesc diferența pe o parte.
  const cuGol = umbreste(Float32Array.from([2, 2, 2, 2, G, 2, 2, 2, 2]), 3, 3, 1);
  assert.deepEqual(pixel(cuGol, 1, 1), [0, 0, 0, 0]);
  assert.deepEqual(pixel(cuGol, 0, 0), [g, g, g, 255]);
});

test('umbrirea: rândul de sus al imaginii e j = ny − 1 (sus pe foaie), iar celula schimbă panta', () => {
  // 1 × 2: jos (j = 0) gol, sus (j = 1) plin: imaginea are pixelul de sus plin.
  const u = umbreste(Float32Array.from([G, 5]), 1, 2, 1);
  assert.equal(pixel(u, 0, 0)[3], 255);
  assert.equal(pixel(u, 0, 1)[3], 0);
  // Aceeași diferență pe o celulă de 2 mm, pe fața de la lumină: panta e jumătate, deci mai aproape de planul plat.
  const v = Float32Array.from([3, 2, 1, 3, 2, 1, 3, 2, 1]);
  const a = pixel(umbreste(v, 3, 3, 1), 1, 1)[0] ?? 0, b = pixel(umbreste(v, 3, 3, 2), 1, 1)[0] ?? 0;
  const g = Math.round(255 * (0.25 + 0.75 * Math.SQRT1_2));
  assert.ok(a < b && b < g, `${a} < ${b} < ${g}`);
});
