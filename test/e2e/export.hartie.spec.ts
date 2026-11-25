/**
 * Fereastra exportului „pe hârtie” (ADR 0291, felia 28.8↑h), pe cele două cazuri ale auditului:
 * - constatarea 1: cu supracursa prin foaie, desenul adâncimii și nota trecerilor spun ce taie programul (4 treceri de 4,575 până
 *   la 18,3; nota, la două zecimale, 4,58), nu împărțirea adâncimii scrise; fără bifă, cea scrisă;
 * - constatarea 2: cercul de Ø30 cu freza Ø16 e desenat ca elice, fără câmpul ieșirii (ciocănirea nu se aplică); cu Ø30, ca
 *   ciocănire; cu Ø6, greșeala stă lângă freză înainte de clic, Exportă e oprit, iar „Du-mă la …” o aduce întreagă în panou, cu
 *   focusul pe diametrul frezei; la fel la mai multe mărimi ale ferestrei și cu fontul lat (28.8↑h-2).
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';
import { alege } from './ajutor-export.ts';

test.use({ locale: 'ro-RO' });

const fisa = (page: Page, cheie: string) => page.locator(`[data-fisa="op"][data-operatie="${cheie}"]`);
const desen = (page: Page, cheie: string, grup: string) => fisa(page, cheie).locator(`[data-grup="${grup}"] [data-desen] svg`);

async function deschideCu(page: Page, forma: 'dreptunghi' | 'cerc'): Promise<void> {
  await page.goto('/');
  await adauga(page, forma);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav]').first()).toBeVisible();
  await page.mouse.move(2, 2);
}

test('constatarea 1: cu supracursa prin foaie, desenul și nota spun trecerile programului', async ({ page }) => {
  await deschideCu(page, 'dreptunghi');
  const e1 = fisa(page, 'e1/e1');
  // Grosimea foii din desen (a proiectului nou): adâncimea scrisă cât ea.
  const d = desen(page, 'e1/e1', 'adancime');
  const gros = Number((/foaia, ([\d,]+) mm/.exec(await d.textContent() ?? '')?.[1] ?? 'NaN').replace(',', '.'));
  expect(gros, 'grosimea foii în desen').toBe(18);
  await e1.locator('[data-camp="adancime"]').fill('18');
  await e1.locator('[data-camp="pas"]').fill('6');
  await expect(e1.locator('[data-treceri]')).toHaveText('3 treceri de 6 mm');
  await expect(d.locator('[data-trecere]')).toHaveCount(3);
  // Supracursa 0,3 și bifa „și tăieturile cât foaia”: lucrarea taie 18,3 în 4 treceri de 4,575.
  const foaia = page.locator('[data-fisa="foaia"]');
  await foaia.locator('[data-camp="supracursa"]').fill('0,3');
  await foaia.locator('[data-camp="supracursa-prin-foaie"]').check();
  await expect(e1.locator('[data-treceri]')).toHaveText('4 treceri de 4,58 mm, până la 18,3 mm (prin foaie, cu supracursa)');
  await expect(d.locator('[data-trecere]')).toHaveCount(4);
  await expect(d).toContainText('4 treceri egale de 4,58 mm');
  await expect(d.locator('[data-cota="adancime"]')).toContainText('18,3');
  await expect(d).toContainText('în masă 0,3 mm');
  // Fără bifă, ca înainte: 3 de 6 mm.
  await foaia.locator('[data-camp="supracursa-prin-foaie"]').uncheck();
  await expect(e1.locator('[data-treceri]')).toHaveText('3 treceri de 6 mm');
  await expect(d.locator('[data-trecere]')).toHaveCount(3);
});

test('constatarea 2: cercul R15 e elice cu Ø16, ciocănire cu Ø30, iar cu Ø6 greșeala e lângă freză, înainte de clic', async ({ page }) => {
  await deschideCu(page, 'cerc');
  const e1 = fisa(page, 'e1/e1');
  await alege(e1, 'latura', 'gaurire');
  await e1.locator('[data-camp="adancime"]').fill('8');
  await e1.locator('[data-camp="pas"]').fill('4');
  const d = desen(page, 'e1/e1', 'gaurire');
  // Ø16: elicea pe perete, 2 ture de 4 mm pe cercul de R 7; câmpul ieșirii nu se aplică.
  await e1.locator('[data-camp="diametru"]').fill('16');
  await expect(d).toHaveAttribute('data-gaurire', 'elice');
  await expect(d).toContainText('2 ture de 4 mm pe cercul de R 7 mm, apoi una la fund');
  await expect(d.locator('[data-coboara]')).toHaveCount(0);
  await expect(e1.locator('[data-camp="retragere"]')).toHaveCount(0);
  await expect(e1.locator('[data-greseala]')).toHaveCount(0);
  // Ø30 (cât cercul): ciocănirea, cu câmpul ieșirii.
  await e1.locator('[data-camp="diametru"]').fill('30');
  await expect(d).toHaveAttribute('data-gaurire', 'ciocanire');
  await expect(d.locator('[data-coboara]')).toHaveCount(2);
  await expect(e1.locator('[data-camp="retragere"]')).toBeVisible();
  // Ø6: cercul trece de două diametre; greșeala lângă freză, Exportă oprit, „Du-mă la …” duce la ea.
  await e1.locator('[data-camp="diametru"]').fill('6');
  await expect(d).toHaveAttribute('data-gaurire', 'nu-merge');
  const greseala = e1.locator('[data-grup="freza"] [data-greseala]');
  await expect(greseala).toHaveText('Cercul de Ø30 trece de două diametre ale frezei (Ø6): în centru ar rămâne un miez. Alege o freză de cel puțin Ø15, sau taie-l ca buzunar.');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(e1.locator('[data-camp="diametru"]')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('[data-du="e1/e1"]').click();
  await expect.poll(() => cumSeVede(greseala)).toBe('întreagă');
  await expect(e1.locator('[data-camp="diametru"]')).toBeFocused();
});

/**
 * Cum stă un element față de partea văzută a panoului fișelor (după dreptunghiuri, cu jumătate de pixel îngăduință): „întreagă”,
 * sau unde iese, cu cifrele, ca o cădere să spună cât.
 */
function cumSeVede(loc: Locator): Promise<string> {
  return loc.evaluate((e) => {
    const p = e.closest('[data-fise]');
    if (!p) return 'fără panou';
    const r = e.getBoundingClientRect(), v = p.getBoundingClientRect();
    if (r.top >= v.top - 0.5 && r.bottom <= v.bottom + 0.5) return 'întreagă';
    return `iese: ${String(Math.round(r.top))}..${String(Math.round(r.bottom))} față de panoul ${String(Math.round(v.top))}..${String(Math.round(v.bottom))}`;
  });
}

// „Du-mă la …” (28.8↑h-2, după unirea cu 16.A↑b-4): greșeala de sub prima înălțime a panoului (aici, sub rândul „Din frezele
// mele”, care cu „Scrisă de mână (ca „…”)” se rupe pe două rânduri) vine întreagă în vedere, iar focusul stă pe câmpul ei, la
// orice mărime a ferestrei; cu fontul lat, rândurile sunt mai înalte.
for (const [nume, latime, inaltime, lat] of [
  ['1280 × 720', 1280, 720, false], ['1024 × 600, cu fontul lat', 1024, 600, true], ['1280 × 560, cu fontul lat', 1280, 560, true],
  ['telefonul, 390 × 844', 390, 844, false], ['telefonul culcat, 844 × 390', 844, 390, false],
] as const) {
  test(`„Du-mă la …” aduce greșeala întreagă în panou, cu focusul pe câmpul ei (${nume})`, async ({ page }) => {
    await page.setViewportSize({ width: latime, height: inaltime });
    await page.goto('/');
    if (lat) await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
    await adauga(page, 'cerc');
    await page.locator('[data-actiune="export.gcode"]').click();
    await expect(page.locator('[data-nav]').first()).toBeVisible();
    await page.mouse.move(2, 2);
    const e1 = fisa(page, 'e1/e1');
    await alege(e1, 'latura', 'gaurire');
    await e1.locator('[data-camp="diametru"]').fill('6');
    // Biblioteca de pornire recunoaște freza scrisă: rândul listei e cel care a scos greșeala din prima înălțime.
    await expect(e1.locator('[data-camp="freza-biblioteca"] option').first()).toHaveText(/^Scrisă de mână \(ca „/);
    const greseala = e1.locator('[data-grup="freza"] [data-greseala]');
    await expect(greseala).toHaveCount(1);
    // Panoul derulat în altă parte întâi: „Du-mă la …” nu se bizuie pe unde a rămas.
    await page.locator('[data-fise]').evaluate((p) => { p.scrollTop = p.scrollHeight; });
    await page.locator('[data-du="e1/e1"]').click();
    await expect.poll(() => cumSeVede(greseala)).toBe('întreagă');
    await expect(e1.locator('[data-camp="diametru"]')).toBeFocused();
    await expect.poll(() => cumSeVede(e1.locator('[data-camp="diametru"]'))).toBe('întreagă');
  });
}

// Pe o fereastră atât de scundă încât greșeala e mai înaltă decât panoul (844 × 300: panoul are ~86 px, greșeala ~102), se vede
// începutul ei, de la primul rând, nu coada; focusul stă tot pe câmpul ei.
test('„Du-mă la …” pe o fereastră mai scundă decât greșeala: începutul ei, sus în panou (844 × 300)', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 300 });
  await page.goto('/');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav]').first()).toBeVisible();
  await page.mouse.move(2, 2);
  const e1 = fisa(page, 'e1/e1');
  await alege(e1, 'latura', 'gaurire');
  await e1.locator('[data-camp="diametru"]').fill('6');
  const greseala = e1.locator('[data-grup="freza"] [data-greseala]');
  await page.locator('[data-du="e1/e1"]').click();
  await expect(e1.locator('[data-camp="diametru"]')).toBeFocused();
  const loc = await greseala.evaluate((e) => {
    const p = e.closest('[data-fise]')?.getBoundingClientRect(), r = e.getBoundingClientRect();
    return p ? { inalta: r.height > p.height, sus: r.top - p.top } : null;
  });
  expect(loc?.inalta, 'greșeala e mai înaltă decât panoul (altfel proba nu judecă nimic)').toBe(true);
  expect(loc?.sus, 'primul rând al greșelii, sus în panou').toBeGreaterThanOrEqual(-0.5);
  expect(loc?.sus).toBeLessThanOrEqual(16);
});
