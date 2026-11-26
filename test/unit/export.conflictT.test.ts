/**
 * „Dă-i T{n}” (ADR 0291 §2a, felia 28.8↑j; constatarea 5 a auditului ferestrei exportului), pe hârtie:
 *
 * - **identitatea frezei** (`cheieFreza`): diametrul, apoi unghiul V cu vârful plat, apoi bila; aceeași freză are aceeași cheie;
 * - **numărul nou** (`numarDupaConflict`), regula rolurilor (`numarPentruRand`, ADR 0114 §5) fără numărul ciocnit: al unei
 *   freze identice, cât pe numărul ei stau doar freze identice; altfel cel mai mic liber, printre toate frezele ferestrei
 *   (și ale finisărilor reliefului, care nu se schimbă de aici); fără număr liber, nimic;
 * - **scrierea pe rând** (`cuNumarT`): doar numărul locului, cu originea și diametrul neschimbate.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MARGINI_OPERATIE } from '../../src/ui/actiuniExportTipuri.ts';
import { cheieFreza, cuNumarT, numarDupaConflict, type FrezaT } from '../../src/ui/exportRand.ts';

const f = (numar: number, cheie: string): FrezaT => ({ numar, cheie });

test('identitatea frezei: diametrul, unghiul V și vârful plat, bila; valorile exacte', () => {
  assert.equal(cheieFreza(6, null, null), '6');
  assert.equal(cheieFreza(6, 60, null), '6 V60');
  assert.equal(cheieFreza(6, 60, 0.2), '6 V60 t0.2');
  // Vârful 0 e vârful ascuțit (ADR 0092).
  assert.equal(cheieFreza(6, 60, 0), '6 V60');
  assert.equal(cheieFreza(6, null, null, true), '6 bila');
  assert.notEqual(cheieFreza(3.175, null, null), cheieFreza(3.17, null, null));
});

test('numărul nou: cel mai mic liber, printre toate frezele ferestrei', () => {
  // Captura din audit: V60 Ø6 pe T1 lângă o plată Ø6 pe T1, cu fundul plat pe T2. V-ul ia T3.
  assert.equal(numarDupaConflict([f(1, '6'), f(2, '3.175')], f(1, '6 V60')), 3);
  // Și plata ia T3 (T2 e al fundului plat).
  assert.equal(numarDupaConflict([f(1, '6 V60'), f(2, '3.175')], f(1, '6')), 3);
  // Un număr al unei finisări a reliefului e luat, deși nu se schimbă de aici.
  assert.equal(numarDupaConflict([f(1, '6'), f(2, '6 bila')], f(1, '6 V60')), 3);
});

test('numărul nou: al unei freze identice, cât pe numărul ei stau doar freze identice', () => {
  // Aceeași V60 Ø6 e deja pe T4: freza ciocnită o ajunge acolo, nu pe un număr nou.
  assert.equal(numarDupaConflict([f(1, '6'), f(4, '6 V60')], f(1, '6 V60')), 4);
  // Pe T4 stă și o altă freză: T4 e ciocnit și el, deci nu e o ieșire; cel mai mic liber.
  assert.equal(numarDupaConflict([f(1, '6'), f(4, '6 V60'), f(4, '3')], f(1, '6 V60')), 2);
  // O freză identică pe numărul ciocnit nu-i dă numărul înapoi: trei plate pe T1 cu o V pe T1; plata ia T2.
  assert.equal(numarDupaConflict([f(1, '6'), f(1, '6'), f(1, '6 V60')], f(1, '6')), 2);
});

test('numărul nou: niciodată numărul ciocnit; fără număr liber, nimic', () => {
  const toate = Array.from({ length: MARGINI_OPERATIE.numarScula }, (_, k) => f(k + 1, `${String(k + 1)}`));
  assert.equal(numarDupaConflict([...toate, f(1, '9 V90')], f(1, '1')), null);
  // Cu o freză liberă la capăt: ultimul număr.
  const fara = toate.slice(0, -1);
  assert.equal(numarDupaConflict([...fara, f(1, '9 V90')], f(1, '1')), MARGINI_OPERATIE.numarScula);
});

test('scrierea pe rând: doar numărul locului, cu originea neschimbată', () => {
  const rest = [{ numar: '1', diametru: '6', pas: '2', origine: null }, { numar: '1', diametru: '3', pas: '1', origine: null }];
  const p = {
    numarScula: '1', diametruScula: '6', numarSculaFund: '2', numarSculaDop: '1', numarSculaBanda: '1', rest, restFund: rest, restDop: rest,
  } as unknown as Parameters<typeof cuNumarT>[0];
  assert.deepEqual(cuNumarT(p, 'scula', 3, String), { numarScula: '3' });
  assert.deepEqual(cuNumarT(p, 'fund', 3, String), { numarSculaFund: '3' });
  assert.deepEqual(cuNumarT(p, 'dop', 3, String), { numarSculaDop: '3' });
  assert.deepEqual(cuNumarT(p, 'banda', 3, String), { numarSculaBanda: '3' });
  assert.deepEqual(cuNumarT(p, { rest: 'buzunar', k: 1 }, 3, String), { rest: [rest[0], { ...rest[1], numar: '3' }] });
  assert.deepEqual(cuNumarT(p, { rest: 'fund', k: 0 }, 3, String), { restFund: [{ ...rest[0], numar: '3' }, rest[1]] });
  // Un loc care nu e pe rând nu schimbă nimic.
  assert.deepEqual(cuNumarT(p, { rest: 'dop', k: 5 }, 3, String), {});
});
