/**
 * Canelura cu profilul desenat (ADR 0304 §3, felia 16.A↑f-2): profilul pe linie primește freza profilată. Centrul frezei merge
 * pe linie, deci drumul e al unei freze plate de același diametru, mișcare cu mișcare (și cu urechile, rampa, intrările);
 * doar scula din IR își poartă silueta (simularea o citește de acolo). Pe hârtie, secțiunea canelurii simulate e oglinda
 * siluetei: la distanța x de linie, cât x ≤ R, adâncimea e d − h(x), dar nu sub fața plăcii (min(0, −d + h(x))); dincolo de R,
 * neatins. Peste înălțimea profilului, peretele e vertical la R. Pe o parte, în buzunar, la găurire, în V-carve și pe frezele
 * în plus, profilul rămâne refuzat, cu motiv (marginea profilată vine pe o sub-felie a ei); același T cu altă siluetă e altă
 * freză.
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
type Pct = readonly [number, number];
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const scula = (numar: number, diametru: number, forma?: Liber): Liber => ({ numar, nume: `freza ${numar}`, diametru, ...(forma ? { forma } : {}) });
const op = (v: Liber): Liber => ({
  id: 'o', tip: 'profil', noduri: ['e'], scula: scula(1, 8), latura: 'pe-linie', sens: 'urcare', adancime: 1, pas: 3,
  urechi: null, rampa: null, intrari: null, colturi: null, ...v,
});
function doc(operatii: readonly Liber[]): Liber {
  return {
    schema: 32, rev: 0,
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

/** O rotunjire (fundul plat, apoi o curbă tot mai abruptă), un S și trepte, toate pe Ø8 (R = 4). */
const RUND: readonly Pct[] = [[0, 0], [1.5, 0], [2.2, 0.3], [3, 0.9], [3.6, 1.8], [4, 3]];
const S_URI: readonly Pct[] = [[0, 0], [1, 0.2], [2, 0.4], [2.5, 1.2], [3, 2.6], [3.5, 3], [4, 3.1]];
const TREPTE: readonly Pct[] = [[0, 0], [1, 0], [1.2, 1], [2.5, 1], [2.7, 2], [4, 2]];
const P = (puncte: readonly Pct[]): Liber => ({ tip: 'profil', puncte: puncte.map(([r, h]) => [r, h]) });

/** h(x) pe hârtie: interpolarea liniară a siluetei, la distanța x de axă (x ≤ R). */
function h(puncte: readonly Pct[], x: number): number {
  for (let k = 0; k + 1 < puncte.length; k++) {
    const [r0, h0] = puncte[k]!, [r1, h1] = puncte[k + 1]!;
    if (x <= r1) return h0 + ((h1 - h0) * (x - r0)) / (r1 - r0);
  }
  return puncte[puncte.length - 1]![1];
}

test('motivFormaPeOperatie: profilul desenat merge pe linie (canelura); în rest, refuzat (marginea profilată vine pe o sub-felie)', () => {
  const p: FormaSculaDoc = { tip: 'profil', puncte: RUND.map(([r, hh]) => [r, hh]) };
  const randuri: ReadonlyArray<readonly [TipOperatie, Latura, string | null]> = [
    ['profil', 'pe-linie', null],
    ['profil', 'exterior', 'profil'], ['profil', 'interior', 'profil'], ['profil', 'stanga', 'profil'], ['profil', 'dreapta', 'profil'],
    ['buzunar', 'interior', 'profil'], ['gaurire', 'interior', 'profil'], ['vcarve', 'interior', 'profil'],
    ['finisare', 'pe-linie', 'profil'], ['degrosare', 'pe-linie', 'profil'],
  ];
  for (const [tip, latura, asteptat] of randuri) {
    assert.equal(motivFormaPeOperatie(tip, latura, p, { adancime: 10 }, 8), asteptat, `${tip} ${latura}`);
  }
});

test('canelura cu profilul: drumul frezei plate de același Ø, mișcare cu mișcare, și cu urechile și rampa; scula din IR își poartă silueta', () => {
  const variante: ReadonlyArray<readonly [string, Liber]> = [
    ['simplă', { adancime: 4, pas: 1.5 }],
    ['cu rampa', { adancime: 2, pas: 1, rampa: { lungime: 10 } }],
    ['cu urechile', { adancime: 18, pas: 6, urechi: { numar: 4, latime: 8, grosime: 1.5 } }],
  ];
  for (const [nume, v] of variante) {
    const plata = program(doc([op({ scula: scula(1, 8), ...v })]));
    for (const [numeP, puncte] of [['rotunjirea', RUND], ['S-ul', S_URI], ['treptele', TREPTE]] as const) {
      const p = program(doc([op({ scula: scula(1, 8, P(puncte)), ...v })]));
      assert.deepEqual(p.miscari, plata.miscari, `${nume}, ${numeP}: alt drum decât al frezei plate`);
      assert.deepEqual(p.scula.forma, { tip: 'profil', puncte: puncte.map(([r, hh]) => [r, hh]) }, `${nume}, ${numeP}: silueta nu ajunge în IR`);
      assert.equal(p.scula.diametru, 8);
    }
  }
});

/** Secțiunea canelurii simulate la x = 50 (pe latura de jos a dreptunghiului, y = 20): z pe fiecare celulă, cu distanța ei. */
function sectiune(puncte: readonly Pct[], adancime: number): ReadonlyArray<readonly [number, number]> {
  const p = program(doc([op({ scula: scula(1, 8, P(puncte)), adancime, pas: 1.25 })]));
  const s = pregatesteProgram(p, 0);
  if (!s.ok) assert.fail(s.motiv);
  const celula = 0.01, y0 = 15;
  const F = campNou({ x0: 49.5, y0, latime: 1, inaltime: 10, celula, sus: 0 });
  ruleaza(F, s.scula, s.mutari);
  compacteaza(F);
  const rez: Array<readonly [number, number]> = [];
  for (let j = 0; j < 1000; j++) rez.push([Math.abs(y0 + (j + 0.5) * celula - 20), valoare(F, 50, j)]);
  return rez;
}

test('pe hârtie: secțiunea canelurii simulate e oglinda siluetei, celulă cu celulă (sub, la și peste înălțimea profilului)', () => {
  const cazuri: ReadonlyArray<readonly [string, readonly Pct[], number]> = [
    ['rotunjirea la 1,2', RUND, 1.2],
    ['rotunjirea la 3 (cât profilul)', RUND, 3],
    ['rotunjirea la 4,5 (peste profil: perete vertical la R)', RUND, 4.5],
    ['S-ul la 2,8', S_URI, 2.8],
    ['treptele la 1,5', TREPTE, 1.5],
    ['treptele la 2,5', TREPTE, 2.5],
  ];
  for (const [nume, puncte, d] of cazuri) {
    let taiate = 0, adanc = Infinity;
    for (const [x, z] of sectiune(puncte, d)) {
      const hartie = x <= 4 ? Math.min(0, -d + h(puncte, x)) : 0;
      assert.ok(Math.abs(z - hartie) <= 1e-5, `${nume}: la ${x.toFixed(3)} mm de linie, z = ${z}, pe hârtie ${hartie}`);
      if (z < -1e-9) taiate++;
      adanc = Math.min(adanc, z);
    }
    // Dinții probei: fundul e la −d + h(0,005) (celula cea mai apropiată de linie e la 0,005 mm), iar lățimea tăiată la față
    // e 2·x₀, cu h(x₀) = d (la R peste profil), cu o celulă pe margine.
    assert.ok(Math.abs(adanc - (-d + h(puncte, 0.005))) <= 1e-5, `${nume}: fundul la ${adanc}`);
    let x0 = 4;
    for (let x = 0; x <= 4; x += 1e-4) if (h(puncte, x) >= d) { x0 = x; break; }
    assert.ok(Math.abs(taiate * 0.01 - 2 * x0) <= 0.021, `${nume}: lățimea la față ${(taiate * 0.01).toFixed(3)} ≠ ${(2 * x0).toFixed(3)} pe hârtie`);
  }
});

test('profilul rămâne refuzat pe o parte, în buzunar, la găurire și pe frezele în plus, cu forma, T-ul și calea', () => {
  const cazuri: ReadonlyArray<readonly [string, Liber, RegExp]> = [
    ['pe exterior', op({ latura: 'exterior', scula: scula(1, 8, P(RUND)), adancime: 3 }), /freza profilată \(T1, scula\).*pe linie/],
    ['în buzunar', op({ tip: 'buzunar', latura: 'interior', pasLateral: 2, scula: scula(1, 8, P(RUND)) }), /freza profilată \(T1, scula\)/],
    ['ca freză de rest', op({ tip: 'buzunar', latura: 'interior', pasLateral: 2, scula: scula(1, 8), rest: [{ scula: scula(2, 6, P([[0, 0], [3, 1]])), pasLateral: 1 }] }), /freza profilată \(T2, rest\[0\]\)/],
  ];
  for (const [nume, o, re] of cazuri) assert.match(motiv(doc([o])), re, nume);
});

test('același T cu două siluete diferite e două freze: refuzat; aceeași siluetă pe două caneluri, o singură freză', () => {
  const linie2 = (puncte: readonly Pct[]): Liber => op({ id: 'o2', scula: scula(1, 8, P(puncte)), adancime: 0.5 });
  const m = motiv(doc([op({ scula: scula(1, 8, P(RUND)) }), linie2(TREPTE)]));
  assert.match(m, /T1 are două freze/);
  assert.match(m, /altă siluetă/);
  // Aceleași raze, alt h la capăt: tot altă siluetă.
  assert.match(motiv(doc([op({ scula: scula(1, 8, P(RUND)) }), linie2(RUND.map(([r, hh], k): Pct => [r, k === RUND.length - 1 ? hh + 0.2 : hh]))])), /altă siluetă/);
  // Profilul față de bilă, același T: tot două freze.
  assert.match(motiv(doc([op({ scula: scula(1, 8, P(RUND)) }), op({ id: 'o2', scula: scula(1, 8, { tip: 'bila' }), adancime: 0.5 })])), /T1 are două freze/);
  assert.equal(motiv(doc([op({ scula: scula(1, 8, P(RUND)) }), linie2(RUND)])), '');
});

test('raportul foilor numește freza profilată, nu ca pe o plată de același Ø', () => {
  const s = raportFoi(deschis(doc([op({ scula: scula(1, 8, P(RUND)) })])), 'taiata', (n) => `Foaia ${n}`).foi[0]!.operatii[0]!.scula;
  assert.deepEqual(s, { numar: 1, diametru: 8, unghi: null, profilata: true });
});
