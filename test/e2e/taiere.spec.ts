import { test, expect, type Page } from '@playwright/test';
import { cerc, dxf, lwpolilinie } from '../unit/ajutor-dxf.ts';

/**
 * Tăierea cu o linie dreaptă (felia 10.3↑, ADR 0180), în Edge, pe un DXF importat (o piesă cu un pătrat 100 × 100 și un cerc
 * R30 la (200, 50)): butonul Taie din extensia barei deschide panoul, cu X pornit din mijlocul formelor alese; linia se vede pe
 * pânză. Taie la X = 50 face din piesă două forme (jumătatea stângă a pătratului; cealaltă jumătate cu cercul), alese;
 * Anulează pune piesa la loc. Fără „Închide bucățile”, bifa ținută după reîncărcare; fără ghidaje pe foaie, alegerea lor e
 * stinsă; o linie pe lângă forme e refuzată cu motiv; Esc închide panoul și stinge linia.
 */
test.use({ locale: 'ro-RO' });

const fisierDxf = (nume: string, text: string) => ({ name: nume, mimeType: 'application/dxf', buffer: Buffer.from(text, 'utf8') });
const ENTITATI = [
  lwpolilinie([[0, 0], [100, 0], [100, 100], [0, 100]], true, { strat: 'PATRAT' }),
  cerc(200, 50, 30, { strat: 'CERC' }),
].join('');

const panou = (page: Page) => page.getByTestId('panou-taiere');
const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');

async function importa(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf('taiere.dxf', dxf({ antet: [['$INSUNITS', 70, 4]], entitati: ENTITATI })));
  await page.click('[data-buton="importa"]');
  await expect(page.locator('.dialog')).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(1);
}

test('Taie la X = 50: piesa importată devine două forme, alese; linia pe pânză; Anulează o pune la loc', async ({ page }) => {
  await importa(page);
  await page.locator('[data-editare="taiere"]').click();
  await expect(panou(page)).toBeVisible();
  // X pornește din mijlocul formelor alese: pătratul (0…100) și cercul (170…230), deci 115.
  await expect(page.locator('[data-taiere="x"]')).toHaveValue('115');
  await expect(page.getByTestId('taiere-linia')).toHaveAttribute('data-axa', 'x');
  await page.locator('[data-taiere="x"]').fill('50');
  await expect(page.locator('[data-taiere="inchide"]')).toBeChecked();
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 1; forme noi: 2, alese.');
  await expect(randuri(page)).toHaveCount(2);
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]')).toHaveCount(2);

  await page.keyboard.press('Escape');
  await expect(panou(page)).toHaveCount(0);
  await expect(page.getByTestId('taiere-linia')).toHaveCount(0);
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(1);
});

test('fără „Închide bucățile”: tot două forme, bifa ținută după reîncărcare; o linie pe lângă e refuzată; fără ghidaje, alegerea lor e stinsă', async ({ page }) => {
  await importa(page);
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="inchide"]').uncheck();
  await page.locator('[data-taiere="x"]').fill('50');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 1; forme noi: 2, alese.');
  await expect(randuri(page)).toHaveCount(2);

  // Linia pe lângă forme: refuzul, cu motivul lui.
  await page.locator('[data-taiere="y"]').fill('500');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Linia nu trece prin nicio formă aleasă.');

  await page.reload();
  await expect(randuri(page)).toHaveCount(2);
  await page.locator('[data-editare="taiere"]').click();
  await expect(page.locator('[data-taiere="inchide"]')).not.toBeChecked();
  // Fără ghidaje pe foaie, alegerea ghidajului e stinsă.
  await expect(page.locator('[data-taiere="cu-ghidaj"]')).toBeDisabled();
});
