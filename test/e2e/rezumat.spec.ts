import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PROFIL_GRBL_11H } from '../../src/ir/masini/grbl11h.ts';
import { profilDinSetari } from '../../src/ir/masina.ts';
import { estimeazaTimp } from '../../src/sim/timp.ts';
import { adauga } from './ajutor-panza.ts';

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
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
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
  await expect(rez.locator('[data-rezumat="limitat"]')).toContainText('avansul trece de viteza maximă a mașinii');
  await expect(rez.locator('tr[data-operatie]')).toHaveCount(2);
  await expect(rez.locator('tr[data-rand="restul"] td[data-col="timp"]')).toHaveText(/\d+,\d s/);
  await expect(rez.locator('tr[data-rand="total"] td[data-col="taiere"]')).toHaveText(new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(e.total.taiere));
  await expect(rez.locator('[data-rezumat="scule"] tr[data-scula="1"] th')).toHaveText('T1 freza plata, Ø6');
  // Tabelele au nume, iar rândurile antet (cititorul de ecran spune operația lângă fiecare cifră).
  await expect(page.getByRole('table', { name: 'Timpul pe operații' })).toBeVisible();
  await expect(page.getByRole('rowheader', { name: 'Total' })).toBeVisible();
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('`$$` lipit: rezumatul vechi dispare, exportul nou estimează pe mașina lipită; textul rămâne după închidere', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
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
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('.setari-masina summary').click();
  await page.locator('[data-camp="setari-masina"]').fill('$110=5000\n$120=abc\n');
  const text = await exporta(page);
  expect(text).toContain('M30');
  await expect(page.getByTestId('export-rezumat')).toContainText('Fără estimarea timpului: setările $$ lipite, linia 2: $120');
});

test('în engleză: titlul, timpul și rândurile au textele lor', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'en-GB' });
  const page = await ctx.newPage();
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  await exporta(page);
  const rez = page.getByTestId('export-rezumat');
  await expect(rez.locator('h3')).toHaveText('Job summary');
  // Sub un minut, cu o zecimală (punctul englezesc); peste, minute și secunde.
  await expect(rez.locator('[data-rezumat="timp"]')).toHaveText(/^Estimated time: (\d+\.\d s|\d+ min \d\d s)$/);
  await expect(rez.locator('tr[data-rand="restul"] th')).toHaveText('Start and end (safe Z, spindle and its wait, retract)');
  await ctx.close();
});

test('timpul lângă traseu (ADR 0046 §8): după T, cipul spune timpul jobului, același cu rezumatul exportului', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="vedere.traseu"]').click();
  const cip = page.getByTestId('traseu-timp');
  await expect(cip).toHaveText(/^Timpul jobului: \d+ min \d\d s$/);
  await expect(cip).toHaveAttribute('data-sursa', 'implicit');
  await expect(cip).toHaveAttribute('title', /GRBL 1\.1h cu setările din fabrică/);
  const peTraseu = ((await cip.textContent()) ?? '').replace('Timpul jobului: ', '');
  // Exportul aceluiași document, cu montajul stânga-jos, Z0 sus: același timp în rezumat.
  await page.locator('[data-actiune="export.gcode"]').click();
  await exporta(page);
  await expect(page.getByTestId('export-rezumat').locator('[data-rezumat="timp"]')).toHaveText(`Timpul estimat: ${peTraseu}`);
  // `$$` lipit în dialog: cipul trece pe profilul lipit, fără alt calcul al traseului.
  await page.locator('.setari-masina summary').click();
  await page.locator('[data-camp="setari-masina"]').fill(RAPID);
  await page.getByRole('button', { name: 'Închide' }).click();
  await expect(cip).toHaveAttribute('data-sursa', 'setari');
  await expect(cip).not.toHaveText(`Timpul jobului: ${peTraseu}`);
  // Documentul schimbat: traseul e vechi, deci și timpul lui; cipul timpului dispare până la T.
  await adauga(page, 'dreptunghi');
  await expect(page.getByTestId('traseu-stare')).toHaveAttribute('data-stare', 'traseu.vechi');
  await expect(cip).toHaveCount(0);
  // Dreptunghiul nou cade peste primul (regiunea păstrată îl refuză): Ctrl+Z îl scoate, iar T calculează din nou.
  await page.keyboard.press('Control+z');
  await page.locator('[data-actiune="vedere.traseu"]').click();
  await expect(cip).toHaveText(/^Timpul jobului: /);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('timpul lângă traseu, cu un `$$` greșit: cipul spune linia, traseul rămâne desenat', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('.setari-masina summary').click();
  await page.locator('[data-camp="setari-masina"]').fill('$110=5000\n$120=abc\n');
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="vedere.traseu"]').click();
  await expect(page.getByTestId('strat-traseu')).toHaveAttribute('data-varfuri', /^[1-9]/);
  await expect(page.getByTestId('traseu-timp')).toHaveText(/^Fără timpul jobului: setările \$\$ lipite, linia 2: \$120/);
});
