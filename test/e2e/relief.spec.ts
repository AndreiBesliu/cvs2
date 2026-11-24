import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { reliefDinPixeli, type OptiuniImagine } from '../../src/relief/imagine.ts';
import { stratDinGrila } from '../../src/relief/strat.ts';
import { citestePng } from '../unit/ajutor-png.ts';
import { documentSalvat } from './ajutor-document.ts';

/**
 * Relieful din imagine în aplicația construită (ADR 0310 §7, felia 18.1↑a): alegerea Relief din fereastra unei imagini,
 * calculul în workerul reliefului, „Importă” (stratul în baza `cncvs2-relief`, piesa cu elementul `relief`), desenul umbrit pe
 * planșă și secțiunea Relieful din panou. Poarta amprentei (ADR 0310 §3): harta stratului făcută în browser (decodarea
 * fără conversie de culoare și fără alfa premultiplicat) e cea făcută în Node din același PNG; și pe pixelii semitransparenți
 * ai logoului.
 */

test.use({ locale: 'ro-RO' });

const IMPLICITE = { sursa: 'l', albSus: true, inaltime: 5, baza: 0, sigma: 0 } as const;

/** Stratul făcut în Node din PNG-ul din corpus, cu alegerile date: amprenta hărții și dalele cu coduri. */
async function inNode(nume: string, o: OptiuniImagine = IMPLICITE): Promise<{ amprenta: string; dale: number; latime: number; inaltime: number }> {
  const img = citestePng(readFileSync(`test/fixtures/trasare/${nume}.png`));
  const st = await stratDinGrila(reliefDinPixeli(img.date, img.latime, img.inaltime, o), img.latime, img.inaltime);
  return { amprenta: st.amprenta, dale: st.octeti.size, latime: img.latime, inaltime: img.inaltime };
}

/** Ce e în baza reliefurilor: harta cu amprenta dată (textul ei) și câte dale are baza. */
function bazaRelief(page: Page, amprenta: string): Promise<{ harta: string | null; dale: number }> {
  return page.evaluate(async (a) => {
    const db = await new Promise<IDBDatabase>((ok, eroare) => {
      const r = indexedDB.open('cncvs2-relief', 1);
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    const tx = db.transaction(['harti', 'dale']);
    const cere = <T,>(r: IDBRequest<T>): Promise<T> => new Promise((ok, eroare) => { r.onsuccess = () => { ok(r.result); }; r.onerror = () => { eroare(r.error); }; });
    const h = await cere(tx.objectStore('harti').get(a)) as { text?: string } | undefined;
    const n = await cere(tx.objectStore('dale').count());
    db.close();
    return { harta: h?.text ?? null, dale: n };
  }, amprenta);
}

/** Culoarea medie a pânzei într-un pătrat de 5 × 5 pixeli fizici în jurul punctului (x, y) al foii (mm). */
async function culoareLa(page: Page, x: number, y: number): Promise<[number, number, number]> {
  return page.evaluate(([x, y]) => {
    const p = document.querySelector<HTMLCanvasElement>('[data-testid="panza"]');
    if (!p) throw new Error('fără pânză');
    const scara = Number(p.dataset.scara), tx = Number(p.dataset.tx), ty = Number(p.dataset.ty), dpr = Number(p.dataset.dpr);
    const c = document.createElement('canvas');
    c.width = p.width;
    c.height = p.height;
    const g = c.getContext('2d');
    if (!g) throw new Error('fără context 2d');
    g.drawImage(p, 0, 0);
    const d = g.getImageData(Math.floor((x * scara + tx) * dpr) - 2, Math.floor((ty - y * scara) * dpr) - 2, 5, 5).data;
    const s = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) s[k] = (s[k] ?? 0) + (d[i + k] ?? 0);
    return s.map((v) => v / (d.length / 4)) as [number, number, number];
  }, [x, y] as const);
}

async function deschideRelief(page: Page, fisier: string): Promise<void> {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisier);
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.getByTestId('import-rezultat').locator('label').filter({ hasText: 'Relief' }).click();
  await expect(page.getByTestId('relief-fereastra')).toBeVisible();
}

test('logoul ca relief: grila cât imaginea, scara presupusă, amprenta ca în Node; Importă pune piesa, stratul e în bază, desenul pe planșă', async ({ page }) => {
  const n = await inNode('logo-cvs');
  await deschideRelief(page, 'test/fixtures/trasare/logo-cvs.png');
  // Fără DPI în fișier: 96 px pe țol, celula 25,4 / 96 = 0,2646 mm; 1288 px = 340,78 mm.
  await expect(page.getByTestId('relief-grila')).toHaveText(`Grila: ${n.latime} × ${n.inaltime} celule de 0,2646 mm (o celulă pe pixel); relieful are 340,78 × 85,99 mm.`);
  await expect(page.getByTestId('relief-z')).toContainText('Înălțimile: de la 0 la');
  await expect(page.getByTestId('relief-previz')).toBeVisible();
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const doc = JSON.parse(await documentSalvat(page, 1)) as { piese: Array<{ radacina: { copii: Array<{ forma: { tip: string; nx: number; ny: number; celula: number; straturi: Array<{ dale: string; mod: string; vizibil: boolean }> } }> } }> };
  const forma = doc.piese[0]?.radacina.copii[0]?.forma;
  expect(forma?.tip).toBe('relief');
  expect([forma?.nx, forma?.ny, forma?.celula]).toEqual([n.latime, n.inaltime, 25.4 / 96]);
  expect(forma?.straturi.map((s) => [s.mod, s.vizibil])).toEqual([['aduna', true]]);
  // Poarta amprentei: aceeași hartă ca în Node, deci aceleași dale, octet cu octet.
  expect(forma?.straturi[0]?.dale).toBe(n.amprenta);
  const b = await bazaRelief(page, n.amprenta);
  expect(b.harta).not.toBeNull();
  expect(b.dale).toBe(n.dale);
  // Pe planșă: colțul stânga-sus al logoului e transparent, deci planul zero, umbrit ca un plan (gri, 0,25 + 0,75 · √2/2 din
  // alb = 199); foaia din afara reliefului rămâne deschisă.
  await expect.poll(async () => (await culoareLa(page, 2, 84)).map(Math.round)).toEqual([199, 199, 199]);
  expect(Math.min(...await culoareLa(page, 150, 150))).toBeGreaterThan(230);
  // Pe planșă și în panou: piesa aleasă, cu secțiunea Relieful.
  await expect(page.getByTestId('lista-vectori').locator('li')).toContainText('logo-cvs');
  await expect(page.getByTestId('prop-relief')).toBeVisible();
  await expect(page.getByTestId('prop-relief')).toContainText(`${n.latime} × ${n.inaltime}`);
  await expect(page.getByTestId('prop-relief')).toContainText('de la 0.00 la');
  await expect(page.getByTestId('prop-relief-straturi').locator('li')).toHaveText(['logo-cvs.png · adună']);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('alegerile: negru = sus, înălțimea, lățimea scrisă și canalul schimbă relieful, ca în Node; Vectori întoarce trasarea', async ({ page }) => {
  const o = { sursa: 'r', albSus: false, inaltime: 2, baza: 1, sigma: 0 } as const;
  const n = await inNode('cerc-opac-alb', o);
  await deschideRelief(page, 'test/fixtures/trasare/cerc-opac-alb.png');
  await expect(page.getByTestId('relief-grila')).toBeVisible();
  await page.locator('[data-camp="relief-sursa"]').selectOption('r');
  await page.getByText('Negru = sus').click();
  await page.locator('[data-camp="relief-inaltime"]').fill('2');
  await page.locator('[data-camp="relief-inaltime"]').press('Enter');
  await page.locator('[data-camp="relief-baza"]').fill('1');
  await page.locator('[data-camp="relief-baza"]').press('Enter');
  await page.locator('[data-camp="relief-latime"]').fill(String(n.latime));
  await page.locator('[data-camp="relief-latime"]').press('Enter');
  // Lățimea scrisă = pixelii: celula de 1 mm.
  await expect(page.getByTestId('relief-grila')).toHaveText(`Grila: ${n.latime} × ${n.inaltime} celule de 1 mm (o celulă pe pixel); relieful are ${n.latime} × ${n.inaltime} mm.`);
  // Înapoi la vectori: fereastra trasării, cu alegerea pe Vectori.
  await page.getByTestId('import-rezultat').locator('label').filter({ hasText: 'Vectori' }).click();
  await expect(page.getByTestId('trasare-panou')).toBeVisible();
  await expect(page.locator('[data-camp="import-rezultat-vectori"]')).toBeChecked();
  // Și iar la relief: alegerile ținute (cât stă fereastra încărcată), lățimea din nou din DPI.
  await page.getByTestId('import-rezultat').locator('label').filter({ hasText: 'Relief' }).click();
  await expect(page.locator('[data-camp="relief-inaltime"]')).toHaveValue('2');
  await page.locator('[data-camp="relief-latime"]').fill(String(n.latime));
  await page.locator('[data-camp="relief-latime"]').press('Enter');
  await expect(page.getByTestId('relief-grila')).toContainText('celule de 1 mm');
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const doc = await documentSalvat(page, 1);
  expect(doc).toContain(`"dale":"${n.amprenta}"`);
});

test('Renunță și Escape nu lasă nimic în document; o imagine toată transparentă e refuzată, cu motivul', async ({ page }) => {
  await deschideRelief(page, 'test/fixtures/trasare/logo-cvs.png');
  await expect(page.getByTestId('relief-grila')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('lista-vectori').locator('li')).toHaveCount(0);
  // O imagine transparentă, generată în pagină.
  await page.evaluate(async () => {
    const c = new OffscreenCanvas(8, 8);
    c.getContext('2d');
    const b = await c.convertToBlob({ type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(new File([b], 'gol.png', { type: 'image/png' }));
    const intrare = document.querySelector<HTMLInputElement>('[data-camp="fisier-svg"]');
    if (!intrare) throw new Error('fără fereastra de fișiere a importului');
    intrare.files = dt.files;
    intrare.dispatchEvent(new Event('change', { bubbles: true }));
  });
  // Alegerea Relief e ținută: fereastra reliefului se deschide direct.
  await expect(page.getByTestId('relief-fereastra')).toBeVisible();
  await expect(page.getByTestId('relief-refuz')).toHaveText('Imaginea e toată transparentă: nimic de făcut relief.');
  await expect(page.locator('[data-buton="importa"]')).toBeDisabled();
  await page.locator('[data-buton="renunta"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
