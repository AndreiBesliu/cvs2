import { expect, test } from '@playwright/test';

/**
 * Pagina `/admin` (ADR 0040) fără configurația Firebase (config.json-ul local): spune că nu e configurată, nu deschide
 * proiectul și nu încalcă CSP-ul. Calea cu cont, rol și file e probată pe emulatoare (`test/e2e-emulator/`).
 */
test('/admin fără configurația Firebase spune asta, fără erori în consolă', async ({ page }) => {
  const erori: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') erori.push(m.text()); });
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/admin');
  await expect(page.locator('[data-admin="neconfigurat"]')).toBeVisible();
  await expect(page.locator('.aplicatie')).toHaveCount(0);
  expect(erori).toEqual([]);
});

test('/admin nu ia blocarea proiectului: aplicația deschisă după el e scriitorul', async ({ page, context }) => {
  await page.goto('/admin');
  await expect(page.locator('[data-admin="neconfigurat"]')).toBeVisible();
  // Dacă adminul ar fi deschis proiectul, fila aplicației ar fi a doua, deci doar ar citi: butoanele ar fi oprite.
  const aplicatia = await context.newPage();
  await aplicatia.goto('/');
  await expect(aplicatia.locator('[data-actiune="document.adauga-dreptunghi"]')).toBeEnabled();
});

test('martorul: a doua filă a aplicației doar citește, deci butonul e oprit (proba de mai sus vede diferența)', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('[data-actiune="document.adauga-dreptunghi"]')).toBeEnabled();
  const a2 = await context.newPage();
  await a2.goto('/');
  await expect(a2.locator('[data-actiune="document.adauga-dreptunghi"]')).toBeDisabled();
});
