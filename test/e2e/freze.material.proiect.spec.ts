/**
 * Valorile pe material în proiect (ADR 0305 §3, felia 16.A↑g-2), în Edge: pe o foaie de „MDF alb 18”, freza aleasă în Tăierea
 * (și pe rândul exportului) ia setul „MDF” al ei: pasul, iar în program turația, avansul și plonjarea; o notă spune setul.
 * Pe o foaie fără potrivire, valorile de lucru ale frezei. Un material schimbat după alegere nu schimbă copia singur: nota
 * bibliotecii arată diferența, cu „Ia valorile noi”.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Download, type Locator, type Page } from '@playwright/test';
import { adauga, deschideMeniulContului } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const text = async (d: Download): Promise<string> => readFileSync((await d.path())!, 'utf8');
const exporta = async (page: Page): Promise<string> => {
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  return text(await d);
};
const taierea = (page: Page): Locator => page.getByTestId('prop-taierea');
const freza = (page: Page): Locator => taierea(page).locator('[data-camp="freza"]');
const campSet = (f: Locator, i: number, c: string): Locator => f.locator(`[data-freze-set="${i}"] [data-freze-set-camp="${c}"]`);

/** Setul „MDF” pus pe „Plată Ø6” din frezele standard, în „Frezele mele”; fereastra se închide. */
async function setMdf(page: Page): Promise<void> {
  const meniu = await deschideMeniulContului(page);
  await meniu.locator('[data-meniu-cont="freze"]').click();
  const f = page.getByRole('dialog', { name: 'Frezele mele' });
  await expect(f.locator('.freze-rand-nume')).toHaveCount(6);
  await f.locator('.freze-rand-nume').getByText('Plată Ø6', { exact: true }).click();
  await f.locator('[data-freze="fisa"] [data-freze="editeaza"]').click();
  await f.locator('[data-freze="set-adauga"]').click();
  await campSet(f, 0, 'material').fill('MDF');
  await campSet(f, 0, 'turatie').fill('20000');
  await campSet(f, 0, 'avans').fill('2500');
  await campSet(f, 0, 'plonjare').fill('600');
  await campSet(f, 0, 'pas').fill('4');
  await campSet(f, 0, 'pasLateral').fill('45');
  await f.locator('[data-freze="salveaza"]').click();
  await expect(f.locator('[data-freze="fisa"] [data-freze-fisa-set]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(f).toBeHidden();
}

/** Materialul foii (prima, `f1`), din panoul Proprietăți: deschis din meniul foii, oricare ar fi selecția. */
async function material(page: Page, m: string): Promise<void> {
  const lista = page.getByTestId('lista-vectori');
  await lista.locator('[data-foaie-meniu="f1"]').click();
  await lista.locator('[data-meniu-foaie="f1"] [data-meniu-foaie-articol="proprietati"]').click();
  const camp = page.locator('[data-camp="foaie-material"]');
  await camp.fill(m);
  await camp.press('Enter');
  await camp.blur();
}

test('pe „MDF alb 18”, freza aleasă în Tăierea ia setul „MDF”: pasul, iar în program turația, avansul și plonjarea', async ({ page }) => {
  await page.goto('/');
  await setMdf(page);
  await material(page, 'MDF alb 18');
  await adauga(page, 'dreptunghi');
  await freza(page).selectOption({ label: 'Plată Ø6' });
  await expect(taierea(page).locator('[data-camp="pas"]')).toHaveValue('4');
  await expect(taierea(page).locator('[data-nota="freza-material"]')).toHaveText('Cu valorile pentru „MDF”, materialul foii.');
  await page.locator('[data-actiune="export.gcode"]').click();
  const op = page.locator('[data-fisa="op"]').first();
  await expect(op.locator('[data-nota="freza-material"]')).toHaveText('Cu valorile pentru „MDF”, materialul foii.');
  await expect(op.locator('[data-nota="biblioteca-schimbata"]')).toHaveCount(0);
  const g = await exporta(page);
  expect(g).toMatch(/^M3 S20000$/m);
  expect(g).toMatch(/ F2500(\.0)?$/m);
  expect(g).toMatch(/ F600(\.0)?$/m);
  expect(g).not.toMatch(/S18000|F1000(\.0)?$/m);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('fără potrivire, valorile de lucru; materialul schimbat după alegere arată nota bibliotecii, cu „Ia valorile noi”', async ({ page }) => {
  await page.goto('/');
  await setMdf(page);
  await material(page, 'Placaj 18');
  await adauga(page, 'dreptunghi');
  await freza(page).selectOption({ label: 'Plată Ø6' });
  await expect(taierea(page).locator('[data-camp="pas"]')).toHaveValue('3');
  await expect(taierea(page).locator('[data-nota="freza-material"]')).toHaveCount(0);
  // Pe MDF, după alegere: copia rămâne a placajului, iar fereastra exportului spune diferența.
  await material(page, 'mdf');
  await page.locator('[data-actiune="export.gcode"]').click();
  const op = page.locator('[data-fisa="op"]').first();
  const nota = op.locator('[data-nota="biblioteca-schimbata"]');
  await expect(nota).toContainText('turația 20.000 (aici 18.000)');
  await expect(nota).toContainText('avansul 2.500 (aici 1.000)');
  await expect(op.locator('[data-nota="freza-material"]')).toHaveCount(0);
  expect(await exporta(page)).toMatch(/^M3 S18000$/m);
  await nota.locator('[data-buton="ia-valorile-noi"]').click();
  await expect(nota).toHaveCount(0);
  await expect(op.locator('[data-nota="freza-material"]')).toHaveText('Cu valorile pentru „MDF”, materialul foii.');
  expect(await exporta(page)).toMatch(/^M3 S20000$/m);
});
