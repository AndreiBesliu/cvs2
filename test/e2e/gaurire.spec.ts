import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { judeca } from '../oracles/simulare.ts';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

/** Z-urile liniilor G-code care coboară sau urcă (G0 / G1 cu Z), în ordine. */
function zuri(text: string): Array<{ g: number; z: number }> {
  let g = 0;
  const rez: Array<{ g: number; z: number }> = [];
  for (const l of text.split('\n')) {
    const gm = /^G0?([0-3])\b/.exec(l);
    if (gm) g = Number(gm[1]);
    const zm = /Z(-?[\d.]+)/.exec(l);
    if (gm && zm && !/[XY]/.test(l)) rez.push({ g, z: Number(zm[1]) });
  }
  return rez;
}

/** Celulele greșite față de gaura de rază `R` în (70, 50), adâncă `h` (± 0,05 mm în jurul peretelui nu se judecă). */
function gresite(text: string, R: number, D: number, h: number): number {
  const g = { x0: 70 - R - 5, y0: 50 - R - 5, latime: 2 * R + 10, inaltime: 2 * R + 10, celula: 0.25 };
  const o = judeca(text, g, { tip: 'plata', diametru: D });
  let n = 0;
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const x = g.x0 + (i + 0.5) * g.celula, y = g.y0 + (j + 0.5) * g.celula;
      const q = Math.hypot(x - 70, y - 50);
      if (Math.abs(q - R) < 0.05) continue;
      if (Math.abs((o.z[j * o.nx + i] ?? Number.NaN) - (q < R ? -h : 0)) > 1e-6) n++;
    }
  }
  return n;
}

/**
 * Găurirea (ADR 0087) din fereastra exportului: pe un rând numai cu cercuri, „găurire” e încă o tăietură; ce e al profilului
 * se oprește; „Iese la fiecare al … pas” apare sub rând. Cercul de Ø30 cu freza Ø6 e refuzat (peste două diametre, ar rămâne
 * un miez); cu freza Ø30 se găurește în centru, cu ciocănire (la pasul 3 și ieșirea la al doilea pas: 4 pași de 2,5 mm,
 * pe hârtie), iar cu Ø16 în elice (G3 cu Z, la urcare). Oracolul simulării, pe octeții din browser: gaura cât cercul, fundul
 * la −10, nimic în afară. Operația rămâne în proiect și apare în panoul de proprietăți.
 */
test('găurirea din fereastra exportului: refuzul cu motiv, ciocănirea în centru, elicea, și operația rămâne în proiect', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('tr[data-operatie]').first();
  await rand.locator('[data-camp="latura"]').selectOption('gaurire');
  for (const camp of ['urechi', 'rampa', 'intrari', 'colturi']) await expect(rand.locator(`[data-camp="${camp}"]`)).toBeDisabled();
  const retragere = page.locator('[data-camp="retragere"]');
  await expect(retragere).toHaveValue('1');
  await retragere.fill('0');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('Găurirea');
  await retragere.fill('2');
  await rand.locator('[data-camp="adancime"]').fill('10');
  await rand.locator('[data-camp="pas"]').fill('3');
  // Cu freza Ø6, cercul de Ø30 trece de două diametre: refuzat, cu motivul.
  await page.locator('[data-buton="exporta"]').click();
  await expect(page.getByTestId('export-stare')).toContainText('trece de două diametre ale frezei');
  // Cu freza Ø30: în centru, cu ciocănire.
  await rand.locator('[data-camp="diametru"]').fill('30');
  let descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  let text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  expect(text).not.toMatch(/\bG(73|8[1-9])\b/);
  // Pe hârtie: 10 mm cu pasul 3 = 4 pași de 2,5; după pasul 1 și 3, retragerea parțială (+1 mm); după pasul 2, ieșirea.
  const z = zuri(text).filter((p) => p.z < 5 || p.g === 0);
  const jos = z.flatMap((p, k) => (p.g === 1 ? [k] : []));
  expect(jos.map((k) => z[k]!.z)).toEqual([-2.5, -5, -7.5, -10]);
  expect(z[jos[1]! - 1]!.z).toBe(-1.5);
  expect(z.slice(jos[1]!, jos[2]!).map((p) => p.z)).toEqual([-5, 5, -4.5]);
  expect(z[jos[3]! - 1]!.z).toBe(-6.5);
  expect(gresite(text, 15, 30, 10)).toBe(0);
  // Cu freza Ø16: în elice pe perete.
  await rand.locator('[data-camp="diametru"]').fill('16');
  descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  expect(text).toMatch(/^G3 [^\n]*Z-/m);
  expect(text).not.toMatch(/^G2 /m);
  expect(gresite(text, 15, 16, 10)).toBe(0);
  // Operația a intrat în proiect: în panou și la redeschidere.
  await page.getByRole('button', { name: 'Închide' }).click();
  const panou = page.locator('[data-panou="proprietati"]');
  if ((await panou.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  await expect(panou).toContainText('găurire');
  await expect(panou).toContainText('Iese la fiecare al … pas');
  // Arborele proiectului numește felul, nu „Profil interior” (pasul scris în dialog: 3).
  const comuta = page.locator('button[data-comuta]').first();
  if ((await comuta.getAttribute('aria-expanded')) !== 'true') await comuta.click();
  await expect(page.locator('[data-nod="operatie"]')).toHaveText(['Găurire pe 1 cerc: 10 mm în pași de 3 mm, T1 Ø16']);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('tr[data-operatie]').first().locator('[data-camp="latura"]')).toHaveValue('gaurire');
  await expect(page.locator('[data-camp="retragere"]')).toHaveValue('2');
});

test('găurirea se oferă doar pe un rând numai cu cercuri: dreptunghiul n-o are', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const latura = page.locator('tr[data-operatie]').first().locator('[data-camp="latura"]');
  await expect(latura).toBeVisible();
  const optiuni = await latura.locator('option').evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value));
  expect(optiuni).toContain('buzunar');
  expect(optiuni).not.toContain('gaurire');
});
