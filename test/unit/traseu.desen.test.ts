/**
 * Traseul pregătit pentru stratul WebGL2 (felia 2.8d, ADR 0038 §1), pe hârtie: șirurile (rapide / tăieri, poziția
 * modală, Z ignorat), arcele sub toleranță cu capetele exacte, bugetul, treptele de zoom și bucățile relative la origine.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Miscare } from '../../src/ir/ir.ts';
import { bucatiDinSiruri, INTINDERE_BUCATA, RESTART, siruriDinProgram, siruriInBuget, tolerantaTreptei, type Bucata } from '../../src/app/traseuDesen.ts';

const R = (X?: number, Y?: number, Z?: number): Miscare => ({ tip: 'rapida', la: { ...(X === undefined ? {} : { X }), ...(Y === undefined ? {} : { Y }), ...(Z === undefined ? {} : { Z }) } });
const T = (X?: number, Y?: number, Z?: number): Miscare => ({ tip: 'taiere', avans: 1000, la: { ...(X === undefined ? {} : { X }), ...(Y === undefined ? {} : { Y }), ...(Z === undefined ? {} : { Z }) } });
const A = (X: number, Y: number, cx: number, cy: number, trig: boolean, Z?: number): Miscare => ({
  tip: 'arc', avans: 1000, centru: { x: cx, y: cy }, sens: trig ? 'trigonometric' : 'orar', la: { X, Y, ...(Z === undefined ? {} : { Z }) },
});

test('dreptunghiul: un șir de tăiere cu 5 puncte și un șir rapid; mișcările pe Z și poziția necunoscută nu desenează nimic', () => {
  const m: Miscare[] = [
    { tip: 'ax-pornit', turatie: 18000 }, R(undefined, undefined, 5), R(10, 10), T(undefined, undefined, -3),
    T(110), T(undefined, 70), T(10), T(undefined, 10), R(undefined, undefined, 5), R(0, 0),
  ];
  const r = siruriDinProgram(m, 0.001);
  assert.deepEqual(r.siruri, [
    { rapid: false, puncte: [10, 10, 110, 10, 110, 70, 10, 70, 10, 10] },
    { rapid: true, puncte: [10, 10, 0, 0] },
  ]);
  assert.equal(r.segmente, 5);
});

/** Puncte ca perechi, plus săgeata maximă a coardelor față de cercul (c, r). */
function perechi(p: readonly number[]): Array<[number, number]> {
  const q: Array<[number, number]> = [];
  for (let i = 0; i + 1 < p.length; i += 2) q.push([p[i] as number, p[i + 1] as number]);
  return q;
}
function sageataMaxima(q: ReadonlyArray<[number, number]>, cx: number, cy: number, r: number): number {
  let s = 0;
  for (let i = 1; i < q.length; i++) {
    const [ax, ay] = q[i - 1] as [number, number], [bx, by] = q[i] as [number, number];
    s = Math.max(s, r - Math.hypot((ax + bx) / 2 - cx, (ay + by) / 2 - cy));
  }
  return s;
}

test('sfertul de arc R10 la 0,001 mm: săgeata ≤ toleranță, toate punctele pe cerc, capătul exact, sensul trigonometric', () => {
  const r = siruriDinProgram([R(10, 0), A(0, 10, 0, 0, true)], 0.001);
  const s = r.siruri[0];
  assert.ok(s && !s.rapid);
  const q = perechi(s.puncte);
  // Pe hârtie: pasul 2·acos(1 − 0,0001) = 0,028284 rad, deci ⌈(π/2) / pas⌉ = 56 de coarde.
  assert.equal(q.length - 1, 56);
  assert.deepEqual(q[0], [10, 0]);
  assert.deepEqual(q.at(-1), [0, 10]);
  assert.ok(sageataMaxima(q, 0, 0, 10) <= 0.001 + 1e-12);
  for (const [x, y] of q) assert.ok(Math.abs(Math.hypot(x, y) - 10) < 1e-12);
  assert.ok((q[1]?.[1] ?? 0) > 0 && (q[1]?.[0] ?? 0) > 0, 'primul pas urcă în cadranul I');
});

test('același arc, orar: ocolește prin cadranele IV, III, II (trei sferturi), tot cu capetele exacte', () => {
  const q = perechi(siruriDinProgram([R(10, 0), A(0, 10, 0, 0, false)], 0.001).siruri[0]?.puncte ?? []);
  assert.ok(q.some(([, y]) => y < -9.99), 'trece pe la (0, −10)');
  assert.ok(q.some(([x]) => x < -9.99), 'trece pe la (−10, 0)');
  assert.deepEqual(q.at(-1), [0, 10]);
  assert.ok(sageataMaxima(q, 0, 0, 10) <= 0.001 + 1e-12);
});

test('cercul întreg (startul egal cu capătul) e închis, cu baleiaj 2π; elicea (Z în țintă) se desenează ca arcul ei', () => {
  const q = perechi(siruriDinProgram([R(25, 0), A(25, 0, 0, 0, true, -6)], 0.01).siruri[0]?.puncte ?? []);
  assert.deepEqual(q[0], [25, 0]);
  assert.deepEqual(q.at(-1), [25, 0]);
  assert.ok(q.some(([x]) => x < -24.99));
  assert.ok(sageataMaxima(q, 0, 0, 25) <= 0.01 + 1e-12);
});

test('bugetul: peste el, toleranța arcelor se dublează până încape (rărit); liniile singure peste buget rămân toate', () => {
  const cercuri: Miscare[] = [];
  for (let i = 0; i < 100; i++) cercuri.push(R(100 + i, 0), A(100 + i, 0, i, 0, true));
  const r = siruriInBuget(cercuri, 1e-5, 2000);
  assert.equal(r.rarit, true);
  assert.equal(r.pesteBuget, false);
  assert.ok(r.segmente <= 2000);
  assert.ok(r.toleranta > 1e-5);
  const lin: Miscare[] = [R(0, 0)];
  for (let i = 1; i <= 50; i++) lin.push(T(i, i % 2));
  const l = siruriInBuget(lin, 0.001, 10);
  assert.equal(l.segmente, 50);
  assert.equal(l.rarit, false);
  assert.equal(l.pesteBuget, true);
});

test('treptele de zoom: ½ px fizic la capătul de sus al treptei, deci cel mult ½ px și peste ¼ px oriunde în ea', () => {
  assert.deepEqual(tolerantaTreptei(10, 1), { treapta: 4, toleranta: 0.5 / 16 });
  assert.deepEqual(tolerantaTreptei(1000, 1.5), { treapta: 11, toleranta: 0.5 / 2048 });
  for (const scara of [0.01, 0.37, 1, 3.3, 10, 64, 100, 517, 1000]) {
    for (const dpr of [1, 1.25, 1.5, 2]) {
      const { toleranta } = tolerantaTreptei(scara, dpr);
      const px = toleranta * scara * dpr;
      assert.ok(px <= 0.5 && px > 0.25, `${scara} × ${dpr}: ${px} px`);
    }
  }
});

/** Vârfurile unei bucăți în lume (double) și ce încape în ea. */
function inLume(b: Bucata): Array<[number, number]> {
  const q: Array<[number, number]> = [];
  for (let i = 0; i + 1 < b.varfuri.length; i += 2) q.push([b.origine.x + (b.varfuri[i] as number), b.origine.y + (b.varfuri[i + 1] as number)]);
  return q;
}

test('bucățile: linia de 2 440 × 1 220 mm se taie în bucăți de cel mult 64 mm de la origine, legate, pe dreaptă la 1e-5 mm', () => {
  const r = siruriDinProgram([R(0, 0), T(2440, 1220)], 0.001);
  const b = bucatiDinSiruri(r.siruri).filter((x) => !x.rapid);
  assert.ok(b.length >= 2440 / INTINDERE_BUCATA);
  for (const x of b) {
    for (let i = 0; i < x.varfuri.length; i++) assert.ok(Math.abs(x.varfuri[i] as number) <= INTINDERE_BUCATA, 'în întindere');
    for (const [px, py] of inLume(x)) assert.ok(Math.abs(py - px / 2) < 1e-5, `pe dreaptă: ${px}, ${py}`);
  }
  for (let i = 1; i < b.length; i++) {
    const [ax, ay] = inLume(b[i - 1] as Bucata).at(-1) as [number, number];
    const [bx, by] = inLume(b[i] as Bucata)[0] as [number, number];
    assert.ok(Math.abs(ax - bx) < 1e-5 && Math.abs(ay - by) < 1e-5, `legate la ${i}`);
  }
  assert.deepEqual(inLume(b[0] as Bucata)[0], [0, 0]);
  const ultim = inLume(b.at(-1) as Bucata).at(-1) as [number, number];
  assert.ok(Math.abs(ultim[0] - 2440) < 1e-5 && Math.abs(ultim[1] - 1220) < 1e-5);
});

test('precizia relativă: la 2 440 mm de origine, vârful refăcut din bucată greșește de 10 ori mai puțin decât float32 în lume', () => {
  const P = { x: 2440.123456789, y: 1220.987654321 };
  const b = bucatiDinSiruri(siruriDinProgram([R(2400, 1200), T(P.x, P.y)], 0.001).siruri).filter((x) => !x.rapid);
  const [x, y] = inLume(b.at(-1) as Bucata).at(-1) as [number, number];
  const eroare = Math.hypot(x - P.x, y - P.y);
  const naiv = Math.hypot(Math.fround(P.x) - P.x, Math.fround(P.y) - P.y);
  assert.ok(eroare < 1e-5, `${eroare}`);
  assert.ok(eroare * 10 < naiv, `${eroare} față de ${naiv}`);
});

test('șirurile apropiate stau în aceeași bucată, despărțite de RESTART; indicii acoperă toate vârfurile, în ordine', () => {
  const r = siruriDinProgram([R(0, 0), T(10, 0), R(0, 5), T(10, 5)], 0.001);
  const b = bucatiDinSiruri(r.siruri);
  const t = b.filter((x) => !x.rapid);
  assert.equal(t.length, 1);
  const ind = [...(t[0] as Bucata).indici];
  assert.deepEqual(ind, [0, 1, RESTART, 2, 3]);
  assert.deepEqual(inLume(t[0] as Bucata), [[0, 0], [10, 0], [0, 5], [10, 5]]);
  assert.deepEqual((t[0] as Bucata).cutie, { minX: 0, minY: 0, maxX: 10, maxY: 5 });
  assert.equal(b.filter((x) => x.rapid).length, 1);
});
