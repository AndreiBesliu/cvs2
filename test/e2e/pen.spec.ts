import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Unealta Pen și tipurile nodurilor (felia 6.I↑, ADR 0063), în Edge: calea pusă nod cu nod (clic = colț, tragere = curbă pe
 * ambele părți, Shift + tragere = doar înainte, clic pe ultimul nod = doar înapoi), închisă pe primul nod sau terminată cu
 * Enter / dublu clic; Backspace, Delete și Esc sunt ale căii începute. În unealta Noduri, tipul nodului ales se schimbă din
 * bara de sus, iar mânerul tras pe un nod neted îl rotește pe celălalt; lângă un arc, refuzul cu motiv.
 */
test.use({ locale: 'ro-RO' });

type P = { readonly x: number; readonly y: number };
const pen = (page: Page) => page.getByTestId('pen');
const noduri = (page: Page) => page.getByTestId('noduri');
const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');

async function peEcran(page: Page, p: P): Promise<P> {
  return (await ecran(page, await vedere(page)))(p.x, p.y);
}

async function clic(page: Page, p: P): Promise<void> {
  const s = await peEcran(page, p);
  await page.mouse.click(s.x, s.y);
}

async function trage(page: Page, a: P, b: P, shift = false): Promise<void> {
  const [sa, sb] = [await peEcran(page, a), await peEcran(page, b)];
  await page.mouse.move(sa.x, sa.y);
  if (shift) await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move((sa.x + sb.x) / 2, (sa.y + sb.y) / 2, { steps: 4 });
  await page.mouse.move(sb.x, sb.y, { steps: 4 });
  await page.mouse.up();
  if (shift) await page.keyboard.up('Shift');
}

async function unealta(page: Page, u: string): Promise<void> {
  await page.locator(`[data-unealta="${u}"]`).click();
  await expect(page.locator(`[data-unealta="${u}"]`)).toHaveAttribute('aria-pressed', 'true');
}

async function fara(page: Page): Promise<void> {
  await page.goto('/');
  // Fără lipire: nodurile cad exact unde se apasă.
  await page.locator('[data-editare="lipire"]').click();
}

test('Pen: clic = colț, tragere = curbă pe ambele părți; Enter termină o cale deschisă, aleasă; în Noduri, nodul tras e neted', async ({ page }) => {
  await fara(page);
  await unealta(page, 'pen');
  await expect(page.getByTestId('pen-sfat')).toHaveText('Clic: colț; trage: curbă; Shift + trage: pe o parte; primul nod închide; Enter termină.');
  await clic(page, { x: 20, y: 20 });
  await trage(page, { x: 60, y: 20 }, { x: 70, y: 30 });
  await clic(page, { x: 100, y: 20 });
  await expect(pen(page)).toHaveAttribute('data-noduri', '3');
  await page.keyboard.press('Enter');
  await expect(pen(page)).toHaveAttribute('data-noduri', '0');
  await expect(randuri(page)).toHaveCount(1);
  await expect(randuri(page).first()).toContainText('cale');
  await expect(randuri(page).first()).toHaveAttribute('aria-pressed', 'true');
  await unealta(page, 'noduri');
  await expect(noduri(page)).toHaveAttribute('data-noduri', '3');
  await clic(page, { x: 60, y: 20 });
  await expect(noduri(page)).toHaveAttribute('data-ales', '1');
  await expect(noduri(page)).toHaveAttribute('data-tip', 'ambele');
  await expect(noduri(page).locator('circle[data-maner]')).toHaveCount(2);
  await expect(page.locator('[data-editare="nod-ambele"]')).toHaveAttribute('aria-pressed', 'true');
  // Capătul unei căi deschise n-are două părți.
  await clic(page, { x: 20, y: 20 });
  await page.locator('[data-editare="nod-ambele"]').click();
  await expect(page.getByTestId('noduri-sfat')).toHaveText('Capătul unei căi deschise are o singură parte.');
});

test('Pen: Shift + tragere = curbă doar înainte; clic pe ultimul nod = doar înapoi; clic pe primul nod închide calea', async ({ page }) => {
  await fara(page);
  await unealta(page, 'pen');
  await clic(page, { x: 20, y: 20 });
  await trage(page, { x: 60, y: 20 }, { x: 70, y: 30 }, true);
  await trage(page, { x: 100, y: 20 }, { x: 110, y: 10 });
  await clic(page, { x: 100, y: 20 });
  await clic(page, { x: 100, y: 60 });
  await expect(pen(page)).toHaveAttribute('data-noduri', '4');
  await clic(page, { x: 20, y: 20 });
  await expect(pen(page)).toHaveAttribute('data-noduri', '0');
  await expect(randuri(page)).toHaveCount(1);
  await unealta(page, 'noduri');
  await expect(noduri(page)).toHaveAttribute('data-noduri', '4');
  await clic(page, { x: 60, y: 20 });
  await expect(noduri(page)).toHaveAttribute('data-tip', 'inainte');
  await expect(page.locator('[data-editare="nod-o-parte"]')).toHaveAttribute('aria-pressed', 'true');
  await clic(page, { x: 100, y: 20 });
  await expect(noduri(page)).toHaveAttribute('data-tip', 'inapoi');
  // Închisă: primul nod are ambele părți (segmentul care închide vine din ultimul nod).
  await clic(page, { x: 20, y: 20 });
  await page.locator('[data-editare="nod-ambele"]').click();
  await expect(noduri(page)).toHaveAttribute('data-tip', 'ambele');
});

test('Pen: Backspace scoate ultimul nod, Delete nu șterge selecția cât e o cale începută, Esc renunță; dublu clic termină', async ({ page }) => {
  await fara(page);
  await adauga(page, 'dreptunghi');
  await unealta(page, 'pen');
  await clic(page, { x: 150, y: 100 });
  await clic(page, { x: 180, y: 100 });
  await clic(page, { x: 180, y: 130 });
  await expect(pen(page)).toHaveAttribute('data-noduri', '3');
  await page.keyboard.press('Backspace');
  await expect(pen(page)).toHaveAttribute('data-noduri', '2');
  await page.keyboard.press('Delete');
  await expect(pen(page)).toHaveAttribute('data-noduri', '1');
  await expect(randuri(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(pen(page)).toHaveAttribute('data-noduri', '0');
  await expect(page.locator('[data-unealta="pen"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(randuri(page)).toHaveCount(1);
  // Dublu clic: al doilea nod, apoi calea deschisă terminată (o linie).
  await clic(page, { x: 150, y: 100 });
  const s = await peEcran(page, { x: 200, y: 120 });
  await page.mouse.dblclick(s.x, s.y);
  await expect(pen(page)).toHaveAttribute('data-noduri', '0');
  await expect(randuri(page)).toHaveCount(2);
  await expect(randuri(page).nth(1)).toContainText('cale');
  // Fără cale începută, Esc întoarce la Selecție.
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-unealta="selectie"]')).toHaveAttribute('aria-pressed', 'true');
});

test('Noduri: colțul devine curbă pe ambele părți, mânerul tras îl rotește pe celălalt, pe o parte trece dintr-o parte în alta, colț; anulările', async ({ page }) => {
  await fara(page);
  await adauga(page, 'dreptunghi');
  await unealta(page, 'noduri');
  await expect(page.locator('[data-editare="nod-colt"]')).toBeDisabled();
  await clic(page, { x: 120, y: 20 });
  await expect(noduri(page)).toHaveAttribute('data-tip', 'colt');
  await expect(page.locator('[data-editare="nod-colt"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-editare="nod-ambele"]').click();
  await expect(noduri(page)).toHaveAttribute('data-tip', 'ambele');
  await expect(randuri(page).first()).toContainText('cale');
  // Mânerul de înainte (pe bisectoare, 20 mm) tras drept în sus: cel de înapoi se rotește în jos, cu lungimea lui (100 / 3).
  const maner = noduri(page).locator('circle[data-maner="inainte"]');
  const cutie = await maner.boundingBox();
  if (!cutie) throw new Error('mânerul n-are cutie');
  const tinta = await peEcran(page, { x: 120, y: 60 });
  await page.mouse.move(cutie.x + cutie.width / 2, cutie.y + cutie.height / 2);
  await page.mouse.down();
  await page.mouse.move(tinta.x, tinta.y, { steps: 6 });
  await page.mouse.up();
  await expect(noduri(page)).toHaveAttribute('data-tip', 'ambele');
  const opus = await noduri(page).locator('circle[data-maner="inapoi"]').boundingBox();
  const asteptat = await peEcran(page, { x: 120, y: 20 - 100 / 3 });
  expect(opus && Math.abs(opus.x + opus.width / 2 - asteptat.x)).toBeLessThan(1.5);
  expect(opus && Math.abs(opus.y + opus.height / 2 - asteptat.y)).toBeLessThan(1.5);
  await page.locator('[data-editare="nod-o-parte"]').click();
  await expect(noduri(page)).toHaveAttribute('data-tip', 'inainte');
  await page.locator('[data-editare="nod-o-parte"]').click();
  await expect(noduri(page)).toHaveAttribute('data-tip', 'inapoi');
  await page.locator('[data-editare="nod-colt"]').click();
  await expect(noduri(page)).toHaveAttribute('data-tip', 'colt');
  // Un pas de anulare pe fiecare schimbare: cinci, până la dreptunghi.
  for (let k = 0; k < 5; k++) await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page).first()).toContainText('dreptunghi 100.00 × 60.00');
});

test('Noduri: lângă un arc, nodul nu primește mâner (refuzul cu motiv); colțul nu schimbă nimic', async ({ page }) => {
  await fara(page);
  await adauga(page, 'cerc');
  await unealta(page, 'noduri');
  await clic(page, { x: 85, y: 50 });
  await expect(noduri(page)).toHaveAttribute('data-ales', '0');
  await page.locator('[data-editare="nod-ambele"]').click();
  await expect(page.getByTestId('noduri-sfat')).toHaveText('Lângă un arc, nodul nu primește mâner (arcul ar trebui aproximat).');
  await page.locator('[data-editare="nod-colt"]').click();
  await expect(randuri(page).first()).toContainText('cerc');
});
