import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Rolurile personalizate (ADR 0114), în Edge: dreptunghiul cu adâncimea și pasul din panou se salvează ca rol (numele propus);
 * un cerc nou îl primește din grupul „Rolurile mele” (panoul și fereastra exportului arată valorile), într-un pas de anulare;
 * rolul și proiectul rămân după reîncărcarea paginii; numele folosit e refuzat, cu motivul; redenumirea se vede în listă și pe
 * piesă; ștergerea, cu întrebarea, lasă cercul cu operațiile lui, pe rolul de bază.
 */
test.use({ locale: 'ro-RO' });

const taierea = (page: Page) => page.getByTestId('prop-taierea');
const rol = (page: Page) => taierea(page).locator('[data-camp="rol"]');
const ales = (page: Page) => rol(page).locator('option:checked');
const camp = (page: Page, nume: string) => taierea(page).locator(`[data-camp="${nume}"]`);
const lista = (page: Page) => page.getByTestId('roluri-mele');
const motiv = (page: Page) => taierea(page).locator('[data-motiv="rol-personal"]');
const forme = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');
/** Valorile tuturor câmpurilor găsite, în ordine (rândurile ferestrei exportului). */
const valori = (page: Page, selector: string): Promise<string[]> =>
  page.locator(selector).evaluateAll((els) => els.map((e) => (e as HTMLInputElement | HTMLSelectElement).value));

/** Scrie o valoare într-un câmp al panoului și o aplică (Enter). */
async function scrie(page: Page, nume: string, valoare: string): Promise<void> {
  await camp(page, nume).fill(valoare);
  await camp(page, nume).press('Enter');
}

/** Adâncimea operației fiecărei piese din ultima versiune salvată a proiectului (IndexedDB). */
async function adancimiSalvate(page: Page): Promise<number[]> {
  return page.evaluate(async () => {
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
    if (typeof v !== 'string') return [];
    const d = JSON.parse(v) as { piese: Array<{ operatii: Array<{ adancime: number }> }> };
    return d.piese.map((p) => p.operatii[0]?.adancime ?? -1);
  });
}

test('rolul salvat din panou trece pe un cerc, rămâne după reîncărcare, se redenumește și se șterge', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await scrie(page, 'adancime', '6,5');
  await scrie(page, 'pas', '2');
  await taierea(page).locator('[data-buton="salveaza-rol"]').click();
  // Numele propus: rolul, freza și adâncimea.
  await expect(camp(page, 'nume-rol')).toHaveValue('exterior, Ø6, 6.5 mm');
  await scrie(page, 'nume-rol', 'Decupare placaj');
  // Dreptunghiul are acum exact valorile rolului: lista Rolului îl arată, iar lista rolurilor îl numără.
  await expect(ales(page)).toHaveText('Decupare placaj');
  await expect(lista(page).locator('summary')).toHaveText('Rolurile mele (1)');

  // Un cerc nou (o gaură de 8 mm) primește rolul din grupul „Rolurile mele”, într-un singur pas de anulare.
  await adauga(page, 'cerc');
  await expect(rol(page)).toHaveValue('interior');
  await expect(rol(page).locator('optgroup')).toHaveAttribute('label', 'Rolurile mele');
  await rol(page).selectOption({ label: 'Decupare placaj' });
  await expect(ales(page)).toHaveText('Decupare placaj');
  await expect(camp(page, 'adancime')).toHaveValue('6,5');
  await expect(camp(page, 'pas')).toHaveValue('2');
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(rol(page)).toHaveValue('interior');
  await expect(camp(page, 'adancime')).toHaveValue('8');
  await rol(page).selectOption({ label: 'Decupare placaj' });
  // Fereastra exportului: rândul dreptunghiului și al cercului, amândouă cu valorile rolului.
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect.poll(() => valori(page, '[data-operatie] [data-camp="latura"]')).toEqual(['exterior', 'exterior']);
  await expect.poll(() => valori(page, '[data-operatie] [data-camp="adancime"]')).toEqual(['6,5', '6,5']);
  await expect.poll(() => valori(page, '[data-operatie] [data-camp="pas"]')).toEqual(['2', '2']);
  await page.getByRole('button', { name: 'Închide' }).click();

  // După reîncărcare (proiectul salvat întâi): cercul are tot rolul, iar lista rolurilor e tot acolo.
  await expect.poll(() => adancimiSalvate(page)).toEqual([6.5, 6.5]);
  await page.reload();
  await forme(page).nth(1).click();
  await expect(ales(page)).toHaveText('Decupare placaj');

  // Același nume (cu alte majuscule), pe alte valori: refuzat, cu motivul; Escape închide formularul.
  await scrie(page, 'adancime', '7');
  await taierea(page).locator('[data-buton="salveaza-rol"]').click();
  await scrie(page, 'nume-rol', 'decupare PLACAJ');
  await expect(motiv(page)).toHaveText('Ai deja un rol cu numele acesta.');
  await camp(page, 'nume-rol').press('Escape');
  await expect(camp(page, 'nume-rol')).toHaveCount(0);
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(ales(page)).toHaveText('Decupare placaj');

  // Redenumirea se vede în listă și în lista Rolului.
  await lista(page).locator('summary').click();
  await lista(page).locator('[data-buton="redenumeste-rol"]').click();
  await scrie(page, 'nume-rol', 'Decupare 18');
  await expect(lista(page).locator('.prop-rol-nume')).toHaveText(['Decupare 18']);
  await expect(ales(page)).toHaveText('Decupare 18');

  // Ștergerea, cu întrebarea: cercul își păstrează operațiile și arată rolul de bază; lista dispare.
  await lista(page).locator('[data-buton="sterge-rol"]').click();
  await expect(lista(page)).toContainText('Ștergi rolul „Decupare 18”? Piesele își păstrează operațiile.');
  await lista(page).locator('[data-buton="confirma-sterge-rol"]').click();
  await expect(lista(page)).toHaveCount(0);
  await expect(rol(page)).toHaveValue('exterior');
  await expect(camp(page, 'adancime')).toHaveValue('6,5');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('salvarea refuzată: două forme cu roluri diferite spun motivul, fără formular', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  // Fereastra de selecție peste amândouă (dreptunghiul 100 × 60 din (20, 20), cercul R15 în (70, 50)), pornită de sus.
  const la = await ecran(page, await vedere(page));
  const [a, b] = [la(10, 95), la(135, 10)];
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
  await expect(forme(page).and(page.locator('[aria-pressed="true"]'))).toHaveCount(2);
  await expect(rol(page)).toHaveValue('');
  await taierea(page).locator('[data-buton="salveaza-rol"]').click();
  await expect(motiv(page)).toHaveText('Piesele alese au roluri diferite: alege piese cu același rol.');
  await expect(camp(page, 'nume-rol')).toHaveCount(0);
});
