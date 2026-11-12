import { test, expect, type Page } from '@playwright/test';
import { dxf, lwpolilinie } from '../unit/ajutor-dxf.ts';

/**
 * Conversia vectorilor (felia 10.3↑d, ADR 0180 §8, §10), în Edge, pe DXF-uri importate:
 * - **În cerc, doar dacă e:** poligonul cu 64 de laturi R50 (un cerc dintr-un DXF) devine cercul Ø100, cu abaterea 0,06 mm
 *   (săgeata laturilor, pe hârtie: 50·(1 − cos(π/64)) = 0,0602), deci găuribil: în fereastra exportului, rândul lui primește
 *   „găurire”. Anulează îl pune la loc (fără „găurire”); la 0,05 mm, refuzul spune abaterea.
 * - **Netezește** (felia 10.3↑e): poligonul cu 200 de laturi R30 devine 14 curbe netede, la 0,008 mm (cifrele aplicației,
 *   măsurate în Node pe același poligon); Arce le face apoi 32 de arce; „Păstrează” 0 oprește butonul, cu motivul; Anulează.
 * - **Arce:** o polilinie de 32 de linii pe un semicerc R50 rămâne la 0,01 mm (săgeata 0,06 nu încape) și devine un arc la 0,1;
 *   o toleranță în afara 0,001 … 1 mm oprește butonul, cu motivul; „În dreptunghi” sare calea deschisă, numărată.
 */
test.use({ locale: 'ro-RO' });

const fisierDxf = (nume: string, text: string) => ({ name: nume, mimeType: 'application/dxf', buffer: Buffer.from(text, 'utf8') });
const POLIGON = lwpolilinie(Array.from({ length: 64 }, (_, k) => [100 + 50 * Math.cos((2 * Math.PI * k) / 64), 100 + 50 * Math.sin((2 * Math.PI * k) / 64)] as const), true, { strat: 'CERC64' });
const POLIGON200 = lwpolilinie(Array.from({ length: 200 }, (_, k) => [100 + 30 * Math.cos((2 * Math.PI * k) / 200), 100 + 30 * Math.sin((2 * Math.PI * k) / 200)] as const), true, { strat: 'CERC200' });
const SEMICERC = lwpolilinie(Array.from({ length: 33 }, (_, k) => [100 + 50 * Math.cos((Math.PI * k) / 32), 100 + 50 * Math.sin((Math.PI * k) / 32)] as const), false, { strat: 'ARC32' });

const panou = (page: Page) => page.getByTestId('panou-conversie');
const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');
const stare = (page: Page) => page.getByTestId('conversie-stare');

async function importa(page: Page, entitati: string): Promise<void> {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf('conversie.dxf', dxf({ antet: [['$INSUNITS', 70, 4]], entitati })));
  await page.click('[data-buton="importa"]');
  await expect(page.locator('.dialog')).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(1);
}

/** Câte alegeri „găurire” are rândul primei operații în fereastra exportului (doar pe un rând numai cu cercuri). */
async function gaurire(page: Page): Promise<number> {
  await page.locator('[data-actiune="export.gcode"]').click();
  // Rândul întâi (fereastra vine la cerere): numărate înainte de el, alegerile ar fi zero și fără conversie.
  const latura = page.locator('tr[data-operatie]').first().locator('[data-camp="latura"]');
  await expect(latura.locator('option').first()).toBeAttached();
  const n = await latura.locator('option[value="gaurire"]').count();
  await page.getByRole('button', { name: 'Închide' }).click();
  await expect(page.locator('.dialog')).toHaveCount(0);
  return n;
}

test('În cerc: poligonul cu 64 de laturi devine cercul Ø100, găuribil; Anulează; la 0,05 mm refuzul spune abaterea', async ({ page }) => {
  await importa(page, POLIGON);
  expect(await gaurire(page)).toBe(0);
  await page.locator('[data-editare="conversie"]').click();
  await expect(panou(page)).toBeVisible();
  await expect(panou(page).locator('.stare-taiere').first()).toHaveText('Forme alese: 1.');
  // Valorile implicite ale schiței.
  await expect(page.locator('[data-conversie="toleranta-arce"]')).toHaveValue('0,01');
  await expect(page.locator('[data-conversie="linii"]')).toBeChecked();
  await expect(page.locator('[data-conversie="cerc-daca"]')).toBeChecked();
  await expect(page.locator('[data-conversie="toleranta-cerc"]')).toHaveValue('0,1');
  await expect(page.locator('[data-conversie="diametru"]')).toHaveValue('8');
  await expect(page.locator('[data-conversie="dreptunghi-daca"]')).toBeChecked();
  await expect(page.locator('[data-conversie="latime"]')).toHaveValue('40');
  await expect(page.locator('[data-conversie="inaltime"]')).toHaveValue('20');

  await page.locator('[data-conversie="cerc"]').click();
  await expect(stare(page)).toHaveText('Forme convertite: 1; abaterea cea mai mare: 0,06 mm.');
  // Rezultatul stă sub blocuri, într-un panou care se derulează: adus în vedere (95 %: sub-pixelii).
  await expect(stare(page)).toBeInViewport({ ratio: 0.95 });
  await expect(randuri(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(panou(page)).toHaveCount(0);
  expect(await gaurire(page)).toBe(1);

  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  expect(await gaurire(page)).toBe(0);
  await page.locator('[data-editare="conversie"]').click();
  await page.locator('[data-conversie="toleranta-cerc"]').fill('0,05');
  await page.locator('[data-conversie="cerc"]').click();
  await expect(stare(page)).toHaveText('Nimic de convertit. Nu sunt cercuri, la toleranța dată: 1. Cea mai mică abatere a lor: 0,06 mm.');
});

test('Arce: semicercul din 32 de linii rămâne la 0,01 și devine un arc la 0,1; toleranța greșită oprește butonul; „În dreptunghi” sare calea deschisă', async ({ page }) => {
  await importa(page, SEMICERC);
  await page.locator('[data-editare="conversie"]').click();
  await page.locator('[data-conversie="arce"]').click();
  await expect(stare(page)).toHaveText('Nimic de convertit: formele alese n-au curbe și nici șiruri de linii care să stea pe un cerc.');
  await page.locator('[data-conversie="toleranta-arce"]').fill('0,1');
  await page.locator('[data-conversie="arce"]').click();
  await expect(stare(page)).toHaveText('Forme schimbate: 1; curbe înlocuite: 0; arce noi: 1, linii noi: 0; abaterea cea mai mare: 0,06 mm.');

  await page.locator('[data-conversie="toleranta-arce"]').fill('2');
  await expect(page.locator('[data-conversie="arce"]')).toBeDisabled();
  await expect(panou(page).getByText('Toleranța e între 0,001 și 1 mm.')).toBeVisible();

  await page.locator('[data-conversie="dreptunghi-marime"]').check();
  await page.locator('[data-conversie="dreptunghi"]').click();
  await expect(stare(page)).toHaveText('Nimic de convertit. Sărite: 1 (căi deschise sau forme puse de mai multe ori pe foaie).');
  await page.locator('[data-conversie="inchide-panoul"]').click();
  await expect(panou(page)).toHaveCount(0);
});

test('Netezește: poligonul cu 200 de laturi devine 14 curbe netede, la 0,008 mm; Arce le face 32 de arce; „Păstrează” 0 oprește butonul; Anulează', async ({ page }) => {
  await importa(page, POLIGON200);
  await page.locator('[data-editare="conversie"]').click();
  await expect(page.locator('[data-conversie="toleranta-netezire"]')).toHaveValue('0,01');
  await expect(page.locator('[data-conversie="pastreaza"]')).toHaveValue('5');
  await page.locator('[data-conversie="netezire"]').click();
  await expect(stare(page)).toHaveText('Forme schimbate: 1; linii înlocuite: 200; curbe noi: 14; abaterea cea mai mare: 0,008 mm.');
  await expect(stare(page)).toBeInViewport({ ratio: 0.95 });
  // Curbele sunt în document: Arce le găsește pe toate 14.
  await page.locator('[data-conversie="arce"]').click();
  await expect(stare(page)).toHaveText(/^Forme schimbate: 1; curbe înlocuite: 14; arce noi: 32, linii noi: 0; abaterea cea mai mare: 0,0\d+ mm\.$/);

  await page.locator('[data-conversie="pastreaza"]').fill('0');
  await expect(page.locator('[data-conversie="netezire"]')).toBeDisabled();
  await expect(panou(page).getByText('Scrie mărimea în mm, mai mare decât 0.')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  // Înapoi la poligon: netezirea dă din nou aceleași cifre.
  await page.locator('[data-editare="conversie"]').click();
  await page.locator('[data-conversie="netezire"]').click();
  await expect(stare(page)).toHaveText('Forme schimbate: 1; linii înlocuite: 200; curbe noi: 14; abaterea cea mai mare: 0,008 mm.');
});
