/**
 * Raportarea din editor (ADR 0116 §11), pe hârtie: datele aplicației (browserul curățat și tăiat, primit de server; planul de
 * azi), erorile sesiunii (fără cele din depozit și fără cele doar locale), amprentele (o dată pe eroare, ultimele 20) și
 * amprenta făcută în browser, egală cu id-ul pe care serverul îl dă grupului din `errorLogs`. Plus semnul din meniul
 * contului (câte raportări au un răspuns necitit), care primește doar numere întregi pozitive.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAPABILITATI } from '../../shared/capabilitati.ts';
import { capabilitatiPlan, ZI_MS, type Drept, type Plan } from '../../shared/conturi.ts';
import { PLAFON_MESAJ } from '../../shared/erori.ts';
import { gunzipSync } from 'node:zlib';
import { AMPRENTE_MAX, BROWSER_MAX, curataAmprentele, curataAplicatia, PROIECT_MAX_OCTETI, RE_AMPRENTA } from '../../shared/tichete.ts';
// Amprenta serverului, din modulul ei fără Firestore: în CI, `firebase-admin` e instalat doar în prima felie a nivelului rapid.
import { amprenta } from '../../functions/src/erori/amprenta.ts';
import type { IntrareEroare } from '../../src/app/jurnalErori.ts';
import { baza64 } from '../../shared/poza.ts';
import {
  amprenteleSesiunii, aplicatiaTichet, inBase64, intrariSesiunii, marimeCitita, octetiProiect, proiectPentruRaportare, proiectPreaMare,
} from '../../src/app/raportare.ts';
import type { Document } from '../../src/model/document.ts';
import { puneRaportariNecitite, raportariNecitite } from '../../src/app/raportariNecitite.ts';
import { amprentaRaportului, MESAJ_GOL, raportDin } from '../../src/cloud/raportor.ts';

const ACUM = Date.UTC(2026, 10, 2, 9, 0);
const INCEPUT = ACUM - 60_000;

function drept(plan: Plan, pana: number | null, calculatLa = ACUM): Drept {
  return { plan, capabilitati: plan === 'proba' ? [...CAPABILITATI] : capabilitatiPlan(plan), pana, calculatLa, zileOffline: 7 };
}

const intrare = (mesaj: string, ms: number, extra: Partial<IntrareEroare> = {}): IntrareEroare => ({
  cand: new Date(ms).toISOString(), tip: 'randare', mesaj, stiva: '', adresa: 'https://h.test/', ...extra,
});

const app = (browser: string, d: Drept | null = null) => aplicatiaTichet({ versiune: 'b7f507e1a2c3', instanta: 'test', limba: 'ro', browser, drept: d }, ACUM);

test('datele aplicației: versiunea, instanța, limba, browserul și planul; serverul le primește cum sunt', () => {
  const a = app('Mozilla/5.0 (Windows NT 10.0) Edg/147.0', drept('proba', ACUM + 5 * ZI_MS));
  assert.deepEqual(a, { versiune: 'b7f507e1a2c3', instanta: 'test', limba: 'ro', browser: 'Mozilla/5.0 (Windows NT 10.0) Edg/147.0', plan: 'proba' });
  assert.deepEqual(curataAplicatia(a), a);
  // O pagină fără versiune în antet spune „necunoscută”; trece și ea.
  const fara = aplicatiaTichet({ versiune: 'necunoscută', instanta: 'local', limba: 'en', browser: 'X', drept: null }, ACUM);
  assert.deepEqual(curataAplicatia(fara), fara);
});

test('browserul: fără caractere de control, spațiile strânse, tăiat la plafonul serverului; gol, „necunoscut”', () => {
  const lung = app(`A\u0000B\tC\n${'x'.repeat(2 * BROWSER_MAX)}`);
  assert.equal(lung.browser.length, BROWSER_MAX);
  assert.ok(lung.browser.startsWith('A B C x'), lung.browser.slice(0, 10));
  assert.deepEqual(curataAplicatia(lung), lung);
  // Tăietura care lasă un spațiu la capăt nu-l păstrează (serverul ar scoate spațiul: aceeași valoare, dar „curată” de la noi).
  const cuSpatiu = app(`${'y'.repeat(BROWSER_MAX - 1)} z`);
  assert.equal(cuSpatiu.browser, 'y'.repeat(BROWSER_MAX - 1));
  assert.deepEqual(curataAplicatia(cuSpatiu), cuSpatiu);
  for (const gol of ['', '   ', '\u0001\u0002']) {
    assert.equal(app(gol).browser, 'necunoscut', JSON.stringify(gol));
    assert.notEqual(curataAplicatia(app(gol)), null);
  }
});

test('planul e cel de azi: proba trecută, sau confirmată de prea mult timp, e „expirat”; fără drept, niciunul', () => {
  assert.equal(app('X', drept('proba', ACUM - 1)).plan, 'expirat');
  assert.equal(app('X', drept('gratuit', null, ACUM - 8 * ZI_MS)).plan, 'expirat');
  assert.equal(app('X', drept('personal', null)).plan, 'personal');
  assert.equal(app('X', drept('dezactivat', null)).plan, 'dezactivat');
  assert.equal(app('X', null).plan, null);
});

test('erorile sesiunii: doar de la pornirea paginii, fără cele doar locale', () => {
  const vechi = intrare('veche', INCEPUT - 1);
  const locala = intrare('locală', INCEPUT + 1, { doarLocala: true });
  const prima = intrare('la pornire', INCEPUT);
  const noua = intrare('nouă', ACUM);
  assert.deepEqual(intrariSesiunii([vechi, prima, locala, noua], INCEPUT), [prima, noua]);
});

test('amprentele: o dată pe eroare (cea mai nouă apariție dă locul), fără repetiții, ultimele 20', async () => {
  const cerute: string[] = [];
  const falsa = async (i: IntrareEroare): Promise<string> => {
    cerute.push(i.mesaj);
    // Două mesaje care diferă doar prin cifre au aceeași amprentă, ca la server.
    return i.mesaj.replace(/\d+/g, '').padEnd(32, '0').slice(0, 32);
  };
  const intrari = [
    intrare('aaa 1', INCEPUT + 1), intrare('bbb', INCEPUT + 2), intrare('aaa 1', INCEPUT + 3), intrare('aaa 2', INCEPUT + 4),
    intrare('veche', INCEPUT - 5), intrare('locala', INCEPUT + 6, { doarLocala: true }),
  ];
  assert.deepEqual(await amprenteleSesiunii(intrari, INCEPUT, falsa), ['bbb'.padEnd(32, '0'), 'aaa '.padEnd(32, '0')]);
  // „aaa 1” se amprentează o singură dată, în locul celei mai noi apariții; „aaa 2” e altă eroare (aceeași amprentă).
  assert.deepEqual(cerute, ['bbb', 'aaa 1', 'aaa 2']);
  cerute.length = 0;
  const multe = Array.from({ length: AMPRENTE_MAX + 5 }, (_, k) => intrare(`e${String.fromCharCode(97 + k)}`, INCEPUT + k));
  const a = await amprenteleSesiunii(multe, INCEPUT, falsa);
  assert.equal(a.length, AMPRENTE_MAX);
  assert.deepEqual(cerute, multe.slice(-AMPRENTE_MAX).map((i) => i.mesaj));
  assert.deepEqual(await amprenteleSesiunii([], INCEPUT, falsa), []);
});

test('amprenta din browser e id-ul serverului pentru raportul aceleiași erori (curățat, tăiat, cu rezerva pentru gol)', async () => {
  const cazuri: readonly Pick<IntrareEroare, 'tip' | 'mesaj'>[] = [
    { tip: 'randare', mesaj: "TypeError: Cannot read properties of undefined (reading 'x')" },
    { tip: 'promisiune', mesaj: 'Failed to fetch https://h.test/assets/Editare-Bx9kQ2aZ.js?v=3#x pentru ana@exemplu.ro, piesa 12' },
    { tip: 'salvare', mesaj: '   ' },
    { tip: 'import', mesaj: `Fișierul „ș” n-a mers: ${'a-b '.repeat(400)}` },
  ];
  for (const c of cazuri) {
    const raport = raportDin({ ...c, stiva: '', adresa: 'https://h.test/' }, 'b7f507e1a2c3', 'Edge', 'ro');
    const a = await amprentaRaportului(c);
    assert.match(a, RE_AMPRENTA);
    assert.equal(a, amprenta('client', raport.tip, raport.mesaj), c.mesaj.slice(0, 40));
  }
  // Rezerva și tăietura intră în amprentă: un mesaj gol e „eroare fără mesaj”, unul lung, doar primele 1 000 de caractere.
  assert.equal(await amprentaRaportului({ tip: 'salvare', mesaj: '' }), amprenta('client', 'salvare', MESAJ_GOL));
  const lung = 'z'.repeat(PLAFON_MESAJ);
  assert.equal(await amprentaRaportului({ tip: 'import', mesaj: `${lung}și restul` }), await amprentaRaportului({ tip: 'import', mesaj: lung }));
  // Ce trimite editorul trece de validarea serverului.
  assert.notEqual(curataAmprentele([await amprentaRaportului(cazuri[0]!)]), null);
});

test('proiectul atașat (15.B↑b): JSON-ul canonic al documentului, comprimat și în base64, se întoarce octet cu octet', async () => {
  // Cheile sortate la fiecare nivel, ca la salvarea din browser: același document, aceiași octeți.
  const doc = { schema: 20, b: 'ț', a: [1, 2.5, { z: null, y: true }] } as unknown as Document;
  const o = octetiProiect(doc);
  assert.equal(new TextDecoder().decode(o), '{"a":[1,2.5,{"y":true,"z":null}],"b":"ț","schema":20}');
  const p = await proiectPentruRaportare(o);
  assert.equal(Buffer.from(p, 'base64').toString('base64'), p, 'base64 canonic (serverul îl cere așa)');
  assert.deepEqual([...Buffer.from(p, 'base64').subarray(0, 2)], [0x1f, 0x8b], 'gzip');
  assert.deepEqual(new Uint8Array(gunzipSync(Buffer.from(p, 'base64'))), o);
});

test('base64-ul proiectului e al pozei (aceeași funcție, copiată ca bucata contului să nu aducă contractul pozei)', () => {
  // Lungimile din jurul bucăților de 32 768 de octeți (fiecare trecere prin `String.fromCharCode`) și ale umpluturii.
  for (const n of [0, 1, 2, 3, 4, 0x7fff, 0x8000, 0x8001, 0x10000 + 2, 100_003]) {
    const o = Uint8Array.from({ length: n }, (_, i) => (i * 131 + 7) % 256);
    assert.equal(inBase64(o), baza64(o), `${n} octeți`);
    assert.equal(inBase64(o), Buffer.from(o).toString('base64'), `${n} octeți, față de Node`);
  }
});

test('proiectul atașat: exact la 10 MB pleacă, peste nu (fereastra o spune lângă bifă)', async () => {
  assert.equal(PROIECT_MAX_OCTETI, 10 * 1024 * 1024);
  assert.deepEqual([proiectPreaMare(PROIECT_MAX_OCTETI), proiectPreaMare(PROIECT_MAX_OCTETI + 1)], [false, true]);
  await assert.rejects(proiectPentruRaportare(new Uint8Array(PROIECT_MAX_OCTETI + 1)), RangeError);
  const plin = await proiectPentruRaportare(new Uint8Array(PROIECT_MAX_OCTETI).fill(0x20));
  assert.equal(gunzipSync(Buffer.from(plin, 'base64')).length, PROIECT_MAX_OCTETI);
  assert.ok(plin.length < 100_000, 'spațiile se comprimă mult: cererea rămâne mică');
});

test('mărimea citită: până la 999 kB în kB întregi, rotunjiți în sus; apoi MB cu o zecimală, în formatul limbii', () => {
  const caz: Array<[number, 'ro' | 'en', string]> = [
    [0, 'ro', '1 kB'], [1, 'ro', '1 kB'], [1024, 'ro', '1 kB'], [1025, 'en', '2 kB'], [850 * 1024, 'ro', '850 kB'],
    [999 * 1024, 'ro', '999 kB'], [999 * 1024 + 1, 'ro', '1 MB'], [1.25 * 1024 * 1024, 'ro', '1,3 MB'],
    [1.25 * 1024 * 1024, 'en', '1.3 MB'], [PROIECT_MAX_OCTETI, 'ro', '10 MB'], [PROIECT_MAX_OCTETI + 1, 'en', '10 MB'],
  ];
  for (const [octeti, limba, asteptat] of caz) assert.equal(marimeCitita(octeti, limba), asteptat, `${octeti} ${limba}`);
});

test('semnul raportărilor: doar întregi pozitivi; altfel, nimic de arătat', () => {
  const vazute: number[] = [];
  puneRaportariNecitite(3);
  assert.equal(raportariNecitite(), 3);
  for (const x of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 0]) {
    puneRaportariNecitite(x);
    vazute.push(raportariNecitite());
  }
  assert.deepEqual(vazute, [0, 0, 0, 0, 0]);
});
