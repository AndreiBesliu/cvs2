/**
 * Biarcele (felia 2.7a, ADR 0033) judecate de oracolul lor independent (`test/oracles/biarce.ts`, scris doar din ADR), pe
 * corpusul din `test/oracles/biarce.cazuri.ts`, la toleranța proiectului:
 * - (0) oracolul pe hârtie: distanța la parabola y = x² (pătratica ridicată la cubică: √3/2, 1, ¼, ½ din centrul de
 *   curbură), la arce (semicercul, arcul mare de 270°, arcul aproape drept cu săgeata de 2e-6 mm), sfertul de cerc cu κ
 *   față de arcul exact (abaterea radială 2,7253e-4 × r, valoarea din literatură), ramificarea și mărginirea față de
 *   forța brută; constantele contractului (§1, §5) și forma corpusului (inflexiunile, vârfurile declarate);
 * - (a) fiecare cubică din corpus, la 0,001 mm: `ok`, și lanțul trece TOATE verificările (`judecaLantul`: forma, raza ≤ 9 900 mm,
 *   capetele, tăieturile în ordinea §4 (inflexiuni și vârfuri, linia plată, extremele pe axe), Hausdorff ≤ tol în ambele
 *   sensuri, tangenta);
 * - (b) cubica degenerată dă lanțul gol;
 * - (a) și cazurile recenziei cu toleranța lor (biarcul unic, la 10,67 mm);
 * - (c) refuzurile din §5 (și toleranța la care niciun lanț nu încape): `ok: false`, cu motiv, niciodată o excepție; sub
 *   rezoluția numerică (1e6 mm de origine), motivul nu e al plafonului;
 * - (d) lângă plafon: un lanț valid de cel mult 4 096 de bucăți sau un refuz cu motiv, niciodată un lanț peste toleranță;
 * - (e) `conturFaraCubice`: liniile și arcele neschimbate, `inchis` păstrat, fiecare cubică înlocuită de lanțul ei; refuzul
 *   când o cubică are un punct nefinit sau toleranța e rea;
 * - (f) rezumatul (doar informativ): bucățile pe cubică și abaterea maximă / tol, pe familii.
 * Toate intrările sunt înghețate (o mutare a intrării aruncă). O excepție e o problemă a cazului, nu o oprire a testului.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conturFaraCubice, cubicaInArce, PLAFON_BUCATI } from '../../src/geom/biarce.ts';
import { RAZA_MAXIMA_ARC, TINTA_APROXIMARE, TOLERANTA_PROIECT } from '../../src/geom/toleranta.ts';
import {
  PRAGURI, abatereCurbaLant, abatereLantCurba, distantaLaCubica, distantaLaPiesa, judecaConturul, judecaLantul, lant,
  motivRefuz, piesa, precizieCubica, punctCubica, inflexiuniCuEroare, margineTaietura, extremeAxe, type Radacina, punctPePiesa, tangentaPiesei, type ConturO, type CubicaO, type Masura, type PunctO,
} from '../oracles/biarce.ts';
import {
  CAZURI, CONTURURI, CONTURURI_REFUZ, CU_TOLERANTA_PROPRIE, DEGENERATE, KAPPA, LANGA_PLAFON, PLAFON_LA_ORIGINE, REFUZURI,
  SUB_REZOLUTIE, aleator, dinPatratica, sfert, verificaCorpusul, type CazBiarc,
} from '../oracles/biarce.cazuri.ts';

const TOL = PRAGURI.toleranta;

function ingheata<T>(x: T): T {
  if (typeof x === 'object' && x !== null && !Object.isFrozen(x)) {
    for (const v of Object.values(x)) ingheata(v);
    Object.freeze(x);
  }
  return x;
}

/** Conturul oracolului e, structural, conturul aplicației; dacă tipurile s-ar despărți, compilatorul o spune aici. */
const caContur = (c: ConturO): Parameters<typeof conturFaraCubice>[0] => c;

function ruleaza(c: CubicaO, tol: number): unknown {
  try {
    return cubicaInArce(ingheata(c.a), ingheata(c.c1), ingheata(c.c2), ingheata(c.b), tol);
  } catch (e) {
    return { aruncat: String(e) };
  }
}

const masuri = new Map<string, { caz: CazBiarc; m: Masura }[]>();

function judeca(caz: CazBiarc, tol: number, rezumat = true): string[] {
  const r = ruleaza(caz.cub, tol);
  if (typeof r === 'object' && r !== null && 'aruncat' in r) return [`a aruncat ${String((r as { aruncat: unknown }).aruncat)}`];
  const motiv = motivRefuz(r);
  if (motiv !== undefined) return [`refuzat („${motiv}”), dar trebuie să reușească`];
  const j = judecaLantul(caz.cub, tol, r);
  if (j.masura !== undefined && rezumat) {
    const l = masuri.get(caz.familie) ?? [];
    l.push({ caz, m: j.masura });
    masuri.set(caz.familie, l);
  }
  return j.probleme.map((p) => `${p.cod}: ${p.text}`);
}

// ---------------------------------------------------------------------------------------------------------------------
// (0) Oracolul pe hârtie.

test('(0) constantele contractului: tol = 0,001 mm, ținta 0,99, raza maximă 9 900 mm, plafonul 4 096 (§1, §5)', () => {
  assert.equal(TOLERANTA_PROIECT, PRAGURI.toleranta);
  assert.equal(TINTA_APROXIMARE, PRAGURI.tinta);
  assert.equal(RAZA_MAXIMA_ARC, PRAGURI.razaMaxima);
  assert.equal(PLAFON_BUCATI, PRAGURI.plafon);
});

test('(0) corpusul: inflexiunile și vârfurile declarate chiar există', () => {
  assert.deepEqual(verificaCorpusul(), []);
});

test('(0) tăieturile: rădăcinile exacte și marginea de condiționare (inflexiunea prost condiționată a recenziei)', () => {
  // cross(B′, B″) are coeficientul de grad 2 ≈ −0,0535, diferența a doi termeni de ~3,27e6. Punctul exact (60 de cifre, din
  // intrarea zecimală) e (1 525,6576291146, −307,4739516448), la t = 0,58394066893631; rotunjirea intrării la double îl mută
  // cu ~6e-7 mm. Rădăcina oracolului (exactă pe double) stă la sub 1e-6 mm de el, iar marginea cuprinde eroarea unui calcul
  // în double (~3e-6 mm la aplicație), dar nu e largă: sub 1e-4 mm.
  const c: CubicaO = { a: { x: 78.889, y: 7.649 }, c1: { x: -103.209, y: 47.312 }, c2: { x: 2492.535, y: -518.071 }, b: { x: 2462.991, y: -511.636 } };
  const r = inflexiuniCuEroare(c);
  assert.equal(r.length, 1);
  const q = punctCubica(c, (r[0] as Radacina).t);
  assert.ok(Math.abs((r[0] as Radacina).t - 0.58394066893631) < 1e-9);
  assert.ok(Math.hypot(q.x - 1525.6576291146, q.y + 307.4739516448) < 1e-6);
  const m = margineTaietura(c, r[0] as Radacina);
  assert.ok(m > 1e-5 && m < 1e-4, `marginea ${m}`);
  // O inflexiune bine condiționată (S-ul de 10 mm, t = ½ exact) are doar marginea de bază (~1,2e-8 mm), iar rădăcina e exactă.
  const s: CubicaO = { a: { x: 0, y: 0 }, c1: { x: 3, y: 4 }, c2: { x: 7, y: -4 }, b: { x: 10, y: 0 } };
  const rs = inflexiuniCuEroare(s);
  assert.deepEqual(rs.map((x) => x.t), [0.5]);
  assert.ok(margineTaietura(s, rs[0] as Radacina) < 5e-8);
  // Extremele pe axe ale parabolei y = x² pe [−2, 2] (pătratica ridicată): B′y = 0 doar la t = ½, B′x nicăieri.
  assert.deepEqual(extremeAxe(dinPatratica({ x: -2, y: 4 }, { x: 0, y: -4 }, { x: 2, y: 4 })).map((x) => x.t), [0.5]);
});

test('(0) distanța la cubică, pe hârtie: parabola y = x² pe [−2, 2], ridicată exact din pătratica (−2, 4), (0, −4), (2, 4)', () => {
  const par = dinPatratica({ x: -2, y: 4 }, { x: 0, y: -4 }, { x: 2, y: 4 });
  // d² = x² + (x² − 1)² e minim la x² = ½: d = √3 / 2.
  assert.ok(Math.abs(distantaLaCubica(par, 0, 1).d - Math.sqrt(3) / 2) <= 1e-13);
  assert.ok(Math.abs(distantaLaCubica(par, 0, -1).d - 1) <= 1e-13);
  // (3, 4): distanța scade spre capătul (2, 4), deci 1.
  assert.ok(Math.abs(distantaLaCubica(par, 3, 4).d - 1) <= 1e-13);
  // Focarul (0, ¼): d = ¼. Centrul de curbură al vârfului (0, ½): d² = ¼ + x⁴, plat de ordinul 4 (încercarea grea).
  assert.ok(Math.abs(distantaLaCubica(par, 0, 0.25).d - 0.25) <= 1e-13);
  const cc = distantaLaCubica(par, 0, 0.5);
  assert.ok(Math.abs(cc.d - 0.5) <= 1e-11, `centrul de curbură: ${cc.d}`);
  assert.ok(cc.jos <= 0.5 + 1e-15 && cc.d - cc.jos <= 1e-11, `marginea de jos ${cc.jos}`);
  // Punctul parabolei din parametrul t = ¾ e chiar x = 1, y = 1.
  const p = punctCubica(par, 0.75);
  assert.ok(Math.abs(p.x - 1) <= 1e-15 && Math.abs(p.y - 1) <= 1e-15);
});

test('(0) distanța la arc, pe hârtie: semicercul, arcul de 270°, arcul aproape drept', () => {
  // Semicercul unitate de la (1, 0) la (−1, 0), bulge 1 (trigonometric, prin (0, 1)).
  const sus = piesa({ x: 1, y: 0 }, { x: -1, y: 0 }, { tip: 'A', bulge: 1 });
  assert.ok(Math.abs(distantaLaPiesa(sus, 0, 0) - 1) <= 1e-15);
  assert.ok(Math.abs(distantaLaPiesa(sus, 0, 3) - 2) <= 1e-15);
  assert.ok(Math.abs(distantaLaPiesa(sus, 0, -1) - Math.SQRT2) <= 1e-15);
  const mij = punctPePiesa(sus, 0.5);
  assert.ok(Math.abs(mij.x) <= 1e-15 && Math.abs(mij.y - 1) <= 1e-15);
  const t0 = tangentaPiesei(sus, 0), t1 = tangentaPiesei(sus, 1);
  assert.ok(Math.abs(t0.x) <= 1e-15 && Math.abs(t0.y - 1) <= 1e-15 && Math.abs(t1.x) <= 1e-15 && Math.abs(t1.y + 1) <= 1e-15);
  // Bulge −1: prin (0, −1); (0, 3) e în afara sectorului, deci capătul: √10.
  const jos = piesa({ x: 1, y: 0 }, { x: -1, y: 0 }, { tip: 'A', bulge: -1 });
  assert.ok(Math.abs(distantaLaPiesa(jos, 0, 3) - Math.sqrt(10)) <= 1e-14);
  assert.ok(Math.abs(distantaLaPiesa(jos, 0, -3) - 2) <= 1e-15);
  // Arcul de 270° pe cercul unitate, de la (1, 0) la (0, −1), trigonometric: bulge = tan(3π/8).
  const mare = piesa({ x: 1, y: 0 }, { x: 0, y: -1 }, { tip: 'A', bulge: Math.tan((3 * Math.PI) / 8) });
  assert.ok(Math.abs(distantaLaPiesa(mare, 0, 0) - 1) <= 1e-14);
  assert.ok(Math.abs(distantaLaPiesa(mare, -2, 0) - 1) <= 1e-14);
  // (1, −1) e în sfertul lipsă: cel mai apropiat e un capăt, la 1 (cercul ar da √2 − 1).
  assert.ok(Math.abs(distantaLaPiesa(mare, 1, -1) - 1) <= 1e-14);
  // Coarda (0, 0) → (400, 0), bulge 1e-8: săgeata 2e-6 mm, de partea dreaptă a coardei (y < 0), raza ~1e10 mm.
  const drept = piesa({ x: 0, y: 0 }, { x: 400, y: 0 }, { tip: 'A', bulge: 1e-8 });
  assert.ok(Math.abs(distantaLaPiesa(drept, 200, 0) - 2e-6) <= 1e-18);
  assert.ok(distantaLaPiesa(drept, 200, -2e-6) <= 1e-18);
  const m = punctPePiesa(drept, 0.5);
  assert.ok(Math.abs(m.x - 200) <= 1e-12 && Math.abs(m.y + 2e-6) <= 1e-18);
});

test('(0) Hausdorff pe hârtie: sfertul de cerc cu κ față de arcul exact = 2,7253e-4 × r, în ambele sensuri', () => {
  const c = sfert(0, 0, 1, 1, 0);
  assert.ok(Math.abs(KAPPA - 0.5522847498307936) <= 1e-15);
  const l = lant(c.a, [{ p: c.a, s: { tip: 'A', bulge: Math.tan(Math.PI / 8) } }], c.b);
  const cl = abatereCurbaLant(c, l), lc = abatereLantCurba(c, l, 0);
  assert.ok(Math.abs(cl.max - 2.7253e-4) <= 1e-8, `curbă → arc: ${cl.max}`);
  assert.ok(Math.abs(lc.max - 2.7253e-4) <= 1e-8, `arc → curbă: ${lc.max}`);
  // Rafinarea: abaterea curbă → arc e exact max(|B(t)| − 1), maximizată aici separat, pe o grilă de 2e5 + o căutare ternară.
  let best = 0, bt = 0;
  for (let i = 0; i <= 200000; i++) { const p = punctCubica(c, i / 200000); const g = Math.hypot(p.x, p.y) - 1; if (g > best) { best = g; bt = i / 200000; } }
  let lo = Math.max(0, bt - 1e-5), hi = Math.min(1, bt + 1e-5);
  for (let i = 0; i < 200; i++) {
    const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
    const g1 = Math.hypot(punctCubica(c, m1).x, punctCubica(c, m1).y), g2 = Math.hypot(punctCubica(c, m2).x, punctCubica(c, m2).y);
    if (g1 < g2) lo = m1; else hi = m2;
  }
  const radial = Math.hypot(punctCubica(c, lo).x, punctCubica(c, lo).y) - 1;
  assert.ok(Math.abs(cl.max - radial) <= 1e-14, `rafinarea: ${cl.max} față de ${radial}`);
});

test('(0) distanța la cubică: ramificarea și mărginirea față de forța brută (2·10⁴ puncte + Newton), pe 300 de puncte', () => {
  const rnd = aleator(7);
  const probleme: string[] = [];
  for (let k = 0; k < 300; k++) {
    const caz = CAZURI[Math.floor(rnd() * CAZURI.length)] as CazBiarc;
    const c = caz.cub;
    const S = Math.hypot(c.b.x - c.a.x, c.b.y - c.a.y) + Math.hypot(c.c1.x - c.a.x, c.c1.y - c.a.y) + Math.hypot(c.c2.x - c.b.x, c.c2.y - c.b.y);
    const t = rnd();
    const p = punctCubica(c, t);
    const q: PunctO = { x: p.x + (rnd() - 0.5) * S * (k % 3 === 0 ? 1e-4 : 0.3), y: p.y + (rnd() - 0.5) * S * (k % 3 === 0 ? 1e-4 : 0.3) };
    let brut = Infinity, bt = 0;
    for (let i = 0; i <= 20000; i++) { const r = punctCubica(c, i / 20000); const d = Math.hypot(r.x - q.x, r.y - q.y); if (d < brut) { brut = d; bt = i / 20000; } }
    // Rafinarea locală a forței brute: o căutare ternară pe ±1/20000.
    let lo = Math.max(0, bt - 5e-5), hi = Math.min(1, bt + 5e-5);
    for (let i = 0; i < 200; i++) {
      const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
      const r1 = punctCubica(c, m1), r2 = punctCubica(c, m2);
      if (Math.hypot(r1.x - q.x, r1.y - q.y) < Math.hypot(r2.x - q.x, r2.y - q.y)) hi = m2; else lo = m1;
    }
    const rr = punctCubica(c, lo);
    brut = Math.min(brut, Math.hypot(rr.x - q.x, rr.y - q.y));
    const bb = distantaLaCubica(c, q.x, q.y);
    // Precizia declarată (`precizieCubica`), plus rotunjirea forței brute (aceeași mărime).
    const eps = 2 * precizieCubica(c);
    if (bb.d > brut + eps) probleme.push(`${caz.nume}, (${q.x}, ${q.y}): oracolul ${bb.d} > forța brută ${brut}`);
    if (bb.jos > brut + eps) probleme.push(`${caz.nume}: marginea de jos ${bb.jos} > forța brută ${brut}`);
    if (bb.d - bb.jos > eps) probleme.push(`${caz.nume}: intervalul [${bb.jos}, ${bb.d}] e mai larg decât precizia declarată`);
  }
  assert.deepEqual(probleme, []);
});

// ---------------------------------------------------------------------------------------------------------------------
// (a) Corpusul, la toleranța proiectului.

for (const caz of CAZURI) {
  test(`(a) ${caz.familie}: ${caz.nume}`, () => { assert.deepEqual(judeca(caz, TOL), []); });
}

for (const c of CU_TOLERANTA_PROPRIE) {
  test(`(a) recenzie, la toleranța proprie ${c.tol}: ${c.nume}`, (t) => {
    assert.deepEqual(judeca({ nume: c.nume, familie: 'recenzie', cub: c.cub }, c.tol, false), []);
    const j = judecaLantul(c.cub, c.tol, ruleaza(c.cub, c.tol));
    t.diagnostic(`${j.masura?.bucati} bucăți, abaterea ${(Math.max(j.masura?.curbaLant ?? NaN, j.masura?.lantCurba ?? NaN) / c.tol).toFixed(5)} × tol`);
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// (b), (c), (d) Degeneratele, refuzurile, plafonul.

test('(b) cubica degenerată (toate punctele la sub 1e-9 mm) dă lanțul gol', () => {
  const probleme: string[] = [];
  for (const d of DEGENERATE) {
    for (const tol of [TOL, 0.1, 1e-4]) {
      const r = ruleaza(d.cub, tol) as { ok?: unknown; varfuri?: unknown; bucati?: unknown };
      if (r.ok !== true || !Array.isArray(r.varfuri) || r.varfuri.length !== 0 || r.bucati !== 0) probleme.push(`${d.nume}, tol ${tol}: ${JSON.stringify(r)}`);
    }
  }
  assert.deepEqual(probleme, []);
});

test('(c) refuzurile din §5: ok = false, cu motiv, niciodată o excepție', () => {
  const probleme: string[] = [];
  for (const c of REFUZURI) {
    const r = ruleaza(c.cub, c.tol);
    if (motivRefuz(r) === undefined) probleme.push(`${c.nume}: ${JSON.stringify(r)?.slice(0, 160)}`);
  }
  assert.deepEqual(probleme, []);
});

test('(c) sub rezoluția numerică: refuz cu motivul lui, altul decât al plafonului (§5)', (t) => {
  const fara = (m: string): string => m.replace(/-?\d[\d.,e+-]*/g, '#').replace(/\s+/g, ' ').trim();
  const plafon = motivRefuz(ruleaza(PLAFON_LA_ORIGINE.cub, PLAFON_LA_ORIGINE.tol));
  assert.ok(plafon !== undefined, 'plafonul refuză');
  t.diagnostic(`plafonul: „${plafon}”`);
  for (const c of SUB_REZOLUTIE) {
    const m = motivRefuz(ruleaza(c.cub, c.tol));
    assert.ok(m !== undefined, `${c.nume}: nu e refuzat`);
    t.diagnostic(`${c.nume}: „${m}”`);
    assert.notEqual(fara(m), fara(plafon), `${c.nume}: motivul e al plafonului`);
  }
});

test('(d) lângă plafon: un lanț valid de cel mult 4 096 de bucăți, sau un refuz cu motiv (niciun lanț peste toleranță)', (t) => {
  const probleme: string[] = [];
  for (const c of LANGA_PLAFON) {
    const r = ruleaza(c.cub, c.tol);
    const motiv = motivRefuz(r);
    if (motiv !== undefined) { t.diagnostic(`${c.nume}: refuz („${motiv}”)`); continue; }
    const j = judecaLantul(c.cub, c.tol, r);
    t.diagnostic(`${c.nume}: ${j.masura?.bucati ?? '?'} bucăți, abaterea ${((Math.max(j.masura?.curbaLant ?? NaN, j.masura?.lantCurba ?? NaN)) / c.tol).toFixed(4)} × tol`);
    for (const p of j.probleme) probleme.push(`${c.nume}: ${p.cod}: ${p.text}`);
  }
  assert.deepEqual(probleme, []);
});

// ---------------------------------------------------------------------------------------------------------------------
// (e) Contururile întregi.

for (const c of CONTURURI) {
  test(`(e) conturFaraCubice: ${c.nume}`, () => {
    let r: unknown;
    try { r = conturFaraCubice(caContur(ingheata(c.contur)), TOL); } catch (e) { r = { aruncat: String(e) }; }
    const probleme = judecaConturul(c.contur, TOL, r, (a, c1, c2, b, tol) => cubicaInArce(a, c1, c2, b, tol));
    assert.deepEqual(probleme.map((p) => `${p.cod}: ${p.text}`), []);
  });
}

test('(e) conturFaraCubice refuză o cubică cu un punct nefinit și o toleranță rea (cu cel puțin o cubică), cu motiv', () => {
  const probleme: string[] = [];
  for (const c of CONTURURI_REFUZ) {
    let r: unknown;
    try { r = conturFaraCubice(caContur(ingheata(c.contur)), c.tol); } catch (e) { r = { aruncat: String(e) }; }
    if (motivRefuz(r) === undefined) probleme.push(`${c.nume}: ${JSON.stringify(r)?.slice(0, 160)}`);
  }
  assert.deepEqual(probleme, []);
});

test('(e) informativ: contururile la care ADR-ul tace (fără cubice cu toleranța rea; ultimul vârf deschis cu „C”)', (t) => {
  const fara: ConturO = { inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 1, y: 0 }, s: { tip: 'L' } }] };
  const r1 = conturFaraCubice(caContur(ingheata(fara)), NaN);
  t.diagnostic(`fără cubice, tol = NaN: ${JSON.stringify(r1).slice(0, 120)}`);
  const coada: ConturO = { inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 1, y: 0 }, s: { tip: 'C', c1: { x: 2, y: 1 }, c2: { x: 3, y: 1 } } }] };
  const r2 = conturFaraCubice(caContur(ingheata(coada)), TOL);
  t.diagnostic(`deschis, ultimul vârf cu „C” (fără segment): ${JSON.stringify(r2).slice(0, 200)}`);
  assert.ok(true);
});

// ---------------------------------------------------------------------------------------------------------------------
// (f) Rezumatul (informativ).

test('(f) rezumatul: bucățile pe cubică și abaterea maximă / tol, pe familii (la 0,001 mm)', (t) => {
  let total = 0, n = 0, maxCL = 0, maxLC = 0, maxU = 0;
  for (const [familie, l] of [...masuri].sort(([a], [b]) => a.localeCompare(b))) {
    const b = l.map((x) => x.m.bucati).sort((u, v) => u - v);
    const dev = Math.max(...l.map((x) => Math.max(x.m.curbaLant, x.m.lantCurba)));
    t.diagnostic(`${familie}: ${l.length} cubice, bucăți min ${b[0]} / median ${b[Math.floor(b.length / 2)]} / max ${b[b.length - 1]}, abaterea max ${(dev / TOL).toFixed(5)} × tol`);
    for (const x of l) {
      total += x.m.bucati; n++;
      maxCL = Math.max(maxCL, x.m.curbaLant); maxLC = Math.max(maxLC, x.m.lantCurba); maxU = Math.max(maxU, x.m.unghi);
    }
  }
  const razaMax = Math.max(...[...masuri.values()].flat().map((x) => x.m.razaMax));
  t.diagnostic(`total: ${n} cubice, ${total} bucăți; curbă → lanț max ${(maxCL / TOL).toFixed(5)} × tol, lanț → curbă max ${(maxLC / TOL).toFixed(5)} × tol; unghiul de îmbinare max ${maxU.toExponential(2)} rad; raza max ${razaMax.toFixed(1)} mm`);
  assert.ok(n > 0, 'rezumatul rulează după (a)');
});
