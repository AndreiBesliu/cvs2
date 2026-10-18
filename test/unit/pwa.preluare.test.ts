/**
 * Preluarea de la aplicația veche (ADR 0045 §6): la instalare, workerul întreabă dacă ediția întâi a fost aici (cache-uri
 * `cncvs-…`) fără să creeze nimic; la activare, șterge cache-urile ei și precache-urile workbox vechi, nimic altceva.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicatiaVecheAici, cacheuriDeSters, curataLaActivare, PREFIX_EDITIA_INTAI } from '../../src/pwa/preluare.ts';
import { CacheStorageFals } from './pwa-fals.ts';

const SCOPE = 'http://localhost:4173/';
const PRECACHE = `cncvs2-precache-v2-${SCOPE}`;

test('falsul se poartă ca browserul: open creează, match cu cacheName caută doar acolo', async () => {
  const c = new CacheStorageFals();
  await c.open('creat-de-open');
  assert.deepEqual(await c.keys(), ['creat-de-open']);
  await c.pune('a', '/config.json', 'din a');
  await c.pune('b', '/config.json', 'din b');
  assert.equal(await (await c.match('/config.json', { cacheName: 'b' }))?.text(), 'din b');
  assert.equal(await c.match('/config.json', { cacheName: 'lipsa' }), undefined);
  assert.equal(await (await c.match('/config.json'))?.text(), 'din a');
  // Întrebarea cu cacheName nu creează cache-ul întrebat.
  assert.deepEqual(await c.keys(), ['creat-de-open', 'a', 'b']);
});

test('aplicația veche: prefixul ediției întâi e `cncvs-` (cel din opritorul de până acum), nu `cncvs2-`', () => {
  assert.equal(PREFIX_EDITIA_INTAI, 'cncvs-');
  assert.equal('cncvs2-config'.startsWith(PREFIX_EDITIA_INTAI), false);
});

test('la instalare: doar cache-urile `cncvs-` spun că aplicația veche a fost aici; întrebarea nu creează nimic', async () => {
  const gol = new CacheStorageFals();
  assert.equal(await aplicatiaVecheAici(gol), false);
  assert.deepEqual(await gol.keys(), []);

  const nou = new CacheStorageFals();
  await nou.pune(PRECACHE, '/index.html', 'x');
  await nou.pune('cncvs2-config', '/config.json', '{}');
  await nou.pune('alt-cache', '/x', 'x');
  assert.equal(await aplicatiaVecheAici(nou), false);
  assert.deepEqual(await nou.keys(), [PRECACHE, 'cncvs2-config', 'alt-cache']);

  const vechi = new CacheStorageFals();
  await vechi.pune('alt-cache', '/x', 'x');
  await vechi.pune('cncvs-shell-v41', '/vechi', 'aplicația veche');
  assert.equal(await aplicatiaVecheAici(vechi), true);
  assert.deepEqual(await vechi.keys(), ['alt-cache', 'cncvs-shell-v41']);
});

test('la activare: se șterg cache-urile `cncvs-` și precache-urile workbox vechi ale acestui scope; restul rămâne', async () => {
  const nume = [
    'cncvs-shell-v41', 'cncvs-runtime', PRECACHE, 'cncvs2-config', 'alt-cache',
    `workbox-precache-v2-${SCOPE}`, `cncvs2-precache-${SCOPE}`, 'workbox-precache-v2-http://alt.exemplu/',
  ];
  assert.deepEqual(cacheuriDeSters(nume, PRECACHE, SCOPE), [
    'cncvs-shell-v41', 'cncvs-runtime', `workbox-precache-v2-${SCOPE}`, `cncvs2-precache-${SCOPE}`,
  ]);

  const c = new CacheStorageFals();
  for (const n of nume) await c.pune(n, '/x', n);
  const sterse = await curataLaActivare(c, PRECACHE, SCOPE);
  assert.deepEqual(sterse, ['cncvs-shell-v41', 'cncvs-runtime', `workbox-precache-v2-${SCOPE}`, `cncvs2-precache-${SCOPE}`]);
  assert.deepEqual(await c.keys(), [PRECACHE, 'cncvs2-config', 'alt-cache', 'workbox-precache-v2-http://alt.exemplu/']);
});

test('la activare, fără aplicația veche: nimic de șters, nimic creat', async () => {
  const c = new CacheStorageFals();
  await c.pune(PRECACHE, '/index.html', 'x');
  assert.deepEqual(await curataLaActivare(c, PRECACHE, SCOPE), []);
  assert.deepEqual(await c.keys(), [PRECACHE]);
});
