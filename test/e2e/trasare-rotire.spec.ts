import { test, expect, type Page } from '@playwright/test';
import { documentSalvat } from './ajutor-document.ts';

/**
 * Scanarea strâmbă (ADR 0271, felia 25.4↑c) în aplicația construită: o scanare desenată în pagină de browser (pânza 2D,
 * rotită cu +2°: un chenar de 600 × 400 px tras cu o peniță de 3 px, un dreptunghi, un cerc și un text), sugestia raportului,
 * „Îndreaptă scanarea” (unghiul găsit, chenarul cu mărimea lui), unghiul scris și înapoi la cel găsit, Importă; apoi o
 * imagine fără linii drepte (cercuri): nicio sugestie, iar bifată, avertismentul.
 */

test.use({ locale: 'ro-RO' });

/** O imagine 800 × 560 desenată și rotită de browser (pozitiv: în sens invers acelor), aleasă în „Importă…”. */
async function alegeScanarea(page: Page, fel: 'desen' | 'cercuri', unghi: number): Promise<void> {
  await page.locator('[data-camp="fisier-svg"]').waitFor({ state: 'attached' });
  await page.evaluate(async ([fel, unghi]) => {
    const c = new OffscreenCanvas(800, 560);
    const g = c.getContext('2d');
    if (!g) throw new Error('fără context 2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 800, 560);
    g.translate(400, 280);
    g.rotate((-unghi * Math.PI) / 180);
    g.translate(-400, -280);
    g.strokeStyle = '#000000';
    g.fillStyle = '#000000';
    if (fel === 'desen') {
      g.lineWidth = 3;
      g.strokeRect(100, 80, 600, 400);
      g.lineWidth = 2;
      g.strokeRect(160, 140, 220, 120);
      g.beginPath();
      g.arc(520, 230, 60, 0, 2 * Math.PI);
      g.stroke();
      g.font = 'bold 40px Arial';
      g.fillText('CNC VECTOR', 160, 400);
    } else {
      g.lineWidth = 4;
      for (const [x, y, r] of [[250, 220, 90], [520, 300, 120], [300, 400, 50]] as const) {
        g.beginPath();
        g.arc(x, y, r, 0, 2 * Math.PI);
        g.stroke();
      }
    }
    const b = await c.convertToBlob({ type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(new File([b], `${fel}.png`, { type: 'image/png' }));
    const intrare = document.querySelector<HTMLInputElement>('[data-camp="fisier-svg"]');
    if (!intrare) throw new Error('fără fereastra de fișiere a importului');
    intrare.files = dt.files;
    intrare.dispatchEvent(new Event('change', { bubbles: true }));
  }, [fel, unghi] as const);
  await expect(page.getByTestId('trasare-panou')).toBeVisible();
}

/** Mărimea piesei din fereastră, în mm. */
async function marime(page: Page): Promise<[number, number]> {
  const t = (await page.getByTestId('import-marime').textContent()) ?? '';
  const m = /([\d.,]+) × ([\d.,]+) mm/.exec(t);
  if (!m) throw new Error(`mărimea: ${t}`);
  return [Number((m[1] ?? '').replace(',', '.')), Number((m[2] ?? '').replace(',', '.'))];
}

/**
 * Cea mai mică luminozitate (0–255) a previzualizării pe o fâșie verticală de 7 pixeli ai ecranului, în punctul (fx, fy) al
 * imaginii încadrate (fracțiuni din lățimea și înălțimea ei, cu proporțiile `latime` / `inaltime`): o linie subțire o atinge.
 */
async function minimLa(page: Page, fx: number, fy: number, latime: number, inaltime: number): Promise<number> {
  return page.evaluate(([fx, fy, W, H]) => {
    const c = document.querySelector<HTMLCanvasElement>('[data-testid="trasare-previzualizare"]');
    const g = c?.getContext('2d');
    if (!c || !g) throw new Error('fără previzualizare');
    const k = window.devicePixelRatio || 1, s = Math.min(c.clientWidth / W, c.clientHeight / H) * 0.95;
    const px = Math.round((c.clientWidth / 2 + (fx - 0.5) * W * s) * k), py = Math.round((c.clientHeight / 2 + (fy - 0.5) * H * s) * k);
    const d = g.getImageData(px, py - 3, 1, 7).data;
    let m = 255;
    for (let i = 0; i < d.length; i += 4) m = Math.min(m, 0.2126 * (d[i] ?? 0) + 0.7152 * (d[i + 1] ?? 0) + 0.0722 * (d[i + 2] ?? 0));
    return m;
  }, [fx, fy, latime, inaltime] as const);
}

/** Unghiul din raportul îndreptării („îndreptată cu 2,01°”), ca număr. */
async function unghiRaport(page: Page): Promise<number> {
  const t = (await page.getByTestId('trasare-rotire').textContent()) ?? '';
  const m = /îndreptată cu (-?[\d,]+)°/.exec(t.replace('−', '-'));
  if (!m) throw new Error(`raportul: ${t}`);
  return Number((m[1] ?? '').replace(',', '.'));
}

// Chenarul: 603 × 403 px pe dinafară (penița de 3 px), la 96 px pe țol: 159,5 × 106,6 mm; rotit cu 2°, cutia lui are
// 616,7 × 423,8 px, adică 163,2 × 112,1 mm.
const MM = 25.4 / 96;

test('o scanare rotită cu 2°: sugestia, „Îndreaptă scanarea” cu unghiul găsit (chenarul cu mărimea lui), unghiul scris, Importă', async ({ page }) => {
  await page.goto('/');
  await alegeScanarea(page, 'desen', 2);
  await expect(page.getByTestId('trasare-sugestie-rotire')).toHaveText('Scanarea pare rotită cu 2,0°: bifează „Îndreaptă scanarea” ca s-o îndrepți.');
  await expect(page.getByTestId('trasare-grup-foaie')).toHaveAttribute('aria-label', 'Îndreptarea');
  await expect(page.locator('[data-camp="trasare-rotire-unghi"]')).toHaveCount(0);
  const [l0, h0] = await marime(page);
  expect(Math.abs(l0 - 616.7 * MM)).toBeLessThan(0.6);
  expect(Math.abs(h0 - 423.8 * MM)).toBeLessThan(0.6);
  // O zonă trasă pe previzualizare (în pixelii imaginii de acum) se scoate când se schimbă îndreptarea.
  await page.locator('[data-buton="trasare-zona"]').click();
  const b = await page.getByTestId('trasare-previzualizare').boundingBox();
  if (!b) throw new Error('fără previzualizare');
  await page.mouse.move(b.x + 0.35 * b.width, b.y + 0.35 * b.height);
  await page.mouse.down();
  await page.mouse.move(b.x + 0.65 * b.width, b.y + 0.65 * b.height, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId('trasare-zona')).toBeVisible();
  await page.locator('[data-buton="trasare-zona"]').click();
  await page.locator('[data-camp="trasare-rotire"]').check();
  await expect(page.getByTestId('trasare-zona')).toHaveCount(0);
  await expect(page.getByTestId('trasare-rotire')).toContainText('(unghiul găsit singur).');
  expect(Math.abs((await unghiRaport(page)) - 2)).toBeLessThanOrEqual(0.05);
  await expect(page.getByTestId('trasare-sugestie-rotire')).toHaveCount(0);
  await expect(page.locator('[data-camp="trasare-rotire-unghi"]')).toHaveAttribute('placeholder', /^2,0\d$/);
  await expect(page.locator('[data-camp="trasare-rotire-unghi"]')).toHaveValue('');
  // Raportul spune imaginea din fișier, nu pânza rotită (819 × 588 px).
  await expect(page.getByTestId('trasare-imagine')).toHaveText('Imaginea: 800 × 560 px');
  // Îndreptat, chenarul are mărimea lui (603 × 403 px).
  await expect.poll(async () => Math.abs((await marime(page))[0] - 603 * MM)).toBeLessThan(0.6);
  expect(Math.abs((await marime(page))[1] - 403 * MM)).toBeLessThan(0.6);
  // Sub vectori, imaginea îndreptată: latura de sus a chenarului e orizontală (pe pânza de 819 × 588, la y = 94), deci
  // trece pe la 20 % și la 80 % din lățime; în scanarea rotită, la 80 % ar fi cu ~19 px mai sus.
  await page.locator('[data-camp="trasare-vedere-imagine"]').check();
  for (const fx of [0.2, 0.8]) await expect.poll(() => minimLa(page, fx, 94 / 588, 819, 588)).toBeLessThan(128);
  await page.locator('[data-camp="trasare-vedere-ambele"]').check();
  // Un unghi scris (cu minusul tipografic și virgula): folosit în locul celui găsit, iar zona (în pixelii pânzei de până
  // atunci) se scoate; șters, înapoi la cel găsit.
  await page.locator('[data-buton="trasare-zona"]').click();
  await page.mouse.move(b.x + 0.35 * b.width, b.y + 0.35 * b.height);
  await page.mouse.down();
  await page.mouse.move(b.x + 0.65 * b.width, b.y + 0.65 * b.height, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId('trasare-zona')).toBeVisible();
  await page.locator('[data-buton="trasare-zona"]').click();
  await page.locator('[data-camp="trasare-rotire-unghi"]').fill('−1,5');
  await expect(page.getByTestId('trasare-rotire')).toContainText('(unghiul scris de tine).');
  await expect(page.getByTestId('trasare-zona')).toHaveCount(0);
  expect(await unghiRaport(page)).toBe(-1.5);
  await page.locator('[data-camp="trasare-rotire-unghi"]').fill('');
  await expect(page.getByTestId('trasare-rotire')).toContainText('(unghiul găsit singur).');
  await expect.poll(async () => Math.abs((await marime(page))[0] - 603 * MM)).toBeLessThan(0.6);
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const doc = await documentSalvat(page, 1);
  expect(doc.split('"tip":"element"').length - 1).toBeGreaterThan(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('cercuri, fără linii drepte: nicio sugestie; bifată, avertismentul cere unghiul, iar unul scris se folosește', async ({ page }) => {
  await page.goto('/');
  await alegeScanarea(page, 'cercuri', 3);
  await expect(page.getByTestId('trasare-abatere')).toBeVisible();
  await expect(page.getByTestId('trasare-sugestie-rotire')).toHaveCount(0);
  await page.locator('[data-camp="trasare-rotire"]').check();
  await expect(page.getByTestId('trasare-rotire-negasit')).toHaveText('Unghiul scanării nu s-a găsit (desenul n-are destule linii drepte sau rânduri de text): scrie-l în „Unghiul”.');
  await expect(page.locator('[data-camp="trasare-rotire-unghi"]')).toHaveAttribute('placeholder', '');
  await page.locator('[data-camp="trasare-rotire-unghi"]').fill('3');
  await expect(page.getByTestId('trasare-rotire')).toContainText('îndreptată cu 3,00° (unghiul scris de tine).');
  await expect(page.getByTestId('trasare-rotire-negasit')).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
