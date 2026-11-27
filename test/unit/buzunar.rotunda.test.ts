/**
 * Buzunarul cu bila și cu toroidala (ADR 0303 §4, felia 16.A↑e-5). Centrul frezei stă la R de perete și pe inelele de la
 * R + k·s, ca la freza plată de același Ø, deci drumul e al ei, mișcare cu mișcare; scula din IR își poartă forma. Pe hârtie:
 * - între două inele drepte, la s una de alta, fundul lasă la mijloc h(s / 2) = ρ − √(ρ² − ((s − 2a) / 2)²) (a = R − ρ; la
 *   bilă a = 0, ρ = R; 0 cât s ≤ 2a);
 * - nicăieri pe fund mai mult de h(s): orice punct al zonei centrului e la cel mult s de drum (ADR 0069 §3); pe colțurile
 *   inelelor unui dreptunghi, d_max = √2·s / (1 + √2);
 * - la perete, racordarea frezei: la distanța δ < R de perete, h(R − δ); dincolo de desen, nimic tăiat.
 * După o freză rotundă, frezele de rest se refuză (ADR 0303, întrebarea 5a: geometria lor e a frezei plate), la fel o
 * incrustație cu pereți drepți (pereții și fundul dopului cer freza plată).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import { motivFormaPeOperatie } from '../../src/model/formaFrezei.ts';
import { creastaBuzunar } from '../../src/model/creasta.ts';
import { creastaPePlan } from '../../src/model/finisare.ts';
import { campNou, compacteaza, valoare } from '../../src/sim/camp.ts';
import { ruleaza } from '../../src/sim/nucleu.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import type { Program } from '../../src/ir/ir.ts';
import type { Document, FormaSculaDoc, Scula } from '../../src/model/document.ts';
import { rotundaPermisa, type Rand } from '../../src/ui/exportRand.ts';
import { hartieRand } from '../../src/app/hartieExport.ts';

type Liber = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const scula = (numar: number, diametru: number, forma?: Liber): Liber => ({ numar, nume: `freza ${numar}`, diametru, ...(forma ? { forma } : {}) });
const op = (v: Liber): Liber => ({
  id: 'o', tip: 'buzunar', noduri: ['e'], scula: scula(1, 6), latura: 'interior', sens: 'urcare', adancime: 3, pas: 3, pasLateral: 2.4,
  urechi: null, rampa: null, intrari: null, colturi: null, ...v,
});
/** Dreptunghiul 60 × 40 cu colțul în (20, 20), pe o foaie de 100 × 80 × 18. */
function doc(operatii: readonly Liber[]): Liber {
  return {
    schema: 31, rev: 0,
    piese: [{
      id: 'p',
      radacina: {
        tip: 'grup', id: 'g', matrice: { ...I },
        copii: [{ tip: 'element', id: 'e', forma: { tip: 'dreptunghi', latime: 60, inaltime: 40, razaColt: 0 }, matrice: { ...I, e: 20, f: 20 } }],
      },
      operatii: [...operatii],
    }],
    foi: [{ id: 'f1', stoc: { latime: 100, inaltime: 80, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
}
const deschis = (d: Liber): Document => {
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};
function program(d: Liber): Program {
  const r = programDinDocument(deschis(d), REGIM_IMPLICIT);
  if (!r.ok) assert.fail(r.motiv);
  return r.program;
}
const motiv = (d: Liber): string => {
  const r = programDinDocument(deschis(d), REGIM_IMPLICIT);
  return r.ok ? '' : r.motiv;
};

const B: Liber = { tip: 'bila' };
const T = (raza: number): Liber => ({ tip: 'toroidala', raza });
/** Silueta pe hârtie: bila de rază R, toroidala cu discul plat a = R − ρ și raza colțului ρ. */
const hBila = (R: number) => (r: number): number => R - Math.sqrt(Math.max(0, R * R - r * r));
const hTor = (R: number, rho: number) => (r: number): number => {
  const a = R - rho;
  return r <= a ? 0 : rho - Math.sqrt(Math.max(0, rho * rho - (r - a) * (r - a)));
};

test('motivFormaPeOperatie: bila și toroidala merg în buzunar, fără freze de rest și fără incrustație cu pereți drepți', () => {
  const b: FormaSculaDoc = { tip: 'bila' }, t: FormaSculaDoc = { tip: 'toroidala', raza: 1 };
  for (const f of [b, t]) {
    assert.equal(motivFormaPeOperatie('buzunar', 'interior', f), null, f.tip);
    assert.equal(motivFormaPeOperatie('buzunar', 'interior', f, {}), null, `${f.tip}, fără nimic în plus`);
    assert.equal(motivFormaPeOperatie('buzunar', 'interior', f, { rest: [] }), null, `${f.tip}, lista de rest goală`);
    assert.equal(motivFormaPeOperatie('buzunar', 'interior', f, { rest: [{}] }), 'rotunda-rest', `${f.tip} cu rest`);
    assert.equal(motivFormaPeOperatie('buzunar', 'interior', f, { incrustatie: { fel: 'drept' } }), 'rotunda-incrustatie', `${f.tip} cu incrustație`);
    // Pe o parte (e-6), la găurire și în V-carve, ca până acum.
    assert.equal(motivFormaPeOperatie('profil', 'exterior', f), f.tip === 'bila' ? 'bila' : 'toroidala');
    assert.equal(motivFormaPeOperatie('gaurire', 'interior', f), f.tip === 'bila' ? 'bila' : 'toroidala');
    assert.equal(motivFormaPeOperatie('vcarve', 'interior', f), f.tip === 'bila' ? 'bila' : 'toroidala');
  }
  // Freza plată nu are aceste reguli.
  assert.equal(motivFormaPeOperatie('buzunar', 'interior', undefined, { rest: [{}], incrustatie: { fel: 'drept' } }), null);
});

test('buzunarul cu bila și cu toroidala: drumul frezei plate de același Ø (inelele și liniile), scula din IR își poartă forma', () => {
  for (const extra of [{}, { strategie: { fel: 'paralel', unghi: 30 } }, { adancime: 6, coborare: { fel: 'elice', unghi: 5, raza: 2 } }] as const) {
    const plata = program(doc([op({ ...extra })]));
    for (const [nume, forma] of [['bila', B], ['toroidala r1', T(1)], ['toroidala r2,5', T(2.5)]] as const) {
      const p = program(doc([op({ ...extra, scula: scula(1, 6, forma) })]));
      assert.deepEqual(p.miscari, plata.miscari, `${nume} ${JSON.stringify(extra)}: alt drum decât al frezei plate`);
      assert.deepEqual(p.scula.forma, forma, `${nume}: forma nu ajunge în IR`);
    }
  }
});

test('după o freză rotundă, frezele de rest și incrustația cu pereți drepți se refuză, cu motiv; o freză de rest rotundă, la fel', () => {
  const rest = [{ scula: scula(2, 3), pasLateral: 1.2 }];
  assert.match(motiv(doc([op({ scula: scula(1, 6, B), rest })])), /freza bilă \(T1\).*fără freze de rest/);
  assert.match(motiv(doc([op({ scula: scula(1, 6, T(1)), rest })])), /freza toroidală \(T1\).*fără freze de rest/);
  assert.match(motiv(doc([op({ scula: scula(1, 8), pasLateral: 3, rest: [{ scula: scula(2, 4, T(1)), pasLateral: 1.5 }] })])), /freza toroidală \(T2, rest\[0\]\)/);
  assert.match(motiv(doc([op({ scula: scula(1, 8), pasLateral: 3, rest: [{ scula: scula(2, 4, B), pasLateral: 1.5 }] })])), /freza bilă \(T2, rest\[0\]\)/);
  const incrustatie = { fel: 'drept', jocLateral: 0.1, dop: 'decupat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 8 };
  assert.match(motiv(doc([op({ scula: scula(1, 6, B), incrustatie })])), /incrustația cu pereți drepți.*freză plată/);
  // Fără rest și fără incrustație, buzunarul rotund trece.
  assert.equal(motiv(doc([op({ scula: scula(1, 6, B) })])), '');
  assert.equal(motiv(doc([op({ scula: scula(1, 6, T(1.5)) })])), '');
});

test('creasta pe hârtie: între inele h(s / 2), cel mult h(s); plata 0; V-ul nu e al buzunarului', () => {
  const s6 = (forma?: FormaSculaDoc): Scula => ({ numar: 1, nume: 'f', diametru: 6, ...(forma ? { forma } : {}) });
  const c = (s: Scula, pas: number): { readonly intreInele: number; readonly maxima: number } | null => creastaBuzunar(s, pas);
  // Bila Ø6, s = 2,4: 3 − √(9 − 1,44) = 0,25045; 3 − √(9 − 5,76) = 1,2.
  const b = c(s6({ tip: 'bila' }), 2.4)!;
  assert.ok(Math.abs(b.intreInele - 0.2504545830) < 1e-9 && Math.abs(b.maxima - 1.2) < 1e-12, JSON.stringify(b));
  // Toroidala Ø6 r1,5 (a = 1,5), s = 2,4: între inele 1,2 ≤ a, deci 0; cel mult 1,5 − √(2,25 − 0,81) = 0,3.
  const t = c(s6({ tip: 'toroidala', raza: 1.5 }), 2.4)!;
  assert.equal(t.intreInele, 0);
  assert.ok(Math.abs(t.maxima - 0.3) < 1e-12, JSON.stringify(t));
  // Toroidala Ø6 r1, s = 3 (a = 2): 1,5 ≤ 2 → 0; cel mult 1 − √(1 − 1) = 1 (s − a = ρ: peretele siluetei).
  assert.deepEqual(c(s6({ tip: 'toroidala', raza: 1 }), 3), { intreInele: 0, maxima: 1 });
  assert.deepEqual(c(s6(), 2.4), { intreInele: 0, maxima: 0 });
  assert.equal(c(s6({ tip: 'v', unghi: 60 }), 2.4), null);
  // Peste rază, nu e un pas lateral al buzunarului.
  assert.equal(c(s6({ tip: 'bila' }), 3.1), null);
  assert.equal(c(s6({ tip: 'bila' }), 0), null);
  // Creasta pe un plan (finisarea reliefului) are aceeași siluetă: toroidala Ø6 r1,5 la s = 4 lasă h(2) = 1,5 − √2.
  assert.ok(Math.abs(creastaPePlan(s6({ tip: 'toroidala', raza: 1.5 }), 4)! - (1.5 - Math.SQRT2)) < 1e-12);
  assert.ok(Math.abs(creastaPePlan(s6({ tip: 'bila' }), 2.4)! - b.intreInele) < 1e-15);
});

/** Câmpul simulat al buzunarului (celula dată), peste dreptunghiul [15, 85] × [15, 65]. */
function simulat(forma: Liber, celula: number): { readonly z: (x: number, y: number) => number } {
  const p = program(doc([op({ scula: scula(1, 6, forma) })]));
  const s = pregatesteProgram(p, 0);
  if (!s.ok) assert.fail(s.motiv);
  const x0 = 15, y0 = 15;
  const F = campNou({ x0, y0, latime: 70, inaltime: 50, celula, sus: 0 });
  ruleaza(F, s.scula, s.mutari);
  compacteaza(F);
  // Celula care conține punctul (centrul ei e la cel mult celula / 2 pe fiecare axă).
  return { z: (x, y) => valoare(F, Math.floor((x - x0) / celula), Math.floor((y - y0) / celula)) };
}

test('pe hârtie, pe buzunarul simulat: creasta dintre inele, racordarea de la perete, peretele netrecut, cel mai înalt punct', () => {
  const cazuri: ReadonlyArray<readonly [string, Liber, (r: number) => number]> = [
    ['bila Ø6', B, hBila(3)],
    ['toroidala Ø6 r1,5', T(1.5), hTor(3, 1.5)],
    ['toroidala Ø6 r2,5', T(2.5), hTor(3, 2.5)],
  ];
  const celula = 0.01;
  for (const [nume, forma, h] of cazuri) {
    const { z } = simulat(forma, celula);
    // Pe y = 40 (la mijlocul înălțimii), inelul k are latura stângă la x = 23 + 2,4·k. Centrul celulei e la cel mult 0,005 de
    // punctul cerut: abaterea e cel mult panta siluetei · 0,005 · √2.
    const tol = (r: number): number => 0.005 * Math.SQRT2 * (1 + Math.abs(h(r + 0.01) - h(r)) / 0.01) + 1e-6;
    // Între inelele 1 și 2 (x = 25,4 și 27,8), la mijloc: h(1,2).
    const mij = z(26.6 + celula / 2, 40 + celula / 2) + 3;
    assert.ok(Math.abs(mij - h(1.2)) <= tol(1.2), `${nume}: creasta dintre inele ${mij.toFixed(4)} ≠ ${h(1.2).toFixed(4)}`);
    // Racordarea: la 1 și la 0,5 mm de peretele din stânga (x = 20), la 2 și 2,5 de inelul de perete.
    for (const delta of [1, 0.5]) {
      const v = z(20 + delta + celula / 2, 40 + celula / 2) + 3;
      assert.ok(Math.abs(v - h(3 - delta)) <= tol(3 - delta), `${nume}: la ${delta} mm de perete ${v.toFixed(4)} ≠ ${h(3 - delta).toFixed(4)}`);
    }
    // Peretele: dincolo de desen (x < 20, y < 20, x > 80, y > 60), nimic tăiat.
    for (const [x, y] of [[19.99, 40], [50, 19.99], [80.01, 40], [50, 60.01], [19.99, 19.99]] as const) {
      assert.equal(z(x, y), 0, `${nume}: tăiat dincolo de desen, în (${x}, ${y})`);
    }
  }
});

test('pe hârtie: cel mai înalt punct al fundului (zona centrului, la ≥ R de perete) e pe colțurile inelelor, sub h(s)', () => {
  const dmax = (2.4 * Math.SQRT2) / (1 + Math.SQRT2);
  for (const [nume, forma, h] of [['bila Ø6', B, hBila(3)], ['toroidala Ø6 r1,5', T(1.5), hTor(3, 1.5)]] as const) {
    const celula = 0.05;
    const { z } = simulat(forma, celula);
    let max = -Infinity;
    for (let y = 23 + celula / 2; y < 57; y += celula) for (let x = 23 + celula / 2; x < 77; x += celula) max = Math.max(max, z(x, y) + 3);
    // Sus: h(d_max) pe hârtie (plus rotunjirea nucleului); jos: cel mai apropiat centru de celulă, la cel mult celula·√2 / 2.
    const sus = h(dmax), jos = h(dmax - (celula * Math.SQRT2) / 2);
    assert.ok(max <= sus + 1e-4, `${nume}: cel mai înalt punct ${max.toFixed(4)} peste ${sus.toFixed(4)} pe hârtie`);
    assert.ok(max >= jos - 1e-4, `${nume}: cel mai înalt punct ${max.toFixed(4)} sub ${jos.toFixed(4)}`);
    assert.ok(max <= creastaBuzunar({ numar: 1, nume: 'f', diametru: 6, forma: forma as FormaSculaDoc }, 2.4)!.maxima + 1e-9, `${nume}: peste h(s)`);
  }
});

test('fereastra exportului: regula rândului (`rotundaPermisa`) e a modelului; creasta „pe hârtie” a rândului e a lucrării', () => {
  // Doar formele rotunde: plata și V-ul au regulile lor pe rând (`vcarve`, `vPeLinie`), iar `rotundaPermisa` le lasă.
  const forme: ReadonlyArray<readonly ['bila' | 'toroidala', FormaSculaDoc]> = [['bila', { tip: 'bila' }], ['toroidala', { tip: 'toroidala', raza: 1 }]];
  const locuri = [['profil', 'pe-linie'], ['profil', 'exterior'], ['profil', 'stanga'], ['buzunar', 'interior'], ['gaurire', 'interior'], ['vcarve', 'interior']] as const;
  for (const [fel, forma] of forme) {
    for (const [tip, latura] of locuri) {
      for (const [rest, incrustatieDreapta] of [[0, false], [1, false], [0, true]] as const) {
        const randRest: Rand['rest'] = Array.from({ length: rest }, () => ({}) as Rand['rest'][number]);
        const model: boolean = motivFormaPeOperatie(tip, latura, forma, { rest: randRest, incrustatie: incrustatieDreapta ? { fel: 'drept' } : null }) === null;
        assert.equal(rotundaPermisa({ tip, latura, formaScula: fel, rest: randRest, incrustatieDreapta }), model, `${fel} ${tip} ${latura} rest=${rest} drept=${incrustatieDreapta}`);
      }
    }
  }
  for (const fel of ['plata', 'v'] as const) assert.equal(rotundaPermisa({ tip: 'buzunar', latura: 'interior', formaScula: fel, rest: [{} as Rand['rest'][number]], incrustatieDreapta: true }), true);
  const intrare = { tip: 'buzunar' as const, adancime: 3, incrustatie: 'fara' as const, pas: 3, grosime: 18, supracursa: 0, prinFoaie: false, diametruScula: 6, retragere: null, diametre: [] };
  assert.deepEqual(hartieRand({ ...intrare, forma: { tip: 'bila' }, pasLateral: 2.4 }).creasta, creastaBuzunar({ numar: 0, nume: '', diametru: 6, forma: { tip: 'bila' } }, 2.4));
  const ct = hartieRand({ ...intrare, forma: { tip: 'toroidala', raza: 1.5 }, pasLateral: 2.4 }).creasta;
  assert.ok(ct && ct.intreInele === 0 && Math.abs(ct.maxima - 0.3) < 1e-12, JSON.stringify(ct));
  // Fără formă rotundă, fără pas citit, sau cu pasul peste rază: fără creastă.
  assert.equal(hartieRand({ ...intrare, forma: null, pasLateral: 2.4 }).creasta, null);
  assert.equal(hartieRand({ ...intrare, forma: { tip: 'bila' }, pasLateral: null }).creasta, null);
  assert.equal(hartieRand({ ...intrare, forma: { tip: 'bila' }, pasLateral: 3.5 }).creasta, null);
});
