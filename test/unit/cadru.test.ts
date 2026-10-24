import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaugaLaSelectie, aleseInCadru, comutaInSelectie, felCadru } from '../../src/app/editareCalcul.ts';
import { arcAtinge, conturAtinge, cubicaAtinge, cuprinsaIn, dreaptaAtinge } from '../../src/geom/cadru.ts';
import { cerculArcului, conturCerc, conturDreptunghi, numarSegmente, segment, type Contur, type Punct } from '../../src/geom/conturBaza.ts';
import type { Cutie } from '../../src/geom/cutie.ts';
import type { Document } from '../../src/model/document.ts';
import { docDin, ID } from './ajutor-document.ts';

/**
 * Cadrul de selecție (ADR 0059): fereastra (trasă spre dreapta) alege formele cuprinse în întregime, intersecția (trasă
 * spre stânga) formele al căror contur îl atinge. Exact pe arce și pe cubice; un oracol independent, prin eșantionare
 * densă, judecă și contururi aleatoare.
 */

const R = (minX: number, minY: number, maxX: number, maxY: number): Cutie => ({ minX, minY, maxX, maxY });
const P = (x: number, y: number): Punct => ({ x, y });

test('segmentul drept: traversează, atinge o latură sau un colț, stă înăuntru, trece pe lângă colț', () => {
  const r = R(0, 0, 10, 10);
  assert.equal(dreaptaAtinge(P(-5, 5), P(15, 5), r), true);
  assert.equal(dreaptaAtinge(P(2, 2), P(3, 3), r), true);
  assert.equal(dreaptaAtinge(P(-5, 10), P(15, 10), r), true, 'pe latura de sus');
  assert.equal(dreaptaAtinge(P(-1, 11), P(11, -1), r), true, 'taie colțul');
  assert.equal(dreaptaAtinge(P(-1, 12), P(12, -1), r), true, 'trece prin (10, 1)');
  assert.equal(dreaptaAtinge(P(-2, 13), P(13, -2), r), true, 'x + y = 11 taie dreptunghiul între (1, 10) și (10, 1)');
  assert.equal(dreaptaAtinge(P(5, 16), P(16, 5), r), false, 'x + y = 21 trece pe lângă colțul (10, 10)');
  assert.equal(dreaptaAtinge(P(11, 0), P(11, 10), r), false, 'verticală în afară');
  assert.equal(dreaptaAtinge(P(5, 5), P(5, 5), r), true, 'un punct înăuntru');
  assert.equal(dreaptaAtinge(P(5, 15), P(5, 15), r), false, 'un punct afară');
});

test('arcul: cercul care taie dreptunghiul doar în afara baleiajului NU atinge; pe baleiaj atinge', () => {
  // Sfertul de cerc de rază 10 din (10, 0) în (0, 10), în jurul originii, trigonometric (bulge = tan(90°/4)).
  const b = Math.tan(Math.PI / 8);
  const a = P(10, 0), c = P(0, 10);
  assert.equal(arcAtinge(a, c, b, R(6, 6, 8, 8)), true, 'dreptunghiul peste arc, la 45°');
  assert.equal(arcAtinge(a, c, b, R(2, 2, 4, 4)), false, 'în interiorul cercului, fără margine');
  assert.equal(arcAtinge(a, c, b, R(-8, -8, -6, -6)), false, 'cercul trece prin dreptunghi, dar la 225°, în afara sfertului');
  assert.equal(arcAtinge(c, a, -b, R(6, 6, 8, 8)), true, 'același arc, parcurs invers');
  // Sfertul complementar (270°: din (10, 0) în (0, 10) pe partea cealaltă) trece prin 225°.
  const mare = Math.tan((3 * Math.PI) / 8);
  assert.equal(arcAtinge(c, a, mare, R(-8, -8, -6, -6)), true, 'arcul mare trece prin 225°');
  assert.equal(arcAtinge(c, a, mare, R(6, 6, 8, 8)), false, 'arcul mare ocolește 45°');
  assert.equal(arcAtinge(a, c, 0, R(4, 4, 6, 6)), true, 'bulge 0 e coarda');
});

test('cubica: dreptunghiul din învelitoarea poligonului de control, dar lângă curbă, nu o atinge; peste ea, da', () => {
  // Arcul cubic din (0, 0) în (10, 0), cu control la înălțimea 10: vârful curbei e la y = 7,5.
  const a = P(0, 0), c1 = P(0, 10), c2 = P(10, 10), b = P(10, 0);
  assert.equal(cubicaAtinge(a, c1, c2, b, R(4, 8, 6, 9.5)), false, 'deasupra vârfului (7,5), sub controale');
  assert.equal(cubicaAtinge(a, c1, c2, b, R(4, 7, 6, 8)), true, 'peste vârf');
  assert.equal(cubicaAtinge(a, c1, c2, b, R(4, 7.5000001, 6, 9)), false, 'chiar deasupra vârfului');
  assert.equal(cubicaAtinge(a, c1, c2, b, R(4, 7.5, 6, 9)), true, 'latura de jos pe vârf');
});

test('conturul: colțul rotunjit al dreptunghiului și cercul, după contur, nu după cutie', () => {
  const d = conturDreptunghi(0, 0, 100, 60, 10);
  assert.equal(conturAtinge(d, R(0, 0, 2, 2)), false, 'colțul cutiei, în afara arcului de rază 10');
  assert.equal(conturAtinge(d, R(1, 1, 4, 4)), true, 'peste arcul colțului (2,93; 2,93)');
  assert.equal(conturAtinge(d, R(40, 20, 60, 40)), false, 'în mijlocul dreptunghiului, fără margine');
  const c = conturCerc(50, 50, 20);
  assert.equal(conturAtinge(c, R(30, 30, 33, 33)), false, 'colțul cutiei cercului');
  assert.equal(conturAtinge(c, R(55, 55, 85, 85)), true);
  assert.equal(conturAtinge({ inchis: false, varfuri: [{ p: P(0, 0), s: { tip: 'L' } }, { p: P(10, 10), s: { tip: 'L' } }] }, R(4, 4, 5, 5)), true);
});

/** Un PRNG cu sămânță (mulberry32): aceleași contururi la fiecare rulare. */
function aleator(samanta: number): () => number {
  let s = samanta >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Punctele conturului, dese (oracolul: fără nicio funcție din `cadru.ts`). */
function esantioane(c: Contur, pe: number): Punct[] {
  const out: Punct[] = [];
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    for (let k = 0; k <= pe; k++) {
      const t = k / pe;
      if (s.tip === 'L' || (s.tip === 'A' && Math.abs(s.bulge) < 1e-12)) out.push(P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t));
      else if (s.tip === 'A') {
        const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
        const u = start + baleiaj * t;
        out.push(P(centru.x + raza * Math.cos(u), centru.y + raza * Math.sin(u)));
      } else {
        const m = 1 - t;
        out.push(P(m * m * m * a.x + 3 * m * m * t * s.c1.x + 3 * m * t * t * s.c2.x + t * t * t * b.x,
          m * m * m * a.y + 3 * m * m * t * s.c1.y + 3 * m * t * t * s.c2.y + t * t * t * b.y));
      }
    }
  }
  return out;
}

/** Distanța de la un punct la dreptunghiul plin (0 înăuntru) și adâncimea în el (negativă afară). */
const distanta = (p: Punct, r: Cutie): number => Math.hypot(Math.max(r.minX - p.x, 0, p.x - r.maxX), Math.max(r.minY - p.y, 0, p.y - r.maxY));
const adancime = (p: Punct, r: Cutie): number => Math.min(p.x - r.minX, r.maxX - p.x, p.y - r.minY, r.maxY - p.y);

test('oracolul prin eșantionare: 2 000 de contururi aleatoare (linii, arce, cubice) și dreptunghiuri, aceeași judecată', () => {
  const rnd = aleator(0x3a);
  let atinse = 0, neatinse = 0, nehotarate = 0;
  for (let k = 0; k < 2000; k++) {
    const n = 2 + Math.floor(rnd() * 4);
    const varfuri = Array.from({ length: n }, () => {
      const p = P(rnd() * 100, rnd() * 100), alege = rnd();
      const s = alege < 0.4 ? { tip: 'L' as const } : alege < 0.75 ? { tip: 'A' as const, bulge: (rnd() - 0.5) * 3 }
        : { tip: 'C' as const, c1: P(rnd() * 120 - 10, rnd() * 120 - 10), c2: P(rnd() * 120 - 10, rnd() * 120 - 10) };
      return { p, s };
    });
    const c: Contur = { inchis: rnd() < 0.5, varfuri };
    const x = rnd() * 100, y = rnd() * 100, w = 1 + rnd() * 30, h = 1 + rnd() * 30;
    const r = R(x, y, x + w, y + h);
    const pct = esantioane(c, 400);
    const departe = Math.min(...pct.map((p) => distanta(p, r)));
    const inauntru = Math.max(...pct.map((p) => adancime(p, r)));
    const judecat = conturAtinge(c, r);
    if (inauntru > 0.05) {
      assert.equal(judecat, true, `#${k}: un punct e la ${inauntru} mm înăuntru`);
      atinse++;
    } else if (departe > 0.05) {
      assert.equal(judecat, false, `#${k}: conturul e la ${departe} mm de dreptunghi`);
      neatinse++;
    } else nehotarate++;
  }
  assert.ok(atinse > 400 && neatinse > 400, `atinse ${atinse}, neatinse ${neatinse}, nehotărâte ${nehotarate}`);
});

/** Foaia: dreptunghiul r (100 × 60 din 20, 20), cercul c (R 15 în 200, 50), piesa p din două dreptunghiuri (în 300, 20 și 340, 20). */
function doc(): Document {
  const d = docDin({ latime: 600, inaltime: 300, grosime: 18 },
    { id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'c', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 200, f: 50 } });
  const foaie = d.foi[0]!;
  const element = (id: string, x: number) => ({ tip: 'element' as const, id, forma: { tip: 'dreptunghi' as const, latime: 20, inaltime: 20, razaColt: 0 }, matrice: { ...ID, e: x, f: 0 } });
  return {
    ...d,
    piese: [...d.piese, { id: 'p', radacina: { tip: 'grup', id: 'p', matrice: ID, copii: [element('p1', 0), element('p2', 40)] }, operatii: [] }],
    foi: [{ ...foaie, instante: [...foaie.instante, { id: 'p', piesa: 'p', x: 300, y: 20, rotire: 0 }] }],
  };
}

test('fereastra: doar formele cuprinse în întregime (și toate contururile unei piese); intersecția: tot ce atinge conturul', () => {
  const d = doc();
  assert.deepEqual(aleseInCadru(d, R(10, 10, 130, 90), 'fereastra'), ['r']);
  assert.deepEqual(aleseInCadru(d, R(10, 10, 100, 90), 'fereastra'), [], 'dreptunghiul doar pe jumătate');
  assert.deepEqual(aleseInCadru(d, R(10, 10, 230, 90), 'fereastra'), ['r', 'c']);
  assert.deepEqual(aleseInCadru(d, R(290, 10, 330, 50), 'fereastra'), [], 'doar un contur al piesei');
  assert.deepEqual(aleseInCadru(d, R(290, 10, 370, 50), 'fereastra'), ['p']);
  assert.deepEqual(aleseInCadru(d, R(100, 40, 180, 60), 'intersectie'), ['r'], 'atinge latura dreaptă a dreptunghiului (cercul începe la 185)');
  assert.deepEqual(aleseInCadru(d, R(100, 40, 186, 60), 'intersectie'), ['r', 'c'], 'și marginea cercului');
  assert.deepEqual(aleseInCadru(d, R(195, 45, 205, 55), 'intersectie'), [], 'în cerc, fără margine');
  assert.deepEqual(aleseInCadru(d, R(185, 34, 187, 36), 'intersectie'), [], 'colțul cutiei cercului');
  assert.deepEqual(aleseInCadru(d, R(110, 30, 350, 35), 'intersectie'), ['r', 'c', 'p'], 'o bandă care le taie pe toate');
  assert.deepEqual(aleseInCadru(d, R(355, 0, 357, 100), 'intersectie'), ['p'], 'un singur contur al piesei ajunge');
});

test('sensul tragerii alege felul; Shift adaugă și comută, fără dubluri', () => {
  assert.equal(felCadru(10, 50), 'fereastra');
  assert.equal(felCadru(50, 10), 'intersectie');
  assert.equal(felCadru(10, 10), 'fereastra');
  assert.deepEqual(adaugaLaSelectie(['a', 'b'], ['b', 'c']), ['a', 'b', 'c']);
  assert.deepEqual(comutaInSelectie(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(comutaInSelectie(['a'], 'c'), ['a', 'c']);
  assert.equal(cuprinsaIn(R(1, 1, 2, 2), R(1, 1, 2, 2)), true, 'marginea inclusă');
});
