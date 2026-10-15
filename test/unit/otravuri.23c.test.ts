/**
 * Găurile găsite de otrăvurile feliei 2.3c (segmentul 2a, sesiune independentă: 70 de otrăvuri, 50 prinse, 20 scăpate).
 * Câte un test pentru fiecare otravă scăpată care era o gaură reală, pe cazul cel mai simplu care o separă: pe codul
 * curat trece, cu otrava lui aplicată pică (verificat cu harnașul otrăvurilor, în clonă). Id-urile sunt ale listei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programDinDocument } from '../../src/cam/job.ts';
import { arc, LINIE, type Contur } from '../../src/geom/contur.ts';
import { offsetDeschis, verificaIesireDeschisa } from '../../src/geom/offset.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import type { Document, FormaDoc, Operatie, VarfDoc } from '../../src/model/document.ts';
import { taieturiFoaie } from '../../src/model/lume.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';

const F = { latime: 300, inaltime: 200, grosime: 18 };
const L = { tip: 'L' } as const;
const linii = (...p: ReadonlyArray<readonly [number, number]>): Contur => ({ inchis: false, varfuri: p.map(([x, y]) => ({ p: { x, y }, s: LINIE })) });
const deschisa = (...p: ReadonlyArray<readonly [number, number]>): FormaDoc => ({ tip: 'cale', inchis: false, varfuri: p.map(([x, y]): VarfDoc => ({ p: { x, y }, s: L })) });
const element = (id: string, forma: FormaDoc, x: number, y: number) => ({ id, forma, matrice: { ...ID, e: x, f: y } });
const op = (d: Document, id: string, v: Partial<Omit<Operatie, 'id' | 'tip'>>): Document => cuOperatie(d, id, { adancime: 3, pas: 3, ...v });

function program(d: Document): { miscari: Miscare[]; avertismente: readonly string[] } {
  const j = programDinDocument(d);
  assert.ok(j.ok, j.ok ? '' : j.motiv);
  return j.ok ? { miscari: [...j.program.miscari], avertismente: j.avertismente } : { miscari: [], avertismente: [] };
}
function refuz(d: Document): string {
  const j = programDinDocument(d);
  assert.equal(j.ok, false, 'trebuia refuzat');
  return j.ok ? '' : j.motiv;
}
function aleLui(m: readonly Miscare[], idLume: string): Miscare[] {
  const i = m.findIndex((x) => x.tip === 'eticheta' && x.element === idLume);
  assert.ok(i >= 0, `fără eticheta lui ${idLume}`);
  const j = m.findIndex((x, k) => k > i && x.tip === 'eticheta');
  return m.slice(i + 1, j < 0 ? undefined : j);
}
const problema = (c: Contur, d: number, b: Contur[]): string => verificaIesireDeschisa(c, d, b).problema ?? '(nimic)';

test('O11: dus-întorsul la 2R + 4e-4 (abaterea 2e-4, peste banda de 5e-5) e o atingere, nu canelura cât freza', () => {
  const U = linii([0, 50], [0, 0], [6.0004, 0], [6.0004, 50]);
  assert.match(problema(U, 3, [linii([3.0002, 50], [3.0002, 3], [3.0002, 50])]), /se atinge singură/);
});

test('O15: o bucată în plus la 3,01 mm de cale (abaterea 0,01, peste 0,002) e refuzată pe distanță', () => {
  const l = linii([10, 50], [110, 50]);
  assert.match(problema(l, 3, [linii([10, 53], [110, 53]), linii([30, 53.01], [31, 53.01])]), /la 3\.0100 mm de cale/);
});

test('O19: traseul care ocolește capătul FINAL (arcul la R dincolo de normala lui) e refuzat', () => {
  const l = linii([10, 50], [110, 50]);
  const ocol: Contur = {
    inchis: false,
    varfuri: [{ p: { x: 10, y: 53 }, s: LINIE }, { p: { x: 110, y: 53 }, s: arc(-Math.tan(Math.PI / 16)) }, { p: { x: 110 + 3 / Math.SQRT2, y: 50 + 3 / Math.SQRT2 }, s: LINIE }],
  };
  assert.match(problema(l, 3, [ocol]), /partea greșită/);
});

test('O36: pe un arc cu R = |d| dinspre convex, idealul are 2R: pasul de 0,05 mm se ia pe el și prinde un gol de 0,08 mm', () => {
  // Semicercul R3 în sens trigonometric, scula în dreapta (afară): idealul e semicercul R6, de 6π. Golul, centrat în vârf
  // (t = ½), cade între eșantioane la un pas de π / 189 (lungimea luată pe arc, 3π), nu și la pasul de π / 377 (pe ideal).
  const cale: Contur = { inchis: false, varfuri: [{ p: { x: 3, y: 0 }, s: arc(1) }, { p: { x: -3, y: 0 }, s: LINIE }] };
  const delta = 0.04 / 6;
  const pe6 = (u: number) => ({ x: 6 * Math.cos(u), y: 6 * Math.sin(u) });
  const sfert = arc(Math.tan((Math.PI / 2 - delta) / 4));
  const bucati: Contur[] = [
    { inchis: false, varfuri: [{ p: pe6(0), s: sfert }, { p: pe6(Math.PI / 2 - delta), s: LINIE }] },
    { inchis: false, varfuri: [{ p: pe6(Math.PI / 2 + delta), s: sfert }, { p: pe6(Math.PI), s: LINIE }] },
  ];
  assert.match(problema(cale, -3, bucati), /^offsetul a eșuat lângă/);
  // Controlul: fără gol, aceeași geometrie trece.
  assert.equal(problema(cale, -3, [{ inchis: false, varfuri: [{ p: pe6(0), s: arc(1) }, { p: pe6(Math.PI), s: LINIE }] }]), '(nimic)');
});

test('L02: un nod ÎNCHIS dintr-o operație marcată despărțire rămâne în clasa laturii lui (interiorul înaintea exteriorului)', () => {
  const drept = (id: string, x: number) => ({ id, forma: { tip: 'dreptunghi', latime: 40, inaltime: 40, razaColt: 0 } as const, matrice: { ...ID, e: x, f: 50 } });
  const d = cuOperatie(op(docDin(F, drept('a', 50), drept('b', 150)), 'a', { latura: 'interior', despartire: true }), 'b', { latura: 'exterior', adancime: 3, pas: 3 });
  assert.deepEqual(taieturiFoaie(d).map((t) => t.idLume), ['a/a', 'b/b']);
});

test('O32: pieptenele cu golurile la 2R − 1e-4 trece doar prin reîncercarea la |d| + 1e-4 (prima încercare a lui cavalier e refuzată)', () => {
  // Găsit prin căutare (18 din 736 de cazuri diferă fără reîncercare): la d = 3, prima dă un punct pe partea greșită.
  for (const [w, d] of [[5.9999, 3], [6.00001, -3]] as const) {
    const p: Array<[number, number]> = [];
    for (let k = 0; k < 5; k++) p.push([k * 2 * w, 50], [k * 2 * w, 0], [k * 2 * w + w, 0], [k * 2 * w + w, 50]);
    const r = offsetDeschis(linii(...p), d);
    assert.ok(r.ok, `w = ${w}, d = ${d}: ${r.ok ? '' : r.motiv}`);
  }
});

test('O43: un cocoloș de 0,04 mm spre perete (săgeata 0,01), între două eșantioane ale acoperirii, e prins pe mijlocul arcului', () => {
  // Toate vârfurile bucății stau la exact 3 mm; acoperirea (pasul 0,05 mm, la x = 60,00 și 60,05) nu cade în cocoloș.
  const l = linii([10, 50], [110, 50]);
  const bucata: Contur = {
    inchis: false,
    varfuri: [{ p: { x: 10, y: 53 }, s: LINIE }, { p: { x: 60.005, y: 53 }, s: arc(0.5) }, { p: { x: 60.045, y: 53 }, s: LINIE }, { p: { x: 110, y: 53 }, s: LINIE }],
  };
  assert.match(problema(l, 3, [bucata]), /la 2\.9900 mm de cale/);
});

test('O37: L-ul pe dreapta fără arcul colțului convex (două bucăți, evantaiul lipsă) e refuzat pe acoperire', () => {
  const L = linii([0, 0], [100, 0], [100, 100]);
  assert.match(problema(L, -3, [linii([0, -3], [100, -3]), linii([103, 0], [103, 100])]), /^offsetul a eșuat lângă/);
});

test('P02: o instanță rotită cu 90° nu e o oglindire: stânga rămâne stânga (linia spre +y, scula la −x)', () => {
  const d0 = op(docDin(F, element('l', deschisa([0, 0], [100, 0]), 150, 50)), 'l', { latura: 'stanga' });
  const d: Document = { ...d0, foi: d0.foi.map((f) => ({ ...f, instante: f.instante.map((i) => ({ ...i, rotire: 90 })) })) };
  const m = aleLui(program(d).miscari, 'l/l');
  const start = m[1];
  assert.ok(start && 'la' in start);
  if (start && 'la' in start) assert.ok(Math.abs((start.la.X ?? NaN) - 147) < 1e-9, JSON.stringify(start));
});

test('F03: la inversare (stânga + opoziție), și ORDINEA bucăților se întoarce: prima tăiată e bucla camerei din dreapta', () => {
  const canal = deschisa([0, 0], [100, 0], [100, 10], [52, 10], [52, 4], [48, 4], [48, 10], [0, 10]);
  const m = aleLui(program(op(docDin(F, element('c', canal, 100, 100)), 'c', { latura: 'stanga', sens: 'opozitie' })).miscari, 'c/c');
  const g0 = m.find((x) => x.tip === 'rapida' && 'la' in x && x.la.X !== undefined);
  assert.ok(g0 && 'la' in g0 && (g0.la.X ?? 0) > 150, JSON.stringify(g0));
});

test('R04: o linie pe o parte în mijlocul unei piese, departe de marginile ei, e refuzată („stă în piesa”)', () => {
  const d = cuOperatie(op(docDin(F, { id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 100, razaColt: 0 }, matrice: { ...ID, e: 100, f: 50 } },
    element('l', deschisa([0, 0], [60, 0]), 120, 100)), 'l', { latura: 'stanga' }), 'r', { latura: 'exterior', adancime: 3, pas: 3 });
  assert.match(refuz(d), /^regiunea păstrată: tăietura lui l\/l stă în piesa r\/r/);
});

test('R06: discul care vine la R − 0,007 de un perete (sub R − ε, peste R − 2ε) e refuzat', () => {
  const d = op(op(docDin(F, element('a', deschisa([0, 0], [200, 0]), 50, 100), element('b', deschisa([0, 0], [200, 0]), 50, 105.993)), 'a', { latura: 'dreapta' }), 'b', { latura: 'dreapta' });
  assert.match(refuz(d), /^regiunea păstrată: tăietura lui b\/b atinge peretele lui a\/a/);
});

test('J04: colțul concav de 60° dinspre sculă lasă 10,392 mm neatinși (peste D, sub 2D): avertismentul apare', () => {
  const c = Math.cos((2 * Math.PI) / 3), s = Math.sin((2 * Math.PI) / 3);
  const r = program(op(docDin(F, element('v', deschisa([0, 0], [100, 0], [100 + 100 * c, 100 * s]), 50, 50)), 'v', { latura: 'stanga' }));
  assert.ok(r.avertismente.some((a) => /^v\/v: freza nu ajunge la o porțiune a peretelui, de 10\.39\d mm/.test(a)), JSON.stringify(r.avertismente));
});

test('J07 / D18: o tăietură pe o parte prin foaie, la 5 mm de margine cu scula spre ea, ajunge la margine (drumul centrului)', () => {
  const d = op(docDin(F, element('m', deschisa([0, 0], [200, 0]), 50, 5)), 'm', { latura: 'dreapta', adancime: 18, pas: 6 });
  assert.match(refuz(d), /^m\/m: tăietura deschisă prin foaie ajunge la marginea foii/);
});

test('D21: „lasoul” desenat invers (startul la 2 mm de restul căii) dă și el avertismentul bucății libere', () => {
  const lasou = deschisa([100, 102], [100, 150], [150, 150], [150, 100], [100, 100], [20, 100]);
  const r = program(op(docDin(F, element('l', lasou, 0, 0)), 'l', { latura: 'pe-linie', adancime: 18, pas: 6 }));
  assert.ok(r.avertismente.some((a) => /^l\/l: bucata închisă de tăietură iese liberă, fără urechi \(un capăt la 2\.000 mm de restul căii\)$/.test(a)), JSON.stringify(r.avertismente));
});

test('T01: pe linie, un arc plat (bulge 5e-7) cu coarda de 50 mm se scrie linie în IR, nu arc', () => {
  const forma: FormaDoc = { tip: 'cale', inchis: false, varfuri: [{ p: { x: 10, y: 10 }, s: { tip: 'A', bulge: 5e-7 } }, { p: { x: 60, y: 10 }, s: L }, { p: { x: 60, y: 60 }, s: L }] };
  const m = aleLui(program(op(docDin(F, element('t', forma, 0, 0)), 't', { latura: 'pe-linie' })).miscari, 't/t');
  assert.equal(m.filter((x) => x.tip === 'arc').length, 0);
});

test('T02: pe linie, un arc care nu e plat (bulge 0,5) mai scurt de 1e-6 mm se scrie linie în IR, nu arc', () => {
  const forma: FormaDoc = { tip: 'cale', inchis: false, varfuri: [{ p: { x: 10, y: 10 }, s: { tip: 'A', bulge: 0.5 } }, { p: { x: 10 + 5e-7, y: 10 }, s: L }, { p: { x: 60, y: 10 }, s: L }] };
  const m = aleLui(program(op(docDin(F, element('t', forma, 0, 0)), 't', { latura: 'pe-linie' })).miscari, 't/t');
  assert.equal(m.filter((x) => x.tip === 'arc').length, 0);
});
