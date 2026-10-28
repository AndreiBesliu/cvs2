import { expect, test, type Page, type Route } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

/**
 * Raportorul de erori din client (felia 3.2, ADR 0043), pe build, fără cloud: nicio cerere nu iese din mașină (`route`
 * refuză orice gazdă externă și o numără). Calea cu serverul (emulatoarele) e în `test/e2e-emulator/raportor.emulator.spec.ts`.
 */

/** Configurația cu Firebase a unei instanțe de test, fără cheie App Check: funcția răspunde 401 (starea dinaintea cheii). */
const CONFIG_FIREBASE = {
  instanta: 'test',
  firebase: { apiKey: 'cheie-proba', authDomain: 'cncvectorstudio-test.firebaseapp.com', projectId: 'cncvectorstudio-test', appId: '1:1:web:1' },
};
/** Aceeași instanță, cu o cheie de site falsă (forma unei chei reCAPTCHA): App Check pornește și cere `enterprise.js`. */
const CONFIG_APP_CHECK = { ...CONFIG_FIREBASE, appCheck: { cheieSite: '6LcProbaFalsaProbaFalsaProbaFalsaProba00' } };
const FUNCTIE = 'https://europe-central2-cncvectorstudio-test.cloudfunctions.net/logClientError';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

interface Plasa {
  /** Cererile spre orice gazdă externă (Firebase, Google, cloudfunctions), cu metoda. */
  readonly externe: string[];
  /** Cererile pentru bucățile raportorului (`raportor-*`, `conexiuneBaza-*`). */
  readonly bucati: string[];
}

/** Plasa de sub orice stub: o cerere externă nestubbuită e refuzată și numărată, nu trimisă (lecția stubului restaurat). */
async function plasa(page: Page): Promise<Plasa> {
  const p: Plasa = { externe: [], bucati: [] };
  page.on('request', (r) => { if (/\/assets\/(raportor|conexiuneBaza)-[^/]+\.js$/.test(r.url())) p.bucati.push(r.url()); });
  await page.route(/^https?:\/\/(?!localhost[:/])/, (r) => {
    p.externe.push(`${r.request().method()} ${r.request().url()}`);
    return r.abort();
  });
  return p;
}

/** O eroare în pagină, ca a omului: aruncată dintr-un `setTimeout` (ajunge în jurnal prin `window.onerror`). */
async function provoaca(page: Page, mesaj: string): Promise<void> {
  await page.evaluate((m) => { setTimeout(() => { throw new Error(m); }, 0); }, mesaj);
}

const jurnalul = (page: Page) => page.getByTestId('jurnal');

test.describe('raportorul de erori', () => {
  test.use({ locale: 'ro-RO' });

  test('fără Firebase în config (local): o eroare nu cere bucata raportorului, nici Firebase, nici funcțiile', async ({ page }) => {
    const p = await plasa(page);
    await page.goto('/');
    await expect(page.locator('[data-actiune="import.svg"]')).toBeEnabled();
    await provoaca(page, 'eroare locală');
    await expect(jurnalul(page)).toHaveText('1 eroare în jurnalul local');
    await page.waitForTimeout(1500);
    expect(p.bucati).toEqual([]);
    expect(p.externe).toEqual([]);
  });

  test('o eroare dinaintea config.json (fără Firebase) rămâne doar în jurnal: nimic descărcat', async ({ page }) => {
    const p = await plasa(page);
    let elibereaza: () => void = () => undefined;
    const liber = new Promise<void>((ok) => { elibereaza = ok; });
    await page.route('**/config.json', async (r) => { await liber; await r.continue(); });
    await page.goto('/');
    await page.waitForFunction(() => document.readyState === 'complete');
    await provoaca(page, 'înaintea configurației');
    elibereaza();
    await expect(jurnalul(page)).toHaveText('1 eroare în jurnalul local');
    await page.waitForTimeout(1500);
    expect(p.bucati).toEqual([]);
    expect(p.externe).toEqual([]);
  });

  test('martorul, cu Firebase fără App Check: bucata vine la prima eroare, funcția dă 401, raportorul se stinge liniștit', async ({ page }) => {
    const p = await plasa(page);
    const apeluri: string[] = [];
    const avertismente: string[] = [];
    const erori: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'warning' && m.text().includes('raportorul de erori')) avertismente.push(m.text());
      if (m.type() === 'error') erori.push(m.text());
    });
    await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG_FIREBASE) }));
    await page.route(FUNCTIE, (r) => {
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
      apeluri.push(r.request().postData() ?? '');
      return r.fulfill({
        status: 401, headers: CORS, contentType: 'application/json',
        body: JSON.stringify({ error: { status: 'UNAUTHENTICATED', message: 'Unauthenticated' } }),
      });
    });
    await page.goto('/');
    await expect(page.locator('[data-actiune="import.svg"]')).toBeEnabled();
    expect(p.bucati, 'nimic înaintea primei erori').toEqual([]);

    await provoaca(page, 'prima eroare');
    await expect.poll(() => apeluri.length).toBe(1);
    const raport = (JSON.parse(apeluri[0] ?? '{}') as { data: Record<string, string> }).data;
    expect(Object.keys(raport).sort()).toEqual(['adresa', 'browser', 'build', 'limba', 'mesaj', 'stiva', 'tip']);
    expect(raport['tip']).toBe('fereastra');
    expect(raport['mesaj']).toBe('Error: prima eroare');
    expect(raport['adresa']).toBe('http://localhost:4173/');
    expect(raport['limba']).toBe('ro');
    expect(raport['browser']).toBe(await page.evaluate(() => navigator.userAgent));
    expect(p.bucati.some((u) => /\/raportor-/.test(u))).toBe(true);

    // Stins după 401: a doua eroare nu mai pleacă, iar eșecul raportorului nu intră în jurnal (fără buclă).
    await provoaca(page, 'a doua eroare');
    await expect(jurnalul(page)).toHaveText('2 erori în jurnalul local');
    await page.waitForTimeout(1500);
    expect(apeluri).toHaveLength(1);
    await expect(jurnalul(page)).toHaveText('2 erori în jurnalul local');
    expect(avertismente).toHaveLength(1);
    expect(p.externe).toEqual([]);
    expect(erori.filter((e) => !/prima eroare|a doua eroare|401/.test(e))).toEqual([]);
  });

  test('bucata raportorului care nu vine: stins, cerută o singură dată, fără eroare nouă în jurnal', async ({ page }) => {
    const p = await plasa(page);
    await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG_FIREBASE) }));
    await page.route(/\/assets\/raportor-[^/]+\.js$/, (r) => r.abort());
    await page.goto('/');
    await expect(page.locator('[data-actiune="import.svg"]')).toBeEnabled();
    await provoaca(page, 'unu');
    await expect(jurnalul(page)).toHaveText('1 eroare în jurnalul local');
    await page.waitForTimeout(1000);
    await provoaca(page, 'doi');
    await expect(jurnalul(page)).toHaveText('2 erori în jurnalul local');
    await page.waitForTimeout(1000);
    expect(p.bucati.filter((u) => /\/raportor-/.test(u))).toHaveLength(1);
    await expect(jurnalul(page)).toHaveText('2 erori în jurnalul local');
    expect(p.externe).toEqual([]);
  });

  test('nu la inactivitate: cu Firebase și App Check în config, fără nicio eroare, nimic nu se descarcă (nici după ~3 s)', async ({ page }) => {
    const p = await plasa(page);
    await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG_APP_CHECK) }));
    await page.goto('/');
    await expect(page.locator('[data-actiune="import.svg"]')).toBeEnabled();
    await expect(jurnalul(page)).toHaveText('0 erori în jurnalul local');
    await page.waitForTimeout(3500);
    expect(p.bucati).toEqual([]);
    expect(p.externe, 'nici enterprise.js, nici altă gazdă').toEqual([]);
  });

  test('condițiile de operare nu pleacă: IndexedDB blocat → intrarea „doar locală” în jurnal, nicio cerere spre bucata raportorului', async ({ page }) => {
    const p = await plasa(page);
    await page.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }); });
    await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG_FIREBASE) }));
    await page.goto('/');
    await expect(jurnalul(page)).toHaveText('1 eroare în jurnalul local');
    const intrari = await page.evaluate(() => localStorage.getItem('cncvs2.jurnalErori.v1'));
    expect(intrari).toContain('"doarLocala":true');
    expect(intrari).toContain('IndexedDB');
    await page.waitForTimeout(2500);
    expect(p.bucati).toEqual([]);
    expect(p.externe).toEqual([]);
  });

  /** Funcția stubbuită cu 200 `{ ok: true }`; întoarce corpurile rapoartelor primite. */
  async function functiaPrimeste(page: Page): Promise<string[]> {
    const apeluri: string[] = [];
    await page.route(FUNCTIE, (r) => {
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
      apeluri.push(r.request().postData() ?? '');
      return r.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ result: { ok: true } }) });
    });
    return apeluri;
  }

  test('o publicare fără dicționare (defectul nostru, nu rețeaua omului): ecranul „fără texte”, iar raportul pleacă', async ({ page }) => {
    const p = await plasa(page);
    await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG_FIREBASE) }));
    await page.route(/\/mesaje\/(ro|en)\.json$/, (r) => r.fulfill({ status: 404, body: '' }));
    const apeluri = await functiaPrimeste(page);
    await page.goto('/');
    await expect(page.locator('[data-eroare="fara-texte"]')).toBeVisible({ timeout: 40_000 });
    // Motivul poartă calea fișierului (ADR 0095: dicționarele sunt date, `mesaje/<limbă>.json`).
    await expect.poll(() => apeluri.join('\n'), { timeout: 15_000 }).toMatch(/\/mesaje\/(ro|en)\.json\): HTTP 404/);
    // Și eșecul total (pornirea renunță): semnul că aplicația n-a pornit pentru nimeni.
    await expect.poll(() => apeluri.join('\n'), { timeout: 15_000 }).toContain('AggregateError');
    expect(p.externe).toEqual([]);
  });

  test('baza proiectelor la o versiune mai nouă (VersionError, defectul nostru): raportul pleacă, nu e „doar local”', async ({ page }) => {
    const p = await plasa(page);
    // Cererea de deschidere la versiunea 7 intră în coada bazei înaintea celei a aplicației (la 1), deci aplicația primește VersionError.
    await page.addInitScript(() => {
      const r = indexedDB.open('cncvs2-proiecte', 7);
      r.onupgradeneeded = () => { r.result.createObjectStore('versiuni'); };
      r.onsuccess = () => { r.result.close(); };
    });
    await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG_FIREBASE) }));
    const apeluri = await functiaPrimeste(page);
    await page.goto('/');
    await expect.poll(() => apeluri.join('\n'), { timeout: 15_000 }).toMatch(/version/i);
    const intrari = await page.evaluate(() => localStorage.getItem('cncvs2.jurnalErori.v1') ?? '');
    expect(intrari).not.toContain('"doarLocala":true');
    expect(p.externe).toEqual([]);
  });

  test('ușa proiectului care nu vine (o publicare nouă): „necitit acum” pleacă la server', async ({ page }) => {
    const p = await plasa(page);
    await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG_FIREBASE) }));
    const apeluri = await functiaPrimeste(page);
    await page.goto('/');
    await adauga(page, 'dreptunghi');
    await expect.poll(() => page.evaluate(() => new Promise<number>((ok) => {
      const r = indexedDB.open('cncvs2-proiecte');
      r.onsuccess = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('versiuni')) { db.close(); ok(0); return; }
        const c = db.transaction('versiuni').objectStore('versiuni').count();
        c.onsuccess = () => { db.close(); ok(c.result); };
      };
    }))).toBeGreaterThan(0);
    await page.route(/\/assets\/schemaDocument-[^/]+\.js$/, (r) => r.abort());
    await page.reload();
    await expect(page.getByTestId('proiect')).toContainText('Proiectul salvat n-a putut fi citit acum');
    await expect.poll(() => apeluri.join('\n'), { timeout: 15_000 }).toContain('ușa de încărcare');
    expect(p.externe).toEqual([]);
  });

  for (const [cum, raspunde] of [
    ['oprită (blocant, rețea)', (r: Route) => r.abort()],
    ['servită goală (blocant care o înlocuiește)', (r: Route) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' })],
  ] as const) {
    test(`App Check: cu enterprise.js ${cum}, raportorul se stinge („app-check”) în termenul tokenului, fără niciun POST și fără agățare`, async ({ page }) => {
      test.setTimeout(60_000);
      const p = await plasa(page);
      const apeluri: string[] = [];
      const avertismente: string[] = [];
      page.on('console', (m) => { if (m.type() === 'warning' && m.text().includes('raportorul de erori')) avertismente.push(m.text()); });
      page.on('request', (r) => { if (r.url().startsWith(FUNCTIE)) apeluri.push(r.method()); });
      await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG_APP_CHECK) }));
      await page.route(/^https:\/\/www\.google\.com\/recaptcha\/enterprise\.js/, raspunde);
      await page.goto('/');
      await expect(page.locator('[data-actiune="import.svg"]')).toBeEnabled();
      await provoaca(page, 'eroare cu reCAPTCHA blocat');
      await expect.poll(() => avertismente, { timeout: 20_000 }).toEqual(['raportorul de erori: stins (app-check)']);
      // Stins, nu agățat: a doua eroare e lăsată imediat, tot fără niciun apel.
      await provoaca(page, 'a doua eroare');
      await page.waitForTimeout(1500);
      expect(apeluri).toEqual([]);
      expect(avertismente).toHaveLength(1);
      expect(p.externe.filter((u) => !u.startsWith('GET https://www.google.com/recaptcha/enterprise.js'))).toEqual([]);
    });
  }
});
