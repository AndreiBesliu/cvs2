import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { judeca } from '../oracles/simulare.ts';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

/**
 * Bila și toroidala în fereastra exportului (ADR 0303, felia 16.A↑e-4), pe dreptunghiul tăiat pe linie (canelura): forma se
 * alege pe rând doar pe linie; la toroidală, raza colțului apare (1 mm implicit) și se judecă (peste 0, sub Ø / 2); Exportă
 * scrie forma în document, cu numele după formă (comentariul sculei din program îl poartă), iar fereastra redeschisă o
 * arată. Pe exterior, forma rotundă oprește exportul, cu motivul.
 */
test('canelura cu toroidala și cu bila: forma pe rând, raza colțului judecată, Exportă o scrie în proiect', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-fisa="op"]').first();
  const forma = rand.locator('[data-camp="forma-scula"]');
  // Pe exterior: doar plata și V-ul.
  await expect(forma.locator('option')).toHaveText(['plată', 'în V']);
  await rand.locator('input[data-camp="latura"][value="pe-linie"]').check();
  await expect(forma.locator('option')).toHaveText(['plată', 'în V', 'bilă', 'toroidală']);
  // Toroidala: raza colțului, 1 mm implicit; cât jumătatea diametrului (3 mm la Ø6) nu trece.
  await forma.selectOption('toroidala');
  const raza = rand.locator('[data-camp="raza-colt"]');
  await expect(raza).toHaveValue('1');
  await raza.fill('3');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('o rază a colțului peste 0');
  await expect(rand.locator('[data-grup="freza"] [data-greseala]')).toContainText(['Raza colțului: scrie un număr peste 0 și sub jumătatea diametrului (3 mm).']);
  await raza.fill('1,5');
  await rand.locator('[data-camp="adancime"]').fill('1');
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  let descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  let text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  expect(text).toContain('freza toroidala r1.5 D6');
  // Redeschisă, fereastra arată freza scrisă.
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-fisa="op"]')).toHaveCount(0);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(forma).toHaveValue('toroidala');
  await expect(raza).toHaveValue('1,5');
  // Bila: raza dispare; Exportă scrie bila.
  await forma.selectOption('bila');
  await expect(raza).toHaveCount(0);
  descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  text = readFileSync(await (await descarcare).path(), 'ascii');
  expect(text).toContain('freza bila D6');
  // Pe exterior, bila oprește exportul, cu motivul (lucrarea o taie doar pe linie).
  await rand.locator('input[data-camp="latura"][value="exterior"]').check();
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('taie deocamdată pe linie (canelura) și în buzunar');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

/**
 * Buzunarul cu bila și cu toroidala (ADR 0303 §4, felia 16.A↑e-5): forma se alege și pe un buzunar; sub pasul lateral, creasta
 * de pe fund, pe hârtie (bila Ø6, s = 2,4: 3 − √(9 − 1,44) = 0,25 între inele, cel mult 3 − √(9 − 5,76) = 1,2); cu o freză de
 * rest, exportul se oprește, cu motivul; fără ea, programul golește dreptunghiul cu bila (oracolul simulării, pe octeții din
 * browser): în zona centrului, fundul la cel mult 1,2 deasupra; dincolo de desen, nimic tăiat.
 */
test('buzunarul cu bila: creasta lângă pasul lateral, refuzul cu o freză de rest, fundul simulat sub creastă', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-fisa="op"]').first();
  await rand.locator('input[data-camp="latura"][value="buzunar"]').check();
  const forma = rand.locator('[data-camp="forma-scula"]');
  await expect(forma.locator('option')).toHaveText(['plată', 'în V', 'bilă', 'toroidală']);
  // Cu freza plată, nicio notă a crestei.
  await expect(rand.locator('[data-nota="creasta-buzunar"]')).toHaveCount(0);
  await forma.selectOption('bila');
  await expect(rand.locator('[data-nota="creasta-buzunar"]')).toHaveText('Creasta pe fund: 0,25 mm între inele, cel mult 1,2 mm (pe colțurile inelelor și pe mijloc).');
  // Toroidala Ø6 r1 (a = 2), s = 2,4: între inele 1,2 ≤ a, deci 0; cel mult 1 − √(1 − 0,16) = 0,083.
  await forma.selectOption('toroidala');
  await expect(rand.locator('[data-nota="creasta-buzunar"]')).toHaveText('Creasta pe fund: 0 mm între inele, cel mult 0,083 mm (pe colțurile inelelor și pe mijloc).');
  await forma.selectOption('bila');
  // O freză de rest: exportul se oprește, cu motivul.
  await rand.locator('[data-camp="rest-adauga"]').click();
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('fără freze de rest');
  await rand.locator('[data-camp="rest-scoate"]').first().click();
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  expect(text).toContain('freza bila D6');
  // Oracolul simulării, cu silueta bilei: dreptunghiul 100 × 60 cu colțul în (20, 20), adâncimea implicită a buzunarului.
  const g = { x0: 10, y0: 10, latime: 120, inaltime: 80, celula: 0.25 };
  const o = judeca(text, g, { tip: 'bila', diametru: 6 });
  let fund = Infinity, zona = -Infinity, afara = 0;
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const x = g.x0 + (i + 0.5) * g.celula, y = g.y0 + (j + 0.5) * g.celula, z = o.z[j * o.nx + i]!;
      fund = Math.min(fund, z);
      if (x > 23 && x < 117 && y > 23 && y < 77) zona = Math.max(zona, z);
      if ((x < 19.9 || x > 120.1 || y < 19.9 || y > 80.1) && z < -1e-9) afara++;
    }
  }
  expect(afara).toBe(0);
  // Cel mai înalt punct al zonei centrului e cel mult h(s) = 1,2 deasupra fundului (cu marja de eșantionare a celulei).
  expect(zona - fund).toBeLessThanOrEqual(1.2 + 0.05);
  expect(zona - fund).toBeGreaterThan(0.2);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
