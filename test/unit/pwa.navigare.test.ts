/**
 * Navigările pe care workerul PWA le servește cu `index.html` din precache (ADR 0045 §4, recenzia din 18.10): DOAR ruta
 * aplicației, `/` (cu orice query) și `/index.html`, pe originea lui. Restul merge în rețea, neatins: `/admin` (doar online,
 * deci după o publicare vine versiunea nouă), paginile rezervate Firebase `/__/*` (handler-ul login-ului Google din popup,
 * cu authDomain pe aceeași origine), bancul `/banc/*` și orice rută necunoscută (404-ul serverului rămâne 404).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAI_APLICATIE, esteNavigareaAplicatiei } from '../../src/pwa/navigare.ts';

const ORIGINE = 'https://cncvectorstudio-test.firebaseapp.com';
const nav = (cale: string, origine = ORIGINE): boolean => esteNavigareaAplicatiei(new URL(cale, ORIGINE), origine);

test('ruta aplicației: `/` cu orice query și `/index.html`', () => {
  for (const c of ['/', '/?proba=1', '/?diagnostic=eroare-de-randare', '/?utm_source=x&a=b', '/index.html', '/index.html?x=1', '/#ancora']) {
    assert.equal(nav(c), true, c);
  }
  assert.deepEqual([...CAI_APLICATIE], ['/', '/index.html']);
});

test('/admin nu: e doar online, din rețea (după o publicare primește versiunea nouă)', () => {
  for (const c of ['/admin', '/admin/', '/admin/erori', '/admin?x=1']) assert.equal(nav(c), false, c);
});

test('paginile rezervate Firebase (`/__/*`) nu: login-ul Google din popup trebuie să ajungă la handler', () => {
  for (const c of ['/__/auth/handler', '/__/auth/handler?apiKey=k&authType=signInViaPopup', '/__/auth/iframe', '/__/firebase/init.json', '/__/']) {
    assert.equal(nav(c), false, c);
  }
});

test('bancul vizual și rutele necunoscute nu: 404-ul serverului rămâne 404', () => {
  for (const c of ['/banc', '/banc/', '/banc/index.html', '/ceva/necunoscut', '/index', '/index.htm', '/index.html/', '/indexhtml', '/gol.html']) {
    assert.equal(nav(c), false, c);
  }
});

test('fișierele (`/assets/*`, `config.json`, `sw.js`) nu sunt navigări ale aplicației', () => {
  for (const c of ['/assets/index-abcdEF12.js', '/assets/', '/config.json', '/sw.js', '/favicon.svg']) assert.equal(nav(c), false, c);
});

test('altă origine nu, nici cu aceeași cale', () => {
  assert.equal(esteNavigareaAplicatiei(new URL('https://cncvectorstudio.com/'), ORIGINE), false);
  assert.equal(esteNavigareaAplicatiei(new URL('http://cncvectorstudio-test.firebaseapp.com/'), ORIGINE), false);
  assert.equal(nav('/', 'https://alt.example'), false);
});

test('lista albă e sensibilă la majuscule, ca hosting-ul (`/INDEX.HTML` dă 404 acolo): reverificarea 18.10', () => {
  for (const c of ['/INDEX.HTML', '/Index.html', '/ADMIN', '/__/AUTH/handler']) assert.equal(nav(c), false, c);
});
