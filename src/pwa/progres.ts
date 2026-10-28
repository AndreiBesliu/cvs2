/**
 * Progresul instalării workerului PWA (ADR 0097), ca plugin al strategiei precache-ului Workbox (`addPlugins`, în
 * `src/sw.ts`). La instalare, Workbox aduce precache-ul câte un fișier, în ordinea manifestului
 * (`PrecacheController.install`), iar după fiecare, adus din rețea sau găsit deja în cache la o actualizare, rulează
 * `handlerDidComplete`. Pluginul adună mărimea lui (scrisă în manifest la build, `marime`, în octeți necomprimați) și
 * trimite procentul doar când se schimbă. `stare()` e progresul de până acum, pentru o filă care începe să asculte în
 * mijlocul instalării (pornirea ei își înregistrează workerul după o pauză, iar instalarea poate sta pe un fișier lent).
 *
 * Trimiterea nu respinge niciodată: o respingere din plugin ar face instalarea să cadă, iar workerul nou n-ar mai veni,
 * pentru un progres care doar n-a ajuns la o filă.
 */
import { procentDin, TIP_PROGRES, type MesajProgres } from './protocol.ts';

/** O intrare a manifestului precache-ului, cu mărimea pusă de build (`vite.config.ts`). */
export interface IntrareManifest {
  readonly url: string;
  readonly marime?: number;
}

/** Ce citește pluginul din parametrii lui Workbox (`HandlerWillStartCallbackParam`, `HandlerDidCompleteCallbackParam`). */
interface Pas {
  readonly request: { readonly url: string };
  readonly event: { readonly type: string };
}

export interface ProgresWorker {
  /** Pluginul strategiei precache-ului (`addPlugins`). */
  readonly plugin: {
    readonly handlerWillStart: (p: Pas) => Promise<void>;
    readonly handlerDidComplete: (p: Pas) => Promise<void>;
  };
  /** Progresul de până acum: `null` înaintea instalării sau fără mărimi în manifest. */
  readonly stare: () => MesajProgres | null;
}

/**
 * Pluginul, pe manifestul workerului: adresele lui se citesc față de `baza` (adresa workerului), ca la Workbox. Doar
 * instalarea se numără (precache-ul servește și cererile paginii, `fetch`), fiecare fișier o singură dată.
 */
export function pluginProgres(
  manifest: ReadonlyArray<IntrareManifest | string>,
  baza: string,
  trimite: (m: MesajProgres) => Promise<void>,
): ProgresWorker {
  const marimi = new Map<string, number>();
  for (const i of manifest) {
    if (typeof i === 'string') marimi.set(new URL(i, baza).href, 0);
    else marimi.set(new URL(i.url, baza).href, i.marime ?? 0);
  }
  let total = 0;
  for (const m of marimi.values()) total += m;
  const terminate = new Set<string>();
  let gata = 0;
  let trimis = -1;
  let inceput = false;
  return {
    plugin: {
      handlerWillStart: async ({ event }) => {
        if (event.type === 'install') inceput = true;
      },
      handlerDidComplete: async ({ request, event }) => {
        if (event.type !== 'install' || total === 0) return;
        const marime = marimi.get(request.url);
        if (marime === undefined || terminate.has(request.url)) return;
        terminate.add(request.url);
        gata += marime;
        const mesaj: MesajProgres = { type: TIP_PROGRES, gata, total };
        const procent = procentDin(mesaj);
        if (procent === trimis) return;
        trimis = procent;
        await trimite(mesaj).catch(() => undefined);
      },
    },
    stare: () => (inceput && total > 0 ? { type: TIP_PROGRES, gata, total } : null),
  };
}
