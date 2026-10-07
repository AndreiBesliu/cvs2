// Sonda 4: PWA care pornește offline și se actualizează curat. Două build-uri reale (v1, v2), servite pe 5177.
// „Offline” e probat în două feluri: modul offline al Playwright ȘI serverul oprit de tot (rețea reală absentă).
// Oracol: trei markeri independenți (JS, CSS, JSON) trebuie să arate ACEEAȘI versiune; un amestec = aplicație veche.
// Rulare: node p4-pwa.mjs   (cere p4-pwa/dist-v1 și dist-v2; le face `node p4-pwa/build-pwa.mjs`)
import { chromium } from 'playwright-core';
import { rmSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { startServer, ORIGIN, LAUNCH } from './lib/server.mjs';
if (!existsSync('p4-pwa/dist-v2/sw.js')) execFileSync(process.execPath, ['p4-pwa/build-pwa.mjs'], { stdio: 'inherit' });
const PROFILE = 'out/prof-pwa';
rmSync(PROFILE, { recursive: true, force: true });
const steps = [];
const log = (name, v) => { steps.push({ step: name, ...v }); console.log(name.padEnd(46), JSON.stringify(v)); };
const markers = async (pg) => {
  await pg.waitForFunction(() => window.__js && window.__data, null, { timeout: 15000 });
  return pg.evaluate(async () => ({
    js: window.__js, css: document.getElementById('css').textContent, data: window.__data,
    controlled: !!navigator.serviceWorker.controller,
    caches: await Promise.all((await caches.keys()).map(async (k) => ({ k, n: (await (await caches.open(k)).keys()).map((r) => new URL(r.url).pathname.replace(/\?.*/, '')).sort() }))),
  }));
};
const same = (m, v) => m.js === v && m.css === v && m.data === v;
let srv = await startServer('p4-pwa/dist-v1');
const ctx = await chromium.launchPersistentContext(PROFILE, { ...LAUNCH, headless: true });
const pg = ctx.pages()[0] ?? (await ctx.newPage());
const result = {};
try {
  await pg.goto(ORIGIN + '/');
  await pg.waitForFunction(() => window.__offlineReady === true, null, { timeout: 20000 });
  await pg.reload();
  let m = await markers(pg); log('1. online v1, după precache', { js: m.js, css: m.css, data: m.data, controlled: m.controlled });
  result.v1Online = same(m, 'v1') && m.controlled;

  await ctx.setOffline(true);
  await pg.reload(); m = await markers(pg); log('2. Playwright offline, reîncărcare', { js: m.js, css: m.css, data: m.data });
  result.offlinePlaywright = same(m, 'v1');
  await pg.goto(ORIGIN + '/proiect/123'); m = await markers(pg); log('2b. offline, adresă adâncă /proiect/123', { js: m.js, data: m.data });
  result.offlineDeepLink = same(m, 'v1');
  await ctx.setOffline(false);

  await srv.close();
  await pg.goto(ORIGIN + '/'); m = await markers(pg); log('3. server OPRIT, pornire', { js: m.js, css: m.css, data: m.data });
  result.offlineServerDown = same(m, 'v1');

  srv = await startServer('p4-pwa/dist-v2');
  await pg.reload();
  await pg.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await pg.waitForFunction(() => window.__needRefresh === true, null, { timeout: 20000 });
  m = await markers(pg); log('4. v2 publicat: actualizare OFERITĂ, nu impusă', { js: m.js, css: m.css, data: m.data, needRefresh: true });
  result.updateOfferedStillV1 = same(m, 'v1');
  await pg.reload(); m = await markers(pg); log('4b. reîncărcare fără accept: tot v1, întreg', { js: m.js, css: m.css, data: m.data });
  result.reloadWithoutAcceptV1 = same(m, 'v1');

  const nav = pg.waitForEvent('framenavigated', { timeout: 20000 });
  await pg.evaluate(() => window.__needRefresh ? window.__update() : null);
  await nav; await pg.waitForLoadState('load');
  m = await markers(pg); log('5. accept: v2', { js: m.js, css: m.css, data: m.data, caches: m.caches.map((c) => c.k + ':' + c.n.join(',')) });
  result.afterAcceptV2 = same(m, 'v2');
  const v1Assets = ['/assets/index-' ]; // numele cu hash se compară mai jos
  result.cacheEntries = m.caches.flatMap((c) => c.n);

  await srv.close(); srv = null;
  await pg.reload(); m = await markers(pg); log('6. server OPRIT după actualizare', { js: m.js, css: m.css, data: m.data });
  result.offlineV2 = same(m, 'v2');
} finally { await ctx.close(); if (srv) await srv.close(); }
// MARTOR: același build, dar cu service worker-ul blocat. Cu serverul oprit, pornirea TREBUIE să pice;
// altfel proba de offline ar fi oarbă (ar trece și fără SW).
{
  rmSync(PROFILE + '-martor', { recursive: true, force: true });
  let s2 = await startServer('p4-pwa/dist-v2');
  const c2 = await chromium.launchPersistentContext(PROFILE + '-martor', { ...LAUNCH, headless: true, serviceWorkers: 'block' });
  const p2 = c2.pages()[0] ?? (await c2.newPage());
  try {
    await p2.goto(ORIGIN + '/'); const online = await markers(p2);
    await s2.close(); s2 = null;
    const off = await p2.reload().then(() => markers(p2)).then((x) => x.js, (e) => 'EȘEC: ' + String(e.message).split(String.fromCharCode(10))[0].slice(0, 60));
    result.controlNoSW = { online: online.js, offline: off, failsAsExpected: off.startsWith('EȘEC') };
    log('M. martor fără SW, server oprit', result.controlNoSW);
  } finally { await c2.close(); if (s2) await s2.close(); }
}
// Intrările din cache trebuie să fie exact fișierele din precache-ul v2 (nimic rămas din v1)
const v2files = ['index.html', 'data.json', 'manifest.webmanifest', ...execFileSync('node', ['-e', "console.log(require('fs').readdirSync('p4-pwa/dist-v2/assets').join(','))"], { encoding: 'utf8' }).trim().split(',').map((f) => 'assets/' + f)].map((f) => '/' + f).sort();
result.cacheIsExactlyV2 = JSON.stringify([...new Set(result.cacheEntries)].sort()) === JSON.stringify(v2files);
result.expectedV2 = v2files;
console.log(JSON.stringify(result, null, 1));
writeFileSync('out/p4-pwa.json', JSON.stringify({ steps, result }, null, 1));
