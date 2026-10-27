import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { judeca } from '../oracles/simulare.ts';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

/**
 * Frezele de rest (ADR 0093) din fereastra exportului, pe dreptunghiul 100 × 60 (20…120 × 20…80): buzunarul cu Ø12 (pasul
 * 4,8), 10 mm în două treceri; „Adaugă o freză de rest” pune T2 Ø6 (jumătate); una cât freza rândului oprește exportul, cu
 * motivul; cu Ø3 (pasul 1,2), programul descărcat, judecat de oracolul simulării pe sculă (tăiat la `T… M6`), are fundul la
 * −10 în afara colțurilor R1,5, iar Ø3 scoate doar în colțuri. Panoul o spune; fereastra redeschisă o păstrează.
 */
test('frezele de rest: Ø12, apoi Ø3, din fereastra exportului; fundul plat, Ø3 doar în colțuri, pe oracol; în proiect', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('tr[data-operatie]').first();
  await rand.locator('[data-camp="latura"]').selectOption('buzunar');
  await rand.locator('[data-camp="diametru"]').fill('12');
  await rand.locator('[data-camp="adancime"]').fill('10');
  await rand.locator('[data-camp="pas"]').fill('5');
  await page.locator('[data-camp="pas-lateral"]').fill('4,8');
  await page.locator('[data-camp="rest-adauga"]').click();
  const r0 = page.locator('[data-rest-rand="0"]');
  await expect(r0.locator('[data-camp="rest-scula"]')).toHaveValue('2');
  await expect(r0.locator('[data-camp="rest-diametru"]')).toHaveValue('6');
  await expect(r0.locator('[data-camp="rest-pas"]')).toHaveValue('2,4');
  // Una cât freza rândului: oprit, cu motivul.
  await r0.locator('[data-camp="rest-diametru"]').fill('12');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('Frezele de rest');
  await r0.locator('[data-camp="rest-diametru"]').fill('3');
  await r0.locator('[data-camp="rest-pas"]').fill('1,2');
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  const piese = text.split(/^T\d+ M6$/m);
  expect(piese.length).toBe(2);
  const g = { x0: 19, y0: 19, latime: 102, inaltime: 62, celula: 0.25 };
  const o12 = judeca(piese[0]!, g, { tip: 'plata', diametru: 12 }), o3 = judeca(piese[1]!, g, { tip: 'plata', diametru: 3 });
  /** În colțul pe care o freză de raza r nu-l atinge (pe hârtie). */
  const colt = (x: number, y: number, r: number): boolean => {
    const cx = Math.min(x - 20, 120 - x), cy = Math.min(y - 20, 80 - y);
    return cx < r && cy < r && Math.hypot(r - cx, r - cy) > r;
  };
  let neplane = 0, afara = 0, inA12 = 0;
  for (let j = 0; j < o12.ny; j++) {
    for (let i = 0; i < o12.nx; i++) {
      const x = g.x0 + (i + 0.5) * g.celula, y = g.y0 + (j + 0.5) * g.celula, k = j * o12.nx + i;
      const z = Math.min(o12.z[k] ?? 0, o3.z[k] ?? 0);
      if (!(x > 20 && x < 120 && y > 20 && y < 80)) { if (z < -1e-6) afara++; continue; }
      if (!colt(x, y, 1.5) && Math.abs(z + 10) > 0.02) neplane++;
      if ((o3.z[k] ?? 0) < (o12.z[k] ?? 0) - 1e-6 && !colt(x, y, 6)) inA12++;
    }
  }
  expect({ neplane, afara, inA12 }).toEqual({ neplane: 0, afara: 0, inA12: 0 });
  // În proiect: panoul și fereastra redeschisă.
  await page.getByRole('button', { name: 'Închide' }).click();
  const panou = page.locator('[data-panou="proprietati"]');
  if ((await panou.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  await expect(panou).toContainText('T2, Ø3.00 mm, pasul lateral 1.20 mm');
  await page.locator('[data-actiune="export.gcode"]').click();
  const din = page.locator('[data-rest-rand="0"]');
  await expect(din.locator('[data-camp="rest-diametru"]')).toHaveValue('3');
  await expect(din.locator('[data-camp="rest-pas"]')).toHaveValue('1,2');
  // Scoasă cu ×, lista e goală.
  await din.locator('[data-camp="rest-scoate"]').click();
  await expect(page.locator('[data-rest-rand]')).toHaveCount(0);
});
