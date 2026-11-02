import { test, expect, type Page } from '@playwright/test';
import { adauga } from './ajutor-panza.ts';

/**
 * Contul clientului (ADR 0116), în Edge, pe instanța locală (fără Firebase). Butonul Cont deschide meniul contului (ADR
 * 0120): fără cont, logarea, manualul și sugestia, cu tastele unui meniu; logarea deschide panoul, care spune că contul nu e
 * disponibil aici, cu nota de confidențialitate (locurile operatorului marcate). Cu un cont ținut, butonul arată inițialele și
 * numele, meniul numele și proba, raportările (ADR 0116 §C) și ieșirea, care scoate contul; ferestrele raportărilor spun și
 * ele că nu sunt disponibile aici. Exportul G-code se judecă din contul ținut în browser: un drept expirat îl oprește, cu
 * motivul; unul în probă îl lasă; fără cont, ca până acum.
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

test('butonul Cont deschide meniul: fără cont, logarea, manualul și sugestia; tastele meniului; logarea deschide panoul', async ({ page }) => {
  await page.goto('/');
  const buton = page.locator('[data-editare="cont"]');
  await expect(buton).toHaveText('Cont');
  await expect(buton).toHaveAttribute('title', 'Contul: logarea, planul, raportările și manualul');
  await expect(buton).toHaveAttribute('aria-haspopup', 'menu');
  await expect(buton).toHaveAttribute('aria-expanded', 'false');
  // Lângă butonul temei, sus în dreapta (cererea owner-ului din 01.11), nu în extensia barei: imediat la dreapta lui, pe
  // același rând. Manualul și sugestia nu mai stau în extensie (ADR 0120).
  await expect(page.locator('#loc-cont [data-editare="cont"]')).toHaveCount(1);
  await expect(page.locator('#loc-extensie [data-editare="cont"], #loc-extensie [data-editare="manual"], #loc-extensie [data-editare="sugestie"]')).toHaveCount(0);
  const tema = await page.locator('[data-actiune="vedere.tema"]').boundingBox();
  const cont = await buton.boundingBox();
  expect(tema && cont && cont.x >= tema.x + tema.width && cont.x - (tema.x + tema.width) < 24 && Math.abs(cont.y + cont.height / 2 - (tema.y + tema.height / 2)) < 4)
    .toBe(true);

  // Meniul: sub buton, aliniat la dreapta lui; capul spune că nu e nimeni logat; focusul pe primul rând.
  await buton.click();
  const meniu = page.getByTestId('meniu-cont');
  await expect(buton).toHaveAttribute('aria-expanded', 'true');
  await expect(meniu.locator('[data-testid="meniu-cont-cap"] strong')).toHaveText('Nu ești logat');
  await expect(meniu.locator('[data-testid="meniu-cont-cap"] span')).toHaveText('Un cont nou: 14 zile de probă, fără card');
  await expect(meniu.locator('[role="menuitem"] > span')).toHaveText(['Intră sau creează cont…', 'Manualul', 'Trimite o sugestie…']);
  await expect(meniu.locator('[data-meniu-cont="manual"] kbd')).toHaveText('F1');
  const cutie = await meniu.boundingBox();
  const b = await buton.boundingBox();
  expect(cutie && b && Math.abs(cutie.x + cutie.width - (b.x + b.width)) < 1 && cutie.y >= b.y + b.height && cutie.y - (b.y + b.height) < 8).toBe(true);
  await expect(meniu.locator('[data-meniu-cont="intra"]')).toBeFocused();

  // Săgețile și Home / End trec între rânduri, în cerc; Escape închide meniul și întoarce focusul la buton.
  await page.keyboard.press('ArrowDown');
  await expect(meniu.locator('[data-meniu-cont="manual"]')).toBeFocused();
  await page.keyboard.press('End');
  await expect(meniu.locator('[data-meniu-cont="sugestie"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(meniu.locator('[data-meniu-cont="intra"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(meniu).toHaveCount(0);
  await expect(buton).toBeFocused();
  await expect(buton).toHaveAttribute('aria-expanded', 'false');
  // Săgeata în sus pe buton: meniul, cu focusul pe ultimul rând; un clic pe buton îl închide, iar unul în afara lui, la fel.
  await page.keyboard.press('ArrowUp');
  await expect(meniu.locator('[data-meniu-cont="sugestie"]')).toBeFocused();
  await buton.click();
  await expect(meniu).toHaveCount(0);
  await buton.click();
  await expect(meniu).toBeVisible();
  await page.getByTestId('selectie').click();
  await expect(meniu).toHaveCount(0);
  // Tab mută focusul mai departe și închide meniul.
  await buton.click();
  await expect(meniu.locator('[data-meniu-cont="intra"]')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(meniu).toHaveCount(0);

  // Logarea deschide panoul contului: pe instanța locală, contul nu e disponibil.
  await buton.click();
  await meniu.locator('[data-meniu-cont="intra"]').click();
  await expect(meniu).toHaveCount(0);
  const dialog = page.getByTestId('dialog-cont');
  await expect(dialog.locator('[data-cont="indisponibil"]')).toHaveText('Contul nu e disponibil pe instanța asta (fără configurația Firebase).');
  await dialog.getByTestId('cont-nota').locator('summary').click();
  await expect(dialog.getByTestId('cont-nota')).toContainText('Operatorul datelor: [de completat de owner].');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('cu un cont ținut: inițialele și numele pe buton; în meniu numele, proba și ieșirea, care scoate contul', async ({ page }) => {
  await cuCont(page, 'proba', 10 * ZI - 3_600_000);
  await page.goto('/');
  const buton = page.locator('[data-editare="cont"]');
  await expect(buton.locator('.cont-initiale')).toHaveText('A');
  await expect(buton.locator('.cont-nume')).toHaveText('Ana');
  await buton.click();
  const meniu = page.getByTestId('meniu-cont');
  await expect(meniu.locator('[data-testid="meniu-cont-cap"] strong')).toHaveText('Ana');
  await expect(meniu.locator('[data-testid="meniu-cont-cap"] span')).toHaveText('Proba: încă 10 zile');
  await expect(meniu.locator('[role="menuitem"] > span')).toHaveText([
    'Contul meu…', 'Raportările mele', 'Manualul', 'Raportează o problemă…', 'Trimite o sugestie…', 'Ieși din cont',
  ]);
  await expect(meniu.locator('[role="separator"]')).toHaveCount(1);
  // Fără server, niciun răspuns nou: fără semn pe buton și fără număr pe rând.
  await expect(buton.getByTestId('cont-semn')).toHaveCount(0);
  await expect(meniu.getByTestId('meniu-cont-necitite')).toHaveCount(0);
  // Ieșirea, pe instanța locală (fără Firebase): pleacă contul ținut; butonul spune din nou „Cont”, cu focusul pe el.
  await meniu.locator('[data-meniu-cont="iesi"]').click();
  await expect(meniu).toHaveCount(0);
  await expect(buton).toHaveText('Cont');
  await expect(buton).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('cncvs2.cont'))).toBeNull();
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('raportările, cu un cont ținut, pe instanța locală: ambele ferestre spun că nu sunt disponibile; Escape le închide', async ({ page }) => {
  await cuCont(page, 'proba', 10 * ZI);
  await page.goto('/');
  const buton = page.locator('[data-editare="cont"]');
  await buton.click();
  await page.getByTestId('meniu-cont').locator('[data-meniu-cont="raporteaza"]').click();
  const noua = page.getByTestId('dialog-raportare');
  await expect(noua.locator('#raport-titlu')).toHaveText('Raportează o problemă');
  await expect(noua.locator('[data-raport="indisponibil"]')).toHaveText('Raportările nu sunt disponibile pe instanța asta (fără configurația Firebase).');
  await expect(noua.locator('[data-buton="inchide-raport"]')).toHaveText('Închide');
  await page.keyboard.press('Escape');
  await expect(noua).toHaveCount(0);
  await buton.click();
  await page.getByTestId('meniu-cont').locator('[data-meniu-cont="raportari"]').click();
  const mele = page.getByTestId('dialog-raportarile-mele');
  await expect(mele.locator('#raportari-titlu')).toHaveText('Raportările mele');
  await expect(mele.locator('[data-raport="indisponibil"]')).toBeVisible();
  await mele.locator('[data-buton="inchide-raport"]').click();
  await expect(mele).toHaveCount(0);
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
