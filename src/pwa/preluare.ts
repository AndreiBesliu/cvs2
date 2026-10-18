/**
 * Preluarea de la aplicația veche (ADR 0045 §6). Ediția întâi își lăsase un service worker exact la `/sw.js`, pe tot
 * site-ul, cu cache-urile `cncvs-…`; până la felia asta, `public/sw.js` (opritorul) le ștergea și se dezînregistra.
 * Workerul PWA stă la aceeași adresă, deci ia locul opritorului și face el curățenia:
 * - la instalare întreabă dacă aplicația veche a fost aici, DOAR prin `keys()`: `caches.open(nume)` ar crea cache-ul
 *   întrebat (lecția din OurDays), iar întrebarea de la instalarea următoare ar primi „da” la nesfârșit;
 * - la activare șterge cache-urile ei și precache-urile workbox vechi ale acestui scope (alt nume decât cel curent).
 */

/** Prefixul cache-urilor ediției întâi. Al nostru e `cncvs2-`, care NU începe cu el. */
export const PREFIX_EDITIA_INTAI = 'cncvs-';

type CacheuriChei = Pick<CacheStorage, 'keys'>;
type CacheuriSterse = Pick<CacheStorage, 'keys' | 'delete'>;

/** Aplicația veche a fost aici: există măcar un cache al ei. Nu creează nimic. */
export async function aplicatiaVecheAici(c: CacheuriChei): Promise<boolean> {
  return (await c.keys()).some((n) => n.startsWith(PREFIX_EDITIA_INTAI));
}

/**
 * Pură: ce se șterge la activare. Cache-urile ediției întâi și orice precache workbox al acestui scope care nu e cel curent
 * (o schemă veche a lui workbox, alt prefix), cum face `cleanupOutdatedCaches` din workbox. Restul (configurația, cache-uri
 * străine, precache-ul altui scope) rămâne.
 */
export function cacheuriDeSters(nume: readonly string[], precacheCurent: string, scope: string): string[] {
  return nume.filter((n) => n.startsWith(PREFIX_EDITIA_INTAI) || (n.includes('-precache-') && n.includes(scope) && n !== precacheCurent));
}

/** Curățenia de la activare; întoarce ce a șters. */
export async function curataLaActivare(c: CacheuriSterse, precacheCurent: string, scope: string): Promise<string[]> {
  const sterse = cacheuriDeSters(await c.keys(), precacheCurent, scope);
  for (const n of sterse) await c.delete(n);
  return sterse;
}
