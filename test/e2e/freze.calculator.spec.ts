/**
 * Calculatorul avansului în „Frezele mele” (ADR 0305 §4, felia 16.A↑g-3), în Edge: strâns sub valorile de lucru și în fiecare
 * set pe material; cu avansul pe dinte și viteza de așchiere, scrie turația (din diametru) și avansul (din tăișuri); fără
 * viteză, doar avansul, din turația de acum; fără tăișuri sau cu o valoare greșită, motivul, fără să scrie.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { deschideMeniulContului } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

async function deschideFrezele(page: Page): Promise<Locator> {
  const meniu = await deschideMeniulContului(page);
  await meniu.locator('[data-meniu-cont="freze"]').click();
  const f = page.getByRole('dialog', { name: 'Frezele mele' });
  await expect(f.locator('.freze-rand-nume')).toHaveCount(6);
  return f;
}

const camp = (f: Locator, c: string): Locator => f.locator(`[data-freze-camp="${c}"]`);

test('calculatorul: cu Vc, turația și avansul; fără Vc, doar avansul; în set, cu valorile setului; motivele', async ({ page }) => {
  await page.goto('/');
  const f = await deschideFrezele(page);
  await f.locator('[data-freze="noua"]').click();
  // Freza nouă: plată Ø6, 2 tăișuri.
  await expect(camp(f, 'taisuri')).toHaveValue('2');
  const calc = f.locator('[data-freze="calculator"][data-unde="lucru"]');
  await expect(calc).not.toHaveAttribute('open', '');
  await calc.locator('summary').click();
  await expect(calc.locator('summary')).toHaveText('Calculatorul avansului');
  // 300 000 / (π · 6) = 15 915,5 → 15 920; 15 920 · 2 · 0,05 = 1 592.
  await calc.locator('[data-freze-calc="fz"]').fill('0,05');
  await calc.locator('[data-freze-calc="vc"]').fill('300');
  await calc.locator('[data-freze="calculeaza"]').click();
  await expect(camp(f, 'turatie')).toHaveValue('15920');
  await expect(camp(f, 'avans')).toHaveValue('1592');
  await expect(calc.locator('[data-freze-calc="rezultat"]')).toHaveText('Scrise: turația 15920 rot/min, avansul 1592 mm/min.');
  // Fără Vc: doar avansul, din turația de acum (15 920 · 2 · 0,1 = 3 184).
  await calc.locator('[data-freze-calc="vc"]').fill('');
  await calc.locator('[data-freze-calc="fz"]').fill('0,1');
  await calc.locator('[data-freze="calculeaza"]').click();
  await expect(camp(f, 'turatie')).toHaveValue('15920');
  await expect(camp(f, 'avans')).toHaveValue('3184');
  // Fără tăișuri: motivul; nimic scris.
  await camp(f, 'taisuri').fill('');
  await calc.locator('[data-freze-calc="fz"]').fill('0,2');
  await calc.locator('[data-freze="calculeaza"]').click();
  await expect(calc.locator('[data-freze-calc="rezultat"]')).toHaveText('Scrie întâi numărul de tăișuri al frezei (la Geometria).');
  await expect(camp(f, 'avans')).toHaveValue('3184');
  await camp(f, 'taisuri').fill('2');
  // Un avans pe dinte greșit.
  await calc.locator('[data-freze-calc="fz"]').fill('3');
  await calc.locator('[data-freze="calculeaza"]').click();
  await expect(calc.locator('[data-freze-calc="rezultat"]')).toHaveText('Avansul pe dinte: peste 0 și cel mult 2 mm.');
  // Într-un set pe material: cu turația setului (pornit de la valorile de acum, 15 920): 15 920 · 2 · 0,02 = 637.
  await f.locator('[data-freze="set-adauga"]').click();
  const calcSet = f.locator('[data-freze-set="0"] [data-freze="calculator"]');
  await calcSet.locator('summary').click();
  await calcSet.locator('[data-freze-calc="fz"]').fill('0,02');
  await calcSet.locator('[data-freze="calculeaza"]').click();
  await expect(f.locator('[data-freze-set="0"] [data-freze-set-camp="avans"]')).toHaveValue('637');
  await expect(camp(f, 'avans')).toHaveValue('3184');
});
