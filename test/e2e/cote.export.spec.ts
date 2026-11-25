import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

/**
 * Cotele în exportul vectorilor (ADR 0330 §7, felia 10.4↑c-1), în Edge: bifa „Cu cotele (N)” apare doar pe o foaie cu cote,
 * pornește după Setări (implicit oprită), iar cu ea fișierele au stratul cotelor (numele, culoarea și grosimea din Setări).
 * SVG-ul cotei e măsurat de motorul SVG al browserului: linia de cotă, extensiile, săgețile și cifrele „100”, cât pe hârtie.
 * Felia 10.4↑c-2: în DXF, cotele sunt implicit DIMENSION (cu blocul lor); cu „Cifrele: Text”, cifra e MTEXT sau `<text>`; cu
 * „Linii și cifre”, desenul iese direct.
 */
type P = { readonly x: number; readonly y: number };
const cote = (page: Page) => page.locator('[data-testid="strat-cote"] > svg > g[data-cota]');

async function clic(page: Page, p: P): Promise<void> {
  const s = (await ecran(page, await vedere(page)))(p.x, p.y);
  await page.mouse.move(s.x, s.y, { steps: 2 });
  await page.mouse.click(s.x, s.y);
}

/** Dreptunghiul 100 × 60 din (20, 20) și cota orizontală a laturii lui de sus, cu linia la y = 100. */
async function cuCota(page: Page): Promise<void> {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await puneCota(page);
}

/** Cota laturii de sus a dreptunghiului: unealta Cote (adusă la cerere: întâi stratul ei), trei clicuri, apoi Selecția. */
async function puneCota(page: Page): Promise<void> {
  await page.locator('[data-unealta="cote"]').click();
  await expect(page.getByTestId('strat-cote')).toHaveAttribute('data-fel', /.+/);
  await clic(page, { x: 20, y: 80 });
  await clic(page, { x: 120, y: 80 });
  await clic(page, { x: 70, y: 100 });
  await expect(cote(page)).toHaveCount(1);
  await expect(page.locator('[data-testid="lista-cote"]')).toContainText('Cote (1)');
  await page.locator('[data-unealta="selectie"]').click();
}

const descarca = async (page: Page): Promise<string> => {
  const d = page.waitForEvent('download');
  await page.locator('[data-vectori="exporta"]').click();
  const f = await d;
  return readFileSync(await f.path(), 'utf8');
};

test('fără cote, nicio bifă; cu o cotă, „Cu cotele (1)” oprită, iar fișierul e cel fără cote', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-editare="vectori"]').click();
  await expect(page.getByTestId('panou-vectori')).toBeVisible();
  await expect(page.locator('[data-vectori="cote"]')).toHaveCount(0);
  const fara = await descarca(page);
  await page.locator('[data-vectori="inchide"]').click();

  await puneCota(page);
  await page.locator('[data-editare="vectori"]').click();
  const bifa = page.locator('[data-vectori="cote"]');
  await expect(bifa).toBeVisible();
  await expect(bifa).not.toBeChecked();
  await expect(page.locator('label', { has: bifa })).toHaveText('Cu cotele (1)');
  await expect(page.getByTestId('nota-vectori-cote')).toHaveCount(0);
  expect(await descarca(page)).toBe(fara);
  await expect(page.getByTestId('stare-vectori')).toHaveText('Descărcat cncvs2-foaia-1.dxf (entități: 1, straturi: 1)');
});

test('cu cotele: DXF cu stratul COTE (culoarea, săgețile pline), SVG măsurat de browser: linia, extensiile, cifrele', async ({ page }) => {
  await cuCota(page);
  await page.locator('[data-editare="vectori"]').click();
  await page.locator('[data-vectori="cote"]').check();
  await expect(page.getByTestId('nota-vectori-cote')).toContainText('Pe stratul COTE');
  const dxf = await descarca(page);
  await expect(page.getByTestId('stare-vectori')).toHaveText(/^Descărcat cncvs2-foaia-1\.dxf \(entități: \d+, straturi: 2, cote: 1\)$/);
  // Stratul cotelor: #006d8f, deci cyan (4) ca ACI, și culoarea exactă (0x006d8f = 28047).
  expect(dxf).toMatch(/\nAcDbLayerTableRecord\n2\nCOTE\n70\n0\n62\n4\n420\n28047\n/);
  expect((dxf.match(/\n0\nSOLID\n/g) ?? []).length).toBe(2);
  // Linia de cotă (20, 100)–(120, 100) și extensiile (20, 81)–(20, 102), (120, 81)–(120, 102).
  for (const [a, b, c, d] of [[20, 100, 120, 100], [20, 81, 20, 102], [120, 81, 120, 102]]) {
    expect(dxf).toContain(`\n8\nCOTE\n100\nAcDbPolyline\n90\n2\n70\n0\n43\n0\n10\n${a}\n20\n${b}\n10\n${c}\n20\n${d}\n`);
  }

  await page.locator('[data-vectori-format="svg"]').click();
  const svg = await descarca(page);
  expect(svg).toMatch(/<g id="COTE" inkscape:groupmode="layer" inkscape:label="COTE" fill="none" stroke="#006d8f" stroke-width="0.1">/);
  await page.setContent(`<!doctype html><body style="margin:0">${svg.replace(/^<\?xml[^>]*>\s*/, '')}</body>`);
  const m = await page.evaluate(() => {
    const g = document.querySelector('g#COTE') as SVGGraphicsElement;
    const cai = [...g.querySelectorAll('path')] as SVGGeometryElement[];
    const linie = cai.find((p) => p.getAttribute('d') === 'M20 100L120 100');
    // Cifrele: căile deasupra liniei (în SVG, Y în jos: y < 100), fără umplutură.
    const cifre = cai.filter((p) => p.getAttribute('fill') === null && p.getBBox().y + p.getBBox().height < 99.5);
    const x0 = Math.min(...cifre.map((p) => p.getBBox().x)), x1 = Math.max(...cifre.map((p) => p.getBBox().x + p.getBBox().width));
    const y0 = Math.min(...cifre.map((p) => p.getBBox().y)), y1 = Math.max(...cifre.map((p) => p.getBBox().y + p.getBBox().height));
    const b = g.getBBox();
    return { linie: linie?.getTotalLength() ?? null, pline: cai.filter((p) => p.getAttribute('fill') === '#006d8f').length, cifre: cifre.length, x0, x1, y0, y1, b: { x: b.x, y: b.y, w: b.width, h: b.height } };
  });
  expect(m.linie).toBeCloseTo(100, 4);
  expect(m.pline).toBe(2);
  expect(m.cifre).toBeGreaterThanOrEqual(3);
  // „100” centrat pe x = 70, cu baza la 100 + 0,3 · 3,5 = 101,05 (în SVG, y = 98,95) și înalt de 3,5 mm.
  expect(Math.abs((m.x0 + m.x1) / 2 - 70)).toBeLessThan(0.4);
  expect(Math.abs(m.y1 - (200 - 101.05))).toBeLessThan(0.05);
  expect(Math.abs(m.y1 - m.y0 - 3.5)).toBeLessThan(0.15);
  // Toată cota: de la x = 20 la 120; de la vârful cifrelor la golul extensiilor (y = 81, adică 119 în SVG).
  expect(m.b.x).toBeCloseTo(20, 4);
  expect(m.b.w).toBeCloseTo(100, 4);
  expect(m.b.y + m.b.h).toBeCloseTo(119, 4);
});

test('Setări › Cotele › Exportul: bifa pornită, alt nume și altă grosime; un nume rezervat e refuzat lângă câmp', async ({ page }) => {
  await cuCota(page);
  await page.locator('[data-editare="vectori"]').click();
  await page.locator('[data-vectori="cote"]').check();
  await page.locator('[data-vectori="setari"]').click();
  const dialog = page.getByTestId('dialog-setari');
  await expect(dialog).toBeVisible();
  const grup = dialog.locator('[data-grup="export"]');
  await expect(grup.locator('[data-setari-implicit="export"]')).toBeDisabled();
  await grup.locator('[data-setare="export.cuCote"]').check();
  const nume = grup.locator('[data-setare="export.strat"]');
  await nume.fill('Dim-1');
  await expect(grup.locator('.setari-gresit')).toHaveCount(0);
  // Un nume rezervat (DXF-ul nu deosebește literele: „foaie” e FOAIE) nu ajunge în setări: rămâne cel bun, de dinainte.
  await nume.fill('foaie');
  await expect(grup.locator('.setari-gresit')).toHaveText('Numele nu se poate folosi; rămâne „Dim-1”.');
  await expect(nume).toHaveAttribute('aria-invalid', 'true');
  const grosime = grup.locator('[data-setare="export.grosime"]');
  await grosime.fill('0,3');
  await expect(nume).toHaveValue('Dim-1');
  await grosime.press('Enter');
  await expect(grup.locator('[data-setari-implicit="export"]')).toBeEnabled();
  await page.locator('[data-buton="setari-inchide"]').click();
  await expect(dialog).toHaveCount(0);

  // Panoul redeschis pornește cu bifa pusă, cu stratul nou.
  await page.locator('[data-vectori="inchide"]').click();
  await page.locator('[data-editare="vectori"]').click();
  await expect(page.locator('[data-vectori="cote"]')).toBeChecked();
  await expect(page.getByTestId('nota-vectori-cote')).toContainText('Pe stratul Dim-1');
  await page.locator('[data-vectori-format="svg"]').click();
  const svg = await descarca(page);
  expect(svg).toMatch(/<g id="Dim-1" inkscape:groupmode="layer" inkscape:label="Dim-1" fill="none" stroke="#006d8f" stroke-width="0.3">/);
  // Reîncărcată, aplicația ține setările.
  await page.reload();
  await page.locator('[data-editare="vectori"]').click();
  await expect(page.locator('[data-vectori="cote"]')).toBeChecked();
});

test('cotele ca DIMENSION, implicit; „Cifrele: Text”: MTEXT în DXF, <text> în SVG (măsurat de browser); „Linii și cifre”: fără DIMENSION', async ({ page }) => {
  await cuCota(page);
  await page.locator('[data-editare="vectori"]').click();
  await page.locator('[data-vectori="cote"]').check();
  const nota = page.getByTestId('nota-vectori-cote');
  await expect(nota).toContainText('Pe stratul COTE, cu cifrele ca trăsături. În DXF, cotele rămân cote (DIMENSION).');
  const dxf = await descarca(page);
  // Cota e o DIMENSION rotită (70 = 32: felul 0, blocul doar al ei), cu măsura 100 și textul „100”, după stilul CNCVS2; desenul
  // ei stă în blocul anonim *D1.
  expect(dxf).toMatch(/\n0\nDIMENSION\n[\s\S]*\n2\n\*D1\n10\n120\n20\n100\n30\n0\n11\n70\n21\n102\.8\n31\n0\n70\n32\n71\n5\n42\n100\n1\n100\n3\nCNCVS2\n/);
  expect(dxf).toMatch(/\n0\nBLOCK\n[\s\S]*\n2\n\*D1\n70\n1\n/);

  await page.locator('[data-vectori="setari"]').click();
  const grup = page.getByTestId('dialog-setari').locator('[data-grup="export"]');
  await expect(grup.locator('[data-setare="export.dxf"]')).toHaveValue('dimension');
  await grup.locator('[data-setare="export.cifre"]').selectOption('text');
  await page.locator('[data-buton="setari-inchide"]').click();
  await page.locator('[data-vectori="inchide"]').click();
  await page.locator('[data-editare="vectori"]').click();
  await page.locator('[data-vectori="cote"]').check();
  await expect(nota).toContainText('cu cifrele ca text');
  // Cifra, MTEXT în blocul cotei: la jumătate de majusculă deasupra bazei (100 + 1,05 + 1,75), înaltă de 3,5.
  expect(await descarca(page)).toMatch(/\n0\nMTEXT\n[\s\S]*\n10\n70\n20\n102\.8\n30\n0\n40\n3\.5\n41\n0\n71\n5\n72\n1\n1\n100\n7\nStandard\n/);

  await page.locator('[data-vectori-format="svg"]').click();
  await expect(nota).not.toContainText('DIMENSION');
  const svg = await descarca(page);
  await page.setContent(`<!doctype html><body style="margin:0">${svg.replace(/^<\?xml[^>]*>\s*/, '')}</body>`);
  const m = await page.evaluate(() => {
    const t = document.querySelector('g#COTE text') as SVGTextElement;
    const b = t.getBBox();
    return { text: t.textContent, x: b.x + b.width / 2, sus: b.y, jos: b.y + b.height, cai: document.querySelectorAll('g#COTE path').length };
  });
  // „100” centrat pe x = 70, cu baza la 200 − 101,05 = 98,95 în SVG: cutia urcă peste 3,5 mm (majuscula) și coboară sub bază.
  expect(m.text).toBe('100');
  expect(Math.abs(m.x - 70)).toBeLessThan(0.3);
  expect(m.sus).toBeLessThan(98.95 - 3.4);
  expect(m.jos).toBeGreaterThan(98.95);
  // Fără trăsăturile cifrelor: doar liniile, extensiile și săgețile (5 căi).
  expect(m.cai).toBe(5);
});

test('„Cotele în DXF: Linii și cifre”: desenul cotei direct în ENTITIES, fără DIMENSION și fără bloc', async ({ page }) => {
  await cuCota(page);
  await page.locator('[data-editare="vectori"]').click();
  await page.locator('[data-vectori="cote"]').check();
  await page.locator('[data-vectori="setari"]').click();
  await page.getByTestId('dialog-setari').locator('[data-setare="export.dxf"]').selectOption('linii');
  await page.locator('[data-buton="setari-inchide"]').click();
  await page.locator('[data-vectori="inchide"]').click();
  await page.locator('[data-editare="vectori"]').click();
  await page.locator('[data-vectori="cote"]').check();
  await expect(page.getByTestId('nota-vectori-cote')).toContainText('În DXF, cotele ies ca linii și cifre.');
  const dxf = await descarca(page);
  expect(dxf).not.toContain('DIMENSION\n5');
  expect(dxf).not.toContain('*D1');
  expect(dxf).toContain('\n8\nCOTE\n100\nAcDbPolyline\n90\n2\n70\n0\n43\n0\n10\n20\n20\n100\n10\n120\n20\n100\n');
});
