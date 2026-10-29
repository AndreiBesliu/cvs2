import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ecran, vedere } from './ajutor-panza.ts';

/**
 * Fonturile omului (ADR 0106), în Edge: încărcarea unei colecții TTC prin fereastra fonturilor (două fețe), textul scris
 * cu una dintre ele (id-ul cu amprenta și fața, numele în bloc), previzualizarea, fontul ținut după reîncărcare, ștergerea
 * lui (textul rămâne, panoul spune că fontul lipsește); fonturile sistemului printr-un `queryLocalFonts` de probă (cu
 * permisiunea cerută din clic, instanța unui font variabil refuzată); refuzurile (WOFF2, un fișier care nu e font) și
 * Google Fonts fără server (instanța locală).
 */

test.use({ locale: 'ro-RO' });

const RAD = new URL('../../', import.meta.url);
const fisier = (cale: string): Buffer => readFileSync(new URL(cale, RAD));

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
type Nod = { tip: 'element' | 'grup'; id: string; nume?: string; copii?: Nod[]; text?: Record<string, unknown>; forma?: { varfuri: Array<{ p: P }> } };
type Doc = { rev: number; piese: Array<{ id: string; nume: string; radacina: Nod }>; foi: Array<{ instante: Array<{ id: string; piesa: string; x: number; y: number }> }> };

/** Unealta Text, ancora la (x, y) mm pe foaie și textul scris. */
async function textNou(page: Page, continut: string, x = 180, y = 60): Promise<void> {
  await page.locator('[data-unealta="text"]').click();
  await expect(page.getByTestId('panou-text')).toBeVisible();
  await page.locator('[data-text="continut"]').fill(continut);
  const la = await ecran(page, await vedere(page));
  const a = la(x, y);
  await page.mouse.click(a.x, a.y);
  await expect(page.getByTestId('ancora-text')).toBeVisible();
}

test('o colecție TTC încărcată în Fonturile mele: textul cu fața a doua, după reîncărcare tot editabil; șters, fontul lipsește', async ({ page }) => {
  await page.goto('/');
  await textNou(page, 'LEMN');
  await expect(page.getByTestId('text-previzualizare')).toBeVisible();
  await page.click('[data-text="fonturi"]');
  const dialog = page.getByTestId('dialog-fonturi');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('fonturi-mele')).toContainText('Niciun font încă');
  const ttc = fisier('test/fixtures/text/roboto-droid.ttc');
  await dialog.locator('[data-camp="fisiere-fonturi"]').setInputFiles({ name: 'roboto-droid.ttc', mimeType: 'font/collection', buffer: ttc });
  await expect(dialog.getByTestId('fonturi-rezultat')).toContainText('2 fonturi adăugate în Fonturile mele: Roboto Regular, Droid Serif');
  const amprenta = createHash('sha256').update(ttc).digest('hex').slice(0, 16);
  await expect(dialog.locator('li[data-font]')).toHaveCount(2);
  // Prima față adăugată e aleasă în panou; „Folosește” alege a doua.
  await expect(page.locator('select[data-text="font"]')).toHaveValue(`f:${amprenta}`);
  await dialog.locator(`li[data-font="f:${amprenta}.1"] [data-buton="foloseste-font"]`).click();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('panou-text')).toBeVisible();
  await expect(page.locator('select[data-text="font"]')).toHaveValue(`f:${amprenta}.1`);
  await expect(page.locator('select[data-text="font"] optgroup[label="Fonturile mele"] option')).toHaveText(['Droid Serif', 'Roboto Regular']);
  await page.click('[data-text="adauga"]');
  const d1 = await documentSalvat(page, 1) as Doc;
  expect(d1.piese[0]!.radacina.text).toMatchObject({ continut: 'LEMN', font: `f:${amprenta}.1`, numeFont: 'Droid Serif', inaltime: 20 });
  // Droid Serif, nu Roboto: N cu serife are 4+ vârfuri pe linia de bază, iar majuscula lui e 20 mm.
  const n = d1.piese[0]!.radacina.copii![3]!;
  const ys = (n.copii ?? []).flatMap((e) => (e.forma?.varfuri ?? []).map((v) => v.p.y));
  expect(Math.max(...ys)).toBeCloseTo(20, 9);

  // După reîncărcare, biblioteca e tot acolo: textul se alege și se aplică cu același font.
  await page.reload();
  await page.locator('[data-unealta="text"]').click();
  const la = await ecran(page, await vedere(page));
  const inst = d1.foi[0]!.instante[0]!;
  const varfL = d1.piese[0]!.radacina.copii![0]!.copii![0]!.forma!.varfuri[0]!.p;
  const pe = la(inst.x + varfL.x, inst.y + varfL.y);
  await page.mouse.click(pe.x, pe.y);
  await expect(page.getByTestId('text-stare')).toContainText('Editezi textul ales');
  await expect(page.locator('select[data-text="font"]')).toHaveValue(`f:${amprenta}.1`);
  await page.locator('[data-text="inaltime"]').fill('25');
  await page.click('[data-text="aplica"]');
  const d2 = await documentSalvat(page, 2) as Doc;
  expect(d2.piese[0]!.radacina.text).toMatchObject({ font: `f:${amprenta}.1`, inaltime: 25 });

  // Șters din Fonturile mele: textul rămâne, panoul spune că fontul lipsește și Aplică se oprește.
  await page.click('[data-text="fonturi"]');
  await page.getByTestId('dialog-fonturi').locator(`li[data-font="f:${amprenta}.1"] [data-buton="sterge-font"]`).click();
  await expect(page.getByTestId('dialog-fonturi').locator('li[data-font]')).toHaveCount(1);
  await page.click('[data-buton="inchide-fonturi"]');
  await expect(page.getByTestId('text-motiv')).toHaveText('Fontul „Droid Serif” nu e pe calculatorul ăsta: încarcă-l (Fonturi…) ca să editezi textul; contururile lui rămân.');
  await expect(page.locator('select[data-text="font"]')).toHaveValue(`f:${amprenta}.1`);
  await expect(page.locator('select[data-text="font"] option:checked')).toHaveText('Droid Serif (lipsește aici)');
  await expect(page.locator('[data-text="aplica"]')).toBeDisabled();
});

test('fonturile sistemului (un queryLocalFonts de probă): permisiunea din clic, lista în panou, instanța variabilă refuzată', async ({ page }) => {
  const droid = fisier('public/fonturi/droid-serif.ttf').toString('base64');
  const variabil = fisier('test/fixtures/text/roboto-fvar.ttf').toString('base64');
  await page.addInitScript(([droid, variabil]) => {
    const blob = (b64: string): Blob => new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))]);
    let permis = false;
    const fonturi = [
      { postscriptName: 'DroidSerif', fullName: 'Droid Serif', family: 'Droid Serif', style: 'Regular', blob: async () => blob(droid) },
      { postscriptName: 'Roboto-Regular', fullName: 'Roboto Regular', family: 'Roboto', style: 'Regular', blob: async () => blob(variabil) },
      { postscriptName: 'Roboto-Bold', fullName: 'Roboto Bold', family: 'Roboto', style: 'Bold', blob: async () => blob(variabil) },
    ];
    (window as unknown as { queryLocalFonts: unknown }).queryLocalFonts = async (o?: { postscriptNames?: string[] }) => {
      permis = true;
      return o?.postscriptNames ? fonturi.filter((f) => o.postscriptNames!.includes(f.postscriptName)) : fonturi;
    };
    const cere = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = ((d: PermissionDescriptor) => ((d as { name: string }).name === 'local-fonts'
      ? Promise.resolve({ state: permis ? 'granted' : 'prompt' } as PermissionStatus)
      : cere(d))) as typeof navigator.permissions.query;
  }, [droid, variabil] as const);
  await page.goto('/');
  await textNou(page, 'Ușă', 200, 40);
  await expect(page.locator('select[data-text="font"] optgroup[label="Ale sistemului"]')).toHaveCount(0);
  await page.click('[data-text="fonturi"]');
  const dialog = page.getByTestId('dialog-fonturi');
  await dialog.locator('[data-fila-fonturi="sistem"]').click();
  await dialog.locator('[data-buton="permite-sistem"]').click();
  await expect(dialog.getByTestId('sistem-stare')).toHaveText('3 fonturi ale sistemului sunt în lista din panou.');
  await page.click('[data-buton="inchide-fonturi"]');
  await expect(page.locator('select[data-text="font"] optgroup[label="Ale sistemului"] option')).toHaveText(['Droid Serif', 'Roboto Bold', 'Roboto Regular']);
  // Instanța Bold a fontului variabil: refuzată (contururile ar fi ale lui Regular).
  await page.locator('select[data-text="font"]').selectOption('s:Roboto-Bold');
  await expect(page.getByTestId('text-motiv')).toHaveText('„Bold” e o instanță a unui font variabil: deocamdată se citește doar instanța lui implicită. Alege alt stil.');
  await expect(page.locator('[data-text="adauga"]')).toBeDisabled();
  await page.locator('select[data-text="font"]').selectOption('s:Roboto-Regular');
  await expect(page.getByTestId('text-motiv')).toHaveCount(0);
  await page.locator('select[data-text="font"]').selectOption('s:DroidSerif');
  await expect(page.getByTestId('text-previzualizare')).toBeVisible();
  await page.click('[data-text="adauga"]');
  const d = await documentSalvat(page, 1) as Doc;
  expect(d.piese[0]!.radacina.text).toMatchObject({ continut: 'Ușă', font: 's:DroidSerif', numeFont: 'Droid Serif' });
});

test('refuzurile din Fonturile mele (WOFF2, un fișier care nu e font) și Google Fonts fără server, pe instanța locală', async ({ page }) => {
  await page.goto('/');
  await textNou(page, 'A');
  await page.click('[data-text="fonturi"]');
  const dialog = page.getByTestId('dialog-fonturi');
  const woff2 = Buffer.alloc(64);
  woff2.write('wOF2', 0, 'latin1');
  await dialog.locator('[data-camp="fisiere-fonturi"]').setInputFiles([
    { name: 'web.woff2', mimeType: 'font/woff2', buffer: woff2 },
    { name: 'poza.png', mimeType: 'image/png', buffer: Buffer.from('nu e un font') },
    { name: 'roboto.woff', mimeType: 'font/woff', buffer: fisier('test/fixtures/text/roboto.woff') },
  ]);
  const rezultat = dialog.getByTestId('fonturi-rezultat');
  await expect(rezultat).toContainText('Adăugat în Fonturile mele: Roboto Regular');
  await expect(rezultat).toContainText('„web.woff2”: WOFF2 nu se citește încă: încarcă fontul ca TTF sau OTF.');
  await expect(rezultat).toContainText('„poza.png”: Fișierul nu e un font (TTF, OTF, TTC sau WOFF).');
  // Același font încărcat din nou: e deja acolo.
  await dialog.locator('[data-camp="fisiere-fonturi"]').setInputFiles({ name: 'roboto.woff', mimeType: 'font/woff', buffer: fisier('test/fixtures/text/roboto.woff') });
  await expect(rezultat).toContainText('Erau deja în Fonturile mele: Roboto Regular');
  await expect(rezultat).not.toContainText('Adăugat');
  await expect(dialog.locator('li[data-font]')).toHaveCount(1);
  await dialog.locator('[data-fila-fonturi="google"]').click();
  await expect(dialog.getByTestId('google-motiv')).toHaveText('Google Fonts merge pe aplicația publicată (aici n-are legătură cu serverul).');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('panou-text')).toBeVisible();
});
