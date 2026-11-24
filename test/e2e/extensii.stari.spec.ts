import { test, expect, type Locator, type Page } from '@playwright/test';
import { impacheteaza, scrieZip } from '../../scripts/impacheteaza-extensie.ts';
import { citesteZip } from '../../src/extensii/zip.ts';
import { biblioteca, deschideMeniul, pachetVechi, pagina } from './ajutor-biblioteca.ts';

/**
 * Stările de lângă drumul bun al extensiilor (ADR 0232 §A, felia 3.Xi-1), în Edge:
 * - o extensie care aruncă la pornire are starea ei („… n-a pornit”), cu trei ieșiri și detaliile pliate; „Încearcă din nou”
 *   o repornește, „Vezi în bibliotecă” îi deschide pagina, „Închide” o închide; o pornire care trece de 10 s arată aceleași
 *   ieșiri, fără s-o oprească;
 * - o versiune nouă peste extensia deschisă o redeschide: din meniu („Actualizează”) și dintr-un fișier; cu lucru nesalvat,
 *   întrebarea vine înaintea instalării, iar „Rămân” o oprește;
 * - extensia deschisă se ține minte la reîncărcarea paginii; una închisă sau una care n-a pornit, nu; un link al bibliotecii
 *   are întâietate;
 * - un fișier care nu e pachet are fereastra refuzului, cu numele lui, motivul pe înțeles și „Alege alt fișier…”;
 * - la „Închizi …?”, „Rămân” e primul și are focusul, iar „Închide oricum” e roșu.
 *
 * Extensiile de probă sunt în `test/fixtures/extensii/` (`cade`, `sovaie`, `incet`) și `extensii/salut`.
 */
test.use({ locale: 'ro-RO' });

const SALUT = impacheteaza('extensii/salut').octeti;
const pachet = (dosar: string): Buffer => Buffer.from(impacheteaza(`test/fixtures/extensii/${dosar}`).octeti);

/** Pachetul „Salut”, cu altă versiune în manifest. */
async function salut(versiune: string): Promise<Buffer> {
  const z = await citesteZip(SALUT, { fisiere: 16, octetiFisier: 1 << 20, octetiTotal: 1 << 22 });
  if (!z.ok) throw new Error('pachetul de probă nu se citește');
  return Buffer.from(scrieZip(z.intrari.map((i) => {
    if (i.nume !== 'extensie.json') return i;
    const m = { ...JSON.parse(new TextDecoder().decode(i.octeti)) as Record<string, unknown>, versiune };
    return { nume: i.nume, octeti: new TextEncoder().encode(JSON.stringify(m)) };
  })));
}

const cadru = (page: Page) => page.frameLocator('iframe.cadru-extensie');
const spatiu = (page: Page): Locator => page.getByTestId('spatiu-extensie');
const stare = (page: Page): Locator => page.getByTestId('stare-pornire');
const fila = (page: Page): Locator => page.getByTestId('fila-extensie');
const intrebare = (page: Page): Locator => page.getByTestId('extensii-inchidere');
const confirmare = (page: Page): Locator => page.getByTestId('extensii-instalare');

async function alegeFisier(page: Page, nume: string, octeti: Buffer): Promise<void> {
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: nume, mimeType: 'application/zip', buffer: octeti });
  await expect(confirmare(page)).toBeVisible();
}
async function instaleaza(page: Page, nume: string, octeti: Buffer): Promise<void> {
  await alegeFisier(page, nume, octeti);
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect(confirmare(page)).toHaveCount(0);
}
async function deschide(page: Page, id: string): Promise<void> {
  await (await deschideMeniul(page)).locator(`[data-extensii="deschide"][data-id="${id}"]`).click();
  await expect(fila(page)).toBeVisible();
}
/** Rândurile meniului (numele lipit de versiune), cu meniul închis la loc. */
async function instalate(page: Page): Promise<string[]> {
  const m = await deschideMeniul(page);
  const randuri = await m.locator('[data-extensii="deschide"]').allTextContents();
  await page.keyboard.press('Escape');
  await expect(m).toHaveCount(0);
  return randuri;
}
const IESIRI = ['Încearcă din nou', 'Vezi în bibliotecă', 'Închide'];

test('o extensie care aruncă la pornire: starea ei, cu trei ieșiri și detaliile pliate; „Închide” o închide', async ({ page }) => {
  await page.goto('/');
  await instaleaza(page, 'cade-0.3.0.zip', pachet('cade'));
  await deschide(page, 'cade');
  await expect(spatiu(page)).toHaveAttribute('data-stare', 'esuat');
  const s = stare(page);
  await expect(s).toBeVisible();
  await expect(s).toHaveAttribute('data-fel', 'esuat');
  await expect(s.locator('h2')).toHaveText('„Cade la pornire” n-a pornit');
  await expect(s.getByTestId('stare-text')).toHaveText('S-a oprit la pornire. Desenul și proiectele tale nu sunt atinse.');
  await expect(s.locator('.butoane button')).toHaveText(IESIRI);
  await expect(s.locator('[data-extensii="porneste-din-nou"]')).toHaveText('Încearcă din nou');
  await expect(s.locator('[data-extensii="vezi-in-biblioteca"]')).toHaveText('Vezi în bibliotecă');
  await expect(s.locator('[data-extensii="inchide-extensia"]')).toHaveText('Închide');
  // Eroarea brută nu mai stă pe pagină: e sub „Detalii”, pliată, cu versiunea și de unde a venit pachetul.
  await expect(spatiu(page)).not.toContainText('Extensia n-a pornit:');
  const detalii = s.locator('details');
  await expect(detalii).not.toHaveAttribute('open', '');
  await expect(s.getByTestId('stare-mesaj')).toBeHidden();
  await detalii.locator('summary').click();
  await expect(s.getByTestId('stare-mesaj')).toHaveText('pornirea cade anume');
  await expect(s.getByTestId('stare-pachet')).toHaveText('Versiunea 0.3.0, din fișierul cade-0.3.0.zip');
  await expect(s.locator('[data-extensii="copiaza-detalii"]')).toHaveText('Copiază');
  // Starea încape în fereastră, peste cadru.
  const cutii = await page.evaluate(() => {
    const a = document.querySelector('[data-testid="stare-pornire"]')?.getBoundingClientRect();
    const b = document.querySelector('[data-testid="spatiu-extensie"]')?.getBoundingClientRect();
    return a && b ? { sus: a.top >= b.top, jos: a.bottom <= b.bottom, st: a.left >= b.left, dr: a.right <= b.right } : null;
  });
  expect(cutii).toEqual({ sus: true, jos: true, st: true, dr: true });

  await s.locator('[data-extensii="inchide-extensia"]').click();
  await expect(fila(page)).toHaveCount(0);
  await expect(spatiu(page)).toHaveCount(0);
});

test('„Vezi în bibliotecă” deschide pagina extensiei, la Instalate; „Încearcă din nou” o pornește a doua oară', async ({ page }) => {
  await page.goto('/');
  await instaleaza(page, 'sovaie-1.2.0.zip', pachet('sovaie'));
  await deschide(page, 'sovaie');
  await expect(stare(page).locator('h2')).toHaveText('„Șovăie” n-a pornit');

  await stare(page).locator('[data-extensii="vezi-in-biblioteca"]').click();
  await expect(biblioteca(page)).toBeVisible();
  await expect(biblioteca(page).locator('[data-extensii="fila-instalate"]')).toHaveAttribute('aria-selected', 'true');
  await expect(pagina(page)).toHaveAttribute('data-id', 'sovaie');
  await page.keyboard.press('Escape');
  await expect(biblioteca(page)).toHaveCount(0);
  // Extensia a rămas cum era: căzută, cu ieșirile ei.
  await expect(stare(page)).toBeVisible();

  await stare(page).locator('[data-extensii="porneste-din-nou"]').click();
  await expect(spatiu(page)).toHaveAttribute('data-stare', 'pornit');
  await expect(cadru(page).locator('[data-sovaie="pornit"]')).toHaveText('Pornirea 2');
  await expect(stare(page)).toHaveCount(0);
});

test('o pornire care trece de 10 secunde: „pornește greu”, cu aceleași ieșiri, fără s-o oprească', async ({ page }) => {
  test.slow();
  await page.goto('/');
  await instaleaza(page, 'incet-1.0.0.zip', pachet('incet'));
  await deschide(page, 'incet');
  await expect(spatiu(page)).toHaveAttribute('data-stare', 'porneste');
  await expect(spatiu(page)).toContainText('Pornesc extensia…');
  // Până la 10 s, doar „Pornesc extensia…”.
  await page.waitForTimeout(2000);
  await expect(stare(page)).toHaveCount(0);

  const s = stare(page);
  await expect(s).toBeVisible({ timeout: 15_000 });
  await expect(s).toHaveAttribute('data-fel', 'greu');
  await expect(s.locator('h2')).toHaveText('„Pornește încet” pornește greu…');
  await expect(s.getByTestId('stare-text')).toHaveText('Încă nu a pornit. Poți aștepta, o poți porni din nou sau o poți închide.');
  await expect(s.locator('.butoane button')).toHaveText(IESIRI);
  await expect(s.locator('details')).toHaveCount(0);
  // Pornirea nu e oprită: cadrul e tot acolo, în aceeași stare.
  await expect(page.locator('iframe.cadru-extensie')).toHaveCount(1);
  await expect(spatiu(page)).toHaveAttribute('data-stare', 'porneste');

  await s.locator('[data-extensii="inchide-extensia"]').click();
  await expect(fila(page)).toHaveCount(0);
});

test('„Actualizează” din meniu, cu extensia deschisă: se redeschide singură, la versiunea nouă', async ({ page }) => {
  test.slow();
  await page.goto('/');
  await instaleaza(page, 'trenulet-18.0.0.zip', await pachetVechi('18.0.0'));
  await deschide(page, 'trenulet');
  await expect(spatiu(page)).toHaveAttribute('data-stare', 'pornit', { timeout: 20_000 });
  await page.evaluate(() => { (window as unknown as { cadruVechi: Element | null }).cadruVechi = document.querySelector('iframe.cadru-extensie'); });

  const m = await deschideMeniul(page);
  await m.locator('[data-extensii="biblioteca-actualizeaza"]').click();
  await expect(m.locator('[data-extensii="deschide"][data-id="trenulet"] small')).toHaveText(/ · actualizată$/, { timeout: 20_000 });
  // Extensia e tot deschisă, în fereastra ei, cu un cadru nou (codul versiunii noi), pornit.
  await expect(fila(page)).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const c = document.querySelector('iframe.cadru-extensie');
    return c !== null && c !== (window as unknown as { cadruVechi: Element | null }).cadruVechi;
  }), { timeout: 20_000 }).toBe(true);
  await expect(spatiu(page)).toHaveAttribute('data-stare', 'pornit', { timeout: 20_000 });
  await expect(page.locator('[data-extensii="fila"]')).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Escape');
});

test('o versiune nouă peste extensia deschisă, cu lucru nesalvat: întrebarea vine înaintea instalării; „Rămân” nu instalează nimic', async ({ page }) => {
  await page.goto('/');
  await instaleaza(page, 'salut-1.0.0.zip', Buffer.from(SALUT));
  await deschide(page, 'salut');
  await expect(spatiu(page)).toHaveAttribute('data-stare', 'pornit');
  await cadru(page).locator('[data-salut="modifica"]').click();
  await expect(cadru(page).locator('[data-salut="lucru"]')).toHaveText('Lucrul: nesalvat');

  // „Rămân”: confirmarea se închide, nimic nu s-a instalat, extensia e cum era.
  await alegeFisier(page, 'salut-1.0.1.zip', await salut('1.0.1'));
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect(intrebare(page)).toBeVisible();
  await expect(intrebare(page)).toContainText('Închizi „Salut”?');
  await page.locator('[data-extensii="inchidere-ramai"]').click();
  await expect(intrebare(page)).toHaveCount(0);
  await expect(confirmare(page)).toHaveCount(0);
  expect(await instalate(page)).toEqual(['Salut1.0.0']);
  await expect(cadru(page).locator('[data-salut="lucru"]')).toHaveText('Lucrul: nesalvat');
  await expect(cadru(page).locator('[data-salut="deschideri"]')).toHaveText('Deschideri: 1');

  // „Închide oricum”: abia acum se instalează, iar extensia se redeschide la versiunea nouă, fără altă întrebare.
  await alegeFisier(page, 'salut-1.0.1.zip', await salut('1.0.1'));
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect(intrebare(page)).toBeVisible();
  await page.locator('[data-extensii="inchidere-inchide"]').click();
  await expect(intrebare(page)).toHaveCount(0);
  await expect(confirmare(page)).toHaveCount(0);
  await expect(cadru(page).locator('[data-salut="deschideri"]')).toHaveText('Deschideri: 2');
  await expect(cadru(page).locator('[data-salut="lucru"]')).toHaveText('Lucrul: salvat');
  await expect(intrebare(page)).toHaveCount(0);
  await expect(fila(page)).toBeVisible();
  expect(await instalate(page)).toEqual(['Salut1.0.1']);
});

test('o versiune nouă peste extensia deschisă, fără lucru nesalvat: se instalează și se redeschide, fără întrebare', async ({ page }) => {
  await page.goto('/');
  await instaleaza(page, 'salut-1.0.0.zip', Buffer.from(SALUT));
  await deschide(page, 'salut');
  await expect(cadru(page).locator('[data-salut="deschideri"]')).toHaveText('Deschideri: 1');
  await instaleaza(page, 'salut-1.0.1.zip', await salut('1.0.1'));
  await expect(cadru(page).locator('[data-salut="deschideri"]')).toHaveText('Deschideri: 2');
  await expect(intrebare(page)).toHaveCount(0);
  await expect(fila(page)).toBeVisible();
  expect(await instalate(page)).toEqual(['Salut1.0.1']);
});

test('reîncărcarea paginii: extensia deschisă se redeschide; una închisă sau una care n-a pornit, nu; un link al bibliotecii are întâietate', async ({ page }) => {
  await page.goto('/');
  await instaleaza(page, 'salut-1.0.0.zip', Buffer.from(SALUT));
  await instaleaza(page, 'cade-0.3.0.zip', pachet('cade'));
  await deschide(page, 'salut');
  await expect(cadru(page).locator('[data-salut="deschideri"]')).toHaveText('Deschideri: 1');
  expect(await page.evaluate(() => localStorage.getItem('cncvs2.extensie-deschisa'))).toBe('salut');

  await page.reload();
  await expect(fila(page)).toBeVisible();
  await expect(page.getByTestId('extensie-deschisa')).toHaveText('Salut');
  await expect(cadru(page).locator('[data-salut="deschideri"]')).toHaveText('Deschideri: 2');
  await expect(page.locator('[data-extensii="fila"]')).toHaveAttribute('aria-current', 'page');

  // Un link al bibliotecii are întâietate: la această încărcare, extensia nu se redeschide; la următoarea, da.
  await page.goto('about:blank');
  await page.goto('/#biblioteca=trenulet');
  await expect(biblioteca(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(biblioteca(page)).toHaveCount(0);
  expect(await instalate(page)).toEqual(['Cade la pornire0.3.0', 'Salut1.0.0']);
  await expect(fila(page)).toHaveCount(0);
  await page.reload();
  await expect(cadru(page).locator('[data-salut="deschideri"]')).toHaveText('Deschideri: 3');

  // Închisă de om: nu se mai redeschide.
  await page.locator('[data-extensii="inchide-fereastra"]').click();
  await expect(fila(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('cncvs2.extensie-deschisa'))).toBeNull();
  await page.reload();
  expect(await instalate(page)).toEqual(['Cade la pornire0.3.0', 'Salut1.0.0']);
  await expect(fila(page)).toHaveCount(0);

  // Una care n-a pornit nu se ține minte.
  await deschide(page, 'cade');
  await expect(stare(page)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('cncvs2.extensie-deschisa'))).toBeNull();
  await page.reload();
  expect(await instalate(page)).toEqual(['Cade la pornire0.3.0', 'Salut1.0.0']);
  await expect(fila(page)).toHaveCount(0);
});

test('un fișier care nu e pachet: fereastra refuzului, cu numele lui, motivul pe înțeles, „Alege alt fișier…” și „Închide”', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-extensii="buton"]')).toBeVisible();
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: 'poza-de-vacanta.zip', mimeType: 'application/zip', buffer: Buffer.from('nu e o arhivă') });
  const f = confirmare(page);
  await expect(f.locator('h2')).toHaveText('Pachetul nu se poate instala');
  await expect(f.getByTestId('extensii-refuz-sursa')).toHaveText('poza-de-vacanta.zip');
  await expect(f.getByTestId('extensii-refuz')).toHaveAttribute('data-motiv', 'nu-e-zip');
  await expect(f.getByTestId('extensii-refuz')).toHaveText('Fișierul nu e o arhivă .zip.');
  await expect(f.locator('.butoane button')).toHaveText(['Alege alt fișier…', 'Închide']);
  await expect(f).not.toContainText('Instalezi o extensie?');
  await expect(f).not.toContainText('Renunță');

  // „Alege alt fișier…” deschide alegerea fișierului; un pachet bun ajunge la confirmarea lui.
  const [alegere] = await Promise.all([page.waitForEvent('filechooser'), f.locator('[data-extensii="alt-fisier"]').click()]);
  await alegere.setFiles({ name: 'salut-1.0.0.zip', mimeType: 'application/zip', buffer: Buffer.from(SALUT) });
  await expect(confirmare(page).locator('h2')).toHaveText('Instalezi „Salut”?');
  await page.locator('[data-extensii="renunta"]').click();
  await expect(confirmare(page)).toHaveCount(0);

  // „Închide” (și Escape) închide fereastra refuzului; nimic nu s-a instalat.
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: 'alta.zip', mimeType: 'application/zip', buffer: Buffer.from('tot nu') });
  await confirmare(page).locator('[data-extensii="inchide-refuz"]').click();
  await expect(confirmare(page)).toHaveCount(0);
  expect(await instalate(page)).toEqual([]);
});

test('„Închizi …?”: „Rămân” e primul și are focusul; „Închide oricum” e roșu, ca „Scoate”', async ({ page }) => {
  await page.goto('/');
  await instaleaza(page, 'salut-1.0.0.zip', Buffer.from(SALUT));
  await deschide(page, 'salut');
  await expect(spatiu(page)).toHaveAttribute('data-stare', 'pornit');
  await cadru(page).locator('[data-salut="modifica"]').click();
  await page.locator('[data-extensii="inchide-fereastra"]').click();
  const q = intrebare(page);
  await expect(q.locator('.butoane button')).toHaveText(['Rămân', 'Închide oricum']);
  await expect(page.locator('[data-extensii="inchidere-ramai"]')).toBeFocused();
  // Culorile, cu mausul dat la o parte (un buton sub maus e în starea „hover”).
  await page.mouse.move(2, 2);
  const culori = await page.evaluate(() => {
    const fond = (sel: string): string => getComputedStyle(document.querySelector(sel) as Element).backgroundColor;
    const martor = document.createElement('i');
    document.body.append(martor);
    martor.style.background = 'var(--rosu)';
    const rosu = getComputedStyle(martor).backgroundColor;
    martor.style.background = 'var(--s-panou)';
    const panou = getComputedStyle(martor).backgroundColor;
    martor.remove();
    return { ramai: fond('[data-extensii="inchidere-ramai"]'), inchide: fond('[data-extensii="inchidere-inchide"]'), rosu, panou };
  });
  expect(culori.inchide).toBe(culori.rosu);
  // „Rămân” e butonul plin al dialogului: nici roșu, nici de culoarea panoului.
  expect(culori.ramai).not.toBe(culori.rosu);
  expect(culori.ramai).not.toBe(culori.panou);
  await page.locator('[data-extensii="inchidere-ramai"]').click();
  await expect(q).toHaveCount(0);
});
