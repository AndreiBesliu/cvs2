import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { poarta } from '../oracles/poarta.ts';
import { regiuneDinDocument } from '../oracles/regiune.ts';

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
