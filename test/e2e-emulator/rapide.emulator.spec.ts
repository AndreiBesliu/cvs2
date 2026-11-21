import { expect, test, type Page } from '@playwright/test';

/**
 * Răspunsurile rapide ale tichetelor (ADR 0261, felia A.3), pe emulatoare: owner-ul le scrie în fila Setări (pornind de la
 * exemplele schiței: schimbă, șterge, mută, o etichetă la fel e oprită), le salvează prin callable (documentul, versiunea,
 * rândul de audit) și le pune în câmp în fila Tichete, la cursor, în limba raportării; o salvare pe o versiune veche e
 * refuzată cu motivul. Un rol care răspunde le folosește, fără legătura spre Setări; unul care doar citește nu le citește.
 */

test.use({ locale: 'ro-RO' });
// Primul callable după pornirea emulatorului de funcții (invitația, la intrare) poate trece de 30 s sub încărcare.
test.describe.configure({ timeout: 120_000 });
const PORNIRE = { timeout: 60_000 };
const LENT = { timeout: 30_000 };

const PROIECT = 'demo-cncvs2';
const BAZA = `http://127.0.0.1:8085/v1/projects/${PROIECT}/databases/(default)/documents`;
const CONFIG = {
  instanta: 'local',
  firebase: { apiKey: 'demo-cheie', authDomain: `${PROIECT}.firebaseapp.com`, projectId: PROIECT, appId: '1:1:web:1' },
  emulatoare: { auth: 'http://127.0.0.1:9095', firestore: '127.0.0.1:8085', functions: '127.0.0.1:5005' },
};
const ROL = 'RRapide0000000000000';
const T = (k: number): string => `TichetRapid${k}`.padEnd(20, '0');
const PRIMIT_RO = 'Mulțumim pentru raportare! Am primit-o și ne uităm la ea. Revenim aici cu un răspuns.';
const PRIMIT_EN = 'Thank you for the report! We received it and are looking into it. We will reply here.';
const REPARAT_RO = 'Am reparat problema în versiunea nouă a aplicației. Reîncarcă pagina ca s-o primești, apoi spune-ne dacă mai apare.';

interface Valoare {
  stringValue?: string; integerValue?: string; nullValue?: null;
  arrayValue?: { values?: Valoare[] }; mapValue?: { fields: Record<string, Valoare> };
}

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
  const r = await fetch(`${BAZA}/${cale}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, val(v)])) }),
  });
  expect(r.status, await r.clone().text()).toBe(200);
}

async function citeste(cale: string): Promise<Record<string, Valoare> | null> {
  const r = await fetch(`${BAZA}/${cale}`, { headers: { Authorization: 'Bearer owner' } });
  return r.status === 200 ? ((await r.json()) as { fields: Record<string, Valoare> }).fields : null;
}

async function documente(cale: string): Promise<Array<Record<string, Valoare>>> {
  const r = await fetch(`${BAZA}/${cale}`, { headers: { Authorization: 'Bearer owner' } });
  return ((await r.json()) as { documents?: Array<{ fields: Record<string, Valoare> }> }).documents?.map((d) => d.fields) ?? [];
}

const lista = (v: Valoare | undefined): Array<[string, string, string]> => (v?.arrayValue?.values ?? []).map((x) => {
  const f = x.mapValue?.fields ?? {};
  return [f['eticheta']?.stringValue ?? '', f['ro']?.stringValue ?? '', f['en']?.stringValue ?? ''];
});

async function tichet(k: number, limba: 'ro' | 'en', ore: number): Promise<void> {
  const creatLa = new Date(Date.now() - ore * 3_600_000);
  await scrie(`tichete/${T(k)}`, {
    schema: 1, fel: 'problema', text: `Raportarea ${k}, în ${limba}.`, autor: `client${k}`, autorEmail: `client${k}@exemplu.ro`, creatLa,
    modificatLa: creatLa, stare: 'nou', raspunsuri: [], rezolvatLa: null, versiune: 1, amprente: [], necititeAutor: 0, ultimulRaspunsLa: null,
    aplicatia: { versiune: 'b-proba', instanta: 'local', limba, browser: 'Edge', plan: 'gratuit' },
  });
}

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9095/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' });
  await tichet(1, 'ro', 1);
  await tichet(2, 'en', 2);
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

test('owner-ul: răspunsurile rapide scrise în Setări, salvate cu auditul, puse la cursor în Tichete, în limba raportării', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await intraCuRolul(page, 'owner');
  await bara(page, 'setari').click();
  const sectiune = page.locator('[data-set="rapide"]');
  const rand = (k: number) => sectiune.locator(`[data-rapid-rand="${k}"]`);
  const salveaza = sectiune.locator('[data-set="rapide-salveaza"]');

  // Nimic salvat: lista goală, cu exemplele schiței la un clic (puse în câmpuri, nesalvate).
  await expect(sectiune.locator('[data-set="rapide-gol"]')).toBeVisible(LENT);
  await expect(salveaza).toBeDisabled();
  await sectiune.locator('[data-set="rapide-exemple"]').click();
  await expect(sectiune.locator('[data-rapid-rand]')).toHaveCount(3);
  await expect(sectiune.locator('[data-set="rapide-numar"]')).toHaveText('3 din 12');
  await expect(sectiune.locator('[data-set="rapide-nesalvate"]')).toBeVisible();
  await expect(rand(0).locator('[data-set="rapid-eticheta"]')).toBeFocused();

  // Schimbă, șterge, mută: „Reparat” (fără engleză) urcă primul; „Ne trebuie pașii” pleacă.
  await rand(1).locator('[data-set="rapid-eticheta"]').fill('Reparat');
  await rand(1).locator('[data-set="rapid-en"]').fill('');
  await rand(2).locator('[data-set="rapid-sterge"]').click();
  await rand(1).locator('[data-set="rapid-sus"]').click();
  await expect(rand(0).locator('[data-set="rapid-eticheta"]')).toHaveValue('Reparat');
  await expect(rand(1).locator('[data-set="rapid-eticheta"]')).toHaveValue('Am primit, ne uităm');
  // Urcat primul, „↑” lui se oprește: focusul trece pe „↓” al aceluiași rând, nu se pierde.
  await expect(rand(0).locator('[data-set="rapid-jos"]')).toBeFocused();
  // O etichetă la fel (fără majuscule) e spusă și oprește salvarea.
  await rand(1).locator('[data-set="rapid-eticheta"]').fill('REPARAT');
  await expect(rand(1).locator('[data-set="rapid-probleme"]')).toContainText('Alt răspuns are deja eticheta asta');
  await expect(salveaza).toBeDisabled();
  await rand(1).locator('[data-set="rapid-eticheta"]').fill('Am primit, ne uităm');
  await expect(sectiune.locator('[data-set="rapid-probleme"]')).toHaveCount(0);

  await salveaza.click();
  await expect(sectiune.locator('[data-set="rapide-gata"]')).toHaveText('Răspunsurile rapide sunt salvate.', LENT);
  await expect(sectiune.locator('[data-set="rapide-modificate"]')).toBeVisible();
  await expect(sectiune.locator('[data-set="rapide-nesalvate"]')).toHaveCount(0);
  // Editorul arată lista salvată (nu pe cea de dinainte de salvare, citită încă).
  await expect(sectiune.locator('[data-rapid-rand]')).toHaveCount(2);
  await expect(rand(0).locator('[data-set="rapid-eticheta"]')).toHaveValue('Reparat');
  const d = await citeste('setari/raspunsuriRapide');
  expect([d?.['versiune']?.integerValue, lista(d?.['lista'])]).toEqual(['1', [['Reparat', REPARAT_RO, ''], ['Am primit, ne uităm', PRIMIT_RO, PRIMIT_EN]]]);
  const randuri = (await documente('audit')).filter((x) => x['actiune']?.stringValue === 'setari.raspunsuriRapide');
  expect(randuri.map((x) => [x['tinta']?.stringValue, 'nullValue' in (x['inainte'] ?? {}), lista(x['dupa']).length])).toEqual([['setari/raspunsuriRapide', true, 2]]);

  // În Tichete: butoanele, în ordinea listei, cu legătura spre Setări; textul pus la cursor, în limba raportării.
  await bara(page, 'tichete').click();
  const detaliu = page.locator('[data-tic="detaliu"]');
  await expect(detaliu).toHaveAttribute('data-tic-ales', T(1), LENT);
  await expect(detaliu.locator('[data-rapid]')).toHaveText(['Reparat', 'Am primit, ne uităm']);
  await expect(detaliu.locator('[data-tic="rapide-setari"]')).toBeVisible();
  const camp = detaliu.locator('[data-tic="raspuns-text"]');
  await camp.fill('Bună,');
  await detaliu.locator('[data-rapid="Am primit, ne uităm"]').click();
  await expect(camp).toHaveValue(`Bună,\n\n${PRIMIT_RO}`);
  await expect(camp).toBeFocused();
  // Cursorul, la începutul câmpului: textul intră acolo, cu un rând gol după, fără să șteargă nimic.
  await camp.evaluate((el: HTMLTextAreaElement) => { el.setSelectionRange(0, 0); });
  await detaliu.locator('[data-rapid="Reparat"]').click();
  await expect(camp).toHaveValue(`${REPARAT_RO}\n\nBună,\n\n${PRIMIT_RO}`);
  // Raportarea în engleză: textul în engleză; unde lipsește engleza, cel în română.
  await page.locator(`[data-tichet="${T(2)}"] button`).click();
  await expect(detaliu).toHaveAttribute('data-tic-ales', T(2));
  await detaliu.locator('[data-rapid="Am primit, ne uităm"]').click();
  await detaliu.locator('[data-rapid="Reparat"]').click();
  await expect(camp).toHaveValue(`${PRIMIT_EN}\n\n${REPARAT_RO}`);

  // Legătura duce în Setări; o salvare pe o versiune veche (altă filă a browserului a salvat între timp) e refuzată.
  await detaliu.locator('[data-tic="rapide-setari"]').click();
  await expect(bara(page, 'setari')).toHaveAttribute('aria-current', 'page');
  await expect(rand(0).locator('[data-set="rapid-eticheta"]')).toHaveValue('Reparat', LENT);
  await scrie('setari/raspunsuriRapide', { schema: 1, lista: [{ eticheta: 'Din altă filă', ro: 'Text.', en: '' }], versiune: 2 });
  await rand(0).locator('[data-set="rapid-eticheta"]').fill('Reparat azi');
  await salveaza.click();
  await expect(sectiune.locator('[data-set="rapide-eroare"]')).toContainText('s-au schimbat de când le-ai deschis', LENT);
  expect(lista((await citeste('setari/raspunsuriRapide'))?.['lista'])).toEqual([['Din altă filă', 'Text.', '']]);
  expect(erori).toEqual([]);
});

test('un rol care răspunde le folosește, fără legătura spre Setări; unul care doar citește nici nu le citește', async ({ page, browser }) => {
  await scrie('setari/raspunsuriRapide', { schema: 1, lista: [{ eticheta: 'Am primit, ne uităm', ro: PRIMIT_RO, en: PRIMIT_EN }], versiune: 1 });
  await scrie(`roluri/${ROL}`, { nume: 'Suport', permisiuni: ['tichete.raspunde'] });
  await intraCuRolul(page, ROL);
  await expect(bara(page, 'setari')).toHaveCount(0);
  await bara(page, 'tichete').click();
  const detaliu = page.locator('[data-tic="detaliu"]');
  await expect(detaliu.locator('[data-rapid]')).toHaveText(['Am primit, ne uităm'], LENT);
  await expect(detaliu.locator('[data-tic="rapide-setari"]')).toHaveCount(0);
  await detaliu.locator('[data-rapid="Am primit, ne uităm"]').click();
  await expect(detaliu.locator('[data-tic="raspuns-text"]')).toHaveValue(PRIMIT_RO);

  // Doar citirea: fără câmp, fără butoane și fără nicio cerere spre `setari`.
  const ctx = await browser.newContext({ baseURL: 'http://localhost:4173', locale: 'ro-RO', bypassCSP: true, serviceWorkers: 'block' });
  const altul = await ctx.newPage();
  await scrie('roluri/RCiteste000000000000', { nume: 'Citește', permisiuni: ['tichete.citeste'] });
  // Și în corpul cererii: un document se citește prin `documents:batchGet`, cu calea lui în corp (21.11: otrava E22 trecea).
  let setari = 0;
  altul.on('request', (r) => { if (`${r.url()} ${r.postData() ?? ''}`.includes('raspunsuriRapide')) setari += 1; });
  await intraCuRolul(altul, 'RCiteste000000000000');
  await bara(altul, 'tichete').click();
  const d2 = altul.locator('[data-tic="detaliu"]');
  await expect(d2.locator('[data-tic="doar-citire"]')).toBeVisible(LENT);
  await expect(d2.locator('[data-tic="rapide"]')).toHaveCount(0);
  expect(setari).toBe(0);
  await ctx.close();
});
