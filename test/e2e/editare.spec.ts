/**
 * Riglele, ghidajele, lipirea și alinierea (ADR 0050), pe build-ul real: riglele vin la cerere și urmează vederea, un
 * ghidaj tras din riglă se salvează în proiect (rămâne după reîncărcare), se anulează și se șterge lăsat pe riglă; mutarea
 * se lipește de ghidaj (Alt o oprește); alinierea față de foaie; săgețile; grila. Capturile merg în `.tmp/`.
 */
import { mkdirSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');
const rigle = (page: Page) => page.getByTestId('rigle');

/** Trage cu mausul între două puncte de pe ecran, în pași (gestul vede mișcările de pe drum). */
async function trageEcran(page: Page, a: { x: number; y: number }, b: { x: number; y: number }, alt = false): Promise<void> {
  await page.mouse.move(a.x, a.y);
  if (alt) await page.keyboard.down('Alt');
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
  if (alt) await page.keyboard.up('Alt');
}

async function centruRigla(page: Page, id: 'rigla-sus' | 'rigla-stanga'): Promise<{ x: number; y: number }> {
  const b = await page.getByTestId(id).boundingBox();
  if (!b) throw new Error(`${id} n-are cutie`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

test('riglele și ghidajele: din riglă, salvate în proiect, anulate, șterse pe riglă', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  await expect(page.getByTestId('rigla-sus')).toBeVisible();
  await expect(rigle(page)).toHaveAttribute('data-ghidaje', '0');
  // Gradația 0 a foii e pe riglă, în dreptul colțului foii.
  await expect(page.getByTestId('rigla-sus').locator('text', { hasText: /^0$/ })).toHaveCount(1);

  // Un ghidaj orizontal la y = 150 mm, tras din rigla de sus.
  const v = await vedere(page);
  const la = await ecran(page, v);
  const sus = await centruRigla(page, 'rigla-sus');
  await trageEcran(page, sus, { x: sus.x, y: la(0, 150).y });
  await expect(rigle(page)).toHaveAttribute('data-ghidaje', '1');
  const g = page.locator('[data-ghidaj]');
  await expect(g).toHaveAttribute('data-axa', 'y');
  expect(Math.abs(Number(await g.getAttribute('data-poz')) - 150)).toBeLessThan(1 / v.scara + 1e-9);

  // Anularea și refacerea, ca orice comandă.
  await page.keyboard.press('Control+z');
  await expect(rigle(page)).toHaveAttribute('data-ghidaje', '0');
  await page.keyboard.press('Control+y');
  await expect(rigle(page)).toHaveAttribute('data-ghidaje', '1');

  // Salvat în proiect: rămâne după reîncărcare.
  await expect(page.getByTestId('proiect')).toHaveCount(0);
  await page.waitForTimeout(300);
  await page.reload();
  await expect(rigle(page)).toHaveAttribute('data-ghidaje', '1');

  // Dublu clic: poziția exactă.
  const b = await page.locator('[data-ghidaj]').boundingBox();
  if (!b) throw new Error('ghidajul n-are cutie');
  await page.mouse.dblclick(b.x + b.width * 0.7, b.y + b.height / 2);
  const camp = page.getByTestId('ghidaj-camp');
  await camp.fill('123,5');
  await camp.press('Enter');
  await expect(page.locator('[data-ghidaj]')).toHaveAttribute('data-poz', '123.5');

  // Lăsat pe riglă, se șterge.
  const b2 = await page.locator('[data-ghidaj]').boundingBox();
  if (!b2) throw new Error('ghidajul n-are cutie');
  await trageEcran(page, { x: b2.x + b2.width * 0.6, y: b2.y + b2.height / 2 }, await centruRigla(page, 'rigla-sus'));
  await expect(rigle(page)).toHaveAttribute('data-ghidaje', '0');
  expect(erori).toEqual([]);
});

test('lipirea mutării de un ghidaj (Alt o oprește), alinierea față de foaie, săgețile, grila', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('rigla-stanga')).toBeVisible();
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await expect(randuri(page)).toHaveText(['dreptunghi 100.00 × 60.00 la X 20.00, Y 20.00']);

  // Un ghidaj vertical la x = 200, din rigla din stânga.
  let v = await vedere(page);
  let la = await ecran(page, v);
  const stanga = await centruRigla(page, 'rigla-stanga');
  await trageEcran(page, stanga, { x: la(200, 0).x, y: stanga.y });
  await expect(rigle(page)).toHaveAttribute('data-ghidaje', '1');
  // Ghidajul s-a lipit și el de ceva (foaia, grila oprită): e la 200 doar dacă a fost tras acolo; îl punem exact.
  const b = await page.locator('[data-ghidaj]').boundingBox();
  if (!b) throw new Error('ghidajul n-are cutie');
  await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height * 0.6);
  await page.getByTestId('ghidaj-camp').fill('200');
  await page.getByTestId('ghidaj-camp').press('Enter');
  await expect(page.locator('[data-ghidaj]')).toHaveAttribute('data-poz', '200');

  // Dreptunghiul (marginea dreaptă la 120) tras cu 78,6 mm: marginea ajunge la 198,6 și se lipește de ghidaj (x = 100).
  v = await vedere(page);
  la = await ecran(page, v);
  const dx = 78.6;
  const dinColt = la(20, 50);
  await trageEcran(page, dinColt, { x: dinColt.x + dx * v.scara, y: dinColt.y });
  await expect(randuri(page)).toHaveText(['dreptunghi 100.00 × 60.00 la X 100.00, Y 20.00']);
  // Cât se trage, linia de aliniere a ghidajului se vede.
  const a = la(100, 50);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 3, a.y, { steps: 3 });
  // Marginea dreaptă pe ghidaj și centrul pe mijlocul foii (150), deodată: ambele linii.
  await expect(page.locator('line.aliniere[data-fel="ghidaj"]')).toHaveCount(1);
  await expect(page.locator('line.aliniere[data-fel="foaie"]')).toHaveCount(1);
  await page.mouse.move(a.x, a.y, { steps: 3 });
  await page.mouse.up();
  await expect(page.locator('line.aliniere')).toHaveCount(0);

  // Cu Alt, fără lipire: aceeași tragere lasă marginea la 0,4 mm de ghidaj.
  await page.keyboard.press('Control+z');
  await expect(randuri(page)).toHaveText(['dreptunghi 100.00 × 60.00 la X 20.00, Y 20.00']);
  v = await vedere(page);
  la = await ecran(page, v);
  const c = la(20, 50);
  await trageEcran(page, c, { x: c.x + dx * v.scara, y: c.y }, true);
  await expect(randuri(page)).not.toHaveText(['dreptunghi 100.00 × 60.00 la X 100.00, Y 20.00']);

  // Alinierea unei singure forme, față de foaie (300 × 200): centrul pe orizontală, apoi sus.
  await page.locator('[data-aliniaza="centru-x"]').click();
  await expect(randuri(page)).toHaveText(['dreptunghi 100.00 × 60.00 la X 100.00, Y 20.00']);
  await page.locator('[data-aliniaza="sus"]').click();
  await expect(randuri(page)).toHaveText(['dreptunghi 100.00 × 60.00 la X 100.00, Y 140.00']);
  await expect(page.locator('[data-aliniaza="distribuie-x"]')).toBeDisabled();

  // Săgețile: 1 mm, Shift 10 mm, Alt 0,1 mm.
  await page.locator('body').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(randuri(page)).toHaveText(['dreptunghi 100.00 × 60.00 la X 100.90, Y 130.00']);

  // Grila: pornită, se vede pe foaie; pasul se schimbă.
  await expect(page.locator('[data-testid="grila"] line')).toHaveCount(0);
  await page.locator('[data-editare="grila"]').click();
  expect(await page.locator('[data-testid="grila"] line').count()).toBeGreaterThan(10);
  await page.locator('[data-editare="pas-grila"]').fill('25');
  await expect(page.locator('[data-testid="grila"] line')).toHaveCount(13 + 9);

  mkdirSync('.tmp', { recursive: true });
  await page.screenshot({ path: '.tmp/editare.png' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: '.tmp/editare-intunecat.png' });
  await page.emulateMedia({ colorScheme: 'light' });
});
