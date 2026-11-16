import { test, expect, type Page } from '@playwright/test';

/**
 * Alegerea aranjamentului și a densității (ADR 0250 §4, §5, felia 28.1↑a): citită din `localStorage`
 * (`cncvs2.aranjament`) înaintea primei randări. Proba ia atributele lui `<html>` la `DOMContentLoaded` (înaintea primei
 * randări a aplicației) și după pornire: trebuie să fie aceleași, deci nimic nu se schimbă pe ecran după pornire.
 */
const CHEIE = 'cncvs2.aranjament';

/** Pune alegerea înaintea încărcării și ține minte atributele lui `<html>` la `DOMContentLoaded`. */
async function cuAlegerea(page: Page, valoare: string | null): Promise<void> {
  await page.addInitScript(([cheie, v]) => {
    if (v !== null && sessionStorage.getItem('aranjament-pus') === null) {
      localStorage.setItem(cheie, v);
      sessionStorage.setItem('aranjament-pus', '1');
    }
    document.addEventListener('DOMContentLoaded', () => {
      const d = document.documentElement.dataset;
      (window as unknown as { laIncarcare: unknown }).laIncarcare = { aranjament: d['aranjament'] ?? null, densitate: d['densitate'] ?? null };
    });
  }, [CHEIE, valoare] as const);
}

async function atributele(page: Page): Promise<{ laIncarcare: unknown; acum: unknown }> {
  return page.evaluate(() => {
    const d = document.documentElement.dataset;
    return {
      laIncarcare: (window as unknown as { laIncarcare: unknown }).laIncarcare,
      acum: { aranjament: d['aranjament'] ?? null, densitate: d['densitate'] ?? null },
    };
  });
}

/** Înălțimea unui buton al barei de sus (Anulează), cu ținta minimă a densității. */
async function inaltimeaButonului(page: Page): Promise<number> {
  const b = page.locator('[data-actiune="istoric.anuleaza"]').first();
  await expect(b).toBeVisible();
  const cutie = await b.boundingBox();
  if (cutie === null) throw new Error('butonul Anulează n-are cutie');
  return cutie.height;
}

test('fără nimic ținut: Insule și densitatea normală, de la prima randare', async ({ page }) => {
  await cuAlegerea(page, null);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('CNC Vector Studio');
  const a = await atributele(page);
  expect(a.laIncarcare).toEqual({ aranjament: 'modern', densitate: 'normala' });
  expect(a.acum).toEqual({ aranjament: 'modern', densitate: 'normala' });
  expect(await inaltimeaButonului(page)).toBeCloseTo(36, 0);
});

test('densitatea mare ținută: butoanele de 48 px de la prima randare, și după reîncărcare', async ({ page }) => {
  await cuAlegerea(page, '{"v":1,"aranjament":"modern","densitate":"mare"}');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('CNC Vector Studio');
  const a = await atributele(page);
  expect(a.laIncarcare).toEqual({ aranjament: 'modern', densitate: 'mare' });
  expect(a.acum).toEqual({ aranjament: 'modern', densitate: 'mare' });
  expect(await inaltimeaButonului(page)).toBeCloseTo(48, 0);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('CNC Vector Studio');
  expect((await atributele(page)).acum).toEqual({ aranjament: 'modern', densitate: 'mare' });
  expect(await page.evaluate((c) => localStorage.getItem(c), CHEIE)).toBe('{"v":1,"aranjament":"modern","densitate":"mare"}');
});

test('o valoare stricată dă Insule și densitatea normală, fără erori în consolă', async ({ page }) => {
  const erori: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') erori.push(m.text()); });
  page.on('pageerror', (e) => erori.push(e.message));
  await cuAlegerea(page, '{"v":1,"aranjament":');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('CNC Vector Studio');
  expect((await atributele(page)).acum).toEqual({ aranjament: 'modern', densitate: 'normala' });
  expect(await inaltimeaButonului(page)).toBeCloseTo(36, 0);
  expect(erori).toEqual([]);
});

test('un aranjament pe care build-ul nu-l are încă: Insule, cu densitatea aleasă, iar alegerea omului rămâne ținută', async ({ page }) => {
  await cuAlegerea(page, '{"v":1,"aranjament":"atelier","densitate":"mare"}');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('CNC Vector Studio');
  expect((await atributele(page)).acum).toEqual({ aranjament: 'modern', densitate: 'mare' });
  expect(await page.evaluate((c) => localStorage.getItem(c), CHEIE)).toBe('{"v":1,"aranjament":"atelier","densitate":"mare"}');
});
