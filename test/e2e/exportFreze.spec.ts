/**
 * Freza din „Frezele mele” pe rândurile ferestrei exportului (ADR 0300 §4, felia 16.A↑b-3), în Edge: lista „Din frezele mele”
 * din grupul Freza al fișei oferă doar frezele care merg pe tăietura rândului (plate pe un profil, în V la V-carve); aleasă, rândul
 * primește T-ul, Ø-ul, forma și pasul ei; Exportă scrie originea în document (panoul Tăierea o citește), iar un diametru schimbat
 * de mână face freza „Scrisă de mână” și scoate originea; T-ul ocupat de altă freză a ferestrei trece pe cel mai mic liber.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const fisa = (page: Page, cheie: string): Locator => page.locator(`[data-fisa="op"][data-operatie="${cheie}"]`);
const lista = (f: Locator): Locator => f.locator('[data-camp="freza-biblioteca"]');
const oferite = (f: Locator): Locator => lista(f).locator('option:not([value=""])');
const panou = (page: Page): Locator => page.getByTestId('prop-taierea').locator('[data-camp="freza"] option:checked');

async function exporta(page: Page): Promise<void> {
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await d;
  await page.getByRole('button', { name: 'Închide' }).click();
}

test('pe rând: doar frezele potrivite; aleasă, T, Ø, forma și pasul ei; Exportă scrie originea, iar o schimbare de mână o scoate', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const e1 = fisa(page, 'e1/e1');
  // Freza operației e scrisă de mână (T1 Ø6); pe un profil, doar frezele plate standard, în ordinea bibliotecii.
  await expect(lista(e1).locator('option:checked')).toHaveText('Scrisă de mână');
  await expect(oferite(e1)).toHaveText(['Plată Ø3,175', 'Plată Ø6', 'Plată Ø12']);
  // T6 scris de mână pe rândul ăsta (Ø6) nu e al altei freze: freza rândului pleacă, deci Plată Ø12 își ia T6.
  await e1.locator('[data-camp="scula"]').fill('6');
  await lista(e1).selectOption({ label: 'Plată Ø12' });
  // T6 al bibliotecii (nicio altă freză în fereastră), Ø12, pasul 4.
  await expect(e1.locator('[data-camp="scula"]')).toHaveValue('6');
  await expect(e1.locator('[data-camp="diametru"]')).toHaveValue('12');
  await expect(e1.locator('[data-camp="pas"]')).toHaveValue('4');
  await exporta(page);
  // Originea e în document: panoul Tăierea arată freza din bibliotecă.
  await expect(panou(page)).toHaveText('Plată Ø12');
  // Redeschisă, fereastra o arată pe rând; T-ul schimbat de mână o păstrează, diametrul schimbat de mână nu.
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(lista(e1).locator('option:checked')).toHaveText('Plată Ø12');
  await e1.locator('[data-camp="scula"]').fill('7');
  await expect(lista(e1).locator('option:checked')).toHaveText('Plată Ø12');
  await e1.locator('[data-camp="diametru"]').fill('10');
  await expect(lista(e1).locator('option:checked')).toHaveText('Scrisă de mână');
  await exporta(page);
  await expect(panou(page)).toHaveText('Scrisă de mână');
  // V-carve: doar frezele în V; aleasă V90 Ø12, forma și unghiul ei.
  await page.locator('[data-actiune="export.gcode"]').click();
  await e1.locator('input[data-camp="latura"][value="vcarve"]').check();
  await expect(oferite(e1)).toHaveText(['V60 Ø6', 'V90 Ø12', 'Gravare 30° vârf 0,2 Ø3,175']);
  await lista(e1).selectOption({ label: 'V90 Ø12' });
  await expect(e1.locator('[data-camp="forma-scula"]')).toHaveValue('v');
  await expect(e1.locator('[data-camp="unghi-v"]')).toHaveValue('90');
  await expect(e1.locator('[data-camp="diametru"]')).toHaveValue('12');
  // Unghiul schimbat de mână: altă freză, scrisă de mână.
  await e1.locator('[data-camp="unghi-v"]').fill('60');
  await expect(lista(e1).locator('option:checked')).toHaveText('Scrisă de mână');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('T-ul: al bibliotecii cât e liber; ocupat de altă freză a ferestrei, cel mai mic liber', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  const e1 = fisa(page, 'e1/e1'), e2 = fisa(page, 'e2/e2');
  // Dreptunghiul: T2 Ø8, scrisă de mână. Cercul: Plată Ø6 (T2 în bibliotecă), deci T1, cel mai mic liber.
  await e1.locator('[data-camp="scula"]').fill('2');
  await e1.locator('[data-camp="diametru"]').fill('8');
  await lista(e2).selectOption({ label: 'Plată Ø6' });
  await expect(e2.locator('[data-camp="scula"]')).toHaveValue('1');
  await expect(e2.locator('[data-camp="diametru"]')).toHaveValue('6');
  // Cercul ia Plată Ø12 (T6 în bibliotecă, liber): T6. Dreptunghiul, tot Plată Ø12: T6, al aceleiași freze.
  await lista(e2).selectOption({ label: 'Plată Ø12' });
  await expect(e2.locator('[data-camp="scula"]')).toHaveValue('6');
  await e1.locator('[data-camp="scula"]').fill('6');
  await lista(e1).selectOption({ label: 'Plată Ø12' });
  await expect(e1.locator('[data-camp="scula"]')).toHaveValue('6');
  // Dreptunghiul scris de mână pe T6 cu Ø8 (altă freză decât a cercului): fereastra spune ciocnirea, ca azi.
  await e1.locator('[data-camp="diametru"]').fill('8');
  await expect(lista(e1).locator('option:checked')).toHaveText('Scrisă de mână');
});
