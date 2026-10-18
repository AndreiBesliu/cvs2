/**
 * Navigările pe care workerul PWA le servește cu `index.html` din precache (ADR 0045 §4): o LISTĂ ALBĂ, doar ruta
 * aplicației, `/` (cu orice query: `/?diagnostic=…`) și `/index.html`, pe originea workerului. Orice altă navigare merge în
 * rețea, neatinsă (recenzia din 18.10):
 * - `/admin`: doar online; din rețea, deci după o publicare vine versiunea nouă (din precache ar veni pornirea veche, iar
 *   pagina ei, care nu e în precache, ar lipsi de pe hosting: 404, la fiecare reîncărcare);
 * - `/__/*`: paginile rezervate Firebase (`/__/auth/handler`, `/__/auth/iframe`). authDomain e chiar originea instanței,
 *   deci popup-ul login-ului Google de pe `/admin` ar primi aplicația în locul handler-ului;
 * - `/banc/*` (bancul vizual) și orice rută necunoscută: 404-ul serverului rămâne 404, nu devine aplicația.
 *
 * O listă neagră (ca până la recenzie) uita tocmai ce nu știa: o rută nouă a hosting-ului ar fi primit aplicația.
 */

/** Căile ruta aplicației (ce servește hosting-ul cu `index.html`, în afară de `/admin`). */
export const CAI_APLICATIE = ['/', '/index.html'] as const;

/** Pură: navigarea la `url` e a aplicației, deci workerul o servește din precache. */
export function esteNavigareaAplicatiei(url: URL, origine: string): boolean {
  return url.origin === origine && (CAI_APLICATIE as readonly string[]).includes(url.pathname);
}
