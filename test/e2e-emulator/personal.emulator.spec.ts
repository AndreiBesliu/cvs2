import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * Personalul (ADR 0049) cap-coadă, pe emulatoare, pe build-ul real: owner-ul face un rol din bife, trimite o invitație și
 * creează un cont cu parolă; omul cu contul creat își pune parola prin link, intră cu ea și vede doar filele rolului; omul
 * invitat intră cu Google pe adresa lui și ajunge singur în personal; un cont Google își adaugă o parolă și intră apoi cu
 * ea în același cont. Capturile filei Personal se scriu în `.tmp/`, nu în git.
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

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`${AUTH}/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' });
});

/** O valoare JS în forma REST a Firestore. */
function val(x: unknown): unknown {
  if (typeof x === 'string') return { stringValue: x };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(val) } };
  throw new Error('valoare nesprijinită');
}

/** Scrie un document întreg ocolind regulile („Bearer owner” e cheia de administrare a emulatorului). */
async function scrie(cale: string, d: Record<string, unknown>): Promise<void> {
  const r = await fetch(`${FS}/${cale}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, val(v)])) }),
  });
  expect(r.status, await r.clone().text()).toBe(200);
}

async function deschide(page: Page): Promise<void> {
  await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  await page.goto('/admin');
}

/** Login-ul Google al emulatorului: un cont nou, cu adresa dată (verificată, ca la Google) sau generată. */
async function intraCuGoogle(page: Page, email?: string): Promise<void> {
  const [fereastra] = await Promise.all([page.waitForEvent('popup'), page.locator('[data-admin="intra"]').click()]);
  await fereastra.waitForLoadState();
  await fereastra.locator('#add-account-button').click();
  await fereastra.locator('#autogen-button').click();
  if (email) await fereastra.locator('#email-input').fill(email);
  await fereastra.locator('#sign-in').click();
}

/** Primul owner, ca pe test: documentul `staff/{uid}` pus de mână (în consolă). */
async function intraCaOwner(page: Page): Promise<string> {
  await deschide(page);
  await intraCuGoogle(page);
  const uid = (await page.locator('[data-admin="uid"]').textContent()) ?? '';
  const r = await fetch(`${FS}/staff/${uid}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { rol: { stringValue: 'owner' } } }),
  });
  expect(r.status).toBe(200);
  await page.locator('[data-admin="reincearca"]').click();
  await expect(page.locator('[data-fila="personal"]')).toBeVisible();
  return uid;
}

async function iesi(page: Page): Promise<void> {
  // Ieșirea stă în meniul contului (ADR 0260).
  await page.locator('[data-admin="meniu-cont"]').click();
  await page.locator('[data-admin="iesi"]').click();
  await expect(page.locator('[data-admin="intra"]')).toBeVisible();
}

const file = async (page: Page): Promise<string[]> => page.locator('[data-fila]').evaluateAll((b) => b.map((x) => x.getAttribute('data-fila') ?? ''));
/** Celula matricei: rolul (după nume) și permisiunea. */
const celula = (page: Page, rol: string, permisiune: string) => page.locator(`[data-celula="${rol}/${permisiune}"]`);

test('owner-ul: un rol din bife, o invitație, un cont cu parolă; omul își pune parola și vede doar filele rolului', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await intraCaOwner(page);
  await page.locator('[data-fila="personal"]').click();
  await expect(page.locator('[data-om]')).toHaveCount(1);

  // Rolul: numele și bifele din catalog.
  await page.locator('[data-personal="rol-nou-buton"]').click();
  await page.locator('[data-personal="nume-rol"]').fill('Suport');
  await page.locator('[data-permisiune="erori.citeste"]').check();
  await page.locator('[data-permisiune="documentatie.citeste"]').check();
  await page.locator('[data-personal="salveaza-rol"]').click();
  await expect(page.locator('[data-personal="gata"]')).toContainText('Suport', LENT);
  // Matricea (ADR 0260 §6): coloana rolului, cu bifele lui pe rândurile catalogului.
  await expect(celula(page, 'Suport', 'erori.citeste')).toHaveAttribute('data-are', 'true');
  await expect(celula(page, 'Suport', 'documentatie.citeste')).toHaveAttribute('data-are', 'true');
  await expect(celula(page, 'Suport', 'erori.rezolva')).toHaveAttribute('data-are', 'false');

  // Invitația pe e-mail („Adaugă un om” deschide formularul); fără rol ales, nimic nu pleacă (owner nu e preselectat).
  await expect(page.locator('[data-personal="formular-adauga"]')).toHaveCount(0);
  await page.locator('[data-personal="adauga"]').click();
  await page.locator('[data-personal="email"]').fill('ana@exemplu.ro');
  await expect(page.locator('[data-personal="invita"]')).toBeDisabled();
  await expect(page.locator('[data-personal="creeaza-cont"]')).toBeDisabled();
  await page.locator('[data-personal="rol-nou"]').selectOption({ label: 'Suport' });
  await page.locator('[data-personal="invita"]').click();
  await expect(page.locator('[data-personal="gata"]')).toContainText('ana@exemplu.ro');
  // Invitația deschisă stă în lista oamenilor, cu „invitație trimisă” sub adresă și rolul ei.
  await expect(page.locator('[data-invitatie="ana@exemplu.ro"]')).toBeVisible();
  await expect(page.locator('[data-invitatie="ana@exemplu.ro"] [data-personal="metoda"]')).toHaveText(/^invitație trimisă · expiră pe /);
  await expect(page.locator('[data-invitatie="ana@exemplu.ro"] .admin-cip')).toHaveText('Suport');

  // Contul cu parolă: linkul de setare a parolei, arătat o dată.
  await page.locator('[data-personal="email"]').fill('ion@exemplu.ro');
  await page.locator('[data-personal="rol-nou"]').selectOption({ label: 'Suport' });
  await page.locator('[data-personal="creeaza-cont"]').click();
  const link = page.locator('[data-personal="link"]');
  await expect(link).toHaveValue(/oobCode=/, LENT);
  const oobCode = new URL(await link.inputValue()).searchParams.get('oobCode') ?? '';
  await expect(page.locator('[data-om="ion@exemplu.ro"]')).toBeVisible();
  await expect(page.locator('[data-om="ion@exemplu.ro"] [data-personal="link-nou"]')).toBeVisible();
  // Sub nume, cum intră omul: contul creat aici intră cu parola.
  await expect(page.locator('[data-om="ion@exemplu.ro"] [data-personal="metoda"]')).toHaveText(/^parolă, cont creat aici · /);
  mkdirSync('.tmp', { recursive: true });
  await page.screenshot({ path: '.tmp/personal.png', fullPage: true });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: '.tmp/personal-intunecat.png', fullPage: true });
  await page.emulateMedia({ colorScheme: 'light' });

  // Omul își pune parola cu linkul (pagina Firebase a linkului, aici prin API-ul emulatorului), apoi intră cu ea.
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=demo-cheie`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oobCode, newPassword: 'parola-lui-ion-1' }),
  });
  expect(r.status, await r.clone().text()).toBe(200);
  await iesi(page);
  await page.locator('[data-admin="email"]').fill('ion@exemplu.ro');
  await page.locator('[data-admin="parola"]').fill('parola-lui-ion-1');
  await page.locator('[data-admin="intra-parola"]').click();
  await expect(page.locator('[data-admin="cont"]')).toContainText('ion@exemplu.ro · Suport');
  expect(await file(page)).toEqual(['azi', 'erori', 'roadmap', 'documentatie', 'cont']);
  await page.locator('[data-fila="cont"]').click();
  await expect(page.locator('[data-metoda="password"]')).toHaveAttribute('data-are', 'true');
  await expect(page.locator('[data-metoda="google.com"]')).toHaveAttribute('data-are', 'false');

  // O parolă greșită: mesajul, fără să spună care din două.
  await iesi(page);
  await page.locator('[data-admin="email"]').fill('ion@exemplu.ro');
  await page.locator('[data-admin="parola"]').fill('alta-parola');
  await page.locator('[data-admin="intra-parola"]').click();
  await expect(page.locator('[data-admin="eroare-intrare"]')).toContainText('Adresa sau parola nu se potrivește');
  expect(erori).toEqual([]);
});

test('invitația: omul intră cu Google pe adresa invitată și ajunge singur în personal, cu rolul ei', async ({ page }) => {
  await intraCaOwner(page);
  await page.locator('[data-fila="personal"]').click();
  // ADR 0071: rândul owner-ului e fix (nici rol de ales, nici Scoate), iar owner nu e printre rolurile de dat.
  const own = page.locator('[data-om]').first();
  await expect(own.locator('[data-personal="owner-fix"]')).toContainText('owner');
  await expect(own.locator('[data-personal="rol"], [data-personal="scoate"]')).toHaveCount(0);
  await expect(page.locator('[data-personal="rol-nou"] option', { hasText: 'owner' })).toHaveCount(0);
  // Un rol care vede personalul (fila lui), apoi invitația cu el.
  await page.locator('[data-personal="rol-nou-buton"]').click();
  await page.locator('[data-personal="nume-rol"]').fill('Vede personalul');
  await page.locator('[data-permisiune="erori.citeste"]').check();
  await page.locator('[data-personal="salveaza-rol"]').click();
  await expect(page.locator('[data-personal="gata"]')).toContainText('Vede personalul', LENT);
  await page.locator('[data-personal="adauga"]').click();
  await page.locator('[data-personal="email"]').fill('dana@exemplu.ro');
  await page.locator('[data-personal="rol-nou"]').selectOption({ label: 'Vede personalul' });
  await page.locator('[data-personal="invita"]').click();
  await expect(page.locator('[data-invitatie="dana@exemplu.ro"]')).toBeVisible(LENT);
  await iesi(page);

  await intraCuGoogle(page, 'dana@exemplu.ro');
  await expect(page.locator('[data-admin="cont"]')).toContainText('dana@exemplu.ro · Vede personalul', LENT);
  await iesi(page);
  await intraCaOwner(page);
  await page.locator('[data-fila="personal"]').click();
  // `intraCaOwner` face de fiecare dată un cont nou: doi owneri (amândoi ficși, fără Scoate) și dana.
  await expect(page.locator('[data-om]')).toHaveCount(3, LENT);
  await expect(page.locator('[data-personal="owner-fix"]')).toHaveCount(2);
  await expect(page.locator('[data-personal="scoate"]')).toHaveCount(1);
  await expect(page.locator('[data-om="dana@exemplu.ro"] [data-personal="metoda"]')).toHaveText(/^Google, prin invitație · /);
  await expect(page.locator('[data-om="dana@exemplu.ro"] [data-personal="scoate"]')).toBeVisible();
  await expect(page.locator('[data-invitatie]')).toHaveCount(0);

  // Un om din afară, fără invitație: „nu ești în personal”, fără eroare.
  await iesi(page);
  await intraCuGoogle(page, 'strain@exemplu.ro');
  await expect(page.locator('[data-admin="fara-rol"]')).toBeVisible(LENT);
  await expect(page.locator('[data-admin="invitatie-esec"]')).toHaveCount(0);
});

test('un singur cont pe adresă: contul Google își adaugă o parolă și intră apoi cu ea în același cont', async ({ page }) => {
  const uid = await intraCaOwner(page);
  await page.locator('[data-fila="cont"]').click();
  const email = ((await page.locator('[data-cont="email"] strong').textContent()) ?? '').trim();
  expect(email).toMatch(/@/);
  await expect(page.locator('[data-metoda="google.com"]')).toHaveAttribute('data-are', 'true');
  await expect(page.locator('[data-metoda="password"]')).toHaveAttribute('data-are', 'false');
  // Parola prea scurtă și cele două diferite se spun înainte de orice cerere.
  await page.locator('[data-cont="cont-adauga"] [data-cont="noua"]').fill('scurta');
  await page.locator('[data-cont="cont-adauga"] [data-cont="din-nou"]').fill('scurta');
  await page.locator('[data-cont="cont-adauga"] [data-cont="salveaza"]').click();
  await expect(page.locator('[data-cont="cont-adauga"] [role="alert"]')).toContainText('cel puțin 8');
  await page.locator('[data-cont="cont-adauga"] [data-cont="noua"]').fill('parola-owner-1');
  await page.locator('[data-cont="cont-adauga"] [data-cont="din-nou"]').fill('parola-owner-1');
  await page.locator('[data-cont="cont-adauga"] [data-cont="salveaza"]').click();
  await expect(page.locator('[data-cont="gata"]')).toBeVisible();
  await expect(page.locator('[data-metoda="password"]')).toHaveAttribute('data-are', 'true');
  await expect(page.locator('[data-cont="cont-schimba"]')).toBeVisible();
  await page.screenshot({ path: '.tmp/cont.png', fullPage: true });

  await iesi(page);
  await page.locator('[data-admin="email"]').fill(email);
  await page.locator('[data-admin="parola"]').fill('parola-owner-1');
  await page.locator('[data-admin="intra-parola"]').click();
  await expect(page.locator('[data-admin="cont"]')).toContainText(' · owner');
  // Același cont: același uid, un singur cont în Auth.
  const conturi = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROIECT}/accounts:query`, {
    method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: '{}',
  })).json() as { userInfo?: Array<{ localId: string; providerUserInfo?: Array<{ providerId: string }> }> };
  expect(conturi.userInfo?.map((u) => u.localId)).toEqual([uid]);
  expect(conturi.userInfo?.[0]?.providerUserInfo?.map((p) => p.providerId).sort()).toEqual(['google.com', 'password']);
});

test('matricea rol × permisiune: toate rolurile alături; un rol se editează pe coloana lui; unul folosit nu se șterge; oamenii la stânga, invitațiile în aceeași listă', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  const SUPORT = 'RSuport0000000000000';
  const DEZV = 'RDezvoltator00000000';
  await scrie(`roluri/${SUPORT}`, { nume: 'Suport', permisiuni: ['erori.citeste', 'tichete.citeste', 'tichete.raspunde'] });
  await scrie(`roluri/${DEZV}`, { nume: 'Dezvoltator', permisiuni: ['erori.citeste', 'erori.rezolva', 'audit.citeste'] });
  await scrie('staff/uMihai', { rol: DEZV, email: 'mihai@exemplu.ro', sursa: 'cont-creat', adaugatLa: new Date('2026-11-01T10:00:00Z') });
  // Invitațiile, cum le ține serverul: id-ul e amprenta adresei.
  const invitatie = (email: string): string => `invitatiiPersonal/${createHash('sha256').update(email).digest('hex')}`;
  await scrie(invitatie('radu@exemplu.ro'), { email: 'radu@exemplu.ro', rol: SUPORT, expiraLa: new Date(Date.now() + 3 * 86_400_000) });
  await scrie(invitatie('vechi@exemplu.ro'), { email: 'vechi@exemplu.ro', rol: SUPORT, expiraLa: new Date(Date.now() - 86_400_000) });
  await intraCaOwner(page);
  await page.locator('[data-fila="personal"]').click();
  await expect(page.locator('[data-om]')).toHaveCount(2, LENT);

  // Capul matricei: permisiunile, owner-ul (are tot), apoi rolurile după nume. Rândurile: catalogul, pe zone.
  const matrice = page.locator('[data-personal="matrice"]');
  await expect(matrice.locator('thead th')).toHaveText(['Permisiunile', 'owner', /^Dezvoltator/, /^Suport/]);
  expect(await matrice.locator('tbody tr').evaluateAll((r) => r.map((x) => [...x.querySelectorAll('th')].map((h) => h.textContent).join(' ')))).toEqual([
    'Erori citește', 'rezolvă', 'Diagnoză', 'Audit citește', 'Documentație', 'Sugestii scrie', 'citește toate', 'Conturi citește', 'administrează', 'Tichete citește', 'răspunde',
    'Utilizare citește',
  ]);
  await expect(matrice.locator('tbody tr').first().locator('td').first()).toHaveText('tot');
  const are = async (rol: string): Promise<string[]> => page.locator(`[data-celula^="${rol}/"][data-are="true"]`).evaluateAll((c) => c.map((x) => (x.getAttribute('data-celula') ?? '').split('/')[1] ?? ''));
  expect(await are('Suport')).toEqual(['erori.citeste', 'tichete.citeste', 'tichete.raspunde']);
  expect(await are('Dezvoltator')).toEqual(['erori.citeste', 'erori.rezolva', 'audit.citeste']);
  await expect(celula(page, 'Suport', 'erori.citeste')).toHaveText('✓');
  await expect(celula(page, 'Suport', 'erori.rezolva')).toHaveText('');
  // Descrierea permisiunii stă pe rândul ei.
  await expect(matrice.locator('tbody th[scope="row"]').first()).toHaveAttribute('title', 'Fila Erori: grupurile și aparițiile lor.');

  // Oamenii la stânga matricei; invitațiile deschise în aceeași listă (cea expirată, spusă); nimic nu iese din ecran.
  const oameni = await page.locator('#pers-oameni').locator('xpath=ancestor::section').boundingBox();
  const m = await page.locator('#pers-roluri').locator('xpath=ancestor::section').boundingBox();
  if (!oameni || !m) throw new Error('cardurile nu sunt pe pagină');
  expect(m.x, 'matricea e la dreapta oamenilor').toBeGreaterThanOrEqual(oameni.x + oameni.width);
  expect(Math.abs(m.y - oameni.y)).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('[data-om="mihai@exemplu.ro"] [data-personal="metoda"]')).toHaveText(/^parolă, cont creat aici · /);
  // Owner-ul probei e pus de mână (fără adresă în document): rândul lui se caută după insigna fixă, nu după loc.
  await expect(page.locator('li[data-om]', { has: page.locator('[data-personal="owner-fix"]') }).locator('[data-personal="metoda"]')).toHaveText('adăugat în consolă');
  await expect(page.locator('[data-invitatie="radu@exemplu.ro"] [data-personal="metoda"]')).toHaveText(/^invitație trimisă · expiră pe /);
  await expect(page.locator('[data-invitatie="vechi@exemplu.ro"] [data-personal="metoda"]')).toHaveText(/^invitație trimisă · expirată pe /);
  expect(await page.locator('.pers-lista > li').evaluateAll((l) => l.map((x) => (x.hasAttribute('data-om') ? 'om' : 'invitatie')))).toEqual(['om', 'om', 'invitatie', 'invitatie']);

  // Un rol folosit (de un om sau de o invitație) nu se șterge; „Editează” pune bifele pe coloana lui.
  const cap = (rol: string) => matrice.locator(`thead th[data-rol="${rol}"]`);
  await expect(cap('Suport').locator('[data-personal="sterge-rol"]')).toBeDisabled();
  await expect(cap('Dezvoltator').locator('[data-personal="sterge-rol"]')).toBeDisabled();
  await cap('Suport').locator('[data-personal="editeaza"]').click();
  await expect(matrice.locator('[data-personal="nume-rol"]')).toHaveValue('Suport');
  // O bifă pe permisiune din catalog (12, cu „Utilizare: citește” din A.9a).
  await expect(matrice.locator('input[type="checkbox"]')).toHaveCount(12);
  await expect(celula(page, 'Suport', 'tichete.raspunde').locator('input')).toBeChecked();
  await expect(celula(page, 'Dezvoltator', 'erori.citeste').locator('input')).toHaveCount(0);
  // Cât se editează un rol, celelalte nu se ating: nici alt „Editează”, nici „Rol nou”.
  await expect(cap('Dezvoltator').locator('[data-personal="editeaza"]')).toBeDisabled();
  await expect(page.locator('[data-personal="rol-nou-buton"]')).toBeDisabled();
  // „Renunță” lasă rolul cum era, fără nicio cerere spre server.
  const cereri: string[] = [];
  const noteaza = (q: { url(): string; method(): string }): void => {
    const u = new URL(q.url());
    if (u.port === '5005' && q.method() === 'POST') cereri.push(u.pathname.split('/').pop() ?? '');
  };
  page.on('request', noteaza);
  await celula(page, 'Suport', 'tichete.raspunde').locator('input').uncheck();
  await page.locator('[data-personal="renunta-rol"]').click();
  await expect(matrice.locator('input')).toHaveCount(0);
  expect(cereri, '„Renunță” nu trimite nimic').toEqual([]);
  page.off('request', noteaza);
  expect(await are('Suport')).toEqual(['erori.citeste', 'tichete.citeste', 'tichete.raspunde']);
  // Editat și salvat: numele și bifele noi, pe server și în matrice.
  await cap('Suport').locator('[data-personal="editeaza"]').click();
  await matrice.locator('[data-personal="nume-rol"]').fill('Suport clienți');
  await celula(page, 'Suport', 'tichete.raspunde').locator('input').uncheck();
  await celula(page, 'Suport', 'conturi.citeste').locator('input').check();
  await page.locator('[data-personal="salveaza-rol"]').click();
  await expect(page.locator('[data-personal="gata"]')).toContainText('Suport clienți', LENT);
  // Matricea urmează lista recitită după salvare.
  await expect.poll(() => are('Suport clienți'), LENT).toEqual(['erori.citeste', 'conturi.citeste', 'tichete.citeste']);
  const salvat = await (await fetch(`${FS}/roluri/${SUPORT}`, { headers: { Authorization: 'Bearer owner' } })).json() as { fields: { nume: { stringValue: string }; permisiuni: { arrayValue: { values: Array<{ stringValue: string }> } } } };
  expect([salvat.fields.nume.stringValue, salvat.fields.permisiuni.arrayValue.values.map((v) => v.stringValue)]).toEqual(['Suport clienți', ['erori.citeste', 'conturi.citeste', 'tichete.citeste']]);
  // Invitația își arată rolul cu numele nou; anulată, pleacă din listă. Rolul rămas fără nimeni se poate șterge.
  await expect(page.locator('[data-invitatie="radu@exemplu.ro"] .admin-cip')).toHaveText('Suport clienți');
  await page.locator('[data-invitatie="radu@exemplu.ro"] [data-personal="anuleaza"]').click();
  await expect(page.locator('[data-invitatie="radu@exemplu.ro"]')).toHaveCount(0, LENT);
  await page.locator('[data-invitatie="vechi@exemplu.ro"] [data-personal="anuleaza"]').click();
  await expect(page.locator('[data-invitatie]')).toHaveCount(0, LENT);
  await cap('Suport clienți').locator('[data-personal="sterge-rol"]').click();
  await expect(cap('Suport clienți')).toHaveCount(0, LENT);
  await expect(matrice.locator('thead th')).toHaveText(['Permisiunile', 'owner', /^Dezvoltator/]);

  // Sub 1 200 px, matricea trece sub oameni; nimic nu iese din ecran.
  await page.setViewportSize({ width: 1100, height: 900 });
  const oameni2 = await page.locator('#pers-oameni').locator('xpath=ancestor::section').boundingBox();
  const m2 = await page.locator('#pers-roluri').locator('xpath=ancestor::section').boundingBox();
  if (!oameni2 || !m2) throw new Error('cardurile nu sunt pe pagină');
  expect(m2.y, 'matricea e sub oameni').toBeGreaterThanOrEqual(oameni2.y + oameni2.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(erori).toEqual([]);
});
