import { test, expect, type Download, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { masoaraPotrivirea, type PunctO } from '../oracles/incrustatie.ts';
import type { SculaOracol } from '../oracles/simulare.ts';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const taierea = (page: Page) => page.getByTestId('prop-taierea');

/** Scrie o valoare într-un câmp al secțiunii Tăierea și o aplică (Enter). */
async function scrie(page: Page, camp: string, valoare: string): Promise<void> {
  const c = taierea(page).locator(`[data-camp="${camp}"]`);
  await c.fill(valoare);
  await c.press('Enter');
}

/** Cercul ca poligon de 720 de laturi (oracolul măsoară distanța la desen). */
const poligonCerc = (cx: number, cy: number, r: number, n = 720): PunctO[] =>
  Array.from({ length: n }, (_, k) => [cx + r * Math.cos((2 * Math.PI * k) / n), cy + r * Math.sin((2 * Math.PI * k) / n)] as const);

/**
 * Sculele unui program, pe hârtie: la pornire freza plată Ø6 dacă programul schimbă freza (fundul plat, apoi V60 Ø6 pentru
 * pereți și, la dop, iar freza plată pentru decupare), altfel V60 Ø6.
 */
const scule = (text: string): SculaOracol[] => {
  const v: SculaOracol = { tip: 'v', diametru: 6, unghi: 60 }, plata: SculaOracol = { tip: 'plata', diametru: 6 };
  const m6 = (text.match(/^T\d+ M6$/gm) ?? []).length;
  return m6 === 0 ? [v] : [plata, ...Array.from({ length: m6 }, (_, k) => (k % 2 === 0 ? v : plata))];
};

/** Cercul R15 din (70, 50), cu rolul incrustației în V ales din panou, adâncimea 3 și fierăstrăul 2; apoi fereastra exportului. */
async function pregateste(page: Page): Promise<void> {
  await page.goto('/');
  await adauga(page, 'cerc');
  await taierea(page).locator('[data-camp="rol"]').selectOption('incrustatie');
  await scrie(page, 'adancime', '3');
  await scrie(page, 'inc-fierastrau', '2');
  await page.locator('[data-actiune="export.gcode"]').click();
}

/**
 * Banda îngustă din jurul dopului în V (ADR 0172), de la capăt la capăt, pe cercul R15 (V60 Ø6, fundul plat Ø6, D 3, g 0,5,
 * H 2, marginea 5). Pe hârtie: t = tan 30°; banda cea mai îngustă 2·2·t + 6 + 2·0,5 = 9,309 (arătată 9,31); e = 2t + 0,5 =
 * 1,655; placa implicită S + H + 1 = 5,5; marginea semifabricatului 9,309 + 2,5t + 5 = 15,753, deci placa are 30 + 2·15,753 =
 * 61,506 pe fiecare latură. Fereastra arată valorile implicite (lățimea goală, cu cea mai mică; decuparea pusă; placa goală, cu
 * 5,5; punțile 4 × 4 × 1), refuză o bandă mai îngustă, iar cu placa de 6 mm descarcă programul foii și pe al dopului: oracolul
 * potrivirii, pe octeții din browser, cere piesa păstrată (punțile rupte) oprită la S ± 0,05, pereții în contact pe 95 %, g și
 * H ± 0,05, întinsă de la desen între e și e + 3. Panoul arată banda pe hârtie.
 */
test('banda dopului în V: alegerile din fereastră, exportul pe placa exactă, potrivirea piesei decupate pe oracol, panoul', async ({ page }) => {
  // Oracolul potrivirii, pe un dop cu bandă, măsoară ~15 s în browserul probei (o fereastră de 0,1 mm în jurul cercului).
  test.setTimeout(120_000);
  await pregateste(page);
  const detalii = page.locator('tr[data-detalii]').first();
  await expect(detalii.locator('[data-camp="inc-jur"]')).toHaveValue('fata');
  await expect(detalii.locator('[data-camp="banda-latime"]')).toHaveCount(0);
  await detalii.locator('[data-camp="inc-jur"]').selectOption('banda');
  const latime = detalii.locator('[data-camp="banda-latime"]'), placa = detalii.locator('[data-camp="banda-placa"]');
  await expect(latime).toHaveValue('');
  await expect(latime).toHaveAttribute('placeholder', '9,31');
  await expect(detalii.locator('[data-camp="banda-minima"]')).toHaveText('cea mai mică: 9,31 mm');
  await expect(detalii.locator('[data-camp="banda-decupare"]')).toBeChecked();
  await expect(placa).toHaveValue('');
  await expect(placa).toHaveAttribute('placeholder', '5,5');
  await expect(detalii.locator('[data-camp="banda-placa-minima"]')).toHaveText('cel puțin 5,5 mm');
  await expect(detalii.locator('[data-camp="banda-punti-numar"]')).toHaveValue('4');
  await expect(detalii.locator('[data-camp="banda-punti-latime"]')).toHaveValue('4');
  await expect(detalii.locator('[data-camp="banda-punti-grosime"]')).toHaveValue('1');
  await expect(detalii.locator('[data-camp="banda-freza"]')).not.toBeChecked();
  await expect(page.locator('.nota-incrustatie').first()).toContainText('Marginile semifabricatului rămân întregi');
  // Mai îngustă decât cea mai mică: câmpul e greșit, iar Exportă se oprește, cu motivul.
  await latime.fill('9,3');
  await expect(latime).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('Banda dopului cere lățimea goală (cea mai mică) sau cel puțin cea mai mică');
  await latime.fill('9,31');
  await expect(latime).toHaveAttribute('aria-invalid', 'false');
  await latime.fill('');
  // Punți groase de 2: placa goală (5,5) e sub fundul benzii plus punțile (6,5).
  await detalii.locator('[data-camp="banda-punti-grosime"]').fill('2');
  await expect(detalii.locator('[data-camp="banda-placa-minima"]')).toHaveText('cel puțin 6,5 mm');
  await expect(placa).toHaveAttribute('aria-invalid', 'true');
  await detalii.locator('[data-camp="banda-punti-grosime"]').fill('1');
  await placa.fill('6');

  const descarcari: Download[] = [];
  page.on('download', (d) => { descarcari.push(d); });
  await page.locator('[data-buton="exporta"]').click();
  const dopuri = page.getByTestId('export-dopuri');
  await expect(dopuri).toContainText('Dopul, descărcat: cncvs2-stanga-jos-dop-1');
  await expect(dopuri).toContainText('pe o placă de 61,506 × 61,506 mm, groasă de exact 6 mm: tăietura trece prin ea, cu punți');
  const avertismente = page.getByTestId('export-avertismente');
  await expect(avertismente).toContainText('dopul e1/e1: e decupat din placa groasă de exact 6 mm, cu 4 punți pe buclă, late de 4 mm și groase de 1 mm');
  await expect(avertismente).not.toContainText('dincolo de marginile semifabricatului');
  await expect.poll(() => descarcari.length).toBe(2);
  const dop = descarcari.find((d) => /-dop-1\b/.test(d.suggestedFilename()));
  const foaie = descarcari.find((d) => !/-dop-/.test(d.suggestedFilename()));
  if (!dop || !foaie) throw new Error(`descărcările: ${descarcari.map((d) => d.suggestedFilename()).join(', ')}`);
  const locas = readFileSync(await foaie.path(), 'ascii'), textDop = readFileSync(await dop.path(), 'ascii');
  // Programul dopului: fundul (plată), pereții (V), decuparea (iar plată): două schimbări.
  expect((textDop.match(/^T\d+ M6$/gm) ?? []).length).toBe(2);
  const t = Math.tan(Math.PI / 6), e = 2 * t + 0.5, margine = 2 * 2 * t + 7 + 2.5 * t + 5;
  const m = masoaraPotrivirea(
    { text: locas, scule: scule(locas) }, { text: textDop, scule: scule(textDop) }, [poligonCerc(70, 50, 15)],
    { D: 3, g: 0.5, H: 2, margine, unghi: 60, celula: 0.1, lat: e + 4, decupare: { grosimePlaca: 6, grosimePunte: 1 } },
  );
  const unde = `oprirea ${m.asezare.toFixed(4)}, contactul ${(m.contact * 100).toFixed(1)} % din ${m.nContact}, sub ${JSON.stringify(m.sub)}, între ${JSON.stringify(m.intre)}, întinderea ${m.intindere.toFixed(3)}`;
  expect(Math.abs(m.asezare - 2.5), unde).toBeLessThanOrEqual(0.05);
  expect(m.nContact, unde).toBeGreaterThan(0);
  expect(m.contact, unde).toBeGreaterThanOrEqual(0.95);
  expect(m.sub.n, unde).toBeGreaterThan(0);
  expect(m.sub.min, unde).toBeGreaterThanOrEqual(0.45);
  expect(m.sub.max, unde).toBeLessThanOrEqual(0.55);
  expect(m.intre.n, unde).toBeGreaterThan(0);
  expect(m.intre.min, unde).toBeGreaterThanOrEqual(1.95);
  expect(m.intre.max, unde).toBeLessThanOrEqual(2.05);
  expect(m.intindere, unde).toBeGreaterThanOrEqual(e - 0.2);
  expect(m.intindere, unde).toBeLessThanOrEqual(e + 3 + 0.2);

  // În proiect: banda e scrisă (lățimea goală nu: cea mai mică), iar panoul o arată pe hârtie.
  await page.getByRole('button', { name: 'Închide' }).click();
  await expect(page.locator('.prop-operatie')).toContainText('Lemnul din jurul dopuluibanda îngustă');
  const hartie = page.getByTestId('prop-incrustatie-hartie');
  await expect(hartie).toContainText('Bandalată de 9.31 mm (cea mai mică: 9.31 mm)');
  await expect(hartie).toContainText('Semifabricatul, în plancutia desenului plus 15.75 mm pe fiecare parte');
  await expect(hartie).toContainText('Decupareaprin placa de 6.00 mm; punți pe buclă: 4, de 4.00 × 1.00 mm');
  await expect(hartie).toContainText('Semifabricatul dopuluigros de 6.00 mm');
  // Redeschisă, fereastra arată valorile scrise.
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(detalii.locator('[data-camp="inc-jur"]')).toHaveValue('banda');
  await expect(latime).toHaveValue('');
  await expect(placa).toHaveValue('6');
});

/**
 * Banda fără decupare și freza decupării proprie (ADR 0172, răspunsurile 2 și 4): lățimea 10, 3 punți și freza T9 Ø4 alese,
 * apoi decuparea scoasă: placa, punțile și freza se opresc, dopul are „cel puțin” S + H + 1 și un singur schimb de freză (fundul,
 * apoi pereții), iar avertismentul spune unde se taie de mână. Redeschisă, fereastra arată ce s-a scris (și ce era oprit).
 * Cu decuparea și placa goală, placa e S + H + 1, exactă, iar dopul are două schimburi (pereții, apoi T9). Cu freza ei, același
 * T cu alt diametru decât freza în V e un conflict, iar Exportă se oprește.
 */
test('banda fără decupare: placa „cel puțin”, tăietura de mână; ce s-a ales, redeschis; placa goală; conflictul frezei', async ({ page }) => {
  test.setTimeout(90_000);
  await pregateste(page);
  const rand = page.locator('tr[data-operatie]').first(), detalii = page.locator('tr[data-detalii]').first();
  await detalii.locator('[data-camp="inc-jur"]').selectOption('banda');
  await detalii.locator('[data-camp="banda-latime"]').fill('10');
  await detalii.locator('[data-camp="banda-punti-numar"]').fill('3');
  await detalii.locator('[data-camp="banda-freza"]').check();
  await detalii.locator('[data-camp="banda-scula"]').fill('9');
  await detalii.locator('[data-camp="banda-diametru"]').fill('4');
  await detalii.locator('[data-camp="banda-decupare"]').uncheck();
  for (const c of ['banda-placa', 'banda-punti-numar', 'banda-punti-latime', 'banda-punti-grosime', 'banda-freza', 'banda-scula', 'banda-diametru']) {
    await expect(detalii.locator(`[data-camp="${c}"]`)).toBeDisabled();
  }
  const descarcari: Download[] = [];
  page.on('download', (d) => { descarcari.push(d); });
  await page.locator('[data-buton="exporta"]').click();
  await expect(page.getByTestId('export-dopuri')).toContainText('gros de cel puțin 5,5 mm');
  await expect(page.getByTestId('export-avertismente')).toContainText('dopul e1/e1: banda lasă marginile întregi; decupează dopul tu, cu fierăstrăul, pe fundul benzii, la cel puțin 1.655 mm de desen');
  await expect.poll(() => descarcari.length).toBe(2);
  const dop = descarcari.find((d) => /-dop-1\b/.test(d.suggestedFilename()));
  if (!dop) throw new Error('fără dop');
  expect((readFileSync(await dop.path(), 'ascii').match(/^T\d+ M6$/gm) ?? []).length).toBe(1);
  // Redeschisă: ce s-a scris în proiect.
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(detalii.locator('[data-camp="inc-jur"]')).toHaveValue('banda');
  await expect(detalii.locator('[data-camp="banda-latime"]')).toHaveValue('10');
  await expect(detalii.locator('[data-camp="banda-decupare"]')).not.toBeChecked();
  await expect(detalii.locator('[data-camp="banda-punti-numar"]')).toHaveValue('3');
  await expect(detalii.locator('[data-camp="banda-freza"]')).toBeChecked();
  await expect(detalii.locator('[data-camp="banda-scula"]')).toHaveValue('9');
  await expect(detalii.locator('[data-camp="banda-diametru"]')).toHaveValue('4');
  // Cu decuparea și placa goală: S + H + 1, exactă; freza ei la urmă.
  await detalii.locator('[data-camp="banda-decupare"]').check();
  await detalii.locator('[data-camp="banda-placa"]').fill('');
  descarcari.length = 0;
  await page.locator('[data-buton="exporta"]').click();
  await expect(page.getByTestId('export-dopuri')).toContainText('groasă de exact 5,5 mm');
  await expect.poll(() => descarcari.length).toBe(2);
  const dop2 = descarcari.find((d) => /-dop-1\b/.test(d.suggestedFilename()));
  if (!dop2) throw new Error('fără dop');
  expect((readFileSync(await dop2.path(), 'ascii').match(/^T\d+ M6$/gm) ?? [])).toContain('T9 M6');
  // Numărul frezei în V cu alt diametru: conflict.
  const numarV = await rand.locator('[data-camp="scula"]').inputValue();
  await detalii.locator('[data-camp="banda-scula"]').fill(numarV);
  await detalii.locator('[data-camp="banda-diametru"]').fill('3');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText(`T${numarV}`);
});
