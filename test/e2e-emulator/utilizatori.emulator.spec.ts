import { expect, test, type Page } from '@playwright/test';

/**
 * Filele Utilizatori și Setări (ADR 0116 §19, §20; felia 14.C↑b; așezarea Utilizatorilor: ADR 0260 §5, felia A.5) cap-coadă,
 * pe emulatoare, pe build-ul real: owner-ul vede conturile clienților într-un tabel, cele mai noi întâi, cu planul de acum,
 * filtrele pe plan (cu numere) și căutarea; contul ales stă alături, cu schimbarea planului și istoricul lui din audit; dă o
 * probă de 30 de zile unui cont expirat, planul gratuit, dezactivează și reactivează, iar documentul și auditul urmează; un
 * plan schimbat între timp e refuzat lângă formular. Setările: implicitele, apoi valorile noi, salvate pe server, cu istoricul
 * fiecărei setări sub butonul ei (ADR 0260 §9, felia A.6). Un rol care
 * doar citește conturile vede fila fără schimbări și fără istoric (nicio citire din audit). Un cont găsit de căutarea din
 * antet vine ales.
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
const rand = (page: Page, email: string) => page.locator(`tr[data-cont="${email}"]`);
const detaliu = (page: Page) => page.locator('[data-util="detaliu"]');
const filtru = (page: Page, plan: string) => page.locator(`[data-filtru-plan="${plan}"]`);
const aratate = (page: Page): Promise<(string | null)[]> => page.locator('tr[data-cont]').evaluateAll((l) => l.map((x) => x.getAttribute('data-cont')));
const pasi = (page: Page): Promise<(string | null)[]> => detaliu(page).locator('[data-pas]').evaluateAll((l) => l.map((x) => x.getAttribute('data-pas')));

/** Alege contul din tabel (panoul lui vine alături). */
async function alege(page: Page, email: string): Promise<void> {
  await rand(page, email).locator('[data-util="alege"]').click();
  await expect(rand(page, email)).toHaveAttribute('data-ales', 'true');
  await expect(detaliu(page).locator('h3')).toHaveText(email);
}

/** Schimbă planul contului din panoul lui. */
async function schimba(page: Page, email: string, fel: string, zile?: number): Promise<void> {
  await alege(page, email);
  await detaliu(page).locator('[data-util="schimbare"]').selectOption(fel);
  if (zile !== undefined) await detaliu(page).locator('[data-util="zile"]').fill(String(zile));
  await detaliu(page).locator('[data-util="salveaza-plan"]').click();
}

test('owner-ul vede conturile în tabel, cu filtrele pe plan și căutarea; contul ales alături, cu istoricul din audit; dă o probă, planul gratuit, dezactivează și reactivează; serverul refuză un plan văzut vechi', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  const acum = Date.now();
  await puneCont('ana', new Date(acum - 2 * ZI), new Date(acum + 5 * ZI));
  await puneCont('bob', new Date(acum - ZI), new Date(acum - 3_600_000));
  // Deschiderea contului Anei, cum o scrie callable-ul `cont` la prima logare.
  await scrie('audit/Creare00000000000Ana', {
    schema: 1, cand: new Date(acum - 2 * ZI), cine: 'ana', rol: null, actiune: 'conturi.creeaza', tinta: 'conturi/ana', inainte: null,
    dupa: { email: 'ana@exemplu.ro', plan: 'proba', probaPana: acum + 5 * ZI },
  });
  // Un rând de audit al altui cont și unul de nume nu intră în istoricul planului Anei.
  await scrie('audit/Nume000000000000Ana', { schema: 1, cand: new Date(acum - ZI), cine: 'ana', rol: null, actiune: 'conturi.nume', tinta: 'conturi/ana', inainte: { nume: 'A' }, dupa: { nume: 'ANA' } });
  await deschide(page);
  await puneRolul(page, await intraCuGoogle(page), 'owner');
  // Filele apar după citirea rolului (asincronă): întâi una vizibilă, apoi lista lor.
  await expect(page.locator('[data-fila="setari"]')).toBeVisible(LENT);
  // Bara laterală (ADR 0260): Azi, apoi grupurile (Probleme, Produs, Clienți, Echipa) și Contul meu la capăt.
  expect(await file(page)).toEqual(['azi', 'erori', 'tichete', 'diagnoza', 'sugestii', 'roadmap', 'documentatie', 'utilizatori', 'personal', 'setari', 'cont']);
  await page.locator('[data-fila="utilizatori"]').click();

  // Cele mai noi întâi; planul de acum: proba lui Bob a trecut. Primul cont vine ales, cu panoul lui alături.
  await expect(page.locator('tr[data-cont]')).toHaveCount(2, LENT);
  expect(await aratate(page)).toEqual(['bob@exemplu.ro', 'ana@exemplu.ro']);
  await expect(rand(page, 'bob@exemplu.ro').locator('[data-util="plan"]')).toHaveAttribute('data-plan', 'expirat');
  await expect(rand(page, 'bob@exemplu.ro').locator('[data-util="drept"]')).toHaveText(/^din \d/);
  await expect(rand(page, 'ana@exemplu.ro').locator('[data-util="plan"]')).toHaveText('Probă');
  await expect(rand(page, 'ana@exemplu.ro').locator('[data-util="drept"]')).toHaveText('încă 5 zile');
  await expect(rand(page, 'bob@exemplu.ro')).toHaveAttribute('data-ales', 'true');
  await expect(detaliu(page).locator('h3')).toHaveText('bob@exemplu.ro');
  await expect(detaliu(page)).toContainText('Proba a expirat pe ');
  await expect(detaliu(page).locator('[data-util="istoric-gol"]')).toHaveText('Nicio schimbare de plan în audit.', LENT);
  // Panoul stă alături de tabel, nu sub el, și nimic nu iese din ecran.
  const tabel = await page.locator('[data-util="tabel"]').boundingBox();
  const panou = await detaliu(page).boundingBox();
  if (!tabel || !panou) throw new Error('tabelul și panoul nu sunt pe pagină');
  expect(panou.x, 'panoul e la dreapta tabelului').toBeGreaterThanOrEqual(tabel.x + tabel.width);
  expect(Math.abs(panou.y - tabel.y), 'pe același rând').toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // Filtrele pe plan, cu numărul fiecăruia; unul care ascunde contul ales mută alegerea pe primul arătat, fără s-o mute înapoi.
  await expect(page.locator('[data-filtru-plan]')).toHaveText(['Toate (2)', 'Probă (1)', 'Gratuit (0)', 'Expirat (1)', 'Dezactivat (0)', 'Personal (0)']);
  await expect(filtru(page, 'toate')).toHaveAttribute('aria-pressed', 'true');
  await filtru(page, 'proba').click();
  expect(await aratate(page)).toEqual(['ana@exemplu.ro']);
  await expect(detaliu(page).locator('h3')).toHaveText('ana@exemplu.ro');
  // Istoricul Anei: deschiderea contului, din audit; numele schimbat nu e al planului.
  await expect(detaliu(page).locator('[data-pas]')).toHaveText(/^\S+ · Probă până pe \S+ · Cont nou$/, LENT);
  await filtru(page, 'toate').click();
  expect(await aratate(page)).toEqual(['bob@exemplu.ro', 'ana@exemplu.ro']);
  await expect(rand(page, 'ana@exemplu.ro')).toHaveAttribute('data-ales', 'true');
  await filtru(page, 'gratuit').click();
  await expect(page.locator('[data-util="gol-filtru"]')).toHaveText('Niciun cont nu se potrivește.');
  await expect(detaliu(page)).toHaveCount(0);
  await filtru(page, 'toate').click();

  // Căutarea în conturile încărcate: după adresă sau nume, fără majuscule; numerele filtrelor o urmează.
  await page.locator('[data-util="cauta"]').fill('BOB');
  expect(await aratate(page)).toEqual(['bob@exemplu.ro']);
  await expect(page.locator('[data-filtru-plan]')).toHaveText(['Toate (1)', 'Probă (0)', 'Gratuit (0)', 'Expirat (1)', 'Dezactivat (0)', 'Personal (0)']);
  await expect(page.locator('[data-util="numar"]')).toHaveText('2');
  await page.locator('[data-util="cauta"]').fill('nimeni');
  await expect(page.locator('[data-util="gol-filtru"]')).toBeVisible();
  await page.locator('[data-util="cauta"]').fill('');
  expect(await aratate(page)).toEqual(['bob@exemplu.ro', 'ana@exemplu.ro']);

  // O probă nouă de 30 de zile, de azi, pentru contul expirat; istoricul lui o arată, făcută de tine.
  await schimba(page, 'bob@exemplu.ro', 'proba', 30);
  await expect(page.locator('[data-util="gata"]')).toHaveText('Planul contului bob@exemplu.ro: Probă.', LENT);
  await expect(rand(page, 'bob@exemplu.ro').locator('[data-util="drept"]')).toHaveText('încă 30 de zile');
  await expect(detaliu(page)).toContainText('Probă: încă 30 de zile');
  await expect(detaliu(page).locator('[data-pas]')).toHaveText(/^\S+ · Probă până pe \S+ · tu$/, LENT);
  const pana = Date.parse((await citeste('conturi/bob'))['probaPana']?.timestampValue ?? '');
  expect(Math.abs(pana - (acum + 30 * ZI))).toBeLessThan(5 * 60_000);

  // Gratuit, apoi dezactivat (lista oferă reactivarea întâi), apoi reactivat: înapoi la gratuit. Cât lista se recitește
  // după schimbare (citirea e ținută aici), nimic nu pleacă: planul arătat ar fi cel vechi, iar serverul l-ar refuza.
  let elibereaza = (): void => {};
  const tinut = new Promise<void>((ok) => { elibereaza = ok; });
  const citire = (u: URL): boolean => u.pathname.endsWith('/documents:runQuery');
  let tinute = 0;
  await page.route(citire, async (r) => {
    if ((r.request().postData() ?? '').includes('"conturi"')) { tinute += 1; await tinut; }
    await r.continue();
  });
  await schimba(page, 'ana@exemplu.ro', 'gratuit');
  await expect(page.locator('[data-util="gata"]')).toHaveText('Planul contului ana@exemplu.ro: Gratuit.', LENT);
  await expect.poll(() => tinute, { message: 'citirea listei e ținută' }).toBe(1);
  await expect(rand(page, 'ana@exemplu.ro')).toHaveAttribute('data-plan', 'proba');
  await expect(detaliu(page).locator('[data-util="salveaza-plan"]')).toBeDisabled();
  elibereaza();
  await page.unroute(citire);
  await expect(rand(page, 'ana@exemplu.ro')).toHaveAttribute('data-plan', 'gratuit', LENT);
  await expect(detaliu(page).locator('[data-util="salveaza-plan"]')).toBeEnabled();
  await expect(rand(page, 'ana@exemplu.ro').locator('[data-util="drept"]')).toHaveText('nelimitat');
  await schimba(page, 'ana@exemplu.ro', 'dezactiveaza');
  await expect(rand(page, 'ana@exemplu.ro')).toHaveAttribute('data-plan', 'dezactivat', LENT);
  await expect(rand(page, 'ana@exemplu.ro').locator('[data-util="drept"]')).toHaveText('—');
  expect((await citeste('conturi/ana'))['planInainte']).toBeTruthy();
  // Formularul pornește din nou la planul nou al contului: pe unul dezactivat, reactivarea e prima.
  await expect(detaliu(page).locator('[data-util="schimbare"]')).toHaveValue('reactiveaza', LENT);
  await detaliu(page).locator('[data-util="salveaza-plan"]').click();
  await expect(rand(page, 'ana@exemplu.ro')).toHaveAttribute('data-plan', 'gratuit', LENT);
  const ana = await citeste('conturi/ana');
  expect([ana['plan']?.stringValue, ana['planInainte']?.nullValue]).toEqual(['gratuit', null]);
  expect(await actiuniAudit()).toEqual(['conturi.creeaza', 'conturi.dezactiveaza', 'conturi.gratuit', 'conturi.nume', 'conturi.proba', 'conturi.reactiveaza']);
  // Istoricul Anei, cel mai nou întâi: reactivat (gratuit), dezactivat, gratuit, deschiderea contului (proba).
  await expect.poll(() => pasi(page), LENT).toEqual(['gratuit', 'dezactivat', 'gratuit', 'proba']);
  await expect(page.locator('[data-filtru-plan]')).toHaveText(['Toate (2)', 'Probă (1)', 'Gratuit (1)', 'Expirat (0)', 'Dezactivat (0)', 'Personal (0)']);

  // Planul lui Bob se schimbă pe server (alt om din personal) cât lista îl arată pe cel vechi: cererea e refuzată.
  await scrie('conturi/bob', { schema: 1, email: 'bob@exemplu.ro', nume: 'BOB', creatLa: new Date(acum - ZI), plan: 'gratuit', probaPana: new Date(pana) });
  await schimba(page, 'bob@exemplu.ro', 'dezactiveaza');
  await expect(detaliu(page).locator('[data-util="eroare"]')).toContainText('planul contului s-a schimbat', LENT);
  expect((await citeste('conturi/bob'))['plan']?.stringValue).toBe('gratuit');
  await page.locator('[data-util="reincarca"]').click();
  await expect(rand(page, 'bob@exemplu.ro')).toHaveAttribute('data-plan', 'gratuit', LENT);

  // Sub 1 100 px, panoul trece sub tabel și nimic nu iese din ecran.
  await page.setViewportSize({ width: 1000, height: 900 });
  const tabel2 = await page.locator('[data-util="tabel"]').boundingBox();
  const panou2 = await detaliu(page).boundingBox();
  if (!tabel2 || !panou2) throw new Error('tabelul și panoul nu sunt pe pagină');
  expect(panou2.y, 'panoul e sub tabel').toBeGreaterThanOrEqual(tabel2.y + tabel2.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(erori).toEqual([]);
});

test('setările: implicitele până la prima salvare; valorile din margini se salvează pe server, cu auditul; în afara lor, nu', async ({ page }) => {
  await deschide(page);
  await puneRolul(page, await intraCuGoogle(page), 'owner');
  await page.locator('[data-fila="setari"]').click();
  await expect(page.locator('[data-set="sursa"]')).toHaveText('Nesalvate încă: merg implicitele.', LENT);
  const istoric = page.locator('[data-set-istoric="conturi"]');
  await expect(istoric.locator('[data-ist="gol"]')).toHaveText('Nicio schimbare în audit.');
  await expect(page.locator('[data-set="zile-offline"]')).toHaveValue('7');
  await expect(page.locator('[data-set="zile-tichete"]')).toHaveValue('365');
  await page.locator('[data-set="zile-offline"]').fill('61');
  await expect(page.locator('[data-set="salveaza"]')).toBeDisabled();
  await page.locator('[data-set="zile-offline"]').fill('3');
  await page.locator('[data-set="zile-tichete"]').fill('90');
  await page.locator('[data-set="salveaza"]').click();
  await expect(page.locator('[data-set="gata"]')).toHaveText('Setările sunt salvate.', LENT);
  await expect(page.locator('[data-set="sursa"]')).toContainText('Schimbate ultima dată pe ');
  // Fără reîncărcare, formularul arată valorile salvate (21.11, A.3: se remonta din cele de dinainte și le ținea).
  await expect(page.locator('[data-set="zile-offline"]')).toHaveValue('3');
  await expect(page.locator('[data-set="zile-tichete"]')).toHaveValue('90');
  const s = await citeste('setari/conturi');
  expect([s['zileOffline']?.integerValue, s['zilePastrareTichete']?.integerValue]).toEqual(['3', '90']);
  expect(await actiuniAudit()).toEqual(['setari.conturi']);
  // Sub buton, istoricul citit din nou: prima salvare, de la implicite (ADR 0260 §9).
  await expect(istoric.locator('[data-pas]')).toHaveText([/ · tu · zilele offline: 7 → 3; păstrarea raportărilor rezolvate: 365 → 90$/]);
  // Reîncărcată, fila citește valorile salvate.
  await page.reload();
  await page.locator('[data-fila="setari"]').click();
  await expect(page.locator('[data-set="zile-offline"]')).toHaveValue('3', LENT);
});

test('istoricul setărilor (ADR 0260 §9): rândurile de audit ale fiecărei setări sub butonul ei, cea mai nouă întâi; o salvare nouă urcă în capul lui', async ({ page }) => {
  const acum = Date.now();
  const r = (eticheta: string, ro: string) => ({ eticheta, ro, en: '' });
  await scrie('setari/conturi', { schema: 1, zileOffline: 10, zilePastrareTichete: 90, modificatLa: new Date(acum - 2 * ZI), modificatDe: 'om0' });
  await scrie('setari/raspunsuriRapide', { schema: 1, versiune: 2, lista: [r('A', 'a'), r('B', 'b2')], modificatLa: new Date(acum - ZI), modificatDe: 'om0' });
  const audit = (id: string, zile: number, actiune: string, tinta: string, inainte: unknown, dupa: unknown) => scrie(`audit/${id}`, {
    schema: 1, cand: new Date(acum - zile * ZI), cine: 'om0', rol: 'owner', actiune, tinta, inainte, dupa,
  });
  await audit('c1', 5, 'setari.conturi', 'setari/conturi', null, { zileOffline: 10, zilePastrareTichete: 365 });
  await audit('c2', 2, 'setari.conturi', 'setari/conturi', { zileOffline: 10, zilePastrareTichete: 365 }, { zileOffline: 10, zilePastrareTichete: 90 });
  await audit('r1', 4, 'setari.raspunsuriRapide', 'setari/raspunsuriRapide', null, [r('A', 'a'), r('B', 'b')]);
  await audit('r2', 1, 'setari.raspunsuriRapide', 'setari/raspunsuriRapide', [r('A', 'a'), r('B', 'b')], [r('A', 'a'), r('B', 'b2')]);
  // Alt document (un cont) nu intră în istoricul setărilor.
  await audit('x1', 0, 'conturi.gratuit', 'conturi/client1', { plan: 'proba' }, { plan: 'gratuit' });

  await deschide(page);
  await puneRolul(page, await intraCuGoogle(page), 'owner');
  await page.locator('[data-fila="setari"]').click();
  const conturi = page.locator('[data-set-istoric="conturi"] [data-pas]');
  const rapide = page.locator('[data-set-istoric="rapide"] [data-pas]');
  await expect(conturi).toHaveText([
    /^\d{2}\.\d{2}\.\d{4} · personalul · păstrarea raportărilor rezolvate: 365 → 90$/,
    /^\d{2}\.\d{2}\.\d{4} · personalul · zilele offline: 7 → 10$/,
  ], LENT);
  await expect(rapide).toHaveText([/ · personalul · schimbat „B”$/, / · personalul · adăugat „A”; adăugat „B”$/], LENT);
  // Istoricul stă sub butonul setării lui.
  const sub = async (buton: string, istoric: string) => {
    const b = await page.locator(buton).boundingBox();
    const i = await page.locator(istoric).boundingBox();
    return b !== null && i !== null && i.y >= b.y + b.height;
  };
  expect(await sub('[data-set="salveaza"]', '[data-set-istoric="conturi"]')).toBe(true);
  expect(await sub('[data-set="rapide-salveaza"]', '[data-set-istoric="rapide"]')).toBe(true);

  // O salvare nouă, a mea, urcă în capul istoricului ei, fără reîncărcare; celălalt istoric rămâne cum era.
  await page.locator('[data-set="zile-offline"]').fill('5');
  await page.locator('[data-set="salveaza"]').click();
  await expect(page.locator('[data-set="gata"]')).toHaveText('Setările sunt salvate.', LENT);
  await expect(conturi).toHaveCount(3);
  await expect(conturi.first()).toHaveText(/ · tu · zilele offline: 10 → 5$/);
  await expect(rapide).toHaveCount(2);
  // Răspunsurile rapide doar mutate: „ordinea”.
  await page.locator('[data-rapid-rand="0"] [data-set="rapid-jos"]').click();
  await page.locator('[data-set="rapide-salveaza"]').click();
  await expect(page.locator('[data-set="rapide-gata"]')).toBeVisible(LENT);
  await expect(rapide).toHaveCount(3);
  await expect(rapide.first()).toHaveText(/ · tu · ordinea$/);
  await expect(conturi).toHaveCount(3);
});

test('un rol care doar citește conturile vede fila Utilizatori, fără schimbarea planului și fără istoric (nicio citire din audit), și nu vede Setările', async ({ page }) => {
  await puneCont('ana', new Date(Date.now() - ZI), new Date(Date.now() + 9 * ZI));
  await scrie('audit/Creare00000000000Ana', {
    schema: 1, cand: new Date(Date.now() - ZI), cine: 'ana', rol: null, actiune: 'conturi.creeaza', tinta: 'conturi/ana', inainte: null,
    dupa: { email: 'ana@exemplu.ro', plan: 'proba', probaPana: Date.now() + 9 * ZI },
  });
  await scrie(`roluri/${CONT_CIT}`, { nume: 'Conturi', permisiuni: ['conturi.citeste'] });
  // Fără „Audit: citește”, nimic nu se cere din audit (regulile ar refuza oricum): nici în adresă, nici în corpul cererii.
  const dinAudit: string[] = [];
  page.on('request', (q) => { if (new URL(q.url()).port === '8085' && `${q.url()} ${q.postData() ?? ''}`.includes('audit')) dinAudit.push(q.url()); });
  await deschide(page);
  await puneRolul(page, await intraCuGoogle(page), CONT_CIT);
  await expect(page.locator('[data-admin="cont"]')).toContainText('Conturi', LENT);
  // Citirea conturilor dă și cifra conturilor noi în fila Azi (ADR 0260), deschisă întâi.
  expect(await file(page)).toEqual(['azi', 'utilizatori', 'cont']);
  await page.locator('[data-fila="utilizatori"]').click();
  await expect(rand(page, 'ana@exemplu.ro')).toHaveAttribute('data-plan', 'proba', LENT);
  await expect(detaliu(page).locator('h3')).toHaveText('ana@exemplu.ro');
  await expect(detaliu(page)).toContainText('Probă: încă 9 zile');
  await expect(page.locator('[data-util="formular-plan"], [data-util="salveaza-plan"]')).toHaveCount(0);
  await expect(page.locator('[data-util="text"]')).toHaveText('Cele mai noi conturi întâi. Rolul tău le citește, fără să schimbe planuri.');
  await expect(detaliu(page).locator('h4')).toHaveCount(0);
  await expect(page.locator('[data-util="istoric"], [data-util="istoric-gol"], [data-util="istoric-eroare"]')).toHaveCount(0);
  expect(dinAudit).toEqual([]);
});

test('un cont găsit de căutarea din antet vine ales, cu panoul lui; un rol care administrează conturile fără audit schimbă planul, fără istoric', async ({ page }) => {
  const acum = Date.now();
  await puneCont('ana', new Date(acum - 3 * ZI), new Date(acum + 5 * ZI));
  await puneCont('bob', new Date(acum - 2 * ZI), new Date(acum + 5 * ZI));
  await puneCont('cristi', new Date(acum - ZI), new Date(acum + 5 * ZI));
  await scrie(`roluri/${CONT_CIT}`, { nume: 'Conturi', permisiuni: ['conturi.administreaza'] });
  await deschide(page);
  await puneRolul(page, await intraCuGoogle(page), CONT_CIT);
  await expect(page.locator('[data-fila="utilizatori"]')).toBeVisible(LENT);
  await page.locator('[data-fila="utilizatori"]').click();
  await expect(rand(page, 'cristi@exemplu.ro')).toHaveAttribute('data-ales', 'true', LENT);
  await page.locator('[data-fila="azi"]').click();
  await page.locator('[data-admin="cauta"]').fill('ana@');
  await page.locator('[data-gasit="conturi:ana"]').click();
  await expect(page.locator('[data-fila="utilizatori"]')).toHaveAttribute('aria-current', 'page');
  await expect(rand(page, 'ana@exemplu.ro')).toHaveAttribute('data-ales', 'true', LENT);
  await expect(rand(page, 'ana@exemplu.ro')).toHaveAttribute('data-gasit-aici', 'true');
  await expect(detaliu(page).locator('h3')).toHaveText('ana@exemplu.ro');
  // Administrarea fără „Audit: citește”: planul se schimbă din panou, iar istoricul nu se arată.
  await detaliu(page).locator('[data-util="schimbare"]').selectOption('gratuit');
  await detaliu(page).locator('[data-util="salveaza-plan"]').click();
  await expect(rand(page, 'ana@exemplu.ro')).toHaveAttribute('data-plan', 'gratuit', LENT);
  await expect(page.locator('[data-util="istoric"], [data-util="istoric-gol"], [data-util="istoric-eroare"]')).toHaveCount(0);
  expect((await citeste('conturi/ana'))['plan']?.stringValue).toBe('gratuit');
});
