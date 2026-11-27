import { test, expect, type Page } from '@playwright/test';
import { deschideMeniulContului } from './ajutor-panza.ts';
import { importaRelief, rolRelief3d } from './ajutor-relief.ts';

/**
 * Freza din „Frezele mele” pe rândurile reliefului din fereastra exportului (felia 18.1↑d-5, ADR 0316), în Edge: relieful de
 * 64 × 32 px cu rolul „Relief 3D”; o bilă Ø6 din catalog pusă în bibliotecă (T7, pasul lateral 10 %, deci 0,6 mm):
 * - pe finisare, lista oferă plata, V-ul și bila; pe degroșare, doar plata;
 * - aleasă pe finisare, bila își aduce T-ul, diametrul, forma, pasul și pasul lateral; Exportă o scrie cu originea (fereastra
 *   redeschisă o arată aleasă);
 * - schimbată apoi în bibliotecă, rândul spune ce s-a schimbat, iar „Ia valorile noi” o aduce la zi;
 * - un diametru schimbat de mână face freza scrisă de mână.
 */
test.use({ locale: 'ro-RO' });

/** Pune în bibliotecă freza catalogului `id`, apoi închide fereastra. */
async function dinCatalog(page: Page, id: string): Promise<void> {
  const meniu = await deschideMeniulContului(page);
  await meniu.locator('[data-meniu-cont="freze"]').click();
  const f = page.getByRole('dialog', { name: 'Frezele mele' });
  await expect(f.locator('[data-freze="stare"]')).not.toContainText(/Se citește/u);
  await f.locator('[data-freze="catalog-arata"]').click();
  await f.locator(`[data-catalog="${id}"]`).click();
  await f.locator('[data-freze="fisa"] [data-freze="catalog-pune"]').click();
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Puse: 1 · erau deja: 0');
  await page.keyboard.press('Escape');
  await expect(f).toHaveCount(0);
}

/** În „Frezele mele”: freza cu numele dat, cu câmpurile date schimbate; apoi fereastra se închide. */
async function schimbaInBiblioteca(page: Page, nume: string, campuri: Readonly<Record<string, string>>): Promise<void> {
  const meniu = await deschideMeniulContului(page);
  await meniu.locator('[data-meniu-cont="freze"]').click();
  const f = page.getByRole('dialog', { name: 'Frezele mele' });
  await expect(f.locator('[data-freze="stare"]')).not.toContainText(/Se citește/u);
  await f.locator('.freze-rand-nume').getByText(nume, { exact: true }).click();
  await f.locator('[data-freze="fisa"] [data-freze="editeaza"]').click();
  for (const [c, v] of Object.entries(campuri)) await f.locator(`[data-freze-camp="${c}"]`).fill(v);
  await f.locator('[data-freze="salveaza"]').click();
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Salvat');
  await page.keyboard.press('Escape');
  await expect(f).toHaveCount(0);
}

test('rândurile reliefului: freza din „Frezele mele” aleasă, scrisă de Exportă, nota bibliotecii și „Ia valorile noi”', async ({ page }) => {
  await page.goto('/');
  await importaRelief(page);
  await rolRelief3d(page);
  await dinCatalog(page, 'cat-bila-6');

  await page.locator('[data-actiune="export.gcode"]').click();
  const randFin = page.locator('[data-nav-op][data-fel="finisare"]'), randDeg = page.locator('[data-nav-op][data-fel="degrosare"]');
  const fin = page.locator('[data-fisa="op"][data-fel="finisare"]'), deg = page.locator('[data-fisa="op"][data-fel="degrosare"]');
  await randDeg.locator('[data-nav]').click();
  const listaDeg = deg.locator('[data-camp="relief-biblioteca"]');
  // Degroșarea: doar frezele plate (ADR 0313 §1).
  await expect(listaDeg.locator('option').filter({ hasText: /^Plată Ø6$/u })).toHaveCount(1);
  await expect(listaDeg.locator('option', { hasText: 'Bilă' })).toHaveCount(0);
  await expect(listaDeg.locator('option', { hasText: 'V60' })).toHaveCount(0);

  await randFin.locator('[data-nav]').click();
  const lista = fin.locator('[data-camp="relief-biblioteca"]');
  // Finisarea: plata, V-ul și bila. Bila Ø6 scrisă de mână a rolului e la fel cu cea din bibliotecă: recunoscută.
  await expect(lista.locator('option:checked')).toHaveText('Scrisă de mână (ca „Bilă Ø6”)');
  for (const nume of ['Plată Ø6', 'V60 Ø6', 'Bilă Ø6']) await expect(lista.locator('option').filter({ hasText: new RegExp(`^${nume}$`, 'u') })).toHaveCount(1);
  await lista.selectOption({ label: 'Bilă Ø6' });
  await expect(fin.locator('[data-camp="relief-scula"]')).toHaveValue('7');
  await expect(fin.locator('[data-camp="relief-diametru"]')).toHaveValue('6');
  await expect(fin.locator('[data-camp="relief-forma"]')).toHaveValue('bila');
  await expect(fin.locator('[data-camp="relief-pas-lateral"]')).toHaveValue('0,6');
  await expect(fin.locator('[data-camp="relief-pas"]')).toHaveValue('3');
  await expect(page.locator('[data-nota^="biblioteca-"]')).toHaveCount(0);

  // Exportă: relieful stă în colțul foii, deci întâi confirmarea ieșirii din foaie.
  await page.locator('[data-buton="exporta"]').click();
  const iesire = page.getByTestId('iesire-foaie');
  await expect(iesire).toBeVisible();
  await iesire.getByRole('checkbox').check();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await descarcare;
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  await page.getByRole('button', { name: 'Închide' }).click();

  // Fereastra redeschisă arată freza din bibliotecă, la zi.
  await page.locator('[data-actiune="export.gcode"]').click();
  await randFin.locator('[data-nav]').click();
  await expect(lista.locator('option:checked')).toHaveText('Bilă Ø6');
  await expect(fin.locator('[data-camp="relief-scula"]')).toHaveValue('7');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-fisa="op"]')).toHaveCount(0);

  // Schimbată în bibliotecă: nota spune ce diferă; „Ia valorile noi” păstrează T-ul și pașii.
  await schimbaInBiblioteca(page, 'Bilă Ø6', { avans: '1500' });
  await page.locator('[data-actiune="export.gcode"]').click();
  await randFin.locator('[data-nav]').click();
  const nota = fin.locator('[data-nota="biblioteca-schimbata"]');
  await expect(nota).toContainText('avansul 1.500');
  await nota.locator('[data-buton="ia-valorile-noi"]').click();
  await expect(nota).toHaveCount(0);
  await expect(fin.locator('[data-camp="relief-scula"]')).toHaveValue('7');
  await expect(fin.locator('[data-camp="relief-pas-lateral"]')).toHaveValue('0,6');

  // Un diametru schimbat de mână: freza scrisă de mână.
  await fin.locator('[data-camp="relief-diametru"]').fill('5');
  await expect(lista.locator('option:checked')).toHaveText('Scrisă de mână');
  await fin.locator('[data-camp="relief-diametru"]').fill('6');
  // La fel cu bila din bibliotecă: recunoscută, fără să fie aleasă.
  await expect(lista.locator('option:checked')).toHaveText('Scrisă de mână (ca „Bilă Ø6”)');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
