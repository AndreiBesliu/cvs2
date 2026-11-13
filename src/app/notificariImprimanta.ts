/**
 * Notificările imprimantei (felia 3.6s, ADR 0194 §A): setările, ținute în browser (`cvs2.imprimanta.notificari`, `v: 1`),
 * permisiunea, notificarea sistemului (pe Android, doar printr-un service worker), sunetul (câteva tonuri scurte, făcute cu
 * Web Audio, fără fișiere), textele evenimentelor și semnul de pe butonul Imprimanta. Fără niciun server: merg cât cvs2 e
 * deschis, și în fundal.
 */
import { limba, t } from '../i18n/t.ts';
import type { StareLucrare } from '../machine/imprimanta/driver.ts';
import { EVENIMENTE, type Eveniment, type FelEveniment } from '../machine/imprimanta/evenimente.ts';
import { CHEIE_NOTIFICARI } from './imprimantaLaPornire.ts';

export type SetariNotificari = {
  readonly evenimente: Readonly<Record<FelEveniment, boolean>>;
  /** Tonurile aplicației. */
  readonly sunet: boolean;
  /** Și notificarea sistemului cât cvs2 e în față (altfel, atunci, doar banda). */
  readonly sistemInFata: boolean;
  /** Procentul în titlul filei. */
  readonly titlu: boolean;
  /** Leagă imprimanta ținută la deschiderea cvs2. */
  readonly legare: boolean;
};

export const SETARI_IMPLICITE: SetariNotificari = {
  evenimente: { gata: true, oprita: true, pauzaFisier: true, pauza: true, faraFilament: true, eroare: true, pierduta: true, primulStrat: false },
  sunet: true, sistemInFata: false, titlu: true, legare: false,
};

type Depozit = Pick<Storage, 'getItem' | 'setItem'>;
const depozit = (): Depozit | null => {
  try { return globalThis.localStorage ?? null; } catch { return null; }
};

/** Setările ținute; o valoare lipsă sau stricată ia implicitul ei (o setare nouă nu le strică pe cele vechi). */
export function citesteSetari(d: Depozit | null = depozit()): SetariNotificari {
  try {
    const x = JSON.parse(d?.getItem(CHEIE_NOTIFICARI) ?? 'null') as Record<string, unknown> | null;
    if (typeof x !== 'object' || x === null || x['v'] !== 1) return SETARI_IMPLICITE;
    const da = (v: unknown, implicit: boolean): boolean => (typeof v === 'boolean' ? v : implicit);
    const ev = typeof x['evenimente'] === 'object' && x['evenimente'] !== null ? x['evenimente'] as Record<string, unknown> : {};
    const I = SETARI_IMPLICITE;
    return {
      evenimente: Object.fromEntries(EVENIMENTE.map((f) => [f, da(ev[f], I.evenimente[f])])) as Record<FelEveniment, boolean>,
      sunet: da(x['sunet'], I.sunet), sistemInFata: da(x['sistemInFata'], I.sistemInFata), titlu: da(x['titlu'], I.titlu), legare: da(x['legare'], I.legare),
    };
  } catch {
    return SETARI_IMPLICITE;
  }
}

export function scrieSetari(s: SetariNotificari, d: Depozit | null = depozit()): void {
  try {
    d?.setItem(CHEIE_NOTIFICARI, JSON.stringify({ v: 1, ...s }));
  } catch {
    // Fără stocare: setările țin doar cât pagina.
  }
}

export type Permisiune = 'acordata' | 'refuzata' | 'nedecisa' | 'indisponibila';

export function permisiune(): Permisiune {
  if (typeof Notification === 'undefined') return 'indisponibila';
  return Notification.permission === 'granted' ? 'acordata' : Notification.permission === 'denied' ? 'refuzata' : 'nedecisa';
}

/** Cere permisiunea (doar dintr-un clic al omului); spune ce a ales. */
export async function cerePermisiunea(): Promise<Permisiune> {
  if (typeof Notification === 'undefined') return 'indisponibila';
  try {
    await Notification.requestPermission();
  } catch {
    // Un browser vechi, cu apel înapoi: permisiunea se citește oricum mai jos.
  }
  return permisiune();
}

/** Notificarea sistemului, doar cu permisiunea dată; clic pe ea → fereastra cvs2, cu Imprimanta. */
export function notificaSistemul(titlu: string, corp: string, eticheta: string, laClic: () => void): boolean {
  if (permisiune() !== 'acordata') return false;
  try {
    const n = new Notification(titlu, { body: corp, tag: eticheta });
    n.onclick = () => { window.focus(); laClic(); n.close(); };
  } catch {
    // Android: notificarea vine doar printr-un service worker (clicul deschide aplicația, fără fereastra aleasă).
    void navigator.serviceWorker?.ready.then((r) => r.showNotification(titlu, { body: corp, tag: eticheta })).catch(() => undefined);
  }
  return true;
}

let audio: AudioContext | null = null;

/**
 * Tonurile unui eveniment: două urcătoare la final, trei la fel la ce cere atenție (pauza, filamentul, eroarea). Browserul le
 * lasă doar după un clic al omului în pagină; altfel tac, fără eroare.
 */
export function suna(atentie: boolean): void {
  try {
    if (typeof AudioContext === 'undefined') return;
    audio ??= new AudioContext();
    const c = audio;
    if (c.state === 'suspended') void c.resume().catch(() => undefined);
    const t0 = c.currentTime + 0.05;
    (atentie ? [880, 880, 880] : [660, 990]).forEach((f, k) => {
      const o = c.createOscillator(), g = c.createGain(), la = t0 + k * 0.22;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, la);
      g.gain.exponentialRampToValueAtTime(0.2, la + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, la + 0.18);
      o.connect(g);
      g.connect(c.destination);
      o.start(la);
      o.stop(la + 0.2);
    });
  } catch {
    // Fără sunet.
  }
}

/** Ce cere atenția omului (sunetul cu trei tonuri, banda ca alertă): totul afară de final și de primul strat. */
export const cereAtentie = (fel: FelEveniment): boolean => fel !== 'gata' && fel !== 'primulStrat';

/** Metrii de filament: două zecimale sub un metru (o lucrare scurtă nu scrie „0 m”), una peste. */
const metri = (mm: number): string => (mm / 1000).toLocaleString(limba() === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: mm < 1000 ? 2 : 1 });

/**
 * Titlul și textul unui eveniment: titlul cu numele imprimantei („K1C-8578: pauza din fișier”), textul cu fișierul (numele
 * scurt), durata și filamentul, stratul și nota pauzei, cheia erorii.
 */
export function textEveniment(e: Eveniment, imprimanta: string, fisier: string, durata: (s: number) => string): { readonly titlu: string; readonly corp: string } {
  const titlu = t('imprimanta.notif.titlu', { imprimanta, eveniment: t(`imprimanta.notif.${e.fel}`) });
  switch (e.fel) {
    case 'gata':
    case 'oprita': {
      const parti = [fisier, e.durata === null ? null : durata(e.durata), e.filament === null || e.filament < 10 ? null : t('imprimanta.notif.metri', { m: metri(e.filament) })];
      return { titlu, corp: parti.filter((x): x is string => x !== null && x !== '').join(' · ') };
    }
    case 'pauzaFisier':
      return { titlu, corp: `${e.nota === null || e.nota === '' ? t('imprimanta.notif.inainte', { k: e.strat ?? 0 }) : t('imprimanta.notif.inainte-nota', { k: e.strat ?? 0, nota: e.nota })} ${t('imprimanta.notif.reia')}` };
    case 'eroare':
      return { titlu, corp: t('imprimanta.notif.eroare.text', { cheie: e.cheie ?? 0 }) };
    default:
      return { titlu, corp: t(`imprimanta.notif.${e.fel}.text`) };
  }
}

/** Semnul de pe butonul Imprimanta (ADR 0194 §A.4): felul lui (culoarea) și textul scurt; null: nimic de arătat. */
export type Semn = { readonly fel: 'imprima' | 'pauza' | 'rau' | 'pierduta' | 'gata'; readonly text: string };

export function semnImprimanta(x: {
  readonly legatura: 'vie' | 'pierduta' | 'alta'; readonly lucrare: StareLucrare; readonly progres: number | null;
  readonly faraFilament: boolean | null; readonly eroare: number | null; readonly gataNevazut: boolean;
}): Semn | null {
  const lucreaza = x.lucrare === 'imprima' || x.lucrare === 'pauza' || x.lucrare === 'pregatire';
  if (x.legatura === 'pierduta') return lucreaza ? { fel: 'pierduta', text: t('imprimanta.semn.pierduta') } : null;
  if (x.legatura !== 'vie') return null;
  if (lucreaza && x.eroare !== null) return { fel: 'rau', text: t('imprimanta.semn.eroare') };
  if (x.lucrare === 'pauza') return x.faraFilament === true ? { fel: 'rau', text: t('imprimanta.semn.fara-filament') } : { fel: 'pauza', text: t('imprimanta.semn.pauza') };
  if (x.lucrare === 'imprima') return { fel: 'imprima', text: x.progres === null ? '…' : `${Math.round(x.progres)} %` };
  if (x.lucrare === 'pregatire') return { fel: 'imprima', text: '…' };
  if (x.lucrare === 'gata' && x.gataNevazut) return { fel: 'gata', text: t('imprimanta.semn.gata') };
  return null;
}
