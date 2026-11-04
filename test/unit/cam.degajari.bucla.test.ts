/**
 * Degajările aceleiași bucle (ADR 0134), pe hârtie. Freza Ø6 (R = 3), k = R/√2. Gaura „cu limbă”: conturul (0, 0) → (28, 0) →
 * (28, 35) → (28 + w, 35) → (28 + w, 0) → (60, 0) → (60, 50) → (0, 50), pus la (50, 50) pe foaie, cu o limbă de material păstrat
 * lată de w, din peretele de jos. Colțurile de degajat sunt cele patru ale găurii și cele două de la baza limbii.
 * - T-bone: la baza limbii, peretele lung e latura ei (35 față de 28, respectiv 60 − 28 − w), deci E = V + (0, R): crestătura
 *   intră cu R în limbă. Cu w = 2, discul trece de latura din față (d); cu w = 6, cele două crestături se ating în limbă (e);
 *   cu w = 7,5, rămâne 1,5 mm între ele.
 * - Dog-bone: E = V + R·u, la 45°. Cu w = 1, discul ajunge la 0,121 mm de latura din față, prin limbă (d); cu w = 2,5, între
 *   discuri rămân 0,743 mm de limbă (e); cu w = 3, 1,243 mm (rămân).
 * Plus o fantă 40 × 6,5 și o mortiză 10 × 6,5 (golul dintre crestături e în deșeu, sau pe peretele comun): nimic omis. Plus
 * îmbinarea cu degete tăiată pe exterior, cu T-bone în laturile degetelor: degetul din mijloc, de 6 mm, își pierde ambele
 * crestături (e).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programDinDocument } from '../../src/cam/job.ts';
import { materialIntre } from '../../src/cam/degajari.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import type { Document, FormaDoc, Operatie } from '../../src/model/document.ts';
import { cuOperatie, docDin, ID } from './ajutor-document.ts';

const F = { latime: 200, inaltime: 150, grosime: 12 };
const k = 3 / Math.SQRT2;
const X0 = 50, Y0 = 50;
const P = (x: number, y: number) => ({ x, y });
const L = { tip: 'L' as const };
const cale = (pts: ReadonlyArray<readonly [number, number]>): FormaDoc => ({ tip: 'cale', inchis: true, varfuri: pts.map(([x, y]) => ({ p: P(x, y), s: L })) });
const limba = (w: number): FormaDoc => cale([[0, 0], [28, 0], [28, 35], [28 + w, 35], [28 + w, 0], [60, 0], [60, 50], [0, 50]]);
const dr = (w: number, h: number): FormaDoc => ({ tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 });

function doc(forma: FormaDoc, v: Partial<Operatie>): Document {
  return cuOperatie(docDin(F, { id: 'g', forma, matrice: { ...ID, e: X0, f: Y0 } }), 'g', { latura: 'interior', adancime: 6, pas: 6, ...v });
}

/** Drumurile dus-întors ale programului (Q, E, în coordonatele elementului) și avertismentele. */
function rezultat(d: Document): { drumuri: Array<{ q: { x: number; y: number }; e: { x: number; y: number } }>; avertismente: readonly string[] } {
  const j = programDinDocument(d);
  assert.ok(j.ok, j.ok ? '' : j.motiv);
  if (!j.ok) return { drumuri: [], avertismente: [] };
  const m: readonly Miscare[] = j.program.miscari;
  const rez: Array<{ q: { x: number; y: number }; e: { x: number; y: number } }> = [];
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

const cheie = (p: { x: number; y: number }): string => `${p.x.toFixed(4)},${p.y.toFixed(4)}`;

/** Drumurile cerute (Q → E, în coordonatele elementului), ca mulțime; fiecare o dată (o singură trecere). */
function verifica(d: Document, cerute: ReadonlyArray<readonly [{ x: number; y: number }, { x: number; y: number }]>, avertismente: readonly string[]): void {
  const r = rezultat(d);
  const gasite = r.drumuri.map((x) => `${cheie(x.q)} → ${cheie(x.e)}`).sort();
  assert.deepEqual(gasite, cerute.map(([q, e]) => `${cheie(q)} → ${cheie(e)}`).sort());
  assert.deepEqual([...r.avertismente].sort(), [...avertismente].sort());
}

const omis = (V: { x: number; y: number }, motiv: string): string => `g/g: degajarea omisă la colțul (${(V.x + X0).toFixed(3)}, ${(V.y + Y0).toFixed(3)}): ${motiv}`;
const PERETE = 'prea aproape de alt perete al piesei';
const COLT = 'prea aproape de degajarea altui colț al buclei';

/**
 * Cele patru colțuri ale găurii 60 × 50 cu T-bone. Jos-stânga: 28 față de 50, deci crestătura în peretele din stânga; jos-dreapta:
 * peretele din dreapta (50 față de 60 − 28 − w); sus: peretele de sus (60 față de 50).
 */
const TEE_GAURA: Array<readonly [{ x: number; y: number }, { x: number; y: number }]> = [
  [P(3, 3), P(0, 3)], [P(57, 3), P(60, 3)], [P(57, 47), P(57, 50)], [P(3, 47), P(3, 50)],
];

test('T-bone, limba de 2 mm: crestăturile de la baza ei ar trece de latura din față (d), deci se omit; restul găurii rămâne', () => {
  verifica(doc(limba(2), { colturi: { tip: 't-bone' } }), TEE_GAURA, [omis(P(28, 0), PERETE), omis(P(30, 0), PERETE)]);
});

test('T-bone, limba de 6 mm: fiecare crestătură lasă 3 mm, dar împreună se ating în limbă (e): se omit amândouă', () => {
  verifica(doc(limba(6), { colturi: { tip: 't-bone' } }), TEE_GAURA, [omis(P(28, 0), COLT), omis(P(34, 0), COLT)]);
});

test('T-bone, limba de 3 mm: discul de la E = (28, 3) atinge exact latura din față (δ = R), iar mijlocul golului, (31, 3), e pe contur, deci în K (d)', () => {
  verifica(doc(limba(3), { colturi: { tip: 't-bone' } }), TEE_GAURA, [omis(P(28, 0), PERETE), omis(P(31, 0), PERETE)]);
});

test('e judecă doar candidații: colțul din stânga al limbii de 6 mm cade pe a (lângă gaura de dedesubt), deci nu-l mai oprește pe cel din dreapta', () => {
  // Gaura de dedesubt, 10 × 9, cu peretele de sus la 0,5 mm sub gaura cu limbă: traseul ei, x ∈ [23, 27], y ∈ [−6,5, −3,5],
  // e la 6,58 < D + 1 de drumul colțului (28, 0) și la 9,55 de al colțului (34, 0).
  const d0 = docDin(F,
    { id: 'g', forma: limba(6), matrice: { ...ID, e: X0, f: Y0 } },
    { id: 'h', forma: dr(10, 9), matrice: { ...ID, e: X0 + 20, f: Y0 - 9.5 } });
  const d = cuOperatie(cuOperatie(d0, 'g', { latura: 'interior', adancime: 6, pas: 6, colturi: { tip: 't-bone' } }), 'h', { latura: 'interior', adancime: 6, pas: 6 });
  const r = rezultat(d);
  const gasite = r.drumuri.map((x) => `${cheie(x.q)} → ${cheie(x.e)}`).sort();
  assert.deepEqual(gasite, [...TEE_GAURA, [P(37, 3), P(34, 3)]].map(([q, e]) => `${cheie(q)} → ${cheie(e)}`).sort());
  assert.deepEqual([...r.avertismente], [omis(P(28, 0), 'prea aproape de altă buclă')]);
});

test('materialIntre (ADR 0134 §3): mijlocul perechii pe contur nu e în K, oricare ar fi peretele; strict înăuntrul limbii, e', () => {
  // Mortiza 10 × 6,5 la origine: perechile cele mai apropiate cad pe peretele de jos, apoi pe cel de sus (mijlocul pe contur).
  const mortiza = { inchis: true, varfuri: [P(0, 0), P(10, 0), P(10, 6.5), P(0, 6.5)].map((p) => ({ p, s: L })) };
  const R6 = 7;
  assert.equal(materialIntre({ v: P(0, 0), q: P(2, 3), e: P(3, 0) }, { v: P(10, 0), q: P(8, 3), e: P(7, 0) }, mortiza, 'interior', R6), false);
  assert.equal(materialIntre({ v: P(0, 6.5), q: P(2, 3.5), e: P(3, 6.5) }, { v: P(10, 6.5), q: P(8, 3.5), e: P(7, 6.5) }, mortiza, 'interior', R6), false);
  // Limba de 6 mm: E-urile pe laturile ei, mijlocul (31, 3) strict în ea.
  const g = limba(6);
  if (g.tip !== 'cale') return;
  assert.equal(materialIntre({ v: P(28, 0), q: P(25, 3), e: P(28, 3) }, { v: P(34, 0), q: P(37, 3), e: P(34, 3) }, g, 'interior', R6), true);
  // Pe aceeași limbă, sub prag dar cu mijlocul în deșeu (cele două colțuri de jos ale găurii, aduse una lângă alta): nu.
  assert.equal(materialIntre({ v: P(0, 0), q: P(3, 3), e: P(0, 3) }, { v: P(0, 0), q: P(3, 4), e: P(3, 6) }, g, 'interior', R6), false);
});

test('T-bone, limba de 7,5 mm: între crestături rămân 1,5 mm (≥ 1), deci rămân toate șase', () => {
  verifica(doc(limba(7.5), { colturi: { tip: 't-bone' } }), [...TEE_GAURA, [P(25, 3), P(28, 3)], [P(38.5, 3), P(35.5, 3)]], []);
});

/** Cele patru colțuri ale găurii 60 × 50 cu dog-bone: E la k de V, spre interior. */
const DOG_GAURA = [
  [P(3, 3), P(k, k)], [P(57, 3), P(60 - k, k)], [P(57, 47), P(60 - k, 50 - k)], [P(3, 47), P(k, 50 - k)],
] as Array<readonly [{ x: number; y: number }, { x: number; y: number }]>;

test('dog-bone, limba de 1 mm: discul de la baza ei ajunge la 0,121 mm de latura din față, prin limbă (d): se omit amândouă', () => {
  verifica(doc(limba(1), { colturi: { tip: 'dog-bone' } }), DOG_GAURA, [omis(P(28, 0), PERETE), omis(P(29, 0), PERETE)]);
});

test('dog-bone, limba de 2,5 mm: între discuri ar rămâne 0,743 mm de limbă (e): se omit amândouă', () => {
  verifica(doc(limba(2.5), { colturi: { tip: 'dog-bone' } }), DOG_GAURA, [omis(P(28, 0), COLT), omis(P(30.5, 0), COLT)]);
});

test('dog-bone, limba de 3 mm: între discuri rămân 1,243 mm (≥ 1), deci rămân toate șase', () => {
  verifica(doc(limba(3), { colturi: { tip: 'dog-bone' } }), [...DOG_GAURA, [P(25, 3), P(28 - k, k)], [P(34, 3), P(31 + k, k)]], []);
});

test('fanta 40 × 6,5: drumurile din colțuri stau la 3,5 mm de latura din față, prin fantă (deșeu), deci rămân toate, și cu dog-bone, și cu T-bone', () => {
  verifica(doc(dr(40, 6.5), { colturi: { tip: 'dog-bone' } }), [
    [P(3, 3), P(k, k)], [P(37, 3), P(40 - k, k)], [P(37, 3.5), P(40 - k, 6.5 - k)], [P(3, 3.5), P(k, 6.5 - k)],
  ], []);
  verifica(doc(dr(40, 6.5), { colturi: { tip: 't-bone' } }), [
    [P(3, 3), P(3, 0)], [P(37, 3), P(37, 0)], [P(37, 3.5), P(37, 6.5)], [P(3, 3.5), P(3, 6.5)],
  ], []);
});

test('mortiza 10 × 6,5 cu T-bone: crestăturile din capetele aceluiași perete se unesc pe el (mijlocul pe contur), deci rămân toate patru', () => {
  verifica(doc(dr(10, 6.5), { colturi: { tip: 't-bone' } }), [
    [P(3, 3), P(3, 0)], [P(7, 3), P(7, 0)], [P(7, 3.5), P(7, 6.5)], [P(3, 3.5), P(3, 6.5)],
  ], []);
});

/**
 * Îmbinarea cu degete, tăiată pe exterior: baza 31 × 20, degetele [0, 6], [12,5, 18,5] și [25, 31], lungi de 12, cu golurile de
 * 6,5 între ele. Colțurile de degajat sunt cele de la fundul golurilor; T-bone-ul intră în latura degetului (12 > 6,5). Degetul
 * din mijloc primește câte o crestătură din fiecare parte: |E₁E₂| = 6 < D + 1, iar mijlocul e în deget (e).
 */
test('îmbinarea cu degete pe exterior, T-bone: degetul din mijloc își pierde ambele crestături (e); cele din margini rămân', () => {
  const degete = cale([[0, 0], [31, 0], [31, 32], [25, 32], [25, 20], [18.5, 20], [18.5, 32], [12.5, 32], [12.5, 20], [6, 20], [6, 32], [0, 32]]);
  verifica(doc(degete, { latura: 'exterior', colturi: { tip: 't-bone' } }), [
    [P(9, 23), P(6, 23)], [P(22, 23), P(25, 23)],
  ], [omis(P(12.5, 20), COLT), omis(P(18.5, 20), COLT)]);
});
