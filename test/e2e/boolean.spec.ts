import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Booleanul (felia 6.M↑, ADR 0067), în Edge: dreptunghiul 100 × 60 și cercul R15 din mijlocul lui, alese în ordine (cercul cu
 * Shift + clic): Scade lasă o singură formă (dreptunghiul cu gaura), aleasă, un pas de anulare; Unește le face una (cât
 * dreptunghiul); Intersectează lasă cercul; butoanele sunt oprite fără două forme alese; două forme care nu se ating = motiv.
 */
test.use({ locale: 'ro-RO' });

const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');

/** Dreptunghiul (20, 20, 100 × 60) și cercul R15 cu centrul în (70, 50), aleși în ordinea asta. */
async function alegeDreptunghiulApoiCercul(page: Page): Promise<void> {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await randuri(page).first().click();
  const pe = (await ecran(page, await vedere(page)))(85, 50);
  await page.keyboard.down('Shift');
  await page.mouse.click(pe.x, pe.y);
  await page.keyboard.up('Shift');
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]')).toHaveCount(2);
}

test('Scade: dreptunghiul minus cercul = o formă cu gaură, aleasă; un pas de anulare readuce ambele', async ({ page }) => {
  await alegeDreptunghiulApoiCercul(page);
  await page.locator('[data-editare="boolean-scade"]').click();
  await expect(randuri(page)).toHaveCount(1);
  // O piesă cu două contururi: conturul (4 segmente) și gaura („+1”).
  await expect(randuri(page).first()).toContainText('cale 100.00 × 60.00, 4 segmente');
  await expect(randuri(page).first()).toContainText('(+1)');
  await expect(randuri(page).first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('motiv-boolean')).toHaveCount(0);
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(2);
  await expect(randuri(page).first()).toContainText('dreptunghi 100.00 × 60.00');
});

test('Unește dă o cale cât dreptunghiul (cercul e înăuntru); un pas de anulare', async ({ page }) => {
  await alegeDreptunghiulApoiCercul(page);
  await page.locator('[data-editare="boolean-uneste"]').click();
  await expect(randuri(page)).toHaveCount(1);
  await expect(randuri(page).first()).toContainText('cale 100.00 × 60.00');
  await expect(randuri(page).first()).not.toContainText('(+1)');
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(2);
});

test('Intersectează lasă doar cercul (o cale de 30 × 30)', async ({ page }) => {
  await alegeDreptunghiulApoiCercul(page);
  await page.locator('[data-editare="boolean-intersecteaza"]').click();
  await expect(randuri(page)).toHaveCount(1);
  await expect(randuri(page).first()).toContainText('cale 30.00 × 30.00');
});

test('fără două forme alese, butoanele sunt oprite; două forme care nu se ating: motivul', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await expect(page.locator('[data-editare="boolean-uneste"]')).toBeDisabled();
  // Un cerc pus cu unealta Cerc (un clic, raza din câmp, 15 mm), cu centrul în (220, 50), departe de dreptunghi.
  await page.locator('[data-editare="lipire"]').click();
  await page.locator('[data-unealta="cerc"]').click();
  const e = await ecran(page, await vedere(page));
  const c = e(220, 50);
  await page.mouse.click(c.x, c.y);
  await expect(randuri(page).nth(1)).toContainText('X 220.00, Y 50.00');
  await page.locator('[data-unealta="selectie"]').click();
  await randuri(page).first().click();
  const pe = e(235, 50);
  await page.keyboard.down('Shift');
  await page.mouse.click(pe.x, pe.y);
  await page.keyboard.up('Shift');
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]')).toHaveCount(2);
  await page.locator('[data-editare="boolean-uneste"]').click();
  await expect(page.getByTestId('motiv-boolean')).toHaveText('Formele nu se ating: unirea și scăderea nu le-ar schimba.');
  await expect(randuri(page)).toHaveCount(2);
});
