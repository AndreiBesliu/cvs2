/**
 * Refuzurile calculului pe înțeles (ADR 0291, felia 28.8↑j; constatarea 7 a auditului ferestrei exportului), pe hârtie
 * (`motivPeInteles`):
 * - id-urile din lume („e2/c1”) devin numele elementelor, ca în listă; un id necunoscut și „mm/min” rămân cum sunt;
 * - în română, numerele scrise cu punct de lucrare („1.000 mm”, „X 24.0”) primesc virgula; numele puse în loc rămân cum le scrie
 *   lista;
 * - cheia primei operații numite, în ordinea textului, pentru „Du-mă la …”.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motivPeInteles } from '../../src/ui/motivCalcul.ts';

const DESCRIERI = new Map([
  ['e2/c1', 'dreptunghi 10.00 × 10.00 la X 10.00, Y 10.00'],
  ['e3/c2', 'cerc R7.00 cu centrul la X 58.00, Y 154.00'],
]);
const OPERATII = new Map([['e3/c2', 'p3/o'], ['e2/c1', 'p2/o']]);

test('id-urile devin numele elementelor; numerele lucrării, cu virgula; cheia primei operații numite', () => {
  const m = 'regiunea păstrată: tăietura lui e2/c1 intră în piesa e3/c2 cu 1.000 mm (lângă X 24.0, Y 195.0)';
  assert.deepEqual(motivPeInteles(m, DESCRIERI, OPERATII, true), {
    text: 'regiunea păstrată: tăietura lui dreptunghi 10.00 × 10.00 la X 10.00, Y 10.00 intră în piesa cerc R7.00 cu centrul la X 58.00, Y 154.00 '
      + 'cu 1,000 mm (lângă X 24,0, Y 195,0)',
    cheie: 'p2/o',
  });
});

test('în engleză, numerele rămân cu punct', () => {
  const m = 'e2/c1: cercul de Ø30.5 nu se poate găuri';
  assert.deepEqual(motivPeInteles(m, DESCRIERI, OPERATII, false), {
    text: 'dreptunghi 10.00 × 10.00 la X 10.00, Y 10.00: cercul de Ø30.5 nu se poate găuri', cheie: 'p2/o',
  });
});

test('un id necunoscut, „mm/min” și textul fără id-uri rămân; fără operație numită, fără cheie', () => {
  assert.deepEqual(motivPeInteles('avansul 1000 mm/min la x9/y9', DESCRIERI, OPERATII, true), { text: 'avansul 1000 mm/min la x9/y9', cheie: null });
  // Un element fără operație pe rând: numele lui, iar cheia e a următorului care are una.
  const doarNume = new Map([['e9/c9', 'linia 5.00 mm'], ...DESCRIERI]);
  assert.deepEqual(motivPeInteles('e9/c9 și e3/c2 se ating', doarNume, OPERATII, true), {
    text: 'linia 5.00 mm și cerc R7.00 cu centrul la X 58.00, Y 154.00 se ating', cheie: 'p3/o',
  });
});
