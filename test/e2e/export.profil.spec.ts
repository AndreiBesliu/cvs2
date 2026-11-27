import { test, expect, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { judeca } from '../oracles/simulare.ts';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

/**
 * Profilul desenat în proiect (ADR 0304 §5, felia 16.A↑f-3), în Edge: o rotunjire R3 Ø12 din „Frezele mele”, aleasă pe canelura
 * dreptunghiului 100 × 60 (colțul în (20, 20)), pune pe rând forma profilată (doar de citit, cu diametrul ei) și silueta în
 * desenul frezei; Exportă scrie programul cu numele ei în comentariul sculei, iar oracolul simulării, cu silueta adevărată (pe
 * hârtie: fundul plat până la 3 mm de axă, apoi sfertul de cerc cu centrul în (6, 0), h(x) = √(9 − (6 − x)²)), dă sub latura de
 * jos secțiunea canelurii: la adâncimea 2, fundul la −2 pe 6 mm, lățimea la față 2·(6 − √5) = 7,528 mm, nimic tăiat la peste 6
 * mm de linie. Pe exterior (marginea profilată, 16.A↑f-4), la 2 mm, centrul stă la fundul plat (3 mm) de desen: nota spune
 * retragerea muchiei de sus, iar oracolul dă secțiunea marginii, fără nimic tăiat în piesă dincolo de muchie; peste înălțimea
 * profilului (3 mm), exportul se oprește, cu motivul.
 */
const ROTUNJIRE = {
  id: 'r3', rev: 1, schimbatLa: 1_000, nume: 'Rotunjire R3', fel: 'rotunjire', diametru: 12, raza: 3, numar: 7,
  turatie: 18000, avans: 1000, plonjare: 300, pas: 3, pasLateral: 40,
};

async function bibliotecaCuRotunjire(page: Page): Promise<void> {
  await page.evaluate((f) => new Promise<void>((rezolva, respinge) => {
    const r = indexedDB.open('cncvs2-freze', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('biblioteci'); };
    r.onerror = () => { respinge(r.error ?? new Error('IndexedDB')); };
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction('biblioteci', 'readwrite');
      tx.objectStore('biblioteci').put({ v: 1, freze: [f], standard: true }, 'local');
      tx.oncomplete = () => { db.close(); rezolva(); };
      tx.onerror = () => { respinge(tx.error ?? new Error('IndexedDB')); };
    };
  }), ROTUNJIRE);
  await page.reload();
}

const lista = (f: Locator): Locator => f.locator('[data-camp="freza-biblioteca"]');

test('o rotunjire din „Frezele mele”: canelura și marginea profilată tăiate ca silueta, pe hârtie; peste înălțimea profilului, refuzat', async ({ page }) => {
  await page.goto('/');
  await bibliotecaCuRotunjire(page);
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-fisa="op"]').first();
  await rand.locator('input[data-camp="latura"][value="pe-linie"]').check();
  await lista(rand).selectOption({ label: 'Rotunjire R3' });
  const forma = rand.locator('[data-camp="forma-scula"]');
  await expect(forma).toHaveValue('profil');
  await expect(forma.locator('option:checked')).toHaveText('profilată (din „Frezele mele”)');
  const diametru = rand.locator('[data-camp="diametru"]');
  await expect(diametru).toHaveValue('12');
  await expect(diametru).toHaveAttribute('readonly', '');
  await expect(rand.locator('[data-desen="profil"]')).toBeVisible();
  await rand.locator('[data-camp="adancime"]').fill('2');
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  expect(text).toContain('Rotunjire R3 D12');
  // Silueta adevărată, din arcul pe hârtie (200 de pași: coarda la sub 0,00003 mm de arc).
  const puncte: Array<readonly [number, number]> = [[0, 0]];
  for (let k = 0; k <= 200; k++) {
    const phi = (k / 200) * (Math.PI / 2);
    puncte.push([6 - 3 * Math.cos(phi), 3 * Math.sin(phi)]);
  }
  const h = (x: number): number => (x <= 3 ? 0 : Math.sqrt(Math.max(0, 9 - (6 - x) ** 2)));
  // Fâșia de sub latura de jos (y = 20), departe de colțuri; îngustă, ca oracolul să țină puțin.
  const g = { x0: 49.75, y0: 10, latime: 0.5, inaltime: 20, celula: 0.05 };
  const o = judeca(text, g, { tip: 'profil', diametru: 12, puncte });
  const i = Math.floor(o.nx / 2);
  let taiate = 0, maxAbatere = 0;
  for (let j = 0; j < o.ny; j++) {
    const y = g.y0 + (j + 0.5) * g.celula, x = Math.abs(y - 20), z = o.z[j * o.nx + i]!;
    const hartie = x <= 6 ? Math.min(0, -2 + h(x)) : 0;
    maxAbatere = Math.max(maxAbatere, Math.abs(z - hartie));
    if (z < -1e-9) taiate++;
    if (x > 6.05) expect(z, `tăiat la ${x.toFixed(3)} mm de linie`).toBeGreaterThan(-1e-9);
  }
  expect(maxAbatere).toBeLessThanOrEqual(1e-3);
  expect(Math.abs(taiate * g.celula - 2 * (6 - Math.sqrt(5)))).toBeLessThanOrEqual(2 * g.celula + 1e-9);
  // Pe exterior (marginea profilată, 16.A↑f-4): la 2 mm (sub înălțimea profilului, 3 mm), centrul la fundul plat (3 mm) de
  // desen; nota spune retragerea muchiei de sus, r(2) − 3 = 3 − √5 = 0,764 mm (pe linii, la cel mult 0,001 de arc).
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-fisa="op"]')).toHaveCount(0);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(forma).toHaveValue('profil');
  await rand.locator('input[data-camp="latura"][value="exterior"]').check();
  await expect(rand.locator('[data-nota="margine-profil"]')).toHaveText(/^La fund, peretele cade pe desen; muchia de sus se retrage cu 0,76[45] mm, după silueta frezei\.$/);
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  const d2 = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text2 = readFileSync(await (await d2).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('SHA-256');
  // Secțiunea marginii sub latura de jos: centrul la y = 17, piesa deasupra lui y = 20.
  const o2 = judeca(text2, g, { tip: 'profil', diametru: 12, puncte });
  let abatere2 = 0;
  for (let j = 0; j < o2.ny; j++) {
    const y = g.y0 + (j + 0.5) * g.celula, rho = Math.abs(y - 17), z = o2.z[j * o2.nx + i]!;
    const hartie = rho <= 6 ? Math.min(0, -2 + h(rho)) : 0;
    abatere2 = Math.max(abatere2, Math.abs(z - hartie));
    // În piesă, dincolo de muchia retrasă (cu o celulă), nimic tăiat.
    if (y > 20 + (3 - Math.sqrt(5)) + g.celula) expect(z, `tăiat în piesă la y = ${y.toFixed(3)}`).toBeGreaterThan(-1e-9);
  }
  expect(abatere2).toBeLessThanOrEqual(1e-3);
  // Peste înălțimea profilului: refuzat, cu motivul în grupul frezei și sub tabel.
  await rand.locator('[data-camp="adancime"]').fill('3,5');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('taie cel mult cât înălțimea profilului (3 mm)');
  await expect(rand.locator('[data-grup="freza"] [data-greseala]')).toContainText(['taie cel mult cât înălțimea profilului (3 mm)']);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
