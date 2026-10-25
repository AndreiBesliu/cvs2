import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

/**
 * Manualul (documentația live, felia 3.F, ADR 0058), în Edge: butonul „?” și F1 îl deschid (F1 la capitolul de acum:
 * unealta, vederea 3D, fereastra exportului); cuprinsul, linkurile dintre capitole, căutarea fără diacritice, limba;
 * tastele din manual nu ajung la scurtăturile aplicației; fereastra și fișierul vin abia la prima deschidere.
 */
test.use({ locale: 'ro-RO' });

const manual = (page: Page) => page.getByTestId('manual');
const capitol = (page: Page) => page.getByTestId('manual-capitol');

async function deschide(page: Page): Promise<void> {
  await page.locator('[data-editare="manual"]').click();
  await expect(manual(page)).toHaveAttribute('data-stare', 'gata');
}

test('„?” deschide manualul la primul capitol: cuprinsul cu 17 capitole, linkurile duc între capitole, Esc închide', async ({ page }) => {
  const cereri: string[] = [];
  page.on('request', (r) => { cereri.push(new URL(r.url()).pathname); });
  await page.goto('/');
  await expect(page.locator('[data-editare="manual"]')).toBeVisible();
  expect(cereri.filter((c) => c.startsWith('/manual/') || /\/assets\/Manual-/.test(c)), 'nimic din manual înaintea clicului').toEqual([]);
  await deschide(page);
  expect(cereri.filter((c) => c === '/manual/ro.json')).toHaveLength(1);
  await expect(page.locator('#manual-titlu')).toHaveText('Manualul CNC Vector Studio');
  await expect(manual(page).locator('.manual-cuprins button')).toHaveCount(17);
  await expect(capitol(page)).toHaveAttribute('data-capitol', 'pornire');
  await expect(capitol(page).locator('h3')).toHaveText('Primii pași');
  // Linkul „Proiectul și salvarea” duce la capitolul lui; cuprinsul îl arată ales.
  await capitol(page).getByRole('link', { name: 'Proiectul și salvarea' }).click();
  await expect(capitol(page)).toHaveAttribute('data-capitol', 'proiect');
  await expect(manual(page).locator('button[data-capitol="proiect"]')).toHaveAttribute('aria-current', 'page');
  await manual(page).locator('button[data-capitol="vedere-3d"]').click();
  await expect(capitol(page).locator('h3')).toHaveText('Vederea 3D');
  await expect(capitol(page)).toContainText('0,1 mm la apropiere');
  await page.keyboard.press('Escape');
  await expect(manual(page)).toHaveCount(0);
  // Redeschis fără context: ultimul capitol citit, fără o cerere nouă pentru fișier.
  await deschide(page);
  await expect(capitol(page)).toHaveAttribute('data-capitol', 'vedere-3d');
  expect(cereri.filter((c) => c === '/manual/ro.json')).toHaveLength(1);
  await manual(page).getByTestId('manual-inchide').click();
  await expect(manual(page)).toHaveCount(0);
});

test('F1 deschide la capitolul de acum: unealta aleasă, Transformare, vederea 3D, fereastra exportului', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  const f1 = async (asteptat: string): Promise<void> => {
    await page.keyboard.press('F1');
    await expect(manual(page)).toHaveAttribute('data-stare', 'gata');
    await expect(capitol(page)).toHaveAttribute('data-capitol', asteptat);
    await page.keyboard.press('Escape');
    await expect(manual(page)).toHaveCount(0);
  };
  await page.locator('[data-unealta="cerc"]').click();
  await f1('desen');
  await page.locator('[data-unealta="transformare"]').click();
  await f1('transformari');
  await page.locator('[data-unealta="selectie"]').click();
  await f1('selectie');
  await page.locator('[data-editare="vedere-3d"]').click();
  await expect(page.getByTestId('panza-3d')).toHaveAttribute('data-stare', 'gata', { timeout: 30_000 });
  await f1('vedere-3d');
  await expect(page.getByTestId('vedere-3d')).toHaveCount(1);
  await page.locator('[data-editare="vedere-3d"]').click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-camp="origine"]')).toBeVisible();
  await f1('export');
  // Esc a închis manualul, nu și fereastra exportului de dedesubt.
  await expect(page.locator('[data-camp="origine"]')).toBeVisible();
});

test('căutarea: fără diacritice și fără litere mari; nimic găsit se spune', async ({ page }) => {
  await page.goto('/');
  await deschide(page);
  const cauta = page.getByTestId('manual-cauta');
  await cauta.fill('ROTESTE');
  const gasite = manual(page).locator('.manual-cuprins button');
  await expect(gasite).not.toHaveCount(17);
  const ids = await gasite.evaluateAll((b) => b.map((x) => x.getAttribute('data-capitol')));
  expect(ids).toContain('transformari');
  expect(ids).toContain('selectie');
  expect(ids).not.toContain('import');
  await cauta.fill('qqqzzz');
  await expect(gasite).toHaveCount(0);
  await expect(manual(page).locator('.manual-niciunul')).toHaveText('Niciun capitol nu conține „qqqzzz”.');
});

test('tastele din manual nu ajung la aplicație: Delete, T și Ctrl+Z, fiecare pe rând, nu ating desenul', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  const randuri = page.getByTestId('lista-vectori').locator('button[data-instanta]');
  await expect(randuri).toHaveCount(1);
  // Fiecare tastă separat: Delete urmat de Ctrl+Z s-ar anula între ele și proba n-ar vedea nimic.
  const inManual = async (tasta: string): Promise<void> => {
    await deschide(page);
    await manual(page).locator('button[data-capitol="desen"]').focus();
    await page.keyboard.press(tasta);
    await page.keyboard.press('Escape');
    await expect(manual(page)).toHaveCount(0);
  };
  await inManual('Delete');
  await expect(randuri).toHaveCount(1);
  await inManual('t');
  await expect(page.getByTestId('traseu-stare')).toHaveCount(0);
  await expect(page.getByTestId('strat-traseu')).toHaveCount(0);
  await expect(page.locator('[data-actiune="vedere.traseu"]')).toHaveAttribute('aria-pressed', 'false');
  // Ctrl+Z ar anula adăugarea dreptunghiului.
  await inManual('Control+z');
  await expect(randuri).toHaveCount(1);
});

test('în engleză: manualul englez, cu aceleași capitole și textele ferestrei în engleză', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await deschide(page);
  await expect(page.locator('#manual-titlu')).toHaveText('CNC Vector Studio manual');
  await expect(manual(page)).toHaveAttribute('data-limba', 'en');
  await manual(page).locator('button[data-capitol="export"]').click();
  await expect(capitol(page).locator('h3')).toHaveText('Exporting G-code');
  await expect(manual(page).locator('.manual-cuprins button')).toHaveCount(17);
  await expect(page.getByTestId('manual-cauta')).toHaveAttribute('placeholder', 'Search the manual');
});
