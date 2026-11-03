import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { poarta, type ContextPoarta } from '../oracles/poarta.ts';
import { regiuneDinDocument } from '../oracles/regiune.ts';
import { ecran, vedere, adauga } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const faraComentarii = (text: string): string[] => text.split('\n').filter((l) => l !== '' && !l.startsWith('('));

/**
 * Documentul salvat de aplicație (ultima versiune din IndexedDB), așteptat până ajunge la revizia dată. Poarta îl
 * primește ca să judece și invariantele 2 (regiunea păstrată) și 9 (sensul) pe programul scris în browser.
 */
async function documentSalvat(page: Page, rev: number): Promise<unknown> {
  let text: string | null = null;
  await expect.poll(async () => {
    text = await page.evaluate(async () => {
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
      return typeof v === 'string' ? v : null;
    });
    return text === null ? -1 : (JSON.parse(text) as { rev: number }).rev;
  }).toBeGreaterThanOrEqual(rev);
  return JSON.parse(text ?? 'null');
}

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
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  const { text, afisat, nume } = await exporta(page, 'stanga-jos');
  expect(nume).toBe('cncvs2-stanga-jos.nc');
  const aur = readFileSync('test/placi/placa-01/placa-01-A.nc', 'ascii');
  expect(faraComentarii(text)).toEqual(faraComentarii(aur));
  // Hash-ul afișat e chiar al fișierului descărcat.
  const sha = createHash('sha256').update(text, 'ascii').digest('hex');
  expect(afisat).toContain(sha);
  expect(afisat).toContain('34 de linii');
  // Poarta întreagă, cu documentul salvat de aplicație: și regiunea păstrată (2), și sensul (9).
  const doc = await documentSalvat(page, 2);
  expect(poarta(text, {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 4,
    supracursa: 0, asteptareAx: 3, avansPlonjare: 300, regiune: regiuneDinDocument(doc as Parameters<typeof regiuneDinDocument>[0]),
  })).toEqual([]);
});

test('cu originea dreapta-sus pe foaia de 300 × 200: cotele pe hârtie și poarta trece', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  const { text } = await exporta(page, 'dreapta-sus');
  // Gaura pornește din (82, 50) mm; față de colțul dreapta-sus al foii 300 × 200: (82 − 300, 50 − 200).
  expect(text).toContain('\nG0 X-218.000 Y-150.000\n');
  expect(text).toContain('(origine dreapta-sus, Z0 sus, foaia 300.000 x 200.000 x 18.000 mm)');
  const doc = await documentSalvat(page, 2);
  const incalcari = poarta(text, {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'dreapta-sus', z0: 'sus', diametruScula: 6, pas: 4,
    supracursa: 0, asteptareAx: 3, avansPlonjare: 300, cadru: { minX: 17, maxX: 123, minY: 17, maxY: 83 },
    regiune: regiuneDinDocument(doc as Parameters<typeof regiuneDinDocument>[0]),
  });
  expect(incalcari).toEqual([]);
});

test('freza iese din foaie: avertismentul stă în bara de jos, iar exportul cere confirmarea și o scrie în antet', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
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
  await adauga(page, 'dreptunghi');
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

test('dialogul exportului care nu se poate încărca (o publicare nouă a schimbat fișierele): mesajul și Închide, nu ecranul de eroare', async ({ page }) => {
  // Dialogul vine legat de document, în bucata `ExportConectat` (cu `DialogExport` în ea).
  await page.route(/ExportConectat-[^/]*\.js$/, (r) => r.abort());
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.getByRole('alert')).toHaveText('Fereastra nu s-a putut încărca (aplicația s-a actualizat între timp sau rețeaua lipsește). Proiectul e salvat: reîncarcă pagina.');
  await expect(page.getByRole('button', { name: 'Reîncarcă' })).toBeVisible();
  await page.getByRole('button', { name: 'Închide' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Aplicația nu mai e inertă, iar documentul e cel de dinainte.
  await expect(page.locator('[data-actiune="import.svg"]')).toBeEnabled();
  await adauga(page, 'cerc');
  await expect(page.getByTestId('selectie')).toContainText('Selectat: cerc R15');
});

test('mai multe forme în afara foii: un singur rând în bara de jos, cu lista în titlu', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'dreptunghi');
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
  await adauga(page, 'dreptunghi');
  await trage(page, 70, 50, -40);
  const stare = (await page.getByTestId('selectie').textContent()) ?? '';
  await page.locator('[data-actiune="export.gcode"]').click();
  // La deschidere (dialogul vine la cerere), focusul intră în dialog.
  await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('.dialog')))).toBe(true);
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
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  const pas = page.locator('[data-operatie="e1/e1"] [data-camp="pas"]');
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
  // Redeschis, în română, pasul se arată cu virgulă, cum l-a scris omul.
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-operatie="e1/e1"] [data-camp="pas"]')).toHaveValue('2,5');
});

test('regiunea păstrată (ADR 0026): două dreptunghiuri puse unul peste altul nu se exportă, iar motivul se vede', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'dreptunghi');
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

test('sensul de tăiere (ADR 0027): gaura în urcare e trigonometric (G3); trecută pe opoziție, orar (G2); pe linie, sensul e oprit', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  const sens = page.locator('[data-operatie="e1/e1"] select[data-camp="sens"]');
  await expect(sens).toHaveValue('urcare');
  const descarca = async (): Promise<string> => {
    const d = page.waitForEvent('download');
    await page.locator('[data-buton="exporta"]').click();
    return readFileSync(await (await d).path(), 'ascii');
  };
  const urcare = await descarca();
  expect(urcare).toMatch(/^G3 /m);
  expect(urcare).not.toMatch(/^G2 /m);
  await sens.selectOption('opozitie');
  const opozitie = await descarca();
  expect(opozitie).toMatch(/^G2 /m);
  expect(opozitie).not.toMatch(/^G3 /m);
  // Același punct de pornire în ambele sensuri.
  expect(opozitie.match(/^G0 X.*$/m)?.[0]).toBe(urcare.match(/^G0 X.*$/m)?.[0]);
  // Sensul ales a intrat în document: redeschis, dialogul îl arată.
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(sens).toHaveValue('opozitie');
  // Pe linie, sensul nu schimbă nimic: câmpul e oprit.
  await page.locator('[data-operatie="e1/e1"] select[data-camp="latura"]').selectOption('pe-linie');
  await expect(sens).toBeDisabled();
});

test('urechile (ADR 0028): bifate pe dreptunghi, cu implicitele 4 × 8 × 2, palierul la 2 mm de fața de jos; intră în document', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-operatie="e1/e1"]');
  // Tăiat prin foaia de 18, în treceri de 6.
  await rand.locator('[data-camp="adancime"]').fill('18');
  await rand.locator('[data-camp="pas"]').fill('6');
  const bifa = rand.locator('[data-camp="urechi"]');
  await expect(bifa).not.toBeChecked();
  await expect(page.locator('[data-urechi="e1/e1"]')).toHaveCount(0);
  await bifa.check();
  const campuri = page.locator('[data-urechi="e1/e1"]');
  await expect(campuri.locator('[data-camp="urechi-numar"]')).toHaveValue('4');
  await expect(campuri.locator('[data-camp="urechi-latime"]')).toHaveValue('8');
  await expect(campuri.locator('[data-camp="urechi-grosime"]')).toHaveValue('2');
  // Un număr de urechi care nu e întreg oprește exportul, cu motivul spus.
  await campuri.locator('[data-camp="urechi-numar"]').fill('2,5');
  await expect(page.getByTestId('export-invalid')).toHaveText(/^Urechile: numărul trebuie să fie un întreg de la 1 la 100;/);
  await expect(campuri.locator('[data-camp="urechi-numar"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await campuri.locator('[data-camp="urechi-numar"]').fill('4');
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await d).path(), 'ascii');
  // Trecerile la 6 și 12 sunt deasupra vârfului (16); cea la 18 urcă pe palier la −16, cu flancuri cu Z.
  expect(text).toMatch(/^G1 X[-\d.]+ Y[-\d.]+ Z-16\.000$/m);
  expect(text).toMatch(/^G1 Z-18\.000 F300\.0$/m);
  expect(text.split('\n').filter((l) => / Z-16\.000/.test(l)).length).toBe(4);
  // Urechile au intrat în document, iar poarta trece pe programul din browser (1, 2, 9 și 10).
  const doc = await documentSalvat(page, 2);
  expect((doc as { piese: Array<{ operatii: Array<{ urechi: unknown }> }> }).piese[0]?.operatii[0]?.urechi).toEqual({ numar: 4, latime: 8, grosime: 2 });
  expect(poarta(text, {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 6,
    supracursa: 0, asteptareAx: 3, avansPlonjare: 300, regiune: regiuneDinDocument(doc as Parameters<typeof regiuneDinDocument>[0]),
  })).toEqual([]);
  // Proiectul redeschis (cheile salvate sortate): un Exportă fără nicio schimbare nu lasă nimic de anulat (recenzia 2.4).
  await page.reload();
  await expect(page.locator('[data-actiune="istoric.anuleaza"]')).toBeDisabled();
  await page.locator('[data-actiune="export.gcode"]').click();
  const d3 = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  expect(readFileSync(await (await d3).path(), 'ascii')).toBe(text);
  await page.getByRole('button', { name: 'Închide' }).click();
  await expect(page.locator('[data-actiune="istoric.anuleaza"]')).toBeDisabled();
  // Redeschis, dialogul arată urechile; scoasa bifa, exportul nu mai are palier.
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(bifa).toBeChecked();
  await bifa.uncheck();
  const d2 = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const fara = readFileSync(await (await d2).path(), 'ascii');
  expect(fara).not.toMatch(/Z-16\.000/);
});

test('rampa (ADR 0029): bifată pe dreptunghi, freza coboară pe buclă, nu drept, fără ridicare între treceri; intră în document', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-operatie="e1/e1"]');
  await rand.locator('[data-camp="adancime"]').fill('12');
  await rand.locator('[data-camp="pas"]').fill('4');
  const bifa = rand.locator('[data-camp="rampa"]');
  await expect(bifa).not.toBeChecked();
  await expect(page.locator('[data-rampa="e1/e1"]')).toHaveCount(0);
  await bifa.check();
  const lungime = page.locator('[data-rampa="e1/e1"] [data-camp="rampa-lungime"]');
  await expect(lungime).toHaveValue('10');
  // O lungime care nu e număr oprește exportul, cu motivul rampei.
  await lungime.fill('zece');
  await expect(page.getByTestId('export-invalid')).toHaveText(/^Rampa: lungimea trebuie să fie un număr între 1 și 10\.000 mm/);
  // Sub rampa minimă (1 mm), tot invalidă: ar fi o plonjare.
  await lungime.fill('0,5');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await lungime.fill('10');
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await d).path(), 'ascii');
  const linii = text.split('\n');
  // O singură mișcare verticală, la fața de sus, prin aer; nicio ridicare până la sfârșit.
  expect(linii.filter((l) => /^G1 Z/.test(l))).toEqual(['G1 Z0.000 F300.0']);
  const taieri = linii.findIndex((l) => l === 'G1 Z0.000 F300.0');
  expect(linii.slice(taieri).filter((l) => /^G0 /.test(l))).toEqual(['G0 Z5.000']);
  // Fiecare trecere coboară pe rampă: −4, −8, −12, cu viteza pe verticală plafonată (F sub avansul de tăiere).
  for (const z of ['-4.000', '-8.000', '-12.000']) {
    expect(text).toMatch(new RegExp(`^G[123] X[-\\d.]+ Y[-\\d.]+ Z${z}( I[-\\d.]+ J[-\\d.]+)?( F\\d+\\.\\d)?$`, 'm'));
  }
  const doc = await documentSalvat(page, 2);
  expect((doc as { piese: Array<{ operatii: Array<{ rampa: unknown }> }> }).piese[0]?.operatii[0]?.rampa).toEqual({ lungime: 10 });
  expect(poarta(text, {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 4,
    supracursa: 0, asteptareAx: 3, avansPlonjare: 300, regiune: regiuneDinDocument(doc as Parameters<typeof regiuneDinDocument>[0]),
  })).toEqual([]);
  // Redeschis, dialogul arată rampa; scoasă bifa, programul revine la plonjări.
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(bifa).toBeChecked();
  await bifa.uncheck();
  const d2 = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const fara = readFileSync(await (await d2).path(), 'ascii');
  expect(fara.split('\n').filter((l) => /^G1 Z/.test(l))).toEqual(['G1 Z-4.000 F300.0', 'G1 Z-8.000 F300.0', 'G1 Z-12.000 F300.0']);
});

test('intrările (ADR 0030): bifate pe dreptunghi, freza plonjează în deșeu și intră tangent; pe gaura prea mică se omit, cu avertisment', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-operatie="e1/e1"]');
  const bifa = rand.locator('[data-camp="intrari"]');
  await expect(bifa).not.toBeChecked();
  await bifa.check();
  const raza = page.locator('[data-intrari="e1/e1"] [data-camp="intrari-raza"]');
  await expect(raza).toHaveValue('3');
  await raza.fill('0,4');
  await expect(page.getByTestId('export-invalid')).toHaveText(/^Intrările: raza trebuie să fie un număr între 0,5 și 10\.000 mm/);
  await raza.fill('3');
  // Pe linie, bifa se oprește: nu există parte de deșeu.
  await rand.locator('select[data-camp="latura"]').selectOption('pe-linie');
  await expect(bifa).toBeDisabled();
  await expect(page.locator('[data-intrari="e1/e1"]')).toHaveCount(0);
  await rand.locator('select[data-camp="latura"]').selectOption('exterior');
  await expect(bifa).toBeChecked();
  // Gaura (cercul R15, interior) cu raza 30: nici 30, nici 15 nu încap în bucla de rază 12.
  await page.locator('[data-operatie="e2/e2"] [data-camp="intrari"]').check();
  await page.locator('[data-intrari="e2/e2"] [data-camp="intrari-raza"]').fill('30');
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await d).path(), 'ascii');
  await expect(page.getByTestId('export-avertismente')).toHaveText(/e2\/e2: intrarea omisă pe bucla 1/);
  // Dreptunghiul 100 × 60 la (20, 20), Ø6, urcare: p₀ = (20, 17), deșeul dedesubt, A = (23, 14).
  const bloc = text.slice(text.indexOf('(e1/e1'));
  expect(bloc).toMatch(/^\(e1\/e1: dreptunghi, exterior, 3 mm\)\nG0 X23\.000 Y14\.000\nG1 Z-3\.000 F300\.0\nG3 X20\.000 Y17\.000 I-3\.000 J0\.000 F1000\.0\n/);
  expect(bloc).toMatch(/\nG3 X17\.000 Y14\.000 I0\.000 J-3\.000\nG0 Z5\.000\n/);
  const doc = await documentSalvat(page, 2);
  const ops = (doc as { piese: Array<{ operatii: Array<{ intrari: unknown }> }> }).piese.map((p) => p.operatii[0]?.intrari);
  expect(ops).toEqual([{ raza: 3 }, { raza: 30 }]);
  expect(poarta(text, {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 4,
    supracursa: 0, asteptareAx: 3, avansPlonjare: 300, regiune: regiuneDinDocument(doc as Parameters<typeof regiuneDinDocument>[0]),
  })).toEqual([]);
  // Redeschis, dialogul citește intrările din document (altfel un Exportă le-ar scoate pe tăcute).
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(bifa).toBeChecked();
  await expect(page.locator('[data-intrari="e1/e1"] [data-camp="intrari-raza"]')).toHaveValue('3');
  await expect(page.locator('[data-intrari="e2/e2"] [data-camp="intrari-raza"]')).toHaveValue('30');
});

test('intrările cu rampă (ADR 0031): rampa coboară pe sfertul intrării, la fiecare trecere; nota din dialog', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-operatie="e1/e1"]');
  await rand.locator('[data-camp="adancime"]').fill('12');
  await rand.locator('[data-camp="pas"]').fill('4');
  await rand.locator('[data-camp="rampa"]').check();
  const nota = page.locator('[data-rampa="e1/e1"] [data-nota="rampa-pe-intrare"]');
  await expect(nota).toHaveCount(0);
  await rand.locator('[data-camp="intrari"]').check();
  await expect(nota).toHaveText('Cu intrări, rampa coboară pe sfertul intrării; lungimea se folosește doar unde intrarea se omite.');
  // Cu rampă, raza are pragul ei: sfertul de cel puțin 1 mm, adică 2/π mm (0,6 trece fără rampă, aici nu).
  const raza = page.locator('[data-intrari="e1/e1"] [data-camp="intrari-raza"]');
  await raza.fill('0,6');
  await expect(page.getByTestId('export-invalid')).toHaveText(/^Intrările: cu rampă, raza trebuie să fie un număr între 0,637 și 10\.000 mm/);
  await rand.locator('[data-camp="rampa"]').uncheck();
  await expect(page.getByTestId('export-invalid')).toHaveCount(0);
  await rand.locator('[data-camp="rampa"]').check();
  await raza.fill('3');
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await d).path(), 'ascii');
  await expect(page.getByTestId('export-avertismente')).toHaveCount(0);
  // Dreptunghiul 100 × 60 la (20, 20), Ø6, urcare: A = (23, 14), p₀ = (20, 17), C = (20, 14). La fiecare trecere: prin aer
  // până la fața de sus, apoi elicea până la −4, −8, −12, cu viteza pe verticală plafonată la 300 mm/min.
  const bloc = text.slice(text.indexOf('(e1/e1'));
  const avans = (dz: number): string => Math.min(1000, (300 * Math.hypot(1.5 * Math.PI, dz)) / dz).toFixed(1);
  for (const z of [4, 8, 12]) {
    expect(bloc).toContain(`G0 X23.000 Y14.000\nG1 Z0.000 F300.0\nG3 X20.000 Y17.000 Z-${z}.000 I-3.000 J0.000 F${avans(z)}\n`);
  }
  expect(bloc.split('\n').filter((l) => l === 'G1 Z0.000 F300.0')).toHaveLength(3);
  const doc = await documentSalvat(page, 2);
  const op = (doc as { piese: Array<{ operatii: Array<{ rampa: unknown; intrari: unknown }> }> }).piese[0]?.operatii[0];
  expect([op?.rampa, op?.intrari]).toEqual([{ lungime: 10 }, { raza: 3 }]);
  // Poarta amendată (ADR 0031): 1, 2, 9, 10, 11, 12 și viteza pe verticală.
  expect(poarta(text, {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 4,
    supracursa: 0, asteptareAx: 3, avansPlonjare: 300, regiune: regiuneDinDocument(doc as Parameters<typeof regiuneDinDocument>[0]),
  })).toEqual([]);
  // Pe linie, intrările se opresc, iar nota dispare.
  await rand.locator('select[data-camp="latura"]').selectOption('pe-linie');
  await expect(nota).toHaveCount(0);
});

test('degajările (ADR 0032): dog-bone pe gaură, drumul din fiecare colț al traseului; intră în document; oprite pe linie', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-operatie="e1/e1"]');
  await rand.locator('select[data-camp="latura"]').selectOption('interior');
  const colturi = rand.locator('select[data-camp="colturi"]');
  await expect(colturi).toHaveValue('');
  await colturi.selectOption('dog-bone');
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await d).path(), 'ascii');
  // Gaura 100 × 60 din (20, 20), Ø6: colțul traseului stânga-jos e (23, 23), iar E = (20 + 3/√2, 20 + 3/√2), dus-întors.
  expect(text).toMatch(/\nG1 X22\.121 Y22\.121( F\d+\.\d)?\nG1 X23\.000 Y23\.000( F\d+\.\d)?\n/);
  for (const e of ['X117.879 Y22.121', 'X117.879 Y77.879', 'X22.121 Y77.879']) expect(text).toContain(e);
  const doc = await documentSalvat(page, 2);
  expect((doc as { piese: Array<{ operatii: Array<{ colturi: unknown }> }> }).piese[0]?.operatii[0]?.colturi).toEqual({ tip: 'dog-bone' });
  // Redeschis, dialogul citește alegerea din document; pe linie, alegerea se oprește.
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(colturi).toHaveValue('dog-bone');
  await rand.locator('select[data-camp="latura"]').selectOption('pe-linie');
  await expect(colturi).toBeDisabled();
  await expect(colturi).toHaveValue('');
});

test('postul grblHAL și unitățile inch (ADR 0083): antetul, 5 zecimale, aceleași mișcări ca placa 1 A împărțite la 25,4; nota postului neprobat', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.getByTestId('post-documentat')).toContainText('Postul GRBL 1.1: scris după documentația controlerului');
  await page.locator('[data-camp="post"]').selectOption('grblhal');
  await page.locator('[data-camp="unitati"]').selectOption('inch');
  await expect(page.getByTestId('post-documentat')).toContainText('Postul grblHAL');
  await expect(page.locator('#export-titlu')).toHaveText('Exportă G-code (grblHAL)');
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await descarcare).path(), 'ascii');
  await expect(page.getByTestId('export-stare')).toContainText('34 de linii');
  // Rezumatul jobului (estimarea citește G20) și simularea merg și în inch.
  await expect(page.locator('[data-rezumat="scule"]')).toBeVisible();
  const linii = text.split('\n');
  expect(linii[1]).toBe('(post grblHAL)');
  expect(linii).toContain('G90 G17 G20 G94');
  const aur = faraComentarii(readFileSync('test/placi/placa-01/placa-01-A.nc', 'ascii'));
  const inch = faraComentarii(text);
  expect(inch.length).toBe(aur.length);
  for (const [k, l] of inch.entries()) {
    const a = aur[k] ?? '';
    if (l.startsWith('G90')) continue;
    for (const m of l.matchAll(/([XYZIJF])(-?[\d.]+)/g)) {
      const v = Number(m[2]), w = Number(new RegExp(`${m[1]}(-?[\\d.]+)`).exec(a)?.[1]);
      const tol = m[1] === 'F' ? 0.07 : 7e-4;
      expect(Math.abs(v * 25.4 - w), `${l} | ${a}`).toBeLessThanOrEqual(tol);
      if (m[1] !== 'F') expect(m[2], l).toMatch(/\.\d{5}$/);
    }
  }
});

test('posturile atelierelor (ADR 0125): NcStudio cu apostrof și setările lui; RichAuto doar în mm, cu nume scurt; în panoul mașinii ajunge doar familia GRBL', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  // Familia GRBL nu poartă notele celorlalte posturi.
  await expect(page.getByTestId('post-descarcat')).toHaveCount(0);
  await expect(page.getByTestId('post-setari')).toHaveCount(0);
  await page.locator('[data-camp="post"]').selectOption('ncstudio');
  await page.locator('[data-camp="unitati"]').selectOption('inch');
  await expect(page.getByTestId('post-descarcat')).toHaveText('Programul pentru NcStudio doar se descarcă: îl rulezi de pe controlerul lui (senderul aplicației vorbește familia GRBL).');
  await expect(page.getByTestId('post-setari')).toHaveText('Verifică pe controler, înainte de pornire: N4063 = 1; N4034 = 0; N4035 = 0.');
  // RichAuto citește doar mm: inch dispare din listă, iar exportul iese în mm, fără comentarii, cu nume scurt.
  await page.locator('[data-camp="post"]').selectOption('richauto');
  await expect(page.locator('[data-camp="unitati"] option[value="inch"]')).toHaveCount(0);
  await expect(page.locator('[data-camp="unitati"]')).toHaveValue('mm');
  await expect(page.getByTestId('post-setari')).toContainText('AbsCntr = Off');
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const richauto = await d;
  expect(richauto.suggestedFilename()).toBe('CNCVS2.NC');
  const r = readFileSync(await richauto.path(), 'ascii');
  expect(r.split('\n')[0]).toBe('G90');
  expect(r).not.toMatch(/[(';]|G4|G54|G2[01]/);
  expect(r.trimEnd().split('\n').at(-1)).toBe('M30');
  await page.getByRole('button', { name: 'Închide' }).click();
  // NcStudio, din nou, în mm: comentariul cu apostrof, setările în antet, G4 P în ms, fără G94.
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('[data-camp="post"]').selectOption('ncstudio');
  const d2 = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const ncstudio = await d2;
  expect(ncstudio.suggestedFilename()).toBe('cncvs2-stanga-jos.nc');
  const linii = readFileSync(await ncstudio.path(), 'ascii').split('\n');
  expect(linii.slice(0, 5)).toEqual(["'CNC Vector Studio", "'post NcStudio", "'controler: N4063 = 1", "'controler: N4034 = 0", "'controler: N4035 = 0"]);
  for (const l of ['G90 G17 G21', 'G40 G49 G80', 'G54', 'G4 P3000']) expect(linii).toContain(l);
  expect(linii.some((l) => l.includes('G94'))).toBe(false);
  // Nici „Deschide în Mașina” (ADR 0132 §7): senderul nu vorbește NcStudio.
  await expect(page.locator('[data-buton="in-masina"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Închide' }).click();
  // Fereastra Mașina: programul NcStudio nu ajunge la sender (un G4 P3000 ar fi acolo 50 de minute)…
  await page.locator('[data-actiune="vedere.masina"]').click();
  await expect(page.locator('[data-masina="export"]')).toBeDisabled();
  await expect(page.locator('[data-masina="export"]')).toHaveAttribute('title', /familia GRBL/);
  // …iar unul GRBL 1.1, da, exportat din Proiectare (ADR 0132), cu „Deschide în Mașina” în fereastra exportului.
  await page.locator('[data-actiune="vedere.proiectare"]').click();
  await page.locator('[data-actiune="export.gcode"]').click();
  const d3 = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await d3;
  await expect(page.locator('[data-buton="in-masina"]')).toBeVisible();
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="vedere.masina"]').click();
  await expect(page.locator('[data-masina="export"]')).toBeEnabled();
});

/** Cheile rândurilor din tabelul operațiilor (nu din rezumat), în ordinea afișată. */
const randuriOrdine = (page: Page): Promise<Array<string | null>> =>
  page.locator('tr[data-operatie]:has(td.ordine)').evaluateAll((r) => r.map((x) => x.getAttribute('data-operatie')));
const rapide = (text: string): string[] => text.split('\n').filter((l) => /^G0 X/.test(l));

/**
 * Tragerea unui mâner (HTML5) până pe un rând, cu mausul în pași: cu `dragTo`, dintr-un singur salt, tragerea nu pornește în
 * aplicație (pe o pagină goală, da); în pași, `dragstart` vine pe mâner, ca la om.
 */
async function tragePeRand(page: Page, maner: string, rand: string): Promise<void> {
  const a = await page.locator(maner).boundingBox();
  const b = await page.locator(rand).boundingBox();
  if (!a || !b) throw new Error('mânerul sau rândul n-are cutie');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 - 10, { steps: 4 });
  await page.mouse.move(a.x + a.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

test('ordinea de mână (ADR 0133): A mea cu săgețile și tragerea; riscul cere bifa; programul în ordinea mea, scrisă în proiect; Automată o scoate', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('[data-camp="origine"]').selectOption('stanga-jos');
  // Automată: gaura (interiorul) întâi, apoi dreptunghiul, cu locul în coloana #; fără mânere și săgeți.
  await expect(page.locator('[data-ordine="automata"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await randuriOrdine(page)).toEqual(['e2/e2', 'e1/e1']);
  await expect(page.locator('[data-loc]')).toHaveText(['1', '2']);
  await expect(page.locator('[data-sus], [data-jos], [data-trage], [data-ordine="inapoi"]')).toHaveCount(0);

  // A mea pornește din ordinea automată: săgeata în jos duce gaura după dreptunghi.
  await page.locator('[data-ordine="a-mea"]').click();
  await expect(page.locator('[data-ordine="a-mea"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-sus="e2/e2"]')).toBeDisabled();
  await expect(page.locator('[data-jos="e1/e1"]')).toBeDisabled();
  await expect(page.getByTestId('risc-ordine')).toHaveCount(0);
  await page.locator('[data-jos="e2/e2"]').click();
  expect(await randuriOrdine(page)).toEqual(['e1/e1', 'e2/e2']);
  // Dreptunghiul și cercul sunt piese separate, dar cercul stă în dreptunghi: riscul numește rândurile, Exportă cere bifa.
  const risc = page.getByTestId('risc-ordine');
  await expect(risc).toContainText('Exteriorul din rândul 1 se taie înaintea rândului 2');
  const exporta = page.locator('[data-buton="exporta"]');
  const bifa = page.locator('[data-camp="confirma-ordine"]');
  await expect(exporta).toBeDisabled();
  await bifa.check();
  await expect(exporta).toBeEnabled();
  // Orice mutare șterge bifa.
  await page.locator('[data-sus="e2/e2"]').click();
  await expect(risc).toHaveCount(0);
  await page.locator('[data-jos="e2/e2"]').click();
  await expect(bifa).not.toBeChecked();
  await bifa.check();
  const d = page.waitForEvent('download');
  await exporta.click();
  const mea = readFileSync(await (await d).path(), 'ascii');
  // Pe hârtie: dreptunghiul pornește din (20, 17), gaura din (82, 50) (placa 1 A, în ordinea inversă).
  expect(rapide(mea)).toEqual(['G0 X20.000 Y17.000', 'G0 X82.000 Y50.000']);
  // Ordinea e scrisă în proiect (revizia 3: rangurile), iar poarta trece și pe ea: regiunea, sensul, pașii.
  const doc = await documentSalvat(page, 3) as { piese: Array<{ id: string; operatii: Array<{ rang?: number }> }> };
  expect(doc.piese.map((p) => [p.id, p.operatii.map((o) => o.rang)])).toEqual([['e1', [0]], ['e2', [1]]]);
  expect(poarta(mea, {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 4,
    supracursa: 0, asteptareAx: 3, avansPlonjare: 300, regiune: regiuneDinDocument(doc as Parameters<typeof regiuneDinDocument>[0]),
  })).toEqual([]);

  // Redeschisă, fereastra arată ordinea scrisă. Tragerea: mânerul gaurii lăsat pe rândul dreptunghiului o duce înapoi întâi.
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-ordine="a-mea"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await randuriOrdine(page)).toEqual(['e1/e1', 'e2/e2']);
  await tragePeRand(page, '[data-trage="e2/e2"]', 'tr[data-operatie="e1/e1"]:has(td.ordine)');
  expect(await randuriOrdine(page)).toEqual(['e2/e2', 'e1/e1']);
  await expect(page.getByTestId('risc-ordine')).toHaveCount(0);

  // Înapoi la ordinea automată: la Exportă, rangurile pleacă, iar programul e exact placa 1 A.
  await page.locator('[data-ordine="inapoi"]').click();
  await expect(page.locator('[data-ordine="automata"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-sus], [data-jos], [data-trage]')).toHaveCount(0);
  const d2 = page.waitForEvent('download');
  await exporta.click();
  const auto = readFileSync(await (await d2).path(), 'ascii');
  expect(faraComentarii(auto)).toEqual(faraComentarii(readFileSync('test/placi/placa-01/placa-01-A.nc', 'ascii')));
  const fara = await documentSalvat(page, 4) as { piese: Array<{ operatii: Array<{ rang?: number }> }> };
  expect(fara.piese.flatMap((p) => p.operatii.map((o) => o.rang))).toEqual([undefined, undefined]);
});

test('ordinea de mână (ADR 0133 §2): V-carve-urile aceleiași piese, cu aceleași valori, sunt legate („cu N”); cu altă adâncime, nu', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  // Scade: o piesă cu două operații, exteriorul și gaura (ADR 0067).
  const randuri = page.getByTestId('lista-vectori').locator('button[data-instanta]');
  await randuri.first().click();
  await expect(page.locator('[data-editare="lipire"]')).toBeAttached();
  const pe = (await ecran(page, await vedere(page)))(85, 50);
  await page.keyboard.down('Shift');
  await page.mouse.click(pe.x, pe.y);
  await page.keyboard.up('Shift');
  await page.locator('[data-editare="boolean-scade"]').click();
  await expect(randuri).toHaveCount(1);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('tr[data-operatie]:has(td.ordine)')).toHaveCount(2);
  const chei = await randuriOrdine(page);
  const [prima, a2] = chei as [string, string];
  for (const k of [prima, a2]) {
    await page.locator(`tr[data-operatie="${k}"]:has(td.ordine) [data-camp="latura"]`).selectOption('vcarve');
    await page.locator(`tr[data-operatie="${k}"]:has(td.ordine) [data-camp="forma-scula"]`).selectOption('v');
  }
  // Aceleași valori: al doilea rând se sapă odată cu primul.
  await expect(page.locator(`tr[data-operatie="${a2}"]:has(td.ordine) [data-legat]`)).toHaveText('cu 1');
  await expect(page.locator(`tr[data-operatie="${prima}"]:has(td.ordine) [data-legat]`)).toHaveCount(0);
  // În ordinea mea, rândul mutat întâi devine primul: celălalt arată locul lui.
  await page.locator('[data-ordine="a-mea"]').click();
  await page.locator(`[data-sus="${a2}"]`).click();
  await expect(page.locator(`tr[data-operatie="${prima}"]:has(td.ordine) [data-legat]`)).toHaveText('cu 1');
  // Rândul exteriorului, trecut pe V-carve, nu mai e un exterior: se sapă pe dinăuntru, fără risc.
  await expect(page.getByTestId('risc-ordine')).toHaveCount(0);
  await expect(page.locator(`tr[data-operatie="${a2}"]:has(td.ordine) [data-legat]`)).toHaveCount(0);
  // Altă adâncime: două regiuni, fără legătură.
  await page.locator(`tr[data-operatie="${prima}"]:has(td.ordine) [data-camp="adancime"]`).fill('2');
  await expect(page.locator('[data-legat]')).toHaveCount(0);
});
