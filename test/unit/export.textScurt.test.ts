/**
 * Textele lungi ale ferestrei exportului (ADR 0291, felia 28.8↑k; constatarea 21 a auditului), pe hârtie (`scurtat`): peste
 * `PRAG_TEXT_LUNG` caractere, prima propoziție rămâne la vedere și restul trece sub „Mai mult”. O propoziție se termină cu un
 * punct urmat de spațiu și de o literă mare, o paranteză sau ghilimele; numerele („0,5”, „3.175”) și numele de fișier („…-dop-1.nc”)
 * nu taie textul. Un text scurt sau dintr-o singură propoziție rămâne întreg.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRAG_TEXT_LUNG, scurtat } from '../../src/ui/exportRand.ts';
import { roExport } from '../../src/i18n/export.ro.ts';
import { enExport } from '../../src/i18n/export.en.ts';

test('un text scurt rămâne întreg, chiar cu mai multe propoziții', () => {
  const s = 'Prima. A doua.';
  assert.ok(s.length <= PRAG_TEXT_LUNG);
  assert.deepEqual(scurtat(s), { prima: s, rest: '' });
});

test('un text lung: prima propoziție, apoi restul, fără spațiul dintre ele', () => {
  const prima = 'Dopul iese într-un fișier al lui (…-dop-1.nc), cu desenul oglindit, pe semifabricatul lui: XY0 în colțul ales, Z0 pe fața lui.';
  const rest = 'Fața semifabricatului se coboară cu freza dreaptă (fundul plat), iar pereții dopului îi taie freza în V.';
  assert.ok(`${prima} ${rest}`.length > PRAG_TEXT_LUNG);
  assert.deepEqual(scurtat(`${prima} ${rest}`), { prima, rest });
});

test('numerele și numele de fișier nu taie textul; o propoziție lungă fără alta după ea rămâne întreagă', () => {
  const rest = `Freza de Ø3.175 mm intră prin ${'foaie, '.repeat(20)}până jos.`;
  // „0,5.” urmat de spațiu și de o literă mare e un sfârșit de propoziție; „3.175” nu.
  assert.deepEqual(scurtat(`Cu supracursa 0,5. ${rest}`), { prima: 'Cu supracursa 0,5.', rest });
  // Un punct urmat de o literă mică nu încheie propoziția („etc. și”).
  const etc = `Freza dreaptă, freza în V etc. și ${'încă ceva, '.repeat(14)}la capăt. Apoi restul.`;
  assert.deepEqual(scurtat(etc), { prima: etc.slice(0, -' Apoi restul.'.length), rest: 'Apoi restul.' });
  const una = `Ø3.175 mm, ${'și încă o bucată, '.repeat(12)}la capăt.`;
  assert.ok(una.length > PRAG_TEXT_LUNG);
  assert.deepEqual(scurtat(una), { prima: una, rest: '' });
});

test('ghilimelele și paranteza încep o propoziție nouă', () => {
  const prima = `Primul rând ${'lung '.repeat(30)}aici.`;
  assert.deepEqual(scurtat(`${prima} „Al doilea”.`), { prima, rest: '„Al doilea”.' });
  assert.deepEqual(scurtat(`${prima} (Al treilea.)`), { prima, rest: '(Al treilea.)' });
});

test('textele lungi ale ferestrei, în ambele limbi, se taie după prima propoziție', () => {
  for (const d of [roExport, enExport]) {
    for (const cheie of ['export.incrustatie-drept.treapta.titlu', 'export.ordine.nota.automata', 'export.incrustatie.nota'] as const) {
      const text = d[cheie];
      const { prima, rest } = scurtat(text);
      assert.ok(text.length > PRAG_TEXT_LUNG, cheie);
      assert.ok(rest !== '' && prima.endsWith('.') && `${prima} ${rest}` === text, `${cheie}: ${prima}`);
    }
  }
});
