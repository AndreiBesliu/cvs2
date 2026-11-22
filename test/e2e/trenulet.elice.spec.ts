/**
 * Elicea în atelierul Easy 3Draw (ADR 0282, felia 3.Tq), pe pagina de sine stătătoare a planificatorului (din aceleași surse
 * ca pachetul):
 * - fila nouă „Elice” (familia `propulsie`): elicea implicită (3 palete, Ø72, pasul 0,7, răsucită), cu numele, cotele și
 *   textul (pasul 50 mm; 63° lângă butuc, 13° la vârf; consola la vârf 0,9 mm pe strat);
 * - „Ca LEGO 15790” (cotele din LDraw): Ø83,3, paleta plată la 14°, gaura rotundă; cu 4 palete, STL-ul închis, cu raza 41,65;
 * - un câmp în afara plajei nu schimbă piesa;
 * - „Fă perechea”: aceeași elice, pe dreapta și pe stânga, în listă.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';

async function atelierElice(page: Page): Promise<void> {
  await page.setContent(paginiPlanificator().preview);
  await page.locator('[data-mod="3d"]').first().click();
  await page.locator('#at-tipuri [data-fila="propulsie"]').click();
  await expect(page.locator('#at-galerie [data-piesa="elice"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø72 cu 3 palete, pasul 0,7');
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
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p[0]!); x1 = Math.max(x1, p[0]!); y0 = Math.min(y0, p[1]!); y1 = Math.max(y1, p[1]!); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let raza = 0;
  for (const p of pts) raza = Math.max(raza, Math.hypot(p[0]! - cx, p[1]! - cy));
  return { triunghiuri: n, rele, raza };
}

test('elicea implicită, în fila Elice: 3 palete, Ø72, pasul 0,7, răsucită; textul cu pasul, unghiurile și consola', async ({ page }) => {
  await atelierElice(page);
  await expect(page.locator('#at-tipuri [data-fila="propulsie"]')).toHaveText('Elice 1');
  // pe hârtie: P = 0,7 · 72 = 50,4; atan(50,4 / 8π) = 63,498° la butuc (63, la grad); atan(0,7 / π) = 12,56° la vârf;
  // 0,2 / tan 12,56° = 0,898
  await expect(page.locator('#at-el-info')).toHaveText('Pasul 50 mm (0,7 × diametrul). Paleta răsucită: 63° lângă butuc, 13° la vârf. Se tipărește fără suport: la vârf, un strat iese cu 0,9 mm peste cel de dedesubt.');
  await expect(page.locator('#at-cote')).toContainText('× 8 mm');
  await expect(page.locator('#at-avert')).toBeHidden();
  // un câmp în afara plajei nu schimbă piesa
  await seteaza(page, '#at-el-palete', '12');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø72 cu 3 palete, pasul 0,7');
  await seteaza(page, '#at-el-diam', '250');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø72 cu 3 palete, pasul 0,7');
});

test('„Ca LEGO 15790”: Ø83,3, paleta plată la 14°, gaura rotundă; cu 4 palete, STL-ul închis, cu raza 41,65', async ({ page }) => {
  await atelierElice(page);
  await page.locator('#at-el-repede [data-v="15790"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø83,3 cu 3 palete, pasul 0,55, plată, gaură rotundă');
  await expect(page.locator('#at-el-repede [data-v="15790"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#at-el-info')).toContainText('Paleta plată, la 14° de la butuc la vârf, ca la LEGO.');
  // cu 4 palete, cutia e simetrică față de butuc: raza cea mai mare, 83,3 / 2
  await seteaza(page, '#at-el-palete', '4');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø83,3 cu 4 palete, pasul 0,55, plată, gaură rotundă');
  await expect(page.locator('#at-el-repede [data-v="15790"]')).toHaveAttribute('aria-pressed', 'false');
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const { triunghiuri, rele, raza } = citesteStl(readFileSync(await (await descarcare).path()));
  expect(triunghiuri).toBeGreaterThan(3_000);
  expect(rele).toBe(0);
  expect(raza).toBeCloseTo(83.3 / 2, 1);
});

test('„Fă perechea”: aceeași elice, pe dreapta și pe stânga, în listă; elicea din editor e același rând cu cea dreaptă', async ({ page }) => {
  await atelierElice(page);
  await page.locator('#at-el-con [data-v="da"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø72 cu 3 palete, pasul 0,7, cu con');
  await page.locator('#at-adauga').click();
  await page.locator('#at-el-pereche').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Elice Ø72 cu 3 palete, pasul 0,7, cu con', 'Elice Ø72 cu 3 palete, pasul 0,7, stânga, cu con']);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['2', '1']);
});
