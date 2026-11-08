import { expect, type Page } from '@playwright/test';

/**
 * Un clic adevărat pe un buton din cadrul extensiei, chiar după ce fereastra ei reapare (fila, după altă fereastră). Cadrul e
 * alt proces: în CI (Linux), un clic dat la ~60 ms după ce fereastra a reapărut n-a ajuns la buton (nicio cerere, nicio eroare;
 * urma rulării 42395280530, 07.11), deși verificările lui Playwright, făcute în cadru, treceau; pe Windows nu s-a pierdut
 * niciunul din 480. Se repetă doar clicul care n-a ajuns la buton (semnul îl pune clicul, o singură dată), deci butonul nu
 * lucrează de două ori; un cadru în care niciun clic nu ajunge pică tot. Butonul trebuie să rămână același element după clic
 * (un buton redesenat pierde semnul și ar primi al doilea clic).
 *
 * Folosit la orice clic în cadru care urmează imediat după `[data-extensii="fila"]` (a doua cădere, pe 07.11, a fost
 * `extensii.spec.ts`, la „eroare”, în rularea 42413819492).
 */
export async function clicDupaReaparitie(page: Page, selector: string): Promise<void> {
  const b = page.frameLocator('iframe.cadru-extensie').locator(selector);
  await b.evaluate((e) => {
    e.removeAttribute('data-clic-primit');
    e.addEventListener('click', () => { e.setAttribute('data-clic-primit', ''); }, { once: true });
  });
  await expect(async () => {
    if (await b.getAttribute('data-clic-primit') === null) await b.click({ timeout: 5000 });
    await expect(b).toHaveAttribute('data-clic-primit', '', { timeout: 2000 });
  }).toPass({ timeout: 15_000 });
}
