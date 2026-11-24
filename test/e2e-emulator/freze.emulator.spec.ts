import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { deschideMeniulContului } from '../e2e/ajutor-panza.ts';

/**
 * Biblioteca de freze în cont (ADR 0300 §7, felia 16.A↑c), cap-coadă, pe emulatoarele Auth, Firestore și Functions: două
 * browsere ale aceluiași cont. Contul fără freze primește frezele standard la prima sincronizare (16.A↑a-2), iar freza făcută
 * în primul browser fără cont se aduce în cont la prima deschidere cu el (cele standard nu se numără); al doilea browser le
 * primește; o schimbare pe unul ajunge pe celălalt; același câmp schimbat pe amândouă e un conflict, hotărât
 * de om; o ștergere ajunge și ea. Cu proba trecută, biblioteca din cont doar se citește (fără frezele standard), iar
 * schimbările rămân în browser.
 */

const PROIECT = 'demo-cncvs2';
const FS = `http://127.0.0.1:8085/v1/projects/${PROIECT}/databases/(default)/documents`;
const AUTH = 'http://127.0.0.1:9095';
const CONFIG = {
  instanta: 'local',
  firebase: { apiKey: 'demo-cheie', authDomain: `${PROIECT}.firebaseapp.com`, projectId: PROIECT, appId: '1:1:web:1' },
  emulatoare: { auth: AUTH, firestore: '127.0.0.1:8085', functions: '127.0.0.1:5005' },
};
/** Prima chemare a unui callable pornește lucrătorul lui în emulator (secunde); sincronizarea vine la 2 s după o schimbare. */
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

async function frezele(page: Page): Promise<Locator> {
  await (await deschideMeniulContului(page)).locator('[data-meniu-cont="freze"]').click();
  const f = page.getByTestId('dialog-freze');
  await expect(f).toBeVisible();
  return f;
}

const stare = (f: Locator): Locator => f.locator('[data-freze="stare"] .freze-pastila');
const camp = (f: Locator, c: string): Locator => f.locator(`[data-freze-camp="${c}"]`);
const nume = (f: Locator): Locator => f.locator('.freze-rand-nume');

/** Frezele din cont, citite pe server (vii și șterse), după numele lor. */
async function dinCont(uid: string): Promise<Map<string, Record<string, unknown> | null>> {
  const r = await fetch(`${FS}/conturi/${uid}/freze?pageSize=600`, { headers: { Authorization: 'Bearer owner' } });
  const j = (await r.json()) as { documents?: Array<{ fields: { json?: { stringValue?: string } } }> };
  const m = new Map<string, Record<string, unknown> | null>();
  for (const d of j.documents ?? []) {
    const s = d.fields.json?.stringValue;
    if (s === undefined) continue;
    const x = JSON.parse(s) as Record<string, unknown>;
    m.set(String(x['nume']), x);
  }
  return m;
}

async function alDoilea(browser: Browser): Promise<{ readonly page: Page; readonly inchide: () => Promise<void> }> {
  const ctx = await browser.newContext({ locale: 'ro-RO', baseURL: 'http://localhost:4173', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  return { page, inchide: () => ctx.close() };
}

/** Deschide freza cu numele dat în editor (din fișă, „Editează”) și schimbă un câmp, apoi salvează. */
async function schimba(f: Locator, n: string, c: string, valoare: string): Promise<void> {
  await nume(f).getByText(n, { exact: true }).click();
  await f.locator('[data-freze="fisa"] [data-freze="editeaza"]').click();
  await camp(f, c).fill(valoare);
  await f.locator('[data-freze="salveaza"]').click();
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Salvat');
}

test('două browsere ale aceluiași cont: aducerea din browser, schimbarea, conflictul și ștergerea ajung pe amândouă', async ({ page, browser }) => {
  const uid = await clientConfirmat('ana@exemplu.ro', 'parola-buna-1');
  // A, fără cont: frezele standard, puse singure, și o freză a omului.
  await deschide(page);
  let a = await frezele(page);
  await expect(nume(a)).toHaveCount(6, LENT);
  await expect(a.locator('[data-freze="stare"]')).toContainText('Doar în acest browser');
  await a.locator('[data-freze="noua"]').click();
  await camp(a, 'diametru').fill('4');
  await a.locator('[data-freze="salveaza"]').click();
  await expect(nume(a)).toHaveCount(7);
  await a.locator('[data-freze="inchide"]').click();
  // A intră în cont: contul, fără freze, primește frezele standard; fereastra întreabă doar de freza omului.
  await intra(page);
  a = await frezele(page);
  await expect(a.locator('[data-freze="aduse"]')).toContainText('Adaugi freza din acest browser în cont?', LENT);
  await a.locator('[data-freze="aduse-da"]').click();
  await expect(a.locator('[data-freze="aduse"]')).toHaveCount(0);
  await expect(stare(a)).toHaveText('În cont, la zi', LENT);
  await expect.poll(async () => (await dinCont(uid)).size, LENT).toBe(7);
  // B: același cont, alt browser: le primește, fără întrebare (browserul lui n-are freze).
  const b2 = await alDoilea(browser);
  try {
    await deschide(b2.page);
    await intra(b2.page);
    const b = await frezele(b2.page);
    await expect(nume(b)).toHaveCount(7, LENT);
    await expect(stare(b)).toHaveText('În cont, la zi', LENT);
    await expect(b.locator('[data-freze="aduse"]')).toHaveCount(0);
    // O schimbare pe B ajunge în cont, apoi pe A, la „Sincronizează”.
    await schimba(b, 'Plată Ø6', 'avans', '1200');
    await expect.poll(async () => (await dinCont(uid)).get('Plată Ø6')?.['avans'], LENT).toBe(1200);
    await a.locator('[data-freze="sincronizeaza"]').click();
    await nume(a).getByText('Plată Ø6', { exact: true }).click();
    await expect(a.locator('[data-freze-valoare="avans"]')).toHaveText('1200 mm/min', LENT);
    // Același câmp pe amândouă: A întâi (ajunge în cont), apoi B, care primește conflictul.
    await schimba(a, 'Plată Ø6', 'pas', '2');
    await expect.poll(async () => (await dinCont(uid)).get('Plată Ø6')?.['pas'], LENT).toBe(2);
    await schimba(b, 'Plată Ø6', 'pas', '4');
    await expect(b.locator('[data-freze="conflict"]')).toContainText('„Plată Ø6” s-a schimbat și pe alt calculator: Pasul pe trecere.', LENT);
    await expect(stare(b)).toHaveText('O freză în conflict');
    // B păstrează pasul lui: pleacă în cont, iar A îl primește.
    await b.locator('[data-freze="conflict-mea"]').click();
    await expect(b.locator('[data-freze="conflict"]')).toHaveCount(0);
    await expect.poll(async () => (await dinCont(uid)).get('Plată Ø6')?.['pas'], LENT).toBe(4);
    await expect(stare(b)).toHaveText('În cont, la zi', LENT);
    await a.locator('[data-freze="sincronizeaza"]').click();
    await nume(a).getByText('Plată Ø6', { exact: true }).click();
    await expect(a.locator('[data-freze-valoare="pas"]')).toHaveText('4 mm', LENT);
    // O ștergere pe A ajunge pe B.
    await a.locator('[data-freze="sterge"]').click();
    await a.locator('[data-freze="sterge-da"]').click();
    await expect.poll(async () => (await dinCont(uid)).has('Plată Ø6'), LENT).toBe(false);
    await b.locator('[data-freze="sincronizeaza"]').click();
    await expect(nume(b)).toHaveCount(6, LENT);
    await expect(nume(b).getByText('Plată Ø6', { exact: true })).toHaveCount(0);
  } finally {
    await b2.inchide();
  }
});

test('cu proba trecută: biblioteca din cont se citește, iar o schimbare rămâne în browser; ieșirea arată biblioteca fără cont', async ({ page }) => {
  const uid = await clientConfirmat('ana@exemplu.ro', 'parola-buna-1');
  // Contul există deja, cu proba trecută și o freză în cont.
  const trecut = new Date(Date.now() - 86_400_000).toISOString();
  const freza = { id: 'f1', rev: 1, schimbatLa: 1, nume: 'Plată Ø3', fel: 'plata', diametru: 3, numar: 1, turatie: 18000, avans: 1000, plonjare: 300, pas: 1.5, pasLateral: 40 };
  const pune = async (cale: string, fields: Record<string, unknown>): Promise<void> => {
    const r = await fetch(`${FS}/${cale}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
    expect(r.status, await r.clone().text()).toBe(200);
  };
  await pune(`conturi/${uid}`, { schema: { integerValue: '1' }, email: { stringValue: 'ana@exemplu.ro' }, nume: { stringValue: 'Ana' }, plan: { stringValue: 'proba' }, probaPana: { timestampValue: trecut } });
  await pune(`conturi/${uid}/freze/f1`, { versiune: { integerValue: '1' }, json: { stringValue: JSON.stringify(freza) } });
  await pune(`conturi/${uid}/sincron/freze`, { versiune: { integerValue: '1' }, numar: { integerValue: '1' }, sterse: { integerValue: '0' }, purjatPana: { integerValue: '0' } });
  await deschide(page);
  await intra(page);
  const f = await frezele(page);
  await expect(nume(f)).toHaveText(['Plată Ø3'], LENT);
  await expect(stare(f)).toHaveText('Contul doar se citește: planul nu permite scrierea, deci schimbările rămân în acest browser', LENT);
  await schimba(f, 'Plată Ø3', 'avans', '900');
  await f.locator('[data-freze="sincronizeaza"]').click();
  await expect(stare(f)).toHaveText(/Contul doar se citește/u, LENT);
  expect((await dinCont(uid)).get('Plată Ø3')?.['avans']).toBe(1000);
  await expect(f.locator('[data-freze-valoare="avans"]')).toHaveText('900 mm/min');
  // Contul nu se poate scrie, deci frezele standard nu i se pun (ar rămâne doar aici).
  expect((await dinCont(uid)).size).toBe(1);
  // Ieșirea din cont: fereastra arată biblioteca fără cont (cu frezele standard); cea a contului rămâne în browser.
  await f.locator('[data-freze="inchide"]').click();
  await (await deschideMeniulContului(page)).locator('[data-meniu-cont="iesi"]').click();
  const g = await frezele(page);
  await expect(g.locator('[data-freze="stare"]')).toContainText('Doar în acest browser');
  await expect(nume(g)).toHaveCount(6);
  await expect(nume(g).getByText('Plată Ø3', { exact: true })).toHaveCount(0);
});
