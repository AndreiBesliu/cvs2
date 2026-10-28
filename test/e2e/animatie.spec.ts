/**
 * Animația traseului (ADR 0099), pe build-ul servit: „Animează” din cipul timpului deschide panoul; pas cu pas, rulează (cu
 * viteza aleasă), glisorul, finalul; freza desenată pe pânză, la poziția din panou; Escape și „×” închid; un document schimbat
 * (traseul vechi) o închide singur.
 */
import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

async function deschide(page: Page): Promise<void> {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="vedere.traseu"]').click();
  await expect(page.getByTestId('traseu-timp')).toHaveText(/^Timpul jobului: /);
  await page.getByTestId('animatie-porneste').click();
  await expect(page.getByTestId('animatie')).toBeVisible();
}

const pas = (page: Page): Promise<number> => page.locator('[data-animatie="pas"]').getAttribute('data-pas').then(Number);
const t = (page: Page): Promise<number> => page.locator('[data-animatie="timp"]').getAttribute('data-t').then(Number);

test('panoul: la început, freza în pregătire la zeroul programului; pas cu pas înainte și înapoi', async ({ page }) => {
  await deschide(page);
  const panou = page.getByTestId('animatie');
  await expect(panou.locator('#animatie-titlu')).toHaveText('Animația traseului');
  await expect(panou.locator('[data-animatie="miscare"]')).toHaveAttribute('data-tip', 'pregatire');
  expect(await pas(page)).toBe(0);
  const poz = panou.locator('[data-animatie="pozitie"]');
  await expect(poz).toHaveAttribute('data-x', '0.000');
  await expect(poz).toHaveAttribute('data-y', '0.000');
  await expect(poz).toContainText('X 0,000');
  await expect(poz).toContainText('Freza T1');
  await panou.locator('[data-animatie="inainte"]').click();
  expect(await pas(page)).toBe(1);
  const t1 = await t(page);
  expect(t1).toBeGreaterThan(0);
  await panou.locator('[data-animatie="inainte"]').click();
  await panou.locator('[data-animatie="inainte"]').click();
  expect(await pas(page)).toBe(3);
  await panou.locator('[data-animatie="inapoi"]').click();
  expect(await pas(page)).toBe(2);
  await panou.locator('[data-animatie="inapoi"]').click();
  expect(await t(page)).toBeCloseTo(t1, 3);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('rulează cu viteza aleasă, se oprește singur la final (freza sus, la Z sigur); de la final o ia de la capăt', async ({ page }) => {
  await deschide(page);
  const panou = page.getByTestId('animatie');
  await panou.locator('[data-animatie="viteza"]').selectOption('500');
  await panou.locator('[data-animatie="reda"]').click();
  await expect(panou.locator('[data-animatie="opreste"]')).toBeVisible();
  await expect.poll(() => t(page)).toBeGreaterThan(0.5);
  // Finalul: butonul revine la „Rulează”, momentul e durata, freza urcată.
  await expect(panou.locator('[data-animatie="reda"]')).toBeVisible({ timeout: 30_000 });
  await expect(panou.locator('[data-animatie="miscare"]')).toHaveAttribute('data-tip', 'final');
  expect(Number(await panou.locator('[data-animatie="pozitie"]').getAttribute('data-z'))).toBeGreaterThan(0);
  const durata = await t(page);
  await panou.locator('[data-animatie="reda"]').click();
  await panou.locator('[data-animatie="opreste"]').click();
  expect(await t(page)).toBeLessThan(durata);
});

test('glisorul: Home la început, End la final; freza desenată pe pânză exact unde spune panoul', async ({ page }) => {
  await deschide(page);
  const panou = page.getByTestId('animatie');
  const glisor = panou.locator('[data-animatie="glisor"]');
  await glisor.focus();
  await page.keyboard.press('End');
  await expect(panou.locator('[data-animatie="miscare"]')).toHaveAttribute('data-tip', 'final');
  await page.keyboard.press('Home');
  expect(await pas(page)).toBe(0);
  // La jumătate: freza într-o tăiere sau între tăieri; stratul ei e desenat unde spune panoul.
  for (let i = 0; i < 6; i++) await panou.locator('[data-animatie="inainte"]').click();
  const strat = page.getByTestId('strat-animatie');
  const x = Number(await strat.getAttribute('data-x'));
  const y = Number(await strat.getAttribute('data-y'));
  expect(await panou.locator('[data-animatie="pozitie"]').getAttribute('data-x')).toBe(x.toFixed(3));
  const pe = await ecran(page, await vedere(page));
  const p = pe(x, y);
  // Centrul cercului frezei (crucea) e desenat: pixelul de lângă el nu e transparent.
  const alfa = await strat.evaluate((c: HTMLCanvasElement, q) => {
    const r = c.getBoundingClientRect();
    const k = c.width / r.width;
    const g = c.getContext('2d');
    const d = g?.getImageData(Math.round((q.x - r.left) * k), Math.round((q.y - r.top) * k), 1, 1).data;
    return d?.[3] ?? 0;
  }, p);
  expect(alfa).toBeGreaterThan(0);
  // Drumul parcurs e desenat și el: la final, cu tot drumul, mult mai mulți pixeli decât la început, cu freza singură (amândouă
  // cu freza deasupra materialului, deci același cerc gol). Doar cercul și crucea frezei trec singure de câteva sute de pixeli.
  const colorati = (): Promise<number> => strat.evaluate(async (c: HTMLCanvasElement) => {
    // Desenul vine din efectul de după randare: două cadre, ca să fie gata.
    await new Promise<void>((ok) => { requestAnimationFrame(() => { requestAnimationFrame(() => { ok(); }); }); });
    const d = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data ?? new Uint8ClampedArray();
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if ((d[i] ?? 0) > 0) n++;
    return n;
  });
  await glisor.focus();
  await page.keyboard.press('Home');
  await expect(strat).toHaveAttribute('data-pana', '0.000');
  const laInceput = await colorati();
  await page.keyboard.press('End');
  await expect(panou.locator('[data-animatie="miscare"]')).toHaveAttribute('data-tip', 'final');
  const laFinal = await colorati();
  expect(laFinal - laInceput).toBeGreaterThan(500);
});

test('„×” și Escape închid panoul și stratul frezei; un document schimbat închide animația singur', async ({ page }) => {
  await deschide(page);
  await page.locator('[data-animatie="inchide"]').click();
  await expect(page.getByTestId('animatie')).toHaveCount(0);
  await expect(page.getByTestId('strat-animatie')).toHaveCount(0);
  await page.getByTestId('animatie-porneste').click();
  await page.locator('[data-animatie="inainte"]').click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('animatie')).toHaveCount(0);
  await page.getByTestId('animatie-porneste').click();
  await expect(page.getByTestId('strat-animatie')).toHaveCount(1);
  // Documentul schimbat: traseul e vechi, cipul timpului dispare, deci și animația.
  await adauga(page, 'dreptunghi');
  await expect(page.getByTestId('traseu-stare')).toHaveAttribute('data-stare', 'traseu.vechi');
  await expect(page.getByTestId('animatie')).toHaveCount(0);
  await expect(page.getByTestId('strat-animatie')).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('în engleză: titlul, butonul și citirile au textele lor', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'en-GB' });
  const page = await ctx.newPage();
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="vedere.traseu"]').click();
  await expect(page.getByTestId('animatie-porneste')).toHaveText('Animate');
  await page.getByTestId('animatie-porneste').click();
  const panou = page.getByTestId('animatie');
  await expect(panou.locator('#animatie-titlu')).toHaveText('Toolpath animation');
  await expect(panou.locator('[data-animatie="miscare"]')).toHaveText('Getting ready: safe Z, spindle and its wait');
  await expect(panou.locator('[data-animatie="pas"]')).toHaveText(/^Step 0 of \d+$/);
  await ctx.close();
});
