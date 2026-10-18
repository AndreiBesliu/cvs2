/**
 * Înregistrarea workerului PWA și actualizarea OFERITĂ (ADR 0045 §5, §7). Bucata vine la cerere, după prima randare
 * (`main.tsx`), deci nu stă în pachetul de pornire.
 *
 * Un worker nou (o publicare nouă) se instalează și AȘTEAPTĂ: aplicația primește o ofertă (`oferta`), pe care bara de jos
 * o arată („Versiune nouă gata” + „Reîncarcă”). Abia clicul trimite `SKIP_WAITING`, iar pagina se reîncarcă o singură
 * dată, când workerul nou o preia (`controllerchange`). Niciodată singură: o filă cu muncă nesalvată nu se reîncarcă sub
 * om, nici când altă filă a acceptat actualizarea (atunci clicul doar reîncarcă).
 *
 * De ce nu `virtual:pwa-register` (vite-plugin-pwa, peste workbox-window): în modul „prompt”, odată oferită actualizarea,
 * el reîncarcă fila la `controlling`, deci și când a acceptat-o ALTĂ filă; plus ~2,5 kB de workbox-window. Aici sunt cele
 * câteva evenimente ale API-ului, probate cu un container fals (`test/unit/pwa.actualizare.test.ts`).
 */
import type { Jurnal } from '../app/jurnalErori.ts';
import { MESAJ_SKIP_WAITING } from './protocol.ts';

/**
 * Punctul de legătură cu senderul (etapa 3.6+, ADR 0017: „blocată cât rulează un job”): cât trimite un job la mașină,
 * actualizarea nu se aplică (o reîncărcare ar opri trimiterea). Azi nu există joburi, deci e mereu permisă; senderul o
 * va lega de starea lui, iar anunțul va spune atunci de ce butonul așteaptă.
 */
export function actualizarePermisa(): boolean {
  return true;
}

type Container = Pick<ServiceWorkerContainer, 'register' | 'controller' | 'addEventListener'>;

export interface DepsInregistrare {
  /** Implicit `navigator.serviceWorker`. */
  readonly sw?: Container;
  /** Oferta actualizării: funcția de la clic, sau `null` când nu mai e nimic de oferit. */
  readonly oferta: (aplica: (() => void) | null) => void;
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

export async function inregistreaza(d: DepsInregistrare): Promise<void> {
  const sw = d.sw ?? navigator.serviceWorker;
  const reincarca = d.reincarca ?? ((): void => { location.reload(); });
  let reg: ServiceWorkerRegistration | undefined;
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
}
