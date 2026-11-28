import { test, expect } from '@playwright/test';
import { deflateSync } from 'node:zlib';
import { scrieTiff } from '../unit/ajutor-tiff.ts';

/**
 * TIFF-ul ca relief, în aplicația construită (ADR 0322 §5.1, felia 18.1↑g-2): browserul nu decodează TIFF, deci până acum
 * „Relief din imagine” îl refuza. Un TIFF gri pe 16 biți (Deflate, cu predictorul) de 64 × 32 px, la 254 px pe țol: jumătatea
 * din stânga la 65 535, cea din dreapta la 32 768. Relieful are o celulă de 0,1 mm (din DPI-ul fișierului), iar înălțimile
 * sunt din griul de 16 biți: dreapta la 32 768 / 65 535 · 5 = 2,50004 mm („2,5”; pe 8 biți ar fi fost 128 / 255 · 5 = 2,51).
 */

test.use({ locale: 'ro-RO' });

function tiff16(): Buffer {
  const w = 64, h = 32, dif = new Uint8Array(2 * w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = x < 32 ? 65535 : 32768, st = x === 0 ? 0 : x - 1 < 32 ? 65535 : 32768, d = (v - st + 65536) % 65536, q = 2 * (y * w + x);
      dif[q] = d & 255; dif[q + 1] = d >>> 8;
    }
  }
  return Buffer.from(scrieTiff([{
    etichete: [[256, 4, [w]], [257, 4, [h]], [258, 3, [16]], [259, 3, [8]], [262, 3, [1]], [278, 4, [h]], [282, 5, [254, 1]], [283, 5, [254, 1]], [296, 3, [2]], [317, 3, [2]]],
    bucati: [deflateSync(dif)],
  }]));
}

test('un TIFF pe 16 biți se face relief: celula din DPI-ul lui, înălțimile din griul de 16 biți', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-camp="fisier-svg"]')).toBeAttached();
  await page.locator('[data-camp="fisier-svg"]').setInputFiles({ name: 'scanare-16.tif', mimeType: 'image/tiff', buffer: tiff16() });
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.getByTestId('import-rezultat').locator('label').filter({ has: page.locator('[data-camp="import-rezultat-relief"]') }).click();
  await expect(page.getByTestId('relief-refuz')).toHaveCount(0);
  await expect(page.getByTestId('relief-16-biti')).toBeVisible();
  await expect(page.getByTestId('relief-grila')).toHaveText('Grila: 64 × 32 celule de 0,1 mm (o celulă pe pixel); relieful are 6,4 × 3,2 mm.');
  await expect(page.getByTestId('relief-z')).toHaveText('Înălțimile: de la 2,5 la 5 mm.');
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('prop-relief')).toBeVisible();
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('un TIFF pe care relieful nu-l citește își spune motivul (JPEG în TIFF), nu „browserul nu decodează formatul”', async ({ page }) => {
  await page.goto('/');
  const jpeg = Buffer.from(scrieTiff([{ etichete: [[256, 4, [2]], [257, 4, [1]], [258, 3, [8]], [259, 3, [7]], [262, 3, [1]], [278, 4, [1]]], bucati: [Uint8Array.of(1, 2)] }]));
  await expect(page.locator('[data-camp="fisier-svg"]')).toBeAttached();
  await page.locator('[data-camp="fisier-svg"]').setInputFiles({ name: 'jpeg.tif', mimeType: 'image/tiff', buffer: jpeg });
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.getByTestId('import-rezultat').locator('label').filter({ has: page.locator('[data-camp="import-rezultat-relief"]') }).click();
  await expect(page.getByTestId('relief-refuz')).toContainText('TIFF-ul are ceva ce relieful nu citește încă (Compression=7 (JPEG))');
});
