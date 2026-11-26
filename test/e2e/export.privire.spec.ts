/**
 * Privirea pe fereastra exportului (ADR 0290, felia 28.8↑f-1), cu fontul lat al probelor de așezare (Verdana aici, DejaVu Sans
 * pe Linux, unde `system-ui` e oricum lat): nimic nu iese din fereastră și niciun text nu e tăiat, la 1280 și 1024 px, în română
 * și în engleză, pe fiecare tăietură; pe telefon (390 px), fiecare rând al listei se atinge și deschide fișa lui, iar banda listei
 * lasă loc fișelor; în Atelier, cu densitatea mare, fiecare țintă a ferestrei are cel puțin 48 px și se lovește în centrul ei.
 * La fel cu rândurile reliefului (ADR 0312 §7, ADR 0313 §7), editabile din felia 18.1↑d-4.
 */
import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';
import { alege } from './ajutor-export.ts';
import { importaRelief, rolFinisare, rolRelief3d } from './ajutor-relief.ts';

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
      // O bifă cu eticheta ei (28.8↑k, constatarea 10 a auditului): căsuța și primul rând al textului, pe același rând, textul după ea.
      const bifa = e instanceof HTMLLabelElement ? e.querySelector(':scope > input[type="checkbox"]') : null;
      const text = bifa ? [...e.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '') : undefined;
      if (bifa && text) {
        const b = bifa.getBoundingClientRect(), interval = document.createRange();
        interval.selectNodeContents(text);
        const r0 = interval.getClientRects()[0];
        if (r0 && (r0.top >= b.bottom || r0.bottom <= b.top || r0.left < b.right - 1)) iese.push(`bifa cu eticheta dedesubt ${nume(e)}`);
      }
    }
    return [...new Set(iese)];
  });
}

/** Cu urechile, rampa și intrările pe dreptunghi și incrustația cu pereți drepți în trepte pe cerc; apoi fiecare tăietură a dreptunghiului. */
async function prinToate(page: Page): Promise<void> {
  const e1 = fisa(page, 'e1/e1'), e2 = fisa(page, 'e2/e2');
  // Z-ul sigur și parcarea într-un punct (felia 28.8↑p): X și Y la vedere; turația, avansul și plonjarea, pe freza scrisă de mână.
  await alege(page.locator('[data-grup="aer"]'), 'parcare', 'punct');
  await expect(page.locator('[data-camp="parcare-y"]')).toBeVisible();
  await e1.locator('[data-regim] summary').click();
  await expect(e1.locator('[data-camp="plonjare"]')).toBeVisible();
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
  // Frezele în plus, cu listele lor „Din frezele mele” (ADR 0300 §4, felia 16.A↑b-5): de rest, ale dopului, a fundului plat, a benzii.
  await e1.locator('[data-camp="rest-adauga"]').click();
  await expect(e1.locator('[data-camp="rest-biblioteca"]')).toHaveCount(1);
  await e2.locator('[data-camp="inc-freza-dop"]').check();
  await e2.locator('[data-camp="dop-rest-adauga"]').click();
  await expect(e2.locator('[data-camp="dop-biblioteca"]')).toBeVisible();
  expect(await ceIese(page), 'frezele de rest și ale dopului').toEqual([]);
  await alege(e1, 'latura', 'incrustatie');
  await e1.locator('[data-camp="fund-rest-adauga"]').click();
  await alege(e1, 'inc-jur', 'banda');
  await e1.locator('[data-camp="banda-freza"]').check();
  await expect(e1.locator('[data-camp="fund-biblioteca"]')).toBeVisible();
  await expect(e1.locator('[data-camp="banda-biblioteca"]')).toBeVisible();
  expect(await ceIese(page), 'fundul plat și banda').toEqual([]);
}

/**
 * Lista din stânga (28.8↑k, constatarea 8 a auditului): rândurile ei stau unul sub altul, fiecare cât conținutul lui (o coloană
 * flex strângea capul listei, „Foaia și originea” și „Mașina și fișierul”, până se suprapuneau, cu „A mea” pornită).
 */
function listaStransa(page: Page): Promise<string[]> {
  return page.locator('[data-lista]').evaluate((l) => {
    if (getComputedStyle(l).flexDirection === 'row') return [];
    const rau: string[] = [];
    let jos = -Infinity;
    for (const x of l.querySelectorAll<HTMLElement>(':scope > *, :scope > .dx-nav-op > *')) {
      if (x.classList.contains('dx-nav-op')) continue;
      const r = x.getBoundingClientRect(), nume = `${x.className} ${x.dataset['nav'] ?? x.dataset['navOp'] ?? ''}`.trim();
      if (r.height === 0) continue;
      if (x.scrollHeight > x.clientHeight + 1) rau.push(`strâns ${nume}: ${String(x.scrollHeight)} > ${String(x.clientHeight)}`);
      if (!x.closest('.ordine') && r.top < jos - 1) rau.push(`peste rândul de deasupra ${nume}`);
      if (!x.classList.contains('ordine')) jos = Math.max(jos, r.bottom);
    }
    return rau;
  });
}

for (const [locale, limba] of [['ro-RO', 'română'], ['en-GB', 'engleză']] as const) {
  test.describe(`în ${limba}`, () => {
    test.use({ locale });
    for (const [latime, inaltime] of [[1280, 800], [1024, 768]] as const) {
      test(`la ${latime} px, cu fontul lat, nimic nu iese și niciun text nu e tăiat, pe nicio tăietură`, async ({ page }) => {
        await page.setViewportSize({ width: latime, height: inaltime });
        await deschide(page);
        await prinToate(page);
        // Fundul plat (28.8↑k, constatarea 10): numărul, diametrul și pasul frezei drepte pe același rând, ca la freza operației.
        const fund = fisa(page, 'e1/e1');
        const sus = await Promise.all(['fund-scula', 'fund-diametru', 'fund-pas'].map(async (c) => (await fund.locator(`[data-camp="${c}"]`).boundingBox())?.y ?? -1));
        expect(Math.max(...sus) - Math.min(...sus), 'câmpurile fundului plat').toBeLessThan(2);
      });
    }
    test('cu „A mea” și trei operații, la 1280 × 720, rândurile listei nu se strâng și nu se suprapun', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/');
      await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
      await adauga(page, 'dreptunghi');
      await adauga(page, 'cerc');
      await adauga(page, 'cerc');
      await page.locator('[data-actiune="export.gcode"]').click();
      await expect(page.locator('[data-nav-op]')).toHaveCount(3);
      expect(await listaStransa(page), 'în ordinea automată').toEqual([]);
      await page.locator('[data-ordine="a-mea"]').click();
      await expect(page.locator('[data-ordine="inapoi"]')).toBeVisible();
      expect(await listaStransa(page), 'în ordinea mea').toEqual([]);
      expect(await ceIese(page), 'în ordinea mea').toEqual([]);
    });
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

/**
 * Telefonul culcat (28.8↑l; găsit la 28.8↑h-2, când banda listei lăsa fișelor 9 px): la 640 × 360, cu fontul lat, fișelor le
 * rămâne cel puțin o treime din fereastră, iar rândurile benzii se ating.
 */
test.describe('pe telefonul culcat', () => {
  test.use({ viewport: { width: 640, height: 360 }, hasTouch: true, isMobile: true, locale: 'ro-RO' });
  test('la 640 × 360: fișelor le rămâne cel puțin o treime din fereastră; rândurile benzii se ating', async ({ page }) => {
    await deschide(page);
    expect((await page.locator('[data-fise]').boundingBox())?.height ?? 0, 'înălțimea fișelor').toBeGreaterThanOrEqual(360 / 3);
    for (const nav of ['masina', 'e2/e2', 'foaia']) {
      await page.locator(`[data-nav="${nav}"]`).tap();
      await expect(page.locator(`[data-nav="${nav}"]`)).toHaveAttribute('aria-current', 'true');
    }
    expect(await ceIese(page)).toEqual([]);
  });
});

/** Țintele ferestrei: înălțimea fiecăreia (cel puțin `minim`) și ce lovește clicul în centrul ei (ea sau ceva din ea). */
function tinteMici(page: Page, minim: number): Promise<string[]> {
  return page.evaluate((m) => {
    const cutie = document.querySelector('.dialog-cutie');
    if (!cutie) return ['fără fereastră'];
    const sel = 'button, select, input[type="text"], label:has(> input[type="checkbox"]), label.alegere, .dx-card, .dx-regim > summary, .dx-inceput summary';
    const rau: string[] = [];
    for (const e of cutie.querySelectorAll<HTMLElement>(sel)) {
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      if (s.display === 'none' || s.visibility === 'hidden' || r.height === 0) continue;
      // Ce stă într-un rând strâns (`details` închis, afară de rezumatul lui) nu se vede: Chrome îi dă dreptunghiul, dar nu-l arată.
      const strans = e.closest('details');
      if (strans && !strans.open && !e.closest('summary')) continue;
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
    // Parcarea într-un punct (felia 28.8↑p): și X și Y, în fișa mașinii.
    await alege(page.locator('[data-grup="aer"]'), 'parcare', 'punct');
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

/**
 * Rândul finisării reliefului (ADR 0312 §7; editabil din felia 18.1↑d-4): dreptunghiul și un relief cu rolul „finisarea reliefului”, apoi
 * fereastra, cu fontul lat. Finisarea e primul rând (ordinea automată), cu fișa ei. Pe telefon nu se desenează (ADR 0250 §7:
 * panoul de proprietăți nu se arată), deci foaia se pregătește la lățimea de calculator, iar fereastra se deschide la `latime`.
 */
async function deschideCuFinisare(page: Page, latime?: { readonly width: number; readonly height: number }, relief3d = false): Promise<void> {
  if (latime) await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
  await adauga(page, 'dreptunghi');
  await importaRelief(page);
  if (relief3d) await rolRelief3d(page);
  else await rolFinisare(page);
  if (latime) await page.setViewportSize(latime);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nav-op][data-fel="finisare"]')).toBeVisible();
  await expect(page.locator('[data-fisa="op"][data-fel="finisare"]')).toHaveCount(1);
  if (relief3d) await expect(page.locator('[data-nav-op][data-fel="degrosare"]')).toBeVisible();
}

test.describe('cu finisarea reliefului (rândul editabil)', () => {
  for (const [locale, limba] of [['ro-RO', 'română'], ['en-GB', 'engleză']] as const) {
    test.describe(`în ${limba}`, () => {
      test.use({ locale });
      for (const [latime, inaltime] of [[1280, 800], [1024, 768]] as const) {
        test(`la ${latime} px, cu fontul lat: rândul și fișa finisării, nimic nu iese, niciun text tăiat; și în ordinea mea`, async ({ page }) => {
          await page.setViewportSize({ width: latime, height: inaltime });
          await deschideCuFinisare(page);
          await page.locator('[data-nav-op][data-fel="finisare"] [data-nav]').click();
          expect(await ceIese(page), 'fișa finisării').toEqual([]);
          // Cu freza în V (unghiul și vârful) și planul zero, fișa are toate câmpurile ei (felia 18.1↑d-4).
          const f = page.locator('[data-fisa="op"][data-fel="finisare"]');
          await f.locator('[data-camp="relief-forma"]').selectOption('v');
          await alege(f, 'relief-z', 'plan');
          await expect(f.locator('[data-camp="relief-varf-v"]')).toBeVisible();
          await expect(f.locator('[data-camp="relief-plan-zero"]')).toBeVisible();
          expect(await ceIese(page), 'fișa finisării, cu V și planul zero').toEqual([]);
          await page.locator('[data-ordine="a-mea"]').click();
          await expect(page.locator('[data-nav-op][data-fel="finisare"] [data-jos]')).toBeVisible();
          expect(await ceIese(page), 'ordinea mea').toEqual([]);
        });
      }
      test.describe('pe telefon', () => {
        test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale });
        test('la 390 px: rândul finisării se atinge și deschide fișa ei; nimic nu iese', async ({ page }) => {
          await deschideCuFinisare(page, { width: 390, height: 844 });
          const nav = page.locator('[data-nav-op][data-fel="finisare"] [data-nav]');
          await nav.tap();
          await expect(nav).toHaveAttribute('aria-current', 'true');
          expect(await ceIese(page), 'fișa finisării, pe telefon').toEqual([]);
        });
      });
    });
  }
  test.describe('în Atelier, cu densitatea mare', () => {
    test.use({ locale: 'ro-RO', viewport: { width: 1280, height: 800 } });
    test('rândul finisării: țintele au cel puțin 48 px și se lovesc în centrul lor, și cu ordinea mea', async ({ page }) => {
      await page.addInitScript(() => { localStorage.setItem('cncvs2.aranjament', JSON.stringify({ v: 1, aranjament: 'atelier', densitate: 'mare' })); });
      await deschideCuFinisare(page);
      await page.locator('[data-nav-op][data-fel="finisare"] [data-nav]').click();
      expect(await tinteMici(page, 48), 'fișa finisării').toEqual([]);
      await page.locator('[data-ordine="a-mea"]').click();
      await expect(page.locator('[data-sus]')).toHaveCount(2);
      expect(await tinteMici(page, 48), 'ordinea mea').toEqual([]);
      expect(await ceIese(page), 'ordinea mea').toEqual([]);
    });
  });
});

/**
 * Rândul degroșării reliefului (ADR 0313 §7; editabil din felia 18.1↑d-4), lângă al finisării: rolul „Relief 3D”, apoi fereastra, cu fontul
 * lat, în română și în engleză, la 1280 și 1024 px, pe telefon și în Atelier cu densitatea mare.
 */
test.describe('cu degroșarea reliefului (rolul „Relief 3D”, rândurile editabile)', () => {
  for (const [locale, limba] of [['ro-RO', 'română'], ['en-GB', 'engleză']] as const) {
    test.describe(`în ${limba}`, () => {
      test.use({ locale });
      for (const [latime, inaltime] of [[1280, 800], [1024, 768]] as const) {
        test(`la ${latime} px, cu fontul lat: rândul și fișa degroșării, nimic nu iese; și în ordinea mea`, async ({ page }) => {
          await page.setViewportSize({ width: latime, height: inaltime });
          await deschideCuFinisare(page, undefined, true);
          await page.locator('[data-nav-op][data-fel="degrosare"] [data-nav]').click();
          await expect(page.locator('[data-fisa="op"][data-fel="degrosare"]')).toHaveCount(1);
          expect(await ceIese(page), 'fișa degroșării').toEqual([]);
          await page.locator('[data-ordine="a-mea"]').click();
          await expect(page.locator('[data-nav-op][data-fel="degrosare"] [data-jos]')).toBeVisible();
          expect(await ceIese(page), 'ordinea mea').toEqual([]);
        });
      }
      test.describe('pe telefon', () => {
        test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale });
        test('la 390 px: rândul degroșării se atinge și deschide fișa ei; nimic nu iese', async ({ page }) => {
          await deschideCuFinisare(page, { width: 390, height: 844 }, true);
          const nav = page.locator('[data-nav-op][data-fel="degrosare"] [data-nav]');
          await nav.tap();
          await expect(nav).toHaveAttribute('aria-current', 'true');
          expect(await ceIese(page), 'fișa degroșării, pe telefon').toEqual([]);
        });
      });
    });
  }
  test.describe('în Atelier, cu densitatea mare', () => {
    test.use({ locale: 'ro-RO', viewport: { width: 1280, height: 800 } });
    test('rândul degroșării: țintele au cel puțin 48 px și se lovesc în centrul lor, și cu ordinea mea', async ({ page }) => {
      await page.addInitScript(() => { localStorage.setItem('cncvs2.aranjament', JSON.stringify({ v: 1, aranjament: 'atelier', densitate: 'mare' })); });
      await deschideCuFinisare(page, undefined, true);
      await page.locator('[data-nav-op][data-fel="degrosare"] [data-nav]').click();
      expect(await tinteMici(page, 48), 'fișa degroșării').toEqual([]);
      await page.locator('[data-ordine="a-mea"]').click();
      await expect(page.locator('[data-sus]')).toHaveCount(3);
      expect(await tinteMici(page, 48), 'ordinea mea').toEqual([]);
      expect(await ceIese(page), 'ordinea mea').toEqual([]);
    });
  });
});

/**
 * Începutul fișierelor în Rezultat (ADR 0292, felia 28.8↑r): liniile lungi ale antetului se derulează în locul lor, deci nimic
 * nu iese din fereastră, la 1280, 1024 și 390 px, cu fontul lat; rândul fișierului are ținta mare cu densitatea mare.
 */
test.describe('începutul fișierelor, după export', () => {
  test.use({ locale: 'ro-RO' });
  for (const [latime, inaltime] of [[1280, 800], [1024, 768], [390, 844]] as const) {
    test(`la ${latime} px, cu fontul lat: nimic nu iese, iar liniile se derulează în locul lor`, async ({ page }) => {
      await page.setViewportSize({ width: latime, height: inaltime });
      await deschide(page);
      await page.locator('[data-buton="exporta"]').click();
      const pre = page.locator('[data-inceput] pre').first();
      await expect(pre).toBeVisible();
      expect(await ceIese(page), 'începutul fișierului').toEqual([]);
      expect(await pre.evaluate((e) => getComputedStyle(e).overflowX), 'derularea liniilor').toBe('auto');
    });
  }
  test('cu densitatea mare, rândul fișierului are cel puțin 48 px și se lovește în centrul lui', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('cncvs2.aranjament', JSON.stringify({ v: 1, aranjament: 'atelier', densitate: 'mare' })); });
    await deschide(page);
    await page.locator('[data-buton="exporta"]').click();
    await expect(page.locator('[data-inceput] summary').first()).toBeVisible();
    await page.locator('[data-nav="rezultatul"]').click();
    expect(await tinteMici(page, 48), 'Rezultatul, cu începutul fișierelor').toEqual([]);
  });
});
