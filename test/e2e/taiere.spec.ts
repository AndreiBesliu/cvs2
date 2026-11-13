import { test, expect, type Page } from '@playwright/test';
import { cerc, dxf, lwpolilinie } from '../unit/ajutor-dxf.ts';
import { ecran, vedere } from './ajutor-panza.ts';

/**
 * Tăierea cu o linie dreaptă (felia 10.3↑, ADR 0180), în Edge, pe un DXF importat (o piesă cu un pătrat 100 × 100 și un cerc
 * R30 la (200, 50)): butonul Taie din extensia barei deschide panoul, cu X pornit din mijlocul formelor alese; linia se vede pe
 * pânză. Taie la X = 50 face din piesă două forme (jumătatea stângă a pătratului; cealaltă jumătate cu cercul), alese;
 * Anulează pune piesa la loc. Fără „Închide bucățile”, bifa ținută după reîncărcare; fără ghidaje pe foaie, alegerea lor e
 * stinsă; o linie pe lângă forme e refuzată cu motiv; Esc închide panoul și stinge linia.
 *
 * Felia 10.3↑b: „Ultima formă aleasă” (după degrupare, bucățile rămân alese, în ordine: linia frântă, ultima, e cuțitul) taie
 * pătratul în două fețe, iar cuțitul rămâne; „Taie la intersecții”, din panou și din meniul de clic dreapta, face din
 * pătratul și linia care îl trece cinci forme; Anulează le pune la loc.
 *
 * Felia 10.3↑c: „Decupează la ultima formă aleasă” lasă din pătrat partea lui comună cu cercul (granița, aleasă ultima, rămâne);
 * după Anulează, cu formele alese din nou printr-un cadru, „se șterg” scoate pătratul, care trece granița.
 *
 * Felia 10.3↑h (ADR 0181 §2, §3): linia prin (20, 50) la 30° taie pătratul în două (cutiile, 100 × 96,19 și 100 × 61,55);
 * „Păstrează stânga” la X = 30 lasă partea de 30 × 100, iar la Y părțile se cheamă deasupra și dedesubt; o linie scurtă aleasă
 * ultima nu taie nimic fără prelungire, iar „până ies din formă” și „și șterge-o după tăiere” fac din pătrat două fețe și scot
 * cuțitul.
 *
 * Felia 10.3↑i (ADR 0181 §2): „Între bucăți” e stinsă fără „Închide bucățile”; spațiul 6 la X = 50 lasă două forme de
 * 47 × 100 mm (fâșia lui se vede pe pânză, în jurul liniei); suprapunerea 6, două de 53 × 100; spațiul care ar mânca fâșia de
 * 2 mm de la X = 98 e refuzat, cu motiv.
 *
 * Felia 10.3↑j (ADR 0181 §6): „Îmbinarea” e stinsă fără „Închide bucățile” și la ultima formă aleasă (nu e o tăietură
 * dreaptă); zigzagul cu pasul 20, înălțimea 10 și raza 0 la X = 50 lasă două forme de 55 × 100 mm (dinții se văd pe pânză); un
 * pas de 0 se arată greșit; alegerea rămâne după reîncărcare. Refuzate, cu motiv: dinții drepți de 10 cu raza 3 (treapta de 5 nu ține două rotunjiri) și pasul
 * 60 (niciun dinte întreg pe 100 mm); puzzle-ul implicit la Y = 50 lasă două forme de 100 × 60 mm (capul ajunge la ±10).
 *
 * Felia 10.3↑k (ADR 0181 §7): „Taie în panouri”, pe firma de 2 400 × 1 000 mm: cât lucrezi în bloc, pânza arată grila (2 × 2 la
 * 1 200 × 900, egale sau din colț), iar înapoi în blocul de sus, linia; panourile egale fac patru forme de 1 200 × 500 mm,
 * „Panoul 1” … „Panoul 4”, alese (o literă de pe firmă, despărțită de ea cu Degrupează, intră în grupul „Panoul 1”); Anulează
 * pune firma la loc, iar blocul, cu alegerea rămasă spre panourile anulate, ia toate formele foii; Reface le pune înapoi. Fără nimic ales, se taie toate formele foii; peste 100 de panouri
 * și un singur panou, butonul e stins, cu motiv; din colț, două forme de 1 200 × 900 și două de 1 200 × 100.
 */
test.use({ locale: 'ro-RO' });

const fisierDxf = (nume: string, text: string) => ({ name: nume, mimeType: 'application/dxf', buffer: Buffer.from(text, 'utf8') });
const ENTITATI = [
  lwpolilinie([[0, 0], [100, 0], [100, 100], [0, 100]], true, { strat: 'PATRAT' }),
  cerc(200, 50, 30, { strat: 'CERC' }),
].join('');

const panou = (page: Page) => page.getByTestId('panou-taiere');
const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');

async function importa(page: Page, entitati = ENTITATI): Promise<void> {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf('taiere.dxf', dxf({ antet: [['$INSUNITS', 70, 4]], entitati })));
  await page.click('[data-buton="importa"]');
  await expect(page.locator('.dialog')).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(1);
}

test('Taie la X = 50: piesa importată devine două forme, alese; linia pe pânză; Anulează o pune la loc', async ({ page }) => {
  await importa(page);
  await page.locator('[data-editare="taiere"]').click();
  await expect(panou(page)).toBeVisible();
  // X pornește din mijlocul formelor alese: pătratul (0…100) și cercul (170…230), deci 115.
  await expect(page.locator('[data-taiere="x"]')).toHaveValue('115');
  await expect(page.getByTestId('taiere-linia')).toHaveAttribute('data-axa', 'x');
  await page.locator('[data-taiere="x"]').fill('50');
  await expect(page.locator('[data-taiere="inchide"]')).toBeChecked();
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 1; forme noi: 2, alese.');
  await expect(randuri(page)).toHaveCount(2);
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]')).toHaveCount(2);

  await page.keyboard.press('Escape');
  await expect(panou(page)).toHaveCount(0);
  await expect(page.getByTestId('taiere-linia')).toHaveCount(0);
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(1);
});

test('fără „Închide bucățile”: tot două forme, bifa ținută după reîncărcare; o linie pe lângă e refuzată; fără ghidaje, alegerea lor e stinsă', async ({ page }) => {
  await importa(page);
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="inchide"]').uncheck();
  await page.locator('[data-taiere="x"]').fill('50');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 1; forme noi: 2, alese.');
  await expect(randuri(page)).toHaveCount(2);

  // Linia pe lângă forme: refuzul, cu motivul lui.
  await page.locator('[data-taiere="y"]').fill('500');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Tăietura nu trece prin nicio formă aleasă (o atingere nu taie).');

  await page.reload();
  await expect(randuri(page)).toHaveCount(2);
  await page.locator('[data-editare="taiere"]').click();
  await expect(page.locator('[data-taiere="inchide"]')).not.toBeChecked();
  // Fără ghidaje pe foaie, alegerea ghidajului e stinsă.
  await expect(page.locator('[data-taiere="cu-ghidaj"]')).toBeDisabled();
});

/** Pătratul 100 × 100 și o linie: frântă, (−10, 50)→(50, 70)→(110, 50), sau dreaptă, (−8, 95)→(108, 5); o singură piesă. */
const PATRAT = lwpolilinie([[0, 0], [100, 0], [100, 100], [0, 100]], true, { strat: 'PATRAT' });
const FRANTA = PATRAT + lwpolilinie([[-10, 50], [50, 70], [110, 50]], false, { strat: 'CUTIT' });
const OBLICA = PATRAT + lwpolilinie([[-8, 95], [108, 5]], false, { strat: 'LINIE' });

test('Taie cu ultima formă aleasă: linia frântă, aleasă ultima, taie pătratul în două fețe și rămâne; Anulează', async ({ page }) => {
  await importa(page, FRANTA);
  await page.locator('[data-editare="degrupeaza"]').click();
  await expect(randuri(page)).toHaveCount(2);
  // Linia frântă (al doilea contur al DXF-ului) e ultima aleasă: cuțitul.
  const cutitul = await randuri(page).nth(1).getAttribute('data-instanta');
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="cu-forma"]').check();
  await expect(page.getByTestId('taiere-linia')).toHaveCount(0);
  await expect(panou(page).locator('.stare-taiere').first()).toHaveText('Cuțitul e ultima formă aleasă; forme de tăiat: 1.');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 1; forme noi: 2, alese.');
  await expect(randuri(page)).toHaveCount(3, { timeout: 10_000 });
  const lista = page.getByTestId('lista-vectori');
  await expect(lista.locator('button[data-instanta][aria-pressed="true"]')).toHaveCount(2);
  // Cuțitul (linia frântă, aleasă ultima) a rămas întreg, neales; pătratul s-a tăiat.
  await expect(lista.locator('button[data-instanta][aria-pressed="false"]')).toHaveCount(1);
  await expect(lista.locator('button[data-instanta][aria-pressed="false"]')).toHaveAttribute('data-instanta', cutitul ?? '—');
  await page.keyboard.press('Escape');
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(2);
});

test('Taie la intersecții, din panou și din clic dreapta: pătratul și linia oblică devin cinci forme; Anulează', async ({ page }) => {
  await importa(page, OBLICA);
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="intersectii"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 2; forme noi: 5, alese.');
  await expect(randuri(page)).toHaveCount(5);
  await page.keyboard.press('Escape');
  await expect(panou(page)).toHaveCount(0);
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(1);

  // Din meniul de clic dreapta, pe latura de jos a pătratului (forma e încă aleasă).
  await randuri(page).nth(0).click();
  const la = await ecran(page, await vedere(page));
  const jos = la(30, 0);
  await page.mouse.click(jos.x, jos.y, { button: 'right' });
  const meniu = page.getByTestId('meniu-context');
  await expect(meniu.locator('[data-meniu="taie-intersectii"]')).toBeEnabled();
  await meniu.locator('[data-meniu="taie-intersectii"]').click();
  await expect(meniu).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(5);
});

/** Pătratul 100 × 100 și cercul R30 din (100, 50), care îi trece latura din dreapta: o singură piesă. */
const CU_CERC = PATRAT + cerc(100, 50, 30, { strat: 'GRANITA' });

test('Decupează la ultima formă aleasă: din pătrat rămâne partea comună cu cercul; „se șterg” scoate pătratul; Anulează', async ({ page }) => {
  await importa(page, CU_CERC);
  await page.locator('[data-editare="degrupeaza"]').click();
  await expect(randuri(page)).toHaveCount(2);
  const granita = await randuri(page).nth(1).getAttribute('data-instanta');
  await page.locator('[data-editare="taiere"]').click();
  await expect(page.locator('[data-taiere="pastreaza-inauntru"]')).toBeChecked();
  await expect(page.locator('[data-taiere="trec-taie"]')).toBeChecked();
  await expect(page.locator('[data-taiere="inchide-decupare"]')).toBeChecked();
  await page.locator('[data-taiere="decupeaza"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme decupate: 1; șterse: 0; forme noi: 1, alese.');
  // Rezultatul stă sub cele trei blocuri, într-un panou care se derulează: adus în vedere (95 %: sub-pixelii).
  await expect(page.getByTestId('taiere-stare')).toBeInViewport({ ratio: 0.95 });
  const lista = page.getByTestId('lista-vectori');
  await expect(randuri(page)).toHaveCount(2);
  await expect(lista.locator('button[data-instanta][aria-pressed="false"]')).toHaveAttribute('data-instanta', granita ?? '—');
  await page.locator('[data-taiere="inchide-panoul"]').click();
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(2);

  // Amândouă, alese din nou cu un cadru tras de la dreapta la stânga, care le atinge (în ordinea foii: cercul, ultimul);
  // „se șterg” scoate pătratul.
  const la = await ecran(page, await vedere(page));
  const [a, b] = [la(135, 60), la(90, 40)];
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
  await expect(lista.locator('button[data-instanta][aria-pressed="true"]')).toHaveCount(2);
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="trec-sterge"]').check();
  await page.locator('[data-taiere="decupeaza"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme decupate: 0; șterse: 1; forme noi: 0, alese.');
  await expect(randuri(page)).toHaveCount(1);
  await expect(randuri(page)).toHaveAttribute('data-instanta', granita ?? '—');
});

// ——— Opțiunile tăierii din panou (felia 10.3↑h, ADR 0181 §2, §3) ———

const SCURTA = PATRAT + lwpolilinie([[30, 50], [70, 50]], false, { strat: 'CUTIT' });

test('Linia prin X, Y la unghi: pătratul tăiat prin (20, 50) la 30°, în două forme de 100 × 96,19 și 100 × 61,55 mm; linia se vede pe pânză', async ({ page }) => {
  await importa(page, PATRAT);
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="cu-unghi"]').check();
  await page.locator('[data-taiere="unghi-x"]').fill('20');
  await page.locator('[data-taiere="unghi-y"]').fill('50');
  await page.locator('[data-taiere="unghi"]').fill('30');
  await expect(page.getByTestId('taiere-linia')).toHaveAttribute('data-axa', 'u');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 1; forme noi: 2, alese.');
  await expect(randuri(page)).toHaveCount(2);
  await page.keyboard.press('Escape');
  // Cutia fiecărei forme: dedesubt, de la y = 0 la 50 + 80/√3; deasupra, de la 50 − 20/√3 la 100.
  const cutie = page.locator('#root, body').getByText(/^100\.00 × (96\.19|61\.55) mm$/);
  await randuri(page).nth(0).click();
  await expect(cutie).toBeVisible();
  const prima = (await cutie.textContent()) ?? '';
  await randuri(page).nth(1).click();
  await expect(cutie).not.toHaveText(prima);
  const aDoua = (await cutie.textContent()) ?? '';
  expect([prima, aDoua].sort()).toEqual(['100.00 × 61.55 mm', '100.00 × 96.19 mm']);
});

test('Păstrează stânga, la X = 30: rămâne doar partea de 30 × 100 mm; la Y, părțile se cheamă deasupra și dedesubt; prelungirea e stinsă la linii', async ({ page }) => {
  await importa(page, PATRAT);
  await page.locator('[data-editare="taiere"]').click();
  const eticheta = (x: string) => panou(page).locator('label', { has: page.locator(`[data-taiere="parte-${x}"]`) });
  await page.locator('[data-taiere="cu-y"]').check();
  await expect(eticheta('stanga')).toHaveText('deasupra');
  await expect(eticheta('dreapta')).toHaveText('dedesubt');
  await page.locator('[data-taiere="cu-x"]').check();
  await expect(eticheta('stanga')).toHaveText('stânga');
  await expect(page.locator('[data-taiere="prelungeste-forma"]')).toBeDisabled();
  await page.locator('[data-taiere="x"]').fill('30');
  await page.locator('[data-taiere="parte-stanga"]').check();
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 1; forme noi: 1, alese.');
  await expect(randuri(page)).toHaveCount(1);
  await expect(page.locator('#root, body').getByText('30.00 × 100.00 mm')).toBeVisible();
});

test('Ultima formă aleasă, o linie scurtă înăuntrul pătratului: fără prelungire, refuzul; până ies din formă, două fețe, iar cuțitul, cu bifa, pleacă', async ({ page }) => {
  await importa(page, SCURTA);
  await page.locator('[data-editare="degrupeaza"]').click();
  await expect(randuri(page)).toHaveCount(2);
  // Linia scurtă (al doilea contur al DXF-ului) e ultima aleasă: cuțitul.
  const cutitul = await randuri(page).nth(1).getAttribute('data-instanta');
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="cu-forma"]').check();
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Tăietura nu trece prin nicio formă aleasă (o atingere nu taie).');
  await expect(page.locator('[data-taiere="prelungeste-forma"]')).toBeEnabled();
  await page.locator('[data-taiere="prelungeste-forma"]').check();
  await page.locator('[data-taiere="sterge-cutitul"]').check();
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 1; forme noi: 2, alese. Cuțitul-formă a fost șters.');
  await expect(randuri(page)).toHaveCount(2);
  await expect(page.locator(`[data-instanta="${cutitul ?? '—'}"]`)).toHaveCount(0);
});

/** Fiecare formă a listei, aleasă din listă, are în proprietăți cutia dată. */
async function cutii(page: Page, text: string): Promise<void> {
  const n = await randuri(page).count();
  for (let k = 0; k < n; k++) {
    await randuri(page).nth(k).click();
    await expect(page.locator('#root, body').getByText(text)).toBeVisible();
  }
}

test('Între bucăți: stinsă fără închidere; spațiul 6 la X = 50 lasă două forme de 47 × 100 mm, iar fâșia se vede pe pânză', async ({ page }) => {
  await importa(page, PATRAT);
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="x"]').fill('50');
  await page.locator('[data-taiere="inchide"]').uncheck();
  await expect(page.locator('[data-taiere="intre-spatiu"]')).toBeDisabled();
  await expect(page.locator('[data-taiere="latime"]')).toBeDisabled();
  await page.locator('[data-taiere="inchide"]').check();
  await page.locator('[data-taiere="intre-spatiu"]').check();
  await expect(page.locator('[data-taiere="latime"]')).toHaveValue('3');
  await expect(page.getByTestId('taiere-linia')).toHaveAttribute('data-fasie', '3');
  await page.locator('[data-taiere="latime"]').fill('6');
  await expect(page.getByTestId('taiere-linia')).toHaveAttribute('data-fasie', '6');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 1; forme noi: 2, alese.');
  await page.keyboard.press('Escape');
  await expect(randuri(page)).toHaveCount(2);
  await cutii(page, '47.00 × 100.00 mm');
});

test('Între bucăți: spațiul 6 la X = 98 ar mânca fâșia de 2 mm și e refuzat; suprapunerea 6 la X = 50 lasă două forme de 53 × 100 mm', async ({ page }) => {
  await importa(page, PATRAT);
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="intre-spatiu"]').check();
  await page.locator('[data-taiere="latime"]').fill('6');
  await page.locator('[data-taiere="x"]').fill('98');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Spațiul ar mânca o bucată întreagă (o fâșie mai îngustă decât el): alege un spațiu mai mic, mută cuțitul sau păstrează doar partea cealaltă.');
  await expect(randuri(page)).toHaveCount(1);
  await page.locator('[data-taiere="intre-suprapunere"]').check();
  await page.locator('[data-taiere="x"]').fill('50');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 1; forme noi: 2, alese.');
  await page.keyboard.press('Escape');
  await expect(randuri(page)).toHaveCount(2);
  await cutii(page, '53.00 × 100.00 mm');
});

test('Îmbinarea: stinsă fără închidere și la ultima formă aleasă; zigzagul (pasul 20, înălțimea 10, raza 0) la X = 50 lasă două forme de 55 × 100 mm, iar dinții se văd pe pânză', async ({ page }) => {
  await importa(page, PATRAT);
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="x"]').fill('50');
  await expect(page.locator('[data-taiere="imbinare"]')).toHaveValue('dreapta');
  await page.locator('[data-taiere="inchide"]').uncheck();
  await expect(page.locator('[data-taiere="imbinare"]')).toBeDisabled();
  await page.locator('[data-taiere="inchide"]').check();
  await page.locator('[data-taiere="imbinare"]').selectOption('zigzag');
  // Mărimile, cu valorile implicite: pasul 40, înălțimea 20, raza 3 (un dinte pe 100 mm).
  await expect(page.locator('[data-taiere="imbinare-pas"]')).toHaveValue('40');
  await expect(page.locator('[data-taiere="imbinare-inaltime"]')).toHaveValue('20');
  await expect(page.locator('[data-taiere="imbinare-raza"]')).toHaveValue('3');
  await expect(page.getByTestId('taiere-linia')).toHaveAttribute('data-dinti', '1');
  await page.locator('[data-taiere="imbinare-pas"]').fill('20');
  await page.locator('[data-taiere="imbinare-inaltime"]').fill('10');
  await page.locator('[data-taiere="imbinare-raza"]').fill('0');
  // Raza 0 e bună (colțuri ascuțite); un pas de 0 se arată greșit și nu ajunge în opțiuni.
  await expect(page.locator('[data-taiere="imbinare-raza"]')).toHaveAttribute('aria-invalid', 'false');
  await page.locator('[data-taiere="imbinare-pas"]').fill('0');
  await expect(page.locator('[data-taiere="imbinare-pas"]')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('[data-taiere="imbinare-pas"]').fill('20');
  await expect(page.locator('[data-taiere="imbinare-pas"]')).toHaveAttribute('aria-invalid', 'false');
  // Ultima formă aleasă nu e o tăietură dreaptă: îmbinarea e stinsă.
  await page.locator('[data-taiere="cu-forma"]').check();
  await expect(page.locator('[data-taiere="imbinare"]')).toBeDisabled();
  await page.locator('[data-taiere="cu-x"]').check();
  await expect(page.locator('[data-taiere="imbinare"]')).toBeEnabled();
  await expect(page.getByTestId('taiere-linia')).toHaveAttribute('data-dinti', '1');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 1; forme noi: 2, alese.');
  await page.keyboard.press('Escape');
  await expect(randuri(page)).toHaveCount(2);
  await cutii(page, '55.00 × 100.00 mm');
  // Alegerea rămâne după reîncărcare (ținută în browser), cu raza 0.
  await page.reload();
  await expect(randuri(page)).toHaveCount(2);
  await page.locator('[data-editare="taiere"]').click();
  await expect(page.locator('[data-taiere="imbinare"]')).toHaveValue('zigzag');
  await expect(page.locator('[data-taiere="imbinare-pas"]')).toHaveValue('20');
  await expect(page.locator('[data-taiere="imbinare-inaltime"]')).toHaveValue('10');
  await expect(page.locator('[data-taiere="imbinare-raza"]')).toHaveValue('0');
});

test('Îmbinarea refuzată, cu motiv: dinții drepți de 10 cu raza 3 și pasul 60 pe 100 mm; puzzle-ul implicit la Y = 50 lasă două forme de 100 × 60 mm', async ({ page }) => {
  await importa(page, PATRAT);
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="x"]').fill('50');
  await page.locator('[data-taiere="imbinare"]').selectOption('dinti');
  await page.locator('[data-taiere="imbinare-inaltime"]').fill('10');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Modelul nu iese cu pasul, înălțimea și raza date (o rotunjire nu încape în dinte, sau o rază a valului ori a puzzle-ului e sub cea a frezei): mărește pasul sau înălțimea, ori micșorează raza.');
  await page.locator('[data-taiere="imbinare-pas"]').fill('60');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Niciun dinte întreg nu încape în tăietură, cu cel puțin o jumătate de pas drept la fiecare capăt: micșorează pasul.');
  await expect(randuri(page)).toHaveCount(1);
  await page.locator('[data-taiere="imbinare"]').selectOption('puzzle');
  await page.locator('[data-taiere="imbinare-pas"]').fill('40');
  await page.locator('[data-taiere="imbinare-inaltime"]').fill('20');
  await page.locator('[data-taiere="cu-y"]').check();
  await expect(page.locator('[data-taiere="y"]')).toHaveValue('50');
  await page.locator('[data-taiere="taie"]').click();
  await expect(page.getByTestId('taiere-stare')).toHaveText('Forme tăiate: 1; forme noi: 2, alese.');
  await page.keyboard.press('Escape');
  await expect(randuri(page)).toHaveCount(2);
  await cutii(page, '100.00 × 60.00 mm');
});

// ——— Taie în panouri (felia 10.3↑k, ADR 0181 §7) ———

const FIRMA = lwpolilinie([[0, 0], [2400, 0], [2400, 1000], [0, 1000]], true, { strat: 'FIRMA' });
const LITERA = lwpolilinie([[100, 100], [200, 100], [200, 300], [100, 300]], true, { strat: 'LITERA' });

test('Taie în panouri: grila pe pânză; firma de 2 400 × 1 000, cu o literă, în patru panouri egale de 1 200 × 500, „Panoul 1” … „Panoul 4”; Anulează', async ({ page }) => {
  await importa(page, FIRMA + LITERA);
  // Litera, despărțită de firmă (altfel ar fi o gaură în ea); amândouă rămân alese.
  await page.locator('[data-editare="degrupeaza"]').click();
  await expect(randuri(page)).toHaveCount(2);
  await page.locator('[data-editare="taiere"]').click();
  await expect(page.getByTestId('taiere-linia')).toHaveAttribute('data-axa', 'x');
  await page.locator('[data-taiere="panouri-latime"]').fill('1200');
  await page.locator('[data-taiere="panouri-inaltime"]').fill('900');
  // Cât lucrezi în blocul panourilor, pânza arată grila lor.
  await expect(page.getByTestId('taiere-linia')).toHaveAttribute('data-axa', 'grila');
  await expect(page.getByTestId('taiere-linia')).toHaveAttribute('data-coloane', '2');
  await expect(page.getByTestId('taiere-linia')).toHaveAttribute('data-randuri', '2');
  await expect(page.getByTestId('panouri-grila')).toHaveText('Formele alese: 2; grila: 2 × 2 panouri, peste 2400 × 1000 mm.');
  await expect(page.locator('[data-taiere="panouri-egale"]')).toBeChecked();
  // După număr, „egale / din colț” e stinsă; 1 × 1 nu are ce tăia, 11 × 10 trece de plafon.
  await page.locator('[data-taiere="panouri-coloane"]').fill('1');
  await expect(page.locator('[data-taiere="panouri-numar"]')).toBeChecked();
  await expect(page.locator('[data-taiere="panouri-colt"]')).toBeDisabled();
  await expect(page.getByTestId('panouri-motiv')).toHaveText('Formele încap într-un singur panou: nimic de tăiat.');
  await expect(page.locator('[data-taiere="panouri-taie"]')).toBeDisabled();
  await page.locator('[data-taiere="panouri-coloane"]').fill('11');
  await page.locator('[data-taiere="panouri-randuri"]').fill('10');
  await expect(page.getByTestId('panouri-motiv')).toHaveText('Peste 100 de panouri: alege panouri mai mari sau mai puține.');
  await page.locator('[data-taiere="panouri-marime"]').check();
  await expect(page.getByTestId('taiere-linia')).toHaveAttribute('data-coloane', '2');
  // Înapoi în blocul de sus, pânza arată linia.
  await page.locator('[data-taiere="x"]').click();
  await expect(page.getByTestId('taiere-linia')).toHaveAttribute('data-axa', 'x');
  await page.locator('[data-taiere="panouri-taie"]').click();
  await expect(page.getByTestId('panouri-stare')).toHaveText('Panouri: 4, alese („Panoul 1” … „Panoul 4”); forme tăiate: 3.');
  await page.keyboard.press('Escape');
  await expect(randuri(page)).toHaveText(['Panoul 1', 'Panoul 2', 'Panoul 3', 'Panoul 4']);
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]')).toHaveCount(4);
  // Anulează, cu panourile încă alese: alegerea rămasă arată spre forme care nu mai sunt, deci blocul ia toate formele foii
  // (firma și litera), nu una dintre ele.
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(2);
  await page.locator('[data-editare="taiere"]').click();
  await expect(page.getByTestId('panouri-grila')).toContainText('Nicio formă aleasă: toate formele foii (2)');
  await page.keyboard.press('Escape');
  // Reface: din nou cele patru panouri, fiecare de 1 200 × 500.
  await page.locator('[data-actiune="istoric.reface"]').click();
  await expect(randuri(page)).toHaveText(['Panoul 1', 'Panoul 2', 'Panoul 3', 'Panoul 4']);
  await cutii(page, '1200.00 × 500.00 mm');
});

test('Taie în panouri, fără nimic ales: toate formele foii; din colț, două forme de 1 200 × 900 și două de 1 200 × 100', async ({ page }) => {
  await importa(page, FIRMA);
  // Un clic pe gol, la stânga firmei (vederea e a foii, iar firma trece de ea spre dreapta și în sus), golește selecția.
  const gol = (await ecran(page, await vedere(page)))(-30, 50);
  await page.mouse.click(gol.x, gol.y);
  await expect(page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]')).toHaveCount(0);
  await page.locator('[data-editare="taiere"]').click();
  await page.locator('[data-taiere="panouri-latime"]').fill('1200');
  await page.locator('[data-taiere="panouri-inaltime"]').fill('900');
  await page.locator('[data-taiere="panouri-colt"]').check();
  await expect(page.getByTestId('panouri-grila')).toHaveText('Nicio formă aleasă: toate formele foii (1); grila: 2 × 2 panouri, peste 2400 × 1000 mm.');
  await page.locator('[data-taiere="panouri-taie"]').click();
  await expect(page.getByTestId('panouri-stare')).toHaveText('Panouri: 4, alese („Panoul 1” … „Panoul 4”); forme tăiate: 3.');
  await page.keyboard.press('Escape');
  await expect(randuri(page)).toHaveCount(4);
  for (const [k, text] of ['1200.00 × 900.00 mm', '1200.00 × 900.00 mm', '1200.00 × 100.00 mm', '1200.00 × 100.00 mm'].entries()) {
    await randuri(page).nth(k).click();
    await expect(page.locator('#root, body').getByText(text)).toBeVisible();
  }
});
