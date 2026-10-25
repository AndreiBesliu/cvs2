import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Offsetul formelor în desen (felia 6.J↑, ADR 0064), în Edge: panoul din extensia barei (secțiunea Offset), previzualizarea
 * conturului nou, Aplică (o formă nouă, aleasă, un pas de anulare); spre interior, prea adânc = motivul, Aplică oprit;
 * distanța greșită; o cale deschisă = motivul; Esc închide panoul.
 */
test.use({ locale: 'ro-RO' });

const panou = (page: Page) => page.getByTestId('panou-offset');
const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');
const motiv = (page: Page) => page.getByTestId('motiv-offset');

test('dreptunghiul spre exterior cu 5 mm: previzualizarea, Aplică dă calea 110 × 70, aleasă; un pas de anulare', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-editare="offset"]').click();
  await expect(panou(page)).toBeVisible();
  await expect(page.locator('[data-offset-sens="exterior"]')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('[data-offset="distanta"]')).toHaveValue('5');
  await expect(page.getByTestId('offset-previzualizare')).toHaveAttribute('data-contururi', '1');
  await expect(motiv(page)).toHaveCount(0);
  await page.locator('[data-offset="aplica"]').click();
  await expect(panou(page)).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(2);
  await expect(randuri(page).nth(1)).toContainText('110.00 × 70.00');
  await expect(randuri(page).nth(1)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(1);
});

test('spre interior: 5 mm dă 90 × 50; 31 mm nu încape (Aplică oprit); distanța greșită; Esc închide panoul', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-editare="offset"]').click();
  await page.locator('[data-offset-sens="interior"]').click();
  await expect(page.getByTestId('offset-previzualizare')).toHaveAttribute('data-contururi', '1');
  const camp = page.locator('[data-offset="distanta"]');
  await camp.fill('31');
  await expect(motiv(page)).toHaveText('Spre interior, o formă e prea mică pentru distanța cerută.');
  await expect(page.locator('[data-offset="aplica"]')).toBeDisabled();
  await expect(page.getByTestId('offset-previzualizare')).toHaveCount(0);
  await camp.fill('abc');
  await expect(motiv(page)).toHaveText('Distanța: un număr între 0,01 și 1000 mm.');
  await camp.fill('5');
  await page.locator('[data-offset="aplica"]').click();
  await expect(randuri(page).nth(1)).toContainText('90.00 × 50.00');
  await page.locator('[data-editare="offset"]').click();
  await expect(panou(page)).toBeVisible();
  await expect(page.locator('[data-offset-sens="interior"]')).toHaveAttribute('aria-checked', 'true', { timeout: 2000 });
  await camp.press('Escape');
  await expect(panou(page)).toHaveCount(0);
});

test('o cale deschisă (Pen) nu are offset: motivul; fără nimic ales, alt motiv', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-editare="lipire"]').click();
  await page.locator('[data-unealta="pen"]').click();
  const e = await ecran(page, await vedere(page));
  for (const [x, y] of [[20, 20], [80, 40]] as const) {
    const s = e(x, y);
    await page.mouse.click(s.x, s.y);
  }
  await page.keyboard.press('Enter');
  await expect(randuri(page)).toHaveCount(1);
  await page.locator('[data-editare="offset"]').click();
  await expect(motiv(page)).toHaveText('Offsetul se face deocamdată doar pe formele închise.');
  await expect(page.locator('[data-offset="aplica"]')).toBeDisabled();
  await page.locator('[data-offset="inchide"]').click();
  await page.locator('[data-unealta="selectie"]').click();
  const gol = e(250, 150);
  await page.mouse.click(gol.x, gol.y);
  await expect(randuri(page).first()).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-editare="offset"]').click();
  await expect(motiv(page)).toHaveText('Alege formele cărora să le faci offsetul.');
});
