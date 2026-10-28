import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ecran, vedere, adauga } from './ajutor-panza.ts';

/**
 * Loc în pachetul de pornire (17.10): ce a plecat din pornire vine la cerere, cu fereastra care îl folosește, și merge la
 * fel. Calculul acțiunilor ferestrelor (`actiuniDocumentCalcul.ts`) îl aduce ORICARE dintre ele: aici fiecare fereastră e
 * singura care se poate încărca (bucățile celorlalte două sunt oprite), deci acțiunea ei merge doar dacă ea însăși își
 * importă calculul.
 */
test.use({ locale: 'ro-RO' });

const BUCATI = { export: /ExportConectat-[^/]*\.js$/, import: /ImportConectat-[^/]*\.js$/, panou: /PanouProprietati-[^/]*\.js$/ };

async function doarFereastra(page: Page, ramane: keyof typeof BUCATI): Promise<void> {
  for (const [nume, ruta] of Object.entries(BUCATI)) if (nume !== ramane) await page.route(ruta, (r) => r.abort());
}

test('(calculul vine cu exportul) doar dialogul exportului se poate încărca: Exportă scrie operațiile și descarcă programul', async ({ page }) => {
  await doarFereastra(page, 'export');
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  expect(text).toContain('G21');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('(calculul vine cu importul) doar dialogul importului se poate încărca: Importă adaugă piesa', async ({ page }) => {
  await doarFereastra(page, 'import');
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles('test/placi/placa-02/logo-80mm.svg');
  await expect(page.getByTestId('import-marime')).toHaveText('Desenul: 80.00 × 40.00 mm');
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta]')).toHaveCount(1);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('(calculul vine cu panoul) doar panoul de proprietăți se poate încărca: poziția scrisă mută forma', async ({ page }) => {
  await doarFereastra(page, 'panou');
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  const panou = page.locator('[data-panou="proprietati"]');
  if ((await panou.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  const x = page.locator('[data-camp="pozitie-x"]');
  await expect(x).toHaveValue('20');
  await x.fill('5');
  await x.press('Enter');
  await expect(x).toHaveValue('5');
  await expect(page.getByTestId('selectie')).toContainText('X 5.00');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

async function versiuni(page: Page): Promise<number[]> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok, eroare) => {
      const r = indexedDB.open('cncvs2-proiecte', 1);
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    const chei = await new Promise<IDBValidKey[]>((ok, eroare) => {
      const r = db.transaction('versiuni').objectStore('versiuni').getAllKeys();
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    db.close();
    return (chei as Array<[string, number]>).map(([, r]) => r);
  });
}

test('schemele documentului care nu vin (o publicare nouă): proiectul salvat e „necitit acum”, nu gol, iar exportul spune că fereastra nu vine', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await expect.poll(() => versiuni(page)).toContain(1);
  // Schemele stau în bucata lor (`schemaDocument`), adusă de ușa de încărcare și de calculul ferestrelor.
  await page.route(/schemaDocument-[^/]*\.js$/, (r) => r.abort());
  await page.reload();
  await expect(page.getByTestId('proiect')).toContainText('Proiectul salvat n-a putut fi citit acum');
  // Fereastra exportului își aduce calculul, deci și schemele: nu vine, și o spune.
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.getByRole('alert')).toHaveText('Fereastra nu s-a putut încărca (aplicația s-a actualizat între timp sau rețeaua lipsește). Proiectul e salvat: reîncarcă pagina.');
  await page.getByRole('button', { name: 'Închide' }).click();
  // Nimic nu s-a scris peste proiectul salvat: o reîncărcare bună îl aduce înapoi, cu dreptunghiul lui.
  expect(await versiuni(page)).toEqual([1]);
  await page.unroute(/schemaDocument-[^/]*\.js$/);
  await page.reload();
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta]')).toHaveCount(1);
  await expect(page.getByTestId('lista-vectori')).toContainText('dreptunghi 100.00 × 60.00');
});

test.describe('dicționarul limbii, la cerere', () => {
  test('engleza aleasă, al cărei dicționar nu vine: aplicația pornește în română, cu intrarea în jurnal; EN rămâne refuzat', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByTestId('jurnal')).toHaveText('0 errors in the local log');
    await page.route(/\/mesaje\/en\.json$/, (r) => r.abort());
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
    await expect(page.getByTestId('jurnal')).toHaveText('1 eroare în jurnalul local');
    // Butonul EN cere dicționarul din nou; nu vine, deci limba rămâne română (fără ecranul de eroare), cu încă o intrare.
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByTestId('jurnal')).toHaveText('2 erori în jurnalul local');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('CNC Vector Studio');
  });

  test('niciun dicționar nu vine: o pagină de eroare în ambele limbi, cu Reîncarcă, nu o pagină albă', async ({ page }) => {
    await page.route(/\/mesaje\/(ro|en)\.json$/, (r) => r.abort());
    await page.goto('/');
    const ecran = page.locator('[data-eroare="fara-texte"]');
    await expect(ecran).toBeVisible();
    await expect(ecran).toContainText('Textele interfeței nu s-au putut aduce');
    await expect(ecran).toContainText('The interface texts could not be loaded');
    await expect(page.locator('.aplicatie')).toHaveCount(0);
    // Fiecare jumătate a titlului și a butonului își spune limba (cititorul de ecran), iar focusul e pe Reîncarcă.
    await expect(ecran.locator('h1 [lang="en"]')).toHaveText('The app could not start');
    await expect(page.getByRole('button', { name: 'Reîncarcă · Reload' })).toBeFocused();
    await expect(page.getByRole('button').locator('[lang="ro"]')).toHaveText('Reîncarcă');
    await page.unroute(/\/mesaje\/(ro|en)\.json$/);
    await page.getByRole('button', { name: 'Reîncarcă · Reload' }).click();
    await expect(page.locator('[data-actiune="import.svg"]')).toBeVisible();
  });

  /** Răspunsurile dicționarelor, întârziate (ms) pe limbă; o limbă fără întârziere trece neatinsă. */
  async function dictionareIntarziate(page: Page, ms: { ro?: number; en?: number }): Promise<void> {
    await page.route(/\/mesaje\/(ro|en)\.json$/, async (r) => {
      const l = /\/mesaje\/(ro|en)\.json/.exec(r.request().url())?.[1] as 'ro' | 'en';
      await new Promise((ok) => setTimeout(ok, ms[l] ?? 0));
      await r.continue();
    });
  }

  test('ambele dicționare vin abia după termenul de 4 s: aplicația pornește (în română), nu pagina „fără texte”', async ({ page }) => {
    await dictionareIntarziate(page, { ro: 4500, en: 4500 });
    await page.goto('/');
    await expect(page.locator('[data-actiune="import.svg"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-eroare="fara-texte"]')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
    await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
  });

  test('româna vine după engleza de rezervă: pornește în engleză, apoi trece singură pe română (limba aleasă)', async ({ page }) => {
    await dictionareIntarziate(page, { ro: 6500, en: 300 });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: 10_000 });
    await expect(page.locator('[data-actiune="import.svg"]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro', { timeout: 10_000 });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('CNC Vector Studio');
  });

  test('clic pe EN (dicționarul pe drum), apoi pe RO: câștigă ultimul clic, și la sosirea englezei, și după reîncărcare', async ({ page }) => {
    let elibereaza: () => void = () => undefined;
    const liber = new Promise<void>((ok) => { elibereaza = ok; });
    await page.route(/\/mesaje\/en\.json$/, async (r) => { await liber; await r.continue(); });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await page.getByRole('button', { name: 'RO', exact: true }).click();
    const cerute = page.waitForResponse(/\/mesaje\/en\.json$/);
    elibereaza();
    await cerute;
    await page.waitForTimeout(500);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
    await expect(page.getByRole('button', { name: 'RO', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.unroute(/\/mesaje\/en\.json$/);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  });
});

test.describe('alegerea cu clicul, la cerere', () => {
  /** Bucata alegerii ținută pe drum până la `elibereaza()` (cererea pleacă la montarea aplicației). */
  async function alegereOprita(page: Page): Promise<() => void> {
    let elibereaza: () => void = () => undefined;
    const liber = new Promise<void>((ok) => { elibereaza = ok; });
    await page.route(/actiuniAlegere-[^/]*\.js$/, async (r) => { await liber; await r.continue(); });
    return () => { elibereaza(); };
  }

  test('bucata întârziată: clicul golește selecția pe loc și alege forma la sosirea bucății', async ({ page }) => {
    const elibereaza = await alegereOprita(page);
    await page.goto('/');
    await adauga(page, 'dreptunghi');
    await expect(page.getByTestId('selectie')).toContainText('dreptunghi 100.00 × 60.00');
    const la = await ecran(page, await vedere(page));
    const p = la(30, 30);
    await page.mouse.click(p.x, p.y);
    await expect(page.getByTestId('selectie')).toContainText('Nimic selectat');
    elibereaza();
    await expect(page.getByTestId('selectie')).toContainText('dreptunghi 100.00 × 60.00 la X 20.00, Y 20.00');
    await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
  });

  test('bucata întârziată: o tragere începută înainte mută forma cu toată deplasarea, din clipa în care apare selecția', async ({ page }) => {
    const elibereaza = await alegereOprita(page);
    await page.goto('/');
    await adauga(page, 'dreptunghi');
    const v = await vedere(page);
    const la = await ecran(page, v);
    const a = la(110, 70);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(a.x + 50, a.y, { steps: 5 });
    // Fără selecție, tragerea n-a pornit: forma stă pe loc.
    await expect(page.getByTestId('selectie')).toContainText('Nimic selectat');
    elibereaza();
    await expect(page.getByTestId('selectie')).toContainText('dreptunghi 100.00 × 60.00 la X 20.00, Y 20.00');
    await page.mouse.move(a.x + 100, a.y, { steps: 5 });
    await page.mouse.up();
    const x = (20 + 100 / v.scara).toFixed(2);
    await expect(page.getByTestId('selectie')).toContainText(`la X ${x}, Y 20.00`);
  });

  test('bucata care nu vine: clicul nu alege, cu intrarea în jurnal la fiecare clic; după reîncărcare alege', async ({ page }) => {
    let cereri = 0;
    await page.route(/actiuniAlegere-[^/]*\.js$/, (r) => { cereri++; return r.abort(); });
    await page.goto('/');
    await adauga(page, 'dreptunghi');
    const la = await ecran(page, await vedere(page));
    const p = la(30, 30);
    await page.mouse.click(p.x, p.y);
    await expect(page.getByTestId('selectie')).toContainText('Nimic selectat');
    await expect(page.getByTestId('jurnal')).toHaveText('1 eroare în jurnalul local');
    // Codul cere bucata din nou la fiecare clic (`alegereLaCerere` uită eșecul). Ce face browserul cu un `import()` eșuat
    // diferă (măsurat pe 24.10, ambele Edge 156): pe Windows ține eșecul în harta modulelor până la reîncărcare (o singură
    // cerere în rețea), pe Linux (CI) îl reîncearcă (montarea și cele două clicuri: 3 cereri). Clicul spune de fiecare dată
    // că n-a putut.
    await page.mouse.click(p.x, p.y);
    await expect(page.getByTestId('jurnal')).toHaveText('2 erori în jurnalul local');
    await expect(page.getByTestId('selectie')).toContainText('Nimic selectat');
    expect([1, 3]).toContain(cereri);
    await page.unroute(/actiuniAlegere-[^/]*\.js$/);
    if (cereri === 3) {
      // Unde browserul reîncearcă, rețeaua revenită ajunge fără reîncărcare: clicul următor alege.
      await page.mouse.click(p.x, p.y);
      await expect(page.getByTestId('selectie')).toContainText('dreptunghi 100.00 × 60.00 la X 20.00, Y 20.00');
    }
    await page.reload();
    const dupa = await ecran(page, await vedere(page));
    const q = dupa(30, 30);
    await page.mouse.click(q.x, q.y);
    await expect(page.getByTestId('selectie')).toContainText('dreptunghi 100.00 × 60.00 la X 20.00, Y 20.00');
    await expect(page.getByTestId('jurnal')).toHaveText('2 erori în jurnalul local');
  });
});
