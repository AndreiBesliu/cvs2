/**
 * Foarfeca și Retează (ADR 0181 §4, §5; felia 10.3↑g), pe hârtie:
 * - **foarfeca**: cercul R50, cu clicul lângă (50, 0), se deschide chiar în nodul de acolo: o cale de 314,159 mm cu ambele capete
 *   în (50, 0); calea (0, 0)–(100, 0)–(100, 100) tăiată în (100, 40) dă două forme, cu vârful tăieturii la bit; o cubică tăiată
 *   la mijloc se reface din cele două jumătăți; inelul deschis pe exterior: conturul deschis și gaura, două forme; refuzurile
 *   (capătul unei căi deschise, clicul departe de contur);
 * - **retezatul**: liniile (0, 0)–(100, 0) și (80, −20)–(80, 20): clicul în (90, 0) lasă (0, 0)–(80, 0), cel în (80, 10) lasă
 *   (80, −20)–(80, 0); „#”-ul dintr-o singură piesă (patru linii), cu opt clicuri, devine pătratul 60 × 60, tot o piesă;
 *   dreptunghiul 100 × 60 trecut de linia x = 50, retezat în dreapta: calea deschisă de 160 mm prin stânga; o formă fără locuri
 *   comune pleacă toată; locurile comune sunt doar cu formele alese.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { is } from 'valibot';
import type { Contur } from '../../src/geom/contur.ts';
import type { Document, FormaDoc, Nod, Piesa, VarfDoc } from '../../src/model/document.ts';
import { conturElement } from '../../src/model/forme.ts';
import { executa, istoricNou } from '../../src/model/jurnal.ts';
import { elementeFoaie } from '../../src/model/lume.ts';
import { SchemaDocument } from '../../src/model/schemaDocument.ts';
import { taie, type RezultatTaiere } from '../../src/model/taiere.ts';
import { docDin, ID } from './ajutor-document.ts';

const stoc = { latime: 1000, inaltime: 1000, grosime: 18 };
const L = { tip: 'L' } as const;
const cale = (inchis: boolean, ...p: ReadonlyArray<readonly [number, number]>): FormaDoc =>
  ({ tip: 'cale', inchis, varfuri: p.map(([x, y]): VarfDoc => ({ p: { x, y }, s: L })) });
const forma = (id: string, f: FormaDoc, x = 0, y = 0) => ({ id, forma: f, matrice: { ...ID, e: x, f: y } });
const foarfeca = (id: string, x: number, y: number, toleranta = 1) => ({ fel: 'foarfeca' as const, id, punct: { x, y }, toleranta });
const reteaza = (id: string, x: number, y: number, toleranta = 1) => ({ fel: 'reteaza' as const, id, punct: { x, y }, toleranta });

/** Documentul după tăiere (degruparea și ștergerile, ca acțiunea `document.taie`), trecut prin ușă. */
function aplica(d: Document, r: RezultatTaiere): Document {
  if (!r.ok) assert.fail(`refuzată: ${r.motiv}`);
  const foaie = d.foi[0];
  assert.ok(foaie);
  let dupa = executa(istoricNou(d), { tip: 'degrupeaza', foaie: foaie.id, degrupate: r.degrupate }).doc;
  if (r.sterse.length > 0) {
    const sterse = new Set(r.sterse);
    dupa = { ...dupa, foi: dupa.foi.map((f) => ({ ...f, instante: f.instante.filter((i) => !sterse.has(i.id)) })) };
  }
  assert.ok(is(SchemaDocument, JSON.parse(JSON.stringify(dupa))), 'documentul de după trece de ușă');
  return dupa;
}
const contururi = (d: Document, inst: string): Contur[] => elementeFoaie(d).filter((e) => e.instanta === inst).map((e) => conturElement(e));
const varfuri = (c: Contur): Array<[number, number]> => c.varfuri.map((v) => [v.p.x, v.p.y]);
const aproape = (a: number, b: number, eps: number, mesaj: string): void => { assert.ok(Math.abs(a - b) <= eps, `${mesaj}: ${a} ≠ ${b}`); };
const refuz = (d: Document, r: RezultatTaiere): string => (r.ok ? 'tăiată' : r.motiv);

/** Lungimea unui contur din linii, arce și cubice (cubicele, prin 16 384 de coarde: eroarea sub 1e-7 mm aici). */
function lungime(c: Contur): number {
  let s = 0;
  const n = c.varfuri.length, m = c.inchis ? n : n - 1;
  for (let k = 0; k < m; k++) {
    const a = c.varfuri[k] as Contur['varfuri'][number], b = c.varfuri[(k + 1) % n] as Contur['varfuri'][number];
    const coarda = Math.hypot(b.p.x - a.p.x, b.p.y - a.p.y);
    if (a.s.tip === 'A' && Math.abs(a.s.bulge) > 1e-12) {
      const u = 4 * Math.atan(Math.abs(a.s.bulge));
      s += (coarda / (2 * Math.sin(u / 2))) * u;
    } else if (a.s.tip === 'C') {
      const { c1, c2 } = a.s;
      let q = a.p;
      for (let i = 1; i <= 16384; i++) {
        const t = i / 16384, w = 1 - t;
        const r = { x: w * w * w * a.p.x + 3 * w * w * t * c1.x + 3 * w * t * t * c2.x + t * t * t * b.p.x, y: w * w * w * a.p.y + 3 * w * w * t * c1.y + 3 * w * t * t * c2.y + t * t * t * b.p.y };
        s += Math.hypot(r.x - q.x, r.y - q.y);
        q = r;
      }
    } else s += coarda;
  }
  return s;
}

// ——— Foarfeca ———

test('foarfeca pe cercul R50, cu clicul lângă (50, 0): se deschide chiar în nodul de acolo; o cale de 314,159 mm cu capetele în (50, 0)', () => {
  const d = docDin(stoc, forma('c', { tip: 'cerc', raza: 50 }));
  const r = taie(d, { cutit: foarfeca('c', 50.3, 0.2), alese: ['c'], inchide: false });
  const dupa = aplica(d, r);
  assert.ok(r.ok);
  assert.equal(r.ids.length, 1, 'o singură formă: cercul deschis');
  const [c] = contururi(dupa, r.ids[0] as string);
  assert.ok(c);
  assert.equal(c.inchis, false);
  aproape(lungime(c), 100 * Math.PI, 1e-9, 'lungimea');
  const prim = c.varfuri[0]?.p, ultim = c.varfuri[c.varfuri.length - 1]?.p;
  assert.ok(prim && ultim && Math.hypot(prim.x - 50, prim.y) < 1e-9 && Math.hypot(ultim.x - 50, ultim.y) < 1e-9, 'capetele în (50, 0)');
});

test('foarfeca pe calea (0, 0)–(100, 0)–(100, 100), în (100, 40): două forme, cu vârful tăieturii la bit', () => {
  const d = docDin(stoc, forma('p', cale(false, [0, 0], [100, 0], [100, 100])));
  const r = taie(d, { cutit: foarfeca('p', 100.4, 40), alese: ['p'], inchide: false });
  const dupa = aplica(d, r);
  assert.ok(r.ok);
  assert.equal(r.ids.length, 2);
  const toate = r.ids.map((id) => varfuri(contururi(dupa, id)[0] as Contur)).sort((a, b) => a.length - b.length);
  assert.deepEqual(toate, [[[100, 40], [100, 100]], [[0, 0], [100, 0], [100, 40]]]);
});

test('foarfeca pe o cubică, la mijloc: cele două jumătăți refac curba, cu tăietura pe ea', () => {
  const cub: FormaDoc = { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'C', c1: { x: 30, y: 60 }, c2: { x: 70, y: 60 } } }, { p: { x: 100, y: 0 }, s: L }] };
  const d = docDin(stoc, forma('q', cub));
  const r = taie(d, { cutit: foarfeca('q', 50, 45.2), alese: ['q'], inchide: false });
  const dupa = aplica(d, r);
  assert.ok(r.ok);
  assert.equal(r.ids.length, 2);
  const [a, b] = r.ids.map((id) => contururi(dupa, id)[0] as Contur) as [Contur, Contur];
  aproape(lungime(a) + lungime(b), lungime(conturElement({ forma: cub, matrice: { ...ID } })), 1e-6, 'lungimea, din cele două jumătăți');
  const capA = a.varfuri[a.varfuri.length - 1]?.p, capB = b.varfuri[0]?.p;
  assert.ok(capA && capB && Math.hypot(capA.x - capB.x, capA.y - capB.y) < 1e-9, 'jumătățile se ating în tăietură');
  aproape(capA.x, 50, 1e-6, 'tăietura, la mijlocul curbei');
  aproape(capA.y, 45, 1e-6, 'tăietura, pe curbă (y = 45 la t = 0,5)');
});

test('foarfeca pe exteriorul unui inel: conturul deschis și gaura devin două forme', () => {
  const d0 = docDin(stoc, forma('i', { tip: 'cerc', raza: 1 }));
  const radacina: Nod = {
    tip: 'grup', id: 'i', matrice: { ...ID }, copii: [
      { tip: 'element', id: 'o', forma: { tip: 'cerc', raza: 50 }, matrice: { ...ID } },
      { tip: 'element', id: 'g', forma: { tip: 'cerc', raza: 30 }, matrice: { ...ID } },
    ],
  };
  const d: Document = { ...d0, piese: [{ ...(d0.piese[0] as Piesa), radacina }] };
  const r = taie(d, { cutit: foarfeca('i', 0, 50.2), alese: ['i'], inchide: false });
  const dupa = aplica(d, r);
  assert.ok(r.ok);
  assert.equal(r.ids.length, 2);
  const cs = r.ids.map((id) => contururi(dupa, id));
  assert.deepEqual(cs.map((x) => x.map((c) => c.inchis)), [[false], [true]], 'exteriorul deschis, gaura neatinsă');
});

test('refuzurile foarfecii: capătul unei căi deschise (capat); clicul departe de contur (departe)', () => {
  const d = docDin(stoc, forma('p', cale(false, [0, 0], [100, 0])), forma('c', { tip: 'cerc', raza: 50 }, 300, 0));
  assert.equal(refuz(d, taie(d, { cutit: foarfeca('p', 0.3, 0.2), alese: ['p'], inchide: false })), 'capat');
  assert.equal(refuz(d, taie(d, { cutit: foarfeca('p', 100, 0), alese: ['p'], inchide: false })), 'capat');
  assert.equal(refuz(d, taie(d, { cutit: foarfeca('c', 300, 0), alese: ['c'], inchide: false })), 'departe', 'în mijlocul cercului');
});

// ——— Retezatul ———

test('retezatul: liniile (0, 0)–(100, 0) și (80, −20)–(80, 20); clicul în (90, 0) lasă (0, 0)–(80, 0), cel în (80, 10) lasă (80, −20)–(80, 0)', () => {
  const d = docDin(stoc, forma('h', cale(false, [0, 0], [100, 0])), forma('v', cale(false, [80, -20], [80, 20])));
  const r1 = taie(d, { cutit: reteaza('h', 90, 0.3), alese: ['h', 'v'], inchide: false });
  const d1 = aplica(d, r1);
  assert.ok(r1.ok);
  assert.deepEqual(contururi(d1, r1.ids[0] as string).map(varfuri), [[[0, 0], [80, 0]]]);
  const r2 = taie(d1, { cutit: reteaza('v', 80, 10), alese: (d1.foi[0]?.instante ?? []).map((i) => i.id), inchide: false });
  const d2 = aplica(d1, r2);
  assert.ok(r2.ok);
  assert.deepEqual(contururi(d2, r2.ids[0] as string).map(varfuri), [[[80, -20], [80, 0]]]);
});

test('„#”-ul dintr-o singură piesă (patru linii): opt clicuri pe capete îl fac pătratul 60 × 60, tot o piesă', () => {
  const d0 = docDin(stoc, forma('d', cale(false, [0, 20], [100, 20])));
  const linie = (id: string, a: readonly [number, number], b: readonly [number, number]): Nod => ({ tip: 'element', id, forma: cale(false, a, b), matrice: { ...ID } });
  const radacina: Nod = { tip: 'grup', id: 'd', matrice: { ...ID }, copii: [linie('h1', [0, 20], [100, 20]), linie('h2', [0, 80], [100, 80]), linie('v1', [20, 0], [20, 100]), linie('v2', [80, 0], [80, 100])] };
  let d: Document = { ...d0, piese: [{ ...(d0.piese[0] as Piesa), radacina }] };
  let id = 'd';
  for (const [x, y] of [[10, 20], [90, 20], [10, 80], [90, 80], [20, 10], [20, 90], [80, 10], [80, 90]] as const) {
    const r = taie(d, { cutit: reteaza(id, x, y), alese: [id], inchide: false });
    d = aplica(d, r);
    assert.ok(r.ok && r.ids.length === 1, `clicul în (${x}, ${y}): tot o piesă`);
    id = r.ids[0] as string;
  }
  const linii = contururi(d, id).map((c) => varfuri(c).map(([x, y]) => `${x},${y}`).sort().join(' ')).sort();
  assert.deepEqual(linii, ['20,20 20,80', '20,20 80,20', '20,80 80,80', '80,20 80,80']);
});

test('dreptunghiul 100 × 60 trecut de linia x = 50, retezat în dreapta: calea deschisă de 160 mm, prin stânga', () => {
  const d = docDin(stoc, forma('r', { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }), forma('l', cale(false, [50, -20], [50, 80])));
  const r = taie(d, { cutit: reteaza('r', 75, 0.2), alese: ['r', 'l'], inchide: false });
  const dupa = aplica(d, r);
  assert.ok(r.ok);
  const cs = contururi(dupa, r.ids[0] as string);
  assert.equal(cs.length, 1);
  const c = cs[0] as Contur;
  assert.equal(c.inchis, false);
  aproape(lungime(c), 160, 1e-9, 'lungimea');
  assert.ok(c.varfuri.every((v) => v.p.x <= 50 + 1e-9), 'doar partea din stânga liniei');
});

test('o formă fără locuri comune pleacă toată; locurile comune sunt doar cu formele alese', () => {
  const d = docDin(stoc, forma('h', cale(false, [0, 0], [100, 0])), forma('v', cale(false, [80, -20], [80, 20])));
  // Doar linia orizontală aleasă: n-are locuri comune (verticala nu e printre cele alese), deci pleacă toată.
  const r = taie(d, { cutit: reteaza('h', 90, 0), alese: ['h'], inchide: false });
  assert.ok(r.ok);
  assert.deepEqual(r.sterse, ['h']);
  assert.equal(r.ids.length, 0);
  const dupa = aplica(d, r);
  assert.deepEqual(dupa.foi[0]?.instante.map((i) => i.id), ['v']);
  // Clicul departe de linie: refuzul.
  assert.equal(refuz(d, taie(d, { cutit: reteaza('h', 50, 30), alese: ['h', 'v'], inchide: false })), 'departe');
});

test('un „T”: capătul unei linii care stă pe alta nu e un loc comun al ei, deci retezată, pleacă toată', () => {
  const d = docDin(stoc, forma('a', cale(false, [0, 0], [100, 0])), forma('b', cale(false, [50, 0], [50, 50])));
  const r = taie(d, { cutit: reteaza('b', 50, 25), alese: ['a', 'b'], inchide: false });
  assert.ok(r.ok);
  assert.deepEqual(r.sterse, ['b']);
  // Orizontala, retezată în dreapta lui (50, 0), unde o atinge capătul verticalei: rămâne (0, 0)–(50, 0).
  const r2 = taie(d, { cutit: reteaza('a', 75, 0), alese: ['a', 'b'], inchide: false });
  const d2 = aplica(d, r2);
  assert.ok(r2.ok);
  assert.deepEqual(contururi(d2, r2.ids[0] as string).map(varfuri), [[[0, 0], [50, 0]]]);
});

test('foarfeca și retezatul schimbă forma de sub clic chiar dacă nu e printre cele alese', () => {
  const d = docDin(stoc, forma('h', cale(false, [0, 0], [100, 0])), forma('v', cale(false, [80, -20], [80, 20])));
  // Doar verticala aleasă (ea dă locul comun); orizontala, de sub clic, se retează oricum.
  const r = taie(d, { cutit: reteaza('h', 90, 0), alese: ['v'], inchide: false });
  const d1 = aplica(d, r);
  assert.ok(r.ok);
  assert.deepEqual(contururi(d1, r.ids[0] as string).map(varfuri), [[[0, 0], [80, 0]]]);
  const f = taie(d, { cutit: foarfeca('h', 30, 0), alese: ['v'], inchide: false });
  assert.ok(f.ok);
  assert.equal(f.ids.length, 2);
});
