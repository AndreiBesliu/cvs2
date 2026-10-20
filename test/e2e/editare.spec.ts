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

/** Desenează cu unealta aleasă, prin tragere între două puncte ale foii (mm). */
async function deseneaza(page: Page, a: { x: number; y: number }, b: { x: number; y: number }, shift = false): Promise<void> {
  const v = await vedere(page);
  const la = await ecran(page, v);
  if (shift) await page.keyboard.down('Shift');
  await trageEcran(page, la(a.x, a.y), la(b.x, b.y));
  if (shift) await page.keyboard.up('Shift');
}

test('uneltele de desen (ADR 0051): fiecare formă prin tragere, tastele, lipirea de un ghidaj, Escape, anularea', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  await expect(page.getByTestId('bara-editare')).toBeVisible();
  await expect(page.locator('[data-unealta="selectie"]')).toHaveAttribute('aria-pressed', 'true');

  // Dreptunghiul, din colț în colț (tasta R); unealta rămâne aleasă.
  await page.keyboard.press('r');
  await expect(page.locator('[data-unealta="dreptunghi"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('panza')).toHaveAttribute('data-desen', '');
  await deseneaza(page, { x: 40, y: 30 }, { x: 140, y: 90 });
  await expect(randuri(page)).toHaveText(['dreptunghi 100.00 × 60.00 la X 40.00, Y 30.00']);
  // Shift: pătrat, în direcția tragerii.
  await deseneaza(page, { x: 170, y: 20 }, { x: 210, y: 45 }, true);
  await expect(randuri(page).nth(1)).toHaveText('dreptunghi 40.00 × 40.00 la X 170.00, Y 20.00');

  // Cercul, din centru (butonul); elipsa, linia și poligonul (tastele); poligonul cu laturile lui.
  await page.locator('[data-unealta="cerc"]').click();
  await deseneaza(page, { x: 230, y: 130 }, { x: 245, y: 130 });
  await expect(randuri(page).nth(2)).toHaveText('cerc R15.00 cu centrul la X 230.00, Y 130.00');
  await page.locator('body').focus();
  await page.keyboard.press('e');
  await deseneaza(page, { x: 20, y: 150 }, { x: 70, y: 175 });
  await page.keyboard.press('l');
  await deseneaza(page, { x: 90, y: 140 }, { x: 120, y: 180 });
  await page.keyboard.press('p');
  await expect(page.locator('[data-editare="laturi"]')).toHaveValue('6');
  await deseneaza(page, { x: 180, y: 165 }, { x: 180, y: 185 });
  await expect(randuri(page)).toHaveCount(6);
  // O tragere prea scurtă nu desenează nimic.
  const v = await vedere(page);
  const la = await ecran(page, v);
  const q = la(60, 110);
  await trageEcran(page, q, { x: q.x + 1, y: q.y + 1 });
  await expect(randuri(page)).toHaveCount(6);

  // Anularea scoate ultima formă, ca orice comandă.
  await page.keyboard.press('Control+z');
  await expect(randuri(page)).toHaveCount(5);

  // Lipirea în timpul desenului: un ghidaj la x = 123, iar marginea trasă la 122,4 se lipește de el.
  const stanga = await centruRigla(page, 'rigla-stanga');
  await trageEcran(page, stanga, { x: la(150, 0).x - 40, y: stanga.y });
  const b = await page.locator('[data-ghidaj]').boundingBox();
  if (!b) throw new Error('ghidajul n-are cutie');
  await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height * 0.55);
  await page.getByTestId('ghidaj-camp').fill('123');
  await page.getByTestId('ghidaj-camp').press('Enter');
  await page.locator('[data-unealta="dreptunghi"]').click();
  await deseneaza(page, { x: 60, y: 105 }, { x: 122.4, y: 118.7 });
  await expect(randuri(page).nth(5)).toHaveText('dreptunghi 63.00 × 13.70 la X 60.00, Y 105.00');
  // Colțul nelipit e rotunjit la 0,001 mm (nu 60,000002661 din pixelii mausului): panoul arată valoarea exactă.
  await expect(page.locator('[data-camp="pozitie-x"]')).toHaveValue('60');
  await expect(page.locator('[data-camp="pozitie-y"]')).toHaveValue('105');

  // Escape întoarce la selecție; un clic alege din nou, nu desenează.
  await page.locator('body').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-unealta="selectie"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('panza')).not.toHaveAttribute('data-desen', '');
  mkdirSync('.tmp', { recursive: true });
  await page.screenshot({ path: '.tmp/desen.png' });
  expect(erori).toEqual([]);
});
