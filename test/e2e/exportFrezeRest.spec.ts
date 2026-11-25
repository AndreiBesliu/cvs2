/**
 * Frezele în plus ale unui rând din „Frezele mele” (ADR 0300 §4, felia 16.A↑b-5), în Edge: frezele de rest ale buzunarului
 * (doar cele plate mai mici decât freza dinainte), freza fundului plat și frezele ei de rest, freza dopului drept și freza
 * decupării benzii au, fiecare, lista „Din frezele mele”; aleasă, freza dă T-ul (regula rolurilor, printre frezele ferestrei),
 * Ø-ul, pasul lateral și originea; Exportă o scrie în document (fereastra redeschisă o citește), iar un diametru schimbat de mână
 * o face „Scrisă de mână”, doar pe freza aceea.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';
import { alege } from './ajutor-export.ts';

test.use({ locale: 'ro-RO' });

const fisa = (page: Page, cheie: string): Locator => page.locator(`[data-fisa="op"][data-operatie="${cheie}"]`);
const aleasaIn = (l: Locator): Locator => l.locator('option:checked');
const oferite = (l: Locator): Locator => l.locator('option:not([value=""])');

async function exporta(page: Page): Promise<void> {
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await d;
  await page.getByRole('button', { name: 'Închide' }).click();
}

test('buzunarul: frezele de rest din bibliotecă, doar cele mai mici; Exportă le scrie, iar Ø-ul de mână o scoate doar pe una', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const e1 = fisa(page, 'e1/e1');
  await e1.locator('input[data-camp="latura"][value="buzunar"]').check();
  await e1.locator('[data-camp="freza-biblioteca"]').selectOption({ label: 'Plată Ø12' });
  await expect(e1.locator('[data-camp="scula"]')).toHaveValue('6');
  // Prima freză de rest: doar frezele plate mai mici decât Ø12, în ordinea bibliotecii.
  await e1.locator('[data-camp="rest-adauga"]').click();
  const r0 = e1.locator('[data-rest-rand="0"]'), l0 = r0.locator('[data-camp="rest-biblioteca"]');
  await expect(aleasaIn(l0)).toHaveText('Scrisă de mână');
  await expect(oferite(l0)).toHaveText(['Plată Ø3,175', 'Plată Ø6']);
  await l0.selectOption({ label: 'Plată Ø6' });
  // T2, al bibliotecii (liber: freza buzunarului e T6), Ø6, pasul lateral 40 %.
  await expect(r0.locator('[data-camp="rest-scula"]')).toHaveValue('2');
  await expect(r0.locator('[data-camp="rest-diametru"]')).toHaveValue('6');
  await expect(r0.locator('[data-camp="rest-pas"]')).toHaveValue('2,4');
  // A doua: doar cele mai mici decât Ø6.
  await e1.locator('[data-camp="rest-adauga"]').click();
  const r1 = e1.locator('[data-rest-rand="1"]'), l1 = r1.locator('[data-camp="rest-biblioteca"]');
  await expect(oferite(l1)).toHaveText(['Plată Ø3,175']);
  await l1.selectOption({ label: 'Plată Ø3,175' });
  await expect(r1.locator('[data-camp="rest-scula"]')).toHaveValue('1');
  await expect(r1.locator('[data-camp="rest-diametru"]')).toHaveValue('3,175');
  await expect(r1.locator('[data-camp="rest-pas"]')).toHaveValue('1,27');
  await exporta(page);
  // Redeschisă, fereastra le citește din document; Ø-ul schimbat de mână o scoate doar pe prima.
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(aleasaIn(l0)).toHaveText('Plată Ø6');
  await expect(aleasaIn(l1)).toHaveText('Plată Ø3,175');
  await r0.locator('[data-camp="rest-diametru"]').fill('5');
  await expect(aleasaIn(l0)).toHaveText('Scrisă de mână');
  await expect(aleasaIn(l1)).toHaveText('Plată Ø3,175');
  await exporta(page);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(aleasaIn(l0)).toHaveText('Scrisă de mână');
  await expect(aleasaIn(l1)).toHaveText('Plată Ø3,175');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('fundul plat: freza dreaptă și frezele ei de rest din bibliotecă; doar frezele plate', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const e1 = fisa(page, 'e1/e1');
  await e1.locator('input[data-camp="latura"][value="vcarve"]').check();
  await e1.locator('[data-camp="freza-biblioteca"]').selectOption({ label: 'V90 Ø12' });
  await e1.locator('[data-camp="fund-plat"]').check();
  const fund = e1.locator('[data-camp="fund-biblioteca"]');
  await expect(oferite(fund)).toHaveText(['Plată Ø3,175', 'Plată Ø6', 'Plată Ø12']);
  await fund.selectOption({ label: 'Plată Ø6' });
  await expect(e1.locator('[data-camp="fund-scula"]')).toHaveValue('2');
  await expect(e1.locator('[data-camp="fund-diametru"]')).toHaveValue('6');
  await expect(e1.locator('[data-camp="fund-pas"]')).toHaveValue('2,4');
  await e1.locator('[data-camp="fund-rest-adauga"]').click();
  const r0 = e1.locator('[data-rest="fund:e1/e1"] [data-rest-rand="0"]'), l0 = r0.locator('[data-camp="fund-rest-biblioteca"]');
  await expect(oferite(l0)).toHaveText(['Plată Ø3,175']);
  await l0.selectOption({ label: 'Plată Ø3,175' });
  await expect(r0.locator('[data-camp="fund-rest-scula"]')).toHaveValue('1');
  await exporta(page);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(aleasaIn(fund)).toHaveText('Plată Ø6');
  await expect(aleasaIn(l0)).toHaveText('Plată Ø3,175');
  // Ø-ul fundului schimbat de mână: doar el devine „Scrisă de mână”.
  await e1.locator('[data-camp="fund-diametru"]').fill('5');
  await expect(aleasaIn(fund)).toHaveText('Scrisă de mână');
  await expect(aleasaIn(e1.locator('[data-camp="freza-biblioteca"]'))).toHaveText('V90 Ø12');
  await expect(aleasaIn(l0)).toHaveText('Plată Ø3,175');
});

test('dopul drept și decuparea benzii: T-ul urmează regula rolurilor, printre toate frezele ferestrei', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  // Dopul drept: freza operației e T1 Ø6, scrisă de mână; Plată Ø3,175 (T1 în bibliotecă) ia cel mai mic T liber, T2.
  const e1 = fisa(page, 'e1/e1');
  await e1.locator('input[data-camp="latura"][value="incrustatie-drept"]').check();
  await e1.locator('[data-camp="inc-freza-dop"]').check();
  const dop = e1.locator('[data-camp="dop-biblioteca"]');
  await expect(oferite(dop)).toHaveText(['Plată Ø3,175', 'Plată Ø6', 'Plată Ø12']);
  await dop.selectOption({ label: 'Plată Ø3,175' });
  await expect(e1.locator('[data-camp="dop-scula"]')).toHaveValue('2');
  await expect(e1.locator('[data-camp="dop-diametru"]')).toHaveValue('3,175');
  // Banda: freza decupării e aceeași cu a dopului de pe celălalt rând (același Ø, aceeași turație), deci ia T-ul ei, T2.
  const e2 = fisa(page, 'e2/e2');
  await e2.locator('input[data-camp="latura"][value="incrustatie"]').check();
  await alege(e2, 'inc-jur', 'banda');
  await e2.locator('[data-camp="banda-freza"]').check();
  const banda = e2.locator('[data-camp="banda-biblioteca"]');
  await expect(oferite(banda)).toHaveText(['Plată Ø3,175', 'Plată Ø6', 'Plată Ø12']);
  await banda.selectOption({ label: 'Plată Ø3,175' });
  await expect(e2.locator('[data-camp="banda-scula"]')).toHaveValue('2');
  await expect(e2.locator('[data-camp="banda-diametru"]')).toHaveValue('3,175');
  // Exportă le scrie (V-carve-ul benzii cere o freză în V, iar dopul încape în conul ei la 3 mm): fereastra redeschisă le citește.
  await e2.locator('[data-camp="freza-biblioteca"]').selectOption({ label: 'V60 Ø6' });
  await e2.locator('[data-camp="adancime"]').fill('3');
  await exporta(page);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(aleasaIn(dop)).toHaveText('Plată Ø3,175');
  await expect(aleasaIn(banda)).toHaveText('Plată Ø3,175');
  // Ø-ul decupării schimbat de mână o scoate doar pe ea; la fel, al dopului.
  await e2.locator('[data-camp="banda-diametru"]').fill('3');
  await expect(aleasaIn(banda)).toHaveText('Scrisă de mână');
  await expect(aleasaIn(dop)).toHaveText('Plată Ø3,175');
  await e1.locator('[data-camp="dop-diametru"]').fill('3');
  await expect(aleasaIn(dop)).toHaveText('Scrisă de mână');
});

test('legarea V-carve-urilor aceleiași piese ține și originea frezei fundului plat, ca lucrarea', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  // Scade: o piesă cu două operații, exteriorul și gaura (ADR 0067), ca în proba ordinii de mână.
  const randuri = page.getByTestId('lista-vectori').locator('button[data-instanta]');
  await randuri.first().click();
  await expect(page.locator('[data-editare="lipire"]')).toBeAttached();
  const pe = (await ecran(page, await vedere(page)))(85, 50);
  await page.keyboard.down('Shift');
  await page.mouse.click(pe.x, pe.y);
  await page.keyboard.up('Shift');
  await page.locator('[data-editare="boolean-scade"]').click();
  await expect(randuri).toHaveCount(1);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-fisa="op"]')).toHaveCount(2);
  const chei = await page.locator('[data-nav-op]').evaluateAll((r) => r.map((x) => x.getAttribute('data-nav-op') ?? ''));
  const [prima, a2] = chei as [string, string];
  const f1 = fisa(page, prima), f2 = fisa(page, a2);
  for (const e of [f1, f2]) {
    await e.locator('input[data-camp="latura"][value="vcarve"]').check();
    await e.locator('[data-camp="freza-biblioteca"]').selectOption({ label: 'V60 Ø6' });
    await e.locator('[data-camp="fund-plat"]').check();
  }
  // Același V, același fund scris de mână: al doilea rând se sapă odată cu primul.
  const legat = page.locator(`[data-nav-op="${a2}"] [data-legat]`);
  await expect(legat).toHaveText('cu 1');
  // Fundul primului din bibliotecă, al celui de-al doilea scris de mână cu aceleași valori: lucrarea le desparte, deci și fereastra.
  await f1.locator('[data-camp="fund-biblioteca"]').selectOption({ label: 'Plată Ø3,175' });
  for (const [c, v] of [['fund-scula', '1'], ['fund-diametru', '3,175'], ['fund-pas', '1,27']] as const) await f2.locator(`[data-camp="${c}"]`).fill(v);
  await expect(f1.locator('[data-camp="fund-scula"]')).toHaveValue('1');
  await expect(f1.locator('[data-camp="fund-pas"]')).toHaveValue('1,27');
  await expect(legat).toHaveCount(0);
  // Și al celui de-al doilea din bibliotecă: aceeași freză, din nou legate.
  await f2.locator('[data-camp="fund-biblioteca"]').selectOption({ label: 'Plată Ø3,175' });
  await expect(legat).toHaveText('cu 1');
});

test('frezele de rest stau într-un tabel cu capul coloanelor, cu „Adaugă” ca buton și titlul o singură dată (auditul exportului, 9)', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const e1 = fisa(page, 'e1/e1');
  await e1.locator('input[data-camp="latura"][value="buzunar"]').check();
  const grup = e1.locator('[data-grup="rest"]');
  // Fără freze de rest, fără cap de tabel; butonul se vede ca buton (cu margine), nu ca text.
  await expect(grup.getByRole('columnheader')).toHaveCount(0);
  const adaug = grup.locator('[data-camp="rest-adauga"]');
  expect(await adaug.evaluate((b) => getComputedStyle(b).borderTopColor)).not.toBe('rgba(0, 0, 0, 0)');
  await adaug.click();
  await expect(grup.getByRole('columnheader')).toHaveText(['Din frezele mele', 'T', 'Ø (mm)', 'Pasul lateral (mm)']);
  // „Frezele de rest” e titlul grupului; în rând nu se mai repetă.
  await expect(grup.getByText('Frezele de rest', { exact: true })).toHaveCount(1);
  // Pe fundul plat (alt grup), lista își păstrează numele, iar capul e același.
  await e1.locator('input[data-camp="latura"][value="vcarve"]').check();
  await e1.locator('[data-camp="fund-plat"]').check();
  await e1.locator('[data-camp="fund-rest-adauga"]').click();
  const fund = e1.locator('[data-rest="fund:e1/e1"]');
  // Nicio freză mai mică decât cea a fundului (Ø3,175) în bibliotecă: fără coloana listei.
  await expect(fund.getByRole('columnheader')).toHaveText(['T', 'Ø (mm)', 'Pasul lateral (mm)']);
  await e1.locator('[data-camp="fund-biblioteca"]').selectOption({ label: 'Plată Ø6' });
  await expect(fund.getByText('Frezele de rest', { exact: true })).toHaveCount(1);
  await expect(fund.getByRole('columnheader')).toHaveText(['Din frezele mele', 'T', 'Ø (mm)', 'Pasul lateral (mm)']);
});
