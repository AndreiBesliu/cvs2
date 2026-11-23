/**
 * Roata conică în atelierul Easy 3Draw (ADR 0280, felia 3.Tl), pe pagina de sine stătătoare a planificatorului (din aceleași
 * surse ca pachetul):
 * - tipul nou, în fila Roți (ADR 0281): „Roată conică 20 pentru 20, gaură rotundă”, ca LEGO 87407, 21,4 × 21,4 × 7,7;
 * - montajul pe grilă: fața din spate la 12 mm de axa perechii (la jumătate de pas); „Ca LEGO 12”: la 8 mm (1 pas);
 * - roata de 36 pentru 12: numele, montajul ei și al perechii, STL-ul descărcat închis, cu raza cerută; „Fă perechea” pune în
 *   listă roata și perechea ei, cu dinții schimbați între ele.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

async function atelierConica(page: Page): Promise<void> {
  await threeDinPachet(page);
  await page.setContent(paginiPlanificator().preview);
  await intraIn3D(page);
  await page.locator('#at-tipuri [data-fila="roti"]').click();
  await page.locator('#at-galerie [data-piesa="conica"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată conică 20 pentru 20, gaură rotundă');
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

test('conica ca LEGO 20 (87407): 21,4 × 21,4 × 7,7, cu fața din spate la 12 mm de axa perechii; „Ca LEGO 12”, la 8 mm', async ({ page }) => {
  await atelierConica(page);
  await expect(page.locator('#at-cote')).toContainText('21,4 × 21,4 × 7,7 mm');
  const montaj = page.locator('#at-co-montaj');
  await expect(montaj).toHaveText('Axele se întâlnesc în vârful conurilor. Fața din spate a acesteia e la 12 mm de axa perechii, la jumătate de pas; a perechii, la 12 mm de axa acesteia, la jumătate de pas.');
  await page.locator('#at-co-lego12').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată conică 12 pentru 12, butuc scurt');
  await expect(montaj).toContainText('la 8 mm de axa perechii, pe grilă (1 pas)');
  await page.locator('#at-co-butuc [data-v="lung"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată conică 12 pentru 12');
  await page.locator('#at-co-lego20').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată conică 20 pentru 20, gaură rotundă');
});

test('conica de 36 pentru 12: montajul ei și al perechii, STL-ul închis, „Fă perechea” cu dinții schimbați', async ({ page }) => {
  await atelierConica(page);
  await seteaza(page, '#at-co-dinti', '36');
  await seteaza(page, '#at-co-pereche', '12');
  await page.locator('#at-co-gaura [data-v="x"]').click();
  await page.locator('#at-co-butuc [data-v="scurt"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată conică 36 pentru 12, butuc scurt');
  await expect(page.locator('#at-co-montaj')).toContainText('la 8 mm de axa perechii, pe grilă (1 pas); a perechii, la 20 mm de axa acesteia, la jumătate de pas');
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const { triunghiuri, rele, raza } = citesteStl(readFileSync(await (await descarcare).path()));
  expect(triunghiuri).toBeGreaterThan(5_000);
  expect(rele).toBe(0);
  // capul din spate: 18 + cos δ, cu tan δ = 36 / 12
  expect(raza).toBeCloseTo(18 + Math.cos(Math.atan2(36, 12)), 1);
  await page.locator('#at-co-fa-pereche').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Roată conică 36 pentru 12, butuc scurt', 'Roată conică 12 pentru 36, butuc scurt']);
});
