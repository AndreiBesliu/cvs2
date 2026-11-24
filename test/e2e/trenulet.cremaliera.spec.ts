/**
 * Cremaliera în atelierul Easy 3Draw (ADR 0284, felia 3.Cc), pe pagina de sine stătătoare a planificatorului (din aceleași
 * surse ca pachetul):
 * - piesa nouă din fila Roți: cremaliera 1 × 4 pe știfturi, pentru roata de 8 (10 dinți, 31,8 × 7,8 × 6 mm), cu montajul
 *   ei scris (unde stă axul roții și cât înaintează cremaliera la o rotație);
 * - configuratorul: lungimea, roata pereche, modulul și prinderea schimbă numele, cotele și montajul, pe hârtie; un număr
 *   din afara marginilor nu e primit;
 * - STL-ul descărcat e închis și are cotele de pe hârtie;
 * - „Fă perechea” pune în listă cremaliera și roata ei, aceeași piesă cu roata făcută în editorul roților.
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
  await page.locator('#at-galerie [data-piesa="cremaliera"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Cremalieră 1×4, roata de 8');
}
const nume = (page: Page) => page.locator('#at-nume-piesa');
const cote = (page: Page) => page.locator('#at-cote');
const montaj = (page: Page) => page.locator('#at-crm-montaj');
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

test('piesa nouă din fila Roți: cremaliera 1 × 4 pe știfturi, pentru roata de 8, cu montajul ei', async ({ page }) => {
  await atelier(page);
  await expect(cote(page)).toContainText('31,8 × 7,8 × 6 mm');
  await expect(page.locator('#at-avert')).toBeHidden();
  await expect(page.locator('#at-crm-lung')).toHaveValue('4');
  await expect(page.locator('#at-crm-roata')).toHaveValue('8');
  await expect(page.locator('#at-crm-modul')).toHaveValue('1');
  await expect(page.locator('#at-crm-prindere [aria-pressed="true"]')).toHaveText('Pe știfturi');
  await expect(page.locator('#at-crm-prindere button')).toHaveText(['Pe știfturi', 'Cu găuri de știft']);
  // pe hârtie: 10 dinți; linia de divizare la 5 mm, deci axul roții de 8 (raza 4) la 9 mm = 5,8 + 3,2 (o placă); π · 8 = 25,1
  await expect(montaj(page)).toHaveText('10 dinți. Axul roții de 8 stă la 9 mm deasupra feței de jos a cremalierei: într-o cărămidă Technic ridicată cu o placă față de cremalieră. La o rotație a roții, cremaliera înaintează 25,1 mm.');
});

test('configuratorul: lungimea, roata pereche, modulul și prinderea, cu numele, cotele și montajul de pe hârtie', async ({ page }) => {
  await atelier(page);
  // lungimea 8: 20 de dinți
  await scrie(page, '#at-crm-lung', '8');
  await expect(nume(page)).toHaveText('Cremalieră 1×8, roata de 8');
  await expect(cote(page)).toContainText('63,8 × 7,8 × 6 mm');
  await expect(montaj(page)).toContainText('20 dinți.');
  // roata de 16: cărămida, cu trei plăci mai sus; linia de divizare la 7,4, deci piesa are 8,4 mm
  await scrie(page, '#at-crm-roata', '16');
  await expect(nume(page)).toHaveText('Cremalieră 1×8, roata de 16');
  await expect(cote(page)).toContainText('63,8 × 7,8 × 8,4 mm');
  await expect(montaj(page)).toHaveText('20 dinți. Axul roții de 16 stă la 15,4 mm deasupra feței de jos a cremalierei: într-o cărămidă Technic ridicată cu 3 plăci față de cremalieră. La o rotație a roții, cremaliera înaintează 50,3 mm.');
  // cu găuri: axul pe al doilea rând de găuri de deasupra; linia de divizare la 11,9
  await page.locator('#at-crm-prindere [data-v="gauri"]').click();
  await expect(nume(page)).toHaveText('Cremalieră 1×8, roata de 16, cu găuri');
  await expect(cote(page)).toContainText('63,8 × 7,8 × 12,9 mm');
  await expect(page.locator('#at-crm-prindere [aria-pressed="true"]')).toHaveText('Cu găuri de știft');
  await expect(montaj(page)).toHaveText('20 dinți. Axul roții de 16 stă la 19,9 mm deasupra feței de jos a cremalierei: în găurile de la 2 pași (16 mm) deasupra găurilor cremalierei. La o rotație a roții, cremaliera înaintează 50,3 mm.');
  // modulul 1,5: dinții mai mari (13 pe 8 știfturi), roata de 16 are raza 12, deci axul urcă pe al treilea rând
  await scrie(page, '#at-crm-modul', '1.5');
  await expect(nume(page)).toHaveText('Cremalieră 1×8, roata de 16, cu găuri, modul 1,5');
  await expect(cote(page)).toContainText('63,8 × 7,8 × 17,4 mm');
  await expect(montaj(page)).toHaveText('13 dinți. Axul roții de 16 stă la 27,9 mm deasupra feței de jos a cremalierei: în găurile de la 3 pași (24 mm) deasupra găurilor cremalierei. La o rotație a roții, cremaliera înaintează 75,4 mm.');
  // modulul 0,5 și roata de 8: un singur pas
  await scrie(page, '#at-crm-modul', '0.5');
  await scrie(page, '#at-crm-roata', '8');
  await expect(nume(page)).toHaveText('Cremalieră 1×8, roata de 8, cu găuri, modul 0,5');
  await expect(montaj(page)).toContainText('în găurile de la 1 pas (8 mm) deasupra găurilor cremalierei');
  // ce e în afara marginilor nu e primit: câmpul se întoarce la ce era
  for (const [id, rau, bun] of [['#at-crm-lung', '30', '8'], ['#at-crm-lung', '1', '8'], ['#at-crm-lung', '', '8'], ['#at-crm-roata', '5', '8'], ['#at-crm-roata', '90', '8'], ['#at-crm-modul', '4', '0.5'], ['#at-crm-modul', '0.2', '0.5']] as const) {
    await scrie(page, id, rau);
    await expect(page.locator(id), `${id} „${rau}”`).toHaveValue(bun);
    await expect(nume(page), `${id} „${rau}”`).toHaveText('Cremalieră 1×8, roata de 8, cu găuri, modul 0,5');
    await expect(page.locator('#at-avert'), `${id} „${rau}”`).toBeHidden();
  }
  // nimic refuzat n-a rămas în stare: o schimbare bună reface piesa fără niciun avertisment
  await scrie(page, '#at-crm-lung', '9');
  await expect(cote(page)).toContainText('71,8 × 7,8');
  await expect(nume(page)).toHaveText('Cremalieră 1×9, roata de 8, cu găuri, modul 0,5');
  await expect(page.locator('#at-avert')).toBeHidden();
  await scrie(page, '#at-crm-lung', '8');
  // marginile de jos, judecate de la alte valori decât cele la care motorul ar îndrepta oricum (8 dinți, modulul 0,5)
  await scrie(page, '#at-crm-roata', '16');
  await scrie(page, '#at-crm-modul', '1');
  await expect(nume(page)).toHaveText('Cremalieră 1×8, roata de 16, cu găuri');
  for (const [id, rau, bun] of [['#at-crm-roata', '5', '16'], ['#at-crm-roata', '7', '16'], ['#at-crm-modul', '0.2', '1'], ['#at-crm-modul', '0.4', '1']] as const) {
    await scrie(page, id, rau);
    await expect(page.locator(id), `${id} „${rau}”`).toHaveValue(bun);
    await expect(nume(page), `${id} „${rau}”`).toHaveText('Cremalieră 1×8, roata de 16, cu găuri');
  }
  // înapoi pe știfturi, cu modulul 1 și roata de 40: șase plăci
  await page.locator('#at-crm-prindere [data-v="stifturi"]').click();
  await scrie(page, '#at-crm-roata', '40');
  await expect(nume(page)).toHaveText('Cremalieră 1×8, roata de 40');
  await expect(montaj(page)).toContainText('stă la 25 mm deasupra feței de jos a cremalierei: într-o cărămidă Technic ridicată cu 6 plăci față de cremalieră');
  await expect(cote(page)).toContainText('63,8 × 7,8 × 6 mm');
  await expect(page.locator('#at-avert')).toBeHidden();
});

test('STL-ul cremalierei e închis și are cotele de pe hârtie, la amândouă prinderile', async ({ page }) => {
  await atelier(page);
  const descarca = async () => {
    const d = page.waitForEvent('download');
    await page.locator('#at-stl').click();
    const f = await d;
    return { nume: f.suggestedFilename(), ...citesteStl(readFileSync(await f.path())) };
  };
  const a = await descarca();
  expect(a.nume).toBe('cremaliera_1x4_roata_de_8.stl');
  expect(a.rele).toBe(0);
  expect(a.dim).toEqual([31.8, 7.8, 6]);
  expect(a.triunghiuri).toBeGreaterThan(300);
  await page.locator('#at-crm-prindere [data-v="gauri"]').click();
  await scrie(page, '#at-crm-roata', '20');
  await expect(nume(page)).toHaveText('Cremalieră 1×4, roata de 20, cu găuri');
  const b = await descarca();
  expect(b.nume).toBe('cremaliera_1x4_roata_de_20_cu_gauri.stl');
  expect(b.rele).toBe(0);
  // linia de divizare la 3,9 + 16 − 10 = 9,9; cu capul dintelui, 10,9
  expect(b.dim).toEqual([31.8, 7.8, 10.9]);
});

test('„Fă perechea” pune în listă cremaliera și roata ei; roata e aceeași piesă cu cea din editorul roților', async ({ page }) => {
  await atelier(page);
  await scrie(page, '#at-crm-roata', '16');
  await page.locator('#at-crm-fa-pereche').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Cremalieră 1×4, roata de 16', 'Roată dințată 16']);
  await expect(page.locator('#at-lista tr td:nth-child(2)')).toHaveText(['31,8 × 7,8 × 8,4', '18 × 18 × 3,8']);
  await expect(page.locator('#at-toast')).toContainText('cremaliera 1×4 și roata de 16 în listă (axul roții la 15,4 mm deasupra feței de jos)');
  // aceeași roată, făcută în editorul roților, se adună cu cea din pereche
  await page.locator('#at-galerie [data-piesa="rotita"]').click();
  await page.locator('#at-r-repede [data-v="16"]').click();
  await expect(nume(page)).toHaveText('Roată dințată 16');
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr[data-id]')).toHaveCount(2);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['1', '2']);
  // cu modulul 1,5, perechea are roata cu modulul ei: altă piesă
  await page.locator('#at-galerie [data-piesa="cremaliera"]').click();
  await scrie(page, '#at-crm-modul', '1.5');
  await page.locator('#at-crm-fa-pereche').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Cremalieră 1×4, roata de 16', 'Roată dințată 16', 'Cremalieră 1×4, roata de 16, modul 1,5', 'Roată dințată 16, modulul 1,5']);
  // în model, cremaliera stă pe grilă
  await page.locator('#at-in-model').click();
  await expect(page.locator('#at-m-lista li')).toHaveText([/^Cremalieră 1×4, roata de 16, modul 1,5/]);
});
