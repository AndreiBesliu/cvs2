import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

/**
 * Testul pas cu pas (ADR 0072), cap-coadă pe build-ul real: adresa cu `?test` (nu pe live; din 31.10 fără buton în bară),
 * panoul cu pașii din `tutorial/unelte-desen.json`, Bine / Nu și nota, poza planșei, rezultatele după reîncărcare, raportul
 * descărcat (cu poza încorporată pe pasul ei și datele citibile), „Începe din nou”. După un clic pe panou, tastele uneltelor
 * merg imediat.
 */
const panou = (page: Page) => page.locator('aside.test-pas');
/** Bucata panoului (adusă la cerere): cerută doar cu `?test`, în afara instanței live. */
const bucataTestului = (url: string): boolean => /\/assets\/TestPasCuPas-[\w-]+\.js$/.test(url);

test('testul pas cu pas: pașii, Bine / Nu, nota, poza planșei, reîncărcarea, raportul și „Începe din nou”', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  const cereri: string[] = [];
  page.on('request', (r) => { cereri.push(r.url()); });
  await page.goto('/?test');
  await adauga(page, 'dreptunghi');
  await expect(panou(page)).toHaveAttribute('data-test-pas', 'p-deschide');
  // Martorul probei de mai jos: cu `?test`, bucata panoului e cerută.
  expect(cereri.some(bucataTestului)).toBe(true);
  await expect(panou(page)).toContainText('Fereastra și versiunea');
  await expect(panou(page).locator('[data-test="progres"]')).toHaveText('0 bine · 0 nu · 0 sărite · 31 rămase');

  // Bine, apoi focusul e al paginii: tasta R alege dreptunghiul.
  await panou(page).locator('[data-test-stare="bine"]').click();
  await expect(panou(page).locator('[data-test-stare="bine"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.keyboard.press('r');
  await expect(page.locator('[data-unealta="dreptunghi"]')).toHaveAttribute('aria-pressed', 'true');

  // Nota (tastele scrise acolo nu schimbă unealta) și poza planșei.
  await panou(page).locator('[data-test="nota"]').fill('rotunjirea arată bine');
  await expect(page.locator('[data-unealta="dreptunghi"]')).toHaveAttribute('aria-pressed', 'true');
  await panou(page).locator('[data-test="poza"]').click();
  await expect(panou(page).locator('[data-test="mesaj"]')).toHaveText('Poza e salvată (1 la pasul acesta).');
  await expect(panou(page)).toContainText('Poze la pasul acesta: 1');
  await panou(page).locator('[data-test="inainte"]').click();
  await expect(panou(page)).toHaveAttribute('data-test-pas', 'p-curata');
  await panou(page).locator('[data-test-stare="nu"]').click();
  await expect(panou(page).locator('[data-test="progres"]')).toHaveText('1 bine · 1 nu · 0 sărite · 29 rămase');

  // Reîncărcarea: rezultatele, pasul și poza rămân (în browser). Scrierea în bază e asincronă: reîncărcarea vine după ce „Nu”
  // a ajuns acolo (pe CI, 30.10, o reîncărcare imediată l-a pierdut).
  await expect.poll(() => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok, eroare) => {
      const r = indexedDB.open('cncvs2-test', 1);
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    const stari = await new Promise<unknown[]>((ok, eroare) => {
      const r = db.transaction('stari').objectStore('stari').getAll();
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    db.close();
    return JSON.stringify(stari).includes('"stare":"nu"');
  })).toBe(true);
  // Adresa păstrează `?test`: după reîncărcare, panoul se deschide singur.
  await page.reload();
  await expect(panou(page)).toHaveAttribute('data-test-pas', 'p-curata');
  await expect(panou(page).locator('[data-test="progres"]')).toHaveText('1 bine · 1 nu · 0 sărite · 29 rămase');
  await panou(page).locator('[data-test="pas"]').selectOption('0');
  await expect(panou(page)).toContainText('Poze la pasul acesta: 1');
  await expect(panou(page).locator('[data-test="nota"]')).toHaveValue('rotunjirea arată bine');

  // Raportul: un fișier HTML cu rezultatele, nota, poza încorporată pe pasul ei și datele citibile.
  const descarcare = page.waitForEvent('download');
  await panou(page).locator('[data-test="raport"]').click();
  const d = await descarcare;
  expect(d.suggestedFilename()).toMatch(/^raport-test-unelte-desen-\d{4}-\d{2}-\d{2}-\d{4}\.html$/);
  const html = readFileSync(await d.path(), 'utf8');
  expect(html).toContain('<h1>Testul uneltelor de desen</h1>');
  expect(html).toContain('1 bine · 1 nu · 0 sărite · 29 rămase');
  expect(html).toContain('<b>Nota:</b> rotunjirea arată bine');
  const poze = [...html.matchAll(/<img data-pas="([a-z-]+)" src="(data:image\/png;base64,[^"]+)"/g)];
  expect(poze.map((m) => m[1])).toEqual(['p-deschide']);
  const date = JSON.parse(/<script type="application\/json" id="date-raport">([^<]*)<\/script>/.exec(html)?.[1] ?? '{}') as {
    pasi: Array<{ id: string; stare: string | null; poze: number }>; instanta: string;
  };
  expect(date.pasi.slice(0, 3).map((p) => [p.id, p.stare, p.poze])).toEqual([['p-deschide', 'bine', 1], ['p-curata', 'nu', 0], ['d-dreptunghi', null, 0]]);
  expect(date.instanta).toBe('local');
  // Poza e planșa: cât pânza, cu foaia, fundalul și conturul dreptunghiului (mai multe culori, nu o imagine goală).
  const poza = await page.evaluate(async (src) => {
    const im = new Image();
    im.src = src;
    await im.decode();
    const c = document.createElement('canvas');
    c.width = im.width;
    c.height = im.height;
    const g = c.getContext('2d')!;
    g.drawImage(im, 0, 0);
    const p = g.getImageData(0, 0, c.width, c.height).data;
    const culori = new Set<number>();
    for (let k = 0; k < p.length; k += 4 * 97) culori.add((p[k]! << 16) | (p[k + 1]! << 8) | p[k + 2]!);
    const panza = document.querySelector('canvas[data-testid="panza"]') as HTMLCanvasElement;
    return { w: im.width, h: im.height, pw: panza.width, ph: panza.height, culori: culori.size };
  }, poze[0]![2]!);
  expect([poza.w, poza.h]).toEqual([poza.pw, poza.ph]);
  expect(poza.culori).toBeGreaterThan(3);

  // Începe din nou: două clicuri (confirmarea), apoi totul gol.
  await panou(page).locator('[data-test="reia"]').click();
  await expect(panou(page).locator('[data-test="reia"]')).toHaveText('Da, șterge rezultatele și pozele');
  await panou(page).locator('[data-test="reia"]').click();
  await expect(panou(page).locator('[data-test="progres"]')).toHaveText('0 bine · 0 nu · 0 sărite · 31 rămase');
  await expect(panou(page)).toContainText('Poze la pasul acesta: 0');
  expect(erori).toEqual([]);
});

test('fără `?test`, testul nu se deschide, iar bara n-are buton Test; pe live, nici cu `?test`', async ({ page }) => {
  const cereri: string[] = [];
  page.on('request', (r) => { cereri.push(r.url()); });
  await page.goto('/');
  await expect(page.locator('[data-editare="manual"]')).toBeVisible();
  await expect(page.locator('[data-editare="test"]')).toHaveCount(0);
  await page.route('**/config.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ instanta: 'live' }) }));
  await page.goto('/?test');
  await expect(page.locator('[data-editare="manual"]')).toBeVisible();
  // Bucata panoului nu e cerută deloc (cu `?test`, pe test, e cerută: martorul din proba de mai sus), deci nici panoul nu vine.
  await page.waitForTimeout(1000);
  expect(cereri.filter(bucataTestului)).toEqual([]);
  await expect(panou(page)).toHaveCount(0);
});
