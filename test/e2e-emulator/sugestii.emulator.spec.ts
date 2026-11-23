import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { adauga, deschideMeniulContului } from '../e2e/ajutor-panza.ts';

/**
 * Sugestiile personalului (ADR 0107; tabla: ADR 0260 §4) cap-coadă, pe emulatoare, pe build-ul real: owner-ul face un rol cu
 * „Sugestii: scrie” și un cont cu parolă; omul intră, vede doar fila Sugestii (și Cont), scrie o sugestie („Sugestie nouă”)
 * și o editează din detaliu; owner-ul o vede pe tablă, cu adresa omului, și decide cu o notă; omul vede decizia, fără
 * „Editează”. Apoi: decizia pe o sugestie schimbată între timp e refuzată lângă formular, iar un rol care doar citește vede
 * tabla fără formulare și fără mutări. Tabla: tragerea, nota cerută la Respinsă și Amânată, „Mută în…” din tastatură, fără
 * recitirea listei; o mutare refuzată revine. Capturile filei se scriu în `.tmp/`, nu în git.
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
/** Primul apel al unui callable după pornirea emulatorului de funcții trece de 5 s; sub încărcare, și de 30 s (A.3). */
const LENT = { timeout: 60_000 };
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

type Camp = { stringValue?: string; integerValue?: string };
async function citeste(cale: string): Promise<Record<string, Camp | undefined>> {
  const r = await fetch(`${FS}/${cale}`, { headers: { Authorization: 'Bearer owner' } });
  return ((await r.json()) as { fields?: Record<string, Camp> }).fields ?? {};
}

async function stare(cale: string): Promise<string | undefined> {
  return (await citeste(cale))['stare']?.stringValue;
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
  await expect(page.locator('[data-fila="personal"]')).toBeVisible(LENT);
}

async function intraCuParola(page: Page, email: string, parola: string): Promise<void> {
  await page.locator('[data-admin="email"]').fill(email);
  await page.locator('[data-admin="parola"]').fill(parola);
  await page.locator('[data-admin="intra-parola"]').click();
}

async function iesi(page: Page): Promise<void> {
  // Ieșirea stă în meniul contului (ADR 0260).
  await page.locator('[data-admin="meniu-cont"]').click();
  await page.locator('[data-admin="iesi"]').click();
  await expect(page.locator('[data-admin="intra"]')).toBeVisible();
}

const file = async (page: Page): Promise<string[]> => page.locator('[data-fila]').evaluateAll((b) => b.map((x) => x.getAttribute('data-fila') ?? ''));
const coloana = (page: Page, st: string) => page.locator(`[data-coloana="${st}"]`);
/** Cardul, în coloana (sau banda) unei stări. */
const card = (page: Page, st: string, titlu: string) => coloana(page, st).locator(`[data-sugestie="${titlu}"]`);
const detaliu = (page: Page) => page.locator('[data-sug="detaliu"]');

/** O sugestie pusă direct în bază (fără decizie, versiunea 1, dacă nu se spune altfel). */
const sugestie = (titlu: string, d: Record<string, unknown> = {}) => ({
  schema: 1, titlu, descriere: '', tip: 'problema', zona: 'fisiere', autor: 'ion', autorEmail: 'ion@exemplu.ro',
  creataLa: new Date('2026-10-29T10:00:00Z'), modificataLa: new Date('2026-10-29T10:00:00Z'), stare: 'noua', nota: '',
  decisaDe: null, decisaLa: null, versiune: 1, ...d,
});

test('omul scrie și își editează sugestia; owner-ul o vede pe tablă și decide cu o notă; omul vede decizia', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await intraCaOwner(page);
  await page.locator('[data-fila="personal"]').click();
  // Rolul: doar „Sugestii: scrie”, bifat din catalog.
  await page.locator('[data-personal="rol-nou-buton"]').click();
  await page.locator('[data-personal="nume-rol"]').fill('Sugestii');
  await page.locator('[data-permisiune="sugestii.scrie"]').check();
  await page.locator('[data-personal="salveaza-rol"]').click();
  await expect(page.locator('[data-celula="Sugestii/sugestii.scrie"]')).toHaveAttribute('data-are', 'true', LENT);
  // Contul omului, cu parolă (linkul, apoi pagina Firebase a linkului, aici prin API-ul emulatorului).
  await page.locator('[data-personal="adauga"]').click();
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
  // Owner-ul are tot catalogul: scrie și el una, din „Sugestie nouă”.
  await page.locator('[data-fila="sugestii"]').click();
  await expect(page.locator('[data-sug="gol"]')).toBeVisible();
  const nou = page.locator('[data-sug="formular"]');
  await expect(nou).toHaveCount(0);
  await page.locator('[data-sug="noua"]').click();
  await nou.locator('[data-sug="titlu"]').fill('Centrează pe foaie');
  await nou.locator('[data-sug="tip"]').selectOption({ label: 'Idee' });
  await nou.locator('[data-sug="trimite"]').click();
  await expect(page.locator('[data-sug="gata"]')).toContainText('Centrează pe foaie', LENT);
  await expect(nou).toHaveCount(0);
  await expect(page.locator('[data-sug="noua"]')).toBeFocused();
  await iesi(page);

  // Omul: doar filele rolului; fără tip ales, nimic nu pleacă; trimite, apoi își vede doar sugestia lui, în „Fără decizie”.
  await intraCuParola(page, 'ana@exemplu.ro', 'parola-anei-1');
  await expect(page.locator('[data-admin="cont"]')).toContainText('ana@exemplu.ro · Sugestii');
  expect(await file(page)).toEqual(['sugestii', 'cont']);
  await expect(page.locator('[data-sug="gol"]')).toBeVisible(LENT);
  await page.locator('[data-sug="noua"]').click();
  await nou.locator('[data-sug="titlu"]').fill('Grila magnetică la desen');
  await nou.locator('[data-sug="descriere"]').fill('Când trag o formă,\nsă se lipească de grilă.');
  await expect(nou.locator('[data-sug="trimite"]')).toBeDisabled();
  await nou.locator('[data-sug="tip"]').selectOption({ label: 'Îmbunătățire' });
  await nou.locator('[data-sug="zona"]').selectOption({ label: 'Desen și editare' });
  await nou.locator('[data-sug="trimite"]').click();
  await expect(page.locator('[data-sug="gata"]')).toContainText('Sugestia „Grila magnetică la desen” a ajuns la owner.', LENT);
  // Redeschis, formularul e gol.
  await page.locator('[data-sug="noua"]').click();
  await expect(nou.locator('[data-sug="titlu"]')).toHaveValue('');
  await nou.getByRole('button', { name: 'Renunță' }).click();
  await expect(nou).toHaveCount(0);
  const prima = card(page, 'noua', 'Grila magnetică la desen');
  await expect(prima.locator('.admin-cip')).toHaveText('Îmbunătățire');
  await expect(prima.locator('.sug-card-cine')).toHaveText('tu');
  await expect(page.locator('[data-sugestie]')).toHaveCount(1);
  await expect(page.locator('[data-sug="muta"]')).toHaveCount(0);
  // Detaliul: textul, tipul și zona; editarea, cât n-are decizie.
  await prima.locator('[data-sug="deschide"]').click();
  await expect(detaliu(page).locator('[data-sug="stare"]')).toHaveText('Fără decizie');
  await expect(detaliu(page).locator('[data-sug="meta"]')).toContainText('Îmbunătățire · Desen și editare · tu ·');
  await expect(detaliu(page).locator('[data-sug="descriere-text"]')).toHaveText('Când trag o formă,\nsă se lipească de grilă.');
  await detaliu(page).locator('[data-sug="editeaza"]').click();
  await detaliu(page).locator('[data-sug="formular-editare"] [data-sug="titlu"]').fill('Grila magnetică');
  await detaliu(page).locator('[data-sug="formular-editare"] [data-sug="trimite"]').click();
  await expect(detaliu(page).locator('[data-sug="gata-detaliu"]')).toHaveText('Sugestia „Grila magnetică” e salvată.', LENT);
  await expect(detaliu(page).locator('h2')).toHaveText('Grila magnetică');
  await expect(detaliu(page).locator('[data-sug="meta"]')).toContainText('editată');
  // Esc închide detaliul; focusul revine pe card.
  await page.keyboard.press('Escape');
  await expect(detaliu(page)).toHaveCount(0);
  await expect(card(page, 'noua', 'Grila magnetică').locator('[data-sug="deschide"]')).toBeFocused();
  await iesi(page);

  // Owner-ul (alt cont owner, pus din consolă): toate sugestiile pe tablă, cu adresa omului; decide cu o notă, din detaliu.
  await intraCaOwner(page);
  await page.locator('[data-fila="sugestii"]').click();
  await expect(page.locator('[data-sugestie]')).toHaveCount(2, LENT);
  await expect(coloana(page, 'noua').locator('[data-sug="numar"]')).toHaveText('2');
  const s = card(page, 'noua', 'Grila magnetică');
  await expect(s).toContainText('ana@exemplu.ro');
  await s.locator('[data-sug="deschide"]').click();
  await expect(detaliu(page).locator('[data-sug="editeaza"]')).toHaveCount(0);
  await detaliu(page).locator('[data-sug="decide"]').click();
  await detaliu(page).locator('[data-sug="stare-aleasa"]').selectOption({ label: 'Acceptată: de făcut' });
  await expect(detaliu(page).locator('[data-sug="nota-ceruta"]')).toHaveCount(0);
  await detaliu(page).locator('[data-sug="nota"]').fill('Da, după etapa 6.');
  await detaliu(page).locator('[data-sug="salveaza-decizia"]').click();
  await expect(detaliu(page).locator('[data-sug="gata-detaliu"]')).toHaveText('„Grila magnetică”: Acceptată: de făcut.', LENT);
  await expect(detaliu(page).locator('[data-sug="stare"]')).toHaveText('Acceptată: de făcut');
  await expect(detaliu(page).locator('[data-sug="nota-owner"]')).toHaveText('Da, după etapa 6.');
  await detaliu(page).locator('[data-sug="inchide"]').click();
  await expect(card(page, 'acceptata', 'Grila magnetică')).toBeVisible();
  await expect(coloana(page, 'acceptata').locator('[data-sug="numar"]')).toHaveText('1');
  await expect(coloana(page, 'noua').locator('[data-sug="numar"]')).toHaveText('1');
  // „Ale mele” / „Toate”: owner-ul de acum (alt cont decât primul) n-a scris niciuna.
  await page.locator('[data-sug="ale-mele"]').click();
  await expect(page.locator('[data-sug="ale-mele"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-sugestie]')).toHaveCount(0);
  await expect(page.locator('[data-sug="gol-filtru"]')).toBeVisible();
  await page.locator('[data-sug="toate"]').click();
  await expect(page.locator('[data-sugestie]')).toHaveCount(2);
  mkdirSync('.tmp', { recursive: true });
  await page.screenshot({ path: '.tmp/sugestii.png', fullPage: true });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: '.tmp/sugestii-intunecat.png', fullPage: true });
  await page.emulateMedia({ colorScheme: 'light' });
  await iesi(page);

  // Omul vede decizia și nota; nu-și mai editează sugestia.
  await intraCuParola(page, 'ana@exemplu.ro', 'parola-anei-1');
  const a = card(page, 'acceptata', 'Grila magnetică');
  await expect(a).toBeVisible(LENT);
  await a.locator('[data-sug="deschide"]').click();
  await expect(detaliu(page).locator('[data-sug="stare"]')).toHaveText('Acceptată: de făcut');
  await expect(detaliu(page).locator('[data-sug="nota-owner"]')).toHaveText('Da, după etapa 6.');
  await expect(detaliu(page).locator('[data-sug="editeaza"], [data-sug="decide"]')).toHaveCount(0);
  await page.screenshot({ path: '.tmp/sugestii-autor.png', fullPage: true });
  expect(erori).toEqual([]);
});

test('decizia pe o sugestie schimbată între timp e refuzată lângă formular; un rol care doar citește vede tabla fără formulare', async ({ page }) => {
  await scrie(`sugestii/${SUG}`, sugestie('Exportul DXF R12'));
  await scrie(`roluri/${CITESTE}`, { nume: 'Citește sugestiile', permisiuni: ['sugestii.citeste'] });
  await intraCaOwner(page);
  await page.locator('[data-fila="sugestii"]').click();
  await card(page, 'noua', 'Exportul DXF R12').locator('[data-sug="deschide"]').click();
  await detaliu(page).locator('[data-sug="decide"]').click();
  await detaliu(page).locator('[data-sug="stare-aleasa"]').selectOption({ label: 'Respinsă' });
  // La Respinsă, fără notă (sau doar cu spații), decizia nu pleacă.
  await expect(detaliu(page).locator('[data-sug="nota-ceruta"]')).toBeVisible();
  await expect(detaliu(page).locator('[data-sug="salveaza-decizia"]')).toBeDisabled();
  await detaliu(page).locator('[data-sug="nota"]').fill('   ');
  await expect(detaliu(page).locator('[data-sug="salveaza-decizia"]')).toBeDisabled();
  await detaliu(page).locator('[data-sug="nota"]').fill('Nu acum.');
  // Cât formularul e deschis, autorul își schimbă sugestia (versiunea 2).
  await scrie(`sugestii/${SUG}`, sugestie('Exportul DXF R12 și R14', { versiune: 2 }));
  await detaliu(page).locator('[data-sug="salveaza-decizia"]').click();
  await expect(detaliu(page).locator('[data-sug="eroare"]')).toContainText('s-a schimbat', LENT);
  expect(await stare(`sugestii/${SUG}`)).toBe('noua');
  await expect(card(page, 'noua', 'Exportul DXF R12')).toBeVisible();
  await detaliu(page).locator('[data-sug="inchide"]').click();
  // Închis detaliul, motivul nu mai rămâne pe card.
  await expect(card(page, 'noua', 'Exportul DXF R12').locator('[data-sug="eroare"]')).toHaveCount(0);
  // Reîncărcată, varianta nouă se vede; detaliul se deschide fără formular; decizia pleacă pe versiunea nouă.
  await page.locator('[data-sug="reincarca"]').click();
  const n = card(page, 'noua', 'Exportul DXF R12 și R14');
  await expect(n).toBeVisible(LENT);
  await expect(n.locator('[data-sug="eroare"]')).toHaveCount(0);
  await n.locator('[data-sug="deschide"]').click();
  await expect(detaliu(page).locator('[data-sug="formular-decizie"]')).toHaveCount(0);
  await detaliu(page).locator('[data-sug="decide"]').click();
  await expect(detaliu(page).locator('[data-sug="eroare"]')).toHaveCount(0);
  await detaliu(page).locator('[data-sug="stare-aleasa"]').selectOption({ label: 'Amânată: mai târziu' });
  await expect(detaliu(page).locator('[data-sug="salveaza-decizia"]')).toBeDisabled();
  await detaliu(page).locator('[data-sug="nota"]').fill('După etapa 6.');
  await detaliu(page).locator('[data-sug="salveaza-decizia"]').click();
  await expect(detaliu(page).locator('[data-sug="stare"]')).toHaveText('Amânată: mai târziu', LENT);
  expect(await stare(`sugestii/${SUG}`)).toBe('amanata');
  await page.keyboard.press('Escape');
  await expect(card(page, 'amanata', 'Exportul DXF R12 și R14')).toBeVisible();
  await iesi(page);

  // Un rol cu „Sugestii: citește toate” și atât: tabla cu decizia, fără „Sugestie nouă”, fără mutări, fără Decide / Editează.
  await puneRolul(page, await intraCuGoogle(page), CITESTE);
  await expect(page.locator('[data-admin="cont"]')).toContainText('Citește sugestiile');
  // Cine citește toate sugestiile are și cifra lor în fila Azi (ADR 0260), deschisă întâi.
  expect(await file(page)).toEqual(['azi', 'sugestii', 'cont']);
  await page.locator('[data-fila="sugestii"]').click();
  await expect(page.locator('[data-sug="doar-citire"]')).toBeVisible();
  await expect(card(page, 'amanata', 'Exportul DXF R12 și R14')).toBeVisible(LENT);
  await expect(page.locator('[data-sug="noua"], [data-sug="formular"], [data-sug="ale-mele"], [data-sug="muta"]')).toHaveCount(0);
  await expect(page.locator('[draggable="true"]')).toHaveCount(0);
  await card(page, 'amanata', 'Exportul DXF R12 și R14').locator('[data-sug="deschide"]').click();
  await expect(detaliu(page).locator('[data-sug="nota-owner"]')).toHaveText('După etapa 6.');
  await expect(detaliu(page).locator('[data-sug="decide"], [data-sug="editeaza"]')).toHaveCount(0);
});

test('tabla: tragerea, nota cerută la Respinsă și Amânată, „Mută în…” din tastatură; mutările nu recitesc lista', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  const A = 'SA000000000000000001';
  const B = 'SB000000000000000002';
  const C = 'SC000000000000000003';
  await scrie(`sugestii/${A}`, sugestie('Exportul DXF R12', { creataLa: new Date('2026-10-29T12:00:00Z') }));
  await scrie(`sugestii/${B}`, sugestie('Tema roz', { creataLa: new Date('2026-10-29T11:00:00Z') }));
  await scrie(`sugestii/${C}`, sugestie('Undo după export', { creataLa: new Date('2026-10-29T10:00:00Z'), autorEmail: 'o.adresa.foarte.lunga.de.email@exemplu-firma.ro' }));
  await intraCaOwner(page);
  await page.locator('[data-fila="sugestii"]').click();
  await expect(coloana(page, 'noua').locator('[data-sugestie]')).toHaveCount(3, LENT);
  // O adresă mai lungă decât cardul se taie în el (nu-l lățește, nu iese din el), iar nimic nu iese din ecran în dreapta.
  const adresaInCard = async (st: string): Promise<void> => {
    const c = card(page, st, 'Undo după export');
    const cutie = await c.boundingBox();
    const adresa = await c.locator('.sug-card-cine').boundingBox();
    if (!cutie || !adresa) throw new Error('cardul cu adresa lungă nu e pe pagină');
    expect(adresa.x + adresa.width, 'adresa stă în card').toBeLessThanOrEqual(cutie.x + cutie.width + 0.5);
    // Proba spune ceva doar cât cardul e mai îngust decât adresa: tăiată, e mai scurtă decât textul ei.
    expect(adresa.width, 'cardul e mai îngust decât adresa').toBeLessThan(await c.locator('.sug-card-cine').evaluate((e) => e.scrollWidth));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'pagina nu se lățește').toBe(true);
  };
  // Cu cinci coloane, cardul e cel mai îngust.
  await adresaInCard('noua');
  // De aici, nicio citire a listei (`:runQuery`) și nicio sugestie citită (`batchGet`): mutările țin decizia din răspuns.
  // Doar citirile sugestiilor (colecția e în corpul cererii): rezumatul de la intrare (Diagnoza din bară: marcajele, apoi
  // amprenta publicării) poate fi încă pe drum când lista a sosit.
  const citiri: string[] = [];
  page.on('request', (q) => {
    const u = new URL(q.url());
    const corp = q.postData() ?? '';
    if ((u.pathname.endsWith('/documents:runQuery') || u.pathname.endsWith('/documents:batchGet')) && corp.includes('sugestii')) citiri.push(`${u.pathname} ${corp}`);
  });

  // Fără notă cerută: tragerea în Acceptată pleacă pe loc. Cât cererea e în drum (ținută aici), cardul stă deja în coloana
  // nouă, marcat, și nimic altceva nu se mută.
  let elibereaza = (): void => {};
  const oprit = new Promise<void>((ok) => { elibereaza = ok; });
  const callable = (u: URL): boolean => u.port === '5005' && u.pathname.endsWith('/sugestii');
  let tinute = 0;
  await page.route(callable, async (q) => { tinute += 1; await oprit; await q.continue(); });
  // Tabla nu sare cât cererea e în drum, nici la răspuns: niciun mesaj nu se pune deasupra ei.
  const sus = async (): Promise<number> => (await page.locator('[data-sug="tabla"]').boundingBox())?.y ?? -1;
  const y0 = await sus();
  await card(page, 'noua', 'Exportul DXF R12').dragTo(coloana(page, 'acceptata'));
  await expect(card(page, 'acceptata', 'Exportul DXF R12')).toHaveAttribute('aria-busy', 'true');
  await expect(coloana(page, 'noua').locator('[data-sugestie="Exportul DXF R12"]')).toHaveCount(0);
  await expect.poll(() => tinute, { message: 'cererea e ținută' }).toBe(1);
  await expect(page.locator('[draggable="true"]')).toHaveCount(0);
  await expect(card(page, 'noua', 'Tema roz').locator('[data-sug="muta"]')).toBeDisabled();
  expect(await sus()).toBe(y0);
  elibereaza();
  await page.unroute(callable);
  await expect(card(page, 'acceptata', 'Exportul DXF R12')).not.toHaveAttribute('aria-busy', 'true', LENT);
  // Decizia se anunță pentru cititorul de ecran; la vedere, o spune cardul mutat.
  await expect(page.locator('[data-sug="anunt"]')).toHaveText('„Exportul DXF R12”: Acceptată: de făcut.');
  await expect(page.locator('[data-sug="gata"]')).toHaveCount(0);
  expect(await sus()).toBe(y0);
  const a1 = await citeste(`sugestii/${A}`);
  expect([a1['stare']?.stringValue, a1['nota']?.stringValue, a1['versiune']?.integerValue]).toEqual(['acceptata', '', '2']);
  expect(citiri, 'prima mutare n-a recitit nimic').toEqual([]);
  await expect(coloana(page, 'noua').locator('[data-sug="numar"]')).toHaveText('2');
  await expect(coloana(page, 'acceptata').locator('[data-sug="numar"]')).toHaveText('1');

  // Respinsă: banda strânsă (fără respinse încă) primește cardul, lăsat chiar peste butonul ei oprit; fereastra cere nota;
  // spațiile nu sunt o notă.
  await expect(page.locator('[data-sug="respinse"]')).toBeDisabled();
  const banda = await coloana(page, 'respinsa').boundingBox();
  const butonBanda = await page.locator('[data-sug="respinse"]').boundingBox();
  if (!banda || !butonBanda) throw new Error('banda Respinselor nu e pe pagină');
  await card(page, 'noua', 'Tema roz').dragTo(coloana(page, 'respinsa'), {
    targetPosition: { x: butonBanda.x - banda.x + butonBanda.width / 2, y: butonBanda.y - banda.y + butonBanda.height / 2 },
  });
  const fereastra = page.locator('[data-sug="cere-nota"]');
  await expect(fereastra).toBeVisible();
  await expect(fereastra.locator('h2')).toHaveText('Mută „Tema roz” în Respinsă');
  await expect(fereastra.locator('[data-sug="nota-mutarii"]')).toBeFocused();
  await expect(fereastra.locator('[data-sug="muta-cu-nota"]')).toBeDisabled();
  await fereastra.locator('[data-sug="nota-mutarii"]').fill('  \n ');
  await expect(fereastra.locator('[data-sug="muta-cu-nota"]')).toBeDisabled();
  await fereastra.locator('[data-sug="nota-mutarii"]').fill('Rămânem la cele două teme.');
  await fereastra.locator('[data-sug="muta-cu-nota"]').click();
  await expect(fereastra).toHaveCount(0);
  await expect(page.locator('[data-sug="respinse"]')).toHaveText('Respinse (1)');
  await expect(page.locator('[data-sug="respinse"]')).toHaveAttribute('aria-expanded', 'true');
  await expect(card(page, 'respinsa', 'Tema roz')).not.toHaveAttribute('aria-busy', 'true', LENT);
  const b1 = await citeste(`sugestii/${B}`);
  expect([b1['stare']?.stringValue, b1['nota']?.stringValue]).toEqual(['respinsa', 'Rămânem la cele două teme.']);

  // Renunțarea (butonul, apoi Esc) lasă cardul unde era, fără nicio cerere.
  await card(page, 'noua', 'Undo după export').dragTo(coloana(page, 'amanata'));
  await fereastra.locator('[data-sug="renunta-nota"]').click();
  await expect(fereastra).toHaveCount(0);
  await card(page, 'noua', 'Undo după export').dragTo(coloana(page, 'amanata'));
  await expect(fereastra).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(fereastra).toHaveCount(0);
  await expect(card(page, 'noua', 'Undo după export')).toBeVisible();
  expect(await stare(`sugestii/${C}`)).toBe('noua');

  // Din tastatură: „Mută în…”, săgețile, Enter; nota în fereastră, Enter; focusul rămâne pe card, în coloana nouă.
  await card(page, 'noua', 'Undo după export').locator('[data-sug="muta"]').focus();
  await page.keyboard.press('Enter');
  const meniu = card(page, 'noua', 'Undo după export').getByRole('menu');
  await expect(meniu.getByRole('menuitem')).toHaveText(['Acceptată: de făcut', 'În lucru', 'Amânată: mai târziu…', 'Făcută', 'Respinsă…']);
  await expect(meniu.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(meniu.locator('[data-muta-in="respinsa"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(meniu.locator('[data-muta-in="acceptata"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(meniu.locator('[data-muta-in="amanata"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(fereastra).toBeVisible();
  await page.keyboard.type('După etapa 6.');
  await page.keyboard.press('Tab');
  await expect(fereastra.locator('[data-sug="muta-cu-nota"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(card(page, 'amanata', 'Undo după export')).not.toHaveAttribute('aria-busy', 'true', LENT);
  await expect(card(page, 'amanata', 'Undo după export').locator('[data-sug="deschide"]')).toBeFocused();
  expect(await stare(`sugestii/${C}`)).toBe('amanata');
  // Esc închide meniul și întoarce focusul pe buton.
  const muta = card(page, 'amanata', 'Undo după export').locator('[data-sug="muta"]');
  await muta.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(muta).toBeFocused();
  // Nota pornește de la cea de acum a cardului.
  await card(page, 'amanata', 'Undo după export').dragTo(coloana(page, 'respinsa'));
  await expect(fereastra.locator('[data-sug="nota-mutarii"]')).toHaveValue('După etapa 6.');
  await fereastra.locator('[data-sug="renunta-nota"]').click();
  await expect(fereastra).toHaveCount(0);

  // A doua mutare a aceluiași card pleacă pe versiunea întoarsă de prima (fără „Reîncarcă”), iar detaliul arată nota ținută.
  await card(page, 'acceptata', 'Exportul DXF R12').dragTo(coloana(page, 'in-lucru'));
  await expect(card(page, 'in-lucru', 'Exportul DXF R12')).not.toHaveAttribute('aria-busy', 'true', LENT);
  const a2 = await citeste(`sugestii/${A}`);
  expect([a2['stare']?.stringValue, a2['versiune']?.integerValue]).toEqual(['in-lucru', '3']);
  await card(page, 'amanata', 'Undo după export').locator('[data-sug="deschide"]').click();
  await expect(detaliu(page).locator('[data-sug="nota-owner"]')).toHaveText('După etapa 6.');
  await expect(detaliu(page).locator('[data-sug="stare"]')).toHaveText('Amânată: mai târziu');
  await page.keyboard.press('Escape');
  expect(citiri).toEqual([]);

  // Sub 1 100 px, coloanele trec pe rânduri: la 700 px, câte două, cu Amânată în a doua (un card lățit acolo ar ieși din ecran).
  await page.setViewportSize({ width: 700, height: 900 });
  await adresaInCard('amanata');
  expect(erori).toEqual([]);
});

test('tabla: o mutare refuzată (sugestia schimbată între timp) revine în coloana ei, cu motivul pe card', async ({ page }) => {
  await scrie(`sugestii/${SUG}`, sugestie('Exportul DXF R12'));
  await intraCaOwner(page);
  await page.locator('[data-fila="sugestii"]').click();
  await expect(card(page, 'noua', 'Exportul DXF R12')).toBeVisible(LENT);
  await scrie(`sugestii/${SUG}`, sugestie('Exportul DXF R12', { descriere: 'Și R14.', versiune: 2 }));
  await card(page, 'noua', 'Exportul DXF R12').dragTo(coloana(page, 'acceptata'));
  await expect(card(page, 'noua', 'Exportul DXF R12').locator('[data-sug="eroare"]')).toContainText('s-a schimbat', LENT);
  await expect(coloana(page, 'acceptata').locator('[data-sugestie]')).toHaveCount(0);
  expect(await stare(`sugestii/${SUG}`)).toBe('noua');
  // Reîncărcată, mutarea pleacă pe versiunea nouă.
  await page.locator('[data-sug="reincarca"]').click();
  await expect(card(page, 'noua', 'Exportul DXF R12').locator('[data-sug="eroare"]')).toHaveCount(0, LENT);
  await card(page, 'noua', 'Exportul DXF R12').dragTo(coloana(page, 'acceptata'));
  await expect(card(page, 'acceptata', 'Exportul DXF R12')).not.toHaveAttribute('aria-busy', 'true', LENT);
  expect(await stare(`sugestii/${SUG}`)).toBe('acceptata');
});

/** Mărimea reală a unei imagini din pagină (0 = n-a venit). */
const latimeImagine = (p: Page, sel: string): Promise<number> => p.locator(sel).evaluate((im) => (im as HTMLImageElement).naturalWidth);

test('din editor (ADR 0111): „Sugestie” face poza planșei și deschide fila Sugestii cu formularul și poza; trimisă, se vede în detaliu; scoasă, nu revine', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  // Fila nouă din editor citește și ea configurația instanței (locală, cu emulatoarele).
  await page.context().route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  // Sugestia, din meniul contului (ADR 0120): fila se deschide chiar în clicul pe rând.
  const meniu = await deschideMeniulContului(page);
  const [admin] = await Promise.all([page.context().waitForEvent('page'), meniu.locator('[data-meniu-cont="sugestie"]').click()]);
  admin.on('pageerror', (e) => { erori.push(e.message); });
  await admin.waitForLoadState();
  expect(new URL(admin.url()).pathname + new URL(admin.url()).hash).toBe('/admin#sugestii');
  await expect(page.locator('[data-testid="sugestie-stare"]')).toHaveCount(0);

  // Owner-ul intră în fila nouă: fila Sugestii, cu formularul nou deschis singur și poza planșei în el.
  await puneRolul(admin, await intraCuGoogle(admin), 'owner');
  await expect(admin.locator('[data-fila="sugestii"]')).toHaveAttribute('aria-current', 'page', LENT);
  const nou = admin.locator('[data-sug="formular"]');
  await expect(nou.locator('[data-sug="poza-atasata"] img')).toBeVisible(LENT);
  await expect(admin.locator('[data-sug="noua"]')).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => latimeImagine(admin, '[data-sug="poza-atasata"] img')).toBeGreaterThan(0);
  await nou.locator('[data-sug="titlu"]').fill('Grila se vede rău');
  await nou.locator('[data-sug="tip"]').selectOption({ label: 'Problemă' });
  await nou.locator('[data-sug="trimite"]').click();
  await expect(admin.locator('[data-sug="gata"]')).toContainText('Grila se vede rău', LENT);
  await expect(nou).toHaveCount(0);
  // Pe server: poza în documentul ei, JPEG sub plafon; în detaliu, la cerere.
  const lista = await (await fetch(`${FS}/sugestii`, { headers: { Authorization: 'Bearer owner' } })).json() as { documents: Array<{ name: string }> };
  const id = (lista.documents[0]?.name ?? '').split('/').pop() ?? '';
  const p = await (await fetch(`${FS}/sugestii/${id}/poze/plansa`, { headers: { Authorization: 'Bearer owner' } })).json() as { fields: { tip: { stringValue: string }; marime: { integerValue: string } } };
  expect(p.fields.tip.stringValue).toBe('image/jpeg');
  expect(Number(p.fields.marime.integerValue)).toBeGreaterThan(1000);
  expect(Number(p.fields.marime.integerValue)).toBeLessThanOrEqual(400 * 1024);
  await card(admin, 'noua', 'Grila se vede rău').locator('[data-sug="deschide"]').click();
  await detaliu(admin).locator('[data-sug="arata-poza"]').click();
  await expect(detaliu(admin).locator('[data-sug="poza"]')).toBeVisible(LENT);
  await expect.poll(() => latimeImagine(admin, '[data-sug="detaliu"] [data-sug="poza"]')).toBeGreaterThan(0);
  await admin.keyboard.press('Escape');

  // O poză nouă din editor: fila deja deschisă o primește pe canal (editorul mai deschide una, închisă aici), cu formularul
  // deschis; scoasă, nu mai revine, nici după reîncărcare.
  const meniu2 = await deschideMeniulContului(page);
  const [a2] = await Promise.all([page.context().waitForEvent('page'), meniu2.locator('[data-meniu-cont="sugestie"]').click()]);
  await a2.close();
  await expect(nou.locator('[data-sug="poza-atasata"]')).toBeVisible(LENT);
  await nou.locator('[data-sug="scoate-poza"]').click();
  await expect(nou.locator('[data-sug="poza-atasata"]')).toHaveCount(0);
  await admin.reload();
  await expect(card(admin, 'noua', 'Grila se vede rău')).toBeVisible(LENT);
  await expect(nou).toHaveCount(0);
  await admin.locator('[data-sug="noua"]').click();
  await expect(nou).toBeVisible();
  await expect(admin.locator('[data-sug="poza-atasata"]')).toHaveCount(0);
  expect(erori).toEqual([]);
});
