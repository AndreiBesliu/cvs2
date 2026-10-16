import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cheieAmprenta, descrieAruncat, faraInterogare, ipApelant, normalizeazaMesaj, oraFerestrei, PLAFON_MESAJ,
  PLAFON_NORMALIZAT, taie, TIPURI_EROARE, valideazaRaport,
} from '../../shared/erori.ts';

/** Contractul jurnalului de erori (ADR 0039), comun clientului și serverului: valorile sunt scrise de mână. */

const bun = {
  tip: 'randare', mesaj: 'TypeError: x is undefined', stiva: 'at a (index.js:1:2)', adresa: 'https://h.test/aplicatie',
  build: 'abc123', browser: 'Edge 141', limba: 'ro',
};

test('raportul valid trece neschimbat', () => {
  assert.deepEqual(valideazaRaport(bun), { ok: true, raport: bun });
});

test('raportul greșit se refuză, cu motivul: nu e obiect, tip necunoscut, câmp lipsă sau de alt tip, mesaj gol', () => {
  assert.equal(valideazaRaport(null).ok, false);
  assert.equal(valideazaRaport([bun]).ok, false);
  assert.equal(valideazaRaport('text').ok, false);
  assert.deepEqual(valideazaRaport({ ...bun, tip: 'inventat' }), { ok: false, motiv: 'tipul erorii' });
  const { stiva: _s, ...faraStiva } = bun;
  assert.deepEqual(valideazaRaport(faraStiva), { ok: false, motiv: 'stiva nu e text' });
  assert.deepEqual(valideazaRaport({ ...bun, build: 7 }), { ok: false, motiv: 'build nu e text' });
  assert.deepEqual(valideazaRaport({ ...bun, mesaj: '   ' }), { ok: false, motiv: 'mesajul e gol' });
  for (const tip of TIPURI_EROARE) assert.equal(valideazaRaport({ ...bun, tip }).ok, true, tip);
});

test('textele lungi se taie cu marcajul jurnalului local; cele uriașe se refuză', () => {
  const r = valideazaRaport({ ...bun, mesaj: 'a'.repeat(PLAFON_MESAJ + 500) });
  assert.ok(r.ok);
  assert.equal(r.raport.mesaj, `${'a'.repeat(PLAFON_MESAJ)}… (+500)`);
  // Marcajul clientului trece puțin de plafon: serverul îl taie din nou, nu-l refuză.
  const dejaTaiat = taie('b'.repeat(PLAFON_MESAJ + 7), PLAFON_MESAJ);
  assert.equal(valideazaRaport({ ...bun, mesaj: dejaTaiat }).ok, true);
  assert.deepEqual(valideazaRaport({ ...bun, mesaj: 'c'.repeat(PLAFON_MESAJ * 64 + 1) }), { ok: false, motiv: 'mesaj e prea lung' });
});

test('adresa pierde query-ul și fragmentul, unde pot sta date ale omului', () => {
  assert.equal(faraInterogare('https://h.test/a?cod=123#x'), 'https://h.test/a');
  assert.equal(faraInterogare('https://h.test/a#x?y'), 'https://h.test/a');
  assert.equal(faraInterogare('https://h.test/a'), 'https://h.test/a');
  const r = valideazaRaport({ ...bun, adresa: 'https://h.test/a?email=om@x.ro' });
  assert.ok(r.ok);
  assert.equal(r.raport.adresa, 'https://h.test/a');
});

test('descrierea valorilor aruncate: Error ca în jurnalul local, apoi șirul, null, undefined, Promise, obiectele', () => {
  const e = new TypeError('x is undefined');
  assert.deepEqual(descrieAruncat(e), { mesaj: 'TypeError: x is undefined', stiva: e.stack ?? '' });
  assert.deepEqual(descrieAruncat('cădere'), { mesaj: 'cădere', stiva: '' });
  assert.equal(descrieAruncat(null).mesaj, 'null aruncat');
  assert.equal(descrieAruncat(undefined).mesaj, 'undefined aruncat');
  assert.equal(descrieAruncat(Promise.resolve(1)).mesaj, 'Promise aruncat');
  assert.equal(descrieAruncat({ name: 'FirebaseError', message: 'permission-denied' }).mesaj, 'FirebaseError: permission-denied');
  assert.equal(descrieAruncat({ message: 'fără nume' }).mesaj, 'Obiect: fără nume');
  assert.equal(descrieAruncat({ cod: 7 }).mesaj, 'obiect aruncat: {"cod":7}');
  const circular: Record<string, unknown> = {};
  circular['eu'] = circular;
  assert.equal(descrieAruncat(circular).mesaj, 'obiect aruncat: [object Object]');
  assert.equal(descrieAruncat(42).mesaj, 'number aruncat: 42');
  assert.equal(descrieAruncat(10n).mesaj, 'bigint aruncat: 10');
});

test('normalizarea: adresele, fișierele cu hash, id-urile și numerele se înlocuiesc; formularea rămâne', () => {
  assert.equal(
    normalizeazaMesaj('Failed to fetch dynamically imported module: https://cncvectorstudio-test.firebaseapp.com/assets/StratTraseu-Bx9kQ2aZ.js'),
    'Failed to fetch dynamically imported module: <adresa>',
  );
  assert.equal(normalizeazaMesaj('eroare în index-DdF3k2Lm.js la linia 4'), 'eroare în <fisier> la linia <n>');
  assert.equal(normalizeazaMesaj('piesa 12 are 3,5 noduri'), 'piesa <n> are <n> noduri');
  assert.equal(normalizeazaMesaj('doc 3f2b8c1e-9a4d-4e6f-8b7a-0c1d2e3f4a5b lipsă'), 'doc <id> lipsă');
  assert.equal(normalizeazaMesaj('hash deadbeef1234 vs deadbeef'), 'hash <id> vs deadbeef');
  assert.equal(normalizeazaMesaj('uid Xy12abCD34efGH56ij78KL90 refuzat'), 'uid <id> refuzat');
  assert.equal(normalizeazaMesaj("Cannot read properties of undefined (reading 'x')"), "Cannot read properties of undefined (reading 'x')");
  assert.equal(normalizeazaMesaj('  două\n\tspații  '), 'două spații');
  assert.equal(normalizeazaMesaj('z'.repeat(1000)).length, PLAFON_NORMALIZAT);
});

test('amprenta: același defect cu alte numere sau alt build e un grup; altă formulare, altă sursă sau alt tip, altul', () => {
  const a = cheieAmprenta('client', 'randare', 'piesa 12 lipsă în https://h.test/assets/index-AAAA1111.js');
  assert.equal(a, cheieAmprenta('client', 'randare', 'piesa 7 lipsă în https://h.test/assets/index-BBBB2222.js'));
  assert.equal(a, 'client|randare|piesa <n> lipsă în <adresa>');
  assert.notEqual(a, cheieAmprenta('client', 'randare', 'foaia 12 lipsă în https://h.test/x'));
  assert.notEqual(a, cheieAmprenta('server', 'randare', 'piesa 12 lipsă în https://h.test/x'));
  assert.notEqual(a, cheieAmprenta('client', 'salvare', 'piesa 12 lipsă în https://h.test/x'));
});

test('IP-ul apelantului: ultima intrare din X-Forwarded-For, altfel adresa conexiunii, altfel „necunoscut”', () => {
  assert.equal(ipApelant('1.2.3.4, 5.6.7.8', '10.0.0.1'), '5.6.7.8');
  assert.equal(ipApelant('5.6.7.8', undefined), '5.6.7.8');
  assert.equal(ipApelant(' , ', '9.9.9.9'), '9.9.9.9');
  assert.equal(ipApelant(undefined, '9.9.9.9'), '9.9.9.9');
  assert.equal(ipApelant(undefined, '  '), 'necunoscut');
  assert.equal(ipApelant(undefined, undefined), 'necunoscut');
});

test('fereastra plafonului e ora de la epocă', () => {
  const ora = 3_600_000;
  assert.equal(oraFerestrei(5 * ora), 5);
  assert.equal(oraFerestrei(5 * ora + 1), 5);
  assert.equal(oraFerestrei(5 * ora - 1), 4);
});
