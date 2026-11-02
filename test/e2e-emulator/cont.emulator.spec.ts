import { expect, test, type Page } from '@playwright/test';
import { deschideMeniulContului } from '../e2e/ajutor-panza.ts';

/**
 * Contul clientului din editor (ADR 0116), cap-coadă, pe emulatoarele Auth, Firestore și Functions: contul nou cu parolă,
 * e-mailul de confirmare (linkul luat din emulatorul de cont), „Am confirmat” fără confirmare spune că adresa nu e
 * confirmată, apoi deschide contul pe server (proba de 14 zile, documentul `conturi/{uid}`, contul ținut în browser);
 * numele; planul schimbat pe server ajunge în contul ținut la pornirea următoare, iar meniul contului (ADR 0120) îl arată fără
 * server; ieșirea din panou golește contul ținut, iar cea din meniu închide și contul Firebase.
 */

const PROIECT = 'demo-cncvs2';
const AUTH = 'http://127.0.0.1:9095';
const FS = `http://127.0.0.1:8085/v1/projects/${PROIECT}/databases/(default)/documents`;
const CONFIG = {
  instanta: 'local',
  firebase: { apiKey: 'demo-cheie', authDomain: `${PROIECT}.firebaseapp.com`, projectId: PROIECT, appId: '1:1:web:1' },
  emulatoare: { auth: AUTH, firestore: '127.0.0.1:8085', functions: '127.0.0.1:5005' },
};

test.use({ locale: 'ro-RO' });

/** Cât așteaptă o probă care cheamă serverul: prima chemare a callable-ului pornește lucrătorul lui în emulator (secunde). */
const SERVER = { timeout: 20_000 };

test.beforeEach(async ({ page }) => {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`${AUTH}/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' });
  await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
});

/** Deschide linkul de confirmare din „e-mailul” emulatorului de cont. */
async function confirma(email: string): Promise<void> {
  const r = await fetch(`${AUTH}/emulator/v1/projects/${PROIECT}/oobCodes`);
  const coduri = ((await r.json()) as { oobCodes: Array<{ email: string; requestType: string; oobLink: string }> }).oobCodes;
  const c = coduri.filter((x) => x.email === email && x.requestType === 'VERIFY_EMAIL').at(-1);
  expect(c, 'linkul de confirmare').toBeTruthy();
  expect((await fetch(c?.oobLink ?? '')).status).toBeLessThan(400);
}

/** Contul ținut de aplicație, din browser. */
const tinut = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('cncvs2.cont') ?? 'null') as { uid: string; nume: string; drept: { plan: string } | null } | null);

test('contul nou cu parolă: confirmarea, proba de 14 zile pe server, numele, reconfirmarea la pornire și ieșirea', async ({ page }) => {
  await page.goto('/');
  await (await deschideMeniulContului(page)).locator('[data-meniu-cont="intra"]').click();
  const d = page.getByTestId('dialog-cont');
  await expect(d.locator('[data-cont="iesit"]')).toBeVisible();
  await d.locator('[data-camp="cont-email"]').fill('ana@exemplu.ro');
  await d.locator('[data-camp="cont-parola"]').fill('parola-buna-1');
  await d.locator('[data-buton="cont-creeaza"]').click();
  await expect(d.locator('[data-cont="neconfirmat"]')).toContainText('ana@exemplu.ro', SERVER);
  // Fără confirmare: contul încă nu există pe server, iar panoul o spune.
  await d.locator('[data-buton="cont-confirmat"]').click();
  await expect(d.locator('[data-info="cont"]')).toHaveText('Adresa nu e confirmată încă: deschide linkul din e-mail, apoi încearcă din nou.', SERVER);
  expect((await (await fetch(`${FS}/conturi`, { headers: { Authorization: 'Bearer owner' } })).json() as { documents?: unknown[] }).documents).toBeUndefined();
  await confirma('ana@exemplu.ro');
  await d.locator('[data-buton="cont-confirmat"]').click();
  await expect(d.locator('[data-cont="intrat"]')).toBeVisible(SERVER);
  await expect(d.locator('.cont-plan')).toHaveAttribute('data-plan', 'proba');
  await expect(d.locator('.cont-plan')).toContainText('Proba gratuită: încă 14 zile');
  const lista = (await (await fetch(`${FS}/conturi`, { headers: { Authorization: 'Bearer owner' } })).json()) as { documents?: Array<{ name: string; fields: Record<string, { stringValue?: string }> }> };
  expect(lista.documents?.length).toBe(1);
  expect(lista.documents?.[0]?.fields['plan']?.stringValue).toBe('proba');
  const t1 = await tinut(page);
  expect(t1?.drept?.plan).toBe('proba');
  // Numele afișat, scris pe server și ținut în browser.
  await d.locator('[data-camp="cont-nume"]').fill('Ana Popescu');
  await d.locator('[data-buton="cont-salveaza"]').click();
  await expect.poll(async () => (await tinut(page))?.nume, SERVER).toBe('Ana Popescu');
  // Planul schimbat pe server (owner-ul dă planul gratuit) ajunge în contul ținut la pornirea următoare.
  const r = await fetch(`${FS}/conturi/${t1?.uid ?? ''}?updateMask.fieldPaths=plan`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { plan: { stringValue: 'gratuit' } } }),
  });
  expect(r.status).toBe(200);
  await page.reload();
  await expect.poll(async () => (await tinut(page))?.drept?.plan, { timeout: 20_000 }).toBe('gratuit');
  // Meniul contului arată, fără server, numele și planul din contul ținut; „Contul meu…” deschide panoul.
  const meniu = await deschideMeniulContului(page);
  await expect(meniu.locator('[data-testid="meniu-cont-cap"] strong')).toHaveText('Ana Popescu');
  await expect(meniu.locator('[data-testid="meniu-cont-cap"] span')).toHaveText('Plan gratuit');
  await meniu.locator('[data-meniu-cont="cont"]').click();
  // Ieșirea, din panou: contul ținut pleacă.
  await expect(d.locator('.cont-plan')).toHaveAttribute('data-plan', 'gratuit', SERVER);
  await d.locator('[data-buton="cont-iesi"]').click();
  await expect(d.locator('[data-cont="iesit"]')).toBeVisible(SERVER);
  expect(await tinut(page)).toBeNull();
  // Din nou înăuntru, cu parola; apoi ieșirea din meniu: pleacă și contul ținut, și contul Firebase (panoul cere logarea).
  await d.locator('[data-camp="cont-email"]').fill('ana@exemplu.ro');
  await d.locator('[data-camp="cont-parola"]').fill('parola-buna-1');
  await d.locator('[data-buton="cont-intra"]').click();
  await expect(d.locator('[data-cont="intrat"]')).toBeVisible(SERVER);
  await d.locator('[data-buton="inchide-cont"]').click();
  await (await deschideMeniulContului(page)).locator('[data-meniu-cont="iesi"]').click();
  await expect.poll(async () => tinut(page), SERVER).toBeNull();
  await expect(page.locator('[data-editare="cont"]')).toHaveText('Cont');
  await (await deschideMeniulContului(page)).locator('[data-meniu-cont="intra"]').click();
  await expect(d.locator('[data-cont="iesit"]')).toBeVisible(SERVER);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
