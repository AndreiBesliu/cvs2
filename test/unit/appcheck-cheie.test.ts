/**
 * Cheia App Check a instanței, la publicare (felia 3.2, ADR 0043 §7): din răspunsul API-ului App Check
 * (`recaptchaEnterpriseConfig`) → cheia de site, „neînregistrat” sau eroare de citire (strict: un răspuns de altă formă
 * oprește publicarea); citirea cu clientul injectat (un fals care se poartă ca `apiv2.Client` al firebase-tools); apoi
 * `config.json` publicat, scris de `pregatestePublicare` cu dependențele injectate. Nicio cerere nu iese din mașină.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cheieDinRaspuns, citesteCheie, configInstanta, configPublicat, type ClientApi } from '../../scripts/appcheck-cheie.ts';
import { pregatestePublicare } from '../../scripts/pregateste-publicare.ts';
import { citesteConfig } from '../../src/app/config.ts';

const FIREBASE = { apiKey: 'k', authDomain: 'p.firebaseapp.com', projectId: 'p', appId: '1:1:web:1' };
const NUME = 'projects/1/apps/1:1:web:1/recaptchaEnterpriseConfig';
/** O cheie de site reCAPTCHA are 40 de caractere (litere, cifre, `-`, `_`). */
const CHEIE = '6LcAbCdEfGhIjKlMnOpQrStUvWxYz0123456789-';

test('înregistrată: cheia de site din răspuns', () => {
  assert.equal(CHEIE.length, 40);
  assert.deepEqual(cheieDinRaspuns(200, { name: NUME, siteKey: CHEIE, tokenTtl: '3600s' }), { stare: 'inregistrata', cheieSite: CHEIE });
});

test('neînregistrată: 404, sau 200 cu obiectul bun fără siteKey (doar numele și TTL-ul), sau siteKey gol', () => {
  assert.equal(cheieDinRaspuns(404, { error: { code: 404, status: 'NOT_FOUND' } }).stare, 'neinregistrata');
  assert.equal(cheieDinRaspuns(200, { name: NUME, tokenTtl: '3600s' }).stare, 'neinregistrata');
  assert.equal(cheieDinRaspuns(200, { name: NUME, siteKey: '' }).stare, 'neinregistrata');
});

test('altceva (drepturi, un corp ciudat) e o eroare de citire, nu „neînregistrat”', () => {
  const r = cheieDinRaspuns(403, { error: { status: 'PERMISSION_DENIED' } });
  assert.equal(r.stare, 'eroare');
  assert.ok(r.stare === 'eroare' && r.motiv.includes('403'));
  for (const corp of [null, 'text', [], [{ name: NUME, siteKey: CHEIE }], { error: { code: 500 } }, { siteKey: CHEIE }, { name: 42, siteKey: CHEIE },
    { name: 'projects/1/apps/1/altceva', siteKey: CHEIE }, { name: `${NUME}/x` }, { name: NUME, siteKey: 42 }]) {
    assert.equal(cheieDinRaspuns(200, corp).stare, 'eroare', JSON.stringify(corp));
  }
});

test('cheia de site strictă: prea lungă, prea scurtă, cu spații sau linie nouă = eroare (publicarea se oprește)', () => {
  for (const cheie of ['a'.repeat(101), 'a'.repeat(301), 'a'.repeat(19), `${CHEIE.slice(0, 20)} ${CHEIE.slice(21)}`, '   ', `${CHEIE}\n`, `${CHEIE.slice(0, 39)}.`]) {
    assert.equal(cheieDinRaspuns(200, { name: NUME, siteKey: cheie }).stare, 'eroare', JSON.stringify(cheie));
  }
  assert.equal(cheieDinRaspuns(200, { name: NUME, siteKey: 'a'.repeat(100) }).stare, 'inregistrata');
  assert.equal(cheieDinRaspuns(200, { name: NUME, siteKey: 'a_-'.repeat(7) }).stare, 'inregistrata');
});

/** Ca `apiv2.Client`: un status ≥ 400 aruncă, afară de `resolveOnHTTPError: true`. */
function clientFals(status: number, body: unknown): ClientApi & { readonly cai: string[] } {
  const cai: string[] = [];
  return {
    cai,
    get: async (cale, optiuni) => {
      cai.push(cale);
      if (status >= 400 && !optiuni?.resolveOnHTTPError) throw new Error(`HTTP Error: ${status}, Requested entity was not found.`);
      return { status, body };
    },
  };
}

test('citirea, cu clientul injectat: 404 = neînregistrată (avertisment), nu eroare; calea cerută e a aplicației', async () => {
  const c = clientFals(404, { error: { code: 404, status: 'NOT_FOUND' } });
  assert.deepEqual(await citesteCheie(c, 'proiect-x', '1:2:web:3'), { stare: 'neinregistrata' });
  assert.deepEqual(c.cai, ['/projects/proiect-x/apps/1:2:web:3/recaptchaEnterpriseConfig']);
});

test('citirea: 200 bun = cheia; 200 fără siteKey = neînregistrată; corp ciudat sau cheie strâmbă = eroare', async () => {
  assert.deepEqual(await citesteCheie(clientFals(200, { name: NUME, siteKey: CHEIE }), 'p', 'a'), { stare: 'inregistrata', cheieSite: CHEIE });
  assert.equal((await citesteCheie(clientFals(200, { name: NUME, tokenTtl: '3600s' }), 'p', 'a')).stare, 'neinregistrata');
  assert.equal((await citesteCheie(clientFals(200, [{ siteKey: CHEIE }]), 'p', 'a')).stare, 'eroare');
  assert.equal((await citesteCheie(clientFals(200, { name: NUME, siteKey: `${CHEIE} ` }), 'p', 'a')).stare, 'eroare');
  assert.equal((await citesteCheie(clientFals(403, { error: {} }), 'p', 'a')).stare, 'eroare');
});

test('citirea: eroarea de rețea a clientului = eroare de citire (oprește publicarea), cu motivul', async () => {
  const c: ClientApi = { get: () => Promise.reject(new Error('getaddrinfo ENOTFOUND firebaseappcheck.googleapis.com')) };
  const r = await citesteCheie(c, 'p', 'a');
  assert.equal(r.stare, 'eroare');
  assert.ok(r.stare === 'eroare' && r.motiv.includes('ENOTFOUND'));
});

test('config.json cu cheia: appCheck.cheieSite, valid după schema aplicației, fără avertisment', () => {
  const r = configInstanta('test', FIREBASE, { stare: 'inregistrata', cheieSite: CHEIE });
  assert.equal(r.avertisment, null);
  assert.deepEqual(r.config, { instanta: 'test', firebase: FIREBASE, appCheck: { cheieSite: CHEIE } });
  const citit = citesteConfig(JSON.stringify(r.config));
  assert.ok(citit.ok && citit.config.appCheck?.cheieSite === CHEIE);
});

test('neînregistrată: config fără appCheck și avertismentul clar (401 la raportor, pasul owner-ului), nu eșec', () => {
  const r = configInstanta('test', FIREBASE, { stare: 'neinregistrata' });
  assert.deepEqual(r.config, { instanta: 'test', firebase: FIREBASE });
  assert.ok(!('appCheck' in r.config));
  assert.match(r.avertisment ?? '', /App Check neînregistrat/);
  assert.match(r.avertisment ?? '', /401/);
  assert.match(r.avertisment ?? '', /owner/);
});

test('eroarea de citire oprește publicarea (aruncă), nu publică tăcut o instanță fără App Check', () => {
  assert.throws(() => configInstanta('test', FIREBASE, { stare: 'eroare', motiv: 'HTTP 403' }), /HTTP 403/);
});

test('textul config.json publicat (funcția pură): cu appCheck, citit de aplicație; un config pe care aplicația l-ar refuza aruncă', () => {
  const { json, avertisment } = configPublicat('test', FIREBASE, { stare: 'inregistrata', cheieSite: CHEIE });
  assert.equal(avertisment, null);
  assert.ok(json.endsWith('\n'));
  assert.deepEqual(JSON.parse(json), { instanta: 'test', firebase: FIREBASE, appCheck: { cheieSite: CHEIE } });
  const citit = citesteConfig(json);
  assert.ok(citit.ok && citit.config.appCheck?.cheieSite === CHEIE);
  assert.ok(!('appCheck' in JSON.parse(configPublicat('test', FIREBASE, { stare: 'neinregistrata' }).json)));
  assert.throws(() => configPublicat('test', { ...FIREBASE, apiKey: '' }, { stare: 'neinregistrata' }), /config\.json/);
});

test('pregătirea publicării (dependențele injectate) scrie config.json cu cheia App Check a instanței', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cncvs2-publicare-'));
  try {
    const dist = join(tmp, 'dist');
    mkdirSync(dist);
    writeFileSync(join(dist, 'index.html'), '<!doctype html>');
    const cerute: string[] = [];
    const dir = await pregatestePublicare({
      dist,
      dir: join(tmp, 'publicare'),
      configWeb: (p) => { cerute.push(`web ${p}`); return { ...FIREBASE, projectId: p }; },
      cheie: async (p, appId) => { cerute.push(`cheie ${p} ${appId}`); return { stare: 'inregistrata', cheieSite: CHEIE }; },
    });
    assert.deepEqual(cerute, ['web cncvectorstudio-test', 'cheie cncvectorstudio-test 1:1:web:1']);
    const config = JSON.parse(readFileSync(join(dir, 'public', 'config.json'), 'utf8')) as Record<string, unknown>;
    assert.deepEqual(config, { instanta: 'test', firebase: { ...FIREBASE, projectId: 'cncvectorstudio-test' }, appCheck: { cheieSite: CHEIE } });
    assert.equal(readFileSync(join(dir, 'public', 'index.html'), 'utf8'), '<!doctype html>');
    assert.match(readFileSync(join(dir, '.firebaserc'), 'utf8'), /cncvectorstudio-test/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('pregătirea publicării: antetul CSP din firebase.json poartă amprenta hărții importurilor din index.html-ul build-ului (ADR 0098)', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cncvs2-publicare-'));
  try {
    const dist = join(tmp, 'dist');
    mkdirSync(dist);
    // Amprenta, pe hârtie: base64(sha256) al textului dintre etichete, calculat cu `hashlib` din Python.
    writeFileSync(join(dist, 'index.html'), '<!doctype html><head><script type="importmap">{"imports":{"/assets/a-AAAAAAAA.js":"/assets/a-BBBBBBBB.js"}}</script></head>');
    const dir = await pregatestePublicare({
      dist,
      dir: join(tmp, 'publicare'),
      configWeb: (p) => ({ ...FIREBASE, projectId: p }),
      cheie: async () => ({ stare: 'inregistrata', cheieSite: CHEIE }),
    });
    const cfg = JSON.parse(readFileSync(join(dir, 'firebase.json'), 'utf8')) as {
      hosting: { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> };
    };
    const csp = cfg.hosting.headers.find((h) => h.source === '**')?.headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? '';
    assert.match(csp, /script-src 'self' 'sha256-k5SyWn6dTVsoqC1RdwYS3Fg\/VEL82ia4WxSZblb33zk=' /);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
