/**
 * Când pleacă înregistrarea workerului PWA (ADR 0045 §7), scos din `main.tsx` ca să se poată proba (recenzia din 18.10):
 * doar în build și doar unde browserul are service worker, la `PAUZA_PWA_MS` după prima randare. Modulul e mic și stă în
 * pornire; înregistrarea însăși (`inregistrare.ts`, cu adresa `/sw.js`) vine la cerere.
 */

/**
 * Pauza dintre prima randare și înregistrarea workerului: după preîncărcările aplicației (1 s, `App.tsx`), pe care
 * instalarea lui (tot precache-ul, ~200 kB) le-ar întârzia.
 */
export const PAUZA_PWA_MS = 2000;

/** Pură: workerul se poate înregistra doar în build (serverul de dezvoltare n-are `/sw.js`) și doar cu service worker. */
export function pwaPosibil(prod: boolean, nav: object): boolean {
  return prod && 'serviceWorker' in nav;
}

export interface DepsProgramare {
  /** `import.meta.env.PROD`. */
  readonly prod: boolean;
  /** `navigator`. */
  readonly nav: object;
  /** Implicit `setTimeout`. */
  readonly amana?: (f: () => void, ms: number) => void;
  /** Înregistrarea (importul bucății ei). */
  readonly porneste: () => void;
}

/** Programează înregistrarea, o singură dată, după pauză; în dezvoltare sau fără service worker, nimic. */
export function programeazaPwa(d: DepsProgramare): void {
  if (!pwaPosibil(d.prod, d.nav)) return;
  (d.amana ?? ((f, ms) => { setTimeout(f, ms); }))(d.porneste, PAUZA_PWA_MS);
}
