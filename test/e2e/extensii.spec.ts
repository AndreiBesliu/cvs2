import { test, expect, type Page } from '@playwright/test';
import { impacheteaza, scrieZip } from '../../scripts/impacheteaza-extensie.ts';
import { citesteZip } from '../../src/extensii/zip.ts';
import { eroriJurnal } from './ajutor-jurnal.ts';
import { adauga } from './ajutor-panza.ts';

/**
 * Extensiile (ADR 0127, felia 3.Xa), în Edge, cu extensia de probă `extensii/salut`, împachetată aici:
 * - instalarea din fișier, cu confirmarea; meniul de lângă marcă; fereastra extensiei (ADR 0160 §A), cu Proiectarea acoperită
 *   (o comandă a desenului din paletă întoarce la ea); ce primește extensia (limba, tema, fișierul pachetului, stilurile ca
 *   foi construite);
 * - izolarea, încercată din cadru (pagina lui cvs2, stocarea, rețeaua, portul) și din afara lui; serviciul cerut, refuzat;
 *   eroarea extensiei în jurnalul local; închiderea cu × (pe filă) și din extensie; păstrarea după reîncărcare; scoaterea;
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

test('din fișier: confirmarea, meniul, fereastra izolată peste Proiectare, ×, reîncărcarea, scoaterea', async ({ page }) => {
  await page.goto('/');
  await expect((await meniul(page)).locator('.meniu-extensii-cap')).toContainText('Nicio extensie instalată încă');
  await page.getByTestId('meniu-extensii').locator('[data-extensii="din-fisier"]').focus();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('meniu-extensii')).toHaveCount(0);

  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: 'salut-1.0.0.zip', mimeType: 'application/zip', buffer: Buffer.from(SALUT) });
  const dialog = page.getByTestId('extensii-instalare');
  await expect(page.getByTestId('extensii-despre')).toHaveText('„Salut” 1.0.0, de la salut-1.0.0.zip');
  await expect(dialog).toContainText('3 fișiere');
  await expect(page.getByTestId('extensii-permisiuni')).toHaveText('Cere: să-și țină datele în browserul acesta (cel mult 16 MB).');
  await expect(page.locator('.aplicatie')).toHaveAttribute('inert', '');
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect(dialog).toHaveCount(0);

  await adauga(page, 'dreptunghi');
  await adauga(page, 'dreptunghi');
  await expect(forme(page)).toHaveCount(2);
  // Un rând nealeas din lista vectorilor: alegerea din listă merge direct la acțiunile documentului (fără bara sau paletă).
  const nealeasa = await page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="false"]').first().getAttribute('data-instanta');
  const randul = page.getByTestId('lista-vectori').locator(`button[data-instanta="${nealeasa ?? ''}"]`);
  await (await meniul(page)).locator('[data-extensii="deschide"][data-id="salut"]').click();
  await expect(page.getByTestId('spatiu-extensie')).toHaveAttribute('data-stare', 'pornit');
  await expect(page.getByTestId('extensie-deschisa')).toHaveText('Salut');
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'extensie');
  await expect(page.locator('.lucru')).toHaveCSS('visibility', 'hidden');

  const c = cadru(page);
  await expect(c.locator('[data-salut="titlu"]')).toHaveText('Salut din extensie');
  await expect(c.locator('[data-salut="limba"]')).toHaveText('Limba: română');
  await expect(c.locator('[data-salut="fisier"]')).toHaveText('Fișierul pachetului: Un fișier al pachetului, citit prin host.fisier().');
  await expect(c.locator('[data-salut="tema"]')).toContainText('Variabilele temei primite: 13');
  // Stilurile pachetului (salut.css), puse ca foi construite: CSP-ul moștenit nu le oprește.
  await expect(c.locator('body')).toHaveCSS('padding-top', '24px');
  // Stocarea extensiei (ADR 0128): deschiderile numărate; peste plafon, refuzul.
  await expect(c.locator('[data-salut="deschideri"]')).toHaveText('Deschideri: 1');
  await c.locator('[data-salut="prea-mult"]').click();
  await expect(c.locator('[data-proba="stocare"]')).toHaveText('stocare: stocare:plin');

  // Izolarea, din cadru: nimic din cvs2 și nicio rețea.
  await c.locator('[data-salut="izolare"]').click();
  await expect(c.locator('[data-proba]')).toHaveText(['pagina: refuzat', 'localStorage: refuzat', 'indexedDB: refuzat', 'retea: refuzat', 'serial: refuzat']);
  await c.locator('[data-salut="serviciu"]').click();
  // Senderul există (ADR 0160), dar „Salut” nu i-a cerut permisiunea.
  await expect(c.locator('[data-proba="serviciu"]')).toHaveText('masina: masina:permisiune');
  await c.locator('[data-salut="descarca"]').click();
  await expect(c.locator('[data-proba="descarcari"]')).toHaveText('descarcari: descarcari:permisiune');
  const sandbox = await page.locator('iframe.cadru-extensie').getAttribute('sandbox');
  expect(sandbox).toBe('allow-scripts');

  // Fereastra extensiei acoperă Proiectarea, ca Mașina (ADR 0132 §3): docurile sunt inerte; tema nouă ajunge și în cadru; o
  // comandă a desenului din paletă întoarce întâi la Proiectare, unde se face, iar cadrul rămâne pornit.
  await expect(page.locator('.doc-stanga')).toHaveAttribute('inert', '');
  const temaInainte = await c.locator('[data-salut="tema"]').textContent();
  await page.locator('[data-actiune="vedere.tema"]').click();
  await page.locator('[data-actiune="vedere.tema"]').click();
  await expect(c.locator('[data-salut="tema"]')).not.toHaveText(temaInainte ?? '');
  await page.locator('[data-actiune="vedere.paleta"]').click();
  await page.locator('[id="paleta-document.adauga-dreptunghi"]').click();
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'proiectare');
  await expect(forme(page)).toHaveCount(3);
  await expect(page.locator('iframe.cadru-extensie')).toHaveCount(1);
  await page.locator('[data-extensii="fila"]').click();
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'extensie');

  // Eroarea extensiei ajunge în jurnalul local, cu id-ul ei.
  await c.locator('[data-salut="eroare"]').click();
  await expect.poll(async () => (await eroriJurnal(page)).map((x) => x.mesaj)).toEqual([expect.stringContaining('extensia salut: eroare de probă din extensie')]);

  await page.locator('[data-extensii="inchide-fereastra"]').click();
  await expect(page.getByTestId('spatiu-extensie')).toHaveCount(0);
  await expect(page.locator('iframe.cadru-extensie')).toHaveCount(0);
  await expect(page.locator('[data-extensii="fila"]')).toHaveCount(0);
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'proiectare');
  await expect(page.locator('.lucru')).toHaveCSS('visibility', 'visible');
  await randul.click();
  await expect(randul).toHaveAttribute('aria-pressed', 'true');
  await adauga(page, 'dreptunghi');
  await expect(forme(page)).toHaveCount(4);

  // Din extensie: host.inchide(); deschiderea a doua e numărată.
  await (await meniul(page)).locator('[data-extensii="deschide"][data-id="salut"]').click();
  await expect(cadru(page).locator('[data-salut="deschideri"]')).toHaveText('Deschideri: 2');
  await cadru(page).locator('[data-salut="inchide"]').click();
  await expect(page.getByTestId('spatiu-extensie')).toHaveCount(0);

  // După reîncărcare, extensia și datele ei sunt tot acolo; din gestionare se scoate, cu datele ei.
  await page.reload();
  await expect((await meniul(page)).locator('[data-extensii="deschide"]')).toHaveText(['Salut1.0.0 · deschide fereastra']);
  await page.getByTestId('meniu-extensii').locator('[data-extensii="deschide"]').click();
  await expect(cadru(page).locator('[data-salut="deschideri"]')).toHaveText('Deschideri: 3');
  await page.locator('[data-extensii="inchide-fereastra"]').click();
  await (await meniul(page)).locator('[data-extensii="gestioneaza"]').click();
  const gest = page.getByTestId('extensii-gestionare');
  await expect(gest.locator('li')).toHaveCount(1);
  await expect(gest.locator('li')).toContainText('de la salut-1.0.0.zip');
  await expect(gest.getByTestId('extensii-date')).toHaveText('datele ei: 0 kB');
  await gest.locator('[data-extensii="scoate"]').click();
  await expect(gest).toContainText('Nicio extensie instalată încă');
  await gest.locator('[data-extensii="inchide"]').click();
  await expect((await meniul(page)).locator('[data-extensii="deschide"]')).toHaveCount(0);

  // Instalată din nou, numără de la 1: scoaterea i-a șters datele.
  await page.keyboard.press('Escape');
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: 'salut-1.0.0.zip', mimeType: 'application/zip', buffer: Buffer.from(SALUT) });
  await page.locator('[data-extensii="instaleaza"]').click();
  await (await meniul(page)).locator('[data-extensii="deschide"][data-id="salut"]').click();
  await expect(cadru(page).locator('[data-salut="deschideri"]')).toHaveText('Deschideri: 1');
});

test('fără permisiunea stocării, extensia nu-și poate ține datele; fereastra instalării spune că nu cere nimic', async ({ page }) => {
  const fara = await varianta((m) => { m.permisiuni = []; });
  await page.goto('/');
  await expect(page.locator('[data-extensii="buton"]')).toBeVisible();
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: 'salut-fara.zip', mimeType: 'application/zip', buffer: fara });
  await expect(page.getByTestId('extensii-permisiuni')).toHaveText('Nu cere nimic în plus: doar spațiul ei.');
  await page.locator('[data-extensii="instaleaza"]').click();
  await (await meniul(page)).locator('[data-extensii="deschide"][data-id="salut"]').click();
  await expect(cadru(page).locator('[data-salut="deschideri"]')).toHaveText('Deschideri: stocare:permisiune');
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
  await expect((await meniul(page)).locator('[data-extensii="deschide"]')).toHaveText(['Salut1.1.0 · deschide fereastra']);
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
