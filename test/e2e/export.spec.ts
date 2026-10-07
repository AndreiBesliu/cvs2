import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { poarta, type ContextPoarta } from '../oracles/poarta.ts';
import { ecran, vedere } from './ajutor-panza.ts';

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

test('freza iese din foaie: avertismentul stă în bara de jos, iar exportul cere confirmarea și o scrie în antet', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await expect(page.getByTestId('avertisment')).toHaveCount(0);
  // Dreptunghiul (20…120 × 20…80 mm), tras cu 40 mm spre stânga: iese cu ~20 mm din foaie.
  const v = await vedere(page);
  const la = await ecran(page, v);
  const a = la(70, 50);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x - 20 * v.scara, a.y, { steps: 4 });
  await page.mouse.move(a.x - 40 * v.scara, a.y, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByTestId('avertisment')).toHaveCount(1);
  await expect(page.getByTestId('avertisment')).toContainText('iese din foaie');
  const stare = (await page.getByTestId('selectie').textContent()) ?? '';
  const x = Number(/la X (-?\d+\.\d+)/.exec(stare)?.[1]);
  expect(x).toBeLessThan(0);

  // Fără confirmare: nimic descărcat, butonul blocat.
  let descarcari = 0;
  page.on('download', () => { descarcari++; });
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('[data-buton="exporta"]').click();
  const bloc = page.getByTestId('iesire-foaie');
  await expect(bloc).toContainText('Freza iese din foaie:');
  await expect(bloc).toContainText('mm la stânga');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  // Un parametru schimbat ia înapoi confirmarea: blocul dispare, iar exportul următor întreabă din nou, nebifat.
  await page.locator('[data-camp="confirma-iesire"]').check();
  await page.locator('[data-camp="origine"]').selectOption('dreapta-sus');
  await expect(bloc).toHaveCount(0);
  await page.locator('[data-buton="exporta"]').click();
  await expect(bloc).toBeVisible();
  await expect(page.locator('[data-camp="confirma-iesire"]')).not.toBeChecked();
  expect(descarcari).toBe(0);

  // Confirmat: se descarcă, cu declarația în antet.
  await page.locator('[data-camp="confirma-iesire"]').check();
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await d).path(), 'ascii');
  expect(descarcari).toBe(1);
  expect(text).toContain('\n(CONFIRMAT: freza iese din foaie)\n');
  const m = /\n\(iesire mm: st (\d+\.\d{3}) dr 0\.000 jos 0\.000 sus 0\.000\)\n/.exec(text);
  expect(m).not.toBeNull();
  // Pe hârtie: latura stângă a dreptunghiului la X = x, centrul frezei la x − 3, marginea discului la x − 6.
  expect(Math.abs(Number(m?.[1]) - (6 - x))).toBeLessThanOrEqual(0.006);
  // Oracolul independent: programul declarat trece poarta; același program fără declarație e prins de invarianta 5.
  const ctx: ContextPoarta = {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'dreapta-sus', z0: 'sus', diametruScula: 6, pas: 4,
    supracursa: 0, asteptareAx: 3,
  };
  expect(poarta(text, ctx)).toEqual([]);
  const fara = text.split('\n').filter((l) => !l.startsWith('(CONFIRMAT') && !l.startsWith('(iesire mm')).join('\n');
  expect(poarta(fara, ctx).map((i) => i.invarianta)).toContain(5);
});
