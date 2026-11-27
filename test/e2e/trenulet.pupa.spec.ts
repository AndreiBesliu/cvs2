/**
 * Înclinarea spre pupa a elicei de barcă, în atelierul Easy 3Draw (ADR 0282, felia 3.Tt), pe pagina de sine stătătoare a
 * planificatorului (din aceleași surse ca pachetul):
 * - câmpul „Înclinarea spre pupa (°)”: 0 la început (elicea de dinainte, fără suport), la întreg, adus în 0–15 (cu mesajul de
 *   sub câmpuri, ADR 0340, 3.Cm-4); ce intră schimbă
 *   numele, butucul (crește cât cel mai înalt vârf al paletelor) și textul (cât urcă vârful de pe masă și că cere suport);
 * - în listă: fără înclinare, piesa e cea de dinainte (o listă salvată cu 18.22.0 adună pe aceeași linie, iar ce se scrie e
 *   exact ce scria 18.22.0); cu ea, o linie a ei; „Fă perechea” o păstrează pe ambele sensuri;
 * - STL-ul e un corp închis.
 * Valorile „pe hârtie” sunt calculate separat de motor (formulele din ADR).
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

const IMPLICIT = 'Elice de barcă Ø40 cu 3 palete, pasul 1';
const PAGINA = 'http://easy3draw.test/';
const CHEIE = 'atelier.caramizi.v1';
/** Elicea de barcă implicită, cum o scria 18.22.0 în listă și în editor (fără `pupa`). */
const VECHE = { palete: 3, diametru: 40, pas: 1, latime: 100, inclinare: 20, sens: 'dreapta', gaura: 'x', capac: 'nu' };

/** Pagina planificatorului, cu stocarea dată (ca la o deschidere de mai târziu), pe elicea de barcă. */
async function atelierBarca(page: Page, stocat?: unknown): Promise<void> {
  await page.route(PAGINA, (r) => r.fulfill({ body: paginiPlanificator().preview, contentType: 'text/html; charset=utf-8' }));
  await threeDinPachet(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (stocat !== undefined) await page.addInitScript(([k, s]) => { localStorage.setItem(k, s); }, [CHEIE, JSON.stringify(stocat)] as const);
  await page.goto(PAGINA);
  await intraIn3D(page);
  await page.locator('#at-tipuri [data-fila="propulsie"]').click();
  await page.locator('#at-galerie [data-piesa="eliceBarca"]').click();
  await expect(page.locator('#at-galerie [data-piesa="eliceBarca"]')).toHaveAttribute('aria-pressed', 'true');
}
async function seteaza(page: Page, sel: string, v: string): Promise<void> {
  await page.locator(sel).fill(v);
  await page.locator(sel).blur();
}
const scris = async (page: Page) => JSON.parse(await page.evaluate((k) => localStorage.getItem(k) ?? 'null', CHEIE)) as { lista: { def: Record<string, unknown>; bucati: number }[] };

/** Muchiile fără pereche ale unui STL binar, cea mai mare rază față de mijlocul cutiei (pe x, y) și înălțimea. */
function citesteStl(stl: Buffer): { triunghiuri: number; rele: number; raza: number; inalt: number } {
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
  const lim = [0, 1, 2].map((k) => [Math.min(...pts.map((p) => p[k]!)), Math.max(...pts.map((p) => p[k]!))] as const);
  const cx = (lim[0]![0] + lim[0]![1]) / 2, cy = (lim[1]![0] + lim[1]![1]) / 2;
  return { triunghiuri: n, rele, raza: Math.max(...pts.map((p) => Math.hypot(p[0]! - cx, p[1]! - cy))), inalt: lim[2]![1] - lim[2]![0] };
}

test('înclinarea spre pupa: 0 la început; la întreg, doar 0–15; numele, butucul și textul (cât urcă vârful, suportul)', async ({ page }) => {
  await atelierBarca(page);
  const nume = page.locator('#at-nume-piesa'), info = page.locator('#at-eb-info'), camp = page.locator('#at-eb-pupa');
  await expect(nume).toHaveText(IMPLICIT);
  await expect(camp).toHaveValue('0');
  await expect(page.locator('label[for="at-eb-pupa"]')).toContainText('Înclinarea spre pupa (°)');
  const tipar = page.locator('#at-tipar');
  await expect(tipar).toContainText('Se tipărește cu partea dinspre barcă pe masă, fără suport');
  // pe hârtie: 16 · tan 10° = 2,82; cel mai înalt vârf al paletelor, 12,157 → butucul de 12,2
  await seteaza(page, '#at-eb-pupa', '10');
  await expect(nume).toHaveText(IMPLICIT + ', spre pupa 10°');
  await expect(page.locator('#at-cote')).toContainText('× 12,2 mm');
  await expect(info).toHaveText('Pasul 40 mm (1 × diametrul): paleta stă la 58° lângă butuc și la 18° la vârf. Paletele acoperă 55 % din disc; butucul e de Ø8 × 12,2 mm. Înclinată spre pupa cu 10°: muchia de jos a paletei urcă de pe masă până la 2,8 mm la vârf.');
  await expect(tipar).toHaveText('Se tipărește cu partea dinspre barcă pe masă, cu suport sub palete (îl pune programul de feliere): muchia lor de jos urcă de pe masă. Primul strat atinge masa doar pe 2,8 % din discul paletelor: pune o margine de aderență (brim) în programul de feliere.');
  // la întreg; dincolo de plajă, adusă la margine, cu mesajul sub câmpuri (ADR 0340, 3.Cm-4)
  await seteaza(page, '#at-eb-pupa', '9.6');
  await expect(camp).toHaveValue('10');
  await expect(nume).toHaveText(IMPLICIT + ', spre pupa 10°');
  for (const [rau, margine, cum] of [['16', '15', IMPLICIT + ', spre pupa 15°'], ['-1', '0', IMPLICIT]] as const) {
    await seteaza(page, '#at-eb-pupa', rau);
    await expect(nume).toHaveText(cum);
    await expect(camp).toHaveValue(margine);
    await expect(page.locator('#at-plaja')).toHaveText(`Înclinarea spre pupa a unei elice de barcă e între 0 și 15°: am făcut-o de ${margine}°.`);
    await seteaza(page, '#at-eb-pupa', '10');
    await expect(nume).toHaveText(IMPLICIT + ', spre pupa 10°');
    await expect(page.locator('#at-plaja')).toHaveCount(0);
  }
  // marginea: 15° (16 · tan 15° = 4,29; butucul de 12,6; cu capacul, 1,2 · 4 peste el: 17,4)
  await seteaza(page, '#at-eb-pupa', '15');
  await expect(nume).toHaveText(IMPLICIT + ', spre pupa 15°');
  await expect(info).toContainText('butucul e de Ø8 × 12,6 mm. Înclinată spre pupa cu 15°: muchia de jos a paletei urcă de pe masă până la 4,3 mm la vârf');
  await page.locator('#at-eb-capac [data-v="da"]').click();
  await expect(nume).toHaveText(IMPLICIT + ', spre pupa 15°, cu capac');
  await expect(page.locator('#at-cote')).toContainText('× 17,4 mm');
  // înapoi la 0: elicea de dinainte, fără suport
  await page.locator('#at-eb-capac [data-v="nu"]').click();
  await seteaza(page, '#at-eb-pupa', '0');
  await expect(nume).toHaveText(IMPLICIT);
  await expect(page.locator('#at-cote')).toContainText('× 11,5 mm');
  await expect(tipar).toContainText('Se tipărește cu partea dinspre barcă pe masă, fără suport');
  // în nume, după lățime și înclinarea înapoi, înaintea sensului și a găurii
  await seteaza(page, '#at-eb-inc', '10');
  await seteaza(page, '#at-eb-pupa', '5');
  await page.locator('#at-eb-sens [data-v="stanga"]').click();
  await page.locator('#at-eb-gaura [data-v="r"]').click();
  await expect(nume).toHaveText(IMPLICIT + ', înclinarea 10°, spre pupa 5°, stânga, gaură rotundă');
});

test('în listă: fără înclinare, piesa e cea de dinainte (o listă salvată cu 18.22.0 adună pe aceeași linie); cu ea, o linie a ei; „Fă perechea” o păstrează', async ({ page }) => {
  await atelierBarca(page, { lista: [{ id: 'v1', def: { tip: 'eliceBarca', ...VECHE }, nume: IMPLICIT, bucati: 1 }], stare: { tip: 'eliceBarca', eliceBarca: VECHE } });
  // editorul de la 18.22.0 (fără `pupa`): câmpul la 0, piesa de dinainte
  await expect(page.locator('#at-eb-pupa')).toHaveValue('0');
  await expect(page.locator('#at-nume-piesa')).toHaveText(IMPLICIT);
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText([IMPLICIT]);
  await expect(page.locator('#at-lista tr .pas-n')).toHaveText(['2']);
  // ce se scrie e exact ce scria 18.22.0: aceleași chei, în aceeași ordine
  expect(JSON.stringify((await scris(page)).lista[0]!.def)).toBe(JSON.stringify({ tip: 'eliceBarca', ...VECHE }));
  // cu înclinarea spre pupa, o linie a ei
  await seteaza(page, '#at-eb-pupa', '12');
  await page.locator('#at-adauga').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText([IMPLICIT, IMPLICIT + ', spre pupa 12°']);
  expect(JSON.stringify((await scris(page)).lista[1]!.def)).toBe(JSON.stringify({ tip: 'eliceBarca', palete: 3, diametru: 40, pas: 1, latime: 100, inclinare: 20, pupa: 12, sens: 'dreapta', gaura: 'x', capac: 'nu' }));
  // „Fă perechea”: aceeași înclinare, pe ambele sensuri (cea dreaptă se adună pe linia ei)
  await page.locator('#at-eb-pereche').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText([IMPLICIT, IMPLICIT + ', spre pupa 12°', IMPLICIT + ', spre pupa 12°, stânga']);
  await expect(page.locator('#at-lista tr .pas-n')).toHaveText(['2', '2', '1']);
});

test('STL-ul descărcat e un corp închis, cu raza cerută și înalt cât butucul (4 palete, Ø40, spre pupa 15°)', async ({ page }) => {
  await atelierBarca(page);
  await seteaza(page, '#at-eb-palete', '4');
  await seteaza(page, '#at-eb-pupa', '15');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice de barcă Ø40 cu 4 palete, pasul 1, spre pupa 15°');
  // pe hârtie: cu 4 palete, fără înclinare, butucul de 8,9; spre pupa 15°, cel mai înalt vârf al paletelor, 11,445 → 11,5
  await expect(page.locator('#at-cote')).toContainText('× 11,5 mm');
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const d = await descarcare;
  expect(d.suggestedFilename()).toMatch(/\.stl$/);
  const stl = citesteStl(readFileSync(await d.path()));
  expect(stl.triunghiuri).toBeGreaterThan(5_000);
  expect(stl.rele).toBe(0);
  // cu 4 palete, cutia e simetrică față de butuc: raza cea mai mare, 40 / 2; înălțimea, cea a butucului din cote
  expect(stl.raza).toBeCloseTo(20, 1);
  expect(stl.inalt).toBeCloseTo(11.5, 2);
});
