/**
 * Rândul unei operații în lista ferestrei exportului (constatarea 14 a auditului, partea listei; felia 28.8↑s): pe primul rând,
 * numele piesei când omul i-a dat unul (un import își ia numele din fișier), altfel forma și mărimea; pe al doilea, mai mic,
 * locul pe foaie. Titlul fișei rămâne numele întreg. Pe telefonul culcat, banda listei arată doar numele.
 */
import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const LOGO = 'test/placi/placa-02/logo-80mm.svg';

const rand = (page: Page, cheie: string) => page.locator(`[data-nav="${cheie}"]`);

test('o formă desenată: forma și mărimea, apoi locul pe al doilea rând, mai mic; titlul fișei, numele întreg', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const r = rand(page, 'e1/e1');
  await expect(r.locator('.dx-nume')).toHaveText('dreptunghi 100,00 × 60,00');
  await expect(r.locator('.dx-unde')).toHaveText('la X 20,00, Y 20,00');
  // Locul stă sub nume, cu litera mai mică.
  const [n, u] = await Promise.all([r.locator('.dx-nume').boundingBox(), r.locator('.dx-unde').boundingBox()]);
  expect(u!.y).toBeGreaterThanOrEqual(n!.y + n!.height - 0.5);
  const marime = (sel: string): Promise<number> => r.locator(sel).evaluate((e) => Number.parseFloat(getComputedStyle(e).fontSize));
  expect(await marime('.dx-unde')).toBeLessThan(await marime('.dx-nume'));
  // Numele accesibil al rândului citește numele, apoi locul, despărțite.
  await expect(r).toHaveAccessibleName(/^dreptunghi 100,00 × 60,00 la X 20,00, Y 20,00 /);
  await r.click();
  await expect(page.locator('[data-fisa="op"][data-operatie="e1/e1"] h3')).toHaveText('dreptunghi 100,00 × 60,00 la X 20,00, Y 20,00');
});

test('o piesă importată își arată numele din fișier, pe fiecare operație a ei; locul, al primului ei contur', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(LOGO);
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('[data-actiune="export.gcode"]').click();
  const nume = page.locator('[data-nav-op] .dx-nume');
  // Lista e în ordinea tăierii: întâi interiorul, pe două contururi, apoi exteriorul, pe unul (ca în arborele proiectului).
  await expect(nume).toHaveText(['logo-80mm (+1)', 'logo-80mm']);
  const unde = page.locator('[data-nav-op] .dx-unde');
  await expect(unde).toHaveCount(2);
  for (const u of await unde.allTextContents()) expect(u).toMatch(/^la X -?\d+,\d{2}, Y -?\d+,\d{2}$/);
});

test.describe('pe telefonul culcat', () => {
  test.use({ viewport: { width: 640, height: 360 }, hasTouch: true, isMobile: true });
  test('banda listei arată doar numele: locul și rândul de dedesubt nu se văd', async ({ page }) => {
    await page.goto('/');
    await adauga(page, 'dreptunghi');
    await page.locator('[data-actiune="export.gcode"]').click();
    const r = rand(page, 'e1/e1');
    await expect(r.locator('.dx-nume')).toBeVisible();
    await expect(r.locator('.dx-unde')).toBeHidden();
    await expect(r.locator('.dx-meta')).toBeHidden();
  });
});
