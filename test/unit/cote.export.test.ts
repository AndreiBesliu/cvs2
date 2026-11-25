import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { entitatiCote, textPentruFont, type OptiuniCote } from '../../src/io/coteExport.ts';
import { inHelvetica } from '../../src/io/helvetica.ts';
import { culoareDxf } from '../../src/io/dxfExport.ts';
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
const optiuni = (stil: StilCota = STIL_IMPLICIT): OptiuniCote => ({ stil, format: formatImplicit(true), ca: 'trasaturi', cifre: cifreDinFont(FONT) });

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
  if (e.fel === 'text') return [e.p];
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
  assert.deepEqual(fara, { entitati: [], cutie: null, cote: 0, lipsa: [], definitii: [] });
});

const STRAT = { nume: 'COTE', culoare: '#006d8f', grosime: 0.1 };
const cerute = (strat = STRAT): CoteCerute => ({ ...optiuni(), strat, dxf: 'linii' });

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

test('o cotă legată se exportă de pe formă, nu din locul văzut ultima oară (ținut învechit aici)', () => {
  const leg = (k: number, x: number, y: number) => ({ x, y, legatura: { instanta: 'i', nod: 'e', loc: { fel: 'varf' as const, k }, n: 4 } });
  // Vârfurile 0 și 2 ale dreptunghiului 100 × 20 din (0, 0): (0, 0) și (100, 20); locurile ținute sunt altele.
  const c: Cota = { id: 'l', fel: 'orizontala', puncte: [leg(0, 5, 5), leg(2, 95, 15)], linie: { d: 15 } };
  const x = entitatiCote(document([c]), 0, optiuni());
  assert.ok(areLinia(x.entitati, 0, 25, 100, 25), 'linia de cotă între vârfurile formei');
  assert.ok(areLinia(x.entitati, 0, 1, 0, 27) && areLinia(x.entitati, 100, 21, 100, 27), 'extensiile, din vârfuri');
});

test('cifra în linie: linia de cotă se întrerupe cât cifra și golurile ei (nicio bucată nu trece prin x = 50)', () => {
  const x = entitatiCote(document([ORIZONTALA]), 0, optiuni({ ...STIL_IMPLICIT, loc: 'in-linie' }));
  const pe25 = linii(x.entitati).filter(([, b, , d]) => aproape(b, 25) && aproape(d, 25));
  assert.equal(pe25.length, 2, 'două bucăți ale liniei');
  for (const [a, , c] of pe25) assert.ok(Math.max(a, c) < 50 || Math.min(a, c) > 50, `bucata ${a}–${c} trece prin mijloc`);
  // Golul: cel puțin lățimea estimată a lui „100” (3 · 0,6 · 3,5), plus câte 0,3 · 3,5 de fiecare parte.
  const st = Math.max(...pe25.map(([a, , c]) => Math.min(a, c) < 50 ? Math.max(a, c) : -Infinity));
  const dr = Math.min(...pe25.map(([a, , c]) => Math.min(a, c) > 50 ? Math.min(a, c) : Infinity));
  assert.ok(aproape(dr - st, 3 * 0.6 * 3.5 + 2 * 0.3 * 3.5, 1e-9), `golul: ${dr - st}`);
});

test('un semn pe care fontul nu-l are se spune (o dată), fără să oprească exportul', () => {
  const c: Cota = { ...ORIZONTALA, text: '<> ☃ ☃' };
  const x = entitatiCote(document([c]), 0, optiuni());
  assert.equal(x.cote, 1);
  assert.deepEqual(x.lipsa, ['☃']);
  assert.ok(x.entitati.some((e) => e.fel === 'spline' || (e.fel === 'polilinie' && puncte(e).every((p) => p.y > 25.5))), 'cifrele care există, desenate');
});

test('DXF: săgeata plină e un SOLID cu subclasa AcDbTrace; punctul, o LWPOLYLINE cu lățimea lui (43)', () => {
  const doc = document([ORIZONTALA]);
  const dxf = exportaVectori(doc, 0, 'dxf', false, cerute()).text;
  assert.equal((dxf.match(/\n0\nSOLID\n5\n[0-9A-F]+\n330\n[0-9A-F]+\n100\nAcDbEntity\n8\nCOTE\n100\nAcDbTrace\n/g) ?? []).length, 2);
  const punct = exportaVectori(doc, 0, 'dxf', false, { ...cerute(), stil: { ...STIL_IMPLICIT, capete: 'punct' } }).text;
  const r = 2.5 / 4;
  assert.equal((punct.match(new RegExp(`\\n8\\nCOTE\\n100\\nAcDbPolyline\\n90\\n2\\n70\\n1\\n43\\n${r}\\n`, 'g')) ?? []).length, 2, 'două discuri, cu lățimea r');
});

test('culoarea de bază (ACI) a stratului: după nuanță; griurile, după luminozitate', () => {
  const cazuri: [string, number][] = [
    ['#006d8f', 4], ['#ff0000', 1], ['#ff8800', 2], ['#ffff00', 2], ['#00ff00', 3], ['#00ffff', 4], ['#0000ff', 5], ['#123abc', 5],
    ['#ff00ff', 6], ['#000000', 7], ['#ffffff', 7], ['#808080', 8], ['#c0c0c0', 9], ['#7a8070', 8],
  ];
  for (const [hex, aci] of cazuri) assert.deepEqual(culoareDxf(hex), [aci, Number.parseInt(hex.slice(1), 16)], hex);
});

test('PDF: pagina se lărgește cât ies cotele din foaie (o cotă sub foaie)', () => {
  const jos: Cota = { ...ORIZONTALA, linie: { d: -40 } };
  // Linia la y = 10 − 40 = −30; extensiile trec cu 2 mm de ea, până la −32.
  const pdf = exportaVectori(document([jos]), 0, 'pdf', true, cerute()).text;
  const box = /\/MediaBox \[([^\]]+)\]/.exec(pdf)?.[1]?.split(' ').map(Number) ?? [];
  assert.ok(aproape(box[1]! / (72 / 25.4), -32, 1e-5), `jos: ${box[1]! / (72 / 25.4)} mm`);
  assert.ok(aproape(box[3]! / (72 / 25.4), 200, 1e-5), 'sus, foaia');
});

// --- Felia 10.4↑c-2: cotele ca DIMENSION, cifrele ca text -----------------------------------------------------------------

test('cu felul de dinainte (în DXF linii și cifre, cifrele ca trăsături), corpusul cotelor iese octet cu octet ca în c-1', async () => {
  const { CORPUS_COTE, STRAT_COTE } = await import('../../scripts/export2d-corpus.ts');
  const r0 = incarca(structuredClone(CORPUS_COTE));
  if (!r0.ok) assert.fail(r0.motiv);
  // Amprentele fișierelor `cote.*` scrise de c-1 (`f2f6fc57`), înaintea feliei.
  const C1 = {
    dxf: 'c6da1639ac407170ea9e56542907ad647fb817fcaa26ffc7b221e98680eea188', svg: '330dcce9d99e8a2532dc727f69f8c4c263cd7491ec181202b80bca7d239c6e61',
    pdf: 'f763b029837becfd41fbb747ca81bb31ed7cf5fa6f9ad91e7a4a79554e513fe6', eps: '48653c4ec26094cd63941f7dfae19e27ee033759b14e8cc2e6816c82549d93ee',
  } as const;
  const { createHash } = await import('node:crypto');
  for (const f of ['dxf', 'svg', 'pdf', 'eps'] as const) {
    const x = exportaVectori(r0.doc, 0, f, true, { ...optiuni(), format: formatImplicit(true), strat: STRAT_COTE, dxf: 'linii' });
    assert.equal(createHash('sha256').update(x.text).digest('hex'), C1[f], f);
  }
});

const inHelveticaLatime = (t: string): number => inHelvetica(t).latime;
const definitii = (cote: Cota[]) => entitatiCote(document(cote), 0, optiuni()).definitii;
const lang = (p: { x: number; y: number } | undefined, x: number, y: number): boolean => p !== undefined && aproape(p.x, x) && aproape(p.y, y);

test('DIMENSION, pe hârtie: orizontala rotită la 0°, verticala la 90°, aliniata; punctele măsurate și piciorul lui b', () => {
  const [h, v, a] = definitii([
    ORIZONTALA,
    { id: 'v', fel: 'verticala', puncte: [ancora(200, 20), ancora(210, 80)], linie: { d: 20 } },
    { id: 'a', fel: 'aliniata', puncte: [ancora(130, 80), ancora(160, 120)], linie: { d: 10 } },
  ]);
  assert.ok(h && v && a);
  assert.deepEqual([h.tip, h.steaguri, h.unghi, h.masura, h.text, h.element], [0, 32, 0, 100, '100', 'c1']);
  assert.ok(lang(h.puncte[13], 0, 0) && lang(h.puncte[14], 100, 20) && lang(h.puncte[10], 100, 25));
  // Mijlocul textului: la jumătate de majusculă (1,75) deasupra bazei (25 + 1,05).
  assert.ok(lang(h.mijloc, 50, 25 + 1.05 + 1.75));
  assert.deepEqual([v.tip, v.unghi, v.masura], [0, 90, 60]);
  assert.ok(lang(v.puncte[10], 185, 80) && lang(v.mijloc, 185 - 1.05 - 1.75, 50));
  assert.deepEqual([a.tip, a.unghi, a.masura], [1, undefined, 50]);
  assert.ok(lang(a.puncte[13], 130, 80) && lang(a.puncte[14], 160, 120) && lang(a.puncte[10], 152, 126));
});

test('DIMENSION, pe hârtie: raza și diametrul (punctul de pe cerc, centrul sau opusul, liderul), cifra pusă de om', () => {
  const [r, d] = definitii([
    { id: 'r', fel: 'raza', puncte: [ancora(110, 175), ancora(125, 175)], linie: { d: 6 } },
    { id: 'd', fel: 'diametru', puncte: [ancora(240, 150), ancora(260, 150)], linie: { d: 8 } },
  ]);
  assert.ok(r && d);
  assert.deepEqual([r.tip, r.steaguri, r.masura, r.text], [4, 160, 15, 'R15']);
  assert.ok(lang(r.puncte[10], 110, 175) && lang(r.puncte[15], 125, 175) && aproape(r.lider!, 6.7));
  assert.deepEqual([d.tip, d.steaguri, d.masura, d.text], [3, 160, 40, 'Ø40']);
  assert.ok(lang(d.puncte[15], 260, 150) && lang(d.puncte[10], 220, 150) && aproape(d.lider!, 8));
});

test('DIMENSION, pe hârtie: unghiul în sensul arcului, din trei puncte și din două laturi, cu semidreptele întoarse', () => {
  // Din (0, 0), laturile spre (10, 0) și (0, 10), cu a doua semidreaptă întoarsă (s2 = −1): unghiul dintre (1, 0) și (0, −1)
  // e 90°, iar arcul pleacă din (0, −1) (trigonometric, spre (1, 0)): 13 = (0, −10), 14 = (10, 0), 15 = vârful.
  const [u, w] = definitii([
    { id: 'u', fel: 'unghi', puncte: [ancora(0, 0), ancora(10, 0), ancora(0, 10)], linie: { d: 5, s1: 1, s2: -1 } },
    // Laturile (245, 30)–(285, 30) și (270, 65)–(250, 45) (a doua de-a-ndoaselea, s2 = −1): semidreapta a doua e tot (1, 1),
    // deci 45°, din prima latură (13 → 14) spre a doua, în sensul semidreptei: (250, 45) → (270, 65).
    { id: 'w', fel: 'unghi', puncte: [ancora(245, 30), ancora(285, 30), ancora(270, 65), ancora(250, 45)], linie: { d: 30, s1: 1, s2: -1 } },
  ]);
  assert.ok(u && w);
  assert.equal(u.tip, 5);
  assert.ok(aproape(u.masura, Math.PI / 2));
  assert.ok(lang(u.puncte[15], 0, 0) && lang(u.puncte[13], 0, -10) && lang(u.puncte[14], 10, 0));
  assert.ok(lang(u.puncte[10], 5 * Math.SQRT1_2, -5 * Math.SQRT1_2), 'mijlocul arcului, la −45°');
  assert.equal(w.tip, 2);
  assert.ok(aproape(w.masura, Math.PI / 4));
  assert.ok(lang(w.puncte[13], 245, 30) && lang(w.puncte[14], 285, 30) && lang(w.puncte[15], 250, 45) && lang(w.puncte[10], 270, 65));
  assert.ok(lang(w.puncte[16], 235 + 30 * Math.cos(Math.PI / 8), 30 + 30 * Math.sin(Math.PI / 8)));
});

test('DIMENSION fără valoare (laturi paralele) sau fără text: nicio definiție; cota rămâne desenată', () => {
  const x = entitatiCote(document([{ id: 'g', fel: 'orizontala', puncte: [ancora(0, 0), ancora(100, 0)], linie: { d: 10 }, text: '  ' }]), 0, optiuni());
  assert.equal(x.cote, 1);
  assert.deepEqual(x.definitii, []);
});

const blocuriDxf = (dxf: string): { nume: string; corp: string }[] =>
  [...dxf.matchAll(/\n0\nBLOCK\n5\n[0-9A-F]+\n330\n[0-9A-F]+\n100\nAcDbEntity\n8\n0\n100\nAcDbBlockBegin\n2\n(\*D\d+)\n70\n1\n([\s\S]*?)\n0\nENDBLK\n/g)]
    .map((m) => ({ nume: m[1]!, corp: m[2]! }));
const sectiune = (dxf: string, nume: string): string => dxf.split(`\n2\n${nume}\n`)[1]!.split('\n0\nENDSEC\n')[0]!;

test('DXF ca DIMENSION: blocul *D1 cu desenul cotei, entitatea în ENTITIES, stilul CNCVS2; handle-urile unice, sub $HANDSEED', () => {
  const doc = document([ORIZONTALA, { id: 'd', fel: 'diametru', puncte: [ancora(240, 150), ancora(260, 150)], linie: { d: 8 } }]);
  const f = exportaVectori(doc, 0, 'dxf', false, { ...cerute(), dxf: 'dimension' }).text;
  const blocuri = blocuriDxf(f);
  assert.deepEqual(blocuri.map((b) => b.nume), ['*D1', '*D2']);
  assert.match(blocuri[0]!.corp, /\n0\nSOLID\n/);
  assert.match(sectiune(f, 'BLOCK_RECORD'), /\n2\n\*D1\n[\s\S]*\n2\n\*D2\n/);
  const ent = sectiune(f, 'ENTITIES');
  assert.equal((ent.match(/\n0\nDIMENSION\n/g) ?? []).length, 2);
  assert.doesNotMatch(ent, /\n8\nCOTE\n100\nAcDb(Polyline|Trace|Spline)\n/, 'desenul cotelor e doar în blocuri');
  assert.match(ent, /\n2\n\*D1\n10\n100\n20\n25\n30\n0\n11\n50\n21\n27\.8\n31\n0\n70\n32\n71\n5\n42\n100\n1\n100\n3\nCNCVS2\n100\nAcDbAlignedDimension\n13\n0\n23\n0\n33\n0\n14\n100\n24\n20\n34\n0\n50\n0\n100\nAcDbRotatedDimension\n/);
  assert.match(ent, /\n70\n163\n71\n5\n42\n40\n1\n\\U\+00D840\n3\nCNCVS2\n100\nAcDbDiametricDimension\n15\n260\n25\n150\n35\n0\n40\n8$/);
  assert.match(sectiune(f, 'DIMSTYLE'), /\n105\n[0-9A-F]+\n330\n[0-9A-F]+\n100\nAcDbSymbolTableRecord\n100\nAcDbDimStyleTableRecord\n2\nCNCVS2\n70\n0\n40\n1\n41\n2\.5\n42\n1\n44\n2\n/);
  assert.match(f, /\n0\nTABLE\n2\nDIMSTYLE\n5\n[0-9A-F]+\n330\n0\n100\nAcDbSymbolTable\n70\n2\n/);
  const linii = f.split('\n');
  const handles: number[] = [];
  for (let i = 0; i + 1 < linii.length; i += 2) {
    if ((linii[i] === '5' || linii[i] === '105') && linii[i - 1] !== '$HANDSEED') handles.push(Number.parseInt(linii[i + 1]!, 16));
  }
  assert.equal(new Set(handles).size, handles.length, 'fiecare handle o dată');
  const seed = Number.parseInt(/\$HANDSEED\n5\n([0-9A-F]+)\n/.exec(f)![1]!, 16);
  assert.ok(handles.every((h) => h < seed), '$HANDSEED peste toate');
});

test('DXF: cifrele ca text sunt MTEXT, în blocul cotei sau, cu „Linii și cifre”, în ENTITIES; semnele din afara ASCII ca \\U+', () => {
  const doc = document([{ ...ORIZONTALA, text: 'Ø{<>}\\' }]);
  const text = (dxf: 'dimension' | 'linii'): string => exportaVectori(doc, 0, 'dxf', false, { ...cerute(), dxf, ca: 'text' }).text;
  const mtext = /\n0\nMTEXT\n5\n[0-9A-F]+\n330\n[0-9A-F]+\n100\nAcDbEntity\n8\nCOTE\n100\nAcDbMText\n10\n50\n20\n27\.8\n30\n0\n40\n3\.5\n41\n0\n71\n5\n72\n1\n1\n\\U\+00D8\\\{100\\\}\\\\\n7\nStandard\n11\n1\n21\n0\n31\n0\n73\n1\n44\n1(\n|$)/;
  const cuDim = text('dimension');
  assert.match(blocuriDxf(cuDim)[0]!.corp, mtext);
  assert.doesNotMatch(sectiune(cuDim, 'ENTITIES'), /MTEXT/);
  // Textul cotei, în DIMENSION, la fel scris.
  assert.match(sectiune(cuDim, 'ENTITIES'), /\n1\n\\U\+00D8\\\{100\\\}\\\\\n3\nCNCVS2\n/);
  const linii = text('linii');
  assert.match(sectiune(linii, 'ENTITIES'), mtext);
  assert.doesNotMatch(linii, /DIMENSION\n5\n|\*D1/);
  assert.match(linii, /^[\x00-\x7f]*$/, 'fișierul rămâne ASCII');
});

test('stilul CNCVS2 urmează setările: oblica (DIMTSZ), în linie, fără extensii, inch în fracții, grade-minute-secunde, unitatea scrisă', () => {
  const stil = { ...STIL_IMPLICIT, capete: 'oblica' as const, loc: 'orizontala' as const, extensii: false };
  const format = { ...formatImplicit(false), unitate: 'fractii' as const, fractie: 16, cuUnitate: true, unghi: 'gms' as const, zecimaleUnghi: 1, zerouri: 'pastrate' as const };
  const f = exportaVectori(document([ORIZONTALA]), 0, 'dxf', false, { ...cerute(), stil, format, dxf: 'dimension' }).text;
  const st = sectiune(f, 'DIMSTYLE').split('\n2\nCNCVS2\n')[1]!;
  const cod = (k: number): string | undefined => new RegExp(`\\n${k}\\n([^\\n]*)\\n`).exec(`\n${st}`)?.[1];
  assert.deepEqual([cod(3), cod(142), cod(73), cod(74), cod(75), cod(76), cod(77), cod(78)], ['<> in', '2.5', '1', '1', '1', '1', '0', '0']);
  assert.deepEqual([cod(179), cod(271), cod(275), cod(276), cod(277), cod(278)], ['5', '4', '1', '2', '5', '46']);
  assert.ok(aproape(Number(cod(144)), 1 / 25.4));
});

test('Helvetica: lățimile AFM ale semnelor cotelor, codurile WinAnsi / ISOLatin1, „?” pentru ce lipsește; șirul literal', async () => {
  const { inHelvetica, sirLiteral, marimeHelvetica } = await import('../../src/io/helvetica.ts');
  assert.deepEqual(inHelvetica('Ø40'), { coduri: [0xd8, 0x34, 0x30], latime: 778 + 556 + 556, lipsa: [] });
  assert.deepEqual(inHelvetica("R1,5°±×′″"), { coduri: [82, 49, 44, 53, 0xb0, 0xb1, 0xd7, 0x27, 0x22], latime: 722 + 556 + 278 + 556 + 400 + 584 + 584 + 191 + 355, lipsa: [] });
  assert.deepEqual(inHelvetica('șș'), { coduri: [63, 63], latime: 1112, lipsa: ['ș'] });
  assert.equal(sirLiteral(inHelvetica('(Ø)\\').coduri), '\\(\\330\\)\\\\');
  assert.ok(aproape(marimeHelvetica(3.5) * 0.718, 3.5));
});

test('cifrele ca text: o entitate pe cotă (fără trăsături, fără font), cutia din lățimea Helvetica; în PDF și EPS, semnele lipsă', () => {
  const doc = document([{ ...ORIZONTALA, text: 'ș=<>' }]);
  const x = entitatiCote(doc, 0, { stil: STIL_IMPLICIT, format: formatImplicit(true), ca: 'text' });
  const t = x.entitati.filter((e) => e.fel === 'text');
  assert.equal(t.length, 1);
  assert.deepEqual(t[0], { fel: 'text', strat: 'COTE', element: 'c1', text: 'ș=100', p: { x: 50, y: 26.05 }, unghi: 0, inaltime: 3.5 });
  assert.deepEqual(x.lipsa, []);
  // Lățimea: „?=100” în Helvetica = 556 + 584 + 3 · 556 = 2808 / 1000 din mărimea 3,5 / 0,718.
  const w = (2808 / 1000) * (3.5 / 0.718);
  assert.ok(w < 100 && aproape(x.cutie!.minX, 0) && aproape(x.cutie!.maxY, 26.05 + 3.5), 'cutia ține linia și cifra, până la majuscula ei');
  const lata = entitatiCote(document([{ ...ORIZONTALA, text: '<> '.repeat(12) }]), 0, { stil: STIL_IMPLICIT, format: formatImplicit(true), ca: 'text' });
  const wl = (inHelveticaLatime('100 '.repeat(12)) / 1000) * (3.5 / 0.718);
  assert.ok(aproape(lata.cutie!.minX, 50 - wl / 2) && aproape(lata.cutie!.minY, 1) && aproape(lata.cutie!.maxX, 50 + wl / 2), 'un text mai lat decât linia lărgește cutia cât lățimea lui');
  for (const f of ['pdf', 'eps'] as const) assert.deepEqual(exportaVectori(doc, 0, f, false, { ...cerute(), ca: 'text' }).lipsa, ['ș'], f);
  for (const f of ['dxf', 'svg'] as const) assert.deepEqual(exportaVectori(doc, 0, f, false, { ...cerute(), ca: 'text' }).lipsa, [], f);
  // Fără funcția cifrelor, cu trăsăturile: cifrele se spun lipsă, nedesenate.
  assert.deepEqual(entitatiCote(doc, 0, { stil: STIL_IMPLICIT, format: formatImplicit(true), ca: 'trasaturi' }).lipsa, ['ș', '=', '1', '0']);
});

test('SVG, PDF, EPS cu cifrele ca text: <text> centrat și rotit, Helvetica WinAnsi doar cu text, prologul ISOLatin1 doar cu text', () => {
  const doc = document([{ id: 'v', fel: 'verticala', puncte: [ancora(200, 20), ancora(210, 80)], linie: { d: 20 }, text: '<>°' }]);
  const svg = exportaVectori(doc, 0, 'svg', false, { ...cerute(), ca: 'text' }).text;
  assert.match(svg, /<text x="183\.95" y="150" font-family="Helvetica, Arial, sans-serif" font-size="4\.874652" text-anchor="middle" fill="#006d8f" stroke="none" transform="rotate\(-90 183\.95 150\)">60&#176;<\/text>/);
  const pdf = exportaVectori(doc, 0, 'pdf', false, { ...cerute(), ca: 'text' }).text;
  // După straturile FARA_OPERATIE și COTE (5, 6), fontul e obiectul 7.
  assert.match(pdf, /\/Font << \/F1 7 0 R >>/);
  assert.match(pdf, /7 0 obj\n<< \/Type \/Font \/Subtype \/Type1 \/BaseFont \/Helvetica \/Encoding \/WinAnsiEncoding >>/);
  // „60°” are 556 + 556 + 400 = 1512 / 1000 din 4,874652: baza pleacă de la jumătate mai jos, pe verticală.
  const w = (1512 / 1000) * (3.5 / 0.718);
  assert.match(pdf, new RegExp(`BT /F1 4\\.874652 Tf 0 1 -1 0 183\\.95 ${(50 - w / 2).toFixed(6).replace(/\.?0+$/, '').replace('.', '\\.')} Tm \\(60\\\\260\\) Tj ET`));
  const eps = exportaVectori(doc, 0, 'eps', false, { ...cerute(), ca: 'text' }).text;
  assert.match(eps, /%%DocumentNeededResources: font Helvetica\n%%EndComments\n\/Helvetica findfont dup length dict begin\n/);
  assert.match(eps, /\ngsave 183\.95 50 translate 90 rotate \/Helvetica-L1 findfont 4\.874652 scalefont setfont 0 0 moveto \(60\\260\) dup stringwidth pop -2 div 0 rmoveto show grestore\n/);
  const fara = exportaVectori(doc, 0, 'eps', false, cerute()).text;
  assert.doesNotMatch(fara, /findfont|Needed/);
  assert.doesNotMatch(exportaVectori(doc, 0, 'pdf', false, cerute()).text, /Font/);
});
