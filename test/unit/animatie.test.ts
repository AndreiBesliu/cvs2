/**
 * Animația traseului (ADR 0099), modelul pur (`src/sim/animatie.ts`): cronologia mișcărilor programului, cu timpul fiecăreia
 * (dat), poziția frezei la orice moment, pașii înainte / înapoi și drumul parcurs între două momente, ca linii frânte (arcele
 * cu toleranța dată). Valorile sunt pe hârtie: un program mic, cu o deplasare, coborârea, o tăiere, un arc în elice, o pauză,
 * o schimbare de sculă și finalul.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cronologie, inainte, inapoi, parcursIntre, stareLa, type Cronologie } from '../../src/sim/animatie.ts';
import type { Miscare, Program, Scula } from '../../src/ir/ir.ts';

const T1: Scula = { numar: 1, nume: 'Freza 6', diametru: 6 };
const T2: Scula = { numar: 2, nume: 'Freza 3', diametru: 3 };
const MISCARI: Miscare[] = [
  { tip: 'eticheta', text: 'profil exterior', element: 'e1', operatie: 'p1/o1' },
  { tip: 'rapida', la: { X: 10, Y: 0 } },
  { tip: 'rapida', la: { Z: 1 } },
  { tip: 'taiere', la: { Z: -2 }, avans: 300 },
  { tip: 'taiere', la: { X: 20 }, avans: 1000 },
  // Un semicerc în elice: de la (20, 0) la (20, 20), în jurul lui (20, 10), trigonometric (prin (30, 10)), Z de la -2 la -3.
  { tip: 'arc', la: { X: 20, Y: 20, Z: -3 }, centru: { x: 20, y: 10 }, sens: 'trigonometric', avans: 1000 },
  { tip: 'pauza', secunde: 1 },
  { tip: 'schimba-scula', scula: T2, turatie: 18000 },
  { tip: 'rapida', la: { X: 0, Y: 0 } },
];
const PROGRAM: Program = { axe: ['X', 'Y', 'Z'], scula: T1, turatie: 18000, zSigur: 5, miscari: MISCARI };
/** Timpul fiecărei mișcări (pe hârtie): eticheta 0; schimbarea sculei 0,5 s (urcarea la Z sigur și pauza axului). */
const TIMPI = { pregatire: 2, miscari: [0, 1, 0.5, 0.6, 0.6, 2, 1, 0.5, 1], final: 0.5 };
const c: Cronologie = cronologie(PROGRAM, TIMPI);

const aproape = (a: number, b: number, eps = 1e-9): void => { assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`); };
const punct = (t: number, x: number, y: number, z: number): void => {
  const s = stareLa(c, t);
  aproape(s.x, x);
  aproape(s.y, y);
  aproape(s.z, z);
};

test('durata: pregătirea, mișcările și finalul', () => {
  aproape(c.durata, 2 + 1 + 0.5 + 0.6 + 0.6 + 2 + 1 + 0.5 + 1 + 0.5);
});

test('poziția: în pregătire la zeroul programului, la Z sigur; apoi pe fiecare mișcare, liniar în timp', () => {
  punct(0, 0, 0, 5);
  punct(1.9, 0, 0, 5);
  punct(2.5, 5, 0, 5);
  punct(3.25, 10, 0, 3);
  punct(3.8, 10, 0, -0.5);
  punct(4.4, 15, 0, -2);
});

test('arcul în elice: la jumătatea timpului, la jumătatea unghiului (30, 10) și a coborârii', () => {
  punct(4.7 + 1, 30, 10, -2.5);
  // La un sfert: unghiul -90° + 45°.
  punct(4.7 + 0.5, 20 + 10 * Math.cos(-Math.PI / 4), 10 + 10 * Math.sin(-Math.PI / 4), -2.25);
});

test('pauza ține freza pe loc; schimbarea sculei urcă la Z sigur și montează scula nouă', () => {
  punct(7.2, 20, 20, -3);
  punct(7.7 + 0.25, 20, 20, 1);
  punct(8.2, 20, 20, 5);
  assert.equal(stareLa(c, 7).scula.numar, 1);
  assert.equal(stareLa(c, 8.5).scula.numar, 2);
  assert.equal(stareLa(c, 8.5).scula.diametru, 3);
});

test('deplasarea de după schimbare, apoi finalul: urcarea la Z sigur; după durată, ultima poziție', () => {
  punct(8.7, 10, 10, 5);
  punct(9.2 + 0.25, 0, 0, 5);
  punct(c.durata, 0, 0, 5);
  punct(c.durata + 10, 0, 0, 5);
});

test('starea spune felul mișcării, avansul, eticheta și pasul (de la 1), din câți', () => {
  const s = stareLa(c, 4.4);
  assert.equal(s.tip, 'taiere');
  assert.equal(s.avans, 1000);
  assert.equal(s.eticheta, 'profil exterior');
  assert.equal(s.miscare, 4);
  assert.equal(s.pas, 4);
  assert.equal(c.pasi.length, 9);
  assert.equal(stareLa(c, 1).pas, 0, 'în pregătire, niciun pas');
  assert.equal(stareLa(c, 2).pas, 0, 'sfârșitul pregătirii e al ei');
  assert.equal(stareLa(c, 3).pas, 1, 'sfârșitul pasului e al lui: „Pasul următor” arată pasul parcurs');
  assert.equal(stareLa(c, 3 + 1e-6).pas, 2);
  // Un final fără timp (programul se termină la Z sigur): la capăt tot finalul se arată, nu ultima mișcare.
  const faraFinal = cronologie(PROGRAM, { ...TIMPI, final: 0 });
  assert.equal(stareLa(faraFinal, faraFinal.durata).tip, 'final');
  assert.equal(stareLa(faraFinal, faraFinal.durata - 1e-6).tip, 'rapida');
  assert.equal(stareLa(c, 1).tip, 'pregatire');
  assert.equal(stareLa(c, 2.5).tip, 'rapida');
  assert.equal(stareLa(c, 2.5).avans, null);
  assert.equal(stareLa(c, 5).tip, 'arc');
  assert.equal(stareLa(c, 7.2).tip, 'pauza');
  assert.equal(stareLa(c, 9.4).tip, 'final');
});

test('pas cu pas: înainte, la sfârșitul pasului următor; înapoi, la sfârșitul celui dinainte; la capete, se oprește', () => {
  aproape(inainte(c, 0), 3);
  aproape(inainte(c, 2.5), 3);
  aproape(inainte(c, 3), 3.5);
  aproape(inainte(c, 9.2), c.durata);
  aproape(inainte(c, c.durata), c.durata);
  aproape(inapoi(c, 3.5), 3);
  aproape(inapoi(c, 3.2), 3);
  aproape(inapoi(c, 3), 0);
  aproape(inapoi(c, 0), 0);
});

test('drumul parcurs: deplasările și tăierile, ca linii frânte separate; mișcările doar pe Z nu se văd', () => {
  const d = parcursIntre(c, 0, 4.4, 0.01);
  assert.deepEqual(d.map((l) => ({ rapid: l.rapid, puncte: [...l.puncte].map((v) => Math.round(v * 1e9) / 1e9) })), [
    { rapid: true, puncte: [0, 0, 10, 0] },
    { rapid: false, puncte: [10, 0, 15, 0] },
  ]);
  assert.deepEqual(parcursIntre(c, 2.25, 2.25, 0.01), [], 'un interval gol');
});

test('arcul parcurs: toate punctele pe cerc, coarda nu se abate peste toleranță, capetele exacte', () => {
  const [l, ...rest] = parcursIntre(c, 4.7, 6.7, 0.01);
  assert.ok(l && rest.length === 0);
  assert.equal(l.rapid, false);
  const p = [...l.puncte];
  aproape(p[0] ?? NaN, 20);
  aproape(p[1] ?? NaN, 0);
  aproape(p.at(-2) ?? NaN, 20);
  aproape(p.at(-1) ?? NaN, 20);
  for (let i = 0; i + 3 < p.length; i += 2) {
    const [x0, y0, x1, y1] = [p[i] as number, p[i + 1] as number, p[i + 2] as number, p[i + 3] as number];
    aproape(Math.hypot(x0 - 20, y0 - 10), 10);
    // Săgeata coardei: distanța de la centru la mijlocul ei e cel puțin raza minus toleranța.
    assert.ok(Math.hypot((x0 + x1) / 2 - 20, (y0 + y1) / 2 - 10) >= 10 - 0.01 - 1e-12);
  }
  // Prin (30, 10): spre dreapta, adică trigonometric de la -90°.
  assert.ok(Math.max(...p.filter((_, i) => i % 2 === 0)) > 29.99);
});

test('o parte dintr-un pas: drumul se oprește exact unde e freza', () => {
  const [l] = parcursIntre(c, 4.1, 4.4, 0.01);
  assert.deepEqual([...(l?.puncte ?? [])].map((v) => Math.round(v * 1e9) / 1e9), [10, 0, 15, 0]);
  const [r] = parcursIntre(c, 8.7, 9.2, 0.01);
  assert.deepEqual([...(r?.puncte ?? [])].map((v) => Math.round(v * 1e9) / 1e9), [10, 10, 0, 0]);
});

test('timpi lipsă sau răi: aceeași lungime ca mișcările, numere finite, nenegative; altfel aruncă', () => {
  assert.throws(() => cronologie(PROGRAM, { ...TIMPI, miscari: TIMPI.miscari.slice(1) }), /mișcări/);
  assert.throws(() => cronologie(PROGRAM, { ...TIMPI, miscari: TIMPI.miscari.map((v, i) => (i === 3 ? -1 : v)) }), /timp/);
  assert.throws(() => cronologie(PROGRAM, { ...TIMPI, pregatire: Number.NaN }), /timp/);
});
