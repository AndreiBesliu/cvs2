import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import {
  despacheteazaProiect, eRosu, filtreaza, numarePeStare, numeFisierProiect, ordoneaza, proiectVerificat, sha256Hex, tichetDin,
} from '../../src/admin/tichete/date.ts';
import {
  AMPRENTE_MAX, BROWSER_MAX, caleProiectTichet, curataAmprentele, curataAplicatia, curataTextTichet, esteFelTichet, esteIdTichet,
  esteStareTichet, FARA_RASPUNS_MS, faraRaspunsPrea, idDinCaleProiect, metaProiectDin, PROIECT_GZ_MAX_OCTETI, PROIECT_MAX_BASE64,
  PROIECT_MAX_OCTETI, RASPUNS_MAX, TEXT_MAX,
} from '../../shared/tichete.ts';

/**
 * Raportările clienților (ADR 0116 §C): validările comune clientului și serverului (felul, starea, id-ul, datele aplicației,
 * amprentele, textul, vârsta roșie), apoi partea pură a filei Tichete (rândul, ordinea, filtrele, numerele, vârsta roșie).
 */

const ts = (iso: string) => ({ toDate: () => new Date(iso) });
const A = 'a'.repeat(32);
const B = 'b'.repeat(32);
const APP = { versiune: 'b7f507e1a2c3', instanta: 'test', limba: 'ro', browser: 'Edge', plan: 'proba' } as const;

const META = { marime: 1_250_000, comprimat: 180_000, sha256: 'c'.repeat(64), schema: 20 } as const;

test('proiectul atașat (15.B↑b): plafoanele, calea în Storage și id-ul din ea; un nume străin nu dă niciun id', () => {
  assert.equal(PROIECT_MAX_OCTETI, 10 * 1024 * 1024);
  assert.equal(PROIECT_GZ_MAX_OCTETI, PROIECT_MAX_OCTETI);
  // 4 caractere pe 3 octeți, rotunjit în sus: cererea cu proiectul la plafon rămâne sub 14 MB (Cloud Run primește 32 MiB).
  assert.equal(PROIECT_MAX_BASE64, 13_981_016);
  assert.ok(PROIECT_MAX_BASE64 < 14_000_000);
  const id = 'AbCdEfGhIjKlMnOpQrSt';
  assert.equal(caleProiectTichet(id), 'tichete/AbCdEfGhIjKlMnOpQrSt/proiect.json.gz');
  assert.equal(idDinCaleProiect(caleProiectTichet(id)), id);
  for (const x of [
    'tichete/AbCdEfGhIjKlMnOpQrSt/proiect.json', 'tichete/AbCdEfGhIjKlMnOpQrS/proiect.json.gz', 'tichete/AbCdEfGhIjKlMnOpQrSt/alt.json.gz',
    'users/u1/projects/AbCdEfGhIjKlMnOpQrSt', 'xtichete/AbCdEfGhIjKlMnOpQrSt/proiect.json.gz', 'tichete/AbCdEfGhIjKlMnOpQrSt/proiect.json.gz/x',
    'tichete/AbCdEfGhIjKlMnOpQr-t/proiect.json.gz', 'tichete/',
  ]) assert.equal(idDinCaleProiect(x), null, x);
});

test('descărcarea din fila Tichete: despachetat de browser, verificat pe mărime și amprentă, numele fișierului', async () => {
  const json = new TextEncoder().encode('{"schema":20,"x":"ț"}');
  const p = gzipSync(json).toString('base64');
  const d = await despacheteazaProiect(p);
  assert.deepEqual(d, json);
  // Amprenta, ca a serverului (`createHash('sha256').digest('hex')`).
  const sha = createHash('sha256').update(json).digest('hex');
  assert.equal(await sha256Hex(d), sha);
  const meta = { marime: json.length, comprimat: Buffer.from(p, 'base64').length, sha256: sha, schema: 20 };
  assert.equal(await proiectVerificat(d, meta), true);
  assert.equal(await proiectVerificat(d, { ...meta, marime: json.length + 1 }), false, 'altă mărime');
  assert.equal(await proiectVerificat(d, { ...meta, sha256: 'f'.repeat(64) }), false, 'altă amprentă');
  assert.equal(await proiectVerificat(new TextEncoder().encode('{"schema":20,"x":"tt"}'), meta), false, 'alt conținut, aceeași mărime');
  await assert.rejects(despacheteazaProiect(Buffer.from('nu e gzip').toString('base64')));
  assert.equal(numeFisierProiect('AbCdEfGhIjKlMnOpQrSt'), 'cncvs2-tichet-AbCdEfGhIjKlMnOpQrSt.json');
});

test('meta proiectului din tichet: întregi în margini, amprenta hex de 64, schema 1…1000; altfel null', () => {
  assert.deepEqual(metaProiectDin(META), META);
  assert.deepEqual(metaProiectDin({ ...META, extra: 1 }), META);
  assert.deepEqual(metaProiectDin({ ...META, marime: PROIECT_MAX_OCTETI, comprimat: PROIECT_GZ_MAX_OCTETI }), { ...META, marime: PROIECT_MAX_OCTETI, comprimat: PROIECT_GZ_MAX_OCTETI });
  for (const x of [
    { ...META, marime: 0 }, { ...META, marime: PROIECT_MAX_OCTETI + 1 }, { ...META, marime: 1.5 }, { ...META, marime: '12' },
    { ...META, comprimat: 0 }, { ...META, comprimat: PROIECT_GZ_MAX_OCTETI + 1 }, { ...META, sha256: 'C'.repeat(64) },
    { ...META, sha256: 'c'.repeat(63) }, { ...META, schema: 0 }, { ...META, schema: 1001 }, { ...META, schema: 2.5 },
    { marime: 1, comprimat: 1, sha256: 'c'.repeat(64) }, [META], null, 'proiect',
  ]) assert.equal(metaProiectDin(x), null, JSON.stringify(x).slice(0, 80));
});

test('felul, starea și id-ul: doar valorile cunoscute', () => {
  for (const f of ['problema', 'idee', 'intrebare']) assert.ok(esteFelTichet(f), f);
  for (const s of ['nou', 'deschis', 'rezolvat']) assert.ok(esteStareTichet(s), s);
  for (const x of ['', 'Problema', 'imbunatatire', 7, null]) assert.ok(!esteFelTichet(x), JSON.stringify(x));
  for (const x of ['', 'inchis', 'Nou', null]) assert.ok(!esteStareTichet(x), JSON.stringify(x));
  assert.ok(esteIdTichet('AbCdEfGhIjKlMnOpQrSt'));
  for (const x of ['AbCdEfGhIjKlMnOpQrS', 'AbCdEfGhIjKlMnOpQrSt1', 'AbCdEfGhIjKlMnOpQr-t', 'ab/cd', 5]) assert.ok(!esteIdTichet(x), JSON.stringify(x));
});

test('datele aplicației: spațiile strânse; un câmp lipsă, gol, prea lung sau cu caractere de control = toate refuzate', () => {
  assert.deepEqual(curataAplicatia({ ...APP, browser: '  Mozilla/5.0   (Windows) ' }), { ...APP, browser: 'Mozilla/5.0 (Windows)' });
  assert.deepEqual(curataAplicatia({ ...APP, plan: null }), { ...APP, plan: null });
  assert.deepEqual(curataAplicatia({ ...APP, browser: 'x'.repeat(BROWSER_MAX) })?.browser, 'x'.repeat(BROWSER_MAX));
  for (const x of [
    { ...APP, browser: 'x'.repeat(BROWSER_MAX + 1) }, { ...APP, browser: '' }, { ...APP, browser: 'a\u0001b' }, { ...APP, limba: 'fr' },
    { ...APP, versiune: 'v'.repeat(41) }, { ...APP, instanta: 'i'.repeat(21) }, { ...APP, plan: 'p'.repeat(21) }, { ...APP, plan: 7 },
    { versiune: APP.versiune, instanta: APP.instanta, limba: APP.limba, browser: APP.browser }, [APP], null, 'test',
  ]) assert.equal(curataAplicatia(x), null, JSON.stringify(x).slice(0, 80));
});

test('amprentele: 32 de caractere hex mici, fără repetiții, în ordinea lor; peste plafon sau una greșită = refuzate', () => {
  assert.deepEqual(curataAmprentele([A, B, A]), [A, B]);
  assert.deepEqual(curataAmprentele([]), []);
  assert.deepEqual(curataAmprentele(Array.from({ length: AMPRENTE_MAX }, () => A)), [A]);
  for (const x of [Array.from({ length: AMPRENTE_MAX + 1 }, () => A), [A.toUpperCase()], ['a'.repeat(31)], ['g'.repeat(32)], [A, 7], A, null]) {
    assert.equal(curataAmprentele(x), null, JSON.stringify(x).slice(0, 60));
  }
});

test('textul raportării și al răspunsului: pe mai multe rânduri, 1…plafon caractere, fără caractere de control', () => {
  assert.equal(curataTextTichet(' Grila\r\nse vede rău. '), 'Grila\nse vede rău.');
  assert.equal(curataTextTichet('ț'.repeat(TEXT_MAX)), 'ț'.repeat(TEXT_MAX));
  assert.equal(curataTextTichet('ț'.repeat(RASPUNS_MAX), RASPUNS_MAX), 'ț'.repeat(RASPUNS_MAX));
  for (const x of ['', '  \n ', 'ț'.repeat(TEXT_MAX + 1), 'a\u0000b', 'a\u001bb', 7, null]) assert.equal(curataTextTichet(x), null, JSON.stringify(x).slice(0, 40));
  assert.equal(curataTextTichet('ț'.repeat(RASPUNS_MAX + 1), RASPUNS_MAX), null);
});

test('vârsta roșie: nerezolvat, fără niciun răspuns, de cel puțin 48 h', () => {
  const t0 = Date.UTC(2026, 10, 2, 9, 0);
  assert.equal(faraRaspunsPrea({ creatLa: t0, raspunsuri: 0, stare: 'nou' }, t0 + FARA_RASPUNS_MS), true);
  assert.equal(faraRaspunsPrea({ creatLa: t0, raspunsuri: 0, stare: 'deschis' }, t0 + FARA_RASPUNS_MS), true);
  assert.equal(faraRaspunsPrea({ creatLa: t0, raspunsuri: 0, stare: 'nou' }, t0 + FARA_RASPUNS_MS - 1), false);
  assert.equal(faraRaspunsPrea({ creatLa: t0, raspunsuri: 1, stare: 'nou' }, t0 + 10 * FARA_RASPUNS_MS), false);
  assert.equal(faraRaspunsPrea({ creatLa: t0, raspunsuri: 0, stare: 'rezolvat' }, t0 + 10 * FARA_RASPUNS_MS), false);
});

test('rândul din fila Tichete: ce lipsește e necunoscut (null, gol), nu inventat; amprentele greșite cad', () => {
  const plin = tichetDin('t1', {
    fel: 'idee', text: 'Grila\nmai groasă', autorEmail: 'ana@exemplu.ro', creatLa: ts('2026-11-02T09:00:00Z'), stare: 'deschis',
    aplicatia: { ...APP, plan: null, extra: 1 }, amprente: [A, 'nu', 7, B], poza: { tip: 'image/jpeg', marime: 1200 },
    raspunsuri: [{ de: 'own', deEmail: 'echipa@exemplu.ro', text: 'Vine.', la: ts('2026-11-02T10:00:00Z') }, 'stricat'], versiune: 3,
  });
  assert.deepEqual(plin, {
    id: 't1', fel: 'idee', text: 'Grila\nmai groasă', autorEmail: 'ana@exemplu.ro', creatLa: new Date('2026-11-02T09:00:00Z'), stare: 'deschis',
    aplicatia: { ...APP, plan: null }, amprente: [A, B], poza: { tip: 'image/jpeg', marime: 1200 }, proiect: null,
    raspunsuri: [{ deEmail: 'echipa@exemplu.ro', text: 'Vine.', la: new Date('2026-11-02T10:00:00Z') }, { deEmail: null, text: '', la: null }],
    versiune: 3,
  });
  const gol = tichetDin('t2', { fel: 'altceva', stare: 'inchis', aplicatia: 'nu', amprente: 'nu', poza: { tip: 'image/gif', marime: 3 }, versiune: 0 });
  assert.deepEqual(gol, {
    id: 't2', fel: null, text: '', autorEmail: null, creatLa: null, stare: null, aplicatia: null, amprente: [], poza: null, proiect: null,
    raspunsuri: [], versiune: null,
  });
  // Proiectul atașat (felia 15.B↑b): meta din tichet, cu marginile ei; o formă greșită = fără proiect, nu un buton stricat.
  assert.deepEqual(tichetDin('t4', { proiect: META }).proiect, META);
  assert.equal(tichetDin('t5', { proiect: { ...META, sha256: 'x' } }).proiect, null);
  for (const v of [1.5, -1, '2', Number.MAX_SAFE_INTEGER + 1]) assert.equal(tichetDin('t3', { versiune: v }).versiune, null, String(v));
});

test('ordinea (cele mai noi întâi, datele necunoscute la coadă), filtrele și numărul pe fiecare stare; vârsta roșie pe rând', () => {
  const r = (id: string, iso: string | null, stare: string, raspunsuri: unknown[] = []) =>
    tichetDin(id, { creatLa: iso ? ts(iso) : undefined, stare, raspunsuri });
  const lista = [
    r('b', '2026-10-30T09:00:00Z', 'nou'), r('a', '2026-11-02T09:00:00Z', 'deschis', [{ text: 'x' }]), r('c', null, 'nou'),
    r('d', '2026-10-30T09:00:00Z', 'rezolvat'), r('e', '2026-11-01T09:00:00Z', 'ciudat'),
  ];
  assert.deepEqual(ordoneaza(lista).map((x) => x.id), ['a', 'e', 'b', 'd', 'c']);
  assert.deepEqual(filtreaza(lista, 'nou').map((x) => x.id), ['b', 'c']);
  assert.deepEqual(filtreaza(lista, 'toate').map((x) => x.id), ['b', 'a', 'c', 'd', 'e']);
  assert.deepEqual(numarePeStare(lista), { nou: 2, deschis: 1, rezolvat: 1 });
  const acum = Date.parse('2026-11-02T09:00:00Z');
  assert.deepEqual(lista.filter((x) => eRosu(x, acum)).map((x) => x.id), ['b']);
});
