import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ariePx } from '../../src/jobs/calculTrasare.ts';
import { traseazaMediana, type OptiuniMediana } from '../../src/trasare/mediana.ts';
import { citestePng } from '../unit/ajutor-png.ts';
import { documentSalvat } from './ajutor-document.ts';

/**
 * Linia mediană în aplicația construită (ADR 0222, felia 25.3↑): „Rezultatul” → „Linii mediane”, raportul grosimii (și al
 * frezei foii, când foaia are una), banda grosimii, „Importă” cu toate căile tăiate pe linie. Așteptările vin din nucleul
 * rulat aici, în Node, pe același PNG, cu curățarea implicită a ferestrei: drumul din browser (decodarea, workerul, ușa,
 * documentul) trebuie să dea aceleași căi și aceeași grosime.
 */

test.use({ locale: 'ro-RO' });

const MM = 25.4 / 96;
const zec = (x: number, z: number): string => new Intl.NumberFormat('ro-RO', { minimumFractionDigits: z, maximumFractionDigits: z }).format(x);

function inNode(nume: string, om?: OptiuniMediana) {
  const r = rezultatInNode(nume, om);
  return r.raport;
}

function rezultatInNode(nume: string, om?: OptiuniMediana) {
  const img = citestePng(readFileSync(`test/fixtures/trasare/${nume}.png`));
  const p = ariePx(0.3, MM);
  const r = traseazaMediana(img, { sursa: 'auto', prag: null, inverseaza: false, netezime: 'echilibrat', petePx: p, gauriPx: p }, om);
  if (!r.ok) throw new Error(`${nume}: ${r.cod}`);
  return r;
}

async function deschide(page: Page, fisier: string): Promise<void> {
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(`test/fixtures/trasare/${fisier}.png`);
  await expect(page.getByTestId('trasare-abatere')).toBeVisible();
}

test('semnătura: Linii mediane, cu grosimea și freza foii în raport; banda grosimii; Importă pune o piesă tăiată toată pe linie', async ({ page }) => {
  const n = inNode('mediana-semnatura-w3.5');
  expect(n.contururi).toBe(1);
  await page.goto('/');
  // Întâi o piesă din contururi (operația implicită, cu freza Ø 6): foaia are o singură freză, cu care se compară trăsătura.
  await deschide(page, 'mediana-semnatura-w3.5');
  await expect(page.locator('[data-camp="trasare-rezultat"]')).toHaveValue('contururi');
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await deschide(page, 'mediana-semnatura-w3.5');
  await page.locator('[data-camp="trasare-rezultat"]').selectOption('mediane');
  await expect(page.getByTestId('trasare-grosime')).toHaveText(`Grosimea obișnuită a trăsăturilor: ${zec(n.grosime * MM, 2)} mm (${zec(n.grosime, 1)} px)`);
  await expect(page.getByTestId('trasare-freza')).toHaveAttribute('data-fel', 'lata');
  await expect(page.getByTestId('trasare-freza')).toHaveText('Freza foii (Ø 6,00 mm) e mai lată decât trăsătura: gravura ar mânca din jur.');
  await expect(page.getByTestId('trasare-abatere')).toContainText('față de mijlocul măsurat al trăsăturilor');
  await expect(page.getByTestId('import-deschise')).toHaveText('1 linie mediană, tăiată pe linie: un canal de cel mult 1 mm (jumătate din foaie, dacă e mai subțire), într-o trecere');
  await expect(page.getByTestId('import-grosime-linie')).toHaveCount(0);
  // Banda grosimii schimbă desenul previzualizării.
  const panza = page.getByTestId('trasare-previzualizare');
  const inainte = await panza.evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  await page.locator('[data-camp="trasare-arata-grosimea"]').check();
  await expect.poll(() => panza.evaluate((c) => (c as HTMLCanvasElement).toDataURL())).not.toBe(inainte);
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const doc = JSON.parse(await documentSalvat(page, 2)) as {
    piese: Array<{ nume: string; operatii: Array<{ id: string; latura: string; noduri: string[] }>; radacina: { copii: Array<{ forma: { inchis: boolean } }> } }>;
  };
  expect(doc.piese.length).toBe(2);
  const piesa = doc.piese[1];
  expect(piesa?.operatii.map((o) => [o.id, o.latura, o.noduri.length])).toEqual([['deschise', 'pe-linie', n.contururi]]);
  expect(piesa?.radacina.copii.map((e) => e.forma.inchis)).toEqual([false]);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('Contururi ↔ Linii mediane: inelul devine o buclă pe linie; pe culori alegerea dispare, iar înapoi rămâne cea făcută', async ({ page }) => {
  await page.goto('/');
  await deschide(page, 'mediana-inel-w8');
  await expect(page.getByTestId('import-cai')).toHaveText('2 contururi închise: 1 tăiate pe exterior, 1 pe interior (după sensul fiecărui contur)');
  await page.locator('[data-camp="trasare-rezultat"]').selectOption('mediane');
  await expect(page.getByTestId('import-deschise')).toHaveText('1 linie mediană, tăiată pe linie: un canal de cel mult 1 mm (jumătate din foaie, dacă e mai subțire), într-o trecere');
  await expect(page.getByTestId('import-cai')).toHaveCount(0);
  // Fără freză pe foaie, raportul spune doar grosimea.
  await expect(page.getByTestId('trasare-grosime')).toBeVisible();
  await expect(page.getByTestId('trasare-freza')).toHaveCount(0);
  await page.locator('[data-camp="trasare-sursa"]').selectOption('culori');
  await expect(page.locator('[data-camp="trasare-rezultat"]')).toHaveCount(0);
  await expect(page.getByTestId('trasare-pastile')).toBeVisible();
  await page.locator('[data-camp="trasare-sursa"]').selectOption('auto');
  await expect(page.locator('[data-camp="trasare-rezultat"]')).toHaveValue('mediane');
  await expect(page.getByTestId('import-deschise')).toContainText('1 linie mediană');
});

test('un disc plin dă doar un punct: refuzul spune să alegi Contururi, iar raportul numără punctul', async ({ page }) => {
  await page.goto('/');
  await deschide(page, 'cerc-opac-alb');
  await page.locator('[data-camp="trasare-rezultat"]').selectOption('mediane');
  await expect(page.getByTestId('import-refuz')).toHaveText('Nicio linie mediană: desenul are doar puncte (trăsături sau pete mai scurte decât grosimea lor). Pentru ele, alege Contururi.');
  await expect(page.getByTestId('trasare-puncte')).toHaveText('1 punct (o trăsătură mai scurtă decât grosimea ei) n-are linie mediană: pentru el, alege Contururi.');
  await expect(page.locator('[data-buton="importa"]')).toHaveCount(0);
  await page.locator('[data-camp="trasare-rezultat"]').selectOption('contururi');
  await expect(page.getByTestId('import-cai')).toHaveText('1 contur închis: 1 tăiate pe exterior, 0 pe interior (după sensul fiecărui contur)');
});

test('opțiunile liniei mediane (ADR 0223) pe logo: doar la Linii mediane; părțile late semnalate, apoi contururi; buclele închise', async ({ page }) => {
  const semnalat = inNode('logo-cvs', { capete: 'centru', late: 'mediane', pragLatPx: null, semnaleaza: true, bucle: 'linie' });
  const toate = rezultatInNode('logo-cvs', { capete: 'centru', late: 'contur', pragLatPx: null, semnaleaza: true, bucle: 'inchise' });
  const parti = semnalat.parti;
  expect(parti?.numar).toBe(2);
  const laturi = Array.from({ length: toate.cai.inceput.length - 1 }, (_, k) =>
    (toate.cai.deschisa?.[k] === 1 || toate.cai.peLinie?.[k] !== 0 ? 'pe-linie' : toate.cai.exterior[k] === 1 ? 'exterior' : 'interior'));
  const cate = (l: string): number => laturi.filter((x) => x === l).length;
  await page.goto('/');
  await deschide(page, 'logo-cvs');
  await expect(page.getByTestId('trasare-optiuni-mediane')).toHaveCount(0);
  await page.locator('[data-camp="trasare-rezultat"]').selectOption('mediane');
  const grup = page.getByTestId('trasare-optiuni-mediane');
  await expect(grup).toBeVisible();
  // Implicitele (răspunsurile 1a–3a): recomandările din ADR 0222, cu semnalarea pornită și pragul automat.
  await expect(page.locator('[data-camp="trasare-capete"]')).toHaveValue('centru');
  await expect(page.locator('[data-camp="trasare-late"]')).toHaveValue('mediane');
  await expect(page.locator('[data-camp="trasare-bucle"]')).toHaveValue('linie');
  await expect(page.locator('[data-camp="trasare-arata-late"]')).toBeChecked();
  await expect(page.locator('[data-camp="trasare-lat-auto"]')).toBeChecked();
  await expect(page.locator('[data-camp="trasare-lat"]')).toHaveValue(zec((parti?.pragPx ?? 0) * MM, 2));
  await expect(page.getByTestId('trasare-parti')).toHaveText(
    `2 părți late (${zec(100 * (parti?.arie ?? 0), 0)} % din cerneală), mai late de ${zec((parti?.pragPx ?? 0) * MM, 2)} mm.`);
  await expect(page.getByTestId('import-deschise')).toContainText(`${semnalat.contururi} de linii mediane`);
  // Semnalarea colorează părțile late în previzualizare: oprită, desenul se schimbă.
  const panza = page.getByTestId('trasare-previzualizare');
  const cuLate = await panza.evaluate((c) => (c as HTMLCanvasElement).toDataURL());
  await page.locator('[data-camp="trasare-arata-late"]').uncheck();
  await expect.poll(() => panza.evaluate((c) => (c as HTMLCanvasElement).toDataURL())).not.toBe(cuLate);
  await expect(page.getByTestId('trasare-parti')).toHaveCount(0);
  await page.locator('[data-camp="trasare-arata-late"]').check();
  // Capetele în vârf: punctul logoului (tăblița lui „i”) devine o linie de la o margine la alta, deci raportul nu-l mai numără.
  await expect(page.getByTestId('trasare-puncte')).toBeVisible();
  await page.locator('[data-camp="trasare-capete"]').selectOption('varf');
  await expect(page.getByTestId('trasare-puncte')).toHaveCount(0);
  await page.locator('[data-camp="trasare-capete"]').selectOption('centru');
  await expect(page.getByTestId('trasare-puncte')).toBeVisible();
  // Contururi și bucle închise: pe exterior, blocurile frezei și buclele; pe linie, restul.
  await page.locator('[data-camp="trasare-late"]').selectOption('contur');
  await page.locator('[data-camp="trasare-bucle"]').selectOption('inchise');
  await expect(page.getByTestId('import-cai')).toContainText(`${cate('exterior')} tăiate pe exterior, ${cate('interior')} pe interior`);
  await expect(page.getByTestId('import-deschise')).toContainText(`${cate('pe-linie')} de linii mediane`);
  // Pragul scris: peste blocuri (12 mm), nicio parte lată; „Automat” îl readuce.
  await page.locator('[data-camp="trasare-lat-auto"]').uncheck();
  await page.locator('[data-camp="trasare-lat"]').fill('12');
  await expect(page.getByTestId('trasare-parti')).toHaveText('Nicio parte mai lată de 12,00 mm.');
  await page.locator('[data-camp="trasare-lat-auto"]').check();
  await expect(page.getByTestId('trasare-parti')).toContainText('2 părți late');
  // Contururi → opțiunile dispar; înapoi la Linii mediane, rămân cele alese.
  await page.locator('[data-camp="trasare-rezultat"]').selectOption('contururi');
  await expect(grup).toHaveCount(0);
  await page.locator('[data-camp="trasare-rezultat"]').selectOption('mediane');
  await expect(page.locator('[data-camp="trasare-late"]')).toHaveValue('contur');
  await expect(page.locator('[data-camp="trasare-bucle"]')).toHaveValue('inchise');
  await expect(page.getByTestId('import-cai')).toContainText(`${cate('exterior')} tăiate pe exterior`);
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const doc = JSON.parse(await documentSalvat(page, 1)) as { piese: Array<{ operatii: Array<{ id: string; latura: string; noduri: string[] }> }> };
  expect(doc.piese[0]?.operatii.map((o) => [o.id, o.latura, o.noduri.length]))
    .toEqual([['exterior', 'exterior', cate('exterior')], ['deschise', 'pe-linie', cate('pe-linie')]]);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
