import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

/**
 * Vederea 3D (felia 4.3↑, ADR 0057), în Edge, cu WebGL2: „3D” din extensia barei simulează documentul de acum și desenează
 * placa tăiată; pixelii se citesc din canvas (`preserveDrawingBuffer`), iar punctele lumii se duc pe ecran cu matricea
 * cadrului (`data-pv`). Apropiată destul, zona din jurul centrului se simulează la 0,1 mm. Bucata vine abia la primul clic.
 */
test.use({ locale: 'ro-RO' });

const buton = (page: Page) => page.locator('[data-editare="vedere-3d"]');
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

/** Punctul paginii (CSS px) de sub un punct al lumii. */
async function peEcran(page: Page, x: number, y: number, z: number): Promise<{ x: number; y: number }> {
  const box = await panza3d(page).boundingBox();
  if (!box) throw new Error('fără cutie');
  const m = (await panza3d(page).getAttribute('data-pv'))!.split(',').map(Number);
  const cx = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!, cy = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
  const cw = m[3]! * x + m[7]! * y + m[11]! * z + m[15]!;
  return { x: box.x + ((cx / cw + 1) / 2) * box.width, y: box.y + ((1 - cy / cw) / 2) * box.height };
}

async function deschide(page: Page): Promise<void> {
  await buton(page).click();
  await expect(panza3d(page)).toHaveAttribute('data-stare', 'gata', { timeout: 30_000 });
  await expect(panza3d(page)).toHaveAttribute('data-cadre', /^[1-9]/);
}

test('bucata vine la primul clic; placa de 300 × 200 la 0,25 mm, celulele nucleului (bloc 1); șanțul profilului se vede, fața nu', async ({ page }) => {
  const cereri: string[] = [];
  page.on('request', (r) => { cereri.push(r.url()); });
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await expect(buton(page)).toBeVisible();
  expect(cereri.filter((u) => /\/assets\/Vedere3D-/.test(u)), 'nimic din vederea 3D înaintea clicului').toEqual([]);
  await deschide(page);
  expect(cereri.filter((u) => /\/assets\/Vedere3D-[\w-]+\.js$/.test(u))).toHaveLength(1);
  await expect(buton(page)).toHaveAttribute('aria-pressed', 'true');
  const p = panza3d(page);
  await expect(p).toHaveAttribute('data-relief', '1200x800');
  await expect(p).toHaveAttribute('data-bloc', '1');
  await expect(p).toHaveAttribute('data-celula', '0.25');
  await expect(p).toHaveAttribute('data-adancime', '3');
  await expect(page.getByTestId('stare-3d-text')).toHaveText('Placa simulată la 0,25 mm');
  // Dreptunghiul 100 × 60 din (20, 20), profilat pe exterior cu Ø6 la 3 mm: șanțul e între x 14 și 20 (centrul la 17).
  const sant = await culoareLa(page, 17, 50, -3), piesa = await culoareLa(page, 70, 50, 0), afara = await culoareLa(page, 5, 50, 0);
  expect(lumina(piesa) - lumina(sant), `șanțul (${sant.join(' ')}) e mai închis decât fața (${piesa.join(' ')})`).toBeGreaterThan(25);
  expect(Math.abs(lumina(piesa) - lumina(afara)), 'fața plăcii, înăuntru și afară, la fel').toBeLessThan(6);
  // Bara selecției (pe cutia 2D) nu stă peste vederea 3D.
  await expect(page.locator('.bara-selectie')).toBeHidden();
});

test('apropiată spre șanț, zona din jur se simulează la 0,1 mm (fereastra pe grila dalelor, în placă); placa rămâne la 0,25', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await deschide(page);
  const p = panza3d(page);
  await expect(page.getByTestId('stare-3d-fin')).toHaveText('Apropie-te pentru 0,1 mm');
  const tinta = await peEcran(page, 17, 50, -3);
  await page.mouse.move(tinta.x, tinta.y);
  for (let k = 0; k < 3; k++) await page.mouse.wheel(0, -400);
  await expect(p).toHaveAttribute('data-fin', 'gata', { timeout: 30_000 });
  const [x0, y0, latime, inaltime] = (await p.getAttribute('data-fereastra'))!.split(',').map(Number);
  // Placa are 200 mm pe Y (sub latura de 204,8): toată; pe X, 204,8 mm, de la un multiplu de 1,6 mm.
  expect([y0, inaltime]).toEqual([0, 200]);
  expect(latime).toBeCloseTo(204.8, 6);
  expect(Math.abs(x0! / 1.6 - Math.round(x0! / 1.6))).toBeLessThan(1e-6);
  expect(x0! >= 0 && x0! + latime! <= 300 + 1e-6).toBe(true);
  expect(x0! <= 17 && 17 <= x0! + latime!).toBe(true);
  await expect(p).toHaveAttribute('data-celula', '0.25');
  await expect(page.getByTestId('stare-3d-fin')).toHaveText('Zona de 204,8 × 200 mm la 0,1 mm');
  // Șanțul, la 0,1 mm: tot mai închis decât fața.
  const sant = await culoareLa(page, 17, 50, -3), piesa = await culoareLa(page, 30, 50, 0);
  expect(lumina(piesa) - lumina(sant)).toBeGreaterThan(25);
});

test('tragerea rotește, butonul drept mută, dublul clic încadrează; tastele rotesc și apropie', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await deschide(page);
  const p = panza3d(page);
  const pv0 = await p.getAttribute('data-pv'), d0 = Number(await p.getAttribute('data-distanta'));
  await expect(p).toHaveAttribute('data-tinta', '150,100');
  const box = (await p.boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 120, cy + 40, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => p.getAttribute('data-pv')).not.toBe(pv0);
  await expect(p).toHaveAttribute('data-tinta', '150,100');
  expect(Number(await p.getAttribute('data-distanta'))).toBe(d0);
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(cx - 80, cy + 30, { steps: 4 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(() => p.getAttribute('data-tinta')).not.toBe('150,100');
  await p.dblclick();
  await expect(p).toHaveAttribute('data-tinta', '150,100');
  await expect(p).toHaveAttribute('data-pv', pv0!);
  await p.focus();
  await page.keyboard.press('+');
  await expect.poll(async () => Number(await p.getAttribute('data-distanta'))).toBeLessThan(d0);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('0');
  await expect(p).toHaveAttribute('data-pv', pv0!);
});

test('documentul schimbat după simulare se spune; „Simulează din nou” îl simulează; Esc și o unealtă întorc la 2D', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await deschide(page);
  await expect(page.getByTestId('stare-3d-vechi')).toHaveCount(0);
  await adauga(page, 'cerc');
  await expect(page.getByTestId('stare-3d-vechi')).toContainText('Documentul s-a schimbat după simulare.');
  await expect(panza3d(page)).toHaveAttribute('data-vechi', 'true');
  await page.locator('[data-3d="din-nou"]').click();
  await expect(panza3d(page)).toHaveAttribute('data-stare', 'gata', { timeout: 30_000 });
  await expect(panza3d(page)).toHaveAttribute('data-vechi', 'false');
  await expect(page.getByTestId('stare-3d-vechi')).toHaveCount(0);
  await panza3d(page).focus();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('vedere-3d')).toHaveCount(0);
  await expect(buton(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('panza')).toBeVisible();
  await deschide(page);
  await page.locator('[data-unealta="dreptunghi"]').click();
  await expect(page.getByTestId('vedere-3d')).toHaveCount(0);
  await expect(page.locator('[data-unealta="dreptunghi"]')).toHaveAttribute('aria-pressed', 'true');
});

test('fără operații: refuzul CAM-ului, cu motivul', async ({ page }) => {
  await page.goto('/');
  await buton(page).click();
  await expect(panza3d(page)).toHaveAttribute('data-stare', 'refuz', { timeout: 30_000 });
  await expect(page.getByTestId('stare-3d-text')).toHaveText('Placa nu se poate simula: nicio formă n-are o operație de tăiere');
  await expect(page.getByTestId('stare-3d-text')).toHaveClass(/cip-rosu/);
});

test('fără WebGL2: se spune, iar simularea nu pornește', async ({ page: fara }) => {
  await fara.addInitScript(() => {
    const vechi = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, tip: string, ...rest: unknown[]) {
      if (tip === 'webgl2') return null;
      return (vechi as (...a: unknown[]) => unknown).call(this, tip, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  const workere: string[] = [];
  fara.on('worker', (w) => { workere.push(w.url()); });
  await fara.goto('/');
  await adauga(fara, 'dreptunghi');
  await buton(fara).click();
  await expect(panza3d(fara)).toHaveAttribute('data-stare', 'fara-webgl');
  await expect(fara.getByTestId('stare-3d-text')).toHaveText('Vederea 3D nu se poate afișa: WebGL2 indisponibil în browser');
  await fara.waitForTimeout(500);
  expect(workere.filter((u) => /lucratorSimulare/.test(u))).toEqual([]);
});
