import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Lanțul, linia de bază și „Cotează selecția” (ADR 0330 §4, felia 10.4↑d-1), în browser. Dreptunghiul de probă: „Adaugă
 * dreptunghi” (100 × 60 din (20, 20)), deci vârfurile de sus (20, 80) și (120, 80), cu mijlocul laturii de sus în (70, 80).
 */
test.use({ locale: 'ro-RO' });

type P = { readonly x: number; readonly y: number };
const strat = (page: Page) => page.getByTestId('strat-cote');
// Cotele puse; cota următoare a seriei, desenată sub maus, nu e una dintre ele.
const cote = (page: Page) => page.locator('[data-testid="strat-cote"] g[data-cota]:not(.cota-noua)');

async function clic(page: Page, p: P): Promise<void> {
  const s = (await ecran(page, await vedere(page)))(p.x, p.y);
  await page.mouse.move(s.x, s.y, { steps: 2 });
  await page.mouse.click(s.x, s.y);
}

async function cuDreptunghi(page: Page): Promise<void> {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
}

async function alegeCote(page: Page): Promise<void> {
  await page.locator('[data-unealta="cote"]').click();
  await expect(strat(page)).toHaveAttribute('data-fel', /.+/);
}

/** Y-ul liniei de cotă a cotei `k` (mm pe foaie), citit din desenul ei pe ecran. */
async function yLinie(page: Page, k: number): Promise<number> {
  const v = await vedere(page);
  const y1 = Number(await cote(page).nth(k).locator('line.cota-linie').first().getAttribute('y1'));
  return (v.ty - y1) / v.scara;
}

test('Lanț: prima cotă din două puncte, apoi fiecare clic pune una din capătul celei dinainte, cu linia pe aceeași dreaptă; Esc încheie, fiecare cotă e un pas', async ({ page }) => {
  await cuDreptunghi(page);
  await alegeCote(page);
  await page.getByTestId('cote-fel-lant').click();
  await expect(strat(page)).toHaveAttribute('data-fel', 'lant');
  await clic(page, { x: 20, y: 80 });
  await clic(page, { x: 70, y: 80 });
  await clic(page, { x: 70, y: 95 });
  await expect(cote(page)).toHaveCount(1);
  await expect(cote(page).first()).toHaveAttribute('data-fel', 'orizontala');
  await expect(cote(page).first()).toHaveAttribute('data-text', '50');
  await expect(strat(page)).toHaveAttribute('data-serie', 'lant');
  await expect(page.getByTestId('cote-sfat')).toContainText('capătul celei dinainte');
  // Al doilea punct al lanțului: vârful din dreapta-sus.
  await clic(page, { x: 120, y: 80 });
  await expect(cote(page)).toHaveCount(2);
  await expect(cote(page).nth(1)).toHaveAttribute('data-fel', 'orizontala');
  await expect(cote(page).nth(1)).toHaveAttribute('data-text', '50');
  await expect(cote(page).nth(1)).toHaveAttribute('data-stare', 'legata');
  expect(Math.abs((await yLinie(page, 1)) - (await yLinie(page, 0)))).toBeLessThan(0.01);
  // Un punct cu același X ca ultimul capăt ar măsura zero: refuzat, cu motivul.
  await clic(page, { x: 120, y: 20 });
  await expect(cote(page)).toHaveCount(2);
  await expect(page.getByTestId('cote-sfat')).toContainText('zero');
  // Al treilea: mijlocul laturii de jos, înapoi pe X, din capătul (120, 80) al celei de-a doua: 50.
  await clic(page, { x: 70, y: 20 });
  await expect(cote(page)).toHaveCount(3);
  await expect(cote(page).nth(2)).toHaveAttribute('data-text', '50');
  await page.keyboard.press('Escape');
  await expect(strat(page)).not.toHaveAttribute('data-serie', /.+/);
  await expect(page.locator('[data-unealta="cote"]')).toHaveAttribute('aria-pressed', 'true');
  // Fiecare cotă a lanțului e un pas de anulare.
  await page.keyboard.press('Control+z');
  await expect(cote(page)).toHaveCount(2);
});

test('Linie de bază: toate din primul punct, linia a doua cu 7 mm mai departe (două înălțimi de cifră de 3,5 mm)', async ({ page }) => {
  await cuDreptunghi(page);
  await alegeCote(page);
  await page.getByTestId('cote-fel-baza').click();
  await clic(page, { x: 20, y: 80 });
  await clic(page, { x: 70, y: 80 });
  await clic(page, { x: 70, y: 95 });
  await expect(strat(page)).toHaveAttribute('data-serie', 'baza');
  await clic(page, { x: 120, y: 80 });
  await expect(cote(page)).toHaveCount(2);
  await expect(cote(page).nth(1)).toHaveAttribute('data-text', '100');
  expect(Math.abs((await yLinie(page, 1)) - (await yLinie(page, 0)) - 7)).toBeLessThan(0.01);
});

test('lanțul pornește și dintr-o cotă aleasă: o orizontală pusă cu Automată, aleasă, apoi Lanț', async ({ page }) => {
  await cuDreptunghi(page);
  await alegeCote(page);
  await clic(page, { x: 20, y: 80 });
  await clic(page, { x: 70, y: 80 });
  await clic(page, { x: 70, y: 95 });
  await expect(cote(page)).toHaveCount(1);
  // Un clic pe linia cotei o alege; apoi felul Lanț pornește seria din al doilea ei capăt.
  const y = await yLinie(page, 0);
  await clic(page, { x: 45, y });
  await expect(strat(page)).toHaveAttribute('data-aleasa', /.+/);
  await page.getByTestId('cote-fel-lant').click();
  await expect(strat(page)).toHaveAttribute('data-serie', 'lant');
  await clic(page, { x: 120, y: 80 });
  await expect(cote(page)).toHaveCount(2);
  await expect(cote(page).nth(1)).toHaveAttribute('data-text', '50');
});

test('Cotează selecția (clic dreapta): lățimea 100 și înălțimea 60 ale dreptunghiului ales, legate, într-un singur pas; fără selecție, rândul e oprit', async ({ page }) => {
  await cuDreptunghi(page);
  const meniu = page.getByTestId('meniu-context');
  const rand = meniu.locator('[data-meniu="coteaza-selectia"]');
  const clicDreapta = async (p: P): Promise<void> => {
    const s2 = (await ecran(page, await vedere(page)))(p.x, p.y);
    await page.mouse.click(s2.x, s2.y, { button: 'right' });
  };
  // Fără nimic ales (un clic pe foaie, departe de dreptunghi), rândul e oprit.
  await page.locator('[data-unealta="selectie"]').click();
  await clic(page, { x: 200, y: 150 });
  await clicDreapta({ x: 200, y: 150 });
  await expect(rand).toHaveText('Cotează selecția');
  await expect(rand).toBeDisabled();
  await page.keyboard.press('Escape');
  await clic(page, { x: 70, y: 20 });
  await clicDreapta({ x: 70, y: 20 });
  await expect(rand).toBeEnabled();
  await rand.click();
  await expect(meniu).toHaveCount(0);
  // Unealta Cote pornește (bucata ei vine la cerere), cu cele două cote noi.
  await expect(page.locator('[data-unealta="cote"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(cote(page)).toHaveCount(2);
  await expect(cote(page).nth(0)).toHaveAttribute('data-fel', 'orizontala');
  await expect(cote(page).nth(0)).toHaveAttribute('data-text', '100');
  await expect(cote(page).nth(1)).toHaveAttribute('data-fel', 'verticala');
  await expect(cote(page).nth(1)).toHaveAttribute('data-text', '60');
  await expect(cote(page).nth(0)).toHaveAttribute('data-stare', 'legata');
  // Lățimea stă sub dreptunghi, la distanța liniei de cotă din Setări (10 mm): y = 20 − 10.
  expect(Math.abs((await yLinie(page, 0)) - 10)).toBeLessThan(0.01);
  await page.keyboard.press('Control+z');
  await expect(cote(page)).toHaveCount(0);
});
