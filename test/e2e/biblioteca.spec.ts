import { test, expect, type Locator, type Page, type Request } from '@playwright/test';
import { impacheteaza } from '../../scripts/impacheteaza-extensie.ts';
import { biblioteca, deschideBiblioteca, deschideMeniul, incarcata, inchideBiblioteca, meniu, pachetVechi, pagina, paginaDinCatalog, paginaInstalatei, randLista, semn } from './ajutor-biblioteca.ts';
import { eroriJurnal, faraEroriInJurnal } from './ajutor-jurnal.ts';

/**
 * Biblioteca extensiilor (ADR 0230, refăcută în ADR 0231), în Edge, pe catalogul și pachetul construite de build-ul adevărat
 * (`dist/extensii/`):
 * - meniul scurtat (extensiile instalate, apoi „Biblioteca extensiilor…”) și fereastra bibliotecii: lista, pagina lui Easy
 *   3Draw (semnul, capturile, descrierea, ce poate face, ce e nou), instalarea în pagină (nimic descărcat înainte de clic),
 *   apoi „Deschide”; la „Instalate”, sursa „din biblioteca cvs2”;
 * - amprenta greșită: pachetul schimbat pe drum se refuză în pagină, nimic scris, iar defectul ajunge în jurnal;
 * - actualizarea: din meniu (dintr-un clic, în rândul extensiei, fără ca meniul să-și schimbe mărimea) și din pagină (cu „ce
 *   e nou” de la versiunea omului), cu datele păstrate; o versiune care cere ceva în plus trece prin fereastra de confirmare,
 *   cu ce cere întâi;
 * - scheletul cât vine catalogul (fereastra își ține mărimea); fără rețea (extensiile instalate rămân la vedere, „Reîncearcă”);
 *   catalogul stricat (mesajul pe înțeles, detaliul doar în jurnal);
 * - linkul `#biblioteca=trenulet`: pagina lui, nimic descărcat fără clic, ancora ștearsă; un id necunoscut;
 * - paleta de comenzi: „Biblioteca extensiilor”, de oriunde; în engleză.
 *
 * Semnul extensiei (ADR 0231 §B.2): în listă vine de lângă catalog; după instalare, din pachet, în meniu și pe fila ei, și
 * fără rețea; o extensie fără semn își arată piesa de puzzle.
 */
test.use({ locale: 'ro-RO' });

type Rand = {
  id: string; nume: string; versiune: string; pachet: string; descriere: { ro: string; en: string };
  despre: { ro: string; en: string }; noutati: Array<{ versiune: string; ro: string; en: string }>;
  capturi: { ro: Array<{ fisier: string; alt: string }>; en: Array<{ fisier: string; alt: string }> };
};
const RE_PACHET = /\/extensii\/trenulet-[^/]+\.zip$/;

async function randul(page: Page): Promise<Rand> {
  const r = await page.request.get('/extensii/catalog.json');
  expect(r.ok()).toBe(true);
  const c = await r.json() as { extensii: Rand[] };
  const x = c.extensii.find((e) => e.id === 'trenulet');
  if (!x) throw new Error('trenulet lipsește din catalog');
  return x;
}

/** Datele extensiei (ADR 0128 §B), scrise direct în IndexedDB-ul lui cvs2, ca și cum le-ar fi salvat ea; sau citite înapoi. */
const scrieDate = (page: Page, cheie: string, valoare: string) => page.evaluate(([k, v]) => new Promise<void>((ok, nu) => {
  const r = indexedDB.open('cncvs2-extensii');
  r.onerror = () => { nu(r.error); };
  r.onsuccess = () => {
    const t = r.result.transaction(['date', 'marimi'], 'readwrite');
    t.objectStore('date').put({ id: 'trenulet', cheie: k, valoare: v });
    t.objectStore('marimi').put({ id: 'trenulet', cheie: k, octeti: v.length + 2 });
    t.oncomplete = () => { r.result.close(); ok(); };
    t.onerror = () => { nu(t.error); };
  };
}), [cheie, valoare] as const);
const citesteDate = (page: Page, cheie: string) => page.evaluate((k) => new Promise<unknown>((ok, nu) => {
  const r = indexedDB.open('cncvs2-extensii');
  r.onerror = () => { nu(r.error); };
  r.onsuccess = () => {
    const q = r.result.transaction('date').objectStore('date').get(['trenulet', k]);
    q.onsuccess = () => { ok((q.result as { valoare?: unknown } | undefined)?.valoare); r.result.close(); };
    q.onerror = () => { nu(q.error); };
  };
}), cheie);

async function instaleazaDinFisier(page: Page, nume: string, buffer: Buffer): Promise<void> {
  await expect(page.locator('[data-extensii="buton"]')).toBeVisible();
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: nume, mimeType: 'application/zip', buffer });
  await expect(page.getByTestId('extensii-din-afara')).toBeVisible();
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect(page.getByTestId('extensii-instalare')).toHaveCount(0);
}

const FORME = 'Formele din desen primește formele pe care i le trimiți din desen și îți propune forme pentru desen (le adaugi tu, din Importă)';

test('din bibliotecă: fereastra, rândul și pagina lui Easy 3Draw (semnul, capturile, descrierea, ce poate face, ce e nou); instalarea în pagină, apoi „Deschide”', async ({ page }) => {
  const cereri: string[] = [];
  page.on('request', (r: Request) => { cereri.push(r.url()); });
  await page.goto('/');
  const r = await randul(page);
  // Meniul scurtat: extensiile instalate, apoi drumul spre bibliotecă.
  const m = await deschideMeniul(page);
  await expect(m.locator('.meniu-extensii-cap')).toContainText('Nicio extensie instalată încă');
  await expect(m.locator('[data-extensii="biblioteca"]')).toContainText('Biblioteca extensiilor…');
  await expect(m.locator('[role="menuitem"]')).toHaveCount(1);
  const b = await deschideBiblioteca(page);
  await expect(b.locator('h2')).toHaveText('Biblioteca extensiilor');
  await expect(b.locator('[role="tab"]')).toHaveText(['Din bibliotecă · 1', 'Instalate · 0']);
  await expect(page.locator('.aplicatie')).toHaveAttribute('inert', '');

  // Rândul din listă și pagina extensiei (singura din catalog e aleasă de la început).
  const rand = randLista(page, 'trenulet');
  await expect(rand).toHaveAttribute('data-stare', 'instaleaza');
  await expect(rand).toHaveAttribute('aria-current', 'true');
  await expect(rand).toContainText('Easy 3Draw');
  await expect(rand).toContainText(r.descriere.ro);
  const p = pagina(page);
  await expect(p).toHaveAttribute('data-id', 'trenulet');
  await expect(p.locator('h3').first()).toHaveText('Easy 3Draw');
  await expect(p.getByTestId('pagina-despre')).toHaveText(new RegExp(`^de CNC Vector Studio · ${r.versiune.replaceAll('.', '\\.')} · \\d+ kB$`));
  await incarcata(semn(p.locator('.pagina-cap')));
  const capturi = p.getByTestId('pagina-capturi').locator('img');
  await expect(capturi).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await incarcata(capturi.nth(i));
    await expect(capturi.nth(i)).toHaveAttribute('alt', r.capturi.ro[i]?.alt ?? '?');
  }
  await expect(p.getByTestId('pagina-descriere')).toHaveText(r.despre.ro);
  await expect(p.getByTestId('extensii-permisiuni').locator('li')).toHaveCount(5);
  const noutati = p.getByTestId('pagina-noutati').locator('li');
  await expect(noutati).toHaveCount(r.noutati.length);
  await expect(noutati.first()).toHaveText(`${r.versiune} ${r.noutati[0]?.ro ?? '?'}`);
  await expect(p.getByTestId('extensii-izolare')).toBeVisible();
  await expect(p.getByTestId('pagina-stare')).toHaveText('Verificată de cvs2 la instalare.');

  // Instalarea, în pagină: nimic descărcat înainte de clic; apoi pachetul, verificat.
  expect(cereri.filter((u) => RE_PACHET.test(u)), 'nimic descărcat înainte de „Instalează”').toEqual([]);
  expect(cereri.filter((u) => u.endsWith('/extensii/catalog.json')).length, 'catalogul abia cerut de meniu nu se cere a doua oară').toBe(1);
  await p.locator('[data-extensii="pagina-instaleaza"]').click();
  await expect(p).toHaveAttribute('data-stare', 'instalata');
  expect(cereri.filter((u) => RE_PACHET.test(u)).map((u) => new URL(u).pathname)).toEqual([`/extensii/${r.pachet}`]);
  await expect(page.getByTestId('extensii-instalare')).toHaveCount(0);
  await expect(p.getByTestId('pagina-stare')).toHaveText('✓ Instalată. Merge și fără internet.');
  await expect(b.locator('[role="tab"]')).toHaveText(['Din bibliotecă · 1', 'Instalate · 1']);
  await expect(rand).toHaveAttribute('data-stare', 'instalata');
  await expect(p.locator('.pagina-actiuni button')).toHaveText(['Deschide', 'Scoate']);

  await p.locator('[data-extensii="pagina-deschide"]').click();
  await expect(biblioteca(page)).toHaveCount(0);
  await expect(page.getByTestId('extensie-deschisa')).toHaveText('Easy 3Draw');
  await expect(page.getByTestId('spatiu-extensie')).toHaveAttribute('data-stare', 'pornit');

  // Din nou în bibliotecă: instalată, la zi, cu sursa ei.
  const instalata = await paginaInstalatei(page, 'trenulet');
  await expect(instalata.getByTestId('pagina-stare')).toHaveText('Instalată, la zi');
  await expect(instalata.getByTestId('pagina-sursa')).toContainText('din biblioteca cvs2');
  await inchideBiblioteca(page);
  await faraEroriInJurnal(page);
});

test('amprenta greșită: pachetul schimbat pe drum se refuză în pagină, nimic nu se scrie, iar defectul ajunge în jurnal', async ({ page }) => {
  await page.route(RE_PACHET, async (route) => {
    const raspuns = await route.fetch();
    const octeti = Buffer.from(await raspuns.body());
    octeti[octeti.length - 40] = (octeti[octeti.length - 40] ?? 0) ^ 0xff;
    await route.fulfill({ response: raspuns, body: octeti });
  });
  await page.goto('/');
  const p = await paginaDinCatalog(page, 'trenulet');
  await p.locator('[data-extensii="pagina-instaleaza"]').click();
  const refuz = p.getByTestId('pagina-eroare');
  await expect(refuz).toHaveAttribute('data-motiv', 'amprenta-biblioteca');
  await expect(refuz).toContainText('Pachetul descărcat nu e cel din bibliotecă. Încearcă din nou mai târziu.');
  await expect(p).toHaveAttribute('data-stare', 'instaleaza');
  await expect(biblioteca(page).locator('[role="tab"]')).toHaveText(['Din bibliotecă · 1', 'Instalate · 0']);
  await inchideBiblioteca(page);
  await expect((await deschideMeniul(page)).locator('.meniu-extensii-cap')).toContainText('Nicio extensie instalată încă');
  const erori = await eroriJurnal(page);
  expect(erori.some((e) => e.mesaj.includes('amprenta-biblioteca')), JSON.stringify(erori)).toBe(true);
});

test('actualizarea dintr-un clic, din meniu: o versiune veche, din fișier, cu datele ei; „Actualizează” o înlocuiește, datele rămân; meniul nu sare', async ({ page }) => {
  // Catalogul vine cu întârziere: meniul se măsoară înainte și după.
  let lasa = (): void => {};
  const poarta = new Promise<void>((ok) => { lasa = ok; });
  await page.goto('/');
  const r = await randul(page);
  // Versiunea veche are un nume mai lung (ca „Planificator Trenuleț” dinainte de ADR 0167): rândul lui, cu „Actualizează”
  // lângă el, n-are voie să lățească meniul și nici să se rupă pe două rânduri.
  const VECHI = 'Planificatorul de trenulețe din lemn';
  await instaleazaDinFisier(page, 'trenulet-18.6.0.zip', await pachetVechi('18.6.0', [], VECHI));
  await scrieDate(page, 'circuit', 'circuitul de dinainte');
  await page.route('**/extensii/catalog.json', async (route) => { await poarta; await route.continue(); });

  const m = await deschideMeniul(page);
  const instalata = m.locator('[data-extensii="deschide"][data-id="trenulet"]');
  await expect(instalata).toHaveText(`${VECHI}18.6.0`);
  const inainte = await m.boundingBox();
  lasa();
  const actualizeaza = m.locator('[data-extensii="biblioteca-actualizeaza"]');
  await expect(actualizeaza).toHaveText('Actualizează');
  await expect(actualizeaza).toHaveAccessibleName(`Actualizează la ${r.versiune}`);
  await expect(instalata).toHaveText(`${VECHI}18.6.0 → ${r.versiune}`);
  const dupa = await m.boundingBox();
  expect(dupa?.height, 'meniul nu crește când vine catalogul (ADR 0231, „meniul sare”)').toBe(inainte?.height);
  expect(dupa?.width).toBe(inainte?.width);

  await actualizeaza.click();
  await expect(instalata).toHaveText(`Easy 3Draw${r.versiune} · actualizată`);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(actualizeaza).toHaveCount(0);
  expect((await m.boundingBox())?.height).toBe(inainte?.height);
  expect(await citesteDate(page, 'circuit')).toBe('circuitul de dinainte');

  const p = await paginaInstalatei(page, 'trenulet');
  await expect(p.getByTestId('pagina-sursa')).toContainText('din biblioteca cvs2');
  await expect(p.getByTestId('pagina-sursa')).toContainText('datele ei: sub 1 kB');
  await inchideBiblioteca(page);
  await faraEroriInJurnal(page);
});

test('actualizarea din pagină: ce e nou de la versiunea ta, „Actualizează la …” dintr-un clic, datele rămân', async ({ page }) => {
  await page.goto('/');
  const r = await randul(page);
  await instaleazaDinFisier(page, 'trenulet-18.17.0.zip', await pachetVechi('18.17.0'));
  await scrieDate(page, 'circuit', 'circuitul de dinainte');
  const p = await paginaDinCatalog(page, 'trenulet');
  await expect(randLista(page, 'trenulet')).toHaveAttribute('data-stare', 'actualizeaza');
  await expect(randLista(page, 'trenulet')).toContainText(r.versiune);
  await expect(p).toHaveAttribute('data-stare', 'actualizeaza');
  await expect(p.getByTestId('pagina-stare')).toHaveText('Ai 18.17.0. Datele ei rămân.');
  await expect(p.locator('.pagina-actiuni button')).toHaveText([`Actualizează la ${r.versiune}`, 'Deschide']);
  // „Ce e nou” arată doar versiunile de după a ta (ADR 0231, „actualizarea nu spune ce aduce”).
  const noi = r.noutati.filter((n) => n.versiune !== '18.17.0' && n.versiune !== '18.16.0');
  await expect(p.getByTestId('pagina-noutati').locator('li')).toHaveText(noi.map((n) => `${n.versiune} ${n.ro}`));
  await p.locator('[data-extensii="pagina-actualizeaza"]').click();
  await expect(p).toHaveAttribute('data-stare', 'instalata');
  await expect(page.getByTestId('extensii-instalare')).toHaveCount(0);
  await expect(p.getByTestId('pagina-stare')).toHaveText(`✓ Actualizată la ${r.versiune}`);
  expect(await citesteDate(page, 'circuit')).toBe('circuitul de dinainte');
  await inchideBiblioteca(page);
  await faraEroriInJurnal(page);
});

test('actualizarea care cere ceva nou: pagina arată ce cere în plus, iar fereastra de confirmare întreabă întâi; din meniu, la fel', async ({ page }) => {
  await page.goto('/');
  const r = await randul(page);
  await instaleazaDinFisier(page, 'trenulet-18.6.0.zip', await pachetVechi('18.6.0', ['forme']));
  const p = await paginaDinCatalog(page, 'trenulet');
  await expect(p.getByTestId('pagina-poate').locator('h3')).toHaveText(['Versiunea nouă poate și', 'Ce putea și până acum']);
  await expect(p.getByTestId('extensii-permisiuni-noi').locator('li')).toHaveText([FORME]);
  await p.locator('[data-extensii="pagina-actualizeaza"]').click();
  const fereastra = page.getByTestId('extensii-instalare');
  await expect(fereastra.locator('h2')).toHaveText('Actualizezi „Easy 3Draw”?');
  await expect(fereastra.getByTestId('extensii-despre')).toHaveText(`18.6.0 → ${r.versiune} · din biblioteca cvs2`);
  // Ce cere în plus stă primul, evidențiat; apoi ce putea și până acum (ADR 0231 §B.3).
  await expect(fereastra.locator('h3')).toHaveText(['Versiunea nouă poate și', 'Ce putea și până acum']);
  await expect(fereastra.getByTestId('extensii-permisiuni-noi').locator('li')).toHaveText([FORME]);
  await expect(fereastra.getByTestId('extensii-permisiuni').locator('li')).toHaveCount(4);
  await expect(fereastra).toContainText('Datele ei rămân.');
  // Biblioteca de sub confirmare e inertă.
  await expect(biblioteca(page)).toHaveAttribute('inert', '');
  await page.locator('[data-extensii="renunta"]').click();
  await expect(fereastra).toHaveCount(0);
  await expect(p).toHaveAttribute('data-stare', 'actualizeaza');
  await inchideBiblioteca(page);

  // Din meniu: aceeași fereastră de confirmare.
  await (await deschideMeniul(page)).locator('[data-extensii="biblioteca-actualizeaza"]').click();
  await expect(fereastra.locator('h2')).toHaveText('Actualizezi „Easy 3Draw”?');
  await fereastra.locator('[data-extensii="actualizeaza"]').click();
  await expect(page.getByTestId('extensii-gata')).toContainText(`„Easy 3Draw” ${r.versiune} e instalată`);
  await page.locator('[data-extensii="inchide-instalata"]').click();
  await expect(await paginaInstalatei(page, 'trenulet')).toHaveAttribute('data-stare', 'instalata');
  await inchideBiblioteca(page);
  await faraEroriInJurnal(page);
});

test('scheletul cât vine catalogul: fereastra nu-și schimbă mărimea când sosește', async ({ page }) => {
  let lasa = (): void => {};
  const poarta = new Promise<void>((ok) => { lasa = ok; });
  await page.route('**/extensii/catalog.json', async (route) => { await poarta; await route.continue(); });
  await page.goto('/');
  const b = await deschideBiblioteca(page);
  await expect(b.getByTestId('biblioteca-schelet')).toBeVisible();
  await expect(b.locator('[role="tab"]').first()).toHaveText('Din bibliotecă');
  const cutie = b.locator('.dialog-cutie');
  const inainte = await cutie.boundingBox();
  lasa();
  await expect(randLista(page, 'trenulet')).toBeVisible();
  await expect(b.getByTestId('biblioteca-schelet')).toHaveCount(0);
  expect(await cutie.boundingBox()).toEqual(inainte);
  await faraEroriInJurnal(page);
});

test('fără rețea: extensiile instalate rămân la vedere (fereastra trece singură pe „Instalate”), biblioteca spune că are nevoie de internet, iar „Reîncearcă” o aduce', async ({ page }) => {
  await page.goto('/');
  await instaleazaDinFisier(page, 'salut.zip', Buffer.from(impacheteaza('extensii/salut').octeti));
  await page.route('**/extensii/catalog.json', (route) => route.abort('internetdisconnected'));
  const b = await deschideBiblioteca(page);
  const lista = b.getByTestId('biblioteca-lista');
  // Cu ceva instalat, fereastra arată întâi ce merge (ADR 0232 §B.8); cele instalate merg ca până acum.
  await expect(b.locator('[data-extensii="fila-instalate"]')).toHaveAttribute('aria-selected', 'true');
  const p = await paginaInstalatei(page, 'salut');
  await expect(p.locator('h3').first()).toHaveText('Salut');
  await expect(p.getByTestId('pagina-sursa')).toContainText('de la salut.zip');
  await expect(p.locator('.pagina-actiuni button')).toHaveText(['Deschide', 'Scoate']);
  await b.locator('[data-extensii="fila-toate"]').click();
  await expect(lista.locator('[role="alert"]')).toHaveText('Biblioteca are nevoie de internet.');
  await expect(lista.locator('[data-extensii="rand-biblioteca"]')).toHaveCount(0);
  await page.unroute('**/extensii/catalog.json');
  await lista.locator('[data-extensii="biblioteca-reincearca"]').click();
  await expect(randLista(page, 'trenulet')).toHaveAttribute('data-stare', 'instaleaza');
  await inchideBiblioteca(page);
  await faraEroriInJurnal(page);
});

test('catalogul stricat: mesajul pe înțeles, fără detaliul tehnic, cu „Reîncearcă”; detaliul ajunge doar în jurnal', async ({ page }) => {
  await page.route('**/extensii/catalog.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"format":"altceva"}' }));
  await page.goto('/');
  const b = await deschideBiblioteca(page);
  await expect(b.getByTestId('biblioteca-lista').locator('[role="alert"]')).toHaveText('Biblioteca nu s-a putut încărca. Încearcă din nou peste puțin.');
  await expect(b.locator('[data-extensii="biblioteca-reincearca"]')).toBeVisible();
  const erori = await eroriJurnal(page);
  expect(erori.some((e) => e.mesaj.includes('biblioteca: catalogul (format)')), JSON.stringify(erori)).toBe(true);
});

test('linkul #biblioteca=trenulet: pagina lui din bibliotecă, nimic descărcat fără clic, ancora ștearsă; un id necunoscut', async ({ page }) => {
  const cereri: string[] = [];
  page.on('request', (r: Request) => { cereri.push(r.url()); });
  await page.goto('/#biblioteca=trenulet');
  const p = pagina(page);
  await expect(p).toHaveAttribute('data-id', 'trenulet');
  await expect(biblioteca(page).getByTestId('extensii-link')).toHaveText('Un link îți propune o extensie din biblioteca cvs2.');
  await expect(p.locator('h3').first()).toHaveText('Easy 3Draw');
  await expect(page).toHaveURL(/\/$/);
  expect(cereri.filter((u) => RE_PACHET.test(u))).toEqual([]);
  await inchideBiblioteca(page);

  await page.goto('about:blank');
  await page.goto('/#biblioteca=nu-exista');
  await expect(biblioteca(page).getByTestId('pagina-lipsa')).toHaveText('Extensia „nu-exista” nu e în biblioteca acestei instanțe.');
  await expect(randLista(page, 'trenulet')).toBeVisible();
  await expect(pagina(page), 'nicio altă extensie arătată în locul celei cerute').toHaveCount(0);
  await inchideBiblioteca(page);
  await faraEroriInJurnal(page);
});

test('tastatura: focusul intră pe fila aleasă; săgețile schimbă fila și mută între rânduri; Enter deschide pagina; Escape închide', async ({ page }) => {
  await page.goto('/');
  await instaleazaDinFisier(page, 'salut.zip', Buffer.from(impacheteaza('extensii/salut').octeti));
  await instaleazaDinFisier(page, 'trenulet-18.6.0.zip', await pachetVechi('18.6.0'));
  const b = await deschideBiblioteca(page);
  const toate = b.locator('[data-extensii="fila-toate"]');
  const instalate = b.locator('[data-extensii="fila-instalate"]');
  // La deschidere, focusul stă pe fila aleasă (nu pe ×); doar ea e în ordinea lui Tab.
  await expect(toate).toBeFocused();
  await expect(toate).toHaveAttribute('aria-selected', 'true');
  await expect(toate).toHaveAttribute('tabindex', '0');
  await expect(instalate).toHaveAttribute('tabindex', '-1');
  await expect(page.getByRole('tabpanel', { name: 'Din bibliotecă · 1' })).toBeVisible();
  // Săgețile schimbă fila, cu focusul după ele; de la capăt trec la celălalt.
  await page.keyboard.press('ArrowRight');
  await expect(instalate).toBeFocused();
  await expect(instalate).toHaveAttribute('aria-selected', 'true');
  await expect(instalate).toHaveAttribute('tabindex', '0');
  await expect(page.getByRole('tabpanel', { name: 'Instalate · 2' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(toate).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(instalate).toBeFocused();
  // În listă: doar rândul ales e în ordinea lui Tab; săgețile mută focusul între rânduri, Enter deschide pagina.
  const randuri = page.getByTestId('biblioteca-lista').locator('[data-extensii="rand-biblioteca"]');
  await expect(randuri).toHaveCount(2);
  await expect(randuri.nth(0)).toHaveAttribute('tabindex', '0');
  await expect(randuri.nth(1)).toHaveAttribute('tabindex', '-1');
  const ids = await randuri.evaluateAll((e) => e.map((x) => x.getAttribute('data-id')));
  await randuri.nth(0).focus();
  await page.keyboard.press('ArrowDown');
  await expect(randuri.nth(1)).toBeFocused();
  await expect(pagina(page), 'săgeata doar mută focusul').toHaveAttribute('data-id', ids[0] ?? '?');
  await page.keyboard.press('Enter');
  await expect(pagina(page)).toHaveAttribute('data-id', ids[1] ?? '?');
  await expect(randuri.nth(1)).toHaveAttribute('tabindex', '0');
  await page.keyboard.press('ArrowDown');
  await expect(randuri.nth(0), 'de la ultimul rând, la primul').toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(randuri.nth(1)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(biblioteca(page)).toHaveCount(0);
  await expect(page.locator('[data-extensii="buton"]')).toBeFocused();
  await faraEroriInJurnal(page);
});

test('din paleta de comenzi (Ctrl K): „Biblioteca extensiilor” deschide fereastra de oriunde, cu catalogul cerut atunci; Escape o închide, cu focusul la piesa de puzzle', async ({ page }) => {
  const cataloage: string[] = [];
  page.on('request', (r: Request) => { if (r.url().endsWith('/extensii/catalog.json')) cataloage.push(r.url()); });
  await page.goto('/');
  const masina = page.locator('[data-actiune="vedere.masina"]');
  await masina.click();
  await expect(masina).toHaveAttribute('aria-current', 'page');
  expect(cataloage, 'nicio cerere a catalogului la pornire').toEqual([]);
  await page.keyboard.press('Control+k');
  const paleta = page.getByRole('dialog', { name: 'Paleta de comenzi' });
  // Grupul „Extensii” al paletei: și „Trimite la extensie” (ADR 0166), care fără o extensie deschisă își spune motivul.
  await paleta.getByRole('combobox').fill('extensi');
  await expect(page.locator('[id="paleta-paleta.grup.extensii"]')).toHaveText('Extensii');
  await expect(page.locator('[id="paleta-extensii.trimite-selectia"]')).toContainText('Trimite la extensie');
  await expect(page.locator('[id="paleta-extensii.trimite-selectia"]')).toHaveAttribute('aria-disabled', 'true');
  await paleta.getByRole('combobox').fill('biblioteca ext');
  await page.locator('[id="paleta-extensii.biblioteca"]').click();
  await expect(biblioteca(page)).toBeVisible();
  await expect(randLista(page, 'trenulet')).toBeVisible();
  expect(cataloage.length, 'catalogul, cerut la deschidere').toBe(1);
  // Fereastra de dedesubt rămâne Mașina; adresa rămâne curată.
  await expect(masina).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveURL(/\/$/);
  await page.keyboard.press('Escape');
  await expect(biblioteca(page)).toHaveCount(0);
  await expect(page.locator('[data-extensii="buton"]')).toBeFocused();
  await faraEroriInJurnal(page);
});

test('în engleză: fereastra, pagina cu descrierea, capturile și „ce e nou” din catalog, butoanele', async ({ page }) => {
  await page.goto('/');
  const r = await randul(page);
  await page.getByRole('navigation', { name: 'Limba' }).getByRole('button', { name: 'EN', exact: true }).click();
  const m = await deschideMeniul(page);
  await expect(m.locator('[data-extensii="biblioteca"]')).toContainText('Extension library…');
  const b = await deschideBiblioteca(page);
  await expect(b.locator('h2')).toHaveText('Extension library');
  await expect(b.locator('[role="tab"]')).toHaveText(['Library · 1', 'Installed · 0']);
  await expect(randLista(page, 'trenulet')).toContainText(r.descriere.en);
  const p = pagina(page);
  await expect(p.getByTestId('pagina-despre')).toHaveText(new RegExp(`^by CNC Vector Studio · ${r.versiune.replaceAll('.', '\\.')} · \\d+ kB$`));
  await expect(p.getByTestId('pagina-descriere')).toHaveText(r.despre.en);
  await expect(p.getByTestId('pagina-capturi').locator('img').first()).toHaveAttribute('alt', r.capturi.en[0]?.alt ?? '?');
  await expect(p.getByTestId('pagina-capturi').locator('img').first()).toHaveAttribute('src', new RegExp(`${r.capturi.en[0]?.fisier ?? '?'}$`));
  await expect(p.getByTestId('pagina-noutati').locator('li').first()).toHaveText(`${r.versiune} ${r.noutati[0]?.en ?? '?'}`);
  await expect(p.getByTestId('pagina-poate').locator('h3')).toHaveText(['What it can do']);
  await expect(p.locator('[data-extensii="pagina-instaleaza"]')).toHaveText('Install');
  await expect(p.getByTestId('pagina-stare')).toHaveText('Checked by cvs2 when you install it.');
  await inchideBiblioteca(page);
  await faraEroriInJurnal(page);
});

test('semnul extensiei: în bibliotecă vine de lângă catalog; după instalare, din pachet, în meniu și pe fila ei, și fără rețea', async ({ page }) => {
  await page.goto('/');
  await deschideBiblioteca(page);
  const inLista = semn(randLista(page, 'trenulet'));
  await expect(inLista).toHaveAttribute('src', /\/extensii\/trenulet-pictograma-[0-9a-f]{8}\.svg$/);
  await incarcata(inLista);
  await expect(inLista).toHaveAttribute('alt', '');

  await pagina(page).locator('[data-extensii="pagina-instaleaza"]').click();
  await pagina(page).locator('[data-extensii="pagina-deschide"]').click();
  await expect(page.getByTestId('spatiu-extensie')).toHaveAttribute('data-stare', 'pornit');
  const peFila = semn(page.getByTestId('fila-extensie'));
  await expect(peFila).toHaveAttribute('src', /^blob:/);
  await incarcata(peFila);
  // Numele filei rămâne al extensiei: semnul e doar desen. Și ține locul piesei de puzzle, nu stă lângă ea.
  const fila = page.getByTestId('fila-extensie').locator('[data-extensii="fila"]');
  await expect(fila).toHaveAccessibleName('Easy 3Draw');
  expect(await fila.evaluate((b) => getComputedStyle(b, '::before').display)).toBe('none');

  // Fără rețea, catalogul nu mai vine, dar semnul extensiei instalate e în pachetul ei: în meniu și în fila „Instalate”.
  await page.route('**/extensii/**', (route) => route.abort('internetdisconnected'));
  const instalat = semn((await deschideMeniul(page)).locator('[data-extensii="deschide"][data-id="trenulet"]'));
  await expect(instalat).toHaveAttribute('src', /^blob:/);
  await incarcata(instalat);
  const p = await paginaInstalatei(page, 'trenulet');
  await expect(semn(p.locator('.pagina-cap'))).toHaveAttribute('src', /^blob:/);
  await incarcata(semn(p.locator('.pagina-cap')));
  await inchideBiblioteca(page);
  await faraEroriInJurnal(page);
});

test('o extensie fără semn (un pachet din fișier) își arată piesa de puzzle, în meniu și pe fila ei', async ({ page }) => {
  await page.goto('/');
  await instaleazaDinFisier(page, 'salut.zip', Buffer.from(impacheteaza('extensii/salut').octeti));
  const rand = (await deschideMeniul(page)).locator('[data-extensii="deschide"][data-id="salut"]');
  await expect(rand.locator('[data-semn]')).toHaveAttribute('data-fara-semn', '');
  await expect(rand.locator('img')).toHaveCount(0);
  // Rândul începe din stânga, cu semnul: nu stă la mijlocul meniului.
  const [cutieRand, cutieSemn] = [await rand.boundingBox(), await rand.locator('[data-semn]').boundingBox()];
  expect(cutieRand && cutieSemn && cutieSemn.x - cutieRand.x, 'semnul, la marginea din stânga a rândului').toBeLessThanOrEqual(12);
  // Numele rămâne text plin, de culoarea meniului (nu gri, ca versiunea de sub el).
  const culoare = (l: Locator) => l.evaluate((e) => getComputedStyle(e).color);
  expect(await culoare(rand.locator('.rand-text > span'))).toBe(await culoare(meniu(page)));
  await rand.click();
  await expect(page.getByTestId('spatiu-extensie')).toHaveAttribute('data-stare', 'pornit');
  const fila = page.getByTestId('fila-extensie').locator('[data-extensii="fila"]');
  await expect(fila.locator('img')).toHaveCount(0);
  // Piesa de puzzle a filei (iconița din CSS) rămâne la vedere.
  expect(await fila.evaluate((b) => getComputedStyle(b, '::before').display)).not.toBe('none');
  await faraEroriInJurnal(page);
});
