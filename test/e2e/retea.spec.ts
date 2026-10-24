import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

/**
 * Copierea în rețea (felia 3.I, ADR 0061), în Edge: panoul din extensia barei, previzualizarea copiilor pe pânză, rânduri ×
 * coloane și pe cerc, motivele, un singur pas de anulare, copiile independente (fiecare cu poziția ei în panou).
 */
test.use({ locale: 'ro-RO' });

const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');
const camp = (page: Page, k: string) => page.locator(`[data-retea="${k}"]`);

async function deschide(page: Page): Promise<void> {
  await page.locator('[data-editare="retea"]').click();
  await expect(page.getByTestId('panou-retea')).toBeVisible();
}

test('rânduri și coloane: previzualizarea, 3 × 2 copii la pasul cutiei plus spațiu, un singur pas de anulare', async ({ page }) => {
  await page.goto('/');
  // Fără selecție: panoul spune ce lipsește, iar Copiază e inactiv.
  await deschide(page);
  await expect(page.getByTestId('motiv-retea')).toHaveText('Alege întâi formele de copiat.');
  await expect(camp(page, 'copiaza')).toBeDisabled();
  await page.locator('[data-editare="retea"]').click();
  await adauga(page, 'dreptunghi');
  await deschide(page);
  await page.locator('[data-retea-fel="grila"]').click();
  await camp(page, 'coloane').fill('3');
  await camp(page, 'randuri').fill('2');
  await camp(page, 'spatiuX').fill('10');
  await camp(page, 'spatiuY').fill('10');
  await expect(page.getByTestId('retea-previzualizare').locator('polygon')).toHaveCount(5);
  await expect(page.getByTestId('motiv-retea')).toHaveCount(0);
  await camp(page, 'copiaza').click();
  await expect(page.getByTestId('panou-retea')).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(6);
  await expect(page.locator('.prop-multi')).toHaveText('6 piese selectate');
  // A treia copie din primul rând: X = 20 + 2 · 110.
  await randuri(page).nth(2).click();
  await expect(page.locator('[data-camp="pozitie-x"]')).toHaveValue('240');
  await expect(page.locator('[data-camp="pozitie-y"]')).toHaveValue('20');
  // Un singur pas de anulare.
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(1);
});

test('pe cerc: 4 copii în jurul centrului dat, rotite; valorile greșite se spun și opresc Copiază', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'cerc');
  await deschide(page);
  await page.locator('[data-retea-fel="cerc"]').click();
  await camp(page, 'numar').fill('1');
  await expect(page.getByTestId('motiv-retea')).toHaveText('Câte: un număr întreg de la 2 la 360.');
  await expect(camp(page, 'copiaza')).toBeDisabled();
  await camp(page, 'numar').fill('4');
  await camp(page, 'unghi').fill('360');
  await camp(page, 'centruX').fill('150');
  await camp(page, 'centruY').fill('100');
  await expect(camp(page, 'roteste')).toBeChecked();
  await expect(page.getByTestId('retea-previzualizare').locator('polygon')).toHaveCount(3);
  await camp(page, 'copiaza').click();
  await expect(randuri(page)).toHaveCount(4);
  // Cercul R15 cu centrul în (70, 50), rotit cu 90° în jurul lui (150, 100): centrul în (200, 20), colțul cutiei în (185, 5).
  await randuri(page).nth(1).click();
  await expect(page.locator('[data-camp="pozitie-x"]')).toHaveValue('185');
  await expect(page.locator('[data-camp="pozitie-y"]')).toHaveValue('5');
  await expect(page.locator('[data-camp="rotire"]')).toHaveValue('90');
  // Formularul rămâne ținut în browser: la redeschidere, felul și valorile sunt aceleași.
  await deschide(page);
  await expect(page.locator('[data-retea-fel="cerc"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(camp(page, 'centruX')).toHaveValue('150');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('panou-retea')).toHaveCount(0);
});
