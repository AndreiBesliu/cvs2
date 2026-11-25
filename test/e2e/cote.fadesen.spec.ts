import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * „Fă desen din cotă” (ADR 0330 §8, felia 10.4↑d-2), în browser: din panoul cotei alese, desenul ei devine o piesă nouă, aleasă,
 * cu Selecția și secțiunea Tăierea în panou; cota rămâne, sau pleacă cu „Șterge cota”, în același pas de anulare. Cota de
 * probă: orizontala de 100 mm pe vârfurile de sus ale dreptunghiului „Adaugă dreptunghi” (100 × 60 din (20, 20)), cu linia la
 * y = 100.
 */
test.use({ locale: 'ro-RO' });

type P = { readonly x: number; readonly y: number };
const strat = (page: Page) => page.getByTestId('strat-cote');
const cote = (page: Page) => page.locator('[data-testid="strat-cote"] > svg > g[data-cota]:not(.cota-noua)');
const piese = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');

async function clic(page: Page, p: P): Promise<void> {
  const s = (await ecran(page, await vedere(page)))(p.x, p.y);
  await page.mouse.move(s.x, s.y, { steps: 2 });
  await page.mouse.click(s.x, s.y);
}

/** Dreptunghiul și cota lui de sus (linia la y = 100), aleasă, cu panoul ei. */
async function cuCotaAleasa(page: Page): Promise<void> {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-unealta="cote"]').click();
  await expect(strat(page)).toHaveAttribute('data-fel', /.+/);
  await clic(page, { x: 20, y: 80 });
  await clic(page, { x: 120, y: 80 });
  await clic(page, { x: 70, y: 100 });
  await expect(cote(page)).toHaveCount(1);
  await clic(page, { x: 50, y: 100 });
  await expect(page.getByTestId('panou-cota')).toBeVisible();
}

test('Fă desen din cotă: o piesă nouă, aleasă, cu Selecția și Tăierea în panou; cota rămâne; o anulare scoate desenul', async ({ page }) => {
  await cuCotaAleasa(page);
  await expect(piese(page)).toHaveCount(1);
  await page.locator('[data-buton="cota-desen"]').click();
  await expect(piese(page)).toHaveCount(2);
  await expect(page.locator('[data-unealta="selectie"]')).toHaveAttribute('aria-pressed', 'true');
  // Desenul e ales: panoul arată piesa, cu secțiunea Tăierea (de unde primește un rol).
  await expect(piese(page).nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('panou-cota')).toHaveCount(0);
  await expect(cote(page)).toHaveCount(1);
  await page.keyboard.press('Control+z');
  await expect(piese(page)).toHaveCount(1);
  await expect(cote(page)).toHaveCount(1);
});

test('cu „Șterge cota”: desenul vine, cota pleacă, în același pas; o anulare le întoarce pe amândouă', async ({ page }) => {
  await cuCotaAleasa(page);
  await page.locator('[data-camp="cota-desen-sterge"]').check();
  await page.locator('[data-buton="cota-desen"]').click();
  await expect(piese(page)).toHaveCount(2);
  await expect(cote(page)).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(piese(page)).toHaveCount(1);
  await expect(cote(page)).toHaveCount(1);
});
