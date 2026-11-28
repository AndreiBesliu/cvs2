/**
 * Plafonul punctelor finisării, spus înaintea cotelor (ADR 0323, întrebarea 5a cu recomandarea aplicată; felia 18.1↑h-3). La
 * 4000² cu pasul lateral 0,3, cotele liniilor luau 187 s, apoi venea refuzul: programul ar fi avut peste 20 de milioane de
 * puncte (punctele unei treceri × trecerile). Acum, numărul trecerilor are o margine de jos din vârful unui singur punct (cel mai
 * apropiat de cea mai joasă celulă), deci refuzul vine fără cote când și marginea trece de plafon; altfel, verdictul rămâne după
 * cote, neschimbat.
 *
 * Relieful, pe hârtie: 160 × 160 de celule de 0,5 mm (80 mm), un platou ondulat între −0,55 și −0,05 (ca cotele să cântărească
 * cât pe un relief adevărat) și o groapă în centru, cu fundul plat la −10
 * pe raza de 3 mm (bila Ø3 ajunge pe el: CL = −10), urcând liniar până la platou pe raza de 6 mm. Liniile aliniate la 0°, cu
 * pasul de o celulă: 160 de linii, fiecare cu 80 / (1/16) = 1 280 de puncte, deci 204 800 de puncte pe trecere. Trecerile:
 * ⌈10 / pas⌉. Plafonul: 20 000 000 / 204 800 = 97,66 de treceri.
 *
 * - pasul 0,05: 200 de treceri, 40 960 000 de puncte: refuzul, fără cote (punctul ales e în groapă, CL = −10);
 * - pasul 10 / 96,5: 97 de treceri, 19 865 600 de puncte: programul iese (la marginea plafonului);
 * - pasul 10 / 97,5: 98 de treceri, 20 070 400 de puncte: refuzul, tot fără cote (marginea de jos e strânsă: dintre celulele
 *   fundului plat, toate la −10, punctul ales e cel din mijlocul lor, unde bila stă pe fund, nu lângă pantă);
 * - cu un ac (o celulă la −30) pe platou, cea mai joasă celulă e acolo, iar bila nu intră în el (CL ≈ −0,2): marginea de jos e câteva
 *   treceri, deci refuzul vine abia după cote, cu același motiv (pasul 0,05: tot 200 de treceri, din groapă).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finisareRelief, PUNCTE_FINISARE_MAXIM, type ParametriFinisare, type RezultatFinisare } from '../../src/cam/reliefFinisare.ts';
import { grila, relief, T } from './ajutor-relief-finisare.ts';

const N = 160, C = 0.5, PE_TRECERE = 160 * 1280;
const MOTIV = `finisarea ar avea peste ${PUNCTE_FINISARE_MAXIM} de puncte: mărește pasul lateral sau pasul pe trecere`;

function groapa(ac: boolean): Float64Array {
  return grila(N, N, C, (x, y) => {
    if (ac && Math.abs(x - 20.25) < 0.1 && Math.abs(y - 20.25) < 0.1) return -30;
    const r = Math.hypot(x - 40, y - 40);
    const platou = -0.3 + 0.25 * Math.sin(0.7 * x) * Math.cos(0.9 * y);
    return r <= 3 ? -10 : r >= 6 ? platou : -10 + ((r - 3) / 3) * (10 + platou);
  });
}

function finiseaza(ac: boolean, pas: number): { readonly f: RezultatFinisare; readonly t: number } {
  const o: ParametriFinisare = {
    reliefuri: [relief(groapa(ac), N, N, C, T(0, 0), 0)], unghi: 0, nealiniat: false, margine: 'perete', pas, adancime: 12, zSigur: 5,
    avans: 1000, avansPlonjare: 300, pasLateral: 0.5, freza: { fel: 'bila', raza: 1.5 },
  };
  const t0 = performance.now(), f = finisareRelief(o);
  return { f, t: performance.now() - t0 };
}

test('pe hârtie: 204 800 de puncte pe trecere; plafonul cade între 97 și 98 de treceri', () => {
  assert.equal(PE_TRECERE, 204_800);
  assert.ok(97 * PE_TRECERE <= PUNCTE_FINISARE_MAXIM && 98 * PE_TRECERE > PUNCTE_FINISARE_MAXIM);
  assert.equal(Math.ceil(10 / (10 / 96.5) - 1e-9), 97);
  assert.equal(Math.ceil(10 / (10 / 97.5) - 1e-9), 98);
});

test('la marginea plafonului (97 de treceri) programul iese; peste ea, refuzul vine fără cote, cu motivul de după ele', () => {
  const bun = finiseaza(false, 10 / 96.5);
  assert.ok(bun.f.ok, bun.f.ok ? '' : bun.f.motiv);
  assert.equal(bun.f.treceri, 97);
  assert.equal(bun.f.linii, 160);
  const refuz = finiseaza(false, 0.05);
  assert.equal(refuz.f.ok, false);
  if (!refuz.f.ok) assert.equal(refuz.f.motiv, MOTIV);
  // Fără cote: cât pregătirea câmpului și liniile, o mică parte din calculul întreg (cotele a 204 800 de puncte).
  assert.ok(refuz.t < 0.25 * bun.t, `refuzul în ${refuz.t.toFixed(0)} ms, programul întreg în ${bun.t.toFixed(0)} ms`);
  // Chiar peste plafon (98 de treceri, 20 070 400 de puncte): marginea de jos e strânsă (punctul din mijlocul fundului plat, CL =
  // −10), deci și acest refuz vine fără cote.
  const peste = finiseaza(false, 10 / 97.5);
  assert.equal(peste.f.ok, false);
  if (!peste.f.ok) assert.equal(peste.f.motiv, MOTIV);
  assert.ok(peste.t < 0.25 * bun.t, `refuzul la 98 de treceri în ${peste.t.toFixed(0)} ms, programul întreg în ${bun.t.toFixed(0)} ms`);
});

test('cu cea mai joasă celulă un ac în care bila nu intră, marginea de jos nu ajunge, deci refuzul vine după cote, același', () => {
  const r = finiseaza(true, 0.05);
  assert.equal(r.f.ok, false);
  if (!r.f.ok) assert.equal(r.f.motiv, MOTIV);
  // Și cu acul, la marginea plafonului, programul iese: acul nu adaugă treceri (bila nu intră în el).
  const bun = finiseaza(true, 10 / 96.5);
  assert.ok(bun.f.ok, bun.f.ok ? '' : bun.f.motiv);
  assert.equal(bun.f.treceri, 97);
});

test('pe un șanț în V (bila nu ajunge la fund), marginea de jos e tot strânsă: 97 de treceri ies, fără refuz', () => {
  // Șanțul de-a lungul lui X, la mijloc: −10 pe rândul de jos, cu pereții de 3 mm pe mm; bila Ø3 stă pe pereți, nu pe fund.
  // Fundul pe centrul rândului 80 (y = 40,25), deci modelul, liniar între centre, e chiar V-ul.
  const z = grila(N, N, C, (_x, y) => Math.min(-0.3, -10 + 3 * Math.abs(y - 40.25)));
  const o = (pas: number): ParametriFinisare => ({
    reliefuri: [relief(z, N, N, C, T(0, 0), 0)], unghi: 0, nealiniat: false, margine: 'perete', pas, adancime: 12, zSigur: 5,
    avans: 1000, avansPlonjare: 300, pasLateral: 0.5, freza: { fel: 'bila', raza: 1.5 },
  });
  // Cea mai adâncă cotă, din programul dintr-o trecere (ultima trecere e pe model).
  const unu = finisareRelief(o(20));
  assert.ok(unu.ok, unu.ok ? '' : unu.motiv);
  let adanc = 0;
  if (unu.ok) for (const m of unu.miscari) if (m.tip === 'taiere' && m.la.Z !== undefined && m.la.Z < adanc) adanc = m.la.Z;
  // Bila stă pe pereți, mult deasupra fundului: pe hârtie, CL-ul exact e −10 + max(3d − R + √(R² − d²)) = −10 + 3,243 =
  // −6,757 (la d = 1,423); câmpul conservativ îl ridică cu cel mult ~2 · h · panta = 2 · 0,0625 · 3 = 0,375.
  assert.ok(adanc >= -6.758 && adanc < -6.757 + 0.375, `cea mai adâncă cotă: ${adanc}`);
  const bun = finisareRelief(o(-adanc / 96.5));
  assert.ok(bun.ok, bun.ok ? '' : bun.motiv);
  assert.equal(bun.treceri, 97);
});
