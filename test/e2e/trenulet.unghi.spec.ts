/**
 * Conectorul în unghi, axul cu opritor și știftul cu bucșă în atelierul Easy 3Draw (ADR 0284, felia 3.Cb), pe pagina de
 * sine stătătoare a planificatorului (din aceleași surse ca pachetul):
 * - conectorul în unghi, în fila Legături: două manșoane de ax la 135° și butucul cu gaură de știft; formele gata
 *   („Repede”: cele numerotate, T, crucea, Y), numărul brațelor, butucul, manșonul și unghiul fiecărui braț;
 * - unghiul se scrie doar între marginile lui (la cel puțin 90° de vecini; cu două brațe, până la 180°); un braț mutat îi
 *   împinge pe următorii;
 * - STL-ul descărcat e închis și are cutia de pe hârtie; piesa intră în listă cu numele brațelor;
 * - axul: bifa „Cu opritor la un capăt” (numele, cotele, piesa din listă fără câmp când e nebifată);
 * - știftul: capătul scurt „Bucșă”, la 2 și la 3.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

async function atelier(page: Page, piesa: string): Promise<void> {
  await threeDinPachet(page);
  await page.setContent(paginiPlanificator().preview);
  await intraIn3D(page);
  await page.locator('#at-tipuri [data-fila="legaturi"]').click();
  await page.locator(`#at-galerie [data-piesa="${piesa}"]`).click();
}
const nume = (page: Page) => page.locator('#at-nume-piesa');
const cote = (page: Page) => page.locator('#at-cote');
const alegeri = (page: Page, id: string) => page.locator(`#${id} button`);
const apasat = (page: Page, id: string) => page.locator(`#${id} [aria-pressed="true"]`);
const unghi = (page: Page, k: number) => page.locator(`#at-cu-unghi-${k}`);

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

test('piesa nouă din fila Legături: două manșoane de ax la 135°, butucul cu gaură de știft; formele gata', async ({ page }) => {
  await atelier(page, 'conectorUnghi');
  await expect(nume(page)).toHaveText('Conector în unghi: ax, ax 135°');
  // cutia de pe hârtie: 11,9 + (11,9 + 3,9) · cos 45° = 23,07; 3,9 + (11,9 + 3,9) · sin 45° = 15,07
  await expect(cote(page)).toContainText('23,1 × 15,1 × 7,8 mm');
  await expect(page.locator('#at-avert')).toBeHidden();
  await expect(apasat(page, 'at-cu-repede')).toHaveText('Nr. 4 (135°)');
  await expect(apasat(page, 'at-cu-nr')).toHaveText('2');
  await expect(apasat(page, 'at-cu-butuc')).toHaveText('Știft');
  await expect(apasat(page, 'at-cu-fel-0')).toHaveText('Ax');
  await expect(apasat(page, 'at-cu-fel-1')).toHaveText('Ax');
  await expect(unghi(page, 1)).toHaveValue('135');
  await expect(unghi(page, 0)).toHaveCount(0);
  await expect(alegeri(page, 'at-cu-repede')).toHaveText(['Nr. 1', 'Nr. 2 (180°)', 'Nr. 3 (157,5°)', 'Nr. 4 (135°)', 'Nr. 5 (112,5°)', 'Nr. 6 (90°)', 'T', 'Cruce', 'Y']);
  // formele gata: unghiurile lor, cu numele și cotele piesei
  const forme: readonly (readonly [string, string, string])[] = [
    ['1', 'Conector în unghi: ax', '15,8 × 7,8 × 7,8 mm'],
    ['2', 'Conector în unghi: ax, ax 180°', '23,8 × 7,8 × 7,8 mm'],
    ['3', 'Conector în unghi: ax, ax 157,5°', '24,4 × 12,1 × 7,8 mm'],
    ['5', 'Conector în unghi: ax, ax 112,5°', '20,1 × 16,4 × 7,8 mm'],
    ['6', 'Conector în unghi: ax, ax 90°', '15,8 × 15,8 × 7,8 mm'],
    ['t', 'Conector în unghi: ax, ax 90°, ax 180°', '23,8 × 15,8 × 7,8 mm'],
    ['cruce', 'Conector în unghi: ax, ax 90°, ax 180°, ax 270°', '23,8 × 23,8 × 7,8 mm'],
    ['y', 'Conector în unghi: ax, ax 120°, ax 240°', '21,2 × 24,5 × 7,8 mm'],
    ['4', 'Conector în unghi: ax, ax 135°', '23,1 × 15,1 × 7,8 mm'],
  ];
  for (const [k, n, c] of forme) {
    await page.locator(`#at-cu-repede [data-v="${k}"]`).click();
    await expect(nume(page), k).toHaveText(n);
    await expect(cote(page), k).toContainText(c);
    await expect(page.locator(`#at-cu-repede [data-v="${k}"]`), k).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#at-avert'), k).toBeHidden();
  }
});

test('configuratorul: numărul brațelor, butucul, manșonul și unghiul fiecărui braț, între marginile lui', async ({ page }) => {
  await atelier(page, 'conectorUnghi');
  // manșonul unui braț: știft în loc de ax, doar la el
  await page.locator('#at-cu-fel-1 [data-v="r"]').click();
  await expect(nume(page)).toHaveText('Conector în unghi: ax, știft 135°');
  await page.locator('#at-cu-fel-0 [data-v="r"]').click();
  await expect(nume(page)).toHaveText('Conector în unghi: știft, știft 135°');
  await page.locator('#at-cu-fel-0 [data-v="x"]').click();
  await expect(nume(page)).toHaveText('Conector în unghi: ax, știft 135°');
  // butucul: de ax, plin, și înapoi (cel obișnuit nu se mai spune în nume)
  await page.locator('#at-cu-butuc [data-v="x"]').click();
  await expect(nume(page)).toHaveText('Conector în unghi: ax, știft 135°, butuc de ax');
  await page.locator('#at-cu-butuc [data-v="p"]').click();
  await expect(nume(page)).toHaveText('Conector în unghi: ax, știft 135°, butuc plin');
  await expect(apasat(page, 'at-cu-butuc')).toHaveText('Plin');
  await page.locator('#at-cu-butuc [data-v="r"]').click();
  await expect(nume(page)).toHaveText('Conector în unghi: ax, știft 135°');
  // cu două brațe, unghiul se scrie între 90° și 180°; în afara lor, câmpul se întoarce la ce era
  await expect(unghi(page, 1)).toHaveAttribute('min', '90');
  await expect(unghi(page, 1)).toHaveAttribute('max', '180');
  await unghi(page, 1).fill('100');
  await unghi(page, 1).press('Tab');
  await expect(nume(page)).toHaveText('Conector în unghi: ax, știft 100°');
  await expect(apasat(page, 'at-cu-repede')).toHaveCount(0);
  for (const rau of ['60', '200', '']) {
    await unghi(page, 1).fill(rau);
    await unghi(page, 1).press('Tab');
    await expect(unghi(page, 1), `„${rau}”`).toHaveValue('100');
    await expect(nume(page), `„${rau}”`).toHaveText('Conector în unghi: ax, știft 100°');
  }
  // zecimile de grad se țin; mai fin de atât, se rotunjește
  await unghi(page, 1).fill('112.54');
  await unghi(page, 1).press('Tab');
  await expect(nume(page)).toHaveText('Conector în unghi: ax, știft 112,5°');
  await expect(apasat(page, 'at-cu-repede')).toHaveText('Nr. 5 (112,5°)');
  // al treilea braț vine la 90° după al doilea, cu manșon de ax; marginile lui: de la 90° după vecin până la 270°
  await page.locator('#at-cu-nr [data-v="3"]').click();
  await expect(nume(page)).toHaveText('Conector în unghi: ax, știft 112,5°, ax 202,5°');
  await expect(page.locator('#at-cu-brate .at-rand')).toHaveCount(3);
  await expect(unghi(page, 1)).toHaveAttribute('max', '180');
  await expect(unghi(page, 2)).toHaveAttribute('min', '202.5');
  await expect(unghi(page, 2)).toHaveAttribute('max', '270');
  await unghi(page, 2).fill('200');
  await unghi(page, 2).press('Tab');
  await expect(unghi(page, 2)).toHaveValue('202.5');
  await unghi(page, 2).fill('250');
  await unghi(page, 2).press('Tab');
  await expect(nume(page)).toHaveText('Conector în unghi: ax, știft 112,5°, ax 250°');
  // al doilea braț, mutat mai departe, îl împinge pe al treilea la 90° de el
  await unghi(page, 1).fill('170');
  await unghi(page, 1).press('Tab');
  await expect(nume(page)).toHaveText('Conector în unghi: ax, știft 170°, ax 260°');
  // patru brațe: crucea, cu unghiurile fixe; manșoanele rămân ale brațelor lor
  await page.locator('#at-cu-nr [data-v="4"]').click();
  await expect(nume(page)).toHaveText('Conector în unghi: ax, știft 90°, ax 180°, ax 270°');
  await expect(apasat(page, 'at-cu-repede')).toHaveText('Cruce');
  for (const k of [1, 2, 3]) await expect(unghi(page, k)).toBeDisabled();
  // înapoi la trei (T), la două (se ține unghiul celui de-al doilea) și la unul
  await page.locator('#at-cu-nr [data-v="3"]').click();
  await expect(nume(page)).toHaveText('Conector în unghi: ax, știft 90°, ax 180°');
  await page.locator('#at-cu-nr [data-v="2"]').click();
  await expect(nume(page)).toHaveText('Conector în unghi: ax, știft 90°');
  await page.locator('#at-cu-nr [data-v="1"]').click();
  await expect(nume(page)).toHaveText('Conector în unghi: ax');
  await expect(page.locator('#at-cu-brate .at-rand')).toHaveCount(1);
  await expect(apasat(page, 'at-cu-repede')).toHaveText('Nr. 1');
  // de la unul la două: al doilea vine la 135°
  await page.locator('#at-cu-nr [data-v="2"]').click();
  await expect(nume(page)).toHaveText('Conector în unghi: ax, ax 135°');
  // o formă gata ține manșoanele brațelor care rămân
  await page.locator('#at-cu-fel-1 [data-v="r"]').click();
  await page.locator('#at-cu-repede [data-v="y"]').click();
  await expect(nume(page)).toHaveText('Conector în unghi: ax, știft 120°, ax 240°');
});

test('STL-ul conectorului în Y e închis și are cutia de pe hârtie; piesa intră în listă, pe nume, și în model', async ({ page }) => {
  await atelier(page, 'conectorUnghi');
  await page.locator('#at-cu-repede [data-v="y"]').click();
  await page.locator('#at-cu-fel-2 [data-v="r"]').click();
  await page.locator('#at-cu-butuc [data-v="x"]').click();
  await expect(nume(page)).toHaveText('Conector în unghi: ax, ax 120°, știft 240°, butuc de ax');
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const fisier = await descarcare;
  expect(fisier.suggestedFilename()).toBe('conector_in_unghi_ax_ax_120_stift_240_butuc_de_ax.stl');
  const { triunghiuri, rele, dim } = citesteStl(readFileSync(await fisier.path()));
  expect(triunghiuri).toBeGreaterThan(500);
  expect(rele).toBe(0);
  // pe hârtie: pe X, de la vârful brațelor din spate (11,9 · cos 60° + 3,9 · sin 60° = 9,33) la gura primului (11,9);
  // pe Y, de două ori 11,9 · sin 60° + 3,9 · cos 60° = 12,26
  expect(dim).toEqual([21.23, 24.51, 7.8]);
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Conector în unghi: ax, ax 120°, știft 240°, butuc de ax']);
  await expect(page.locator('#at-lista tr td:nth-child(2)')).toHaveText(['21,2 × 24,5 × 7,8']);
  // alt butuc e altă piesă; aceeași piesă, din nou, se adună
  await page.locator('#at-cu-butuc [data-v="r"]').click();
  await page.locator('#at-adauga').click();
  await page.locator('#at-cu-butuc [data-v="x"]').click();
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr[data-id]')).toHaveCount(2);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['2', '1']);
  await page.locator('#at-in-model').click();
  await expect(page.locator('#at-vedere-mod [data-v="model"]')).toHaveText('Modelul (1)');
  await expect(page.locator('#at-m-lista li')).toHaveText([/^Conector în unghi: ax, ax 120°, știft 240°, butuc de ax/]);
});

test('axul cu opritor: bifa, numele și cotele; fără bifă, axul de până acum', async ({ page }) => {
  await atelier(page, 'ax');
  await expect(nume(page)).toHaveText('Ax 4');
  await expect(page.locator('#at-a-opritor')).not.toBeChecked();
  await expect(cote(page)).toContainText('31,8 × 4,8 × 4,8 mm');
  await page.locator('#at-adauga').click();
  await page.locator('#at-a-opritor').check();
  await expect(nume(page)).toHaveText('Ax 4 cu opritor');
  // lungimea rămâne; lățimea e a discului (Ø 6), înălțimea de la masă până în vârful lui
  await expect(cote(page)).toContainText('31,8 × 6 × 5,4 mm');
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Ax 4', 'Ax 4 cu opritor']);
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const fisier = await descarcare;
  expect(fisier.suggestedFilename()).toBe('ax_4_cu_opritor.stl');
  const { rele, dim } = citesteStl(readFileSync(await fisier.path()));
  expect(rele).toBe(0);
  expect(dim).toEqual([31.8, 6, 5.38]);
  // debifat, e din nou axul din listă (aceeași piesă: se adună)
  await page.locator('#at-a-opritor').uncheck();
  await expect(nume(page)).toHaveText('Ax 4');
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr[data-id]')).toHaveCount(2);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['2', '1']);
  // lungimea se schimbă și cu opritor
  await page.locator('#at-a-opritor').check();
  await page.locator('#at-a-lung').fill('6');
  await page.locator('#at-a-lung').press('Tab');
  await expect(nume(page)).toHaveText('Ax 6 cu opritor');
  await expect(cote(page)).toContainText('47,8 × 6 × 5,4 mm');
});

test('știftul cu bucșă: capătul scurt „Bucșă”, la 2 și la 3; știfturile de până acum rămân', async ({ page }) => {
  await atelier(page, 'stiftTechnic');
  await expect(nume(page)).toHaveText('Știft Technic');
  await expect(alegeri(page, 'at-s-capat')).toHaveText(['Știft', 'Ax', 'Bucșă']);
  await expect(cote(page)).toContainText('15,8 × 6 × 5 mm');
  await page.locator('#at-adauga').click();
  await page.locator('#at-s-capat [data-v="bucsa"]').click();
  await expect(nume(page)).toHaveText('Știft cu bucșă');
  await expect(apasat(page, 'at-s-capat')).toHaveText('Bucșă');
  // lățimea e a bucșei (Ø 7,2); înălțimea, de la fața teșită până în vârful ei
  await expect(cote(page)).toContainText('15,8 × 7,2 × 5,6 mm');
  await page.locator('#at-adauga').click();
  await page.locator('#at-s-lung [data-v="3"]').click();
  await expect(nume(page)).toHaveText('Știft cu bucșă 3');
  await expect(cote(page)).toContainText('23,8 × 7,2 × 5,6 mm');
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const fisier = await descarcare;
  expect(fisier.suggestedFilename()).toBe('stift_cu_bucsa_3.stl');
  const { rele, dim } = citesteStl(readFileSync(await fisier.path()));
  expect(rele).toBe(0);
  expect(dim).toEqual([23.8, 7.2, 5.63]);
  await page.locator('#at-adauga').click();
  await page.locator('#at-s-fanta').uncheck();
  await expect(nume(page)).toHaveText('Știft cu bucșă 3, fără fantă');
  await expect(cote(page)).toContainText('23,8 × 7,2 × 5,6 mm');
  // trei piese diferite în listă: știftul obișnuit, cel cu bucșă și cel cu bucșă de 3
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Știft Technic', 'Știft cu bucșă', 'Știft cu bucșă 3']);
  // capătul de ax și cel de știft rămân cum erau
  await page.locator('#at-s-fanta').check();
  await page.locator('#at-s-capat [data-v="ax"]').click();
  await expect(nume(page)).toHaveText('Știft cu ax 3');
  await page.locator('#at-s-capat [data-v="stift"]').click();
  await expect(nume(page)).toHaveText('Știft Technic 3');
});
