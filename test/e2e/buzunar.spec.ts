import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { poarta } from '../oracles/poarta.ts';
import { judeca } from '../oracles/simulare.ts';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

/**
 * Buzunarul (ADR 0069) din fereastra exportului: „buzunar” e încă o tăietură a rândului; pasul lateral apare sub rând, cu
 * 40 % din diametru, judecat față de raza frezei; ce e al profilului se oprește. Programul descărcat golește dreptunghiul
 * (oracolul simulării, pe octeții din browser), iar operația rămâne în proiect.
 */
test('buzunarul din fereastra exportului: dreptunghiul 100 × 60 se golește la 3 mm, iar operația rămâne în proiect', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('tr[data-operatie]').first();
  await rand.locator('[data-camp="latura"]').selectOption('buzunar');
  const pas = page.locator('[data-camp="pas-lateral"]');
  await expect(pas).toHaveValue('2,4');
  for (const camp of ['urechi', 'rampa', 'intrari', 'colturi']) await expect(rand.locator(`[data-camp="${camp}"]`)).toBeDisabled();
  // Peste raza frezei (Ø6): exportul e oprit, cu motivul.
  await pas.fill('3,5');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('pasul lateral');
  await pas.fill('2,4');
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  // Poarta, fără regiune (buzunarul nu e inel): pasul pe trecere, rapidele, cutia centrului (23…117 × 23…77, pe hârtie).
  expect(poarta(text, {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 3, supracursa: 0,
    asteptareAx: 3, avansPlonjare: 300, cadru: { minX: 23, maxX: 117, minY: 23, maxY: 77 },
  })).toEqual([]);
  // Oracolul simulării: în deschiderea dreptunghiului (fără colțurile de rază 3), fundul la −3; în afară, nimic.
  const g = { x0: 10, y0: 10, latime: 120, inaltime: 80, celula: 0.5 };
  const o = judeca(text, g, { tip: 'plata', diametru: 6 });
  let gresite = 0;
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const x = g.x0 + (i + 0.5) * g.celula, y = g.y0 + (j + 0.5) * g.celula;
      const cx = Math.min(Math.max(x, 23), 117), cy = Math.min(Math.max(y, 23), 77);
      const d = Math.hypot(x - cx, y - cy);
      const inauntru = x > 20 && x < 120 && y > 20 && y < 80;
      if (inauntru && Math.abs(d - 3) < 0.05) continue;
      const z = inauntru && d <= 3 ? -3 : 0;
      if (Math.abs((o.z[j * o.nx + i] ?? Number.NaN) - z) > 1e-6) gresite++;
    }
  }
  expect(gresite).toBe(0);
  // Operația a intrat în proiect: la redeschidere, rândul e tot un buzunar, cu pasul lui.
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('tr[data-operatie]').first().locator('[data-camp="latura"]')).toHaveValue('buzunar');
  await expect(page.locator('[data-camp="pas-lateral"]')).toHaveValue('2,4');
});
