/**
 * Legarea căilor (ADR 0182, felia 10.3↑o), pe hârtie. Toleranța lipirii e 0,01 mm (a verificării); implicitele sunt
 * răspunsurile owner-ului: golul mai mare cu o linie (1a), capătul căii a doua pe al primei (2a), operațiile diferite
 * refuzate (3a). „Prima” e prima în document (instanțele foii în ordine, elementele piesei în ordine).
 * - **un L** din (0, 0)–(50, 0) și (50; 0,004)–(50, 40): o cale deschisă (0, 0), (50, 0), (50, 40), de 90 mm; cu capetele la
 *   mijloc, nodul în (50; 0,002); cu a doua cale prima în document, nodul e capătul ei, (50; 0,004), și calea ei rămâne;
 * - **un pătrat** din patru linii, una scrisă invers: o cale închisă (0, 0), (50, 0), (50, 50), (0, 50), aria +2 500;
 * - **un gol de 2 mm**, (0, 0)–(50, 0) și (52, 0)–(100, 0): cu linia, o cale de 100 mm, cu vârfurile (0, 0), (50, 0), (52, 0),
 *   (100, 0); „până la 1 mm” și „doar lipirea”: refuzul, golul 2; „până la 3 mm”: legate; cu prima scrisă spre stânga,
 *   (100, 0), (52, 0), (50, 0), (0, 0) (sensul ei); cu a doua scrisă invers, ca la început;
 * - **un T**, trei capete în (50, 0): nelegate (refuzul `t`); cu o pereche bună în altă parte, ea se leagă, iar T-ul se numără;
 * - **un arc** de 90° de la (90, 40) la (50, 0), bulge −0,41421356 (tan 22,5°), legat întors: același arc, bulge +0,41421356;
 *   același arc dintr-un element oglindit (x → 100 − x, scris de la (10, 40) cu +0,41421356): tot +0,41421356;
 * - **o cubică** de la (100, 0) la (50, 0), cu mânerele (90, 30) și (60, 30), legată întors: mânerele (60, 30) și (90, 30);
 *   lipită cu începutul la (50; 0,004), mânerul ei vine cu capătul: (60; 29,996);
 * - **o singură cale** deschisă aleasă (triunghiul (0, 0), (50, 0), (25, 40)) se închide; golul ei, √(25² + 40²) = 47,17;
 * - **trei căi** cu goluri între ele: liniile vin doar între două căi, deci refuzul `multe`;
 * - **o instanță rotită** cu 90° în (50, 0), cu calea (0, 0)–(40, 0): în lume (50, 0)–(50, 40), legată în L;
 * - refuzurile: operații diferite, o cale singură în piesa ei cu una dintr-o piesă cu mai multe forme, o piesă pusă de două ori,
 *   arcele printr-o matrice neuniformă, o cale care se întoarce pe ea însăși (fără arie), toleranța greșită, nimic deschis;
 * - Verificarea: rândul (doar lipirea, golul 2 refuzat) și „toate” (doar perechile lipite, T-urile numărate).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import { segment, type Contur, type Punct } from '../../src/geom/contur.ts';
import { operatieImplicita, type Document, type FormaDoc, type Piesa, type VarfDoc } from '../../src/model/document.ts';
import { chenarElement } from '../../src/model/forme.ts';
import { anuleaza, istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { leagaCaile, OPTIUNI_LEGARE, type CerereLegare, type OptiuniLegare, type RezultatLegare } from '../../src/model/legareCai.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { punctPe } from '../../src/model/reparare.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';

const STOC = { latime: 600, inaltime: 400, grosime: 18 };
type V = readonly [number, number] | VarfDoc;
const varf = (v: V): VarfDoc => (Array.isArray(v) ? { p: { x: v[0] as number, y: v[1] as number }, s: { tip: 'L' } } : v as VarfDoc);
const cale = (inchis: boolean, ...v: V[]): FormaDoc => ({ tip: 'cale', inchis, varfuri: v.map(varf) });
const deschisa = (...v: V[]): FormaDoc => cale(false, ...v);
const arc = (x: number, y: number, bulge: number): VarfDoc => ({ p: { x, y }, s: { tip: 'A', bulge } });
const cub = (x: number, y: number, c1: readonly [number, number], c2: readonly [number, number]): VarfDoc =>
  ({ p: { x, y }, s: { tip: 'C', c1: { x: c1[0], y: c1[1] }, c2: { x: c2[0], y: c2[1] } } });
const f = (id: string, forma: FormaDoc) => ({ id, forma, matrice: { ...ID } });
const O = (o: Partial<OptiuniLegare> = {}): OptiuniLegare => ({ ...OPTIUNI_LEGARE, ...o });
const alese = (...ids: string[]): CerereLegare => ({ fel: 'alese', alese: ids });

function bun(r: RezultatLegare): Extract<RezultatLegare, { ok: true }> {
  if (!r.ok) assert.fail(`refuzat: ${r.motiv}`);
  return r;
}
/** Forma elementului `nod` din piesa `id` a rezultatului. */
function formaIn(r: Extract<RezultatLegare, { ok: true }>, id: string, nod = id): Extract<FormaDoc, { tip: 'cale' }> {
  const p = r.piese.find((x) => x.id === id);
  assert.ok(p, `piesa ${id} schimbată`);
  const caut = (n: Piesa['radacina']): FormaDoc | null => (n.tip === 'element' ? (n.id === nod ? n.forma : null) : n.copii.map(caut).find((x) => x) ?? null);
  const fo = caut(p.radacina);
  assert.ok(fo && fo.tip === 'cale', `elementul ${nod} e o cale`);
  return fo;
}
const puncte = (fo: Extract<FormaDoc, { tip: 'cale' }>): Array<[number, number]> => fo.varfuri.map((v) => [v.p.x, v.p.y]);
const aproape = (a: ReadonlyArray<readonly [number, number]>, b: ReadonlyArray<readonly [number, number]>, mesaj: string): void => {
  assert.equal(a.length, b.length, `${mesaj}: ${JSON.stringify(a)}`);
  a.forEach((p, k) => assert.ok(Math.abs(p[0] - (b[k] as [number, number])[0]) < 1e-9 && Math.abs(p[1] - (b[k] as [number, number])[1]) < 1e-9,
    `${mesaj}, vârful ${k}: ${JSON.stringify(a)} față de ${JSON.stringify(b)}`));
};
/** Lungimea în lume a unui contur, din 400 de coarde pe segment (oracolul: independent de cod). */
function lungime(c: Contur): number {
  let s = 0;
  const n = c.inchis ? c.varfuri.length : c.varfuri.length - 1;
  for (let i = 0; i < n; i++) {
    const g = segment(c, i);
    let q = punctPe(g, 0);
    for (let k = 1; k <= 400; k++) { const r = punctPe(g, k / 400); s += Math.hypot(r.x - q.x, r.y - q.y); q = r; }
  }
  return s;
}
const arie = (fo: Extract<FormaDoc, { tip: 'cale' }>): number => {
  let s = 0;
  const v = fo.varfuri;
  for (let i = 0; i < v.length; i++) { const a = (v[i] as VarfDoc).p, b = (v[(i + 1) % v.length] as VarfDoc).p; s += a.x * b.y - b.x * a.y; }
  return s / 2;
};

test('un L: capătul căii a doua vine pe al primei; la mijloc; cu a doua cale prima în document', () => {
  const A = f('a', deschisa([0, 0], [50, 0])), B = f('b', deschisa([50, 0.004], [50, 40]));
  const r = bun(leagaCaile(docDin(STOC, A, B), alese('b', 'a'), O()));
  aproape(puncte(formaIn(r, 'a')), [[0, 0], [50, 0], [50, 40]], 'L-ul');
  assert.equal(formaIn(r, 'a').inchis, false);
  assert.deepEqual(r.sterse, ['b']);
  assert.deepEqual([r.cai, r.rezultate, r.inchise], [2, 1, 0]);
  assert.ok(Math.abs(lungime(chenarElement({ forma: formaIn(r, 'a'), matrice: ID })) - 90) < 1e-6, 'lungimea 90');
  const m = bun(leagaCaile(docDin(STOC, A, B), alese('a', 'b'), O({ capete: 'mijloc' })));
  aproape(puncte(formaIn(m, 'a')), [[0, 0], [50, 0.002], [50, 40]], 'la mijloc');
  const inv = bun(leagaCaile(docDin(STOC, B, A), alese('a', 'b'), O()));
  aproape(puncte(formaIn(inv, 'b')), [[0, 0], [50, 0.004], [50, 40]], 'b prima în document');
  assert.deepEqual(inv.sterse, ['a']);
});

test('un pătrat din patru linii, una scrisă invers: o cale închisă, cu sensul primei', () => {
  const d = docDin(STOC, f('s1', deschisa([0, 0], [50, 0])), f('s2', deschisa([50, 0], [50, 50])), f('s3', deschisa([0, 50], [50, 50])), f('s4', deschisa([0, 50], [0, 0])));
  const r = bun(leagaCaile(d, alese('s1', 's2', 's3', 's4'), O()));
  const fo = formaIn(r, 's1');
  assert.equal(fo.inchis, true);
  aproape(puncte(fo), [[0, 0], [50, 0], [50, 50], [0, 50]], 'pătratul');
  assert.ok(Math.abs(arie(fo) - 2500) < 1e-9, `aria ${arie(fo)}`);
  assert.deepEqual([...r.sterse].sort(), ['s2', 's3', 's4']);
  assert.deepEqual([r.cai, r.rezultate, r.inchise], [4, 1, 1]);
});

test('un gol de 2 mm: cu linia (oricât), până la N mm, doar lipirea', () => {
  const d = docDin(STOC, f('a', deschisa([0, 0], [50, 0])), f('b', deschisa([52, 0], [100, 0])));
  const r = bun(leagaCaile(d, alese('a', 'b'), O()));
  aproape(puncte(formaIn(r, 'a')), [[0, 0], [50, 0], [52, 0], [100, 0]], 'cu linia');
  assert.ok(Math.abs(lungime(chenarElement({ forma: formaIn(r, 'a'), matrice: ID })) - 100) < 1e-6, 'lungimea 100');
  assert.deepEqual(leagaCaile(d, alese('a', 'b'), O({ gol: 'prag', pragGol: 1 })), { ok: false, motiv: 'prea-departe', gol: 2 });
  assert.deepEqual(leagaCaile(d, alese('a', 'b'), O({ gol: 'lipire' })), { ok: false, motiv: 'prea-departe', gol: 2 });
  bun(leagaCaile(d, alese('a', 'b'), O({ gol: 'prag', pragGol: 3 })));
  // Prima cale scrisă spre stânga: linia leagă începutul ei de începutul celei de-a doua, iar calea legată merge ca prima.
  const inv = docDin(STOC, f('a', deschisa([50, 0], [0, 0])), f('b', deschisa([52, 0], [100, 0])));
  aproape(puncte(formaIn(bun(leagaCaile(inv, alese('a', 'b'), O())), 'a')), [[100, 0], [52, 0], [50, 0], [0, 0]], 'prima întoarsă');
  // A doua cale scrisă invers: se întoarce, ca linia să plece din capătul primei spre capătul ei apropiat.
  const inv2 = docDin(STOC, f('a', deschisa([0, 0], [50, 0])), f('b', deschisa([100, 0], [52, 0])));
  aproape(puncte(formaIn(bun(leagaCaile(inv2, alese('a', 'b'), O())), 'a')), [[0, 0], [50, 0], [52, 0], [100, 0]], 'a doua întoarsă');
});

test('un T: trei capete într-un punct rămân nelegate; o pereche bună în altă parte se leagă', () => {
  const T = [f('a', deschisa([0, 0], [50, 0])), f('b', deschisa([50, 0], [100, 0])), f('c', deschisa([50, 40], [50, 0]))];
  assert.deepEqual(leagaCaile(docDin(STOC, ...T), alese('a', 'b', 'c'), O()), { ok: false, motiv: 't' });
  const d = docDin(STOC, ...T, f('d', deschisa([200, 0], [250, 0])), f('e', deschisa([250, 0], [250, 40])));
  const r = bun(leagaCaile(d, alese('a', 'b', 'c', 'd', 'e'), O()));
  aproape(puncte(formaIn(r, 'd')), [[200, 0], [250, 0], [250, 40]], 'perechea');
  assert.deepEqual(r.sterse, ['e']);
  assert.equal(r.nelegate.t, 1);
});

test('un arc întors: același arc, cu bulge-ul cu semn schimbat; o cubică întoarsă își schimbă mânerele', () => {
  const b = Math.tan(Math.PI / 8);
  const d = docDin(STOC, f('a', deschisa([0, 0], [50, 0])), f('b', deschisa(arc(90, 40, -b), [50, 0])));
  const r = bun(leagaCaile(d, alese('a', 'b'), O()));
  const fo = formaIn(r, 'a');
  aproape(puncte(fo), [[0, 0], [50, 0], [90, 40]], 'cu arcul');
  const s = (fo.varfuri[1] as VarfDoc).s;
  assert.ok(s.tip === 'A' && Math.abs(s.bulge - b) < 1e-15, `bulge ${JSON.stringify(s)}`);
  // Mijlocul arcului, același în lume înainte și după.
  const inainte = punctPe(segment(chenarElement({ forma: deschisa(arc(90, 40, -b), [50, 0]), matrice: ID }), 0), 0.5);
  const dupa = punctPe(segment(chenarElement({ forma: fo, matrice: ID }), 1), 0.5);
  assert.ok(Math.hypot(inainte.x - dupa.x, inainte.y - dupa.y) < 1e-9, `mijlocul ${JSON.stringify([inainte, dupa])}`);

  const c = docDin(STOC, f('a', deschisa([0, 0], [50, 0])), f('b', deschisa(cub(100, 0, [90, 30], [60, 30]), [50, 0])));
  const fc = formaIn(bun(leagaCaile(c, alese('a', 'b'), O())), 'a');
  aproape(puncte(fc), [[0, 0], [50, 0], [100, 0]], 'cu cubica');
  const sc = (fc.varfuri[1] as VarfDoc).s;
  assert.ok(sc.tip === 'C', 'cubica');
  aproape([[sc.c1.x, sc.c1.y], [sc.c2.x, sc.c2.y]], [[60, 30], [90, 30]], 'mânerele întoarse');

  // Același arc, din calea unui element oglindit (x → 100 − x): oglindirea schimbă semnul, întoarcerea îl schimbă la loc.
  const o = docDin(STOC, f('a', deschisa([0, 0], [50, 0])), { id: 'b', forma: deschisa(arc(10, 40, b), [50, 0]), matrice: { a: -1, b: 0, c: 0, d: 1, e: 100, f: 0 } });
  const fo2 = formaIn(bun(leagaCaile(o, alese('a', 'b'), O())), 'a');
  aproape(puncte(fo2), [[0, 0], [50, 0], [90, 40]], 'oglindit');
  const so = (fo2.varfuri[1] as VarfDoc).s;
  assert.ok(so.tip === 'A' && Math.abs(so.bulge - b) < 1e-15, `bulge oglindit ${JSON.stringify(so)}`);

  const l = docDin(STOC, f('a', deschisa([0, 0], [50, 0])), f('b', deschisa(cub(50, 0.004, [60, 30], [90, 30]), [100, 0])));
  const fl = formaIn(bun(leagaCaile(l, alese('a', 'b'), O())), 'a');
  const sl = (fl.varfuri[1] as VarfDoc).s;
  assert.ok(sl.tip === 'C', 'cubica lipită');
  aproape([[sl.c1.x, sl.c1.y], [sl.c2.x, sl.c2.y]], [[60, 29.996], [90, 30]], 'mânerul vine cu capătul');
});

test('o singură cale deschisă aleasă se închide; golul ei, peste prag, se refuză', () => {
  const d = docDin(STOC, f('t', deschisa([0, 0], [50, 0], [25, 40])));
  const r = bun(leagaCaile(d, alese('t'), O()));
  assert.equal(formaIn(r, 't').inchis, true);
  aproape(puncte(formaIn(r, 't')), [[0, 0], [50, 0], [25, 40]], 'triunghiul');
  assert.deepEqual([r.cai, r.rezultate, r.inchise], [1, 1, 1]);
  const p = leagaCaile(d, alese('t'), O({ gol: 'prag', pragGol: 1 }));
  assert.ok(!p.ok && p.motiv === 'prea-departe' && Math.abs((p.gol ?? 0) - Math.hypot(25, 40)) < 1e-9, JSON.stringify(p));
  assert.equal((leagaCaile(d, alese('t'), O({ gol: 'lipire' })) as { motiv: string }).motiv, 'prea-departe');
});

test('trei căi cu goluri între ele: liniile vin doar între două căi (refuzul `multe`); o cale închisă printre cele alese nu se atinge', () => {
  const d = docDin(STOC, f('a', deschisa([0, 0], [10, 0])), f('b', deschisa([12, 0], [20, 0])), f('c', deschisa([22, 0], [30, 0])));
  assert.deepEqual(leagaCaile(d, alese('a', 'b', 'c'), O()), { ok: false, motiv: 'multe' });
  const e = docDin(STOC, f('a', deschisa([0, 0], [50, 0])), f('b', deschisa([50, 0], [50, 40])), f('r', { tip: 'dreptunghi', latime: 10, inaltime: 10, razaColt: 0 }), f('z', cale(true, [100, 0], [120, 0], [110, 20])));
  const r = bun(leagaCaile(e, alese('a', 'b', 'r', 'z'), O()));
  assert.deepEqual(r.piese.map((p) => p.id), ['a']);
  assert.deepEqual(r.sterse, ['b']);
});

test('o instanță rotită cu 90°: calea ei, în coordonatele primei', () => {
  const d0 = docDin(STOC, f('a', deschisa([0, 0], [50, 0])), { id: 'b', forma: deschisa([0, 0], [40, 0]), matrice: { ...ID, e: 50, f: 0 } });
  const d: Document = { ...d0, foi: d0.foi.map((fo) => ({ ...fo, instante: fo.instante.map((i) => (i.id === 'b' ? { ...i, rotire: 90 } : i)) })) };
  const r = bun(leagaCaile(d, alese('a', 'b'), O()));
  aproape(puncte(formaIn(r, 'a')), [[0, 0], [50, 0], [50, 40]], 'rotită');
});

test('refuzurile: operațiile diferite (și „operația primei”), piesele, piesa pusă de două ori, matricea neuniformă, fără arie, toleranța, nimic', () => {
  const A = f('a', deschisa([0, 0], [50, 0])), B = f('b', deschisa([50, 0], [50, 40]));
  const op = cuOperatie(docDin(STOC, A, B), 'b', { adancime: 5 });
  assert.deepEqual(leagaCaile(op, alese('a', 'b'), O()), { ok: false, motiv: 'operatii' });
  const prima = bun(leagaCaile(op, alese('a', 'b'), O({ operatii: 'prima' })));
  assert.equal(prima.piese.find((p) => p.id === 'a')?.operatii[0]?.adancime, 3, 'operația primei');
  // O piesă cu două forme (o cale și un dreptunghi) și o cale singură: „Degrupează întâi”.
  const g = docDin(STOC, A);
  const grup: Piesa = {
    id: 'g', operatii: [operatieImplicita('b', B.forma), operatieImplicita('r', { tip: 'dreptunghi', latime: 5, inaltime: 5, razaColt: 0 })],
    radacina: { tip: 'grup', id: 'g', matrice: { ...ID }, copii: [
      { tip: 'element', id: 'b', forma: B.forma, matrice: { ...ID } },
      { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: 5, inaltime: 5, razaColt: 0 }, matrice: { ...ID, e: 200, f: 200 } },
    ] },
  };
  const dg: Document = { ...g, piese: [...g.piese, grup], foi: g.foi.map((fo) => ({ ...fo, instante: [...fo.instante, { id: 'g', piesa: 'g', x: 0, y: 0, rotire: 0 }] })) };
  assert.deepEqual(leagaCaile(dg, alese('a', 'g'), O()), { ok: false, motiv: 'piese' });
  // Două căi în aceeași piesă: piesa se schimbă (calea legată, cealaltă scoasă), nicio instanță ștearsă.
  const grup2: Piesa = {
    id: 'h', operatii: [operatieImplicita('p', A.forma), operatieImplicita('q', B.forma)],
    radacina: { tip: 'grup', id: 'h', matrice: { ...ID }, copii: [
      { tip: 'element', id: 'p', forma: A.forma, matrice: { ...ID } }, { tip: 'element', id: 'q', forma: B.forma, matrice: { ...ID } },
    ] },
  };
  const dh: Document = { ...g, piese: [grup2], foi: g.foi.map((fo) => ({ ...fo, instante: [{ id: 'h', piesa: 'h', x: 0, y: 0, rotire: 0 }] })) };
  const rh = bun(leagaCaile(dh, alese('h'), O()));
  assert.deepEqual(rh.sterse, []);
  aproape(puncte(formaIn(rh, 'h', 'p')), [[0, 0], [50, 0], [50, 40]], 'în aceeași piesă');
  const ph = rh.piese[0] as Piesa;
  assert.ok(ph.radacina.tip === 'element' || ph.radacina.copii.length === 1, 'q a plecat');
  assert.deepEqual(ph.operatii.map((o) => o.noduri), [['p']], 'operația lui q a plecat cu el');
  // Piesa lui b pusă de două ori: nu se schimbă de aici.
  const d2 = docDin(STOC, A, B);
  const dd: Document = { ...d2, foi: d2.foi.map((fo) => ({ ...fo, instante: [...fo.instante, { id: 'b2', piesa: 'b', x: 300, y: 0, rotire: 0 }] })) };
  assert.deepEqual(leagaCaile(dd, alese('a', 'b'), O()), { ok: false, motiv: 'impartita' });
  // Prima cale întinsă neuniform (doar linii), a doua cu un arc: arcul n-ar rămâne arc.
  const n0 = docDin(STOC, { id: 'a', forma: deschisa([0, 0], [25, 0]), matrice: { a: 2, b: 0, c: 0, d: 1, e: 0, f: 0 } }, f('b', deschisa(arc(90, 40, -0.4), [50, 0])));
  assert.deepEqual(leagaCaile(n0, alese('a', 'b'), O()), { ok: false, motiv: 'transformare' });
  // Dus-întors: lipită la ambele capete, calea s-ar închide fără arie.
  const z = docDin(STOC, A, f('b', deschisa([50, 0], [0, 0])));
  assert.deepEqual(leagaCaile(z, alese('a', 'b'), O()), { ok: false, motiv: 'degenerata' });
  assert.deepEqual(leagaCaile(docDin(STOC, A, B), alese('a', 'b'), O({ toleranta: 0 })), { ok: false, motiv: 'toleranta' });
  assert.deepEqual(leagaCaile(docDin(STOC, f('r', { tip: 'cerc', raza: 5 })), alese('r'), O()), { ok: false, motiv: 'nimic' });
});

test('Verificarea: rândul leagă doar prin lipire; „toate”, perechile lipite ale foii, cu T-urile numărate', () => {
  const A = f('a', deschisa([0, 0], [50, 0])), B = f('b', deschisa([50, 0.004], [50, 40]));
  const r = bun(leagaCaile(docDin(STOC, A, B), { fel: 'capete', elemente: ['a/a', 'b/b'] }, O()));
  aproape(puncte(formaIn(r, 'a')), [[0, 0], [50, 0], [50, 40]], 'rândul');
  const g = docDin(STOC, A, f('b', deschisa([52, 0], [100, 0])));
  assert.deepEqual(leagaCaile(g, { fel: 'capete', elemente: ['a/a', 'b/b'] }, O()), { ok: false, motiv: 'prea-departe', gol: 2 });
  assert.deepEqual(leagaCaile(g, { fel: 'capete', elemente: ['a/a', 'x/x'] }, O()), { ok: false, motiv: 'disparuta' });
  const toate = docDin(STOC, A, B, f('c', deschisa([200, 0], [250, 0])), f('d', deschisa([250, 0], [300, 0])), f('e', deschisa([250, 40], [250, 0])),
    f('g1', deschisa([400, 0], [410, 0])), f('g2', deschisa([412, 0], [420, 0])));
  const t = bun(leagaCaile(toate, { fel: 'toate', alese: null }, O()));
  assert.deepEqual(t.sterse, ['b']);
  assert.equal(t.nelegate.t, 1);
  assert.deepEqual([t.cai, t.rezultate], [2, 1]);
});

test('aplicată prin acțiune: un pas de anulare, exact; documentul de după trece de ușă; oracolul: fiecare punct al căii legate pe căile de dinainte sau pe linia nouă', () => {
  const d = docDin(STOC, f('s1', deschisa([0, 0], [50, 0])), f('s2', deschisa(arc(50, 0, 0.3), [50, 50])), f('s3', deschisa(cub(0, 50, [10, 70], [40, 70]), [50, 50])),
    f('s4', deschisa([0, 50], [0, 0])));
  const r = bun(leagaCaile(d, alese('s1', 's2', 's3', 's4'), O()));
  // Oracolul, din eșantioane: fiecare punct al căii legate la cel mult 1e-6 de una din căile de dinainte, și invers.
  const dupa = chenarElement({ forma: formaIn(r, 's1'), matrice: ID });
  const inainte = elementeFoaie(d, 0).map((e) => chenarElement(e));
  const esantioane = (c: Contur): Punct[] => {
    const rez: Punct[] = [];
    const n = c.inchis ? c.varfuri.length : c.varfuri.length - 1;
    for (let i = 0; i < n; i++) for (let k = 0; k <= 50; k++) rez.push(punctPe(segment(c, i), k / 50));
    return rez;
  };
  const multimea = (cs: readonly Contur[]): Punct[] => cs.flatMap((c) => {
    const n = c.inchis ? c.varfuri.length : c.varfuri.length - 1;
    const p: Punct[] = [];
    for (let i = 0; i < n; i++) for (let k = 0; k <= 2000; k++) p.push(punctPe(segment(c, i), k / 2000));
    return p;
  });
  const lingaOricare = (p: Punct, m: readonly Punct[], eps: number): boolean => m.some((q) => Math.hypot(p.x - q.x, p.y - q.y) <= eps);
  const mi = multimea(inainte), md = multimea([dupa]);
  for (const p of esantioane(dupa)) assert.ok(lingaOricare(p, mi, 0.06), `după, ${JSON.stringify(p)}`);
  for (const c of inainte) for (const p of esantioane(c)) assert.ok(lingaOricare(p, md, 0.06), `înainte, ${JSON.stringify(p)}`);
  assert.ok(Math.abs(lungime(dupa) - inainte.reduce((s, c) => s + lungime(c), 0)) < 1e-6, 'lungimea, suma lor');
  const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  let h: Istoric = istoricNou(d);
  let sel: readonly string[] = ['s1', 's2', 's3', 's4'];
  const ctx: ContextDocument = { istoric: () => h, scrie: (n) => { h = n; }, selectie: () => sel, selecteaza: (ids) => { sel = ids; }, doarCitire: () => false };
  assert.deepEqual(ruleaza(R, 'document.repara', { ...ctx, reparatie: () => ({ doc: d, piese: r.piese, sterse: r.sterse }) }), { ok: true });
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(h.doc))), 'documentul de după trece de ușă');
  assert.deepEqual(h.doc.foi[0]?.instante.map((i) => i.id), ['s1']);
  assert.deepEqual(sel, ['s1'], 'alese rămân cele nesterse');
  assert.deepEqual({ ...anuleaza(h).doc, rev: d.rev }, d, 'anularea pune documentul exact');
});
