import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eRosu, filtreaza, numarePeStare, ordoneaza, tichetDin } from '../../src/admin/tichete/date.ts';
import {
  AMPRENTE_MAX, BROWSER_MAX, curataAmprentele, curataAplicatia, curataTextTichet, esteFelTichet, esteIdTichet, esteStareTichet,
  FARA_RASPUNS_MS, faraRaspunsPrea, RASPUNS_MAX, TEXT_MAX,
} from '../../shared/tichete.ts';

/**
 * Raportările clienților (ADR 0116 §C): validările comune clientului și serverului (felul, starea, id-ul, datele aplicației,
 * amprentele, textul, vârsta roșie), apoi partea pură a filei Tichete (rândul, ordinea, filtrele, numerele, vârsta roșie).
 */

const ts = (iso: string) => ({ toDate: () => new Date(iso) });
const A = 'a'.repeat(32);
const B = 'b'.repeat(32);
const APP = { versiune: 'b7f507e1a2c3', instanta: 'test', limba: 'ro', browser: 'Edge', plan: 'proba' } as const;

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
    aplicatia: { ...APP, plan: null }, amprente: [A, B], poza: { tip: 'image/jpeg', marime: 1200 },
    raspunsuri: [{ deEmail: 'echipa@exemplu.ro', text: 'Vine.', la: new Date('2026-11-02T10:00:00Z') }, { deEmail: null, text: '', la: null }],
    versiune: 3,
  });
  const gol = tichetDin('t2', { fel: 'altceva', stare: 'inchis', aplicatia: 'nu', amprente: 'nu', poza: { tip: 'image/gif', marime: 3 }, versiune: 0 });
  assert.deepEqual(gol, {
    id: 't2', fel: null, text: '', autorEmail: null, creatLa: null, stare: null, aplicatia: null, amprente: [], poza: null, raspunsuri: [], versiune: null,
  });
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
