/**
 * Fulia în atelierul Easy 3Draw (ADR 0280, felia 3.Tk), pe pagina de sine stătătoare a planificatorului (din aceleași surse
 * ca pachetul):
 * - tipul nou, în fila Roți (ADR 0281): „Fulie Ø 24 × 3,5”, ca LEGO 4185, cu găurile de știft, 24 × 24 × 4 mm;
 * - cureaua spre a doua fulie, pe fundul canalelor: pe grilă, la jumătate de pas, fuliile care s-ar atinge;
 * - canalul plat lărgește obada (7,2) și lasă fața plină, cu diametrul de la care încap găurile de știft; „Ca LEGO Ø24”;
 * - fulia mare cu spițe în Y: STL-ul descărcat închis, cu raza cerută; „Fă perechea” pune ambele fulii în listă.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';

async function atelierFulie(page: Page): Promise<void> {
  await page.setContent(paginiPlanificator().preview);
  await page.locator('[data-mod="3d"]').first().click();
  await page.locator('#at-tipuri [data-fila="roti"]').click();
  await page.locator('#at-galerie [data-piesa="fulie"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Fulie Ø 24 × 3,5');
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
  const xs = pts.map((p) => p[0]!), ys = pts.map((p) => p[1]!);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return { triunghiuri: n, rele, raza: Math.max(...pts.map((p) => Math.hypot(p[0]! - cx, p[1]! - cy))) };
}

test('fulia ca LEGO: găurile de știft, 24 × 24 × 4; cureaua pe grilă, la jumătate de pas și fuliile care s-ar atinge', async ({ page }) => {
  await atelierFulie(page);
  await expect(page.locator('#at-cote')).toContainText('24 × 24 × 4 mm');
  await expect(page.locator('#at-fu-spite [data-v="stift"]')).toHaveAttribute('aria-pressed', 'true');
  const curea = page.locator('#at-fu-curea');
  // două fulii LEGO, cu fundul canalului la r 11, la 32 mm: 64 + 22π = 133,1
  await expect(curea).toHaveText('Cureaua: 133,1 mm pe fundul canalelor, cu axele la 32 mm, pe grilă (4 pași). Un elastic se alege puțin mai scurt, ca să stea întins.');
  await page.locator('#at-fu-grila [data-v="48"]').click();
  await expect(curea).toContainText('Cureaua: 165,1 mm pe fundul canalelor, cu axele la 48 mm, pe grilă (6 pași).');
  await seteaza(page, '#at-fu-dist', '36');
  await expect(curea).toContainText('Cureaua: 141,1 mm pe fundul canalelor, cu axele la 36 mm, la jumătate de pas.');
  await seteaza(page, '#at-fu-dist', '20');
  await expect(curea).toHaveText('Fuliile s-ar atinge: axele trebuie să fie la cel puțin 24,5 mm.');
});

test('canalul plat lărgește obada și lasă fața plină; canalul rotund; „Ca LEGO Ø24” aduce fulia LEGO', async ({ page }) => {
  await atelierFulie(page);
  await page.locator('#at-fu-canal [data-v="plat"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Fulie Ø 24 × 7,2, curea de 4, plină');
  // obada s-a lărgit odată cu canalul, deci motorul nu mai are ce să spună
  await expect(page.locator('#at-avert')).toBeHidden();
  await expect(page.locator('#at-cote')).toContainText('24 × 24 × 7,7 mm');
  await expect(page.locator('label[for="at-fu-latc"]')).toContainText('Cureaua (mm)');
  await expect(page.locator('#at-fu-spite [data-v]')).toHaveCount(3);
  await expect(page.locator('#at-fu-spite [data-v="stift"]')).toHaveCount(0);
  await expect(page.locator('#at-fu-stift-de-la')).toHaveText('găurile de știft încap de la Ø 24,4 mm');
  await page.locator('#at-fu-canal [data-v="rotund"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Fulie Ø 24 × 7,2, canal rotund');
  await expect(page.locator('#at-fu-spite [data-v="stift"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#at-fu-lego').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Fulie Ø 24 × 3,5');
  await expect(page.locator('#at-cote')).toContainText('24 × 24 × 4 mm');
});

test('fulia mare cu spițe în Y: STL-ul descărcat închis, cu raza cerută; „Fă perechea” pune ambele fulii', async ({ page }) => {
  await atelierFulie(page);
  await seteaza(page, '#at-fu-diam', '48');
  await seteaza(page, '#at-fu-lat', '7.5');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Fulie Ø 48 × 7,5');
  await page.locator('#at-fu-spite [data-v="y"]').click();
  await seteaza(page, '#at-fu-nr', '5');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Fulie Ø 48 × 7,5, 5 spițe în Y');
  await expect(page.locator('#at-cote')).toContainText('48 × 48 × 8 mm');
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const { triunghiuri, rele, raza } = citesteStl(readFileSync(await (await descarcare).path()));
  expect(triunghiuri).toBeGreaterThan(2_000);
  expect(rele).toBe(0);
  expect(raza).toBeCloseTo(24, 2);
  // a doua fulie, de Ø24, cu axele la 48: fundurile la r 23 și 11, deci 2·√(48² − 12²) + 34π + 24·asin(1/4) = 205,8
  await seteaza(page, '#at-fu-pereche', '24');
  await page.locator('#at-fu-grila [data-v="48"]').click();
  await expect(page.locator('#at-fu-curea')).toContainText('Cureaua: 205,8 mm pe fundul canalelor, cu axele la 48 mm, pe grilă (6 pași).');
  await page.locator('#at-fu-fa-pereche').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Fulie Ø 48 × 7,5, 5 spițe în Y', 'Fulie Ø 24 × 7,5, 5 spițe în Y']);
});
