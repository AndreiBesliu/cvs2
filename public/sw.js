/*
 * Opritorul workerului vechi. Aplicația din ediția întâi (CNC Vector Studio) își înregistra un service worker exact la
 * `/sw.js`, pe tot site-ul, cu cache-urile `cncvs-…`, și nu se actualiza singur (aștepta un clic). Pe aceeași adresă,
 * un browser care a deschis-o vreodată ar servi în continuare aplicația veche din cache, peste cea nouă.
 *
 * Browserul verifică singur, la fiecare navigare, dacă `/sw.js` s-a schimbat; versiunea asta se instalează imediat, șterge
 * cache-urile vechi și se dezînregistrează. NU reîncarcă nicio filă deschisă: o filă cu aplicația veche poate avea muncă
 * nesalvată. Următoarea deschidere încarcă aplicația nouă din rețea.
 *
 * Când aplicația nouă primește workerul ei de PWA (ADR 0017), acela ia locul fișierului ăstuia și trebuie să șteargă și
 * el cache-urile `cncvs-` rămase.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const nume of await caches.keys()) {
      if (nume.startsWith('cncvs-')) await caches.delete(nume);
    }
    await self.registration.unregister();
  })());
});
