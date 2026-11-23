/**
 * Felia 11.3↑e (ADR 0211, varianta b): urechile „unde ține”. Aceleași trei dreptunghiuri 100 × 60 ca la 11.3↑c și 11.3↑d
 * (`export-urechi.spec.ts`, `urechi-alese.spec.ts`), la 9 mm unul de altul, tăiate cu Ø6: cu două urechi la distanțe egale
 * (sus și jos), cel din mijloc se desprinde. Lângă avertisment, „Pune urechile unde țin” trece rândul pe „unde ține”; la
 * exportul următor, fiecare copie își are urechile unde ține lemnul: pe hârtie, sus și jos tăieturile vecine se unesc
 * (9 < 2 × 6), deci pe cel din mijloc urechile ajung pe laturile scurte (palierele la X 17 și X 123, la Z −16), iar nicio
 * piesă nu se mai desprinde. Cu „Arată traseul”, urechile puse de lucrare se văd pe drum: două pe fiecare copie.
 */
import { test, expect, type Page } from '@playwright/test';

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

test('„Pune urechile unde țin” din avertisment, exportul fără piese desprinse, urechile puse pe traseu', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  await scrieVersiune(page, STRANSE);
  await page.reload();
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta]')).toHaveCount(3);
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-urechi="p/o1"]');
  await expect(rand.locator('[data-camp="urechi-egale"]')).toBeChecked();

  // La distanțe egale, cel din mijloc se desprinde: avertismentul și, lângă el, butonul.
  let d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await d;
  await expect(page.getByTestId('export-avertismente')).toContainText('se desprinde');
  const buton = page.locator('[data-buton="unde-tine"]');
  await expect(buton).toHaveText('Pune urechile unde țin');
  await buton.click();
  await expect(rand.locator('[data-camp="urechi-lemn"]')).toBeChecked();
  await expect(rand.locator('[data-nota="urechi-lemn"]')).toBeVisible();
  await expect(page.locator('[data-nota="unde-tine-puse"]')).toHaveText('O operație a trecut pe „unde ține”: exportă din nou.');
  await expect(buton).toHaveCount(0);

  // Exportul următor: nicio piesă desprinsă; pe cea din mijloc, palierele pe laturile scurte (X 20 − 3 și X 120 + 3, Z −16).
  d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const fisier = await d;
  await expect(page.getByTestId('export-rezumat')).toBeVisible();
  await expect(page.getByText('se desprinde', { exact: false })).toHaveCount(0);
  await expect(page.locator('[data-nota="unde-tine-puse"]')).toHaveCount(0);
  const program = await (await fisier.createReadStream()).toArray().then((b) => Buffer.concat(b).toString('utf8'));
  for (const x of ['17', '123']) {
    const y = [...program.matchAll(new RegExp(`X${x}(?:\\.0+)? Y(\\d+(?:\\.\\d+)?) Z-16`, 'g'))].map((m) => Number(m[1]));
    expect(y.some((v) => v > 89 && v < 149), `palierul de la X ${x}, pe cel din mijloc`).toBe(true);
  }

  // Cu „Arată traseul”, câte două urechi „unde ține” pe fiecare copie, desenate pe drum.
  await page.getByRole('button', { name: 'Închide' }).click();
  await expect(page.locator('[aria-labelledby="export-titlu"]')).toHaveCount(0);
  await page.locator('[data-actiune="vedere.traseu"]').click();
  await expect(page.getByTestId('semne-urechi').locator('circle.ureche-lemn')).toHaveCount(6);
  // Fereastra redeschisă își ia locurile din document: „unde ține”.
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(rand.locator('[data-camp="urechi-lemn"]')).toBeChecked();
  expect(erori).toEqual([]);
});
