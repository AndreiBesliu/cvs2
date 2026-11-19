/**
 * Roata cu anvelopă în atelierul Easy 3Draw (ADR 0280, felia 3.Tj), pe pagina de sine stătătoare a planificatorului (din
 * aceleași surse ca pachetul):
 * - tipul nou, în galeria pieselor de legătură: „Roată 30,4 × 13,6”, ca LEGO, dintr-o bucată, 30,4 × 30,4 × 13,6 mm;
 * - la janta mică fața e plină și spune de la ce diametru încap spițele; banda cu blocuri intră în nume;
 * - roata mare cu spițe în Y: numele, STL-ul descărcat închis (fiecare muchie, o dată în fiecare sens);
 * - „Pune janta și anvelopa” pune în listă janta și anvelopa de aceeași mărime;
 * - calibrarea are varianta jantei și pasul jantelor („opt numere”), iar la varianta 5 janta iese mai lată decât la 3.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';

async function atelierRoata(page: Page): Promise<void> {
  await page.setContent(paginiPlanificator().preview);
  await page.locator('[data-mod="3d"]').first().click();
  await page.locator('#at-tipuri [data-tip="legaturi"]').click();
  await page.locator('#at-leg [data-leg="roata"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată 30,4 × 13,6');
}
async function seteaza(page: Page, sel: string, v: string): Promise<void> {
  await page.locator(sel).fill(v);
  await page.locator(sel).blur();
}

/** Muchiile fără pereche ale unui STL binar și cea mai mare rază față de mijlocul cutiei (pe x, y). */
function citesteStl(stl: Buffer): { triunghiuri: number; rele: number; raza: number } {
  const n = stl.readUInt32LE(80), m = new Map<string, number>(), pts: number[][] = [];
  const v = (o: number) => [0, 1, 2].map((k) => stl.readFloatLE(o + 4 * k));
  for (let i = 0; i < n; i++) {
    const o = 84 + 50 * i + 12, p = [v(o), v(o + 12), v(o + 24)];
    pts.push(...p);
    const s = p.map((q) => q.map((x) => x.toFixed(3)).join(','));
    for (let k = 0; k < 3; k++) { const e = s[k] + '>' + s[(k + 1) % 3]; m.set(e, (m.get(e) ?? 0) + 1); }
  }
  let rele = 0;
  for (const [e, c] of m) { const [a, b] = e.split('>'); if (c !== 1 || m.get(b + '>' + a) !== 1) rele++; }
  const xs = pts.map((p) => p[0]!), ys = pts.map((p) => p[1]!);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return { triunghiuri: n, rele, raza: Math.max(...pts.map((p) => Math.hypot(p[0]! - cx, p[1]! - cy))) };
}

test('roata ca LEGO: dintr-o bucată, fața plină la janta mică (cu diametrul de la care încap spițele), banda cu blocuri în nume', async ({ page }) => {
  await atelierRoata(page);
  await expect(page.locator('#at-cote')).toContainText('30,4 × 30,4 × 13,6 mm');
  await expect(page.locator('#at-ro-fata-plina')).toHaveText('Fața: plină (spițele încap de la janta de Ø 20,4 mm).');
  await expect(page.locator('#at-ro-spite')).toHaveCount(0);
  await page.locator('#at-ro-banda [data-v="blocuri"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată 30,4 × 13,6, cu blocuri');
  await page.locator('#at-ro-banda [data-v="neteda"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată 30,4 × 13,6, netedă');
});

test('roata mare cu spițe în Y: numele, STL-ul descărcat închis, cu raza cerută', async ({ page }) => {
  await atelierRoata(page);
  await seteaza(page, '#at-ro-janta', '36');
  await seteaza(page, '#at-ro-diam', '56');
  await seteaza(page, '#at-ro-lat', '26');
  await page.locator('#at-ro-spite [data-v="y"]').click();
  await seteaza(page, '#at-ro-nr', '6');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată 56 × 26, 6 spițe în Y');
  await expect(page.locator('#at-cote')).toContainText('56 × 56 × 26 mm');
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const d = await descarcare;
  expect(d.suggestedFilename()).toMatch(/\.stl$/);
  const { triunghiuri, rele, raza } = citesteStl(readFileSync(await d.path()));
  expect(triunghiuri).toBeGreaterThan(5_000);
  expect(rele).toBe(0);
  expect(raza).toBeCloseTo(28, 2);
  // înapoi la mărimea LEGO: spițele alese nu mai încap, deci fața e plină, iar numele nu le mai pomenește
  await page.locator('#at-ro-lego').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată 30,4 × 13,6');
  await expect(page.locator('#at-cote')).toContainText('30,4 × 30,4 × 13,6 mm');
  await expect(page.locator('#at-ro-fata-plina')).toBeVisible();
});

test('„Pune janta și anvelopa” și varianta jantei din calibrare (la 5, scaunul cu 0,1 mm mai mare pe rază decât la 3)', async ({ page }) => {
  await atelierRoata(page);
  await page.locator('#at-ro-fel [data-v="janta"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Jantă Ø 16,8 × 13,6');
  await expect(page.locator('#at-ro-diam')).toHaveCount(0);
  await page.locator('#at-ro-amandoua').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Jantă Ø 16,8 × 13,6', 'Anvelopă 30,4 × 13,6']);

  const raza = async (): Promise<number> => {
    const descarcare = page.waitForEvent('download');
    await page.locator('#at-stl').click();
    return citesteStl(readFileSync(await (await descarcare).path())).raza;
  };
  const r3 = await raza();
  await page.locator('#at-tipuri [data-tip="calibrare"]').click();
  await expect(page.locator('#at-calib-campuri label', { hasText: 'Varianta jantei' })).toBeVisible();
  await expect(page.locator('ol.pasi')).toContainText('Jantele:');
  await expect(page.locator('ol.pasi')).toContainText('Scrie cele opt numere');
  await seteaza(page, '#at-calib-campuri [data-setare="varianta_janta"]', '5');
  await page.locator('#at-tipuri [data-tip="legaturi"]').click();
  await page.locator('#at-leg [data-leg="roata"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Jantă Ø 16,8 × 13,6');
  const r5 = await raza();
  expect(r3).toBeCloseTo(8.4, 2);
  expect(r5 - r3).toBeCloseTo(0.1, 2);
});
