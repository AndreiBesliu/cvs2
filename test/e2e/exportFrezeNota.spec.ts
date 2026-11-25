/**
 * Nota „s-a schimbat în bibliotecă” pe rândurile ferestrei exportului (ADR 0300 §5, felia 16.A↑b-4), în Edge: o freză schimbată
 * în „Frezele mele” după ce a intrat în proiect își spune pe rând ce s-a schimbat, cu „Ia valorile noi” (pe rând) și „Pe toate
 * (N)” (pe toate frezele ferestrei din ea), scrise de Exportă; ștearsă din bibliotecă, „nu mai e în bibliotecă”, iar proiectul își
 * păstrează copia; o freză scrisă de mână, la fel cu una din bibliotecă, o numește („Scrisă de mână (ca …)”), fără să scrie nimic.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { adauga, deschideMeniulContului } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const fisa = (page: Page, cheie: string): Locator => page.locator(`[data-fisa="op"][data-operatie="${cheie}"]`);
const schimbata = (l: Locator): Locator => l.locator('[data-nota="biblioteca-schimbata"]');

async function exporta(page: Page): Promise<void> {
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await d;
  await page.getByRole('button', { name: 'Închide' }).click();
}

/** În „Frezele mele”: freza cu numele dat, cu câmpurile date schimbate (sau ștearsă, fără câmpuri); apoi fereastra se închide. */
async function inBiblioteca(page: Page, nume: string, campuri: Readonly<Record<string, string>> | 'sterge'): Promise<void> {
  const meniu = await deschideMeniulContului(page);
  await meniu.locator('[data-meniu-cont="freze"]').click();
  const f = page.getByRole('dialog', { name: 'Frezele mele' });
  await expect(f.locator('[data-freze="stare"]')).not.toContainText(/Se citește/u);
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

test('o freză schimbată în bibliotecă: nota pe rând, „Ia valorile noi” pe rând și „Pe toate”, scrise de Exportă', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  const e1 = fisa(page, 'e1/e1'), e2 = fisa(page, 'e2/e2');
  for (const e of [e1, e2]) await e.locator('[data-camp="freza-biblioteca"]').selectOption({ label: 'Plată Ø6' });
  // La zi: nicio notă.
  await expect(page.locator('[data-nota^="biblioteca-"]')).toHaveCount(0);
  await exporta(page);
  await inBiblioteca(page, 'Plată Ø6', { avans: '1400' });
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(schimbata(e1)).toContainText('În bibliotecă, „Plată Ø6” are acum avansul 1.400 (aici 1.000).');
  await expect(schimbata(e1).locator('[data-buton="ia-valorile-noi-toate"]')).toHaveText('Pe toate (2)');
  // Pe rând: doar e1 le ia; pe e2 nota rămâne, fără „Pe toate” (e singura).
  await schimbata(e1).locator('[data-buton="ia-valorile-noi"]').click();
  await expect(schimbata(e1)).toHaveCount(0);
  await expect(schimbata(e2)).toBeVisible();
  await expect(schimbata(e2).locator('[data-buton="ia-valorile-noi-toate"]')).toHaveCount(0);
  await exporta(page);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(schimbata(e1)).toHaveCount(0);
  await expect(schimbata(e2)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-fisa="op"]')).toHaveCount(0);
  // Încă o schimbare (turația și tăișul): „Pe toate (2)” le schimbă deodată pe amândouă, iar Exportă le scrie.
  await inBiblioteca(page, 'Plată Ø6', { turatie: '16000', tais: '20' });
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(schimbata(e1)).toContainText('turația 16.000 (aici 18.000)');
  await expect(schimbata(e1)).toContainText('tăișul 20 (aici 22)');
  await schimbata(e1).locator('[data-buton="ia-valorile-noi-toate"]').click();
  await expect(page.locator('[data-nota="biblioteca-schimbata"]')).toHaveCount(0);
  await exporta(page);
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.locator('[data-nota^="biblioteca-"]')).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('ștearsă din bibliotecă: „nu mai e în bibliotecă”, iar rândul își păstrează copia', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-actiune="export.gcode"]').click();
  const e1 = fisa(page, 'e1/e1');
  await e1.locator('[data-camp="freza-biblioteca"]').selectOption({ label: 'Plată Ø12' });
  await exporta(page);
  await inBiblioteca(page, 'Plată Ø12', 'sterge');
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(e1.locator('[data-nota="biblioteca-stearsa"]')).toContainText('„Plată Ø12” nu mai e în bibliotecă: proiectul își păstrează copia.');
  await expect(e1.locator('[data-camp="freza-biblioteca"] option:checked')).toHaveText('Plată Ø12');
  await expect(e1.locator('[data-camp="diametru"]')).toHaveValue('12');
});

test('frezele în plus: nota pe fundul plat și pe o freză de rest; recunoașterea celor scrise de mână', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  const e1 = fisa(page, 'e1/e1'), e2 = fisa(page, 'e2/e2');
  // Cercul taie cu Plată Ø6, aceeași freză ca fundul plat al dreptunghiului (mai jos): „Pe toate” le ia pe amândouă.
  await e2.locator('[data-camp="freza-biblioteca"]').selectOption({ label: 'Plată Ø6' });
  await e1.locator('input[data-camp="latura"][value="vcarve"]').check();
  await e1.locator('[data-camp="freza-biblioteca"]').selectOption({ label: 'V90 Ø12' });
  await e1.locator('[data-camp="fund-plat"]').check();
  // Fundul plat scris de mână (Ø3,175, ca Plată Ø3,175): recunoscut, fără să fie ales.
  const fund = e1.locator('[data-camp="fund-biblioteca"]');
  await expect(fund.locator('option:checked')).toHaveText('Scrisă de mână (ca „Plată Ø3,175”)');
  await fund.selectOption({ label: 'Plată Ø6' });
  await e1.locator('[data-camp="fund-rest-adauga"]').click();
  const r0 = e1.locator('[data-rest="fund:e1/e1"] [data-rest-rand="0"]');
  await r0.locator('[data-camp="fund-rest-biblioteca"]').selectOption({ label: 'Plată Ø3,175' });
  await exporta(page);
  await inBiblioteca(page, 'Plată Ø3,175', { plonjare: '250' });
  await inBiblioteca(page, 'Plată Ø6', { avans: '1200' });
  await page.locator('[data-actiune="export.gcode"]').click();
  // Nota fundului, sub lista lui; nota frezei de rest, pe rândul ei din tabel.
  const grupFund = e1.locator('[data-grup="fund"]');
  await expect(grupFund.locator('.campuri-fund > [data-nota="biblioteca-schimbata"]')).toContainText('avansul 1.200 (aici 1.000)');
  await expect(r0.locator('[data-nota="biblioteca-schimbata"]')).toContainText('plonjarea 250 (aici 300)');
  await r0.locator('[data-buton="ia-valorile-noi"]').click();
  await expect(r0.locator('[data-nota="biblioteca-schimbata"]')).toHaveCount(0);
  await expect(grupFund.locator('.campuri-fund > [data-nota="biblioteca-schimbata"]')).toBeVisible();
  // „Pe toate (2)” din nota fundului: fundul și freza cercului, deodată.
  await grupFund.locator('[data-buton="ia-valorile-noi-toate"]').click();
  await expect(page.locator('[data-nota="biblioteca-schimbata"]')).toHaveCount(0);
  // Freza V-ului, scrisă de mână cu valorile lui V60 Ø6: recunoscută.
  await e1.locator('[data-camp="diametru"]').fill('6');
  await e1.locator('[data-camp="unghi-v"]').fill('60');
  await expect(e1.locator('[data-camp="freza-biblioteca"] option:checked')).toHaveText('Scrisă de mână (ca „V60 Ø6”)');
});
