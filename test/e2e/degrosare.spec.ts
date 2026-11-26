import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { importaRelief, rolRelief3d } from './ajutor-relief.ts';

/**
 * Degroșarea reliefului (ADR 0313, felia 18.1↑d-1), în Edge: imaginea de 64 × 32 px (stânga albă, dreapta neagră), relief la
 * 1 mm pe celulă și 5 mm înălțime. În secțiunea Tăierea, rolul „Relief 3D”: întâi degroșarea (freza plată Ø6, pasul lateral
 * 40 %, adaosul 0,5 mm), apoi finisarea (bila Ø6). În fereastra exportului, amândouă au rândul lor, doar de citit, degroșarea
 * prima; fișa ei spune adaosul. Planul zero, scris o dată în Tăierea, ajunge pe amândouă. Cu „A mea”, finisarea mutată
 * înaintea degroșării dă avertismentul, iar programul iese.
 * G-code-ul: degroșarea nu coboară sub −4,5 (partea neagră, la −5, plus adaosul), iar finisarea ajunge la −5. „Tăiat”, în
 * vederea 3D, simulează placa.
 */
test.use({ locale: 'ro-RO' });

test('rolul „Relief 3D”: câmpurile degroșării, rândurile în fereastra exportului, ordinea de mână, G-code-ul și „Tăiat”', async ({ page }) => {
  await page.goto('/');
  await importaRelief(page);
  await rolRelief3d(page);
  await expect(page.locator('[data-camp="deg-diametru"]')).toHaveValue('6');
  await expect(page.locator('[data-camp="deg-pas-lateral"]')).toHaveValue('2,4');
  await expect(page.locator('[data-camp="deg-adaos"]')).toHaveValue('0,5');
  await expect(page.locator('[data-camp="deg-unghi"]')).toHaveValue('0');
  await expect(page.locator('[data-camp="fin-forma"]')).toHaveValue('bila');
  await expect(page.locator('[data-camp="fin-margine"]')).toHaveValue('perete');
  // Arborele spune amândouă.
  await expect(page.locator('[data-nod="operatie"]')).toHaveCount(2);
  await expect(page.locator('[data-nod="operatie"]').first()).toContainText('Degroșare pe 1 relief');
  await expect(page.locator('[data-nod="operatie"]').nth(1)).toContainText('Finisare pe 1 relief');
  await page.locator('[data-camp="pas"]').fill('3');
  await page.locator('[data-camp="pas"]').press('Enter');
  // Planul zero, scris o dată, merge pe amândouă (altfel lucrarea ar refuza degroșarea): 5 mm, ca vârful la față.
  await page.locator('[data-camp="fin-z"]').selectOption('plan');
  await page.locator('[data-camp="fin-plan-zero"]').fill('5');
  await page.locator('[data-camp="fin-plan-zero"]').press('Enter');
  await expect(page.locator('[data-camp="fin-plan-zero"]')).toHaveValue('5');

  // Fereastra exportului: degroșarea, apoi finisarea, cu fișele doar de citit.
  await page.locator('[data-actiune="export.gcode"]').click();
  const deg = page.locator('[data-nav-op][data-fel="degrosare"]'), fin = page.locator('[data-nav-op][data-fel="finisare"]');
  await expect(deg.locator('[data-loc]')).toHaveText('1');
  await expect(fin.locator('[data-loc]')).toHaveText('2');
  await expect(deg).toContainText('Degroșare · T');
  await expect(deg).toContainText('Ø6 plată');
  await deg.locator('[data-nav]').click();
  const fisa = page.locator('[data-fisa="op"][data-fel="degrosare"]');
  await expect(fisa.locator('[data-finisare="adaos"] dd')).toHaveText('0,5 mm');
  await expect(fisa.locator('[data-finisare="pas-lateral"] dd')).toHaveText('2,4 mm');
  await expect(fisa.getByTestId('finisare-nota')).toContainText('degroșarea reliefului');
  await expect(fisa.locator('input, select, textarea')).toHaveCount(0);

  // „A mea”: finisarea înaintea degroșării (avertismentul), apoi Exportă.
  await page.locator('[data-ordine="a-mea"]').click();
  await fin.locator('[data-sus]').click();
  await expect(fin.locator('[data-loc]')).toHaveText('1');
  await page.locator('[data-buton="exporta"]').click();
  const iesire = page.getByTestId('iesire-foaie');
  await expect(iesire).toBeVisible();
  await iesire.getByRole('checkbox').check();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-avertismente')).toContainText('înaintea degroșării');
  // Z-ul fiecărei tăieri, pe blocuri (după comentariul operației).
  const z = { d: [] as number[], f: [] as number[] };
  let bloc: 'd' | 'f' | null = null;
  for (const l of text.split('\n')) {
    if (/^\(.*degrosarea reliefului/.test(l)) bloc = 'd';
    else if (/^\(.*finisarea reliefului/.test(l)) bloc = 'f';
    const m = /^G1\b.*Z(-?\d+(?:\.\d+)?)/.exec(l);
    if (m && bloc) z[bloc].push(Number(m[1]));
  }
  expect(z.d.length).toBeGreaterThan(20);
  expect(Math.min(...z.d)).toBeGreaterThanOrEqual(-4.5001);
  expect(Math.min(...z.d)).toBeLessThan(-4.4);
  expect(Math.min(...z.f)).toBeLessThan(-4.9);
  // Finisarea întâi, cum a pus-o omul.
  expect(text.indexOf('finisarea reliefului')).toBeLessThan(text.indexOf('degrosarea reliefului'));
  await page.getByRole('button', { name: 'Închide' }).click();

  // „Tăiat”: placa simulată cu degroșarea și finisarea.
  await page.locator('[data-editare="vedere-3d"]').click();
  const p = page.getByTestId('panza-3d');
  await expect(p).toHaveAttribute('data-vedere', 'model', { timeout: 30_000 });
  await page.locator('[data-3d-vedere="taiat"]').click();
  await expect(p).toHaveAttribute('data-stare', 'gata', { timeout: 60_000 });
});
