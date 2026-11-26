/**
 * Z-ul sigur, parcarea și valorile frezei scrise de mână în fereastra exportului (ADR 0291 §3, 3a; felia 28.8↑p): în „Mașina și
 * fișierul”, Z-ul sigur (implicit 5 mm) și locul de la final (rămâne sus, la XY0, într-un punct); în grupul Freza, pe o freză
 * scrisă de mână, turația, avansul și plonjarea (goale: cele ale lucrării). Valorile greșite opresc exportul, cu greșeala în
 * grupul lor; programul descărcat le poartă; Z-ul sigur și parcarea rămân ale aplicației, valorile frezei intră în proiect.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Download, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';
import { alege, aleasa } from './ajutor-export.ts';

test.use({ locale: 'ro-RO' });

const text = async (d: Download): Promise<string> => readFileSync((await d.path())!, 'utf8');
const exporta = async (page: Page): Promise<string> => {
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  return text(await d);
};
const inchide = (page: Page): Promise<void> => page.locator('.dialog-export .butoane button', { hasText: /^Închide$/ }).click();
/** Liniile de după ultimul `M5`: parcarea, dacă e, apoi finalul controlerului. */
const dupaM5 = (g: string): string[] => {
  const l = g.trimEnd().split('\n');
  return l.slice(l.lastIndexOf('M5') + 1);
};

test('Z-ul sigur și parcarea: greșelile opresc exportul; programul le poartă; rămân de la o fereastră la alta', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const aer = page.locator('[data-grup="aer"]');
  const z = aer.locator('[data-camp="z-sigur"]');
  await expect(z).toHaveValue('5');
  await expect(aleasa(aer, 'parcare')).toHaveValue('nu');
  await expect(aer.locator('[data-camp="parcare-x"]')).toHaveCount(0);
  // Implicit: programul de dinainte, fără parcare.
  const azi = await exporta(page);
  expect(azi).toMatch(/^G0 Z5\.000$/m);
  expect(dupaM5(azi)).toEqual(['M30']);
  // Un Z sigur sub 1 mm: Exportă oprit, greșeala în grupul ei, punctul pe „Mașina și fișierul”.
  await z.fill('0,5');
  await expect(z).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(aer.locator('[data-greseala]')).toContainText('între 1 și 100 mm');
  await expect(page.locator('[data-nav="masina"]')).toHaveAttribute('data-gresit', '');
  await z.fill('20');
  // Într-un punct: X și Y față de XY0, cu minus și virgulă; un X peste 10 000 mm e greșit.
  await alege(aer, 'parcare', 'punct');
  await aer.locator('[data-camp="parcare-x"]').fill('-10500');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(aer.locator('[data-greseala]')).toContainText('cel mult 10000 mm de XY0');
  await aer.locator('[data-camp="parcare-x"]').fill('-10');
  await aer.locator('[data-camp="parcare-y"]').fill('250,5');
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  const g = await exporta(page);
  expect(g).toMatch(/^G0 Z20\.000$/m);
  expect(g).not.toMatch(/Z5\.000/);
  // Freza urcă la Z-ul sigur, axul se oprește, apoi pleacă în punctul ales; liniile de dinainte, neschimbate.
  expect(dupaM5(g)).toEqual(['G0 X-10.000 Y250.500', 'M30']);
  expect(g.replaceAll('Z20.000', 'Z5.000').replace('G0 X-10.000 Y250.500\n', '')).toBe(azi);
  // Închisă și deschisă din nou, fereastra le ține (ale aplicației, ca supracursa).
  await inchide(page);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-camp="z-sigur"]')).toHaveValue('20');
  await expect(aleasa(page.locator('[data-grup="aer"]'), 'parcare')).toHaveValue('punct');
  await expect(page.locator('[data-camp="parcare-y"]')).toHaveValue('250,5');
  // La XY0: punctul (0, 0) al programului.
  await alege(page.locator('[data-grup="aer"]'), 'parcare', 'origine');
  expect(dupaM5(await exporta(page))).toEqual(['G0 X0.000 Y0.000', 'M30']);
});

test('turația, avansul și plonjarea pe o freză scrisă de mână: goale, cele ale lucrării; scrise, în program și în proiect', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const fisa = page.locator('[data-fisa="op"]').first();
  const turatie = fisa.locator('[data-camp="turatie"]'), avans = fisa.locator('[data-camp="avans"]'), plonjare = fisa.locator('[data-camp="plonjare"]');
  // Scrisă de mână: un rând strâns, care spune valorile lucrării; desfăcut, câmpurile goale, cu valorile arătate în ele.
  const regim = fisa.locator('[data-regim]');
  await expect(regim.locator('summary')).toHaveText('Turația, avansul și plonjarea: ale lucrării (18.000 rot/min, 1.000 și 300 mm/min)');
  await expect(turatie).toBeHidden();
  await regim.locator('summary').click();
  await expect(turatie).toHaveValue('');
  await expect(turatie).toHaveAttribute('placeholder', '18.000');
  await expect(avans).toHaveAttribute('placeholder', '1.000');
  await expect(plonjare).toHaveAttribute('placeholder', '300');
  // O turație cu zecimale e greșită: pe câmp și în grupul Freza; Exportă oprit.
  await turatie.fill('16000,5');
  await expect(turatie).toHaveAttribute('aria-invalid', 'true');
  await expect(fisa.locator('[data-grup="freza"] [data-greseala]')).toContainText('Turația: scrie un număr întreg de la 1 la 100000');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(regim.locator('summary')).toHaveText('Turația, avansul și plonjarea: o valoare e greșită');
  // Strâns la loc: „Du-mă la …” îl desface și pune focusul pe câmpul greșit.
  await regim.locator('summary').click();
  await expect(turatie).toBeHidden();
  await page.locator('[data-camp="origine"]').focus();
  await page.locator('[data-du="e1/e1"]').click();
  await expect(turatie).toBeVisible();
  await expect(turatie).toBeFocused();
  await turatie.fill('16000');
  await avans.fill('800');
  await expect(regim.locator('summary')).toHaveText('Turația, avansul și plonjarea: 16.000 rot/min, 800 și 300 mm/min');
  const g = await exporta(page);
  expect(g).toMatch(/^M3 S16000$/m);
  expect(g).toMatch(/ F800\.0$/m);
  // Plonjarea, goală, e cea a lucrării.
  expect(g).toMatch(/^G1 Z-\d+\.\d+ F300\.0$/m);
  expect(g).not.toMatch(/S18000|F1000\.0/);
  // Scrise în proiect: deschisă din nou, fereastra le arată pe toate trei.
  await inchide(page);
  await page.locator('[data-actiune="export.gcode"]').click();
  const din = page.locator('[data-fisa="op"]').first();
  // Strâns din nou, rezumatul le spune; desfăcut, câmpurile le au.
  await expect(din.locator('[data-regim] summary')).toHaveText('Turația, avansul și plonjarea: 16.000 rot/min, 800 și 300 mm/min');
  await din.locator('[data-regim] summary').click();
  await expect(din.locator('[data-camp="turatie"]')).toHaveValue('16000');
  await expect(din.locator('[data-camp="avans"]')).toHaveValue('800');
  await expect(din.locator('[data-camp="plonjare"]')).toHaveValue('300');
  // O freză din bibliotecă își are valorile ei: câmpurile nu mai apar.
  await din.locator('[data-camp="freza-biblioteca"]').selectOption({ label: 'Plată Ø12' });
  await expect(din.locator('[data-regim]')).toHaveCount(0);
  await din.locator('[data-camp="freza-biblioteca"]').selectOption({ value: '' });
  await expect(din.locator('[data-regim]')).toHaveCount(1);
  if (!(await din.locator('[data-camp="turatie"]').isVisible())) await din.locator('[data-regim] summary').click();
  // Golite toate, programul e iar cel al lucrării.
  for (const c of ['turatie', 'avans', 'plonjare']) await din.locator(`[data-camp="${c}"]`).fill('');
  const h = await exporta(page);
  expect(h).toMatch(/^M3 S18000$/m);
  expect(h).not.toMatch(/S16000|F800\.0/);
});
