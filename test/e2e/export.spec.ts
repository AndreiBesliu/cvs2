import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { poarta, type ContextPoarta } from '../oracles/poarta.ts';
import { regiuneDinDocument } from '../oracles/regiune.ts';
import { ecran, vedere } from './ajutor-panza.ts';

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
  // Poarta întreagă, cu documentul salvat de aplicație: și regiunea păstrată (2), și sensul (9).
  const doc = await documentSalvat(page, 2);
  expect(poarta(text, {
    foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine: 'stanga-jos', z0: 'sus', diametruScula: 6, pas: 4,
    supracursa: 0, asteptareAx: 3, avansPlonjare: 300, regiune: regiuneDinDocument(doc as Parameters<typeof regiuneDinDocument>[0]),
  })).toEqual([]);
});

test('cu originea dreapta-sus pe foaia de 300 × 200: cotele pe hârtie și poarta trece', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
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
  // Redeschis, în română, pasul se arată cu virgulă, cum l-a scris omul.
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-operatie="e1/e1"] input').nth(1)).toHaveValue('2,5');
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

test('sensul de tăiere (ADR 0027): gaura în urcare e trigonometric (G3); trecută pe opoziție, orar (G2); pe linie, sensul e oprit', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
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
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-operatie="e1/e1"]');
  // Tăiat prin foaia de 18, în treceri de 6.
  await rand.locator('input').nth(0).fill('18');
  await rand.locator('input').nth(1).fill('6');
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
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-operatie="e1/e1"]');
  await rand.locator('input').nth(0).fill('12');
  await rand.locator('input').nth(1).fill('4');
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
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
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
});
