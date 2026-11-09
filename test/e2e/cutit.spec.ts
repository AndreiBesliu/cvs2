import { test, expect, type Page } from '@playwright/test';
import { cerc, dxf, linie, lwpolilinie } from '../unit/ajutor-dxf.ts';
import { adauga, ecran, vedere } from './ajutor-panza.ts';

/**
 * Unealta Cuțit (feliile 10.3↑f și 10.3↑g, ADR 0181), în Edge, pe forme dintr-un DXF, fără nimic ales (răspunsul 2a: taie tot
 * ce trece): K alege unealta; felul **Linie** taie placa cu o tragere (cât tragi, locurile unde taie se numără), în două forme,
 * iar selecția rămâne goală, ca tăieturile următoare să aibă tot toate formele; Anulează o pune la loc; **Liber**, o urmă trasă
 * cu mâna; **Pen**, trei clicuri și Enter; **Formă** (nota owner-ului), un text pus pe placă: din ea ies litera și placa cu golul
 * ei, iar textul rămâne; două cercuri adunate cu Shift + clic taie împreună. **Foarfeca** deschide un cerc și desparte o cale
 * deschisă în două; **Retează** arată bucata de sub maus și, cu opt clicuri, face dintr-un „#” pătratul din mijloc, tot o formă;
 * cu o formă aleasă, bucata unei forme nealese se vede și pleacă până la cea aleasă; **Desparte**, din unealta Noduri, deschide
 * dreptunghiul în colțul ales.
 *
 * Felia 10.3↑i (ADR 0181 §2): din opțiunile Cuțitului, suprapunerea 2: cât tragi Linia, fâșia se vede, iar placa devine două
 * forme de 100 × 51 mm (aceeași alegere în panoul Taie); Linia cu Shift ține pașii de 15° (orizontala, de la y = 48).
 *
 * Felia 10.3↑j (ADR 0181 §6): „Îmbinarea” e stinsă la Liber; la Linie, zigzagul cu pasul 20, înălțimea 10 și raza 0 se vede cât
 * tragi (dinții, în locul fâșiei), iar placa devine două forme de 100 × 55 mm (aceeași alegere în panoul Taie). La 1280 px și cu
 * fontul lat al probei barei de sus (6.V↑d), bara Cuțitului (cu „Închide bucățile”, din nou în ea după schița din 09.11) și
 * panoul opțiunilor, cu îmbinarea aleasă, rămân în fereastră, în română și în engleză.
 */
test.use({ locale: 'ro-RO' });

const fisierDxf = (nume: string, text: string) => ({ name: nume, mimeType: 'application/dxf', buffer: Buffer.from(text, 'utf8') });
const PATRAT = lwpolilinie([[0, 0], [100, 0], [100, 100], [0, 100]], true, { strat: 'PATRAT' });
const GATA = 'Forme tăiate: 1; forme noi: 2.';

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

async function cutit(page: Page, fel: 'linie' | 'pen' | 'liber' | 'forma' | 'foarfeca' | 'reteaza'): Promise<void> {
  await page.locator('[data-unealta="cutit"]').click();
  await page.locator(`[data-cutit="${fel}"]`).click();
  await expect(page.locator(`[data-cutit="${fel}"]`)).toHaveAttribute('aria-pressed', 'true');
}

test('K alege Cuțitul; Linie: o tragere peste placă o taie în două forme, iar selecția rămâne goală (cât tragi, locurile se văd); Anulează', async ({ page }) => {
  const la = await placa(page);
  await page.locator('[data-unealta="selectie"]').focus();
  await page.keyboard.press('k');
  await expect(page.locator('[data-unealta="cutit"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('bara-cutit')).toBeVisible();
  await page.locator('[data-cutit="linie"]').click();
  // „Închide bucățile” stă în bara Cuțitului (răspunsul 5 al schiței din 09.11), la vedere și bifată.
  await expect(page.getByTestId('bara-cutit').locator('[data-cutit="inchide"]')).toBeVisible();
  await expect(page.getByTestId('bara-cutit').locator('[data-cutit="inchide"]')).toBeChecked();
  // Debifată în bară, închiderea e oprită pentru toate opțiunile: „Între bucăți” se stinge; bifată din nou, se aprinde.
  await page.getByTestId('bara-cutit').locator('[data-cutit="inchide"]').uncheck();
  await page.locator('[data-cutit="optiuni"]').click();
  await expect(page.locator('[data-cutit="intre-spatiu"]')).toBeDisabled();
  await page.locator('[data-cutit="optiuni"]').click();
  await expect(page.getByTestId('optiuni-cutit')).toHaveCount(0);
  await page.getByTestId('bara-cutit').locator('[data-cutit="inchide"]').check();
  await page.locator('[data-cutit="optiuni"]').click();
  await expect(page.locator('[data-cutit="intre-spatiu"]')).toBeEnabled();
  await page.locator('[data-cutit="optiuni"]').click();
  await expect(page.getByTestId('optiuni-cutit')).toHaveCount(0);
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
  // Selecția rămâne cum era: fără nimic ales, tot nimic (tăietura următoare are tot toate formele foii).
  await expect(alese(page)).toHaveCount(0);
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
  await expect(alese(page)).toHaveCount(0);
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

/** Formele din DXF (o singură piesă), apoi nimic ales și lipirea oprită. */
async function importa(page: Page, entitati: string, randuriDupa = 1): Promise<La> {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf('forme.dxf', dxf({ antet: [['$INSUNITS', 70, 4]], entitati })));
  await page.click('[data-buton="importa"]');
  await expect(page.locator('.dialog')).toHaveCount(0);
  await expect(randuri(page)).toHaveCount(randuriDupa);
  await page.locator('[data-editare="lipire"]').click();
  const la = await ecran(page, await vedere(page));
  await page.locator('[data-unealta="selectie"]').click();
  const q = la(250, 50);
  expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.getAttribute('data-testid') ?? null, [q.x, q.y] as const)).toBe('panza');
  await page.mouse.click(q.x, q.y);
  await expect(alese(page)).toHaveCount(0);
  return la;
}

test('Foarfecă: cercul se deschide în punctul clicului, tot o formă', async ({ page }) => {
  const la = await importa(page, cerc(50, 50, 40, { strat: 'CERC' }));
  await cutit(page, 'foarfeca');
  await expect(page.getByTestId('cutit-sfat')).toContainText('Clic pe conturul unei forme');
  const c = la(90, 50);
  await page.mouse.click(c.x, c.y);
  await expect(page.getByTestId('cutit-sfat')).toHaveText('Forme tăiate: 1; forme noi: 1.');
  await expect(randuri(page)).toHaveCount(1);
});

test('Foarfecă: calea deschisă se desparte în două forme; capătul ei, nu', async ({ page }) => {
  const la = await importa(page, lwpolilinie([[0, 0], [100, 0], [100, 100]], false, { strat: 'CALE' }));
  await cutit(page, 'foarfeca');
  const p = la(100, 40);
  await page.mouse.click(p.x, p.y);
  await expect(page.getByTestId('cutit-sfat')).toHaveText('Forme tăiate: 1; forme noi: 2.');
  await expect(randuri(page)).toHaveCount(2);
  // Capătul unei căi deschise nu se desparte.
  const cap = la(100, 100);
  await page.mouse.click(cap.x, cap.y);
  await expect(page.getByTestId('cutit-sfat')).toHaveText('Capătul unei căi deschise nu se poate despărți: dă clic între capete.');
});

test('Retează: bucata de sub maus se vede; opt clicuri pe capetele unui „#” lasă pătratul din mijloc, tot o formă', async ({ page }) => {
  const DIEZ = [linie(0, 20, 100, 20), linie(0, 80, 100, 80), linie(20, 0, 20, 100), linie(80, 0, 80, 100)].join('');
  const la = await importa(page, DIEZ);
  await cutit(page, 'reteaza');
  for (const [x, y] of [[90, 20], [10, 20], [90, 80], [10, 80], [20, 90], [20, 10], [80, 90], [80, 10]] as const) {
    const q = la(x, y);
    await page.mouse.move(q.x, q.y);
    // Capătul de sub maus (de la încrucișare până la capătul liniei) e marcat cu roșu, înainte de clic.
    await expect(page.getByTestId('cutit')).toHaveAttribute('data-marcaj', '2');
    await page.mouse.click(q.x, q.y);
    await expect(page.getByTestId('cutit-sfat')).toHaveText('Bucată scoasă; ce a rămas din contur stă în forma lui.');
  }
  await expect(randuri(page)).toHaveCount(1);
  await expect(alese(page)).toHaveCount(0);
  // Aleasă din listă, forma are cutia pătratului din mijloc.
  await page.locator('[data-unealta="selectie"]').click();
  await randuri(page).first().click();
  await expect(page.locator('#root, body').getByText('60.00 × 60.00 mm')).toBeVisible();
});

test('Retează cu o formă aleasă: bucata unei forme nealese se vede sub maus și pleacă până la cea aleasă; alegerea rămâne', async ({ page }) => {
  // Două importuri, deci două forme: orizontala y = 20 (aleasă) și verticala x = 50 (nealeasă), care o trece.
  await page.goto('/');
  for (const [nume, entitati] of [['orizontala.dxf', linie(0, 20, 100, 20)], ['verticala.dxf', linie(50, 0, 50, 100)]] as const) {
    await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf(nume, dxf({ antet: [['$INSUNITS', 70, 4]], entitati })));
    await page.click('[data-buton="importa"]');
    await expect(page.locator('.dialog')).toHaveCount(0);
  }
  await expect(randuri(page)).toHaveCount(2);
  await page.locator('[data-editare="lipire"]').click();
  await randuri(page).filter({ hasText: 'orizontala' }).click();
  await expect(alese(page)).toHaveCount(1);
  const la = await ecran(page, await vedere(page));
  await cutit(page, 'reteaza');
  const q = la(50, 90);
  await page.mouse.move(q.x, q.y);
  // Capătul de sus al verticalei (de la orizontală în sus) e marcat, deși verticala nu e aleasă.
  await expect(page.getByTestId('cutit')).toHaveAttribute('data-marcaj', '2');
  await page.mouse.click(q.x, q.y);
  await expect(page.getByTestId('cutit-sfat')).toHaveText('Bucată scoasă; ce a rămas din contur stă în forma lui.');
  await expect(randuri(page)).toHaveCount(2);
  await expect(alese(page)).toHaveCount(1);
  await expect(randuri(page).filter({ hasText: 'orizontala' })).toHaveAttribute('aria-pressed', 'true');
  // Din verticală a rămas bucata de sub orizontală: 0 × 20 mm.
  await page.locator('[data-unealta="selectie"]').click();
  await randuri(page).filter({ hasText: 'verticala' }).click();
  await expect(page.locator('#root, body').getByText('0.00 × 20.00 mm')).toBeVisible();
});

test('Noduri, Desparte: dreptunghiul se deschide chiar în colțul ales (o cale cu cinci noduri, tot o formă)', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-editare="lipire"]').click();
  await page.locator('[data-unealta="noduri"]').click();
  await expect(page.locator('[data-editare="nod-desparte"]')).toBeDisabled();
  const la = await ecran(page, await vedere(page));
  const colt = la(20, 20);
  await page.mouse.click(colt.x, colt.y);
  await expect(page.getByTestId('noduri')).toHaveAttribute('data-ales', '0');
  await page.locator('[data-editare="nod-desparte"]').click();
  await expect(randuri(page)).toHaveCount(1);
  await expect(randuri(page).first()).toContainText('cale');
  await expect(page.getByTestId('noduri')).toHaveAttribute('data-noduri', '5');
});

// ——— Opțiunile tăierii în bara cuțitului (felia 10.3↑h, ADR 0181 §2) ———

test('Păstrează stânga: cât tragi Linia, partea care pleacă e estompată; rămâne doar partea de deasupra, aceeași alegere și în panou', async ({ page }) => {
  const la = await placa(page);
  await cutit(page, 'linie');
  await page.locator('[data-cutit="optiuni"]').click();
  await page.locator('[data-cutit="parte-stanga"]').check();
  // Butonul opțiunilor arată că una nu e cea implicită, iar sfatul o spune.
  await expect(page.locator('[data-cutit="optiuni"]')).toHaveAttribute('data-activ', '1');
  await expect(page.getByTestId('cutit-sfat')).toContainText('Opțiuni: păstrează stânga.');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('optiuni-cutit')).toHaveCount(0);
  const a = la(-10, 20), b = la(110, 60);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  // Placa e împărțită de cuțit: partea din dreapta sensului (dedesubt) e estompată.
  await expect(page.getByTestId('cutit')).toHaveAttribute('data-estompate', '1');
  await page.mouse.up();
  await expect(page.getByTestId('cutit-sfat')).toHaveText('Forme tăiate: 1; forme noi: 1.');
  await expect(randuri(page)).toHaveCount(1);
  // Ce a rămas: de la latura tăiată, (0; 70/3), în sus: 100 × 76,67 mm.
  await page.locator('[data-unealta="selectie"]').click();
  await randuri(page).first().click();
  await expect(page.locator('#root, body').getByText('100.00 × 76.67 mm')).toBeVisible();
  // Aceeași alegere în panoul Taie.
  await page.locator('[data-editare="taiere"]').click();
  await expect(page.locator('[data-taiere="parte-stanga"]')).toBeChecked();
});

test('Prelungește până ies din formă: Linia trasă doar înăuntrul plăcii o taie de la o latură la alta (cât tragi, capetele prelungite se văd)', async ({ page }) => {
  const la = await placa(page);
  await cutit(page, 'linie');
  const a = la(20, 50), b = la(80, 50);
  // Fără prelungire, cuțitul nu atinge nimic.
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await expect(page.getByTestId('cutit')).toHaveAttribute('data-prelungiri', '0');
  await page.mouse.up();
  await expect(page.getByTestId('cutit-sfat')).toHaveText('Tăietura nu trece prin nicio formă aleasă (o atingere nu taie).');
  await page.locator('[data-cutit="optiuni"]').click();
  await page.locator('[data-cutit="prelungeste-forma"]').check();
  await page.locator('[data-cutit="optiuni"]').click();
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await expect(page.getByTestId('cutit')).toHaveAttribute('data-prelungiri', '2');
  await expect(page.getByTestId('cutit')).toHaveAttribute('data-locuri', '2');
  await page.mouse.up();
  await expect(page.getByTestId('cutit-sfat')).toHaveText(GATA);
  await expect(randuri(page)).toHaveCount(2);
});

test('Formă, cu „Șterge cuțitul”: un cerc pus pe placă o decupează și pleacă; Păstrează are „înăuntru” și „în afară”', async ({ page }) => {
  await page.goto('/');
  for (const [nume, entitati] of [['placa.dxf', PATRAT], ['cerc.dxf', cerc(50, 50, 20, { strat: 'CERC' })]] as const) {
    await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf(nume, dxf({ antet: [['$INSUNITS', 70, 4]], entitati })));
    await page.click('[data-buton="importa"]');
    await expect(page.locator('.dialog')).toHaveCount(0);
  }
  await expect(randuri(page)).toHaveCount(2);
  const cercul = await randuri(page).nth(1).getAttribute('data-instanta');
  await page.locator('[data-editare="lipire"]').click();
  const la = await ecran(page, await vedere(page));
  await nimicAles(page, la);
  await cutit(page, 'forma');
  await page.locator('[data-cutit="optiuni"]').click();
  const optiuni = page.getByTestId('optiuni-cutit');
  await expect(optiuni.locator('label', { has: page.locator('[data-cutit="parte-stanga"]') })).toHaveText('înăuntru');
  await expect(optiuni.locator('label', { has: page.locator('[data-cutit="parte-dreapta"]') })).toHaveText('în afară');
  await page.locator('[data-cutit="sterge"]').check();
  await page.locator('[data-cutit="optiuni"]').click();
  const c = la(70, 50);
  await page.mouse.click(c.x, c.y);
  await expect(page.getByTestId('cutit-sfat')).toHaveText('Forme tăiate: 1; forme noi: 2. Cuțitul-formă a fost șters.');
  // Din placă: discul și placa cu golul; cercul-cuțit a plecat.
  await expect(randuri(page)).toHaveCount(2);
  await expect(page.locator(`[data-instanta="${cercul ?? '—'}"]`)).toHaveCount(0);
});

/** Cutia (în proprietăți) a formei de pe rândul k al listei, aleasă cu Selecția; `alta`: cutia dinainte, de așteptat schimbată. */
async function cutia(page: Page, k: number, alta?: string): Promise<string> {
  await page.locator('[data-unealta="selectie"]').click();
  const cutie = page.locator('#root, body').getByText(/^100\.00 × \d+\.\d\d mm$/);
  await randuri(page).nth(k).click();
  await expect(cutie).toBeVisible();
  if (alta !== undefined) await expect(cutie).not.toHaveText(alta);
  return (await cutie.textContent()) ?? '';
}

test('Între bucăți, din opțiunile Cuțitului: cu suprapunerea 2, cât tragi Linia se vede fâșia, iar placa devine două forme de 100 × 51 mm', async ({ page }) => {
  const la = await placa(page);
  await cutit(page, 'linie');
  await page.locator('[data-cutit="optiuni"]').click();
  await page.locator('[data-cutit="intre-suprapunere"]').check();
  await page.locator('[data-cutit="latime"]').fill('2');
  await expect(page.locator('[data-cutit="optiuni"]')).toHaveAttribute('data-activ', '1');
  await expect(page.getByTestId('cutit-sfat')).toContainText('Opțiuni: suprapunere de 2 mm.');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('optiuni-cutit')).toHaveCount(0);
  const a = la(-10, 50), b = la(110, 50);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await expect(page.getByTestId('cutit')).toHaveAttribute('data-fasie', '2');
  await page.mouse.up();
  await expect(page.getByTestId('cutit-sfat')).toHaveText(GATA);
  await expect(randuri(page)).toHaveCount(2);
  expect(await cutia(page, 0)).toBe('100.00 × 51.00 mm');
  expect(await cutia(page, 1)).toBe('100.00 × 51.00 mm');
  // Aceeași alegere în panoul Taie.
  await page.locator('[data-editare="taiere"]').click();
  await expect(page.locator('[data-taiere="intre-suprapunere"]')).toBeChecked();
  await expect(page.locator('[data-taiere="latime"]')).toHaveValue('2');
});

test('Linie, cu Shift: tăietura ține pașii de 15° (trasă de la y = 48 spre y = 52, rămâne orizontala de la 48)', async ({ page }) => {
  const la = await placa(page);
  await cutit(page, 'linie');
  const a = la(-10, 48), b = la(110, 52);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.keyboard.down('Shift');
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.getByTestId('cutit-sfat')).toHaveText(GATA);
  await expect(randuri(page)).toHaveCount(2);
  const prima = await cutia(page, 0);
  const aDoua = await cutia(page, 1, prima);
  expect([prima, aDoua].sort()).toEqual(['100.00 × 48.00 mm', '100.00 × 52.00 mm']);
});

test('Îmbinarea, din opțiunile Cuțitului: stinsă la Liber; la Linie, zigzagul cu spațiul 0,2 se vede cât tragi (dinții, nu fâșia), iar placa devine două forme de 100 × 54,86 mm; la Liber, urma taie fără dinți', async ({ page }) => {
  const la = await placa(page);
  await cutit(page, 'liber');
  await page.locator('[data-cutit="optiuni"]').click();
  await expect(page.locator('[data-cutit="imbinare"]')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('optiuni-cutit')).toHaveCount(0);
  await cutit(page, 'linie');
  await page.locator('[data-cutit="optiuni"]').click();
  await page.locator('[data-cutit="imbinare"]').selectOption('zigzag');
  await page.locator('[data-cutit="imbinare-pas"]').fill('20');
  await page.locator('[data-cutit="imbinare-inaltime"]').fill('10');
  await page.locator('[data-cutit="imbinare-raza"]').fill('0');
  // Spațiul e jocul dintre dinți: fiecare bucată se taie cu drumul mutat cu 0,1 spre ea.
  await page.locator('[data-cutit="intre-spatiu"]').check();
  await page.locator('[data-cutit="latime"]').fill('0,2');
  await expect(page.locator('[data-cutit="optiuni"]')).toHaveAttribute('data-activ', '1');
  await expect(page.getByTestId('cutit-sfat')).toContainText('Opțiuni: spațiu de 0,2 mm; îmbinare zigzag (pasul 20, înălțimea 10, raza 0 mm).');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('optiuni-cutit')).toHaveCount(0);
  const a = la(-10, 50), b = la(110, 50);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await expect(page.getByTestId('cutit')).toHaveAttribute('data-dinti', '1');
  await expect(page.getByTestId('cutit')).toHaveAttribute('data-fasie', '0');
  await page.mouse.up();
  await expect(page.getByTestId('cutit-sfat')).toHaveText(GATA);
  await expect(randuri(page)).toHaveCount(2);
  // Vârfurile dinților (±5), coborâte cu 0,1 · √2 de drumul mutat (colțul de 90°): 55 − 0,141 = 54,86.
  expect(await cutia(page, 0)).toBe('100.00 × 54.86 mm');
  expect(await cutia(page, 1)).toBe('100.00 × 54.86 mm');
  // Aceeași alegere în panoul Taie.
  await page.locator('[data-editare="taiere"]').click();
  await expect(page.locator('[data-taiere="imbinare"]')).toHaveValue('zigzag');
  await expect(page.locator('[data-taiere="imbinare-raza"]')).toHaveValue('0');
  await page.locator('[data-taiere="inchide-panoul"]').click();
  await expect(page.getByTestId('panou-taiere')).toHaveCount(0);
  // La Liber, îmbinarea aleasă nu se aplică (e stinsă): urma verticală taie amândouă formele, fără dinți.
  await nimicAles(page, la);
  await cutit(page, 'liber');
  const c = la(50, -10), d = la(50, 110);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(d.x, d.y, { steps: 8 });
  await expect(page.getByTestId('cutit')).toHaveAttribute('data-dinti', '0');
  await page.mouse.up();
  await expect(page.getByTestId('cutit-sfat')).toHaveText('Forme tăiate: 2; forme noi: 4.');
  await expect(randuri(page)).toHaveCount(4);
});

/**
 * La 1280 px și cu fontul lat al probei barei de sus (6.V↑d: Verdana aici, DejaVu Sans pe Linux, unde `system-ui` e oricum
 * lat), cu grila pornită (câmpul pasului ei e și el în bară), bara cu Cuțitul rămâne în fereastră la fiecare fel al lui, iar
 * panoul opțiunilor, deschis, cu îmbinarea și mărimile ei, la fel. Cu fișierele încă în ea (înainte de 09.11), capătul ei era
 * la 1340 px.
 */
async function baraCutitIncape(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 760 });
  await placa(page);
  await page.locator('[data-editare="grila"]').click();
  await expect(page.locator('[data-editare="pas-grila"]')).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.setProperty('--font', "Verdana, 'DejaVu Sans', sans-serif"); });
  const inFereastra = async (selector: string, ce: string): Promise<void> => {
    const c = await page.locator(selector).boundingBox();
    if (!c) throw new Error(`${selector} n-are cutie`);
    expect(c.x, `${selector}, ${ce}`).toBeGreaterThanOrEqual(0);
    expect(c.x + c.width, `${selector}, ${ce}`).toBeLessThanOrEqual(1280);
  };
  for (const fel of ['reteaza', 'foarfeca', 'forma', 'liber', 'pen', 'linie'] as const) {
    await cutit(page, fel);
    await inFereastra('.sus > .bara', fel);
  }
  await page.locator('[data-cutit="optiuni"]').click();
  await page.locator('[data-cutit="imbinare"]').selectOption('coada');
  await expect(page.locator('[data-cutit="imbinare-raza"]')).toBeVisible();
  await inFereastra('.sus > .bara', 'cu opțiunile');
  await inFereastra('[data-testid="optiuni-cutit"]', 'cu îmbinarea');
}

test('bara Cuțitului întreagă la 1280 px și cu un font lat, cu opțiunile deschise și îmbinarea aleasă', async ({ page }) => {
  await baraCutitIncape(page);
});

test.describe('în engleză', () => {
  test.use({ locale: 'en-US' });
  test('bara Cuțitului întreagă la 1280 px și cu un font lat, cu textele englezești', async ({ page }) => {
    await baraCutitIncape(page);
  });
});
