import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { adauga } from './ajutor-panza.ts';
import { CORPUS } from '../../scripts/export2d-corpus.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { vectoriFoaie } from '../../src/io/vectori.ts';
import { scrieSvg } from '../../src/io/svgExport.ts';

test.use({ locale: 'ro-RO' });

/**
 * Exportul vectorilor (ADR 0088), în Edge: panoul din extensia barei (DXF implicit, SVG, conturul foii), fișierele descărcate
 * (DXF: entitățile și straturile; SVG: geometria măsurată de motorul SVG al browserului, un cititor independent) și, tot în
 * motorul browserului, corpusul cu cazurile grele: lungimile pe hârtie, punctul din mijlocul arcelor (sensul lor după
 * întoarcerea axei Y), cercurile.
 */

/** Geometria unui SVG, măsurată de browser: lungimea și punctul de la o distanță pe fiecare `path`, cutia fiecărui element. */
async function masoara(page: Page, svg: string, cereri: ReadonlyArray<{ readonly sel: string; readonly la?: number }>) {
  await page.setContent(`<!doctype html><body style="margin:0">${svg.replace(/^<\?xml[^>]*>\s*/, '')}</body>`);
  return page.evaluate((c) => c.map(({ sel, la }) => {
    const e = document.querySelector(sel) as SVGGraphicsElement | null;
    if (!e) return null;
    const b = e.getBBox();
    const g = e as unknown as SVGGeometryElement;
    const lungime = typeof g.getTotalLength === 'function' ? g.getTotalLength() : null;
    const p = la !== undefined ? g.getPointAtLength(la) : null;
    return { x: b.x, y: b.y, w: b.width, h: b.height, lungime, px: p?.x ?? null, py: p?.y ?? null };
  }), cereri);
}

const descarca = async (page: Page): Promise<string> => {
  const d = page.waitForEvent('download');
  await page.locator('[data-vectori="exporta"]').click();
  const f = await d;
  return readFileSync(await f.path(), 'utf8');
};

test('panoul: DXF implicit (polilinia închisă a dreptunghiului, cercul, straturile), apoi SVG cu conturul foii, măsurat de browser', async ({ page, context }) => {
  await page.goto('/');
  // Pe foaia goală: nimic de exportat, nicio descărcare.
  await page.locator('[data-editare="vectori"]').click();
  const panou = page.getByTestId('panou-vectori');
  await expect(panou).toBeVisible();
  await expect(page.locator('[data-vectori-format="dxf"]')).toHaveAttribute('aria-checked', 'true');
  let descarcari = 0;
  page.on('download', () => { descarcari++; });
  await page.locator('[data-vectori="exporta"]').click();
  await expect(page.getByTestId('stare-vectori')).toHaveText('Nimic de exportat: foaia n-are nicio formă.');
  expect(descarcari).toBe(0);
  await page.locator('[data-vectori="inchide"]').click();
  await expect(panou).toHaveCount(0);
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  // Încă un cerc (peste primul): 3 entități pe 2 straturi, ca numerele din stare să difere.
  await adauga(page, 'cerc');
  await page.locator('[data-editare="vectori"]').click();
  await expect(panou).toBeVisible();
  const dxf = await descarca(page);
  await expect(page.getByTestId('stare-vectori')).toHaveText('Descărcat cncvs2-foaia-1.dxf (entități: 3, straturi: 2)');
  // Dreptunghiul 100 × 60 din (20, 20): o LWPOLYLINE închisă pe EXTERIOR; cercul R15 din (70, 50): CIRCLE pe INTERIOR.
  expect(dxf).toContain('\n$ACADVER\n1\nAC1021\n');
  expect(dxf).toMatch(/\n0\nLWPOLYLINE\n5\n[0-9A-F]+\n330\n[0-9A-F]+\n100\nAcDbEntity\n8\nEXTERIOR\n100\nAcDbPolyline\n90\n4\n70\n1\n43\n0\n10\n20\n20\n20\n10\n120\n20\n20\n10\n120\n20\n80\n10\n20\n20\n80\n/);
  expect(dxf).toMatch(/\n0\nCIRCLE\n5\n[0-9A-F]+\n330\n[0-9A-F]+\n100\nAcDbEntity\n8\nINTERIOR\n100\nAcDbCircle\n10\n70\n20\n50\n30\n0\n40\n15\n/);

  await page.locator('[data-vectori-format="svg"]').click();
  await expect(page.getByTestId('stare-vectori')).toHaveCount(0);
  await page.locator('[data-vectori="foaia"]').check();
  const svg = await descarca(page);
  await expect(page.getByTestId('stare-vectori')).toHaveText('Descărcat cncvs2-foaia-1.svg (entități: 4, straturi: 3)');
  expect(svg).toMatch(/width="300mm" height="200mm" viewBox="0 0 300 200"/);
  // Esc închide panoul.
  await page.keyboard.press('Escape');
  await expect(panou).toHaveCount(0);

  const alta = await context.newPage();
  const [drept, cerc, foaia] = await masoara(alta, svg, [{ sel: '#EXTERIOR path', la: 50 }, { sel: '#INTERIOR circle' }, { sel: '#FOAIE path' }]);
  // Y întors: dreptunghiul de la y 20…80 al foii e la 120…180 în SVG; perimetrul 320; la 50 mm de pornire, pe latura de jos.
  expect(drept).toMatchObject({ x: 20, y: 120, w: 100, h: 60 });
  expect(drept!.lungime).toBeCloseTo(320, 3);
  expect([drept!.px, drept!.py]).toEqual([70, 180]);
  expect(cerc).toMatchObject({ x: 55, y: 135, w: 30, h: 30 });
  expect(foaia).toMatchObject({ x: 0, y: 0, w: 300, h: 200 });
});

test('corpusul în motorul SVG al browserului: lungimile pe hârtie, mijlocul arcelor (sensul după întoarcerea Y), cercurile', async ({ page }) => {
  const r = incarca(structuredClone(CORPUS));
  if (!r.ok) throw new Error(r.motiv);
  const svg = scrieSvg(vectoriFoaie(r.doc, 0, true));
  const H = 400;
  // Arcul lui D: coarda 50, bulge −0,5 → θ = 4·atan 0,5, R = 25 / sin(θ / 2); mijlocul lui în (212,5; 325) (săgeata
  // b · c / 2 = 12,5 spre interiorul lui D).
  const teta = 4 * Math.atan(0.5), R = 25 / Math.sin(teta / 2), arcD = R * teta;
  const m = await masoara(page, svg, [
    { sel: '#EXTERIOR path:nth-of-type(1)', la: 0 },
    { sel: '#PE_LINIE path:nth-of-type(2)', la: 50 + (25 * Math.PI) / 2 },
    { sel: '#EXTERIOR path:nth-of-type(3)', la: 60 + arcD / 2 },
    { sel: '#FARA_OPERATIE path', la: 0 },
    { sel: '#BUZUNAR path', la: 0 },
    { sel: '#INTERIOR circle' },
    { sel: '#INTERIOR circle:nth-of-type(2)' },
    { sel: '#GAURIRE circle' },
    { sel: '#EXTERIOR circle' },
  ]);
  const [drept, sPol, dPol, oglindit, oval, cerc, mare, gaura, cercC] = m;
  // Lungimile și punctele de pe arce vin din aproximarea browserului (arcele ca Bézier, pe float): ± 0,05 mm.
  // Dreptunghiul 200 × 100 R10: perimetrul 2·(180 + 80) + 2π·10.
  expect(drept!.lungime).toBeCloseTo(520 + 20 * Math.PI, 1);
  // Calea S: linia de 50, apoi semicercul R25 (25π); la jumătatea lui, punctul de jos al foii (475, 25) → (475, 375).
  expect(sPol!.lungime).toBeCloseTo(50 + 25 * Math.PI, 1);
  expect(sPol!.px).toBeCloseTo(475, 1);
  expect(sPol!.py).toBeCloseTo(H - 25, 1);
  // D: 60 + arcul + 60; mijlocul arcului în (212,5; 325) → (212,5; 75).
  expect(dPol!.lungime).toBeCloseTo(120 + arcD, 1);
  expect(dPol!.px).toBeCloseTo(212.5, 1);
  expect(dPol!.py).toBeCloseTo(H - 325, 1);
  // Dreptunghiul oglindit 40 × 20 R5: perimetrul 2·(30 + 10) + 2π·5, între x 520 și 560.
  expect(oglindit!.lungime).toBeCloseTo(80 + 10 * Math.PI, 1);
  expect(oglindit).toMatchObject({ x: 520, w: 40 });
  // Ovalul începe în (140, 300) → (140, 100) și e lat de 80, înalt de 40.
  expect([oval!.px, oval!.py]).toEqual([140, 100]);
  expect(oval!.w).toBeCloseTo(80, 3);
  expect(oval!.h).toBeCloseTo(40, 3);
  expect(cerc).toMatchObject({ x: 350, y: H - 300, w: 100, h: 100 });
  expect(mare).toMatchObject({ x: 275, y: H - 355, w: 50, h: 50 });
  expect(gaura).toMatchObject({ x: 537, y: H - 383, w: 6, h: 6 });
  expect(cercC).toMatchObject({ x: 575, y: H - 35, w: 10, h: 10 });
});
