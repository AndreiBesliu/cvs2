/**
 * Alegerile ferestrei exportului ca cartonașe cu poze (ADR 0290, felia 28.8↑b-2): colțurile, locurile urechilor, direcția pe
 * linie, unitățile și schimbarea frezei își arată toate variantele, fiecare cu poza ei; clicul oriunde pe cartonaș și
 * săgețile aleg, varianta aleasă e marcată, iar una care nu se poate alege spune de ce.
 */
import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';
import { alege, aleasa } from './ajutor-export.ts';

test.use({ locale: 'ro-RO' });

const fisa = (page: Page, cheie: string) => page.locator(`[data-fisa="op"][data-operatie="${cheie}"]`);

async function deschide(page: Page): Promise<void> {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav]').first()).toBeVisible();
}

test('colțurile: trei cartonașe cu poze; clicul pe nume și săgețile aleg, cel ales e marcat', async ({ page }) => {
  await deschide(page);
  const e1 = fisa(page, 'e1/e1');
  const carduri = e1.locator('[data-alegere="colturi"] .dx-card');
  await expect(carduri).toHaveCount(3);
  await expect(carduri.locator('svg.dx-poza')).toHaveCount(3);
  await expect(carduri).toContainText(['rotunde', 'dog-bone', 'T-bone']);
  // Lemnul pozelor e al tokenurilor desenelor, în ambele teme (nu negru: un token lipsă dă `fill` negru).
  for (const tema of ['luminoasa', 'intunecata']) {
    await page.evaluate((x) => { document.documentElement.dataset['tema'] = x; }, tema);
    const lemn = await carduri.first().locator('.l').first().evaluate((x) => getComputedStyle(x).fill);
    expect(lemn, tema).not.toMatch(/^(none|rgb\(0, 0, 0\))$/);
  }
  await expect(aleasa(e1, 'colturi')).toHaveValue('');
  // Clicul oriunde pe cartonaș (inputul îl acoperă, deci și pe nume sau pe poză) îl alege.
  await carduri.filter({ hasText: 'T-bone' }).click({ position: { x: 12, y: 12 } });
  await expect(aleasa(e1, 'colturi')).toHaveValue('t-bone');
  const marcat = (k: number) => carduri.nth(k).evaluate((e) => getComputedStyle(e).borderTopColor);
  expect(await marcat(2)).not.toBe(await marcat(0));
  // Săgețile trec între variante (un grup radio).
  await aleasa(e1, 'colturi').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(aleasa(e1, 'colturi')).toHaveValue('dog-bone');
  // Pe linie, colțurile nu se aleg: oprite, cu motivul scris.
  await e1.locator('input[data-camp="latura"][value="pe-linie"]').check();
  await expect(e1.locator('input[data-camp="colturi"]:enabled')).toHaveCount(0);
  await expect(e1.locator('[data-nota="colturi-linie"]')).toContainText('nu există deșeu');
});

test('locurile urechilor: șase cartonașe cu poze; „unde ține” oprit pe linie, cu motivul', async ({ page }) => {
  await deschide(page);
  const e1 = fisa(page, 'e1/e1');
  await e1.locator('[data-camp="urechi"]').check();
  const loc = e1.locator('.locuri-urechi .dx-card');
  await expect(loc).toHaveCount(6);
  await expect(loc.locator('svg.dx-poza')).toHaveCount(6);
  await expect(e1.locator('[data-camp="urechi-egale"]')).toBeChecked();
  await loc.filter({ hasText: 'pe laturile scurte' }).click();
  await expect(e1.locator('[data-camp="urechi-scurte"]')).toBeChecked();
  // Desenul urechilor urmează alegerea (28.8↑b-1): pe laturile scurte, urechile stau pe laturi verticale.
  const u = e1.locator('[data-grup="urechi"] [data-desen] [data-ureche]');
  expect(new Set(await u.evaluateAll((x) => x.map((e) => e.getAttribute('data-latura'))))).toEqual(new Set(['v']));
  await e1.locator('input[data-camp="latura"][value="pe-linie"]').check();
  await expect(e1.locator('[data-camp="urechi-lemn"]')).toBeDisabled();
  await expect(loc.filter({ hasText: 'unde ține' })).toContainText('nu pe linie');
});

test('direcția pe linie, unitățile și despărțirea au pozele lor; cartonașele nu ies din fișă la 1024 px', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await deschide(page);
  const e1 = fisa(page, 'e1/e1');
  await e1.locator('input[data-camp="latura"][value="pe-linie"]').check();
  await expect(e1.locator('[data-alegere="directie"] .dx-card svg.dx-poza')).toHaveCount(3);
  await e1.locator('[data-alegere="directie"] .dx-card').filter({ hasText: 'cel mai scurt drum' }).click();
  await expect(aleasa(e1, 'directie')).toHaveValue('scurt');
  const masina = page.locator('[data-fisa="masina"]');
  await expect(masina.locator('[data-alegere="unitati"] .dx-card svg.dx-poza')).toHaveCount(2);
  await alege(masina, 'unitati', 'inch');
  await expect(aleasa(masina, 'unitati')).toHaveValue('inch');
  const late = await page.locator('[data-fisa], .dx-carduri').evaluateAll((s) => s.filter((x) => x.scrollWidth > x.clientWidth + 1).length);
  expect(late).toBe(0);
});

test('tăietura: cartonașele cu poze, găurirea oprită pe un rând fără cercuri, poza tăieturii în listă (28.8↑b-3)', async ({ page }) => {
  await deschide(page);
  const e1 = fisa(page, 'e1/e1'), e2 = fisa(page, 'e2/e2');
  const carduri = e1.locator('[data-alegere="latura"] .dx-card');
  // Un contur închis: exterior, interior, pe linie, buzunar, găurire, V-carve și cele două incrustații, fiecare cu poza ei.
  await expect(carduri).toHaveCount(8);
  await expect(carduri.locator('svg.dx-poza')).toHaveCount(8);
  await expect(aleasa(e1, 'latura')).toHaveValue('exterior');
  // Pe dreptunghi, găurirea nu se poate alege și spune de ce; pe cerc, da.
  await expect(e1.locator('input[data-camp="latura"][value="gaurire"]')).toBeDisabled();
  await expect(carduri.filter({ has: page.locator('input[value="gaurire"]') })).toContainText('doar pe cercuri');
  // Inputul oprit rămâne nevăzut (regula câmpurilor oprite l-ar arăta ca un cerc peste cartonaș).
  expect(await e1.locator('input[data-camp="latura"][value="gaurire"]').evaluate((x) => getComputedStyle(x).opacity)).toBe('0');
  // Pe rândul din listă, poza stă lângă text, pe rândul lui.
  const [poza, text] = await Promise.all([page.locator('[data-nav="e1/e1"] .dx-meta svg').boundingBox(), page.locator('[data-nav="e1/e1"] .dx-meta').boundingBox()]);
  expect(poza && text && text.height < poza.height + 8).toBe(true);
  await expect(e2.locator('input[data-camp="latura"][value="gaurire"]')).toBeEnabled();
  // Alegerea schimbă și rândul din listă: numele tăieturii și poza ei.
  const nav = page.locator('[data-nav="e1/e1"] .dx-meta');
  await expect(nav.locator('svg.dx-poza')).toHaveCount(1);
  const pozaInainte = await nav.locator('svg.dx-poza').innerHTML();
  await carduri.filter({ hasText: 'buzunar' }).click();
  await expect(aleasa(e1, 'latura')).toHaveValue('buzunar');
  await expect(nav).toContainText('buzunar');
  expect(await nav.locator('svg.dx-poza').innerHTML()).not.toBe(pozaInainte);
  // Fișa buzunarului își arată grupurile lui (Golirea), nu pe ale profilului; titlurile, alese de owner pe 26.11.
  await expect(e1.locator('[data-grup="golire"]')).toHaveCount(1);
  await expect(e1.locator('[data-grup="taietura"] > h4')).toHaveText('Tăietura');
  await expect(e1.locator('[data-grup="golire"] > h4')).toHaveText('Golirea');
  await expect(e1.locator('[data-grup="coborare"] > h4')).toHaveText('Coborârea');
  await expect(e1.locator('[data-grup="urechi"]')).toHaveCount(0);
});

test('incrustația cu pereți drepți: Locașul, Treapta și Dopul, fiecare în grupul lui, cu alegerile pe cartonașe (28.8↑e-1)', async ({ page }) => {
  await deschide(page);
  const e1 = fisa(page, 'e1/e1');
  await alege(e1, 'latura', 'incrustatie-drept');
  const locas = e1.locator('[data-grup="locas"]'), treapta = e1.locator('[data-grup="treapta"]'), dop = e1.locator('[data-grup="dop"]');
  // Fiecare întrebare în grupul ei (până la 28.8↑e-1, toate stăteau în Locașul, iar Treapta și Dopul nu se arătau).
  await expect(locas.locator('[data-camp="inc-lateral"]')).toHaveCount(1);
  await expect(locas.locator('input[data-camp="inc-locas"]')).toHaveCount(2);
  await expect(treapta.locator('input[data-camp="inc-treapta"]')).toHaveCount(3);
  await expect(dop.locator('input[data-camp="inc-dop"]')).toHaveCount(2);
  await expect(dop.locator('[data-camp="inc-margine"]')).toHaveCount(1);
  for (const [camp, n] of [['inc-locas', 2], ['inc-treapta', 3], ['inc-dop', 2], ['inc-sprijin', 2]] as const) {
    await expect(e1.locator(`[data-alegere="${camp}"] .dx-poza`), camp).toHaveCount(n);
  }
  // Explicația grupului Treapta e a lui, iar câmpul umărului își aduce titlul acolo.
  await expect(treapta.locator('[data-explicatie]')).toContainText('Un umăr în locaș');
  // Sprijinul arată doar variantele care se pot: fără treaptă, pe fund și pe față; cu treaptă, pe umăr și pe fund; la gaură, pe umăr.
  await expect(dop.locator('.dx-subtitlu')).toHaveText('Se sprijină');
  await expect(dop.locator('[data-alegere="inc-sprijin"] .dx-card > span')).toHaveText(['pe fundul locașului', 'pe fața plăcii']);
  await alege(e1, 'inc-treapta', 'interior');
  await expect(dop.locator('[data-alegere="inc-sprijin"] .dx-card > span')).toHaveText(['pe umăr', 'pe fundul locașului']);
  await expect(aleasa(e1, 'inc-sprijin')).toHaveValue('umar');
  await treapta.locator('[data-camp="inc-treapta-adancime"]').click();
  await expect(treapta.locator('[data-explicatie]')).toContainText('Cât de adânc e nivelul de sus');
  await alege(e1, 'inc-locas', 'gaura');
  await expect(dop.locator('[data-alegere="inc-sprijin"] .dx-card > span')).toHaveText(['pe umăr']);
  await alege(e1, 'inc-dop', 'decupat');
  await expect(dop.locator('[data-camp="dop-punti-numar"]')).toHaveCount(1);
  // Decupat, cu treaptă: sprijinul rămâne de ales (pe umăr); fără treaptă, dopul decupat n-are sprijin.
  await expect(dop.locator('input[data-camp="inc-sprijin"]')).toHaveCount(1);
  await alege(e1, 'inc-treapta', 'fara');
  await expect(dop.locator('input[data-camp="inc-sprijin"]')).toHaveCount(0);
});
