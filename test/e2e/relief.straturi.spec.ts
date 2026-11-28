import { test, expect, type Page } from '@playwright/test';
import { asezaPeGrila } from '../../src/relief/asezare.ts';
import { reliefDinPixeli } from '../../src/relief/imagine.ts';
import { stratDinGrila } from '../../src/relief/strat.ts';
import { documentSalvat } from './ajutor-document.ts';
import { importaRelief, rolFinisare } from './ajutor-relief.ts';

/**
 * Straturile reliefului în aplicația construită (ADR 0320, felia 18.1↑j): relieful din imagine (64 × 32 mm, jumătatea stângă
 * la 5 mm, cea dreaptă la 0), apoi o imagine albă de 16 × 16 px pusă ca strat nou pe el, la 16 mm lățime (un pixel pe celulă),
 * centrată: pătratul [24, 40] × [8, 24] urcă cu 5 mm, deci compusul are 10 mm în stânga lui și 5 în dreapta. Ochiul, modul,
 * anularea și ordinea, din panou; fiecare se vede în Z-ul compusului și în documentul salvat. Pe hârtie: cu „scade”, pătratul
 * coboară dreapta la −5 și stânga la 0.
 */

test.use({ locale: 'ro-RO' });

type Strat = { readonly id: string; readonly nume?: string; readonly mod: string; readonly vizibil: boolean; readonly dale: string };
const straturiSalvate = async (page: Page, rev: number): Promise<Strat[]> => {
  const d = JSON.parse(await documentSalvat(page, rev)) as { piese: Array<{ radacina: { copii: Array<{ forma: { straturi?: Strat[] } }> } }> };
  return d.piese[0]?.radacina.copii[0]?.forma.straturi ?? [];
};

/** Imaginea albă de 16 × 16 px, adusă prin „Importă…” (fișierul `patrat.png`). */
async function importaPatrat(page: Page, ca: 'strat' | 'piesa' = 'piesa'): Promise<void> {
  await page.evaluate(async () => {
    const c = new OffscreenCanvas(16, 16), g = c.getContext('2d');
    if (!g) throw new Error('fără 2D');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, 16, 16);
    const b = await c.convertToBlob({ type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(new File([b], 'patrat.png', { type: 'image/png' }));
    const intrare = document.querySelector<HTMLInputElement>('[data-camp="fisier-svg"]');
    if (!intrare) throw new Error('fără fereastra de fișiere a importului');
    intrare.files = dt.files;
    intrare.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.getByTestId('import-rezultat').locator('label').filter({ has: page.locator('[data-camp="import-rezultat-relief"]') }).click();
  if (ca === 'piesa') return;
  await page.locator('[data-camp="relief-unde-strat"]').check();
  await page.locator('[data-camp="relief-latime"]').fill('16');
  await page.locator('[data-camp="relief-latime"]').press('Enter');
  await expect(page.getByTestId('relief-grila')).toContainText('Pe „jumatati”');
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('o imagine ca strat nou pe relieful ales; ochiul, modul, anularea și ordinea, cu Z-ul compusului și documentul', async ({ page }) => {
  await page.goto('/');
  await importaRelief(page);
  const z = page.getByTestId('prop-relief').locator('.prop-rand').filter({ hasText: 'Înălțimile' }).locator('dd');
  await expect(z).toHaveText('de la 0.00 la 5.00 mm');
  await importaPatrat(page);
  // Cu un relief ales, a doua alegere; implicit, piesa nouă (ca înainte).
  await expect(page.locator('[data-camp="relief-unde-piesa"]')).toBeChecked();
  await page.locator('[data-camp="relief-unde-strat"]').check();
  // Fără lățime scrisă, imaginea e cât relieful (64 mm: un pixel de 4 mm), deci îl acoperă tot (64 × 64 mm, tăiată sus și jos):
  // stratul singur e la 5 mm peste tot.
  await expect(page.locator('[data-camp="relief-latime"]')).toHaveValue('64');
  await expect(page.getByTestId('relief-z')).toHaveText('Înălțimile: de la 5 la 5 mm.');
  await page.locator('[data-camp="relief-latime"]').fill('16');
  await page.locator('[data-camp="relief-latime"]').press('Enter');
  await expect(page.getByTestId('relief-z')).toHaveText('Înălțimile: de la 0 la 5 mm.');
  await expect(page.getByTestId('relief-grila')).toHaveText(
    'Pe „jumatati”: 64 × 32 celule de 1 mm (64 × 32 mm). Imaginea stă centrată; ce iese din relief se taie, iar în jurul ei stratul e gol.');
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Poarta amprentei: stratul făcut în browser e cel din Node (imaginea așezată pe grila reliefului), octet cu octet.
  const alb = new Uint8Array(16 * 16 * 4).fill(255);
  const st = await stratDinGrila(asezaPeGrila(reliefDinPixeli(alb, 16, 16, { sursa: 'l', albSus: true, inaltime: 5, baza: 0, sigma: 0 }), 16, 16, 1, { nx: 64, ny: 32, celula: 1 }), 64, 32);
  const dupa = await straturiSalvate(page, 2);
  expect(dupa.map((s) => [s.id, s.nume, s.mod, s.vizibil])).toEqual([['s1', 'jumatati.png', 'aduna', true], ['s2', 'patrat.png', 'aduna', true]]);
  expect(dupa[1]?.dale).toBe(st.amprenta);
  await expect(z).toHaveText('de la 0.00 la 10.00 mm');
  // De sus în jos, ca în compus: stratul nou primul.
  const randuri = page.getByTestId('prop-relief-straturi').locator('li');
  await expect(randuri).toHaveCount(2);
  await expect(randuri.first()).toHaveAttribute('data-strat', 's2');
  const s2 = page.locator('[data-strat="s2"]');
  // Ochiul: ascuns, stratul nu intră în compus.
  await s2.locator('[data-buton="strat-ochi"]').click();
  await expect(s2).toHaveAttribute('data-vizibil', 'false');
  await expect(z).toHaveText('de la 0.00 la 5.00 mm');
  expect((await straturiSalvate(page, 3))[1]?.vizibil).toBe(false);
  // Modul „scade”, apoi arătat: dreapta pătratului la −5, stânga la 0.
  await s2.locator('[data-camp="strat-mod"]').selectOption('scade');
  await s2.locator('[data-buton="strat-ochi"]').click();
  await expect(z).toHaveText('de la -5.00 la 5.00 mm');
  // Anularea: un pas pe fiecare schimbare, cu hărțile la loc.
  await page.locator('body').press('Control+z');
  await expect(s2).toHaveAttribute('data-vizibil', 'false');
  await page.locator('body').press('Control+z');
  await expect(s2.locator('[data-camp="strat-mod"]')).toHaveValue('aduna');
  await s2.locator('[data-buton="strat-ochi"]').click();
  await expect(z).toHaveText('de la 0.00 la 10.00 mm');
  // Ordinea: stratul nou mutat sub cel dintâi (cu „adună”, același compus); numele, schimbat din câmp.
  await s2.locator('[data-buton="strat-jos"]').click();
  await expect(randuri.first()).toHaveAttribute('data-strat', 's1');
  await expect(s2.locator('[data-buton="strat-jos"]')).toBeDisabled();
  await s2.locator('[data-buton="strat-sus"]').click();
  await expect(randuri.first()).toHaveAttribute('data-strat', 's2');
  await s2.locator('[data-buton="strat-jos"]').click();
  await expect(randuri.first()).toHaveAttribute('data-strat', 's1');
  await page.locator('[data-camp="strat-nume-s2"]').fill('logo');
  await page.locator('[data-camp="strat-nume-s2"]').press('Enter');
  await expect.poll(async () => (await straturiSalvate(page, 1)).map((s) => [s.id, s.nume])).toEqual([['s2', 'logo'], ['s1', 'jumatati.png']]);
  await expect(z).toHaveText('de la 0.00 la 10.00 mm');
  // Ștergerea: ultimul strat rămas nu se poate șterge.
  await page.locator('[data-strat="s2"] [data-buton="strat-sterge"]').click();
  await expect(randuri).toHaveCount(1);
  await expect(page.locator('[data-strat="s1"] [data-buton="strat-sterge"]')).toBeDisabled();
  await expect(z).toHaveText('de la 0.00 la 5.00 mm');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('un strat ascuns: fișa finisării din fereastra exportului spune că nu intră în program; arătat, nota pleacă', async ({ page }) => {
  await page.goto('/');
  await importaRelief(page);
  await importaPatrat(page, 'strat');
  await page.locator('[data-strat="s2"] [data-buton="strat-ochi"]').click();
  await expect(page.locator('[data-strat="s2"]')).toHaveAttribute('data-vizibil', 'false');
  await rolFinisare(page);
  await page.locator('[data-actiune="export.gcode"]').click();
  const fin = page.locator('[data-fisa="op"][data-fel="finisare"]');
  await expect(fin.locator('[data-nota="relief-ascunse"]')).toHaveText(
    'Relieful are un strat ascuns: nu intră în program. Arată-l din panoul Proprietăți ca să se taie.');
  await page.keyboard.press('Escape');
  await expect(fin).toHaveCount(0);
  await page.locator('[data-strat="s2"] [data-buton="strat-ochi"]').click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(fin).toHaveCount(1);
  await expect(fin.locator('[data-nota="relief-ascunse"]')).toHaveCount(0);
});
