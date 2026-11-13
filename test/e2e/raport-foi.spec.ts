/**
 * Felia 11.6↑ (ADR 0210 §6): raportul foilor și lista de tăiere. Un dreptunghi 100 × 60 (profilul exterior de 3 mm, pe o
 * foaie de 18: nu o decupează, deci mărimea e a desenului), copia legată a foii și o foaie nouă cu un cerc R15. Din paletă:
 * foile identice o dată (×2), cât din foaie e folosit, operațiile, piesele; totalurile și foile pe material; mărimea
 * desenului la un clic; CSV-ul cu `;` (virgula zecimală) și cu `,`; tipărirea doar cu raportul. Din fereastra exportului:
 * colțul și Z0 alese acolo.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const lista = (page: Page) => page.getByTestId('lista-vectori');
const raport = (page: Page) => page.getByTestId('dialog-raport');

/** CSV-ul descărcat din raport: numele și rândurile (fără BOM-ul de la început, care trebuie să fie acolo). */
async function csv(page: Page): Promise<{ nume: string; randuri: string[] }> {
  const d = page.waitForEvent('download');
  await raport(page).locator('[data-raport="csv"]').click();
  const x = await d;
  const text = readFileSync(await x.path(), 'utf8');
  expect(text.charCodeAt(0)).toBe(0xfeff);
  return { nume: x.suggestedFilename(), randuri: text.slice(1).split(String.fromCharCode(13, 10)) };
}

test('raportul foilor: din paletă și din export; foile identice ×2, piesele, totalurile, materialele, CSV-ul și tipărirea', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-foaie-meniu="f1"]').click();
  await lista(page).locator('[data-meniu-foaie="f1"] [data-meniu-foaie-articol="foaie.duplica-legat"]').click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(3);
  await adauga(page, 'cerc');

  // Din paletă (Ctrl+K), cu focusul pe bară, ca omul după un clic pe ea.
  await page.locator('[data-actiune="import.svg"]').focus();
  await page.keyboard.press('Control+k');
  await page.locator('[id="paleta-export.raport"]').click();
  await expect(raport(page)).toBeVisible();
  await expect(raport(page).locator('#raport-titlu')).toHaveText('Raportul foilor și lista de tăiere');
  await expect(raport(page).locator('.nota').first()).toHaveText('Z0: fața de sus a materialului; originea în colțul stânga-jos (ale exportului).');
  const foi = raport(page).locator('[data-raport-foaie]');
  await expect(foi).toHaveCount(2);
  const [unu, trei] = [foi.nth(0), foi.nth(1)];
  await expect(unu.locator('h3')).toHaveText('Foaia 1 ×2 (și Foaia 2)');
  await expect(unu.locator('[data-raport="foaie"]')).toHaveText('fără material · 300 × 200 × 18 mm · folosită 10 %');
  await expect(unu.locator('[data-raport="operatii"]')).toHaveText('Operațiile: profil exterior, T1 Ø6, 3 mm, 1 trecere');
  await expect(unu.locator('tbody tr')).toHaveCount(1);
  await expect(unu.locator('tbody tr').first().locator('th, td')).toHaveText(['dreptunghi', '1', '100 × 60 (desen)', '0°', '']);
  await expect(unu.locator('img')).toHaveAttribute('src', /^data:image\/svg\+xml/);
  await expect(trei.locator('h3')).toHaveText('Foaia 3');
  await expect(trei.locator('[data-raport="foaie"]')).toHaveText('fără material · 300 × 200 × 18 mm · folosită 1,5 %');
  await expect(trei.locator('[data-raport="operatii"]')).toHaveText('Operațiile: profil interior, T1 Ø6, 8 mm, 2 treceri');
  await expect(trei.locator('tbody tr').first().locator('th, td')).toHaveText(['cerc', '1', '30 × 30 (desen)', '0°', '']);
  // Totalurile pe piesă și foile pe material.
  await expect(raport(page).locator('[data-raport="totaluri"] tbody tr')).toHaveCount(2);
  await expect(raport(page).locator('[data-raport="totaluri"] tbody tr').nth(0).locator('th, td')).toHaveText(['dreptunghi', '2', '100 × 60 (desen)', 'fără material', '1, 2']);
  await expect(raport(page).locator('[data-raport="totaluri"] tbody tr').nth(1).locator('th, td')).toHaveText(['cerc', '1', '30 × 30 (desen)', 'fără material', '3']);
  await expect(raport(page).locator('[data-raport="materiale"] tbody tr').first().locator('th, td')).toHaveText(['fără material', '300 × 200 × 18', '3']);
  // Mărimea desenului, la un clic: fără marcaj.
  await raport(page).locator('[data-raport-marime="desen"]').click();
  await expect(raport(page).locator('[data-raport-marime="desen"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(unu.locator('tbody tr').first().locator('td').nth(1)).toHaveText('100 × 60');

  // CSV-ul: `;` cu virgula zecimală (implicit), apoi `,` cu punctul.
  const punctVirgula = await csv(page);
  expect(punctVirgula.nume).toBe('cncvs2-lista-de-taiere.csv');
  expect(punctVirgula.randuri.slice(0, 3)).toEqual([
    'Foaia;De câte ori;Materialul;Lățimea foii (mm);Înălțimea foii (mm);Grosimea (mm);Folosită (%);Piesa;Câte;Lățimea (mm);Înălțimea (mm);Mărimea;Rotirea;Valorile',
    'Foaia 1;2;;300;200;18;10;dreptunghi;1;100;60;desen;0°;',
    'Foaia 3;1;;300;200;18;1,5;cerc;1;30;30;desen;0°;',
  ]);
  await raport(page).locator('[data-raport-separator=","]').click();
  const virgula = await csv(page);
  expect(virgula.randuri[2]).toBe('Foaia 3,1,,300,200,18,1.5,cerc,1,30,30,desen,0°,');

  // Tipărirea: fereastra browserului (aici, numărată) și, la tipar, doar raportul, fără butoane.
  await page.evaluate(() => {
    const w = window as unknown as { tiparit: number };
    w.tiparit = 0;
    window.print = () => { w.tiparit++; };
  });
  await raport(page).locator('[data-raport="tipareste"]').click();
  expect(await page.evaluate(() => (window as unknown as { tiparit: number }).tiparit)).toBe(1);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.aplicatie')).toBeHidden();
  await expect(raport(page).locator('#raport-titlu')).toBeVisible();
  await expect(raport(page).locator('[data-raport="csv"]')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await expect(page.locator('.aplicatie')).toBeVisible();
  // Escape închide raportul.
  await raport(page).locator('[data-raport="csv"]').focus();
  await page.keyboard.press('Escape');
  await expect(raport(page)).toHaveCount(0);

  // Din fereastra exportului: colțul și Z0 alese acolo; exportul se închide.
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('[data-camp="origine"]').selectOption('dreapta-sus');
  await page.locator('[data-camp="z0"]').selectOption('jos');
  await page.locator('[data-buton="raport"]').click();
  await expect(raport(page)).toBeVisible();
  await expect(page.locator('#export-titlu')).toHaveCount(0);
  await expect(raport(page).locator('.nota').first()).toHaveText('Z0: fața de jos (masa de sacrificiu); originea în colțul dreapta-sus (ale exportului).');
  await raport(page).locator('[data-raport="inchide"]').click();
  await expect(raport(page)).toHaveCount(0);
  expect(erori).toEqual([]);
});
