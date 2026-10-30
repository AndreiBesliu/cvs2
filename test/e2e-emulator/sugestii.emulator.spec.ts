import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { adauga } from '../e2e/ajutor-panza.ts';

/**
 * Sugestiile personalului (ADR 0107) cap-coadă, pe emulatoare, pe build-ul real: owner-ul face un rol cu „Sugestii: scrie”
 * și un cont cu parolă; omul intră, vede doar fila Sugestii (și Cont), scrie o sugestie și o editează; owner-ul o vede în
 * lista întregului personal, cu adresa omului, și decide cu o notă; omul vede decizia, fără „Editează”. Apoi: decizia pe o
 * sugestie schimbată între timp e refuzată lângă formular, iar un rol care doar citește vede lista fără formulare.
 * Capturile filei se scriu în `.tmp/`, nu în git.
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
const CITESTE = 'RCiteste000000000000';
const SUG = 'SIon0000000000000000';

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`${AUTH}/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' });
});

/** O valoare JS în forma REST a Firestore. */
function val(x: unknown): unknown {
  if (x === null) return { nullValue: null };
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'number') return { integerValue: String(x) };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(val) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(x as object).map(([k, v]) => [k, val(v)])) } };
}

/** Scrie un document întreg ocolind regulile („Bearer owner” e cheia de administrare a emulatorului). */
async function scrie(cale: string, d: Record<string, unknown>): Promise<void> {
  const r = await fetch(`${FS}/${cale}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, val(v)])) }),
  });
  expect(r.status, await r.clone().text()).toBe(200);
}

async function stare(cale: string): Promise<string | undefined> {
  const r = await fetch(`${FS}/${cale}`, { headers: { Authorization: 'Bearer owner' } });
  return ((await r.json()) as { fields?: { stare?: { stringValue?: string } } }).fields?.stare?.stringValue;
}

async function deschide(page: Page): Promise<void> {
  await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  await page.goto('/admin');
}

/** Login-ul Google al emulatorului: un cont nou, cu adresa generată. */
async function intraCuGoogle(page: Page): Promise<string> {
  const [fereastra] = await Promise.all([page.waitForEvent('popup'), page.locator('[data-admin="intra"]').click()]);
  await fereastra.waitForLoadState();
  await fereastra.locator('#add-account-button').click();
  await fereastra.locator('#autogen-button').click();
  await fereastra.locator('#sign-in').click();
  return (await page.locator('[data-admin="uid"]').textContent()) ?? '';
}

/** Un om fără rol primește documentul de personal pus de mână (ca primul owner, în consolă), apoi „Verifică din nou”. */
async function puneRolul(page: Page, uid: string, rol: string): Promise<void> {
  await scrie(`staff/${uid}`, { rol });
  await page.locator('[data-admin="reincearca"]').click();
}

async function intraCaOwner(page: Page): Promise<void> {
  await deschide(page);
  await puneRolul(page, await intraCuGoogle(page), 'owner');
  await expect(page.locator('[data-fila="personal"]')).toBeVisible();
}

async function intraCuParola(page: Page, email: string, parola: string): Promise<void> {
  await page.locator('[data-admin="email"]').fill(email);
  await page.locator('[data-admin="parola"]').fill(parola);
  await page.locator('[data-admin="intra-parola"]').click();
}

async function iesi(page: Page): Promise<void> {
  await page.locator('.admin-cont button').click();
  await expect(page.locator('[data-admin="intra"]')).toBeVisible();
}

const file = async (page: Page): Promise<string[]> => page.locator('[data-fila]').evaluateAll((b) => b.map((x) => x.getAttribute('data-fila') ?? ''));

test('omul scrie și își editează sugestia; owner-ul o vede la tot personalul și decide cu o notă; omul vede decizia', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await intraCaOwner(page);
  await page.locator('[data-fila="personal"]').click();
  // Rolul: doar „Sugestii: scrie”, bifat din catalog.
  await page.locator('[data-personal="rol-nou-buton"]').click();
  await page.locator('[data-personal="nume-rol"]').fill('Sugestii');
  await page.locator('[data-permisiune="sugestii.scrie"]').check();
  await page.locator('[data-personal="salveaza-rol"]').click();
  await expect(page.locator('[data-rol="Sugestii"]')).toContainText('Sugestii: scrie', LENT);
  // Contul omului, cu parolă (linkul, apoi pagina Firebase a linkului, aici prin API-ul emulatorului).
  await page.locator('[data-personal="email"]').fill('ana@exemplu.ro');
  await page.locator('[data-personal="rol-nou"]').selectOption({ label: 'Sugestii' });
  await page.locator('[data-personal="creeaza-cont"]').click();
  const link = page.locator('[data-personal="link"]');
  await expect(link).toHaveValue(/oobCode=/, LENT);
  const oobCode = new URL(await link.inputValue()).searchParams.get('oobCode') ?? '';
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=demo-cheie`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode, newPassword: 'parola-anei-1' }),
  });
  expect(r.status, await r.clone().text()).toBe(200);
  // Owner-ul are tot catalogul: scrie și el una.
  await page.locator('[data-fila="sugestii"]').click();
  await expect(page.locator('[data-sug="gol"]')).toBeVisible();
  const nou = page.locator('[data-sug="formular"]');
  await nou.locator('[data-sug="titlu"]').fill('Centrează pe foaie');
  await nou.locator('[data-sug="tip"]').selectOption({ label: 'Idee' });
  await nou.locator('[data-sug="trimite"]').click();
  await expect(page.locator('[data-sug="gata"]')).toContainText('Centrează pe foaie', LENT);
  await iesi(page);

  // Omul: doar filele rolului; fără tip ales, nimic nu pleacă; trimite, apoi își vede doar sugestia lui.
  await intraCuParola(page, 'ana@exemplu.ro', 'parola-anei-1');
  await expect(page.locator('[data-admin="cont"]')).toContainText('ana@exemplu.ro · Sugestii');
  expect(await file(page)).toEqual(['sugestii', 'cont']);
  await nou.locator('[data-sug="titlu"]').fill('Grila magnetică la desen');
  await nou.locator('[data-sug="descriere"]').fill('Când trag o formă,\nsă se lipească de grilă.');
  await expect(nou.locator('[data-sug="trimite"]')).toBeDisabled();
  await nou.locator('[data-sug="tip"]').selectOption({ label: 'Îmbunătățire' });
  await nou.locator('[data-sug="zona"]').selectOption({ label: 'Desen și editare' });
  await nou.locator('[data-sug="trimite"]').click();
  await expect(page.locator('[data-sug="gata"]')).toContainText('Sugestia „Grila magnetică la desen” a ajuns la owner.', LENT);
  await expect(nou.locator('[data-sug="titlu"]')).toHaveValue('');
  const prima = page.locator('[data-sugestie="Grila magnetică la desen"]');
  await expect(prima.locator('[data-sug="stare"]')).toHaveText('Fără decizie');
  await expect(prima).toContainText('Îmbunătățire · Desen și editare · tu ·');
  await expect(prima.locator('[data-sug="descriere-text"]')).toHaveText('Când trag o formă,\nsă se lipească de grilă.');
  await expect(page.locator('[data-sugestie]')).toHaveCount(1);
  // Editarea, cât n-are decizie.
  await prima.locator('[data-sug="editeaza"]').click();
  await prima.locator('[data-sug="formular-editare"] [data-sug="titlu"]').fill('Grila magnetică');
  await prima.locator('[data-sug="formular-editare"] [data-sug="trimite"]').click();
  await expect(page.locator('[data-sug="gata"]')).toContainText('Sugestia „Grila magnetică” e salvată.', LENT);
  await expect(page.locator('[data-sugestie="Grila magnetică"]')).toContainText('editată');
  await iesi(page);

  // Owner-ul (alt cont owner, pus din consolă): toate sugestiile, cu adresa omului; decide cu o notă.
  await intraCaOwner(page);
  await page.locator('[data-fila="sugestii"]').click();
  await expect(page.locator('[data-sugestie]')).toHaveCount(2, LENT);
  await expect(page.locator('[data-filtru-sug="noua"]')).toHaveText('Fără decizie (2)');
  const s = page.locator('[data-sugestie="Grila magnetică"]');
  await expect(s).toContainText('ana@exemplu.ro');
  await expect(s.locator('[data-sug="editeaza"]')).toHaveCount(0);
  await s.locator('[data-sug="decide"]').click();
  await s.locator('[data-sug="stare-aleasa"]').selectOption({ label: 'Acceptată: de făcut' });
  await s.locator('[data-sug="nota"]').fill('Da, după etapa 6.');
  await s.locator('[data-sug="salveaza-decizia"]').click();
  await expect(page.locator('[data-sug="gata"]')).toContainText('„Grila magnetică”: Acceptată: de făcut.', LENT);
  await expect(s.locator('[data-sug="stare"]')).toHaveText('Acceptată: de făcut');
  await expect(s.locator('[data-sug="nota-owner"]')).toHaveText('Da, după etapa 6.');
  await expect(page.locator('[data-filtru-sug="acceptata"]')).toHaveText('Acceptată: de făcut (1)');
  await page.locator('[data-filtru-sug="noua"]').click();
  await expect(page.locator('[data-sugestie]')).toHaveCount(1);
  await expect(page.locator('[data-sugestie="Centrează pe foaie"]')).toBeVisible();
  await page.locator('[data-filtru-sug="toate"]').click();
  mkdirSync('.tmp', { recursive: true });
  await page.screenshot({ path: '.tmp/sugestii.png', fullPage: true });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: '.tmp/sugestii-intunecat.png', fullPage: true });
  await page.emulateMedia({ colorScheme: 'light' });
  await iesi(page);

  // Omul vede decizia și nota; nu-și mai editează sugestia.
  await intraCuParola(page, 'ana@exemplu.ro', 'parola-anei-1');
  const a = page.locator('[data-sugestie="Grila magnetică"]');
  await expect(a.locator('[data-sug="stare"]')).toHaveText('Acceptată: de făcut', LENT);
  await expect(a.locator('[data-sug="nota-owner"]')).toHaveText('Da, după etapa 6.');
  await expect(a.locator('[data-sug="editeaza"]')).toHaveCount(0);
  await page.screenshot({ path: '.tmp/sugestii-autor.png', fullPage: true });
  expect(erori).toEqual([]);
});

test('decizia pe o sugestie schimbată între timp e refuzată lângă formular; un rol care doar citește vede lista fără formulare', async ({ page }) => {
  const sugestie = (titlu: string, versiune: number) => ({
    schema: 1, titlu, descriere: '', tip: 'problema', zona: 'fisiere', autor: 'ion', autorEmail: 'ion@exemplu.ro',
    creataLa: new Date('2026-10-29T10:00:00Z'), modificataLa: new Date('2026-10-29T10:00:00Z'), stare: 'noua', nota: '',
    decisaDe: null, decisaLa: null, versiune,
  });
  await scrie(`sugestii/${SUG}`, sugestie('Exportul DXF R12', 1));
  await scrie(`roluri/${CITESTE}`, { nume: 'Citește sugestiile', permisiuni: ['sugestii.citeste'] });
  await intraCaOwner(page);
  await page.locator('[data-fila="sugestii"]').click();
  const s = page.locator(`[data-sugestie="Exportul DXF R12"]`);
  await s.locator('[data-sug="decide"]').click();
  await s.locator('[data-sug="stare-aleasa"]').selectOption({ label: 'Respinsă' });
  // Cât formularul e deschis, autorul își schimbă sugestia (versiunea 2).
  await scrie(`sugestii/${SUG}`, sugestie('Exportul DXF R12 și R14', 2));
  await s.locator('[data-sug="salveaza-decizia"]').click();
  await expect(s.locator('[data-sug="eroare"]')).toContainText('s-a schimbat', LENT);
  expect(await stare(`sugestii/${SUG}`)).toBe('noua');
  // Reîncărcată, varianta nouă se vede, iar formularul deschis pe cea veche s-a închis; redeschis, se poate decide.
  await page.locator('[data-sug="reincarca"]').click();
  const n = page.locator('[data-sugestie="Exportul DXF R12 și R14"]');
  await expect(n).toBeVisible();
  await expect(n.locator('[data-sug="formular-decizie"]')).toHaveCount(0);
  await n.locator('[data-sug="decide"]').click();
  await expect(n.locator('[data-sug="eroare"]')).toHaveCount(0);
  await n.locator('[data-sug="stare-aleasa"]').selectOption({ label: 'Amânată: mai târziu' });
  await n.locator('[data-sug="salveaza-decizia"]').click();
  await expect(n.locator('[data-sug="stare"]')).toHaveText('Amânată: mai târziu', LENT);
  expect(await stare(`sugestii/${SUG}`)).toBe('amanata');
  await iesi(page);

  // Un rol cu „Sugestii: citește toate” și atât: fila, lista cu decizia, fără formularul nou, fără Decide / Editează.
  await puneRolul(page, await intraCuGoogle(page), CITESTE);
  await expect(page.locator('[data-admin="cont"]')).toContainText('Citește sugestiile');
  expect(await file(page)).toEqual(['sugestii', 'cont']);
  await expect(page.locator('[data-sug="doar-citire"]')).toBeVisible();
  await expect(page.locator('[data-sug="formular"]')).toHaveCount(0);
  await expect(page.locator('[data-sugestie="Exportul DXF R12 și R14"] [data-sug="stare"]')).toHaveText('Amânată: mai târziu');
  await expect(page.locator('[data-sug="decide"], [data-sug="editeaza"], [data-sug="ale-mele"]')).toHaveCount(0);
});

/** Mărimea reală a unei imagini din pagină (0 = n-a venit). */
const latimeImagine = (p: Page, sel: string): Promise<number> => p.locator(sel).evaluate((im) => (im as HTMLImageElement).naturalWidth);

test('din editor (ADR 0111): „Sugestie” face poza planșei și deschide fila Sugestii cu poza atașată; trimisă, se vede pe rând; scoasă, nu revine', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  // Fila nouă din editor citește și ea configurația instanței (locală, cu emulatoarele).
  await page.context().route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  const [admin] = await Promise.all([page.context().waitForEvent('page'), page.locator('[data-editare="sugestie"]').click()]);
  admin.on('pageerror', (e) => { erori.push(e.message); });
  await admin.waitForLoadState();
  expect(new URL(admin.url()).pathname + new URL(admin.url()).hash).toBe('/admin#sugestii');
  await expect(page.locator('[data-testid="sugestie-stare"]')).toHaveCount(0);

  // Owner-ul intră în fila nouă: fila Sugestii, cu poza planșei în formular.
  await puneRolul(admin, await intraCuGoogle(admin), 'owner');
  await expect(admin.locator('[data-fila="sugestii"]')).toHaveAttribute('aria-selected', 'true', LENT);
  const nou = admin.locator('[data-sug="formular"]');
  await expect(nou.locator('[data-sug="poza-atasata"] img')).toBeVisible(LENT);
  await expect.poll(() => latimeImagine(admin, '[data-sug="poza-atasata"] img')).toBeGreaterThan(0);
  await nou.locator('[data-sug="titlu"]').fill('Grila se vede rău');
  await nou.locator('[data-sug="tip"]').selectOption({ label: 'Problemă' });
  await nou.locator('[data-sug="trimite"]').click();
  await expect(admin.locator('[data-sug="gata"]')).toContainText('Grila se vede rău', LENT);
  await expect(nou.locator('[data-sug="poza-atasata"]')).toHaveCount(0);
  // Pe server: poza în documentul ei, JPEG sub plafon; pe rând, la cerere.
  const lista = await (await fetch(`${FS}/sugestii`, { headers: { Authorization: 'Bearer owner' } })).json() as { documents: Array<{ name: string }> };
  const id = (lista.documents[0]?.name ?? '').split('/').pop() ?? '';
  const p = await (await fetch(`${FS}/sugestii/${id}/poze/plansa`, { headers: { Authorization: 'Bearer owner' } })).json() as { fields: { tip: { stringValue: string }; marime: { integerValue: string } } };
  expect(p.fields.tip.stringValue).toBe('image/jpeg');
  expect(Number(p.fields.marime.integerValue)).toBeGreaterThan(1000);
  expect(Number(p.fields.marime.integerValue)).toBeLessThanOrEqual(400 * 1024);
  const rand = admin.locator('[data-sugestie="Grila se vede rău"]');
  await rand.locator('[data-sug="arata-poza"]').click();
  await expect(rand.locator('[data-sug="poza"]')).toBeVisible(LENT);
  await expect.poll(() => latimeImagine(admin, '[data-sugestie="Grila se vede rău"] [data-sug="poza"]')).toBeGreaterThan(0);

  // O poză nouă din editor: fila deja deschisă o primește pe canal (editorul mai deschide una, închisă aici); scoasă, nu mai
  // revine, nici după reîncărcare.
  const [a2] = await Promise.all([page.context().waitForEvent('page'), page.locator('[data-editare="sugestie"]').click()]);
  await a2.close();
  await expect(nou.locator('[data-sug="poza-atasata"]')).toBeVisible(LENT);
  await nou.locator('[data-sug="scoate-poza"]').click();
  await expect(nou.locator('[data-sug="poza-atasata"]')).toHaveCount(0);
  await admin.reload();
  await expect(admin.locator('[data-sug="formular"]')).toBeVisible(LENT);
  await expect(admin.locator('[data-sug="poza-atasata"]')).toHaveCount(0);
  expect(erori).toEqual([]);
});
