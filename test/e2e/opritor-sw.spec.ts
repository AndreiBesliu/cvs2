/**
 * Opritorul workerului ediției întâi (`public/sw.js`): pe adresa de test, aplicația veche își lăsase un service worker la
 * `/sw.js`, cu cache-urile `cncvs-…`. Un browser care îl are trebuie să-l piardă la prima vizită, fără reîncărcare forțată.
 */
import { test, expect } from '@playwright/test';

test('workerul de la /sw.js șterge cache-urile vechi cncvs-… și se dezînregistrează singur; altele rămân', async ({ page }) => {
  await page.goto('/');
  const rezultat = await page.evaluate(async () => {
    await (await caches.open('cncvs-shell-v41')).put('/vechi', new Response('aplicatia veche'));
    await (await caches.open('alt-cache')).put('/x', new Response('x'));
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    // Așteaptă până se dezînregistrează singur (activarea lui o face).
    for (let i = 0; i < 100; i++) {
      if ((await navigator.serviceWorker.getRegistrations()).length === 0) break;
      await new Promise((r) => { setTimeout(r, 50); });
    }
    return {
      inregistrari: (await navigator.serviceWorker.getRegistrations()).length,
      cacheuri: (await caches.keys()).sort(),
      scope: reg.scope,
    };
  });
  expect(rezultat.inregistrari).toBe(0);
  expect(rezultat.cacheuri).toEqual(['alt-cache']);
  // Pagina deschisă nu s-a reîncărcat: aplicația e tot acolo.
  await expect(page.getByTestId('lista-vectori')).toBeVisible();
});
