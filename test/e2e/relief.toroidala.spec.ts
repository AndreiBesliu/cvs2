import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { importaRelief, rolFinisare } from './ajutor-relief.ts';

/**
 * Finisarea reliefului cu freza toroidală (felia 18.1↑e, ADR 0319; ADR 0303 §4, răspunsul 4a), în Edge: imaginea de 64 × 32 px,
 * relief la 1 mm pe celulă, cu rolul „finisarea reliefului”. În Tăierea, forma toroidală aduce raza colțului (1 mm implicit la
 * Ø6, judecată în (0, Ø / 2)); în fereastra exportului, rândul finisării o poartă: forma, raza colțului cu greșeala ei, desenul
 * frezei cu cota razei, creasta pe plan a toroidalei (ρ − √(ρ² − ((s − 2a) / 2)²)), iar Exportă scrie freza în proiect și o
 * taie: comentariul sculei din program îi poartă numele.
 */
test.use({ locale: 'ro-RO' });

test('toroidala pe finisarea reliefului: Tăierea, rândul din fereastra exportului, creasta, Exportă o scrie și o taie', async ({ page }) => {
  await page.goto('/');
  await importaRelief(page);
  await rolFinisare(page);
  // Tăierea: forma toroidală, cu raza colțului.
  const forma = page.locator('[data-camp="fin-forma"]');
  await expect(forma.locator('option[value="toroidala"]')).toHaveText('toroidală');
  await forma.selectOption('toroidala');
  const razaPanou = page.locator('[data-camp="fin-raza-colt"]');
  await expect(razaPanou).toHaveValue('1');
  await razaPanou.fill('1,5');
  await razaPanou.press('Enter');
  await expect(razaPanou).toHaveValue('1,5');

  await page.locator('[data-actiune="export.gcode"]').click();
  const randFin = page.locator('[data-nav-op][data-fel="finisare"]'), fin = page.locator('[data-fisa="op"][data-fel="finisare"]');
  await randFin.locator('[data-nav]').click();
  await expect(randFin).toContainText('toroidală r1,5');
  const formaRand = fin.locator('[data-camp="relief-forma"]'), raza = fin.locator('[data-camp="relief-raza-colt"]');
  await expect(formaRand).toHaveValue('toroidala');
  await expect(raza).toHaveValue('1,5');
  // Creasta pe plan, la pasul 4 (4 celule de 1 mm): a = 3 − 1,5, deci 1,5 − √(2,25 − 0,25) = 0,0858 mm; la pasul 3 (cât 2a), 0.
  await fin.locator('[data-camp="relief-pas-lateral"]').fill('4');
  await expect(fin.locator('[data-finisare="creasta"]')).toContainText('0,086 mm');
  await fin.locator('[data-camp="relief-pas-lateral"]').fill('3');
  await expect(fin.locator('[data-finisare="creasta"]')).toContainText(' 0 mm');
  // Desenul frezei: capătul rotund, cu cota razei colțului aprinsă pe câmpul ei.
  await raza.focus();
  await expect(fin.locator('[data-grup="freza-relief"] [data-desen] svg [data-cota="raza-colt"]')).toHaveAttribute('data-aprinsa', '');
  // Raza colțului cât jumătatea diametrului: greșeala în grupul frezei, Exportă oprit.
  await raza.fill('3');
  await expect(fin.locator('[data-grup="freza-relief"] [data-greseala]')).toContainText(['Raza colțului: scrie un număr peste 0 și sub jumătatea diametrului (3 mm).']);
  await expect(raza).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  // Raza 1,2 (scrisă aici): Exportă o scrie în proiect și o taie.
  await raza.fill('1,2');
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  expect(text).toContain('freza toroidala r1.2 D6');
  expect(text).toMatch(/^G1 /mu);
  // Închisă, Tăierea arată raza scrisă; redeschisă, fereastra la fel.
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-fisa="op"]')).toHaveCount(0);
  await expect(forma).toHaveValue('toroidala');
  await expect(razaPanou).toHaveValue('1,2');
  await page.locator('[data-actiune="export.gcode"]').click();
  await randFin.locator('[data-nav]').click();
  await expect(raza).toHaveValue('1,2');
  // Bila, aleasă în fereastră: raza colțului dispare.
  await formaRand.selectOption('bila');
  await expect(raza).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
