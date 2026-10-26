/**
 * Exportul 2D (ADR 0088): straturile după rol, bucățile unui contur (polilinia cu bulge, curba în lanț, pornirea de la o
 * schimbare de fel), vectorii corpusului (`scripts/export2d-corpus.ts`), numerele fără exponent, arcele SVG pe hârtie
 * (raza, steagurile după întoarcerea axei Y) și structura DXF-ului (handle-urile unice, proprietarii, $HANDSEED, nodurile
 * curbelor). Recitirea independentă: ezdxf (`test/oracles-py/export2d.py`) și motorul SVG din Edge (`test/e2e/vectori.spec.ts`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arc, conturDreptunghi, LINIE, type Contur } from '../../src/geom/conturBaza.ts';
import { bucatiContur, stratOperatiei, vectoriFoaie, type Entitate } from '../../src/io/vectori.ts';
import { nr, scrieSvg } from '../../src/io/svgExport.ts';
import { nrDxf, scrieDxf } from '../../src/io/dxfExport.ts';
import { exportaVectori } from '../../src/io/exportVectori.ts';
import { incarca } from '../../src/model/incarcare.ts';
import type { Operatie } from '../../src/model/document.ts';
import { CORPUS } from '../../scripts/export2d-corpus.ts';

const corpus = () => {
  const r = incarca(structuredClone(CORPUS));
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};
const op = (x: Partial<Operatie>): Operatie => ({
  id: 'o', tip: 'profil', noduri: ['e'], scula: { numar: 1, diametru: 6 }, latura: 'exterior', sens: 'urcare', adancime: 3, pas: 3,
  urechi: null, rampa: null, intrari: null, colturi: null, ...x,
}) as Operatie;

test('stratul e rolul primei operații: exterior, interior, pe linie, pe o parte, buzunar, găurire, fără operație', () => {
  assert.equal(stratOperatiei(op({})), 'EXTERIOR');
  assert.equal(stratOperatiei(op({ latura: 'interior' })), 'INTERIOR');
  assert.equal(stratOperatiei(op({ latura: 'pe-linie' })), 'PE_LINIE');
  assert.equal(stratOperatiei(op({ latura: 'stanga' })), 'PE_O_PARTE');
  assert.equal(stratOperatiei(op({ latura: 'dreapta' })), 'PE_O_PARTE');
  assert.equal(stratOperatiei(op({ tip: 'buzunar', latura: 'interior' })), 'BUZUNAR');
  assert.equal(stratOperatiei(op({ tip: 'gaurire', latura: 'interior' })), 'GAURIRE');
  assert.equal(stratOperatiei(undefined), 'FARA_OPERATIE');
});

test('bucățile conturului: liniile și arcele închise = o polilinie închisă cu bulge; cubicele = o curbă în lanț; amestecul pornește de la o schimbare de fel', () => {
  // Dreptunghiul 20 × 10 cu colțurile R2: 8 vârfuri, 4 arce de 90° (bulge tan 22,5°), închis.
  const d = bucatiContur(conturDreptunghi(0, 0, 20, 10, 2), 'EXTERIOR', 'x');
  assert.equal(d.length, 1);
  const p = d[0]!;
  assert.ok(p.fel === 'polilinie' && p.inchis && p.varfuri.length === 8);
  if (p.fel === 'polilinie') assert.deepEqual(p.varfuri.filter((v) => v.bulge !== 0).map((v) => v.bulge), Array(4).fill(Math.tan(Math.PI / 8)));
  // Două cubice închise: o curbă cu 7 puncte, primul = ultimul.
  const c: Contur = { inchis: true, varfuri: [
    { p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 1, y: 1 }, c2: { x: 2, y: 1 } } },
    { p: { x: 3, y: 0 }, s: { tip: 'C', c1: { x: 2, y: -1 }, c2: { x: 1, y: -1 } } },
  ] };
  const s = bucatiContur(c, 'BUZUNAR', 'x');
  assert.deepEqual(s, [{ fel: 'spline', strat: 'BUZUNAR', element: 'x', puncte: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 0 }, { x: 2, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 0 }] }]);
  // Amestec închis: L, C, L, A → pornește de la cubică (prima schimbare de fel), apoi polilinia deschisă L, A, L.
  const m: Contur = { inchis: true, varfuri: [
    { p: { x: 0, y: 0 }, s: LINIE },
    { p: { x: 6, y: 0 }, s: { tip: 'C', c1: { x: 9, y: 0 }, c2: { x: 9, y: 5 } } },
    { p: { x: 6, y: 5 }, s: LINIE },
    { p: { x: 0, y: 5 }, s: arc(-0.5) },
  ] };
  assert.deepEqual(bucatiContur(m, 'EXTERIOR', 'x'), [
    { fel: 'spline', strat: 'EXTERIOR', element: 'x', puncte: [{ x: 6, y: 0 }, { x: 9, y: 0 }, { x: 9, y: 5 }, { x: 6, y: 5 }] },
    { fel: 'polilinie', strat: 'EXTERIOR', element: 'x', inchis: false, varfuri: [{ x: 6, y: 5, bulge: 0 }, { x: 0, y: 5, bulge: -0.5 }, { x: 0, y: 0, bulge: 0 }, { x: 6, y: 0, bulge: 0 }] },
  ]);
  // Deschis: cubica, apoi linia și arcul; ultimul vârf are bulge 0 (segmentul lui nu există).
  const o: Contur = { inchis: false, varfuri: [
    { p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 1, y: 2 }, c2: { x: 2, y: -2 } } },
    { p: { x: 3, y: 0 }, s: LINIE },
    { p: { x: 4, y: 0 }, s: arc(1) },
    { p: { x: 6, y: 0 }, s: LINIE },
  ] };
  assert.deepEqual(bucatiContur(o, 'PE_LINIE', 'x').map((e) => e.fel), ['spline', 'polilinie']);
  const ultima = bucatiContur(o, 'PE_LINIE', 'x')[1]!;
  assert.ok(ultima.fel === 'polilinie' && !ultima.inchis);
  if (ultima.fel === 'polilinie') assert.deepEqual(ultima.varfuri, [{ x: 3, y: 0, bulge: 0 }, { x: 4, y: 0, bulge: 1 }, { x: 6, y: 0, bulge: 0 }]);
  // Un contur deschis numai din linii: o singură polilinie deschisă; unul fără segmente: nimic.
  assert.deepEqual(bucatiContur({ inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: arc(0.5) }, { p: { x: 1, y: 0 }, s: LINIE }, { p: { x: 1, y: 1 }, s: LINIE }] }, 'PE_LINIE', 'x'), [
    { fel: 'polilinie', strat: 'PE_LINIE', element: 'x', inchis: false, varfuri: [{ x: 0, y: 0, bulge: 0.5 }, { x: 1, y: 0, bulge: 0 }, { x: 1, y: 1, bulge: 0 }] },
  ], 'deschisă rămâne deschisă: fără segmentul de închidere');
  assert.deepEqual(bucatiContur({ inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: LINIE }] }, 'PE_LINIE', 'x'), []);
});

test('vectorii corpusului: cercurile cu centrul și raza din matricea lumii (oglindită, rotită 90°, scalată), câte entități pe strat, foaia la cerere', () => {
  const v = vectoriFoaie(corpus(), 0, true);
  assert.deepEqual([v.latime, v.inaltime], [600, 400]);
  const cercuri = v.entitati.filter((e): e is Extract<Entitate, { fel: 'cerc' }> => e.fel === 'cerc')
    // Raza sub scara 2,5 rotită iese 25 la 1e-15 (hypot pe √½): comparată la 1e-9.
    .map((e) => [e.strat, e.centru.x, e.centru.y, Math.round(e.raza * 1e9) / 1e9]);
  assert.deepEqual(cercuri.sort((a, b) => Number(a[3]) - Number(b[3])), [['FARA_OPERATIE', 10, 10, 0.01], ['GAURIRE', 540, 380, 3], ['EXTERIOR', 580, 30, 5], ['INTERIOR', 300, 330, 25], ['INTERIOR', 400, 250, 50]]);
  const numar = (strat: string, fel: string) => v.entitati.filter((e) => e.strat === strat && e.fel === fel).length;
  assert.deepEqual([numar('EXTERIOR', 'polilinie'), numar('EXTERIOR', 'spline'), numar('PE_LINIE', 'spline'), numar('PE_LINIE', 'polilinie'), numar('BUZUNAR', 'spline'), numar('FOAIE', 'polilinie')], [2, 1, 1, 1, 1, 1]);
  assert.equal(v.entitati.length, 13);
  assert.equal(vectoriFoaie(corpus(), 0, false).entitati.length, 12, 'fără conturul foii');
  assert.throws(() => vectoriFoaie(corpus(), 1, false), /foaia 1 nu există/);
});

test('numerele: în DXF exacte (textul cel mai scurt care se citește înapoi la fel), fără exponent; în SVG cu 6 zecimale, fără „-0”', () => {
  assert.equal(nrDxf(0), '0');
  assert.equal(nrDxf(-0), '0');
  assert.equal(nrDxf(1e-7), '0.0000001');
  assert.equal(nrDxf(-2.5e-8), '-0.000000025');
  assert.equal(nrDxf(0.1 + 0.2), '0.30000000000000004');
  assert.equal(Number(nrDxf(Math.tan(Math.PI / 8))), Math.tan(Math.PI / 8));
  assert.throws(() => nrDxf(Number.NaN), /nefinit/);
  assert.equal(nr(1 / 3), '0.333333');
  assert.equal(nr(-0.0000001), '0');
  assert.equal(nr(120), '120');
});

test('SVG pe hârtie: mm, Y întors, cercul `<circle>`, arcul cu raza lui și steagurile (bulge > 0 → sweep 0; peste 180° → large 1)', () => {
  const v = { latime: 100, inaltime: 50, entitati: [
    { fel: 'cerc', strat: 'INTERIOR', element: 'c', centru: { x: 30, y: 10 }, raza: 5 },
    // Semicercul (0, 20) → (10, 20), bulge 1: R5. Arcul cu bulge −0,5 (106,26°): coarda 10, R = 5 / sin(53,13°) = 6,25.
    // Arcul cu bulge 2 (253,74°): R = 5 / sin(126,87°) = 6,25, mare.
    { fel: 'polilinie', strat: 'PE_LINIE', element: 'p', inchis: false, varfuri: [{ x: 0, y: 20, bulge: 1 }, { x: 10, y: 20, bulge: -0.5 }, { x: 20, y: 20, bulge: 2 }, { x: 30, y: 20, bulge: 0 }] },
  ] } as const;
  const svg = scrieSvg(v);
  assert.match(svg, /width="100mm" height="50mm" viewBox="0 0 100 50"/);
  assert.match(svg, /<circle cx="30" cy="40" r="5"\/>/);
  assert.match(svg, /<path d="M0 30A5 5 0 0 0 10 30A6\.25 6\.25 0 0 1 20 30A6\.25 6\.25 0 1 0 30 30"\/>/);
  assert.match(svg, /<g id="INTERIOR" inkscape:groupmode="layer" inkscape:label="INTERIOR"[^>]*stroke="#1f77b4"/);
  assert.doesNotMatch(svg, /id="EXTERIOR"/, 'doar straturile folosite');
  // O polilinie închisă scrie și segmentul de la ultimul vârf la primul (aici un arc), apoi Z.
  const inchisa = scrieSvg({ latime: 10, inaltime: 10, entitati: [{ fel: 'polilinie', strat: 'FOAIE', element: 'f', inchis: true, varfuri: [{ x: 0, y: 0, bulge: 0 }, { x: 4, y: 0, bulge: 1 }] }] });
  assert.match(inchisa, /d="M0 10L4 10A2 2 0 0 0 0 10Z"/);
});

test('DXF R2007: secțiunile în ordine, handle-urile unice, fiecare proprietar (330) existent, $HANDSEED peste toate, nodurile curbei = punctele + 4', () => {
  const text = scrieDxf(vectoriFoaie(corpus(), 0, true));
  const linii = text.trimEnd().split('\n');
  assert.equal(linii.length % 2, 0, 'perechi cod / valoare');
  const perechi: Array<[number, string]> = [];
  for (let i = 0; i < linii.length; i += 2) perechi.push([Number(linii[i]), linii[i + 1]!]);
  const sectiuni = perechi.flatMap(([c, x], i) => (c === 0 && x === 'SECTION' ? [perechi[i + 1]![1]] : []));
  assert.deepEqual(sectiuni, ['HEADER', 'CLASSES', 'TABLES', 'BLOCKS', 'ENTITIES', 'OBJECTS']);
  assert.deepEqual(perechi.at(-1), [0, 'EOF']);
  const handles = perechi.filter(([c], i) => (c === 5 || c === 105) && perechi[i - 1]?.[0] !== 9 && !(c === 5 && perechi[i - 1]?.[1] === '$HANDSEED')).map(([, x]) => x);
  assert.equal(new Set(handles).size, handles.length, 'handle-uri unice');
  const existente = new Set(handles);
  for (const [c, x] of perechi) if (c === 330 && x !== '0') assert.ok(existente.has(x), `proprietarul ${x}`);
  for (const [c, x] of perechi) if (c === 340 || c === 350) assert.ok(existente.has(x), `legătura ${x}`);
  const seed = perechi.findIndex(([c, x]) => c === 9 && x === '$HANDSEED');
  const max = Math.max(...handles.map((h) => Number.parseInt(h, 16)));
  assert.ok(Number.parseInt(perechi[seed + 1]![1], 16) > max, '$HANDSEED');
  assert.ok(text.includes('\n$INSUNITS\n70\n4\n') && text.includes('\n$ACADVER\n1\nAC1021\n'));
  // DIMSTYLE își ține handle-ul pe codul 105 (nu 5: AutoCAD îl cere așa; ezdxf îl iartă).
  const dim = perechi.findIndex(([c, x], i) => c === 0 && x === 'DIMSTYLE' && perechi[i - 1]?.[0] !== 2);
  assert.equal(perechi[dim + 1]![0], 105);
  // ACAD_LAYOUT are cele două layout-uri, fiecare un obiect LAYOUT (ezdxf nu verifică asta).
  const hDict = perechi[perechi.findIndex(([c, x]) => c === 3 && x === 'ACAD_LAYOUT') + 1]![1];
  const iDict = perechi.findIndex(([c, x], i) => c === 5 && x === hDict && perechi[i - 1]?.[1] === 'DICTIONARY');
  assert.ok(iDict > 0);
  const intrari = new Map<string, string>();
  for (let i = iDict + 1; i < perechi.length && perechi[i]![0] !== 0; i++) if (perechi[i]![0] === 3) intrari.set(perechi[i]![1], perechi[i + 1]![1]);
  assert.deepEqual([...intrari.keys()].sort(), ['Layout1', 'Model']);
  for (const h of intrari.values()) assert.ok(perechi.some(([c, x], i) => c === 5 && x === h && perechi[i - 1]?.[1] === 'LAYOUT'), `LAYOUT ${h}`);
  // Fiecare SPLINE: 72 (noduri) = 73 (puncte) + 4.
  for (let i = 0; i < perechi.length; i++) {
    if (perechi[i]![0] !== 0 || perechi[i]![1] !== 'SPLINE') continue;
    const n72 = Number(perechi.slice(i).find(([c]) => c === 72)![1]), n73 = Number(perechi.slice(i).find(([c]) => c === 73)![1]);
    assert.equal(n72, n73 + 4);
  }
});

test('exportul din panou: numele, tipul, câte entități și straturi; foaia goală nu are nimic (fără conturul ei)', () => {
  const d = exportaVectori(corpus(), 0, 'dxf', false);
  assert.deepEqual([d.nume, d.tip, d.entitati, d.straturi], ['cncvs2-foaia-1.dxf', 'application/dxf', 12, 6]);
  const s = exportaVectori(corpus(), 0, 'svg', true);
  assert.deepEqual([s.nume, s.tip, s.entitati, s.straturi], ['cncvs2-foaia-1.svg', 'image/svg+xml', 13, 7]);
  assert.ok(s.text.startsWith('<?xml'));
  const gol = { ...corpus(), foi: [{ id: 'f', stoc: { latime: 100, inaltime: 100, grosime: 18 }, instante: [] }] };
  assert.equal(exportaVectori(gol, 0, 'svg', false).entitati, 0);
  assert.equal(exportaVectori(gol, 0, 'svg', true).entitati, 1);
});
