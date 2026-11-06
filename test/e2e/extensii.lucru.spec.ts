import { test, expect, type Page } from '@playwright/test';
import { impacheteaza, scrieZip } from '../../scripts/impacheteaza-extensie.ts';
import { citesteZip } from '../../src/extensii/zip.ts';
import { eroriJurnal } from './ajutor-jurnal.ts';

/**
 * Pluginul ca parte din cvs2 (ADR 0164, felia 3.Xd), în Edge, cu extensia de probă `extensii/salut`:
 * - tema: pe rădăcina cadrului, lângă culori, `color-scheme` (tema aleasă în cvs2) și fonturile lui cvs2 (16 variabile),
 *   schimbate pe loc odată cu tema; fără permisiunea `cont`, extensia nu vede contul;
 * - contul, cu permisiunea `cont` (arătată la instalare): conectat, numele și planul; ieșirea din cont, venită din altă filă
 *   (evenimentul `storage`), ajunge pe loc, fără repornire;
 * - închiderea: × îi cere întâi extensiei salvarea ei (`laInchidere`) și, dacă n-a mai rămas nimic nesalvat, închide fără
 *   întrebare; ce rămâne nesalvat se întreabă: „Rămân” (și Escape) o lasă deschisă, „Închide fără ele” o închide; reîncărcarea
 *   paginii întreabă și ea (`beforeunload`), doar cât e ceva nesalvat; `host.inchide()`, cerută de extensie, nu întreabă.
 */
test.use({ locale: 'ro-RO' });

const SALUT = impacheteaza('extensii/salut').octeti;
const TOATE = ['desen', 'cam', 'export-gcode', 'export-vectori', 'masina'];

/** Același pachet, cu manifestul schimbat (permisiunile, id-ul, numele, versiunea). */
async function varianta(schimbari: Record<string, unknown>): Promise<Buffer> {
  const z = await citesteZip(SALUT, { fisiere: 16, octetiFisier: 1 << 20, octetiTotal: 1 << 22 });
  if (!z.ok) throw new Error('pachetul de probă nu se citește');
  return Buffer.from(scrieZip(z.intrari.map((i) => {
    if (i.nume !== 'extensie.json') return i;
    const m = { ...JSON.parse(new TextDecoder().decode(i.octeti)) as Record<string, unknown>, ...schimbari };
    return { nume: i.nume, octeti: new TextEncoder().encode(JSON.stringify(m)) };
  })));
}

const cadru = (page: Page) => page.frameLocator('iframe.cadru-extensie');

async function instaleaza(page: Page, pachet: Buffer, permisiuni: string): Promise<void> {
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: 'salut-1.0.0.zip', mimeType: 'application/zip', buffer: pachet });
  await expect(page.getByTestId('extensii-permisiuni')).toHaveText(permisiuni);
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect(page.getByTestId('extensii-instalare')).toHaveCount(0);
}

async function deschide(page: Page, id = 'salut'): Promise<void> {
  await page.locator('[data-extensii="buton"]').click();
  await page.getByTestId('meniu-extensii').locator(`[data-extensii="deschide"][data-id="${id}"]`).click();
  await expect(page.getByTestId('spatiu-extensie')).toHaveAttribute('data-stare', 'pornit');
}

/** O proprietate calculată pe rădăcina cadrului, și aceeași în pagina lui cvs2. */
const inCadru = (page: Page, p: string) => cadru(page).locator('html').evaluate((r, x) => getComputedStyle(r).getPropertyValue(x).trim(), p);
const inCvs2 = (page: Page, p: string) => page.evaluate((x) => getComputedStyle(document.documentElement).getPropertyValue(x).trim(), p);

/** Ce a scris extensia „salut” în stocarea ei (IndexedDB-ul lui cvs2, magazinul `date`), la o cheie. */
const stocat = (page: Page, cheie: string) => page.evaluate((k) => new Promise<unknown>((ok, nu) => {
  const r = indexedDB.open('cncvs2-extensii');
  r.onerror = () => { nu(r.error); };
  r.onsuccess = () => {
    const q = r.result.transaction('date').objectStore('date').get(['salut', k]);
    q.onsuccess = () => { ok(q.result); r.result.close(); };
    q.onerror = () => { nu(q.error); };
  };
}), cheie);

const STOCARE = 'Cere: să-și țină datele în browserul acesta (cel mult 16 MB).';

test('tema: color-scheme și fonturile lui cvs2 pe rădăcina cadrului, lângă culori, schimbate pe loc; contul, nevăzut fără permisiune', async ({ page }) => {
  await page.goto('/');
  await instaleaza(page, Buffer.from(SALUT), STOCARE);
  await deschide(page);
  const c = cadru(page);
  await expect(c.locator('[data-salut="tema"]')).toContainText('Variabilele temei primite: 16');
  await expect(c.locator('[data-salut="schema"]')).toHaveText('color-scheme: light');
  for (const p of ['--font', '--mono', '--s-panou', '--t']) expect(await inCadru(page, p), p).toBe(await inCvs2(page, p));
  expect(await inCadru(page, 'color-scheme')).toBe('light');
  await expect(c.locator('[data-salut="cont"]')).toHaveText('Contul: —');
  // auto → luminoasă → întunecată: cadrul trece pe întunecat odată cu cvs2, fără repornire
  await page.locator('[data-actiune="vedere.tema"]').click();
  await page.locator('[data-actiune="vedere.tema"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'intunecata');
  await expect(c.locator('[data-salut="schema"]')).toHaveText('color-scheme: dark');
  expect(await inCadru(page, 'color-scheme')).toBe('dark');
  expect(await inCadru(page, '--s-panou')).toBe(await inCvs2(page, '--s-panou'));
  await expect(c.locator('[data-salut="deschideri"]')).toHaveText('Deschideri: 1');
});

test('contul, cu permisiunea cont: conectat, numele și planul; ieșirea, venită din altă filă, ajunge pe loc', async ({ page }) => {
  await page.addInitScript((toate) => {
    const acum = Date.now();
    localStorage.setItem('cncvs2.cont', JSON.stringify({
      uid: 'u1', email: 'ana@exemplu.ro', nume: 'Ana',
      drept: { plan: 'personal', capabilitati: toate, pana: null, calculatLa: acum, zileOffline: 7 },
    }));
  }, TOATE);
  await page.goto('/');
  await instaleaza(page, await varianta({ permisiuni: ['stocare', 'cont'] }),
    'Cere: să-și țină datele în browserul acesta (cel mult 16 MB); să vadă dacă ești conectat, cu ce nume și ce plan (nu adresa, nu parola).');
  await deschide(page);
  const c = cadru(page);
  await expect(c.locator('[data-salut="cont"]')).toHaveText('Contul: Ana (personal)');
  await expect(c.locator('[data-salut="deschideri"]')).toHaveText('Deschideri: 1');
  // Ieșirea din cont, făcută în altă filă: cvs2 o află din evenimentul `storage`, iar extensia, pe loc.
  await page.evaluate(() => {
    localStorage.removeItem('cncvs2.cont');
    window.dispatchEvent(new StorageEvent('storage', { key: 'cncvs2.cont' }));
  });
  await expect(c.locator('[data-salut="cont"]')).toHaveText('Contul: neconectat');
  await expect(c.locator('[data-salut="deschideri"]')).toHaveText('Deschideri: 1');
  expect(await c.locator('body').evaluate(() => document.body.textContent ?? '')).not.toContain('ana@exemplu.ro');
});

test('închiderea: × îi lasă extensiei salvarea; ce rămâne nesalvat e întrebat (Rămân, Escape, Închide fără ele); reîncărcarea', async ({ page }) => {
  await page.goto('/');
  await instaleaza(page, Buffer.from(SALUT), STOCARE);
  await deschide(page);
  let c = cadru(page);
  const intrebare = page.getByTestId('extensii-inchidere');
  const x = page.locator('[data-extensii="inchide-fereastra"]');
  await c.locator('[data-salut="modifica"]').click();
  await expect(c.locator('[data-salut="lucru"]')).toHaveText('Lucrul: nesalvat');

  await x.click();
  await expect(intrebare).toBeVisible();
  await expect(intrebare).toContainText('Închizi „Salut”?');
  await expect(intrebare).toContainText('„Salut” are modificări pe care nu le-a putut salva. Dacă o închizi acum, se pierd.');
  await expect(page.locator('[data-extensii="inchidere-ramai"]')).toBeFocused();
  await expect(page.locator('.aplicatie')).toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  await expect(intrebare).toHaveCount(0);
  await expect(page.locator('iframe.cadru-extensie')).toHaveCount(1);
  await expect(page.locator('.aplicatie')).not.toHaveAttribute('inert', '');
  await x.click();
  await page.locator('[data-extensii="inchidere-ramai"]').click();
  await expect(intrebare).toHaveCount(0);
  await expect(x).toBeFocused();
  await expect(c.locator('[data-salut="lucru"]')).toHaveText('Lucrul: nesalvat');

  // Reîncărcarea, cu lucrul nesalvat: browserul întreabă (`beforeunload`); „rămân pe pagină” o lasă cum era.
  const dialoguri: string[] = [];
  page.on('dialog', (d) => { dialoguri.push(d.type()); void d.dismiss(); });
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => dialoguri).toEqual(['beforeunload']);
  expect(page.isClosed()).toBe(false);
  await expect(page.locator('iframe.cadru-extensie')).toHaveCount(1);

  await x.click();
  await page.locator('[data-extensii="inchidere-inchide"]').click();
  await expect(intrebare).toHaveCount(0);
  await expect(page.locator('iframe.cadru-extensie')).toHaveCount(0);
  await expect(page.getByTestId('spatiu-extensie')).toHaveCount(0);

  // Cu o salvare de făcut la închidere (`laInchidere`): × o așteaptă, iar extensia, salvată, se închide fără întrebare.
  await deschide(page);
  c = cadru(page);
  await c.locator('[data-salut="la-inchidere"]').click();
  await c.locator('[data-salut="modifica"]').click();
  await x.click();
  await expect(page.locator('iframe.cadru-extensie')).toHaveCount(0);
  await expect(intrebare).toHaveCount(0);
  expect(await stocat(page, 'lucru')).toMatchObject({ valoare: 1 });

  // Cerută chiar de extensie (`host.inchide()`), închiderea nu întreabă: extensia știe ce are.
  await deschide(page);
  c = cadru(page);
  await c.locator('[data-salut="modifica"]').click();
  await c.locator('[data-salut="inchide"]').click();
  await expect(page.locator('iframe.cadru-extensie')).toHaveCount(0);
  await expect(intrebare).toHaveCount(0);

  // Nimic nesalvat: pagina se închide fără să mai întrebe.
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => page.isClosed()).toBe(true);
  expect(dialoguri).toEqual(['beforeunload']);
});

test('altă extensie, sau o versiune nouă instalată, peste una nesalvată: întâi întrebarea; aceeași, din meniu, doar se arată', async ({ page }) => {
  await page.goto('/');
  await instaleaza(page, Buffer.from(SALUT), STOCARE);
  await instaleaza(page, await varianta({ id: 'salut2', nume: 'Salut 2' }), STOCARE);
  await deschide(page);
  const c = cadru(page);
  const intrebare = page.getByTestId('extensii-inchidere');
  await c.locator('[data-salut="modifica"]').click();

  // Aceeași extensie, aleasă din meniu de la Proiectare: fereastra ei se arată, fără repornire și fără întrebare.
  await page.locator('[data-actiune="vedere.paleta"]').click();
  await page.locator('[id="paleta-document.adauga-dreptunghi"]').click();
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'proiectare');
  await deschide(page);
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'extensie');
  await expect(intrebare).toHaveCount(0);
  await expect(c.locator('[data-salut="deschideri"]')).toHaveText('Deschideri: 1');
  await expect(c.locator('[data-salut="lucru"]')).toHaveText('Lucrul: nesalvat');

  // Altă extensie, cât cea de acum are lucru nesalvat: întâi întrebarea; „Rămân” o lasă pe cea de acum.
  await page.locator('[data-extensii="buton"]').click();
  await page.getByTestId('meniu-extensii').locator('[data-extensii="deschide"][data-id="salut2"]').click();
  await expect(intrebare).toContainText('Închizi „Salut”?');
  await page.locator('[data-extensii="inchidere-ramai"]').click();
  await expect(page.getByTestId('extensie-deschisa')).toHaveText('Salut');
  await expect(c.locator('[data-salut="lucru"]')).toHaveText('Lucrul: nesalvat');
  // „Închide oricum”: cealaltă se deschide în locul ei.
  await page.locator('[data-extensii="buton"]').click();
  await page.getByTestId('meniu-extensii').locator('[data-extensii="deschide"][data-id="salut2"]').click();
  await page.locator('[data-extensii="inchidere-inchide"]').click();
  await expect(page.getByTestId('extensie-deschisa')).toHaveText('Salut 2');
  await expect(page.getByTestId('spatiu-extensie')).toHaveAttribute('data-stare', 'pornit');

  // O versiune nouă a extensiei deschise, cu lucru nesalvat: după instalare, întrebarea; „Închide oricum” o închide.
  await c.locator('[data-salut="modifica"]').click();
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({
    name: 'salut2-1.0.1.zip', mimeType: 'application/zip', buffer: await varianta({ id: 'salut2', nume: 'Salut 2', versiune: '1.0.1' }),
  });
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect(intrebare).toContainText('Închizi „Salut 2”?');
  await page.locator('[data-extensii="inchidere-inchide"]').click();
  await expect(page.locator('iframe.cadru-extensie')).toHaveCount(0);
});

test('repornirea cerută de extensie (ADR 0165): cadrul se reface, cu contextul de acum; cel mult o dată la 2 s, cererile dese adunate; închiderea o oprește', async ({ page }) => {
  await page.goto('/');
  await instaleaza(page, Buffer.from(SALUT), STOCARE);
  await deschide(page);
  const deschideri = cadru(page).locator('[data-salut="deschideri"]');
  await expect(deschideri).toHaveText('Deschideri: 1');
  await cadru(page).locator('[data-salut="reporneste"]').click();
  await expect(deschideri).toHaveText('Deschideri: 2');
  await expect(page.getByTestId('spatiu-extensie')).toHaveAttribute('data-stare', 'pornit');
  // Două cereri imediat după: așteaptă până trec cele 2 s și se fac într-o singură repornire.
  await cadru(page).locator('[data-salut="reporneste"]').click();
  await cadru(page).locator('[data-salut="reporneste"]').click();
  await page.waitForTimeout(300);
  await expect(deschideri).toHaveText('Deschideri: 2');
  await expect(deschideri).toHaveText('Deschideri: 3');
  await page.waitForTimeout(2500);
  await expect(deschideri).toHaveText('Deschideri: 3');
  // Una amânată, apoi extensia închisă și deschisă din nou: repornirea amânată nu mai are loc, nici în cea redeschisă.
  await cadru(page).locator('[data-salut="reporneste"]').click();
  await expect(deschideri).toHaveText('Deschideri: 4');
  await cadru(page).locator('[data-salut="reporneste"]').click();
  await page.locator('[data-extensii="inchide-fereastra"]').click();
  await expect(page.getByTestId('spatiu-extensie')).toHaveCount(0);
  await deschide(page);
  await expect(deschideri).toHaveText('Deschideri: 5');
  await page.waitForTimeout(2500);
  await expect(deschideri).toHaveText('Deschideri: 5');
  expect(await eroriJurnal(page)).toEqual([]);
});

const FORME = 'Cere: să-și țină datele în browserul acesta (cel mult 16 MB); să primească formele pe care i le trimiți din desen și să-ți propună forme pentru desen (le adaugi tu, din Importă).';
/** Un dreptunghi de 40 × 20 mm cu o gaură rotundă, importat și ales: forma pe care o trimite omul. */
async function formaAleasa(page: Page): Promise<void> {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="20mm" viewBox="0 0 40 20">'
    + '<path d="M0 0 H40 V20 H0 Z M15 10 A5 5 0 1 0 25 10 A5 5 0 1 0 15 10 Z" fill-rule="evenodd"/></svg>';
  await page.locator('[data-camp="fisier-svg"]').setInputFiles({ name: 'placuta.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg, 'utf8') });
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByTestId('lista-vectori').locator('li').getByText('placuta').click();
  await expect(page.getByTestId('selectie')).toHaveText('Selectat: placuta');
}

test('formele (ADR 0166): „Trimite la <extensie>” doar cu o extensie care le primește; contururile ajung în mm, apoi fereastra ei', async ({ page }) => {
  await page.goto('/');
  await formaAleasa(page);
  // nicio extensie deschisă: butonul nu e în bara selecției
  await expect(page.locator('[data-context="extensii.trimite-selectia"]')).toHaveCount(0);
  await instaleaza(page, await varianta({ permisiuni: ['stocare', 'forme'] }), FORME);
  await deschide(page);
  await expect(cadru(page).locator('[data-salut="forme"]')).toHaveText('Formele primite: —');
  await page.locator('[data-actiune="vedere.proiectare"]').click();
  const trimite = page.locator('[data-context="extensii.trimite-selectia"]');
  await expect(trimite).toHaveAccessibleName('Trimite la Salut');
  await trimite.click();
  // fereastra extensiei, cu cele două contururi închise ale plăcuței: 40 × 20 mm
  await expect(page.getByTestId('spatiu-extensie')).toBeVisible();
  await expect(cadru(page).locator('[data-salut="forme"]')).toHaveText('Formele primite: 2 (2), 40 × 20 mm');
  expect(await eroriJurnal(page)).toEqual([]);
});

test('formele: o extensie propune un SVG; cvs2 trece la Proiectare și deschide Importă, „Propus de”; nimic fără „Importă”', async ({ page }) => {
  await page.goto('/');
  await instaleaza(page, await varianta({ permisiuni: ['stocare', 'forme'] }), FORME);
  await deschide(page);
  await cadru(page).locator('[data-salut="propune"]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  // fereastra de acum e Proiectarea: acolo e desenul în care ar intra forma
  await expect(page.locator('[data-actiune="vedere.proiectare"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#import-titlu')).toContainText('Importă: salut.svg');
  await expect(page.getByTestId('import-de')).toHaveText('Propus de Salut');
  await expect(page.getByTestId('import-marime')).toHaveText('Desenul: 30.00 × 20.00 mm');
  // Renunță: desenul rămâne gol; a doua propunere, apoi Importă: o piesă nouă
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('lista-vectori').locator('li')).toHaveCount(0);
  await page.locator('[data-actiune="vedere.proiectare"]').click();
  await page.locator('[data-extensii="fila"]').click();
  await cadru(page).locator('[data-salut="propune"]').click();
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('lista-vectori').locator('li')).toHaveCount(1);
  await page.locator('[data-extensii="fila"]').click();
  await expect(cadru(page).locator('[data-proba="forme"]').last()).toHaveText('forme: deschis');
  expect(await eroriJurnal(page)).toEqual([]);
});

test('formele, fără permisiune: niciun buton în bara selecției, iar propunerea e refuzată de cvs2', async ({ page }) => {
  await page.goto('/');
  await formaAleasa(page);
  await instaleaza(page, Buffer.from(SALUT), STOCARE);
  await deschide(page);
  await cadru(page).locator('[data-salut="propune"]').click();
  await expect(cadru(page).locator('[data-proba="forme"]')).toHaveText('forme: forme:permisiune');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('[data-actiune="vedere.proiectare"]').click();
  await expect(page.getByTestId('selectie')).toHaveText('Selectat: placuta');
  await expect(page.locator('[data-context="extensii.trimite-selectia"]')).toHaveCount(0);
  expect(await eroriJurnal(page)).toEqual([]);
});

test('formele: o propunere cât fereastra Importă e deja deschisă (un fișier ales de om) e refuzată, „ocupat”', async ({ page }) => {
  await page.goto('/');
  await instaleaza(page, await varianta({ permisiuni: ['stocare', 'forme'] }), FORME);
  await deschide(page);
  await page.locator('[data-actiune="vedere.proiectare"]').click();
  await page.locator('[data-camp="fisier-svg"]').setInputFiles({ name: 'al-meu.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>', 'utf8') });
  await expect(page.locator('#import-titlu')).toContainText('Importă: al-meu.svg');
  // extensia, ascunsă, propune între timp (din cod, ca o extensie care n-așteaptă omul)
  await cadru(page).locator('[data-salut="propune"]').evaluate((b) => { (b as HTMLButtonElement).click(); });
  await expect(cadru(page).locator('[data-proba="forme"]')).toHaveText('forme: forme:ocupat');
  await expect(page.locator('#import-titlu')).toContainText('Importă: al-meu.svg');
  await expect(page.getByTestId('import-de')).toHaveCount(0);
  expect(await eroriJurnal(page)).toEqual([]);
});
