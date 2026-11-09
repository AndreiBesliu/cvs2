import { test, expect, type Page } from '@playwright/test';
import { ecran, vedere } from './ajutor-panza.ts';

/**
 * Fișierele lângă Imprimanta (ADR 0104 §8, schimbat pe 09.11; schița cu cinci întrebări, „Ok la toate”): pe ecranul lat,
 * Importă, Exportă vectorii și Exportă G-code stau în meniul global, imediat după filele ferestrelor, doar în Proiectare; sub
 * 75rem (tabletă, telefon), la capătul barei de desen, ca înainte. La 1280 px, cu fontul lat al probei barei de sus (Verdana
 * aici, DejaVu Sans pe Linux) și cu grila (câmpul pasului ei e și el în bară), meniul rămâne pe un rând și încape, iar bara de
 * desen încape cu Transformarea, cu Cercul și cu fiecare fel al Cuțitului (cu Cuțitul în bara uneltelor și fișierele în ea,
 * capătul ei ajunsese la 1340 px). Trecerea pragului mută și exportul vectorilor (locul lui e umplut de editor), care își
 * deschide panoul și din noul loc.
 */
const LAT = "Verdana, 'DejaVu Sans', sans-serif";

async function deschide(page: Page, latime: number, inaltime = 760): Promise<void> {
  await page.setViewportSize({ width: latime, height: inaltime });
  await page.goto('/');
  await expect(page.getByTestId('bara-editare')).toBeVisible();
}

/** Capătul din dreapta al celui mai din dreapta buton (sau câmp) dintr-un loc al carcasei. */
async function capat(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate((e) => Math.max(0, ...[...e.querySelectorAll('button, input, select, label')].map((x) => {
    const k = x.getBoundingClientRect();
    return k.width > 0 ? k.right : 0;
  })));
}

async function peLat(page: Page): Promise<void> {
  await deschide(page, 1280);
  // Ordinea meniului: filele, fișierele, locul lucrării, apoi grupul aplicației.
  await expect(page.locator('.meniu-global > .grup')).toHaveCount(4);
  expect(await page.locator('.meniu-global > .grup').evaluateAll((g) => g.map((x) => x.getAttribute('data-grup')))).toEqual(['ferestre', 'fisier', 'lucrare', 'vedere']);
  await expect(page.locator('.meniu-global [data-grup="fisier"] [data-editare="vectori"]')).toBeVisible();
  expect(await page.locator('.meniu-global [data-grup="fisier"] button').evaluateAll((b) => b.map((x) => x.getAttribute('data-actiune') ?? x.getAttribute('data-editare'))))
    .toEqual(['import.svg', 'vectori', 'export.gcode']);
  await expect(page.locator('.sus > .bara [data-grup="fisier"]')).toHaveCount(0);
  // Fontul lat, grila și o formă aleasă (Transformarea își arată opțiunile doar cu ceva ales).
  await page.evaluate((f) => { document.documentElement.style.setProperty('--font', f); }, LAT);
  const la = await ecran(page, await vedere(page));
  await page.locator('[data-unealta="dreptunghi"]').click();
  await page.mouse.move(la(100, 60).x, la(100, 60).y);
  await page.mouse.down();
  await page.mouse.move(la(140, 80).x, la(140, 80).y, { steps: 6 });
  await page.mouse.up();
  await page.locator('[data-editare="grila"]').click();
  await expect(page.locator('[data-editare="pas-grila"]')).toBeVisible();
  const verifica = async (ce: string): Promise<void> => {
    const meniu = await page.locator('.meniu-global').boundingBox();
    if (!meniu) throw new Error('meniul n-are cutie');
    expect(meniu.height, `${ce}: meniul pe un rând`).toBeLessThan(60);
    expect(await capat(page, '.meniu-global'), `${ce}: meniul`).toBeLessThanOrEqual(1280);
    const bara = await page.locator('.sus > .bara').boundingBox();
    if (!bara) throw new Error('bara n-are cutie');
    expect(bara.x, `${ce}: bara de desen`).toBeGreaterThanOrEqual(0);
    expect(bara.x + bara.width, `${ce}: bara de desen`).toBeLessThanOrEqual(1280);
  };
  for (const u of ['transformare', 'cerc']) {
    await page.locator(`[data-unealta="${u}"]`).click();
    await verifica(u);
  }
  await page.locator('[data-unealta="cutit"]').click();
  for (const m of ['linie', 'pen', 'liber', 'forma', 'foarfeca', 'reteaza']) {
    await page.locator(`[data-cutit="${m}"]`).click();
    await verifica(`cuțit ${m}`);
  }
  // Pe Mașina, fișierele nu se văd (sunt ale proiectării); înapoi în Proiectare, da.
  await page.locator('[data-actiune="vedere.masina"]').click();
  await expect(page.locator('[data-grup="fisier"]')).toHaveCount(0);
  await page.locator('[data-actiune="vedere.proiectare"]').click();
  await expect(page.locator('.meniu-global [data-grup="fisier"]')).toHaveCount(1);
}

test('la 1280 px, cu fontul lat și grila: fișierele în meniu, după file; meniul pe un rând; bara de desen încape cu fiecare unealtă', async ({ page }) => {
  await peLat(page);
});

test.describe('în engleză', () => {
  test.use({ locale: 'en-US' });
  test('la 1280 px, cu fontul lat și grila, cu textele englezești', async ({ page }) => {
    await peLat(page);
  });
});

test('sub 75rem (1024 și 390 px), fișierele stau la capătul barei de desen; trecerea pragului mută și exportul vectorilor, cu panoul lui', async ({ page }) => {
  await deschide(page, 1024);
  await expect(page.locator('.meniu-global [data-grup="fisier"]')).toHaveCount(0);
  expect(await page.locator('.sus > .bara > .grup').evaluateAll((g) => g.map((x) => x.getAttribute('data-grup')))).toEqual(['forme', 'istoric', 'fisier']);
  await expect(page.locator('.sus > .bara [data-grup="fisier"] [data-editare="vectori"]')).toBeVisible();
  // Meniul își păstrează un rând pe tabletă, ca înainte.
  const meniu = await page.locator('.meniu-global').boundingBox();
  expect(meniu?.height ?? 999).toBeLessThan(60);
  // Peste prag, fișierele urcă în meniu, iar exportul vectorilor (umplut de editor) le urmează și își deschide panoul.
  await page.setViewportSize({ width: 1280, height: 760 });
  const vectori = page.locator('.meniu-global [data-grup="fisier"] [data-editare="vectori"]');
  await expect(vectori).toBeVisible();
  await vectori.click();
  await expect(page.getByTestId('panou-vectori')).toBeVisible();
  await page.locator('[data-vectori="inchide"]').click();
  await expect(page.getByTestId('panou-vectori')).toHaveCount(0);
  // Pe telefon, tot în bara de desen (care se derulează), iar meniul are tot două rânduri.
  await page.setViewportSize({ width: 390, height: 800 });
  await expect(page.locator('.sus > .bara [data-grup="fisier"] [data-editare="vectori"]')).toHaveCount(1);
  await expect(page.locator('.meniu-global [data-grup="fisier"]')).toHaveCount(0);
});
