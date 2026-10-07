import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  arc, arieCuSemn, cerculArcului, conturCerc, conturDreptunghi, inverseaza, LINIE, type Contur,
} from '../../src/geom/contur.ts';
import { aplica, compune, determinant, rotatie, scalare, transformaContur, translatie } from '../../src/geom/matrice.ts';

const aproape = (a: number, b: number, tol: number, ce: string): void => {
  assert.ok(Math.abs(a - b) <= tol, `${ce}: ${a} față de ${b} (toleranța ${tol})`);
};

test('aria cercului e πr², exact, din cele două arce', () => {
  for (const r of [0.5, 3, 15, 100, 1220]) aproape(arieCuSemn(conturCerc(7, -3, r)), Math.PI * r * r, 1e-12 * r * r, `r = ${r}`);
});

test('aria dreptunghiului, cu și fără colțuri rotunjite, pe hârtie', () => {
  assert.equal(arieCuSemn(conturDreptunghi(20, 20, 100, 60)), 6000);
  // colțuri R10: w·h − (4 − π)·r²
  aproape(arieCuSemn(conturDreptunghi(0, 0, 120, 80, 10)), 120 * 80 - (4 - Math.PI) * 100, 1e-9, 'R10');
});

test('aria unei cubice e exactă: P0(0,0) P1(0,1) P2(1,1) P3(1,0), închisă cu o linie, are −0,6 (sens orar)', () => {
  const c: Contur = {
    inchis: true,
    varfuri: [
      { p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 0, y: 1 }, c2: { x: 1, y: 1 } } },
      { p: { x: 1, y: 0 }, s: LINIE },
    ],
  };
  aproape(arieCuSemn(c), -0.6, 1e-15, 'cubica');
});

test('arcul din bulge: semicercul (bulge 1) are centrul la mijlocul coardei și raza jumătate din ea', () => {
  const { centru, raza, baleiaj } = cerculArcului({ x: 10, y: 0 }, { x: -10, y: 0 }, 1);
  aproape(centru.x, 0, 1e-15, 'cx');
  aproape(centru.y, 0, 1e-15, 'cy');
  aproape(raza, 10, 1e-15, 'raza');
  aproape(baleiaj, Math.PI, 1e-15, 'baleiajul');
});

test('inversarea schimbă semnul ariei, iar dublă inversare dă conturul inițial', () => {
  for (const c of [conturCerc(0, 0, 5), conturDreptunghi(0, 0, 30, 20, 4)]) {
    const inv = inverseaza(c);
    aproape(arieCuSemn(inv), -arieCuSemn(c), 1e-9, 'aria inversată');
    assert.deepEqual(inverseaza(inv), c);
  }
});

test('rotirile la multipli de 90° sunt exacte: fără 6·10⁻¹⁷ în loc de 0', () => {
  assert.deepEqual(rotatie(90), { a: 0, b: 1, c: -1, d: 0, e: 0, f: 0 });
  assert.deepEqual(aplica(rotatie(-90), { x: 3, y: 4 }), { x: 4, y: -3 });
  assert.deepEqual(aplica(rotatie(180), { x: 3, y: 4 }), { x: -3, y: -4 });
});

test('compunerea aplică întâi matricea din dreapta', () => {
  const m = compune(translatie(10, 0), rotatie(90));
  assert.deepEqual(aplica(m, { x: 1, y: 0 }), { x: 10, y: 1 });
});

test('o similitudine păstrează arcele: aria se scalează cu s², iar oglindirea îi schimbă semnul', () => {
  const c = conturDreptunghi(0, 0, 30, 20, 4);
  const a = arieCuSemn(c);
  aproape(arieCuSemn(transformaContur(c, compune(rotatie(90), scalare(2)))), 4 * a, 1e-9, 'rotit și dublat');
  const oglindit = transformaContur(c, scalare(-1, 1));
  assert.ok(determinant(scalare(-1, 1)) < 0);
  aproape(arieCuSemn(oglindit), -a, 1e-9, 'oglindit');
  const v = oglindit.varfuri.find((x) => x.s.tip === 'A');
  assert.deepEqual(v?.s, arc(-Math.tan(Math.PI / 8)));
});

test('un arc sub o matrice neuniformă e refuzat: devine arc de elipsă (T2)', () => {
  assert.throws(() => transformaContur(conturCerc(0, 0, 5), scalare(2, 1)), /neuniformă/);
  // fără arce, orice matrice afină trece
  assert.equal(arieCuSemn(transformaContur(conturDreptunghi(0, 0, 10, 10), scalare(2, 1))), 200);
});

test('formele invalide sunt refuzate la construcție', () => {
  assert.throws(() => conturCerc(0, 0, 0));
  assert.throws(() => conturDreptunghi(0, 0, -1, 5));
  assert.throws(() => conturDreptunghi(0, 0, 10, 10, 6));
});
