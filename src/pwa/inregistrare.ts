/**
 * Înregistrarea workerului PWA și actualizarea OFERITĂ (ADR 0045 §5, §7). Bucata vine la cerere, după prima randare
 * (`main.tsx`), deci nu stă în pachetul de pornire.
 *
 * Cât un worker se instalează, bara de jos îi arată progresul (ADR 0097): procentul trimis de el (`src/pwa/progres.ts`),
 * ascultat înaintea înregistrării (`urmaresteProgresul`).
 *
 * Un worker nou (o publicare nouă) se instalează și AȘTEAPTĂ: aplicația primește o ofertă (`oferta`), pe care bara de jos
 * o arată („Versiune nouă gata” + „Reîncarcă”). Abia clicul trimite `SKIP_WAITING`, iar pagina se reîncarcă o singură
 * dată, când workerul nou o preia (`controllerchange`). Niciodată singură: o filă cu muncă nesalvată nu se reîncarcă sub
 * om, nici când altă filă a acceptat actualizarea (atunci clicul doar reîncarcă).
 *
 * Browserul caută un `/sw.js` nou doar la navigare, deci o filă lăsată deschisă zile întregi ar afla de publicare abia la
 * reîncărcare: aplicația îl caută și ea, cu `update()`, la fiecare oră și când fila redevine vizibilă după cel puțin o oră
 * (ADR 0045 §5). Ce găsește trece prin aceeași ofertă.
 *
 * De ce nu `virtual:pwa-register` (vite-plugin-pwa, peste workbox-window): în modul „prompt”, odată oferită actualizarea,
 * el reîncarcă fila la `controlling`, deci și când a acceptat-o ALTĂ filă; plus ~2,5 kB de workbox-window. Aici sunt cele
 * câteva evenimente ale API-ului, probate cu un container fals (`test/unit/pwa.actualizare.test.ts`).
 */
import type { Jurnal } from '../app/jurnalErori.ts';
import { esteProgres, MESAJ_CERE_PROGRES, MESAJ_SKIP_WAITING, procentDin } from './protocol.ts';

/**
 * Punctul de legătură cu senderul (etapa 3.6+, ADR 0017: „blocată cât rulează un job”): cât trimite un job la mașină,
 * actualizarea nu se aplică (o reîncărcare ar opri trimiterea). Azi nu există joburi, deci e mereu permisă; senderul o
 * va lega de starea lui, iar anunțul va spune atunci de ce butonul așteaptă.
 */
export function actualizarePermisa(): boolean {
  return true;
}

/** Cât de des caută aplicația o versiune nouă (`update()`) cât fila stă deschisă: o oră (alegerea owner-ului, 19.10). */
export const INTERVAL_VERIFICARE_MS = 3_600_000;

type Container = Pick<ServiceWorkerContainer, 'register' | 'getRegistration' | 'controller' | 'addEventListener' | 'startMessages'>;

/** Progresul instalării unui worker (ADR 0097): procentul și dacă e prima (niciun worker activ: lucrul offline). */
export interface ProgresActualizare {
  readonly procent: number;
  readonly prima: boolean;
}

export interface Ceas {
  /** Implicit `setInterval`. */
  readonly repeta: (f: () => void, ms: number) => void;
  /**
   * Implicit `Date.now()`: ora peretelui, care curge și cât calculatorul doarme (ceasul monoton al paginii poate sta pe loc),
   * deci fila revenită dimineața vede că a trecut ora.
   */
  readonly acum: () => number;
}

const CEAS: Ceas = {
  repeta: (f, ms) => { setInterval(f, ms); },
  acum: () => Date.now(),
};

export interface DepsInregistrare {
  /** Implicit `navigator.serviceWorker`. */
  readonly sw?: Container;
  readonly ceas?: Ceas;
  /** Implicit `document` (vizibilitatea filei). */
  readonly doc?: Pick<Document, 'visibilityState' | 'addEventListener'>;
  /** Oferta actualizării: funcția de la clic, sau `null` când nu mai e nimic de oferit. */
  readonly oferta: (aplica: (() => void) | null) => void;
  /** Progresul instalării în curs, sau `null` când nu se instalează nimic. */
  readonly progres: (p: ProgresActualizare | null) => void;
  /**
   * Înregistrarea refuzată de browser: un defect (ADR 0043, pleacă la server), afară de datele site-ului blocate
   * (`SecurityError`), o condiție a mediului omului, doar locală (ca la proiectul local, ADR 0039 §6).
   */
  readonly jurnal: Pick<Jurnal, 'adauga' | 'adaugaLocala'>;
  /** Implicit `location.reload()`. */
  readonly reincarca?: () => void;
  readonly permisa?: () => boolean;
}

const deMediu = (e: unknown): boolean => (e as { name?: unknown } | null)?.name === 'SecurityError';

/**
 * Progresul instalării (ADR 0097), ascultat ÎNAINTEA lui `register()`: o actualizare găsită de navigarea însăși ține
 * `register()` în coada de joburi a workerului până la sfârșitul instalării ei (văzut în e2e: fila afla de ea abia când nu
 * mai era nimic de arătat). Înregistrarea existentă vine din `getRegistration()`, care nu stă la coadă, iar workerul ei care
 * se instalează deja e întrebat de progresul de până acum. Procentul vine doar de la un worker încă în `installing` (un
 * mesaj întârziat ar lăsa altfel procentul pe ecran) și se golește o singură dată, când acel worker iese din instalare
 * (gata sau căzută); schimbările altui worker nu-l ating.
 */
function urmaresteProgresul(sw: Container, progres: DepsInregistrare['progres'], inregistrarea: () => ServiceWorkerRegistration | undefined): void {
  let existenta: ServiceWorkerRegistration | undefined;
  const urmariti = new WeakSet<ServiceWorker>();
  sw.addEventListener('message', (e) => {
    const { data, source } = e;
    const w = source as ServiceWorker | null;
    if (!esteProgres(data) || w?.state !== 'installing') return;
    if (!urmariti.has(w)) {
      urmariti.add(w);
      const sfarsit = (): void => {
        if (w.state === 'installing') return;
        w.removeEventListener('statechange', sfarsit);
        progres(null);
      };
      w.addEventListener('statechange', sfarsit);
    }
    // Prima instalare (lucrul offline): niciun worker activ. O filă controlată are mereu unul.
    progres({ procent: procentDin(data), prima: sw.controller === null && !(inregistrarea() ?? existenta)?.active });
  });
  sw.startMessages();
  sw.getRegistration().then((r) => {
    existenta = r;
    r?.installing?.postMessage(MESAJ_CERE_PROGRES);
  }).catch(() => undefined);
}

export async function inregistreaza(d: DepsInregistrare): Promise<void> {
  const sw = d.sw ?? navigator.serviceWorker;
  const reincarca = d.reincarca ?? ((): void => { location.reload(); });
  let reg: ServiceWorkerRegistration | undefined;
  urmaresteProgresul(sw, d.progres, () => reg);
  try {
    reg = await sw.register('/sw.js', { scope: '/' });
  } catch (e) {
    if (deMediu(e)) d.jurnal.adaugaLocala('promisiune', e);
    else d.jurnal.adauga('promisiune', e);
    return;
  }
  // Playwright cu `serviceWorkers: 'block'` (restul suitei e2e) întoarce nimic: nimic de urmărit.
  if (!reg) return;
  const r = reg;
  let aplicat = false;

  const aplica = (w: ServiceWorker): void => {
    if (aplicat || !(d.permisa ?? actualizarePermisa)()) return;
    aplicat = true;
    let reincarcat = false;
    const odata = (): void => {
      if (reincarcat) return;
      reincarcat = true;
      reincarca();
    };
    // Altă filă l-a activat deja: pagina asta rulează codul vechi, deci doar se reîncarcă.
    if (w.state === 'activated') {
      odata();
      return;
    }
    // O pagină controlată află de preluare prin `controllerchange`; una necontrolată (prima încărcare, fără
    // `clients.claim()`) n-o primește niciodată, deci așteaptă activarea workerului.
    if (sw.controller) sw.addEventListener('controllerchange', odata);
    else w.addEventListener('statechange', () => { if (w.state === 'activated') odata(); });
    w.postMessage(MESAJ_SKIP_WAITING);
  };

  const ofera = (w: ServiceWorker): void => {
    d.oferta(() => { aplica(w); });
    // Înlocuit de unul și mai nou, sau instalarea a eșuat: oferta lui nu mai are obiect (cel nou vine cu a lui).
    w.addEventListener('statechange', () => { if (w.state === 'redundant') d.oferta(null); });
  };

  /** Doar o actualizare se oferă: fără worker activ, cel instalat se activează singur (prima instalare). */
  const urmareste = (w: ServiceWorker | null): void => {
    if (!w) return;
    const instalat = (): void => { if (w.state === 'installed' && r.active) ofera(w); };
    w.addEventListener('statechange', instalat);
  };

  if (r.waiting && r.active) ofera(r.waiting);
  else urmareste(r.installing);
  r.addEventListener('updatefound', () => { urmareste(r.installing); });

  // Verificarea orară (navigarea de acum tocmai a verificat). Ce găsește vine prin `updatefound`, deci oferta rămâne una pe
  // worker: un `update()` care dă peste workerul care așteaptă deja nu găsește nimic nou. Eșecul (offline, serverul căzut)
  // e o condiție a mediului: nimic în jurnal (ADR 0039 §6), nicio reîncercare până la verificarea următoare. Ora se scrie
  // înaintea încercării, deci nici fila ascunsă și arătată în buclă, offline, nu verifică mai des de o oră.
  const ceas = d.ceas ?? CEAS;
  const doc = d.doc ?? document;
  let ultima = ceas.acum();
  const verifica = (): void => {
    ultima = ceas.acum();
    r.update().catch(() => undefined);
  };
  // Intervalul verifică mereu (nu doar „după o oră de la ultima”): ceasul lui și ora peretelui pot diferi cu puțin, iar o
  // condiție l-ar face să sară o oră întreagă. O verificare în plus, lângă una la vizibilitate, nu costă nimic.
  ceas.repeta(verifica, INTERVAL_VERIFICARE_MS);
  // Fila înghețată (calculatorul a dormit, Edge a „adormit” fila) nu-și rulează intervalul: la întoarcere, omul vede oferta
  // imediat, nu peste încă o oră.
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'visible' && ceas.acum() - ultima >= INTERVAL_VERIFICARE_MS) verifica();
  });
}
