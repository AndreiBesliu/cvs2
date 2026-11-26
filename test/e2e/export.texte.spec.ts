/**
 * Textele lungi ale ferestrei exportului (ADR 0291, felia 28.8↑k; constatarea 21 a auditului): prima propoziție la vedere, restul
 * sub „Mai mult”. În caseta explicației, „Mai mult” e al grupului: deschis, arată întregi toate explicațiile lui (și a câmpului pe
 * care treci apoi), iar caseta își ține înălțimea scurtă cât e strâns (11 rânduri la treaptă, înainte). Nota ordinii automate și
 * nota dopului au „Mai mult” al lor; nota dopului spune întâi ce face varianta aleasă (prima ei propoziție era fișierul dopului,
 * aceeași la toate variantele).
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';
import { alege } from './ajutor-export.ts';

const fisa = (page: Page, cheie: string) => page.locator(`[data-fisa="op"][data-operatie="${cheie}"]`);

/** Dreptunghiul (e1/e1) și cercul din el (e2/e2), cu fontul lat, la 1280 × 800, apoi fereastra exportului. */
async function deschide(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav]').first()).toBeVisible();
  await page.mouse.move(2, 2);
}

/** Câte rânduri are o casetă (înălțimea ei împărțită la înălțimea unui rând de text). */
const randuri = (l: Locator): Promise<number> => l.evaluate((e) => e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight));

test.describe('în română', () => {
  test.use({ locale: 'ro-RO' });

  test('explicația treptei: prima propoziție, iar „Mai mult” al grupului arată tot, și după altă trecere pe un câmp', async ({ page }) => {
    await deschide(page);
    const e2 = fisa(page, 'e2/e2');
    await alege(e2, 'latura', 'incrustatie-drept');
    await alege(e2, 'inc-treapta', 'interior');
    const g = e2.locator('[data-grup="treapta"]'), expl = g.locator('[data-explicatie]'), mai = g.locator('[data-mai-mult]');
    await e2.locator('input[data-camp="inc-treapta"]:checked').focus();
    await expect(expl).toContainText('Un umăr în locaș');
    await expect(expl).not.toContainText('cu tija în sus');
    await expect(expl).toContainText('…');
    expect(await randuri(expl), 'caseta strânsă').toBeLessThanOrEqual(7);
    await expect(mai).toHaveAttribute('aria-expanded', 'false');
    await expect(mai).toHaveText('Mai mult');
    await mai.click();
    await expect(mai).toHaveAttribute('aria-expanded', 'true');
    await expect(mai).toHaveText('Mai puțin');
    await expect(expl).toContainText('cu tija în sus');
    expect(await randuri(expl), 'caseta desfăcută').toBeGreaterThan(9);
    // Pe alt câmp al grupului și înapoi: tot întreagă (grupul rămâne deschis).
    await e2.locator('[data-camp="inc-treapta-latime"]').focus();
    await e2.locator('input[data-camp="inc-treapta"]:checked').focus();
    await expect(expl).toContainText('cu tija în sus');
    await mai.click();
    await expect(expl).not.toContainText('cu tija în sus');
    // Un grup fără texte lungi n-are „Mai mult”.
    await expect(fisa(page, 'e1/e1').locator('[data-grup="sens"] [data-mai-mult]')).toBeHidden();
  });

  test('supracursa: explicația ei lungă, prescurtată; „Mai mult” o arată întreagă', async ({ page }) => {
    await deschide(page);
    const g = page.locator('[data-fisa="foaia"] [data-grup="z0"]'), expl = g.locator('[data-explicatie]');
    await page.locator('[data-camp="supracursa"]').focus();
    await expect(expl).toContainText('Cât coboară tăieturile prin placă');
    await expect(expl).not.toContainText('exact prin placă');
    await g.locator('[data-mai-mult]').click();
    await expect(expl).toContainText('exact prin placă');
  });

  test('nota ordinii automate și nota dopului: prima propoziție, restul sub „Mai mult”', async ({ page }) => {
    await deschide(page);
    const ordine = page.getByTestId('ordine-taierii');
    await expect(ordine).toContainText('grupate pe freză');
    await expect(ordine).not.toContainText('reface ordinea la export');
    await ordine.locator('[data-mai-mult]').click();
    await expect(ordine).toContainText('reface ordinea la export');
    const e1 = fisa(page, 'e1/e1');
    await alege(e1, 'latura', 'incrustatie');
    // Întâi ce face varianta aleasă (cu fundul plat, freza dreaptă coboară fața), apoi, sub „Mai mult”, fișierul dopului.
    const nota = e1.locator('p.nota-incrustatie').first();
    await expect(nota).toContainText('Fața semifabricatului se coboară cu freza dreaptă');
    await expect(nota).not.toContainText('Dopul iese într-un fișier al lui');
    await nota.locator('[data-mai-mult]').click();
    await expect(nota).toContainText('Dopul iese într-un fișier al lui');
  });
});

test.describe('în engleză', () => {
  test.use({ locale: 'en-GB' });

  test('the automatic order note: first sentence, the rest under “More”', async ({ page }) => {
    await deschide(page);
    const ordine = page.getByTestId('ordine-taierii'), mai = ordine.locator('[data-mai-mult]');
    await expect(mai).toHaveText('More');
    const inainte = await ordine.textContent() ?? '';
    await mai.click();
    await expect(mai).toHaveText('Less');
    expect((await ordine.textContent() ?? '').length).toBeGreaterThan(inainte.length);
  });
});
