/**
 * Rotițele dințate în atelierul Easy 3Draw (ADR 0169, felia 3.Th), pe pagina de sine stătătoare a planificatorului (din
 * aceleași surse ca pachetul):
 * - tipul nou, în galeria pieselor de legătură: „Roată dințată 24”, 26 × 26 × 3,8 mm;
 * - felurile dinților: la oblici, unghiul și sensul în nume; perechea arată distanța dintre axe și grila;
 * - „Fă perechea” pune în listă ambele roți, a doua cu dinții aleși și cu sensul opus;
 * - STL-ul descărcat e un corp închis (fiecare muchie, o dată în fiecare sens);
 * - roata de 8 cu gaură de ax spune cât perete rămâne (0,23 mm), iar la modulul 0,5 gaura care nu încape lipsește;
 *   calibrarea are varianta roților și pasul ei.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';

async function atelierRotita(page: Page): Promise<void> {
  await page.setContent(paginiPlanificator().preview);
  await page.locator('[data-mod="3d"]').first().click();
  await page.locator('#at-tipuri [data-tip="legaturi"]').click();
  await page.locator('#at-leg [data-leg="rotita"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată dințată 24');
}

/** Muchiile fără pereche ale unui STL binar (un corp închis are fiecare muchie o dată în fiecare sens). */
function muchiiRele(stl: Buffer): { triunghiuri: number; rele: number } {
  const n = stl.readUInt32LE(80), m = new Map<string, number>();
  const v = (o: number) => [0, 1, 2].map((k) => stl.readFloatLE(o + 4 * k).toFixed(3)).join(',');
  for (let i = 0; i < n; i++) {
    const o = 84 + 50 * i + 12, p = [v(o), v(o + 12), v(o + 24)];
    for (let k = 0; k < 3; k++) { const e = p[k] + '>' + p[(k + 1) % 3]; m.set(e, (m.get(e) ?? 0) + 1); }
  }
  let rele = 0;
  for (const [e, c] of m) { const [a, b] = e.split('>'); if (c !== 1 || m.get(b + '>' + a) !== 1) rele++; }
  return { triunghiuri: n, rele };
}

test('roata dințată: felurile dinților, perechea pe grilă, „Fă perechea” cu sensul opus, STL-ul închis', async ({ page }) => {
  await atelierRotita(page);
  await expect(page.locator('#at-cote')).toContainText('26 × 26 × 3,8 mm');
  await expect(page.locator('#at-r-unghi')).toHaveCount(0);

  await page.locator('#at-r-fel [data-v="oblici"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată dințată 24, dinți oblici 20° dreapta');
  await expect(page.locator('#at-r-unghi')).toHaveValue('20');
  await expect(page.locator('#at-r-sens [data-v="dreapta"]')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#at-r-pereche').fill('8');
  await page.locator('#at-r-pereche').blur();
  await expect(page.locator('#at-r-distanta')).toHaveText('dinți: axele la 16 mm, pe grilă (2 pași).');
  await page.locator('#at-r-fa-pereche').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Roată dințată 24, dinți oblici 20° dreapta', 'Roată dințată 8, dinți oblici 20° stânga']);

  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const d = await descarcare;
  expect(d.suggestedFilename()).toMatch(/\.stl$/);
  const { triunghiuri, rele } = muchiiRele(readFileSync(await d.path()));
  expect(triunghiuri).toBeGreaterThan(10_000);
  expect(rele).toBe(0);
});

test('roata de 8 cu gaură de ax spune cât perete rămâne; calibrarea are varianta roților și pasul ei', async ({ page }) => {
  await atelierRotita(page);
  await page.locator('#at-r-repede [data-v="8"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată dințată 8');
  await expect(page.locator('#at-avert')).toBeVisible();
  // brațele crucii spre goluri: peretele de sub coarda golului (ADR 0169, după privirea pe roata reală)
  await expect(page.locator('#at-avert')).toContainText('0,23 mm');
  // la modulul 0,5, gaura de 5 mm nu încape: roata iese fără ea și o spune
  await page.locator('#at-r-modul').fill('0.5');
  await page.locator('#at-r-modul').blur();
  await expect(page.locator('#at-avert')).toContainText('nu încape');
  await page.locator('#at-r-modul').fill('1');
  await page.locator('#at-r-modul').blur();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată dințată 8');
  await expect(page.locator('#at-avert')).toContainText('0,23 mm');
  await page.locator('#at-r-gaura [data-v="nu"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată dințată 8, fără gaură');
  await expect(page.locator('#at-avert')).toBeHidden();

  await page.locator('#at-tipuri [data-tip="calibrare"]').click();
  await expect(page.locator('#at-calib-campuri [data-setare="varianta_dinti"]')).toHaveValue('3');
  await expect(page.locator('ol.pasi')).toContainText('Roțile dințate:');
  await expect(page.locator('ol.pasi')).toContainText('Scrie cele șapte numere');
});

/** Volumul unui STL binar (corp închis, fețele spre exterior), în mm³. */
function volumStl(stl: Buffer): number {
  const n = stl.readUInt32LE(80), f = (o: number) => [0, 1, 2].map((k) => stl.readFloatLE(o + 4 * k));
  let v = 0;
  for (let i = 0; i < n; i++) {
    const o = 84 + 50 * i + 12, [a, b, c] = [f(o), f(o + 12), f(o + 24)] as [number[], number[], number[]];
    v += a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!) - a[1]! * (b[0]! * c[2]! - b[2]! * c[0]!) + a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!);
  }
  return v / 6;
}

test('varianta roților din calibrare ajunge în roată: la 5 (joc 0,25 mm) dinții ies mai subțiri decât la 3', async ({ page }) => {
  await atelierRotita(page);
  const stl = async (): Promise<number> => {
    const descarcare = page.waitForEvent('download');
    await page.locator('#at-stl').click();
    return volumStl(readFileSync(await (await descarcare).path()));
  };
  const la3 = await stl();
  await page.locator('#at-tipuri [data-tip="calibrare"]').click();
  await page.locator('#at-calib-campuri [data-setare="varianta_dinti"]').fill('5');
  await page.locator('#at-calib-campuri [data-setare="varianta_dinti"]').blur();
  await page.locator('#at-tipuri [data-tip="legaturi"]').click();
  await page.locator('#at-leg [data-leg="rotita"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată dințată 24');
  const la5 = await stl();
  // 24 de dinți × 2 flancuri × 0,1 mm mai mult joc × ~2 mm de flanc × 3,8 mm: în jur de 36 mm³ mai puțin
  expect(la3 - la5).toBeGreaterThan(20);
  expect(la3 - la5).toBeLessThan(60);
});
