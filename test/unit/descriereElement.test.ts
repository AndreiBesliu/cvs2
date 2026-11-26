/**
 * Numele unui element (bara de jos, lista, avertismentele, fereastra exportului, titlul dopului din vederea 3D), cu
 * numerele în formatul limbii (constatarea 14 a auditului exportului, felia 3.Av): în română cu virgula zecimală, în
 * engleză cu punct. Același număr de zecimale, același semn, fără gruparea miilor. Valorile sunt scrise pe hârtie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './limbi.ts';
import { schimbaLimba } from '../../src/i18n/t.ts';
import { descriere } from '../../src/app/descriereElement.ts';
import type { Matrice } from '../../src/geom/matrice.ts';
import type { ElementLume } from '../../src/model/lume.ts';

type Element = Pick<ElementLume, 'forma' | 'matrice'>;
const mutat = (x: number, y: number): Matrice => ({ a: 1, b: 0, c: 0, d: 1, e: x, f: y });

const dreptunghi: Element = { forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: mutat(20, 20) };
const cerc: Element = { forma: { tip: 'cerc', raza: 15 }, matrice: mutat(70.5, 1234.25) };
const cale: Element = {
  forma: {
    tip: 'cale', inchis: false,
    varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 30, y: 40 }, s: { tip: 'L' } }],
  },
  matrice: mutat(-5.5, 2),
};
const relief: Element = {
  forma: { tip: 'relief', nx: 200, ny: 100, celula: 0.5, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: 'c'.repeat(64) }] },
  matrice: mutat(10, 20),
};

test('în română, numele are virgula zecimală, cu două zecimale și semnul lor', () => {
  schimbaLimba('ro');
  assert.equal(descriere(dreptunghi), 'dreptunghi 100,00 × 60,00 la X 20,00, Y 20,00');
  assert.equal(descriere(cerc), 'cerc R15,00 cu centrul la X 70,50, Y 1234,25');
  assert.equal(descriere(cale), 'cale deschisă 30,00 × 40,00, 1 segment, la X -5,50, Y 2,00');
  assert.equal(descriere(relief), 'relief 100,00 × 50,00, celula 0,500 mm, la X 10,00, Y 20,00');
});

test('în engleză, numele rămâne cu punct', () => {
  schimbaLimba('en');
  assert.equal(descriere(dreptunghi), 'rectangle 100.00 × 60.00 at X 20.00, Y 20.00');
  assert.equal(descriere(cerc), 'circle R15.00 centred at X 70.50, Y 1234.25');
  assert.equal(descriere(cale), 'open path 30.00 × 40.00, 1 segment, at X -5.50, Y 2.00');
  assert.equal(descriere(relief), 'relief 100.00 × 50.00, 0.500 mm cells, at X 10.00, Y 20.00');
  schimbaLimba('ro');
});

test('numele urmează limba de acum, nu pe cea de la încărcarea modulului', () => {
  schimbaLimba('en');
  const inEngleza = descriere(dreptunghi);
  schimbaLimba('ro');
  assert.notEqual(descriere(dreptunghi), inEngleza);
  assert.match(descriere(dreptunghi), /^dreptunghi 100,00/);
});
