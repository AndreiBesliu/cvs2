/**
 * Felia 1.7 (ADR 0024): proiectul în IndexedDB, un singur scriitor între file, lista de vectori cu avertismentele cu roșu,
 * Ctrl+D ca o copie separată și migrarea unui proiect v1 salvat. Fiecare test are browserul lui, deci baza lui.
 */
import { test, expect, type Page } from '@playwright/test';
import { ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');

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

/** Scrie direct în baza aplicației o versiune a proiectului, ca și cum ar fi salvat-o altă versiune a aplicației. */
async function scrieVersiune(page: Page, rev: number, text: string): Promise<void> {
  // Întâi aplicația își creează baza (cu tabelele ei); o deschidere din test înaintea ei ar crea-o goală.
  await expect(page.getByTestId('lista-vectori')).toBeVisible();
  await page.evaluate(async ([rev, text]) => {
    const db = await new Promise<IDBDatabase>((ok, eroare) => {
      const r = indexedDB.open('cncvs2-proiecte', 1);
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    await new Promise<void>((ok, eroare) => {
      const tx = db.transaction('versiuni', 'readwrite');
      tx.objectStore('versiuni').put(text, ['proiect', rev]);
      tx.oncomplete = () => { ok(); };
      tx.onerror = () => { eroare(tx.error); };
    });
    db.close();
  }, [rev, text] as const);
}

async function versiuni(page: Page): Promise<Array<[string, number]>> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok, eroare) => {
      const r = indexedDB.open('cncvs2-proiecte', 1);
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    const chei = await new Promise<IDBValidKey[]>((ok, eroare) => {
      const r = db.transaction('versiuni').objectStore('versiuni').getAllKeys();
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    db.close();
    return chei as Array<[string, number]>;
  });
}

test('proiectul rămâne după reîncărcare, cu formele mutate; lista arată ce e pe foaie', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('lista-vectori')).toContainText('Nimic pe foaie încă.');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await trage(page, 70, 50, 30);
  await expect(randuri(page)).toHaveText(['dreptunghi 100.00 × 60.00 la X 20.00, Y 20.00', 'cerc R15.00 cu centrul la X 100.00, Y 50.00']);
  // Salvarea e asincronă: așteaptă ultima versiune (trei comenzi: rev 3).
  await expect.poll(async () => (await versiuni(page)).map(([, r]) => r)).toContain(3);
  await page.reload();
  await expect(randuri(page)).toHaveText(['dreptunghi 100.00 × 60.00 la X 20.00, Y 20.00', 'cerc R15.00 cu centrul la X 100.00, Y 50.00']);
  await expect(page.getByTestId('proiect')).toHaveCount(0);
  // Alegerea din listă selectează forma, ca un clic pe pânză.
  await randuri(page).nth(1).click();
  await expect(page.getByTestId('selectie')).toHaveText('Selectat: cerc R15.00 cu centrul la X 100.00, Y 50.00');
  await expect(randuri(page).nth(1)).toHaveAttribute('aria-pressed', 'true');
});

test('a doua filă doar citește, se ține la zi cu fiecare salvare și devine scriitorul când prima se închide', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await expect.poll(async () => (await versiuni(page)).length).toBe(1);
  const a2 = await context.newPage();
  await a2.goto('/');
  await expect(a2.getByTestId('proiect')).toHaveText('Proiectul e deschis în altă filă: aici doar te uiți, iar nimic nu se salvează.');
  await expect(randuri(a2)).toHaveCount(1);
  const adauga = a2.locator('[data-actiune="document.adauga-dreptunghi"]');
  await expect(adauga).toBeDisabled();
  await expect(adauga).toHaveAttribute('title', 'Proiectul e deschis în altă filă: aici doar îl citești.');
  // Ce salvează prima filă apare în a doua fără reîncărcare: nici lista, nici exportul ei nu rămân pe o versiune veche.
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await expect(randuri(a2)).toHaveCount(2);
  // Prima filă se închide: a doua devine scriitorul, tot fără reîncărcare, și salvează de la ultima versiune.
  await page.close();
  await expect(a2.getByTestId('proiect')).toHaveCount(0);
  await expect(adauga).toBeEnabled();
  await adauga.click();
  await expect(randuri(a2)).toHaveCount(3);
  await expect.poll(async () => (await versiuni(a2)).map(([, r]) => r)).toEqual([1, 2, 3]);
});

test('fără Web Locks (o origine nesigură), două file scriu, dar a doua nu o acoperă pe prima: trece în conflict', async ({ context }) => {
  await context.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'locks', { get: () => undefined }); });
  const a1 = await context.newPage();
  await a1.goto('/');
  const a2 = await context.newPage();
  await a2.goto('/');
  await a1.locator('[data-actiune="document.adauga-cerc"]').click();
  await expect.poll(async () => (await versiuni(a1)).length).toBe(1);
  await a2.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await expect(a2.getByTestId('proiect')).toHaveText('Altă filă a salvat proiectul între timp: aici modificările nu se mai salvează. Reîncarcă pagina.');
  await expect(a2.locator('[data-actiune="document.adauga-cerc"]')).toBeDisabled();
  // Versiunea primei file a rămas singura: nimic n-a fost acoperit.
  expect(await versiuni(a1)).toEqual([['proiect', 1]]);
  await a1.reload();
  await expect(randuri(a1)).toHaveText(['cerc R15.00 cu centrul la X 70.00, Y 50.00']);
});

test('un proiect salvat care nu se poate deschide nu se acoperă: fila lucrează în memorie și o spune', async ({ page }) => {
  await page.goto('/');
  await scrieVersiune(page, 1_000_000, '{"schema":99,"rev":1000000}');
  await page.reload();
  await expect(page.getByTestId('proiect')).toContainText('Proiectul salvat nu s-a putut deschide');
  await expect(page.getByTestId('proiect')).toContainText('versiune mai nouă');
  // Desenul merge în memorie, dar nu se salvează peste proiectul vechi.
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await expect(randuri(page)).toHaveCount(1);
  await page.reload();
  await expect(page.getByTestId('proiect')).toContainText('Proiectul salvat nu s-a putut deschide');
  expect(await versiuni(page)).toEqual([['proiect', 1_000_000]]);
});

test('un proiect v1 salvat se deschide prin migrare: forma stă unde era', async ({ page }) => {
  await page.goto('/');
  const v1 = {
    schema: 1, rev: 4, foaie: { latime: 300, inaltime: 200, grosime: 18 },
    elemente: [{ id: 'e1', forma: { tip: 'cerc', raza: 15 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 70, f: 50 } }],
  };
  await scrieVersiune(page, 4, JSON.stringify(v1));
  await page.reload();
  await expect(page.getByTestId('proiect')).toHaveCount(0);
  await expect(randuri(page)).toHaveText(['cerc R15.00 cu centrul la X 70.00, Y 50.00']);
  // Prima schimbare salvează documentul v2 la revizia următoare.
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await expect.poll(async () => (await versiuni(page)).map(([, r]) => r)).toEqual([4, 5]);
});

test('lista: forma care iese din foaie apare cu roșu, cu avertismentul în titlu', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await expect(randuri(page).first()).not.toHaveClass(/cu-avertisment/);
  await trage(page, 50, 50, 230);
  const rand = randuri(page).first();
  await expect(rand).toHaveClass(/cu-avertisment/);
  await expect(rand).toHaveAttribute('title', /iese din foaie/);
  const culoare = await rand.evaluate((el) => getComputedStyle(el).color);
  const rosu = await page.evaluate(() => {
    const s = document.createElement('span');
    s.style.color = 'var(--rosu)';
    document.body.append(s);
    const c = getComputedStyle(s).color;
    s.remove();
    return c;
  });
  expect(culoare).toBe(rosu);
});

test('Ctrl+D: o copie separată, decalată cu 20 mm, selectată; Ctrl+Z o scoate; exportul le vede pe toate', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await page.keyboard.press('Control+d');
  await expect(randuri(page)).toHaveText(['cerc R15.00 cu centrul la X 70.00, Y 50.00', 'cerc R15.00 cu centrul la X 90.00, Y 30.00']);
  await expect(page.getByTestId('selectie')).toHaveText('Selectat: cerc R15.00 cu centrul la X 90.00, Y 30.00');
  await page.keyboard.press('Control+z');
  await expect(randuri(page)).toHaveCount(1);
  // Copia anulată nu rămâne selectată: bara spune „nimic selectat”, iar Duplică și Șterge sunt inactive.
  await expect(page.getByTestId('selectie')).toContainText('Nimic selectat');
  await expect(page.locator('[data-actiune="document.duplica-selectia"]')).toBeDisabled();
  await page.keyboard.press('Control+y');
  await expect(randuri(page)).toHaveCount(2);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('.dialog tbody tr')).toHaveCount(2);
});

test('pe un telefon (375 × 548), cu lista plină, pânza rămâne destul de mare ca să pornească și să primească gesturi', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 548 });
  await page.goto('/');
  for (let i = 0; i < 6; i++) await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await expect.poll(async () => (await versiuni(page)).map(([, r]) => r)).toContain(6);
  await page.reload();
  await expect(randuri(page)).toHaveCount(6);
  const cutie = await page.getByTestId('panza').boundingBox();
  expect(cutie?.height ?? 0).toBeGreaterThan(100);
  await expect(page.getByTestId('panza')).toHaveAttribute('data-scara', /\d/);
});

test('se păstrează ultimele 20 de versiuni: cele mai vechi pleacă, cea mai nouă rămâne și se redeschide', async ({ page }) => {
  await page.goto('/');
  for (let i = 0; i < 25; i++) await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await expect.poll(async () => (await versiuni(page)).map(([, r]) => r)).toEqual(Array.from({ length: 20 }, (_, k) => k + 6));
  await page.reload();
  await expect(randuri(page)).toHaveCount(25);
});
