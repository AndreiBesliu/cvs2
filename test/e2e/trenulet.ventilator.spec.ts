/**
 * Ventilatorul cu carcasă în atelierul Easy 3Draw (ADR 0282, felia 3.Ts), pe pagina de sine stătătoare a planificatorului (din
 * aceleași surse ca pachetul):
 * - a treia piesă a filei „Elice”: rotorul implicit (7 palete, Ø40 în carcasă, jocul 0,8, pasul 0,8, lățimea 45 %), cu numele,
 *   cotele și textul (vârful la Ø38,4; butucul Ø9,6 × 8; pasul 32 mm; 47° lângă butuc, 15° la vârf; consola 0,8 mm pe strat;
 *   carcasa Ø40 / Ø44, înaltă de 9, cu găurile urechilor la 24 mm de ax);
 * - piesa: rotorul (sensul, gaura, inelul) sau carcasa (urechile); câmpurile sunt ale amândurora, iar carcasa crește cu paletele;
 * - „Repede”: diametrele pe grila de știfturi (Ø24, Ø32, Ø40, Ø48), cu înălțimea carcasei și locul găurilor urechilor;
 * - editorul: fiecare alegere și fiecare câmp (rotunjit la pasul lui, doar în plajă) ajung în piesă; jocul și lățimea intră în
 *   nume doar când nu sunt cele obișnuite;
 * - STL-urile închise (rotorul cu inel, carcasa cu 4 urechi); „Fă ventilatorul”: rotorul și carcasa lui, în listă.
 * Valorile „pe hârtie” sunt calculate separat de motor (formulele din ADR).
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

const IMPLICIT = 'Rotor de ventilator Ø40 cu 7 palete, pasul 0,8';
const CARCASA = 'Carcasă de ventilator Ø40 × 9, cu 2 urechi';

async function atelierVentilator(page: Page): Promise<void> {
  await threeDinPachet(page);
  await page.setContent(paginiPlanificator().preview);
  await intraIn3D(page);
  await page.locator('#at-tipuri [data-fila="propulsie"]').click();
  await page.locator('#at-galerie [data-piesa="ventilator"]').click();
  await expect(page.locator('#at-galerie [data-piesa="ventilator"]')).toHaveAttribute('aria-pressed', 'true');
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

test('ventilatorul implicit, a treia piesă a filei Elice: rotorul de 7 palete, Ø40 în carcasă; textul cu rotorul și carcasa', async ({ page }) => {
  await atelierVentilator(page);
  await expect(page.locator('#at-tipuri [data-fila="propulsie"]')).toHaveText('Elice 4');
  await expect(page.locator('#at-galerie [data-piesa]')).toHaveText(['Elice', 'Elice de barcă', 'Ventilator cu carcasă', 'Roată cu palete']);
  await expect(page.locator('#at-editor h2').first()).toHaveText('Ventilator cu carcasă');
  // pe hârtie: vârful la 20 − 0,8 = 19,2; butucul max(4; 0,25 · 19,2 = 4,8) → Ø9,6, înalt de 8 (paletele, 4,59); P = 0,8 · 40;
  // atan(32 / (2π · 4,8)) = 46,70° la butuc, atan(32 / (2π · 19,2)) = 14,86° la vârf; 0,2 / tan 14,86° = 0,754; carcasa:
  // ⌈4,59⌉ + 4 = 9; găurile la ⌈(20 + 0,8 + 3,2) / 8⌉ · 8 = 24 de ax
  await expect(page.locator('#at-ve-info')).toHaveText('Rotorul: paletele până la Ø38,4 (0,8 mm de carcasă), pe un butuc de Ø9,6 × 8 mm. Pasul 32 mm (0,8 × diametrul): paleta stă la 47° lângă butuc și la 15° la vârf; la vârf, un strat iese cu 0,8 mm peste cel de dedesubt. Carcasa: Ø40 în interior, Ø44 în afară, înaltă de 9 mm; găurile urechilor, la 24 mm de ax (3 știfturi).');
  await expect(page.locator('#at-cote')).toContainText('× 8 mm');
  await expect(page.locator('#at-avert')).toBeHidden();
  // editorul, la început: câmpurile și alegerile implicite; la „Repede”, Ø40; urechile sunt ale carcasei
  for (const [camp, v] of [['palete', '7'], ['diam', '40'], ['joc', '0.8'], ['pas', '0.8'], ['lat', '45']] as const) await expect(page.locator(`#at-ve-${camp}`)).toHaveValue(v);
  for (const [grup, v] of [['piesa', 'rotor'], ['repede', '40'], ['sens', 'dreapta'], ['gaura', 'x'], ['inel', 'nu']] as const)
    await expect(page.locator(`#at-ve-${grup} [aria-pressed="true"]`)).toHaveAttribute('data-v', v);
  await expect(page.locator('#at-ve-urechi')).toHaveCount(0);
  // un câmp în afara plajei nu schimbă piesa
  for (const [camp, rau] of [['palete', '2'], ['palete', '13'], ['diam', '23.9'], ['diam', '121'], ['joc', '0.2'], ['joc', '2.1'], ['pas', '0.29'], ['pas', '1.6'], ['lat', '14'], ['lat', '61']] as const) {
    await seteaza(page, `#at-ve-${camp}`, rau);
    await expect(page.locator('#at-nume-piesa')).toHaveText(IMPLICIT);
  }
  // elicea de barcă (3.Tr) rămâne a doua piesă a filei, cu editorul ei
  await page.locator('#at-galerie [data-piesa="eliceBarca"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice de barcă Ø40 cu 3 palete, pasul 1');
  await page.locator('#at-galerie [data-piesa="ventilator"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText(IMPLICIT);
});

test('piesa: carcasa are urechile (2 sau 4), nu sensul, gaura sau inelul; crește cu paletele, ca să le cuprindă', async ({ page }) => {
  await atelierVentilator(page);
  await page.locator('#at-ve-piesa [data-v="carcasa"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText(CARCASA);
  // pe hârtie: pe x, până la marginea urechii (24 + 3,6); pe y, tubul (Ø44)
  await expect(page.locator('#at-cote')).toContainText('55,2 × 44 × 9 mm');
  for (const grup of ['sens', 'gaura', 'inel']) await expect(page.locator(`#at-ve-${grup}`)).toHaveCount(0);
  await expect(page.locator('#at-ve-urechi [data-v]')).toHaveText(['Două', 'Patru']);
  await expect(page.locator('#at-ve-urechi [aria-pressed="true"]')).toHaveAttribute('data-v', '2');
  await page.locator('#at-ve-urechi [data-v="4"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Carcasă de ventilator Ø40 × 9, cu 4 urechi');
  await expect(page.locator('#at-cote')).toContainText('55,2 × 55,2 × 9 mm');
  // paletele mai înalte (pasul 1,5, lățimea 60 %: 7,60 mm) cer carcasa de ⌈7,60⌉ + 4 = 12
  await seteaza(page, '#at-ve-pas', '1.5');
  await seteaza(page, '#at-ve-lat', '60');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Carcasă de ventilator Ø40 × 12, cu 4 urechi');
  await expect(page.locator('#at-ve-info')).toContainText('Carcasa: Ø40 în interior, Ø44 în afară, înaltă de 12 mm;');
  // înapoi la rotor: aceleași palete, sensul, gaura și inelul la locul lor, fără urechi
  await page.locator('#at-ve-piesa [data-v="rotor"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Rotor de ventilator Ø40 cu 7 palete, pasul 1,5, lățimea 60 %');
  await expect(page.locator('#at-ve-urechi')).toHaveCount(0);
  for (const grup of ['sens', 'gaura', 'inel']) await expect(page.locator(`#at-ve-${grup}`)).toHaveCount(1);
});

test('„Repede”: diametrele pe grila de știfturi, cu carcasa și găurile ei; un diametru scris de mână nu mai e niciunul', async ({ page }) => {
  await atelierVentilator(page);
  await expect(page.locator('#at-ve-repede [data-v]')).toHaveText(['Ø24', 'Ø32', 'Ø40', 'Ø48']);
  // pe hârtie: Ø24 → vârful 22,4, butucul Ø8, carcasa 8, găurile la ⌈16 / 8⌉ · 8 = 16; Ø32 → butucul Ø8 (0,25 · 15,2 = 3,8),
  // carcasa 8, găurile la ⌈20 / 8⌉ · 8 = 24; Ø48 → butucul 0,25 · 23,2 = 5,8 → Ø11,6, carcasa ⌈5,37⌉ + 4 = 10, găurile la 32
  for (const [d, butuc, carcasa] of [
    ['24', 'Ø22,4 (0,8 mm de carcasă), pe un butuc de Ø8 × 8 mm', 'Carcasa: Ø24 în interior, Ø28 în afară, înaltă de 8 mm; găurile urechilor, la 16 mm de ax (2 știfturi).'],
    ['32', 'Ø30,4 (0,8 mm de carcasă), pe un butuc de Ø8 × 8 mm', 'Carcasa: Ø32 în interior, Ø36 în afară, înaltă de 8 mm; găurile urechilor, la 24 mm de ax (3 știfturi).'],
    ['48', 'Ø46,4 (0,8 mm de carcasă), pe un butuc de Ø11,6 × 8 mm', 'Carcasa: Ø48 în interior, Ø52 în afară, înaltă de 10 mm; găurile urechilor, la 32 mm de ax (4 știfturi).'],
    ['40', 'Ø38,4 (0,8 mm de carcasă), pe un butuc de Ø9,6 × 8 mm', 'Carcasa: Ø40 în interior, Ø44 în afară, înaltă de 9 mm; găurile urechilor, la 24 mm de ax (3 știfturi).'],
  ] as const) {
    await page.locator(`#at-ve-repede [data-v="${d}"]`).click();
    await expect(page.locator('#at-nume-piesa')).toHaveText(`Rotor de ventilator Ø${d} cu 7 palete, pasul 0,8`);
    await expect(page.locator('#at-ve-diam')).toHaveValue(d);
    await expect(page.locator('#at-ve-repede [aria-pressed="true"]')).toHaveAttribute('data-v', d);
    await expect(page.locator('#at-ve-info')).toContainText(`Rotorul: paletele până la ${butuc}.`);
    await expect(page.locator('#at-ve-info')).toContainText(carcasa);
  }
  await seteaza(page, '#at-ve-diam', '41');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Rotor de ventilator Ø41 cu 7 palete, pasul 0,8');
  await expect(page.locator('#at-ve-repede [aria-pressed="true"]')).toHaveCount(0);
});

test('editorul: fiecare alegere și fiecare câmp ajung în piesă; câmpurile, rotunjite la pasul lor și doar în plajă', async ({ page }) => {
  await atelierVentilator(page);
  const nume = page.locator('#at-nume-piesa'), apasat = (grup: string) => page.locator(`#at-ve-${grup} [aria-pressed="true"]`);
  // alegerile
  await page.locator('#at-ve-sens [data-v="stanga"]').click();
  await expect(nume).toHaveText(IMPLICIT + ', stânga');
  await expect(apasat('sens')).toHaveAttribute('data-v', 'stanga');
  await page.locator('#at-ve-sens [data-v="dreapta"]').click();
  for (const [g, coada] of [['r', ', gaură rotundă'], ['b', ', pentru bară'], ['nu', ', fără gaură'], ['x', '']] as const) {
    await page.locator(`#at-ve-gaura [data-v="${g}"]`).click();
    await expect(nume).toHaveText(IMPLICIT + coada);
    await expect(apasat('gaura')).toHaveAttribute('data-v', g);
  }
  // inelul: în același contur (vârful tot la Ø38,4), înalt cât paletele (4,58 → 4,6)
  await page.locator('#at-ve-inel [data-v="da"]').click();
  await expect(nume).toHaveText(IMPLICIT + ', cu inel');
  await expect(page.locator('#at-ve-info')).toContainText('la vârf, un strat iese cu 0,8 mm peste cel de dedesubt. Inelul, gros de 1,2 mm, e înalt de 4,6 mm. Carcasa:');
  // în nume, gaura stă înaintea inelului
  await page.locator('#at-ve-gaura [data-v="r"]').click();
  await expect(nume).toHaveText(IMPLICIT + ', gaură rotundă, cu inel');
  await page.locator('#at-ve-gaura [data-v="x"]').click();
  await page.locator('#at-ve-inel [data-v="nu"]').click();
  await expect(nume).toHaveText(IMPLICIT);
  // câmpurile: paletele la întreg, diametrul și jocul la zecime, pasul la sutime, lățimea la întreg
  // (câmpul arată, după redesenare, ce a intrat în piesă: valoarea rotunjită, nu ce a scris omul)
  await seteaza(page, '#at-ve-palete', '8.6');
  await expect(nume).toHaveText('Rotor de ventilator Ø40 cu 9 palete, pasul 0,8');
  await expect(page.locator('#at-ve-palete')).toHaveValue('9');
  await seteaza(page, '#at-ve-diam', '56.26');
  await expect(nume).toHaveText('Rotor de ventilator Ø56,3 cu 9 palete, pasul 0,8');
  await expect(page.locator('#at-ve-diam')).toHaveValue('56.3');
  await seteaza(page, '#at-ve-pas', '1.204');
  await expect(nume).toHaveText('Rotor de ventilator Ø56,3 cu 9 palete, pasul 1,2');
  await expect(page.locator('#at-ve-pas')).toHaveValue('1.2');
  // jocul intră în nume doar când nu e cel obișnuit (0,8)
  await seteaza(page, '#at-ve-joc', '1.46');
  await expect(page.locator('#at-ve-joc')).toHaveValue('1.5');
  await expect(nume).toHaveText('Rotor de ventilator Ø56,3 cu 9 palete, pasul 1,2, jocul 1,5 mm');
  // pe hârtie: vârful la 28,15 − 1,5 = 26,65; butucul 0,25 · 26,65 → 6,7 (Ø13,4); P = 1,2 · 56,3 = 67,56; atan(67,56 /
  // (2π · 6,7)) = 58,07° la butuc, atan(67,56 / (2π · 26,65)) = 21,97° la vârf; consola 0,496; paletele, 6,89 → carcasa 11;
  // găurile la ⌈(28,15 + 0,8 + 3,2) / 8⌉ · 8 = 40
  await expect(page.locator('#at-ve-info')).toHaveText('Rotorul: paletele până la Ø53,3 (1,5 mm de carcasă), pe un butuc de Ø13,4 × 8 mm. Pasul 68 mm (1,2 × diametrul): paleta stă la 58° lângă butuc și la 22° la vârf; la vârf, un strat iese cu 0,5 mm peste cel de dedesubt. Carcasa: Ø56,3 în interior, Ø60,3 în afară, înaltă de 11 mm; găurile urechilor, la 40 mm de ax (5 știfturi).');
  // lățimea intră în nume doar când nu e cea obișnuită (45 %)
  await seteaza(page, '#at-ve-lat', '30.4');
  await expect(page.locator('#at-ve-lat')).toHaveValue('30');
  await expect(nume).toHaveText('Rotor de ventilator Ø56,3 cu 9 palete, pasul 1,2, jocul 1,5 mm, lățimea 30 %');
  await seteaza(page, '#at-ve-lat', '45');
  await expect(nume).toHaveText('Rotor de ventilator Ø56,3 cu 9 palete, pasul 1,2, jocul 1,5 mm');
  // marginile plajei: chiar pe margine intră, dincolo de ea nu (piesa rămâne; la redesenare, câmpul arată iar ce e în piesă)
  const r = (d: string, z: string, p: string, j: string, l = '') => `Rotor de ventilator Ø${d} cu ${z} palete, pasul ${p}, jocul ${j} mm${l}`;
  for (const [camp, bun, rau, cum] of [
    ['palete', '12', '13', r('56,3', '12', '1,2', '1,5')], ['palete', '3', '2', r('56,3', '3', '1,2', '1,5')],
    ['diam', '120', '120.1', r('120', '3', '1,2', '1,5')], ['diam', '24', '23.9', r('24', '3', '1,2', '1,5')],
    ['joc', '2', '2.1', r('24', '3', '1,2', '2')], ['joc', '0.3', '0.2', r('24', '3', '1,2', '0,3')],
    ['pas', '1.5', '1.51', r('24', '3', '1,5', '0,3')], ['pas', '0.3', '0.29', r('24', '3', '0,3', '0,3')],
    ['lat', '60', '61', r('24', '3', '0,3', '0,3', ', lățimea 60 %')], ['lat', '15', '14', r('24', '3', '0,3', '0,3', ', lățimea 15 %')],
  ] as const) {
    await seteaza(page, `#at-ve-${camp}`, bun);
    await expect(nume).toHaveText(cum);
    await seteaza(page, `#at-ve-${camp}`, rau);
    await expect(nume).toHaveText(cum);
    await page.locator('#at-ve-sens [data-v="dreapta"]').click();
    await expect(page.locator(`#at-ve-${camp}`)).toHaveValue(bun);
  }
  // cel mai mic și mai culcat: Ø24 cu jocul 0,3, 3 palete, pasul 0,3 (P 7,2): atan(7,2 / 8π) = 15,99° la butuc,
  // atan(7,2 / (2π · 11,7)) = 5,59° la vârf; consola 2,04; paletele, 1,51 → carcasa de 8 (cel puțin cât un știft)
  await expect(page.locator('#at-ve-info')).toHaveText('Rotorul: paletele până la Ø23,4 (0,3 mm de carcasă), pe un butuc de Ø8 × 8 mm. Pasul 7 mm (0,3 × diametrul): paleta stă la 16° lângă butuc și la 6° la vârf; la vârf, un strat iese cu 2 mm peste cel de dedesubt. Carcasa: Ø24 în interior, Ø28 în afară, înaltă de 8 mm; găurile urechilor, la 16 mm de ax (2 știfturi).');
  // inelul, aici cel puțin 2 (paletele au doar 1,51)
  await page.locator('#at-ve-inel [data-v="da"]').click();
  await expect(page.locator('#at-ve-info')).toContainText('Inelul, gros de 1,2 mm, e înalt de 2 mm.');
});

test('STL-urile descărcate sunt corpuri închise: rotorul cu inel (raza 19,2) și carcasa cu 4 urechi (până la 27,6 de ax)', async ({ page }) => {
  await atelierVentilator(page);
  const stl = async () => {
    const descarcare = page.waitForEvent('download');
    await page.locator('#at-stl').click();
    const d = await descarcare;
    expect(d.suggestedFilename()).toMatch(/\.stl$/);
    return citesteStl(readFileSync(await d.path()));
  };
  await page.locator('#at-ve-inel [data-v="da"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText(IMPLICIT + ', cu inel');
  // cu inelul, cutia e simetrică față de ax: raza cea mai mare, a inelului, 20 − 0,8
  const rotor = await stl();
  expect(rotor.triunghiuri).toBeGreaterThan(5_000);
  expect(rotor.rele).toBe(0);
  expect(rotor.raza).toBeCloseTo(19.2, 1);
  await page.locator('#at-ve-piesa [data-v="carcasa"]').click();
  await page.locator('#at-ve-urechi [data-v="4"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Carcasă de ventilator Ø40 × 9, cu 4 urechi');
  // cu 4 urechi, cutia e simetrică față de ax: marginea urechii, 24 + 3,6
  const carcasa = await stl();
  expect(carcasa.triunghiuri).toBeGreaterThan(1_000);
  expect(carcasa.rele).toBe(0);
  expect(carcasa.raza).toBeCloseTo(27.6, 1);
});

test('„Fă ventilatorul”: rotorul și carcasa lui, în listă (cu inelul și urechile alese)', async ({ page }) => {
  await atelierVentilator(page);
  await page.locator('#at-ve-piesa [data-v="carcasa"]').click();
  await page.locator('#at-ve-urechi [data-v="4"]').click();
  await page.locator('#at-ve-piesa [data-v="rotor"]').click();
  await page.locator('#at-ve-inel [data-v="da"]').click();
  await page.locator('#at-ve-fa').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText([IMPLICIT + ', cu inel', 'Carcasă de ventilator Ø40 × 9, cu 4 urechi']);
  // în editor rămâne rotorul
  await expect(page.locator('#at-ve-piesa [aria-pressed="true"]')).toHaveAttribute('data-v', 'rotor');
  // aceeași carcasă, adăugată din editor după ce rotorul și-a schimbat sensul (al lui, nu al carcasei), ajunge pe aceeași linie
  await page.locator('#at-ve-sens [data-v="stanga"]').click();
  await page.locator('#at-ve-piesa [data-v="carcasa"]').click();
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText([IMPLICIT + ', cu inel', 'Carcasă de ventilator Ø40 × 9, cu 4 urechi']);
  await expect(page.locator('#at-lista tr .pas-n')).toHaveText(['1', '2']);
});
