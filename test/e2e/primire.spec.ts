import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';

/**
 * Primirea lucrărilor (ADR 0126, felia 3.S), în Edge. O pagină de pe altă origine (servită de Playwright, ca Planificatorul
 * Trenuleț) deschide aplicația la `#primeste-lucrare`, întreabă („cauta”) până vine „gata” și trimite lucrarea. Se probează:
 * dialogul, „Primește” (răspunsul `primit`, panoul mașinii deschis, fișierele bune în ordine, `M6` refuzat cu linia,
 * încărcarea cu amprenta trimisă), „Nu” și Escape (`renuntat`), înlocuirea unei lucrări de alta, mesajul care nu vine de la
 * fereastra care a deschis fila; pe live, primirea nu se încarcă deloc.
 */
test.use({ locale: 'ro-RO' });

type Fixtura = { primite: { tip?: string; id?: string; renuntat?: boolean; acceptate?: string[]; refuzate?: unknown[] }[]; gata: boolean; trimite(l: unknown): void };
const PLANIFICATOR = 'http://planificator.test/';

const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');
const prog = (x: number): string => `G90 G17 G21 G94\nG54\n(T1 freza dreapta D6.000)\nM3 S18000\nG0 Z5\nG0 X${x} Y10\nG1 Z-1 F300\nG1 X${x + 10} F1000\nG0 Z5\nM5\nM2\n`;
const fisier = (nume: string, text: string, extra: Record<string, unknown> = {}) => ({ nume, text, sha256: sha(text), ...extra });
const lucrare = (id: string, titlu: string, fisiere: unknown[]) => ({
  protocol: 'cvs2-lucrare', versiune: 1, tip: 'lucrare', id, de_la: { aplicatie: 'Planificator Trenuleț', versiune: '11' }, titlu, fisiere,
});

/** Pagina care trimite, pe altă origine: deschide fila „cvs2”, cere „gata”, ține minte ce primește de la ea. */
const pagina = (cvs2: string): string => `<!doctype html><meta charset="utf-8"><title>Planificator</title>
<button id="trimite">Trimite la cvs2</button>
<script>
const CVS2 = ${JSON.stringify(cvs2)}, tinta = new URL(CVS2).origin;
let fila = null;
window.primite = []; window.gata = false;
addEventListener('message', (ev) => {
  if (ev.source !== fila || ev.origin !== tinta) return;
  window.primite.push(ev.data);
  if (ev.data && ev.data.tip === 'gata') window.gata = true;
});
document.getElementById('trimite').onclick = () => {
  fila = window.open(CVS2 + '#primeste-lucrare', 'cvs2');
  const t = setInterval(() => { if (window.gata) clearInterval(t); else fila.postMessage({ protocol: 'cvs2-lucrare', versiune: 1, tip: 'cauta' }, tinta); }, 500);
};
window.trimite = (l) => { fila.postMessage(l, tinta); };
</script>`;

/** Deschide pagina care trimite și fila aplicației; întoarce fila după ce a spus „gata”. */
async function deschide(page: Page, baseURL: string | undefined): Promise<Page> {
  await page.context().route(`${PLANIFICATOR}**`, (r) => r.fulfill({ contentType: 'text/html', body: pagina(new URL('/', baseURL).href) }));
  await page.goto(PLANIFICATOR);
  const [cvs2] = await Promise.all([page.waitForEvent('popup'), page.locator('#trimite').click()]);
  await expect.poll(() => page.evaluate(() => (window as unknown as Fixtura).gata), { timeout: 20_000 }).toBe(true);
  return cvs2;
}
const primite = (page: Page) => page.evaluate(() => (window as unknown as Fixtura).primite.filter((m) => m.tip === 'primit'));
const trimite = (page: Page, l: unknown) => page.evaluate((x) => { (window as unknown as Fixtura).trimite(x); }, l);

test('„Primește”: răspunsul primit, panoul mașinii, fișierele bune în ordine, M6 refuzat cu linia, încărcarea cu amprenta trimisă', async ({ page, baseURL }) => {
  const cvs2 = await deschide(page, baseURL);
  const unu = fisier('placa_1_T1.nc', prog(10), { rol: 'placa', placa: 1, scula: 'T1 freza dreapta D6.000', timp_s: 420 });
  const doi = fisier('placa_2_T1.nc', prog(40), { rol: 'placa', placa: 2 });
  const m6 = fisier('placa_3_T2.nc', prog(70).replace('M3 S18000', 'T2 M6\nM3 S18000'));
  const rau = { ...fisier('placa_4_T1.nc', prog(100)), sha256: sha(`${prog(100)} `) };
  await trimite(page, lucrare('l1', 'Ovalul din sufragerie', [unu, doi, m6, rau]));

  const dialog = cvs2.getByTestId('dialog-lucrare');
  await expect(dialog).toBeVisible();
  // Sub dialog, aplicația e inertă (ca sub dialogul exportului): nicio acțiune nu pornește din bare sau din pânză.
  await expect(cvs2.locator('.aplicatie')).toHaveAttribute('inert', '');
  await expect(cvs2.getByTestId('lucrare-de-la')).toHaveText('Planificator Trenuleț 11 trimite „Ovalul din sufragerie”, din http://planificator.test.');
  await expect(cvs2.getByTestId('lucrare-fisiere').locator('li')).toHaveText([
    'placa_1_T1.nc · placa 1 · T1 freza dreapta D6.000 · ~7 min', 'placa_2_T1.nc · placa 2', 'placa_3_T2.nc', 'placa_4_T1.nc',
  ]);
  await expect(cvs2.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'proiectare');
  await cvs2.locator('[data-masina="lucrare-primeste"]').click();
  await expect(dialog).toHaveCount(0);
  await expect(cvs2.locator('.aplicatie')).not.toHaveAttribute('inert');

  await expect.poll(() => primite(page)).toEqual([{
    protocol: 'cvs2-lucrare', versiune: 1, tip: 'primit', id: 'l1', acceptate: ['placa_1_T1.nc', 'placa_2_T1.nc'],
    refuzate: [{ nume: 'placa_3_T2.nc', cod: 'm6-strain', linie: 3 }, { nume: 'placa_4_T1.nc', cod: 'hash', linie: null }],
  }]);
  // Lucrarea primită deschide fereastra Mașina (ADR 0132): rândul ei stă în secțiunea programului.
  await expect(cvs2.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'masina');
  await expect(cvs2.locator('.fereastra-masina')).toBeVisible();
  const randul = cvs2.getByTestId('masina-primita');
  await expect(randul).toContainText('Lucrarea primită: „Ovalul din sufragerie”, de la Planificator Trenuleț');
  await expect(cvs2.locator('[data-masina="primit-fisier"] option')).toHaveText(['placa_1_T1.nc', 'placa_2_T1.nc']);
  await expect(randul).toContainText('2 fișiere refuzate:');
  await expect(cvs2.getByTestId('masina-primit-refuzate').locator('li')).toHaveText([
    'placa_3_T2.nc: Linia 4 schimbă scula (M6): deocamdată doar programele exportate de aici pot.',
    'placa_4_T1.nc: Octeții diferă de amprenta trimisă (SHA-256): trimite lucrarea din nou.',
  ]);

  await cvs2.locator('[data-masina="primit-fisier"]').selectOption('1');
  await cvs2.locator('[data-masina="primit"]').click();
  await expect(cvs2.getByTestId('masina-program')).toContainText('placa_2_T1.nc');
  await expect(cvs2.locator('.masina-sha')).toHaveAttribute('data-sha', doi.sha256);
  await expect(cvs2.getByTestId('masina-refuz')).toHaveCount(0);
  await expect(cvs2.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('„Nu” și Escape răspund „renuntat”; o lucrare nouă o înlocuiește pe cea din dialog; un mesaj străin e ignorat', async ({ page, baseURL }) => {
  const cvs2 = await deschide(page, baseURL);
  const dialog = cvs2.getByTestId('dialog-lucrare');

  // Un mesaj care nu vine de la fereastra care a deschis fila (aici, de la fila însăși): nimic.
  await cvs2.evaluate((l) => { window.dispatchEvent(new MessageEvent('message', { data: l, origin: 'http://rau.test', source: window })); },
    lucrare('strain', 'Străin', [fisier('a.nc', prog(1))]));
  await cvs2.waitForTimeout(300);
  await expect(dialog).toHaveCount(0);

  await trimite(page, lucrare('a', 'Prima', [fisier('a.nc', prog(1))]));
  await expect(cvs2.getByTestId('lucrare-de-la')).toContainText('„Prima”');
  await trimite(page, lucrare('b', 'A doua', [fisier('b.nc', prog(2))]));
  await expect(cvs2.getByTestId('lucrare-de-la')).toContainText('„A doua”');
  await expect.poll(() => primite(page)).toEqual([{ protocol: 'cvs2-lucrare', versiune: 1, tip: 'primit', id: 'a', renuntat: true, acceptate: [], refuzate: [] }]);

  await cvs2.locator('[data-masina="lucrare-renunta"]').click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await primite(page)).map((m) => [m.id, m.renuntat])).toEqual([['a', true], ['b', true]]);

  await trimite(page, lucrare('c', 'A treia', [fisier('c.nc', prog(3))]));
  await expect(dialog).toBeVisible();
  await cvs2.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await primite(page)).map((m) => [m.id, m.renuntat])).toEqual([['a', true], ['b', true], ['c', true]]);

  // Același id a doua oară: ignorat.
  await trimite(page, lucrare('c', 'A treia', [fisier('c.nc', prog(3))]));
  await cvs2.waitForTimeout(300);
  await expect(dialog).toHaveCount(0);
  await expect(cvs2.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'proiectare');
  await expect(cvs2.getByTestId('masina-primita')).toHaveCount(0);
});

test('pe live, primirea nu se încarcă: niciun „gata”, nicio bucată a primirii; fără ancoră sau fără fereastra care a deschis fila, nici în afara live', async ({ page, baseURL }) => {
  const cerute: string[] = [];
  page.context().on('request', (r) => { if (/DialogLucrare|primireLucrare/.test(r.url())) cerute.push(r.url()); });
  await page.goto('/');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
  // Ancora pusă în fila deschisă de mână (fără `window.opener`): la schimbarea ancorei și la o încărcare nouă, nimic.
  await page.evaluate(() => { location.hash = '#primeste-lucrare'; });
  const directa = await page.context().newPage();
  await directa.goto('/#primeste-lucrare');
  await expect(directa.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
  await page.waitForTimeout(500);
  expect(cerute).toEqual([]);
  await directa.close();

  await page.context().route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ instanta: 'live' }) }));
  await page.context().route(`${PLANIFICATOR}**`, (r) => r.fulfill({ contentType: 'text/html', body: pagina(new URL('/', baseURL).href) }));
  await page.goto(PLANIFICATOR);
  const [cvs2] = await Promise.all([page.waitForEvent('popup'), page.locator('#trimite').click()]);
  await expect(cvs2.getByTestId('instanta')).toContainText('live');
  await page.waitForTimeout(2_000);
  expect(await page.evaluate(() => (window as unknown as Fixtura).gata)).toBe(false);
  expect(cerute).toEqual([]);
});
