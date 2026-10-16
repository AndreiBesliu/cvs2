import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Găurile de interfață găsite de otrăvurile feliei 2.3c (segmentul 2b, sesiune independentă): fiecare test trece pe
 * aplicația curată și pică cu otrava lui aplicată (verificat în clonă, cu build). Id-urile sunt ale listei otrăvurilor.
 */
test.use({ locale: 'ro-RO' });

const fisier = (nume: string, text: string) => ({ name: nume, mimeType: 'image/svg+xml', buffer: Buffer.from(text, 'utf8') });

/** Pune un document salvat ca ultimă versiune, cum o scrie depozitul (cheia [proiect, rev], textul JSON). */
async function salveaza(page: Page, doc: { rev: number }): Promise<void> {
  await page.evaluate(async (d) => {
    const db = await new Promise<IDBDatabase>((ok, eroare) => {
      const r = indexedDB.open('cncvs2-proiecte', 1);
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    await new Promise<void>((ok, eroare) => {
      const tx = db.transaction('versiuni', 'readwrite');
      tx.objectStore('versiuni').put(JSON.stringify(d), ['proiect', d.rev]);
      tx.oncomplete = () => { ok(); };
      tx.onerror = () => { eroare(tx.error); };
    });
    db.close();
  }, doc);
}

test('E02: fila care doar citește și nu-și poate aduce ușa de încărcare spune „nu s-a putut citi acum”, nu tace', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('[data-actiune="document.adauga-dreptunghi"]')).toBeVisible();
  const b = await context.newPage();
  await b.route(/incarcare-[^/]*\.js$/, (r) => r.abort());
  await b.goto('/');
  await expect(b.locator('[data-actiune="document.adauga-dreptunghi"]')).toBeVisible();
  // Fila A scrie prima versiune; fila B o recitește și are nevoie de ușă, care nu vine.
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await expect(b.getByTestId('proiect')).toContainText('nu s-a putut citi acum');
});

test('E03: în fila care doar citește, un SVG lăsat pe planșă nu deschide dialogul importului, nici pentru câteva cadre', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('[data-actiune="document.adauga-dreptunghi"]')).toBeVisible();
  const b = await context.newPage();
  await b.goto('/');
  const panza = b.getByTestId('panza');
  await expect(panza).toHaveAttribute('data-scara', /\d/);
  // Orice dialog deschis, chiar închis imediat (acțiunea refuză în fila care doar citește), rămâne notat: dialogul se
  // încarcă la cerere și poate să nu apuce să apară, dar aplicația de sub el devine inertă din primul cadru.
  await b.evaluate(() => {
    const w = window as unknown as { dialogVazut: boolean };
    w.dialogVazut = false;
    new MutationObserver(() => { if (document.querySelector('.dialog, .aplicatie[inert]')) w.dialogVazut = true; })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['inert'] });
  });
  const r = await panza.boundingBox();
  if (!r) throw new Error('pânza nu are cutie');
  const dt = await b.evaluateHandle(() => {
    const d = new DataTransfer();
    d.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="40mm" viewBox="0 0 40 40"><rect x="10" y="10" width="20" height="20"/></svg>'], 'unu.svg', { type: 'image/svg+xml' }));
    return d;
  });
  const unde = { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 };
  await panza.dispatchEvent('dragover', { dataTransfer: dt, ...unde });
  await panza.dispatchEvent('drop', { dataTransfer: dt, ...unde });
  // Un răspuns negativ: dialogul ar apărea în câteva cadre; o secundă e de ajuns.
  await b.waitForTimeout(1000);
  expect(await b.evaluate(() => (window as unknown as { dialogVazut: boolean }).dialogVazut)).toBe(false);
  await expect(b.getByTestId('lista-vectori').locator('li')).toHaveCount(0);
});

test('E04: un rând cu un contur închis și o linie deschisă nu oferă stânga / dreapta (ele cer o singură cale)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-actiune="document.adauga-dreptunghi"]')).toBeVisible();
  const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  await salveaza(page, {
    schema: 10, rev: 1,
    piese: [{
      id: 'p',
      radacina: { tip: 'grup', id: 'g', matrice: I, copii: [
        { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }, matrice: { ...I, e: 10, f: 10 } },
        { tip: 'element', id: 'l', forma: { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 60 }, s: { tip: 'L' } }, { p: { x: 100, y: 60 }, s: { tip: 'L' } }] }, matrice: I },
      ] },
      operatii: [{ id: 'o1', tip: 'profil', noduri: ['r', 'l'], scula: { numar: 1, nume: 'f', diametru: 6 }, latura: 'exterior', sens: 'urcare', adancime: 3, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null }],
    }],
    foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [{ id: 'e1', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  } as { rev: number });
  await page.reload();
  await page.locator('[data-actiune="export.gcode"]').click();
  const latura = page.locator('[data-operatie="p/o1"] [data-camp="latura"]');
  await expect(latura.locator('option[value="pe-linie"]')).toHaveCount(1);
  await expect(latura.locator('option[value="stanga"], option[value="dreapta"]')).toHaveCount(0);
});

test('E05: marcajul „despărțire” pus din dialog se vede bifat la redeschiderea dialogului', async ({ page }) => {
  await page.goto('/');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="300mm" height="200mm" viewBox="0 0 300 200"><line x1="0" y1="100" x2="300" y2="100" stroke="black"/></svg>';
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisier('taietura.svg', svg));
  await page.locator('[data-buton="importa"]').click();
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-operatie="e1/deschise"]');
  await rand.locator('input').nth(0).fill('18');
  await rand.locator('input').nth(1).fill('6');
  await rand.locator('[data-camp="despartire"]').check();
  await page.locator('[data-buton="exporta"]').click();
  await page.locator('[data-camp="confirma-iesire"]').check();
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  expect(readFileSync(await (await d).path(), 'ascii')).toContain('(e1/c1: cale, pe-linie, 18 mm)');
  await page.getByRole('button', { name: 'Închide', exact: true }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-operatie="e1/deschise"] [data-camp="despartire"]')).toBeChecked();
});

test('E06: bifa „Despărțire” e inactivă pe un rând doar cu contururi închise', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-operatie]')).toHaveCount(1);
  await expect(page.locator('[data-operatie] [data-camp="despartire"]')).toBeDisabled();
});

test('E07: al doilea clic al unui dublu-clic (detail = 2) pe „Importă” nu importă nimic', async ({ page }) => {
  await page.goto('/');
  const patrat = '<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="40mm" viewBox="0 0 40 40"><rect x="10" y="10" width="20" height="20"/></svg>';
  const cerc = '<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="40mm" viewBox="0 0 40 40"><circle cx="20" cy="20" r="10"/></svg>';
  await page.locator('[data-camp="fisier-svg"]').setInputFiles([fisier('unu.svg', patrat), fisier('doi.svg', cerc)]);
  await expect(page.getByTestId('import-coada')).toHaveText(' (1 din 2)');
  await expect(page.getByTestId('import-marime')).toBeVisible();
  // Clicul lui dblclick ajunge prea târziu (dialogul a trecut deja la citire); evenimentul cu detail = 2, direct, nu.
  await page.locator('[data-buton="importa"]').dispatchEvent('click', { detail: 2 });
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByTestId('import-coada')).toHaveText(' (2 din 2)');
  await expect(page.getByTestId('import-marime')).toBeVisible();
  await expect(page.getByTestId('lista-vectori').locator('li')).toHaveCount(1);
});
