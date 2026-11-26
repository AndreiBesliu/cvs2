/**
 * Felia 3.Aw: Escape închide fereastra deschisă oriunde ar fi focusul, nu doar când stă în ea (ca la „Frezele mele”,
 * 16.A↑b-7, și la fereastra exportului). Butonul apăsat pleacă din pagină sau se oprește sub focus, iar un clic pe un text
 * al ferestrei lasă focusul pe pagină: ascultată doar pe fereastră, tasta se pierdea pe `body`. Fiecare probă pune
 * focusul pe pagină, spune condiția (focusul e pe `body`), apoi apasă Escape.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { deschideBiblioteca } from './ajutor-biblioteca.ts';
import { adauga, deschideMeniulContului } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const lista = (page: Page) => page.getByTestId('lista-vectori');

/** Focusul, căzut pe pagină (ca după un buton care a plecat), cu condiția spusă înaintea tastei. */
async function escapePePagina(page: Page, fereastra: Locator): Promise<void> {
  await expect(fereastra).toBeVisible();
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); });
  expect(await page.evaluate(() => document.activeElement === document.body), 'focusul e pe pagină').toBe(true);
  await page.keyboard.press('Escape');
  await expect(fereastra).toHaveCount(0);
}

test('„Așază pe foi”: Escape o închide și cu focusul pe pagină', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-foaie-meniu="f1"]').click();
  await lista(page).locator('[data-meniu-foaie="f1"] [data-meniu-foaie-articol="aseaza"]').click();
  await escapePePagina(page, page.getByTestId('dialog-asezare'));
});

test('Setări: Escape o închide și cu focusul pe pagină', async ({ page }) => {
  await page.goto('/');
  await (await deschideMeniulContului(page)).locator('[data-meniu-cont="setari"]').click();
  await escapePePagina(page, page.getByTestId('dialog-setari'));
});

test('raportul foilor: Escape îl închide și cu focusul pe pagină', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="import.svg"]').focus();
  await page.keyboard.press('Control+k');
  await page.locator('[id="paleta-export.raport"]').click();
  await escapePePagina(page, page.getByTestId('dialog-raport'));
});

test('Aspectul: Escape o închide și cu focusul pe pagină, cu alegerea de dinainte', async ({ page }) => {
  await page.goto('/');
  await (await deschideMeniulContului(page)).locator('[data-meniu-cont="aspect"]').click();
  await escapePePagina(page, page.getByTestId('dialog-aspect'));
  await expect(page.locator('html')).toHaveAttribute('data-aranjament', 'modern');
});

test('o fereastră a extensiilor (adresa pachetului): Escape o închide și cu focusul pe pagină, biblioteca rămâne', async ({ page }) => {
  await page.goto('/');
  const b = await deschideBiblioteca(page);
  await b.locator('[data-extensii="din-adresa"]').click();
  await escapePePagina(page, page.getByTestId('extensii-adresa'));
  await expect(b).toBeVisible();
});
