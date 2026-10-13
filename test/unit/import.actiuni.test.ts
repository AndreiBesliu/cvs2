import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Varf } from '../../src/geom/contur.ts';
import { traduce } from '../../src/i18n/t.ts';
import { pregateste, type ImportPregatit } from '../../src/io/piesa.ts';
import { documentNou } from '../../src/model/document.ts';
import { istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import { ACTIUNI_IMPORT, type PrevizualizareImport } from '../../src/ui/actiuniImport.ts';
import { octeti, pagina } from './ajutor-svg.ts';

const registru = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);

function context(importNou?: ImportPregatit, doarCitire = false): ContextDocument & { h: () => Istoric; sel: () => readonly string[] } {
  let h = istoricNou(documentNou({ latime: 300, inaltime: 200, grosime: 18 }));
  let sel: readonly string[] = [];
  return {
    istoric: () => h,
    scrie: (nou) => { h = nou; },
    selectie: () => sel,
    selecteaza: (ids) => { sel = ids; },
    doarCitire: () => doarCitire,
    ...(importNou ? { importNou: () => importNou } : {}),
    h: () => h,
    sel: () => sel,
  };
}

const patrat = (x: number, y: number, l: number): Varf[] => [
  { p: { x, y }, s: { tip: 'L' } }, { p: { x: x + l, y }, s: { tip: 'L' } },
  { p: { x: x + l, y: y + l }, s: { tip: 'L' } }, { p: { x, y: y + l }, s: { tip: 'L' } },
];
const LOGO: ImportPregatit = pregateste({
  nume: 'logo',
  cai: [{ varfuri: patrat(20, 30, 80), nume: 'contur' }, { varfuri: patrat(40, 50, 20) }],
  laturi: ['exterior', 'interior'],
  pagina: { latime: 200, inaltime: 150 },
});

test('importul adaugă o piesă și o instanță într-un singur pas, o selectează, iar Ctrl+Z o scoate', () => {
  const ctx = context(LOGO);
  assert.deepEqual(stare(registru, 'document.importa', ctx), { ok: true });
  ruleaza(registru, 'document.importa', ctx);
  const h = ctx.h();
  assert.equal(h.trecut.length, 1);
  const [i] = h.doc.foi[0]?.instante ?? [];
  assert.ok(i);
  assert.deepEqual([i.x, i.y, i.rotire], [20, 30, 0]);
  assert.deepEqual(ctx.sel(), [i.id]);
  const lume = elementeFoaie(h.doc, 0);
  assert.equal(lume.length, 2);
  // Pe foaie, desenul stă unde era pe pagină.
  const c1 = lume[0];
  assert.ok(c1?.forma.tip === 'cale');
  assert.deepEqual(c1.forma.varfuri.map((v) => [v.p.x + c1.matrice.e, v.p.y + c1.matrice.f]), [[20, 30], [100, 30], [100, 110], [20, 110]]);
  ruleaza(registru, 'istoric.anuleaza', ctx);
  assert.equal(ctx.h().doc.piese.length, 0);
});

test('importul e oprit în fila care doar citește, peste plafoane și când documentul n-ar trece de ușă', () => {
  assert.deepEqual(stare(registru, 'document.importa', context(LOGO, true)), { ok: false, motiv: 'motiv.doar-citire' });
  assert.deepEqual(stare(registru, 'document.importa', context()), { ok: false, motiv: 'motiv.nimic-ales' });
  // 5 căi de 45 000 de vârfuri: 225 000, peste plafonul pieselor (200 000).
  const mare = (k: number): Varf[] => Array.from({ length: 45_000 }, (_, j) => ({ p: { x: k * 10 + Math.cos(j) , y: Math.sin(j) + j * 1e-3 }, s: { tip: 'L' } }));
  const prea: ImportPregatit = pregateste({ nume: 'mare', cai: [0, 1, 2, 3, 4].map((k) => ({ varfuri: mare(k) })), laturi: ['exterior', 'exterior', 'exterior', 'exterior', 'exterior'], pagina: null });
  assert.deepEqual(stare(registru, 'document.importa', context(prea)), { ok: false, motiv: 'motiv.plafon' });
  // Două pătrate la 1,98·10⁷ mm unul de altul: coordonatele din piesă ar trece de 10⁷ mm, deci ușa documentului refuză.
  const departe: ImportPregatit = pregateste({ nume: 'departe', cai: [{ varfuri: patrat(-9.9e6, 0, 1) }, { varfuri: patrat(9.9e6, 0, 1) }], laturi: ['exterior', 'exterior'], pagina: null });
  const ctx = context(departe);
  assert.deepEqual(stare(registru, 'document.importa', ctx), { ok: false, motiv: 'motiv.import-refuzat' });
  ruleaza(registru, 'document.importa', ctx);
  assert.equal(ctx.h().doc.piese.length, 0);
});

test('acțiunea de citire: oprită în fila care doar citește; întoarce previzualizarea (ușa încărcată la cerere)', async () => {
  const r = creeazaRegistru(ACTIUNI_IMPORT, () => true);
  const citire = (doarCitire: boolean, rezultat: (p: PrevizualizareImport) => void) => ({
    fisier: () => ({ nume: 'logo.svg', octeti: octeti(pagina('<rect x="10" y="10" width="30" height="20"/>')) }),
    pxPeTol: () => 96 as const,
    limba: () => 'ro',
    doarCitire: () => doarCitire,
    rezultat,
  });
  assert.deepEqual(stare(r, 'import.svg', citire(true, () => undefined)), { ok: false, motiv: 'motiv.doar-citire' });
  // În Node nu există DOMParser: previzualizarea de aici e refuzul de parsare, prins (nu o excepție).
  const p = await new Promise<PrevizualizareImport>((rez) => { ruleaza(r, 'import.svg', citire(false, rez)); });
  assert.ok(!p.ok && p.cod === 'parsare');
});

test('mesajele importului vin cu dialogul: înainte de încărcare lipsesc (eroare clară), după, în ambele limbi', async () => {
  assert.throws(() => traduce('ro', 'import.titlu', { nume: 'x' }), /nu e încărcat/);
  await import('../../src/i18n/import.ts');
  assert.equal(traduce('ro', 'import.titlu', { nume: 'logo' }), 'Importă SVG: logo');
  // Din 2.3c-3, `deschise` numără căile deschise IMPORTATE (ADR 0037 §11).
  assert.equal(traduce('en', 'import.av.deschise', { n: 2 }), '2 open paths (no closing Z, not filled) imported as lines, to cut on the line');
  assert.equal(traduce('ro', 'import.av.deschise', { n: 20 }), '20 de căi deschise (fără Z de închidere, neumplute) importate ca linii, de tăiat pe linie');
});

test('previzualizarea: mărimea e a desenului (cutia lui exactă), nu a paginii; laturile numărate (otrava „lățimea paginii”, 2.7c)', async () => {
  // În Node nu există DOMParser: îl dă xmldom, cu erorile aruncate, cum îl folosește ușa în browser.
  const { DOMParser } = await import('@xmldom/xmldom');
  const g = globalThis as { DOMParser?: unknown };
  const vechi = g.DOMParser;
  g.DOMParser = class {
    parseFromString(t: string, tip: string) {
      return new DOMParser({ onError: (n: string, m: string) => { if (n !== 'warning') throw new Error(m); } }).parseFromString(t, tip);
    }
  };
  try {
    const { previzualizareSvg } = await import('../../src/ui/actiuniImportCalcul.ts');
    const p = previzualizareSvg({ nume: 'mic.svg', octeti: octeti(pagina('<rect x="10" y="10" width="30" height="20"/><circle cx="25" cy="20" r="4"/>')) }, 96, 'ro');
    assert.ok(p.ok);
    assert.deepEqual([p.latime, p.inaltime, p.exterioare, p.interioare], [30, 20, 1, 1]);
    assert.equal(p.pregatit.nume, 'mic');
  } finally {
    g.DOMParser = vechi;
  }
});
