import { expect, test, type Page } from '@playwright/test';

/**
 * Felia A.3 a adminului reproiectat (ADR 0260 §3), pe emulatoare: fila Tichete cu lista în stânga și tichetul ales în
 * dreapta, ca o conversație (raportarea, răspunsurile echipei, câmpul răspunsului jos); numerele filtrului, și la „Toate”;
 * erorile din sesiune cu grupul lor și legătura spre fila Erori (și un grup mai vechi decât cele mai recente 100, adus
 * singur); ciornele, pe tichet și peste un drum în fila Erori; „Răspunde și rezolvă”, cu nimic trimis cât se recitește lista;
 * un rol care răspunde fără fila Erori (nicio citire în `errorLogs`); un rol care doar citește.
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
const ROL = 'RTichete000000000000';
const T = (k: number): string => `TichetA3${k}`.padEnd(20, '0');
/** G1: recentă, nerezolvată; GV: veche, în afara celor mai recente 100; GX: nu mai e în jurnal. */
const G1 = 'a'.repeat(32);
const GV = 'd'.repeat(32);
const GX = 'e'.repeat(32);
const UMPLUTURA = 100;
const ZI = 86_400_000;
const ACUM = Date.now();

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
const campuri = (d: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, val(v)]));

async function scrie(cale: string, d: Record<string, unknown>): Promise<void> {
  const r = await fetch(`${BAZA}/${cale}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: campuri(d) }),
  });
  expect(r.status, await r.clone().text()).toBe(200);
}

async function citeste(cale: string): Promise<Record<string, Valoare>> {
  const r = await fetch(`${BAZA}/${cale}`, { headers: { Authorization: 'Bearer owner' } });
  expect(r.status).toBe(200);
  return ((await r.json()) as { fields: Record<string, Valoare> }).fields;
}

/** Grupurile de erori, scrise dintr-o singură cerere (`:commit`), fără apariții. */
async function grupuri(lista: readonly { readonly id: string; readonly mesaj: string; readonly ultimaData: Date }[]): Promise<void> {
  const writes = lista.map((g) => {
    const ultima = { cand: g.ultimaData, tip: 'randare', mesaj: g.mesaj, stiva: '', build: 'b-proba', instanta: 'local', adresa: '/', browser: 'Edge', uid: 'om1', context: '' };
    const d = {
      schema: 1, amprenta: g.id, sursa: 'client', tip: 'randare', mesaj: g.mesaj, numar: 1, oameni: ['om1'], primaData: g.ultimaData,
      ultimaData: g.ultimaData, rezolvat: false, ultima,
    };
    return { update: { name: `projects/${PROIECT}/databases/(default)/documents/errorLogs/${g.id}`, fields: campuri(d) } };
  });
  const r = await fetch(`${BAZA}:commit`, {
    method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }),
  });
  expect(r.status, await r.clone().text()).toBe(200);
}

async function tichet(k: number, d: {
  readonly stare: 'nou' | 'deschis' | 'rezolvat'; readonly fel: 'problema' | 'idee' | 'intrebare'; readonly text: string; readonly ore: number;
  readonly amprente?: readonly string[]; readonly raspunsuri?: readonly { readonly deEmail: string; readonly text: string }[];
}): Promise<void> {
  const creatLa = new Date(ACUM - d.ore * 3_600_000);
  await scrie(`tichete/${T(k)}`, {
    schema: 1, fel: d.fel, text: d.text, autor: `client${k}`, autorEmail: `client${k}@exemplu.ro`, creatLa, modificatLa: creatLa, stare: d.stare,
    raspunsuri: (d.raspunsuri ?? []).map((r) => ({ de: 'om0', deEmail: r.deEmail, text: r.text, la: new Date(creatLa.getTime() + 600_000) })),
    rezolvatLa: d.stare === 'rezolvat' ? new Date(ACUM - ZI) : null, versiune: 1, amprente: d.amprente ?? [], necititeAutor: 0,
    ultimulRaspunsLa: null, aplicatia: { versiune: 'b-proba', instanta: 'local', limba: 'ro', browser: 'Edge', plan: 'gratuit' },
  });
}

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9095/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' });
  // G1, cea mai nouă; 100 de grupuri după ea; GV, cu 300 de zile mai veche: fila Erori citește cele mai recente 100.
  await grupuri([
    { id: G1, mesaj: 'TypeError: c.puncte is undefined', ultimaData: new Date(ACUM - 30_000) },
    ...Array.from({ length: UMPLUTURA }, (_, k) => ({ id: `f${k.toString(16).padStart(31, '0')}`, mesaj: `Error: umplutura ${k}`, ultimaData: new Date(ACUM - (k + 2) * 60_000) })),
    { id: GV, mesaj: 'RangeError: foaia veche', ultimaData: new Date(ACUM - 300 * ZI) },
  ]);
  await tichet(1, { stare: 'nou', fel: 'problema', text: 'Exportul se oprește la 40 %\nAm un proiect cu trei foi.', ore: 2, amprente: [G1, GV, GX] });
  // T2 are 12 răspunsuri: conversația e mai înaltă decât ecranul, iar câmpul răspunsului trebuie să rămână la vedere.
  await tichet(2, {
    stare: 'deschis', fel: 'intrebare', text: 'Cum fac un buzunar mai adânc?', ore: 5,
    raspunsuri: Array.from({ length: 12 }, (_, k) => ({ deEmail: 'echipa@exemplu.ro', text: k === 0 ? 'Din adâncimea operației.' : `Răspunsul ${k + 1}, cu destul text cât să ocupe un rând întreg în conversația tichetului.` })),
  });
  await tichet(3, { stare: 'rezolvat', fel: 'idee', text: 'Aș vrea liste de tăiere în PDF', ore: 30 });
  await tichet(4, { stare: 'nou', fel: 'problema', text: 'Imprimanta nu apare în listă', ore: 50 });
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

test('Tichete: lista în stânga, conversația în dreapta; numerele, erorile din sesiune spre Erori, ciornele, „Răspunde și rezolvă”', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.setViewportSize({ width: 1280, height: 800 });
  await intraCuRolul(page, 'owner');
  await bara(page, 'tichete').click();

  // Lista: cele mai noi întâi, primul ales; numerele filtrului, și la „Toate”.
  await expect(page.locator('[data-tichet]')).toHaveCount(4, LENT);
  await expect(page.locator('[data-tichet]').first()).toHaveAttribute('data-tichet', T(1));
  await expect(page.locator(`[data-tichet="${T(1)}"]`)).toHaveAttribute('data-ales', 'true');
  await expect(page.locator('[data-filtru-tic]')).toHaveText(['Toate (4)', 'Nou (2)', 'Deschis (1)', 'Rezolvat (1)']);
  // Titlul rândului e primul rând al textului; vârsta roșie doar la tichetul nou fără răspuns, mai vechi de 48 h.
  await expect(page.locator(`[data-tichet="${T(1)}"] [data-tic="titlu"]`)).toHaveText('Exportul se oprește la 40 %');
  await expect(page.locator('[data-tichet] [data-tic="fara-raspuns"]')).toHaveCount(1);
  await expect(page.locator(`[data-tichet="${T(4)}"] [data-tic="fara-raspuns"]`)).toBeVisible();

  // Detaliul stă alături, fără să împingă lista; textul rândurilor pornește din stânga.
  const detaliu = page.locator('[data-tic="detaliu"]');
  await expect(detaliu).toHaveAttribute('data-tic-ales', T(1));
  const lista = await page.locator('[data-tic="lista"]').boundingBox();
  const cutie = await detaliu.boundingBox();
  expect(lista && cutie && cutie.x >= lista.x + lista.width).toBe(true);
  for (const rand of await page.locator('[data-tichet] button').all()) {
    const b = await rand.boundingBox();
    const m = await rand.locator('[data-tic="titlu"]').boundingBox();
    expect(b && m && m.x - b.x < 20).toBe(true);
  }
  // Conversația: raportarea întâi, cu textul întreg; câmpul răspunsului, jos, în ecran.
  await expect(detaliu.locator('[data-tic="raportarea"] [data-tic="text"]')).toHaveText('Exportul se oprește la 40 %\nAm un proiect cu trei foi.');
  await expect(detaliu.locator('[data-tic="raspuns-text"]')).toBeInViewport();

  // Erorile din sesiune: grupul citit, cu legătura spre Erori; unul care nu mai e în jurnal o spune, fără legătură.
  const eroare = (a: string) => detaliu.locator(`[data-amprenta="${a}"]`);
  await expect(eroare(G1)).toContainText('TypeError: c.puncte is undefined', LENT);
  await expect(eroare(GV)).toContainText('RangeError: foaia veche');
  await expect(eroare(GX).locator('[data-tic="eroare-lipsa"]')).toBeVisible();
  await expect(eroare(GX).locator('[data-tic="spre-erori"]')).toHaveCount(0);

  // Ciorna rămâne pe tichetul ei când se alege altul.
  await detaliu.locator('[data-tic="raspuns-text"]').fill('O ciornă pentru primul tichet.');
  await page.locator(`[data-tichet="${T(2)}"] button`).click();
  await expect(detaliu).toHaveAttribute('data-tic-ales', T(2));
  await expect(detaliu.locator('[data-tic="raspuns-text"]')).toHaveValue('');
  await expect(detaliu.locator('[data-tic="raspuns"]')).toHaveCount(12);
  await expect(detaliu.locator('[data-tic="raspuns"]').first()).toContainText('Din adâncimea operației.');
  // Conversația lungă se derulează în detaliu: câmpul și butoanele răspunsului rămân întregi în ecran, și înainte de
  // prima derulare a paginii (detaliul stă atunci sub antet).
  await page.evaluate(() => { window.scrollTo(0, 0); });
  await expect(detaliu.locator('[data-tic="raspuns-text"]')).toBeInViewport({ ratio: 1 });
  await expect(detaliu.locator('[data-tic="trimite"]')).toBeInViewport({ ratio: 1 });
  await page.locator(`[data-tichet="${T(1)}"] button`).click();
  await expect(detaliu.locator('[data-tic="raspuns-text"]')).toHaveValue('O ciornă pentru primul tichet.');

  // Grupul vechi (în afara celor mai recente 100): legătura deschide fila Erori cu el ales, adus singur și pus primul.
  await eroare(GV).locator('[data-tic="spre-erori"]').click();
  await expect(bara(page, 'erori')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator(`[data-grup="${GV}"]`)).toHaveAttribute('data-ales', 'true', LENT);
  await expect(page.locator('[data-grup]').first()).toHaveAttribute('data-grup', GV);
  await expect(page.locator('[data-grup]')).toHaveCount(UMPLUTURA + 1);
  await expect(page.locator('[data-admin="detaliu-eroare"]')).toContainText('RangeError: foaia veche');

  // Înapoi în Tichete, ciorna e tot acolo.
  await bara(page, 'tichete').click();
  await expect(detaliu).toHaveAttribute('data-tic-ales', T(1), LENT);
  await expect(detaliu.locator('[data-tic="raspuns-text"]')).toHaveValue('O ciornă pentru primul tichet.');

  // „Răspunde și rezolvă”: răspunsul, apoi starea, pe versiunea întoarsă de răspuns. Cât se recitește lista (ținută aici),
  // nimic nu mai pleacă, chiar cu text în câmp: versiunea arătată ar fi cea veche.
  let elibereaza = (): void => {};
  const oprit = new Promise<void>((ok) => { elibereaza = ok; });
  // Pe cale, nu cu un glob: adresa are `?key=…` după `:runQuery` (18.11, A.2).
  const listaTichete = (u: URL): boolean => u.pathname.endsWith('/documents:runQuery');
  let tinute = 0;
  await page.route(listaTichete, async (r) => { tinute += 1; await oprit; await r.continue(); });
  await detaliu.locator('[data-tic="raspuns-text"]').fill('Am reparat exportul în versiunea nouă.');
  await detaliu.locator('[data-tic="trimite-si"]').click();
  await expect(detaliu.locator('[data-tic="gata"]')).toHaveText('Răspunsul a ajuns la raportare, iar starea e acum: Rezolvat.', LENT);
  await expect.poll(() => tinute, { message: 'recitirea listei e ținută' }).toBeGreaterThanOrEqual(1);
  await expect(detaliu.locator('[data-tic="raspuns-text"]')).toHaveValue('');
  await detaliu.locator('[data-tic="raspuns-text"]').fill('Încă un rând.');
  await expect(detaliu.locator('[data-tic="trimite"]')).toBeDisabled();
  await expect(detaliu.locator('[data-tic="trimite-si"]')).toBeDisabled();
  elibereaza();
  await page.unroute(listaTichete);
  await expect(page.locator(`[data-tichet="${T(1)}"]`)).toHaveAttribute('data-stare', 'rezolvat', LENT);
  await expect(detaliu.locator('[data-tic="trimite"]')).toBeEnabled();
  await expect(detaliu.locator('[data-tic="raspuns-text"]')).toHaveValue('Încă un rând.');
  await expect(detaliu.locator('[data-tic="raspuns"]')).toHaveText([/Am reparat exportul în versiunea nouă\./]);
  await expect(detaliu.locator('[data-tic="trimite-si"]')).toHaveText('Răspunde și redeschide');
  const t1 = await citeste(`tichete/${T(1)}`);
  expect([t1['stare']?.stringValue, t1['raspunsuri']?.arrayValue?.values?.length, t1['versiune']?.integerValue]).toEqual(['rezolvat', 1, '3']);
  // Al doilea răspuns, fără „Reîncarcă”, pleacă pe versiunea nouă (din 15.B↑a, câmpul ținea versiunea de la deschidere).
  await detaliu.locator('[data-tic="trimite"]').click();
  await expect(detaliu.locator('[data-tic="gata"]')).toHaveText('Răspunsul a ajuns la raportare.', LENT);
  await expect(detaliu.locator('[data-tic="raspuns"]')).toHaveCount(2, LENT);
  const t1b = await citeste(`tichete/${T(1)}`);
  expect([t1b['stare']?.stringValue, t1b['raspunsuri']?.arrayValue?.values?.length, t1b['versiune']?.integerValue]).toEqual(['rezolvat', 2, '4']);

  // Un filtru care ascunde tichetul ales mută alegerea pe primul arătat; ridicarea filtrului n-o mută înapoi.
  await page.locator('[data-filtru-tic="nou"]').click();
  await expect(page.locator('[data-tichet]')).toHaveCount(1);
  await expect(detaliu).toHaveAttribute('data-tic-ales', T(4));
  await page.locator('[data-filtru-tic="toate"]').click();
  await expect(page.locator('[data-tichet]')).toHaveCount(4);
  await expect(detaliu).toHaveAttribute('data-tic-ales', T(4));

  // Sub 800 px, detaliul trece sub listă; nimic nu iese din ecran în dreapta.
  await page.setViewportSize({ width: 700, height: 900 });
  const l2 = await page.locator('[data-tic="lista"]').boundingBox();
  const d2 = await detaliu.boundingBox();
  expect(l2 && d2 && d2.y >= l2.y + l2.height).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(erori).toEqual([]);
});

test('un rol care răspunde, fără fila Erori: amprentele ca text, nicio citire în errorLogs; câmpul și starea', async ({ page }) => {
  await scrie(`roluri/${ROL}`, { nume: 'Suport', permisiuni: ['tichete.raspunde'] });
  let citiriErori = 0;
  page.on('request', (r) => { if (new URL(r.url()).pathname.includes('/errorLogs')) citiriErori += 1; });
  await intraCuRolul(page, ROL);
  await bara(page, 'tichete').click();
  const detaliu = page.locator('[data-tic="detaliu"]');
  await expect(detaliu).toHaveAttribute('data-tic-ales', T(1), LENT);
  await expect(detaliu.locator('[data-tic="amprente"]')).toContainText(`${G1}, ${GV}, ${GX}`);
  await expect(detaliu.locator('[data-tic="spre-erori"]')).toHaveCount(0);
  await expect(detaliu.locator('[data-tic="raspuns-text"]')).toBeVisible();
  await expect(detaliu.locator('[data-tic="rezolva"]')).toBeVisible();
  await expect(detaliu.locator('[data-tic="doar-citire"]')).toHaveCount(0);
  expect(citiriErori).toBe(0);
});

test('un rol care doar citește tichetele: conversația, fără câmp și fără stare', async ({ page }) => {
  await scrie(`roluri/${ROL}`, { nume: 'Citește', permisiuni: ['tichete.citeste'] });
  await intraCuRolul(page, ROL);
  await bara(page, 'tichete').click();
  const detaliu = page.locator('[data-tic="detaliu"]');
  await expect(detaliu).toHaveAttribute('data-tic-ales', T(1), LENT);
  await expect(detaliu.locator('[data-tic="raportarea"] [data-tic="text"]')).toBeVisible();
  await expect(detaliu.locator('[data-tic="doar-citire"]')).toBeVisible();
  await expect(detaliu.locator('[data-tic="formular-raspuns"]')).toHaveCount(0);
  await expect(detaliu.locator('[data-tic="rezolva"]')).toHaveCount(0);
});
