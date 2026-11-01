import { expect, test, type Page } from '@playwright/test';

/**
 * Filele Utilizatori și Setări (ADR 0116 §19, §20; felia 14.C↑b) cap-coadă, pe emulatoare, pe build-ul real: owner-ul vede
 * conturile clienților, cele mai noi întâi, cu planul de acum; dă o probă de 30 de zile unui cont expirat, planul gratuit,
 * dezactivează și reactivează, iar documentul și auditul urmează; un plan schimbat între timp e refuzat lângă formular.
 * Setările: implicitele, apoi valorile noi, salvate pe server. Un rol care doar citește conturile vede fila fără schimbări.
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
/** Prima chemare a unui callable după pornirea emulatorului de funcții trece de 5 s. */
const LENT = { timeout: 30_000 };
const ZI = 86_400_000;
const CONT_CIT = 'RContCit000000000000';

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

type Camp = { stringValue?: string; integerValue?: string; nullValue?: null; timestampValue?: string };
async function citeste(cale: string): Promise<Record<string, Camp>> {
  const r = await fetch(`${FS}/${cale}`, { headers: { Authorization: 'Bearer owner' } });
  return ((await r.json()) as { fields?: Record<string, Camp> }).fields ?? {};
}

async function actiuniAudit(): Promise<string[]> {
  const r = await fetch(`${FS}/audit?pageSize=100`, { headers: { Authorization: 'Bearer owner' } });
  const docs = ((await r.json()) as { documents?: Array<{ fields: Record<string, Camp> }> }).documents ?? [];
  return docs.map((d) => d.fields['actiune']?.stringValue ?? '').sort();
}

/** Un cont de client, cum îl scrie callable-ul `cont` la prima deschidere. */
async function puneCont(uid: string, creatLa: Date, probaPana: Date): Promise<void> {
  await scrie(`conturi/${uid}`, {
    schema: 1, email: `${uid}@exemplu.ro`, nume: uid.toUpperCase(), creatLa, ultimaLogare: creatLa, plan: 'proba', probaPana,
    drept: { plan: 'proba', capabilitati: ['desen', 'cam', 'export-gcode', 'export-vectori', 'masina'], pana: probaPana.getTime(), calculatLa: creatLa.getTime(), zileOffline: 7 },
  });
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

const file = async (page: Page): Promise<string[]> => page.locator('[data-fila]').evaluateAll((b) => b.map((x) => x.getAttribute('data-fila') ?? ''));
const rand = (page: Page, email: string) => page.locator(`li[data-cont="${email}"]`);

async function schimba(page: Page, email: string, fel: string, zile?: number): Promise<void> {
  const r = rand(page, email);
  await r.locator('[data-util="schimba"]').click();
  await r.locator('[data-util="schimbare"]').selectOption(fel);
  if (zile !== undefined) await r.locator('[data-util="zile"]').fill(String(zile));
  await r.locator('[data-util="salveaza-plan"]').click();
}

test('owner-ul vede conturile, dă o probă, planul gratuit, dezactivează și reactivează; serverul refuză un plan văzut vechi', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  const acum = Date.now();
  await puneCont('ana', new Date(acum - 2 * ZI), new Date(acum + 5 * ZI));
  await puneCont('bob', new Date(acum - ZI), new Date(acum - 3_600_000));
  await deschide(page);
  await puneRolul(page, await intraCuGoogle(page), 'owner');
  // Filele apar după citirea rolului (asincronă): întâi una vizibilă, apoi lista lor.
  await expect(page.locator('[data-fila="setari"]')).toBeVisible(LENT);
  expect(await file(page)).toEqual(['erori', 'diagnoza', 'roadmap', 'documentatie', 'sugestii', 'utilizatori', 'personal', 'setari', 'cont']);
  await page.locator('[data-fila="utilizatori"]').click();

  // Cele mai noi întâi; planul de acum: proba lui Bob a trecut.
  const lista = page.locator('li[data-cont]');
  await expect(lista).toHaveCount(2, LENT);
  expect(await lista.evaluateAll((l) => l.map((x) => x.getAttribute('data-cont')))).toEqual(['bob@exemplu.ro', 'ana@exemplu.ro']);
  await expect(rand(page, 'bob@exemplu.ro').locator('[data-util="plan"]')).toHaveAttribute('data-plan', 'expirat');
  await expect(rand(page, 'ana@exemplu.ro').locator('[data-util="plan"]')).toHaveText(/^Probă: încă 5 zile \(până pe /);

  // O probă nouă de 30 de zile, de azi, pentru contul expirat.
  await schimba(page, 'bob@exemplu.ro', 'proba', 30);
  await expect(page.locator('[data-util="gata"]')).toHaveText('Planul contului bob@exemplu.ro: Probă.', LENT);
  await expect(rand(page, 'bob@exemplu.ro').locator('[data-util="plan"]')).toHaveText(/^Probă: încă 30 de zile/);
  const pana = Date.parse((await citeste('conturi/bob'))['probaPana']?.timestampValue ?? '');
  expect(Math.abs(pana - (acum + 30 * ZI))).toBeLessThan(5 * 60_000);

  // Gratuit, apoi dezactivat (lista oferă reactivarea întâi), apoi reactivat: înapoi la gratuit.
  await schimba(page, 'ana@exemplu.ro', 'gratuit');
  await expect(rand(page, 'ana@exemplu.ro')).toHaveAttribute('data-plan', 'gratuit', LENT);
  await schimba(page, 'ana@exemplu.ro', 'dezactiveaza');
  await expect(rand(page, 'ana@exemplu.ro')).toHaveAttribute('data-plan', 'dezactivat', LENT);
  expect((await citeste('conturi/ana'))['planInainte']).toBeTruthy();
  await rand(page, 'ana@exemplu.ro').locator('[data-util="schimba"]').click();
  await expect(rand(page, 'ana@exemplu.ro').locator('[data-util="schimbare"]')).toHaveValue('reactiveaza');
  await rand(page, 'ana@exemplu.ro').locator('[data-util="salveaza-plan"]').click();
  await expect(rand(page, 'ana@exemplu.ro')).toHaveAttribute('data-plan', 'gratuit', LENT);
  const ana = await citeste('conturi/ana');
  expect([ana['plan']?.stringValue, ana['planInainte']?.nullValue]).toEqual(['gratuit', null]);
  expect(await actiuniAudit()).toEqual(['conturi.dezactiveaza', 'conturi.gratuit', 'conturi.proba', 'conturi.reactiveaza']);

  // Planul lui Bob se schimbă pe server (alt om din personal) cât lista îl arată pe cel vechi: cererea e refuzată.
  await scrie('conturi/bob', { schema: 1, email: 'bob@exemplu.ro', nume: 'BOB', creatLa: new Date(acum - ZI), plan: 'gratuit', probaPana: new Date(pana) });
  await schimba(page, 'bob@exemplu.ro', 'dezactiveaza');
  await expect(rand(page, 'bob@exemplu.ro').locator('[data-util="eroare"]')).toContainText('planul contului s-a schimbat', LENT);
  expect((await citeste('conturi/bob'))['plan']?.stringValue).toBe('gratuit');
  await page.locator('[data-util="reincarca"]').click();
  await expect(rand(page, 'bob@exemplu.ro')).toHaveAttribute('data-plan', 'gratuit', LENT);
  expect(erori).toEqual([]);
});

test('setările: implicitele până la prima salvare; valorile din margini se salvează pe server, cu auditul; în afara lor, nu', async ({ page }) => {
  await deschide(page);
  await puneRolul(page, await intraCuGoogle(page), 'owner');
  await page.locator('[data-fila="setari"]').click();
  await expect(page.locator('[data-set="sursa"]')).toHaveText('Nesalvate încă: merg implicitele.', LENT);
  await expect(page.locator('[data-set="zile-offline"]')).toHaveValue('7');
  await expect(page.locator('[data-set="zile-tichete"]')).toHaveValue('365');
  await page.locator('[data-set="zile-offline"]').fill('61');
  await expect(page.locator('[data-set="salveaza"]')).toBeDisabled();
  await page.locator('[data-set="zile-offline"]').fill('3');
  await page.locator('[data-set="zile-tichete"]').fill('90');
  await page.locator('[data-set="salveaza"]').click();
  await expect(page.locator('[data-set="gata"]')).toHaveText('Setările sunt salvate.', LENT);
  await expect(page.locator('[data-set="sursa"]')).toContainText('Schimbate ultima dată pe ');
  const s = await citeste('setari/conturi');
  expect([s['zileOffline']?.integerValue, s['zilePastrareTichete']?.integerValue]).toEqual(['3', '90']);
  expect(await actiuniAudit()).toEqual(['setari.conturi']);
  // Reîncărcată, fila citește valorile salvate.
  await page.reload();
  await page.locator('[data-fila="setari"]').click();
  await expect(page.locator('[data-set="zile-offline"]')).toHaveValue('3', LENT);
});

test('un rol care doar citește conturile vede fila Utilizatori, fără schimbarea planului, și nu vede Setările', async ({ page }) => {
  await puneCont('ana', new Date(Date.now() - ZI), new Date(Date.now() + 9 * ZI));
  await scrie(`roluri/${CONT_CIT}`, { nume: 'Conturi', permisiuni: ['conturi.citeste'] });
  await deschide(page);
  await puneRolul(page, await intraCuGoogle(page), CONT_CIT);
  await expect(page.locator('[data-admin="cont"]')).toContainText('Conturi', LENT);
  expect(await file(page)).toEqual(['utilizatori', 'cont']);
  await expect(rand(page, 'ana@exemplu.ro')).toHaveAttribute('data-plan', 'proba', LENT);
  await expect(page.locator('[data-util="schimba"]')).toHaveCount(0);
  await expect(page.locator('.util .pers-sectiune > p.admin-slab').first()).toHaveText('Cele mai noi conturi întâi. Rolul tău le citește, fără să schimbe planuri.');
});
