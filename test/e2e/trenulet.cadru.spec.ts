/**
 * Cadrul (fereastra) în atelierul Easy 3Draw (ADR 0284, felia 3.Cj), pe pagina de sine stătătoare a planificatorului (din
 * aceleași surse ca pachetul):
 * - piesa nouă din fila Cărămizi: cadrul 1 × 4 × 3, cu golul și puntea de sus scrise;
 * - configuratorul: lungimea, înălțimea, rama, mărimile uzuale și colțurile de sus ale golului, cu numele și cotele de pe
 *   hârtie; un număr din afara marginilor nu e primit;
 * - STL-ul descărcat e închis și are cotele de pe hârtie; piesa intră în listă, pe nume; „Se prinde cu” o leagă de cărămidă.
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
  await page.locator('#at-galerie [data-piesa="cadru"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Cadru 1×4×3');
}
const nume = (page: Page) => page.locator('#at-nume-piesa');
const cote = (page: Page) => page.locator('#at-cote');
const info = (page: Page) => page.locator('#at-cad-info');
const apasat = (page: Page, id: string) => page.locator(`#${id} [aria-pressed="true"]`);
async function scrie(page: Page, id: string, v: string): Promise<void> {
  await page.locator(id).fill(v);
  await page.locator(id).press('Tab');
}
/** Muchiile fără pereche ale unui STL binar și cutia lui. */
function citesteStl(stl: Buffer): { rele: number; dim: number[] } {
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
  return { rele, dim: hi.map((x, k) => Math.round((x - lo[k]!) * 100) / 100) };
}

test('piesa nouă din fila Cărămizi: cadrul 1 × 4 × 3, cu golul de 28,6 × 22,4 mm și puntea de sus', async ({ page }) => {
  await atelier(page);
  await expect(page.locator('#at-tipuri [data-fila="caramizi"]')).toHaveText('Cărămizi 13');
  // 4 · 8 − 0,2 pe lung, 7,8 pe lat, 3 cărămizi (28,8) și știftul (1,9)
  await expect(cote(page)).toContainText('31,8 × 7,8 × 30,7 mm');
  await expect(page.locator('#at-avert')).toBeHidden();
  await expect(page.locator('#at-editor h2')).toHaveText('Cadru (fereastră)');
  await expect(page.locator('#at-cad-lung')).toHaveValue('4');
  await expect(page.locator('#at-cad-inalt')).toHaveValue('3');
  await expect(page.locator('#at-cad-rama')).toHaveValue('1.6');
  await expect(page.locator('#at-cad-repede button')).toHaveText(['1×2×2', '1×2×3', '1×4×3', '1×4×5', '1×4×6']);
  await expect(apasat(page, 'at-cad-repede')).toHaveText('1×4×3');
  await expect(page.locator('#at-cad-colturi button')).toHaveText(['Colțuri drepte', 'Colțuri teșite']);
  await expect(apasat(page, 'at-cad-colturi')).toHaveText('Colțuri drepte');
  // golul: 31,8 − 2 · 1,6 pe lat; 28,8 − 2 · 3,2 pe înalt (fără prag și fără buiandrug)
  await expect(info(page)).toHaveText('Golul are 28,6 × 22,4 mm. Puntea de sus, de 28,6 mm, se tipărește în aer.');
});

test('configuratorul: lungimea, înălțimea, rama, mărimile uzuale și colțurile, cu numele și cotele de pe hârtie', async ({ page }) => {
  await atelier(page);
  // colțurile teșite: teșitura (28,6 − 8) / 2 = 10,3 lasă o punte de un știft
  await page.locator('#at-cad-colturi [data-v="tesite"]').click();
  await expect(apasat(page, 'at-cad-colturi')).toHaveText('Colțuri teșite');
  await expect(nume(page)).toHaveText('Cadru 1×4×3, colțuri teșite');
  await expect(info(page)).toHaveText('Golul are 28,6 × 22,4 mm. Puntea de sus, de 8 mm, se tipărește în aer. Colțurile de sus sunt teșite cu 10,3 mm.');
  await expect(cote(page)).toContainText('31,8 × 7,8 × 30,7 mm');
  // repede, fereastra 1 × 2 × 2: golul 15,8 − 3,2 pe 19,2 − 6,4; teșitura (12,6 − 8) / 2
  await page.locator('#at-cad-repede [data-v="2x2"]').click();
  await expect(apasat(page, 'at-cad-repede')).toHaveText('1×2×2');
  await expect(page.locator('#at-cad-lung')).toHaveValue('2');
  await expect(page.locator('#at-cad-inalt')).toHaveValue('2');
  await expect(nume(page)).toHaveText('Cadru 1×2×2, colțuri teșite');
  await expect(cote(page)).toContainText('15,8 × 7,8 × 21,1 mm');
  await expect(info(page)).toHaveText('Golul are 12,6 × 12,8 mm. Puntea de sus, de 8 mm, se tipărește în aer. Colțurile de sus sunt teșite cu 2,3 mm.');
  // rama de 4: golul rămâne de 7,8, sub un știft, deci n-are ce teși
  await scrie(page, '#at-cad-rama', '4');
  await expect(nume(page)).toHaveText('Cadru 1×2×2, rama 4 mm, colțuri teșite');
  await expect(info(page)).toHaveText('Golul are 7,8 × 12,8 mm. Puntea de sus, de 7,8 mm, se tipărește în aer.');
  // poarta 1 × 8 × 6, dreaptă: puntea de 55,8 mm e prea lungă, și textul o spune
  await page.locator('#at-cad-colturi [data-v="drepte"]').click();
  await scrie(page, '#at-cad-lung', '8');
  await scrie(page, '#at-cad-inalt', '6');
  await expect(apasat(page, 'at-cad-repede')).toHaveCount(0);
  await expect(apasat(page, 'at-cad-colturi')).toHaveText('Colțuri drepte');
  await expect(nume(page)).toHaveText('Cadru 1×8×6, rama 4 mm');
  await expect(cote(page)).toContainText('63,8 × 7,8 × 59,5 mm');
  await expect(info(page)).toHaveText('Golul are 55,8 × 51,2 mm. Puntea de sus, de 55,8 mm, se tipărește în aer. Peste 40 mm, puntea se poate lăsa la tipărire: alege colțurile teșite sau un cadru mai scurt.');
  // rama cu zecimale, rotunjită la zecimi
  await scrie(page, '#at-cad-rama', '2.06');
  await expect(page.locator('#at-cad-rama')).toHaveValue('2.1');
  await expect(nume(page)).toHaveText('Cadru 1×8×6, rama 2,1 mm');
  // în afara marginilor, valoarea de dinainte rămâne (de la valori din mijlocul plajei: un număr adus la margine s-ar vedea)
  await scrie(page, '#at-cad-lung', '5');
  await scrie(page, '#at-cad-inalt', '4');
  for (const [id, rau, bun] of [['#at-cad-lung', '1', '5'], ['#at-cad-lung', '9', '5'], ['#at-cad-inalt', '1', '4'], ['#at-cad-inalt', '7', '4'], ['#at-cad-rama', '1.1', '2.1'], ['#at-cad-rama', '4.1', '2.1']] as const) {
    await scrie(page, id, rau);
    await expect(page.locator(id), `${id} ${rau}`).toHaveValue(bun);
  }
  await expect(nume(page)).toHaveText('Cadru 1×5×4, rama 2,1 mm');
  // marginile înseși sunt primite
  await scrie(page, '#at-cad-lung', '2');
  await scrie(page, '#at-cad-inalt', '2');
  await scrie(page, '#at-cad-rama', '1.2');
  await expect(nume(page)).toHaveText('Cadru 1×2×2, rama 1,2 mm');
  // mărimea uzuală se vede apăsată doar când se potrivesc și lungimea, și înălțimea
  await expect(apasat(page, 'at-cad-repede')).toHaveText('1×2×2');
  await scrie(page, '#at-cad-inalt', '4');
  await expect(nume(page)).toHaveText('Cadru 1×2×4, rama 1,2 mm');
  await expect(apasat(page, 'at-cad-repede')).toHaveCount(0);
  await scrie(page, '#at-cad-lung', '8');
  await scrie(page, '#at-cad-inalt', '6');
  await scrie(page, '#at-cad-rama', '4');
  await expect(nume(page)).toHaveText('Cadru 1×8×6, rama 4 mm');
  await scrie(page, '#at-cad-rama', '1.6');
  await expect(nume(page)).toHaveText('Cadru 1×8×6');
  await expect(page.locator('#at-avert')).toBeHidden();
});

test('STL-ul cadrului e închis și are cotele de pe hârtie; piesa intră în listă, pe nume; „Se prinde cu” o leagă de cărămidă', async ({ page }) => {
  await atelier(page);
  await page.locator('#at-cad-repede [data-v="4x5"]').click();
  await page.locator('#at-cad-colturi [data-v="tesite"]').click();
  await expect(nume(page)).toHaveText('Cadru 1×4×5, colțuri teșite');
  const [d] = await Promise.all([page.waitForEvent('download'), page.locator('#at-stl').click()]);
  const stl = citesteStl(readFileSync(await d.path()));
  expect(stl.rele).toBe(0);
  // 5 cărămizi (48) și știftul (1,9)
  expect(stl.dim).toEqual([31.8, 7.8, 49.9]);
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-toast')).toHaveText('1 × Cadru 1×4×5, colțuri teșite în listă.');
  await expect(page.locator('#at-lista')).toContainText('Cadru 1×4×5, colțuri teșite');
  // prinderile: patru știfturi sus, patru locașuri jos; cărămida de pe știfturile lui îl propune înapoi
  await expect(page.locator('#at-prinde-are')).toHaveText('4 știfturi · 4 locașuri');
  await page.locator('#at-prinde summary').click();
  await expect(page.locator('#at-prinde-lista [data-prinde="cadru"]')).toHaveCount(0);
  await page.locator('#at-prinde-lista [data-rand="stift"] [data-prinde="caramida"]').click();
  await expect(page.locator('#at-editor h2').first()).toHaveText('Forma, pe grila de știfturi');
  await expect(page.locator('#at-prinde-lista [data-rand="stift"] [data-prinde="cadru"]')).toHaveText('Cadru / fereastră');
  await expect(page.locator('#at-prinde-lista [data-rand="locas"] [data-prinde="cadru"]')).toHaveText('Cadru / fereastră');
});
