/**
 * Silueta desenată în „Frezele mele” (ADR 0304 §5, 5a, felia 16.A↑f-5), în Edge: felul „Desenată” pornește de la silueta
 * frezei din editor; tabelul punctelor (r, h) cu „+” și „✕”, primul punct fix în (0, 0), diametrul dat de ultimul punct;
 * greșelile pe punctul lor; desenul la scară, cu punctele trase (lipite la 0,1 mm, ținute între vecini) sau mutate cu săgețile
 * (0,1 mm; cu Shift, 1 mm); „Pornește de la…” o freză din bibliotecă sau un profil din catalog; fișa doar de citit, cu punctele;
 * păstrarea la reîncărcare, exportul JSON cu punctele și importul lui înapoi; freza desenată aleasă pe o canelură în Tăierea.
 */
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { adauga, deschideMeniulContului } from './ajutor-panza.ts';
import { CATALOG_FREZE } from '../../src/model/catalogFreze.ts';
import { puncteDesenate } from '../../src/model/freza.ts';

test.use({ locale: 'ro-RO' });

async function deschideFrezele(page: Page): Promise<Locator> {
  const meniu = await deschideMeniulContului(page);
  await meniu.locator('[data-meniu-cont="freze"]').click();
  const f = page.getByRole('dialog', { name: 'Frezele mele' });
  await expect(f).toBeVisible();
  await expect(f.locator('.freze-rand-nume')).toHaveCount(6);
  return f;
}

const camp = (f: Locator, c: string): Locator => f.locator(`[data-freze-camp="${c}"]`);
const rand = (f: Locator, i: number): Locator => f.locator(`[data-freze-punct="${i}"]`);
const r = (f: Locator, i: number): Locator => f.locator(`[data-freze-punct-r="${i}"]`);
const h = (f: Locator, i: number): Locator => f.locator(`[data-freze-punct-h="${i}"]`);
const maner = (f: Locator, i: number): Locator => f.locator(`[data-freze-maner="${i}"]`);
const fisa = (f: Locator): Locator => f.locator('[data-freze="fisa"]');
const valoare = (f: Locator, c: string): Locator => fisa(f).locator(`[data-freze-valoare="${c}"]`);
/** Valorile tabelului, ca text: (r, h) pe fiecare rând (primul, fix, e (0, 0)). */
async function puncte(f: Locator): Promise<string[][]> {
  const n = await f.locator('[data-freze-punct]').count();
  const rez: string[][] = [['0', '0']];
  for (let i = 1; i < n; i++) rez.push([await r(f, i).inputValue(), await h(f, i).inputValue()]);
  return rez;
}
/** Centrul unui mâner pe ecran. */
async function centru(l: Locator): Promise<{ x: number; y: number }> {
  const b = await l.boundingBox();
  if (!b) throw new Error('mânerul nu se vede');
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
/** Trage mânerul cu `dx`, `dy` pixeli, în pași. */
async function trage(page: Page, l: Locator, dx: number, dy: number): Promise<void> {
  const c = await centru(l);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + dx / 2, c.y + dy / 2, { steps: 4 });
  await page.mouse.move(c.x + dx, c.y + dy, { steps: 4 });
  await page.mouse.up();
}

test('felul „Desenată”: tabelul punctelor, greșelile pe punct, tastele și tragerea cu lipirea; salvată, fișa cu punctele, și după reîncărcare', async ({ page }) => {
  await page.goto('/');
  const f = await deschideFrezele(page);
  await f.locator('[data-freze="noua"]').click();
  await f.locator('[data-freze-fel="desenata"]').click();
  // De la silueta frezei din editor (plata Ø6 a unei freze noi): vârful și marginea fundului plat.
  await expect(f.locator('[data-freze="puncte"]')).toBeVisible();
  expect(await puncte(f)).toEqual([['0', '0'], ['3', '0']]);
  await expect(camp(f, 'diametru')).toHaveCount(0);
  await expect(f.locator('[data-freze="puncte-diametru"]')).toHaveText('Diametrul: Ø6 mm (din ultimul punct)');
  await expect(camp(f, 'nume')).toHaveAttribute('placeholder', 'Profil desenat Ø6');
  // Primul punct e fix; cu două puncte, niciunul nu se poate scoate.
  await expect(rand(f, 0).locator('input')).toHaveCount(0);
  await expect(rand(f, 1).locator('[data-freze="punct-scoate"]')).toBeDisabled();
  // „+” pe ultimul rând adaugă un punct cu 1 mm mai departe; între două puncte, la mijloc.
  await rand(f, 1).locator('[data-freze="punct-adauga"]').click();
  expect(await puncte(f)).toEqual([['0', '0'], ['3', '0'], ['4', '0']]);
  await r(f, 2).fill('6');
  await h(f, 2).fill('4');
  await r(f, 1).fill('2');
  await rand(f, 1).locator('[data-freze="punct-adauga"]').click();
  expect(await puncte(f)).toEqual([['0', '0'], ['2', '0'], ['4', '2'], ['6', '4']]);
  await expect(r(f, 2)).toBeFocused();
  await r(f, 2).fill('3');
  await h(f, 2).fill('1,5');
  await expect(f.locator('[data-freze="puncte-diametru"]')).toHaveText('Diametrul: Ø12 mm (din ultimul punct)');
  await expect(camp(f, 'nume')).toHaveAttribute('placeholder', 'Profil desenat Ø12');
  // Greșelile, pe punctul lor (numărul din tabel, de la 1).
  await h(f, 2).fill('5');
  await expect(f.locator('#freze-eroare-puncte')).toHaveText('Punctul 4: h nu poate fi mai mic decât la punctul de dinainte (silueta nu coboară).');
  await expect(h(f, 3)).toHaveAttribute('aria-invalid', 'true');
  await h(f, 2).fill('1,5');
  await r(f, 2).fill('1');
  await expect(f.locator('#freze-eroare-puncte')).toHaveText('Punctul 3: r trebuie să fie mai mare decât la punctul de dinainte.');
  await expect(r(f, 2)).toHaveAttribute('aria-invalid', 'true');
  await r(f, 2).fill('3');
  await expect(f.locator('#freze-eroare-puncte')).toHaveCount(0);
  // Săgețile mută punctul cu 0,1 mm; cu Shift, cu 1 mm.
  await maner(f, 2).focus();
  await page.keyboard.press('ArrowRight');
  await expect(r(f, 2)).toHaveValue('3,1');
  await page.keyboard.press('Shift+ArrowUp');
  await expect(h(f, 2)).toHaveValue('2,5');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Shift+ArrowDown');
  expect(await puncte(f)).toEqual([['0', '0'], ['2', '0'], ['3', '1,5'], ['6', '4']]);
  // Tras, punctul rămâne între vecini (la 0,1 mm de ei pe r, între h-urile lor), lipit la 0,1 mm.
  await trage(page, maner(f, 2), -400, 0);
  await expect(r(f, 2)).toHaveValue('2,1');
  await trage(page, maner(f, 2), 400, -400);
  await expect(r(f, 2)).toHaveValue('5,9');
  await expect(h(f, 2)).toHaveValue('4');
  await trage(page, maner(f, 2), -37, 23);
  await expect(r(f, 2)).toHaveValue(/^[2-5](,\d)?$/u);
  await expect(h(f, 2)).toHaveValue(/^[0-4](,\d)?$/u);
  await r(f, 2).fill('3');
  await h(f, 2).fill('1,5');
  // Scoaterea unui punct; apoi înapoi.
  await rand(f, 2).locator('[data-freze="punct-scoate"]').click();
  expect(await puncte(f)).toEqual([['0', '0'], ['2', '0'], ['6', '4']]);
  await rand(f, 1).locator('[data-freze="punct-adauga"]').click();
  await r(f, 2).fill('3');
  await h(f, 2).fill('1,5');
  await camp(f, 'nume').fill('Margine desenată');
  await f.locator('[data-freze="salveaza"]').click();
  // Fișa: felul, diametrul, înălțimea, punctele, silueta.
  await expect(valoare(f, 'fel')).toHaveText('Desenată');
  await expect(valoare(f, 'diametru')).toHaveText('12 mm');
  await expect(valoare(f, 'inaltime')).toHaveText('4 mm');
  await expect(fisa(f).locator('[data-freze="fisa-puncte"] tbody tr')).toHaveCount(4);
  await expect(fisa(f).getByRole('img', { name: 'Silueta frezei' })).toBeVisible();
  await expect(f.getByRole('heading', { name: 'Siluete desenate (1)' })).toBeVisible();
  // Rămâne după reîncărcare.
  await page.reload();
  const g = await deschideFrezeleCu(page, 7);
  await g.locator('.freze-rand-nume').getByText('Margine desenată', { exact: true }).click();
  // Rândurile fișei: numărul punctului, r, h.
  await expect(g.locator('[data-freze="fisa"] [data-freze="fisa-puncte"] tbody tr')).toHaveText([/^1\s*0\s*0$/u, /^2\s*2\s*0$/u, /^3\s*3\s*1,5$/u, /^4\s*6\s*4$/u]);
  await g.locator('[data-freze="fisa"] [data-freze="editeaza"]').click();
  expect(await puncte(g)).toEqual([['0', '0'], ['2', '0'], ['3', '1,5'], ['6', '4']]);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

async function deschideFrezeleCu(page: Page, n: number): Promise<Locator> {
  const meniu = await deschideMeniulContului(page);
  await meniu.locator('[data-meniu-cont="freze"]').click();
  const f = page.getByRole('dialog', { name: 'Frezele mele' });
  await expect(f.locator('.freze-rand-nume')).toHaveCount(n);
  return f;
}

test('„Pornește de la…”: un profil din catalog și o freză din bibliotecă; exportul JSON cu punctele și importul înapoi', async ({ page }) => {
  await page.goto('/');
  const f = await deschideFrezele(page);
  await f.locator('[data-freze="noua"]').click();
  await f.locator('[data-freze-fel="desenata"]').click();
  const cat = CATALOG_FREZE.find((c) => c.id === 'cat-rotunjire-3')!;
  const asteptate = puncteDesenate(cat)!;
  await f.locator('[data-freze="porneste-de-la"]').selectOption('c:cat-rotunjire-3');
  await expect(f.locator('[data-freze-punct]')).toHaveCount(asteptate.length);
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText(`Silueta lui „Rotunjire R3 Ø12”: ${asteptate.length} de puncte.`);
  await expect(r(f, asteptate.length - 1)).toHaveValue('6');
  await expect(h(f, asteptate.length - 1)).toHaveValue('3');
  // Alegerea se întoarce la „o freză”: aceeași se poate alege din nou.
  await expect(f.locator('[data-freze="porneste-de-la"]')).toHaveValue('');
  await camp(f, 'nume').fill('Rotunjire desenată');
  await f.locator('[data-freze="salveaza"]').click();
  await expect(valoare(f, 'inaltime')).toHaveText('3 mm');
  // Din bibliotecă: plata Ø6, în altă freză nouă.
  await f.locator('[data-freze="noua"]').click();
  await f.locator('[data-freze-fel="desenata"]').click();
  await f.locator('[data-freze="porneste-de-la"]').selectOption({ label: 'Plată Ø12' });
  expect(await puncte(f)).toEqual([['0', '0'], ['6', '0']]);
  await f.locator('[data-freze="renunta"]').click();
  // Exportul: punctele în fișier, rotunjite la 0,0001 mm; importul lui le aduce înapoi, ca a doua freză.
  const [descarcare] = await Promise.all([page.waitForEvent('download'), f.locator('[data-freze="exporta"]').click()]);
  const text = await readFile(await descarcare.path(), 'utf8');
  const x = JSON.parse(text) as { freze: { nume: string; puncte?: number[][] }[] };
  const scrisa = x.freze.find((y) => y.nume === 'Rotunjire desenată')!;
  expect(scrisa.puncte).toEqual(asteptate);
  const dir = await mkdtemp(join(tmpdir(), 'cncvs2-desenata-'));
  const cale = join(dir, 'una.json');
  await writeFile(cale, JSON.stringify({ ...x, freze: [scrisa] }));
  await f.locator('[data-freze="fisier"]').setInputFiles(cale);
  await f.locator('[data-freze="import-confirma"]').click();
  await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Adăugate: 1 · înlocuite: 0 · sărite: 0');
  await f.locator('.freze-rand-nume').getByText('Rotunjire desenată (2)', { exact: true }).click();
  await expect(fisa(f).locator('[data-freze="fisa-puncte"] tbody tr')).toHaveCount(asteptate.length);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('în proiect: freza desenată se oferă pe o canelură în Tăierea, nu pe un buzunar', async ({ page }) => {
  await page.goto('/');
  const f = await deschideFrezele(page);
  await f.locator('[data-freze="noua"]').click();
  await f.locator('[data-freze-fel="desenata"]').click();
  await rand(f, 1).locator('[data-freze="punct-adauga"]').click();
  await r(f, 2).fill('6');
  await h(f, 2).fill('4');
  await camp(f, 'nume').fill('Canelura desenată');
  await f.locator('[data-freze="salveaza"]').click();
  await expect(valoare(f, 'fel')).toHaveText('Desenată');
  await f.locator('[data-freze="inchide"]').click();
  await expect(f).toHaveCount(0);
  await adauga(page, 'dreptunghi');
  const taierea = page.getByTestId('prop-taierea');
  const oferite = taierea.locator('[data-camp="freza"] option:not([disabled])');
  await taierea.locator('[data-camp="rol"]').selectOption('pe-linie');
  await expect(oferite.filter({ hasText: 'Canelura desenată' })).toHaveCount(1);
  await taierea.locator('[data-camp="freza"]').selectOption({ label: 'Canelura desenată' });
  await expect(taierea.locator('[data-camp="freza"] option:checked')).toHaveText('Canelura desenată');
  await taierea.locator('[data-camp="rol"]').selectOption('buzunar');
  await expect(oferite.filter({ hasText: 'Canelura desenată' })).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

/** Lățimea paginii nu trece de fereastră, iar cutia ferestrei și tabelul punctelor nu se derulează pe orizontală. */
async function faraDepasire(page: Page): Promise<void> {
  const [pagina, latime, cutie, tabel] = await page.evaluate(() => {
    const c = document.querySelector('.dialog-freze');
    const t = document.querySelector('.freze-puncte-tabel');
    return [document.documentElement.scrollWidth, window.innerWidth, c ? c.scrollWidth - c.clientWidth : -1,
      t && t.parentElement ? t.getBoundingClientRect().right - t.parentElement.getBoundingClientRect().right : -1];
  });
  expect(pagina).toBeLessThanOrEqual(latime);
  expect(cutie).toBe(0);
  expect(tabel).toBeLessThanOrEqual(0.5);
}

for (const latime of [1280, 390, 360, 320]) {
  test(`la ${latime} px, cu fontul lat: editorul siluetei încape, fără derulare pe orizontală; mânerele se văd`, async ({ page }) => {
    await page.setViewportSize({ width: latime, height: 800 });
    await page.goto('/');
    await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
    const f = await deschideFrezele(page);
    await f.locator('[data-freze="noua"]').click();
    await f.locator('[data-freze-fel="desenata"]').click();
    await f.locator('[data-freze="porneste-de-la"]').selectOption('c:cat-rotunjire-3');
    await expect(f.locator('[data-freze-punct]').first()).toBeVisible();
    await expect(maner(f, 1)).toBeVisible();
    // Pe telefon, editorul se derulează pe verticală: desenul se aduce în ecran întreg.
    await f.locator('[data-freze="desen-puncte"]').scrollIntoViewIfNeeded();
    await expect(f.locator('[data-freze="desen-puncte"]')).toBeInViewport({ ratio: 0.95 });
    await faraDepasire(page);
  });
}
