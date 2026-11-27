/**
 * Marginea profilată (ADR 0304 §3, §4, felia 16.A↑f-4): profilul desenat pe o parte (exterior, interior, stânga, dreapta).
 * Desenul e conturul piesei la baza profilului: centrul frezei stă la r(0) de desen, spre deșeu (r(0) = raza fundului plat al
 * siluetei), deci drumul e al unei freze plate de diametru 2·r(0), mișcare cu mișcare (și cu rampa). Pe hârtie, secțiunea
 * marginii: la distanța ρ de centrul frezei, adâncimea e d − h(ρ), dar nu sub fața plăcii; la fund (adâncimea d) peretele cade
 * pe desen, iar la față muchia se retrage cu r(d) − r(0). Adâncimea e cel mult înălțimea profilului (peste ea, cilindrul frezei
 * ar tăia o treaptă în piesă); un profil fără fund plat, urechile, degajările, intrările și despărțirea foii se refuză, cu motiv.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incarca } from '../../src/model/incarcare.ts';
import { programDinDocument, REGIM_IMPLICIT } from '../../src/cam/job.ts';
import { motivFormaPeOperatie } from '../../src/model/formaFrezei.ts';
import { fundProfil, inaltimeProfil, retragereMuchie } from '../../src/model/profilMargine.ts';
import { campNou, compacteaza, valoare } from '../../src/sim/camp.ts';
import { ruleaza } from '../../src/sim/nucleu.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import type { Program } from '../../src/ir/ir.ts';
import type { Document, FormaSculaDoc, Latura } from '../../src/model/document.ts';

type Liber = Record<string, unknown>;
type Pct = readonly [number, number];
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const scula = (numar: number, diametru: number, forma?: Liber): Liber => ({ numar, nume: `freza ${numar}`, diametru, ...(forma ? { forma } : {}) });
const op = (v: Liber): Liber => ({
  id: 'o', tip: 'profil', noduri: ['e'], scula: scula(1, 8), latura: 'exterior', sens: 'urcare', adancime: 1, pas: 3,
  urechi: null, rampa: null, intrari: null, colturi: null, ...v,
});
function doc(operatii: readonly Liber[], forma: Liber = { tip: 'dreptunghi', latime: 60, inaltime: 40, razaColt: 0 }): Liber {
  return {
    schema: 32, rev: 0,
    piese: [{
      id: 'p',
      radacina: { tip: 'grup', id: 'g', matrice: { ...I }, copii: [{ tip: 'element', id: 'e', forma, matrice: { ...I, e: 20, f: 20 } }] },
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

/** Pe Ø8 (R = 4): o rotunjire cu fundul plat până la 1,5, un S cu fundul până la 1, trepte cu fundul până la 1. */
const RUND: readonly Pct[] = [[0, 0], [1.5, 0], [2.2, 0.3], [3, 0.9], [3.6, 1.8], [4, 3]];
const S_URI: readonly Pct[] = [[0, 0], [1, 0], [2, 0.4], [2.5, 1.2], [3, 2.6], [3.5, 3], [4, 3.1]];
const TREPTE: readonly Pct[] = [[0, 0], [1, 0], [1.2, 1], [2.5, 1], [2.7, 2], [4, 2]];
const FARA_FUND: readonly Pct[] = [[0, 0], [4, 2]];
const P = (puncte: readonly Pct[]): Liber => ({ tip: 'profil', puncte: puncte.map(([r, h]) => [r, h]) });
const Pd = (puncte: readonly Pct[]): FormaSculaDoc => ({ tip: 'profil', puncte: puncte.map(([r, h]) => [r, h]) });

/** h(x) pe hârtie: interpolarea liniară a siluetei, la distanța x de axă (x ≤ R). */
function h(puncte: readonly Pct[], x: number): number {
  for (let k = 0; k + 1 < puncte.length; k++) {
    const [r0, h0] = puncte[k]!, [r1, h1] = puncte[k + 1]!;
    if (x <= r1) return h0 + ((h1 - h0) * (x - r0)) / (r1 - r0);
  }
  return puncte[puncte.length - 1]![1];
}

test('pe hârtie: fundul plat, înălțimea și retragerea muchiei de sus', () => {
  assert.equal(fundProfil(RUND), 1.5);
  assert.equal(fundProfil(S_URI), 1);
  assert.equal(fundProfil(FARA_FUND), 0);
  assert.equal(inaltimeProfil(RUND), 3);
  // Rotunjirea la 0,9: muchia de sus la r = 3 (h(3) = 0,9), deci retrasă cu 3 − 1,5 = 1,5.
  assert.ok(Math.abs(retragereMuchie(RUND, 0.9) - 1.5) < 1e-12);
  // La 1,2 pe rotunjire: între (3, 0,9) și (3,6, 1,8), r = 3 + 0,6·(0,3 / 0,9) = 3,2.
  assert.ok(Math.abs(retragereMuchie(RUND, 1.2) - (3.2 - 1.5)) < 1e-12);
  // Treptele, la 1: muchia la începutul palierului de 1 (r = 1,2), deci retrasă cu 0,2.
  assert.ok(Math.abs(retragereMuchie(TREPTE, 1) - 0.2) < 1e-12);
});

test('motivFormaPeOperatie: profilul pe o parte, cu adâncimea cel mult înălțimea lui și cu fund plat; pe linie, ca în f-2', () => {
  for (const latura of ['exterior', 'interior', 'stanga', 'dreapta'] as readonly Latura[]) {
    assert.equal(motivFormaPeOperatie('profil', latura, Pd(RUND), { adancime: 2 }, 8), null, latura);
    assert.equal(motivFormaPeOperatie('profil', latura, Pd(RUND), { adancime: 3 }, 8), null, `${latura} la înălțimea profilului`);
    assert.equal(motivFormaPeOperatie('profil', latura, Pd(RUND), { adancime: 3.01 }, 8), 'profil-adancime', `${latura} peste`);
    assert.equal(motivFormaPeOperatie('profil', latura, Pd(RUND), {}, 8), 'profil-adancime', `${latura} fără adâncime`);
    assert.equal(motivFormaPeOperatie('profil', latura, Pd(FARA_FUND), { adancime: 1 }, 8), 'profil-fund', `${latura} fără fund plat`);
  }
  assert.equal(motivFormaPeOperatie('profil', 'pe-linie', Pd(RUND), { adancime: 10 }, 8), null);
  assert.equal(motivFormaPeOperatie('buzunar', 'interior', Pd(RUND), { adancime: 1 }, 8), 'profil');
});

test('drumul: al frezei plate de diametru 2·r(0), mișcare cu mișcare, pe exterior, interior și cu rampa; scula din IR își poartă silueta', () => {
  const variante: ReadonlyArray<readonly [string, Liber]> = [
    ['exterior', { latura: 'exterior', adancime: 2, pas: 1 }],
    ['interior', { latura: 'interior', adancime: 2, pas: 1 }],
    ['exterior cu rampa', { latura: 'exterior', adancime: 2, pas: 1, rampa: { lungime: 10 } }],
    ['interior, în opoziție', { latura: 'interior', sens: 'opozitie', adancime: 1.5, pas: 3 }],
  ];
  for (const [numeP, puncte] of [['rotunjirea', RUND], ['S-ul', S_URI], ['treptele', TREPTE]] as const) {
    const r0 = fundProfil(puncte);
    for (const [nume, v] of variante) {
      const plata = program(doc([op({ scula: scula(1, 2 * r0), ...v })]));
      const p = program(doc([op({ scula: scula(1, 8, P(puncte)), ...v })]));
      assert.deepEqual(p.miscari, plata.miscari, `${numeP}, ${nume}: alt drum decât al frezei plate Ø${2 * r0}`);
      assert.deepEqual(p.scula.forma, { tip: 'profil', puncte: puncte.map(([r, hh]) => [r, hh]) });
      assert.equal(p.scula.diametru, 8);
    }
  }
  // Pe o cale deschisă, stânga și dreapta: tot drumul frezei plate de 2·r(0).
  const L = { tip: 'L' };
  const linie = { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: L }, { p: { x: 60, y: 0 }, s: L }, { p: { x: 60, y: 30 }, s: L }] };
  for (const latura of ['stanga', 'dreapta']) {
    const plata = program(doc([op({ scula: scula(1, 3), latura, adancime: 1 })], linie));
    const p = program(doc([op({ scula: scula(1, 8, P(RUND)), latura, adancime: 1 })], linie));
    assert.deepEqual(p.miscari, plata.miscari, latura);
  }
});

/** Secțiunea marginii simulate la x = 50, sub latura de jos a dreptunghiului (y = 20; piesa e deasupra): z și y pe fiecare celulă. */
function sectiune(puncte: readonly Pct[], adancime: number): ReadonlyArray<readonly [number, number]> {
  const p = program(doc([op({ scula: scula(1, 8, P(puncte)), adancime, pas: 1 })]));
  const s = pregatesteProgram(p, 0);
  if (!s.ok) assert.fail(s.motiv);
  const celula = 0.01, y0 = 12;
  const F = campNou({ x0: 49.5, y0, latime: 1, inaltime: 14, celula, sus: 0 });
  ruleaza(F, s.scula, s.mutari);
  compacteaza(F);
  const rez: Array<readonly [number, number]> = [];
  for (let j = 0; j < 1400; j++) rez.push([y0 + (j + 0.5) * celula, valoare(F, 50, j)]);
  return rez;
}

test('pe hârtie: secțiunea marginii simulate, celulă cu celulă (centrul la r(0) sub desen); nimic tăiat dincolo de siluetă', () => {
  const cazuri: ReadonlyArray<readonly [string, readonly Pct[], number]> = [
    ['rotunjirea la 1,2', RUND, 1.2],
    ['rotunjirea la 3 (cât profilul)', RUND, 3],
    ['S-ul la 2,8', S_URI, 2.8],
    ['treptele la 1,5', TREPTE, 1.5],
  ];
  for (const [nume, puncte, d] of cazuri) {
    const r0 = fundProfil(puncte), yc = 20 - r0;
    let laFund = Infinity, muchie = -Infinity;
    for (const [y, z] of sectiune(puncte, d)) {
      const rho = Math.abs(y - yc);
      const hartie = rho <= 4 ? Math.min(0, -d + h(puncte, rho)) : 0;
      assert.ok(Math.abs(z - hartie) <= 1e-5, `${nume}: la y = ${y.toFixed(3)} (ρ = ${rho.toFixed(3)}), z = ${z}, pe hârtie ${hartie}`);
      // În piesă (deasupra desenului): ultima celulă tăiată e muchia de sus.
      if (y > 20 && z < -1e-9) muchie = Math.max(muchie, y);
      if (Math.abs(y - 20) < 0.006) laFund = z;
    }
    // Dinții probei: la desen, adâncimea e d (fundul plat al siluetei acoperă desenul), iar muchia de sus e retrasă cu
    // r(d) − r(0) în piesă (cu o celulă pe margine).
    assert.ok(laFund <= -d + h(puncte, r0 + 0.006) + 1e-5, `${nume}: la desen, z = ${laFund}`);
    assert.ok(Math.abs(muchie - 20 - retragereMuchie(puncte, d)) <= 0.011, `${nume}: muchia la ${(muchie - 20).toFixed(3)} în piesă, pe hârtie ${retragereMuchie(puncte, d).toFixed(3)}`);
  }
});

test('refuzurile: peste înălțimea profilului, fără fund plat, cu urechi, degajări, intrări sau despărțire; motivul numește freza', () => {
  const cazuri: ReadonlyArray<readonly [string, Liber, RegExp]> = [
    ['peste înălțimea profilului', op({ scula: scula(1, 8, P(RUND)), adancime: 3.5 }), /înălțimea profilului, 3 mm \(e 3\.5 mm\)/],
    ['fără fund plat', op({ scula: scula(1, 8, P(FARA_FUND)), adancime: 1 }), /fără fund plat/],
    ['cu urechi', op({ scula: scula(1, 8, P(RUND)), adancime: 2, urechi: { numar: 4, latime: 8, grosime: 1 } }), /fără urechi, degajări, intrări și despărțirea foii/],
    ['cu degajări', op({ scula: scula(1, 8, P(RUND)), adancime: 2, colturi: { tip: 'dog-bone' } }), /fără urechi, degajări, intrări și despărțirea foii/],
    ['cu intrări', op({ scula: scula(1, 8, P(RUND)), adancime: 2, intrari: { raza: 3 } }), /fără urechi, degajări, intrări și despărțirea foii/],
    ['cu despărțirea foii', op({ scula: scula(1, 8, P(RUND)), adancime: 2, despartire: true }), /fără urechi, degajări, intrări și despărțirea foii/],
  ];
  for (const [nume, o, re] of cazuri) assert.match(motiv(doc([o])), re, nume);
  assert.match(motiv(doc([op({ scula: scula(1, 8, P(RUND)), adancime: 3.5 })])), /freza profilată \(T1\)/);
});
