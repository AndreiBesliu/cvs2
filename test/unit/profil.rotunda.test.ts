/**
 * Profilul pe o parte cu bila și cu toroidala (ADR 0303 §4, felia 16.A↑e-6; întrebarea 2a): permis cu adâncimea cel puțin raza
 * colțului ρ (la bilă, ρ = R). Centrul frezei stă la R de desen, ca la freza plată de același Ø: drumul e al ei, mișcare cu
 * mișcare, și cu urechile, rampa, intrările și degajările. Pe hârtie, secțiunea peretelui simulat: la distanța δ de desen, spre
 * deșeu, adâncimea e d − h(|R − δ|) (h = silueta frezei); pe desen (δ = 0), d − ρ: peretele e vertical de la față până la d − ρ,
 * iar la fund rămâne racordarea de rază ρ; dincolo de desen, în piesă, nimic tăiat. Sub adâncimea ρ, refuzul cu motiv: peretele
 * n-ar ajunge la desen. Prin foaie, cu supracursa sub ρ, racordarea rămâne pe muchia de jos a piesei, spusă în fișă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import { motivFormaPeOperatie } from '../../src/model/formaFrezei.ts';
import { inaltimeFreza, peretePeOParte } from '../../src/model/creasta.ts';
import { campNou, compacteaza, valoare } from '../../src/sim/camp.ts';
import { ruleaza } from '../../src/sim/nucleu.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { rotundaPermisa, type Rand } from '../../src/ui/exportRand.ts';
import { hartieRand } from '../../src/app/hartieExport.ts';
import type { Program } from '../../src/ir/ir.ts';
import type { Document, FormaSculaDoc, Latura, Scula, TipOperatie } from '../../src/model/document.ts';

type Liber = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const scula = (numar: number, diametru: number, forma?: Liber): Liber => ({ numar, nume: `freza ${numar}`, diametru, ...(forma ? { forma } : {}) });
const op = (v: Liber): Liber => ({
  id: 'o', tip: 'profil', noduri: ['e'], scula: scula(1, 6), latura: 'exterior', sens: 'urcare', adancime: 4, pas: 1.5,
  urechi: null, rampa: null, intrari: null, colturi: null, ...v,
});
const DREPTUNGHI: Liber = { tip: 'dreptunghi', latime: 60, inaltime: 40, razaColt: 0 };
/** O cale deschisă în L (pe stânga / dreapta): de la (0, 0) la (40, 0), apoi la (40, 30), în coordonatele elementului. */
const CALE: Liber = {
  tip: 'cale', inchis: false,
  varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 40, y: 0 }, s: { tip: 'L' } }, { p: { x: 40, y: 30 }, s: { tip: 'L' } }],
};
function doc(operatii: readonly Liber[], forma: Liber = DREPTUNGHI): Liber {
  return {
    schema: 31, rev: 0,
    piese: [{
      id: 'p',
      radacina: {
        tip: 'grup', id: 'g', matrice: { ...I },
        copii: [{ tip: 'element', id: 'e', forma, matrice: { ...I, e: 20, f: 20 } }],
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

test('motivFormaPeOperatie: pe o parte, bila și toroidala merg cu adâncimea cel puțin raza colțului (bila: Ø / 2)', () => {
  const b: FormaSculaDoc = { tip: 'bila' }, t1: FormaSculaDoc = { tip: 'toroidala', raza: 1 }, t25: FormaSculaDoc = { tip: 'toroidala', raza: 2.5 };
  const randuri: ReadonlyArray<readonly [TipOperatie, Latura, FormaSculaDoc, number | undefined, number | undefined, string | null]> = [
    // Bila Ø6: ρ = 3.
    ['profil', 'exterior', b, 3, 6, null], ['profil', 'exterior', b, 4, 6, null], ['profil', 'interior', b, 2.99, 6, 'rotunda-adancime'],
    ['profil', 'stanga', b, 18, 6, null], ['profil', 'dreapta', b, 0.5, 6, 'rotunda-adancime'],
    // Bila Ø3,175: ρ = 1,5875.
    ['profil', 'exterior', b, 1.6, 3.175, null], ['profil', 'exterior', b, 1.5, 3.175, 'rotunda-adancime'],
    // Fără adâncime sau, la bilă, fără diametru: nu se poate judeca, deci refuzat.
    ['profil', 'exterior', b, undefined, 6, 'rotunda-adancime'], ['profil', 'exterior', b, 5, undefined, 'rotunda-adancime'],
    ['profil', 'interior', t1, undefined, 6, 'rotunda-adancime'],
    // Toroidala: ρ e raza colțului, oricare ar fi diametrul.
    ['profil', 'interior', t1, 1, 6, null], ['profil', 'interior', t1, 0.99, 6, 'rotunda-adancime'], ['profil', 'stanga', t1, 1, undefined, null],
    ['profil', 'exterior', t25, 2.5, 6, null], ['profil', 'exterior', t25, 2, 6, 'rotunda-adancime'],
    // Pe linie, oricât de puțin adânc (canelura); în buzunar, ca în e-5; găurirea și V-carve-ul, refuzate ca până acum.
    ['profil', 'pe-linie', b, 0.2, 6, null], ['profil', 'pe-linie', t25, 0.2, 6, null], ['buzunar', 'interior', b, 0.5, 6, null],
    ['gaurire', 'interior', t1, 5, 6, 'toroidala'], ['vcarve', 'interior', b, 5, 6, 'bila'],
  ];
  for (const [tip, latura, forma, adancime, diametru, asteptat] of randuri) {
    assert.equal(motivFormaPeOperatie(tip, latura, forma, adancime === undefined ? {} : { adancime }, diametru), asteptat, `${tip} ${latura} ${forma.tip} d=${adancime} Ø${diametru}`);
  }
  // Freza plată și cea în V, neschimbate (adâncimea nu contează).
  assert.equal(motivFormaPeOperatie('profil', 'exterior', undefined, { adancime: 0.1 }, 6), null);
  assert.equal(motivFormaPeOperatie('profil', 'exterior', { tip: 'v', unghi: 60 }, { adancime: 10 }, 6), 'v-pe-linie');
});

test('pe o parte, drumul e al frezei plate de același Ø, mișcare cu mișcare (și cu urechile, rampa, intrările, degajările)', () => {
  const variante: ReadonlyArray<readonly [string, Liber, Liber]> = [
    ['exterior', { latura: 'exterior' }, DREPTUNGHI],
    ['interior', { latura: 'interior' }, DREPTUNGHI],
    // Urechile se socotesc de la fundul plăcii (ADR 0028): tăietura merge cât foaia (18 mm), deci adâncimea e a ei.
    ['exterior cu urechi', { latura: 'exterior', urechi: { numar: 4, latime: 8, grosime: 1.5 }, adancime: 18, pas: 6 }, DREPTUNGHI],
    ['exterior cu rampă', { latura: 'exterior', rampa: { lungime: 10 } }, DREPTUNGHI],
    ['exterior cu intrări', { latura: 'exterior', intrari: { raza: 3 } }, DREPTUNGHI],
    ['interior cu degajări', { latura: 'interior', colturi: { tip: 'dog-bone' } }, DREPTUNGHI],
    ['pe stânga', { latura: 'stanga' }, CALE],
    ['pe dreapta', { latura: 'dreapta' }, CALE],
  ];
  for (const [nume, v, forma] of variante) {
    const plata = program(doc([op({ ...v, scula: scula(1, 6) })], forma));
    for (const [fel, f, d] of [['bila', B, 4], ['toroidala r1', T(1), 2], ['toroidala r2,5', T(2.5), 4]] as const) {
      const ad = v['adancime'] ?? d;
      const pf = program(doc([op({ ...v, scula: scula(1, 6), adancime: ad })], forma));
      const p = program(doc([op({ ...v, scula: scula(1, 6, f), adancime: ad })], forma));
      assert.deepEqual(p.miscari, pf.miscari, `${nume}, ${fel}: alt drum decât al frezei plate`);
      assert.deepEqual(p.scula.forma, f, `${nume}, ${fel}: forma nu ajunge în IR`);
    }
    assert.ok(plata.miscari.length > 0, nume);
  }
});

test('pe o parte, sub adâncimea ρ: refuzul spune freza, raza colțului și adâncimea; frezele în plus rămân plate', () => {
  const cazuri: ReadonlyArray<readonly [string, Liber, readonly RegExp[]]> = [
    ['bila Ø6 la 2', op({ scula: scula(1, 6, B), adancime: 2 }), [/freza bilă \(T1\)/, /raza colțului/, /3 mm/, /2 mm/]],
    ['toroidala r2 la 1,5 pe interior', op({ scula: scula(1, 6, T(2)), latura: 'interior', adancime: 1.5 }), [/freza toroidală \(T1\)/, /2 mm/, /1\.5 mm/]],
    ['toroidala r1 la 0,5 pe stânga', op({ scula: scula(1, 6, T(1)), latura: 'stanga', adancime: 0.5 }), [/toroidală/, /1 mm/]],
  ];
  for (const [nume, o, re] of cazuri) {
    const m = motiv(doc([o], o['latura'] === 'stanga' ? CALE : DREPTUNGHI));
    for (const r of re) assert.match(m, r, `${nume}: ${m}`);
  }
  // Fix la ρ: merge (peretele vertical are 0 mm; tot peretele e racordarea).
  assert.equal(motiv(doc([op({ scula: scula(1, 6, B), adancime: 3, pas: 3 })])), '');
  assert.equal(motiv(doc([op({ scula: scula(1, 6, T(1)), latura: 'interior', adancime: 1, pas: 1 })])), '');
  // Găurirea și V-carve-ul cu o freză rotundă, refuzate ca până acum.
  assert.match(motiv(doc([op({ tip: 'gaurire', latura: 'interior', scula: scula(1, 6, T(1)) })], { tip: 'cerc', raza: 4 })), /toroidală/);
});

/**
 * Secțiunea peretelui simulat la x = 50, pe latura de jos a dreptunghiului (desenul la y = 20; piesa deasupra pe exterior,
 * deșeul deasupra pe interior), pe o fâșie de la y = 12 la y = 28, cu celula de 0,01 mm: Z-ul fiecărei celule.
 */
function sectiune(latura: 'exterior' | 'interior', forma: Liber, adancime: number): { readonly y: number[]; readonly z: number[] } {
  const p = program(doc([op({ scula: scula(1, 6, forma), latura, adancime, pas: 20 })]));
  const s = pregatesteProgram(p, 0);
  if (!s.ok) assert.fail(s.motiv);
  const celula = 0.01, y0 = 12;
  const F = campNou({ x0: 49.5, y0, latime: 1, inaltime: 16, celula, sus: 0 });
  ruleaza(F, s.scula, s.mutari);
  compacteaza(F);
  const y: number[] = [], z: number[] = [];
  for (let j = 0; j < 1600; j++) {
    y.push(y0 + (j + 0.5) * celula);
    z.push(valoare(F, 50, j));
  }
  return { y, z };
}

test('pe hârtie: peretele simulat (bila Ø6, toroidala Ø6 r1 și r2,5), vertical până la d − ρ, cu racordarea de rază ρ la fund', () => {
  const cazuri: ReadonlyArray<readonly [string, 'exterior' | 'interior', Liber, number, number]> = [
    ['bila Ø6 la 4, pe exterior', 'exterior', B, 4, 3],
    ['bila Ø6 la 3 (fix la ρ), pe exterior', 'exterior', B, 3, 3],
    ['bila Ø6 la 5, pe interior', 'interior', B, 5, 3],
    ['toroidala Ø6 r1 la 2, pe exterior', 'exterior', T(1), 2, 1],
    ['toroidala Ø6 r1 la 1 (fix la ρ), pe interior', 'interior', T(1), 1, 1],
    ['toroidala Ø6 r2,5 la 3,5, pe exterior', 'exterior', T(2.5), 3.5, 2.5],
  ];
  for (const [nume, latura, forma, d, rho] of cazuri) {
    const s: Scula = { numar: 1, nume: 'f', diametru: 6, forma: forma as FormaSculaDoc };
    // Pe exterior piesa e deasupra liniei (y > 20), iar centrul frezei la y = 17; pe interior, invers (centrul la 23).
    const yc = latura === 'exterior' ? 17 : 23;
    const inPiesa = (y: number): boolean => (latura === 'exterior' ? y > 20 : y < 20);
    const { y, z } = sectiune(latura, forma, d);
    let pePerete = 0;
    for (let j = 0; j < y.length; j++) {
      const yj = y[j]!, zj = z[j]!;
      if (inPiesa(yj)) {
        assert.ok(zj >= -1e-6, `${nume}: tăiat în piesă la y = ${yj.toFixed(3)} (z = ${zj})`);
        continue;
      }
      const r = Math.abs(yj - yc);
      const asteptat = r <= 3 ? Math.min(0, -(d - inaltimeFreza(s, r))) : 0;
      assert.ok(Math.abs(zj - asteptat) <= 1e-4, `${nume}: la y = ${yj.toFixed(3)}, z = ${zj.toFixed(5)} ≠ ${asteptat.toFixed(5)} pe hârtie`);
      // Între desen și centrul frezei, peretele e vertical până la d − ρ: fiecare celulă e tăiată cel puțin atât.
      if (Math.abs(yj - 20) < 3) {
        assert.ok(zj <= -(d - rho) + 1e-4, `${nume}: la y = ${yj.toFixed(3)}, z = ${zj.toFixed(5)} deasupra lui −${d - rho}`);
        pePerete++;
      }
    }
    assert.ok(pePerete >= 290, `${nume}: ${pePerete} celule între desen și centru`);
  }
});

test('peretele pe hârtie (`peretePeOParte`): verticalul d − ρ, racordarea ρ și marginea de jos prin foaie', () => {
  const s6 = (forma?: FormaSculaDoc): Scula => ({ numar: 1, nume: 'f', diametru: 6, ...(forma ? { forma } : {}) });
  assert.deepEqual(peretePeOParte(s6({ tip: 'bila' }), 4, 18), { vertical: 1, raza: 3, margineJos: 0 });
  assert.deepEqual(peretePeOParte(s6({ tip: 'bila' }), 3, 18), { vertical: 0, raza: 3, margineJos: 0 });
  assert.deepEqual(peretePeOParte(s6({ tip: 'toroidala', raza: 1 }), 2, undefined), { vertical: 1, raza: 1, margineJos: 0 });
  // Prin foaie (18 mm), cu supracursa 0,5 și raza colțului 1: racordarea lasă 0,5 mm pe muchia de jos a piesei.
  assert.deepEqual(peretePeOParte(s6({ tip: 'toroidala', raza: 1 }), 18.5, 18), { vertical: 17.5, raza: 1, margineJos: 0.5 });
  // Cu supracursa cât ρ, muchia e dreaptă până jos; fără supracursă, toată racordarea rămâne pe piesă.
  assert.deepEqual(peretePeOParte(s6({ tip: 'toroidala', raza: 1 }), 19, 18), { vertical: 18, raza: 1, margineJos: 0 });
  assert.deepEqual(peretePeOParte(s6({ tip: 'bila' }), 18, 18), { vertical: 15, raza: 3, margineJos: 3 });
  // Sub ρ (refuzat de lucrare), plata și V-ul: nimic de spus.
  assert.equal(peretePeOParte(s6({ tip: 'bila' }), 2.9, 18), null);
  assert.equal(peretePeOParte(s6(), 4, 18), null);
  assert.equal(peretePeOParte(s6({ tip: 'v', unghi: 60 }), 4, 18), null);
});

test('fereastra exportului: regula rândului pe o parte e a modelului; peretele „pe hârtie” al rândului e al lucrării', () => {
  const forme: ReadonlyArray<readonly ['bila' | 'toroidala', FormaSculaDoc, string]> = [['bila', { tip: 'bila' }, '1'], ['toroidala', { tip: 'toroidala', raza: 1.5 }, '1,5']];
  const locuri = [['profil', 'pe-linie'], ['profil', 'exterior'], ['profil', 'interior'], ['profil', 'stanga'], ['profil', 'dreapta'], ['buzunar', 'interior'], ['gaurire', 'interior'], ['vcarve', 'interior']] as const;
  for (const [fel, forma, razaColt] of forme) {
    for (const [tip, latura] of locuri) {
      for (const [adancime, text] of [[0.5, '0,5'], [1.5, '1,5'], [2.99, '2,99'], [3, '3'], [4, '4']] as const) {
        const model = motivFormaPeOperatie(tip, latura, forma, { adancime }, 6) === null;
        const ui = rotundaPermisa({ tip, latura, formaScula: fel, rest: [], incrustatieDreapta: false, adancime: text, diametruScula: '6', razaColt });
        assert.equal(ui, model, `${fel} ${tip} ${latura} d=${adancime}`);
      }
    }
  }
  // Un text de necitit (adâncimea, diametrul, raza) nu e judecat aici: își are greșeala lui pe câmp.
  const rand = { tip: 'profil', latura: 'exterior', formaScula: 'bila', rest: [] as Rand['rest'], incrustatieDreapta: false, adancime: '4', diametruScula: '6', razaColt: '1' } as const;
  assert.equal(rotundaPermisa({ ...rand, adancime: 'x' }), true);
  assert.equal(rotundaPermisa({ ...rand, diametruScula: '' }), true);
  assert.equal(rotundaPermisa({ ...rand, formaScula: 'toroidala', razaColt: '?' }), true);
  // Peretele pe hârtie al rândului: adâncimea tăiată (cu supracursa prin foaie), ca `peretePeOParte`.
  const intrare = { tip: 'profil' as const, adancime: 18, incrustatie: 'fara' as const, pas: 6, grosime: 18, supracursa: 0.5, prinFoaie: true, diametruScula: 6, retragere: null, diametre: [] };
  const s = (forma: FormaSculaDoc): Scula => ({ numar: 0, nume: '', diametru: 6, forma });
  assert.deepEqual(hartieRand({ ...intrare, forma: { tip: 'toroidala', raza: 1 }, peOParte: true }).perete, peretePeOParte(s({ tip: 'toroidala', raza: 1 }), 18.5, 18));
  assert.deepEqual(hartieRand({ ...intrare, forma: { tip: 'bila' }, peOParte: true, supracursa: 0, prinFoaie: false }).perete, peretePeOParte(s({ tip: 'bila' }), 18, 18));
  // Pe linie, cu freza plată, fără formă citită: fără perete.
  assert.equal(hartieRand({ ...intrare, forma: { tip: 'bila' }, peOParte: false }).perete ?? null, null);
  assert.equal(hartieRand({ ...intrare, forma: null, peOParte: true }).perete ?? null, null);
  assert.equal(hartieRand({ ...intrare, forma: undefined, peOParte: true }).perete ?? null, null);
});
