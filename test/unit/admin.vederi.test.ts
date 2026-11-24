import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alesDupaLista, aparitiiPeZile, baraGrafic, cuTinta, filtreazaSursa } from '../../src/admin/erori/vedere.ts';
import { problemeIntai, sumarDiagnoza } from '../../src/admin/diagnoza/vedere.ts';
import type { RandGrup } from '../../src/admin/erori/date.ts';
import type { Verificare } from '../../src/admin/diagnoza/verificari.ts';

/**
 * Felia A.2 a adminului reproiectat (ADR 0260 §2, §7), partea pură: filtrul pe sursă și eroarea aleasă (Erori), aparițiile
 * pe 14 zile și barele graficului (SVG, fără bibliotecă), sumarul și ordinea Diagnozei (problemele întâi).
 */

// Probele cu schimbarea orei cer un fus cu oră de vară (CI-ul pe Linux rulează în UTC, unde ar trece degeaba). Fiecare
// fișier de probe rulează în procesul lui, deci fusul nu trece în altele; datele se fac doar în probe, după linia asta.
process.env['TZ'] = 'Europe/Bucharest';

const rand = (id: string, sursa: RandGrup['sursa']): RandGrup => ({
  id, sursa, tip: 't', mesaj: id, numar: 1, oameni: 1, primaData: null, ultimaData: null, rezolvat: false,
  ultima: { cand: null, tip: '', mesaj: '', stiva: '', build: '', instanta: '', adresa: '', browser: '', uid: null, context: '', pasi: [] },
});

test('filtrul pe sursă: toate, doar browserul (client), doar serverul; o sursă necunoscută doar la „toate”', () => {
  const r = [rand('a', 'client'), rand('b', 'server'), rand('c', 'necunoscuta'), rand('d', 'client')];
  assert.deepEqual(filtreazaSursa(r, 'toate').map((x) => x.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(filtreazaSursa(r, 'client').map((x) => x.id), ['a', 'd']);
  assert.deepEqual(filtreazaSursa(r, 'server').map((x) => x.id), ['b']);
});

test('eroarea aleasă rămâne cât e în listă; altfel prima din listă; o listă goală n-are nicio alegere', () => {
  const r = [rand('a', 'client'), rand('b', 'server')];
  assert.equal(alesDupaLista('b', r), 'b');
  assert.equal(alesDupaLista('x', r), 'a');
  assert.equal(alesDupaLista(null, r), 'a');
  assert.equal(alesDupaLista('a', []), null);
});

test('grupul cerut dintr-un tichet (A.3), adus separat: primul în listă, o singură dată, cât îl lasă filtrul pe stare', () => {
  const r = [rand('a', 'client'), rand('b', 'server')];
  const vechi = rand('v', 'client');
  const vechiRezolvat = { ...rand('w', 'server'), rezolvat: true };
  assert.deepEqual(cuTinta(r, vechi, true).map((x) => x.id), ['v', 'a', 'b']);
  assert.deepEqual(cuTinta(r, vechi, false).map((x) => x.id), ['v', 'a', 'b']);
  // Rezolvat: doar cu „Toate” (cu „Nerezolvate” nu se arată, ca grupurile citite).
  assert.deepEqual(cuTinta(r, vechiRezolvat, true).map((x) => x.id), ['a', 'b']);
  assert.deepEqual(cuTinta(r, vechiRezolvat, false).map((x) => x.id), ['w', 'a', 'b']);
  // Deja citit: nu se dublează; nimic adus: lista, neschimbată (o copie).
  assert.deepEqual(cuTinta(r, rand('b', 'server'), false).map((x) => x.id), ['a', 'b']);
  const fara = cuTinta(r, null, false);
  assert.deepEqual(fara.map((x) => x.id), ['a', 'b']);
  assert.notEqual(fara, r);
});

// Zilele sunt ale calendarului local (ora de vară schimbată pe 25.10.2026 nu mută nimic dintr-o zi în alta).
const zi = (luna: number, z: number, ora = 12, min = 0) => new Date(2026, luna - 1, z, ora, min);

test('aparițiile pe 14 zile: azi la capăt, pe zilele calendarului local; mai vechi, viitoare sau necunoscute nu intră', () => {
  const acum = zi(11, 17, 9, 30);
  const v = aparitiiPeZile([zi(11, 17, 9, 12), zi(11, 17, 0, 0), zi(11, 16, 23, 59), zi(11, 4, 0, 0), zi(11, 3, 23, 59), zi(11, 17, 9, 31), null], acum);
  assert.equal(v.length, 14);
  assert.deepEqual(v, [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2], '04.11 e prima zi; 03.11 și ce vine după „acum” nu intră');
  // Peste schimbarea orei (25.10): 14 zile întregi, fără o zi pierdută sau dublată.
  const peste = aparitiiPeZile([zi(10, 25, 2, 30), zi(10, 25, 23, 30), zi(10, 26, 0, 30), zi(10, 19, 0, 0)], zi(11, 1, 12));
  assert.deepEqual(peste, [1, 0, 0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0]);
  // Și primăvara (29.03, o zi de 23 de ore): o zi dinainte e la 5 zile întregi de 02.04, nu la 4.
  assert.equal(zi(3, 29, 12).getTimezoneOffset() - zi(3, 28, 12).getTimezoneOffset(), -60, 'fusul probei are oră de vară');
  assert.deepEqual(aparitiiPeZile([zi(3, 28, 12), zi(3, 29, 12), zi(3, 30, 0, 0)], zi(4, 2, 12), 7), [0, 1, 1, 1, 0, 0, 0]);
  assert.deepEqual(aparitiiPeZile([], acum, 3), [0, 0, 0]);
});

test('barele graficului: aceeași lățime, 2 px între ele, cea mai înaltă la înălțimea plină, zilele fără apariții fără bară', () => {
  const b = baraGrafic([0, 1, 4, 2], 100, 40);
  assert.equal(b.length, 4);
  const latime = (100 - 3 * 2) / 4;
  b.forEach((x, k) => {
    assert.ok(Math.abs(x.x - k * (latime + 2)) < 1e-9, `x ${k}`);
    assert.ok(Math.abs(x.latime - latime) < 1e-9);
  });
  assert.deepEqual(b.map((x) => x.inaltime), [0, 10, 40, 20]);
  assert.equal(b[0]?.cale, '', 'o zi fără apariții n-are bară');
  // Capătul rotunjit (cel mult 4 px), cu baza dreaptă pe axă; o bară mai joasă decât raza își micșorează raza.
  assert.match(b[2]?.cale ?? '', /^M[\d.]+ 40V4Q/);
  assert.equal(b[2]?.cale, 'M51 40V4Q51 0 55 0H70.5Q74.5 0 74.5 4V40Z');
  const joasa = baraGrafic([1, 40], 100, 40)[0];
  assert.equal(joasa?.inaltime, 1);
  assert.equal(joasa?.cale, 'M0 40V40Q0 39 1 39H48Q49 39 49 40V40Z', 'raza cât bara');
  assert.deepEqual(baraGrafic([0, 0], 100, 40).map((x) => x.inaltime), [0, 0], 'fără nicio apariție, nicio bară');
});

const v = (id: Verificare['id'], stare: Verificare['stare']): Verificare => ({ id, stare, titlu: 'admin.diag.rol', masura: { cheie: 'admin.diag.rol' } });

test('sumarul Diagnozei: câte Bine, Atenție și Eșec (informațiile nu se numără)', () => {
  assert.deepEqual(sumarDiagnoza([v('instanta', 'bine'), v('build', 'info'), v('appcheck', 'atentie'), v('functii', 'esec'), v('rol', 'info'), v('nerezolvate', 'bine')]),
    { bine: 2, atentie: 1, esec: 1 });
  assert.deepEqual(sumarDiagnoza([]), { bine: 0, atentie: 0, esec: 0 });
});

test('ordinea Diagnozei: problemele întâi (Eșec, apoi Atenție), apoi restul, fiecare grup în ordinea de azi', () => {
  const lista = [v('instanta', 'bine'), v('build', 'info'), v('amprenta', 'atentie'), v('appcheck', 'atentie'), v('rol', 'info'), v('functii', 'esec'), v('nerezolvate', 'bine'), v('job:backupZilnic', 'esec')];
  assert.deepEqual(problemeIntai(lista).map((x) => x.id), [
    'functii', 'job:backupZilnic', 'amprenta', 'appcheck', 'instanta', 'build', 'rol', 'nerezolvate',
  ]);
  // Nimic nu se pierde și nimic nu se dublează.
  assert.deepEqual(problemeIntai(lista).map((x) => x.id).toSorted(), lista.map((x) => x.id).toSorted());
});
