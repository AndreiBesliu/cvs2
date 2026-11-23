import { test, expect, type Locator, type Page } from '@playwright/test';
import { pachetTrenulet } from '../../scripts/construieste-trenulet.ts';
import { impacheteaza } from '../../scripts/impacheteaza-extensie.ts';

/**
 * Țintele ferestrelor extensiilor (ADR 0231 §B.7, felia 3.Xh-2): la atingere, fiecare rând al meniului și fiecare buton are
 * cel puțin 44 px înălțime; la densitatea mare, cel puțin 48 px cu mausul. Și semnul extensiei în capul ferestrei de
 * confirmare a unui pachet din fișier (din pachet, înainte de instalare).
 */
test.use({ locale: 'ro-RO' });

const SALUT = Buffer.from(impacheteaza('extensii/salut').octeti);

const inaltimi = (l: Locator) => l.evaluateAll((e) => e.map((x) => Math.round(x.getBoundingClientRect().height)));
async function celPutin(l: Locator, minim: number, ce: string): Promise<void> {
  const h = await inaltimi(l);
  expect(h.length, `${ce}: se văd`).toBeGreaterThan(0);
  expect(Math.min(...h), `${ce}: ${JSON.stringify(h)}`).toBeGreaterThanOrEqual(minim);
}

/** Meniul, biblioteca sosită, fereastra de confirmare a unui pachet din fișier, gestionarea și întrebarea scoaterii. */
async function drumul(page: Page, minim: number): Promise<void> {
  await page.locator('[data-extensii="buton"]').click();
  const meniu = page.getByTestId('meniu-extensii');
  await expect(page.getByTestId('biblioteca').locator('[data-id="trenulet"]')).toBeVisible();
  await celPutin(meniu.locator('[role="menuitem"]'), minim, 'rândurile și butoanele meniului');
  // Fișierul e ales aici direct în câmpul lui: meniul, pe care alegerea din el l-ar fi închis, se închide întâi.
  await meniu.locator('[data-extensii="din-fisier"]').focus();
  await page.keyboard.press('Escape');
  await expect(meniu).toHaveCount(0);

  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: 'salut-1.0.0.zip', mimeType: 'application/zip', buffer: SALUT });
  const instalare = page.getByTestId('extensii-instalare');
  await expect(instalare.locator('[data-extensii="instaleaza"]')).toBeVisible();
  await celPutin(instalare.locator('button'), minim, 'butoanele confirmării');
  await instalare.locator('[data-extensii="instaleaza"]').click();
  await expect(instalare).toHaveCount(0);

  if (!await meniu.isVisible()) await page.locator('[data-extensii="buton"]').click();
  await celPutin(meniu.locator('[data-extensii="deschide"]'), minim, 'rândul extensiei instalate');
  await meniu.locator('[data-extensii="gestioneaza"]').click();
  const gest = page.getByTestId('extensii-gestionare');
  await celPutin(gest.locator('button'), minim, 'butoanele gestionării');
  await gest.locator('[data-extensii="scoate"]').click();
  await celPutin(page.getByTestId('extensii-scoatere').locator('button'), minim, 'butoanele întrebării');
}

test.describe('la atingere, pe telefon', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('fiecare rând al meniului și fiecare buton al ferestrelor are cel puțin 44 px', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'proba rulează cu un deget, nu cu mausul').toBe(true);
    await drumul(page, 44);
  });
});

/**
 * Ferestrele încap și pe cel mai îngust telefon, cu un font lat (Verdana aici, DejaVu Sans pe Linux, unde `system-ui` e
 * oricum lat): nimic nu iese din cutie în lateral, iar butoanele rămân pe ecran.
 */
for (const latime of [390, 360, 320]) {
  test.describe(`la ${latime} px, cu fontul lat`, () => {
    test.use({ viewport: { width: latime, height: 600 }, hasTouch: true, isMobile: true });

    test('confirmarea, gestionarea și întrebarea scoaterii încap în lățime', async ({ page }) => {
      const p = pachetTrenulet();
      await page.goto('/');
      await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
      const incape = async (test: string): Promise<void> => {
        const cutie = page.getByTestId(test).locator('.dialog-cutie');
        await expect(cutie).toBeVisible();
        const m = await cutie.evaluate((e) => {
          const r = e.getBoundingClientRect();
          const afara = [...e.querySelectorAll('*')].filter((x) => { const b = x.getBoundingClientRect(); return b.width > 0 && (b.left < r.left - 0.5 || b.right > r.right + 0.5); })
            .map((x) => `${x.tagName.toLowerCase()}.${x.className}`);
          return { stanga: r.left, dreapta: r.right, lat: innerWidth, derulare: e.scrollWidth - e.clientWidth, afara };
        });
        expect(m.stanga, `${test}: marginea din stânga`).toBeGreaterThanOrEqual(0);
        expect(m.dreapta, `${test}: marginea din dreapta`).toBeLessThanOrEqual(m.lat);
        expect(m.derulare, `${test}: fără derulare în lateral`).toBeLessThanOrEqual(0);
        expect(m.afara, `${test}: nimic nu iese din cutie`).toEqual([]);
      };
      await expect(page.locator('[data-extensii="buton"]')).toBeVisible();
      // Un nume de fișier lung, fără locuri de rupere: se frânge oriunde, nu împinge fereastra în lateral.
      await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: `easy3draw_pachetul_de_proba_cu_un_nume_foarte_lung_si_fara_spatii_${String(p.manifest.versiune)}.zip`, mimeType: 'application/zip', buffer: Buffer.from(p.octeti) });
      await expect(page.locator('[data-extensii="instaleaza"]')).toBeVisible();
      await incape('extensii-instalare');
      // O fereastră mai înaltă decât ecranul pornește de sus (numele extensiei și avertismentul se văd), iar butoanele rămân
      // lipite jos, la vedere: focusul pus pe „Instalează” n-o derulează la capăt.
      const v = await page.getByTestId('extensii-instalare').locator('.dialog-cutie').evaluate((e) => {
        const cutie = e.getBoundingClientRect();
        const cap = e.querySelector('h2')?.getBoundingClientRect();
        const afara = e.querySelector('[data-testid="extensii-din-afara"]')?.getBoundingClientRect();
        const buton = e.querySelector('[data-extensii="instaleaza"]')?.getBoundingClientRect();
        return { sus: cutie.top, jos: cutie.bottom, ecran: innerHeight, derulat: e.scrollTop, inalta: e.scrollHeight > e.clientHeight, cap: cap?.top, afara: afara?.top, buton: buton?.bottom };
      });
      expect(v.inalta, 'proba are sens doar cu o fereastră mai înaltă decât ecranul').toBe(true);
      expect(v.derulat, 'fereastra pornește de sus').toBe(0);
      expect(v.cap, 'titlul se vede').toBeGreaterThanOrEqual(v.sus);
      expect(v.afara, 'avertismentul se vede').toBeGreaterThanOrEqual(v.sus);
      expect(v.buton, 'butonul rămâne pe ecran').toBeLessThanOrEqual(Math.min(v.jos, v.ecran));
      await expect(page.locator('[data-extensii="instaleaza"]')).toBeFocused();
      await page.locator('[data-extensii="instaleaza"]').click();
      await expect(page.getByTestId('extensii-instalare')).toHaveCount(0);
      await page.locator('[data-extensii="buton"]').click();
      await page.getByTestId('meniu-extensii').locator('[data-extensii="gestioneaza"]').click();
      await incape('extensii-gestionare');
      await page.getByTestId('extensii-gestionare').locator('[data-extensii="scoate"]').click();
      await incape('extensii-scoatere');
    });
  });
}

test('la densitatea mare, cu mausul: cel puțin 48 px', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('cncvs2.aranjament', JSON.stringify({ v: 1, aranjament: 'insule', densitate: 'mare' })); });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-densitate', 'mare');
  await drumul(page, 48);
});

test('semnul în capul ferestrei de confirmare: al pachetului din fișier, înainte de instalare', async ({ page }) => {
  const p = pachetTrenulet();
  await page.goto('/');
  await expect(page.locator('[data-extensii="buton"]')).toBeVisible();
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: `trenulet-${String(p.manifest.versiune)}.zip`, mimeType: 'application/zip', buffer: Buffer.from(p.octeti) });
  const img = page.getByTestId('extensii-instalare').locator('.confirmare-cap img[data-semn]');
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  expect(await img.getAttribute('src')).toMatch(/^blob:/);
  expect(Math.round((await img.boundingBox())?.width ?? 0)).toBe(48);
  expect(await img.getAttribute('alt')).toBe('');
});
