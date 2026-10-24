import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Unealta Noduri (felia 6.H↑, ADR 0062), în Edge: nodurile formei alese, tragerea unui nod (dreptunghiul devine cale), dublu
 * clic pe o latură (un nod nou), Delete pe nodul ales (nu pe formă), refuzul lângă arce, sfatul pentru o alegere care nu se
 * poate edita; un pas de anulare pe fiecare schimbare.
 */
test.use({ locale: 'ro-RO' });

type P = { readonly x: number; readonly y: number };
const noduri = (page: Page) => page.getByTestId('noduri');
const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');

async function peEcran(page: Page, p: P): Promise<P> {
  return (await ecran(page, await vedere(page)))(p.x, p.y);
}

async function trage(page: Page, a: P, b: P): Promise<void> {
  const [sa, sb] = [await peEcran(page, a), await peEcran(page, b)];
  await page.mouse.move(sa.x, sa.y);
  await page.mouse.down();
  await page.mouse.move((sa.x + sb.x) / 2, (sa.y + sb.y) / 2, { steps: 4 });
  await page.mouse.move(sb.x, sb.y, { steps: 4 });
  await page.mouse.up();
}

async function pregateste(page: Page, forma: 'dreptunghi' | 'cerc'): Promise<void> {
  await page.goto('/');
  await adauga(page, forma);
  // Fără lipire: nodul cade exact unde e tras.
  await page.locator('[data-editare="lipire"]').click();
  await page.locator('[data-unealta="noduri"]').click();
  await expect(page.locator('[data-unealta="noduri"]')).toHaveAttribute('aria-pressed', 'true');
}

test('tragerea unui nod: dreptunghiul devine o cale cu colțul mutat; un pas de anulare', async ({ page }) => {
  await pregateste(page, 'dreptunghi');
  await expect(noduri(page)).toHaveAttribute('data-noduri', '4');
  await expect(page.getByTestId('noduri-sfat')).toHaveText('Trage un nod sau un mâner; dublu clic pe o latură: nod nou; Delete scoate nodul ales.');
  // Colțul dreapta-sus al dreptunghiului 100 × 60 din (20, 20), dus în (140, 90).
  await trage(page, { x: 120, y: 80 }, { x: 140, y: 90 });
  await expect(randuri(page).first()).toContainText('cale');
  await expect(page.locator('#root, body').getByText('120.00 × 70.00 mm')).toBeVisible();
  await expect(noduri(page)).toHaveAttribute('data-noduri', '4');
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page).first()).toContainText('dreptunghi 100.00 × 60.00');
});

test('dublu clic pe o latură adaugă un nod; Delete scoate nodul ales, nu forma; Esc îl lasă', async ({ page }) => {
  await pregateste(page, 'dreptunghi');
  const mijloc = await peEcran(page, { x: 70, y: 20 });
  await page.mouse.dblclick(mijloc.x, mijloc.y);
  await expect(noduri(page)).toHaveAttribute('data-noduri', '5');
  await expect(noduri(page)).toHaveAttribute('data-ales', '1');
  await page.keyboard.press('Delete');
  await expect(noduri(page)).toHaveAttribute('data-noduri', '4');
  await expect(randuri(page)).toHaveCount(1);
  // Un clic pe un nod îl alege; Esc îl lasă, iar Delete fără nod ales e iar „Șterge selecția”.
  const colt = await peEcran(page, { x: 20, y: 20 });
  await page.mouse.click(colt.x, colt.y);
  await expect(noduri(page)).toHaveAttribute('data-ales', '0');
  await page.keyboard.press('Escape');
  await expect(noduri(page)).not.toHaveAttribute('data-ales', /\d/);
  await page.keyboard.press('Delete');
  await expect(randuri(page)).toHaveCount(0);
});

test('cercul: două noduri pe arce, prea puține de scos; cu un nod nou pe arc, scoaterea dintre arce e refuzată; fără formă, sfatul', async ({ page }) => {
  await pregateste(page, 'cerc');
  await expect(noduri(page)).toHaveAttribute('data-noduri', '2');
  const nod = await peEcran(page, { x: 85, y: 50 });
  await page.mouse.click(nod.x, nod.y);
  await expect(noduri(page)).toHaveAttribute('data-ales', '0');
  await page.keyboard.press('Delete');
  await expect(page.getByTestId('noduri-sfat')).toHaveText('Forma are prea puține noduri ca să mai scoți unul.');
  await expect(randuri(page)).toHaveCount(1);
  // Dublu clic pe arc (sus): un nod nou, exact pe cerc; cercul devine cale.
  const sus = await peEcran(page, { x: 70, y: 65 });
  await page.mouse.dblclick(sus.x, sus.y);
  await expect(noduri(page)).toHaveAttribute('data-noduri', '3');
  await expect(randuri(page).first()).toContainText('cale 30.00 × 30.00');
  // Cu 3 noduri, o cale închisă nu mai pierde unul; încă un nod, jos, și scoaterea dintre arce e refuzată cu motivul ei.
  const jos = await peEcran(page, { x: 70, y: 35 });
  await page.mouse.dblclick(jos.x, jos.y);
  await expect(noduri(page)).toHaveAttribute('data-noduri', '4');
  await page.mouse.click(nod.x, nod.y);
  await expect(noduri(page)).toHaveAttribute('data-ales', '0');
  await page.keyboard.press('Delete');
  await expect(page.getByTestId('noduri-sfat')).toHaveText('Deocamdată se scot doar nodurile dintre două linii.');
  await expect(noduri(page)).toHaveAttribute('data-noduri', '4');
  // Nimic ales: sfatul.
  const gol = await peEcran(page, { x: 250, y: 150 });
  await page.mouse.click(gol.x, gol.y);
  await expect(page.getByTestId('noduri-sfat')).toHaveText('Noduri: alege o formă ca să-i editezi nodurile.');
  await expect(noduri(page)).toHaveAttribute('data-noduri', '0');
});
