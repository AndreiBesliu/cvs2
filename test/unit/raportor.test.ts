/**
 * Raportorul de erori din client (felia 3.2, ADR 0043): partea din pornire (`src/app/raportorPornire.ts`: coada, plafoanele,
 * stingerea, reîncercarea) cu o trimitere falsă și un ceas manual, plus trimiterea (`src/cloud/raportor.ts`: tokenul App
 * Check cerut înaintea primului apel, termenele proprii, traducerea răspunsurilor și a erorilor Firebase) cu apelul injectat.
 * Firebase pornește aici doar în proba cu SDK-ul real a erorilor (un `fetch` fals, nicio cerere în afară).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { PLAFON_MESAJ, PLAFON_SCURT, PLAFON_STIVA, valideazaRaport, type RaportClient } from '../../shared/erori.ts';
import { creeazaJurnal, type Jurnal } from '../../src/app/jurnalErori.ts';
import {
  MESAJ_GOL, PAUZA_REINCERCARE_MS, PLAFON_COADA, PLAFON_PE_CHEIE, PLAFON_SESIUNE, cheieLocala, creeazaRaportor, curataText,
  descrieStare, raportDin, type DepsRaportor,
} from '../../src/app/raportorPornire.ts';
import {
  TERMEN_APEL_MS, TERMEN_APP_CHECK_MS, dinEroare, dinRaspuns, trimitereDin, type Amana, type ModulRaportor, type RezultatTrimitere,
  type Trimitere,
} from '../../src/cloud/raportor.ts';

const ACUM = new Date('2026-10-17T12:00:00.000Z');
const CONFIG = { firebase: { apiKey: 'k', authDomain: 'p.firebaseapp.com', projectId: 'p', appId: '1:1:web:1' } };

/**
 * Lasă să se termine tot lanțul de microtaskuri (importul fals, trimiterile false, una după alta): un macrotask vine
 * abia după ce coada de microtaskuri s-a golit, inclusiv de cele adăugate între timp.
 */
const asteapta = (): Promise<void> => new Promise((ok) => { setImmediate(ok); });

interface Banc {
  readonly jurnal: Jurnal;
  readonly trimise: RaportClient[];
  readonly avertismente: string[];
  readonly pauze: Array<{ ms: number; f: () => void }>;
  /** Ordinea pregătirilor și a trimiterilor (`p` / `t`). */
  readonly evenimente: string[];
  adus: number;
  create: number;
  /** Ce răspunde pregătirea (tokenul App Check); implicit „gata”. */
  pregatire: () => Promise<boolean>;
  /** Ce răspunde trimiterea la apelul n (numărat de la 0); implicit „trimis”. */
  raspuns: (n: number, r: RaportClient) => RezultatTrimitere | Promise<RezultatTrimitere>;
  deps: DepsRaportor;
}

function banc(peste: Partial<DepsRaportor> = {}, faraConexiune = false): Banc {
  const jurnal = creeazaJurnal(null, () => ACUM, () => 'https://cncvectorstudio-test.firebaseapp.com/admin?token=secret#x');
  const b: Banc = {
    jurnal, trimise: [], avertismente: [], pauze: [], evenimente: [], adus: 0, create: 0,
    pregatire: () => Promise.resolve(true),
    raspuns: () => 'trimis',
    deps: undefined as unknown as DepsRaportor,
  };
  const trimitere: Trimitere = {
    pregateste: () => { b.evenimente.push('p'); return b.pregatire(); },
    trimite: async (r) => {
      const n = b.trimise.length;
      b.evenimente.push('t');
      b.trimise.push(r);
      return b.raspuns(n, r);
    },
  };
  const modul: ModulRaportor = { creeazaTrimitere: () => { b.create++; return faraConexiune ? null : trimitere; } };
  b.deps = {
    jurnal,
    adu: () => { b.adus++; return Promise.resolve(modul); },
    build: 'b-proba',
    browser: 'Edge/1',
    limba: () => 'ro',
    amana: (f, ms) => { b.pauze.push({ ms, f }); },
    avertizeaza: (m) => { b.avertismente.push(m); },
    ...peste,
  };
  return b;
}

/** Un ceas manual pentru termenele trimiterii: fiecare termen pornit, cu durata lui și dacă a fost oprit. */
function ceas(): { readonly termene: Array<{ ms: number; f: () => void; oprit: boolean }>; readonly amana: Amana } {
  const termene: Array<{ ms: number; f: () => void; oprit: boolean }> = [];
  return {
    termene,
    amana: (f, ms) => {
      const x = { ms, f, oprit: false };
      termene.push(x);
      return () => { x.oprit = true; };
    },
  };
}

const niciodata = <T>(): Promise<T> => new Promise<T>(() => undefined);

/* ── Politica, fixată (recenzia 17.10: testele relative la constante n-ar vedea o constantă schimbată) ─────────────── */

test('constantele de politică: 20 pe sesiune, 3 pe cheie, coada 20, pauza 5 s, termenul apelului 30 s, al tokenului 10 s', () => {
  assert.equal(PLAFON_SESIUNE, 20);
  assert.equal(PLAFON_PE_CHEIE, 3);
  assert.equal(PLAFON_COADA, 20);
  assert.equal(PAUZA_REINCERCARE_MS, 5_000);
  assert.equal(TERMEN_APEL_MS, 30_000);
  assert.equal(TERMEN_APP_CHECK_MS, 10_000);
});

/* ── Raportul ───────────────────────────────────────────────────────────────────────────────────────────────────── */

test('raportul: câmpurile din intrare, adresa fără query și fragment, build-ul, browserul și limba; nimic altceva', () => {
  const r = raportDin(
    { cand: ACUM.toISOString(), tip: 'randare', mesaj: 'Error: bum', stiva: 'at x', adresa: 'https://h/a/b?q=1#f' },
    'b1', 'Edge', 'en',
  );
  assert.deepEqual(r, { tip: 'randare', mesaj: 'Error: bum', stiva: 'at x', adresa: 'https://h/a/b', build: 'b1', browser: 'Edge', limba: 'en' });
  assert.deepEqual(Object.keys(r).sort(), ['adresa', 'browser', 'build', 'limba', 'mesaj', 'stiva', 'tip']);
});

test('adresa doar cu fragment (fără query) pleacă fără fragment', () => {
  const r = raportDin({ cand: '', tip: 'fereastra', mesaj: 'm', stiva: '', adresa: 'https://h/a#access_token=SECRET' }, 'b', 'u', 'ro');
  assert.equal(r.adresa, 'https://h/a');
});

test('raportul se taie la plafoanele contractului (browserul lung, mesajul și stiva lungi)', () => {
  const r = raportDin(
    { cand: '', tip: 'fereastra', mesaj: 'm'.repeat(PLAFON_MESAJ + 10), stiva: 's'.repeat(PLAFON_STIVA + 10), adresa: `https://h/${'a'.repeat(900)}` },
    'b'.repeat(PLAFON_SCURT + 5), 'u'.repeat(PLAFON_SCURT + 50), 'ro',
  );
  assert.ok(r.browser.startsWith('u'.repeat(PLAFON_SCURT)) && r.browser.endsWith('… (+50)'), r.browser.slice(-12));
  assert.ok(r.build.endsWith('… (+5)'));
  assert.ok(r.mesaj.endsWith('… (+10)'));
  assert.ok(r.stiva.endsWith('… (+10)'));
  assert.ok(r.adresa.length < 520, String(r.adresa.length));
});

test('curățarea textelor trimise: query-ul și fragmentul adreselor devin „?…”, e-mailurile devin <email>; jurnalul local rămâne neatins', () => {
  const j = creeazaJurnal(null, () => ACUM, () => '/');
  j.adauga('fereastra', new Error('cererea https://api.exemplu.ro/x?token=SECRETMSG a căzut pentru andrei@exemplu.ro'));
  const intrare = j.citeste()[0];
  assert.ok(intrare);
  const r = raportDin(intrare, 'b', 'u', 'ro');
  assert.equal(r.mesaj, 'Error: cererea https://api.exemplu.ro/x?… a căzut pentru <email>');
  assert.ok(!r.stiva.includes('SECRETMSG') && !r.stiva.includes('andrei@'), r.stiva.slice(0, 200));
  assert.ok(r.stiva.includes('https://api.exemplu.ro/x?…'));
  assert.ok(intrare.mesaj.includes('SECRETMSG') && intrare.mesaj.includes('andrei@exemplu.ro'), 'jurnalul local păstrează textul întreg');
  assert.equal(curataText('vezi http://h/a#acces=SECRETF aici'), 'vezi http://h/a?… aici');
  assert.equal(curataText('fetch("https://h/p?k=1") a căzut'), 'fetch("https://h/p?…") a căzut');
  assert.equal(curataText('at https://h/assets/index-AbCdEf12.js:1:200'), 'at https://h/assets/index-AbCdEf12.js:1:200', 'stiva aplicației rămâne');
  assert.equal(curataText('a.b+c@sub.exemplu.ro, x@y'), '<email>, x@y');
});

test('curățarea e liniară: texte lungi, fără adrese sau e-mailuri, trec repede', () => {
  const lungi = [
    'a'.repeat(4_000), 'a-'.repeat(2_000), `${'a'.repeat(3_000)}@${'b'.repeat(990)}`, 'https://'.repeat(500), 'a@'.repeat(2_000),
    `${'x.'.repeat(1_500)}@`,
  ];
  const t0 = performance.now();
  for (let i = 0; i < 20; i++) for (const s of lungi) curataText(s);
  const ms = performance.now() - t0;
  assert.ok(ms < 150, `${ms.toFixed(1)} ms pentru 120 de texte de ~4 000 de caractere`);
});

test('un mesaj gol sau doar din spații primește textul de rezervă, ca serverul să nu-l refuze', () => {
  for (const mesaj of ['', '   ', '\n\t']) {
    const r = raportDin({ cand: '', tip: 'promisiune', mesaj, stiva: '', adresa: 'https://h/' }, 'b', 'u', 'ro');
    assert.equal(r.mesaj, MESAJ_GOL);
    assert.equal(valideazaRaport(r).ok, true, JSON.stringify(mesaj));
  }
  assert.equal(raportDin({ cand: '', tip: 'promisiune', mesaj: ' x ', stiva: '', adresa: '' }, 'b', 'u', 'ro').mesaj, ' x ');
});

test('browserul din raport: implicit user-agentul (main.tsx nu-l mai dă de mână)', async () => {
  const b = banc();
  const { browser: _scos, ...faraBrowser } = b.deps;
  const r = creeazaRaportor(faraBrowser);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  await asteapta();
  assert.ok(navigator.userAgent.length > 0);
  assert.equal(b.trimise[0]?.browser, navigator.userAgent);
});

/* ── Coada, plafoanele, cheia ───────────────────────────────────────────────────────────────────────────────────── */

test('coada dinaintea configurației: intrările așteaptă, nimic nu se descarcă; la configurație pleacă, în ordine', async () => {
  const b = banc();
  const r = creeazaRaportor(b.deps);
  b.jurnal.adauga('promisiune', 'dicționarul n-a venit');
  b.jurnal.adauga('fereastra', new TypeError('x'));
  await asteapta();
  assert.equal(b.adus, 0, 'fără configurație, bucata raportorului nu se cere');
  assert.equal(r.stare().inAsteptare, 2);
  r.porneste(CONFIG);
  await asteapta();
  assert.deepEqual(b.trimise.map((t) => t.mesaj), ['dicționarul n-a venit', 'TypeError: x']);
  assert.equal(b.trimise[0]?.adresa, 'https://cncvectorstudio-test.firebaseapp.com/admin');
  assert.equal(b.trimise[0]?.build, 'b-proba');
  assert.equal(r.stare().trimise, 2);
  assert.equal(r.stare().inAsteptare, 0);
  assert.equal(b.adus, 1);
});

test('doar intrările acestei sesiuni pleacă: cele din depozitul de dinainte nu se retrimit', async () => {
  const date = new Map<string, string>();
  const depozit = { getItem: (k: string) => date.get(k) ?? null, setItem: (k: string, v: string) => { date.set(k, v); }, removeItem: (k: string) => { date.delete(k); } };
  creeazaJurnal(depozit, () => ACUM, () => '/').adauga('fereastra', 'veche');
  const jurnal = creeazaJurnal(depozit, () => ACUM, () => '/');
  const b = banc({ jurnal });
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  await asteapta();
  assert.equal(b.adus, 0, 'nicio intrare nouă: nimic de trimis, nimic adus');
  jurnal.adauga('fereastra', 'nouă');
  await asteapta();
  assert.deepEqual(b.trimise.map((t) => t.mesaj), ['nouă']);
});

test('condițiile de operare (intrările „doar locale”) nu pleacă și nu aduc nimic; o eroare adevărată după ele pleacă', async () => {
  const b = banc();
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adaugaLocala('proiect', 'browserul n-are IndexedDB');
  b.jurnal.adaugaLocala('promisiune', new TypeError('Failed to fetch dynamically imported module'));
  await asteapta();
  assert.equal(b.adus, 0, 'nicio descărcare pentru o condiție a mediului');
  assert.equal(r.stare().locale, 2);
  assert.equal(r.stare().inAsteptare, 0);
  b.jurnal.adauga('fereastra', 'un defect');
  await asteapta();
  assert.deepEqual(b.trimise.map((t) => t.mesaj), ['un defect']);
  assert.equal(b.jurnal.citeste().length, 3, 'în jurnalul local rămân toate');
});

test('fără firebase în configurație: stins, coada golită, nimic descărcat, nici mai târziu', async () => {
  const b = banc();
  const r = creeazaRaportor(b.deps);
  b.jurnal.adauga('fereastra', 'a');
  r.porneste({});
  b.jurnal.adauga('fereastra', 'b');
  await asteapta();
  assert.equal(b.adus, 0);
  assert.equal(r.stare().faza, 'stins');
  assert.equal(r.stare().motiv, 'fara-firebase');
  assert.equal(r.stare().inAsteptare, 0);
  assert.equal(r.stare().renuntate, 2);
  assert.deepEqual(b.avertismente, [], 'local, fără Firebase, e starea normală: niciun avertisment');
});

test('configurația nevalidă (null) stinge la fel', async () => {
  const b = banc();
  const r = creeazaRaportor(b.deps);
  r.porneste(null);
  b.jurnal.adauga('config', 'config.json: HTTP 404');
  await asteapta();
  assert.equal(b.adus, 0);
  assert.equal(r.stare().motiv, 'fara-firebase');
});

test(`plafonul pe sesiune: cel mult ${PLAFON_SESIUNE} de rapoarte, restul numărate`, async () => {
  const b = banc();
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  for (let i = 0; i < PLAFON_SESIUNE + 7; i++) b.jurnal.adauga('fereastra', `eroarea nr. ${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}`);
  await asteapta();
  assert.equal(b.trimise.length, PLAFON_SESIUNE);
  assert.equal(r.stare().pestePlafon, 7);
});

test(`plafonul pe sesiune și cu erorile venite rar (coada nu se umple niciodată): tot ${PLAFON_SESIUNE}`, async () => {
  const b = banc();
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  for (let i = 0; i < PLAFON_SESIUNE + 5; i++) {
    b.jurnal.adauga('fereastra', `rară ${'x'.repeat(i)}`);
    await asteapta();
    assert.ok(r.stare().inAsteptare <= PLAFON_COADA);
  }
  assert.equal(b.trimise.length, PLAFON_SESIUNE);
  assert.equal(r.stare().pestePlafon, 5);
});

test(`plafonul pe cheie: cel mult ${PLAFON_PE_CHEIE} cu aceeași cheie (cifrele înlocuite), apoi altă eroare trece`, async () => {
  const b = banc();
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  for (let i = 1; i <= 5; i++) b.jurnal.adauga('fereastra', `piesa ${i * 7} lipsă`);
  b.jurnal.adauga('promisiune', 'piesa 9 lipsă');
  b.jurnal.adauga('fereastra', 'alta');
  await asteapta();
  assert.deepEqual(b.trimise.map((t) => `${t.tip}:${t.mesaj}`), [
    'fereastra:piesa 7 lipsă', 'fereastra:piesa 14 lipsă', 'fereastra:piesa 21 lipsă', 'promisiune:piesa 9 lipsă', 'fereastra:alta',
  ]);
  assert.equal(r.stare().pestePlafon, 2);
});

test('cheia locală: tipul și mesajul, cifrele înlocuite, tăiată la 300', () => {
  assert.equal(cheieLocala('fereastra', 'piesa 12 lipsă'), cheieLocala('fereastra', 'piesa 3 lipsă'));
  assert.notEqual(cheieLocala('fereastra', 'piesa 1 lipsă'), cheieLocala('promisiune', 'piesa 1 lipsă'));
  assert.notEqual(cheieLocala('fereastra', 'piesa lipsă'), cheieLocala('fereastra', 'cotă lipsă'));
  assert.ok(cheieLocala('fereastra', 'x'.repeat(5_000)).length <= 'fereastra|'.length + 300);
  assert.equal(cheieLocala('fereastra', `${'x'.repeat(300)}A`), cheieLocala('fereastra', `${'x'.repeat(300)}B`), 'doar primele 300');
});

test('un mesaj lung în kebab-case, repetat: ieftin pe eroare (și peste plafon), iar plafonul pe cheie ține', async () => {
  const b = banc();
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  const kebab = Array.from({ length: 200 }, (_, i) => `cls-${i}`).join('-');
  const t0 = performance.now();
  for (let i = 0; i < 10; i++) b.jurnal.adauga('fereastra', kebab);
  const ms = performance.now() - t0;
  await asteapta();
  assert.equal(b.trimise.length, PLAFON_PE_CHEIE);
  assert.equal(r.stare().pestePlafon, 10 - PLAFON_PE_CHEIE);
  // Cheia pe amprenta serverului (regexurile normalizării) costa ~90 ms pe eroare la mesajul ăsta (recenzia 17.10).
  assert.ok(ms < 40, `${ms.toFixed(1)} ms pentru 10 erori`);
});

test(`coada în așteptare are plafon (${PLAFON_COADA}) înaintea configurației`, async () => {
  const b = banc();
  const r = creeazaRaportor(b.deps);
  for (let i = 0; i < PLAFON_COADA + 5; i++) b.jurnal.adauga('fereastra', `e-${'x'.repeat(i)}`);
  assert.equal(r.stare().inAsteptare, PLAFON_COADA);
  assert.equal(r.stare().pestePlafon, 5);
  r.porneste(CONFIG);
  await asteapta();
  assert.equal(b.trimise.length, PLAFON_COADA);
});

/* ── Stingerea ──────────────────────────────────────────────────────────────────────────────────────────────────── */

for (const [rez, motiv] of [['neautorizat', 'neautorizat'], ['plafon', 'plafon-server']] as const) {
  test(`răspunsul „${rez}” stinge raportorul pentru sesiune: restul nu mai pleacă, un singur avertisment`, async () => {
    const b = banc();
    b.raspuns = () => rez;
    const r = creeazaRaportor(b.deps);
    b.jurnal.adauga('fereastra', 'a');
    b.jurnal.adauga('fereastra', 'b');
    r.porneste(CONFIG);
    await asteapta();
    b.jurnal.adauga('fereastra', 'c');
    await asteapta();
    assert.equal(b.trimise.length, 1);
    assert.equal(r.stare().faza, 'stins');
    assert.equal(r.stare().motiv, motiv);
    assert.equal(r.stare().refuzate, 1);
    assert.equal(r.stare().renuntate, 2);
    assert.equal(b.avertismente.length, 1);
  });
}

test('„nevalid” se numără, iar raportorul merge mai departe', async () => {
  const b = banc();
  b.raspuns = (n) => (n === 0 ? 'nevalid' : 'trimis');
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  b.jurnal.adauga('fereastra', 'b');
  await asteapta();
  assert.equal(r.stare().refuzate, 1);
  assert.equal(r.stare().trimise, 1);
  assert.equal(r.stare().faza, 'pornit');
});

test('bucata la cerere care nu vine: stins pentru sesiune, cerută o singură dată, fără respingere scăpată', async () => {
  const b = banc({ adu: () => { b.adus++; return Promise.reject(new Error('Failed to fetch dynamically imported module')); } });
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  await asteapta();
  b.jurnal.adauga('fereastra', 'b');
  await asteapta();
  assert.equal(b.adus, 1);
  assert.equal(r.stare().motiv, 'import');
  assert.equal(r.stare().renuntate, 2);
  assert.equal(b.avertismente.length, 1);
});

test('emulatoarele în afara gazdei locale (conexiunea refuzată): stins, nimic trimis', async () => {
  const b = banc({}, true);
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  await asteapta();
  assert.equal(b.create, 1);
  assert.equal(r.stare().motiv, 'fara-conexiune');
});

test('conexiunea care aruncă la creare: stins (fara-conexiune), nu agățat în „pornit”', async () => {
  const b = banc({
    adu: () => Promise.resolve({ creeazaTrimitere: () => { throw new Error('already-initialized'); } }),
  });
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  await asteapta();
  assert.equal(r.stare().faza, 'stins');
  assert.equal(r.stare().motiv, 'fara-conexiune');
  assert.equal(r.stare().renuntate, 1);
  assert.equal(b.avertismente.length, 1);
});

test('tokenul App Check cerut înaintea primului apel, o singură dată pe sesiune', async () => {
  const b = banc();
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  b.jurnal.adauga('fereastra', 'b');
  await asteapta();
  b.jurnal.adauga('fereastra', 'c');
  await asteapta();
  assert.deepEqual(b.evenimente, ['p', 't', 't', 't']);
  assert.equal(r.stare().trimise, 3);
});

test('tokenul App Check care nu vine (sau aruncă): stins pentru sesiune („app-check”), coada golită, un avertisment, niciun apel', async () => {
  const b = banc();
  b.pregatire = () => Promise.resolve(false);
  const r = creeazaRaportor(b.deps);
  b.jurnal.adauga('fereastra', 'a');
  b.jurnal.adauga('fereastra', 'b');
  r.porneste(CONFIG);
  await asteapta();
  b.jurnal.adauga('fereastra', 'c');
  await asteapta();
  assert.deepEqual(b.trimise, []);
  assert.equal(r.stare().faza, 'stins');
  assert.equal(r.stare().motiv, 'app-check');
  assert.equal(r.stare().inAsteptare, 0);
  assert.equal(r.stare().renuntate, 3);
  assert.deepEqual(b.avertismente, ['raportorul de erori: stins (app-check)']);
  assert.deepEqual(b.evenimente, ['p'], 'tokenul cerut o singură dată');
});

test('o pregătire care respinge (neașteptat) stinge la fel, fără respingere scăpată', async () => {
  const b = banc();
  b.pregatire = () => Promise.reject(new Error('neașteptat'));
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  await asteapta();
  assert.equal(r.stare().motiv, 'app-check');
});

/* ── Rețeaua, termenul, reîncercarea ────────────────────────────────────────────────────────────────────────────── */

test('rețeaua căzută: o singură reîncercare, după pauză; apoi renunță la raport, iar următorul pleacă', async () => {
  const b = banc();
  b.raspuns = (n) => (n < 2 ? 'retea' : 'trimis');
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  b.jurnal.adauga('fereastra', 'b');
  await asteapta();
  assert.equal(b.trimise.length, 1, 'reîncercarea așteaptă pauza');
  assert.equal(b.pauze.length, 1);
  assert.equal(b.pauze[0]?.ms, PAUZA_REINCERCARE_MS);
  b.pauze.shift()?.f();
  await asteapta();
  assert.deepEqual(b.trimise.map((t) => t.mesaj), ['a', 'a', 'b'], 'a: o încercare și o reîncercare; apoi b');
  assert.equal(b.pauze.length, 0, 'nicio a doua reîncercare');
  assert.equal(r.stare().esuate, 1);
  assert.equal(r.stare().trimise, 1);
  assert.equal(r.stare().faza, 'pornit');
});

test('reîncercarea reușită numără raportul trimis', async () => {
  const b = banc();
  b.raspuns = (n) => (n === 0 ? 'retea' : 'trimis');
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  await asteapta();
  b.pauze.shift()?.f();
  await asteapta();
  assert.equal(b.trimise.length, 2);
  assert.equal(r.stare().trimise, 1);
  assert.equal(r.stare().esuate, 0);
});

test('termenul depășit NU se reîncearcă (serverul poate fi scris deja): eșuat, raportorul merge mai departe', async () => {
  const b = banc();
  b.raspuns = (n) => (n === 0 ? 'termen' : 'trimis');
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  b.jurnal.adauga('fereastra', 'b');
  await asteapta();
  assert.deepEqual(b.trimise.map((t) => t.mesaj), ['a', 'b']);
  assert.equal(b.pauze.length, 0);
  assert.equal(r.stare().reincercari, 0);
  assert.equal(r.stare().esuate, 1);
  assert.equal(r.stare().trimise, 1);
});

test('o trimitere care aruncă e un eșec numărat, nu o respingere scăpată', async () => {
  const b = banc();
  b.raspuns = () => { throw new Error('neașteptat'); };
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  await asteapta();
  assert.equal(r.stare().esuate, 1);
  assert.equal(b.avertismente.length, 1);
});

test('fără buclă: eșecurile raportorului nu intră în jurnal (jurnalul are doar erorile omului)', async () => {
  const b = banc();
  b.raspuns = () => 'altul';
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  b.jurnal.adauga('fereastra', 'b');
  await asteapta();
  assert.equal(b.jurnal.citeste().length, 2);
  assert.equal(r.stare().esuate, 2);
  assert.equal(b.avertismente.length, 1, 'consola primește cel mult un avertisment');
});

test('fără dublă pornire: a doua configurație e ignorată, bucata vine o dată, fiecare raport pleacă o dată', async () => {
  const b = banc();
  const r = creeazaRaportor(b.deps);
  b.jurnal.adauga('fereastra', 'a');
  r.porneste(CONFIG);
  r.porneste(CONFIG);
  r.porneste({});
  await asteapta();
  b.jurnal.adauga('fereastra', 'b');
  await asteapta();
  assert.equal(b.adus, 1);
  assert.equal(b.create, 1);
  assert.deepEqual(b.trimise.map((t) => t.mesaj), ['a', 'b']);
  assert.equal(r.stare().faza, 'pornit');
});

test('trimiterile sunt pe rând: a doua așteaptă răspunsul primei', async () => {
  const b = banc();
  let elibereaza: (x: RezultatTrimitere) => void = () => undefined;
  b.raspuns = (n) => (n === 0 ? new Promise<RezultatTrimitere>((ok) => { elibereaza = ok; }) : 'trimis');
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  b.jurnal.adauga('fereastra', 'b');
  await asteapta();
  assert.equal(b.trimise.length, 1);
  elibereaza('neautorizat');
  await asteapta();
  assert.equal(b.trimise.length, 1, 'stins de primul răspuns: al doilea nu mai pleacă');
  assert.equal(r.stare().renuntate, 1);
});

test('golirea jurnalului nu produce raport', async () => {
  const b = banc();
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.goleste();
  await asteapta();
  assert.equal(b.adus, 0);
  assert.equal(r.stare().inAsteptare, 0);
});

/* ── Starea, în raportul jurnalului ─────────────────────────────────────────────────────────────────────────────── */

test('starea descrisă: faza, motivul stingerii și contoarele', async () => {
  const b = banc();
  b.pregatire = () => Promise.resolve(false);
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  b.jurnal.adaugaLocala('proiect', 'fără IndexedDB');
  await asteapta();
  const s = descrieStare(r.stare());
  assert.match(s, /^stins \(app-check\); /);
  for (const bucata of ['trimise 0', 'renuntate 1', 'locale 1', 'pestePlafon 0', 'inAsteptare 0']) assert.ok(s.includes(bucata), `lipsește „${bucata}”: ${s}`);
  assert.match(descrieStare(creeazaRaportor(banc().deps).stare()), /^asteapta-config; trimise 0/);
});

test('„Copiază raportul” poartă starea raportorului (antetul jurnalului, prin context)', async () => {
  const b = banc();
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  await asteapta();
  const raport = b.jurnal.raport({
    aplicatia: 'CNC Vector Studio', versiunea: 'v', instanta: 'test', limba: 'ro', browserul: 'u', raportorul: descrieStare(r.stare()),
  });
  assert.ok(raport.includes('raportorul: pornit; trimise 1'), raport.slice(0, 400));
});

/* ── Trimiterea (bucata la cerere), cu apelul și tokenul injectate ─────────────────────────────────────────────── */

test('trimiterea citește răspunsul din `data`: ok = trimis; { ok: false, motiv: plafon } = plafon (stinge pornirea)', async () => {
  const t = trimitereDin({ apel: async () => ({ data: { ok: true } }), token: null });
  assert.equal(await t.trimite({} as RaportClient), 'trimis');
  const p = trimitereDin({ apel: async () => ({ data: { ok: false, motiv: 'plafon' } }), token: null });
  assert.equal(await p.trimite({} as RaportClient), 'plafon');
});

test('raportorul cu trimiterea reală (apelul injectat): 200 { ok: false, motiv: plafon } stinge pentru sesiune', async () => {
  const apeluri: RaportClient[] = [];
  const t = trimitereDin({ apel: async (r) => { apeluri.push(r); return { data: { ok: false, motiv: 'plafon' } }; }, token: null });
  const b = banc({ adu: () => Promise.resolve({ creeazaTrimitere: () => t }) });
  const r = creeazaRaportor(b.deps);
  r.porneste(CONFIG);
  b.jurnal.adauga('fereastra', 'a');
  b.jurnal.adauga('fereastra', 'b');
  await asteapta();
  await asteapta();
  assert.equal(apeluri.length, 1);
  assert.equal(r.stare().motiv, 'plafon-server');
});

test('apelul care nu se încheie: „termen” după termenul propriu de 30 s (nu doar opțiunea SDK-ului)', async () => {
  const c = ceas();
  const t = trimitereDin({ apel: () => niciodata(), token: null, amana: c.amana });
  const rez = t.trimite({} as RaportClient);
  await asteapta();
  assert.equal(c.termene.length, 1);
  assert.equal(c.termene[0]?.ms, TERMEN_APEL_MS);
  c.termene[0]?.f();
  assert.equal(await rez, 'termen');
});

test('apelul încheiat la timp oprește termenul; o respingere e tradusă, un apel care aruncă e „altul”', async () => {
  const c = ceas();
  const ok = trimitereDin({ apel: async () => ({ data: { ok: true } }), token: null, amana: c.amana });
  assert.equal(await ok.trimite({} as RaportClient), 'trimis');
  assert.equal(c.termene[0]?.oprit, true);
  const respins = trimitereDin({ apel: () => Promise.reject({ code: 'functions/unauthenticated' }), token: null, amana: c.amana });
  assert.equal(await respins.trimite({} as RaportClient), 'neautorizat');
  const arunca = trimitereDin({ apel: () => { throw new Error('sincron'); }, token: null, amana: c.amana });
  assert.equal(await arunca.trimite({} as RaportClient), 'altul');
});

test('tokenul App Check care nu vine niciodată: pregătirea dă „nu” după termenul ei (10 s), fără să agațe', async () => {
  const c = ceas();
  const t = trimitereDin({ apel: async () => ({ data: { ok: true } }), token: () => niciodata(), amana: c.amana });
  const gata = t.pregateste();
  await asteapta();
  assert.equal(c.termene.length, 1);
  assert.equal(c.termene[0]?.ms, TERMEN_APP_CHECK_MS);
  c.termene[0]?.f();
  assert.equal(await gata, false);
});

test('tokenul App Check care aruncă: „nu” imediat; tokenul care vine: „da”, termenul oprit; fără App Check: „da”, fără termen', async () => {
  const c = ceas();
  assert.equal(await trimitereDin({ apel: async () => ({ data: {} }), token: () => Promise.reject(new Error('appCheck/recaptcha-error')), amana: c.amana }).pregateste(), false);
  assert.equal(c.termene[0]?.oprit, true);
  assert.equal(await trimitereDin({ apel: async () => ({ data: {} }), token: async () => ({ token: 't' }), amana: c.amana }).pregateste(), true);
  assert.equal(c.termene[1]?.oprit, true);
  assert.equal(await trimitereDin({ apel: async () => ({ data: {} }), token: null, amana: c.amana }).pregateste(), true);
  assert.equal(c.termene.length, 2);
});

test('răspunsul serverului: ok, nevalid, plafon; o scriere eșuată sau o formă necunoscută e „altul”', () => {
  assert.equal(dinRaspuns({ ok: true }), 'trimis');
  assert.equal(dinRaspuns({ ok: false, motiv: 'nevalid' }), 'nevalid');
  assert.equal(dinRaspuns({ ok: false, motiv: 'plafon' }), 'plafon');
  assert.equal(dinRaspuns({ ok: false, motiv: 'scriere' }), 'altul');
  assert.equal(dinRaspuns(null), 'altul');
  assert.equal(dinRaspuns({ ok: 'da' }), 'altul');
  assert.equal(dinRaspuns({ ok: 'da', motiv: 'plafon' }), 'altul', 'doar `ok: false` poartă un motiv');
});

test('erorile Firebase: 401 / 403 = neautorizat; doar cererea care n-a ajuns (status 0, unavailable) = rețea; termenul = termen; restul altul', () => {
  const e = (code: string, message = ''): { code: string; message: string } => ({ code, message });
  assert.equal(dinEroare(e('functions/unauthenticated')), 'neautorizat');
  assert.equal(dinEroare(e('functions/permission-denied')), 'neautorizat');
  assert.equal(dinEroare(e('functions/internal', 'internal [0]')), 'retea');
  assert.equal(dinEroare(e('functions/internal', 'INTERNAL [500]')), 'altul', 'un 500: serverul a primit cererea');
  assert.equal(dinEroare(e('functions/internal', 'Response is not valid JSON object.')), 'altul');
  assert.equal(dinEroare(e('functions/unavailable', 'unavailable [503]')), 'retea');
  assert.equal(dinEroare(e('functions/deadline-exceeded', 'deadline-exceeded')), 'termen');
  assert.equal(dinEroare(e('functions/resource-exhausted')), 'altul');
  assert.equal(dinEroare(e('unauthenticated')), 'neautorizat', 'și fără prefix');
  assert.equal(dinEroare(new Error('x')), 'altul');
  assert.equal(dinEroare(undefined), 'altul');
});

test('erorile SDK-ului real: fetch căzut (status 0) = rețea; 500 = altul; 503 = rețea; 401 = neautorizat', async () => {
  const app = initializeApp({ apiKey: 'k', authDomain: 'p.firebaseapp.com', projectId: 'proba-erori', appId: '1:1:web:1' }, 'proba-erori');
  const apel = httpsCallable(getFunctions(app, 'europe-central2'), 'logClientError', { timeout: 5_000 });
  const fetchVechi = globalThis.fetch;
  const cu = async (f: typeof fetch): Promise<RezultatTrimitere> => {
    globalThis.fetch = f;
    try {
      return await apel({}).then(() => 'trimis' as const, dinEroare);
    } finally {
      globalThis.fetch = fetchVechi;
    }
  };
  const raspuns = (status: number, corp: unknown): typeof fetch => async () => new Response(JSON.stringify(corp), { status, headers: { 'Content-Type': 'application/json' } });
  assert.equal(await cu(async () => { throw new TypeError('Failed to fetch'); }), 'retea');
  assert.equal(await cu(raspuns(500, { error: { status: 'INTERNAL', message: 'INTERNAL' } })), 'altul');
  assert.equal(await cu(raspuns(500, {})), 'altul');
  assert.equal(await cu(raspuns(503, {})), 'retea');
  assert.equal(await cu(raspuns(401, { error: { status: 'UNAUTHENTICATED', message: 'Unauthenticated' } })), 'neautorizat');
});
