import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { judeca } from '../oracles/simulare.ts';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

/**
 * Bila și toroidala în fereastra exportului (ADR 0303, felia 16.A↑e-4), pe dreptunghiul tăiat pe linie (canelura): forma se
 * alege pe rând (din 16.A↑e-6, pe orice profil); la toroidală, raza colțului apare (1 mm implicit) și se judecă (peste 0, sub
 * Ø / 2); Exportă scrie forma în document, cu numele după formă (comentariul sculei din program îl poartă), iar fereastra
 * redeschisă o arată. Pe exterior, sub raza colțului, forma rotundă oprește exportul, cu motivul.
 */
test('canelura cu toroidala și cu bila: forma pe rând, raza colțului judecată, Exportă o scrie în proiect', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-fisa="op"]').first();
  const forma = rand.locator('[data-camp="forma-scula"]');
  // Pe exterior (din 16.A↑e-6), toate patru, ca pe linie.
  await expect(forma.locator('option')).toHaveText(['plată', 'în V', 'bilă', 'toroidală']);
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
  // Pe exterior, la 1 mm (sub raza bilei, 3 mm), exportul se oprește, cu motivul și raza în grupul frezei; de la 3 mm, merge.
  await rand.locator('input[data-camp="latura"][value="exterior"]').check();
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('pe o parte (cu adâncimea cel puțin raza colțului)');
  await expect(rand.locator('[data-grup="freza"] [data-greseala]')).toContainText(['cere o adâncime de cel puțin raza colțului (3 mm)']);
  await rand.locator('[data-camp="adancime"]').fill('3');
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
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

/**
 * Profilul pe o parte cu bila și cu toroidala (ADR 0303 §4, felia 16.A↑e-6; întrebarea 2a): pe exterior, la 4 mm, sub adâncime
 * nota peretelui, pe hârtie (bila Ø6: vertical până la 4 − 3 = 1 mm, racordarea de 3 mm; toroidala Ø6 r1: până la 3 mm,
 * racordarea de 1 mm); programul cu bila, simulat de oracol pe octeții din browser: în piesă (dreptunghiul 100 × 60 cu
 * colțul în (20, 20)) nimic tăiat, iar pe fâșia dintre desen și centrul frezei, sub latura de jos, totul tăiat cel puțin până
 * la 1 mm (peretele vertical).
 */
test('profilul pe exterior cu bila: nota peretelui, nimic tăiat în piesă, peretele vertical până la d − ρ', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-fisa="op"]').first();
  const forma = rand.locator('[data-camp="forma-scula"]');
  await rand.locator('[data-camp="adancime"]').fill('4');
  // Cu freza plată, nicio notă a peretelui.
  await expect(rand.locator('[data-nota="perete-rotunda"]')).toHaveCount(0);
  await forma.selectOption('toroidala');
  await expect(rand.locator('[data-nota="perete-rotunda"]')).toHaveText('Peretele e vertical de la față până la 3 mm; la fund rămâne racordarea de rază 1 mm.');
  await forma.selectOption('bila');
  await expect(rand.locator('[data-nota="perete-rotunda"]')).toHaveText('Peretele e vertical de la față până la 1 mm; la fund rămâne racordarea de rază 3 mm.');
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  expect(text).toContain('freza bila D6');
  const g = { x0: 10, y0: 10, latime: 120, inaltime: 80, celula: 0.25 };
  const o = judeca(text, g, { tip: 'bila', diametru: 6 });
  let inPiesa = 0, peFasie = 0, pestePerete = 0, fund = Infinity;
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const x = g.x0 + (i + 0.5) * g.celula, y = g.y0 + (j + 0.5) * g.celula, z = o.z[j * o.nx + i]!;
      fund = Math.min(fund, z);
      if (x > 20.1 && x < 119.9 && y > 20.1 && y < 79.9 && z < -1e-9) inPiesa++;
      // Sub latura de jos, între desen (y = 20) și centrul frezei (y = 17), departe de colțuri.
      if (x > 30 && x < 110 && y > 17.1 && y < 19.9) {
        peFasie++;
        if (z > -1 + 0.01) pestePerete++;
      }
    }
  }
  expect(inPiesa).toBe(0);
  expect(peFasie).toBeGreaterThan(3000);
  expect(pestePerete).toBe(0);
  expect(fund).toBeGreaterThan(-4 - 0.01);
  expect(fund).toBeLessThan(-4 + 0.01);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
