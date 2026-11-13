/**
 * Felia 11.1↑ (ADR 0210 §1, §5): foile proiectului. Lista cu foile (+ Foaie nouă, meniul ⋯ și clicul dreapta), foaia activă
 * (clicul pe rând, PgUp / PgDn, cipul din bara de jos, ținută după reîncărcare), mutarea pieselor pe altă foaie (meniul de
 * clic dreapta al pânzei, tragerea rândului), ștergerea cu confirmare, numele și materialul din panou, traseul și exportul
 * foii active (titlul spune foaia, programul e al ei, octet cu octet ca al proiectului doar cu ea, chiar când nu e prima).
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { adauga, alfaTraseu, ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const lista = (page: Page) => page.getByTestId('lista-vectori');
const randuri = (page: Page) => lista(page).locator('button[data-instanta]');
const foaie = (page: Page, id: string) => lista(page).locator(`[data-foaie="${id}"]`);
const cip = (page: Page) => page.getByTestId('foaia-activa');
const faraComentarii = (text: string): string[] => text.split('\n').filter((l) => l !== '' && !l.startsWith('('));

const DREPTUNGHI = 'dreptunghi 100.00 × 60.00 la X 20.00, Y 20.00';
const CERC = 'cerc R15.00 cu centrul la X 70.00, Y 50.00';

/** Ultima versiune salvată a proiectului (rev-ul ei), după ce salvarea asincronă a ajuns în bază. */
async function revSalvat(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok, eroare) => {
      const r = indexedDB.open('cncvs2-proiecte', 1);
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    const v = await new Promise<unknown>((ok, eroare) => {
      const r = db.transaction('versiuni').objectStore('versiuni').openCursor(null, 'prev');
      r.onsuccess = () => { ok(r.result?.value ?? null); };
      r.onerror = () => { eroare(r.error); };
    });
    db.close();
    return typeof v === 'string' ? (JSON.parse(v) as { rev: number }).rev : -1;
  });
}

/** Culoarea pânzei la un punct al foii active (mm), `[r, g, b]`, din pixelii ei (după ce cadrul cerut e afișat). */
async function pixel(page: Page, x: number, y: number): Promise<number[]> {
  const v = await vedere(page);
  return page.evaluate(([px, py]) => {
    const el = document.querySelector('[data-testid="panza"]') as HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = el.width;
    c.height = el.height;
    const g = c.getContext('2d');
    if (!g) return [];
    g.drawImage(el, 0, 0);
    return [...g.getImageData(Math.round(px), Math.round(py), 1, 1).data.slice(0, 3)];
  }, [(v.tx + x * v.scara) * v.dpr, (v.ty - y * v.scara) * v.dpr] as const);
}

/** Cea mai mare depărtare (pe un canal) de culoarea `fata` într-o cutie de pixeli CSS de deasupra punctului (mm): cerneala unui text. */
async function cerneala(page: Page, x: number, y: number, fata: readonly number[]): Promise<number> {
  const v = await vedere(page);
  return page.evaluate(([px, py, dpr, f0, f1, f2]) => {
    const el = document.querySelector('[data-testid="panza"]') as HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = el.width;
    c.height = el.height;
    const g = c.getContext('2d');
    if (!g) return -1;
    g.drawImage(el, 0, 0);
    // Eticheta stă deasupra colțului stânga-sus al foii: 40 × 14 px CSS, cu baza la 4 px deasupra marginii.
    const d = g.getImageData(Math.round(px), Math.round(py - 18 * dpr), Math.round(40 * dpr), Math.round(14 * dpr)).data;
    let m = 0;
    for (let i = 0; i < d.length; i += 4) m = Math.max(m, Math.abs((d[i] ?? 0) - f0), Math.abs((d[i + 1] ?? 0) - f1), Math.abs((d[i + 2] ?? 0) - f2));
    return m;
  }, [(v.tx + x * v.scara) * v.dpr, (v.ty - y * v.scara) * v.dpr, v.dpr, fata[0] ?? 0, fata[1] ?? 0, fata[2] ?? 0] as const);
}

/** Un token de culoare al temei (`#rrggbb`), ca `[r, g, b]`. */
async function culoare(page: Page, token: string): Promise<number[]> {
  const hex = await page.evaluate((t) => getComputedStyle(document.documentElement).getPropertyValue(t).trim(), token);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** Două culori la cel mult 3 unități pe canal (amestecul și rotunjirea pixelilor). */
function aproape(a: readonly number[], b: readonly number[], unde: string): void {
  expect(a.length, unde).toBe(3);
  a.forEach((x, i) => { expect(Math.abs(x - (b[i] ?? 0)), `${unde}: ${a.join(',')} față de ${b.map((y) => Math.round(y)).join(',')}`).toBeLessThanOrEqual(3); });
}

/** Clic dreapta pe pânză, la un punct al foii (mm). */
async function clicDreapta(page: Page, x: number, y: number): Promise<void> {
  const la = await ecran(page, await vedere(page));
  const p = la(x, y);
  await page.mouse.click(p.x, p.y, { button: 'right' });
}

test('+ Foaie nouă: foaia activă e cea nouă, desenul merge pe ea; clicul pe rând, PgUp / PgDn trec între foi; reîncărcarea o ține', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  // Cu o singură foaie, cipul nu apare.
  await expect(cip(page)).toHaveCount(0);
  await expect(foaie(page, 'f1').locator('.foaie-nume')).toHaveText('Foaia 1');
  await expect(foaie(page, 'f1').locator('.foaie-detalii')).toHaveText('300 × 200 × 18 mm · 1 piesă');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  await expect(foaie(page, 'f2')).toHaveAttribute('data-activa', 'da');
  await expect(foaie(page, 'f1')).toHaveAttribute('data-activa', 'nu');
  await expect(cip(page)).toHaveText('Foaia 2 · 2 din 2');
  await expect(randuri(page)).toHaveCount(0);
  await expect(foaie(page, 'f2')).toContainText('Nimic pe foaie încă.');
  await adauga(page, 'cerc');
  await expect(randuri(page)).toHaveText([CERC]);
  await expect(foaie(page, 'f2').locator('.foaie-detalii')).toHaveText('300 × 200 × 18 mm · 1 piesă');
  // PgUp: foaia de dinainte; PgDn: următoarea; la capăt, nimic.
  await page.locator('body').press('PageUp');
  await expect(cip(page)).toHaveText('Foaia 1 · 1 din 2');
  await expect(randuri(page)).toHaveText([DREPTUNGHI]);
  await page.locator('body').press('PageUp');
  await expect(cip(page)).toHaveText('Foaia 1 · 1 din 2');
  await page.locator('body').press('PageDown');
  await expect(cip(page)).toHaveText('Foaia 2 · 2 din 2');
  // Ctrl + PgUp e al browserului (filele), nu al aplicației.
  await page.locator('body').press('Control+PageUp');
  await expect(cip(page)).toHaveText('Foaia 2 · 2 din 2');
  // Clicul pe rândul foii o face activă și golește selecția.
  await randuri(page).first().click();
  await expect(page.getByTestId('selectie')).toContainText('cerc');
  await foaie(page, 'f1').locator('[data-nod="foaie"]').click();
  await expect(cip(page)).toHaveText('Foaia 1 · 1 din 2');
  await expect(page.getByTestId('selectie')).not.toContainText('Selectat');
  // După reîncărcare, proiectul se deschide pe foaia activă de dinainte.
  await expect.poll(() => revSalvat(page)).toBeGreaterThanOrEqual(3);
  await foaie(page, 'f2').locator('[data-nod="foaie"]').click();
  await page.reload();
  await expect(cip(page)).toHaveText('Foaia 2 · 2 din 2');
  await expect(randuri(page)).toHaveText([CERC]);
});

test('mutarea pe altă foaie: din meniul de clic dreapta și trăgând rândul; ștergerea foii cu piese cere confirmarea; anularea le întoarce', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await page.locator('body').press('PageUp');
  await expect(randuri(page)).toHaveText([DREPTUNGHI, CERC]);
  // Clic dreapta pe cerc: îl alege și oferă celelalte foi, plus una nouă.
  await clicDreapta(page, 70, 50);
  const meniu = page.getByTestId('meniu-context');
  await expect(meniu).toBeVisible();
  await expect(meniu.locator('[data-meniu="muta-pe-f2"]')).toHaveText('Mută pe Foaia 2');
  await expect(meniu.locator('[data-meniu="muta-pe-f1"]')).toHaveCount(0);
  await expect(meniu.locator('[data-meniu="muta-pe-noua"]')).toHaveText('Mută pe o foaie nouă');
  await meniu.locator('[data-meniu="muta-pe-f2"]').click();
  await expect(randuri(page)).toHaveText([DREPTUNGHI]);
  await expect(cip(page)).toHaveText('Foaia 1 · 1 din 2');
  await expect(foaie(page, 'f2').locator('.foaie-detalii')).toHaveText('300 × 200 × 18 mm · 1 piesă');
  await page.locator('body').press('Control+z');
  await expect(randuri(page)).toHaveText([DREPTUNGHI, CERC]);
  // Rândul tras peste altă foaie: aceeași mutare.
  await randuri(page).nth(1).dragTo(foaie(page, 'f2').locator('[data-nod="foaie"]'));
  await expect(randuri(page)).toHaveText([DREPTUNGHI]);
  await page.locator('body').press('PageDown');
  await expect(randuri(page)).toHaveText([CERC]);
  // Ștergerea foii cu o piesă: meniul întreabă întâi; Renunță lasă totul.
  await lista(page).locator('[data-foaie-meniu="f2"]').click();
  const meniuFoaie = lista(page).locator('[data-meniu-foaie="f2"]');
  await meniuFoaie.locator('[data-meniu-foaie-articol="foaie.sterge"]').click();
  await expect(meniuFoaie).toContainText('Ștergi foaia și piesa de pe ea?');
  await meniuFoaie.locator('[data-meniu-foaie-articol="sterge-nu"]').click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  await meniuFoaie.locator('[data-meniu-foaie-articol="foaie.sterge"]').click();
  await meniuFoaie.locator('[data-meniu-foaie-articol="sterge-da"]').click();
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(1);
  await expect(cip(page)).toHaveCount(0);
  await expect(randuri(page)).toHaveText([DREPTUNGHI]);
  await page.locator('body').press('Control+z');
  await expect(lista(page).locator('[data-foaie]')).toHaveCount(2);
  // Ultima foaie rămâne: în meniul ei, Șterge foaia e oprit, cu motivul.
  await lista(page).locator('[data-foaie-meniu="f2"]').click();
  await meniuFoaie.locator('[data-meniu-foaie-articol="foaie.sterge"]').click();
  await meniuFoaie.locator('[data-meniu-foaie-articol="sterge-da"]').click();
  await foaie(page, 'f1').locator('[data-nod="foaie"]').click({ button: 'right' });
  const meniuF1 = lista(page).locator('[data-meniu-foaie="f1"]');
  await expect(meniuF1.locator('[data-meniu-foaie-articol="foaie.sterge"]')).toBeDisabled();
  await expect(meniuF1.locator('[data-meniu-foaie-articol="foaie.sterge"]')).toHaveAttribute('title', 'E singura foaie a proiectului: ea rămâne.');
});

test('numele și materialul foii, din meniul ei, în panou; lista le arată, iar reîncărcarea le ține', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await lista(page).locator('[data-foaie-meniu="f1"]').click();
  await lista(page).locator('[data-meniu-foaie="f1"] [data-meniu-foaie-articol="proprietati"]').click();
  await expect(cip(page)).toHaveText('Foaia 1 · 1 din 2');
  const nume = page.locator('[data-camp="foaie-nume"]');
  await expect(nume).toHaveAttribute('placeholder', 'Foaia 1');
  await nume.fill('  Fața ');
  await nume.press('Enter');
  const material = page.locator('[data-camp="foaie-material"]');
  await material.fill('MDF alb 18');
  await material.press('Enter');
  await expect(foaie(page, 'f1').locator('.foaie-nume')).toHaveText('Fața');
  await expect(foaie(page, 'f1').locator('.foaie-detalii')).toHaveText('300 × 200 × 18 mm · MDF alb 18 · 1 piesă');
  await expect(cip(page)).toHaveText('Fața · 1 din 2');
  // Anularea întoarce materialul; refacerea îl pune înapoi. Din câmp, Ctrl+Z e al textului lui: întâi omul iese din câmp.
  await material.blur();
  await page.locator('body').press('Control+z');
  await expect(foaie(page, 'f1').locator('.foaie-detalii')).toHaveText('300 × 200 × 18 mm · 1 piesă');
  await page.locator('body').press('Control+y');
  await expect(foaie(page, 'f1').locator('.foaie-detalii')).toHaveText('300 × 200 × 18 mm · MDF alb 18 · 1 piesă');
  await expect.poll(() => revSalvat(page)).toBeGreaterThanOrEqual(5);
  await page.reload();
  await expect(foaie(page, 'f1').locator('.foaie-nume')).toHaveText('Fața');
  await expect(page.locator('[data-camp="foaie-material"]')).toHaveValue('MDF alb 18');
});

test('exportul foii active: titlul spune foaia, iar programul e al ei, ca al proiectului doar cu ea (placa 1 A), pe a doua foaie', async ({ page }) => {
  await page.goto('/');
  // Pe prima foaie, altceva: un export care ar lua documentul întreg ar scrie programul ei.
  await adauga(page, 'cerc');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  // Foaia activă e goală: exportul n-are ce scrie.
  await expect(page.locator('[data-actiune="export.gcode"]')).toBeDisabled();
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('#export-titlu')).toHaveText('Exportă G-code (GRBL 1.1) · Foaia 2');
  await page.locator('[data-camp="origine"]').selectOption('stanga-jos');
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const d = await descarcare;
  const text = readFileSync(await d.path(), 'ascii');
  expect(faraComentarii(text)).toEqual(faraComentarii(readFileSync('test/placi/placa-01/placa-01-A.nc', 'ascii')));
});

test('traseul arătat urmează foaia activă: la PgDn se calculează pentru foaia nouă, fără traseul celei de dinainte', async ({ page }) => {
  await page.goto('/');
  // Foaia 1: dreptunghiul (exterior, Ø6: la 3 mm în stânga laturii din x 20); foaia 2: cercul (interior, la 12 mm de centru).
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await adauga(page, 'cerc');
  await page.locator('body').press('PageUp');
  await page.locator('body').press('t');
  const strat = page.getByTestId('strat-traseu');
  await expect(strat).toHaveAttribute('data-stins', 'false');
  await expect.poll(() => alfaTraseu(page, 17, 50)).toBeGreaterThan(0);
  expect(await alfaTraseu(page, 70, 38)).toBe(0);
  await page.locator('body').press('PageDown');
  await expect(cip(page)).toHaveText('Foaia 2 · 2 din 2');
  await expect.poll(() => alfaTraseu(page, 70, 38)).toBeGreaterThan(0);
  await expect(strat).toHaveAttribute('data-stins', 'false');
  expect(await alfaTraseu(page, 17, 50)).toBe(0);
});

test('toate foile pe pânză: vecina estompată, la 100 mm, cu numele; dublu-clic o face activă fără ca pânza să sară; comutatorul o ascunde și se ține minte', async ({ page }) => {
  await page.goto('/');
  const comutator = page.locator('[data-actiune="vedere.toate-foile"]');
  // Cu o singură foaie, comutatorul nu apare.
  await expect(comutator).toHaveCount(0);
  await adauga(page, 'dreptunghi');
  await lista(page).locator('[data-actiune="foaie.adauga"]').click();
  await adauga(page, 'cerc');
  await expect(comutator).toHaveAttribute('aria-pressed', 'true');
  // Oprit, apoi pornit: pornit, le încadrează pe toate.
  await comutator.click();
  await expect(comutator).toHaveAttribute('aria-pressed', 'false');
  await comutator.click();
  await expect(comutator).toHaveAttribute('aria-pressed', 'true');
  const fundal = await culoare(page, '--panza-fundal');
  const foaieVie = await culoare(page, '--panza-foaie');
  const estompat = fundal.map((f, i) => (f + (foaieVie[i] ?? 0)) / 2);
  // Față de Foaia 2 (activă), Foaia 1 stă de la x −400 la −100; între ele, 100 mm de fundal.
  aproape(await pixel(page, -200, 150), estompat, 'în Foaia 1, estompată');
  aproape(await pixel(page, -50, 150), fundal, 'între foi');
  aproape(await pixel(page, 250, 150), foaieVie, 'în Foaia 2, activă');
  // Numele foii estompate, deasupra ei: cerneală pe fundal.
  expect(await cerneala(page, -400, 200, fundal)).toBeGreaterThan(40);
  // Dublu-clic pe Foaia 1: devine activă, iar vederea se mută cu 400 mm, deci foaia rămâne unde era pe ecran.
  const v0 = await vedere(page);
  const p = (await ecran(page, v0))(-200, 150);
  await page.mouse.dblclick(p.x, p.y);
  await expect(cip(page)).toHaveText('Foaia 1 · 1 din 2');
  // Cursorul, din colțul foii noi: −200 față de Foaia 2 e 200 față de Foaia 1.
  // (Mausul cade pe pixeli întregi: câteva zecimi de mm pe lângă.)
  const xy = ((await page.getByTestId('cursor').textContent()) ?? '').match(/X (-?[\d.]+), Y (-?[\d.]+)/);
  expect(Math.abs(Number(xy?.[1]) - 200)).toBeLessThan(2);
  expect(Math.abs(Number(xy?.[2]) - 150)).toBeLessThan(2);
  const v1 = await vedere(page);
  expect(v1.scara).toBe(v0.scara);
  expect(Math.abs(v1.tx - (v0.tx - 400 * v0.scara))).toBeLessThan(1e-6);
  expect(v1.ty).toBe(v0.ty);
  await expect(randuri(page)).toHaveText([DREPTUNGHI]);
  aproape(await pixel(page, 200, 150), foaieVie, 'Foaia 1, acum activă');
  aproape(await pixel(page, 600, 150), estompat, 'Foaia 2, acum estompată, la dreapta');
  // Oprit: doar foaia activă; departe, unde stătea Foaia 2, fundal.
  await comutator.click();
  await expect(comutator).toHaveAttribute('aria-pressed', 'false');
  const panza = page.getByTestId('panza');
  const b = await panza.boundingBox();
  if (!b) throw new Error('pânza n-are cutie');
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.wheel(0, 1200);
  aproape(await pixel(page, 600, 150), fundal, 'Foaia 2, oprită');
  // Reîncărcarea ține alegerea: tot oprit.
  await expect.poll(() => revSalvat(page)).toBeGreaterThanOrEqual(3);
  await page.reload();
  await expect(cip(page)).toHaveText('Foaia 1 · 1 din 2');
  await expect(comutator).toHaveAttribute('aria-pressed', 'false');
});
