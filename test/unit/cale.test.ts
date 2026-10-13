/**
 * Forma „cale” (ADR 0034): ușa documentului v9 (forma, refuzurile, plafoanele, câmpurile necunoscute, migrarea v8 → v9),
 * desenul pe pânză și clicul, măsurat pe cubice direct (includerea și distanța), față de inima eșantionată des.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listaDesen } from '../../src/app/desen.ts';
import { distantaLaContur, inRegiune } from '../../src/geom/distanta.ts';
import { PLAFON, VERSIUNE_SCHEMA, type Document, type FormaDoc, type VarfDoc } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { instantaLa } from '../../src/ui/actiuniDocument.ts';
import { D, INIMA, inimaEsantionata } from './ajutor-cale.ts';
import { docDin, ID } from './ajutor-document.ts';

const F = { latime: 300, inaltime: 200, grosime: 18 };
const P = (x: number, y: number) => ({ x, y });
const cu = (forma: FormaDoc, x = 100, y = 50): Document => docDin(F, { id: 'c', forma, matrice: { ...ID, e: x, f: y } });
const motiv = (r: ReturnType<typeof incarca>): string => (r.ok ? '' : r.motiv);
const prinUsa = (d: unknown) => incarca(JSON.parse(JSON.stringify(d)));

/** Documentul cu forma căii schimbată de `f` (pe o copie JSON). */
function stricat(d: Document, f: (forma: Record<string, any>) => void): unknown {
  const x = JSON.parse(JSON.stringify(d));
  f(x.piese[0].radacina.forma);
  return x;
}

test('o cale trece prin ușă neschimbată, cu câmpurile necunoscute pe formă, pe vârf, pe segment și pe punct', () => {
  assert.equal(VERSIUNE_SCHEMA, 10);
  for (const forma of [INIMA, D]) {
    const d = cu(forma);
    const r = prinUsa(d);
    assert.ok(r.ok, motiv(r));
    if (r.ok) assert.deepEqual(r.doc, d);
  }
  const necunoscute = stricat(cu(INIMA), (f) => {
    f.stil = { culoare: 'rosu' };
    f.varfuri[0].eticheta = 'varf';
    f.varfuri[0].s.extra = 1;
    f.varfuri[0].s.c1.w = 2;
    f.varfuri[1].p.z = 3;
  });
  const r = prinUsa(necunoscute);
  assert.ok(r.ok, motiv(r));
  if (r.ok) assert.deepEqual(r.doc, necunoscute);
});

test('ușa refuză, cu motiv: sub 2 vârfuri, numere nefinite sau prea mari, segmentul necunoscut, arcul fără cerc, calea deschisă cu ultimul segment C, inchis lipsă sau care nu e boolean', () => {
  const d = cu(INIMA);
  const cazuri: Array<[string, (f: Record<string, any>) => void, RegExp]> = [
    ['un singur vârf', (f) => { f.varfuri = f.varfuri.slice(0, 1); }, /cel puțin 2 vârfuri/],
    ['NaN', (f) => { f.varfuri[1].p.x = Number.NaN; }, /varfuri\.1\.p\.x/],
    ['prea departe', (f) => { f.varfuri[2].s.c1.y = PLAFON.translatie * 1.5; }, /varfuri\.2\.s\.c1\.y/],
    ['segmentul necunoscut', (f) => { f.varfuri[0].s = { tip: 'Q', c: P(1, 2) }; }, /varfuri\.0\.s/],
    ['bulge 0', (f) => { f.varfuri[0].s = { tip: 'A', bulge: 0 }; }, /bulge 0/],
    ['arcul cu capetele în același punct', (f) => { f.varfuri[1].p = { ...f.varfuri[0].p }; f.varfuri[0].s = { tip: 'A', bulge: 0.5 }; }, /capetele în același punct/],
    ['deschisă, cu ultimul segment C (ADR 0037 §2)', (f) => { f.inchis = false; }, /nu e „L”/],
    ['inchis care nu e boolean', (f) => { f.inchis = 'nu'; }, /inchis/],
    ['fără inchis', (f) => { delete f.inchis; }, /inchis/],
  ];
  for (const [nume, strica, asteptat] of cazuri) {
    const r = incarca(stricat(d, strica));
    assert.equal(r.ok, false, nume);
    assert.match(motiv(r), asteptat, nume);
  }
});

test('sub o matrice neuniformă, o cale cu arce e refuzată (arcul ar fi elipsă); una doar cu linii și cubice trece', () => {
  const neuniform = (forma: FormaDoc): Document => {
    const d = cu(forma);
    const radacina = d.piese[0]?.radacina;
    if (radacina?.tip === 'element') radacina.matrice = { a: 2, b: 0, c: 0, d: 1, e: 0, f: 0 };
    return d;
  };
  assert.match(motiv(prinUsa(neuniform(D))), /arce sub o matrice neuniformă/);
  const r = prinUsa(neuniform(INIMA));
  assert.ok(r.ok, motiv(r));
  // Conturul trece exact prin matrice: vârfurile și punctele de control, scalate pe x.
  const c = conturElement({ forma: INIMA, matrice: { a: 2, b: 0, c: 0, d: 1, e: 0, f: 0 } });
  assert.deepEqual(c.varfuri[0], { p: P(100, 10), s: { tip: 'C', c1: P(160, 40), c2: P(190, 75) } });
});

test('plafoanele căilor (ADR 0034 §2): pe o cale, pe piese și în lume', () => {
  const cale = (n: number): FormaDoc => ({
    tip: 'cale',
    inchis: true,
    varfuri: Array.from({ length: n }, (_, i): VarfDoc => ({ p: P(Math.cos((2 * Math.PI * i) / n) * 40, Math.sin((2 * Math.PI * i) / n) * 40), s: { tip: 'L' } })),
  });
  assert.ok(prinUsa(cu(cale(PLAFON.varfuriCale))).ok, 'exact plafonul unei căi');
  assert.match(motiv(prinUsa(cu(cale(PLAFON.varfuriCale + 1)))), /cel mult 50000 de vârfuri/);
  // Pe piese: cinci căi de 40 001 de vârfuri trec de 200 000.
  const piese = docDin(F, ...Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, forma: cale(40_001), matrice: { ...ID, e: 100, f: 100 } })));
  assert.match(motiv(prinUsa(piese)), /căile pieselor au 200005 de vârfuri, peste 200000/);
  // În lume: o piesă de 50 000 de vârfuri pusă de 21 de ori trece de 1 000 000.
  const una = cu(cale(50_000));
  const foaie = una.foi[0];
  if (!foaie) throw new Error('fără foaie');
  const instante = Array.from({ length: 21 }, (_, i) => ({ id: `i${i}`, piesa: 'c', x: 100, y: 100, rotire: 0 }));
  assert.ok(prinUsa({ ...una, foi: [{ ...foaie, instante: instante.slice(0, 20) }] }).ok, '20 de instanțe: exact 1 000 000');
  assert.match(motiv(prinUsa({ ...una, foi: [{ ...foaie, instante }] })), /1050000 de vârfuri de căi în lume, peste 1000000/);
});

test('migrarea v8 → v9 schimbă doar numărul; un document mai nou decât aplicația e refuzat', () => {
  const d = docDin(F, { id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 5 }, matrice: { ...ID, e: 20, f: 20 } });
  const v8 = { ...JSON.parse(JSON.stringify(d)), schema: 8 };
  const r = incarca(v8);
  assert.ok(r.ok, motiv(r));
  if (r.ok) assert.deepEqual(r.doc, d);
  assert.match(motiv(incarca({ ...v8, schema: 11 })), /versiune mai nouă \(schema 11, aici 10\)/);
  // Un document marcat v8 care conține o cale nu e un v8 valid (v8 n-o cunoaște): refuzat, și când calea stă într-un grup.
  const cuCale = incarca({ ...JSON.parse(JSON.stringify(cu(INIMA))), schema: 8 });
  assert.match(motiv(cuCale), /elementul v8 c are o formă „cale”, pe care v8 n-o cunoaște/);
  const inGrup = JSON.parse(JSON.stringify(cu(INIMA)));
  inGrup.schema = 8;
  inGrup.piese[0].radacina = { tip: 'grup', id: 'g', matrice: { ...ID }, copii: [inGrup.piese[0].radacina] };
  assert.match(motiv(incarca(inGrup)), /elementul v8 c are o formă „cale”/);
});

test('pânza desenează calea exact: cubicele ca Bézier, arcele cu centrul și raza, linia', () => {
  const [inima] = listaDesen(cu(INIMA, 100, 50));
  assert.deepEqual(inima?.cale.slice(0, 2), [{ t: 'M', x: 150, y: 60 }, { t: 'C', x1: 180, y1: 90, x2: 195, y2: 125, x: 175, y: 135 }]);
  assert.equal(inima?.cale.filter((k) => k.t === 'C').length, 4);
  assert.equal(inima?.cale.at(-1)?.t, 'Z');
  const [d] = listaDesen(cu(D, 0, 0));
  const arc = d?.cale[1];
  assert.ok(arc?.t === 'A' && Math.abs(arc.cx) < 1e-12 && Math.abs(arc.cy - 20) < 1e-12 && Math.abs(arc.r - 20) < 1e-12 && !arc.trigonometric);
  assert.deepEqual(d?.cale.slice(2), [{ t: 'L', x: 0, y: 40 }, { t: 'Z' }]);
});

/** Punctul în poligonul dat (regula razei, pe polilinia eșantionată). */
function inPoligon(p: { x: number; y: number }, poli: ReadonlyArray<{ x: number; y: number }>): boolean {
  let n = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const a = poli[i] as { x: number; y: number }, b = poli[j] as { x: number; y: number };
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) n = !n;
  }
  return n;
}

test('clicul pe cubice: includerea (evenodd) și distanța, față de inima eșantionată la 16 000 de puncte', () => {
  const c = conturElement({ forma: INIMA, matrice: { ...ID, e: 100, f: 50 } });
  const poli = inimaEsantionata(100, 50);
  let seed = 7;
  const rnd = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  let maxEroare = 0;
  for (let i = 0; i < 3000; i++) {
    const p = P(100 + rnd() * 100, 50 + rnd() * 100);
    const dRef = Math.min(...poli.map((q) => Math.hypot(q.x - p.x, q.y - p.y)));
    const d = distantaLaContur(p, c);
    // Eșantionarea de referință are pasul de ~0,01 mm, deci referința e cu atât mai mare, cel mult.
    assert.ok(d <= dRef + 1e-9, `distanța ${d} > referința ${dRef} în (${p.x}, ${p.y})`);
    maxEroare = Math.max(maxEroare, dRef - d);
    if (dRef > 0.05) assert.equal(inRegiune(p, [c]), inPoligon(p, poli), `includerea în (${p.x}, ${p.y})`);
  }
  assert.ok(maxEroare < 0.01, `distanța diferă de referință cu ${maxEroare}`);
  // Pe curbă: punctul primei cubice de la t = 0,3, în lume (172,41; 87,54).
  assert.ok(distantaLaContur(P(172.41, 87.54), c) < 1e-9, 'punctul curbei');
});

test('clicul alege calea: înăuntru, lângă curbă (în toleranță), nu departe și nu între lobi', () => {
  const d = cu(INIMA, 100, 50);
  assert.equal(instantaLa(d, 150, 100, 0.5), 'c', 'înăuntru');
  assert.equal(instantaLa(d, 150, 140, 0.5), null, 'deasupra scobiturii de sus, între lobi');
  assert.equal(instantaLa(d, 150, 59.7, 0.5), 'c', 'sub vârful de jos, în toleranță');
  assert.equal(instantaLa(d, 150, 58, 0.5), null, 'sub vârful de jos, departe');
});

test('distanța lângă capătul unei cubice (oracolul 2.7b): mânerul retras, unde B′(0) = 0, și minimul de lângă capăt', () => {
  // Newton pornit din capăt nu se mișca: aplicația întorcea distanța până la capăt (0,3 mm, respectiv 2,3246).
  const retras = { inchis: true, varfuri: [{ p: P(95, 30), s: { tip: 'C' as const, c1: P(95, 30), c2: P(95, 5) } }, { p: P(75, 5), s: { tip: 'L' as const } }, { p: P(75, 60), s: { tip: 'L' as const } }] };
  assert.ok(Math.abs(distantaLaContur(P(95, 29.7), retras) - 0.005403264) < 1e-8);
  const aproape = { inchis: true, varfuri: [{ p: P(142.5, 102.5), s: { tip: 'C' as const, c1: P(142, 100), c2: P(134.1, 90.9) } }, { p: P(120.5, 87.5), s: { tip: 'L' as const } }, { p: P(300, 300), s: { tip: 'L' as const } }] };
  assert.ok(Math.abs(distantaLaContur(P(140.19442031171639, 102.79700300691184), aproape) - 2.283196288) < 1e-8);
});
