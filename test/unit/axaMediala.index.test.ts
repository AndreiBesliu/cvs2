import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexContururi } from '../../src/cam/axaMediala.ts';
import { cerculArcului, numarSegmente, segment, type Contur, type Punct, type Segment } from '../../src/geom/conturBaza.ts';
import { distantaLaContur, inRegiune, peArc, RIDICARE_RAZA } from '../../src/geom/distanta.ts';

// Indexul contururilor (`indexContururi`, ADR 0090; folosit de V-carve, de fundul plat, de inelele colțurilor) față de
// calculul direct, segment cu segment (`inRegiune`, `distantaLaContur`): interiorul și distanța trebuie să fie EXACT aceleași,
// oricât ar sări indexul. Viteza benzii (după unirea lui 12.1↑c): cercul unui arc ținut pe segment, iar segmentele benzii pe Y
// care nu pot fi tăiate de rază (la stânga punctului, deasupra sau dedesubtul ei) sărite după cutie.

/** Un generator determinist (mulberry32), ca fiecare rulare să judece aceleași contururi. */
function aleator(samanta: number): () => number {
  let s = samanta >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un contur stelat în jurul lui (cx, cy), cu linii, arce (bulge cu semn) și cubice amestecate. */
function contur(r: () => number, cx: number, cy: number, raza: number, n: number): Contur {
  const varfuri: { p: Punct; s: Segment }[] = [];
  for (let k = 0; k < n; k++) {
    const u = (2 * Math.PI * k) / n + (r() - 0.5) * (Math.PI / n);
    const R = raza * (0.45 + 0.55 * r());
    const p = { x: cx + R * Math.cos(u), y: cy + R * Math.sin(u) };
    const fel = r();
    let s: Segment;
    if (fel < 0.45) s = { tip: 'L' };
    else if (fel < 0.8) s = { tip: 'A', bulge: (r() < 0.5 ? -1 : 1) * (0.05 + 1.15 * r()) };
    else s = { tip: 'C', c1: { x: p.x + (r() - 0.5) * raza * 0.6, y: p.y + (r() - 0.5) * raza * 0.6 }, c2: { x: cx + (r() - 0.5) * raza, y: cy + (r() - 0.5) * raza } };
    varfuri.push({ p, s });
  }
  // Un vârf pe orizontala altuia: raza care trece prin el e cazul ridicării cu ε.
  if (n > 3) varfuri[2] = { ...varfuri[2]!, p: { x: varfuri[2]!.p.x, y: varfuri[0]!.p.y } };
  return { inchis: true, varfuri };
}

/** Punctele de judecat: la întâmplare, plus cele de la marginea cutiilor, pe capete, pe vârfurile cercurilor arcelor. */
function puncte(r: () => number, contururi: readonly Contur[]): Punct[] {
  const rez: Punct[] = [];
  for (let k = 0; k < 300; k++) rez.push({ x: -5 + 110 * r(), y: -5 + 110 * r() });
  for (const c of contururi) {
    for (let i = 0; i < numarSegmente(c); i++) {
      const { a, b, s } = segment(c, i);
      const dx = [-1e-6, -1e-9, 0, 1e-9, 1e-6];
      for (const e of dx) {
        rez.push({ x: a.x + e, y: a.y }, { x: a.x, y: a.y - RIDICARE_RAZA + e }, { x: Math.max(a.x, b.x) + e, y: (a.y + b.y) / 2 });
        rez.push({ x: Math.min(a.x, b.x) - 3 + e, y: a.y - RIDICARE_RAZA });
      }
      if (s.tip === 'A') {
        const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
        for (const u of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          if (!peArc(u, start, baleiaj)) continue;
          const x = centru.x + raza * Math.cos(u), y = centru.y + raza * Math.sin(u);
          for (const e of dx) rez.push({ x: x + e, y }, { x, y: y + e }, { x: x - 2, y: y - RIDICARE_RAZA + e }, { x: x + e, y: y - 0.3 });
        }
      }
    }
  }
  return rez;
}

test('indexul contururilor: interiorul și distanța, exact ca segment cu segment, pe linii, arce și cubice', () => {
  let judecate = 0, inauntru = 0;
  for (let samanta = 1; samanta <= 24; samanta++) {
    const r = aleator(samanta);
    const contururi = [
      contur(r, 35 + 30 * r(), 35 + 30 * r(), 30, 6 + Math.floor(r() * 14)),
      contur(r, 35 + 30 * r(), 35 + 30 * r(), 18, 4 + Math.floor(r() * 10)),
      contur(r, 20 + 60 * r(), 20 + 60 * r(), 8, 3 + Math.floor(r() * 6)),
    ];
    const iz = indexContururi(contururi);
    for (const p of puncte(r, contururi)) {
      const direct = inRegiune(p, contururi);
      assert.equal(iz.inauntru(p), direct, `sămânța ${samanta}, (${p.x}, ${p.y}): interiorul`);
      const d = Math.min(...contururi.map((c) => distantaLaContur(p, c)));
      assert.equal(iz.distanta(p), d, `sămânța ${samanta}, (${p.x}, ${p.y}): distanța`);
      const pana = iz.distanta(p, 0.5);
      if (d <= 0.5) assert.equal(pana, d, `sămânța ${samanta}, (${p.x}, ${p.y}): distanța până la 0,5`);
      else assert.ok(pana > 0.5, `sămânța ${samanta}, (${p.x}, ${p.y}): dincolo de 0,5`);
      judecate++;
      if (direct) inauntru++;
    }
  }
  // Proba judecă și înăuntru, și afară (nu doar una dintre ele).
  assert.ok(judecate > 10_000, `${judecate} puncte`);
  assert.ok(inauntru > judecate / 10 && inauntru < (judecate * 9) / 10, `${inauntru} din ${judecate} înăuntru`);
});
