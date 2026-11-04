import { test, expect, type Page } from '@playwright/test';
import { adauga, ecran, vedere } from './ajutor-panza.ts';
import { cerc, dxf, lwpolilinie } from '../unit/ajutor-dxf.ts';

/**
 * Verificarea vectorilor (felia 10.1↑, ADR 0124), în Edge, pe vectori importați: un DXF cu două cercuri identice, o fundiță
 * (un „8” cu buclele de 100 mm²), două pătrate care se taie în (150, 40) și (140, 50) și o cale deschisă cu capetele la
 * 0,05 mm. Panoul din extensia barei le găsește în workerul CAM, le arată pe feluri și pe pânză (cercul fiecăreia, în
 * locul ei); un clic pe rând alege instanța și scoate problema în față; Esc închide panoul și stinge marcajele. Cât panoul e
 * deschis, o schimbare a documentului (anularea) reface lista. Reparațiile (felia 10.2↑, ADR 0124 §10–§16): „Scoate toate
 * copiile”, „Închide” pe calea deschisă, „Desparte” pe fundiță, fiecare un pas de anulare; intersecțiile doar se arată.
 */
test.use({ locale: 'ro-RO' });

const fisierDxf = (nume: string, text: string) => ({ name: nume, mimeType: 'application/dxf', buffer: Buffer.from(text, 'utf8') });
const ENTITATI = [
  cerc(40, 40, 10, { strat: 'CERC1' }),
  cerc(40, 40, 10, { strat: 'CERC2' }),
  lwpolilinie([[80, 30], [100, 50], [100, 30], [80, 50]], true, { strat: 'FUNDITA' }),
  lwpolilinie([[130, 30], [150, 30], [150, 50], [130, 50]], true, { strat: 'P1' }),
  lwpolilinie([[140, 40], [160, 40], [160, 60], [140, 60]], true, { strat: 'P2' }),
  lwpolilinie([[190, 30], [230, 30], [230, 60], [190, 60], [190, 30.05]], false, { strat: 'DESCHIS' }),
].join('');

const panou = (page: Page) => page.getByTestId('panou-verificare');
const stare = (page: Page) => page.getByTestId('verificare-stare');
const lista = (page: Page) => page.getByTestId('verificare-lista');

async function importa(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(fisierDxf('probleme.dxf', dxf({ antet: [['$INSUNITS', 70, 4]], entitati: ENTITATI })));
  await page.click('[data-buton="importa"]');
  await expect(page.locator('.dialog')).toHaveCount(0);
  await expect(page.getByTestId('lista-vectori').locator('li')).toHaveCount(1);
}

test('DXF-ul cu probleme: duplicatul, intersecțiile, fundița, calea deschisă; fiecare pe pânză, în locul ei; clicul alege și scoate în față', async ({ page }) => {
  await importa(page);
  await page.locator('[data-editare="verificare"]').click();
  await expect(panou(page)).toBeVisible();
  await expect(stare(page)).toHaveText('Probleme: 5 (forme verificate: 6).');
  const feluri = await lista(page).locator('section[data-fel]').evaluateAll((s) => s.map((x) => x.getAttribute('data-fel')));
  expect(feluri).toEqual(['duplicat', 'intersectie', 'autointersectie', 'deschis']);
  await expect(lista(page).locator('button[data-fel="duplicat"]')).toHaveText('Forme identice: 2; rămâne prima');
  await expect(lista(page).locator('button[data-fel="intersectie"]')).toHaveText(['Două forme se taie sau se ating', 'Două forme se taie sau se ating']);
  await expect(lista(page).locator('button[data-fel="autointersectie"]')).toHaveText('Forma se taie singură; bucla mai mică: 100 mm² (50 %)');
  await expect(lista(page).locator('button[data-fel="deschis"]')).toHaveText('Cale deschisă: capetele la 0,05 mm');
  // Importul rămâne ales după „Importă”: bifa e activă, cu instanța lui, dar nebifată (verificarea e pe toată foaia).
  await expect(page.locator('[data-verificare="alese"]')).not.toBeChecked();
  await expect(page.getByText('Doar formele alese (1)')).toBeVisible();

  // Pe pânză: un cerc pe problemă (calea deschisă are două, cu golul dintre ele prea scurt pe ecran: unul), în locul ei.
  const marcaje = page.getByTestId('verificare-marcaje');
  await expect(marcaje).toHaveAttribute('data-numar', '5');
  const la = await ecran(page, await vedere(page));
  const centru = async (k: number) => {
    const b = await marcaje.locator(`g[data-problema="${k}"] circle`).first().boundingBox();
    if (!b) throw new Error(`marcajul ${k} n-are cutie`);
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const asteptat: Array<readonly [number, number, number]> = [[0, 40, 40], [1, 150, 40], [2, 140, 50], [3, 90, 40], [4, 190, 30.025]];
  const intersectii = [await centru(1), await centru(2)].sort((u, v) => u.x - v.x);
  for (const [k, x, y] of asteptat) {
    const c = k === 1 ? intersectii[1] : k === 2 ? intersectii[0] : await centru(k);
    const e = la(x, y);
    expect(Math.hypot((c?.x ?? 0) - e.x, (c?.y ?? 0) - e.y), `marcajul ${k} în (${x}, ${y})`).toBeLessThan(1.5);
  }
  await expect(marcaje.locator('g.in-forma')).toHaveCount(2);
  await expect(marcaje.locator('g.intre-forme')).toHaveCount(3);

  // Clicul pe fundiță: rândul apăsat, marcajul mai mare, instanța importului aleasă.
  const fundita = lista(page).locator('button[data-fel="autointersectie"]');
  await fundita.click();
  await expect(fundita).toHaveAttribute('aria-pressed', 'true');
  await expect(marcaje.locator('g.aleasa')).toHaveAttribute('data-fel', 'autointersectie');
  await expect(page.getByTestId('selectie')).toHaveText('Selectat: probleme');
  // Cu bifa, doar formele instanței alese: aici tot importul, deci aceleași probleme.
  await page.locator('[data-verificare="alese"]').check();
  await expect(page.locator('[data-verificare="alese"]')).toBeChecked();
  await expect(stare(page)).toHaveText('Probleme: 5 (forme verificate: 6).');

  // Toleranța greșită: motivul, marcajele rămân ale ultimei verificări bune.
  await page.locator('[data-verificare="toleranta"]').fill('2');
  await expect(stare(page)).toHaveText('Toleranța: un număr între 0,001 și 1 mm.');
  await page.locator('[data-verificare="toleranta"]').fill('0,01');
  await expect(stare(page)).toHaveText('Probleme: 5 (forme verificate: 6).');

  await page.locator('[data-verificare="toleranta"]').press('Escape');
  await expect(panou(page)).toHaveCount(0);
  await expect(marcaje).toHaveCount(0);
});

test('cât panoul e deschis, lista urmează documentul: două dreptunghiuri puse în același loc sunt un duplicat, iar după Ctrl+Z, nimic', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-editare="verificare"]').click();
  await expect(stare(page)).toHaveText('Probleme: 1 (forme verificate: 2).');
  await expect(lista(page).locator('button[data-fel="duplicat"]')).toHaveText('Forme identice: 2; rămâne prima');
  // Ales e doar al doilea, abia pus; clicul pe rând le alege pe amândouă (selecția e pe instanțe).
  const randuri = page.getByTestId('lista-vectori').locator('button[data-instanta]');
  await expect(randuri.nth(0)).toHaveAttribute('aria-pressed', 'false');
  await lista(page).locator('button[data-fel="duplicat"]').click();
  await expect(randuri.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(randuri.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(stare(page)).toHaveText('Nicio problemă (forme verificate: 1).');
  await expect(page.getByTestId('verificare-marcaje')).toHaveCount(0);
});

test('la 1024 px, panoul stă în fereastră și după ce vine conținutul lui (lățimea vecinilor, așezat la deschidere)', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 820 });
  await page.goto('/');
  await adauga(page, 'dreptunghi');
  await page.locator('[data-editare="verificare"]').click();
  await expect(stare(page)).toHaveText('Nicio problemă (forme verificate: 1).');
  const cutie = await panou(page).boundingBox();
  expect(cutie).not.toBeNull();
  expect(cutie!.x).toBeGreaterThanOrEqual(0);
  expect(cutie!.x + cutie!.width).toBeLessThanOrEqual(1024);
});

test('reparațiile: copiile, închiderea și fundița despărțită, fiecare un pas; intersecțiile doar se arată; trei anulări, lista de la început', async ({ page }) => {
  await importa(page);
  await page.locator('[data-editare="verificare"]').click();
  await expect(stare(page)).toHaveText('Probleme: 5 (forme verificate: 6).');
  const reparare = page.getByTestId('verificare-reparare');
  await expect(page.getByTestId('verificare-nota-intersectii')).toBeVisible();
  await expect(lista(page).locator('section[data-fel="intersectie"] [data-repara]')).toHaveCount(0);
  // Copiile: un singur buton pentru toată lista (decizia 1c), fără butoane pe rânduri.
  await expect(lista(page).locator('section[data-fel="duplicat"] [data-repara]')).toHaveCount(1);
  await expect(lista(page).locator('[data-repara="copii"]')).toHaveText('Scoate toate copiile (1)');
  await lista(page).locator('[data-repara="copii"]').click();
  await expect(reparare).toHaveText('Reparat: 1. Anulezi cu Ctrl+Z.');
  await expect(stare(page)).toHaveText('Probleme: 4 (forme verificate: 5).');
  // Calea deschisă, cu golul de 0,05 mm, sub „Închide sub” (1 mm): „Închide” pe rândul ei.
  await lista(page).locator('[data-repara="inchide"]').click();
  await expect(stare(page)).toHaveText('Probleme: 3 (forme verificate: 5).');
  // Fundița, cu bucla de 50 %, peste pragul buclei mici: „Desparte”; cele două triunghiuri se ating în (90, 40).
  await expect(lista(page).locator('[data-repara="desparte"]')).toHaveText('Desparte');
  await lista(page).locator('[data-repara="desparte"]').click();
  await expect(stare(page)).toHaveText('Probleme: 3 (forme verificate: 6).');
  const feluri = await lista(page).locator('section[data-fel]').evaluateAll((s) => s.map((x) => x.getAttribute('data-fel')));
  expect(feluri).toEqual(['intersectie']);
  // Cu pragul de închidere sub gol, „Închide” dispare (după o anulare, calea e din nou deschisă).
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(stare(page)).toHaveText('Probleme: 4 (forme verificate: 5).');
  await expect(lista(page).locator('[data-repara="inchide"]')).toHaveCount(1);
  await page.locator('[data-verificare="inchidere"]').fill('0,01');
  await expect(lista(page).locator('[data-repara="inchide"]')).toHaveCount(0);
  await page.locator('[data-actiune="istoric.anuleaza"]').click();
  await expect(stare(page)).toHaveText('Probleme: 5 (forme verificate: 6).');
});
