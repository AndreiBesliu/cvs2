/**
 * Balamaua în atelierul Easy 3Draw (ADR 0284, felia 3.Ck-2), pe pagina de sine stătătoare a planificatorului (din
 * aceleași surse ca pachetul):
 * - piesa nouă din fila Cărămizi: jumătatea cu bolțul, de 1 × 2, cu bolțul și clema din calibrare scrise;
 * - configuratorul: jumătatea (cu bolțul sau cu clema), lățimea, lungimea, jocul clemei (doar la ea), cu numele, cotele
 *   și textul de pe hârtie; un joc din afara marginilor nu e primit, iar unul cu mai multe zecimale e adus din 0,05 în
 *   0,05;
 * - STL-urile descărcate sunt închise și au cotele de pe hârtie; „Fă balamaua” pune în listă amândouă jumătățile; „Se
 *   prinde cu” arată bolțul (o bară, în care intră clema) și clemele;
 * - o construcție din stocare cu jumătatea cu bolțul scrisă cu un joc (de mână: pagina nu-l pune) își numește piesa fără
 *   el: jocul e al clemei, nu al bolțului.
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
  await page.locator('#at-galerie [data-piesa="balama"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Balama 1×2, cu bolțul');
}
const nume = (page: Page) => page.locator('#at-nume-piesa');
const cote = (page: Page) => page.locator('#at-cote');
const info = (page: Page) => page.locator('#at-bm-info');
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
async function stl(page: Page): Promise<{ rele: number; dim: number[] }> {
  const [d] = await Promise.all([page.waitForEvent('download'), page.locator('#at-stl').click()]);
  return citesteStl(readFileSync(await d.path()));
}
const PLIERE = 'Se pliază de la 110° în jos până la 130° în sus.';
const SFAT = 'Dacă clema se rotește prea greu, mărește jocul clemei cu 0,05 mm; dacă nu stă unde o lași, micșorează-l.';
/** Textul de sub configurator: bolțul de Ø3,2 în clema de Ø(3,3 + 2 · jocul). */
const text = (clema: string, jocRadial: string, ales = false) =>
  `Bolțul are Ø3,2 mm, iar clema${ales ? ', cu jocul ales,' : ' din calibrare,'} Ø${clema} mm: ${jocRadial} mm de jur împrejur. ${PLIERE} ${SFAT}`;

test('piesa nouă din fila Cărămizi: jumătatea cu bolțul, de 1 × 2, cu bolțul de Ø3,2 și clema de Ø3,3 din calibrare', async ({ page }) => {
  await atelier(page);
  await expect(page.locator('#at-tipuri [data-fila="caramizi"]')).toHaveText('Cărămizi 14');
  // placa 1 × 2 (2 · 8 − 0,2) și capătul cu bolțul: axa la 8 · 2 + 4, bolțul (1,6) și obrazul (1) dincolo de ea;
  // în înălțime, știfturile (3,2 + 1,9) trec de obraji (2,75 + 1,6 + 0,6)
  await expect(cote(page)).toContainText('22,5 × 7,8 × 5,1 mm');
  await expect(page.locator('#at-avert')).toBeHidden();
  await expect(page.locator('#at-editor h2')).toHaveText('Balama');
  await expect(page.locator('#at-bm-piesa button')).toHaveText(['Cu bolțul', 'Cu clema']);
  await expect(apasat(page, 'at-bm-piesa')).toHaveText('Cu bolțul');
  await expect(page.locator('#at-bm-latime button')).toHaveText(['1 știft', '2 știfturi']);
  await expect(apasat(page, 'at-bm-latime')).toHaveText('1 știft');
  await expect(page.locator('#at-bm-lungime button')).toHaveText(['1', '2', '3', '4']);
  await expect(apasat(page, 'at-bm-lungime')).toHaveText('2');
  // jocul e al clemei: la bolț nu apare
  await expect(page.locator('#at-bm-joc')).toHaveCount(0);
  // (3,3 − 3,2) / 2 de jur împrejur
  await expect(info(page)).toHaveText(text('3,3', '0,05'));
});

test('configuratorul: jumătatea, lățimea, lungimea, jocul clemei, cu numele, cotele și textul de pe hârtie', async ({ page }) => {
  await atelier(page);
  // jumătatea cu clema: inelul (1,65 + 1,1 în jurul axei) iese cu 0,15 mai mult decât bolțul; sus, gura de 2,5 îl taie
  // la 2,75 + √(2,75² − 1,25²) = 5,2, peste știfturi
  await page.locator('#at-bm-piesa [data-v="clema"]').click();
  await expect(apasat(page, 'at-bm-piesa')).toHaveText('Cu clema');
  await expect(nume(page)).toHaveText('Balama 1×2, cu clema');
  await expect(cote(page)).toContainText('22,6 × 7,8 × 5,2 mm');
  await expect(page.locator('#at-bm-joc')).toHaveValue('0');
  await expect(info(page)).toHaveText(text('3,3', '0,05'));
  // 2 × 4: 4 · 8 + 4 + 2,65 și 2 · 8 − 0,2
  await page.locator('#at-bm-latime [data-v="2"]').click();
  await page.locator('#at-bm-lungime [data-v="4"]').click();
  await expect(apasat(page, 'at-bm-latime')).toHaveText('2 știfturi');
  await expect(apasat(page, 'at-bm-lungime')).toHaveText('4');
  await expect(nume(page)).toHaveText('Balama 2×4, cu clema');
  await expect(cote(page)).toContainText('38,6 × 15,8 × 5,2 mm');
  // jocul 0,1: clema de 3,5 (inelul rămâne același), 0,15 de jur împrejur
  await scrie(page, '#at-bm-joc', '0.1');
  await expect(nume(page)).toHaveText('Balama 2×4, cu clema, jocul 0,1');
  await expect(cote(page)).toContainText('38,6 × 15,8 × 5,2 mm');
  await expect(info(page)).toHaveText(text('3,5', '0,15', true));
  // jocul se schimbă din 0,05 în 0,05: 0,07 devine 0,05
  await scrie(page, '#at-bm-joc', '0.07');
  await expect(page.locator('#at-bm-joc')).toHaveValue('0.05');
  await expect(nume(page)).toHaveText('Balama 2×4, cu clema, jocul 0,05');
  // în afara marginilor, valoarea de dinainte rămâne
  for (const rau of ['0.25', '-0.15', '1']) {
    await scrie(page, '#at-bm-joc', rau);
    await expect(page.locator('#at-bm-joc'), rau).toHaveValue('0.05');
  }
  // marginile înseși sunt primite: −0,1 (clema de 3,1, mai strânsă decât bolțul) și 0,2 (de 3,7, largă)
  await scrie(page, '#at-bm-joc', '-0.1');
  await expect(nume(page)).toHaveText('Balama 2×4, cu clema, jocul -0,1');
  await expect(info(page)).toHaveText(text('3,1', '-0,05', true));
  await scrie(page, '#at-bm-joc', '0.2');
  await expect(nume(page)).toHaveText('Balama 2×4, cu clema, jocul 0,2');
  // jocul e al clemei: la bolț nu apare în nume, iar înapoi la clemă e tot cel ales
  await page.locator('#at-bm-piesa [data-v="bolt"]').click();
  await expect(nume(page)).toHaveText('Balama 2×4, cu bolțul');
  await expect(cote(page)).toContainText('38,5 × 15,8 × 5,1 mm');
  await expect(page.locator('#at-bm-joc')).toHaveCount(0);
  await page.locator('#at-bm-piesa [data-v="clema"]').click();
  await expect(page.locator('#at-bm-joc')).toHaveValue('0.2');
  await scrie(page, '#at-bm-joc', '0');
  await expect(nume(page)).toHaveText('Balama 2×4, cu clema');
  await expect(page.locator('#at-avert')).toBeHidden();
});

test('STL-urile sunt închise și au cotele de pe hârtie; „Fă balamaua” pune în listă amândouă jumătățile; bolțul e o bară, clemele intră pe ea', async ({ page }) => {
  await atelier(page);
  const bolt = await stl(page);
  expect(bolt.rele).toBe(0);
  expect(bolt.dim).toEqual([22.5, 7.8, 5.1]);
  await page.locator('#at-bm-piesa [data-v="clema"]').click();
  const clema = await stl(page);
  expect(clema.rele).toBe(0);
  expect(clema.dim).toEqual([22.65, 7.8, 5.2]);
  await page.locator('#at-bm-fa').click();
  await expect(page.locator('#at-toast')).toHaveText('1 × balamaua (jumătatea cu bolțul și cea cu clema) în listă.');
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Balama 1×2, cu bolțul', 'Balama 1×2, cu clema']);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['1', '1']);
  // cu jocul 0,2: clema e altă piesă (rând nou), bolțul e același (jocul e al clemei), deci se adună pe rândul lui, ca și
  // cel făcut din editor
  await scrie(page, '#at-bm-joc', '0.2');
  await page.locator('#at-bm-fa').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Balama 1×2, cu bolțul', 'Balama 1×2, cu clema', 'Balama 1×2, cu clema, jocul 0,2']);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['2', '1', '1']);
  await page.locator('#at-bm-piesa [data-v="bolt"]').click();
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['3', '1', '1']);
  // prinderile: ale plăcii, plus bolțul (o bară, între obraji) sau clema
  await expect(page.locator('#at-prinde-are')).toHaveText('2 știfturi · 2 locașuri · 1 bară');
  await page.locator('#at-prinde summary').click();
  await expect(page.locator('#at-prinde-lista [data-rand="bara"] [data-prinde="clema"]')).toHaveCount(1);
  await page.locator('#at-bm-piesa [data-v="clema"]').click();
  await expect(page.locator('#at-prinde-are')).toHaveText('2 știfturi · 2 locașuri · 1 clemă');
  // (balamaua de pe ecran nu se propune pe ea însăși: în clemă intră barele celorlalte piese)
  await expect(page.locator('#at-prinde-lista [data-rand="clema"] button')).toHaveText(['Bară', 'Mâner', 'Șenilă']);
  // pe 2 știfturi lățime: două cleme; la bolț, tot o bară, cu două locuri libere pe ea
  await page.locator('#at-bm-latime [data-v="2"]').click();
  await expect(page.locator('#at-prinde-are')).toHaveText('4 știfturi · 4 locașuri · 2 cleme');
  await page.locator('#at-bm-piesa [data-v="bolt"]').click();
  await expect(page.locator('#at-prinde-are')).toHaveText('4 știfturi · 4 locașuri · 1 bară');
});

test('o construcție din stocare cu bolțul scris cu un joc își numește piesa fără el; clema, cu jocul ei', async ({ page }) => {
  const piesa = (id: string, def: object, z: number) => ({ id, def, x: 0, y: 0, z, rot: 0, culoare: '#2b6cc8' });
  await cuStocare(page, {
    constructii: [{ id: 'a', nume: '', nr: 1, model: [
      piesa('b', { tip: 'balama', piesa: 'bolt', latime: 1, lungime: 2, joc: 0.1 }, 0),
      piesa('c', { tip: 'balama', piesa: 'clema', latime: 1, lungime: 2, joc: 0.1 }, 1),
    ] }],
    activa: 'a',
  });
  await page.locator('#at-vedere-mod [data-v="model"]').click();
  await expect(page.locator('#at-c-piese tbody tr td:first-child')).toHaveText(['Balama 1×2, cu bolțul', 'Balama 1×2, cu clema, jocul 0,1']);
});
