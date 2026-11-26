/**
 * Decorațiunile de Crăciun în atelierul Easy 3Draw (ADR 0285, felia 3.Cl-1), pe pagina de sine stătătoare a planificatorului
 * (din aceleași surse ca pachetul):
 * - fila nouă „Crăciun”, cu trei piese: fulgul de zăpadă, steaua și brăduțul, fiecare cu numele și cotele de pe hârtie;
 * - fulgul: cei șase gata făcuți, „Alt fulg” (la întâmplare, mereu în margini), câmpurile lui, miezul și agățătoarea; linia
 *   rămâne în marginea diametrului; un număr din afara marginilor nu e primit;
 * - steaua: gata făcute, colțurile, felul (plină, contur, în relief), agățătoarea (gaura, doar la cea plină), mesajele ei;
 * - brăduțul: de agățat sau în picioare (două plăci alăturate, cu fantele scrise), mărimile gata, mesajul bradului prea mic;
 * - STL-urile descărcate sunt închise și au cotele de pe hârtie; piesele intră în listă, pe nume; nu au prinderi.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

async function atelier(page: Page, piesa: string, nume: string): Promise<void> {
  await threeDinPachet(page);
  await page.setContent(paginiPlanificator().preview);
  await intraIn3D(page);
  await page.locator('#at-tipuri [data-fila="craciun"]').click();
  await page.locator(`#at-galerie [data-piesa="${piesa}"]`).click();
  await expect(page.locator('#at-nume-piesa')).toHaveText(nume);
}
const nume = (page: Page) => page.locator('#at-nume-piesa');
const cote = (page: Page) => page.locator('#at-cote');
const avert = (page: Page) => page.locator('#at-avert');
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

test('fila „Crăciun”: fulgul de zăpadă, steaua, brăduțul și globul; fulgul implicit, Ø70, cu inelul lui', async ({ page }) => {
  await atelier(page, 'fulg', 'Fulg Ø70, ramuri 2 × 60°');
  await expect(page.locator('#at-tipuri [data-fila="craciun"]')).toHaveText('Crăciun 6');
  await expect(page.locator('#at-galerie button')).toHaveText(['Fulg de zăpadă', 'Stea', 'Brăduț', 'Glob', 'Ornament cu nume', 'Brăduț LEGO']);
  await expect(page.locator('#at-editor h2')).toHaveText('Fulg de zăpadă');
  // lat până la capetele ramurilor de pe brațele de la ±30° (63,27); înalt cât diametrul și inelul (70 + 1,9 + 3,1)
  await expect(cote(page)).toContainText('63,3 × 75 × 2,4 mm');
  await expect(avert(page)).toBeHidden();
  await expect(page.locator('#at-fg-repede button')).toHaveText(['Clasic', 'Steluță', 'Dantelă', 'Cetină', 'Săgeți', 'Simplu']);
  await expect(apasat(page, 'at-fg-repede')).toHaveText('Clasic');
  for (const [id, v] of [['diam', '70'], ['grosime', '2.4'], ['linie', '2'], ['ramuri', '2'], ['unghi', '60'], ['inceput', '40'], ['lungime', '28']] as const) await expect(page.locator(`#at-fg-${id}`)).toHaveValue(v);
  await expect(page.locator('#at-fg-linie')).toHaveAttribute('max', '5');
  await expect(page.locator('#at-fg-miez button')).toHaveText(['Hexagon', 'Stea', 'Gol']);
  await expect(apasat(page, 'at-fg-miez')).toHaveText('Hexagon');
  await expect(apasat(page, 'at-fg-ag')).toHaveText('Inel');
  await expect(page.locator('#at-fg-info')).toHaveText('Linia are 2 mm (cea mai subțire care se tipărește bine are 1,2); pe fiecare braț sunt 4 ramuri.');
  // o decorațiune se agață: nu are prinderi, deci nici panoul „Se prinde cu”
  await expect(page.locator('#at-prinde')).toBeHidden();
  // celelalte două piese, cum se deschid
  await page.locator('#at-galerie [data-piesa="stea"]').click();
  await expect(nume(page)).toHaveText('Stea cu 5 colțuri Ø70');
  await page.locator('#at-galerie [data-piesa="brad"]').click();
  await expect(nume(page)).toHaveText('Brăduț de 80 mm, 3 etaje');
  // căutarea le găsește după nume
  await page.locator('#at-cauta').fill('fulg');
  await expect(page.locator('#at-galerie button')).toHaveText(['Fulg de zăpadă']);
});

test('fulgul: cei gata făcuți, miezul, agățătoarea și câmpurile, cu numele și cotele de pe hârtie', async ({ page }) => {
  await atelier(page, 'fulg', 'Fulg Ø70, ramuri 2 × 60°');
  await page.locator('#at-fg-repede [data-v="1"]').click();
  await expect(nume(page)).toHaveText('Fulg Ø70, ramuri 1 × 45°, de la 55 %, lungi de 30 %, miez stea, linia 2,4');
  await expect(apasat(page, 'at-fg-repede')).toHaveText('Steluță');
  await expect(apasat(page, 'at-fg-miez')).toHaveText('Stea');
  await expect(page.locator('#at-fg-info')).toHaveText('Linia are 2,4 mm (cea mai subțire care se tipărește bine are 1,2); pe fiecare braț sunt 2 ramuri.');
  await page.locator('#at-fg-repede [data-v="2"]').click();
  await expect(nume(page)).toHaveText('Fulg Ø70, ramuri 4 × 60°, de la 25 %, lungi de 40 %, miez gol, linia 1,6');
  await expect(page.locator('#at-fg-ramuri')).toHaveValue('4');
  await expect(cote(page)).toContainText('× 75 × 2,4 mm');
  await expect(avert(page)).toBeHidden();
  // „Simplu”: fără ramuri, deci lat cât vârfurile brațelor de la ±30°: 2 · (33,5 · cos 30° + 1,5) = 61,02
  await page.locator('#at-fg-repede [data-v="5"]').click();
  await expect(nume(page)).toHaveText('Fulg Ø70, fără ramuri, miez gol, linia 3');
  await expect(cote(page)).toContainText('61 × 75 × 2,4 mm');
  await expect(page.locator('#at-fg-info')).toHaveText('Linia are 3 mm (cea mai subțire care se tipărește bine are 1,2); pe fiecare braț sunt 0 ramuri.');
  // fără inel: înalt cât diametrul; mai gros
  await page.locator('#at-fg-ag [data-v="fara"]').click();
  await expect(nume(page)).toHaveText('Fulg Ø70, fără ramuri, miez gol, linia 3, fără inel');
  await expect(cote(page)).toContainText('61 × 70 × 2,4 mm');
  await scrie(page, '#at-fg-grosime', '4');
  await expect(nume(page)).toHaveText('Fulg Ø70, fără ramuri, miez gol, linia 3, 4 mm, fără inel');
  await expect(cote(page)).toContainText('61 × 70 × 4 mm');
  // un schimb de mână scoate apăsarea de pe „Repede”
  await page.locator('#at-fg-miez [data-v="hexagon"]').click();
  await expect(apasat(page, 'at-fg-repede')).toHaveCount(0);
  await expect(nume(page)).toHaveText('Fulg Ø70, fără ramuri, linia 3, 4 mm, fără inel');
});

test('fulgul: linia rămâne în marginea diametrului, numerele din afara marginilor nu sunt primite, ramurile prea scurte se spun', async ({ page }) => {
  await atelier(page, 'fulg', 'Fulg Ø70, ramuri 2 × 60°');
  await scrie(page, '#at-fg-linie', '4');
  await expect(nume(page)).toHaveText('Fulg Ø70, ramuri 2 × 60°, linia 4');
  // Ø30: raza 15, deci linia de cel mult 2,5 (o șesime din rază)
  await scrie(page, '#at-fg-diam', '30');
  await expect(page.locator('#at-fg-linie')).toHaveValue('2.5');
  await expect(page.locator('#at-fg-linie')).toHaveAttribute('max', '2.5');
  await expect(avert(page)).toBeHidden();
  // la Ø30, ramurile de 28 % (4,2 mm) nu mai ajung la o linie și jumătate plus... 3,75: se fac; la 10 % (1,5 mm), nu
  await expect(nume(page)).toHaveText('Fulg Ø30, ramuri 2 × 60°, linia 2,5');
  await scrie(page, '#at-fg-lungime', '10');
  await expect(page.locator('#at-fg-info')).toHaveText('Linia are 2,5 mm (cea mai subțire care se tipărește bine are 1,2); pe fiecare braț sunt 0 ramuri. Încă 4 ar fi ieșit prea scurte ca să se vadă: fă-le mai lungi sau fulgul mai mare.');
  await expect(avert(page)).toBeHidden();
  // un număr din afara marginilor: câmpul se întoarce la valoarea de dinainte
  for (const [id, rau, bun] of [['diam', '500', '30'], ['diam', '10', '30'], ['grosime', '9', '2.4'], ['linie', '3', '2.5'], ['ramuri', '7', '2'], ['unghi', '80', '60'], ['inceput', '10', '40'], ['lungime', '60', '10']] as const) {
    await scrie(page, `#at-fg-${id}`, rau);
    await expect(page.locator(`#at-fg-${id}`), id).toHaveValue(bun);
  }
  await expect(nume(page)).toHaveText('Fulg Ø30, ramuri 2 × 60°, de la 40 %, lungi de 10 %, linia 2,5');
  // linia adusă în marginea diametrului mic rămâne a fulgului: la Ø70 nu se întoarce la cea veche (4)
  await scrie(page, '#at-fg-diam', '70');
  await expect(nume(page)).toHaveText('Fulg Ø70, ramuri 2 × 60°, de la 40 %, lungi de 10 %, linia 2,5');
  await expect(page.locator('#at-fg-linie')).toHaveValue('2.5');
  await expect(page.locator('#at-fg-linie')).toHaveAttribute('max', '5');
});

test('„Alt fulg”: un fulg la întâmplare, mereu în margini și fără avertismente; STL-ul lui e închis', async ({ page }) => {
  await atelier(page, 'fulg', 'Fulg Ø70, ramuri 2 × 60°');
  // cu zarul ținut pe loc: cel mai mult din fiecare (4 perechi la 70°, de la 60 %, lungi de 42 %, miezul gol)…
  const cuZarul = (v: number) => page.evaluate((x) => { const r = Math.random; Math.random = () => x; document.querySelector<HTMLElement>('#at-fg-alt')!.click(); Math.random = r; }, v);
  await cuZarul(0.999);
  await expect(nume(page)).toHaveText('Fulg Ø70, ramuri 4 × 70°, de la 60 %, lungi de 42 %, miez gol');
  await expect(avert(page)).toBeHidden();
  const s = await descarca(page);
  expect([s.fisier, s.rele]).toEqual(['fulg_70_ramuri_4_x_70_de_la_60_lungi_de_42_miez_gol.stl', 0]);
  // … și cel mai puțin (o pereche la 35°, de la 25 %, lungă de 18 %, miezul hexagon); linia, mărimea și inelul rămân
  await cuZarul(0);
  await expect(nume(page)).toHaveText('Fulg Ø70, ramuri 1 × 35°, de la 25 %, lungi de 18 %');
  await expect(page.locator('#at-fg-linie')).toHaveValue('2');
  // apoi cu zarul adevărat: de fiecare dată un fulg în margini, fără avertismente
  // (câmpurile se schimbă pe loc, iar numele, după ce piesa e făcută din nou: numele așteptat se scrie din câmpuri)
  const vazute = new Set<string>();
  for (let i = 0; i < 6; i++) {
    await page.locator('#at-fg-alt').click();
    const v: Record<string, number> = {};
    for (const [id, a, b] of [['ramuri', 1, 4], ['unghi', 35, 70], ['inceput', 25, 60], ['lungime', 18, 42]] as const) {
      v[id] = +(await page.locator(`#at-fg-${id}`).inputValue());
      expect(v[id]! >= a && v[id]! <= b, `${id} = ${v[id]}`).toBe(true);
    }
    const miez = await apasat(page, 'at-fg-miez').getAttribute('data-v');
    const asteptat = `Fulg Ø70, ramuri ${v['ramuri']} × ${v['unghi']}°${v['inceput'] !== 40 || v['lungime'] !== 28 ? `, de la ${v['inceput']} %, lungi de ${v['lungime']} %` : ''}${miez === 'stea' ? ', miez stea' : miez === 'gol' ? ', miez gol' : ''}`;
    await expect(nume(page)).toHaveText(asteptat);
    await expect(cote(page)).toContainText('× 75 × 2,4 mm');
    await expect(avert(page)).toBeHidden();
    vazute.add(asteptat);
  }
  expect(vazute.size).toBeGreaterThan(1);
});

test('steaua: gata făcute, colțurile, felul (plină, contur, în relief) și agățătoarea, cu numele și cotele de pe hârtie', async ({ page }) => {
  await atelier(page, 'stea', 'Stea cu 5 colțuri Ø70');
  await expect(page.locator('#at-editor h2')).toHaveText('Stea');
  // lat: colțurile de la 18° și 162° (70 · cos 18° = 66,57); înalt: 35 · sin 54° + 35 și inelul (5)
  await expect(cote(page)).toContainText('66,6 × 68,3 × 3 mm');
  await expect(page.locator('#at-st-repede button')).toHaveText(['Clasică', 'Contur', 'De vârf', 'Cu 6 colțuri', 'Cu 8 colțuri']);
  await expect(apasat(page, 'at-st-repede')).toHaveText('Clasică');
  await expect(apasat(page, 'at-st-varfuri')).toHaveText('5');
  await expect(apasat(page, 'at-st-fel')).toHaveText('Plină');
  await expect(page.locator('#at-st-ag button')).toHaveText(['Inel', 'Gaură', 'Fără']);
  await expect(page.locator('#at-st-linie')).toHaveCount(0);
  await expect(page.locator('label[for="at-st-grosime"]')).toHaveText('Grosimea (mm)');
  // colțul: 2 · atan(14 · sin 36° / (35 − 14 · cos 36°)) = 38°
  await expect(page.locator('#at-st-info')).toHaveText('Colțurile au 38°; vârfurile dinăuntru stau la 14 mm de mijloc.');
  // gaura în loc de inel: înaltă doar cât steaua (63,3)
  await page.locator('#at-st-ag [data-v="gaura"]').click();
  await expect(nume(page)).toHaveText('Stea cu 5 colțuri Ø70, cu gaură');
  await expect(cote(page)).toContainText('66,6 × 63,3 × 3 mm');
  // conturul: apare linia; gaura nu mai are loc, deci rămâne inelul
  await page.locator('#at-st-repede [data-v="1"]').click();
  await expect(nume(page)).toHaveText('Stea cu 5 colțuri Ø70, contur de 2,4');
  await expect(page.locator('#at-st-linie')).toHaveValue('2.4');
  await expect(page.locator('#at-st-ag button')).toHaveText(['Inel', 'Fără']);
  await expect(apasat(page, 'at-st-ag')).toHaveText('Inel');
  await expect(cote(page)).toContainText('66,6 × 68,3 × 3 mm');
  await scrie(page, '#at-st-linie', '1.6');
  await expect(nume(page)).toHaveText('Stea cu 5 colțuri Ø70, contur de 1,6');
  // în relief („De vârf”): grosimea e înălțimea din mijloc
  await page.locator('#at-st-repede [data-v="2"]').click();
  await expect(nume(page)).toHaveText('Stea cu 5 colțuri Ø70, interiorul la 45 %, în relief, 8 mm');
  await expect(page.locator('label[for="at-st-grosime"]')).toHaveText('Înălțimea (mm)');
  await expect(page.locator('#at-st-linie')).toHaveCount(0);
  await expect(cote(page)).toContainText('66,6 × 68,3 × 8 mm');
  await expect(page.locator('#at-st-info')).toHaveText('Colțurile au 45°; vârfurile dinăuntru stau la 15,8 mm de mijloc. Marginea are 1,2 mm, iar mijlocul, 8 mm.');
  await page.locator('#at-st-ag [data-v="fara"]').click();
  await expect(nume(page)).toHaveText('Stea cu 5 colțuri Ø70, interiorul la 45 %, în relief, 8 mm, fără inel');
  await expect(cote(page)).toContainText('66,6 × 63,3 × 8 mm');
  // 6 și 8 colțuri: cu 8, lată cât diametrul (colțuri la 0° și 180°), înaltă 70 și inelul
  await page.locator('#at-st-repede [data-v="4"]').click();
  await expect(nume(page)).toHaveText('Stea cu 8 colțuri Ø70, interiorul la 55 %, fără inel');
  await expect(cote(page)).toContainText('70 × 70 × 3 mm');
  await expect(avert(page)).toBeHidden();
});

test('steaua: colțurile prea ascuțite și conturul prea gros se spun; numerele din afara marginilor nu sunt primite', async ({ page }) => {
  await atelier(page, 'stea', 'Stea cu 5 colțuri Ø70');
  // 8 colțuri cu interiorul la 30 %: colțuri de 18°
  await page.locator('#at-st-varfuri [data-v="8"]').click();
  await scrie(page, '#at-st-interior', '30');
  await expect(nume(page)).toHaveText('Stea cu 8 colțuri Ø70, interiorul la 30 %');
  await expect(avert(page)).toBeVisible();
  await expect(avert(page)).toContainText('Colțurile stelei sunt foarte ascuțite (18°): la tipărit ies rotunjite și se rup ușor.');
  await page.locator('#at-st-varfuri [data-v="5"]').click();
  await expect(avert(page)).toBeHidden();
  // Ø30 cu interiorul la 30 %: conturul de 4 mm nu mai lasă gol
  await scrie(page, '#at-st-diam', '30');
  await page.locator('#at-st-fel [data-v="contur"]').click();
  await scrie(page, '#at-st-linie', '4');
  await expect(nume(page)).toHaveText('Stea cu 5 colțuri Ø30, interiorul la 30 %, contur de 4');
  await expect(avert(page)).toContainText('Conturul de 4 mm e prea gros pentru steaua asta: am făcut-o plină.');
  for (const [id, rau, bun] of [['diam', '200', '30'], ['interior', '80', '30'], ['interior', '20', '30'], ['grosime', '13', '3'], ['linie', '7', '4'], ['linie', '1', '4']] as const) {
    await scrie(page, `#at-st-${id}`, rau);
    await expect(page.locator(`#at-st-${id}`), id).toHaveValue(bun);
  }
});

test('brăduțul: de agățat sau în picioare (două plăci cu fante), mărimile gata, etajele și lățimea', async ({ page }) => {
  await atelier(page, 'brad', 'Brăduț de 80 mm, 3 etaje');
  await expect(page.locator('#at-editor h2')).toHaveText('Brăduț');
  // lat de 65 % din înălțime; înalt cu inelul (80 + 5)
  await expect(cote(page)).toContainText('52 × 85 × 3 mm');
  await expect(page.locator('#at-bd-repede button')).toHaveText(['50 mm', '80 mm', '120 mm']);
  await expect(apasat(page, 'at-bd-repede')).toHaveText('80 mm');
  await expect(apasat(page, 'at-bd-fel')).toHaveText('De agățat');
  await expect(page.locator('#at-bd-ag button')).toHaveText(['Inel', 'Gaură', 'Fără']);
  await expect(page.locator('#at-bd-info')).toHaveText('Lat de 52 mm la bază.');
  await page.locator('#at-bd-ag [data-v="gaura"]').click();
  await expect(nume(page)).toHaveText('Brăduț de 80 mm, 3 etaje, cu gaură');
  await expect(cote(page)).toContainText('52 × 80 × 3 mm');
  // 5 etaje, lat de 50 %
  await scrie(page, '#at-bd-etaje', '5');
  await scrie(page, '#at-bd-latime', '50');
  await expect(nume(page)).toHaveText('Brăduț de 80 mm, 5 etaje, lat de 50 %, cu gaură');
  await expect(cote(page)).toContainText('40 × 80 × 3 mm');
  await scrie(page, '#at-bd-etaje', '3');
  await scrie(page, '#at-bd-latime', '65');
  // în picioare: două plăci alăturate (52 + 3 + 52), fără agățătoare; fanta: 3 + 2 · (0,1 + 0,1); a doua placă, tăiată unde
  // lângă fantă rămân 1,2 mm: 56,53 + 23,47 · (13 − 2,9) / 13 = 74,77
  await page.locator('#at-bd-fel [data-v="picioare"]').click();
  await expect(nume(page)).toHaveText('Brăduț de 80 mm, 3 etaje, în picioare');
  await expect(cote(page)).toContainText('107 × 80 × 3 mm');
  await expect(page.locator('#at-bd-ag')).toHaveCount(0);
  await expect(page.locator('#at-bd-info')).toHaveText('Două plăci late de 52 mm. Fantele au 3,4 mm: grosimea plăcii și jocul din calibrare. A doua placă se oprește la 74,8 mm, unde lângă fantă mai rămân 1,2 mm.');
  await expect(avert(page)).toBeHidden();
  // 120 mm: plăci late de 78
  await page.locator('#at-bd-repede [data-v="120"]').click();
  await expect(nume(page)).toHaveText('Brăduț de 120 mm, 3 etaje, în picioare');
  await expect(cote(page)).toContainText('159 × 120 × 3 mm');
  // prea mic pentru plăci de 3 mm: a doua placă nu mai ajunge în vârf
  await scrie(page, '#at-bd-inaltime', '30');
  await expect(avert(page)).toContainText('La mărimea asta, a doua placă a bradului nu ajunge până în vârf: fă-l mai mare, mai lat sau mai subțire.');
  await scrie(page, '#at-bd-grosime', '1.2');
  await expect(nume(page)).toHaveText('Brăduț de 30 mm, 3 etaje, 1,2 mm, în picioare');
  await expect(avert(page)).toBeHidden();
  for (const [id, rau, bun] of [['inaltime', '200', '30'], ['etaje', '1', '3'], ['etaje', '7', '3'], ['latime', '95', '65'], ['grosime', '7', '1.2']] as const) {
    await scrie(page, `#at-bd-${id}`, rau);
    await expect(page.locator(`#at-bd-${id}`), id).toHaveValue(bun);
  }
  // înapoi la cel de agățat: agățătoarea aleasă înainte a rămas
  await page.locator('#at-bd-fel [data-v="agatat"]').click();
  await expect(apasat(page, 'at-bd-ag')).toHaveText('Gaură');
});

test('STL-urile decorațiunilor sunt închise, cu cotele de pe hârtie; piesele intră în listă, pe nume', async ({ page }) => {
  await atelier(page, 'fulg', 'Fulg Ø70, ramuri 2 × 60°');
  const f = await descarca(page);
  expect([f.fisier, f.rele]).toEqual(['fulg_70_ramuri_2_x_60.stl', 0]);
  aproape(f.dim, [63.27, 75, 2.4]);
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  await page.locator('#at-galerie [data-piesa="stea"]').click();
  await expect(nume(page)).toHaveText('Stea cu 5 colțuri Ø70');
  const s = await descarca(page);
  expect([s.fisier, s.rele]).toEqual(['stea_cu_5_colturi_70.stl', 0]);
  aproape(s.dim, [70 * Math.cos(Math.PI / 10), 35 * Math.sin(0.3 * Math.PI) + 40, 3]);
  await page.locator('#at-st-fel [data-v="relief"]').click();
  await expect(nume(page)).toHaveText('Stea cu 5 colțuri Ø70, în relief');
  const r = await descarca(page);
  expect(r.rele).toBe(0);
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  await page.locator('#at-galerie [data-piesa="brad"]').click();
  await page.locator('#at-bd-fel [data-v="picioare"]').click();
  await expect(nume(page)).toHaveText('Brăduț de 80 mm, 3 etaje, în picioare');
  const b = await descarca(page);
  expect([b.fisier, b.rele]).toEqual(['bradut_de_80_mm_3_etaje_in_picioare.stl', 0]);
  aproape(b.dim, [107, 80, 3]);
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  await expect(page.locator('#at-lista')).toContainText('Fulg Ø70, ramuri 2 × 60°');
  await expect(page.locator('#at-lista')).toContainText('Stea cu 5 colțuri Ø70, în relief');
  await expect(page.locator('#at-lista')).toContainText('Brăduț de 80 mm, 3 etaje, în picioare');
  await expect(page.locator('#at-lista')).toContainText('107 × 80 × 3');
  // doi fulgi fără ramuri sunt aceeași piesă, oricare le-ar fi unghiul ramurilor: se adună pe același rând al listei
  await page.locator('#at-galerie [data-piesa="fulg"]').click();
  await page.locator('#at-fg-repede [data-v="5"]').click();
  await expect(nume(page)).toHaveText('Fulg Ø70, fără ramuri, miez gol, linia 3');
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  await scrie(page, '#at-fg-unghi', '45');
  await page.getByRole('button', { name: 'Adaugă în lista de printat' }).click();
  const rand = page.locator('#at-lista tr', { hasText: 'Fulg Ø70, fără ramuri, miez gol, linia 3' });
  await expect(rand).toHaveCount(1);
  await expect(rand.locator('.pas-n')).toHaveText('2');
  await expect(page.locator('#at-lista tr')).toHaveCount(4);
});
