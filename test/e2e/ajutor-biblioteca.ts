import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Drumurile ferestrei „Biblioteca extensiilor” (ADR 0231, felia 3.Xh-3), comune probelor: meniul Extensii, fereastra, rândul
 * unei extensii din listă, pagina ei.
 */
export const meniu = (page: Page): Locator => page.getByTestId('meniu-extensii');
export const biblioteca = (page: Page): Locator => page.getByTestId('fereastra-biblioteca');
export const pagina = (page: Page): Locator => page.getByTestId('biblioteca-pagina');
export const randLista = (page: Page, id: string): Locator =>
  page.getByTestId('biblioteca-lista').locator(`[data-extensii="rand-biblioteca"][data-id="${id}"]`);

/** Meniul extensiilor, deschis (un fișier ales direct în câmpul lui îl poate lăsa deschis: butonul l-ar închide). */
export async function deschideMeniul(page: Page): Promise<Locator> {
  if (!await meniu(page).isVisible()) await page.locator('[data-extensii="buton"]').click();
  await expect(meniu(page)).toBeVisible();
  return meniu(page);
}

/** Fereastra bibliotecii, deschisă din meniu (sau deja deschisă). */
export async function deschideBiblioteca(page: Page): Promise<Locator> {
  if (await biblioteca(page).isVisible()) return biblioteca(page);
  await (await deschideMeniul(page)).locator('[data-extensii="biblioteca"]').click();
  await expect(biblioteca(page)).toBeVisible();
  return biblioteca(page);
}

/** Pagina unei extensii din catalog, în fila „Toate”. */
export async function paginaDinCatalog(page: Page, id: string): Promise<Locator> {
  const b = await deschideBiblioteca(page);
  await b.locator('[data-extensii="fila-toate"]').click();
  await randLista(page, id).click();
  await expect(pagina(page)).toHaveAttribute('data-id', id);
  return pagina(page);
}

/** Pagina unei extensii instalate, în fila „Instalate”. */
export async function paginaInstalatei(page: Page, id: string): Promise<Locator> {
  const b = await deschideBiblioteca(page);
  await b.locator('[data-extensii="fila-instalate"]').click();
  await randLista(page, id).click();
  await expect(pagina(page)).toHaveAttribute('data-id', id);
  return pagina(page);
}

/** Fereastra bibliotecii, închisă cu × (dacă e deschisă). */
export async function inchideBiblioteca(page: Page): Promise<void> {
  if (!await biblioteca(page).isVisible()) return;
  await biblioteca(page).locator('[data-extensii="inchide-biblioteca"]').click();
  await expect(biblioteca(page)).toHaveCount(0);
}

/** Semnul unei extensii (ADR 0231 §B.2): o imagine, încărcată cu adevărat (nu doar pusă în pagină). */
export const semn = (unde: Locator): Locator => unde.locator('img[data-semn]');
export const incarcata = (img: Locator): Promise<void> =>
  expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
