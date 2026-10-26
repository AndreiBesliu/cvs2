import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { adauga } from './ajutor-panza.ts';

/**
 * Recenzia A (15.10), constatările interfeței și ale pornirii, fiecare pe cazul recenzentului, în browserul adevărat:
 * - marcajul „despărțire” se pune din dialog (exportul îl cerea, iar interfața nu-l putea pune);
 * - ușa de încărcare care nu vine: „proiectul n-a putut fi citit acum”, nu „browserul nu permite memoria locală”;
 * - dublu-clicul pe „Importă” în coadă importă un singur fișier;
 * - config.json care nu răspunde nu mai ține pagina albă.
 */
test.use({ locale: 'ro-RO' });

const fisier = (nume: string, text: string) => ({ name: nume, mimeType: 'image/svg+xml', buffer: Buffer.from(text, 'utf8') });

async function versiuni(page: Page): Promise<number[]> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok, eroare) => {
      const r = indexedDB.open('cncvs2-proiecte', 1);
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    const chei = await new Promise<IDBValidKey[]>((ok, eroare) => {
      const r = db.transaction('versiuni').objectStore('versiuni').getAllKeys();
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    db.close();
    return (chei as Array<[string, number]>).map(([, r]) => r);
  });
}

test('despărțirea se marchează din dialog: o linie de la o margine la alta, prin foaie, e refuzată nemarcată și trece marcată', async ({ page }) => {
  await page.goto('/');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="300mm" height="200mm" viewBox="0 0 300 200"><line x1="0" y1="100" x2="300" y2="100" stroke="black"/></svg>';
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisier('taietura.svg', svg));
  await page.locator('[data-buton="importa"]').click();
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-operatie="e1/deschise"]');
  // Adâncimea și pasul sunt primele două câmpuri de text ale rândului (ca în proiect.spec.ts).
  await rand.locator('[data-camp="adancime"]').fill('18');
  await rand.locator('[data-camp="pas"]').fill('6');
  await page.locator('[data-buton="exporta"]').click();
  await expect(page.getByTestId('export-stare')).toContainText('marcheaz-o «despărțire»');
  // Bifa e activă doar pe rândurile cu căi deschise.
  await expect(rand.locator('[data-camp="despartire"]')).toBeEnabled();
  await rand.locator('[data-camp="despartire"]').check();
  await page.locator('[data-buton="exporta"]').click();
  // Canalul trece de capete cu R: ieșirea din foaie se confirmă (1.10).
  await expect(page.getByTestId('iesire-foaie')).toBeVisible();
  await page.locator('[data-camp="confirma-iesire"]').check();
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await d).path(), 'ascii');
  expect(text).toContain('(e1/c1: cale, pe-linie, 18 mm)');
});

test('ușa de încărcare care nu vine la reîncărcare: „n-a putut fi citit acum”, iar proiectul rămâne pentru o reîncărcare bună', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await expect.poll(() => versiuni(page)).toContain(1);
  // ADR 0070: un document al versiunii curente cere doar ușa curentă; migrările (`incarcare`) doar unul vechi. Ambele oprite.
  await page.route(/(usaCurenta|incarcare)-[^/]*\.js$/, (r) => r.abort());
  await page.reload();
  await expect(page.getByTestId('proiect')).toContainText('Proiectul salvat n-a putut fi citit acum');
  await expect(page.getByTestId('proiect')).not.toContainText('nu permite memoria locală');
  await page.unroute(/(usaCurenta|incarcare)-[^/]*\.js$/);
  await page.reload();
  await expect(page.getByTestId('lista-vectori').locator('li')).toHaveCount(1);
});

test('coada importului: un dublu-clic pe „Importă” importă doar fișierul văzut, nu și pe următorul', async ({ page }) => {
  await page.goto('/');
  const patrat = '<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="40mm" viewBox="0 0 40 40"><rect x="10" y="10" width="20" height="20"/></svg>';
  const cerc = '<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="40mm" viewBox="0 0 40 40"><circle cx="20" cy="20" r="10"/></svg>';
  await page.locator('[data-camp="fisier-svg"]').setInputFiles([fisier('unu.svg', patrat), fisier('doi.svg', cerc)]);
  await expect(page.getByTestId('import-coada')).toHaveText(' (1 din 2)');
  await expect(page.getByTestId('import-marime')).toBeVisible();
  await page.locator('[data-buton="importa"]').dblclick();
  await expect(page.getByTestId('import-coada')).toHaveText(' (2 din 2)');
  await expect(page.getByTestId('import-marime')).toBeVisible();
  await expect(page.getByTestId('lista-vectori').locator('li')).toHaveCount(1);
});

test('config.json care nu răspunde: aplicația pornește după termen, cu instanța necunoscută, nu rămâne albă', async ({ page }) => {
  await page.route('**/config.json', () => { /* fără răspuns */ });
  await page.goto('/');
  await expect(page.locator('[data-actiune="import.svg"]')).toBeVisible({ timeout: 10_000 });
});
