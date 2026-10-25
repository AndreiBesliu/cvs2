import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Copierea de-a lungul unei curbe (felia 6.L↑, ADR 0066), în Edge: cercul R15, apoi linia de la (100, 150) la (250, 150),
 * aleasă a doua (Shift + clic), deci curba; panoul „Copiază în rețea”, felul Pe curbă, 4 copii: previzualizarea, Copiază pune
 * cercurile cu centrul la 100, 150, 200, 250 pe linie, alese cu originalul (fără linie); un pas de anulare; doar curba = motiv.
 */
test.use({ locale: 'ro-RO' });

const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');

async function trage(page: Page, a: { x: number; y: number }, b: { x: number; y: number }): Promise<void> {
  const e = await ecran(page, await vedere(page));
  const [sa, sb] = [e(a.x, a.y), e(b.x, b.y)];
  await page.mouse.move(sa.x, sa.y);
  await page.mouse.down();
  await page.mouse.move((sa.x + sb.x) / 2, (sa.y + sb.y) / 2, { steps: 4 });
  await page.mouse.move(sb.x, sb.y, { steps: 4 });
  await page.mouse.up();
}

test('cercul copiat de 4 ori pe linie: previzualizarea, copiile la pas egal, alese cu originalul; un pas de anulare', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-editare="lipire"]').click();
  await adauga(page, 'cerc');
  await page.locator('[data-unealta="linie"]').click();
  await trage(page, { x: 100, y: 150 }, { x: 250, y: 150 });
  await expect(randuri(page)).toHaveCount(2);
  await page.locator('[data-unealta="selectie"]').click();
  // Întâi cercul, apoi linia cu Shift + clic: linia e ultima aleasă, deci curba.
  await randuri(page).first().click();
  const pe = (await ecran(page, await vedere(page)))(175, 150);
  await page.keyboard.down('Shift');
  await page.mouse.click(pe.x, pe.y);
  await page.keyboard.up('Shift');
  await expect(randuri(page).nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(randuri(page).first()).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-editare="retea"]').click();
  await page.locator('[data-retea-fel="curba"]').click();
  await page.locator('[data-retea="copiiCurba"]').fill('4');
  await page.locator('[data-retea="roteste"]').uncheck();
  await expect(page.getByTestId('motiv-retea')).toHaveCount(0);
  await expect(page.getByTestId('retea-previzualizare').locator('polygon')).toHaveCount(4);
  await page.locator('[data-retea="copiaza"]').click();
  await expect(randuri(page)).toHaveCount(6);
  for (const x of ['100.00', '150.00', '200.00', '250.00']) await expect(page.getByTestId('lista-vectori')).toContainText(`X ${x}, Y 150.00`);
  await expect(randuri(page).nth(1)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]')).toHaveCount(5);
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(2);
});

test('doar curba aleasă: motivul, Copiază oprit', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-editare="retea"]').click();
  await page.locator('[data-retea-fel="curba"]').click();
  await expect(page.getByTestId('motiv-retea')).toHaveText('Alege și formele de copiat, nu doar curba (curba e ultima aleasă).');
  await expect(page.locator('[data-retea="copiaza"]')).toBeDisabled();
});
