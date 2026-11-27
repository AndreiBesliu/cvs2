/**
 * Canelura cu bila și cu toroidala (ADR 0303 §4, felia 16.A↑e-3): profilul pe linie primește freza bilă și pe cea toroidală.
 * Centrul frezei merge pe linie, deci drumul e al unei freze plate de același diametru, mișcare cu mișcare; doar scula din IR
 * își poartă forma (simularea și raportul o citesc de acolo). Pe hârtie, secțiunea canelurii simulate: la adâncimea d, lățimea
 * la față e 2·(a + √(ρ² − (ρ − d)²)) cât d < ρ și Ø de la d ≥ ρ (a = R − ρ; la bilă a = 0, ρ = R), iar fundul e plat pe 2·a.
 * Pe celelalte operații (pe o parte, buzunarul, găurirea, V-carve-ul) și pe frezele în plus (de rest, ale fundului plat, ale
 * dopului, a benzii), formele rotunde rămân refuzate, cu motiv; același T cu două raze ale colțului e două freze.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import { motivFormaPeOperatie } from '../../src/model/formaFrezei.ts';
import { raportFoi } from '../../src/model/raportFoi.ts';
import { campNou, compacteaza, valoare } from '../../src/sim/camp.ts';
import { ruleaza } from '../../src/sim/nucleu.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import type { Program } from '../../src/ir/ir.ts';
import type { Document, FormaSculaDoc, Latura, TipOperatie } from '../../src/model/document.ts';

type Liber = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const scula = (numar: number, diametru: number, forma?: Liber): Liber => ({ numar, nume: `freza ${numar}`, diametru, ...(forma ? { forma } : {}) });
const op = (v: Liber): Liber => ({
  id: 'o', tip: 'profil', noduri: ['e'], scula: scula(1, 6), latura: 'pe-linie', sens: 'urcare', adancime: 1, pas: 3,
  urechi: null, rampa: null, intrari: null, colturi: null, ...v,
});
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

test('motivFormaPeOperatie: bila și toroidala merg pe profilul pe linie (și, din 16.A↑e-5, în buzunar); în rest, ca până acum', () => {
  const b: FormaSculaDoc = { tip: 'bila' }, t: FormaSculaDoc = { tip: 'toroidala', raza: 1 };
  const randuri: ReadonlyArray<readonly [TipOperatie, Latura, FormaSculaDoc, string | null]> = [
    ['profil', 'pe-linie', b, null], ['profil', 'pe-linie', t, null],
    ['profil', 'exterior', b, 'bila'], ['profil', 'interior', t, 'toroidala'], ['profil', 'stanga', b, 'bila'], ['profil', 'dreapta', t, 'toroidala'],
    // Buzunarul: din 16.A↑e-5 (`buzunar.rotunda.test.ts`).
    ['buzunar', 'interior', b, null], ['buzunar', 'interior', t, null], ['gaurire', 'interior', t, 'toroidala'],
    ['vcarve', 'interior', b, 'bila'], ['vcarve', 'interior', t, 'toroidala'],
    // Relieful: finisarea cu bila rămâne; toroidala pe finisare, din 18.1↑e-1 (ADR 0319, a liniei reliefului, ADR 0303
    // răspunsul 4a); degroșarea rămâne cu plata.
    ['finisare', 'pe-linie', b, null], ['finisare', 'pe-linie', t, null], ['degrosare', 'pe-linie', t, 'toroidala'],
  ];
  for (const [tip, latura, forma, asteptat] of randuri) assert.equal(motivFormaPeOperatie(tip, latura, forma), asteptat, `${tip} ${latura} ${forma.tip}`);
});

test('canelura cu bila și cu toroidala: drumul frezei plate de același Ø, mișcare cu mișcare; scula din IR își poartă forma', () => {
  const plata = program(doc([op({ scula: scula(1, 6), adancime: 4, pas: 1.5 })]));
  for (const [nume, forma] of [['bila', B], ['toroidala r1', T(1)], ['toroidala r2,5', T(2.5)]] as const) {
    const p = program(doc([op({ scula: scula(1, 6, forma), adancime: 4, pas: 1.5 })]));
    assert.deepEqual(p.miscari, plata.miscari, `${nume}: alt drum decât al frezei plate`);
    assert.deepEqual(p.scula.forma, forma, `${nume}: forma nu ajunge în IR`);
    assert.equal(p.scula.diametru, 6);
  }
  // Pasul pe trecere rămâne al operației: 4 mm cu pasul 1,5 → trei treceri egale (4/3 mm fiecare, sub pas), ultima la −4.
  const z = plata.miscari.flatMap((m) => (m.tip === 'taiere' && m.la.Z !== undefined ? [m.la.Z] : []));
  const treceri = [...new Set(z.filter((v) => v < 0))].sort((a, b) => b - a);
  assert.equal(treceri.length, 3);
  treceri.forEach((v, k) => assert.ok(Math.abs(v + (4 * (k + 1)) / 3) < 1e-12, `trecerea ${k + 1} la ${v}`));
});

test('formele rotunde rămân refuzate pe o parte și pe frezele de rest, cu motiv (buzunarul: `buzunar.rotunda.test.ts`)', () => {
  const cazuri: ReadonlyArray<readonly [string, Liber, RegExp]> = [
    ['bila pe exterior', op({ scula: scula(1, 6, B), latura: 'exterior' }), /freza bilă \(T1, scula\)/],
    ['toroidala pe interior', op({ scula: scula(1, 6, T(1)), latura: 'interior' }), /freza toroidală \(T1, scula\)/],
    ['toroidala pe stânga', op({ scula: scula(1, 6, T(1)), latura: 'stanga' }), /freza toroidală \(T1, scula\)/],
    ['toroidala de rest', op({ tip: 'buzunar', latura: 'interior', pasLateral: 2, rest: [{ scula: scula(2, 3, T(0.5)), pasLateral: 1 }] }), /freza toroidală \(T2, rest\[0\]\)/],
    ['bila de rest', op({ tip: 'buzunar', latura: 'interior', pasLateral: 2, rest: [{ scula: scula(2, 3, B), pasLateral: 1 }] }), /freza bilă \(T2, rest\[0\]\)/],
  ];
  for (const [nume, o, re] of cazuri) assert.match(motiv(doc([o])), re, nume);
});

test('același T cu două forme rotunde diferite (alta rază a colțului, sau bila față de toroidala) e două freze: refuzat', () => {
  const linie2 = (forma: Liber): Liber => op({ id: 'o2', scula: scula(1, 6, forma), adancime: 0.5 });
  const m1 = motiv(doc([op({ scula: scula(1, 6, T(1)) }), linie2(T(2))]));
  assert.match(m1, /T1/);
  assert.match(m1, /toroidală cu raza colțului 1 mm/);
  assert.match(m1, /toroidală cu raza colțului 2 mm/);
  assert.match(motiv(doc([op({ scula: scula(1, 6, B) }), linie2(T(1))])), /T1/);
  // Aceeași toroidală, pe două caneluri: o singură freză.
  assert.equal(motiv(doc([op({ scula: scula(1, 6, T(1)) }), linie2(T(1))])), '');
});

/** Lățimea secțiunii canelurii simulate la față, la x = 50 (pe latura de jos a dreptunghiului, y = 20), și lățimea fundului. */
function sectiune(forma: Liber, adancime: number): { readonly fata: number; readonly fund: number; readonly zMin: number } {
  const p = program(doc([op({ scula: scula(1, 6, forma), adancime, pas: 10 })]));
  const s = pregatesteProgram(p, 0);
  if (!s.ok) assert.fail(s.motiv);
  const celula = 0.01, y0 = 15;
  const F = campNou({ x0: 49.5, y0, latime: 1, inaltime: 10, celula, sus: 0 });
  ruleaza(F, s.scula, s.mutari);
  compacteaza(F);
  const i = 50;
  const z: number[] = [];
  for (let j = 0; j < 1000; j++) z.push(valoare(F, i, j));
  const zMin = Math.min(...z);
  const taiate = z.filter((v) => v < -1e-9).length, fund = z.filter((v) => v <= zMin + 1e-6).length;
  // Pe bilă, fundul nu e plat: „fundul” numără doar celulele de lângă linie (folosit doar la toroidală).
  return { fata: taiate * celula, fund: fund * celula, zMin };
}

test('pe hârtie: secțiunea canelurii simulate (bila Ø6, toroidala Ø6 r1 și r2,5), la adâncimi sub și peste raza colțului', () => {
  const cazuri: ReadonlyArray<readonly [string, Liber, number, number]> = [
    ['bila Ø6 la 1', B, 1, 3],
    ['bila Ø6 la 2,5', B, 2.5, 3],
    ['bila Ø6 la 4 (peste rază)', B, 4, 3],
    ['toroidala Ø6 r1 la 0,5', T(1), 0.5, 1],
    ['toroidala Ø6 r1 la 2 (peste raza colțului)', T(1), 2, 1],
    ['toroidala Ø6 r2,5 la 1', T(2.5), 1, 2.5],
  ];
  for (const [nume, forma, d, rho] of cazuri) {
    const a = 3 - rho;
    const fata = d < rho ? 2 * (a + Math.sqrt(rho * rho - (rho - d) * (rho - d))) : 6;
    const s = sectiune(forma, d);
    // Centrul celulei e la 0,005 mm de linie: pe bilă, h(0,005) = 4·10⁻⁶ mm; pe toroidală, pe discul plat, 0.
    assert.ok(Math.abs(s.zMin + d) < 1e-5, `${nume}: fundul la ${s.zMin}, nu la −${d}`);
    // Celula de 0,01 mm: lățimea numărată pe centre, cu cel mult o celulă pe fiecare margine.
    assert.ok(Math.abs(s.fata - fata) <= 0.021, `${nume}: lățimea la față ${s.fata.toFixed(3)} ≠ ${fata.toFixed(3)} pe hârtie`);
    if (a > 0) assert.ok(Math.abs(s.fund - 2 * a) <= 0.021, `${nume}: fundul plat ${s.fund.toFixed(3)} ≠ ${(2 * a).toFixed(3)}`);
  }
});

test('raportul foilor numește freza canelurii: bila și toroidala (cu raza colțului), nu ca pe o plată de același Ø', () => {
  const scule = (forma?: Liber) => raportFoi(deschis(doc([op({ scula: scula(1, 6, forma) })])), 'taiata', (n) => `Foaia ${n}`).foi[0]!.operatii[0]!.scula;
  assert.deepEqual(scule(), { numar: 1, diametru: 6, unghi: null });
  assert.deepEqual(scule(B), { numar: 1, diametru: 6, unghi: null, bila: true });
  assert.deepEqual(scule(T(1.5)), { numar: 1, diametru: 6, unghi: null, toroidala: 1.5 });
});
