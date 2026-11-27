/**
 * Freza din bibliotecă în secțiunea Tăierea (ADR 0300 §4, felia 16.A↑b-2), în Edge: rândul „Freza” apare cât biblioteca are
 * freze (de la prima pornire, frezele standard, puse singure: 16.A↑a-2) și arată doar frezele care merg pe toate formele alese (plate pe un profil, în V la V-carve, niciuna la un amestec);
 * aleasă, freza trece pe operație într-un pas de anulare, cu pasul ei, iar fereastra exportului o arată; numărul T ocupat de
 * altă freză se spune într-o notă; lista stă în panou și cu fontul lat, în engleză; Atelierul (butoanele mari, fără liste)
 * n-are rândul: freza rămâne pe cartela ei.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';
import { bibliotecaGoala } from './ajutor-freze.ts';

test.use({ locale: 'ro-RO' });

const taierea = (page: Page): Locator => page.getByTestId('prop-taierea');
const freza = (page: Page): Locator => taierea(page).locator('[data-camp="freza"]');
const aleasa = (page: Page): Locator => freza(page).locator('option:checked');
const oferite = (page: Page): Locator => freza(page).locator('option:not([disabled])');

/** Trage o fereastră de selecție între două puncte ale foii (mm): alege formele cuprinse în întregime. */
async function fereastra(page: Page, a: { x: number; y: number }, b: { x: number; y: number }): Promise<void> {
  const la = await ecran(page, await vedere(page));
  const [sa, sb] = [la(a.x, a.y), la(b.x, b.y)];
  await page.mouse.move(sa.x, sa.y);
  await page.mouse.down();
  await page.mouse.move((sa.x + sb.x) / 2, (sa.y + sb.y) / 2, { steps: 4 });
  await page.mouse.move(sb.x, sb.y, { steps: 4 });
  await page.mouse.up();
}

test('cu biblioteca goală, rândul nu apare', async ({ page }) => {
  await page.goto('/');
  await bibliotecaGoala(page);
  await adauga(page, 'dreptunghi');
  await expect(taierea(page).locator('[data-camp="rol"]')).toHaveValue('exterior');
  await expect(freza(page)).toHaveCount(0);
});

test('de la prima pornire, frezele standard: doar cele plate pe un profil; aleasă, freza și pasul ei, într-un pas', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await expect(taierea(page).locator('[data-camp="rol"]')).toHaveValue('exterior');
  // Fără nicio deschidere a ferestrei „Frezele mele”: rândul are freza scrisă de mână a operației și frezele plate standard,
  // în ordinea bibliotecii.
  await expect(aleasa(page)).toHaveText('Scrisă de mână');
  await expect(oferite(page)).toHaveText(['Plată Ø3,175', 'Plată Ø6', 'Plată Ø12']);
  await freza(page).selectOption({ label: 'Plată Ø3,175' });
  await expect(aleasa(page)).toHaveText('Plată Ø3,175');
  await expect(taierea(page).locator('[data-camp="pas"]')).toHaveValue('1,5');
  // T1 al bibliotecii: freza veche (T1 Ø6) a plecat, deci T1 e liber și nota nu apare.
  await expect(taierea(page).locator('[data-nota="freza-numar"]')).toHaveCount(0);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-operatie] [data-camp="scula"]')).toHaveValue('1');
  await expect(page.locator('[data-operatie] [data-camp="diametru"]')).toHaveValue('3,175');
  await page.getByRole('button', { name: 'Închide' }).click();
  // Un singur pas de anulare: freza și pasul de dinainte.
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(aleasa(page)).toHaveText('Scrisă de mână');
  await expect(taierea(page).locator('[data-camp="pas"]')).toHaveValue('3');
  // După reîncărcare, panoul își citește singur biblioteca din browser, fără fereastra „Frezele mele”.
  await page.reload();
  await page.getByTestId('lista-vectori').locator('button[data-instanta]').first().click();
  await expect(oferite(page)).toHaveText(['Plată Ø3,175', 'Plată Ø6', 'Plată Ø12']);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('bila și toroidala se oferă pe linie (canelura, ADR 0303, 16.A↑e-4) și pe o parte de la adâncimea razei colțului (16.A↑e-6); profilurile doar pe linie (16.A↑f-3); burghiul, nicăieri', async ({ page }) => {
  await page.goto('/');
  // Din catalogul ferestrei „Frezele mele”: bilele, toroidalele, burghiele și rotunjirile, în bibliotecă.
  await page.locator('[data-editare="cont"]').click();
  await page.locator('[data-meniu-cont="freze"]').click();
  const f = page.getByRole('dialog', { name: 'Frezele mele' });
  await expect(f.locator('[data-freza]')).toHaveCount(6);
  await f.locator('[data-freze="catalog-arata"]').click();
  await f.locator('[data-catalog-grup="bila"] [data-freze="catalog-pune-grup"]').click();
  await f.locator('[data-catalog-grup="burghiu"] [data-freze="catalog-pune-grup"]').click();
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Puse: 23 · erau deja: 0');
  await f.locator('[data-catalog-grup="toroidala"] [data-freze="catalog-pune-grup"]').click();
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Puse: 6 · erau deja: 0');
  await f.locator('[data-catalog-grup="rotunjire"] [data-freze="catalog-pune-grup"]').click();
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Puse: 11 · erau deja: 0');
  await f.locator('[data-freze="inchide"]').click();
  await adauga(page, 'dreptunghi');
  // Pe exterior, la 3 mm (adâncimea implicită): plate, bilele cu raza cel mult 3 (Ø1 … Ø6: 7 din 12) și toroidalele cu raza
  // colțului cel mult 3 (toate 6); burghiul și rotunjirea, nu (16.A↑e-6, întrebarea 2a).
  await expect(oferite(page)).toHaveCount(3 + 7 + 6);
  let pe = await oferite(page).allTextContents();
  expect(pe.filter((n) => n.startsWith('Plată'))).toEqual(['Plată Ø3,175', 'Plată Ø6', 'Plată Ø12']);
  expect(pe).toContain('Bilă Ø6');
  expect(pe.filter((n) => /^Bilă Ø(6,35|8|10|12)/.test(n)), pe.join(' | ')).toEqual([]);
  expect(pe.filter((n) => /Burghiu|Rotunjire/.test(n))).toEqual([]);
  // La 1 mm: bilele până la Ø2 (3) și toroidalele cu raza colțului 0,5 sau 1 (4).
  await taierea(page).locator('[data-camp="adancime"]').fill('1');
  await taierea(page).locator('[data-camp="adancime"]').press('Enter');
  await expect(oferite(page)).toHaveCount(3 + 3 + 4);
  pe = await oferite(page).allTextContents();
  expect(pe.filter((n) => /^Bilă Ø(3|4|6)/.test(n)), pe.join(' | ')).toEqual([]);
  // Pe linie (canelura): plate, V-uri, cele 12 bile, cele 6 toroidale și, din 16.A↑f-3 (ADR 0304), cele 11 rotunjiri;
  // burghiele, tot nu.
  await taierea(page).locator('[data-camp="rol"]').selectOption('pe-linie');
  await expect(oferite(page)).toHaveCount(6 + 12 + 6 + 11);
  const nume = await oferite(page).allTextContents();
  expect(nume).toContain('Bilă Ø6');
  expect(nume.some((n) => n.startsWith('Toroidală Ø6')), nume.join(' | ')).toBe(true);
  expect(nume.filter((n) => /Rotunjire/.test(n))).toHaveLength(11);
  expect(nume.filter((n) => /Burghiu/.test(n))).toEqual([]);
});

test('V-carve: doar frezele în V, iar fereastra exportului arată unghiul frezei alese', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await taierea(page).locator('[data-camp="rol"]').selectOption('vcarve');
  await expect(oferite(page)).toHaveText(['V60 Ø6', 'V90 Ø12', 'Gravare 30° vârf 0,2 Ø3,175']);
  await freza(page).selectOption({ label: 'V90 Ø12' });
  await expect(aleasa(page)).toHaveText('V90 Ø12');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-operatie] [data-camp="unghi-v"]')).toHaveValue('90');
  await expect(page.locator('[data-operatie] [data-camp="diametru"]')).toHaveValue('12');
});

test('un profil și un V-carve împreună: nicio freză; T-ul bibliotecii ocupat de altă freză: altul, cu nota', async ({ page }) => {
  await page.goto('/');
  // Dreptunghiul (T1 Ø6, plată) și cercul nou, ales singur (o gaură, tot cu T1 Ø6).
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  // Plată Ø3,175 cere T1: freza veche a cercului pleacă, dar T1 rămâne al dreptunghiului (Ø6), deci cercul primește T2.
  await freza(page).selectOption({ label: 'Plată Ø3,175' });
  await expect(aleasa(page)).toHaveText('Plată Ø3,175');
  await expect(taierea(page).locator('[data-nota="freza-numar"]')).toHaveText('Aici e T2: T1 e deja al altei freze din proiect.');
  // Amândouă alese: frezele lor diferă („—”), dar plata merge pe amândouă.
  await fereastra(page, { x: 10, y: 10 }, { x: 130, y: 90 });
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]')).toHaveCount(2);
  await expect(aleasa(page)).toHaveText('— (diferite)');
  await expect(oferite(page)).toHaveText(['Plată Ø3,175', 'Plată Ø6', 'Plată Ø12']);
  // Cu dreptunghiul pe V-carve, nicio freză nu mai merge pe amândouă.
  await page.getByTestId('lista-vectori').locator('button[data-instanta]').first().click();
  await taierea(page).locator('[data-camp="rol"]').selectOption('vcarve');
  await fereastra(page, { x: 10, y: 10 }, { x: 130, y: 90 });
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]')).toHaveCount(2);
  await expect(freza(page)).toBeDisabled();
  await expect(aleasa(page)).toHaveText('Nicio freză din bibliotecă nu se potrivește');
});

test('la 1280 px, cu fontul lat, în engleză: lista stă în panou, cu frezele standard puse în engleză', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('cncvs2.limba', 'en'); });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
  // Frezele standard, puse la prima pornire în limba ei: în engleză.
  await adauga(page, 'dreptunghi');
  await expect(aleasa(page)).toHaveText('Entered by hand');
  await expect(oferite(page)).toHaveText(['Flat Ø3.175', 'Flat Ø6', 'Flat Ø12']);
  await freza(page).selectOption({ label: 'Flat Ø6' });
  await expect(aleasa(page)).toHaveText('Flat Ø6');
  // Lista stă în panou: nu iese în dreapta lui și panoul nu se derulează pe orizontală.
  const [lista, panou, derulare] = await page.evaluate(() => {
    const l = document.querySelector('[data-testid="prop-taierea"] [data-camp="freza"]')!.getBoundingClientRect();
    const p = document.querySelector('.proprietati')!;
    return [l.right, p.getBoundingClientRect().right, p.scrollWidth - p.clientWidth];
  });
  expect(lista).toBeLessThanOrEqual(panou);
  expect(derulare).toBe(0);
});

test('Atelierul (butoanele mari, fără liste): nici rândul „Freza”; freza rămâne pe cartela ei', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('cncvs2.aranjament', '{"v":1,"aranjament":"atelier","densitate":"mare"}'); });
  await page.goto('/');
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-aranjament', 'atelier');
  await adauga(page, 'dreptunghi');
  await expect(page.locator('[data-buton="freza"]')).toBeVisible();
  await expect(freza(page)).toHaveCount(0);
  await expect(taierea(page).locator('select')).toHaveCount(0);
});
