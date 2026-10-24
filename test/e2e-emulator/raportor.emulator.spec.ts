import { execSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

/**
 * Raportorul de erori cap-coadă, pe emulatoare (felia 3.2, ADR 0043): o eroare din aplicație ajunge în `errorLogs`, grupată,
 * cu build-ul și tipul; a patra apariție identică nu mai pleacă (plafonul pe cheie al clientului); o eroare pe `/admin`,
 * după login, poartă uid-ul omului. App Check e furnizorul de probă (doar cu emulatoare, pe gazda locală, ADR 0040 §9).
 */

const PROIECT = 'demo-cncvs2';
const FS = `http://127.0.0.1:8085/v1/projects/${PROIECT}/databases/(default)/documents`;
const CONFIG = {
  instanta: 'local',
  firebase: { apiKey: 'demo-cheie', authDomain: `${PROIECT}.firebaseapp.com`, projectId: PROIECT, appId: '1:1:web:1' },
  emulatoare: { auth: 'http://127.0.0.1:9095', firestore: '127.0.0.1:8085', functions: '127.0.0.1:5005' },
};
/** Build-ul din `dist/` e commit-ul (`vite.config.ts`): `test:emulator` construiește din arborele curent. */
const BUILD = execSync('git rev-parse --short=12 HEAD', { encoding: 'utf8' }).trim();
/** Primul apel al unui callable după pornirea emulatorului de funcții trece de 5 s. */
const TERMEN = 30_000;

interface Valoare { stringValue?: string; integerValue?: string; arrayValue?: { values?: Array<{ stringValue?: string }> }; mapValue?: { fields: Record<string, Valoare> } }
interface Grup { readonly id: string; readonly f: Record<string, Valoare> }

async function grupuri(): Promise<Grup[]> {
  const r = await fetch(`${FS}/errorLogs`, { headers: { Authorization: 'Bearer owner' } });
  const j = (await r.json()) as { documents?: Array<{ name: string; fields: Record<string, Valoare> }> };
  return (j.documents ?? []).map((d) => ({ id: d.name.split('/').pop() ?? '', f: d.fields }));
}

async function aparitii(amprenta: string): Promise<Array<Record<string, Valoare>>> {
  const r = await fetch(`${FS}/errorLogs/${amprenta}/aparitii`, { headers: { Authorization: 'Bearer owner' } });
  return ((await r.json()) as { documents?: Array<{ fields: Record<string, Valoare> }> }).documents?.map((d) => d.fields) ?? [];
}

const text = (v: Valoare | undefined): string => v?.stringValue ?? '';
const numar = (v: Valoare | undefined): number => Number(v?.integerValue ?? 'NaN');
const grupCu = async (mesaj: string): Promise<Grup | undefined> => (await grupuri()).find((g) => text(g.f['mesaj']) === mesaj);

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9095/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' });
});

async function deschide(page: Page, cale: string): Promise<string[]> {
  const apeluri: string[] = [];
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/logClientError')) apeluri.push(r.postData() ?? ''); });
  await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  await page.goto(cale);
  return apeluri;
}

async function provoaca(page: Page, mesaj: string): Promise<void> {
  await page.evaluate((m) => { setTimeout(() => { throw new Error(m); }, 0); }, mesaj);
}

test('o eroare de randare din aplicație ajunge în errorLogs: grupul, tipul, build-ul, o singură apariție', async ({ page }) => {
  await deschide(page, '/?diagnostic=eroare-de-randare');
  await expect(page.getByRole('alert')).toBeVisible();
  const mesaj = 'Error: Eroare de randare provocată (diagnostic)';
  await expect.poll(() => grupCu(mesaj), { timeout: TERMEN }).toBeDefined();
  const g = await grupCu(mesaj);
  expect(text(g?.f['sursa'])).toBe('client');
  expect(text(g?.f['tip'])).toBe('randare');
  expect(numar(g?.f['numar'])).toBe(1);
  const ultima = g?.f['ultima']?.mapValue?.fields ?? {};
  expect(text(ultima['build'])).toBe(BUILD);
  expect(text(ultima['adresa'])).toBe('http://localhost:4173/');
  expect(text(ultima['stiva'])).toContain('componente');
  expect(text(ultima['uid'])).toBe('');
  // Browserul ajunge până în apariție: user-agentul paginii (serverul ar accepta și un text gol, deci doar proba îl ține).
  const [a] = await aparitii(g?.id ?? '');
  expect(text(a?.['browser'])).toBe(await page.evaluate(() => navigator.userAgent));
});

test('a patra apariție identică nu mai pleacă: grupul rămâne la 3, iar o eroare nouă trece după ea', async ({ page }) => {
  const apeluri = await deschide(page, '/');
  // Aplicația gata de lucru: butonul de import din bara de sus e activ ("Adaugă dreptunghi" a plecat din bară în 6.C↑, ADR 0052).
  await expect(page.locator('[data-actiune="import.svg"]')).toBeEnabled();
  for (let i = 0; i < 4; i++) await provoaca(page, 'aceeași eroare');
  // Trimiterile sunt pe rând: când apare grupul erorii de după, a patra (dacă ar fi plecat) ar fi ajuns înaintea ei.
  await provoaca(page, 'eroarea de după');
  await expect.poll(() => grupCu('Error: eroarea de după'), { timeout: TERMEN }).toBeDefined();
  const g = await grupCu('Error: aceeași eroare');
  expect(text(g?.f['tip'])).toBe('fereastra');
  expect(numar(g?.f['numar'])).toBe(3);
  expect(await aparitii(g?.id ?? '')).toHaveLength(3);
  expect(apeluri).toHaveLength(4);
});

test('pe /admin, după login, raportul poartă uid-ul omului', async ({ page }) => {
  await deschide(page, '/admin');
  const [fereastra] = await Promise.all([page.waitForEvent('popup'), page.locator('[data-admin="intra"]').click()]);
  await fereastra.waitForLoadState();
  await fereastra.locator('#add-account-button').click();
  await fereastra.locator('#autogen-button').click();
  await fereastra.locator('#sign-in').click();
  await expect(page.locator('[data-admin="fara-rol"]')).toBeVisible();
  const uid = (await page.locator('[data-admin="uid"]').textContent()) ?? '';
  expect(uid).toMatch(/^\w{20,}$/);

  await provoaca(page, 'eroare pe admin');
  await expect.poll(() => grupCu('Error: eroare pe admin'), { timeout: TERMEN }).toBeDefined();
  const g = await grupCu('Error: eroare pe admin');
  expect(g?.f['oameni']?.arrayValue?.values?.map((v) => v.stringValue)).toEqual([uid]);
  const [a] = await aparitii(g?.id ?? '');
  expect(text(a?.['uid'])).toBe(uid);
  expect(text(a?.['adresa'])).toBe('http://localhost:4173/admin');
});
