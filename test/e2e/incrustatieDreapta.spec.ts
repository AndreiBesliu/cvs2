import { test, expect, type Download, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { masoaraPotrivireaDreapta } from '../oracles/incrustatieDreapta.ts';
import type { DesenO } from '../oracles/incrustatie.ts';
import type { SculaOracol } from '../oracles/simulare.ts';
import { adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const taierea = (page: Page) => page.getByTestId('prop-taierea');

/** Scrie o valoare într-un câmp al secțiunii Tăierea și o aplică (Enter). */
async function scrie(page: Page, camp: string, valoare: string): Promise<void> {
  const c = taierea(page).locator(`[data-camp="${camp}"]`);
  await c.fill(valoare);
  await c.press('Enter');
}

/** Dreptunghiul de 30 × 20 din (20, 20): „Adaugă dreptunghi” (100 × 60), cu lățimea și înălțimea scrise în panou. */
async function dreptunghiMic(page: Page): Promise<void> {
  await adauga(page, 'dreptunghi');
  const forma = page.getByTestId('prop-forma');
  for (const [camp, v] of [['forma-latime', '30'], ['forma-inaltime', '20']] as const) {
    const c = forma.locator(`[data-camp="${camp}"]`);
    await c.fill(v);
    await c.press('Enter');
  }
}
const DESEN: DesenO = [[[20, 20], [50, 20], [50, 40], [20, 40]]];

/**
 * Sculele bucăților unui program, în ordine: freza montată la pornire, apoi fiecare `T… M6`, după numărul lor (`diametre`:
 * T → Ø, toate plate).
 */
function scule(text: string, diametre: ReadonlyMap<number, number>): SculaOracol[] {
  const m6 = [...text.matchAll(/^T(\d+) M6$/gm)].map((m) => Number(m[1]));
  const toate = [...diametre.keys()];
  const ramase = toate.filter((n) => n !== m6[0]);
  const pornire = m6.length === 0 ? toate[0]! : (ramase[0] ?? toate[0]!);
  return [pornire, ...m6].map((n) => ({ tip: 'plata', diametru: diametre.get(n) ?? Number.NaN }));
}

/** Programul foii și al dopului, din descărcări (două: întâi foaia, apoi dopul). */
async function programe(descarcari: readonly Download[]): Promise<{ readonly locas: string; readonly dop: string }> {
  const dop = descarcari.find((d) => /-dop-1\b/.test(d.suggestedFilename()));
  const foaie = descarcari.find((d) => !/-dop-/.test(d.suggestedFilename()));
  if (!dop || !foaie) throw new Error(`descărcările: ${descarcari.map((d) => d.suggestedFilename()).join(', ')}`);
  return { locas: readFileSync(await foaie.path(), 'ascii'), dop: readFileSync(await dop.path(), 'ascii') };
}

/**
 * Incrustația cu pereți drepți (ADR 0171), de la capăt la capăt, pe dreptunghiul de 30 × 20 din (20, 20), cu freza plată Ø6 a
 * operației (R = r = 3): rolul ales din panou (valorile implicite: jocul lateral 0,1, dopul ridicat, pe fund, H 2, marginea 5),
 * adâncimea 6 scrisă în panou, cu secțiunea pe hârtie: vârfurile locașului R3 și unghiurile R2,9 (3 − 0,1), ale dopului R2,9 și
 * R3; dopul înalt de 6 + 2 = 8, semifabricatul gros de cel puțin 9. Fereastra exportului arată rândul incrustației; un joc
 * lateral cât raza frezei e refuzat la export, cu motivul; Exportă descarcă programul foii și pe al dopului (semifabricatul
 * 30 + 2 · 5 = 40 × 30), cu avertismentele: colțul drept se retrage 3(√2 − 1) = 1,243 mm, iar freza trece cu 1,5 + 3 = 4,5 mm
 * dincolo de margini (e = 6 + 0,5 − 5). Oracolul pereților drepți, pe octeții din browser, cere jocul 0,1 ± 0,02 pe tot
 * conturul (și în colțuri), nicio interferență, D = 6 și h = 8 ± 0,05.
 */
test('incrustația cu pereți drepți: rolul din panou, valorile pe hârtie, exportul cu dopul ridicat, potrivirea pe oracol', async ({ page }) => {
  // Oracolul, pe octeții din browser, ține cea mai mare parte a probei: 12,7 s singură, peste 30 s cu trei lucrători (07.11, la
  // 12.1↑c, căzută o dată din timp, nu din cod).
  test.setTimeout(90_000);
  await page.goto('/');
  await dreptunghiMic(page);
  const rol = taierea(page).locator('[data-camp="rol"]');
  await expect(rol.locator('option')).toHaveText(['exterior', 'interior', 'pe linie', 'buzunar', 'V-carve', 'incrustație în V', 'incrustație cu pereți drepți']);
  await rol.selectOption('incrustatie-drept');
  await expect(taierea(page).locator('[data-camp="inc-lateral"]')).toHaveValue('0,1');
  await expect(taierea(page).locator('[data-camp="inc-fierastrau"]')).toHaveValue('2');
  await expect(taierea(page).locator('[data-camp="inc-margine"]')).toHaveValue('5');
  // Pe fund, jocul de sub dop nu se folosește: câmpul lui lipsește.
  await expect(taierea(page).locator('[data-camp="inc-joc"]')).toHaveCount(0);
  await scrie(page, 'adancime', '6');
  const hartie = page.getByTestId('prop-incrustatie-hartie');
  await expect(hartie).toContainText('Colțurile locașuluivârfurile R3.00 mm, unghiurile R2.90 mm');
  await expect(hartie).toContainText('Colțurile dopuluivârfurile R2.90 mm, unghiurile R3.00 mm');
  await expect(hartie).toContainText('Jocul pe contur0.10 mm');
  await expect(hartie).toContainText('Înălțimea dopului8.00 mm');
  await expect(hartie).toContainText('Între plăci2.00 mm');
  await expect(hartie).toContainText('Semifabricatul dopuluigros de cel puțin 9.00 mm');
  // Operația, în panou și în arbore.
  await expect(page.locator('.prop-operatie')).toContainText('incrustație cu pereți drepți');
  await expect(page.locator('.prop-operatie')).toContainText('jocul lateral 0.10 mm, dopul ridicat, sprijinit pe fundul locașului, marginea dopului 5.00 mm');
  const comuta = page.locator('button[data-comuta]').first();
  if ((await comuta.getAttribute('aria-expanded')) !== 'true') await comuta.click();
  await expect(page.locator('[data-nod="operatie"]')).toContainText(', incrustație cu pereți drepți (jocul lateral 0.1 mm)');

  // Fereastra exportului: rândul incrustației, cu valorile din panou.
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('tr[data-operatie]').first();
  await expect(rand.locator('[data-camp="latura"]')).toHaveValue('incrustatie-drept');
  const inc = page.locator('tr[data-detalii]').first().locator('[data-incrustatie][data-fel="drept"]');
  await expect(inc.locator('[data-camp="inc-lateral"]')).toHaveValue('0,1');
  await expect(inc.locator('[data-camp="inc-dop"]')).toHaveValue('ridicat');
  await expect(inc.locator('[data-camp="inc-sprijin"]')).toHaveValue('fund');
  await expect(inc.locator('[data-camp="inc-fierastrau"]')).toHaveValue('2');
  await expect(inc.locator('[data-camp="inc-margine"]')).toHaveValue('5');
  await expect(inc.locator('[data-camp="inc-freza-dop"]')).not.toBeChecked();
  // Un joc lateral cât raza frezei (R3): vârfurile dopului ar ieși ascuțite; exportul e refuzat, cu motivul.
  await inc.locator('[data-camp="inc-lateral"]').fill('3');
  await page.locator('[data-buton="exporta"]').click();
  await expect(page.getByTestId('export-stare')).toContainText('jocul lateral, de 3 mm, trebuie să fie sub raza celei mai mici freze a locașului (R3)');
  await inc.locator('[data-camp="inc-lateral"]').fill('0,1');

  const descarcari: Download[] = [];
  page.on('download', (d) => { descarcari.push(d); });
  await page.locator('[data-buton="exporta"]').click();
  const dopuri = page.getByTestId('export-dopuri');
  await expect(dopuri).toContainText('Dopul, descărcat: cncvs2-stanga-jos-dop-1');
  await expect(dopuri).toContainText('pe un semifabricat de 40 × 30 mm, gros de cel puțin 9 mm (XY0 în colțul ales, Z0 pe fața lui)');
  const avertismente = page.getByTestId('export-avertismente');
  await expect(avertismente).toContainText('colțurile se potrivesc cu frezele (vârfurile locașului R3, unghiurile R2.9): cel mai ascuțit vârf se retrage 1.243 mm față de desen');
  await expect(avertismente).toContainText('freza trece cu până la 4.5 mm dincolo de marginile semifabricatului');
  await expect.poll(() => descarcari.length).toBe(2);
  const { locas, dop } = await programe(descarcari);
  const ø6 = new Map([[1, 6]]);
  const m = masoaraPotrivireaDreapta({ text: locas, scule: scule(locas, ø6) }, { text: dop, scule: scule(dop, ø6) }, DESEN,
    { D: 6, h: 8, dop: 'ridicat', margine: 5, celula: 0.05 });
  const unde = `jocul ${JSON.stringify(m.joc)}, interferența ${m.interferenta} din ${m.nDop}, D ${m.adancime}, h ${m.inaltime}`;
  expect(m.joc.n, unde).toBeGreaterThan(100);
  expect(m.joc.min, unde).toBeGreaterThanOrEqual(0.08);
  expect(m.joc.max, unde).toBeLessThanOrEqual(0.12);
  expect(m.nDop, unde).toBeGreaterThan(100);
  expect(m.interferenta, unde).toBe(0);
  expect(Math.abs(m.adancime - 6), unde).toBeLessThanOrEqual(0.05);
  expect(Math.abs(m.inaltime - 8), unde).toBeLessThanOrEqual(0.05);

  // Jocul lateral schimbat din panou: secțiunea pe hârtie și arborele îl urmează.
  await page.getByRole('button', { name: 'Închide' }).click();
  await scrie(page, 'inc-lateral', '0,2');
  await expect(hartie).toContainText('Colțurile locașuluivârfurile R3.00 mm, unghiurile R2.80 mm');
  await expect(page.locator('[data-nod="operatie"]')).toContainText(', incrustație cu pereți drepți (jocul lateral 0.2 mm)');
});

/**
 * Incrustația aleasă direct în fereastra exportului (ADR 0171 §5, răspunsurile 1, 2 și 4): sprijinul pe față cere jocul de
 * sub dop în locul spațiului de deasupra; dopul decupat nu are sprijin, iar spațiul de deasupra devine cât iese dopul peste
 * placă; altă freză pentru dop pornește de la T-ul următor, jumătate din Ø6 și pasul 40 %, și intră în verificarea T-urilor.
 * Exportă scrie dopul decupat pe o placă de exact 6 + 2 = 8 mm, cu punți; pe octeți, oracolul cere jocul 0,1 pe tot conturul.
 * Panoul arată apoi ce s-a scris: dopul decupat, freza lui, colțurile (unghiurile locașului R1,4 = 1,5 − 0,1, ale dopului R1,5).
 */
test('din fereastra exportului: sprijinul pe față, apoi dopul decupat cu freza lui; panoul arată ce s-a scris', async ({ page }) => {
  await page.goto('/');
  await dreptunghiMic(page);
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('tr[data-operatie]').first();
  await rand.locator('[data-camp="latura"]').selectOption('incrustatie-drept');
  const inc = page.locator('tr[data-detalii]').first().locator('[data-incrustatie][data-fel="drept"]');
  await expect(inc.locator('[data-camp="inc-lateral"]')).toHaveValue('0,1');
  await expect(inc.locator('[data-camp="inc-fierastrau"]')).toHaveValue('2');
  // Pe față: jocul de sub dop, în locul spațiului de deasupra.
  await inc.locator('[data-camp="inc-sprijin"]').selectOption('fata');
  await expect(inc.locator('[data-camp="inc-joc"]')).toHaveValue('0,5');
  await expect(inc.locator('[data-camp="inc-fierastrau"]')).toHaveCount(0);
  // Decupat: fără sprijin; spațiul de deasupra e cât iese dopul peste placă.
  await inc.locator('[data-camp="inc-dop"]').selectOption('decupat');
  await expect(inc.locator('[data-camp="inc-sprijin"]')).toHaveCount(0);
  await expect(inc.locator('[data-camp="inc-joc"]')).toHaveCount(0);
  await expect(inc.locator('label').filter({ has: page.locator('[data-camp="inc-fierastrau"]') })).toContainText('Cât iese peste placă (mm)');
  // Freza dopului: T-ul următor, jumătate din Ø6, pasul 40 %.
  await inc.locator('[data-camp="inc-freza-dop"]').check();
  await expect(inc.locator('[data-camp="dop-scula"]')).toHaveValue('2');
  await expect(inc.locator('[data-camp="dop-diametru"]')).toHaveValue('3');
  await expect(inc.locator('[data-camp="dop-pas"]')).toHaveValue('1,2');
  // T1 cu Ø3 ar fi a doua freză sub T1 (al locașului e Ø6): fereastra o refuză, cu motivul.
  await inc.locator('[data-camp="dop-scula"]').fill('1');
  await expect(page.getByTestId('export-invalid')).toContainText('T1 are două freze');
  await inc.locator('[data-camp="dop-scula"]').fill('2');
  await rand.locator('[data-camp="adancime"]').fill('6');

  const descarcari: Download[] = [];
  page.on('download', (d) => { descarcari.push(d); });
  await page.locator('[data-buton="exporta"]').click();
  await expect(page.getByTestId('export-dopuri')).toContainText('pe o placă de 40 × 30 mm, groasă de exact 8 mm: tăietura trece prin ea, cu punți');
  await expect(page.getByTestId('export-avertismente')).toContainText('e decupat cu 4 punți pe buclă, late de 4 mm și groase de 1 mm');
  await expect.poll(() => descarcari.length).toBe(2);
  const { locas, dop } = await programe(descarcari);
  const m = masoaraPotrivireaDreapta({ text: locas, scule: scule(locas, new Map([[1, 6]])) }, { text: dop, scule: scule(dop, new Map([[2, 3]])) }, DESEN,
    { D: 6, h: 8, dop: 'decupat', margine: 5, celula: 0.05 });
  const unde = `jocul ${JSON.stringify(m.joc)}, interferența ${m.interferenta} din ${m.nDop}, D ${m.adancime}, h ${m.inaltime}`;
  expect(m.joc.n, unde).toBeGreaterThan(100);
  expect(m.joc.min, unde).toBeGreaterThanOrEqual(0.08);
  expect(m.joc.max, unde).toBeLessThanOrEqual(0.12);
  expect(m.interferenta, unde).toBe(0);
  expect(Math.abs(m.inaltime - 8), unde).toBeLessThanOrEqual(0.05);

  // În proiect: dopul decupat, freza lui, colțurile pe hârtie.
  await page.getByRole('button', { name: 'Închide' }).click();
  await expect(page.locator('.prop-operatie')).toContainText('jocul lateral 0.10 mm, dopul decupat prin placă, marginea dopului 5.00 mm');
  await expect(page.locator('.prop-operatie')).toContainText('Frezele dopuluiT2, Ø3.00 mm, pasul lateral 1.20 mm');
  const hartie = page.getByTestId('prop-incrustatie-hartie');
  await expect(hartie).toContainText('Colțurile locașuluivârfurile R3.00 mm, unghiurile R1.40 mm');
  await expect(hartie).toContainText('Colțurile dopuluivârfurile R2.90 mm, unghiurile R1.50 mm');
  await expect(hartie).toContainText('Cât iese peste placă2.00 mm');
  await expect(hartie).toContainText('Semifabricatul dopuluigros de 8.00 mm');
  await expect(taierea(page).locator('[data-camp="inc-fierastrau"]')).toHaveValue('2');
});
