import { test, expect, type JSHandle, type Page } from '@playwright/test';
import { documentSalvat } from './ajutor-document.ts';
import { ecran, vedere } from './ajutor-panza.ts';

/**
 * Imaginile pe foaie (ADR 0272, felia 25.8↑a) în aplicația construită: „Păstrează imaginea pe foaie” (oprită implicit, apoi
 * ținută minte) pune vectorii și imaginea într-un singur pas de anulare, imaginea exact sub ei, estompată pe pânză; după
 * reîncărcare, imaginea e tot acolo (documentul și octeții ei). „Doar imaginea” o pune și când trasarea se refuză (lăsată pe
 * pânză, cu centrul în punctul lăsat). În panoul
 * foii: ochiul, opacitatea, lacătul; desfăcută, imaginea se mută, se scalează proporțional și se rotește (Shift: 15°) cu
 * mânerele ei, fiecare gest un pas de anulare; ștearsă, lista dispare. Ce se păstrează e imaginea din fereastră: o scanare
 * îndreptată, îndreptată (JPEG-ul codat din nou), o poză peste 16 Mpx, redusă; octeții au mărimea spusă în bază.
 */

test.use({ locale: 'ro-RO' });

type Imagine = {
  id: string; sursa: string; nume?: string; x: number; y: number; latime: number; inaltime: number; rotire: number; opacitate: number;
  vizibila: boolean; fixata: boolean;
};
type Doc = { rev: number; foi: Array<{ imagini?: Imagine[]; instante: unknown[] }> };

/** Mărimea pixelului la 96 px pe țol (imaginile desenate de browser n-au DPI): 0,2646 mm. */
const MM = 25.4 / 96;

/** Imaginea de ales: desenul ori una toată albă, mărimea (implicit 800 × 560), tipul (implicit PNG) și rotirea desenului. */
type Alegere = { readonly fel: 'desen' | 'alba'; readonly latime?: number; readonly inaltime?: number; readonly tip?: 'image/png' | 'image/jpeg'; readonly unghi?: number };

/**
 * O imagine desenată de browser, ca fișier: un desen (fundal alb, un chenar negru gros, un cerc plin și un dreptunghi roșu
 * plin, cu centrul în px (200, 410); rotit cu `unghi` grade în jurul centrului, ca o scanare strâmbă) sau una toată albă
 * (trasarea n-are ce găsi).
 */
async function fisierImagine(page: Page, nume: string, a: Alegere): Promise<JSHandle<File>> {
  return page.evaluateHandle(async ([nume, a]) => {
    const W = a.latime ?? 800, H = a.inaltime ?? 560, tip = a.tip ?? 'image/png';
    const c = new OffscreenCanvas(W, H);
    const g = c.getContext('2d');
    if (!g) throw new Error('fără context 2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, W, H);
    if (a.unghi) {
      g.translate(W / 2, H / 2);
      g.rotate((-a.unghi * Math.PI) / 180);
      g.translate(-W / 2, -H / 2);
    }
    if (a.fel === 'desen') {
      g.strokeStyle = '#000000';
      g.lineWidth = 6;
      g.strokeRect(100, 80, 600, 400);
      g.fillStyle = '#000000';
      g.beginPath();
      g.arc(520, 230, 60, 0, 2 * Math.PI);
      g.fill();
      g.fillStyle = '#c03030';
      g.fillRect(140, 380, 120, 60);
    }
    const b = await c.convertToBlob(tip === 'image/jpeg' ? { type: tip, quality: 0.92 } : { type: tip });
    return new File([b], nume, { type: tip });
  }, [nume, a] as const);
}

/** Imaginea aleasă în „Importă…” (fereastra de fișiere a aplicației). */
async function alegeImaginea(page: Page, nume: string, a: Alegere): Promise<void> {
  await page.locator('[data-camp="fisier-svg"]').waitFor({ state: 'attached' });
  const f = await fisierImagine(page, nume, a);
  await page.evaluate((f) => {
    const dt = new DataTransfer();
    dt.items.add(f);
    const intrare = document.querySelector<HTMLInputElement>('[data-camp="fisier-svg"]');
    if (!intrare) throw new Error('fără fereastra de fișiere a importului');
    intrare.files = dt.files;
    intrare.dispatchEvent(new Event('change', { bubbles: true }));
  }, f);
  await expect(page.getByTestId('trasare-panou')).toBeVisible();
}

/**
 * Imaginea lăsată pe pânză în punctul (fx, fy) al ei (0…1): `dragover`, apoi `drop`, cu un DataTransfer real (ca la importul
 * lăsat, felia 2.8b). Întoarce punctul lăsat, în mm ai foii, din vederea citită chiar înainte de lăsare.
 */
async function lasaImaginea(page: Page, nume: string, a: Alegere, fx: number, fy: number): Promise<{ x: number; y: number }> {
  const panza = page.getByTestId('panza');
  await expect(panza).toHaveAttribute('data-scara', /\d/);
  const r = await panza.boundingBox();
  if (!r) throw new Error('pânza nu are cutie');
  // Evenimentul primește coordonate întregi (browserul le taie): punctul se socotește din ele.
  const clientX = Math.round(r.x + r.width * fx), clientY = Math.round(r.y + r.height * fy);
  const f = await fisierImagine(page, nume, a);
  const dt = await page.evaluateHandle((f) => {
    const d = new DataTransfer();
    d.items.add(f);
    return d;
  }, f);
  await panza.dispatchEvent('dragover', { dataTransfer: dt, clientX, clientY });
  await expect(page.getByTestId('lasa-aici')).toBeVisible();
  const v = await panza.evaluate((el) => ({ s: Number(el.dataset['scara']), tx: Number(el.dataset['tx']), ty: Number(el.dataset['ty']) }));
  await panza.dispatchEvent('drop', { dataTransfer: dt, clientX, clientY });
  await expect(page.getByTestId('trasare-panou')).toBeVisible();
  return { x: (clientX - r.x - v.tx) / v.s, y: (v.ty - (clientY - r.y)) / v.s };
}

/** Înregistrarea unei imagini din baza imaginilor: tipul și mărimea spusă, și mărimea octeților ei, decodați de browser. */
async function pastrata(page: Page, sursa: string): Promise<{ tip: string; latimePx: number; inaltimePx: number; decodat: [number, number] }> {
  return page.evaluate(async (sursa) => {
    const db = await new Promise<IDBDatabase>((ok, eroare) => {
      const r = indexedDB.open('cncvs2-imagini', 1);
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    const x = await new Promise<{ tip: string; latimePx: number; inaltimePx: number; octeti: Blob }>((ok, eroare) => {
      const r = db.transaction('imagini').objectStore('imagini').get(sursa);
      r.onsuccess = () => { ok(r.result as { tip: string; latimePx: number; inaltimePx: number; octeti: Blob }); };
      r.onerror = () => { eroare(r.error); };
    });
    db.close();
    const b = await createImageBitmap(x.octeti);
    const rez = { tip: x.tip, latimePx: x.latimePx, inaltimePx: x.inaltimePx, decodat: [b.width, b.height] as [number, number] };
    b.close();
    return rez;
  }, sursa);
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

/** Documentul salvat, cu revizia cel puțin `rev`. */
async function doc(page: Page, rev: number): Promise<Doc> {
  return JSON.parse(await documentSalvat(page, rev)) as Doc;
}

/** Punctul foii (mm) e pe pânză, nu sub o bară care plutește deasupra ei (mânerele sunt doar desen, fără clicuri). */
async function pePanza(page: Page, p: { x: number; y: number }): Promise<boolean> {
  const q = (await ecran(page, await vedere(page)))(p.x, p.y);
  return page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.getAttribute('data-testid') === 'panza', [q.x, q.y] as const);
}

/** O tragere a mausului între două puncte ale foii (mm), în pași, cu Shift ținut la nevoie. */
async function trage(page: Page, de: { x: number; y: number }, la: { x: number; y: number }, shift = false): Promise<void> {
  const e = await ecran(page, await vedere(page));
  const a = e(de.x, de.y), b = e(la.x, la.y);
  await page.mouse.move(a.x, a.y);
  if (shift) await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  if (shift) await page.keyboard.up('Shift');
}

test('„Păstrează imaginea pe foaie”: vectorii și imaginea într-un pas, imaginea sub ei; după reîncărcare, tot acolo', async ({ page }) => {
  await page.goto('/');
  await alegeImaginea(page, 'schita.png', { fel: 'desen' });
  // Oprită implicit (răspunsul 1a).
  const bifa = page.locator('[data-camp="pastreaza-imaginea"]');
  await expect(bifa).not.toBeChecked();
  await bifa.check();
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByTestId('trasare-panou')).toHaveCount(0);
  const d1 = await doc(page, 1);
  expect(d1.foi[0]?.instante.length).toBe(1);
  const [im] = d1.foi[0]?.imagini ?? [];
  expect(im).toMatchObject({ id: 'im1', nume: 'schita.png', rotire: 0, opacitate: 0.4, vizibila: true, fixata: true });
  // Pagina e imaginea (fără zonă): colțul ei stânga-jos în originea foii, ca vectorii trasați din ea.
  for (const [v, a] of [[im?.latime, 800 * MM], [im?.inaltime, 560 * MM], [im?.x, 400 * MM], [im?.y, 280 * MM]] as const) {
    expect(Math.abs((v ?? Number.NaN) - a)).toBeLessThan(1e-6);
  }
  // Pe pânză, dreptunghiul roșu al imaginii, estompat (40 % peste foaie): roșul trece de verde, dar nu cât roșul plin (144).
  const rosu = { x: 200 * MM, y: (560 - 410) * MM };
  await vedere(page);
  await expect.poll(async () => { const [r, g] = await culoareLa(page, rosu.x, rosu.y); return r - g; }).toBeGreaterThan(30);
  const [r0, g0] = await culoareLa(page, rosu.x, rosu.y);
  expect(r0 - g0).toBeLessThan(100);
  // Ctrl+Z: vectorii și imaginea pleacă împreună; Ctrl+Shift+Z le aduce înapoi.
  await page.locator('body').press('Control+z');
  const d2 = await doc(page, 2);
  expect([d2.foi[0]?.instante.length, d2.foi[0]?.imagini?.length ?? 0]).toEqual([0, 0]);
  await expect.poll(async () => { const [r, g] = await culoareLa(page, rosu.x, rosu.y); return r - g; }).toBeLessThan(10);
  await page.locator('body').press('Control+Shift+z');
  const d3 = await doc(page, 3);
  expect([d3.foi[0]?.instante.length, d3.foi[0]?.imagini?.length]).toEqual([1, 1]);
  // Bifa se ține minte cât lucrezi: la importul următor e tot bifată.
  await alegeImaginea(page, 'a-doua.png', { fel: 'desen' });
  await expect(bifa).toBeChecked();
  await page.locator('[data-buton="renunta"]').click();
  // După reîncărcare: imaginea e în document, iar octeții ei în baza imaginilor (pânza o desenează, panoul îi arată miniatura).
  await page.reload();
  await vedere(page);
  await expect.poll(async () => { const [r, g] = await culoareLa(page, rosu.x, rosu.y); return r - g; }).toBeGreaterThan(30);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('prop-imagini')).toBeVisible();
  await expect(page.locator('[data-imagine="im1"] img.prop-imagine-mini')).toHaveAttribute('src', /^blob:/);
  await expect(page.locator('[data-motiv="imagine-lipsa"]')).toHaveCount(0);
  // Păstrat e chiar fișierul (un PNG neprelucrat): 800 × 560.
  expect(await pastrata(page, im?.sursa ?? '')).toEqual({ tip: 'image/png', latimePx: 800, inaltimePx: 560, decodat: [800, 560] });
});

test('„Doar imaginea” (și după un refuz al trasării); panoul: ochiul, opacitatea, lacătul; mânerele: mutarea, scalarea, rotirea', async ({ page }) => {
  await page.goto('/');
  // Toată albă, lăsată pe pânză: trasarea n-are ce găsi, dar imaginea se poate pune, cu centrul în punctul lăsat.
  const lasat = await lasaImaginea(page, 'alba.png', { fel: 'alba' }, 0.5, 0.68);
  await expect(page.getByTestId('import-refuz')).toBeVisible();
  await expect(page.locator('[data-buton="importa"]')).toHaveCount(0);
  await page.locator('[data-buton="doar-imaginea"]').click();
  await expect(page.getByTestId('trasare-panou')).toHaveCount(0);
  let d = await doc(page, 1);
  expect(d.foi[0]?.instante.length).toBe(0);
  expect(d.foi[0]?.imagini?.map((i) => [i.id, i.nume])).toEqual([['im1', 'alba.png']]);
  expect(Math.abs((d.foi[0]?.imagini?.[0]?.x ?? Number.NaN) - lasat.x)).toBeLessThan(1e-6);
  expect(Math.abs((d.foi[0]?.imagini?.[0]?.y ?? Number.NaN) - lasat.y)).toBeLessThan(1e-6);
  const rand = page.locator('[data-testid="prop-imagini"] [data-imagine="im1"]');
  await expect(rand).toBeVisible();
  // Ochiul: ascunsă, apoi din nou vizibilă (doi pași).
  await rand.locator('[data-buton="imagine-vizibila"]').click();
  await expect(rand.locator('[data-buton="imagine-vizibila"]')).toHaveAttribute('aria-pressed', 'false');
  d = await doc(page, 2);
  expect(d.foi[0]?.imagini?.[0]?.vizibila).toBe(false);
  await rand.locator('[data-buton="imagine-vizibila"]').click();
  d = await doc(page, 3);
  expect(d.foi[0]?.imagini?.[0]?.vizibila).toBe(true);
  // Opacitatea, în procente.
  const opacitate = rand.locator('[data-camp="imagine-opacitate"]');
  await opacitate.fill('60');
  await opacitate.press('Enter');
  d = await doc(page, 4);
  expect(d.foi[0]?.imagini?.[0]?.opacitate).toBe(0.6);
  // Fixată, n-are mânere; desfăcută (lacătul), le are.
  await expect(page.getByTestId('manere-imagini')).toHaveCount(0);
  await rand.locator('[data-buton="imagine-fixata"]').click();
  d = await doc(page, 5);
  expect(d.foi[0]?.imagini?.[0]?.fixata).toBe(false);
  await expect(page.locator('[data-maner-imagine="ne"]')).toHaveCount(1);
  const im0 = d.foi[0]?.imagini?.[0];
  if (!im0) throw new Error('fără imagine');
  // Mutarea: interiorul tras cu (30, 10) mm.
  await trage(page, { x: im0.x, y: im0.y }, { x: im0.x + 30, y: im0.y + 10 });
  d = await doc(page, 6);
  const im1 = d.foi[0]?.imagini?.[0];
  if (!im1) throw new Error('fără imagine');
  expect(Math.abs(im1.x - im0.x - 30)).toBeLessThan(1);
  expect(Math.abs(im1.y - im0.y - 10)).toBeLessThan(1);
  expect([im1.latime, im1.inaltime, im1.rotire]).toEqual([im0.latime, im0.inaltime, 0]);
  // Rotirea, cu Shift: mânerul de deasupra (pe pânză, nu sub o bară) tras spre stânga centrului: exact 90°; un pas, pe care
  // Ctrl+Z îl întoarce.
  const v = await vedere(page);
  const sus = { x: im1.x, y: im1.y + im1.inaltime / 2 + 24 / v.scara };
  expect(await pePanza(page, sus)).toBe(true);
  await trage(page, sus, { x: im1.x - 40, y: im1.y + 1 }, true);
  d = await doc(page, 7);
  expect(d.foi[0]?.imagini?.[0]?.rotire).toBe(90);
  await page.locator('body').press('Control+z');
  d = await doc(page, 8);
  expect(d.foi[0]?.imagini?.[0]?.rotire).toBe(0);
  // Scalarea: colțul ne tras pe diagonală, departe cu jumătate din ea: ×1,5, proporțiile și colțul sv pe loc; Ctrl+Z.
  const ne = { x: im1.x + im1.latime / 2, y: im1.y + im1.inaltime / 2 };
  expect(await pePanza(page, ne)).toBe(true);
  await trage(page, ne, { x: ne.x + im1.latime / 2, y: ne.y + im1.inaltime / 2 });
  d = await doc(page, 9);
  const im2 = d.foi[0]?.imagini?.[0];
  if (!im2) throw new Error('fără imagine');
  expect(Math.abs(im2.latime / im1.latime - 1.5)).toBeLessThan(0.02);
  expect(Math.abs(im2.latime / im2.inaltime - im1.latime / im1.inaltime)).toBeLessThan(1e-9);
  expect(Math.abs(im2.x - im2.latime / 2 - (im1.x - im1.latime / 2))).toBeLessThan(1e-6);
  expect(Math.abs(im2.y - im2.inaltime / 2 - (im1.y - im1.inaltime / 2))).toBeLessThan(1e-6);
  await page.locator('body').press('Control+z');
  d = await doc(page, 10);
  expect(d.foi[0]?.imagini?.[0]?.latime).toBe(im1.latime);
  // Ștearsă din panou: lista dispare.
  await rand.locator('[data-buton="imagine-sterge"]').click();
  d = await doc(page, 11);
  expect(d.foi[0]?.imagini ?? []).toEqual([]);
  await expect(page.getByTestId('prop-imagini')).toHaveCount(0);
});

test('o scanare îndreptată se păstrează îndreptată: JPEG-ul codat din nou, cu mărimea pânzei rotite', async ({ page }) => {
  await page.goto('/');
  await alegeImaginea(page, 'scanare.jpg', { fel: 'desen', tip: 'image/jpeg', unghi: 2 });
  await page.locator('[data-camp="trasare-rotire"]').check();
  await expect(page.getByTestId('trasare-rotire')).toContainText('îndreptată cu');
  await page.locator('[data-buton="doar-imaginea"]').click();
  await expect(page.getByTestId('trasare-panou')).toHaveCount(0);
  const [im] = (await doc(page, 1)).foi[0]?.imagini ?? [];
  if (!im) throw new Error('fără imagine');
  const p = await pastrata(page, im.sursa);
  // Pânza îndreptată are ~819 × 588 px (cutia scanării rotite cu 2°, după unghiul găsit), nu 800 × 560 ca fișierul.
  expect(p.tip).toBe('image/jpeg');
  expect(p.decodat).toEqual([p.latimePx, p.inaltimePx]);
  expect(Math.abs(p.latimePx - 819)).toBeLessThanOrEqual(1);
  expect(Math.abs(p.inaltimePx - 588)).toBeLessThanOrEqual(1);
  expect(Math.abs(im.latime - p.latimePx * MM)).toBeLessThan(1e-6);
});

test('o poză peste 16 Mpx se păstrează redusă, ca la trasare (nu fișierul întreg), cu mărimea ei în mm', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  // 4200 × 4000 = 16,8 Mpx: redusă cu √(16 / 16,8) la 4098 × 3903.
  await alegeImaginea(page, 'mare.png', { fel: 'desen', latime: 4200, inaltime: 4000 });
  await expect(page.getByTestId('import-marime')).toBeVisible({ timeout: 60_000 });
  await page.locator('[data-buton="doar-imaginea"]').click();
  await expect(page.getByTestId('trasare-panou')).toHaveCount(0, { timeout: 60_000 });
  const [im] = (await doc(page, 1)).foi[0]?.imagini ?? [];
  if (!im) throw new Error('fără imagine');
  expect(await pastrata(page, im.sursa)).toEqual({ tip: 'image/png', latimePx: 4098, inaltimePx: 3903, decodat: [4098, 3903] });
  // Pixelul ține cât al fișierului: imaginea are lățimea lui întreagă.
  expect(Math.abs(im.latime - 4200 * MM)).toBeLessThan(1e-6);
});
