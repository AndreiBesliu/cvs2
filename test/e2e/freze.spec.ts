/**
 * Fereastra „Frezele mele” (ADR 0300 §3, felia 16.A↑a), în Edge: rândul din meniul contului și acțiunea din paletă (și peste
 * fereastra Mașina), frezele standard puse singure (16.A↑a-2), biblioteca goală cu „Adaugă frezele standard”, editorul (numele propus, refuzurile pe câmp, salvarea, plecarea
 * cu schimbări), păstrarea la reîncărcare (IndexedDB), ștergerea cu întrebarea, fișierul (exportul și importul JSON / CSV cu
 * numele care se repetă), două file la zi una cu alta, telefonul (390, 360, 320 px) cu fontul lat, F1 și engleza. Din 16.A↑h-1
 * (ADR 0302 §3): fereastra pornește ca listă, cu fișa frezei alese doar de citit; editorul („configuratorul”) se deschide la
 * „Editează” și la „Freză nouă”, iar comutatorul „Listă / Configurator” (ținut în browser) îl poate ține mereu deschis. Din
 * 16.A↑b-7: Escape închide fereastra oriunde ar fi focusul (pe pagină, după un buton care a plecat sau s-a oprit sub el).
 */
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { deschideMeniulContului } from './ajutor-panza.ts';
import { bibliotecaGoala } from './ajutor-freze.ts';

test.use({ locale: 'ro-RO' });

const TITLU = 'Frezele mele';

async function deschideFrezele(page: Page, titlu = TITLU): Promise<Locator> {
  const meniu = await deschideMeniulContului(page);
  await meniu.locator('[data-meniu-cont="freze"]').click();
  await expect(meniu).toHaveCount(0);
  const f = page.getByRole('dialog', { name: titlu });
  await expect(f).toBeVisible();
  await expect(f.locator('[data-freze="stare"]')).not.toContainText(/Se citește|Reading/u);
  return f;
}

const nume = (f: Locator): Locator => f.locator('.freze-rand-nume');
const camp = (f: Locator, c: string): Locator => f.locator(`[data-freze-camp="${c}"]`);
const fisa = (f: Locator): Locator => f.locator('[data-freze="fisa"]');
const valoare = (f: Locator, c: string): Locator => fisa(f).locator(`[data-freze-valoare="${c}"]`);
/** Grupul frezei din fișă: opțiunea aleasă a lui „Grupul” (alegerea altei opțiuni o mută). */
const grupul = (f: Locator): Locator => fisa(f).locator('[data-freze="muta"] option:checked');

/** Alege freza cu numele dat și îi deschide editorul din fișă (vederea „Listă”). */
async function editeaza(f: Locator, n: string): Promise<void> {
  await nume(f).getByText(n, { exact: true }).click();
  await fisa(f).locator('[data-freze="editeaza"]').click();
  await expect(fisa(f)).toHaveCount(0);
}

/** Frezele standard, puse singure la prima citire a bibliotecii (ADR 0300 §3, precizarea din 24.11). */
async function standard(f: Locator): Promise<void> {
  await expect(nume(f)).toHaveCount(6);
}

/** „Adaugă frezele standard”, într-o bibliotecă goală. */
async function pornire(f: Locator): Promise<void> {
  await f.locator('[data-freze="pornire"]').click();
  await expect(nume(f)).toHaveCount(6);
}

/** Lățimea paginii nu trece de fereastră, iar cutia ferestrei nu se derulează pe orizontală. */
async function faraDepasire(page: Page): Promise<void> {
  const [pagina, latime, cutie] = await page.evaluate(() => {
    const c = document.querySelector('.dialog-freze');
    return [document.documentElement.scrollWidth, window.innerWidth, c ? c.scrollWidth - c.clientWidth : -1];
  });
  expect(pagina).toBeLessThanOrEqual(latime);
  expect(cutie).toBe(0);
}

test('meniul contului: „Frezele mele…” înaintea manualului; frezele standard, puse singure; grupele, starea, F1', async ({ page }) => {
  await page.goto('/');
  const meniu = await deschideMeniulContului(page);
  const rand = meniu.locator('[data-meniu-cont="freze"] + [data-meniu-cont="manual"]');
  await expect(rand).toHaveCount(1);
  await expect(meniu.locator('[data-meniu-cont="freze"] span').first()).toHaveText('Frezele mele…');
  await meniu.locator('[data-meniu-cont="freze"]').click();
  const f = page.getByRole('dialog', { name: TITLU });
  await expect(f).toBeVisible();
  await expect(f.locator('[data-freze="cauta"]')).toBeFocused();
  // Biblioteca vine cu frezele standard, fără niciun clic.
  await expect(nume(f)).toHaveText(['Plată Ø3,175', 'Plată Ø6', 'Plată Ø12', 'V60 Ø6', 'V90 Ø12', 'Gravare 30° vârf 0,2 Ø3,175']);
  await expect(f.locator('[data-freze="pornire"]')).toHaveCount(0);
  await expect(f.getByRole('heading', { name: 'Plate (3)' })).toBeVisible();
  await expect(f.getByRole('heading', { name: 'În V (2)' })).toBeVisible();
  await expect(f.getByRole('heading', { name: 'Gravare (1)' })).toBeVisible();
  await expect(f.locator('[data-freze="stare"]')).toContainText('Doar în acest browser');
  await expect(f.locator('[data-freze="stare"]')).toContainText('6 freze');
  await expect(f.locator('[data-freza]').first()).toContainText('T1 · 18000 rot/min · 1000 mm/min');
  // Filtrul și căutarea.
  await f.locator('[data-freze-filtru="v"]').click();
  await expect(nume(f)).toHaveText(['V60 Ø6', 'V90 Ø12']);
  await f.locator('[data-freze-filtru="toate"]').click();
  await f.locator('[data-freze="cauta"]').fill('ø12');
  await expect(nume(f)).toHaveText(['Plată Ø12', 'V90 Ø12']);
  await f.locator('[data-freze="cauta"]').fill('nimic');
  await expect(f).toContainText('Nicio freză nu se potrivește căutării.');
  // F1 deschide capitolul ferestrei; Escape închide manualul, iar fereastra rămâne; apoi Escape o închide, cu focusul la Cont.
  await page.keyboard.press('F1');
  await expect(page.getByTestId('manual')).toHaveAttribute('data-stare', 'gata');
  await expect(page.getByTestId('manual-capitol')).toHaveAttribute('data-capitol', 'freze');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('manual')).toHaveCount(0);
  await expect(f).toBeVisible();
  await f.locator('[data-freze="cauta"]').focus();
  await page.keyboard.press('Escape');
  await expect(f).toHaveCount(0);
  await expect(page.locator('[data-editare="cont"]')).toBeFocused();
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('frezele standard, puse la prima pornire în limba ei: în engleză, cu numele englezești', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('cncvs2.limba', 'en'); });
  await page.goto('/');
  const f = await deschideFrezele(page, 'My bits');
  await expect(nume(f)).toHaveText(['Flat Ø3.175', 'Flat Ø6', 'Flat Ø12', 'V60 Ø6', 'V90 Ø12', 'Engraving 30° tip 0.2 Ø3.175']);
});

test('lista întâi: fișa frezei alese, doar de citit; „Editează” deschide configuratorul; „Salvează” și „Renunță” întorc la fișă', async ({ page }) => {
  await page.goto('/');
  const f = await deschideFrezele(page);
  await standard(f);
  await expect(f.locator('[data-freze-vedere="lista"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(f).toContainText('Alege o freză din listă sau fă una nouă.');
  await f.locator('[data-freza]').filter({ hasText: 'V90 Ø12' }).click();
  // Fișa: felul, geometria și valorile de lucru, fără niciun câmp de scris.
  await expect(fisa(f).getByRole('heading', { name: 'V90 Ø12', level: 3 })).toBeVisible();
  await expect(fisa(f).getByRole('img', { name: 'Silueta frezei, la scară' })).toBeVisible();
  await expect(valoare(f, 'fel')).toHaveText('În V');
  await expect(valoare(f, 'diametru')).toHaveText('12 mm');
  await expect(valoare(f, 'unghi')).toHaveText('90°');
  await expect(valoare(f, 'varf')).toHaveCount(0);
  await expect(valoare(f, 'tais')).toHaveCount(0);
  await expect(valoare(f, 'taisuri')).toHaveText('2');
  await expect(valoare(f, 'numar')).toHaveText('T4');
  await expect(valoare(f, 'turatie')).toHaveText('18000 rot/min');
  await expect(valoare(f, 'avans')).toHaveText('1000 mm/min');
  await expect(valoare(f, 'plonjare')).toHaveText('300 mm/min');
  await expect(valoare(f, 'pas')).toHaveText('2 mm');
  await expect(valoare(f, 'pasLateral')).toHaveText('40 % din Ø');
  await expect(f.locator('[data-freze-camp]')).toHaveCount(0);
  await expect(f.locator('[data-freze="salveaza"]')).toHaveCount(0);
  // „Editează”: configuratorul, cu valorile frezei; „Salvează” întoarce la fișă, cu valoarea nouă.
  await fisa(f).locator('[data-freze="editeaza"]').click();
  await expect(f.getByRole('heading', { name: 'V90 Ø12', level: 3 })).toBeVisible();
  await expect(camp(f, 'nume')).toBeFocused();
  await expect(camp(f, 'diametru')).toHaveValue('12');
  // În editorul din listă, „Duplică” și „Șterge” stau pe fișă, iar „Renunță” merge și fără schimbări (înapoi la fișă).
  await expect(f.locator('[data-freze="duplica"]')).toHaveCount(0);
  await f.locator('[data-freze="renunta"]').click();
  await expect(valoare(f, 'diametru')).toHaveText('12 mm');
  await expect(fisa(f).locator('[data-freze="editeaza"]')).toBeFocused();
  await fisa(f).locator('[data-freze="editeaza"]').click();
  await camp(f, 'avans').fill('1100');
  await f.locator('[data-freze="salveaza"]').click();
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Salvat');
  await expect(valoare(f, 'avans')).toHaveText('1100 mm/min');
  await expect(f.locator('[data-freze-camp]')).toHaveCount(0);
  await expect(fisa(f).locator('[data-freze="editeaza"]')).toBeFocused();
  // „Renunță”: fișa, cu valorile de dinainte.
  await editeaza(f, 'V90 Ø12');
  await camp(f, 'diametru').fill('10');
  await f.locator('[data-freze="renunta"]').click();
  await expect(valoare(f, 'diametru')).toHaveText('12 mm');
  // „Freză nouă”, apoi „Renunță”: nimic ales.
  await f.locator('[data-freze="noua"]').click();
  await expect(f.getByRole('heading', { name: 'Freză nouă', level: 3 })).toBeVisible();
  await f.locator('[data-freze="renunta"]').click();
  await expect(f).toContainText('Alege o freză din listă sau fă una nouă.');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('comutatorul „Configurator”: alegerea deschide direct editorul; ținut după reîncărcare; „Listă” aduce fișa înapoi', async ({ page }) => {
  await page.goto('/');
  const f = await deschideFrezele(page);
  await standard(f);
  await f.locator('[data-freza]').filter({ hasText: 'Plată Ø6' }).click();
  await expect(valoare(f, 'diametru')).toHaveText('6 mm');
  // Comutat cu o freză aleasă: editorul ei se deschide pe loc.
  await f.locator('[data-freze-vedere="configurator"]').click();
  await expect(f.locator('[data-freze-vedere="configurator"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(camp(f, 'diametru')).toHaveValue('6');
  await expect(fisa(f)).toHaveCount(0);
  // Alta, aleasă: tot editorul; „Salvează” îl ține deschis, ca înainte de listă.
  await f.locator('[data-freza]').filter({ hasText: 'Plată Ø12' }).click();
  await expect(camp(f, 'diametru')).toHaveValue('12');
  await camp(f, 'turatie').fill('16000');
  await f.locator('[data-freze="salveaza"]').click();
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Salvat');
  await expect(camp(f, 'turatie')).toHaveValue('16000');
  await expect(f.locator('[data-freze="duplica"]')).toBeVisible();
  // După reîncărcare, vederea aleasă rămâne.
  await page.reload();
  const g = await deschideFrezele(page);
  await expect(g.locator('[data-freze-vedere="configurator"]')).toHaveAttribute('aria-pressed', 'true');
  await g.locator('[data-freza]').filter({ hasText: 'V60 Ø6' }).click();
  await expect(camp(g, 'unghi')).toHaveValue('60');
  // „Listă”, cu o schimbare nesalvată: schimbarea se salvează, apoi freza aleasă își arată fișa.
  await camp(g, 'avans').fill('1300');
  await g.locator('[data-freze-vedere="lista"]').click();
  await expect(valoare(g, 'unghi')).toHaveText('60°');
  await expect(valoare(g, 'avans')).toHaveText('1300 mm/min');
  await expect(g.locator('[data-freze-camp]')).toHaveCount(0);
});

test('grupurile omului: „Grupul” din fișă (un grup nou, unul existent) și unul existent, redenumirea din titlu, înapoi pe fel; ținute după reîncărcare', async ({ page }) => {
  await page.goto('/');
  const f = await deschideFrezele(page);
  await standard(f);
  const titluri = (x: Locator): Locator => x.locator('.freze-grupa h3');
  // Implicit, pe feluri.
  await expect(titluri(f)).toHaveText(['Plate (3)', 'În V (2)', 'Gravare (1)']);
  await expect(f.locator('[data-freze="grup-redenumeste"]')).toHaveCount(0);
  // „Grupul” → „Grup nou…”: Plată Ø6 în „Lemn”, care vine primul.
  await f.locator('[data-freza]').filter({ hasText: 'Plată Ø6' }).click();
  await expect(grupul(f)).toHaveText('Fără grup (pe fel)');
  await fisa(f).locator('[data-freze="muta"]').selectOption({ label: 'Grup nou…' });
  await expect(fisa(f).locator('[data-freze="grup-nou"]')).toBeFocused();
  await fisa(f).locator('[data-freze="grup-nou"]').fill('Lemn');
  await fisa(f).locator('[data-freze="grup-nou-da"]').click();
  await expect(grupul(f)).toHaveText('Lemn');
  await expect(titluri(f)).toHaveText(['Lemn (1)', 'Plate (2)', 'În V (2)', 'Gravare (1)']);
  // Încă una, în grupul care există (din listă).
  await f.locator('[data-freza]').filter({ hasText: 'V90 Ø12' }).click();
  await fisa(f).locator('[data-freze="muta"]').selectOption({ label: 'Lemn' });
  await expect(grupul(f)).toHaveText('Lemn');
  await expect(titluri(f)).toHaveText(['Lemn (2)', 'Plate (2)', 'În V (1)', 'Gravare (1)']);
  // Redenumirea, din titlul grupului: Escape renunță (fereastra rămâne), un nume prea lung se refuză, Enter îl aplică.
  await f.locator('[data-freze="grup-redenumeste"]').click();
  const nou = f.locator('[data-freze="grup-nume-nou"]');
  await expect(nou).toHaveValue('Lemn');
  await expect(nou).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(nou).toHaveCount(0);
  await expect(f).toBeVisible();
  await expect(f.locator('[data-freze="grup-redenumeste"]')).toBeFocused();
  await f.locator('[data-freze="grup-redenumeste"]').click();
  await nou.fill('x'.repeat(41));
  await nou.press('Enter');
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Cel mult 40 de caractere.');
  await nou.fill('Esență tare');
  await nou.press('Enter');
  await expect(titluri(f)).toHaveText(['Esență tare (2)', 'Plate (2)', 'În V (1)', 'Gravare (1)']);
  // Redenumit: focusul pe „✎” al grupului; Escape închide acum fereastra (nimic nu mai e deschis în ea).
  await expect(f.locator('[data-freze-grup="Esență tare"] [data-freze="grup-redenumeste"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(f).toHaveCount(0);
  // După reîncărcare, grupul e tot acolo.
  await page.reload();
  const g = await deschideFrezele(page);
  await expect(titluri(g)).toHaveText(['Esență tare (2)', 'Plate (2)', 'În V (1)', 'Gravare (1)']);
  // În editor, câmpul „Grupul”: alt nume, alt grup.
  await editeaza(g, 'V90 Ø12');
  await expect(camp(g, 'grup')).toHaveValue('Esență tare');
  await camp(g, 'grup').fill('Aluminiu');
  await g.locator('[data-freze="salveaza"]').click();
  await expect(grupul(g)).toHaveText('Aluminiu');
  await expect(titluri(g)).toHaveText(['Aluminiu (1)', 'Esență tare (1)', 'Plate (2)', 'În V (1)', 'Gravare (1)']);
  // „Fără grup (pe fel)”, din fișă: freza se întoarce pe felul ei.
  await fisa(g).locator('[data-freze="muta"]').selectOption({ label: 'Fără grup (pe fel)' });
  await expect(titluri(g)).toHaveText(['Esență tare (1)', 'Plate (2)', 'În V (2)', 'Gravare (1)']);
  // Redenumit gol: grupul se desface, iar frezele lui se întorc pe felurile lor.
  await g.locator('[data-freze="grup-redenumeste"]').click();
  await g.locator('[data-freze="grup-nume-nou"]').fill('');
  await g.locator('[data-freze="grup-redenumeste-da"]').click();
  await expect(titluri(g)).toHaveText(['Plate (3)', 'În V (2)', 'Gravare (1)']);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('catalogul: grupurile cu mărimile lor, fișa unei freze din catalog, „Pune în frezele mele” pentru una, un grup, tot', async ({ page }) => {
  await page.goto('/');
  const f = await deschideFrezele(page);
  await standard(f);
  const cat = f.locator('[data-freze="catalog"]');
  const bib = (x: Locator): Locator => x.locator('[data-freza] .freze-rand-nume');
  // Strâns la început: doar titlul, cu numărul frezelor.
  await expect(f.locator('[data-freze="catalog-arata"]')).toHaveText('Catalogul (149)');
  await expect(cat.locator('[data-catalog]')).toHaveCount(0);
  await f.locator('[data-freze="catalog-arata"]').click();
  await expect(cat.locator('.freze-grupa h3')).toHaveText([
    'Plate (17)', 'Planare (5)', 'În V (17)', 'Gravare (30)', 'Bilă (12)', 'Toroidale (6)', 'Conice cu vârf rotund (9)', 'Burghie (23)',
    'Rotunjiri (11)', 'Ogee (7)', 'Ogee roman (4)', 'Panouri ridicate (8)',
  ]);
  await expect(cat.locator('[data-catalog="cat-plata-6.35"]')).toContainText('1/4" · 18000 rot/min · 1800 mm/min');
  // Fișa unei freze din catalog: valorile de pornire și nota țolilor, doar de citit, fără Editează.
  await cat.locator('[data-catalog="cat-plata-6.35"]').click();
  await expect(fisa(f).getByRole('heading', { name: 'Plată Ø6,35', level: 3 })).toBeVisible();
  await expect(valoare(f, 'avans')).toHaveText('1800 mm/min');
  await expect(valoare(f, 'nota')).toHaveText('1/4"');
  await expect(fisa(f)).toContainText('Valori de pornire, de verificat pe material.');
  await expect(fisa(f).locator('[data-freze="editeaza"]')).toHaveCount(0);
  // Pusă: intră în bibliotecă, cu primul T liber; fișa spune că e deja acolo.
  await fisa(f).locator('[data-freze="catalog-pune"]').click();
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Puse: 1 · erau deja: 0');
  await expect(fisa(f).locator('[data-freze="catalog-pune"]')).toBeDisabled();
  await expect(fisa(f)).toContainText('E deja în frezele mele.');
  await expect(f.locator('[data-freza]').filter({ hasText: 'Plată Ø6,35' })).toContainText('T7 ·');
  // În bibliotecă, freza pusă e a omului: fișa ei se editează și ține nota țolilor.
  await f.locator('[data-freza]').filter({ hasText: 'Plată Ø6,35' }).click();
  await expect(fisa(f).locator('[data-freze="editeaza"]')).toBeVisible();
  await expect(valoare(f, 'nota')).toHaveText('1/4"');
  await expect(valoare(f, 'numar')).toHaveText('T7');
  // O freză a catalogului care e deja în bibliotecă (din setul standard): de la început, „E deja”.
  await cat.locator('[data-catalog="cat-v-90-12"]').click();
  await expect(fisa(f).locator('[data-freze="catalog-pune"]')).toBeDisabled();
  // Tot grupul Planare, apoi tot catalogul: doar ce lipsește.
  await cat.locator('[data-catalog-grup="planare"] [data-freze="catalog-pune-grup"]').click();
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Puse: 5 · erau deja: 0');
  await cat.locator('[data-freze="catalog-pune-tot"]').click();
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Puse: 136 · erau deja: 13');
  // Plata Ø19,05 e aceeași freză cu planarea Ø19,05 (aceeași geometrie): o singură dată.
  await expect(bib(f)).toHaveCount(148);
  await expect(f.locator('[data-freze="stare"]')).toContainText('148 de freze');
  // Căutarea și filtrul aleg și din catalog.
  await f.locator('[data-freze="cauta"]').fill('ø25,4');
  await expect(cat.locator('[data-catalog] .freze-rand-nume')).toHaveText(['Plată Ø25,4', 'V60 Ø25,4', 'V90 Ø25,4', 'V120 Ø25,4', 'V150 Ø25,4']);
  await f.locator('[data-freze="cauta"]').fill('');
  await f.locator('[data-freze-filtru="gravare"]').click();
  await expect(cat.locator('.freze-grupa h3')).toHaveText(['Gravare (30)']);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('felurile noi (16.A↑h-4): toroidala și burghiul în editor, cu câmpurile lor; „în curând în proiect” (burghiul) în catalog, toroidala aleasă în proiect (16.A↑e-4)', async ({ page }) => {
  await page.goto('/');
  const f = await deschideFrezele(page);
  await standard(f);
  // Toroidala: raza colțului (implicit 1), fără unghi; numele propus o spune; o rază de Ø / 2 se refuză.
  await f.locator('[data-freze="noua"]').click();
  await f.locator('[data-freze-fel="toroidala"]').click();
  await expect(camp(f, 'raza')).toHaveValue('1');
  await expect(camp(f, 'unghi')).toHaveCount(0);
  await expect(camp(f, 'nume')).toHaveAttribute('placeholder', 'Toroidală Ø6 R1');
  await camp(f, 'raza').fill('3');
  await expect(f.locator('#freze-eroare-raza')).toHaveText('Peste 0 și sub jumătatea diametrului.');
  await camp(f, 'raza').fill('1,5');
  await f.locator('[data-freze="salveaza"]').click();
  await expect(valoare(f, 'fel')).toHaveText('Toroidală');
  await expect(valoare(f, 'raza')).toHaveText('1,5 mm');
  // Din 16.A↑e-4 (ADR 0303), toroidala se alege în proiect (pe linie, canelura): nu mai e „în curând”.
  await expect(fisa(f).locator('[data-freze="curand"]')).toHaveCount(0);
  await expect(f.locator('[data-freza]').filter({ hasText: 'Toroidală Ø6 R1,5' })).not.toContainText('în curând în proiect');
  await expect(f.getByRole('heading', { name: 'Toroidale (1)' })).toBeVisible();
  // Burghiul: unghiul vârfului, 118° implicit; tăișul cel puțin cât vârful (3 / tan 59° = 1,8026).
  await f.locator('[data-freze="noua"]').click();
  await f.locator('[data-freze-fel="burghiu"]').click();
  await expect(camp(f, 'unghi')).toHaveValue('118');
  await expect(f.locator('.freze-camp').filter({ hasText: 'Unghiul vârfului' })).toHaveCount(1);
  await camp(f, 'tais').fill('1');
  await expect(f.locator('#freze-eroare-tais')).toHaveText('Cel puțin capătul: 1,803 mm.');
  // Înapoi la V: unghiul V-ului, nu al burghiului.
  await f.locator('[data-freze-fel="v"]').click();
  await expect(camp(f, 'unghi')).toHaveValue('60');
  await f.locator('[data-freze="renunta"]').click();
  // Catalogul: grupurile noi, cu „în curând” (conica, burghiul); bila și toroidala se aleg în proiect (bila din documentul v29,
  // ADR 0312; toroidala din 16.A↑e-4, ADR 0303), deci grupurile și fișele lor nu mai spun „în curând”.
  await f.locator('[data-freze="catalog-arata"]').click();
  await expect(f.locator('[data-catalog-grup="conica"]')).toContainText('în curând în proiect');
  await expect(f.locator('[data-catalog-grup="burghiu"]')).toContainText('în curând în proiect');
  await expect(f.locator('[data-catalog-grup="toroidala"] .freze-curand')).toHaveCount(0);
  await expect(f.locator('[data-catalog-grup="plata"] .freze-curand')).toHaveCount(0);
  await expect(f.locator('[data-catalog-grup="bila"] .freze-curand')).toHaveCount(0);
  await f.locator('[data-catalog="cat-bila-6"]').click();
  await expect(fisa(f).getByRole('heading', { name: 'Bilă Ø6', level: 3 })).toBeVisible();
  await expect(fisa(f).locator('[data-freze="curand"]')).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('profilurile (16.A↑h-5): rotunjirea, ogee-ul roman cu treapta, panoul cu fundul plat și scobitura opțională; cu CAM din 16.A↑f-3', async ({ page }) => {
  await page.goto('/');
  const f = await deschideFrezele(page);
  await standard(f);
  // Rotunjirea: raza 3 și, fiindcă pe Ø6 n-ar încăpea, diametrul 12; fără unghi; o rază de Ø / 2 se refuză.
  await f.locator('[data-freze="noua"]').click();
  await f.locator('[data-freze-fel="rotunjire"]').click();
  await expect(camp(f, 'raza')).toHaveValue('3');
  await expect(camp(f, 'diametru')).toHaveValue('12');
  await expect(camp(f, 'unghi')).toHaveCount(0);
  await expect(f.locator('.freze-camp').filter({ hasText: 'Raza rotunjirii' })).toHaveCount(1);
  await expect(camp(f, 'nume')).toHaveAttribute('placeholder', 'Rotunjire R3 Ø12');
  await camp(f, 'raza').fill('6');
  await expect(f.locator('#freze-eroare-raza')).toHaveText('Peste 0 și sub jumătatea diametrului.');
  await camp(f, 'raza').fill('3');
  await f.locator('[data-freze="salveaza"]').click();
  await expect(valoare(f, 'fel')).toHaveText('Rotunjire');
  await expect(valoare(f, 'raza')).toHaveText('3 mm');
  // Din 16.A↑f-3 (ADR 0304), profilurile intră în proiect (canelura): fișa nu mai spune „în curând”.
  await expect(fisa(f).locator('[data-freze="curand"]')).toHaveCount(0);
  await expect(fisa(f).getByRole('img', { name: 'Silueta frezei' })).toBeVisible();
  await expect(f.getByRole('heading', { name: 'Rotunjiri (1)' })).toBeVisible();
  // Ogee-ul roman: raza arcelor și treapta, cu diametrul care le cuprinde (21); o treaptă prea mare se refuză.
  await f.locator('[data-freze="noua"]').click();
  await f.locator('[data-freze-fel="ogee-roman"]').click();
  await expect(camp(f, 'raza')).toHaveValue('3');
  await expect(camp(f, 'treapta')).toHaveValue('1,5');
  await expect(camp(f, 'diametru')).toHaveValue('21');
  await expect(f.locator('.freze-camp').filter({ hasText: 'Raza arcelor' })).toHaveCount(1);
  await camp(f, 'treapta').fill('5');
  await expect(f.locator('#freze-eroare-treapta')).toHaveText('Peste 0 și cât încap arcele și treptele: 2 × raza + treapta sub Ø / 2.');
  // Ogee-ul simplu n-are treaptă; raza lui e sub un sfert din diametru.
  await f.locator('[data-freze-fel="ogee"]').click();
  await expect(camp(f, 'treapta')).toHaveCount(0);
  await camp(f, 'raza').fill('6');
  await expect(f.locator('#freze-eroare-raza')).toHaveText('Peste 0 și sub un sfert din diametru.');
  // Din ogee-ul de Ø21, panoul își păstrează diametrul (fundul plat încape).
  await f.locator('[data-freze-fel="panou"]').click();
  await expect(camp(f, 'diametru')).toHaveValue('21');
  await f.locator('[data-freze="renunta"]').click();
  // Panoul nou (de pe Ø6, unde fundul plat de 1/4" n-ar încăpea): teșitura față de fața plăcii (12°), fundul plat de 1/4",
  // diametrul de 2", scobitura goală (opțională).
  await f.locator('[data-freze="noua"]').click();
  await f.locator('[data-freze-fel="panou"]').click();
  await expect(camp(f, 'unghi')).toHaveValue('12');
  await expect(camp(f, 'varf')).toHaveValue('6,35');
  await expect(camp(f, 'diametru')).toHaveValue('50,8');
  await expect(camp(f, 'raza')).toHaveValue('');
  await expect(f.locator('.freze-camp').filter({ hasText: 'Teșitura (față de fața plăcii)' })).toHaveCount(1);
  await expect(f.locator('.freze-camp').filter({ hasText: 'Fundul plat' })).toHaveCount(1);
  await expect(camp(f, 'nume')).toHaveAttribute('placeholder', 'Panou 12° Ø50,8');
  await camp(f, 'unghi').fill('90');
  await expect(f.locator('#freze-eroare-unghi')).toHaveText('Între 1° și 89°.');
  await camp(f, 'unghi').fill('12');
  await camp(f, 'raza').fill('200');
  await expect(f.locator('#freze-eroare-raza')).toHaveText('Peste 0, cât încape scobitura între fundul plat și diametru.');
  await camp(f, 'raza').fill('6,35');
  await expect(camp(f, 'nume')).toHaveAttribute('placeholder', 'Panou 12° R6,35 Ø50,8');
  await f.locator('[data-freze="renunta"]').click();
  // Catalogul: grupurile profilurilor, fără „în curând” (16.A↑f-3); fișa unui panou cu scobitură.
  await f.locator('[data-freze="catalog-arata"]').click();
  for (const g of ['rotunjire', 'ogee', 'ogee-roman', 'panou']) await expect(f.locator(`[data-catalog-grup="${g}"] .freze-curand`)).toHaveCount(0);
  await f.locator('[data-catalog="cat-panou-12-r6.35-50.8"]').click();
  await expect(fisa(f).getByRole('heading', { name: 'Panou 12° R6,35 Ø50,8', level: 3 })).toBeVisible();
  await expect(valoare(f, 'varf')).toHaveText('6,35 mm');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('goală (frezele standard șterse): nu revin singure, nici după reîncărcare; „Adaugă frezele standard” le pune la loc', async ({ page }) => {
  await page.goto('/');
  await bibliotecaGoala(page);
  const f = await deschideFrezele(page);
  await expect(f).toContainText('Biblioteca e goală.');
  await expect(f.locator('[data-freze="exporta"]')).toBeDisabled();
  await page.reload();
  const g = await deschideFrezele(page);
  await expect(g).toContainText('Biblioteca e goală.');
  await pornire(g);
  await expect(nume(g)).toHaveText(['Plată Ø3,175', 'Plată Ø6', 'Plată Ø12', 'V60 Ø6', 'V90 Ø12', 'Gravare 30° vârf 0,2 Ø3,175']);
  await expect(g.locator('[data-freze="mesaj"]')).toHaveText('Adăugate: 6 · înlocuite: 0 · sărite: 0');
});

test('freză nouă: numele propus, refuzurile pe câmp, salvarea; rămâne după reîncărcare; schimbarea și plecarea cu schimbări', async ({ page }) => {
  await page.goto('/');
  await bibliotecaGoala(page);
  const f = await deschideFrezele(page);
  await f.locator('[data-freze="noua"]').click();
  await expect(f.getByRole('heading', { name: 'Freză nouă', level: 3 })).toBeVisible();
  await expect(camp(f, 'nume')).toHaveAttribute('placeholder', 'Plată Ø6');
  await expect(camp(f, 'numar')).toHaveValue('1');
  // V60 cu diametrul 8: numele propus urmează felul și diametrul.
  await f.locator('[data-freze-fel="v"]').click();
  await camp(f, 'diametru').fill('8');
  await expect(camp(f, 'nume')).toHaveAttribute('placeholder', 'V60 Ø8');
  // Refuzurile: diametrul 0, unghiul 180, tăișul mai scurt decât conul (4 · cot 30° = 6,928).
  await camp(f, 'diametru').fill('0');
  await expect(f.locator('#freze-eroare-diametru')).toHaveText('Peste 0 și cel mult 100.');
  await expect(camp(f, 'diametru')).toHaveAttribute('aria-invalid', 'true');
  await camp(f, 'diametru').fill('8');
  await camp(f, 'unghi').fill('180');
  await expect(f.locator('#freze-eroare-unghi')).toHaveText('Între 1° și 179°.');
  await camp(f, 'unghi').fill('60');
  await camp(f, 'tais').fill('6,9');
  await expect(f.locator('#freze-eroare-tais')).toHaveText('Cel puțin conul: 6,929 mm.');
  await camp(f, 'tais').fill('7');
  await camp(f, 'avans').fill('1200');
  await f.locator('[data-freze="salveaza"]').click();
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Salvat');
  await expect(nume(f)).toHaveText(['V60 Ø8']);
  // Salvată, freza își arată fișa: editorul se închide.
  await expect(fisa(f).getByRole('heading', { name: 'V60 Ø8', level: 3 })).toBeVisible();
  await expect(f.locator('[data-freze="salveaza"]')).toHaveCount(0);
  // După reîncărcare, freza e tot acolo (IndexedDB).
  await page.reload();
  const g = await deschideFrezele(page);
  await expect(nume(g)).toHaveText(['V60 Ø8']);
  await g.locator('[data-freza]').click();
  await expect(valoare(g, 'avans')).toHaveText('1200 mm/min');
  await expect(valoare(g, 'tais')).toHaveText('7 mm');
  await editeaza(g, 'V60 Ø8');
  await expect(camp(g, 'avans')).toHaveValue('1200');
  await expect(camp(g, 'tais')).toHaveValue('7');
  // O schimbare bună se salvează singură la plecare (Freză nouă); una greșită ține editorul pe loc.
  await camp(g, 'turatie').fill('20000');
  await g.locator('[data-freze="noua"]').click();
  await expect(g.getByRole('heading', { name: 'Freză nouă', level: 3 })).toBeVisible();
  await expect(g.locator('[data-freza]').first()).toContainText('T1 · 20000 rot/min · 1200 mm/min');
  await expect(camp(g, 'numar')).toHaveValue('2');
  await camp(g, 'diametru').fill('abc');
  await g.locator('[data-freza]').first().click();
  await expect(g.getByRole('heading', { name: 'Freză nouă', level: 3 })).toBeVisible();
  await expect(g.locator('[data-freze="mesaj"]')).toHaveText('Repară câmpurile marcate sau apasă „Renunță la schimbări”.');
  await expect(g.locator('#freze-eroare-diametru')).toHaveText('Scrie un număr.');
  await expect(camp(g, 'diametru')).toBeFocused();
  await g.locator('[data-freze="renunta"]').click();
  await expect(g).toContainText('Alege o freză din listă sau fă una nouă.');
  // Numele folosit e refuzat, pe câmp.
  await g.locator('[data-freze="noua"]').click();
  await camp(g, 'nume').fill('v60 ø8');
  await g.locator('[data-freze="salveaza"]').click();
  await expect(g.locator('#freze-eroare-nume')).toHaveText('Numele e deja al altei freze.');
  await expect(nume(g)).toHaveCount(1);
});

test('duplicarea, ștergerea cu întrebarea (Escape renunță la întrebare); exportul și importul (JSON, CSV, numele care se repetă)', async ({ page }) => {
  await page.goto('/');
  const f = await deschideFrezele(page);
  await standard(f);
  await f.locator('[data-freza]').filter({ hasText: 'Plată Ø6' }).click();
  await fisa(f).locator('[data-freze="duplica"]').click();
  await expect(nume(f)).toContainText(['Plată Ø6 copie']);
  await expect(fisa(f).getByRole('heading', { name: 'Plată Ø6 copie', level: 3 })).toBeVisible();
  await fisa(f).locator('[data-freze="sterge"]').click();
  await expect(f).toContainText('Ștergi „Plată Ø6 copie”? Proiectele care o folosesc își păstrează copia.');
  await page.keyboard.press('Escape');
  await expect(f).toBeVisible();
  await expect(f.locator('[data-freze="sterge-da"]')).toHaveCount(0);
  await fisa(f).locator('[data-freze="sterge"]').click();
  await f.locator('[data-freze="sterge-da"]').click();
  await expect(nume(f)).toHaveCount(6);
  await expect(fisa(f)).toHaveCount(0);
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Șters');
  // Exportul: fișierul propriu, cu cele șase freze, fără id-uri.
  const [descarcare] = await Promise.all([page.waitForEvent('download'), f.locator('[data-freze="exporta"]').click()]);
  expect(descarcare.suggestedFilename()).toBe('frezele-mele.cvs2freze.json');
  const text = await readFile(await descarcare.path(), 'utf8');
  const fisier = JSON.parse(text) as { format: string; v: number; freze: { nume: string; id?: string }[] };
  expect(fisier.format).toBe('cncvs2-freze');
  expect(fisier.v).toBe(1);
  expect(fisier.freze.map((x) => x.nume)).toEqual(['Plată Ø3,175', 'Plată Ø6', 'V60 Ø6', 'V90 Ø12', 'Gravare 30° vârf 0,2 Ø3,175', 'Plată Ø12']);
  expect(fisier.freze.some((x) => 'id' in x)).toBe(false);
  // Importul unui CSV: „Plată Ø6” există deja; cu „Înlocuiește”, avansul ei devine 1500; un rând greșit se sare.
  const dosar = await mkdtemp(join(tmpdir(), 'freze-'));
  const csv = join(dosar, 'freze.csv');
  await writeFile(csv, 'nume;fel;diametru;avans\nPlată Ø6;plata;6;1500\nPlată Ø8;plata;8;\nRea;necunoscut;6;\n');
  await f.locator('[data-freze="fisier"]').setInputFiles(csv);
  const imp = f.locator('[data-freze="import"]');
  await expect(imp).toContainText('Fișierul are 2 freze. O intrare nu e o freză bună și se sare.');
  await expect(imp.getByRole('radio', { name: 'Păstrează-le pe amândouă' })).toBeChecked();
  await imp.getByRole('radio', { name: 'Înlocuiește' }).check();
  await imp.locator('[data-freze="import-confirma"]').click();
  await expect(imp).toHaveCount(0);
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Adăugate: 1 · înlocuite: 1 · sărite: 1');
  await expect(f.locator('[data-freza]').filter({ hasText: /^Plată Ø6T/u })).toContainText('1500 mm/min');
  await expect(nume(f)).toContainText(['Plată Ø8']);
  // Fișierul exportat, adus înapoi cu „Păstrează-le pe amândouă”: copiile primesc „(2)”.
  const json = join(dosar, 'freze.json');
  await writeFile(json, text);
  await f.locator('[data-freze="fisier"]').setInputFiles(json);
  await f.locator('[data-freze="import-confirma"]').click();
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Adăugate: 6 · înlocuite: 0 · sărite: 0');
  await expect(nume(f)).toContainText(['Plată Ø6 (2)', 'V60 Ø6 (2)']);
  // Un fișier care nu e al bibliotecii: motivul, fără nimic schimbat.
  const rau = join(dosar, 'rau.json');
  await writeFile(rau, '{"format":"altceva"}');
  await f.locator('[data-freze="fisier"]').setInputFiles(rau);
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Nu e un fișier cu o bibliotecă de freze.');
  await expect(f.locator('[data-freze="import"]')).toHaveCount(0);
});

/**
 * Escape, apăsat exact în clipa în care butonul dat pleacă din pagină: observatorul vede plecarea înaintea efectelor care mută
 * focusul (în fișă, în căutare), deci tasta cade pe ce are atunci focusul, ca o tastă reală apăsată în clipa aceea. Întoarce
 * pe ce a căzut.
 */
async function escapeLaPlecare(page: Page, selector: string): Promise<() => Promise<string | undefined>> {
  await page.evaluate((s) => {
    const w = window as unknown as { tintaEscape?: string };
    delete w.tintaEscape;
    const o = new MutationObserver(() => {
      if (document.querySelector(s)) return;
      o.disconnect();
      const a = document.activeElement ?? document.body;
      w.tintaEscape = a.tagName;
      a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
    });
    o.observe(document.body, { subtree: true, childList: true });
  }, selector);
  return () => page.evaluate(() => (window as unknown as { tintaEscape?: string }).tintaEscape);
}

test('Escape închide fereastra oriunde ar fi focusul: chiar după „Salvează” și „Da, șterge”, în Configurator, după un clic pe text (16.A↑b-7)', async ({ page }) => {
  await page.goto('/');
  // Unealta de sub fereastră rămâne: Escape e al ferestrei, nu ajunge la desen (acolo, pe pagină, ar întoarce la selecție).
  await page.locator('[data-unealta="dreptunghi"]').click();
  // După „Salvează” (vederea „Listă”): butonul pleacă, iar focusul ajunge pe „Editează” abia după redesenare.
  let f = await deschideFrezele(page);
  await standard(f);
  await editeaza(f, 'Plată Ø6');
  await camp(f, 'avans').fill('1234');
  let tinta = await escapeLaPlecare(page, '[data-freze="salveaza"]');
  await f.locator('[data-freze="salveaza"]').click();
  await expect(f).toHaveCount(0);
  expect(await tinta()).toBe('BODY');
  await expect(page.locator('[data-editare="cont"]')).toBeFocused();
  // Salvată, deși fereastra s-a închis în clipa aceea.
  f = await deschideFrezele(page);
  await nume(f).getByText('Plată Ø6', { exact: true }).click();
  await expect(valoare(f, 'avans')).toHaveText('1234 mm/min');
  // După „Da, șterge”: rândul pleacă la vestea bibliotecii, iar focusul ajunge în căutare abia după ștergere.
  await fisa(f).locator('[data-freze="sterge"]').click();
  tinta = await escapeLaPlecare(page, '[data-freze="sterge-da"]');
  await f.locator('[data-freze="sterge-da"]').click();
  await expect(f).toHaveCount(0);
  expect(await tinta()).toBe('BODY');
  f = await deschideFrezele(page);
  await expect(nume(f)).toHaveCount(5);
  // După Enter în redenumirea unui grup: grupul vechi pleacă la vestea bibliotecii, iar câmpul se închide abia după.
  await f.locator('[data-freza]').filter({ hasText: 'Plată Ø12' }).click();
  await fisa(f).locator('[data-freze="muta"]').selectOption({ label: 'Grup nou…' });
  await fisa(f).locator('[data-freze="grup-nou"]').fill('Lemn');
  await fisa(f).locator('[data-freze="grup-nou-da"]').click();
  await expect(grupul(f)).toHaveText('Lemn');
  await f.locator('[data-freze="grup-redenumeste"]').click();
  await f.locator('[data-freze="grup-nume-nou"]').fill('Esență tare');
  tinta = await escapeLaPlecare(page, '[data-freze="grup-nume-nou"]');
  await f.locator('[data-freze="grup-nume-nou"]').press('Enter');
  await expect(f).toHaveCount(0);
  expect(await tinta()).toBe('BODY');
  f = await deschideFrezele(page);
  await expect(f.locator('.freze-grupa h3').first()).toHaveText('Esență tare (1)');
  // Un clic pe un text al ferestrei (titlul) lasă focusul pe pagină: Escape o închide tot.
  await f.locator('#freze-titlu').click();
  await expect(f.locator(':focus')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(f).toHaveCount(0);
  // În „Configurator”, „Salvează” rămâne pe loc, oprit, sub focus; la desenarea următoare, browserul îi ia focusul (pe pagină).
  // Escape, apăsat după, o închide.
  f = await deschideFrezele(page);
  await f.locator('[data-freze-vedere="configurator"]').click();
  await f.locator('[data-freza]').filter({ hasText: 'Plată Ø12' }).click();
  await camp(f, 'turatie').fill('16000');
  await f.locator('[data-freze="salveaza"]').click();
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Salvat');
  await expect(f.locator('[data-freze="salveaza"]')).toBeDisabled();
  await expect(f.locator(':focus')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(f).toHaveCount(0);
  await expect(page.locator('[data-unealta="dreptunghi"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('două file: o freză salvată într-una apare în cealaltă, fără reîncărcare', async ({ page, context }) => {
  await page.goto('/');
  await bibliotecaGoala(page);
  const a = await deschideFrezele(page);
  const alta = await context.newPage();
  await alta.goto('/');
  const b = await deschideFrezele(alta);
  await expect(nume(b)).toHaveCount(0);
  await a.locator('[data-freze="noua"]').click();
  await camp(a, 'diametru').fill('4');
  await a.locator('[data-freze="salveaza"]').click();
  await expect(nume(b)).toHaveText(['Plată Ø4']);
});

test('două file: freza ștearsă în cealaltă, cu „Grup nou…” sau cu întrebarea deschise aici; Escape închide fereastra (16.A↑b-7)', async ({ page, context }) => {
  await page.goto('/');
  const a = await deschideFrezele(page);
  await standard(a);
  const alta = await context.newPage();
  await alta.goto('/');
  const b = await deschideFrezele(alta);
  await standard(b);
  // Aici, „Grup nou…” pe Plată Ø6; în cealaltă filă, ștearsă: fișa și câmpul pleacă, deci Escape nu mai are ce închide în ea.
  await a.locator('[data-freza]').filter({ hasText: 'Plată Ø6' }).click();
  await fisa(a).locator('[data-freze="muta"]').selectOption({ label: 'Grup nou…' });
  await expect(fisa(a).locator('[data-freze="grup-nou"]')).toBeFocused();
  await b.locator('[data-freza]').filter({ hasText: 'Plată Ø6' }).click();
  await fisa(b).locator('[data-freze="sterge"]').click();
  await b.locator('[data-freze="sterge-da"]').click();
  await expect(nume(a)).toHaveCount(5);
  await expect(a.locator('[data-freze="grup-nou"]')).toHaveCount(0);
  await page.bringToFront();
  await page.keyboard.press('Escape');
  await expect(a).toHaveCount(0);
  // La fel, cu întrebarea ștergerii deschisă aici.
  const c = await deschideFrezele(page);
  await c.locator('[data-freza]').filter({ hasText: 'V60 Ø6' }).click();
  await fisa(c).locator('[data-freze="sterge"]').click();
  await expect(c.locator('[data-freze="sterge-da"]')).toBeVisible();
  await alta.bringToFront();
  await b.locator('[data-freza]').filter({ hasText: 'V60 Ø6' }).click();
  await fisa(b).locator('[data-freze="sterge"]').click();
  await b.locator('[data-freze="sterge-da"]').click();
  await expect(nume(c)).toHaveCount(4);
  await expect(c.locator('[data-freze="sterge-da"]')).toHaveCount(0);
  await page.bringToFront();
  await page.keyboard.press('Escape');
  await expect(c).toHaveCount(0);
});

for (const latime of [390, 360, 320]) {
  test(`pe telefon (${latime} px), cu fontul lat: lista, fișa, apoi editorul pe tot ecranul, fără derulare pe orizontală`, async ({ page }) => {
    await page.setViewportSize({ width: latime, height: 780 });
    await page.goto('/');
    await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
    const f = await deschideFrezele(page);
    await standard(f);
    await faraDepasire(page);
    await expect(f.locator('.freze-editor')).toBeHidden();
    await f.locator('[data-freza]').filter({ hasText: 'Gravare' }).click();
    await expect(f.locator('.freze-lista')).toBeHidden();
    await expect(valoare(f, 'varf')).toBeVisible();
    await faraDepasire(page);
    await fisa(f).locator('[data-freze="editeaza"]').click();
    await expect(camp(f, 'varf')).toBeVisible();
    await expect(f.locator('.freze-lista')).toBeHidden();
    await faraDepasire(page);
    // Din editor, înapoi la fișă; din fișă, înapoi la listă.
    await f.locator('[data-freze="inapoi"]').click();
    await expect(valoare(f, 'varf')).toBeVisible();
    await fisa(f).locator('[data-freze="inapoi"]').click();
    await expect(f.locator('.freze-lista')).toBeVisible();
    await faraDepasire(page);
  });
}

test('la 1280 px, cu fontul lat: fereastra încape, fără derulare pe orizontală', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
  const f = await deschideFrezele(page);
  await standard(f);
  await f.locator('[data-freza]').filter({ hasText: 'Gravare' }).click();
  await expect(f.locator('.freze-lista')).toBeVisible();
  await expect(valoare(f, 'varf')).toHaveText('0,2 mm');
  // Cota siluetei, cu virgula în română.
  await expect(fisa(f).locator('figure')).toContainText('Ø3,175');
  await faraDepasire(page);
  await fisa(f).locator('[data-freze="editeaza"]').click();
  await expect(camp(f, 'varf')).toBeVisible();
  await faraDepasire(page);
});

test('din paletă, peste fereastra Mașina: fereastra se deschide, iar Mașina rămâne dedesubt; în engleză', async ({ page }) => {
  await page.goto('/');
  // Goală, ca frezele standard să se pună în engleză, cu butonul.
  await bibliotecaGoala(page);
  const masina = page.locator('[data-actiune="vedere.masina"]');
  await masina.click();
  await expect(masina).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Control+k');
  const paleta = page.getByRole('dialog', { name: 'Paleta de comenzi' });
  await paleta.getByRole('combobox').fill('frezele');
  await page.locator('[id="paleta-vedere.freze"]').click();
  const f = page.getByRole('dialog', { name: TITLU });
  await expect(f).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(f).toHaveCount(0);
  await expect(masina).toHaveAttribute('aria-current', 'page');
  // În engleză.
  await page.locator('[data-actiune="vedere.proiectare"]').click();
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  const meniu = await deschideMeniulContului(page);
  await expect(meniu.locator('[data-meniu-cont="freze"] span').first()).toHaveText('My bits…');
  await meniu.locator('[data-meniu-cont="freze"]').click();
  const g = page.getByRole('dialog', { name: 'My bits' });
  await expect(g).toBeVisible();
  await expect(g).toContainText('The library is empty.');
  await pornire(g);
  await expect(nume(g)).toHaveText(['Flat Ø3.175', 'Flat Ø6', 'Flat Ø12', 'V60 Ø6', 'V90 Ø12', 'Engraving 30° tip 0.2 Ø3.175']);
  await expect(g.locator('[data-freze="stare"]')).toContainText('Only in this browser');
  await g.locator('[data-freze="noua"]').click();
  await expect(g.getByRole('heading', { name: 'New bit', level: 3 })).toBeVisible();
});
