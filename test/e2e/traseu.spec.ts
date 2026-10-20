import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

/**
 * Traseul pe pânză (felia 2.8d, ADR 0038 §1–§3), în browserul adevărat (Edge, WebGL2): „Arată traseul” calculează și
 * desenează; traseul vechi se stinge, T îl recalculează; refuzul CAM-ului, lipsa WebGL2 și contextul pierdut au cipul lor.
 * Pixelii se citesc din canvasul WebGL2 (`preserveDrawingBuffer`), cu vederea pânzei.
 */
test.use({ locale: 'ro-RO' });

const strat = (page: Page) => page.getByTestId('strat-traseu');
const cip = (page: Page) => page.getByTestId('traseu-stare');
const buton = (page: Page) => page.locator('[data-actiune="vedere.traseu"]');

/** Opacitatea maximă a stratului într-un pătrat de ±1 px fizic în jurul punctului (x, y) al foii (mm). */
async function alfaLa(page: Page, x: number, y: number): Promise<number> {
  return page.evaluate(([x, y]) => {
    const p = document.querySelector<HTMLCanvasElement>('[data-testid="panza"]');
    const s = document.querySelector<HTMLCanvasElement>('[data-testid="strat-traseu"]');
    if (!p || !s) return -1;
    const scara = Number(p.dataset.scara), tx = Number(p.dataset.tx), ty = Number(p.dataset.ty), dpr = Number(p.dataset.dpr);
    const c = document.createElement('canvas');
    c.width = s.width;
    c.height = s.height;
    const g = c.getContext('2d');
    if (!g) return -1;
    g.drawImage(s, 0, 0);
    const px = Math.floor((x * scara + tx) * dpr), py = Math.floor((ty - y * scara) * dpr);
    const d = g.getImageData(px - 1, py - 1, 3, 3).data;
    let a = 0;
    for (let i = 3; i < d.length; i += 4) a = Math.max(a, d[i] ?? 0);
    return a;
  }, [x, y] as const);
}

async function arata(page: Page): Promise<void> {
  await buton(page).click();
  await expect(strat(page)).toHaveAttribute('data-varfuri', /^[1-9]/);
}

test('dreptunghiul profilat pe exterior cu Ø6: traseul cade la 3 mm de contur, nu pe el și nu înăuntru', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await arata(page);
  await expect(buton(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(cip(page)).toHaveCount(0);
  // Dreptunghiul 100 × 60 din (20, 20): rama traseului e la x 17 / 123 și y 17 / 83.
  await expect.poll(() => alfaLa(page, 70, 17)).toBeGreaterThan(0);
  expect(await alfaLa(page, 70, 83)).toBeGreaterThan(0);
  expect(await alfaLa(page, 17, 50)).toBeGreaterThan(0);
  expect(await alfaLa(page, 123, 50)).toBeGreaterThan(0);
  expect(await alfaLa(page, 70, 20)).toBe(0);
  expect(await alfaLa(page, 70, 50)).toBe(0);
});

test('traseul vechi se stinge, cu cipul lui; T îl calculează din nou; încă un T, la zi, îl ascunde', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await arata(page);
  await adauga(page, 'cerc');
  await expect(strat(page)).toHaveAttribute('data-stins', 'true');
  await expect(cip(page)).toHaveAttribute('data-stare', 'traseu.vechi');
  await page.keyboard.press('t');
  await expect(strat(page)).toHaveAttribute('data-stins', 'false');
  await expect(cip(page)).toHaveCount(0);
  await page.keyboard.press('t');
  await expect(strat(page)).toHaveCount(0);
  await expect(buton(page)).toHaveAttribute('aria-pressed', 'false');
});

test('un document pe care CAM-ul îl refuză: cipul spune de ce, fără strat', async ({ page }) => {
  await page.goto('/');
  // Două dreptunghiuri în același loc: regiunea păstrată nu se știe.
  await adauga(page, 'dreptunghi');
  await adauga(page, 'dreptunghi');
  await buton(page).click();
  await expect(cip(page)).toHaveAttribute('data-stare', 'traseu.refuz');
  await expect(cip(page)).toContainText('regiunea păstrată');
  await expect(strat(page)).toHaveCount(0);
});

test('fără WebGL2: cipul spune că traseul nu se poate afișa; pânza merge mai departe', async ({ page }) => {
  await page.addInitScript(() => {
    const vechi = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, tip: string, ...rest: unknown[]) {
      return tip === 'webgl2' ? null : (vechi as (...a: unknown[]) => unknown).call(this, tip, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await buton(page).click();
  await expect(cip(page)).toHaveAttribute('data-stare', 'traseu.fara-webgl');
  await expect(page.getByTestId('lista-vectori').locator('li')).toHaveCount(1);
});

test('contextul WebGL pierdut: cipul o spune; refăcut, traseul revine singur', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await arata(page);
  await page.evaluate(() => {
    const s = document.querySelector<HTMLCanvasElement>('[data-testid="strat-traseu"]');
    const ext = s?.getContext('webgl2')?.getExtension('WEBGL_lose_context');
    (window as unknown as { pierde: WEBGL_lose_context | null | undefined }).pierde = ext;
    ext?.loseContext();
  });
  await expect(cip(page)).toHaveAttribute('data-stare', 'traseu.context');
  await page.evaluate(() => { (window as unknown as { pierde?: WEBGL_lose_context }).pierde?.restoreContext(); });
  await expect(cip(page)).toHaveCount(0);
  await expect.poll(() => alfaLa(page, 70, 17)).toBeGreaterThan(0);
});

test('după un export reușit, traseul arătat se reface pe documentul exportat (nu mai e vechi)', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await arata(page);
  await adauga(page, 'cerc');
  await expect(strat(page)).toHaveAttribute('data-stins', 'true');
  await page.locator('[data-actiune="export.gcode"]').click();
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await d;
  await expect(strat(page)).toHaveAttribute('data-stins', 'false');
  await expect(cip(page)).toHaveCount(0);
});
