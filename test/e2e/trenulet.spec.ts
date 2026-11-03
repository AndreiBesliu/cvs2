import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { pachetTrenulet } from '../../scripts/construieste-trenulet.ts';

/**
 * Planificatorul Trenuleț ca extensie (ADR 0129, felia 3.Ta), în Edge, cu pachetul construit aici din sursele lui:
 * - instalarea din fișier, cu cele două permisiuni arătate; pagina v18 în cadrul izolat: marcajul, scripturile clasice,
 *   atributele `style` puse prin CSSOM (din marcaj și din șabloanele scripturilor; CSP-ul moștenit le refuză ca atribute),
 *   circuitele „salvate singure”, adică prin `window.claude.use('db')`, peste stocarea extensiei;
 * - păstrate după reîncărcare: circuitul numit (în `db`, redeschis), modul 3D (doar în `localStorage`), culoarea din atelier;
 * - „Salvează fișierul .json” din exportul CNC ajunge descărcare a browserului, din pagina lui cvs2, cu numele dat de
 *   planificator;
 * - ștergerea circuitului, cu confirmarea lui, rămâne și după reîncărcare; jurnalul local, fără erori.
 */
test.use({ locale: 'ro-RO' });

const PACHET = Buffer.from(pachetTrenulet().octeti);
const cadru = (page: Page) => page.frameLocator('iframe.cadru-extensie');

async function deschide(page: Page): Promise<void> {
  await page.locator('[data-extensii="buton"]').click();
  await page.getByTestId('meniu-extensii').locator('[data-extensii="deschide"][data-id="trenulet"]').click();
  await expect(page.getByTestId('spatiu-extensie')).toHaveAttribute('data-stare', 'pornit');
}

/** Ce a scris extensia în stocarea ei (IndexedDB-ul lui cvs2, magazinul `date`), la o cheie; sau cheile cu un prefix. */
const stocat = (page: Page, cheie: string) => page.evaluate((k) => new Promise<unknown>((ok, nu) => {
  const r = indexedDB.open('cncvs2-extensii');
  r.onerror = () => { nu(r.error); };
  r.onsuccess = () => {
    const s = r.result.transaction('date').objectStore('date');
    const q = k.endsWith('/') ? s.getAllKeys(IDBKeyRange.bound(['trenulet', k], ['trenulet', `${k}￿`])) : s.get(['trenulet', k]);
    q.onsuccess = () => { ok(q.result); r.result.close(); };
    q.onerror = () => { nu(q.error); };
  };
}), cheie);

test('instalat din fișier: pagina v18 în cadru; circuitul, modul și culoarea păstrate; descărcarea prin cvs2; ștergerea', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-extensii="buton"]').click();
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: 'trenulet-18.0.0.zip', mimeType: 'application/zip', buffer: PACHET });
  await expect(page.getByTestId('extensii-despre')).toHaveText('„Planificator Trenuleț” 18.0.0, de la trenulet-18.0.0.zip');
  await expect(page.getByTestId('extensii-permisiuni')).toHaveText(
    'Cere: să-și țină datele în browserul acesta (cel mult 16 MB); să salveze fișiere ca descărcări (date și desene, nu programe).',
  );
  await page.locator('[data-extensii="instaleaza"]').click();
  await deschide(page);

  let c = cadru(page);
  // Scripturile au rulat (init), iar `window.claude.use('db')` a dat documentele: textul circuitelor e cel „cu bază de date”.
  await expect(c.locator('#circ-unde')).toHaveText(/^Circuitele se salvează singure/);
  // Un atribut `style` din marcaj, pus prin CSSOM.
  await expect(c.locator('#circ-lista')).toHaveCSS('display', 'flex');
  await expect(c.locator('#circ-lista')).toHaveCSS('flex-direction', 'column');

  await c.locator('#nume').fill('Ovalul de probă');
  await c.locator('#btn-circuite').click();
  await expect(c.locator('#circ-lista .circ b')).toHaveText(['Ovalul de probă']);
  await c.locator('#foaie-circuite [data-inchide]').click();
  await c.locator('[data-mod="3d"]').first().click();
  await c.locator('#at-culori [data-c="#1f5fbf"]').click();
  await expect.poll(() => stocat(page, 'ls:trenulet.mod')).toMatchObject({ valoare: '3d' });
  await expect.poll(async () => JSON.stringify(await stocat(page, 'db:atelier/curent'))).toContain('"culoare":"#1f5fbf"');

  await page.reload();
  await deschide(page);
  c = cadru(page);
  await expect(c.locator('[data-mod="3d"]').first()).toHaveAttribute('aria-pressed', 'true');
  const albastru = c.locator('#at-culori [data-c="#1f5fbf"]');
  await expect(albastru).toHaveAttribute('aria-pressed', 'true');
  // Un atribut `style` dintr-un șablon al scripturilor (atelier.js), pus prin CSSOM.
  await expect(albastru).toHaveCSS('background-color', 'rgb(31, 95, 191)');
  await expect(c.locator('#nume')).toHaveValue('Ovalul de probă');

  await c.locator('[data-mod="2d"]').first().click();
  await c.locator('#btn-export').click();
  await c.locator('#foaie-export summary', { hasText: 'Lista de piese ca fișier .json' }).click();
  const descarcare = page.waitForEvent('download');
  await c.locator('#e-salveaza').click();
  const d = await descarcare;
  expect(d.suggestedFilename()).toBe('ovalul_de_proba.json');
  const corp = JSON.parse(readFileSync(await d.path(), 'utf8')) as Record<string, unknown>;
  expect([corp.format, corp.nume]).toEqual(['trenulet-circuit', 'Ovalul de probă']);
  await c.locator('#foaie-export [data-inchide]').click();

  await c.locator('#btn-circuite').click();
  await c.locator('#circ-lista [data-sterge-c]').click();
  const sigur = c.locator('#circ-lista [data-sterge-c]');
  await expect(sigur).toHaveText('Sigur? Șterge');
  await expect(sigur).toHaveCSS('color', 'rgb(194, 53, 43)');
  await sigur.click();
  await expect(c.locator('#circ-lista')).toHaveText('Încă nu ai circuite salvate. Orice schimbare pe plan se salvează singură.');
  await expect.poll(() => stocat(page, 'db:circuite/')).toEqual([]);

  await page.reload();
  await deschide(page);
  await cadru(page).locator('#btn-circuite').click();
  await expect(cadru(page).locator('#circ-lista')).toHaveText('Încă nu ai circuite salvate. Orice schimbare pe plan se salvează singură.');
  await expect(page.getByTestId('jurnal')).not.toHaveClass(/cip-rosu/);
});
