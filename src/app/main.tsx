import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { limba, limbaDePornire, schimbaLimba } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';
import { App } from './App.tsx';
import { incarcaConfig } from './config.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { creeazaJurnal, type Context, type Depozit } from './jurnalErori.ts';
import './stil.css';

const CHEIE_LIMBA = 'cncvs2.limba';

/** `localStorage` poate lipsi sau arunca (fereastră privată, date blocate); atunci totul merge în memorie. */
function depozitLocal(): Depozit | null {
  try {
    const d = window.localStorage;
    d.getItem(CHEIE_LIMBA);
    return d;
  } catch {
    return null;
  }
}

const depozit = depozitLocal();
const jurnal = creeazaJurnal(depozit, () => new Date(), () => location.href);
window.addEventListener('error', (e) => { jurnal.adauga('fereastra', e.error ?? e.message); });
window.addEventListener('unhandledrejection', (e) => { jurnal.adauga('promisiune', e.reason); });

let salvata: string | null = null;
try {
  salvata = depozit?.getItem(CHEIE_LIMBA) ?? null;
} catch {
  salvata = null;
}
schimbaLimba(limbaDePornire(salvata, navigator.languages));

function alegeLimba(l: Limba): void {
  schimbaLimba(l);
  try {
    depozit?.setItem(CHEIE_LIMBA, l);
  } catch {
    // Alegerea rămâne doar pentru sesiunea asta.
  }
}

const config = await incarcaConfig(window.fetch.bind(window));
if (!config.ok) jurnal.adauga('config', config.motiv);

const context = (): Context => ({
  aplicatia: 'CNC Vector Studio',
  versiunea: __VERSIUNE__,
  instanta: config.ok ? config.config.instanta : 'necunoscută',
  limba: limba(),
  browserul: navigator.userAgent,
});

const radacina = document.getElementById('root');
if (!radacina) throw new Error('#root lipsește din index.html');

createRoot(radacina).render(
  <StrictMode>
    <ErrorBoundary jurnal={jurnal} context={context}>
      <App
        config={config}
        jurnal={jurnal}
        diagnostic={new URLSearchParams(location.search).get('diagnostic')}
        alegeLimba={alegeLimba}
      />
    </ErrorBoundary>
  </StrictMode>,
);
