import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Toleranța unei cote (ADR 0330, felia 10.4↑e-1), în browser: din panoul cotei alese, „Simetrică (±)” scrie „100 ±0,1” lângă
 * cifră (pe pânză și în panou); „Cu abateri” scrie abaterea de sus și pe cea de jos; o abatere de sus sub cea de jos se
 * refuză, cu motivul; „Fără” o scoate; fiecare schimbare e un pas de anulare. Cota de probă: orizontala de 100 mm pe vârfurile
 * de sus ale dreptunghiului „Adaugă dreptunghi” (100 × 60 din (20, 20)), cu linia la y = 100.
 */
test.use({ locale: 'ro-RO' });

type P = { readonly x: number; readonly y: number };
const panou = (page: Page) => page.getByTestId('panou-cota');
const cifra = (page: Page) => panou(page).getByTestId('cota-cifra');
const textPanza = (page: Page) => page.locator('[data-testid="strat-cote"] > svg > g[data-cota]:not(.cota-noua) text');

async function clic(page: Page, p: P): Promise<void> {
  const s = (await ecran(page, await vedere(page)))(p.x, p.y);
  await page.mouse.move(s.x, s.y, { steps: 2 });
  await page.mouse.click(s.x, s.y);
}

async function cuCotaAleasa(page: Page): Promise<void> {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-unealta="cote"]').click();
  await expect(page.getByTestId('strat-cote')).toHaveAttribute('data-fel', /.+/);
  await clic(page, { x: 20, y: 80 });
  await clic(page, { x: 120, y: 80 });
  await clic(page, { x: 70, y: 100 });
  await clic(page, { x: 50, y: 100 });
  await expect(panou(page)).toBeVisible();
  await expect(cifra(page)).toHaveText('100');
}

async function scrie(page: Page, camp: string, valoare: string): Promise<void> {
  const c = panou(page).locator(`[data-camp="${camp}"]`);
  await c.fill(valoare);
  await c.press('Enter');
}

test('simetrică, apoi cu abateri, apoi fără; pe pânză și în panou; fiecare, un pas de anulare', async ({ page }) => {
  await cuCotaAleasa(page);
  const fel = panou(page).locator('[data-camp="cota-toleranta-fel"]');
  await expect(fel).toHaveValue('fara');
  await fel.selectOption('simetrica');
  await expect(cifra(page)).toHaveText('100 ±0,1');
  await expect(textPanza(page)).toHaveText('100 ±0,1');
  await scrie(page, 'cota-toleranta', '0,05');
  await expect(cifra(page)).toHaveText('100 ±0,05');

  await fel.selectOption('abateri');
  await expect(fel).toHaveValue('abateri');
  await scrie(page, 'cota-toleranta-sus', '0,2');
  await expect(cifra(page)).toHaveText('100 +0,2 -0,05');
  // Abaterea de sus sub cea de jos: refuzată, cu motivul; cota rămâne cum era.
  await scrie(page, 'cota-toleranta-sus', '-0,3');
  await expect(panou(page).getByTestId('cota-mesaj')).toHaveText('Abaterea de sus nu poate fi sub cea de jos.');
  await expect(cifra(page)).toHaveText('100 +0,2 -0,05');

  await fel.selectOption('fara');
  await expect(cifra(page)).toHaveText('100');
  await expect(textPanza(page)).toHaveText('100');
  // Anularea întoarce, pas cu pas: abaterile, apoi ±0,05, apoi ±0,1, apoi fără.
  for (const asteptat of ['100 +0,2 -0,05', '100 ±0,05', '100 ±0,1', '100']) {
    await page.keyboard.press('Control+z');
    await expect(textPanza(page)).toHaveText(asteptat);
  }
});

test('după o anulare, felul din panou urmează toleranța cotei, nu alegerea de dinainte', async ({ page }) => {
  await cuCotaAleasa(page);
  const fel = panou(page).locator('[data-camp="cota-toleranta-fel"]');
  // Din fără, „Cu abateri” pune ±0,1 și rămâne „cu abateri” (abaterile egale se scriu apoi una câte una).
  await fel.selectOption('abateri');
  await expect(cifra(page)).toHaveText('100 ±0,1');
  await expect(fel).toHaveValue('abateri');
  await scrie(page, 'cota-toleranta-sus', '0,2');
  await expect(cifra(page)).toHaveText('100 +0,2 -0,1');
  // Spre simetrică: ± cea mai mare abatere.
  await fel.selectOption('simetrica');
  await expect(cifra(page)).toHaveText('100 ±0,2');
  // Anularea întoarce abaterile, iar panoul le arată ca abateri, cu ambele câmpuri.
  await page.keyboard.press('Control+z');
  await expect(cifra(page)).toHaveText('100 +0,2 -0,1');
  await expect(fel).toHaveValue('abateri');
  await expect(panou(page).locator('[data-camp="cota-toleranta-jos"]')).toBeVisible();
});
