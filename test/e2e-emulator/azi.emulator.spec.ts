import { expect, test, type Page, type Request } from '@playwright/test';

/**
 * Carcasa paginii `/admin` cap-coadă, pe emulatoare (ADR 0260 §1 și completarea din 13.11, felia A.1): fila Azi întâi, cu
 * cifrele, joburile, „Ce așteaptă de la tine” și ultimele întâmplări, fiecare rând spre fila lui; bara laterală grupată, cu
 * numerele și punctul Diagnozei; insigna instanței; căutarea în ce s-a citit; un rol parțial nu vede (și nici nu citește)
 * cifrele filelor pe care nu le are; intrarea și „fără rol” în card; lista goală, eroarea citirii, rândurile schițate.
 */

test.use({ locale: 'ro-RO' });
// Fiecare probă intră de la capăt; primul callable după pornirea emulatorului de funcții (invitația, la intrare) a trecut de
// 30 s cu alte sesiuni la teste pe mașină (17.11): „fără rol” are termenul lui, iar proba, încă o dată pe atât.
test.describe.configure({ timeout: 120_000 });
const PORNIRE = { timeout: 60_000 };

const PROIECT = 'demo-cncvs2';
const FS = `http://127.0.0.1:8085/v1/projects/${PROIECT}/databases/(default)/documents`;
const CONFIG = {
  instanta: 'local',
  firebase: { apiKey: 'demo-cheie', authDomain: `${PROIECT}.firebaseapp.com`, projectId: PROIECT, appId: '1:1:web:1' },
  emulatoare: { auth: 'http://127.0.0.1:9095', firestore: '127.0.0.1:8085', functions: '127.0.0.1:5005' },
};
const LENT = { timeout: 30_000 };
const ROL = 'RPartial000000000000';
const G1 = '1'.repeat(32);
const G2 = '2'.repeat(32);
const T = (k: number): string => `Tichet${k}`.padEnd(20, '0');
const S = (k: number): string => `Sugestie${k}`.padEnd(20, '0');
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

/** Scrie un document ocolind regulile („Bearer owner” e cheia de administrare a emulatorului). */
async function scrie(cale: string, d: Record<string, unknown>): Promise<void> {
  const r = await fetch(`${FS}/${cale}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, val(v)])) }),
  });
  expect(r.status, await r.clone().text()).toBe(200);
}

async function golesteEmulatoarele(): Promise<void> {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9095/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' });
}

async function grupEroare(id: string, mesaj: string, rezolvat: boolean, marcatLa: Date | null = null): Promise<void> {
  const ultima = { cand: new Date('2026-11-16T11:00:00Z'), tip: 'randare', mesaj, stiva: '', build: 'b-proba', instanta: 'local', adresa: '', browser: 'Edge', uid: 'om1', context: '' };
  await scrie(`errorLogs/${id}`, {
    schema: 1, amprenta: id, sursa: 'client', tip: 'randare', mesaj, numar: 2, oameni: ['om1'], primaData: new Date('2026-11-15T09:00:00Z'),
    ultimaData: new Date('2026-11-16T11:00:00Z'), rezolvat, ultima, ...(marcatLa ? { marcatLa, marcatDe: 'om0' } : {}),
  });
}

async function tichet(k: number, stare: 'nou' | 'deschis' | 'rezolvat', autorEmail: string, text: string): Promise<void> {
  const creatLa = new Date(Date.now() - k * 3_600_000);
  await scrie(`tichete/${T(k)}`, {
    schema: 1, fel: 'problema', text, autor: `client${k}`, autorEmail, creatLa, modificatLa: creatLa, stare, raspunsuri: [],
    rezolvatLa: stare === 'rezolvat' ? new Date('2026-11-16T18:40:00Z') : null, versiune: 1, amprente: [],
  });
}

async function sugestie(k: number, stare: string): Promise<void> {
  const la = new Date(Date.now() - k * 3_600_000);
  await scrie(`sugestii/${S(k)}`, {
    schema: 1, titlu: `Sugestia ${k}`, descriere: 'text', tip: 'idee', zona: 'admin', autor: 'om2', autorEmail: 'om2@exemplu.ro',
    creataLa: la, modificataLa: la, stare, nota: '', versiune: 1, ...(stare === 'noua' ? {} : { decisaLa: la }),
  });
}

/** Datele unei zile obișnuite: o eroare nerezolvată și una rezolvată, trei tichete (două noi), patru sugestii (trei fără decizie), două conturi (unul nou), un job cu marcaj, două rânduri de audit. */
async function oZi(): Promise<void> {
  await grupEroare(G1, 'piesa 12 lipsă', false);
  await grupEroare(G2, 'exportul vechi', true, new Date('2026-11-16T18:40:00Z'));
  await tichet(1, 'nou', 'ana@exemplu.ro', 'Exportul se oprește la 40 %');
  await tichet(2, 'nou', 'dan@exemplu.ro', 'Nu se deschide proiectul');
  await tichet(3, 'rezolvat', 'ion@exemplu.ro', 'Rezolvat demult');
  for (const k of [1, 2, 3]) await sugestie(k, 'noua');
  await sugestie(4, 'acceptata');
  await scrie('conturi/clientNou', { schema: 1, email: 'nou@exemplu.ro', nume: 'Nou', creatLa: new Date(Date.now() - ZI), plan: 'proba' });
  await scrie('conturi/clientVechi', { schema: 1, email: 'vechi@exemplu.ro', nume: 'Vechi', creatLa: new Date(Date.now() - 30 * ZI), plan: 'gratuit' });
  const ora = new Date(Date.now() - 3_600_000);
  await scrie('marcaje/verificaBackup', { schema: 1, job: 'verificaBackup', ultimaPornire: ora, ultimulFinal: ora, ultimulSucces: ora, esecuriLaRand: 0, ultimaEroare: null });
  await scrie('audit/a1', { schema: 1, cand: new Date(Date.now() - 3_600_000), cine: 'client1', rol: null, actiune: 'tichete.raporteaza', tinta: `tichete/${T(1)}`, inainte: null, dupa: { fel: 'problema' } });
  await scrie('audit/a2', { schema: 1, cand: new Date(Date.now() - 7_200_000), cine: 'om0', rol: 'owner', actiune: 'sugestii.decide', tinta: `sugestii/${S(4)}`, inainte: null, dupa: { stare: 'acceptata', nota: '' } });
}

test.beforeEach(golesteEmulatoarele);

async function deschide(page: Page): Promise<void> {
  await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  await page.goto('/admin');
}

/** Login-ul Google al emulatorului de Auth (un cont nou), apoi rolul scris în `staff/{uid}` și „Verifică din nou”. */
async function intraCuRolul(page: Page, rol: string): Promise<string> {
  const [fereastra] = await Promise.all([page.waitForEvent('popup'), page.locator('[data-admin="intra"]').click()]);
  await fereastra.waitForLoadState();
  await fereastra.locator('#add-account-button').click();
  await fereastra.locator('#autogen-button').click();
  await fereastra.locator('#sign-in').click();
  await expect(page.locator('[data-admin="fara-rol"]')).toBeVisible(PORNIRE);
  const uid = (await page.locator('[data-admin="uid"]').textContent()) ?? '';
  await scrie(`staff/${uid}`, { rol });
  await page.locator('[data-admin="reincearca"]').click();
  return uid;
}

const bara = (page: Page, fila: string) => page.locator(`[data-admin="bara"] [data-fila="${fila}"]`);

test('owner: Azi întâi, cu cifrele, joburile, ce așteaptă și întâmplările; bara cu numerele și punctul; fiecare rând duce în fila lui', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  // Și consola, până la fila Diagnoză: rezumatul de la intrare nu face sonda funcțiilor (refuzată cu 401, pe care browserul
  // o scrie în consolă); fila o face.
  const consola: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consola.push(m.text()); });
  await oZi();
  await deschide(page);
  await intraCuRolul(page, 'owner');

  await expect(bara(page, 'azi')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-admin="azi"]')).toBeVisible();
  await expect(page.locator('[data-insigna]')).toHaveAttribute('data-insigna', 'alta');
  await expect(page.locator('[data-insigna]')).toHaveText('LOCAL');
  // Grupurile, în ordinea din ADR, și Contul meu la capăt.
  await expect(page.locator('[data-admin="bara"] [data-grup-bara]')).toHaveText(['Probleme', 'Produs', 'Clienți', 'Echipa']);
  await expect(page.locator('[data-admin="bara"] [data-fila]')).toHaveCount(11);
  await expect(page.locator('[data-admin="bara"] [data-fila]').last()).toHaveAttribute('data-fila', 'cont');

  // Cifrele: aceleași în bară și pe cartele.
  await expect(bara(page, 'erori').locator('[data-numar]')).toHaveText('1', LENT);
  await expect(bara(page, 'tichete').locator('[data-numar]')).toHaveText('2');
  await expect(bara(page, 'sugestii').locator('[data-numar]')).toHaveText('3');
  await expect(bara(page, 'utilizatori').locator('[data-numar]')).toHaveCount(0);
  await expect(page.locator('[data-azi="erori"] [data-cifra]')).toHaveText('1');
  await expect(page.locator('[data-azi="tichete"] [data-cifra]')).toHaveText('2');
  await expect(page.locator('[data-azi="sugestii"] [data-cifra]')).toHaveText('3');
  await expect(page.locator('[data-azi="conturi"] [data-cifra]')).toHaveText('1');

  // Joburile de noapte: toate trei, cu starea lor (doar verificarea are marcaj).
  await expect(page.locator('[data-azi-job]')).toHaveCount(3, LENT);
  await expect(page.locator('[data-azi-job="verificaBackup"]')).toHaveAttribute('data-stare', 'bine');
  await expect(page.locator('[data-azi-job="backupZilnic"]')).toHaveAttribute('data-stare', 'atentie');
  // „Ce așteaptă de la tine” (din roadmap-ul build-ului) și ultimele întâmplări (din audit), cea mai nouă întâi.
  await expect(page.locator('[data-azi="asteapta"]')).toBeVisible();
  await expect(page.locator('[data-azi="asteapta"] [data-asteapta], [data-azi="asteapta"] [data-azi-gol]').first()).toBeVisible(LENT);
  await expect(page.locator('[data-intamplare]')).toHaveCount(2);
  await expect(page.locator('[data-intamplare]').first()).toHaveAttribute('data-intamplare', 'a1');
  expect(consola, 'intrarea și fila Azi, fără erori în consolă').toEqual([]);

  // Punctul Diagnozei = cea mai rea stare din fila ei, fără sonda funcțiilor (doar în filă).
  const punct = await bara(page, 'diagnoza').locator('[data-punct]').getAttribute('data-punct');
  await bara(page, 'diagnoza').click();
  // Sonda funcțiilor pornește la rece `logClientError`: sub încărcare (21.11, mai multe linii pe mașină) trece de 30 s.
  await expect(page.locator('[data-verificare="functii"]')).toBeVisible(PORNIRE);
  const fara = '[data-verificare]:not([data-verificare="functii"])';
  const rea = (await page.locator(`${fara}[data-stare="esec"]`).count()) > 0 ? 'esec'
    : (await page.locator(`${fara}[data-stare="atentie"]`).count()) > 0 ? 'atentie' : null;
  expect(punct).toBe(rea);

  // Fiecare rând duce în fila lui: o întâmplare a sugestiilor, o cartelă, un job.
  await bara(page, 'azi').click();
  await page.locator('[data-intamplare="a2"]').click();
  await expect(bara(page, 'sugestii')).toHaveAttribute('aria-current', 'page');
  await bara(page, 'azi').click();
  await page.locator('[data-azi="erori"]').click();
  await expect(bara(page, 'erori')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator(`[data-grup="${G1}"]`)).toBeVisible();
  await bara(page, 'azi').click();
  await page.locator('[data-azi-job="backupZilnic"]').click();
  await expect(bara(page, 'diagnoza')).toHaveAttribute('aria-current', 'page');
  // Pe telefon (până la A.7): bara deasupra, pe rânduri, iar nimic nu iese din ecran în dreapta.
  await bara(page, 'azi').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => {
    const iese = [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 0.5);
    return [document.documentElement.scrollWidth - window.innerWidth, ...iese.slice(0, 5).map((el) => `${el.tagName}.${el.className}`)];
  })).toEqual([0]);
  await page.setViewportSize({ width: 1280, height: 800 });
  // Contul meu, din bară și din meniul contului; ieșirea din meniu.
  await page.locator('[data-admin="meniu-cont"]').click();
  await page.locator('[data-admin="meniu-contul-meu"]').click();
  await expect(bara(page, 'cont')).toHaveAttribute('aria-current', 'page');
  await page.locator('[data-admin="meniu-cont"]').click();
  await page.locator('[data-admin="iesi"]').click();
  await expect(page.locator('[data-admin="intra"]')).toBeVisible();
  expect(erori).toEqual([]);
});

test('un rol cu o singură permisiune (Tichete: citește): Azi doar cu tichetele, fără nicio citire a celorlalte file', async ({ page }) => {
  await oZi();
  await scrie(`roluri/${ROL}`, { nume: 'Doar tichete', permisiuni: ['tichete.citeste'] });
  const citiri: string[] = [];
  page.on('request', (r: Request) => {
    if (r.url().includes('127.0.0.1:8085') && r.method() === 'POST') citiri.push(r.postData() ?? '');
  });
  await deschide(page);
  await intraCuRolul(page, ROL);

  await expect(bara(page, 'azi')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-azi="tichete"] [data-cifra]')).toHaveText('2', LENT);
  await expect(bara(page, 'tichete').locator('[data-numar]')).toHaveText('2');
  for (const parte of ['erori', 'sugestii', 'conturi', 'joburi', 'asteapta', 'intamplari']) {
    await expect(page.locator(`[data-azi="${parte}"]`)).toHaveCount(0);
  }
  const file = await page.locator('[data-admin="bara"] [data-fila]').evaluateAll((x) => x.map((e) => e.getAttribute('data-fila')));
  expect(file).toEqual(['azi', 'tichete', 'cont']);
  // Cifrele vin doar din ce poate vedea rolul: nicio cerere spre colecțiile celorlalte file.
  const straine = citiri.filter((c) => /"collectionId":"(errorLogs|sugestii|conturi|audit|marcaje)"/.test(c));
  expect(straine).toEqual([]);
  expect(citiri.some((c) => c.includes('"collectionId":"tichete"'))).toBe(true);
});

test('căutarea din antet găsește în ce s-a citit: o eroare și un tichet, fiecare deschis în fila lui', async ({ page }) => {
  await oZi();
  await deschide(page);
  await intraCuRolul(page, 'owner');
  const cauta = page.locator('[data-admin="cauta"]');

  // Nimic citit încă: căutarea spune ce n-a citit.
  await cauta.fill('piesa');
  await expect(page.locator('[data-admin="cauta-necitite"]')).toBeVisible();
  await expect(page.locator('[data-gasit]')).toHaveCount(0);

  await bara(page, 'erori').click();
  await expect(page.locator(`[data-grup="${G1}"]`)).toBeVisible(LENT);
  await bara(page, 'tichete').click();
  await expect(page.locator(`[data-tichet="${T(2)}"]`)).toBeVisible(LENT);
  await bara(page, 'azi').click();

  await cauta.fill('PIESA 12');
  await page.locator(`[data-gasit="erori:${G1}"]`).click();
  await expect(bara(page, 'erori')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator(`[data-grup="${G1}"]`)).toHaveAttribute('data-ales', 'true', LENT);
  await expect(page.locator('[data-admin="detaliu-eroare"]')).toContainText('piesa 12 lipsă');

  await cauta.fill('dan@');
  await page.locator(`[data-gasit="tichete:${T(2)}"]`).click();
  await expect(bara(page, 'tichete')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator(`[data-tichet="${T(2)}"]`)).toHaveAttribute('data-gasit-aici', 'true', LENT);
  await expect(page.locator(`[data-tichet="${T(2)}"]`)).toBeInViewport();
  // Felia A.3: tichetul găsit vine și ales, cu conversația lui în dreapta.
  await expect(page.locator(`[data-tichet="${T(2)}"]`)).toHaveAttribute('data-ales', 'true');
  await expect(page.locator('[data-tic="detaliu"]')).toHaveAttribute('data-tic-ales', T(2));
});

test('lista goală are semnul și ultima rezolvare; eroarea citirii, motivul și „Deschide Diagnoza”; cât se încarcă, rânduri schițate', async ({ page }) => {
  await grupEroare(G2, 'exportul vechi', true, new Date('2026-11-16T18:40:00Z'));
  await scrie(`roluri/${ROL}`, { nume: 'Suport', permisiuni: ['erori.citeste', 'diagnoza.citeste', 'tichete.citeste'] });
  await deschide(page);
  await intraCuRolul(page, ROL);

  await bara(page, 'erori').click();
  const gol = page.locator('[data-admin="gol"]');
  await expect(gol).toBeVisible(LENT);
  await expect(gol.locator('[data-semn]')).toBeVisible();
  await expect(gol.locator('[data-ultima]')).toContainText('16.11.2026');

  // Rândurile schițate: o citire ținută ține schița la vedere. Ruta e pe cale, nu un glob: adresa are `?key=…` după
  // `:runQuery` (21.11, A.3: globul de aici nu se potrivea, ca cel din A.2, iar schița se vedea doar dacă citirea întârzia).
  let elibereaza = (): void => {};
  const oprit = new Promise<void>((ok) => { elibereaza = ok; });
  const listaTichete = (u: URL): boolean => u.pathname.endsWith('/documents:runQuery');
  let tinute = 0;
  await page.route(listaTichete, async (r) => { tinute += 1; await oprit; await r.continue(); });
  await bara(page, 'tichete').click();
  await expect.poll(() => tinute, { message: 'citirea tichetelor e ținută' }).toBeGreaterThanOrEqual(1);
  await expect(page.locator('[data-schita]')).toBeVisible();
  elibereaza();
  await expect(page.locator('[data-tic="gol"]')).toBeVisible(LENT);
  await page.unroute(listaTichete);

  // Permisiunea scoasă din rol după intrare: citirea erorilor e refuzată; Diagnoza e la un clic.
  await scrie(`roluri/${ROL}`, { nume: 'Suport', permisiuni: ['diagnoza.citeste', 'tichete.citeste'] });
  await bara(page, 'erori').click();
  const eroare = page.locator('[data-admin="eroare-lista"]');
  await expect(eroare).toBeVisible(LENT);
  await expect(eroare).toContainText('permission-denied');
  await eroare.locator('[data-admin="deschide-diagnoza"]').click();
  await expect(bara(page, 'diagnoza')).toHaveAttribute('aria-current', 'page');
});

test('intrarea și „fără rol”: un card centrat, cu insigna instanței deasupra; fără rol, ce face omul', async ({ page }) => {
  await deschide(page);
  const intrare = page.locator('[data-admin="intrare"]');
  await expect(intrare).toBeVisible();
  await expect(page.locator('[data-insigna]')).toBeVisible();
  await expect(intrare.locator('[data-admin="intra"]')).toBeVisible();
  await expect(intrare.locator('[data-admin="intrare-parola"]')).toBeVisible();
  await expect(page.locator('[data-admin="bara"]')).toHaveCount(0);

  const [fereastra] = await Promise.all([page.waitForEvent('popup'), page.locator('[data-admin="intra"]').click()]);
  await fereastra.waitForLoadState();
  await fereastra.locator('#add-account-button').click();
  await fereastra.locator('#autogen-button').click();
  await fereastra.locator('#sign-in').click();
  const faraRol = page.locator('[data-admin="fara-rol"]');
  await expect(faraRol).toBeVisible(PORNIRE);
  await expect(faraRol.locator('[data-admin="fara-rol-pasi"]')).toContainText('invitație');
  await expect(faraRol.locator('[data-admin="uid"]')).toBeVisible();
  await expect(page.locator('[data-insigna]')).toBeVisible();
  await expect(page.locator('[data-admin="bara"]')).toHaveCount(0);
});
