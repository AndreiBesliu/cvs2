// Comenzile foii pe pânză (ADR 0210 §1, felia 11.1↑c): sub fiecare foaie, rândul cu cele șapte comenzi ale meniului ei
// „⋯”; al foii active se vede mereu, al unei foi vecine doar cu mausul pe ea.
import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const ARTICOLE = ['proprietati', 'aseaza', 'foaie.duplica', 'foaie.duplica-legat', 'foaie.muta-sus', 'foaie.muta-jos', 'foaie.sterge'];

const lista = (page: Page) => page.getByTestId('lista-vectori');
const foaie = (page: Page, id: string) => lista(page).locator(`[data-foaie="${id}"]`);
const rand = (page: Page, id: string) => page.locator(`[data-controale-foaie="${id}"]`);
const articol = (page: Page, id: string, a: string) => rand(page, id).locator(`[data-meniu-foaie-articol="${a}"]`);

/** Comutatorul „Toate foile pe pânză”, oprit și pornit din nou: pornit, le încadrează pe toate (o foaie nouă nu mută vederea). */
async function incadreazaToate(page: Page): Promise<void> {
  const comutator = page.locator('[data-actiune="vedere.toate-foile"]');
  await comutator.click();
  await expect(comutator).toHaveAttribute('aria-pressed', 'false');
  await comutator.click();
  await expect(comutator).toHaveAttribute('aria-pressed', 'true');
}

/** Colțul stânga-jos al unei foi (x mm față de foaia activă), în pixelii paginii. */
async function coltFoaie(page: Page, x: number): Promise<{ x: number; y: number }> {
  return (await ecran(page, await vedere(page)))(x, 0);
}

test('sub foaia activă: cele șapte comenzi ale meniului ei, în ordinea lui, la stânga, sub marginea de jos; stinse ca în meniu', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  const r = rand(page, 'f1');
  await expect(r).toBeVisible();
  await expect(r).toHaveAttribute('data-vizibil', 'da');
  await expect(r).toHaveAttribute('role', 'toolbar');
  await expect(r).toHaveCSS('opacity', '1');
  await expect(r.locator('[data-meniu-foaie-articol]')).toHaveCount(7);
  expect(await r.locator('[data-meniu-foaie-articol]').evaluateAll((b) => b.map((x) => x.getAttribute('data-meniu-foaie-articol')))).toEqual(ARTICOLE);
  // Numele accesibil al fiecărui buton e eticheta din meniu.
  expect(await r.locator('[data-meniu-foaie-articol]').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')))).toEqual([
    'Nume, mărime și material…', 'Așază pe foi…', 'Duplică foaia', 'Duplică foaia cu aceleași piese', 'Mută foaia mai sus', 'Mută foaia mai jos', 'Șterge foaia',
  ]);
  // Locul: colțul stânga-jos al foii, la 6 px sub ea.
  const colt = await coltFoaie(page, 0);
  const cutie = await r.boundingBox();
  if (!cutie) throw new Error('rândul n-are cutie');
  expect(Math.abs(cutie.x - colt.x)).toBeLessThan(1.5);
  expect(Math.abs(cutie.y - (colt.y + 6))).toBeLessThan(1.5);
  // Aceleași stări ca în meniul „⋯” al foii: cu o singură foaie, mutările și ștergerea sunt stinse, cu motivul în titlu.
  await lista(page).locator('[data-foaie-meniu="f1"]').click();
  const meniu = page.locator('[data-meniu-foaie="f1"]');
  for (const a of ARTICOLE) {
    const inMeniu = await meniu.locator(`[data-meniu-foaie-articol="${a}"]`).isDisabled();
    expect(await articol(page, 'f1', a).isDisabled(), a).toBe(inMeniu);
  }
  await expect(articol(page, 'f1', 'foaie.muta-sus')).toBeDisabled();
  await expect(articol(page, 'f1', 'foaie.duplica')).toBeEnabled();
  expect(await articol(page, 'f1', 'foaie.muta-sus').getAttribute('title')).not.toBe('Mută foaia mai sus');
});

test('sub o foaie vecină rândul apare doar cu mausul pe ea sau pe fâșia de sub ea; „Duplică foaia” de acolo o dublează pe ea', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await expect(foaie(page, 'f2')).toHaveAttribute('data-activa', 'da');
  await incadreazaToate(page);
  // Foaia 2 e activă: rândul ei se vede; al Foii 1 (la −400 mm) e stins.
  await expect(rand(page, 'f2')).toHaveAttribute('data-vizibil', 'da');
  await expect(rand(page, 'f1')).toHaveAttribute('data-vizibil', 'nu');
  await expect(rand(page, 'f1')).toHaveCSS('opacity', '0');
  // Rândul vecinei stă sub ea, nu sub foaia activă.
  const coltVecina = await coltFoaie(page, -400);
  const cutieVecina = await rand(page, 'f1').boundingBox();
  if (!cutieVecina) throw new Error('rândul vecinei n-are cutie');
  expect(Math.abs(cutieVecina.x - coltVecina.x)).toBeLessThan(1.5);
  // Mausul pe Foaia 1: rândul ei apare; pe fundalul dintre foi, se stinge.
  const peFoaie = (await ecran(page, await vedere(page)))(-250, 100);
  await page.mouse.move(peFoaie.x, peFoaie.y);
  await expect(rand(page, 'f1')).toHaveAttribute('data-vizibil', 'da');
  await expect(rand(page, 'f1')).toHaveCSS('opacity', '1');
  const intre = (await ecran(page, await vedere(page)))(-50, 100);
  await page.mouse.move(intre.x, intre.y);
  await expect(rand(page, 'f1')).toHaveAttribute('data-vizibil', 'nu');
  // Cu mausul chiar pe rând (venit de pe foaie), rândul rămâne la vedere și se poate apăsa.
  await page.mouse.move(peFoaie.x, peFoaie.y);
  await articol(page, 'f1', 'foaie.duplica').hover();
  await expect(rand(page, 'f1')).toHaveCSS('opacity', '1');
  await articol(page, 'f1', 'foaie.duplica').click();
  // Foaia 1 s-a dublat (cu dreptunghiul ei): trei foi, iar copia are o piesă.
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(3);
  await expect(lista(page).locator('[data-foaie] .foaie-detalii').filter({ hasText: '1 piesă' })).toHaveCount(2);
});

test('ștergerea unei foi cu piese întreabă întâi, în rând; „Renunță” o lasă, „Șterge foaia” o șterge, iar anularea o întoarce', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await adauga(page, 'cerc');
  // Foaia 2, activă, are cercul.
  await articol(page, 'f2', 'foaie.sterge').click();
  await expect(rand(page, 'f2')).toContainText('Ștergi foaia și piesa de pe ea?');
  await expect(rand(page, 'f2').locator('[data-meniu-foaie-articol]')).toHaveCount(2);
  await articol(page, 'f2', 'sterge-nu').click();
  await expect(rand(page, 'f2').locator('[data-meniu-foaie-articol]')).toHaveCount(7);
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  await articol(page, 'f2', 'foaie.sterge').click();
  await articol(page, 'f2', 'sterge-da').click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(1);
  await expect(rand(page, 'f2')).toHaveCount(0);
  await expect(rand(page, 'f1')).toHaveAttribute('data-vizibil', 'da');
  await page.locator('body').press('Control+z');
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
});

test('„Nume, mărime și material…” deschide panoul foii, iar „Așază pe foi…” fereastra așezării; „Mută foaia mai sus” o mută în listă', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await articol(page, 'f2', 'proprietati').click();
  await expect(page.locator('[data-camp="foaie-nume"]')).toBeVisible();
  // Mutarea în listă: Foaia 2 trece înaintea Foii 1.
  expect(await lista(page).locator('[data-foaie]').evaluateAll((s) => s.map((x) => x.getAttribute('data-foaie')))).toEqual(['f1', 'f2']);
  await articol(page, 'f2', 'foaie.muta-sus').click();
  expect(await lista(page).locator('[data-foaie]').evaluateAll((s) => s.map((x) => x.getAttribute('data-foaie')))).toEqual(['f2', 'f1']);
  await expect(articol(page, 'f2', 'foaie.muta-sus')).toBeDisabled();
  await articol(page, 'f2', 'aseaza').click();
  await expect(page.locator('.dialog-asezare')).toBeVisible();
});

test('cu „Toate foile pe pânză” oprit rămâne doar rândul foii active; în engleză, numele comenzilor sunt cele englezești', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await expect(rand(page, 'f1')).toHaveCount(1);
  await page.locator('[data-actiune="vedere.toate-foile"]').click();
  await expect(rand(page, 'f1')).toHaveCount(0);
  await expect(rand(page, 'f2')).toHaveAttribute('data-vizibil', 'da');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(articol(page, 'f2', 'foaie.duplica')).toHaveAttribute('aria-label', 'Duplicate the sheet');
});

test('întrebarea ștergerii rămâne la vedere și cu mausul plecat de pe foaia vecină; în fereastra Mașina, rândurile nu se arată', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await expect(foaie(page, 'f2')).toHaveAttribute('data-activa', 'da');
  await incadreazaToate(page);
  // Foaia 1 (vecină, cu dreptunghiul): mausul pe ea, apoi „Șterge foaia” din rândul ei.
  const peFoaie = (await ecran(page, await vedere(page)))(-250, 100);
  await page.mouse.move(peFoaie.x, peFoaie.y);
  await articol(page, 'f1', 'foaie.sterge').click();
  await expect(rand(page, 'f1')).toContainText('Ștergi foaia și piesa de pe ea?');
  // Mausul pleacă pe fundalul dintre foi: întrebarea nu se stinge cât n-a primit răspuns.
  const intre = (await ecran(page, await vedere(page)))(-50, 100);
  await page.mouse.move(intre.x, intre.y);
  await expect(rand(page, 'f1')).toHaveAttribute('data-vizibil', 'da');
  await expect(rand(page, 'f1')).toHaveCSS('opacity', '1');
  await articol(page, 'f1', 'sterge-nu').click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  // Proiectarea acoperită de fereastra Mașina: niciun rând; înapoi în Proiectare, rândul foii active e la loc.
  await page.locator('[data-actiune="vedere.masina"]').click();
  await expect(page.locator('[data-controale-foaie]')).toHaveCount(0);
  await page.locator('[data-actiune="vedere.proiectare"]').click();
  await expect(rand(page, 'f2')).toHaveAttribute('data-vizibil', 'da');
});

/**
 * Micșorează pânza cu rotița până când o foaie de 300 mm e mai îngustă pe ecran decât `px`. Cursorul stă în mijlocul foii
 * active: zoom-ul ține pe loc punctul de sub cursor, deci cursorul rămâne pe foaie, nu ajunge pe un rând sau pe o riglă.
 */
async function micsoreazaSub(page: Page, px: number): Promise<number> {
  const c = (await ecran(page, await vedere(page)))(150, 100);
  await page.mouse.move(c.x, c.y);
  for (let k = 0; k < 40; k++) {
    const v = await vedere(page);
    if (300 * v.scara < px) return 300 * v.scara;
    await page.mouse.wheel(0, 120);
  }
  throw new Error(`pânza nu s-a micșorat destul: ${300 * (await vedere(page)).scara} px`);
}

test('cu pânza micșorată, rândul nu trece de foaia lui: se strânge în „⋯”, rândurile a două foi nu se suprapun; „⋯” îl desface, comanda merge, iar mausul plecat sau Escape îl strâng la loc', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await expect(foaie(page, 'f2')).toHaveAttribute('data-activa', 'da');
  await incadreazaToate(page);
  // La mărimea de pornire rândul încape: întreg.
  await expect(rand(page, 'f2')).toHaveAttribute('data-fel', 'intreg');
  // Foaia sub 200 px pe ecran: rândul de șapte butoane (214 px) nu mai încape.
  const latimeFoaie = await micsoreazaSub(page, 200);
  expect(latimeFoaie).toBeGreaterThan(40);
  const r2 = rand(page, 'f2');
  await expect(r2).toHaveAttribute('data-fel', 'strans');
  await expect(r2.locator('button')).toHaveCount(1);
  await expect(articol(page, 'f2', 'mai-mult')).toHaveAttribute('aria-label', 'Arată comenzile foii');
  const c2 = await r2.boundingBox();
  const colt2 = await coltFoaie(page, 0);
  if (!c2) throw new Error('rândul n-are cutie');
  expect(c2.x).toBeGreaterThan(colt2.x - 1.5);
  expect(c2.x + c2.width).toBeLessThan(colt2.x + latimeFoaie + 1.5);
  // Mausul pe foaia vecină: și rândul ei e strâns, sub ea, fără să atingă rândul foii active.
  const peVecina = (await ecran(page, await vedere(page)))(-250, 100);
  await page.mouse.move(peVecina.x, peVecina.y);
  const r1 = rand(page, 'f1');
  await expect(r1).toHaveAttribute('data-vizibil', 'da');
  await expect(r1).toHaveAttribute('data-fel', 'strans');
  const c1 = await r1.boundingBox();
  if (!c1) throw new Error('rândul vecinei n-are cutie');
  expect(c1.x + c1.width).toBeLessThan(c2.x);
  const colt1 = await coltFoaie(page, -400);
  expect(c1.x + c1.width).toBeLessThan(colt1.x + latimeFoaie + 1.5);
  // „⋯” desface rândul foii active: cele șapte comenzi, peste ce e alături, cu focusul pe prima.
  await articol(page, 'f2', 'mai-mult').click();
  await expect(r2).toHaveAttribute('data-peste', 'da');
  await expect(r2.locator('[data-meniu-foaie-articol]')).toHaveCount(7);
  expect(await r2.locator('[data-meniu-foaie-articol]').evaluateAll((b) => b.map((x) => x.getAttribute('data-meniu-foaie-articol')))).toEqual(ARTICOLE);
  await expect(articol(page, 'f2', 'proprietati')).toBeFocused();
  await expect(r2).toHaveCSS('z-index', '2');
  // Escape, de pe altă comandă decât prima, îl strânge la loc, cu focusul înapoi pe „⋯” (butonul care îl avea dispare).
  await articol(page, 'f2', 'aseaza').focus();
  await page.keyboard.press('Escape');
  await expect(r2).toHaveAttribute('data-fel', 'strans');
  await expect(articol(page, 'f2', 'mai-mult')).toBeFocused();
  // Un clic care nu-i dă focus butonului (ca în Safari): rândul desfăcut își ia tot el focusul pe prima comandă.
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); });
  await articol(page, 'f2', 'mai-mult').evaluate((b: HTMLElement) => { b.click(); });
  await expect(r2.locator('[data-meniu-foaie-articol]')).toHaveCount(7);
  await expect(articol(page, 'f2', 'proprietati')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(r2).toHaveAttribute('data-fel', 'strans');
  // Desfăcut din nou, mausul plecat de pe rând îl strânge.
  await articol(page, 'f2', 'mai-mult').click();
  await expect(r2.locator('[data-meniu-foaie-articol]')).toHaveCount(7);
  const departe = (await ecran(page, await vedere(page)))(150, 150);
  await page.mouse.move(departe.x, departe.y);
  await expect(r2).toHaveAttribute('data-fel', 'strans');
  // O comandă din rândul desfăcut merge și îl strânge, și de la tastatură, cu mausul departe de rând: „Duplică foaia”.
  await articol(page, 'f2', 'mai-mult').focus();
  await page.keyboard.press('Enter');
  await expect(r2.locator('[data-meniu-foaie-articol]')).toHaveCount(7);
  await articol(page, 'f2', 'foaie.duplica').focus();
  await page.keyboard.press('Enter');
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(3);
  await expect(page.locator('[data-controale-foaie][data-peste="da"]')).toHaveCount(0);
});

test('rotița de pe rândul unei foi e a pânzei: cu cursorul pe rând, pânza se micșorează la fel', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  const r = rand(page, 'f1');
  await expect(r).toHaveAttribute('data-vizibil', 'da');
  const inainte = (await vedere(page)).scara;
  const cutie = await articol(page, 'f1', 'foaie.duplica').boundingBox();
  if (!cutie) throw new Error('butonul n-are cutie');
  const cursor = { x: cutie.x + cutie.width / 2, y: cutie.y + cutie.height / 2 };
  /** Punctul foii (mm) de sub cursor, la vederea de acum. */
  const subCursor = async (): Promise<{ x: number; y: number }> => {
    const e = await ecran(page, await vedere(page));
    const o = e(0, 0), a = e(100, 0), b = e(0, 100);
    return { x: (cursor.x - o.x) / ((a.x - o.x) / 100), y: (cursor.y - o.y) / ((b.y - o.y) / 100) };
  };
  const loc = await subCursor();
  await page.mouse.move(cursor.x, cursor.y);
  await page.mouse.wheel(0, 240);
  await expect.poll(async () => (await vedere(page)).scara).toBeLessThan(inainte * 0.8);
  // Zoom-ul e centrat pe cursor, ca pe pânză: punctul foii de sub el rămâne pe loc (evenimentul dat mai departe își ține locul).
  const dupaUnu = await subCursor();
  expect(Math.abs(dupaUnu.x - loc.x)).toBeLessThan(0.5);
  expect(Math.abs(dupaUnu.y - loc.y)).toBeLessThan(0.5);
  // Rândul e tot sub cursor, deci a doua rotiță merge și ea.
  const dupa = (await vedere(page)).scara;
  await page.mouse.wheel(0, 240);
  await expect.poll(async () => (await vedere(page)).scara).toBeLessThan(dupa * 0.8);
});

test('la densitatea mare butoanele sunt cât ținta, deci rândul se strânge mai devreme; sub lățimea unui buton nu se mai arată', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('cncvs2.aranjament', JSON.stringify({ v: 1, aranjament: 'insule', densitate: 'mare' })); });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-densitate', 'mare');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await incadreazaToate(page);
  // Între 214 și 354 px: cu butoanele obișnuite (28 px) rândul ar încăpea; cu cele mari (48 px), nu.
  const latime = await micsoreazaSub(page, 330);
  expect(latime).toBeGreaterThan(220);
  const r2 = rand(page, 'f2');
  await expect(r2).toHaveAttribute('data-fel', 'strans');
  const buton = await articol(page, 'f2', 'mai-mult').boundingBox();
  expect(buton?.width).toBe(48);
  // Mult micșorată: foaia sub 54 px (un buton cu marginile lui): niciun rând.
  await micsoreazaSub(page, 50);
  await expect(page.locator('[data-controale-foaie]')).toHaveCount(0);
});
