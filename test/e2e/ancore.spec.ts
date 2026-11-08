/**
 * Ancora și tastele transformării (ADR 0240), pe build-ul real: Shift, Ctrl și Alt la mânere (cercul Ø 40 al owner-ului,
 * citit în panou și în lista vectorilor), tasta apăsată cu mausul pe loc, desenul din centru, Shift+L care comută lipirea.
 * Grila de 10 mm ține capetele gesturilor pe valorile de pe hârtie.
 */
import { test, expect, type Page } from '@playwright/test';
import { ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');

/** Pornește cu lipirea și grila de 10 mm (capetele trase ajung exact pe valorile de pe hârtie). */
async function deschide(page: Page, erori: string[]): Promise<void> {
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  await expect(page.getByTestId('bara-editare')).toBeVisible();
  await expect(page.locator('[data-editare="lipire"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-editare="grila"]').click();
  await page.locator('[data-editare="pas-grila"]').fill('10');
}

/** Centrul unui mâner pe ecran. */
async function maner(page: Page, m: string): Promise<{ x: number; y: number }> {
  const b = await page.locator(`[data-maner="${m}"]`).boundingBox();
  if (!b) throw new Error(`mânerul ${m} n-are cutie`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Trage între două puncte de pe ecran, cu tastele ținute de dinainte de apăsare până după eliberare. */
async function trage(page: Page, a: { x: number; y: number }, b: { x: number; y: number }, taste: readonly string[] = []): Promise<void> {
  await page.mouse.move(a.x, a.y);
  for (const k of taste) await page.keyboard.down(k);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
  for (const k of [...taste].reverse()) await page.keyboard.up(k);
}

test('tastele la mânere (ADR 0240): cercul Ø 40 din (100, 100), latura dreaptă trasă cu 10 mm, cu fiecare combinație', async ({ page }) => {
  const erori: string[] = [];
  await deschide(page, erori);
  // Cercul R 20, pus cu un clic în (100, 100), cu raza din câmp.
  await page.locator('[data-unealta="cerc"]').click();
  await page.locator('[data-editare="raza"]').fill('20');
  const la = await ecran(page, await vedere(page));
  await page.mouse.click(la(100, 100).x, la(100, 100).y);
  await expect(randuri(page)).toHaveText(['cerc R20.00 cu centrul la X 100.00, Y 100.00']);
  await page.locator('body').focus();
  await page.keyboard.press('s');
  await expect(page.locator('[data-unealta="transformare"]')).toHaveAttribute('aria-pressed', 'true');

  // Rândul unei căi arată colțul stânga-jos al cutiei ei: elipsa 50 × 40 cu centrul în (105, 100) stă de la (80, 80).
  const cazuri: ReadonlyArray<readonly [readonly string[], RegExp | string]> = [
    // Fără tastă și cu Ctrl: elipsa 50 × 40, fix latura stângă; Shift: cercul Ø 50; Alt: elipsa 60 × 40 față de centru;
    // Alt + Shift: cercul Ø 60; Alt + Ctrl, ca Alt; Shift + Ctrl, ca Shift.
    [[], /^cale 50\.00 × 40\.00, \d+ (de )?segmente, la X 80\.00, Y 80\.00$/],
    [['Control'], /^cale 50\.00 × 40\.00, \d+ (de )?segmente, la X 80\.00, Y 80\.00$/],
    [['Shift'], 'cerc R25.00 cu centrul la X 105.00, Y 100.00'],
    [['Alt'], /^cale 60\.00 × 40\.00, \d+ (de )?segmente, la X 70\.00, Y 80\.00$/],
    [['Alt', 'Shift'], 'cerc R30.00 cu centrul la X 100.00, Y 100.00'],
    [['Alt', 'Control'], /^cale 60\.00 × 40\.00, \d+ (de )?segmente, la X 70\.00, Y 80\.00$/],
    [['Shift', 'Control'], 'cerc R25.00 cu centrul la X 105.00, Y 100.00'],
  ];
  for (const [taste, rand] of cazuri) {
    const v = await vedere(page);
    const l = await ecran(page, v);
    const e = await maner(page, 'e');
    await trage(page, e, { x: l(130, 100).x, y: e.y }, taste);
    await expect(randuri(page), taste.join('+') || 'fără tastă').toHaveText([rand]);
    await expect(page.getByTestId('manere-motiv')).toHaveCount(0);
    // Elipsa e a uneltei Elipsă: panoul îi arată razele.
    if (typeof rand !== 'string') await expect(page.locator('[data-camp="forma-ry"]')).toHaveValue('20');
    await page.keyboard.press('Control+z');
    await expect(randuri(page)).toHaveText(['cerc R20.00 cu centrul la X 100.00, Y 100.00']);
  }
  // Colțul dreapta-sus tras cu (10, 4) mm, cu Ctrl: elipsa 50 × 44, fix colțul stânga-jos (80, 80), centrul (105, 102).
  // Grila oprită: 124 nu e pe ea.
  await page.locator('[data-editare="grila"]').click();
  {
    const v = await vedere(page);
    const l = await ecran(page, v);
    await trage(page, await maner(page, 'ne'), l(130, 124), ['Control']);
    await expect(randuri(page)).toHaveText([/^cale (50\.0\d|49\.9\d) × (44\.0\d|43\.9\d), \d+ (de )?segmente, la X 80\.00, Y 80\.00$/]);
  }
  expect(erori).toEqual([]);
});

test('o tastă apăsată cu mausul pe loc schimbă previzualizarea și eticheta (ADR 0240 §B.15, §E)', async ({ page }) => {
  const erori: string[] = [];
  await deschide(page, erori);
  await page.locator('[data-unealta="cerc"]').click();
  await page.locator('[data-editare="raza"]').fill('20');
  const la = await ecran(page, await vedere(page));
  await page.mouse.click(la(100, 100).x, la(100, 100).y);
  await page.locator('body').focus();
  await page.keyboard.press('s');
  const v = await vedere(page);
  const l = await ecran(page, v);
  const e = await maner(page, 'e');
  await page.mouse.move(e.x, e.y);
  await page.mouse.down();
  await page.mouse.move(l(130, 100).x, e.y, { steps: 5 });
  const eticheta = page.getByTestId('manere-eticheta');
  await expect(eticheta).toHaveText('50 × 40 mm · pe o axă · față de latura opusă · cercul devine elipsă');
  await expect(page.getByTestId('manere-fix')).toHaveAttribute('data-x', '80');
  // Shift, cu mausul neclintit: proporțional, imediat; apoi Alt peste el: față de centru, punctul fix se mută în centru.
  await page.keyboard.down('Shift');
  await expect(eticheta).toHaveText('50 × 50 mm · proporțional · față de latura opusă');
  await page.keyboard.down('Alt');
  await expect(eticheta).toHaveText('60 × 60 mm · proporțional · față de centru');
  await expect(page.getByTestId('manere-fix')).toHaveAttribute('data-x', '100');
  await page.keyboard.up('Shift');
  await expect(eticheta).toHaveText('60 × 40 mm · pe o axă · față de centru · cercul devine elipsă');
  await page.keyboard.up('Alt');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(randuri(page)).toHaveText(['cerc R20.00 cu centrul la X 100.00, Y 100.00']);
  expect(erori).toEqual([]);
});

test('desenul cu tastele (ADR 0240 §C): dreptunghiul din centru, cercul cu Ctrl elipsă, linia din mijloc', async ({ page }) => {
  const erori: string[] = [];
  await deschide(page, erori);
  const la = await ecran(page, await vedere(page));
  // Uneltele din butoane: focusul e încă în câmpul pasului grilei, unde o literă s-ar scrie.
  await page.locator('[data-unealta="dreptunghi"]').click();
  // Alt: apăsat în (60, 60), lăsat în (90, 80): 60 × 40 cu centrul în (60, 60); eticheta spune „din centru”.
  await page.mouse.move(la(60, 60).x, la(60, 60).y);
  await page.keyboard.down('Alt');
  await page.mouse.down();
  await page.mouse.move(la(90, 80).x, la(90, 80).y, { steps: 5 });
  await expect(page.getByTestId('desen-eticheta')).toHaveText('60 × 40 mm · din centru');
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await expect(randuri(page).nth(0)).toHaveText('dreptunghi 60.00 × 40.00 la X 30.00, Y 40.00');
  // Alt + Shift: pătratul 60 × 60 din centru (200, 100).
  await trage(page, la(200, 100), la(230, 120), ['Alt', 'Shift']);
  await expect(randuri(page).nth(1)).toHaveText('dreptunghi 60.00 × 60.00 la X 170.00, Y 70.00');
  // Cercul cu Ctrl: elipsa din centru (100, 150), cu razele 30 și 20 (cursorul în colțul cutiei ei); rândul arată colțul
  // cutiei, (70, 130).
  await page.locator('[data-unealta="cerc"]').click();
  await trage(page, la(100, 150), la(130, 170), ['Control']);
  await expect(randuri(page).nth(2)).toHaveText(/^cale 60\.00 × 40\.00, \d+ (de )?segmente, la X 70\.00, Y 130\.00$/);
  await expect(page.locator('[data-camp="forma-rx"]')).toHaveValue('30');
  // Linia cu Alt: din mijloc, de la (230, 160) la (270, 180), mijlocul în (250, 170).
  await page.locator('[data-unealta="linie"]').click();
  await trage(page, la(250, 170), la(270, 180), ['Alt']);
  await expect(randuri(page).nth(3)).toHaveText(/la X 230\.00, Y 160\.00$/);
  expect(erori).toEqual([]);
});

test('Shift+L comută lipirea, și cât se trage; la desen, Alt nu mai inversează lipirea (ADR 0240 §D, răspunsul 2a)', async ({ page }) => {
  const erori: string[] = [];
  await deschide(page, erori);
  const la = await ecran(page, await vedere(page));
  await page.locator('[data-unealta="dreptunghi"]').click();
  // Cu lipirea pornită și Alt (din centru), colțul tras la (88,7; 78,8) se prinde de grila de 10: 60 × 40.
  await trage(page, la(60, 60), la(88.7, 78.8), ['Alt']);
  await expect(randuri(page).nth(0)).toHaveText('dreptunghi 60.00 × 40.00 la X 30.00, Y 40.00');
  // Shift+L o oprește (butonul o arată): aceeași tragere rămâne liberă.
  await page.keyboard.press('Shift+L');
  await expect(page.locator('[data-editare="lipire"]')).toHaveAttribute('aria-pressed', 'false');
  await trage(page, la(160, 60), la(188.7, 78.8), ['Alt']);
  await expect(randuri(page).nth(1)).toHaveText(/^dreptunghi 57\.\d\d × 37\.\d\d la X 131\.\d\d, Y 41\.\d\d$/);
  await page.keyboard.press('Shift+L');
  await expect(page.locator('[data-editare="lipire"]')).toHaveAttribute('aria-pressed', 'true');
  expect(erori).toEqual([]);
});

/** Locul țintei ancorei, în mm ai foii (din atributele ei). */
async function ancora(page: Page): Promise<[number, number]> {
  const t = page.getByTestId('ancora');
  return [Number(await t.getAttribute('data-x')), Number(await t.getAttribute('data-y'))];
}

test('ancora (ADR 0240 §A): trasă pe grilă, rotirea și oglindirea în jurul ei, selectorul, dublu clic, Alt față de ea', async ({ page }) => {
  const erori: string[] = [];
  await deschide(page, erori);
  let la = await ecran(page, await vedere(page));
  // Dreptunghiul 40 × 20 din (100, 60), ales după desen; unealta Transformare.
  await page.locator('[data-unealta="dreptunghi"]').click();
  await trage(page, la(100, 60), la(140, 80));
  await expect(randuri(page)).toHaveText(['dreptunghi 40.00 × 20.00 la X 100.00, Y 60.00']);
  await page.locator('[data-unealta="transformare"]').click();
  // Ancora pornește din centru (selectorul ținut în browser: implicit centrul).
  await expect(page.locator('[data-ancora="c"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await ancora(page)).toEqual([120, 70]);
  // Trasă de țintă în (150,4; 70,3): se prinde de grila de 10, în (150, 70).
  await trage(page, la(120, 70), la(150.4, 70.3));
  await expect.poll(() => ancora(page)).toEqual([150, 70]);
  await expect(randuri(page)).toHaveText(['dreptunghi 40.00 × 20.00 la X 100.00, Y 60.00'], { timeout: 1000 });
  // Rotirea cu 90° (Shift, pași de 15°) e în jurul ancorei: cutia ajunge în [140, 160] × [20, 60]; ancora rămâne pe loc.
  // Mânerul rotirii stă în (120, 80 + 26 px); față de ancoră, (−30, 10 + 26 px), rotit cu 90° dă (−10 − 26 px, −30).
  const s = (await vedere(page)).scara;
  await page.keyboard.down('Shift');
  await trage(page, await maner(page, 'rotire'), la(150 - 10 - 26 / s, 70 - 30));
  await page.keyboard.up('Shift');
  await expect(page.locator('[data-camp="rotire"]')).toHaveValue('90');
  await expect(page.locator('[data-camp="pozitie-x"]')).toHaveValue('140');
  await expect(page.locator('[data-camp="pozitie-y"]')).toHaveValue('20');
  expect(await ancora(page)).toEqual([150, 70]);
  // Oglindirea verticală (Shift+V) e față de ancoră (orizontala y = 70): cutia ajunge în [80, 120] pe y.
  await page.keyboard.press('Shift+V');
  await expect(page.locator('[data-camp="pozitie-y"]')).toHaveValue('80');
  expect(await ancora(page)).toEqual([150, 70]);
  // Selectorul pe centru: ancora în centrul cutiei, (150, 100); trasă în (170, 100), apoi dublu clic o întoarce în centru.
  await page.locator('[data-ancora="c"]').click();
  await expect.poll(() => ancora(page)).toEqual([150, 100]);
  la = await ecran(page, await vedere(page));
  await trage(page, la(150, 100), la(170.2, 99.6));
  await expect.poll(() => ancora(page)).toEqual([170, 100]);
  await expect(page.locator('[data-camp="pozitie-x"]')).toHaveValue('140');
  await page.mouse.dblclick(la(170, 100).x, la(170, 100).y);
  await expect.poll(() => ancora(page)).toEqual([150, 100]);
  // Colțul stânga-jos din selector, (140, 80), apoi latura de sus (y = 120) trasă la 140 cu Alt: fix e ancora (y = 80), deci
  // înălțimea 40 → 60; dreptunghiul, rotit cu 90°, are acum lățimea lui 60.
  await page.locator('[data-ancora="sv"]').click();
  await expect.poll(() => ancora(page)).toEqual([140, 80]);
  la = await ecran(page, await vedere(page));
  const n = await maner(page, 'n');
  await trage(page, n, { x: n.x, y: la(150, 140).y }, ['Alt']);
  await expect(randuri(page)).toHaveText([/^dreptunghi 60\.00 × 20\.00 /]);
  await expect(page.locator('[data-camp="pozitie-y"]')).toHaveValue('80');
  expect(await ancora(page)).toEqual([140, 80]);
  expect(erori).toEqual([]);
});
