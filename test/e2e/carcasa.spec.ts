/**
 * Felia 2.8a: carcasa interfeței (prototipul B, „pânza întâi”, cu arborele proiectului și coordonatele din A), așezată
 * după aranjament (`src/ui/aranjament.ts`). Paleta de comenzi, tema ținută minte, panourile strânse, garda barei
 * selecției, arborele și cursorul din bara de jos. Fiecare test are browserul lui, deci baza lui.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { ecran, vedere } from './ajutor-panza.ts';

test.use({ locale: 'ro-RO' });

const LOGO = 'test/placi/placa-02/logo-80mm.svg';
/** Pixeli CSS pe mm la zoomul de 100 % (mărimea reală pe un ecran de 96 dpi). */
const PX_PE_MM = 96 / 25.4;

const randuri = (page: Page) => page.getByTestId('lista-vectori').locator('button[data-instanta]');

async function centru(l: Locator): Promise<{ x: number; y: number }> {
  const b = await l.boundingBox();
  if (!b) throw new Error('elementul n-are cutie');
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Culoarea pânzei în centrul foii (150, 100 mm), ca `#rrggbb`, citită din pixelii ei. */
async function pixelFoaie(page: Page): Promise<string> {
  const v = await vedere(page);
  return page.evaluate(([px, py]) => {
    const el = document.querySelector('[data-testid="panza"]') as HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = el.width;
    c.height = el.height;
    const g = c.getContext('2d');
    if (!g) return '';
    g.drawImage(el, 0, 0);
    const [r, gr, b] = g.getImageData(Math.round(px), Math.round(py), 1, 1).data;
    return `#${[r, gr, b].map((x) => (x ?? 0).toString(16).padStart(2, '0')).join('')}`;
  }, [(v.tx + 150 * v.scara) * v.dpr, (v.ty - 100 * v.scara) * v.dpr] as const);
}

/** Culoarea foii din tema de acum (tokenul pe care îl citește și workerul). */
const tokenFoaie = (page: Page): Promise<string> =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--panza-foaie').trim().toLowerCase());

/** Două culori `#rrggbb` la cel mult 2 unități pe canal (rotunjirea la citirea pixelilor). */
function aproape(a: string, b: string): boolean {
  const c = (s: string): number[] => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const [x, y] = [c(a), c(b)];
  return a.length === 7 && b.length === 7 && x.every((v, i) => Math.abs(v - (y[i] ?? -99)) <= 2);
}

test('paleta de comenzi (Ctrl+K): se deschide, filtrează fără diacritice, rulează o acțiune, Esc o închide, focusul se întoarce', async ({ page }) => {
  await page.goto('/');
  const dreptunghi = page.locator('[data-actiune="document.adauga-dreptunghi"]');
  await dreptunghi.focus();
  await page.keyboard.press('Control+k');
  const paleta = page.getByRole('dialog', { name: 'Paleta de comenzi' });
  await expect(paleta).toBeVisible();
  const camp = paleta.getByRole('combobox');
  await expect(camp).toBeFocused();
  // Fără nimic selectat, „sterge” găsește „Șterge selecția”, inactivă și cu motivul ei: Enter n-o rulează.
  await camp.fill('sterge');
  const optiuni = paleta.getByRole('option');
  await expect(optiuni).toHaveCount(1);
  await expect(optiuni).toContainText('Șterge selecția');
  await expect(optiuni).toContainText('Selectează întâi ceva.');
  await expect(optiuni).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await expect(paleta).toBeVisible();
  // „cerc”: Adaugă cerc, aleasă, rulată cu Enter prin registru. Paleta se închide, iar focusul se întoarce pe buton.
  await camp.fill('cerc');
  await expect(optiuni).toHaveCount(1);
  await expect(optiuni).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(paleta).toHaveCount(0);
  await expect(randuri(page)).toHaveText(['cerc R15.00 cu centrul la X 70.00, Y 50.00']);
  await expect(dreptunghi).toBeFocused();
  // Escape o închide fără să ruleze nimic; focusul se întoarce tot pe buton.
  await page.keyboard.press('Control+k');
  await expect(paleta).toBeVisible();
  await camp.fill('dreptunghi');
  await expect(optiuni).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(paleta).toHaveCount(0);
  await expect(dreptunghi).toBeFocused();
  await expect(randuri(page)).toHaveCount(1);
  // „Caută o comandă” (sus în dreapta) o deschide și el; după Escape, focusul e înapoi pe el.
  const cauta = page.locator('[data-actiune="vedere.paleta"]');
  await cauta.click();
  await expect(paleta).toBeVisible();
  await expect(camp).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(paleta).toHaveCount(0);
  await expect(cauta).toBeFocused();
});

test.describe('tema', () => {
  test.use({ colorScheme: 'light' });

  test('aleasă din bară, rămâne după reîncărcare, iar pânza se redesenează cu culorile ei', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const tema = page.locator('[data-actiune="vedere.tema"]');
    await expect(html).toHaveAttribute('data-tema', 'auto');
    await expect(tema).toHaveAccessibleName('Tema: după sistem');
    const luminoasa = await tokenFoaie(page);
    await expect.poll(async () => aproape(await pixelFoaie(page), luminoasa)).toBe(true);
    // După sistem → luminoasă → întunecată.
    await tema.click();
    await expect(html).toHaveAttribute('data-tema', 'luminoasa');
    await tema.click();
    await expect(html).toHaveAttribute('data-tema', 'intunecata');
    await expect(tema).toHaveAccessibleName('Tema: întunecată');
    const intunecata = await tokenFoaie(page);
    expect(aproape(intunecata, luminoasa)).toBe(false);
    await expect.poll(async () => aproape(await pixelFoaie(page), intunecata)).toBe(true);
    // După reîncărcare: aceeași temă, pe pagină și pe pânză (fără să clipească întâi în cealaltă: e pusă înainte de randare).
    await page.reload();
    await expect(html).toHaveAttribute('data-tema', 'intunecata');
    await expect(tema).toHaveAccessibleName('Tema: întunecată');
    await expect.poll(async () => aproape(await pixelFoaie(page), intunecata)).toBe(true);
    // Înapoi la „după sistem”: sistemul e luminos, deci și pânza.
    await tema.click();
    await expect(html).toHaveAttribute('data-tema', 'auto');
    await expect.poll(async () => aproape(await pixelFoaie(page), luminoasa)).toBe(true);
  });
});

test('panourile se strâng și se deschid din colțul lor; foaia se potrivește în locul eliberat; bara selecției deschide proprietățile', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-actiune="document.adauga-cerc"]').click();
  const lista = page.locator('[data-actiune="vedere.lista"]');
  const prop = page.locator('[data-actiune="vedere.proprietati"]');
  const arbore = page.getByTestId('lista-vectori');
  const titluProp = page.getByRole('heading', { name: 'Proprietăți', exact: true });
  // La 1280 px, amândouă pornesc deschise.
  await expect(lista).toHaveAttribute('aria-expanded', 'true');
  await expect(prop).toHaveAttribute('aria-expanded', 'true');
  await expect(arbore).toBeVisible();
  await expect(titluProp).toBeVisible();
  const inainte = await vedere(page);

  await lista.click();
  await prop.click();
  await expect(lista).toHaveAttribute('aria-expanded', 'false');
  await expect(prop).toHaveAttribute('aria-expanded', 'false');
  await expect(arbore).toHaveCount(0);
  await expect(titluProp).toHaveCount(0);
  // „Arată toată foaia”: zona liberă dintre panouri e acum mai largă, deci foaia iese mai mare.
  await page.locator('[data-actiune="vedere.potriveste"]').click();
  await expect.poll(async () => (await vedere(page)).scara).toBeGreaterThan(inainte.scara * 1.05);

  // Deschise la loc, cu ce aveau.
  await lista.click();
  await expect(lista).toHaveAttribute('aria-expanded', 'true');
  await expect(randuri(page)).toHaveText(['cerc R15.00 cu centrul la X 70.00, Y 50.00']);
  // Cercul e ales: bara selecției arată, neapăsat, că proprietățile sunt strânse, și le deschide.
  const dinSelectie = page.locator('[data-context="vedere.proprietati"]');
  await expect(dinSelectie).toHaveAttribute('aria-pressed', 'false');
  await dinSelectie.click();
  await expect(titluProp).toBeVisible();
  await expect(dinSelectie).toHaveAttribute('aria-pressed', 'true');
  await expect(prop).toHaveAttribute('aria-expanded', 'true');
  // Și din paletă (tot registrul): „panoul listei” îl strânge din nou.
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('panoul listei');
  await page.keyboard.press('Enter');
  await expect(lista).toHaveAttribute('aria-expanded', 'false');
  await expect(arbore).toHaveCount(0);
});

test('garda barei selecției: al doilea clic al unui dublu-clic pe „Importă” nu apasă „Șterge”, apărut chiar sub cursor', async ({ page }) => {
  await page.goto('/');
  const importa = page.locator('[data-buton="importa"]');
  const sterge = page.locator('[data-context="document.sterge-selectia"]');
  const fisier = page.locator('[data-camp="fisier-svg"]');
  const contine = async (q: { x: number; y: number }): Promise<boolean> => {
    const b = await sterge.boundingBox();
    return b !== null && q.x > b.x + 2 && q.x < b.x + b.width - 2 && q.y > b.y + 2 && q.y < b.y + b.height - 2;
  };

  // Unde stă „Importă” în dialog; un import obișnuit arată unde apare bara selecției (piesa importată e aleasă).
  await fisier.setInputFiles(LOGO);
  await expect(page.getByTestId('import-marime')).toBeVisible();
  const q = await centru(importa);
  await importa.click();
  await expect(randuri(page)).toHaveCount(1);
  await expect(sterge).toBeVisible();
  // Vederea se mută (cu butonul din mijloc, din mijlocul zonei libere) până când „Șterge” stă exact sub „Importă”.
  const z = await centru(page.locator('.zona-libera'));
  for (let i = 0; i < 4 && !(await contine(q)); i++) {
    const p = await centru(sterge);
    await page.mouse.move(z.x, z.y);
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(z.x + (q.x - p.x) / 2, z.y + (q.y - p.y) / 2, { steps: 3 });
    await page.mouse.move(z.x + q.x - p.x, z.y + q.y - p.y, { steps: 3 });
    await page.mouse.up({ button: 'middle' });
    await vedere(page);
  }
  // Precondiția probei: fără ea, testul n-ar dovedi nimic.
  expect(await contine(q)).toBe(true);

  // Importul se anulează, apoi același fișier, cu un dublu-clic pe „Importă”: piesa apare în același loc, aleasă, cu
  // bara ei sub cursor. Al doilea clic trece prin bară (încă ascunsă de gardă) la pânză: piesa rămâne.
  await page.keyboard.press('Control+z');
  await expect(randuri(page)).toHaveCount(0);
  await fisier.setInputFiles(LOGO);
  await expect(page.getByTestId('import-marime')).toBeVisible();
  const q2 = await centru(importa);
  expect(Math.abs(q2.x - q.x)).toBeLessThan(1);
  expect(Math.abs(q2.y - q.y)).toBeLessThan(1);
  await page.mouse.dblclick(q.x, q.y);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(1);
  await page.waitForTimeout(500);
  await expect(randuri(page)).toHaveCount(1);

  // Martorul: după gardă, un clic în același loc chiar apasă „Șterge” (butonul era acolo).
  await randuri(page).first().click();
  await expect(sterge).toBeVisible();
  expect(await contine(q)).toBe(true);
  await page.mouse.click(q.x, q.y);
  await expect(randuri(page)).toHaveCount(0);
});

test('arborele proiectului: foaia, piesa importată și operațiile ei, deschise de selecție, de săgeată și de la tastatură', async ({ page }) => {
  await page.goto('/');
  const arbore = page.getByTestId('lista-vectori');
  await expect(arbore.locator('[data-nod="foaie"]')).toHaveText('Foaia 1 · 300 × 200 × 18 mm');
  await expect(arbore).toContainText('Nimic pe foaie încă.');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(LOGO);
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const rand = arbore.locator('li');
  await expect(rand).toHaveCount(1);
  const instanta = rand.locator('button[data-instanta]');
  const comuta = rand.locator('button[data-comuta]');
  await expect(instanta).toHaveText('logo-80mm');
  await expect(instanta).toHaveAttribute('aria-pressed', 'true');
  // Piesa importată e aleasă, deci rândul ei e deschis: piesa (trei contururi) și cele două operații din imbricare.
  await expect(comuta).toHaveAttribute('aria-expanded', 'true');
  await expect(rand.locator('[data-nod="piesa"]')).toHaveText('Piesa: 3 forme');
  await expect(rand.locator('[data-nod="operatie"]')).toHaveText([
    'Profil exterior pe 1 contur: 3 mm în treceri de 3 mm, T1 Ø6',
    'Profil interior pe 2 contururi: 3 mm în treceri de 3 mm, T1 Ø6',
  ]);

  // Săgeata îl închide; pe rând, săgeata dreapta îl deschide și stânga îl închide.
  await comuta.click();
  await expect(comuta).toHaveAttribute('aria-expanded', 'false');
  await expect(rand.locator('[data-nod]')).toHaveCount(0);
  await instanta.focus();
  await page.keyboard.press('ArrowRight');
  await expect(comuta).toHaveAttribute('aria-expanded', 'true');
  await expect(rand.locator('[data-nod="operatie"]')).toHaveCount(2);
  await page.keyboard.press('ArrowLeft');
  await expect(comuta).toHaveAttribute('aria-expanded', 'false');

  // Selecția de pe pânză se vede în arbore: un clic pe foaie, departe de logo, o golește.
  const la = await ecran(page, await vedere(page));
  const gol = la(250, 150);
  await page.mouse.click(gol.x, gol.y);
  await expect(page.getByTestId('selectie')).toContainText('Nimic selectat');
  await expect(instanta).toHaveAttribute('aria-pressed', 'false');
  // Alegerea din arbore selectează; Ctrl+D face o copie, aleasă, al cărei rând se deschide singur. Rândul închis de mână
  // rămâne închis.
  await instanta.click();
  await expect(page.getByTestId('selectie')).toHaveText('Selectat: logo-80mm');
  await page.keyboard.press('Control+d');
  await expect(rand).toHaveCount(2);
  await expect(rand.nth(1).locator('button[data-instanta]')).toHaveAttribute('aria-pressed', 'true');
  await expect(rand.nth(1).locator('[data-nod="operatie"]')).toHaveCount(2);
  await expect(rand.nth(0).locator('[data-nod]')).toHaveCount(0);
  // Săgețile sus / jos trec de la un rând la altul.
  await rand.nth(1).locator('button[data-instanta]').focus();
  await page.keyboard.press('ArrowUp');
  await expect(instanta.first()).toBeFocused();

  // Ctrl+Z de două ori: copia, apoi importul. Arborele rămâne cu foaia.
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await expect(arbore).toContainText('Nimic pe foaie încă.');
  await expect(arbore.locator('[data-nod="foaie"]')).toBeVisible();
});

test('bara de jos arată cursorul pe foaie, în mm, și zoomul; fără maus pe pânză, cursorul e „—”', async ({ page }) => {
  await page.goto('/');
  const cursor = page.getByTestId('cursor');
  const zoom = page.getByTestId('zoom');
  await expect(cursor).toHaveText('X —, Y — mm');
  let v = await vedere(page);
  await expect(zoom).toHaveText(`Zoom ${Math.round((v.scara / PX_PE_MM) * 100)} %`);
  const la = await ecran(page, v);
  const citeste = async (): Promise<readonly [number, number] | null> => {
    const m = /^X (-?\d+\.\d\d), Y (-?\d+\.\d\d) mm$/.exec((await cursor.textContent()) ?? '');
    return m ? [Number(m[1]), Number(m[2])] : null;
  };
  // Un pixel CSS e 1 / scara mm: cursorul spune punctul de sub maus cu cel mult atât, plus rotunjirea la 0,01.
  const toleranta = 1 / v.scara + 0.01;
  for (const [x, y] of [[100, 50], [250, 150], [0, 0]] as const) {
    const p = la(x, y);
    await page.mouse.move(p.x, p.y);
    await expect.poll(async () => {
      const c = await citeste();
      return c !== null && Math.abs(c[0] - x) <= toleranta && Math.abs(c[1] - y) <= toleranta;
    }, { message: `cursorul la (${x}, ${y}) mm` }).toBe(true);
  }
  // Peste bara de sus (o insulă deasupra pânzei), mausul nu mai e pe pânză.
  await page.getByRole('heading', { level: 1 }).hover();
  await expect(cursor).toHaveText('X —, Y — mm');
  // Zoomul urmează rotița, în procente din mărimea reală.
  const c = la(150, 100);
  await page.mouse.move(c.x, c.y);
  await page.mouse.wheel(0, -400);
  await expect.poll(async () => (await vedere(page)).scara).toBeGreaterThan(v.scara);
  v = await vedere(page);
  await expect(zoom).toHaveText(`Zoom ${Math.round((v.scara / PX_PE_MM) * 100)} %`);
  // În engleză, același cip, tradus (cifrele rămân).
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(zoom).toHaveText(`Zoom ${Math.round((v.scara / PX_PE_MM) * 100)} %`);
  await expect(cursor).toHaveAttribute('title', 'The cursor on the sheet, in mm from its lower left corner');
});
