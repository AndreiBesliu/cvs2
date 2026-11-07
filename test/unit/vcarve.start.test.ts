/**
 * Adâncimea de start a V-carve-ului (ADR 0170 §3, dopul incrustației), pe oracolul independent al simulării: regiunea se sapă
 * ca și cum fața ar fi cu S mai jos. Pe hârtie, cu t = tan(θ/2) și d distanța la contur: în regiune, −min(D, S + d/t); în afara
 * ei, conul care atinge conturul la −S taie panta −max(0, S − d/t) (până la S·t de contur). Niciodată mai adânc decât idealul,
 * sub el cel mult cât toleranțele axei; fiecare trecere scoate cel mult pasul; refuzul unei adâncimi de start în afara [0, D).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { traseuVcarve } from '../../src/cam/vcarve.ts';
import { conturDreptunghi } from '../../src/geom/conturBaza.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import { judeca, type GrilaOracol, type SculaOracol } from '../oracles/simulare.ts';

const REGIM = { avans: 1000, avansPlonjare: 300, zSigur: 5 };

/** Programul simplu al unor mișcări, citit de oracol: G0 / G1 / G2 / G3, absolut, în mm. */
function gcode(m: readonly Miscare[], pana = m.length): string {
  const l = ['G21 G90', 'G0 X0 Y0 Z5'];
  let x = 0, y = 0;
  const f = (v: number) => v.toFixed(5);
  for (const q of m.slice(0, pana)) {
    if (q.tip !== 'rapida' && q.tip !== 'taiere' && q.tip !== 'arc') continue;
    const ax = (['X', 'Y', 'Z'] as const).filter((k) => q.la[k] !== undefined).map((k) => `${k}${f(q.la[k]!)}`).join(' ');
    if (q.tip === 'arc') l.push(`${q.sens === 'orar' ? 'G2' : 'G3'} ${ax} I${f(q.centru.x - x)} J${f(q.centru.y - y)} F${q.avans}`);
    else l.push(`${q.tip === 'rapida' ? 'G0' : 'G1'} ${ax}${q.tip === 'taiere' ? ` F${q.avans}` : ''}`);
    if (q.la.X !== undefined) x = q.la.X;
    if (q.la.Y !== undefined) y = q.la.Y;
  }
  return l.join('\n');
}

/** Distanța la dreptunghiul [x0, x0 + w] × [y0, y0 + h] și dacă punctul e înăuntru, pe hârtie. */
function laDreptunghi(px: number, py: number, x0: number, y0: number, w: number, h: number): { d: number; inauntru: boolean } {
  const dx = Math.max(x0 - px, 0, px - (x0 + w)), dy = Math.max(y0 - py, 0, py - (y0 + h));
  const inauntru = dx === 0 && dy === 0;
  return { inauntru, d: inauntru ? Math.min(px - x0, x0 + w - px, py - y0, y0 + h - py) : Math.hypot(dx, dy) };
}

test('pe hârtie, pe oracol: bara 12 × 2,4 la V90, S = 1, D = 2,5: în regiune −(1 + d), în afara ei −max(0, 1 − d); niciodată mai adânc', () => {
  const S = 1, D = 2.5, t = 1, x0 = 10, y0 = 10, w = 12, h = 2.4;
  const r = traseuVcarve({ contururi: [conturDreptunghi(x0, y0, w, h)], unghi: 90, diametruScula: 8, adancime: D, adancimeStart: S, pas: 0.8, ...REGIM });
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.statistici.fundPlat, false, 'bara (d ≤ 1,2) n-are fund plat: S + 1,2 = 2,2 < D');
  const g: GrilaOracol = { x0: x0 - 2, y0: y0 - 2, latime: w + 4, inaltime: h + 4, celula: 0.05 };
  const v: SculaOracol = { tip: 'v', diametru: 8, unghi: 90 };
  const o = judeca(gcode(r.miscari), g, v);
  let maiAdanc = 0, maiSus = 0, nTaiat = 0;
  for (let j = 0; j < o.ny; j++) for (let i = 0; i < o.nx; i++) {
    const px = g.x0 + (i + 0.5) * g.celula, py = g.y0 + (j + 0.5) * g.celula;
    const { d, inauntru } = laDreptunghi(px, py, x0, y0, w, h);
    const ideal = inauntru ? -Math.min(D, S + d / t) : -Math.max(0, S - d / t);
    const z = o.z[j * o.nx + i]!;
    maiAdanc = Math.max(maiAdanc, ideal - z);
    maiSus = Math.max(maiSus, z - ideal);
    if (z < -1e-9) nTaiat++;
  }
  assert.ok(maiAdanc <= 0.002, `niciodată mai adânc decât idealul: cu ${maiAdanc.toFixed(5)} mm`);
  assert.ok(maiSus <= 0.015, `sub ideal cel mult toleranțele axei: ${maiSus.toFixed(5)} mm`);
  // Panta din afară: un punct la 0,525 mm în afara laturii lungi e săpat la −(1 − 0,525) = −0,475; la 1,225 mm, netăiat.
  const z = (px: number, py: number): number => o.z[Math.floor((py - g.y0) / g.celula) * o.nx + Math.floor((px - g.x0) / g.celula)]!;
  assert.ok(Math.abs(z(16.025, 9.475) - -0.475) <= 0.02, `la 0,525 mm sub latura de jos: ${z(16.025, 9.475)}`);
  assert.ok(z(16.025, 8.775) > -1e-9, `la 1,225 mm, netăiat: ${z(16.025, 8.775)}`);
  assert.ok(nTaiat > 0);
});

test('fiecare trecere scoate cel mult pasul, și cu adâncimea de start (prefixele programului pe oracol)', () => {
  const S = 1.5, D = 3, pas = 0.8;
  const r = traseuVcarve({ contururi: [conturDreptunghi(0, 0, 10, 2)], unghi: 60, diametruScula: 10, adancime: D, adancimeStart: S, pas, ...REGIM });
  if (!r.ok) assert.fail(r.motiv);
  const g: GrilaOracol = { x0: -3, y0: -3, latime: 16, inaltime: 8, celula: 0.05 };
  const v: SculaOracol = { tip: 'v', diametru: 10, unghi: 60 };
  let inainte = new Float64Array(320 * 160);
  for (const sfarsit of r.statistici.sfarsitTreceri) {
    const o = judeca(gcode(r.miscari, sfarsit), g, v);
    let max = 0;
    for (let k = 0; k < o.z.length; k++) max = Math.max(max, inainte[k]! - o.z[k]!);
    assert.ok(max <= pas + 1e-6, `o trecere scoate ${max.toFixed(4)} mm, peste pasul de ${pas}`);
    inainte = Float64Array.from(o.z);
  }
  assert.ok(r.statistici.sfarsitTreceri.length >= Math.ceil((S + 1 * Math.sqrt(3)) / pas) - 1);
});

test('refuzul: adâncimea de start în afara [0, D), cu motiv', () => {
  const p = { contururi: [conturDreptunghi(0, 0, 10, 4)], unghi: 90, diametruScula: 8, adancime: 2, pas: 1, ...REGIM };
  for (const S of [-0.1, 2, 2.5, Number.NaN]) {
    const r = traseuVcarve({ ...p, adancimeStart: S });
    assert.ok(!r.ok && /adâncimea de start/.test(r.motiv), `S = ${S}`);
  }
  assert.ok(traseuVcarve({ ...p, adancimeStart: 0 }).ok, 'S = 0, ca până acum');
});
