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
 * - `sw.js` (workerul însuși) și bancul vizual (`/banc/`, doar pe instanța de test);
 * - documentația admin (`documentatie/`, ADR 0048: roadmap-ul, catalogul, documentele), doar online ca pagina `/admin`
 *   care o cere la deschiderea filei; ~0,9 MB care n-au ce căuta pe discul fiecărui om.
 *
 * Fonturile textului (`fonturi/*.ttf`, cu licența lor, ADR 0105) intră: textul se scrie și fără rețea, în atelier.
 * Manualul utilizatorului (`manual/ro.json`, `manual/en.json`, ADR 0058) intră: se citește și fără rețea, ca aplicația. La
 * fel dicționarul codurilor controlerului (`coduri/ro.json`, `coduri/en.json`, ADR 0085): explicația unei alarme trebuie să
 * vină și în atelier. Și mesajele modulelor la cerere (`mesaje/<modul>.json`, ADR 0086), fără de care modulele nu
 * se pot arăta.
 *
 * Testul pas cu pas al owner-ului (ADR 0072: bucata `TestPasCuPas`, cu stilul ei, și pașii din `tutorial/`) rămâne afară,
 * ca `/admin`: există doar pe instanța de test, deci n-are ce căuta pe discul fiecărui om. La fel mașina simulată (ADR 0081:
 * bucata `MasinaSimulata`, emulatorul GRBL al panoului mașinii); panoul și senderul intră (merg și fără rețea, în atelier).
 * La fel sugestia din editor (ADR 0110: bucata `SugestieDinEditor`, plus cele două împărțite, `pozaPlansei` cu testul și
 * `pozaSugestiei` cu `/admin`): butonul ei e doar în afara instanței live, iar sugestia cere oricum `/admin`, deci rețea.
 *
 * Orice alt fișier e „necunoscut”: poarta pică pe el, ca un fel nou de fișier (un font, o imagine în `assets/`) să fie
 * decis aici, nu lăsat tăcut în afara precache-ului.
 */

/**
 * Modulele doar online, după numele bucății lor (`assets/<nume>-<amprentă de 8>.js|css`): `/admin`, testul pas cu pas, mașina
 * simulată, sugestia din editor (cu bucățile ei împărțite).
 */
export const DOAR_ONLINE = ['PaginaAdmin', 'TestPasCuPas', 'MasinaSimulata', 'SugestieDinEditor', 'pozaPlansei', 'pozaSugestiei'] as const;

export type MotivPrecache = 'precache' | 'doar-online' | 'configuratie' | 'worker' | 'banc' | 'documentatie' | 'necunoscut';

/** Pură: de ce un fișier al build-ului (calea din `dist/`, cu `/`) intră sau nu în precache. */
export function motivPrecache(cale: string): MotivPrecache {
  if (cale === 'index.html' || cale === 'favicon.svg') return 'precache';
  if (cale === 'config.json') return 'configuratie';
  if (cale === 'sw.js') return 'worker';
  if (cale.startsWith('banc/')) return 'banc';
  if (cale.startsWith('documentatie/')) return 'documentatie';
  if (/^manual\/(?:ro|en)\.json$/.test(cale)) return 'precache';
  if (/^coduri\/(?:ro|en)\.json$/.test(cale)) return 'precache';
  if (/^mesaje\/[a-z]+\.json$/.test(cale)) return 'precache';
  if (/^fonturi\/[A-Za-z0-9.-]+\.(?:ttf|txt)$/.test(cale)) return 'precache';
  if (/^tutorial\/[a-z0-9-]+\.json$/.test(cale)) return 'doar-online';
  const m = /^assets\/([^/]+)-[A-Za-z0-9_-]{8}\.(?:js|css)$/.exec(cale);
  if (!m) return 'necunoscut';
  return (DOAR_ONLINE as readonly string[]).includes(m[1] ?? '') ? 'doar-online' : 'precache';
}

export function inPrecache(cale: string): boolean {
  return motivPrecache(cale) === 'precache';
}
