/**
 * Privirea pe fereastra exportului (ADR 0290, felia 28.8↑f-1), cu fontul lat al probelor de așezare (Verdana aici, DejaVu Sans
 * pe Linux, unde `system-ui` e oricum lat): nimic nu iese din fereastră și niciun text nu e tăiat, la 1280 și 1024 px, în română
 * și în engleză, pe fiecare tăietură; pe telefon (390 px), fiecare rând al listei se atinge și deschide fișa lui, iar banda listei
 * lasă loc fișelor; în Atelier, cu densitatea mare, fiecare țintă a ferestrei are cel puțin 48 px și se lovește în centrul ei.
 */
import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';
import { alege } from './ajutor-export.ts';

const fisa = (page: Page, cheie: string) => page.locator(`[data-fisa="op"][data-operatie="${cheie}"]`);

/** Dreptunghiul (e1/e1) și cercul din el (e2/e2), cu fontul lat, apoi fereastra exportului. */
async function deschide(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav]').first()).toBeVisible();
}

/**
 * Ce iese: un element al ferestrei dincolo de marginile ei (în panoul fișelor, dincolo de panou; lista de pe telefon se derulează
 * pe orizontală, deci e lăsată), sau un text mai lat decât cutia lui (fără derulare a lui; desenele, câmpurile și listele
 * derulante își au lățimea lor).
 */
function ceIese(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const cutie = document.querySelector('.dialog-cutie'), fise = document.querySelector('[data-fise]'), lista = document.querySelector('[data-lista]');
    if (!cutie || !fise || !lista) return ['fără fereastră'];
    const c = cutie.getBoundingClientRect(), f = fise.getBoundingClientRect();
    const iese: string[] = c.left < -1 || c.right > innerWidth + 1 ? [`fereastra iese din ecran: ${String(Math.round(c.left))}..${String(Math.round(c.right))}`] : [];
    const nume = (e: Element): string => `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}${[...e.classList].map((x) => `.${x}`).join('')}${
      e instanceof HTMLElement ? Object.entries(e.dataset).map(([k, v]) => `[${k}=${v ?? ''}]`).join('') : ''}`;
    for (const e of cutie.querySelectorAll('*')) {
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      if (s.display === 'none' || s.visibility === 'hidden' || (r.width === 0 && r.height === 0)) continue;
      if (lista.contains(e) && getComputedStyle(lista).flexDirection === 'row') continue;
      const m = fise.contains(e) ? f : c;
      if (r.left < m.left - 1 || r.right > m.right + 1) iese.push(`iese ${nume(e)}`);
      if (e instanceof HTMLElement && !(e instanceof HTMLInputElement) && !(e instanceof HTMLSelectElement) && !e.closest('svg')
        && s.overflowX !== 'auto' && s.overflowX !== 'scroll' && e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1) iese.push(`tăiat ${nume(e)}`);
    }
    return [...new Set(iese)];
  });
}

/** Cu urechile, rampa și intrările pe dreptunghi și incrustația cu pereți drepți în trepte pe cerc; apoi fiecare tăietură a dreptunghiului. */
async function prinToate(page: Page): Promise<void> {
  const e1 = fisa(page, 'e1/e1'), e2 = fisa(page, 'e2/e2');
  await e1.locator('[data-camp="urechi"]').check();
  await e1.locator('[data-camp="rampa"]').check();
  await e1.locator('[data-camp="intrari"]').check();
  await alege(e2, 'latura', 'incrustatie-drept');
  await alege(e2, 'inc-treapta', 'interior');
  await expect(e2.locator('[data-camp="inc-treapta-latime"]')).toBeVisible();
  expect(await ceIese(page), 'urechile, rampa, intrările și treapta').toEqual([]);
  for (const t of ['interior', 'pe-linie', 'buzunar', 'vcarve', 'incrustatie', 'incrustatie-drept']) {
    await alege(e1, 'latura', t);
    await expect(e1.locator('input[data-camp="latura"]:checked')).toHaveValue(t);
    expect(await ceIese(page), t).toEqual([]);
  }
  await alege(e1, 'latura', 'buzunar');
  await alege(e1, 'coborare', 'elice');
  expect(await ceIese(page), 'buzunarul cu elicea').toEqual([]);
  await alege(e1, 'strategie', 'paralel');
  expect(await ceIese(page), 'buzunarul paralel').toEqual([]);
}

for (const [locale, limba] of [['ro-RO', 'română'], ['en-GB', 'engleză']] as const) {
  test.describe(`în ${limba}`, () => {
    test.use({ locale });
    for (const [latime, inaltime] of [[1280, 800], [1024, 768]] as const) {
      test(`la ${latime} px, cu fontul lat, nimic nu iese și niciun text nu e tăiat, pe nicio tăietură`, async ({ page }) => {
        await page.setViewportSize({ width: latime, height: inaltime });
        await deschide(page);
        await prinToate(page);
      });
    }
    test.describe('pe telefon', () => {
      test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale });
      test('la 390 px: fiecare rând al listei se atinge și deschide fișa lui; banda lasă loc fișelor; nimic nu iese', async ({ page }) => {
        await deschide(page);
        const lista = page.locator('[data-lista]');
        const banda = (await lista.boundingBox())?.height ?? 999;
        expect(banda, 'banda listei').toBeLessThan(844 * 0.2);
        // Fiecare element al benzii încape în ecran (se vede întreg, derulat), iar prima operație se vede fără derulare.
        const late = await lista.evaluate((l) => [...l.children].filter((x) => x.getBoundingClientRect().width > innerWidth - 32)
          .map((x) => `${x.className} ${String(Math.round(x.getBoundingClientRect().width))}`));
        expect(late, 'elementele benzii').toEqual([]);
        expect((await page.locator('[data-nav-op]').first().boundingBox())?.x ?? 999, 'prima operație').toBeLessThan(390 - 48);
        for (const nav of ['masina', 'e2/e2', 'e1/e1', 'foaia']) {
          await page.locator(`[data-nav="${nav}"]`).tap();
          await expect(page.locator(`[data-nav="${nav}"]`)).toHaveAttribute('aria-current', 'true');
        }
        await prinToate(page);
      });
    });
  });
}

/** Țintele ferestrei: înălțimea fiecăreia (cel puțin `minim`) și ce lovește clicul în centrul ei (ea sau ceva din ea). */
function tinteMici(page: Page, minim: number): Promise<string[]> {
  return page.evaluate((m) => {
    const cutie = document.querySelector('.dialog-cutie');
    if (!cutie) return ['fără fereastră'];
    const sel = 'button, select, input[type="text"], label:has(> input[type="checkbox"]), label.alegere, .dx-card';
    const rau: string[] = [];
    for (const e of cutie.querySelectorAll<HTMLElement>(sel)) {
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      if (s.display === 'none' || s.visibility === 'hidden' || r.height === 0) continue;
      const v = e.closest('[data-fise], [data-lista]')?.getBoundingClientRect();
      if (v && (r.top < v.top || r.bottom > v.bottom)) continue;
      const nume = `${e.tagName.toLowerCase()}${[...e.classList].map((x) => `.${x}`).join('')}${Object.entries(e.dataset).map(([k, x]) => `[${k}=${x ?? ''}]`).join('')}`;
      if (r.height < m - 0.5) rau.push(`${nume}: ${String(Math.round(r.height))} px`);
      const lovit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!lovit || !(e.contains(lovit) || lovit.closest('label') === e || (e instanceof HTMLLabelElement && e.contains(lovit)))) rau.push(`${nume}: nelovit`);
    }
    return rau;
  }, minim);
}

test.describe('în Atelier, cu densitatea mare', () => {
  test.use({ locale: 'ro-RO', viewport: { width: 1280, height: 800 } });
  test('fiecare țintă a ferestrei are cel puțin 48 px și se lovește în centrul ei, și cu ordinea mea', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('cncvs2.aranjament', JSON.stringify({ v: 1, aranjament: 'atelier', densitate: 'mare' })); });
    await deschide(page);
    await expect(page.locator('html')).toHaveAttribute('data-densitate', 'mare');
    const e1 = fisa(page, 'e1/e1'), e2 = fisa(page, 'e2/e2');
    await e1.locator('[data-camp="urechi"]').check();
    await e1.locator('[data-camp="rampa"]').check();
    await alege(e2, 'latura', 'incrustatie-drept');
    // Fiecare fișă, adusă sus pe rând: țintele care se văd.
    for (const nav of ['foaia', 'masina', 'e2/e2', 'e1/e1']) {
      await page.locator(`[data-nav="${nav}"]`).click();
      await expect(page.locator(`[data-nav="${nav}"]`)).toHaveAttribute('aria-current', 'true');
      expect(await tinteMici(page, 48), nav).toEqual([]);
    }
    await page.locator('[data-ordine="a-mea"]').click();
    await expect(page.locator('[data-sus]')).toHaveCount(2);
    expect(await tinteMici(page, 48), 'ordinea mea').toEqual([]);
    expect(await ceIese(page), 'ordinea mea').toEqual([]);
  });
});
