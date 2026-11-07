import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { adauga, deschideMeniulContului } from '../e2e/ajutor-panza.ts';

/**
 * Raportările clienților (ADR 0116 §C, felia 15.B↑a) cap-coadă, pe emulatoare, pe build-ul real. Un client cu adresa
 * confirmată intră din panoul contului; o eroare din sesiune ajunge în `errorLogs`; raportarea din meniul contului pleacă
 * cu felul, textul, poza planșei, datele aplicației și amprenta acelei erori, care e chiar id-ul grupului ei. În fila
 * Tichete (owner-ul, în alt browser: sesiunea contului e a originii) raportarea se vede cu tot ce are, iar răspunsul o
 * deschide. În editor, la pornirea următoare, semnul de pe butonul Cont și numărul de pe rând; „Raportările mele” arată
 * răspunsul, îl notează citit pe server și stinge semnul.
 *
 * Proiectul (felia 15.B↑b), doar cu bifa: mărimea lui sub bifă și în ce mai pleacă, meta lui în tichet (mărimea, amprenta,
 * schema), iar în fila Tichete descărcarea dă octet cu octet versiunea salvată de editor (trecută prin Storage, pe server).
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
/** Primul apel al unui callable după pornirea emulatorului de funcții trece de 5 s. */
const LENT = { timeout: 30_000 };
/** Versiunea din antetul paginii e commit-ul (`vite.config.ts`). */
const BUILD = execSync('git rev-parse --short=12 HEAD', { encoding: 'utf8' }).trim();

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`${AUTH}/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' });
});

interface Valoare {
  stringValue?: string; integerValue?: string; nullValue?: null;
  arrayValue?: { values?: Valoare[] }; mapValue?: { fields: Record<string, Valoare> };
}
type Campuri = Record<string, Valoare>;

async function documente(cale: string): Promise<Array<{ readonly id: string; readonly f: Campuri }>> {
  const r = await fetch(`${FS}/${cale}`, { headers: { Authorization: 'Bearer owner' } });
  const j = (await r.json()) as { documents?: Array<{ name: string; fields: Campuri }> };
  return (j.documents ?? []).map((d) => ({ id: d.name.split('/').pop() ?? '', f: d.fields }));
}

const text = (v: Valoare | undefined): string => v?.stringValue ?? '';
const numar = (v: Valoare | undefined): number => Number(v?.integerValue ?? 'NaN');

/** Ultima versiune a proiectului salvată de editor în IndexedDB (JSON-ul canonic), sau '' dacă nu e niciuna. */
async function ultimaVersiune(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok, eroare) => {
      const r = indexedDB.open('cncvs2-proiecte', 1);
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    const v = await new Promise<unknown>((ok, eroare) => {
      const r = db.transaction('versiuni').objectStore('versiuni').openCursor(null, 'prev');
      r.onsuccess = () => { ok(r.result?.value ?? null); };
      r.onerror = () => { eroare(r.error); };
    });
    db.close();
    return typeof v === 'string' ? v : '';
  });
}

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

/** Owner-ul, în alt browser (altă origine de sesiune), pe fila Tichete: login-ul Google al emulatorului și rolul pus de mână. */
async function ownerInTichete(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ baseURL: 'http://localhost:4173', locale: 'ro-RO', bypassCSP: true, serviceWorkers: 'block' });
  await ctx.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  const admin = await ctx.newPage();
  await admin.goto('/admin');
  const [fereastra] = await Promise.all([admin.waitForEvent('popup'), admin.locator('[data-admin="intra"]').click()]);
  await fereastra.waitForLoadState();
  await fereastra.locator('#add-account-button').click();
  await fereastra.locator('#autogen-button').click();
  await fereastra.locator('#sign-in').click();
  const uid = (await admin.locator('[data-admin="uid"]').textContent()) ?? '';
  const s = await fetch(`${FS}/staff/${uid}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { rol: { stringValue: 'owner' } } }),
  });
  expect(s.status).toBe(200);
  await admin.locator('[data-admin="reincearca"]').click();
  await admin.locator('[data-fila="tichete"]').click();
  return admin;
}

test('raportarea din editor, cu poza și amprenta erorii din sesiune; răspunsul din fila Tichete; semnul și răspunsul în editor', async ({ page, browser }) => {
  // Două browsere și patru callable-uri, toate reci când proba rulează prima pe emulatoare proaspete (măsurat: peste 60 s
  // în clona otrăvurilor, 29 s cu funcțiile calde): termenul probei întregi e dublu față de cel implicit.
  test.setTimeout(120_000);
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  const uid = await clientConfirmat('ana@exemplu.ro', 'parola-anei-1');
  await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await (await deschideMeniulContului(page)).locator('[data-meniu-cont="intra"]').click();
  const d = page.getByTestId('dialog-cont');
  await d.locator('[data-camp="cont-email"]').fill('ana@exemplu.ro');
  await d.locator('[data-camp="cont-parola"]').fill('parola-anei-1');
  await d.locator('[data-buton="cont-intra"]').click();
  await expect(d.locator('[data-cont="intrat"]')).toBeVisible(LENT);
  await d.locator('[data-buton="inchide-cont"]').click();

  // O eroare a sesiunii: raportorul o duce în errorLogs, iar id-ul grupului e amprenta ei.
  await page.evaluate(() => { setTimeout(() => { throw new Error('eroare de probă pentru raportare'); }, 0); });
  await expect.poll(async () => (await documente('errorLogs')).length, LENT).toBe(1);
  const [grup] = await documente('errorLogs');
  expect(grup?.id).toMatch(/^[0-9a-f]{32}$/);

  // Cu contul deschis, meniul are raportările.
  const meniu = await deschideMeniulContului(page);
  await expect(meniu.locator('[role="menuitem"] > span')).toHaveText([
    'Contul meu…', 'Raportările mele', 'Manualul', 'Raportează o problemă…', 'Trimite o sugestie…', 'Ieși din cont',
  ]);
  await meniu.locator('[data-meniu-cont="raporteaza"]').click();
  const r = page.getByTestId('dialog-raportare');
  await expect(r.locator('[data-raport="formular"]')).toBeVisible(LENT);
  // Fără text, nimic nu pleacă; ce mai pleacă stă la vedere: versiunea, limba, planul, browserul, o amprentă.
  await expect(r.locator('[data-buton="raport-trimite"]')).toBeDisabled();
  await r.getByTestId('raport-date').locator('summary').click();
  await expect(r.locator('[data-raport-amprente]')).toHaveText('Amprenta unei erori din sesiunea asta, fără conținutul ei');
  await expect(r.getByTestId('raport-date')).toContainText(`Versiunea aplicației: ${BUILD} (instanța local)`);
  await expect(r.getByTestId('raport-date')).toContainText('Planul: proba');
  await r.locator('[data-camp="raport-fel-idee"]').check();
  await r.locator('[data-camp="raport-text"]').fill('Grila ar trebui\nsă se vadă mai bine.');
  await r.locator('[data-camp="raport-poza"]').check();
  // Proiectul deschis, doar cu bifa: mărimea lui (JSON-ul canonic, cât salvează editorul) sub bifă și în ce mai pleacă.
  await expect(r.locator('[data-raport="proiect"]')).toHaveCount(0);
  await r.locator('[data-camp="raport-proiect"]').check();
  const marime = Number(await r.locator('[data-raport="proiect"]').getAttribute('data-marime'));
  expect(marime).toBeGreaterThan(100);
  // Salvarea în browser pleacă asincron după fiecare schimbare: ultima versiune salvată ajunge la documentul de acum.
  await expect.poll(async () => Buffer.byteLength(await ultimaVersiune(page), 'utf8'), LENT).toBe(marime);
  const salvat = await ultimaVersiune(page);
  const kb = Math.ceil(marime / 1024);
  await expect(r.locator('[data-raport="proiect"]')).toHaveText(`Proiectul deschis are ${kb} kB.`);
  await expect(r.locator('[data-raport-date-proiect]')).toHaveText(`Proiectul deschis (${kb} kB), comprimat`);
  await r.locator('[data-buton="raport-trimite"]').click();
  await expect(r.locator('[data-raport="trimis"]')).toBeVisible(LENT);
  await expect(r.locator('[data-buton="inchide-raport"]')).toHaveText('Închide');
  await r.locator('[data-buton="inchide-raport"]').click();

  // Pe server: tichetul, cu tot ce a arătat fereastra, și poza în documentul ei.
  const [tichet, ...altele] = await documente('tichete');
  expect(altele).toEqual([]);
  const f = tichet?.f ?? {};
  expect([text(f['autor']), text(f['autorEmail']), text(f['fel']), text(f['stare']), numar(f['necititeAutor'])]).toEqual([uid, 'ana@exemplu.ro', 'idee', 'nou', 0]);
  expect(text(f['text'])).toBe('Grila ar trebui\nsă se vadă mai bine.');
  const app = f['aplicatia']?.mapValue?.fields ?? {};
  expect([text(app['versiune']), text(app['instanta']), text(app['limba']), text(app['plan'])]).toEqual([BUILD, 'local', 'ro', 'proba']);
  expect(text(app['browser'])).toBe(await page.evaluate(() => navigator.userAgent));
  expect(f['amprente']?.arrayValue?.values?.map(text)).toEqual([grup?.id]);
  const poza = f['poza']?.mapValue?.fields ?? {};
  expect(text(poza['tip'])).toBe('image/jpeg');
  expect(numar(poza['marime'])).toBeGreaterThan(1000);
  expect(numar(poza['marime'])).toBeLessThanOrEqual(400 * 1024);
  expect((await documente(`tichete/${tichet?.id ?? ''}/poze`)).map((x) => x.id)).toEqual(['plansa']);
  // Proiectul: în tichet doar meta lui (fișierul e în Storage), cu mărimea și amprenta versiunii salvate.
  const proiect = f['proiect']?.mapValue?.fields ?? {};
  expect([numar(proiect['marime']), text(proiect['sha256']), numar(proiect['schema'])]).toEqual([
    marime, createHash('sha256').update(salvat).digest('hex'), (JSON.parse(salvat) as { schema: number }).schema,
  ]);

  // Owner-ul, în fila Tichete: raportarea cu amprenta și datele aplicației; răspunsul o trece în „deschis”.
  const admin = await ownerInTichete(browser);
  const rand = admin.locator(`[data-tichet="${tichet?.id ?? ''}"]`);
  await expect(rand.locator('[data-tic="text"]')).toHaveText('Grila ar trebui\nsă se vadă mai bine.', LENT);
  await expect(rand.locator('[data-tic="amprente"]')).toContainText(grup?.id ?? '-');
  await expect(rand.locator('[data-tic="aplicatia"]')).toContainText(BUILD);
  // Proiectul, descărcat prin callable (din Storage, pe server), despachetat și verificat: versiunea salvată, octet cu octet.
  const descarcaProiect = rand.locator('[data-tic="descarca-proiect"]');
  await expect(descarcaProiect).toHaveText(`Descarcă proiectul (${kb} kB, schema ${(JSON.parse(salvat) as { schema: number }).schema})`);
  const [descarcare] = await Promise.all([admin.waitForEvent('download', LENT), descarcaProiect.click()]);
  expect(descarcare.suggestedFilename()).toBe(`cncvs2-tichet-${tichet?.id ?? ''}.json`);
  expect(readFileSync(await descarcare.path(), 'utf8')).toBe(salvat);
  await expect(rand.locator('[data-tic="proiect-descarcat"]')).toHaveText(`Proiectul s-a descărcat: cncvs2-tichet-${tichet?.id ?? ''}.json.`);
  // Un fișier schimbat între timp în Storage (alt proiect decât cel trimis) nu se descarcă: amprenta din tichet nu se potrivește.
  const caleProiect = encodeURIComponent(`tichete/${tichet?.id ?? ''}/proiect.json.gz`);
  const schimbat = await fetch(`http://127.0.0.1:9195/upload/storage/v1/b/${PROIECT}.appspot.com/o?uploadType=media&name=${caleProiect}`, {
    method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/gzip' }, body: gzipSync(Buffer.from('{"schema":20}')),
  });
  expect(schimbat.status, await schimbat.clone().text()).toBe(200);
  await descarcaProiect.click();
  await expect(rand.locator('[data-tic="proiect-eroare"]')).toHaveText(
    'Proiectul nu s-a putut descărca: fișierul primit nu e cel trimis (mărimea sau amprenta diferă)', LENT,
  );
  await rand.locator('[data-tic="raspuns-text"]').fill('Mulțumim! Grila mai groasă vine în versiunea următoare.');
  await rand.locator('[data-tic="trimite"]').click();
  await expect(rand.locator('[data-tic="raspuns"]')).toContainText('Grila mai groasă vine în versiunea următoare.', LENT);
  await expect(rand).toHaveAttribute('data-stare', 'deschis');
  await admin.context().close();

  // În editor, la pornirea următoare: semnul pe buton și numărul pe rând, din reconfirmarea contului.
  await page.reload();
  const buton = page.locator('[data-editare="cont"]');
  await expect(buton.getByTestId('cont-semn')).toBeVisible(LENT);
  await expect(buton).toHaveAttribute('title', 'Contul: logarea, planul, raportările și manualul. 1 raportare are un răspuns nou');
  const m2 = await deschideMeniulContului(page);
  await expect(m2.getByTestId('meniu-cont-necitite')).toHaveText('1');
  await m2.locator('[data-meniu-cont="raportari"]').click();
  const mele = page.getByTestId('dialog-raportarile-mele');
  const x = mele.locator(`[data-raportare="${tichet?.id ?? ''}"]`);
  await expect(x).toHaveAttribute('data-stare', 'deschis', LENT);
  await expect(x.locator('.raportare-cap strong')).toHaveText('O idee');
  await expect(x.locator('.raportare-stare')).toHaveText('În lucru');
  await expect(x.locator('.raportare-noua')).toHaveText('1 răspuns nou');
  await expect(x.locator('.raportare-text')).toHaveText('Grila ar trebui\nsă se vadă mai bine.');
  await expect(x.locator('.raportare-proiect')).toHaveText(`Cu proiectul atașat (${kb} kB)`);
  await expect(x.locator('[data-raspuns="0"] p')).toHaveText('Mulțumim! Grila mai groasă vine în versiunea următoare.');
  // Văzut: notat citit pe server, iar semnul se stinge.
  await expect(buton.getByTestId('cont-semn')).toHaveCount(0, LENT);
  await expect.poll(async () => numar((await documente('tichete'))[0]?.f['necititeAutor']), LENT).toBe(0);
  await mele.locator('[data-buton="inchide-raport"]').click();
  await expect((await deschideMeniulContului(page)).getByTestId('meniu-cont-necitite')).toHaveCount(0);
  expect(erori).toEqual(['eroare de probă pentru raportare']);
});
