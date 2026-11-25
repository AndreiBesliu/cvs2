/**
 * Fereastra exportului „pe hârtie” (ADR 0291, felia 28.8↑h), pe cele două cazuri ale auditului:
 * - constatarea 1: cu supracursa prin foaie, desenul adâncimii și nota trecerilor spun ce taie programul (4 treceri de 4,575 până
 *   la 18,3; nota, la două zecimale, 4,58), nu împărțirea adâncimii scrise; fără bifă, cea scrisă;
 * - constatarea 2: cercul de Ø30 cu freza Ø16 e desenat ca elice, fără câmpul ieșirii (ciocănirea nu se aplică); cu Ø30, ca
 *   ciocănire; cu Ø6, greșeala stă lângă freză înainte de clic, Exportă e oprit, iar „Du-mă la …” duce la ea.
 */
import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';
import { alege } from './ajutor-export.ts';

test.use({ locale: 'ro-RO' });

const fisa = (page: Page, cheie: string) => page.locator(`[data-fisa="op"][data-operatie="${cheie}"]`);
const desen = (page: Page, cheie: string, grup: string) => fisa(page, cheie).locator(`[data-grup="${grup}"] [data-desen] svg`);

async function deschideCu(page: Page, forma: 'dreptunghi' | 'cerc'): Promise<void> {
  await page.goto('/');
  await adauga(page, forma);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav]').first()).toBeVisible();
  await page.mouse.move(2, 2);
}

test('constatarea 1: cu supracursa prin foaie, desenul și nota spun trecerile programului', async ({ page }) => {
  await deschideCu(page, 'dreptunghi');
  const e1 = fisa(page, 'e1/e1');
  // Grosimea foii din desen (a proiectului nou): adâncimea scrisă cât ea.
  const d = desen(page, 'e1/e1', 'adancime');
  const gros = Number((/foaia, ([\d,]+) mm/.exec(await d.textContent() ?? '')?.[1] ?? 'NaN').replace(',', '.'));
  expect(gros, 'grosimea foii în desen').toBe(18);
  await e1.locator('[data-camp="adancime"]').fill('18');
  await e1.locator('[data-camp="pas"]').fill('6');
  await expect(e1.locator('[data-treceri]')).toHaveText('3 treceri de 6 mm');
  await expect(d.locator('[data-trecere]')).toHaveCount(3);
  // Supracursa 0,3 și bifa „și tăieturile cât foaia”: lucrarea taie 18,3 în 4 treceri de 4,575.
  const foaia = page.locator('[data-fisa="foaia"]');
  await foaia.locator('[data-camp="supracursa"]').fill('0,3');
  await foaia.locator('[data-camp="supracursa-prin-foaie"]').check();
  await expect(e1.locator('[data-treceri]')).toHaveText('4 treceri de 4,58 mm, până la 18,3 mm (prin foaie, cu supracursa)');
  await expect(d.locator('[data-trecere]')).toHaveCount(4);
  await expect(d).toContainText('4 treceri egale de 4,58 mm');
  await expect(d.locator('[data-cota="adancime"]')).toContainText('18,3');
  await expect(d).toContainText('în masă 0,3 mm');
  // Fără bifă, ca înainte: 3 de 6 mm.
  await foaia.locator('[data-camp="supracursa-prin-foaie"]').uncheck();
  await expect(e1.locator('[data-treceri]')).toHaveText('3 treceri de 6 mm');
  await expect(d.locator('[data-trecere]')).toHaveCount(3);
});

test('constatarea 2: cercul R15 e elice cu Ø16, ciocănire cu Ø30, iar cu Ø6 greșeala e lângă freză, înainte de clic', async ({ page }) => {
  await deschideCu(page, 'cerc');
  const e1 = fisa(page, 'e1/e1');
  await alege(e1, 'latura', 'gaurire');
  await e1.locator('[data-camp="adancime"]').fill('8');
  await e1.locator('[data-camp="pas"]').fill('4');
  const d = desen(page, 'e1/e1', 'gaurire');
  // Ø16: elicea pe perete, 2 ture de 4 mm pe cercul de R 7; câmpul ieșirii nu se aplică.
  await e1.locator('[data-camp="diametru"]').fill('16');
  await expect(d).toHaveAttribute('data-gaurire', 'elice');
  await expect(d).toContainText('2 ture de 4 mm pe cercul de R 7 mm, apoi una la fund');
  await expect(d.locator('[data-coboara]')).toHaveCount(0);
  await expect(e1.locator('[data-camp="retragere"]')).toHaveCount(0);
  await expect(e1.locator('[data-greseala]')).toHaveCount(0);
  // Ø30 (cât cercul): ciocănirea, cu câmpul ieșirii.
  await e1.locator('[data-camp="diametru"]').fill('30');
  await expect(d).toHaveAttribute('data-gaurire', 'ciocanire');
  await expect(d.locator('[data-coboara]')).toHaveCount(2);
  await expect(e1.locator('[data-camp="retragere"]')).toBeVisible();
  // Ø6: cercul trece de două diametre; greșeala lângă freză, Exportă oprit, „Du-mă la …” duce la ea.
  await e1.locator('[data-camp="diametru"]').fill('6');
  await expect(d).toHaveAttribute('data-gaurire', 'nu-merge');
  const greseala = e1.locator('[data-grup="freza"] [data-greseala]');
  await expect(greseala).toHaveText('Cercul de Ø30 trece de două diametre ale frezei (Ø6): în centru ar rămâne un miez. Alege o freză de cel puțin Ø15, sau taie-l ca buzunar.');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await page.locator('[data-du="e1/e1"]').click();
  await expect(greseala).toBeInViewport();
});
