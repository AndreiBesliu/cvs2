/**
 * Cama în atelierul Easy 3Draw (ADR 0284, felia 3.Cj), pe pagina de sine stătătoare a planificatorului (din aceleași surse
 * ca pachetul):
 * - piesa nouă din fila Roți: excentricul Ø16 cu cursa de 8 mm (un disc de 24, gros de 7,8), cu razele scrise;
 * - configuratorul: forma (excentric, pară, melc), diametrul de bază, cursa, grosimea și gaura, cu numele și cotele de pe
 *   hârtie; un număr din afara marginilor nu e primit;
 * - STL-ul descărcat e închis și are cotele de pe hârtie; piesa intră în listă, pe nume; „Se prinde cu” îi propune axul.
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
  await page.locator('#at-galerie [data-piesa="cama"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Camă excentrică Ø16, cursa 8');
}
const nume = (page: Page) => page.locator('#at-nume-piesa');
const cote = (page: Page) => page.locator('#at-cote');
const info = (page: Page) => page.locator('#at-cam-info');
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

test('piesa nouă din fila Roți: excentricul Ø16 cu cursa de 8 mm, un disc de 24 gros de 7,8', async ({ page }) => {
  await atelier(page);
  await expect(cote(page)).toContainText('24 × 24 × 7,8 mm');
  await expect(page.locator('#at-avert')).toBeHidden();
  await expect(page.locator('#at-editor h2')).toHaveText('Camă');
  await expect(apasat(page, 'at-cam-forma')).toHaveText('Excentric');
  await expect(page.locator('#at-cam-forma button')).toHaveText(['Excentric', 'Pară', 'Melc']);
  await expect(page.locator('#at-cam-diam')).toHaveValue('16');
  await expect(page.locator('#at-cam-cursa')).toHaveValue('8');
  await expect(page.locator('#at-cam-grosime')).toHaveValue('7.8');
  await expect(apasat(page, 'at-cam-gaura')).toHaveText('Pentru ax');
  await expect(info(page)).toHaveText('Marginea stă între 8 și 16 mm de ax: un tachet sprijinit pe ea urcă și coboară 8 mm la fiecare tură. Urcă și coboară lin, câte o jumătate de tură.');
});

test('configuratorul: forma, diametrul, cursa, grosimea și gaura, cu numele și cotele de pe hârtie', async ({ page }) => {
  await atelier(page);
  // para: cercul de bază (16) și nasul până la 16 mm de ax: 8 + 16 = 24 pe lung, 16 pe lat
  await page.locator('#at-cam-forma [data-v="para"]').click();
  await expect(nume(page)).toHaveText('Camă pară Ø16, cursa 8');
  await expect(cote(page)).toContainText('24 × 16 × 7,8 mm');
  await expect(info(page)).toContainText('Stă pe cercul de bază mai mult de jumătate de tură, apoi urcă și coboară scurt.');
  // melcul: de la 8 la 16; pe x, de la −12 (la 180°) la 16; pe y, puțin sub ±11 și ±15 (vârfurile nu cad pe axe)
  await page.locator('#at-cam-forma [data-v="melc"]').click();
  await expect(nume(page)).toHaveText('Camă melc Ø16, cursa 8');
  await expect(cote(page)).toContainText('28,1 × 24,1 × 7,8 mm');
  await expect(info(page)).toContainText('Urcă lin o tură întreagă, apoi cade dintr-odată: se rotește într-un singur sens.');
  // excentricul Ø24 cu cursa 12: discul de 36; gros de 3,8, pe știft
  await page.locator('#at-cam-forma [data-v="excentric"]').click();
  await scrie(page, '#at-cam-diam', '24');
  await scrie(page, '#at-cam-cursa', '12');
  await expect(nume(page)).toHaveText('Camă excentrică Ø24, cursa 12');
  await expect(cote(page)).toContainText('36 × 36 × 7,8 mm');
  await expect(info(page)).toContainText('Marginea stă între 12 și 24 mm de ax: un tachet sprijinit pe ea urcă și coboară 12 mm la fiecare tură.');
  await scrie(page, '#at-cam-grosime', '3.8');
  await page.locator('#at-cam-gaura [data-v="r"]').click();
  await expect(nume(page)).toHaveText('Camă excentrică Ø24, cursa 12, 3,8 mm, gaură rotundă');
  await expect(cote(page)).toContainText('36 × 36 × 3,8 mm');
  // cursa cu zecimale, rotunjită la zecimi; în afara marginilor, valoarea de dinainte rămâne
  await scrie(page, '#at-cam-cursa', '2.54');
  await expect(page.locator('#at-cam-cursa')).toHaveValue('2.5');
  await expect(nume(page)).toHaveText('Camă excentrică Ø24, cursa 2,5, 3,8 mm, gaură rotundă');
  for (const [id, rau, bun] of [['#at-cam-diam', '9', '24'], ['#at-cam-diam', '65', '24'], ['#at-cam-cursa', '0.5', '2.5'], ['#at-cam-cursa', '25', '2.5'], ['#at-cam-grosime', '0.5', '3.8'], ['#at-cam-grosime', '21', '3.8']] as const) {
    await scrie(page, id, rau);
    await expect(page.locator(id), `${id} ${rau}`).toHaveValue(bun);
  }
  await expect(nume(page)).toHaveText('Camă excentrică Ø24, cursa 2,5, 3,8 mm, gaură rotundă');
  // marginile înseși sunt primite
  await scrie(page, '#at-cam-diam', '10');
  await scrie(page, '#at-cam-cursa', '24');
  await scrie(page, '#at-cam-grosime', '20');
  await expect(nume(page)).toHaveText('Camă excentrică Ø10, cursa 24, 20 mm, gaură rotundă');
  await expect(page.locator('#at-avert')).toBeHidden();
});

test('STL-ul camei pară e închis și are cotele de pe hârtie; piesa intră în listă, pe nume; „Se prinde cu” îi propune axul', async ({ page }) => {
  await atelier(page);
  await page.locator('#at-cam-forma [data-v="para"]').click();
  await scrie(page, '#at-cam-diam', '20');
  await scrie(page, '#at-cam-cursa', '10');
  await expect(nume(page)).toHaveText('Camă pară Ø20, cursa 10');
  const [d] = await Promise.all([page.waitForEvent('download'), page.locator('#at-stl').click()]);
  const stl = citesteStl(readFileSync(await d.path()));
  expect(stl.rele).toBe(0);
  // de la −10 (cercul de bază) la +20 (vârful nasului), ±10, groasă de 7,8
  expect(stl.dim).toEqual([30, 20, 7.8]);
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-toast')).toHaveText('1 × Camă pară Ø20, cursa 10 în listă.');
  await expect(page.locator('#at-lista')).toContainText('Camă pară Ø20, cursa 10');
  // prinderile: gaura de ax; axul potrivit e cel de 2 (trece prin 7,8 mm și mai iese un pas)
  await expect(page.locator('#at-prinde-are')).toHaveText('1 gaură de ax');
  await page.locator('#at-prinde summary').click();
  await page.locator('#at-prinde-lista [data-prinde="ax"]').click();
  await expect(nume(page)).toHaveText('Ax 2');
  await expect(page.locator('#at-prinde-lista [data-rand="capatAx"] [data-prinde="cama"]')).toHaveText('Camă');
});
