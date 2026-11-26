/**
 * Felia 11.3↑ (ADR 0210 §3): „Așază pe foi” și „Mută și așază la capăt”. Fereastra, din meniul foii și din meniul de clic
 * dreapta: ce se așază, distanța pornită de la freza profilului (Ø6 la dreptunghiul implicit), rezultatul înainte de Așază,
 * refuzul sub freză, colțul ales ținut minte, anularea într-un pas. Pe hârtie: 100 × 60 pe 300 × 200, marginea 10,
 * distanța 6: două pe rând (x 10 și 116), două rânduri (y 130 și 64), deci 7 = 4 + 3; din dreapta-jos, primul la x 190.
 */
import { test, expect, type Page } from '@playwright/test';
import { documentSalvat } from './ajutor-document.ts';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const lista = (page: Page) => page.getByTestId('lista-vectori');
const randuri = (page: Page) => lista(page).locator('button[data-instanta]');
const dialog = (page: Page) => page.getByTestId('dialog-asezare');
const dr = (x: number, y: number): string => `dreptunghi 100,00 × 60,00 la X ${x},00, Y ${y},00`;

async function clicDreapta(page: Page, x: number, y: number): Promise<void> {
  const la = await ecran(page, await vedere(page));
  const p = la(x, y);
  await page.mouse.click(p.x, p.y, { button: 'right' });
}

async function dinMeniulFoii(page: Page, foaie: string): Promise<void> {
  await lista(page).locator(`[data-foaie-meniu="${foaie}"]`).click();
  await lista(page).locator(`[data-meniu-foaie="${foaie}"] [data-meniu-foaie-articol="aseaza"]`).click();
  await expect(dialog(page)).toBeVisible();
}

test('„Așază pe foi” din meniul foii: toate de pe foaie, distanța de la freză, rezultatul, refuzul sub freză, Așază, colțul ținut minte', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  for (let k = 0; k < 7; k++) await adauga(page, 'dreptunghi');
  await expect(randuri(page)).toHaveCount(7);
  await dinMeniulFoii(page, 'f1');
  const d = dialog(page);
  // Ultimul dreptunghi adăugat e ales: implicit „piesele alese”; aici, toate de pe foaie.
  await expect(d.locator('[data-aseaza="alese"]')).toBeChecked();
  await d.locator('[data-aseaza="toate"]').check();
  await expect(d.locator('[data-camp="aseaza-margineX"]')).toHaveValue('10');
  await expect(d.locator('[data-camp="aseaza-distantaX"]')).toHaveValue('6');
  await expect(page.getByTestId('aseaza-minim')).toHaveText('cel puțin 6 mm: freza Ø6 a profilului exterior');
  await expect(page.getByTestId('aseaza-rezultat')).toHaveText('7 piese pe 2 foi: 4 + 3. Una e o foaie nouă.');
  // Sub freză: refuzul, cu motivul, iar Așază e oprit.
  await d.locator('[data-camp="aseaza-distantaX"]').fill('5');
  await expect(page.getByTestId('aseaza-rezultat')).toHaveText('Distanța dintre piese e sub freza profilului exterior: tăietura unei piese ar intra în vecina ei.');
  await expect(d.locator('[data-buton="aseaza"]')).toBeDisabled();
  await d.locator('[data-camp="aseaza-distantaX"]').fill('6');
  await d.locator('[data-buton="aseaza"]').click();
  await expect(d).toHaveCount(0);
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  await expect(randuri(page)).toHaveText([dr(10, 130), dr(116, 130), dr(10, 64), dr(116, 64)]);
  await page.locator('body').press('PageDown');
  await expect(randuri(page)).toHaveText([dr(10, 130), dr(116, 130), dr(10, 64)]);
  await page.locator('body').press('PageUp');
  await page.locator('body').press('Control+z');
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(1);
  await expect(randuri(page)).toHaveText(Array.from({ length: 7 }, () => dr(20, 20)));
  // Din dreapta-jos, cu trei piese: primul la x = 300 − 10 − 100 = 190; colțul se ține minte.
  await dinMeniulFoii(page, 'f1');
  await d.locator('[data-camp="aseaza-colt"]').selectOption('dreapta-jos');
  await d.locator('[data-buton="aseaza"]').click();
  await expect(randuri(page).first()).toHaveText(dr(190, 10));
  await page.locator('body').press('Control+z');
  await dinMeniulFoii(page, 'f1');
  await expect(d.locator('[data-camp="aseaza-colt"]')).toHaveValue('dreapta-jos');
  await d.press('Escape');
  await expect(d).toHaveCount(0);
  expect(erori).toEqual([]);
});

test('meniul de clic dreapta: „Așază pe foi…” cu piesa aleasă; „Mută și așază la capăt pe Foaia 2”, după piesa ei', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await adauga(page, 'dreptunghi');
  await page.locator('body').press('PageUp');
  await clicDreapta(page, 50, 50);
  const meniu = page.getByTestId('meniu-context');
  await expect(meniu.locator('[data-meniu="aseaza"]')).toHaveText('Așază pe foi…');
  await expect(meniu.locator('[data-meniu="muta-si-aseaza-noua"]')).toHaveText('Mută și așază pe o foaie nouă');
  await meniu.locator('[data-meniu="aseaza"]').click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).locator('[data-aseaza="alese"]')).toBeChecked();
  await expect(page.getByTestId('aseaza-rezultat')).toHaveText('o piesă pe o foaie.');
  await dialog(page).locator('[data-buton="renunta"]').click();
  await expect(dialog(page)).toHaveCount(0);
  // Pe Foaia 2 stă dreptunghiul ei, jos (20, 20): rândul de sus e liber.
  await clicDreapta(page, 50, 50);
  await meniu.locator('[data-meniu="muta-si-aseaza-f2"]').click();
  await expect(randuri(page)).toHaveCount(0);
  await page.locator('body').press('PageDown');
  await expect(randuri(page)).toHaveText([dr(20, 20), dr(10, 130)]);
});

/** Scrie direct în baza aplicației o versiune a proiectului (după ce aplicația și-a creat baza), ca s-o deschidă la reîncărcare. */
async function scrieVersiune(page: Page, doc: { rev: number }): Promise<void> {
  await expect(lista(page)).toBeVisible();
  await page.evaluate(async (d) => {
    const db = await new Promise<IDBDatabase>((ok, eroare) => {
      const r = indexedDB.open('cncvs2-proiecte', 1);
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    await new Promise<void>((ok, eroare) => {
      const tx = db.transaction('versiuni', 'readwrite');
      tx.objectStore('versiuni').put(JSON.stringify(d), ['proiect', d.rev]);
      tx.oncomplete = () => { ok(); };
      tx.onerror = () => { eroare(tx.error); };
    });
    db.close();
  }, doc);
}

/**
 * Felia 11.3↑b: trei plăcuțe 100 × 60 ale aceleiași piese, tăiate prin foaia de 18 cu Ø3,175 pe dinafară (freza plăcii 11),
 * cu două urechi. Pe hârtie: distanța propusă 2 × 3,175 + 3 = 9,35 → 10; din stânga-sus, 10 și 10 + 100 + 10 = 120 pe
 * primul rând (230 + 100 > 290), apoi 130 − 10 − 60 = 60. Un proiect v10, deschis prin migrare.
 */
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const CU_URECHI = {
  schema: 10, rev: 1,
  piese: [{
    id: 'p',
    radacina: { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: I },
    operatii: [{
      id: 'o1', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 3.175 }, latura: 'exterior', sens: 'urcare',
      adancime: 18, pas: 6, urechi: { numar: 2, latime: 6, grosime: 2 }, rampa: null, intrari: null, colturi: null,
    }],
  }],
  foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: ['e1', 'e2', 'e3'].map((id) => ({ id, piesa: 'p', x: 20, y: 20, rotire: 0 })) }],
};

test('cu urechi (felia 11.3↑b): distanța pornește de la 10 (2 × 3,175 + 3, în sus), sub ea avertismentul, sub freză refuzul; Așază la 10', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  await scrieVersiune(page, CU_URECHI);
  await page.reload();
  await expect(randuri(page)).toHaveCount(3);
  await dinMeniulFoii(page, 'f1');
  const d = dialog(page);
  await expect(d.locator('[data-aseaza="toate"]')).toBeChecked();
  const distanta = d.locator('[data-camp="aseaza-distantaX"]');
  const urechi = page.getByTestId('aseaza-urechi');
  await expect(distanta).toHaveValue('10');
  await expect(page.getByTestId('aseaza-minim')).toHaveText('cel puțin 3,175 mm: freza Ø3,175 a profilului exterior');
  await expect(urechi).toHaveText('cu urechi, 10 mm: între tăieturile vecine rămâne lemnul de care se țin urechile');
  await expect(urechi).not.toHaveClass(/avertisment/);
  await expect(page.getByTestId('aseaza-rezultat')).toHaveText('3 piese pe o foaie.');
  // Sub propunere, dar peste freză: avertismentul, iar Așază rămâne pornit.
  await distanta.fill('5');
  await expect(urechi).toHaveText('Sub 10 mm, tăieturile pieselor vecine se unesc: urechile dinspre vecini nu mai țin, iar piesele din mijloc pot cădea sub freză.');
  await expect(urechi).toHaveClass(/avertisment/);
  await expect(d.locator('[data-buton="aseaza"]')).toBeEnabled();
  // Sub freză: refuzul, ca înainte.
  await distanta.fill('3');
  await expect(page.getByTestId('aseaza-rezultat')).toHaveText('Distanța dintre piese e sub freza profilului exterior: tăietura unei piese ar intra în vecina ei.');
  await expect(d.locator('[data-buton="aseaza"]')).toBeDisabled();
  await distanta.fill('10');
  await expect(urechi).not.toHaveClass(/avertisment/);
  await d.locator('[data-buton="aseaza"]').click();
  await expect(d).toHaveCount(0);
  const doc = JSON.parse(await documentSalvat(page, 2)) as { foi: Array<{ instante: Array<{ x: number; y: number }> }> };
  expect(doc.foi.map((f) => f.instante.map((i) => [i.x, i.y]))).toEqual([[[10, 130], [120, 130], [10, 60]]]);
  expect(erori).toEqual([]);
});
