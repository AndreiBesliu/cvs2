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

/** Sculele unui program, pe hârtie: freza plată Ø6 întâi, dacă programul schimbă freza, apoi V60 Ø6. */
const scule = (text: string): SculaOracol[] => {
  const v: SculaOracol = { tip: 'v', diametru: 6, unghi: 60 };
  return /^T\d+ M6$/m.test(text) ? [{ tip: 'plata', diametru: 6 }, v] : [v];
};

/**
 * Incrustația în V (ADR 0170), de la capăt la capăt, pe cercul R15 din (70, 50): rolul ales din panou (freza Ø6 devine V60 Ø6,
 * adâncimea cât conul ei, fundul plat cu freza plată de dinainte), apoi adâncimea 3 și fierăstrăul 2 scrise în panou, cu
 * secțiunea pe hârtie: S = 3 − 0,5 = 2,5; contactul 2,5 · tan 30° = 1,44; conul 4,5 din 3 / tan 30° = 5,196; semifabricatul
 * 2,5 + 2 + 1 = 5,5. Fereastra exportului arată rândul incrustației; un fierăstrău peste con e refuzat la export, cu motivul;
 * Exportă descarcă programul foii și pe al dopului (semifabricatul 30 + 2 · 5 = 40 × 40), iar oracolul potrivirii, pe
 * octeții din browser, cere oprirea la S ± 0,05, pereții în contact pe 95 % din bandă, jocul g și spațiul H ± 0,05.
 */
test('incrustația în V: rolul din panou, valorile pe hârtie, exportul cu fișierul dopului, potrivirea pe oracol', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'cerc');
  const rol = taierea(page).locator('[data-camp="rol"]');
  await expect(rol.locator('option')).toHaveText(['exterior', 'interior', 'pe linie', 'buzunar', 'găurire', 'V-carve', 'incrustație în V']);
  await rol.selectOption('incrustatie');
  // Adâncimea a devenit conul V60 Ø6 (8 nu încape), jocul 0,5, iar fierăstrăul cât mai rămâne din con (0,5).
  await expect(taierea(page).locator('[data-camp="adancime"]')).toHaveValue('5,196');
  await expect(taierea(page).locator('[data-camp="inc-joc"]')).toHaveValue('0,5');
  await expect(taierea(page).locator('[data-camp="inc-fierastrau"]')).toHaveValue('0,5');
  await expect(taierea(page).locator('[data-camp="inc-margine"]')).toHaveValue('5');
  await scrie(page, 'adancime', '3');
  await scrie(page, 'inc-fierastrau', '2');
  const hartie = page.getByTestId('prop-incrustatie-hartie');
  await expect(hartie).toContainText('Dopul intră2.50 mm în locaș (adâncimea − jocul)');
  await expect(hartie).toContainText('Pereții lipițipe 1.44 mm de la contur');
  await expect(hartie).toContainText('Sub dop, pentru clei0.50 mm');
  await expect(hartie).toContainText('Între plăci2.00 mm');
  await expect(hartie).toContainText('Conul frezei4.50 din 5.20 mm');
  await expect(hartie).toContainText('Semifabricatul dopuluigros de cel puțin 5.50 mm');
  // Operația, în panou și în arbore.
  await expect(page.locator('.prop-operatie')).toContainText('incrustație în V');
  await expect(page.locator('.prop-operatie')).toContainText('jocul pentru clei 0.50 mm, spațiul pentru fierăstrău 2.00 mm, marginea dopului 5.00 mm');
  const comuta = page.locator('button[data-comuta]').first();
  if ((await comuta.getAttribute('aria-expanded')) !== 'true') await comuta.click();
  await expect(page.locator('[data-nod="operatie"]')).toContainText(', incrustație cu dop (jocul 0.5 mm)');

  // Fereastra exportului: rândul incrustației, cu freza în V, fundul plat și valorile din panou.
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('tr[data-operatie]').first();
  await expect(rand.locator('[data-camp="latura"]')).toHaveValue('incrustatie');
  await expect(rand.locator('[data-camp="forma-scula"]')).toHaveValue('v');
  const detalii = page.locator('tr[data-detalii]').first();
  await expect(detalii.locator('[data-camp="fund-plat"]')).toBeChecked();
  await expect(detalii.locator('[data-camp="inc-joc"]')).toHaveValue('0,5');
  await expect(detalii.locator('[data-camp="inc-acelasi"]')).not.toBeChecked();
  await expect(detalii.locator('[data-camp="inc-fierastrau"]')).toHaveValue('2');
  await expect(detalii.locator('[data-camp="inc-margine"]')).toHaveValue('5');
  // „Același spațiu”: fierăstrăul ia jocul și se oprește; scos, revine la al lui.
  await detalii.locator('[data-camp="inc-acelasi"]').check();
  await expect(detalii.locator('[data-camp="inc-fierastrau"]')).toHaveValue('0,5');
  await expect(detalii.locator('[data-camp="inc-fierastrau"]')).toBeDisabled();
  await detalii.locator('[data-camp="inc-acelasi"]').uncheck();
  await expect(detalii.locator('[data-camp="inc-fierastrau"]')).toHaveValue('2');
  // Un fierăstrău de 3: dopul s-ar săpa la 2,5 + 3 = 5,5, peste conul de 5,196: exportul e refuzat, cu motivul.
  await detalii.locator('[data-camp="inc-fierastrau"]').fill('3');
  await page.locator('[data-buton="exporta"]').click();
  await expect(page.getByTestId('export-stare')).toContainText('dopul se sapă până la 5.5 mm');
  await detalii.locator('[data-camp="inc-fierastrau"]').fill('2');

  const descarcari: Download[] = [];
  page.on('download', (d) => { descarcari.push(d); });
  await page.locator('[data-buton="exporta"]').click();
  const dopuri = page.getByTestId('export-dopuri');
  await expect(dopuri).toContainText('Dopul, descărcat: cncvs2-stanga-jos-dop-1');
  await expect(dopuri).toContainText('pe un semifabricat de 40 × 40 mm, gros de cel puțin 5,5 mm (XY0 în colțul ales, Z0 pe fața lui)');
  // Fața se coboară până dincolo de margini: regiunea e lărgită cât să treacă freza dreaptă Ø6 pe lângă dop, pe partea cea mai
  // îngustă: e = max(2 tan 30° + 1, 6 + 2 (2 tan 30° + 0,002) − 5 + 0,5) = 3,813, plus raza 3 → 6,9 mm.
  await expect(page.getByTestId('export-avertismente')).toContainText('dopul e1/e1: freza trece cu până la 6.9 mm dincolo de marginile semifabricatului');
  await expect.poll(() => descarcari.length).toBe(2);
  const dop = descarcari.find((d) => /-dop-1\b/.test(d.suggestedFilename()));
  const foaie = descarcari.find((d) => !/-dop-/.test(d.suggestedFilename()));
  if (!dop || !foaie) throw new Error(`descărcările: ${descarcari.map((d) => d.suggestedFilename()).join(', ')}`);
  const locas = readFileSync(await foaie.path(), 'ascii'), textDop = readFileSync(await dop.path(), 'ascii');
  const m = masoaraPotrivirea(
    { text: locas, scule: scule(locas) }, { text: textDop, scule: scule(textDop) }, [poligonCerc(70, 50, 15)],
    { D: 3, g: 0.5, H: 2, margine: 5, unghi: 60, celula: 0.1, lat: 2 * Math.tan(Math.PI / 6) + 1 },
  );
  const unde = `oprirea ${m.asezare.toFixed(4)}, contactul ${(m.contact * 100).toFixed(1)} % din ${m.nContact}, sub ${JSON.stringify(m.sub)}, între ${JSON.stringify(m.intre)}`;
  expect(Math.abs(m.asezare - 2.5), unde).toBeLessThanOrEqual(0.05);
  expect(m.nContact, unde).toBeGreaterThan(0);
  expect(m.contact, unde).toBeGreaterThanOrEqual(0.95);
  expect(m.sub.n, unde).toBeGreaterThan(0);
  expect(m.sub.min, unde).toBeGreaterThanOrEqual(0.45);
  expect(m.sub.max, unde).toBeLessThanOrEqual(0.55);
  expect(m.intre.n, unde).toBeGreaterThan(0);
  expect(m.intre.min, unde).toBeGreaterThanOrEqual(1.95);
  expect(m.intre.max, unde).toBeLessThanOrEqual(2.05);

  // Jocul schimbat din panou: secțiunea pe hârtie și arborele îl urmează.
  await page.getByRole('button', { name: 'Închide' }).click();
  await scrie(page, 'inc-joc', '0,4');
  await expect(hartie).toContainText('Dopul intră2.60 mm în locaș');
  await expect(page.locator('[data-nod="operatie"]')).toContainText(', incrustație cu dop (jocul 0.4 mm)');
});

/**
 * Incrustația aleasă direct în fereastra exportului (ADR 0170 §5): opțiunea din lista Tăietura bifează fundul plat (fața
 * dopului cere freza dreaptă) și arată jocurile implicite; cu „Același spațiu” bifat, Exportă scrie jocul și ca fierăstrău.
 * Găsită prin otrăvurile 12.1 (E05, E06): proba de mai sus alege rolul din panou, deci nu trecea pe aici.
 */
test('incrustația din fereastra exportului: fundul plat bifat singur; „Același spațiu” scrie jocul și ca fierăstrău', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('tr[data-operatie]').first();
  await rand.locator('[data-camp="latura"]').selectOption('incrustatie');
  const detalii = page.locator('tr[data-detalii]').first();
  await expect(detalii.locator('[data-camp="fund-plat"]')).toBeChecked();
  await expect(detalii.locator('[data-camp="inc-joc"]')).toHaveValue('0,5');
  await expect(detalii.locator('[data-camp="inc-fierastrau"]')).toHaveValue('2');
  await expect(detalii.locator('[data-camp="inc-margine"]')).toHaveValue('5');
  await rand.locator('[data-camp="forma-scula"]').selectOption('v');
  await rand.locator('[data-camp="diametru"]').fill('6');
  await rand.locator('[data-camp="adancime"]').fill('3');
  await rand.locator('[data-camp="pas"]').fill('1,5');
  await detalii.locator('[data-camp="inc-acelasi"]').check();
  await detalii.locator('[data-camp="inc-joc"]').fill('0,6');
  await expect(detalii.locator('[data-camp="inc-fierastrau"]')).toHaveValue('0,6');
  await page.locator('[data-buton="exporta"]').click();
  await expect(page.getByTestId('export-dopuri')).toContainText('Dopul, descărcat');
  await page.getByRole('button', { name: 'Închide' }).click();
  // În proiect: jocul și fierăstrăul sunt amândouă 0,6 (panoul le arată), iar pe hârtie dopul intră 3 − 0,6 = 2,4.
  await expect(taierea(page).locator('[data-camp="inc-joc"]')).toHaveValue('0,6');
  await expect(taierea(page).locator('[data-camp="inc-fierastrau"]')).toHaveValue('0,6');
  await expect(page.getByTestId('prop-incrustatie-hartie')).toContainText('Dopul intră2.40 mm în locaș');
});
