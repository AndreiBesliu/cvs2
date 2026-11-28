/**
 * Câmpul conservativ și cota pe o bandă de rânduri (ADR 0323, 2a: memoria pe benzi; felia 18.1↑h-5). O finisare pe workere va da
 * fiecăruia doar banda de relief de care au nevoie liniile lui; ca programul să rămână același, octet cu octet, câmpul unei benzi
 * trebuie să fie, rând cu rând, cel de pe tot relieful (un nod al grilei de calcul citește doar celulele reliefului din jurul
 * lui), iar cota unui segment, aceeași, cât banda cuprinde tot ce e în raza frezei de el.
 *
 * Reliefuri la întâmplare (sămânță fixă), cu toate diviziunile (q = 1, 2, 4, 8, 16: celule de 1 mm … 0,0625 mm); câmpul pe benzi
 * oarecare, și la margini; cota, pe segmente la întâmplare, cu banda cât rândurile din raza frezei plus unul.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campPeCelula, cotaSegment, diviziune, pregateste, type FrezaFinisare, type ReliefCam } from '../../src/cam/reliefFinisare.ts';

function aleator(samanta: number): () => number {
  let s = samanta >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function relief(r: () => number, nx: number, ny: number, c: number): ReliefCam {
  const z = new Float64Array(nx * ny);
  for (let k = 0; k < z.length; k++) z[k] = r() < 0.1 ? -10 * r() : -2 * r();
  return { nx, ny, celula: c, z, m: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } };
}

test('câmpul pe o bandă de rânduri = rândurile lui din câmpul întreg, bit cu bit, la toate diviziunile', () => {
  const r = aleator(11);
  for (const c of [1, 0.5, 0.25, 0.125, 0.1, 0.05]) {
    const R = relief(r, 7, 9, c), q = diviziune(c), mx = R.nx * q, my = R.ny * q;
    const tot = campPeCelula(R.z, R.nx, R.ny, c, q);
    assert.equal(tot.length, mx * my);
    for (const [j0, j1] of [[0, my], [0, 1], [my - 1, my], [1, my - 1], [Math.floor(my / 3), Math.floor((2 * my) / 3) + 1]] as const) {
      const b = campPeCelula(R.z, R.nx, R.ny, c, q, j0, j1);
      assert.equal(b.length, mx * (j1 - j0), `c ${c}, banda ${j0}…${j1}`);
      for (let k = 0; k < b.length; k++) assert.ok(Object.is(b[k], tot[j0 * mx + k]), `c ${c}, banda ${j0}…${j1}, celula ${k}`);
    }
  }
});

test('cota pe o bandă care cuprinde raza frezei = cota pe tot relieful, bit cu bit', () => {
  const r = aleator(29);
  const FREZE: readonly FrezaFinisare[] = [{ fel: 'bila', raza: 1.5 }, { fel: 'plata', raza: 0.8 }, { fel: 'v', raza: 2, unghi: 90, varf: 0.3 }, { fel: 'toroidala', raza: 1.5, colt: 0.5 }];
  let n = 0;
  for (let caz = 0; caz < 16; caz++) {
    const c = [0.1, 0.25, 0.5, 1][caz % 4]!, R = relief(r, 10 + Math.floor(r() * 20), 10 + Math.floor(r() * 30), c);
    const f = FREZE[caz % FREZE.length]!, tot = pregateste(R), h = tot.h, W = R.nx * c, H = R.ny * c;
    for (let s = 0; s < 40; s++) {
      const ax = r() * W, ay = r() * H, L = s % 2 === 0 ? h : r() * 3, t = r() * 2 * Math.PI;
      const bx = ax + L * Math.cos(t), by = ay + L * Math.sin(t);
      // Banda: rândurile de calcul din raza frezei de segment, plus unul de fiecare parte.
      const j0 = Math.max(0, Math.floor((Math.min(ay, by) - f.raza) / h) - 1), j1 = Math.min(tot.my, Math.ceil((Math.max(ay, by) + f.raza) / h) + 1);
      const banda = pregateste(R, { j0, j1 });
      for (const perete of [false, true]) {
        const v = cotaSegment(banda, f, ax, ay, bx, by, perete), w = cotaSegment(tot, f, ax, ay, bx, by, perete);
        assert.ok(v === w, `cazul ${caz}, segmentul ${s}, banda ${j0}…${j1}: ${v} față de ${w}`);
        n++;
      }
    }
  }
  assert.equal(n, 16 * 40 * 2);
});

test('banda ține doar rândurile ei: memoria câmpului e cât banda', () => {
  const R = relief(aleator(3), 40, 400, 0.1), tot = pregateste(R), banda = pregateste(R, { j0: 100, j1: 140 });
  assert.equal(tot.P.niv[0]!.v.length, 80 * 800);
  assert.equal(banda.P.niv[0]!.v.length, 80 * 40);
});
