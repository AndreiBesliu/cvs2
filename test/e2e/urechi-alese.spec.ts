/**
 * Felia 11.3↑d (ADR 0211, varianta a): urechile la locuri alese, cu mausul. Aceleași trei dreptunghiuri 100 × 60 ca la 11.3↑c
 * (`export-urechi.spec.ts`), la 9 mm unul de altul, tăiate cu Ø6: cu două urechi la distanțe egale (sus și jos), cel din
 * mijloc se desprinde. Pe desen, urechile trec pe laturile scurte, spre marginile foii: în fereastra exportului, „Locurile:
 * alese pe desen”, apoi „Alege pe desen…”: pânza intră în modul urechilor (fereastra stă ascunsă), un clic pe contur pune o
 * ureche pe toate copiile, un clic pe ea o scoate, trasă se mută, una prea aproape de alta nu se pune; „Renunță” lasă totul
 * cum era, „Gata” scrie locurile și aduce fereastra înapoi, cu tot ce era scris în ea. Exportul nu mai are piese desprinse.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

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

/** Cutia de pe ecran a conturului unei copii (în mod, conturul operației e desenat pe fiecare). */
async function cutie(contur: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const b = await contur.boundingBox();
  if (!b) throw new Error('conturul nu se vede');
  return b;
}

test('urechile alese pe desen: pune, scoate, mută, refuză aproape, Renunță, Gata; exportul nu mai are piese desprinse', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  await scrieVersiune(page, STRANSE);
  await page.reload();
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta]')).toHaveCount(3);
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-urechi="p/o1"]');
  // Lungimea scrisă în fereastră (8) trebuie să rămână după mod: fereastra stă ascunsă, nu se închide.
  await rand.locator('[data-camp="urechi-latime"]').fill('8');
  await rand.locator('[data-camp="urechi-alese"]').check();
  await expect(rand.locator('[data-camp="urechi-numar"]')).toBeDisabled();
  await expect(rand.locator('[data-nota="urechi-alese"]')).toHaveText('0 urechi alese');

  // „Renunță”: ce s-a pus nu rămâne.
  await rand.locator('[data-buton="urechi-alege"]').click();
  const mod = page.getByTestId('mod-urechi');
  await expect(mod.getByRole('toolbar')).toBeVisible();
  await expect(page.locator('[aria-labelledby="export-titlu"]')).toBeHidden();
  const contururi = mod.locator('path.urechi-contur');
  await expect(contururi).toHaveCount(3);
  let b = await cutie(contururi.first());
  await page.mouse.click(b.x + 1, b.y + b.height / 2);
  await expect(mod.locator('circle.ureche-aleasa')).toHaveCount(3);
  await mod.locator('[data-buton="urechi-renunta"]').click();
  await expect(mod).toHaveCount(0);
  await expect(rand.locator('[data-nota="urechi-alese"]')).toHaveText('0 urechi alese');
  await expect(rand.locator('[data-camp="urechi-latime"]')).toHaveValue('8');

  // Din nou: pune pe laturile scurte (pe o copie: apar pe toate trei). Cutia conturului desenat cuprinde și linia lui
  // groasă, deci clicurile de punere cad lângă contur (în prinderea lui), iar locurile urechilor se iau din cercuri.
  await rand.locator('[data-buton="urechi-alege"]').click();
  await expect(mod.getByRole('toolbar')).toBeVisible();
  b = await cutie(contururi.first());
  const mijloc = b.y + b.height / 2;
  await page.mouse.click(b.x + 1, mijloc);
  await page.mouse.click(b.x + b.width - 1, mijloc);
  const cercuri = mod.locator('circle.ureche-aleasa');
  await expect(cercuri).toHaveCount(6);
  await expect(mod.getByTestId('urechi-numar')).toHaveText('2 urechi');
  // Primele două cercuri sunt ale primei copii: stânga, apoi dreapta; între ele, 100 mm.
  const centru = async (k: number): Promise<{ x: number; y: number }> => {
    const c = await cutie(cercuri.nth(k));
    return { x: c.x + c.width / 2, y: c.y + c.height / 2 };
  };
  const st = await centru(0), dr = await centru(1);
  const mmPx = (dr.x - st.x) / 100;
  expect(Math.abs(dr.y - st.y)).toBeLessThan(0.5);
  // La 4 mm de urechea din stânga (sub 8 / 0,9 = 8,89): nu se pune, iar banda spune de ce.
  await page.mouse.click(st.x, st.y - 4 * mmPx);
  await expect(cercuri).toHaveCount(6);
  await expect(mod.getByTestId('urechi-motiv')).toHaveText('Prea aproape de altă ureche: între centre, cel puțin 8,89 mm.');
  // Un clic pe urechea din dreapta o scoate; alta pusă la loc.
  await page.mouse.click(dr.x, dr.y);
  await expect(cercuri).toHaveCount(3);
  await page.mouse.click(b.x + b.width - 1, mijloc);
  await expect(cercuri).toHaveCount(6);
  // Trasă, urechea din stânga alunecă pe latura ei cu 10 mm (în sus pe ecran), oricât de departe ar fi mausul de contur.
  await page.mouse.move(st.x, st.y);
  await page.mouse.down();
  await page.mouse.move(st.x - 20, st.y - 5 * mmPx, { steps: 4 });
  await page.mouse.move(st.x - 20, st.y - 10 * mmPx, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => (await centru(0)).y).toBeLessThan(st.y - 9.5 * mmPx);
  expect(Math.abs((await centru(0)).x - st.x)).toBeLessThan(0.5);
  await expect(cercuri).toHaveCount(6);
  // Înapoi la mijloc, apoi Gata: fereastra revine, cu lungimea ei și cu cele două urechi alese.
  const sus = await centru(0);
  await page.mouse.move(sus.x, sus.y);
  await page.mouse.down();
  await page.mouse.move(st.x - 20, st.y, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => Math.abs((await centru(0)).y - st.y)).toBeLessThan(0.5);
  await mod.locator('[data-buton="urechi-gata"]').click();
  await expect(mod).toHaveCount(0);
  await expect(page.locator('[aria-labelledby="export-titlu"]')).toBeVisible();
  await expect(rand.locator('[data-nota="urechi-alese"]')).toHaveText('2 urechi alese');
  await expect(rand.locator('[data-camp="urechi-latime"]')).toHaveValue('8');
  await expect(rand.locator('[data-camp="urechi-alese"]')).toBeChecked();

  // Exportul: urechile țin de lemnul dinspre marginile foii, deci nicio piesă nu se desprinde.
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const fisier = await d;
  await expect(page.getByTestId('export-rezumat')).toBeVisible();
  await expect(page.getByText('se desprinde', { exact: false })).toHaveCount(0);
  // Palierul urechii din stânga a primei copii: X 20 − 3 = 17, la Z −16 (18 − 2).
  const program = await (await fisier.createReadStream()).toArray().then((b) => Buffer.concat(b).toString('utf8'));
  expect(program).toMatch(/X17(\.0+)? Y\d+(\.\d+)? Z-16/);
  expect(erori).toEqual([]);
});
