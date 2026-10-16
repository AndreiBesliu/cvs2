import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proiectAsteptat, verificari, type DateDiagnoza } from '../../src/admin/diagnoza/verificari.ts';
import { aparitieDin, dataDin, laPlafonOameni, motivDin, randDin } from '../../src/admin/erori/date.ts';
import { citesteConfig, esteRutaAdmin } from '../../src/app/config.ts';
import { gazdaLocala } from '../../src/cloud/conexiune.ts';
import { esteRol, nivelRol } from '../../shared/personal.ts';

/** Pagina `/admin` (ADR 0040): funcțiile pure ale filelor, configurația și carantina emulatoarelor. */

const ts = (iso: string) => ({ toDate: () => new Date(iso) });

test('rândul unui grup: câmpurile citite, iar ce lipsește e necunoscut (null), nu 0', () => {
  const r = randDin('abc', {
    sursa: 'client', tip: 'randare', mesaj: 'piesa lipsă', numar: 7, oameni: ['u1', 'u2'], rezolvat: false,
    primaData: ts('2026-10-16T10:00:00Z'), ultimaData: ts('2026-10-16T11:00:00Z'),
    ultima: { cand: ts('2026-10-16T11:00:00Z'), build: 'b1', instanta: 'test', uid: 'u2', stiva: 's', adresa: 'https://h/a' },
  });
  assert.equal(r.id, 'abc');
  assert.equal(r.numar, 7);
  assert.equal(r.oameni, 2);
  assert.equal(r.rezolvat, false);
  assert.equal(r.ultimaData?.toISOString(), '2026-10-16T11:00:00.000Z');
  assert.equal(r.ultima.build, 'b1');
  assert.equal(r.ultima.uid, 'u2');
  const gol = randDin('x', { numar: 'multe', oameni: 'toți', rezolvat: 'da', sursa: 'altundeva' });
  assert.equal(gol.numar, null);
  assert.equal(gol.oameni, null);
  assert.equal(gol.rezolvat, false, 'doar true e rezolvat');
  assert.equal(gol.sursa, 'necunoscuta');
  assert.equal(gol.primaData, null);
  assert.equal(gol.ultima.uid, null);
  assert.equal(aparitieDin({ uid: 42 }).uid, null);
});

test('data: doar ce are toDate() și dă o dată validă', () => {
  assert.equal(dataDin(ts('2026-01-02T03:04:05Z'))?.toISOString(), '2026-01-02T03:04:05.000Z');
  assert.equal(dataDin(ts('nu e dată')), null);
  assert.equal(dataDin('2026-01-02'), null);
  assert.equal(dataDin(null), null);
  assert.equal(dataDin({ toDate: () => 'text' }), null);
});

test('oamenii la plafon (50) se spun „50 sau mai mulți”', () => {
  assert.equal(laPlafonOameni(49), false);
  assert.equal(laPlafonOameni(50), true);
  assert.equal(laPlafonOameni(null), false);
});

test('motivul unei erori Firebase: codul și mesajul', () => {
  assert.equal(motivDin({ code: 'permission-denied', message: 'Missing or insufficient permissions.' }), 'permission-denied: Missing or insufficient permissions.');
  assert.equal(motivDin({ code: 'unavailable' }), 'unavailable');
  assert.equal(motivDin(new TypeError('Failed to fetch')), 'Failed to fetch');
  assert.equal(motivDin('text'), 'text');
});

const bun: DateDiagnoza = {
  instanta: 'test', proiect: 'cncvectorstudio-test', build: 'abc123', appCheck: 'recaptcha', rol: 'owner',
  nerezolvate: { ok: true, valoare: 0 }, functii: { ok: true, valoare: 401 },
};
const stare = (d: DateDiagnoza, id: string) => verificari(d).find((v) => v.id === id)?.stare;

test('Diagnoza pe o instanță sănătoasă: bine, cu informațiile', () => {
  const v = verificari(bun);
  assert.deepEqual(v.map((x) => x.id), ['instanta', 'build', 'appcheck', 'rol', 'nerezolvate', 'functii', 'marcaje']);
  assert.deepEqual(v.map((x) => x.stare), ['bine', 'info', 'bine', 'info', 'bine', 'bine', 'info']);
});

test('Diagnoza: instanța greșită, App Check oprit, erori nerezolvate, cifra necitită', () => {
  assert.equal(stare({ ...bun, proiect: 'cncvectorstudio' }, 'instanta'), 'esec');
  assert.equal(stare({ ...bun, appCheck: 'oprit' }, 'appcheck'), 'atentie');
  assert.equal(stare({ ...bun, appCheck: 'proba' }, 'appcheck'), 'info');
  const n = verificari({ ...bun, nerezolvate: { ok: true, valoare: 3 } }).find((x) => x.id === 'nerezolvate');
  assert.equal(n?.stare, 'atentie');
  assert.deepEqual(n?.masura, { cheie: 'admin.diag.nerezolvate.cate', param: { n: 3 } });
  const necitit = verificari({ ...bun, nerezolvate: { ok: false, motiv: 'permission-denied' } }).find((x) => x.id === 'nerezolvate');
  assert.equal(necitit?.stare, 'esec', 'o cifră necitită nu e 0');
  assert.deepEqual(necitit?.masura.param, { motiv: 'permission-denied' });
});

test('Diagnoza funcțiilor: 401 e corect; 2xx = impunerea lipsește; alt cod sau rețeaua = eșec cu indiciu', () => {
  assert.equal(stare(bun, 'functii'), 'bine');
  const fara = verificari({ ...bun, functii: { ok: true, valoare: 200 } }).find((x) => x.id === 'functii');
  assert.equal(fara?.stare, 'esec');
  assert.equal(fara?.masura.cheie, 'admin.diag.functii.fara-impunere');
  const cod = verificari({ ...bun, functii: { ok: true, valoare: 403 } }).find((x) => x.id === 'functii');
  assert.deepEqual([cod?.stare, cod?.masura.param, cod?.indiciu], ['esec', { cod: 403 }, 'admin.diag.functii.indiciu']);
  const retea = verificari({ ...bun, functii: { ok: false, motiv: 'Failed to fetch' } }).find((x) => x.id === 'functii');
  assert.deepEqual([retea?.stare, retea?.masura.cheie], ['esec', 'admin.diag.functii.nu-raspunde']);
});

test('proiectul fiecărei instanțe', () => {
  assert.equal(proiectAsteptat('test', 'cncvectorstudio-test'), true);
  assert.equal(proiectAsteptat('live', 'cncvectorstudio'), true);
  assert.equal(proiectAsteptat('local', 'demo-cncvs2'), true);
  assert.equal(proiectAsteptat('test', 'cncvectorstudio'), false);
  assert.equal(proiectAsteptat('live', 'cncvectorstudio-test'), false);
  assert.equal(proiectAsteptat('local', 'cncvectorstudio'), false);
});

test('configurația de la gazdă: Firebase, App Check și emulatoarele sunt opționale și validate', () => {
  const firebase = { apiKey: 'k', authDomain: 'p.firebaseapp.com', projectId: 'p', appId: '1:2:web:3' };
  const r = citesteConfig(JSON.stringify({ instanta: 'test', firebase, appCheck: { cheieSite: 's' } }));
  assert.deepEqual(r, { ok: true, config: { instanta: 'test', firebase, appCheck: { cheieSite: 's' } } });
  assert.equal(citesteConfig(JSON.stringify({ instanta: 'test', firebase: { ...firebase, apiKey: '' } })).ok, false);
  assert.equal(citesteConfig(JSON.stringify({ instanta: 'local', emulatoare: { auth: 'nu e adresă', firestore: 'h:1', functions: 'h:2' } })).ok, false);
  assert.equal(citesteConfig(JSON.stringify({ instanta: 'local', emulatoare: { auth: 'http://127.0.0.1:9095', firestore: '127.0.0.1:8085', functions: '127.0.0.1:5005' } })).ok, true);
});

test('ruta /admin și carantina emulatoarelor (doar pe gazda locală)', () => {
  assert.equal(esteRutaAdmin('/admin'), true);
  assert.equal(esteRutaAdmin('/admin/erori'), true);
  assert.equal(esteRutaAdmin('/'), false);
  assert.equal(esteRutaAdmin('/administrare'), false);
  assert.equal(esteRutaAdmin('/x/admin'), false);
  assert.equal(gazdaLocala('localhost'), true);
  assert.equal(gazdaLocala('127.0.0.1'), true);
  assert.equal(gazdaLocala('cncvectorstudio-test.firebaseapp.com'), false);
  assert.equal(gazdaLocala('localhost.evil.test'), false);
});

test('rolurile: scara și rolul necunoscut', () => {
  assert.deepEqual(['support', 'admin', 'owner', 'stapan', undefined, 3].map(nivelRol), [1, 2, 3, 0, 0, 0]);
  assert.equal(esteRol('owner'), true);
  assert.equal(esteRol('Owner'), false);
});
