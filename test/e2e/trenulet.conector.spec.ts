/**
 * Conectorul perpendicular în atelierul Easy 3Draw (ADR 0284, felia 3.Ca), pe pagina de sine stătătoare a planificatorului
 * (din aceleași surse ca pachetul):
 * - piesa nouă, în fila Legături: crucea 1 × 2 („ax sus, știft lateral”), 15,8 × 7,8 × 7,8 mm, fără avertisment;
 * - configuratorul: lungimea (1–5), formele gata („Repede”) și, pe fiecare pas, felul găurii și axa ei; „În lung” se poate
 *   alege doar la capete, iar un pas ajuns la mijloc își pierde gaura în lung (trece în sus); un pas plin n-are axă;
 * - STL-ul descărcat e închis și are cotele blocului; piesa intră în listă cu numele pașilor și se poate pune în model;
 * - blocul fără nicio gaură se spune.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

async function atelierConector(page: Page): Promise<void> {
  await threeDinPachet(page);
  await page.setContent(paginiPlanificator().preview);
  await intraIn3D(page);
  await page.locator('#at-tipuri [data-fila="legaturi"]').click();
  await page.locator('#at-galerie [data-piesa="conector"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Conector 1×2: ax sus, știft lateral');
}
const nume = (page: Page) => page.locator('#at-nume-piesa');
/** Butoanele unui rând de alegeri (segment), după text. */
const alegeri = (page: Page, id: string) => page.locator(`#${id} button`);

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

test('piesa nouă din fila Legături: crucea 1 × 2, cu cotele blocului, fără avertisment; formele gata', async ({ page }) => {
  await atelierConector(page);
  await expect(page.locator('#at-cote')).toContainText('15,8 × 7,8 × 7,8 mm');
  await expect(page.locator('#at-avert')).toBeHidden();
  await expect(page.locator('#at-co-lung [aria-pressed="true"]')).toHaveText('2');
  await expect(page.locator('#at-co-repede [aria-pressed="true"]')).toHaveText('Cruce 1×2');
  await expect(alegeri(page, 'at-co-repede')).toHaveText(['Cruce 1×2', 'Ax–știft–ax', 'Două știfturi și ax', 'Colț pe trei axe']);
  // formele gata
  await page.locator('#at-co-repede [data-v="axe"]').click();
  await expect(nume(page)).toHaveText('Conector 1×3: ax sus, știft lateral, ax sus');
  await expect(page.locator('#at-cote')).toContainText('23,8 × 7,8 × 7,8 mm');
  await page.locator('#at-co-repede [data-v="stifturi"]').click();
  await expect(nume(page)).toHaveText('Conector 1×3: știft sus, știft sus, ax lateral');
  await page.locator('#at-co-repede [data-v="colt"]').click();
  await expect(nume(page)).toHaveText('Conector 1×3: ax în lung, știft sus, știft lateral');
  await expect(page.locator('#at-co-repede [aria-pressed="true"]')).toHaveText('Colț pe trei axe');
  await expect(page.locator('#at-avert')).toBeHidden();
});

test('configuratorul: lungimea, felul și axa fiecărui pas; „În lung” doar la capete; un pas plin n-are axă', async ({ page }) => {
  await atelierConector(page);
  // două capete: amândoi pașii pot avea gaura în lung
  await expect(alegeri(page, 'at-co-axa-0')).toHaveText(['În sus', 'De-a latul', 'În lung']);
  await expect(alegeri(page, 'at-co-axa-1')).toHaveText(['În sus', 'De-a latul', 'În lung']);
  // felul se schimbă, axa rămâne: știftul de-a latul devine ax de-a latul, și înapoi
  await page.locator('#at-co-tip-1 [data-v="x"]').click();
  await expect(nume(page)).toHaveText('Conector 1×2: ax sus, ax lateral');
  await page.locator('#at-co-tip-1 [data-v="r"]').click();
  await expect(nume(page)).toHaveText('Conector 1×2: ax sus, știft lateral');
  // lungimea 3: pasul nou e o gaură de știft în sus; cel din mijloc nu mai are „În lung”
  await page.locator('#at-co-lung [data-v="3"]').click();
  await expect(nume(page)).toHaveText('Conector 1×3: ax sus, știft lateral, știft sus');
  await expect(page.locator('#at-co-pasi .at-rand')).toHaveCount(3);
  await expect(alegeri(page, 'at-co-axa-1')).toHaveText(['În sus', 'De-a latul']);
  await expect(alegeri(page, 'at-co-axa-2')).toHaveText(['În sus', 'De-a latul', 'În lung']);
  // o formă făcută de mână nu e una dintre cele gata
  await expect(page.locator('#at-co-repede [aria-pressed="true"]')).toHaveCount(0);
  // pasul 3: ax, în lung
  await page.locator('#at-co-tip-2 [data-v="x"]').click();
  await page.locator('#at-co-axa-2 [data-v="l"]').click();
  await expect(nume(page)).toHaveText('Conector 1×3: ax sus, știft lateral, ax în lung');
  await expect(page.locator('#at-co-axa-2 [aria-pressed="true"]')).toHaveText('În lung');
  // pasul 2: plin, deci fără axă; înapoi la știft, își ține axa de dinainte
  await page.locator('#at-co-tip-1 [data-v="p"]').click();
  await expect(nume(page)).toHaveText('Conector 1×3: ax sus, plin, ax în lung');
  await expect(page.locator('#at-co-axa-1')).toHaveCount(0);
  await page.locator('#at-co-tip-1 [data-v="r"]').click();
  await expect(nume(page)).toHaveText('Conector 1×3: ax sus, știft sus, ax în lung');
  // lungimea 4: pasul 3 ajunge la mijloc, deci gaura lui în lung trece în sus
  await page.locator('#at-co-lung [data-v="4"]').click();
  await expect(nume(page)).toHaveText('Conector 1×4: ax sus, știft sus, ax sus, știft sus');
  await expect(alegeri(page, 'at-co-axa-2')).toHaveText(['În sus', 'De-a latul']);
  await expect(page.locator('#at-cote')).toContainText('31,8 × 7,8 × 7,8 mm');
  // lungimea 1: un singur pas, care e și capăt
  await page.locator('#at-co-lung [data-v="1"]').click();
  await expect(nume(page)).toHaveText('Conector 1×1: ax sus');
  await expect(alegeri(page, 'at-co-axa-0')).toHaveText(['În sus', 'De-a latul', 'În lung']);
  await expect(page.locator('#at-cote')).toContainText('7,8 × 7,8 × 7,8 mm');
  // lungimea 5, cea mai mare
  await page.locator('#at-co-lung [data-v="5"]').click();
  await expect(page.locator('#at-co-pasi .at-rand')).toHaveCount(5);
  await expect(page.locator('#at-cote')).toContainText('39,8 × 7,8 × 7,8 mm');
});

test('STL-ul colțului pe trei axe e închis și are cotele blocului; piesa intră în listă și în model', async ({ page }) => {
  await atelierConector(page);
  await page.locator('#at-co-repede [data-v="colt"]').click();
  await expect(nume(page)).toHaveText('Conector 1×3: ax în lung, știft sus, știft lateral');
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const fisier = await descarcare;
  expect(fisier.suggestedFilename()).toBe('conector_1x3_ax_in_lung_stift_sus_stift_lateral.stl');
  const { triunghiuri, rele, dim } = citesteStl(readFileSync(await fisier.path()));
  expect(triunghiuri).toBeGreaterThan(300);
  expect(rele).toBe(0);
  expect(dim).toEqual([23.8, 7.8, 7.8]);
  // în listă, cu numele pașilor și cotele
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Conector 1×3: ax în lung, știft sus, știft lateral']);
  await expect(page.locator('#at-lista tr td:nth-child(2)')).toHaveText(['23,8 × 7,8 × 7,8']);
  // altă formă e altă piesă în listă; aceeași formă, din nou, se adună
  await page.locator('#at-co-repede [data-v="cruce"]').click();
  await expect(nume(page)).toHaveText('Conector 1×2: ax sus, știft lateral');
  await page.locator('#at-adauga').click();
  await page.locator('#at-co-repede [data-v="colt"]').click();
  await expect(nume(page)).toHaveText('Conector 1×3: ax în lung, știft sus, știft lateral');
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr[data-id]')).toHaveCount(2);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['2', '1']);
  // în model: piesa stă pe grilă, pe trei știfturi
  await page.locator('#at-in-model').click();
  await expect(page.locator('#at-vedere-mod [data-v="model"]')).toHaveText('Modelul (1)');
  await expect(page.locator('#at-m-lista li')).toHaveText([/^Conector 1×3: ax în lung, știft sus, știft lateral/]);
});

test('blocul fără nicio gaură se spune; cu o gaură pusă la loc, avertismentul pleacă', async ({ page }) => {
  await atelierConector(page);
  await page.locator('#at-co-tip-0 [data-v="p"]').click();
  await page.locator('#at-co-tip-1 [data-v="p"]').click();
  await expect(nume(page)).toHaveText('Conector 1×2: plin, plin');
  await expect(page.locator('#at-avert')).toBeVisible();
  await expect(page.locator('#at-avert')).toContainText('Blocul n-are nicio gaură');
  await expect(page.locator('#at-co-axa-0')).toHaveCount(0);
  await page.locator('#at-co-tip-1 [data-v="x"]').click();
  await expect(nume(page)).toHaveText('Conector 1×2: plin, ax sus');
  await expect(page.locator('#at-avert')).toBeHidden();
});
