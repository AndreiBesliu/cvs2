import { test, expect, type Page } from '@playwright/test';
import { adauga, alfaTraseu, ecran, vedere } from './ajutor-panza.ts';

/**
 * Rolul de tăiere din panou și traseul la zi (ADR 0112), în Edge: rolul ales în panou apare în fereastra exportului și mută
 * traseul arătat, fără T, iar anularea îl pune la loc; adâncimea din panou; mai multe forme alese (rolul și adâncimea
 * diferite, „—” și câmpul gol, apoi aceleași într-un pas); două cercuri devin găuriri; traseul se reface după o mutare.
 * Pe foaie: dreptunghiul 100 × 60 din (20, 20) și cercul R15 în (70, 50), cu freza Ø6.
 */
test.use({ locale: 'ro-RO' });

const strat = (page: Page) => page.getByTestId('strat-traseu');
const cip = (page: Page) => page.getByTestId('traseu-stare');
const butonTraseu = (page: Page) => page.locator('[data-actiune="vedere.traseu"]');
const taierea = (page: Page) => page.getByTestId('prop-taierea');
const rol = (page: Page) => taierea(page).locator('[data-camp="rol"]');
const latura = (page: Page) => page.locator('[data-operatie] [data-camp="latura"]');
/** Valorile tuturor câmpurilor găsite, în ordine (rândurile ferestrei exportului). */
const valori = (page: Page, selector: string): Promise<string[]> =>
  page.locator(selector).evaluateAll((els) => els.map((e) => (e as HTMLInputElement | HTMLSelectElement).value));
const alese = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]');

/** Trage o fereastră de selecție între două puncte ale foii (mm): alege formele cuprinse în întregime. */
async function fereastra(page: Page, a: { x: number; y: number }, b: { x: number; y: number }): Promise<void> {
  const la = await ecran(page, await vedere(page));
  const [sa, sb] = [la(a.x, a.y), la(b.x, b.y)];
  await page.mouse.move(sa.x, sa.y);
  await page.mouse.down();
  await page.mouse.move((sa.x + sb.x) / 2, (sa.y + sb.y) / 2, { steps: 4 });
  await page.mouse.move(sb.x, sb.y, { steps: 4 });
  await page.mouse.up();
}

/** Scrie o valoare într-un câmp al panoului și o aplică (Enter). */
async function scrie(page: Page, camp: string, valoare: string): Promise<void> {
  const c = taierea(page).locator(`[data-camp="${camp}"]`);
  await c.fill(valoare);
  await c.press('Enter');
}

test('rolul ales în panou: fereastra exportului îl arată, iar traseul arătat se mută singur, fără T; anularea îl pune la loc', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await butonTraseu(page).click();
  await expect(strat(page)).toHaveAttribute('data-varfuri', /^[1-9]/);
  // Pe exterior: rama traseului la 3 mm în afara conturului (y 17).
  await expect.poll(() => alfaTraseu(page, 70, 17)).toBeGreaterThan(0);
  await expect(rol(page)).toHaveValue('exterior');
  await expect(rol(page).locator('option')).toHaveText(['exterior', 'interior', 'pe linie', 'buzunar', 'V-carve']);
  await rol(page).selectOption('interior');
  // Fără T: pe interior, rama e la 3 mm înăuntru (y 23), iar cea de afară dispare.
  await expect.poll(() => alfaTraseu(page, 70, 23)).toBeGreaterThan(0);
  await expect.poll(() => alfaTraseu(page, 70, 17)).toBe(0);
  await expect(strat(page)).toHaveAttribute('data-stins', 'false');
  await expect(cip(page)).toHaveCount(0);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(latura(page)).toHaveValue('interior');
  await page.getByRole('button', { name: 'Închide' }).click();
  // Un singur pas de anulare: înapoi pe exterior, iar traseul îl urmează.
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(rol(page)).toHaveValue('exterior');
  await expect.poll(() => alfaTraseu(page, 70, 17)).toBeGreaterThan(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('adâncimea din panou se scrie pe operație și se vede în export', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await expect(taierea(page).locator('[data-camp="adancime"]')).toHaveValue('3');
  await scrie(page, 'adancime', '6,5');
  await expect(taierea(page).locator('[data-camp="adancime"]')).toHaveValue('6,5');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-operatie] [data-camp="adancime"]')).toHaveValue('6,5');
});

test('mai multe forme: rolul și adâncimea diferite arată „—” și câmpul gol; alese din panou, devin aceleași într-un pas', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await fereastra(page, { x: 10, y: 10 }, { x: 130, y: 90 });
  await expect(alese(page)).toHaveCount(2);
  // Dreptunghiul pe exterior (3 mm), cercul o gaură (8 mm): rolul „—”, adâncimea goală; găurirea nu e a dreptunghiului.
  await expect(rol(page)).toHaveValue('');
  await expect(rol(page).locator('option:checked')).toHaveText('— (diferite)');
  await expect(rol(page).locator('option:not([disabled])')).toHaveText(['exterior', 'interior', 'pe linie', 'buzunar', 'V-carve']);
  await expect(taierea(page).locator('[data-camp="adancime"]')).toHaveValue('');
  await expect(taierea(page).locator('[data-camp="adancime"]')).toHaveAttribute('placeholder', '—');
  await rol(page).selectOption('pe-linie');
  await expect(rol(page)).toHaveValue('pe-linie');
  await scrie(page, 'adancime', '2');
  await expect(taierea(page).locator('[data-camp="adancime"]')).toHaveValue('2');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(latura(page)).toHaveCount(2);
  await expect.poll(() => valori(page, '[data-operatie] [data-camp="latura"]')).toEqual(['pe-linie', 'pe-linie']);
  await expect.poll(() => valori(page, '[data-operatie] [data-camp="adancime"]')).toEqual(['2', '2']);
  await page.getByRole('button', { name: 'Închide' }).click();
  // Rolul a fost un singur pas: o anulare scoate adâncimea, a doua rolul.
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(rol(page)).toHaveValue('');
});

test('două cercuri alese devin găuriri; un dreptunghi alăturat scoate găurirea din listă', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'cerc');
  // Primul cerc mutat la dreapta (colțul cutiei în 100, pe foaia de 140 × 100), apoi al doilea, în (70, 50).
  const x = page.locator('[data-camp="pozitie-x"]');
  await x.fill('100');
  await x.press('Enter');
  await adauga(page, 'cerc');
  // Fereastra pornește de sus: sub cercul ales stă bara selecției.
  await fereastra(page, { x: 40, y: 90 }, { x: 135, y: 20 });
  await expect(alese(page)).toHaveCount(2);
  await expect(rol(page)).toHaveValue('interior');
  await rol(page).selectOption('gaurire');
  await expect(rol(page)).toHaveValue('gaurire');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(latura(page)).toHaveCount(2);
  await expect.poll(() => valori(page, '[data-operatie] [data-camp="latura"]')).toEqual(['gaurire', 'gaurire']);
  await page.getByRole('button', { name: 'Închide' }).click();
  await adauga(page, 'dreptunghi');
  await fereastra(page, { x: 10, y: 95 }, { x: 135, y: 10 });
  await expect(alese(page)).toHaveCount(3);
  await expect(rol(page).locator('option[value="gaurire"]')).toHaveCount(0);
});

test('cât traseul e arătat, o mutare din panou îl reface singur, pe locul nou', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await butonTraseu(page).click();
  await expect.poll(() => alfaTraseu(page, 17, 50)).toBeGreaterThan(0);
  const x = page.locator('[data-camp="pozitie-x"]');
  await x.fill('40');
  await x.press('Enter');
  // Imediat: traseul de dinainte, stins, sub „se calculează”; apoi cel nou, cu rama stângă în 37.
  await expect(cip(page)).toHaveAttribute('data-stare', 'traseu.calcul');
  await expect.poll(() => alfaTraseu(page, 37, 50)).toBeGreaterThan(0);
  await expect.poll(() => alfaTraseu(page, 17, 50)).toBe(0);
  await expect(cip(page)).toHaveCount(0);
});
