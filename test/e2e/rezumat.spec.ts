import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PROFIL_GRBL_11H } from '../../src/ir/masini/grbl11h.ts';
import { profilDinSetari } from '../../src/ir/masina.ts';
import { estimeazaTimp } from '../../src/sim/timp.ts';

/**
 * Rezumatul jobului în dialogul exportului (ADR 0046): timpul estimat al fișierului descărcat, pe operații și pe sculă, cu
 * implicitele GRBL 1.1h sau cu răspunsul la `$$` lipit; calculul vine cu exportul, la cerere.
 */
test.use({ locale: 'ro-RO' });

const RAPID = '$110=5000.000\n$111=5000.000\n$112=1000.000\n$120=500.000\n$121=500.000\n$122=200.000\nok\n';

/** Durata cum o scrie dialogul: minute și secunde (rotunjite), peste un minut. */
function minSec(s: number): string {
  const r = Math.round(s);
  return `${Math.floor(r / 60)} min ${String(r % 60).padStart(2, '0')} s`;
}

async function exporta(page: Page): Promise<string> {
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  return readFileSync(await (await descarcare).path(), 'ascii');
}

test('rezumatul: timpul fișierului descărcat, pe implicitele GRBL 1.1h, cu fiecare operație, restul, totalul și scula', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await page.locator('[data-actiune="export.gcode"]').click();
  const text = await exporta(page);
  const e = estimeazaTimp(text, PROFIL_GRBL_11H);
  expect(e.ok).toBe(true);
  if (!e.ok) return;
  const rez = page.getByTestId('export-rezumat');
  await expect(rez.locator('[data-rezumat="timp"]')).toHaveText(`Timpul estimat: ${minSec(e.total.secunde)}`);
  await expect(rez.locator('[data-rezumat="masina"]')).toHaveAttribute('data-sursa', 'implicit');
  await expect(rez.locator('[data-rezumat="masina"]')).toContainText('viteza maximă X 500, Y 500, Z 500 mm/min');
  // F1000 trece de $110 = 500: spus pe față.
  await expect(rez.locator('[data-rezumat="limitat"]')).toContainText('controlerul le încetinește');
  await expect(rez.locator('tr[data-operatie]')).toHaveCount(2);
  await expect(rez.locator('tr[data-rand="restul"] td[data-col="timp"]')).toHaveText(/\d+,\d s/);
  await expect(rez.locator('tr[data-rand="total"] td[data-col="taiere"]')).toHaveText(new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(e.total.taiere));
  await expect(rez.locator('[data-rezumat="scule"] tr[data-scula="1"] td').first()).toHaveText('T1 freza plata, Ø6');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('`$$` lipit: rezumatul vechi dispare, exportul nou estimează pe mașina lipită; textul rămâne după închidere', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await exporta(page);
  const rez = page.getByTestId('export-rezumat');
  const implicit = (await rez.locator('[data-rezumat="timp"]').textContent()) ?? '';
  await page.locator('.setari-masina summary').click();
  await page.locator('[data-camp="setari-masina"]').fill(RAPID);
  // Un parametru schimbat: rezultatul vechi nu mai e al lui.
  await expect(rez).toHaveCount(0);
  const text = await exporta(page);
  const p = profilDinSetari(RAPID, PROFIL_GRBL_11H);
  expect(p.ok).toBe(true);
  if (!p.ok) return;
  const e = estimeazaTimp(text, p.profil);
  expect(e.ok).toBe(true);
  if (!e.ok) return;
  await expect(rez.locator('[data-rezumat="masina"]')).toHaveAttribute('data-sursa', 'setari');
  await expect(rez.locator('[data-rezumat="masina"]')).toContainText('viteza maximă X 5.000, Y 5.000, Z 1.000 mm/min');
  await expect(rez.locator('[data-rezumat="timp"]')).toHaveText(`Timpul estimat: ${e.total.secunde < 59.95 ? `${new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(e.total.secunde)} s` : minSec(e.total.secunde)}`);
  expect(await rez.locator('[data-rezumat="timp"]').textContent()).not.toBe(implicit);
  await expect(rez.locator('[data-rezumat="limitat"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-camp="setari-masina"]')).toHaveValue(RAPID);
});

test('`$$` greșit: programul se descarcă oricum, rezumatul spune linia greșită', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('.setari-masina summary').click();
  await page.locator('[data-camp="setari-masina"]').fill('$110=5000\n$120=abc\n');
  const text = await exporta(page);
  expect(text).toContain('M30');
  await expect(page.getByTestId('export-rezumat')).toContainText('Fără estimarea timpului: setările mașinii, linia 2');
});

test('în engleză: titlul, timpul și rândurile au textele lor', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'en-GB' });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await exporta(page);
  const rez = page.getByTestId('export-rezumat');
  await expect(rez.locator('h3')).toHaveText('Job summary');
  await expect(rez.locator('[data-rezumat="timp"]')).toHaveText(/^Estimated time: \d+ min \d\d s$/);
  await expect(rez.locator('tr[data-rand="restul"] td').first()).toHaveText('Start and end (safe Z, spindle and its wait, retract)');
  await ctx.close();
});
