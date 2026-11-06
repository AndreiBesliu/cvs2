/**
 * Forma din cvs2 ridicată în atelierul 3D (ADR 0166 §D), în motorul LEGO, fără browser (`teste/incarca.js`): contururile
 * închise primite din desen, la o grosime; un contur cuprins de un număr impar de alte contururi e o gaură a celui care îl
 * cuprinde direct, unul cuprins de un număr par e un corp. Valorile pe hârtie: dreptunghiul 20 × 10 cu gaura 5 × 4, la
 * 3,2 mm, are (200 − 20) · 3,2 = 576 mm³; pătratul 30 cu gaura 20 și insula 10, la 2 mm, (900 − 400 + 100) · 2 = 1 200 mm³.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

type P3 = [number, number, number];
type Tri = [P3, P3, P3];
const cere = createRequire(import.meta.url);
const { motoare, plasa } = cere('../../extensii/trenulet/sursa/teste/incarca.js') as {
  motoare: () => { L: { construieste(def: unknown): { tri: Tri[]; dim: number[] } } };
  plasa: (tri: readonly Tri[]) => { deschise: number; corpuri: number; negative: number };
};
const { L } = motoare();
const volum = (tri: readonly Tri[]): number => tri.reduce((t, [a, b, c]) =>
  t + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);
const drept = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
// tabloul vine din contextul vm al motorului: copiat aici, ca deepEqual să compare valorile, nu prototipurile
const dim = (d: readonly number[]): number[] => Array.from(d, (v) => Math.round(v * 1000) / 1000);

test('dreptunghiul 20 × 10 cu o gaură 5 × 4, la 3,2 mm: un corp închis, 576 mm³, cutia 20 × 10 × 3,2', () => {
  const r = L.construieste({ tip: 'dinCvs2', contururi: [drept(100, 50, 120, 60), drept(105, 53, 110, 57)], grosime: 3.2 });
  assert.deepEqual(plasa(r.tri), { deschise: 0, corpuri: 1, negative: 0 });
  assert.ok(Math.abs(volum(r.tri) - 576) < 0.05, String(volum(r.tri)));
  assert.deepEqual(dim(r.dim), [20, 10, 3.2]);
});

test('sensul contururilor nu contează: același dreptunghi, parcurs orar, are același volum', () => {
  const r = L.construieste({ tip: 'dinCvs2', contururi: [drept(0, 0, 20, 10).reverse(), drept(5, 3, 10, 7)], grosime: 3.2 });
  assert.deepEqual(plasa(r.tri), { deschise: 0, corpuri: 1, negative: 0 });
  assert.ok(Math.abs(volum(r.tri) - 576) < 0.05);
});

test('o insulă în gaură e un corp al ei: pătratul 30, gaura 20, insula 10, la 2 mm: două corpuri, 1 200 mm³', () => {
  const r = L.construieste({ tip: 'dinCvs2', contururi: [drept(0, 0, 30, 30), drept(5, 5, 25, 25), drept(10, 10, 20, 20)], grosime: 2 });
  assert.deepEqual(plasa(r.tri), { deschise: 0, corpuri: 2, negative: 0 });
  assert.ok(Math.abs(volum(r.tri) - 1200) < 0.05, String(volum(r.tri)));
});

test('două forme despărțite: două corpuri, fiecare cu volumul lui (10 × 10 + 5 × 5) · 1 = 125 mm³', () => {
  const r = L.construieste({ tip: 'dinCvs2', contururi: [drept(0, 0, 10, 10), drept(20, 0, 25, 5)], grosime: 1 });
  assert.deepEqual(plasa(r.tri), { deschise: 0, corpuri: 2, negative: 0 });
  assert.ok(Math.abs(volum(r.tri) - 125) < 0.05);
});

test('grosimea, între 0,4 și 50 mm (3,2 dacă nu e un număr)', () => {
  const g = (grosime: unknown): number => dim(L.construieste({ tip: 'dinCvs2', contururi: [drept(0, 0, 10, 10)], grosime }).dim)[2]!;
  assert.deepEqual([g(100), g(0.1), g('x'), g(12.5)], [50, 0.4, 3.2, 12.5]);
});

test('fără niciun contur închis cu arie (gol, două puncte, puncte pe o dreaptă), motorul spune că n-are ce ridica', () => {
  for (const contururi of [[], [[[0, 0], [10, 0]]], [[[0, 0], [5, 0], [10, 0]]]]) {
    assert.throws(() => L.construieste({ tip: 'dinCvs2', contururi, grosime: 3 }), /Niciun contur închis de ridicat/);
  }
});
