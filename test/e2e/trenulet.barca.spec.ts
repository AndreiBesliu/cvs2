/**
 * Elicea de barcă în atelierul Easy 3Draw (ADR 0282, felia 3.Tr), pe pagina de sine stătătoare a planificatorului (din
 * aceleași surse ca pachetul):
 * - a doua piesă a filei „Elice”: elicea de barcă implicită (3 palete, Ø40, pasul 1, lățimea 100 %, înclinată 20°), cu numele,
 *   cotele și textul (pasul 40 mm; 58° lângă butuc, 18° la vârf; paletele acoperă 55 % din disc; butucul Ø8 × 11,5; consola la
 *   vârf 0,6 mm pe strat);
 * - „Repede”: diametrele pe grila de știfturi (Ø24, Ø32, Ø40, Ø56);
 * - editorul: fiecare alegere (sensul, gaura, capacul) și fiecare câmp (rotunjit la pasul lui, doar în plajă) ajung în piesă;
 *   lățimea și înclinarea intră în nume doar când nu sunt cele obișnuite;
 * - STL-ul închis, cu raza cerută; „Fă perechea”: aceeași elice, pe dreapta și pe stânga, în listă.
 * Valorile „pe hârtie” sunt calculate separat de motor (formulele din ADR).
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

const IMPLICIT = 'Elice de barcă Ø40 cu 3 palete, pasul 1';

async function atelierBarca(page: Page): Promise<void> {
  await threeDinPachet(page);
  await page.setContent(paginiPlanificator().preview);
  await intraIn3D(page);
  await page.locator('#at-tipuri [data-fila="propulsie"]').click();
  await page.locator('#at-galerie [data-piesa="eliceBarca"]').click();
  await expect(page.locator('#at-galerie [data-piesa="eliceBarca"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#at-nume-piesa')).toHaveText(IMPLICIT);
}
async function seteaza(page: Page, sel: string, v: string): Promise<void> {
  await page.locator(sel).fill(v);
  await page.locator(sel).blur();
}

/** Muchiile fără pereche ale unui STL binar și cea mai mare rază față de mijlocul cutiei (pe x, y). */
function citesteStl(stl: Buffer): { triunghiuri: number; rele: number; raza: number } {
  const n = stl.readUInt32LE(80), m = new Map<string, number>(), pts: number[][] = [];
  const v = (o: number) => [0, 1, 2].map((k) => stl.readFloatLE(o + 4 * k));
  for (let i = 0; i < n; i++) {
    const o = 84 + 50 * i + 12, p = [v(o), v(o + 12), v(o + 24)];
    pts.push(...p);
    const s = p.map((q) => q.map((x) => x.toFixed(3)).join(','));
    for (let k = 0; k < 3; k++) { const e = s[k] + '>' + s[(k + 1) % 3]; m.set(e, (m.get(e) ?? 0) + 1); }
  }
  let rele = 0;
  for (const [e, c] of m) { const [a, b] = e.split('>'); if (c !== 1 || m.get(b + '>' + a) !== 1) rele++; }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p[0]!); x1 = Math.max(x1, p[0]!); y0 = Math.min(y0, p[1]!); y1 = Math.max(y1, p[1]!); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let raza = 0;
  for (const p of pts) raza = Math.max(raza, Math.hypot(p[0]! - cx, p[1]! - cy));
  return { triunghiuri: n, rele, raza };
}

test('elicea de barcă implicită, a doua piesă a filei Elice: 3 palete, Ø40, pasul 1; textul cu pasul, unghiurile, acoperirea, butucul și consola', async ({ page }) => {
  await atelierBarca(page);
  await expect(page.locator('#at-tipuri [data-fila="propulsie"]')).toHaveText('Elice 2');
  await expect(page.locator('#at-galerie [data-piesa]')).toHaveText(['Elice', 'Elice de barcă']);
  await expect(page.locator('#at-editor h2').first()).toHaveText('Elice de barcă');
  // pe hârtie: P = 1 · 40; atan(40 / 8π) = 57,86° la butuc; atan(1 / π) = 17,66° la vârf; 0,2 · π = 0,628; paletele acoperă
  // 55,14 % din disc; cea mai înaltă secțiune a paletei, 11,43 → butucul de 11,5
  await expect(page.locator('#at-eb-info')).toHaveText('Pasul 40 mm (1 × diametrul): paleta stă la 58° lângă butuc și la 18° la vârf. Paletele acoperă 55 % din disc; butucul e de Ø8 × 11,5 mm. Se tipărește fără suport, cu partea dinspre barcă pe masă: la vârf, un strat iese cu 0,6 mm peste cel de dedesubt.');
  await expect(page.locator('#at-cote')).toContainText('× 11,5 mm');
  await expect(page.locator('#at-avert')).toBeHidden();
  // editorul, la început: câmpurile și alegerile implicite; la „Repede”, Ø40
  for (const [camp, v] of [['palete', '3'], ['diam', '40'], ['pas', '1'], ['lat', '100'], ['inc', '20']] as const) await expect(page.locator(`#at-eb-${camp}`)).toHaveValue(v);
  for (const [grup, v] of [['repede', '40'], ['sens', 'dreapta'], ['gaura', 'x'], ['capac', 'nu']] as const)
    await expect(page.locator(`#at-eb-${grup} [aria-pressed="true"]`)).toHaveAttribute('data-v', v);
  // un câmp în afara plajei nu schimbă piesa
  for (const [camp, rau] of [['palete', '2'], ['palete', '6'], ['diam', '150'], ['pas', '2'], ['lat', '200'], ['inc', '60']] as const) {
    await seteaza(page, `#at-eb-${camp}`, rau);
    await expect(page.locator('#at-nume-piesa')).toHaveText(IMPLICIT);
  }
  // elicea (3.Tq) rămâne prima piesă a filei, cu editorul ei
  await page.locator('#at-galerie [data-piesa="elice"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø72 cu 3 palete, pasul 0,7');
  await page.locator('#at-galerie [data-piesa="eliceBarca"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText(IMPLICIT);
});

test('„Repede”: diametrele pe grila de știfturi; un diametru scris de mână nu mai e niciunul dintre ele', async ({ page }) => {
  await atelierBarca(page);
  await expect(page.locator('#at-eb-repede [data-v]')).toHaveText(['Ø24', 'Ø32', 'Ø40', 'Ø56']);
  // pe hârtie, butucul (cât cea mai înaltă secțiune, cel puțin 8): Ø24 → 8; Ø32 → 9; Ø56 → Ø10 × 16 (0,09 · 56 = 5,04 → raza 5)
  for (const [d, inalt, butuc] of [['24', '8', 'Ø8 × 8 mm'], ['32', '9', 'Ø8 × 9 mm'], ['56', '16', 'Ø10 × 16 mm'], ['40', '11,5', 'Ø8 × 11,5 mm']] as const) {
    await page.locator(`#at-eb-repede [data-v="${d}"]`).click();
    await expect(page.locator('#at-nume-piesa')).toHaveText(`Elice de barcă Ø${d} cu 3 palete, pasul 1`);
    await expect(page.locator('#at-eb-diam')).toHaveValue(d);
    await expect(page.locator('#at-eb-repede [aria-pressed="true"]')).toHaveAttribute('data-v', d);
    await expect(page.locator('#at-cote')).toContainText(`× ${inalt} mm`);
    await expect(page.locator('#at-eb-info')).toContainText(`butucul e de ${butuc}.`);
  }
  await seteaza(page, '#at-eb-diam', '41');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice de barcă Ø41 cu 3 palete, pasul 1');
  await expect(page.locator('#at-eb-repede [aria-pressed="true"]')).toHaveCount(0);
});

test('editorul: fiecare alegere și fiecare câmp ajung în piesă; câmpurile, rotunjite la pasul lor și doar în plajă', async ({ page }) => {
  await atelierBarca(page);
  const nume = page.locator('#at-nume-piesa'), apasat = (grup: string) => page.locator(`#at-eb-${grup} [aria-pressed="true"]`);
  // alegerile
  await page.locator('#at-eb-sens [data-v="stanga"]').click();
  await expect(nume).toHaveText(IMPLICIT + ', stânga');
  await expect(apasat('sens')).toHaveAttribute('data-v', 'stanga');
  await page.locator('#at-eb-sens [data-v="dreapta"]').click();
  for (const [g, coada] of [['r', ', gaură rotundă'], ['b', ', pentru bară'], ['nu', ', fără gaură'], ['x', '']] as const) {
    await page.locator(`#at-eb-gaura [data-v="${g}"]`).click();
    await expect(nume).toHaveText(IMPLICIT + coada);
    await expect(apasat('gaura')).toHaveAttribute('data-v', g);
  }
  // capacul: 1,2 · 4 = 4,8 mm peste butucul de 11,5
  await page.locator('#at-eb-capac [data-v="da"]').click();
  await expect(nume).toHaveText(IMPLICIT + ', cu capac');
  await expect(page.locator('#at-cote')).toContainText('× 16,3 mm');
  // în nume, gaura stă înaintea capacului
  await page.locator('#at-eb-gaura [data-v="r"]').click();
  await expect(nume).toHaveText(IMPLICIT + ', gaură rotundă, cu capac');
  await page.locator('#at-eb-gaura [data-v="x"]').click();
  await page.locator('#at-eb-capac [data-v="nu"]').click();
  await expect(page.locator('#at-cote')).toContainText('× 11,5 mm');
  // câmpurile: paletele la întreg, diametrul la zecime, pasul la sutime, lățimea și înclinarea la întreg
  // (câmpul arată, după redesenare, ce a intrat în piesă: valoarea rotunjită, nu ce a scris omul)
  await seteaza(page, '#at-eb-palete', '4.4');
  await expect(nume).toHaveText('Elice de barcă Ø40 cu 4 palete, pasul 1');
  await expect(page.locator('#at-eb-palete')).toHaveValue('4');
  await seteaza(page, '#at-eb-diam', '56.26');
  await expect(nume).toHaveText('Elice de barcă Ø56,3 cu 4 palete, pasul 1');
  await expect(page.locator('#at-eb-diam')).toHaveValue('56.3');
  await seteaza(page, '#at-eb-pas', '1.204');
  await expect(nume).toHaveText('Elice de barcă Ø56,3 cu 4 palete, pasul 1,2');
  await expect(page.locator('#at-eb-pas')).toHaveValue('1.2');
  // pe hârtie: P = 1,2 · 56,3 = 67,56; butucul 0,09 · 56,3 = 5,07 → raza 5,1; atan(67,56 / (2π · 5,1)) = 64,62° la butuc;
  // atan(1,2 / π) = 20,91° la vârf; 0,2 · π / 1,2 = 0,524; cu 4 palete, acoperă 65,23 %; cea mai înaltă secțiune → 14,7
  await expect(page.locator('#at-eb-info')).toHaveText('Pasul 68 mm (1,2 × diametrul): paleta stă la 65° lângă butuc și la 21° la vârf. Paletele acoperă 65 % din disc; butucul e de Ø10,2 × 14,7 mm. Se tipărește fără suport, cu partea dinspre barcă pe masă: la vârf, un strat iese cu 0,5 mm peste cel de dedesubt.');
  // lățimea și înclinarea intră în nume doar când nu sunt cele obișnuite (100 %, 20°)
  await seteaza(page, '#at-eb-lat', '79.6');
  await expect(page.locator('#at-eb-lat')).toHaveValue('80');
  await expect(nume).toHaveText('Elice de barcă Ø56,3 cu 4 palete, pasul 1,2, lățimea 80 %');
  await seteaza(page, '#at-eb-inc', '9.6');
  await expect(page.locator('#at-eb-inc')).toHaveValue('10');
  await expect(nume).toHaveText('Elice de barcă Ø56,3 cu 4 palete, pasul 1,2, lățimea 80 %, înclinarea 10°');
  await seteaza(page, '#at-eb-lat', '100');
  await seteaza(page, '#at-eb-inc', '20');
  await expect(nume).toHaveText('Elice de barcă Ø56,3 cu 4 palete, pasul 1,2');
  // pasul, la sutime: și în câmp, și în nume
  await seteaza(page, '#at-eb-pas', '0.754');
  await expect(page.locator('#at-eb-pas')).toHaveValue('0.75');
  await expect(nume).toHaveText('Elice de barcă Ø56,3 cu 4 palete, pasul 0,75');
  await seteaza(page, '#at-eb-pas', '1.2');
  // marginile plajei: chiar pe margine intră, dincolo de ea nu (piesa rămâne; la redesenare, câmpul arată iar ce e în piesă)
  for (const [camp, bun, rau, cum] of [
    ['palete', '5', '6', 'Elice de barcă Ø56,3 cu 5 palete, pasul 1,2'], ['palete', '3', '2', 'Elice de barcă Ø56,3 cu 3 palete, pasul 1,2'],
    ['diam', '120', '120.1', 'Elice de barcă Ø120 cu 3 palete, pasul 1,2'], ['diam', '20', '19.9', 'Elice de barcă Ø20 cu 3 palete, pasul 1,2'],
    ['pas', '1.6', '1.61', 'Elice de barcă Ø20 cu 3 palete, pasul 1,6'], ['pas', '0.5', '0.49', 'Elice de barcă Ø20 cu 3 palete, pasul 0,5'],
    ['lat', '150', '151', 'Elice de barcă Ø20 cu 3 palete, pasul 0,5, lățimea 150 %'], ['lat', '40', '39', 'Elice de barcă Ø20 cu 3 palete, pasul 0,5, lățimea 40 %'],
    ['inc', '40', '41', 'Elice de barcă Ø20 cu 3 palete, pasul 0,5, lățimea 40 %, înclinarea 40°'], ['inc', '0', '-1', 'Elice de barcă Ø20 cu 3 palete, pasul 0,5, lățimea 40 %, înclinarea 0°'],
  ] as const) {
    await seteaza(page, `#at-eb-${camp}`, bun);
    await expect(nume).toHaveText(cum);
    await seteaza(page, `#at-eb-${camp}`, rau);
    await expect(nume).toHaveText(cum);
    await page.locator('#at-eb-sens [data-v="dreapta"]').click();
    await expect(page.locator(`#at-eb-${camp}`)).toHaveValue(bun);
  }
  // cea mai îngustă și mai culcată: Ø20, pasul 0,5 (P 10): atan(10 / 8π) = 21,7° la butuc, atan(0,5 / π) = 9,04° la vârf;
  // consola 0,2 · π / 0,5 = 1,257; acoperă 19,75 %; paletele încap sub un știft (butucul de 8)
  await expect(page.locator('#at-eb-info')).toHaveText('Pasul 10 mm (0,5 × diametrul): paleta stă la 22° lângă butuc și la 9° la vârf. Paletele acoperă 20 % din disc; butucul e de Ø8 × 8 mm. Se tipărește fără suport, cu partea dinspre barcă pe masă: la vârf, un strat iese cu 1,3 mm peste cel de dedesubt.');
});

test('STL-ul descărcat e un corp închis, cu raza cerută (4 palete, Ø56, cu capac)', async ({ page }) => {
  await atelierBarca(page);
  await page.locator('#at-eb-repede [data-v="56"]').click();
  await seteaza(page, '#at-eb-palete', '4');
  await page.locator('#at-eb-capac [data-v="da"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice de barcă Ø56 cu 4 palete, pasul 1, cu capac');
  // pe hârtie: cu 4 palete, cea mai înaltă secțiune dă butucul de 12,3; capacul, 1,2 · 5 peste el: 18,3
  await expect(page.locator('#at-cote')).toContainText('× 18,3 mm');
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const d = await descarcare;
  expect(d.suggestedFilename()).toMatch(/\.stl$/);
  // cu 4 palete, cutia e simetrică față de butuc: raza cea mai mare, 56 / 2
  const { triunghiuri, rele, raza } = citesteStl(readFileSync(await d.path()));
  expect(triunghiuri).toBeGreaterThan(5_000);
  expect(rele).toBe(0);
  expect(raza).toBeCloseTo(28, 1);
});

test('„Fă perechea”: aceeași elice de barcă, pe dreapta și pe stânga, în listă', async ({ page }) => {
  await atelierBarca(page);
  await page.locator('#at-eb-capac [data-v="da"]').click();
  await page.locator('#at-eb-pereche').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText([IMPLICIT + ', cu capac', IMPLICIT + ', stânga, cu capac']);
  // elicea din editor rămâne cea dreaptă
  await expect(page.locator('#at-eb-sens [aria-pressed="true"]')).toHaveAttribute('data-v', 'dreapta');
});
