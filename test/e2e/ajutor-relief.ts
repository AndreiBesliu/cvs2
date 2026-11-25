import { expect, type Page } from '@playwright/test';

/**
 * Relieful pe planșă, pentru probele care au nevoie de unul (ADR 0310, ADR 0312): o imagine de 64 × 32 px, jumătatea din stânga
 * albă, cea din dreapta neagră, adusă prin „Importă…” ca relief, cu `latime` mm pe lățime (1 mm pe celulă la 64), 5 mm înălțime
 * (implicitul ferestrei). Pagina trebuie să fie deschisă; la capăt, piesa reliefului e aleasă și panoul arată secțiunea Relieful.
 * Merge în orice limbă: butoanele se caută după `data-*`.
 */
export async function importaRelief(page: Page, latime = 64): Promise<void> {
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
  await page.getByTestId('import-rezultat').locator('label').filter({ has: page.locator('[data-camp="import-rezultat-relief"]') }).click();
  await page.locator('[data-camp="relief-latime"]').fill(String(latime));
  await page.locator('[data-camp="relief-latime"]').press('Enter');
  await expect(page.getByTestId('relief-grila')).toBeVisible();
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('prop-relief')).toBeVisible();
}

/**
 * Rolul „finisarea reliefului” pe piesa aleasă (doar cu reliefuri), din secțiunea Tăierea: din listă, sau, în Atelier (tăierea
 * din butoane mari, felia 28.1↑d), din butonul lui.
 */
export async function rolFinisare(page: Page): Promise<void> {
  const lista = page.locator('select[data-camp="rol"]'), buton = page.locator('button[data-rol="finisare"]');
  await expect(lista.locator('option[value="finisare"]').or(buton)).toHaveCount(1);
  if (await buton.count() > 0) await buton.click();
  else await lista.selectOption('finisare');
  await expect(page.locator('[data-camp="fin-forma"]')).toHaveValue('bila');
}
