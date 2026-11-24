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

/**
 * Un clic adevărat pe un buton din cadrul extensiei care își închide cadrul (`host.inchide()`). Se așteaptă urmarea clicului,
 * cadrul scos din pagină, nu întoarcerea lui: cadrul e alt proces, iar clicul îl trimite sesiunea paginii, deci când cadrul
 * dispare înainte să-și confirme evenimentul, `click()` nu se mai întoarce, deși fereastra s-a închis (30 s, apoi proba cade).
 * Văzut în CI pe 18.11 (`extensii.spec.ts`) și de două ori pe 23.11 (`extensii.lucru.spec.ts`); reprodus pe 23.11 cu proba
 * repetată de 200 de ori pe zece lucrători: 3 clicuri neîntoarse.
 *
 * Un clic care cade cu adevărat (butonul lipsește, e acoperit) își spune eroarea: cadrul e încă acolo. Un cadru care nu se
 * închide pică la așteptarea lui.
 */
export async function clicCareInchideCadrul(page: Page, selector: string): Promise<void> {
  const cadre = page.locator('iframe.cadru-extensie');
  const inchis = expect(cadre).toHaveCount(0, { timeout: 15_000 });
  const clic = page.frameLocator('iframe.cadru-extensie').locator(selector).click()
    .catch(async (e: unknown) => { if (await cadre.count() > 0) throw e; });
  // cea care pierde întrecerea poate cădea mai târziu (pagina închisă la capătul probei): fără respingeri neprinse
  inchis.catch(() => { /* judecată mai jos, la `await inchis` */ });
  clic.catch(() => { /* judecată în întrecere */ });
  await Promise.race([clic, inchis]);
  await inchis;
}

/**
 * Un clic adevărat pe un buton din cadrul extensiei care își reface cadrul pe loc (`host.reporneste()`): aceeași cursă ca la
 * `clicCareInchideCadrul`. Cadrul vechi dispare înainte să-și confirme evenimentul, iar `click()` nu se mai întoarce, deși
 * repornirea s-a făcut (30 s, apoi proba cade). Văzut în CI pe 24.11 (`extensii.lucru.spec.ts:228`, rularea 45404468217) și
 * reprodus în aceeași zi cu proba repetată de 120 de ori pe zece lucrători: 6 clicuri neîntoarse, la cele două clicuri care
 * repornesc pe loc. Se așteaptă urmarea clicului (`urmare`: ce se vede în cadrul nou), nu întoarcerea lui.
 *
 * Un clic care cade cu adevărat (butonul lipsește, e acoperit) își spune eroarea dacă urmarea nu vine; o repornire care nu
 * are loc pică la așteptarea urmării.
 */
export async function clicCareRefaceCadrul(page: Page, selector: string, urmare: () => Promise<void>): Promise<void> {
  const venita = urmare();
  // cea care pierde întrecerea poate cădea mai târziu (pagina închisă la capătul probei): fără respingeri neprinse
  venita.catch(() => { /* judecată mai jos, la `await venita` */ });
  const clic = page.frameLocator('iframe.cadru-extensie').locator(selector).click()
    .catch(async (e: unknown) => { try { await venita; } catch { throw e; } });
  clic.catch(() => { /* judecată în întrecere */ });
  await Promise.race([clic, venita]);
  await venita;
}
