/**
 * „Pune-o înapoi în bibliotecă” (ADR 0300 §5, felia 16.A↑b-6), în Edge: o freză ștearsă din „Frezele mele” după ce a intrat în
 * proiect își spune pe rând „nu mai e în bibliotecă”, cu butonul care o pune la loc din copia proiectului (același nume, aceleași
 * valori); nota pleacă, iar lista rândului o arată din nou. Cu numele luat între timp de altă freză, intră cu un nume liber
 * („(2)”), iar rândurile cu aceeași copie îl iau; Exportă îl scrie.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { adauga, deschideMeniulContului } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const fisa = (page: Page, cheie: string): Locator => page.locator(`[data-fisa="op"][data-operatie="${cheie}"]`);
const aleasa = (l: Locator): Locator => l.locator('[data-camp="freza-biblioteca"] option:checked');

async function exporta(page: Page): Promise<void> {
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await d;
  await page.getByRole('button', { name: 'Închide' }).click();
}

/** Fereastra „Frezele mele”, deschisă din meniul contului, cu biblioteca citită. */
async function frezele(page: Page): Promise<Locator> {
  const meniu = await deschideMeniulContului(page);
  await meniu.locator('[data-meniu-cont="freze"]').click();
  const f = page.getByRole('dialog', { name: 'Frezele mele' });
  await expect(f.locator('[data-freze="stare"]')).not.toContainText(/Se citește/u);
  return f;
}

/** În „Frezele mele”: freza cu numele dat, cu câmpurile date schimbate (sau ștearsă, fără câmpuri); apoi fereastra se închide. */
async function inBiblioteca(page: Page, nume: string, campuri: Readonly<Record<string, string>> | 'sterge'): Promise<void> {
  const f = await frezele(page);
  await f.locator('.freze-rand-nume').getByText(nume, { exact: true }).click();
  const fisaFrezei = f.locator('[data-freze="fisa"]');
  if (campuri === 'sterge') {
    await fisaFrezei.locator('[data-freze="sterge"]').click();
    await f.locator('[data-freze="sterge-da"]').click();
    // Ștergerea e asincronă: Escape, înainte de capătul ei, ar închide doar întrebarea.
    await expect(f.locator('.freze-rand-nume').getByText(nume, { exact: true })).toHaveCount(0);
  } else {
    await fisaFrezei.locator('[data-freze="editeaza"]').click();
    for (const [c, v] of Object.entries(campuri)) await f.locator(`[data-freze-camp="${c}"]`).fill(v);
    await f.locator('[data-freze="salveaza"]').click();
    await expect(f.locator('[data-freze="mesaj"]')).toHaveText('Salvat');
  }
  await page.keyboard.press('Escape');
  await expect(f).toHaveCount(0);
}

test('ștearsă din bibliotecă: „Pune-o înapoi în bibliotecă” o pune la loc din copia proiectului, cu valorile ei', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const e1 = fisa(page, 'e1/e1');
  await e1.locator('[data-camp="freza-biblioteca"]').selectOption({ label: 'Plată Ø12' });
  await exporta(page);
  await inBiblioteca(page, 'Plată Ø12', 'sterge');
  await page.locator('[data-actiune="export.gcode"]').click();
  const nota = e1.locator('[data-nota="biblioteca-stearsa"]');
  await expect(nota).toContainText('„Plată Ø12” nu mai e în bibliotecă');
  // Freza ștearsă nu mai e în lista rândului; copia rămâne aleasă.
  await expect(e1.locator('[data-camp="freza-biblioteca"] option', { hasText: /^Plată Ø12$/u })).toHaveCount(1);
  await nota.locator('[data-buton="pune-inapoi"]').click();
  await expect(e1.locator('[data-nota^="biblioteca-"]')).toHaveCount(0);
  await expect(aleasa(e1)).toHaveText('Plată Ø12');
  await expect(e1.locator('[data-camp="diametru"]')).toHaveValue('12');
  await exporta(page);
  // În bibliotecă, cu valorile copiei: Ø12, T6, tăișul, turația și avansul frezei standard, pasul rândului.
  const f = await frezele(page);
  await f.locator('.freze-rand-nume').getByText('Plată Ø12', { exact: true }).click();
  const v = (k: string): Locator => f.locator(`[data-freze="fisa"] [data-freze-valoare="${k}"]`);
  await expect(v('fel')).toHaveText('Plată');
  await expect(v('diametru')).toHaveText('12 mm');
  await expect(v('numar')).toHaveText('T6');
  await expect(v('tais')).toHaveText('30 mm');
  await expect(v('turatie')).toHaveText('18000 rot/min');
  await expect(v('avans')).toHaveText('1000 mm/min');
  await expect(v('pas')).toHaveText('4 mm');
  await page.keyboard.press('Escape');
  await expect(f).toHaveCount(0);
  // Fereastra redeschisă: la zi, nicio notă.
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nota^="biblioteca-"]')).toHaveCount(0);
  await expect(aleasa(e1)).toHaveText('Plată Ø12');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('cu numele luat între timp: intră cu un nume liber, iar rândurile cu aceeași copie îl iau; Exportă îl scrie', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  const e1 = fisa(page, 'e1/e1'), e2 = fisa(page, 'e2/e2');
  for (const e of [e1, e2]) await e.locator('[data-camp="freza-biblioteca"]').selectOption({ label: 'Plată Ø12' });
  await exporta(page);
  await inBiblioteca(page, 'Plată Ø12', 'sterge');
  await inBiblioteca(page, 'Plată Ø6', { nume: 'Plată Ø12' });
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nota="biblioteca-stearsa"]')).toHaveCount(2);
  await e1.locator('[data-buton="pune-inapoi"]').click();
  await expect(page.locator('[data-nota^="biblioteca-"]')).toHaveCount(0);
  for (const e of [e1, e2]) await expect(aleasa(e)).toHaveText('Plată Ø12 (2)');
  await exporta(page);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nota^="biblioteca-"]')).toHaveCount(0);
  for (const e of [e1, e2]) await expect(aleasa(e)).toHaveText('Plată Ø12 (2)');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
