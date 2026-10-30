import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areDecizie, baza64, filtreaza, numarePeStare, ordoneaza, poateEdita, sugestieDin } from '../../src/admin/sugestii/date.ts';
import { estePozaValida, VALABILA_MS } from '../../src/app/pozaSugestiei.ts';
import {
  curataText, curataTitlu, DESCRIERE_MAX, esteIdSugestie, esteStare, esteTip, esteVersiune, esteZona, POZA_MAX_BASE64, POZA_MAX_OCTETI,
  RE_BASE64, STARI_SUGESTIE, tipPoza, TITLU_MAX, ziUtc,
} from '../../shared/sugestii.ts';

/** Sugestiile personalului (ADR 0107, poza: ADR 0110): validările comune clientului și serverului, apoi partea pură a filei. */

const ts = (iso: string) => ({ toDate: () => new Date(iso) });
const ID = 'AbCdEfGhIjKlMnOpQrSt';

test('titlul: spațiile adunate, 1–120 de caractere (litere, nu octeți), fără caractere de control', () => {
  assert.equal(curataTitlu('  Grila \n magnetică\t '), 'Grila magnetică');
  assert.equal(curataTitlu('Ș'.repeat(TITLU_MAX)), 'Ș'.repeat(TITLU_MAX));
  assert.equal(curataTitlu('😀'.repeat(TITLU_MAX)), '😀'.repeat(TITLU_MAX), 'un emoji e un caracter, nu două');
  for (const x of ['', '   ', 'Ș'.repeat(TITLU_MAX + 1), 'a\u0001b', 'a\u007fb', 7, null, undefined]) assert.equal(curataTitlu(x), null, JSON.stringify(x));
});

test('textul pe mai multe rânduri: capetele rândurilor ca \\n, capetele textului tăiate, tab-ul rămâne, controlul nu', () => {
  assert.equal(curataText(' a\r\nb\rc\n\td ', DESCRIERE_MAX), 'a\nb\nc\n\td');
  assert.equal(curataText('', DESCRIERE_MAX), '', 'gol e voie');
  assert.equal(curataText('   ', DESCRIERE_MAX), '');
  assert.equal(curataText('ț'.repeat(10), 10), 'ț'.repeat(10));
  assert.equal(curataText('ț'.repeat(11), 10), null);
  for (const x of ['a\u0000b', 'a\u0007b', 'a\u000bb', 'a\u001bb', 'a\u007fb', 5, null]) assert.equal(curataText(x, DESCRIERE_MAX), null, JSON.stringify(x));
});

test('tipul, zona, starea, id-ul și versiunea: doar valorile cunoscute', () => {
  assert.deepEqual(['idee', 'problema', 'imbunatatire', 'Idee', 'bug', ''].map(esteTip), [true, true, true, false, false, false]);
  assert.deepEqual(['desen', 'cam', 'admin', 'altceva', 'bucatarie', null].map(esteZona), [true, true, true, true, false, false]);
  assert.deepEqual(STARI_SUGESTIE.map(esteStare), STARI_SUGESTIE.map(() => true));
  assert.equal(esteStare('gata'), false);
  assert.deepEqual([ID, `${ID}x`, ID.slice(1), '../staff/ana000000000', 7].map(esteIdSugestie), [true, false, false, false, false]);
  assert.deepEqual([1, 2, 0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1].map(esteVersiune), [true, true, false, false, false, false, false]);
});

test('contorul zilnic se schimbă la miezul nopții UTC, nu al României', () => {
  assert.equal(ziUtc(new Date('2026-10-29T23:59:59Z')), '2026-10-29');
  assert.equal(ziUtc(new Date('2026-10-30T00:00:00Z')), '2026-10-30');
  assert.equal(ziUtc(new Date('2026-10-30T01:30:00+02:00')), '2026-10-29');
});

test('rândul: ce lipsește e necunoscut (null), nu inventat; o stare necunoscută nu devine „fără decizie”', () => {
  const s = sugestieDin(ID, {
    titlu: 'Grila', descriere: 'a\nb', tip: 'idee', zona: 'desen', autor: 'ana', autorEmail: 'ana@exemplu.ro',
    creataLa: ts('2026-10-29T10:00:00Z'), modificataLa: ts('2026-10-29T11:00:00Z'), stare: 'acceptata', nota: 'Da.',
    decisaLa: ts('2026-10-29T12:00:00Z'), versiune: 3,
  });
  assert.deepEqual([s.titlu, s.tip, s.zona, s.autor, s.stare, s.nota, s.versiune, s.decisaLa?.toISOString()], [
    'Grila', 'idee', 'desen', 'ana', 'acceptata', 'Da.', 3, '2026-10-29T12:00:00.000Z',
  ]);
  const g = sugestieDin(ID, { tip: 'bug', zona: 'bucatarie', stare: 'gata', versiune: 0, creataLa: 'ieri', autor: '', nota: 5 });
  assert.deepEqual([g.titlu, g.tip, g.zona, g.stare, g.versiune, g.creataLa, g.autor, g.autorEmail, g.nota], ['', null, null, null, null, null, null, null, '']);
  assert.equal(sugestieDin(ID, { versiune: 2.5 }).versiune, null);
});

test('ordinea (cele mai noi întâi, datele necunoscute la coadă), filtrele pe stare și pe autor, numărul pe fiecare stare', () => {
  const s = (id: string, cand: string | null, stare: string, autor: string) => sugestieDin(id, { creataLa: cand ? ts(cand) : null, stare, autor });
  const lista = ordoneaza([
    s('a', '2026-10-28T10:00:00Z', 'noua', 'ana'), s('b', null, 'acceptata', 'ion'), s('c', '2026-10-29T10:00:00Z', 'noua', 'ion'),
    s('d', '2026-10-29T09:00:00Z', 'respinsa', 'ana'), s('e', null, 'gata', 'ana'),
  ]);
  assert.deepEqual(lista.map((x) => x.id), ['c', 'd', 'a', 'b', 'e']);
  assert.deepEqual(filtreaza(lista, 'noua', null).map((x) => x.id), ['c', 'a']);
  assert.deepEqual(filtreaza(lista, 'toate', 'ana').map((x) => x.id), ['d', 'a', 'e']);
  assert.deepEqual(filtreaza(lista, 'noua', 'ana').map((x) => x.id), ['a']);
  assert.deepEqual(filtreaza(lista, 'facuta', null), []);
  assert.deepEqual(numarePeStare(lista), { noua: 2, acceptata: 1, amanata: 0, respinsa: 1, 'in-lucru': 0, facuta: 0 });
});

test('editarea: doar autorul, doar fără decizie, cu versiunea cunoscută; decizia se arată cu o stare de decizie sau o notă', () => {
  const s = (d: Record<string, unknown>) => sugestieDin(ID, { autor: 'ana', stare: 'noua', versiune: 1, ...d });
  assert.equal(poateEdita(s({}), 'ana'), true);
  assert.equal(poateEdita(s({}), 'ion'), false);
  assert.equal(poateEdita(s({ stare: 'acceptata' }), 'ana'), false);
  assert.equal(poateEdita(s({ stare: 'gata' }), 'ana'), false, 'o stare necunoscută nu e „fără decizie”');
  assert.equal(poateEdita(s({ versiune: undefined }), 'ana'), false);
  assert.equal(areDecizie(s({})), false);
  assert.equal(areDecizie(s({ nota: 'Revin.' })), true, 'înapoi la „fără decizie”, cu o notă');
  assert.equal(areDecizie(s({ stare: 'amanata' })), true);
  assert.equal(areDecizie(s({ stare: 'gata' })), false);
});

test('poza (ADR 0110): tipul după semnătură, nu după nume; base64 strict; plafonul în base64 e cel al octeților', () => {
  const t8 = (s: string) => new TextEncoder().encode(s);
  assert.equal(tipPoza(new Uint8Array([0xff, 0xd8, 0xff, 0xdb])), 'image/jpeg');
  assert.equal(tipPoza(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(tipPoza(t8('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ')), 'image/webp');
  const rele = [new Uint8Array(), new Uint8Array([0xff, 0xd8]), new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a]), t8('GIF89a'), t8('RIFF\u0000\u0000\u0000\u0000WAVE')];
  for (const o of rele) assert.equal(tipPoza(o), null, String(o));
  for (const s of ['', 'QQ==', 'QUI=', 'QUJD', 'QUJDRA==']) assert.ok(RE_BASE64.test(s), s);
  for (const s of ['Q', 'QQ', 'QQ=', 'Q===', 'QU JD', 'QUJD\n', 'QU-_', 'data:image/png;base64,QUJD', 'QQ==QQ==']) assert.ok(!RE_BASE64.test(s), s);
  assert.equal(POZA_MAX_BASE64, Buffer.alloc(POZA_MAX_OCTETI).toString('base64').length);
});

test('base64-ul paginii e cel al lui Node, și peste o bucată de 32 kB', () => {
  for (const n of [0, 1, 2, 3, 0x8000 - 1, 0x8000, 0x8000 + 1, 100_000]) {
    const o = Uint8Array.from({ length: n }, (_, i) => (i * 131 + 7) % 256);
    assert.equal(baza64(o), Buffer.from(o).toString('base64'), String(n));
  }
});

test('poza lăsată de editor: imaginea și ora ei, de cel mult o zi, nu din viitor', () => {
  const acum = 1_000_000_000_000;
  const imagine = new Blob(['x']);
  assert.equal(estePozaValida({ imagine, la: acum }, acum), true);
  assert.equal(estePozaValida({ imagine, la: acum - VALABILA_MS }, acum), true);
  assert.equal(estePozaValida({ imagine, la: acum - VALABILA_MS - 1 }, acum), false);
  assert.equal(estePozaValida({ imagine, la: acum + 1 }, acum), false);
  for (const p of [null, undefined, 'x', {}, { imagine }, { la: acum }, { imagine: 'x', la: acum }, { imagine, la: String(acum) }]) {
    assert.equal(estePozaValida(p, acum), false, JSON.stringify(p));
  }
});

test('rândul cu poză: tipul și mărimea; altceva e „fără poză”', () => {
  assert.deepEqual(sugestieDin(ID, { poza: { tip: 'image/jpeg', marime: 1234 } }).poza, { tip: 'image/jpeg', marime: 1234 });
  for (const poza of [null, undefined, 'x', { tip: 'image/gif', marime: 1 }, { tip: 'image/png', marime: 0 }, { tip: 'image/png' }]) {
    assert.equal(sugestieDin(ID, { poza }).poza, null, JSON.stringify(poza));
  }
});
