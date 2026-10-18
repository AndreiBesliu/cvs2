import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { incarcaLimba, limba, limbaDePornire, schimbaLimba, t } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';
import { programeazaPwa } from '../pwa/pornire.ts';
import { semnal } from '../ui/CipuriVedere.tsx';
import { App } from './App.tsx';
import { esteRutaAdmin, incarcaConfig } from './config.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { deschideProiect } from './proiectLocal.ts';
import { creeazaJurnal, type Context, type Depozit } from './jurnalErori.ts';
import { creeazaRaportor, descrieStare } from './raportorPornire.ts';
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
/**
 * Raportorul de erori (3.2, ADR 0043): ascultă jurnalul de acum, deci prinde și erorile de dinaintea lui `config.json`
 * (ținute în coadă); Firebase vine la cerere, abia la prima eroare cu configurația cunoscută. Ambele rute (aplicația și
 * `/admin`) îl au; pe `/admin`, apelul poartă singur tokenul contului. Browserul e implicit `navigator.userAgent`.
 * Doar mediul omului (proiectul local fără memorie: IndexedDB lipsă, blocat, plin, sau baza care nu răspunde la timp) intră
 * în jurnal „doar local” (`adaugaLocala`): raportorul îl sare, fără să descarce nimic (ADR 0039 §6). Dicționarele și ușa
 * proiectului care nu vin pleacă: o publicare stricată arată la fel, iar cu rețeaua căzută nici raportorul n-ar veni
 * (reverificarea 3.2).
 */
const raportor = creeazaRaportor({
  jurnal,
  adu: () => import('../cloud/raportor.ts'),
  build: __VERSIUNE__,
  limba,
});
window.addEventListener('error', (e) => { jurnal.adauga('fereastra', e.error ?? e.message); });
window.addEventListener('unhandledrejection', (e) => { jurnal.adauga('promisiune', e.reason); });
/** Oferta actualizării (ADR 0045 §5): funcția clicului „Reîncarcă” din bara de jos, pusă de înregistrarea workerului. */
const actualizare = semnal<(() => void) | null>(null);

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
 * Workerul PWA (ADR 0045 §7): înregistrarea vine la cerere, după prima randare (pauza și garda: `src/pwa/pornire.ts`), doar
 * în build și doar unde browserul are service worker. Un eșec intră în jurnal o singură dată (o bucată care nu vine e
 * defect, ADR 0043), fără reîncercare.
 */
function pornestePwa(): void {
  programeazaPwa({
    prod: import.meta.env.PROD,
    nav: navigator,
    porneste: () => {
      import('../pwa/inregistrare.ts').then((m) => m.inregistreaza({ oferta: actualizare.scrie, jurnal }))
        .catch((e: unknown) => { jurnal.adauga('promisiune', e); });
    },
  });
}

/**
 * Pornirea, într-o funcție, fără `await` la nivelul modulului. Ușa de încărcare a proiectului vine la cerere, chiar în
 * timpul pornirii, iar bucata ei poate importa pachetul de intrare: cu un `await` sus, modulul ăsta ar rămâne neevaluat
 * până la deschidere, deci bucata l-ar aștepta pe el și el pe ea. Văzut în e2e: deschiderea ieșea „fără memorie”, după
 * termen. O eroare aici ajunge în jurnal prin `unhandledrejection`.
 */
async function porneste(): Promise<void> {
  // Raportorul pornește cum vine configurația, fără să aștepte dicționarul și fără să întârzie randarea (nimic nu-l așteaptă).
  const configGata = incarcaConfig(window.fetch.bind(window)).then((c) => {
    raportor.porneste(c.ok ? c.config : null);
    return c;
  });
  const [config, cuTexte] = await Promise.all([configGata, limbaGata]);
  if (!config.ok) jurnal.adauga('config', config.motiv);

  const context = (): Context => ({
    aplicatia: 'CNC Vector Studio',
    versiunea: __VERSIUNE__,
    instanta: config.ok ? config.config.instanta : 'necunoscută',
    limba: limba(),
    browserul: navigator.userAgent,
    raportorul: descrieStare(raportor.stare()),
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
    pornestePwa();
    // Pagina vine doar din rețea (nici ea, nici navigarea la `/admin` nu sunt ale workerului, ADR 0045 §2, §4): dacă bucata
    // ei nu vine (rețeaua căzută după index.html), un mesaj care cere rețea, nu o pagină albă.
    const admin = await import('../admin/PaginaAdmin.tsx').catch((e: unknown) => {
      jurnal.adauga('promisiune', e);
      return null;
    });
    if (!admin) {
      const p = document.createElement('p');
      p.role = 'alert';
      p.className = 'ecran-eroare';
      p.textContent = t('admin.cere-retea');
      radacina.replaceChildren(p);
      return;
    }
    const { PaginaAdmin } = admin;
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
  // Doar mediul omului (`mediu`: IndexedDB lipsă, blocat, plin, termenul) e „doar local”; o bază la altă versiune, o ușă
  // care nu vine sau o excepție a codului nostru pleacă la server (reverificarea 3.2).
  if (proiect.mod === 'fara-memorie' || proiect.mod === 'necitit-acum' || proiect.mod === 'nu-se-deschide') {
    if ('mediu' in proiect && proiect.mediu) jurnal.adaugaLocala('proiect', proiect.motiv);
    else jurnal.adauga('proiect', proiect.motiv);
  }

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
          actualizare={actualizare}
        />
      </ErrorBoundary>
    </StrictMode>,
  );
  pornestePwa();
}

void porneste();
