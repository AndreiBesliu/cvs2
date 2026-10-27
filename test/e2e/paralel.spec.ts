import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { judeca } from '../oracles/simulare.ts';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

/**
 * Strategia paralelă a buzunarului (ADR 0094) din fereastra exportului, pe dreptunghiul 100 × 60 (20…120 × 20…80): buzunarul cu
 * Ø12 (pasul 4,8), 10 mm în două treceri, „linii paralele” la 30°: coborârea dispare (liniile coboară prin plonjare); un unghi
 * de 180° oprește exportul, cu motivul. Programul descărcat, judecat de oracolul simulării: fundul la −10 în afara colțurilor R6,
 * nimic în afară. Panoul spune strategia; fereastra redeschisă o păstrează.
 */
test('strategia paralelă din fereastra exportului: liniile la 30°, fundul plat pe oracol, peretele pe vector; în proiect', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('tr[data-operatie]').first();
  await rand.locator('[data-camp="latura"]').selectOption('buzunar');
  await rand.locator('[data-camp="diametru"]').fill('12');
  await rand.locator('[data-camp="adancime"]').fill('10');
  await rand.locator('[data-camp="pas"]').fill('5');
  await page.locator('[data-camp="pas-lateral"]').fill('4,8');
  await expect(page.locator('[data-camp="coborare"]')).toBeVisible();
  await page.locator('[data-camp="strategie"]').selectOption('paralel');
  await expect(page.locator('[data-camp="coborare"]')).toHaveCount(0);
  const unghi = page.locator('[data-camp="unghi-paralel"]');
  await expect(unghi).toHaveValue('0');
  await unghi.fill('180');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('Unghiul liniilor paralele');
  await unghi.fill('30');
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  const g = { x0: 19, y0: 19, latime: 102, inaltime: 62, celula: 0.25 };
  const o = judeca(text, g, { tip: 'plata', diametru: 12 });
  let neplane = 0, afara = 0;
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const x = g.x0 + (i + 0.5) * g.celula, y = g.y0 + (j + 0.5) * g.celula, z = o.z[j * o.nx + i] ?? 0;
      if (!(x > 20 && x < 120 && y > 20 && y < 80)) { if (z < -1e-6) afara++; continue; }
      const cx = Math.min(x - 20, 120 - x), cy = Math.min(y - 20, 80 - y);
      const colt = cx < 6 && cy < 6 && Math.hypot(6 - cx, 6 - cy) > 6;
      if (!colt && Math.abs(z + 10) > 0.02) neplane++;
    }
  }
  expect({ neplane, afara }).toEqual({ neplane: 0, afara: 0 });
  await page.getByRole('button', { name: 'Închide' }).click();
  const panou = page.locator('[data-panou="proprietati"]');
  if ((await panou.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  await expect(panou).toContainText('linii paralele la 30°');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-camp="strategie"]')).toHaveValue('paralel');
  await expect(page.locator('[data-camp="unghi-paralel"]')).toHaveValue('30');
});
