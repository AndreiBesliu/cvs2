/**
 * Începutul programului în Rezultat (ADR 0292, felia 28.8↑r): după Exportă, la Fișierele, primele linii ale fiecărui fișier
 * descărcat, până la prima mișcare de tăiere, întocmai; cu Z-ul sigur ales; cu fișiere pe freză, câte un rând strâns pe
 * fișier, primul desfăcut. Blocul stă în afara regiunii care se anunță (`role="status"`), iar liniile se derulează în locul lor.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Download, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';
import { alege } from './ajutor-export.ts';

test.use({ locale: 'ro-RO' });

const text = async (d: Download): Promise<string> => readFileSync((await d.path())!, 'utf8');
/** Liniile programului până la prima mișcare de lucru (G1, G2, G3; postul GRBL scrie comentariile între paranteze). */
const panaLaTaiere = (g: string): string[] => {
  const linii = g.split('\n');
  const k = linii.findIndex((l) => /^G[123] /.test(l.replace(/\(.*?\)/g, '')));
  return linii.slice(0, k + 1);
};
const exporta = async (page: Page, n = 1): Promise<string[]> => {
  const descarcate: Promise<string>[] = [];
  const asculta = (d: Download): void => { descarcate.push(text(d)); };
  page.on('download', asculta);
  await page.locator('[data-buton="exporta"]').click();
  await expect(page.getByTestId('export-stare')).toContainText('Descărcat');
  await expect.poll(() => descarcate.length).toBe(n);
  page.off('download', asculta);
  return Promise.all(descarcate);
};

test('după Exportă, Rezultatul arată începutul fișierului descărcat, până la prima tăiere, cu Z-ul sigur ales', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-inceput]')).toHaveCount(0);
  await page.locator('[data-grup="aer"] [data-camp="z-sigur"]').fill('20');
  const [g] = await exporta(page);
  const fisiere = page.locator('[data-fisa="rezultatul"] [data-rezultat="fisiere"]');
  const inceput = fisiere.locator('[data-inceput]');
  await expect(inceput).toBeVisible();
  // Nu stă în regiunea anunțată: altfel un cititor de ecran ar citi tot începutul la fiecare export.
  await expect(fisiere.locator('[role="status"] [data-inceput], [aria-live] [data-inceput]')).toHaveCount(0);
  const rand = inceput.locator('details');
  await expect(rand).toHaveCount(1);
  await expect(rand).toHaveAttribute('open', '');
  const asteptat = panaLaTaiere(g!);
  await expect(rand.locator('summary')).toHaveText(`cncvs2-stanga-jos.nc · ${asteptat.length} linii, până la prima tăiere`);
  const pre = rand.locator('pre');
  expect((await pre.innerText()).split('\n')).toEqual(asteptat);
  expect(asteptat).toContain('G0 Z20.000');
  expect(asteptat.at(-1)).toMatch(/^G1 /);
  // Liniile se derulează în locul lor, de la tastatură, cu numele lor.
  await expect(pre).toHaveAttribute('tabindex', '0');
  await expect(pre).toHaveAttribute('aria-label', 'Începutul fișierului cncvs2-stanga-jos.nc');
  // Un parametru schimbat face vechi rezultatul: începutul pleacă odată cu el.
  await page.locator('[data-grup="aer"] [data-camp="z-sigur"]').fill('15');
  await expect(page.locator('[data-inceput]')).toHaveCount(0);
});

test('cu fișiere pe freză, câte un rând pe fișier, în ordinea descărcării, primul desfăcut; fiecare, începutul lui', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-fisa="op"][data-operatie="e2/e2"]');
  await rand.locator('[data-camp="scula"]').fill('2');
  await rand.locator('[data-camp="diametru"]').fill('3');
  await alege(page.locator('[data-fisa="masina"]'), 'strategie', 'fisiere-separate');
  const g = await exporta(page, 2);
  const randuri = page.locator('[data-inceput] details');
  await expect(randuri).toHaveCount(2);
  await expect(randuri.nth(0)).toHaveAttribute('open', '');
  await expect(randuri.nth(1)).not.toHaveAttribute('open', '');
  await expect(randuri.nth(1).locator('summary')).toContainText('cncvs2-stanga-jos-2-T1.nc');
  await randuri.nth(1).locator('summary').click();
  // Descărcările vin în ordinea fișierelor: T2 (gaura), apoi T1.
  for (const [k, txt] of g.entries()) {
    expect((await randuri.nth(k).locator('pre').innerText()).split('\n')).toEqual(panaLaTaiere(txt));
  }
  expect(g[1]).toContain('T1');
});
