/**
 * Construcțiile gata din atelierul Easy 3Draw (ADR 0284, partea E; felia 3.Ci), pe pagina de sine stătătoare a
 * planificatorului (din aceleași surse ca pachetul). În vederea „Modelul”, panoul „Construcții gata”:
 * - felul (șasiul cu patru roți, cutia de angrenaje, brațul de macara, barca cu elice, ventilatorul) și câmpurile lui, în
 *   margini;
 * - ce iese, pe hârtie: mărimile mecanismului și câte piese are, cu avertismentul motorului când lungește șasiul;
 * - „Fă construcția”: o construcție nouă, cu numele felului (cu numărul următor, dacă e luat), cu piesele prinse între ele;
 *   verificarea din 3.Cg spune că nicio piesă nu plutește, niciuna nu intră în alta și toate se țin între ele.
 * Valorile, pe hârtie: șasiul 8 × 6 cu roțile de Ø30,4 are axele la 8 · (8 − 2) = 48 mm și roțile de pe un ax la
 * 8 · 6 + 26,2 = 74,2 mm; 13 piese (placa, 2 șine, 2 axe, 4 roți, 4 bucșe). Cu Ø56, cel puțin 10 știfturi (axele la 64).
 * Ventilatorul (ADR 0341, felia 3.Cn): Ø40, grinda de 2 · 3 + 1 = 7 găuri, axul de 3; Ø48, grinda de 9; 7 piese (grinda,
 * 2 știfturi, carcasa, axul, bucșa, rotorul), și din editorul ventilatorului, cu „Fă-l în model”.
 */
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

const PAGINA = 'http://easy3draw.test/';
const CHEIE = 'atelier.caramizi.v1';
type Tinut = { constructii?: { id: string; nume: string; nr: number; model: { id: string; def: { tip: string }; prins?: { de: string; a: number; b: number } }[] }[]; activa?: string };

async function deschide(page: Page): Promise<void> {
  const { preview } = paginiPlanificator();
  await page.route(PAGINA, (r) => r.fulfill({ body: preview, contentType: 'text/html; charset=utf-8' }));
  await threeDinPachet(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(PAGINA);
  await intraIn3D(page);
  await page.locator('#at-vedere-mod [data-v="model"]').click();
}
const panou = (page: Page) => page.locator('#at-cg');
const text = (page: Page) => page.locator('#at-cg-text');
const optiuni = (page: Page) => page.locator('#at-c-alege option');
const tinut = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}') as Tinut, CHEIE);
const verificare = (page: Page) => page.locator('#at-m-verificare');
const BINE = 'Verificare: nicio piesă nu plutește și niciuna nu intră în alta. Toate piesele se țin între ele.';
/** Rândurile tabelului „Piesele construcției”: numele piesei și câte bucăți are. */
const randuri = (page: Page) => page.locator('#at-c-piese tbody tr').evaluateAll((e) => e.map((tr) => [tr.querySelector('td')!.textContent!.trim(), +tr.querySelector('[data-bucati]')!.textContent!] as [string, number]));

test('panoul e strâns la deschidere; desfăcut, arată șasiul 8 × 6 cu ce iese pe hârtie; „Fă construcția” îl pune, prins și verificat', async ({ page }) => {
  await deschide(page);
  await expect(panou(page)).not.toHaveAttribute('open', '');
  await page.locator('#at-cg > summary').click();
  await expect(page.locator('#at-cg-fel')).toHaveValue('sasiu');
  await expect(page.locator('#at-cg-fel option')).toHaveText(['Șasiu cu patru roți', 'Cutie de angrenaje', 'Braț de macara', 'Barcă cu elice', 'Ventilator']);
  await expect(page.locator('#at-cg-lung')).toHaveValue('8');
  await expect(page.locator('#at-cg-lat')).toHaveValue('6');
  await expect(page.locator('#at-cg-roata option')).toHaveText(['Ø30,4', 'Ø43,2', 'Ø56']);
  await expect(page.locator('#at-cg-roata')).toHaveValue('30.4');
  await expect(text(page)).toHaveText('Între axe: 48 mm; între roțile de pe un ax: 74,2 mm. 13 piese.');
  await expect(page.locator('[data-avert-gata]')).toHaveCount(0);
  await page.locator('#at-cg-fa').click();
  // o construcție nouă, după cea de la început (goală), aleasă, cu numele felului
  await expect(optiuni(page)).toHaveText(['Construcția 1', 'Șasiu cu patru roți']);
  await expect(page.locator('#at-c-alege')).toHaveValue((await tinut(page)).activa!);
  await expect(page.locator('#at-toast')).toHaveText('„Șasiu cu patru roți” e în model.');
  await expect(page.locator('#at-m-lista li')).toHaveCount(13);
  await expect(verificare(page)).toHaveText(BINE);
  expect(await randuri(page)).toEqual([['Placă 6×8', 1], ['Cărămidă Technic 1×8', 2], ['Ax 11', 2], ['Roată 30,4 × 13,6', 4], ['Bucșă ½', 4]]);
  // piesele sunt completate ca în editor: o roată pusă din editor (cu valorile de la pornire) e aceeași piesă cu cele ale
  // șasiului, deci se adună pe rândul lor
  await page.locator('#at-vedere-mod [data-v="piesa"]').click();
  await page.locator('#at-tipuri [data-fila="roti"]').click();
  await page.locator('#at-galerie [data-piesa="roata"]').click();
  await page.locator('#at-in-model').click();
  await expect(page.locator('#at-m-lista li')).toHaveCount(14);
  expect(await randuri(page)).toEqual([['Placă 6×8', 1], ['Cărămidă Technic 1×8', 2], ['Ax 11', 2], ['Roată 30,4 × 13,6', 5], ['Bucșă ½', 4]]);
  await page.locator('#at-m-scoate').click();
  await expect(page.locator('#at-m-lista li')).toHaveCount(13);
  // ținută: prima piesă pe grilă, celelalte prinse de piese ale aceleiași construcții, de dinaintea lor
  const t = await tinut(page), c = t.constructii!.find((x) => x.id === t.activa)!;
  expect(c.nume).toBe('Șasiu cu patru roți');
  expect(c.model[0]!.prins).toBeUndefined();
  c.model.slice(1).forEach((m, k) => expect(c.model.slice(0, k + 1).map((x) => x.id)).toContain(m.prins!.de));
  // panoul rămâne desfăcut după ce editorul se face din nou; a doua oară, numele are numărul următor
  await expect(panou(page)).toHaveAttribute('open', '');
  await page.locator('#at-cg-fa').click();
  await expect(optiuni(page)).toHaveText(['Construcția 1', 'Șasiu cu patru roți', 'Șasiu cu patru roți 2']);
});

test('câmpurile: un număr în afara marginilor se întoarce în ele; cu roțile de Ø56, șasiul se lungește la 10, cu avertismentul', async ({ page }) => {
  await deschide(page);
  await page.locator('#at-cg > summary').click();
  await page.locator('#at-cg-lat').fill('10');
  await page.locator('#at-cg-lat').press('Enter');
  await expect(text(page)).toHaveText('Între axe: 48 mm; între roțile de pe un ax: 106,2 mm. 13 piese.');
  await page.locator('#at-cg-lung').fill('30');
  await page.locator('#at-cg-lung').press('Enter');
  await expect(page.locator('#at-cg-lung')).toHaveValue('16');
  await expect(text(page)).toHaveText('Între axe: 112 mm; între roțile de pe un ax: 106,2 mm. 13 piese.');
  await page.locator('#at-cg-lung').fill('2');
  await page.locator('#at-cg-lung').press('Enter');
  await expect(page.locator('#at-cg-lung')).toHaveValue('6');
  await page.locator('#at-cg-roata').selectOption('56');
  await expect(text(page)).toHaveText('Între axe: 64 mm; între roțile de pe un ax: 106,2 mm. 13 piese.');
  await expect(page.locator('[data-avert-gata]')).toHaveText(['Cu roțile de Ø56 mm, șasiul are cel puțin 10 știfturi, ca roțile să nu se atingă: l-am lungit.']);
  await page.locator('#at-cg-fa').click();
  await expect(verificare(page)).toHaveText(BINE);
  expect(await randuri(page)).toEqual([['Placă 10×10', 1], ['Cărămidă Technic 1×10', 2], ['Ax 15', 2], ['Roată 56 × 13,6', 4], ['Bucșă ½', 4]]);
});

test('cutia de angrenaje, brațul de macara și barca: ce iese pe hârtie, iar construcția pusă e prinsă și verificată', async ({ page }) => {
  await deschide(page);
  await page.locator('#at-cg > summary').click();
  // cutia 1 : 9: două trepte de 8 / 24; pereții de o cărămidă și una Technic, axele de 6, roțile, bucșele
  await page.locator('#at-cg-fel').selectOption('angrenaje');
  await expect(page.locator('#at-cg-fel')).toBeFocused();
  await expect(page.locator('#at-cg-raport')).toHaveValue('1:3');
  await expect(text(page)).toHaveText('Axul de ieșire se rotește de 3 ori mai încet decât cel de intrare (o treaptă). 13 piese.');
  await page.locator('#at-cg-raport').selectOption('1:9');
  await expect(text(page)).toHaveText('Axul de ieșire se rotește de 9 ori mai încet decât cel de intrare (două trepte). 18 piese.');
  await page.locator('#at-cg-raport').selectOption('1:1');
  await expect(text(page)).toHaveText('Axul de ieșire se rotește la fel de repede ca cel de intrare, în sens opus. 13 piese.');
  await page.locator('#at-cg-raport').selectOption('1:9');
  await page.locator('#at-cg-fa').click();
  await expect(optiuni(page)).toHaveText(['Construcția 1', 'Cutie de angrenaje']);
  await expect(verificare(page)).toHaveText(BINE);
  expect(await randuri(page)).toEqual([['Placă 4×6', 1], ['Cărămidă 1×6', 2], ['Cărămidă Technic 1×6', 2], ['Ax 6', 3], ['Bucșă ½', 6], ['Roată dințată 8', 2], ['Roată dințată 24', 2]]);
  // brațul de macara 4 / 9 / 45°: pivotul la 3,2 + 3 · 9,6 + 5,8 = 37,8; vârful, cu 64 · sin 45° = 45,25 mai sus și în față
  await page.locator('#at-cg-fel').selectOption('macara');
  await expect(text(page)).toHaveText('Pivotul, la 37,8 mm de masă; vârful brațului, la 83,1 mm înălțime și 45,3 mm în față. 10 piese.');
  await page.locator('#at-cg-unghi').fill('0');
  await page.locator('#at-cg-unghi').press('Enter');
  await expect(text(page)).toHaveText('Pivotul, la 37,8 mm de masă; vârful brațului, la 37,8 mm înălțime și 64 mm în față. 10 piese.');
  await page.locator('#at-cg-fa').click();
  await expect(optiuni(page)).toHaveText(['Construcția 1', 'Cutie de angrenaje', 'Braț de macara']);
  await expect(verificare(page)).toHaveText(BINE);
  // barca 10 × 6, elicea de 32: axul de 3; corpul, cabina, blocul, axul, elicea, bucșa
  await page.locator('#at-cg-fel').selectOption('barca');
  await expect(text(page)).toHaveText('Axul elicei are 3 știfturi; elicea stă în spatele pupei. 6 piese.');
  await page.locator('#at-cg-fa').click();
  await expect(optiuni(page)).toHaveText(['Construcția 1', 'Cutie de angrenaje', 'Braț de macara', 'Barcă cu elice']);
  await expect(verificare(page)).toHaveText(BINE);
  await expect(page.locator('#at-m-lista li')).toHaveCount(6);
  // valorile fiecărui fel rămân cât fereastra e deschisă: înapoi la macara, unghiul e tot 0
  await page.locator('#at-cg-fel').selectOption('macara');
  await expect(page.locator('#at-cg-unghi')).toHaveValue('0');
});

test('ventilatorul (ADR 0341): din panou, Ø40 și grinda de 7; din editor, „Fă-l în model” îl pune cu valorile lui, prins și verificat', async ({ page }) => {
  await deschide(page);
  await page.locator('#at-cg > summary').click();
  await page.locator('#at-cg-fel').selectOption('ventilator');
  await expect(page.locator('#at-cg-diametru')).toHaveValue('40');
  await expect(page.locator('#at-cg-palete')).toHaveValue('7');
  await expect(page.locator('#at-cg-urechi')).toHaveValue('2');
  await expect(text(page)).toHaveText('Grinda are 7 găuri, axul 3 știfturi; rotorul stă pe ax, în mijlocul carcasei. 7 piese.');
  await page.locator('#at-cg-fa').click();
  await expect(optiuni(page)).toHaveText(['Construcția 1', 'Ventilator']);
  await expect(page.locator('#at-m-lista li')).toHaveCount(7);
  await expect(verificare(page)).toHaveText(BINE);
  // aceeași piesă pe un rând: știfturile, două; celelalte, câte una
  expect((await randuri(page)).map(([, n]) => n).sort()).toEqual([1, 1, 1, 1, 1, 2]);
  // din editorul ventilatorului: Ø48, cu 4 urechi la carcasă, apoi „Fă-l în model”: o construcție nouă, cu grinda de 9
  await page.locator('#at-vedere-mod [data-v="piesa"]').click();
  await page.locator('#at-tipuri [data-fila="propulsie"]').click();
  await page.locator('#at-galerie [data-piesa="ventilator"]').click();
  await page.locator('#at-ve-repede [data-v="48"]').click();
  await page.locator('#at-ve-piesa [data-v="carcasa"]').click();
  await page.locator('#at-ve-urechi [data-v="4"]').click();
  await page.locator('#at-ve-model').click();
  await expect(page.locator('#at-vedere-mod [data-v="model"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(optiuni(page)).toHaveText(['Construcția 1', 'Ventilator', 'Ventilator 2']);
  await expect(page.locator('#at-toast')).toHaveText('„Ventilator 2” e în model.');
  await expect(page.locator('#at-m-lista li')).toHaveCount(7);
  await expect(verificare(page)).toHaveText(BINE);
  await expect(page.locator('#at-cg-fel')).toHaveValue('ventilator');
  await expect(page.locator('#at-cg-diametru')).toHaveValue('48');
  await expect(page.locator('#at-cg-urechi')).toHaveValue('4');
  await expect(text(page)).toHaveText('Grinda are 9 găuri, axul 3 știfturi; rotorul stă pe ax, în mijlocul carcasei. 7 piese.');
  // ținută: carcasa cu 4 urechi, rotorul de Ø48, prinse de piese ale aceleiași construcții
  const t = await tinut(page), c = t.constructii!.find((x) => x.id === t.activa)!;
  expect(c.nume).toBe('Ventilator 2');
  const def = (piesa: string) => c.model.find((m) => (m.def as { piesa?: string }).piesa === piesa)!.def as Record<string, unknown>;
  expect([def('carcasa').diametru, def('carcasa').urechi, def('rotor').diametru]).toEqual([48, 4, 48]);
});
