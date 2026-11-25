/**
 * Arcul în atelierul Easy 3Draw (ADR 0284, felia 3.Cd), pe pagina de sine stătătoare a planificatorului (din aceleași
 * surse ca pachetul):
 * - piesa nouă din fila Cărămizi: arcul 1 × 4 (31,8 × 7,8 × 11,5 mm cu știfturile), cu cotele bolții scrise;
 * - configuratorul: lungimea, înălțimea în cărămizi, bolta înaltă sau joasă și mărimile uzuale („Repede”), cu numele și
 *   cotele de pe hârtie; un număr din afara marginilor nu e primit;
 * - STL-ul descărcat e închis și are cotele de pe hârtie; piesa intră în listă, pe nume.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

async function atelier(page: Page): Promise<void> {
  await threeDinPachet(page);
  await page.setContent(paginiPlanificator().preview);
  await intraIn3D(page);
  await page.locator('#at-tipuri [data-fila="caramizi"]').click();
  await page.locator('#at-galerie [data-piesa="arc"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Arc 1×4');
}
const nume = (page: Page) => page.locator('#at-nume-piesa');
const cote = (page: Page) => page.locator('#at-cote');
const bolta = (page: Page) => page.locator('#at-arc-cote');
const apasat = (page: Page, id: string) => page.locator(`#${id} [aria-pressed="true"]`);
async function scrie(page: Page, id: string, v: string): Promise<void> {
  await page.locator(id).fill(v);
  await page.locator(id).press('Tab');
}

/** Muchiile fără pereche ale unui STL binar și cutia lui. */
function citesteStl(stl: Buffer): { triunghiuri: number; rele: number; dim: number[] } {
  const n = stl.readUInt32LE(80), m = new Map<string, number>(), lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const v = (o: number) => [0, 1, 2].map((k) => stl.readFloatLE(o + 4 * k));
  for (let i = 0; i < n; i++) {
    const o = 84 + 50 * i + 12, p = [v(o), v(o + 12), v(o + 24)];
    for (const q of p) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k]!, q[k]!); hi[k] = Math.max(hi[k]!, q[k]!); }
    const s = p.map((q) => q.map((x) => x.toFixed(3)).join(','));
    for (let k = 0; k < 3; k++) { const e = s[k] + '>' + s[(k + 1) % 3]; m.set(e, (m.get(e) ?? 0) + 1); }
  }
  let rele = 0;
  for (const [e, c] of m) { const [a, b] = e.split('>'); if (c !== 1 || m.get(b + '>' + a) !== 1) rele++; }
  return { triunghiuri: n, rele, dim: hi.map((x, k) => Math.round((x - lo[k]!) * 100) / 100) };
}

test('piesa nouă din fila Cărămizi: arcul 1 × 4, cu bolta de 8 mm peste două știfturi', async ({ page }) => {
  await atelier(page);
  // 9,6 mm cărămida și 1,9 mm știfturile
  await expect(cote(page)).toContainText('31,8 × 7,8 × 11,5 mm');
  await expect(page.locator('#at-avert')).toBeHidden();
  await expect(page.locator('#at-arc-lung')).toHaveValue('4');
  await expect(page.locator('#at-arc-inalt')).toHaveValue('1');
  await expect(apasat(page, 'at-arc-bolta')).toHaveText('Înaltă');
  await expect(apasat(page, 'at-arc-repede')).toHaveText('1×4');
  await expect(page.locator('#at-arc-repede button')).toHaveText(['1×3', '1×4', '1×6', '1×6×2', '1×8×2', '1×12×3']);
  // pe hârtie: deschiderea 2 · 8 + 0,2; bolta urcă min(8,1; 9,6 − 1,6) = 8
  await expect(bolta(page)).toHaveText('Deschiderea: 16,2 mm (2 știfturi). Bolta urcă 8 mm; deasupra ei rămân 1,6 mm.');
});

test('configuratorul: lungimea, înălțimea, bolta și mărimile uzuale, cu numele și cotele de pe hârtie', async ({ page }) => {
  await atelier(page);
  // mărimile uzuale: numele ca la arcele LEGO, cu cotele bolții
  const uzuale: readonly (readonly [string, string, string, string])[] = [
    ['3x1', 'Arc 1×3', '23,8 × 7,8 × 11,5 mm', 'Deschiderea: 8,2 mm (1 știft). Bolta urcă 4,1 mm; deasupra ei rămân 5,5 mm.'],
    ['6x1', 'Arc 1×6', '47,8 × 7,8 × 11,5 mm', 'Deschiderea: 32,2 mm (4 știfturi). Bolta urcă 8 mm; deasupra ei rămân 1,6 mm.'],
    ['6x2', 'Arc 1×6×2', '47,8 × 7,8 × 21,1 mm', 'Deschiderea: 32,2 mm (4 știfturi). Bolta urcă 16,1 mm; deasupra ei rămân 3,1 mm.'],
    ['8x2', 'Arc 1×8×2', '63,8 × 7,8 × 21,1 mm', 'Deschiderea: 48,2 mm (6 știfturi). Bolta urcă 17,6 mm; deasupra ei rămân 1,6 mm.'],
    ['12x3', 'Arc 1×12×3', '95,8 × 7,8 × 30,7 mm', 'Deschiderea: 80,2 mm (10 știfturi). Bolta urcă 27,2 mm; deasupra ei rămân 1,6 mm.'],
    ['4x1', 'Arc 1×4', '31,8 × 7,8 × 11,5 mm', 'Deschiderea: 16,2 mm (2 știfturi). Bolta urcă 8 mm; deasupra ei rămân 1,6 mm.'],
  ];
  for (const [k, n, c, b] of uzuale) {
    await page.locator(`#at-arc-repede [data-v="${k}"]`).click();
    await expect(nume(page), k).toHaveText(n);
    await expect(cote(page), k).toContainText(c);
    await expect(bolta(page), k).toHaveText(b);
    await expect(page.locator(`#at-arc-repede [data-v="${k}"]`), k).toHaveAttribute('aria-pressed', 'true');
  }
  // scrise de mână: lungimea 5, înălțimea 2; nicio mărime uzuală apăsată
  await scrie(page, '#at-arc-lung', '5');
  await scrie(page, '#at-arc-inalt', '2');
  await expect(nume(page)).toHaveText('Arc 1×5×2');
  await expect(cote(page)).toContainText('39,8 × 7,8 × 21,1 mm');
  await expect(bolta(page)).toHaveText('Deschiderea: 24,2 mm (3 știfturi). Bolta urcă 12,1 mm; deasupra ei rămân 7,1 mm.');
  await expect(apasat(page, 'at-arc-repede')).toHaveCount(0);
  // bolta joasă urcă pe jumătate (la 1 × 8 × 2: jumătate din 17,6); numele o spune
  await scrie(page, '#at-arc-lung', '8');
  await page.locator('#at-arc-bolta [data-v="joasa"]').click();
  await expect(nume(page)).toHaveText('Arc 1×8×2, boltă joasă');
  await expect(apasat(page, 'at-arc-bolta')).toHaveText('Joasă');
  await expect(bolta(page)).toHaveText('Deschiderea: 48,2 mm (6 știfturi). Bolta urcă 8,8 mm; deasupra ei rămân 10,4 mm.');
  await expect(cote(page)).toContainText('63,8 × 7,8 × 21,1 mm');
  await expect(apasat(page, 'at-arc-repede')).toHaveText('1×8×2');
  // ce e în afara marginilor nu e primit: câmpul se întoarce la ce era
  for (const [id, rau, bun] of [['#at-arc-lung', '2', '8'], ['#at-arc-lung', '17', '8'], ['#at-arc-lung', '', '8'], ['#at-arc-inalt', '0', '2'], ['#at-arc-inalt', '5', '2']] as const) {
    await scrie(page, id, rau);
    await expect(page.locator(id), `${id} „${rau}”`).toHaveValue(bun);
    await expect(nume(page), `${id} „${rau}”`).toHaveText('Arc 1×8×2, boltă joasă');
  }
  // marginile, primite: 3 și 16 știfturi, 1 și 4 cărămizi
  await scrie(page, '#at-arc-lung', '16');
  await scrie(page, '#at-arc-inalt', '4');
  await expect(nume(page)).toHaveText('Arc 1×16×4, boltă joasă');
  await scrie(page, '#at-arc-lung', '3');
  await scrie(page, '#at-arc-inalt', '1');
  await page.locator('#at-arc-bolta [data-v="inalta"]').click();
  await expect(nume(page)).toHaveText('Arc 1×3');
  await expect(page.locator('#at-avert')).toBeHidden();
});

test('STL-ul arcului 1 × 6 × 2 e închis și are cotele de pe hârtie; piesa intră în listă, pe nume, și în model', async ({ page }) => {
  await atelier(page);
  await page.locator('#at-arc-repede [data-v="6x2"]').click();
  await expect(nume(page)).toHaveText('Arc 1×6×2');
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const fisier = await descarcare;
  expect(fisier.suggestedFilename()).toBe('arc_1x6x2.stl');
  const { triunghiuri, rele, dim } = citesteStl(readFileSync(await fisier.path()));
  expect(triunghiuri).toBeGreaterThan(400);
  expect(rele).toBe(0);
  expect(dim).toEqual([47.8, 7.8, 21.1]);
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Arc 1×6×2']);
  await expect(page.locator('#at-lista tr td:nth-child(2)')).toHaveText(['47,8 × 7,8 × 21,1']);
  // bolta joasă e altă piesă; aceeași piesă, din nou, se adună
  await page.locator('#at-arc-bolta [data-v="joasa"]').click();
  await expect(nume(page)).toHaveText('Arc 1×6×2, boltă joasă');
  await page.locator('#at-adauga').click();
  await page.locator('#at-arc-bolta [data-v="inalta"]').click();
  await expect(nume(page)).toHaveText('Arc 1×6×2');
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Arc 1×6×2', 'Arc 1×6×2, boltă joasă']);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['2', '1']);
  await page.locator('#at-in-model').click();
  await expect(page.locator('#at-m-lista li')).toHaveText([/^Arc 1×6×2/]);
});
