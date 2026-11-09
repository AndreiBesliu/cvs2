/**
 * Cititorul CSV al plăcuțelor (ADR 0210 §4, felia 11.4↑b) și valorile pe câmp: codarea (BOM-ul, UTF-8, Windows-1250),
 * separatorul găsit singur, ghilimelele (separatorul, rândul nou și ghilimelele dublate în celulă), rândurile goale, plafoanele;
 * potrivirea câmpurilor după nume (fără litere mari și diacritice), coloana rămasă, valoarea, numerotarea, „Fă din textul ales
 * câmpul”. Valorile pe hârtie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citesteCsv, decodeazaCsv, PLAFON_CSV, separatorGasit } from '../../src/io/csv.ts';
import { cuCamp, numarPlacuta, numeComparabil, surseImplicite, valoriRand } from '../../src/model/valoriCsv.ts';

const octeti = (s: string): Uint8Array => new TextEncoder().encode(s);

test('codarea: BOM-ul UTF-8 se scoate; UTF-8 fără BOM; altfel Windows-1250 (Excel în română), cu diacriticele lui', () => {
  assert.deepEqual(decodeazaCsv(new Uint8Array([0xef, 0xbb, 0xbf, ...octeti('Nume;Ștefan')])), { text: 'Nume;Ștefan', codare: 'utf-8' });
  assert.deepEqual(decodeazaCsv(octeti('Nume;Ăă')), { text: 'Nume;Ăă', codare: 'utf-8' });
  // „Ştefan Ţăran” în Windows-1250: Ş = 0xAA, ţ = 0xFE, ă = 0xE3, Ţ = 0xDE.
  const w = new Uint8Array([0xaa, 0x74, 0x65, 0x66, 0x61, 0x6e, 0x20, 0xde, 0xe3, 0x72, 0x61, 0x6e]);
  assert.deepEqual(decodeazaCsv(w), { text: 'Ştefan Ţăran', codare: 'windows-1250' });
  // Codarea aleasă de om câștigă (aceiași octeți, citiți ca UTF-8 cu înlocuire).
  assert.equal(decodeazaCsv(octeti('Ăă'), 'windows-1250').codare, 'windows-1250');
});

test('separatorul găsit: ; (Excel în română), , și tab (celulele lipite); o singură coloană dă ;', () => {
  assert.equal(separatorGasit('Nume;Masa\nAna;1\nIon;2\n'), ';');
  assert.equal(separatorGasit('Nume,Masa\nAna,1\nIon,2\n'), ',');
  assert.equal(separatorGasit('Nume\tMasa\nAna\t1\n'), '\t');
  // Virgula din nume nu păcălește: cu ; rândurile au toate 2 coloane, cu , doar unele.
  assert.equal(separatorGasit('Nume;Funcție\nPopescu, Ana;Director\nIon;Inginer\n'), ';');
  assert.equal(separatorGasit('Ana\nIon\n'), ';');
});

test('ghilimelele: separatorul, rândul nou și ghilimelele dublate stau în celulă; CRLF; rândurile goale se sar', () => {
  const text = 'Nume;Notă\r\n"Popescu; Ana";"rândul 1\nrândul 2"\r\n\r\n"Ion ""Vasile""";x\r\n;\r\nMaria;\r\n';
  assert.deepEqual(citesteCsv(text, ';').randuri, [
    ['Nume', 'Notă'], ['Popescu; Ana', 'rândul 1\nrândul 2'], ['Ion "Vasile"', 'x'], ['Maria', ''],
  ]);
  // Ghilimelele din mijlocul unei celule sunt un caracter ca oricare; un BOM lipit se scoate; ultimul rând fără Enter.
  assert.deepEqual(citesteCsv('\uFEFFa"b;c\nd;e', ';').randuri, [['a"b', 'c'], ['d', 'e']]);
});

test('plafoanele: cel mult 1 001 rânduri (cu antetul) și 100 de coloane; restul se taie și se spune', () => {
  const multe = Array.from({ length: 1_200 }, (_, k) => `r${k}`).join('\n');
  const r = citesteCsv(multe, ';');
  assert.equal(r.randuri.length, PLAFON_CSV.randuri);
  assert.equal(r.taiat, true);
  const late = citesteCsv(Array.from({ length: 150 }, (_, k) => `c${k}`).join(';'), ';');
  assert.equal(late.randuri[0]?.length, PLAFON_CSV.coloane);
  assert.equal(late.taiat, true);
  assert.equal(citesteCsv('a;b\nc;d', ';').taiat, false);
});

test('potrivirea câmpurilor: după nume, fără litere mari și diacritice; un câmp fără coloană ia prima rămasă, altfel gol', () => {
  assert.equal(numeComparabil('  Ștefan   ȚĂRAN '), 'stefan taran');
  assert.equal(numeComparabil('Şcoală'), 'scoala');
  assert.deepEqual(surseImplicite(['nume', 'masa'], ['Masa', 'NUME', 'Funcție'], 3),
    { nume: { fel: 'coloana', coloana: 1 }, masa: { fel: 'coloana', coloana: 0 } });
  // Fără antet: în ordine. Un câmp în plus, fără coloane rămase: gol.
  assert.deepEqual(surseImplicite(['a', 'b', 'c'], null, 2),
    { a: { fel: 'coloana', coloana: 0 }, b: { fel: 'coloana', coloana: 1 }, c: { fel: 'valoare', text: '' } });
  // Un câmp cu alt nume ia coloana rămasă, nu una potrivită altui câmp.
  assert.deepEqual(surseImplicite(['functie', 'x'], ['Nume', 'Funcție'], 2),
    { functie: { fel: 'coloana', coloana: 1 }, x: { fel: 'coloana', coloana: 0 } });
});

test('valorile unui rând: coloana (lipsa e goală), valoarea, numerotarea cu cifre și pas; spațiile de la capete pleacă', () => {
  const surse = { nume: { fel: 'coloana', coloana: 0 }, masa: { fel: 'numar', start: 7, pas: 3, cifre: 3 }, loc: { fel: 'valoare', text: ' Sala A ' } } as const;
  assert.deepEqual(valoriRand(['nume', 'masa', 'loc'], surse, [' Ana ', 'x'], 0), { nume: 'Ana', masa: '007', loc: 'Sala A' });
  assert.deepEqual(valoriRand(['nume', 'masa', 'loc'], surse, [], 4), { nume: '', masa: '019', loc: 'Sala A' });
  assert.equal(numarPlacuta({ fel: 'numar', start: 2, pas: -1, cifre: 2 }, 5), '-03');
  assert.equal(numarPlacuta({ fel: 'numar', start: 98, pas: 1, cifre: 2 }, 3), '101');
});

test('„Fă din textul ales câmpul”: bucata aleasă devine {nume}; fără acolade în nume; o alegere goală nu face nimic', () => {
  assert.equal(cuCamp('Masa 7', 5, 6, 'Masa nr'), 'Masa {Masa nr}');
  assert.equal(cuCamp('Ana Popescu', 0, 11, '{Nume}'), '{Nume}');
  assert.equal(cuCamp('Ana', 3, 0, 'x'), '{x}');
  assert.equal(cuCamp('Ana', 1, 1, 'x'), null);
  assert.equal(cuCamp('Ana', 0, 1, '{}'), null);
});
