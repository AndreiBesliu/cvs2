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
  const carduri = e1.locator('[data-camp="colturi"] .dx-card');
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
  await e1.locator('[data-camp="latura"]').selectOption('pe-linie');
  await expect(e1.locator('[data-camp="colturi"] input:enabled')).toHaveCount(0);
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
  await e1.locator('[data-camp="latura"]').selectOption('pe-linie');
  await expect(e1.locator('[data-camp="urechi-lemn"]')).toBeDisabled();
  await expect(loc.filter({ hasText: 'unde ține' })).toContainText('nu pe linie');
});

test('direcția pe linie, unitățile și despărțirea au pozele lor; cartonașele nu ies din fișă la 1024 px', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await deschide(page);
  const e1 = fisa(page, 'e1/e1');
  await e1.locator('[data-camp="latura"]').selectOption('pe-linie');
  await expect(e1.locator('[data-camp="directie"] .dx-card svg.dx-poza')).toHaveCount(3);
  await e1.locator('[data-camp="directie"] .dx-card').filter({ hasText: 'cel mai scurt drum' }).click();
  await expect(aleasa(e1, 'directie')).toHaveValue('scurt');
  const masina = page.locator('[data-fisa="masina"]');
  await expect(masina.locator('[data-camp="unitati"] .dx-card svg.dx-poza')).toHaveCount(2);
  await alege(masina, 'unitati', 'inch');
  await expect(aleasa(masina, 'unitati')).toHaveValue('inch');
  const late = await page.locator('[data-fisa], .dx-carduri').evaluateAll((s) => s.filter((x) => x.scrollWidth > x.clientWidth + 1).length);
  expect(late).toBe(0);
});
