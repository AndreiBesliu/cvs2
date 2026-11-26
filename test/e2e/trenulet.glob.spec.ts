/**
 * Globul de Crăciun în atelierul Easy 3Draw (ADR 0285, felia 3.Cl-2), pe pagina de sine stătătoare a planificatorului (din
 * aceleași surse ca pachetul):
 * - piesa nouă din fila „Crăciun”: Ø60, plat, cu trei dungi decupate, căpăcel și inel;
 * - modelul (dungi, zigzag, stele, fără), cu numărul lui ținut în marginile modelului ales; decupat sau în relief, cu
 *   înălțimea la care se schimbă filamentul;
 * - din două discuri îmbinate, cu fanta scrisă; un număr din afara marginilor nu e primit;
 * - STL-urile descărcate sunt închise și au cotele de pe hârtie; piesa intră în listă, pe nume.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

async function atelier(page: Page): Promise<void> {
  await threeDinPachet(page);
  await page.setContent(paginiPlanificator().preview);
  await intraIn3D(page);
  await page.locator('#at-tipuri [data-fila="craciun"]').click();
  await page.locator('#at-galerie [data-piesa="glob"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Glob Ø60, dungi × 3');
}
const nume = (page: Page) => page.locator('#at-nume-piesa');
const cote = (page: Page) => page.locator('#at-cote');
const avert = (page: Page) => page.locator('#at-avert');
const info = (page: Page) => page.locator('#at-gl-info');
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
async function descarca(page: Page): Promise<{ fisier: string; rele: number; dim: number[] }> {
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descarcă STL' }).click()]);
  return { fisier: d.suggestedFilename(), ...citesteStl(readFileSync(await d.path())) };
}
const aproape = (a: readonly number[], b: readonly number[]) => expect(a.map((x, k) => Math.abs(x - b[k]!) < 0.02)).toEqual([true, true, true]);

test('piesa nouă din fila „Crăciun”: globul Ø60, plat, cu trei dungi decupate, căpăcel și inel', async ({ page }) => {
  await atelier(page);
  await expect(page.locator('#at-tipuri [data-fila="craciun"]')).toHaveText('Crăciun 5');
  // globul stă după brăduț: piesele sunt în ordinea în care au venit
  await expect(page.locator('#at-galerie button')).toHaveText(['Fulg de zăpadă', 'Stea', 'Brăduț', 'Glob', 'Ornament cu nume']);
  await expect(page.locator('#at-editor h2')).toHaveText('Glob');
  // înalt: discul (60), căpăcelul (9 % din 60) și inelul (1,9 + 3,1)
  await expect(cote(page)).toContainText('60 × 70,4 × 3 mm');
  await expect(avert(page)).toBeHidden();
  await expect(page.locator('#at-gl-fel button')).toHaveText(['Plat', 'Din două discuri']);
  await expect(apasat(page, 'at-gl-fel')).toHaveText('Plat');
  await expect(page.locator('#at-gl-model button')).toHaveText(['Dungi', 'Zigzag', 'Stele', 'Fără']);
  await expect(apasat(page, 'at-gl-model')).toHaveText('Dungi');
  await expect(page.locator('#at-gl-desen button')).toHaveText(['Decupat', 'În relief']);
  await expect(apasat(page, 'at-gl-desen')).toHaveText('Decupat');
  await expect(page.locator('#at-gl-diam')).toHaveValue('60');
  await expect(page.locator('#at-gl-grosime')).toHaveValue('3');
  await expect(page.locator('label[for="at-gl-cate"]')).toHaveText('Dungi');
  await expect(page.locator('#at-gl-cate')).toHaveValue('3');
  await expect(page.locator('#at-gl-cate')).toHaveAttribute('max', '5');
  await expect(page.locator('#at-gl-relief')).toHaveCount(0);
  await expect(apasat(page, 'at-gl-ag')).toHaveText('Inel');
  // marginea din jurul modelului: 8 % din diametru
  await expect(info(page)).toHaveText('Căpăcelul are 5,4 mm, iar marginea din jurul modelului, 4,8 mm.');
  await expect(page.locator('#at-prinde')).toBeHidden();
  await page.locator('#at-gl-ag [data-v="fara"]').click();
  await expect(nume(page)).toHaveText('Glob Ø60, dungi × 3, fără inel');
  await expect(cote(page)).toContainText('60 × 65,4 × 3 mm');
});

test('modelul globului: dungi, zigzag, stele sau fără; numărul rămâne în marginile modelului ales', async ({ page }) => {
  await atelier(page);
  await scrie(page, '#at-gl-cate', '5');
  await expect(nume(page)).toHaveText('Glob Ø60, dungi × 5');
  // zigzagul are cel mult 3: cele 5 dungi devin 3 zigzaguri, fără avertisment
  await page.locator('#at-gl-model [data-v="zigzag"]').click();
  await expect(nume(page)).toHaveText('Glob Ø60, zigzag × 3');
  await expect(page.locator('label[for="at-gl-cate"]')).toHaveText('Zigzaguri');
  await expect(page.locator('#at-gl-cate')).toHaveValue('3');
  await expect(page.locator('#at-gl-cate')).toHaveAttribute('max', '3');
  await expect(avert(page)).toBeHidden();
  // numărul scris rămâne ținut minte: întors la dungi, sunt tot 5
  await page.locator('#at-gl-model [data-v="dungi"]').click();
  await expect(nume(page)).toHaveText('Glob Ø60, dungi × 5');
  await page.locator('#at-gl-model [data-v="zigzag"]').click();
  await expect(nume(page)).toHaveText('Glob Ø60, zigzag × 3');
  await scrie(page, '#at-gl-cate', '1');
  await expect(nume(page)).toHaveText('Glob Ø60, zigzag × 1');
  // stelele: cel puțin 3 în jurul celei din mijloc
  await page.locator('#at-gl-model [data-v="stele"]').click();
  await expect(nume(page)).toHaveText('Glob Ø60, stele × 3');
  await expect(page.locator('label[for="at-gl-cate"]')).toHaveText('Stele în jur');
  await expect(page.locator('#at-gl-cate')).toHaveAttribute('min', '3');
  await expect(page.locator('#at-gl-cate')).toHaveAttribute('max', '8');
  await scrie(page, '#at-gl-cate', '8');
  await expect(nume(page)).toHaveText('Glob Ø60, stele × 8');
  await expect(cote(page)).toContainText('60 × 70,4 × 3 mm');
  await expect(avert(page)).toBeHidden();
  // fără model: nici număr, nici „Desenul”
  await page.locator('#at-gl-model [data-v="fara"]').click();
  await expect(nume(page)).toHaveText('Glob Ø60, fără model');
  await expect(page.locator('#at-gl-cate')).toHaveCount(0);
  await expect(page.locator('#at-gl-desen')).toHaveCount(0);
  await expect(info(page)).toHaveText('Căpăcelul are 5,4 mm.');
  // un număr din afara marginilor nu e primit
  await page.locator('#at-gl-model [data-v="dungi"]').click();
  await expect(page.locator('#at-gl-cate')).toHaveValue('5');
  for (const [id, rau, bun] of [['diam', '200', '60'], ['diam', '20', '60'], ['grosime', '9', '3'], ['cate', '9', '5'], ['cate', '0', '5']] as const) {
    await scrie(page, `#at-gl-${id}`, rau);
    await expect(page.locator(`#at-gl-${id}`), id).toHaveValue(bun);
  }
  await scrie(page, '#at-gl-diam', '100');
  await scrie(page, '#at-gl-grosime', '2');
  await expect(nume(page)).toHaveText('Glob Ø100, dungi × 5, 2 mm');
  // căpăcelul: 9 % din 100; marginea: 8 %
  await expect(cote(page)).toContainText('100 × 114 × 2 mm');
  await expect(info(page)).toHaveText('Căpăcelul are 9 mm, iar marginea din jurul modelului, 8 mm.');
});

test('globul în relief: modelul stă peste disc, iar editorul spune la ce înălțime se schimbă filamentul', async ({ page }) => {
  await atelier(page);
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  await page.locator('#at-gl-desen [data-v="relief"]').click();
  await expect(nume(page)).toHaveText('Glob Ø60, dungi × 3, în relief de 0,8');
  await expect(cote(page)).toContainText('60 × 70,4 × 3,8 mm');
  await expect(page.locator('#at-gl-relief')).toHaveValue('0.8');
  await expect(info(page)).toHaveText('Pentru două culori, schimbă filamentul la 3 mm (după stratul 15, la straturi de 0,2 mm): de acolo în sus se tipărește doar modelul.');
  await scrie(page, '#at-gl-relief', '1.6');
  await expect(nume(page)).toHaveText('Glob Ø60, dungi × 3, în relief de 1,6');
  await expect(cote(page)).toContainText('60 × 70,4 × 4,6 mm');
  await scrie(page, '#at-gl-grosime', '2');
  await expect(nume(page)).toHaveText('Glob Ø60, dungi × 3, în relief de 1,6, 2 mm');
  await expect(info(page)).toHaveText('Pentru două culori, schimbă filamentul la 2 mm (după stratul 10, la straturi de 0,2 mm): de acolo în sus se tipărește doar modelul.');
  for (const [rau, bun] of [['5', '1.6'], ['0.1', '1.6']] as const) {
    await scrie(page, '#at-gl-relief', rau);
    await expect(page.locator('#at-gl-relief')).toHaveValue(bun);
  }
  // fără model nu e nimic de ridicat: relieful nu se mai arată; întors la dungi, e tot în relief
  await page.locator('#at-gl-model [data-v="fara"]').click();
  await expect(nume(page)).toHaveText('Glob Ø60, fără model, 2 mm');
  await expect(page.locator('#at-gl-relief')).toHaveCount(0);
  await expect(cote(page)).toContainText('60 × 70,4 × 2 mm');
  await page.locator('#at-gl-model [data-v="stele"]').click();
  await expect(nume(page)).toHaveText('Glob Ø60, stele × 3, în relief de 1,6, 2 mm');
  const s = await descarca(page);
  expect(s.rele).toBe(0);
  aproape(s.dim, [60, 70.4, 3.6]);
  // întors la decupat, relieful ținut minte nu intră în piesă: e globul de la început, pe același rând al listei
  await page.locator('#at-gl-desen [data-v="decupat"]').click();
  await page.locator('#at-gl-model [data-v="dungi"]').click();
  await scrie(page, '#at-gl-grosime', '3');
  await expect(nume(page)).toHaveText('Glob Ø60, dungi × 3');
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  const rand = page.locator('#at-lista tr', { hasText: 'Glob Ø60, dungi × 3' });
  await expect(rand).toHaveCount(1);
  await expect(rand.locator('.pas-n')).toHaveText('2');
});

test('globul din două discuri îmbinate: fără model, cu fanta scrisă; STL-urile închise și lista', async ({ page }) => {
  await atelier(page);
  const plat = await descarca(page);
  expect([plat.fisier, plat.rele]).toEqual(['glob_60_dungi_x_3.stl', 0]);
  aproape(plat.dim, [60, 70.4, 3]);
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  await page.locator('#at-gl-fel [data-v="discuri"]').click();
  await expect(nume(page)).toHaveText('Glob Ø60, din două discuri');
  // două discuri alăturate, la 3 mm (60 + 3 + 60); fanta: 3 + 2 · (0,1 + 0,1)
  await expect(cote(page)).toContainText('123 × 70,4 × 3 mm');
  await expect(page.locator('#at-gl-model')).toHaveCount(0);
  await expect(page.locator('#at-gl-desen')).toHaveCount(0);
  await expect(page.locator('#at-gl-cate')).toHaveCount(0);
  await expect(info(page)).toHaveText('Două discuri de Ø60 mm, tipărite alături. Fantele au 3,4 mm: grosimea discului și jocul din calibrare.');
  await expect(avert(page)).toBeHidden();
  const d = await descarca(page);
  expect([d.fisier, d.rele]).toEqual(['glob_60_din_doua_discuri.stl', 0]);
  aproape(d.dim, [123, 70.4, 3]);
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  await expect(page.locator('#at-lista')).toContainText('Glob Ø60, dungi × 3');
  await expect(page.locator('#at-lista')).toContainText('Glob Ø60, din două discuri');
  await expect(page.locator('#at-lista')).toContainText('123 × 70,4 × 3');
  // întors la globul plat, modelul ales înainte a rămas
  await page.locator('#at-gl-fel [data-v="plat"]').click();
  await expect(nume(page)).toHaveText('Glob Ø60, dungi × 3');
  // două globuri fără model sunt aceeași piesă, oricâte dungi ar fi avut: se adună pe același rând
  await page.locator('#at-gl-model [data-v="fara"]').click();
  await expect(nume(page)).toHaveText('Glob Ø60, fără model');
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  await page.locator('#at-gl-model [data-v="dungi"]').click();
  await scrie(page, '#at-gl-cate', '4');
  await page.locator('#at-gl-model [data-v="fara"]').click();
  await expect(nume(page)).toHaveText('Glob Ø60, fără model');
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  const rand = page.locator('#at-lista tr', { hasText: 'Glob Ø60, fără model' });
  await expect(rand).toHaveCount(1);
  await expect(rand.locator('.pas-n')).toHaveText('2');
});
