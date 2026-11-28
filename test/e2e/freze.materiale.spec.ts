/**
 * Valorile frezei pe material în „Frezele mele” (ADR 0305 §1, felia 16.A↑g-1), în Edge: grupul „Valorile pe material” din
 * editor, cu seturile (materialul și cele cinci valori de lucru), un set nou pornit de la valorile frezei, scos cu „✕”,
 * cel mult 16; greșelile pe setul și câmpul lor (materialul dublat după cuvinte, o valoare în afara marginilor); fișa doar de
 * citit, cu tabelul seturilor, și după reîncărcare; la 1280 px și pe telefon, cu fontul lat, fără derulare pe orizontală.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { deschideMeniulContului } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

/** „Frezele mele”, deschisă din meniul contului, cu cele `n` freze ale bibliotecii încărcate (6: cele standard). */
async function deschideFrezele(page: Page, n = 6): Promise<Locator> {
  const meniu = await deschideMeniulContului(page);
  await meniu.locator('[data-meniu-cont="freze"]').click();
  const f = page.getByRole('dialog', { name: 'Frezele mele' });
  await expect(f).toBeVisible();
  await expect(f.locator('.freze-rand-nume')).toHaveCount(n);
  return f;
}

const camp = (f: Locator, c: string): Locator => f.locator(`[data-freze-camp="${c}"]`);
const set = (f: Locator, i: number): Locator => f.locator(`[data-freze-set="${i}"]`);
const campSet = (f: Locator, i: number, c: string): Locator => set(f, i).locator(`[data-freze-set-camp="${c}"]`);
const fisa = (f: Locator): Locator => f.locator('[data-freze="fisa"]');

async function faraDepasire(page: Page): Promise<void> {
  const [pagina, latime, cutie] = await page.evaluate(() => {
    const c = document.querySelector('.dialog-freze');
    return [document.documentElement.scrollWidth, window.innerWidth, c ? c.scrollWidth - c.clientWidth : -1];
  });
  expect(pagina).toBeLessThanOrEqual(latime);
  expect(cutie).toBe(0);
}

test('seturile pe material: un set nou pornește de la valorile frezei; greșelile pe set și câmp; salvate, în fișă și după reîncărcare', async ({ page }) => {
  await page.goto('/');
  const f = await deschideFrezele(page);
  await f.locator('[data-freze="noua"]').click();
  const grup = f.locator('[data-freze="materiale"]');
  await expect(grup).toBeVisible();
  await expect(grup.locator('legend')).toHaveText('Valorile pe material');
  await expect(f.locator('[data-freze-set]')).toHaveCount(0);
  // Valorile frezei se schimbă înainte; setul nou le ia pe cele de acum.
  await camp(f, 'turatie').fill('17000');
  await f.locator('[data-freze="set-adauga"]').click();
  await expect(f.locator('[data-freze-set]')).toHaveCount(1);
  await expect(campSet(f, 0, 'material')).toBeFocused();
  await expect(campSet(f, 0, 'material')).toHaveValue('');
  await expect(campSet(f, 0, 'turatie')).toHaveValue('17000');
  await expect(campSet(f, 0, 'avans')).toHaveValue('1000');
  await expect(campSet(f, 0, 'plonjare')).toHaveValue('300');
  await expect(campSet(f, 0, 'pas')).toHaveValue('3');
  await expect(campSet(f, 0, 'pasLateral')).toHaveValue('40');
  // Fără material, greșeala se spune după scriere (sau la „Salvează”).
  await campSet(f, 0, 'material').fill('—');
  await expect(f.locator('#freze-eroare-materiale')).toHaveText('Setul 1: scrie materialul (cel puțin un cuvânt).');
  await expect(campSet(f, 0, 'material')).toHaveAttribute('aria-invalid', 'true');
  await campSet(f, 0, 'material').fill('MDF alb');
  await campSet(f, 0, 'turatie').fill('20000');
  await campSet(f, 0, 'avans').fill('2500');
  await expect(f.locator('#freze-eroare-materiale')).toHaveCount(0);
  // Al doilea set: același material, cu alte cuvinte în altă ordine, e dublat.
  await f.locator('[data-freze="set-adauga"]').click();
  await campSet(f, 1, 'material').fill('alb  mdf');
  await expect(f.locator('#freze-eroare-materiale')).toHaveText('Setul 2: există deja un set pentru același material (contează cuvintele, nu ordinea, majusculele sau diacriticele).');
  await campSet(f, 1, 'material').fill('Acril');
  await campSet(f, 1, 'pas').fill('0');
  await expect(f.locator('#freze-eroare-materiale')).toHaveText('Setul 2, pasul pe trecere: peste 0 și cel mult 1000.');
  await expect(campSet(f, 1, 'pas')).toHaveAttribute('aria-invalid', 'true');
  await campSet(f, 1, 'pas').fill('1');
  await campSet(f, 1, 'turatie').fill('16000,5');
  await expect(f.locator('#freze-eroare-materiale')).toHaveText('Setul 2, turația: un număr întreg.');
  await campSet(f, 1, 'turatie').fill('16000');
  await expect(f.locator('#freze-eroare-materiale')).toHaveCount(0);
  // Un al treilea, scos cu „✕”.
  await f.locator('[data-freze="set-adauga"]').click();
  await expect(f.locator('[data-freze-set]')).toHaveCount(3);
  await set(f, 2).locator('[data-freze="set-scoate"]').click();
  await expect(f.locator('[data-freze-set]')).toHaveCount(2);
  await camp(f, 'nume').fill('Plată Ø6 pe materiale');
  await f.locator('[data-freze="salveaza"]').click();
  // Fișa: tabelul seturilor, în ordinea lor.
  const tabel = fisa(f).locator('[data-freze="fisa-materiale"]');
  await expect(tabel).toBeVisible();
  await expect(tabel.locator('[data-freze-fisa-set]')).toHaveCount(2);
  await expect(tabel.locator('[data-freze-fisa-set="0"] td')).toHaveText(['MDF alb', '20000', '2500', '300', '3', '40']);
  await expect(tabel.locator('[data-freze-fisa-set="1"] td')).toHaveText(['Acril', '16000', '1000', '300', '1', '40']);
  // După reîncărcare, la fel; editate, seturile se schimbă.
  await page.reload();
  const g = await deschideFrezele(page, 7);
  await g.locator('.freze-rand-nume').getByText('Plată Ø6 pe materiale', { exact: true }).click();
  await expect(fisa(g).locator('[data-freze-fisa-set]')).toHaveCount(2);
  await fisa(g).locator('[data-freze="editeaza"]').click();
  await set(g, 0).locator('[data-freze="set-scoate"]').click();
  await g.locator('[data-freze="salveaza"]').click();
  await expect(fisa(g).locator('[data-freze-fisa-set]')).toHaveCount(1);
  await expect(fisa(g).locator('[data-freze-fisa-set="0"] td').first()).toHaveText('Acril');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('cel mult 16 seturi: „Un set pe material” se oprește la al 16-lea; o freză fără seturi n-are tabelul în fișă', async ({ page }) => {
  await page.goto('/');
  const f = await deschideFrezele(page);
  await f.locator('.freze-rand-nume').first().click();
  await expect(fisa(f).locator('[data-freze="fisa-materiale"]')).toHaveCount(0);
  await fisa(f).locator('[data-freze="editeaza"]').click();
  for (let i = 0; i < 16; i++) await f.locator('[data-freze="set-adauga"]').click();
  await expect(f.locator('[data-freze-set]')).toHaveCount(16);
  await expect(f.locator('[data-freze="set-adauga"]')).toBeDisabled();
  await expect(f.locator('[data-freze="materiale"]')).toContainText('Cel mult 16 seturi.');
});

for (const latime of [1280, 390, 360, 320]) {
  test(`la ${latime} px, cu fontul lat: seturile pe material și calculatorul încap, fără derulare pe orizontală`, async ({ page }) => {
    await page.setViewportSize({ width: latime, height: 800 });
    await page.goto('/');
    await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
    const f = await deschideFrezele(page);
    await f.locator('[data-freze="noua"]').click();
    await f.locator('[data-freze="set-adauga"]').click();
    await f.locator('[data-freze="set-adauga"]').click();
    await campSet(f, 0, 'material').fill('Placaj de mesteacăn, calitatea întâi');
    await campSet(f, 1, 'pasLateral').fill('12345,678');
    await expect(f.locator('#freze-eroare-materiale')).toBeVisible();
    // Calculatorul avansului (16.A↑g-3), deschis în set și sub valorile de lucru, încape și el.
    await set(f, 1).locator('[data-freze="calculator"] summary').click();
    await f.locator('[data-freze="calculator"][data-unde="lucru"] summary').click();
    await expect(set(f, 1).locator('[data-freze="calculeaza"]')).toBeVisible();
    await set(f, 1).scrollIntoViewIfNeeded();
    await expect(set(f, 1).locator('[data-freze="set-scoate"]')).toBeInViewport();
    await faraDepasire(page);
  });
}
