import { test, expect, type Page } from '@playwright/test';
import { cerc, dxf, lwpolilinie } from '../unit/ajutor-dxf.ts';
import { ecran, vedere } from './ajutor-panza.ts';

/**
 * Tăierea cu o linie dreaptă (felia 10.3↑, ADR 0180), în Edge, pe un DXF importat (o piesă cu un pătrat 100 × 100 și un cerc
 * R30 la (200, 50)): butonul Taie din extensia barei deschide panoul, cu X pornit din mijlocul formelor alese; linia se vede pe
 * pânză. Taie la X = 50 face din piesă două forme (jumătatea stângă a pătratului; cealaltă jumătate cu cercul), alese;
 * Anulează pune piesa la loc. Fără „Închide bucățile”, bifa ținută după reîncărcare; fără ghidaje pe foaie, alegerea lor e
 * stinsă; o linie pe lângă forme e refuzată cu motiv; Esc închide panoul și stinge linia.
 *
 * Felia 10.3↑b: „Ultima formă aleasă” (după degrupare, bucățile rămân alese, în ordine: linia frântă, ultima, e cuțitul) taie
 * pătratul în două fețe, iar cuțitul rămâne; „Taie la intersecții”, din panou și din meniul de clic dreapta, face din
 * pătratul și linia care îl trece cinci forme; Anulează le pune la loc.
 *
 * Felia 10.3↑c: „Decupează la ultima formă aleasă” lasă din pătrat partea lui comună cu cercul (granița, aleasă ultima, rămâne);
 * după Anulează, cu formele alese din nou printr-un cadru, „se șterg” scoate pătratul, care trece granița.
 */
test.use({ locale: 'ro-RO' });

const fisierDxf = (nume: string, text: string) => ({ name: nume, mimeType: 'application/dxf', buffer: Buffer.from(text, 'utf8') });
const ENTITATI = [
  lwpolilinie([[0, 0], [100, 0], [100, 100], [0, 100]], true, { strat: 'PATRAT' }),
  cerc(200, 50, 30, { strat: 'CERC' }),
].join('');

const panou = (page: Page) => page.getByTestId('panou-taiere');
const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');

async function importa(page: Page, entitati = ENTITATI): Promise<void> {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf('taiere.dxf', dxf({ antet: [['$INSUNITS', 70, 4]], entitati })));
  await page.click('[data-buton="importa"]');
  await expect(page.locator('.dialog')).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(1);
}

test('Taie la X = 50: piesa importată devine două forme, alese; linia pe pânză; Anulează o pune la loc', async ({ page }) => {
  await importa(page);
  await page.locator('[data-editare="taiere"]').click();
  await expect(panou(page)).toBeVisible();
  // X pornește din mijlocul formelor alese: pătratul (0…100) și cercul (170…230), deci 115.
  await expect(page.locator('[data-taiere="x"]')).toHaveValue('115');
  await expect(page.getByTestId('taiere-linia')).toHaveAttribute('data-axa', 'x');
  await page.locator('[data-taiere="x"]').fill('50');
  await expect(page.locator('[data-taiere="inchide"]')).toBeChecked();
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 1; forme noi: 2, alese.');
  await expect(randuri(page)).toHaveCount(2);
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]')).toHaveCount(2);

  await page.keyboard.press('Escape');
  await expect(panou(page)).toHaveCount(0);
  await expect(page.getByTestId('taiere-linia')).toHaveCount(0);
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(1);
});

test('fără „Închide bucățile”: tot două forme, bifa ținută după reîncărcare; o linie pe lângă e refuzată; fără ghidaje, alegerea lor e stinsă', async ({ page }) => {
  await importa(page);
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="inchide"]').uncheck();
  await page.locator('[data-taiere="x"]').fill('50');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 1; forme noi: 2, alese.');
  await expect(randuri(page)).toHaveCount(2);

  // Linia pe lângă forme: refuzul, cu motivul lui.
  await page.locator('[data-taiere="y"]').fill('500');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Tăietura nu trece prin nicio formă aleasă (o atingere nu taie).');

  await page.reload();
  await expect(randuri(page)).toHaveCount(2);
  await page.locator('[data-editare="taiere"]').click();
  await expect(page.locator('[data-taiere="inchide"]')).not.toBeChecked();
  // Fără ghidaje pe foaie, alegerea ghidajului e stinsă.
  await expect(page.locator('[data-taiere="cu-ghidaj"]')).toBeDisabled();
});

/** Pătratul 100 × 100 și o linie: frântă, (−10, 50)→(50, 70)→(110, 50), sau dreaptă, (−8, 95)→(108, 5); o singură piesă. */
const PATRAT = lwpolilinie([[0, 0], [100, 0], [100, 100], [0, 100]], true, { strat: 'PATRAT' });
const FRANTA = PATRAT + lwpolilinie([[-10, 50], [50, 70], [110, 50]], false, { strat: 'CUTIT' });
const OBLICA = PATRAT + lwpolilinie([[-8, 95], [108, 5]], false, { strat: 'LINIE' });

test('Taie cu ultima formă aleasă: linia frântă, aleasă ultima, taie pătratul în două fețe și rămâne; Anulează', async ({ page }) => {
  await importa(page, FRANTA);
  await page.locator('[data-editare="degrupeaza"]').click();
  await expect(randuri(page)).toHaveCount(2);
  // Linia frântă (al doilea contur al DXF-ului) e ultima aleasă: cuțitul.
  const cutitul = await randuri(page).nth(1).getAttribute('data-instanta');
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="cu-forma"]').check();
  await expect(page.getByTestId('taiere-linia')).toHaveCount(0);
  await expect(panou(page).locator('.stare-taiere').first()).toHaveText('Cuțitul e ultima formă aleasă; forme de tăiat: 1.');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 1; forme noi: 2, alese.');
  await expect(randuri(page)).toHaveCount(3, { timeout: 10_000 });
  const lista = page.getByTestId('lista-vectori');
  await expect(lista.locator('button[data-instanta][aria-pressed="true"]')).toHaveCount(2);
  // Cuțitul (linia frântă, aleasă ultima) a rămas întreg, neales; pătratul s-a tăiat.
  await expect(lista.locator('button[data-instanta][aria-pressed="false"]')).toHaveCount(1);
  await expect(lista.locator('button[data-instanta][aria-pressed="false"]')).toHaveAttribute('data-instanta', cutitul ?? '—');
  await page.keyboard.press('Escape');
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(2);
});

test('Taie la intersecții, din panou și din clic dreapta: pătratul și linia oblică devin cinci forme; Anulează', async ({ page }) => {
  await importa(page, OBLICA);
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="intersectii"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 2; forme noi: 5, alese.');
  await expect(randuri(page)).toHaveCount(5);
  await page.keyboard.press('Escape');
  await expect(panou(page)).toHaveCount(0);
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(1);

  // Din meniul de clic dreapta, pe latura de jos a pătratului (forma e încă aleasă).
  await randuri(page).nth(0).click();
  const la = await ecran(page, await vedere(page));
  const jos = la(30, 0);
  await page.mouse.click(jos.x, jos.y, { button: 'right' });
  const meniu = page.getByTestId('meniu-context');
  await expect(meniu.locator('[data-meniu="taie-intersectii"]')).toBeEnabled();
  await meniu.locator('[data-meniu="taie-intersectii"]').click();
  await expect(meniu).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(5);
});

/** Pătratul 100 × 100 și cercul R30 din (100, 50), care îi trece latura din dreapta: o singură piesă. */
const CU_CERC = PATRAT + cerc(100, 50, 30, { strat: 'GRANITA' });

test('Decupează la ultima formă aleasă: din pătrat rămâne partea comună cu cercul; „se șterg” scoate pătratul; Anulează', async ({ page }) => {
  await importa(page, CU_CERC);
  await page.locator('[data-editare="degrupeaza"]').click();
  await expect(randuri(page)).toHaveCount(2);
  const granita = await randuri(page).nth(1).getAttribute('data-instanta');
  await page.locator('[data-editare="taiere"]').click();
  await expect(page.locator('[data-taiere="pastreaza-inauntru"]')).toBeChecked();
  await expect(page.locator('[data-taiere="trec-taie"]')).toBeChecked();
  await expect(page.locator('[data-taiere="inchide-decupare"]')).toBeChecked();
  await page.locator('[data-taiere="decupeaza"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme decupate: 1; șterse: 0; forme noi: 1, alese.');
  // Rezultatul stă sub cele trei blocuri, într-un panou care se derulează: adus în vedere (95 %: sub-pixelii).
  await expect(page.getByTestId('taiere-stare')).toBeInViewport({ ratio: 0.95 });
  const lista = page.getByTestId('lista-vectori');
  await expect(randuri(page)).toHaveCount(2);
  await expect(lista.locator('button[data-instanta][aria-pressed="false"]')).toHaveAttribute('data-instanta', granita ?? '—');
  await page.locator('[data-taiere="inchide-panoul"]').click();
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(2);

  // Amândouă, alese din nou cu un cadru tras de la dreapta la stânga, care le atinge (în ordinea foii: cercul, ultimul);
  // „se șterg” scoate pătratul.
  const la = await ecran(page, await vedere(page));
  const [a, b] = [la(135, 60), la(90, 40)];
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
  await expect(lista.locator('button[data-instanta][aria-pressed="true"]')).toHaveCount(2);
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="trec-sterge"]').check();
  await page.locator('[data-taiere="decupeaza"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme decupate: 0; șterse: 1; forme noi: 0, alese.');
  await expect(randuri(page)).toHaveCount(1);
  await expect(randuri(page)).toHaveAttribute('data-instanta', granita ?? '—');
});
