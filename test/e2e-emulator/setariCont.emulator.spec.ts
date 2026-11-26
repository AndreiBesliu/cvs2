import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { deschideMeniulContului } from '../e2e/ajutor-panza.ts';

/**
 * Setările cotelor în cont (ADR 0330, întrebarea 14a, felia 10.4↑g), cap-coadă, pe emulatoarele Auth, Firestore și Functions:
 * două browsere ale aceluiași cont. O schimbare din fereastra Setări a primului ajunge în cont (după 2 s fără alta), iar al
 * doilea o primește la deschiderea ferestrei; același câmp schimbat altfel pe amândouă e o ciocnire, cu banda ei, până
 * alege omul. Cu proba trecută, setările din cont vin, dar o schimbare rămâne în browser.
 */

const PROIECT = 'demo-cncvs2';
const FS = `http://127.0.0.1:8085/v1/projects/${PROIECT}/databases/(default)/documents`;
const AUTH = 'http://127.0.0.1:9095';
const CONFIG = {
  instanta: 'local',
  firebase: { apiKey: 'demo-cheie', authDomain: `${PROIECT}.firebaseapp.com`, projectId: PROIECT, appId: '1:1:web:1' },
  emulatoare: { auth: AUTH, firestore: '127.0.0.1:8085', functions: '127.0.0.1:5005' },
};
/** Prima chemare a unui callable pornește lucrătorul lui în emulator (secunde); trecerea vine la 2 s după o schimbare. */
const LENT = { timeout: 30_000 };

test.use({ locale: 'ro-RO' });

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`${AUTH}/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' });
});

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

async function deschide(page: Page): Promise<void> {
  await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  await page.goto('/');
}

async function intra(page: Page): Promise<void> {
  await (await deschideMeniulContului(page)).locator('[data-meniu-cont="intra"]').click();
  const d = page.getByTestId('dialog-cont');
  await d.locator('[data-camp="cont-email"]').fill('ana@exemplu.ro');
  await d.locator('[data-camp="cont-parola"]').fill('parola-buna-1');
  await d.locator('[data-buton="cont-intra"]').click();
  await expect(d.locator('[data-cont="intrat"]')).toBeVisible(LENT);
  await d.locator('[data-buton="inchide-cont"]').click();
}

async function setarile(page: Page): Promise<Locator> {
  await (await deschideMeniulContului(page)).locator('[data-meniu-cont="setari"]').click();
  const d = page.getByTestId('dialog-setari');
  await expect(d).toBeVisible();
  return d;
}

const unitatea = (d: Locator): Locator => d.locator('[data-setare="cifre.unitate"]');
const stare = (d: Locator): Locator => d.getByTestId('cote-cont-stare');

/** Unitatea cifrelor din setările din cont, citită pe server (sau null: încă nimic). */
async function unitateaDinCont(uid: string): Promise<string | null> {
  const r = await fetch(`${FS}/conturi/${uid}/preferinte/cote`, { headers: { Authorization: 'Bearer owner' } });
  if (r.status === 404) return null;
  const j = (await r.json()) as { fields?: { json?: { stringValue?: string } } };
  const s = j.fields?.json?.stringValue;
  return s ? String((JSON.parse(s) as { cifre?: { unitate?: unknown } }).cifre?.unitate) : null;
}

async function alDoilea(browser: Browser): Promise<{ readonly page: Page; readonly inchide: () => Promise<void> }> {
  const ctx = await browser.newContext({ locale: 'ro-RO', baseURL: 'http://localhost:4173', serviceWorkers: 'block' });
  return { page: await ctx.newPage(), inchide: () => ctx.close() };
}

test('două browsere ale aceluiași cont: schimbarea ajunge pe celălalt; ciocnirea are banda ei, iar „Ia-le pe cele din cont” o împacă', async ({ page, browser }) => {
  const uid = await clientConfirmat('ana@exemplu.ro', 'parola-buna-1');
  await deschide(page);
  // Fără cont, fereastra nu spune nimic despre cont.
  let a = await setarile(page);
  await expect(stare(a)).toHaveCount(0);
  await a.locator('[data-buton="setari-inchide"]').click();
  await intra(page);
  a = await setarile(page);
  await expect(stare(a)).toHaveAttribute('data-stare', 'la-zi', LENT);
  // Setările implicite, într-un cont gol: nimic de scris.
  expect(await unitateaDinCont(uid)).toBeNull();
  await unitatea(a).selectOption('inch');
  await expect.poll(() => unitateaDinCont(uid), LENT).toBe('inch');
  await expect(stare(a)).toHaveText('Setările cotelor stau și în cont: pe alt calculator, cu același cont, vin singure.');

  const b2 = await alDoilea(browser);
  try {
    await deschide(b2.page);
    await intra(b2.page);
    const b = await setarile(b2.page);
    await expect(unitatea(b)).toHaveValue('inch', LENT);
    await expect(stare(b)).toHaveAttribute('data-stare', 'la-zi');
    // Același câmp, altfel pe amândouă: A întâi (ajunge în cont), apoi B, care primește ciocnirea.
    await unitatea(a).selectOption('cm');
    await expect.poll(() => unitateaDinCont(uid), LENT).toBe('cm');
    await unitatea(b).selectOption('fractii');
    const banda = b.getByTestId('cote-cont-ciocnire');
    await expect(banda).toContainText('O setare s-a schimbat altfel aici și în cont. Până alegi, rămâne cea de aici.', LENT);
    await expect(unitatea(b)).toHaveValue('fractii');
    expect(await unitateaDinCont(uid)).toBe('cm');
    await banda.locator('[data-buton="cote-cont-din-cont"]').click();
    await expect(banda).toHaveCount(0);
    await expect(unitatea(b)).toHaveValue('cm');
    await expect(stare(b)).toHaveAttribute('data-stare', 'la-zi', LENT);
    expect(await unitateaDinCont(uid)).toBe('cm');
  } finally {
    await b2.inchide();
  }
});

test('cu proba trecută: setările din cont vin, iar o schimbare rămâne în browser („doar citire”)', async ({ page }) => {
  const uid = await clientConfirmat('ana@exemplu.ro', 'parola-buna-1');
  const trecut = new Date(Date.now() - 86_400_000).toISOString();
  const pune = async (cale: string, fields: Record<string, unknown>): Promise<void> => {
    const r = await fetch(`${FS}/${cale}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
    expect(r.status, await r.clone().text()).toBe(200);
  };
  await pune(`conturi/${uid}`, { schema: { integerValue: '1' }, email: { stringValue: 'ana@exemplu.ro' }, nume: { stringValue: 'Ana' }, plan: { stringValue: 'proba' }, probaPana: { timestampValue: trecut } });
  await pune(`conturi/${uid}/preferinte/cote`, { versiune: { integerValue: '1' }, json: { stringValue: JSON.stringify({ v: 1, cifre: { unitate: 'cm' } }) } });
  await deschide(page);
  await intra(page);
  const d = await setarile(page);
  await expect(unitatea(d)).toHaveValue('cm', LENT);
  await expect(stare(d)).toHaveAttribute('data-stare', 'la-zi');
  await unitatea(d).selectOption('inch');
  await expect(stare(d)).toHaveText('Planul contului nu scrie setările în cont: rămân în acest browser (cele din cont vin).', LENT);
  await expect(unitatea(d)).toHaveValue('inch');
  expect(await unitateaDinCont(uid)).toBe('cm');
});
