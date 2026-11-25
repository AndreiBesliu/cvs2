/**
 * Șurubul melc în atelierul Easy 3Draw (ADR 0284, felia 3.Cj), pe pagina de sine stătătoare a planificatorului (din aceleași
 * surse ca pachetul):
 * - piesa nouă din fila Roți: melcul Ø8 de 2 știfturi, cu cotele lui și cu montajul scris (unde stă axul roții pereche);
 * - configuratorul: diametrul, lungimea și roata pereche (a editorului, nu a piesei), cu numele și cotele de pe hârtie; un
 *   număr din afara marginilor nu e primit;
 * - STL-ul descărcat e închis și are cotele de pe hârtie; „Fă perechea” pune în listă melcul și roata lui; „Se prinde cu”
 *   îl leagă de ax.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

async function atelier(page: Page): Promise<void> {
  await threeDinPachet(page);
  await page.setContent(paginiPlanificator().preview);
  await intraIn3D(page);
  await page.locator('#at-tipuri [data-fila="roti"]').click();
  await page.locator('#at-galerie [data-piesa="melc"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Șurub melc Ø8, lung 2');
}
const nume = (page: Page) => page.locator('#at-nume-piesa');
const cote = (page: Page) => page.locator('#at-cote');
const info = (page: Page) => page.locator('#at-mlc-info');
const montaj = (page: Page) => page.locator('#at-mlc-montaj');
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

test('piesa nouă din fila Roți: melcul Ø8 de 2 știfturi, cu cotele lui și cu montajul roții de 24', async ({ page }) => {
  await atelier(page);
  await expect(page.locator('#at-tipuri [data-fila="roti"]')).toHaveText('Roți 10');
  // Ø8 la divizare, deci Ø10 la vârf; 2 · 8 − 0,2 lungime
  await expect(cote(page)).toContainText('10 × 10 × 15,8 mm');
  await expect(page.locator('#at-avert')).toBeHidden();
  await expect(page.locator('#at-editor h2')).toHaveText('Șurub melc');
  await expect(page.locator('#at-mlc-diam button')).toHaveText(['Ø8 (ca LEGO)', 'Ø16 (gros)']);
  await expect(apasat(page, 'at-mlc-diam')).toHaveText('Ø8 (ca LEGO)');
  await expect(page.locator('#at-mlc-lung')).toHaveValue('2');
  await expect(page.locator('#at-mlc-pereche')).toHaveValue('24');
  // 15,8 / π = 5,03 spire; la Ø8, între colțul crucii (√(2,5² + 1²) = 2,69) și fundul spirei (2,75) rămân 0,06 mm
  await expect(info(page)).toHaveText('Are Ø10 la vârf, Ø5,5 la fundul spirei și 15,8 mm lungime: 5 spire, cu pasul de 3,14 mm. Între colțurile găurii de ax și fundul spirei rămân doar 0,06 mm: piesa o ține spira. Pentru sarcină, alege Ø16.');
  // 8 / 2 + 24 / 2 = 16 mm, adică 2 știfturi
  await expect(montaj(page)).toHaveText('Axul roții de 24 stă la 16 mm de axul melcului, în cruce cu el: pe grila de știfturi, la 2 știfturi. La o tură a melcului, roata înaintează cu un dinte: raportul e 24 : 1.');
});

test('configuratorul: diametrul, lungimea și roata pereche, cu numele, cotele și montajul de pe hârtie', async ({ page }) => {
  await atelier(page);
  // roata pereche e a editorului: numele și piesa rămân
  await scrie(page, '#at-mlc-pereche', '8');
  await expect(montaj(page)).toHaveText('Axul roții de 8 stă la 8 mm de axul melcului, în cruce cu el: pe grila de știfturi, la un știft. La o tură a melcului, roata înaintează cu un dinte: raportul e 8 : 1.');
  await expect(nume(page)).toHaveText('Șurub melc Ø8, lung 2');
  await scrie(page, '#at-mlc-pereche', '16');
  await expect(montaj(page)).toHaveText('Axul roții de 16 stă la 12 mm de axul melcului, în cruce cu el: la jumătatea grilei, la 1,5 știfturi. La o tură a melcului, roata înaintează cu un dinte: raportul e 16 : 1.');
  await scrie(page, '#at-mlc-pereche', '20');
  await expect(montaj(page)).toHaveText('Axul roții de 20 stă la 14 mm de axul melcului, în cruce cu el: în afara grilei de știfturi (pe grilă cad roțile cu dinții din 8 în 8). La o tură a melcului, roata înaintează cu un dinte: raportul e 20 : 1.');
  // melcul gros: Ø16 la divizare, Ø18 la vârf; rămân 6,75 − 2,69 = 4,06 mm de lemn, deci fără fraza peretelui subțire
  await page.locator('#at-mlc-diam [data-v="16"]').click();
  await expect(apasat(page, 'at-mlc-diam')).toHaveText('Ø16 (gros)');
  await expect(nume(page)).toHaveText('Șurub melc Ø16, lung 2');
  await expect(cote(page)).toContainText('18 × 18 × 15,8 mm');
  await expect(info(page)).toHaveText('Are Ø18 la vârf, Ø13,5 la fundul spirei și 15,8 mm lungime: 5 spire, cu pasul de 3,14 mm.');
  // roata pereche rămâne cea aleasă: 16 / 2 + 20 / 2 = 18
  await expect(page.locator('#at-mlc-pereche')).toHaveValue('20');
  await expect(montaj(page)).toContainText('Axul roții de 20 stă la 18 mm de axul melcului');
  await scrie(page, '#at-mlc-pereche', '40');
  await expect(montaj(page)).toHaveText('Axul roții de 40 stă la 28 mm de axul melcului, în cruce cu el: la jumătatea grilei, la 3,5 știfturi. La o tură a melcului, roata înaintează cu un dinte: raportul e 40 : 1.');
  // lungimea: 4 · 8 − 0,2 = 31,8 (10,1 spire); un știft: 7,8 (2,5 spire)
  await scrie(page, '#at-mlc-lung', '4');
  await expect(nume(page)).toHaveText('Șurub melc Ø16, lung 4');
  await expect(cote(page)).toContainText('18 × 18 × 31,8 mm');
  await expect(info(page)).toHaveText('Are Ø18 la vârf, Ø13,5 la fundul spirei și 31,8 mm lungime: 10,1 spire, cu pasul de 3,14 mm.');
  await scrie(page, '#at-mlc-lung', '1');
  await expect(nume(page)).toHaveText('Șurub melc Ø16, lung 1');
  await expect(cote(page)).toContainText('18 × 18 × 7,8 mm');
  await expect(info(page)).toContainText('7,8 mm lungime: 2,5 spire');
  // în afara marginilor, valoarea de dinainte rămâne (de la valori din mijlocul plajei: un număr adus la margine s-ar vedea)
  await scrie(page, '#at-mlc-lung', '3');
  await scrie(page, '#at-mlc-pereche', '30');
  for (const [id, rau, bun] of [['#at-mlc-lung', '0', '3'], ['#at-mlc-lung', '5', '3'], ['#at-mlc-pereche', '7', '30'], ['#at-mlc-pereche', '81', '30']] as const) {
    await scrie(page, id, rau);
    await expect(page.locator(id), `${id} ${rau}`).toHaveValue(bun);
  }
  await expect(nume(page)).toHaveText('Șurub melc Ø16, lung 3');
  await expect(montaj(page)).toContainText('Axul roții de 30 stă la 23 mm de axul melcului');
  // marginile înseși sunt primite
  await scrie(page, '#at-mlc-pereche', '80');
  await expect(montaj(page)).toContainText('Axul roții de 80 stă la 48 mm de axul melcului, în cruce cu el: pe grila de știfturi, la 6 știfturi.');
  await scrie(page, '#at-mlc-pereche', '8');
  await expect(montaj(page)).toContainText('Axul roții de 8 stă la 12 mm de axul melcului');
  // înapoi la Ø8: fraza peretelui subțire revine
  await page.locator('#at-mlc-diam [data-v="8"]').click();
  await expect(nume(page)).toHaveText('Șurub melc Ø8, lung 3');
  await expect(cote(page)).toContainText('10 × 10 × 23,8 mm');
  await expect(info(page)).toHaveText('Are Ø10 la vârf, Ø5,5 la fundul spirei și 23,8 mm lungime: 7,6 spire, cu pasul de 3,14 mm. Între colțurile găurii de ax și fundul spirei rămân doar 0,06 mm: piesa o ține spira. Pentru sarcină, alege Ø16.');
  await expect(page.locator('#at-avert')).toBeHidden();
});

test('STL-ul melcului e închis și are cotele de pe hârtie; „Fă perechea” pune melcul și roata lui; „Se prinde cu” îl leagă de ax', async ({ page }) => {
  await atelier(page);
  const [d] = await Promise.all([page.waitForEvent('download'), page.locator('#at-stl').click()]);
  const stl = citesteStl(readFileSync(await d.path()));
  expect(stl.rele).toBe(0);
  expect(stl.dim).toEqual([10, 10, 15.8]);
  expect(d.suggestedFilename()).toBe('surub_melc_8_lung_2.stl');
  // perechea: melcul de acum și roata aleasă, făcută ca în editorul roților (dreaptă, de 3,8 mm, cu gaură de ax)
  await scrie(page, '#at-mlc-pereche', '40');
  await page.locator('#at-mlc-fa-pereche').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Șurub melc Ø8, lung 2', 'Roată dințată 40']);
  await expect(page.locator('#at-toast')).toHaveText('1 × melcul Ø8 și roata de 40 în listă (axele la 24 mm, în cruce).');
  // roata din listă e aceeași piesă cu cea din editorul roților: adăugată de acolo, se adună pe același rând
  await page.locator('#at-galerie [data-piesa="rotita"]').click();
  await scrie(page, '#at-r-dinti', '40');
  await expect(nume(page)).toHaveText('Roată dințată 40');
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr[data-id]')).toHaveCount(2);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['1', '2']);
  // prinderile: gaura de ax, prin toată lungimea; axul potrivit e cel de 3 (trece prin 15,8 mm și mai iese un pas)
  await page.locator('#at-galerie [data-piesa="melc"]').click();
  await expect(page.locator('#at-prinde-are')).toHaveText('1 gaură de ax');
  await page.locator('#at-prinde summary').click();
  await page.locator('#at-prinde-lista [data-prinde="ax"]').click();
  await expect(nume(page)).toHaveText('Ax 3');
  await expect(page.locator('#at-prinde-lista [data-rand="capatAx"] [data-prinde="melc"]')).toHaveText('Șurub melc');
});
