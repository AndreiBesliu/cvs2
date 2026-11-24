import { expect, test, type Page } from '@playwright/test';
import { adaugaZile, SumatorZi, ziuaLocala, type LotZi } from '../../shared/utilizareZi.ts';

/**
 * Fila Utilizare din `/admin` (ADR 0262 §6, felia A.9b), pe emulatoare: sumele zilelor scrise ca de jobul de noapte (cu
 * sumatorul lui), apoi fila: perioada (ieri și zilele dinainte, fără azi), cine (clienții, personalul), cifrele, cele mai
 * folosite, ce nu se folosește (din catalogul generat la build), fluxurile (A.10: pâlnia, secvențele), frecările, duratele; un
 * rol doar cu „Utilizare: citește” o vede, unul fără ea, nu.
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
const LENT = { timeout: 60_000 };
const UTIL = 'RUtilizareCiteste000';
const ERORI = 'RErori00000000000000';

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`${AUTH}/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' });
});

function val(x: unknown): unknown {
  if (x === null) return { nullValue: null };
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
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

const lot = (uid: string, sesiune: string, personal: boolean, evenimente: Record<string, unknown>[]): LotZi =>
  ({ uid, sesiune, personal, aruncate: 0, evenimente });
async function zi(z: string, loturi: LotZi[]): Promise<void> {
  const s = new SumatorZi(z);
  for (const l of loturi) s.adauga(l);
  await scrie(`utilizareZi/${z}`, JSON.parse(JSON.stringify(s.rezultat())) as Record<string, unknown>);
}
const ROTESTE = (t: number, de: string, rez = 'ok', n?: number) => ({ fel: 'actiune', t, id: 'document.roteste', de, rez, ...(n ? { n } : {}) });

/** Ieri și alaltăieri (în perioadă), acum 40 de zile (doar în 90), azi (niciodată: ziua nu e încheiată). */
async function zilele(): Promise<void> {
  const azi = ziuaLocala(Date.now());
  await zi(adaugaZile(azi, -1), [
    lot('ana', 'aaaaaaaaaaaaaaa1', false, [
      { fel: 'actiune', t: 500, id: 'document.importa', de: 'bara', rez: 'ok' }, { fel: 'actiune', t: 600, id: 'document.rol', de: 'panou', rez: 'ok' },
      ROTESTE(1_000, 'bara', 'ok', 3), ROTESTE(2_000, 'tasta'), ROTESTE(3_000, 'bara', 'motiv.nimic-ales'),
      { fel: 'actiune', t: 4_000, id: 'export.gcode', de: 'paleta', rez: 'ok' },
      { fel: 'dialog', t: 5_000, id: 'eticheta.export-titlu', rez: 'deschis' }, { fel: 'dialog', t: 6_000, id: 'eticheta.export-titlu', rez: 'renuntat' },
      { fel: 'calcul', t: 7_000, id: 'export', ms: 1_000, rez: 'ok', forme: 100 }, { fel: 'calcul', t: 8_000, id: 'export', ms: 3_000, rez: 'ok', forme: 100 },
    ]),
    lot('owner', 'ooooooooooooooo1', true, [ROTESTE(1, 'bara', 'ok', 5)]),
  ]);
  await zi(adaugaZile(azi, -2), [
    lot('ana', 'aaaaaaaaaaaaaaa2', false, [ROTESTE(1_000, 'meniu'), { fel: 'calcul', t: 2_000, id: 'export', ms: 30_000, rez: 'eroare', forme: 10 }]),
    lot('ion', 'iiiiiiiiiiiiiii1', false, [ROTESTE(1_000, 'tasta', 'motiv.nimic-ales'), { fel: 'unealta', t: 3_000, id: 'noduri', de: 'tasta' }]),
  ]);
  await zi(adaugaZile(azi, -40), [lot('vlad', 'vvvvvvvvvvvvvvv1', false, [ROTESTE(1, 'bara')])]);
  await zi(azi, [lot('azi', 'zzzzzzzzzzzzzzz1', false, [ROTESTE(1, 'bara', 'ok', 50)])]);
}

async function deschide(page: Page): Promise<void> {
  await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  await page.goto('/admin');
}
async function intraCuRolul(page: Page, rol: string): Promise<void> {
  await deschide(page);
  const [fereastra] = await Promise.all([page.waitForEvent('popup'), page.locator('[data-admin="intra"]').click()]);
  await fereastra.waitForLoadState();
  await fereastra.locator('#add-account-button').click();
  await fereastra.locator('#autogen-button').click();
  await fereastra.locator('#sign-in').click();
  const uid = (await page.locator('[data-admin="uid"]').textContent()) ?? '';
  await scrie(`staff/${uid}`, { rol });
  await page.locator('[data-admin="reincearca"]').click();
  await expect(page.locator('[data-fila="cont"]')).toBeVisible(LENT);
}
const cifra = (page: Page, c: string) => page.locator(`[data-uz-cifra="${c}"] dd`);

test('owner-ul: perioada fără ziua de azi, cifrele, cele mai folosite, ce nu se folosește, frecările, duratele; perioada și cine', async ({ page }) => {
  test.setTimeout(120_000);
  await zilele();
  await intraCuRolul(page, 'owner');
  await page.locator('[data-fila="utilizare"]').click();
  await expect(page.locator('[data-uz="adunate"]')).toContainText('Din 2 zile', LENT);
  // Clienții, 30 de zile: Ana (ambele zile) și Ion; ziua de azi și cea de acum 40 de zile nu intră.
  await expect(cifra(page, 'oameni')).toHaveText('≈ 2');
  await expect(cifra(page, 'sesiuni')).toHaveText('3');
  await expect(cifra(page, 'exporturi')).toHaveText('2');
  await expect(cifra(page, 'refuzate')).toHaveText('2');
  const prima = page.locator('[data-uz-folosita]').first();
  await expect(prima).toHaveAttribute('data-uz-folosita', 'document.roteste');
  await expect(prima).toContainText('Rotește');
  await expect(prima).toContainText('7 · ≈ 2 oameni');
  await expect(page.locator('[data-uz-folosita="export.gcode"]')).toContainText('1 · ≈ 1 om');
  await expect(page.locator('[data-uz-perioada="30"]')).toHaveText('30 de zile');
  // Ce nu se folosește: din catalog, cele cu 0 oameni întâi.
  const nefolosite = page.locator('[data-uz-nefolosita]');
  await expect(nefolosite).toHaveCount(15);
  await expect(nefolosite.first().locator('td').first()).toHaveText('0');
  // Motivul, în cuvinte (cheia mesajelor de bază), cu cheia în titlu; pluralul după numărul deschiderilor.
  const refuz = page.locator('[data-uz-refuz="document.roteste"]');
  await expect(refuz).toContainText('Rotește · N-ai ales nimic. · 2');
  await expect(refuz).toHaveAttribute('data-uz-motiv', 'motiv.nimic-ales');
  await expect(page.locator('[data-uz-parasit="eticheta.export-titlu"]')).toContainText('1 din 1 deschidere');
  // Fluxurile (A.10): Ana importă, pune rolul și exportă (ieri); celelalte două sesiuni se opresc la deschidere.
  await expect(cifra(page, 'durata')).toHaveText('sub 1 min');
  await expect(page.locator('[data-uz-pas="deschidere"] .uz-numar')).toHaveText('3 sesiuni · ≈ 2 oameni · se opresc aici: 2');
  await expect(page.locator('[data-uz-pas="rol"] .uz-numar')).toHaveText('o sesiune · ≈ 1 om');
  await expect(page.locator('[data-uz-pas="export"] .uz-numar')).toHaveText('o sesiune · ≈ 1 om · se opresc aici: 1');
  await expect(page.locator('[data-uz-pas="masina"] .uz-numar')).toHaveText('0 sesiuni · ≈ 0 oameni');
  const secventa = page.locator('[data-uz-secvente="3"] [data-uz-secventa="document.importa>document.rol>document.roteste"]');
  await expect(secventa).toHaveText('Importă → Rolul de tăiere → Rotește · într-o sesiune, o dată');
  await expect(page.locator('[data-uz-secvente="4"] [data-uz-secventa]')).toHaveCount(1);
  const exp = page.locator('[data-uz-durata="export"] td');
  await expect(exp).toHaveText(['3', 'sub 3 s', 'sub 30 s', '1']);
  // 90 de zile: și ziua de acum 40 de zile (Vlad); 7 zile: din nou doar cele două.
  await page.locator('[data-uz-perioada="90"]').click();
  await expect(page.locator('[data-uz="adunate"]')).toContainText('Din 3 zile', LENT);
  await expect(cifra(page, 'oameni')).toHaveText('≈ 3');
  await page.locator('[data-uz-perioada="7"]').click();
  await expect(page.locator('[data-uz="adunate"]')).toContainText('Din 2 zile', LENT);
  // Personalul, deoparte.
  await page.locator('[data-uz="segment"]').selectOption('personal');
  await expect(cifra(page, 'oameni')).toHaveText('≈ 1');
  await expect(cifra(page, 'sesiuni')).toHaveText('1');
  await page.locator('[data-uz="segment"]').selectOption('toti');
  await expect(cifra(page, 'sesiuni')).toHaveText('4');
});

test('un rol doar cu „Utilizare: citește” vede fila și sumele; unul fără ea nu vede fila; fără zile, mesajul gol', async ({ page, browser }) => {
  test.setTimeout(120_000);
  await scrie(`roluri/${UTIL}`, { nume: 'Utilizare', permisiuni: ['utilizare.citeste'] });
  await scrie(`roluri/${ERORI}`, { nume: 'Erori', permisiuni: ['erori.citeste'] });
  await intraCuRolul(page, UTIL);
  await page.locator('[data-fila="utilizare"]').click();
  await expect(page.locator('[data-uz="gol"]')).toBeVisible(LENT);
  await zilele();
  await page.locator('[data-uz-perioada="90"]').click();
  await expect(cifra(page, 'oameni')).toHaveText('≈ 3', LENT);
  const alta = await browser.newPage();
  await intraCuRolul(alta, ERORI);
  await expect(alta.locator('[data-fila="erori"]')).toBeVisible();
  await expect(alta.locator('[data-fila="utilizare"]')).toHaveCount(0);
  await alta.close();
});
