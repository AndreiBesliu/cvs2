/**
 * Felia 1.7 (ADR 0024): proiectul în IndexedDB, un singur scriitor între file, lista de vectori cu avertismentele cu roșu,
 * Ctrl+D ca o copie separată și migrarea unui proiect v1 salvat. Felia 2.2 (ADR 0025): operațiile stau în document.
 * Fiecare test are browserul lui, deci baza lui.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
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

test('operațiile stau în document (ADR 0025): adâncimea din dialog intră la Exportă, Ctrl+Z o scoate, iar după reîncărcare rămâne', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  const adancime = page.locator('[data-operatie="e1/e1"] input').nth(0);
  const deschide = async (): Promise<void> => { await page.locator('[data-actiune="export.gcode"]').click(); };
  const inchide = async (): Promise<void> => { await page.getByRole('button', { name: 'Închide' }).click(); };
  await deschide();
  await expect(page.locator('[data-operatie="e1/e1"]')).toContainText('cerc R15.00');
  await expect(adancime).toHaveValue('8');
  // Peste marginile documentului (freza până la Ø100, adâncimea până la 1000 mm), Exportă e inactiv: un proiect salvat
  // așa nu s-ar mai deschide.
  await page.locator('[data-camp="diametru"]').fill('150');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await page.locator('[data-camp="diametru"]').fill('6');
  await adancime.fill('1001');
  await expect(page.locator('[data-buton="exporta"]')).toBeDisabled();
  await adancime.fill('5');
  await expect(page.locator('[data-buton="exporta"]')).toBeEnabled();
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await d).path(), 'ascii');
  // Pasul 4: trecerile la Z −4 și −5, nu la −8.
  expect(text).toContain('Z-5.000');
  expect(text).not.toContain('Z-8.000');
  await inchide();
  // O singură comandă: Ctrl+Z scoate operațiile schimbate, nu cercul; Ctrl+Y le pune la loc.
  await page.keyboard.press('Control+z');
  await expect(randuri(page)).toHaveCount(1);
  await deschide();
  await expect(adancime).toHaveValue('8');
  await inchide();
  await page.keyboard.press('Control+y');
  await deschide();
  await expect(adancime).toHaveValue('5');
  await inchide();
  // Cercul (rev 1), operațiile (2), anularea (3), refacerea (4): ultima versiune salvată e cea refăcută.
  await expect.poll(async () => (await versiuni(page)).map(([, r]) => r)).toContain(4);
  await page.reload();
  await deschide();
  await expect(adancime).toHaveValue('5');
});

test('în fila care doar citește, operațiile din dialog nu se pot schimba, dar exportul merge pe cele din document', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await expect.poll(async () => (await versiuni(page)).length).toBe(1);
  const a2 = await context.newPage();
  await a2.goto('/');
  await expect(a2.getByTestId('proiect')).toContainText('doar te uiți');
  await a2.locator('[data-actiune="export.gcode"]').click();
  await expect(a2.locator('[data-operatie="e1/e1"] input').nth(0)).toBeDisabled();
  await expect(a2.locator('[data-operatie="e1/e1"] select[data-camp="latura"]')).toBeDisabled();
  await expect(a2.locator('[data-operatie="e1/e1"] select[data-camp="sens"]')).toBeDisabled();
  await expect(a2.locator('[data-camp="diametru"]')).toBeDisabled();
  const d = a2.waitForEvent('download');
  await a2.locator('[data-buton="exporta"]').click();
  expect(readFileSync(await (await d).path(), 'ascii')).toContain('Z-8.000');
});

test('în fila care doar citește, urechile scrise de scriitor se văd, oprite, și intră în export', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  // Scriitorul taie gaura prin foaie, cu urechi (implicitele: 4 × 8 × 2, deci palierul la −16).
  await page.locator('[data-actiune="export.gcode"]').click();
  const rand = page.locator('[data-operatie="e1/e1"]');
  await rand.locator('input').nth(0).fill('18');
  await rand.locator('input').nth(1).fill('6');
  await rand.locator('[data-camp="urechi"]').check();
  const d1 = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await d1;
  await page.getByRole('button', { name: 'Închide' }).click();
  await expect.poll(async () => (await versiuni(page)).length).toBe(2);
  const a2 = await context.newPage();
  await a2.goto('/');
  await expect(a2.getByTestId('proiect')).toContainText('doar te uiți');
  await a2.locator('[data-actiune="export.gcode"]').click();
  await expect(a2.locator('[data-operatie="e1/e1"] [data-camp="urechi"]')).toBeChecked();
  await expect(a2.locator('[data-operatie="e1/e1"] [data-camp="urechi"]')).toBeDisabled();
  for (const c of ['urechi-numar', 'urechi-latime', 'urechi-grosime']) {
    await expect(a2.locator(`[data-urechi="e1/e1"] [data-camp="${c}"]`)).toBeDisabled();
  }
  const d = a2.waitForEvent('download');
  await a2.locator('[data-buton="exporta"]').click();
  // Pe cerc, flancurile sunt elice: `G3 X… Y… Z-16.000 I… J…`.
  expect(readFileSync(await (await d).path(), 'ascii')).toMatch(/ Z-16\.000\b/);
});

test('dialogul din fila care citește urmează versiunile scriitorului și, după preluare, nu scrie înapoi valori vechi', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await expect.poll(async () => (await versiuni(page)).length).toBe(1);
  const b = await context.newPage();
  await b.goto('/');
  await expect(b.getByTestId('proiect')).toContainText('doar te uiți');
  await b.locator('[data-actiune="export.gcode"]').click();
  const adancimeB = b.locator('[data-operatie="e1/e1"] input').nth(0);
  await expect(adancimeB).toHaveValue('8');
  // Montajul ales în fila care citește (colțul, Z0) e al omului de aici: o versiune nouă nu-l schimbă.
  await b.locator('[data-camp="origine"]').selectOption('dreapta-sus');
  // Scriitorul schimbă adâncimea la 5 și freza la Ø8, apoi exportă: versiunea 2.
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('[data-operatie="e1/e1"] input').nth(0).fill('5');
  await page.locator('[data-camp="diametru"]').fill('8');
  const da = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await da;
  await expect.poll(async () => (await versiuni(page)).map(([, r]) => r)).toContain(2);
  // Dialogul din fila care citește arată valorile noi, nu pe cele de la deschidere; colțul ales rămâne.
  await expect(adancimeB).toHaveValue('5');
  await expect(b.locator('[data-camp="diametru"]')).toHaveValue('8');
  await expect(adancimeB).toBeDisabled();
  await expect(b.locator('[data-camp="origine"]')).toHaveValue('dreapta-sus');
  // Scriitorul se închide: B scrie de-acum, iar dialogul ei, deschis tot timpul, nu pune înapoi 8 peste versiunea 2.
  await page.close();
  await expect(adancimeB).toBeEnabled();
  await expect(adancimeB).toHaveValue('5');
  await expect(b.locator('[data-camp="diametru"]')).toHaveValue('8');
  const db = b.waitForEvent('download');
  await b.locator('[data-buton="exporta"]').click();
  const fisier = await db;
  expect(fisier.suggestedFilename()).toBe('cncvs2-dreapta-sus.nc');
  const text = readFileSync(await fisier.path(), 'ascii');
  expect(text).toContain('Z-5.000');
  expect(text).not.toContain('Z-8.000');
  expect(text).toContain('(scula T1 freza plata D8.000)');
  // Nimic nou de salvat: valorile erau deja ale documentului.
  await b.waitForTimeout(500);
  expect((await versiuni(b)).map(([, r]) => r)).toEqual([1, 2]);
});

test('freze amestecate într-un proiect salvat: dialogul le spune pe față, iar Exportă le aduce la freza arătată', async ({ page }) => {
  await page.goto('/');
  const op = (id: string, numar: number, d: number) => ({ id, tip: 'profil', noduri: [id], scula: { numar, nume: 'freza plata', diametru: d }, latura: 'interior', adancime: 3, pas: 3 });
  const piesa = (id: string, numar: number, d: number) => ({
    id, radacina: { tip: 'element', id, forma: { tip: 'cerc', raza: 10 }, matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }, operatii: [op(id, numar, d)],
  });
  // Trei freze: T2 Ø6 diferă de T1 Ø6 doar prin număr, T1 Ø8 doar prin diametru. Exportul le compară pe amândouă.
  const doc = {
    schema: 3, rev: 5, piese: [piesa('a', 1, 6), piesa('b', 2, 6), piesa('c', 1, 8)],
    foi: [{
      id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 },
      instante: [{ id: 'a', piesa: 'a', x: 50, y: 50, rotire: 0 }, { id: 'b', piesa: 'b', x: 150, y: 50, rotire: 0 }, { id: 'c', piesa: 'c', x: 250, y: 50, rotire: 0 }],
    }],
  };
  await scrieVersiune(page, 5, JSON.stringify(doc));
  await page.reload();
  await expect(randuri(page)).toHaveCount(3);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.getByTestId('freze-diferite')).toContainText('T1 Ø6, T2 Ø6, T1 Ø8');
  await expect(page.locator('[data-camp="diametru"]')).toHaveValue('6');
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  // Un singur program, cu T1 Ø6 pentru toate trei (altfel CAM-ul l-ar fi refuzat: „altă sculă”).
  expect(readFileSync(await (await d).path(), 'ascii')).toContain('(scula T1 freza plata D6.000)');
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.getByTestId('freze-diferite')).toHaveCount(0);
});

test('o versiune pe care fila care citește n-o poate deschide: o spune, iar la preluare lasă blocarea altei file', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await expect.poll(async () => (await versiuni(page)).length).toBe(1);
  const b = await context.newPage();
  await b.goto('/');
  await expect(b.getByTestId('proiect')).toContainText('doar te uiți');
  // O versiune scrisă de o aplicație mai nouă (schema 99), anunțată pe canal ca o salvare obișnuită.
  await scrieVersiune(page, 2, '{"schema":99,"rev":2}');
  await page.evaluate(() => { const c = new BroadcastChannel('cncvs2-proiect'); c.postMessage('salvat'); c.close(); });
  await expect(b.getByTestId('proiect')).toContainText('n-o poate deschide');
  // Exportul ar fi al versiunii vechi: refuzat, cu motivul spus chiar în dialog (bara de jos e sub el).
  await b.locator('[data-actiune="export.gcode"]').click();
  await b.locator('[data-buton="exporta"]').click();
  await expect(b.getByTestId('export-stare')).toContainText('n-o poate deschide');
  await b.getByRole('button', { name: 'Închide' }).click();
  await page.close();
  // B primește blocarea, nu poate citi ultima versiune și o eliberează: nimic ținut, nimic în așteptare.
  await expect.poll(async () => b.evaluate(async () => {
    const q = await navigator.locks.query();
    return [...(q.held ?? []), ...(q.pending ?? [])].filter((l) => l.name === 'cncvs2-proiect-scriitor').length;
  })).toBe(0);
  await expect(b.getByTestId('proiect')).toContainText('n-o poate deschide');
  await expect(b.locator('[data-actiune="document.adauga-dreptunghi"]')).toBeDisabled();
});

test('în fila care citește, cu dialogul deschis, scriitorul șterge tot: Exportă spune de ce nu exportă, nu tace', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await expect.poll(async () => (await versiuni(page)).length).toBe(1);
  const b = await context.newPage();
  await b.goto('/');
  await expect(b.getByTestId('proiect')).toContainText('doar te uiți');
  await b.locator('[data-actiune="export.gcode"]').click();
  await expect(b.locator('[data-operatie]')).toHaveCount(1);
  // Scriitorul șterge cercul (e selectat după adăugare): versiunea 2, fără nimic pe foaie.
  await page.locator('[data-actiune="document.sterge-selectia"]').click();
  await expect.poll(async () => (await versiuni(page)).map(([, r]) => r)).toContain(2);
  await expect(b.locator('[data-operatie]')).toHaveCount(0);
  let descarcari = 0;
  b.on('download', () => { descarcari++; });
  await b.locator('[data-buton="exporta"]').click();
  await expect(b.getByTestId('export-stare')).toHaveText('Exportul n-a mers: Desenează întâi ceva.');
  expect(descarcari).toBe(0);
});

test('un export în curs în fila care citește, când scriitorul salvează: nu se descarcă, și se spune de ce', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  await expect.poll(async () => (await versiuni(page)).length).toBe(1);
  const b = await context.newPage();
  // Calculul exportului se încarcă la cerere: în fila B îl întârziem 2 s, cât să salveze scriitorul între timp.
  await b.route('**/assets/actiuniExportCalcul-*.js', async (route) => {
    await new Promise((r) => { setTimeout(r, 2000); });
    await route.continue();
  });
  await b.goto('/');
  await expect(b.getByTestId('proiect')).toContainText('doar te uiți');
  let descarcari = 0;
  b.on('download', () => { descarcari++; });
  await b.locator('[data-actiune="export.gcode"]').click();
  await b.locator('[data-buton="exporta"]').click();
  await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
  await expect(b.getByTestId('export-stare')).toContainText('Proiectul s-a schimbat în altă filă');
  await b.waitForTimeout(2500);
  expect(descarcari).toBe(0);
  // Exportul următor e al versiunii noi, cu ambele forme.
  const d = b.waitForEvent('download');
  await b.locator('[data-buton="exporta"]').click();
  const text = readFileSync(await (await d).path(), 'ascii');
  expect(text).toContain('dreptunghi');
  expect(text).toContain('cerc');
});
