import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tichetDin, type Tichet } from '../../src/admin/tichete/date.ts';
import { eroriSesiune, numereFiltru, stareDupaRaspuns, titluTichet, TITLU_MAX } from '../../src/admin/tichete/vedere.ts';
import type { RandGrup } from '../../src/admin/erori/date.ts';

/**
 * Felia A.3 a adminului reproiectat (ADR 0260 §3), partea pură a filei Tichete: titlul tichetului din text, numerele
 * filtrului, starea pusă de „Răspunde și …” și erorile din sesiune cu grupurile lor citite.
 */

test('titlul: primul rând cu text, cu spațiile strânse; un text gol dă un titlu gol', () => {
  assert.equal(titluTichet('Exportul se oprește la 40 %'), 'Exportul se oprește la 40 %');
  assert.equal(titluTichet('\n\n   Grila   ar trebui \t mai groasă  \r\nsă se vadă mai bine.'), 'Grila ar trebui mai groasă');
  assert.equal(titluTichet(''), '');
  assert.equal(titluTichet(' \n \t\n'), '');
});

test('titlul lung: tăiat la ultimul cuvânt întreg, cu „…”; un cuvânt prea lung, tăiat în el; literele din afara BMP întregi', () => {
  const cuvinte = 'Am un proiect cu trei foi și când apăs Exportă G-code bara merge până la patruzeci la sută și apoi stă pe loc';
  const titlu = titluTichet(cuvinte);
  assert.ok(Array.from(titlu).length <= TITLU_MAX + 1, titlu);
  assert.ok(titlu.endsWith('…'));
  assert.ok(cuvinte.startsWith(titlu.slice(0, -1)), titlu);
  assert.equal(titlu.slice(0, -1), titlu.slice(0, -1).trimEnd());
  assert.ok(cuvinte.charAt(titlu.length - 1) === ' ', 'tăiat înaintea unui spațiu, deci la un cuvânt întreg');
  // Fără spațiu în prima jumătate: tăiat exact la plafon.
  assert.equal(titluTichet('x'.repeat(200)), `${'x'.repeat(TITLU_MAX)}…`);
  // Exact la plafon: neatins.
  assert.equal(titluTichet('y'.repeat(TITLU_MAX)), 'y'.repeat(TITLU_MAX));
  // Emoji (doi „code units”): se numără ca o literă și nu se rupe la jumătate.
  const emoji = '🔧'.repeat(TITLU_MAX + 5);
  assert.equal(titluTichet(emoji), `${'🔧'.repeat(TITLU_MAX)}…`);
});

const tichet = (id: string, stare: unknown): Tichet => tichetDin(id, { stare, text: id, versiune: 1 });

test('numerele filtrului: „Toate” le numără pe toate (și o stare necunoscută), fiecare stare pe ale ei', () => {
  const l = [tichet('a', 'nou'), tichet('b', 'nou'), tichet('c', 'deschis'), tichet('d', 'rezolvat'), tichet('e', 'altceva')];
  assert.deepEqual(numereFiltru(l), { toate: 5, nou: 2, deschis: 1, rezolvat: 1 });
  assert.deepEqual(numereFiltru([]), { toate: 0, nou: 0, deschis: 0, rezolvat: 0 });
});

test('„Răspunde și …”: un tichet nou sau deschis se rezolvă, unul rezolvat se redeschide; o stare necunoscută n-are butonul', () => {
  assert.equal(stareDupaRaspuns('nou'), 'rezolvat');
  assert.equal(stareDupaRaspuns('deschis'), 'rezolvat');
  assert.equal(stareDupaRaspuns('rezolvat'), 'deschis');
  assert.equal(stareDupaRaspuns(null), null);
});

const grup = (id: string): RandGrup => ({
  id, sursa: 'client', tip: 'TypeError', mesaj: `TypeError: ${id}`, numar: 1, oameni: 1, primaData: null, ultimaData: null, rezolvat: false,
  ultima: { cand: null, tip: '', mesaj: '', stiva: '', build: '', instanta: '', adresa: '', browser: '', uid: null, context: '' },
});

test('erorile din sesiune: în ordinea amprentelor din tichet, cu grupul citit; una lipsă din jurnal o spune, una necitită lipsește', () => {
  const a = 'a'.repeat(32);
  const b = 'b'.repeat(32);
  const c = 'c'.repeat(32);
  const citite = new Map<string, RandGrup | null>([[c, grup(c)], [a, null]]);
  assert.deepEqual(eroriSesiune([a, b, c], citite), [{ amprenta: a, grup: null }, { amprenta: c, grup: grup(c) }]);
  assert.deepEqual(eroriSesiune([], citite), []);
  assert.deepEqual(eroriSesiune([a, b], new Map()), []);
});
