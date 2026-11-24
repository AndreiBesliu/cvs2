import { test, expect, type Page } from '@playwright/test';
import { adauga, deschideMeniulContului, ecran, vedere } from './ajutor-panza.ts';

/**
 * Fereastra Setări (ADR 0330 §6, felia 10.4↑a-3), în browser: deschisă din meniul contului, cu Ctrl+, și din ⚙ al uneltei
 * Cote; Escape o închide și întoarce focusul. Fiecare setare se aplică pe loc cotelor de pe pânză și cotei de probă, se ține
 * după reîncărcare; un număr în afara marginilor e spus și nu se ține; „Înapoi la implicit” pune grupul la loc; ascunse,
 * cotele se văd doar cu unealta Cote. Cota de probă de pe pânză: orizontala de 100 mm, pusă pe vârfurile de sus ale
 * dreptunghiului „Adaugă dreptunghi” (100 × 60 din (20, 20)).
 */
test.use({ locale: 'ro-RO' });

type P = { readonly x: number; readonly y: number };
const strat = (page: Page) => page.getByTestId('strat-cote');
const cota = (page: Page) => page.locator('[data-testid="strat-cote"] g[data-cota]').first();
const dialog = (page: Page) => page.getByTestId('dialog-setari');
const setare = (page: Page, s: string) => dialog(page).locator(`[data-setare="${s}"]`);

async function clic(page: Page, p: P): Promise<void> {
  const s = (await ecran(page, await vedere(page)))(p.x, p.y);
  await page.mouse.move(s.x, s.y, { steps: 2 });
  await page.mouse.click(s.x, s.y);
}

/** Dreptunghiul și o cotă orizontală de 100 pe vârfurile lui de sus, deasupra lui; apoi înapoi la Selecție. */
async function cuCota(page: Page): Promise<void> {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-unealta="cote"]').click();
  await expect(strat(page)).toHaveAttribute('data-fel', /.+/);
  await clic(page, { x: 21, y: 79 });
  await clic(page, { x: 119, y: 80.5 });
  await clic(page, { x: 70, y: 95 });
  await expect(cota(page)).toHaveAttribute('data-text', '100');
  await page.locator('[data-unealta="selectie"]').click();
}

async function deschideSetarile(page: Page): Promise<void> {
  await (await deschideMeniulContului(page)).locator('[data-meniu-cont="setari"]').click();
  await expect(dialog(page)).toBeVisible();
}

test('din meniul contului, cu Ctrl+, și din ⚙: Cotele, cu cota de probă; Escape închide și întoarce focusul', async ({ page }) => {
  await page.goto('/');
  await deschideSetarile(page);
  await expect(dialog(page).locator('#setari-titlu')).toHaveText('Setări');
  await expect(dialog(page).locator('[data-setari-sectiune="cote"]')).toHaveAttribute('aria-current', 'page');
  await expect(dialog(page).locator('[data-setari-sectiune="cote"]')).toBeFocused();
  await expect(dialog(page).locator('.setari-grup')).toHaveCount(6);
  await expect(dialog(page).getByTestId('setari-proba').locator('[data-text]')).toHaveCount(4);
  await expect(dialog(page).getByTestId('setari-proba').locator('[data-text="120,5"]')).toHaveCount(1);
  // Toate grupurile au implicitele: „Înapoi la implicit” nu are ce face.
  await expect(dialog(page).locator('[data-setari-implicit]:disabled')).toHaveCount(6);
  // Cât e deschisă, tastele desenului nu ating Proiectarea (R ar alege Dreptunghiul).
  await page.keyboard.press('r');
  await expect(page.locator('[data-unealta="selectie"]')).toHaveAttribute('aria-pressed', 'true');
  // Nici tastele aplicației (registrul): Ctrl+K nu deschide paleta peste fereastră.
  await page.keyboard.press('Control+k');
  await expect(page.locator('.paleta[role="dialog"]')).toHaveCount(0);
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator('[data-editare="cont"]')).toBeFocused();

  await page.locator('[data-unealta="selectie"]').focus();
  await page.keyboard.press('Control+,');
  await expect(dialog(page)).toBeVisible();
  // F1, în fereastră: capitolul ei.
  await page.keyboard.press('F1');
  await expect(page.getByTestId('manual-capitol')).toHaveAttribute('data-capitol', 'setari');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('manual-capitol')).toHaveCount(0);
  await expect(dialog(page)).toBeVisible();
  await dialog(page).locator('[data-buton="setari-inchide"]').click();
  await expect(dialog(page)).toHaveCount(0);

  await page.locator('[data-unealta="cote"]').click();
  await expect(strat(page)).toHaveAttribute('data-fel', /.+/);
  await page.getByTestId('cote-setari').click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('cote-setari')).toBeFocused();
});

test('cifrele și capetele, pe loc pe pânză și pe probă; ținute după reîncărcare; „Înapoi la implicit”', async ({ page }) => {
  await cuCota(page);
  await deschideSetarile(page);
  await setare(page, 'cifre.unitate').selectOption('cm');
  await expect(cota(page)).toHaveAttribute('data-text', '10');
  await expect(dialog(page).getByTestId('setari-proba').locator('[data-text="12,05"]')).toHaveCount(1);
  await setare(page, 'cifre.zerouri').selectOption('pastrate');
  await expect(cota(page)).toHaveAttribute('data-text', '10,00');
  await setare(page, 'cifre.separator').selectOption('punct');
  await setare(page, 'cifre.cuUnitate').check();
  await expect(cota(page)).toHaveAttribute('data-text', '10.00 cm');
  await setare(page, 'linii.capete').selectOption('oblica');
  await expect(cota(page).locator('line.cota-capat-bara')).toHaveCount(2);
  await expect(cota(page).locator('polygon')).toHaveCount(0);
  await setare(page, 'linii.extensii').uncheck();
  await expect(cota(page).locator('line:not(.cota-linie):not(.cota-capat-bara)')).toHaveCount(0);
  await expect(dialog(page).locator('[data-setari-implicit="cifre"]')).toBeEnabled();

  // Ținute în browser: după reîncărcare, aceleași.
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(cota(page)).toHaveAttribute('data-text', '10.00 cm');
  await expect(cota(page).locator('line.cota-capat-bara')).toHaveCount(2);

  await deschideSetarile(page);
  await dialog(page).locator('[data-setari-implicit="cifre"]').click();
  await expect(cota(page)).toHaveAttribute('data-text', '100');
  await expect(dialog(page).locator('[data-setari-implicit="cifre"]')).toBeDisabled();
  await expect(cota(page).locator('line.cota-capat-bara')).toHaveCount(2);
  await dialog(page).locator('[data-setari-implicit="linii"]').click();
  await expect(cota(page).locator('polygon.cota-capat')).toHaveCount(2);
});

test('un număr în afara marginilor e spus și nu se ține; unul bun, cu virgulă, se ține la Enter', async ({ page }) => {
  await cuCota(page);
  const inainte = await cota(page).locator('text').getAttribute('font-size');
  await deschideSetarile(page);
  // Pragul cifrelor: peste înălțimea lor pe ecran, cifrele se ascund (rămâne titlul); la 0, nu se ascund niciodată.
  const px = Number(await cota(page).locator('text').getAttribute('font-size'));
  expect(px).toBeLessThan(12);
  const prag = setare(page, 'comportament.pragCifre');
  await prag.fill('12');
  await prag.press('Enter');
  await expect(cota(page).locator('text')).toHaveCount(0);
  await expect(cota(page).locator('title')).toHaveCount(1);
  await prag.fill('0');
  await prag.press('Enter');
  await expect(cota(page).locator('text')).toHaveCount(1);
  await expect(cota(page).locator('text')).toHaveAttribute('font-size', inainte ?? '');
  const camp = setare(page, 'cifre.inaltime');
  await expect(camp).toHaveValue('3,5');
  await camp.fill('25');
  await camp.press('Enter');
  await expect(camp).toHaveAttribute('aria-invalid', 'true');
  await expect(dialog(page).locator('.setari-gresit')).toContainText('între 1 și 20');
  await expect(cota(page).locator('text')).toHaveAttribute('font-size', inainte ?? '');
  await camp.fill('7');
  await camp.press('Enter');
  await expect(camp).toHaveAttribute('aria-invalid', 'false');
  await expect(dialog(page).locator('.setari-gresit')).toHaveCount(0);
  const dupa = Number(await cota(page).locator('text').getAttribute('font-size'));
  expect(dupa / Number(inainte)).toBeCloseTo(2, 3);
  // Rotunjirea la un pas: câmpul pasului apare, iar 0,5 e implicitul lui.
  await setare(page, 'cifre.rotunjire').selectOption('pas');
  await expect(setare(page, 'cifre.pas')).toHaveValue('0,5');
});

test('ascunse din Setări, cotele se văd doar cu unealta Cote; culoarea aleasă', async ({ page }) => {
  await cuCota(page);
  await deschideSetarile(page);
  await setare(page, 'comportament.pePanza').uncheck();
  await expect(cota(page)).toHaveCount(0);
  await expect(strat(page)).toHaveAttribute('data-ascunse', '');
  await setare(page, 'comportament.culoare').selectOption('aleasa');
  await setare(page, 'comportament.culoarea').fill('#ff8800');
  await page.keyboard.press('Escape');
  await page.locator('[data-unealta="cote"]').click();
  await expect(cota(page)).toHaveCount(1);
  await expect(strat(page)).not.toHaveAttribute('data-ascunse', '');
  await expect(cota(page).locator('line').first()).toHaveCSS('stroke', 'rgb(255, 136, 0)');
  await page.locator('[data-unealta="selectie"]').click();
  await expect(cota(page)).toHaveCount(0);
});

test.describe('pe telefon', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('fereastra încape în lățime, cu secțiunile deasupra', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-unealta="selectie"]').focus();
    await page.keyboard.press('Control+,');
    await expect(dialog(page)).toBeVisible();
    const cutie = await dialog(page).locator('.dialog-cutie').boundingBox();
    expect(cutie && cutie.x >= 0 && cutie.x + cutie.width <= 390).toBe(true);
    const lat = await dialog(page).locator('.dialog-cutie').evaluate((e) => e.scrollWidth <= e.clientWidth);
    expect(lat).toBe(true);
  });
});

test.describe('în engleză', () => {
  test.use({ locale: 'en-US' });
  test('punctul după limbă, iar fereastra în engleză', async ({ page }) => {
    await cuCota(page);
    await page.locator('[data-unealta="selectie"]').focus();
    await page.keyboard.press('Control+,');
    await expect(dialog(page).locator('#setari-titlu')).toHaveText('Settings');
    await expect(dialog(page).getByTestId('setari-proba').locator('[data-text="120.5"]')).toHaveCount(1);
  });
});
