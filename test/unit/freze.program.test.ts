/**
 * Valorile de lucru ale frezei în program (ADR 0300 §5, felia 16.A↑b-1, documentul v27), pe hârtie:
 * - fără `regim` pe freză, programul e cel de azi, octet cu octet (originea și un tăiș mai lung nu-l schimbă);
 * - cu `regim`, turația frezei montate în antet și la fiecare schimbare, avansul pe tăiere și plonjarea pe coborâre, pe
 *   fiecare loc unde stă o freză: profilul, buzunarul (inele și linii paralele), frezele de rest, găurirea, V-carve-ul, fundul
 *   lui plat și frezele lui de rest, dopurile incrustațiilor (în V și drepte); estimarea timpului urmează avansul;
 * - același T cu două turații e refuzat, ca două diametre (ADR 0084); avansul și plonjarea pot diferi de la o operație la alta;
 * - tăișul (`tais`): o adâncime mai mare decât el e refuzată, cu freza, tăișul și adâncimea în motiv; egală trece; cu
 *   supracursa prin foaie, adâncimea e cea tăiată.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programeDopuri } from '../../src/cam/dopV.ts';
import { programeDopuriDrepte } from '../../src/cam/dopDrept.ts';
import { programDinDocument, REGIM_IMPLICIT, type RezultatJob } from '../../src/cam/job.ts';
import type { Miscare, Program } from '../../src/ir/ir.ts';
import { incarca } from '../../src/model/incarcare.ts';
import type { Document } from '../../src/model/document.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { CAZURI_INCRUSTATIE } from '../oracles/incrustatie.cazuri.ts';
import { CAZURI_DREAPTA } from '../oracles/incrustatieDreapta.cazuri.ts';
import { documentCaz, documentDrept } from './ajutor-incrustatie.ts';

type Op = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
/** Freza plată T`numar` Ø`diametru`, cu `extra` peste (valorile, tăișul, originea). */
const F = (numar: number, diametru: number, extra: Op = {}): Op => ({ numar, nume: `freza ${diametru}`, diametru, ...extra });
/** Freza în V T`numar` Ø`diametru`, cu unghiul. */
const V = (numar: number, diametru: number, unghi: number, extra: Op = {}): Op => ({ numar, nume: `V${unghi}`, diametru, forma: { tip: 'v', unghi }, ...extra });
const REGIM_A = { turatie: 24_000, avans: 2_000, plonjare: 500 };
const REGIM_B = { turatie: 16_000, avans: 800, plonjare: 250 };
const REGIM_V = { turatie: 20_000, avans: 1_500, plonjare: 400 };
const operatie = (extra: Op): Op => ({
  id: 'o', tip: 'profil', noduri: ['a'], scula: F(1, 6), latura: 'interior', sens: 'urcare', adancime: 6, pas: 3,
  urechi: null, rampa: null, intrari: null, colturi: null, ...extra,
});
type Forma = { readonly id: string; readonly forma: Op; readonly e?: number; readonly f?: number };
const DR = (id: string, latime: number, inaltime: number, e = 20, f = 20): Forma => ({ id, forma: { tip: 'dreptunghi', latime, inaltime, razaColt: 0 }, e, f });
const CERC = (id: string, raza: number, e = 50, f = 50): Forma => ({ id, forma: { tip: 'cerc', raza }, e, f });
function doc(forme: readonly Forma[], operatii: readonly Op[], grosime = 18): unknown {
  const noduri = forme.map((c) => ({ tip: 'element', id: c.id, matrice: { ...I, e: c.e ?? 0, f: c.f ?? 0 }, forma: c.forma }));
  return {
    schema: 30, rev: 0, piese: [{ id: 'p', radacina: { tip: 'grup', id: 'r', matrice: { ...I }, copii: noduri }, operatii }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
}
const deschis = (d: unknown): Document => {
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};
const job = (d: unknown, supracursa = 0, prinFoaie = false): Program => {
  const r = programDinDocument(deschis(d), REGIM_IMPLICIT, supracursa, prinFoaie);
  if (!r.ok) assert.fail(r.motiv);
  return r.program;
};
const motiv = (d: unknown, supracursa = 0, prinFoaie = false): string => {
  const r: RezultatJob = programDinDocument(deschis(d), REGIM_IMPLICIT, supracursa, prinFoaie);
  return r.ok ? '' : r.motiv;
};

/** Pe fiecare sculă montată (numărul ei): turația cu care pornește axul și avansurile mișcărilor ei de tăiere. */
function peScula(p: Program): Map<number, { turatie: number; avansuri: number[] }> {
  const rez = new Map<number, { turatie: number; avansuri: number[] }>([[p.scula.numar, { turatie: p.turatie, avansuri: [] }]]);
  let n = p.scula.numar;
  for (const m of p.miscari) {
    if (m.tip === 'schimba-scula') {
      n = m.scula.numar;
      if (!rez.has(n)) rez.set(n, { turatie: m.turatie, avansuri: [] });
      assert.equal(rez.get(n)!.turatie, m.turatie, `T${n} montată de două ori cu turații diferite`);
    } else if ('avans' in m) rez.get(n)!.avansuri.push(m.avans);
  }
  return rez;
}

/** Avansurile unei freze stau între plonjarea și avansul ei, iar avansul apare (pe hârtie: tăierea în plan, cu avansul ei). */
function cuValorile(p: Program, numar: number, r: { readonly turatie: number; readonly avans: number; readonly plonjare: number }): void {
  const s = peScula(p).get(numar);
  assert.ok(s, `T${numar} nu e montată`);
  assert.equal(s.turatie, r.turatie, `turația lui T${numar}`);
  assert.ok(s.avansuri.length > 0, `T${numar} n-are tăieri`);
  for (const a of s.avansuri) assert.ok(a >= r.plonjare - 1e-9 && a <= r.avans + 1e-9, `T${numar}: avansul ${a} nu e în [${r.plonjare}, ${r.avans}]`);
  assert.ok(s.avansuri.includes(r.avans), `T${numar}: avansul ${r.avans} lipsește`);
}

/** Coborârile pe Z (tăieri doar pe Z, în jos) și tăierile în plan, cu avansurile lor. */
function coborariSiPlan(miscari: readonly Miscare[]): { coborari: number[]; plan: number[] } {
  let z = Number.POSITIVE_INFINITY;
  const coborari: number[] = [], plan: number[] = [];
  for (const m of miscari) {
    if (m.tip === 'rapida' || m.tip === 'taiere' || m.tip === 'arc') {
      const nz = m.la.Z ?? z;
      if (m.tip === 'taiere' && m.la.X === undefined && m.la.Y === undefined && nz < z) coborari.push(m.avans);
      else if (m.tip !== 'rapida' && nz === z) plan.push(m.avans);
      z = nz;
    }
  }
  return { coborari, plan };
}

// ── Fără valori: programul de azi ───────────────────────────────────────────────────────────────

test('fără valori pe freză, programul e cel de azi; originea și un tăiș mai lung nu-l schimbă', () => {
  const azi = job(doc([DR('a', 40, 30)], [operatie({})]));
  const cuOrigine = job(doc([DR('a', 40, 30)], [operatie({ scula: F(1, 6, { biblioteca: { id: 'f1', rev: 2 }, tais: 22 }) })]));
  assert.deepEqual(cuOrigine, azi);
  assert.equal(azi.turatie, REGIM_IMPLICIT.turatie);
  const { coborari, plan } = coborariSiPlan(azi.miscari);
  assert.ok(coborari.length > 0 && coborari.every((a) => a === REGIM_IMPLICIT.avansPlonjare), coborari.join(', '));
  assert.ok(plan.length > 0 && plan.every((a) => a === REGIM_IMPLICIT.avans), plan.join(', '));
});

// ── Valorile frezei ─────────────────────────────────────────────────────────────────────────────

test('profilul cu valorile frezei: turația în antet, plonjarea pe coborâre, avansul în plan', () => {
  const p = job(doc([DR('a', 40, 30)], [operatie({ scula: F(1, 6, { regim: REGIM_A }) })]));
  assert.equal(p.turatie, 24_000);
  assert.equal(p.zSigur, REGIM_IMPLICIT.zSigur, 'Z-ul sigur rămâne al lucrării');
  const { coborari, plan } = coborariSiPlan(p.miscari);
  assert.deepEqual([...new Set(coborari)], [500]);
  assert.deepEqual([...new Set(plan)], [2_000]);
});

test('două freze, fiecare cu valorile ei: schimbarea pornește axul cu turația frezei montate', () => {
  const p = job(doc([DR('a', 20, 20, 50, 40), DR('b', 100, 80, 10, 10)], [
    operatie({ id: 'gol', noduri: ['a'], scula: F(1, 6, { regim: REGIM_A }) }),
    operatie({ id: 'ext', noduri: ['b'], latura: 'exterior', scula: F(2, 8, { regim: REGIM_B }) }),
  ]));
  assert.equal(p.scula.numar, 1);
  const schimbari = p.miscari.filter((m) => m.tip === 'schimba-scula');
  assert.deepEqual(schimbari.map((m) => [m.scula.numar, m.turatie]), [[2, 16_000]]);
  cuValorile(p, 1, REGIM_A);
  cuValorile(p, 2, REGIM_B);
});

test('aceeași freză pe două operații: avansul și plonjarea pot diferi, turația nu', () => {
  // T1 fără valori (turația lucrării, 18 000) și T1 cu valorile ei, tot la 18 000: aceeași turație, fiecare cu avansul ei.
  const R18 = { turatie: 18_000, avans: 2_400, plonjare: 600 };
  const p = job(doc([DR('a', 20, 20, 50, 40), DR('b', 100, 80, 10, 10)], [
    operatie({ id: 'gol', noduri: ['a'] }),
    operatie({ id: 'ext', noduri: ['b'], latura: 'exterior', scula: F(1, 6, { regim: R18 }) }),
  ]));
  assert.equal(p.miscari.filter((m) => m.tip === 'schimba-scula').length, 0);
  const avansuri = new Set(peScula(p).get(1)!.avansuri);
  assert.deepEqual([...avansuri].sort((x, y) => x - y), [300, 600, 1_000, 2_400]);
});

test('același T cu două turații e refuzat, ca două diametre (ADR 0300 §5, ADR 0084)', () => {
  const m = motiv(doc([DR('a', 20, 20, 50, 40), DR('b', 100, 80, 10, 10)], [
    operatie({ id: 'gol', noduri: ['a'], scula: F(1, 6, { regim: REGIM_A }) }),
    operatie({ id: 'ext', noduri: ['b'], latura: 'exterior', scula: F(1, 6, { regim: REGIM_B }) }),
  ]));
  assert.match(m, /T1 are două turații \(24000 și 16000 rot\/min\)/);
  // Una cu valori la 24 000, alta fără (deci 18 000): tot două turații.
  const m2 = motiv(doc([DR('a', 20, 20, 50, 40), DR('b', 100, 80, 10, 10)], [
    operatie({ id: 'gol', noduri: ['a'], scula: F(1, 6, { regim: REGIM_A }) }),
    operatie({ id: 'ext', noduri: ['b'], latura: 'exterior' }),
  ]));
  assert.match(m2, /T1 are două turații \(24000 și 18000 rot\/min\)/);
});

test('buzunarul și freza lui de rest, fiecare cu valorile ei', () => {
  const p = job(doc([DR('a', 80, 40)], [operatie({
    tip: 'buzunar', scula: F(1, 12, { regim: REGIM_A }), adancime: 10, pas: 5, pasLateral: 4.8,
    rest: [{ scula: F(2, 3, { regim: REGIM_B }), pasLateral: 1.2 }],
  })]));
  assert.equal(p.turatie, 24_000);
  cuValorile(p, 1, REGIM_A);
  cuValorile(p, 2, REGIM_B);
});

test('buzunarul cu liniile paralele, cu valorile frezei', () => {
  const p = job(doc([DR('a', 80, 40)], [operatie({
    tip: 'buzunar', scula: F(1, 6, { regim: REGIM_A }), adancime: 6, pas: 3, pasLateral: 2.4, strategie: { fel: 'paralel', unghi: 0 },
  })]));
  cuValorile(p, 1, REGIM_A);
});

test('găurirea, cu valorile frezei: ciocănitul cu plonjarea ei, elicea pe perete cu avansul ei', () => {
  // Cercul cât freza: doar coborâri (ADR 0087), deci doar plonjarea frezei.
  const c = job(doc([CERC('a', 3)], [operatie({ tip: 'gaurire', scula: F(1, 6, { regim: REGIM_A }), adancime: 10, pas: 3 })]));
  assert.equal(c.turatie, 24_000);
  assert.deepEqual([...new Set(peScula(c).get(1)!.avansuri)], [500]);
  // Cercul de Ø10 cu Ø6: elicea pe perete.
  const e = job(doc([CERC('a', 5)], [operatie({ tip: 'gaurire', scula: F(1, 6, { regim: REGIM_A }), adancime: 10, pas: 3 })]));
  cuValorile(e, 1, REGIM_A);
});

test('V-carve-ul cu fundul plat și freza lui de rest: fiecare freză cu valorile ei, prima montată în antet', () => {
  const p = job(doc([DR('a', 60, 40)], [operatie({
    tip: 'vcarve', scula: V(2, 6, 90, { regim: REGIM_V }), adancime: 3, pas: 1.2,
    fundPlat: { scula: F(3, 6, { regim: REGIM_A }), pasLateral: 2.4, rest: [{ scula: F(4, 2, { regim: REGIM_B }), pasLateral: 0.8 }] },
  })]));
  assert.equal(p.scula.numar, 3, 'întâi freza dreaptă (ADR 0091 §3)');
  assert.equal(p.turatie, 24_000);
  cuValorile(p, 3, REGIM_A);
  cuValorile(p, 4, REGIM_B);
  cuValorile(p, 2, REGIM_V);
});

test('estimarea timpului urmează avansul frezei; G-code-ul scrie turația și avansurile ei', async () => {
  // Mașina estimării (GRBL 1.1h din fabrică) are 500 mm/min pe axe: un avans de 250 (sub ea) dublează timpul tăierii.
  const LENT = { turatie: 24_000, avans: 250, plonjare: 100 };
  const azi = await calculeazaExport(deschis(doc([DR('a', 80, 60)], [operatie({})])), { origine: 'stanga-jos', z0: 'sus' });
  const lent = await calculeazaExport(deschis(doc([DR('a', 80, 60)], [operatie({ scula: F(1, 6, { regim: LENT }) })])), { origine: 'stanga-jos', z0: 'sus' });
  assert.ok(azi.ok && lent.ok);
  assert.ok(azi.rezumat.ok && lent.rezumat.ok);
  assert.ok(lent.rezumat.total.secunde > azi.rezumat.total.secunde * 1.5, `${lent.rezumat.total.secunde} s față de ${azi.rezumat.total.secunde} s`);
  assert.match(lent.program.text, /^M3 S24000$/m);
  assert.match(lent.program.text, / F250\.0$/m);
  assert.match(lent.program.text, /^G1 Z-3\.000 F100\.0$/m);
  assert.doesNotMatch(lent.program.text, /F1000\.0|F300\.0|S18000/);
});

// ── Tăișul ──────────────────────────────────────────────────────────────────────────────────────

test('tăișul: o adâncime peste el e refuzată, cu freza, tăișul și adâncimea; egală trece', () => {
  job(doc([DR('a', 40, 30)], [operatie({ scula: F(1, 6, { tais: 6 }) })]));
  const m = motiv(doc([DR('a', 40, 30)], [operatie({ scula: F(1, 6, { tais: 5.9 }) })]));
  assert.match(m, /^i\/a: freza T1 \(freza 6\) are tăișul de 5\.9 mm, iar tăietura coboară la 6 mm/);
});

test('tăișul, cu supracursa prin foaie: adâncimea e cea tăiată', () => {
  const d = doc([DR('a', 40, 30)], [operatie({ latura: 'exterior', adancime: 18, scula: F(1, 6, { tais: 18 }) })]);
  job(d, 1, false);
  assert.match(motiv(d, 1, true), /T1 .*tăișul de 18 mm, iar tăietura coboară la 19 mm/);
});

test('tăișul frezei de rest și al frezei fundului plat', () => {
  const mr = motiv(doc([DR('a', 80, 40)], [operatie({
    tip: 'buzunar', scula: F(1, 12), adancime: 10, pas: 5, pasLateral: 4.8, rest: [{ scula: F(2, 3, { tais: 8 }), pasLateral: 1.2 }],
  })]));
  assert.match(mr, /freza T2 \(freza 3\) are tăișul de 8 mm, iar tăietura coboară la 10 mm/);
  const mf = motiv(doc([DR('a', 60, 40)], [operatie({
    tip: 'vcarve', scula: V(2, 6, 90), adancime: 3, pas: 1.2, fundPlat: { scula: F(3, 6, { tais: 2 }), pasLateral: 2.4 },
  })]));
  assert.match(mf, /freza T3 \(freza 6\) are tăișul de 2 mm, iar tăietura coboară la 3 mm/);
});

// ── Dopurile incrustațiilor ─────────────────────────────────────────────────────────────────────

test('dopul în V: fundul cu valorile frezei drepte, pereții cu ale frezei V, iar tăișul judecat pe dop', () => {
  const c = CAZURI_INCRUSTATIE[0]!;
  const d = documentCaz(c) as { schema: number; piese: Array<{ operatii: Op[] }> };
  d.schema = 27;
  const op = d.piese[0]!.operatii[0]!;
  (op['scula'] as Op)['regim'] = REGIM_V;
  ((op['fundPlat'] as Op)['scula'] as Op)['regim'] = REGIM_A;
  const r = programeDopuri(deschis(d), REGIM_IMPLICIT);
  if (!r.ok) assert.fail(r.motiv);
  const p = r.dopuri[0]!.program;
  assert.equal(p.turatie, 24_000);
  cuValorile(p, 1, REGIM_A);
  cuValorile(p, 2, REGIM_V);
  // Tăișul frezei drepte, judecat pe fundul dopului (fața coborâtă la S + H).
  ((op['fundPlat'] as Op)['scula'] as Op)['tais'] = 0.5;
  const r2 = programeDopuri(deschis(d), REGIM_IMPLICIT);
  assert.ok(!r2.ok && /, dopul: .*freza T1 .*are tăișul de 0\.5 mm/.test(r2.motiv), r2.ok ? 'primit' : r2.motiv);
});

test('dopul drept: freza dopului cu valorile ei, iar tăișul ei judecat pe dop', () => {
  const c = CAZURI_DREAPTA[0]!;
  const d = documentDrept(c) as { schema: number; piese: Array<{ operatii: Op[] }> };
  d.schema = 27;
  const op = d.piese[0]!.operatii[0]!;
  const inc = op['incrustatie'] as Op;
  const frezeDop = (inc['frezeDop'] as Op[] | undefined) ?? [{ scula: structuredClone(op['scula']), pasLateral: op['pasLateral'] }];
  inc['frezeDop'] = frezeDop.map((f, k) => ({ ...f, scula: { ...(f['scula'] as Op), numar: 5 + k, regim: REGIM_B } }));
  const r = programeDopuriDrepte(deschis(d), REGIM_IMPLICIT);
  if (!r.ok) assert.fail(r.motiv);
  const p = r.dopuri[0]!.program;
  cuValorile(p, 5, REGIM_B);
  (inc['frezeDop'] as Op[]).forEach((f) => { (f['scula'] as Op)['tais'] = 0.5; });
  const r2 = programeDopuriDrepte(deschis(d), REGIM_IMPLICIT);
  assert.ok(!r2.ok && /freza T5 .*are tăișul de 0\.5 mm/.test(r2.motiv), r2.ok ? 'primit' : r2.motiv);
});
