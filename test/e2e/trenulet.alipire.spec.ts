/**
 * Alipirea la prinderi în vederea „Modelul” a atelierului Easy 3Draw (ADR 0284, partea D; felia 3.Cf-1), pe pagina de sine
 * stătătoare a planificatorului (din aceleași surse ca pachetul):
 * - piesa aleasă își arată prinderile: puncte în vederea 3D și numere în editor; una aleasă e **ținta**, iar piesa următoare
 *   se alipește acolo („Alipește în model”), cu prinderea ei care o întoarce cel mai puțin;
 * - piesa alipită **rămâne legată** de bază (răspunsul owner-ului): o urmează când baza e mutată sau rotită, oricât de lung
 *   ar fi lanțul (grindă → ax → roată);
 * - piesa alipită: „Rotește ↻” în jurul prinderii, „Altă prindere” (a ei), „Alt loc pe bază”, „Glisează” pe o tijă,
 *   „Desprinde”;
 * - desprinsă, o piesă care stă drept pe grilă e din nou o piesă de pe grilă; una întoarsă rămâne **liberă** (se mută în mm);
 * - baza scoasă lasă piesele ei pe loc; un model ținut cu legături stricate se deschide, cu piesele pe locul lor.
 * Ce se vede e judecat prin mărimea modelului (cutia tuturor pieselor din scenă), cu valorile pe hârtie, din cotele pieselor:
 * cărămida 2 × 4 e 31,8 × 15,8 × 11,5 (știfturile la 3,9 + 8·i de colț, înalte de 1,9); grinda de 5 e 39,2 × 7,2 × 7,8;
 * axul de 4 e lung de 31,8; roata de 24 e Ø26, groasă de 3,8; piesa cu știft pe lateral e 7,8 × 9,7 × 11,5.
 */
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

const PAGINA = 'http://easy3draw.test/';
const CHEIE = 'atelier.caramizi.v1';
const CARAMIDA = 'Cărămidă 2×4', GRINDA = /^Grindă/, AX = 'Ax 4', ROATA = 'Roată dințată 24', LATERAL = 'Cărămidă 1×1 cu știfturi pe o latură';
const DEF_CARAMIDA = { tip: 'caramida', celule: [0, 1, 2, 3].flatMap((i) => [[i, 0], [i, 1]]), placi: 3, stifturi: true, fund: 'tuburi', gauri: [], laterale: [], goale: false, mod: 'forma' };
const DEF_PLACA1 = { tip: 'caramida', celule: [[0, 0]], placi: 1, stifturi: true, fund: 'tuburi', gauri: [], laterale: [], goale: false, mod: 'forma' };

type Tinut = { id: string; x: number; y: number; z: number; rot: number; prins?: { de: string; a: number; b: number; unghi: number; alunec: number }; liber?: { m: number[]; t: number[] } };

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
const butonul = (page: Page) => page.locator('#at-in-model');
const inModel = async (page: Page) => { await butonul(page).click(); await expect(page.locator('#at-vedere-mod [data-v="model"]')).toHaveAttribute('aria-pressed', 'true'); };
const lista = (page: Page) => page.locator('#at-m-lista li');
const alege = (page: Page, k: number) => lista(page).nth(k).locator('button').click();
const marime = (page: Page) => page.locator('#at-cote');
const aleasa = (page: Page) => page.locator('.model-ales');
const muta = (page: Page, op: string) => page.locator(`#at-m-mutari [data-m="${op}"]`).click();
/** Butoanele unei piese de pe grilă sau libere: mutările, rotirea, apoi răsturnările și jumătățile de pas (felia 3.Cf-2). */
const MUTARI = ['x-', 'x+', 'y-', 'y+', 'z-', 'z+', 'r', 'tx', 'ty', 'fin'];
const butoane = (page: Page) => page.locator('#at-m-mutari [data-m]').evaluateAll((e) => e.map((b) => (b as HTMLElement).dataset['m']));
const prinderea = (page: Page, k: number) => page.locator(`#at-m-prinderi [data-pk="${k}"]`);
const tinut = (page: Page) => page.evaluate((k) => (JSON.parse(localStorage.getItem(k) ?? '{}') as { model?: Tinut[] }).model ?? [], CHEIE);

test('știftul din colț: o cărămidă alipită pe știftul 8 al alteia urmează baza, se rotește în jurul prinderii, își schimbă prinderea și se desprinde pe grilă', async ({ page }) => {
  await deschide(page);
  await piesa(page, 'caramizi', 'caramida');
  await expect(butonul(page)).toHaveText('Pune în model');
  await inModel(page);
  await expect(lista(page)).toHaveText([`${CARAMIDA} 0, 0, 0`]);
  // piesa aleasă își arată prinderile: 8 locașuri (dedesubt) și 8 știfturi, numerotate pe feluri
  await expect(page.locator('#at-m-prinderi [data-pk]')).toHaveCount(16);
  await expect(prinderea(page, 0)).toHaveAccessibleName('locaș 1');
  await expect(prinderea(page, 15)).toHaveAccessibleName('știft 8');
  await expect(prinderea(page, 15)).toHaveText('8');
  await expect(page.locator('#at-m-tinta')).toHaveCount(0);
  // ținta: știftul 8, cel din colțul de departe, la (28, 12) pe grilă; un al doilea clic o scoate
  await prinderea(page, 15).click();
  await expect(prinderea(page, 15)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#at-m-prinderi [aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('#at-m-tinta')).toContainText('Ținta: știft 8.');
  await prinderea(page, 15).click();
  await expect(page.locator('#at-m-prinderi [aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('#at-m-tinta')).toHaveCount(0);
  await prinderea(page, 15).click();
  // cu o țintă aleasă, butonul piesei o spune
  await piesa(page, 'caramizi', 'caramida');
  await expect(butonul(page)).toHaveText('Alipește în model');
  await inModel(page);
  // cărămida nouă stă cu locașul 1 (colțul ei) pe știftul 8: cutia ei, x 24,1 … 55,9, y 8,1 … 23,9, z 9,6 … 21,1
  await expect(lista(page)).toHaveText([`${CARAMIDA} 0, 0, 0`, `${CARAMIDA} prinsă`]);
  await expect(aleasa(page)).toContainText(`${CARAMIDA} · prinsă de ${CARAMIDA} (locaș 1 ↔ știft 8)`);
  await expect(marime(page)).toContainText('Piese 2');
  await expect(marime(page)).toContainText('Mărime 55,8 × 23,8 × 21,1 mm');
  const [baza, prinsa] = await tinut(page);
  expect(prinsa!.prins).toEqual({ de: baza!.id, a: 15, b: 0, unghi: 0, alunec: 0 });
  // piesa alipită are butoanele ei: fără mutările pe grilă, fără glisare (știftul în locaș nu glisează)
  expect(await butoane(page)).toEqual(['pb', 'pa', 'pr', 'pd']);
  // ținta s-a folosit: piesa următoare se pune ca până acum
  await page.locator('#at-vedere-mod [data-v="piesa"]').click();
  await expect(butonul(page)).toHaveText('Pune în model');
  await page.locator('#at-vedere-mod [data-v="model"]').click();

  // baza mutată cu un știft: piesa prinsă o urmează (altfel modelul s-ar lungi cu 8 mm)
  await alege(page, 0);
  expect(await butoane(page)).toEqual(MUTARI);
  // baza, aleasă din nou, nu mai are ținta de dinainte
  await expect(page.locator('#at-m-prinderi [data-pk]')).toHaveCount(16);
  await expect(page.locator('#at-m-prinderi [aria-pressed="true"]')).toHaveCount(0);
  await muta(page, 'x+');
  await expect(lista(page)).toHaveText([`${CARAMIDA} 1, 0, 0`, `${CARAMIDA} prinsă`]);
  await expect(marime(page)).toContainText('Mărime 55,8 × 23,8 × 21,1 mm');
  // baza rotită un sfert de tură: tot ansamblul se rotește cu ea
  await muta(page, 'r');
  await expect(marime(page)).toContainText('Mărime 23,8 × 55,8 × 21,1 mm');
  for (let k = 0; k < 3; k++) await muta(page, 'r');
  await muta(page, 'x-');
  await expect(marime(page)).toContainText('Mărime 55,8 × 23,8 × 21,1 mm');

  // alt loc pe bază: de pe știftul 8 (ultimul), piesa prinsă trece pe primul, cel de la (4, 4), și stă chiar peste bază
  await alege(page, 1);
  await muta(page, 'pa');
  await expect(aleasa(page)).toContainText('(locaș 1 ↔ știft 1)');
  await expect(marime(page)).toContainText('Mărime 31,8 × 15,8 × 21,1 mm');
  expect((await tinut(page))[1]!.prins).toEqual({ de: baza!.id, a: 8, b: 0, unghi: 0, alunec: 0 });
  // apoi pe al doilea, cel de la (4, 12): cu un știft mai în spate (y 8,1 … 23,9)
  await muta(page, 'pa');
  await expect(aleasa(page)).toContainText('(locaș 1 ↔ știft 2)');
  await expect(marime(page)).toContainText('Mărime 31,8 × 23,8 × 21,1 mm');
  // încă șase locuri: înapoi pe știftul 8 (locașurile bazei nu sunt locuri pentru un locaș)
  for (let k = 0; k < 6; k++) await muta(page, 'pa');
  await expect(aleasa(page)).toContainText('(locaș 1 ↔ știft 8)');
  await expect(marime(page)).toContainText('Mărime 55,8 × 23,8 × 21,1 mm');
  // piesa prinsă, rotită în jurul știftului (28, 12) cu un sfert de tură: x 16,1 … 31,9, y 8,1 … 39,9
  await muta(page, 'pr');
  await expect(aleasa(page)).toContainText('(locaș 1 ↔ știft 8) · rotită 90°');
  await expect(marime(page)).toContainText('Mărime 31,8 × 39,8 × 21,1 mm');
  // altă prindere a ei: locașul 2 (la 8 mm pe lățime), tot rotită: x 24,1 … 39,9, y 8,1 … 39,9
  await muta(page, 'pb');
  await expect(aleasa(page)).toContainText('(locaș 2 ↔ știft 8) · rotită 90°');
  await expect(marime(page)).toContainText('Mărime 39,8 × 39,8 × 21,1 mm');
  expect((await tinut(page))[1]!.prins).toEqual({ de: baza!.id, a: 15, b: 1, unghi: 90, alunec: 0 });

  // dublată: copia nu mai e prinsă; stă pe grilă, cu un știft mai la dreapta (x 32,1 … 47,9)
  await page.locator('#at-m-dubla').click();
  await expect(lista(page)).toHaveText([`${CARAMIDA} 0, 0, 0`, `${CARAMIDA} prinsă`, `${CARAMIDA} 4, 1, 3`]);
  await expect(marime(page)).toContainText('Mărime 47,8 × 39,8 × 21,1 mm');
  await page.locator('#at-m-scoate').click();
  await expect(lista(page)).toHaveCount(2);

  // desprinsă: rămâne unde era, ca piesă de pe grilă (colțul amprentei 2 × 4 la 3, 1, pe a treia placă, rotită 90°)
  await alege(page, 1);
  await muta(page, 'pd');
  await expect(lista(page)).toHaveText([`${CARAMIDA} 0, 0, 0`, `${CARAMIDA} 3, 1, 3`]);
  await expect(aleasa(page)).toContainText(`${CARAMIDA} · x 3, y 1, z 3 plăci · rotită 90°`);
  await expect(marime(page)).toContainText('Mărime 39,8 × 39,8 × 21,1 mm');
  const dupa = (await tinut(page))[1]!;
  expect([dupa.x, dupa.y, dupa.z, dupa.rot, dupa.prins, dupa.liber]).toEqual([3, 1, 3, 1, undefined, undefined]);
  expect(await butoane(page)).toEqual(MUTARI);
  // și nu mai urmează baza: baza mutată cu un știft iese de sub ea (x 8,1 … 39,9)
  await alege(page, 0);
  await muta(page, 'x+');
  await expect(marime(page)).toContainText('Mărime 31,8 × 39,8 × 21,1 mm');
});

test('lanțul: un ax prin gaura din mijloc a grinzii și o roată pe capătul lui; glisarea; totul urmează grinda; grinda scoasă le lasă pe loc', async ({ page }) => {
  await deschide(page);
  await piesa(page, 'caramizi', 'grinda');
  await inModel(page);
  await expect(lista(page)).toHaveText([GRINDA]);
  await expect(marime(page)).toContainText('Mărime 39,2 × 7,2 × 7,8 mm');
  // grinda de 5: fiecare gaură are două guri (sus, jos); gura de sus a găurii din mijloc e a cincea
  await expect(page.locator('#at-m-prinderi [data-pk]')).toHaveCount(10);
  await expect(prinderea(page, 4)).toHaveAccessibleName('gaură de știft 5');
  await prinderea(page, 4).click();
  await piesa(page, 'legaturi', 'ax');
  await expect(page.locator('#at-nume-piesa')).toHaveText(AX);
  await expect(butonul(page)).toHaveText('Alipește în model');
  await inModel(page);
  // axul intră până la capăt: capătul lui e la gura de sus (z 7,8), iar restul iese pe dedesubt, până la 7,8 − 31,8 = −24
  await expect(lista(page).nth(1)).toHaveText(`${AX} prinsă`);
  await expect(aleasa(page)).toContainText(`${AX} · prinsă de Grindă`);
  await expect(aleasa(page)).toContainText('(capăt de ax 1 ↔ gaură de știft 5)');
  await expect(marime(page)).toContainText('Mărime 39,2 × 7,2 × 31,8 mm');
  // pe o tijă se glisează, câte 4 mm: în jos iese cu 4 mm mai mult (până la −28); în sus, rămâne în lungimea lui
  expect(await butoane(page)).toEqual(['pb', 'pa', 'pr', 'pg-', 'pg+', 'pd']);
  await muta(page, 'pg-');
  await expect(aleasa(page)).toContainText('· glisată -4 mm');
  await expect(marime(page)).toContainText('Mărime 39,2 × 7,2 × 35,8 mm');
  expect((await tinut(page))[1]!.prins!.alunec).toBe(-4);
  await muta(page, 'pg+');
  await expect(aleasa(page)).not.toContainText('glisată');
  await expect(marime(page)).toContainText('Mărime 39,2 × 7,2 × 31,8 mm');
  await muta(page, 'pg+');
  await expect(aleasa(page)).toContainText('· glisată 4 mm');
  expect((await tinut(page))[1]!.prins!.alunec).toBe(4);
  await muta(page, 'pg-');
  // axul (ales) își arată capetele; roata se alipește pe capătul de jos
  await expect(page.locator('#at-m-prinderi [data-pk]')).toHaveCount(2);
  await expect(prinderea(page, 1)).toHaveAccessibleName('capăt de ax 2');
  await prinderea(page, 1).click();
  await piesa(page, 'roti', 'rotita');
  await page.locator('#at-r-repede [data-v="24"]').click();
  await inModel(page);
  await expect(lista(page).nth(2)).toHaveText(`${ROATA} prinsă`);
  await expect(aleasa(page)).toContainText(`${ROATA} · prinsă de ${AX} (gaură de ax 1 ↔ capăt de ax 2)`);
  // roata (±13 în jurul axului de la (20, 4)): y de la −9 la 17
  await expect(marime(page)).toContainText('Mărime 39,2 × 26 × 31,8 mm');
  await muta(page, 'pg+');
  await muta(page, 'pg+');
  await expect(aleasa(page)).toContainText('· glisată 8 mm');
  expect((await tinut(page))[2]!.prins!.alunec).toBe(8);

  // grinda urcată cu o placă: axul și roata urcă cu ea (altfel modelul ar crește cu 3,2 mm)
  await alege(page, 0);
  await muta(page, 'z+');
  await expect(marime(page)).toContainText('Mărime 39,2 × 26 × 31,8 mm');
  // grinda rotită (amprenta 1 × 5, mijlocul la (4, 20)): axul rămâne în gaura din mijloc, roata pe el (x −9 … 17)
  await muta(page, 'r');
  await expect(marime(page)).toContainText('Mărime 26 × 39,2 × 31,8 mm');

  // grinda scoasă: axul rămâne pe loc, liber (în picioare, nu e o așezare de pe grilă); roata rămâne prinsă de el
  await page.locator('#at-m-scoate').click();
  await expect(lista(page)).toHaveText([`${AX} liberă`, `${ROATA} prinsă`]);
  await expect(marime(page)).toContainText('Mărime 26 × 26 × 31,8 mm');
  const [ax, roata] = await tinut(page);
  expect(ax!.prins).toBeUndefined();
  expect(roata!.prins!.de).toBe(ax!.id);
  // axul liber: colțul cutiei lui (Ø4,75 în jurul lui (4, 20), deci 1,625 și 17,625; z de la −24 + 3,2)
  await alege(page, 0);
  await expect(aleasa(page)).toContainText(/Ax 4 · liberă, colțul cutiei la 1,6[23], 17,6[23], -20,8 mm/);
  expect(await butoane(page)).toEqual(MUTARI);
  // mutat cu 8 mm: roata îl urmează
  await muta(page, 'x+');
  await expect(aleasa(page)).toContainText(/colțul cutiei la 9,6[23], 17,6[23], -20,8 mm/);
  await expect(marime(page)).toContainText('Mărime 26 × 26 × 31,8 mm');
  // roata desprinsă de ax e răsturnată (cu fața în jos): rămâne liberă, pe loc
  await alege(page, 1);
  await muta(page, 'pd');
  await expect(lista(page)).toHaveText([`${AX} liberă`, `${ROATA} liberă`]);
  await expect(marime(page)).toContainText('Mărime 26 × 26 × 31,8 mm');
});

test('știftul de pe lateral: cărămida alipită stă în picioare; baza scoasă o lasă liberă, mutată în mm și rotită în jurul mijlocului ei', async ({ page }) => {
  await deschide(page);
  await piesa(page, 'caramizi', 'lateral');
  await inModel(page);
  await expect(lista(page)).toHaveText([`${LATERAL} 0, 0, 0`]);
  await expect(marime(page)).toContainText('Mărime 7,8 × 9,7 × 11,5 mm');
  // prinderile: locașul, știftul de sus și știftul de pe lateral (al doilea știft)
  await expect(page.locator('#at-m-prinderi [data-pk]')).toHaveCount(3);
  await expect(prinderea(page, 2)).toHaveAccessibleName('știft 2');
  await prinderea(page, 2).click();
  await piesa(page, 'caramizi', 'caramida');
  await inModel(page);
  // cărămida stă cu fundul pe fața laterală (y 0,1): grosimea ei (11,5) merge spre −y, lățimea (15,8) pe verticală, cu
  // locașul 1 (la 3,9 de colț) la înălțimea știftului (5,6): z de la 1,7 la 17,5
  await expect(aleasa(page)).toContainText(`${CARAMIDA} · prinsă de ${LATERAL} (locaș 1 ↔ știft 2)`);
  await expect(marime(page)).toContainText('Mărime 31,8 × 19,3 × 17,5 mm');
  // rotită în jurul știftului (trigonometric, privit dinspre vârful lui): lungimea ei urcă (z 1,7 … 33,5), x −7,9 … 7,9
  await muta(page, 'pr');
  await expect(marime(page)).toContainText('Mărime 15,8 × 19,3 × 33,5 mm');
  // tasta R o rotește tot în jurul prinderii; săgețile nu o mută
  await page.locator('#at-vedere').focus();
  await page.keyboard.press('r');
  await expect(aleasa(page)).toContainText('· rotită 180°');
  await page.keyboard.press('ArrowRight');
  await expect(aleasa(page)).toContainText('· rotită 180°');
  for (let k = 0; k < 3; k++) await muta(page, 'pr');
  await expect(aleasa(page)).toContainText('· rotită 90°');
  await expect(marime(page)).toContainText('Mărime 15,8 × 19,3 × 33,5 mm');

  // baza scoasă (cu tasta Delete, din vederea 3D): cărămida rămâne în picioare, liberă
  await alege(page, 0);
  await page.locator('#at-vedere').focus();
  await page.keyboard.press('Delete');
  await expect(lista(page)).toHaveText([`${CARAMIDA} liberă`]);
  await expect(marime(page)).toContainText('Mărime 15,8 × 11,5 × 31,8 mm');
  const una = (await tinut(page))[0]!;
  expect(una.prins).toBeUndefined();
  expect(una.liber!.m).toHaveLength(9);
  await alege(page, 0);
  await expect(aleasa(page)).toContainText('· liberă, colțul cutiei la -7,9, -11,4, 1,7 mm');
  // mutările unei piese libere: 8 mm pe X și Y, o placă (3,2 mm) pe Z
  await muta(page, 'x+');
  await expect(aleasa(page)).toContainText('colțul cutiei la 0,1, -11,4, 1,7 mm');
  await muta(page, 'z-');
  await expect(aleasa(page)).toContainText('colțul cutiei la 0,1, -11,4, -1,5 mm');
  await muta(page, 'y+');
  await muta(page, 'y+');
  await expect(aleasa(page)).toContainText('colțul cutiei la 0,1, 4,6, -1,5 mm');
  await muta(page, 'x-');
  await muta(page, 'z+');
  await muta(page, 'y-');
  await expect(aleasa(page)).toContainText('colțul cutiei la -7,9, -3,4, 1,7 mm');
  // rotită un sfert de tură în jurul verticalei prin mijlocul cutiei ei ((0, 2,35)): 11,5 trece pe x, 15,8 pe y
  await muta(page, 'r');
  await expect(marime(page)).toContainText('Mărime 11,5 × 15,8 × 31,8 mm');
  await expect(aleasa(page)).toContainText('colțul cutiei la -5,75, -5,55, 1,7 mm');
  // o piesă pusă cu cea liberă aleasă, fără țintă: pe grilă, deasupra cutiei ei (z până la 33,5, deci pe placa 11), cu
  // mijlocul cât mai aproape de al cutiei ((0, 2,35)): cărămida 2 × 4 la −2, −1 ține x −16 … 16 și y −8 … 8
  await piesa(page, 'caramizi', 'caramida');
  await expect(butonul(page)).toHaveText('Pune în model');
  await inModel(page);
  await expect(lista(page).nth(1)).toHaveText(`${CARAMIDA} -2, -1, 11`);
});

test('punctele din vederea 3D: un clic pe punctul unei prinderi o alege ca țintă, fără să schimbe piesa aleasă', async ({ page }) => {
  // o placă 1 × 1 singură: mijlocul cutiei ei (ținta camerei) e la 0,65 mm sub rădăcina știftului, deci punctul știftului
  // acoperă mijlocul pânzei; placa stă departe de origine (5, 3, pe a doua placă), ca punctele să fie ale locului ei din lume
  await deschide(page, { model: [{ id: 'p', def: DEF_PLACA1, x: 5, y: 3, z: 2, rot: 0, culoare: '#c8322b' }] });
  await page.locator('#at-vedere-mod [data-v="model"]').click();
  await expect(lista(page)).toHaveText(['Placă 1×1 5, 3, 2']);
  const c = (await page.locator('#at-vedere canvas').boundingBox())!;
  const mijloc = [c.x + c.width / 2, c.y + c.height / 2] as const;
  // fără nicio piesă aleasă nu sunt puncte: clicul alege piesa
  await expect(aleasa(page)).toHaveCount(0);
  await page.mouse.click(...mijloc);
  await expect(aleasa(page)).toContainText('Placă 1×1');
  await expect(page.locator('#at-m-prinderi [data-pk]')).toHaveCount(2);
  await expect(page.locator('#at-m-prinderi [aria-pressed="true"]')).toHaveCount(0);
  // al doilea clic, în același loc, cade pe punctul știftului: ținta
  await page.mouse.click(...mijloc);
  await expect(page.locator('#at-m-prinderi [aria-pressed="true"]')).toHaveAccessibleName('știft 1');
  await expect(page.locator('#at-m-tinta')).toContainText('Ținta: știft 1.');
  await expect(aleasa(page)).toContainText('Placă 1×1');
  // încă un clic pe punct scoate ținta; piesa rămâne aleasă
  await page.mouse.click(...mijloc);
  await expect(page.locator('#at-m-prinderi [aria-pressed="true"]')).toHaveCount(0);
  await expect(aleasa(page)).toContainText('Placă 1×1');
  // un clic pe lângă piesă (colțul pânzei) o lasă nealeasă, fără puncte
  await page.mouse.click(c.x + 12, c.y + 12);
  await expect(aleasa(page)).toHaveCount(0);
  await expect(page.locator('#at-m-prinderi')).toHaveCount(0);
});

test('un model ținut de dinainte: legăturile bune se păstrează; cele stricate lasă piesa pe locul ei de pe grilă', async ({ page }) => {
  const c = (id: string, x: number, y: number, z: number, rest: object = {}) => ({ id, def: DEF_CARAMIDA, x, y, z, rot: 0, culoare: '#c8322b', ...rest });
  await deschide(page, { model: [
    c('a', 0, 0, 0),
    // prinsă de «a», pe știftul 8, rotită cu 450° (adică 90°): locul ei ținut (9, 9, 9) nu contează
    c('b', 9, 9, 9, { prins: { de: 'a', a: 15, b: 0, unghi: 450, alunec: 0 } }),
    // stricate: baza lipsește; indicele nu există; prinderile nu se potrivesc (știft pe știft); legătura nu e un obiect;
    // o piesă prinsă de ea însăși; o transformare liberă fără numere
    c('c', 0, 4, 0, { prins: { de: 'zz', a: 15, b: 0 } }),
    c('d', 0, 6, 0, { prins: { de: 'a', a: 99, b: 0 } }),
    c('e', 0, 8, 0, { prins: { de: 'a', a: 15, b: 15 } }),
    c('f', 0, 10, 0, { prins: 'a' }),
    c('g', 0, 12, 0, { prins: { de: 'g', a: 15, b: 0 } }),
    c('h', 0, 14, 0, { liber: { m: [1, 2], t: ['x'] } }),
  ] });
  await page.locator('#at-vedere-mod [data-v="model"]').click();
  await expect(lista(page)).toHaveText([
    `${CARAMIDA} 0, 0, 0`, `${CARAMIDA} prinsă`, `${CARAMIDA} 0, 4, 0`, `${CARAMIDA} 0, 6, 0`, `${CARAMIDA} 0, 8, 0`, `${CARAMIDA} 0, 10, 0`, `${CARAMIDA} 0, 12, 0`, `${CARAMIDA} 0, 14, 0`,
  ]);
  // «b» pe știftul 8 al lui «a», rotită un sfert de tură (x 16,1 … 31,9, z până la 21,1); celelalte, pe grilă, până la
  // y 14 · 8 + 15,9
  await expect(marime(page)).toContainText('Piese 8');
  await expect(marime(page)).toContainText('Mărime 31,8 × 127,8 × 21,1 mm');
  await alege(page, 1);
  await expect(aleasa(page)).toContainText('(locaș 1 ↔ știft 8) · rotită 90°');
  // o piesă stricată se poartă ca una de pe grilă
  await alege(page, 3);
  await expect(aleasa(page)).toContainText('· x 0, y 6, z 0 plăci');
  expect(await butoane(page)).toEqual(MUTARI);
  // modelul golit își uită și legăturile
  await page.locator('#at-model-goleste').click();
  await page.locator('#at-model-goleste-da').click();
  await expect(marime(page)).toContainText('Modelul e gol.');
  expect(await tinut(page)).toEqual([]);
});

test('ținta pe un locaș: piesa se alipește dedesubt; una fără prindere potrivită se pune deasupra, cu un mesaj; legătura se ține la redeschidere', async ({ page }) => {
  await deschide(page);
  // cărămida, cu ținta pe un locaș (dedesubt); o altă cărămidă se alipește dedesubt, cu știftul ei
  await piesa(page, 'caramizi', 'caramida');
  await inModel(page);
  await prinderea(page, 0).click();
  await expect(page.locator('#at-m-tinta')).toContainText('Ținta: locaș 1.');
  await piesa(page, 'caramizi', 'caramida');
  await inModel(page);
  // știftul 1 al celei noi în locașul 1 al bazei: aceeași amprentă, cu 9,6 mm mai jos (z −9,6 … 11,5)
  await expect(aleasa(page)).toContainText('(știft 1 ↔ locaș 1)');
  await expect(marime(page)).toContainText('Mărime 31,8 × 15,8 × 21,1 mm');
  // o piesă fără nicio prindere pentru țintă (un ax pe un știft) se pune deasupra piesei alese, ca până acum, cu un mesaj
  await alege(page, 0);
  await prinderea(page, 15).click();
  await piesa(page, 'legaturi', 'ax');
  await expect(butonul(page)).toHaveText('Alipește în model');
  await inModel(page);
  await expect(page.locator('#at-toast')).toContainText('Ax 4 nu are nicio prindere pentru știft');
  await expect(lista(page).nth(2)).toHaveText(/^Ax 4 \d+, \d+, 3$/);
  expect((await tinut(page))[2]!.prins).toBeUndefined();

  // redeschisă, pagina ține legătura făcută
  await page.reload();
  await intraIn3D(page);
  await page.locator('#at-vedere-mod [data-v="model"]').click();
  await expect(lista(page).nth(1)).toHaveText(`${CARAMIDA} prinsă`);
  expect((await tinut(page))[1]!.prins).toMatchObject({ a: 0, b: 8, unghi: 0, alunec: 0 });
});

test('„Înlocuiește în model”: piesa schimbată își ține legăturile cât prinderile rămân în același loc; fără prindere, piesa rămâne pe loc', async ({ page }) => {
  // cărămida «b», cu locașul 1 pe știftul 7 al lui «a» (cel de la (28, 4)): x 24,1 … 55,9, pe aceeași lățime
  await deschide(page, { model: [
    { id: 'a', def: DEF_CARAMIDA, x: 0, y: 0, z: 0, rot: 0, culoare: '#c8322b' },
    { id: 'b', def: DEF_CARAMIDA, x: 0, y: 0, z: 0, rot: 0, culoare: '#1f5fbf', prins: { de: 'a', a: 14, b: 0, unghi: 0, alunec: 0 } },
  ] });
  await page.locator('#at-vedere-mod [data-v="model"]').click();
  await expect(marime(page)).toContainText('Mărime 55,8 × 15,8 × 21,1 mm');
  // piesa prinsă, schimbată în editor într-o placă (o treime din înălțime): rămâne pe știftul 7, cu aceeași prindere
  await alege(page, 1);
  await page.locator('#at-m-editeaza').click();
  await page.locator('#at-inaltime [data-placi="1"]').click();
  await expect(butonul(page)).toHaveText('Înlocuiește în model');
  await inModel(page);
  await expect(lista(page).nth(1)).toHaveText(/ prinsă$/);
  await expect(aleasa(page)).toContainText('(locaș 1 ↔ știft 7)');
  // 9,6 (baza) + 3,2 (placa) + 1,9 (știftul ei)
  await expect(marime(page)).toContainText('Mărime 55,8 × 15,8 × 14,7 mm');
  // baza, schimbată și ea într-o placă: știfturile ei coboară, dar rămân pe locul lor, deci piesa prinsă coboară cu ele
  await alege(page, 0);
  await page.locator('#at-m-editeaza').click();
  await page.locator('#at-inaltime [data-placi="1"]').click();
  await inModel(page);
  await expect(lista(page).nth(1)).toHaveText(/ prinsă$/);
  await expect(marime(page)).toContainText('Mărime 55,8 × 15,8 × 8,3 mm');
  // baza fără pătrățelul din colțul de departe (3, 1): știftul de la (28, 4) e tot acolo, dar e acum prinderea 13, nu 14;
  // piesa rămâne pe el
  await page.locator('#at-m-editeaza').click();
  await page.locator('#at-grila rect[data-i="3"][data-j="1"]').click();
  await expect(butonul(page)).toHaveText('Înlocuiește în model');
  await inModel(page);
  await expect(lista(page).nth(1)).toHaveText(/ prinsă$/);
  await expect(marime(page)).toContainText('Mărime 55,8 × 15,8 × 8,3 mm');
  expect((await tinut(page))[1]!.prins).toEqual({ de: 'a', a: 13, b: 0, unghi: 0, alunec: 0 });
  // baza fără pătrățelul (3, 0): știftul pe care stă piesa nu mai e. Piesa rămâne unde era, pe grilă (colțul la 3, 0, pe
  // prima placă), iar baza ține x 0,1 … 23,9
  await page.locator('#at-m-editeaza').click();
  await page.locator('#at-grila rect[data-i="3"][data-j="0"]').click();
  await inModel(page);
  await expect(lista(page).nth(1)).toHaveText(/ 3, 0, 1$/);
  await expect(marime(page)).toContainText('Mărime 55,8 × 15,8 × 8,3 mm');
  expect((await tinut(page))[1]!.prins).toBeUndefined();
  // și nu mai urmează baza: baza urcată cu o placă ajunge la înălțimea ei (amândouă, z 3,2 … 8,3); cu încă una, o depășește
  await muta(page, 'z+');
  await expect(marime(page)).toContainText('Mărime 55,8 × 15,8 × 5,1 mm');
  await muta(page, 'z+');
  await expect(marime(page)).toContainText('Mărime 55,8 × 15,8 × 8,3 mm');
});
