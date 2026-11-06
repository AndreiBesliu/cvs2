/**
 * Tăierea cu o linie dreaptă (ADR 0180, felia 10.3↑), pe hârtie: pătratul 100 × 100 tăiat la X = 50 (două dreptunghiuri 50 ×
 * 100, cu închidere; două căi deschise, tăiate pe partea din afară, fără), cercul tăiat prin centru (două semicercuri separate,
 * câte un arc; nota owner-ului), cercul tăiat la 20 mm de centru (tăieturile în (220, 200 ± √2100), segmentele de 1 981,68 și
 * 5 872,30 mm²), inelul R50 / R30 (două „U”-uri de câte 2 513,27 mm², rolul exterior păstrat), cubica tăiată exact (cele două
 * jumătăți refac curba), vârfurile neatinse la bit, linia prin vârfuri, atingerile care nu taie, latura pe linie, ghidajul,
 * instanța rotită, calea deschisă, buzunarul scos de pe bucățile deschise, refuzurile.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import { arieCuSemn, type Contur } from '../../src/geom/contur.ts';
import type { Document, ElementNod, FormaDoc, Instanta, Nod, Operatie, Piesa, VarfDoc } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import { executa, istoricNou, type Istoric } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie, type CerereTaiere, type Cutit, type RezultatTaiere } from '../../src/model/taiere.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument, type TaiereCalculata } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';

const stoc = { latime: 1000, inaltime: 1000, grosime: 18 };
const L = { tip: 'L' } as const;
const cale = (inchis: boolean, ...p: ReadonlyArray<readonly [number, number]>): FormaDoc =>
  ({ tip: 'cale', inchis, varfuri: p.map(([x, y]): VarfDoc => ({ p: { x, y }, s: L })) });
const forma = (id: string, f: FormaDoc, x = 0, y = 0) => ({ id, forma: f, matrice: { ...ID, e: x, f: y } });
const patrat = (id: string, x: number, y: number, latura = 100) => forma(id, { tip: 'dreptunghi', latime: latura, inaltime: latura, razaColt: 0 }, x, y);
const cercF = (id: string, x: number, y: number, r = 50) => forma(id, { tip: 'cerc', raza: r }, x, y);

const cerere = (cutit: Cutit, alese: readonly string[], inchide = true): CerereTaiere => ({ cutit, alese, inchide });
const X = (x: number): Cutit => ({ fel: 'x', x });
const Y = (y: number): Cutit => ({ fel: 'y', y });

/** Documentul după tăiere (comanda `degrupeaza`), trecut prin ușă. */
function aplica(d: Document, r: RezultatTaiere): Document {
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  const foaie = d.foi[0];
  assert.ok(foaie);
  const dupa = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: r.degrupate }).doc;
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), 'documentul de după trece de ușă');
  return dupa;
}
const taiat = (d: Document, c: CerereTaiere): { readonly dupa: Document; readonly r: Extract<RezultatTaiere, { ok: true }> } => {
  const r = taie(d, c);
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  return { dupa: aplica(d, r), r };
};
/** Contururile în lume ale unei instanțe. */
const contururi = (d: Document, inst: string): Contur[] => elementeFoaie(d).filter((e) => e.instanta === inst).map((e) => conturElement(e));
const piesa = (d: Document, id: string): Piesa => d.piese.find((p) => p.id === id) ?? assert.fail(`piesa ${id}`);
const puncte = (c: Contur): Array<[number, number]> => c.varfuri.map((v) => [v.p.x, v.p.y]);
const sortate = (p: ReadonlyArray<readonly [number, number]>): Array<[number, number]> => [...p].map(([x, y]): [number, number] => [x, y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const aproape = (a: number, b: number, eps: number, mesaj: string): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };
const arie = (c: Contur): number => Math.abs(arieCuSemn(c));

test('pătratul 100 × 100 tăiat la X = 50, cu închidere: două dreptunghiuri 50 × 100, exact, fiecare o formă cu rolul exterior', () => {
  const d = docDin(stoc, patrat('a', 0, 0));
  const { dupa, r } = taiat(d, cerere(X(50), ['a']));
  assert.equal(r.forme, 1);
  assert.equal(r.scoase, 0);
  assert.equal(r.ids.length, 2);
  assert.deepEqual(dupa.foi[0]?.instante.map((i) => i.id), r.ids, 'părțile iau locul instanței vechi');
  const [a, b] = r.ids.map((id) => contururi(dupa, id));
  assert.equal(a?.length, 1);
  assert.equal(b?.length, 1);
  assert.equal(a?.[0]?.inchis, true);
  assert.deepEqual(sortate(puncte(a?.[0] as Contur)), [[0, 0], [0, 100], [50, 0], [50, 100]]);
  assert.deepEqual(sortate(puncte(b?.[0] as Contur)), [[50, 0], [50, 100], [100, 0], [100, 100]]);
  for (const c of [a?.[0], b?.[0]]) assert.equal(arie(c as Contur), 5000);
  for (const id of r.ids) {
    const p = piesa(dupa, id);
    assert.equal(p.operatii.length, 1);
    const o = p.operatii[0] as Operatie;
    assert.equal(o.tip, 'profil');
    assert.equal(o.latura, 'exterior');
    assert.equal(o.id, 'a', 'operația unică își păstrează id-ul');
    assert.deepEqual(o.noduri, [(p.radacina as ElementNod).id]);
    const i: Instanta | undefined = dupa.foi[0]?.instante.find((x) => x.id === id);
    assert.deepEqual([i?.x, i?.y, i?.rotire], [0, 0, 0], 'instanța nouă stă unde stătea cea veche');
  }
});

test('fără închidere: două căi deschise, tăiate pe partea din afară (dreapta, în sensul desenului)', () => {
  const d = docDin(stoc, patrat('a', 0, 0));
  const { dupa, r } = taiat(d, cerere(X(50), ['a'], false));
  const [a, b] = r.ids.map((id) => contururi(dupa, id)[0] as Contur);
  assert.equal(a?.inchis, false);
  assert.equal(b?.inchis, false);
  assert.deepEqual(puncte(a as Contur), [[50, 100], [0, 100], [0, 0], [50, 0]]);
  assert.deepEqual(puncte(b as Contur), [[50, 0], [100, 0], [100, 100], [50, 100]]);
  for (const id of r.ids) assert.deepEqual(piesa(dupa, id).operatii.map((o) => [o.tip, o.latura]), [['profil', 'dreapta']]);
});

test('cercul tăiat prin centru, fără închidere: două semicercuri separate, fiecare un singur arc de 180° (nota owner-ului)', () => {
  const d = docDin(stoc, cercF('c', 200, 200));
  const { dupa, r } = taiat(d, cerere(X(200), ['c'], false));
  assert.equal(r.ids.length, 2, 'două forme, independente');
  const [stanga, dreapta] = r.ids.map((id) => contururi(dupa, id));
  for (const [c, p0, p1] of [[dreapta, [200, 150], [200, 250]], [stanga, [200, 250], [200, 150]]] as const) {
    assert.equal(c?.length, 1);
    const k = c?.[0] as Contur;
    assert.equal(k.inchis, false);
    assert.equal(k.varfuri.length, 2, 'un singur arc');
    const s = k.varfuri[0]?.s;
    assert.equal(s?.tip, 'A');
    aproape(s?.tip === 'A' ? s.bulge : 0, 1, 1e-12, 'bulge 1: 180° trigonometric');
    aproape(k.varfuri[0]?.p.x ?? NaN, p0[0], 1e-12, 'început x');
    aproape(k.varfuri[0]?.p.y ?? NaN, p0[1], 1e-12, 'început y');
    aproape(k.varfuri[1]?.p.x ?? NaN, p1[0], 1e-12, 'sfârșit x');
    aproape(k.varfuri[1]?.p.y ?? NaN, p1[1], 1e-12, 'sfârșit y');
  }
  // Cercul are profilul pe interior: bucata deschisă e tăiată tot înăuntru, adică în stânga sensului trigonometric.
  for (const id of r.ids) assert.deepEqual(piesa(dupa, id).operatii.map((o) => o.latura), ['stanga']);
});

test('cercul R50 tăiat la 20 mm de centru, cu închidere: tăieturile în (220, 200 ± √2100), segmentele de 1 981,68 și 5 872,30 mm²', () => {
  const d = docDin(stoc, cercF('c', 200, 200));
  const { dupa, r } = taiat(d, cerere(X(220), ['c']));
  const [mare, mic] = r.ids.map((id) => contururi(dupa, id)[0] as Contur);
  const h = Math.sqrt(2100);
  const segment = 2500 * Math.acos(0.4) - 20 * h;
  aproape(segment, 1981.6835628273534, 1e-9, 'pe hârtie');
  aproape(arie(mic as Contur), segment, 1e-9, 'segmentul mic, din dreapta');
  aproape(arie(mare as Contur), Math.PI * 2500 - segment, 1e-9, 'segmentul mare, din stânga');
  const tieturi = sortate(puncte(mic as Contur).filter(([x]) => Math.abs(x - 220) < 1e-9));
  assert.equal(tieturi.length, 2);
  aproape(tieturi[0]?.[1] ?? NaN, 200 - h, 1e-12, 'tăietura de jos');
  aproape(tieturi[1]?.[1] ?? NaN, 200 + h, 1e-12, 'tăietura de sus');
});

/** Inelul: o piesă cu un grup (cercul R50 și gaura R30), cu rolul exterior (exteriorul pe afară, gaura pe dinăuntru). */
function inel(): Document {
  const d = docDin(stoc, cercF('i', 500, 500));
  const scula = (d.piese[0]?.operatii[0] as Operatie).scula;
  const op = (id: string, latura: 'exterior' | 'interior', noduri: string[]): Operatie => ({
    id, tip: 'profil', noduri, scula, latura, sens: 'urcare', adancime: 6, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null,
  });
  const radacina: Nod = {
    tip: 'grup', id: 'i', matrice: { ...ID }, copii: [
      { tip: 'element', id: 'o', forma: { tip: 'cerc', raza: 50 }, matrice: { ...ID } },
      { tip: 'element', id: 'g', forma: { tip: 'cerc', raza: 30 }, matrice: { ...ID } },
    ],
  };
  return { ...d, piese: [{ id: 'i', radacina, operatii: [op('exterior', 'exterior', ['o']), op('interior', 'interior', ['g'])] }] };
}

test('inelul R50 / R30 tăiat prin centru, cu închidere: două „U”-uri închise de câte 2 513,27 mm², cu rolul exterior păstrat', () => {
  const d = inel();
  const { dupa, r } = taiat(d, cerere(X(500), ['i']));
  for (const id of r.ids) {
    const c = contururi(dupa, id);
    assert.equal(c.length, 1, 'un singur contur, nu patru jumătăți');
    assert.equal(c[0]?.inchis, true);
    aproape(arie(c[0] as Contur), (Math.PI * (2500 - 900)) / 2, 1e-9, 'aria U-ului');
    aproape(arie(c[0] as Contur), 2513.2741228718346, 1e-9, 'pe hârtie');
    const ops = piesa(dupa, id).operatii;
    assert.deepEqual(ops.map((o) => [o.tip, o.latura, o.adancime]), [['profil', 'exterior', 6]], 'rolul exterior, cu adâncimea veche');
  }
});

test('inelul tăiat fără închidere: semicercurile exterioare pe afară (dreapta), cele ale găurii pe dinăuntru (stânga)', () => {
  const d = inel();
  const { dupa, r } = taiat(d, cerere(X(500), ['i'], false));
  for (const id of r.ids) {
    const p = piesa(dupa, id);
    assert.equal(contururi(dupa, id).length, 2);
    const laturi = new Map(p.operatii.flatMap((o) => o.noduri.map((n) => [n, o.latura] as const)));
    const elemente = p.radacina.tip === 'grup' ? p.radacina.copii : [];
    // În sistemul piesei, centrul inelului e în origine (locul îl dă instanța).
    const raze = new Map(elemente.map((e) => {
      const c = conturElement(e as ElementNod);
      const v = c.varfuri[0]?.p;
      return [e.id, v ? Math.round(Math.hypot(v.x, v.y)) : 0] as const;
    }));
    assert.deepEqual([...raze.values()].sort(), [30, 50]);
    for (const [n, lat] of laturi) assert.equal(lat, raze.get(n) === 50 ? 'dreapta' : 'stanga', `latura pe ${n}`);
  }
});

test('inelul tăiat pe lângă gaură, la X = 540: gaura, netăiată, merge cu partea ei, iar fiecare contur își păstrează operația', () => {
  const d0 = inel();
  const p0 = d0.piese[0] as Piesa;
  // Gaura cu altă adâncime decât exteriorul: rolul își refolosește operația fiecărei laturi, nu doar prima.
  const d: Document = { ...d0, piese: [{ ...p0, operatii: p0.operatii.map((o) => (o.latura === 'interior' ? { ...o, adancime: 4 } : o)) }] };
  const { dupa, r } = taiat(d, cerere(X(540), ['i']));
  const [stanga, dreapta] = r.ids.map((id) => piesa(dupa, id));
  assert.ok(stanga && dreapta);
  assert.equal(contururi(dupa, r.ids[0] as string).length, 2, 'stânga: segmentul mare, închis, și gaura întreagă');
  assert.equal(contururi(dupa, r.ids[1] as string).length, 1, 'dreapta: segmentul mic');
  assert.deepEqual(stanga.operatii.map((o) => [o.latura, o.adancime]).sort(), [['exterior', 6], ['interior', 4]]);
  assert.deepEqual(dreapta.operatii.map((o) => [o.latura, o.adancime]), [['exterior', 6]]);
  const gaura = stanga.radacina.tip === 'grup' ? stanga.radacina.copii.find((c) => c.id === 'g') : undefined;
  assert.ok(gaura && gaura.tip === 'element' && gaura.forma.tip === 'cerc', 'gaura rămâne cercul ei, cu id-ul lui');
  const h = Math.sqrt(2500 - 1600);
  const mic = 2500 * Math.acos(40 / 50) - 40 * h;
  aproape(arie(contururi(dupa, r.ids[1] as string)[0] as Contur), mic, 1e-9, 'segmentul mic, pe hârtie');
});

test('cercul tăiat orizontal prin centru: tăietura cade în nodurile lui; două semidiscuri, fiecare cu un singur arc', () => {
  const d = docDin(stoc, cercF('c', 200, 200));
  const { dupa, r } = taiat(d, cerere(Y(200), ['c']));
  for (const id of r.ids) {
    const c = contururi(dupa, id)[0] as Contur;
    aproape(arie(c), (Math.PI * 2500) / 2, 1e-9, 'semidiscul');
    assert.equal(c.varfuri.length, 2, 'arcul și coarda');
    assert.deepEqual(c.varfuri.map((v) => v.s.tip).sort(), ['A', 'L']);
  }
});

test('o linie la 5e-10 mm de nodurile cercului îl taie o singură dată acolo, ca prin noduri (nu și pe arc, încă o dată)', () => {
  const d = docDin(stoc, cercF('c', 200, 200));
  const { dupa, r } = taiat(d, cerere(Y(200 + 5e-10), ['c']));
  for (const id of r.ids) {
    const c = contururi(dupa, id)[0] as Contur;
    aproape(arie(c), (Math.PI * 2500) / 2, 1e-6, 'semidiscul');
    assert.equal(c.varfuri.length, 2, 'arcul și coarda, fără un nod în plus');
  }
});

test('o cubică tăiată exact: tăietura pe linie, iar cele două jumătăți refac curba (de Casteljau)', () => {
  const lacrima: FormaDoc = {
    tip: 'cale', inchis: true, varfuri: [
      { p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 40, y: 0 }, c2: { x: 40, y: 40 } } },
      { p: { x: 0, y: 40 }, s: { tip: 'C', c1: { x: -20, y: 40 }, c2: { x: -20, y: 0 } } },
    ],
  };
  const d = docDin(stoc, forma('l', lacrima, 100, 100));
  const { dupa, r } = taiat(d, cerere(X(120), ['l'], false));
  // Cubica de la (100, 100): x(t) = 100 + 120·t·(1 − t)² + 120·t²(1 − t) = 100 + 120·t·(1 − t); x = 120 la t = (1 ± √(1/3)) / 2.
  const B = (t: number): [number, number] => {
    const u = 1 - t;
    return [100 + 3 * u * u * t * 40 + 3 * u * t * t * 40, 100 + 3 * u * t * t * 40 + t * t * t * 40];
  };
  const t1 = (1 - Math.sqrt(1 / 3)) / 2, t2 = (1 + Math.sqrt(1 / 3)) / 2;
  aproape(B(t1)[0], 120, 1e-12, 'prima tăietură, pe hârtie');
  const bucati = r.ids.flatMap((id) => contururi(dupa, id));
  assert.equal(bucati.length, 2);
  // Fiecare bucată, eșantionată, stă pe curba veche (la parametrul ei) la sub 1e-9 mm.
  const peCurba = (q: { readonly x: number; readonly y: number }): number => {
    let best = Infinity;
    for (let k = 0; k <= 4000; k++) {
      const [x, y] = B(k / 4000);
      best = Math.min(best, Math.hypot(x - q.x, y - q.y));
    }
    let lo = 0, hi = 1;
    for (let it = 0; it < 80; it++) {
      const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
      const d1 = Math.hypot(B(m1)[0] - q.x, B(m1)[1] - q.y), d2 = Math.hypot(B(m2)[0] - q.x, B(m2)[1] - q.y);
      if (d1 < d2) hi = m2; else lo = m1;
    }
    return Math.min(best, Math.hypot(B((lo + hi) / 2)[0] - q.x, B((lo + hi) / 2)[1] - q.y));
  };
  const tieturi = bucati.flatMap((c) => [c.varfuri[0]?.p, c.varfuri[c.varfuri.length - 1]?.p]);
  for (const q of tieturi) aproape(q?.x ?? NaN, 120, 1e-12, 'capătul bucății, pe linie');
  const ys = sortate(tieturi.map((q) => [q?.x ?? NaN, q?.y ?? NaN])).map(([, y]) => y);
  aproape(ys[0] ?? NaN, B(t1)[1], 1e-9, 'tăietura de jos, pe hârtie');
  aproape(ys[ys.length - 1] ?? NaN, B(t2)[1], 1e-9, 'tăietura de sus, pe hârtie');
  const mijloc = bucati.find((c) => c.varfuri.every((v) => v.p.x >= 120 - 1e-9));
  assert.ok(mijloc, 'bucata din dreapta liniei');
  const s = mijloc.varfuri[0]?.s;
  assert.equal(s?.tip, 'C');
  if (s?.tip === 'C') {
    const a = mijloc.varfuri[0]?.p as { x: number; y: number }, b = mijloc.varfuri[1]?.p as { x: number; y: number };
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, u = 1 - t;
      const q: { x: number; y: number } = {
        x: u * u * u * a.x + 3 * u * u * t * s.c1.x + 3 * u * t * t * s.c2.x + t * t * t * b.x,
        y: u * u * u * a.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t * t * t * b.y,
      };
      assert.ok(peCurba(q) < 1e-9, `punctul ${k} al bucății, pe curba veche: ${peCurba(q)}`);
    }
  }
});

test('vârfurile neatinse rămân la bit: un poligon cu coordonate oarecare, tăiat prin mijloc', () => {
  const p: Array<[number, number]> = [];
  for (let k = 0; k < 37; k++) {
    const u = (2 * Math.PI * k) / 37;
    p.push([123.456789 + (40 + 7 * Math.sin(3 * u)) * Math.cos(u), 210.987654 + (40 + 7 * Math.sin(3 * u)) * Math.sin(u)]);
  }
  const f = cale(true, ...p);
  const d = docDin(stoc, forma('p', f));
  const { dupa, r } = taiat(d, cerere(X(123.456789 + 3.3), ['p'], false));
  const dupaV = r.ids.flatMap((id) => {
    const rad = piesa(dupa, id).radacina;
    return rad.tip === 'element' && rad.forma.tip === 'cale' ? rad.forma.varfuri.map((v) => v.p) : [];
  });
  for (const [x, y] of p) assert.ok(dupaV.some((q) => Object.is(q.x, x) && Object.is(q.y, y)), `vârful (${x}, ${y}) rămâne la bit`);
  assert.equal(dupaV.length, p.length + 2 * 2, 'plus cele două tăieturi, în ambele bucăți');
});

test('linia prin două vârfuri ale rombului: două triunghiuri de 2 500 mm², fără noduri noi', () => {
  const d = docDin(stoc, forma('r', cale(true, [50, 0], [100, 50], [50, 100], [0, 50])));
  const { dupa, r } = taiat(d, cerere(X(50), ['r']));
  const [a, b] = r.ids.map((id) => contururi(dupa, id)[0] as Contur);
  assert.deepEqual(sortate(puncte(a as Contur)), [[0, 50], [50, 0], [50, 100]]);
  assert.deepEqual(sortate(puncte(b as Contur)), [[50, 0], [50, 100], [100, 50]]);
  for (const c of [a, b]) assert.equal(arie(c as Contur), 2500);
});

test('atingerile nu taie: cercul tangent la linie, triunghiul cu un vârf pe linie, pătratul cu o latură pe linie', () => {
  const d = docDin(stoc, cercF('c', 200, 200), forma('t', cale(true, [400, 0], [450, 50], [500, 0])), patrat('a', 600, 0));
  assert.deepEqual(taie(d, cerere(X(250), ['c'])), { ok: false, motiv: 'nimic-taiat' });
  assert.deepEqual(taie(d, cerere(Y(50), ['t'])), { ok: false, motiv: 'nimic-taiat' });
  assert.deepEqual(taie(d, cerere(X(600), ['a'])), { ok: false, motiv: 'nimic-taiat' });
  assert.deepEqual(taie(d, cerere(X(700), ['a'])), { ok: false, motiv: 'nimic-taiat' });
});

test('o latură pe linie, cu forma de ambele părți: refuz („pe-linie”)', () => {
  const d = docDin(stoc, forma('z', cale(true, [-10, -10], [0, -10], [0, 10], [10, 10], [10, 20], [-10, 20]), 100, 100));
  assert.deepEqual(taie(d, cerere(X(100), ['z'])), { ok: false, motiv: 'pe-linie' });
});

test('ghidajul orizontal y = 50 taie pătratul în două dreptunghiuri 100 × 50; un ghidaj lipsă e refuzat', () => {
  const d0 = docDin(stoc, patrat('a', 0, 0));
  const foaie = d0.foi[0];
  assert.ok(foaie);
  const d: Document = { ...d0, foi: [{ ...foaie, ghidaje: [{ id: 'g1', axa: 'y', poz: 50 }] }] };
  const { dupa, r } = taiat(d, cerere({ fel: 'ghidaj', id: 'g1' }, ['a']));
  const [jos, sus] = r.ids.map((id) => contururi(dupa, id)[0] as Contur);
  assert.deepEqual(sortate(puncte(jos as Contur)), [[0, 0], [0, 50], [100, 0], [100, 50]]);
  assert.deepEqual(sortate(puncte(sus as Contur)), [[0, 50], [0, 100], [100, 50], [100, 100]]);
  assert.deepEqual(taie(d, cerere({ fel: 'ghidaj', id: 'g2' }, ['a'])), { ok: false, motiv: 'ghidaj' });
});

test('instanța rotită cu 90°: dreptunghiul 100 × 40 de la (300, 300), tăiat la Y = 350, dă două bucăți de 40 × 50', () => {
  const d0 = docDin(stoc, forma('a', { tip: 'dreptunghi', latime: 100, inaltime: 40, razaColt: 0 }, 300, 300));
  const foaie = d0.foi[0];
  assert.ok(foaie);
  const d: Document = { ...d0, foi: [{ ...foaie, instante: foaie.instante.map((i) => ({ ...i, rotire: 90 })) }] };
  const { dupa, r } = taiat(d, cerere(Y(350), ['a']));
  const [jos, sus] = r.ids.map((id) => contururi(dupa, id)[0] as Contur);
  assert.deepEqual(sortate(puncte(jos as Contur)), [[260, 300], [260, 350], [300, 300], [300, 350]]);
  assert.deepEqual(sortate(puncte(sus as Contur)), [[260, 350], [260, 400], [300, 350], [300, 400]]);
  for (const id of r.ids) assert.equal(dupa.foi[0]?.instante.find((i) => i.id === id)?.rotire, 90, 'rotirea instanței rămâne');
});

test('o cale deschisă, pe linie: bucățile (0, 0)–(50, 0) și (50, 0)–(100, 0)–(100, 100), cu rolul „pe linie”', () => {
  const d = cuOperatie(docDin(stoc, forma('l', cale(false, [0, 0], [100, 0], [100, 100]))), 'l', { latura: 'pe-linie' });
  const { dupa, r } = taiat(d, cerere(X(50), ['l']));
  const [a, b] = r.ids.map((id) => contururi(dupa, id)[0] as Contur);
  assert.deepEqual(puncte(a as Contur), [[0, 0], [50, 0]]);
  assert.deepEqual(puncte(b as Contur), [[50, 0], [100, 0], [100, 100]]);
  for (const id of r.ids) assert.deepEqual(piesa(dupa, id).operatii.map((o) => [o.tip, o.latura]), [['profil', 'pe-linie']]);
});

test('buzunarul: pe bucățile închise rămâne pe ambele jumătăți; de pe cele deschise se scoate, numărat', () => {
  const d0 = docDin(stoc, patrat('a', 0, 0));
  const p0 = d0.piese[0];
  assert.ok(p0);
  const o0 = p0.operatii[0] as Operatie;
  const buzunar: Operatie = { ...o0, tip: 'buzunar', latura: 'interior', pasLateral: 2.4 };
  const d: Document = { ...d0, piese: [{ ...p0, operatii: [buzunar] }] };
  const inchis = taiat(d, cerere(X(50), ['a']));
  assert.equal(inchis.r.scoase, 0);
  for (const id of inchis.r.ids) assert.deepEqual(piesa(inchis.dupa, id).operatii.map((o) => [o.tip, o.pasLateral]), [['buzunar', 2.4]]);
  const deschis = taiat(d, cerere(X(50), ['a'], false));
  assert.equal(deschis.r.scoase, 2);
  for (const id of deschis.r.ids) assert.deepEqual(piesa(deschis.dupa, id).operatii, []);
});

test('buzunarul pus pe o cale deschisă pleacă și de pe bucățile ei (ADR 0180 §7), numărat', () => {
  const d0 = docDin(stoc, forma('l', cale(false, [0, 0], [100, 0], [100, 100])));
  const p0 = d0.piese[0];
  assert.ok(p0);
  const d: Document = { ...d0, piese: [{ ...p0, operatii: [{ ...(p0.operatii[0] as Operatie), tip: 'buzunar', latura: 'interior', pasLateral: 2.4 }] }] };
  const { dupa, r } = taiat(d, cerere(X(50), ['l']));
  assert.equal(r.scoase, 2);
  for (const id of r.ids) assert.deepEqual(piesa(dupa, id).operatii, []);
});

test('doar instanțele prin care trece linia se taie; celelalte rămân la locul lor', () => {
  const d = docDin(stoc, patrat('a', 0, 0), patrat('b', 300, 0));
  const { dupa, r } = taiat(d, cerere(X(50), ['a', 'b']));
  assert.equal(r.degrupate.length, 1);
  assert.deepEqual(dupa.foi[0]?.instante.map((i) => i.id), [...r.ids, 'b']);
  assert.equal(piesa(dupa, 'b'), d.piese[1], 'piesa neatinsă e chiar aceeași');
});

test('refuzurile: nimic ales, o valoare care nu e număr, o piesă pusă de două ori', () => {
  const d = docDin(stoc, patrat('a', 0, 0));
  assert.deepEqual(taie(d, cerere(X(50), [])), { ok: false, motiv: 'nimic-ales' });
  assert.deepEqual(taie(d, cerere(X(Number.NaN), ['a'])), { ok: false, motiv: 'valoare' });
  const foaie = d.foi[0];
  assert.ok(foaie);
  const dublu: Document = { ...d, foi: [{ ...foaie, instante: [...foaie.instante, { id: 'a2', piesa: 'a', x: 0, y: 200, rotire: 0 }] }] };
  assert.deepEqual(taie(dublu, cerere(X(50), ['a'])), { ok: false, motiv: 'impartita' });
});

const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
function context(d: Document, selectie: readonly string[], doarCitire = false): ContextDocument & { readonly h: () => Istoric; readonly s: () => readonly string[] } {
  let h = istoricNou(d);
  let sel: readonly string[] = selectie;
  return { istoric: () => h, scrie: (nou) => { h = nou; }, selectie: () => sel, selecteaza: (ids) => { sel = ids; }, doarCitire: () => doarCitire, h: () => h, s: () => sel };
}
const calculata = (d: Document, c: CerereTaiere): TaiereCalculata => {
  const r = taie(d, c);
  if (!r.ok) return assert.fail(`refuzată: ${r.motiv}`);
  return { doc: d, degrupate: r.degrupate, ids: r.ids };
};

test('document.taie: un singur pas de anulare, alese rămân părțile; anularea și refacerea pun documentul exact', () => {
  const d = docDin(stoc, patrat('a', 0, 0), cercF('c', 300, 300));
  const ctx = context(d, ['a', 'c']);
  const t = calculata(d, cerere(X(50), ['a', 'c']));
  assert.deepEqual(ruleaza(R, 'document.taie', { ...ctx, taiere: () => t }), { ok: true });
  assert.equal(ctx.h().trecut.length, 1);
  assert.deepEqual(ctx.s(), t.ids);
  assert.equal(ctx.h().doc.foi[0]?.instante.length, 3, 'pătratul în două, cercul neatins');
  ruleaza(R, 'istoric.anuleaza', ctx);
  assert.deepEqual({ ...ctx.h().doc, rev: d.rev }, d, 'anularea pune documentul de dinainte (doar revizia crește)');
  ruleaza(R, 'istoric.reface', ctx);
  assert.equal(ctx.h().doc.foi[0]?.instante.length, 3);
});

test('document.taie: o tăiere calculată pe un desen vechi e refuzată; o filă doar de citit nu taie', () => {
  const d = docDin(stoc, patrat('a', 0, 0));
  const t = calculata(d, cerere(X(50), ['a']));
  const ctx = context({ ...d, rev: d.rev + 1 }, ['a']);
  assert.deepEqual(stare(R, 'document.taie', { ...ctx, taiere: () => t }), { ok: false, motiv: 'editare.taiere.motiv.veche' });
  assert.deepEqual(ruleaza(R, 'document.taie', { ...ctx, taiere: () => t }), { ok: false, motiv: 'editare.taiere.motiv.veche' });
  assert.equal(ctx.h().trecut.length, 0);
  assert.deepEqual(stare(R, 'document.taie', { ...context(d, ['a'], true), taiere: () => t }), { ok: false, motiv: 'motiv.doar-citire' });
  assert.deepEqual(stare(R, 'document.taie', context(d, ['a'])), { ok: false, motiv: 'motiv.nimic-ales' });
});
