/**
 * Degajările colțurilor cu o latură curbă (ADR 0135), pe hârtie, în programul aplicației. Freza Ø6 (R = 3), k = R/√2, o
 * singură trecere; formele puse la (50, 50) pe foaie, drumurile citite în coordonatele elementului.
 * - „D”-ul: linia (0, 0) → (40, 0), apoi semicercul cu centrul (20, 0) și raza 20. Ca gaură, Q e dreapta y = 3 tăiată de
 *   cercul de rază 17: (20 ± √280, 3); tangenta arcului în V e verticală, deci dog-bone E = V + R·(∓1, 1)/√2; T-bone: linia
 *   (40) e mai scurtă decât arcul (20π), deci E = V + (0, R). Același „D” cu semicercul în două arce (5° + 175°) are aceleași
 *   Q și E: piciorul lui Q cade pe al doilea arc (la 10,2°), iar arcele fac un singur perete (§2, §3).
 * - Umărul (dreptunghiul 60 × 40 cu un semicerc de rază 10 deasupra), pe exterior: Q = (30 ± √160, 43).
 * - Lentila (două arce de rază 25, centrele (0, ∓15)), ca gaură: Q = (±√259, 0); T-bone cu pereții egali: crestătura pe
 *   normala peretelui de dinainte de V, în sensul de mers.
 * - Arcada cu o cubică: peretele cubicei e toată cubica (§3), deci la T-bone e mai lung decât linia de 40, iar biarcele ei de
 *   mai departe nu opresc degajarea (§4).
 * - Plasa (§5): un colț tăiat de un arc scurt, unde decalarea mănâncă colțurile arcului. Și o cale cu colțurile rotunjite
 *   (arce tangente): joncțiunile netede nu sunt colțuri, oricum s-ar tăia decalatele laturilor (§1).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programDinDocument } from '../../src/cam/job.ts';
import { colturiDeDegajat } from '../../src/cam/degajari.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import type { Document, FormaDoc, Operatie } from '../../src/model/document.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';

const F = { latime: 200, inaltime: 150, grosime: 12 };
const k = 3 / Math.SQRT2;
const X0 = 50, Y0 = 50;
const P = (x: number, y: number) => ({ x, y });
const L = { tip: 'L' as const };
const A = (bulge: number) => ({ tip: 'A' as const, bulge });

const D_FORMA: FormaDoc = { tip: 'cale', inchis: true, varfuri: [{ p: P(0, 0), s: L }, { p: P(40, 0), s: A(1) }] };
const P5 = P(20 + 20 * Math.cos(Math.PI / 36), 20 * Math.sin(Math.PI / 36));
const D_DOUA_ARCE: FormaDoc = {
  tip: 'cale', inchis: true, varfuri: [{ p: P(0, 0), s: L }, { p: P(40, 0), s: A(Math.tan(Math.PI / 144)) }, { p: P5, s: A(Math.tan((35 * Math.PI) / 144)) }],
};
const UMAR: FormaDoc = {
  tip: 'cale', inchis: true,
  varfuri: [{ p: P(0, 0), s: L }, { p: P(60, 0), s: L }, { p: P(60, 40), s: L }, { p: P(40, 40), s: A(1) }, { p: P(20, 40), s: L }, { p: P(0, 40), s: L }],
};
const LENTILA: FormaDoc = { tip: 'cale', inchis: true, varfuri: [{ p: P(20, 0), s: A(0.5) }, { p: P(-20, 0), s: A(0.5) }] };
const ARCADA: FormaDoc = { tip: 'cale', inchis: true, varfuri: [{ p: P(0, 0), s: L }, { p: P(40, 0), s: { tip: 'C', c1: P(40, 25), c2: P(0, 25) } }] };
const TESITA: FormaDoc = {
  tip: 'cale', inchis: true,
  varfuri: [{ p: P(0, 0), s: L }, { p: P(40, 0), s: L }, { p: P(40, 28), s: A(Math.tan(Math.PI / 24)) }, { p: P(38, 30), s: L }, { p: P(0, 30), s: L }],
};
/** Dreptunghiul 40 × 30 cu colțurile rotunjite cu raza r, ca o cale: laturi și sferturi de cerc tangente. */
const rotunjit = (r: number): FormaDoc => {
  const b = Math.tan(Math.PI / 8);
  return {
    tip: 'cale', inchis: true,
    varfuri: [
      { p: P(r, 0), s: L }, { p: P(40 - r, 0), s: A(b) }, { p: P(40, r), s: L }, { p: P(40, 30 - r), s: A(b) },
      { p: P(40 - r, 30), s: L }, { p: P(r, 30), s: A(b) }, { p: P(0, 30 - r), s: L }, { p: P(0, r), s: A(b) },
    ],
  };
};

function doc(forma: FormaDoc, v: Partial<Operatie>): Document {
  return cuOperatie(docDin(F, { id: 'g', forma, matrice: { ...ID, e: X0, f: Y0 } }), 'g', { latura: 'interior', adancime: 6, pas: 6, ...v });
}

type P2 = { readonly x: number; readonly y: number };

/** Drumurile dus-întors ale programului (Q, E, în coordonatele elementului) și avertismentele. */
function rezultat(d: Document): { drumuri: Array<{ q: P2; e: P2 }>; avertismente: readonly string[] } {
  const j = programDinDocument(d);
  assert.ok(j.ok, j.ok ? '' : j.motiv);
  if (!j.ok) return { drumuri: [], avertismente: [] };
  const m: readonly Miscare[] = j.program.miscari;
  const rez: Array<{ q: P2; e: P2 }> = [];
  let x = 0, y = 0;
  for (let i = 0; i < m.length; i++) {
    const a = m[i];
    if (!a || !('la' in a)) continue;
    const b = m[i + 1];
    if (a.tip === 'taiere' && b?.tip === 'taiere' && a.la.Z === undefined && b.la.Z === undefined
      && a.la.X !== undefined && a.la.Y !== undefined && b.la.X === x && b.la.Y === y && !(a.la.X === x && a.la.Y === y)) {
      rez.push({ q: { x: x - X0, y: y - Y0 }, e: { x: a.la.X - X0, y: a.la.Y - Y0 } });
    }
    x = a.la.X ?? x; y = a.la.Y ?? y;
  }
  return { drumuri: rez, avertismente: j.avertismente };
}

const cheie = (p: P2): string => `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
const degajarile = (av: readonly string[]): string[] => av.filter((a) => /degajare|colțul rotunjit|se strânge/.test(a));

/** Drumurile cerute (Q → E, în coordonatele elementului), ca mulțime, și avertismentele despre degajări, exact. */
function verifica(d: Document, cerute: ReadonlyArray<readonly [P2, P2]>, avertismente: readonly string[] = []): void {
  const r = rezultat(d);
  assert.deepEqual(r.drumuri.map((x) => `${cheie(x.q)} → ${cheie(x.e)}`).sort(), cerute.map(([q, e]) => `${cheie(q)} → ${cheie(e)}`).sort());
  assert.deepEqual(degajarile(r.avertismente).sort(), [...avertismente].sort());
}

const s280 = Math.sqrt(280), s160 = Math.sqrt(160), s259 = Math.sqrt(259);

for (const sens of ['urcare', 'opozitie'] as const) {
  test(`„D”-ul ca gaură, dog-bone, ${sens}: Q = (20 ± √280, 3), E pe bisectoarea tangentelor din V, fără avertismente`, () => {
    verifica(doc(D_FORMA, { colturi: { tip: 'dog-bone' }, sens }), [[P(20 + s280, 3), P(40 - k, k)], [P(20 - s280, 3), P(k, k)]]);
  });
}

test('„D”-ul ca gaură, T-bone: linia (40) e mai scurtă decât arcul (20π), deci E = V + (0, R), cu crestătura în arc', () => {
  verifica(doc(D_FORMA, { colturi: { tip: 't-bone' } }), [[P(20 + s280, 3), P(40, 3)], [P(20 - s280, 3), P(0, 3)]]);
});

test('„D”-ul cu semicercul în două arce (5° + 175°): piciorul lui Q cade pe al doilea arc, iar arcele fac un singur perete: aceleași drumuri ca la „D”', () => {
  verifica(doc(D_DOUA_ARCE, { colturi: { tip: 'dog-bone' } }), [[P(20 + s280, 3), P(40 - k, k)], [P(20 - s280, 3), P(k, k)]]);
  verifica(doc(D_DOUA_ARCE, { colturi: { tip: 't-bone' } }), [[P(20 + s280, 3), P(40, 3)], [P(20 - s280, 3), P(0, 3)]]);
});

test('umărul pe exterior: dog-bone E = V + R·(±1, 1)/√2, T-bone E = V + (0, R) (linia de 20 față de arcul de 10π)', () => {
  verifica(doc(UMAR, { latura: 'exterior', colturi: { tip: 'dog-bone' } }), [[P(30 + s160, 43), P(40 + k, 40 + k)], [P(30 - s160, 43), P(20 - k, 40 + k)]]);
  verifica(doc(UMAR, { latura: 'exterior', colturi: { tip: 't-bone' } }), [[P(30 + s160, 43), P(40, 43)], [P(30 - s160, 43), P(20, 43)]]);
});

test('lentila ca gaură: dog-bone E = (±17, 0); T-bone cu pereții egali, pe normala peretelui de dinainte de V, deci schimbat de sens', () => {
  verifica(doc(LENTILA, { colturi: { tip: 'dog-bone' } }), [[P(s259, 0), P(17, 0)], [P(-s259, 0), P(-17, 0)]]);
  verifica(doc(LENTILA, { colturi: { tip: 't-bone' }, sens: 'urcare' }), [[P(s259, 0), P(17.6, 1.8)], [P(-s259, 0), P(-17.6, -1.8)]]);
  verifica(doc(LENTILA, { colturi: { tip: 't-bone' }, sens: 'opozitie' }), [[P(s259, 0), P(17.6, -1.8)], [P(-s259, 0), P(-17.6, 1.8)]]);
});

test('arcada cu o cubică, T-bone: peretele cubicei e toată cubica, mai lung decât linia, deci E = V + (0, R); biarcele de mai departe nu opresc drumul (§4)', () => {
  const r = rezultat(doc(ARCADA, { colturi: { tip: 't-bone' } }));
  assert.deepEqual(degajarile(r.avertismente), []);
  assert.deepEqual(r.drumuri.map((x) => cheie(x.e)).sort(), [cheie(P(0, 3)), cheie(P(40, 3))]);
  // Q: pe dreapta y = 3 (linia decalată), la ceva mai mult de R de peretele vertical din V (cubica se strânge spre interior).
  for (const x of r.drumuri) {
    assert.ok(Math.abs(x.q.y - 3) <= 1e-9, cheie(x.q));
    const dx = Math.abs(x.q.x - x.e.x);
    assert.ok(dx > 3 && dx < 3.5, cheie(x.q));
  }
  const dog = rezultat(doc(ARCADA, { colturi: { tip: 'dog-bone' } }));
  assert.deepEqual(dog.drumuri.map((x) => cheie(x.e)).sort(), [cheie(P(k, k)), cheie(P(40 - k, k))]);
});

test('plasa (§5): colțul tăiat de un arc de 30°, la care decalarea mănâncă ambele colțuri ale arcului, se spune; celelalte trei se degajează', () => {
  const nu = (x: number, y: number): string => `g/g: degajarea omisă la colțul (${(x + X0).toFixed(3)}, ${(y + Y0).toFixed(3)}): freza nu ajunge în colț`;
  verifica(doc(TESITA, { colturi: { tip: 'dog-bone' } }), [[P(3, 3), P(k, k)], [P(37, 3), P(40 - k, k)], [P(3, 27), P(k, 30 - k)]], [nu(40, 28), nu(38, 30)]);
});

test('umărul minuscul (un semicerc de rază 0,002) pe exterior: Q = (30 ± 0,1096, 43) e la 3,0019 de V, deci restul (0,0019) e sub 0,01 și nu se degajează; plasa îl spune', () => {
  // Mersul se rupe cu 90° (restul între două linii ar fi 1,243), dar cercul decalat, de rază 3,002, taie dreapta y = 43 la
  // x = 30 ± √(3,002² − 9) = 30 ± 0,1096: freza ajunge deja la 0,0019 mm de colț.
  const minuscul: FormaDoc = {
    tip: 'cale', inchis: true,
    varfuri: [{ p: P(0, 0), s: L }, { p: P(60, 0), s: L }, { p: P(60, 40), s: L }, { p: P(30.002, 40), s: A(1) }, { p: P(29.998, 40), s: L }, { p: P(0, 40), s: L }],
  };
  const nu = (x: number): string => `g/g: degajarea omisă la colțul (${(x + X0).toFixed(3)}, ${(40 + Y0).toFixed(3)}): freza nu ajunge în colț`;
  verifica(doc(minuscul, { latura: 'exterior', colturi: { tip: 'dog-bone' } }), [], [nu(30.002), nu(29.998)]);
});

test('colturiDeDegajat (§2): piciorul lui Q cade pe segmentul peretelui; o umflătură la 0,5 mm de colțul dreptunghiului n-are Q acolo', () => {
  // Umflătura de rază 5 (centrul (54,5, 40)) pornește din (59,5, 40), la 0,5 de colțul (60, 40). Dreapta y = 43 taie cercul de
  // rază 8 la x = 54,5 ± √55 = 61,916, cu piciorul dincolo de linia de 0,5 mm (iar peretele se oprește în colțul (60, 40)): nu
  // există Q. Colțul celălalt, (49,5, 40), are Q = (54,5 − √55, 43) și E = (49,5 − k, 40 + k).
  const c = {
    inchis: true,
    varfuri: [{ p: P(0, 0), s: L }, { p: P(60, 0), s: L }, { p: P(60, 40), s: L }, { p: P(59.5, 40), s: A(1) }, { p: P(49.5, 40), s: L }, { p: P(0, 40), s: L }],
  };
  const d = colturiDeDegajat(c, 'exterior', 'urcare', 3, 'dog-bone');
  assert.deepEqual(d.map((x) => `${cheie(x.v)}: ${cheie(x.q)} → ${cheie(x.e)}`), [`${cheie(P(49.5, 40))}: ${cheie(P(54.5 - Math.sqrt(55), 43))} → ${cheie(P(49.5 - k, 40 + k))}`]);
});

test('plasa doar unde freza ajunge (§5): un canal de 4 mm (sub D), cu capătul în arc, are colțuri curbe la 23 mm de buclă: nimic spus', () => {
  // Gaura 40 × 30 cu un canal din latura dreaptă, y ∈ [13, 17], până la x = 60, închis cu un arc (bulge 0,5, raza 2,5 < R):
  // colțurile (60, 13) și (60, 17) sunt concave pentru K, fără Q (decalata arcului dispare), iar bucla stă la x ≤ 37, deci
  // mult peste 2R / cos(φ/2) = 6,32 de ele. Colțurile gurii canalului sunt convexe pentru K. Arcul capătului, concav pentru K și
  // sub R, își spune raza (ADR 0135 §6), ca orice arc al desenului.
  const rot = 'g/g: colțul rotunjit cu raza 2.500 mm (sub raza frezei, 3.000 mm) rămâne cu raza frezei; o degajare cere un colț ascuțit în desen';
  const canal: FormaDoc = {
    tip: 'cale', inchis: true,
    varfuri: [
      { p: P(0, 0), s: L }, { p: P(40, 0), s: L }, { p: P(40, 13), s: L }, { p: P(60, 13), s: A(0.5) }, { p: P(60, 17), s: L },
      { p: P(40, 17), s: L }, { p: P(40, 30), s: L }, { p: P(0, 30), s: L },
    ],
  };
  verifica(doc(canal, { colturi: { tip: 'dog-bone' } }), [[P(3, 3), P(k, k)], [P(37, 3), P(40 - k, k)], [P(37, 27), P(40 - k, 30 - k)], [P(3, 27), P(k, 30 - k)]], [rot]);
});

test('o cale cu colțurile rotunjite (arce tangente) nu are colțuri de degajat: sub R, „colțul rotunjit”; peste R, nimic', () => {
  const rot = 'g/g: colțul rotunjit cu raza 2.000 mm (sub raza frezei, 3.000 mm) rămâne cu raza frezei; o degajare cere un colț ascuțit în desen';
  verifica(doc(rotunjit(2), { colturi: { tip: 'dog-bone' } }), [], [rot, rot, rot, rot]);
  verifica(doc(rotunjit(4), { colturi: { tip: 't-bone' } }), []);
});
