import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Raza, diametrul și unghiul (ADR 0330 §4, felia 10.4↑b), în browser. Cercul de probă: „Adaugă cerc” (raza 15, centrul în
 * (70, 50)); dreptunghiul: „Adaugă dreptunghi” (100 × 60 din (20, 20)). Rază și Diametru pe cerc, legate (cercul mărit, cifra
 * nouă); Automată pe cerc (diametrul) și pe un colț rotunjit (raza); refuzul pe o latură; unghiul din trei vârfuri și din două
 * laturi, cu sectorul ales de cursor; la Automată, două laturi paralele dau distanța dintre ele; prefixele și unghiurile din
 * Setări.
 */
test.use({ locale: 'ro-RO' });

type P = { readonly x: number; readonly y: number };
const strat = (page: Page) => page.getByTestId('strat-cote');
const cote = (page: Page) => page.locator('[data-testid="strat-cote"] g[data-cota]');
const sfat = (page: Page) => page.getByTestId('cote-sfat');

async function clic(page: Page, p: P): Promise<void> {
  const s = (await ecran(page, await vedere(page)))(p.x, p.y);
  await page.mouse.move(s.x, s.y, { steps: 2 });
  await page.mouse.click(s.x, s.y);
}
const pePolar = (c: P, r: number, grade: number): P => ({ x: c.x + r * Math.cos((grade * Math.PI) / 180), y: c.y + r * Math.sin((grade * Math.PI) / 180) });
const C = { x: 70, y: 50 };

async function alegeCote(page: Page, fel: string): Promise<void> {
  await page.locator('[data-unealta="cote"]').click();
  await expect(strat(page)).toHaveAttribute('data-fel', /.+/);
  await page.getByTestId(`cote-fel-${fel}`).click();
  await expect(strat(page)).toHaveAttribute('data-fel', fel);
}

test('Rază pe cerc: un clic oriunde pe el, cifra afară, pe punctul numit cel mai apropiat; legată, urmează raza nouă', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'cerc');
  await alegeCote(page, 'raza');
  await expect(sfat(page)).toContainText('Alege un cerc sau un arc');
  await clic(page, pePolar(C, 15, 30));
  await expect(strat(page)).toHaveAttribute('data-cerc', '');
  await expect(sfat(page)).toContainText('Du cifra unde vrei');
  // Cursorul la 60°, afară: punctul de pe cerc e cadranul de sus (90°), cel mai apropiat ca unghi.
  await clic(page, pePolar(C, 28, 60));
  await expect(cote(page)).toHaveCount(1);
  const c = cote(page).first();
  await expect(c).toHaveAttribute('data-fel', 'raza');
  await expect(c).toHaveAttribute('data-text', 'R15');
  await expect(c).toHaveAttribute('data-stare', 'legata');
  await expect(strat(page)).not.toHaveAttribute('data-cerc', '');

  await page.locator('[data-unealta="selectie"]').click();
  await clic(page, pePolar(C, 15, 200));
  const raza = page.locator('[data-camp="forma-raza"]');
  await raza.fill('20');
  await raza.press('Enter');
  await expect(c).toHaveAttribute('data-text', 'R20');
  await expect(c).toHaveAttribute('data-stare', 'legata');
});

test('Diametru pe cerc și Automată pe cerc (diametrul) și pe un colț rotunjit (raza); pe o latură, refuzat cu motivul', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'cerc');
  await alegeCote(page, 'diametru');
  await clic(page, pePolar(C, 15, 150));
  await clic(page, pePolar(C, 6, 150));
  await expect(cote(page).first()).toHaveAttribute('data-fel', 'diametru');
  await expect(cote(page).first()).toHaveAttribute('data-text', 'Ø30');

  await page.getByTestId('cote-fel-automata').click();
  await clic(page, pePolar(C, 15, 330));
  await expect(strat(page)).toHaveAttribute('data-fix', 'diametru');
  await clic(page, pePolar(C, 30, 330));
  await expect(cote(page)).toHaveCount(2);
  await expect(cote(page).nth(1)).toHaveAttribute('data-fel', 'diametru');

  // Dreptunghiul cu colțurile rotunjite (20): un colț e un arc, deci Automată dă raza; pe o latură, Diametru refuză.
  await adauga(page, 'dreptunghi');
  const colt = page.locator('[data-camp="forma-raza-colt"]');
  await colt.fill('20');
  await colt.press('Enter');
  await page.locator('[data-unealta="cote"]').click();
  await page.getByTestId('cote-fel-automata').click();
  await clic(page, pePolar({ x: 40, y: 40 }, 20, 205));
  await expect(strat(page)).toHaveAttribute('data-fix', 'raza');
  await clic(page, pePolar({ x: 40, y: 40 }, 30, 225));
  await expect(cote(page)).toHaveCount(3);
  await expect(cote(page).nth(2)).toHaveAttribute('data-text', 'R20');

  await page.getByTestId('cote-fel-diametru').click();
  await clic(page, { x: 120, y: 50 });
  await expect(sfat(page)).toContainText('Raza și diametrul se pun pe un cerc sau pe un arc');
  await expect(strat(page)).not.toHaveAttribute('data-cerc', '');
  await expect(cote(page)).toHaveCount(3);
});

test('Unghi din trei vârfuri: vârful, apoi câte un punct pe fiecare latură, apoi arcul în sectorul cursorului; grade-minute-secunde din Setări', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await alegeCote(page, 'unghi');
  await expect(sfat(page)).toContainText('Alege o latură, sau vârful unghiului');
  await clic(page, { x: 20.5, y: 20.5 });
  await expect(sfat(page)).toContainText('Alege un punct pe prima latură');
  await clic(page, { x: 119.5, y: 20.5 });
  await expect(sfat(page)).toContainText('pe a doua latură');
  await clic(page, { x: 119.5, y: 79.5 });
  await expect(sfat(page)).toContainText('Du arcul');
  // Între laturi (spre (120, 20) și spre (120, 80)): atan(60 / 100) = 30,9637…°.
  await clic(page, { x: 60, y: 28 });
  const c = cote(page).first();
  await expect(c).toHaveAttribute('data-fel', 'unghi');
  await expect(c).toHaveAttribute('data-text', '30,96°');
  await expect(c.locator('path.cota-arc')).toHaveCount(1);
  // Aleasă (clic pe arc, la raza cursorului de la punere): panoul spune raza arcului, iar o rază nouă nu schimbă unghiul.
  const R = Math.hypot(40, 8);
  await clic(page, pePolar({ x: 20, y: 20 }, R, 15));
  const panou = page.getByTestId('panou-cota');
  await expect(panou).toContainText('Raza arcului');
  await expect(page.getByTestId('cota-valoare')).toContainText('30,96');
  const raza = page.locator('[data-camp="cota-distanta"]');
  await raza.fill('25');
  await raza.press('Enter');
  await expect(c).toHaveAttribute('data-text', '30,96°');
  // Săgeata în sus duce arcul cu 1 mm mai departe: alegerea îl găsește la raza 26.
  await raza.blur();
  await clic(page, pePolar({ x: 20, y: 20 }, 25, 15));
  await expect(panou).toBeVisible();
  await page.keyboard.press('ArrowUp');
  await expect(raza).toHaveValue('26');

  // Setări › Raza, diametrul, unghiul: grade, minute, secunde (30°57′49,52″).
  await page.locator('[data-unealta="selectie"]').focus();
  await page.keyboard.press('Control+,');
  const dialog = page.getByTestId('dialog-setari');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-setare="raza.unghiuri"]').selectOption('gms');
  await expect(c).toHaveAttribute('data-text', '30°57′49,52″');
  await dialog.locator('[data-setare="raza.zecimaleUnghi"]').selectOption('0');
  await expect(c).toHaveAttribute('data-text', '30°57′50″');
});

test('Unghi din două laturi, cu sectorul din cursor; la Automată, o latură apoi alta: unghiul, iar la laturi paralele distanța dintre ele', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await alegeCote(page, 'unghi');
  // Latura de jos, apoi cea din dreapta (departe de vârfuri și de mijloace, care încep un punct): unghiul dintre ele, 90, în
  // sectorul de lângă colț. Un al doilea clic pe aceeași latură nu face nimic.
  await clic(page, { x: 60, y: 20 });
  await expect(sfat(page)).toContainText('Alege a doua latură');
  await clic(page, { x: 60, y: 20 });
  await expect(sfat(page)).toContainText('Alege a doua latură');
  await clic(page, { x: 120, y: 40 });
  await expect(sfat(page)).toContainText('Du arcul');
  await clic(page, { x: 112, y: 28 });
  await expect(cote(page).first()).toHaveAttribute('data-text', '90°');
  await expect(cote(page).first()).toHaveAttribute('data-stare', 'legata');

  // Automată: latura de sus, apoi cea de jos (paralele): distanța verticală dintre ele, 60, legată.
  await page.getByTestId('cote-fel-automata').click();
  await clic(page, { x: 50, y: 80 });
  await expect(sfat(page)).toContainText('sau alege a doua latură');
  await clic(page, { x: 50, y: 20 });
  await expect(strat(page)).toHaveAttribute('data-fix', 'verticala');
  await clic(page, { x: 5, y: 50 });
  await expect(cote(page)).toHaveCount(2);
  await expect(cote(page).nth(1)).toHaveAttribute('data-fel', 'verticala');
  await expect(cote(page).nth(1)).toHaveAttribute('data-text', '60');
  await expect(cote(page).nth(1)).toHaveAttribute('data-stare', 'legata');

  // Automată: latura din stânga, apoi cea de jos: unghiul (90).
  await clic(page, { x: 20, y: 40 });
  await clic(page, { x: 60, y: 20 });
  await expect(strat(page)).toHaveAttribute('data-fix', 'unghi');
  await clic(page, { x: 30, y: 30 });
  await expect(cote(page)).toHaveCount(3);
  await expect(cote(page).nth(2)).toHaveAttribute('data-fel', 'unghi');
  await expect(cote(page).nth(2)).toHaveAttribute('data-text', '90°');
});

test('Setări: prefixele razei și diametrului, linia razei, inch în fracții; cota de probă le arată', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'cerc');
  await alegeCote(page, 'raza');
  await clic(page, pePolar(C, 15, 30));
  await clic(page, pePolar(C, 28, 60));
  const c = cote(page).first();
  await expect(c).toHaveAttribute('data-text', 'R15');
  await page.locator('[data-unealta="selectie"]').focus();
  await page.keyboard.press('Control+,');
  const dialog = page.getByTestId('dialog-setari');
  const proba = dialog.getByTestId('setari-proba');
  await expect(proba.locator('[data-text]')).toHaveCount(4);
  await expect(proba.locator('[data-fel="raza"]')).toHaveAttribute('data-text', 'R14');
  await expect(proba.locator('[data-fel="unghi"]')).toHaveAttribute('data-text', '25°');
  const prefix = dialog.locator('[data-setare="raza.prefixR"]');
  await prefix.fill('r=');
  await expect(c).toHaveAttribute('data-text', 'r=15');
  await expect(proba.locator('[data-fel="raza"]')).toHaveAttribute('data-text', 'r=14');
  await prefix.fill('');
  await expect(c).toHaveAttribute('data-text', '15');
  await dialog.locator('[data-setare="raza.linia"]').selectOption('centru');
  await expect(dialog.locator('[data-setari-implicit="raza"]')).toBeEnabled();
  await dialog.locator('[data-setari-implicit="raza"]').click();
  await expect(c).toHaveAttribute('data-text', 'R15');
  // Inch în fracții, la 1/16: 15 mm = 0,5906 in → 9/16; zecimalele și rotunjirea nu se mai arată.
  await dialog.locator('[data-setare="cifre.unitate"]').selectOption('fractii');
  await expect(dialog.locator('[data-setare="cifre.zecimale"]')).toHaveCount(0);
  await expect(dialog.locator('[data-setare="cifre.rotunjire"]')).toHaveCount(0);
  await expect(c).toHaveAttribute('data-text', 'R9/16');
  await dialog.locator('[data-setare="cifre.fractie"]').selectOption('64');
  await expect(c).toHaveAttribute('data-text', 'R19/32');
  await expect(proba.locator('[data-fel="orizontala"]')).toHaveAttribute('data-text', '4 3/4');
});
