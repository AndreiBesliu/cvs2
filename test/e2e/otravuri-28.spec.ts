import { test, expect, type Page } from '@playwright/test';

/**
 * Otrăvurile scăpate ale feliilor 2.8c / 2.8d, prinse doar în browser (2.8e, sesiunea independentă, `test/otravuri/2.8.py`).
 * Fiecare test trece pe codul curat și pică cu otrava lui (probat cu `otravuri.py … tinte`).
 */
test.use({ locale: 'ro-RO' });

async function panouDeschis(page: Page): Promise<void> {
  const panou = page.locator('[data-panou="proprietati"]');
  if ((await panou.getAttribute('data-deschis')) !== 'true') await page.locator('[data-actiune="vedere.proprietati"]').first().click();
  await expect(panou).toHaveAttribute('data-deschis', 'true');
}
const camp = (page: Page, nume: string) => page.locator(`[data-camp="${nume}"]`);
const motiv = (page: Page, nume: string) => page.locator(`[data-motiv="${nume}"]`);
const strat = (page: Page) => page.getByTestId('strat-traseu');
const INVALID = 'Valoarea trebuie să fie un număr';

async function scrie(page: Page, nume: string, valoare: string): Promise<void> {
  await camp(page, nume).fill(valoare);
  await camp(page, nume).press('Enter');
}

test('P02 / P03: Y aplicat mută doar pe Y; un X negativ e primit și arătat cu semnul lui', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await panouDeschis(page);
  await scrie(page, 'pozitie-y', '5');
  await expect(camp(page, 'pozitie-y')).toHaveValue('5');
  await expect(camp(page, 'pozitie-x')).toHaveValue('20');
  await scrie(page, 'pozitie-x', '-5');
  await expect(camp(page, 'pozitie-x')).toHaveValue('-5');
  await expect(motiv(page, 'pozitie-x')).toHaveCount(0);
  await expect(camp(page, 'pozitie-y')).toHaveValue('5');
});

test('P06 / C07: înălțimea foii schimbă doar înălțimea; o dimensiune cu semn e „valoare invalidă” și nu se aplică', async ({ page }) => {
  await page.goto('/');
  await panouDeschis(page);
  const latime = await camp(page, 'foaie-latime').inputValue();
  await scrie(page, 'foaie-inaltime', '150');
  await expect(camp(page, 'foaie-inaltime')).toHaveValue('150');
  await expect(camp(page, 'foaie-latime')).toHaveValue(latime);
  for (const v of ['-5', '+300']) {
    await scrie(page, 'foaie-latime', v);
    await expect(motiv(page, 'foaie-latime'), v).toContainText(INVALID);
    await camp(page, 'foaie-latime').press('Escape');
    await expect(camp(page, 'foaie-latime'), v).toHaveValue(latime);
  }
  await expect(camp(page, 'foaie-inaltime')).toHaveValue('150');
});

test('C05: după un motiv, prima tastă îl scoate, cu aria-invalid, înaintea lui Enter', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await panouDeschis(page);
  await scrie(page, 'pozitie-x', 'abc');
  await expect(motiv(page, 'pozitie-x')).toContainText(INVALID);
  await expect(camp(page, 'pozitie-x')).toHaveAttribute('aria-invalid', 'true');
  await camp(page, 'pozitie-x').press('Backspace');
  await expect(motiv(page, 'pozitie-x')).toHaveCount(0);
  await expect(camp(page, 'pozitie-x')).toHaveAttribute('aria-invalid', 'false');
});

test('C04: rotirea 360 pe o formă nerotită arată 0 și nu e o comandă (prima anulare scoate forma)', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await panouDeschis(page);
  await expect(camp(page, 'rotire')).toHaveValue('0');
  await scrie(page, 'rotire', '360');
  await expect(camp(page, 'rotire')).toHaveValue('0');
  await page.locator('[data-actiune="istoric.anuleaza"]').first().click();
  await expect(page.locator('[data-instanta]')).toHaveCount(0);
});

test('P01: textul greșit al unei forme nu trece la forma aleasă apoi; câmpul arată colțul ei, fără motiv', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await panouDeschis(page);
  await page.locator('[data-instanta="e2"]').click();
  const xCerc = await camp(page, 'pozitie-x').inputValue();
  await page.locator('[data-instanta="e1"]').click();
  await expect(camp(page, 'pozitie-x')).toHaveValue('20');
  await scrie(page, 'pozitie-x', 'abc');
  await expect(motiv(page, 'pozitie-x')).toContainText(INVALID);
  await page.locator('[data-instanta="e2"]').click();
  await expect(camp(page, 'pozitie-x')).toHaveValue(xCerc);
  await expect(motiv(page, 'pozitie-x')).toHaveCount(0);
});

/** Alfa maxim al pixelilor stratului (`preserveDrawingBuffer`: canvasul se poate citi după cadru). */
async function alfaMaxim(page: Page): Promise<number> {
  return page.evaluate(() => {
    const s = document.querySelector<HTMLCanvasElement>('[data-testid="strat-traseu"]');
    if (!s) return -1;
    const c = document.createElement('canvas');
    c.width = s.width;
    c.height = s.height;
    const g = c.getContext('2d');
    if (!g) return -1;
    g.drawImage(s, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let m = 0;
    for (let i = 3; i < d.length; i += 4) m = Math.max(m, d[i] ?? 0);
    return m;
  });
}

test('S06: traseul vechi e stins în pixeli (alfa ≈ 0,35 din cel la zi), nu doar în atribut', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.keyboard.press('t');
  await expect(strat(page)).toHaveAttribute('data-varfuri', /^[1-9]/);
  await expect.poll(() => alfaMaxim(page)).toBeGreaterThan(200);
  const laZi = await alfaMaxim(page);
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await expect(strat(page)).toHaveAttribute('data-stins', 'true');
  await expect.poll(async () => (await alfaMaxim(page)) / laZi).toBeLessThan(0.45);
  const raport = (await alfaMaxim(page)) / laZi;
  expect(raport).toBeGreaterThan(0.25);
});

test('S02: cu traseul cu totul în afara vederii, stratul nu urcă nicio bucată (data-varfuri = 0)', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.keyboard.press('t');
  await expect(strat(page)).toHaveAttribute('data-varfuri', /^[1-9]/);
  // Punctul (270, 170) mm al foii e gol (dreptunghiul stă la 20–120 × 20–80 mm): zoomul acolo scoate traseul din vedere.
  // Ecranul din vedere: x = tx + X·scara, y = ty − Y·scara (punctul din colțul ferestrei poate cădea peste bare).
  const v = await page.getByTestId('panza').evaluate((e) => ({ ...(e as HTMLElement).dataset }));
  const scara = Number(v['scara']);
  await page.mouse.move(Number(v['tx']) + 270 * scara, Number(v['ty']) - 170 * scara);
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(30);
  }
  await expect(strat(page)).toHaveAttribute('data-varfuri', '0');
});

test('AP07: la dpr 2, treapta de zoom ține săgeata sub ½ px FIZIC: același cerc urcă mai multe vârfuri decât la dpr 1', async ({ browser }) => {
  const varfuri = async (dpr: number): Promise<number> => {
    const ctx = await browser.newContext({ deviceScaleFactor: dpr, locale: 'ro-RO', viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.locator('[data-actiune="document.adauga-cerc"]').click();
    await page.keyboard.press('t');
    await expect(strat(page)).toHaveAttribute('data-varfuri', /^[1-9]/);
    const n = Number(await strat(page).getAttribute('data-varfuri'));
    await ctx.close();
    return n;
  };
  const v1 = await varfuri(1);
  const v2 = await varfuri(2);
  expect(v2, `dpr 1: ${v1} vârfuri, dpr 2: ${v2}`).toBeGreaterThan(v1);
});
