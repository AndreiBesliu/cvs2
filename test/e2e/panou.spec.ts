import { test, expect, type Page } from '@playwright/test';

/**
 * Panoul de proprietăți editabil (felia 2.8c, ADR 0038 §4–§5), în browserul adevărat: câmpul numeric unic (Enter, Escape,
 * virgula, valoarea greșită cu motivul ei), colțul stânga-jos al selecției, rotirea cu centrul pe loc, foaia, fila care
 * doar citește și drumul spre dialogul exportului.
 */
test.use({ locale: 'ro-RO' });

async function panouDeschis(page: Page): Promise<void> {
  const panou = page.locator('[data-panou="proprietati"]');
  if ((await panou.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  await expect(panou).toHaveAttribute('data-deschis', 'true');
}
const camp = (page: Page, nume: string) => page.locator(`[data-camp="${nume}"]`);

test('colțul stânga-jos: Enter aplică, Anulează revine; virgula se citește; Escape renunță la textul scris', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await panouDeschis(page);
  const x = camp(page, 'pozitie-x');
  await expect(x).toHaveValue('20');
  await x.fill('5');
  await x.press('Enter');
  await expect(x).toHaveValue('5');
  await expect(camp(page, 'pozitie-y')).toHaveValue('20');
  await page.locator('[data-actiune="istoric.anuleaza"]').first().click();
  await expect(x).toHaveValue('20');
  await x.fill('12,5');
  await x.press('Enter');
  await expect(x).toHaveValue('12,5');
  await x.fill('99');
  await x.press('Escape');
  await expect(x).toHaveValue('12,5');
});

test('o valoare greșită rămâne în câmp, cu motivul, și nu se aplică; Escape o șterge', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await panouDeschis(page);
  const x = camp(page, 'pozitie-x');
  await x.fill('abc');
  await x.press('Enter');
  await expect(page.locator('[data-motiv="pozitie-x"]')).toContainText('Valoarea trebuie să fie un număr');
  await expect(x).toHaveValue('abc');
  await expect(x).toHaveAttribute('aria-invalid', 'true');
  await x.press('Escape');
  await expect(x).toHaveValue('20');
  await expect(page.locator('[data-motiv="pozitie-x"]')).toHaveCount(0);
  // Prea departe: refuzul acțiunii, cu motivul ei, tot în câmp.
  await x.fill('20000000000');
  await x.press('Enter');
  await expect(page.locator('[data-motiv="pozitie-x"]')).toContainText('10 000 km');
});

test('rotirea ține pe loc centrul: dreptunghiul de 100 × 60 rotit cu 90° are colțul la (40, 0); −90 se scrie 270', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await panouDeschis(page);
  const r = camp(page, 'rotire');
  await expect(r).toHaveValue('0');
  await r.fill('90');
  await r.press('Enter');
  await expect(r).toHaveValue('90');
  await expect(camp(page, 'pozitie-x')).toHaveValue('40');
  await expect(camp(page, 'pozitie-y')).toHaveValue('0');
  await r.fill('-90');
  await r.press('Enter');
  await expect(r).toHaveValue('270');
});

test('foaia, fără selecție: lățimea se schimbă; zero e refuzat cu motiv; ieșirea din câmp aplică', async ({ page }) => {
  await page.goto('/');
  await panouDeschis(page);
  const l = camp(page, 'foaie-latime');
  await l.fill('300');
  await l.press('Enter');
  await expect(l).toHaveValue('300');
  const g = camp(page, 'foaie-grosime');
  await g.fill('12');
  await l.focus();
  await expect(g).toHaveValue('12');
  await l.fill('0');
  await l.press('Enter');
  await expect(page.locator('[data-motiv="foaie-latime"]')).toContainText('Foaia trebuie');
  await l.press('Escape');
  await expect(l).toHaveValue('300');
});

test('fila care doar citește: câmpurile sunt oprite, cu motivul în titlu', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('[data-actiune="document.adauga-dreptunghi"]')).toBeVisible();
  const b = await context.newPage();
  await b.goto('/');
  await panouDeschis(b);
  await expect(camp(b, 'foaie-latime')).toBeDisabled();
  await expect(camp(b, 'foaie-latime')).toHaveAttribute('title', /altă filă/);
});

test('„Editează în Exportă G-code” deschide dialogul exportului', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await panouDeschis(page);
  await page.locator('[data-buton="editeaza-export"]').click();
  await expect(page.locator('[data-buton="exporta"]')).toBeVisible();
});
