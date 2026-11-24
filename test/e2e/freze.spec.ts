/**
 * Fereastra „Frezele mele” (ADR 0300 §3, felia 16.A↑a), în Edge: rândul din meniul contului și acțiunea din paletă (și peste
 * fereastra Mașina), frezele standard puse singure (16.A↑a-2), biblioteca goală cu „Adaugă frezele standard”, editorul (numele propus, refuzurile pe câmp, salvarea, plecarea
 * cu schimbări), păstrarea la reîncărcare (IndexedDB), ștergerea cu întrebarea, fișierul (exportul și importul JSON / CSV cu
 * numele care se repetă), două file la zi una cu alta, telefonul (390, 360, 320 px) cu fontul lat, F1 și engleza. Din 16.A↑h-1
 * (ADR 0302 §3): fereastra pornește ca listă, cu fișa frezei alese doar de citit; editorul („configuratorul”) se deschide la
 * „Editează” și la „Freză nouă”, iar comutatorul „Listă / Configurator” (ținut în browser) îl poate ține mereu deschis.
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
  await f.locator('[data-freze="grup-redenumeste"]').click();
  await nou.fill('x'.repeat(41));
  await nou.press('Enter');
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Cel mult 40 de caractere.');
  await nou.fill('Esență tare');
  await nou.press('Enter');
  await expect(titluri(f)).toHaveText(['Esență tare (2)', 'Plate (2)', 'În V (1)', 'Gravare (1)']);
  // După reîncărcare, grupul e tot acolo.
  await page.reload();
  const g = await deschideFrezele(page);
  await expect(titluri(g)).toHaveText(['Esență tare (2)', 'Plate (2)', 'În V (1)', 'Gravare (1)']);
  // În editor, câmpul „Grupul”: golit, freza se întoarce pe felul ei.
  await editeaza(g, 'V90 Ø12');
  await expect(camp(g, 'grup')).toHaveValue('Esență tare');
  await camp(g, 'grup').fill('');
  await g.locator('[data-freze="salveaza"]').click();
  await expect(grupul(g)).toHaveText('Fără grup (pe fel)');
  await expect(titluri(g)).toHaveText(['Esență tare (1)', 'Plate (2)', 'În V (2)', 'Gravare (1)']);
  // Redenumit gol: grupul se desface, iar frezele lui se întorc pe felurile lor.
  await g.locator('[data-freze="grup-redenumeste"]').click();
  await g.locator('[data-freze="grup-nume-nou"]').fill('');
  await g.locator('[data-freze="grup-redenumeste-da"]').click();
  await expect(titluri(g)).toHaveText(['Plate (3)', 'În V (2)', 'Gravare (1)']);
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
  await writeFile(csv, 'nume;fel;diametru;avans\nPlată Ø6;plata;6;1500\nPlată Ø8;plata;8;\nRea;bila;6;\n');
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
