/**
 * `config.json` prin workerul PWA (ADR 0045 §3): din rețea întâi, cu termen scurt, iar la eșec ultima copie BUNĂ, din
 * cache-ul cu nume propriu (`cncvs2-config`). Rețeaua și cache-ul sunt false; falsul cache-ului creează la `open` și
 * respectă `cacheName` la `match`, ca browserul (`pwa-fals.ts`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TERMEN_CONFIG_MS } from '../../src/app/config.ts';
import { CACHE_CONFIG, CALE_CONFIG, copieLaInstalare, raspunsConfig, TERMEN_CONFIG_SW_MS, TERMEN_COPIE_INSTALARE_MS } from '../../src/pwa/configSw.ts';
import { CacheStorageFals } from './pwa-fals.ts';

const URL_CONFIG = 'http://localhost:4173/config.json';
const cerere = (): Request => new Request(URL_CONFIG);
const json = (o: object, status = 200): Response => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
const dupa = <T>(ms: number, f: () => T): Promise<T> => new Promise((ok) => { setTimeout(() => { ok(f()); }, ms); });
const TERMEN = 30;

test('termenul workerului e sub cel al aplicației (4 s), cu loc pentru copia din cache', () => {
  assert.ok(TERMEN_CONFIG_SW_MS > 0);
  assert.ok(TERMEN_CONFIG_SW_MS <= TERMEN_CONFIG_MS - 1000, `${TERMEN_CONFIG_SW_MS} ms față de ${TERMEN_CONFIG_MS} ms`);
  assert.ok(CACHE_CONFIG.startsWith('cncvs2-'));
  // Aceeași cale pe care o cere aplicația (`src/app/config.ts`), deci aceeași cheie în cache.
  assert.equal(CALE_CONFIG, '/config.json');
  assert.equal(new URL(CALE_CONFIG, 'http://localhost:4173/').href, URL_CONFIG);
});

test('rețeaua răspunde: vine răspunsul ei, iar copia bună ajunge în cache-ul propriu', async () => {
  const caches = new CacheStorageFals();
  const { raspuns, fundal } = raspunsConfig(cerere(), { fetch: async () => json({ instanta: 'test' }), caches, termenMs: TERMEN });
  assert.deepEqual(await (await raspuns).json(), { instanta: 'test' });
  await fundal;
  assert.deepEqual(await caches.keys(), [CACHE_CONFIG]);
  assert.deepEqual(await (await caches.match(URL_CONFIG, { cacheName: CACHE_CONFIG }))?.json(), { instanta: 'test' });
});

test('rețeaua căzută: ultima copie bună, din cache-ul propriu', async () => {
  const caches = new CacheStorageFals();
  await caches.pune(CACHE_CONFIG, URL_CONFIG, '{"instanta":"test"}');
  const { raspuns, fundal } = raspunsConfig(cerere(), { fetch: async () => { throw new TypeError('Failed to fetch'); }, caches, termenMs: TERMEN });
  assert.deepEqual(await (await raspuns).json(), { instanta: 'test' });
  await fundal;
});

test('rețeaua lentă, peste termen: copia vine fără s-o aștepte; răspunsul întârziat înlocuiește copia în fundal', async () => {
  const caches = new CacheStorageFals();
  await caches.pune(CACHE_CONFIG, URL_CONFIG, '{"instanta":"test"}');
  const inceput = Date.now();
  const { raspuns, fundal } = raspunsConfig(cerere(), { fetch: () => dupa(TERMEN * 10, () => json({ instanta: 'live' })), caches, termenMs: TERMEN });
  assert.deepEqual(await (await raspuns).json(), { instanta: 'test' });
  assert.ok(Date.now() - inceput < TERMEN * 8, 'copia a așteptat rețeaua');
  await fundal;
  assert.deepEqual(await (await caches.match(URL_CONFIG, { cacheName: CACHE_CONFIG }))?.json(), { instanta: 'live' });
});

test('rețeaua lentă, fără copie: se așteaptă rețeaua (aplicația are termenul ei)', async () => {
  const caches = new CacheStorageFals();
  const { raspuns } = raspunsConfig(cerere(), { fetch: () => dupa(TERMEN * 3, () => json({ instanta: 'live' })), caches, termenMs: TERMEN });
  assert.deepEqual(await (await raspuns).json(), { instanta: 'live' });
});

test('un răspuns prost (500, JSON stricat) nu acoperă copia bună și nu intră în cache', async () => {
  for (const prost of [() => json({ eroare: 1 }, 500), () => new Response('<html>nu</html>', { status: 200 })]) {
    const caches = new CacheStorageFals();
    await caches.pune(CACHE_CONFIG, URL_CONFIG, '{"instanta":"test"}');
    const { raspuns, fundal } = raspunsConfig(cerere(), { fetch: async () => prost(), caches, termenMs: TERMEN });
    assert.deepEqual(await (await raspuns).json(), { instanta: 'test' });
    await fundal;
    assert.deepEqual(await (await caches.match(URL_CONFIG, { cacheName: CACHE_CONFIG }))?.json(), { instanta: 'test' });
  }
});

test('un răspuns prost fără copie: aplicația primește răspunsul rețelei (își spune singură motivul)', async () => {
  const caches = new CacheStorageFals();
  const { raspuns, fundal } = raspunsConfig(cerere(), { fetch: async () => json({}, 404), caches, termenMs: TERMEN });
  assert.equal((await raspuns).status, 404);
  await fundal;
  assert.deepEqual(await caches.keys(), []);
});

test('copia dintr-un ALT cache nu se folosește, iar căutarea nu creează cache-ul propriu', async () => {
  const caches = new CacheStorageFals();
  await caches.pune('alt-cache', URL_CONFIG, '{"instanta":"live"}');
  const { raspuns, fundal } = raspunsConfig(cerere(), { fetch: async () => { throw new TypeError('Failed to fetch'); }, caches, termenMs: TERMEN });
  await assert.rejects(raspuns, /Failed to fetch/);
  await fundal;
  assert.deepEqual(await caches.keys(), ['alt-cache']);
});

/**
 * Copia de la instalare (recenzia din 18.10): prima încărcare nu e a workerului (fără `clients.claim()`), deci cererea ei
 * pentru `config.json` nu trece prin el. Fără copia de la instalare, după O SINGURĂ vizită online, offline aplicația ar
 * porni cu „Instanța: necunoscută”. Workerul cere singur `config.json`, ocolind cache-ul HTTP, și păstrează doar o copie
 * bună, cu același cod ca strategia de mai sus.
 */
test('instalarea: cere config.json din rețea (`no-store`) și pune copia bună în cache-ul propriu', async () => {
  const caches = new CacheStorageFals();
  const cereri: Request[] = [];
  await copieLaInstalare(URL_CONFIG, { fetch: async (c) => { cereri.push(c); return json({ instanta: 'test' }); }, caches });
  assert.equal(cereri.length, 1);
  assert.equal(cereri[0]?.url, URL_CONFIG);
  assert.equal(cereri[0]?.cache, 'no-store');
  assert.deepEqual(await caches.keys(), [CACHE_CONFIG]);
  assert.deepEqual(await (await caches.match(URL_CONFIG, { cacheName: CACHE_CONFIG }))?.json(), { instanta: 'test' });
});

test('instalarea: un răspuns prost (500, JSON stricat, listă) nu intră și nu acoperă copia bună; fără copie, nu creează cache-ul', async () => {
  const prosti = [() => json({ eroare: 1 }, 500), () => new Response('<html>nu</html>', { status: 200 }), () => new Response('[1]', { status: 200 }), () => new Response('null', { status: 200 })];
  for (const prost of prosti) {
    const goale = new CacheStorageFals();
    await copieLaInstalare(URL_CONFIG, { fetch: async () => prost(), caches: goale });
    assert.deepEqual(await goale.keys(), []);
    const cuCopie = new CacheStorageFals();
    await cuCopie.pune(CACHE_CONFIG, URL_CONFIG, '{"instanta":"test"}');
    await copieLaInstalare(URL_CONFIG, { fetch: async () => prost(), caches: cuCopie });
    assert.deepEqual(await (await cuCopie.match(URL_CONFIG, { cacheName: CACHE_CONFIG }))?.json(), { instanta: 'test' });
  }
});

test('instalarea nu cade când cererea cade (respinsă sau aruncată pe loc) și nu creează nimic', async () => {
  for (const cade of [async (): Promise<Response> => { throw new TypeError('Failed to fetch'); }, (): Promise<Response> => { throw new TypeError('sincron'); }]) {
    const caches = new CacheStorageFals();
    await copieLaInstalare(URL_CONFIG, { fetch: cade, caches });
    assert.deepEqual(await caches.keys(), []);
  }
});

test('instalarea nu cade când cache-ul refuză scrierea (cota plină)', async () => {
  const caches = new CacheStorageFals();
  const refuza = { open: async () => ({ put: async () => { throw new DOMException('plin', 'QuotaExceededError'); } }), match: caches.match.bind(caches) };
  await copieLaInstalare(URL_CONFIG, { fetch: async () => json({ instanta: 'test' }), caches: refuza });
});

test('instalarea nu stă agățată pe un config.json care nu răspunde: după termenul ei se încheie, fără copie (reverificarea 18.10)', async () => {
  const caches = new CacheStorageFals();
  const t0 = Date.now();
  await copieLaInstalare(URL_CONFIG, { fetch: () => new Promise<Response>(() => undefined), caches, termenMs: 30 });
  assert.ok(Date.now() - t0 < 1_000, `${Date.now() - t0} ms`);
  assert.deepEqual(await caches.keys(), []);
  assert.equal(TERMEN_COPIE_INSTALARE_MS, 10_000);
});
