/**
 * Mărimea unui pachet sau a datelor unei extensii, pe înțeles (ADR 0231 §B.5): „sub 1 kB”, kB întregi până la 1 MB, apoi MB
 * cu o zecimală. „1.616,3 kB” și „0 kB” pentru câțiva octeți nu spun nimic unui om.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marime } from '../../src/extensii/marime.ts';

test('mărimea pe înțeles: nimic, sub 1 kB, kB întregi, MB cu o zecimală', () => {
  assert.deepEqual(marime(0), { fel: 'zero' });
  assert.deepEqual(marime(1), { fel: 'sub-kb' });
  assert.deepEqual(marime(1023), { fel: 'sub-kb' });
  assert.deepEqual(marime(1024), { fel: 'kb', n: 1 });
  assert.deepEqual(marime(1536), { fel: 'kb', n: 2 });
  assert.deepEqual(marime(468_326), { fel: 'kb', n: 457 }, 'pachetul lui Easy 3Draw');
  assert.deepEqual(marime(1024 * 1024), { fel: 'mb', n: 1 });
  assert.deepEqual(marime(1_655_091), { fel: 'mb', n: 1.6 });
  assert.deepEqual(marime(16 * 1024 * 1024), { fel: 'mb', n: 16 });
});

test('marginea dintre kB și MB: niciodată „1024 kB”', () => {
  assert.deepEqual(marime(1024 * 1024 - 1), { fel: 'mb', n: 1 });
  assert.deepEqual(marime(1023.4 * 1024), { fel: 'kb', n: 1023 });
  assert.deepEqual(marime(1023.5 * 1024), { fel: 'mb', n: 1 });
});

test('o valoare care nu e o mărime (negativă, NaN) e nimic, nu un text ciudat', () => {
  assert.deepEqual(marime(-5), { fel: 'zero' });
  assert.deepEqual(marime(Number.NaN), { fel: 'zero' });
});
