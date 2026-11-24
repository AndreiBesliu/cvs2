import { test, expect, type Locator, type Page, type Request } from '@playwright/test';
import { impacheteaza, scrieZip } from '../../scripts/impacheteaza-extensie.ts';
import { citesteZip } from '../../src/extensii/zip.ts';
import { biblioteca, bibliotecaDeProba, deschideBiblioteca, deschideMeniul, pagina, paginaDinCatalog, paginaInstalatei } from './ajutor-biblioteca.ts';

/**
 * Descoperirea extensiilor (ADR 0232 §C, felia 3.Xi-3), în Edge:
 * - „Ce e nou” cu data versiunii și, în confirmarea unei actualizări, rândurile dintre versiunea omului și cea nouă;
 * - punctul de pe butonul Extensii: din ce s-a aflat la ultima deschidere a meniului, fără nicio cerere la pornire, până la
 *   actualizare sau la scoatere;
 * - extensiile instalate în paleta de comenzi („Deschide <nume>”);
 * - un `.zip` de extensie lăsat pe planșă deschide confirmarea instalării; alt `.zip` rămâne la Import, cu o frază în plus;
 * - captura mărită peste fereastra bibliotecii.
 */
test.use({ locale: 'ro-RO' });

const SALUT = impacheteaza('extensii/salut').octeti;

/** Pachetul „Salut”, cu manifestul schimbat. */
async function salut(schimbari: Record<string, unknown>): Promise<Buffer> {
  const z = await citesteZip(SALUT, { fisiere: 16, octetiFisier: 1 << 20, octetiTotal: 1 << 22 });
  if (!z.ok) throw new Error('pachetul de probă nu se citește');
  return Buffer.from(scrieZip(z.intrari.map((i) => {
    if (i.nume !== 'extensie.json') return i;
    const m = { ...JSON.parse(new TextDecoder().decode(i.octeti)) as Record<string, unknown>, ...schimbari };
    return { nume: i.nume, octeti: new TextEncoder().encode(JSON.stringify(m)) };
  })));
}

const confirmare = (page: Page): Locator => page.getByTestId('extensii-instalare');
const spatiu = (page: Page): Locator => page.getByTestId('spatiu-extensie');
const buton = (page: Page): Locator => page.locator('[data-extensii="buton"]');
const punct = (page: Page): Locator => page.getByTestId('extensii-punct');
const veste = (page: Page): Promise<string | null> => page.evaluate(() => localStorage.getItem('cncvs2.extensii-noi'));

async function instaleaza(page: Page, nume: string, octeti: Buffer): Promise<void> {
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: nume, mimeType: 'application/zip', buffer: octeti });
  await expect(confirmare(page)).toBeVisible();
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect(confirmare(page)).toHaveCount(0);
}
async function inchideMeniul(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('meniu-extensii')).toHaveCount(0);
}

/** Lasă un fișier pe pânză, la mijlocul ei: `dragover`, apoi `drop`, cu un DataTransfer real. */
async function lasaPePanza(page: Page, nume: string, octeti: Uint8Array, tip = 'application/zip'): Promise<void> {
  const panza = page.getByTestId('panza');
  await expect(panza).toHaveAttribute('data-scara', /\d/);
  const r = await panza.boundingBox();
  if (!r) throw new Error('pânza nu are cutie');
  const clientX = r.x + r.width / 2, clientY = r.y + r.height / 2;
  const dt = await page.evaluateHandle(({ nume: n, b64, tip: tp }) => {
    const d = new DataTransfer();
    d.items.add(new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], n, { type: tp }));
    return d;
  }, { nume, b64: Buffer.from(octeti).toString('base64'), tip });
  await panza.dispatchEvent('dragover', { dataTransfer: dt, clientX, clientY });
  await expect(page.getByTestId('lasa-aici')).toBeVisible();
  await panza.dispatchEvent('drop', { dataTransfer: dt, clientX, clientY });
}

test('„Ce e nou” arată data versiunii, unde e scrisă, în limba aplicației', async ({ page }) => {
  await page.goto('/');
  const p = await paginaDinCatalog(page, 'trenulet');
  const rand = p.getByTestId('pagina-noutati').locator('li').filter({ has: page.locator('strong', { hasText: /^18\.21\.0$/ }) });
  await expect(rand.locator('time')).toHaveAttribute('datetime', '2026-11-23');
  await expect(rand.locator('time')).toHaveText('23.11.2026');
  await page.keyboard.press('Escape');
  await expect(biblioteca(page)).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Limba' }).getByRole('button', { name: 'EN', exact: true }).click();
  const en = await paginaDinCatalog(page, 'trenulet');
  await expect(en.getByTestId('pagina-noutati').locator('li').filter({ has: page.locator('strong', { hasText: /^18\.21\.0$/ }) }).locator('time')).toHaveText('23/11/2026');
});

test('confirmarea unei actualizări arată „Ce e nou” doar de după versiunea omului; un rând fără dată arată doar versiunea', async ({ page }) => {
  await bibliotecaDeProba(page, {
    id: 'salut', nume: 'Salut', versiune: '1.0.2', permisiuni: ['stocare', 'descarcari'], octeti: await salut({ versiune: '1.0.2', permisiuni: ['stocare', 'descarcari'] }),
    noutati: [
      { versiune: '1.0.2', ro: 'Salvează fișiere.', en: 'It saves files.', data: '2026-11-24' },
      { versiune: '1.0.1', ro: 'Mai repede.', en: 'Faster.' },
      { versiune: '1.0.0', ro: 'Prima versiune.', en: 'The first version.', data: '2026-11-01' },
    ],
  });
  await page.goto('/');
  await instaleaza(page, 'salut-1.0.0.zip', await salut({ versiune: '1.0.0', permisiuni: ['stocare'] }));
  const m = await deschideMeniul(page);
  await m.locator('[data-extensii="biblioteca-actualizeaza"]').click();
  await expect(confirmare(page)).toBeVisible();
  const randuri = confirmare(page).getByTestId('confirmare-noutati').locator('li');
  await expect(randuri).toHaveCount(2);
  await expect(randuri.nth(0)).toHaveText(/^1\.0\.2\s*·\s*24\.11\.2026\s*Salvează fișiere\.$/);
  await expect(randuri.nth(1)).toHaveText(/^1\.0\.1\s*Mai repede\.$/);
  await expect(randuri.nth(1).locator('time')).toHaveCount(0);
  await expect(confirmare(page)).not.toContainText('Prima versiune.');
});

test('punctul de pe butonul Extensii: din ce s-a aflat la ultima deschidere a meniului, fără cerere la pornire; pleacă după actualizare', async ({ page }) => {
  await bibliotecaDeProba(page, { id: 'salut', nume: 'Salut', versiune: '1.0.1', permisiuni: ['stocare'], octeti: await salut({ versiune: '1.0.1' }) });
  let cataloage: string[] = [];
  page.on('request', (r: Request) => { if (r.url().endsWith('/extensii/catalog.json')) cataloage.push(r.url()); });
  await page.goto('/');
  await instaleaza(page, 'salut-1.0.0.zip', Buffer.from(SALUT));
  // Până nu s-a deschis meniul, aplicația nu știe nimic: niciun punct, nicio cerere.
  await expect(buton(page)).toBeVisible();
  await expect(punct(page)).toHaveCount(0);
  expect(cataloage).toEqual([]);

  const m = await deschideMeniul(page);
  await expect(m.locator('[data-extensii="deschide"][data-id="salut"] small')).toHaveText('1.0.0 → 1.0.1');
  await inchideMeniul(page);
  await expect(punct(page)).toBeVisible();
  await expect(buton(page)).toHaveAccessibleName('Extensii (o versiune nouă)');
  expect(JSON.parse(await veste(page) ?? 'null')).toEqual({ v: 1, noi: { salut: '1.0.1' } });

  // După reîncărcare, punctul e tot acolo, din ce se știa: catalogul nu se cere la pornire.
  cataloage = [];
  await page.reload();
  await expect(punct(page)).toBeVisible();
  await expect(buton(page)).toHaveAccessibleName('Extensii (o versiune nouă)');
  await page.waitForTimeout(1500);
  expect(cataloage, 'nicio cerere a catalogului la pornire').toEqual([]);

  // Actualizarea din meniu: vestea s-a consumat.
  const m2 = await deschideMeniul(page);
  await m2.locator('[data-extensii="biblioteca-actualizeaza"]').click();
  await expect(m2.locator('[data-extensii="deschide"][data-id="salut"] small')).toHaveText('1.0.1 · actualizată');
  await inchideMeniul(page);
  await expect(punct(page)).toHaveCount(0);
  await expect(buton(page)).toHaveAccessibleName('Extensii');
  expect(await veste(page)).toBeNull();
});

test('punctul pleacă și când extensia cu versiunea nouă e scoasă', async ({ page }) => {
  await bibliotecaDeProba(page, { id: 'salut', nume: 'Salut', versiune: '1.0.1', permisiuni: ['stocare'], octeti: await salut({ versiune: '1.0.1' }) });
  await page.goto('/');
  await instaleaza(page, 'salut-1.0.0.zip', Buffer.from(SALUT));
  await deschideMeniul(page);
  await inchideMeniul(page);
  await expect(punct(page)).toBeVisible();
  // „Scoate” stă lângă „Actualizează la …”: nimeni nu trebuie să actualizeze ca să poată scoate.
  const p = await paginaInstalatei(page, 'salut');
  await expect(p.locator('.pagina-actiuni button')).toHaveText(['Actualizează la 1.0.1', 'Deschide', 'Scoate']);
  await p.locator('[data-extensii="pagina-scoate"]').click();
  await page.locator('[data-extensii="scoate-confirma"]').click();
  await expect(page.getByTestId('extensii-scoatere')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(biblioteca(page)).toHaveCount(0);
  await expect(punct(page)).toHaveCount(0);
  expect(await veste(page)).toBeNull();
});

test('paleta de comenzi: „Deschide <nume>” pentru fiecare extensie instalată, în grupul Extensii; alegerea o deschide', async ({ page }) => {
  await page.goto('/');
  await expect(buton(page)).toBeVisible();
  // Fără nicio extensie, paleta n-are ce deschide.
  await page.keyboard.press('Control+k');
  const paleta = page.getByRole('dialog', { name: 'Paleta de comenzi' });
  await paleta.getByRole('combobox').fill('deschide');
  await expect(page.locator('[id^="paleta-extensii.deschide:"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(paleta).toHaveCount(0);

  await instaleaza(page, 'salut-1.0.0.zip', Buffer.from(SALUT));
  await instaleaza(page, 'salut2-1.0.0.zip', await salut({ id: 'salut2', nume: 'Banc de probă' }));
  await page.locator('[data-actiune="vedere.masina"]').click();
  await page.keyboard.press('Control+k');
  await paleta.getByRole('combobox').fill('banc');
  const optiune = page.locator('[id="paleta-extensii.deschide:salut2"]');
  await expect(optiune).toHaveText('Deschide Banc de probă');
  await expect(optiune).toHaveAttribute('aria-disabled', 'false');
  await expect(page.locator('[id="paleta-extensii.deschide:salut"]')).toHaveCount(0);
  await expect(page.locator('[id="paleta-paleta.grup.extensii"]')).toHaveText('Extensii');
  await page.keyboard.press('Enter');
  await expect(paleta).toHaveCount(0);
  await expect(spatiu(page)).toHaveAttribute('data-stare', 'pornit');
  await expect(page.locator('[data-extensii="fila"]')).toContainText('Banc de probă');
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'extensie');

  // Căutarea după „extensii” le arată pe amândouă, alături de bibliotecă.
  await page.keyboard.press('Control+k');
  await paleta.getByRole('combobox').fill('extensii');
  await expect(page.locator('[id^="paleta-extensii.deschide:"]')).toHaveText(['Deschide Banc de probă', 'Deschide Salut']);
  await expect(page.locator('[id="paleta-extensii.biblioteca"]')).toBeVisible();
});

test('un .zip de extensie lăsat pe planșă deschide confirmarea instalării, cu avertismentul „din afara bibliotecii”', async ({ page }) => {
  await page.goto('/');
  await expect(buton(page)).toBeVisible();
  await lasaPePanza(page, 'salut-1.0.0.zip', SALUT);
  await expect(confirmare(page)).toBeVisible();
  await expect(confirmare(page).locator('h2')).toHaveText('Instalezi „Salut”?');
  await expect(confirmare(page)).toContainText('Vine din afara bibliotecii cvs2: instaleaz-o doar dacă știi de unde e.');
  // Planșa nu mai așteaptă fișierul, iar Importul nu s-a deschis.
  await expect(page.getByTestId('lasa-aici')).toHaveCount(0);
  await expect(page.getByTestId('import-refuz')).toHaveCount(0);
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect(confirmare(page)).toHaveCount(0);
  const m = await deschideMeniul(page);
  await expect(m.locator('[data-extensii="deschide"][data-id="salut"]')).toBeVisible();
});

test('un .zip care nu e o extensie rămâne la Import, al cărui refuz spune și de unde se instalează o extensie', async ({ page }) => {
  await page.goto('/');
  await expect(buton(page)).toBeVisible();
  const altul = scrieZip([{ nume: 'desene/a.svg', octeti: new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>') }]);
  await lasaPePanza(page, 'desene.zip', altul);
  await expect(page.getByTestId('import-refuz')).toHaveText('Arhivele .zip nu se importă: dezarhivează desenele și importă-le pe rând. O extensie se instalează din meniul Extensii.');
  await expect(confirmare(page)).toHaveCount(0);
  await expect(page.getByTestId('lasa-aici')).toHaveCount(0);
  await page.getByRole('button', { name: 'Renunță' }).click();
  await expect(page.getByTestId('import-refuz')).toHaveCount(0);

  // Manifestul într-un dosar al arhivei (omul a împachetat dosarul): nu e o extensie, tot Importul o spune.
  const inDosar = scrieZip([{ nume: 'salut/extensie.json', octeti: new TextEncoder().encode('{}') }]);
  await lasaPePanza(page, 'salut-dosar.zip', inDosar);
  await expect(page.getByTestId('import-refuz')).toContainText('O extensie se instalează din meniul Extensii.');
  await expect(confirmare(page)).toHaveCount(0);
});

test('captura mărită: clic o deschide peste fereastră, cu ← și →, „2 / 3”, legenda și Escape; focusul se întoarce pe captură', async ({ page }) => {
  await page.goto('/');
  const p = await paginaDinCatalog(page, 'trenulet');
  const capturi = p.locator('[data-extensii="captura"]');
  await expect(capturi).toHaveCount(3);
  const alt = await capturi.nth(0).locator('img').getAttribute('alt');
  const alt2 = await capturi.nth(1).locator('img').getAttribute('alt');
  expect(alt).toBeTruthy();
  await capturi.nth(0).click();
  const mare = page.getByTestId('captura-marita');
  await expect(mare).toBeVisible();
  await expect(mare.getByTestId('captura-loc')).toHaveText('1 / 3');
  await expect(mare.getByTestId('captura-legenda')).toHaveText(alt ?? '');
  expect(await mare.locator('img').getAttribute('src')).toBe(await capturi.nth(0).locator('img').getAttribute('src'));
  // Imaginea mare e mai lată decât cea din pagină și încape în ecran.
  const mica = await capturi.nth(0).boundingBox(), cutie = await mare.locator('img').boundingBox();
  expect(cutie!.width).toBeGreaterThan(mica!.width * 1.5);
  expect(cutie!.x).toBeGreaterThanOrEqual(0);
  expect(cutie!.x + cutie!.width).toBeLessThanOrEqual(1280);

  await page.keyboard.press('ArrowRight');
  await expect(mare.getByTestId('captura-loc')).toHaveText('2 / 3');
  await expect(mare.getByTestId('captura-legenda')).toHaveText(alt2 ?? '');
  await mare.locator('[data-extensii="captura-inainte"]').click();
  await expect(mare.getByTestId('captura-loc')).toHaveText('3 / 3');
  await page.keyboard.press('ArrowRight');
  await expect(mare.getByTestId('captura-loc')).toHaveText('1 / 3');
  await page.keyboard.press('ArrowLeft');
  await expect(mare.getByTestId('captura-loc')).toHaveText('3 / 3');
  await mare.locator('[data-extensii="captura-inapoi"]').click();
  await expect(mare.getByTestId('captura-loc')).toHaveText('2 / 3');

  // Escape închide doar captura: biblioteca rămâne, cu focusul pe captura de la care s-a ajuns aici.
  await page.keyboard.press('Escape');
  await expect(mare).toHaveCount(0);
  await expect(biblioteca(page)).toBeVisible();
  await expect(capturi.nth(1)).toBeFocused();
  // Enter pe captura cu focus o deschide; × o închide.
  await page.keyboard.press('Enter');
  await expect(mare.getByTestId('captura-loc')).toHaveText('2 / 3');
  await mare.locator('[data-extensii="captura-inchide"]').click();
  await expect(mare).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(biblioteca(page)).toHaveCount(0);
});

test.describe('pe telefon', () => {
  test.use({ viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true });

  test('capturile rămân cum sunt: se derulează în pagină, fără mărire', async ({ page }) => {
    await page.goto('/');
    const b = await deschideBiblioteca(page);
    await b.locator('[data-extensii="rand-biblioteca"][data-id="trenulet"]').click();
    await expect(pagina(page).getByTestId('pagina-capturi').locator('img')).toHaveCount(3);
    await expect(pagina(page).locator('[data-extensii="captura"]')).toHaveCount(0);
  });
});

test.describe('în engleză', () => {
  test.use({ locale: 'en-GB' });

  test('punctul, paleta și refuzul arhivei, în engleză', async ({ page }) => {
    await bibliotecaDeProba(page, { id: 'salut', nume: 'Salut', versiune: '1.0.1', permisiuni: ['stocare'], octeti: await salut({ versiune: '1.0.1' }) });
    await page.goto('/');
    await instaleaza(page, 'salut-1.0.0.zip', Buffer.from(SALUT));
    await deschideMeniul(page);
    await inchideMeniul(page);
    await expect(buton(page)).toHaveAccessibleName('Extensions (a new version)');
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox').fill('salut');
    await expect(page.locator('[id="paleta-extensii.deschide:salut"]')).toHaveText('Open Salut');
    await page.keyboard.press('Escape');
    await lasaPePanza(page, 'drawings.zip', scrieZip([{ nume: 'a.svg', octeti: new TextEncoder().encode('<svg/>') }]));
    await expect(page.getByTestId('import-refuz')).toHaveText('.zip archives can’t be imported: unpack the drawings and import them one by one. An extension is installed from the Extensions menu.');
  });
});
