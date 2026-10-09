import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { poarta, type ContextPoarta } from '../oracles/poarta.ts';
import { ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const faraComentarii = (text: string): string[] => text.split('\n').filter((l) => l !== '' && !l.startsWith('('));

async function exporta(page: Page, origine: string): Promise<{ text: string; afisat: string; nume: string }> {
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('[data-camp="origine"]').selectOption(origine);
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const d = await descarcare;
  const cale = await d.path();
  const text = readFileSync(cale, 'ascii');
  const afisat = (await page.getByTestId('export-stare').textContent()) ?? '';
  await page.getByRole('button', { name: 'Închide' }).click();
  return { text, afisat, nume: d.suggestedFilename() };
}

test('desenul din aplicație iese în G-code: cu originea stânga-jos, exact liniile plăcii 1 A', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-actiune="export.gcode"]')).toBeDisabled();
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  const { text, afisat, nume } = await exporta(page, 'stanga-jos');
  expect(nume).toBe('cncvs2-stanga-jos.nc');
  const aur = readFileSync('test/placi/placa-01/placa-01-A.nc', 'ascii');
  expect(faraComentarii(text)).toEqual(faraComentarii(aur));
  // Hash-ul afișat e chiar al fișierului descărcat.
  const sha = createHash('sha256').update(text, 'ascii').digest('hex');
  expect(afisat).toContain(sha);
  expect(afisat).toContain('34 de linii');
});

test('cu originea dreapta-sus pe foaia de 300 × 200: cotele pe hârtie și poarta trece', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  const { text } = await exporta(page, 'dreapta-sus');
  // Gaura pornește din (82, 50) mm; față de colțul dreapta-sus al foii 300 × 200: (82 − 300, 50 − 200).
  expect(text).toContain('\nG0 X-218.000 Y-150.000\n');
  expect(text).toContain('(origine dreapta-sus, Z0 sus, foaia 300.000 x 200.000 x 18.000 mm)');
  const incalcari = poarta(text, {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'dreapta-sus', z0: 'sus', diametruScula: 6, pas: 4,
    supracursa: 0, asteptareAx: 3, cadru: { minX: 17, maxX: 123, minY: 17, maxY: 83 },
  });
  expect(incalcari).toEqual([]);
});

test('freza iese din foaie: avertismentul stă în bara de jos, iar exportul cere confirmarea și o scrie în antet', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await expect(page.getByTestId('avertisment')).toHaveCount(0);
  // Dreptunghiul (20…120 × 20…80 mm), tras cu 40 mm spre stânga: iese cu ~20 mm din foaie.
  const v = await vedere(page);
  const la = await ecran(page, v);
  const a = la(70, 50);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x - 20 * v.scara, a.y, { steps: 4 });
  await page.mouse.move(a.x - 40 * v.scara, a.y, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByTestId('avertisment')).toHaveCount(1);
  await expect(page.getByTestId('avertisment')).toContainText('iese din foaie');
  const stare = (await page.getByTestId('selectie').textContent()) ?? '';
  const x = Number(/la X (-?\d+\.\d+)/.exec(stare)?.[1]);
  expect(x).toBeLessThan(0);

  // Fără confirmare: nimic descărcat, butonul blocat.
  let descarcari = 0;
  page.on('download', () => { descarcari++; });
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('[data-buton="exporta"]').click();
  const bloc = page.getByTestId('iesire-foaie');
  await expect(bloc).toContainText('Freza iese din foaie:');
  await expect(bloc).toContainText('mm la stânga');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  // Focusul trece pe textul cererii (butonul devenit inactiv l-ar fi lăsat pe pagină), iar bifa e la un Tab distanță.
  await expect(bloc).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-camp="confirma-iesire"]')).toBeFocused();
  // Cu dialogul deschis, tastatura nu schimbă documentul din spatele lui: Ctrl+Z și Delete nu fac nimic.
  await page.locator('[data-camp="confirma-iesire"]').check();
  await page.locator('#export-titlu').click();
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Delete');
  await expect(page.getByTestId('selectie')).toHaveText(stare);
  await expect(page.locator('[data-camp="confirma-iesire"]')).toBeChecked();
  // Un parametru schimbat ia înapoi confirmarea: blocul dispare, iar exportul următor întreabă din nou, nebifat.
  await page.locator('[data-camp="origine"]').selectOption('dreapta-sus');
  await expect(bloc).toHaveCount(0);
  await page.locator('[data-buton="exporta"]').click();
  await expect(bloc).toBeVisible();
  await expect(page.locator('[data-camp="confirma-iesire"]')).not.toBeChecked();
  expect(descarcari).toBe(0);

  // Confirmat: se descarcă, cu declarația în antet.
  await page.locator('[data-camp="confirma-iesire"]').check();
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await d).path(), 'ascii');
  expect(descarcari).toBe(1);
  expect(text).toContain('\n(CONFIRMAT: freza iese din foaie)\n');
  const m = /\n\(iesire mm: st (\d+\.\d{3}) dr 0\.000 jos 0\.000 sus 0\.000\)\n/.exec(text);
  expect(m).not.toBeNull();
  // Pe hârtie: latura stângă a dreptunghiului la X = x, centrul frezei la x − 3, marginea discului la x − 6.
  expect(Math.abs(Number(m?.[1]) - (6 - x))).toBeLessThanOrEqual(0.006);
  // Oracolul independent: programul declarat trece poarta; același program fără declarație e prins de invarianta 5.
  const ctx: ContextPoarta = {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'dreapta-sus', z0: 'sus', diametruScula: 6, pas: 4,
    supracursa: 0, asteptareAx: 3,
  };
  expect(poarta(text, ctx)).toEqual([]);
  const fara = text.split('\n').filter((l) => !l.startsWith('(CONFIRMAT') && !l.startsWith('(iesire mm')).join('\n');
  expect(poarta(fara, ctx).map((i) => i.invarianta)).toContain(5);

  // Un al doilea export, cu aceiași parametri, întreabă din nou, nebifat: fiecare program are bifa lui.
  await page.locator('[data-buton="exporta"]').click();
  await expect(bloc).toBeVisible();
  await expect(page.locator('[data-camp="confirma-iesire"]')).not.toBeChecked();
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  expect(descarcari).toBe(1);
});

/** Trage forma de sub punctul (x, y) mm cu dx mm pe orizontală. */
async function trage(page: Page, x: number, y: number, dx: number): Promise<void> {
  const v = await vedere(page);
  const la = await ecran(page, v);
  const a = la(x, y);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + (dx / 2) * v.scara, a.y, { steps: 4 });
  await page.mouse.move(a.x + dx * v.scara, a.y, { steps: 4 });
  await page.mouse.up();
}

test('un rezultat de export întârziat, venit după schimbarea unui parametru, nu se arată și nu se descarcă', async ({ page }) => {
  // Calculul exportului se încarcă la cerere: îl întârziem 1,5 s, ca rezultatul cu freza veche să vină după schimbare.
  await page.route('**/assets/actiuniExportCalcul-*.js', async (route) => {
    await new Promise((r) => { setTimeout(r, 1500); });
    await route.continue();
  });
  let descarcari = 0;
  page.on('download', () => { descarcari++; });
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await trage(page, 70, 50, -40);
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('[data-buton="exporta"]').click();
  await page.locator('[data-camp="diametru"]').fill('8');
  // Rezultatul cu Ø6 sosește și e aruncat: nicio cerere de confirmare, nicio descărcare.
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('iesire-foaie')).toHaveCount(0);
  expect(descarcari).toBe(0);
  // Exportul cu Ø8 întreabă de ieșirea lui, nebifată.
  await page.locator('[data-buton="exporta"]').click();
  await expect(page.getByTestId('iesire-foaie')).toBeVisible();
  await expect(page.locator('[data-camp="confirma-iesire"]')).not.toBeChecked();
});

test('mai multe forme în afara foii: un singur rând în bara de jos, cu lista în titlu', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  // Primul (cel de deasupra) spre stânga; al doilea, apucat de unde nu-l mai acoperă primul (X 110), spre dreapta.
  await trage(page, 70, 50, -40);
  await trage(page, 110, 50, 230);
  const a = page.getByTestId('avertisment');
  await expect(a).toHaveCount(1);
  await expect(a).toHaveText('2 forme ies din foaie');
  const titlu = (await a.getAttribute('title')) ?? '';
  expect(titlu.split('\n')).toHaveLength(2);
});

test('sub dialog, aplicația e inertă: Shift+Tab nu iese din dialog, iar două Space-uri pe Exportă nu bifează confirmarea', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await trage(page, 70, 50, -40);
  const stare = (await page.getByTestId('selectie').textContent()) ?? '';
  await page.locator('[data-actiune="export.gcode"]').click();
  // La deschidere, focusul intră în dialog.
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.dialog')))).toBe(true);
  // Oricâte Shift+Tab, focusul nu ajunge în aplicația din spate (la Anulează / Reface din bară): e inertă.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.aplicatie')))).toBe(false);
  }
  await expect(page.getByTestId('selectie')).toHaveText(stare);
  // Space pe Exportă pornește exportul; al doilea Space, oricât de repede, nu bifează confirmarea.
  await page.locator('[data-buton="exporta"]').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.getByTestId('iesire-foaie')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('[data-camp="confirma-iesire"]')).not.toBeChecked();
});

test('virgula zecimală: „2,5” înseamnă 2,5 mm, nu 25; un text care nu e număr oprește exportul, cu motivul spus', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await page.locator('[data-actiune="export.gcode"]').click();
  const pas = page.locator('[data-operatie="e1/e1"] input').nth(1);
  await pas.fill('abc');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await expect(page.getByTestId('export-invalid')).toContainText('cu punct sau cu virgulă');
  await expect(pas).toHaveAttribute('aria-invalid', 'true');
  await pas.fill('2,5');
  await expect(page.getByTestId('export-invalid')).toHaveCount(0);
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await d).path(), 'ascii');
  // Gaura de 8 mm cu pasul de cel mult 2,5: patru treceri egale, la −2, −4, −6 și −8 (cu „25” ar fi fost una singură).
  for (const z of ['Z-2.000', 'Z-4.000', 'Z-6.000', 'Z-8.000']) expect(text).toContain(z);
});

test('regiunea păstrată (ADR 0026): două dreptunghiuri puse unul peste altul nu se exportă, iar motivul se vede', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  let descarcari = 0;
  page.on('download', () => { descarcari++; });
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('[data-buton="exporta"]').click();
  await expect(page.getByTestId('export-stare')).toContainText('regiunea păstrată: e1/e1 și e2/e2 se ating sau se intersectează');
  // Tras deoparte (la 230 mm), al doilea nu mai atinge primul: exportul merge.
  await page.getByRole('button', { name: 'Închide' }).click();
  await trage(page, 110, 50, 120);
  const d = page.waitForEvent('download');
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('[data-buton="exporta"]').click();
  await d;
  expect(descarcari).toBe(1);
});

