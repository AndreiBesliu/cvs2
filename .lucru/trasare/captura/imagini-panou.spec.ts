import { test, expect, type Page } from '@playwright/test';
import { documentSalvat } from '../../test/e2e/ajutor-document.ts';
import { ecran, vedere } from '../../test/e2e/ajutor-panza.ts';

// Captura panoului imaginilor și a mânerelor (ADR 0272, doar local).
test.use({ locale: 'ro-RO', viewport: { width: 1400, height: 900 } });

async function alege(page: Page): Promise<void> {
  await page.locator('[data-camp="fisier-svg"]').waitFor({ state: 'attached' });
  await page.evaluate(async () => {
    const c = new OffscreenCanvas(800, 560);
    const g = c.getContext('2d');
    if (!g) throw new Error('fără context 2d');
    const gr = g.createLinearGradient(0, 0, 800, 560);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(1, '#d8c8a0');
    g.fillStyle = gr;
    g.fillRect(0, 0, 800, 560);
    g.fillStyle = '#000000';
    g.font = 'bold 64px Arial';
    g.fillText('SUS ↑', 120, 160);
    g.fillStyle = '#c03030';
    g.fillRect(140, 380, 120, 60);
    const b = await c.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
    const dt = new DataTransfer();
    dt.items.add(new File([b], 'schita-masa.jpg', { type: 'image/jpeg' }));
    const intrare = document.querySelector<HTMLInputElement>('[data-camp="fisier-svg"]');
    if (!intrare) throw new Error('fără intrare');
    intrare.files = dt.files;
    intrare.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByTestId('trasare-panou')).toBeVisible();
}

test('captura: panoul imaginilor și mânerele', async ({ page }) => {
  await page.goto('/');
  await alege(page);
  await page.locator('[data-buton="doar-imaginea"]').click();
  await expect(page.getByTestId('trasare-panou')).toHaveCount(0);
  await documentSalvat(page, 1);
  await expect(page.getByTestId('prop-imagini')).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '.tmp/captura/imagini-4-panou.png' });
  await page.locator('[data-buton="imagine-fixata"]').click();
  await documentSalvat(page, 2);
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.tmp/captura/imagini-5-desfacuta.png' });
  // Rotirea cu ~30°, fără Shift.
  const d = JSON.parse(await documentSalvat(page, 2)) as { foi: Array<{ imagini: Array<{ x: number; y: number; inaltime: number }> }> };
  const im = d.foi[0]?.imagini[0];
  if (!im) throw new Error('fără imagine');
  const v = await vedere(page);
  const e = await ecran(page, v);
  const r = im.inaltime / 2 + 24 / v.scara;
  const a = e(im.x, im.y + r), b = e(im.x - r * Math.sin(Math.PI / 6), im.y + r * Math.cos(Math.PI / 6));
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.screenshot({ path: '.tmp/captura/imagini-6-roteste.png' });
  await page.mouse.up();
  await documentSalvat(page, 3);
  await page.waitForTimeout(800);
  await page.screenshot({ path: '.tmp/captura/imagini-7-rotita.png' });
});
