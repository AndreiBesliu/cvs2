import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { limba, limbaDePornire, schimbaLimba } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';
import { App } from './App.tsx';
import { esteRutaAdmin, incarcaConfig } from './config.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { deschideProiect } from './proiectLocal.ts';
import { creeazaJurnal, type Context, type Depozit } from './jurnalErori.ts';
import './stil.css';

const CHEIE_LIMBA = 'cncvs2.limba';
const CHEIE_TEMA = 'cncvs2.tema';

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

// Tema aleasă (luminoasă / întunecată / după sistem) se pune înaintea primei randări, ca pagina să nu clipească.
try {
  document.documentElement.dataset['tema'] = depozit?.getItem(CHEIE_TEMA) ?? 'auto';
} catch {
  // Fără depozit, tema urmează sistemul.
}

function alegeTema(tema: string): void {
  document.documentElement.dataset['tema'] = tema;
  try {
    depozit?.setItem(CHEIE_TEMA, tema);
  } catch {
    // Alegerea rămâne doar pentru sesiunea asta.
  }
}

function alegeLimba(l: Limba): void {
  schimbaLimba(l);
  try {
    depozit?.setItem(CHEIE_LIMBA, l);
  } catch {
    // Alegerea rămâne doar pentru sesiunea asta.
  }
}

/**
 * Pornirea, într-o funcție, fără `await` la nivelul modulului. Ușa de încărcare a proiectului vine la cerere, chiar în
 * timpul pornirii, iar bucata ei poate importa pachetul de intrare: cu un `await` sus, modulul ăsta ar rămâne neevaluat
 * până la deschidere, deci bucata l-ar aștepta pe el și el pe ea. Văzut în e2e: deschiderea ieșea „fără memorie”, după
 * termen. O eroare aici ajunge în jurnal prin `unhandledrejection`.
 */
async function porneste(): Promise<void> {
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

  // Pagina `/admin` (ADR 0040 §1) vine la cerere, ÎNAINTEA deschiderii proiectului: nu ia blocarea lui de scriere și nu
  // aduce Firebase în pachetul de pornire.
  if (esteRutaAdmin(location.pathname)) {
    const { PaginaAdmin } = await import('../admin/PaginaAdmin.tsx');
    createRoot(radacina).render(
      <StrictMode>
        <ErrorBoundary jurnal={jurnal} context={context}>
          <PaginaAdmin config={config} build={__VERSIUNE__} />
        </ErrorBoundary>
      </StrictMode>,
    );
    return;
  }

  // Proiectul din browser se deschide înainte de prima randare: o comandă dată între timp ar fi acoperită de el.
  const proiect = await deschideProiect();
  if (proiect.mod === 'nu-se-deschide' || proiect.mod === 'fara-memorie' || proiect.mod === 'necitit-acum') jurnal.adauga('proiect', proiect.motiv);

  createRoot(radacina).render(
    <StrictMode>
      <ErrorBoundary jurnal={jurnal} context={context}>
        <App
          config={config}
          jurnal={jurnal}
          diagnostic={new URLSearchParams(location.search).get('diagnostic')}
          alegeLimba={alegeLimba}
          alegeTema={alegeTema}
          proiect={proiect}
        />
      </ErrorBoundary>
    </StrictMode>,
  );
}

void porneste();
