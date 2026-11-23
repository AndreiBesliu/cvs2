import { execSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import { adauga, deschideMeniulContului, ecran, vedere } from '../e2e/ajutor-panza.ts';

/**
 * Utilizarea aplicației (ADR 0262, felia A.8b) cap-coadă, pe emulatoare, pe build-ul real: un client cu contul deschis
 * lucrează în editor, pagina se ascunde, iar lotul ajunge în `utilizare`, cu contul lui, sursa fiecărui gest și rezultatul
 * fiecărei acțiuni (și al unui refuz), fără nimic din desen sau din cont. Colectarea oprită din Setări: primul lot doar
 * întreabă, nimic nu se scrie, iar editorul nu mai trimite. Fără cont: nicio cerere.
 */

test.use({ locale: 'ro-RO' });

const PROIECT = 'demo-cncvs2';
const FS = `http://127.0.0.1:8085/v1/projects/${PROIECT}/databases/(default)/documents`;
const AUTH = 'http://127.0.0.1:9095';
const CONFIG = {
  instanta: 'local',
  firebase: { apiKey: 'demo-cheie', authDomain: `${PROIECT}.firebaseapp.com`, projectId: PROIECT, appId: '1:1:web:1' },
  emulatoare: { auth: AUTH, firestore: '127.0.0.1:8085', functions: '127.0.0.1:5005' },
};
/** Primul apel al unui callable după pornirea emulatorului de funcții trece de 5 s. */
const LENT = { timeout: 30_000 };
/** Versiunea din antetul paginii e commit-ul (`vite.config.ts`). */
const BUILD = execSync('git rev-parse --short=12 HEAD', { encoding: 'utf8' }).trim();

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`${AUTH}/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' });
});

/** Un document în forma REST, ca valori JS (hărțile și listele desfăcute). */
type Valoare = {
  stringValue?: string; integerValue?: string; booleanValue?: boolean; nullValue?: null; timestampValue?: string;
  arrayValue?: { values?: Valoare[] }; mapValue?: { fields?: Record<string, Valoare> };
};
function js(v: Valoare): unknown {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue) return (v.arrayValue.values ?? []).map(js);
  if (v.mapValue) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, js(x)]));
  return null;
}
async function loturi(): Promise<Array<Record<string, unknown>>> {
  const r = await fetch(`${FS}/utilizare`, { headers: { Authorization: 'Bearer owner' } });
  const j = (await r.json()) as { documents?: Array<{ fields: Record<string, Valoare> }> };
  return (j.documents ?? []).map((d) => js({ mapValue: { fields: d.fields } }) as Record<string, unknown>);
}

/** Un client cu parolă și adresa confirmată, făcut prin API-ul emulatorului de cont (ca după linkul din e-mail). */
async function clientConfirmat(email: string, parola: string): Promise<string> {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-cheie`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: parola, returnSecureToken: true }),
  });
  expect(r.status, await r.clone().text()).toBe(200);
  const { localId } = (await r.json()) as { localId: string };
  const c = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROIECT}/accounts:update`, {
    method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ localId, emailVerified: true }),
  });
  expect(c.status, await c.clone().text()).toBe(200);
  return localId;
}

/** Editorul, cu cererile spre callable-ul `utilizare` numărate (și corpurile lor ținute). */
async function deschide(page: Page): Promise<{ readonly cereri: () => number; readonly corpuri: () => readonly string[] }> {
  const c: string[] = [];
  page.on('request', (q) => { if (q.url().includes('/europe-central2/utilizare') && q.method() === 'POST') c.push(q.postData() ?? ''); });
  await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  await page.goto('/');
  return { cereri: () => c.length, corpuri: () => c };
}

async function intra(page: Page, email: string, parola: string): Promise<void> {
  await (await deschideMeniulContului(page)).locator('[data-meniu-cont="intra"]').click();
  const d = page.getByTestId('dialog-cont');
  await d.locator('[data-camp="cont-email"]').fill(email);
  await d.locator('[data-camp="cont-parola"]').fill(parola);
  await d.locator('[data-buton="cont-intra"]').click();
  await expect(d.locator('[data-cont="intrat"]')).toBeVisible(LENT);
  await d.locator('[data-buton="inchide-cont"]').click();
}

/** Pagina „ascunsă” (fila schimbată, browserul minimizat): lotul se închide și pleacă. */
async function ascunde(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

test('lotul unui client: după lista albă, cu contul lui, sursa fiecărui gest, rezultatul și contextul; nimic din desen sau din cont', async ({ page }) => {
  test.setTimeout(120_000);
  const uid = await clientConfirmat('ana@exemplu.ro', 'parola-anei-1');
  const { cereri } = await deschide(page);
  await intra(page, 'ana@exemplu.ro', 'parola-anei-1');
  await adauga(page, 'dreptunghi');
  // Gruparea cu o singură formă aleasă: refuzată, din tastatură.
  await page.keyboard.press('Control+g');
  // Tastele uneltelor merg cu focusul pe pagină, nu pe un buton al barei (unde a rămas după paletă).
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); });
  await page.keyboard.press('r');
  await expect(page.locator('[data-unealta="dreptunghi"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-actiune="vedere.masina"]').click();
  await page.locator('[data-actiune="vedere.proiectare"]').click();
  // Un nod nou (dublu clic pe latura de sus), apoi Delete pe el: tasta trece printr-un ascultător de captură al editării, care
  // oprește propagarea, deci sursa ei se prinde înaintea lui.
  await page.locator('[data-unealta="noduri"]').click();
  const peEcran = await ecran(page, await vedere(page));
  const mijloc = peEcran(70, 20);
  await page.mouse.dblclick(mijloc.x, mijloc.y);
  await expect(page.getByTestId('noduri')).toHaveAttribute('data-noduri', '5');
  await page.keyboard.press('Delete');
  await expect(page.getByTestId('noduri')).toHaveAttribute('data-noduri', '4');
  // Rotița pe pânză (zoom, un gest), apoi fereastra exportului deschisă și închisă fără export (renunțat).
  const p0 = peEcran(50, 50);
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.wheel(0, -120);
  await page.mouse.wheel(0, -120);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('#export-titlu')).toBeVisible();
  await page.locator('[role="dialog"]').getByRole('button', { name: 'Închide', exact: true }).click();
  await expect(page.locator('#export-titlu')).toHaveCount(0);
  // Apoi deschisă din nou, cu exportul făcut (o acțiune a registrului reușită între timp): gata.
  await page.locator('[data-actiune="export.gcode"]').click();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await descarcare;
  await page.locator('[role="dialog"]').getByRole('button', { name: 'Închide', exact: true }).click();
  await expect(page.locator('#export-titlu')).toHaveCount(0);
  await ascunde(page);
  await expect.poll(async () => (await loturi()).length, LENT).toBe(1);
  const [l] = await loturi();
  expect(l?.['uid']).toBe(uid);
  expect(l?.['aruncate']).toBe(0);
  expect(l?.['personal']).toBe(false);
  expect(l?.['context']).toMatchObject({ versiune: BUILD, limba: 'ro', browser: 'edge', aranjament: 'modern', online: true });
  const ev = l?.['evenimente'] as Array<Record<string, unknown>>;
  const fara = ev.map(({ t: _t, ...e }) => e);
  expect(fara).toContainEqual({ fel: 'actiune', id: 'document.adauga-dreptunghi', de: 'paleta', rez: 'ok' });
  expect(fara).toContainEqual({ fel: 'unealta', id: 'dreptunghi', de: 'tasta' });
  expect(fara).toContainEqual({ fel: 'actiune', id: 'vedere.masina', de: 'bara', rez: 'ok' });
  expect(fara).toContainEqual({ fel: 'fereastra', id: 'masina' });
  expect(fara).toContainEqual({ fel: 'fereastra', id: 'proiectare' });
  expect(fara).toContainEqual({ fel: 'unealta', id: 'noduri', de: 'bara' });
  expect(fara).toContainEqual({ fel: 'actiune', id: 'document.forma', de: 'panza', rez: 'ok' });
  expect(fara).toContainEqual({ fel: 'actiune', id: 'document.forma', de: 'tasta', rez: 'ok' });
  // Clicurile fine (felia A.8c): pe butonul exportului și pe Închide din fereastra contului (după intrare); nu și pe butoanele
  // registrului sau pe unelte, care au deja acțiunea și unealta lor. Zoom-ul pe pânză; dialogurile.
  expect(fara).toContainEqual({ fel: 'clic', id: 'buton.exporta', de: 'panou' });
  expect(fara).toContainEqual({ fel: 'clic', id: 'buton.inchide-cont', de: 'panou' });
  expect(fara.filter((e) => e['fel'] === 'clic' && /^(actiune|unealta)\./.test(String(e['id'])))).toEqual([]);
  expect(fara.find((e) => e['fel'] === 'zoom')).toMatchObject({ de: 'panza', n: 2 });
  expect(fara).toContainEqual({ fel: 'dialog', id: 'eticheta.export-titlu', rez: 'deschis' });
  expect(fara).toContainEqual({ fel: 'dialog', id: 'eticheta.export-titlu', rez: 'renuntat' });
  expect(fara).toContainEqual({ fel: 'dialog', id: 'eticheta.export-titlu', rez: 'gata' });
  // Fereastra contului: deschisă înaintea contului (nimic), închisă după intrarea cu butonul ei principal (gata, fără registru).
  expect(fara).toContainEqual({ fel: 'dialog', id: 'testid.dialog-cont', rez: 'gata' });
  expect(fara).not.toContainEqual({ fel: 'dialog', id: 'testid.dialog-cont', rez: 'deschis' });
  const grupare = fara.find((e) => e['id'] === 'document.grupeaza');
  expect(grupare).toMatchObject({ fel: 'actiune', de: 'tasta' });
  expect(String(grupare?.['rez'])).toMatch(/^motiv\./);
  // Timpul fiecărui eveniment e al sesiunii, în ordine; nimic din cont sau din desen.
  const timpi = ev.map((e) => Number(e['t']));
  expect([...timpi].sort((a, b) => a - b)).toEqual(timpi);
  expect(JSON.stringify(l)).not.toContain('ana@exemplu.ro');
  expect(cereri()).toBe(1);
  // Coada din browser s-a golit după primire.
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('cncvs2.utilizare.loturi'))).toBe(JSON.stringify({ v: 1, loturi: [] }));
});

test('colectarea oprită din Setări: lotul nu se scrie, editorul află și nu mai strânge; la pornirea următoare doar întreabă, o dată', async ({ page }) => {
  test.setTimeout(120_000);
  const r = await fetch(`${FS}/setari/utilizare`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { colectare: { booleanValue: false }, versiune: { integerValue: '1' } } }),
  });
  expect(r.status).toBe(200);
  await clientConfirmat('ion@exemplu.ro', 'parola-lui-ion');
  const { cereri, corpuri } = await deschide(page);
  await intra(page, 'ion@exemplu.ro', 'parola-lui-ion');
  await adauga(page, 'cerc');
  await ascunde(page);
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('cncvs2.utilizare.setari') ?? 'null') as unknown), LENT)
    .toMatchObject({ colectare: false });
  expect(await loturi()).toEqual([]);
  // Sesiunea următoare: o singură întrebare (un lot gol), apoi nimic, oricât ar lucra omul.
  const inainte = cereri();
  await page.reload();
  await expect.poll(cereri, LENT).toBe(inainte + 1);
  expect(corpuri().at(-1)).toContain('"evenimente":[]');
  await adauga(page, 'dreptunghi');
  await page.keyboard.press('r');
  await ascunde(page);
  await page.waitForTimeout(1_500);
  expect(cereri()).toBe(inainte + 1);
  expect(await loturi()).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('cncvs2.utilizare.loturi'))).toBe(JSON.stringify({ v: 1, loturi: [] }));
});

test('clicurile fine oprite din Setări: lotul are acțiunile și dialogurile, fără clicuri, derulare sau zoom', async ({ page }) => {
  test.setTimeout(120_000);
  const r = await fetch(`${FS}/setari/utilizare`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { clicuri: { booleanValue: false }, versiune: { integerValue: '1' } } }),
  });
  expect(r.status).toBe(200);
  // Editorul le-a aflat la o sesiune de dinainte (răspunsul unui lot): ținute în browser.
  await page.addInitScript(() => {
    localStorage.setItem('cncvs2.utilizare.setari', JSON.stringify({ colectare: true, clicuri: false, lotMinute: 5, pasiEroare: 30 }));
  });
  await clientConfirmat('ion@exemplu.ro', 'parola-lui-ion');
  await deschide(page);
  await intra(page, 'ion@exemplu.ro', 'parola-lui-ion');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="vedere.masina"]').click();
  await page.locator('[data-actiune="vedere.proiectare"]').click();
  const p0 = (await ecran(page, await vedere(page)))(50, 50);
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.wheel(0, -120);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('#export-titlu')).toBeVisible();
  await page.locator('[role="dialog"]').getByRole('button', { name: 'Închide', exact: true }).click();
  await expect(page.locator('#export-titlu')).toHaveCount(0);
  await ascunde(page);
  await expect.poll(async () => (await loturi()).length, LENT).toBe(1);
  const feluri = new Set(((await loturi())[0]?.['evenimente'] as Array<Record<string, unknown>>).map((e) => e['fel']));
  expect([...feluri].sort()).toEqual(['actiune', 'dialog', 'fereastra']);
});

test('fără cont: nicio cerere spre utilizare, nimic ținut în browser', async ({ page }) => {
  const { cereri } = await deschide(page);
  await adauga(page, 'dreptunghi');
  await page.keyboard.press('r');
  await ascunde(page);
  await page.waitForTimeout(1_500);
  expect(cereri()).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('cncvs2.utilizare.loturi'))).toBeNull();
  expect(await loturi()).toEqual([]);
});
