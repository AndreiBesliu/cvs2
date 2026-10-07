import { test, expect, type Page } from '@playwright/test';
import { judecaCerc, type Cerneala } from '../oracles/panza.ts';

test.use({ locale: 'ro-RO' });

type VederePanza = { scara: number; tx: number; ty: number; dpr: number };

/** Așteaptă ca ultima cerere trimisă workerului să fie și cea afișată, apoi citește vederea. */
async function vedere(page: Page): Promise<VederePanza> {
  const panza = page.getByTestId('panza');
  await expect.poll(async () => {
    const [c, a] = await Promise.all([panza.getAttribute('data-cerere'), panza.getAttribute('data-afisata')]);
    return c !== null && c === a && c !== '0';
  }).toBe(true);
  const nr = async (n: string): Promise<number> => Number(await panza.getAttribute(n));
  return { scara: await nr('data-scara'), tx: await nr('data-tx'), ty: await nr('data-ty'), dpr: await nr('data-dpr') };
}

/**
 * Cerneala unui dreptunghi al pânzei: pe fiecare pixel, cât diferă de culoarea foii, 0…1 (1 = culoarea liniei plină).
 * Mărimea e în pixeli fizici.
 */
async function cerneala(page: Page, x0: number, y0: number, w: number, h: number): Promise<Cerneala> {
  const p = await page.evaluate(([x0, y0, w, h]) => {
    const el = document.querySelector('[data-testid="panza"]') as HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = el.width;
    c.height = el.height;
    const g = c.getContext('2d');
    if (!g) return [];
    g.drawImage(el, 0, 0);
    // Decupajul rămâne în pânză: în afara ei, getImageData dă negru transparent, care ar părea cerneală.
    if (x0 < 0 || y0 < 0 || x0 + w > c.width || y0 + h > c.height) throw new Error(`decupaj în afara pânzei: ${x0},${y0} ${w}×${h} din ${c.width}×${c.height}`);
    const d = g.getImageData(x0, y0, w, h).data;
    const css = getComputedStyle(document.documentElement);
    const hex = (n: string): number[] => { const v = css.getPropertyValue(n).trim(); return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)); };
    const foaie = hex('--panza-foaie');
    const linie = hex('--panza-selectie');
    const plin = Math.abs((linie[0] ?? 0) - (foaie[0] ?? 0)) + Math.abs((linie[1] ?? 0) - (foaie[1] ?? 0)) + Math.abs((linie[2] ?? 0) - (foaie[2] ?? 0));
    const rez: number[] = [];
    for (let k = 0; k < w * h; k++) {
      const dif = Math.abs((d[4 * k] ?? 0) - (foaie[0] ?? 0)) + Math.abs((d[4 * k + 1] ?? 0) - (foaie[1] ?? 0)) + Math.abs((d[4 * k + 2] ?? 0) - (foaie[2] ?? 0));
      rez.push(Math.min(1, dif / plin));
    }
    return rez;
  }, [x0, y0, w, h] as const);
  return { x0, y0, w, h, p };
}

test('oracolul pânzei: cercul R15 desenat stă la cel mult 1 px de cercul de pe hârtie, fără goluri', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  // Mărim de două ori în jurul centrului cercului (70, 50 mm): raza trece de 100 px, iar cercul rămâne în pânză.
  let v = await vedere(page);
  const box = await page.getByTestId('panza').boundingBox();
  if (!box) throw new Error('pânza n-are cutie');
  for (let i = 0; i < 2; i++) {
    await page.mouse.move(box.x + v.tx + 70 * v.scara, box.y + v.ty - 50 * v.scara);
    await page.mouse.wheel(0, -400);
    v = await vedere(page);
  }
  // Cercul așteptat, în pixeli fizici: centrul (70, 50) mm și raza 15 mm, prin vederea citită de pe pânză.
  const s = v.scara * v.dpr;
  const cerc = { cx: (70 * v.scara + v.tx) * v.dpr, cy: (-50 * v.scara + v.ty) * v.dpr, r: 15 * s };
  expect(cerc.r).toBeGreaterThan(100);
  const m = Math.ceil(cerc.r + 6);
  const c = await cerneala(page, Math.round(cerc.cx - m), Math.round(cerc.cy - m), 2 * m, 2 * m);
  const verdict = judecaCerc(c, cerc);
  expect(verdict.goluri).toBe(0);
  expect(verdict.abatereMaxima).toBeLessThanOrEqual(0.5);
  // Controalele negative: aceeași imagine, judecată față de o rază greșită cu 1 % sau un centru mutat cu 1 px, pică.
  expect(judecaCerc(c, { ...cerc, r: cerc.r * 1.01 }).abatereMaxima).toBeGreaterThan(0.5);
  expect(judecaCerc(c, { ...cerc, cx: cerc.cx + 1 }).abatereMaxima).toBeGreaterThan(0.5);
});

test('clic, mutare prin tragere, anulare: totul prin acțiuni, cu poziția din linia de stare', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  const v = await vedere(page);
  const box = await page.getByTestId('panza').boundingBox();
  if (!box) throw new Error('pânza n-are cutie');
  const ecran = (x: number, y: number) => ({ x: box.x + v.tx + x * v.scara, y: box.y + v.ty - y * v.scara });
  // Clic pe marginea cercului (85, 50 mm), care e și înăuntrul dreptunghiului: cercul e cel de deasupra? Nu: ultimul
  // adăugat e dreptunghiul, deci el e deasupra și e selectat.
  const p = ecran(85, 50);
  await page.mouse.click(p.x, p.y);
  await expect(page.getByTestId('selectie')).toContainText('dreptunghi 100.00 × 60.00 la X 20.00, Y 20.00');
  // Clic în afara oricărei forme: nimic selectat.
  const gol = ecran(250, 150);
  await page.mouse.click(gol.x, gol.y);
  await expect(page.getByTestId('selectie')).toContainText('Nimic selectat');
  // Tragere de 100 px spre dreapta pe dreptunghi.
  const a = ecran(110, 70);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 50, a.y, { steps: 5 });
  await page.mouse.move(a.x + 100, a.y, { steps: 5 });
  await page.mouse.up();
  const x = (20 + 100 / v.scara).toFixed(2);
  await expect(page.getByTestId('selectie')).toContainText(`la X ${x}, Y 20.00`);
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('selectie')).toContainText('la X 20.00, Y 20.00');
  await page.keyboard.press('Control+y');
  await expect(page.getByTestId('selectie')).toContainText(`la X ${x}, Y 20.00`);
});

test('pan cu butonul din mijloc și zoomul limitat la 1 000 px/mm', async ({ page }) => {
  await page.goto('/');
  const v0 = await vedere(page);
  const box = await page.getByTestId('panza').boundingBox();
  if (!box) throw new Error('pânza n-are cutie');
  const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(c.x, c.y);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(c.x + 40, c.y + 30, { steps: 4 });
  await page.mouse.up({ button: 'middle' });
  const v1 = await vedere(page);
  expect(v1.tx - v0.tx).toBeCloseTo(40, 0);
  expect(v1.ty - v0.ty).toBeCloseTo(30, 0);
  for (let i = 0; i < 25; i++) await page.mouse.wheel(0, -2000);
  const v2 = await vedere(page);
  expect(v2.scara).toBeLessThanOrEqual(1000);
  expect(v2.scara).toBeGreaterThan(500);
});

test('butoanele inactive spun de ce: „Anulează” fără nimic de anulat', async ({ page }) => {
  await page.goto('/');
  const anuleaza = page.locator('[data-actiune="istoric.anuleaza"]');
  await expect(anuleaza).toBeDisabled();
  await expect(anuleaza).toHaveAttribute('title', 'Nimic de anulat.');
});
