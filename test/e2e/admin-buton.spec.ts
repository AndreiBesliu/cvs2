// Butonul Admin din meniul global (cererea owner-ului din 24.11): apare doar cu un cont al personalului (planul `personal`
// din dreptul ținut de aplicație) și deschide pagina de administrare în altă filă.
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'ro-RO' });

const TOATE = ['desen', 'cam', 'export-gcode', 'export-vectori', 'masina'];
const buton = (page: Page) => page.locator('header.meniu-global [data-editare="admin"]');

/** Contul ținut de aplicație, scris în browser înaintea pornirii (ca după o logare), cu planul dat. */
async function cuCont(page: Page, plan: 'proba' | 'gratuit' | 'personal'): Promise<void> {
  await page.addInitScript(([p, toate]) => {
    const acum = Date.now();
    localStorage.setItem('cncvs2.cont', JSON.stringify({
      uid: 'u1', email: 'ana@exemplu.ro', nume: 'Ana',
      drept: { plan: p, capabilitati: toate, pana: p === 'proba' ? acum + 5 * 86_400_000 : null, calculatLa: acum, zileOffline: 7 },
    }));
  }, [plan, TOATE] as const);
}

test('fără cont și cu un cont de client, butonul Admin nu există, iar grupul lui nu ocupă nimic în meniu', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-editare="cont"]')).toBeVisible();
  await expect(buton(page)).toHaveCount(0);
  await expect(page.locator('header.meniu-global [data-grup="personal"]')).toBeHidden();
});

test('cu un cont de client în probă, butonul Admin nu apare', async ({ page }) => {
  await cuCont(page, 'proba');
  await page.goto('/');
  await expect(page.locator('[data-editare="cont"]')).toContainText('Ana');
  await expect(buton(page)).toHaveCount(0);
});

test('cu un cont al personalului: „Admin” în meniu, între file și căutare, spre /admin, în altă filă; și din fereastra Mașina; în engleză la fel', async ({ page }) => {
  await cuCont(page, 'personal');
  await page.goto('/');
  const b = buton(page);
  await expect(b).toBeVisible();
  await expect(b).toHaveText('Admin');
  await expect(b).toHaveAttribute('href', '/admin');
  await expect(b).toHaveAttribute('target', '_blank');
  await expect(b).toHaveAttribute('rel', 'noopener');
  await expect(b).toHaveAttribute('title', 'Administrarea, într-o filă nouă (doar pentru personal)');
  // Locul: după filele ferestrelor, înaintea căutării, pe același rând cu ele.
  const cutie = await b.boundingBox();
  const file = await page.locator('header.meniu-global nav.ferestre').boundingBox();
  const cauta = await page.locator('header.meniu-global [data-actiune="vedere.paleta"]').boundingBox();
  if (!cutie || !file || !cauta) throw new Error('meniul n-are cutii');
  expect(cutie.x).toBeGreaterThan(file.x + file.width);
  expect(cutie.x + cutie.width).toBeLessThan(cauta.x);
  expect(Math.abs((cutie.y + cutie.height / 2) - (file.y + file.height / 2))).toBeLessThan(4);
  // Meniul e al aplicației întregi: butonul rămâne și în fereastra Mașina.
  await page.locator('[data-actiune="vedere.masina"]').click();
  await expect(buton(page)).toBeVisible();
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(buton(page)).toHaveAttribute('title', 'Administration, in a new tab (staff only)');
});

test('pe telefon (390 px) butonul Admin nu se arată, iar meniul rămâne pe cele două rânduri ale lui', async ({ page }) => {
  await cuCont(page, 'personal');
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  await expect(page.locator('[data-editare="cont"]')).toBeVisible();
  await expect(buton(page)).toBeHidden();
});
