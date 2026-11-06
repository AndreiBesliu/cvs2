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
/** Un cerc pus cu unealta Cerc: elementul cu raza, mutat de matricea lui (rădăcina sau primul copil). */
type Cerc = { tip: 'element' | 'grup'; copii?: Cerc[]; forma: unknown; matrice: { e: number; f: number } };
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

  // Ctrl+Z, cu focusul pe pânză: textul de dinainte, iar panoul îl arată. Clicul, pe marginea liberă din stânga (colțul de sus
  // e sub meniul global, ADR 0132).
  await page.locator('[data-unealta="selectie"]').click();
  await page.getByTestId('panza').click({ position: { x: 5, y: 300 } });
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

test('aldinul și cursivul (ADR 0123): H de 20 mm îngroșat cu 0,6 are tot 20 mm, din linii și arce; după reîncărcare, panoul le are; oprite, Aplică', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-unealta="text"]').click();
  await page.locator('[data-text="continut"]').fill('HI');
  // Bifat, aldinul propune 3 % din înălțime (0,6 mm la 20 mm), cursivul 12°.
  await expect(page.locator('[data-text="grosime"]')).toHaveCount(0);
  await page.locator('[data-text="aldin"]').check();
  await expect(page.locator('[data-text="grosime"]')).toHaveValue('0.6');
  await page.locator('[data-text="cursiv"]').check();
  await expect(page.locator('[data-text="unghi"]')).toHaveValue('12');
  // Peste o cincime din înălțime, refuzat cu motiv; la fel o înclinare peste 45°.
  await page.locator('[data-text="grosime"]').fill('4,5');
  await expect(page.getByTestId('text-motiv')).toHaveText('Îngroșarea e un număr de la 0,01 mm până la o cincime din înălțimea majusculelor.');
  await page.locator('[data-text="grosime"]').fill('0,6');
  await page.locator('[data-text="unghi"]').fill('50');
  await expect(page.getByTestId('text-motiv')).toHaveText('Înclinarea e un număr între −45° și 45°.');
  await page.locator('[data-text="unghi"]').fill('12');
  const v = await vedere(page);
  const la = await ecran(page, v);
  const a = la(180, 60);
  await page.mouse.click(a.x, a.y);
  await expect(page.locator('[data-text="adauga"]')).toBeEnabled();
  await page.click('[data-text="adauga"]');
  const d1 = await documentSalvat(page, 1) as Doc;
  const piesa = d1.piese[0]!;
  expect(piesa.radacina.text).toMatchObject({ continut: 'HI', font: 'roboto', inaltime: 20, aldin: 0.6, cursiv: 12 });
  const h = piesa.radacina.copii![0]!;
  expect(h.nume).toBe('H');
  const n = ordonate(h);
  expect(Math.min(...n)).toBeCloseTo(0, 9);
  expect(Math.max(...n)).toBeCloseTo(20, 9);
  // Literele îngroșate sunt linii și arce (colțurile de afară, rotunjite), fără cubice.
  expect(new Set(h.copii!.flatMap((e) => e.forma!.varfuri.map((q) => q.s.tip)))).toEqual(new Set(['L', 'A']));

  // După reîncărcare, textul ales își aduce aldinul și cursivul în panou.
  await page.reload();
  await page.locator('[data-unealta="text"]').click();
  const v2 = await vedere(page);
  const la2 = await ecran(page, v2);
  const inst = d1.foi[0]!.instante[0]!;
  const varf = h.copii![0]!.forma!.varfuri[0]!.p;
  const pe = la2(inst.x + varf.x, inst.y + varf.y);
  await page.mouse.click(pe.x, pe.y);
  await expect(page.getByTestId('text-stare')).toContainText('Editezi textul ales');
  await expect(page.locator('[data-text="aldin"]')).toBeChecked();
  await expect(page.locator('[data-text="grosime"]')).toHaveValue('0.6');
  await expect(page.locator('[data-text="cursiv"]')).toBeChecked();
  await expect(page.locator('[data-text="unghi"]')).toHaveValue('12');

  // Oprite amândouă, Aplică: blocul fără ele, H drept, din linii, tot de 20 mm.
  await page.locator('[data-text="aldin"]').uncheck();
  await page.locator('[data-text="cursiv"]').uncheck();
  await page.click('[data-text="aplica"]');
  const d2 = await documentSalvat(page, 2) as Doc;
  const text = d2.piese[0]!.radacina.text!;
  expect(text).toMatchObject({ continut: 'HI', inaltime: 20 });
  expect('aldin' in text || 'cursiv' in text).toBe(false);
  const h2 = d2.piese[0]!.radacina.copii![0]!;
  expect(new Set(h2.copii!.flatMap((e) => e.forma!.varfuri.map((q) => q.s.tip)))).toEqual(new Set(['L']));
  const n2 = ordonate(h2);
  expect(Math.max(...n2) - Math.min(...n2)).toBeCloseTo(20, 9);
});

test('fontul cu o singură linie (ADR 0140): Relief SingleLine, Aldin oprit cu motivul, trăsăturile deschise, gravate pe linie', async ({ page }) => {
  await page.goto('/');
  // O foaie de 1,2 mm: gravura trăsăturilor are jumătate din grosime (0,6 mm), ca liniile deschise importate.
  const grosime = page.locator('[data-camp="foaie-grosime"]');
  await grosime.fill('1.2');
  await grosime.press('Enter');
  await documentSalvat(page, 1);
  await page.locator('[data-unealta="text"]').click();
  await page.locator('[data-text="continut"]').fill('HI');
  await page.locator('[data-text="aldin"]').check();
  await page.locator('select[data-text="font"]').selectOption('relief-singleline');
  // Fontul se recunoaște singur: Aldin se oprește, cu motivul; previzualizarea desenează trăsăturile cu linia.
  await expect(page.getByTestId('text-linie')).toHaveText('Font cu o singură linie: literele sunt trăsături, gravate pe linie, deci nu se îngroașă.');
  await expect(page.locator('[data-text="aldin"]')).toBeDisabled();
  await expect(page.locator('[data-text="aldin"]')).not.toBeChecked();
  await expect(page.locator('[data-testid="text-previzualizare"] path.trasaturi')).toHaveCount(1);
  const v = await vedere(page);
  const la = await ecran(page, v);
  const a = la(180, 60);
  await page.mouse.click(a.x, a.y);
  await page.click('[data-text="adauga"]');
  const d1 = await documentSalvat(page, 2) as Doc & { piese: Array<{ operatii: Array<{ latura: string; adancime: number; noduri: string[] }> }> };
  const piesa = d1.piese[0]!;
  expect(piesa.radacina.text).toMatchObject({ continut: 'HI', font: 'relief-singleline', inaltime: 20 });
  expect('aldin' in piesa.radacina.text!).toBe(false);
  // H: trei linii deschise, de la 0 la 20 mm; I: linia lui și trăsătura de 2 unități din vârf.
  const h = piesa.radacina.copii![0]!;
  expect(h.copii!.map((e) => (e.forma as { inchis?: boolean }).inchis)).toEqual([false, false, false]);
  expect(Math.min(...ordonate(h))).toBeCloseTo(0, 9);
  expect(Math.max(...ordonate(h))).toBeCloseTo(20, 9);
  expect(piesa.operatii.map((o) => [o.latura, o.adancime, o.noduri.length])).toEqual([['pe-linie', 0.6, 5]]);
});

/** Abscisele vârfurilor literei (fără mânere: literele drepte n-au cubice). */
const abscise = (g: Nod): number[] => (g.copii ?? []).flatMap((e) => (e.forma?.varfuri ?? []).map((v) => v.p.x));

test('textul vertical (ADR 0141): „HIT” cu literele una sub alta, pasul de un em, centrate pe axă; după reîncărcare, vertical, Jos și Aplică', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-unealta="text"]').click();
  await page.locator('[data-text="continut"]').fill('HIT');
  await expect(page.locator('[data-text-aliniere]')).toHaveText(['Stânga', 'Centru', 'Dreapta']);
  await page.locator('[data-text="vertical"]').check();
  // Pe verticală, alinierea e față de ancoră în sus și în jos, iar rândurile sunt coloane.
  await expect(page.locator('[data-text-aliniere]')).toHaveText(['Sus', 'Mijloc', 'Jos']);
  await expect(page.locator('label:has([data-text="interlinie"]) > span')).toHaveText('Distanța dintre coloane (× rândul fontului)');
  const la = await ecran(page, await vedere(page));
  const a = la(150, 150);
  await page.mouse.click(a.x, a.y);
  await page.click('[data-text="adauga"]');
  const d1 = await documentSalvat(page, 1) as Doc;
  const piesa = d1.piese[0]!;
  expect(piesa.radacina.text).toMatchObject({ continut: 'HIT', font: 'roboto', inaltime: 20, aliniere: 'stanga', vertical: true });
  // H, I, T una sub alta: vârful lui H în ancoră (Sus), iar între două majuscule pasul e un em (2048 / 1456 · 20 mm).
  const em = (2048 * 20) / 1456;
  const [h, i, t] = piesa.radacina.copii!;
  expect([h!.nume, i!.nume, t!.nume]).toEqual(['H', 'I', 'T']);
  expect(Math.max(...ordonate(h!))).toBeCloseTo(0, 9);
  expect(Math.min(...ordonate(h!))).toBeCloseTo(-20, 9);
  expect(Math.max(...ordonate(i!))).toBeCloseTo(-em, 9);
  expect(Math.max(...ordonate(t!))).toBeCloseTo(-2 * em, 9);
  // Fiecare literă, centrată pe axa coloanei (x = 0, ancora): H, cu picioarele de la 169 la 1288 unități, pe ±559,5.
  expect(Math.min(...abscise(h!))).toBeCloseTo((-559.5 * 20) / 1456, 9);
  expect(Math.max(...abscise(h!))).toBeCloseTo((559.5 * 20) / 1456, 9);
  for (const g of [i!, t!]) expect(Math.min(...abscise(g)) + Math.max(...abscise(g))).toBeCloseTo(0, 9);

  // După reîncărcare, textul ales vine vertical în panou (din blocul lui: bifa oprită înainte, pentru un text nou, se
  // pornește); Jos îl pune cu baza lui T în ancoră.
  await page.reload();
  await page.locator('[data-unealta="text"]').click();
  await page.locator('[data-text="vertical"]').uncheck();
  await expect(page.locator('[data-text-aliniere]')).toHaveText(['Stânga', 'Centru', 'Dreapta']);
  const la2 = await ecran(page, await vedere(page));
  const inst = d1.foi[0]!.instante[0]!;
  const varf = h!.copii![0]!.forma!.varfuri[0]!.p;
  const pe = la2(inst.x + varf.x, inst.y + varf.y);
  await page.mouse.click(pe.x, pe.y);
  await expect(page.getByTestId('text-stare')).toContainText('Editezi textul ales');
  await expect(page.locator('[data-text="vertical"]')).toBeChecked();
  await expect(page.locator('[data-text-aliniere]')).toHaveText(['Sus', 'Mijloc', 'Jos']);
  await page.locator('[data-text-aliniere="dreapta"]').click();
  await page.click('[data-text="aplica"]');
  const d2 = await documentSalvat(page, 2) as Doc;
  expect(d2.piese[0]!.radacina.text).toMatchObject({ continut: 'HIT', aliniere: 'dreapta', vertical: true });
  const [h2, , t2] = d2.piese[0]!.radacina.copii!;
  expect(Math.min(...ordonate(t2!))).toBeCloseTo(0, 9);
  expect(Math.max(...ordonate(h2!))).toBeCloseTo(20 + 2 * em, 9);
});

test('textul vertical stă drept (ADR 0141): pe conturul unui cerc, panoul spune că nu urmează curba; oprit, curba revine; blocul, fără curbă', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-unealta="cerc"]').click();
  await page.locator('[data-editare="raza"]').fill('50');
  let la = await ecran(page, await vedere(page));
  const c = la(150, 100);
  await page.mouse.click(c.x, c.y);
  const d1 = await documentSalvat(page, 1) as Doc;
  const ic = d1.foi[0]!.instante[0]!;
  const rc = d1.piese[0]!.radacina as unknown as Cerc;
  const el = rc.tip === 'element' ? rc : rc.copii![0]!;
  const cx = ic.x + el.matrice.e, cy = ic.y + el.matrice.f;
  await page.locator('[data-unealta="text"]').click();
  await page.locator('[data-text="continut"]').fill('BAR');
  await page.locator('[data-text="vertical"]').check();
  la = await ecran(page, await vedere(page));
  const sus = la(cx, cy + 50);
  await page.mouse.click(sus.x, sus.y);
  await expect(page.getByTestId('text-vertical-curba')).toHaveText('Textul vertical stă drept: nu urmează curba.');
  await expect(page.getByTestId('text-curba')).toHaveCount(0);
  // Oprit, textul orizontal urmează iar curba; pornit din nou, stă drept, iar blocul n-are curbă.
  await page.locator('[data-text="vertical"]').uncheck();
  await expect(page.getByTestId('text-curba')).toBeVisible();
  await expect(page.getByTestId('text-vertical-curba')).toHaveCount(0);
  // Un text în casetă (ADR 0142) stă și el drept.
  await page.locator('select[data-text="caseta"]').selectOption('scala');
  await expect(page.getByTestId('text-caseta-curba')).toHaveText('Textul în casetă stă drept: nu urmează curba.');
  await expect(page.getByTestId('text-curba')).toHaveCount(0);
  await page.locator('select[data-text="caseta"]').selectOption('fara');
  await expect(page.getByTestId('text-curba')).toBeVisible();
  await page.locator('[data-text="vertical"]').check();
  await page.click('[data-text="adauga"]');
  const d2 = await documentSalvat(page, 2) as Doc;
  const text = d2.piese[1]!.radacina.text!;
  expect(text).toMatchObject({ continut: 'BAR', vertical: true });
  expect('curba' in text).toBe(false);
  // Din nou pe cerc, orizontal și în casetă: tot drept, iar blocul are caseta, fără curbă.
  await page.locator('[data-text="vertical"]').uncheck();
  la = await ecran(page, await vedere(page));
  await page.mouse.click(sus.x, sus.y);
  await page.locator('select[data-text="caseta"]').selectOption('scala');
  await expect(page.getByTestId('text-caseta-curba')).toBeVisible();
  await page.click('[data-text="adauga"]');
  const d3 = await documentSalvat(page, 3) as Doc;
  const text3 = d3.piese[2]!.radacina.text!;
  expect(text3).toMatchObject({ continut: 'BAR', caseta: { fel: 'scala', latime: 100, inaltime: 50 } });
  expect('curba' in text3 || 'vertical' in text3).toBe(false);
});

test('caseta (ADR 0142): „HHH” scalat la caseta de 100 × 50 are exact 100 mm (majuscula 100 · 1456 / 4039); limitat, cu 50 cerut, la fel; după reîncărcare, caseta revine', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-unealta="text"]').click();
  await page.locator('[data-text="continut"]').fill('HHH');
  await page.locator('select[data-text="caseta"]').selectOption('scala');
  await page.locator('[data-text="caseta-latime"]').fill('100');
  await page.locator('[data-text="caseta-inaltime"]').fill('50');
  // „HHH” are 2 · 1460 + 1288 − 169 = 4039 de unități în lățime: lățimea leagă. Înălțimea o dă caseta: câmpul e oprit.
  const h = (100 * 1456) / 4039;
  await expect(page.locator('[data-text="inaltime"]')).toBeDisabled();
  await expect(page.locator('[data-text="inaltime"]')).toHaveValue('36.05');
  await expect(page.getByTestId('text-caseta')).toHaveText('În casetă: majuscula de 36,05 mm, textul de 100 × 36,05 mm.');
  let la = await ecran(page, await vedere(page));
  const a = la(150, 150);
  await page.mouse.click(a.x, a.y);
  await expect(page.locator('[data-text="adauga"]')).toBeEnabled();
  // Cu 100 mm între litere, textul nu încape nici la cea mai mică înălțime: panoul o spune, iar Adaugă se oprește.
  await page.locator('[data-text="spatiere"]').fill('100');
  await expect(page.getByTestId('text-motiv')).toHaveText('Textul nu încape în casetă nici la cea mai mică înălțime: spațierea sau aldinul trec de ea.');
  await expect(page.locator('[data-text="adauga"]')).toBeDisabled();
  await page.locator('[data-text="spatiere"]').fill('0');
  await expect(page.locator('[data-text="adauga"]')).toBeEnabled();
  await page.click('[data-text="adauga"]');
  const d1 = await documentSalvat(page, 1) as Doc;
  const t1 = d1.piese[0]!.radacina;
  expect(t1.text).toMatchObject({ continut: 'HHH', caseta: { fel: 'scala', latime: 100, inaltime: 50 } });
  expect(t1.text!['inaltime'] as number).toBeCloseTo(h, 9);
  const xs = (t1.copii ?? []).flatMap((g) => abscise(g));
  expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(100, 9);

  // Limitat de casetă, cu 50 cerut: micșorat cât să încapă, și panoul o spune.
  await page.locator('select[data-text="caseta"]').selectOption('limita');
  await expect(page.locator('[data-text="inaltime"]')).toBeEnabled();
  await page.locator('[data-text="inaltime"]').fill('50');
  await expect(page.getByTestId('text-caseta')).toHaveText('Micșorat ca să încapă în casetă: majuscula de 36,05 mm, textul de 100 × 36,05 mm.');
  la = await ecran(page, await vedere(page));
  const b = la(150, 80);
  await page.mouse.click(b.x, b.y);
  await page.click('[data-text="adauga"]');
  const d2 = await documentSalvat(page, 2) as Doc;
  const t2 = d2.piese[1]!;
  expect(t2.radacina.text).toMatchObject({ continut: 'HHH', caseta: { fel: 'limita', latime: 100, inaltime: 50, ceruta: 50 } });
  expect(t2.radacina.text!['inaltime'] as number).toBeCloseTo(h, 9);

  // După reîncărcare, textul ales își aduce caseta: limitat, cu înălțimea cerută (50) în câmp.
  await page.reload();
  await page.locator('[data-unealta="text"]').click();
  await page.locator('select[data-text="caseta"]').selectOption('fara');
  la = await ecran(page, await vedere(page));
  const inst = d2.foi[0]!.instante[1]!;
  const varf = t2.radacina.copii![0]!.copii![0]!.forma!.varfuri[0]!.p;
  const pe = la(inst.x + varf.x, inst.y + varf.y);
  await page.mouse.click(pe.x, pe.y);
  await expect(page.getByTestId('text-stare')).toContainText('Editezi textul ales');
  await expect(page.locator('select[data-text="caseta"]')).toHaveValue('limita');
  await expect(page.locator('[data-text="inaltime"]')).toHaveValue('50');
  await expect(page.locator('[data-text="caseta-latime"]')).toHaveValue('100');
  await expect(page.locator('[data-text="caseta-inaltime"]')).toHaveValue('50');
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
  await expect(page.getByTestId('text-motiv')).toHaveText('Mărimea trebuie să dea majuscule între 0,1 și 1 000 mm.');
  await expect(page.locator('[data-text="adauga"]')).toBeDisabled();
  // Escape închide panoul: unealta Selecție.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('panou-text')).toHaveCount(0);
  await expect(page.locator('[data-unealta="selectie"]')).toHaveAttribute('aria-pressed', 'true');
});

test('textul pe curbă (ADR 0108): clic pe conturul unui cerc R50, „LEMN” urmează cercul pe dinafară; dedesubt; pe linie dreaptă', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-unealta="cerc"]').click();
  await page.locator('[data-editare="raza"]').fill('50');
  let la = await ecran(page, await vedere(page));
  const c = la(150, 100);
  await page.mouse.click(c.x, c.y);
  const d1 = await documentSalvat(page, 1) as Doc;
  // Centrul cercului, din document: cercul n-are centru propriu, îl dă locul instanței (plus mutarea elementului).
  const ic = d1.foi[0]!.instante[0]!;
  const rc = d1.piese[0]!.radacina as unknown as Cerc;
  const el = rc.tip === 'element' ? rc : rc.copii![0]!;
  expect(el.forma).toEqual({ tip: 'cerc', raza: 50 });
  const cx = ic.x + el.matrice.e, cy = ic.y + el.matrice.f;

  await page.locator('[data-unealta="text"]').click();
  await page.locator('[data-text="continut"]').fill('LEMN');
  await page.locator('[data-text="inaltime"]').fill('10');
  la = await ecran(page, await vedere(page));
  const sus = la(cx, cy + 50);
  await page.mouse.click(sus.x, sus.y);
  const sectiune = page.getByTestId('text-curba');
  await expect(sectiune.locator('legend')).toHaveText('Pe curbă (314,16 mm)');
  // Pe un ecran scund, panoul se derulează în zona liberă, fără să-și strângă câmpurile: previzualizarea rămâne cât e
  // (4rem), fără o bară de derulare laterală.
  const panou = page.getByTestId('panou-text');
  await expect.poll(() => page.getByTestId('text-previzualizare').evaluate((e) => e.getBoundingClientRect().height)).toBeGreaterThan(60);
  expect(await panou.evaluate((e) => e.scrollWidth - e.clientWidth)).toBe(0);
  expect(await panou.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
  await page.click('[data-text="adauga"]');
  const d2 = await documentSalvat(page, 2) as Doc;
  const text = d2.piese[1]!;
  const inst = d2.foi[0]!.instante[1]!;
  const curba = text.radacina.text!['curba'] as { inchis: boolean; s: number; pozitie: string; distanta: number; invers: boolean; orientare: string; intinsa: boolean; varfuri: Array<{ p: P }> };
  expect(curba).toMatchObject({ inchis: true, pozitie: 'baza', distanta: 0, invers: false, orientare: 'rotita', intinsa: false });
  // Ancora e pe cerc, sus (la rezoluția unui clic), iar curba e în sistemul piesei: originea e ancora.
  expect(Math.hypot(inst.x - cx, inst.y - cy)).toBeCloseTo(50, 9);
  expect(Math.abs(curba.s - 25 * Math.PI)).toBeLessThan(1);
  expect(curba.varfuri.map((x) => [x.p.x + inst.x - cx, x.p.y + inst.y - cy].map((n) => Math.round(n * 1e6) / 1e6))).toEqual([[50, 0], [-50, 0]]);
  /** Distanțele punctelor literelor (vârfuri și mânere) față de centrul cercului. */
  const raze = (d: Doc): number[] => {
    const p = d.piese[1]!, i = d.foi[0]!.instante[1]!;
    return (p.radacina.copii ?? []).flatMap((g) => (g.copii ?? []).flatMap((e) => (e.forma?.varfuri ?? []).flatMap((v) => [v.p, ...(v.s.c1 && v.s.c2 ? [v.s.c1, v.s.c2] : [])])))
      .map((q) => Math.hypot(q.x + i.x - cx, q.y + i.y - cy));
  };
  // Pe linia de bază, pe dinafară: de la cerc (50) până la vârful majusculelor (60), cu colțurile drepte ale literelor puțin peste.
  let r = raze(d2);
  expect(Math.min(...r)).toBeGreaterThanOrEqual(50 - 1e-6);
  expect(Math.max(...r)).toBeLessThan(60.6);
  expect(Math.max(...r)).toBeGreaterThan(59.9);

  // Dedesubt: vârful majusculelor pe cerc, literele înăuntru.
  await page.locator('select[data-text="pozitie"]').selectOption('dedesubt');
  await page.click('[data-text="aplica"]');
  const d3 = await documentSalvat(page, 3) as Doc;
  expect(d3.piese[1]!.radacina.text!['curba']).toMatchObject({ pozitie: 'dedesubt' });
  r = raze(d3);
  expect(Math.max(...r)).toBeLessThan(50.6);
  expect(Math.min(...r)).toBeGreaterThan(39.4);

  // Pe linie dreaptă: curba pleacă din bloc, textul stă drept din ancoră.
  await page.click('[data-text="drept"]');
  await expect(sectiune.locator('legend')).toHaveText('Pe linie dreaptă (curba rămâne aleasă)');
  await page.click('[data-text="aplica"]');
  const d4 = await documentSalvat(page, 4) as Doc;
  expect(d4.piese[1]!.radacina.text!['curba']).toBeUndefined();
  const ys = (d4.piese[1]!.radacina.copii ?? []).flatMap((g) => (g.copii ?? []).flatMap((e) => (e.forma?.varfuri ?? []).map((v) => v.p.y)));
  expect(Math.min(...ys)).toBeCloseTo(0, 9);
  expect(Math.max(...ys)).toBeCloseTo(10, 9);
});

test('mărimea, proporțiile și crenarea (ADR 0138): 20 mm sunt 79,74 pt, păstrați exact; „LEMN” la 50 % are jumătate din lățime; 72 pt dau 18,06 mm; crenarea oprită, 150 %; după reîncărcare, panoul le are', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-unealta="text"]').click();
  await page.locator('[data-text="continut"]').fill('LEMN');
  // Unitatea: 20 mm de majusculă sunt 79,74 pt cu Roboto; numărul se convertește, iar textul rămâne exact cel de 20 mm.
  const unitate = page.locator('select[data-text="unitate"]');
  await expect(unitate).toBeEnabled();
  await unitate.selectOption('pt');
  await expect(page.locator('[data-text="inaltime"]')).toHaveValue('79.74');
  await expect(page.getByTestId('text-marime')).toHaveText('Majusculele: 20 mm');
  // Înapoi în mm, aceeași majusculă exactă (nu cea din 79,74 pt rotunjite), apoi iar în pt.
  await unitate.selectOption('mm');
  await expect(page.locator('[data-text="inaltime"]')).toHaveValue('20');
  await unitate.selectOption('pt');
  await expect(page.locator('[data-text="inaltime"]')).toHaveValue('79.74');
  await page.locator('[data-text="latime"]').fill('50');
  await expect(page.getByTestId('text-proportii')).toHaveCount(0);
  let la = await ecran(page, await vedere(page));
  const a = la(150, 150);
  await page.mouse.click(a.x, a.y);
  await page.click('[data-text="adauga"]');
  const d1 = await documentSalvat(page, 1) as Doc;
  const t1 = d1.piese[0]!.radacina;
  expect(t1.text).toMatchObject({ continut: 'LEMN', unitate: 'pt', proportii: { latime: 50, inaltime: 100 } });
  expect(t1.text!['inaltime'] as number).toBeCloseTo(20, 12);
  // Același text, la 100 %: de două ori mai lat, cu aceleași majuscule.
  await page.locator('[data-text="latime"]').fill('100');
  la = await ecran(page, await vedere(page));
  const b = la(150, 100);
  await page.mouse.click(b.x, b.y);
  await page.click('[data-text="adauga"]');
  const d2 = await documentSalvat(page, 2) as Doc;
  const t2 = d2.piese[1]!.radacina;
  expect(t2.text!['proportii']).toBeUndefined();
  const lat = (n: Nod): number => { const xs = (n.copii ?? []).flatMap((g) => abscise(g)); return Math.max(...xs) - Math.min(...xs); };
  expect(lat(t1) * 2).toBeCloseTo(lat(t2), 9);
  for (const n of [t1, t2]) expect(Math.max(...(n.copii ?? []).flatMap((g) => ordonate(g)))).toBeCloseTo(20, 9);

  // 72 pt dau 18,0578125 mm; „AV” fără crenare, la 150 % înălțime: majusculele tăiate de 27,09 mm, spuse sub câmpuri.
  await page.locator('[data-text="inaltime"]').fill('72');
  await expect(page.getByTestId('text-marime')).toHaveText('Majusculele: 18,06 mm');
  await page.locator('[data-text="continut"]').fill('AV');
  await page.locator('[data-text="inaltime-litere"]').fill('150');
  await page.locator('[data-text="crenare"]').uncheck();
  await expect(page.getByTestId('text-proportii')).toHaveText('Majusculele tăiate: 27,09 mm');
  la = await ecran(page, await vedere(page));
  const c = la(150, 50);
  await page.mouse.click(c.x, c.y);
  await page.click('[data-text="adauga"]');
  const d3 = await documentSalvat(page, 3) as Doc;
  const t3 = d3.piese[2]!.radacina;
  expect(t3.text).toMatchObject({ continut: 'AV', unitate: 'pt', crenare: false, proportii: { latime: 100, inaltime: 150 } });
  expect(t3.text!['inaltime'] as number).toBeCloseTo(18.0578125, 9);
  expect(Math.max(...(t3.copii ?? []).flatMap((g) => ordonate(g)))).toBeCloseTo(18.0578125 * 1.5, 9);

  // După reîncărcare, textul ales își aduce unitatea, mărimea scrisă, proporțiile și crenarea.
  await page.reload();
  await page.locator('[data-unealta="text"]').click();
  for (const [k, pt, latime, inaltime, crenare] of [[0, '79.74', '50', '100', true], [2, '72', '100', '150', false]] as const) {
    la = await ecran(page, await vedere(page));
    const inst = d3.foi[0]!.instante[k]!;
    const varf = d3.piese[k]!.radacina.copii![0]!.copii![0]!.forma!.varfuri[0]!.p;
    const pe = la(inst.x + varf.x, inst.y + varf.y);
    await page.mouse.click(pe.x, pe.y);
    await expect(page.getByTestId('text-stare')).toContainText('Editezi textul ales');
    await expect(unitate).toHaveValue('pt');
    await expect(page.locator('[data-text="inaltime"]')).toHaveValue(pt);
    await expect(page.locator('[data-text="latime"]')).toHaveValue(latime);
    await expect(page.locator('[data-text="inaltime-litere"]')).toHaveValue(inaltime);
    if (crenare) await expect(page.locator('[data-text="crenare"]')).toBeChecked();
    else await expect(page.locator('[data-text="crenare"]')).not.toBeChecked();
  }
});
