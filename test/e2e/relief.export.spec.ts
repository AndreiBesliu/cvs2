import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { alege, aleasa } from './ajutor-export.ts';
import { importaRelief, rolRelief3d } from './ajutor-relief.ts';

/**
 * Rândurile editabile ale reliefului în fereastra exportului (felia 18.1↑d-4, ADR 0315), în Edge: imaginea de 64 × 32 px
 * (stânga albă, dreapta neagră), relief la 1 mm pe celulă și 5 mm înălțime, cu rolul „Relief 3D” (degroșarea cu freza plată Ø6,
 * apoi finisarea cu bila Ø6), pasul pe trecere 3. În fereastră:
 * - degroșarea: adaosul 0,8 și pasul lateral 2; finisarea: pasul lateral 1;
 * - marginea, aleasă pe un rând, ajunge și pe celălalt (lucrarea le cere egale pe același relief), în ambele sensuri;
 * - un pas lateral peste diametrul frezei se spune în grupul liniilor, iar rândul din listă și Exportă îl arată;
 * - Exportă scrie valorile în proiect (panoul Tăierea le arată după închidere, fereastra redeschisă la fel), iar programul
 *   le folosește: degroșarea nu coboară sub −5 + 0,8.
 */
test.use({ locale: 'ro-RO' });

test('rândurile reliefului în fereastra exportului: se schimbă aici, marginea pe amândouă, greșeala în grupul ei, Exportă le scrie', async ({ page }) => {
  await page.goto('/');
  await importaRelief(page);
  await rolRelief3d(page);
  await page.locator('[data-camp="pas"]').fill('3');
  await page.locator('[data-camp="pas"]').press('Enter');

  await page.locator('[data-actiune="export.gcode"]').click();
  const randDeg = page.locator('[data-nav-op][data-fel="degrosare"]'), randFin = page.locator('[data-nav-op][data-fel="finisare"]');
  const deg = page.locator('[data-fisa="op"][data-fel="degrosare"]'), fin = page.locator('[data-fisa="op"][data-fel="finisare"]');
  await randDeg.locator('[data-nav]').click();
  await deg.locator('[data-camp="relief-adaos"]').fill('0,8');
  await deg.locator('[data-camp="relief-pas-lateral"]').fill('2');
  await expect(deg.locator('[data-nota="relief-pas-folosit"]')).toContainText('2 mm, 2 celule de 1 mm');

  await randFin.locator('[data-nav]').click();
  await fin.locator('[data-camp="relief-pas-lateral"]').fill('1');
  // Creasta bilei Ø6 la 1 mm: 3 − √(9 − 0,25) = 0,0419 mm.
  await expect(fin.locator('[data-finisare="creasta"]')).toContainText('0,042 mm');
  // Marginea, aleasă pe finisare, ajunge și pe degroșare.
  await alege(fin, 'relief-margine', 'trece');
  await expect(aleasa(deg, 'relief-margine')).toHaveValue('trece');
  await expect(aleasa(fin, 'relief-margine')).toHaveValue('trece');
  await expect(fin.locator('[data-nota="relief-perechi"]')).toBeVisible();
  // Și invers: peretele, ales pe degroșare, se întoarce și pe finisare (cu „trece”, degroșarea ar coborî lângă relief până la
  // podea).
  await randDeg.locator('[data-nav]').click();
  await alege(deg, 'relief-margine', 'perete');
  await expect(aleasa(fin, 'relief-margine')).toHaveValue('perete');
  await randFin.locator('[data-nav]').click();

  // Un pas lateral peste diametrul frezei: greșeala în grupul liniilor, rândul marcat, Exportă oprit.
  await fin.locator('[data-camp="relief-pas-lateral"]').fill('7');
  await expect(fin.locator('[data-grup="linii"] [data-greseala]')).toContainText('6 mm');
  await expect(fin.locator('[data-camp="relief-pas-lateral"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(randFin.locator('[data-nav]')).toHaveAttribute('data-gresit', '');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  // Notele pasului folosit și ale crestei tac cât pasul e greșit; „Du-mă la …” spune numele rândului și duce la câmp.
  await expect(fin.locator('[data-nota="relief-pas-folosit"]')).toHaveCount(0);
  await expect(fin.locator('[data-finisare="creasta"]')).toHaveCount(0);
  const cheieFin = await randFin.getAttribute('data-nav-op');
  const du = page.locator(`button[data-du="${cheieFin ?? ''}"]`);
  await expect(du).toContainText('relief');
  await expect(du).not.toContainText(cheieFin ?? '');
  await fin.locator('[data-camp="relief-unghi"]').focus();
  await du.click();
  await expect(fin.locator('[data-camp="relief-pas-lateral"]')).toBeFocused();
  await fin.locator('[data-camp="relief-pas-lateral"]').fill('1');
  await expect(fin.locator('[data-grup="linii"] [data-greseala]')).toHaveCount(0);
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();

  // Exportă: relieful stă în colțul foii, iar bila trece de el, deci întâi confirmarea ieșirii din foaie.
  await page.locator('[data-buton="exporta"]').click();
  const iesire = page.getByTestId('iesire-foaie');
  await expect(iesire).toBeVisible();
  await iesire.getByRole('checkbox').check();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  // Z-ul tăierilor degroșării: partea neagră e la −5, cu adaosul 0,8 deasupra.
  const z: number[] = [];
  let inDegrosare = false;
  for (const l of text.split('\n')) {
    if (/^\(.*degrosarea reliefului/.test(l)) inDegrosare = true;
    else if (/^\(.*finisarea reliefului/.test(l)) inDegrosare = false;
    const m = /^G1\b.*Z(-?\d+(?:\.\d+)?)/.exec(l);
    if (m && inDegrosare) z.push(Number(m[1]));
  }
  expect(z.length).toBeGreaterThan(20);
  expect(Math.min(...z)).toBeGreaterThanOrEqual(-4.2001);
  expect(Math.min(...z)).toBeLessThan(-4.1);
  await page.getByRole('button', { name: 'Închide' }).click();

  // Valorile sunt în proiect: panoul Tăierea le arată.
  await expect(page.locator('[data-camp="deg-adaos"]')).toHaveValue('0,8');
  await expect(page.locator('[data-camp="deg-pas-lateral"]')).toHaveValue('2');
  await expect(page.locator('[data-camp="fin-pas-lateral"]')).toHaveValue('1');
  await expect(page.locator('[data-camp="fin-margine"]')).toHaveValue('perete');
  // Fereastra redeschisă pornește din ele.
  await page.locator('[data-actiune="export.gcode"]').click();
  await randDeg.locator('[data-nav]').click();
  await expect(deg.locator('[data-camp="relief-adaos"]')).toHaveValue('0,8');
  await randFin.locator('[data-nav]').click();
  await expect(fin.locator('[data-camp="relief-pas-lateral"]')).toHaveValue('1');
});

/**
 * „Dă-i T{n}” pe freza reliefului (felia 18.1↑d-7, ADR 0318): finisarea pusă pe T-ul degroșării (bila Ø6 și plata Ø6 sub același
 * număr) e un conflict, spus în grupul frezei al ambelor fișe, cu câmpurile frezei înroșite; „Dă-i T2” pe finisare îi dă cel mai
 * mic număr liber, conflictul pleacă, iar Exportă scrie numărul nou.
 */
test('„Dă-i T{n}” pe freza reliefului: conflictul în grupul frezei, numărul nou din regula rolurilor, scris de Exportă', async ({ page }) => {
  await page.goto('/');
  await importaRelief(page);
  await rolRelief3d(page);
  await page.locator('[data-actiune="export.gcode"]').click();
  const randDeg = page.locator('[data-nav-op][data-fel="degrosare"]'), randFin = page.locator('[data-nav-op][data-fel="finisare"]');
  const deg = page.locator('[data-fisa="op"][data-fel="degrosare"]'), fin = page.locator('[data-fisa="op"][data-fel="finisare"]');
  await randDeg.locator('[data-nav]').click();
  const tDeg = await deg.locator('[data-camp="relief-scula"]').inputValue();
  await randFin.locator('[data-nav]').click();
  await fin.locator('[data-camp="relief-scula"]').fill(tDeg);
  // Conflictul: în grupul frezei al ambelor fișe, cu butonul; câmpurile frezei înroșite; Exportă oprit.
  const greseala = fin.locator('[data-grup="freza-relief"] [data-greseala]');
  await expect(greseala).toContainText(`T${tDeg}`);
  await expect(fin.locator('[data-camp="relief-scula"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(fin.locator('[data-camp="relief-diametru"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  const buton = fin.locator('[data-grup="freza-relief"] [data-da-t]');
  await expect(buton).toBeVisible();
  const nou = await buton.getAttribute('data-da-t');
  expect(nou).not.toBe(tDeg);
  await expect(buton).toHaveText(`Dă-i T${nou ?? ''}`);
  await randDeg.locator('[data-nav]').click();
  await expect(deg.locator('[data-grup="freza-relief"] [data-da-t]')).toBeVisible();
  await randFin.locator('[data-nav]').click();
  await buton.click();
  await expect(fin.locator('[data-camp="relief-scula"]')).toHaveValue(nou ?? '');
  await expect(fin.locator('[data-grup="freza-relief"] [data-greseala]')).toHaveCount(0);
  await expect(fin.locator('[data-camp="relief-scula"]')).toHaveAttribute('aria-invalid', 'false');
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  // Exportă scrie numărul nou: fereastra redeschisă îl arată.
  await page.locator('[data-buton="exporta"]').click();
  const iesire = page.getByTestId('iesire-foaie');
  await expect(iesire).toBeVisible();
  await iesire.getByRole('checkbox').check();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  expect(text).toContain(`T${nou ?? ''}`);
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await randFin.locator('[data-nav]').click();
  await expect(fin.locator('[data-camp="relief-scula"]')).toHaveValue(nou ?? '');
});
