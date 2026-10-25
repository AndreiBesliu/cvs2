/**
 * Colțurile offsetului din desen (ADR 0074 §2, `src/geom/colturi.ts`): ca originalul (arcele de colț ale motorului înlocuite
 * de prelungirile vecinilor) și rotunjite (orice colț rămas ascuțit racordat cu raza |d|). Valorile pe hârtie, limita
 * prelungirii și, pe forme mai grele (steaua, pieptenele, U-ul cu fanta îngustă), garda: nimic mai aproape de |d| de
 * original, nimic atins, partea cerută.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicaColturi, colturiCaOriginalul, LIMITA_PRELUNGIRE, type Colturi } from '../../src/geom/colturi.ts';
import { arc, arieCuSemn, inSensTrigonometric, LINIE, numarSegmente, segment, type Contur, type Punct } from '../../src/geom/contur.ts';
import { distantaLaContur, inRegiune } from '../../src/geom/distanta.ts';
import { curataIntrare, offsetInchis, seAutointersecteaza } from '../../src/geom/offset.ts';

const pol = (...p: Array<[number, number]>): Contur => ({ inchis: true, varfuri: p.map(([x, y]) => ({ p: { x, y }, s: LINIE })) });

/** Offsetul cu colțurile cerute, cum îl face desenul: motorul, apoi colțurile peste originalul curățat. */
function offset(c: Contur, d: number, colturi: Colturi): { readonly original: Contur; readonly iesire: Contur[] } {
  const r = offsetInchis(c, d);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  const k = curataIntrare(c);
  assert.ok(k.ok);
  const original = inSensTrigonometric(k.ok ? k.contur : c);
  return { original, iesire: r.ok ? aplicaColturi(original, d, r.contururi, colturi) : [] };
}

/** Mijlocul segmentului i (pe arc, punctul de la jumătatea unghiului). */
function mijloc(c: Contur, i: number): Punct {
  const { a, b, s } = segment(c, i);
  if (s.tip !== 'A') return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
  // Săgeata arcului: la β·c/2, spre dreapta coardei pentru β > 0 (arc trigonometric).
  return { x: mx + (dy * s.bulge) / 2, y: my - (dx * s.bulge) / 2 };
}

/** Garda: fiecare vârf și mijloc la cel puțin |d| de original, pe partea cerută; niciun contur nu se atinge. */
function garda(original: Contur, d: number, iesire: readonly Contur[], nume: string): void {
  for (const c of iesire) {
    assert.equal(seAutointersecteaza(c), false, `${nume}: se atinge singur`);
    for (let i = 0; i < numarSegmente(c); i++) {
      for (const p of [segment(c, i).a, mijloc(c, i)]) {
        const dist = distantaLaContur(p, original);
        assert.ok(dist >= Math.abs(d) - 1e-6, `${nume}: (${p.x}, ${p.y}) la ${dist} de original`);
        assert.equal(inRegiune(p, [original]), d < 0, `${nume}: (${p.x}, ${p.y}) pe partea greșită`);
      }
    }
  }
}

test('ca originalul pe hârtie: „D”-ul (semicerc R20 + coardă) spre exterior cu 5: colțurile în (±√600, −5), pe cercul R25', () => {
  const D: Contur = { inchis: true, varfuri: [{ p: { x: 20, y: 0 }, s: arc(1) }, { p: { x: -20, y: 0 }, s: LINIE }] };
  const { original, iesire } = offset(D, 5, 'ca-originalul');
  assert.equal(iesire.length, 1);
  const k = iesire[0]!;
  assert.equal(k.varfuri.length, 2, 'arcul R25 și coarda de la y = −5');
  const x = Math.sqrt(625 - 25);
  const pct = k.varfuri.map((v) => v.p).sort((a, b) => a.x - b.x);
  for (const [p, q] of [[pct[0]!, { x: -x, y: -5 }], [pct[1]!, { x, y: -5 }]] as const) assert.ok(Math.hypot(p.x - q.x, p.y - q.y) < 1e-9, `${p.x}, ${p.y}`);
  // Aria: cercul R25 deasupra dreptei y = −5: πR²/2 + ∫₋₅⁰ 2√(625 − y²) dy.
  const asteptata = (Math.PI * 625) / 2 + (5 * x + 625 * Math.asin(0.2));
  assert.ok(Math.abs(arieCuSemn(k) - asteptata) < 1e-6, String(arieCuSemn(k)));
  garda(original, 5, iesire, 'D');
});

test('limita prelungirii: vârful de 3,4° al triunghiului rămâne arcul motorului, celelalte două colțuri devin ascuțite', () => {
  const t = pol([0, 0], [100, 0], [0, 6]);
  const { original, iesire } = offset(t, 2, 'ca-originalul');
  const k = iesire[0]!;
  // Unghiul din (100, 0): atan(6 / 100) = 3,43°, deci 1 / sin(θ / 2) = 33,4 > 10.
  assert.ok(1 / Math.sin(Math.atan(0.06) / 2) > LIMITA_PRELUNGIRE);
  assert.equal(k.varfuri.filter((v) => v.s.tip === 'A').length, 1);
  assert.equal(k.varfuri.length, 4);
  // Colțul drept din (0, 0) e ascuțit, chiar în (−2, −2).
  assert.ok(k.varfuri.some((v) => Math.hypot(v.p.x + 2, v.p.y + 2) < 1e-9));
  garda(original, 2, iesire, 'triunghi');
});

test('garda, pe forme grele: steaua, pieptenele, U-ul cu fanta mai îngustă decât 2d, în ambele sensuri și ambele feluri', () => {
  const stea = pol(...Array.from({ length: 10 }, (_, i): [number, number] => {
    const r = i % 2 === 0 ? 40 : 16, u = (Math.PI / 5) * i + Math.PI / 2;
    return [r * Math.cos(u), r * Math.sin(u)];
  }));
  const pieptene = pol([0, 0], [70, 0], [70, 30], [60, 30], [60, 10], [50, 10], [50, 30], [40, 30], [40, 10], [30, 10], [30, 30], [20, 30], [20, 10], [10, 10], [10, 30], [0, 30]);
  const U = pol([0, 0], [50, 0], [50, 40], [29, 40], [29, 10], [21, 10], [21, 40], [0, 40]);
  // „C”-ul cu deschiderea de 10: spre exterior cu 6, deschiderea se închide, iar arcele vârfurilor ei se taie între ele.
  const C = pol([20, 20], [80, 20], [80, 45], [70, 45], [70, 30], [30, 30], [30, 70], [70, 70], [70, 55], [80, 55], [80, 80], [20, 80]);
  // Dinții pieptenelui, cu golurile de 2 între ei, spre exterior cu 3: golurile se închid peste colțurile dinților.
  const dinti = pol([0, 0], [40, 0], [40, 20], [37, 20], [37, 5], [35, 5], [35, 20], [32, 20], [32, 5], [30, 5], [30, 20], [0, 20]);
  for (const [nume, c, ds] of [['stea', stea, [3, -2]], ['pieptene', pieptene, [3, 6, -2]], ['U', U, [5, -3]], ['C', C, [6, 4, -3]], ['dinți', dinti, [3, 1.2]]] as const) {
    for (const d of ds) {
      for (const fel of ['ca-originalul', 'rotunjite'] as const) {
        const { original, iesire } = offset(c, d, fel);
        assert.ok(iesire.length > 0, `${nume} ${d} ${fel}`);
        garda(original, d, iesire, `${nume} ${d} ${fel}`);
      }
    }
  }
  // Steaua ca originalul, spre exterior: toate cele 10 colțuri ascuțite (vârfurile de 36°: 1 / sin 18° = 3,2 < 10).
  const s = offset(stea, 3, 'ca-originalul').iesire[0]!;
  assert.equal(s.varfuri.length, 10);
  assert.ok(s.varfuri.every((v) => v.s.tip === 'L'));
});

test('rotunjite, raza care nu încape: dreptunghiul 30 × 18 spre interior cu 5 dă 20 × 8; pe latura de 8, a doua racordare ia 2,5', () => {
  const { original, iesire } = offset(pol([0, 0], [30, 0], [30, 18], [0, 18]), -5, 'rotunjite');
  const k = iesire[0]!;
  // Pe fiecare latură scurtă: o racordare de 5 (consumă 5 din 8) și una de 2,5 (cât încape în cei 3 rămași, cu jumătate de rază).
  const sfert = (r: number): number => r * r - (Math.PI * r * r) / 4;
  assert.equal(k.varfuri.filter((v) => v.s.tip === 'A').length, 4);
  assert.ok(Math.abs(arieCuSemn(k) - (160 - 2 * sfert(5) - 2 * sfert(2.5))) < 1e-6, String(arieCuSemn(k)));
  garda(original, -5, iesire, '30 × 18');
});

test('gărzile prelungirii, fiecare singură: un colț care ar veni lângă original sau ar atinge alt contur rămâne arcul motorului', () => {
  const patrat = pol([0, 0], [10, 0], [10, 10], [0, 10]);
  const r = offsetInchis(patrat, 2);
  assert.ok(r.ok);
  if (!r.ok) return;
  const arce = (k: Contur): number => k.varfuri.filter((v) => v.s.tip === 'A').length;
  assert.equal(arce(colturiCaOriginalul(patrat, 2, r.contururi)[0]!), 0, 'fără nimic aproape, toate patru ascuțite');
  // Un original cu o muchie prin (12, 12), vârful colțului prelungit din (10, 10): doar distanța la original îl oprește (și pe
  // cel din (0, 10), lângă care trece aceeași muchie); arcul din jurul lui (10, 10) rămâne.
  const cuMuchie = pol([0, 0], [10, 0], [10, 10], [12.5, 12.5], [0, 10]);
  const k = colturiCaOriginalul(cuMuchie, 2, r.contururi)[0]!;
  const inJur = (c: Contur, q: Punct): number => c.varfuri.filter((v, i) => {
    if (v.s.tip !== 'A') return false;
    const b = c.varfuri[(i + 1) % c.varfuri.length]!.p;
    const m = mijloc({ inchis: false, varfuri: [v, { p: b, s: LINIE }] }, 0);
    return Math.abs(Math.hypot(m.x - q.x, m.y - q.y) - 2) < 1e-9;
  }).length;
  assert.equal(inJur(k, { x: 10, y: 10 }), 1);
  // Un al doilea contur al ieșirii, departe de original, în calea prelungirii (dar nu a arcului): doar atingerea îl oprește.
  const z = pol([11.5, 11.5], [12.5, 11.5], [12.5, 12.5], [11.5, 12.5]);
  const doua = colturiCaOriginalul(patrat, 2, [r.contururi[0]!, z]);
  assert.equal(arce(doua[0]!), 1);
  assert.deepEqual(doua[1], z);
});

test('cercul și o formă fără colțuri rămân cum le-a dat motorul, în ambele feluri', () => {
  const c: Contur = { inchis: true, varfuri: [{ p: { x: 20, y: 0 }, s: arc(1) }, { p: { x: -20, y: 0 }, s: arc(1) }] };
  for (const fel of ['ca-originalul', 'rotunjite'] as const) {
    for (const d of [5, -5]) {
      const r = offsetInchis(c, d);
      assert.ok(r.ok);
      if (r.ok) assert.deepEqual(offset(c, d, fel).iesire, r.contururi);
    }
  }
});
