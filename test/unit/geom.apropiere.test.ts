/**
 * Distanța exactă segment–segment și contur–contur (felia 2.3a, regiunea păstrată): valori pe hârtie, plus o comparație
 * cu forța brută pe perechi oarecare de linii și arce (exactul nu poate fi mai mare decât cel mai mic eșantion, iar
 * eșantionul nu poate fi mai departe de exact decât pasul lui).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arc, cerculArcului, conturCerc, conturDreptunghi, LINIE, type Punct, type Segment } from '../../src/geom/contur.ts';
import { apropiereContururi, apropiereSegmente, type SegmentContur } from '../../src/geom/apropiere.ts';
import { distantaLaContur } from '../../src/geom/distanta.ts';

const L = (a: Punct, b: Punct): SegmentContur => ({ a, b, s: LINIE });
const A = (a: Punct, b: Punct, bulge: number): SegmentContur => ({ a, b, s: arc(bulge) });
const P = (x: number, y: number): Punct => ({ x, y });
const aprox = (a: number, b: number, tol = 1e-9): boolean => Math.abs(a - b) <= tol;

/** Un punct al segmentului, la fracția t ∈ [0, 1] din lungime (pe arc, din unghi). */
function punct(v: SegmentContur, t: number): Punct {
  if (v.s.tip === 'L') return P(v.a.x + t * (v.b.x - v.a.x), v.a.y + t * (v.b.y - v.a.y));
  if (v.s.tip !== 'A') throw new Error('doar linii și arce');
  const { centru, raza, start, baleiaj } = cerculArcului(v.a, v.b, v.s.bulge);
  const u = start + t * baleiaj;
  return P(centru.x + raza * Math.cos(u), centru.y + raza * Math.sin(u));
}

function lungime(v: SegmentContur): number {
  if (v.s.tip === 'L') return Math.hypot(v.b.x - v.a.x, v.b.y - v.a.y);
  if (v.s.tip !== 'A') throw new Error('doar linii și arce');
  const { raza, baleiaj } = cerculArcului(v.a, v.b, v.s.bulge);
  return raza * Math.abs(baleiaj);
}

test('valori pe hârtie: linii paralele, linie tangentă la arc, arce pe linia centrelor, arce concentrice', () => {
  assert.ok(aprox(apropiereSegmente(L(P(0, 0), P(10, 0)), L(P(2, 3), P(8, 3))).distanta, 3));
  // Linii care se taie: 0, în punctul comun.
  const x = apropiereSegmente(L(P(0, 0), P(10, 10)), L(P(0, 10), P(10, 0)));
  assert.ok(aprox(x.distanta, 0) && aprox(x.p.x, 5) && aprox(x.p.y, 5));
  // Semicercul de sus al cercului (0, 0) R5, de la (5, 0) la (−5, 0) (bulge 1): dreapta y = 8 e la 3 de el, deasupra centrului.
  const sus = A(P(5, 0), P(-5, 0), 1);
  const d1 = apropiereSegmente(L(P(-10, 8), P(10, 8)), sus);
  assert.ok(aprox(d1.distanta, 3), String(d1.distanta));
  assert.ok(aprox(d1.q.x, 0) && aprox(d1.q.y, 5));
  // Aceeași dreaptă sub cerc (y = −8): semicercul de sus nu are punctul (0, −5), deci minimul e la capete: (±5, 0) → 8.
  assert.ok(aprox(apropiereSegmente(L(P(-10, -8), P(10, -8)), sus).distanta, 8));
  // Dreapta tangentă y = 5: 0.
  assert.ok(aprox(apropiereSegmente(L(P(-10, 5), P(10, 5)), sus).distanta, 0));
  // Două semicercuri R5, cu centrele la (0, 0) și (14, 0), fețele unul spre altul: 14 − 10 = 4 pe linia centrelor.
  const dreapta = A(P(0, -5), P(0, 5), 1); // semicercul din dreapta al cercului (0, 0): trece prin (5, 0)
  const stanga = A(P(14, 5), P(14, -5), 1); // semicercul din stânga al cercului (14, 0): trece prin (9, 0)
  const d2 = apropiereSegmente(dreapta, stanga);
  assert.ok(aprox(d2.distanta, 4), String(d2.distanta));
  // Concentrice, R5 și R8, pe același sfert: 3. Pe sferturi opuse: între capete.
  const r5 = A(P(5, 0), P(0, 5), Math.tan(Math.PI / 8));
  const r8 = A(P(8, 0), P(0, 8), Math.tan(Math.PI / 8));
  assert.ok(aprox(apropiereSegmente(r5, r8).distanta, 3, 1e-9));
  const r8opus = A(P(-8, 0), P(0, -8), Math.tan(Math.PI / 8));
  assert.ok(aprox(apropiereSegmente(r5, r8opus).distanta, Math.hypot(5, 8), 1e-9));
});

test('perechi oarecare de linii și arce: exactul e cel mult cel mai mic eșantion și cel mult cu pasul sub el', () => {
  let s = 0x2545f491;
  const r = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pct = (): Punct => P(r() * 20 - 10, r() * 20 - 10);
  const seg = (): SegmentContur => {
    if (r() < 0.4) return L(pct(), pct());
    let b = r() * 2 - 1;
    if (Math.abs(b) < 0.05) b = 0.05 * Math.sign(b || 1);
    return A(pct(), pct(), b);
  };
  const N = 240;
  for (let k = 0; k < 300; k++) {
    const u = seg(), v = seg();
    const exact = apropiereSegmente(u, v);
    const pu = Array.from({ length: N + 1 }, (_, i) => punct(u, i / N));
    const pv = Array.from({ length: N + 1 }, (_, i) => punct(v, i / N));
    let min = Infinity;
    for (const a of pu) for (const b of pv) min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y));
    const pas = (lungime(u) + lungime(v)) / N;
    assert.ok(exact.distanta <= min + 1e-9, `perechea ${k}: exact ${exact.distanta} > eșantion ${min}`);
    assert.ok(min - exact.distanta <= pas, `perechea ${k}: eșantion ${min}, exact ${exact.distanta}, pas ${pas}`);
    // Punctele întoarse sunt chiar pe segmente și la distanța spusă.
    assert.ok(aprox(Math.hypot(exact.p.x - exact.q.x, exact.p.y - exact.q.y), exact.distanta, 1e-9), `perechea ${k}: punctele`);
    const peU = distantaLaContur(exact.p, { inchis: false, varfuri: [{ p: u.a, s: u.s as Segment }, { p: u.b, s: LINIE }] });
    const peV = distantaLaContur(exact.q, { inchis: false, varfuri: [{ p: v.a, s: v.s as Segment }, { p: v.b, s: LINIE }] });
    assert.ok(peU < 1e-7 && peV < 1e-7, `perechea ${k}: p la ${peU}, q la ${peV} de segmente`);
  }
});

test('distanța dintre contururi: două dreptunghiuri, un cerc lângă un dreptunghi rotunjit, un cerc în altul', () => {
  assert.ok(aprox(apropiereContururi(conturDreptunghi(0, 0, 10, 10), conturDreptunghi(15, 2, 5, 5)).distanta, 5));
  // Cercul R3 cu centrul la (20, 5), lângă dreptunghiul 0…10 × 0…10: 20 − 3 − 10 = 7.
  assert.ok(aprox(apropiereContururi(conturDreptunghi(0, 0, 10, 10, 2), conturCerc(20, 5, 3)).distanta, 7));
  // Colțul rotunjit R2 al dreptunghiului, spre un cerc pe diagonală: centrul colțului (8, 8), cercul (20, 20) R3.
  const d = apropiereContururi(conturDreptunghi(0, 0, 10, 10, 2), conturCerc(20, 20, 3));
  assert.ok(aprox(d.distanta, Math.hypot(12, 12) - 2 - 3, 1e-9), String(d.distanta));
  // Cercuri concentrice: R5 în R8 → 3; se ating: 0.
  assert.ok(aprox(apropiereContururi(conturCerc(0, 0, 5), conturCerc(0, 0, 8)).distanta, 3));
  assert.ok(aprox(apropiereContururi(conturCerc(0, 0, 5), conturCerc(10, 0, 5)).distanta, 0));
});
