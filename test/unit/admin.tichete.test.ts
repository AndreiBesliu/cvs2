import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tichetDin, type Tichet } from '../../src/admin/tichete/date.ts';
import { eroriSesiune, incapeRapid, insereazaLaCursor, numereFiltru, stareDupaRaspuns, titluTichet, TITLU_MAX } from '../../src/admin/tichete/vedere.ts';
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
  // A 90-a literă cade în mijlocul lui „mare” (21.11: propoziția de dinainte se rupea întâmplător înaintea unui spațiu, iar
  // otrava U04, tăierea în mijlocul cuvântului, trecea). Titlul așteptat e scris de mână, nu calculat.
  const cuvinte = 'Exportul se oprește la patruzeci la sută când proiectul are trei foi de placaj și planșa mare pentru dulapul din bucătărie';
  assert.equal(Array.from(cuvinte)[TITLU_MAX], 'a');
  assert.equal(titluTichet(cuvinte), 'Exportul se oprește la patruzeci la sută când proiectul are trei foi de placaj și planșa…');
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
  ultima: { cand: null, tip: '', mesaj: '', stiva: '', build: '', instanta: '', adresa: '', browser: '', uid: null, context: '', pasi: [] },
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

test('răspunsul rapid pus la cursor (ADR 0261 §5): fără să șteargă restul, cu un rând gol înainte și după, când lângă e text', () => {
  const A = 'Mulțumim!';
  // Câmpul gol: doar textul, cursorul la capăt.
  assert.deepEqual(insereazaLaCursor('', 0, 0, A), { text: A, cursor: A.length });
  // La capătul unui text: un rând gol înainte.
  assert.deepEqual(insereazaLaCursor('Bună,', 5, 5, A), { text: `Bună,\n\n${A}`, cursor: `Bună,\n\n${A}`.length });
  // După un rând nou: încă unul, nu două; după un rând gol: niciunul.
  assert.equal(insereazaLaCursor('Bună,\n', 6, 6, A).text, `Bună,\n\n${A}`);
  assert.equal(insereazaLaCursor('Bună,\n\n', 7, 7, A).text, `Bună,\n\n${A}`);
  // La început, înaintea unui text: un rând gol după; cursorul după bucata pusă.
  assert.deepEqual(insereazaLaCursor('Semnat, echipa', 0, 0, A), { text: `${A}\n\nSemnat, echipa`, cursor: A.length });
  // În mijloc: rând gol de ambele părți; selecția se înlocuiește.
  assert.equal(insereazaLaCursor('Bună, XX echipa', 6, 8, A).text, `Bună, \n\n${A}\n\n echipa`);
  assert.equal(insereazaLaCursor('Unu\n\nDoi', 3, 3, A).text, `Unu\n\n${A}\n\nDoi`);
  // Capetele în afara textului se strâng; un capăt înaintea începutului nu întoarce selecția.
  assert.equal(insereazaLaCursor('ab', 9, 99, A).text, `ab\n\n${A}`);
  assert.equal(insereazaLaCursor('ab', 2, 1, A).text, `ab\n\n${A}`);
});

test('butonul unui răspuns rapid se oprește când textul n-ar mai încăpea în câmp (cu rândul gol dinainte)', () => {
  const plin = 'x'.repeat(1990);
  assert.equal(incapeRapid('', 'y'.repeat(2000), 2000), true);
  assert.equal(incapeRapid('', 'y'.repeat(2001), 2000), false);
  assert.equal(incapeRapid(plin, 'y'.repeat(8), 2000), true);
  assert.equal(incapeRapid(plin, 'y'.repeat(9), 2000), false, '1990 + 2 (rândul gol) + 9 = 2001');
});
