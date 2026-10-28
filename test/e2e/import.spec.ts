import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { poarta } from '../oracles/poarta.ts';
import { regiuneDinDocument } from '../oracles/regiune.ts';
import { ecran, vedere } from './ajutor-panza.ts';
import { cerc, dxf, grupuri, linie } from '../unit/ajutor-dxf.ts';

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
  // Dialogul vine legat de coadă, în bucata `ImportConectat` (cu `DialogImport` în ea): la orice redenumire a bucății,
  // ruta se schimbă odată cu ea, altfel nu mai oprește nimic.
  await page.route(/ImportConectat-[^/]*\.js$/, (r) => r.abort());
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles('test/placi/placa-02/logo-80mm.svg');
  await expect(page.getByRole('alert')).toHaveText('Fereastra nu s-a putut încărca (aplicația s-a actualizat între timp sau rețeaua lipsește). Proiectul e salvat: reîncarcă pagina.');
  await page.getByRole('button', { name: 'Închide' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-actiune="import.svg"]')).toBeEnabled();
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
  // owner-ului, 13.10; săgeata apare pe o cale deschisă tăiată pe o parte, stânga / dreapta).
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
  // Un rând cu o singură cale deschisă: pe linie, stânga, dreapta (ADR 0037 §12).
  await expect(val.locator('select[data-camp="latura"] option')).toHaveText(['pe linie', 'stânga', 'dreapta']);
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

test('linia tăiată pe stânga (2.3c-5): dialogul o oferă, G-code-ul pe hârtie la Y53, iar săgeata de sens apare în selecție', async ({ page }) => {
  await page.goto('/');
  // Linia (50,50)→(150,50) pe foaie: în SVG y crește în jos, deci y = 200 − 150.
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="300mm" height="200mm" viewBox="0 0 300 200"><line x1="50" y1="150" x2="150" y2="150" stroke="black"/></svg>';
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisier('linia.svg', svg));
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('selectie')).toHaveText('Selectat: linia');
  await vedere(page);
  await expect(page.getByTestId('panza')).toHaveAttribute('data-sageti', '0');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-operatie="e1/deschise"]');
  await rand.locator('select[data-camp="latura"]').selectOption('stanga');
  // Pe o parte, sensul contează: câmpul lui e activ.
  await expect(rand.locator('select[data-camp="sens"]')).toBeEnabled();
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await d).path(), 'ascii');
  // Hârtia 1 (ADR 0037): stânga + urcare = ca desenul, centrul la R deasupra liniei; 1 mm într-o trecere (gravura importului).
  expect(text).toContain('\n(e1/c1: cale, stanga, 1 mm)\nG0 X50.000 Y53.000\nG1 Z-1.000 F300.0\nG1 X150.000 Y53.000 F1000.0\nG0 Z5.000\n');
  // Poarta amendată (2.3c-5, sesiune independentă), pe documentul salvat (revizia 2: latura scrisă de export).
  const doc = await documentSalvat(page, 2);
  expect(poarta(text, {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 1,
    supracursa: 0, asteptareAx: 3, avansPlonjare: 300, regiune: regiuneDinDocument(doc as Parameters<typeof regiuneDinDocument>[0]),
  })).toEqual([]);
  await page.getByRole('button', { name: 'Închide' }).click();
  // Latura scrisă de export: linia aleasă își arată acum sensul (ADR 0037 §12).
  await expect(page.getByTestId('panza')).toHaveAttribute('data-sageti', '1');
});

/** Un SVG cu un pătrat de 20 × 20 mm, la 10 mm de colțul paginii de 40 × 40 mm. */
const PATRAT = '<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="40mm" viewBox="0 0 40 40"><rect x="10" y="10" width="20" height="20"/></svg>';

/** Lasă fișierele pe pânză în punctul (fx, fy) din pânză (0…1): `dragover`, apoi `drop`, cu un DataTransfer real. */
async function lasaPePanza(page: Page, fisiere: ReadonlyArray<{ nume: string; text: string; tip: string }>, fx: number, fy: number) {
  const panza = page.getByTestId('panza');
  // Vederea pânzei se scrie după prima măsurare: lăsarea înainte de ea dădea punctul NaN (instabil, ~1 din 4, 2.3c-6 2b).
  await expect(panza).toHaveAttribute('data-scara', /\d/);
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
  // Punctul lăsat, în mm ai foii, din vederea pânzei (aceeași formulă ca pânza), citită chiar înainte de lăsare: după ea,
  // dialogul importului poate schimba vederea.
  const v = await panza.evaluate((el) => ({ s: Number(el.dataset.scara), tx: Number(el.dataset.tx), ty: Number(el.dataset.ty) }));
  await panza.dispatchEvent('drop', { dataTransfer: dt, clientX, clientY });
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

test('lăsarea pe planșă (2.8b): „Sari peste” trece la următorul, un fișier care nu e SVG sau DXF e refuzat cu motiv, „Renunță la toate” închide', async ({ page }) => {
  await page.goto('/');
  await lasaPePanza(page, [
    { nume: 'desen.pdf', text: '%PDF-1.4', tip: 'application/pdf' },
    { nume: 'unu.svg', text: PATRAT, tip: 'image/svg+xml' },
    { nume: 'doi.svg', text: PATRAT, tip: 'image/svg+xml' },
  ], 0.4, 0.6);
  await expect(page.getByTestId('import-coada')).toHaveText('(1 din 3)');
  await expect(page.getByTestId('import-refuz')).toContainText('Doar fișierele SVG și DXF se importă deocamdată');
  await page.click('[data-buton="sari"]');
  await expect(page.getByTestId('import-coada')).toHaveText('(2 din 3)');
  await expect(page.getByTestId('import-marime')).toHaveText('Desenul: 20.00 × 20.00 mm');
  await page.getByRole('button', { name: 'Renunță la toate' }).click();
  await expect(page.locator('.dialog')).toHaveCount(0);
  // Nimic importat: lista e goală.
  await expect(page.locator('[data-instanta]')).toHaveCount(0);
});

/* ── DXF (ADR 0101) ─────────────────────────────────────────────────────────────────────────────────────────────────── */

// Un dreptunghi 60 × 40 din patru linii, în (100, 50), cu o gaură R5 și o linie de gravat, pe straturi.
const RAFT = linie(100, 50, 160, 50, { strat: 'TAIERE' }) + linie(160, 50, 160, 90, { strat: 'TAIERE' }) + linie(160, 90, 100, 90, { strat: 'TAIERE' })
  + linie(100, 90, 100, 50, { strat: 'TAIERE' }) + cerc(130, 70, 5, { strat: 'GAURI' }) + linie(110, 60, 120, 60, { strat: 'GRAVARE' });
const fisierDxf = (nume: string, text: string) => ({ name: nume, mimeType: 'application/dxf', buffer: Buffer.from(text, 'utf8') });

test('DXF: patru linii devin un contur închis, gaura e interior, unitățile spuse; piesa stă pe foaie unde e în fișier, cu straturile ca nume', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf('Raft lateral.dxf', dxf({ antet: [['$INSUNITS', 70, 4]], entitati: RAFT })));
  await expect(page.locator('#import-titlu')).toHaveText('Importă: Raft lateral.dxf');
  await expect(page.getByTestId('import-marime')).toHaveText('Desenul: 60.00 × 40.00 mm');
  await expect(page.getByTestId('import-cai')).toHaveText('2 contururi închise: 1 tăiate pe exterior, 1 pe interior (din imbricare)');
  await expect(page.getByTestId('import-deschise')).toContainText('1 cale deschisă, tăiată pe linie');
  await expect(page.getByTestId('import-unitati')).toHaveText('Unitățile fișierului: un milimetru (mm).');
  await expect(page.locator('[data-camp="unitate"]')).toHaveCount(0);
  await expect(page.locator('[data-camp="px"]')).toHaveCount(0);
  await expect(page.locator('[data-avertisment="unite"]')).toHaveText('4 bucăți deschise legate capăt la capăt în căi mai lungi (același strat, capetele la cel mult 0,01 mm)');
  await page.click('[data-buton="importa"]');
  await expect(page.locator('.dialog')).toHaveCount(0);
  await expect(page.getByTestId('lista-vectori').locator('li')).toHaveCount(1);
  const doc = await documentSalvat(page, 1) as {
    foi: Array<{ instante: Array<{ x: number; y: number }> }>;
    piese: Array<{ nume: string; radacina: { copii: Array<{ nume?: string }> } }>;
  };
  // Originea DXF-ului e originea foii: colțul desenului, (100, 50), e unde stă instanța.
  expect(doc.foi[0]?.instante.map((i) => [i.x, i.y])).toEqual([[100, 50]]);
  expect(doc.piese[0]?.nume).toBe('Raft lateral');
  expect(doc.piese[0]?.radacina.copii.map((c) => c.nume)).toEqual(['TAIERE', 'GAURI', 'GRAVARE']);
});

test('DXF fără unități: mm, cu alegerea lor; țolul mărește desenul de 25,4 ori; DXF-ul binar și cel rupt, refuzate cu motivul lor', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf('vechi.dxf', dxf({ entitati: RAFT })));
  await expect(page.getByTestId('import-marime')).toHaveText('Desenul: 60.00 × 40.00 mm');
  await expect(page.locator('[data-camp="unitate"]')).toHaveValue('mm');
  await expect(page.getByTestId('import-unitati')).toHaveText('Fișierul nu-și declară unitățile: alege-le, iar mărimea desenului de mai sus se schimbă.');
  await expect(page.locator('[data-avertisment="unitati-nedeclarate"]')).toHaveText('Fișierul nu-și declară unitățile ($INSUNITS): le alegi mai sus (până atunci, mm)');
  await page.locator('[data-camp="unitate"]').selectOption('inch');
  await expect(page.getByTestId('import-marime')).toHaveText('Desenul: 1524.00 × 1016.00 mm');
  await expect(page.locator('[data-camp="unitate"]')).toHaveValue('inch');
  await page.locator('[data-buton="renunta"]').click();
  await expect(page.locator('.dialog')).toHaveCount(0);

  const binar = Buffer.concat([Buffer.from('AutoCAD Binary DXF\r\n', 'ascii'), Buffer.from([0x1a, 0, 1, 2, 3])]);
  await page.locator('[data-camp="fisier-svg"]').setInputFiles([
    { name: 'binar.dxf', mimeType: 'application/dxf', buffer: binar },
    fisierDxf('rupt.dxf', '0\nSECTION\n2\nENTITIES\n0'),
  ]);
  await expect(page.getByTestId('import-refuz')).toHaveText('Fișierul e un DXF binar: salvează-l ca DXF ASCII (text) în programul tău.');
  await expect(page.locator('[data-buton="importa"]')).toHaveCount(0);
  await page.click('[data-buton="sari"]');
  await expect(page.getByTestId('import-refuz')).toHaveText('Fișierul nu e un DXF valid (linia 5 nu se poate citi).');
});

test('DXF cu un arc aproape drept (R ≈ 4 000 mm), mărit din colț: piesa crește, arcul de peste 10 m devine curbe (ADR 0102); un refuz se vede sub bare', async ({ page }) => {
  await page.goto('/');
  // Pătratul de 40 mm în (20, 20), cu latura de jos un arc de bulge 1/400: raza (40 / 4)·(400 + 1/400) ≈ 4 000 mm. Mărit de
  // peste 2,5 ori, raza trece de latura documentului (10 000 mm): înainte, schema refuza tăcut și piesa rămânea la 40 mm.
  const lw = grupuri([0, 'LWPOLYLINE'], [8, 'TAIERE'], [90, 4], [70, 1], [10, 20], [20, 20], [42, 1 / 400], [10, 60], [20, 20], [10, 60], [20, 60], [10, 20], [20, 60]);
  // Cercul R5 din mijloc rămâne arc oricât s-ar mări: el refuză întinderea pe o singură axă.
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf('arc.dxf', dxf({ antet: [['$INSUNITS', 70, 4]], entitati: lw + cerc(40, 40, 5, { strat: 'TAIERE' }) })));
  await page.click('[data-buton="importa"]');
  await expect(page.locator('.dialog')).toHaveCount(0);
  const cutia = page.locator('.prop-rand', { has: page.locator('dt', { hasText: 'Cutia' }) }).locator('dd');
  // Săgeata arcului: β · c / 2 = 40 / 800 = 0,05 mm sub latură.
  await expect(cutia).toHaveText('40.00 × 40.05 mm');
  await expect(page.getByTestId('bara-editare')).toBeVisible();
  await page.locator('[data-unealta="transformare"]').click();
  // La o piesă mică pe ecran, unele mânere se ascund; colțurile rămân.
  await expect(page.locator('[data-maner="ne"]')).toBeVisible();
  const b = await page.locator('[data-maner="ne"]').boundingBox();
  if (!b) throw new Error('mânerul ne n-are cutie');
  const ne = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  // Colțul, tras până sub barele de sus (colțul scalează proporțional): piesa crește și umple ecranul în sus.
  const bare = await page.locator('header.sus').boundingBox();
  if (!bare) throw new Error('barele de sus n-au cutie');
  const sub = bare.y + bare.height + 12;
  await page.mouse.move(ne.x, ne.y);
  await page.mouse.down();
  await page.mouse.move(ne.x + ne.y - sub, sub, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId('manere-motiv')).toHaveCount(0);
  await expect.poll(async () => Number(/^([\d.]+)/.exec(await cutia.textContent() ?? '')?.[1] ?? 0)).toBeGreaterThan(100);
  // Latura e trasă: arcul plat a devenit curbe, dar cercul are arce, deci piesa se scalează doar proporțional. Deasupra
  // mânerului de rotire, motivul ar intra sub bare: stă sub cutie, pe ecran.
  const e = await page.locator('[data-maner="e"]').boundingBox();
  if (!e) throw new Error('mânerul e n-are cutie');
  await page.mouse.move(e.x + e.width / 2, e.y + e.height / 2);
  await page.mouse.down();
  await page.mouse.move(e.x + e.width / 2 + 60, e.y + e.height / 2, { steps: 4 });
  await page.mouse.up();
  const motiv = page.getByTestId('manere-motiv');
  await expect(motiv).toContainText('proporțional');
  const m = await motiv.boundingBox();
  if (!m) throw new Error('motivul n-are cutie');
  expect(m.y).toBeGreaterThanOrEqual(bare.y + bare.height);
  await expect(motiv).toBeInViewport({ ratio: 1 });
  // Nici insula selecției (Duplică, Șterge, proprietățile), de deasupra barei de jos, nu-l acoperă (verificarea lui 9.3↑b).
  const insula = await page.locator('.bara-selectie .insula').boundingBox();
  if (!insula) throw new Error('insula selecției n-are cutie');
  expect(m.y + m.height <= insula.y || m.y >= insula.y + insula.height || m.x + m.width <= insula.x || m.x >= insula.x + insula.width).toBe(true);
});

test('degruparea (ADR 0103): piesa unui DXF se desface pe contururi, din clic dreapta, din butonul de lângă boolean și cu Ctrl+Shift+G; Ctrl+Z o adună', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  // Dreptunghiul 60 × 40 din (20, 20), cu o gaură R5 în mijloc, și un cerc R3 alături: o singură piesă, cu trei forme.
  const lw = grupuri([0, 'LWPOLYLINE'], [8, 'TAIERE'], [90, 4], [70, 1], [10, 20], [20, 20], [10, 80], [20, 20], [10, 80], [20, 60], [10, 20], [20, 60]);
  const entitati = lw + cerc(50, 40, 5, { strat: 'TAIERE' }) + cerc(100, 40, 3, { strat: 'TAIERE' });
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf('raft.dxf', dxf({ antet: [['$INSUNITS', 70, 4]], entitati })));
  await page.click('[data-buton="importa"]');
  await expect(page.locator('.dialog')).toHaveCount(0);
  const randuri = page.getByTestId('lista-vectori').locator('button[data-instanta]');
  const alese = page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]');
  await expect(randuri).toHaveCount(1);
  await expect(page.getByTestId('bara-editare')).toBeVisible();
  const la = await ecran(page, await vedere(page));

  // Clic dreapta pe latura de jos a dreptunghiului: meniul, cu Degrupează activ și tasta lui; booleanul cere două forme.
  const jos = la(50, 20);
  await page.mouse.click(jos.x, jos.y, { button: 'right' });
  const meniu = page.getByTestId('meniu-context');
  await expect(meniu).toBeVisible();
  await expect(meniu.locator('[data-meniu="degrupeaza"]')).toBeEnabled();
  await expect(meniu.locator('[data-meniu="degrupeaza"] kbd')).toHaveText('Ctrl+Shift+G');
  await expect(meniu.locator('[data-meniu="uneste"]')).toBeDisabled();
  await expect(meniu.locator('[data-meniu="degrupeaza"]')).toBeFocused();
  await meniu.locator('[data-meniu="degrupeaza"]').click();
  await expect(meniu).toHaveCount(0);
  await expect(randuri).toHaveCount(3);
  await expect(alese).toHaveCount(3);

  // Ctrl+Z le adună într-o singură piesă; butonul de lângă boolean le desface din nou.
  await page.locator('body').focus();
  await page.keyboard.press('Control+z');
  await expect(randuri).toHaveCount(1);
  await randuri.nth(0).click();
  await page.locator('[data-editare="degrupeaza"]').click();
  await expect(randuri).toHaveCount(3);
  // Și cu Ctrl+Shift+G, după încă un Ctrl+Z.
  await page.locator('body').focus();
  await page.keyboard.press('Control+z');
  await expect(randuri).toHaveCount(1);
  await randuri.nth(0).click();
  await page.locator('body').focus();
  await page.keyboard.press('Control+Shift+G');
  await expect(randuri).toHaveCount(3);

  // Cu unealta Transformare, un clic pe gol golește selecția; clic dreapta pe cercul mic îl alege doar pe el, iar Degrupează e
  // inactiv, în meniu și în bară.
  await page.keyboard.press('s');
  await expect(page.locator('[data-unealta="transformare"]')).toHaveAttribute('aria-pressed', 'true');
  const gol = la(150, 150);
  await page.mouse.click(gol.x, gol.y);
  await expect(alese).toHaveCount(0);
  const mic = la(103, 40);
  await page.mouse.click(mic.x, mic.y, { button: 'right' });
  await expect(meniu).toBeVisible();
  await expect(alese).toHaveCount(1);
  await expect(meniu.locator('[data-meniu="degrupeaza"]')).toBeDisabled();
  await expect(page.locator('[data-editare="degrupeaza"]')).toBeDisabled();
  await expect(meniu.locator('[data-meniu="duplica"]')).toBeEnabled();
  // Săgețile trec între rândurile active; Escape închide meniul fără să schimbe unealta sau selecția.
  await expect(meniu.locator('[data-meniu="duplica"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(meniu.locator('[data-meniu="sterge"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(meniu).toHaveCount(0);
  await expect(alese).toHaveCount(1);
  await expect(page.locator('[data-unealta="transformare"]')).toHaveAttribute('aria-pressed', 'true');
  // La fel cu focusul în afara meniului (un clic pe un rând inactiv îl poate lua): Escape închide doar meniul.
  await page.mouse.click(mic.x, mic.y, { button: 'right' });
  await expect(meniu).toBeVisible();
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  await page.keyboard.press('Escape');
  await expect(meniu).toHaveCount(0);
  await expect(page.locator('[data-unealta="transformare"]')).toHaveAttribute('aria-pressed', 'true');
  // Lângă marginea din dreapta a zonei libere (pânza trece și pe sub panoul din dreapta), meniul rămâne întreg în zonă.
  const zona = await page.locator('.zona-libera').boundingBox();
  if (!zona) throw new Error('zona liberă n-are cutie');
  await page.mouse.click(zona.x + zona.width - 6, zona.y + zona.height / 2, { button: 'right' });
  await expect(meniu).toBeVisible();
  const mz = await meniu.boundingBox();
  if (!mz) throw new Error('meniul n-are cutie');
  expect(mz.x + mz.width).toBeLessThanOrEqual(zona.x + zona.width);
  expect(mz.y + mz.height).toBeLessThanOrEqual(zona.y + zona.height);
  await page.keyboard.press('Escape');
  await expect(meniu).toHaveCount(0);
  // Altă tastă închide meniul și își face treaba ei (V: unealta Selecție).
  await page.mouse.click(mic.x, mic.y, { button: 'right' });
  await expect(meniu).toBeVisible();
  await page.keyboard.press('v');
  await expect(meniu).toHaveCount(0);
  await expect(page.locator('[data-unealta="selectie"]')).toHaveAttribute('aria-pressed', 'true');
  expect(erori).toEqual([]);
});
