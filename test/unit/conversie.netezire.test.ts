/**
 * Netezirea (ADR 0180 §9, §11; felia 10.3↑e), pe hârtie:
 * - cercul R50 din 256 de linii scurte, la 0,01: doar cubice, netede în fiecare nod (tangenta continuă), cu vârful 0
 *   păstrat; curba stă între razele 50 − 0,0038 − 0,01 și 50 + 0,01 (săgeata laturilor, 50·(1 − cos(π/256)), plus toleranța);
 * - un dreptunghi din linii lungi și un hexagon R5 (laturi de 5 mm) rămân cum sunt: la 0,01, nicio curbă netedă nu încape;
 * - un pătrat 10 × 10 din 40 de linii de 1 mm, la 0,5: colțurile de 90° îl țin neschimbat (o curbă rotunjită ar încăpea în
 *   0,5, deci doar regula colțului îl ține), iar laturile, drepte, n-au ce netezi;
 * - treptele unei trasări (pași de 0,5 mm pe y = 10·sin(x/10)): la 0,5 devin cubice, la cel mult 0,5 de ele; la 0,01 rămân,
 *   fiindcă pe scara 4 × 0,01 fiecare treaptă e un colț de 90°;
 * - treptele unui sinus abrupt (panta până la 2), la 0,8: toate devin curbe, și prima, unde coarda trunchiată (la capătul
 *   șirului) ar măsura un colț de ~72°;
 * - colțul de 90° al unui V cu ramuri curbe rămâne vârf, ramurile se netezesc;
 * - o linie de 8 mm rămâne linie la „Păstrează” 5, cu legăturile netede, și intră în curbă la 10;
 * - un arc rămâne arc (același vârf, același bulge), cu legăturile netede;
 * - o literă cu gaură (două contururi într-o piesă): fiecare se netezește singur, nimic nu se sudează;
 * - un element întins neuniform (2 × 1) se netezește pe foaie, la cel mult toleranța de poligonul întins;
 * - refuzurile (`nimic-ales`, `toleranta`, `valoare`) și acțiunea `document.converteste`, un pas de anulare.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import { converteste, type CerereConversie, type RezultatConversie } from '../../src/model/conversie.ts';
import type { Document, ElementNod, FormaDoc, Nod, Operatie, Piesa, VarfDoc } from '../../src/model/document.ts';
import { poligonRegulat } from '../../src/model/formeParametrice.ts';
import { executa, istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';
import { docDin, ID } from './ajutor-document.ts';

type P = { readonly x: number; readonly y: number };
type Cale = Extract<FormaDoc, { tip: 'cale' }>;
const stoc = { latime: 1000, inaltime: 1000, grosime: 18 };
const L = { tip: 'L' } as const;
const cale = (inchis: boolean, p: ReadonlyArray<readonly [number, number]>): Cale => ({ tip: 'cale', inchis, varfuri: p.map(([x, y]): VarfDoc => ({ p: { x, y }, s: L })) });
const forma = (id: string, f: FormaDoc, x = 0, y = 0, m: { a: number; b: number; c: number; d: number } = ID) => ({ id, forma: f, matrice: { ...m, e: x, f: y } });
const NETEZ = (alese: readonly string[], toleranta = 0.01, pastreaza = 5): CerereConversie => ({ fel: 'netezire', alese, toleranta, pastreaza });
/** Poligonul regulat cu n laturi, înscris în cercul R din origine, primul vârf în (R, 0) (`poligonRegulat` se oprește la 64). */
const regulat = (n: number, R: number): Cale => cale(true, Array.from({ length: n }, (_, k): readonly [number, number] => [R * Math.cos((2 * Math.PI * k) / n), R * Math.sin((2 * Math.PI * k) / n)]));

function aplica(d: Document, r: RezultatConversie): Document {
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  const vechi = new Map(d.piese.map((p) => [p.id, p]));
  const dupa = executa(istoricNou(d), { tip: 'lot', comenzi: r.piese.map((p) => ({ tip: 'inlocuieste-piesa' as const, vechi: vechi.get(p.id) as Piesa, nou: p })) }).doc;
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), 'documentul de după trece de ușă');
  return dupa;
}
const convertit = (d: Document, c: CerereConversie): { readonly dupa: Document; readonly r: Extract<RezultatConversie, { ok: true }> } => {
  const r = converteste(d, c);
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  return { dupa: aplica(d, r), r };
};
const piesaDin = (d: Document, id: string): Piesa => d.piese.find((p) => p.id === id) ?? assert.fail(`piesa ${id}`);
const caleDin = (d: Document, id: string): Cale => {
  const f = (piesaDin(d, id).radacina as ElementNod).forma;
  assert.ok(f.tip === 'cale');
  return f as Cale;
};

/** Punctul cubicei (a, c1, c2, b) la t. */
const peCubica = (a: P, c1: P, c2: P, b: P, t: number): P => {
  const u = 1 - t, k0 = u * u * u, k1 = 3 * u * u * t, k2 = 3 * u * t * t, k3 = t * t * t;
  return { x: k0 * a.x + k1 * c1.x + k2 * c2.x + k3 * b.x, y: k0 * a.y + k1 * c1.y + k2 * c2.y + k3 * b.y };
};
/** Tangenta cu care se ajunge în vârful k și cea cu care se pleacă din el (sensul de mers). */
function tangente(f: Cale, k: number): { readonly intra: P; readonly iese: P } {
  const n = f.varfuri.length, v = f.varfuri;
  const pk = (v[k] as VarfDoc).p, prev = v[(k - 1 + n) % n] as VarfDoc, cur = v[k] as VarfDoc, next = (v[(k + 1) % n] as VarfDoc).p;
  const intra = prev.s.tip === 'C' ? { x: pk.x - prev.s.c2.x, y: pk.y - prev.s.c2.y } : { x: pk.x - prev.p.x, y: pk.y - prev.p.y };
  const iese = cur.s.tip === 'C' ? { x: cur.s.c1.x - pk.x, y: cur.s.c1.y - pk.y } : { x: next.x - pk.x, y: next.y - pk.y };
  return { intra, iese };
}
const intoarcere = (u: P, w: P): number => Math.atan2(Math.abs(u.x * w.y - u.y * w.x), u.x * w.x + u.y * w.y);
/** Eșantioanele unei căi (cubicele la 64, liniile la capete), în coordonatele elementului. */
function esantioane(f: Cale): P[] {
  const v = f.varfuri, n = v.length, m = f.inchis ? n : n - 1, rez: P[] = [];
  for (let k = 0; k < m; k++) {
    const a = (v[k] as VarfDoc).p, s = (v[k] as VarfDoc).s, b = (v[(k + 1) % n] as VarfDoc).p;
    for (let j = 0; j <= 64; j++) rez.push(s.tip === 'C' ? peCubica(a, s.c1, s.c2, b, j / 64) : { x: a.x + ((b.x - a.x) * j) / 64, y: a.y + ((b.y - a.y) * j) / 64 });
  }
  return rez;
}
const laSegment = (q: P, a: P, b: P): number => {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(q.x - a.x - dx * t, q.y - a.y - dy * t);
};
/** Cât se depărtează punctele q de poligonul (deschis sau închis) w. */
function departareDePoligon(q: readonly P[], w: readonly P[], inchis: boolean): number {
  let max = 0;
  for (const p of q) {
    let d = Infinity;
    for (let k = 0; k + 1 < w.length + (inchis ? 1 : 0); k++) d = Math.min(d, laSegment(p, w[k] as P, w[(k + 1) % w.length] as P));
    max = Math.max(max, d);
  }
  return max;
}

test('cercul R50 din 256 de linii scurte, la 0,01: doar cubice, netede în fiecare nod, vârful 0 păstrat, între razele 50 − 0,0138 și 50 + 0,01', () => {
  const poligon = regulat(256, 50);
  const d = docDin(stoc, forma('c', poligon, 500, 500));
  const { dupa, r } = convertit(d, NETEZ(['c']));
  assert.equal(r.convertite, 1);
  assert.equal(r.linii, 256);
  assert.ok(r.curbe >= 4 && r.curbe <= 16, `curbele: ${r.curbe}`);
  assert.ok(r.abatere > 0 && r.abatere <= 0.01, `abaterea: ${r.abatere}`);
  const f = caleDin(dupa, 'c');
  assert.equal(f.inchis, true);
  assert.equal(f.varfuri.length, r.curbe);
  assert.ok(f.varfuri.every((x) => x.s.tip === 'C'), 'doar cubice');
  assert.deepEqual(f.varfuri[0]?.p, poligon.varfuri[0]?.p, 'vârful 0, la bit');
  for (let k = 0; k < f.varfuri.length; k++) {
    const { intra, iese } = tangente(f, k);
    assert.ok(intoarcere(intra, iese) <= 1e-9, `nodul ${k}: tangenta se rupe cu ${intoarcere(intra, iese)}`);
  }
  const sageata = 50 * (1 - Math.cos(Math.PI / 256));
  for (const q of esantioane(f)) {
    const raza = Math.hypot(q.x, q.y);
    assert.ok(raza >= 50 - sageata - 0.01 - 1e-9 && raza <= 50 + 0.01 + 1e-9, `raza ${raza}`);
  }
});

test('un dreptunghi din linii lungi și un hexagon R5 (laturi de 5 mm) rămân cum sunt: la 0,01, nicio curbă netedă nu încape', () => {
  const d = docDin(stoc, forma('r', cale(true, [[0, 0], [100, 0], [100, 40], [0, 40]]), 100, 100), forma('h', poligonRegulat({ x: 0, y: 0 }, 5, 6, 0), 300, 300));
  const r = converteste(d, NETEZ(['r', 'h']));
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.convertite, 0);
  assert.deepEqual(r.piese, []);
});

test('un pătrat 10 × 10 din 40 de linii de 1 mm, la 0,5: colțurile de 90° îl țin neschimbat (o curbă rotunjită ar încăpea în 0,5); laturile, drepte, n-au ce netezi', () => {
  const p: Array<readonly [number, number]> = [];
  for (let k = 0; k < 10; k++) p.push([k, 0]);
  for (let k = 0; k < 10; k++) p.push([10, k]);
  for (let k = 0; k < 10; k++) p.push([10 - k, 10]);
  for (let k = 0; k < 10; k++) p.push([0, 10 - k]);
  const d = docDin(stoc, forma('p', cale(true, p), 600, 600));
  const r = converteste(d, NETEZ(['p'], 0.5));
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.convertite, 0);
  assert.deepEqual(r.piese, []);
});

/** Treptele pe y = 10·sin(x/10), x în [0, 31], cu pasul p (orizontal, apoi vertical). */
function trepte(p: number): Array<readonly [number, number]> {
  const y = (x: number): number => Math.round((10 * Math.sin(x / 10)) / p) * p;
  const rez: Array<readonly [number, number]> = [[0, y(0)]];
  for (let k = 1; k * p <= 31 + 1e-9; k++) {
    const x = k * p, ultim = rez[rez.length - 1] as readonly [number, number];
    rez.push([x, ultim[1]]);
    if (y(x) !== ultim[1]) rez.push([x, y(x)]);
  }
  return rez;
}

test('treptele unei trasări (pași de 0,5 mm): la 0,5 devin cubice netede, la cel mult 0,5 de ele; la 0,01 rămân (fiecare treaptă e un colț)', () => {
  const p = trepte(0.5);
  const d = docDin(stoc, forma('t', cale(false, p), 200, 200));
  const { dupa, r } = convertit(d, NETEZ(['t'], 0.5));
  assert.equal(r.convertite, 1);
  assert.equal(r.linii, p.length - 1, 'toate treptele înlocuite');
  assert.ok(r.curbe <= 12, `curbele: ${r.curbe}`);
  assert.ok(r.abatere <= 0.5, `abaterea: ${r.abatere}`);
  const f = caleDin(dupa, 't');
  assert.deepEqual([f.varfuri[0]?.p, f.varfuri[f.varfuri.length - 1]?.p], [{ x: p[0]?.[0], y: p[0]?.[1] }, { x: p[p.length - 1]?.[0], y: p[p.length - 1]?.[1] }], 'capetele, la bit');
  for (let k = 1; k + 1 < f.varfuri.length; k++) {
    const { intra, iese } = tangente(f, k);
    assert.ok(intoarcere(intra, iese) <= 1e-9, `nodul ${k}`);
  }
  assert.ok(departareDePoligon(esantioane(f), p.map(([x, y]) => ({ x, y })), false) <= 0.5 + 1e-9);
  const strans = converteste(d, NETEZ(['t'], 0.01));
  assert.ok(strans.ok && strans.convertite === 0, 'la 0,01, treptele rămân');
});

test('treptele unui sinus abrupt (y = 20·sin(x/10), pași de 0,5 mm, panta până la 2), la 0,8: toate devin curbe, și prima treaptă, unde coarda trunchiată ar măsura un colț de ~72°', () => {
  const pas = 0.5, y = (x: number): number => Math.round((20 * Math.sin(x / 10)) / pas) * pas;
  const p: Array<readonly [number, number]> = [[0, y(0)]];
  for (let k = 1; k * pas <= 15 + 1e-9; k++) {
    const x = k * pas, u = p[p.length - 1] as readonly [number, number];
    p.push([x, u[1]]);
    if (y(x) !== u[1]) p.push([x, y(x)]);
  }
  const d = docDin(stoc, forma('a', cale(false, p), 200, 200));
  const { dupa, r } = convertit(d, NETEZ(['a'], 0.8));
  assert.equal(r.convertite, 1);
  assert.equal(r.linii, p.length - 1, 'toate treptele, și prima, și ultima');
  assert.ok(r.abatere <= 0.8);
  assert.ok(caleDin(dupa, 'a').varfuri.slice(0, -1).every((x) => x.s.tip === 'C'));
});

test('colțul de 90° al unui V cu ramuri curbe (y = |x| + x²/100, din 1 în 1 mm) rămâne vârf; ramurile devin cubice netede', () => {
  const p = Array.from({ length: 61 }, (_, k): readonly [number, number] => [k - 30, Math.abs(k - 30) + ((k - 30) * (k - 30)) / 100]);
  const d = docDin(stoc, forma('v', cale(false, p), 300, 300));
  const { dupa, r } = convertit(d, NETEZ(['v']));
  assert.equal(r.convertite, 1);
  assert.ok(r.abatere <= 0.01);
  const f = caleDin(dupa, 'v');
  const k0 = f.varfuri.findIndex((x) => x.p.x === 0 && x.p.y === 0);
  assert.ok(k0 > 0, 'vârful (0, 0) a rămas');
  for (let k = 1; k + 1 < f.varfuri.length; k++) {
    const { intra, iese } = tangente(f, k);
    if (k === k0) assert.ok(intoarcere(intra, iese) > (80 * Math.PI) / 180, `colțul: ${intoarcere(intra, iese)}`);
    else assert.ok(intoarcere(intra, iese) <= 1e-9, `nodul ${k}`);
  }
  assert.ok(f.varfuri.slice(0, -1).every((x) => x.s.tip === 'C'));
});

/** Două ramuri scurte (y = (x ± 4)²/100) legate de o linie de 8 mm pe y = 0. */
const CU_LINIE: Array<readonly [number, number]> = [
  ...Array.from({ length: 16 }, (_, k): readonly [number, number] => [k - 20, ((k - 16) * (k - 16)) / 100]),
  [-4, 0], [4, 0],
  ...Array.from({ length: 16 }, (_, k): readonly [number, number] => [k + 5, ((k + 1) * (k + 1)) / 100]),
];

test('o linie de 8 mm rămâne linie la „Păstrează” 5, cu legăturile netede (tangenta ei); la 10 intră în curbă', () => {
  const d = docDin(stoc, forma('l', cale(false, CU_LINIE), 400, 400));
  const { dupa, r } = convertit(d, NETEZ(['l'], 0.01, 5));
  assert.equal(r.convertite, 1);
  assert.equal(r.linii, CU_LINIE.length - 2, 'toate liniile scurte');
  const f = caleDin(dupa, 'l');
  const k = f.varfuri.findIndex((x) => x.p.x === -4 && x.p.y === 0);
  assert.ok(k > 0 && f.varfuri[k]?.s.tip === 'L' && f.varfuri[k + 1]?.p.x === 4 && f.varfuri[k + 1]?.p.y === 0, 'linia de 8 mm, neschimbată');
  for (const j of [k, k + 1]) {
    const { intra, iese } = tangente(f, j);
    assert.ok(intoarcere(intra, iese) <= 1e-9, `legătura ${j}: ${intoarcere(intra, iese)}`);
  }
  const lung = convertit(d, NETEZ(['l'], 0.01, 10));
  assert.ok(caleDin(lung.dupa, 'l').varfuri.slice(0, -1).every((x) => x.s.tip === 'C'), 'la 10, linia de 8 mm e și ea scurtă');
});

test('un arc rămâne arc (același vârf, același bulge), între două șiruri scurte pe același cerc R20, cu legăturile netede', () => {
  const pe = (g: number): { x: number; y: number } => ({ x: 20 * Math.cos((g * Math.PI) / 180), y: 20 * Math.sin((g * Math.PI) / 180) });
  const bulge = -Math.tan(Math.PI / 8);
  const varfuri: VarfDoc[] = [
    ...Array.from({ length: 18 }, (_, k): VarfDoc => ({ p: pe(180 - 2.5 * k), s: L })),
    { p: pe(135), s: { tip: 'A', bulge } },
    ...Array.from({ length: 19 }, (_, k): VarfDoc => ({ p: pe(45 - 2.5 * k), s: L })),
  ];
  const d = docDin(stoc, forma('a', { tip: 'cale', inchis: false, varfuri }, 500, 300));
  const { dupa, r } = convertit(d, NETEZ(['a']));
  assert.equal(r.convertite, 1);
  const f = caleDin(dupa, 'a');
  const k = f.varfuri.findIndex((x) => x.s.tip === 'A');
  assert.deepEqual(f.varfuri[k], varfuri[18], 'arcul, la bit');
  assert.deepEqual(f.varfuri[k + 1]?.p, varfuri[19]?.p);
  for (const j of [k, k + 1]) {
    // Tangenta arcului (sens orar, 90°): coarda rotită cu ±45°.
    const { intra, iese } = tangente(f, j);
    const a = varfuri[18]?.p as P, b = varfuri[19]?.p as P, c = { x: b.x - a.x, y: b.y - a.y }, th = 4 * Math.atan(bulge);
    const t = j === k ? { x: c.x * Math.cos(-th / 2) - c.y * Math.sin(-th / 2), y: c.x * Math.sin(-th / 2) + c.y * Math.cos(-th / 2) }
      : { x: c.x * Math.cos(th / 2) - c.y * Math.sin(th / 2), y: c.x * Math.sin(th / 2) + c.y * Math.cos(th / 2) };
    assert.ok(intoarcere(j === k ? intra : iese, t) <= 1e-9, `legătura cu arcul ${j}`);
  }
  assert.ok(r.abatere <= 0.01);
});

test('o literă cu gaură (două contururi într-o piesă, 128 și 96 de laturi): fiecare se netezește singur, nimic nu se sudează', () => {
  const d0 = docDin(stoc, forma('o', regulat(128, 40), 300, 300));
  const p0 = d0.piese[0] as Piesa;
  const op = (id: string, latura: 'exterior' | 'interior', nod: string): Operatie => ({ ...(p0.operatii[0] as Operatie), id, latura, noduri: [nod] });
  const radacina: Nod = {
    tip: 'grup', id: 'o', matrice: { ...ID }, copii: [
      { tip: 'element', id: 'o1', forma: regulat(128, 40), matrice: { ...ID } },
      { tip: 'element', id: 'o2', forma: regulat(96, 25), matrice: { ...ID } },
    ],
  };
  const d: Document = { ...d0, piese: [{ ...p0, radacina, operatii: [op('e', 'exterior', 'o1'), op('i', 'interior', 'o2')] }] };
  const { dupa, r } = convertit(d, NETEZ(['o']));
  assert.equal(r.convertite, 2);
  const g = piesaDin(dupa, 'o').radacina;
  assert.ok(g.tip === 'grup' && g.copii.length === 2);
  if (g.tip !== 'grup') return;
  for (const c of g.copii) {
    assert.ok(c.tip === 'element' && c.forma.tip === 'cale' && c.forma.inchis && c.forma.varfuri.every((x) => x.s.tip === 'C'), c.id);
  }
  assert.deepEqual(piesaDin(dupa, 'o').operatii, piesaDin(d, 'o').operatii, 'operațiile rămân');
});

test('un element întins neuniform (2 × 1): netezirea se face pe foaie, la cel mult 0,01 de poligonul întins (măsurat aici, pe eșantioane)', () => {
  const poligon = regulat(128, 20);
  const M = { a: 2, b: 0, c: 0, d: 1 };
  const d = docDin(stoc, forma('e', poligon, 300, 300, M));
  const { dupa, r } = convertit(d, NETEZ(['e']));
  assert.equal(r.convertite, 1);
  assert.ok(r.abatere <= 0.01);
  const lume = (q: P): P => ({ x: 2 * q.x, y: q.y });
  const f = caleDin(dupa, 'e');
  const curba = esantioane(f).map(lume), w = poligon.varfuri.map((x) => lume(x.p));
  assert.ok(departareDePoligon(curba, w, true) <= 0.01 + 1e-9, 'curba, aproape de poligon');
  // Și invers: fiecare punct al poligonului, aproape de curbă (eșantioanele ei, la 64 pe cubică).
  let max = 0;
  for (let k = 0; k < w.length; k++) {
    for (let j = 0; j <= 8; j++) {
      const a = w[k] as P, b = w[(k + 1) % w.length] as P, q = { x: a.x + ((b.x - a.x) * j) / 8, y: a.y + ((b.y - a.y) * j) / 8 };
      let dmin = Infinity;
      for (let i = 0; i + 1 < curba.length; i++) dmin = Math.min(dmin, laSegment(q, curba[i] as P, curba[i + 1] as P));
      max = Math.max(max, dmin);
    }
  }
  assert.ok(max <= 0.01 + 1e-4, `poligonul, aproape de curbă: ${max}`);
});

test('refuzurile: nimic ales, toleranța în afara 0,001 … 1 mm, „Păstrează” care nu e un număr pozitiv', () => {
  const d = docDin(stoc, forma('c', regulat(256, 50), 500, 500));
  assert.deepEqual(converteste(d, NETEZ([])), { ok: false, motiv: 'nimic-ales' });
  assert.deepEqual(converteste(d, NETEZ(['c'], 5)), { ok: false, motiv: 'toleranta' });
  assert.deepEqual(converteste(d, NETEZ(['c'], 0.01, 0)), { ok: false, motiv: 'valoare' });
  assert.deepEqual(converteste(d, NETEZ(['c'], 0.01, Number.NaN)), { ok: false, motiv: 'valoare' });
  // Cercurile și dreptunghiurile (ca forme) n-au linii de netezit: rămân.
  const forme = docDin(stoc, forma('k', { tip: 'cerc', raza: 10 }, 100, 100), forma('r', { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 4 }, 200, 100));
  const r = converteste(forme, NETEZ(['k', 'r'], 0.5, 1));
  assert.ok(r.ok && r.convertite === 0 && r.piese.length === 0);
});

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
function context(d: Document, selectie: readonly string[]): ContextDocument & { readonly h: () => Istoric } {
  let h = istoricNou(d);
  let sel: readonly string[] = selectie;
  return { istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => sel, selecteaza: (ids) => { sel = ids; }, doarCitire: () => false, h: () => h };
}

test('document.converteste cu o netezire: un singur pas de anulare', () => {
  const d = docDin(stoc, forma('c', regulat(256, 50), 500, 500));
  const r = converteste(d, NETEZ(['c']));
  if (!r.ok) assert.fail(r.motiv);
  const ctx = context(d, ['c']);
  assert.deepEqual(ruleaza(R, 'document.converteste', { ...ctx, conversie: () => ({ doc: d, piese: r.piese }) }), { ok: true });
  assert.equal(ctx.h().trecut.length, 1);
  assert.ok(caleDin(ctx.h().doc, 'c').varfuri.every((x) => x.s.tip === 'C'));
  ruleaza(R, 'istoric.anuleaza', ctx);
  assert.deepEqual({ ...ctx.h().doc, rev: d.rev }, d);
});
