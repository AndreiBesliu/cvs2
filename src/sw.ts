/// <reference lib="webworker" />
/**
 * Workerul PWA (ADR 0045; ADR 0017: Vite + vite-plugin-pwa, strategia `injectManifest`). Build-ul îl scrie la `/sw.js`,
 * adresa la care ediția întâi își avea workerul (și, până la felia asta, opritorul lui): îl înlocuiește pe loc.
 *
 * - Precache: lista o pune build-ul în `self.__WB_MANIFEST`, filtrată de `shared/precache.ts` (index.html, toate bucățile
 *   aplicației, cu cele la cerere, ambele dicționare și raportorul de erori; fără pagina `/admin`, `config.json`,
 *   `/banc/`). Workbox o aduce la instalare și scoate la activare ce nu mai e în ea; până la activare, workerul vechi
 *   servește setul lui, întreg.
 * - Navigările: DOAR ruta aplicației (`/` cu orice query, `/index.html`) primește `index.html` din precache
 *   (`src/pwa/navigare.ts`, listă albă); `/admin`, `/__/*` (paginile rezervate Firebase), `/banc/*` și orice rută
 *   necunoscută merg în rețea, neatinse. O bucată lipsă din `/assets/*` e 404, nu o pagină.
 * - `config.json`: rețeaua întâi, cu termen scurt, apoi ultima copie bună (`src/pwa/configSw.ts`); prima copie o pune
 *   instalarea.
 * - Progresul instalării (ADR 0097): după fiecare fișier al precache-ului, procentul pleacă la filele deschise
 *   (`src/pwa/progres.ts`), și la cele pe care workerul nu le controlează încă (prima vizită, versiunea veche).
 * - Actualizarea: un worker nou așteaptă clicul din aplicație (`SKIP_WAITING`). Excepția e preluarea de la aplicația
 *   veche (cache-uri `cncvs-` la instalare): atunci se activează imediat, ca opritorul de până acum, fără să reîncarce
 *   vreo filă. Fără `clients.claim()`: pagina deschisă rămâne a cui era (offline merge de la a doua încărcare).
 */
import { cacheNames, setCacheNameDetails } from 'workbox-core';
import { addPlugins, createHandlerBoundToURL, precacheAndRoute, type PrecacheEntry } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CALE_CONFIG, copieLaInstalare, raspunsConfig } from './pwa/configSw.ts';
import { esteNavigareaAplicatiei } from './pwa/navigare.ts';
import { aplicatiaVecheAici, curataLaActivare } from './pwa/preluare.ts';
import { pluginProgres } from './pwa/progres.ts';
import { esteCerereProgres, esteSkipWaiting } from './pwa/protocol.ts';

/** Manifestul, cu mărimea fiecărui fișier pusă de build (`vite.config.ts`, ADR 0097). */
declare const self: ServiceWorkerGlobalScope & { readonly __WB_MANIFEST: ReadonlyArray<(PrecacheEntry & { readonly marime?: number }) | string> };

// Precache-ul se numește `cncvs2-precache-v2-<scope>`: nu începe cu `cncvs-`, deci curățenia preluării nu-l atinge.
setCacheNameDetails({ prefix: 'cncvs2' });
// `cleanURLs: false`: altfel `/index` (sau `/x` pentru orice `x.html` din precache) ar primi index.html, deși hosting-ul
// dă 404. `/` rămâne al precache-ului (`directoryIndex`).
const manifest = [...self.__WB_MANIFEST];
precacheAndRoute(manifest, { cleanURLs: false });
const progres = pluginProgres(manifest, self.location.href, async (m) => {
  for (const c of await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })) c.postMessage(m);
});
addPlugins([progres.plugin]);

// Navigările: listă albă, doar ruta aplicației (`src/pwa/navigare.ts`). `/admin`, `/__/*`, `/banc/*` și rutele
// necunoscute merg în rețea, neatinse.
registerRoute(
  ({ request, url }) => request.mode === 'navigate' && esteNavigareaAplicatiei(url, self.location.origin),
  createHandlerBoundToURL('/index.html'),
);

registerRoute(
  ({ url, sameOrigin }) => sameOrigin && url.pathname === CALE_CONFIG,
  ({ request, event }) => {
    const { raspuns, fundal } = raspunsConfig(request, { fetch: (c) => fetch(c), caches: self.caches });
    (event as ExtendableEvent).waitUntil(fundal);
    return raspuns;
  },
);

// La instalare: preluarea de la aplicația veche și prima copie a lui `config.json` (prima încărcare nu trece prin worker,
// deci fără ea, offline după o singură vizită n-ar exista configurație). Copia nu respinge: instalarea nu cade din ea.
self.addEventListener('install', (e) => {
  e.waitUntil(Promise.all([
    aplicatiaVecheAici(self.caches).then((veche) => (veche ? self.skipWaiting() : undefined)),
    copieLaInstalare(new URL(CALE_CONFIG, self.location.origin).href, { fetch: (c) => fetch(c), caches: self.caches }),
  ]));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(curataLaActivare(self.caches, cacheNames.precache, self.registration.scope));
});

self.addEventListener('message', (e) => {
  if (esteSkipWaiting(e.data)) void self.skipWaiting();
  // O filă care a început să asculte în mijlocul instalării (ADR 0097): progresul de până acum, doar ei.
  else if (esteCerereProgres(e.data)) {
    const m = progres.stare();
    if (m && e.source) e.source.postMessage(m);
  }
});
