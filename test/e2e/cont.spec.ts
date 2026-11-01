import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

/**
 * Contul clientului (ADR 0116), în Edge, pe instanța locală (fără Firebase): butonul Cont deschide panoul, care spune că
 * contul nu e disponibil aici, cu nota de confidențialitate (locurile operatorului marcate); Escape îl închide. Exportul
 * G-code se judecă din contul ținut în browser: un drept expirat îl oprește, cu motivul; unul în probă îl lasă; fără cont,
 * ca până acum.
 */
test.use({ locale: 'ro-RO' });

const ZI = 86_400_000;
const TOATE = ['desen', 'cam', 'export-gcode', 'export-vectori', 'masina'];

/** Contul ținut de aplicație, scris în browser înaintea pornirii (ca după o logare). */
async function cuCont(page: Page, plan: 'proba' | 'expirat', ramase = 0): Promise<void> {
  await page.addInitScript(([p, r, toate]) => {
    const acum = Date.now();
    const capabilitati = p === 'expirat' ? toate.filter((c) => c !== 'export-gcode' && c !== 'masina') : toate;
    localStorage.setItem('cncvs2.cont', JSON.stringify({
      uid: 'u1', email: 'ana@exemplu.ro', nume: 'Ana',
      drept: { plan: p, capabilitati, pana: p === 'proba' ? acum + r : null, calculatLa: acum, zileOffline: 7 },
    }));
  }, [plan, ramase, TOATE] as const);
}

test('butonul Cont deschide panoul: pe instanța locală, contul nu e disponibil; nota de confidențialitate; Escape îl închide', async ({ page }) => {
  await page.goto('/');
  const buton = page.locator('[data-editare="cont"]');
  await expect(buton).toHaveText('Cont');
  await expect(buton).toHaveAttribute('title', 'Contul: logarea, planul și proba');
  // Lângă butonul temei, sus în dreapta (cererea owner-ului din 01.11), nu în extensia barei: imediat la dreapta lui, pe
  // același rând.
  await expect(page.locator('#loc-cont [data-editare="cont"]')).toHaveCount(1);
  await expect(page.locator('#loc-extensie [data-editare="cont"]')).toHaveCount(0);
  const tema = await page.locator('[data-actiune="vedere.tema"]').boundingBox();
  const cont = await buton.boundingBox();
  expect(tema && cont && cont.x >= tema.x + tema.width && cont.x - (tema.x + tema.width) < 24 && Math.abs(cont.y + cont.height / 2 - (tema.y + tema.height / 2)) < 4)
    .toBe(true);
  await buton.click();
  const dialog = page.getByTestId('dialog-cont');
  await expect(dialog.locator('[data-cont="indisponibil"]')).toHaveText('Contul nu e disponibil pe instanța asta (fără configurația Firebase).');
  await dialog.getByTestId('cont-nota').locator('summary').click();
  await expect(dialog.getByTestId('cont-nota')).toContainText('Operatorul datelor: [de completat de owner].');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('un drept expirat ținut în browser oprește exportul G-code, cu motivul', async ({ page }) => {
  await cuCont(page, 'expirat');
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  const exporta = page.locator('[data-actiune="export.gcode"]');
  await expect(exporta).toBeDisabled();
  await expect(exporta).toHaveAttribute('title', 'Planul contului tău nu include funcția asta (vezi Cont, sus în dreapta).');
});

test('cu proba în curs exportul G-code merge, ca fără cont', async ({ page }) => {
  await cuCont(page, 'proba', 10 * ZI);
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await expect(page.locator('[data-actiune="export.gcode"]')).toBeEnabled();
});
