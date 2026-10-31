/**
 * Importul EPS și AI ≤ 8 prin dialog (ADR 0115 §1, §7): formatul după nume și tip, ușa aleasă după antet (un `.ai` e PDF de
 * la Illustrator 9 și PostScript înainte; un fișier fără extensie cunoscută, după antet), previzualizarea (mărimea desenului,
 * laturile din imbricare, straturile AI ca nume, desenul unde e în fișier), refuzurile cu formatul și acțiunea. Valorile sunt
 * cele din corpusul trecut prin Ghostscript (`test/fixtures/eps/asteptat.json`), recitite pe hârtie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatDupaAntet, formatImport } from '../../src/io/formatImport.ts';
import { numeDinFisier } from '../../src/io/piesa.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_IMPORT, type PrevizualizareImport } from '../../src/ui/actiuniImport.ts';
import { previzualizare } from '../../src/ui/actiuniImportCalcul.ts';
import { B, pagini } from './ajutor-pdf.ts';

const fixtura = (nume: string): Uint8Array => new Uint8Array(readFileSync(new URL(`../fixtures/eps/${nume}`, import.meta.url)));
const O = { pxPeTol: 96, limba: 'ro' } as const;
const aproape = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-6;

test('formatul: .eps (și .epsf, .epsi), apoi tipurile MIME PostScript; .ai rămâne în familia PDF; numele piesei fără extensie', () => {
  for (const n of ['desen.eps', 'DESEN.EPS', 'x.epsf', 'x.EPSI']) assert.equal(formatImport(n, ''), 'eps', n);
  for (const t of ['application/postscript', 'application/eps', 'application/x-eps', 'image/eps', 'image/x-eps']) assert.equal(formatImport('x', t), 'eps', t);
  assert.equal(formatImport('logo.ai', 'application/postscript'), 'pdf');
  assert.equal(formatImport('desen.ps', ''), null);
  assert.equal(numeDinFisier('Rama ovala.eps'), 'Rama ovala');
  assert.equal(numeDinFisier('x.EPSF'), 'x');
});

test('ușa după antet: PostScript (și după ^D, și EPS-ul binar DOS) → eps; %PDF- în primii 1024 de octeți → pdf; altfel nimic', () => {
  assert.equal(formatDupaAntet(B('%!PS-Adobe-3.0 EPSF-3.0\n')), 'eps');
  assert.equal(formatDupaAntet(B('\x04%!PS-Adobe-2.0\n')), 'eps');
  assert.equal(formatDupaAntet(Uint8Array.from([0xc5, 0xd0, 0xd3, 0xc6, 30, 0, 0, 0])), 'eps');
  assert.equal(formatDupaAntet(B('%PDF-1.7\n')), 'pdf');
  assert.equal(formatDupaAntet(B(`${' '.repeat(1000)}%PDF-1.4`)), 'pdf');
  assert.equal(formatDupaAntet(B(`${' '.repeat(1020)}%PDF-1.4`)), null);
  assert.equal(formatDupaAntet(B('<svg/>')), null);
});

test('previzualizarea EPS: mărimea, laturile din imbricare, căile deschise; piesa stă unde e desenul în fișier', async () => {
  const p = await previzualizare({ nume: 'forme.eps', octeti: fixtura('forme.eps') }, O);
  assert.ok(p.ok && p.format === 'eps');
  // Cutia desenului: de la (10, 10) la (290, 185) mm (pătratul umplut și tras ajunge la 290, înclinarea la 185).
  assert.ok(aproape(p.latime, 280) && aproape(p.inaltime, 175), `${p.latime} × ${p.inaltime}`);
  // 9 contururi închise: golul par-impar e interior, celelalte 8 exterioare; 8 căi deschise.
  assert.deepEqual([p.exterioare, p.interioare, p.deschise], [8, 1, 8]);
  assert.deepEqual([p.straturi, p.illustrator], [[], false]);
  assert.equal(p.avertismente['sarit-text'], 1);
  assert.equal(p.pregatit.nume, 'forme');
  // Originea PostScript e originea foii: colțul desenului, (10, 10) mm, e unde stă instanța.
  const { x, y } = p.pregatit.piesa('p1', {});
  assert.ok(aproape(x, 10) && aproape(y, 10), `${x}, ${y}`);
});

test('un .ai PostScript (Illustrator 8) merge la ușa EPS, cu straturile ca nume; un .ai PDF rămâne la ușa PDF', async () => {
  const p = await previzualizare({ nume: 'Sigla.ai', octeti: fixtura('ai8.ai') }, O);
  assert.ok(p.ok && p.format === 'eps');
  assert.deepEqual([p.straturi, p.illustrator, p.avertismente.ascunse], [['TAIERE', 'GRAVARE'], true, 1]);
  assert.equal(p.pregatit.nume, 'Sigla');
  const rad = p.pregatit.piesa('p1', {}).piesa.radacina;
  assert.ok(rad.tip === 'grup');
  const nume = rad.copii.map((e) => (e.tip === 'element' ? e.nume : e.tip));
  assert.deepEqual([nume.filter((x) => x === 'TAIERE').length, nume.filter((x) => x === 'GRAVARE').length], [9, 5]);
  const pdf = await previzualizare({ nume: 'logo.ai', octeti: pagini(['0 0 72 72 re f']) }, O);
  assert.ok(pdf.ok && pdf.format === 'pdf');
});

test('un fișier fără extensie cunoscută, dar cu antet PostScript sau PDF, își primește ușa după antet', async () => {
  const ps = await previzualizare({ nume: 'desen.ps', octeti: fixtura('binar.eps') }, O);
  assert.ok(ps.ok && ps.format === 'eps');
  assert.deepEqual([ps.exterioare, ps.deschise], [1, 1]);
  const pdf = await previzualizare({ nume: 'fara-extensie', octeti: pagini(['0 0 m 72 0 l S']) }, O);
  assert.ok(pdf.ok && pdf.format === 'pdf');
  assert.deepEqual(await previzualizare({ nume: 'nota.txt', octeti: B('doar text') }, O), { ok: false, cod: 'tip' });
});

test('refuzurile EPS poartă formatul și motivul: bucla (cu operatorul), golul (cu textul numărat), nu e PostScript, Illustrator nou', async () => {
  const bucla = await previzualizare({ nume: 'bucla.eps', octeti: fixtura('bucla.eps') }, O);
  assert.ok(!bucla.ok && bucla.format === 'eps');
  assert.deepEqual([bucla.cod, bucla.detaliu], ['control', 'for']);
  const text = await previzualizare({ nume: 'text.eps', octeti: fixtura('text.eps') }, O);
  assert.ok(!text.ok && text.cod === 'gol' && text.format === 'eps');
  assert.equal(text.avertismente && 'sarit-text' in text.avertismente ? text.avertismente['sarit-text'] : -1, 1);
  assert.deepEqual(await previzualizare({ nume: 'stricat.eps', octeti: B('nu e PostScript') }, O), { ok: false, cod: 'nu-e-ps', format: 'eps' });
  const cs = await previzualizare({ nume: 'stoc.eps', octeti: B('%!PS-Adobe-3.1 EPSF-3.0\n%%Creator: Adobe Illustrator(R) 16.0\n%%EndComments\n') }, O);
  assert.ok(!cs.ok && cs.cod === 'ai-nou' && cs.format === 'eps');
});

test('acțiunea importului citește un EPS (ușa încărcată la cerere)', async () => {
  const r = creeazaRegistru(ACTIUNI_IMPORT, () => true);
  const p = await new Promise<PrevizualizareImport>((rez) => {
    ruleaza(r, 'import.svg', {
      fisier: () => ({ nume: 'cairo.eps', octeti: fixtura('cairo.eps') }),
      pxPeTol: () => 96,
      limba: () => 'ro',
      doarCitire: () => false,
      rezultat: rez,
    });
  });
  assert.ok(p.ok && p.format === 'eps');
  assert.deepEqual([p.exterioare, p.interioare, p.deschise], [3, 1, 1]);
});
