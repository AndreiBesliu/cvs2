/**
 * Orientarea de mână pe trei axe și jumătățile de pas în vederea „Modelul” a atelierului Easy 3Draw (ADR 0284, partea D;
 * felia 3.Cf-2), pe pagina de sine stătătoare a planificatorului (din aceleași surse ca pachetul):
 * - „Răstoarnă ↓” și „Răstoarnă →” culcă piesa aleasă câte un sfert de tură (vârful ei cade spre față, spre dreapta), în
 *   jurul mijlocului cutiei ei, cu partea de jos la aceeași înălțime; a patra răsturnare o pune la loc, pe grilă;
 * - o piesă răsturnată e **liberă**: rândul ei spune încotro îi e partea de sus; „Rotește ↻” o întoarce în jurul verticalei;
 * - „Jumătăți de pas”: X și Y câte o jumătate de știft (4 mm), Z câte o jumătate de placă (1,6 mm); între știfturi, piesa
 *   e liberă, cu locul spus în știfturi și plăci; ajunsă iar pe grilă, e din nou a ei;
 * - tastele: X și Y răstoarnă, Shift + săgeată mută cu o jumătate de pas; cu Ctrl, tastele sunt ale browserului;
 * - o piesă prinsă de una răsturnată o urmează; modelul ținut se deschide la fel.
 * Ce se vede e judecat prin mărimea modelului, cu valorile pe hârtie, din cotele pieselor: cărămida 2 × 4 e 31,8 × 15,8 ×
 * 11,5; pe grilă la 0, 0, cutia ei ține x 0,1 … 31,9, y 0,1 … 15,9, cu mijlocul la 16, 8.
 */
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

const PAGINA = 'http://easy3draw.test/';
const CHEIE = 'atelier.caramizi.v1';
const CARAMIDA = 'Cărămidă 2×4';
const DEF_CARAMIDA = { tip: 'caramida', celule: [0, 1, 2, 3].flatMap((i) => [[i, 0], [i, 1]]), placi: 3, stifturi: true, fund: 'tuburi', gauri: [], laterale: [], goale: false, mod: 'forma' };
const GRILA = ['x-', 'x+', 'y-', 'y+', 'z-', 'z+', 'r'];

type Tinut = { id: string; def: { tip: string }; x: number; y: number; z: number; rot: number; prins?: { de: string; a: number; b: number }; liber?: { m: number[]; t: number[] } };

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
const lista = (page: Page) => page.locator('#at-m-lista li');
const alege = (page: Page, k: number) => lista(page).nth(k).locator('button').click();
const marime = (page: Page) => page.locator('#at-cote');
const aleasa = (page: Page) => page.locator('.model-ales');
const buton = (page: Page, op: string) => page.locator(`#at-m-mutari [data-m="${op}"]`);
const muta = (page: Page, op: string) => buton(page, op).click();
const butoane = (page: Page) => page.locator('#at-m-mutari [data-m]').evaluateAll((e) => e.map((b) => (b as HTMLElement).dataset['m']));
const tinut = (page: Page) => page.evaluate((k) => (JSON.parse(localStorage.getItem(k) ?? '{}') as { model?: Tinut[] }).model ?? [], CHEIE);
const fara0 = (m: number[]) => m.map((v) => v + 0);

test('„Răstoarnă ↓” și „Răstoarnă →”: cărămida stă pe o parte, cu fața în jos, apoi iar pe grilă; „Rotește ↻” o întoarce în jurul verticalei', async ({ page }) => {
  await deschide(page);
  await piesa(page, 'caramizi', 'caramida');
  await inModel(page);
  await expect(lista(page)).toHaveText([`${CARAMIDA} 0, 0, 0`]);
  await expect(marime(page)).toContainText('Mărime 31,8 × 15,8 × 11,5 mm');
  // o piesă de pe grilă: mutările de până acum, apoi cele două răsturnări și jumătățile de pas
  expect(await butoane(page)).toEqual([...GRILA, 'tx', 'ty', 'fin']);
  await expect(buton(page, 'tx')).toHaveText('Răstoarnă ↓');
  await expect(buton(page, 'tx')).toHaveAccessibleName('Răstoarnă spre față');
  await expect(buton(page, 'ty')).toHaveText('Răstoarnă →');
  await expect(buton(page, 'ty')).toHaveAccessibleName('Răstoarnă spre dreapta');

  // spre față: vârful cade spre −y. Înălțimea de 11,5 trece pe y, în jurul mijlocului 8 (de la 2,25); lățimea, pe z, de la 0
  await muta(page, 'tx');
  await expect(lista(page)).toHaveText([`${CARAMIDA} liberă`]);
  await expect(aleasa(page)).toContainText(`${CARAMIDA} · liberă, colțul cutiei la 0,1, 2,25, 0 mm · cu partea de sus spre ↓ Y`);
  await expect(marime(page)).toContainText('Mărime 31,8 × 11,5 × 15,8 mm');
  let una = (await tinut(page))[0]!;
  expect(fara0(una.liber!.m)).toEqual([1, 0, 0, 0, 0, -1, 0, 1, 0]);
  // răsturnată, are aceleași butoane
  expect(await butoane(page)).toEqual([...GRILA, 'tx', 'ty', 'fin']);
  // a doua: cu fața în jos, pe locul ei
  await muta(page, 'tx');
  await expect(aleasa(page)).toContainText('liberă, colțul cutiei la 0,1, 0,1, 0 mm · cu fața în jos');
  await expect(marime(page)).toContainText('Mărime 31,8 × 15,8 × 11,5 mm');
  // a treia: vârful spre +y
  await muta(page, 'tx');
  await expect(aleasa(page)).toContainText('liberă, colțul cutiei la 0,1, 2,25, 0 mm · cu partea de sus spre Y ↑');
  // a patra: de unde a plecat, deci iar pe grilă
  await muta(page, 'tx');
  await expect(lista(page)).toHaveText([`${CARAMIDA} 0, 0, 0`]);
  await expect(aleasa(page)).toContainText(`${CARAMIDA} · x 0, y 0, z 0 plăci`);
  una = (await tinut(page))[0]!;
  expect(una.liber).toBeUndefined();
  expect([una.x, una.y, una.z, una.rot]).toEqual([0, 0, 0, 0]);

  // spre dreapta: vârful cade spre +x. Înălțimea trece pe x, în jurul mijlocului 16 (de la 10,25); lungimea, pe z
  await muta(page, 'ty');
  await expect(aleasa(page)).toContainText('liberă, colțul cutiei la 10,25, 0,1, 0 mm · cu partea de sus spre X →');
  await expect(marime(page)).toContainText('Mărime 11,5 × 15,8 × 31,8 mm');
  expect(fara0((await tinut(page))[0]!.liber!.m)).toEqual([0, 0, 1, 0, 1, 0, -1, 0, 0]);
  // rotită în jurul verticalei, prin mijlocul ei (16, 8): vârful trece de la +x la +y; cutia, 15,8 × 11,5 în jurul lui
  await muta(page, 'r');
  await expect(aleasa(page)).toContainText('liberă, colțul cutiei la 8,1, 2,25, 0 mm · cu partea de sus spre Y ↑');
  await expect(marime(page)).toContainText('Mărime 15,8 × 11,5 × 31,8 mm');
  // încă două sferturi: ← X, apoi ↓ Y
  await muta(page, 'r');
  await expect(aleasa(page)).toContainText('cu partea de sus spre ← X');
  await muta(page, 'r');
  await expect(aleasa(page)).toContainText('cu partea de sus spre ↓ Y');
});

test('o piesă ridicată se răstoarnă pe loc: partea de jos rămâne la înălțimea ei', async ({ page }) => {
  // cărămida la 3, −2, pe a cincea placă (z 16 mm), rotită un sfert: cutia x 24,1 … 39,9, y −15,9 … 15,9
  await deschide(page, { model: [{ id: 'a', def: DEF_CARAMIDA, x: 3, y: -2, z: 5, rot: 1, culoare: '#c0392b' }] });
  await page.locator('#at-vedere-mod [data-v="model"]').click();
  await alege(page, 0);
  await expect(aleasa(page)).toContainText('x 3, y -2, z 5 plăci · rotită 90°');
  await muta(page, 'tx');
  // în jurul lui X: y ține înălțimea (0 ± 5,75), z ține lungimea, de la 16
  await expect(aleasa(page)).toContainText('liberă, colțul cutiei la 24,1, -5,75, 16 mm · cu partea de sus spre ↓ Y');
  await expect(marime(page)).toContainText('Mărime 15,8 × 11,5 × 31,8 mm');
  // o piesă răsturnată se mută ca una liberă: 8 mm pe X, o placă pe Z
  await muta(page, 'x+');
  await muta(page, 'z-');
  await expect(aleasa(page)).toContainText('colțul cutiei la 32,1, -5,75, 12,8 mm');
});

test('„Jumătăți de pas”: o jumătate de știft pe X și Y, o jumătate de placă pe Z; între știfturi piesa e liberă, pe grilă e iar a ei', async ({ page }) => {
  await deschide(page);
  await piesa(page, 'caramizi', 'caramida');
  await inModel(page);
  await expect(buton(page, 'fin')).toHaveText('Jumătăți de pas');
  await expect(buton(page, 'fin')).toHaveAttribute('aria-pressed', 'false');
  // fără ele: un știft întreg
  await muta(page, 'x+');
  await expect(aleasa(page)).toContainText(`${CARAMIDA} · x 1, y 0, z 0 plăci`);
  const fond = () => buton(page, 'fin').evaluate((e) => getComputedStyle(e).backgroundColor);
  const neales = await fond();
  await muta(page, 'fin');
  await expect(buton(page, 'fin')).toHaveAttribute('aria-pressed', 'true');
  // ales, comutatorul se vede altfel (mausul mutat de pe el, ca să nu fie culoarea de sub cursor)
  await page.mouse.move(0, 0);
  expect(await fond()).not.toBe(neales);
  // ține două coloane din cele patru ale butoanelor, ca numele lui să încapă pe un rând și pe telefon
  const lat = (op: string) => buton(page, op).evaluate((e) => e.getBoundingClientRect().width);
  expect(await lat('fin')).toBeGreaterThan(2 * (await lat('x+')));
  // comutatorul nu schimbă modelul
  await expect(aleasa(page)).toContainText(`${CARAMIDA} · x 1, y 0, z 0 plăci`);
  // o jumătate de știft pe x: 4 mm; piesa stă drept, între știfturi
  await muta(page, 'x+');
  await expect(lista(page)).toHaveText([`${CARAMIDA} liberă`]);
  await expect(aleasa(page)).toContainText(`${CARAMIDA} · liberă, colțul cutiei la 12,1, 0,1, 0 mm · între știfturi: x 1,5, y 0, z 0`);
  let una = (await tinut(page))[0]!;
  expect(una.liber!.t.map((v) => Math.round(v * 1000) / 1000)).toEqual([12.1, 0.1, 0]);
  // încă una: iar pe grilă, la x 2
  await muta(page, 'x+');
  await expect(lista(page)).toHaveText([`${CARAMIDA} 2, 0, 0`]);
  una = (await tinut(page))[0]!;
  expect(una.liber).toBeUndefined();
  expect([una.x, una.y, una.z]).toEqual([2, 0, 0]);
  // pe grilă, rotirea e cea de pe grilă și cu jumătățile alese: colțul amprentei rămâne la 2, 0
  await muta(page, 'r');
  await expect(aleasa(page)).toContainText(`${CARAMIDA} · x 2, y 0, z 0 plăci · rotită 90°`);
  await muta(page, 'r'); await muta(page, 'r'); await muta(page, 'r');
  await expect(aleasa(page)).toContainText(`${CARAMIDA} · x 2, y 0, z 0 plăci`);
  await expect(aleasa(page)).not.toContainText('rotită');
  // pe y, în jos, și pe z: o jumătate de placă (1,6 mm)
  await muta(page, 'y-');
  await muta(page, 'z+');
  await expect(aleasa(page)).toContainText('liberă, colțul cutiei la 16,1, -3,9, 1,6 mm · între știfturi: x 2, y -0,5, z 0,5');
  await muta(page, 'x-');
  await expect(aleasa(page)).toContainText('între știfturi: x 1,5, y -0,5, z 0,5');
  // rotirea, cu jumătățile alese: în jurul verticalei, ca până acum (piesa e liberă: prin mijlocul cutiei ei)
  await muta(page, 'r');
  await expect(aleasa(page)).toContainText('· rotită 90°');
  await expect(marime(page)).toContainText('Mărime 15,8 × 31,8 × 11,5 mm');
  await muta(page, 'r'); await muta(page, 'r'); await muta(page, 'r');
  await expect(aleasa(page)).toContainText('între știfturi: x 1,5, y -0,5, z 0,5');
  await expect(aleasa(page)).not.toContainText('rotită');
  // fără jumătăți, piesa dintre știfturi se mută cu un știft întreg și cu o placă: rămâne între știfturi
  await muta(page, 'fin');
  await expect(buton(page, 'fin')).toHaveAttribute('aria-pressed', 'false');
  await muta(page, 'x+');
  await muta(page, 'z+');
  await expect(aleasa(page)).toContainText('între știfturi: x 2,5, y -0,5, z 1,5');
  // comutatorul rămâne ales și pentru altă piesă
  await muta(page, 'fin');
  await piesa(page, 'caramizi', 'caramida');
  await inModel(page);
  await expect(lista(page)).toHaveCount(2);
  await expect(buton(page, 'fin')).toHaveAttribute('aria-pressed', 'true');
});

test('tastele, cu vederea 3D aleasă: X și Y răstoarnă; Shift + săgeată mută cu o jumătate de pas; cu Ctrl, tastele nu sunt ale modelului', async ({ page }) => {
  await deschide(page);
  await piesa(page, 'caramizi', 'caramida');
  await inModel(page);
  await expect(page.locator('#at-editor')).toContainText('săgețile mută (cu Shift, câte o jumătate de pas), PageUp / PageDown urcă și coboară, R rotește, X și Y răstoarnă, Delete scoate');
  await page.locator('#at-vedere').focus();
  await page.keyboard.press('x');
  await expect(aleasa(page)).toContainText('cu partea de sus spre ↓ Y');
  await page.keyboard.press('Shift+X');
  await expect(aleasa(page)).toContainText('cu fața în jos');
  await page.keyboard.press('x'); await page.keyboard.press('x');
  await expect(lista(page)).toHaveText([`${CARAMIDA} 0, 0, 0`]);
  await page.keyboard.press('y');
  await expect(aleasa(page)).toContainText('cu partea de sus spre X →');
  await page.keyboard.press('y'); await page.keyboard.press('y'); await page.keyboard.press('Y');
  await expect(lista(page)).toHaveText([`${CARAMIDA} 0, 0, 0`]);
  // săgeata simplă: un știft; cu Shift: o jumătate; PageUp cu Shift: o jumătate de placă
  await page.keyboard.press('ArrowRight');
  await expect(aleasa(page)).toContainText('x 1, y 0, z 0 plăci');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(aleasa(page)).toContainText('între știfturi: x 1,5, y 0, z 0');
  await page.keyboard.press('Shift+ArrowUp');
  await page.keyboard.press('Shift+PageUp');
  await expect(aleasa(page)).toContainText('între știfturi: x 1,5, y 0,5, z 0,5');
  await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Shift+PageDown');
  await expect(lista(page)).toHaveText([`${CARAMIDA} 1, 0, 0`]);
  // butonul nu s-a schimbat de la Shift
  await expect(buton(page, 'fin')).toHaveAttribute('aria-pressed', 'false');
  // cu jumătățile alese, săgeata simplă mută cu o jumătate
  await muta(page, 'fin');
  await page.locator('#at-vedere').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(aleasa(page)).toContainText('între știfturi: x 0,5, y 0, z 0');
  await page.keyboard.press('ArrowLeft');
  await expect(lista(page)).toHaveText([`${CARAMIDA} 0, 0, 0`]);
  // Ctrl + X, Ctrl + Y, Ctrl + R sunt ale browserului: modelul rămâne cum era
  await page.keyboard.press('Control+x');
  await page.keyboard.press('Control+y');
  await page.keyboard.press('Meta+x');
  await page.keyboard.press('Alt+y');
  await page.keyboard.press('ArrowRight');
  await expect(aleasa(page)).toContainText('între știfturi: x 0,5, y 0, z 0');
  expect((await tinut(page))[0]!.liber!.m.map((v) => v + 0)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
});

test('o piesă prinsă de una răsturnată o urmează; o piesă prinsă n-are răsturnări; modelul ținut se deschide la fel', async ({ page }) => {
  await deschide(page);
  await piesa(page, 'caramizi', 'caramida');
  await inModel(page);
  // a doua cărămidă, alipită pe știftul 8 al primei: împreună, 55,8 × 23,8 × 21,1 (proba alipirii)
  await page.locator('#at-m-prinderi [data-pk="15"]').click();
  await piesa(page, 'caramizi', 'caramida');
  await inModel(page);
  await expect(lista(page)).toHaveText([`${CARAMIDA} 0, 0, 0`, `${CARAMIDA} prinsă`]);
  await expect(marime(page)).toContainText('Mărime 55,8 × 23,8 × 21,1 mm');
  // piesa prinsă se mișcă în jurul prinderii ei: fără răsturnări și fără jumătăți de pas
  expect(await butoane(page)).toEqual(['pb', 'pa', 'pr', 'pd']);
  await page.locator('#at-vedere').focus();
  await page.keyboard.press('x');
  await page.keyboard.press('y');
  await expect(marime(page)).toContainText('Mărime 55,8 × 23,8 × 21,1 mm');
  await expect(lista(page)).toHaveText([`${CARAMIDA} 0, 0, 0`, `${CARAMIDA} prinsă`]);
  // baza, răsturnată spre față: totul se culcă odată cu ea (înălțimea de 21,1 trece pe y, adâncimea de 23,8, pe z)
  await alege(page, 0);
  await muta(page, 'tx');
  await expect(lista(page)).toHaveText([`${CARAMIDA} liberă`, `${CARAMIDA} prinsă`]);
  await expect(marime(page)).toContainText('Mărime 55,8 × 21,1 × 23,8 mm');
  // spre dreapta: lungimea de 55,8 ajunge pe z
  await muta(page, 'ty');
  await expect(marime(page)).toContainText('Mărime 23,8 × 21,1 × 55,8 mm');
  // ținut și redeschis: la fel
  const model = await tinut(page);
  expect(model.map((m) => [!!m.liber, !!m.prins])).toEqual([[true, false], [false, true]]);
  await page.reload();
  await intraIn3D(page);
  await page.locator('#at-vedere-mod [data-v="model"]').click();
  await expect(lista(page)).toHaveText([`${CARAMIDA} liberă`, `${CARAMIDA} prinsă`]);
  await expect(marime(page)).toContainText('Mărime 23,8 × 21,1 × 55,8 mm');
});

test('o camă între știfturi se rotește în jurul axului ei, nu al cutiei', async ({ page }) => {
  await deschide(page);
  await piesa(page, 'roti', 'cama');
  await inModel(page);
  await muta(page, 'fin');
  await muta(page, 'x+');
  await expect(lista(page)).toContainText(['liberă']);
  type Motor = { asezareModel(d: unknown): { pivot: number[] }; aplicaTransf(T: unknown, p: number[]): number[] };
  const axul = () => page.evaluate((k) => {
    const m = (JSON.parse(localStorage.getItem(k)!) as { model: { def: unknown; liber: { m: number[]; t: number[] } }[] }).model[0]!;
    const L = (globalThis as unknown as { Lego: Motor }).Lego, a = L.asezareModel(m.def);
    return [...L.aplicaTransf(m.liber, [a.pivot[0]!, a.pivot[1]!, 0])].map((v) => Math.round(v * 1000) / 1000 + 0).concat(m.liber.m.map((v) => v + 0));
  }, CHEIE);
  const inainte = await axul();
  expect(inainte.slice(3)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  await muta(page, 'r');
  await expect(aleasa(page)).toContainText('· rotită 90°');
  const dupa = await axul();
  expect(dupa.slice(3)).toEqual([0, -1, 0, 1, 0, 0, 0, 0, 1]);
  // axul a rămas pe loc
  expect(dupa.slice(0, 3)).toEqual(inainte.slice(0, 3));
});
