import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

/**
 * Meniul global și fereastra Mașina pe tot ecranul (ADR 0132, felia 13.A↑), în Edge: ferestrele (Proiectarea la pornire,
 * Mașina sub meniu, peste desenul acoperit și inert, contul în ambele, fereastra ținută după reîncărcare), tastele desenului
 * oprite în Mașina, indicatorul lucrării (procentul, Pauză și Reia, de oriunde, titlul filei, confirmarea la închiderea
 * paginii), „Deschide în Mașina” din fereastra exportului, Escape și F1 în Mașina, ecranul îngust și cel lat.
 */
test.use({ locale: 'ro-RO' });

const fila = (page: Page, f: 'proiectare' | 'masina') => page.locator(`[data-actiune="vedere.${f}"]`);
const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');
/** Un program lent pe mașina simulată la 1×: 200 mm la 60 mm/min, deci lucrarea ține câteva minute. */
const LENT = Buffer.from('G21\nG90\nG54\nG1 X200 F60\n', 'ascii');
/** Ce ar face browserul la închiderea paginii: un `beforeunload` anulat înseamnă că întreabă întâi. */
const intreabaLaIesire = (page: Page): Promise<boolean> => page.evaluate(() => {
  const e = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(e);
  return e.defaultPrevented;
});
/** Elementul de deasupra din mijlocul unei cutii (ce primește clicul acolo). */
const deasupra = (page: Page, b: { x: number; y: number; width: number; height: number }, selector: string): Promise<boolean> =>
  page.evaluate(({ x, y, s }) => Boolean(document.elementFromPoint(x, y)?.closest(s)), { x: b.x + b.width / 2, y: b.y + b.height / 2, s: selector });

test('ferestrele: Proiectarea la pornire, Mașina sub meniu peste desenul inert, contul în ambele, fereastra ținută la reîncărcare', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(fila(page, 'proiectare')).toHaveAttribute('aria-current', 'page');
  await expect(fila(page, 'masina')).not.toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('bara-editare')).toBeVisible();
  // Mașina nu mai e un panou în docul din dreapta și nu se încarcă înainte de prima deschidere.
  await expect(page.locator('[data-panou="masina"]')).toHaveCount(0);
  await expect(page.locator('.fereastra-masina')).toHaveCount(0);
  await expect(page.getByTestId('indicator-lucrare')).toHaveCount(0);

  await fila(page, 'masina').click();
  await expect(fila(page, 'masina')).toHaveAttribute('aria-current', 'page');
  const fereastra = page.locator('.fereastra-masina');
  await expect(fereastra).toBeVisible();
  await expect(page.getByTestId('masina-conexiune')).toHaveText('Neconectat');
  // Pe tot ecranul, sub meniu: lățimea ferestrei, de la meniu în jos.
  const meniu = (await page.locator('.meniu-global').boundingBox())!;
  const f = (await fereastra.boundingBox())!;
  expect(Math.abs(f.y - (meniu.y + meniu.height))).toBeLessThanOrEqual(2);
  expect(f.x).toBeLessThanOrEqual(1);
  expect(f.width).toBeGreaterThanOrEqual(1279);
  // Bara de desen e acoperită (clicul din mijlocul ei ajunge la fereastră) și inertă; contul rămâne deasupra, în meniu.
  expect(await deasupra(page, (await page.getByTestId('bara-editare').boundingBox())!, '.fereastra-masina')).toBe(true);
  await expect(page.locator('.sus')).toHaveAttribute('inert', '');
  await expect(page.locator('.lucru')).toHaveAttribute('inert', '');
  const cont = page.locator('#loc-cont [data-editare="cont"]');
  expect(await deasupra(page, (await cont.boundingBox())!, '[data-editare="cont"]')).toBe(true);
  // Bara de jos: doar cipurile aplicației (jurnalul), nu și cele ale pânzei.
  await expect(page.getByTestId('jurnal')).toBeVisible();
  await expect(page.getByTestId('selectie')).toHaveCount(0);
  await expect(page.locator('[data-actiune="vedere.potriveste"]')).toHaveCount(0);

  // La reîncărcare, aplicația se deschide în fereastra în care a rămas.
  await page.reload();
  await expect(fila(page, 'masina')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('masina-conexiune')).toBeVisible();
  await fila(page, 'proiectare').click();
  await expect(fereastra).toBeHidden();
  await expect(page.locator('.sus')).not.toHaveAttribute('inert', '');
  await expect(page.locator('[data-actiune="vedere.potriveste"]')).toBeVisible();
  await page.reload();
  await expect(fila(page, 'proiectare')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('bara-editare')).toBeVisible();
});

test('în Mașina, tastele desenului nu ating desenul acoperit; Ctrl+K merge, iar o comandă a desenului din paletă întoarce la Proiectare', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await expect(randuri(page)).toHaveCount(1);
  const ales = await page.getByTestId('selectie').textContent();
  expect(ales).toMatch(/dreptunghi/);

  await fila(page, 'masina').click();
  await expect(page.getByTestId('masina-conexiune')).toBeVisible();
  // Focusul pe pagină, nu pe filă (un clic pe un loc fără focus din fereastră): așa ascultă tastele și modulul editării, nu
  // doar carcasa (otrava E02 scăpa cu focusul pe filă).
  await page.locator('.masina-stare h3').click();
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  // Delete, Ctrl+Z, o săgeată (mută selecția), R (unealta Dreptunghi), Shift+H (oglindirea): nimic nu atinge desenul.
  for (const tasta of ['Delete', 'Control+z', 'ArrowLeft', 'r', 'Shift+H']) await page.keyboard.press(tasta);
  await fila(page, 'proiectare').click();
  await expect(randuri(page)).toHaveCount(1);
  await expect(page.getByTestId('selectie')).toHaveText(ales ?? '');
  await expect(page.locator('[data-unealta="selectie"]')).toHaveAttribute('aria-pressed', 'true');

  // Paleta merge și din Mașina; „Duplică” întoarce întâi la Proiectare, unde omul vede ce face.
  await fila(page, 'masina').click();
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox', { name: 'Scrie ca să filtrezi comenzile' }).fill('duplică');
  await page.keyboard.press('Enter');
  await expect(fila(page, 'proiectare')).toHaveAttribute('aria-current', 'page');
  await expect(randuri(page)).toHaveCount(2);
});

test('indicatorul lucrării: rulează cu procentul și Pauză, pauza cu Reia, din orice fereastră; titlul filei; închiderea paginii întreabă', async ({ page }) => {
  await page.goto('/');
  await fila(page, 'masina').click();
  await page.locator('[data-masina="viteza"]').selectOption('1');
  await page.locator('[data-masina="simulata"]').click();
  const ind = page.getByTestId('indicator-lucrare');
  await expect(ind).toHaveAttribute('data-fel', 'conectata');
  await expect(ind).toContainText('Mașina conectată');
  await expect(page).toHaveTitle('CNC Vector Studio');
  await page.locator('[data-masina="fisier-ales"]').setInputFiles({ name: 'lent.nc', mimeType: 'text/plain', buffer: LENT });
  await expect(page.getByTestId('masina-faza')).toHaveAttribute('data-faza', 'pregatit');
  expect(await intreabaLaIesire(page)).toBe(false);

  await page.locator('[data-masina="start"]').click();
  await expect(ind).toHaveAttribute('data-fel', 'ruleaza');
  await expect(ind).toHaveAttribute('data-culoare', 'verde');
  await expect(ind.locator('[data-masina="indicator"]')).toHaveText(/^Rulează \d+ %$/);
  await expect(page).toHaveTitle(/^\d+ % · CNC Vector Studio$/);
  expect(await intreabaLaIesire(page)).toBe(true);

  // Din Proiectare: indicatorul rămâne, iar Pauză din el oprește mișcarea (Hold); Reia o continuă.
  await fila(page, 'proiectare').click();
  await expect(ind).toBeVisible();
  await ind.locator('[data-masina="indicator-pauza"]').click();
  await expect(ind).toHaveAttribute('data-fel', 'pauza');
  await expect(ind).toHaveAttribute('data-culoare', 'portocaliu');
  await expect(page.getByTestId('masina-stare')).toHaveText(/^Hold/);
  await expect(page).toHaveTitle(/^Pauză \d+ % · CNC Vector Studio$/);
  expect(await intreabaLaIesire(page)).toBe(true);
  await ind.locator('[data-masina="indicator-reia"]').click();
  await expect(ind).toHaveAttribute('data-fel', 'ruleaza');
  // Oprește nu stă în indicator.
  await expect(ind.locator('button')).toHaveCount(2);
  await expect(ind.locator('[data-masina="opreste"]')).toHaveCount(0);

  // Un clic pe indicator deschide Mașina; Oprește de acolo întrerupe lucrarea: roșu, iar pagina se închide fără întrebare.
  await ind.locator('[data-masina="indicator"]').click();
  await expect(fila(page, 'masina')).toHaveAttribute('aria-current', 'page');
  await page.locator('[data-masina="opreste"]').click();
  await expect(ind).toHaveAttribute('data-culoare', 'rosu');
  await expect(ind).toHaveAttribute('data-fel', /^(intrerupta|alarma)$/);
  expect(await intreabaLaIesire(page)).toBe(false);
});

test('„Deschide în Mașina”: după exportul G-code, Mașina se deschide cu programul încărcat (aceeași amprentă), nepornit', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  // Înaintea exportului, nimic de deschis.
  await expect(page.locator('[data-buton="in-masina"]')).toHaveCount(0);
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await descarcare;
  const sha = /[0-9a-f]{64}/.exec((await page.getByTestId('export-stare').textContent()) ?? '')?.[0];
  expect(sha).toBeTruthy();
  await page.locator('[data-buton="in-masina"]').click();
  await expect(page.locator('[aria-labelledby="export-titlu"]')).toHaveCount(0);
  await expect(fila(page, 'masina')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.masina-sha')).toHaveAttribute('data-sha', sha ?? '');
  await expect(page.getByTestId('masina-faza')).toHaveAttribute('data-faza', 'pregatit');
});

test('Escape în Mașina închide formularul WiFi și nu schimbă fereastra; F1 deschide capitolul mașinii', async ({ page }) => {
  await page.goto('/');
  await fila(page, 'masina').click();
  await page.locator('[data-masina="conecteaza-wifi"]').click();
  await expect(page.getByTestId('masina-wifi')).toBeVisible();
  await page.locator('[data-masina="wifi-adresa"]').click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('masina-wifi')).toHaveCount(0);
  await expect(page.locator('[data-masina="conecteaza-wifi"]')).toBeFocused();
  // Nimic deschis: Escape nu face nimic, fereastra rămâne.
  await page.keyboard.press('Escape');
  await expect(fila(page, 'masina')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('masina-conexiune')).toBeVisible();
  await page.keyboard.press('F1');
  await expect(page.getByTestId('manual')).toBeVisible();
  await expect(page.getByTestId('manual-capitol').locator('h3')).toHaveText('Mașina');
});

test('ecranul lat: trei coloane (mașina, lucrarea, consola); telefonul: meniul pe două rânduri, Mașina pe o coloană, în ordinea urgenței', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await fila(page, 'masina').click();
  await page.locator('[data-masina="simulata"]').click();
  await expect(page.locator('.masina-pozitionare')).toBeVisible();
  const cutie = async (s: string) => (await page.locator(s).boundingBox())!;
  const conexiune = await cutie('.masina-conexiune'), lucrare = await cutie('.masina-lucrare'), consola = await cutie('.masina-consola');
  expect(conexiune.x + conexiune.width).toBeLessThan(lucrare.x);
  expect(lucrare.x + lucrare.width).toBeLessThan(consola.x);
  expect(Math.abs(conexiune.y - lucrare.y)).toBeLessThan(2);
  expect(Math.abs(lucrare.y - consola.y)).toBeLessThan(2);

  await page.setViewportSize({ width: 390, height: 844 });
  // Meniul: marca și grupul aplicației sus, filele dedesubt; nimic nu iese din ecran.
  const marca = await cutie('.meniu-global > .marca'), aplicatia = await cutie('.meniu-global > [data-grup="vedere"]');
  const file = await cutie('.meniu-global .ferestre');
  expect(Math.abs(marca.y - aplicatia.y)).toBeLessThan(marca.height);
  expect(file.y).toBeGreaterThanOrEqual(marca.y + marca.height);
  expect(aplicatia.x + aplicatia.width).toBeLessThanOrEqual(390);
  // Cardurile, unul sub altul: conexiunea, starea, lucrarea, poziționarea, programul, consola; fără derulare în lățime.
  const ordine = ['.masina-conexiune', '.masina-stare', '.masina-lucrare', '.masina-pozitionare', '.masina-programul', '.masina-consola'];
  const cutii = await Promise.all(ordine.map(cutie));
  for (let k = 1; k < cutii.length; k++) expect(cutii[k]!.y, ordine[k]).toBeGreaterThan(cutii[k - 1]!.y + cutii[k - 1]!.height - 1);
  // Toate pe aceeași lățime, cât fereastra (fără margini de 2 × 8 px și bara de derulare, cel puțin 340 px).
  for (const c of cutii) {
    expect(c.x + c.width).toBeLessThanOrEqual(390);
    expect(c.width).toBeGreaterThanOrEqual(340);
  }
  // Pe telefon, indicatorul încape pe rândul filelor (punctul, procentul, Pauză ca iconiță), nu pe un al treilea rând, și cu
  // un font lat (13.A↑c): Verdana aici, DejaVu Sans pe Linux, unde `system-ui` e oricum lat și rândul se rupea în CI.
  await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
  // Pe rândul filelor, după ele (nu peste ele) și în ecran.
  const peRandulFilelor = async (latime = 390): Promise<void> => {
    const ind = await cutie('[data-testid="indicator-lucrare"]');
    const fileJos = await cutie('.meniu-global .ferestre');
    expect(Math.abs(ind.y + ind.height / 2 - (fileJos.y + fileJos.height / 2))).toBeLessThan(fileJos.height / 2);
    expect(ind.x).toBeGreaterThanOrEqual(fileJos.x + fileJos.width);
    expect(ind.x + ind.width).toBeLessThanOrEqual(latime);
  };
  // Conectată, fără lucrare: indicatorul spune „Mașina conectată”, starea lui cea mai lată.
  await expect(page.getByTestId('indicator-lucrare')).toHaveAttribute('data-procent', 'false');
  await peRandulFilelor();
  // La 360 px (telefoanele Android înguste) încape tot; la 320 px (lățimea minimă din WCAG 1.4.10), cuvântul stării se taie
  // cu „…”, iar indicatorul rămâne lângă file, nu peste ele.
  await page.setViewportSize({ width: 360, height: 780 });
  await peRandulFilelor(360);
  await page.setViewportSize({ width: 320, height: 700 });
  await peRandulFilelor(320);
  const cuvant = page.getByTestId('indicator-lucrare').locator('.indicator-cuvant');
  expect(await cuvant.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  // Fila deschisă (Mașina) cu numele; Proiectarea doar cu iconița, cu numele păstrat pentru cititorul de ecran.
  expect((await fila(page, 'masina').locator('.eticheta').boundingBox())!.width).toBeGreaterThan(20);
  expect((await fila(page, 'proiectare').locator('.eticheta').boundingBox())!.width).toBeLessThanOrEqual(1);
  await expect(fila(page, 'proiectare')).toHaveAccessibleName('Proiectare');
  await page.locator('[data-masina="fisier-ales"]').setInputFiles({ name: 'lent.nc', mimeType: 'text/plain', buffer: LENT });
  await page.locator('[data-masina="viteza"]').selectOption('1');
  await page.locator('[data-masina="start"]').click();
  await peRandulFilelor();
  await page.locator('[data-masina="opreste"]').click();
  expect(await page.locator('.fereastra-masina').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
});

/** Bucata ferestrei Mașina și mesajele ei (ADR 0086), cum le cere pagina. */
const BUCATA_MASINII = /\/assets\/PanouMasina-[^/]*\.js$/;
const MESAJELE_MASINII = /\/mesaje\/masina\.json$/;

test('Mașina e adusă în fundal după pornire (13.A↑b): se deschide plină, chiar dacă bucata ei a dispărut între timp de pe server', async ({ page }) => {
  const adusa = page.waitForResponse(BUCATA_MASINII);
  const mesaje = page.waitForResponse(MESAJELE_MASINII);
  await page.goto('/');
  // Fără niciun clic pe Mașina: bucata și mesajele ei vin singure, după pornire.
  await adusa;
  await mesaje;
  // Acum fișierele „dispar” de pe server, ca după o publicare nouă: primul clic nu mai are ce cere.
  await page.route(BUCATA_MASINII, (r) => r.abort());
  await page.route(MESAJELE_MASINII, (r) => r.abort());
  // Mesajul de încărcare nu apare nici o clipă: cu bucata adusă, fereastra se montează direct. (Prin Suspense, React ține
  // mesajul pe ecran ~300 ms chiar cu bucata gata, ca să nu clipească; verificarea pe canal l-a prins așa.)
  await page.evaluate(() => {
    const w = window as unknown as { __incarcaAparut?: boolean };
    w.__incarcaAparut = false;
    new MutationObserver(() => {
      if (document.querySelector('[data-testid="masina-incarca"]')) w.__incarcaAparut = true;
    }).observe(document.body, { childList: true, subtree: true });
  });
  await fila(page, 'masina').click();
  await expect(page.getByTestId('masina-conexiune')).toHaveText('Neconectat');
  await expect(page.getByTestId('masina-incarca')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __incarcaAparut?: boolean }).__incarcaAparut)).toBe(false);
});

test('cât bucata Mașinii e pe drum, fereastra spune că se încarcă; dacă nu vine, spune de ce și oferă Reîncarcă (13.A↑b)', async ({ page }) => {
  // Pe drum: răspunsul întârziat, iar clicul vine imediat după pornire, înaintea preîncărcării.
  await page.route(BUCATA_MASINII, async (r) => {
    await new Promise((gata) => { setTimeout(gata, 2500); });
    await r.continue();
  });
  await page.goto('/');
  await fila(page, 'masina').click();
  await expect(page.getByTestId('masina-incarca')).toHaveText('Se încarcă fereastra Mașina…');
  await expect(page.getByTestId('masina-conexiune')).toHaveText('Neconectat', { timeout: 10_000 });
  await expect(page.getByTestId('masina-incarca')).toHaveCount(0);

  // Nu vine deloc (o publicare nouă i-a schimbat numele, rețeaua a căzut): motivul și Reîncarcă, nu o fereastră goală.
  await page.unroute(BUCATA_MASINII);
  const alta = await page.context().newPage();
  await alta.route(BUCATA_MASINII, (r) => r.abort());
  await alta.goto('/');
  await fila(alta, 'masina').click();
  const neincarcata = alta.getByTestId('masina-neincarcata');
  await expect(neincarcata).toContainText('Fereastra nu s-a putut încărca');
  await expect(neincarcata.getByRole('button', { name: 'Reîncarcă' })).toBeVisible();
  await expect(alta.getByTestId('masina-conexiune')).toHaveCount(0);
});
