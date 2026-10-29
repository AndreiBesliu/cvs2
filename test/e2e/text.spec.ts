import { test, expect, type Page } from '@playwright/test';
import { ecran, vedere } from './ajutor-panza.ts';

/**
 * Unealta Text (ADR 0105), în Edge: ancora pusă cu un clic, textul scris în panou, piesa salvată cu blocul ei (litera N de
 * exact 20 mm), Aplică (alt font, altă înălțime), Ctrl+Z, editarea după reîncărcare, degruparea în litere (care nu mai sunt
 * text), refuzurile din panou (caracterele lipsă, înălțimea greșită).
 */

test.use({ locale: 'ro-RO' });

/** Ultima versiune salvată în IndexedDB, așteptată până la revizia dată (ca în `import.spec.ts`). */
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

type P = { x: number; y: number };
type Nod = { tip: 'element' | 'grup'; id: string; nume?: string; copii?: Nod[]; text?: Record<string, unknown>; forma?: { varfuri: Array<{ p: P; s: { tip: string; c1?: P; c2?: P } }> } };
type Doc = { rev: number; piese: Array<{ id: string; nume: string; radacina: Nod }>; foi: Array<{ instante: Array<{ id: string; piesa: string; x: number; y: number }> }> };

/** Ordonatele tuturor punctelor unei litere (vârfurile și mânerele cubicelor), în mm ai piesei. */
const ordonate = (g: Nod): number[] => (g.copii ?? []).flatMap((e) => (e.forma?.varfuri ?? []).flatMap((v) => [v.p.y, ...(v.s.c1 && v.s.c2 ? [v.s.c1.y, v.s.c2.y] : [])]));

test('unealta Text: „LEMN Șțăâî” de 20 mm din ancoră, N de exact 20 mm; Aplică (font, înălțime); Ctrl+Z; după reîncărcare se editează; degruparea', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-unealta="text"]').click();
  await expect(page.getByTestId('panou-text')).toBeVisible();
  // Textul scris întâi: fără ancoră, Adaugă rămâne oprit și panoul spune de ce.
  await page.locator('[data-text="continut"]').fill('LEMN Șțăâî');
  await expect(page.getByTestId('text-motiv')).toHaveText('Clic pe foaie unde începe textul.');
  await expect(page.locator('[data-text="adauga"]')).toBeDisabled();
  const v = await vedere(page);
  const la = await ecran(page, v);
  // Panoul stă în colțul din stânga-sus al pânzei: ancora, în dreapta foii.
  const a = la(180, 60);
  await page.mouse.click(a.x, a.y);
  await expect(page.getByTestId('ancora-text')).toBeVisible();
  await expect(page.locator('[data-text="adauga"]')).toBeEnabled();
  await page.click('[data-text="adauga"]');
  await expect(page.getByTestId('text-stare')).toContainText('Editezi textul ales');
  const d1 = await documentSalvat(page, 1) as Doc;
  const piesa = d1.piese[0]!;
  expect(piesa.nume).toBe('LEMN Șțăâî');
  expect(piesa.radacina.text).toMatchObject({ continut: 'LEMN Șțăâî', font: 'roboto', inaltime: 20, spatiere: 0, interlinie: 1, aliniere: 'stanga' });
  expect(piesa.radacina.copii!.map((g) => g.nume)).toEqual(['L', 'E', 'M', 'N', 'Ș', 'ț', 'ă', 'â', 'î']);
  const n = ordonate(piesa.radacina.copii![3]!);
  expect(Math.min(...n)).toBeCloseTo(0, 9);
  expect(Math.max(...n)).toBeCloseTo(20, 9);
  // Instanța stă în ancoră (la rezoluția unui pixel de ecran).
  const inst = d1.foi[0]!.instante[0]!;
  expect(Math.abs(inst.x - 180)).toBeLessThanOrEqual(1 / v.scara);
  expect(Math.abs(inst.y - 60)).toBeLessThanOrEqual(1 / v.scara);

  // Aplică: Droid Serif, 30 mm; același id, aceeași instanță, un pas.
  await page.locator('[data-text="inaltime"]').fill('30');
  await page.locator('select[data-text="font"]').selectOption('droid-serif');
  await expect(page.locator('[data-text="aplica"]')).toBeEnabled();
  await page.click('[data-text="aplica"]');
  const d2 = await documentSalvat(page, 2) as Doc;
  expect(d2.piese.map((x) => x.id)).toEqual([piesa.id]);
  expect(d2.piese[0]!.radacina.text).toMatchObject({ font: 'droid-serif', inaltime: 30 });
  const n2 = ordonate(d2.piese[0]!.radacina.copii![3]!);
  expect(Math.max(...n2) - Math.min(...n2)).toBeCloseTo(30, 9);

  // Ctrl+Z, cu focusul pe pânză: textul de dinainte, iar panoul îl arată.
  await page.locator('[data-unealta="selectie"]').click();
  await page.getByTestId('panza').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+z');
  const d3 = await documentSalvat(page, 3) as Doc;
  expect(d3.piese[0]!.radacina.text).toMatchObject({ font: 'roboto', inaltime: 20 });

  // După reîncărcare, un clic cu unealta Text pe text îl alege, cu blocul lui în panou.
  await page.reload();
  await page.locator('[data-unealta="text"]').click();
  const v2 = await vedere(page);
  const la2 = await ecran(page, v2);
  // Pe conturul lui L: primul lui vârf, din documentul salvat (clicul alege conturul cel mai apropiat).
  const varfL = piesa.radacina.copii![0]!.copii![0]!.forma!.varfuri[0]!.p;
  const pe = la2(inst.x + varfL.x, inst.y + varfL.y);
  await page.mouse.click(pe.x, pe.y);
  await expect(page.getByTestId('text-stare')).toContainText('Editezi textul ales');
  await expect(page.locator('[data-text="continut"]')).toHaveValue('LEMN Șțăâî');
  await expect(page.locator('[data-text="inaltime"]')).toHaveValue('20');
  await expect(page.locator('select[data-text="font"]')).toHaveValue('roboto');

  // Degrupează: literele devin piese obișnuite (nu mai sunt text: clicul pe una pune ancora, nu o editează).
  await page.locator('[data-unealta="selectie"]').click();
  await page.mouse.click(pe.x, pe.y);
  await page.keyboard.press('Control+Shift+g');
  const d4 = await documentSalvat(page, 4) as Doc;
  expect(d4.piese).toHaveLength(9);
  expect(d4.piese.every((x) => !('text' in x.radacina))).toBe(true);
  await page.locator('[data-unealta="text"]').click();
  await page.mouse.click(pe.x, pe.y);
  await expect(page.getByTestId('text-stare')).toContainText('Text nou');
});

test('panoul textului spune ce lipsește: caracterele pe care fontul nu le are, înălțimea greșită; fără litere, Adaugă e oprit', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-unealta="text"]').click();
  const v = await vedere(page);
  const la = await ecran(page, v);
  const a = la(200, 40);
  await page.mouse.click(a.x, a.y);
  await expect(page.getByTestId('ancora-text')).toBeVisible();
  await page.locator('[data-text="continut"]').fill('☃');
  await expect(page.getByTestId('text-motiv')).toHaveText('1 caracter lipsește din font și nu se desenează: ☃');
  await expect(page.locator('[data-text="adauga"]')).toBeDisabled();
  await page.locator('[data-text="continut"]').fill('A☃B☃');
  await expect(page.getByTestId('text-motiv')).toHaveText('2 caractere lipsesc din font și nu se desenează: ☃');
  await expect(page.locator('[data-text="adauga"]')).toBeEnabled();
  await page.locator('[data-text="inaltime"]').fill('0');
  await expect(page.getByTestId('text-motiv')).toHaveText('Înălțimea e un număr între 0,1 și 1 000 mm.');
  await expect(page.locator('[data-text="adauga"]')).toBeDisabled();
  // Escape închide panoul: unealta Selecție.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('panou-text')).toHaveCount(0);
  await expect(page.locator('[data-unealta="selectie"]')).toHaveAttribute('aria-pressed', 'true');
});
