/**
 * Conica dublă în atelierul Easy 3Draw (ADR 0280, felia 3.Tn), pe pagina de sine stătătoare a planificatorului (din aceleași
 * surse ca pachetul):
 * - tipul nou, în galeria pieselor de legătură: „Conică dublă 12”, ca LEGO 32270, 14 × 14 × 8;
 * - montajul cu perechea ei: pe axe paralele (12 cu 12: 12 mm, la jumătate de pas) și la 90° (planul de mijloc la 8 mm de axul
 *   perechii, 1 pas); „Repede” 20, cu perechea de 12: 16 mm pe axe paralele, 8 și 12 la 90°;
 * - conica dublă de 36, cu gaură rotundă: STL-ul descărcat închis, cu raza capului (19); „Fă perechea” pune în listă ambele, cu
 *   cotele lor;
 * - la 8 dinți gaura nu încape: avertismentul piesei.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';

async function atelierDubla(page: Page): Promise<void> {
  await page.setContent(paginiPlanificator().preview);
  await page.locator('[data-mod="3d"]').first().click();
  await page.locator('#at-tipuri [data-tip="legaturi"]').click();
  await page.locator('#at-leg [data-leg="conicaDubla"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Conică dublă 12');
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

test('conica dublă ca LEGO 12 (32270): 14 × 14 × 8, montajul cu perechea pe axe paralele și la 90°; „Repede” 20', async ({ page }) => {
  await atelierDubla(page);
  await expect(page.locator('#at-cote')).toContainText('14 × 14 × 8 mm');
  const montaj = page.locator('#at-cd-montaj');
  await expect(montaj).toHaveText('Pe axe paralele, axele la 12 mm, la jumătate de pas. La 90°, cu axele întâlnite: planul de mijloc al acesteia la 8 mm de axul perechii, pe grilă (1 pas); al perechii, la 8 mm de axul acesteia, pe grilă (1 pas).');
  await page.locator('#at-cd-repede [data-v="20"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Conică dublă 20');
  await expect(page.locator('#at-cote')).toContainText('22 × 22 × 8 mm');
  await expect(montaj).toHaveText('Pe axe paralele, axele la 16 mm, pe grilă (2 pași). La 90°, cu axele întâlnite: planul de mijloc al acesteia la 8 mm de axul perechii, pe grilă (1 pas); al perechii, la 12 mm de axul acesteia, la jumătate de pas.');
  // perechea, de 20: pe axe paralele la 20 mm (2,5 pași), la 90° amândouă la 12 mm; piesa nu se schimbă
  await seteaza(page, '#at-cd-pereche', '20');
  await expect(montaj).toHaveText('Pe axe paralele, axele la 20 mm, la jumătate de pas. La 90°, cu axele întâlnite: planul de mijloc al acesteia la 12 mm de axul perechii, la jumătate de pas; al perechii, la 12 mm de axul acesteia, la jumătate de pas.');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Conică dublă 20');
  await expect(page.locator('#at-avert')).toBeHidden();
  // perechea e doar a editorului: aceeași roată, refăcută și adăugată cu altă pereche, e aceeași piesă în listă (schimbarea
  // perechii singură nu reface piesa, deci „Repede” 20, din nou, o reface înainte de fiecare adăugare)
  await page.locator('#at-cd-repede [data-v="20"]').click();
  await page.locator('#at-adauga').click();
  await seteaza(page, '#at-cd-pereche', '12');
  await page.locator('#at-cd-repede [data-v="20"]').click();
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr[data-id]')).toHaveCount(1);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText('2');
});

test('conica dublă de 36, cu gaură rotundă: STL-ul închis, cu raza capului; „Fă perechea” cu una de 12', async ({ page }) => {
  await atelierDubla(page);
  await seteaza(page, '#at-cd-dinti', '36');
  await page.locator('#at-cd-gaura [data-v="r"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Conică dublă 36, gaură rotundă');
  await expect(page.locator('#at-cd-montaj')).toContainText('al perechii, la 20 mm de axul acesteia, la jumătate de pas');
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const { triunghiuri, rele, raza } = citesteStl(readFileSync(await (await descarcare).path()));
  expect(triunghiuri).toBeGreaterThan(10_000);
  expect(rele).toBe(0);
  // capul dinților, în banda de mijloc: r_p + m = 19
  expect(raza).toBeCloseTo(19, 1);
  await page.locator('#at-cd-fa-pereche').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Conică dublă 36, gaură rotundă', 'Conică dublă 12, gaură rotundă']);
  await expect(page.locator('#at-lista tr td:nth-child(2)')).toHaveText(['38 × 38 × 8', '14 × 14 × 8']);
});

test('la 8 dinți gaura nu încape: piesa o spune și iese fără gaură', async ({ page }) => {
  await atelierDubla(page);
  await seteaza(page, '#at-cd-dinti', '8');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Conică dublă 8');
  await expect(page.locator('#at-avert')).toHaveText('Gaura nu încape în conica asta dublă: am făcut-o fără gaură. Alege mai mulți dinți sau un modul mai mare.');
});
