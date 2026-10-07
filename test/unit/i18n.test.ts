import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../../src/i18n/mesaje.en.ts';
import { ro, type DictionarRo } from '../../src/i18n/mesaje.ro.ts';
import { limbaDePornire, traduce } from '../../src/i18n/t.ts';

/*
 * Controalele negative ale parității, la compilare. Dacă tipul `DictionarRo` ar înceta să refuze una dintre greșelile
 * de mai jos, directiva `@ts-expect-error` ar rămâne nefolosită, iar `tsc` ar pica. Plasa nu poate fi vidă în tăcere.
 */
const { 'app.titlu': _scoasa, ...faraOCheie } = ro;
// @ts-expect-error — lipsește o cheie
const lipsaOCheie: DictionarRo = faraOCheie;
// @ts-expect-error — o cheie în plus
const cuOCheieInPlus = { ...ro, 'cheie.inventata': 'x' } satisfies DictionarRo;
// @ts-expect-error — pluralul românesc fără forma `few`
const pluralFaraFew = { ...ro, 'jurnal.intrari': { one: 'x', other: 'y' } } satisfies DictionarRo;
// @ts-expect-error — text acolo unde engleza are plural
const textInLocDePlural = { ...ro, 'jurnal.intrari': 'x' } satisfies DictionarRo;
void [lipsaOCheie, cuOCheieInPlus, pluralFaraFew, textInLocDePlural];

test('ro și en au exact aceleași chei, și la rulare', () => {
  assert.deepEqual(Object.keys(ro).sort(), Object.keys(en).sort());
});

test('pluralul românesc: one, few, other, după regulile CLDR', () => {
  const r = (n: number) => traduce('ro', 'jurnal.intrari', { n });
  assert.equal(r(0), '0 erori în jurnalul local');
  assert.equal(r(1), '1 eroare în jurnalul local');
  assert.equal(r(2), '2 erori în jurnalul local');
  assert.equal(r(19), '19 erori în jurnalul local');
  assert.equal(r(20), '20 de erori în jurnalul local');
  assert.equal(r(101), '101 erori în jurnalul local');
  assert.equal(r(120), '120 de erori în jurnalul local');
});

test('pluralul englezesc: one și other', () => {
  assert.equal(traduce('en', 'jurnal.intrari', { n: 1 }), '1 error in the local log');
  assert.equal(traduce('en', 'jurnal.intrari', { n: 0 }), '0 errors in the local log');
  assert.equal(traduce('en', 'jurnal.intrari', { n: 2 }), '2 errors in the local log');
});

test('locurile {param} se completează, iar unul fără valoare rămâne vizibil', () => {
  assert.equal(traduce('ro', 'app.instanta', { nume: 'test' }), 'Instanța: test');
  assert.equal(traduce('ro', 'app.instanta'), 'Instanța: {nume}');
});

test('un mesaj plural cerut fără n e o eroare, nu un text greșit', () => {
  assert.throws(() => traduce('ro', 'jurnal.intrari'), /cere parametrul n/);
});

test('limba de pornire: alegerea salvată, apoi browserul, apoi româna', () => {
  assert.equal(limbaDePornire('en', ['ro-RO']), 'en');
  assert.equal(limbaDePornire(null, ['ro-RO', 'en-US']), 'ro');
  assert.equal(limbaDePornire(null, ['en-GB']), 'en');
  assert.equal(limbaDePornire(null, ['de-DE', 'en-US']), 'en');
  assert.equal(limbaDePornire(null, ['de-DE']), 'ro');
  assert.equal(limbaDePornire('fr', []), 'ro');
});
