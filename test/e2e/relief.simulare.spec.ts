import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { citestePng } from '../../src/relief/png16.ts';
import { documentSalvat } from './ajutor-document.ts';
import { importaRelief, rolRelief3d } from './ajutor-relief.ts';

/**
 * Simularea salvată ca strat, în aplicația construită (ADR 0322 §5.4, felia 18.1↑g-3): relieful din imagine (64 × 32 mm, o celulă
 * de 1 mm, jumătatea stângă la 5 mm, cea dreaptă la 0, vârful la fața plăcii), cu „Relief 3D” (degroșarea cu plata Ø6, apoi
 * finisarea cu bila Ø6). „Strat din simulare” pune un strat nou, ascuns, „înlocuiește”, numit „Tăietura simulată”, deci Z-ul
 * compusului nu se schimbă. Doar el arătat și exportat ca PNG pe 16 biți, e tăietura, nu modelul: lângă peretele dintre
 * jumătăți (x = 32), bila Ø6 nu ajunge la fund, deci în celula 33, unde modelul e la 0, rămâne lemn (cel puțin 3 − √(9 − 1,5²) =
 * 0,40 mm, cu peretele drept; modelul, interpolat între centre, e o pantă de la 31,5 la 32,5, deci rămâne ceva mai mult); departe
 * de pereți, la fund, doar creasta (sub 0,1 mm); sus, fața (5). Valorile exacte le judecă proba unitară (`relief.simulare.test.ts`).
 */

test.use({ locale: 'ro-RO' });

type Strat = { readonly id: string; readonly nume?: string; readonly mod: string; readonly vizibil: boolean; readonly dale: string };
const straturiSalvate = async (page: Page, rev: number): Promise<Strat[]> => {
  const d = JSON.parse(await documentSalvat(page, rev)) as { piese: Array<{ radacina: { copii: Array<{ forma: { straturi?: Strat[] } }> } }> };
  return d.piese[0]?.radacina.copii[0]?.forma.straturi ?? [];
};

test('fără operații, nimic nu se taie: refuzul lucrării, spus, iar relieful rămâne cu un strat', async ({ page }) => {
  await page.goto('/');
  await importaRelief(page);
  await page.locator('[data-buton="relief-din-simulare"]').click();
  await expect(page.getByTestId('relief-simulare-stare')).toHaveAttribute('data-stare', 'refuz', { timeout: 30_000 });
  await expect(page.getByTestId('relief-simulare-stare')).toContainText('Simularea n-a mers: nicio formă');
  await expect(page.getByTestId('prop-relief-straturi').locator('li')).toHaveCount(1);
});

test('cu „Relief 3D”: stratul din simulare e ascuns și „înlocuiește”; doar el, exportat, e tăietura (lemnul de lângă perete)', async ({ page }) => {
  await page.goto('/');
  await importaRelief(page);
  await rolRelief3d(page);
  const z = page.getByTestId('prop-relief').locator('.prop-rand').filter({ hasText: 'Înălțimile' }).locator('dd');
  await expect(z).toHaveText('de la 0.00 la 5.00 mm');
  await page.locator('[data-buton="relief-din-simulare"]').click();
  await expect(page.getByTestId('relief-simulare-stare')).toHaveAttribute('data-stare', 'ok', { timeout: 30_000 });
  await expect(page.getByTestId('relief-simulare-stare')).toContainText('strat ascuns, „Tăietura simulată”');
  const randuri = page.getByTestId('prop-relief-straturi').locator('li');
  await expect(randuri).toHaveCount(2);
  // Cel nou e sus (lista e de sus în jos), ascuns, „înlocuiește”; compusul rămâne al modelului.
  await expect(randuri.first()).toHaveAttribute('data-vizibil', 'false');
  await expect(randuri.first().locator('[data-camp="strat-mod"]')).toHaveValue('inlocuieste');
  await expect(z).toHaveText('de la 0.00 la 5.00 mm');
  // În documentul salvat (salvarea pleacă după schimbare): stratul de jos, al imaginii, apoi cel nou.
  await expect.poll(async () => (await straturiSalvate(page, 1)).map((s) => [s.nume ?? null, s.mod, s.vizibil]))
    .toEqual([['jumatati.png', 'aduna', true], ['Tăietura simulată', 'inlocuieste', false]]);
  // Doar stratul nou: arătat cel nou, ascuns modelul.
  await randuri.first().locator('[data-buton="strat-ochi"]').click();
  await randuri.last().locator('[data-buton="strat-ochi"]').click();
  await expect(randuri.last()).toHaveAttribute('data-vizibil', 'false');
  await expect(z).toHaveText(/^de la 0\.0\d la 5\.00 mm$/);
  const [d] = await Promise.all([page.waitForEvent('download'), page.locator('[data-buton="relief-png"]').click()]);
  const p = await citestePng(new Uint8Array(readFileSync(await d.path())));
  if ('eroare' in p) throw new Error(p.eroare);
  expect([p.latime, p.inaltime]).toEqual([64, 32]);
  const m = JSON.parse(p.text['cncvs2-relief'] ?? '{}') as { zMin: number; zMax: number };
  const zLa = (x: number, y: number): number => m.zMin + (Math.round((p.rgba[4 * (y * 64 + x)] ?? 0) * 65535 / 255) / 65535) * (m.zMax - m.zMin);
  const langaPerete = zLa(33, 16);
  expect(langaPerete, 'lemnul lăsat de bilă lângă perete').toBeGreaterThan(3 - Math.sqrt(9 - 1.5 ** 2) - 0.02);
  expect(langaPerete).toBeLessThan(1);
  expect(zLa(50, 16)).toBeLessThan(0.1);
  expect(Math.abs(zLa(10, 16) - 5)).toBeLessThan(1e-3);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
