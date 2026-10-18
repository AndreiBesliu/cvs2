/**
 * Ce ține workerul PWA în cache la instalare (ADR 0045 §2), scris o singură dată: îl aplică `vite.config.ts` pe
 * manifestul workerului și poarta (`scripts/build-determinist.ts`) pe build, la fiecare rulare.
 *
 * Intră tot ce trebuie ca aplicația să pornească și să lucreze fără rețea: `index.html`, favicon-ul și toate bucățile
 * JS / CSS din `assets/`, inclusiv cele la cerere (ferestrele, calculul exportului, alegerea cu clicul, workerul pânzei)
 * și ambele dicționare: offline, limba cealaltă și ferestrele altfel nu vin (ADR 0042). Intră și raportorul de erori cu
 * baza conexiunii (recenzia din 18.10): fila rămâne pe versiunea ei până la clicul pe „Reîncarcă”, deci și raportorul ei
 * trebuie să rămână disponibil după o publicare; altfel, bucata lui ar lipsi de pe hosting (404), iar prima eroare l-ar
 * stinge pe toată sesiunea.
 *
 * Rămân afară:
 * - pagina `/admin` (`PaginaAdmin`, cu ce aduce doar ea: stilul ei), doar online: navigarea la ea vine din rețea
 *   (`src/pwa/navigare.ts`), iar fără rețea n-ar avea cu cine vorbi; precache-ul ar crește cu ~150 kB gzip;
 * - `config.json`: e al instanței și vine din rețea întâi, cu ultima copie bună în cache-ul lui (`src/pwa/configSw.ts`);
 * - `sw.js` (workerul însuși) și bancul vizual (`/banc/`, doar pe instanța de test).
 *
 * Orice alt fișier e „necunoscut”: poarta pică pe el, ca un fel nou de fișier (un font, o imagine în `assets/`) să fie
 * decis aici, nu lăsat tăcut în afara precache-ului.
 */

/** Modulele doar online, după numele bucății lor (`assets/<nume>-<amprentă de 8>.js|css`): doar pagina `/admin`. */
export const DOAR_ONLINE = ['PaginaAdmin'] as const;

export type MotivPrecache = 'precache' | 'doar-online' | 'configuratie' | 'worker' | 'banc' | 'necunoscut';

/** Pură: de ce un fișier al build-ului (calea din `dist/`, cu `/`) intră sau nu în precache. */
export function motivPrecache(cale: string): MotivPrecache {
  if (cale === 'index.html' || cale === 'favicon.svg') return 'precache';
  if (cale === 'config.json') return 'configuratie';
  if (cale === 'sw.js') return 'worker';
  if (cale.startsWith('banc/')) return 'banc';
  const m = /^assets\/([^/]+)-[A-Za-z0-9_-]{8}\.(?:js|css)$/.exec(cale);
  if (!m) return 'necunoscut';
  return (DOAR_ONLINE as readonly string[]).includes(m[1] ?? '') ? 'doar-online' : 'precache';
}

export function inPrecache(cale: string): boolean {
  return motivPrecache(cale) === 'precache';
}
