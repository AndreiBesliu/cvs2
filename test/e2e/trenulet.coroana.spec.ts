/**
 * Roata coroană în atelierul Easy 3Draw (ADR 0280, felia 3.Tm), pe pagina de sine stătătoare a planificatorului (din aceleași
 * surse ca pachetul):
 * - tipul nou, în fila Roți (ADR 0281): „Roată coroană 24 pentru pinionul de 8”, ca LEGO 3650, 25,8 × 25,8 × 8;
 * - montajul: axul pinionului de 8 la 8 mm deasupra feței de jos (pe grilă, 1 pas), cu butucul lung în calea lui; al celui de
 *   16, la 12 mm (la jumătate de pas), fără butuc în cale;
 * - coroana de 40 pentru 8, cu gaură rotundă: STL-ul descărcat închis, cu raza dinților; „Fă perechea” pune în listă coroana și
 *   pinionul ei (roata dreaptă de 8, cu aceeași gaură);
 * - un pinion care nu se prinde (16, la o coroană de 12): montajul și piesa spun de ce, iar perechea nu intră în listă.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';

async function atelierCoroana(page: Page): Promise<void> {
  await page.setContent(paginiPlanificator().preview);
  await page.locator('[data-mod="3d"]').first().click();
  await page.locator('#at-tipuri [data-fila="roti"]').click();
  await page.locator('#at-galerie [data-piesa="coroana"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată coroană 24 pentru pinionul de 8');
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

test('coroana ca LEGO 24 (3650): 25,8 × 25,8 × 8, axul pinionului de 8 la 8 mm, cu butucul în cale; al celui de 16, la 12', async ({ page }) => {
  await atelierCoroana(page);
  await expect(page.locator('#at-cote')).toContainText('25,8 × 25,8 × 8 mm');
  const montaj = page.locator('#at-cr-montaj');
  await expect(montaj).toHaveText('Axul pinionului trece la 8 mm deasupra feței de jos a coroanei, pe grilă (1 pas), și întâlnește axul ei la 90°: unul dintre ele se oprește înaintea celuilalt. Pinionul, gros de cel puțin 3,8 mm, stă în dreptul dinților coroanei: de la 10,5 la 12,9 mm de axul ei, cu mijlocul la 11,7 mm. Butucul lung urcă până la 8 mm, în calea axului pinionului: acela se oprește înaintea butucului.');
  await page.locator('#at-cr-repede [data-v="16"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată coroană 24 pentru pinionul de 16');
  await expect(montaj).toContainText('la 12 mm deasupra feței de jos a coroanei, la jumătate de pas');
  await expect(montaj).not.toContainText('Butucul lung');
  await page.locator('#at-cr-butuc [data-v="scurt"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată coroană 24 pentru pinionul de 16, butuc scurt');
  await expect(page.locator('#at-cote')).toContainText('25,2 × 25,2 × 5 mm');
  await page.locator('#at-cr-lego').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată coroană 24 pentru pinionul de 8');
  await expect(page.locator('#at-avert')).toBeHidden();
});

test('coroana de 40 pentru pinionul de 8, cu gaură rotundă: STL-ul închis, cu raza dinților; „Fă perechea” cu pinionul ei', async ({ page }) => {
  await atelierCoroana(page);
  await seteaza(page, '#at-cr-dinti', '40');
  await page.locator('#at-cr-gaura [data-v="r"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată coroană 40 pentru pinionul de 8, gaură rotundă');
  await expect(page.locator('#at-cr-montaj')).toContainText('de la 17,5 la 21,4 mm de axul ei');
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const { triunghiuri, rele, raza } = citesteStl(readFileSync(await (await descarcare).path()));
  expect(triunghiuri).toBeGreaterThan(10_000);
  expect(rele).toBe(0);
  // discul se termină la capătul dinafară al dinților
  expect(raza).toBeCloseTo(21.4, 1);
  await page.locator('#at-cr-fa-pereche').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Roată coroană 40 pentru pinionul de 8, gaură rotundă', 'Roată dințată 8, gaură rotundă']);
  // pinionul, cât de gros îl cere coroana: dinții ei de la 17,5 la 21,4, plus 0,3 de fiecare parte
  await expect(page.locator('#at-lista tr td:nth-child(2)')).toHaveText(['42,8 × 42,8 × 8', '10 × 10 × 4,5']);
});

test('un pinion care nu se prinde (16, la o coroană de 12): montajul și piesa spun de ce, perechea nu intră în listă', async ({ page }) => {
  await atelierCoroana(page);
  await seteaza(page, '#at-cr-dinti', '12');
  await page.locator('#at-cr-repede [data-v="16"]').click();
  const motiv = 'Pinionul de 16 nu se prinde cu o coroană de 12: alege o coroană mai mare.';
  await expect(page.locator('#at-cr-montaj')).toHaveText(motiv);
  await expect(page.locator('#at-avert')).toHaveText(`Nu am putut face piesa: ${motiv}`);
  await page.locator('#at-cr-fa-pereche').click();
  await expect(page.locator('#at-toast')).toHaveText(motiv);
  await expect(page.locator('#at-lista tr[data-id]')).toHaveCount(0);
});
