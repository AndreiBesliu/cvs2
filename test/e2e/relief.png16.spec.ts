import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { citestePng } from '../../src/relief/png16.ts';
import { importaRelief } from './ajutor-relief.ts';

/**
 * Relieful ca imagine pe 16 biți, dus și întors, în aplicația construită (ADR 0322, felia 18.1↑g): relieful de 64 × 32 mm
 * (stânga la 5 mm, dreapta la 0) exportat din panou ca PNG gri pe 16 biți (cu Z-ul și celula în fișier), reimportat cu „Z-ul și
 * celula din fișier” (aceeași grilă, aceleași înălțimi), apoi exportat din nou: aceiași octeți.
 */

test.use({ locale: 'ro-RO' });

async function exportaPng(page: Page): Promise<{ readonly nume: string; readonly octeti: Buffer }> {
  const [d] = await Promise.all([page.waitForEvent('download'), page.locator('[data-buton="relief-png"]').click()]);
  const cale = await d.path();
  return { nume: d.suggestedFilename(), octeti: readFileSync(cale) };
}

test('relieful spre PNG pe 16 biți și înapoi: Z-ul și celula din fișier, apoi aceiași octeți la al doilea export', async ({ page }) => {
  await page.goto('/');
  await importaRelief(page);
  await expect(page.locator('[data-buton="relief-png"]')).toBeEnabled();
  const dus = await exportaPng(page);
  expect(dus.nume).toBe('jumatati-16bit.png');
  const p = await citestePng(new Uint8Array(dus.octeti));
  if ('eroare' in p) throw new Error(p.eroare);
  expect([p.latime, p.inaltime, p.adancime, p.pixeliPeMetru]).toEqual([64, 32, 16, 1000]);
  const m = JSON.parse(p.text['cncvs2-relief'] ?? '{}') as { v: number; zMin: number; zMax: number; celula: number };
  expect([m.v, m.celula]).toEqual([1, 1]);
  expect(Math.abs(m.zMax - 5)).toBeLessThan(1e-3);
  // Stânga (albul) la 65 535, dreapta la 0.
  expect(Math.round(p.rgba[0]! * 65535 / 255)).toBe(65535);
  expect(Math.round(p.rgba[4 * 63]! * 65535 / 255)).toBe(0);

  // Înapoi: fișierul descărcat, adus prin „Importă…” ca relief, cu Z-ul din fișier (implicit).
  await page.locator('[data-camp="fisier-svg"]').setInputFiles({ name: dus.nume, mimeType: 'image/png', buffer: dus.octeti });
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.getByTestId('import-rezultat').locator('label').filter({ has: page.locator('[data-camp="import-rezultat-relief"]') }).click();
  await expect(page.locator('[data-camp="relief-z-fisier"]')).toBeChecked();
  await expect(page.getByTestId('relief-grila')).toHaveText('Grila: 64 × 32 celule de 1 mm (o celulă pe pixel); relieful are 64 × 32 mm.');
  await expect(page.getByTestId('relief-z')).toHaveText('Înălțimile: de la 0 la 5 mm.');
  // Cu Z-ul din fișier, înălțimea ferestrei nu contează; fără el, da.
  await page.locator('[data-camp="relief-inaltime"]').fill('2');
  await page.locator('[data-camp="relief-inaltime"]').press('Enter');
  await expect(page.getByTestId('relief-z')).toHaveText('Înălțimile: de la 0 la 5 mm.');
  await page.locator('[data-camp="relief-z-fisier"]').uncheck();
  await expect(page.getByTestId('relief-z')).toHaveText('Înălțimile: de la 0 la 2 mm.');
  await page.locator('[data-camp="relief-z-fisier"]').check();
  await expect(page.getByTestId('relief-z')).toHaveText('Înălțimile: de la 0 la 5 mm.');
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('prop-relief')).toBeVisible();
  // Punctul fix: relieful întors, exportat din nou, dă aceiași octeți.
  const intors = await exportaPng(page);
  expect(intors.nume).toBe('jumatati-16bit.png');
  expect(intors.octeti.equals(dus.octeti)).toBe(true);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
