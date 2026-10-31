/**
 * Importul PDF și AI prin dialog (ADR 0104 §7): formatul după nume și tip, previzualizarea paginii alese (mărimea desenului,
 * laturile din imbricare, straturile ca nume, desenul unde era pe pagină), refuzurile cu formatul și cu numărul paginilor,
 * și acțiunea, cu pagina din context. În Node merge întreagă: ușa PDF cere doar `DecompressionStream`. Valorile sunt cele
 * din corpusul MuPDF (`test/fixtures/pdf/asteptat.json`), recitite pe hârtie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { formatImport } from '../../src/io/formatImport.ts';
import { numeDinFisier } from '../../src/io/piesa.ts';
import { ACTIUNI_IMPORT, type PrevizualizareImport } from '../../src/ui/actiuniImport.ts';
import { previzualizare } from '../../src/ui/actiuniImportCalcul.ts';
import { B, pagini } from './ajutor-pdf.ts';

const fixtura = (nume: string): Uint8Array => new Uint8Array(readFileSync(new URL(`../fixtures/pdf/${nume}`, import.meta.url)));
const O = { pxPeTol: 96, limba: 'ro' } as const;
const aproape = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-6;

test('formatul: .pdf și .ai (Illustrator scrie PDF de la versiunea 9), apoi tipul MIME; numele piesei fără extensie', () => {
  assert.equal(formatImport('Panou.PDF', ''), 'pdf');
  assert.equal(formatImport('logo.ai', 'application/postscript'), 'pdf');
  for (const t of ['application/pdf', 'application/illustrator', 'application/vnd.adobe.illustrator']) assert.equal(formatImport('x', t), 'pdf');
  // PostScript fără extensie (un EPS): nu e al ușii PDF, ci al ușii EPS (ADR 0115).
  assert.equal(formatImport('x', 'application/postscript'), 'eps');
  assert.equal(numeDinFisier('Panou ornamental.pdf'), 'Panou ornamental');
  assert.equal(numeDinFisier('logo.AI'), 'logo');
});

test('previzualizarea PDF, pagina 1: mărimea, exteriorul și linia deschisă, straturile ca nume, desenul unde era pe pagină', async () => {
  const p = await previzualizare({ nume: 'in-straturi.pdf', octeti: fixtura('in-straturi.pdf') }, O);
  assert.ok(p.ok && p.format === 'pdf');
  // Dreptunghiul (20, 20)–(120, 80) pe DECUPARE și linia (150, 50)–(250, 50) pe GRAVARE; forma de pe stratul oprit, sărită.
  assert.ok(aproape(p.latime, 230) && aproape(p.inaltime, 60), `${p.latime} × ${p.inaltime}`);
  assert.deepEqual([p.exterioare, p.interioare, p.deschise, p.pagini, p.pagina], [1, 0, 1, 3, 1]);
  assert.deepEqual(p.straturi, ['DECUPARE', 'GRAVARE']);
  assert.equal(p.avertismente.ascunse, 1);
  assert.equal(p.pregatit.nume, 'in-straturi');
  const { piesa, x, y } = p.pregatit.piesa('p1', {});
  assert.ok(aproape(x, 20) && aproape(y, 20), `${x}, ${y}`);
  const rad = piesa.radacina;
  assert.ok(rad.tip === 'grup');
  assert.deepEqual(rad.copii.map((e) => (e.tip === 'element' ? e.nume : e.tip)), ['DECUPARE', 'GRAVARE']);
  assert.deepEqual(piesa.operatii.map((o) => [o.id, o.latura, o.noduri.length]), [['exterior', 'exterior', 1], ['deschise', 'pe-linie', 1]]);
});

test('previzualizarea PDF, paginile 2 și 3: triunghiul din Form XObject (fără strat, fără nume), polilinia paginii decupate și rotite', async () => {
  const f = { nume: 'in-straturi.pdf', octeti: fixtura('in-straturi.pdf') };
  const doi = await previzualizare(f, { ...O, pagina: 2 });
  assert.ok(doi.ok && doi.format === 'pdf');
  assert.deepEqual([doi.exterioare, doi.deschise, doi.pagina, doi.straturi.length], [1, 0, 2, 0]);
  // Triunghiul (110, 60), (190, 60), (150, 140): 80 × 80 mm.
  assert.ok(Math.abs(doi.latime - 80) < 1e-3 && Math.abs(doi.inaltime - 80) < 1e-3, `${doi.latime} × ${doi.inaltime}`);
  const rad = doi.pregatit.piesa('p1', {}).piesa.radacina;
  assert.ok(rad.tip === 'grup' && rad.copii[0]?.tip === 'element' && rad.copii[0].nume === undefined);
  const trei = await previzualizare(f, { ...O, pagina: 3 });
  assert.ok(trei.ok && trei.format === 'pdf');
  // Polilinia (50, 230), (50, 130), (90, 130) pe pagina afișată: 40 × 100 mm, deschisă.
  assert.deepEqual([trei.exterioare, trei.deschise, trei.pagina], [0, 1, 3]);
  assert.ok(Math.abs(trei.latime - 40) < 1e-5 && Math.abs(trei.inaltime - 100) < 1e-5, `${trei.latime} × ${trei.inaltime}`);
  const { x, y } = trei.pregatit.piesa('p1', {});
  assert.ok(Math.abs(x - 50) < 1e-5 && Math.abs(y - 130) < 1e-5, `${x}, ${y}`);
});

test('refuzurile PDF poartă formatul; o pagină goală, și numărul paginilor (dialogul oferă alta)', async () => {
  assert.deepEqual(await previzualizare({ nume: 'criptat.pdf', octeti: fixtura('criptat.pdf') }, O), { ok: false, cod: 'criptat', format: 'pdf' });
  // Un AI de dinainte de Illustrator 9 e PostScript: îl citește ușa EPS (ADR 0115), aleasă după antet; fără nicio cale, golul.
  const vechi = await previzualizare({ nume: 'vechi.ai', octeti: B('%!PS-Adobe-3.0\n%%Creator: Adobe Illustrator(TM) 8.0\n') }, O);
  assert.ok(!vechi.ok && vechi.cod === 'gol' && vechi.format === 'eps');
  // Coperta are doar un titlu (text, sărit); desenul e pe pagina a doua.
  const f = { nume: 'Planșe.pdf', octeti: pagini(['BT /F1 12 Tf (Titlu) Tj ET', '0 0 m 72 0 l S']) };
  const coperta = await previzualizare(f, O);
  assert.ok(!coperta.ok && coperta.cod === 'gol' && coperta.format === 'pdf');
  assert.equal(coperta.pagini, 2);
  assert.equal(coperta.avertismente && 'sarit-text' in coperta.avertismente ? coperta.avertismente['sarit-text'] : -1, 1);
  const desen = await previzualizare(f, { ...O, pagina: 2 });
  assert.ok(desen.ok && desen.format === 'pdf');
  assert.deepEqual([desen.deschise, desen.pagina, desen.pagini], [1, 2, 2]);
  assert.ok(aproape(desen.latime, 25.4));
});

test('acțiunea importului citește pagina din context (ușa încărcată la cerere)', async () => {
  const r = creeazaRegistru(ACTIUNI_IMPORT, () => true);
  const p = await new Promise<PrevizualizareImport>((rez) => {
    ruleaza(r, 'import.svg', {
      fisier: () => ({ nume: 'in-straturi.pdf', octeti: fixtura('in-straturi.pdf') }),
      pxPeTol: () => 96,
      pagina: () => 3,
      limba: () => 'ro',
      doarCitire: () => false,
      rezultat: rez,
    });
  });
  assert.ok(p.ok && p.format === 'pdf');
  assert.deepEqual([p.pagina, p.deschise], [3, 1]);
});
