import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Unealta Cote (ADR 0330 §5, felia 10.4↑a-2), în browser: D, felurile din bară, pusul în trei clicuri lipit de vârfuri, cota
 * legată care urmează forma, dezlegarea la ștergerea formei și anularea într-un singur pas, Automată pe o latură, Măsoară (M)
 * cu Enter, alegerea și Delete, reîncărcarea, Selecția care trece prin cote. Dreptunghiul de probă: „Adaugă dreptunghi”
 * (100 × 60 din (20, 20)), deci vârfurile (20, 20), (120, 20), (120, 80), (20, 80).
 */
test.use({ locale: 'ro-RO' });

type P = { readonly x: number; readonly y: number };
const strat = (page: Page) => page.getByTestId('strat-cote');
const cote = (page: Page) => page.locator('[data-testid="strat-cote"] g[data-cota]');

async function peEcran(page: Page, p: P): Promise<P> {
  return (await ecran(page, await vedere(page)))(p.x, p.y);
}
async function clic(page: Page, p: P): Promise<void> {
  const s = await peEcran(page, p);
  await page.mouse.move(s.x, s.y, { steps: 2 });
  await page.mouse.click(s.x, s.y);
}

async function cuDreptunghi(page: Page): Promise<void> {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
}

/** Unealta Cote din bară; așteaptă bucata ei (vine la cerere) înaintea primului clic pe pânză. */
async function alegeCote(page: Page): Promise<void> {
  await page.locator('[data-unealta="cote"]').click();
  await expect(strat(page)).toHaveAttribute('data-fel', /.+/);
}

/** O tastă a editorului, cu focusul în bara uneltelor (ca după un clic pe ea). */
async function tasta(page: Page, k: string): Promise<void> {
  await page.locator('[data-unealta="selectie"]').focus();
  await page.keyboard.press(k);
}

// Punctele de probă stau sus pe foaie: jos, la 1280 × 720, bara de jos acoperă marginea foii.
test('D: o cotă orizontală pe două vârfuri, lipită și legată; scalată forma, cota o urmează; ștearsă, cota se dezleagă, iar anularea le întoarce pe amândouă', async ({ page }) => {
  await cuDreptunghi(page);
  await tasta(page, 'd');
  await expect(page.locator('[data-unealta="cote"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(strat(page)).toHaveAttribute('data-fel', 'automata');
  await expect(page.getByTestId('cote-fel-automata')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('cote-sfat')).toContainText('Alege primul punct');
  // Lângă vârfurile de sus (nu pe ele): lipirea le prinde.
  await clic(page, { x: 21, y: 79 });
  await expect(page.getByTestId('cote-lipire')).toHaveAttribute('data-fel', 'varf');
  await expect(strat(page)).toHaveAttribute('data-puse', '1');
  await clic(page, { x: 119, y: 80.5 });
  await expect(strat(page)).toHaveAttribute('data-puse', '2');
  await expect(page.getByTestId('cote-sfat')).toContainText('Du linia de cotă');
  // Deasupra dreptunghiului: Automată dă orizontala.
  await clic(page, { x: 70, y: 95 });
  await expect(cote(page)).toHaveCount(1);
  const c = cote(page).first();
  await expect(c).toHaveAttribute('data-fel', 'orizontala');
  await expect(c).toHaveAttribute('data-text', '100');
  await expect(c).toHaveAttribute('data-stare', 'legata');

  // Lățimea 150, din panou: cota legată arată 150.
  await page.locator('[data-unealta="selectie"]').click();
  await clic(page, { x: 70, y: 80 });
  const latime = page.locator('[data-camp="forma-latime"]');
  await latime.fill('150');
  await latime.press('Enter');
  await expect(c).toHaveAttribute('data-text', '150');

  // Ștearsă forma: cota rămâne, dezlegată, în ultimul loc văzut; o singură anulare le întoarce pe amândouă.
  await clic(page, { x: 70, y: 80 });
  await page.keyboard.press('Delete');
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta]')).toHaveCount(0);
  await expect(c).toHaveAttribute('data-stare', 'dezlegata');
  await expect(c).toHaveAttribute('data-text', '150');
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta]')).toHaveCount(1);
  await expect(c).toHaveAttribute('data-stare', 'legata');
});

test('Automată pe o latură: un clic pe latura stângă îi ia lungimea (60), ca cotă aliniată legată', async ({ page }) => {
  await cuDreptunghi(page);
  await alegeCote(page);
  await clic(page, { x: 20, y: 35 });
  await expect(strat(page)).toHaveAttribute('data-puse', '2');
  await clic(page, { x: 5, y: 40 });
  const c = cote(page).first();
  await expect(c).toHaveAttribute('data-fel', 'aliniata');
  await expect(c).toHaveAttribute('data-text', '60');
  await expect(c).toHaveAttribute('data-stare', 'legata');
});

test('Orizontală, Verticală, Aliniată din bară; un vârf de pe linia de extensie a altei cote începe o cotă nouă; Esc renunță', async ({ page }) => {
  await cuDreptunghi(page);
  await alegeCote(page);
  await page.getByTestId('cote-fel-verticala').click();
  await expect(strat(page)).toHaveAttribute('data-fel', 'verticala');
  await clic(page, { x: 20, y: 20 });
  await clic(page, { x: 120, y: 80 });
  await clic(page, { x: 140, y: 50 });
  await expect(cote(page).first()).toHaveAttribute('data-text', '60');
  await page.getByTestId('cote-fel-aliniata').click();
  // (95, 20) e pe linia de extensie a cotei verticale, departe de orice punct: extensia nu alege cota, clicul pune un punct.
  await clic(page, { x: 95, y: 20 });
  await expect(strat(page)).toHaveAttribute('data-puse', '1');
  await expect(strat(page)).not.toHaveAttribute('data-aleasa', /.+/);
  await page.keyboard.press('Escape');
  // (20, 20) e pe linia de extensie a cotei verticale: vârful bate cota.
  await clic(page, { x: 20, y: 20 });
  await expect(strat(page)).toHaveAttribute('data-puse', '1');
  await clic(page, { x: 120, y: 80 });
  await clic(page, { x: 60, y: 70 });
  await expect(cote(page).nth(1)).toHaveAttribute('data-text', '116,62');
  // O orizontală între vârfurile de jos, cu linia de cotă chiar pe latura de sus (y = 80): un clic pe vârful (20, 80), care
  // stă pe linia ei, începe o cotă nouă (vârful bate cota).
  await page.getByTestId('cote-fel-orizontala').click();
  await clic(page, { x: 20, y: 20 });
  await clic(page, { x: 120, y: 20 });
  await clic(page, { x: 70, y: 80 });
  await expect(cote(page)).toHaveCount(3);
  await clic(page, { x: 20, y: 80 });
  await expect(strat(page)).toHaveAttribute('data-puse', '1');
  await expect(strat(page)).not.toHaveAttribute('data-aleasa', /.+/);
  await page.keyboard.press('Escape');
  await expect(strat(page)).toHaveAttribute('data-puse', '0');
  await expect(page.locator('[data-unealta="cote"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(cote(page)).toHaveCount(3);
});

test('M: măsoară fără urmă (lângă cursor și în bara de jos); Enter o păstrează ca cotă aliniată', async ({ page }) => {
  await cuDreptunghi(page);
  await tasta(page, 'm');
  await expect(strat(page)).toHaveAttribute('data-fel', 'masoara');
  await clic(page, { x: 20, y: 20 });
  await clic(page, { x: 120, y: 80 });
  await expect(page.getByTestId('masura')).toContainText('116,619 mm');
  await expect(page.getByTestId('masura')).toContainText('Δx 100');
  await expect(page.getByTestId('masura')).toContainText('30,96°');
  await expect(page.getByTestId('masura-jos')).toContainText('116,619 mm');
  await expect(cote(page)).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(cote(page)).toHaveCount(1);
  await expect(cote(page).first()).toHaveAttribute('data-fel', 'aliniata');
  await expect(page.getByTestId('masura')).toHaveCount(0);
});

test('alegerea cu unealta Cote, săgețile, Delete, anularea; reîncărcarea păstrează cotele; Selecția trece prin ele; dublu clic', async ({ page }) => {
  await cuDreptunghi(page);
  await alegeCote(page);
  await clic(page, { x: 20, y: 80 });
  await clic(page, { x: 120, y: 80 });
  await clic(page, { x: 70, y: 100 });
  await expect(cote(page)).toHaveCount(1);
  // Clic pe linia de cotă (la y = 100): aleasă, cu mânerele ei.
  await clic(page, { x: 50, y: 100 });
  await expect(strat(page)).toHaveAttribute('data-aleasa', /c\d+/);
  await expect(page.locator('[data-testid="strat-cote"] circle[data-maner]')).toHaveCount(2);
  // Săgeata sus mută linia cu 1 mm.
  const linie = cote(page).first().locator('line').nth(2);
  const inainte = Number(await linie.getAttribute('y1'));
  await page.keyboard.press('ArrowUp');
  await expect.poll(async () => Number(await linie.getAttribute('y1'))).toBeLessThan(inainte - 1);
  await page.keyboard.press('Delete');
  await expect(cote(page)).toHaveCount(0);
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta]')).toHaveCount(1);
  await page.keyboard.press('Control+z');
  await expect(cote(page)).toHaveCount(1);
  // Reîncărcată, foaia își arată cota (bucata cotelor vine singură).
  await page.waitForTimeout(800);
  await page.reload();
  await expect(cote(page)).toHaveCount(1);
  await expect(cote(page).first()).toHaveAttribute('data-text', '100');
  await expect(page.locator('[data-unealta="selectie"]')).toHaveAttribute('aria-pressed', 'true');
  // Cu Selecția, un clic pe linia cotei (unde nu e nicio formă) e ca unul pe gol: nici cota, nici altă alegere.
  const alese = page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]');
  await clic(page, { x: 250, y: 150 });
  await expect(alese).toHaveCount(0);
  await clic(page, { x: 50, y: 101 });
  await expect(alese).toHaveCount(0);
  await expect(strat(page)).not.toHaveAttribute('data-aleasa', /.+/);
  // Dublu clic pe cotă: unealta Cote, cu ea aleasă.
  const s = await peEcran(page, { x: 50, y: 101 });
  await page.mouse.dblclick(s.x, s.y);
  await expect(page.locator('[data-unealta="cote"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(strat(page)).toHaveAttribute('data-aleasa', /c\d+/);
  // Cu unealta Cote, un clic pe un vârf începe o cotă și nu alege forma (pânza nu primește clicul).
  await page.keyboard.press('Escape');
  await clic(page, { x: 20, y: 20 });
  await expect(strat(page)).toHaveAttribute('data-puse', '1');
  await expect(alese).toHaveCount(0);
});

/**
 * Bara de sus la 1280 px, cu fontul lat (Verdana aici, DejaVu Sans pe Linux, unde `system-ui` e lat), cu unealta Cote și
 * felurile ei în bară (ADR 0330 §5): rămâne întreagă în fereastră, în română și în engleză.
 */
async function baraIncape(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 760 });
  await cuDreptunghi(page);
  await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
  await alegeCote(page);
  await expect(page.getByTestId('cote-fel-masoara')).toBeVisible();
  const bara = await page.locator('.sus > .bara').boundingBox();
  if (!bara) throw new Error('bara n-are cutie');
  expect(bara.x).toBeGreaterThanOrEqual(0);
  expect(bara.x + bara.width).toBeLessThanOrEqual(1280);
}

test('bara de sus întreagă la 1280 px și cu un font lat, cu unealta Cote', async ({ page }) => {
  await baraIncape(page);
});

test.describe('în engleză', () => {
  test.use({ locale: 'en-US' });
  test('bara de sus întreagă la 1280 px și cu un font lat, cu unealta Cote (textele englezești)', async ({ page }) => {
    await baraIncape(page);
  });
});
