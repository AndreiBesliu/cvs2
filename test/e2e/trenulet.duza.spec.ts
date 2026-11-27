/**
 * Duza Kort în atelierul Easy 3Draw (ADR 0340, felia 3.Cm-7), pe pagina de sine stătătoare a planificatorului (din aceleași
 * surse ca pachetul):
 * - la elicea de barcă, „Piesa: Elicea / Duza Kort”: duza implicită (Ø40, jocul 0,8, lungimea 0,5), cu numele, textul (interiorul,
 *   lungimea, urechile pe grila axului, montajul pe grindă) și câmpurile ei (jocul, lungimea, urechile); sensul, gaura și
 *   capacul sunt ale elicei;
 * - lungimea prea mică pentru elice crește singură și o spune; un câmp din afara plajei e adus la margine, cu mesajul;
 * - „Fă elicea cu duza”: elicea și duza ei, în listă; înapoi la elice, elicea e cea de dinainte (aceeași linie în listă);
 * - STL-ul duzei, un corp închis, cu urechile până la 8 · k + 3,6 de ax.
 * Valorile „pe hârtie” sunt calculate separat de motor (formulele din ADR).
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

const ELICE = 'Elice de barcă Ø40 cu 3 palete, pasul 1';
// pe hârtie: Ri = 20 + 0,8 = 20,8 (Ø41,6); L = max(0,5 · 40, 3,8 + 11,5 + 1) = 20
const DUZA = 'Duză Kort Ø41,6 × 20, cu 2 urechi';

async function atelierDuza(page: Page): Promise<void> {
  await threeDinPachet(page);
  await page.setContent(paginiPlanificator().preview);
  await intraIn3D(page);
  await page.locator('#at-tipuri [data-fila="propulsie"]').click();
  await page.locator('#at-galerie [data-piesa="eliceBarca"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText(ELICE);
  await page.locator('#at-eb-piesa [data-v="duza"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText(DUZA);
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

test('duza implicită: numele, textul, câmpurile ei; sensul, gaura și capacul sunt ale elicei', async ({ page }) => {
  await atelierDuza(page);
  await expect(page.locator('#at-eb-piesa [aria-pressed="true"]')).toHaveAttribute('data-v', 'duza');
  // k = ⌈(26,4 + 3,2 + 0,4) / 8⌉ = 4: urechile la 32 mm de ax; grinda de 9
  await expect(page.locator('#at-eb-info')).toHaveText('Duza: Ø41,6 în interior (0,8 mm de vârful paletelor), lungă de 20 mm, cu gura dinspre barcă rotunjită, pe masă; se tipărește fără suport. Urechile, la 32 mm de ax (4 știfturi). Pe o grindă de 9, prinsă cu știfturi de urechi, axul trece prin gaura din mijloc; pe grindă, o jumătate de bucșă, iar pe ea elicea, în duză.');
  for (const [camp, v] of [['joc', '0.8'], ['lung', '0.5']] as const) await expect(page.locator(`#at-eb-${camp}`)).toHaveValue(v);
  await expect(page.locator('#at-eb-urechi [aria-pressed="true"]')).toHaveAttribute('data-v', '2');
  for (const ce of ['sens', 'sensul', 'gaura', 'capac', 'pereche']) await expect(page.locator(`#at-eb-${ce}`)).toHaveCount(0);
  await expect(page.locator('#at-tipar')).toBeHidden();
  // jocul 1,5 → Ri 21,5 (Ø43); lungimea 0,3 (12) nu cuprinde elicea (16,3): crește și o spune; 4 urechi
  await seteaza(page, '#at-eb-joc', '1.5');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Duză Kort Ø43 × 20, cu 2 urechi');
  await seteaza(page, '#at-eb-lung', '0.3');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Duză Kort Ø43 × 16,3, cu 2 urechi');
  await expect(page.locator('#at-eb-info')).toContainText('Mai lungă decât 0,3 × diametrul, ca să cuprindă toată elicea.');
  await page.locator('#at-eb-urechi [data-v="4"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Duză Kort Ø43 × 16,3, cu 4 urechi');
  // un câmp din afara plajei: marginea, cu mesajul
  await seteaza(page, '#at-eb-joc', '3');
  await expect(page.locator('#at-eb-joc')).toHaveValue('2');
  await expect(page.locator('#at-plaja')).toHaveText('Jocul de la vârful paletelor e între 0,3 și 2 mm: l-am făcut de 2 mm.');
  await seteaza(page, '#at-eb-lung', '0.9');
  await expect(page.locator('#at-plaja')).toHaveText('Lungimea unei duze Kort e între 0,3 și 0,8 × diametrul: am făcut-o de 0,8.');
  // diametrul e al elicei: o duză mai mare
  await seteaza(page, '#at-eb-diam', '56');
  await expect(page.locator('#at-nume-piesa')).toContainText('Duză Kort Ø60 × ');
});

test('„Fă elicea cu duza”: elicea și duza, în listă; înapoi la elice, aceeași elice ca înainte', async ({ page }) => {
  await atelierDuza(page);
  await page.locator('#at-eb-cu-duza').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText([ELICE, DUZA]);
  await page.locator('#at-eb-piesa [data-v="elice"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText(ELICE);
  for (const ce of ['sens', 'gaura', 'capac', 'pereche']) await expect(page.locator(`#at-eb-${ce}`)).toHaveCount(1);
  await expect(page.locator('#at-eb-joc')).toHaveCount(0);
  // elicea din editor e același rând din listă cu cea pusă de „Fă elicea cu duza”
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText([ELICE, DUZA]);
  // capacul e al elicei: cu el, altă elice, dar aceeași duză (același rând din listă)
  await page.locator('#at-eb-capac [data-v="da"]').click();
  await page.locator('#at-eb-piesa [data-v="duza"]').click();
  await page.locator('#at-eb-cu-duza').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText([ELICE, DUZA, ELICE + ', cu capac']);
});

test('STL-ul duzei e un corp închis, cu urechile până la 8 · k + 3,6 de ax (Ø40, 4 urechi: 35,6)', async ({ page }) => {
  await atelierDuza(page);
  await page.locator('#at-eb-urechi [data-v="4"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Duză Kort Ø41,6 × 20, cu 4 urechi');
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const { triunghiuri, rele, raza } = citesteStl(readFileSync(await (await descarcare).path()));
  expect(triunghiuri).toBeGreaterThan(1_000);
  expect(rele).toBe(0);
  expect(raza).toBeCloseTo(32 + 3.6, 1);
});
