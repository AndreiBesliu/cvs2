import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

/**
 * Bila și toroidala în fereastra exportului (ADR 0303, felia 16.A↑e-4), pe dreptunghiul tăiat pe linie (canelura): forma se
 * alege pe rând doar pe linie; la toroidală, raza colțului apare (1 mm implicit) și se judecă (peste 0, sub Ø / 2); Exportă
 * scrie forma în document, cu numele după formă (comentariul sculei din program îl poartă), iar fereastra redeschisă o
 * arată. Pe exterior, forma rotundă oprește exportul, cu motivul.
 */
test('canelura cu toroidala și cu bila: forma pe rând, raza colțului judecată, Exportă o scrie în proiect', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-fisa="op"]').first();
  const forma = rand.locator('[data-camp="forma-scula"]');
  // Pe exterior: doar plata și V-ul.
  await expect(forma.locator('option')).toHaveText(['plată', 'în V']);
  await rand.locator('input[data-camp="latura"][value="pe-linie"]').check();
  await expect(forma.locator('option')).toHaveText(['plată', 'în V', 'bilă', 'toroidală']);
  // Toroidala: raza colțului, 1 mm implicit; cât jumătatea diametrului (3 mm la Ø6) nu trece.
  await forma.selectOption('toroidala');
  const raza = rand.locator('[data-camp="raza-colt"]');
  await expect(raza).toHaveValue('1');
  await raza.fill('3');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('o rază a colțului peste 0');
  await expect(rand.locator('[data-grup="freza"] [data-greseala]')).toContainText(['Raza colțului: scrie un număr peste 0 și sub jumătatea diametrului (3 mm).']);
  await raza.fill('1,5');
  await rand.locator('[data-camp="adancime"]').fill('1');
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  let descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  let text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  expect(text).toContain('freza toroidala r1.5 D6');
  // Redeschisă, fereastra arată freza scrisă.
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-fisa="op"]')).toHaveCount(0);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(forma).toHaveValue('toroidala');
  await expect(raza).toHaveValue('1,5');
  // Bila: raza dispare; Exportă scrie bila.
  await forma.selectOption('bila');
  await expect(raza).toHaveCount(0);
  descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  text = readFileSync(await (await descarcare).path(), 'ascii');
  expect(text).toContain('freza bila D6');
  // Pe exterior, bila oprește exportul, cu motivul (lucrarea o taie doar pe linie).
  await rand.locator('input[data-camp="latura"][value="exterior"]').check();
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('taie deocamdată doar pe linie');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
