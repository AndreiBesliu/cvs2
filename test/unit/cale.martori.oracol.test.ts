/**
 * Echivalența și martorii oracolului căii (ADR 0034):
 * - (e) dreptunghiul cu colțuri rotunjite și cercul scrise ca o cale, cu aceleași vârfuri și aceleași `bulge` ca forma
 *   parametrică (`conturElement` al aplicației, în coordonatele elementului), sub aceeași matrice și aceeași instanță, dau
 *   EXACT mișcările formei parametrice (textul G-code e același, în afară de numele formei din etichetă);
 * - (n1) controlul negativ al §6: traseul aplicației împins cu 1,01 × tol (offsetul traseului însuși, spre exterior și
 *   spre interior) e prins pe IR, iar cel neîmpins trece; pe G-code, împins cu 1,01 × bugetul G-code, e prins;
 * - (n2) un G2 cu raza peste garda postului (10 000 mm) e prins;
 * - (n3) un arc cu sensul întors (G2 ↔ G3 în text; `sens` în IR) e prins de abatere;
 * - (n4) un arc scris ca segmente G1 (cum ar face postul peste gardă) e prins de numărătoare;
 * - (n5) un traseu aflat la R, dar pe latura greșită (judecat cu latura opusă), e prins de latură.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conturElement } from '../../src/model/forme.ts';
import { BUGET_GCODE, BUGET_IR, ID, judecaArcele, judecaTraseul, masoara, similitudine, traseuDinGcode, traseuDinIR, type ConturExact } from '../oracles/cale.ts';
import { CAZURI_CALE, MIC, contureleExacte, docCale, type CazCale } from '../oracles/cale.cazuri.ts';
import type { Liber } from '../oracles/document.ts';
import { exportul } from './ajutor-cale-oracol.ts';

const TOL = 0.001;
type FormaApp = Parameters<typeof conturElement>[0]['forma'];

async function textul(doc: Liber): Promise<string> {
  const e = await exportul(doc, MIC);
  assert.ok(e.ok, e.ok ? '' : `${e.unde}: ${e.motiv}`);
  return e.text;
}

for (const [nume, forma] of [
  ['dreptunghiul 60 × 30 cu colțurile de 5', { tip: 'dreptunghi', latime: 60, inaltime: 30, razaColt: 5 }],
  ['dreptunghiul 40 × 25 fără colțuri rotunjite', { tip: 'dreptunghi', latime: 40, inaltime: 25, razaColt: 0 }],
  ['cercul de rază 18', { tip: 'cerc', raza: 18 }],
] as const) {
  test(`(e) ${nume}, scris ca o cale, dă exact mișcările formei parametrice`, async () => {
    const c = conturElement({ forma: forma as unknown as FormaApp, matrice: ID });
    const cale = { tip: 'cale', inchis: true, varfuri: c.varfuri.map((v) => ({ p: { x: v.p.x, y: v.p.y }, s: { ...v.s } })) };
    for (const [m, rotire, latura] of [[ID, 0, 'exterior'], [similitudine(1.3, 25, true, 5, 3), 90, 'exterior'], [similitudine(0.8, 200, false), 45, 'interior']] as const) {
      const o = { matrice: m, instante: [{ x: 150, y: 120, rotire }], latura, diametru: 6, adancime: 6, pas: 3 } as const;
      const tp = await textul(docCale(MIC, forma as unknown as Liber, o));
      const tc = await textul(docCale(MIC, cale, o));
      const fara = (t: string): string => t.replace(/: (dreptunghi|cerc|cale), /g, ': X, ');
      const lp = fara(tp).split('\n'), lc = fara(tc).split('\n');
      const k = lp.findIndex((l, i) => l !== lc[i]);
      assert.ok(k < 0 && lp.length === lc.length, `${latura}, rotire ${rotire}: prima diferență la linia ${k + 1}: „${lp[k]}” / „${lc[k]}”`);
      assert.notEqual(tp, tc, 'eticheta numește forma');
    }
  });
}

/** Cazurile cu cubice pe care se aplică martorii. */
const MARTORI: readonly CazCale[] = ['inima, exterior, Ø6, 1 trecere', 'O, interior, Ø3,175, 2 treceri', 'lacrima, exterior, Ø3,175', 'curba lină R 12000 pe 2 400, exterior, Ø6']
  .map((n) => { const c = CAZURI_CALE.find((x) => x.nume === n); assert.ok(c !== undefined, n); return c; });

async function pregatit(caz: CazCale) {
  const e = await exportul(caz.doc, caz.stoc);
  assert.ok(e.ok, caz.nume);
  const [id, ce] = [...contureleExacte(caz.doc)][0] as [string, ConturExact];
  return { e, id, ce, R: caz.diametru / 2 };
}

for (const caz of MARTORI) {
  test(`(n1) împins cu ±1,01 × tol pe IR (și cu 1,01 × bugetul pe G-code): prins; neîmpins: trece — ${caz.nume}`, async () => {
    const { e, id, ce, R } = await pregatit(caz);
    const ir = traseuDinIR(e.miscari).plan.filter((m) => m.eticheta.startsWith(`${id}:`));
    const gc = traseuDinGcode(e.text).plan.filter((m) => m.eticheta === id);
    assert.ok(masoara(ir, ce, R, caz.latura).max <= BUGET_IR);
    for (const s of [1.01 * TOL, -1.01 * TOL]) {
      const m = masoara(ir, ce, R, caz.latura, s);
      assert.ok(m.max > BUGET_IR, `împins cu ${s / TOL} × tol: abaterea măsurată ${m.max / TOL} × tol, neprinsă`);
    }
    assert.ok(masoara(gc, ce, R, caz.latura).max <= BUGET_GCODE);
    assert.ok(masoara(gc, ce, R, caz.latura, 1.01 * BUGET_GCODE).max > BUGET_GCODE, 'G-code împins cu 1,01 × bugetul, neprins');
  });
}

/** Prima linie G2 / G3 dintr-o mișcare de tăiere din plan (după prima plonjare). */
function primulArc(linii: string[]): number {
  const k0 = linii.findIndex((l) => /^G1 Z-/.test(l));
  return linii.findIndex((l, i) => i > k0 && /^G[23] X/.test(l));
}

test('(n2) un G2 / G3 cu raza peste garda postului e prins (aceleași capete, centrul pe mediatoare la 20 000 mm)', async () => {
  for (const caz of MARTORI) {
    const { e } = await pregatit(caz);
    const linii = e.text.split('\n');
    const k = primulArc(linii);
    const gc = traseuDinGcode(e.text);
    const m = gc.plan.find((x) => x.sursa === `linia ${k + 1}`);
    assert.ok(m !== undefined && m.arc !== null, `${caz.nume}: arcul de pe linia ${k + 1}`);
    // Centrul nou: pe mediatoarea coardei, la raza 20 000, de aceeași parte ca vechiul centru.
    const mx = (m.a.x + m.b.x) / 2, my = (m.a.y + m.b.y) / 2, h = Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y) / 2;
    let nx = -(m.b.y - m.a.y) / (2 * h), ny = (m.b.x - m.a.x) / (2 * h);
    if ((m.arc.c.x - mx) * nx + (m.arc.c.y - my) * ny < 0) { nx = -nx; ny = -ny; }
    const k2 = Math.sqrt(20000 * 20000 - h * h);
    const I = mx + k2 * nx - m.a.x, J = my + k2 * ny - m.a.y;
    linii[k] = (linii[k] as string).replace(/I-?[0-9.]+ J-?[0-9.]+/, `I${I.toFixed(3)} J${J.toFixed(3)}`);
    const p = judecaArcele(traseuDinIR(e.miscari), traseuDinGcode(linii.join('\n')));
    assert.ok(p.some((x) => x.includes('garda')), `${caz.nume}: ${p.join('; ') || 'neprins'}`);
  }
});

test('(n3) un arc cu sensul întors e prins de abatere (G2 ↔ G3 în text, `sens` în IR)', async () => {
  for (const caz of MARTORI) {
    const { e, id, ce, R } = await pregatit(caz);
    const linii = e.text.split('\n');
    const k = primulArc(linii);
    linii[k] = (linii[k] as string).replace(/^G([23])/, (_x, g: string) => (g === '2' ? 'G3' : 'G2'));
    const jg = judecaTraseul(traseuDinGcode(linii.join('\n')), ce, R, caz.latura, BUGET_GCODE);
    assert.ok(jg.probleme.some((x) => x.startsWith('abaterea')), `${caz.nume}, G-code: neprins`);
    const k3 = e.miscari.findIndex((m) => (m as { tip: string }).tip === 'arc' && ((m as { la: { Z?: number } }).la.Z === undefined));
    const miscari = e.miscari.map((m, i) => (i === k3 ? { ...(m as object), sens: (m as { sens: string }).sens === 'orar' ? 'trigonometric' : 'orar' } : m));
    const ji = judecaTraseul({ ...traseuDinIR(miscari), plan: traseuDinIR(miscari).plan.filter((m) => m.eticheta.startsWith(`${id}:`)) }, ce, R, caz.latura, BUGET_IR);
    assert.ok(ji.probleme.some((x) => x.startsWith('abaterea')), `${caz.nume}, IR: neprins`);
  }
});

test('(n5) traseul de pe latura greșită (la R, dar înăuntru pentru un exterior și invers) e prins de latură', async () => {
  for (const caz of MARTORI) {
    const { e, id, ce, R } = await pregatit(caz);
    const plan = traseuDinIR(e.miscari).plan.filter((m) => m.eticheta.startsWith(`${id}:`));
    const alta = caz.latura === 'exterior' ? 'interior' : 'exterior';
    const m = masoara(plan, ce, R, alta);
    assert.ok(m.laturaGresita.length > 0, `${caz.nume}: judecat ca ${alta}, latura nu e prinsă`);
    assert.equal(masoara(plan, ce, R, caz.latura).laturaGresita.length, 0, `${caz.nume}: controlul`);
  }
});

test('(n4) un arc scris ca 8 segmente G1 e prins de numărătoare (postul n-are voie să aproximeze aici)', async () => {
  for (const caz of MARTORI) {
    const { e } = await pregatit(caz);
    const linii = e.text.split('\n');
    const k = primulArc(linii);
    const m = traseuDinGcode(e.text).plan.find((x) => x.sursa === `linia ${k + 1}`);
    assert.ok(m !== undefined && m.arc !== null);
    const arc = m.arc;
    const segmente = Array.from({ length: 8 }, (_x, i) => {
      const u = arc.u0 + (arc.du * (i + 1)) / 8;
      const x = i === 7 ? m.b.x : arc.c.x + arc.r * Math.cos(u), y = i === 7 ? m.b.y : arc.c.y + arc.r * Math.sin(u);
      return `G1 X${x.toFixed(3)} Y${y.toFixed(3)}`;
    });
    linii.splice(k, 1, ...segmente);
    const p = judecaArcele(traseuDinIR(e.miscari), traseuDinGcode(linii.join('\n')));
    assert.ok(p.some((x) => x.includes('scris ca segmente')), `${caz.nume}: ${p.join('; ') || 'neprins'}`);
    assert.deepEqual(judecaArcele(traseuDinIR(e.miscari), traseuDinGcode(e.text)), [], 'controlul: textul nealterat trece');
  }
});
