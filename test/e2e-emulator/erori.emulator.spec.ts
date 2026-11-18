import { expect, test, type Page } from '@playwright/test';

/**
 * Felia A.2 a adminului reproiectat (ADR 0260 §2, §7), pe emulatoare: fila Erori cu lista în stânga și eroarea aleasă în
 * dreapta (fără să împingă lista), numerele filtrului, filtrul pe sursă, graficul aparițiilor pe 14 zile din aparițiile
 * citite, „Marchează rezolvată” din detaliu; Diagnoza cu sumarul deasupra și problemele întâi; un rol care doar citește
 * erorile, fără marcare și fără Diagnoză.
 */

test.use({ locale: 'ro-RO' });
// Primul callable după pornirea emulatorului de funcții (invitația, la intrare) poate trece de 30 s sub încărcare.
test.describe.configure({ timeout: 120_000 });
const PORNIRE = { timeout: 60_000 };
const LENT = { timeout: 30_000 };

const PROIECT = 'demo-cncvs2';
const FS = `http://127.0.0.1:8085/v1/projects/${PROIECT}/databases/(default)/documents`;
const CONFIG = {
  instanta: 'local',
  firebase: { apiKey: 'demo-cheie', authDomain: `${PROIECT}.firebaseapp.com`, projectId: PROIECT, appId: '1:1:web:1' },
  emulatoare: { auth: 'http://127.0.0.1:9095', firestore: '127.0.0.1:8085', functions: '127.0.0.1:5005' },
};
const ROL = 'RCitesteErori0000000';
const G1 = 'a'.repeat(32);
const G2 = 'b'.repeat(32);
const G3 = 'c'.repeat(32);
const ZI = 86_400_000;

function val(x: unknown): unknown {
  if (x === null) return { nullValue: null };
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(val) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(x as object).map(([k, v]) => [k, val(v)])) } };
}

async function scrie(cale: string, d: Record<string, unknown>): Promise<void> {
  const r = await fetch(`${FS}/${cale}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, val(v)])) }),
  });
  expect(r.status, await r.clone().text()).toBe(200);
}

/** Un grup de erori cu aparițiile lui; `cand` = momentele aparițiilor, cea mai nouă întâi. */
async function grup(id: string, sursa: 'client' | 'server', mesaj: string, rezolvat: boolean, cand: readonly Date[]): Promise<void> {
  const ap = (c: Date) => ({ cand: c, tip: 'randare', mesaj, stiva: `at f (${id.slice(0, 4)}.ts:1:2)`, build: `b-${id.slice(0, 4)}`, instanta: 'local', adresa: '/', browser: 'Edge', uid: 'om1', context: '' });
  await scrie(`errorLogs/${id}`, {
    schema: 1, amprenta: id, sursa, tip: 'randare', mesaj, numar: cand.length, oameni: ['om1'], primaData: cand[cand.length - 1] ?? new Date(),
    ultimaData: cand[0] ?? new Date(), rezolvat, ultima: ap(cand[0] ?? new Date()),
  });
  for (const [k, c] of cand.entries()) await scrie(`errorLogs/${id}/aparitii/a${k}`, ap(c));
}

const ACUM = Date.now();
const CAND_G1 = [new Date(ACUM - 60_000), new Date(ACUM - 120_000), new Date(ACUM - 2 * ZI)];

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9095/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' });
  await grup(G1, 'client', 'TypeError: c.puncte is undefined', false, CAND_G1);
  await grup(G2, 'server', 'FirebaseError: permission-denied', false, [new Date(ACUM - ZI)]);
  await grup(G3, 'client', 'RangeError: vechi', true, [new Date(ACUM - 20 * ZI)]);
});

async function intraCuRolul(page: Page, rol: string): Promise<void> {
  await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  await page.goto('/admin');
  const [fereastra] = await Promise.all([page.waitForEvent('popup'), page.locator('[data-admin="intra"]').click()]);
  await fereastra.waitForLoadState();
  await fereastra.locator('#add-account-button').click();
  await fereastra.locator('#autogen-button').click();
  await fereastra.locator('#sign-in').click();
  await expect(page.locator('[data-admin="fara-rol"]')).toBeVisible(PORNIRE);
  const uid = (await page.locator('[data-admin="uid"]').textContent()) ?? '';
  await scrie(`staff/${uid}`, { rol });
  await page.locator('[data-admin="reincearca"]').click();
}

const bara = (page: Page, fila: string) => page.locator(`[data-admin="bara"] [data-fila="${fila}"]`);

test('Erori: lista în stânga, eroarea aleasă în dreapta fără să împingă lista; numerele, sursa, graficul pe 14 zile, marcarea', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.setViewportSize({ width: 1280, height: 800 });
  await intraCuRolul(page, 'owner');
  await bara(page, 'erori').click();

  // Nerezolvate: G1 (cea mai recentă) și G2; prima e aleasă, iar detaliul ei stă alături.
  await expect(page.locator('[data-grup]')).toHaveCount(2, LENT);
  await expect(page.locator('[data-filtru="nerezolvate"]')).toContainText('(2)');
  await expect(page.locator('[data-filtru="toate"]')).toContainText('(3)');
  await expect(page.locator(`[data-grup="${G1}"]`)).toHaveAttribute('data-ales', 'true');
  const detaliu = page.locator('[data-admin="detaliu-eroare"]');
  await expect(detaliu).toContainText('TypeError: c.puncte is undefined');
  await expect(detaliu).toContainText('b-aaaa');
  await expect(detaliu.locator('.admin-aparitii li')).toHaveCount(3);
  const lista = await page.locator('[data-admin="lista-erori"]').boundingBox();
  const cutie = await detaliu.boundingBox();
  expect(lista && cutie && cutie.x >= lista.x + lista.width).toBe(true);
  // Textul rândurilor pornește din stânga (bancul, 18.11: regula globală a butoanelor centra grila rândului).
  for (const rand of await page.locator('[data-grup] button').all()) {
    const b = await rand.boundingBox();
    const m = await rand.locator('.admin-grup-mesaj').boundingBox();
    expect(b && m && m.x - b.x < 20).toBe(true);
  }

  // Graficul: o bară pe fiecare zi cu apariții (din aparițiile citite), cu totalul în eticheta lui.
  const zileCu = new Set(CAND_G1.map((d) => d.toDateString())).size;
  const grafic = detaliu.locator('[data-grafic="aparitii"]');
  await expect(grafic.locator('[data-zi]')).toHaveCount(zileCu);
  await expect(grafic).toHaveAttribute('aria-label', /\b3\b/);

  // Alegerea altei erori nu mută lista; cât se citesc aparițiile ei, detaliul nu le arată pe ale celei de dinainte.
  const r2 = page.locator(`[data-grup="${G2}"]`);
  const inainte = await r2.boundingBox();
  let elibereaza = (): void => {};
  const oprit = new Promise<void>((ok) => { elibereaza = ok; });
  // Pe cale, nu cu un glob: adresa are `?key=…` după `:runQuery` (18.11: globul nu se potrivea și proba trecea din noroc).
  const aparitiiG2 = (u: URL): boolean => u.pathname.endsWith(`/errorLogs/${G2}:runQuery`);
  let tinute = 0;
  await page.route(aparitiiG2, async (r) => { tinute += 1; await oprit; await r.continue(); });
  await r2.click();
  await expect(r2).toHaveAttribute('data-ales', 'true');
  await expect(detaliu).toContainText('FirebaseError: permission-denied');
  await expect.poll(() => tinute, { message: 'citirea aparițiilor lui G2 e ținută' }).toBe(1);
  await expect(detaliu.locator('[data-schita]')).toBeVisible();
  await expect(detaliu.locator('.admin-aparitii li')).toHaveCount(0);
  elibereaza();
  await expect(detaliu.locator('.admin-aparitii li')).toHaveCount(1);
  await page.unroute(aparitiiG2);
  expect(await r2.boundingBox()).toEqual(inainte);

  // Filtrul pe sursă, pe ce s-a citit; „Toate” aduce și grupul rezolvat.
  await page.locator('[data-filtru-sursa="server"]').click();
  await expect(page.locator('[data-grup]')).toHaveCount(1);
  await expect(page.locator(`[data-grup="${G2}"]`)).toBeVisible();
  await page.locator('[data-filtru-sursa="client"]').click();
  await expect(page.locator('[data-grup]')).toHaveCount(1);
  await expect(page.locator(`[data-grup="${G1}"]`)).toHaveAttribute('data-ales', 'true');
  await page.locator('[data-filtru="toate"]').click();
  await expect(page.locator('[data-grup]')).toHaveCount(2);
  await expect(page.locator(`[data-grup="${G3}"]`)).toHaveAttribute('data-rezolvat', 'true');
  await page.locator('[data-filtru-sursa="toate"]').click();
  await expect(page.locator('[data-grup]')).toHaveCount(3);
  // Aleasă rămâne cea văzută (G1), nu sare înapoi pe G2, ascunsă între timp de filtru.
  await expect(page.locator(`[data-grup="${G1}"]`)).toHaveAttribute('data-ales', 'true');
  await expect(page.locator('[data-grup][data-ales="true"]')).toHaveCount(1);
  // G3, cu aparițiile mai vechi de 14 zile: în locul axei goale, propoziția; aparițiile, dedesubt.
  await page.locator(`[data-grup="${G3}"]`).click();
  await expect(detaliu.locator('[data-grafic="gol"]')).toBeVisible();
  await expect(detaliu.locator('[data-grafic="aparitii"]')).toHaveCount(0);
  await expect(detaliu.locator('.admin-aparitii li')).toHaveCount(1);

  // Marcarea, din detaliu.
  await page.locator('[data-filtru="nerezolvate"]').click();
  await page.locator(`[data-grup="${G1}"]`).click();
  await detaliu.locator('[data-admin="marcheaza"]').click();
  await expect(page.locator('[data-grup]')).toHaveCount(1, LENT);
  await expect(page.locator('[data-filtru="nerezolvate"]')).toContainText('(1)');

  // Sub 800 px, eroarea aleasă trece sub listă, fără nimic ieșit din ecran.
  await page.setViewportSize({ width: 700, height: 800 });
  const sus = await page.locator('[data-admin="lista-erori"]').boundingBox();
  const jos = await detaliu.boundingBox();
  expect(sus && jos && jos.y >= sus.y + sus.height).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(erori).toEqual([]);
});

test('Diagnoza: sumarul (Bine, Atenție, Eșec) deasupra, problemele întâi, ora verificării', async ({ page }) => {
  await intraCuRolul(page, 'owner');
  await bara(page, 'diagnoza').click();
  await expect(page.locator('[data-verificare="functii"]')).toBeVisible(LENT);
  const stari = await page.locator('[data-verificare]').evaluateAll((x) => x.map((e) => e.getAttribute('data-stare') ?? ''));
  const rang = (s: string) => (s === 'esec' ? 0 : s === 'atentie' ? 1 : 2);
  expect(stari.map(rang)).toEqual(stari.map(rang).toSorted((a, b) => a - b));
  expect(stari.some((s) => s === 'atentie' || s === 'esec')).toBe(true);
  for (const s of ['bine', 'atentie', 'esec'] as const) {
    await expect(page.locator(`[data-diag-sumar="${s}"] strong`)).toHaveText(String(stari.filter((x) => x === s).length));
  }
  await expect(page.locator('[data-admin="verificat-la"]')).toBeVisible();
});

test('un rol care doar citește erorile: detaliul și graficul, fără marcare; fără Diagnoză', async ({ page }) => {
  await scrie(`roluri/${ROL}`, { nume: 'Citește erorile', permisiuni: ['erori.citeste'] });
  await intraCuRolul(page, ROL);
  await bara(page, 'erori').click();
  const detaliu = page.locator('[data-admin="detaliu-eroare"]');
  await expect(detaliu).toContainText('TypeError: c.puncte is undefined', LENT);
  await expect(detaliu.locator('[data-grafic="aparitii"]')).toBeVisible();
  await expect(detaliu.locator('[data-admin="marcheaza"]')).toHaveCount(0);
  await expect(bara(page, 'diagnoza')).toHaveCount(0);
});
