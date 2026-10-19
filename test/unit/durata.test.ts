import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../../src/i18n/traseu.ts';
import { durata } from '../../src/ui/durata.ts';

/**
 * Durata în cuvinte (ADR 0046 §5, §8): o singură funcție pentru rezumatul exportului și cipul traseului. Sub un minut cu o
 * zecimală, apoi minute și secunde, apoi ore și minute; pragurile cad unde rotunjirea ar scrie „60”.
 */

test('sub un minut: o zecimală, cu virgula în română și punctul în engleză', () => {
  assert.equal(durata(0, 'ro'), '0,0 s');
  assert.equal(durata(52.64, 'ro'), '52,6 s');
  assert.equal(durata(52.64, 'en'), '52.6 s');
  assert.equal(durata(59.94, 'ro'), '59,9 s');
});

test('de la 59,95 s: minute și secunde (nu „60,0 s”), cu secundele pe două cifre', () => {
  assert.equal(durata(59.95, 'ro'), '1 min 00 s');
  assert.equal(durata(95.4, 'ro'), '1 min 35 s');
  assert.equal(durata(623.44, 'en'), '10 min 23 s');
  assert.equal(durata(3599.4, 'ro'), '59 min 59 s');
});

test('de la 3 599,5 s: ore și minute (nu „60 min 00 s”)', () => {
  assert.equal(durata(3599.5, 'ro'), '1 h 00 min');
  assert.equal(durata(3600 + 29 * 60 + 29, 'ro'), '1 h 29 min');
  assert.equal(durata(3600 + 29 * 60 + 30, 'en'), '1 h 30 min');
  assert.equal(durata(10 * 3600, 'ro'), '10 h 00 min');
});
