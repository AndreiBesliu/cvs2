/**
 * Supracursa în fereastra exportului (ADR 0176, felia 12.1↑f-3) și bifa tăieturilor cât foaia (ADR 0177, felia 12.1↑f-4), pe
 * dreptunghiul de 30 × 20 din (20, 20), cu freza plată Ø6 a operației și foaia de 18. Un fișier al lor, ca otrăvurile ferestrei
 * (`test/otravuri/12.1f-3.py`, `12.1f-4.py`) să ruleze doar probele astea.
 */
import { test, expect, type Download, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { masoaraPotrivireaDreapta } from '../oracles/incrustatieDreapta.ts';
import type { DesenO } from '../oracles/incrustatie.ts';
import type { SculaOracol } from '../oracles/simulare.ts';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

/** Dreptunghiul de 30 × 20 din (20, 20): „Adaugă dreptunghi” (100 × 60), cu lățimea și înălțimea scrise în panou. */
async function dreptunghiMic(page: Page): Promise<void> {
  await adauga(page, 'dreptunghi');
  const forma = page.getByTestId('prop-forma');
  for (const [camp, v] of [['forma-latime', '30'], ['forma-inaltime', '20']] as const) {
    const c = forma.locator(`[data-camp="${camp}"]`);
    await c.fill(v);
    await c.press('Enter');
  }
}
const DESEN: DesenO = [[[20, 20], [50, 20], [50, 40], [20, 40]]];

/** Sculele bucăților unui program cu o singură freză plată Ø6: câte bucăți are (pornirea, apoi fiecare `T… M6`). */
const scule = (text: string): SculaOracol[] => Array.from({ length: 1 + [...text.matchAll(/^T\d+ M6$/gm)].length }, () => ({ tip: 'plata', diametru: 6 }));

/** Programul foii și al dopului, din descărcări (două: întâi foaia, apoi dopul). */
async function programe(descarcari: readonly Download[]): Promise<{ readonly locas: string; readonly dop: string }> {
  const dop = descarcari.find((d) => /-dop-1\b/.test(d.suggestedFilename()));
  const foaie = descarcari.find((d) => !/-dop-/.test(d.suggestedFilename()));
  if (!dop || !foaie) throw new Error(`descărcările: ${descarcari.map((d) => d.suggestedFilename()).join(', ')}`);
  return { locas: readFileSync(await foaie.path(), 'ascii'), dop: readFileSync(await dop.path(), 'ascii') };
}

/** Fundul celei mai adânci treceri a unui program (Z-ul cel mai mic), în mm. */
const zMinim = (s: string): number => Math.min(...[...s.matchAll(/Z(-?\d+\.\d+)/g)].map((x) => Number(x[1])));

/**
 * Câmpul de lângă Z0: implicit 0. Un text greșit (2,5, −1, gol, „a”) e marcat, iar Exportă e oprit, cu motivul. Cu 0,5 și gaura
 * cu dopul decupat (marginea 8), Exportă scrie gaura până la 18 + 0,5 și decuparea dopului până la 20 + 0,5, iar placa dopului
 * rămâne exact 20. Oracolul pereților drepți, pe octeții din browser, cere tot jocul 0,1 ± 0,02 pe tot conturul și nicio
 * interferență; gaura (D) e de 18,5, iar șanțul decupării de 20,5. O supracursă schimbată după export scoate rezultatul vechi;
 * valoarea rămâne la redeschiderea ferestrei.
 */
test('supracursa: lângă Z0, valorile greșite oprite, gaura și decuparea dopului cu 0,5 mai jos, valoarea păstrată', async ({ page }) => {
  await page.goto('/');
  await dreptunghiMic(page);
  await page.locator('[data-actiune="export.gcode"]').click();
  const camp = page.locator('[data-camp="supracursa"]');
  await expect(camp).toHaveValue('0');
  await expect(camp).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByTestId('export-invalid')).toHaveCount(0);
  for (const gresit of ['2,5', '-1', '', 'a']) {
    await camp.fill(gresit);
    await expect(camp, gresit).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId('export-invalid'), gresit).toContainText('Supracursa trebuie să fie un număr între 0 și 2 mm.');
    await expect(page.locator('[data-buton="exporta"]'), gresit).toBeDisabled();
  }
  await camp.fill('0,5');
  await expect(camp).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByTestId('export-invalid')).toHaveCount(0);
  // Gaura cu dopul decupat, cu marginea 8 (freza Ø6 a locașului).
  await page.locator('tr[data-operatie]').first().locator('[data-camp="latura"]').selectOption('incrustatie-drept');
  const inc = page.locator('tr[data-detalii]').first().locator('[data-incrustatie][data-fel="drept"]');
  await inc.locator('[data-camp="inc-locas"]').selectOption('gaura');
  await inc.locator('[data-camp="inc-dop"]').selectOption('decupat');
  await inc.locator('[data-camp="inc-margine"]').fill('8');

  const descarcari: Download[] = [];
  page.on('download', (d) => { descarcari.push(d); });
  await page.locator('[data-buton="exporta"]').click();
  await expect(page.getByTestId('export-dopuri')).toContainText('pe o placă de 46 × 36 mm, groasă de exact 20 mm');
  await expect.poll(() => descarcari.length).toBe(2);
  const { locas, dop } = await programe(descarcari);
  expect([zMinim(locas), zMinim(dop)], 'gaura și decuparea dopului, fiecare cu 0,5 sub placa ei').toEqual([-18.5, -20.5]);
  const m = masoaraPotrivireaDreapta({ text: locas, scule: scule(locas) }, { text: dop, scule: scule(dop) }, DESEN,
    { D: 18.5, h: 20, dop: 'decupat', margine: 8, celula: 0.1 });
  const unde = `jocul ${JSON.stringify(m.joc)}, interferența ${m.interferenta} din ${m.nDop}, D ${m.adancime}, șanțul ${m.inaltime}`;
  expect(m.joc.n, unde).toBeGreaterThan(100);
  expect(m.joc.min, unde).toBeGreaterThanOrEqual(0.08);
  expect(m.joc.max, unde).toBeLessThanOrEqual(0.12);
  expect(m.interferenta, unde).toBe(0);
  expect(Math.abs(m.adancime - 18.5), unde).toBeLessThanOrEqual(0.05);
  expect(Math.abs(m.inaltime - 20.5), unde).toBeLessThanOrEqual(0.05);

  // Altă supracursă după export: rezultatul vechi (fișierele, dopurile) nu mai e al ei, deci pleacă.
  await camp.fill('0,6');
  await expect(page.getByTestId('export-dopuri')).toHaveCount(0);
  await expect(page.getByTestId('export-stare')).toHaveCount(0);
  // Valoarea rămâne la redeschiderea ferestrei (o ține aplicația, nu proiectul).
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-camp="supracursa"]')).toHaveValue('0,6');
});

/**
 * Fără supracursă (0, implicit), gaura merge exact la grosimea foii (18), iar decuparea dopului exact prin placa lui (20): ca
 * înainte de câmp.
 */
test('supracursa 0: gaura și decuparea dopului exact prin plăcile lor, ca înainte', async ({ page }) => {
  await page.goto('/');
  await dreptunghiMic(page);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-camp="supracursa"]')).toHaveValue('0');
  await page.locator('tr[data-operatie]').first().locator('[data-camp="latura"]').selectOption('incrustatie-drept');
  const inc = page.locator('tr[data-detalii]').first().locator('[data-incrustatie][data-fel="drept"]');
  await inc.locator('[data-camp="inc-locas"]').selectOption('gaura');
  await inc.locator('[data-camp="inc-dop"]').selectOption('decupat');
  await inc.locator('[data-camp="inc-margine"]').fill('8');
  const descarcari: Download[] = [];
  page.on('download', (d) => { descarcari.push(d); });
  await page.locator('[data-buton="exporta"]').click();
  await expect.poll(() => descarcari.length).toBe(2);
  const { locas, dop } = await programe(descarcari);
  expect([zMinim(locas), zMinim(dop)]).toEqual([-18, -20]);
});

/**
 * Bifa „și tăieturile cât foaia” (ADR 0177, felia 12.1↑f-4), lângă supracursă: implicit pusă, oprită fără supracursă. Cu 0,5,
 * profilul dreptunghiului scris cât foaia (18) coboară la 18,5; debifată, la 18 (rezultatul vechi pleacă la schimbare). În
 * proiect, adâncimea rămâne 18; bifa scoasă rămâne scoasă la redeschiderea ferestrei.
 */
test('bifa tăieturilor cât foaia: implicit pusă, oprită fără supracursă; profilul de 18 la 18,5, debifată la 18', async ({ page }) => {
  await page.goto('/');
  await dreptunghiMic(page);
  await page.locator('[data-actiune="export.gcode"]').click();
  const bifa = page.locator('[data-camp="supracursa-prin-foaie"]');
  await expect(bifa).toBeChecked();
  await expect(bifa).toBeDisabled();
  await page.locator('[data-camp="supracursa"]').fill('0,5');
  await expect(bifa).toBeEnabled();
  await expect(bifa).toBeChecked();
  const rand = page.locator('tr[data-operatie]').first();
  await rand.locator('[data-camp="adancime"]').fill('18');
  const descarcari: Download[] = [];
  page.on('download', (d) => { descarcari.push(d); });
  const exporta = async (n: number): Promise<string> => {
    await page.locator('[data-buton="exporta"]').click();
    await expect.poll(() => descarcari.length).toBe(n);
    return readFileSync(await descarcari[n - 1]!.path(), 'ascii');
  };
  expect(zMinim(await exporta(1)), 'bifată: 18 + 0,5').toBe(-18.5);
  await bifa.uncheck();
  await expect(page.getByTestId('export-stare')).toHaveCount(0);
  expect(zMinim(await exporta(2)), 'debifată: cât e scrisă').toBe(-18);
  // În proiect, adâncimea e cea scrisă; bifa scoasă rămâne scoasă (o ține aplicația).
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('tr[data-operatie]').first().locator('[data-camp="adancime"]')).toHaveValue('18');
  await expect(page.locator('[data-camp="supracursa-prin-foaie"]')).not.toBeChecked();
  await expect(page.locator('[data-camp="supracursa"]')).toHaveValue('0,5');
});
