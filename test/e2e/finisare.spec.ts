import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

/**
 * Finisarea reliefului (ADR 0312, felia 18.1↑c), în Edge: o imagine de 64 × 32 px, jumătatea din stânga albă, cea din dreapta
 * neagră, făcută relief la 1 mm pe celulă și 5 mm înălțime. În secțiunea Tăierea, rolul „finisarea reliefului”: bila Ø6,
 * pasul lateral 10 % (0,6 mm), liniile la 0°, podeaua cât placa; pasul lateral schimbat la 2 mm. Exportul G-code cere dalele
 * reliefului din browser (prin firul principal), iar programul coboară cel mult 5 mm, în două treceri de 3 mm; „Tăiat”, în
 * vederea 3D, simulează placa cu finisarea.
 */
test.use({ locale: 'ro-RO' });

async function importaRelief(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('[data-camp="fisier-svg"]')).toBeAttached();
  await page.evaluate(async () => {
    const c = new OffscreenCanvas(64, 32), g = c.getContext('2d');
    if (!g) throw new Error('fără 2D');
    g.fillStyle = '#000';
    g.fillRect(0, 0, 64, 32);
    g.fillStyle = '#fff';
    g.fillRect(0, 0, 32, 32);
    const b = await c.convertToBlob({ type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(new File([b], 'jumatati.png', { type: 'image/png' }));
    const intrare = document.querySelector<HTMLInputElement>('[data-camp="fisier-svg"]');
    if (!intrare) throw new Error('fără fereastra de fișiere a importului');
    intrare.files = dt.files;
    intrare.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.getByTestId('import-rezultat').locator('label').filter({ hasText: 'Relief' }).click();
  await page.locator('[data-camp="relief-latime"]').fill('64');
  await page.locator('[data-camp="relief-latime"]').press('Enter');
  await expect(page.getByTestId('relief-grila')).toContainText('celule de 1 mm');
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('prop-relief')).toBeVisible();
}

test('rolul „finisarea reliefului” din Tăierea, exportul G-code cu dalele din browser și „Tăiat” în vederea 3D', async ({ page }) => {
  await importaRelief(page);
  const rol = page.locator('[data-camp="rol"]');
  await expect(rol.locator('option[value="finisare"]')).toHaveCount(1);
  await rol.selectOption('finisare');
  await expect(page.locator('[data-camp="fin-forma"]')).toHaveValue('bila');
  await expect(page.locator('[data-camp="fin-pas-lateral"]')).toHaveValue('0,6');
  await expect(page.locator('[data-camp="fin-linii"]')).toHaveValue('da');
  await expect(page.locator('[data-camp="fin-margine"]')).toHaveValue('perete');
  await expect(page.locator('[data-camp="fin-z"]')).toHaveValue('varf');
  // Arborele spune finisarea.
  await expect(page.locator('[data-nod="operatie"]')).toContainText('Finisare pe 1 relief');
  await page.locator('[data-camp="fin-pas-lateral"]').fill('2');
  await page.locator('[data-camp="fin-pas-lateral"]').press('Enter');
  await expect(page.locator('[data-camp="fin-pas-lateral"]')).toHaveValue('2');
  await page.locator('[data-camp="pas"]').fill('3');
  await page.locator('[data-camp="pas"]').press('Enter');

  // Exportul: finisarea n-are rând în fereastră, dar e în program (cu bila, T-ul ei).
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-fisa="op"]')).toHaveCount(0);
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  const z: number[] = [];
  for (const l of text.split('\n')) {
    const m = /^G1\b.*Z(-?\d+(?:\.\d+)?)/.exec(l);
    if (m) z.push(Number(m[1]));
  }
  expect(z.length).toBeGreaterThan(100);
  const jos = Math.min(...z);
  // Partea neagră e la 5 mm sub față; bila Ø6 coboară acolo, cu peretele dintre jumătăți și marginea plăcii în jur.
  expect(jos).toBeLessThan(-4.5);
  expect(jos).toBeGreaterThanOrEqual(-5.0001);
  // Două treceri: prima nu coboară sub −3.
  expect(z.some((x) => x <= -3.0001)).toBe(true);
  expect(text).toMatch(/finisarea reliefului/);
  await page.getByRole('button', { name: 'Închide' }).click();

  // „Tăiat”: placa simulată cu finisarea.
  await page.locator('[data-editare="vedere-3d"]').click();
  const p = page.getByTestId('panza-3d');
  await expect(p).toHaveAttribute('data-vedere', 'model', { timeout: 30_000 });
  await page.locator('[data-3d-vedere="taiat"]').click();
  await expect(p).toHaveAttribute('data-vedere', 'taiat');
  await expect(p).toHaveAttribute('data-stare', 'gata', { timeout: 60_000 });
});
