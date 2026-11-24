import { test, expect, type Locator, type Page } from '@playwright/test';
import { impacheteaza, scrieZip } from '../../scripts/impacheteaza-extensie.ts';
import { citesteZip } from '../../src/extensii/zip.ts';
import {
  biblioteca, categoria, categorii, cautare, deschideBiblioteca, pagina, paginaDinCatalog, raftDeProba, randLista, randuriVazute, type RandDeProba,
} from './ajutor-biblioteca.ts';

/**
 * Căutarea și categoriile din fereastra „Biblioteca extensiilor” (ADR 0233, felia 3.Xj), în Edge, pe o bibliotecă de probă
 * cu cinci extensii (catalogul adevărat are una):
 * - câmpul „Caută o extensie” filtrează lista la fiecare literă: în nume oriunde, în descrieri la început de cuvânt, fără
 *   diacritice; potrivirile din nume stau primele; „N din M”; nimic găsit are starea lui, cu drumul înapoi;
 * - tastatura: „/” duce în câmp, ↓ în listă, Enter deschide primul rezultat; Escape golește întâi câmpul, apoi închide;
 * - rândul categoriilor: doar cele prezente, cu numărul lor; una aleasă filtrează; categoriile de pe pagina extensiei duc la
 *   raftul lor; căutarea care găsește doar în alte categorii o spune și oferă „Caută în toate categoriile”;
 * - în „Instalate”: aceeași căutare, și peste extensiile din afara bibliotecii; fără catalog, fără categorii;
 * - pe telefon, cu fontul lat, câmpul și categoriile încap, în ambele limbi.
 */
test.use({ locale: 'ro-RO' });

const RAFT: readonly RandDeProba[] = [
  {
    id: 'tren', nume: 'Easy 3Draw', autor: 'CNC Vector Studio', categorii: ['modele', 'imprimare', 'cnc'],
    descriere: { ro: 'Circuite de trenuleț din lemn și piese de printat 3D: cărămizi LEGO.', en: 'Wooden train tracks and 3D-printable parts: LEGO bricks.' },
  },
  {
    id: 'cutii', nume: 'Cutii cu îmbinări', categorii: ['desen', 'cnc'],
    descriere: { ro: 'Desenezi o cutie cu dinți, pe grosimea plăcii.', en: 'Draw a finger-jointed box for your board thickness.' },
  },
  {
    id: 'sonda', nume: 'Sonda de colț', categorii: ['masina'],
    descriere: { ro: 'Găsești colțul piesei cu un palpator 3D.', en: 'Find the corner of the part with a 3D probe.' },
  },
  {
    id: 'ceas', nume: 'Cadran de ceas', categorii: ['desen'],
    descriere: { ro: 'Un cadran cu cifre și minutar, gata de gravat.', en: 'A dial with numerals and hands, ready to engrave.' },
    despre: { ro: 'Alegi diametrul, felul cifrelor și grosimea liniilor; cadranul vine ca vectori în desen.', en: 'Pick the diameter, the numerals and the line weight; the dial arrives as vectors in your drawing.' },
  },
  { id: 'fara', nume: 'Fără raft', descriere: { ro: 'O extensie care nu stă în nicio categorie.', en: 'An extension in no category.' } },
];
const TOATE = ['tren', 'cutii', 'sonda', 'ceas', 'fara'];

const gasite = (page: Page): Locator => biblioteca(page).getByTestId('biblioteca-gasite');
const nimic = (page: Page): Locator => biblioteca(page).getByTestId('biblioteca-nimic');
const vazute = (page: Page, ids: readonly string[]): Promise<void> => expect.poll(() => randuriVazute(page)).toEqual(ids);

async function cuRaftul(page: Page, dinTastatura = false): Promise<Locator> {
  await page.goto('/');
  await raftDeProba(page, RAFT);
  // La 320 px, la atingere, bara de sus își suprapune butoanele (o problemă a carcasei, dinaintea acestei felii, raportată
  // separat): acolo meniul Extensii se deschide de la tastatură. Proba aceasta e a ferestrei bibliotecii.
  if (dinTastatura) {
    await page.locator('[data-extensii="buton"]').focus();
    await page.keyboard.press('Enter');
  }
  const b = await deschideBiblioteca(page);
  await vazute(page, TOATE);
  return b;
}

test('căutarea filtrează lista la fiecare literă: în nume oriunde, în descrieri la început de cuvânt, fără diacritice; „N din M”', async ({ page }) => {
  await cuRaftul(page);
  const c = cautare(page);
  await expect(c).toBeVisible();
  await expect(c).toHaveAccessibleName('Caută o extensie');
  await expect(c).toHaveAttribute('placeholder', 'Caută o extensie');
  // Fără text, niciun „N din M”: lista e întreagă.
  await expect(gasite(page)).toHaveCount(0);
  // O extensie aleasă de om: pagina o ține cât e în listă, apoi urmează ce a rămas.
  await randLista(page, 'sonda').click();
  await expect(pagina(page)).toHaveAttribute('data-id', 'sonda');

  // În nume, oriunde: „draw” e în mijlocul lui „3Draw”.
  await c.fill('draw');
  await vazute(page, ['tren']);
  await expect(gasite(page)).toHaveText('1 din 5');
  // Fără diacritice, de ambele părți.
  await c.fill('imbinari');
  await vazute(page, ['cutii']);
  await c.fill('ÎMBINĂRI');
  await vazute(page, ['cutii']);
  // În descriere, la început de cuvânt: „palpator” da, „alpator” nu.
  await c.fill('palp');
  await vazute(page, ['sonda']);
  // Descrierea lungă, care nu se vede în rând.
  await c.fill('diametrul');
  await vazute(page, ['ceas']);
  // Autorul și numele categoriei.
  await c.fill('vector studio');
  await vazute(page, ['tren']);
  await c.fill('jucarii');
  await vazute(page, ['tren']);
  // Fiecare cuvânt, fiecare unde poate; potrivirea din nume stă prima.
  await c.fill('easy lego');
  await vazute(page, ['tren']);
  await c.fill('3d');
  await vazute(page, ['tren', 'sonda']);
  await expect(gasite(page)).toHaveText('2 din 5');
  // Pagina din dreapta urmează lista: extensia aleasă a ieșit din ea, deci prima găsită.
  await expect(pagina(page)).toHaveAttribute('data-id', 'sonda');
  await c.fill('cadran');
  await vazute(page, ['ceas']);
  await expect(pagina(page)).toHaveAttribute('data-id', 'ceas');
});

test('nimic găsit: starea spune ce s-a căutat și are drumul înapoi; pagina nu arată altă extensie', async ({ page }) => {
  await cuRaftul(page);
  const c = cautare(page);
  await c.fill('alpator');
  await vazute(page, []);
  await expect(nimic(page)).toContainText('Nicio extensie nu se potrivește cu „alpator”.');
  await expect(gasite(page)).toHaveText('0 din 5');
  // Nicio pagină a altei extensii lângă o listă goală: locul ei spune de ce, nu „instalează din afara bibliotecii”.
  await expect(pagina(page)).toHaveCount(0);
  await expect(biblioteca(page).getByTestId('pagina-nimic')).toHaveText('Nimic de arătat: schimbă căutarea sau categoria.');
  await expect(biblioteca(page).getByTestId('pagina-goala')).toHaveCount(0);
  // Drumurile din afara bibliotecii rămân la capătul listei.
  await expect(biblioteca(page).locator('[data-extensii="din-fisier"]')).toBeVisible();
  await nimic(page).locator('[data-extensii="arata-toate"]').click();
  await vazute(page, TOATE);
  await expect(c).toHaveValue('');
  await expect(c).toBeFocused();
  await expect(nimic(page)).toHaveCount(0);
  await expect(biblioteca(page).getByTestId('pagina-nimic')).toHaveCount(0);
});

test('tastatura: „/” duce în câmp, ↓ în listă, Enter deschide primul rezultat; Escape golește întâi câmpul, apoi închide', async ({ page }) => {
  const b = await cuRaftul(page);
  const c = cautare(page);
  // La deschidere, focusul e pe fila aleasă; „/” îl duce în câmp, fără să scrie nimic.
  await expect(b.locator('[data-extensii="fila-toate"]')).toBeFocused();
  await page.keyboard.press('/');
  await expect(c).toBeFocused();
  await expect(c).toHaveValue('');
  // În câmp, „/” e o literă ca oricare.
  await page.keyboard.type('a/b');
  await expect(c).toHaveValue('a/b');
  await c.fill('c');
  // „c”: în nume „Cutii cu îmbinări”, „Sonda de colț” și „Cadran de ceas”; doar în descrieri, Easy 3Draw („circuite”) și
  // „Fără raft” („care”), în ordinea listei.
  await vazute(page, ['cutii', 'sonda', 'ceas', 'tren', 'fara']);
  // ↓ din câmp: primul rând; de acolo, săgețile listei, neschimbate (ADR 0231 §B.7); „/” se întoarce în câmp, cu textul ales.
  await page.keyboard.press('ArrowDown');
  await expect(randLista(page, 'cutii')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(randLista(page, 'sonda')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(randLista(page, 'cutii')).toBeFocused();
  await page.keyboard.press('/');
  await expect(c).toBeFocused();
  await expect(c).toHaveValue('c');
  // Enter în câmp: pagina primului rezultat.
  await c.fill('sond');
  await page.keyboard.press('Enter');
  await expect(pagina(page)).toHaveAttribute('data-id', 'sonda');
  await expect(randLista(page, 'sonda')).toHaveAttribute('aria-current', 'true');
  // Escape, cu text în câmp: îl golește, fereastra rămâne. Încă un Escape o închide.
  await expect(c).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(c).toHaveValue('');
  await expect(biblioteca(page)).toBeVisible();
  await vazute(page, TOATE);
  // Extensia deschisă cu Enter rămâne cea aleasă, nu prima din listă.
  await expect(pagina(page)).toHaveAttribute('data-id', 'sonda');
  await page.keyboard.press('Escape');
  await expect(biblioteca(page)).toHaveCount(0);
});

test('categoriile: doar cele prezente, în ordinea lor, cu numărul fiecăreia; una aleasă filtrează; „Toate” le arată iar', async ({ page }) => {
  await cuRaftul(page);
  const grup = categorii(page);
  await expect(grup).toBeVisible();
  await expect(grup).toHaveAttribute('role', 'group');
  await expect(grup).toHaveAccessibleName('Categorii');
  await expect(grup.locator('[data-extensii="categorie"]')).toHaveText(['Toate 5', 'Desen și forme 2', 'CNC și trasee 2', 'Imprimare 3D 1', 'Mașina 1', 'Jucării și modele 1']);
  await expect(categoria(page, '')).toHaveAttribute('aria-pressed', 'true');

  await categoria(page, 'desen').click();
  await vazute(page, ['cutii', 'ceas']);
  await expect(categoria(page, 'desen')).toHaveAttribute('aria-pressed', 'true');
  await expect(categoria(page, '')).toHaveAttribute('aria-pressed', 'false');
  await expect(grup.locator('[aria-pressed="true"]')).toHaveCount(1);
  await expect(biblioteca(page).getByTestId('biblioteca-gasite')).toHaveText('2 din 5');
  // Pagina urmează raftul: prima extensie a lui.
  await expect(pagina(page)).toHaveAttribute('data-id', 'cutii');
  // Numerele rafturilor nu se schimbă cu filtrul.
  await expect(categoria(page, 'cnc')).toHaveText('CNC și trasee 2');
  await expect(categoria(page, '')).toHaveText('Toate 5');

  // Categoria și căutarea, împreună.
  await cautare(page).fill('cadran');
  await vazute(page, ['ceas']);
  await expect(biblioteca(page).getByTestId('biblioteca-gasite')).toHaveText('1 din 5');
  // Nici cu textul căutat: numerele sunt ale rafturilor, nu ale căutării.
  await expect(categoria(page, 'cnc')).toHaveText('CNC și trasee 2');
  await expect(categoria(page, 'desen')).toHaveText('Desen și forme 2');
  await cautare(page).fill('');
  await categoria(page, '').click();
  await vazute(page, TOATE);
  await expect(biblioteca(page).getByTestId('biblioteca-gasite')).toHaveCount(0);
});

test('căutarea care găsește doar în alte categorii o spune și oferă „Caută în toate categoriile”', async ({ page }) => {
  await cuRaftul(page);
  await categoria(page, 'masina').click();
  await vazute(page, ['sonda']);
  await cautare(page).fill('cadran');
  await vazute(page, []);
  await expect(nimic(page)).toContainText('Nicio extensie din „Mașina” nu se potrivește cu „cadran”.');
  const inToate = nimic(page).locator('[data-extensii="in-toate-categoriile"]');
  await expect(inToate).toHaveText('Caută în toate categoriile (1)');
  await inToate.click();
  await vazute(page, ['ceas']);
  await expect(categoria(page, '')).toHaveAttribute('aria-pressed', 'true');
  await expect(cautare(page)).toHaveValue('cadran');
  // Cu rezultate și în categoria aleasă, celelalte se spun sub listă, fără să ascundă nimic.
  await cautare(page).fill('3d');
  await categoria(page, 'masina').click();
  await vazute(page, ['sonda']);
  const alte = biblioteca(page).locator('.bib-lista [data-extensii="in-toate-categoriile"]');
  await expect(alte).toHaveText('Caută în toate categoriile (1)');
  await alte.click();
  await vazute(page, ['tren', 'sonda']);
});

test('pagina extensiei își spune categoriile, cea principală prima; un clic pe una duce la raftul ei', async ({ page }) => {
  await cuRaftul(page);
  await randLista(page, 'tren').click();
  const etichete = pagina(page).getByTestId('pagina-categorii').locator('[data-extensii="categorie-pagina"]');
  await expect(etichete).toHaveText(['Jucării și modele', 'Imprimare 3D', 'CNC și trasee']);
  await etichete.nth(2).click();
  await vazute(page, ['tren', 'cutii']);
  await expect(categoria(page, 'cnc')).toHaveAttribute('aria-pressed', 'true');
  // Extensia aleasă rămâne pe pagină: e pe raftul acesta.
  await expect(pagina(page)).toHaveAttribute('data-id', 'tren');
  // O extensie fără categorii n-are rândul lor.
  await categoria(page, '').click();
  await randLista(page, 'fara').click();
  await expect(pagina(page)).toHaveAttribute('data-id', 'fara');
  await expect(pagina(page).getByTestId('pagina-categorii')).toHaveCount(0);
});

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
async function instaleazaDinFisier(page: Page, nume: string, octeti: Buffer): Promise<void> {
  await page.locator('[data-extensii="fisier-ales"]').setInputFiles({ name: nume, mimeType: 'application/zip', buffer: octeti });
  await expect(page.getByTestId('extensii-instalare')).toBeVisible();
  await page.locator('[data-extensii="instaleaza"]').click();
  await expect(page.getByTestId('extensii-instalare')).toHaveCount(0);
}

test('în „Instalate”: aceeași căutare, și peste extensiile din afara bibliotecii; categoria aleasă nu trece pe un raft care lipsește', async ({ page }) => {
  await page.goto('/');
  // Raftul de probă are și un rând cu id-ul lui „Salut”: instalată din fișier, își ia categoria de la el.
  await raftDeProba(page, [...RAFT, { id: 'salut', nume: 'Salut', categorii: ['desen'] }]);
  await instaleazaDinFisier(page, 'salut.zip', Buffer.from(SALUT));
  await instaleazaDinFisier(page, 'altul.zip', await salut({ id: 'altul', nume: 'Șablonul meu' }));
  const b = await deschideBiblioteca(page);
  await categoria(page, 'masina').click();
  await vazute(page, ['sonda']);
  // „Instalate” n-are raftul „Mașina”: categoria se întoarce la „Toate”.
  await b.locator('[data-extensii="fila-instalate"]').click();
  await vazute(page, ['salut', 'altul']);
  await expect(categorii(page).locator('[data-extensii="categorie"]')).toHaveText(['Toate 2', 'Desen și forme 1']);
  await expect(categoria(page, '')).toHaveAttribute('aria-pressed', 'true');
  // Întors în „Din bibliotecă”, raftul părăsit nu revine singur.
  await b.locator('[data-extensii="fila-toate"]').click();
  await vazute(page, [...TOATE, 'salut']);
  await expect(categoria(page, '')).toHaveAttribute('aria-pressed', 'true');
  await b.locator('[data-extensii="fila-instalate"]').click();
  await vazute(page, ['salut', 'altul']);
  // Căutarea, peste numele unei extensii din afara bibliotecii (fără diacritice) și peste id-ul ei.
  await cautare(page).fill('sablonul');
  await vazute(page, ['altul']);
  await expect(b.getByTestId('biblioteca-gasite')).toHaveText('1 din 2');
  await cautare(page).fill('');
  await categoria(page, 'desen').click();
  await vazute(page, ['salut']);
  // Textul căutat rămâne când schimbi fila; categoria care există și dincolo rămâne și ea.
  await cautare(page).fill('salut');
  await b.locator('[data-extensii="fila-toate"]').click();
  await vazute(page, ['salut']);
  await expect(cautare(page)).toHaveValue('salut');
  await expect(categoria(page, 'desen')).toHaveAttribute('aria-pressed', 'true');
});

test('fără catalog, „Instalate” n-are categorii; căutarea merge pe numele extensiilor instalate', async ({ page }) => {
  await page.goto('/');
  await instaleazaDinFisier(page, 'salut.zip', Buffer.from(SALUT));
  await instaleazaDinFisier(page, 'altul.zip', await salut({ id: 'altul', nume: 'Șablonul meu' }));
  await page.route('**/extensii/catalog.json', (r) => r.abort('failed'));
  const b = await deschideBiblioteca(page);
  await expect(b.getByTestId('biblioteca-fara-catalog')).toBeVisible();
  await vazute(page, ['salut', 'altul']);
  await expect(categorii(page)).toHaveCount(0);
  await cautare(page).fill('sabl');
  await vazute(page, ['altul']);
});

test('biblioteca adevărată: Easy 3Draw stă pe trei rafturi, iar rândul categoriilor se vede și cu o singură extensie; în engleză, numele lor', async ({ page }) => {
  await page.goto('/');
  const p = await paginaDinCatalog(page, 'trenulet');
  await expect(p.getByTestId('pagina-categorii').locator('[data-extensii="categorie-pagina"]')).toHaveText(['Jucării și modele', 'Imprimare 3D', 'CNC și trasee']);
  await expect(categorii(page).locator('[data-extensii="categorie"]')).toHaveText(['Toate 1', 'CNC și trasee 1', 'Imprimare 3D 1', 'Jucării și modele 1']);
  await cautare(page).fill('lego');
  await vazute(page, ['trenulet']);
  await cautare(page).fill('');
  await page.keyboard.press('Escape');
  await expect(biblioteca(page)).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Limba' }).getByRole('button', { name: 'EN', exact: true }).click();
  const en = await paginaDinCatalog(page, 'trenulet');
  await expect(en.getByTestId('pagina-categorii').locator('[data-extensii="categorie-pagina"]')).toHaveText(['Toys and models', '3D printing', 'CNC and toolpaths']);
  await expect(categorii(page).locator('[data-extensii="categorie"]')).toHaveText(['All 1', 'CNC and toolpaths 1', '3D printing 1', 'Toys and models 1']);
  await expect(cautare(page)).toHaveAccessibleName('Search extensions');
  await cautare(page).fill('gears');
  await vazute(page, ['trenulet']);
});

const FONT_LAT = "Verdana, 'DejaVu Sans', sans-serif";
for (const latime of [390, 360, 320]) {
  test.describe(`pe telefon, la ${latime} px, la atingere`, () => {
    test.use({ viewport: { width: latime, height: 760 }, hasTouch: true, isMobile: true });
    for (const limba of ['ro', 'en'] as const) {
    test(`cu fontul lat (${limba}): câmpul și categoriile încap; categoria de pe pagină întoarce lista`, async ({ page }) => {
      await page.addInitScript((l) => { localStorage.setItem('cncvs2.limba', l); }, limba);
      await cuRaftul(page, true);
      await page.evaluate((f) => { document.documentElement.style.setProperty('--font', f); }, FONT_LAT);
      const m = await page.evaluate(() => {
        const lista = document.querySelector<HTMLElement>('.bib-filtre')!;
        const dr = (e: Element): number => e.getBoundingClientRect().right;
        const cip = [...document.querySelectorAll('[data-testid="biblioteca-categorii"] [data-extensii="categorie"]')];
        return {
          lat: innerWidth, pagina: document.documentElement.scrollWidth, lista: lista.scrollWidth - lista.clientWidth,
          cautare: dr(document.querySelector('[data-extensii="cauta-extensie"]')!), cipuri: Math.max(...cip.map(dr)), cate: cip.length,
          inalt: Math.min(...cip.map((e) => e.getBoundingClientRect().height)),
        };
      });
      expect(m.pagina, 'pagina nu se derulează în lateral').toBeLessThanOrEqual(m.lat);
      expect(m.lista, 'bara căutării nu se derulează în lateral').toBeLessThanOrEqual(0);
      expect(m.cautare, 'câmpul căutării').toBeLessThanOrEqual(m.lat);
      expect(m.cipuri, 'categoriile').toBeLessThanOrEqual(m.lat);
      expect(m.cate).toBe(6);
      // Ținta unei categorii, la atingere: cel puțin 44 px înălțime.
      expect(m.inalt).toBeGreaterThanOrEqual(44);
      // De pe pagina unei extensii, categoria ei întoarce lista, filtrată.
      await randLista(page, 'tren').click();
      await expect(pagina(page)).toBeVisible();
      // Cât e deschisă pagina, bara căutării nu stă deasupra ei.
      await expect(cautare(page)).toBeHidden();
      await pagina(page).getByTestId('pagina-categorii').locator('[data-categorie="cnc"]').click();
      await expect(page.getByTestId('biblioteca-lista')).toBeVisible();
      await vazute(page, ['tren', 'cutii']);
      await expect(categoria(page, 'cnc')).toHaveAttribute('aria-pressed', 'true');
    });
    }
  });
}
