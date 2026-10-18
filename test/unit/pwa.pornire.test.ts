/**
 * Când pleacă înregistrarea workerului PWA (ADR 0045 §7, recenzia din 18.10): doar în build și doar unde browserul are
 * service worker (garda, funcție pură), la `PAUZA_PWA_MS` după prima randare (politica: după preîncărcările aplicației de
 * la 1 s, pe care instalarea, cu tot precache-ul, le-ar întârzia).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAUZA_PWA_MS, programeazaPwa, pwaPosibil } from '../../src/pwa/pornire.ts';

/** Preîncărcările aplicației (`App.tsx`: dialogurile, dicționarele, la 1 s după pornire). */
const PREINCARCARI_MS = 1_000;

test('politica: înregistrarea pleacă la 2 000 ms după prima randare, după preîncărcările de la 1 s', () => {
  assert.equal(PAUZA_PWA_MS, 2_000);
  assert.ok(PAUZA_PWA_MS > PREINCARCARI_MS);
});

test('garda: doar în build și doar cu service worker', () => {
  const cu = { serviceWorker: {} };
  const fara = {};
  assert.equal(pwaPosibil(true, cu), true);
  assert.equal(pwaPosibil(false, cu), false, 'serverul de dezvoltare n-are /sw.js');
  assert.equal(pwaPosibil(true, fara), false, 'browserul fără service worker');
  assert.equal(pwaPosibil(false, fara), false);
  // Proprietatea există, chiar nedefinită (un browser care o ascunde așa): tot `in` decide, ca până acum.
  assert.equal(pwaPosibil(true, { serviceWorker: undefined }), true);
});

/** Un `setTimeout` fals: ține minte pauza și funcția, fără să le ruleze. */
function ceas(): { readonly programate: Array<[() => void, number]>; readonly amana: (f: () => void, ms: number) => void } {
  const programate: Array<[() => void, number]> = [];
  return { programate, amana: (f, ms) => { programate.push([f, ms]); } };
}

test('programarea: în build, cu service worker, o singură pornire, după PAUZA_PWA_MS (nu imediat)', () => {
  const c = ceas();
  let porniri = 0;
  programeazaPwa({ prod: true, nav: { serviceWorker: {} }, amana: c.amana, porneste: () => { porniri++; } });
  assert.equal(c.programate.length, 1);
  assert.equal(c.programate[0]?.[1], PAUZA_PWA_MS);
  assert.equal(porniri, 0, 'nimic înaintea pauzei');
  c.programate[0]?.[0]();
  assert.equal(porniri, 1);
});

test('programarea: în dezvoltare sau fără service worker, nimic (nicio pauză, nicio pornire)', () => {
  for (const [prod, nav] of [[false, { serviceWorker: {} }], [true, {}], [false, {}]] as const) {
    const c = ceas();
    let porniri = 0;
    programeazaPwa({ prod, nav, amana: c.amana, porneste: () => { porniri++; } });
    assert.deepEqual(c.programate, [], `prod=${String(prod)}`);
    assert.equal(porniri, 0);
  }
});
