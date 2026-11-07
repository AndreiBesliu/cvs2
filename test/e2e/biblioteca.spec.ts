import { test, expect, type Page, type Request } from '@playwright/test';
import { pachetTrenulet } from '../../scripts/construieste-trenulet.ts';
import { scrieZip } from '../../scripts/impacheteaza-extensie.ts';
import { citesteZip } from '../../src/extensii/zip.ts';
import { eroriJurnal, faraEroriInJurnal } from './ajutor-jurnal.ts';

/**
 * Biblioteca extensiilor (ADR 0230), în Edge, pe catalogul și pachetul construite de build-ul adevărat (`dist/extensii/`):
 * - din meniul Extensii: rândul lui Easy 3Draw (numele, versiunea, descrierea, ce cere, mărimea), „Instalează”, fereastra cu ce
 *   cere extensia, nimic descărcat înainte de al doilea clic, apoi „Deschide”; rândul devine „Instalată”, iar gestionarea spune
 *   „din biblioteca cvs2”;
 * - amprenta greșită: pachetul schimbat pe drum se refuză, nimic scris, iar defectul ajunge în jurnal;
 * - actualizarea: o versiune mai veche, instalată din fișier („din afara bibliotecii”), cu datele ei: „Actualizează la …”, dintr-un
 *   clic, fără fereastră, cu datele păstrate; o versiune care cere ceva în plus trece prin fereastră, cu ce cere întâi;
 * - fără rețea: biblioteca spune că are nevoie de internet, iar „Reîncearcă” o aduce;
 * - linkul `#biblioteca=trenulet`: fereastra lui din bibliotecă, nimic descărcat fără clic, ancora ștearsă; un id necunoscut;
 * - în engleză: secțiunea, descrierea și butoanele.
 */
test.use({ locale: 'ro-RO' });

type Rand = { id: string; nume: string; versiune: string; pachet: string; descriere: { ro: string; en: string } };
const RE_PACHET = /\/extensii\/trenulet-[^/]+\.zip$/;

async function randul(page: Page): Promise<Rand> {
  const r = await page.request.get('/extensii/catalog.json');
  expect(r.ok()).toBe(true);
  const c = await r.json() as { extensii: Rand[] };
  const x = c.extensii.find((e) => e.id === 'trenulet');
  if (!x) throw new Error('trenulet lipsește din catalog');
  return x;
}

const meniu = (page: Page) => page.getByTestId('meniu-extensii');
const randBiblioteca = (page: Page) => page.getByTestId('biblioteca').locator('[data-id="trenulet"]');

/** Meniul extensiilor, deschis (un fișier ales direct în câmpul lui îl poate lăsa deschis: butonul l-ar închide). */
async function deschideMeniul(page: Page): Promise<void> {
  if (!await meniu(page).isVisible()) await page.locator('[data-extensii="buton"]').click();
  await expect(meniu(page)).toBeVisible();
}

/** Pachetul de acum, cu alt manifest (aceleași fișiere): o versiune mai veche, eventual cu mai puține permisiuni. */
async function pachetVechi(versiune: string, faraPermisiuni: readonly string[] = []): Promise<Buffer> {
  const z = await citesteZip(pachetTrenulet().octeti, { fisiere: 256, octetiFisier: 8 * 1024 * 1024, octetiTotal: 16 * 1024 * 1024 });
  if (!z.ok) throw new Error(z.motiv);
  return Buffer.from(scrieZip(z.intrari.map((i) => {
    if (i.nume !== 'extensie.json') return i;
    const m = JSON.parse(new TextDecoder().decode(i.octeti)) as Record<string, unknown> & { permisiuni: string[] };
    const nou = { ...m, versiune, permisiuni: m.permisiuni.filter((p) => !faraPermisiuni.includes(p)) };
    return { nume: i.nume, octeti: new TextEncoder().encode(JSON.stringify(nou)) };
  })));
}

/** Datele extensiei (ADR 0128 §B), scrise direct în IndexedDB-ul lui cvs2, ca și cum le-ar fi salvat ea; sau citite înapoi. */
const scrieDate = (page: Page, cheie: string, valoare: string) => page.evaluate(([k, v]) => new Promise<void>((ok, nu) => {
  const r = indexedDB.open('cncvs2-extensii');
  r.onerror = () => { nu(r.error); };
  r.onsuccess = () => {
    const t = r.result.transaction(['date', 'marimi'], 'readwrite');
    t.objectStore('date').put({ id: 'trenulet', cheie: k, valoare: v });
    t.objectStore('marimi').put({ id: 'trenulet', cheie: k, octeti: v.length + 2 });
    t.oncomplete = () => { r.result.close(); ok(); };
    t.onerror = () => { nu(t.error); };
  };
}), [cheie, valoare] as const);
const citesteDate = (page: Page, cheie: string) => page.evaluate((k) => new Promise<unknown>((ok, nu) => {
  const r = indexedDB.open('cncvs2-extensii');
  r.onerror = () => { nu(r.error); };
  r.onsuccess = () => {
    const q = r.result.transaction('date').objectStore('date').get(['trenulet', k]);
    q.onsuccess = () => { ok((q.result as { valoare?: unknown } | undefined)?.valoare); r.result.close(); };
    q.onerror = () => { nu(q.error); };
  };
}), cheie);

async function instaleazaDinFisier(page: Page, nume: string, buffer: Buffer): Promise<void> {
  await deschideMeniul(page);
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: nume, mimeType: 'application/zip', buffer });
  await expect(page.getByTestId('extensii-din-afara')).toBeVisible();
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect(page.getByTestId('extensii-instalare')).toHaveCount(0);
}

test('din bibliotecă: rândul lui Easy 3Draw, fereastra cu ce cere, instalarea verificată, „Deschide”; apoi „Instalată”', async ({ page }) => {
  const cereri: string[] = [];
  page.on('request', (r: Request) => { cereri.push(r.url()); });
  await page.goto('/');
  const r = await randul(page);
  await deschideMeniul(page);
  const rand = randBiblioteca(page);
  await expect(rand).toHaveAttribute('data-stare', 'instaleaza');
  await expect(rand).toContainText('Easy 3Draw');
  await expect(rand).toContainText(r.versiune);
  await expect(rand).toContainText(r.descriere.ro);
  await expect(rand).toContainText('mașina');
  await rand.locator('[data-extensii="biblioteca-instaleaza"]').click();

  const fereastra = page.getByTestId('extensii-instalare');
  await expect(page.getByTestId('extensii-despre')).toHaveText(`„Easy 3Draw” ${r.versiune}, din biblioteca cvs2`);
  await expect(page.getByTestId('extensii-permisiuni')).toContainText('să folosească mașina');
  await expect(page.getByTestId('extensii-din-afara')).toHaveCount(0);
  expect(cereri.filter((u) => RE_PACHET.test(u)), 'nimic descărcat înainte de „Instalează” din fereastră').toEqual([]);
  await fereastra.locator('[data-extensii="instaleaza"]').click();

  await expect(page.getByTestId('extensii-gata')).toContainText(`„Easy 3Draw” ${r.versiune} e instalată`);
  expect(cereri.filter((u) => RE_PACHET.test(u)).map((u) => new URL(u).pathname)).toEqual([`/extensii/${r.pachet}`]);
  await page.locator('[data-extensii="deschide-instalata"]').click();
  await expect(page.getByTestId('extensie-deschisa')).toHaveText('Easy 3Draw');
  await expect(page.getByTestId('spatiu-extensie')).toHaveAttribute('data-stare', 'pornit');

  await deschideMeniul(page);
  await expect(randBiblioteca(page)).toHaveAttribute('data-stare', 'instalata');
  await expect(randBiblioteca(page)).toContainText('Instalată');
  await expect(randBiblioteca(page).locator('[role="menuitem"]')).toHaveCount(0);
  await meniu(page).locator('[data-extensii="gestioneaza"]').click();
  await expect(page.getByTestId('extensii-gestionare')).toContainText('din biblioteca cvs2');
  await page.locator('[data-extensii="inchide"]').click();
  await faraEroriInJurnal(page);
});

test('amprenta greșită: pachetul schimbat pe drum se refuză, nimic nu se scrie, iar defectul ajunge în jurnal', async ({ page }) => {
  await page.route(RE_PACHET, async (route) => {
    const raspuns = await route.fetch();
    const octeti = Buffer.from(await raspuns.body());
    octeti[octeti.length - 40] = (octeti[octeti.length - 40] ?? 0) ^ 0xff;
    await route.fulfill({ response: raspuns, body: octeti });
  });
  await page.goto('/');
  await deschideMeniul(page);
  await randBiblioteca(page).locator('[data-extensii="biblioteca-instaleaza"]').click();
  await page.getByTestId('extensii-instalare').locator('[data-extensii="instaleaza"]').click();
  const refuz = page.getByTestId('extensii-refuz');
  await expect(refuz).toHaveAttribute('data-motiv', 'amprenta-biblioteca');
  await expect(refuz).toContainText('pachetul descărcat nu e cel din bibliotecă');
  await page.locator('[data-extensii="renunta"]').click();

  await deschideMeniul(page);
  await expect(meniu(page)).toContainText('Nicio extensie instalată încă');
  await expect(randBiblioteca(page)).toHaveAttribute('data-stare', 'instaleaza');
  const erori = await eroriJurnal(page);
  expect(erori.some((e) => e.mesaj.includes('amprenta-biblioteca')), JSON.stringify(erori)).toBe(true);
});

test('actualizarea dintr-un clic: o versiune veche, din fișier, cu datele ei; „Actualizează la …” o înlocuiește, datele rămân', async ({ page }) => {
  await page.goto('/');
  const r = await randul(page);
  await instaleazaDinFisier(page, 'trenulet-18.6.0.zip', await pachetVechi('18.6.0'));
  await scrieDate(page, 'circuit', 'circuitul de dinainte');

  await deschideMeniul(page);
  const instalata = meniu(page).locator('[data-extensii="deschide"][data-id="trenulet"]');
  await expect(instalata).toContainText('18.6.0');
  await expect(instalata).toContainText(`actualizare: ${r.versiune}`);
  const rand = randBiblioteca(page);
  await expect(rand).toHaveAttribute('data-stare', 'actualizeaza');
  await rand.locator('[data-extensii="biblioteca-actualizeaza"]').click();
  await expect(rand).toContainText(`Actualizată la ${r.versiune}`);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(instalata).toContainText(r.versiune);
  await expect(instalata).not.toContainText('actualizare');
  expect(await citesteDate(page, 'circuit')).toBe('circuitul de dinainte');

  await meniu(page).locator('[data-extensii="gestioneaza"]').click();
  await expect(page.getByTestId('extensii-gestionare')).toContainText('din biblioteca cvs2');
  await page.locator('[data-extensii="inchide"]').click();
  await faraEroriInJurnal(page);
});

test('actualizarea care cere ceva nou: fereastra spune întâi ce cere în plus, apoi o instalează', async ({ page }) => {
  await page.goto('/');
  const r = await randul(page);
  await instaleazaDinFisier(page, 'trenulet-18.6.0.zip', await pachetVechi('18.6.0', ['forme']));
  await deschideMeniul(page);
  await randBiblioteca(page).locator('[data-extensii="biblioteca-actualizeaza"]').click();
  const fereastra = page.getByTestId('extensii-instalare');
  await expect(page.getByTestId('extensii-despre')).toHaveText(`18.6.0 → ${r.versiune}, din biblioteca cvs2`);
  await expect(page.getByTestId('extensii-permisiuni-noi')).toHaveText(
    'Versiunea nouă cere și: să primească formele pe care i le trimiți din desen și să-ți propună forme pentru desen (le adaugi tu, din Importă).');
  await fereastra.locator('[data-extensii="actualizeaza"]').click();
  await expect(page.getByTestId('extensii-gata')).toContainText(`„Easy 3Draw” ${r.versiune} e instalată`);
  await page.locator('[data-extensii="inchide-instalata"]').click();
  await deschideMeniul(page);
  await expect(randBiblioteca(page)).toHaveAttribute('data-stare', 'instalata');
  await faraEroriInJurnal(page);
});

test('fără rețea: biblioteca spune că are nevoie de internet, iar „Reîncearcă” o aduce; nu e o eroare a aplicației', async ({ page }) => {
  await page.route('**/extensii/catalog.json', (route) => route.abort('internetdisconnected'));
  await page.goto('/');
  await deschideMeniul(page);
  const sectiunea = page.getByTestId('biblioteca');
  await expect(sectiunea).toContainText('Biblioteca are nevoie de internet.');
  await expect(sectiunea.locator('[data-id]')).toHaveCount(0);
  await page.unroute('**/extensii/catalog.json');
  await sectiunea.locator('[data-extensii="biblioteca-reincearca"]').click();
  await expect(randBiblioteca(page)).toHaveAttribute('data-stare', 'instaleaza');
  await faraEroriInJurnal(page);
});

test('linkul #biblioteca=trenulet: fereastra lui din bibliotecă, nimic descărcat fără clic, ancora ștearsă; un id necunoscut', async ({ page }) => {
  const cereri: string[] = [];
  page.on('request', (r: Request) => { cereri.push(r.url()); });
  await page.goto('/#biblioteca=trenulet');
  const r = await randul(page);
  await expect(page.getByTestId('extensii-link')).toBeVisible();
  await expect(page.getByTestId('extensii-despre')).toHaveText(`„Easy 3Draw” ${r.versiune}, din biblioteca cvs2`);
  await expect(page).toHaveURL(/\/$/);
  expect(cereri.filter((u) => RE_PACHET.test(u))).toEqual([]);
  await page.locator('[data-extensii="renunta"]').click();
  await expect(page.getByTestId('extensii-instalare')).toHaveCount(0);

  await page.goto('/#biblioteca=nu-exista');
  await expect(page.getByTestId('extensii-instalare')).toContainText('Extensia „nu-exista” nu e în biblioteca acestei instanțe.');
  await page.locator('[data-extensii="inchide-instalata"]').click();
  await faraEroriInJurnal(page);
});

test('în engleză: secțiunea, descrierea din catalog și butoanele', async ({ page }) => {
  await page.goto('/');
  const r = await randul(page);
  await page.getByRole('navigation', { name: 'Limba' }).getByRole('button', { name: 'EN', exact: true }).click();
  await deschideMeniul(page);
  const sectiunea = page.getByTestId('biblioteca');
  await expect(sectiunea).toContainText('Library');
  await expect(randBiblioteca(page)).toContainText(r.descriere.en);
  await expect(randBiblioteca(page).locator('[data-extensii="biblioteca-instaleaza"]')).toHaveText('Install');
  await randBiblioteca(page).locator('[data-extensii="biblioteca-instaleaza"]').click();
  await expect(page.getByTestId('extensii-despre')).toHaveText(`“Easy 3Draw” ${r.versiune}, from the cvs2 library`);
  await page.locator('[data-extensii="renunta"]').click();
  await faraEroriInJurnal(page);
});
