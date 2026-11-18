/**
 * Felia 11.3↑c (ADR 0210, varianta b): proba urechilor la export. Trei dreptunghiuri 100 × 60 ale aceleiași piese, unul
 * peste altul la x = 20, cu 9 mm între ele (y = 20, 89, 158), pe o foaie de 300 × 250 × 18, tăiate prin foaie pe dinafară
 * cu Ø6 și două urechi (sus și jos). Pe hârtie: 9 < 2 × 6, deci tăieturile vecine se unesc; cel din mijloc are vecini și
 * deasupra, și dedesubt, deci urechile lui nu mai țin de nimic: se desprinde (mijlocul lui, X 70, Y 119). Cele de la capete
 * țin de lemnul dinspre marginea foii. Exportul o spune. Apoi «Așază pe foi» pornește de la distanța propusă, 2 × 6 + 3 =
 * 15 (felia 11.3↑b): după ea, exportul nu mai are avertismentul.
 */
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'ro-RO' });

async function scrieVersiune(page: Page, doc: { rev: number }): Promise<void> {
  await expect(page.getByTestId('lista-vectori')).toBeVisible();
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

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
/** Un proiect v10 (deschis prin migrare): piesa cu urechi, pusă de trei ori. */
const STRANSE = {
  schema: 10, rev: 1,
  piese: [{
    id: 'p',
    radacina: { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: I },
    operatii: [{
      id: 'o1', tip: 'profil', noduri: ['r'], scula: { numar: 1, nume: 'freza plata', diametru: 6 }, latura: 'exterior', sens: 'urcare',
      adancime: 18, pas: 6, urechi: { numar: 2, latime: 6, grosime: 2 }, rampa: null, intrari: null, colturi: null,
    }],
  }],
  foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 250, grosime: 18 }, instante: [20, 89, 158].map((y, k) => ({ id: `e${k + 1}`, piesa: 'p', x: 20, y, rotire: 0 })) }],
};

const AVERTISMENT = 'Atenție: o piesă se desprinde de foaie cât freza încă taie lângă ea, fiindcă urechile ei nu mai țin de lemnul foii: '
  + 'lângă X 70, Y 119. De obicei, piesele sunt prea aproape: cu urechi, lasă între ele cel puțin 2 × freza + 3 mm.';

async function exporta(page: Page): Promise<void> {
  await page.locator('[data-actiune="export.gcode"]').click();
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await d;
}

test('proba urechilor la export: piesa din mijloc se desprinde și exportul o spune; după «Așază pe foi» la 15 mm, nu mai e nimic de spus', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  await scrieVersiune(page, STRANSE);
  await page.reload();
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta]')).toHaveCount(3);
  await exporta(page);
  const avertismente = page.getByTestId('export-avertismente').locator('li');
  await expect(avertismente.filter({ hasText: 'se desprinde' })).toHaveText([AVERTISMENT]);
  await page.getByRole('button', { name: 'Închide', exact: true }).click();
  // «Așază pe foi» din meniul foii: distanța pornește de la 15; Așază.
  const lista = page.getByTestId('lista-vectori');
  await lista.locator('[data-foaie-meniu="f1"]').click();
  await lista.locator('[data-meniu-foaie="f1"] [data-meniu-foaie-articol="aseaza"]').click();
  const dialog = page.getByTestId('dialog-asezare');
  await expect(dialog.locator('[data-camp="aseaza-distantaX"]')).toHaveValue('15');
  await dialog.locator('[data-buton="aseaza"]').click();
  await expect(dialog).toHaveCount(0);
  await exporta(page);
  // Exportul s-a încheiat (rezumatul vine odată cu avertismentele): niciunul despre piese desprinse.
  await expect(page.getByTestId('export-rezumat')).toBeVisible();
  await expect(page.getByText('se desprinde', { exact: false })).toHaveCount(0);
  expect(erori).toEqual([]);
});
