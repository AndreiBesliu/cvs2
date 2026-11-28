/**
 * Cota segmentului, exactă față de forța brută (ADR 0323, 1a: distanța la blocurile piramidei mai ieftină; felia 18.1↑h-4).
 * `cotaSegment` caută în piramida maximelor câmpului conservativ maximul, peste celulele lui din raza frezei, al câmpului minus
 * urcarea la distanța segment–celulă (ADR 0310 §4). Ramifică și taie, deci valoarea trebuie să fie aceeași, bit cu bit, cu a
 * parcurgerii tuturor celulelor: forța brută de aici ia fiecare celulă a nivelului 0, cu distanța exactă (`distSegmentCutie`),
 * plus celulele de sub capete la distanța 0 (pornirea căutării, o margine de jos tot conservativă: urcarea în 0 e cea mai mică).
 *
 * Reliefuri la întâmplare (o sămânță fixă, de 4 … 13 celule pe latură): aspre, cu goluri adânci, cu platouri egale (unde maximele se leagă), cu celule de
 * 0,1 … 1 mm; segmente scurte (cât o celulă de calcul) și lungi, în orice direcție, și pe lângă relief, și degenerate; toate
 * frezele (plata, bila, V-ul cu și fără vârf, toroidala). Segmentele se dau la rând pe același relief, ca în finisare: indiciul
 * de la segmentul dinainte doar pornește căutarea, nu schimbă valoarea.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cotaSegment, distSegmentCutie, pregateste, urcare, type FrezaFinisare, type Pregatit } from '../../src/cam/reliefFinisare.ts';

function aleator(samanta: number): () => number {
  let s = samanta >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Forța brută: fiecare celulă a nivelului 0, cu distanța exactă; plus celulele de sub capete, la distanța 0. */
function brut(p: Pregatit, f: FrezaFinisare, ax: number, ay: number, bx: number, by: number): number {
  const F = p.P.niv[0]!, h = p.h;
  let m = -Infinity;
  for (const [x, y] of [[ax, ay], [bx, by]] as const) {
    const i = Math.floor(x / h), j = Math.floor(y / h);
    if (i >= 0 && j >= 0 && i < p.mx && j < p.my) m = Math.max(m, F.v[j * F.w + i]! - urcare(f, 0));
  }
  for (let j = 0; j < p.my; j++) {
    for (let i = 0; i < p.mx; i++) {
      const d = distSegmentCutie(ax, ay, bx, by, i * h, j * h, Math.min((i + 1) * h, p.mx * h), Math.min((j + 1) * h, p.my * h));
      if (d <= f.raza) m = Math.max(m, F.v[j * F.w + i]! - urcare(f, d));
    }
  }
  return m;
}

const FREZE: readonly FrezaFinisare[] = [
  { fel: 'plata', raza: 1 }, { fel: 'bila', raza: 0.4 }, { fel: 'bila', raza: 1.5 }, { fel: 'bila', raza: 3 },
  { fel: 'v', raza: 2, unghi: 60, varf: 0 }, { fel: 'v', raza: 3, unghi: 90, varf: 0.5 }, { fel: 'toroidala', raza: 2, colt: 0.5 },
];

test('cota segmentului = forța brută, bit cu bit: reliefuri la întâmplare, segmente la rând, toate frezele', () => {
  const r = aleator(20261128);
  let n = 0, atinse = 0;
  for (let caz = 0; caz < 36; caz++) {
    const nx = 4 + Math.floor(r() * 10), ny = 4 + Math.floor(r() * 10), c = [0.1, 0.25, 0.5, 1][caz % 4]!;
    const fel = caz % 3, z = new Float64Array(nx * ny);
    for (let k = 0; k < z.length; k++) {
      // Aspru; cu goluri adânci; sau platouri egale (maximele se leagă).
      z[k] = fel === 0 ? -3 * r() : fel === 1 ? (r() < 0.15 ? -20 * r() : -0.5 * r()) : -Math.round(r() * 3);
    }
    const p = pregateste({ nx, ny, celula: c, z, m: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } });
    const f = FREZE[caz % FREZE.length]!, W = nx * c, H = ny * c, R = f.raza;
    for (let s = 0; s < 60; s++) {
      const ax = -R + r() * (W + 2 * R), ay = -R + r() * (H + 2 * R);
      const tip = s % 4, L = tip === 0 ? 0 : tip === 1 ? p.h : tip === 2 ? r() * 2 : r() * 8, t = r() * 2 * Math.PI;
      const bx = ax + L * Math.cos(t), by = ay + L * Math.sin(t);
      const v = cotaSegment(p, f, ax, ay, bx, by, false), b = brut(p, f, ax, ay, bx, by);
      // `===`: un platou la zero dă −0 pe o cale și 0 pe alta, aceeași cotă.
      assert.ok(v === b, `cazul ${caz}, segmentul ${s} (${f.fel} R${R}, c ${c}): ${v} față de ${b}`);
      n++;
      if (Number.isFinite(b)) atinse++;
    }
  }
  assert.equal(n, 36 * 60);
  assert.ok(atinse > 0.8 * n, `${atinse} segmente ating relieful`);
});

test('pe liniile unei finisări (segmente de o celulă de calcul, unul după altul), cota = forța brută', () => {
  const r = aleator(7), nx = 20, ny = 20, c = 0.25, z = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) z[j * nx + i] = -2 + Math.sin(i * 0.7) * Math.cos(j * 0.5) - 0.3 * r();
  const p = pregateste({ nx, ny, celula: c, z, m: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } });
  for (const f of FREZE) {
    for (let y = 0.125; y < ny * c; y += 1.25) {
      for (let x = 0; x + p.h <= nx * c; x += p.h) {
        const v = cotaSegment(p, f, x, y, x + p.h, y, false), b = brut(p, f, x, y, x + p.h, y);
        assert.ok(v === b, `${f.fel} R${f.raza} la (${x}, ${y}): ${v} față de ${b}`);
      }
    }
  }
});
