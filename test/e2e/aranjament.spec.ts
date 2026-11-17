import { test, expect, type Locator, type Page } from '@playwright/test';
import { deschideMeniulContului } from './ajutor-panza.ts';

/**
 * Alegerea aranjamentului și a densității (ADR 0250 §4, §5, felia 28.1↑a): citită din `localStorage`
 * (`cncvs2.aranjament`) înaintea primei randări. Proba ia atributele lui `<html>` la `DOMContentLoaded` (înaintea primei
 * randări a aplicației) și după pornire: trebuie să fie aceleași, deci nimic nu se schimbă pe ecran după pornire.
 *
 * Fereastra Aspectul (ADR 0250 §3, felia 28.1↑b): din meniul contului și din paletă; se aplică pe loc, Renunță sau Escape
 * pune la loc ce era, Păstrează ține alegerea. Clasic, Atelier și Pas cu pas se văd, „în curând”, fără să se poată alege.
 */
test.use({ locale: 'ro-RO' });

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

/** Fereastra Aspectul, deschisă din rândul ei din meniul contului. */
async function deschideAspectul(page: Page, nume = 'Aspectul interfeței'): Promise<Locator> {
  const meniu = await deschideMeniulContului(page);
  await meniu.locator('[data-meniu-cont="aspect"]').click();
  await expect(meniu).toHaveCount(0);
  const f = page.getByRole('dialog', { name: nume });
  await expect(f).toBeVisible();
  return f;
}

const tinut = (page: Page, cheie = CHEIE): Promise<string | null> => page.evaluate((c) => localStorage.getItem(c), cheie);

test('meniul contului: „Aspectul…” după Manual, cu aranjamentul de acum; fereastra arată cele patru, trei „în curând”', async ({ page }) => {
  await page.goto('/');
  const meniu = await deschideMeniulContului(page);
  const rand = meniu.locator('[data-meniu-cont="manual"] + [data-meniu-cont="aspect"]');
  await expect(rand.locator('span').first()).toHaveText('Aspectul…');
  await expect(rand.locator('small')).toHaveText('Insule');
  await rand.click();
  const f = page.getByRole('dialog', { name: 'Aspectul interfeței' });
  await expect(f).toBeVisible();
  await expect(f).toContainText('Se aplică pe loc. Alegerea rămâne pe acest dispozitiv; pe tabletă poți alege altul.');
  // Cele patru, în ordinea din ADR; doar Insule se poate alege acum, și e aleasă, cu focusul pe ea.
  const aranjamente = f.getByRole('radiogroup', { name: 'Aranjamentul' }).getByRole('radio');
  await expect(aranjamente).toHaveCount(4);
  const insule = f.getByRole('radio', { name: 'Insule implicit' });
  await expect(insule).toBeChecked();
  await expect(insule).toBeEnabled();
  await expect(insule).toBeFocused();
  await expect(insule).toHaveAccessibleDescription('Pânza pe tot ecranul, barele plutesc deasupra ei.');
  for (const [nume, descriere] of [
    ['Clasic', 'Meniuri, panouri andocate și linia de comandă.'],
    ['Atelier', 'Butoane mari, pentru tabletă și lângă mașină.'],
    ['Pas cu pas', 'Te duce de la desen la mașină, pas cu pas.'],
  ] as const) {
    const r = f.getByRole('radio', { name: `${nume} în curând` });
    await expect(r).toBeDisabled();
    await expect(r).not.toBeChecked();
    await expect(r).toHaveAccessibleDescription(descriere);
  }
  // Tema și densitatea, cu ce e acum: după sistem, butoanele obișnuite.
  await expect(f.getByRole('radiogroup', { name: 'Tema' }).getByRole('radio', { name: 'după sistem' })).toBeChecked();
  await expect(f.getByRole('switch', { name: 'Butoane mari' })).not.toBeChecked();
  await expect(f.getByRole('switch', { name: 'Butoane mari' })).toHaveAccessibleDescription('48 px; 56 pe ecran tactil');
  // F1 deschide manualul la capitolul ferestrei; Escape închide manualul, iar fereastra rămâne.
  await page.keyboard.press('F1');
  await expect(page.getByTestId('manual')).toHaveAttribute('data-stare', 'gata');
  await expect(page.getByTestId('manual-capitol')).toHaveAttribute('data-capitol', 'aspect');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('manual')).toHaveCount(0);
  await expect(f).toBeVisible();
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('Butoane mari se aplică pe loc; Escape pune la loc densitatea, fără să scrie nimic; focusul se întoarce la Cont', async ({ page }) => {
  await page.goto('/');
  expect(await inaltimeaButonului(page)).toBeCloseTo(36, 0);
  const f = await deschideAspectul(page);
  await f.getByRole('switch', { name: 'Butoane mari' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-densitate', 'mare');
  expect(await inaltimeaButonului(page)).toBeCloseTo(48, 0);
  expect(await tinut(page)).toBeNull();
  await page.keyboard.press('Escape');
  await expect(f).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-densitate', 'normala');
  expect(await inaltimeaButonului(page)).toBeCloseTo(36, 0);
  expect(await tinut(page)).toBeNull();
  await expect(page.locator('[data-editare="cont"]')).toBeFocused();
  // Renunță face la fel.
  const g = await deschideAspectul(page);
  await g.getByRole('switch', { name: 'Butoane mari' }).check();
  await g.getByRole('button', { name: 'Renunță' }).click();
  await expect(g).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-densitate', 'normala');
  expect(await tinut(page)).toBeNull();
});

test('Păstrează ține alegerea: după reîncărcare, butoanele mari de la prima randare; apoi înapoi la cele obișnuite', async ({ page }) => {
  await cuAlegerea(page, null);
  await page.goto('/');
  const f = await deschideAspectul(page);
  await f.getByRole('switch', { name: 'Butoane mari' }).check();
  await f.getByRole('button', { name: 'Păstrează' }).click();
  await expect(f).toHaveCount(0);
  expect(await tinut(page)).toBe('{"v":1,"aranjament":"modern","densitate":"mare"}');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('CNC Vector Studio');
  const a = await atributele(page);
  expect(a.laIncarcare).toEqual({ aranjament: 'modern', densitate: 'mare' });
  expect(a.acum).toEqual({ aranjament: 'modern', densitate: 'mare' });
  expect(await inaltimeaButonului(page)).toBeCloseTo(48, 0);
  const g = await deschideAspectul(page);
  await expect(g.getByRole('switch', { name: 'Butoane mari' })).toBeChecked();
  await g.getByRole('switch', { name: 'Butoane mari' }).uncheck();
  await g.getByRole('button', { name: 'Păstrează' }).click();
  expect(await tinut(page)).toBe('{"v":1,"aranjament":"modern","densitate":"normala"}');
  expect(await inaltimeaButonului(page)).toBeCloseTo(36, 0);
});

test.describe('tema din fereastră', () => {
  test.use({ colorScheme: 'light' });

  test('se aplică pe loc, iar butonul temei din bară o arată; Renunță pune la loc tema de dinainte; Păstrează o ține', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const buton = page.locator('[data-actiune="vedere.tema"]');
    await expect(html).toHaveAttribute('data-tema', 'auto');
    const f = await deschideAspectul(page);
    await f.getByRole('radio', { name: 'întunecată' }).check();
    await expect(html).toHaveAttribute('data-tema', 'intunecata');
    await expect(buton).toHaveAccessibleName('Tema: întunecată');
    await f.getByRole('button', { name: 'Renunță' }).click();
    await expect(html).toHaveAttribute('data-tema', 'auto');
    await expect(buton).toHaveAccessibleName('Tema: după sistem');
    expect(await tinut(page, 'cncvs2.tema') ?? 'auto').toBe('auto');
    const g = await deschideAspectul(page);
    await g.getByRole('radio', { name: 'întunecată' }).check();
    await g.getByRole('button', { name: 'Păstrează' }).click();
    await page.reload();
    await expect(html).toHaveAttribute('data-tema', 'intunecata');
    await expect(buton).toHaveAccessibleName('Tema: întunecată');
  });
});

test('din paletă, și peste fereastra Mașina: fereastra Aspectul se deschide, iar fereastra de dedesubt rămâne aceeași', async ({ page }) => {
  await page.goto('/');
  const masina = page.locator('[data-actiune="vedere.masina"]');
  await masina.click();
  await expect(masina).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Control+k');
  const paleta = page.getByRole('dialog', { name: 'Paleta de comenzi' });
  await expect(paleta).toBeVisible();
  await paleta.getByRole('combobox').fill('aspectul');
  await page.locator('[id="paleta-vedere.aspect"]').click();
  const f = page.getByRole('dialog', { name: 'Aspectul interfeței' });
  await expect(f).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(f).toHaveCount(0);
  await expect(masina).toHaveAttribute('aria-current', 'page');
});

test('în engleză: rândul, fereastra și numele aranjamentelor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  const meniu = await deschideMeniulContului(page);
  const rand = meniu.locator('[data-meniu-cont="aspect"]');
  await expect(rand.locator('span').first()).toHaveText('Appearance…');
  await expect(rand.locator('small')).toHaveText('Islands');
  await rand.click();
  const f = page.getByRole('dialog', { name: 'Interface appearance' });
  await expect(f).toBeVisible();
  await expect(f.getByRole('radio', { name: 'Islands default' })).toBeChecked();
  for (const nume of ['Classic', 'Workshop', 'Step by step']) await expect(f.getByRole('radio', { name: `${nume} coming soon` })).toBeDisabled();
  await expect(f.getByRole('switch', { name: 'Big buttons' })).toBeVisible();
  await expect(f.getByRole('button', { name: 'Keep' })).toBeVisible();
  await f.getByRole('button', { name: 'Cancel' }).click();
  await expect(f).toHaveCount(0);
});
