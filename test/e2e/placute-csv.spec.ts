/**
 * Felia 11.4↑b (ADR 0210 §4, planșa 4 a schiței): «Din CSV…». Pe un text fără câmp: celulele lipite din Excel (tab, găsit
 * singur), antetul, previzualizarea; „Fă din textul ales câmpul {Nume}” scrie acoladele în textul piesei; câmpul se
 * potrivește singur cu coloana „Nume”; „Fă 3 plăcuțe” face plăcuțele, așezate pe foaie, într-un pas (Ctrl+Z le scoate). Apoi
 * un fișier Windows-1250 cu `;` (Excel în română): codarea și separatorul găsite singure, numerotarea pe alt câmp.
 */
import { test, expect, type Page } from '@playwright/test';
import { ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

type Inst = { id: string; piesa: string; x: number; y: number; campuri?: Record<string, string>; texte?: Record<string, { continut: string }> };
type Doc = { piese: Array<{ id: string; radacina: { text?: { continut: string } } }>; foi: Array<{ instante: Inst[] }> };

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

const instante = (d: Doc): Inst[] => d.foi.flatMap((f) => f.instante);
const texte = (d: Doc): string[] => instante(d).map((i) => Object.values(i.texte ?? {})[0]?.continut ?? '—');
const lista = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');
const dialog = (page: Page) => page.getByTestId('dialog-csv');

/** Un text pus cu unealta Text și ales (unealta Selecție înapoi). */
async function text(page: Page, continut: string): Promise<void> {
  await page.locator('[data-unealta="text"]').click();
  await page.locator('[data-text="continut"]').fill(continut);
  const la = await ecran(page, await vedere(page));
  const a = la(180, 60);
  await page.mouse.click(a.x, a.y);
  await page.click('[data-text="adauga"]');
  await page.keyboard.press('Escape');
  await lista(page).first().click();
}

test('«Din CSV…» pe un text fără câmp: celulele lipite, „Fă din textul ales câmpul {Nume}”, trei plăcuțe într-un pas', async ({ page }) => {
  const erori: string[] = [];
  page.on('pageerror', (e) => { erori.push(e.message); });
  await page.goto('/');
  await text(page, 'Ana Popescu');
  // Fără câmp, panoul n-are „Pe această plăcuță”, dar piesa are «Din CSV…».
  await expect(page.getByTestId('prop-placuta')).toHaveCount(0);
  await page.getByTestId('prop-piesa').locator('[data-buton="din-csv"]').click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).locator('h2')).toHaveText('Din CSV (plăcuța „Ana Popescu”)');
  // Celulele lipite din Excel vin cu tab: separatorul găsit singur, antetul, previzualizarea.
  await dialog(page).locator('[data-camp="csv-lipire"]').fill('Nume\tMasa\nAna Popescu\t1\nMihai Ionescu\t1\nElena Dumitrescu\t2\n');
  await expect(page.getByTestId('csv-sursa')).toHaveText('Celulele lipite · 3 rânduri');
  await expect(dialog(page).locator('[data-camp="csv-separator"]')).toHaveValue('\t');
  await expect(page.getByTestId('csv-tabel').locator('th')).toHaveText(['#', 'Nume', 'Masa']);
  await expect(page.getByTestId('csv-tabel').locator('tbody tr')).toHaveCount(3);
  // Fără câmp, „Fă plăcuțele” e oprit; „Fă din textul ales câmpul {Nume}” pe tot textul.
  await expect(dialog(page).locator('[data-buton="csv-fa"]')).toBeDisabled();
  const t = dialog(page).locator('[data-camp="csv-text"]');
  await t.focus();
  await page.keyboard.press('Control+a');
  await expect(dialog(page).locator('[data-buton="csv-fa-camp"]')).toHaveText('Fă din textul ales câmpul {Nume}');
  await dialog(page).locator('[data-buton="csv-fa-camp"]').click();
  await expect(t).toHaveValue('{Nume}');
  // Câmpul se potrivește singur cu coloana „Nume”.
  await expect(dialog(page).locator('[data-camp="csv-sursa-Nume"]')).toHaveValue('c:0');
  await expect(dialog(page).locator('[data-camp-csv="Nume"]')).toContainText('potrivit singur');
  await expect(page.getByTestId('csv-unde')).toContainText('3 plăcuțe pe o foaie. Marginea 10, distanța 6 mm.');
  await expect(dialog(page).locator('[data-buton="csv-fa"]')).toHaveText('Fă 3 plăcuțe');
  await dialog(page).locator('[data-buton="csv-fa"]').click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByTestId('placuta-csv')).toContainText('3 plăcuțe pe o foaie.');
  const d = await salvat(page, (x) => texte(x).join('|') === 'Ana Popescu|Mihai Ionescu|Elena Dumitrescu');
  expect(d.piese).toHaveLength(1);
  expect(d.piese[0]!.radacina.text?.continut).toBe('{Nume}');
  expect(instante(d).map((i) => i.campuri)).toEqual([{ Nume: 'Ana Popescu' }, { Nume: 'Mihai Ionescu' }, { Nume: 'Elena Dumitrescu' }]);
  // Așezate pe foaie: locuri diferite (nu una peste alta).
  expect(new Set(instante(d).map((i) => `${i.x},${i.y}`)).size).toBe(3);
  await expect(lista(page)).toHaveText(['Ana Popescu (1 din 3)', 'Mihai Ionescu (2 din 3)', 'Elena Dumitrescu (3 din 3)']);
  // Un singur pas de anulare pentru plăcuțe: Ctrl+Z lasă textul cu câmpul, pe o singură instanță.
  await page.locator('body').press('Control+z');
  await salvat(page, (x) => instante(x).length === 1 && x.piese[0]?.radacina.text?.continut === '{Nume}');
  expect(erori).toEqual([]);
});

test('«Din CSV…» dintr-un fișier Windows-1250 cu ; (Excel în română): codarea și separatorul găsite singure; numerotarea', async ({ page }) => {
  await page.goto('/');
  await text(page, 'Masa {nr}');
  await page.getByTestId('prop-piesa').locator('[data-buton="din-csv"]').click();
  // „Nume;Loc / Ştefan;A / Ţăran;B”, în Windows-1250 (Ş = 0xAA, Ţ = 0xDE, ă = 0xE3).
  const octeti = Buffer.from([
    ...Buffer.from('Nume;Loc\r\n'), 0xaa, ...Buffer.from('tefan;A\r\n'), 0xde, 0xe3, ...Buffer.from('ran;B\r\n'),
  ]);
  await dialog(page).locator('[data-camp="csv-fisier"]').setInputFiles({ name: 'invitati.csv', mimeType: 'text/csv', buffer: octeti });
  await expect(page.getByTestId('csv-sursa')).toHaveText('Fișierul invitati.csv · 2 rânduri');
  await expect(dialog(page).locator('[data-camp="csv-codare"]')).toHaveValue('windows-1250');
  await expect(dialog(page).locator('[data-camp="csv-separator"]')).toHaveValue(';');
  await expect(page.getByTestId('csv-tabel').locator('tbody tr').first()).toContainText('Ştefan');
  // {nr} n-are coloana lui: ia prima coloană rămasă; aici, numerotarea de la 7.
  await dialog(page).locator('[data-camp="csv-sursa-nr"]').selectOption('numar');
  await dialog(page).locator('[data-camp="csv-start-nr"]').fill('7');
  await dialog(page).locator('[data-buton="csv-fa"]').click();
  await expect(dialog(page)).toHaveCount(0);
  await salvat(page, (x) => texte(x).join('|') === 'Masa 7|Masa 8');
});
