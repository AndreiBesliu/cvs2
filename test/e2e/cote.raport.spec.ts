import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Cotele în raportul foilor (ADR 0330 §7, felia 10.4↑d-3), în browser: bifa „Cu cotele (N)” apare doar când o foaie a
 * raportului are cote, pornește după Setări › Cotele › Raportul foilor (oprită implicit) și pune cotele pe desenul foii, pe
 * stratul COTE, cu desenul pe tot rândul; oprită, desenul e exact cel de dinainte. Cota de probă: orizontala de 100 mm pe
 * vârfurile de sus ale dreptunghiului „Adaugă dreptunghi” (100 × 60 din (20, 20)), cu linia la y = 100.
 */
test.use({ locale: 'ro-RO' });

type P = { readonly x: number; readonly y: number };
const raport = (page: Page) => page.getByTestId('dialog-raport');
const bifa = (page: Page) => raport(page).locator('[data-raport="cote"]');
const foaie = (page: Page) => raport(page).locator('[data-raport-foaie]').first();
const cote = (page: Page) => page.locator('[data-testid="strat-cote"] > svg > g[data-cota]:not(.cota-noua)');
/** Stratul cotelor în SVG-ul desenului (codat în adresa imaginii). */
const STRAT = encodeURIComponent('<g id="COTE"');

async function clic(page: Page, p: P): Promise<void> {
  const s = (await ecran(page, await vedere(page)))(p.x, p.y);
  await page.mouse.move(s.x, s.y, { steps: 2 });
  await page.mouse.click(s.x, s.y);
}

async function deschideRaportul(page: Page): Promise<void> {
  await page.locator('[data-actiune="import.svg"]').focus();
  await page.keyboard.press('Control+k');
  await page.locator('[id="paleta-export.raport"]').click();
  await expect(raport(page)).toBeVisible();
}

async function cuCota(page: Page): Promise<void> {
  await page.locator('[data-unealta="cote"]').click();
  await expect(page.getByTestId('strat-cote')).toHaveAttribute('data-fel', /.+/);
  await clic(page, { x: 20, y: 80 });
  await clic(page, { x: 120, y: 80 });
  await clic(page, { x: 70, y: 100 });
  await expect(cote(page)).toHaveCount(1);
  await page.locator('[data-unealta="selectie"]').click();
}

test('bifa doar cu cote; pornită, desenul foii are stratul COTE, pe tot rândul; oprită, desenul de dinainte', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await deschideRaportul(page);
  await expect(bifa(page)).toHaveCount(0);
  const fara = await foaie(page).locator('img').getAttribute('src');
  await raport(page).locator('[data-raport="inchide"]').click();

  await cuCota(page);
  await deschideRaportul(page);
  await expect(bifa(page)).toBeVisible();
  await expect(raport(page).locator('label:has([data-raport="cote"])')).toHaveText('Cu cotele (1)');
  await expect(bifa(page)).not.toBeChecked();
  // Oprită: desenul de dinainte (cota nu-l atinge).
  await expect(foaie(page).locator('img')).toHaveAttribute('src', fara ?? '');
  await expect(foaie(page)).not.toHaveAttribute('data-cu-cote', /.*/);

  await bifa(page).check();
  await expect(foaie(page)).toHaveAttribute('data-cu-cote', '');
  const cu = await foaie(page).locator('img').getAttribute('src');
  expect(cu).toContain(STRAT);
  // Desenul pe tot rândul: mai lat decât coloana de 10rem de dinainte, cât secțiunea foii.
  const [img, sec] = await Promise.all([foaie(page).locator('img').boundingBox(), foaie(page).boundingBox()]);
  expect(img && sec && img.width > 300 && img.width > sec.width - 2).toBeTruthy();

  await bifa(page).uncheck();
  await expect(foaie(page).locator('img')).toHaveAttribute('src', fara ?? '');
  await expect(foaie(page)).not.toHaveAttribute('data-cu-cote', /.*/);
  // CSV-ul nu se schimbă: e lista de tăiere, fără desene.
  expect(erori).toEqual([]);
});

test('Setări › Cotele › Raportul foilor: bifa pornește pusă', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await cuCota(page);
  await page.keyboard.press('Control+,');
  const dialog = page.getByTestId('dialog-setari');
  await expect(dialog).toBeVisible();
  const grup = dialog.locator('[data-grup="raport"]');
  await expect(grup.locator('[data-setari-implicit="raport"]')).toBeDisabled();
  await grup.locator('[data-setare="raport.cuCote"]').check();
  await expect(grup.locator('[data-setari-implicit="raport"]')).toBeEnabled();
  await page.locator('[data-buton="setari-inchide"]').click();
  await expect(dialog).toHaveCount(0);

  await deschideRaportul(page);
  await expect(bifa(page)).toBeChecked();
  await expect(foaie(page)).toHaveAttribute('data-cu-cote', '');
  expect(await foaie(page).locator('img').getAttribute('src')).toContain(STRAT);
});
