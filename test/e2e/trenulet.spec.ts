import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { pachetTrenulet, paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { scrieZip } from '../../scripts/impacheteaza-extensie.ts';
import { citesteZip } from '../../src/extensii/zip.ts';
import { clicDupaReaparitie } from './ajutor-extensii.ts';
import { faraEroriInJurnal } from './ajutor-jurnal.ts';

/**
 * Easy 3Draw (fostul Planificator Trenuleț, ADR 0167) ca extensie (ADR 0129, felia 3.Ta), în Edge, cu pachetul construit aici din sursele lui:
 * - instalarea din fișier, cu cele două permisiuni arătate; pagina v18 în cadrul izolat: marcajul, scripturile clasice,
 *   atributele `style` puse prin CSSOM (din marcaj și din șabloanele scripturilor; CSP-ul moștenit le refuză ca atribute),
 *   circuitele „salvate singure”, adică prin `window.claude.use('db')`, peste stocarea extensiei;
 * - păstrate după reîncărcare: circuitul numit (în `db`, redeschis), modul 3D (doar în `localStorage`), culoarea din atelier;
 * - „Salvează fișierul .json” din exportul CNC ajunge descărcare a browserului, din pagina lui cvs2, cu numele dat de
 *   planificator;
 * - ștergerea circuitului, cu confirmarea lui, rămâne și după reîncărcare; jurnalul local, fără erori;
 * - numele (ADR 0167): „Easy 3Draw” 18.8.0, instalat peste „Planificator Trenuleț” 18.6.0, îi ia locul (același id), cu
 *   circuitul lui;
 * - „Trimite la cvs2” (ADR 0160 §D): G-code-ul ovalului de exemplu ajunge în dialogul primirii, cu originea extensiei, iar după
 *   „Primește”, în „Lucrarea primită” din fereastra Mașina; planificatorul spune că cvs2 l-a primit;
 * - adaptat pentru cvs2 (ADR 0161): textul circuitelor spune unde stau ele; niciun refuz CSP în cadru (nici stilurile, nici
 *   three.js, care nu se mai cere de pe cdnjs, cu motivul spus în vederea 3D); pagina de sine stătătoare, din aceleași
 *   surse, fără cvs2: textele de până acum, fără secțiunea mașinii; din
 *   exportul CNC, „Pe mașină, prin cvs2”: starea, încărcarea, pornirea cu confirmarea lui cvs2, pauza, reluarea, oprirea;
 * - parte din cvs2 (ADR 0164): suprafețele, textul, roșul și fonturile lui cvs2, schimbate pe loc cu tema (lemnul rămâne al
 *   planificatorului); contul, la Circuite, schimbat pe loc; × imediat după schimbări (circuitul, setările CNC și mașina,
 *   atelierul) le păstrează, fără întrebare.
 */
test.use({ locale: 'ro-RO' });

const PACHET = Buffer.from(pachetTrenulet().octeti);
const ZIP = { name: 'trenulet-18.8.0.zip', mimeType: 'application/zip', buffer: PACHET };
const cadru = (page: Page) => page.frameLocator('iframe.cadru-extensie');

async function deschide(page: Page): Promise<void> {
  await page.locator('[data-extensii="buton"]').click();
  await page.getByTestId('meniu-extensii').locator('[data-extensii="deschide"][data-id="trenulet"]').click();
  await expect(page.getByTestId('spatiu-extensie')).toHaveAttribute('data-stare', 'pornit');
}

/**
 * Refuzurile CSP din cadrul extensiei (ADR 0161 §C): evenimentele `securitypolicyviolation`, ascultate de un script pus în
 * fiecare cadru la încărcare. Consola nu le dă probelor (un colector pe `console` vedea 0 și cu atributele încă în surse).
 */
async function ascultaRefuzurile(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __refuzuri: string[] };
    w.__refuzuri = [];
    document.addEventListener('securitypolicyviolation', (e) => { w.__refuzuri.push(`${e.violatedDirective}: ${e.sample || e.blockedURI}`); }, true);
  });
}
async function refuzuri(page: Page): Promise<readonly string[]> {
  const f = await (await page.locator('iframe.cadru-extensie').elementHandle())?.contentFrame();
  return f ? f.evaluate(() => (window as unknown as { __refuzuri?: string[] }).__refuzuri ?? ['fără ascultător']) : ['fără cadru'];
}

/** Ce a scris extensia în stocarea ei (IndexedDB-ul lui cvs2, magazinul `date`), la o cheie; sau cheile cu un prefix. */
const stocat = (page: Page, cheie: string) => page.evaluate((k) => new Promise<unknown>((ok, nu) => {
  const r = indexedDB.open('cncvs2-extensii');
  r.onerror = () => { nu(r.error); };
  r.onsuccess = () => {
    const s = r.result.transaction('date').objectStore('date');
    const q = k.endsWith('/') ? s.getAllKeys(IDBKeyRange.bound(['trenulet', k], ['trenulet', `${k}￿`])) : s.get(['trenulet', k]);
    q.onsuccess = () => { ok(q.result); r.result.close(); };
    q.onerror = () => { nu(q.error); };
  };
}), cheie);

test('instalat din fișier: pagina în cadru; circuitul, modul și culoarea păstrate; descărcarea prin cvs2; ștergerea', async ({ page }) => {
  // Refuzurile CSP-ului pentru stilurile din atribute (ADR 0161 §C): pagina nu mai are niciunul.
  await ascultaRefuzurile(page);
  await page.goto('/');
  await page.locator('[data-extensii="buton"]').click();
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles(ZIP);
  await expect(page.getByTestId('extensii-despre')).toHaveText('„Easy 3Draw” 18.8.0, de la trenulet-18.8.0.zip');
  await expect(page.getByTestId('extensii-permisiuni')).toHaveText(
    'Cere: să-și țină datele în browserul acesta (cel mult 16 MB); să salveze fișiere ca descărcări (date și desene, nu programe); '
    + 'să folosească mașina: să încarce programe, să le pornească sau să le reia după confirmarea ta, să pună pauză și să oprească lucrarea; '
    + 'să vadă dacă ești conectat, cu ce nume și ce plan (nu adresa, nu parola); '
    + 'să primească formele pe care i le trimiți din desen și să-ți propună forme pentru desen (le adaugi tu, din Importă).',
  );
  await page.locator('[data-extensii="instaleaza"]').click();
  await deschide(page);

  let c = cadru(page);
  // Scripturile au rulat (init), iar pagina știe că e în cvs2: circuitele stau în browserul acesta, nu și pe telefon.
  await expect(c.locator('#circ-unde')).toHaveText('Circuitele se salvează singure, în browserul acesta (prin cvs2): pe alt calculator sau în alt browser nu apar.');
  // Stilul listei, dintr-o clasă a foii (până la 3.Tb, un atribut `style`).
  await expect(c.locator('#circ-lista')).toHaveCSS('display', 'flex');
  await expect(c.locator('#circ-lista')).toHaveCSS('flex-direction', 'column');

  await c.locator('#nume').fill('Ovalul de probă');
  await c.locator('#btn-circuite').click();
  await expect(c.locator('#circ-lista .circ b')).toHaveText(['Ovalul de probă']);
  await c.locator('#foaie-circuite [data-inchide]').click();
  // three.js vine din pachet (ADR 0163), abia la prima intrare în 3D: vederea are pânza ei, mesajul lipsei nu se arată.
  expect(await c.locator('body').evaluate(() => 'THREE' in window)).toBe(false);
  await c.locator('[data-mod="3d"]').first().click();
  await expect(c.locator('#at-vedere canvas')).toBeVisible();
  await expect(c.locator('#at-vedere-lipsa')).toBeHidden();
  expect(await c.locator('body').evaluate(() => 'THREE' in window)).toBe(true);
  await c.locator('#at-culori [data-c="#1f5fbf"]').click();
  await expect.poll(() => stocat(page, 'ls:trenulet.mod')).toMatchObject({ valoare: '3d' });
  await expect.poll(async () => JSON.stringify(await stocat(page, 'db:atelier/curent'))).toContain('"culoare":"#1f5fbf"');
  // Clasele care țin locul atributelor: capul listei de printat, cu titlul și rezumatul la capete.
  await expect(c.locator('#at-sectiune-lista .at-rand.intre').first()).toHaveCSS('justify-content', 'space-between');
  // Piesa pusă în model: mostrele editorului modelului și punctul din listă, colorate din date, prin CSSOM.
  await c.locator('#at-in-model').click();
  await expect(c.locator('#at-m-culori [data-mc="#1f5fbf"]')).toHaveCSS('background-color', 'rgb(31, 95, 191)');
  await expect(c.locator('#at-m-lista .punct').first()).toHaveCSS('background-color', 'rgb(31, 95, 191)');
  // Lista circuitelor, atelierul cu mostrele, editorul modelului: niciun refuz CSP.
  expect(await refuzuri(page)).toEqual([]);

  await page.reload();
  await deschide(page);
  c = cadru(page);
  await expect(c.locator('[data-mod="3d"]').first()).toHaveAttribute('aria-pressed', 'true');
  const albastru = c.locator('#at-culori [data-c="#1f5fbf"]');
  await expect(albastru).toHaveAttribute('aria-pressed', 'true');
  // Culoarea mostrei, din datele ei (`data-fundal`), pusă prin CSSOM după desenare.
  await expect(albastru).toHaveCSS('background-color', 'rgb(31, 95, 191)');
  await expect(c.locator('#nume')).toHaveValue('Ovalul de probă');

  await c.locator('[data-mod="2d"]').first().click();
  await c.locator('#btn-export').click();
  await c.locator('#foaie-export summary', { hasText: 'Lista de piese ca fișier .json' }).click();
  const descarcare = page.waitForEvent('download');
  await c.locator('#e-salveaza').click();
  const d = await descarcare;
  expect(d.suggestedFilename()).toBe('ovalul_de_proba.json');
  const corp = JSON.parse(readFileSync(await d.path(), 'utf8')) as Record<string, unknown>;
  expect([corp.format, corp.nume]).toEqual(['trenulet-circuit', 'Ovalul de probă']);
  await c.locator('#foaie-export [data-inchide]').click();

  await c.locator('#btn-circuite').click();
  await c.locator('#circ-lista [data-sterge-c]').click();
  const sigur = c.locator('#circ-lista [data-sterge-c]');
  await expect(sigur).toHaveText('Sigur? Șterge');
  // roșul lui cvs2 (`--rosu`, ADR 0164), nu al planificatorului (#c2352b)
  await expect(sigur).toHaveCSS('color', 'rgb(179, 38, 30)');
  // Confirmarea ștergerii, cu clasa ei: niciun stil refuzat nici aici.
  expect(await refuzuri(page)).toEqual([]);
  await sigur.click();
  await expect(c.locator('#circ-lista')).toHaveText('Încă nu ai circuite salvate. Orice schimbare pe plan se salvează singură.');
  await expect.poll(() => stocat(page, 'db:circuite/')).toEqual([]);

  await page.reload();
  await deschide(page);
  await cadru(page).locator('#btn-circuite').click();
  await expect(cadru(page).locator('#circ-lista')).toHaveText('Încă nu ai circuite salvate. Orice schimbare pe plan se salvează singură.');
  await faraEroriInJurnal(page);
  // Cadrul de după reîncărcare: nici el.
  expect(await refuzuri(page)).toEqual([]);
});

/** Pachetul de dinaintea numelui nou (ADR 0167): aceleași fișiere, manifestul de atunci (id-ul, numele și versiunea). */
async function pachetVechi(): Promise<Buffer> {
  const z = await citesteZip(new Uint8Array(PACHET), { fisiere: 64, octetiFisier: 16 << 20, octetiTotal: 64 << 20 });
  if (!z.ok) throw new Error('pachetul nu se citește');
  return Buffer.from(scrieZip(z.intrari.map((i) => {
    if (i.nume !== 'extensie.json') return i;
    const m = { ...JSON.parse(new TextDecoder().decode(i.octeti)) as Record<string, unknown>, id: 'trenulet', nume: 'Planificator Trenuleț', versiune: '18.6.0' };
    return { nume: i.nume, octeti: new TextEncoder().encode(JSON.stringify(m)) };
  })));
}

test('numele nou (ADR 0167): „Easy 3Draw” 18.8.0, instalat peste „Planificator Trenuleț” 18.6.0, îi ia locul, cu circuitul lui', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-extensii="buton"]').click();
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: 'trenulet-18.6.0.zip', mimeType: 'application/zip', buffer: await pachetVechi() });
  await expect(page.getByTestId('extensii-despre')).toHaveText('„Planificator Trenuleț” 18.6.0, de la trenulet-18.6.0.zip');
  await page.locator('[data-extensii="instaleaza"]').click();
  await deschide(page);
  await expect(page.getByTestId('extensie-deschisa')).toHaveText('Planificator Trenuleț');
  await expect(cadru(page).locator('#stare')).not.toHaveText('—');
  await cadru(page).locator('#nume').fill('Circuitul de dinainte');
  await expect.poll(async () => ((await stocat(page, 'db:circuite/')) as unknown[]).length).toBe(1);

  await page.reload();
  await page.locator('[data-extensii="buton"]').click();
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles(ZIP);
  await expect(page.getByTestId('extensii-despre')).toHaveText('„Easy 3Draw” 18.8.0, de la trenulet-18.8.0.zip');
  await page.locator('[data-extensii="instaleaza"]').click();
  // același id: un singur rând în meniu, cu numele nou; circuitul de dinainte, redeschis
  await page.locator('[data-extensii="buton"]').click();
  await expect(page.getByTestId('meniu-extensii').locator('[data-extensii="deschide"] span')).toHaveText(['Easy 3Draw']);
  await page.getByTestId('meniu-extensii').locator('[data-extensii="deschide"][data-id="trenulet"]').click();
  await expect(page.getByTestId('spatiu-extensie')).toHaveAttribute('data-stare', 'pornit');
  await expect(page.getByTestId('extensie-deschisa')).toHaveText('Easy 3Draw');
  await expect(cadru(page).locator('#nume')).toHaveValue('Circuitul de dinainte');
  await faraEroriInJurnal(page);
});

test('„Trimite la cvs2” din extensie: lucrarea ovalului, în dialogul primirii, apoi în „Lucrarea primită” din fereastra Mașina', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles(ZIP);
  await page.locator('[data-extensii="instaleaza"]').click();
  await deschide(page);
  const c = cadru(page);
  await c.locator('#btn-export').click();
  const trimite = c.locator('#e-cvs2');
  await expect(trimite).toBeEnabled({ timeout: 30_000 });
  await trimite.click();
  await expect(page.getByTestId('dialog-lucrare')).toBeVisible();
  await expect(page.getByTestId('lucrare-de-la')).toHaveText('Easy 3Draw 11 trimite „Ovalul (exemplu)”, din extensia instalată „Easy 3Draw”.');
  await expect(c.locator('#cvs2-stare')).toContainText('Confirmă în cvs2 că le primești');
  await page.locator('[data-masina="lucrare-primeste"]').click();
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-fereastra', 'masina');
  await expect(page.getByTestId('masina-primita')).toContainText('Lucrarea primită: „Ovalul (exemplu)”, de la Easy 3Draw');
  // Toate fișierele trec verificările lui „Fișier…”: niciun refuz.
  await expect(page.getByTestId('masina-primit-refuzate')).toHaveCount(0);
  await expect(page.locator('[data-masina="primit-fisier"] option').first()).toHaveText(/^placa_1/);
  await page.locator('[data-extensii="fila"]').click();
  await expect(c.locator('#cvs2-stare')).toContainText('cvs2 a primit');
  await faraEroriInJurnal(page);
});

test('pe mașină, prin cvs2: din exportul CNC, încărcarea, pornirea cu confirmarea lui cvs2, pauza, reluarea, oprirea', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles(ZIP);
  await page.locator('[data-extensii="instaleaza"]').click();
  await deschide(page);
  const c = cadru(page);
  await c.locator('#btn-export').click();
  const stare = c.locator('#masina-stare');
  await expect(c.locator('#det-masina')).toBeVisible();
  // Cu senderul, „Trimite la cvs2” duce lucrarea în fereastra Mașina: paragrafele despre fila nouă și protocol nu se arată.
  await expect(c.locator('#cvs2-fila')).toHaveAttribute('hidden', '');
  await expect(c.locator('#cvs2-primirea')).toHaveAttribute('hidden', '');
  await expect(c.locator('#cvs2-in-cvs2')).not.toHaveAttribute('hidden');
  await expect(stare).toHaveText('Mașina: neconectată. Conecteaz-o în fereastra Mașina a lui cvs2.');
  await expect(c.locator('#m-fisier option').first()).toHaveText(/^placa_1/, { timeout: 30_000 });
  await expect(c.locator('#m-porneste')).toBeDisabled();

  // Conectarea rămâne în fereastra Mașina.
  await page.locator('[data-actiune="vedere.masina"]').click();
  await page.locator('[data-masina="viteza"]').selectOption('10');
  await page.locator('[data-masina="simulata"]').click();
  await expect(page.getByTestId('masina-stare')).toHaveText('Idle');
  await page.locator('[data-extensii="fila"]').click();
  await expect(stare).toHaveText('Mașina: conectată.');

  // primul clic în cadru după ce fereastra lui reapare
  await clicDupaReaparitie(page, '#m-incarca');
  await expect(stare).toHaveText(/^Mașina: conectată\. Program: placa_1\S* \(\d+ (de )?linii\)\.$/);
  await expect(page.getByTestId('masina-program-de-la')).toHaveText('de la Easy 3Draw');
  await c.locator('#m-porneste').click();
  const confirmare = page.getByTestId('confirmare-masina');
  await expect(confirmare).toBeVisible();
  await expect(page.getByTestId('confirmare-masina-cere')).toHaveText('„Easy 3Draw” cere să pornească pe mașină programul de mai jos.');
  await page.keyboard.press('Escape');
  await expect(c.locator('#masina-raspuns')).toHaveText('Ai ales să nu pornești.');
  await c.locator('#m-porneste').click();
  await page.locator('[data-masina="confirma"]').click();
  await expect(stare).toHaveText(/^Mașina: rulează \d+ %\. Program: placa_1/);
  await expect(c.locator('#masina-raspuns')).toHaveText('');

  await c.locator('#m-pauza').click();
  await expect(stare).toHaveText(/^Mașina: în pauză \d+ %\./);
  await c.locator('#m-reia').click();
  await expect(confirmare).toHaveAttribute('data-fel', 'reia');
  await page.locator('[data-masina="confirma"]').click();
  await expect(stare).toHaveText(/^Mașina: rulează/);
  await c.locator('#m-opreste').click();
  await expect(stare).toHaveText(/^Mașina: (în alarmă|lucrarea s-a întrerupt)/);
  await expect(c.locator('#m-pauza')).toBeDisabled();
  await faraEroriInJurnal(page);
});

test('înălțimile (ADR 0168): la zecimi, în profilul imprimantei; locașul după știft sau al lui; păstrate; înapoi la implicite', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-extensii="buton"]').click();
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles(ZIP);
  await page.locator('[data-extensii="instaleaza"]').click();
  await deschide(page);
  const c = cadru(page);
  await c.locator('[data-mod="3d"]').first().click();
  await expect(c.locator('#at-vedere canvas')).toBeVisible();
  await c.locator('details.setari:has(#at-reglaje) > summary').click();
  const stift = c.locator('#at-reglaje-stift_h'), locas = c.locator('#at-reglaje-locas_h'), bifa = c.locator('#at-reglaje [data-bifa="locas_urmeaza"]');
  // implicitele de la 18.8.0: 1,9 / 2,1, locașul după știft (câmpul lui oprit)
  await expect(stift).toHaveValue('1.9');
  await expect(locas).toHaveValue('2.1');
  await expect(locas).toBeDisabled();
  await expect(bifa).toBeChecked();
  // înălțimea piesei de acum, din „Mărime”: cu un știft mai înalt cu 0,1 mm, piesa crește exact cu atât
  const inaltimePiesa = async (): Promise<number> => {
    const t = (await c.locator('#at-cote').textContent()) ?? '';
    const m = /× ([\d,]+) mm/.exec(t);
    return m ? Number(m[1]!.replace(',', '.')) : Number.NaN;
  };
  const inainte = await inaltimePiesa();
  expect(inainte).toBeGreaterThan(0);
  await c.locator('#at-reglaje [data-pas="stift_h"][data-d="1"]').click();
  await expect(stift).toHaveValue('2');
  await expect(locas).toHaveValue('2.2');
  await expect.poll(inaltimePiesa).toBeCloseTo(inainte + 0.1, 5);
  // aceleași valori și în fila Calibrare
  await c.locator('#at-tipuri [data-tip="calibrare"]').click();
  await expect(c.locator('#at-calib-campuri-stift_h')).toHaveValue('2');
  await expect(c.locator('#at-calib-campuri-locas_h')).toHaveValue('2.2');
  await expect(c.locator('#at-calib-campuri [data-bifa="locas_urmeaza"]')).toBeChecked();
  await c.locator('#at-tipuri [data-tip="caramida"]').click();
  await expect.poll(inaltimePiesa).toBeCloseTo(inainte + 0.1, 5);
  // fără bifă, locașul e al lui: rotunjit la zecimi, cu − / + (virgula, în proba unitară a lui Lego.inaltimi)
  await bifa.uncheck();
  await expect(locas).toBeEnabled();
  await locas.fill('2.34');
  await locas.press('Tab');
  await expect(locas).toHaveValue('2.3');
  await c.locator('#at-reglaje [data-pas="locas_h"][data-d="-1"]').click();
  await expect(locas).toHaveValue('2.2');
  await c.locator('#at-reglaje [data-pas="locas_h"][data-d="-1"]').click();
  await expect(locas).toHaveValue('2.1');
  // ce nu e număr: valoarea de acum, înapoi
  await stift.fill('');
  await stift.press('Tab');
  await expect(stift).toHaveValue('2');
  // în profilul imprimantei, deci după reîncărcare
  await expect.poll(async () => JSON.stringify(await stocat(page, 'db:atelier/curent'))).toMatch(/"stift_h":2,"locas_h":2\.1,"locas_urmeaza":false/);
  await page.reload();
  await deschide(page);
  await c.locator('[data-mod="3d"]').first().click();
  await c.locator('details.setari:has(#at-reglaje) > summary').click();
  await expect(stift).toHaveValue('2');
  await expect(locas).toHaveValue('2.1');
  await expect(bifa).not.toBeChecked();
  // fiecare imprimantă își ține înălțimile: una nouă pornește de la cele de acum, iar „Înapoi la implicite” o schimbă doar pe ea
  const profil = c.locator('#prof-imprimanta'), alege = profil.locator('[data-prof="alege"]');
  await profil.locator('[data-prof="nou"]').click();
  await profil.locator('[data-prof="ok"]').click();
  await expect(alege.locator('option')).toHaveCount(2);
  await expect(stift).toHaveValue('2');
  await c.locator('#at-reglaje [data-inaltimi="implicite"]').click();
  await expect(stift).toHaveValue('1.9');
  await expect(locas).toHaveValue('2.1');
  await expect(bifa).toBeChecked();
  await expect(locas).toBeDisabled();
  await expect.poll(inaltimePiesa).toBeCloseTo(inainte, 5);
  // prima imprimantă, aleasă din nou: cu ale ei (și piesa cu știftul ei)
  await alege.selectOption({ index: 0 });
  await expect(stift).toHaveValue('2');
  await expect(locas).toHaveValue('2.1');
  await expect(bifa).not.toBeChecked();
  await expect(locas).toBeEnabled();
  await expect.poll(inaltimePiesa).toBeCloseTo(inainte + 0.1, 5);
  await alege.selectOption({ index: 1 });
  await expect(stift).toHaveValue('1.9');
  await expect(bifa).toBeChecked();
  await expect.poll(inaltimePiesa).toBeCloseTo(inainte, 5);
  await faraEroriInJurnal(page);
});

test('pagina de sine stătătoare, din aceleași surse, fără cvs2: textele de până acum, fără secțiunea mașinii', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.setContent(paginiPlanificator().preview);
  // numele produsului (ADR 0167), în fila browserului
  await expect(page).toHaveTitle('Easy 3Draw');
  await page.locator('#btn-circuite').click();
  await expect(page.locator('#circ-unde')).toHaveText('Circuitele se salvează doar pe acest dispozitiv.');
  // Fără cvs2 (ADR 0164): nici contul, nici tema lui; pagina își ține tema și fonturile ei.
  await expect(page.locator('#circ-cont')).toBeHidden();
  await expect(page.locator('html')).not.toHaveAttribute('data-gazda', /./);
  await page.locator('#foaie-circuite [data-inchide]').click();
  await page.locator('#btn-export').click();
  await expect(page.locator('#e-cvs2')).toBeEnabled({ timeout: 30_000 });
  await expect(page.locator('#det-masina')).toBeHidden();
  await expect(page.locator('#cvs2-fila')).not.toHaveAttribute('hidden');
  await expect(page.locator('#cvs2-in-cvs2')).toHaveAttribute('hidden', '');
  // fără cvs2, nicio formă spre desen (ADR 0166): nici butonul plăcilor, nici fila atelierului
  await expect(page.locator('#cnc-placi figure').first()).toBeVisible();
  await expect(page.locator('[data-in-desen]')).toHaveCount(0);
  await expect(page.locator('#at-tipuri [data-tip="dinCvs2"]')).toBeHidden();
  expect(erori).toEqual([]);
});

test('parte din cvs2 (ADR 0164): tema și fonturile lui, pe loc; contul, la Circuite; × imediat după schimbări le păstrează', async ({ page }) => {
  await page.addInitScript(() => {
    const acum = Date.now();
    localStorage.setItem('cncvs2.cont', JSON.stringify({
      uid: 'u1', email: 'ana@exemplu.ro', nume: 'Ana',
      drept: { plan: 'personal', capabilitati: ['desen', 'cam', 'export-gcode', 'export-vectori', 'masina'], pana: null, calculatLa: acum, zileOffline: 7 },
    }));
  });
  await ascultaRefuzurile(page);
  await page.goto('/');
  await page.locator('[data-extensii="buton"]').click();
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles(ZIP);
  await page.locator('[data-extensii="instaleaza"]').click();
  await deschide(page);
  let c = cadru(page);
  const fundal = (s: string) => c.locator(s).first().evaluate((e) => getComputedStyle(e).backgroundColor);
  const cvs2 = (p: string) => page.evaluate((x) => getComputedStyle(document.documentElement).getPropertyValue(x).trim(), p);

  // Tema: suprafețele, textul și fonturile lui cvs2; lemnul și verdele de semnal rămân ale planificatorului.
  await expect(c.locator('html')).toHaveAttribute('data-gazda', 'cvs2');
  await expect(c.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await fundal('.bara')).toBe('rgb(255, 255, 255)');
  expect(await c.locator('body').evaluate((e) => getComputedStyle(e).fontFamily))
    .toBe(await page.evaluate(() => getComputedStyle(document.documentElement).fontFamily));
  expect(await c.locator('body').evaluate((e) => getComputedStyle(e).color)).toBe('rgb(29, 35, 43)');
  expect(await c.locator('html').evaluate((e) => getComputedStyle(e).getPropertyValue('--fag').trim())).toBe('#dcb57f');
  await page.locator('[data-actiune="vedere.tema"]').click();
  await page.locator('[data-actiune="vedere.tema"]').click();
  await expect(c.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await cvs2('--s-panou')).toBe('#1e2329');
  await expect.poll(() => fundal('.bara')).toBe('rgb(30, 35, 41)');
  expect(await c.locator('html').evaluate((e) => getComputedStyle(e).getPropertyValue('--fag').trim())).toBe('#c9a06a');
  expect(await refuzuri(page)).toEqual([]);

  // Contul lui cvs2, la Circuite: doar citit.
  await c.locator('#btn-circuite').click();
  await expect(c.locator('#circ-cont')).toBeVisible();
  await expect(c.locator('#circ-cont')).toHaveText('Ești conectat la cvs2 ca Ana (personalul aplicației).');
  await page.evaluate(() => {
    localStorage.removeItem('cncvs2.cont');
    window.dispatchEvent(new StorageEvent('storage', { key: 'cncvs2.cont' }));
  });
  await expect(c.locator('#circ-cont')).toHaveText('Nu ești conectat la cvs2.');
  await c.locator('#foaie-circuite [data-inchide]').click();

  // × imediat după o schimbare: salvările amânate (circuitul, setările CNC și mașina, atelierul) pornesc pe loc, iar cvs2
  // închide fără întrebare, după ele.
  await c.locator('#nume').fill('Păstrat la închidere');
  await c.locator('#btn-export').click();
  await c.locator('[data-cale="freza"]').first().evaluate((e) => {
    (e as HTMLInputElement).value = '4.4';
    e.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('[data-extensii="inchide-fereastra"]').click();
  await expect(page.locator('iframe.cadru-extensie')).toHaveCount(0);
  await expect(page.getByTestId('extensii-inchidere')).toHaveCount(0);
  expect(JSON.stringify(await stocat(page, 'db:setari/cnc'))).toContain('"freza":4.4');
  expect(JSON.stringify(await stocat(page, 'db:setari/masini'))).toContain('4.4');
  await deschide(page);
  c = cadru(page);
  await c.locator('#btn-circuite').click();
  await expect(c.locator('#circ-lista .circ b')).toHaveText(['Păstrat la închidere']);
  await c.locator('#foaie-circuite [data-inchide]').click();

  // Atelierul: o culoare salvată întâi, apoi alta, cu × imediat: documentul atelierului (citit peste copia locală, la
  // deschidere) o are pe cea nouă.
  await c.locator('[data-mod="3d"]').first().click();
  await c.locator('#at-culori [data-c="#1f5fbf"]').click();
  await expect.poll(async () => JSON.stringify(await stocat(page, 'db:atelier/curent'))).toContain('"culoare":"#1f5fbf"');
  await c.locator('#at-culori [data-c="#2e8b4a"]').click();
  await page.locator('[data-extensii="inchide-fereastra"]').click();
  await expect(page.locator('iframe.cadru-extensie')).toHaveCount(0);
  expect(JSON.stringify(await stocat(page, 'db:atelier/curent'))).toContain('"culoare":"#2e8b4a"');
  await faraEroriInJurnal(page);
});

/**
 * Româna rămasă în cadru (ADR 0165): nodurile de text și atributele traductibile care au litere românești, sunt chiar o cheie
 * a dicționarului cu altă traducere sau au o virgulă zecimală. Numele „Easy 3Draw” n-are diacritice: nimic nu mai e scutit
 * (ADR 0167). Fără `pre`, `textarea` (date, G-code) și fără numele dat de om (al circuitului).
 */
async function romanaRamasa(page: Page, numeUtilizator = ''): Promise<readonly string[]> {
  const f = await (await page.locator('iframe.cadru-extensie').elementHandle())?.contentFrame();
  if (!f) return ['fără cadru'];
  return f.evaluate((ignora) => {
    const d = (window as unknown as { TexteEN?: Record<string, string> }).TexteEN ?? {};
    const chei = new Set(Object.keys(d).filter((k) => d[k] !== k && !/^[\s\d·:,;.()×+−–-]*$/.test(k)));
    const rau = (s: string): boolean => {
      const t = s.replace(/\s+/g, ' ').trim().replace(ignora, '');
      return !!t && (/[ăâîșțĂÂÎȘȚ]/.test(t) || chei.has(t) || /\d,\d/.test(t));
    };
    const ies: string[] = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === 3) {
        const p = n.parentElement;
        if (p && !['PRE', 'TEXTAREA', 'SCRIPT', 'STYLE'].includes(p.tagName) && rau((n as Text).data)) ies.push((n as Text).data.trim().slice(0, 90));
      } else {
        for (const a of ['title', 'aria-label', 'placeholder', 'alt']) {
          const v = (n as Element).getAttribute(a);
          if (v && rau(v)) ies.push(`@${a}: ${v.slice(0, 90)}`);
        }
      }
    }
    return [...new Set(ies)];
  }, numeUtilizator);
}

test('în engleză (ADR 0165): limba lui cvs2, schimbată pe loc printr-o repornire fără pierderi; nicio română pe ecranele lui', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-extensii="buton"]').click();
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles(ZIP);
  await page.locator('[data-extensii="instaleaza"]').click();
  await deschide(page);
  let c = cadru(page);
  await expect(c.locator('#btn-circuite')).toHaveText('Circuite');
  // scripturile vin după marcaj: numele se scrie după ce planificatorul a pornit (cipul de stare e completat)
  await expect(c.locator('#stare')).not.toHaveText('—');
  await c.locator('#nume').fill('Păstrat la repornire');
  // Limba nouă în cvs2: pagina își salvează lucrul, apoi cere repornirea; cadrul se reface, în engleză.
  await page.getByRole('navigation', { name: 'Limba' }).getByRole('button', { name: 'EN', exact: true }).click();
  c = cadru(page);
  await expect(c.locator('#btn-circuite')).toHaveText('Layouts');
  await expect(page.getByTestId('spatiu-extensie')).toHaveAttribute('data-stare', 'pornit');
  await expect(c.locator('html')).toHaveAttribute('data-gazda', 'cvs2');
  await expect(c.locator('#nume')).toHaveValue('Păstrat la repornire');
  expect(await romanaRamasa(page, 'Păstrat la repornire')).toEqual([]);
  // cuvintele singure, fără diacritice, pe care proba de română nu le poate recunoaște: filele paletei
  await expect(c.locator('#grupe [data-grupa]')).toHaveText(['Straights', 'Curves', 'Custom', 'Junctions', 'Crossings', 'Double track', 'Bridge', 'Ends']);
  // Circuitele, exportul CNC, cu secțiunile lui, atelierul 3D, cu fiecare fel de piesă
  await c.locator('#btn-circuite').click();
  await expect(c.locator('#circ-unde')).toHaveText('The layouts save themselves, in this browser (through cvs2): they don’t show up on another computer or in another browser.');
  await expect(c.locator('[data-deschide]').first()).toHaveText('Open');
  expect(await romanaRamasa(page, 'Păstrat la repornire')).toEqual([]);
  await c.locator('#foaie-circuite [data-inchide]').click();
  await c.locator('#btn-export').click();
  await expect(c.locator('#e-cvs2')).toBeEnabled({ timeout: 30_000 });
  expect(await romanaRamasa(page, 'Păstrat la repornire')).toEqual([]);
  // Arhiva CNC: README-ul ei (README.txt) e în engleză, fără litere românești în afară de numele circuitului.
  await expect(c.locator('#e-dxf')).toBeEnabled();
  const descarcare = page.waitForEvent('download');
  await c.locator('#e-dxf').click();
  const zip = await citesteZip(new Uint8Array(readFileSync(await (await descarcare).path())), { fisiere: 2000, octetiFisier: 64 << 20, octetiTotal: 256 << 20 });
  if (!zip.ok) throw new Error('arhiva nu se citește');
  const readme = zip.intrari.find((i) => i.nume === 'README.txt');
  expect(zip.intrari.map((i) => i.nume)).not.toContain('CITESTE.txt');
  const text = new TextDecoder().decode(readme!.octeti).replace('Păstrat la repornire', '');
  expect(text).toContain('WHAT IS IN THE ARCHIVE');
  // data, ca în engleză (en-GB: 04/11/2026, 21:30:00), nu ca în română (04.11.2026)
  expect(text).toMatch(/ · \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}/);
  expect(text).toContain('EASY 3DRAW — the files for the CNC');
  expect(text.match(/.*[ăâîșțĂÂÎȘȚ].*/g) ?? []).toEqual([]);
  // O placă prea mică: piesa care nu încape vine de la motor ca proprietate a erorii, cu numele ei în limba paginii.
  for (const [cale, v] of [['placa.0', '200'], ['placa.1', '150']] as const) {
    await c.locator(`[data-cale="${cale}"]`).first().evaluate((e, x) => {
      (e as HTMLInputElement).value = x;
      e.dispatchEvent(new Event('input', { bubbles: true }));
    }, v);
  }
  await expect(c.locator('#cnc-stare')).toContainText('does not fit on the 200 × 150 mm board (with the margin). Make the board bigger in the settings.', { timeout: 30_000 });
  await expect(c.locator('#cnc-stare')).toContainText(/^(Straight|Large curve|Small curve|Switch|Adapter|Female|Male)/);
  await c.locator('#foaie-export [data-inchide]').click();
  await c.locator('[data-mod="3d"]').first().click();
  for (const fel of ['caramida', 'panta', 'pantaInversa', 'pana', 'rotund', 'lateral', 'legaturi', 'calibrare', 'dinCvs2']) {
    await c.locator(`#at-tipuri [data-tip="${fel}"]`).click();
    await expect(c.locator(`#at-tipuri [data-tip="${fel}"]`)).toHaveAttribute('aria-pressed', 'true');
    expect(await romanaRamasa(page, 'Păstrat la repornire'), fel).toEqual([]);
  }
  await c.locator('#at-tipuri [data-tip="caramida"]').click();
  await expect(c.locator('#at-mod-grila [data-mod="forma"]')).toHaveText('Shape');
  // „plăci” la înălțime e placa LEGO (plates), nu placa de lemn (boards)
  await expect(c.locator('label[for="at-placi"]')).toContainText('plates');
  await c.locator('#at-adauga').click();
  await expect(c.locator('#at-rez-lista')).toContainText(/ on \d+ beds? of /);
  // după adăugare: lista de printat și cipul ei (piesele și paturile), tot în engleză
  expect(await romanaRamasa(page, 'Păstrat la repornire')).toEqual([]);
  // Înapoi la română: pagina repornește, iar textele ei sunt iar românești.
  await page.getByRole('navigation', { name: 'Language' }).getByRole('button', { name: 'RO', exact: true }).click();
  c = cadru(page);
  await expect(c.locator('#btn-circuite')).toHaveText('Circuite');
  await faraEroriInJurnal(page);
});

test('formele (ADR 0166): o selecție din cvs2 ajunge în atelierul 3D, la „Din cvs2”; o placă a exportului ajunge în desen, prin Importă', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-extensii="buton"]').click();
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles(ZIP);
  await page.locator('[data-extensii="instaleaza"]').click();
  await deschide(page);
  const c = cadru(page);
  await expect(c.locator('#stare')).not.toHaveText('—');
  // în cvs2: o plăcuță 40 × 20 mm cu o gaură rotundă, importată și aleasă, trimisă la planificator
  await page.locator('[data-actiune="vedere.proiectare"]').click();
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="20mm" viewBox="0 0 40 20">'
    + '<path d="M0 0 H40 V20 H0 Z M15 10 A5 5 0 1 0 25 10 A5 5 0 1 0 15 10 Z" fill-rule="evenodd"/>'
    // o cale deschisă (o linie): se numără și se lasă afară
    + '<path d="M0 25 H40 V30" fill="none" stroke="black"/></svg>';
  await page.locator('[data-camp="fisier-svg"]').setInputFiles({ name: 'placuta.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg, 'utf8') });
  await page.locator('[data-buton="importa"]').click();
  await page.getByTestId('lista-vectori').locator('li').getByText('placuta').click();
  const trimite = page.locator('[data-context="extensii.trimite-selectia"]');
  await expect(trimite).toHaveAccessibleName('Trimite la Easy 3Draw');
  await trimite.click();
  // planificatorul: în 3D, la „Din cvs2”, cu forma ridicată la 3,2 mm
  await expect(c.locator('#at-tipuri [data-tip="dinCvs2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(c.locator('#at-forma-info')).toHaveText('2 contururi închise, 40 × 20 mm; 1 deschis, lăsat afară');
  await expect(c.locator('#at-nume-piesa')).toHaveText('Formă din cvs2, 3,2 mm');
  await c.locator('#at-f-grosime').evaluate((e) => { (e as HTMLInputElement).value = '5'; e.dispatchEvent(new Event('change', { bubbles: true })); });
  await expect(c.locator('#at-nume-piesa')).toHaveText('Formă din cvs2, 5 mm');
  await c.locator('#at-adauga').click();
  await expect(c.locator('#at-tabel')).toContainText('Formă din cvs2, 5 mm');
  // exportul CNC: placa 1, „În desenul cvs2” → fereastra Importă a lui cvs2, „Propus de Easy 3Draw”
  await c.locator('[data-mod="2d"]').first().click();
  await c.locator('#btn-export').click();
  await expect(c.locator('#e-cvs2')).toBeEnabled({ timeout: 30_000 });
  // o placă de 400 × 300 mm: piesele ovalului încap pe mai multe plăci, iar fiecare își propune DXF-ul ei
  for (const [cale, v] of [['placa.0', '400'], ['placa.1', '300']] as const) {
    await c.locator(`[data-cale="${cale}"]`).first().evaluate((e, x) => {
      (e as HTMLInputElement).value = x;
      e.dispatchEvent(new Event('input', { bubbles: true }));
    }, v);
  }
  const inDesen = c.locator('[data-in-desen="placi/placa_2.dxf"]');
  await expect(inDesen).toHaveText('În desenul cvs2', { timeout: 30_000 });
  await expect(c.locator('[data-in-desen="placi/placa_1.dxf"]')).toHaveText('În desenul cvs2');
  await inDesen.click();
  await expect(page.locator('#import-titlu')).toContainText('Importă: placa_2.dxf');
  await expect(page.getByTestId('import-de')).toHaveText('Propus de Easy 3Draw');
  const randuri = await page.getByTestId('lista-vectori').locator('li').count();
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('lista-vectori').locator('li')).toHaveCount(randuri + 1);
  await faraEroriInJurnal(page);
});

test('pornirea (ADR 0139): în clipa lui „pornit”, pagina planificatorului e gata (butonul Circuite are handler), de trei ori la rând', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-extensii="buton"]').click();
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles(ZIP);
  await page.locator('[data-extensii="instaleaza"]').click();
  for (let k = 0; k < 3; k++) {
    if (await page.locator('iframe.cadru-extensie').count()) {
      await page.locator('[data-extensii="inchide-fereastra"]').click();
      await expect(page.locator('iframe.cadru-extensie')).toHaveCount(0);
    }
    await page.locator('[data-extensii="buton"]').click();
    await page.getByTestId('meniu-extensii').locator('[data-extensii="deschide"][data-id="trenulet"]').click();
    // Starea gazdei, citită la fiecare cadru al paginii: la prima apariție a lui „pornit”, cadrul e întrebat pe loc. Înainte,
    // de cele mai multe ori nici pagina nu era pusă, iar o dată butonul exista fără handler.
    await page.waitForFunction(() => document.querySelector('[data-testid="spatiu-extensie"]')?.getAttribute('data-stare') === 'pornit', null, { polling: 'raf' });
    const f = await (await page.locator('iframe.cadru-extensie').elementHandle())!.contentFrame();
    expect(await f!.evaluate(() => typeof document.querySelector<HTMLButtonElement>('#btn-circuite')?.onclick)).toBe('function');
  }
});
