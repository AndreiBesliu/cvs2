/**
 * Centrul foii ca origine XY0 (ADR 0291 §6, felia 28.8↑o): a cincea alegere a ferestrei exportului, lângă colțuri. Se alege
 * din listă sau din punctul din mijlocul desenului; lista spune „centrul foii”, numele propus îl poartă, antetul programului
 * descărcat spune „origine centru”, iar panoul Mașina, lângă zero, spune că XY0 e în centrul foii.
 */
import { test, expect } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

test('centrul: ales din desen și din listă, în numele propus și în antet; Mașina spune unde e XY0', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => erori.push(e.message));
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const origine = page.locator('[data-camp="origine"]');
  await expect(origine.locator('option')).toHaveText(['stânga-jos', 'dreapta-jos', 'dreapta-sus', 'stânga-sus', 'centrul foii']);
  // Din desen: punctul din mijlocul foii.
  await page.locator('[data-camp="origine"]').focus();
  await page.locator('[data-colt="centru"]').click();
  await expect(origine).toHaveValue('centru');
  await expect(page.locator('[data-colt-ales="centru"]')).toBeVisible();
  await expect(page.locator('[data-colt-ales="centru"]')).toHaveAttribute('aria-label', 'Foaia văzută oblic, cu XY0 în centrul ei');
  await expect(page.locator('[data-colt-ales="centru"]')).toContainText('XY0 în centrul foii');
  await expect(page.locator('[data-colt="centru"]')).toHaveAttribute('data-ales', '');
  await expect(page.locator('[data-nav="foaia"]')).toContainText('centrul foii');
  await expect(page.locator('[data-camp="nume-fisier"]')).toHaveValue('cncvs2-centru');
  // Din listă: înapoi într-un colț, apoi iar în centru.
  await origine.selectOption('dreapta-sus');
  await expect(page.locator('[data-colt="centru"]')).not.toHaveAttribute('data-ales', '');
  await origine.selectOption('centru');
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const descarcat = await d;
  expect(descarcat.suggestedFilename()).toBe('cncvs2-centru.nc');
  const text = (await import('node:fs')).readFileSync((await descarcat.path())!, 'utf8');
  expect(text).toMatch(/^\(origine centru, Z0 sus, foaia /m);
  // Programul dus în Mașina, cu mașina simulată legată: lângă zero, unde e XY0.
  await page.locator('[data-buton="in-masina"]').click();
  await page.locator('[data-masina="viteza"]').selectOption('100');
  await page.locator('[data-masina="simulata"]').click();
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
  await expect(page.getByTestId('masina-z0')).toContainText('Originea XY a programului: centrul foii.');
  expect(erori).toEqual([]);
});

test('raportul foilor, deschis din export cu centrul, spune că originea e în centrul foii', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('[data-camp="origine"]').selectOption('centru');
  await page.locator('[data-buton="raport"]').click();
  const raport = page.getByTestId('dialog-raport');
  await expect(raport.locator('.nota').first()).toHaveText('Z0: fața de sus a materialului; originea în centrul foii (ale exportului).');
});
