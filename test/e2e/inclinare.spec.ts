import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Înclinarea (felia 6.K↑, ADR 0065), în Edge: butonul Înclină din secțiunea Oglindire a extensiei, panoul cu unghiurile,
 * previzualizarea cutiei înclinate, Înclină (dreptunghiul 100 × 60 cu 45° pe orizontală ocupă 160 × 60), un pas de anulare;
 * cercul se refuză cu motiv; unghiul prea mare; fără selecție; Esc închide.
 */
test.use({ locale: 'ro-RO' });

const panou = (page: Page) => page.getByTestId('panou-inclinare');
const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');
const motiv = (page: Page) => page.getByTestId('motiv-inclinare');

test('dreptunghiul cu 45° pe orizontală: previzualizarea, Înclină dă o cale de 160 × 60; un pas de anulare', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-editare="inclinare"]').click();
  await expect(panou(page)).toBeVisible();
  await expect(page.locator('[data-inclinare="x"]')).toHaveValue('15');
  await expect(page.getByTestId('inclinare-previzualizare')).toBeVisible();
  await page.locator('[data-inclinare="x"]').fill('45');
  await expect(motiv(page)).toHaveCount(0);
  await page.locator('[data-inclinare="aplica"]').click();
  await expect(panou(page)).toHaveCount(0);
  await expect(randuri(page).first()).toContainText('cale 160.00 × 60.00');
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page).first()).toContainText('dreptunghi 100.00 × 60.00');
});

test('cercul nu se înclină (motivul, butonul oprit); unghiul prea mare; fără selecție; Esc închide', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'cerc');
  await page.locator('[data-editare="inclinare"]').click();
  await expect(motiv(page)).toHaveText('O formă cu arce (un cerc, colțuri rotunjite) nu se înclină: arcele ar deveni elipse.');
  await expect(page.locator('[data-inclinare="aplica"]')).toBeDisabled();
  await page.locator('[data-inclinare="y"]').fill('80');
  await expect(motiv(page)).toHaveText('Unghiurile: numere între −75° și 75° (gol = 0).');
  await page.locator('[data-inclinare="x"]').fill('');
  await page.locator('[data-inclinare="y"]').fill('');
  await expect(motiv(page)).toHaveText('Scrie un unghi pe orizontală sau pe verticală.');
  await page.locator('[data-inclinare="y"]').press('Escape');
  await expect(panou(page)).toHaveCount(0);
  // Un clic pe gol golește selecția.
  const gol = (await ecran(page, await vedere(page)))(250, 150);
  await page.mouse.click(gol.x, gol.y);
  await expect(randuri(page).first()).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-editare="inclinare"]').click();
  await expect(motiv(page)).toHaveText('Alege formele de înclinat.');
});
