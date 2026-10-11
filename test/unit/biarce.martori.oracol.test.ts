/**
 * Martorii oracolului biarcelor (ADR 0033 §8): oracolul trebuie să PRINDĂ lanțurile greșite și să LASE lanțurile bune de
 * lângă prag. Fără ei, un oracol care spune „bine” la orice ar trece tot corpusul.
 * - (n1) controlul negativ din §8: un lanț împins cu 1,01 × tol (spre stânga și spre dreapta) e prins de Hausdorff; același
 *   lanț împins cu 0,98 × tol trece (pragul e ascuțit). Lanțul de referință e al aplicației la tol / 1 000 (verificat întâi
 *   de oracol la tol / 1 000), iar împingerea e decalajul exact pe normale (arcul rămâne concentric, cu același bulge),
 *   deci abaterea lanțului împins e d ± tol / 1 000;
 * - (n2) transformările greșite ale lanțului aplicației, fiecare prinsă: o bucată scăpată, un bulge întors (pe un arc a cărui
 *   întoarcere iese sigur din toleranță; un lanț fără arce e o eroare zgomotoasă a cazului), primul vârf mutat
 *   cu 1e-9 mm, ultimul vârf împins cu 1,01 × tol, lanțul trunchiat la jumătate, b adăugat ca vârf (bucata nulă), o cubică
 *   rămasă, numărul greșit, o bucată nulă în mijloc;
 * - (n3) câte un sens al Hausdorff, singur: acul de păr (lanțul e lângă curbă, dar curba nu e lângă lanț) și țepușa (curba e
 *   lângă lanț, dar lanțul nu e lângă curbă) sunt prinse fiecare doar de sensul lor;
 * - (n4) verificările care nu sunt Hausdorff, fiecare singură: plafonul (4 097 de bucăți, iar 4 096 nu), cubica degenerată
 *   cu o bucată, linia făcută din arce (pe dreapta exactă, pe bucata plată, pe dreapta exactă care nu e plată), raza de
 *   1e5 mm (§1, §4), tăietura lipsă de la inflexiune, tangenta ruptă în toleranță, zigzagul (tangenta întoarsă departe de un
 *   vârf);
 * - (n5) `judecaConturul`: arcul păstrat schimbat, `inchis` întors, o linie mutată, suma greșită, o ușă care trunchiază
 *   (cu un contur consecvent cu ea); `motivRefuz`: motivul gol.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conturFaraCubice, cubicaInArce } from '../../src/geom/biarce.ts';
import {
  PRAGURI, distantaLaCubica, distantaLaLant, derivataCubica, inflexiuni, judecaAbaterea, judecaConturul, judecaLantul, lant, motivRefuz, piesa,
  punctCubica, tangentaPiesei, type CodProblema, type ConturO, type CubicaO, type PunctO, type VarfO,
} from '../oracles/biarce.ts';
import { CAZURI, CONTURURI, DEGENERATE, sfert, type CazBiarc } from '../oracles/biarce.cazuri.ts';

const TOL = PRAGURI.toleranta;
const caContur = (c: ConturO): Parameters<typeof conturFaraCubice>[0] => c;

type Lant = { readonly ok: true; readonly varfuri: readonly VarfO[]; readonly bucati: number };

function aplicatia(c: CubicaO, tol: number): Lant {
  const r = cubicaInArce(c.a, c.c1, c.c2, c.b, tol) as unknown as { ok: boolean; varfuri: VarfO[]; bucati: number; motiv?: string };
  assert.ok(r.ok, `aplicația a refuzat: ${String(r.motiv)}`);
  return { ok: true, varfuri: r.varfuri, bucati: r.bucati };
}

const coduri = (c: CubicaO, tol: number, r: unknown): CodProblema[] => [...new Set(judecaLantul(c, tol, r).probleme.map((p) => p.cod))].sort();
const cu = (varfuri: readonly VarfO[]): Lant => ({ ok: true, varfuri, bucati: varfuri.length });
const normalaStanga = (t: PunctO): PunctO => ({ x: -t.y, y: t.x });

/** Cazurile netede (fără vârfuri și bucle, raza de curbură ≫ tol) pe care se împinge lanțul. */
const NETEDE: readonly CazBiarc[] = [
  'sfert de cerc r = 25', 'sfert de cerc r = 600, rotit 0,3 rad', 'sfert de elipsă 100 × 30', 'glifa O, cubica 1',
  'glifa S, cubica 3', 'glifa S la 300 mm, cubica 4', 'inima, cubica 3', 'glifa o (TrueType, pătratice), cubica 2',
].map((n) => { const c = CAZURI.find((x) => x.nume === n); assert.ok(c !== undefined, `lipsește ${n}`); return c; });

/** Cazurile pe care se aplică transformările: lanțuri de cel puțin 6 bucăți, cu arce. */
const TRANSFORMATE: readonly CazBiarc[] = CAZURI.filter((c) => ['cerc', 'elipsa', 'glife', 'svg'].includes(c.familie))
  .filter((c) => aplicatia(c.cub, TOL).varfuri.length >= 6).slice(0, 24);

// ---------------------------------------------------------------------------------------------------------------------
// (n1) Împins cu 1,01 × tol: prins; cu 0,98 × tol: lăsat.

/** Lanțul împins cu d pe normala stângă (decalajul exact al unui lanț continuu tangent: bulge-urile rămân). */
function impins(c: CubicaO, varfuri: readonly VarfO[], d: number): { a: PunctO; varfuri: VarfO[]; b: PunctO } {
  const l = lant(c.a, varfuri, c.b);
  const muta = (p: PunctO, t: PunctO): PunctO => { const n = normalaStanga(t); return { x: p.x + d * n.x, y: p.y + d * n.y }; };
  const noi = varfuri.map((v, i) => ({ p: muta(v.p, tangentaPiesei(l.piese[i] as ReturnType<typeof piesa>, 0)), s: v.s }));
  const ultima = l.piese[l.piese.length - 1] as ReturnType<typeof piesa>;
  return { a: (noi[0] as VarfO).p, varfuri: noi, b: muta(c.b, tangentaPiesei(ultima, 1)) };
}

for (const caz of NETEDE) {
  test(`(n1) împins cu ±1,01 × tol: prins; cu ±0,98 × tol: lăsat — ${caz.nume}`, () => {
    const ref = aplicatia(caz.cub, TOL / 1000);
    const j = judecaLantul(caz.cub, TOL / 1000, ref);
    assert.deepEqual(j.probleme, [], 'referința la tol / 1 000 e validă');
    for (const semn of [1, -1]) {
      for (const [f, prins] of [[1.01, true], [0.98, false]] as const) {
        const i = impins(caz.cub, ref.varfuri, semn * f * TOL);
        const li = lant(i.a, i.varfuri, i.b);
        // Mijlocul curbei (nu doar capetele ei) e la f × tol ± tol / 1 000 de lanțul împins.
        for (const t of [0.25, 0.5, 0.75]) {
          const m = punctCubica(caz.cub, t);
          const dm = distantaLaLant(li, m.x, m.y).d;
          assert.ok(Math.abs(dm - f * TOL) <= TOL / 1000 + 1e-9, `B(${t}) e la ${dm / TOL} × tol de lanțul împins cu ${semn * f} × tol`);
        }
        const ab = judecaAbaterea(caz.cub, li, TOL);
        const masura = `curbă → lanț ${(ab.curbaLant / TOL).toFixed(4)}, lanț → curbă ${(ab.lantCurba / TOL).toFixed(4)} × tol`;
        if (prins) {
          // Fiecare sens, singur, prinde împingerea (abaterea lanțului împins e 1,01 × tol ± tol / 1 000 în ambele sensuri).
          assert.deepEqual(ab.probleme.map((p) => p.cod).sort(), ['abatere-curba-lant', 'abatere-lant-curba'], `împins cu ${semn * f} × tol (${masura})`);
          assert.ok(ab.curbaLant > 1.005 * TOL && ab.lantCurba > 1.005 * TOL, `ambele sensuri văd împingerea (${masura})`);
        } else {
          assert.deepEqual(ab.probleme, [], `împins cu ${semn * f} × tol, sub prag, dar respins (${masura})`);
          assert.ok(ab.curbaLant > 0.975 * TOL && ab.lantCurba > 0.975 * TOL, `măsura vede împingerea de 0,98 (${masura})`);
        }
      }
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// (n2) Transformările greșite ale lanțului aplicației.

/** Punctul mutat cu 1,01 × tol DEPARTE de curbă (pe direcția de la proiecția lui pe curbă, sau pe normala curbei). */
function departe(c: CubicaO, p: PunctO, d: number): PunctO {
  const pr = distantaLaCubica(c, p.x, p.y);
  const q = punctCubica(c, pr.t);
  let ux = p.x - q.x, uy = p.y - q.y;
  const L = Math.hypot(ux, uy);
  if (L > 1e-12) { ux /= L; uy /= L; } else { const t = derivataCubica(c, pr.t); const m = Math.hypot(t.x, t.y); ux = -t.y / m; uy = t.x / m; }
  return { x: q.x + (L + d) * ux, y: q.y + (L + d) * uy };
}

/**
 * Arcul de întors: cel mai apropiat de mijlocul lanțului, în oricare jumătate, dintre arcele a căror întoarcere iese sigur
 * din toleranță (săgeata s ≥ 1,5 × tol: punctul de mijloc al arcului se mută cu 2s, iar înainte stătea la cel mult tol de
 * curbă, deci după întoarcere e la cel puțin 2s − tol ≥ 2 × tol). Lanțul fără niciun arc e o eroare a cazului (zgomotoasă);
 * lanțul ale cărui arce sunt toate aproape plate nu se poate strica prin întoarcere (`undefined`: transformarea nu se aplică).
 */
function arcDeIntors(c: CubicaO, v: readonly VarfO[]): number | undefined {
  const l = lant(c.a, v, c.b);
  const arce = l.piese.map((q, i) => ({ q, i })).filter((x) => x.q.arc);
  if (arce.length === 0) throw new Error('lanțul nu are niciun arc: transformarea „bulge întors” nu are pe ce lucra');
  const bune = arce.filter((x) => x.q.h * Math.abs(x.q.bulge) >= 1.5 * TOL);
  if (bune.length === 0) return undefined;
  const mij = (v.length - 1) / 2;
  return bune.reduce((m, x) => (Math.abs(x.i - mij) < Math.abs(m.i - mij) ? x : m)).i;
}

const TRANSFORMARI: readonly { readonly nume: string; readonly fa: (c: CubicaO, v: readonly VarfO[]) => Lant | undefined; readonly asteptat?: CodProblema }[] = [
  { nume: 'o bucată scăpată (vârful din mijloc scos)', fa: (_c, v) => cu(v.filter((_x, i) => i !== Math.floor(v.length / 2))) },
  {
    nume: 'bulge întors pe arcul (cu săgeata ≥ 1,5 × tol) cel mai apropiat de mijloc',
    fa: (c, v) => {
      const k = arcDeIntors(c, v);
      if (k === undefined) return undefined;
      return cu(v.map((x, i) => (i === k && x.s.tip === 'A' ? { p: x.p, s: { tip: 'A', bulge: -x.s.bulge } } : x)));
    },
  },
  { nume: 'primul vârf mutat cu 1e-9 mm', fa: (_c, v) => cu(v.map((x, i) => (i === 0 ? { p: { x: x.p.x + 1e-9, y: x.p.y }, s: x.s } : x))), asteptat: 'start' },
  {
    nume: 'ultimul vârf împins cu 1,01 × tol departe de curbă',
    fa: (c, v) => cu(v.map((x, i) => (i === v.length - 1 ? { p: departe(c, x.p, 1.01 * TOL), s: x.s } : x))),
    asteptat: 'abatere-lant-curba',
  },
  { nume: 'lanțul trunchiat la jumătate (ultima bucată păstrată merge în b)', fa: (_c, v) => cu(v.slice(0, Math.ceil(v.length / 2))) },
  { nume: 'b adăugat ca ultim vârf (bucata nulă)', fa: (c, v) => cu([...v, { p: c.b, s: { tip: 'L' } }]), asteptat: 'lungime-zero' },
  {
    nume: 'o cubică rămasă în lanț',
    fa: (_c, v) => cu(v.map((x, i) => (i === 1 ? { p: x.p, s: { tip: 'C', c1: x.p, c2: x.p } } : x))),
    asteptat: 'cubica-ramasa',
  },
  { nume: 'numărul bucăților greșit', fa: (_c, v) => ({ ok: true, varfuri: v, bucati: v.length + 1 }), asteptat: 'numar' },
  { nume: 'o bucată nulă în mijloc (vârf dublat)', fa: (_c, v) => cu([...v.slice(0, 3), { p: (v[2] as VarfO).p, s: { tip: 'L' } }, ...v.slice(3)]), asteptat: 'lungime-zero' },
  {
    nume: 'un vârf la 5e-10 mm de următorul (§4: cade sub 1e-9 mm)',
    fa: (_c, v) => {
      const x = v[2] as VarfO;
      return cu([...v.slice(0, 2), { p: { x: x.p.x - 5e-10, y: x.p.y }, s: { tip: 'L' } }, ...v.slice(2)]);
    },
    asteptat: 'lungime-zero',
  },
];

for (const tr of TRANSFORMARI) {
  test(`(n2) prins: ${tr.nume}`, () => {
    const scapate: string[] = [];
    let aplicate = 0;
    for (const caz of TRANSFORMATE) {
      let r: Lant | undefined;
      try { r = tr.fa(caz.cub, aplicatia(caz.cub, TOL).varfuri); } catch (e) { scapate.push(`${caz.nume}: ${String(e)}`); continue; }
      if (r === undefined) continue;
      aplicate++;
      const c = coduri(caz.cub, TOL, r);
      if (c.length === 0) scapate.push(`${caz.nume}: neprins`);
      else if (tr.asteptat !== undefined && !c.includes(tr.asteptat)) scapate.push(`${caz.nume}: prins doar ca ${c.join(', ')}, nu ca ${tr.asteptat}`);
    }
    assert.ok(TRANSFORMATE.length >= 12, `prea puține cazuri: ${TRANSFORMATE.length}`);
    assert.ok(aplicate >= 12, `transformarea s-a aplicat doar pe ${aplicate} cazuri`);
    assert.deepEqual(scapate, []);
  });
}

test('(n2) lanțul nealterat al aplicației trece pe aceleași cazuri (controlul transformărilor)', () => {
  const p: string[] = [];
  for (const caz of TRANSFORMATE) { const c = coduri(caz.cub, TOL, aplicatia(caz.cub, TOL)); if (c.length > 0) p.push(`${caz.nume}: ${c.join(', ')}`); }
  assert.deepEqual(p, []);
});

// ---------------------------------------------------------------------------------------------------------------------
// (n3) Câte un sens al Hausdorff, singur.

test('(n3) acul de păr: lanțul [a → b] stă lângă curbă, dar vârful curbei e departe de lanț — doar curbă → lanț îl prinde', () => {
  // (Și extremul pe x de la t = ½ lipsește din lanț: „taietura”; Hausdorff îl prinde doar dinspre curbă.)
  const c: CubicaO = { a: { x: 0, y: 0 }, c1: { x: 10, y: 0 }, c2: { x: 10, y: 0.0005 }, b: { x: 0, y: 0.0005 } };
  const k = coduri(c, TOL, cu([{ p: c.a, s: { tip: 'L' } }]));
  assert.ok(k.includes('abatere-curba-lant') && !k.includes('abatere-lant-curba'), k.join(', '));
});

test('(n3) țepușa: curba stă lângă lanț, dar un vârf al lanțului e la 10 × tol de curbă — doar lanț → curbă o prinde', () => {
  const p: string[] = [];
  for (const caz of TRANSFORMATE.slice(0, 8)) {
    const v = aplicatia(caz.cub, TOL).varfuri;
    const k = Math.floor(v.length / 2);
    const x = v[k] as VarfO;
    const varf = departe(caz.cub, x.p, 10 * TOL);
    const r = cu([...v.slice(0, k), { p: x.p, s: { tip: 'L' } }, { p: varf, s: { tip: 'L' } }, x, ...v.slice(k + 1)]);
    const c = coduri(caz.cub, TOL, r);
    if (c.join() !== 'abatere-lant-curba') p.push(`${caz.nume}: ${c.join(', ') || 'neprins'}`);
  }
  assert.deepEqual(p, []);
});

// ---------------------------------------------------------------------------------------------------------------------
// (n4) Verificările care nu sunt Hausdorff, fiecare singură.

test('(n4) plafonul: 4 097 de bucăți sunt prinse, 4 096 nu (pe o dreaptă împărțită exact)', () => {
  const c: CubicaO = { a: { x: 0, y: 0 }, c1: { x: 1, y: 1 }, c2: { x: 2, y: -1 }, b: { x: 3, y: 0 } };
  const pe = (n: number): VarfO[] => Array.from({ length: n }, (_x, i) => ({ p: punctCubica(c, i / n), s: { tip: 'L' } }));
  assert.ok(coduri(c, TOL, cu(pe(4097))).includes('plafon'));
  assert.ok(!coduri(c, TOL, cu(pe(4096))).includes('plafon'));
  assert.deepEqual(coduri(c, TOL, cu(pe(4097))), ['plafon']);
});

test('(n4) cubica degenerată cu o bucată e prinsă', () => {
  const d = DEGENERATE.find((x) => x.cub.a.x !== x.cub.b.x || x.cub.a.y !== x.cub.b.y);
  assert.ok(d !== undefined);
  assert.deepEqual(coduri(d.cub, TOL, cu([{ p: d.cub.a, s: { tip: 'L' } }])), ['degenerata']);
  assert.deepEqual(coduri(d.cub, TOL, cu([])), []);
});

test('(n4) dreapta făcută din două arce (în toleranță, tangenta continuă) e prinsă de regula liniei', () => {
  const c: CubicaO = { a: { x: 0, y: 0 }, c1: { x: 3, y: 0 }, c2: { x: 7, y: 0 }, b: { x: 10, y: 0 } };
  // (Arcele de bulge 1e-9 au raza ~1e9 mm, deci și raza le prinde.)
  assert.deepEqual(coduri(c, TOL, cu([{ p: c.a, s: { tip: 'A', bulge: 1e-9 } }, { p: { x: 5, y: 0 }, s: { tip: 'A', bulge: -1e-9 } }])), ['linie', 'raza']);
  assert.deepEqual(coduri(c, TOL, cu([{ p: c.a, s: { tip: 'L' } }])), []);
});

test('(n4) regula liniei, fiecare jumătate singură: arcul plat (bucata plată) și dreapta exactă care nu e plată', () => {
  // Arcul la 0,0005 (sub 0,99 × tol, fără inflexiuni): dat ca două jumătăți ale unui arc de cerc cu săgeata 0,000375,
  // tangenta continuă, în toleranță: doar regula bucății plate îl prinde.
  const plat = CAZURI.find((x) => x.nume === 'aproape dreaptă, arc la 0,0005');
  assert.ok(plat !== undefined);
  const beta = Math.tan(Math.atan((2 * 0.000375) / 100) / 2);
  const mij = { x: 50, y: 0.000375 };
  // (Raza lor e ~3,3e6 mm, deci și raza le prinde.)
  assert.deepEqual(coduri(plat.cub, TOL, cu([{ p: plat.cub.a, s: { tip: 'A', bulge: -beta } }, { p: mij, s: { tip: 'A', bulge: -beta } }])), ['linie', 'raza']);
  // Dreapta exactă, monotonă, cu mânerul c1 dincolo de b (deci NU e plată: c1 e la 2 mm de segment, fără vârfuri, fără
  // extreme): doar regula dreptei exacte cere linii. Un arc de 1e-12 în locul primei jumătăți e prins doar de ea.
  const dus: CubicaO = { a: { x: 0, y: 0 }, c1: { x: 12, y: 0 }, c2: { x: 8, y: 0 }, b: { x: 10, y: 0 } };
  const v = (s: VarfO['s'], t: number): VarfO => ({ p: punctCubica(dus, t), s });
  assert.deepEqual(coduri(dus, TOL, cu([v({ tip: 'A', bulge: 1e-12 }, 0), v({ tip: 'L' }, 0.5)])), ['linie', 'raza']);
  assert.deepEqual(coduri(dus, TOL, cu([v({ tip: 'L' }, 0), v({ tip: 'L' }, 0.5)])), []);
});

test('(n4) raza: două arce de R = 1e5 mm (în toleranță, tangenta continuă, tăiate la extrem) sunt prinse doar de rază', () => {
  // Cubica cu săgeata 0,75e-3 pe coarda √600 (c1, c2 la 1e-3 > 0,99 × tol, deci nu e plată): cercul prin a, B(½), b are
  // R = L² / (8 s) = 600 / 0,006 = 1e5 mm. Două jumătăți ale lui, cu vârful în extremul pe y.
  const L = Math.sqrt(600);
  const c: CubicaO = { a: { x: 0, y: 0 }, c1: { x: L / 3, y: 0.001 }, c2: { x: (2 * L) / 3, y: 0.001 }, b: { x: L, y: 0 } };
  const m = punctCubica(c, 0.5);
  const beta = -Math.tan(Math.atan((2 * m.y) / L) / 2);
  const r = cu([{ p: c.a, s: { tip: 'A', bulge: beta } }, { p: m, s: { tip: 'A', bulge: beta } }]);
  const q = lant(c.a, r.varfuri, c.b).piese[0];
  assert.ok(q !== undefined && Math.abs(q.r - 1e5) < 1, `raza ${q?.r}`);
  assert.deepEqual(coduri(c, TOL, r), ['raza']);
  // Controlul: aceeași cubică dată ca două linii (raza nu se mai pune) trece.
  assert.deepEqual(coduri(c, TOL, cu([{ p: c.a, s: { tip: 'L' } }, { p: m, s: { tip: 'L' } }])), []);
});

test('(n4) extremul pe axe lipsă (§4, pasul 3): cubica care nu e plată, dată ca o singură linie în toleranță', () => {
  // Aceeași cubică: săgeata 0,75e-3 < tol, deci linia [a, b] încape, dar c1, c2 stau la 1e-3 > 0,99 × tol de segment,
  // așa că bucata nu e plată și trebuia tăiată în extremul pe y (t = ½).
  const L = Math.sqrt(600);
  const c: CubicaO = { a: { x: 0, y: 0 }, c1: { x: L / 3, y: 0.001 }, c2: { x: (2 * L) / 3, y: 0.001 }, b: { x: L, y: 0 } };
  assert.deepEqual(coduri(c, TOL, cu([{ p: c.a, s: { tip: 'L' } }])), ['taietura']);
  // Cu tăietura în extrem, trece; cu ea mutată pe curbă cu 1e-5 mm, nu.
  assert.deepEqual(coduri(c, TOL, cu([{ p: c.a, s: { tip: 'L' } }, { p: punctCubica(c, 0.5), s: { tip: 'L' } }])), []);
  assert.deepEqual(coduri(c, TOL, cu([{ p: c.a, s: { tip: 'L' } }, { p: punctCubica(c, 0.5 + 1e-5 / L), s: { tip: 'L' } }])), ['taietura']);
});

test('(n4) tăietura lipsă: S-ul aproape drept dat ca o linie (în toleranță) n-are vârf în inflexiune', () => {
  const caz = CAZURI.find((x) => x.nume === 'aproape dreaptă, S la ±0,0004');
  assert.ok(caz !== undefined);
  assert.deepEqual(coduri(caz.cub, TOL, cu([{ p: caz.cub.a, s: { tip: 'L' } }])), ['taietura']);
  const ti = inflexiuni(caz.cub);
  assert.equal(ti.length, 1);
  assert.deepEqual(coduri(caz.cub, TOL, cu([{ p: caz.cub.a, s: { tip: 'L' } }, { p: punctCubica(caz.cub, ti[0] as number), s: { tip: 'L' } }])), []);
  // Tăietura pusă alături, pe curbă, la t + 1e-7 (≈ 1e-5 mm de inflexiune): tot lipsă.
  assert.deepEqual(coduri(caz.cub, TOL, cu([{ p: caz.cub.a, s: { tip: 'L' } }, { p: punctCubica(caz.cub, (ti[0] as number) + 1e-7), s: { tip: 'L' } }])), ['taietura']);
});

test('(n4) tangenta ruptă în toleranță (un bulge schimbat cu 1e-6) e prinsă doar de tangentă', () => {
  const p: string[] = [];
  let incercate = 0;
  for (const caz of TRANSFORMATE) {
    const v = aplicatia(caz.cub, TOL).varfuri;
    const l = lant(caz.cub.a, v, caz.cub.b);
    const k = l.piese.findIndex((q, i) => i > 0 && i + 1 < l.piese.length && q.arc && (l.piese[i - 1] as typeof q).arc && (l.piese[i + 1] as typeof q).arc && q.h <= 1);
    if (k < 0) continue;
    incercate++;
    const r = cu(v.map((x, i) => (i === k && x.s.tip === 'A' ? { p: x.p, s: { tip: 'A', bulge: x.s.bulge + Math.sign(x.s.bulge) * 1e-6 } } : x)));
    const c = coduri(caz.cub, TOL, r);
    if (c.join() !== 'tangenta') p.push(`${caz.nume}: ${c.join(', ') || 'neprins'}`);
  }
  assert.ok(incercate >= 8, `prea puține cazuri: ${incercate}`);
  assert.deepEqual(p, []);
});

test('(n4) zigzagul: tangenta întoarsă (180°) departe de orice vârf al cubicei e prinsă, deși lanțul stă pe cerc', () => {
  // Sfertul κ de rază 25 (abaterea lui de la cerc e 2,7253e-4 × 25 = 6,8e-3 mm), la tol = 0,01: arc până la 45°, înapoi
  // pe același cerc până la 44,99°, apoi înainte până la 90°.
  const c = sfert(0, 0, 25, 25, 0);
  const pe = (u: number): PunctO => ({ x: 25 * Math.cos(u), y: 25 * Math.sin(u) });
  const g = Math.PI / 180;
  const zig = cu([
    { p: c.a, s: { tip: 'A', bulge: Math.tan((45 * g) / 4) } },
    { p: pe(45 * g), s: { tip: 'A', bulge: Math.tan((-0.01 * g) / 4) } },
    { p: pe(44.99 * g), s: { tip: 'A', bulge: Math.tan((45.01 * g) / 4) } },
  ]);
  assert.deepEqual(coduri(c, 0.01, zig), ['tangenta']);
  const drept = cu([{ p: c.a, s: { tip: 'A', bulge: Math.tan((45 * g) / 4) } }, { p: pe(45 * g), s: { tip: 'A', bulge: Math.tan((45 * g) / 4) } }]);
  assert.deepEqual(coduri(c, 0.01, drept), []);
});

// ---------------------------------------------------------------------------------------------------------------------
// (n5) Conturul și refuzul.

test('(n5) judecaConturul prinde: arcul păstrat schimbat, inchis întors, o linie mutată, suma greșită', () => {
  const caz = CONTURURI.find((x) => x.nume.startsWith('amestec'));
  assert.ok(caz !== undefined);
  const usa = (a: PunctO, c1: PunctO, c2: PunctO, b: PunctO, tol: number): unknown => cubicaInArce(a, c1, c2, b, tol);
  const r = conturFaraCubice(caContur(caz.contur), TOL) as unknown as { ok: true; contur: { inchis: boolean; varfuri: VarfO[] }; bucati: number };
  assert.deepEqual(judecaConturul(caz.contur, TOL, r, usa), [], 'controlul: rezultatul nealterat trece');
  const cod = (x: unknown): string[] => [...new Set(judecaConturul(caz.contur, TOL, x, usa).map((p) => p.cod))];
  const v = r.contur.varfuri;
  const arc0 = v[0] as VarfO;
  assert.ok(arc0.s.tip === 'A');
  const bulge = arc0.s.tip === 'A' ? arc0.s.bulge : 0;
  assert.deepEqual(cod({ ...r, contur: { ...r.contur, varfuri: [{ p: arc0.p, s: { tip: 'A', bulge: bulge * (1 + 1e-12) } }, ...v.slice(1)] } }), ['contur']);
  assert.deepEqual(cod({ ...r, contur: { ...r.contur, inchis: false } }), ['contur']);
  const linie = v[1] as VarfO;
  assert.deepEqual(cod({ ...r, contur: { ...r.contur, varfuri: [arc0, { p: { x: linie.p.x, y: linie.p.y + 1e-12 }, s: linie.s }, ...v.slice(2)] } }), ['contur']);
  assert.deepEqual(cod({ ...r, bucati: r.bucati + 1 }), ['numar']);
});

test('(n5) judecaConturul judecă și lanțurile cubicelor: o ușă care trunchiază (cu conturul potrivit ei) e prinsă', () => {
  const caz = CONTURURI.find((x) => x.nume.startsWith('inima'));
  assert.ok(caz !== undefined);
  const trunchiata = (a: PunctO, c1: PunctO, c2: PunctO, b: PunctO, tol: number): unknown => {
    const r = aplicatia({ a, c1, c2, b }, tol);
    return cu(r.varfuri.slice(0, Math.ceil(r.varfuri.length / 2)));
  };
  // Conturul „aplicației” făcut din lanțurile trunchiate: consecvent cu ușa, deci doar judecata lanțurilor îl poate prinde.
  const varfuri: VarfO[] = [];
  const v = caz.contur.varfuri;
  for (let i = 0; i < v.length; i++) {
    const x = v[i] as VarfO;
    if (x.s.tip !== 'C') { varfuri.push(x); continue; }
    varfuri.push(...(trunchiata(x.p, x.s.c1, x.s.c2, (v[(i + 1) % v.length] as VarfO).p, TOL) as Lant).varfuri);
  }
  const r = { ok: true, contur: { inchis: caz.contur.inchis, varfuri }, bucati: varfuri.length };
  const c = [...new Set(judecaConturul(caz.contur, TOL, r, trunchiata).map((p) => p.cod))];
  assert.ok(c.includes('abatere-curba-lant'), c.join(', '));
});

test('(n5) motivRefuz: doar ok = false cu un motiv nevid e un refuz', () => {
  assert.equal(motivRefuz({ ok: false, motiv: 'x' }), 'x');
  assert.equal(motivRefuz({ ok: false, motiv: '' }), undefined);
  assert.equal(motivRefuz({ ok: false, motiv: '   ' }), undefined);
  assert.equal(motivRefuz({ ok: false }), undefined);
  assert.equal(motivRefuz({ ok: true, motiv: 'x' }), undefined);
  assert.equal(motivRefuz(null), undefined);
});
