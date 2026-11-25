import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { entitatiCote, textPentruFont, type OptiuniCote } from '../../src/io/coteExport.ts';
import { exportaVectori, type CoteCerute } from '../../src/io/exportVectori.ts';
import type { Entitate } from '../../src/io/vectori.ts';
import { formatImplicit, STIL_IMPLICIT, type StilCota } from '../../src/model/desenCota.ts';
import type { Cota, Document } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { citesteFont, type Font } from '../../src/text/font.ts';
import { cifreDinFont } from '../../src/text/cifreCote.ts';

/**
 * Cotele în exportul 2D (ADR 0330 §7, felia 10.4↑c-1), pe hârtie: o cotă orizontală între (0, 0) și (100, 20), cu linia la
 * d = 15 (deci la y = 25), cu stilul implicit, dă extensiile (0, 1)–(0, 27) și (100, 21)–(100, 27), linia (0, 25)–(100, 25),
 * două săgeți pline (vârful în picior, baza la 2,5 mm înăuntru, lățimea 2,5 / 3) și cifrele „100”, trăsături ale fontului cu
 * o singură linie, centrate pe x = 50, cu baza la y = 25 + 0,3 · 3,5 = 26,05 și înălțimea 3,5. Arcul unghiului e exact (bulge
 * = tan(baleiaj / 4), pe cercul razei lui); punctul e un disc (polilinia din două semicercuri de rază r / 2, cu lățimea r).
 * Fără cote (sau fără bifă), fișierele sunt octet cu octet cele de dinainte.
 */
const r = citesteFont(new Uint8Array(readFileSync(new URL('../../public/fonturi/relief-singleline.ttf', import.meta.url))));
if (!r.ok) throw new Error('fontul cifrelor nu s-a citit');
const FONT: Font = r.font;
const optiuni = (stil: StilCota = STIL_IMPLICIT): OptiuniCote => ({ stil, format: formatImplicit(true), cifre: cifreDinFont(FONT) });

const ancora = (x: number, y: number): { x: number; y: number } => ({ x, y });
function document(cote: Cota[]): Document {
  const brut = {
    schema: 28, rev: 0,
    piese: [{ id: 'p', radacina: { tip: 'element', id: 'e', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, forma: { tip: 'dreptunghi', latime: 100, inaltime: 20, razaColt: 0 } }, operatii: [] }],
    foi: [{ id: 'f', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }], cote }],
  };
  const d = incarca(structuredClone(brut));
  if (!d.ok) throw new Error(`documentul nu trece de ușă: ${d.motiv}`);
  return d.doc;
}
const ORIZONTALA: Cota = { id: 'c1', fel: 'orizontala', puncte: [ancora(0, 0), ancora(100, 20)], linie: { d: 15 } };

const aproape = (a: number, b: number, tol = 1e-9): boolean => Math.abs(a - b) <= tol;
const linii = (e: readonly Entitate[]): [number, number, number, number][] =>
  e.filter((x): x is Extract<Entitate, { fel: 'polilinie' }> => x.fel === 'polilinie' && !x.inchis && x.varfuri.length === 2 && x.varfuri[0]!.bulge === 0)
    .map((x) => [x.varfuri[0]!.x, x.varfuri[0]!.y, x.varfuri[1]!.x, x.varfuri[1]!.y]);
const areLinia = (e: readonly Entitate[], x1: number, y1: number, x2: number, y2: number): boolean =>
  linii(e).some(([a, b, c, d]) => (aproape(a, x1) && aproape(b, y1) && aproape(c, x2) && aproape(d, y2)) || (aproape(a, x2) && aproape(b, y2) && aproape(c, x1) && aproape(d, y1)));

/** Punctele unei entități (vârfurile poliliniilor, punctele splinelor și ale capetelor pline). */
function puncte(e: Entitate): { x: number; y: number }[] {
  if (e.fel === 'polilinie') return e.varfuri.map((v) => ({ x: v.x, y: v.y }));
  if (e.fel === 'cerc') return [e.centru];
  return [...e.puncte];
}

test('orizontala, pe hârtie: extensiile, linia, săgețile pline, totul pe stratul COTE, cu id-ul cotei', () => {
  const x = entitatiCote(document([ORIZONTALA]), 0, optiuni());
  assert.equal(x.cote, 1);
  assert.deepEqual(x.lipsa, []);
  assert.ok(x.entitati.every((e) => e.strat === 'COTE' && e.element === 'c1'));
  assert.ok(areLinia(x.entitati, 0, 1, 0, 27), 'extensia lui a: de la golul de 1 mm, cu 2 mm peste linie');
  assert.ok(areLinia(x.entitati, 100, 21, 100, 27), 'extensia lui b');
  assert.ok(areLinia(x.entitati, 0, 25, 100, 25), 'linia de cotă');
  const pline = x.entitati.filter((e) => e.fel === 'plin');
  assert.equal(pline.length, 2);
  const s = 2.5 / 6;
  const triunghi = (p: readonly { x: number; y: number }[], v: [number, number], b1: [number, number], b2: [number, number]): boolean =>
    p.length === 3 && aproape(p[0]!.x, v[0]) && aproape(p[0]!.y, v[1]) && aproape(p[1]!.x, b1[0]) && aproape(p[1]!.y, b1[1]) && aproape(p[2]!.x, b2[0]) && aproape(p[2]!.y, b2[1]);
  assert.ok(triunghi(puncte(pline[0]!), [0, 25], [2.5, 25 + s], [2.5, 25 - s]), 'săgeata din a');
  assert.ok(triunghi(puncte(pline[1]!), [100, 25], [97.5, 25 - s], [97.5, 25 + s]), 'săgeata din b');
});

test('cifrele „100”: trăsături ale fontului, centrate pe x = 50, cu baza la y = 26,05 și înălțimea 3,5 (cât H-ul fontului)', () => {
  const x = entitatiCote(document([ORIZONTALA]), 0, optiuni());
  // Tot ce nu e extensie, linie sau capăt: cifrele (deasupra liniei, peste y = 25,5).
  const cifre = x.entitati.filter((e) => e.fel !== 'plin' && puncte(e).every((p) => p.y > 25.5 && p.x > 40 && p.x < 60));
  assert.ok(cifre.length >= 3, `cel puțin o trăsătură pe cifră (${cifre.length})`);
  const p = cifre.flatMap(puncte);
  const minY = Math.min(...p.map((q) => q.y)), maxY = Math.max(...p.map((q) => q.y));
  const minX = Math.min(...p.map((q) => q.x)), maxX = Math.max(...p.map((q) => q.x));
  assert.ok(aproape(minY, 26.05, 0.05), `baza cifrelor: ${minY}`);
  assert.ok(aproape(maxY - minY, 3.5, 0.15), `înălțimea cifrelor: ${maxY - minY}`);
  assert.ok(aproape((minX + maxX) / 2, 50, 0.4), `mijlocul cifrelor: ${(minX + maxX) / 2}`);
  assert.ok(maxX - minX > 3 * 1.5 && maxX - minX < 3 * 3.5, `lățimea a trei cifre: ${maxX - minX}`);
  // Cutia cotelor: de la golul extensiilor (y = 1) până la vârful cifrelor, de la x = 0 la 100.
  assert.ok(x.cutie);
  assert.ok(aproape(x.cutie.minX, 0) && aproape(x.cutie.maxX, 100) && aproape(x.cutie.minY, 1), JSON.stringify(x.cutie));
  assert.ok(aproape(x.cutie.maxY, Math.max(27, maxY), 1e-6), `sus: ${x.cutie.maxY}`);
});

test('verticala: cifrele rotite cu 90°, citite de jos în sus (înalte pe X, lungi pe Y)', () => {
  const c: Cota = { id: 'v', fel: 'verticala', puncte: [ancora(0, 0), ancora(10, 60)], linie: { d: 20 } };
  const x = entitatiCote(document([c]), 0, optiuni());
  // Linia la x = mijloc − d = 5 − 20 = −15; cifra „60” la stânga ei, centrată pe y = 30.
  assert.ok(areLinia(x.entitati, -15, 0, -15, 60), 'linia de cotă');
  const cifre = x.entitati.filter((e) => e.fel !== 'plin' && puncte(e).every((p) => p.x < -15.5));
  const p = cifre.flatMap(puncte);
  const latX = Math.max(...p.map((q) => q.x)) - Math.min(...p.map((q) => q.x));
  const latY = Math.max(...p.map((q) => q.y)) - Math.min(...p.map((q) => q.y));
  assert.ok(aproape(latX, 3.5, 0.15), `înălțimea cifrelor, pe X: ${latX}`);
  assert.ok(latY > 2 && latY < 6, `lungimea „60”, pe Y: ${latY}`);
  assert.ok(aproape((Math.max(...p.map((q) => q.y)) + Math.min(...p.map((q) => q.y))) / 2, 30, 0.4));
  assert.ok(aproape(Math.max(...p.map((q) => q.x)), -15 - 1.05, 0.05), 'baza cifrelor la 1,05 mm de linie');
});

test('arcul unghiului: exact, pe cercul razei lui, cu bulge = tan(baleiaj / 4) > 0 (trigonometric)', () => {
  const c: Cota = { id: 'u', fel: 'unghi', puncte: [ancora(0, 0), ancora(10, 0), ancora(0, 10)], linie: { d: 20 } };
  const x = entitatiCote(document([c]), 0, optiuni());
  const arce = x.entitati.filter((e): e is Extract<Entitate, { fel: 'polilinie' }> => e.fel === 'polilinie' && e.varfuri.some((v) => v.bulge !== 0) && e.latime === undefined);
  assert.ok(arce.length >= 1);
  let baleiat = 0;
  for (const a of arce) {
    const [s, f] = [a.varfuri[0]!, a.varfuri[1]!];
    assert.ok(aproape(Math.hypot(s.x, s.y), 20) && aproape(Math.hypot(f.x, f.y), 20), 'capetele pe cercul de rază 20');
    assert.ok(s.bulge > 0);
    const de = Math.atan2(s.y, s.x), la = Math.atan2(f.y, f.x);
    const b = la - de;
    assert.ok(aproape(s.bulge, Math.tan(b / 4), 1e-12), 'bulge = tan(baleiaj / 4)');
    assert.ok(de >= -1e-9 && la <= Math.PI / 2 + 1e-9, 'în primul cadran');
    baleiat += b;
  }
  assert.ok(baleiat <= Math.PI / 2 + 1e-9 && baleiat > Math.PI / 4, `cât acoperă arcele (fără golul cifrelor): ${baleiat}`);
});

test('capetele: punctul e un disc (cu lățimea lui), săgeata deschisă un triunghi închis, bara o bucată', () => {
  const doc = document([ORIZONTALA]);
  const punct = entitatiCote(doc, 0, optiuni({ ...STIL_IMPLICIT, capete: 'punct' }));
  const discuri = punct.entitati.filter((e): e is Extract<Entitate, { fel: 'polilinie' }> => e.fel === 'polilinie' && e.latime !== undefined);
  assert.equal(discuri.length, 2);
  const r = 2.5 / 4;
  const d = discuri[0]!;
  assert.equal(d.inchis, true);
  assert.equal(d.latime, r);
  assert.deepEqual(d.varfuri, [{ x: -r / 2, y: 25, bulge: 1 }, { x: r / 2, y: 25, bulge: 1 }]);
  assert.ok(aproape(punct.cutie?.minX ?? 0, -r), 'discul iese cu r din picior');
  const deschisa = entitatiCote(doc, 0, optiuni({ ...STIL_IMPLICIT, capete: 'deschisa' }));
  assert.equal(deschisa.entitati.filter((e) => e.fel === 'plin').length, 0);
  assert.equal(deschisa.entitati.filter((e) => e.fel === 'polilinie' && e.inchis && e.varfuri.length === 3).length, 2);
  const oblica = entitatiCote(doc, 0, optiuni({ ...STIL_IMPLICIT, capete: 'oblica' }));
  assert.equal(oblica.entitati.filter((e) => e.fel === 'plin').length, 0);
  const o = 2.5 / (2 * Math.SQRT2);
  assert.ok(areLinia(oblica.entitati, -o, 25 - o, o, 25 + o), 'bara oblică din a: 2,5 mm, la 45°, centrată pe picior');
  assert.ok(areLinia(oblica.entitati, 100 - o, 25 - o, 100 + o, 25 + o), 'și din b');
});

test('minutul și secunda: scrise cu apostroful și ghilimelele drepte, pe care fontul le are', () => {
  assert.equal(textPentruFont('12°30′15″'), `12°30'15"`);
  const c: Cota = { id: 'u', fel: 'unghi', puncte: [ancora(0, 0), ancora(10, 0), ancora(10, 3)], linie: { d: 30 } };
  const x = entitatiCote(document([c]), 0, { ...optiuni(), format: { ...formatImplicit(true), unghi: 'gms', zecimaleUnghi: 0 } });
  assert.deepEqual(x.lipsa, [], 'nicio literă lipsă');
});

test('o cotă dezlegată se exportă unde a fost văzută ultima oară; un fel necunoscut nu se exportă', () => {
  const dezlegata: Cota = {
    id: 'd', fel: 'orizontala', linie: { d: 15 },
    puncte: [{ x: 0, y: 0, legatura: { instanta: 'lipsa', nod: 'e', loc: { fel: 'varf', k: 0 }, n: 4 } }, ancora(100, 20)],
  };
  const x = entitatiCote(document([dezlegata, { id: 'z', fel: 'spirala', puncte: [ancora(0, 0)] }]), 0, optiuni());
  assert.equal(x.cote, 1);
  assert.ok(areLinia(x.entitati, 0, 25, 100, 25));
  assert.ok(x.entitati.every((e) => e.element === 'd'));
  const fara = entitatiCote(document([]), 0, optiuni());
  assert.deepEqual(fara, { entitati: [], cutie: null, cote: 0, lipsa: [] });
});

const STRAT = { nume: 'COTE', culoare: '#006d8f', grosime: 0.1 };
const cerute = (strat = STRAT): CoteCerute => ({ ...optiuni(), strat });

test('fără cote, sau fără bifă, fișierele sunt octet cu octet cele de dinainte, în toate formatele', () => {
  const cu = document([ORIZONTALA]), fara = document([]);
  for (const f of ['dxf', 'svg', 'pdf', 'eps'] as const) {
    const inainte = exportaVectori(fara, 0, f, true).text;
    assert.equal(exportaVectori(fara, 0, f, true, cerute()).text, inainte, `${f}: foaia fără cote, cu bifa`);
    assert.equal(exportaVectori(cu, 0, f, true).text, inainte, `${f}: foaia cu cote, fără bifă`);
    assert.notEqual(exportaVectori(cu, 0, f, true, cerute()).text, inainte, `${f}: cu cote și bifă`);
  }
});

test('stratul cotelor în fiecare format: numele, culoarea (în DXF și ACI-ul cel mai apropiat), grosimea în PDF și SVG', () => {
  const doc = document([ORIZONTALA]);
  const strat = { nume: 'Dim-1', culoare: '#ff8800', grosime: 0.25 };
  const dxf = exportaVectori(doc, 0, 'dxf', false, cerute(strat));
  assert.equal(dxf.cote, 1);
  assert.match(dxf.text, /\n0\nLAYER\n5\n[0-9A-F]+\n330\n[0-9A-F]+\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n2\nDim-1\n70\n0\n62\n2\n420\n16746496\n/);
  assert.equal((dxf.text.match(/\n0\nSOLID\n/g) ?? []).length, 2, 'cele două săgeți pline');
  assert.ok(!/\n8\nCOTE\n/.test(dxf.text), 'nicio entitate pe numele implicit');
  const svg = exportaVectori(doc, 0, 'svg', false, cerute(strat)).text;
  assert.match(svg, /<g id="Dim-1" inkscape:groupmode="layer" inkscape:label="Dim-1"[^>]*stroke="#ff8800"[^>]*stroke-width="0.25"/);
  assert.equal((svg.match(/fill="#ff8800" stroke="none"/g) ?? []).length, 2);
  const pdf = exportaVectori(doc, 0, 'pdf', false, cerute(strat)).text;
  assert.match(pdf, /\/Name \(Dim-1\)/);
  assert.match(pdf, /1 0\.5333 0 RG/);
  assert.match(pdf, /0.25 w/);
  const eps = exportaVectori(doc, 0, 'eps', false, cerute(strat)).text;
  assert.match(eps, /% Stratul Dim-1\n1 0\.5333 0 setrgbcolor\ngsave\n0\.25 setlinewidth/);
});
