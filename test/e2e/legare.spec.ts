import { expect, test, type Page } from '@playwright/test';
import { documentSalvat } from './ajutor-document.ts';

/**
 * Legarea căilor (ADR 0182, felia 10.3↑o): comanda „Leagă căile” (Ctrl+J, butonul din secțiunea booleanului, opțiunile de sub
 * săgeata ei) și legarea din panoul Verificare (rândul „Capetele a două căi” și „Leagă toate căile”). Căile vin dintr-un SVG
 * (importul DXF le leagă singur): un import e o piesă cu toate formele lui, iar degruparea le face piese singure.
 */

test.use({ locale: 'ro-RO' });

const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');
const stare = (page: Page) => page.getByTestId('stare-legare');
type Nod = { tip: 'element'; forma: { tip: string; inchis?: boolean; varfuri?: unknown[] } } | { tip: 'grup'; copii: Nod[] };
type Doc = { piese: Array<{ radacina: Nod }> };
const elemente = (n: Nod): Array<Extract<Nod, { tip: 'element' }>> => (n.tip === 'element' ? [n] : n.copii.flatMap(elemente));
/** Căile proiectului salvat, ca [închisă, câte vârfuri], piesă cu piesă. */
const cai = async (page: Page): Promise<Array<Array<[boolean | undefined, number | undefined]>>> =>
  (JSON.parse(await documentSalvat(page, 0)) as Doc).piese.map((p) => elemente(p.radacina).map((e) => [e.forma.inchis, e.forma.varfuri?.length]));

async function importa(page: Page, corp: string): Promise<void> {
  await page.goto('/');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200mm" height="200mm" viewBox="0 0 200 200">${corp}</svg>`;
  await page.locator('[data-camp="fisier-svg"]').setInputFiles({ name: 'linii.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg, 'utf8') });
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(1);
}

// Un pătrat de 50 × 50 din patru linii, a treia scrisă invers față de ocol.
const PATRAT = '<path d="M10 10 H60"/><path d="M60 10 V60"/><path d="M10 60 H60"/><path d="M10 60 V10"/>';

test('Ctrl+J: cele patru linii ale unui SVG devin un pătrat închis, în aceeași piesă; Anulează le pune la loc', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await importa(page, PATRAT);
  await randuri(page).first().click();
  await expect.poll(() => cai(page)).toEqual([[[false, 2], [false, 2], [false, 2], [false, 2]]]);
  await page.keyboard.press('Control+KeyJ');
  await expect(stare(page)).toHaveText('Legate: 4 căi, acum 1; închise: 1. Anulezi cu Ctrl+Z.');
  await expect(randuri(page)).toHaveCount(1);
  await expect.poll(() => cai(page)).toEqual([[[true, 4]]]);
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect.poll(() => cai(page)).toEqual([[[false, 2], [false, 2], [false, 2], [false, 2]]]);
  expect(erori).toEqual([]);
});

test('Leagă căile din bară, pe două căi singure, cu opțiunile golului: refuzul spune golul; până la 3 mm, legate; opțiunea, ținută', async ({ page }) => {
  await importa(page, '<path d="M10 10 H60"/><path d="M62 10 H110"/>');
  await page.keyboard.press('Control+Shift+KeyG');
  await expect(randuri(page)).toHaveCount(2);
  await page.locator('[data-editare="optiuni-legare"]').click();
  const panou = page.getByTestId('panou-legare');
  await expect(panou).toBeVisible();
  await expect(panou.locator('[data-legare="gol-linie"]')).toHaveAttribute('aria-checked', 'true');
  await panou.locator('[data-legare="gol-lipire"]').click();
  await panou.locator('[data-legare="leaga"]').click();
  await expect(stare(page)).toHaveText('Capetele sunt la 2 mm: mai departe decât lasă opțiunile legării.');
  await panou.locator('[data-legare="gol-prag"]').click();
  await expect(panou.locator('[data-legare="prag"]')).toHaveValue('1');
  await panou.locator('[data-legare="leaga"]').click();
  await expect(stare(page)).toHaveText('Capetele sunt la 2 mm: mai departe decât lasă opțiunile legării.');
  await expect(randuri(page)).toHaveCount(2);
  await panou.locator('[data-legare="prag"]').fill('3');
  await panou.locator('[data-legare="leaga"]').click();
  await expect(stare(page)).toHaveText('Legate: 2 căi, acum 1; închise: 0. Anulezi cu Ctrl+Z.');
  await expect(randuri(page)).toHaveCount(1);
  await expect.poll(() => cai(page)).toEqual([[[false, 4]]]);
  await page.keyboard.press('Escape');
  await expect(panou).toHaveCount(0);
  // Opțiunile se țin în browser: după reîncărcare, golul „până la 3 mm”.
  await page.reload();
  await expect(randuri(page)).toHaveCount(1);
  await page.locator('[data-editare="optiuni-legare"]').click();
  await expect(panou.locator('[data-legare="gol-prag"]')).toHaveAttribute('aria-checked', 'true');
  await expect(panou.locator('[data-legare="prag"]')).toHaveValue('3');
});

test('Verificarea: „Leagă” pe rândul capetelor a două căi, apoi „Leagă toate căile”; capetele rămase deschise se văd mai departe', async ({ page }) => {
  await importa(page, '<path d="M10 10 H60"/><path d="M60 10 V60"/><path d="M100 10 H150"/><path d="M150 10 V60"/>');
  await page.locator('[data-editare="verificare"]').click();
  const lista = page.getByTestId('verificare-lista');
  const capete = lista.locator('section[data-fel="noduri"] li');
  await expect(capete).toHaveCount(2);
  await expect(capete.first()).toContainText('Capetele a două căi, la 0 mm');
  await expect(lista.locator('[data-repara="leaga-toate"]')).toHaveText('Leagă toate căile (2)');
  await capete.first().locator('[data-repara="leaga"]').click();
  await expect(page.getByTestId('verificare-reparare')).toHaveText('Legate: 2 căi, acum 1; închise: 0. Anulezi cu Ctrl+Z.');
  await expect(capete).toHaveCount(1);
  await lista.locator('[data-repara="leaga-toate"]').click();
  await expect(page.getByTestId('verificare-reparare')).toHaveText('Legate: 2 căi, acum 1; închise: 0. Anulezi cu Ctrl+Z.');
  await expect(lista.locator('section[data-fel="noduri"]')).toHaveCount(0);
  await expect(lista.locator('section[data-fel="deschis"] li')).toHaveCount(2);
  await expect.poll(() => cai(page)).toEqual([[[false, 3], [false, 3]]]);
});
