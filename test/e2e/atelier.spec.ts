import { test, expect, type Locator, type Page } from '@playwright/test';
import { deschideMeniulContului, ecran, vedere } from './ajutor-panza.ts';

/**
 * Atelierul (ADR 0250 §1, §3, §5, §7; felia 28.1↑c): vine la cerere, ca bucată (cu CSS-ul lui), înaintea primei randări când
 * e ales, și pe loc din fereastra Aspectul. Prima alegere îl pornește întunecat și cu butoane mari; Renunță pune Insulele la
 * loc. Uneltele de desen stau într-o coloană a lor, în stânga, cu numele la vedere; pe telefon, într-un rând jos. Fără
 * bucată (fără rețea, înainte de precache), aplicația rămâne pe Insule, iar alegerea ținută nu se pierde.
 */
test.use({ locale: 'ro-RO' });

const CHEIE = 'cncvs2.aranjament';
const ATELIER = '{"v":1,"aranjament":"atelier","densitate":"mare"}';
const BUCATA = '**/assets/atelier-*.js';
const UNELTE = ['selectie', 'transformare', 'noduri', 'cutit', 'pen', 'dreptunghi', 'cerc', 'elipsa', 'linie', 'poligon', 'text'];

/**
 * Pune alegerea înaintea încărcării (o singură dată pe filă) și ține minte aranjamentul cu care a apărut întâi `.aplicatie`:
 * dacă Atelierul ar veni după prima randare, aici ar scrie `modern`.
 */
async function pregateste(page: Page, valoare: string | null): Promise<void> {
  await page.addInitScript(([cheie, v]) => {
    if (v !== null && sessionStorage.getItem('aranjament-pus') === null) {
      localStorage.setItem(cheie, v);
      sessionStorage.setItem('aranjament-pus', '1');
    }
    new MutationObserver((_, o) => {
      const a = document.querySelector('.aplicatie');
      if (a) {
        (window as unknown as { primaRandare: string | null }).primaRandare = a.getAttribute('data-aranjament');
        o.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  }, [CHEIE, valoare] as const);
}

const aplicatie = (page: Page): Locator => page.locator('.aplicatie');
const unealta = (page: Page, u: string): Locator => page.locator(`[data-unealta="${u}"]`);

async function deschideAspectul(page: Page): Promise<Locator> {
  const meniu = await deschideMeniulContului(page);
  await meniu.locator('[data-meniu-cont="aspect"]').click();
  const f = page.getByRole('dialog', { name: 'Aspectul interfeței' });
  await expect(f).toBeVisible();
  return f;
}

async function cutie(l: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const c = await l.boundingBox();
  if (c === null) throw new Error('fără cutie');
  return c;
}

/** Centrul elementului e chiar el (sau un copil al lui): nimic nu-l acoperă acolo. */
async function seNimereste(l: Locator): Promise<boolean> {
  return l.evaluate((e) => {
    const r = e.getBoundingClientRect();
    const sus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return sus !== null && (sus === e || e.contains(sus));
  });
}

// Butonul radio se bifează abia după ce vine bucata (aranjamentul îl pune aplicația): de aceea `click`, nu `check`.
/** Foaia nouă (300 × 200 mm) stă întreagă în zona liberă: potrivită în ea, nu pe sub coloana uneltelor sau panouri. */
async function foaiaInZona(page: Page): Promise<void> {
  const la = await ecran(page, await vedere(page));
  const a = la(0, 0);
  const b = la(300, 200);
  const z = await cutie(page.locator('.zona-libera'));
  expect(Math.min(a.x, b.x)).toBeGreaterThanOrEqual(z.x - 1);
  expect(Math.max(a.x, b.x)).toBeLessThanOrEqual(z.x + z.width + 1);
  expect(Math.min(a.y, b.y)).toBeGreaterThanOrEqual(z.y - 1);
  expect(Math.max(a.y, b.y)).toBeLessThanOrEqual(z.y + z.height + 1);
}

test('ales din fereastră: Atelierul vine pe loc, întunecat și cu butoane mari, cu uneltele pe coloana din stânga; Renunță pune Insulele la loc', async ({ page }) => {
  await page.goto('/');
  await expect(aplicatie(page)).toHaveAttribute('data-aranjament', 'modern');
  await expect(unealta(page, 'selectie').locator('.nume-unealta')).toBeHidden();
  const f = await deschideAspectul(page);
  await f.getByRole('radio', { name: 'Atelier', exact: true }).click();
  await expect(aplicatie(page)).toHaveAttribute('data-aranjament', 'atelier');
  await expect(page.locator('html')).toHaveAttribute('data-aranjament', 'atelier');
  await expect(f.getByRole('radio', { name: 'Atelier', exact: true })).toBeChecked();
  // Prima alegere: tema întunecată și butoanele mari, arătate și în fereastră (se pot schimba înainte de Păstrează).
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'intunecata');
  await expect(f.getByRole('radio', { name: 'întunecată' })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-densitate', 'mare');
  await expect(f.getByRole('switch', { name: 'Butoane mari' })).toBeChecked();
  // Uneltele, cu numele la vedere, pe coloana din stânga, înaltă cât butoanele mari.
  await expect(unealta(page, 'selectie').locator('.nume-unealta')).toHaveText('Selecție');
  await expect(unealta(page, 'dreptunghi').locator('.nume-unealta')).toHaveText('Dreptunghi');
  const sel = await cutie(unealta(page, 'selectie'));
  const zona = await cutie(page.locator('.zona-libera'));
  expect(sel.x + sel.width).toBeLessThanOrEqual(zona.x + 1);
  expect(sel.height).toBeGreaterThanOrEqual(47.5);
  // Zona liberă s-a mutat: foaia s-a potrivit din nou în ea.
  await foaiaInZona(page);
  // Renunță: Insulele, tema și densitatea de dinainte; numele uneltelor se ascund la loc.
  await f.getByRole('button', { name: 'Renunță' }).click();
  await expect(f).toHaveCount(0);
  await expect(aplicatie(page)).toHaveAttribute('data-aranjament', 'modern');
  await expect(page.locator('html')).toHaveAttribute('data-aranjament', 'modern');
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'auto');
  await expect(page.locator('html')).toHaveAttribute('data-densitate', 'normala');
  await expect(unealta(page, 'selectie').locator('.nume-unealta')).toBeHidden();
  expect(await page.evaluate((c) => localStorage.getItem(c), CHEIE)).toBeNull();
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('Păstrează: după reîncărcare, Atelierul e acolo de la prima randare; meniul contului îl numește', async ({ page }) => {
  await pregateste(page, null);
  await page.goto('/');
  const f = await deschideAspectul(page);
  await f.getByRole('radio', { name: 'Atelier', exact: true }).click();
  await expect(aplicatie(page)).toHaveAttribute('data-aranjament', 'atelier');
  await f.getByRole('button', { name: 'Păstrează' }).click();
  await expect(f).toHaveCount(0);
  expect(await page.evaluate((c) => localStorage.getItem(c), CHEIE)).toBe(ATELIER);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('CNC Vector Studio');
  await expect(aplicatie(page)).toHaveAttribute('data-aranjament', 'atelier');
  expect(await page.evaluate(() => (window as unknown as { primaRandare: string | null }).primaRandare)).toBe('atelier');
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'intunecata');
  await expect(unealta(page, 'selectie').locator('.nume-unealta')).toBeVisible();
  const meniu = await deschideMeniulContului(page);
  await expect(meniu.locator('[data-meniu-cont="aspect"] small')).toHaveText('Atelier');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('la 1280 × 720: coloana uneltelor nu atinge bara de sus și panourile; fiecare unealtă se nimerește', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await pregateste(page, ATELIER);
  await page.goto('/');
  await expect(aplicatie(page)).toHaveAttribute('data-aranjament', 'atelier');
  const coloana = await cutie(page.locator('.insula.unelte'));
  const bara = await cutie(page.locator('.insula.bara'));
  const dreapta = await cutie(page.locator('.doc-dreapta .panou').first());
  expect(coloana.x + coloana.width).toBeLessThanOrEqual(bara.x + 1);
  expect(coloana.x + coloana.width).toBeLessThanOrEqual(dreapta.x + 1);
  expect(coloana.y + coloana.height).toBeLessThanOrEqual(720);
  for (const u of UNELTE) {
    const b = unealta(page, u);
    await expect(b).toBeVisible();
    expect(await seNimereste(b), u).toBe(true);
    expect((await cutie(b)).height, u).toBeGreaterThanOrEqual(47.5);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  // Locul coloanei e rezervat de la pornire: foaia, potrivită înainte să vină uneltele, nu ajunge sub ele.
  await foaiaInZona(page);
});

for (const latime of [768, 390, 360, 320]) {
  test(`sub 1024 px (tableta în picioare, telefonul), la ${latime} px: uneltele cu nume într-un rând jos, care se derulează; pagina nu iese din ecran`, async ({ page }) => {
    await page.setViewportSize({ width: latime, height: 780 });
    await pregateste(page, ATELIER);
    await page.goto('/');
    await expect(aplicatie(page)).toHaveAttribute('data-aranjament', 'atelier');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(latime);
    const rand = await cutie(page.locator('.insula.unelte'));
    const zona = await cutie(page.locator('.zona-libera'));
    expect(rand.y).toBeGreaterThanOrEqual(zona.y + zona.height - 1);
    for (const u of UNELTE) {
      const b = unealta(page, u);
      await b.scrollIntoViewIfNeeded();
      await expect(b.locator('.nume-unealta')).toBeVisible();
      expect(await seNimereste(b), u).toBe(true);
    }
  });
}

test('fără bucata Atelierului la pornire: Insulele, fără eroare de randare, iar alegerea ținută rămâne', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => erori.push(e.message));
  await page.route(BUCATA, (r) => r.abort());
  await pregateste(page, ATELIER);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('CNC Vector Studio');
  await expect(aplicatie(page)).toHaveAttribute('data-aranjament', 'modern');
  await expect(page.locator('html')).toHaveAttribute('data-aranjament', 'modern');
  await expect(page.locator('html')).toHaveAttribute('data-densitate', 'mare');
  expect(await page.evaluate((c) => localStorage.getItem(c), CHEIE)).toBe(ATELIER);
  // Bucata care n-a venit e spusă în jurnalul local (mediul omului: nu pleacă la server).
  await expect(page.getByTestId('jurnal')).toHaveText('1 eroare în jurnalul local');
  expect(erori).toEqual([]);
});

test('ales din fereastră fără bucată: rămân Insulele, cu motivul spus în fereastră', async ({ page }) => {
  await page.route(BUCATA, (r) => r.abort());
  await page.goto('/');
  const f = await deschideAspectul(page);
  await f.getByRole('radio', { name: 'Atelier', exact: true }).click();
  await expect(f.getByRole('status')).toHaveText('Aranjamentul „Atelier” nu s-a putut aduce (fără rețea?). Încearcă din nou mai târziu.');
  await expect(f.getByRole('radio', { name: 'Insule implicit' })).toBeChecked();
  await expect(aplicatie(page)).toHaveAttribute('data-aranjament', 'modern');
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'auto');
  await f.getByRole('button', { name: 'Renunță' }).click();
  await expect(f).toHaveCount(0);
});

test('în engleză: Workshop, cu numele uneltelor în engleză', async ({ page }) => {
  await pregateste(page, ATELIER);
  await page.goto('/');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(unealta(page, 'selectie').locator('.nume-unealta')).toHaveText('Select');
  const meniu = await deschideMeniulContului(page);
  await expect(meniu.locator('[data-meniu-cont="aspect"] small')).toHaveText('Workshop');
});
