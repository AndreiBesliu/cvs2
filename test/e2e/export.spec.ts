import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { poarta } from '../oracles/poarta.ts';

test.use({ locale: 'ro-RO' });

const faraComentarii = (text: string): string[] => text.split('\n').filter((l) => l !== '' && !l.startsWith('('));

async function exporta(page: Page, origine: string): Promise<{ text: string; afisat: string; nume: string }> {
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('[data-camp="origine"]').selectOption(origine);
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const d = await descarcare;
  const cale = await d.path();
  const text = readFileSync(cale, 'ascii');
  const afisat = (await page.getByTestId('export-stare').textContent()) ?? '';
  await page.getByRole('button', { name: 'Închide' }).click();
  return { text, afisat, nume: d.suggestedFilename() };
}

test('desenul din aplicație iese în G-code: cu originea stânga-jos, exact liniile plăcii 1 A', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-actiune="export.gcode"]')).toBeDisabled();
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  const { text, afisat, nume } = await exporta(page, 'stanga-jos');
  expect(nume).toBe('cncvs2-stanga-jos.nc');
  const aur = readFileSync('test/placi/placa-01/placa-01-A.nc', 'ascii');
  expect(faraComentarii(text)).toEqual(faraComentarii(aur));
  // Hash-ul afișat e chiar al fișierului descărcat.
  const sha = createHash('sha256').update(text, 'ascii').digest('hex');
  expect(afisat).toContain(sha);
  expect(afisat).toContain('34 de linii');
});

test('cu originea dreapta-sus pe foaia de 300 × 200: cotele pe hârtie și poarta trece', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  const { text } = await exporta(page, 'dreapta-sus');
  // Gaura pornește din (82, 50) mm; față de colțul dreapta-sus al foii 300 × 200: (82 − 300, 50 − 200).
  expect(text).toContain('\nG0 X-218.000 Y-150.000\n');
  expect(text).toContain('(origine dreapta-sus, Z0 sus, foaia 300.000 x 200.000 x 18.000 mm)');
  const incalcari = poarta(text, {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'dreapta-sus', z0: 'sus', diametruScula: 6, pas: 4,
    supracursa: 0, asteptareAx: 3, cadru: { minX: 17, maxX: 123, minY: 17, maxY: 83 },
  });
  expect(incalcari).toEqual([]);
});
