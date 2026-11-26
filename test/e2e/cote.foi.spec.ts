import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Măsoară între foi (ADR 0330, întrebarea 13a, felia 10.4↑f), în browser: foaia 1 (300 × 200, implicită) cu „Adaugă
 * dreptunghi” (100 × 60 din (20, 20)), „+ Foaie nouă” (tot 300 × 200, activă) cu același dreptunghi; cu „Toate foile pe
 * pânză”, foaia 1 stă la stânga, la X − 400 față de foaia activă (300 + 100 între foi). Măsoară din vârful (20, 80) al foii
 * active până lângă vârful (20, 80) al foii 1, adică (−380, 80): lipit, 400 mm pe hârtie. Măsura nu se păstrează (nici cu
 * Enter), iar o măsură doar pe foaia activă are în continuare „Păstrează” (și Enter o face cotă).
 */
test.use({ locale: 'ro-RO' });

type P = { readonly x: number; readonly y: number };
const strat = (page: Page) => page.getByTestId('strat-cote');
const cote = (page: Page) => page.locator('[data-testid="strat-cote"] g[data-cota]:not(.cota-noua)');

/** Un clic la câțiva pixeli de punctul din lume (lipirea îl trage înapoi pe punct). */
async function clicLanga(page: Page, p: P): Promise<void> {
  const s = (await ecran(page, await vedere(page)))(p.x, p.y);
  await page.mouse.move(s.x + 3, s.y - 2, { steps: 2 });
  await page.mouse.click(s.x + 3, s.y - 2);
}

test('cu „Toate foile pe pânză”, Măsoară se lipește de vârful foii vecine (400 mm), fără „Păstrează”; Enter n-o face cotă', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-unealta="selectie"]').click();
  await page.getByTestId('lista-vectori').locator('[data-actiune="foaie.adauga"]').click();
  await adauga(page, 'dreptunghi');
  // Pornit, comutatorul încadrează toate foile (deja pornit, din browser, întâi se oprește).
  const comutator = page.locator('[data-actiune="vedere.toate-foile"]');
  if ((await comutator.getAttribute('aria-pressed')) === 'true') await comutator.click();
  await expect(comutator).toHaveAttribute('aria-pressed', 'false');
  await comutator.click();
  await expect(comutator).toHaveAttribute('aria-pressed', 'true');

  await page.locator('[data-unealta="selectie"]').focus();
  await page.keyboard.press('m');
  await expect(strat(page)).toHaveAttribute('data-fel', 'masoara');
  await clicLanga(page, { x: 20, y: 80 });
  await clicLanga(page, { x: -380, y: 80 });
  const m = page.getByTestId('masura');
  await expect(m).toContainText('400 mm');
  await expect(m).toContainText('Δy 0');
  await expect(page.getByTestId('masura-alta-foaie')).toHaveText('Între foi: doar măsura, nu se păstrează');
  await expect(page.getByTestId('masura-pastreaza')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('cote-sfat')).toHaveText('Între foi: doar măsura, nu se păstrează');
  await expect(cote(page)).toHaveCount(0);
  await expect(m).toContainText('400 mm');

  // Pe foaia activă, măsura se păstrează ca înainte: lățimea dreptunghiului, 100 mm.
  await clicLanga(page, { x: 20, y: 80 });
  await clicLanga(page, { x: 120, y: 80 });
  await expect(m).toContainText('100 mm');
  await expect(page.getByTestId('masura-alta-foaie')).toHaveCount(0);
  // „Păstrează” e lângă cursor, aici sub panoul din dreapta: Enter face același lucru.
  await expect(page.getByTestId('masura-pastreaza')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(cote(page)).toHaveCount(1);
  await expect(cote(page).first()).toHaveAttribute('data-text', '100');
});
