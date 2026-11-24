import { test, expect, type Locator, type Page } from '@playwright/test';
import { impacheteaza, scrieZip } from '../../scripts/impacheteaza-extensie.ts';
import { citesteZip } from '../../src/extensii/zip.ts';
import { biblioteca, bibliotecaDeProba, deschideBiblioteca, deschideMeniul, pagina, paginaDinCatalog } from './ajutor-biblioteca.ts';

/**
 * Claritatea extensiilor (ADR 0232 §B, felia 3.Xi-2), în Edge:
 * - „Ce poate face” înșiră permisiunile după cât de sensibile sunt (mașina prima, marcată), iar fraza izolării nu le mai
 *   contrazice;
 * - filele bibliotecii se numesc „Din bibliotecă” și „Instalate”; fără internet (sau cu un catalog stricat), fereastra trece
 *   singură pe „Instalate”, cu o bandă și „Reîncearcă”, iar pagina nu mai spune „Alege o extensie din listă” lângă o listă
 *   goală;
 * - meniul marchează extensia deschisă; fila ei taie un nume lung și are un × cât o țintă;
 * - măruntele: subtextele de cel puțin 12 px, „Verificată de cvs2 la instalare.”, meniul doar cu rânduri de meniu.
 */
test.use({ locale: 'ro-RO' });

const SALUT = impacheteaza('extensii/salut').octeti;

/** Pachetul „Salut”, cu manifestul schimbat. */
async function salut(schimbari: Record<string, unknown>): Promise<Buffer> {
  const z = await citesteZip(SALUT, { fisiere: 16, octetiFisier: 1 << 20, octetiTotal: 1 << 22 });
  if (!z.ok) throw new Error('pachetul de probă nu se citește');
  return Buffer.from(scrieZip(z.intrari.map((i) => {
    if (i.nume !== 'extensie.json') return i;
    const m = { ...JSON.parse(new TextDecoder().decode(i.octeti)) as Record<string, unknown>, ...schimbari };
    return { nume: i.nume, octeti: new TextEncoder().encode(JSON.stringify(m)) };
  })));
}

const confirmare = (page: Page): Locator => page.getByTestId('extensii-instalare');
const spatiu = (page: Page): Locator => page.getByTestId('spatiu-extensie');
const file = (page: Page): Locator => biblioteca(page).locator('[role="tab"]');

async function alegeFisier(page: Page, nume: string, octeti: Buffer): Promise<void> {
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: nume, mimeType: 'application/zip', buffer: octeti });
  await expect(confirmare(page)).toBeVisible();
}
async function instaleaza(page: Page, nume: string, octeti: Buffer): Promise<void> {
  await alegeFisier(page, nume, octeti);
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect(confirmare(page)).toHaveCount(0);
}
async function deschide(page: Page, id: string): Promise<void> {
  await (await deschideMeniul(page)).locator(`[data-extensii="deschide"][data-id="${id}"]`).click();
  await expect(spatiu(page)).toHaveAttribute('data-stare', 'pornit');
}
const IZOLARE = 'Rulează izolată: poate doar ce scrie mai sus. Nu-ți vede desenul, proiectele, adresa sau parola și nu ajunge singură la mașină.';

test('„Ce poate face”: mașina prima și marcată, oricum ar înșira-o manifestul; fraza izolării nu contrazice lista', async ({ page }) => {
  await page.goto('/');
  // Pagina lui Easy 3Draw (catalogul adevărat): manifestul înșiră stocarea întâi și mașina a treia.
  const p = await paginaDinCatalog(page, 'trenulet');
  const randuri = p.getByTestId('extensii-permisiuni').locator('li');
  await expect(randuri.locator('strong')).toHaveText(['Mașina', 'Formele din desen', 'Contul (nume, plan)', 'Descărcări', 'Datele în browser']);
  await expect(randuri.first()).toHaveAttribute('data-permisiune', 'masina');
  await expect(randuri.first()).toHaveAttribute('data-sensibila', '');
  await expect(p.locator('li[data-sensibila]')).toHaveCount(1);
  await expect(p.getByTestId('extensii-izolare')).toHaveText(IZOLARE);
  await page.keyboard.press('Escape');

  // Confirmarea unui pachet din fișier: aceeași ordine și aceeași frază.
  await alegeFisier(page, 'salut-1.0.0.zip', await salut({ permisiuni: ['stocare', 'cont', 'masina'] }));
  await expect(confirmare(page).getByTestId('extensii-permisiuni').locator('li strong')).toHaveText(['Mașina', 'Contul (nume, plan)', 'Datele în browser']);
  await expect(confirmare(page).getByTestId('extensii-izolare')).toHaveText(IZOLARE);
  await expect(confirmare(page)).not.toContainText('contul sau portul');
});

test('filele se numesc „Din bibliotecă” și „Instalate”; sub „Instalează”, „Verificată de cvs2 la instalare.”', async ({ page }) => {
  await page.goto('/');
  const p = await paginaDinCatalog(page, 'trenulet');
  await expect(file(page)).toHaveText(['Din bibliotecă · 1', 'Instalate · 0']);
  await expect(p.getByTestId('pagina-stare')).toHaveText('Verificată de cvs2 la instalare.');
  await expect(biblioteca(page)).not.toContainText('Amprenta');
});

test('fără internet, cu extensii instalate: fereastra trece singură pe „Instalate”, cu banda și „Reîncearcă”', async ({ page }) => {
  let cade = true;
  await page.route('**/extensii/catalog.json', (r) => (cade ? r.abort('failed') : r.fallback()));
  await page.goto('/');
  await instaleaza(page, 'salut-1.0.0.zip', Buffer.from(SALUT));
  const b = await deschideBiblioteca(page);
  await expect(b.locator('[data-extensii="fila-instalate"]')).toHaveAttribute('aria-selected', 'true');
  const banda = b.getByTestId('biblioteca-fara-catalog');
  await expect(banda).toContainText('Biblioteca are nevoie de internet. Extensiile instalate merg și fără.');
  await expect(banda.locator('[data-extensii="biblioteca-reincearca"]')).toHaveText('Reîncearcă');
  // În dreapta, pagina extensiei instalate, nu „Alege o extensie din listă”.
  await expect(pagina(page)).toHaveAttribute('data-id', 'salut');
  await expect(b).not.toContainText('Alege o extensie din listă');

  // „Reîncearcă”, cu legătura la loc: biblioteca vine, iar fereastra trece pe ea.
  cade = false;
  await banda.locator('[data-extensii="biblioteca-reincearca"]').click();
  await expect(b.locator('[data-extensii="fila-toate"]')).toHaveAttribute('aria-selected', 'true');
  await expect(file(page)).toHaveText(['Din bibliotecă · 1', 'Instalate · 1']);
  await expect(banda).toHaveCount(0);
  await expect(pagina(page)).toHaveAttribute('data-id', 'trenulet');
});

test('fără internet, o extensie instalată din bibliotecă nu e spusă „din afara bibliotecii”; una din fișier, da', async ({ page }) => {
  let cade = false;
  await page.route('**/extensii/catalog.json', (r) => (cade ? r.abort('failed') : r.fallback()));
  await page.goto('/');
  const p = await paginaDinCatalog(page, 'trenulet');
  await p.locator('[data-extensii="pagina-instaleaza"]').click();
  // Butonul apăsat a plecat de pe ecran: focusul trece pe „Deschide”, iar Escape închide fereastra.
  await expect(p.locator('[data-extensii="pagina-deschide"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(biblioteca(page)).toHaveCount(0);
  await instaleaza(page, 'salut-1.0.0.zip', Buffer.from(SALUT));

  cade = true;
  const b = await deschideBiblioteca(page);
  await expect(b.getByTestId('biblioteca-fara-catalog')).toBeVisible();
  await b.locator('[data-extensii="rand-biblioteca"][data-id="trenulet"]').click();
  await expect(pagina(page)).toHaveAttribute('data-id', 'trenulet');
  await expect(pagina(page).getByTestId('pagina-stare')).toHaveText('Instalată din bibliotecă');
  await expect(pagina(page).getByTestId('pagina-sursa')).toContainText('din biblioteca cvs2');
  await b.locator('[data-extensii="rand-biblioteca"][data-id="salut"]').click();
  await expect(pagina(page).getByTestId('pagina-stare')).toHaveText('Instalată din afara bibliotecii');
});

test('fără internet: omul care alege „Din bibliotecă” rămâne acolo; catalogul stricat are banda lui', async ({ page }) => {
  let raspuns: 'cade' | 'stricat' = 'cade';
  let cereri = 0;
  await page.route('**/extensii/catalog.json', (r) => {
    cereri += 1;
    return raspuns === 'cade' ? r.abort('failed') : r.fulfill({ status: 200, contentType: 'application/json', body: '{"format":"altceva"}' });
  });
  await page.goto('/');
  await instaleaza(page, 'salut-1.0.0.zip', Buffer.from(SALUT));
  let b = await deschideBiblioteca(page);
  await expect(b.locator('[data-extensii="fila-instalate"]')).toHaveAttribute('aria-selected', 'true');
  await b.locator('[data-extensii="fila-toate"]').click();
  await expect(b.getByTestId('biblioteca-lista')).toContainText('Biblioteca are nevoie de internet.');
  // „Reîncearcă”, tot fără internet: după ce cererea a căzut din nou, fila aleasă de om e tot ea, cu mesajul ei.
  const inainte = cereri;
  await b.locator('[data-extensii="biblioteca-reincearca"]').click();
  await expect.poll(() => cereri).toBeGreaterThan(inainte);
  await expect(b.getByTestId('biblioteca-lista').locator('[role="alert"]')).toHaveText('Biblioteca are nevoie de internet.');
  await expect(b.locator('[data-extensii="fila-toate"]')).toHaveAttribute('aria-selected', 'true');
  await expect(b.getByTestId('biblioteca-fara-catalog')).toHaveCount(0);
  // „Reîncearcă” a plecat de pe ecran cât s-a cerut catalogul: focusul s-a întors în fereastră, pe fila aleasă.
  await expect(b.locator('[data-extensii="fila-toate"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(biblioteca(page)).toHaveCount(0);

  raspuns = 'stricat';
  // Meniul cere catalogul din nou; fereastra îl ia pe cel abia cerut.
  b = await deschideBiblioteca(page);
  await expect(b.locator('[data-extensii="fila-instalate"]')).toHaveAttribute('aria-selected', 'true');
  await expect(b.getByTestId('biblioteca-fara-catalog')).toContainText('Biblioteca nu s-a putut încărca. Extensiile instalate merg ca până acum.');
});

test('Escape închide biblioteca și cu focusul căzut pe pagină (după un clic pe un text al ei); cu o fereastră deasupra, biblioteca rămâne', async ({ page }) => {
  await page.goto('/');
  let b = await deschideBiblioteca(page);
  await b.locator('#fereastra-biblioteca-titlu').click();
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(biblioteca(page)).toHaveCount(0);

  b = await deschideBiblioteca(page);
  await b.locator('[data-extensii="din-adresa"]').click();
  const adresa = page.getByTestId('extensii-adresa');
  await expect(adresa).toBeVisible();
  await adresa.locator('h2').click();
  await page.keyboard.press('Escape');
  await expect(biblioteca(page)).toBeVisible();
});

test('fără internet și fără nicio extensie: pagina arată drumurile din afara bibliotecii, nu „Alege o extensie din listă”', async ({ page }) => {
  await page.route('**/extensii/catalog.json', (r) => r.abort('failed'));
  await page.goto('/');
  const b = await deschideBiblioteca(page);
  await expect(b.locator('[data-extensii="fila-toate"]')).toHaveAttribute('aria-selected', 'true');
  await expect(b.getByTestId('biblioteca-lista')).toContainText('Biblioteca are nevoie de internet.');
  await expect(b).not.toContainText('Alege o extensie din listă');
  const gol = b.getByTestId('pagina-goala');
  await expect(gol).toContainText('Poți instala o extensie și din afara bibliotecii');
  await expect(gol.locator('button')).toHaveText(['Instalează din fișier (.zip)…', 'Instalează din adresă…']);
  // Butoanele paginii fac ce fac și cele de sub listă: alegerea unui fișier, fereastra adresei.
  const alegere = page.waitForEvent('filechooser');
  await gol.locator('[data-extensii="pagina-din-fisier"]').click();
  expect((await alegere).isMultiple()).toBe(false);
  await gol.locator('[data-extensii="pagina-din-adresa"]').click();
  await expect(page.getByTestId('extensii-adresa')).toBeVisible();
});

test('meniul marchează extensia deschisă; rândurile lui sunt doar rânduri de meniu; subtextele au cel puțin 12 px', async ({ page }) => {
  await page.goto('/');
  await instaleaza(page, 'salut-1.0.0.zip', Buffer.from(SALUT));
  await instaleaza(page, 'salut2-1.0.0.zip', await salut({ id: 'salut2', nume: 'Salut 2' }));
  await deschide(page, 'salut2');
  const m = await deschideMeniul(page);
  const deschisa = m.locator('[data-extensii="deschide"][data-id="salut2"]');
  const cealalta = m.locator('[data-extensii="deschide"][data-id="salut"]');
  await expect(deschisa).toHaveAttribute('aria-current', 'true');
  await expect(deschisa.locator('small')).toHaveText('1.0.0 · deschisă');
  await expect(deschisa.locator('.rand-punct')).toBeVisible();
  await expect(cealalta).not.toHaveAttribute('aria-current', 'true');
  await expect(cealalta.locator('small')).toHaveText('1.0.0');
  await expect(cealalta.locator('.rand-punct')).toHaveCount(0);
  // Copiii meniului: rânduri de meniu, despărțitoare sau învelișuri fără rol.
  const roluri = await m.locator('[role="menu"] > *').evaluateAll((e) => e.map((x) => x.getAttribute('role')));
  expect(roluri.every((r) => r === 'menuitem' || r === 'separator' || r === 'none')).toBe(true);
  expect(await m.locator('[role="menu"] [role="alert"]').count()).toBe(0);
  const marimi = await m.locator('.rand-text small').evaluateAll((e) => e.map((x) => parseFloat(getComputedStyle(x).fontSize)));
  expect(Math.min(...marimi)).toBeGreaterThanOrEqual(12);
  await page.keyboard.press('Escape');

  const b = await deschideBiblioteca(page);
  const inLista = await b.locator('.bib-card-text small').evaluateAll((e) => e.map((x) => parseFloat(getComputedStyle(x).fontSize)));
  expect(Math.min(...inLista)).toBeGreaterThanOrEqual(12);
});

test('o actualizare căzută din meniu: mesajul stă sub listă, cu numele extensiei, în afara rândurilor de meniu', async ({ page }) => {
  const descarcarea = await bibliotecaDeProba(page, { id: 'salut', nume: 'Salut', versiune: '1.0.1', permisiuni: ['stocare'], octeti: await salut({ versiune: '1.0.1' }) });
  await page.goto('/');
  await instaleaza(page, 'salut-1.0.0.zip', Buffer.from(SALUT));
  descarcarea('cade');
  const m = await deschideMeniul(page);
  await m.locator('[data-extensii="biblioteca-actualizeaza"]').click();
  const eroare = m.getByTestId('meniu-eroare');
  await expect(eroare).toHaveText('Salut: Actualizarea n-a mers. Nu e legătură la internet.');
  expect(await m.locator('[role="menu"] [role="alert"]').count()).toBe(0);
  // Rândul oferă din nou actualizarea.
  await expect(m.locator('[data-extensii="biblioteca-actualizeaza"]')).toBeVisible();
});

test('fila extensiei: un nume lung se taie cu „…”, cu numele întreg la îndemână; × are cel puțin 28 px', async ({ page }) => {
  const NUME = 'Generator de cutii cu îmbinări în coadă de rândunică';
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await instaleaza(page, 'cutii-1.0.0.zip', await salut({ id: 'cutii', nume: NUME }));
  await deschide(page, 'cutii');
  const eticheta = page.getByTestId('extensie-deschisa');
  await expect(eticheta).toHaveText(NUME);
  await expect(page.locator('[data-extensii="fila"]')).toHaveAttribute('title', NUME);
  const m = await page.evaluate(() => {
    const e = document.querySelector('[data-testid="extensie-deschisa"]') as HTMLElement;
    const f = (document.querySelector('[data-testid="fila-extensie"]') as HTMLElement).getBoundingClientRect();
    const x = (document.querySelector('[data-extensii="inchide-fereastra"]') as HTMLElement).getBoundingClientRect();
    const ch = parseFloat(getComputedStyle(e).fontSize) * 0.62;
    return { taiat: e.scrollWidth > e.clientWidth, latEticheta: e.clientWidth, ch, latFila: f.width, x: [x.width, x.height], inFereastra: f.right <= innerWidth };
  });
  expect(m.taiat).toBe(true);
  // Cel mult ~22 de caractere la vedere (lățimea unui caracter mediu, cu o rezervă pentru fontul lat).
  expect(m.latEticheta).toBeLessThanOrEqual(22 * m.ch * 1.35);
  expect(m.latFila).toBeLessThan(300);
  expect(m.x[0]).toBeGreaterThanOrEqual(28);
  expect(m.x[1]).toBeGreaterThanOrEqual(28);
  expect(m.inFereastra).toBe(true);
});

test.describe('pe telefon', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('× de pe fila extensiei e o țintă întreagă (44 px), iar rândul filelor încape', async ({ page }) => {
    await page.goto('/');
    await instaleaza(page, 'salut-1.0.0.zip', Buffer.from(SALUT));
    await deschide(page, 'salut');
    const m = await page.evaluate(() => {
      const x = (document.querySelector('[data-extensii="inchide-fereastra"]') as HTMLElement).getBoundingClientRect();
      return { x: [x.width, x.height], dreapta: x.right, lat: innerWidth, deruleaza: document.documentElement.scrollWidth > innerWidth };
    });
    expect(m.x[0]).toBeGreaterThanOrEqual(44);
    expect(m.x[1]).toBeGreaterThanOrEqual(44);
    expect(m.dreapta).toBeLessThanOrEqual(m.lat);
    expect(m.deruleaza).toBe(false);
  });
});
