/**
 * Felia 11.3↑f (ADR 0211, varianta c): urechile după reguli, pe laturi. Aceleași trei dreptunghiuri 100 × 60 ca la 11.3↑c–e
 * (`export-urechi.spec.ts`, `urechi-alese.spec.ts`, `urechi-lemn.spec.ts`), la 9 mm unul de altul pe verticală, tăiate cu Ø6:
 * cu două urechi la distanțe egale, cel din mijloc se desprinde (tăieturile vecine se unesc: 9 < 2 × 6).
 *
 * Pe hârtie, cu „pe laturile scurte” urechile stau la mijlocul laturilor din stânga și din dreapta, spre lemnul foii: pe fiecare
 * copie, palierele pornesc la X 20 − 3 = 17 și X 120 + 3 = 123 (Z −16), iar nicio piesă nu se mai desprinde. Cu „la mijlocul
 * laturilor”, patru pe fiecare copie (numărul se oprește): și pe laturile lungi, la X 70 ± 3, unde urechile copiilor vecine cad
 * față în față. Fereastra redeschisă arată regula scrisă în document, panoul o spune, raportul foilor la fel, iar cu „Arată
 * traseul” urechile se văd pe drum: câte patru pe fiecare copie.
 */
import { test, expect, type Download, type Page } from '@playwright/test';

test.use({ locale: 'ro-RO', viewport: { width: 1400, height: 950 } });

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
const Y = [20, 89, 158];
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
  foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 250, grosime: 18 }, instante: Y.map((y, k) => ({ id: `e${k + 1}`, piesa: 'p', x: 20, y, rotire: 0 })) }],
};

const text = async (d: Download): Promise<string> => (await d.createReadStream()).toArray().then((b) => Buffer.concat(b).toString('utf8'));

/** Y-urile (sau X-urile) la care pornește un palier (Z −16) pe dreapta x = `la` (sau y = `la`), din programul scris. */
function porniriPalier(program: string, axa: 'X' | 'Y', la: number): number[] {
  const tipar = axa === 'X' ? new RegExp(`X${la}(?:\\.0+)? Y(\\d+(?:\\.\\d+)?) Z-16`, 'g') : new RegExp(`X(\\d+(?:\\.\\d+)?) Y${la}(?:\\.0+)? Z-16`, 'g');
  return [...program.matchAll(tipar)].map((m) => Number(m[1]));
}

test('regulile urechilor: „pe laturile scurte” ține toate copiile; „la mijlocul laturilor” pune patru; fereastra, panoul, raportul și traseul', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  await scrieVersiune(page, STRANSE);
  await page.reload();
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta]')).toHaveCount(3);
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-urechi="p/o1"]');
  await expect(rand.locator('[data-camp="urechi-egale"]')).toBeChecked();

  // La distanțe egale, cel din mijloc se desprinde (martorul).
  let d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await d;
  await expect(page.getByTestId('export-avertismente')).toContainText('se desprinde');

  // „Pe laturile scurte”: nota regulii, numărul rămâne de scris; la export, nicio piesă desprinsă.
  await rand.locator('[data-camp="urechi-scurte"]').check();
  await expect(rand.locator('[data-nota="urechi-laturi"]')).toBeVisible();
  await expect(rand.locator('[data-camp="urechi-numar"]')).toBeEnabled();
  d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  let program = await text(await d);
  await expect(page.getByTestId('export-rezumat')).toBeVisible();
  await expect(page.getByText('se desprinde', { exact: false })).toHaveCount(0);
  // Pe fiecare copie, palierele laturilor scurte: la X 17 și X 123, în dreptul mijlocului ei (y + 30 ± 3).
  for (const x of [17, 123]) {
    const ys = porniriPalier(program, 'X', x);
    for (const y of Y) expect(ys.some((v) => v >= y + 27 && v <= y + 33), `palierul de la X ${x}, pe copia de la Y ${y}: ${ys.join(', ')}`).toBe(true);
  }
  // Niciun palier pe laturile lungi (la Y = y − 3 sau y + 63).
  for (const y of Y) expect([...porniriPalier(program, 'Y', y - 3), ...porniriPalier(program, 'Y', y + 63)]).toEqual([]);

  // „La mijlocul laturilor”: numărul se oprește; patru urechi pe fiecare copie, și pe laturile lungi, la X 70 ± 3.
  await rand.locator('[data-camp="urechi-mijloc"]').check();
  await expect(rand.locator('[data-nota="urechi-mijloc"]')).toBeVisible();
  await expect(rand.locator('[data-nota="urechi-laturi"]')).toHaveCount(0);
  await expect(rand.locator('[data-camp="urechi-numar"]')).toBeDisabled();
  d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  program = await text(await d);
  await expect(page.getByTestId('export-rezumat')).toBeVisible();
  await expect(page.getByText('se desprinde', { exact: false })).toHaveCount(0);
  for (const y of Y) {
    for (const yy of [y - 3, y + 63]) {
      const xs = porniriPalier(program, 'Y', yy);
      expect(xs.some((v) => v >= 67 && v <= 73), `palierul de la Y ${yy}: ${xs.join(', ')}`).toBe(true);
    }
    for (const x of [17, 123]) expect(porniriPalier(program, 'X', x).some((v) => v >= y + 27 && v <= y + 33)).toBe(true);
  }

  // Raportul foilor (din fereastra exportului, care se închide) spune regula, fără număr.
  await page.locator('[data-buton="raport"]').click();
  await expect(page.locator('#export-titlu')).toHaveCount(0);
  await expect(page.getByTestId('dialog-raport').locator('[data-raport="operatii"]')).toContainText('urechi la mijlocul laturilor');
  await page.getByTestId('dialog-raport').locator('[data-raport="inchide"]').click();
  await expect(page.getByTestId('dialog-raport')).toHaveCount(0);

  // Cu „Arată traseul”, urechile puse după regulă se văd pe drum: patru pe fiecare copie.
  await page.locator('[data-actiune="vedere.traseu"]').click();
  await expect(page.getByTestId('semne-urechi').locator('circle.ureche-lemn')).toHaveCount(12);
  // Panoul spune regula scrisă în document.
  await page.getByTestId('lista-vectori').locator('button[data-instanta]').first().click();
  await expect(page.locator('.prop-operatie').first()).toContainText('la mijlocul laturilor: 6.00 mm, puntea 2.00 mm');
  // Fereastra redeschisă își ia locurile din document; înapoi la „pe laturile lungi”, numărul se poate scrie din nou.
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(rand.locator('[data-camp="urechi-mijloc"]')).toBeChecked();
  await rand.locator('[data-camp="urechi-lungi"]').check();
  await expect(rand.locator('[data-camp="urechi-numar"]')).toBeEnabled();
  await expect(rand.locator('[data-nota="urechi-laturi"]')).toBeVisible();
  d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  program = await text(await d);
  // Două, pe laturile lungi: urechile copiilor vecine cad față în față, la X 70 ± 3, și se țin una de alta.
  await expect(page.getByText('se desprinde', { exact: false })).toHaveCount(0);
  for (const y of Y) {
    for (const yy of [y - 3, y + 63]) expect(porniriPalier(program, 'Y', yy).some((v) => v >= 67 && v <= 73), `palierul de la Y ${yy}`).toBe(true);
  }
  for (const x of [17, 123]) expect(porniriPalier(program, 'X', x)).toEqual([]);
  expect(erori).toEqual([]);
});
