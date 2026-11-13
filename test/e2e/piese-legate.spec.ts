/**
 * Felia 11.2↑ (ADR 0210 §2): piesele puse de mai multe ori. Panoul («+1», «Încă…» cu „Câte în total” și locul copiilor,
 * «Desprinde»), numărul din listă („(k din N)”), banda violet și „Desprinde-o doar pe aceasta”, editarea legată (forma se
 * schimbă la toate), gruparea cu surori (întrebarea, „Ține minte alegerea”, rândurile din meniul de clic dreapta) și
 * „Duplică foaia cu aceleași piese”. Valorile pe hârtie: dreptunghiul implicit (100 × 60 din 20, 20, freza de 6) pe foaia de
 * 300 × 200, cu marginea 10 și distanța 6: pe rândul lui încape una, la X 126; pe o foaie nouă, Y 130 și 64, X 10 și 116.
 */
import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const lista = (page: Page) => page.getByTestId('lista-vectori');
const randuri = (page: Page) => lista(page).locator('button[data-instanta]');
const legate = (page: Page) => lista(page).locator('button[data-instanta] .legata');
const piesa = (page: Page) => page.getByTestId('prop-piesa');
const banda = (page: Page) => page.getByTestId('banda-legata');
const intrebare = (page: Page) => page.getByTestId('intrebare-grupare');
const cip = (page: Page) => page.getByTestId('foaia-activa');
const dr = (x: number, y: number, latime = 100): string => `dreptunghi ${latime}.00 × 60.00 la X ${x}.00, Y ${y}.00`;

/** Clic pe pânză la un punct al foii (mm), cu Shift ținut dacă se cere, sau cu butonul drept. */
async function clic(page: Page, x: number, y: number, fel: 'shift' | 'dreapta' | null = null): Promise<void> {
  const la = await ecran(page, await vedere(page));
  const p = la(x, y);
  if (fel === 'shift') await page.keyboard.down('Shift');
  await page.mouse.click(p.x, p.y, fel === 'dreapta' ? { button: 'right' } : {});
  if (fel === 'shift') await page.keyboard.up('Shift');
}

async function scrieLatimea(page: Page, latime: number): Promise<void> {
  const c = page.locator('[data-camp="forma-latime"]');
  await c.fill(String(latime));
  await c.press('Enter');
  // Tastele foilor (PgUp / PgDn) sunt ale aplicației doar cu focusul în afara câmpurilor.
  await c.blur();
}

test('«Încă…» și «+1» din panou: instanțe ale aceleiași piese, pe rânduri și pe o foaie nouă; lista, banda, editarea legată, «Desprinde»', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await expect(piesa(page).locator('[data-pusa]')).toHaveText('Pusă o singură dată.');
  await expect(piesa(page).locator('[data-buton="desprinde"]')).toHaveCount(0);
  await expect(banda(page)).toHaveCount(0);
  await expect(legate(page)).toHaveCount(0);
  // «Încă…»: câte în total, cu locul copiilor arătat înainte de Adaugă.
  await piesa(page).locator('[data-buton="inca"]').click();
  const inca = page.getByTestId('prop-inca');
  await expect(inca.locator('[data-camp="inca-total"]')).toHaveValue('2');
  await inca.locator('[data-camp="inca-total"]').fill('4');
  await expect(inca).toContainText('acum 1, se adaugă 3');
  await expect(page.getByTestId('inca-unde')).toHaveText('1 pe Foaia 1, 2 pe o foaie nouă');
  await expect(inca.locator('[data-buton="inca-adauga"]')).toHaveText('Adaugă 3');
  await inca.locator('[data-buton="inca-adauga"]').click();
  await expect(inca).toHaveCount(0);
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  await expect(cip(page)).toHaveText('Foaia 1 · 1 din 2');
  await expect(randuri(page)).toHaveText([`${dr(20, 20)} (1 din 4)`, `${dr(126, 20)} (2 din 4)`]);
  await expect(piesa(page).locator('[data-pusa]')).toHaveText('Pusă de 4 ori: o schimbare a ei se vede la toate. (Foaia 1: 2 · Foaia 2: 2)');
  await expect(banda(page).locator('span')).toHaveText('Editezi o piesă pusă de 4 ori: se schimbă toate (2 pe foaia aceasta).');
  // «+1»: după ultima, pe foaia nouă, unde rândul ei e plin: rândul de dedesubt, de la margine.
  await piesa(page).locator('[data-buton="plus-unu"]').click();
  await expect(piesa(page).locator('[data-pusa]')).toHaveAttribute('data-pusa', '5');
  await page.locator('body').press('PageDown');
  await expect(cip(page)).toHaveText('Foaia 2 · 2 din 2');
  await expect(randuri(page)).toHaveText([`${dr(10, 130)} (3 din 5)`, `${dr(116, 130)} (4 din 5)`, `${dr(10, 64)} (5 din 5)`]);
  await page.locator('body').press('PageUp');
  // Editarea legată: lățimea din panou, pe prima, se vede la toate; locurile rămân.
  await randuri(page).first().click();
  await scrieLatimea(page, 80);
  await expect(randuri(page)).toHaveText([`${dr(20, 20, 80)} (1 din 5)`, `${dr(126, 20, 80)} (2 din 5)`]);
  // «Desprinde-o doar pe aceasta», din bandă: a doua primește o piesă a ei.
  await randuri(page).nth(1).click();
  await banda(page).locator('[data-editare="desprinde"]').click();
  await expect(randuri(page)).toHaveText([`${dr(20, 20, 80)} (1 din 4)`, dr(126, 20, 80)]);
  await expect(piesa(page).locator('[data-pusa]')).toHaveText('Pusă o singură dată.');
  await expect(banda(page)).toHaveCount(0);
  // Desprinsă, se schimbă singură.
  await scrieLatimea(page, 50);
  await expect(randuri(page)).toHaveText([`${dr(20, 20, 80)} (1 din 4)`, dr(126, 20, 50)]);
  await page.locator('body').press('Control+z');
  await page.locator('body').press('Control+z');
  await expect(randuri(page)).toHaveText([`${dr(20, 20, 80)} (1 din 5)`, `${dr(126, 20, 80)} (2 din 5)`]);
  // «Desprinde» din panou, pe prima.
  await randuri(page).first().click();
  await piesa(page).locator('[data-buton="desprinde"]').click();
  await expect(randuri(page)).toHaveText([dr(20, 20, 80), `${dr(126, 20, 80)} (1 din 4)`]);
  expect(erori).toEqual([]);
});

test('gruparea cu o piesă pusă de două ori: întrebarea (Renunță, În toate cele 2), rândurile din meniu, „Ține minte alegerea”', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await piesa(page).locator('[data-buton="plus-unu"]').click();
  await adauga(page, 'cerc');
  await expect(randuri(page)).toHaveCount(3);
  const alege = async (): Promise<void> => {
    await randuri(page).first().click();
    await clic(page, 70, 50, 'shift');
    await expect(lista(page).locator('button[data-instanta][aria-pressed="true"]')).toHaveCount(2);
  };
  await alege();
  await page.locator('[data-editare="grupeaza"]').click();
  await expect(intrebare(page)).toBeVisible();
  await expect(intrebare(page).locator('> span')).toHaveText('Grupezi o piesă pusă de 2 ori:');
  await expect(intrebare(page).locator('[data-grupare="toate"]')).toHaveText('În toate cele 2');
  await intrebare(page).locator('[data-grupare="renunta"]').click();
  await expect(intrebare(page)).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(3);
  // În toate cele 2: cercul intră în piesă; amândouă instanțele rămân ale ei.
  await page.locator('[data-editare="grupeaza"]').click();
  await intrebare(page).locator('[data-grupare="toate"]').click();
  await expect(randuri(page)).toHaveCount(2);
  await expect(legate(page)).toHaveText(['(1 din 2)', '(2 din 2)']);
  await page.locator('body').press('Control+z');
  await expect(randuri(page)).toHaveCount(3);
  // Meniul de clic dreapta: două rânduri, fără întrebare.
  await alege();
  await clic(page, 70, 50, 'dreapta');
  const meniu = page.getByTestId('meniu-context');
  await expect(meniu.locator('[data-meniu="grupeaza"]')).toHaveCount(0);
  await expect(meniu.locator('[data-meniu="grupeaza-piesa"]')).toHaveText('Grupează în toată piesa');
  await expect(meniu.locator('[data-meniu="grupeaza-doar"]')).toHaveText('Grupează doar aceasta');
  await meniu.locator('[data-meniu="grupeaza-doar"]').click();
  await expect(randuri(page)).toHaveCount(2);
  await expect(legate(page)).toHaveCount(0);
  await page.locator('body').press('Control+z');
  await expect(randuri(page)).toHaveCount(3);
  // „Ține minte alegerea”: data viitoare, gruparea nu mai întreabă.
  await alege();
  await page.locator('[data-editare="grupeaza"]').click();
  await intrebare(page).locator('[data-grupare="tine"]').check();
  await intrebare(page).locator('[data-grupare="doar"]').click();
  await expect(randuri(page)).toHaveCount(2);
  expect(await page.evaluate(() => localStorage.getItem('cncvs2.grupare-surori'))).toBe('doar');
  await page.locator('body').press('Control+z');
  await alege();
  await page.locator('[data-editare="grupeaza"]').click();
  await expect(randuri(page)).toHaveCount(2);
  await expect(intrebare(page)).toHaveCount(0);
  await expect(legate(page)).toHaveCount(0);
});

test('„Duplică foaia cu aceleași piese”: foaia nouă, activă, cu aceleași piese; o schimbare de pe ea se vede pe prima', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-foaie-meniu="f1"]').click();
  const articol = lista(page).locator('[data-meniu-foaie="f1"] [data-meniu-foaie-articol="foaie.duplica-legat"]');
  await expect(articol).toHaveText('Duplică foaia cu aceleași piese');
  await articol.click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  await expect(cip(page)).toHaveText('Foaia 2 · 2 din 2');
  await expect(randuri(page)).toHaveText([`${dr(20, 20)} (2 din 2)`]);
  await randuri(page).first().click();
  await expect(banda(page).locator('span')).toHaveText('Editezi o piesă pusă de 2 ori: se schimbă toate (1 pe foaia aceasta).');
  await scrieLatimea(page, 80);
  await page.locator('body').press('PageUp');
  await expect(randuri(page)).toHaveText([`${dr(20, 20, 80)} (1 din 2)`]);
  await page.locator('body').press('Control+z');
  await expect(randuri(page)).toHaveText([`${dr(20, 20)} (1 din 2)`]);
  await page.locator('body').press('Control+z');
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(1);
  await expect(randuri(page)).toHaveText([dr(20, 20)]);
});
