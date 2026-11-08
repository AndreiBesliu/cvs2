/**
 * Piesele plate cu trepte și piesa „după CNC” (ADR 0191, felia 3.6l), pe hârtie: booleanele prin normalizare (cu cutia),
 * capsulele frezei, benzile unei piese, cheia fiecărui strat, citirea „după CNC” dintr-un document (marginea din profilele prin
 * tot, treptele, golurile, V-carve-ul numărat), felierea cu trepte (suprafața de sus a treptei, plinul de sub ea, pereții de
 * deasupra, călcarea după felul ales, deplasările pe conturul benzii) și înălțimea fiecărei piese ținută în proiect.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { arieCuSemn, cerculArcului, numarSegmente, segment, type Contur, type Punct, type Segment } from '../../src/geom/contur.ts';
import { conturCerc, conturDreptunghi } from '../../src/geom/conturBaza.ts';
import { inRegiune } from '../../src/geom/distanta.ts';
import { citesteFel, felStrat, felStratTrepte } from '../../src/cam/feliere/fel.ts';
import { feliaza, GROSIMI_VERTICALE, setariImplicite, setariValide, type Cale, type PiesaPlata } from '../../src/cam/feliere/index.ts';
import { CALITATI, pas } from '../../src/cam/feliere/profil.ts';
import { numeObiect, pieseDinDocument } from '../../src/cam/feliere/piese.ts';
import {
  arieFigura, benziPiesa, capsule, combina, deschidere, ingusteazaPlin, regularizeazaPlin, type Treapta,
} from '../../src/cam/feliere/trepte.ts';
import { comandaInaltimi } from '../../src/model/inaltimeImprimanta.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { anuleaza, executa, istoricNou } from '../../src/model/jurnal.ts';
import type { Document } from '../../src/model/document.ts';

const DATA = '2026-11-08 at 10:00:00';
const S = setariImplicite('pla', '0.2');
const aproape = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) <= eps;
const piesa = (contururi: Contur[], inaltime: number, trepte?: Treapta[], eticheta = 'Placă', k = 0): PiesaPlata => ({
  id: `i${k}`, nume: numeObiect(eticheta, k), eticheta, contururi, inaltime, ...(trepte ? { trepte } : {}),
});
const roluri = (c: readonly Cale[]): Record<string, number> => {
  const r: Record<string, number> = {};
  for (const x of c) r[x.rol] = (r[x.rol] ?? 0) + 1;
  return r;
};
/**
 * Punctele căilor cu rolul dat: vârfurile și, pe fiecare segment, câte unul la cel mult 0,25 mm (o linie care traversează o
 * regiune n-are neapărat un vârf în ea; otrava S04, scăpată la prima rulare, o arăta).
 */
const puncteRol = (c: readonly Cale[], rol: string): Punct[] => c.filter((x) => x.rol === rol).flatMap((x) => {
  const r: Punct[] = [];
  const n = x.p.length / 2, m = x.inchisa ? n : n - 1;
  for (let i = 0; i < n; i++) r.push({ x: x.p[2 * i]!, y: x.p[2 * i + 1]! });
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % n, ax = x.p[2 * i]!, ay = x.p[2 * i + 1]!, bx = x.p[2 * j]!, by = x.p[2 * j + 1]!;
    const k = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.25);
    for (let t = 1; t < k; t++) r.push({ x: ax + ((bx - ax) * t) / k, y: ay + ((by - ay) * t) / k });
  }
  return r;
});
const inDreptunghi = (p: Punct, x0: number, y0: number, x1: number, y1: number): boolean => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1;

test('combina, pe hârtie: un buzunar care atinge două margini și un cerc, scăzute; intersecția; o treaptă care iese din piesă; reuniunea', () => {
  const R0 = [conturDreptunghi(0, 0, 100, 60), conturCerc(20, 30, 5)];
  const d = combina([{ c: R0, compl: true }, { c: [conturDreptunghi(60, 0, 40, 30), conturCerc(40, 30, 4)], infasurare: true }]);
  assert.ok(typeof d !== 'string', String(d));
  assert.ok(aproape(arieFigura(d), 6000 - 25 * Math.PI - 1200 - 16 * Math.PI), String(arieFigura(d)));
  const i = combina([{ c: R0, compl: true }, { c: [conturDreptunghi(60, 0, 40, 30)], compl: true }]);
  assert.ok(typeof i !== 'string' && aproape(arieFigura(i), 1200));
  const e = combina([{ c: R0, compl: true }, { c: [conturDreptunghi(80, 40, 40, 40)], infasurare: true }]);
  assert.ok(typeof e !== 'string' && aproape(arieFigura(e), 6000 - 25 * Math.PI - 400));
  const u = combina([{ c: [conturDreptunghi(0, 0, 10, 10), conturDreptunghi(5, 5, 10, 10)], infasurare: true }]);
  assert.ok(typeof u !== 'string' && aproape(arieFigura(u), 175));
});

/** Distanța de la p la segmentul i al căii c (linie sau arc). */
function distSegment(p: Punct, a: Punct, b: Punct, s: Segment): number {
  if (s.tip === 'A') {
    const { centru: o, raza: R, start, baleiaj } = cerculArcului(a, b, s.bulge);
    let dl = (Math.atan2(p.y - o.y, p.x - o.x) - start) * Math.sign(baleiaj);
    dl = ((dl % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (dl <= Math.abs(baleiaj)) return Math.abs(Math.hypot(p.x - o.x, p.y - o.y) - R);
    return Math.min(Math.hypot(p.x - a.x, p.y - a.y), Math.hypot(p.x - b.x, p.y - b.y));
  }
  const ex = b.x - a.x, ey = b.y - a.y, l2 = ex * ex + ey * ey;
  const t = l2 > 0 ? Math.min(1, Math.max(0, ((p.x - a.x) * ex + (p.y - a.y) * ey) / l2)) : 0;
  return Math.hypot(p.x - a.x - ex * t, p.y - a.y - ey * t);
}
const distCale = (p: Punct, c: Contur): number => {
  let d = Infinity;
  for (let i = 0; i < numarSegmente(c); i++) { const { a, b, s } = segment(c, i); d = Math.min(d, distSegment(p, a, b, s)); }
  return d;
};

test('capsulele: ce scoate freza purtată pe o cale sunt exact punctele la cel mult r de ea (linii, un arc peste r, unul sub r, o cale închisă)', () => {
  const r = 3;
  const cai: Contur[] = [
    // O linie, un arc de 90° (R 10, peste r), încă o linie.
    { inchis: false, varfuri: [{ p: { x: 10, y: 10 }, s: { tip: 'L' } }, { p: { x: 40, y: 10 }, s: { tip: 'A', bulge: Math.tan(Math.PI / 8) } }, { p: { x: 50, y: 20 }, s: { tip: 'L' } }, { p: { x: 50, y: 40 }, s: { tip: 'L' } }] },
    // Un semicerc orar de rază 2 (sub r): felia și discurile capetelor.
    { inchis: false, varfuri: [{ p: { x: 70, y: 10 }, s: { tip: 'A', bulge: -1 } }, { p: { x: 74, y: 10 }, s: { tip: 'L' } }] },
    // O cale închisă, orară, cu colțuri rotunde.
    (() => { const c = conturDreptunghi(80, 30, 20, 14, 4); return { inchis: true, varfuri: [...c.varfuri].reverse().map((v, k, l) => ({ p: v.p, s: (l[(k + 1) % l.length]!.s.tip === 'A' ? { tip: 'A', bulge: -(l[(k + 1) % l.length]!.s as { bulge: number }).bulge } : { tip: 'L' }) as Segment })) }; })(),
  ];
  for (const c of cai) {
    const u = combina([{ c: capsule(c, r), infasurare: true }]);
    assert.ok(typeof u !== 'string', String(u));
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const v of c.varfuri) { x0 = Math.min(x0, v.p.x); x1 = Math.max(x1, v.p.x); y0 = Math.min(y0, v.p.y); y1 = Math.max(y1, v.p.y); }
    let verificate = 0;
    for (let x = x0 - r - 2; x <= x1 + r + 2; x += 0.37) {
      for (let y = y0 - r - 2; y <= y1 + r + 2; y += 0.37) {
        const p = { x, y }, d = distCale(p, c);
        if (Math.abs(d - r) < 0.02) continue;
        assert.equal(inRegiune(p, u), d < r, `(${x.toFixed(2)}, ${y.toFixed(2)}): la ${d.toFixed(3)} de cale`);
        verificate++;
      }
    }
    assert.ok(verificate > 1000, String(verificate));
  }
});

test('benzile, pe hârtie: 18 mm, cu buzunarul la 12 și găurirea la 15: benzile încep la 1, 61 și 76, din 90 de straturi, cu ariile lor', () => {
  const R0 = [conturDreptunghi(0, 0, 100, 60), conturCerc(15, 30, 5)];
  const t: Treapta[] = [{ contururi: [conturDreptunghi(50, 15, 40, 30)], inaltime: 12 }, { contururi: [conturCerc(30, 15, 4)], inaltime: 15 }];
  const b = benziPiesa(R0, t, 18, S);
  assert.ok(typeof b !== 'string', String(b));
  assert.deepEqual(b.inceput, [1, 61, 76]);
  assert.equal(b.n, 90);
  const a0 = 6000 - 25 * Math.PI;
  assert.deepEqual(b.regiuni.map((r) => Number(arieFigura(r).toFixed(6))), [a0, a0 - 1200, a0 - 1200 - 16 * Math.PI].map((x) => Number(x.toFixed(6))));
  // O treaptă cuprinsă în una mai joasă nu face o bandă (aceeași regiune); una mai înaltă decât piesa sau în afara ei, nici.
  const cuprinsa = benziPiesa(R0, [t[0]!, { contururi: [conturCerc(70, 30, 4)], inaltime: 15 }], 18, S);
  assert.ok(typeof cuprinsa !== 'string' && cuprinsa.inceput.length === 2 && cuprinsa.inceput[1] === 61);
  const fara = benziPiesa(R0, [{ contururi: [conturDreptunghi(50, 15, 40, 30)], inaltime: 18 }, { contururi: [conturDreptunghi(200, 0, 10, 10)], inaltime: 5 }], 18, S);
  assert.ok(typeof fara !== 'string' && fara.regiuni.length === 1 && fara.n === 90);
  // O treaptă peste toată piesa o oprește la vârful ei: 10 mm, 50 de straturi, o singură bandă.
  const toata = benziPiesa(R0, [{ contururi: [conturDreptunghi(-10, -10, 120, 80)], inaltime: 10 }], 18, S);
  assert.ok(typeof toata !== 'string' && toata.regiuni.length === 1 && toata.n === 50);
});

test('felul straturilor cu trepte, pe hârtie (5 straturi de sus, 3 de jos): plinul de jos, plinul sub fundul buzunarului, fața lui, banda de deasupra, fața piesei', () => {
  assert.equal(S.sus, 5); assert.equal(S.jos, 3); assert.equal(S.susMinim, 0.8);
  const inc = [1, 61, 76], f = (k: number) => citesteFel(felStratTrepte(k, 90, inc, S));
  assert.equal(felStratTrepte(1, 90, inc, S), felStrat(1, 90, S));
  const benzi = (k: number) => { const x = f(k); return [x.tip, x.trepte?.b, x.trepte?.b1, x.trepte?.bs]; };
  assert.deepEqual(benzi(2), ['plin', 0, 0, -1]);
  assert.deepEqual(benzi(55), ['rar', 0, 0, 0]);
  assert.deepEqual(benzi(56), ['trepta', 0, 0, 1]);
  assert.deepEqual(benzi(60), ['trepta', 0, 1, 1]);
  assert.deepEqual(benzi(61), ['rar', 1, 1, 1]);
  assert.deepEqual(benzi(71), ['trepta', 1, 1, 2]);
  assert.deepEqual(benzi(75), ['trepta', 1, 2, 2]);
  assert.deepEqual(benzi(85), ['rar', 2, 2, 2]);
  assert.deepEqual(benzi(86), ['plin', 2, 2, -1]);
  assert.deepEqual(benzi(90), ['sus', 2, -1, -1]);
  // Cheile: monotonul (plinul) și monotonul pe linii (sus) se întorc cu 90° pe straturile pare; grila (rarul), nu.
  assert.equal(felStratTrepte(56, 90, inc, S), 't:0:0:1::135:45:');
  // Grosimea verticală „toată” (implicită, 3.6n): bt e banda stratului k + 4 (raza plinului de sus), cel mult a vârfului; pe 57–60,
  // pereții benzii 1 (de la 61) sunt în rază, deci cheia o ține. Fără grosimea verticală, cheile de la 3.6l.
  assert.deepEqual([56, 57, 59, 60, 61, 71, 72, 75, 76, 86].map((k) => f(k).trepte?.bt), [0, 1, 1, 1, 1, 1, 2, 2, 2, 2]);
  assert.equal(felStratTrepte(57, 90, inc, S), 't:0:0:1::45:45::1');
  assert.equal(felStratTrepte(60, 90, inc, S), 't:0:1:1:135:135:45::1');
  const fara = setariValide({ ...S, grosimeVerticala: 'none' });
  assert.equal(felStratTrepte(57, 90, inc, fara), 't:0:0:1::45:45:');
  assert.equal(felStratTrepte(60, 90, inc, fara), 't:0:1:1:135:135:45:');
  assert.equal(felStratTrepte(62, 90, inc, S), felStratTrepte(64, 90, inc, S));
  // Umplerea de 100 %: sub fundul buzunarului, tot plin; pe fund, suprafața de sus și plinul.
  const plin = setariValide({ ...S, umplere: 1 });
  assert.deepEqual([citesteFel(felStratTrepte(56, 90, inc, plin)).tip, citesteFel(felStratTrepte(56, 90, inc, plin)).trepte?.bs], ['plin', -1]);
  assert.equal(felStratTrepte(60, 90, inc, plin), 't:0:1:-1:135:135::');
  // Cubicul (3D) ține Z-ul în cheie, doar unde e umplere rară.
  const cubic = setariValide({ ...S, modelRar: 'cubic' });
  assert.equal(citesteFel(felStratTrepte(61, 90, inc, cubic)).z, 12.2);
  assert.equal(citesteFel(felStratTrepte(86, 90, inc, cubic)).z, null);
});

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const SCULA = { numar: 1, nume: 'freza plata', diametru: 6 };
const op = (id: string, tip: string, noduri: string[], latura: string, adancime: number, extra: Record<string, unknown> = {}) => ({
  id, tip, noduri, scula: { ...SCULA }, latura, sens: 'urcare', adancime, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null,
  ...(tip === 'buzunar' ? { pasLateral: 2.4 } : {}), ...extra,
});
const el = (id: string, forma: Record<string, unknown>, e = 0, f = 0) => ({ tip: 'element', id, matrice: { ...I, e, f }, forma });
const cale = (pts: [number, number][], inchis = false) => ({ tip: 'cale', inchis, varfuri: pts.map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' } })) });
/** Un document v20 cu o piesă (elementele, operațiile) pe o foaie de 200 × 150 × 18. */
function documentCu(elemente: unknown[], operatii: unknown[]): Document {
  const r = incarca({
    schema: 20, rev: 0, piese: [{ id: 'p', nume: 'Placă', radacina: { tip: 'grup', id: 'g', matrice: { ...I }, copii: elemente }, operatii }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  });
  if (!r.ok) throw new Error(r.motiv);
  return r.doc;
}
const PLACA = [
  el('a', cale([[0, 0], [100, 0], [100, 60], [0, 60]], true)), el('b', cale([[50, 15], [90, 15], [90, 45], [50, 45]], true)),
  el('c', { tip: 'cerc', raza: 5 }, 15, 30), el('d', { tip: 'cerc', raza: 4 }, 30, 15), el('e', cale([[10, 50], [40, 50]])),
  el('v', cale([[20, 5], [30, 5], [30, 10], [20, 10]], true)),
];
const OPERATII = [
  op('o1', 'profil', ['a'], 'exterior', 18.5), op('o2', 'buzunar', ['b'], 'interior', 6), op('o3', 'gaurire', ['c'], 'interior', 19),
  op('o4', 'gaurire', ['d'], 'interior', 3), op('o5', 'profil', ['e'], 'pe-linie', 2),
  op('o6', 'vcarve', ['v'], 'interior', 2, { scula: { numar: 2, nume: 'V', diametru: 10, forma: { tip: 'v', unghi: 60 } } }),
];
const ariiTrepte = (p: PiesaPlata): [number, number][] => (p.trepte ?? []).map((t) => [t.inaltime, Number(t.contururi.reduce((s, c) => s + arieCuSemn(c), 0).toFixed(6))]);

test('după CNC, dintr-un document: marginea din profilul prin tot, gaura prin tot, treptele (buzunar, găurire, canelură), V-carve-ul numărat; la altă înălțime, adâncimile rămân în mm', () => {
  const doc = documentCu(PLACA, OPERATII);
  const a = pieseDinDocument(doc, { fel: 'foaie' }, 18, [220, 220], { dupaCnc: true });
  assert.deepEqual(a.refuzate, []);
  assert.equal(a.vcarve, 1);
  assert.equal(a.deschise, 0);
  const p = a.piese[0]!;
  assert.equal(p.contururi.length, 2);
  assert.ok(aproape(arieFigura(p.contururi), 6000 - 25 * Math.PI), String(arieFigura(p.contururi)));
  // Găurirea de 3 mm (cercul), canelura pe linie de 2 mm (30 × 6, cu capetele rotunde), buzunarul de 6 mm.
  assert.deepEqual(ariiTrepte(p), [[15, Number((16 * Math.PI).toFixed(6))], [16, Number((180 + 9 * Math.PI).toFixed(6))], [12, 1200]]);
  // Fără „după CNC”, piesa e a formelor desenate: fiecare formă închisă dinăuntru e gaură, oricare ar fi operația ei.
  const forme = pieseDinDocument(doc, { fel: 'foaie' }, 18, [220, 220]);
  assert.ok(aproape(arieFigura(forme.piese[0]!.contururi), 6000 - 1200 - 25 * Math.PI - 16 * Math.PI - 50));
  assert.equal(forme.piese[0]!.trepte, undefined);
  // La 10 mm (înălțimea piesei, ținută în proiect): buzunarul de 6 rămâne de 6, găurirea de 3, de 3, canelura de 2, de 2.
  const zece = pieseDinDocument(doc, { fel: 'foaie' }, 18, [220, 220], { dupaCnc: true, inaltimi: new Map([['p', 10]]) });
  assert.equal(zece.piese[0]!.inaltime, 10);
  assert.deepEqual(zece.piese[0]!.trepte!.map((t) => t.inaltime), [7, 8, 4]);
  // La 5 mm, buzunarul de 6 trece prin tot: e gaură.
  const cinci = pieseDinDocument(doc, { fel: 'foaie' }, 5, [220, 220], { dupaCnc: true });
  assert.ok(aproape(arieFigura(cinci.piese[0]!.contururi), 6000 - 25 * Math.PI - 1200));
  assert.deepEqual(cinci.piese[0]!.trepte!.map((t) => t.inaltime), [2, 3]);
  // La 20 mm (mai înaltă decât foaia), găurirea prin tot (19 mm) rămâne gaură: contează intenția de pe CNC, nu înălțimea.
  const douazeci = pieseDinDocument(doc, { fel: 'foaie' }, 20, [220, 220], { dupaCnc: true });
  assert.ok(aproape(arieFigura(douazeci.piese[0]!.contururi), 6000 - 25 * Math.PI));
  assert.deepEqual(douazeci.piese[0]!.trepte!.map((t) => t.inaltime), [17, 18, 14]);
  // Felierea: 90 de straturi; fundul buzunarului e stratul 60, găurirea 75, canelura 80.
  const f = feliaza(a.piese, S, { data: DATA });
  assert.deepEqual(f.avertismente, []);
  assert.equal(f.gcode?.straturi, 90);
  const tip = (k: number) => citesteFel(f.gcode!.plan[k - 1]!.piese[0]!.fel).trepte;
  assert.deepEqual([tip(60)?.b1, tip(61)?.b, tip(75)?.b1, tip(76)?.b, tip(80)?.b1, tip(81)?.b], [1, 1, 2, 2, 3, 3]);
  // Fundul găuririi de 3 mm (stratul 75, în banda buzunarului): pereții benzii lui, în jurul piesei, al găurii și al buzunarului.
  assert.equal(f.cai(75).filter((c) => c.rol === 'exterior').length, 3);
});

test('după CNC, refuzurile: fără profil exterior prin tot, piesa n-are margine; două inele prin tot care se ating, cu motivul regiunii păstrate', () => {
  const partial = documentCu([el('a', cale([[0, 0], [100, 0], [100, 60], [0, 60]], true))], [op('o1', 'profil', ['a'], 'exterior', 6)]);
  assert.deepEqual(pieseDinDocument(partial, { fel: 'foaie' }, 18, [220, 220], { dupaCnc: true }).refuzate, [{ eticheta: 'Placă', motiv: 'fara-margine' }]);
  const ating = documentCu(
    [el('a', cale([[0, 0], [100, 0], [100, 60], [0, 60]], true)), el('b', cale([[0, 0], [30, 0], [30, 30], [0, 30]], true))],
    [op('o1', 'profil', ['a'], 'exterior', 18), op('o2', 'profil', ['b'], 'interior', 18)],
  );
  const r = pieseDinDocument(ating, { fel: 'foaie' }, 18, [220, 220], { dupaCnc: true }).refuzate;
  assert.equal(r.length, 1);
  assert.equal(r[0]!.motiv, 'cnc');
  assert.match(r[0]!.detaliu ?? '', /^regiunea păstrată:/);
});

test('după CNC: o formă fără operație nu e gaură; insula unui buzunar rămâne la toată înălțimea; profilul parțial pe exterior e canelura frezei în jurul conturului; pe o parte, banda e de partea ei', () => {
  const contur = el('a', cale([[0, 0], [100, 0], [100, 60], [0, 60]], true));
  const ext = op('o1', 'profil', ['a'], 'exterior', 18);
  const doar = documentCu([contur, el('x', cale([[40, 20], [60, 20], [60, 40], [40, 40]], true))], [ext]);
  const d0 = pieseDinDocument(doar, { fel: 'foaie' }, 18, [220, 220], { dupaCnc: true }).piese[0]!;
  assert.ok(aproape(arieFigura(d0.contururi), 6000));
  assert.equal(d0.trepte, undefined);
  // Buzunarul de 40 × 30 cu o insulă de 10 × 10, aceeași adâncime: treapta e inelul dintre ele (1 100 mm²).
  const insula = documentCu(
    [contur, el('b', cale([[50, 15], [90, 15], [90, 45], [50, 45]], true)), el('i', cale([[65, 25], [75, 25], [75, 35], [65, 35]], true))],
    [ext, op('o2', 'buzunar', ['b', 'i'], 'interior', 6)],
  );
  const pi = pieseDinDocument(insula, { fel: 'foaie' }, 18, [220, 220], { dupaCnc: true }).piese[0]!;
  assert.deepEqual(ariiTrepte(pi), [[12, 1100]]);
  const fi = feliaza([pi], S, { data: DATA });
  const peste = fi.cai(61);
  // Deasupra treptei: pereții exteriori în jurul piesei, al buzunarului și al insulei (trei bucle).
  assert.equal(peste.filter((c) => c.rol === 'exterior').length, 3);
  // Profilul parțial (2 mm) pe exteriorul unui pătrat de 20 dinăuntru: o canelură de lățimea frezei (6), 4·20·6 + 36π.
  const canelura = documentCu([contur, el('q', cale([[40, 20], [60, 20], [60, 40], [40, 40]], true))], [ext, op('o2', 'profil', ['q'], 'exterior', 2)]);
  const pc = pieseDinDocument(canelura, { fel: 'foaie' }, 18, [220, 220], { dupaCnc: true }).piese[0]!;
  const uc = combina([{ c: pc.trepte![0]!.contururi, infasurare: true }]);
  assert.ok(typeof uc !== 'string' && aproape(arieFigura(uc), 480 + 36 * Math.PI, 1e-5), String(typeof uc === 'string' ? uc : arieFigura(uc)));
  assert.equal(pc.trepte![0]!.inaltime, 16);
  // Pe o parte (stânga, cu calea spre +X): banda de 6 mm stă deasupra liniei, cu capetele rotunde (30 · 6 + 9π).
  const stanga = documentCu([contur, el('s', cale([[10, 30], [40, 30]]))], [ext, op('o2', 'profil', ['s'], 'stanga', 2)]);
  const ps = pieseDinDocument(stanga, { fel: 'foaie' }, 18, [220, 220], { dupaCnc: true }).piese[0]!;
  const us = combina([{ c: ps.trepte![0]!.contururi, infasurare: true }]);
  assert.ok(typeof us !== 'string' && aproape(arieFigura(us), 180 + 9 * Math.PI, 1e-5));
  // Centrată pe pat: 100 × 60 la (60, 80); linia de la (70, 110) la (100, 110), banda deasupra ei.
  assert.ok(typeof us !== 'string' && inRegiune({ x: 85, y: 113 }, us) && !inRegiune({ x: 85, y: 107 }, us));
  // Oglindită (X întors), aceeași cale merge spre −X, iar stânga desenului e dreapta pe foaie: banda tot deasupra liniei.
  const oglinda = documentCu(
    [contur, { tip: 'element', id: 's', matrice: { a: -1, b: 0, c: 0, d: 1, e: 100, f: 0 }, forma: cale([[10, 30], [40, 30]]) }],
    [ext, op('o2', 'profil', ['s'], 'stanga', 2)],
  );
  const po = pieseDinDocument(oglinda, { fel: 'foaie' }, 18, [220, 220], { dupaCnc: true }).piese[0]!;
  const uo = combina([{ c: po.trepte![0]!.contururi, infasurare: true }]);
  assert.ok(typeof uo !== 'string' && inRegiune({ x: 135, y: 113 }, uo) && !inRegiune({ x: 135, y: 107 }, uo));
  // Un profil interior prin tot e gol; un profil pe linie cu freza în V e o gravură: se numără, nu face treaptă.
  const gol = documentCu(
    [contur, el('h', cale([[40, 20], [60, 20], [60, 40], [40, 40]], true)), el('w', cale([[10, 50], [40, 50]]))],
    [ext, op('o2', 'profil', ['h'], 'interior', 18), op('o3', 'profil', ['w'], 'pe-linie', 1, { scula: { numar: 2, nume: 'V', diametru: 6, forma: { tip: 'v', unghi: 90 } } })],
  );
  const ag = pieseDinDocument(gol, { fel: 'foaie' }, 18, [220, 220], { dupaCnc: true });
  assert.ok(aproape(arieFigura(ag.piese[0]!.contururi), 6000 - 400));
  assert.equal(ag.piese[0]!.trepte, undefined);
  assert.equal(ag.vcarve, 1);
});

test('treptele, ce nu iese: un perete subțire lăsat de buzunar lângă margine, sub o linie, e spus (pe banda de deasupra treptei)', () => {
  // Placa de 100 × 60, cu buzunarul care lasă 0,3 mm din peretele din stânga: deasupra lui, peretele nu iese.
  const p = piesa([conturDreptunghi(60, 80, 100, 60)], 6, [{ contururi: [conturDreptunghi(60.3, 90, 40, 40)], inaltime: 2 }]);
  const a = feliaza([p], S, { data: DATA }).avertismente.find((x) => x.fel === 'subtire');
  assert.ok(a && a.fel === 'subtire' && a.arie > 10 && a.arie < 14, JSON.stringify(a));
  assert.equal(feliaza([piesa([conturDreptunghi(60, 80, 100, 60)], 6)], S, { data: DATA }).avertismente.length, 0);
});

test('felierea cu trepte (fără grosimea verticală, ca la 3.6l): fundul buzunarului (60) are suprafața de sus doar în buzunar, rarul doar în afară; sub el, plinul în buzunar; deasupra, pereții lui; călcarea după felul ales', () => {
  // Placa 100 × 60 pe pat (60…160 × 80…140), buzunarul de 6 mm la 110…150 × 95…125.
  const p = piesa([conturDreptunghi(60, 80, 100, 60)], 18, [{ contururi: [conturDreptunghi(110, 95, 40, 30)], inaltime: 12 }]);
  const inBuzunar = (q: Punct, m: number) => inDreptunghi(q, 110 - m, 95 - m, 150 + m, 125 + m);
  for (const calcare of ['nu', 'sus', 'ultima', 'plin'] as const) {
    const r = feliaza([p], setariValide({ ...S, calcare, grosimeVerticala: 'none' }), { data: DATA });
    assert.deepEqual(r.avertismente, [], calcare);
    assert.equal(r.gcode?.straturi, 90);
    const fund = r.cai(60), sub = r.cai(59), rar = r.cai(55), peste = r.cai(61);
    assert.ok(puncteRol(fund, 'sus').length > 0 && puncteRol(fund, 'sus').every((q) => inBuzunar(q, 0.5)), calcare);
    assert.ok(puncteRol(fund, 'rar').every((q) => !inBuzunar(q, -0.5)));
    assert.ok(puncteRol(sub, 'plin').length > 0 && puncteRol(sub, 'plin').every((q) => inBuzunar(q, 0.5)));
    assert.equal(roluri(sub)['sus'], undefined);
    assert.equal(roluri(rar)['plin'], undefined);
    assert.equal(peste.filter((c) => c.rol === 'exterior').length, 2);
    assert.ok(puncteRol(peste, 'rar').length > 0 && puncteRol(peste, 'rar').every((q) => !inBuzunar(q, -0.5)));
    const calcate = (k: number) => puncteRol(r.cai(k), 'calcare');
    if (calcare === 'nu') for (const k of [2, 59, 60, 90]) assert.equal(calcate(k).length, 0);
    if (calcare === 'sus') {
      assert.ok(calcate(60).length > 0 && calcate(60).every((q) => inBuzunar(q, 1e-6)));
      assert.ok(calcate(90).length > 0);
      assert.equal(calcate(59).length, 0);
    }
    if (calcare === 'ultima') { assert.equal(calcate(60).length, 0); assert.ok(calcate(90).length > 0); }
    if (calcare === 'plin') {
      assert.ok(calcate(59).length > 0 && calcate(59).every((q) => inBuzunar(q, 1e-6)));
      // Plinul de jos e peste toată placa: călcarea lui o acoperă toată (capetele liniilor, de la o margine la alta).
      const c2 = calcate(2);
      const x0 = c2.reduce((a, q) => Math.min(a, q.x), Infinity), x1 = c2.reduce((a, q) => Math.max(a, q.x), -Infinity);
      const y0 = c2.reduce((a, q) => Math.min(a, q.y), Infinity), y1 = c2.reduce((a, q) => Math.max(a, q.y), -Infinity);
      assert.ok(x0 < 61 && x1 > 159 && y0 < 81 && y1 > 139, `${x0}…${x1} × ${y0}…${y1}`);
      assert.equal(calcate(55).length, 0);
    }
  }
  const text = feliaza([p], S, { data: DATA }).gcode!.text;
  assert.equal(text.split('\n').filter((l) => l === ';LAYER_CHANGE').length, 90);
  assert.ok(text.includes('\n;Z:12\n'));
  // Fața treptei, concentrică: prima buclă la jumătate de pas de marginea ei (nu peste pereții de deasupra), apoi spre centru.
  const conc = feliaza([p], setariValide({ ...S, modelSus: 'concentric' }), { data: DATA }).cai(60);
  const q = puncteRol(conc, 'sus');
  assert.ok(q.length > 0 && q.every((x) => inBuzunar(x, -0.15)), String(q.find((x) => !inBuzunar(x, -0.15)) && JSON.stringify(q.find((x) => !inBuzunar(x, -0.15)))));
  assert.ok(q.some((x) => !inBuzunar(x, -0.25)));
});

test('fără trepte, nimic nu se schimbă: treptele goale, una în afara piesei sau una mai înaltă decât ea dau același fișier ca piesa simplă', () => {
  const c = [conturDreptunghi(60, 80, 100, 60), conturCerc(90, 110, 6)];
  const simplu = feliaza([piesa(c, 3)], S, { data: DATA }).gcode!.text;
  for (const t of [[], [{ contururi: [conturDreptunghi(0, 0, 20, 20)], inaltime: 1 }], [{ contururi: [conturDreptunghi(100, 90, 20, 20)], inaltime: 3 }]]) {
    assert.equal(feliaza([piesa(c, 3, t)], S, { data: DATA }).gcode!.text, simplu, JSON.stringify(t.map((x) => x.inaltime)));
  }
});

test('deplasările de deasupra unei trepte se judecă pe conturul benzii: peste golul treptei, retrageri ca la piesa cu golul prin tot', () => {
  // Placa 100 × 30, tăiată de treaptă (la 2 mm) pe toată lățimea, la mijloc: deasupra, două insule; ca două plăci de 40 × 30.
  const cu = piesa([conturDreptunghi(60, 90, 100, 30)], 6, [{ contururi: [conturDreptunghi(100, 85, 20, 40)], inaltime: 2 }]);
  const doua = piesa([conturDreptunghi(60, 90, 40, 30), conturDreptunghi(120, 90, 40, 30)], 6);
  const strat = (text: string, k: number): string[] => {
    const l = text.split('\n'), z = (0.2 * k).toFixed(1).replace(/\.0$/, '');
    const i = l.indexOf(`;Z:${z}`), j = l.indexOf(';LAYER_CHANGE', i);
    return l.slice(i, j < 0 ? undefined : j);
  };
  const retrageri = (s: string[]) => s.filter((x) => /^G1 (X\S+ Y\S+ )?E-/.test(x)).length;
  const a = strat(feliaza([cu], S, { data: DATA }).gcode!.text, 20), b = strat(feliaza([doua], S, { data: DATA }).gcode!.text, 20);
  assert.ok(retrageri(b) > 0);
  assert.equal(retrageri(a), retrageri(b));
});

test('înălțimea în proiect: comanda o pune, o schimbă și o scoate, într-un pas, cu anularea; schema o ține și refuză una care nu e pozitivă', () => {
  const doc = documentCu(PLACA, OPERATII);
  const doi: Document = { ...doc, piese: [...doc.piese, { ...doc.piese[0]!, id: 'q', nume: 'Distanțier' }] };
  const c = comandaInaltimi(doi, new Map([['p', 10], ['q', null]]));
  assert.equal(c?.tip, 'inlocuieste-piesa');
  const h = executa(istoricNou(doi), c!);
  assert.equal(h.doc.piese[0]!.inaltimeImprimanta, 10);
  assert.ok(!('inaltimeImprimanta' in anuleaza(h).doc.piese[0]!));
  assert.equal(comandaInaltimi(h.doc, new Map([['p', 10]])), null);
  assert.equal(comandaInaltimi(h.doc, new Map([['p', -1], ['nu-e', 5], ['q', Number.NaN]])), null);
  const lot = comandaInaltimi(h.doc, new Map([['p', null], ['q', 5]]));
  assert.equal(lot?.tip, 'lot');
  const h2 = executa(h, lot!);
  assert.ok(!('inaltimeImprimanta' in h2.doc.piese[0]!));
  assert.equal(h2.doc.piese[1]!.inaltimeImprimanta, 5);
  // Schema: câmpul e ținut la încărcare; zero sau negativ, refuzat.
  const json = JSON.parse(JSON.stringify(h2.doc)) as Record<string, unknown>;
  const r = incarca(json);
  assert.ok(r.ok && r.doc.piese[1]!.inaltimeImprimanta === 5);
  for (const v of [0, -3]) {
    const rau = JSON.parse(JSON.stringify(json)) as { piese: Record<string, unknown>[] };
    rau.piese[1]!['inaltimeImprimanta'] = v;
    assert.equal(incarca(rau).ok, false, String(v));
  }
});

test('grosimea verticală (3.6n): implicitul din profilele K1C; în subsolul fișierului; „toată” pune plin și sub pereții de deasupra buzunarului (inelul de 0,906 mm, pe straturile 57–60), cu călcarea plinului peste el; celelalte, doar buzunarul', () => {
  const o = JSON.parse(readFileSync('test/fixtures/imprimanta/orca-k1.json', 'utf8')) as { procese: Record<string, Record<string, string>> };
  for (const c of CALITATI) {
    const x = Object.entries(o.procese).find(([k]) => k.startsWith(`${c.id}mm`))?.[1];
    assert.equal(setariImplicite('pla', c.id).grosimeVerticala, x?.['ensure_vertical_shell_thickness'], c.id);
  }
  assert.equal(setariValide({ ...S, grosimeVerticala: 'ceva' as never }).grosimeVerticala, 'ensure_all');
  assert.equal(setariValide({ ...S, grosimeVerticala: 'none' }).grosimeVerticala, 'none');
  // Pe hârtie: marginea dinăuntru a pereților (2, de 0,42 și 0,45, stratul de 0,2) e la 0,21 + (0,377 + 0,407) / 2 + 0,225 =
  // 0,827 mm; plinul se lărgește cu 0,2 · 1,05 · 0,377 = 0,079 (r3): inelul ajunge la 0,906 mm de marginea buzunarului.
  const d = 0.21 + (pas(0.42, 0.2) + pas(0.45, 0.2)) / 2 + 0.225 + 0.2 * 1.05 * pas(0.42, 0.2);
  assert.ok(aproape(d, 0.906, 1e-3), String(d));
  const p = piesa([conturDreptunghi(60, 80, 100, 60)], 18, [{ contururi: [conturDreptunghi(110, 95, 40, 30)], inaltime: 12 }]);
  const inBuzunar = (q: Punct, m: number) => inDreptunghi(q, 110 - m, 95 - m, 150 + m, 125 + m);
  const cutie = (c: readonly Cale[], rol: string): number[] | null => {
    const q = puncteRol(c, rol);
    if (q.length === 0) return null;
    return [q.reduce((a, x) => Math.min(a, x.x), Infinity), q.reduce((a, x) => Math.min(a, x.y), Infinity),
      q.reduce((a, x) => Math.max(a, x.x), -Infinity), q.reduce((a, x) => Math.max(a, x.y), -Infinity)];
  };
  const egal = (a: number[] | null, b: number[]): boolean => a !== null && a.every((x, i) => Math.abs(x - b[i]!) < 0.01);
  for (const gv of GROSIMI_VERTICALE) {
    const r = feliaza([p], setariValide({ ...S, grosimeVerticala: gv }), { data: DATA });
    assert.deepEqual(r.avertismente, [], gv);
    assert.ok(r.gcode!.text.includes(`\n; ensure_vertical_shell_thickness = ${gv}\n`), gv);
    const e = gv === 'ensure_all' ? d : 0;
    for (const k of [57, 58, 59]) {
      assert.ok(egal(cutie(r.cai(k), 'plin'), [110 - e, 95 - e, 150 + e, 125 + e]), `${gv} ${k}: ${JSON.stringify(cutie(r.cai(k), 'plin'))}`);
      // Rarul începe dincolo de inel (la distanța lui de buzunar; la colțuri, inelul e rotunjit).
      assert.ok(puncteRol(r.cai(k), 'rar').every((q) => Math.hypot(Math.max(110 - q.x, 0, q.x - 150), Math.max(95 - q.y, 0, q.y - 125)) > e - 0.02), `${gv} ${k}`);
    }
    // Pe fața buzunarului (60): la „toată”, inelul e plin (pereții stratului 61 stau pe el); altfel, nimic plin.
    if (gv === 'ensure_all') assert.ok(egal(cutie(r.cai(60), 'plin'), [110 - e, 95 - e, 150 + e, 125 + e]) && puncteRol(r.cai(60), 'plin').every((q) => !inBuzunar(q, -0.05)));
    else assert.equal(cutie(r.cai(60), 'plin'), null, gv);
    // Mai jos de raza plinului (56: pereții de la 61 nu sunt în k+1 … k+4) și deasupra treptei (61), fără inel.
    assert.ok(egal(cutie(r.cai(56), 'plin'), gv === 'ensure_all' ? [109.92, 94.92, 150.08, 125.08] : [110, 95, 150, 125]), `${gv} 56: ${JSON.stringify(cutie(r.cai(56), 'plin'))}`);
    assert.equal(cutie(r.cai(61), 'plin'), null, gv);
  }
  // Călcarea „toate straturile pline”, cu inelul: pe 59, peste buzunar și inel (până la marginea pereților de deasupra, 0,827).
  const c = feliaza([p], setariValide({ ...S, calcare: 'plin' }), { data: DATA }).cai(59);
  const dw = d - 0.2 * 1.05 * pas(0.42, 0.2);
  assert.ok(egal(cutie(c, 'calcare'), [110 - dw, 95 - dw, 150 + dw, 125 + dw]), JSON.stringify(cutie(c, 'calcare')));
  const cf = feliaza([p], setariValide({ ...S, calcare: 'plin', grosimeVerticala: 'none' }), { data: DATA }).cai(59);
  assert.ok(egal(cutie(cf, 'calcare'), [110, 95, 150, 125]), JSON.stringify(cutie(cf, 'calcare')));
});

test('grosimea verticală (3.6n), regiunile pline înguste: „moderată” și „doar critic” lățesc canelura de 2 mm cu 3 linii (1,26 mm), „fără” nu; o fâșie de 0,3 mm: „fără” o scoate (rămâne rară), „doar critic” o ține și o lățește', () => {
  const fasie = (lat: number): PiesaPlata => piesa([conturDreptunghi(60, 80, 100, 60)], 18, [{ contururi: [conturDreptunghi(100, 95, lat, 30)], inaltime: 12 }]);
  const plinX = (gv: (typeof GROSIMI_VERTICALE)[number], lat: number): number[] | null => {
    const q = puncteRol(feliaza([fasie(lat)], setariValide({ ...S, grosimeVerticala: gv }), { data: DATA }).cai(58), 'plin');
    return q.length === 0 ? null : [q.reduce((a, x) => Math.min(a, x.x), Infinity), q.reduce((a, x) => Math.max(a, x.x), -Infinity)].map((x) => Number(x.toFixed(2)));
  };
  // 2 mm: strânsă cu 3 · 0,42 = 1,26 nu mai rămâne nimic, deci se lățește cu 1,26 (98,74 … 103,26); la „fără”, 2 > 2 · 0,42.
  assert.deepEqual(plinX('ensure_moderate', 2), [98.74, 103.26]);
  assert.deepEqual(plinX('ensure_critical_only', 2), [98.74, 103.26]);
  assert.deepEqual(plinX('none', 2), [100, 102]);
  // 0,3 mm: „fără” scoate ce e sub 2 · 0,5 · 0,42 = 0,42 mm; „doar critic” (sub 2 · 0,2 · 0,42 = 0,168) o ține și o lățește.
  assert.equal(plinX('none', 0.3), null);
  assert.deepEqual(plinX('ensure_critical_only', 0.3), [98.74, 101.56]);
  // Unde „fără” a scos plinul, umplerea rară trece peste fâșie (rămâne internă, ca la OrcaSlicer).
  const rar = puncteRol(feliaza([fasie(0.3)], setariValide({ ...S, grosimeVerticala: 'none' }), { data: DATA }).cai(58), 'rar');
  assert.ok(rar.some((q) => q.x > 100.02 && q.x < 100.28 && q.y > 96 && q.y < 124));
});

test('grosimea verticală (3.6n), uneltele pe hârtie: deschiderea; „toată” (lărgirea cu r3, colțurile cu r1 + r3, bucățile mici scoase dacă nu acoperă internul); lățirea regiunilor întregi înguste', () => {
  const ms = 1.05 * pas(0.42, 0.2), r1 = 0.325 * ms, r3 = 0.2 * ms;
  const I = [conturDreptunghi(0, 0, 100, 60)];
  // Deschiderea cu 0,2: fâșia de 0,3 pleacă; dreptunghiul de 40 × 30 rămâne, cu colțurile rotunjite: (4 − π) · 0,2² mai puțin
  // (lărgirea la loc are 0,001 mm în plus, marja ei: colțurile pierd cu ~0,001 mm² mai puțin).
  const d = deschidere([conturDreptunghi(10, 10, 40, 30), conturDreptunghi(60, 10, 0.3, 30)], 0.2);
  assert.ok(typeof d !== 'string' && aproape(arieFigura(d), 1200 - (4 - Math.PI) * 0.04, 2e-3), String(typeof d === 'string' ? d : arieFigura(d)));
  // „Toată”: strâns cu r1, lărgit cu r1 + r2, strâns cu r2 − r3 = dreptunghiul lărgit cu r3, cu colțurile de rază r1 + r3.
  const reg = regularizeazaPlin([conturDreptunghi(10, 10, 40, 30)], I, ms);
  const asteptat = (40 + 2 * r3) * (30 + 2 * r3) - (4 - Math.PI) * (r1 + r3) ** 2;
  assert.ok(typeof reg !== 'string' && aproape(arieFigura(reg), asteptat, 1e-3), `${typeof reg === 'string' ? reg : arieFigura(reg)} ≠ ${asteptat}`);
  // Mai îngust decât 2 · r1 = 0,257: pleacă. Un pătrat de 1,5 (sub 8 · ms = 3,17 mm²) într-un intern mare: pleacă; când e chiar
  // internul lui (îl acoperă), rămâne.
  assert.deepEqual(regularizeazaPlin([conturDreptunghi(10, 10, 0.25, 30)], I, ms), []);
  assert.deepEqual(regularizeazaPlin([conturDreptunghi(10, 10, 1.5, 1.5)], I, ms), []);
  const singur = regularizeazaPlin([conturDreptunghi(10, 10, 1.5, 1.5)], [conturDreptunghi(10, 10, 1.5, 1.5)], ms);
  assert.ok(typeof singur !== 'string' && aproape(arieFigura(singur), 2.25, 1e-6));
  // Lățirea: canelura de 2 × 30, strânsă cu 3 · 0,42 = 1,26, dispare: lărgită cu 1,26 (aria A + P · m + π m²).
  const f = conturDreptunghi(50, 15, 2, 30), m = 1.26;
  const mod = ingusteazaPlin([f], I, 'ensure_moderate', 0.42, 0.42, false);
  assert.ok(typeof mod !== 'string' && aproape(arieFigura(mod), 60 + 64 * m + Math.PI * m * m, 1e-3), String(typeof mod === 'string' ? mod : arieFigura(mod)));
  // „Fără”: strânsă cu 0,42 rămâne (2 > 0,84), deci doar colțurile rotunjite de filtrul de 0,21.
  const fara = ingusteazaPlin([f], I, 'none', 0.42, 0.42, false);
  assert.ok(typeof fara !== 'string' && aproape(arieFigura(fara), 60 - (4 - Math.PI) * 0.21 ** 2, 2e-3)); // marja deschiderii, ca mai sus
  // Fără umplere rară (filtrul de 2 · 0,42 la orice mod): o fâșie de 0,6 pleacă și la „moderată”.
  assert.deepEqual(ingusteazaPlin([conturDreptunghi(50, 15, 0.6, 30)], I, 'ensure_moderate', 0.42, 0.42, true), []);
  // Lățirea rămâne în intern: canelura lângă marginea internului se lățește doar înăuntru.
  const lang = ingusteazaPlin([conturDreptunghi(0, 15, 2, 30)], I, 'ensure_moderate', 0.42, 0.42, false);
  assert.ok(typeof lang !== 'string' && regiuniX(lang)[0]! >= -1e-9);
});

/** Cea mai mică și cea mai mare coordonată X a unei figuri. */
function regiuniX(c: readonly Contur[]): [number, number] {
  let x0 = Infinity, x1 = -Infinity;
  for (const k of c) for (const v of k.varfuri) { x0 = Math.min(x0, v.p.x); x1 = Math.max(x1, v.p.x); }
  return [x0, x1];
}

test('grosimea verticală (3.6n), o găurire mică (Ø1,6) la 12 mm: la „toată”, sub raza pereților (56) discul e o bucată mică și pleacă, apoi (57–59) e plin cu inelul lui; la „moderată”, discul se lățește cu 1,26', () => {
  // Discul de rază 0,8, lărgit cu r3 = 0,079: π · 0,879² = 2,43 mm², sub 8 · ms = 3,17, într-un intern mult mai mare.
  const p = piesa([conturDreptunghi(60, 80, 100, 60)], 18, [{ contururi: [conturCerc(110, 110, 0.8)], inaltime: 12 }]);
  const plin = (gv: (typeof GROSIMI_VERTICALE)[number], k: number): Punct[] => puncteRol(feliaza([p], setariValide({ ...S, grosimeVerticala: gv }), { data: DATA }).cai(k), 'plin');
  assert.equal(plin('ensure_all', 56).length, 0);
  for (const k of [57, 58, 59]) {
    const q = plin('ensure_all', k);
    // Discul (raza 0,8) cu inelul pereților de deasupra (0,906): plinul ajunge la ~1,71 mm de centru, nu mai departe.
    assert.ok(q.length > 0 && q.every((x) => Math.hypot(x.x - 110, x.y - 110) < 1.73) && q.some((x) => Math.hypot(x.x - 110, x.y - 110) > 1.3), String(k));
  }
  const m = plin('ensure_moderate', 56);
  assert.ok(m.length > 0 && m.every((x) => Math.hypot(x.x - 110, x.y - 110) < 2.07) && m.some((x) => Math.hypot(x.x - 110, x.y - 110) > 1.6));
});
