import { test, expect, type Page } from '@playwright/test';
import { impacheteaza } from '../../scripts/impacheteaza-extensie.ts';

/**
 * Fereastra extensiei și senderul prin `HostApi` (ADR 0199, felia 3.Xc), în Edge, cu extensia de probă `extensii/proba-masina`:
 * - fereastra: fila cu numele, după Proiectare și Mașina, apăsată; altă fereastră o ascunde, iar cadrul își păstrează
 *   pagina; nu se ține după reîncărcare; F1 deschide capitolul extensiilor; × o închide;
 * - starea, la fiecare schimbare (și fără fereastra Mașina: neconectată); încărcarea verificată ca „Fișier…”: numele, programul
 *   fără WCS (cu linia), cel bun, arătat în fereastra Mașina „de la” extensie;
 * - pornirea cu confirmarea omului: fereastra lui cvs2 peste tot, „Pornește” oprit o secundă, focusul pe „Nu”, Escape = „Nu”,
 *   alt program refuzat cât așteaptă; pauza, direct; reluarea, cu confirmarea ei; oprirea, direct;
 * - lucrarea trimisă: dialogul primirii, cu originea extensiei, „Nu” și „Primește”, apoi „Lucrarea primită” în fereastra
 *   Mașina; una fără forma protocolului, refuzată fără dialog;
 * - pe live, senderul e refuzat extensiei, iar starea nu ajunge la ea.
 */
test.use({ locale: 'ro-RO' });

const PROBA = Buffer.from(impacheteaza('extensii/proba-masina').octeti);
const cadru = (page: Page) => page.frameLocator('iframe.cadru-extensie');
const apasa = (page: Page, id: string) => cadru(page).locator(`[data-proba-masina="${id}"]`).click();
const rezultat = (page: Page, id: string) => cadru(page).locator(`[data-rezultat="${id}"]`).last();
const stare = (page: Page) => cadru(page).locator('[data-proba="stare"]');
/** Jurnalul local, fără erori; dacă are, eșecul arată și intrările lui, nu doar numărul. */
async function faraErori(page: Page): Promise<void> {
  try {
    await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
  } catch (e) {
    const intrari = await page.evaluate(() => localStorage.getItem('cncvs2.jurnalErori.v1'));
    throw new Error(`${(e as Error).message}\nJurnalul: ${intrari ?? '—'}`);
  }
}

async function instaleaza(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: 'proba-masina-1.0.0.zip', mimeType: 'application/zip', buffer: PROBA });
  await expect(page.getByTestId('extensii-permisiuni')).toHaveText(
    'Cere: să folosească mașina: să încarce programe, să le pornească sau să le reia după confirmarea ta, să pună pauză și să oprească lucrarea.',
  );
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect(page.getByTestId('extensii-instalare')).toHaveCount(0);
}
async function deschide(page: Page): Promise<void> {
  await page.locator('[data-extensii="buton"]').click();
  await page.getByTestId('meniu-extensii').locator('[data-extensii="deschide"][data-id="proba-masina"]').click();
  await expect(page.getByTestId('spatiu-extensie')).toHaveAttribute('data-stare', 'pornit');
}

test('fereastra extensiei: fila cu numele; altă fereastră o ascunde, cu pagina păstrată; F1; nu se ține; × o închide', async ({ page }) => {
  await instaleaza(page);
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'proiectare');
  await deschide(page);
  const fila = page.locator('[data-extensii="fila"]');
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'extensie');
  await expect(fila).toHaveText('Proba senderului');
  await expect(fila).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-actiune="vedere.proiectare"]')).not.toHaveAttribute('aria-current');
  await expect(page.locator('.lucru')).toHaveCSS('visibility', 'hidden');
  await expect(page.locator('.doc-stanga')).toHaveAttribute('inert', '');
  // Fără fereastra Mașina deschisă vreodată nu există sesiune: neconectată, fără program.
  await expect(stare(page)).toHaveText('neconectată · liber · — · —');
  await apasa(page, 'stare');
  await expect(rezultat(page, 'stare')).toHaveText('stare: "liber"');

  await page.locator('[data-actiune="vedere.proiectare"]').click();
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'proiectare');
  await expect(page.locator('.fereastra-extensie')).toBeHidden();
  await expect(page.locator('iframe.cadru-extensie')).toHaveCount(1);
  await expect(fila).not.toHaveAttribute('aria-current');
  await fila.click();
  await expect(page.locator('.fereastra-extensie')).toBeVisible();
  await expect(rezultat(page, 'stare')).toHaveText('stare: "liber"');
  // F1, cu focusul în afara cadrului: capitolul extensiilor.
  await fila.focus();
  await page.keyboard.press('F1');
  await expect(page.getByTestId('manual-capitol').locator('h3')).toHaveText('Extensiile');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('manual')).toHaveCount(0);

  await page.reload();
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'proiectare');
  await expect(fila).toHaveCount(0);
  await deschide(page);
  await page.locator('[data-extensii="inchide-fereastra"]').click();
  await expect(fila).toHaveCount(0);
  await expect(page.locator('iframe.cadru-extensie')).toHaveCount(0);
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'proiectare');
  await expect(page.locator('.lucru')).toHaveCSS('visibility', 'visible');
  await faraErori(page);
});

test('senderul: încărcarea verificată; pornirea și reluarea confirmate de om; pauza și oprirea direct', async ({ page }) => {
  await instaleaza(page);
  await deschide(page);
  await apasa(page, 'incarca-nume');
  await expect(rezultat(page, 'incarca-nume')).toHaveText('incarca-nume: masina:nume');
  // Fereastra Mașina n-a fost deschisă: încărcarea o montează, ascunsă; „Fișier…” refuză programul fără WCS, cu linia.
  await apasa(page, 'incarca-rau');
  await expect(rezultat(page, 'incarca-rau')).toHaveText('incarca-rau: masina:program:fara-wcs:1');
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'extensie');
  await apasa(page, 'porneste');
  await expect(rezultat(page, 'porneste')).toHaveText('porneste: masina:neconectat');

  // Conectarea rămâne în fereastra Mașina.
  await page.locator('[data-actiune="vedere.masina"]').click();
  await page.locator('[data-masina="viteza"]').selectOption('10');
  await page.locator('[data-masina="simulata"]').click();
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
  await page.locator('[data-extensii="fila"]').click();
  await expect(stare(page)).toHaveText('conectată · liber · conectata · —');

  await apasa(page, 'incarca');
  await expect(rezultat(page, 'incarca')).toHaveText('incarca: ["proba.nc",48]');
  await expect(stare(page)).toHaveText('conectată · pregatit · conectata · proba.nc');
  await expect(page.getByTestId('masina-program')).toContainText('proba.nc · 48 de linii');
  await expect(page.getByTestId('masina-program-de-la')).toHaveText('de la Proba senderului');

  // Pornirea: fereastra lui cvs2, peste tot; „Pornește” oprit o secundă, focusul pe „Nu”; Escape e „Nu”.
  await apasa(page, 'porneste');
  const confirmare = page.getByTestId('confirmare-masina');
  await expect(confirmare).toBeVisible();
  await expect(confirmare).toHaveAttribute('data-fel', 'porneste');
  await expect(page.locator('.aplicatie')).toHaveAttribute('inert', '');
  await expect(page.getByTestId('confirmare-masina-cere')).toHaveText('„Proba senderului” cere să pornească pe mașină programul de mai jos.');
  await expect(page.getByTestId('confirmare-masina-program')).toContainText('proba.nc · 48 de linii');
  await expect(page.locator('[data-masina="confirma"]')).toBeDisabled();
  await expect(page.locator('[data-masina="confirma-renunta"]')).toBeFocused();
  // Cât așteaptă omul, extensia nu poate încărca alt program (clicul, dat din cod: cadrul e inert).
  await cadru(page).locator('[data-proba-masina="incarca"]').evaluate((b) => { (b as HTMLButtonElement).click(); });
  await expect(rezultat(page, 'incarca')).toHaveText('incarca: masina:ocupat');
  await page.keyboard.press('Escape');
  await expect(confirmare).toHaveCount(0);
  await expect(rezultat(page, 'porneste')).toHaveText('porneste: masina:renuntat');
  await expect(page.locator('.aplicatie')).not.toHaveAttribute('inert');
  await expect(stare(page)).toHaveAttribute('data-faza', 'pregatit');

  await apasa(page, 'porneste');
  await expect(page.locator('[data-masina="confirma"]')).toBeEnabled();
  await page.locator('[data-masina="confirma"]').click();
  await expect(rezultat(page, 'porneste')).toHaveText('porneste: null');
  await expect(stare(page)).toHaveAttribute('data-fel', 'ruleaza');
  await expect(page.getByTestId('indicator-lucrare')).toHaveAttribute('data-fel', 'ruleaza');

  await apasa(page, 'pauza');
  await expect(rezultat(page, 'pauza')).toHaveText('pauza: null');
  await expect(stare(page)).toHaveAttribute('data-fel', 'pauza');
  await apasa(page, 'reia');
  await expect(confirmare).toHaveAttribute('data-fel', 'reia');
  await expect(confirmare).toContainText('Lucrarea stă în pauză: mașina continuă mișcarea de unde s-a oprit.');
  await page.locator('[data-masina="confirma"]').click();
  await expect(rezultat(page, 'reia')).toHaveText('reia: null');
  await expect(stare(page)).toHaveAttribute('data-fel', 'ruleaza');

  await apasa(page, 'opreste');
  await expect(rezultat(page, 'opreste')).toHaveText('opreste: null');
  await expect(stare(page)).toHaveAttribute('data-faza', 'pierdut');

  // O extensie care cere pornirea și se închide: confirmarea ei pleacă odată cu ea, iar nimic nu pornește.
  await apasa(page, 'incarca');
  await expect(stare(page)).toHaveAttribute('data-faza', 'pregatit');
  await apasa(page, 'porneste-si-inchide');
  await expect(confirmare).toBeVisible();
  await expect(page.locator('iframe.cadru-extensie')).toHaveCount(0);
  await expect(confirmare).toHaveCount(0);
  await expect(page.getByTestId('masina-faza')).toHaveAttribute('data-faza', 'pregatit');
  await faraErori(page);
});

test('lucrarea trimisă: dialogul primirii, cu originea extensiei; apoi „Lucrarea primită” în fereastra Mașina', async ({ page }) => {
  await instaleaza(page);
  await deschide(page);
  await apasa(page, 'trimite-rau');
  await expect(rezultat(page, 'trimite-rau')).toHaveText('trimite-rau: masina:lucrare');
  await expect(page.getByTestId('dialog-lucrare')).toHaveCount(0);

  await apasa(page, 'trimite');
  const dialog = page.getByTestId('dialog-lucrare');
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('lucrare-de-la')).toHaveText('Proba senderului trimite „Placa de probă”, din extensia instalată „Proba senderului”.');
  await page.locator('[data-masina="lucrare-renunta"]').click();
  await expect(rezultat(page, 'trimite')).toHaveText('trimite: "renuntat"');

  await apasa(page, 'trimite');
  await page.locator('[data-masina="lucrare-primeste"]').click();
  await expect(rezultat(page, 'trimite')).toHaveText('trimite: ["proba_T1.nc"]');
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'masina');
  await expect(page.getByTestId('masina-primita')).toContainText('Lucrarea primită: „Placa de probă”, de la Proba senderului');
  await expect(page.locator('[data-masina="primit-fisier"] option')).toHaveText(['proba_T1.nc']);
  await expect(page.locator('[data-extensii="fila"]')).toHaveText('Proba senderului');
  await faraErori(page);
});

test('pe live, senderul e refuzat extensiei și starea nu ajunge la ea', async ({ page }) => {
  await page.context().route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ instanta: 'live' }) }));
  await instaleaza(page);
  await expect(page.getByTestId('instanta')).toContainText('live');
  await deschide(page);
  await apasa(page, 'stare');
  await expect(rezultat(page, 'stare')).toHaveText('stare: masina:live');
  await apasa(page, 'trimite');
  await expect(rezultat(page, 'trimite')).toHaveText('trimite: masina:live');
  await expect(page.getByTestId('dialog-lucrare')).toHaveCount(0);
  await expect(stare(page)).toHaveText('—');
});
