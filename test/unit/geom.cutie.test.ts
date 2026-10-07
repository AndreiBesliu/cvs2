/**
 * Cutia exactă și depășirea față de foaie, pe valori de hârtie. Arcele contribuie prin punctele lor de pe axe, nu prin
 * capete; cubica prin extremele ei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conturCerc, conturDreptunghi, LINIE, type Contur } from '../../src/geom/contur.ts';
import { areDepasire, cutieArc, cutieContur, depasire, largita, type Cutie } from '../../src/geom/cutie.ts';

const aproape = (a: number, b: number, mesaj = ''): void => { assert.ok(Math.abs(a - b) <= 1e-12, `${mesaj}: ${a} ≠ ${b}`); };
const cutieAproape = (k: Cutie, a: Cutie): void => {
  aproape(k.minX, a.minX, 'minX');
  aproape(k.minY, a.minY, 'minY');
  aproape(k.maxX, a.maxX, 'maxX');
  aproape(k.maxY, a.maxY, 'maxY');
};

test('arcul: un sfert trigonometric de la 0 la π/2 are cutia sfertului; același arc orar trece prin celelalte trei axe', () => {
  const c = { x: 0, y: 0 };
  const a = { x: 10, y: 0 };
  const b = { x: 0, y: 10 };
  assert.deepEqual(cutieArc(a, b, c, Math.PI / 2), { minX: 0, minY: 0, maxX: 10, maxY: 10 });
  // Orar de la (10, 0) la (0, 10): baleiajul −3π/2 trece prin −π/2 și −π, deci prin (0, −10) și (−10, 0).
  assert.deepEqual(cutieArc(a, b, c, -3 * Math.PI / 2), { minX: -10, minY: -10, maxX: 10, maxY: 10 });
});

test('arcul: jumătatea de sus a cercului R12 din (82, 50) în (58, 50) urcă la Y 62, nu doar la capete', () => {
  const k = cutieArc({ x: 82, y: 50 }, { x: 58, y: 50 }, { x: 70, y: 50 }, Math.PI);
  assert.deepEqual(k, { minX: 58, minY: 50, maxX: 82, maxY: 62 });
  // Jumătatea de jos, aceleași capete în sens invers: coboară la Y 38.
  assert.deepEqual(cutieArc({ x: 58, y: 50 }, { x: 82, y: 50 }, { x: 70, y: 50 }, Math.PI), { minX: 58, minY: 38, maxX: 82, maxY: 50 });
});

test('arcul: cercul întreg (start = capăt, baleiaj 2π) are cutia cercului', () => {
  assert.deepEqual(cutieArc({ x: 25, y: 10 }, { x: 25, y: 10 }, { x: 10, y: 10 }, 2 * Math.PI), { minX: -5, minY: -5, maxX: 25, maxY: 25 });
});

test('conturul: dreptunghiul, dreptunghiul rotunjit și cercul au cutiile de pe hârtie', () => {
  assert.deepEqual(cutieContur(conturDreptunghi(20, 20, 100, 60)), { minX: 20, minY: 20, maxX: 120, maxY: 80 });
  cutieAproape(cutieContur(conturDreptunghi(20, 20, 100, 60, 5)), { minX: 20, minY: 20, maxX: 120, maxY: 80 });
  cutieAproape(cutieContur(conturCerc(70, 50, 15)), { minX: 55, minY: 35, maxX: 85, maxY: 65 });
});

test('conturul: cubica (0,0) (0,10) (10,10) (10,0) urcă la 7,5, din extremul ei, nu din punctele de control', () => {
  // y(t) = 30·t·(1 − t), maxim la t = 1/2: 7,5. x(t) = 30t² − 20t³ crește monoton de la 0 la 10.
  const c: Contur = {
    inchis: false,
    varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 0, y: 10 }, c2: { x: 10, y: 10 } } }, { p: { x: 10, y: 0 }, s: LINIE }],
  };
  cutieAproape(cutieContur(c), { minX: 0, minY: 0, maxX: 10, maxY: 7.5 });
});

test('depășirea: pe fiecare latură, zero când cutia doar atinge marginea', () => {
  const W = 300;
  const H = 200;
  assert.deepEqual(depasire({ minX: 0, minY: 0, maxX: 300, maxY: 200 }, W, H), { stanga: 0, dreapta: 0, jos: 0, sus: 0 });
  assert.equal(areDepasire(depasire({ minX: 0, minY: 0, maxX: 300, maxY: 200 }, W, H)), false);
  assert.deepEqual(depasire({ minX: -5, minY: 10, maxX: 350, maxY: 201 }, W, H), { stanga: 5, dreapta: 50, jos: 0, sus: 1 });
  // Lărgită cu raza frezei: dreptunghiul la 1 mm de margine, cu discul de R3, iese cu 2 mm.
  assert.deepEqual(depasire(largita({ minX: 1, minY: 20, maxX: 101, maxY: 80 }, 3), W, H), { stanga: 2, dreapta: 0, jos: 0, sus: 0 });
  // Zgomotul numeric sub toleranță nu e o ieșire.
  assert.equal(areDepasire(depasire({ minX: -1e-9, minY: 0, maxX: 300 + 1e-9, maxY: 200 }, W, H)), false);
});
