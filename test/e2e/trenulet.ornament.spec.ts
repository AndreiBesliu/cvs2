/**
 * Ornamentul cu nume în atelierul Easy 3Draw (ADR 0285, felia 3.Cl-3), pe pagina de sine stătătoare a planificatorului (din
 * aceleași surse ca pachetul):
 * - piesa nouă din fila „Crăciun”: eticheta de 70 × 26, cu „ANA” în relief și gaura de agățat;
 * - numele: scris cum vrei, arătat cum se scrie (majuscule, doar semnele fontului); literele, cât încap de mari;
 * - scrisul: în relief (cu înălțimea la care se schimbă filamentul), adâncit sau decupat;
 * - formele: eticheta, globul, inima și steaua, fiecare cu mărimile și agățătoarea ei;
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
  await page.locator('#at-galerie [data-piesa="ornament"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Etichetă „ANA”, 70 × 26 mm');
}
const nume = (page: Page) => page.locator('#at-nume-piesa');
const cote = (page: Page) => page.locator('#at-cote');
const avert = (page: Page) => page.locator('#at-avert');
const info = (page: Page) => page.locator('#at-on-info');
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

test('piesa nouă din fila „Crăciun”: eticheta de 70 × 26 cu „ANA” în relief și gaura de agățat', async ({ page }) => {
  await atelier(page);
  await expect(page.locator('#at-tipuri [data-fila="craciun"]')).toHaveText('Crăciun 5');
  // ornamentul e ultimul din galerie: piesele stau în ordinea în care au venit
  await expect(page.locator('#at-galerie button')).toHaveText(['Fulg de zăpadă', 'Stea', 'Brăduț', 'Glob', 'Ornament cu nume']);
  await expect(page.locator('#at-editor h2')).toHaveText('Ornament cu nume');
  await expect(cote(page)).toContainText('70 × 26 × 3,8 mm');
  await expect(avert(page)).toBeHidden();
  await expect(page.locator('#at-on-forma button')).toHaveText(['Etichetă', 'Glob', 'Inimă', 'Stea']);
  await expect(page.locator('#at-on-scris button')).toHaveText(['În relief', 'Adâncit', 'Decupat']);
  await expect(page.locator('#at-on-ag button')).toHaveText(['Gaură', 'Fără']);
  await expect(apasat(page, 'at-on-forma')).toHaveText('Etichetă');
  await expect(apasat(page, 'at-on-scris')).toHaveText('În relief');
  await expect(apasat(page, 'at-on-ag')).toHaveText('Gaură');
  await expect(page.locator('#at-on-text')).toHaveValue('ANA');
  await expect(page.locator('#at-on-text')).toHaveAttribute('maxlength', '16');
  for (const [id, v] of [['lungime', '70'], ['inaltime', '26'], ['grosime', '3'], ['relief', '0.8']] as const) await expect(page.locator(`#at-on-${id}`), id).toHaveValue(v);
  await expect(page.locator('label[for="at-on-relief"]')).toHaveText('Relieful (mm)');
  await expect(page.locator('#at-on-diam')).toHaveCount(0);
  // literele: cât încap pe înălțime (26 − 2 · 2 − linia de 2,6 = 19,4, la zecime: 19,3); filamentul se schimbă la fața plăcii
  await expect(info(page)).toHaveText('Literele au 19,3 mm, cu linia de 2,6 mm. Pentru două culori, schimbă filamentul la 3 mm (după stratul 15, la straturi de 0,2 mm): de acolo în sus se tipărește doar numele.');
  const s = await descarca(page);
  expect([s.fisier, s.rele]).toEqual(['eticheta_ana_70_x_26_mm.stl', 0]);
  aproape(s.dim, [70, 26, 3.8]);
});

test('numele: scris cum vrei, arătat cum se scrie; literele, cât încap de mari; fără nume, forma rămâne goală', async ({ page }) => {
  await atelier(page);
  // majuscule, cu diacritice; un nume lung iese cu litere mici, și piesa o spune
  await scrie(page, '#at-on-text', 'moș crăciun');
  await expect(page.locator('#at-on-text')).toHaveValue('MOȘ CRĂCIUN');
  await expect(nume(page)).toHaveText('Etichetă „MOȘ CRĂCIUN”, 70 × 26 mm');
  await expect(info(page)).toContainText('Literele au 5,7 mm, cu linia de 1,2 mm.');
  await expect(avert(page)).toHaveText('Literele au ieșit de 5,7 mm: pentru litere mai mari, fă forma mai mare sau numele mai scurt.');
  // pe o etichetă mai lungă, literele cresc până le oprește înălțimea: cu virgula lui Ș și căciula lui Ă, numele are 10
  // unități (majuscula are 6), deci 10 · h / 6 + 0,16 · h ≤ 26 − 2 · 2
  await scrie(page, '#at-on-lungime', '140');
  await expect(nume(page)).toHaveText('Etichetă „MOȘ CRĂCIUN”, 140 × 26 mm');
  await expect(info(page)).toContainText('Literele au 12 mm, cu linia de 1,92 mm.');
  await expect(avert(page)).toBeHidden();
  await scrie(page, '#at-on-lungime', '70');
  // un semn pe care fontul nu-l are e sărit, și rândul de jos o spune
  await scrie(page, '#at-on-text', 'mama@');
  await expect(page.locator('#at-on-text')).toHaveValue('MAMA');
  await expect(nume(page)).toHaveText('Etichetă „MAMA”, 70 × 26 mm');
  await expect(info(page)).toContainText('Nu am semnul „@”: l-am sărit. Literele au ');
  await scrie(page, '#at-on-text', 'a#b@c');
  await expect(page.locator('#at-on-text')).toHaveValue('ABC');
  await expect(info(page)).toContainText('Nu am semnele „#@”: le-am sărit. Literele au ');
  await scrie(page, '#at-on-text', "d'or 2026!");
  await expect(nume(page)).toHaveText("Etichetă „D'OR 2026!”, 70 × 26 mm");
  await expect(info(page)).not.toContainText('Nu am');
  // un nume care nu încape nici cu cele mai mici litere nu se scrie
  await scrie(page, '#at-on-text', 'wwwwwwwwwwwwwwww');
  await expect(nume(page)).toHaveText('Etichetă „WWWWWWWWWWWWWWWW”, 70 × 26 mm');
  await expect(info(page)).toHaveText('Numele nu e scris: nu încape pe forma asta.');
  await expect(avert(page)).toHaveText('Numele nu încape pe forma asta: fă forma mai mare sau numele mai scurt.');
  await expect(cote(page)).toContainText('70 × 26 × 3 mm');
  // fără nume: forma goală, fără relief
  await scrie(page, '#at-on-text', '');
  await expect(nume(page)).toHaveText('Etichetă fără nume, 70 × 26 mm');
  await expect(info(page)).toHaveText("Scrie un nume: litere, cifre și semnele - . ! ' + (cel mult 16).");
  await expect(page.locator('#at-on-relief')).toHaveCount(0);
  await expect(cote(page)).toContainText('70 × 26 × 3 mm');
  await expect(avert(page)).toBeHidden();
  const s = await descarca(page);
  expect([s.fisier, s.rele]).toEqual(['eticheta_fara_nume_70_x_26_mm.stl', 0]);
  aproape(s.dim, [70, 26, 3]);
});

test('scrisul: în relief, adâncit sau decupat; relieful și adâncimea, în marginile lor', async ({ page }) => {
  await atelier(page);
  await page.locator('#at-on-scris [data-v="adancit"]').click();
  await expect(nume(page)).toHaveText('Etichetă „ANA”, 70 × 26 mm, adâncit');
  await expect(page.locator('label[for="at-on-relief"]')).toHaveText('Adâncimea (mm)');
  await expect(cote(page)).toContainText('70 × 26 × 3 mm');
  await expect(info(page)).toHaveText('Literele au 19,3 mm, cu linia de 2,6 mm. Sunt adânci de 0,8 mm.');
  await scrie(page, '#at-on-relief', '1.5');
  await expect(nume(page)).toHaveText('Etichetă „ANA”, 70 × 26 mm, adâncit 1,5 mm');
  await expect(info(page)).toHaveText('Literele au 19,3 mm, cu linia de 2,6 mm. Sunt adânci de 1,5 mm.');
  let s = await descarca(page);
  expect([s.fisier, s.rele]).toEqual(['eticheta_ana_70_x_26_mm_adancit_1_5_mm.stl', 0]);
  aproape(s.dim, [70, 26, 3]);
  // pe o placă subțire, adâncimea lasă 0,6 mm dedesubt
  await scrie(page, '#at-on-grosime', '2');
  await expect(nume(page)).toHaveText('Etichetă „ANA”, 70 × 26 mm, adâncit 1,4 mm, 2 mm');
  await expect(page.locator('#at-on-relief')).toHaveValue('1.4');
  await scrie(page, '#at-on-grosime', '3');
  // decupat: fără relief; literele au cel puțin 8 mm, iar semnele cu ochi au punți
  await page.locator('#at-on-scris [data-v="decupat"]').click();
  await expect(nume(page)).toHaveText('Etichetă „ANA”, 70 × 26 mm, decupat');
  await expect(page.locator('#at-on-relief')).toHaveCount(0);
  await expect(info(page)).toHaveText('Literele au 19,3 mm, cu linia de 2,6 mm. Semnele cu ochi (ca A, B, O, 8) au câte o punte, ca mijlocul lor să nu cadă.');
  s = await descarca(page);
  expect([s.fisier, s.rele]).toEqual(['eticheta_ana_70_x_26_mm_decupat.stl', 0]);
  aproape(s.dim, [70, 26, 3]);
  // înapoi în relief: înălțimea scrisă rămâne
  await page.locator('#at-on-scris [data-v="relief"]').click();
  await expect(nume(page)).toHaveText('Etichetă „ANA”, 70 × 26 mm, în relief de 1,5');
  await expect(cote(page)).toContainText('70 × 26 × 4,5 mm');
  // un număr din afara marginilor nu e primit
  for (const [id, rau, bun] of [['relief', '5', '1.5'], ['relief', '0.1', '1.5'], ['lungime', '20', '70'], ['lungime', '300', '70'], ['inaltime', '90', '26'], ['inaltime', '5', '26'], ['grosime', '9', '3']] as const) {
    await scrie(page, `#at-on-${id}`, rau);
    await expect(page.locator(`#at-on-${id}`), `${id} = ${rau}`).toHaveValue(bun);
  }
  await scrie(page, '#at-on-inaltime', '40');
  await scrie(page, '#at-on-lungime', '120');
  await expect(nume(page)).toHaveText('Etichetă „ANA”, 120 × 40 mm, în relief de 1,5');
  await expect(cote(page)).toContainText('120 × 40 × 4,5 mm');
});

test('formele: eticheta, globul, inima și steaua, fiecare cu mărimea și agățătoarea ei', async ({ page }) => {
  await atelier(page);
  // globul: discul cu căpăcel și inel; o singură mărime
  await page.locator('#at-on-forma [data-v="glob"]').click();
  await expect(nume(page)).toHaveText('Glob „ANA”, de 60 mm');
  await expect(cote(page)).toContainText('60 × 70,4 × 3,8 mm');
  await expect(page.locator('#at-on-lungime')).toHaveCount(0);
  await expect(page.locator('#at-on-inaltime')).toHaveCount(0);
  await expect(page.locator('#at-on-diam')).toHaveValue('60');
  await expect(page.locator('label[for="at-on-diam"]')).toHaveText('Mărimea (mm)');
  await expect(page.locator('#at-on-ag button')).toHaveText(['Inel', 'Fără']);
  await expect(apasat(page, 'at-on-ag')).toHaveText('Inel');
  let s = await descarca(page);
  expect([s.fisier, s.rele]).toEqual(['glob_ana_de_60_mm.stl', 0]);
  aproape(s.dim, [60, 70.4, 3.8]);
  // inima: lobii până la r = 60 / 3,6, vârful la 2,2 · r sub ei, inelul pe tijă
  await page.locator('#at-on-forma [data-v="inima"]').click();
  await expect(nume(page)).toHaveText('Inimă „ANA”, de 60 mm');
  await expect(cote(page)).toContainText('60 × 58,3 × 3,8 mm');
  s = await descarca(page);
  expect([s.fisier, s.rele]).toEqual(['inima_ana_de_60_mm.stl', 0]);
  aproape(s.dim, [60, 3.2 * 60 / 3.6 + 5, 3.8]);
  await page.locator('#at-on-ag [data-v="fara"]').click();
  await expect(nume(page)).toHaveText('Inimă „ANA”, de 60 mm, fără inel');
  await expect(cote(page)).toContainText('60 × 53,3 × 3,8 mm');
  // steaua: mai mare și mai subțire
  await page.locator('#at-on-forma [data-v="stea"]').click();
  await scrie(page, '#at-on-diam', '100');
  await scrie(page, '#at-on-grosime', '2');
  await expect(nume(page)).toHaveText('Stea „ANA”, de 100 mm, 2 mm, fără inel');
  await expect(cote(page)).toContainText('95,1 × 90,5 × 2,8 mm');
  await page.locator('#at-on-ag [data-v="inel"]').click();
  await expect(nume(page)).toHaveText('Stea „ANA”, de 100 mm, 2 mm');
  await expect(cote(page)).toContainText('95,1 × 95,5 × 2,8 mm');
  s = await descarca(page);
  expect(s.rele).toBe(0);
  for (const [rau, bun] of [['20', '100'], ['200', '100']] as const) { await scrie(page, '#at-on-diam', rau); await expect(page.locator('#at-on-diam')).toHaveValue(bun); }
  // înapoi la etichetă: mărimile ei au rămas; fără gaură
  await page.locator('#at-on-forma [data-v="eticheta"]').click();
  await expect(nume(page)).toHaveText('Etichetă „ANA”, 70 × 26 mm, 2 mm');
  await expect(apasat(page, 'at-on-ag')).toHaveText('Gaură');
  await page.locator('#at-on-ag [data-v="fara"]').click();
  await expect(nume(page)).toHaveText('Etichetă „ANA”, 70 × 26 mm, 2 mm, fără gaură');
  // fără gaură, numele stă la mijlocul etichetei: colțurile teșite din stânga îl țin cu două zecimi mai mic
  await expect(info(page)).toContainText('Literele au 19,1 mm');
});

test('lista: același nume scris altfel e aceeași piesă; două forme fără nume, oricum ar fi fost scrisul, la fel', async ({ page }) => {
  await atelier(page);
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  await scrie(page, '#at-on-text', ' ana ');
  await expect(nume(page)).toHaveText('Etichetă „ANA”, 70 × 26 mm');
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  const rand = page.locator('#at-lista tr', { hasText: 'Etichetă „ANA”, 70 × 26 mm' });
  await expect(rand).toHaveCount(1);
  await expect(rand.locator('.pas-n')).toHaveText('2');
  await expect(page.locator('#at-lista')).toContainText('70 × 26 × 3,8');
  // mărimea ținută minte a altei forme nu intră în etichetă: e tot aceeași piesă
  await page.locator('#at-on-forma [data-v="glob"]').click();
  await scrie(page, '#at-on-diam', '80');
  await expect(nume(page)).toHaveText('Glob „ANA”, de 80 mm');
  await page.locator('#at-on-forma [data-v="eticheta"]').click();
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  await expect(rand).toHaveCount(1);
  await expect(rand.locator('.pas-n')).toHaveText('3');
  // fără nume: scrisul și relieful ținute minte nu intră în piesă
  await scrie(page, '#at-on-text', '');
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  await scrie(page, '#at-on-text', 'x');
  await page.locator('#at-on-scris [data-v="adancit"]').click();
  await scrie(page, '#at-on-relief', '1.2');
  await scrie(page, '#at-on-text', '');
  await expect(nume(page)).toHaveText('Etichetă fără nume, 70 × 26 mm');
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  const gol = page.locator('#at-lista tr', { hasText: 'Etichetă fără nume, 70 × 26 mm' });
  await expect(gol).toHaveCount(1);
  await expect(gol.locator('.pas-n')).toHaveText('2');
  // decupat, relieful ținut minte nu intră în piesă: e aceeași cu cea decupată de la început
  await scrie(page, '#at-on-text', 'ion');
  await page.locator('#at-on-scris [data-v="decupat"]').click();
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  await page.locator('#at-on-scris [data-v="relief"]').click();
  await scrie(page, '#at-on-relief', '2');
  await page.locator('#at-on-scris [data-v="decupat"]').click();
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  const ion = page.locator('#at-lista tr', { hasText: 'Etichetă „ION”, 70 × 26 mm, decupat' });
  await expect(ion).toHaveCount(1);
  await expect(ion.locator('.pas-n')).toHaveText('2');
});
