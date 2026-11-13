/**
 * Felia 11.3↑ (ADR 0210 §3): „Așază pe foi” și „Mută și așază la capăt”. Fereastra, din meniul foii și din meniul de clic
 * dreapta: ce se așază, distanța pornită de la freza profilului (Ø6 la dreptunghiul implicit), rezultatul înainte de Așază,
 * refuzul sub freză, colțul ales ținut minte, anularea într-un pas. Pe hârtie: 100 × 60 pe 300 × 200, marginea 10,
 * distanța 6: două pe rând (x 10 și 116), două rânduri (y 130 și 64), deci 7 = 4 + 3; din dreapta-jos, primul la x 190.
 */
import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const lista = (page: Page) => page.getByTestId('lista-vectori');
const randuri = (page: Page) => lista(page).locator('button[data-instanta]');
const dialog = (page: Page) => page.getByTestId('dialog-asezare');
const dr = (x: number, y: number): string => `dreptunghi 100.00 × 60.00 la X ${x}.00, Y ${y}.00`;

async function clicDreapta(page: Page, x: number, y: number): Promise<void> {
  const la = await ecran(page, await vedere(page));
  const p = la(x, y);
  await page.mouse.click(p.x, p.y, { button: 'right' });
}

async function dinMeniulFoii(page: Page, foaie: string): Promise<void> {
  await lista(page).locator(`[data-foaie-meniu="${foaie}"]`).click();
  await lista(page).locator(`[data-meniu-foaie="${foaie}"] [data-meniu-foaie-articol="aseaza"]`).click();
  await expect(dialog(page)).toBeVisible();
}

test('„Așază pe foi” din meniul foii: toate de pe foaie, distanța de la freză, rezultatul, refuzul sub freză, Așază, colțul ținut minte', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  for (let k = 0; k < 7; k++) await adauga(page, 'dreptunghi');
  await expect(randuri(page)).toHaveCount(7);
  await dinMeniulFoii(page, 'f1');
  const d = dialog(page);
  // Ultimul dreptunghi adăugat e ales: implicit „piesele alese”; aici, toate de pe foaie.
  await expect(d.locator('[data-aseaza="alese"]')).toBeChecked();
  await d.locator('[data-aseaza="toate"]').check();
  await expect(d.locator('[data-camp="aseaza-margineX"]')).toHaveValue('10');
  await expect(d.locator('[data-camp="aseaza-distantaX"]')).toHaveValue('6');
  await expect(page.getByTestId('aseaza-minim')).toHaveText('cel puțin 6 mm: freza Ø6 a profilului exterior');
  await expect(page.getByTestId('aseaza-rezultat')).toHaveText('7 piese pe 2 foi: 4 + 3. Una e o foaie nouă.');
  // Sub freză: refuzul, cu motivul, iar Așază e oprit.
  await d.locator('[data-camp="aseaza-distantaX"]').fill('5');
  await expect(page.getByTestId('aseaza-rezultat')).toHaveText('Distanța dintre piese e sub freza profilului exterior: tăietura unei piese ar intra în vecina ei.');
  await expect(d.locator('[data-buton="aseaza"]')).toBeDisabled();
  await d.locator('[data-camp="aseaza-distantaX"]').fill('6');
  await d.locator('[data-buton="aseaza"]').click();
  await expect(d).toHaveCount(0);
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  await expect(randuri(page)).toHaveText([dr(10, 130), dr(116, 130), dr(10, 64), dr(116, 64)]);
  await page.locator('body').press('PageDown');
  await expect(randuri(page)).toHaveText([dr(10, 130), dr(116, 130), dr(10, 64)]);
  await page.locator('body').press('PageUp');
  await page.locator('body').press('Control+z');
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(1);
  await expect(randuri(page)).toHaveText(Array.from({ length: 7 }, () => dr(20, 20)));
  // Din dreapta-jos, cu trei piese: primul la x = 300 − 10 − 100 = 190; colțul se ține minte.
  await dinMeniulFoii(page, 'f1');
  await d.locator('[data-camp="aseaza-colt"]').selectOption('dreapta-jos');
  await d.locator('[data-buton="aseaza"]').click();
  await expect(randuri(page).first()).toHaveText(dr(190, 10));
  await page.locator('body').press('Control+z');
  await dinMeniulFoii(page, 'f1');
  await expect(d.locator('[data-camp="aseaza-colt"]')).toHaveValue('dreapta-jos');
  await d.press('Escape');
  await expect(d).toHaveCount(0);
  expect(erori).toEqual([]);
});

test('meniul de clic dreapta: „Așază pe foi…” cu piesa aleasă; „Mută și așază la capăt pe Foaia 2”, după piesa ei', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await adauga(page, 'dreptunghi');
  await page.locator('body').press('PageUp');
  await clicDreapta(page, 50, 50);
  const meniu = page.getByTestId('meniu-context');
  await expect(meniu.locator('[data-meniu="aseaza"]')).toHaveText('Așază pe foi…');
  await expect(meniu.locator('[data-meniu="muta-si-aseaza-noua"]')).toHaveText('Mută și așază pe o foaie nouă');
  await meniu.locator('[data-meniu="aseaza"]').click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).locator('[data-aseaza="alese"]')).toBeChecked();
  await expect(page.getByTestId('aseaza-rezultat')).toHaveText('o piesă pe o foaie.');
  await dialog(page).locator('[data-buton="renunta"]').click();
  await expect(dialog(page)).toHaveCount(0);
  // Pe Foaia 2 stă dreptunghiul ei, jos (20, 20): rândul de sus e liber.
  await clicDreapta(page, 50, 50);
  await meniu.locator('[data-meniu="muta-si-aseaza-f2"]').click();
  await expect(randuri(page)).toHaveCount(0);
  await page.locator('body').press('PageDown');
  await expect(randuri(page)).toHaveText([dr(20, 20), dr(10, 130)]);
});
