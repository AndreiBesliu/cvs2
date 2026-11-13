/**
 * Felia 11.5↑ (ADR 0210 §5): „Toate foile” la export. Cu o singură foaie, fereastra nu oferă alegerea. Un dreptunghi, copia
 * legată a foii („Duplică foaia cu aceleași piese”) și o foaie nouă cu un cerc: „Toate foile (3)” descarcă o arhivă cu două
 * programe (foaia 1 o dată, cu -x2, și foaia 3), fiecare cel al foii lui exportate singure; fereastra arată foile, ×2 și
 * timpul tuturor; „Deschide în Mașina” rămâne al foii active (amprenta programului ei).
 */
import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { citesteZip } from '../../src/extensii/zip.ts';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const lista = (page: Page) => page.getByTestId('lista-vectori');
const LIMITE = { fisiere: 100, octetiFisier: 50_000_000, octetiTotal: 200_000_000 };

/** Exportul ferestrei deschise, cu descărcarea lui: numele și octeții. */
async function descarca(page: Page): Promise<{ nume: string; octeti: Uint8Array }> {
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const x = await d;
  return { nume: x.suggestedFilename(), octeti: new Uint8Array(readFileSync(await x.path())) };
}

test('„Toate foile”: arhiva cu foaia 1 ×2 și foaia 3, fiecare programul foii ei; lista foilor și timpul tuturor', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  // Cu o singură foaie, fereastra exportului nu oferă „Toate foile”.
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-camp="origine"]')).toBeVisible();
  await expect(page.getByTestId('export-foi-alegere')).toHaveCount(0);
  await page.getByRole('button', { name: 'Închide' }).click();
  // Foaia 2: copia legată a primei; foaia 3: un cerc.
  await lista(page).locator('[data-foaie-meniu="f1"]').click();
  await lista(page).locator('[data-meniu-foaie="f1"] [data-meniu-foaie-articol="foaie.duplica-legat"]').click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(3);
  await adauga(page, 'cerc');

  // Întâi foaia activă singură (a treia), pentru comparație.
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.getByTestId('export-foi-alegere')).toBeVisible();
  await expect(page.locator('[data-foi="activa"]')).toHaveAttribute('aria-pressed', 'true');
  const singura = await descarca(page);
  expect(singura.nume).toBe('cncvs2-stanga-jos.nc');
  // Apoi toate foile: titlul, nota, arhiva.
  await page.locator('[data-foi="toate"]').click();
  await expect(page.locator('#export-titlu')).toContainText('Toate foile (3)');
  await expect(page.getByTestId('export-foi-nota')).toContainText('Câte un program pe foaie');
  const arhiva = await descarca(page);
  expect(arhiva.nume).toBe('cncvs2-stanga-jos-foile.zip');
  const z = await citesteZip(arhiva.octeti, LIMITE);
  expect(z.ok).toBe(true);
  if (!z.ok) return;
  expect(z.intrari.map((x) => x.nume)).toEqual(['cncvs2-stanga-jos-foaia-1-x2.nc', 'cncvs2-stanga-jos-foaia-3.nc']);
  expect(Buffer.from(z.intrari[1]!.octeti).equals(Buffer.from(singura.octeti))).toBe(true);
  // Fereastra: arhiva, foile (×2 cu cea identică), timpul tuturor; „Deschide în Mașina”, al foii active.
  const foi = page.getByTestId('export-foi');
  await expect(foi).toContainText('Arhiva cncvs2-stanga-jos-foile.zip: 3 foi');
  await expect(foi.locator('tbody tr')).toHaveCount(2);
  await expect(foi.locator('tbody tr').first().locator('th')).toHaveText('Foaia 1 ×2 (și Foaia 2)');
  await expect(foi.locator('tbody tr').nth(1).locator('th')).toHaveText('Foaia 3');
  await expect(foi.locator('[data-foi="timp"]')).toContainText('Toate foile:');
  await expect(page.locator('[data-buton="in-masina"]')).toBeVisible();
  // „Deschide în Mașina” încarcă programul foii active (amprenta exportului ei singur), nu arhiva.
  await page.locator('[data-buton="in-masina"]').click();
  await expect(page.locator('.masina-sha')).toHaveAttribute('data-sha', createHash('sha256').update(singura.octeti).digest('hex'));
  expect(erori).toEqual([]);
});
