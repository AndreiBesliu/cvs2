import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  apropie, cuprinde, DISTANTA_MINIMA, fereastraFina, incadreaza, INCLINARE_MAXIMA, INCLINARE_MINIMA, LATURA_FINA, matrici, ochi,
  panorameaza, PRAG_FIN, rgb, roteste, subCursor, vizibil, type Camera, type Matrice, type Vec3, type ZonaNdc,
} from '../../src/app/vedere3dCalcul.ts';

/**
 * Camera vederii 3D (ADR 0057 §3): încadrarea (toate colțurile plăcii în zona liberă, la distanța cea mai mică), raza de sub
 * cursor, apropierea care ține punctul de sub cursor pe loc, panoramarea „apucată”, fereastra fină de 0,1 mm (§4).
 */

const proiecteaza = (pv: Matrice, p: Vec3): { readonly x: number; readonly y: number; readonly w: number } => {
  const w = pv[3]! * p.x + pv[7]! * p.y + pv[11]! * p.z + pv[15]!;
  return { x: (pv[0]! * p.x + pv[4]! * p.y + pv[8]! * p.z + pv[12]!) / w, y: (pv[1]! * p.x + pv[5]! * p.y + pv[9]! * p.z + pv[13]!) / w, w };
};
const centruZona = (z: ZonaNdc) => ({ x: (z.x0 + z.x1) / 2, y: (z.y0 + z.y1) / 2 });
const colturi = (f: { latime: number; inaltime: number; grosime: number }): Vec3[] =>
  [0, f.latime].flatMap((x) => [0, f.inaltime].flatMap((y) => [0, -f.grosime].map((z) => ({ x, y, z }))));

test('încadrarea: toate cele 8 colțuri în zonă (și una deplasată), iar puțin mai aproape unul iese', () => {
  for (const [foaie, aspect, zona] of [
    [{ latime: 300, inaltime: 200, grosime: 18 }, 1280 / 720, { x0: -0.6, y0: -0.9, x1: 0.6, y1: 0.4 }],
    [{ latime: 2440, inaltime: 1220, grosime: 18 }, 1.6, { x0: -1, y0: -1, x1: 1, y1: 1 }],
    [{ latime: 50, inaltime: 900, grosime: 40 }, 0.8, { x0: -0.2, y0: -1, x1: 1, y1: 0.7 }],
  ] as const) {
    const c = incadreaza(foaie, aspect, zona);
    assert.deepEqual(c.tinta, { x: foaie.latime / 2, y: foaie.inaltime / 2, z: 0 });
    const inZona = (cam: Camera) => {
      const { pv } = matrici(cam, aspect, centruZona(zona));
      return colturi(foaie).every((p) => {
        const q = proiecteaza(pv, p);
        return q.w > 0 && q.x >= zona.x0 && q.x <= zona.x1 && q.y >= zona.y0 && q.y <= zona.y1;
      });
    };
    assert.ok(inZona(c), `${foaie.latime} × ${foaie.inaltime}: încape`);
    assert.ok(!inZona({ ...c, distanta: c.distanta * 0.85 }), `${foaie.latime} × ${foaie.inaltime}: e cea mai apropiată (cu marginea)`);
  }
});

test('raza de sub cursor: un punct al feței, proiectat și citit înapoi, e același (și cu lentila deplasată)', () => {
  const c: Camera = { tinta: { x: 120, y: 80, z: 0 }, distanta: 260, giratie: 0.7, inclinare: 0.6 };
  for (const centru of [{ x: 0, y: 0 }, { x: 0.3, y: -0.2 }]) {
    const { pv } = matrici(c, 1.5, centru);
    for (const p of [{ x: 120, y: 80, z: 0 }, { x: 10, y: 150, z: 0 }, { x: 260, y: 20, z: 0 }]) {
      const q = proiecteaza(pv, p);
      const r = subCursor(pv, q.x, q.y);
      assert.ok(r);
      assert.ok(Math.abs(r.x - p.x) < 1e-6 && Math.abs(r.y - p.y) < 1e-6, `${p.x}, ${p.y} → ${r.x}, ${r.y}`);
    }
  }
  // Ținta e chiar în centrul imaginii (al zonei, cu lentila deplasată).
  const t = proiecteaza(matrici(c, 1.5, { x: 0.3, y: -0.2 }).pv, c.tinta);
  assert.ok(Math.abs(t.x - 0.3) < 1e-9 && Math.abs(t.y + 0.2) < 1e-9);
  // Cerul (deasupra orizontului) nu atinge fața.
  assert.equal(subCursor(matrici({ ...c, inclinare: INCLINARE_MINIMA }, 1.5).pv, 0, 0.99), null);
});

test('apropierea ține punctul de sub cursor pe loc; distanța se oprește la margini', () => {
  const c: Camera = { tinta: { x: 150, y: 100, z: 0 }, distanta: 400, giratie: -0.4, inclinare: 0.9 };
  const { pv } = matrici(c, 1.6);
  const p = subCursor(pv, 0.4, -0.3);
  assert.ok(p);
  for (const k of [0.5, 0.1, 1.7]) {
    const d = apropie(c, p, k);
    const q = proiecteaza(matrici(d, 1.6).pv, p);
    assert.ok(Math.abs(q.x - 0.4) < 1e-9 && Math.abs(q.y + 0.3) < 1e-9, `k = ${k}`);
    assert.ok(Math.abs(d.distanta - c.distanta * k) < 1e-9);
    assert.equal(d.giratie, c.giratie);
  }
  assert.equal(apropie(c, p, 1e-6).distanta, DISTANTA_MINIMA);
  assert.deepEqual(apropie(c, null, 0.5).tinta, c.tinta);
});

test('panoramarea: punctul apucat ajunge sub noua poziție a cursorului; rotirea ține înclinarea între margini', () => {
  const c: Camera = { tinta: { x: 150, y: 100, z: 0 }, distanta: 300, giratie: 0.3, inclinare: 1.1 };
  const pv = matrici(c, 1.4).pv;
  const de = subCursor(pv, -0.2, 0.1)!, la = subCursor(pv, 0.25, -0.15)!;
  const n = panorameaza(c, de, la);
  const q = proiecteaza(matrici(n, 1.4).pv, de);
  assert.ok(Math.abs(q.x - 0.25) < 1e-9 && Math.abs(q.y + 0.15) < 1e-9);
  assert.equal(roteste(c, 0, 1e6).inclinare, INCLINARE_MAXIMA);
  assert.equal(roteste(c, 0, -1e6).inclinare, INCLINARE_MINIMA);
  assert.ok(roteste(c, 100, 0).giratie < c.giratie);
  // Ochiul stă la distanța cerută de țintă, deasupra feței.
  const e = ochi(c);
  assert.ok(Math.abs(Math.hypot(e.x - 150, e.y - 100, e.z) - 300) < 1e-9 && e.z > 0);
});

test('fereastra fină: abia sub prag; latura 204,8 mm pe grila dalelor, cu ținta înăuntru, în placă; placa mică întreagă', () => {
  const foaie = { latime: 2440, inaltime: 1220 };
  const aproape = (d: number, x = 1000, y = 600): Camera => ({ tinta: { x, y, z: 0 }, distanta: d, giratie: 0, inclinare: 1 });
  const aspect = 1.6;
  // Distanța la care ce se vede atinge pragul.
  const dPrag = (PRAG_FIN * LATURA_FINA) / Math.max(vizibil(aproape(1), aspect).latime, vizibil(aproape(1), aspect).inaltime);
  assert.equal(fereastraFina(aproape(dPrag * 1.01), aspect, foaie, 0.25), null);
  const f = fereastraFina(aproape(dPrag * 0.99), aspect, foaie, 0.25);
  assert.ok(f);
  assert.equal(f.celula, 0.1);
  assert.ok(Math.abs(f.latime - 204.8) < 1e-9 && Math.abs(f.inaltime - 204.8) < 1e-9);
  for (const a of [f.x0, f.y0]) assert.ok(Math.abs(a / 1.6 - Math.round(a / 1.6)) < 1e-9, `${a} pe grila de 1,6 mm`);
  assert.ok(f.x0 <= 1000 && 1000 <= f.x0 + f.latime && f.y0 <= 600 && 600 <= f.y0 + f.inaltime);
  assert.ok(cuprinde(f, aproape(dPrag * 0.99), aspect, foaie));
  assert.ok(!cuprinde(f, aproape(dPrag * 0.99, 1150, 600), aspect, foaie));
  // La margine: fereastra rămâne în placă.
  const m = fereastraFina(aproape(30, 2435, 3), aspect, foaie, 0.25)!;
  assert.ok(m.x0 + m.latime <= 2440 + 1e-9 && m.y0 === 0);
  // Placa de 300 × 200: pe Y toată (200 ≤ 204,8); ținta în afara plăcii sau placa deja fină: nimic.
  const mica = fereastraFina(aproape(30, 150, 100), aspect, { latime: 300, inaltime: 200 }, 0.25)!;
  assert.deepEqual([mica.y0, mica.inaltime], [0, 200]);
  assert.equal(fereastraFina(aproape(30, -50, 100), aspect, { latime: 300, inaltime: 200 }, 0.25), null);
  assert.equal(fereastraFina(aproape(30, 150, 100), aspect, { latime: 300, inaltime: 200 }, 0.1), null);
});

test('culorile temei: #rrggbb, altfel implicitul', () => {
  assert.deepEqual(rgb(' #ff8000 ', [0, 0, 0]), [1, 128 / 255, 0]);
  assert.deepEqual(rgb('red', [0.1, 0.2, 0.3]), [0.1, 0.2, 0.3]);
});
