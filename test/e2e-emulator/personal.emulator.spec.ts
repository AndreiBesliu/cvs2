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
  await page.locator('.admin-cont button').click();
  await expect(page.locator('[data-admin="intra"]')).toBeVisible();
}

const file = async (page: Page): Promise<string[]> => page.locator('[data-fila]').evaluateAll((b) => b.map((x) => x.getAttribute('data-fila') ?? ''));

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
  await expect(page.locator('[data-rol="Suport"]')).toContainText('Erori: citește');

  // Invitația pe e-mail; fără rol ales, nimic nu pleacă (owner nu e preselectat).
  await page.locator('[data-personal="email"]').fill('ana@exemplu.ro');
  await expect(page.locator('[data-personal="invita"]')).toBeDisabled();
  await expect(page.locator('[data-personal="creeaza-cont"]')).toBeDisabled();
  await page.locator('[data-personal="rol-nou"]').selectOption({ label: 'Suport' });
  await page.locator('[data-personal="invita"]').click();
  await expect(page.locator('[data-personal="gata"]')).toContainText('ana@exemplu.ro');
  await expect(page.locator('[data-invitatie="ana@exemplu.ro"]')).toBeVisible();

  // Contul cu parolă: linkul de setare a parolei, arătat o dată.
  await page.locator('[data-personal="email"]').fill('ion@exemplu.ro');
  await page.locator('[data-personal="rol-nou"]').selectOption({ label: 'Suport' });
  await page.locator('[data-personal="creeaza-cont"]').click();
  const link = page.locator('[data-personal="link"]');
  await expect(link).toHaveValue(/oobCode=/, LENT);
  const oobCode = new URL(await link.inputValue()).searchParams.get('oobCode') ?? '';
  await expect(page.locator('[data-om="ion@exemplu.ro"]')).toBeVisible();
  await expect(page.locator('[data-om="ion@exemplu.ro"] [data-personal="link-nou"]')).toBeVisible();
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
  expect(await file(page)).toEqual(['erori', 'roadmap', 'documentatie', 'cont']);
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
  await expect(page.locator('[data-om="dana@exemplu.ro"]')).toContainText('prin invitație');
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
