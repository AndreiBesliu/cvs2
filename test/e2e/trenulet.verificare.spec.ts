/**
 * Verificarea din vederea „Modelul” a atelierului Easy 3Draw (ADR 0284, partea D; felia 3.Cg), pe pagina de sine
 * stătătoare a planificatorului (din aceleași surse ca pachetul). Pentru fiecare piesă, modelul spune dacă e prinsă, dacă
 * plutește sau dacă intră în alta:
 * - în listă, un semn pe rândul piesei („plutește”, „intră în alta”); deasupra listei, rezumatul;
 * - la piesa aleasă, de cine e prinsă, în cine intră și de ce plutește;
 * - în vederea 3D, piesa care intră în alta e roșie, iar cea care plutește, galbenă (peste culoarea ei);
 * - e un avertisment, nu un refuz: piesa rămâne unde a fost pusă.
 * Valorile sunt pe hârtie, din cotele pieselor: cărămida 2 × 4 are corpul de 9,6 mm (3 plăci) și știfturile de 1,9; placa
 * 2 × 2 stă pe știfturile ei la z = 3 plăci; o placă mai sus e în aer, o placă mai jos e în pereții cărămizii. Axul intrat
 * până la capăt în gaura grinzii (7,8) își ține roata (3,8) în grindă, la z 4 … 7,8; glisat cu 4 mm, roata e la 0,2 mm
 * deasupra grinzii; glisat cu 32 mm, axul (31,8) a ieșit din gaură.
 */
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { citestePng } from '../unit/ajutor-png.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

const PAGINA = 'http://easy3draw.test/';
const CHEIE = 'atelier.caramizi.v1';
const CARAMIDA = 'Cărămidă 2×4', PLACA = 'Placă 2×2', AX = 'Ax 4', ROATA = 'Roată dințată 24';
const baza = { stifturi: true, fund: 'tuburi', gauri: [], laterale: [], goale: false, mod: 'forma' };
const DEF_CARAMIDA = { tip: 'caramida', celule: [0, 1, 2, 3].flatMap((i) => [[i, 0], [i, 1]]), placi: 3, ...baza };
const DEF_PLACA = { tip: 'caramida', celule: [[0, 0], [1, 0], [0, 1], [1, 1]], placi: 1, ...baza };
/** Piesele probei sunt albe: roșul și galbenul din vedere sunt atunci doar ale avertismentelor. */
const ALB = '#f1f1ee';
const caramida = (id: string, x: number, y: number, z: number) => ({ id, def: DEF_CARAMIDA, x, y, z, rot: 0, culoare: ALB });
const placa = (id: string, x: number, y: number, z: number) => ({ id, def: DEF_PLACA, x, y, z, rot: 0, culoare: ALB });
const BINE = 'Verificare: nicio piesă nu plutește și niciuna nu intră în alta.';

type Tinut = { id: string; x: number; y: number; z: number; rot: number; prins?: { de: string; alunec: number } };

async function deschide(page: Page, stocat?: unknown): Promise<void> {
  const { preview } = paginiPlanificator();
  await page.route(PAGINA, (r) => r.fulfill({ body: preview, contentType: 'text/html; charset=utf-8' }));
  await threeDinPachet(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (stocat !== undefined) await page.addInitScript(([k, s]) => { localStorage.setItem(k, s); }, [CHEIE, JSON.stringify(stocat)] as const);
  await page.goto(PAGINA);
  await intraIn3D(page);
}
async function piesa(page: Page, fila: string, tip: string): Promise<void> {
  await page.locator('#at-vedere-mod [data-v="piesa"]').click();
  await page.locator(`#at-tipuri [data-fila="${fila}"]`).click();
  await page.locator(`#at-galerie [data-piesa="${tip}"]`).click();
  await expect(page.locator(`#at-galerie [data-piesa="${tip}"]`)).toHaveAttribute('aria-pressed', 'true');
}
const inModel = async (page: Page) => { await page.locator('#at-in-model').click(); await expect(page.locator('#at-vedere-mod [data-v="model"]')).toHaveAttribute('aria-pressed', 'true'); };
const modelul = (page: Page) => page.locator('#at-vedere-mod [data-v="model"]').click();
const lista = (page: Page) => page.locator('#at-m-lista li');
const alege = (page: Page, k: number) => lista(page).nth(k).locator('button').click();
const muta = (page: Page, op: string) => page.locator(`#at-m-mutari [data-m="${op}"]`).click();
/** Semnul fiecărui rând al listei: „”, „pluteste” sau „intra”. */
const semne = (page: Page) => lista(page).evaluateAll((e) => e.map((li) => (li as HTMLElement).dataset['avert'] ?? '(lipsă)'));
/** Rezumatul verificării, de deasupra listei. */
const rezumat = (page: Page) => page.locator('#at-m-verificare');
/** Ce spune verificarea despre piesa aleasă: rândurile ei, în ordine. */
const stare = (page: Page) => page.locator('#at-m-stare [data-stare]');
const feluri = (page: Page) => stare(page).evaluateAll((e) => e.map((p) => (p as HTMLElement).dataset['stare']));
const tinut = (page: Page) => page.evaluate((k) => (JSON.parse(localStorage.getItem(k) ?? '{}') as { model?: Tinut[] }).model ?? [], CHEIE);
/**
 * Câți pixeli ai vederii 3D sunt roșii și câți galbeni. Piesele probei sunt albe (r ≈ g ≈ b, oricum ar cădea lumina), deci:
 * roșul avertismentului dă r mult peste g și b, cu g ≈ b; galbenul, r și g mult peste b. `contur`: câți dintre ei au chiar
 * culoarea avertismentului (conturul din jurul piesei; vălul de peste ea e amestecat cu albul piesei).
 */
async function culori(page: Page): Promise<{ rosu: number; galben: number; contur: number }> {
  const pix = citestePng(await page.locator('#at-vedere canvas').screenshot()).date;
  const aproape = (r: number, g: number, b: number, c: readonly number[]) => Math.abs(r - c[0]!) < 14 && Math.abs(g - c[1]!) < 14 && Math.abs(b - c[2]!) < 14;
  let rosu = 0, galben = 0, contur = 0;
  for (let i = 0; i < pix.length; i += 4) {
    const r = pix[i]!, g = pix[i + 1]!, b = pix[i + 2]!;
    if (r - g > 50 && r - b > 50 && g - b < 25) rosu++;
    else if (r - b > 70 && g - b > 40) galben++;
    if (aproape(r, g, b, [0xe5, 0x48, 0x4d]) || aproape(r, g, b, [0xf5, 0xa5, 0x24])) contur++;
  }
  return { rosu, galben, contur };
}
const CURAT = { rosu: 0, galben: 0, contur: 0 };

test('placa pe cărămidă e prinsă; cu o placă mai sus, plutește; cu o placă mai jos, intră în cărămidă. Piesa rămâne unde e pusă', async ({ page }) => {
  await deschide(page, { model: [caramida('a', 0, 0, 0), placa('b', 1, 0, 3)] });
  await modelul(page);
  await expect(lista(page)).toHaveText([`${CARAMIDA} 0, 0, 0`, `${PLACA} 1, 0, 3`]);
  expect(await semne(page)).toEqual(['', '']);
  await expect(rezumat(page)).toHaveText(`${BINE} Toate piesele se țin între ele.`);
  expect(await culori(page)).toEqual(CURAT);
  // fără nicio piesă aleasă, nu e nimic de spus despre una
  await expect(page.locator('#at-m-stare')).toHaveCount(0);
  // pagina spune ce face verificarea
  await expect(page.locator('#at-editor')).toContainText('Modelul verifică piesele: îți spune care plutește (nu stă pe masă și nu e prinsă de nimic) și care intră în alta. E un avertisment: piesa rămâne unde ai pus-o.');
  await alege(page, 1);
  await expect(stare(page)).toHaveText([`Prinsă de ${CARAMIDA}.`]);
  expect(await feluri(page)).toEqual(['prinsa']);
  // un rând liniștit, ca rezumatul fără probleme
  await expect(stare(page)).toHaveClass(['mic']);
  await expect(rezumat(page)).toHaveClass('mic');
  await alege(page, 0);
  await expect(stare(page)).toHaveText([`Prinsă de ${PLACA}.`]);

  // cu o placă mai sus (3,2 mm), placa e în aer
  await alege(page, 1);
  await muta(page, 'z+');
  await expect(lista(page)).toHaveText([`${CARAMIDA} 0, 0, 0`, `${PLACA} plutește 1, 0, 4`]);
  expect(await semne(page)).toEqual(['', 'pluteste']);
  await expect(lista(page).nth(1).locator('.semn')).toHaveText('plutește');
  await expect(stare(page)).toHaveText(['Plutește: nu stă pe masă și nu e prinsă de nimic.']);
  expect(await feluri(page)).toEqual(['pluteste']);
  await expect(rezumat(page)).toHaveText('Verificare: o piesă plutește.');
  // în vedere: placa are un văl galben peste ea și un contur galben în jur; nimic roșu
  let c = await culori(page);
  expect(c.contur).toBeGreaterThan(2000);
  expect(c.galben - c.contur).toBeGreaterThan(5000);
  expect(c.rosu).toBe(0);
  // vălul și conturul nu intră în mărimea modelului: cărămida (11,5) și placa de la 12,8 la 17,9
  await expect(page.locator('#at-cote')).toContainText('Mărime 31,8 × 15,8 × 17,9 mm');
  // avertismentele sunt ale vederii „Modelul”: în vederea „Piesa” nu rămâne nimic galben (piesa de acolo e roșie)
  await page.locator('#at-vedere-mod [data-v="piesa"]').click();
  expect((await culori(page)).galben).toBe(0);
  await modelul(page);
  expect((await culori(page)).galben).toBeGreaterThan(5000);
  // semnul și rândul piesei alese au culoarea atenției; rezumatul, la fel
  await expect(lista(page).nth(1).locator('.semn')).not.toHaveClass(/rau/);
  await expect(stare(page)).toHaveClass(['avert']);
  await expect(rezumat(page)).toHaveClass('at-avert');
  // cărămida, de pe masă, nu mai e prinsă de nimic: i se spune, fără semn
  await alege(page, 0);
  await expect(stare(page)).toHaveText(['Nu e prinsă de alte piese.']);
  expect(await feluri(page)).toEqual(['neprinsa']);

  // cu o placă mai jos decât pe știfturi, corpul plăcii e în pereții cărămizii: intră una în alta (și placa e tot în aer)
  await alege(page, 1);
  await muta(page, 'z-');
  await muta(page, 'z-');
  await expect(lista(page)).toHaveText([`${CARAMIDA} intră în alta 0, 0, 0`, `${PLACA} intră în alta 1, 0, 2`]);
  expect(await semne(page)).toEqual(['intra', 'intra']);
  await expect(stare(page)).toHaveText([`Intră în ${CARAMIDA}.`, 'Plutește: nu stă pe masă și nu e prinsă de nimic.']);
  expect(await feluri(page)).toEqual(['intra', 'pluteste']);
  await expect(rezumat(page)).toHaveText('Verificare: 2 piese intră una în alta · o piesă plutește.');
  // în vedere: amândouă sunt roșii (vălul și conturul); roșul trece înaintea galbenului
  c = await culori(page);
  expect(c.contur).toBeGreaterThan(2000);
  expect(c.rosu - c.contur).toBeGreaterThan(5000);
  expect(c.galben).toBe(0);
  // semnul „intră în alta” are culoarea pericolului, alta decât a lui „plutește”
  await expect(lista(page).nth(1).locator('.semn')).toHaveClass(/rau/);
  await expect(stare(page)).toHaveClass(['avert rau', 'avert']);
  // e un avertisment, nu un refuz: placa e unde a fost pusă, și în modelul ținut
  await expect(page.locator('.model-ales')).toContainText(`${PLACA} · x 1, y 0, z 2 plăci`);
  expect((await tinut(page))[1]).toMatchObject({ x: 1, y: 0, z: 2 });
  await alege(page, 0);
  await expect(stare(page)).toHaveText([`Intră în ${PLACA}.`]);

  // înapoi pe știfturi: nimic de spus
  await alege(page, 1);
  await muta(page, 'z+');
  expect(await semne(page)).toEqual(['', '']);
  await expect(rezumat(page)).toHaveText(`${BINE} Toate piesele se țin între ele.`);
  expect(await culori(page)).toEqual(CURAT);
});

test('„Dublează” pune copia peste original: intră una în alta până e mutată alături; pe masă, neprinse, sunt două bucăți', async ({ page }) => {
  await deschide(page);
  await piesa(page, 'caramizi', 'caramida');
  await inModel(page);
  // o singură piesă: nimic de verificat
  await expect(rezumat(page)).toHaveCount(0);
  await expect(page.locator('#at-m-stare')).toHaveCount(0);
  expect(await semne(page)).toEqual(['']);
  await page.locator('#at-m-dubla').click();
  await expect(lista(page)).toHaveText([`${CARAMIDA} intră în alta 0, 0, 0`, `${CARAMIDA} intră în alta 1, 0, 0`]);
  await expect(rezumat(page)).toHaveText('Verificare: 2 piese intră una în alta.');
  // mutată cu trei știfturi mai la dreapta, copia e lângă original (la 0,2 mm): nu se mai ating
  await alege(page, 1);
  for (let k = 0; k < 2; k++) await muta(page, 'x+');
  expect(await semne(page)).toEqual(['intra', 'intra']);
  await muta(page, 'x+');
  await expect(lista(page)).toHaveText([`${CARAMIDA} 0, 0, 0`, `${CARAMIDA} 4, 0, 0`]);
  expect(await semne(page)).toEqual(['', '']);
  await expect(rezumat(page)).toHaveText(`${BINE} Modelul e din 2 bucăți care nu se țin între ele.`);
  await expect(stare(page)).toHaveText(['Nu e prinsă de alte piese.']);
});

test('plutește tot grupul care nu ajunge la masă; fără nimic pe masă, piesa cea mai de jos ține loc de masă', async ({ page }) => {
  // o cărămidă pe masă; departe de ea, la 6 plăci în sus, alta cu o placă pe știfturile ei
  await deschide(page, { model: [caramida('a', 0, 0, 0), caramida('b', 6, 0, 6), placa('p', 7, 0, 9)] });
  await modelul(page);
  await expect(lista(page)).toHaveText([`${CARAMIDA} 0, 0, 0`, `${CARAMIDA} plutește 6, 0, 6`, `${PLACA} plutește 7, 0, 9`]);
  await expect(rezumat(page)).toHaveText('Verificare: 2 piese plutesc.');
  await alege(page, 1);
  await expect(stare(page)).toHaveText(['Plutește, cu piesele de care e prinsă: niciuna nu ajunge la masă.', `Prinsă de ${PLACA}.`]);
  expect(await feluri(page)).toEqual(['pluteste', 'prinsa']);
  const c = await culori(page);
  expect(c.galben - c.contur).toBeGreaterThan(5000);
  expect(c.rosu).toBe(0);
  // fără cărămida de pe masă, cele două rămân singure: cea de jos ține loc de masă
  await alege(page, 0);
  await page.locator('#at-m-scoate').click();
  await expect(lista(page)).toHaveText([`${CARAMIDA} 6, 0, 6`, `${PLACA} 7, 0, 9`]);
  await expect(rezumat(page)).toHaveText(`${BINE} Toate piesele se țin între ele.`);
  expect(await culori(page)).toEqual(CURAT);
});

test('pe o tijă: axul intrat până la capăt își ține roata în grindă; glisat, roata iese; scos din gaură, axul plutește, deși e legat', async ({ page }) => {
  await deschide(page);
  await piesa(page, 'caramizi', 'grinda');
  await inModel(page);
  // gura de sus a găurii din mijloc a grinzii de 5
  await page.locator('#at-m-prinderi [data-pk="4"]').click();
  await piesa(page, 'legaturi', 'ax');
  await inModel(page);
  await expect(lista(page).nth(1)).toHaveText(`${AX} prinsă`);
  await expect(stare(page)).toHaveText([/^Prinsă de Grindă/]);
  // roata, pe capătul de sus al axului (rădăcina lui e la gura găurii): stă în grindă, la z 4 … 7,8
  await page.locator('#at-m-prinderi [data-pk="0"]').click();
  await piesa(page, 'roti', 'rotita');
  await inModel(page);
  await expect(lista(page).nth(2)).toHaveText(`${ROATA} intră în alta prinsă`);
  expect(await semne(page)).toEqual(['intra', '', 'intra']);
  await expect(stare(page)).toHaveText([/^Intră în Grindă/, `Prinsă de ${AX}.`]);
  await expect(rezumat(page)).toHaveText('Verificare: 2 piese intră una în alta.');
  // axul glisat cu 4 mm în sus: roata e deasupra grinzii
  await alege(page, 1);
  await muta(page, 'pg+');
  await expect(page.locator('.model-ales')).toContainText('· glisată 4 mm');
  expect(await semne(page)).toEqual(['', '', '']);
  await expect(rezumat(page)).toHaveText(`${BINE} Toate piesele se țin între ele.`);
  await expect(stare(page)).toHaveText([/^Prinsă de Grindă.*, Roată dințată 24\.$/]);
  // glisat cu 28 mm, axul (31,8) mai are 3,8 mm în gaură: ține; cu 32, a ieșit din ea
  for (let k = 0; k < 6; k++) await muta(page, 'pg+');
  await expect(page.locator('.model-ales')).toContainText('· glisată 28 mm');
  expect(await semne(page)).toEqual(['', '', '']);
  await muta(page, 'pg+');
  await expect(page.locator('.model-ales')).toContainText('· glisată 32 mm');
  expect(await semne(page)).toEqual(['', 'pluteste', 'pluteste']);
  await expect(lista(page).nth(1)).toHaveText(`${AX} plutește prinsă`);
  await expect(stare(page)).toHaveText([/^Legată de Grindă.*, dar prinderea lor nu mai ține\.$/, 'Plutește, cu piesele de care e prinsă: niciuna nu ajunge la masă.', `Prinsă de ${ROATA}.`]);
  expect(await feluri(page)).toEqual(['desfacuta', 'pluteste', 'prinsa']);
  await expect(rezumat(page)).toHaveText('Verificare: 2 piese plutesc.');
  // legătura din model a rămas: avertismentul nu schimbă nimic
  expect((await tinut(page))[1]!.prins).toMatchObject({ alunec: 32 });
});

test('un model ținut de dinainte se verifică la deschidere; verificarea nu se ține în model', async ({ page }) => {
  await deschide(page, { model: [caramida('a', 0, 0, 0), caramida('b', 0, 0, 0), placa('p', 9, 9, 4)] });
  await modelul(page);
  await expect(lista(page)).toHaveText([`${CARAMIDA} intră în alta 0, 0, 0`, `${CARAMIDA} intră în alta 0, 0, 0`, `${PLACA} plutește 9, 9, 4`]);
  await expect(rezumat(page)).toHaveText('Verificare: 2 piese intră una în alta · o piesă plutește.');
  const c = await culori(page);
  expect(c.rosu).toBeGreaterThan(300);
  expect(c.galben).toBeGreaterThan(300);
  // în modelul ținut sunt doar piesele și așezările lor
  await alege(page, 2);
  await muta(page, 'x+');
  const scris = await page.evaluate((k) => localStorage.getItem(k) ?? '', CHEIE);
  expect(scris).not.toMatch(/pluteste|intra|prinsa/);
});

test('semnele au culorile lor: „intră în alta”, a pericolului; „plutește”, a atenției; încap pe rând și pe telefon', async ({ page }) => {
  await deschide(page, { model: [caramida('a', 0, 0, 0), caramida('b', 0, 0, 0), placa('p', 9, 9, 4)] });
  await modelul(page);
  const fundal = (k: number) => lista(page).nth(k).locator('.semn').evaluate((e) => getComputedStyle(e).backgroundColor);
  const text = (k: number) => lista(page).nth(k).locator('.semn').evaluate((e) => getComputedStyle(e).color);
  expect(await fundal(0)).toBe(await fundal(1));
  expect(await fundal(0)).not.toBe(await fundal(2));
  expect(await text(0)).not.toBe(await text(2));
  // pe telefon (390 px): semnul stă pe rândul piesei, întreg, iar locul rămâne la dreapta lui
  await page.setViewportSize({ width: 390, height: 844 });
  for (let k = 0; k < 3; k++) {
    const rand = (await lista(page).nth(k).boundingBox())!, semn = (await lista(page).nth(k).locator('.semn').boundingBox())!, loc = (await lista(page).nth(k).locator('.mic').boundingBox())!;
    expect(semn.x).toBeGreaterThanOrEqual(rand.x);
    expect(semn.x + semn.width).toBeLessThanOrEqual(loc.x + 1);
    expect(loc.x + loc.width).toBeLessThanOrEqual(rand.x + rand.width + 1);
    // pe un singur rând (nu rupt pe două)
    expect(semn.height).toBeLessThan(30);
  }
});

test('o piesă pusă deasupra celei alese nu intră în ea: roata de 3,8 mm ține două plăci, deci a doua roată stă pe a doua placă', async ({ page }) => {
  await deschide(page);
  await piesa(page, 'roti', 'rotita');
  await page.locator('#at-r-repede [data-v="24"]').click();
  await inModel(page);
  await expect(lista(page)).toHaveText([`${ROATA} ax 1, 1, 0`]);
  // a doua, pe axul celei alese, pe prima placă liberă de deasupra ei (cu o singură placă, 3,2 mm, ar intra 0,6 mm în ea)
  await piesa(page, 'roti', 'rotita');
  await inModel(page);
  await expect(lista(page)).toHaveText([`${ROATA} ax 1, 1, 0`, `${ROATA} plutește ax 1, 1, 2`]);
  expect(await semne(page)).toEqual(['', 'pluteste']);
  // între ele nu e niciun ax: cea de sus nu e ținută de nimic
  await expect(stare(page)).toHaveText(['Plutește: nu stă pe masă și nu e prinsă de nimic.']);
  await expect(page.locator('#at-cote')).toContainText('Mărime 26 × 26 × 10,2 mm');
  // coborâtă cu o placă, intră în cea de jos
  await muta(page, 'z-');
  await expect(lista(page)).toHaveText([`${ROATA} intră în alta ax 1, 1, 0`, `${ROATA} intră în alta ax 1, 1, 1`]);
});
