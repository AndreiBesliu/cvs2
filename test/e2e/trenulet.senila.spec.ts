/**
 * Șenila în atelierul Easy 3Draw (ADR 0280, felia 3.To), pe pagina de sine stătătoare a planificatorului (din aceleași surse
 * ca pachetul):
 * - tipul nou, în fila Roți: „Zală de șenilă”, ca LEGO 57518, 38,4 × 17,2; găurile de știft, la alegere;
 * - montajul pe două pinioane (al editorului): 10 și 10, cu axele la 8 știfturi, cer 21 de zale; celălalt pinion și distanța
 *   schimbă doar textul, nu piesa; prea aproape, pinioanele s-ar atinge;
 * - pinionul: „Ca LEGO 42529 (14)”, gaura rotundă, STL-ul închis cu raza vârfurilor (R + 1);
 * - „Fă șenila”: zalele și cele două pinioane, în listă.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';

async function atelierSenila(page: Page): Promise<void> {
  await page.setContent(paginiPlanificator().preview);
  await page.locator('[data-mod="3d"]').first().click();
  await page.locator('#at-tipuri [data-fila="roti"]').click();
  await page.locator('#at-galerie [data-piesa="senila"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Zală de șenilă');
}
async function seteaza(page: Page, sel: string, v: string): Promise<void> {
  await page.locator(sel).fill(v);
  await page.locator(sel).blur();
}

/** Muchiile fără pereche ale unui STL binar și cea mai mare rază față de mijlocul cutiei (pe x, y). */
function citesteStl(stl: Buffer): { triunghiuri: number; rele: number; raza: number } {
  const n = stl.readUInt32LE(80), m = new Map<string, number>(), pts: number[][] = [];
  const v = (o: number) => [0, 1, 2].map((k) => stl.readFloatLE(o + 4 * k));
  for (let i = 0; i < n; i++) {
    const o = 84 + 50 * i + 12, p = [v(o), v(o + 12), v(o + 24)];
    pts.push(...p);
    const s = p.map((q) => q.map((x) => x.toFixed(3)).join(','));
    for (let k = 0; k < 3; k++) { const e = s[k] + '>' + s[(k + 1) % 3]; m.set(e, (m.get(e) ?? 0) + 1); }
  }
  let rele = 0;
  for (const [e, c] of m) { const [a, b] = e.split('>'); if (c !== 1 || m.get(b + '>' + a) !== 1) rele++; }
  // cu bucle, nu cu Math.min(...): sute de mii de puncte nu încap în stivă
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p[0]!); x1 = Math.max(x1, p[0]!); y0 = Math.min(y0, p[1]!); y1 = Math.max(y1, p[1]!); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let raza = 0;
  for (const p of pts) raza = Math.max(raza, Math.hypot(p[0]! - cx, p[1]! - cy));
  return { triunghiuri: n, rele, raza };
}

test('zala de șenilă, ca LEGO 57518: 38,4 × 17,2; montajul pe două pinioane de 10, cu axele la 8 știfturi: 21 de zale', async ({ page }) => {
  await atelierSenila(page);
  await expect(page.locator('#at-cote')).toContainText('38,4 × 17,2 × 8,4');
  const montaj = page.locator('#at-sn-montaj');
  await expect(montaj).toHaveText('Pe pinioanele de 10 și 10, cu axele la 64 mm (8 știfturi), șenila are 21 de zale (252 mm) și rămân 2 mm de joc; întinsă, axele ar sta la 65 mm.');
  // celălalt pinion și distanța sunt ale editorului: montajul se schimbă, piesa nu
  await seteaza(page, '#at-sn-pereche', '14');
  await seteaza(page, '#at-sn-distanta', '10');
  await expect(montaj).toHaveText('Pe pinioanele de 10 și 14, cu axele la 80 mm (10 știfturi), șenila are 26 de zale (312 mm) și rămân 5,6 mm de joc; întinsă, axele ar sta la 82,8 mm.');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Zală de șenilă');
  // prea aproape, pinioanele s-ar atinge
  await seteaza(page, '#at-sn-distanta', '5');
  await expect(montaj).toHaveText('Pinioanele de 10 și 14 s-ar atinge cu axele la 40 mm: depărtează-le.');
  // fără găurile de știft
  await page.locator('#at-sn-gauri [data-v="nu"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Zală de șenilă, fără găuri');
  await expect(page.locator('#at-avert')).toBeHidden();
});

test('pinionul de șenilă „Ca LEGO 42529 (14)”, cu gaură rotundă: STL-ul închis, cu raza vârfurilor', async ({ page }) => {
  await atelierSenila(page);
  await page.locator('#at-sn-piesa [data-v="pinion"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Pinion de șenilă 10');
  await page.locator('#at-sn-repede [data-v="14"]').click();
  await page.locator('#at-sn-gaura [data-v="r"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Pinion de șenilă 14, gaură rotundă');
  await expect(page.locator('#at-sn-montaj')).toContainText('Pe pinioanele de 14 și 10');
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const { triunghiuri, rele, raza } = citesteStl(readFileSync(await (await descarcare).path()));
  expect(triunghiuri).toBeGreaterThan(1_000);
  expect(rele).toBe(0);
  // vârfurile: R + 1, cu R = 6 / sin(π / 14) = 26,96 (42529: 28,28 în afara scobiturilor)
  expect(raza).toBeCloseTo(6 / Math.sin(Math.PI / 14) + 1, 1);
});

test('„Fă șenila”: zalele câte cere montajul și cele două pinioane, în listă, cu zala din editor ca aceeași piesă', async ({ page }) => {
  await atelierSenila(page);
  // zala din editor (montajul schimbat întâi: e doar al editorului), apoi „Fă șenila”: același rând de zale, 1 + 21
  await seteaza(page, '#at-sn-distanta', '9');
  await page.locator('#at-sn-gauri [data-v="da"]').click();
  await page.locator('#at-adauga').click();
  await seteaza(page, '#at-sn-distanta', '8');
  await page.locator('#at-sn-fa').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Zală de șenilă', 'Pinion de șenilă 10']);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['22', '2']);
});
