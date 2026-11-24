// Comenzile foii pe pânză (ADR 0210 §1, felia 11.1↑c): sub fiecare foaie, rândul cu cele șapte comenzi ale meniului ei
// „⋯”; al foii active se vede mereu, al unei foi vecine doar cu mausul pe ea.
import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const ARTICOLE = ['proprietati', 'aseaza', 'foaie.duplica', 'foaie.duplica-legat', 'foaie.muta-sus', 'foaie.muta-jos', 'foaie.sterge'];

const lista = (page: Page) => page.getByTestId('lista-vectori');
const foaie = (page: Page, id: string) => lista(page).locator(`[data-foaie="${id}"]`);
const rand = (page: Page, id: string) => page.locator(`[data-controale-foaie="${id}"]`);
const articol = (page: Page, id: string, a: string) => rand(page, id).locator(`[data-meniu-foaie-articol="${a}"]`);

/** Comutatorul „Toate foile pe pânză”, oprit și pornit din nou: pornit, le încadrează pe toate (o foaie nouă nu mută vederea). */
async function incadreazaToate(page: Page): Promise<void> {
  const comutator = page.locator('[data-actiune="vedere.toate-foile"]');
  await comutator.click();
  await expect(comutator).toHaveAttribute('aria-pressed', 'false');
  await comutator.click();
  await expect(comutator).toHaveAttribute('aria-pressed', 'true');
}

/** Colțul stânga-jos al unei foi (x mm față de foaia activă), în pixelii paginii. */
async function coltFoaie(page: Page, x: number): Promise<{ x: number; y: number }> {
  return (await ecran(page, await vedere(page)))(x, 0);
}

test('sub foaia activă: cele șapte comenzi ale meniului ei, în ordinea lui, la stânga, sub marginea de jos; stinse ca în meniu', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  const r = rand(page, 'f1');
  await expect(r).toBeVisible();
  await expect(r).toHaveAttribute('data-vizibil', 'da');
  await expect(r).toHaveAttribute('role', 'toolbar');
  await expect(r).toHaveCSS('opacity', '1');
  await expect(r.locator('[data-meniu-foaie-articol]')).toHaveCount(7);
  expect(await r.locator('[data-meniu-foaie-articol]').evaluateAll((b) => b.map((x) => x.getAttribute('data-meniu-foaie-articol')))).toEqual(ARTICOLE);
  // Numele accesibil al fiecărui buton e eticheta din meniu.
  expect(await r.locator('[data-meniu-foaie-articol]').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')))).toEqual([
    'Nume, mărime și material…', 'Așază pe foi…', 'Duplică foaia', 'Duplică foaia cu aceleași piese', 'Mută foaia mai sus', 'Mută foaia mai jos', 'Șterge foaia',
  ]);
  // Locul: colțul stânga-jos al foii, la 6 px sub ea.
  const colt = await coltFoaie(page, 0);
  const cutie = await r.boundingBox();
  if (!cutie) throw new Error('rândul n-are cutie');
  expect(Math.abs(cutie.x - colt.x)).toBeLessThan(1.5);
  expect(Math.abs(cutie.y - (colt.y + 6))).toBeLessThan(1.5);
  // Aceleași stări ca în meniul „⋯” al foii: cu o singură foaie, mutările și ștergerea sunt stinse, cu motivul în titlu.
  await lista(page).locator('[data-foaie-meniu="f1"]').click();
  const meniu = page.locator('[data-meniu-foaie="f1"]');
  for (const a of ARTICOLE) {
    const inMeniu = await meniu.locator(`[data-meniu-foaie-articol="${a}"]`).isDisabled();
    expect(await articol(page, 'f1', a).isDisabled(), a).toBe(inMeniu);
  }
  await expect(articol(page, 'f1', 'foaie.muta-sus')).toBeDisabled();
  await expect(articol(page, 'f1', 'foaie.duplica')).toBeEnabled();
  expect(await articol(page, 'f1', 'foaie.muta-sus').getAttribute('title')).not.toBe('Mută foaia mai sus');
});

test('sub o foaie vecină rândul apare doar cu mausul pe ea sau pe fâșia de sub ea; „Duplică foaia” de acolo o dublează pe ea', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await expect(foaie(page, 'f2')).toHaveAttribute('data-activa', 'da');
  await incadreazaToate(page);
  // Foaia 2 e activă: rândul ei se vede; al Foii 1 (la −400 mm) e stins.
  await expect(rand(page, 'f2')).toHaveAttribute('data-vizibil', 'da');
  await expect(rand(page, 'f1')).toHaveAttribute('data-vizibil', 'nu');
  await expect(rand(page, 'f1')).toHaveCSS('opacity', '0');
  // Rândul vecinei stă sub ea, nu sub foaia activă.
  const coltVecina = await coltFoaie(page, -400);
  const cutieVecina = await rand(page, 'f1').boundingBox();
  if (!cutieVecina) throw new Error('rândul vecinei n-are cutie');
  expect(Math.abs(cutieVecina.x - coltVecina.x)).toBeLessThan(1.5);
  // Mausul pe Foaia 1: rândul ei apare; pe fundalul dintre foi, se stinge.
  const peFoaie = (await ecran(page, await vedere(page)))(-250, 100);
  await page.mouse.move(peFoaie.x, peFoaie.y);
  await expect(rand(page, 'f1')).toHaveAttribute('data-vizibil', 'da');
  await expect(rand(page, 'f1')).toHaveCSS('opacity', '1');
  const intre = (await ecran(page, await vedere(page)))(-50, 100);
  await page.mouse.move(intre.x, intre.y);
  await expect(rand(page, 'f1')).toHaveAttribute('data-vizibil', 'nu');
  // Cu mausul chiar pe rând (venit de pe foaie), rândul rămâne la vedere și se poate apăsa.
  await page.mouse.move(peFoaie.x, peFoaie.y);
  await articol(page, 'f1', 'foaie.duplica').hover();
  await expect(rand(page, 'f1')).toHaveCSS('opacity', '1');
  await articol(page, 'f1', 'foaie.duplica').click();
  // Foaia 1 s-a dublat (cu dreptunghiul ei): trei foi, iar copia are o piesă.
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(3);
  await expect(lista(page).locator('[data-foaie] .foaie-detalii').filter({ hasText: '1 piesă' })).toHaveCount(2);
});

test('ștergerea unei foi cu piese întreabă întâi, în rând; „Renunță” o lasă, „Șterge foaia” o șterge, iar anularea o întoarce', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await adauga(page, 'cerc');
  // Foaia 2, activă, are cercul.
  await articol(page, 'f2', 'foaie.sterge').click();
  await expect(rand(page, 'f2')).toContainText('Ștergi foaia și piesa de pe ea?');
  await expect(rand(page, 'f2').locator('[data-meniu-foaie-articol]')).toHaveCount(2);
  await articol(page, 'f2', 'sterge-nu').click();
  await expect(rand(page, 'f2').locator('[data-meniu-foaie-articol]')).toHaveCount(7);
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  await articol(page, 'f2', 'foaie.sterge').click();
  await articol(page, 'f2', 'sterge-da').click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(1);
  await expect(rand(page, 'f2')).toHaveCount(0);
  await expect(rand(page, 'f1')).toHaveAttribute('data-vizibil', 'da');
  await page.locator('body').press('Control+z');
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
});

test('„Nume, mărime și material…” deschide panoul foii, iar „Așază pe foi…” fereastra așezării; „Mută foaia mai sus” o mută în listă', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await articol(page, 'f2', 'proprietati').click();
  await expect(page.locator('[data-camp="foaie-nume"]')).toBeVisible();
  // Mutarea în listă: Foaia 2 trece înaintea Foii 1.
  expect(await lista(page).locator('[data-foaie]').evaluateAll((s) => s.map((x) => x.getAttribute('data-foaie')))).toEqual(['f1', 'f2']);
  await articol(page, 'f2', 'foaie.muta-sus').click();
  expect(await lista(page).locator('[data-foaie]').evaluateAll((s) => s.map((x) => x.getAttribute('data-foaie')))).toEqual(['f2', 'f1']);
  await expect(articol(page, 'f2', 'foaie.muta-sus')).toBeDisabled();
  await articol(page, 'f2', 'aseaza').click();
  await expect(page.locator('.dialog-asezare')).toBeVisible();
});

test('cu „Toate foile pe pânză” oprit rămâne doar rândul foii active; în engleză, numele comenzilor sunt cele englezești', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await expect(rand(page, 'f1')).toHaveCount(1);
  await page.locator('[data-actiune="vedere.toate-foile"]').click();
  await expect(rand(page, 'f1')).toHaveCount(0);
  await expect(rand(page, 'f2')).toHaveAttribute('data-vizibil', 'da');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(articol(page, 'f2', 'foaie.duplica')).toHaveAttribute('aria-label', 'Duplicate the sheet');
});

test('întrebarea ștergerii rămâne la vedere și cu mausul plecat de pe foaia vecină; în fereastra Mașina, rândurile nu se arată', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await expect(foaie(page, 'f2')).toHaveAttribute('data-activa', 'da');
  await incadreazaToate(page);
  // Foaia 1 (vecină, cu dreptunghiul): mausul pe ea, apoi „Șterge foaia” din rândul ei.
  const peFoaie = (await ecran(page, await vedere(page)))(-250, 100);
  await page.mouse.move(peFoaie.x, peFoaie.y);
  await articol(page, 'f1', 'foaie.sterge').click();
  await expect(rand(page, 'f1')).toContainText('Ștergi foaia și piesa de pe ea?');
  // Mausul pleacă pe fundalul dintre foi: întrebarea nu se stinge cât n-a primit răspuns.
  const intre = (await ecran(page, await vedere(page)))(-50, 100);
  await page.mouse.move(intre.x, intre.y);
  await expect(rand(page, 'f1')).toHaveAttribute('data-vizibil', 'da');
  await expect(rand(page, 'f1')).toHaveCSS('opacity', '1');
  await articol(page, 'f1', 'sterge-nu').click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  // Proiectarea acoperită de fereastra Mașina: niciun rând; înapoi în Proiectare, rândul foii active e la loc.
  await page.locator('[data-actiune="vedere.masina"]').click();
  await expect(page.locator('[data-controale-foaie]')).toHaveCount(0);
  await page.locator('[data-actiune="vedere.proiectare"]').click();
  await expect(rand(page, 'f2')).toHaveAttribute('data-vizibil', 'da');
});
