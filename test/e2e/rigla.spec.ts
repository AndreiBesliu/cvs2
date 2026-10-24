import { test, expect, type Page } from '@playwright/test';
import { adauga, vedere } from './ajutor-panza.ts';

/**
 * Rigla pe marginea foii (felia 3.H, ADR 0060), în Edge: rigla de sus deasupra foii și cea din stânga la stânga ei, lungi
 * cât foaia; trasă foaia sub bare și panouri, rigla o urmează și acolo; formele care ies din foaie au o linie de cotă în
 * continuarea riglei, cu cât ies.
 */
test.use({ locale: 'ro-RO' });

const cutie = async (page: Page, id: string) => {
  const b = await page.getByTestId(id).boundingBox();
  if (!b) throw new Error(`${id} n-are cutie`);
  return b;
};

/** Foaia de 300 × 200 pe ecran (pixelii paginii): stânga, dreapta, sus, jos. */
async function foaiePeEcran(page: Page): Promise<{ st: number; dr: number; sus: number; jos: number }> {
  const v = await vedere(page);
  const p = await cutie(page, 'panza');
  return { st: p.x + v.tx, dr: p.x + v.tx + 300 * v.scara, sus: p.y + v.ty - 200 * v.scara, jos: p.y + v.ty };
}

async function scrie(page: Page, camp: string, valoare: string): Promise<void> {
  await page.locator(`[data-camp="${camp}"]`).fill(valoare);
  await page.locator(`[data-camp="${camp}"]`).press('Enter');
}

test('riglele stau pe marginea foii, lungi cât ea; trasă foaia sub bare și panouri, o urmează și acolo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('rigla-sus')).toBeVisible();
  const f = await foaiePeEcran(page);
  const sus = await cutie(page, 'rigla-sus'), st = await cutie(page, 'rigla-stanga');
  expect(Math.abs(sus.y + sus.height - f.sus), 'rigla de sus se sprijină pe marginea de sus a foii').toBeLessThan(1.5);
  expect(Math.abs(sus.x - f.st)).toBeLessThan(1.5);
  expect(Math.abs(sus.x + sus.width - f.dr), 'cât foaia pe lățime').toBeLessThan(1.5);
  expect(Math.abs(st.x + st.width - f.st), 'rigla din stânga lângă marginea din stânga').toBeLessThan(1.5);
  expect(Math.abs(st.y - f.sus)).toBeLessThan(1.5);
  expect(Math.abs(st.y + st.height - f.jos), 'cât foaia pe înălțime').toBeLessThan(1.5);

  // Foaia trasă în sus și la stânga, pe sub bara de sus și panoul din stânga: riglele rămân lipite de ea.
  const p = await cutie(page, 'panza');
  await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(p.x + p.width / 2 - 250, p.y + p.height / 2 - 100, { steps: 6 });
  await page.mouse.up({ button: 'middle' });
  const zona = (await page.locator('.zona-libera').boundingBox())!;
  await expect.poll(async () => (await foaiePeEcran(page)).st).toBeLessThan(zona.x - 30);
  const f2 = await foaiePeEcran(page);
  const sus2 = await cutie(page, 'rigla-sus'), st2 = await cutie(page, 'rigla-stanga');
  expect(f2.sus, 'marginea de sus a foii a trecut deasupra zonei libere').toBeLessThan(zona.y);
  expect(Math.abs(sus2.y + sus2.height - f2.sus), 'rigla de sus rămâne pe marginea foii, sub bară').toBeLessThan(1.5);
  expect(Math.abs(sus2.x - f2.st), 'și începe la marginea din stânga a foii, sub panou').toBeLessThan(1.5);
  expect(Math.abs(sus2.x + sus2.width - f2.dr), 'tot până la marginea din dreapta a foii').toBeLessThan(1.5);
  expect(Math.abs(st2.x + st2.width - f2.st), 'rigla din stânga, lângă marginea foii, sub panou').toBeLessThan(1.5);
  // Bara de sus și panoul stau deasupra riglei: clicul acolo ajunge la ele, nu la riglă.
  const panou = (await page.getByTestId('lista-vectori').boundingBox())!;
  const deasupra = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-testid="rigla-stanga"]') !== null, [panou.x + panou.width - 5, st2.y + 40] as const);
  expect(deasupra, 'panoul acoperă rigla').toBe(false);
});

test('formele care ies din foaie: linia de cotă continuă rigla, cu cât ies; înapoi pe foaie, dispare', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await expect(page.getByTestId('rigla-cota-dreapta')).toHaveCount(0);
  await scrie(page, 'pozitie-x', '250');
  const cota = page.getByTestId('rigla-cota-dreapta');
  await expect(cota).toHaveAttribute('data-mm', '50');
  await expect(cota).toContainText('50 mm');
  await expect(cota).toHaveAttribute('title', 'Formele ies din foaie cu 50 mm la dreapta');
  const f = await foaiePeEcran(page), c = await cutie(page, 'rigla-cota-dreapta'), sus = await cutie(page, 'rigla-sus');
  expect(Math.abs(c.x - f.dr), 'pornește de la marginea foii').toBeLessThan(1.5);
  expect(Math.abs(c.y - sus.y), 'în banda riglei de sus').toBeLessThan(1);
  await scrie(page, 'pozitie-y', '-10');
  await expect(page.getByTestId('rigla-cota-jos')).toHaveAttribute('data-mm', '10');
  await scrie(page, 'pozitie-x', '-12.5');
  await expect(page.getByTestId('rigla-cota-stanga')).toHaveAttribute('data-mm', '12.5');
  await expect(page.getByTestId('rigla-cota-dreapta')).toHaveCount(0);
  await scrie(page, 'pozitie-x', '20');
  await scrie(page, 'pozitie-y', '20');
  await expect(page.locator('.rigla-cota')).toHaveCount(0);
});
