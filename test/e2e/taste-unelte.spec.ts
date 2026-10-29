import { test, expect } from '@playwright/test';

test.use({ locale: 'ro-RO', viewport: { width: 1400, height: 900 } });

/**
 * Tasta fiecărei unelte, scrisă în colțul dreapta-jos al butonului (cererea owner-ului din 25.10: „langa iconita ei, fara sa
 * o deranjeze cumva”): în sfertul dreapta-jos, fără să atingă iconița, fără să prindă clicul; tasta scrisă alege unealta.
 */
test('tasta fiecărei unelte: în colțul dreapta-jos, lângă iconiță, fără s-o atingă și fără să prindă clicul; tasta chiar alege unealta', async ({ page }) => {
  await page.goto('/');
  const butoane = page.locator('.bara-editare .unealta');
  await expect(butoane).toHaveCount(10);
  const masuri = await butoane.evaluateAll((bb) => bb.map((b) => {
    const r = b.getBoundingClientRect();
    const e = b.querySelector('.tasta-unealta')!.getBoundingClientRect();
    const i = b.querySelector('svg')!.getBoundingClientRect();
    const sub = document.elementFromPoint(e.left + e.width / 2, e.top + e.height / 2);
    return {
      unealta: b.getAttribute('data-unealta'), tasta: b.querySelector('.tasta-unealta')!.textContent,
      inSfert: e.left >= r.left + r.width / 2 && e.top >= r.top + r.height / 2 && e.right <= r.right && e.bottom <= r.bottom,
      atingeIconita: !(e.left >= i.right || e.right <= i.left || e.top >= i.bottom || e.bottom <= i.top),
      clicPeButon: sub !== null && sub.closest('.unealta') === b,
    };
  }));
  expect(masuri.map((m) => [m.unealta, m.tasta])).toEqual([
    ['selectie', 'V'], ['transformare', 'S'], ['noduri', 'N'], ['pen', 'B'], ['dreptunghi', 'R'], ['cerc', 'O'], ['elipsa', 'E'], ['linie', 'L'], ['poligon', 'P'], ['text', 'X'],
  ]);
  for (const m of masuri) expect([m.unealta, m.inSfert, m.atingeIconita, m.clicPeButon]).toEqual([m.unealta, true, false, true]);
  for (const m of masuri) {
    await page.keyboard.press(m.tasta!.toLowerCase());
    await expect(page.locator(`[data-unealta="${m.unealta}"]`)).toHaveAttribute('aria-pressed', 'true');
  }
});
