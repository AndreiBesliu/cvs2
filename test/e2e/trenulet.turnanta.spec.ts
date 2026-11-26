/**
 * Placa turnantă în atelierul Easy 3Draw (ADR 0284, felia 3.Ck-1), pe pagina de sine stătătoare a planificatorului (din
 * aceleași surse ca pachetul):
 * - piesa nouă din fila Cărămizi: baza de 2 × 2, cu pivotul și jocul lui scrise;
 * - configuratorul: baza sau partea de sus, mărimea, jocul pivotului (doar la bază), cu numele, cotele și textul de pe
 *   hârtie; un joc din afara marginilor nu e primit, iar unul cu mai multe zecimale e adus din 0,05 în 0,05;
 * - STL-ul descărcat e închis și are cotele de pe hârtie; „Fă placa turnantă” pune în listă amândouă piesele; „Se prinde
 *   cu” arată pivotul (un capăt de știft Technic);
 * - o construcție din stocare cu partea de sus scrisă cu un joc (de mână: pagina nu-l pune) își numește piesa fără el:
 *   jocul e al pivotului, nu al părții de sus.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

const PAGINA = 'http://easy3draw.test/';
const CHEIE = 'atelier.caramizi.v1';

/** Pagina planificatorului, servită de pe o origine a probei, cu stocarea dată, în partea 3D. */
async function cuStocare(page: Page, stocat: unknown): Promise<void> {
  const { preview } = paginiPlanificator();
  await page.route(PAGINA, (r) => r.fulfill({ body: preview, contentType: 'text/html; charset=utf-8' }));
  await threeDinPachet(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(([k, s]) => { localStorage.setItem(k, s); }, [CHEIE, JSON.stringify(stocat)] as const);
  await page.goto(PAGINA);
  await intraIn3D(page);
}
async function atelier(page: Page): Promise<void> {
  await threeDinPachet(page);
  await page.setContent(paginiPlanificator().preview);
  await intraIn3D(page);
  await page.locator('#at-tipuri [data-fila="caramizi"]').click();
  await page.locator('#at-galerie [data-piesa="turnanta"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Placă turnantă 2×2, baza');
}
const nume = (page: Page) => page.locator('#at-nume-piesa');
const cote = (page: Page) => page.locator('#at-cote');
const info = (page: Page) => page.locator('#at-tu-info');
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
const SFAT = 'Dacă partea de sus se rotește prea greu, mărește jocul pivotului cu 0,05 mm; dacă iese prea ușor de pe pivot, micșorează-l.';

test('piesa nouă din fila Cărămizi: baza plăcii turnante de 2 × 2, cu pivotul de Ø4,75 în gaura de Ø5 din calibrare', async ({ page }) => {
  await atelier(page);
  await expect(page.locator('#at-tipuri [data-fila="caramizi"]')).toHaveText('Cărămizi 14');
  // 2 · 8 − 0,2 pe fiecare latură; placa (3,2) și pivotul (3,1)
  await expect(cote(page)).toContainText('15,8 × 15,8 × 6,3 mm');
  await expect(page.locator('#at-avert')).toBeHidden();
  await expect(page.locator('#at-editor h2')).toHaveText('Placă turnantă');
  await expect(page.locator('#at-tu-piesa button')).toHaveText(['Baza', 'Partea de sus']);
  await expect(apasat(page, 'at-tu-piesa')).toHaveText('Baza');
  await expect(page.locator('#at-tu-marime button')).toHaveText(['2 × 2', '4 × 4']);
  await expect(apasat(page, 'at-tu-marime')).toHaveText('2 × 2');
  await expect(page.locator('#at-tu-joc')).toHaveValue('0');
  // (5 − 4,75) / 2 de jur împrejur
  await expect(info(page)).toHaveText(`Pivotul are Ø4,75 mm, iar gaura din calibrare, Ø5 mm: 0,125 mm de jur împrejur. ${SFAT}`);
});

test('configuratorul: baza sau partea de sus, mărimea, jocul pivotului, cu numele, cotele și textul de pe hârtie', async ({ page }) => {
  await atelier(page);
  // partea de sus: placa cu știfturi (3,2 și 1,9), fără câmpul jocului; textul spune tot pivotul bazei
  await page.locator('#at-tu-piesa [data-v="sus"]').click();
  await expect(apasat(page, 'at-tu-piesa')).toHaveText('Partea de sus');
  await expect(nume(page)).toHaveText('Placă turnantă 2×2, partea de sus');
  await expect(cote(page)).toContainText('15,8 × 15,8 × 5,1 mm');
  await expect(page.locator('#at-tu-joc')).toHaveCount(0);
  await expect(info(page)).toHaveText(`Pivotul are Ø4,75 mm, iar gaura din calibrare, Ø5 mm: 0,125 mm de jur împrejur. ${SFAT}`);
  await page.locator('#at-tu-marime [data-v="4"]').click();
  await expect(apasat(page, 'at-tu-marime')).toHaveText('4 × 4');
  await expect(nume(page)).toHaveText('Placă turnantă 4×4, partea de sus');
  await expect(cote(page)).toContainText('31,8 × 31,8 × 5,1 mm');
  // baza de 4 × 4, cu jocul 0,1: pivotul de 4,55, deci 0,225 de jur împrejur
  await page.locator('#at-tu-piesa [data-v="baza"]').click();
  await expect(nume(page)).toHaveText('Placă turnantă 4×4, baza');
  await expect(cote(page)).toContainText('31,8 × 31,8 × 6,3 mm');
  await scrie(page, '#at-tu-joc', '0.1');
  await expect(nume(page)).toHaveText('Placă turnantă 4×4, baza, jocul 0,1');
  await expect(info(page)).toHaveText(`Pivotul are Ø4,55 mm, iar gaura din calibrare, Ø5 mm: 0,225 mm de jur împrejur. ${SFAT}`);
  // jocul se schimbă din 0,05 în 0,05: 0,07 devine 0,05
  await scrie(page, '#at-tu-joc', '0.07');
  await expect(page.locator('#at-tu-joc')).toHaveValue('0.05');
  await expect(nume(page)).toHaveText('Placă turnantă 4×4, baza, jocul 0,05');
  // în afara marginilor, valoarea de dinainte rămâne
  for (const rau of ['0.25', '-0.15', '1']) {
    await scrie(page, '#at-tu-joc', rau);
    await expect(page.locator('#at-tu-joc'), rau).toHaveValue('0.05');
  }
  // marginile înseși sunt primite: −0,1 (pivotul de 4,95, strâns) și 0,2 (de 4,35, larg)
  await scrie(page, '#at-tu-joc', '-0.1');
  await expect(nume(page)).toHaveText('Placă turnantă 4×4, baza, jocul -0,1');
  await expect(info(page)).toHaveText(`Pivotul are Ø4,95 mm, iar gaura din calibrare, Ø5 mm: 0,025 mm de jur împrejur. ${SFAT}`);
  await scrie(page, '#at-tu-joc', '0.2');
  await expect(nume(page)).toHaveText('Placă turnantă 4×4, baza, jocul 0,2');
  // jocul e al pivotului: la partea de sus nu apare în nume, iar înapoi la bază e tot cel ales
  await page.locator('#at-tu-piesa [data-v="sus"]').click();
  await expect(nume(page)).toHaveText('Placă turnantă 4×4, partea de sus');
  await page.locator('#at-tu-piesa [data-v="baza"]').click();
  await expect(page.locator('#at-tu-joc')).toHaveValue('0.2');
  await scrie(page, '#at-tu-joc', '0');
  await expect(nume(page)).toHaveText('Placă turnantă 4×4, baza');
  await expect(page.locator('#at-avert')).toBeHidden();
});

test('STL-ul bazei e închis și are cotele de pe hârtie; „Fă placa turnantă” pune în listă amândouă piesele; pivotul se prinde ca un știft Technic', async ({ page }) => {
  await atelier(page);
  const [d] = await Promise.all([page.waitForEvent('download'), page.locator('#at-stl').click()]);
  const stl = citesteStl(readFileSync(await d.path()));
  expect(stl.rele).toBe(0);
  expect(stl.dim).toEqual([15.8, 15.8, 6.3]);
  await page.locator('#at-tu-fa').click();
  await expect(page.locator('#at-toast')).toHaveText('1 × placa turnantă (baza și partea de sus) în listă.');
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Placă turnantă 2×2, baza', 'Placă turnantă 2×2, partea de sus']);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['1', '1']);
  // cu jocul 0,2: baza e altă piesă (rând nou), partea de sus e aceeași (jocul e al pivotului), deci se adună pe rândul ei,
  // ca și cea făcută din editor
  await scrie(page, '#at-tu-joc', '0.2');
  await page.locator('#at-tu-fa').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Placă turnantă 2×2, baza', 'Placă turnantă 2×2, partea de sus', 'Placă turnantă 2×2, baza, jocul 0,2']);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['1', '2', '1']);
  await page.locator('#at-tu-piesa [data-v="sus"]').click();
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['1', '3', '1']);
  // prinderile: partea de sus, ale plăcii cu gaură; baza, locașurile și pivotul (în găurile de știft)
  await expect(page.locator('#at-prinde-are')).toHaveText('4 știfturi · 4 locașuri · 1 gaură de știft');
  await page.locator('#at-tu-piesa [data-v="baza"]').click();
  await expect(page.locator('#at-prinde-are')).toHaveText('4 locașuri · 1 știft Technic');
  await page.locator('#at-prinde summary').click();
  await expect(page.locator('#at-prinde-lista [data-rand="stiftTechnic"] [data-prinde="grinda"]')).toHaveCount(1);
});

test('o construcție din stocare cu partea de sus scrisă cu un joc își numește piesa fără el; baza, cu jocul ei', async ({ page }) => {
  const piesa = (id: string, def: object, z: number) => ({ id, def, x: 0, y: 0, z, rot: 0, culoare: '#2b6cc8' });
  await cuStocare(page, {
    constructii: [{ id: 'a', nume: '', nr: 1, model: [
      piesa('b', { tip: 'turnanta', piesa: 'baza', marime: 2, joc: 0.1 }, 0),
      piesa('s', { tip: 'turnanta', piesa: 'sus', marime: 2, joc: 0.1 }, 1),
    ] }],
    activa: 'a',
  });
  await page.locator('#at-vedere-mod [data-v="model"]').click();
  await expect(page.locator('#at-c-piese tbody tr td:first-child')).toHaveText(['Placă turnantă 2×2, baza, jocul 0,1', 'Placă turnantă 2×2, partea de sus']);
});
