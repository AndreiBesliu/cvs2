import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Lungimea (ADR 0330, felia 10.4↑e-2), în browser: clic dreapta pe latura de sus a dreptunghiului „Adaugă dreptunghi” (100 × 60
 * din (20, 20), mijlocul laturii de sus în (70, 80)), apoi „Cotează lungimea laturii” pune o etichetă „100” legată de latură
 * (unealta Cote pornește, cu cota aleasă). Eticheta se trage; forma lărgită la 150 schimbă cifra, iar „Dezleagă” o oprește
 * acolo; „Cotează lungimea conturului” pune „L 420”; forma ștearsă lasă cota dezlegată, la lungimea ei; anularea o leagă la loc. Un clic dreapta departe de orice contur spune de ce nu se poate.
 */
test.use({ locale: 'ro-RO' });

type P = { readonly x: number; readonly y: number };
const cote = (page: Page) => page.locator('[data-testid="strat-cote"] g[data-cota]:not(.cota-noua)');
const meniu = (page: Page) => page.getByTestId('meniu-context');

async function laEcran(page: Page, p: P): Promise<P> {
  return (await ecran(page, await vedere(page)))(p.x, p.y);
}

async function din(page: Page, p: P, rand: string): Promise<void> {
  const s = await laEcran(page, p);
  await page.mouse.click(s.x, s.y, { button: 'right' });
  const r = meniu(page).locator(`[data-meniu="${rand}"]`);
  await expect(r).toBeEnabled();
  await r.click();
  await expect(meniu(page)).toHaveCount(0);
}

test('latura și conturul, din clic dreapta: „100”, apoi „150” și „L 420”, legate; eticheta se trage; dezlegate, rămân la lungimea lor', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await din(page, { x: 70, y: 80 }, 'coteaza-latura');
  await expect(page.locator('[data-unealta="cote"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(cote(page)).toHaveCount(1);
  const l = cote(page).nth(0);
  await expect(l).toHaveAttribute('data-fel', 'lungime');
  await expect(l).toHaveAttribute('data-text', '100');
  await expect(l).toHaveAttribute('data-stare', 'legata');
  // Aleasă, cu panoul ei.
  await expect(page.getByTestId('panou-cota')).toContainText('lungime');
  await expect(page.getByTestId('panou-cota').getByTestId('cota-cifra')).toHaveText('100');

  // Eticheta pleacă spre afara formei (în sus, deasupra laturii de sus): cotul la (70, 88). Trasă, cotul vine în cursor (jos,
  // sub foaie, stă rândul comenzilor foii active: un gest nu poate începe pe el).
  const v = await vedere(page);
  const cot = async (): Promise<P> => {
    const x2 = Number(await l.locator('line.cota-linie').first().getAttribute('x2'));
    const y2 = Number(await l.locator('line.cota-linie').first().getAttribute('y2'));
    return { x: (x2 - v.tx) / v.scara, y: (v.ty - y2) / v.scara };
  };
  const c0 = await cot();
  expect(Math.abs(c0.x - 70) < 0.01 && Math.abs(c0.y - 88) < 0.01, `cotul (${c0.x}, ${c0.y})`).toBe(true);
  // Apăsarea pe umăr (la (76, 88)), departe de punctele numite ale formei (un punct numit ar începe o cotă nouă).
  const a = await laEcran(page, { x: 76, y: 88 }), b = await laEcran(page, { x: 110, y: 110 });
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();
  const c1 = await cot();
  expect(Math.abs(c1.x - 110) < 0.05 && Math.abs(c1.y - 110) < 0.05, `cotul tras (${c1.x}, ${c1.y})`).toBe(true);
  await expect(l).toHaveAttribute('data-text', '100');

  // Legată: forma lărgită la 150 (din panou, cu Selecția), cifra o urmează; „Dezleagă” o oprește la 150, nu la lungimea de la
  // punere. Capătul e acum mijlocul laturii de sus, (95, 80), iar cotul a rămas la aceeași distanță și direcție: (135, 110).
  await page.locator('[data-unealta="selectie"]').click();
  const m = await laEcran(page, { x: 70, y: 50 });
  await page.mouse.click(m.x, m.y);
  const latime = page.locator('[data-camp="forma-latime"]');
  await latime.fill('150');
  await latime.press('Enter');
  await expect(l).toHaveAttribute('data-text', '150');
  await page.locator('[data-unealta="cote"]').click();
  const u = await laEcran(page, { x: 139, y: 110 });
  await page.mouse.click(u.x, u.y);
  await expect(page.getByTestId('panou-cota')).toBeVisible();
  await page.locator('[data-buton="cota-dezleaga"]').click();
  await expect(page.getByTestId('cota-legatura')).toHaveText('Liberă');
  await expect(l).toHaveAttribute('data-text', '150');

  // Conturul (150 + 60 + 150 + 60), din clic dreapta pe latura din dreapta, acum la x = 170.
  await din(page, { x: 170, y: 50 }, 'coteaza-conturul');
  await expect(cote(page)).toHaveCount(2);
  await expect(cote(page).nth(1)).toHaveAttribute('data-text', 'L 420');

  // Forma ștearsă (cu Selecția): conturul se dezleagă, la lungimea lui; latura, liberă, rămâne la 150.
  await page.locator('[data-unealta="selectie"]').click();
  const s = await laEcran(page, { x: 20, y: 50 });
  await page.mouse.click(s.x, s.y);
  await page.keyboard.press('Delete');
  await expect(cote(page).nth(1)).toHaveAttribute('data-stare', 'dezlegata');
  await expect(cote(page).nth(1)).toHaveAttribute('data-text', 'L 420');
  await expect(cote(page).nth(0)).toHaveAttribute('data-text', '150');
  // Anularea pune forma la loc, iar conturul se leagă din nou.
  await page.keyboard.press('Control+z');
  await expect(cote(page).nth(1)).toHaveAttribute('data-stare', 'legata');
});

test('departe de orice contur: „Nicio latură aici”, fără cotă', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await din(page, { x: 250, y: 150 }, 'coteaza-latura');
  await expect(page.getByTestId('cote-sfat')).toHaveText('Nicio latură aici: dă clic dreapta chiar pe conturul unei forme.');
  await expect(cote(page)).toHaveCount(0);
});
