import { test, expect, type Page } from '@playwright/test';

/**
 * Modelul reliefului în vederea 3D (ADR 0310 §7, felia 18.1↑b), în Edge, cu WebGL2. O imagine de 64 × 32 px, jumătatea din
 * stânga albă, cea din dreapta neagră, făcută relief la 1 mm pe celulă și 5 mm înălțime: stânga e vârful (la fața plăcii),
 * dreapta e cu 5 mm mai jos, în golul reliefului din placă. Pixelii se citesc din canvas, cu matricea cadrului (`data-pv`).
 * Vederea pornește pe model, fără simulare; o mutare a reliefului nu urcă nicio dală; „Tăiat” simulează placa, iar
 * întoarcerea la model nu mai încarcă nimic; fără straturile din browser, modelul spune că lipsesc.
 */
test.use({ locale: 'ro-RO' });

const panza3d = (page: Page) => page.getByTestId('panza-3d');

/** Culoarea (RGB) pixelului de sub punctul (x, y, z) al lumii, în mm, după matricea ultimului cadru. */
async function culoareLa(page: Page, x: number, y: number, z: number): Promise<readonly [number, number, number]> {
  return page.evaluate(([x, y, z]) => {
    const c = document.querySelector<HTMLCanvasElement>('[data-testid="panza-3d"]');
    if (!c?.dataset.pv) throw new Error('fără cadru');
    const m = c.dataset.pv.split(',').map(Number);
    const cx = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!, cy = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
    const cw = m[3]! * x + m[7]! * y + m[11]! * z + m[15]!;
    const px = Math.floor(((cx / cw + 1) / 2) * c.width), py = Math.floor(((1 - cy / cw) / 2) * c.height);
    const d = document.createElement('canvas');
    d.width = c.width;
    d.height = c.height;
    const g = d.getContext('2d');
    if (!g) throw new Error('fără 2D');
    g.drawImage(c, 0, 0);
    const p = g.getImageData(px, py, 1, 1).data;
    return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0] as const;
  }, [x, y, z] as const);
}

const lumina = (c: readonly [number, number, number]): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/** Relieful de probă, pus prin „Importă…”: 64 × 32 mm, stânga sus (5 mm), dreapta jos (0). */
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

async function deschide3D(page: Page): Promise<void> {
  await page.locator('[data-editare="vedere-3d"]').click();
  await expect(panza3d(page)).toHaveAttribute('data-stare', 'gata', { timeout: 30_000 });
  await expect(panza3d(page)).toHaveAttribute('data-model-dale', /^[1-9]/);
}

test('pe o foaie cu relief, vederea pornește pe model: vârful la față, partea neagră 5 mm mai jos, în golul din placă', async ({ page }) => {
  await importaRelief(page);
  await deschide3D(page);
  const p = panza3d(page);
  await expect(p).toHaveAttribute('data-vedere', 'model');
  await expect(page.locator('[data-3d-vedere="model"]')).toHaveAttribute('aria-pressed', 'true');
  // O singură dală (64 × 32 de celule), la factorul 1: textura e chiar compusul.
  await expect(p).toHaveAttribute('data-model-dale', '1');
  await expect(p).toHaveAttribute('data-model-k', '1');
  await expect(page.getByTestId('stare-3d-text')).toHaveText('Modelul: vârful fiecărui relief la fața plăcii; cel mai adânc punct la 5 mm sub ea');
  // Fața plăcii, departe de relief; vârful reliefului (la față); partea neagră, la −5: mai închisă, deci fața nu o acoperă.
  const fata = await culoareLa(page, 150, 120, 0), sus = await culoareLa(page, 12, 16, 0), jos = await culoareLa(page, 52, 16, -5);
  expect(Math.abs(lumina(fata) - lumina(sus)), `vârful (${sus.join(' ')}) ca fața (${fata.join(' ')})`).toBeLessThan(6);
  expect(lumina(fata) - lumina(jos), `fundul (${jos.join(' ')}) mai închis decât fața (${fata.join(' ')})`).toBeGreaterThan(25);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('o mutare a reliefului nu urcă nicio dală; „Tăiat” simulează placa, iar înapoi la model nu se mai încarcă nimic', async ({ page }) => {
  await importaRelief(page);
  await deschide3D(page);
  const p = panza3d(page);
  await expect(p).toHaveAttribute('data-model-dale', '1');
  // Mutat cu 100 mm la dreapta, din panou: aceeași formă, deci nicio dală nouă; golul se mută cu el.
  await page.locator('[data-camp="pozitie-x"]').fill('100');
  await page.locator('[data-camp="pozitie-x"]').press('Enter');
  await expect.poll(async () => lumina(await culoareLa(page, 52, 16, 0)) - lumina(await culoareLa(page, 152, 16, -5)), { timeout: 10_000 }).toBeGreaterThan(25);
  await expect(p).toHaveAttribute('data-model-dale', '1');
  // „Tăiat”: placa simulată (fără operații, programul e refuzat, cu motivul), fără dopuri și fără modelul reliefului.
  await page.locator('[data-3d-vedere="taiat"]').click();
  await expect(p).toHaveAttribute('data-vedere', 'taiat');
  await expect(p).toHaveAttribute('data-stare', /^(refuz|gata)$/, { timeout: 30_000 });
  await page.locator('[data-3d-vedere="model"]').click();
  await expect(p).toHaveAttribute('data-stare', 'gata');
  await expect(p).toHaveAttribute('data-model-dale', '1');
});

test('straturile lipsă din browser: modelul spune că lipsesc, iar fața plăcii rămâne întreagă', async ({ page }) => {
  await importaRelief(page);
  await page.evaluate(() => new Promise<void>((ok, eroare) => {
    const r = indexedDB.deleteDatabase('cncvs2-relief');
    r.onsuccess = () => { ok(); };
    r.onerror = () => { eroare(r.error); };
  }));
  await page.locator('[data-editare="vedere-3d"]').click();
  await expect(panza3d(page)).toHaveAttribute('data-stare', 'lipsa', { timeout: 30_000 });
  await expect(page.getByTestId('stare-3d-text')).toHaveText('Lipsesc din acest browser straturile unui relief: modelul lui nu se arată');
  await expect(panza3d(page)).toHaveAttribute('data-model-dale', '0');
});
