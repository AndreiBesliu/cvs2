/**
 * Căutarea peste toate filele atelierului Easy 3Draw (ADR 0281 §4, felia 3.Tp↑a), pe pagina de sine stătătoare a
 * planificatorului (din aceleași surse ca pachetul), servită de pe o origine a probei și cu three.js din pachet:
 * - „Caută o piesă”, lângă file (pe același rând, la capăt): la fiecare literă, galeria arată piesele găsite din toate
 *   familiile, în ordinea filelor; fiecare cuvânt căutat începe un cuvânt din numele de pe ecran, fără diacritice și fără
 *   majuscule („con”: Rotund / con, Bucșă / conector, Conector perpendicular, Conector în unghi, Roată conică, Conică dublă; „nic” nu găsește Technic);
 * - o piesă aleasă din rezultate se deschide cu fila ei, iar rezultatele rămân (se încearcă pe rând, cu focusul pe buton);
 *   Enter alege prima; Escape, golirea câmpului sau o filă întorc galeria familiei; fila își ține minte piesa aleasă așa;
 * - nicio potrivire: mesajul, cu textul căutat; peste model și peste „Calibrare”, căutarea arată rezultatele, iar alegerea
 *   duce la piesă;
 * - pe telefon (390 px), câmpul stă pe un rând al lui, cât tot rândul, fără depășire.
 */
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

const PAGINA = 'http://easy3draw.test/';

async function deschide(page: Page): Promise<void> {
  const { preview } = paginiPlanificator();
  await page.route(PAGINA, (r) => r.fulfill({ body: preview, contentType: 'text/html; charset=utf-8' }));
  await threeDinPachet(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(PAGINA);
  await intraIn3D(page);
  // atelierul pornit: galeria familiei piesei de acum (cărămida), înainte de orice căutare
  await expect(page.locator('#at-galerie [data-piesa="caramida"]')).toHaveAttribute('aria-pressed', 'true');
}
const camp = (page: Page) => page.locator('#at-cauta');
const gasite = (page: Page) => page.locator('#at-galerie [data-piesa]');
const fila = (page: Page, f: string) => page.locator(`#at-tipuri [data-fila="${f}"]`);
const filaApasata = (page: Page) => page.locator('#at-tipuri [aria-pressed="true"]');
const piesaApasata = (page: Page) => page.locator('#at-galerie [aria-pressed="true"]');
const titlu = (page: Page) => page.locator('#at-editor h2').first();

test('„con” găsește piesele din toate filele, în ordinea lor; alegerea le deschide cu fila lor, iar rezultatele rămân; o filă golește căutarea', async ({ page }) => {
  await deschide(page);
  // lângă file, pe același rând, la capăt
  const c = (await camp(page).boundingBox())!, cal = (await fila(page, 'calibrare').boundingBox())!;
  expect(Math.abs((c.y + c.height / 2) - (cal.y + cal.height / 2))).toBeLessThan(4);
  expect(c.x).toBeGreaterThan(cal.x + cal.width);
  await expect(camp(page)).toHaveAttribute('placeholder', 'Caută o piesă');
  await camp(page).fill('con');
  await expect(gasite(page)).toHaveText(['Rotund / con', 'Bucșă / conector', 'Conector perpendicular', 'Conector în unghi', 'Roată conică', 'Conică dublă']);
  await expect(page.locator('#at-galerie')).toHaveAttribute('aria-label', 'Piesele găsite');
  // la început, cărămida: fila ei apăsată, nicio piesă găsită apăsată
  await expect(filaApasata(page)).toHaveAttribute('data-fila', 'caramizi');
  await expect(piesaApasata(page)).toHaveCount(0);
  // alese pe rând: fila și editorul piesei; rezultatele rămân, cu focusul pe butonul ales
  for (const [k, f, h2] of [['conicaDubla', 'roti', 'Conică dublă'], ['rotund', 'caramizi', 'Rotund și con'], ['bucsa', 'legaturi', 'Bucșă și conector de ax']] as const) {
    await page.locator(`#at-galerie [data-piesa="${k}"]`).click();
    await expect(filaApasata(page)).toHaveAttribute('data-fila', f);
    await expect(piesaApasata(page)).toHaveAttribute('data-piesa', k);
    await expect(titlu(page)).toHaveText(h2);
    await expect(gasite(page)).toHaveCount(6);
    await expect(page.locator(`#at-galerie [data-piesa="${k}"]`)).toBeFocused();
  }
  await expect(camp(page)).toHaveValue('con');
  // o filă golește căutarea: galeria familiei, iar Roți își ține conica dublă, aleasă din rezultate
  await fila(page, 'roti').click();
  await expect(camp(page)).toHaveValue('');
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'conicaDubla');
  // toată familia Roților (câte spune fila ei: o piesă nouă în familie nu schimbă proba), nu rezultatele
  await expect(page.locator('#at-galerie')).toHaveAttribute('aria-label', 'Roți');
  await expect(gasite(page)).toHaveCount(Number(await fila(page, 'roti').locator('.at-nr').textContent()));
  await expect(gasite(page).first()).toHaveText('Roată dințată');
});

test('fără diacritice și majuscule, la început de cuvânt, fiecare cuvânt; nicio potrivire: mesajul; Enter alege prima, Escape golește', async ({ page }) => {
  await deschide(page);
  const cauta = async (t: string, piese: readonly string[]) => {
    await camp(page).fill(t);
    await expect(gasite(page)).toHaveText(piese as string[]);
  };
  await cauta('CARAMIDA', ['Cărămidă / placă', 'Cărămidă Technic']);
  await cauta('ştif', ['Știfturi pe lateral', 'Știft']);
  await cauta('roata con', ['Roată conică']);
  await cauta('  BRACK ', ['Suport (bracket)']);
  // în mijlocul cuvântului, nu: „nic” nu e începutul niciunui cuvânt (Technic, conică)
  await camp(page).fill('nic');
  await expect(gasite(page)).toHaveCount(0);
  await expect(page.locator('#at-galerie')).toHaveText('Nicio piesă nu se potrivește cu „nic”.');
  // un text fără litere nu găsește nimic (nu tot)
  await camp(page).fill(' / ');
  await expect(gasite(page)).toHaveCount(0);
  // Escape golește: galeria familiei piesei de acum (cărămizile)
  await camp(page).press('Escape');
  await expect(camp(page)).toHaveValue('');
  await expect(gasite(page)).toHaveCount(11);
  await expect(page.locator('#at-galerie')).toHaveAttribute('aria-label', 'Cărămizi');
  // Enter alege prima piesă găsită, iar fila ei o ține minte
  await camp(page).fill('fu');
  await expect(gasite(page)).toHaveText(['Fulie']);
  await camp(page).press('Enter');
  await expect(filaApasata(page)).toHaveAttribute('data-fila', 'roti');
  await expect(titlu(page)).toHaveText('Fulie');
  await expect(camp(page)).toHaveValue('fu');
  // golit cu mâna (ca butonul × al câmpului): galeria familiei, cu fulia
  await camp(page).fill('');
  await expect(page.locator('#at-galerie')).toHaveAttribute('aria-label', 'Roți');
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'fulie');
  // același text din nou, după golire: rezultatele, nu galeria familiei rămasă
  await camp(page).fill('fu');
  await expect(gasite(page)).toHaveText(['Fulie']);
  await camp(page).fill('');
  await fila(page, 'caramizi').click();
  await fila(page, 'roti').click();
  await expect(piesaApasata(page)).toHaveAttribute('data-piesa', 'fulie');
  // Enter fără căutare nu alege nimic
  await camp(page).press('Enter');
  await expect(titlu(page)).toHaveText('Fulie');
});

test('peste model și peste „Calibrare”, căutarea arată rezultatele; alegerea duce la piesă, cu fila ei', async ({ page }) => {
  await deschide(page);
  await page.locator('#at-in-model').click();
  await expect(page.locator('#at-vedere-mod [data-v="model"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#at-galerie')).toBeHidden();
  await camp(page).fill('bar');
  await expect(page.locator('#at-galerie')).toBeVisible();
  // „bar” începe și un cuvânt din „Elice de barcă” (fila Elice, după Legături)
  await expect(gasite(page)).toHaveText(['Bară', 'Elice de barcă']);
  // în vederea modelului nicio piesă nu e „de acum”: nimic apăsat
  await expect(piesaApasata(page)).toHaveCount(0);
  await expect(filaApasata(page)).toHaveCount(0);
  await page.locator('#at-galerie [data-piesa="bara"]').click();
  await expect(page.locator('#at-vedere-mod [data-v="piesa"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(filaApasata(page)).toHaveAttribute('data-fila', 'legaturi');
  await expect(titlu(page)).toHaveText('Bară');
  // pe Calibrare: căutarea arată rezultatele, golită ascunde galeria
  await fila(page, 'calibrare').click();
  await expect(page.locator('#at-galerie')).toBeHidden();
  await camp(page).fill('bil');
  await expect(gasite(page)).toHaveText(['Bilă']);
  await camp(page).fill('');
  await expect(page.locator('#at-galerie')).toBeHidden();
  await camp(page).fill('bil');
  await page.locator('#at-galerie [data-piesa="bila"]').click();
  await expect(filaApasata(page)).toHaveAttribute('data-fila', 'legaturi');
  await expect(titlu(page)).toHaveText('Placă cu bilă');
});

test('pe telefon (390 px): câmpul, pe un rând al lui, cât tot rândul; rezultatele încap, fiecare pe un rând, fără depășire', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await deschide(page);
  const c = (await page.locator('.at-cauta').boundingBox())!, n = (await page.locator('#at-tipuri').boundingBox())!;
  const ultimaFila = (await fila(page, 'calibrare').boundingBox())!;
  // pe un rând al lui (sub ultima filă), cât tot rândul filelor
  expect(c.y).toBeGreaterThanOrEqual(ultimaFila.y + ultimaFila.height);
  expect(Math.abs(c.width - n.width)).toBeLessThan(2);
  for (const t of ['roata', 'con', 'a']) {
    await camp(page).fill(t);
    await expect(gasite(page).first()).toBeVisible();
    expect(await page.evaluate(() => {
      const m = document.querySelector('#mod-3d')!;
      return [document.documentElement.scrollWidth - innerWidth, m.scrollWidth - m.clientWidth];
    })).toEqual([0, 0]);
    expect(await gasite(page).evaluateAll((bs) => bs.filter((b) => {
      const r = b.getBoundingClientRect(), d = document.createRange();
      d.selectNodeContents(b);
      const rs = [...d.getClientRects()].filter((x) => x.width > 0);
      return r.left < 0 || r.right > innerWidth || rs.some((x) => x.top >= rs[0]!.bottom - 1);
    }).map((b) => b.textContent))).toEqual([]);
  }
});
