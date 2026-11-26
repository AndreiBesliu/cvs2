/**
 * „Toate foile” cu operațiile fiecărei foi (ADR 0291, 7a, felia 28.8↑q; constatarea 18 a auditului): cu „Toate foile”, lista și
 * fișele arată operațiile tuturor foilor, sub numele fiecărei foi; o piesă pusă pe mai multe foi (copia legată) își are rândul o
 * singură dată, la prima foaie, iar celelalte spun că o au; numerele ordinii pornesc de la 1 pe fiecare foaie, iar în „A mea” un
 * rând se mută doar în foaia lui. O operație a altei foi, schimbată aici, intră în document la Exportă, iar arhiva are programul
 * fiecărei foi, cel exportat singur; o greșeală pe altă foaie oprește doar „Toate foile”. Cu „Foaia activă”, rândurile foii
 * active, ca înainte.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { citesteZip } from '../../src/extensii/zip.ts';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const lista = (page: Page) => page.getByTestId('lista-vectori');
const LIMITE = { fisiere: 100, octetiFisier: 50_000_000, octetiTotal: 200_000_000 };
const fisa = (page: Page, cheie: string) => page.locator(`[data-fisa="op"][data-operatie="${cheie}"]`);

async function panouDeschis(page: Page): Promise<void> {
  const panou = page.locator('[data-panou="proprietati"]');
  if ((await panou.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  await expect(panou).toHaveAttribute('data-deschis', 'true');
}

/** Foaia 1 cu un dreptunghi (e1), foaia 2 copia ei legată, foaia 3 cu un cerc (activă). */
async function treiFoi(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-foaie-meniu="f1"]').click();
  await lista(page).locator('[data-meniu-foaie="f1"] [data-meniu-foaie-articol="foaie.duplica-legat"]').click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(3);
  await adauga(page, 'cerc');
}

async function deschide(page: Page): Promise<void> {
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.getByTestId('export-foi-alegere')).toBeVisible();
}

/** Ce arată lista, de sus în jos: capul fiecărei foi (`foaie:<id>`) și rândurile operațiilor (`op:<cheie>`). */
const ceArataLista = (page: Page): Promise<string[]> => page.locator('.dx-lista').evaluate((l) => [...l.querySelectorAll<HTMLElement>('[data-foaie-lista], [data-nav-op]')]
  .map((e) => (e.dataset['foaieLista'] !== undefined ? `foaie:${e.dataset['foaieLista']}` : `op:${e.dataset['navOp'] ?? ''}`)));

async function descarca(page: Page): Promise<{ nume: string; octeti: Uint8Array }> {
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const x = await d;
  return { nume: x.suggestedFilename(), octeti: new Uint8Array(readFileSync(await x.path())) };
}

test('lista și fișele arată operațiile fiecărei foi, sub numele ei; piesa comună o dată; numerele pe foaie; „Foaia activă” ca înainte', async ({ page }) => {
  await treiFoi(page);
  await deschide(page);
  // Foaia activă (a treia): doar cercul, fără capete de foi.
  const activa = await ceArataLista(page);
  expect(activa).toHaveLength(1);
  const cerc = activa[0]!.slice(3);
  expect(cerc).not.toBe('e1/e1');
  await page.locator('[data-foi="toate"]').click();
  expect(await ceArataLista(page)).toEqual(['foaie:f1', 'op:e1/e1', 'foaie:f2', 'foaie:f3', `op:${cerc}`]);
  await expect(page.locator('[data-foaie-lista="f1"]')).toContainText('Foaia 1');
  await expect(page.locator('[data-foaie-lista="f2"]')).toContainText('Și o operație a pieselor de pe Foaia 1');
  await expect(page.locator('[data-foaie-lista="f3"] [data-nota-foaie]')).toHaveCount(0);
  // Fișele: capul fiecărei foi și fișa dreptunghiului, a foii 1, ca a cercului; numerele pornesc de la 1 pe fiecare foaie.
  await expect(page.locator('[data-foaie-fise]')).toHaveCount(3);
  await expect(page.locator('[data-foaie-fise="f2"]')).toContainText('Foaia 2');
  await expect(fisa(page, 'e1/e1').locator('[data-camp="adancime"]')).toBeVisible();
  await expect(page.locator('[data-nav-op="e1/e1"] [data-loc]')).toHaveText('1');
  await expect(page.locator(`[data-nav-op="${cerc}"] [data-loc]`)).toHaveText('1');
  await expect(fisa(page, cerc).locator('.dx-loc')).toHaveText('locul 1 din 1 în ordinea tăierii');
  await expect(page.getByTestId('export-foi-nota')).toContainText('sub numele ei');
  // Înapoi la foaia activă: doar cercul.
  await page.locator('[data-foi="activa"]').click();
  expect(await ceArataLista(page)).toEqual([`op:${cerc}`]);
  await expect(fisa(page, 'e1/e1')).toHaveCount(0);
});

test('o operație a altei foi, schimbată aici, intră în document; arhiva are programul fiecărei foi exportate singure', async ({ page }) => {
  await treiFoi(page);
  await deschide(page);
  await page.locator('[data-foi="toate"]').click();
  await fisa(page, 'e1/e1').locator('[data-camp="adancime"]').fill('5');
  const arhiva = await descarca(page);
  const z = await citesteZip(arhiva.octeti, LIMITE);
  expect(z.ok).toBe(true);
  if (!z.ok) return;
  expect(z.intrari.map((x) => x.nume)).toEqual(['cncvs2-stanga-jos-foaia-1-x2.nc', 'cncvs2-stanga-jos-foaia-3.nc']);
  // Rezultatul pe foi: timpul pe operații al fiecărei foi (foaia 1 ×2 și foaia 3); al foii active, deschis; simularea, a ei.
  const pe = page.locator('[data-rezumat-foaie]');
  await expect(pe).toHaveCount(2);
  await expect(pe.nth(0).locator('summary')).toContainText('Foaia 1 ×2 (și Foaia 2)');
  await expect(pe.nth(0)).not.toHaveAttribute('open', '');
  await expect(pe.nth(1)).toHaveAttribute('open', '');
  await expect(pe.nth(0).locator('[data-operatie="e1/e1"]')).toHaveCount(1);
  await expect(pe.nth(1).locator('[data-operatie="e1/e1"]')).toHaveCount(0);
  await expect(page.locator('[data-nota="simulare-foaie"]')).toHaveText('Simularea e a foii active: Foaia 3.');
  // Rezultatul e al alegerii: „Foaia activă” îl scoate.
  await page.locator('[data-foi="activa"]').click();
  await expect(page.getByTestId('export-foi')).toHaveCount(0);
  await expect(page.locator('[data-rezumat-foaie]')).toHaveCount(0);
  // Foaia 1, exportată singură: aceiași octeți, deci adâncimea nouă e în document (și taie până la Z −5).
  await page.getByRole('button', { name: 'Închide' }).click();
  await lista(page).locator('[data-foaie="f1"]').click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-foi="activa"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(fisa(page, 'e1/e1').locator('[data-camp="adancime"]')).toHaveValue('5');
  const singura = await descarca(page);
  expect(Buffer.from(z.intrari[0]!.octeti).equals(Buffer.from(singura.octeti))).toBe(true);
  const text = new TextDecoder().decode(singura.octeti);
  expect(text).toMatch(/Z-5(\.0+)?\b/);
  expect(text).not.toMatch(/Z-(5\.0*[1-9]|[6-9]|1\d)/);
});

test('o greșeală pe altă foaie oprește doar „Toate foile”, cu „Du-mă la …” spre rândul ei', async ({ page }) => {
  await treiFoi(page);
  await deschide(page);
  await page.locator('[data-foi="toate"]').click();
  await fisa(page, 'e1/e1').locator('[data-camp="pas"]').fill('0');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.locator('[data-du="e1/e1"]')).toBeVisible();
  await page.locator('[data-foi="activa"]').click();
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  // Înapoi la toate foile: ce ai scris rămâne, deci greșeala.
  await page.locator('[data-foi="toate"]').click();
  await expect(fisa(page, 'e1/e1').locator('[data-camp="pas"]')).toHaveValue('0');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
});

test('în „A mea”, un rând se mută doar în foaia lui; ordinea fiecărei foi rămâne la redeschidere', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await deschide(page);
  await page.locator('[data-foi="toate"]').click();
  await page.locator('[data-ordine="a-mea"]').click();
  const randuri = await ceArataLista(page);
  expect(randuri[0]).toBe('foaie:f1');
  expect(randuri[3]).toBe('foaie:f2');
  expect(randuri).toHaveLength(6);
  const [prim, ultim] = [randuri[1]!.slice(3), randuri[2]!.slice(3)];
  const [altul, altul2] = [randuri[4]!.slice(3), randuri[5]!.slice(3)];
  const lista1 = (a: string, b: string): string[] => ['foaie:f1', `op:${a}`, `op:${b}`, 'foaie:f2', `op:${altul}`, `op:${altul2}`];
  // Ultimul rând al foii 1 nu coboară pe foaia 2, primul al foii 2 nu urcă pe foaia 1; numerele pornesc de la 1 pe foaia 2.
  await expect(page.locator(`[data-jos="${ultim}"]`)).toBeDisabled();
  await expect(page.locator(`[data-sus="${altul}"]`)).toBeDisabled();
  await expect(page.locator(`[data-nav-op="${altul}"] [data-loc]`)).toHaveText('1');
  await expect(page.locator(`[data-nav-op="${altul2}"] [data-loc]`)).toHaveText('2');
  // Nici trasă cu mânerul: al doilea rând al foii 2, lăsat pe unul al foii 1, nu trece înaintea primului de pe foaia lui.
  await page.locator(`[data-trage="${altul2}"]`).dragTo(page.locator(`[data-nav-op="${prim}"]`));
  expect(await ceArataLista(page)).toEqual(lista1(prim, ultim));
  // În foaia lui, tragerea și săgețile îl mută.
  await page.locator(`[data-trage="${ultim}"]`).dragTo(page.locator(`[data-nav-op="${prim}"]`));
  expect(await ceArataLista(page)).toEqual(lista1(ultim, prim));
  await page.locator(`[data-jos="${ultim}"]`).click();
  expect(await ceArataLista(page)).toEqual(lista1(prim, ultim));
  // Cercul stă în dreptunghi: tăiat după exteriorul lui, riscul e spus cu numele foii.
  await page.locator(`[data-sus="${ultim}"]`).click();
  expect(await ceArataLista(page)).toEqual(lista1(ultim, prim));
  await expect(page.getByTestId('risc-ordine')).toContainText('Foaia 1: Exteriorul din rândul 1 se taie înaintea rândului 2');
  await page.locator('[data-camp="confirma-ordine"]').check();
  await descarca(page);
  await page.getByRole('button', { name: 'Închide' }).click();
  await deschide(page);
  await page.locator('[data-foi="toate"]').click();
  await expect(page.locator('[data-ordine="a-mea"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await ceArataLista(page)).toEqual(lista1(ultim, prim));
});

test('pe telefon, banda listei rămâne cât era: capul foii e doar numele ei, pe un rând', async ({ page }) => {
  await treiFoi(page);
  await deschide(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const banda = page.locator('.dx-lista');
  const inainte = (await banda.boundingBox())?.height ?? 0;
  await page.locator('[data-foi="toate"]').click();
  await expect(page.locator('[data-foaie-lista="f2"]')).toBeAttached();
  const dupa = (await banda.boundingBox())?.height ?? Number.POSITIVE_INFINITY;
  expect(dupa).toBeLessThanOrEqual(inainte + 2);
  await expect(page.locator('[data-foaie-lista="f2"] [data-nota-foaie]')).toBeHidden();
  // Nota stă în capul din fișe.
  await expect(page.locator('[data-foaie-fise="f2"] [data-nota-foaie]')).toContainText('Foaia 1');
});

test('rândul altei foi se socotește pe hârtie cu grosimea foii lui, nu a celei active', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  // Foaia 2, activă și mai subțire (12 mm); foaia 1 rămâne de 18.
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  await panouDeschis(page);
  const g = page.locator('[data-camp="foaie-grosime"]');
  await g.fill('12');
  await g.press('Enter');
  await expect(g).toHaveValue('12');
  await adauga(page, 'cerc');
  await deschide(page);
  await page.locator('[data-camp="supracursa"]').fill('0.5');
  await page.locator('[data-foi="toate"]').click();
  // Dreptunghiul foii 1, tăiat cât foaia lui (18 mm): trece prin ea cu supracursa, ca în programul ei.
  const e1 = fisa(page, 'e1/e1');
  await e1.locator('[data-camp="adancime"]').fill('18');
  await expect(e1.locator('[data-treceri]')).toContainText('până la 18,5 mm (prin foaie, cu supracursa)');
});
