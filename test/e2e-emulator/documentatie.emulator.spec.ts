import { mkdirSync, readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
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
  // Pentru owner, fila Azi (ADR 0260) aduce doar roadmap-ul, pentru „Ce așteaptă de la tine”; restul documentației, nimic.
  await expect(page.locator('[data-azi="asteapta"] [data-asteapta]').first()).toBeVisible();
  expect(cereri, 'din documentație, înaintea filei, doar roadmap-ul filei Azi').toEqual(['/documentatie/roadmap.json']);

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
  // Etapa 5: buzunarul cu mai multe freze (5.5↑, 5.6↑), animația traseului (5.7↑) și ordinea de mână (5.9↑) făcute,
  // găurirea (5.4↑) în lucru, o jumătate: (3 + 0,5) din 4. Aceleași cifre ca proba unitară a pragului (`documentatie.test.ts`).
  expect(u5.p).toBeCloseTo(0.875, 2);
  await expect(page.locator('[data-etapa="5"]')).toHaveAttribute('aria-label', /3 \/ 4 făcute, 1 în lucru \(un punct fără rând în prag\)/);

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

  await expect(page.locator('[data-fila="documentatie"]')).toHaveAttribute('aria-current', 'page');
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

/** Cutia unui element pe ecran (în px). */
const cutie = async (l: Locator) => {
  const b = await l.boundingBox();
  if (!b) throw new Error('elementul nu se vede');
  return { sus: b.y, jos: b.y + b.height, stanga: b.x, dreapta: b.x + b.width };
};

test('Documentație (ADR 0260 §8): cuprinsul alături, cu secțiunea de acum și clicul pe ea; starea ADR-ului sub titlu; la 1 024 px, cuprinsul deasupra', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.setViewportSize({ width: 1440, height: 900 });
  const CALE = 'docs/adr/0260-adminul-reproiectat.md';
  await intraCaOwner(page, `/admin#documentatie/${CALE}`);
  const articol = page.locator(`article[data-document="${CALE}"]`);
  const titlu = articol.locator('h2').first();
  await expect(titlu).toContainText('ADR 0260 — Pagina /admin reproiectată');

  // Starea, sub titlu: insigna și ziua din rândul „**Starea:**”.
  const stare = articol.locator('[data-doc-stare="acceptat"]');
  await expect(stare.locator('.doc-stare')).toHaveText('acceptat');
  await expect(stare).toContainText('13.11.2026');
  expect((await cutie(stare)).sus).toBeGreaterThanOrEqual((await cutie(titlu)).jos - 1);

  // Cuprinsul: titlurile de nivel 2 (și 3) ale documentului, fiecare cu ținta lui în articol; alături, în dreapta.
  const cuprins = page.locator('[data-doc="cuprins"]');
  const legaturi = cuprins.locator('a[data-ancora]');
  await expect(legaturi.first()).toHaveText('Problema');
  await expect(legaturi.nth(1)).toHaveText('Decizia');
  await expect(legaturi.nth(2)).toHaveText('Feliile');
  await expect(legaturi.last()).toHaveText('Implementarea');
  const fara = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-doc="cuprins"] a[data-ancora]')]
    .map((a) => a.dataset['ancora'] ?? '').filter((a) => !document.querySelector(`article [id="md-${CSS.escape(a)}"]`)));
  expect(fara, 'fiecare intrare a cuprinsului are titlul ei în articol').toEqual([]);
  expect((await cutie(cuprins)).stanga).toBeGreaterThanOrEqual((await cutie(articol)).dreapta);
  expect((await cutie(page.locator('.doc-nav'))).dreapta).toBeLessThanOrEqual((await cutie(articol)).stanga);
  // La începutul documentului, nicio secțiune încă.
  await expect(cuprins.locator('[aria-current]')).toHaveCount(0);

  // Derulat la „Feliile”, cuprinsul o marchează și rămâne la vedere (lipit sus).
  await page.locator('#md-feliile').evaluate((el) => { el.scrollIntoView({ block: 'start' }); });
  await expect(cuprins.locator('[aria-current="location"]')).toHaveText('Feliile');
  await expect(cuprins).toBeInViewport();
  // La capătul paginii, ultima secțiune (scurtă sau nu, nu mai urcă până sus).
  await page.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight); });
  await expect(cuprins.locator('[aria-current="location"]')).toHaveText('Implementarea');

  // Un clic duce la titlu și pune ancora în adresă; al doilea clic pe aceeași ancoră, după o derulare, duce iar acolo.
  const probele = legaturi.filter({ hasText: /^Probele$/ });
  await probele.click();
  await expect(page).toHaveURL(/#documentatie\/docs\/adr\/0260-adminul-reproiectat\.md#probele$/);
  await expect(page.locator('#md-probele')).toBeInViewport();
  await expect(cuprins.locator('[aria-current="location"]')).toHaveText('Probele');
  await page.evaluate(() => { window.scrollTo(0, 0); });
  await expect(page.locator('#md-probele')).not.toBeInViewport();
  await probele.click();
  await expect(page.locator('#md-probele')).toBeInViewport();

  // La 1 024 px, cuprinsul stă deasupra documentului, în coloana lui; lista documentelor rămâne în stânga.
  await page.evaluate(() => { window.scrollTo(0, 0); });
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect.poll(async () => (await cutie(cuprins)).jos <= (await cutie(articol)).sus).toBe(true);
  expect((await cutie(cuprins)).stanga).toBeGreaterThanOrEqual((await cutie(page.locator('.doc-nav'))).dreapta);
  expect(Math.abs((await cutie(cuprins)).stanga - (await cutie(articol)).stanga)).toBeLessThan(1);
  await page.setViewportSize({ width: 1440, height: 900 });

  // Un document cu ultima secțiune scurtă: la capătul paginii, ea, deși titlul ei n-a urcat până sus.
  const ADR116 = 'docs/adr/0116-conturile-clientilor.md';
  await page.locator(`[data-doc="${ADR116}"]`).click();
  await expect(page.locator(`article[data-document="${ADR116}"] h2`).first()).toBeVisible();
  await page.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight); });
  await expect(cuprins.locator('[aria-current="location"]')).toHaveText('Se redeschide dacă');
  expect(await page.locator('#md-se-redeschide-dacă').evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThan(96);

  // Un ADR propus își spune starea; unul fără titluri de secțiune n-are cuprins; un document care nu e ADR n-are insignă.
  const catalog = JSON.parse(readFileSync('dist/documentatie/catalog.json', 'utf8')) as { documente: { cale: string; stare: string | null }[] };
  const propus = catalog.documente.find((d) => d.stare === 'propus');
  if (propus) {
    await page.locator(`[data-doc="${propus.cale}"]`).click();
    const data = /^\*\*Starea:\*\*.*?(\d{2}\.\d{2}\.\d{4})/m.exec(readFileSync(propus.cale, 'utf8'))?.[1] ?? '';
    const s = page.locator(`article[data-document="${propus.cale}"] [data-doc-stare="propus"]`);
    await expect(s.locator('.doc-stare')).toHaveText('propus');
    if (data) await expect(s).toContainText(data);
  }
  await page.locator('[data-doc="docs/adr/0001-conturul-are-trei-primitive.md"]').click();
  await expect(page.locator('article[data-document="docs/adr/0001-conturul-are-trei-primitive.md"] [data-doc-stare="acceptat"]')).toContainText('07.10.2026');
  await expect(cuprins).toHaveCount(0);
  await page.locator('[data-doc="PLAN.md"]').click();
  await expect(page.locator('article[data-document="PLAN.md"] h2').first()).toBeVisible();
  await expect(page.locator('[data-doc-stare]')).toHaveCount(0);
  await expect(cuprins).toBeVisible();
  expect(erori).toEqual([]);
});

test('Roadmap (ADR 0260 §8): „Ce așteaptă de la tine” alături de etape și la vedere la derulare; la 1 024 px, deasupra; semnele pistei rămân în coloana lor', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await intraCaOwner(page);
  await page.locator('[data-fila="roadmap"]').click();
  const owner = page.locator('[data-roadmap="owner"]');
  const cronologie = page.locator('.rm-cronologie');
  await expect(page.locator('.rm-etapa')).toHaveCount(33);
  expect((await cutie(owner)).dreapta).toBeLessThanOrEqual((await cutie(cronologie)).stanga);
  // Panoul e cel mult cât ecranul (lipit sus, încape întreg), iar o listă lungă se derulează în el (titlul lui rămâne sus).
  const o = await cutie(owner);
  expect(o.jos - o.sus).toBeLessThanOrEqual(900);
  expect(await owner.locator('.rm-owner-lista').evaluate((el) => getComputedStyle(el).overflowY)).toBe('auto');
  if (ROADMAP.owner.length > 12) expect(await owner.locator('.rm-owner-lista').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);

  // Coborât la ultima felie a etapei, lista e tot la vedere, sus.
  await page.locator('[data-roadmap-etapa="3"] .rm-felie').last().evaluate((el) => { el.scrollIntoView({ block: 'center' }); });
  await expect(cronologie).not.toBeInViewport();
  await expect(owner).toBeInViewport();
  const lipit = await cutie(owner);
  expect(lipit.sus).toBeLessThan(40);
  expect(lipit.jos).toBeLessThanOrEqual(900);

  // Semnele fiecărei etape (↑N, placa, live-ul) rămân în coloana ei, pe pista îngustă de aici și la 1 024 px.
  const iesite = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.rm-etapa')].flatMap((b) => {
    const c = b.getBoundingClientRect();
    return [...b.querySelectorAll<HTMLElement>('.rm-semne > *')].filter((s) => {
      const r = s.getBoundingClientRect();
      return r.left < c.left - 0.5 || r.right > c.right + 0.5;
    }).map(() => b.dataset['etapa'] ?? '');
  }));
  await page.evaluate(() => { window.scrollTo(0, 0); });
  expect(await iesite()).toEqual([]);
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect.poll(async () => (await cutie(owner)).jos <= (await cutie(cronologie)).sus).toBe(true);
  expect(await iesite()).toEqual([]);
});
