import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Tăierea din butoane mari a Atelierului (ADR 0250, felia 28.1↑d, planșa „C · Întunecat”): în panoul de proprietăți, felul
 * tăierii din butoane (apăsat = rolul de acum), − / + la adâncime și pas (0,5 mm, un pas de anulare), cartela frezei
 * („Schimbă” deschide exportul) și „Trimite la mașină”: fereastra exportului cu butonul ei, apoi programul în Mașina, nepornit.
 * Insulele rămân pe listă; „Trimite la mașină” e în paletă în orice aranjament. Pe foaie: dreptunghiul 100 × 60 din (20, 20)
 * și cercul R15 în (70, 50), cu freza Ø6.
 */
test.use({ locale: 'ro-RO' });

const ATELIER = '{"v":1,"aranjament":"atelier","densitate":"mare"}';
const taierea = (page: Page): Locator => page.getByTestId('prop-taierea');
const rol = (page: Page, r: string): Locator => taierea(page).locator(`[data-rol="${r}"]`);
const camp = (page: Page, c: string): Locator => taierea(page).locator(`input[data-camp="${c}"]`);
const buton = (page: Page, b: string): Locator => page.locator(`[data-buton="${b}"]`);
const fila = (page: Page, f: 'proiectare' | 'masina'): Locator => page.locator(`[data-actiune="vedere.${f}"]`);
const dialogExport = (page: Page): Locator => page.locator('[aria-labelledby="export-titlu"]');

/** Trage o fereastră de selecție între două puncte ale foii (mm): alege formele cuprinse în întregime. */
async function fereastra(page: Page, a: { x: number; y: number }, b: { x: number; y: number }): Promise<void> {
  const la = await ecran(page, await vedere(page));
  const [sa, sb] = [la(a.x, a.y), la(b.x, b.y)];
  await page.mouse.move(sa.x, sa.y);
  await page.mouse.down();
  await page.mouse.move((sa.x + sb.x) / 2, (sa.y + sb.y) / 2, { steps: 4 });
  await page.mouse.move(sb.x, sb.y, { steps: 4 });
  await page.mouse.up();
}

/**
 * Butoanele rolului au cel puțin 56 px (planșa), iar numele lor încap întregi: niciun cuvânt nu se rupe pe două rânduri
 * (fiecare are un singur dreptunghi) și fiecare stă în locul din buton, înăuntrul spațiului de margine. `scrollWidth` nu
 * ajunge: textul centrat iese pe ambele părți, iar ce iese în stânga nu se numără.
 */
async function numeIntregi(page: Page): Promise<void> {
  for (const b of await taierea(page).locator('[data-rol]').all()) {
    expect((await b.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
    expect(await b.evaluate((e) => {
      const n = e.firstChild;
      if (n?.nodeType !== Node.TEXT_NODE) return 'fără text';
      const s = getComputedStyle(e);
      const c = e.getBoundingClientRect();
      const stanga = c.left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft) - 0.5;
      const dreapta = c.right - parseFloat(s.borderRightWidth) - parseFloat(s.paddingRight) + 0.5;
      const r = document.createRange();
      let i = 0;
      for (const cuvant of (n.textContent ?? '').split(' ')) {
        r.setStart(n, i);
        r.setEnd(n, i + cuvant.length);
        const d = r.getClientRects();
        if (d.length !== 1) return `„${cuvant}” rupt`;
        if ((d[0]?.left ?? 0) < stanga || (d[0]?.right ?? 0) > dreapta) return `„${cuvant}” iese din locul lui`;
        i += cuvant.length + 1;
      }
      return 'întregi';
    }), await b.textContent() ?? '').toBe('întregi');
  }
}

/**
 * Fontul lat al probelor de așezare (13.A↑c): Verdana aici, DejaVu Sans pe Linux, unde `system-ui` e oricum lat. Completul de
 * pe `0905a07a` a căzut pe Linux exact aici: „Exterior” ieșea cu 9 px din butonul apăsat, iar pe Windows încăpea.
 */
async function fontLat(page: Page): Promise<void> {
  await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
}

async function inAtelier(page: Page): Promise<void> {
  await page.addInitScript((v) => { localStorage.setItem('cncvs2.aranjament', v); }, ATELIER);
  await page.goto('/');
  await expect(page.locator('.aplicatie')).toHaveAttribute('data-aranjament', 'atelier');
}

test('Insulele rămân pe listă (rolul din listă, câmpurile, fără „Trimite”); „Trimite la mașină” e totuși în paletă', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await expect(taierea(page)).toHaveAttribute('data-taierea', 'lista');
  await expect(taierea(page).locator('select[data-camp="rol"]')).toHaveValue('exterior');
  await expect(taierea(page).locator('[data-rol]')).toHaveCount(0);
  await expect(page.locator('[data-buton="adancime-plus"], [data-buton="freza"]')).toHaveCount(0);
  await expect(page.getByTestId('atelier-trimite')).toHaveCount(0);
  await page.locator('[data-actiune="import.svg"]').focus();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('trimite la');
  await expect(page.locator('[id="paleta-export.trimite"]')).toContainText('Trimite la mașină');
});

test('felul tăierii din butoane: rolul de acum apăsat; alt rol se scrie pe piesă (exportul îl arată), anularea îl pune la loc', async ({ page }) => {
  await inAtelier(page);
  await adauga(page, 'dreptunghi');
  await expect(taierea(page)).toHaveAttribute('data-taierea', 'butoane');
  // Tăierea stă prima în panou (planșa), deasupra poziției și a formei.
  const sus = async (l: Locator): Promise<number> => (await l.boundingBox())?.y ?? Number.NaN;
  expect(await sus(taierea(page))).toBeLessThan(await sus(page.locator('input[data-camp="pozitie-x"]')));
  await expect(taierea(page).locator('legend')).toHaveText('Cum se taie');
  await expect(taierea(page).locator('[data-rol]')).toHaveText(['Exterior', 'Interior', 'Pe linie', 'Buzunar', 'V-carve', 'Incrustație în V', 'Incrustație cu pereți drepți']);
  await expect(taierea(page).locator('select')).toHaveCount(0);
  await expect(rol(page, 'exterior')).toHaveAttribute('aria-pressed', 'true');
  await rol(page, 'interior').click();
  await expect(rol(page, 'interior')).toHaveAttribute('aria-pressed', 'true');
  await expect(rol(page, 'exterior')).toHaveAttribute('aria-pressed', 'false');
  await buton(page, 'freza').click();
  await expect(page.locator('[data-operatie] input[data-camp="latura"]:checked')).toHaveValue('interior');
  await page.getByRole('button', { name: 'Închide' }).click();
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(rol(page, 'exterior')).toHaveAttribute('aria-pressed', 'true');
  await numeIntregi(page);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('la 1024 × 768 (tableta culcată), cu panoul cel mai îngust (248 px), numele rolurilor rămân întregi', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await inAtelier(page);
  await adauga(page, 'dreptunghi');
  await expect(rol(page, 'exterior')).toHaveAttribute('aria-pressed', 'true');
  await numeIntregi(page);
  await fontLat(page);
  await numeIntregi(page);
});

test('în engleză, la 1024 × 768 și cu fontul lat, numele rolurilor rămân întregi', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.addInitScript(() => { localStorage.setItem('cncvs2.limba', 'en'); });
  await inAtelier(page);
  await adauga(page, 'dreptunghi');
  await expect(rol(page, 'exterior')).toHaveText('Outside');
  await fontLat(page);
  await numeIntregi(page);
});

test('găurirea apare doar pentru cercuri, ca în listă: rolurile oferite sunt ale formelor alese', async ({ page }) => {
  await inAtelier(page);
  await adauga(page, 'cerc');
  await expect(rol(page, 'gaurire')).toHaveText('Găurire');
  await rol(page, 'gaurire').click();
  await expect(rol(page, 'gaurire')).toHaveAttribute('aria-pressed', 'true');
  await expect(rol(page, 'exterior')).toHaveAttribute('aria-pressed', 'false');
});

test('− / + mută adâncimea și pasul cu 0,5 mm, câte un pas de anulare; − se oprește înainte de zero', async ({ page }) => {
  await inAtelier(page);
  await adauga(page, 'dreptunghi');
  await expect(camp(page, 'adancime')).toHaveValue('3');
  await buton(page, 'adancime-plus').click();
  await expect(camp(page, 'adancime')).toHaveValue('3,5');
  await buton(page, 'pas-minus').click();
  await buton(page, 'pas-minus').click();
  await expect(camp(page, 'pas')).toHaveValue('2');
  // Exportul vede valorile scrise.
  await buton(page, 'freza').click();
  await expect(page.locator('[data-operatie] [data-camp="adancime"]')).toHaveValue('3,5');
  await expect(page.locator('[data-operatie] [data-camp="pas"]')).toHaveValue('2');
  await page.getByRole('button', { name: 'Închide' }).click();
  // Fiecare apăsare e un pas de anulare.
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(camp(page, 'pas')).toHaveValue('2,5');
  // Câmpul dintre ele rămâne de scris; la 0,5, − nu mai poate (ar da 0), + poate.
  await camp(page, 'pas').fill('0,5');
  await camp(page, 'pas').press('Enter');
  await expect(buton(page, 'pas-minus')).toBeDisabled();
  await expect(buton(page, 'pas-plus')).toBeEnabled();
  await expect(buton(page, 'adancime-minus')).toHaveAccessibleName('Mai puțin adânc');
  await expect(buton(page, 'pas-plus')).toHaveAccessibleName('Pas mai mare');
});

test('cu valori diferite, − / + n-au de la ce porni (motivul în sfat); o valoare scrisă le face aceleași', async ({ page }) => {
  await inAtelier(page);
  await adauga(page, 'dreptunghi');
  await buton(page, 'adancime-plus').click();
  await adauga(page, 'cerc');
  await fereastra(page, { x: 10, y: 10 }, { x: 130, y: 90 });
  await expect(page.locator('.prop-multi')).toHaveText('2 piese selectate');
  await expect(camp(page, 'adancime')).toHaveValue('');
  await expect(buton(page, 'adancime-plus')).toBeDisabled();
  await expect(buton(page, 'adancime-plus')).toHaveAttribute('title', 'Formele alese au valori diferite: scrie una în câmp.');
  await camp(page, 'adancime').fill('4');
  await camp(page, 'adancime').press('Enter');
  await expect(buton(page, 'adancime-plus')).toBeEnabled();
  await buton(page, 'adancime-plus').click();
  await expect(camp(page, 'adancime')).toHaveValue('4,5');
});

test('cartela frezei: numărul, felul și diametrul frezei comune; „Schimbă” deschide fereastra exportului', async ({ page }) => {
  await inAtelier(page);
  await adauga(page, 'dreptunghi');
  const c = buton(page, 'freza');
  await expect(c.locator('.atelier-t')).toHaveText('T1');
  await expect(c.locator('.atelier-freza-nume')).toHaveText('Freză plată Ø6');
  await expect(c.locator('.atelier-freza-nota')).toHaveText('pentru o operație');
  await expect(c).toHaveAttribute('title', 'Freza se alege în fereastra Exportă G-code.');
  await c.click();
  await expect(dialogExport(page)).toBeVisible();
  // Deschisă de aici, fereastra e cea obișnuită: butonul ei e „Exportă”.
  await expect(buton(page, 'exporta')).toHaveText('Exportă');
});

test('„Trimite la mașină”: fereastra exportului cu butonul ei, apoi programul în Mașina (aceeași amprentă), nepornit', async ({ page }) => {
  await inAtelier(page);
  await adauga(page, 'dreptunghi');
  await expect(buton(page, 'trimite')).toBeInViewport();
  await buton(page, 'trimite').click();
  await expect(dialogExport(page)).toBeVisible();
  await expect(buton(page, 'exporta')).toHaveText('Trimite la mașină');
  await expect(buton(page, 'exporta')).toHaveAttribute('data-trimite', 'true');
  const descarcare = page.waitForEvent('download');
  await buton(page, 'exporta').click();
  const fisier = await descarcare;
  const sha = createHash('sha256').update(readFileSync(await fisier.path())).digest('hex');
  // Fără „Deschide în Mașina”: dialogul se închide singur, iar Mașina are programul, nepornit.
  await expect(dialogExport(page)).toHaveCount(0);
  await expect(fila(page, 'masina')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.masina-sha')).toHaveAttribute('data-sha', sha);
  await expect(page.getByTestId('masina-faza')).toHaveAttribute('data-faza', 'pregatit');
  // Înapoi pe Proiectare, „Exportă G-code” din bară deschide iar fereastra obișnuită.
  await fila(page, 'proiectare').click();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(buton(page, 'exporta')).toHaveText('Exportă');
});

test('cu un controler pe care senderul nu-l vorbește (NcStudio), butonul e „Exportă”: programul doar se descarcă', async ({ page }) => {
  await inAtelier(page);
  await adauga(page, 'dreptunghi');
  await buton(page, 'trimite').click();
  await page.locator('[data-camp="post"]').selectOption('ncstudio');
  await expect(buton(page, 'exporta')).toHaveText('Exportă');
  await expect(buton(page, 'exporta')).not.toHaveAttribute('data-trimite');
  await expect(page.getByTestId('post-descarcat')).toBeVisible();
  const descarcare = page.waitForEvent('download');
  await buton(page, 'exporta').click();
  await descarcare;
  await expect(page.getByTestId('export-stare')).toContainText('Descărcat');
  await expect(dialogExport(page)).toBeVisible();
  await expect(fila(page, 'proiectare')).toHaveAttribute('aria-current', 'page');
  await expect(buton(page, 'in-masina')).toHaveCount(0);
});

test('fără nimic pe foaie, „Trimite la mașină” e oprit, cu motivul scris (pe tabletă sfatul nu se vede)', async ({ page }) => {
  await inAtelier(page);
  await expect(page.getByTestId('atelier-trimite')).toBeVisible();
  await expect(buton(page, 'trimite')).toBeDisabled();
  await expect(buton(page, 'exporta-gcode')).toBeDisabled();
  await expect(page.locator('[data-motiv="trimite"]')).toHaveText('Desenează întâi ceva.');
  await adauga(page, 'dreptunghi');
  await expect(buton(page, 'trimite')).toBeEnabled();
  await expect(page.locator('[data-motiv="trimite"]')).toHaveCount(0);
});

test('în engleză: „How it cuts”, rolurile, − / + și „Send to machine”', async ({ page }) => {
  await inAtelier(page);
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await adauga(page, 'dreptunghi');
  await expect(taierea(page).locator('legend')).toHaveText('How it cuts');
  await expect(rol(page, 'exterior')).toHaveText('Outside');
  await expect(rol(page, 'pe-linie')).toHaveText('On the line');
  await expect(buton(page, 'adancime-plus')).toHaveAccessibleName('Deeper');
  await expect(buton(page, 'freza').locator('.atelier-freza-nume')).toHaveText('Flat end mill Ø6');
  await expect(buton(page, 'trimite')).toHaveText('Send to machine');
  await buton(page, 'trimite').click();
  await expect(buton(page, 'exporta')).toHaveText('Send to machine');
});
