import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Selecția cu dreptunghi (felia 3.G, ADR 0059), în Edge, ca în CAD: trasă spre dreapta (fereastra), doar formele cuprinse
 * în întregime; spre stânga (intersecția), tot ce atinge conturul. Shift + clic adaugă sau scoate o formă, Shift + cadru
 * adaugă; un clic pe gol golește; un clic pe o formă dintr-o selecție multiplă o păstrează, iar tragerea le mută pe toate.
 * Pe foaie: A (100 × 60 din 20, 20), B (150–190 × 20–50) și C (230–270 × 20–50).
 */
test.use({ locale: 'ro-RO' });

type P = { readonly x: number; readonly y: number };

const alese = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]');

/** Trage cu mausul între două puncte ale foii (mm), în pași; cu `shift`, ținut apăsat. */
async function trage(page: Page, a: P, b: P, shift = false, inainteDeCapat?: () => Promise<void>): Promise<void> {
  const la = await ecran(page, await vedere(page));
  const [sa, sb] = [la(a.x, a.y), la(b.x, b.y)];
  await page.mouse.move(sa.x, sa.y);
  if (shift) await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move((sa.x + sb.x) / 2, (sa.y + sb.y) / 2, { steps: 4 });
  await page.mouse.move(sb.x, sb.y, { steps: 4 });
  if (inainteDeCapat) await inainteDeCapat();
  await page.mouse.up();
  if (shift) await page.keyboard.up('Shift');
}

async function clic(page: Page, p: P, shift = false): Promise<void> {
  const la = await ecran(page, await vedere(page));
  const s = la(p.x, p.y);
  if (shift) await page.keyboard.down('Shift');
  await page.mouse.click(s.x, s.y);
  if (shift) await page.keyboard.up('Shift');
}

async function foaie(page: Page): Promise<void> {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  // Fără lipire: capetele formelor desenate cad exact unde le tragem.
  await page.locator('[data-editare="lipire"]').click();
  await expect(page.locator('[data-editare="lipire"]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-unealta="dreptunghi"]').click();
  await trage(page, { x: 150, y: 20 }, { x: 190, y: 50 });
  await trage(page, { x: 230, y: 20 }, { x: 270, y: 50 });
  await page.locator('[data-unealta="selectie"]').click();
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta]')).toHaveCount(3);
}

/** Câmpul X al formei alese singure, după un clic pe ea (golind întâi selecția), ca număr. */
async function xDupaClic(page: Page, p: P): Promise<number> {
  await clic(page, { x: 290, y: 190 });
  await clic(page, p);
  return Number((await page.locator('[data-camp="pozitie-x"]').inputValue()).replace(',', '.'));
}

test('spre dreapta (fereastra): doar formele cuprinse în întregime; cadrul are linie plină cât se trage', async ({ page }) => {
  await foaie(page);
  await trage(page, { x: 10, y: 10 }, { x: 200, y: 90 }, false, async () => {
    await expect(page.getByTestId('cadru-selectie')).toHaveAttribute('data-fel', 'fereastra');
    await expect(page.getByTestId('cadru-selectie').locator('rect.cadru-fereastra')).toHaveCount(1);
  });
  await expect(page.getByTestId('cadru-selectie')).toHaveCount(0);
  await expect(alese(page)).toHaveCount(2);
  await expect(page.locator('.prop-multi')).toHaveText('2 piese selectate');
  // C (230–270) doar pe jumătate în cadru: nu intră.
  await trage(page, { x: 10, y: 10 }, { x: 250, y: 90 });
  await expect(alese(page)).toHaveCount(2);
});

test('spre stânga (intersecția): tot ce atinge conturul, cu linie punctată; un cadru în interiorul unei forme, fără margine, nimic', async ({ page }) => {
  await foaie(page);
  await trage(page, { x: 235, y: 90 }, { x: 100, y: 40 }, false, async () => {
    await expect(page.getByTestId('cadru-selectie')).toHaveAttribute('data-fel', 'intersectie');
  });
  await expect(alese(page)).toHaveCount(3);
  // Doar în golul dintre B și C (195–225): nimic, iar selecția veche se golește.
  await trage(page, { x: 225, y: 45 }, { x: 195, y: 25 });
  await expect(alese(page)).toHaveCount(0);
  // În interiorul lui A (20–120 × 20–80), fără să-i atingă marginea: contează conturul, nu aria. Apăsarea pe A e a pânzei
  // (alegerea, mutarea), deci cadrul pornește de pe A doar cu Shift (care adaugă): nu adaugă nimic.
  await trage(page, { x: 100, y: 70 }, { x: 40, y: 30 }, true);
  await expect(alese(page)).toHaveCount(0);
});

test('Shift + clic adaugă și scoate o formă; un clic pe gol golește; Shift + cadru adaugă', async ({ page }) => {
  await foaie(page);
  await clic(page, { x: 170, y: 35 });
  await expect(alese(page)).toHaveCount(1);
  await clic(page, { x: 250, y: 35 }, true);
  await expect(alese(page)).toHaveCount(2);
  await clic(page, { x: 250, y: 35 }, true);
  await expect(alese(page)).toHaveCount(1);
  await clic(page, { x: 210, y: 150 });
  await expect(alese(page)).toHaveCount(0);
  await clic(page, { x: 70, y: 50 });
  await trage(page, { x: 140, y: 10 }, { x: 280, y: 60 }, true);
  await expect(alese(page)).toHaveCount(3);
});

test('selecția multiplă se mută trăgând de una dintre forme; alinierea și distribuirea lucrează pe toate', async ({ page }) => {
  await foaie(page);
  await trage(page, { x: 10, y: 10 }, { x: 200, y: 90 });
  await expect(alese(page)).toHaveCount(2);
  // Tragerea de B mută și A: 10 mm spre dreapta (din pixelii mausului, deci nu exact 10).
  await trage(page, { x: 170, y: 35 }, { x: 180, y: 35 });
  await expect(alese(page)).toHaveCount(2);
  expect(await xDupaClic(page, { x: 75, y: 50 })).toBeCloseTo(30, 2);
  expect(await xDupaClic(page, { x: 175, y: 35 })).toBeCloseTo(160, 2);
  // Toate trei, prin intersecție, apoi „Aliniază sus”: B și C urcă la marginea de sus a lui A (80).
  await clic(page, { x: 290, y: 190 });
  await trage(page, { x: 280, y: 60 }, { x: 100, y: 30 });
  await expect(alese(page)).toHaveCount(3);
  await page.locator('[data-aliniaza="sus"]').click();
  expect(await xDupaClic(page, { x: 250, y: 65 })).toBe(230);
  await expect(page.locator('[data-camp="pozitie-y"]')).toHaveValue('50');
  // Distribuirea cere trei: A 30–130, B 160–200, C 230–270: golurile egale, (270 − 30 − 180) / 2 = 30 → B la 160 (deja).
  await clic(page, { x: 290, y: 190 });
  await trage(page, { x: 280, y: 90 }, { x: 100, y: 70 });
  await expect(alese(page)).toHaveCount(3);
  await expect(page.locator('[data-aliniaza="distribuie-x"]')).toBeEnabled();
});
