import { test, expect } from '@playwright/test';

test('build-ul din dist/ pornește în Edge, fără erori în consolă', async ({ page }) => {
  const erori: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') erori.push(m.text()); });
  page.on('pageerror', (e) => erori.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('CNC Vector Studio');
  expect(erori).toEqual([]);
});
