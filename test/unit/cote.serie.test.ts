import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distantaDinCursor } from '../../src/model/desenCota.ts';
import { cotaUrmatoare, idCotaNou, pornesteSerie } from '../../src/model/serieCote.ts';

/**
 * Lanțul și linia de bază (ADR 0330 §4, felia 10.4↑d-1), pure: cotele liniare puse una după alta. Lanțul pleacă din capătul
 * ultimei cote, cu linia de cotă pe aceeași dreaptă; linia de bază pleacă mereu din primul punct, cu fiecare linie nouă mai
 * departe de formă cu un pas. Valorile sunt pe hârtie (linia orizontalei la y = mijloc + d, a verticalei la x = mijloc − d).
 */

const ln = (fel: 'orizontala' | 'verticala', a: { x: number; y: number }, b: { x: number; y: number }, d: number): number =>
  fel === 'orizontala' ? (a.y + b.y) / 2 + d : (a.x + b.x) / 2 - d;

test('lanțul orizontal: fiecare cotă pleacă din capătul celei dinainte, iar linia rămâne la y = 10', () => {
  const s0 = pornesteSerie('lant', 'orizontala', { x: 0, y: 0 }, { x: 30, y: 0 }, 10);
  assert.ok(s0);
  assert.deepEqual(s0.din, { x: 30, y: 0 });
  const r1 = cotaUrmatoare(s0, { x: 50, y: 5 }, 7);
  assert.ok(r1);
  // Linia y = 10, puncte (30, 0) și (50, 5): d = 10 − 2,5 = 7,5.
  assert.equal(r1.d, 7.5);
  assert.equal(ln('orizontala', { x: 30, y: 0 }, { x: 50, y: 5 }, r1.d), 10);
  assert.deepEqual(r1.stare.din, { x: 50, y: 5 });
  const r2 = cotaUrmatoare(r1.stare, { x: 80, y: -4 }, 7);
  assert.ok(r2);
  assert.equal(r2.d, 9.5);
  assert.equal(ln('orizontala', { x: 50, y: 5 }, { x: 80, y: -4 }, r2.d), 10);
  // Un punct cu același x ca ultimul capăt: cota orizontală ar avea zero, deci nu se pune.
  assert.equal(cotaUrmatoare(r2.stare, { x: 80, y: 20 }, 7), null);
});

test('lanțul vertical: linia la x = −15 pentru fiecare cotă (normala spre stânga)', () => {
  const s0 = pornesteSerie('lant', 'verticala', { x: 0, y: 0 }, { x: 0, y: 40 }, 15);
  assert.ok(s0);
  const r1 = cotaUrmatoare(s0, { x: 6, y: 70 }, 7);
  assert.ok(r1);
  // d = 15 − (0 + (−6)) / 2 = 18; linia x = 3 − 18 = −15.
  assert.equal(r1.d, 18);
  assert.equal(ln('verticala', { x: 0, y: 40 }, { x: 6, y: 70 }, r1.d), -15);
  // Și prin funcția desenului: același d din cursorul aflat pe linia veche.
  assert.equal(r1.d, distantaDinCursor('verticala', { x: 0, y: 40 }, { x: 6, y: 70 }, { x: -15, y: 0 }));
});

test('lanțul aliniat: fiecare cotă nouă ține distanța primei (5), pe drumul ei', () => {
  const s0 = pornesteSerie('lant', 'aliniata', { x: 0, y: 0 }, { x: 30, y: 40 }, 5);
  assert.ok(s0);
  const r1 = cotaUrmatoare(s0, { x: 60, y: 40 }, 7);
  assert.ok(r1);
  assert.equal(r1.d, 5);
  assert.deepEqual(r1.stare.din, { x: 60, y: 40 });
  // Același punct: o aliniată de lungime zero nu se pune.
  assert.equal(cotaUrmatoare(r1.stare, { x: 60, y: 40 }, 7), null);
});

test('linia de bază orizontală: toate din (0, 0), liniile la y = 10, 17, 24 (pasul 7, spre partea primei linii)', () => {
  const s0 = pornesteSerie('baza', 'orizontala', { x: 0, y: 0 }, { x: 30, y: 0 }, 10);
  assert.ok(s0);
  assert.deepEqual(s0.din, { x: 0, y: 0 });
  const r1 = cotaUrmatoare(s0, { x: 50, y: 5 }, 7);
  assert.ok(r1);
  // Linia y = 17, puncte (0, 0) și (50, 5): d = 17 − 2,5 = 14,5.
  assert.equal(r1.d, 14.5);
  assert.deepEqual(r1.stare.din, { x: 0, y: 0 });
  assert.equal(r1.stare.k, 1);
  const r2 = cotaUrmatoare(r1.stare, { x: 80, y: -4 }, 7);
  assert.ok(r2);
  assert.equal(r2.d, 26);
  assert.equal(ln('orizontala', { x: 0, y: 0 }, { x: 80, y: -4 }, r2.d), 24);
  assert.equal(r2.stare.k, 2);
  // Același x ca baza: zero, nu se pune, iar numărătoarea rămâne.
  assert.equal(cotaUrmatoare(r2.stare, { x: 0, y: 30 }, 7), null);
});

test('linia de bază sub formă (d < 0): liniile coboară, la y = −10, −17; d = 0 urcă', () => {
  const s0 = pornesteSerie('baza', 'orizontala', { x: 0, y: 0 }, { x: 30, y: 0 }, -10);
  assert.ok(s0);
  const r1 = cotaUrmatoare(s0, { x: 50, y: 0 }, 7);
  assert.ok(r1);
  assert.equal(r1.d, -17);
  const z = pornesteSerie('baza', 'orizontala', { x: 0, y: 0 }, { x: 30, y: 0 }, 0);
  assert.ok(z);
  assert.equal(cotaUrmatoare(z, { x: 50, y: 0 }, 7)?.d, 7);
});

test('linia de bază verticală: linia a doua la x = −22 (mai departe spre stânga, ca prima la −15)', () => {
  const s0 = pornesteSerie('baza', 'verticala', { x: 0, y: 0 }, { x: 0, y: 40 }, 15);
  assert.ok(s0);
  const r1 = cotaUrmatoare(s0, { x: 0, y: 70 }, 7);
  assert.ok(r1);
  assert.equal(r1.d, 22);
  assert.equal(ln('verticala', { x: 0, y: 0 }, { x: 0, y: 70 }, r1.d), -22);
});

test('linia de bază aliniată: distanța crește cu pasul (5, 12, 19)', () => {
  const s0 = pornesteSerie('baza', 'aliniata', { x: 0, y: 0 }, { x: 30, y: 40 }, 5);
  assert.ok(s0);
  const r1 = cotaUrmatoare(s0, { x: 60, y: 0 }, 7);
  assert.ok(r1);
  assert.equal(r1.d, 12);
  const r2 = cotaUrmatoare(r1.stare, { x: 0, y: 80 }, 7);
  assert.equal(r2?.d, 19);
});

test('o aliniată între două puncte identice nu pornește o serie', () => {
  assert.equal(pornesteSerie('lant', 'aliniata', { x: 3, y: 4 }, { x: 3, y: 4 }, 5), null);
});

test('id-ul unei cote noi: „c” și primul număr după cele folosite; celelalte id-uri nu contează', () => {
  assert.equal(idCotaNou([]), 'c1');
  assert.equal(idCotaNou([{ id: 'c1', fel: 'aliniata' }, { id: 'c7', fel: 'raza' }, { id: 'x9', fel: 'unghi' }]), 'c8');
});
