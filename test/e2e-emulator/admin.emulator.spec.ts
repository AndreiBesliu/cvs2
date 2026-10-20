import { expect, test, type Page } from '@playwright/test';

/**
 * Pagina `/admin` cap-coadă, pe emulatoare (ADR 0040): login-ul Google al emulatorului de Auth, contul fără rol (uid-ul),
 * rolul din `staff/{uid}`, fila Erori (filtrul, detaliul, aparițiile, „Marchează rezolvată” prin callable, cu auditul),
 * Diagnoza (instanța, App Check de probă, cifra nerezolvatelor, funcția care răspunde 401 fără App Check).
 */

const PROIECT = 'demo-cncvs2';
const FS = `http://127.0.0.1:8085/v1/projects/${PROIECT}/databases/(default)/documents`;
const CONFIG = {
  instanta: 'local',
  firebase: { apiKey: 'demo-cheie', authDomain: `${PROIECT}.firebaseapp.com`, projectId: PROIECT, appId: '1:1:web:1' },
  emulatoare: { auth: 'http://127.0.0.1:9095', firestore: '127.0.0.1:8085', functions: '127.0.0.1:5005' },
};
/** Un rol custom (ADR 0049): citește și rezolvă erorile, vede Diagnoza. */
const SUPORT = 'RSuport0000000000000';
const G1 = '1'.repeat(32);
const G2 = '2'.repeat(32);

/** O valoare JS în forma REST a Firestore. */
function val(x: unknown): unknown {
  if (x === null) return { nullValue: null };
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(val) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(x as object).map(([k, v]) => [k, val(v)])) } };
}

/** Scrie un document ocolind regulile („Bearer owner” e cheia de administrare a emulatorului). */
async function scrie(cale: string, d: Record<string, unknown>): Promise<void> {
  const r = await fetch(`${FS}/${cale}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, val(v)])) }),
  });
  expect(r.status, await r.clone().text()).toBe(200);
}

async function citeste(cale: string): Promise<Record<string, { booleanValue?: boolean; stringValue?: string }>> {
  const r = await fetch(`${FS}/${cale}`, { headers: { Authorization: 'Bearer owner' } });
  return ((await r.json()) as { fields: Record<string, { booleanValue?: boolean }> }).fields;
}

async function cate(colectie: string): Promise<number> {
  const r = await fetch(`${FS}/${colectie}`, { headers: { Authorization: 'Bearer owner' } });
  return ((await r.json()) as { documents?: unknown[] }).documents?.length ?? 0;
}

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9095/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' });
  const ultima = { cand: new Date('2026-10-16T11:00:00Z'), tip: 'randare', mesaj: 'piesa 12 lipsă', stiva: 'at a (index.js:1:2)', build: 'b-proba', instanta: 'local', adresa: 'http://localhost/', browser: 'Edge', uid: 'om1', context: '' };
  await scrie(`errorLogs/${G1}`, {
    schema: 1, amprenta: G1, sursa: 'client', tip: 'randare', mesaj: 'piesa 12 lipsă', numar: 3, oameni: ['om1', 'om2'],
    primaData: new Date('2026-10-16T09:00:00Z'), ultimaData: new Date('2026-10-16T11:00:00Z'), rezolvat: false, ultima,
  });
  await scrie(`errorLogs/${G1}/aparitii/a1`, ultima);
  // Marcajul unui job (ADR 0041): verificarea a reușit acum o oră; backupZilnic n-are marcaj (n-a rulat niciodată).
  const oraTrecuta = new Date(Date.now() - 3_600_000);
  await scrie('marcaje/verificaBackup', { schema: 1, job: 'verificaBackup', ultimaPornire: oraTrecuta, ultimulFinal: oraTrecuta, ultimulSucces: oraTrecuta, esecuriLaRand: 0, ultimaEroare: null });
  await scrie(`errorLogs/${G2}`, {
    schema: 1, amprenta: G2, sursa: 'server', tip: 'job:x', mesaj: 'vechi', numar: 1, oameni: [],
    primaData: new Date('2026-10-10T09:00:00Z'), ultimaData: new Date('2026-10-10T09:00:00Z'), rezolvat: true, ultima: { mesaj: 'vechi' },
  });
});

async function deschideCuConfig(page: Page): Promise<void> {
  await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  await page.goto('/admin');
}

/** Login-ul Google al emulatorului de Auth: un cont nou, cu datele generate. */
async function intra(page: Page): Promise<void> {
  const [fereastra] = await Promise.all([page.waitForEvent('popup'), page.locator('[data-admin="intra"]').click()]);
  await fereastra.waitForLoadState();
  await fereastra.locator('#add-account-button').click();
  await fereastra.locator('#autogen-button').click();
  await fereastra.locator('#sign-in').click();
}

test('fără rol: uid-ul și pasul owner-ului; cu rolul din staff: filele', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await deschideCuConfig(page);
  await intra(page);
  // Fără document de personal, pagina încearcă întâi invitația (primul callable după pornirea emulatorului trece de 5 s).
  await expect(page.locator('[data-admin="fara-rol"]')).toBeVisible({ timeout: 30_000 });
  const uid = (await page.locator('[data-admin="uid"]').textContent()) ?? '';
  expect(uid).toMatch(/^\w{20,}$/);
  await expect(page.locator('[data-fila="erori"]')).toHaveCount(0);

  await scrie(`staff/${uid}`, { rol: 'owner' });
  await page.locator('[data-admin="reincearca"]').click();
  await expect(page.locator('[data-fila="erori"]')).toBeVisible();
  await expect(page.locator('[data-admin="cont"]')).toContainText('owner');
  expect(erori).toEqual([]);
});

test('fila Erori: filtrul, detaliul și „Marchează rezolvată”, cu auditul; Diagnoza după', async ({ page }) => {
  await deschideCuConfig(page);
  await intra(page);
  const uid = (await page.locator('[data-admin="uid"]').textContent()) ?? '';
  await scrie(`roluri/${SUPORT}`, { nume: 'Suport', permisiuni: ['erori.citeste', 'erori.rezolva', 'diagnoza.citeste'] });
  await scrie(`staff/${uid}`, { rol: SUPORT });
  await page.locator('[data-admin="reincearca"]').click();

  // Nerezolvate: doar G1; toate: amândouă, cea mai recentă întâi.
  await expect(page.locator('[data-grup]')).toHaveCount(1);
  await expect(page.locator(`[data-grup="${G1}"]`)).toContainText('piesa 12 lipsă');
  await page.locator('[data-filtru="toate"]').click();
  await expect(page.locator('[data-grup]')).toHaveCount(2);
  await expect(page.locator('[data-grup]').first()).toHaveAttribute('data-grup', G1);
  await page.locator('[data-filtru="nerezolvate"]').click();
  await expect(page.locator('[data-grup]')).toHaveCount(1);

  const g1 = page.locator(`[data-grup="${G1}"]`);
  await g1.locator('button[aria-expanded]').click();
  await expect(g1).toContainText('b-proba');
  await expect(g1.locator('.admin-aparitii li')).toHaveCount(1);
  await expect(g1.locator('[data-admin="fara-appcheck"]')).toHaveCount(0);

  await g1.locator('[data-admin="marcheaza"]').click();
  // Primul apel al unui callable după pornirea (sau reîncărcarea) emulatorului de funcții trece de 5 s: termen mai lung.
  await expect(page.locator('[data-admin="gol"]')).toBeVisible({ timeout: 30_000 });
  expect((await citeste(`errorLogs/${G1}`))['rezolvat']?.booleanValue).toBe(true);
  expect(await cate('audit')).toBe(1);

  await page.locator('[data-fila="diagnoza"]').click();
  await expect(page.locator('[data-verificare="functii"]')).toHaveAttribute('data-stare', 'bine');
  await expect(page.locator('[data-verificare="nerezolvate"]')).toHaveAttribute('data-stare', 'bine');
  await expect(page.locator('[data-verificare="instanta"]')).toHaveAttribute('data-stare', 'bine');
  await expect(page.locator('[data-verificare="appcheck"]')).toHaveAttribute('data-stare', 'info');
  await expect(page.locator('[data-verificare="job:verificaBackup"]')).toHaveAttribute('data-stare', 'bine');
  await expect(page.locator('[data-verificare="job:backupZilnic"]')).toHaveAttribute('data-stare', 'atentie');
});

test('un om fără cont nu vede nimic: doar butonul de intrare', async ({ page }) => {
  await deschideCuConfig(page);
  await expect(page.locator('[data-admin="intra"]')).toBeVisible();
  await expect(page.locator('[data-grup]')).toHaveCount(0);
});
