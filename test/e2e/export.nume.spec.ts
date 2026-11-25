/**
 * Numele fișierului în fereastra exportului (ADR 0291 §5, felia 28.8↑n): propunerea urmează colțul și numele scris al foii, omul
 * îl schimbă înainte de Exportă, iar descărcarea și Rezultatul îl poartă; un nume pe care sistemele de fișiere nu-l primesc
 * oprește exportul, cu „Du-mă la” în câmp. Pe RichAuto (stick FAT), numele e al controlerului.
 */
import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const camp = (page: Page) => page.locator('[data-camp="nume-fisier"]');

test('propunerea urmează colțul; un nume greșit oprește exportul; scris de om, descărcarea și Rezultatul îl poartă', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(camp(page)).toHaveValue('cncvs2-stanga-jos');
  await expect(page.locator('[data-nume-rezultat]')).toHaveText('se descarcă cncvs2-stanga-jos.nc');
  await page.locator('[data-camp="origine"]').selectOption('dreapta-sus');
  await expect(camp(page)).toHaveValue('cncvs2-dreapta-sus');
  // Un caracter oprit: Exportă oprit, greșeala în grupul ei, punctul pe „Mașina și fișierul”, „Du-mă la” duce în câmp.
  await camp(page).fill('raft/1');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.locator('[data-grup="fisier"] [data-greseala]')).toContainText('< > : " / \\ | ? *');
  await expect(page.locator('[data-nav="masina"]')).toHaveAttribute('data-gresit', '');
  await camp(page).fill('');
  await expect(page.locator('[data-grup="fisier"] [data-greseala]')).toContainText('e gol');
  await page.locator('[data-camp="origine"]').focus();
  await page.locator('[data-du="masina"]').click();
  await expect(camp(page)).toBeFocused();
  // Scris de om: colțul nu-l mai mută; descărcat așa, iar Rezultatul spune numele.
  await camp(page).fill('Raft lateral');
  await page.locator('[data-camp="origine"]').selectOption('stanga-jos');
  await expect(camp(page)).toHaveValue('Raft lateral');
  await expect(page.locator('[data-nume-rezultat]')).toHaveText('se descarcă Raft lateral.nc');
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  expect((await d).suggestedFilename()).toBe('Raft lateral.nc');
  await expect(page.getByTestId('export-stare')).toContainText('Descărcat Raft lateral.nc:');
  await expect(page.getByTestId('export-stare')).toHaveAttribute('data-fisier', 'Raft lateral.nc');
});

test('cu numele foii scris, propunerea vine din el; RichAuto își păstrează numele scurt', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  const lista = page.getByTestId('lista-vectori');
  await lista.locator('[data-foaie-meniu="f1"]').click();
  await lista.locator('[data-meniu-foaie="f1"] [data-meniu-foaie-articol="proprietati"]').click();
  const nume = page.locator('[data-camp="foaie-nume"]');
  await nume.fill('Ușă Țarc 2');
  await nume.press('Enter');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(camp(page)).toHaveValue('usa-tarc-2');
  // Fără nicio schimbare, descărcarea poartă propunerea.
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  expect((await d).suggestedFilename()).toBe('usa-tarc-2.nc');
  // RichAuto citește de pe stick doar nume scurte: câmpul e oprit, iar fișierul rămâne CNCVS2.NC.
  await page.locator('[data-camp="post"]').selectOption('richauto');
  await expect(camp(page)).toBeDisabled();
  await expect(page.locator('[data-nume-rezultat]')).toContainText('CNCVS2.NC');
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  const d2 = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  expect((await d2).suggestedFilename()).toBe('CNCVS2.NC');
});
