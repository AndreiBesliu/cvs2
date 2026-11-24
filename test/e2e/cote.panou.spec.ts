import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Panoul cotei, lista, ochiul, „Arată cotele” și cotele foilor vecine (ADR 0330 §5, felia 10.4↑a-4), în browser. Cota de probă:
 * orizontala de 100 mm, pusă pe vârfurile de sus ale dreptunghiului „Adaugă dreptunghi” (100 × 60 din (20, 20)), cu linia la
 * y = 100.
 */
test.use({ locale: 'ro-RO' });

type P = { readonly x: number; readonly y: number };
const strat = (page: Page) => page.getByTestId('strat-cote');
const cote = (page: Page) => page.locator('[data-testid="strat-cote"] > svg > g[data-cota]');
const panou = (page: Page) => page.getByTestId('panou-cota');
const lista = (page: Page) => page.getByTestId('lista-cote');

async function clic(page: Page, p: P): Promise<void> {
  const s = (await ecran(page, await vedere(page)))(p.x, p.y);
  await page.mouse.move(s.x, s.y, { steps: 2 });
  await page.mouse.click(s.x, s.y);
}

/** Dreptunghiul și cota lui de sus (linia la y = 100), cu unealta Cote încă aleasă. */
async function cuCota(page: Page): Promise<void> {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-unealta="cote"]').click();
  await expect(strat(page)).toHaveAttribute('data-fel', /.+/);
  await clic(page, { x: 20, y: 80 });
  await clic(page, { x: 120, y: 80 });
  await clic(page, { x: 70, y: 100 });
  await expect(cote(page)).toHaveCount(1);
}

test('panoul cotei alese: felul, valoarea exactă și Copiază, legătura și Dezleagă, textul cu <>, distanța, Șterge', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await cuCota(page);
  await expect(panou(page)).toHaveCount(0);
  await clic(page, { x: 50, y: 100 });
  await expect(strat(page)).toHaveAttribute('data-aleasa', /c\d+/);
  await expect(panou(page)).toBeVisible();
  await expect(panou(page)).toContainText('orizontală');
  await expect(page.getByTestId('cota-valoare')).toHaveText('100 mm');
  await expect(page.getByTestId('cota-legatura')).toHaveText('Legată de formă');
  await page.locator('[data-buton="cota-copiaza"]').click();
  await expect(page.getByTestId('cota-mesaj')).toContainText('clipboard');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('100');

  // Textul, cu <> pentru valoare: pe pânză, „2× 100”.
  const text = page.locator('[data-camp="cota-text"]');
  await text.fill('2× <>');
  await text.press('Enter');
  await expect(cote(page).first()).toHaveAttribute('data-text', '2× 100');
  // Distanța liniei: 30 mm sub mijlocul punctelor (y = 80 − 30 = 50); valoarea rămâne.
  const distanta = page.locator('[data-camp="cota-distanta"]');
  await expect(distanta).toHaveValue('20');
  await distanta.fill('-30');
  await distanta.press('Enter');
  const linie = cote(page).first().locator('line.cota-linie').first();
  const y50 = (await ecran(page, await vedere(page)))(0, 50).y;
  await expect.poll(async () => Number(await linie.getAttribute('y1'))).toBeCloseTo(y50, 0);

  // Dezleagă: liberă; scalată forma, cota nu se mai schimbă.
  await page.locator('[data-buton="cota-dezleaga"]').click();
  await expect(page.getByTestId('cota-legatura')).toHaveText('Liberă');
  await expect(page.locator('[data-buton="cota-dezleaga"]')).toBeDisabled();
  await page.locator('[data-unealta="selectie"]').click();
  await expect(panou(page)).toHaveCount(0);
  await clic(page, { x: 70, y: 40 });
  const latime = page.locator('[data-camp="forma-latime"]');
  await latime.fill('150');
  await latime.press('Enter');
  await expect(cote(page).first()).toHaveAttribute('data-text', '2× 100');

  // Șterge, din panou: cota pleacă, panoul se închide; o singură anulare o întoarce.
  await page.locator('[data-unealta="cote"]').click();
  await clic(page, { x: 50, y: 50 });
  await expect(panou(page)).toBeVisible();
  await page.locator('[data-buton="cota-sterge"]').click();
  await expect(cote(page)).toHaveCount(0);
  await expect(panou(page)).toHaveCount(0);
  await page.locator('[data-unealta="selectie"]').focus();
  await page.keyboard.press('Control+z');
  await expect(cote(page)).toHaveCount(1);
});

test('lista: „Cote (N)”, cotele foii, un clic trece la unealta Cote cu cota aleasă; ochiul o ascunde de pe pânză', async ({ page }) => {
  await cuCota(page);
  await page.locator('[data-unealta="selectie"]').click();
  await expect(lista(page)).toContainText('Cote (1)');
  await lista(page).getByTestId('lista-cote-comuta').click();
  const rand = lista(page).locator('button[data-cota-lista]');
  await expect(rand).toHaveText('100 · orizontală');
  await rand.click();
  await expect(page.locator('[data-unealta="cote"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(strat(page)).toHaveAttribute('data-aleasa', /c\d+/);
  await expect(rand).toHaveAttribute('aria-pressed', 'true');
  await expect(panou(page)).toBeVisible();

  // Ochiul: cu Selecția, cotele foii nu se mai văd (și nu se șterg); cu unealta Cote, se văd.
  await page.locator('[data-unealta="selectie"]').click();
  const ochi = lista(page).getByTestId('lista-cote-ochi');
  await expect(ochi).toHaveAttribute('aria-pressed', 'true');
  await ochi.click();
  await expect(ochi).toHaveAttribute('aria-pressed', 'false');
  await expect(cote(page)).toHaveCount(0);
  await expect(lista(page)).toContainText('Cote (1)');
  await page.locator('[data-unealta="cote"]').click();
  await expect(cote(page)).toHaveCount(1);
  await page.locator('[data-unealta="selectie"]').click();
  await expect(cote(page)).toHaveCount(0);
  // Ținut după reîncărcare.
  await page.waitForTimeout(800);
  await page.reload();
  await expect(lista(page).getByTestId('lista-cote-ochi')).toHaveAttribute('aria-pressed', 'false');
  await expect(cote(page)).toHaveCount(0);
  await lista(page).getByTestId('lista-cote-ochi').click();
  await expect(cote(page)).toHaveCount(1);
});

test('„Arată cotele” din paletă: ascunde și arată cotele pe pânză (setarea „Cotele pe pânză”)', async ({ page }) => {
  await cuCota(page);
  await page.locator('[data-unealta="selectie"]').click();
  const comanda = async (): Promise<void> => {
    await page.locator('[data-unealta="selectie"]').focus();
    await page.keyboard.press('Control+k');
    const cauta = page.locator('.paleta[role="dialog"] input');
    await cauta.fill('Arată cotele');
    await cauta.press('Enter');
    await expect(page.locator('.paleta[role="dialog"]')).toHaveCount(0);
  };
  await comanda();
  await expect(cote(page)).toHaveCount(0);
  await comanda();
  await expect(cote(page)).toHaveCount(1);
});

test('cu „Toate foile pe pânză”, cotele foii vecine se văd estompate lângă ea; ascunse din Setări', async ({ page }) => {
  await cuCota(page);
  await page.locator('[data-unealta="selectie"]').click();
  await page.getByTestId('lista-vectori').locator('[data-actiune="foaie.adauga"]').click();
  // Foaia nouă e activă; cotele foii 1 nu sunt ale ei.
  await expect(cote(page)).toHaveCount(0);
  const comutator = page.locator('[data-actiune="vedere.toate-foile"]');
  if ((await comutator.getAttribute('aria-pressed')) !== 'true') await comutator.click();
  await expect(comutator).toHaveAttribute('aria-pressed', 'true');
  const vecine = page.locator('[data-testid="strat-cote"] .cote-vecine');
  await expect(vecine).toHaveCount(1);
  await expect(vecine.locator('g[data-cota]')).toHaveAttribute('data-text', '100');
  await expect(vecine).toHaveCSS('opacity', '0.45');
  // Lângă foaia ei, la stânga foii active (foaia 1 stă înaintea foii 2 pe rândul pânzei).
  const x0 = (await ecran(page, await vedere(page)))(0, 0).x;
  expect(Number(await vecine.locator('line.cota-linie').first().getAttribute('x2'))).toBeLessThan(x0);
  // Ascunse din Setări.
  await page.keyboard.press('Control+,');
  await page.getByTestId('dialog-setari').locator('[data-setare="comportament.vecine"]').selectOption('ascunse');
  await expect(vecine).toHaveCount(0);
});
