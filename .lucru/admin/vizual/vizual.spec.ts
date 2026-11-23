import { expect, test, type Page } from '@playwright/test';

// Bancul vizual al carcasei (felia A.1), doar local, necomis: capturi ale filei Azi, ale stărilor și ale intrării, în
// ambele teme și la mai multe lățimi, pe emulatoare, cu datele unei zile obișnuite.

test.use({ locale: 'ro-RO' });

const PROIECT = 'demo-cncvs2';
const FS = `http://127.0.0.1:8085/v1/projects/${PROIECT}/databases/(default)/documents`;
const CONFIG = {
  instanta: 'test',
  firebase: { apiKey: 'demo-cheie', authDomain: `${PROIECT}.firebaseapp.com`, projectId: PROIECT, appId: '1:1:web:1' },
  emulatoare: { auth: 'http://127.0.0.1:9095', firestore: '127.0.0.1:8085', functions: '127.0.0.1:5005' },
};
const DIR = '.tmp/vizual/capturi';

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
  const r = await fetch(`${FS}/${cale}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, val(v)])) }),
  });
  expect(r.status, await r.clone().text()).toBe(200);
}

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9095/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' });
  const ultima = { cand: new Date('2026-11-17T09:12:00Z'), tip: 'randare', mesaj: 'TypeError: c.puncte is undefined', stiva: '', build: 'b', instanta: 'test', adresa: '', browser: 'Edge', uid: 'om1', context: '' };
  for (const [k, mesaj] of [['1', 'TypeError: c.puncte is undefined'], ['2', 'Exportul a picat: memorie'], ['3', 'piesa 12 lipsă']] as const) {
    await scrie(`errorLogs/${k.repeat(32)}`, { schema: 1, amprenta: k.repeat(32), sursa: 'client', tip: 'randare', mesaj, numar: 3, oameni: ['om1'], primaData: new Date('2026-11-15T09:00:00Z'), ultimaData: new Date('2026-11-17T09:12:00Z'), rezolvat: false, ultima });
  }
  const acum = Date.now();
  await scrie('tichete/Tichet10000000000000', { schema: 1, fel: 'problema', text: 'Exportul se oprește la 40 %', autor: 'c1', autorEmail: 'ana@exemplu.ro', creatLa: new Date(acum - 3_600_000), modificatLa: new Date(acum - 3_600_000), stare: 'nou', raspunsuri: [], rezolvatLa: null, versiune: 1, amprente: [] });
  await scrie('tichete/Tichet20000000000000', { schema: 1, fel: 'intrebare', text: 'Cum leg mașina prin WiFi?', autor: 'c2', autorEmail: 'dan@exemplu.ro', creatLa: new Date(acum - 7_200_000), modificatLa: new Date(acum - 7_200_000), stare: 'nou', raspunsuri: [], rezolvatLa: null, versiune: 1, amprente: [] });
  for (const k of [1, 2, 3, 4]) await scrie(`sugestii/Sugestie${k}000000000000`, { schema: 1, titlu: `Ordinea foilor ${k}`, descriere: 'text', tip: 'idee', zona: 'cam', autor: 'om2', autorEmail: 'mihai@exemplu.ro', creataLa: new Date(acum - k * 3_600_000), modificataLa: new Date(acum - k * 3_600_000), stare: 'noua', nota: '', versiune: 1 });
  for (const k of [1, 2, 3, 4, 5]) await scrie(`conturi/client${k}`, { schema: 1, email: `client${k}@exemplu.ro`, nume: `Client ${k}`, creatLa: new Date(acum - k * 86_400_000), plan: 'proba' });
  const ora = new Date(acum - 3_600_000 * 5);
  await scrie('marcaje/backupZilnic', { schema: 1, job: 'backupZilnic', ultimaPornire: ora, ultimulFinal: ora, ultimulSucces: ora, esecuriLaRand: 0, ultimaEroare: null });
  await scrie('marcaje/verificaBackup', { schema: 1, job: 'verificaBackup', ultimaPornire: ora, ultimulFinal: ora, ultimulSucces: ora, esecuriLaRand: 0, ultimaEroare: null });
  await scrie('audit/a1', { schema: 1, cand: new Date(acum - 1_800_000), cine: 'c1', rol: null, actiune: 'tichete.raporteaza', tinta: 'tichete/Tichet10000000000000', inainte: null, dupa: { fel: 'problema' } });
  await scrie('audit/a2', { schema: 1, cand: new Date(acum - 5_400_000), cine: 'om2', rol: 'RSuport0000000000000', actiune: 'sugestii.scrie', tinta: 'sugestii/Sugestie1000000000000', inainte: null, dupa: { titlu: 'Ordinea foilor la export' } });
  await scrie('audit/a3', { schema: 1, cand: new Date(acum - 86_400_000), cine: 'om0', rol: 'owner', actiune: 'erori.marcheaza', tinta: `errorLogs/${'9'.repeat(32)}`, inainte: { rezolvat: false }, dupa: { rezolvat: true } });
});

async function intraOwner(page: Page, cifra = '3'): Promise<void> {
  await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(CONFIG) }));
  await page.goto('/admin');
  await expect(page.locator('[data-admin="intrare"]')).toBeVisible();
  await page.screenshot({ path: `${DIR}/01-intrarea.png` });
  const [f] = await Promise.all([page.waitForEvent('popup'), page.locator('[data-admin="intra"]').click()]);
  await f.waitForLoadState();
  await f.locator('#add-account-button').click();
  await f.locator('#autogen-button').click();
  await f.locator('#sign-in').click();
  await expect(page.locator('[data-admin="fara-rol"]')).toBeVisible({ timeout: 90_000 });
  await page.screenshot({ path: `${DIR}/02-fara-rol.png` });
  const uid = (await page.locator('[data-admin="uid"]').textContent()) ?? '';
  await scrie(`staff/${uid}`, { rol: 'owner' });
  await page.locator('[data-admin="reincearca"]').click();
  await expect(page.locator('[data-azi="erori"] [data-cifra]')).toHaveText(cifra, { timeout: 30_000 });
  await expect(page.locator('[data-azi-job]').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-azi="asteapta"] [data-asteapta], [data-azi="asteapta"] [data-azi-gol]').first()).toBeVisible({ timeout: 30_000 });
}

test('capturi: Azi, bara, căutarea, meniul contului, stările; luminos și întunecat; 1440, 1024, 600', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await intraOwner(page);
  await page.screenshot({ path: `${DIR}/03-azi-1440.png` });
  await page.locator('[data-admin="cauta"]').fill('ex');
  await page.locator('[data-admin="cauta-necitite"]').waitFor();
  await page.screenshot({ path: `${DIR}/04-cautare-necitite.png` });
  await page.keyboard.press('Escape');
  await page.locator('[data-admin="bara"] [data-fila="erori"]').click();
  await expect(page.locator('[data-grup]').first()).toBeVisible();
  await page.locator('[data-admin="bara"] [data-fila="tichete"]').click();
  await expect(page.locator('[data-tichet]').first()).toBeVisible();
  await page.locator('[data-admin="cauta"]').fill('ex');
  await page.locator('[data-gasit]').first().waitFor();
  await page.screenshot({ path: `${DIR}/05-cautare.png` });
  await page.keyboard.press('Escape');
  await page.locator('[data-admin="meniu-cont"]').click();
  await page.screenshot({ path: `${DIR}/06-meniu-cont.png` });
  await page.keyboard.press('Escape');
  await page.locator('[data-filtru-tic="rezolvat"]').click();
  await page.screenshot({ path: `${DIR}/07-tichete-gol-filtru.png` });
  await page.locator('[data-admin="bara"] [data-fila="azi"]').click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/08-azi-intunecat.png` });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/09-azi-1024.png`, fullPage: true });
  await page.setViewportSize({ width: 600, height: 900 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/10-azi-600.png`, fullPage: true });
  // Cât se încarcă: o citire întârziată.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route('**/documents:runQuery', async (r) => { await new Promise((ok) => setTimeout(ok, 3000)); await r.continue(); });
  await page.locator('[data-admin="bara"] [data-fila="utilizatori"]').click();
  await page.locator('[data-schita]').waitFor();
  await page.screenshot({ path: `${DIR}/11-se-incarca.png` });
});

// Felia A.2: Erori (lista, detaliul alături, graficul pe 14 zile, filtrele) și Diagnoza (sumarul, problemele întâi).
test('capturi A.2: Erori și Diagnoza; luminos și întunecat; 1440, 1024, 760', async ({ page }) => {
  test.setTimeout(180_000);
  const acum = Date.now();
  const zi = 86_400_000;
  // Un grup cu apariții răspândite pe două săptămâni, unul de pe server, unul rezolvat.
  const aparitie = (cand: Date, mesaj: string) => ({ cand, tip: 'randare', mesaj, stiva: 'TypeError: c.puncte is undefined\n    at deseneaza (Planse.tsx:812:14)\n    at commitHookEffectListMount (react-dom.js:1:1)', build: '531ecfb4b535', instanta: 'test', adresa: '/app/proiect/7', browser: 'Edge 142 / Windows', uid: 'om1', context: 'foaia 3' });
  const zileG1 = [0, 0, 0, 1, 1, 2, 4, 4, 4, 4, 6, 9, 12, 13];
  await scrie(`errorLogs/${'1'.repeat(32)}`, { schema: 1, amprenta: '1'.repeat(32), sursa: 'client', tip: 'randare', mesaj: 'TypeError: c.puncte is undefined', numar: 14, oameni: ['om1', 'om2', 'om3'], primaData: new Date(acum - 13 * zi), ultimaData: new Date(acum - 600_000), rezolvat: false, ultima: aparitie(new Date(acum - 600_000), 'TypeError: c.puncte is undefined') });
  for (const [k, d] of zileG1.entries()) await scrie(`errorLogs/${'1'.repeat(32)}/aparitii/a${k}`, aparitie(new Date(acum - d * zi - 600_000 - k * 60_000), 'TypeError: c.puncte is undefined'));
  await scrie(`errorLogs/${'4'.repeat(32)}`, { schema: 1, amprenta: '4'.repeat(32), sursa: 'server', tip: 'functie', mesaj: 'FirebaseError: permission-denied la exportaPlansa', numar: 2, oameni: ['om2'], primaData: new Date(acum - 2 * zi), ultimaData: new Date(acum - 3_600_000), rezolvat: false, ultima: aparitie(new Date(acum - 3_600_000), 'FirebaseError: permission-denied') });
  await scrie(`errorLogs/${'5'.repeat(32)}`, { schema: 1, amprenta: '5'.repeat(32), sursa: 'client', tip: 'randare', mesaj: 'RangeError: Maximum call stack size exceeded', numar: 1, oameni: ['om4'], primaData: new Date(acum - 20 * zi), ultimaData: new Date(acum - 20 * zi), rezolvat: true, ultima: aparitie(new Date(acum - 20 * zi), 'RangeError') });
  await page.setViewportSize({ width: 1440, height: 900 });
  await intraOwner(page, '4');
  await page.locator('[data-admin="bara"] [data-fila="erori"]').click();
  await expect(page.locator('[data-grafic="aparitii"] [data-zi]').first()).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `${DIR}/20-erori-1440.png` });
  await page.locator('[data-grafic="aparitii"] [data-zi]').last().hover();
  await page.locator('[data-grafic="aparitii"]').screenshot({ path: `${DIR}/21-grafic.png` });
  await page.locator(`[data-grup="${'4'.repeat(32)}"]`).click();
  await expect(page.locator('[data-admin="detaliu-eroare"]')).toContainText('exportaPlansa');
  await page.locator('[data-filtru="toate"]').click();
  await expect(page.locator('[data-grup]')).toHaveCount(5, { timeout: 30_000 });
  await page.screenshot({ path: `${DIR}/22-erori-toate.png` });
  await page.locator('[data-filtru-sursa="server"]').click();
  await page.screenshot({ path: `${DIR}/23-erori-server.png` });
  await page.locator('[data-filtru-sursa="toate"]').click();
  await page.locator('[data-filtru="nerezolvate"]').click();
  await page.locator(`[data-grup="${'1'.repeat(32)}"]`).click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/24-erori-intunecat.png` });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/25-erori-1024.png` });
  await page.setViewportSize({ width: 760, height: 900 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/26-erori-760.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('[data-admin="bara"] [data-fila="diagnoza"]').click();
  await expect(page.locator('[data-diag-sumar="bine"] strong')).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `${DIR}/27-diagnoza.png` });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/28-diagnoza-intunecat.png` });
  await page.emulateMedia({ colorScheme: 'light' });
});

// Felia A.3: Tichete (lista, conversația, erorile din sesiune spre Erori), și Erori cu un detaliu mai înalt decât ecranul.
test('capturi A.3: Tichete ca o conversație; luminos și întunecat; 1440, 1024, 760', async ({ page }) => {
  test.setTimeout(180_000);
  const acum = Date.now();
  const ora = 3_600_000;
  const aplicatia = { versiune: '531ecfb4b535', instanta: 'test', limba: 'ro', browser: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36 Edg/142.0', plan: 'gratuit' };
  const tichet = async (id: string, d: Record<string, unknown>): Promise<void> => {
    const creatLa = new Date(acum - (d['ore'] as number) * ora);
    const { ore: _o, ...rest } = d;
    await scrie(`tichete/${id}`, { schema: 1, autor: 'c1', creatLa, modificatLa: creatLa, rezolvatLa: null, versiune: 1, amprente: [], raspunsuri: [], necititeAutor: 0, aplicatia, ...rest });
  };
  const raspuns = (k: number, text: string) => ({ de: 'om0', deEmail: k % 2 === 0 ? 'andrei@exemplu.ro' : 'mihai@exemplu.ro', text, la: new Date(acum - (40 - k) * ora) });
  await tichet('TichetA3c00000000001', {
    ore: 1, fel: 'problema', stare: 'nou', autorEmail: 'ana@exemplu.ro',
    text: 'Exportul se oprește la 40 %\nAm un proiect cu trei foi. Când apăs Exportă G-code, bara merge până la 40 % și apoi nu se mai întâmplă nimic.',
    amprente: ['1'.repeat(32), 'e'.repeat(32)], proiect: { marime: 1_258_291, comprimat: 312_004, sha256: 'a'.repeat(64), schema: 25 },
  });
  await tichet('TichetA3c00000000002', {
    ore: 5, fel: 'intrebare', stare: 'deschis', autorEmail: 'dan@exemplu.ro', text: 'Cum fac un buzunar mai adânc decât lungimea frezei?',
    raspunsuri: [raspuns(1, 'Din adâncimea operației, în fereastra exportului. Peste lungimea frezei, aplicația te oprește cu motivul.'), raspuns(2, 'Ai reușit?')],
  });
  await tichet('TichetA3c00000000003', { ore: 30, fel: 'idee', stare: 'rezolvat', autorEmail: 'ioana@exemplu.ro', text: 'Aș vrea liste de tăiere în PDF', rezolvatLa: new Date(acum - 20 * ora) });
  await tichet('TichetA3c00000000004', { ore: 52, fel: 'problema', stare: 'nou', autorEmail: 'radu@exemplu.ro', text: 'Imprimanta nu apare în listă după ce o conectez la WiFi; am încercat și cu cablul, la fel.' });
  await tichet('TichetA3c00000000005', {
    ore: 40, fel: 'problema', stare: 'deschis', autorEmail: 'vlad@exemplu.ro', text: 'Urechile nu țin la plăcuțele din mijloc\nLa 5 mm între plăcuțe, cele din mijloc cad.',
    raspunsuri: Array.from({ length: 12 }, (_, k) => raspuns(k, k % 2 === 0 ? `Răspunsul echipei ${k + 1}: mai încearcă o dată cu 10 mm între plăcuțe și spune-ne dacă mai cad.` : `Mesajul ${k + 1}.`)),
  });
  // Pentru detaliul înalt al unei erori: 20 de apariții cu stiva lungă la G1 și 30 de grupuri în plus (lista mai lungă decât el).
  const stiva = Array.from({ length: 12 }, (_, k) => `    at f${k} (Planse.tsx:${800 + k}:14)`).join('\n');
  for (let k = 0; k < 20; k++) {
    await scrie(`errorLogs/${'1'.repeat(32)}/aparitii/a${k}`, { cand: new Date(acum - k * 5 * ora), tip: 'randare', mesaj: 'TypeError: c.puncte is undefined', stiva: `TypeError: c.puncte is undefined\n${stiva}`, build: '531ecfb4b535', instanta: 'test', adresa: '/app/proiect/7', browser: 'Edge', uid: 'om1', context: '' });
  }
  for (let k = 0; k < 30; k++) {
    const id = `7${k.toString(16).padStart(31, '0')}`;
    const ultima = { cand: new Date(acum - (k + 30) * ora), tip: 'randare', mesaj: `Error: altă eroare ${k}`, stiva: '', build: 'b', instanta: 'test', adresa: '', browser: 'Edge', uid: 'om1', context: '' };
    await scrie(`errorLogs/${id}`, { schema: 1, amprenta: id, sursa: 'client', tip: 'randare', mesaj: `Error: altă eroare ${k}`, numar: 1, oameni: ['om1'], primaData: ultima.cand, ultimaData: ultima.cand, rezolvat: false, ultima });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await intraOwner(page, '33');
  await page.locator('[data-admin="bara"] [data-fila="tichete"]').click();
  await expect(page.locator('[data-tic="detaliu"] [data-amprenta]').first()).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `${DIR}/30-tichete-1440.png` });
  await page.locator('[data-tichet="TichetA3c00000000005"] button').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/31-tichete-conversatie-lunga.png` });
  await page.locator('[data-tichet="TichetA3c00000000002"] button').click();
  await page.locator('[data-tic="raspuns-text"]').fill('O ciornă: mai încearcă cu adâncimea pe trepte.');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/32-tichete-intunecat.png` });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/33-tichete-1024.png` });
  await page.setViewportSize({ width: 760, height: 900 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/34-tichete-760.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('[data-tichet="TichetA3c00000000001"] button').click();
  await page.locator(`[data-amprenta="${'1'.repeat(32)}"] [data-tic="spre-erori"]`).click();
  await expect(page.locator(`[data-grup="${'1'.repeat(32)}"]`)).toHaveAttribute('data-ales', 'true', { timeout: 30_000 });
  await page.screenshot({ path: `${DIR}/35-erori-din-tichet.png` });
  // Un detaliu de eroare mai înalt decât ecranul (stiva lungă, 20 de apariții): se vede tot, la derulare?
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/36-erori-detaliu-inalt.png` });
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/37-erori-detaliu-inalt-derulat.png` });

  // Răspunsurile rapide (ADR 0261): Setări (goală, apoi cu exemplele, salvate) și pastilele din Tichete.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('[data-admin="bara"] [data-fila="setari"]').click();
  await expect(page.locator('[data-set="rapide-gol"]')).toBeVisible({ timeout: 30_000 });
  await page.locator('[data-set="rapide"]').screenshot({ path: `${DIR}/38-setari-rapide-gol.png` });
  await page.locator('[data-set="rapide-exemple"]').click();
  await page.locator('[data-rapid-rand="1"] [data-set="rapid-eticheta"]').fill('reparat ÎN VERSIUNEA NOUĂ');
  await page.locator('[data-rapid-rand="1"] [data-set="rapid-eticheta"]').fill('Am primit, ne uitam');
  await page.screenshot({ path: `${DIR}/39-setari-rapide-dublura.png`, fullPage: true });
  await page.locator('[data-rapid-rand="1"] [data-set="rapid-eticheta"]').fill('Reparat în versiunea nouă');
  await page.locator('[data-set="rapide-salveaza"]').click();
  await expect(page.locator('[data-set="rapide-gata"]')).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: `${DIR}/40-setari-rapide-salvate.png`, fullPage: true });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(300);
  await page.locator('[data-set="rapide"]').screenshot({ path: `${DIR}/41-setari-rapide-intunecat.png` });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.locator('[data-admin="bara"] [data-fila="tichete"]').click();
  await expect(page.locator('[data-rapid]').first()).toBeVisible({ timeout: 30_000 });
  await page.locator('[data-tic="raspuns-text"]').fill('Bună, Ana,');
  await page.locator('[data-rapid="Am primit, ne uităm"]').click();
  await page.screenshot({ path: `${DIR}/42-tichete-rapide.png` });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(300);
  await page.locator('[data-tic="detaliu"]').screenshot({ path: `${DIR}/43-tichete-rapide-intunecat.png` });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 760, height: 900 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/44-tichete-rapide-760.png`, fullPage: true });
});

test('capturi A.4: Sugestii ca tablă; luminos și întunecat; 1440, 1024, 760', async ({ page }) => {
  test.setTimeout(180_000);
  const acum = Date.now();
  const ora = 3_600_000;
  const sug = async (id: string, d: Record<string, unknown>): Promise<void> => {
    const creataLa = new Date(acum - (d['ore'] as number) * ora);
    const { ore: _o, decisa, ...rest } = d;
    await scrie(`sugestii/${id}`, {
      schema: 1, descriere: '', zona: 'cam', creataLa, modificataLa: creataLa, nota: '', versiune: 2, poza: null,
      decisaDe: decisa === undefined ? null : 'om0', decisaLa: decisa === undefined ? null : new Date(acum - (decisa as number) * ora), ...rest,
    });
  };
  await sug('SugA4000000000000001', { ore: 30, titlu: 'Lista de tăiere în PDF', tip: 'idee', autor: 'om3', autorEmail: 'ioana@exemplu.ro', stare: 'acceptata', decisa: 20, nota: 'Da, după etapa 6.' });
  await sug('SugA4000000000000002', { ore: 50, titlu: 'Ghidaje la 45°', tip: 'imbunatatire', autor: 'om2', autorEmail: 'mihai@exemplu.ro', stare: 'acceptata', decisa: 10 });
  await sug('SugA4000000000000003', { ore: 80, titlu: 'Mai multe foi în proiect', tip: 'idee', autor: 'om0', autorEmail: 'andrei@exemplu.ro', stare: 'in-lucru', decisa: 5 });
  await sug('SugA4000000000000004', { ore: 90, titlu: 'Plugin pentru laser', tip: 'idee', autor: 'om2', autorEmail: 'mihai@exemplu.ro', stare: 'amanata', decisa: 40, nota: 'După imprimanta 3D: aceeași legătură prin WiFi.' });
  await sug('SugA4000000000000005', { ore: 200, titlu: 'Centrează pe foaie', tip: 'imbunatatire', autor: 'om3', autorEmail: 'ioana@exemplu.ro', stare: 'facuta', decisa: 100 });
  await sug('SugA4000000000000006', { ore: 120, titlu: 'Tema roz', tip: 'idee', autor: 'om2', autorEmail: 'mihai@exemplu.ro', stare: 'respinsa', decisa: 110, nota: 'Rămânem la cele două teme.' });
  await sug('SugA4000000000000007', { ore: 130, titlu: 'Export în formatul X al unei mașini vechi, cu un titlu foarte lung care trece pe trei rânduri în card', tip: 'problema', autor: 'om3', autorEmail: 'o.adresa.foarte.lunga.de.email@exemplu-firma.ro', stare: 'respinsa', decisa: 115, nota: 'Formatul nu mai e folosit.' });
  await sug('SugA4000000000000008', { ore: 2, titlu: 'Undo după export', tip: 'problema', autor: 'om2', autorEmail: 'mihai@exemplu.ro', stare: 'noua', descriere: 'După ce export, Ctrl+Z nu mai merge.\nTrebuie să redeschid proiectul.' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await intraOwner(page);
  await page.locator('[data-admin="bara"] [data-fila="sugestii"]').click();
  await expect(page.locator('[data-coloana="noua"] [data-sugestie]')).toHaveCount(5, { timeout: 30_000 });
  await page.screenshot({ path: `${DIR}/50-sugestii-tabla-1440.png` });
  // Meniul „Mută în…” al unui card, din tastatură.
  await page.locator('[data-sugestie="Undo după export"] [data-sug="muta"]').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.screenshot({ path: `${DIR}/51-sugestii-meniu.png` });
  await page.keyboard.press('Escape');
  // O mutare refuzată (id-ul din bancul vechi are 21 de caractere): cardul revine, cu motivul. Prima chemare, la rece.
  await page.locator('[data-sugestie="Ordinea foilor 1"]').dragTo(page.locator('[data-coloana="acceptata"]'));
  await expect(page.locator('[data-sugestie="Ordinea foilor 1"] [data-sug="eroare"]')).toBeVisible({ timeout: 90_000 });
  await page.screenshot({ path: `${DIR}/52-sugestii-mutare-refuzata.png` });
  // Tragerea în Amânată: fereastra notei.
  await page.locator('[data-sugestie="Undo după export"]').dragTo(page.locator('[data-coloana="amanata"]'));
  await expect(page.locator('[data-sug="cere-nota"]')).toBeVisible();
  await page.screenshot({ path: `${DIR}/53-sugestii-nota-ceruta.png` });
  await page.locator('[data-sug="nota-mutarii"]').fill('După etapa 6, cu ordinea exportului.');
  await page.locator('[data-sug="muta-cu-nota"]').click();
  await expect(page.locator('[data-coloana="amanata"] [data-sugestie="Undo după export"]')).not.toHaveAttribute('aria-busy', 'true', { timeout: 60_000 });
  await page.screenshot({ path: `${DIR}/54-sugestii-dupa-mutare.png` });
  // O tragere fără notă (Acceptată → În lucru) și Respinsele arătate.
  await page.locator('[data-sugestie="Ghidaje la 45°"]').dragTo(page.locator('[data-coloana="in-lucru"]'));
  await expect(page.locator('[data-coloana="in-lucru"] [data-sugestie="Ghidaje la 45°"]')).not.toHaveAttribute('aria-busy', 'true', { timeout: 60_000 });
  await page.locator('[data-sug="respinse"]').click();
  await page.screenshot({ path: `${DIR}/55-sugestii-respinse.png`, fullPage: true });
  // Detaliul: textul, decizia; apoi decizia din detaliu, cu nota cerută.
  await page.locator('[data-sugestie="Plugin pentru laser"] [data-sug="deschide"]').click();
  await expect(page.locator('[data-sug="detaliu"]')).toBeVisible();
  await page.screenshot({ path: `${DIR}/56-sugestii-detaliu.png` });
  await page.locator('[data-sug="detaliu"] [data-sug="inchide"]').click();
  await page.locator('[data-sugestie="Undo după export"] [data-sug="deschide"]').click();
  await page.locator('[data-sug="detaliu"] [data-sug="decide"]').click();
  await page.locator('[data-sug="stare-aleasa"]').selectOption('respinsa');
  await page.locator('[data-sug="nota"]').fill('');
  await page.screenshot({ path: `${DIR}/57-sugestii-detaliu-decizie.png` });
  await page.keyboard.press('Escape');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/58-sugestii-intunecat.png` });
  await page.locator('[data-sugestie="Plugin pentru laser"] [data-sug="deschide"]').click();
  await page.screenshot({ path: `${DIR}/59-sugestii-detaliu-intunecat.png` });
  await page.keyboard.press('Escape');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/60-sugestii-1024.png`, fullPage: true });
  await page.setViewportSize({ width: 760, height: 900 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/61-sugestii-760.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('[data-sug="noua"]').click();
  await page.screenshot({ path: `${DIR}/62-sugestii-noua.png` });
});
