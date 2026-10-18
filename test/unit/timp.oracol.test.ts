import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { ProfilMasina } from '../../src/ir/masina.ts';
import { PROFIL_GRBL_11H } from '../../src/ir/masini/grbl11h.ts';
import { estimeazaTimp } from '../../src/sim/timp.ts';
import { CAZURI_REFUZATE, CAZURI_TIMP } from '../oracles/timp.cazuri.ts';
import { IMPLICITE_GRBL_11H, timpGrbl, type SetariGrbl } from '../oracles/timp.ts';

/**
 * Estimarea aplicației (ADR 0046) față de oracolul independent (`test/oracles/timp.ts`, scris de o sesiune fără acces la
 * `src/`, din codul GRBL 1.1h): implicitele citite de amândouă, cazurile pe hârtie ale oracolului rulate pe aplicație, și
 * un corpus (plăcile 1 și 2, programe aleatoare pe profile aleatoare) pe care cele două trebuie să dea același timp.
 */

function profil(s: SetariGrbl): ProfilMasina {
  const axa = (k: 0 | 1 | 2) => ({ pasiPeMm: s.pasiPeMm[k], vitezaMaxima: s.vitezaMaxima[k], acceleratie: s.acceleratie[k] });
  return {
    ...PROFIL_GRBL_11H,
    axe: { X: axa(0), Y: axa(1), Z: axa(2) },
    deviatieJonctiune: s.deviatieJonctiune,
    toleranteArc: s.toleranteArc,
    firmware: { ...PROFIL_GRBL_11H.firmware, blocuriPlanificator: s.blocuriPlanificator },
  };
}

test('implicitele: profilul aplicației e chiar lectura oracolului din defaults.h și planner.h', () => {
  assert.deepEqual(profil(IMPLICITE_GRBL_11H), PROFIL_GRBL_11H);
});

test('cazurile pe hârtie ale oracolului, rulate pe aplicație: aceleași valori, în toleranța lor', () => {
  assert.ok(CAZURI_TIMP.length >= 10);
  for (const c of CAZURI_TIMP) {
    const r = estimeazaTimp(c.gcode, profil(c.setari));
    assert.ok(r.ok, `${c.nume}: ${r.ok ? '' : `linia ${r.linie}: ${r.motiv}`}`);
    if (!r.ok) continue;
    const a = c.asteptat;
    const mm = c.tolerantaMm ?? 1e-9;
    assert.ok(Math.abs(r.total.secunde - a.secunde) <= c.toleranta, `${c.nume}: ${r.total.secunde} s față de ${a.secunde} (±${c.toleranta})`);
    if (a.secundePauze !== undefined) assert.ok(Math.abs(r.total.pauze - a.secundePauze) <= 1e-9, `${c.nume}: pauzele`);
    if (a.taiere !== undefined) assert.ok(Math.abs(r.total.taiere - a.taiere) <= mm, `${c.nume}: tăierea ${r.total.taiere} față de ${a.taiere}`);
    if (a.rapide !== undefined) assert.ok(Math.abs(r.total.rapide - a.rapide) <= mm, `${c.nume}: rapidele ${r.total.rapide} față de ${a.rapide}`);
    if (a.blocuri !== undefined) assert.equal(r.blocuri, a.blocuri, `${c.nume}: blocurile`);
  }
});

test('ce refuză oracolul refuză și aplicația, la aceeași linie', () => {
  for (const c of CAZURI_REFUZATE) {
    const r = estimeazaTimp(c.gcode, PROFIL_GRBL_11H);
    assert.equal(r.ok, false, `${c.nume}: aplicația îl acceptă`);
    if (!r.ok) assert.equal(r.linie, c.linia, `${c.nume}: ${r.motiv}`);
  }
});

/** Generatorul determinist (mulberry32): corpusul e același la fiecare rulare. */
function aleator(samanta: number): () => number {
  let s = samanta >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const n3 = (x: number): string => x.toFixed(3);

/**
 * Un program aleator în dialectul postului: rapide, tăieri pe 1–3 axe, arce G2 / G3 cu I / J din startul rotunjit (capătul
 * pe același cerc, ca la post), elici, șiruri de segmente scurte, pauze, axul și turația, unități și mod schimbate rar.
 */
function program(r: () => number): string {
  const l: string[] = ['G90 G17 G21 G94', 'G40 G49 G80', 'G54', 'G0 Z5.000', 'M3 S18000', 'G4 P3.000', 'G1 X0.000 Y0.000 F1000.0'];
  let x = 0, y = 0, z = 5;
  const n = 20 + Math.floor(r() * 120);
  for (let i = 0; i < n; i++) {
    const t = r();
    if (t < 0.15) {
      x = Math.round((r() * 300) * 1000) / 1000;
      y = Math.round((r() * 200) * 1000) / 1000;
      l.push(`G0 X${n3(x)} Y${n3(y)}`);
    } else if (t < 0.25) {
      z = Math.round((r() * 10 - 6) * 1000) / 1000;
      l.push(`G1 Z${n3(z)} F${(100 + Math.floor(r() * 400)).toFixed(1)}`);
    } else if (t < 0.5) {
      x = Math.round((x + (r() - 0.5) * 80) * 1000) / 1000;
      if (r() < 0.6) y = Math.round((y + (r() - 0.5) * 80) * 1000) / 1000;
      l.push(`G1 X${n3(x)} Y${n3(y)}${r() < 0.3 ? ` F${(200 + Math.floor(r() * 4000)).toFixed(1)}` : ''}`);
    } else if (t < 0.7) {
      // Arcul: centrul la distanța R de start, capătul pe cerc (rotunjit la 3 zecimale, ca la post).
      const R = 0.5 + r() * 40;
      const u = r() * 2 * Math.PI;
      const cx = x + R * Math.cos(u), cy = y + R * Math.sin(u);
      const i0 = Math.round((cx - x) * 1000) / 1000, j0 = Math.round((cy - y) * 1000) / 1000;
      const raza = Math.hypot(i0, j0);
      const v = Math.atan2(y - (y + j0), x - (x + i0)) + (r() - 0.5) * 2 * Math.PI;
      const ex = Math.round((x + i0 + raza * Math.cos(v)) * 1000) / 1000;
      const ey = Math.round((y + j0 + raza * Math.sin(v)) * 1000) / 1000;
      const elice = r() < 0.2 ? ` Z${n3((z = Math.round((z - r()) * 1000) / 1000))}` : '';
      l.push(`${r() < 0.5 ? 'G2' : 'G3'} X${n3(ex)} Y${n3(ey)}${elice} I${n3(i0)} J${n3(j0)} F${(300 + Math.floor(r() * 2000)).toFixed(1)}`);
      x = ex;
      y = ey;
    } else if (t < 0.8) {
      // Șir de segmente scurte, aproape coliniare: fereastra planificatorului.
      const pasi = 5 + Math.floor(r() * 40);
      const dx = (r() - 0.5) * 2, dy = (r() - 0.5) * 2;
      for (let k = 0; k < pasi; k++) {
        x = Math.round((x + dx + (r() - 0.5) * 0.05) * 1000) / 1000;
        y = Math.round((y + dy + (r() - 0.5) * 0.05) * 1000) / 1000;
        l.push(`G1 X${n3(x)} Y${n3(y)}${k === 0 ? ' F2000.0' : ''}`);
      }
    } else if (t < 0.85) {
      l.push(`G4 P${(r() * 2).toFixed(3)}`);
    } else if (t < 0.9) {
      l.push(r() < 0.5 ? 'M5' : `M3 S${10000 + Math.floor(r() * 4) * 2000}`);
    } else if (t < 0.93) {
      l.push(`S${10000 + Math.floor(r() * 4) * 2000}`);
    } else if (t < 0.95) {
      l.push(r() < 0.5 ? 'M8' : 'M9');
    } else {
      x = Math.round((x + (r() - 0.5) * 0.02) * 1000) / 1000;
      l.push(`G1 X${n3(x)} F${(50 + Math.floor(r() * 500)).toFixed(1)}`);
    }
  }
  l.push('G0 Z5.000', 'M5', 'M30');
  return `${l.join('\n')}\n`;
}

function setari(r: () => number): SetariGrbl {
  const trei = (f: () => number): readonly [number, number, number] => [f(), f(), f()];
  return {
    pasiPeMm: trei(() => [80, 100, 250, 320, 400, 800, 1000][Math.floor(r() * 7)] ?? 250),
    vitezaMaxima: trei(() => 300 + Math.floor(r() * 9700)),
    acceleratie: trei(() => 5 + Math.floor(r() * 995)),
    deviatieJonctiune: [0, 0.005, 0.01, 0.02, 0.05][Math.floor(r() * 5)] ?? 0.01,
    toleranteArc: [0.001, 0.002, 0.005, 0.01][Math.floor(r() * 4)] ?? 0.002,
    blocuriPlanificator: [1, 4, 15, 15, 15, 35][Math.floor(r() * 6)] ?? 15,
  };
}

/** Abaterea relativă a timpului și blocurile, pentru diagnoza testului. */
function compara(nume: string, gcode: string, s: SetariGrbl): { readonly abatere: number; readonly blocuri: number } {
  const o = timpGrbl(gcode, s);
  const a = estimeazaTimp(gcode, profil(s));
  assert.ok(a.ok, `${nume}: ${a.ok ? '' : `linia ${a.linie}: ${a.motiv}`}`);
  if (!a.ok) return { abatere: Infinity, blocuri: 0 };
  const rel = (x: number, y: number): number => Math.abs(x - y) / Math.max(1, Math.abs(y));
  assert.equal(a.blocuri, o.blocuri, `${nume}: blocurile`);
  assert.ok(rel(a.total.secunde, o.secunde) <= 1e-6, `${nume}: ${a.total.secunde} s față de oracol ${o.secunde}`);
  assert.ok(rel(a.total.pauze, o.secundePauze) <= 1e-9, `${nume}: pauzele ${a.total.pauze} față de ${o.secundePauze}`);
  assert.ok(rel(a.total.taiere, o.taiere) <= 1e-6, `${nume}: tăierea ${a.total.taiere} față de ${o.taiere}`);
  assert.ok(rel(a.total.rapide, o.rapide) <= 1e-6, `${nume}: rapidele ${a.total.rapide} față de ${o.rapide}`);
  return { abatere: rel(a.total.secunde, o.secunde), blocuri: a.blocuri };
}

const PLACI = ['placa-01/placa-01-A.nc', 'placa-01/placa-01-B.nc', 'placa-02/placa-02.nc']
  .map((f) => [f, readFileSync(new URL(`../placi/${f}`, import.meta.url), 'ascii')] as const);
const RAPID: SetariGrbl = { ...IMPLICITE_GRBL_11H, vitezaMaxima: [5000, 5000, 1000], acceleratie: [500, 500, 200] };

test('plăcile 1 și 2: aplicația și oracolul dau același timp, pe implicite și pe o mașină rapidă', () => {
  for (const [f, text] of PLACI) {
    compara(`${f}, implicite`, text, IMPLICITE_GRBL_11H);
    compara(`${f}, rapid`, text, RAPID);
  }
});

test('300 de programe aleatoare pe profile aleatoare (fereastra 1–35, $11 0–0,05, $12, pașii): același timp', (t) => {
  const r = aleator(46);
  let abatere = 0;
  let blocuri = 0;
  for (let i = 0; i < 300; i++) {
    const c = compara(`programul ${i}`, program(r), setari(r));
    abatere = Math.max(abatere, c.abatere);
    blocuri += c.blocuri;
  }
  t.diagnostic(`timpul: abaterea relativă cea mai mare ${abatere.toExponential(2)}, pe ${blocuri} de blocuri`);
});
