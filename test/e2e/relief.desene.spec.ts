import { test, expect, type Locator, type Page } from '@playwright/test';
import { alege } from './ajutor-export.ts';
import { importaRelief, rolRelief3d } from './ajutor-relief.ts';

/**
 * Desenele fișei reliefului din fereastra exportului (felia 18.1↑d-6, ADR 0317), în Edge: relieful de 64 × 32 px la 1 mm pe
 * celulă, cu rolul „Relief 3D”. Fiecare grup are desenul lui (la degroșare și adaosul); cota câmpului pe care stai se aprinde
 * (la freză, cea a desenului comun al frezei); desenul spune ce face lucrarea: liniile prin centrele celulelor, la pasul folosit
 * (rotunjit în jos la celule întregi), și trecerile pe Z (fundurile la câte un pas, ultima pe model, cel mult la podea, ridicată
 * cu adaosul la degroșare).
 */
test.use({ locale: 'ro-RO' });

const desen = (fisa: Locator, grup: string): Locator => fisa.locator(`[data-grup="${grup}"] [data-desen] svg`);

async function deschide(page: Page): Promise<{ readonly fin: Locator; readonly deg: Locator; readonly randFin: Locator; readonly randDeg: Locator }> {
  await page.goto('/');
  await importaRelief(page);
  await rolRelief3d(page);
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.mouse.move(2, 2);
  return {
    fin: page.locator('[data-fisa="op"][data-fel="finisare"]'), deg: page.locator('[data-fisa="op"][data-fel="degrosare"]'),
    randFin: page.locator('[data-nav-op][data-fel="finisare"]'), randDeg: page.locator('[data-nav-op][data-fel="degrosare"]'),
  };
}

test('fișa reliefului: fiecare grup cu desenul lui; cota câmpului activ se aprinde', async ({ page }) => {
  const { fin, deg, randFin, randDeg } = await deschide(page);
  await randDeg.locator('[data-nav]').click();
  for (const g of ['freza-relief', 'linii', 'adaos', 'margine', 'podea']) await expect(desen(deg, g), g).toBeVisible();
  await randFin.locator('[data-nav]').click();
  for (const g of ['freza-relief', 'linii', 'margine', 'podea']) await expect(desen(fin, g), g).toBeVisible();
  await expect(fin.locator('[data-grup="adaos"]')).toHaveCount(0);
  // Cota câmpului activ: la freză, cea a desenului comun (fără prefixul `relief-`).
  for (const [camp, grup, cota] of [
    ['relief-diametru', 'freza-relief', 'diametru'], ['relief-scula', 'freza-relief', 'scula'], ['relief-pas-lateral', 'linii', 'relief-pas-lateral'],
    ['relief-unghi', 'linii', 'relief-unghi'], ['relief-adancime', 'podea', 'relief-adancime'], ['relief-pas', 'podea', 'relief-pas'],
  ] as const) {
    await fin.locator(`[data-camp="${camp}"]`).focus();
    await expect(desen(fin, grup).locator(`[data-cota="${cota}"]`), camp).toHaveAttribute('data-aprinsa', '');
  }
  // Bila: capătul rotund.
  await expect(desen(fin, 'freza-relief').locator('path.f')).toHaveAttribute('d', /A20 20/u);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('desenele spun ce face lucrarea: pasul folosit al liniilor, trecerile pe Z, adaosul, marginea și planul zero', async ({ page }) => {
  const { fin, deg, randFin, randDeg } = await deschide(page);
  await randFin.locator('[data-nav]').click();
  // Liniile prin centrele celulelor de 1 mm: 2,7 mm devine 2 celule.
  await fin.locator('[data-camp="relief-pas-lateral"]').fill('2,7');
  await expect(desen(fin, 'linii')).toHaveAttribute('data-aliniate', 'true');
  await expect(desen(fin, 'linii')).toContainText('prin centrele celulelor, la 2 celule (2 mm)');
  // Nealiniate: cel mult pasul cerut.
  await alege(fin, 'relief-aliniat', 'nealiniate');
  await expect(desen(fin, 'linii')).toHaveAttribute('data-aliniate', 'false');
  await expect(desen(fin, 'linii')).toContainText('la cel mult 2,7 mm una de alta');
  // Podeaua 5, pasul 2: fundurile la 2 și 4, ultima pe model.
  await fin.locator('[data-camp="relief-adancime"]').fill('5');
  await fin.locator('[data-camp="relief-pas"]').fill('2');
  await expect(desen(fin, 'podea').locator('[data-fund]')).toHaveCount(2);
  await expect(desen(fin, 'podea')).toContainText('3 treceri, la câte 2 mm; ultima pe model');
  // Un pas greșit: desenul o spune, fără trepte.
  await fin.locator('[data-camp="relief-pas"]').fill('0');
  await expect(desen(fin, 'podea')).toContainText('scrie adâncimea și pasul');
  await fin.locator('[data-camp="relief-pas"]').fill('2');
  // Marginea „trece” și planul zero.
  await alege(fin, 'relief-margine', 'trece');
  await expect(desen(fin, 'margine')).toHaveAttribute('data-margine', 'trece');
  await expect(desen(fin, 'margine')).toContainText('freza trece de margine cu raza ei');
  await alege(fin, 'relief-z', 'plan');
  await fin.locator('[data-camp="relief-plan-zero"]').fill('1,5');
  await expect(desen(fin, 'margine').locator('[data-cota="relief-plan-zero"]')).toContainText('1,5 mm');

  // Degroșarea: adaosul ridică podeaua (5 − 0,5 = 4,5, deci tot 3 treceri, fundurile la 2 și 4).
  await randDeg.locator('[data-nav]').click();
  await deg.locator('[data-camp="relief-adancime"]').fill('5');
  await deg.locator('[data-camp="relief-pas"]').fill('2');
  await deg.locator('[data-camp="relief-adaos"]').fill('0,5');
  await expect(desen(deg, 'adaos')).toContainText('rămân 0,5 mm pentru finisare, în orice direcție');
  await expect(desen(deg, 'podea').locator('[data-fund]')).toHaveCount(2);
  // Podeaua 4,2, adaosul 0,5: 3,7 mm, deci 2 treceri, un singur fund (fără adaos ar fi 3 treceri, două funduri).
  await deg.locator('[data-camp="relief-adancime"]').fill('4,2');
  await expect(desen(deg, 'podea').locator('[data-fund]')).toHaveCount(1);
  await expect(desen(deg, 'podea')).toContainText('2 treceri, la câte 2 mm; ultima pe model');
  await deg.locator('[data-camp="relief-adaos"]').fill('0');
  await expect(desen(deg, 'adaos')).toContainText('fără adaos: degroșarea merge până pe model');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
