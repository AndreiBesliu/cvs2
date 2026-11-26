/**
 * Brăduțul LEGO în atelierul Easy 3Draw (ADR 0285, felia 3.Cl-4), pe pagina de sine stătătoare a planificatorului (din
 * aceleași surse ca pachetul):
 * - piesa nouă din fila „Crăciun”: etajul de 8 știfturi, de 5 plăci, cu marginea zimțată;
 * - etajul: diametrul (4, 6, 8, 10), înălțimea, marginea; brăduțul întreg, câte etaje încap de la cel ales în sus;
 * - steaua de vârf, cu cuiul ei;
 * - „Fă brăduțul”: trunchiul, etajele, vârful și steaua, în listă, cu etajul din editor ca aceeași piesă;
 * - STL-urile descărcate sunt închise și au cotele de pe hârtie.
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
  await page.locator('#at-galerie [data-piesa="bradLego"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Etaj de brăduț, 8 știfturi');
}
const nume = (page: Page) => page.locator('#at-nume-piesa');
const cote = (page: Page) => page.locator('#at-cote');
const avert = (page: Page) => page.locator('#at-avert');
const info = (page: Page) => page.locator('#at-bl-info');
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

test('piesa nouă din fila „Crăciun”: etajul de 8 știfturi, de 5 plăci, cu marginea zimțată, și brăduțul lui', async ({ page }) => {
  await atelier(page);
  await expect(page.locator('#at-tipuri [data-fila="craciun"]')).toHaveText('Crăciun 6');
  // brăduțul LEGO e ultimul din galerie: piesele stau în ordinea în care au venit
  await expect(page.locator('#at-galerie button')).toHaveText(['Fulg de zăpadă', 'Stea', 'Brăduț', 'Glob', 'Ornament cu nume', 'Brăduț LEGO']);
  await expect(page.locator('#at-editor h2')).toHaveText('Brăduț LEGO');
  // 8 · 8 − 2 · 0,1 în diametru; 5 plăci și știfturile (16 + 1,9)
  await expect(cote(page)).toContainText('63,8 × 63,8 × 17,9 mm');
  await expect(avert(page)).toBeHidden();
  await expect(page.locator('#at-bl-piesa button')).toHaveText(['Etaj', 'Stea de vârf']);
  await expect(page.locator('#at-bl-diam button')).toHaveText(['4', '6', '8', '10']);
  await expect(page.locator('#at-bl-margine button')).toHaveText(['Zimțată', 'Netedă']);
  await expect(apasat(page, 'at-bl-piesa')).toHaveText('Etaj');
  await expect(apasat(page, 'at-bl-diam')).toHaveText('8');
  await expect(apasat(page, 'at-bl-margine')).toHaveText('Zimțată');
  for (const [id, v] of [['placi', '5'], ['etaje', '3'], ['marime', '28']] as const) await expect(page.locator(`#at-bl-${id}`), id).toHaveValue(v);
  await expect(page.locator('#at-bl-etaje')).toHaveAttribute('max', '3');
  // clădit: trunchiul (3 plăci), trei etaje de 5 plăci, vârful (6 plăci, cu știftul lui) și steaua de 28 (25,3 peste știft)
  await expect(info(page)).toHaveText('Brăduțul întreg: trunchiul, 3 etaje (de 8, 6, 4 știfturi), vârful și steaua; clădit, are 104 mm.');
  const s = await descarca(page);
  expect([s.fisier, s.rele]).toEqual(['etaj_de_bradut_8_stifturi.stl', 0]);
  aproape(s.dim, [63.8, 63.8, 17.9]);
});

test('etajul: diametrul, înălțimea și marginea; brăduțul întreg are câte etaje încap de la cel ales în sus', async ({ page }) => {
  await atelier(page);
  await page.locator('#at-bl-diam [data-v="6"]').click();
  await expect(nume(page)).toHaveText('Etaj de brăduț, 6 știfturi');
  await expect(cote(page)).toContainText('47,8 × 47,8 × 17,9 mm');
  // de la 6 în sus încap două etaje (6 și 4): numărul ținut minte, 3, e arătat în margine
  await expect(page.locator('#at-bl-etaje')).toHaveValue('2');
  await expect(page.locator('#at-bl-etaje')).toHaveAttribute('max', '2');
  await expect(info(page)).toHaveText('Brăduțul întreg: trunchiul, 2 etaje (de 6, 4 știfturi), vârful și steaua; clădit, are 88 mm.');
  await page.locator('#at-bl-diam [data-v="4"]').click();
  await expect(nume(page)).toHaveText('Etaj de brăduț, 4 știfturi');
  await expect(info(page)).toHaveText('Brăduțul întreg: trunchiul, un etaj (de 4 știfturi), vârful și steaua; clădit, are 72 mm.');
  // la 10 încap patru; cele 3 ținute minte se văd din nou, apoi 4
  await page.locator('#at-bl-diam [data-v="10"]').click();
  await expect(cote(page)).toContainText('79,8 × 79,8 × 17,9 mm');
  await expect(page.locator('#at-bl-etaje')).toHaveValue('3');
  await expect(info(page)).toHaveText('Brăduțul întreg: trunchiul, 3 etaje (de 10, 8, 6 știfturi), vârful și steaua; clădit, are 104 mm.');
  await scrie(page, '#at-bl-etaje', '4');
  await expect(info(page)).toHaveText('Brăduțul întreg: trunchiul, 4 etaje (de 10, 8, 6, 4 știfturi), vârful și steaua; clădit, are 120 mm.');
  // marginea netedă și înălțimea neobișnuită se scriu în nume
  await page.locator('#at-bl-margine [data-v="neteda"]').click();
  await expect(nume(page)).toHaveText('Etaj de brăduț, 10 știfturi, neted');
  await scrie(page, '#at-bl-placi', '3');
  await expect(nume(page)).toHaveText('Etaj de brăduț, 10 știfturi, 3 plăci, neted');
  await expect(cote(page)).toContainText('79,8 × 79,8 × 11,5 mm');
  await expect(info(page)).toContainText('clădit, are 94 mm.');
  const s = await descarca(page);
  expect([s.fisier, s.rele]).toEqual(['etaj_de_bradut_10_stifturi_3_placi_neted.stl', 0]);
  aproape(s.dim, [79.8, 79.8, 11.5]);
  // un număr din afara marginilor nu e primit
  await scrie(page, '#at-bl-placi', '6');
  for (const [id, rau, bun] of [['placi', '2', '6'], ['placi', '12', '6'], ['etaje', '5', '4'], ['etaje', '0', '4'], ['marime', '10', '28'], ['marime', '60', '28']] as const) {
    await scrie(page, `#at-bl-${id}`, rau);
    await expect(page.locator(`#at-bl-${id}`), `${id} = ${rau}`).toHaveValue(bun);
  }
  await expect(avert(page)).toBeHidden();
});

test('steaua de vârf: plată, groasă cât cuiul ei, care intră în știftul gol al vârfului', async ({ page }) => {
  await atelier(page);
  await page.locator('#at-bl-piesa [data-v="stea"]').click();
  await expect(nume(page)).toHaveText('Stea de vârf, 28 mm');
  // lată de 28 · cos 18°; înaltă de 14 · (1 + cos 36°), plus cuiul de 6 mm; groasă cât bara culcată (3,2 − 0,25)
  await expect(cote(page)).toContainText('26,6 × 31,3 × 3 mm');
  await expect(page.locator('#at-bl-diam')).toHaveCount(0);
  await expect(page.locator('#at-bl-margine')).toHaveCount(0);
  await expect(page.locator('#at-bl-placi')).toHaveCount(0);
  await expect(page.locator('#at-bl-etaje')).toHaveCount(0);
  await expect(page.locator('#at-bl-marime')).toHaveValue('28');
  await expect(info(page)).toHaveText('Steaua e groasă de 2,95 mm, cât cuiul ei (o bară de 3,2 mm, culcată), care intră în știftul gol al vârfului. Brăduțul întreg: trunchiul, 3 etaje (de 8, 6, 4 știfturi), vârful și steaua; clădit, are 104 mm.');
  let s = await descarca(page);
  expect([s.fisier, s.rele]).toEqual(['stea_de_varf_28_mm.stl', 0]);
  aproape(s.dim, [28 * Math.cos(Math.PI / 10), 14 * (1 + Math.cos(Math.PI / 5)) + 6, 2.95]);
  await scrie(page, '#at-bl-marime', '40');
  await expect(nume(page)).toHaveText('Stea de vârf, 40 mm');
  await expect(cote(page)).toContainText('38 × 42,2 × 3 mm');
  // steaua mai mare face brăduțul mai înalt
  await expect(info(page)).toContainText('clădit, are 115 mm.');
  s = await descarca(page);
  expect(s.rele).toBe(0);
  // înapoi la etaj: steaua aleasă rămâne a brăduțului
  await page.locator('#at-bl-piesa [data-v="etaj"]').click();
  await expect(nume(page)).toHaveText('Etaj de brăduț, 8 știfturi');
  await expect(page.locator('#at-bl-marime')).toHaveValue('40');
});

test('„Fă brăduțul”: trunchiul, etajele, vârful și steaua, în listă, cu etajul din editor ca aceeași piesă', async ({ page }) => {
  await atelier(page);
  // etajul din editor întâi; apoi brăduțul: etajul de 8 e pe același rând (1 + 1)
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  await page.locator('#at-bl-fa').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Etaj de brăduț, 8 știfturi', 'Cărămidă rotundă 2×2', 'Etaj de brăduț, 6 știfturi', 'Etaj de brăduț, 4 știfturi', 'Con 2×2, 6 plăci, gaură de bară', 'Stea de vârf, 28 mm']);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['2', '1', '1', '1', '1', '1']);
  // steaua din editor e și ea aceeași piesă cu a brăduțului
  await page.locator('#at-bl-piesa [data-v="stea"]').click();
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['2', '1', '1', '1', '1', '2']);
  // două brăduțe mai mici (de la 6, netede, cu steaua de 20): etajele lor sunt alte piese; trunchiul și vârful, aceleași
  await page.locator('#at-bl-piesa [data-v="etaj"]').click();
  await page.locator('#at-bl-diam [data-v="6"]').click();
  await page.locator('#at-bl-margine [data-v="neteda"]').click();
  await scrie(page, '#at-bl-marime', '20');
  await scrie(page, '#at-bucati', '2');
  await page.locator('#at-bl-fa').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Etaj de brăduț, 8 știfturi', 'Cărămidă rotundă 2×2', 'Etaj de brăduț, 6 știfturi', 'Etaj de brăduț, 4 știfturi', 'Con 2×2, 6 plăci, gaură de bară', 'Stea de vârf, 28 mm',
    'Etaj de brăduț, 6 știfturi, neted', 'Etaj de brăduț, 4 știfturi, neted', 'Stea de vârf, 20 mm']);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['2', '3', '1', '1', '3', '2', '2', '2', '2']);
});
