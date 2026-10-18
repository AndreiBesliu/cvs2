/**
 * `config.json` prin workerul PWA (ADR 0045 §3). Configurația e a instanței (ADR 0040 §2), deci nu stă în precache: vine
 * din rețea întâi, cu un termen scurt, iar fără rețea, ultima copie BUNĂ (200, JSON) din cache-ul ei. Prima copie o pune
 * workerul la instalare (`copieLaInstalare`). Offline, aplicația pornește cu ultima configurație văzută.
 *
 * Strategia e scrisă aici, nu luată din `workbox-strategies` (NetworkFirst): se probează în Node cu un `CacheStorage`
 * fals, iar întrebarea „am o copie?” se pune cu `caches.match(url, { cacheName })`, care nu creează cache-ul întrebat.
 */

/** Cache-ul configurației. Prefixul `cncvs2-`: preluarea șterge doar `cncvs-` (ediția întâi). */
export const CACHE_CONFIG = 'cncvs2-config';

/**
 * Cât așteaptă workerul rețeaua înainte să dea copia din cache: sub `TERMEN_CONFIG_MS` (4 s) al aplicației, cu o secundă
 * de rezervă, ca o rețea agățată să nu treacă de termenul aplicației (care ar porni atunci fără configurație).
 */
export const TERMEN_CONFIG_SW_MS = 2500;

/** Ce folosește strategia din `CacheStorage` (un fals din probe îl poate imita întreg). */
export interface CacheuriConfig {
  open(nume: string): Promise<Pick<Cache, 'put'>>;
  match(cerere: RequestInfo | URL, optiuni?: MultiCacheQueryOptions): Promise<Response | undefined>;
}

export interface DepsConfig {
  readonly fetch: (cerere: Request) => Promise<Response>;
  readonly caches: CacheuriConfig;
  readonly termenMs?: number;
}

/** O copie bună: răspunsul 200 al serverului, cu un obiect JSON (o pagină de eroare a unui proxy nu acoperă copia). */
async function copieBuna(r: Response): Promise<boolean> {
  if (r.status !== 200) return false;
  try {
    const o: unknown = JSON.parse(await r.clone().text());
    return typeof o === 'object' && o !== null && !Array.isArray(o);
  } catch {
    return false;
  }
}

/** Răspunsul rețelei, dacă e o copie bună; altfel (alt status, alt corp, rețeaua căzută) `null`. Nu respinge. */
function doarBuna(retea: Promise<Response>): Promise<Response | null> {
  return retea.then(async (r) => ((await copieBuna(r)) ? r : null), () => null);
}

/** Pune copia bună în cache-ul propriu (deschis doar atunci). Nu respinge: o scriere refuzată (cota) lasă copia veche. */
function pastreaza(url: string, buna: Promise<Response | null>, caches: CacheuriConfig): Promise<void> {
  return buna.then(async (r) => {
    if (r) await (await caches.open(CACHE_CONFIG)).put(url, r.clone());
  }).catch(() => undefined);
}

/** Calea configurației, aceeași pe care o cere aplicația (`src/app/config.ts`), deci aceeași cheie în cache. */
export const CALE_CONFIG = '/config.json';

/**
 * Copia de la instalare (recenzia din 18.10): prima încărcare nu e a workerului (fără `clients.claim()`), deci cererea ei
 * pentru `config.json` nu trece prin el; fără copia asta, după O SINGURĂ vizită online, offline aplicația ar porni fără
 * configurație. Workerul o cere singur, ocolind cache-ul HTTP (`no-store`), și păstrează doar o copie bună, cu același cod
 * ca strategia. Nu respinge: instalarea nu cade din cauza ei (rețeaua căzută lasă copia veche, dacă există).
 */
export function copieLaInstalare(url: string, d: Pick<DepsConfig, 'fetch' | 'caches' | 'termenMs'>): Promise<void> {
  const retea = Promise.resolve().then(() => d.fetch(new Request(url, { cache: 'no-store' })));
  const copia = pastreaza(url, doarBuna(retea), d.caches);
  // Instalarea o așteaptă (`waitUntil`): o cerere agățată ar ține workerul în `installing` (fără offline, fără ofertă).
  let id: ReturnType<typeof setTimeout> | undefined;
  const termen = new Promise<void>((ok) => { id = setTimeout(ok, d.termenMs ?? TERMEN_COPIE_INSTALARE_MS); });
  return Promise.race([copia, termen]).finally(() => { clearTimeout(id); });
}

/** Cât ține copia de la instalare workerul în `installing` (reverificarea 18.10: fără termen, o cerere agățată îl oprea). */
export const TERMEN_COPIE_INSTALARE_MS = 10_000;

/**
 * Răspunsul pentru `config.json` și munca din fundal (punerea copiei în cache, după un răspuns venit și după termen),
 * pe care workerul o ține în viață cu `waitUntil`:
 * - rețeaua răspunde bine, în termen: răspunsul ei, iar copia intră în cache;
 * - rețeaua cade, întârzie peste termen sau răspunde prost (alt status, alt corp): copia, dacă există;
 * - fără copie: ce dă rețeaua (aplicația își spune singură motivul: HTTP 404, rețeaua căzută).
 */
export function raspunsConfig(cerere: Request, d: DepsConfig): { readonly raspuns: Promise<Response>; readonly fundal: Promise<void> } {
  const url = cerere.url;
  const retea = d.fetch(cerere);
  const buna = doarBuna(retea);
  const fundal = pastreaza(url, buna, d.caches);
  const raspuns = (async (): Promise<Response> => {
    let id: ReturnType<typeof setTimeout> | undefined;
    const termen = new Promise<'termen'>((ok) => { id = setTimeout(() => { ok('termen'); }, d.termenMs ?? TERMEN_CONFIG_SW_MS); });
    const primul = await Promise.race([buna, termen]);
    clearTimeout(id);
    if (primul !== 'termen' && primul !== null) return primul.clone();
    const copie = await d.caches.match(url, { cacheName: CACHE_CONFIG });
    return copie ?? retea;
  })();
  return { raspuns, fundal };
}
