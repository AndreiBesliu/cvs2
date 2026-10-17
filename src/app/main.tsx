import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { incarcaLimba, limba, limbaDePornire, schimbaLimba } from '../i18n/t.ts';
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

/** Cât așteaptă pornirea dicționarul unei limbi (ca `config.json`): o cerere agățată nu ține pagina albă. */
const TERMEN_LIMBA_MS = 4000;
/** Peste atât, fără niciun dicționar, pornirea renunță (pagina statică „fără texte”), în loc de o pagină albă oricât. */
const TERMEN_TOTAL_LIMBA_MS = 30_000;
/** Omul a ales o limbă din butoane: un dicționar sosit târziu la pornire nu-i mai schimbă alegerea. */
let alegereaOmului = false;

/**
 * Limba de pornire, cu dicționarul ei (vine la cerere, `t.ts`). Limba aleasă pleacă prima și nu se abandonează: dacă
 * întârzie peste `TERMEN_LIMBA_MS` sau cade, pleacă și cealaltă, iar câștigă prima venită; dacă cea aleasă sosește după
 * ea, se aplică totuși (cât omul n-a ales între timp). Eșec doar când cad amândouă sau trece `TERMEN_TOTAL_LIMBA_MS`
 * (recenzia pachetului de pornire: un termen fix de 4 s pe limbă arăta ecranul fatal deși dicționarul venea imediat după).
 * Fără `await` la nivelul modulului (vezi `porneste`): promisiunea pleacă acum, în paralel cu `config.json`.
 */
async function pregatesteLimba(l: Limba): Promise<boolean> {
  const alta: Limba = l === 'ro' ? 'en' : 'ro';
  const incearca = (x: Limba): Promise<Limba> => incarcaLimba(x).then(() => x);
  const prima = incearca(l);
  const rezerva = new Promise<Limba>((ok, eroare) => {
    let pornita = false;
    const pornesteAlta = (): void => {
      if (pornita) return;
      pornita = true;
      incearca(alta).then(ok, eroare);
    };
    const id = setTimeout(pornesteAlta, TERMEN_LIMBA_MS);
    prima.then(() => { clearTimeout(id); }, (e: unknown) => {
      clearTimeout(id);
      jurnal.adauga('promisiune', e);
      pornesteAlta();
    });
  });
  const termen = new Promise<never>((_, eroare) => {
    setTimeout(() => { eroare(new Error(`niciun dicționar al limbii n-a venit în ${TERMEN_TOTAL_LIMBA_MS} ms`)); }, TERMEN_TOTAL_LIMBA_MS);
  });
  try {
    const x = await Promise.race([Promise.any([prima, rezerva]), termen]);
    schimbaLimba(x);
    if (x !== l) prima.then(() => { if (!alegereaOmului) schimbaLimba(l); }, () => undefined);
    return true;
  } catch (e) {
    jurnal.adauga('promisiune', e);
    return false;
  }
}
const limbaGata = pregatesteLimba(limbaDePornire(salvata, navigator.languages));

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

/** Limba aleasă din butoane: se schimbă abia după ce i-a venit dicționarul (de obicei adus deja în fundal, `App`). */
let cerereLimba = 0;
function alegeLimba(l: Limba): void {
  // Se aplică doar ultima alegere: un dicționar sosit târziu nu acoperă un clic dat după el.
  const cerere = ++cerereLimba;
  alegereaOmului = true;
  incarcaLimba(l).then(() => {
    if (cerere !== cerereLimba) return;
    schimbaLimba(l);
    try {
      depozit?.setItem(CHEIE_LIMBA, l);
    } catch {
      // Alegerea rămâne doar pentru sesiunea asta.
    }
  }, (e: unknown) => { jurnal.adauga('promisiune', e); });
}

/**
 * Fără niciun dicționar, interfața n-are texte (`t()` aruncă): o pagină statică, în ambele limbi, cu Reîncarcă, nu o
 * pagină albă. Textele stau aici, nu în `t()`, fiindcă tocmai ele n-au venit.
 */
function faraTexte(radacina: HTMLElement): void {
  // Fiecare jumătate cu limba ei: un cititor de ecran o rostește cu vocea potrivită (recenzia pachetului de pornire).
  const bilingv = (e: HTMLElement, ro: string, en: string): void => {
    const a = document.createElement('span');
    a.lang = 'ro';
    a.textContent = ro;
    const b = document.createElement('span');
    b.lang = 'en';
    b.textContent = en;
    e.replaceChildren(a, ' · ', b);
  };
  const ecran = document.createElement('main');
  ecran.className = 'ecran-eroare';
  ecran.setAttribute('role', 'alert');
  ecran.dataset['eroare'] = 'fara-texte';
  const titlu = document.createElement('h1');
  bilingv(titlu, 'Aplicația n-a putut porni', 'The app could not start');
  const ro = document.createElement('p');
  ro.lang = 'ro';
  ro.textContent = 'Textele interfeței nu s-au putut aduce (rețeaua lipsește sau aplicația s-a actualizat între timp). Proiectul salvat e neatins: reîncarcă pagina.';
  const en = document.createElement('p');
  en.lang = 'en';
  en.textContent = 'The interface texts could not be loaded (the network is down or the app was updated meanwhile). Your saved project is untouched: reload the page.';
  const butoane = document.createElement('div');
  butoane.className = 'butoane';
  const reincarca = document.createElement('button');
  reincarca.type = 'button';
  bilingv(reincarca, 'Reîncarcă', 'Reload');
  reincarca.addEventListener('click', () => { location.reload(); });
  butoane.append(reincarca);
  ecran.append(titlu, ro, en, butoane);
  radacina.replaceChildren(ecran);
  reincarca.focus();
}

/**
 * Pornirea, într-o funcție, fără `await` la nivelul modulului. Ușa de încărcare a proiectului vine la cerere, chiar în
 * timpul pornirii, iar bucata ei poate importa pachetul de intrare: cu un `await` sus, modulul ăsta ar rămâne neevaluat
 * până la deschidere, deci bucata l-ar aștepta pe el și el pe ea. Văzut în e2e: deschiderea ieșea „fără memorie”, după
 * termen. O eroare aici ajunge în jurnal prin `unhandledrejection`.
 */
async function porneste(): Promise<void> {
  const [config, cuTexte] = await Promise.all([incarcaConfig(window.fetch.bind(window)), limbaGata]);
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
  if (!cuTexte) {
    faraTexte(radacina);
    return;
  }

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
