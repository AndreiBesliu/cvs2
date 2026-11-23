/**
 * Fereastra „Frezele mele” (ADR 0300 §3, felia 16.A↑a), în Edge: rândul din meniul contului și acțiunea din paletă (și peste
 * fereastra Mașina), biblioteca goală cu frezele de pornire, editorul (numele propus, refuzurile pe câmp, salvarea, plecarea
 * cu schimbări), păstrarea la reîncărcare (IndexedDB), ștergerea cu întrebarea, fișierul (exportul și importul JSON / CSV cu
 * numele care se repetă), două file la zi una cu alta, telefonul (390, 360, 320 px) cu fontul lat, F1 și engleza.
 */
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { deschideMeniulContului } from './ajutor-panza.ts';

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

test('meniul contului: „Frezele mele…” înaintea manualului; goală, frezele de pornire; grupele, starea, F1', async ({ page }) => {
  await page.goto('/');
  const meniu = await deschideMeniulContului(page);
  const rand = meniu.locator('[data-meniu-cont="freze"] + [data-meniu-cont="manual"]');
  await expect(rand).toHaveCount(1);
  await expect(meniu.locator('[data-meniu-cont="freze"] span').first()).toHaveText('Frezele mele…');
  await meniu.locator('[data-meniu-cont="freze"]').click();
  const f = page.getByRole('dialog', { name: TITLU });
  await expect(f).toBeVisible();
  await expect(f.locator('[data-freze="cauta"]')).toBeFocused();
  await expect(f).toContainText('Biblioteca e goală.');
  await expect(f.locator('[data-freze="exporta"]')).toBeDisabled();
  await pornire(f);
  await expect(nume(f)).toHaveText(['Plată Ø3,175', 'Plată Ø6', 'Plată Ø12', 'V60 Ø6', 'V90 Ø12', 'Gravare 30° vârf 0,2 Ø3,175']);
  await expect(f.getByRole('heading', { name: 'Plate (3)' })).toBeVisible();
  await expect(f.getByRole('heading', { name: 'În V (2)' })).toBeVisible();
  await expect(f.getByRole('heading', { name: 'Gravare (1)' })).toBeVisible();
  await expect(f.locator('[data-freze="stare"]')).toContainText('Doar în acest browser');
  await expect(f.locator('[data-freze="stare"]')).toContainText('6 freze');
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Adăugate: 6 · înlocuite: 0 · sărite: 0');
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

test('freză nouă: numele propus, refuzurile pe câmp, salvarea; rămâne după reîncărcare; schimbarea și plecarea cu schimbări', async ({ page }) => {
  await page.goto('/');
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
  await expect(f.getByRole('heading', { name: 'V60 Ø8', level: 3 })).toBeVisible();
  await expect(f.locator('[data-freze="salveaza"]')).toBeDisabled();
  // După reîncărcare, freza e tot acolo (IndexedDB).
  await page.reload();
  const g = await deschideFrezele(page);
  await expect(nume(g)).toHaveText(['V60 Ø8']);
  await g.locator('[data-freza]').click();
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
  await pornire(f);
  await f.locator('[data-freza]').filter({ hasText: 'Plată Ø6' }).click();
  await f.locator('[data-freze="duplica"]').click();
  await expect(nume(f)).toContainText(['Plată Ø6 copie']);
  await expect(f.getByRole('heading', { name: 'Plată Ø6 copie', level: 3 })).toBeVisible();
  await f.locator('[data-freze="sterge"]').click();
  await expect(f).toContainText('Ștergi „Plată Ø6 copie”? Proiectele care o folosesc își păstrează copia.');
  await page.keyboard.press('Escape');
  await expect(f).toBeVisible();
  await expect(f.locator('[data-freze="sterge-da"]')).toHaveCount(0);
  await f.locator('[data-freze="sterge"]').click();
  await f.locator('[data-freze="sterge-da"]').click();
  await expect(nume(f)).toHaveCount(6);
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
  test(`pe telefon (${latime} px), cu fontul lat: lista, apoi editorul pe tot ecranul, fără derulare pe orizontală`, async ({ page }) => {
    await page.setViewportSize({ width: latime, height: 780 });
    await page.goto('/');
    await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
    const f = await deschideFrezele(page);
    await pornire(f);
    await faraDepasire(page);
    await expect(f.locator('.freze-editor')).toBeHidden();
    await f.locator('[data-freza]').filter({ hasText: 'Gravare' }).click();
    await expect(f.locator('.freze-lista')).toBeHidden();
    await expect(camp(f, 'varf')).toBeVisible();
    await faraDepasire(page);
    await f.locator('[data-freze="inapoi"]').click();
    await expect(f.locator('.freze-lista')).toBeVisible();
    await faraDepasire(page);
  });
}

test('la 1280 px, cu fontul lat: fereastra încape, fără derulare pe orizontală', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
  const f = await deschideFrezele(page);
  await pornire(f);
  await f.locator('[data-freza]').filter({ hasText: 'Gravare' }).click();
  await expect(f.locator('.freze-lista')).toBeVisible();
  await expect(camp(f, 'varf')).toBeVisible();
  await faraDepasire(page);
});

test('din paletă, peste fereastra Mașina: fereastra se deschide, iar Mașina rămâne dedesubt; în engleză', async ({ page }) => {
  await page.goto('/');
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
