import { test, expect, type Page } from '@playwright/test';
import { impacheteaza, scrieZip } from '../../scripts/impacheteaza-extensie.ts';
import { citesteZip } from '../../src/extensii/zip.ts';
import { adauga } from './ajutor-panza.ts';

/**
 * Extensiile (ADR 0127, felia 3.Xa), în Edge, cu extensia de probă `extensii/salut`, împachetată aici:
 * - instalarea din fișier, cu confirmarea; meniul de lângă marcă; spațiul în locul pânzei, cu acțiunile documentului
 *   oprite; ce primește extensia (limba, tema, fișierul pachetului, stilurile ca foi construite);
 * - izolarea, încercată din cadru (pagina lui cvs2, stocarea, rețeaua, portul) și din afara lui; serviciul cerut, refuzat;
 *   eroarea extensiei în jurnalul local; închiderea cu × și din extensie; păstrarea după reîncărcare; scoaterea;
 * - instalarea de la o adresă (o gazdă servită de Playwright), descărcarea căzută spusă omului, un pachet stricat refuzat cu
 *   motivul lui, linkul de instalare (`#instaleaza=`) cu versiunea nouă, care o înlocuiește pe cea veche.
 */
test.use({ locale: 'ro-RO' });

const SALUT = impacheteaza('extensii/salut').octeti;

/** Același pachet, cu manifestul schimbat (versiunea, o amprentă stricată). */
async function varianta(schimba: (m: Record<string, unknown>) => void): Promise<Buffer> {
  const z = await citesteZip(SALUT, { fisiere: 16, octetiFisier: 1 << 20, octetiTotal: 1 << 22 });
  if (!z.ok) throw new Error('pachetul de probă nu se citește');
  return Buffer.from(scrieZip(z.intrari.map((i) => {
    if (i.nume !== 'extensie.json') return i;
    const m = JSON.parse(new TextDecoder().decode(i.octeti)) as Record<string, unknown>;
    schimba(m);
    return { nume: i.nume, octeti: new TextEncoder().encode(JSON.stringify(m)) };
  })));
}

const meniul = async (page: Page) => {
  await page.locator('[data-extensii="buton"]').click();
  const m = page.getByTestId('meniu-extensii');
  await expect(m).toBeVisible();
  return m;
};
const cadru = (page: Page) => page.frameLocator('iframe.cadru-extensie');
const forme = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');

test('din fișier: confirmarea, meniul, spațiul izolat cu acțiunile documentului oprite, ×, reîncărcarea, scoaterea', async ({ page }) => {
  await page.goto('/');
  await expect((await meniul(page)).locator('.meniu-extensii-cap')).toContainText('Nicio extensie instalată încă');
  await page.getByTestId('meniu-extensii').locator('[data-extensii="din-fisier"]').focus();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('meniu-extensii')).toHaveCount(0);

  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: 'salut-1.0.0.zip', mimeType: 'application/zip', buffer: Buffer.from(SALUT) });
  const dialog = page.getByTestId('extensii-instalare');
  await expect(page.getByTestId('extensii-despre')).toHaveText('„Salut” 1.0.0, de la salut-1.0.0.zip');
  await expect(dialog).toContainText('3 fișiere');
  await expect(page.locator('.aplicatie')).toHaveAttribute('inert', '');
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect(dialog).toHaveCount(0);

  await adauga(page, 'dreptunghi');
  await expect(forme(page)).toHaveCount(1);
  await (await meniul(page)).locator('[data-extensii="deschide"][data-id="salut"]').click();
  await expect(page.getByTestId('spatiu-extensie')).toHaveAttribute('data-stare', 'pornit');
  await expect(page.getByTestId('extensie-deschisa')).toContainText('Salut');
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-extensie', 'salut');
  await expect(page.locator('.lucru')).toHaveCSS('visibility', 'hidden');

  const c = cadru(page);
  await expect(c.locator('[data-salut="titlu"]')).toHaveText('Salut din extensie');
  await expect(c.locator('[data-salut="limba"]')).toHaveText('Limba: română');
  await expect(c.locator('[data-salut="fisier"]')).toHaveText('Fișierul pachetului: Un fișier al pachetului, citit prin host.fisier().');
  await expect(c.locator('[data-salut="tema"]')).toContainText('Variabilele temei primite: 9');
  // Stilurile pachetului (salut.css), puse ca foi construite: CSP-ul moștenit nu le oprește.
  await expect(c.locator('body')).toHaveCSS('padding-top', '24px');

  // Izolarea, din cadru: nimic din cvs2 și nicio rețea.
  await c.locator('[data-salut="izolare"]').click();
  await expect(c.locator('[data-proba]')).toHaveText(['pagina: refuzat', 'localStorage: refuzat', 'indexedDB: refuzat', 'retea: refuzat', 'serial: refuzat']);
  await c.locator('[data-salut="serviciu"]').click();
  await expect(c.locator('[data-proba="serviciu"]')).toHaveText('masina: serviciu-necunoscut:masina');
  const sandbox = await page.locator('iframe.cadru-extensie').getAttribute('sandbox');
  expect(sandbox).toBe('allow-scripts');

  // Cât e deschis spațiul, acțiunile documentului nu rulează (dreptunghiul din paletă nu se adaugă, exportul nu se deschide);
  // vederea rămâne: tema nouă ajunge și în cadru.
  await adauga(page, 'dreptunghi');
  await expect(forme(page)).toHaveCount(1);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-buton="exporta"]')).toHaveCount(0);
  const temaInainte = await c.locator('[data-salut="tema"]').textContent();
  await page.locator('[data-actiune="vedere.tema"]').click();
  await page.locator('[data-actiune="vedere.tema"]').click();
  await expect(c.locator('[data-salut="tema"]')).not.toHaveText(temaInainte ?? '');

  // Eroarea extensiei ajunge în jurnalul local, cu id-ul ei.
  await c.locator('[data-salut="eroare"]').click();
  await expect(page.getByTestId('jurnal')).toHaveText('1 eroare în jurnalul local');

  await page.locator('[data-extensii="inchide-spatiul"]').click();
  await expect(page.getByTestId('spatiu-extensie')).toHaveCount(0);
  await expect(page.locator('iframe.cadru-extensie')).toHaveCount(0);
  await expect(page.locator('.aplicatie')).not.toHaveAttribute('data-extensie');
  await expect(page.locator('.lucru')).toHaveCSS('visibility', 'visible');
  await adauga(page, 'dreptunghi');
  await expect(forme(page)).toHaveCount(2);

  // Din extensie: host.inchide().
  await (await meniul(page)).locator('[data-extensii="deschide"][data-id="salut"]').click();
  await cadru(page).locator('[data-salut="inchide"]').click();
  await expect(page.getByTestId('spatiu-extensie')).toHaveCount(0);

  // După reîncărcare, extensia e tot acolo; din gestionare se scoate.
  await page.reload();
  await expect((await meniul(page)).locator('[data-extensii="deschide"]')).toHaveText(['Salut1.0.0 · deschide spațiul']);
  await page.getByTestId('meniu-extensii').locator('[data-extensii="gestioneaza"]').click();
  const gest = page.getByTestId('extensii-gestionare');
  await expect(gest.locator('li')).toHaveCount(1);
  await expect(gest.locator('li')).toContainText('de la salut-1.0.0.zip');
  await gest.locator('[data-extensii="scoate"]').click();
  await expect(gest).toContainText('Nicio extensie instalată încă');
  await gest.locator('[data-extensii="inchide"]').click();
  await expect((await meniul(page)).locator('[data-extensii="deschide"]')).toHaveCount(0);
});

test('de la adresă și prin link: descărcarea căzută spusă, pachet stricat refuzat cu motivul, versiunea nouă o înlocuiește pe cea veche', async ({ page }) => {
  const v11 = await varianta((m) => { m.versiune = '1.1.0'; });
  const stricat = await varianta((m) => { (m.fisiere as Record<string, string>)['salut.txt'] = '0'.repeat(64); });
  const cors = { 'access-control-allow-origin': '*', 'content-type': 'application/zip' };
  await page.route('https://extensii.test/**', (r) => {
    const cale = new URL(r.request().url()).pathname;
    if (cale === '/salut.zip') return r.fulfill({ headers: cors, body: Buffer.from(SALUT) });
    if (cale === '/salut-1.1.0.zip') return r.fulfill({ headers: cors, body: v11 });
    if (cale === '/stricat.zip') return r.fulfill({ headers: cors, body: stricat });
    // Playwright ocolește CORS-ul la `fulfill`; o gazdă fără CORS dă în browser aceeași respingere a lui `fetch` ca o cădere.
    if (cale === '/cazuta.zip') return r.abort('failed');
    return r.fulfill({ status: 404, headers: cors, body: '' });
  });
  await page.goto('/');

  const adresa = async (url: string): Promise<void> => {
    await (await meniul(page)).locator('[data-extensii="din-adresa"]').click();
    await page.locator('[data-extensii="adresa"]').fill(url);
    await page.locator('[data-extensii="descarca"]').click();
  };
  await adresa('http://extensii.test/salut.zip');
  await expect(page.getByTestId('extensii-adresa-eroare')).toHaveText('Scrie o adresă HTTPS.');
  await page.locator('[data-extensii="adresa"]').fill('https://extensii.test/cazuta.zip');
  await page.locator('[data-extensii="descarca"]').click();
  await expect(page.getByTestId('extensii-adresa-eroare')).toContainText('Descărcarea n-a mers');
  await page.locator('[data-extensii="adresa"]').fill('https://extensii.test/stricat.zip');
  await page.locator('[data-extensii="descarca"]').click();
  await expect(page.getByTestId('extensii-refuz')).toHaveAttribute('data-motiv', 'amprenta');
  await expect(page.getByTestId('extensii-refuz')).toHaveText(
    'Pachetul nu se poate instala: un fișier nu se potrivește cu amprenta lui (SHA-256) (salut.txt)',
  );
  await page.locator('[data-extensii="renunta"]').click();

  await adresa('https://extensii.test/salut.zip');
  await expect(page.getByTestId('extensii-despre')).toHaveText('„Salut” 1.0.0, de la https://extensii.test/salut.zip');
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect(page.getByTestId('extensii-instalare')).toHaveCount(0);

  // Linkul: fereastra adresei, completată; nimic descărcat fără clic; ancora ștearsă din adresă.
  const cerute: string[] = [];
  page.on('request', (r) => { if (r.url().startsWith('https://extensii.test/')) cerute.push(r.url()); });
  // O încărcare nouă a aplicației din link (ca un clic venit din altă pagină).
  await page.goto('about:blank');
  await page.goto(`/#instaleaza=${encodeURIComponent('https://extensii.test/salut-1.1.0.zip')}`);
  await expect(page.getByTestId('extensii-adresa')).toContainText('Un link cere instalarea unei extensii');
  await expect(page.locator('[data-extensii="adresa"]')).toHaveValue('https://extensii.test/salut-1.1.0.zip');
  expect(new URL(page.url()).hash).toBe('');
  expect(cerute).toEqual([]);
  await page.locator('[data-extensii="descarca"]').click();
  await expect(page.getByTestId('extensii-inlocuieste')).toHaveText('Înlocuiește versiunea 1.0.0, instalată acum.');
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect((await meniul(page)).locator('[data-extensii="deschide"]')).toHaveText(['Salut1.1.0 · deschide spațiul']);
});

test('un fișier care nu e pachet se refuză cu motivul lui, fără nicio scriere', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-extensii="buton"]')).toBeVisible();
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: 'nu.zip', mimeType: 'application/zip', buffer: Buffer.from('nu e o arhivă') });
  await expect(page.getByTestId('extensii-refuz')).toHaveText('Pachetul nu se poate instala: nu e un fișier .zip');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('extensii-instalare')).toHaveCount(0);
  await expect((await meniul(page)).locator('[data-extensii="deschide"]')).toHaveCount(0);
  await page.keyboard.press('Escape');

  // Linkul lipit în fila deschisă: doar ancora se schimbă, fără reîncărcare; fereastra adresei vine la fel.
  await page.evaluate(() => { location.hash = `#instaleaza=${encodeURIComponent('https://extensii.test/salut.zip')}`; });
  await expect(page.locator('[data-extensii="adresa"]')).toHaveValue('https://extensii.test/salut.zip');
  expect(new URL(page.url()).hash).toBe('');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('extensii-adresa')).toHaveCount(0);
});
