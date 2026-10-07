import { expect, type Page } from '@playwright/test';

export type VederePanza = { scara: number; tx: number; ty: number; dpr: number };

/** Așteaptă ca ultima cerere trimisă workerului să fie și cea afișată, apoi citește vederea. */
export async function vedere(page: Page): Promise<VederePanza> {
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
