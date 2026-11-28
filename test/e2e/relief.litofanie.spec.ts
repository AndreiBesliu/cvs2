import { test, expect, type Page } from '@playwright/test';
import { gri } from '../../src/relief/imagine.ts';
import { litofanieDinGri } from '../../src/relief/litofanie.ts';
import { stratDinGrila } from '../../src/relief/strat.ts';
import { documentSalvat } from './ajutor-document.ts';

/**
 * Litofania în aplicația construită (ADR 0321, felia 18.1↑f): o imagine de 30 × 10 px cu trei pătrate (alb, gri 128, negru),
 * „Litofanie” din capul ferestrei, lățimea 30 mm (un pixel de 1 mm) și rama de 2 mm (două celule în jur): grila 34 × 14,
 * grosimile de la 0,8 la 3 mm; previzualizarea arată lumina din spate (albul luminos, negrul și rama întunecate), oglindită
 * din spate; „Importă” pune piesa, cu harta ca în Node.
 */

test.use({ locale: 'ro-RO' });

const GRI = [255, 128, 0];
const NX = 30, NY = 10;

async function importaPatrate(page: Page): Promise<void> {
  await page.evaluate(async ([nx, ny, gri]) => {
    const c = new OffscreenCanvas(nx, ny), g = c.getContext('2d');
    if (!g) throw new Error('fără 2D');
    for (let k = 0; k < 3; k++) { const v = gri[k] ?? 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(10 * k, 0, 10, ny); }
    const b = await c.convertToBlob({ type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(new File([b], 'patrate.png', { type: 'image/png' }));
    const intrare = document.querySelector<HTMLInputElement>('[data-camp="fisier-svg"]');
    if (!intrare) throw new Error('fără fereastra de fișiere a importului');
    intrare.files = dt.files;
    intrare.dispatchEvent(new Event('change', { bubbles: true }));
  }, [NX, NY, GRI] as const);
  await expect(page.getByRole('dialog')).toHaveCount(1);
}

/** Griul previzualizării în celula (i, j) a grilei (j în sus, ca relieful; pânza are rândurile de sus în jos). */
function griPreviz(page: Page, i: number, j: number): Promise<number> {
  return page.evaluate(([i, j]) => {
    const p = document.querySelector<HTMLCanvasElement>('[data-testid="relief-previz"]');
    if (!p) throw new Error('fără previzualizare');
    return p.getContext('2d')?.getImageData(i, p.height - 1 - j, 1, 1).data[0] ?? -1;
  }, [i, j] as const);
}

test('litofania: grosimile, rama, lumina din spate (și oglinda din spate), apoi piesa, cu harta ca în Node', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-camp="fisier-svg"]')).toBeAttached();
  await importaPatrate(page);
  await page.getByTestId('import-rezultat').locator('label').filter({ has: page.locator('[data-camp="import-rezultat-litofanie"]') }).click();
  await expect(page.getByTestId('relief-fereastra')).toBeVisible();
  // Câmpurile reliefului (sensul, înălțimea, baza) lasă locul grosimilor.
  await expect(page.locator('[data-camp="relief-inaltime"]')).toHaveCount(0);
  await expect(page.locator('[data-camp="litofanie-tmin"]')).toHaveValue('0,8');
  await expect(page.locator('[data-camp="litofanie-tmax"]')).toHaveValue('3');
  // Rama întâi, cu lățimea încă din DPI (30 px la 96 px pe țol = 7,9375 mm): câmpul arată lățimea imaginii, fără ramă.
  await page.locator('[data-camp="litofanie-rama"]').fill('2');
  await page.locator('[data-camp="litofanie-rama"]').press('Enter');
  await expect(page.getByTestId('relief-grila')).toContainText('celule de 0,2646 mm');
  await expect(page.locator('[data-camp="relief-latime"]')).toHaveValue('7,938');
  await page.locator('[data-camp="relief-latime"]').fill('30');
  await page.locator('[data-camp="relief-latime"]').press('Enter');
  await expect(page.getByTestId('relief-grila')).toHaveText('Grila: 34 × 14 celule de 1 mm (o celulă pe pixel); relieful are 34 × 14 mm.');
  // Lățimea e a imaginii, fără ramă.
  await expect(page.locator('[data-camp="relief-latime"]')).toHaveValue('30');
  await expect(page.getByTestId('relief-z')).toHaveText('Grosimile: de la 0,8 la 3 mm.');
  await expect(page.getByTestId('litofanie-taiere')).toContainText('planul zero la grosimea plăcii');
  // Lumina din spate: albul (celula 7 a rândului din mijloc) luminos, negrul (27) și rama (0) întunecate, griul la jumătate.
  await expect.poll(async () => [await griPreviz(page, 7, 7), await griPreviz(page, 27, 7), await griPreviz(page, 0, 7)]).toEqual([255, 0, 0]);
  expect(Math.abs(await griPreviz(page, 17, 7) - 128)).toBeLessThanOrEqual(1);
  // Din spate: oglindită, deci albul trece la dreapta.
  await page.locator('[data-camp="litofanie-spate"]').check();
  await expect.poll(async () => [await griPreviz(page, 7, 7), await griPreviz(page, 27, 7)]).toEqual([0, 255]);
  await page.locator('[data-camp="litofanie-fata"]').check();
  await expect.poll(async () => griPreviz(page, 7, 7)).toBe(255);
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Harta, ca în Node: aceleași grosimi, aceeași amprentă.
  const rgba = new Uint8Array(NX * NY * 4);
  for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) { const v = GRI[Math.floor(x / 10)] ?? 0; rgba.set([v, v, v, 255], 4 * (y * NX + x)); }
  const lit = litofanieDinGri(gri(rgba, NX, NY, 'l'), NX, NY, { tmin: 0.8, tmax: 3, rama: 2, spate: false });
  const st = await stratDinGrila(lit.valori, lit.nx, lit.ny);
  const d = JSON.parse(await documentSalvat(page, 1)) as { piese: Array<{ radacina: { copii: Array<{ forma: { nx: number; ny: number; celula: number; straturi: Array<{ dale: string }> } }> } }> };
  const forma = d.piese[0]?.radacina.copii[0]?.forma;
  expect([forma?.nx, forma?.ny, forma?.celula]).toEqual([34, 14, 1]);
  expect(forma?.straturi[0]?.dale).toBe(st.amprenta);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
