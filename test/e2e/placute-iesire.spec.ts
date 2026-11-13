/**
 * Felia 11.4↑c (ADR 0210 §4, răspunsul 5): textul care iese din plăcuță și unealta Text pe un șablon cu ramă. O ramă 120 × 30
 * și textul „Ana” grupate; «Din CSV…»: „Fă din textul ales câmpul {Nume}”, „avertisment și confirmare la export”, două
 * plăcuțe (Ion; Constantin Brâncoveanu, prea lung pentru ramă). Plăcuța lungă e roșie în listă, bara de jos o spune, panoul
 * o spune lângă valori, iar exportul nu pornește fără bifă (nici „Toate foile”, de pe o a doua foaie fără plăcuțe, care
 * singură nu cere bifa). Apoi unealta Text, pe plăcuța aleasă: mărimea 3 în loc de 8,
 * «Aplică»: plăcuțele se refac, textul încape, avertismentul pleacă.
 */
import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

type Nod = { tip: string; text?: { continut: string; inaltime: number }; copii?: Nod[] };
type Doc = { piese: Array<{ radacina: Nod }>; foi: Array<{ instante: Array<{ texte?: Record<string, { continut: string }> }> }> };

/** Ultima versiune salvată în IndexedDB, așteptată până când `gata` o acceptă. */
async function salvat(page: Page, gata: (d: Doc) => boolean): Promise<Doc> {
  let d: Doc | null = null;
  await expect.poll(async () => {
    const text = await page.evaluate(async () => {
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
    d = text === null ? null : JSON.parse(text) as Doc;
    return d !== null && gata(d);
  }).toBe(true);
  return d as unknown as Doc;
}

/** Blocul textului grupat al piesei (sub rădăcină). */
const textGrupat = (d: Doc): Nod['text'] => d.piese[0]?.radacina.copii?.find((c) => c.text)?.text;
const lista = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');
const dialog = (page: Page) => page.getByTestId('dialog-csv');

test('textul care iese din plăcuță: roșu în listă, bara de jos, panoul, bifa exportului; unealta Text pe șablonul cu ramă îl repară', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  const la = await ecran(page, await vedere(page));
  // Rama: dreptunghiul 60 × 20 din (160, 20), în dreapta foii (panoul uneltei Text acoperă stânga pânzei).
  await page.locator('[data-unealta="dreptunghi"]').click();
  await page.mouse.move(la(160, 20).x, la(160, 20).y);
  await page.mouse.down();
  await page.mouse.move(la(190, 30).x, la(190, 30).y, { steps: 4 });
  await page.mouse.move(la(220, 40).x, la(220, 40).y, { steps: 4 });
  await page.mouse.up();
  await expect(lista(page)).toHaveCount(1);
  // Textul „Ana”, de 8 mm, în (165, 25), înăuntrul ramei, departe de laturile ei (clicul nu cade pe contur).
  await page.locator('[data-unealta="text"]').click();
  await page.locator('[data-text="continut"]').fill('Ana');
  await page.locator('[data-text="inaltime"]').fill('8');
  await page.mouse.click(la(165, 25).x, la(165, 25).y);
  await page.click('[data-text="adauga"]');
  await page.keyboard.press('Escape');
  await expect(lista(page)).toHaveCount(2);
  // Amândouă alese cu un dreptunghi de selecție (tras de sus-stânga spre jos-dreapta), apoi grupate (Ctrl+G): șablonul cu ramă.
  await page.locator('[data-unealta="selectie"]').click();
  await page.mouse.move(la(150, 60).x, la(150, 60).y);
  await page.mouse.down();
  await page.mouse.move(la(190, 30).x, la(190, 30).y, { steps: 4 });
  await page.mouse.move(la(230, 10).x, la(230, 10).y, { steps: 4 });
  await page.mouse.up();
  await page.locator('body').focus();
  await page.keyboard.press('Control+g');
  await expect(lista(page)).toHaveCount(1);
  await lista(page).first().click();

  // «Din CSV…» pe șablonul cu ramă: textul grupat devine {Nume}; confirmarea la export, aleasă; două plăcuțe.
  await page.getByTestId('prop-piesa').locator('[data-buton="din-csv"]').click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).locator('[data-camp="csv-lipire"]').fill('Nume\nIon\nConstantin Brâncoveanu\n');
  const t = dialog(page).locator('[data-camp="csv-text"]');
  await t.focus();
  await page.keyboard.press('Control+a');
  await dialog(page).locator('[data-buton="csv-fa-camp"]').click();
  await expect(t).toHaveValue('{Nume}');
  await expect(dialog(page).locator('[data-camp="csv-iesire"]')).toHaveValue('avertisment');
  await dialog(page).locator('[data-camp="csv-iesire"]').selectOption('confirmare');
  await dialog(page).locator('[data-buton="csv-fa"]').click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByTestId('placuta-csv')).toContainText('Textul iese dintr-o plăcuță: e cu roșu în listă, iar exportul cere confirmarea.');

  // Plăcuța lungă: roșie în listă (cu motivul în titlu), în bara de jos, și în panou, lângă valori.
  await expect(lista(page)).toHaveText(['Ion (1 din 2)', 'Constantin Brâncoveanu (2 din 2)']);
  await expect(lista(page).nth(1)).toHaveClass(/cu-avertisment/);
  await expect(lista(page).nth(1)).toHaveAttribute('title', 'Textul plăcuței „Constantin Brâncoveanu” iese din ea');
  await expect(lista(page).nth(0)).not.toHaveClass(/cu-avertisment/);
  await expect(page.getByTestId('avertisment')).toHaveText('Textul plăcuței „Constantin Brâncoveanu” iese din ea');
  await lista(page).nth(1).click();
  await expect(page.getByTestId('placuta-iese')).toBeVisible();
  await lista(page).nth(0).click();
  await expect(page.getByTestId('placuta-iese')).toHaveCount(0);

  // Exportul: nota cu plăcuța și bifa; fără ea, Exportă e oprit.
  await page.locator('[data-actiune="export.gcode"]').click();
  const cerere = page.getByTestId('placute-iesire');
  await expect(cerere).toContainText('Textul iese din plăcuța „Constantin Brâncoveanu”: e cu roșu în listă.');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await cerere.locator('[data-camp="confirma-placute"]').check();
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  await cerere.locator('[data-camp="confirma-placute"]').uncheck();
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await page.getByRole('button', { name: 'Închide' }).click();
  await expect(cerere).toHaveCount(0);
  // Cu o a doua foaie activă (un cerc, fără plăcuțe), exportul foii ei nu cere bifa; „Toate foile” o cere, pentru plăcuța
  // foii 1 (ADR 0210 §5). Apoi înapoi pe foaia 1.
  const foi = page.getByTestId('lista-vectori');
  await foi.locator('[data-actiune="foaie.adauga"]').click();
  await expect(foi.locator('[data-foaie]')).toHaveCount(2);
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.getByTestId('export-foi-alegere')).toBeVisible();
  await expect(cerere).toHaveCount(0);
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  await page.locator('[data-foi="toate"]').click();
  await expect(cerere).toContainText('Textul iese din plăcuța „Constantin Brâncoveanu”: e cu roșu în listă.');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await cerere.locator('[data-camp="confirma-placute"]').check();
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  await page.getByRole('button', { name: 'Închide' }).click();
  await foi.locator('[data-foaie="f1"] [data-nod="foaie"]').click();
  await expect(lista(page)).toHaveCount(2);
  // Redeschis: judecata plăcuțelor vine la cerere, fără fereastra CSV: lista și bara de jos o spun din nou.
  await page.reload();
  await expect(page.getByTestId('avertisment')).toHaveText('Textul plăcuței „Constantin Brâncoveanu” iese din ea');
  await expect(lista(page).nth(1)).toHaveClass(/cu-avertisment/);

  // Unealta Text, cu plăcuța „Ion” aleasă din listă: editează textul șablonului (cel grupat, singurul al piesei).
  await page.locator('[data-unealta="text"]').click();
  await lista(page).nth(0).click();
  await expect(page.getByTestId('text-stare')).toContainText('Editezi textul ales');
  await expect(page.locator('[data-text="continut"]')).toHaveValue('{Nume}');
  await expect(page.getByTestId('text-placute')).toBeVisible();
  // Mărimea 3 în loc de 8: «Aplică» reface ambele plăcuțe; „Constantin Brâncoveanu” încape (sub 50 mm, de la 5 mm din ramă).
  await page.locator('[data-text="inaltime"]').fill('3');
  await page.click('[data-text="aplica"]');
  const d = await salvat(page, (x) => textGrupat(x)?.inaltime === 3);
  // Șablonul (prima piesă) și cercul foii 2.
  expect(d.piese).toHaveLength(2);
  expect(d.piese[0]?.radacina.copii).toHaveLength(2);
  expect(textGrupat(d)?.continut).toBe('{Nume}');
  expect(d.foi[0]?.instante.map((i) => Object.values(i.texte ?? {})[0]?.continut)).toEqual(['Ion', 'Constantin Brâncoveanu']);
  await expect(page.getByTestId('avertisment')).toHaveCount(0);
  await expect(lista(page).nth(1)).not.toHaveClass(/cu-avertisment/);
  expect(erori).toEqual([]);
});

test('unealta Text pe un șablon cu ramă, fără plăcuțe: clicul pe litere alege textul grupat, «Aplică» îl schimbă și lasă rama', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  const la = await ecran(page, await vedere(page));
  await page.locator('[data-unealta="dreptunghi"]').click();
  await page.mouse.move(la(160, 20).x, la(160, 20).y);
  await page.mouse.down();
  await page.mouse.move(la(280, 50).x, la(280, 50).y, { steps: 6 });
  await page.mouse.up();
  await page.locator('[data-unealta="text"]').click();
  await page.locator('[data-text="continut"]').fill('Ana');
  await page.locator('[data-text="inaltime"]').fill('8');
  await page.mouse.click(la(170, 30).x, la(170, 30).y);
  await page.click('[data-text="adauga"]');
  await page.keyboard.press('Escape');
  await page.locator('[data-unealta="selectie"]').click();
  await page.mouse.move(la(150, 60).x, la(150, 60).y);
  await page.mouse.down();
  await page.mouse.move(la(290, 10).x, la(290, 10).y, { steps: 6 });
  await page.mouse.up();
  await page.locator('body').focus();
  await page.keyboard.press('Control+g');
  await expect(lista(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  // Unealta Text: clic pe litera A a textului „Ana” (de 8 mm, din x 170, y 30: punctul (173, 33)): textul grupat, în panou.
  await page.locator('[data-unealta="text"]').click();
  await page.mouse.click(la(173, 33).x, la(173, 33).y);
  await expect(page.getByTestId('text-stare')).toContainText('Editezi textul ales');
  await expect(page.locator('[data-text="continut"]')).toHaveValue('Ana');
  await page.locator('[data-text="continut"]').fill('Ana Maria');
  await page.click('[data-text="aplica"]');
  const d = await salvat(page, (x) => textGrupat(x)?.continut === 'Ana Maria');
  expect(d.piese).toHaveLength(1);
  expect(d.piese[0]?.radacina.copii).toHaveLength(2);
  await expect(lista(page)).toHaveCount(1);
  // Un clic înăuntrul ramei, departe de litere („Ana Maria” de 8 mm se termină înainte de x 240) și de laturi: ancora unui
  // text nou, nu textul grupat.
  await page.mouse.click(la(260, 40).x, la(260, 40).y);
  await expect(page.getByTestId('text-stare')).toContainText('Text nou');
  expect(erori).toEqual([]);
});

test('două texte cu câmpuri, în fonturi diferite, pe o ramă: clicul alege textul lui; «Aplică» pe unul reface plăcuțele și cu fontul celuilalt', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  const la = await ecran(page, await vedere(page));
  // Rama 120 × 30 din (160, 20); „Ana” (Roboto) în (170, 30) și „Clasa” (Droid Serif) în (230, 30), amândouă de 8 mm.
  await page.locator('[data-unealta="dreptunghi"]').click();
  await page.mouse.move(la(160, 20).x, la(160, 20).y);
  await page.mouse.down();
  await page.mouse.move(la(280, 50).x, la(280, 50).y, { steps: 6 });
  await page.mouse.up();
  for (const [continut, font, x] of [['Ana', 'roboto', 170], ['Clasa', 'droid-serif', 230]] as const) {
    await page.locator('[data-unealta="text"]').click();
    await page.locator('[data-text="continut"]').fill(continut);
    await page.locator('[data-text="font"]').selectOption(font);
    await page.locator('[data-text="inaltime"]').fill('8');
    await page.mouse.click(la(x, 30).x, la(x, 30).y);
    await page.click('[data-text="adauga"]');
    await page.keyboard.press('Escape');
  }
  await page.locator('[data-unealta="selectie"]').click();
  await page.mouse.move(la(150, 60).x, la(150, 60).y);
  await page.mouse.down();
  await page.mouse.move(la(290, 10).x, la(290, 10).y, { steps: 6 });
  await page.mouse.up();
  await page.locator('body').focus();
  await page.keyboard.press('Control+g');
  await expect(lista(page)).toHaveCount(1);
  // Unealta Text: clicul pe „Clasa” îl alege pe el (nu primul text al ramei), apoi clicul pe „Ana”, pe ea.
  await page.locator('[data-unealta="text"]').click();
  await page.mouse.click(la(234, 33).x, la(234, 33).y);
  await expect(page.locator('[data-text="continut"]')).toHaveValue('Clasa');
  await page.mouse.click(la(173, 33).x, la(173, 33).y);
  await expect(page.locator('[data-text="continut"]')).toHaveValue('Ana');
  await page.keyboard.press('Escape');
  // Câmpurile, din fereastra CSV: {Nume} din „Ana”, {Clasa} din „Clasa”; două plăcuțe.
  await page.locator('[data-unealta="selectie"]').click();
  await lista(page).first().click();
  await page.getByTestId('prop-piesa').locator('[data-buton="din-csv"]').click();
  await dialog(page).locator('[data-camp="csv-lipire"]').fill('Nume\tClasa\nIon\t5A\nEva\t6B\n');
  const t = dialog(page).locator('[data-camp="csv-text"]');
  for (const [k, continut, camp] of [[0, 'Ana', 'Nume'], [1, 'Clasa', 'Clasa']] as const) {
    await dialog(page).locator('[data-camp="csv-text-ales"]').selectOption(String(k));
    await expect(t).toHaveValue(continut);
    await dialog(page).locator('[data-camp="csv-camp-nume"]').fill(camp);
    await t.focus();
    await page.keyboard.press('Control+a');
    await dialog(page).locator('[data-buton="csv-fa-camp"]').click();
    await expect(t).toHaveValue(`{${camp}}`);
  }
  await dialog(page).locator('[data-buton="csv-fa"]').click();
  await expect(dialog(page)).toHaveCount(0);
  await salvat(page, (x) => x.foi[0]?.instante.length === 2);
  // Unealta Text pe plăcuța „Ion”: textul {Nume} (Roboto), de 6 mm; plăcuțele se refac, cu {Clasa} în Droid Serif.
  await page.locator('[data-unealta="text"]').click();
  await lista(page).first().click();
  await expect(page.locator('[data-text="continut"]')).toHaveValue('{Nume}');
  await page.locator('[data-text="inaltime"]').fill('6');
  await page.click('[data-text="aplica"]');
  const d = await salvat(page, (x) => x.piese[0]?.radacina.copii?.some((c) => c.text?.continut === '{Nume}' && c.text.inaltime === 6) === true);
  expect(d.foi[0]?.instante.map((i) => Object.values(i.texte ?? {}).map((x) => x.continut).sort().join('|'))).toEqual(['5A|Ion', '6B|Eva']);
  expect(erori).toEqual([]);
});
