import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { judeca } from '../oracles/simulare.ts';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

/**
 * Gravarea pe linie cu freza de gravare (ADR 0092), din fereastra exportului, pe dreptunghiul 100 × 60 (20…120 × 20…80): freza
 * în V pe exterior oprește exportul, cu motivul (înainte trecea, decalată ca o freză plată); pe linie, cu vârful 0,25 la 30°,
 * Ø3,175, 1 mm, direcția „invers”: programul descărcat, judecat de oracolul simulării (freza ca sculă de profil, conul
 * trunchiat), are canalul de 0,25 + 2·tan 15° = 0,786 mm cu centrul pe latura x = 20; panoul spune freza cu vârful, iar
 * fereastra redeschisă păstrează vârful și direcția.
 */
test('gravarea pe linie cu freza de gravare: V pe exterior refuzat; pe linie, cu vârful și direcția, canalul pe oracol și operația în proiect', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('tr[data-operatie]').first();
  // Freza în V pe exterior (latura implicită): oprit, cu motivul.
  await rand.locator('[data-camp="forma-scula"]').selectOption('v');
  await expect(rand.locator('[data-camp="varf-v"]')).toHaveValue('0');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('Freza în V taie pe linie sau într-un V-carve');
  await expect(rand.locator('[data-camp="directie"]')).toHaveCount(0);
  // Pe linie: direcția apare, cu „ca desenul”.
  await rand.locator('[data-camp="latura"]').selectOption('pe-linie');
  const directie = rand.locator('[data-camp="directie"]');
  await expect(directie).toHaveValue('');
  await directie.selectOption('invers');
  // Vârful: cât diametrul nu trece.
  await rand.locator('[data-camp="diametru"]').fill('3,175');
  await rand.locator('[data-camp="unghi-v"]').fill('30');
  const varf = rand.locator('[data-camp="varf-v"]');
  await varf.fill('3,175');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('Vârful frezei în V');
  await varf.fill('0,25');
  await rand.locator('[data-camp="adancime"]').fill('1');
  await rand.locator('[data-camp="pas"]').fill('1');
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  // Oracolul, cu conul trunchiat ca profil: pe rândul y = 50, canalul laturii x = 20.
  const R = 3.175 / 2, a = 0.125, cot = 1 / Math.tan(Math.PI / 12);
  const g = { x0: 19, y0: 49.9, latime: 2, inaltime: 0.2, celula: 0.005 };
  const o = judeca(text, g, { tip: 'profil', diametru: 3.175, puncte: [[0, 0], [a, 0], [R, (R - a) * cot]] });
  let n = 0, s = 0, zMin = 0;
  for (let i = 0; i < o.nx; i++) {
    const z = o.z[20 * o.nx + i] ?? Number.NaN;
    if (z < -1e-4) { n++; s += g.x0 + (i + 0.5) * g.celula; }
    zMin = Math.min(zMin, z);
  }
  expect(Math.abs(n * g.celula - (0.25 + 2 * Math.tan(Math.PI / 12)))).toBeLessThanOrEqual(0.02);
  expect(Math.abs(s / n - 20)).toBeLessThanOrEqual(0.01);
  expect(Math.abs(zMin + 1)).toBeLessThanOrEqual(1e-6);
  // În proiect: panoul spune freza cu vârful și direcția; fereastra redeschisă le păstrează.
  await page.getByRole('button', { name: 'Închide' }).click();
  const panou = page.locator('[data-panou="proprietati"]');
  if ((await panou.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  await expect(panou).toContainText('T1, V 30° cu vârful de 0.25 mm, Ø3.175 mm');
  await expect(panou).toContainText('invers');
  await page.locator('[data-actiune="export.gcode"]').click();
  const din = page.locator('tr[data-operatie]').first();
  await expect(din.locator('[data-camp="latura"]')).toHaveValue('pe-linie');
  await expect(din.locator('[data-camp="varf-v"]')).toHaveValue('0,25');
  await expect(din.locator('[data-camp="directie"]')).toHaveValue('invers');
});
