/**
 * Loturile de linii ca cereri de sine stătătoare (ADR 0323, planul liniilor pe workere; felia 18.1↑h-7). Un worker al cotelor
 * nu vede documentul: primește doar cererea lotului (punctele liniilor lui, în lume, și, pe fiecare relief, rândurile de
 * relief de care are nevoie banda lui, tăiate din tablou, cu decalajul lor) și întoarce cotele. Cererile trec granița firelor
 * (aici, `structuredClone`); programul făcut apoi din cotele lor, date finisării (`cote`), trebuie să fie cel de azi, octet cu
 * octet, oricâte loturi ar fi.
 *
 * Cazurile: un relief și două (al doilea rotit și mutat), liniile la 0°, 90°, 30° și nealiniate, toate frezele; degroșarea cu
 * adaos. Loturile: 1, 2, 3 și 7. La 0°, o bandă e îngustă: rândurile trimise unui lot sunt cât banda lui, nu tot relieful.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cotePuncte, degrosareRelief, finisareRelief, loturiCote, planDegrosare, planFinisare,
  type FrezaFinisare, type ParametriDegrosare, type ParametriFinisare, type ReliefCam,
} from '../../src/cam/reliefFinisare.ts';

function aleator(samanta: number): () => number {
  let s = samanta >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function relief(r: () => number, nx: number, ny: number, c: number, m: ReliefCam['m']): ReliefCam {
  const z = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) z[j * nx + i] = -2.5 + Math.sin(i * 0.4) * Math.cos(j * 0.3) - (r() < 0.05 ? 3 * r() : 0.3 * r());
  return { nx, ny, celula: c, z, m };
}

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const ROTIT = { a: Math.cos(0.5), b: Math.sin(0.5), c: -Math.sin(0.5), d: Math.cos(0.5), e: 6, f: -2 };
const FREZE: readonly FrezaFinisare[] = [
  { fel: 'bila', raza: 1.5 }, { fel: 'plata', raza: 1 }, { fel: 'v', raza: 2, unghi: 90, varf: 0.3 }, { fel: 'toroidala', raza: 1.5, colt: 0.5 },
];

/** Cotele tuturor liniilor, din cererile loturilor trecute prin granița firelor, în ordinea planului. */
function coteDinLoturi(plan: Parameters<typeof loturiCote>[0], k: number): Float64Array[] {
  return loturiCote(plan, k).flatMap((c) => cotePuncte(structuredClone(c)));
}

test('finisarea din cotele loturilor (1, 2, 3, 7), trecute prin granița firelor = finisarea de azi, octet cu octet', () => {
  const r = aleator(5);
  for (const [caz, [unghi, nealiniat]] of ([[0, false], [90, false], [30, false], [0, true]] as const).entries()) {
    for (const doua of [false, true]) {
      const o: ParametriFinisare = {
        reliefuri: [relief(r, 40, 36, 0.5, I), ...(doua ? [relief(r, 20, 24, 0.25, ROTIT)] : [])], unghi, nealiniat,
        margine: caz % 2 === 0 ? 'perete' : 'trece', pas: 1.5, adancime: 8, zSigur: 5, avans: 1000, avansPlonjare: 300, pasLateral: 0.6,
        freza: FREZE[caz]!,
      };
      const azi = JSON.stringify(finisareRelief(o)), pl = planFinisare(o);
      assert.ok(pl.ok, pl.ok ? '' : pl.motiv);
      for (const k of [1, 2, 3, 7]) {
        assert.equal(JSON.stringify(finisareRelief({ ...o, cote: coteDinLoturi(pl.plan, k) })), azi, `${unghi}°${nealiniat ? ' nealiniat' : ''}, ${doua ? 'două reliefuri' : 'un relief'}, ${k} loturi`);
      }
    }
  }
});

test('degroșarea din cotele loturilor = degroșarea de azi, octet cu octet (benzile după raza cotei, R + adaos)', () => {
  const r = aleator(9);
  for (const adaos of [0, 0.5, 2]) {
    const o: ParametriDegrosare = {
      reliefuri: [relief(r, 40, 36, 0.5, I), relief(r, 20, 24, 0.25, ROTIT)], unghi: 0, margine: 'perete', pas: 1, adancime: 8,
      zSigur: 5, avans: 1000, avansPlonjare: 300, pasLateral: 0.8, raza: 1.5, adaos,
    };
    const azi = JSON.stringify(degrosareRelief(o)), pl = planDegrosare(o);
    assert.ok(pl.ok, pl.ok ? '' : pl.motiv);
    for (const k of [1, 3]) assert.equal(JSON.stringify(degrosareRelief({ ...o, cote: coteDinLoturi(pl.plan, k) })), azi, `adaosul ${adaos}, ${k} loturi`);
  }
});

test('la 0°, rândurile de relief trimise unui lot sunt cât banda lui, nu tot relieful', () => {
  const R0 = relief(aleator(2), 60, 400, 0.1, I);
  const pl = planFinisare({
    reliefuri: [R0], unghi: 0, nealiniat: false, margine: 'perete', pas: 3, adancime: 8, zSigur: 5, avans: 1000, avansPlonjare: 300,
    pasLateral: 0.3, freza: { fel: 'bila', raza: 1.5 },
  });
  assert.ok(pl.ok);
  const loturi = loturiCote(pl.plan, 8);
  assert.equal(loturi.length, 8);
  for (const c of loturi) {
    const randuri = c.reliefuri[0]!.z.length / 60;
    // 400 de rânduri în tot; un lot are 1/8 din linii (5 mm), plus raza frezei de fiecare parte (1,5 mm): cel mult ~85 de rânduri.
    assert.ok(randuri < 90, `${randuri} rânduri`);
  }
  // Liniile tuturor loturilor sunt toate liniile, o dată.
  assert.equal(loturi.reduce((s, c) => s + c.x.length, 0), pl.plan.liniiPe[0]!.linii.length);
});

test('cotele date chiar se folosesc (altele dau alt program); cele care nu sunt ale planului se socotesc din nou', () => {
  const o: ParametriFinisare = {
    reliefuri: [relief(aleator(4), 30, 30, 0.5, I)], unghi: 0, nealiniat: false, margine: 'perete', pas: 1.5, adancime: 8, zSigur: 5,
    avans: 1000, avansPlonjare: 300, pasLateral: 0.6, freza: { fel: 'bila', raza: 1.5 },
  };
  const azi = JSON.stringify(finisareRelief(o)), pl = planFinisare(o);
  assert.ok(pl.ok);
  const cote = coteDinLoturi(pl.plan, 2);
  assert.notEqual(JSON.stringify(finisareRelief({ ...o, cote: cote.map((z) => z.map((v) => v - 0.25)) })), azi);
  assert.equal(JSON.stringify(finisareRelief({ ...o, cote: cote.slice(1) })), azi);
  assert.equal(JSON.stringify(finisareRelief({ ...o, cote: cote.map((z, q) => (q === 3 ? z.subarray(1) : z)) })), azi);
});

test('cu celula de 0,05 mm (diviziunea 1: câmpul pe 9 puncte), finisarea din cotele loturilor = cea de azi', () => {
  const o: ParametriFinisare = {
    reliefuri: [relief(aleator(13), 120, 160, 0.05, I)], unghi: 0, nealiniat: false, margine: 'perete', pas: 1.5, adancime: 8,
    zSigur: 5, avans: 1000, avansPlonjare: 300, pasLateral: 0.25, freza: { fel: 'bila', raza: 1 },
  };
  const azi = JSON.stringify(finisareRelief(o)), pl = planFinisare(o);
  assert.ok(pl.ok);
  for (const k of [2, 5]) assert.equal(JSON.stringify(finisareRelief({ ...o, cote: coteDinLoturi(pl.plan, k) })), azi, `${k} loturi`);
});

test('workerul unui lot citește doar rândurile de relief primite (nicio citire în afara lor)', () => {
  for (const [c, unghi] of [[0.5, 0], [0.25, 90], [0.05, 0]] as const) {
    const R0 = relief(aleator(17), c === 0.05 ? 80 : 40, c === 0.05 ? 120 : 60, c, I);
    const pl = planFinisare({
      reliefuri: [R0], unghi, nealiniat: false, margine: 'perete', pas: 3, adancime: 8, zSigur: 5, avans: 1000, avansPlonjare: 300,
      pasLateral: c === 0.05 ? 0.25 : 0.75, freza: { fel: 'bila', raza: 1 },
    });
    assert.ok(pl.ok);
    for (const lot of loturiCote(pl.plan, 4)) {
      let afara = 0;
      const reliefuri = lot.reliefuri.map((r) => {
        const z = r.z, n = z.length;
        // Fiecare citire a unui index, urmărită: în afara [0, n) e o citire în afara rândurilor primite.
        const urmarit = new Proxy(z as Float64Array, {
          get(t, k) {
            if (typeof k === 'string' && /^-?\d+$/.test(k)) { const i = Number(k); if (i < 0 || i >= n) afara++; return t[i]; }
            return Reflect.get(t, k) as unknown;
          },
        });
        return { ...r, z: urmarit };
      });
      const cu = cotePuncte({ ...lot, reliefuri }), fara = cotePuncte(lot);
      assert.equal(afara, 0, `c ${c}, ${unghi}°: ${afara} citiri în afara rândurilor primite`);
      assert.deepEqual(cu, fara);
    }
  }
});
