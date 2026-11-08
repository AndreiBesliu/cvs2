import { test, expect, type Page } from '@playwright/test';
import { dxf, lwpolilinie } from '../unit/ajutor-dxf.ts';
import { ecran, vedere } from './ajutor-panza.ts';

/**
 * Unealta Cuțit (felia 10.3↑f, ADR 0181), în Edge, pe o placă 100 × 100 dintr-un DXF, fără nimic ales (răspunsul 2a: taie tot ce
 * trece): K alege unealta; felul **Linie** taie placa cu o tragere (cât tragi, locurile unde taie se numără), în două forme,
 * alese, iar Anulează o pune la loc; **Liber**, o urmă trasă cu mâna; **Pen**, trei clicuri și Enter; **Formă** (nota
 * owner-ului), un text pus pe placă: din ea ies litera și placa cu golul ei, iar textul rămâne; două cercuri adunate cu
 * Shift + clic taie împreună.
 */
test.use({ locale: 'ro-RO' });

const fisierDxf = (nume: string, text: string) => ({ name: nume, mimeType: 'application/dxf', buffer: Buffer.from(text, 'utf8') });
const PATRAT = lwpolilinie([[0, 0], [100, 0], [100, 100], [0, 100]], true, { strat: 'PATRAT' });
const GATA = 'Forme tăiate: 1; forme noi: 2, alese.';

const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');
const alese = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta][aria-pressed="true"]');
type La = (x: number, y: number) => { x: number; y: number };

/** Placa importată, apoi nimic ales (un clic cu Selecția pe foaie, departe de ea) și lipirea oprită: punctele stau unde e mausul. */
async function placa(page: Page): Promise<La> {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf('placa.dxf', dxf({ antet: [['$INSUNITS', 70, 4]], entitati: PATRAT })));
  await page.click('[data-buton="importa"]');
  await expect(page.locator('.dialog')).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(1);
  await page.locator('[data-editare="lipire"]').click();
  await expect(page.locator('[data-editare="lipire"]')).toHaveAttribute('aria-pressed', 'false');
  const la = await ecran(page, await vedere(page));
  await nimicAles(page, la);
  return la;
}

/** Un clic cu Selecția pe foaie, la 50 mm în dreapta plăcii, unde e doar pânza (panourile stau peste margini). */
async function nimicAles(page: Page, la: La): Promise<void> {
  await page.locator('[data-unealta="selectie"]').click();
  const q = la(150, 50);
  const sub = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.getAttribute('data-testid') ?? null, [q.x, q.y] as const);
  expect(sub, 'clicul cade pe pânză').toBe('panza');
  await page.mouse.click(q.x, q.y);
  await expect(alese(page)).toHaveCount(0);
}

async function cutit(page: Page, fel: 'linie' | 'pen' | 'liber' | 'forma'): Promise<void> {
  await page.locator('[data-unealta="cutit"]').click();
  await page.locator(`[data-cutit="${fel}"]`).click();
  await expect(page.locator(`[data-cutit="${fel}"]`)).toHaveAttribute('aria-pressed', 'true');
}

test('K alege Cuțitul; Linie: o tragere peste placă o taie în două forme, alese (cât tragi, locurile se văd); Anulează', async ({ page }) => {
  const la = await placa(page);
  await page.locator('[data-unealta="selectie"]').focus();
  await page.keyboard.press('k');
  await expect(page.locator('[data-unealta="cutit"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('bara-cutit')).toBeVisible();
  await page.locator('[data-cutit="linie"]').click();
  await expect(page.locator('[data-cutit="inchide"]')).toBeChecked();
  await expect(page.getByTestId('cutit-sfat')).toContainText('Trage cuțitul peste forme');
  const a = la(-10, 20), b = la(110, 60);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  // Până la mijloc, urma trece doar latura din stânga; până la capăt, și pe cea din dreapta.
  const m = la(50, 40);
  await page.mouse.move(m.x, m.y, { steps: 4 });
  await expect(page.getByTestId('cutit')).toHaveAttribute('data-locuri', '1');
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await expect(page.getByTestId('cutit')).toHaveAttribute('data-locuri', '2');
  await page.mouse.up();
  await expect(page.getByTestId('cutit-sfat')).toHaveText(GATA);
  await expect(randuri(page)).toHaveCount(2);
  await expect(alese(page)).toHaveCount(2);
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(randuri(page)).toHaveCount(1);
});

test('Liber: o urmă trasă cu mâna peste placă, netezită la ridicarea mausului, o taie în două forme', async ({ page }) => {
  const la = await placa(page);
  await cutit(page, 'liber');
  const p0 = la(-10, 50);
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  for (let x = -8; x <= 112; x += 2) {
    const q = la(x, 50 + 8 * Math.sin(x / 12));
    await page.mouse.move(q.x, q.y);
  }
  await page.mouse.up();
  await expect(page.getByTestId('cutit-sfat')).toHaveText(GATA);
  await expect(randuri(page)).toHaveCount(2);
});

test('Pen: trei clicuri și Enter taie placa pe drumul în V', async ({ page }) => {
  const la = await placa(page);
  await cutit(page, 'pen');
  await expect(page.getByTestId('pen')).toHaveClass(/pen-cutit/);
  for (const [x, y] of [[-10, 80], [50, 20], [110, 80]] as const) {
    const q = la(x, y);
    await page.mouse.click(q.x, q.y);
  }
  await expect(page.getByTestId('pen')).toHaveAttribute('data-noduri', '3');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pen-sfat')).toHaveText(GATA);
  await expect(randuri(page)).toHaveCount(2);
});

test('Formă (nota owner-ului): un text pus pe placă, clic pe el: din placă ies litera și placa cu golul ei; textul rămâne', async ({ page }) => {
  // Întâi textul „O” de 20 mm, cu ancora în (180, 60), în dreapta foii (panoul textului stă în stânga), apoi placa din DXF,
  // de la (150, 30) la (250, 130): litera stă toată în placă, fără să-i atingă marginea.
  await page.goto('/');
  await page.locator('[data-unealta="text"]').click();
  await page.locator('[data-text="continut"]').fill('O');
  const a = (await ecran(page, await vedere(page)))(180, 60);
  await page.mouse.click(a.x, a.y);
  await page.click('[data-text="adauga"]');
  await expect(randuri(page)).toHaveCount(1);
  const placaMutata = lwpolilinie([[150, 30], [250, 30], [250, 130], [150, 130]], true, { strat: 'PLACA' });
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf('placa.dxf', dxf({ antet: [['$INSUNITS', 70, 4]], entitati: placaMutata })));
  await page.click('[data-buton="importa"]');
  await expect(page.locator('.dialog')).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(2);
  const la = await ecran(page, await vedere(page));
  await page.locator('[data-unealta="selectie"]').click();
  const gol = la(300, 80);
  expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.getAttribute('data-testid') ?? null, [gol.x, gol.y] as const)).toBe('panza');
  await page.mouse.click(gol.x, gol.y);
  await expect(alese(page)).toHaveCount(0);
  await cutit(page, 'forma');
  // Un clic în mijlocul literei: cel mai mic contur care îl cuprinde e al textului, deci textul e cuțitul.
  const m = la(187, 70);
  await page.mouse.click(m.x, m.y);
  await expect(page.getByTestId('cutit-sfat')).toHaveText(GATA);
  await expect(randuri(page)).toHaveCount(3);
  await expect(alese(page)).toHaveCount(2);
});

test('Formă: Shift + clic adună un cerc în cuțit, clicul pe al doilea taie placa cu amândouă', async ({ page }) => {
  const la = await placa(page);
  // Două cercuri puse cu unealta Cerc (un clic, raza din câmp, 15 mm), în placă.
  await page.locator('[data-unealta="cerc"]').click();
  for (const [x, y] of [[30, 50], [70, 50]] as const) {
    const q = la(x, y);
    await page.mouse.click(q.x, q.y);
  }
  await expect(randuri(page)).toHaveCount(3);
  await nimicAles(page, la);
  await cutit(page, 'forma');
  const c1 = la(45, 50), c2 = la(85, 50);
  await page.keyboard.down('Shift');
  await page.mouse.click(c1.x, c1.y);
  await page.keyboard.up('Shift');
  await expect(page.getByTestId('cutit')).toHaveAttribute('data-adunate', '1');
  await expect(page.getByTestId('cutit-sfat')).toHaveText('Forme în cuțit: 1. Clic pe încă una (sau Enter) taie cu toate, Esc le lasă.');
  await page.mouse.click(c2.x, c2.y);
  await expect(page.getByTestId('cutit-sfat')).toHaveText(GATA);
  // Placa: cele două discuri și placa cu două găuri; cercurile-cuțit rămân.
  await expect(randuri(page)).toHaveCount(4);
});
