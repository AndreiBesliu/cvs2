import { test, expect, type Page } from '@playwright/test';
import { dxf, lwpolilinie } from '../unit/ajutor-dxf.ts';
import { ecran, vedere } from './ajutor-panza.ts';

/**
 * Piesele puse de mai multe ori, la tăiere și la conversie (felia 10.3↑m, ADR 0180), în Edge:
 * - **panoul Taie:** pătratul pus de două ori (cu «+1», care îl pune pe foaia 2: pe foaia de 300 × 200 nu încape alături), tăiat
 *   la X = 50: banda întrebării („Tai o piesă pusă de 2 ori”), iar panoul spune să alegi sus; Renunță nu taie nimic; «Desprinde și
 *   taie» face din pătratul ales două forme, iar cel de pe foaia 2 rămâne întreg; «Taie piesa (toate cele 2)» îl taie și pe el
 *   (foaia 2: două piese); „Ține minte alegerea” face ca tăierea următoare să nu mai întrebe, iar rândul „Piese puse de mai multe
 *   ori” din opțiuni o arată și o uită („întreabă”);
 * - **Cuțitul:** pe o placă pusă de două ori (a doua, pe foaia 2), o linie arată banda, iar «Taie piesa» o taie și pe foaia 2;
 *   Anulează le pune la loc. Cu un pătrat de 40 pus de trei ori pe foaia 1 (la (100, 100), pe foaia de 1 000 × 600) și nimic ales,
 *   o linie peste primul, cu «Desprinde și taie», desprinde doar primul (al doilea rămâne „pusă de 2 ori”); „Taie în panouri”
 *   întreabă doar «Desprinde și taie», și cu „toată piesa” ținută în opțiuni; o altă alegere a formelor închide întrebarea;
 * - **conversia:** poligonul pus de două ori: „În cerc” arată banda („Convertești o piesă pusă de 2 ori”); «Convertește piesa
 *   (toate cele 2)» o schimbă în locul ei (încă o conversie nu mai are ce face, deci nici întrebare); după Anulează, «Desprinde
 *   și convertește» dă instanței alese piesa ei („Pusă o singură dată”).
 */
test.use({ locale: 'ro-RO' });

const fisierDxf = (nume: string, text: string) => ({ name: nume, mimeType: 'application/dxf', buffer: Buffer.from(text, 'utf8') });
const PATRAT = lwpolilinie([[0, 0], [100, 0], [100, 100], [0, 100]], true, { strat: 'PATRAT' });
const POLIGON = lwpolilinie(Array.from({ length: 64 }, (_, k) => [100 + 50 * Math.cos((2 * Math.PI * k) / 64), 100 + 50 * Math.sin((2 * Math.PI * k) / 64)] as const), true, { strat: 'CERC64' });
const GATA = 'Forme tăiate: 1; forme noi: 2.';
const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');
const alese = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]');
const stareConversie = (page: Page) => page.getByTestId('conversie-stare');
type La = (x: number, y: number) => { x: number; y: number };

async function importa(page: Page, entitati: string): Promise<void> {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf('surori.dxf', dxf({ antet: [['$INSUNITS', 70, 4]], entitati })));
  await page.click('[data-buton="importa"]');
  await expect(page.locator('.dialog')).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(1);
}

/** Placa importată, apoi nimic ales și lipirea oprită: punctele stau unde e mausul. */
async function placa(page: Page): Promise<La> {
  await importa(page, PATRAT);
  await page.locator('[data-editare="lipire"]').click();
  await expect(page.locator('[data-editare="lipire"]')).toHaveAttribute('aria-pressed', 'false');
  const la = await ecran(page, await vedere(page));
  await nimicAles(page, la);
  return la;
}

/** Un clic cu Selecția pe foaie, la (150, 50) mm, unde e doar pânza. */
async function nimicAles(page: Page, la: La): Promise<void> {
  await page.locator('[data-unealta="selectie"]').click();
  const q = la(150, 50);
  const sub = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.getAttribute('data-testid') ?? null, [q.x, q.y] as const);
  expect(sub, 'clicul cade pe pânză').toBe('panza');
  await page.mouse.click(q.x, q.y);
  await expect(alese(page)).toHaveCount(0);
}

async function cutit(page: Page, fel: 'linie'): Promise<void> {
  await page.locator('[data-unealta="cutit"]').click();
  await page.locator(`[data-cutit="${fel}"]`).click();
  await expect(page.locator(`[data-cutit="${fel}"]`)).toHaveAttribute('aria-pressed', 'true');
}

test('O piesă pusă de două ori: banda întrebării; Renunță, «Desprinde și taie», «Taie piesa», „Ține minte alegerea” și rândul din opțiuni', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await importa(page, PATRAT);
  // «+1»: încă o instanță a aceleiași piese, lângă ea.
  const proprietati = page.locator('[data-panou="proprietati"]');
  if ((await proprietati.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  await page.getByTestId('prop-piesa').locator('[data-buton="plus-unu"]').click();
  // Pe foaia de 300 × 200 nu încape alături: instanța nouă e pe foaia 2.
  const foaia2 = page.getByTestId('lista-vectori').getByRole('button', { name: /^Foaia 2/ });
  await expect(foaia2).toContainText('1 piesă');
  await expect(randuri(page)).toHaveCount(1);
  await randuri(page).nth(0).click();
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="x"]').fill('50');
  const banda = page.getByTestId('intrebare-surori');
  const stare = page.getByTestId('taiere-stare');
  // Renunță: nimic tăiat.
  await page.locator('[data-taiere="taie"]').click();
  await expect(banda.locator('span').first()).toHaveText('Tai o piesă pusă de 2 ori:');
  await expect(stare).toHaveText('Alege sus: o formă aleasă e pusă de mai multe ori.');
  await expect(banda.locator('[data-surori="piesa"]')).toHaveText('Taie piesa (toate cele 2)');
  await banda.locator('[data-surori="renunta"]').click();
  await expect(banda).toHaveCount(0);
  await expect(stare).toHaveText('Nimic tăiat: ai renunțat la întrebare.');
  await expect(randuri(page)).toHaveCount(1);
  // «Desprinde și taie»: pătratul ales devine două forme; celălalt rămâne.
  await page.locator('[data-taiere="taie"]').click();
  await banda.locator('[data-surori="desprinde"]').click();
  await expect(stare).toHaveText('Forme tăiate: 1; forme noi: 2, alese.');
  await expect(randuri(page)).toHaveCount(2);
  await expect(foaia2).toContainText('1 piesă');
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(1);
  // «Taie piesa»: și instanța de pe foaia 2, tăiată la fel.
  await randuri(page).nth(0).click();
  await page.locator('[data-taiere="taie"]').click();
  await banda.locator('[data-surori="piesa"]').click();
  await expect(randuri(page)).toHaveCount(2);
  await expect(foaia2).toContainText('2 piese');
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(1);
  await expect(foaia2).toContainText('1 piesă');
  // „Ține minte alegerea”: data viitoare, fără întrebare; rândul din opțiuni o arată, iar „întreabă” o uită.
  await randuri(page).nth(0).click();
  await page.locator('[data-taiere="taie"]').click();
  await banda.locator('[data-surori="tine"]').check();
  await banda.locator('[data-surori="desprinde"]').click();
  await expect(randuri(page)).toHaveCount(2);
  await expect(page.locator('[data-taiere="surori"]')).toHaveValue('desprinde');
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await randuri(page).nth(0).click();
  await page.locator('[data-taiere="taie"]').click();
  await expect(randuri(page)).toHaveCount(2);
  await expect(banda).toHaveCount(0);
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await page.locator('[data-taiere="surori"]').selectOption('intreaba');
  await randuri(page).nth(0).click();
  await page.locator('[data-taiere="taie"]').click();
  await expect(banda).toBeVisible();
  await banda.locator('[data-surori="renunta"]').click();
  expect(erori).toEqual([]);
});

test('Cuțitul pe o piesă pusă de două ori (felia 10.3↑m): banda întrebării; «Taie piesa» o taie și pe foaia 2; Anulează', async ({ page }) => {
  const la = await placa(page);
  // «+1»: încă o instanță a plăcii, pe foaia 2 (pe foaia de 300 × 200 nu încape alături).
  await randuri(page).nth(0).click();
  const proprietati = page.locator('[data-panou="proprietati"]');
  if ((await proprietati.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  await page.getByTestId('prop-piesa').locator('[data-buton="plus-unu"]').click();
  const foaia2 = page.getByTestId('lista-vectori').getByRole('button', { name: /^Foaia 2/ });
  await expect(foaia2).toContainText('1 piesă');
  await nimicAles(page, la);
  await cutit(page, 'linie');
  const a = la(-10, 50), b = la(110, 50);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();
  const banda = page.getByTestId('intrebare-surori');
  await expect(banda.locator('span').first()).toHaveText('Tai o piesă pusă de 2 ori:');
  await expect(page.getByTestId('cutit-sfat')).toHaveText('Alege sus: o formă aleasă e pusă de mai multe ori.');
  await banda.locator('[data-surori="piesa"]').click();
  await expect(page.getByTestId('cutit-sfat')).toHaveText(GATA);
  await expect(randuri(page)).toHaveCount(2);
  await expect(foaia2).toContainText('2 piese');
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(1);
  await expect(foaia2).toContainText('1 piesă');
});

test('Piesa pusă de trei ori pe o foaie (felia 10.3↑m): Cuțitul desprinde doar ce taie; panourile întreabă doar «Desprinde»; altă alegere închide întrebarea', async ({ page }) => {
  await page.goto('/');
  // O foaie mare (1 000 × 600), ca toate trei să încapă pe ea.
  const proprietati = page.locator('[data-panou="proprietati"]');
  if ((await proprietati.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  for (const [camp, v] of [['foaie-latime', '1000'], ['foaie-inaltime', '600']] as const) {
    await page.locator(`[data-camp="${camp}"]`).fill(v);
    await page.locator(`[data-camp="${camp}"]`).press('Enter');
    await expect(page.locator(`[data-camp="${camp}"]`)).toHaveValue(v);
  }
  const P40 = lwpolilinie([[100, 100], [140, 100], [140, 140], [100, 140]], true, { strat: 'P40' });
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf('p40.dxf', dxf({ antet: [['$INSUNITS', 70, 4]], entitati: P40 })));
  await page.click('[data-buton="importa"]');
  await expect(page.locator('.dialog')).toHaveCount(0);
  // «Încă…»: trei în total, pe rând, pe foaia 1.
  await page.getByTestId('prop-piesa').locator('[data-buton="inca"]').click();
  const inca = page.getByTestId('prop-inca');
  await inca.locator('[data-camp="inca-total"]').fill('3');
  await inca.locator('[data-buton="inca-adauga"]').click();
  await expect(randuri(page)).toHaveCount(3);
  await page.locator('[data-editare="lipire"]').click();
  const la = await ecran(page, await vedere(page));
  await nimicAles(page, la);
  // Cuțitul, fără nimic ales (toate formele foii), doar peste primul pătrat: «Desprinde și taie» îl desprinde doar pe el.
  await cutit(page, 'linie');
  const a = la(120, 90), b = la(120, 150);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();
  const banda = page.getByTestId('intrebare-surori');
  await expect(banda.locator('span').first()).toHaveText('Tai o piesă pusă de 3 ori:');
  await banda.locator('[data-surori="desprinde"]').click();
  await expect(page.getByTestId('cutit-sfat')).toHaveText(GATA);
  await expect(randuri(page)).toHaveCount(4);
  await page.locator('[data-unealta="selectie"]').click();
  await randuri(page).nth(2).click();
  await expect(page.getByTestId('prop-piesa').locator('[data-pusa]')).toContainText('Pusă de 2 ori');
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(3);
  // Taie în panouri (2 × 1, peste toate trei): doar «Desprinde și taie», chiar cu „toată piesa” ținută în opțiuni.
  await nimicAles(page, la);
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="surori"]').selectOption('piesa');
  await page.locator('[data-taiere="panouri-numar"]').check();
  await page.locator('[data-taiere="panouri-coloane"]').fill('2');
  await page.locator('[data-taiere="panouri-randuri"]').fill('1');
  await page.locator('[data-taiere="panouri-taie"]').click();
  await expect(banda.locator('[data-surori="desprinde"]')).toHaveText('Desprinde și taie');
  await expect(banda.locator('[data-surori="piesa"]')).toHaveCount(0);
  // O altă alegere a formelor închide întrebarea: nimic tăiat.
  await randuri(page).nth(0).click();
  await expect(banda).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(3);
  // Din nou, fără nimic ales: «Desprinde și taie» face panourile.
  await nimicAles(page, la);
  await page.locator('[data-editare="taiere"]').click();
  if ((await page.locator('[data-taiere="panouri-taie"]').count()) === 0) await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="panouri-numar"]').check();
  await page.locator('[data-taiere="panouri-coloane"]').fill('2');
  await page.locator('[data-taiere="panouri-randuri"]').fill('1');
  await page.locator('[data-taiere="panouri-taie"]').click();
  await banda.locator('[data-surori="desprinde"]').click();
  await expect(page.getByTestId('panouri-stare')).toContainText('Panouri: 2');
});

test('O piesă pusă de două ori: «Convertește piesa» o schimbă la toate; «Desprinde și convertește», doar pe cea aleasă', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await importa(page, POLIGON);
  const proprietati = page.locator('[data-panou="proprietati"]');
  if ((await proprietati.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  await page.getByTestId('prop-piesa').locator('[data-buton="plus-unu"]').click();
  await expect(page.getByTestId('prop-piesa').locator('[data-pusa]')).toContainText('Pusă de 2 ori');
  await randuri(page).nth(0).click();
  await page.locator('[data-editare="conversie"]').click();
  const banda = page.getByTestId('intrebare-surori');
  await page.locator('[data-conversie="cerc"]').click();
  await expect(banda.locator('span').first()).toHaveText('Convertești o piesă pusă de 2 ori:');
  await expect(stareConversie(page)).toHaveText('Alege sus: o formă aleasă e pusă de mai multe ori.');
  await expect(banda.locator('[data-surori="desprinde"]')).toHaveText('Desprinde și convertește');
  await banda.locator('[data-surori="piesa"]').click();
  await expect(stareConversie(page)).toHaveText('Forme convertite: 1; abaterea cea mai mare: 0,06 mm.');
  // Piesa e acum un cerc: la amândouă, deci încă o conversie nu mai schimbă nimic și nu mai întreabă.
  await page.locator('[data-conversie="cerc"]').click();
  await expect(stareConversie(page)).toContainText('Nimic de convertit');
  await expect(banda).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  // «Desprinde și convertește»: instanța aleasă primește piesa ei.
  await randuri(page).nth(0).click();
  await page.locator('[data-editare="conversie"]').click();
  await page.locator('[data-conversie="cerc"]').click();
  await banda.locator('[data-surori="desprinde"]').click();
  await expect(stareConversie(page)).toHaveText('Forme convertite: 1; abaterea cea mai mare: 0,06 mm.');
  await page.keyboard.press('Escape');
  await randuri(page).nth(0).click();
  await expect(page.getByTestId('prop-piesa').locator('[data-pusa]')).toHaveText('Pusă o singură dată.');
  expect(erori).toEqual([]);
});
