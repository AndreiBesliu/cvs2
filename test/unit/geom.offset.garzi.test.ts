/**
 * Gărzile offsetului (felia 2.1; contractul: `docs/etape/etapa-02.md`). Valorile sunt pe hârtie; oracolul independent al
 * topologiei e în `test/oracles/offset.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LINIE, arc, arieCuSemn, conturCerc, conturDreptunghi, type Contur, type Varf } from '../../src/geom/contur.ts';
import { DISTANTA_MINIMA, curataIntrare, offsetInchis } from '../../src/geom/offset.ts';

const v = (x: number, y: number, s: Varf['s'] = LINIE): Varf => ({ p: { x, y }, s });
const inchis = (...varfuri: Varf[]): Contur => ({ inchis: true, varfuri });
const patrat = inchis(v(0, 0), v(10, 0), v(10, 10), v(0, 10));
const motiv = (r: ReturnType<typeof offsetInchis>): string => (r.ok ? '' : r.motiv);

test('rezoluția: o distanță sub 0,005 mm e refuzată; exact 0,005 trece; 0 lasă conturul neschimbat', () => {
  assert.match(motiv(offsetInchis(patrat, 0.004)), /sub rezoluția declarată/);
  assert.match(motiv(offsetInchis(patrat, -0.0049)), /sub rezoluția declarată/);
  assert.ok(offsetInchis(patrat, DISTANTA_MINIMA).ok);
  const zero = offsetInchis(patrat, 0);
  assert.ok(zero.ok);
  if (zero.ok) assert.deepEqual(zero.contururi, [patrat]);
});

test('ce nu se poate decala e refuzat cu motiv, fără excepție: deschis, cubică, nefinit, degenerat, autointersectat', () => {
  assert.match(motiv(offsetInchis({ inchis: false, varfuri: patrat.varfuri }, 1)), /contur închis/);
  assert.match(motiv(offsetInchis(inchis(v(0, 0, { tip: 'C', c1: { x: 3, y: 5 }, c2: { x: 7, y: 5 } }), v(10, 0), v(10, 10)), 1)), /cubică/);
  assert.match(motiv(offsetInchis(inchis(v(0, 0), v(Number.NaN, 0), v(10, 10)), 1)), /număr finit/);
  assert.match(motiv(offsetInchis(inchis(v(0, 0), v(10, 0)), 1)), /n-are arie|autointersectează/);
  assert.match(motiv(offsetInchis(inchis(v(0, 0), v(5, 0), v(10, 0)), 1)), /două vârfuri distincte|n-are arie|autointersectează/);
  assert.match(motiv(offsetInchis(inchis(v(0, 0), v(0, 0)), 1)), /două vârfuri distincte/);
  // Fundița: laturile (0,0)–(10,10) și (10,0)–(0,10) se taie în (5, 5).
  assert.match(motiv(offsetInchis(inchis(v(0, 0), v(10, 10), v(10, 0), v(0, 10)), 1)), /autointersectează/);
  // Un vârf care se întoarce pe latura de unde a venit (un ac): segmente vecine suprapuse.
  assert.match(motiv(offsetInchis(inchis(v(0, 0), v(10, 0), v(10, 10), v(10, 5), v(10, 12), v(0, 10)), 1)), /autointersectează/);
  // Două laturi neînvecinate care se ating într-un punct.
  assert.match(motiv(offsetInchis(inchis(v(0, 0), v(10, 0), v(5, 5), v(10, 10), v(0, 10), v(5, 5)), 1)), /autointersectează/);
});

test('cercul are două vârfuri și trece; o sculă care nu încape dă motivul „scula nu încape”', () => {
  const r = offsetInchis(conturCerc(0, 0, 5), 2);
  assert.ok(r.ok);
  if (r.ok) assert.ok(Math.abs(arieCuSemn(r.contururi[0] as Contur) - Math.PI * 49) < 1e-9);
  assert.match(motiv(offsetInchis(conturCerc(0, 0, 5), -5.5)), /scula nu încape/);
});

test('intrarea murdară se curăță fără să-și schimbe forma: dă exact offsetul geamănului curat', () => {
  const curat = offsetInchis(patrat, -1);
  assert.ok(curat.ok);
  const murdare: Contur[] = [
    // un vârf repetat la 1e-7 mm
    inchis(v(0, 0), v(10, 0), v(10, 1e-7 / 2), v(10, 10), v(0, 10)),
    // ultimul vârf repetă primul
    inchis(v(0, 0), v(10, 0), v(10, 10), v(0, 10), v(0, 1e-8)),
    // un vârf în plus la mijlocul unei laturi
    inchis(v(0, 0), v(5, 0), v(10, 0), v(10, 10), v(0, 10)),
    // un arc aproape plat pe o latură
    inchis(v(0, 0, arc(1e-8)), v(10, 0), v(10, 10), v(0, 10)),
  ];
  for (const m of murdare) {
    const r = offsetInchis(m, -1);
    assert.deepEqual(r, curat, JSON.stringify(m.varfuri.map((x) => x.p)));
  }
  // Un vârf pe prelungirea laturii (drumul merge mai departe în același sens) se scoate.
  const pe = curataIntrare(inchis(v(0, 0), v(10, 0), v(10, 10), v(10, 12), v(0, 10)));
  assert.ok(pe.ok && pe.contur.varfuri.length === 4);
  // Un vârf care întoarce drumul înapoi nu se scoate: conturul rămâne un ac, deci e refuzat, nu „curățat”.
  const ac = curataIntrare(inchis(v(0, 0), v(10, 0), v(10, 10), v(10, 5), v(0, 10)));
  assert.ok(!ac.ok && /autointersectează/.test(ac.motiv));
});

test('ieșirea e validată: o distanță mare spre exterior, pe un dreptunghi rotunjit rotit, dă un contur închis și finit', () => {
  const d = conturDreptunghi(0, 0, 2440, 1220, 50);
  const r = offsetInchis(d, 3);
  assert.ok(r.ok, motiv(r));
  if (!r.ok) return;
  for (const c of r.contururi) {
    assert.ok(c.inchis);
    assert.ok(c.varfuri.every((x) => Number.isFinite(x.p.x) && Number.isFinite(x.p.y)));
  }
  assert.ok(Math.abs(arieCuSemn(r.contururi[0] as Contur)) > Math.abs(arieCuSemn(d)));
});

test('la distanța 0, gărzile de intrare se aplică: un contur autointersectat e refuzat, unul valid iese neschimbat', () => {
  assert.match(motiv(offsetInchis(inchis(v(0, 0), v(10, 10), v(10, 0), v(0, 10)), 0)), /autointersectează/);
  const r = offsetInchis(inchis(v(0, 0), v(10, 0), v(10, 1e-7 / 2), v(10, 10), v(0, 10)), 0);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.contururi[0]?.varfuri.length, 5, 'intrarea primită, nu cea curățată');
});

test('arcele de peste 180°: un disc tăiat de o coardă (arc de 270°) se decalează exact, pe același cerc', () => {
  // Coarda de la (R·cos 45°, −R·sin 45°) la (R·cos 45°, R·sin 45°)... prin arcul mare de 270°, R = 10, centrul în (0, 0).
  const R = 10;
  const k = R * Math.SQRT1_2;
  const disc = inchis(v(k, k, arc(Math.tan((3 * Math.PI) / 8))), v(k, -k));
  const r = offsetInchis(disc, 2);
  assert.ok(r.ok, motiv(r));
  if (!r.ok) return;
  // Aria pe hârtie: segmentul de cerc de 270° are aria (R²/2)(θ − sin θ) cu θ = 3π/2, decalat afară cu 2 crește.
  const arieIntrare = ((R * R) / 2) * ((3 * Math.PI) / 2 + 1);
  assert.ok(Math.abs(Math.abs(arieCuSemn(disc)) - arieIntrare) < 1e-9);
  assert.ok(Math.abs(arieCuSemn(r.contururi[0] as Contur)) > arieIntrare);
  const interior = offsetInchis(disc, -2);
  assert.ok(interior.ok, motiv(interior));
});

test('un cerc scris ca un singur arc de aproape 360° nu se „curăță” la nimic: coarda e mică, arcul nu', () => {
  const unghi = 2 * Math.PI - 1e-7;
  const cerc = inchis(v(10, 0, arc(Math.tan(unghi / 4))), v(10 * Math.cos(unghi), 10 * Math.sin(unghi)));
  const c = curataIntrare(cerc);
  assert.ok(c.ok, c.ok ? '' : c.motiv);
  if (c.ok) assert.ok(Math.abs(arieCuSemn(c.contur) - Math.PI * 100) < 1e-4);
  assert.ok(offsetInchis(cerc, -3).ok);
});
