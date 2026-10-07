import { test, expect } from '@playwright/test';

test('build-ul din dist/ pornește în Edge, fără erori în consolă, cu instanța citită de la gazdă', async ({ page }) => {
  const erori: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') erori.push(m.text()); });
  page.on('pageerror', (e) => erori.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('CNC Vector Studio');
  await expect(page.getByTestId('instanta')).toContainText('local');
  expect(erori).toEqual([]);
});

test.describe('limba', () => {
  test.use({ locale: 'ro-RO' });

  test('pornește după browser, se schimbă din butoane și rămâne după reîncărcare', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
    await page.getByRole('button', { name: 'EN' }).click();
    await expect(page.getByTestId('jurnal')).toHaveText('0 errors in the local log');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.reload();
    await expect(page.getByTestId('jurnal')).toHaveText('0 errors in the local log');
  });
});
