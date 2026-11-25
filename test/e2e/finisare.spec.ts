import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { importaRelief, rolFinisare } from './ajutor-relief.ts';

/**
 * Finisarea reliefului (ADR 0312, felia 18.1↑c), în Edge: o imagine de 64 × 32 px, jumătatea din stânga albă, cea din dreapta
 * neagră, făcută relief la 1 mm pe celulă și 5 mm înălțime. În secțiunea Tăierea, rolul „finisarea reliefului”: bila Ø6,
 * pasul lateral 10 % (0,6 mm), liniile la 0°, podeaua cât placa; pasul lateral schimbat la 2 mm. În fereastra exportului,
 * finisarea are rândul ei, doar de citit (§7): în listă, la locul ei, cu fișa (freza, pasul, creasta pe plan 3 − √8 =
 * 0,172 mm, adâncimea) și nota că se schimbă din Tăierea. Exportul G-code cere dalele reliefului din browser (prin firul
 * principal), iar programul coboară cel mult 5 mm, în două treceri de 3 mm; Rezultatul are finisarea și freza ei. „Tăiat”,
 * în vederea 3D, simulează placa cu finisarea.
 */
test.use({ locale: 'ro-RO' });

test('rolul „finisarea reliefului”, rândul ei doar de citit în fereastra exportului, G-code-ul cu dalele din browser și „Tăiat”', async ({ page }) => {
  await page.goto('/');
  await importaRelief(page);
  await rolFinisare(page);
  await expect(page.locator('[data-camp="fin-pas-lateral"]')).toHaveValue('0,6');
  await expect(page.locator('[data-camp="fin-linii"]')).toHaveValue('da');
  await expect(page.locator('[data-camp="fin-margine"]')).toHaveValue('perete');
  await expect(page.locator('[data-camp="fin-z"]')).toHaveValue('varf');
  // Arborele spune finisarea.
  await expect(page.locator('[data-nod="operatie"]')).toContainText('Finisare pe 1 relief');
  await page.locator('[data-camp="fin-pas-lateral"]').fill('2');
  await page.locator('[data-camp="fin-pas-lateral"]').press('Enter');
  await expect(page.locator('[data-camp="fin-pas-lateral"]')).toHaveValue('2');
  await page.locator('[data-camp="pas"]').fill('3');
  await page.locator('[data-camp="pas"]').press('Enter');

  // Fereastra exportului: rândul finisării, primul în ordinea tăierii, cu fișa doar de citit.
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-nav-op][data-fel="finisare"]');
  await expect(rand).toHaveCount(1);
  await expect(rand.locator('[data-loc]')).toHaveText('1');
  await expect(rand).toContainText('Finisare · T');
  await expect(rand).toContainText('Ø6 bilă');
  const cheie = await rand.getAttribute('data-nav-op');
  const fisa = page.locator('[data-fisa="op"][data-fel="finisare"]');
  await expect(fisa).toHaveAttribute('data-operatie', cheie ?? '');
  await expect(fisa.locator('[data-finisare="freza"] dd')).toContainText('Ø6 mm · bilă');
  await expect(fisa.locator('[data-finisare="pas-lateral"] dd')).toHaveText('2 mm');
  await expect(fisa.locator('[data-finisare="creasta"] dd')).toHaveText('0,172 mm');
  await expect(fisa.locator('[data-finisare="linii"] dd')).toHaveText('la 0°, prin centrele celulelor reliefului');
  await expect(fisa.locator('[data-finisare="adancime"] dd')).toContainText('câte cel mult 3 mm pe trecere');
  await expect(fisa.getByTestId('finisare-nota')).toContainText('secțiunea Tăierea');
  // Doar de citit: nimic de scris în fișă.
  await expect(fisa.locator('input, select, textarea')).toHaveCount(0);
  await rand.locator('[data-nav]').click();
  await expect(rand.locator('[data-nav]')).toHaveAttribute('aria-current', 'true');
  // „A mea”: rândul are mânerul și săgețile ca oricare altul; Exportă îi scrie rangul (fereastra redeschisă pornește în „A mea”).
  await page.locator('[data-ordine="a-mea"]').click();
  await expect(rand.locator('[data-trage]')).toBeVisible();

  // Relieful stă în colțul foii, iar bila (R3) trece cu 2,5 mm de marginea lui: exportul cere întâi confirmarea ieșirii din foaie.
  await page.locator('[data-buton="exporta"]').click();
  const iesire = page.getByTestId('iesire-foaie');
  await expect(iesire).toContainText('2,500 mm');
  await iesire.getByRole('checkbox').check();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  const z: number[] = [];
  for (const l of text.split('\n')) {
    const m = /^G1\b.*Z(-?\d+(?:\.\d+)?)/.exec(l);
    if (m) z.push(Number(m[1]));
  }
  expect(z.length).toBeGreaterThan(100);
  const jos = Math.min(...z);
  // Partea neagră e la 5 mm sub față; bila Ø6 coboară acolo, cu peretele dintre jumătăți și marginea plăcii în jur.
  expect(jos).toBeLessThan(-4.5);
  expect(jos).toBeGreaterThanOrEqual(-5.0001);
  // Două treceri: prima nu coboară sub −3.
  expect(z.some((x) => x <= -3.0001)).toBe(true);
  expect(text).toMatch(/finisarea reliefului/);
  // Rezultatul o cuprinde: rândul ei în tabelul operațiilor (cu numele) și freza ei în tabelul sculelor.
  const rez = page.getByTestId('export-rezumat');
  await expect(rez.locator(`[data-rezumat="operatii"] tr[data-operatie="${cheie ?? ''}"] th`)).not.toHaveText(cheie ?? '');
  await expect(rez.locator('[data-rezumat="scule"] tr[data-scula]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-ordine="a-mea"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Închide' }).click();

  // „Tăiat”: placa simulată cu finisarea.
  await page.locator('[data-editare="vedere-3d"]').click();
  const p = page.getByTestId('panza-3d');
  await expect(p).toHaveAttribute('data-vedere', 'model', { timeout: 30_000 });
  await page.locator('[data-3d-vedere="taiat"]').click();
  await expect(p).toHaveAttribute('data-vedere', 'taiat');
  await expect(p).toHaveAttribute('data-stare', 'gata', { timeout: 60_000 });
});
