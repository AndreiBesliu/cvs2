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
