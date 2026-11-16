/**
 * Felia 11.4↑ (ADR 0210 §4): plăcuțele. Un text cu un câmp (`Masa {nr}`) e șablonul: panoul arată „Pe această plăcuță” cu
 * câmpul lui; o valoare scrisă face literele plăcuței (fontul adus la cerere), iar lista o numește după textul ei. Copiile
 * («Încă…») își iau valorile lor; editarea textului șablonului le reface pe toate într-un pas; «Desprinde» o coace într-o
 * piesă a ei (textul ei obișnuit); Ctrl+Z o pune la loc. Documentul salvat (v23) ține valorile și literele fiecărei plăcuțe.
 */
import { test, expect, type Page } from '@playwright/test';
import { ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

type Nod = { tip: 'element' | 'grup'; id: string; copii?: Nod[]; text?: { continut: string } };
type Inst = { id: string; piesa: string; campuri?: Record<string, string>; texte?: Record<string, { continut: string; copii: Nod[]; operatii: Record<string, string[]> }> };
type Doc = { schema: number; rev: number; piese: Array<{ id: string; radacina: Nod }>; foi: Array<{ instante: Inst[] }> };

/** Ultima versiune salvată în IndexedDB, așteptată până când `gata` o acceptă (ca în `text.spec.ts`). */
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

const instante = (d: Doc): Inst[] => d.foi.flatMap((f) => f.instante);
const texteSalvate = (d: Doc): string[] => instante(d).map((i) => Object.values(i.texte ?? {})[0]?.continut ?? '—');
const lista = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');
const placuta = (page: Page) => page.getByTestId('prop-placuta');
const camp = (page: Page) => placuta(page).locator('[data-camp="placuta-nr"]');

test('plăcuțele: câmpul din textul piesei, valorile pe plăcuță, copiile, editarea șablonului și «Desprinde»', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  // Șablonul: un text cu câmpul {nr}, pus cu unealta Text.
  await page.locator('[data-unealta="text"]').click();
  await page.locator('[data-text="continut"]').fill('Masa {nr}');
  const la = await ecran(page, await vedere(page));
  const a = la(180, 60);
  await page.mouse.click(a.x, a.y);
  await page.click('[data-text="adauga"]');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-unealta="selectie"]')).toHaveAttribute('aria-pressed', 'true');
  await lista(page).first().click();
  // Panoul: câmpul șablonului, gol (exemplul arată câmpul), cu nota.
  await expect(placuta(page)).toBeVisible();
  await expect(placuta(page)).toContainText('Pe această plăcuță');
  await expect(placuta(page)).toContainText('{nr}');
  await expect(camp(page)).toHaveValue('');
  await expect(camp(page)).toHaveAttribute('placeholder', '{nr}');
  // Șablonul pus o dată, fără valori: nimic de desprins.
  await expect(page.getByTestId('prop-piesa').locator('[data-buton="desprinde"]')).toHaveCount(0);
  // O valoare: literele plăcuței, scrise în document (v23; documentul de azi e v24, ADR 0174), iar lista o numește după textul ei.
  await camp(page).fill('7');
  await camp(page).press('Enter');
  const d1 = await salvat(page, (d) => texteSalvate(d)[0] === 'Masa 7');
  expect(d1.schema).toBe(24);
  expect(instante(d1)[0]!.campuri).toEqual({ nr: '7' });
  const t1 = Object.values(instante(d1)[0]!.texte!)[0]!;
  expect(t1.copii.map((g) => g.id)).toEqual(['t1-l1', 't1-l2', 't1-l3', 't1-l4', 't1-l5']);
  expect(Object.values(t1.operatii).flat().length).toBeGreaterThan(0);
  await expect(lista(page)).toHaveText(['Masa 7']);
  await expect(camp(page)).toHaveValue('7');
  await expect(page.getByTestId('placuta-face')).toHaveCount(0);
  // O plăcuță se desprinde și singură (își coace literele).
  await expect(page.getByTestId('prop-piesa').locator('[data-buton="desprinde"]')).toHaveCount(1);
  // «Încă…»: încă două plăcuțe (cu aceleași valori); a doua primește 8.
  await page.getByTestId('prop-piesa').locator('[data-buton="inca"]').click();
  await page.locator('[data-camp="inca-total"]').fill('3');
  await page.locator('[data-buton="inca-adauga"]').click();
  await expect(lista(page)).toHaveCount(3);
  await lista(page).nth(1).click();
  await expect(camp(page)).toHaveValue('7');
  await camp(page).fill('8');
  await camp(page).press('Enter');
  await salvat(page, (d) => texteSalvate(d).join('|') === 'Masa 7|Masa 8|Masa 7');
  await expect(lista(page)).toHaveText(['Masa 7 (1 din 3)', 'Masa 8 (2 din 3)', 'Masa 7 (3 din 3)']);
  // Editarea textului șablonului (unealta Text, pe o plăcuță): panoul spune câte plăcuțe se refac; Aplică le reface pe toate.
  await page.locator('[data-unealta="text"]').click();
  await lista(page).nth(1).click();
  await expect(page.locator('[data-text="continut"]')).toHaveValue('Masa {nr}');
  await expect(page.getByTestId('text-placute')).toHaveText('Șablonul are 3 plăcuțe: «Aplică» le reface literele.');
  await page.locator('[data-text="continut"]').fill('Sala {nr}');
  await page.click('[data-text="aplica"]');
  await salvat(page, (d) => texteSalvate(d).join('|') === 'Sala 7|Sala 8|Sala 7');
  await expect(lista(page)).toHaveText(['Sala 7 (1 din 3)', 'Sala 8 (2 din 3)', 'Sala 7 (3 din 3)']);
  await page.keyboard.press('Escape');
  // «Desprinde» pe a doua: o piesă a ei, cu textul ei obișnuit; celelalte rămân plăcuțe ale șablonului.
  await lista(page).nth(1).click();
  await page.getByTestId('prop-piesa').locator('[data-buton="desprinde"]').click();
  const d4 = await salvat(page, (d) => texteSalvate(d).join('|') === 'Sala 7|—|Sala 7');
  const a2 = instante(d4)[1]!;
  expect(d4.piese.find((p) => p.id === a2.piesa)!.radacina.text?.continut).toBe('Sala 8');
  await expect(lista(page)).toHaveText(['Sala 7 (1 din 2)', 'Sala 8', 'Sala 7 (2 din 2)']);
  // Desprinsă, nu mai e plăcuță: panoul n-are câmpuri.
  await expect(placuta(page)).toHaveCount(0);
  // Ctrl+Z: plăcuța la loc.
  await page.keyboard.press('Control+z');
  await salvat(page, (d) => texteSalvate(d).join('|') === 'Sala 7|Sala 8|Sala 7');
  expect(erori).toEqual([]);
});
