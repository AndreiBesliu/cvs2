import { mkdirSync, readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type { Roadmap } from '../../shared/documentatie.ts';

/**
 * Filele Roadmap și Documentație din `/admin` (ADR 0048), cap-coadă pe emulatoare, pe build-ul real (`dist/`, cu
 * documentația generată din repo): login-ul emulatorului de Auth, rolul din `staff/{uid}`, apoi cronologia (cele 33 de
 * rânduri, etapa curentă, o felie cunoscută cu starea și datele ei, feliile aduse ↑), panoul owner-ului, tastatura, linkul
 * spre ADR și linkurile interne din fila Documentație. Fișierele documentației vin doar la deschiderea filei. Capturile
 * filei Roadmap (luminoasă, întunecată, telefon) se scriu în `.tmp/` pentru raport, nu în git.
 */

/** Roadmap-ul generat de build-ul servit (`dist/`): pagina trebuie să arate exact ce scrie în el. */
const ROADMAP = JSON.parse(readFileSync('dist/documentatie/roadmap.json', 'utf8')) as Roadmap;

// Interfața în română, ca pentru owner (limba vine din `navigator.languages`): capturile din `.tmp/` merg în raport.
test.use({ locale: 'ro-RO' });

const PROIECT = 'demo-cncvs2';
const FS = `http://127.0.0.1:8085/v1/projects/${PROIECT}/databases/(default)/documents`;
const CONFIG = {
  instanta: 'local',
  firebase: { apiKey: 'demo-cheie', authDomain: `${PROIECT}.firebaseapp.com`, projectId: PROIECT, appId: '1:1:web:1' },
  emulatoare: { auth: 'http://127.0.0.1:9095', firestore: '127.0.0.1:8085', functions: '127.0.0.1:5005' },
};

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9095/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' });
});

/** Pagina, cu login-ul emulatorului și rolul de owner; `cale` poate purta adresa unei file (`/admin#roadmap`). */
async function intraCaOwner(page: Page, cale = '/admin'): Promise<void> {
  await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  await page.goto(cale);
  const [fereastra] = await Promise.all([page.waitForEvent('popup'), page.locator('[data-admin="intra"]').click()]);
  await fereastra.waitForLoadState();
  await fereastra.locator('#add-account-button').click();
  await fereastra.locator('#autogen-button').click();
  await fereastra.locator('#sign-in').click();
  const uid = (await page.locator('[data-admin="uid"]').textContent()) ?? '';
  const r = await fetch(`${FS}/staff/${uid}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { rol: { stringValue: 'owner' } } }),
  });
  expect(r.status).toBe(200);
  await page.locator('[data-admin="reincearca"]').click();
  await expect(page.locator('[data-fila="erori"]')).toBeVisible();
}

test('fila Roadmap: etapele, etapa curentă, o felie cunoscută, feliile aduse, owner-ul, tastatura; documentația vine abia la deschidere', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  page.on('console', (m) => { if (m.type() === 'error') erori.push(m.text()); });
  const cereri: string[] = [];
  page.on('request', (r) => { if (r.url().includes('/documentatie/')) cereri.push(new URL(r.url()).pathname); });
  await intraCaOwner(page);
  expect(cereri, 'nimic din documentație înaintea filei').toEqual([]);

  await page.locator('[data-fila="roadmap"]').click();
  await expect(page.locator('.rm-etapa')).toHaveCount(33);
  expect(cereri).toEqual(['/documentatie/roadmap.json']);
  await expect(page).toHaveURL(/#roadmap$/);

  // Etapa curentă e 3, aleasă implicit; 1 și 2 așteaptă placa; 4 e următoarea; tampoanele au rândul lor.
  const trei = page.locator('[data-etapa="3"]');
  await expect(trei).toHaveAttribute('aria-current', 'step');
  await expect(trei).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-etapa="1"]')).toHaveAttribute('data-asteapta', 'true');
  await expect(page.locator('[data-etapa="4"]')).toHaveAttribute('data-stare', 'urmatoare');
  await expect(page.locator('[data-etapa="T1"]')).toHaveAttribute('data-tampon', 'true');

  // Etapele viitoare își arată lucrul făcut înainte (ADR 0077): editorul de vectori (6) are ambele rânduri de prag făcute,
  // buzunarul (5) unul din patru în lucru; umplerea se vede (are culoare și înălțimea ei).
  const umplere = (id: string) => page.locator(`[data-etapa="${id}"] .rm-umplere`).evaluate((el) => ({
    p: el.getBoundingClientRect().height / (el.parentElement?.getBoundingClientRect().height ?? 1), fond: getComputedStyle(el).backgroundColor,
  }));
  const sase = page.locator('[data-etapa="6"]');
  await expect(sase).toHaveAttribute('data-progres', 'prag');
  await expect(sase).toHaveAttribute('aria-label', /Rândurile de prag: 2 \/ 2 făcute, 0 în lucru/);
  const u6 = await umplere('6'), u5 = await umplere('5');
  expect(u6.p).toBeCloseTo(1, 2);
  expect(u6.fond).not.toBe('rgba(0, 0, 0, 0)');
  // Etapa 5: buzunarul cu mai multe freze făcut (5.5↑, 5.6↑), găurirea (5.4↑) și ordinea (fișierele pe sculă, din postul 3.8a)
  // în lucru, câte o jumătate: (1 + 0,5 + 0,5) din 4.
  expect(u5.p).toBeCloseTo(0.5, 2);
  await expect(page.locator('[data-etapa="5"]')).toHaveAttribute('aria-label', /1 \/ 4 făcute, 2 în lucru \(un punct fără rând în prag\)/);

  // O felie cunoscută, cu starea, intervalul, trecerile și ADR-ul ei; una de făcut.
  const panou = page.locator('[data-roadmap-etapa="3"]');
  const f = panou.locator('[data-felie="3.4a"]');
  await expect(f).toHaveAttribute('data-stare', 'gata');
  await expect(f).toContainText('Backup-ul zilnic al Firestore');
  await expect(f).toContainText('16.10 21:35 → 22:20');
  await expect(f.locator('[data-adr="0041"]')).toBeVisible();
  await expect(panou.locator('[data-felie="3.5b"]')).toHaveAttribute('data-stare', 'de-facut');

  // Ce așteaptă de la owner: sus, cu cererile din roadmap-ul generat (fișa etapei 3; lista se schimbă des).
  const owner = page.locator('[data-roadmap="owner"]');
  await expect(owner.locator('li')).toHaveCount(ROADMAP.owner.length);
  await expect(owner).toContainText('Placa de contact pentru Z');

  mkdirSync('.tmp', { recursive: true });
  await page.screenshot({ path: '.tmp/roadmap.png', fullPage: true });

  // Tastatura: săgeata mută alegerea pe etapa următoare, iar panoul o arată (feliile aduse ↑ din etapa 3).
  await trei.focus();
  await page.keyboard.press('ArrowRight');
  const patru = page.locator('[data-etapa="4"]');
  await expect(patru).toHaveAttribute('aria-pressed', 'true');
  await expect(patru).toBeFocused();
  const sim = page.locator('[data-roadmap-etapa="4"] [data-felie="4.2↑"]');
  await expect(sim).toHaveAttribute('data-stare', 'gata');
  await expect(sim.locator('.rm-cip-adusa')).toBeVisible();
  await expect(page.locator('[data-roadmap-etapa="4"] .rm-puncte li')).toHaveCount(9);
  await page.keyboard.press('End');
  await expect(page.locator('[data-etapa="30"]')).toHaveAttribute('aria-pressed', 'true');

  // Tema întunecată și telefonul: aceeași pagină, fără derulare orizontală.
  await page.locator('[data-etapa="3"]').click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: '.tmp/roadmap-intunecat.png', fullPage: true });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 390, height: 844 });
  // Nimic nu iese din pagină în dreapta (elementele cu derulare proprie, ca tabelele, își țin conținutul).
  await expect.poll(() => page.evaluate(() => {
    const iese = [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 0.5
      && !el.closest('.md-tabel, .md-cod, .rm-pista'));
    return [document.documentElement.scrollWidth - window.innerWidth, ...iese.slice(0, 5).map((el) => `${el.tagName}.${el.className}`)];
  })).toEqual([0]);
  await page.screenshot({ path: '.tmp/roadmap-telefon.png', fullPage: true });
  expect(erori).toEqual([]);
});

test('fila Roadmap în engleză (ADR 0056): comutatorul EN din antet cere roadmap.en.json; feliile și cererile owner-ului în engleză', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  page.on('console', (m) => { if (m.type() === 'error') erori.push(m.text()); });
  const cereri: string[] = [];
  page.on('request', (r) => { if (r.url().includes('/documentatie/')) cereri.push(new URL(r.url()).pathname); });
  await intraCaOwner(page);
  await page.locator('[data-fila="roadmap"]').click();
  await expect(page.locator('.rm-etapa')).toHaveCount(33);
  const f = page.locator('[data-roadmap-etapa="3"] [data-felie="3.4a"]');
  await expect(f).toContainText('Backup-ul zilnic al Firestore');

  // EN din antet: interfața și roadmap-ul în engleză, din fișierul lui; nicio mențiune de texte netraduse.
  const en = page.locator('.admin-limba [data-limba="en"]');
  await en.click();
  await expect(en).toHaveAttribute('aria-pressed', 'true');
  await expect(f).toContainText('Daily Firestore backup');
  await expect(page.locator('[data-roadmap="owner"]')).toContainText('The Z touch plate');
  await expect(page.locator('[data-rm="netraduse"]')).toHaveCount(0);
  expect(cereri).toEqual(['/documentatie/roadmap.json', '/documentatie/roadmap.en.json']);
  mkdirSync('.tmp', { recursive: true });
  await page.screenshot({ path: '.tmp/roadmap-en.png', fullPage: true });

  // Înapoi în română: roadmap-ul român, deja adus pe pagină, fără cerere nouă.
  await page.locator('.admin-limba [data-limba="ro"]').click();
  await expect(f).toContainText('Backup-ul zilnic al Firestore');
  expect(cereri).toEqual(['/documentatie/roadmap.json', '/documentatie/roadmap.en.json']);
  expect(erori).toEqual([]);
});

test('fila Documentație: ADR-ul din roadmap, linkul intern din index, codul care numește un document, adresa din #', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await intraCaOwner(page);
  await page.locator('[data-fila="roadmap"]').click();
  await page.locator('[data-roadmap-etapa="3"] [data-felie="3.4a"] [data-adr="0041"]').click();

  await expect(page.locator('[data-fila="documentatie"]')).toHaveAttribute('aria-selected', 'true');
  const articol = page.locator('article[data-document="docs/adr/0041-backup-si-marcajele.md"]');
  await expect(articol.locator('h2').first()).toContainText('ADR 0041');
  await expect(page).toHaveURL(/#documentatie\/docs\/adr\/0041-backup-si-marcajele\.md$/);
  await expect(page.locator('[data-doc="docs/adr/0041-backup-si-marcajele.md"]')).toHaveAttribute('aria-current', 'page');

  // Indexul ADR: tabelul randat, iar linkul relativ spre 0047 navighează în filă.
  await page.locator('[data-doc="docs/adr/README.md"]').click();
  const index = page.locator('article[data-document="docs/adr/README.md"]');
  await expect(index.locator('table')).toBeVisible();
  expect(await index.locator('table tbody tr').count()).toBeGreaterThanOrEqual(48);
  await index.locator('a.md-intern', { hasText: '0047' }).click();
  await expect(page.locator('article[data-document="docs/adr/0047-nucleul-de-simulare.md"] h2').first()).toContainText('Nucleul de simulare');

  // Fișa etapei 2: codul `docs/etape/placa-02.md` e un link spre fișa plăcii; blocul de cod din ea, cu liniile exacte.
  await page.locator('[data-doc="docs/etape/etapa-02.md"]').click();
  await page.locator('article[data-document="docs/etape/etapa-02.md"] a.md-intern', { hasText: 'docs/etape/placa-02.md' }).first().click();
  const placa = page.locator('article[data-document="docs/etape/placa-02.md"]');
  await expect(placa.locator('pre.md-cod[data-limbaj="powershell"]')).toBeVisible();

  // Derulat adânc într-un document lung, un clic în navigatorul lipit sus deschide documentul nou de la început.
  await page.locator('[data-doc="PLAN.md"]').click();
  const plan = page.locator('article[data-document="PLAN.md"]');
  await expect(plan.locator('h2').first()).toBeVisible();
  await page.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight / 2); });
  await page.locator('[data-doc="docs/adr/0048-documentatia-admin.md"]').click();
  const adr48 = page.locator('article[data-document="docs/adr/0048-documentatia-admin.md"]');
  await expect(adr48.locator('h2').first()).toBeInViewport();
  mkdirSync('.tmp', { recursive: true });
  await page.screenshot({ path: '.tmp/documentatie.png' });

  // Filtrul navigatorului, fără diacritice.
  await page.locator('.doc-cauta').fill('usa svg');
  await expect(page.locator('.doc-nav [data-doc]')).toHaveCount(1);
  await expect(page.locator('.doc-nav [data-doc]')).toHaveAttribute('data-doc', 'docs/adr/0035-usa-svg.md');
  expect(erori).toEqual([]);
});

test('adresa: /admin#documentatie/… deschide documentul după login; un document necunoscut spune asta', async ({ page }) => {
  await intraCaOwner(page, '/admin#documentatie/docs/etape/etapa-03.md');
  await expect(page.locator('article[data-document="docs/etape/etapa-03.md"] h2').first()).toContainText('Etapa 3');
  await page.evaluate(() => { location.hash = '#documentatie/docs/adr/9999-nu-exista.md'; });
  await expect(page.locator('.doc-articol [role="alert"]')).toContainText('9999-nu-exista.md');
});
