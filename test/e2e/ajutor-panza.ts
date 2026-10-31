import { expect, type Page } from '@playwright/test';

export type VederePanza = { scara: number; tx: number; ty: number; dpr: number };

/**
 * Așteaptă ca ultima cerere trimisă workerului să fie și cea afișată, apoi citește vederea. Întâi două cadre: cererea unei
 * schimbări abia făcute (un clic în listă) pleacă dintr-un efect, după randare; fără ele, perechea veche „3/3” trece drept
 * afișată (20.10: o captură cu selecția de dinainte).
 */
export async function vedere(page: Page): Promise<VederePanza> {
  await page.evaluate(() => new Promise<void>((ok) => { requestAnimationFrame(() => { requestAnimationFrame(() => { ok(); }); }); }));
  const panza = page.getByTestId('panza');
  await expect.poll(async () => {
    const [c, a] = await Promise.all([panza.getAttribute('data-cerere'), panza.getAttribute('data-afisata')]);
    return c !== null && c === a && c !== '0';
  }).toBe(true);
  const nr = async (n: string): Promise<number> => Number(await panza.getAttribute(n));
  return { scara: await nr('data-scara'), tx: await nr('data-tx'), ty: await nr('data-ty'), dpr: await nr('data-dpr') };
}

/** Punctul de pe ecran (CSS px, coordonatele paginii) al unui punct al documentului, în mm. */
export async function ecran(page: Page, v: VederePanza): Promise<(x: number, y: number) => { x: number; y: number }> {
  const box = await page.getByTestId('panza').boundingBox();
  if (!box) throw new Error('pânza n-are cutie');
  return (x, y) => ({ x: box.x + v.tx + x * v.scara, y: box.y + v.ty - y * v.scara });
}

/**
 * Opacitatea maximă a stratului traseului într-un pătrat de ±1 px fizic în jurul punctului (x, y) al foii (mm); -1 fără
 * strat. Pixelii se citesc din canvasul WebGL2 (`preserveDrawingBuffer`), cu vederea pânzei.
 */
export async function alfaTraseu(page: Page, x: number, y: number): Promise<number> {
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

/**
 * „Adaugă dreptunghi” (100 × 60 din 20, 20) sau „Adaugă cerc” (R15), din paleta de comenzi: din 20.10 (ADR 0052) bara de
 * sus poartă uneltele de desen, iar cele două acțiuni rămân în registru și în paletă. Paleta se închide după rulare.
 */
export async function adauga(page: Page, forma: 'dreptunghi' | 'cerc'): Promise<void> {
  // Paleta se deschide din tastatură cu focusul pe un buton al barei (ca omul după un clic pe bară).
  await page.locator('[data-actiune="import.svg"]').focus();
  await page.keyboard.press('Control+k');
  const paleta = page.locator('.paleta-optiune').first();
  await expect(paleta).toBeVisible();
  const optiune = page.locator(`[id="paleta-document.adauga-${forma}"]`);
  await optiune.click();
  await expect(optiune).toHaveCount(0);
  // Ascultătorul tastaturii aplicației se pune din nou după randarea fără paletă (efectul vine după desen): o tastă apăsată
  // imediat (Ctrl+D) ar ajunge la cel vechi, care încă vede paleta deschisă.
  await page.evaluate(() => new Promise<void>((ok) => { requestAnimationFrame(() => { requestAnimationFrame(() => { ok(); }); }); }));
}
