/**
 * Piesele rotunde pe același ax în vederea „Modelul” a atelierului Easy 3Draw (ADR 0283, felia 3.Tu), pe pagina de sine
 * stătătoare a planificatorului (din aceleași surse ca pachetul):
 * - **captura owner-ului:** carcasa Ø48 la 0, 0, 0 și rotorul Ø48 la 2, 1, 3, dintr-un model ținut de dinainte: locurile
 *   rămân, iar cu mutările de azi (un știft, o placă) rotorul ajunge în carcasă, pe același ax;
 * - **3a:** rotorul pus cu carcasa lui aleasă intră în ea, la același Z; **2a:** o roată pusă cu alta aleasă intră pe axul
 *   ei, deasupra; o cărămidă, la mijlocul celei alese;
 * - **1a:** axul stă pe un știft (rândul piesei îl spune: „ax 4, 3, 0”), iar rotirea se face în jurul lui;
 * - „Înlocuiește în model” ține axul unei roți;
 * - piesele care nu sunt rotunde stau ca până acum (și cele așezate după placa lor, cum sunt știfturile pe lateral).
 * Ce se vede e judecat prin mărimea modelului (cutia tuturor pieselor din scenă), cu valorile pe hârtie: cutiile pieselor
 * față de ax, din motor (carcasa ±35,6 × ±26; rotorul −22,6…23,2 × ±23,2; roata de 40 ±21; elicea −19,3…36 × ±31,7).
 */
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

const PAGINA = 'http://easy3draw.test/';
const CHEIE = 'atelier.caramizi.v1';
const CARCASA = 'Carcasă de ventilator Ø48 × 10, cu 2 urechi';
const ROTOR = 'Rotor de ventilator Ø48 cu 7 palete, pasul 0,8';

/** Pagina planificatorului, cu stocarea dată (ca la o deschidere de mai târziu), în partea 3D. */
async function deschide(page: Page, stocat?: unknown): Promise<void> {
  const { preview } = paginiPlanificator();
  await page.route(PAGINA, (r) => r.fulfill({ body: preview, contentType: 'text/html; charset=utf-8' }));
  await threeDinPachet(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (stocat !== undefined) await page.addInitScript(([k, s]) => { localStorage.setItem(k, s); }, [CHEIE, JSON.stringify(stocat)] as const);
  await page.goto(PAGINA);
  await intraIn3D(page);
}
/** Alege o piesă a atelierului, în vederea „Piesa”. */
async function piesa(page: Page, fila: string, tip: string): Promise<void> {
  await page.locator('#at-vedere-mod [data-v="piesa"]').click();
  await page.locator(`#at-tipuri [data-fila="${fila}"]`).click();
  await page.locator(`#at-galerie [data-piesa="${tip}"]`).click();
  await expect(page.locator(`#at-galerie [data-piesa="${tip}"]`)).toHaveAttribute('aria-pressed', 'true');
}
/** Piesa ventilatorului de Ø48: rotorul sau carcasa. */
async function ventilator48(page: Page, care: 'rotor' | 'carcasa'): Promise<void> {
  await piesa(page, 'propulsie', 'ventilator');
  await page.locator('#at-ve-repede [data-v="48"]').click();
  await page.locator(`#at-ve-piesa [data-v="${care}"]`).click();
  await expect(page.locator('#at-nume-piesa')).toHaveText(care === 'rotor' ? ROTOR : CARCASA);
}
const inModel = async (page: Page) => { await page.locator('#at-in-model').click(); await expect(page.locator('#at-vedere-mod [data-v="model"]')).toHaveAttribute('aria-pressed', 'true'); };
const lista = (page: Page) => page.locator('#at-m-lista li');
const marime = (page: Page) => page.locator('#at-cote');
const muta = (page: Page, op: string) => page.locator(`#at-m-mutari [data-m="${op}"]`).click();
const model = (page: Page) => page.evaluate((k) => (JSON.parse(localStorage.getItem(k) ?? '{}') as { model?: { x: number; y: number; z: number; rot: number }[] }).model?.map((m) => [m.x, m.y, m.z, m.rot]), CHEIE);

test('captura owner-ului: carcasa și rotorul de Ø48 dintr-un model ținut de dinainte ajung pe același ax cu mutările de azi', async ({ page }) => {
  const carcasa = { tip: 'ventilator', piesa: 'carcasa', palete: 7, diametru: 48, joc: 0.8, pas: 0.8, latime: 45, urechi: 2 };
  const rotor = { tip: 'ventilator', piesa: 'rotor', palete: 7, diametru: 48, joc: 0.8, pas: 0.8, latime: 45, sens: 'dreapta', gaura: 'x', inel: 'nu' };
  await deschide(page, { model: [
    { id: 'c', def: carcasa, x: 0, y: 0, z: 0, rot: 0, culoare: '#c8322b' },
    { id: 'r', def: rotor, x: 2, y: 1, z: 3, rot: 0, culoare: '#1f5fbf' },
  ] });
  await page.locator('#at-vedere-mod [data-v="model"]').click();
  // locurile ținute rămân; rândul unei piese rotunde spune știftul axului: carcasa (9 × 7) la 0, 0 are axul pe știftul 4, 3;
  // rotorul (7 × 7) la 2, 1, pe 5, 4, cu 3 plăci mai sus
  await expect(lista(page)).toHaveText([`${CARCASA} ax 4, 3, 0`, `${ROTOR} ax 5, 4, 3`]);
  expect(await model(page)).toEqual([[0, 0, 0, 0], [2, 1, 3, 0]]);
  // pe hârtie: carcasa ține x 0,4…71,6 și y 2…54; rotorul, cu axul la (44, 36), y 12,8…59,2 și z 9,6…17,6
  await expect(marime(page)).toContainText('Mărime 71,2 × 57,2 × 17,6 mm');
  // rotorul, adus cu un știft spre stânga, unul în jos și trei plăci mai jos: pe axul carcasei, în ea
  await lista(page).nth(1).locator('button').click();
  await expect(page.locator('.model-ales')).toContainText(`${ROTOR} · axul pe știftul 5, 4, z 3 plăci`);
  await muta(page, 'x-');
  await muta(page, 'y-');
  for (let k = 0; k < 3; k++) await muta(page, 'z-');
  await expect(lista(page)).toHaveText([`${CARCASA} ax 4, 3, 0`, `${ROTOR} ax 4, 3, 0`]);
  await expect(page.locator('.model-ales')).toContainText(`${ROTOR} · axul pe știftul 4, 3, z 0 plăci`);
  // rotorul e cu totul în cutia carcasei: modelul e cât ea
  await expect(marime(page)).toContainText('Mărime 71,2 × 52 × 10 mm');
  expect(await model(page)).toEqual([[0, 0, 0, 0], [1, 0, 0, 0]]);
});

test('3a: rotorul pus cu carcasa lui aleasă intră în ea, pe același ax, la același Z; rotirea carcasei e în jurul axului', async ({ page }) => {
  await deschide(page);
  await ventilator48(page, 'carcasa');
  await inModel(page);
  await expect(lista(page)).toHaveText([`${CARCASA} ax 4, 3, 0`]);
  await expect(marime(page)).toContainText('Mărime 71,2 × 52 × 10 mm');
  // carcasa rămâne aleasă; rotorul ei intră în ea (nu deasupra, la 4 plăci)
  await ventilator48(page, 'rotor');
  await inModel(page);
  await expect(lista(page)).toHaveText([`${CARCASA} ax 4, 3, 0`, `${ROTOR} ax 4, 3, 0`]);
  await expect(marime(page)).toContainText('Piese 2');
  await expect(marime(page)).toContainText('Mărime 71,2 × 52 × 10 mm');
  expect(await model(page)).toEqual([[0, 0, 0, 0], [1, 0, 0, 0]]);
  // carcasa, rotită: urechile trec pe Y, axul rămâne pe știftul lui (colțul amprentei, 7 × 9, se mută la 1, −1)
  await lista(page).nth(0).locator('button').click();
  await muta(page, 'r');
  await expect(lista(page)).toHaveText([`${CARCASA} ax 4, 3, 0`, `${ROTOR} ax 4, 3, 0`]);
  await expect(page.locator('.model-ales')).toContainText(`${CARCASA} · axul pe știftul 4, 3, z 0 plăci · rotită 90°`);
  await expect(marime(page)).toContainText('Mărime 52 × 71,2 × 10 mm');
  expect(await model(page)).toEqual([[1, -1, 0, 1], [1, 0, 0, 0]]);
  // rotorul, mutat cu un știft: iese din carcasă cu 23,2 + 8 − 26 = 5,2 mm
  await lista(page).nth(1).locator('button').click();
  await muta(page, 'x+');
  await expect(lista(page)).toHaveText([`${CARCASA} ax 4, 3, 0`, `${ROTOR} ax 5, 3, 0`]);
  await expect(marime(page)).toContainText('Mărime 57,2 × 71,2 × 10 mm');
  // și invers: carcasa pusă cu rotorul ales intră în jurul lui, la același Z
  await ventilator48(page, 'carcasa');
  await inModel(page);
  await expect(lista(page)).toHaveText([`${CARCASA} ax 4, 3, 0`, `${ROTOR} ax 5, 3, 0`, `${CARCASA} ax 5, 3, 0`]);
});

test('2a: o roată pusă cu alta aleasă intră pe axul ei, deasupra; rotirea se face în jurul axului', async ({ page }) => {
  await deschide(page);
  await piesa(page, 'roti', 'rotita');
  await page.locator('#at-r-repede [data-v="40"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Roată dințată 40');
  await inModel(page);
  // roata de 40 (42 mm, amprenta 5 × 5): axul pe știftul 2, 2
  await expect(lista(page)).toHaveText(['Roată dințată 40 ax 2, 2, 0']);
  await expect(marime(page)).toContainText('Mărime 42 × 42 × 3,8 mm');
  // elicea cu 3 palete (55,3 × 63,4, axul la 19,3 mm de marginea din stânga): pe axul roții, cu o placă mai sus
  await piesa(page, 'propulsie', 'elice');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø72 cu 3 palete, pasul 0,7');
  await inModel(page);
  await expect(lista(page)).toHaveText(['Roată dințată 40 ax 2, 2, 0', 'Elice Ø72 cu 3 palete, pasul 0,7 ax 2, 2, 1']);
  // pe hârtie, față de ax: x de la −21 (roata) la 36 (vârful unei palete); y ±31,7 (elicea); z 3,2 + 8
  await expect(marime(page)).toContainText('Mărime 57 × 63,4 × 11,2 mm');
  // elicea, rotită un sfert de tură în jurul axului: vârful de la x 36 trece pe y
  await muta(page, 'r');
  await expect(lista(page)).toHaveText(['Roată dințată 40 ax 2, 2, 0', 'Elice Ø72 cu 3 palete, pasul 0,7 ax 2, 2, 1']);
  await expect(marime(page)).toContainText('Mărime 63,4 × 57 × 11,2 mm');
  // o roată de 16 (era pe linia dintre știfturi), pusă cu elicea aleasă: pe același ax, deasupra ei
  await piesa(page, 'roti', 'rotita');
  await page.locator('#at-r-repede [data-v="16"]').click();
  await inModel(page);
  await expect(lista(page).nth(2)).toHaveText('Roată dințată 16 ax 2, 2, 4');
  await expect(marime(page)).toContainText('Mărime 63,4 × 57 × 16,6 mm');
  // mutată cu un știft și adusă înapoi: aceleași numere
  await muta(page, 'x+');
  await expect(lista(page).nth(2)).toHaveText('Roată dințată 16 ax 3, 2, 4');
  await muta(page, 'x-');
  await expect(lista(page).nth(2)).toHaveText('Roată dințată 16 ax 2, 2, 4');
});

test('o cărămidă pusă cu alta aleasă intră la mijlocul ei; „Înlocuiește în model” ține axul unei roți', async ({ page }) => {
  await deschide(page);
  // cărămida 2 × 4 (amprenta 4 × 2, mijlocul la (16, 8)); rotundul 1 × 1 intră la mijloc: la 1, 0 (la egalitate pe y, locul
  // cu numărul mai mic), cu 3 plăci mai sus; rândul unei piese care nu e rotundă spune colțul, ca până acum
  await piesa(page, 'caramizi', 'caramida');
  await inModel(page);
  await expect(lista(page)).toHaveText([/^Cărămidă 2×4.* 0, 0, 0$/]);
  await expect(page.locator('.model-ales')).toContainText('· x 0, y 0, z 0 plăci');
  await piesa(page, 'caramizi', 'rotund');
  await inModel(page);
  await expect(lista(page).nth(1)).toHaveText(/ 1, 0, 3$/);
  await expect(lista(page).nth(1)).not.toContainText('ax');
  // o cărămidă la fel, pusă cu prima aleasă: din același colț, deasupra
  await lista(page).nth(0).locator('button').click();
  await piesa(page, 'caramizi', 'caramida');
  await inModel(page);
  await expect(lista(page).nth(2)).toHaveText(/^Cărămidă 2×4.* 0, 0, 3$/);
  // roata de 24, pusă cu cărămida aleasă: pe știftul cel mai apropiat de mijlocul ei (1, 0), deasupra
  await piesa(page, 'roti', 'rotita');
  await page.locator('#at-r-repede [data-v="24"]').click();
  await inModel(page);
  await expect(lista(page).nth(3)).toHaveText('Roată dințată 24 ax 1, 0, 6');
  // schimbată în editor cu una de 40 (amprenta 5 × 5 în loc de 3 × 3): axul rămâne pe știftul 1, 0
  await page.locator('#at-m-editeaza').click();
  await page.locator('#at-r-repede [data-v="40"]').click();
  await expect(page.locator('#at-in-model')).toHaveText('Înlocuiește în model');
  await inModel(page);
  await expect(lista(page).nth(3)).toHaveText('Roată dințată 40 ax 1, 0, 6');
  expect((await model(page))?.[3]).toEqual([-1, -2, 6, 0]);
  // o cărămidă schimbată în editor își ține colțul, ca până acum
  await lista(page).nth(1).locator('button').click();
  await page.locator('#at-m-editeaza').click();
  await page.locator('#at-rot-diam [data-diam="2"]').click();
  await inModel(page);
  await expect(lista(page).nth(1)).toHaveText(/ 1, 0, 3$/);
});

test('piesele cu ceva ce iese din placă stau după placa lor, ca până acum: două piese cu știfturi pe lateral, spate în spate', async ({ page }) => {
  await deschide(page);
  // știfturile pe lateral, 1 × 1: placa de 7,8 mm, cu știftul ieșit 1,8 mm spre −y (cutia 7,8 × 9,7 × 11,5)
  await piesa(page, 'caramizi', 'lateral');
  await inModel(page);
  await expect(lista(page)).toHaveText([/ 0, 0, 0$/]);
  await expect(marime(page)).toContainText('Mărime 7,8 × 9,7 × 11,5 mm');
  // a doua, pusă cu prima aleasă: pe aceeași placă, cu 3 plăci mai sus
  await piesa(page, 'caramizi', 'lateral');
  await inModel(page);
  await expect(lista(page).nth(1)).toHaveText(/ 0, 0, 3$/);
  await expect(marime(page)).toContainText('Mărime 7,8 × 9,7 × 21,1 mm');
  // rotită cu o jumătate de tură în jurul mijlocului plăcii (nu al cutiei): știftul ei iese spre +y, deci 1,8 + 7,8 + 1,8
  await muta(page, 'r');
  await muta(page, 'r');
  await expect(lista(page).nth(1)).toHaveText(/ 0, 0, 3$/);
  await expect(page.locator('.model-ales')).toContainText('· x 0, y 0, z 3 plăci · rotită 180°');
  await expect(marime(page)).toContainText('Mărime 7,8 × 11,6 × 21,1 mm');
});
