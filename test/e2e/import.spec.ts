import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { poarta } from '../oracles/poarta.ts';
import { regiuneDinDocument } from '../oracles/regiune.ts';
import { ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

/** Ultima versiune salvată în IndexedDB, așteptată până la revizia dată (ca în `export.spec.ts`). */
async function documentSalvat(page: Page, rev: number): Promise<unknown> {
  let text: string | null = null;
  await expect.poll(async () => {
    text = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((ok, eroare) => {
        const r = indexedDB.open('cncvs2-proiecte', 1);
        r.onsuccess = () => { ok(r.result); };
        r.onerror = () => { eroare(r.error); };
      });
      const v = await new Promise<unknown>((ok, eroare) => {
        const r = db.transaction('versiuni').objectStore('versiuni').openCursor(null, 'prev');
        r.onsuccess = () => { ok(r.result?.value ?? null); };
        r.onerror = () => { eroare(r.error); };
      });
      db.close();
      return typeof v === 'string' ? v : null;
    });
    return text === null ? -1 : (JSON.parse(text) as { rev: number }).rev;
  }).toBeGreaterThanOrEqual(rev);
  return JSON.parse(text ?? 'null');
}

const fisier = (nume: string, text: string) => ({ name: nume, mimeType: 'image/svg+xml', buffer: Buffer.from(text, 'utf8') });

test('logoul plăcii 2 (lățimea declarată 80 mm): dialogul, piesa pe foaie, G-code-ul la 80 + Ø6 și poarta', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles('test/placi/placa-02/logo-80mm.svg');
  await expect(page.getByTestId('import-marime')).toHaveText('Desenul: 80.00 × 40.00 mm');
  await expect(page.getByTestId('import-cai')).toHaveText('3 contururi închise: 1 tăiate pe exterior, 2 pe interior (din imbricare)');
  // Pagina e în mm: alegerea px-ului nu se arată. Elipsa vine ca cubice, cu raportul.
  await expect(page.locator('[data-camp="px"]')).toHaveCount(0);
  await expect(page.locator('[data-avertisment="arce-eliptice"]')).toHaveText('2 arce eliptice scrise ca curbe cubice');
  // Cu dialogul deschis, documentul din spate nu se schimbă (Ctrl+Z, Delete).
  await page.keyboard.press('Control+z');
  // Un dublu-clic adaugă piesa o singură dată (al doilea clic cade pe pânză, după dialog, și golește selecția).
  await page.locator('[data-buton="importa"]').dblclick();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const rand = page.getByTestId('lista-vectori').locator('li');
  await expect(rand).toHaveCount(1);
  await rand.getByText('logo-80mm').click();
  await expect(page.getByTestId('selectie')).toHaveText('Selectat: logo-80mm');

  // Logoul atinge colțul stânga-jos al foii: exteriorul iese cu discul frezei (6 mm) la stânga și jos.
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('[data-buton="exporta"]').click();
  await expect(page.getByTestId('iesire-foaie')).toContainText('Freza iese din foaie:');
  await page.locator('[data-camp="confirma-iesire"]').check();
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await d).path(), 'ascii');
  expect(text).toContain('\n(iesire mm: st 6.000 dr 0.000 jos 6.000 sus 0.000)\n');
  // Pe hârtie: centrul frezei pe exterior, de la −3 la 80 + 3 pe X și până la 40 + 3 pe Y (originea stânga-jos).
  const xs = [...text.matchAll(/^G[0123] .*X(-?\d+\.\d{3})/gm)].map((m) => Number(m[1]));
  const ys = [...text.matchAll(/^G[0123] .*Y(-?\d+\.\d{3})/gm)].map((m) => Number(m[1]));
  expect(Math.min(...xs)).toBe(-3);
  expect(Math.max(...xs)).toBe(83);
  expect(Math.max(...ys)).toBe(43);
  // Revizia 1: importul. Exportul n-a schimbat operațiile, deci n-a scris nimic.
  const doc = await documentSalvat(page, 1);
  expect(poarta(text, {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 3,
    supracursa: 0, asteptareAx: 3, avansPlonjare: 300, regiune: regiuneDinDocument(doc as Parameters<typeof regiuneDinDocument>[0]),
  })).toEqual([]);
  await page.getByRole('button', { name: 'Închide' }).click();

  // Importul e un singur pas: Ctrl+Z îl scoate.
  await page.keyboard.press('Control+z');
  await expect(page.getByText('Nimic pe foaie încă.')).toBeVisible();
});

test('px din Illustrator: 72 preselectat și spus; 96 la alegere; un fișier stricat e refuzat fără „Importă”', async ({ page }) => {
  await page.goto('/');
  // 226,77 px = 80 mm la 72 px pe țol, 60 mm la 96.
  // Ca Illustrator: entitățile spațiilor de nume (le expandează DOMParser-ul browserului; xmldom din Node, nu) și switch-ul.
  const ai = '<?xml version="1.0"?><!-- Generator: Adobe Illustrator 27.0.0, SVG Export Plug-In -->'
    + '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" ['
    + '<!ENTITY ns_svg "http://www.w3.org/2000/svg"><!ENTITY ns_xlink "http://www.w3.org/1999/xlink">]>'
    + '<svg xmlns="&ns_svg;" xmlns:xlink="&ns_xlink;" width="226.77px" height="113.385px" viewBox="0 0 226.77 113.385">'
    + '<switch><foreignObject requiredExtensions="http://ns.adobe.com/AdobeIllustrator/10.0/" width="1" height="1"/>'
    + '<g><rect width="226.77" height="113.385"/><text>x</text></g></switch></svg>';
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisier('ai.svg', ai));
  await expect(page.getByTestId('import-marime')).toHaveText('Desenul: 80.00 × 40.00 mm');
  await expect(page.locator('[data-camp="px"]')).toHaveValue('72');
  await expect(page.getByText('Fișierul spune că l-a scris Illustrator')).toBeVisible();
  await expect(page.locator('[data-avertisment="sarit-text"]')).toHaveText('1 text sărit: transformă textul în contururi în programul tău');
  await page.locator('[data-camp="px"]').focus();
  await page.locator('[data-camp="px"]').selectOption('96');
  await expect(page.getByTestId('import-marime')).toHaveText('Desenul: 60.00 × 30.00 mm');
  // Alegerea rămâne pe ecran (și cu focusul) cât se recitește, iar Escape închide dialogul (recenzia 2.7c).
  await expect(page.locator('[data-camp="px"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisier('stricat.svg', '<svg xmlns="http://www.w3.org/2000/svg"><rect></svg>'));
  await expect(page.getByTestId('import-refuz')).toHaveText('Fișierul nu e un SVG valid (XML-ul nu se poate citi).');
  await expect(page.locator('[data-buton="importa"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Nimic pe foaie încă.')).toBeVisible();
});

test('dialogul care nu se poate încărca (o publicare nouă a schimbat fișierele): mesajul și reîncărcarea, nu ecranul de eroare', async ({ page }) => {
  await page.route(/DialogImport-[^/]*\.js$/, (r) => r.abort());
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles('test/placi/placa-02/logo-80mm.svg');
  await expect(page.getByRole('alert')).toHaveText('Fereastra nu s-a putut încărca (aplicația s-a actualizat între timp sau rețeaua lipsește). Proiectul e salvat: reîncarcă pagina.');
  await page.getByRole('button', { name: 'Închide' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-actiune="document.adauga-dreptunghi"]')).toBeEnabled();
});

test('ușa care nu se poate aduce (o publicare nouă): dialogul spune asta și oferă reîncărcarea, nu „fișierul nu e un SVG”', async ({ page }) => {
  await page.route(/actiuniImportCalcul-[^/]*\.js$/, (r) => r.abort());
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles('test/placi/placa-02/logo-80mm.svg');
  await expect(page.getByTestId('import-refuz')).toHaveText('Fereastra nu s-a putut încărca (aplicația s-a actualizat între timp sau rețeaua lipsește). Proiectul e salvat: reîncarcă pagina.');
  await expect(page.getByRole('button', { name: 'Reîncarcă' })).toBeVisible();
  await expect(page.locator('[data-buton="importa"]')).toHaveCount(0);
});

test('Escape închide dialogul și cu focusul căzut pe pagină (otrava „Escape doar în dialog”, 2.7c)', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles('test/placi/placa-02/logo-80mm.svg');
  await expect(page.getByTestId('import-marime')).toBeVisible();
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); });
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('ușa e adusă în fundal după pornire: o publicare nouă care îi schimbă numele nu mai strică primul import (otrava „ușa nepreîncărcată”, 2.7c)', async ({ page }) => {
  const adusa = page.waitForResponse(/actiuniImportCalcul-[^/]*\.js$/);
  await page.goto('/');
  await adusa;
  // Acum fișierul vechi „dispare” de pe server, ca după o publicare nouă.
  await page.route(/actiuniImportCalcul-[^/]*\.js$/, (r) => r.abort());
  await page.locator('[data-camp="fisier-svg"]').setInputFiles('test/placi/placa-02/logo-80mm.svg');
  await expect(page.getByTestId('import-marime')).toHaveText('Desenul: 80.00 × 40.00 mm');
});

/**
 * Pixelii pânzei care diferă de foaie, într-un pătrat de ±`r` px CSS în jurul unui punct al documentului (în pixeli
 * fizici): cerneala oricărei culori (linia sau selecția).
 */
async function cernealaLa(page: Page, x: number, y: number, r: number): Promise<number> {
  const v = await vedere(page);
  const cx = (v.tx + x * v.scara) * v.dpr, cy = (v.ty - y * v.scara) * v.dpr, m = Math.round(r * v.dpr);
  return page.evaluate(([cx, cy, m]) => {
    const el = document.querySelector('[data-testid="panza"]') as HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = el.width;
    c.height = el.height;
    const g = c.getContext('2d');
    if (!g) return -1;
    g.drawImage(el, 0, 0);
    const d = g.getImageData(Math.round(cx) - m, Math.round(cy) - m, 2 * m + 1, 2 * m + 1).data;
    const v = getComputedStyle(document.documentElement).getPropertyValue('--panza-foaie').trim();
    const foaie = [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
    let n = 0;
    for (let k = 0; k < d.length; k += 4) {
      const dif = Math.abs((d[k] ?? 0) - (foaie[0] ?? 0)) + Math.abs((d[k + 1] ?? 0) - (foaie[1] ?? 0)) + Math.abs((d[k + 2] ?? 0) - (foaie[2] ?? 0));
      if (dif > 60) n++;
    }
    return n;
  }, [cx, cy, m] as const);
}

test('CNC-referinta.svg (ADR 0037 §11, §12): valul vine ca o cale deschisă, cu săgeata de sens în selecție, și se taie pe linie, prin poartă', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles('docs/faza2/sonde/s2-export-import/pachet-owner/CNC-referinta.svg');
  // Dialogul: contururile închise din imbricare, calea deschisă (valul, fill none) și nota grosimii liniei.
  await expect(page.getByTestId('import-cai')).toHaveText('11 contururi închise: 10 tăiate pe exterior, 1 pe interior (din imbricare)');
  await expect(page.getByTestId('import-deschise')).toHaveText('1 cale deschisă, tăiată pe linie: un canal de cel mult 1 mm (jumătate din foaie, dacă e mai subțire), într-o trecere');
  await expect(page.getByTestId('import-grosime-linie')).toHaveText('Grosimea liniei din fișier nu contează: canalul are diametrul frezei.');
  await expect(page.locator('[data-avertisment="deschise"]')).toHaveText('1 cale deschisă (fără Z de închidere, neumplută) importată ca linie, de tăiat pe linie');
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Piesa importată e aleasă. Valul se taie pe linie, unde sensul nu schimbă tăietura: nicio săgeată, nici aleasă (decizia
  // owner-ului, 13.10; săgeata apare pe o cale deschisă tăiată pe o parte, stânga / dreapta, care vine în 2.3c-5).
  await expect(page.getByTestId('selectie')).toHaveText('Selectat: CNC-referinta');
  await vedere(page);
  await expect(page.getByTestId('panza')).toHaveAttribute('data-sageti', '0');
  expect(await cernealaLa(page, 160, 60, 14)).toBeGreaterThan(0);

  // Exportul: rândul căii deschise e „pe linie”, 1 mm, cu descrierea „cale deschisă”. Literele stau prea aproape pentru
  // exterior cu Ø6 (regiunea refuză), deci exterioarele și interioarele trec și ele pe linie.
  await page.locator('[data-actiune="export.gcode"]').click();
  const val = page.locator('[data-operatie="e1/deschise"]');
  await expect(val).toContainText('cale deschisă 150.00 × 34.64, 1 segment, la X 160.00, Y 42.68');
  await expect(val.locator('select[data-camp="latura"]')).toHaveValue('pe-linie');
  await expect(val.locator('select[data-camp="latura"] option')).toHaveCount(1);
  await expect(val.locator('[data-camp="urechi"]')).toBeDisabled();
  await page.locator('[data-operatie="e1/exterior"] select[data-camp="latura"]').selectOption('pe-linie');
  await page.locator('[data-operatie="e1/interior"] select[data-camp="latura"]').selectOption('pe-linie');
  // Desenul (400 × 300 pe pagină) iese din foaia de 300 × 200: confirmarea de la 1.10.
  await page.locator('[data-buton="exporta"]').click();
  await expect(page.getByTestId('iesire-foaie')).toContainText('Freza iese din foaie:');
  await page.locator('[data-camp="confirma-iesire"]').check();
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await d).path(), 'ascii');
  // Pe hârtie: plonjarea în vârful 0 al valului (160, 60) la −1 mm, cu F300, o singură trecere, până în (310, 60).
  expect(text).toContain('\n(e1/c4: cale, pe-linie, 1 mm)\nG0 X160.000 Y60.000\nG1 Z-1.000 F300.0\n');
  const bucata = text.slice(text.indexOf('(e1/c4:'));
  const urmatoarea = bucata.indexOf('\n(', 1);
  const valul = urmatoarea > 0 ? bucata.slice(0, urmatoarea) : bucata;
  expect(valul.match(/Z-/g)?.length).toBe(1);
  expect(valul).toMatch(/X310\.000 Y60\.000[^\n]*\nG0 Z5\.000\n/);
  // Revizia 2: operațiile scrise de export (exterioarele și interioarele pe linie). Poarta, cu regiunea din document.
  const doc = await documentSalvat(page, 2);
  expect(poarta(text, {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 3,
    supracursa: 0, asteptareAx: 3, avansPlonjare: 300, regiune: regiuneDinDocument(doc as Parameters<typeof regiuneDinDocument>[0]),
  })).toEqual([]);
});

/** Un SVG cu un pătrat de 20 × 20 mm, la 10 mm de colțul paginii de 40 × 40 mm. */
const PATRAT = '<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="40mm" viewBox="0 0 40 40"><rect x="10" y="10" width="20" height="20"/></svg>';

/** Lasă fișierele pe pânză în punctul (fx, fy) din pânză (0…1): `dragover`, apoi `drop`, cu un DataTransfer real. */
async function lasaPePanza(page: Page, fisiere: ReadonlyArray<{ nume: string; text: string; tip: string }>, fx: number, fy: number) {
  const panza = page.getByTestId('panza');
  const r = await panza.boundingBox();
  if (!r) throw new Error('pânza nu are cutie');
  const clientX = r.x + r.width * fx, clientY = r.y + r.height * fy;
  const dt = await page.evaluateHandle((f) => {
    const d = new DataTransfer();
    for (const x of f) d.items.add(new File([x.text], x.nume, { type: x.tip }));
    return d;
  }, fisiere);
  await panza.dispatchEvent('dragover', { dataTransfer: dt, clientX, clientY });
  await expect(page.getByTestId('lasa-aici')).toBeVisible();
  await panza.dispatchEvent('drop', { dataTransfer: dt, clientX, clientY });
  // Punctul lăsat, în mm ai foii, din vederea pânzei (aceeași formulă ca pânza).
  const v = await panza.evaluate((el) => ({ s: Number(el.dataset.scara), tx: Number(el.dataset.tx), ty: Number(el.dataset.ty) }));
  return { x: (r.width * fx - v.tx) / v.s, y: (v.ty - r.height * fy) / v.s };
}

test('lăsarea pe planșă (2.8b): două SVG-uri trec prin dialog pe rând și cad cu centrul unde au fost lăsate', async ({ page }) => {
  await page.goto('/');
  const p = await lasaPePanza(page, [
    { nume: 'unu.svg', text: PATRAT, tip: 'image/svg+xml' },
    { nume: 'doi.svg', text: PATRAT, tip: 'image/svg+xml' },
  ], 0.5, 0.5);
  await expect(page.getByTestId('lasa-aici')).toHaveCount(0);
  await expect(page.getByTestId('import-coada')).toHaveText('(1 din 2)');
  await page.click('[data-buton="importa"]');
  await expect(page.getByTestId('import-coada')).toHaveText('(2 din 2)');
  await page.click('[data-buton="importa"]');
  await expect(page.locator('.dialog')).toHaveCount(0);
  const doc = await documentSalvat(page, 2) as { foi: Array<{ instante: Array<{ x: number; y: number }> }> };
  const inst = doc.foi[0]?.instante ?? [];
  expect(inst).toHaveLength(2);
  // Pătratul de 20 mm: colțul instanței e centrul minus 10; al doilea, decalat cu 10 la dreapta și 10 în jos.
  expect(inst[0]?.x).toBeCloseTo(p.x - 10, 6);
  expect(inst[0]?.y).toBeCloseTo(p.y - 10, 6);
  expect(inst[1]?.x).toBeCloseTo(p.x, 6);
  expect(inst[1]?.y).toBeCloseTo(p.y - 20, 6);
});

test('lăsarea pe planșă (2.8b): „Sari peste” trece la următorul, un fișier care nu e SVG e refuzat cu motiv, „Renunță la toate” închide', async ({ page }) => {
  await page.goto('/');
  await lasaPePanza(page, [
    { nume: 'desen.dxf', text: '0\nSECTION', tip: 'application/dxf' },
    { nume: 'unu.svg', text: PATRAT, tip: 'image/svg+xml' },
    { nume: 'doi.svg', text: PATRAT, tip: 'image/svg+xml' },
  ], 0.4, 0.6);
  await expect(page.getByTestId('import-coada')).toHaveText('(1 din 3)');
  await expect(page.getByTestId('import-refuz')).toContainText('Doar fișierele SVG se importă deocamdată');
  await page.click('[data-buton="sari"]');
  await expect(page.getByTestId('import-coada')).toHaveText('(2 din 3)');
  await expect(page.getByTestId('import-marime')).toHaveText('Desenul: 20.00 × 20.00 mm');
  await page.getByRole('button', { name: 'Renunță la toate' }).click();
  await expect(page.locator('.dialog')).toHaveCount(0);
  // Nimic importat: lista e goală.
  await expect(page.locator('[data-instanta]')).toHaveCount(0);
});
