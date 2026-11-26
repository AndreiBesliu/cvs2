/**
 * Construcțiile cu nume din atelierul Easy 3Draw (ADR 0284, partea D; felia 3.Ch), pe pagina de sine stătătoare a
 * planificatorului (din aceleași surse ca pachetul). Vederea „Modelul” arată una dintre construcțiile atelierului:
 * - fiecare construcție își ține piesele și numele; una nouă e goală, o copie are aceleași piese (cu legăturile lor);
 * - o construcție fără nume se cheamă „Construcția N” (N, numărul ei), în limba paginii; numele scris de om rămâne cum l-a
 *   scris (nu se traduce și nu e HTML), cel mult 60 de caractere;
 * - un model salvat înainte (doar `model`) se deschide ca o construcție, „Construcția 1”;
 * - piesele construcției, pe rânduri: aceeași piesă se adună, cu filamentul ei și timpul de printat (din filament, la
 *   debitul mediu al imprimantei); „Pune construcția în lista de printat” le pune acolo, cu aceleași bucăți și grame.
 * Timpul, pe hârtie: grame / 1,24e-3 (mm³) / debit (mm³/s), rotunjit la minut: „< 1 min”, „12 min”, „1 h 5 min”, „2 h”.
 */
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, threeDinPachet } from './ajutor-atelier.ts';

const PAGINA = 'http://easy3draw.test/';
const CHEIE = 'atelier.caramizi.v1';
const CARAMIDA = 'Cărămidă 2×4', PLACA = 'Placă 2×2';
const baza = { stifturi: true, fund: 'tuburi', gauri: [], laterale: [], goale: false, mod: 'forma' };
const DEF_CARAMIDA = { tip: 'caramida', celule: [0, 1, 2, 3].flatMap((i) => [[i, 0], [i, 1]]), placi: 3, ...baza };
const DEF_PLACA = { tip: 'caramida', celule: [[0, 0], [1, 0], [0, 1], [1, 1]], placi: 1, ...baza };
// aceeași placă, cu câmpurile în altă ordine: tot aceeași piesă
const DEF_PLACA_ALTFEL = { placi: 1, celule: [[0, 0], [1, 0], [0, 1], [1, 1]], tip: 'caramida', mod: 'forma', goale: false, laterale: [], gauri: [], fund: 'tuburi', stifturi: true };
const caramida = (id: string, x: number, y: number, z: number) => ({ id, def: DEF_CARAMIDA, x, y, z, rot: 0, culoare: '#c8322b' });
const placa = (id: string, x: number, y: number, z: number, def: object = DEF_PLACA) => ({ id, def, x, y, z, rot: 0, culoare: '#2b6cc8' });

type Tinut = { model?: { id: string }[]; constructii?: { id: string; nume: string; nr: number; model: { id: string; prins?: { de: string } }[] }[]; activa?: string };

async function deschide(page: Page, stocat?: unknown): Promise<void> {
  const { preview } = paginiPlanificator();
  await page.route(PAGINA, (r) => r.fulfill({ body: preview, contentType: 'text/html; charset=utf-8' }));
  await threeDinPachet(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (stocat !== undefined) await page.addInitScript(([k, s]) => { if (!sessionStorage.getItem('pus')) { localStorage.setItem(k, s); sessionStorage.setItem('pus', '1'); } }, [CHEIE, JSON.stringify(stocat)] as const);
  await page.goto(PAGINA);
  await intraIn3D(page);
}
async function piesa(page: Page, fila: string, tip: string): Promise<void> {
  await page.locator('#at-vedere-mod [data-v="piesa"]').click();
  await page.locator(`#at-tipuri [data-fila="${fila}"]`).click();
  await page.locator(`#at-galerie [data-piesa="${tip}"]`).click();
  await expect(page.locator(`#at-galerie [data-piesa="${tip}"]`)).toHaveAttribute('aria-pressed', 'true');
}
const modelul = (page: Page) => page.locator('#at-vedere-mod [data-v="model"]').click();
const alegere = (page: Page) => page.locator('#at-c-alege');
const optiuni = (page: Page) => page.locator('#at-c-alege option');
const numeCamp = (page: Page) => page.locator('#at-c-nume');
const lista = (page: Page) => page.locator('#at-m-lista li');
const tinut = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}') as Tinut, CHEIE);
async function redenumeste(page: Page, nume: string): Promise<void> {
  await numeCamp(page).fill(nume);
  await numeCamp(page).press('Enter');
}
/** Rândurile tabelului „Piesele construcției”: numele, bucățile, gramele și secundele (din atributele rândului). */
const randuri = (page: Page) => page.locator('#at-c-piese tbody tr').evaluateAll((e) => e.map((tr) => ({
  nume: tr.querySelector('td')!.textContent!.trim(), bucati: +tr.querySelector('[data-bucati]')!.textContent!,
  g: +(tr as HTMLElement).dataset['g']!, s: +(tr as HTMLElement).dataset['s']!,
  textG: tr.querySelector('[data-grame]')!.textContent!.trim(), textT: tr.querySelector('[data-timp]')!.textContent!.trim(),
})));
const total = (page: Page) => page.locator('#at-c-piese tfoot tr').evaluate((tr) => ({
  bucati: +tr.querySelector('[data-bucati]')!.textContent!, g: +(tr as HTMLElement).dataset['g']!, s: +(tr as HTMLElement).dataset['s']!,
  textG: tr.querySelector('[data-grame]')!.textContent!.trim(), textT: tr.querySelector('[data-timp]')!.textContent!.trim(),
}));
/** Timpul pe hârtie: rotunjit la minut; sub un minut, „< 1 min”. */
function durata(s: number): string {
  if (s < 60) return '< 1 min';
  const m = Math.round(s / 60), h = Math.floor(m / 60), r = m % 60;
  return h ? (r ? `≈ ${h} h ${r} min` : `≈ ${h} h`) : `≈ ${m} min`;
}
/** Gramele, cum le scrie pagina: o zecimală, cu virgula. */
const grame = (g: number) => `${String(Math.round(g * 10) / 10).replace('.', ',')} g`;

test('un model salvat înainte (doar `model`) se deschide ca „Construcția 1”, cu piesele lui; cu una singură, „Șterge” e oprit; salvarea ține construcțiile', async ({ page }) => {
  await deschide(page, { model: [caramida('c1', 0, 0, 0), placa('p1', 0, 0, 3)] });
  await modelul(page);
  await expect(optiuni(page)).toHaveText(['Construcția 1']);
  await expect(alegere(page)).toHaveValue(/.+/);
  // fără nume scris: câmpul e gol, cu numele implicit ca indiciu
  await expect(numeCamp(page)).toHaveValue('');
  await expect(numeCamp(page)).toHaveAttribute('placeholder', 'Construcția 1');
  await expect(lista(page)).toHaveCount(2);
  await expect(page.locator('#at-c-sterge')).toBeDisabled();
  await expect(page.locator('#at-model-lista')).toHaveText('Pune construcția în lista de printat');
  // o schimbare salvează: construcția are numărul 1, fără nume, cu piesele; `model` e al construcției alese
  await redenumeste(page, 'Macara');
  await expect(optiuni(page)).toHaveText(['Macara']);
  await expect.poll(async () => (await tinut(page)).constructii?.length).toBe(1);
  const t = await tinut(page);
  expect(t.constructii![0]).toMatchObject({ nume: 'Macara', nr: 1 });
  expect(t.constructii![0]!.model.map((m) => m.id)).toEqual(['c1', 'p1']);
  expect(t.activa).toBe(t.constructii![0]!.id);
  expect(t.model!.map((m) => m.id)).toEqual(['c1', 'p1']);
});

test('construcție nouă, goală, cu numele în câmp; fiecare construcție își ține piesele; alegerea și numele rămân la reîncărcare', async ({ page }) => {
  await deschide(page, { model: [caramida('c1', 0, 0, 0)] });
  await modelul(page);
  await page.locator('#at-c-noua').click();
  await expect(optiuni(page)).toHaveText(['Construcția 1', 'Construcția 2']);
  await expect(alegere(page).locator('option:checked')).toHaveText('Construcția 2');
  await expect(lista(page)).toHaveCount(0);
  await expect(page.locator('#at-editor')).toContainText('Modelul e gol.');
  await expect(page.locator('#at-vedere-mod [data-v="model"]')).toHaveText('Modelul');
  await expect(page.locator('#at-c-sterge')).toBeEnabled();
  // câmpul numelui e gata de scris
  await expect(numeCamp(page)).toBeFocused();
  await redenumeste(page, 'Șasiu');
  await expect(optiuni(page)).toHaveText(['Construcția 1', 'Șasiu']);
  // o piesă pusă acum intră în construcția aleasă
  await piesa(page, 'caramizi', 'caramida');
  await page.locator('#at-in-model').click();
  await expect(page.locator('#at-vedere-mod [data-v="model"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(lista(page)).toHaveCount(1);
  await expect(page.locator('#at-vedere-mod [data-v="model"]')).toHaveText('Modelul (1)');
  // cealaltă și-a ținut piesa ei; înapoi, la fel
  await alegere(page).selectOption({ label: 'Construcția 1' });
  await expect(lista(page)).toHaveCount(1);
  await expect(lista(page).first()).toContainText(CARAMIDA);
  await expect(numeCamp(page)).toHaveValue('');
  await alegere(page).selectOption({ label: 'Șasiu' });
  await expect(numeCamp(page)).toHaveValue('Șasiu');
  await expect(lista(page)).toHaveCount(1);
  const idSasiu = await tinut(page).then((t) => t.constructii!.find((c) => c.nume === 'Șasiu')!.id);
  await expect.poll(async () => (await tinut(page)).activa).toBe(idSasiu);
  await page.reload();
  await intraIn3D(page);
  await modelul(page);
  await expect(optiuni(page)).toHaveText(['Construcția 1', 'Șasiu']);
  await expect(alegere(page).locator('option:checked')).toHaveText('Șasiu');
  await expect(lista(page)).toHaveCount(1);
});

test('Dublează: aceleași piese, cu legăturile lor, și numele următor; Șterge, cu întrebarea; cu una rămasă, oprit', async ({ page }) => {
  const legata = { ...placa('p1', 0, 0, 3), prins: { de: 'c1', a: 0, b: 0, unghi: 0, alunec: 0 } };
  await deschide(page, { constructii: [{ id: 'a', nume: 'Macara', nr: 1, model: [caramida('c1', 0, 0, 0), legata] }], activa: 'a' });
  await modelul(page);
  await expect(optiuni(page)).toHaveText(['Macara']);
  await page.locator('#at-c-dubla').click();
  await expect(optiuni(page)).toHaveText(['Macara', 'Macara 2']);
  await expect(alegere(page).locator('option:checked')).toHaveText('Macara 2');
  await expect(lista(page)).toHaveCount(2);
  await expect.poll(async () => (await tinut(page)).constructii?.length).toBe(2);
  const t = await tinut(page);
  // copia ține piesele cu id-urile lor, deci și legătura plăcii de cărămidă
  expect(t.constructii![1]!.model.map((m) => m.id)).toEqual(['c1', 'p1']);
  expect(t.constructii![1]!.model[1]!.prins).toMatchObject({ de: 'c1' });
  expect(t.constructii![1]!.id).not.toBe('a');
  expect(t.constructii![1]!.nr).toBe(2);
  // o copie a copiei: numărul următor
  await page.locator('#at-c-dubla').click();
  await expect(optiuni(page)).toHaveText(['Macara', 'Macara 2', 'Macara 3']);
  // Șterge întreabă întâi; șterge construcția aleasă (ultima), iar alegerea trece pe cea de dinainte
  await page.locator('#at-c-sterge').click();
  await expect(page.locator('#at-c-confirma')).toBeVisible();
  await expect(optiuni(page)).toHaveCount(3);
  await page.locator('#at-c-sterge-da').click();
  await expect(optiuni(page)).toHaveText(['Macara', 'Macara 2']);
  await expect(alegere(page).locator('option:checked')).toHaveText('Macara 2');
  // din mijloc: alegerea trece pe cea care îi ia locul
  await alegere(page).selectOption({ label: 'Macara' });
  await page.locator('#at-c-sterge').click();
  await page.locator('#at-c-sterge-da').click();
  await expect(optiuni(page)).toHaveText(['Macara 2']);
  await expect(alegere(page).locator('option:checked')).toHaveText('Macara 2');
  await expect(page.locator('#at-c-sterge')).toBeDisabled();
  await expect(lista(page)).toHaveCount(2);
  await expect.poll(async () => (await tinut(page)).constructii?.map((c) => c.nume)).toEqual(['Macara 2']);
});

test('o construcție fără nume dublată rămâne fără nume, cu numărul ei; cea nouă ia cel mai mic număr liber', async ({ page }) => {
  await deschide(page, { constructii: [{ id: 'a', nume: '', nr: 2, model: [caramida('c1', 0, 0, 0)] }, { id: 'b', nume: 'Barca', nr: 3, model: [] }], activa: 'a' });
  await modelul(page);
  await expect(optiuni(page)).toHaveText(['Construcția 2', 'Barca']);
  await page.locator('#at-c-dubla').click();
  await expect(optiuni(page)).toHaveText(['Construcția 2', 'Construcția 1', 'Barca']);
  await expect(numeCamp(page)).toHaveValue('');
  await page.locator('#at-c-noua').click();
  await expect(optiuni(page)).toHaveText(['Construcția 2', 'Construcția 1', 'Barca', 'Construcția 4']);
});

test('numele sunt ale omului: nu sunt HTML, au cel mult 60 de caractere, iau numărul următor dacă sunt luate; gol întoarce numele implicit', async ({ page }) => {
  await deschide(page, { constructii: [{ id: 'a', nume: 'Barca', nr: 1, model: [] }, { id: 'b', nume: '', nr: 2, model: [] }], activa: 'b' });
  await modelul(page);
  await redenumeste(page, '<b>x</b> & "y"');
  await expect(alegere(page).locator('option:checked')).toHaveText('<b>x</b> & "y"');
  await expect(page.locator('#at-c-alege b')).toHaveCount(0);
  await expect(numeCamp(page)).toHaveValue('<b>x</b> & "y"');
  await redenumeste(page, '  Barca  ');
  await expect(optiuni(page)).toHaveText(['Barca', 'Barca 2']);
  await redenumeste(page, 'z'.repeat(70));
  await expect(numeCamp(page)).toHaveValue('z'.repeat(60));
  // gol: din nou fără nume, deci „Construcția 2”
  await redenumeste(page, '   ');
  await expect(optiuni(page)).toHaveText(['Barca', 'Construcția 2']);
  await expect(numeCamp(page)).toHaveValue('');
  await expect.poll(async () => (await tinut(page)).constructii?.map((c) => c.nume)).toEqual(['Barca', '']);
});

test('ce stă stricat în stocare se citește cât se poate: intrările fără piese se sar, id-urile și numerele se fac unice, numele se curăță', async ({ page }) => {
  await deschide(page, {
    constructii: [null, { id: 'x', nume: 'Fără piese', model: 'nu' }, { id: 'a', nume: '  Barca   mare ', nr: 'x', model: [caramida('c1', 0, 0, 0)] },
      { id: 'a', nume: 'Barca mare', nr: 1, model: [] }, { id: 'c', nume: 5, nr: 1, model: [{ id: 'rau' }] }],
    activa: 'nu-exista', model: [placa('p9', 0, 0, 0)],
  });
  await modelul(page);
  // numerele, pe rând: „x” nu e un număr, deci 1; al doilea 1 e luat, deci 2; al treilea, 3
  await expect(optiuni(page)).toHaveText(['Barca mare', 'Barca mare 2', 'Construcția 3']);
  // o alegere care nu mai există trece pe prima construcție
  await expect(alegere(page).locator('option:checked')).toHaveText('Barca mare');
  await expect(lista(page)).toHaveCount(1);
  await redenumeste(page, 'Barca mare');
  await expect.poll(async () => (await tinut(page)).constructii?.length).toBe(3);
  const t = await tinut(page);
  expect(new Set(t.constructii!.map((c) => c.id)).size).toBe(3);
  expect(new Set(t.constructii!.map((c) => c.nr)).size).toBe(3);
  // piesa fără definiție a plecat
  expect(t.constructii![2]!.model).toEqual([]);
});

test('piesele construcției: aceeași piesă se adună, cu filamentul și timpul ei; timpul urmează debitul imprimantei; „Pune construcția în lista de printat”', async ({ page }) => {
  await deschide(page, { model: [caramida('c1', 0, 0, 0), placa('p1', 0, 0, 3), caramida('c2', 0, 3, 0), placa('p2', 2, 0, 3, DEF_PLACA_ALTFEL)] });
  await modelul(page);
  await expect(page.locator('#at-c-piese')).toBeVisible();
  const r = await randuri(page);
  expect(r.map((x) => [x.nume, x.bucati])).toEqual([[CARAMIDA, 2], [PLACA, 2]]);
  // debitul implicit: 5 mm³/s; timpul pe hârtie, din grame
  for (const x of r) {
    expect(x.g).toBeGreaterThan(0);
    expect(Math.abs(x.s - x.g / 1.24e-3 / 5)).toBeLessThan(1e-6);
    expect(x.textG).toBe(grame(x.g));
    expect(x.textT).toBe(durata(x.s));
  }
  const T = await total(page);
  expect(T.bucati).toBe(4);
  expect(Math.abs(T.g - (r[0]!.g + r[1]!.g))).toBeLessThan(1e-9);
  expect(Math.abs(T.s - T.g / 1.24e-3 / 5)).toBeLessThan(1e-6);
  expect(T.textT).toBe(durata(T.s));
  expect(T.textG).toBe(grame(T.g));
  // în cotele vederii, și timpul
  await expect(page.locator('#at-cote')).toContainText(`Timp ${durata(T.s)}`);
  // debitul, din „Imprimanta și potrivirea pieselor”: de două ori mai mare, timpul de două ori mai mic
  await page.locator('#at-sectiune-lista details.setari summary').click();
  const debit = page.locator('#at-r-debit');
  await expect(debit).toHaveValue('5');
  await debit.fill('10');
  await debit.blur();
  await expect.poll(async () => (await total(page)).s).toBeCloseTo(T.s / 2, 6);
  const r2 = await randuri(page);
  for (let k = 0; k < r2.length; k++) expect(r2[k]!.s).toBeCloseTo(r[k]!.s / 2, 6);
  await expect(page.locator('#at-c-piese')).toContainText('10 mm³/s');
  // un debit fără sens se pune în margini: cel puțin 1, cel mult 50
  await debit.fill('0');
  await debit.blur();
  await expect(debit).toHaveValue('1');
  await debit.fill('400');
  await debit.blur();
  await expect(debit).toHaveValue('50');
  // în lista de printat: aceleași rânduri, cu aceleași bucăți și grame
  await page.locator('#at-model-lista').click();
  await expect(page.locator('#at-toast')).toHaveText('4 piese din „Construcția 1” în lista de printat.');
  const rl = page.locator('#at-lista tr');
  await expect(rl).toHaveCount(2);
  await expect(rl.nth(0).locator('td').nth(0)).toHaveText(CARAMIDA);
  await expect(rl.nth(0).locator('.pas-n')).toHaveText('2');
  await expect(rl.nth(0).locator('td').nth(3)).toHaveText(grame(r[0]!.g));
  await expect(rl.nth(1).locator('td').nth(0)).toHaveText(PLACA);
  await expect(rl.nth(1).locator('.pas-n')).toHaveText('2');
  await expect(rl.nth(1).locator('td').nth(3)).toHaveText(grame(r[1]!.g));
});

test('timpul, rotunjit la minut: o placă la 1 mm³/s, câteva minute; la 50 mm³/s, sub un minut', async ({ page }) => {
  await deschide(page, { model: [placa('p1', 0, 0, 0)], setari: { debit: 1 } });
  await modelul(page);
  const unu = (await randuri(page))[0]!;
  expect(unu.textT).toBe(durata(unu.s));
  expect(unu.textT).toMatch(/^≈ \d+ min$/);
  await page.locator('#at-sectiune-lista details.setari summary').click();
  await page.locator('#at-r-debit').fill('50');
  await page.locator('#at-r-debit').blur();
  await expect.poll(async () => (await randuri(page))[0]!.textT).toBe('< 1 min');
});
