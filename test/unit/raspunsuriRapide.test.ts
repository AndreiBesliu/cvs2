import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aceleasiRapide, curataEticheta, ETICHETA_RAPID_MAX, esteVersiuneVazuta, listaRapideCeruta, problemeRapide, RAPIDE_MAX, rapideDin,
  TEXT_RAPID_MAX, textRapid,
} from '../../shared/raspunsuriRapide.ts';
import { RASPUNS_MAX } from '../../shared/tichete.ts';
import { EXEMPLE_RAPIDE } from '../../src/admin/setari/exemple.ts';

/**
 * Răspunsurile rapide ale tichetelor (ADR 0261), contractul comun adminului și serverului: eticheta, problemele fiecărui rând
 * (aceleași în editor și pe server), lista cerută (curățată sau refuzată), documentul citit, lista neschimbată, textul după
 * limba raportării; și exemplele schiței, care trec chiar ele de reguli.
 */

const r = (k: number, extra: Record<string, unknown> = {}) => ({ eticheta: `R${k}`, ro: `Textul ${k}.`, en: '', ...extra });

test('marginile: 12 răspunsuri, eticheta de 40 de litere, textul cât un răspuns', () => {
  assert.equal(RAPIDE_MAX, 12);
  assert.equal(ETICHETA_RAPID_MAX, 40);
  assert.equal(TEXT_RAPID_MAX, RASPUNS_MAX);
});

test('eticheta: un rând, spațiile strânse, 1–40 de litere (diacriticele, câte una), fără caractere de control', () => {
  assert.equal(curataEticheta('  Am primit,\n  ne uităm  '), 'Am primit, ne uităm');
  assert.equal(curataEticheta('ă'.repeat(40)), 'ă'.repeat(40));
  assert.equal(curataEticheta('ă'.repeat(41)), null);
  assert.equal(curataEticheta('   '), null);
  assert.equal(curataEticheta('clopoțel\u0007'), null);
  assert.equal(curataEticheta(7), null);
});

test('problemele fiecărui rând: eticheta lipsă, greșită sau la fel cu una de mai sus (fără diacritice și majuscule); textele', () => {
  assert.deepEqual(problemeRapide([r(1), r(2)]), [[], []]);
  assert.deepEqual(problemeRapide([r(1, { eticheta: ' ' }), r(2, { eticheta: 'x'.repeat(41) })]), [['eticheta-lipsa'], ['eticheta-invalida']]);
  // „Sigur” și „ȘIGUR” s-ar confunda pe buton: al doilea e dublura; primul rămâne bun.
  assert.deepEqual(problemeRapide([r(1, { eticheta: 'Sigur' }), r(2, { eticheta: 'ȘIGUR' }), r(3, { eticheta: ' sigur ' })]), [[], ['eticheta-dubla'], ['eticheta-dubla']]);
  assert.deepEqual(problemeRapide([r(1, { ro: '  ' }), r(2, { ro: 'a\u0000b' }), r(3, { ro: 'y'.repeat(RASPUNS_MAX + 1) })]), [['ro-lipsa'], ['ro-invalid'], ['ro-invalid']]);
  assert.deepEqual(problemeRapide([r(1, { en: '   ' }), r(2, { en: 'a\u0001' }), r(3, { en: 'z'.repeat(RASPUNS_MAX + 1) })]), [[], ['en-invalid'], ['en-invalid']]);
  assert.deepEqual(problemeRapide([{ eticheta: 3, ro: null }]), [['eticheta-lipsa', 'ro-lipsa']]);
});

test('lista cerută: curățată (eticheta strânsă, rândurile textului, engleza goală = ""); refuzată la orice problemă', () => {
  assert.deepEqual(listaRapideCeruta([{ eticheta: '  A   b ', ro: ' Unu.\r\nDoi. ', en: '  ' }]), [{ eticheta: 'A b', ro: 'Unu.\nDoi.', en: '' }]);
  assert.deepEqual(listaRapideCeruta([{ eticheta: 'Fără engleză', ro: 'Text.' }]), [{ eticheta: 'Fără engleză', ro: 'Text.', en: '' }]);
  assert.deepEqual(listaRapideCeruta([]), []);
  assert.equal(listaRapideCeruta(Array.from({ length: RAPIDE_MAX }, (_, k) => r(k)))?.length, RAPIDE_MAX);
  for (const rau of ['x', null, { 0: r(1) }, [null], [r(1), 'x'], Array.from({ length: RAPIDE_MAX + 1 }, (_, k) => r(k)), [r(1), r(2, { eticheta: 'r1' })],
    [r(1, { ro: '' })], [r(1, { en: 'a\u0002' })]]) {
    assert.equal(listaRapideCeruta(rau), null, JSON.stringify(rau).slice(0, 60));
  }
});

test('documentul citit: rândurile stricate lipsesc, restul rămân; fără document sau fără versiune bună, versiunea 0', () => {
  assert.deepEqual(rapideDin(undefined), { lista: [], versiune: 0 });
  assert.deepEqual(rapideDin({ lista: 'x', versiune: 'doi' }), { lista: [], versiune: 0 });
  assert.deepEqual(rapideDin({ lista: [r(1), null, r(2, { ro: '' }), 'x', r(3)], versiune: 4 }), {
    lista: [{ eticheta: 'R1', ro: 'Textul 1.', en: '' }, { eticheta: 'R3', ro: 'Textul 3.', en: '' }], versiune: 4,
  });
  assert.equal(rapideDin({ lista: [], versiune: 0 }).versiune, 0);
  assert.equal(rapideDin({ lista: [], versiune: 2.5 }).versiune, 0);
});

test('versiunea văzută: un întreg de la 0 (0 = niciun document încă)', () => {
  for (const v of [0, 1, 99]) assert.equal(esteVersiuneVazuta(v), true, String(v));
  for (const v of [-1, 1.5, '0', null, undefined, Number.NaN]) assert.equal(esteVersiuneVazuta(v), false, String(v));
});

test('lista neschimbată: aceleași rânduri, în aceeași ordine', () => {
  const a = [r(1), r(2, { en: 'Two.' })];
  assert.equal(aceleasiRapide(a, a.map((x) => ({ ...x }))), true);
  assert.equal(aceleasiRapide(a, [a[1]!, a[0]!]), false);
  assert.equal(aceleasiRapide(a, [a[0]!]), false);
  assert.equal(aceleasiRapide(a, [a[0]!, { ...a[1]!, en: 'Two!' }]), false);
  assert.equal(aceleasiRapide([], []), true);
});

test('textul după limba raportării: engleza doar dacă e scrisă; altfel, și pentru o limbă necunoscută, româna', () => {
  const cu = { eticheta: 'A', ro: 'Română.', en: 'English.' };
  const fara = { eticheta: 'B', ro: 'Doar română.', en: '' };
  assert.equal(textRapid(cu, 'en'), 'English.');
  assert.equal(textRapid(cu, 'ro'), 'Română.');
  assert.equal(textRapid(cu, null), 'Română.');
  assert.equal(textRapid(cu, 'de'), 'Română.');
  assert.equal(textRapid(fara, 'en'), 'Doar română.');
});

test('exemplele din schiță trec chiar ele de reguli (se pot salva așa cum sunt puse în câmpuri)', () => {
  assert.equal(EXEMPLE_RAPIDE.length, 3);
  assert.deepEqual(listaRapideCeruta(EXEMPLE_RAPIDE), EXEMPLE_RAPIDE);
  assert.ok(EXEMPLE_RAPIDE.every((x) => x.en !== ''));
});
