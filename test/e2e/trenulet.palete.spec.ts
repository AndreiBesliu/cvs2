/**
 * Roata cu palete în atelierul Easy 3Draw (ADR 0284, felia 3.Cj), pe pagina de sine stătătoare a planificatorului (din
 * aceleași surse ca pachetul):
 * - piesa nouă din fila Elice: Ø64, 8 palete drepte, lată de 15,8, cu discul dedesubt, cu butucul și paletele scrise;
 * - configuratorul: diametrul (și repede, pe grila de știfturi), paletele, lățimea, forma lor, discul și gaura, cu numele
 *   și cotele de pe hârtie; paletele rămân câte încap la diametrul ales; un număr din afara marginilor nu e primit;
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
  await page.locator('#at-tipuri [data-fila="propulsie"]').click();
  await page.locator('#at-galerie [data-piesa="roataPalete"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată cu palete Ø64, 8 palete');
}
const nume = (page: Page) => page.locator('#at-nume-piesa');
const cote = (page: Page) => page.locator('#at-cote');
const info = (page: Page) => page.locator('#at-rp-info');
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

test('piesa nouă din fila Elice: roata Ø64 cu 8 palete drepte, lată de 15,8, cu discul dedesubt', async ({ page }) => {
  await atelier(page);
  await expect(page.locator('#at-tipuri [data-fila="propulsie"]')).toHaveText('Elice 4');
  await expect(cote(page)).toContainText('64 × 64 × 15,8 mm');
  await expect(page.locator('#at-avert')).toBeHidden();
  await expect(page.locator('#at-editor h2')).toHaveText('Roată cu palete');
  await expect(page.locator('#at-rp-repede button')).toHaveText(['Ø32', 'Ø48', 'Ø64', 'Ø96']);
  await expect(apasat(page, 'at-rp-repede')).toHaveText('Ø64');
  await expect(page.locator('#at-rp-diam')).toHaveValue('64');
  await expect(page.locator('#at-rp-palete')).toHaveValue('8');
  await expect(page.locator('#at-rp-palete')).toHaveAttribute('max', '24');
  await expect(page.locator('#at-rp-lat')).toHaveValue('15.8');
  await expect(page.locator('#at-rp-forma button')).toHaveText(['Drepte', 'Curbate']);
  await expect(apasat(page, 'at-rp-forma')).toHaveText('Drepte');
  await expect(apasat(page, 'at-rp-disc')).toHaveText('Cu disc');
  await expect(apasat(page, 'at-rp-gaura')).toHaveText('Pentru ax');
  // butucul roților (raza 4,8); paletele, de la el la vârf: 32 − 4,8
  await expect(info(page)).toHaveText('Butucul are Ø9,6 mm, iar paletele, 27,2 mm lungime și 1,6 mm grosime.');
});

test('configuratorul: diametrul, paletele, lățimea, forma, discul și gaura, cu numele și cotele de pe hârtie', async ({ page }) => {
  await atelier(page);
  // curbate, fără disc: aceeași cutie (vârfurile celor 8 palete cad pe axe)
  await page.locator('#at-rp-forma [data-v="curbate"]').click();
  await expect(nume(page)).toHaveText('Roată cu palete Ø64, 8 palete, curbate');
  await expect(apasat(page, 'at-rp-forma')).toHaveText('Curbate');
  await expect(info(page)).toHaveText('Butucul are Ø9,6 mm, iar paletele, 27,2 mm lungime și 1,6 mm grosime. Curbate, prind apa ca niște cupe: împing mai bine într-un sens.');
  await page.locator('#at-rp-disc [data-v="fara"]').click();
  await expect(apasat(page, 'at-rp-disc')).toHaveText('Fără');
  await expect(nume(page)).toHaveText('Roată cu palete Ø64, 8 palete, curbate, fără disc');
  await expect(cote(page)).toContainText('64 × 64 × 15,8 mm');
  // repede, Ø32: paleta curbată ține pe butuc 1,6 · 1,381 + 0,8 = 3,01 mm, deci încap π · 16 / 3,01 = 16
  await page.locator('#at-rp-repede [data-v="32"]').click();
  await expect(apasat(page, 'at-rp-repede')).toHaveText('Ø32');
  await expect(page.locator('#at-rp-diam')).toHaveValue('32');
  await expect(nume(page)).toHaveText('Roată cu palete Ø32, 8 palete, curbate, fără disc');
  await expect(page.locator('#at-rp-palete')).toHaveAttribute('max', '16');
  await expect(info(page)).toHaveText('Butucul are Ø9,6 mm, iar paletele, 11,2 mm lungime și 1,6 mm grosime. La diametrul ăsta încap cel mult 16 palete. Curbate, prind apa ca niște cupe: împing mai bine într-un sens.');
  // cerute 24: rămân cele 16 care încap, iar butucul crește (16 · 3,01 / 2π = 7,7), fără avertisment
  await scrie(page, '#at-rp-palete', '24');
  await expect(page.locator('#at-rp-palete')).toHaveValue('16');
  await expect(nume(page)).toHaveText('Roată cu palete Ø32, 16 palete, curbate, fără disc');
  await expect(info(page)).toContainText('Butucul are Ø15,4 mm, iar paletele, 8,3 mm lungime și 1,6 mm grosime.');
  await expect(page.locator('#at-avert')).toBeHidden();
  // drepte: încap 20 (π · 16 / 2,4), cele 16 rămân; butucul 16 · 2,4 / 2π = 6,2
  await page.locator('#at-rp-forma [data-v="drepte"]').click();
  await expect(nume(page)).toHaveText('Roată cu palete Ø32, 16 palete, fără disc');
  await expect(page.locator('#at-rp-palete')).toHaveAttribute('max', '20');
  await expect(info(page)).toHaveText('Butucul are Ø12,4 mm, iar paletele, 9,8 mm lungime și 1,6 mm grosime. La diametrul ăsta încap cel mult 20 palete.');
  // roata mare: paletele de 3,2 mm (2 % din diametru); cu 24, butucul are raza 24 · 4 / 2π = 15,3
  await scrie(page, '#at-rp-diam', '160');
  await expect(apasat(page, 'at-rp-repede')).toHaveCount(0);
  await scrie(page, '#at-rp-palete', '24');
  await expect(nume(page)).toHaveText('Roată cu palete Ø160, 24 palete, fără disc');
  await expect(info(page)).toHaveText('Butucul are Ø30,6 mm, iar paletele, 64,7 mm lungime și 3,2 mm grosime.');
  await scrie(page, '#at-rp-lat', '7.8');
  await page.locator('#at-rp-gaura [data-v="r"]').click();
  await page.locator('#at-rp-disc [data-v="unul"]').click();
  await expect(apasat(page, 'at-rp-gaura')).toHaveText('Rotundă');
  await expect(apasat(page, 'at-rp-disc')).toHaveText('Cu disc');
  await expect(apasat(page, 'at-rp-forma')).toHaveText('Drepte');
  await expect(nume(page)).toHaveText('Roată cu palete Ø160, 24 palete, lată 7,8 mm, gaură rotundă');
  await expect(cote(page)).toContainText('160 × 160 × 7,8 mm');
  // în afara marginilor, valoarea de dinainte rămâne
  for (const [id, rau, bun] of [['#at-rp-diam', '23', '160'], ['#at-rp-diam', '161', '160'], ['#at-rp-palete', '3', '24'], ['#at-rp-palete', '25', '24'], ['#at-rp-lat', '3.9', '7.8'], ['#at-rp-lat', '41', '7.8']] as const) {
    await scrie(page, id, rau);
    await expect(page.locator(id), `${id} ${rau}`).toHaveValue(bun);
  }
  await expect(nume(page)).toHaveText('Roată cu palete Ø160, 24 palete, lată 7,8 mm, gaură rotundă');
  // diametrul cu zecimale, rotunjit la zecimi
  await scrie(page, '#at-rp-diam', '50.26');
  await expect(page.locator('#at-rp-diam')).toHaveValue('50.3');
  await expect(nume(page)).toHaveText('Roată cu palete Ø50,3, 24 palete, lată 7,8 mm, gaură rotundă');
  // marginile înseși sunt primite; la Ø24 rămân cele 15 palete care încap
  await scrie(page, '#at-rp-diam', '24');
  await expect(nume(page)).toHaveText('Roată cu palete Ø24, 15 palete, lată 7,8 mm, gaură rotundă');
  await scrie(page, '#at-rp-palete', '4');
  await scrie(page, '#at-rp-lat', '4');
  await expect(nume(page)).toHaveText('Roată cu palete Ø24, 4 palete, lată 4 mm, gaură rotundă');
  await expect(cote(page)).toContainText('24 × 24 × 4 mm');
  await scrie(page, '#at-rp-lat', '40');
  await expect(nume(page)).toHaveText('Roată cu palete Ø24, 4 palete, lată 40 mm, gaură rotundă');
  await expect(page.locator('#at-avert')).toBeHidden();
});

test('STL-ul roții e închis și are cotele de pe hârtie; piesa intră în listă, pe nume; „Se prinde cu” îi propune axul', async ({ page }) => {
  await atelier(page);
  await page.locator('#at-rp-repede [data-v="48"]').click();
  await scrie(page, '#at-rp-palete', '6');
  await page.locator('#at-rp-disc [data-v="fara"]').click();
  await expect(nume(page)).toHaveText('Roată cu palete Ø48, 6 palete, fără disc');
  const descarca = async () => { const [d] = await Promise.all([page.waitForEvent('download'), page.locator('#at-stl').click()]); return citesteStl(readFileSync(await d.path())); };
  const drepte = await descarca();
  expect(drepte.rele).toBe(0);
  // pe x, vârfurile de la 0° și 180°: 48; pe y, colțurile paletelor de la ±60° și ±120° (pe cercul de 24, la 0,8 mm de
  // rază): 2 · (√(24² − 0,8²) · sin 60° + 0,8 · cos 60°) = 42,35
  expect(drepte.dim).toEqual([48, 42.35, 15.8]);
  await page.locator('#at-rp-forma [data-v="curbate"]').click();
  await expect(nume(page)).toHaveText('Roată cu palete Ø48, 6 palete, curbate, fără disc');
  const curbate = await descarca();
  expect(curbate.rele).toBe(0);
  expect([curbate.dim[0], curbate.dim[2]]).toEqual([48, 15.8]);
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-toast')).toHaveText('1 × Roată cu palete Ø48, 6 palete, curbate, fără disc în listă.');
  await expect(page.locator('#at-lista')).toContainText('Roată cu palete Ø48, 6 palete, curbate, fără disc');
  // prinderile: gaura de ax; axul potrivit e cel de 3 (trece prin 15,8 mm și mai iese un pas)
  await expect(page.locator('#at-prinde-are')).toHaveText('1 gaură de ax');
  await page.locator('#at-prinde summary').click();
  await page.locator('#at-prinde-lista [data-prinde="ax"]').click();
  await expect(nume(page)).toHaveText('Ax 3');
  await expect(page.locator('#at-prinde-lista [data-rand="capatAx"] [data-prinde="roataPalete"]')).toHaveText('Roată cu palete');
});
