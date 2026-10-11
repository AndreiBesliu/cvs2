/**
 * Clicul pe căi cu cubice (ADR 0034 §5): `distantaLaContur` și `inRegiune` ale aplicației față de măsura proprie a
 * oracolului (`test/oracles/cale.ts`), pe conturile exacte din lume ale corpusului (`cale.cazuri.ts`):
 * - (0) măsura oracolului pe hârtie: cercul din două arce, pătratul cu laturile cubice drepte, cortul cu vârf exact;
 * - (a) includerea: pentru orice punct aflat la peste δ = 1e-9 × max(1, mărimea) de contur, cele două spun același lucru.
 *   Ce se poate dovedi: paritatea razei e un invariant topologic, deci orice regulă consecventă dă includerea adevărată
 *   pentru un punct care nu stă pe contur; a oracolului e corectă pentru punctele aflate la peste ~1e-12 × mărimea
 *   (traversarea e pe curbă, pe orizontala punctului, deci la cel puțin d de el; bisecția o găsește la ~1e-16 în t);
 * - (b) distanța: oracolul are distanța în [jos, d] cu d − jos ≤ 1e-12 × mărimea + 1e-14 × coordonata maximă. Aplicația
 *   măsoară pe puncte ale curbei (Newton pe bucăți monotone), deci nu poate coborî sub distanța adevărată: se cere
 *   d_aplicație ≥ d − 1e-9 × max(1, mărimea). Peste ea, ADR-ul nu dă o cifră („toleranța clicului e de câțiva pixeli”):
 *   se cere |d_aplicație − d| ≤ 1e-3 × max(1, mărimea) (0,1 mm pe o formă de 100 mm, sub un pixel la scara 1:1), iar
 *   abaterile peste 1e-6 × mărimea (un minim ratat, nu rotunjire) se numără și se raportează, cu cea mai mare.
 * Punctele: la întâmplare în cutia lărgită, lângă curbă (pe normala ei, la ±1e-3, ±0,05 și ±1 mm), în jurul capetelor
 * cubicelor (la 0,3, 1 și 2,5 mm), departe.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distantaLaContur, inRegiune } from '../../src/geom/distanta.ts';
import { aleator } from '../oracles/biarce.cazuri.ts';
import { derivataCubica, punctCubica } from '../oracles/biarce.ts';
import { conturExact, distanta, inContur, ID, type ConturExact } from '../oracles/cale.ts';
import { CAZURI_CALE, FORME, contureleExacte, formaCale } from '../oracles/cale.cazuri.ts';

type ConturApp = Parameters<typeof distantaLaContur>[1];
const caApp = (c: ConturExact): ConturApp => c.contur as ConturApp;

test('(0) măsura oracolului pe hârtie', () => {
  // Cercul de rază 10 din două semicercuri (bulge 1).
  const cerc = conturExact(formaCale([{ p: { x: 10, y: 0 }, s: { tip: 'A', bulge: 1 } }, { p: { x: -10, y: 0 }, s: { tip: 'A', bulge: 1 } }]), ID);
  assert.ok(Math.abs(distanta(cerc, 0, 0) - 10) < 1e-12 && inContur(cerc, 0, 0) && inContur(cerc, 9.999, 0) && !inContur(cerc, 10.001, 0));
  assert.ok(Math.abs(distanta(cerc, 13, 4) - (Math.hypot(13, 4) - 10)) < 1e-12 && inContur(cerc, 0, 9.99) && !inContur(cerc, 0, -10.01));
  // Pătratul [0, 6]² cu laturi cubice drepte (punctele de control pe latură, viteza neuniformă).
  const C = (c1x: number, c1y: number, c2x: number, c2y: number) => ({ tip: 'C' as const, c1: { x: c1x, y: c1y }, c2: { x: c2x, y: c2y } });
  const patrat = conturExact(formaCale([
    { p: { x: 0, y: 0 }, s: C(1, 0, 5, 0) }, { p: { x: 6, y: 0 }, s: C(6, 5, 6, 1) }, { p: { x: 6, y: 6 }, s: C(5, 6, 1, 6) }, { p: { x: 0, y: 6 }, s: C(0, 1, 0, 5) },
  ]), ID);
  assert.ok(Math.abs(distanta(patrat, 3, 3) - 3) < 1e-12 && Math.abs(distanta(patrat, 3, 1) - 1) < 1e-12 && Math.abs(distanta(patrat, 9, 10) - 5) < 1e-12);
  assert.ok(inContur(patrat, 3, 3) && inContur(patrat, 0.001, 5.999) && !inContur(patrat, 6.001, 3) && !inContur(patrat, 3, -0.001));
  // Cortul: vârful exact în (25, 37,5); deasupra lui, distanța e exact înălțimea.
  const cort = conturExact(FORME.cort, ID);
  assert.ok(Math.abs(distanta(cort, 25, 40) - 2.5) < 1e-12 && !inContur(cort, 25, 37.6) && inContur(cort, 25, 37.4) && inContur(cort, 25, 0.01));
});

/** Punctele de încercare pentru un contur: la întâmplare, lângă curbă (pe normală), departe. */
function puncte(ce: ConturExact, samanta: number): Array<{ x: number; y: number }> {
  const r = aleator(samanta);
  const { x0, x1, y0, y1 } = ce.cutie;
  const w = x1 - x0, h = y1 - y0;
  const rez: Array<{ x: number; y: number }> = [];
  for (let k = 0; k < 60; k++) rez.push({ x: x0 - 0.2 * w + 1.4 * w * r(), y: y0 - 0.2 * h + 1.4 * h * r() });
  for (const s of ce.segmente) {
    for (let k = 0; k < 6; k++) {
      const t = r();
      let p: { x: number; y: number }, n: { x: number; y: number };
      if (s.fel === 'cubica') {
        p = punctCubica(s.c, t);
        const d = derivataCubica(s.c, t), L = Math.hypot(d.x, d.y);
        if (!(L > 1e-9)) continue;
        n = { x: -d.y / L, y: d.x / L };
      } else {
        const q = s.q;
        p = { x: q.a.x + (q.b.x - q.a.x) * t, y: q.a.y + (q.b.y - q.a.y) * t };
        n = { x: q.nx, y: q.ny };
        if (q.arc) {
          const cx = q.mx - q.k * q.nx, cy = q.my - q.k * q.ny;
          const u = Math.atan2(q.a.y - cy, q.a.x - cx) + q.baleiaj * t;
          p = { x: cx + q.r * Math.cos(u), y: cy + q.r * Math.sin(u) };
          n = { x: Math.cos(u), y: Math.sin(u) };
        }
      }
      for (const e of [1e-3, -1e-3, 0.05, -0.05, 1, -1]) rez.push({ x: p.x + e * n.x, y: p.y + e * n.y });
    }
  }
  // În jurul capetelor cubicelor (acolo unde un mâner retras face B′ = 0): la 0,3, 1 și 2,5 mm, pe 16 direcții.
  for (const s of ce.segmente) {
    if (s.fel !== 'cubica') continue;
    for (const q of [s.c.a, s.c.b]) for (const raza of [0.3, 1, 2.5]) for (let k = 0; k < 16; k++) {
      rez.push({ x: q.x + raza * Math.cos((2 * Math.PI * (k + 0.5)) / 16), y: q.y + raza * Math.sin((2 * Math.PI * (k + 0.5)) / 16) });
    }
  }
  rez.push({ x: x1 + 5 * w + 3, y: y1 + 2 * h + 1 }, { x: x0 - 3 * w - 1, y: (y0 + y1) / 2 });
  return rez;
}

const max = { includere: 0, comparate: 0, excluse: 0, dist: 0, distRel: 0, sub: 0, ratate: 0, celMaiRau: '' };

for (const caz of CAZURI_CALE.filter((c) => c.categorie !== 'refuz')) {
  test(`(a, b) clicul: ${caz.nume}`, () => {
    const probleme: string[] = [];
    let k = 0;
    for (const [id, ce] of contureleExacte(caz.doc)) {
      const S = Math.max(1, Math.hypot(ce.cutie.x1 - ce.cutie.x0, ce.cutie.y1 - ce.cutie.y0));
      for (const p of puncte(ce, 0x27b + k++)) {
        const d = distanta(ce, p.x, p.y);
        const da = distantaLaContur(p, caApp(ce));
        const ia = inRegiune(p, [caApp(ce)]);
        if (d > 1e-9 * S) {
          max.comparate++;
          const io = inContur(ce, p.x, p.y);
          if (io !== ia) probleme.push(`${id} (${p.x}, ${p.y}), la ${d} de contur: oracolul ${io ? 'înăuntru' : 'afară'}, aplicația ${ia ? 'înăuntru' : 'afară'}`);
        } else max.excluse++;
        const e = da - d;
        if (Math.abs(e) > max.dist) { max.dist = Math.abs(e); max.celMaiRau = `${caz.nume}, ${id} (${p.x}, ${p.y}): aplicația ${da}, oracolul ${d}`; }
        max.distRel = Math.max(max.distRel, Math.abs(e) / S);
        max.sub = Math.max(max.sub, -e / S);
        if (Math.abs(e) > 1e-6 * S) max.ratate++;
        if (!(Math.abs(e) <= 1e-3 * S)) probleme.push(`${id} (${p.x}, ${p.y}): distanța aplicației ${da}, a oracolului ${d}`);
        if (!(da >= d - 1e-9 * S)) probleme.push(`${id} (${p.x}, ${p.y}): aplicația ${da} sub distanța adevărată ${d}`);
      }
    }
    assert.deepEqual(probleme.slice(0, 8), []);
  });
}

test('(f) rezumatul clicului (informativ)', (t) => {
  t.diagnostic(`includerea: ${max.comparate} puncte comparate, ${max.excluse} excluse (la sub 1e-9 × mărimea de contur)`);
  t.diagnostic(`distanța: |d_aplicație − d_oracol| max ${max.dist.toExponential(3)} mm (relativ ${max.distRel.toExponential(3)}); cel mai mult sub adevăr: ${max.sub.toExponential(3)} relativ`);
  t.diagnostic(`minime ratate (peste 1e-6 × mărimea): ${max.ratate}; cel mai rău: ${max.celMaiRau}`);
  assert.ok(max.comparate > 0);
});
