import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Orice nod își schimbă tipul (felia 6.N↑, ADR 0068), în Edge: pe cerc, nodul e curbă pe ambele părți, cu cele două mânere
 * (tangentele); tras, mânerul face din cerc o cale cu curbe (un pas de anulare); „Colț” merge și pe cerc. Într-o piesă cu o
 * gaură (un boolean), unealta Noduri arată ambele contururi, iar un nod al găurii se mută fără să atingă conturul exterior.
 */
test.use({ locale: 'ro-RO' });

const noduri = (page: Page) => page.getByTestId('noduri');
const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');

async function clic(page: Page, x: number, y: number): Promise<void> {
  const s = (await ecran(page, await vedere(page)))(x, y);
  await page.mouse.click(s.x, s.y);
}

test('cercul: nodul e curbă pe ambele părți, cu mânere; mânerul tras face o cale cu curbe; „Colț” merge și aici', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-editare="lipire"]').click();
  await adauga(page, 'cerc');
  await page.locator('[data-unealta="noduri"]').click();
  await clic(page, 85, 50);
  await expect(noduri(page)).toHaveAttribute('data-tip', 'ambele');
  await expect(noduri(page).locator('circle[data-maner]')).toHaveCount(2);
  await expect(page.locator('[data-editare="nod-ambele"]')).toHaveAttribute('aria-pressed', 'true');
  // Mânerul de înainte (în sus, tangenta cercului în (85, 50)), tras spre dreapta-sus.
  const maner = await noduri(page).locator('circle[data-maner="inainte"]').boundingBox();
  if (!maner) throw new Error('mânerul n-are cutie');
  const spre = (await ecran(page, await vedere(page)))(95, 65);
  await page.mouse.move(maner.x + maner.width / 2, maner.y + maner.height / 2);
  await page.mouse.down();
  await page.mouse.move(spre.x, spre.y, { steps: 6 });
  await page.mouse.up();
  // Cele două semicercuri au devenit câte 3 curbe (6 noduri), iar curba trasă a ieșit din cercul de 30 × 30.
  await expect(noduri(page)).toHaveAttribute('data-noduri', '6');
  await expect(randuri(page).first()).toContainText('cale');
  await expect(randuri(page).first()).not.toContainText('30.00 × 30.00');
  await expect(noduri(page)).toHaveAttribute('data-tip', 'ambele');
  await expect(page.getByTestId('noduri-sfat')).not.toHaveClass(/cip-atentie/);
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page).first()).toContainText('cerc R15.00');
  // „Colț” pe un nod de cerc: fără refuz, nodul devine colț.
  await clic(page, 85, 50);
  await page.locator('[data-editare="nod-colt"]').click();
  await expect(noduri(page)).toHaveAttribute('data-tip', 'colt');
  await expect(randuri(page).first()).toContainText('cale');
});

test('o piesă cu gaură (Scade): ambele contururi au noduri; un nod al găurii se mută, conturul exterior rămâne', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-editare="lipire"]').click();
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await randuri(page).first().click();
  const pe = (await ecran(page, await vedere(page)))(85, 50);
  await page.keyboard.down('Shift');
  await page.mouse.click(pe.x, pe.y);
  await page.keyboard.up('Shift');
  await page.locator('[data-editare="boolean-scade"]').click();
  await expect(randuri(page)).toHaveCount(1);
  await page.locator('[data-unealta="noduri"]').click();
  await expect(noduri(page)).toHaveAttribute('data-contururi', '2');
  // Un nod al găurii (cercul R15 din (70, 50)): cel din dreapta, (85, 50), dus în (90, 50).
  const nod = noduri(page).locator('[data-contur="1"][data-nod]').first();
  await expect(nod).toBeVisible();
  const cutie = await nod.boundingBox();
  if (!cutie) throw new Error('nodul n-are cutie');
  const dest = (await ecran(page, await vedere(page)))(70 + 20, 50);
  await page.mouse.move(cutie.x + cutie.width / 2, cutie.y + cutie.height / 2);
  await page.mouse.down();
  await page.mouse.move(dest.x, dest.y, { steps: 6 });
  await page.mouse.up();
  await expect(noduri(page)).toHaveAttribute('data-contur', '1');
  await expect(randuri(page)).toHaveCount(1);
  await expect(randuri(page).first()).toContainText('cale 100.00 × 60.00');
  await expect(randuri(page).first()).toContainText('(+1)');
});
