/**
 * Tastatura și cititorul de ecran în fereastra exportului (ADR 0291, felia 28.8↑l; constatarea 13 a auditului):
 * - un rând al listei (Enter sau clic) duce focusul pe titlul fișei lui, deci Tab merge apoi în fișa aceea (înainte, focusul
 *   rămânea pe rând, iar până la primul câmp al dreptunghiului erau 19 opriri, prin foaie, mașină și fișa cercului);
 * - titlul fiecărui grup e înaintea explicației lui (cititorul îl spune întâi);
 * - fiecare câmp e descris de explicația grupului lui, întreagă și când e prescurtată, și de greșelile grupului;
 * - doar greșelile se anunță singure (`aria-live`), nu și explicațiile, care se schimbă cu mausul și cu focusul.
 */
import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';
import { alege } from './ajutor-export.ts';

test.use({ locale: 'ro-RO' });

const fisa = (page: Page, cheie: string) => page.locator(`[data-fisa="op"][data-operatie="${cheie}"]`);

/** Dreptunghiul (e1/e1) și cercul din el (e2/e2), apoi fereastra exportului. */
async function deschide(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav]').first()).toBeVisible();
  await page.mouse.move(2, 2);
}

/** Cheia fișei în care e focusul acum (`foaia`, `masina`, cheia operației), sau null. */
const fisaCuFocus = (page: Page): Promise<string | null> => page.evaluate(() => {
  const f = document.activeElement?.closest<HTMLElement>('[data-fisa]');
  return f ? (f.dataset['fisa'] === 'op' ? f.dataset['operatie'] ?? null : f.dataset['fisa'] ?? null) : null;
});

test('Enter sau clic pe un rând al listei duce focusul pe titlul fișei; Tab merge apoi în fișa ei', async ({ page }) => {
  await deschide(page);
  // Rândul dreptunghiului, din tastatură: titlul fișei lui primește focusul, iar Tab rămâne în fișa lui.
  await page.locator('[data-nav="e1/e1"]').focus();
  await page.keyboard.press('Enter');
  await expect(fisa(page, 'e1/e1').locator(':scope > h3')).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await fisaCuFocus(page), 'primul Tab după titlu').toBe('e1/e1');
  // La fel la clic, și pe foaie sau mașină.
  await page.locator('[data-nav="masina"]').click();
  await expect(page.locator('[data-fisa="masina"] > h3')).toBeFocused();
  await page.locator('[data-nav="e2/e2"]').click();
  await expect(fisa(page, 'e2/e2').locator(':scope > h3')).toBeFocused();
  // Titlul nu e o oprire a lui Tab (doar ținta focusului adus de listă).
  await expect(fisa(page, 'e2/e2').locator(':scope > h3')).toHaveAttribute('tabindex', '-1');
});

test('titlul grupului înaintea explicației; câmpurile descrise de explicație și de greșeli; aria-live doar pe greșeli', async ({ page }) => {
  await deschide(page);
  const rau = await page.locator('.dialog-export').evaluate((d) => {
    const r: string[] = [];
    for (const g of d.querySelectorAll<HTMLElement>('[data-grup]')) {
      const h = g.querySelector('h4'), e = g.querySelector('[data-explicatie]'), nume = g.dataset['grup'] ?? '?';
      if (!h || !e || !(h.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING)) r.push(`${nume}: titlul nu e înaintea explicației`);
      if (g.querySelector('[data-greseli][aria-live="polite"]') === null) r.push(`${nume}: greșelile fără aria-live`);
    }
    if (d.querySelector('[data-explicatie][aria-live]')) r.push('o explicație cu aria-live');
    return r;
  });
  expect(rau).toEqual([]);
  // Adâncimea: explicația grupului; cu un pas greșit, și greșeala lui.
  const e1 = fisa(page, 'e1/e1'), pas = e1.locator('[data-camp="pas"]');
  await expect(pas).toHaveAccessibleDescription(/treceri egale/);
  await pas.fill('0');
  await expect(e1.locator('[data-grup="adancime"] [data-greseala]')).toHaveCount(1);
  await expect(pas).toHaveAccessibleDescription(/Pasul: scrie un număr/);
  await expect(e1.locator('[data-camp="adancime"]')).toHaveAccessibleDescription(/Pasul: scrie un număr/);
  // O explicație lungă, prescurtată pe ecran, e întreagă în descriere.
  const e2 = fisa(page, 'e2/e2');
  await alege(e2, 'latura', 'incrustatie-drept');
  await alege(e2, 'inc-treapta', 'interior');
  const treapta = e2.locator('input[data-camp="inc-treapta"]:checked');
  await treapta.focus();
  await expect(e2.locator('[data-grup="treapta"] [data-explicatie]')).not.toContainText('cu tija în sus');
  await expect(treapta).toHaveAccessibleDescription(/cu tija în sus/);
});
