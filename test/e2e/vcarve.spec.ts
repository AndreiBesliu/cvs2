import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { judeca, type GrilaOracol, type SculaOracol } from '../oracles/simulare.ts';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

/**
 * V-carve-ul (ADR 0090) din fereastra exportului, pe dreptunghiul 100 × 60 (20…120 × 20…80): cu freza plată e oprit, cu
 * motivul; cu freza în V (90°, Ø6), 3 mm în două treceri, programul descărcat e judecat de oracolul simulării pe octeții din
 * browser: pereții exacți (z = −d până la d = 3, conul frezei pe inelul de la 3 mm), nimic sub −3 și nimic în afară; fundul
 * plat dintre pereți rămâne, cu avertismentul lui. Operația rămâne în proiect: arborele, panoul și dialogul redeschis.
 */
test('V-carve-ul din fereastra exportului: freza plată refuzată, freza în V pe oracol, și operația rămâne în proiect', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('tr[data-operatie]').first();
  await rand.locator('[data-camp="latura"]').selectOption('vcarve');
  for (const camp of ['urechi', 'rampa', 'intrari', 'colturi']) await expect(rand.locator(`[data-camp="${camp}"]`)).toBeDisabled();
  await expect(page.locator('[data-vcarve]')).toContainText('fără ea, fundul rămâne');
  // Cu freza plată (implicit): exportul e oprit, cu motivul.
  await expect(rand.locator('[data-camp="forma-scula"]')).toHaveValue('plata');
  await expect(rand.locator('[data-camp="unghi-v"]')).toHaveCount(0);
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('V-carve-ul cere o freză în V');
  // Freza în V: unghiul apare, cu 60° implicit; 0° și 180° nu trec.
  await rand.locator('[data-camp="forma-scula"]').selectOption('v');
  const unghi = rand.locator('[data-camp="unghi-v"]');
  await expect(unghi).toHaveValue('60');
  for (const rau of ['0', '180']) {
    await unghi.fill(rau);
    await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
    await expect(page.getByTestId('export-invalid')).toContainText('un unghi între 1° și 179°');
  }
  await unghi.fill('90');
  await rand.locator('[data-camp="diametru"]').fill('6');
  await rand.locator('[data-camp="adancime"]').fill('3');
  await rand.locator('[data-camp="pas"]').fill('1,5');
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  await expect(page.getByTestId('export-avertismente')).toContainText('fundul plat dintre ei rămâne pentru freza dreaptă');
  // Oracolul simulării, cu conul V90 Ø6: pereții exacți, nimic sub −3, nimic în afară (pe colțurile de 90°, d e distanța
  // la cea mai apropiată latură).
  const g = { x0: 15, y0: 15, latime: 110, inaltime: 70, celula: 0.25 };
  const o = judeca(text, g, { tip: 'v', diametru: 6, unghi: 90 });
  let pereti = 0, adanc = 0, afara = 0;
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const x = g.x0 + (i + 0.5) * g.celula, y = g.y0 + (j + 0.5) * g.celula;
      const z = o.z[j * o.nx + i] ?? Number.NaN;
      const inauntru = x > 20 && x < 120 && y > 20 && y < 80;
      if (!inauntru) { if (!(z > -1e-6)) afara++; continue; }
      const d = Math.min(x - 20, 120 - x, y - 20, 80 - y);
      if (z < -Math.min(3, d) - 0.002) adanc++;
      if (d <= 3 && Math.abs(z + d) > 0.01) pereti++;
    }
  }
  expect({ pereti, adanc, afara }).toEqual({ pereti: 0, adanc: 0, afara: 0 });
  // Operația a intrat în proiect: în arbore, în panou (freza în V) și la redeschidere, cu forma și unghiul ei.
  await page.getByRole('button', { name: 'Închide' }).click();
  const comuta = page.locator('button[data-comuta]').first();
  if ((await comuta.getAttribute('aria-expanded')) !== 'true') await comuta.click();
  await expect(page.locator('[data-nod="operatie"]')).toHaveText(['V-carve pe 1 contur: până la 3 mm, în treceri de 1.5 mm, T1 Ø6']);
  const panou = page.locator('[data-panou="proprietati"]');
  if ((await panou.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  await expect(panou).toContainText('V-carve');
  await expect(panou).toContainText('T1, V 90°, Ø6.00 mm');
  await page.locator('[data-actiune="export.gcode"]').click();
  const din = page.locator('tr[data-operatie]').first();
  await expect(din.locator('[data-camp="latura"]')).toHaveValue('vcarve');
  await expect(din.locator('[data-camp="forma-scula"]')).toHaveValue('v');
  await expect(din.locator('[data-camp="unghi-v"]')).toHaveValue('90');
});

test('același T cu două forme e un conflict de freze: T1 plată Ø6 și T1 V90 Ø6 opresc exportul, cu motivul', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  const randuri = page.locator('tr[data-operatie]');
  await expect(randuri).toHaveCount(2);
  for (let k = 0; k < 2; k++) await randuri.nth(k).locator('[data-camp="diametru"]').fill('6');
  await randuri.nth(1).locator('[data-camp="forma-scula"]').selectOption('v');
  await randuri.nth(1).locator('[data-camp="unghi-v"]').fill('90');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('T1 are două freze (Ø6 mm, Ø6 mm V90°): fiecare freză cere numărul ei.');
  await randuri.nth(1).locator('[data-camp="scula"]').fill('2');
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
});

/** Programul tăiat la fiecare `T… M6`, judecat pe sculă de oracol; suprafața e minimul bucăților. */
function judecaPeScule(text: string, g: GrilaOracol, scule: readonly SculaOracol[]): { z: Float64Array; nx: number; ny: number } {
  const bucati = text.split(/^T\d+ M6$/m);
  expect(bucati.length).toBe(scule.length);
  const o = bucati.map((b, k) => judeca(b, g, scule[k]!));
  return { z: o[0]!.z.map((v, i) => Math.min(v, ...o.slice(1).map((x) => x.z[i]!))), nx: o[0]!.nx, ny: o[0]!.ny };
}

/**
 * Fundul plat cu freza dreaptă (ADR 0091), pe dreptunghiul 100 × 60 (20…120 × 20…80), V90 Ø6, 3 mm: bifa (câmpurile oprite
 * fără ea, cu implicitele T2, Ø3,175, pasul 1,3), conflictul cu T-ul V-ului și pasul prea mare; programul descărcat are două
 * freze (întâi cea dreaptă), judecat de oracol pe sculă: pereții exacți, nimic mai adânc, fundul la −3, creasta doar în
 * colțuri; operația rămâne în proiect (arborele, panoul, dialogul redeschis).
 */
test('fundul plat cu freza dreaptă: bifa, conflictul, programul cu două freze pe oracol, operația în proiect', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('tr[data-operatie]').first();
  await rand.locator('[data-camp="latura"]').selectOption('vcarve');
  await rand.locator('[data-camp="forma-scula"]').selectOption('v');
  await rand.locator('[data-camp="unghi-v"]').fill('90');
  await rand.locator('[data-camp="diametru"]').fill('6');
  await rand.locator('[data-camp="adancime"]').fill('3');
  await rand.locator('[data-camp="pas"]').fill('1,5');
  const fund = page.locator('[data-fund]');
  for (const [camp, valoare] of [['fund-scula', '2'], ['fund-diametru', '3,175'], ['fund-pas', '1,3']] as const) {
    await expect(fund.locator(`[data-camp="${camp}"]`)).toBeDisabled();
    await expect(fund.locator(`[data-camp="${camp}"]`)).toHaveValue(valoare);
  }
  await fund.locator('[data-camp="fund-plat"]').check();
  await expect(fund.locator('[data-camp="fund-scula"]')).toBeEnabled();
  // Același T cu V-ul: conflictul, cu diametrul scris după limbă.
  await fund.locator('[data-camp="fund-scula"]').fill('1');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('T1 are două freze (Ø6 mm V90°, Ø3,175 mm)');
  await fund.locator('[data-camp="fund-scula"]').fill('2');
  // Pasul lateral peste raza frezei drepte.
  await fund.locator('[data-camp="fund-pas"]').fill('1,6');
  await expect(page.getByTestId('export-invalid')).toContainText('Fundul plat: freza dreaptă cere');
  await fund.locator('[data-camp="fund-pas"]').fill('1,3');
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  await expect(page.getByText('rămâne pentru freza dreaptă')).toHaveCount(0);
  expect(text.match(/^T\d+ M6$/gm)).toEqual(['T1 M6']);
  expect(text).toContain('T2 freza dreapta D3.175');
  const g = { x0: 15, y0: 15, latime: 110, inaltime: 70, celula: 0.25 };
  const o = judecaPeScule(text, g, [{ tip: 'plata', diametru: 3.175 }, { tip: 'v', diametru: 6, unghi: 90 }]);
  let pereti = 0, adanc = 0, afara = 0, fundul = 0, creasta = 0;
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const x = g.x0 + (i + 0.5) * g.celula, y = g.y0 + (j + 0.5) * g.celula;
      const z = o.z[j * o.nx + i] ?? Number.NaN;
      if (!(x > 20 && x < 120 && y > 20 && y < 80)) { if (!(z > -1e-6)) afara++; continue; }
      const d = Math.min(x - 20, 120 - x, y - 20, 80 - y);
      if (z < -Math.min(3, d) - 0.002) adanc++;
      if (d <= 3 && Math.abs(z + d) > 0.01) pereti++;
      // Colțurile lui F, unde freza dreaptă nu ajunge: până la 3 + 0,002 + 1,5875 de colțul dreptunghiului.
      const colt = (x < 25 || x > 115) && (y < 25 || y > 75);
      if (d >= 3.1 && !colt && Math.abs(z + 3) > 0.002) fundul++;
      if (d >= 3 && colt) creasta = Math.max(creasta, z + 3);
    }
  }
  expect({ pereti, adanc, afara, fundul }).toEqual({ pereti: 0, adanc: 0, afara: 0, fundul: 0 });
  expect(creasta).toBeLessThanOrEqual(0.065);
  // Operația a intrat în proiect: în arbore, în panou (freza fundului) și la redeschidere, cu bifa și freza ei.
  await page.getByRole('button', { name: 'Închide' }).click();
  const comuta = page.locator('button[data-comuta]').first();
  if ((await comuta.getAttribute('aria-expanded')) !== 'true') await comuta.click();
  await expect(page.locator('[data-nod="operatie"]')).toHaveText(['V-carve pe 1 contur: până la 3 mm, în treceri de 1.5 mm, T1 Ø6, fundul plat cu T2 Ø3.175']);
  const panou = page.locator('[data-panou="proprietati"]');
  if ((await panou.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  await expect(panou).toContainText('Fundul plat');
  await expect(panou).toContainText('T2, Ø3.175 mm, pasul lateral 1.30 mm');
  await page.locator('[data-actiune="export.gcode"]').click();
  const din = page.locator('[data-fund]');
  await expect(din.locator('[data-camp="fund-plat"]')).toBeChecked();
  await expect(din.locator('[data-camp="fund-scula"]')).toHaveValue('2');
  await expect(din.locator('[data-camp="fund-diametru"]')).toHaveValue('3,175');
  await expect(din.locator('[data-camp="fund-pas"]')).toHaveValue('1,3');
});
