/**
 * Pereții oracolului simulării (`judeca`, „PEREȚII”; `compara`) pe TREPTELE MICI, pe coordonate nerotunde: acolo
 * oracolul ratează fâșia de lângă marginea sculei îngropate (niciun eșantion nu o acoperă), exactul o taie la toată
 * adâncimea, iar regula veche (un vecin mai jos cu peste √2·celula·(1 + L) + 2·marja) nu vedea peretele dacă treapta e
 * mai mică decât pragul: un câmp exact dădea `maiJosPesteMarja`. Probele: aceeași treaptă pe o tăietură plată de 0,03 mm,
 * pe două adâncimi apropiate, pe coada unui V îngropat cu 0,05 mm și pe peretele exterior al unui arc; martorii (sub
 * marginea peretelui, lângă perete, pe panta V-ului) rămân prinși; apoi programe aleatoare de linii, față de un judecător
 * exact scris aici (minimul convex pe t, fără eșantioane).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campDinFunctie, compara, judeca, pantaUtila, type GrilaOracol, type RezultatOracol, type SculaOracol } from '../oracles/simulare.ts';
import { dArc, dSeg } from '../oracles/simulare.cazuri.ts';

const PRAG = 1e-5;
const FLAT6: SculaOracol = { tip: 'plata', diametru: 6 };
const V90: SculaOracol = { tip: 'v', diametru: 6, unghi: 90 };
const G: GrilaOracol = { x0: 0, y0: 0, latime: 20, inaltime: 10, celula: 0.05 };
/** Rândul de centre y = 5,025 (j = 100) e la R − 1 µm de traseu; startul în x nerotund: eșantioanele cad între centre. */
const Y_RAND = 5.025, J_RAND = 100;
const Y_LINIE = Y_RAND - (3 - 1e-6);

const program = (linii: readonly (readonly [number, number, number, number, number])[]): string =>
  ['G21 G90 G17', 'G0 Z5', ...linii.flatMap(([ax, ay, bx, by, z]) => ['G0 Z5', `G0 X${ax} Y${ay}`, `G1 Z${z}`, `G1 X${bx} Y${by}`]), 'G0 Z5'].join('\n') + '\n';

/** Celulele în care câmpul e sub oracol cu peste marjă + prag: alarmele, înainte de orice perete. */
function alarme(camp: ArrayLike<number>, o: RezultatOracol): number[] {
  const k: number[] = [];
  for (let i = 0; i < o.z.length; i++) if (camp[i]! < o.z[i]! - o.marja - PRAG) k.push(i);
  return k;
}

/** Cel mai mare salt spre un vecin (din cei 8) al celulelor date, în câmpul oracolului: ce vedea regula veche. */
function saltMax(o: RezultatOracol, celule: readonly number[]): number {
  let m = 0;
  for (const k of celule) {
    const i = k % o.nx, j = Math.floor(k / o.nx);
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const ii = i + di, jj = j + dj;
        if ((di || dj) && ii >= 0 && jj >= 0 && ii < o.nx && jj < o.ny) m = Math.max(m, o.z[k]! - o.z[jj * o.nx + ii]!);
      }
    }
  }
  return m;
}

const pragVechi = (o: RezultatOracol, s: SculaOracol): number => Math.SQRT2 * o.celula * (1 + pantaUtila(s, o.sus - o.varf, o.pas)) + 2 * o.marja;

test('treapta mică: freza plată la −0,03 pe coordonate nerotunde — exactul e sub oracol pe fâșie, compara îl pune pe perete', () => {
  const xa = 2.0031, xb = 17.0031;
  const o = judeca(program([[xa, Y_LINIE, xb, Y_LINIE, -0.03]]), G, FLAT6);
  const P = campDinFunctie(G, (x, y) => (dSeg(x, y, xa, Y_LINIE, xb, Y_LINIE) <= 3 ? -0.03 : 0));
  const A = alarme(P, o);
  // Fâșia ratată: rândul j = 100 între capete (măsurat: 300 de celule, toate cu oracolul la față).
  assert.ok(A.length > 100, `doar ${A.length} celule sub marjă: proba nu mai cade în fâșie`);
  assert.ok(A.every((k) => Math.floor(k / o.nx) === J_RAND && o.z[k] === 0), 'alarmele nu sunt pe rândul fâșiei');
  // Regula veche: saltul spre vecini e treapta (0,03), sub pragul ei (0,0707): niciun perete, deci `maiJosPesteMarja`.
  assert.ok(saltMax(o, A) < pragVechi(o, FLAT6), `saltul ${saltMax(o, A)} trece de pragul vechi ${pragVechi(o, FLAT6)}`);
  const c = compara(P, o, FLAT6);
  assert.deepEqual([c.maiSus, c.maiJosPesteMarja, c.pePerete], [0, 0, A.length]);

  // Martorii pe aceeași probă: o celulă de pe perete coborâtă sub marginea lui (treapta + 0,1 µm peste prag) și celula
  // de deasupra ei (y = 5,075, la 3,05 de traseu, în afara inelului) tăiată la −0,03 sunt prinse; restul rămân pe perete.
  const m = Float64Array.from(P);
  const k0 = A[A.length >> 1]!;
  m[k0] = -0.03 - PRAG - 1e-7;
  m[k0 + o.nx] = -0.03;
  const cm = compara(m, o, FLAT6);
  assert.deepEqual([cm.maiSus, cm.maiJosPesteMarja, cm.pePerete], [0, 2, A.length - 1]);
});

test('treapta mică între două adâncimi apropiate: −1 și −1,02, marginea celei de-a doua pe fundul primei', () => {
  // Prima trecere scoate banda 2 ≤ y ≤ 8 la −1; a doua (la −1,02) are marginea de sus la 1 µm peste rândul y = 6,025.
  const y2 = 6.025 - (3 - 1e-6);
  const L1 = [2.0017, 5, 17.9983, 5, -1] as const, L2 = [4.0031, y2, 15.0031, y2, -1.02] as const;
  const o = judeca(program([L1, L2]), G, FLAT6);
  const P = campDinFunctie(G, (x, y) => Math.min(dSeg(x, y, L1[0], L1[1], L1[2], L1[3]) <= 3 ? -1 : 0, dSeg(x, y, L2[0], L2[1], L2[2], L2[3]) <= 3 ? -1.02 : 0));
  const A = alarme(P, o);
  assert.ok(A.length > 50, `doar ${A.length} celule sub marjă`);
  assert.ok(A.every((k) => Math.floor(k / o.nx) === 120 && Math.abs(o.z[k]! + 1) < 1e-12), 'alarmele nu sunt pe fundul de −1, pe rândul fâșiei');
  assert.ok(saltMax(o, A) < pragVechi(o, FLAT6), `saltul ${saltMax(o, A)}, pragul vechi ${pragVechi(o, FLAT6)}`);
  const c = compara(P, o, FLAT6);
  assert.deepEqual([c.maiSus, c.maiJosPesteMarja, c.pePerete], [0, 0, A.length]);
});

test('treapta mică pe coada unui V90 îngropat cu 0,05 mm (h(R) = 3, adâncimea 3,05)', () => {
  const xa = 2.0031, xb = 17.0031;
  const o = judeca(program([[xa, Y_LINIE, xb, Y_LINIE, -3.05]]), G, V90);
  const P = campDinFunctie(G, (x, y) => { const d = dSeg(x, y, xa, Y_LINIE, xb, Y_LINIE); return d <= 3 ? Math.min(0, -3.05 + d) : 0; });
  const A = alarme(P, o);
  assert.ok(A.length > 100, `doar ${A.length} celule sub marjă`);
  // Exactul pe fâșie e coada: −0,05 + 1 µm; oracolul a rămas la față.
  assert.ok(A.every((k) => Math.floor(k / o.nx) === J_RAND && o.z[k] === 0), 'alarmele nu sunt pe rândul fâșiei');
  assert.ok(saltMax(o, A) < pragVechi(o, V90), `saltul ${saltMax(o, A)}, pragul vechi ${pragVechi(o, V90)}`);
  const c = compara(P, o, V90);
  assert.deepEqual([c.maiSus, c.maiJosPesteMarja, c.pePerete], [0, 0, A.length]);
  // Panta V-ului nu e perete: o celulă de pe peretele înclinat (la 1,5 mm de traseu) coborâtă cu marja + 1 µm e prinsă.
  const m = Float64Array.from(P);
  const k1 = Math.floor((Y_LINIE + 1.5) / G.celula) * o.nx + 200;
  m[k1] = o.z[k1]! - o.marja - PRAG - 1e-6;
  assert.equal(compara(m, o, V90).maiJosPesteMarja, 1);
});

test('treapta mică pe peretele exterior al unui arc: freza plată Ø2 la −0,05, celula (120, 120) la R − 1 µm de arc', () => {
  // Arcul G3 de rază 2, de la 30° la 150°, cu centrul ales așa încât centrul celulei (6,025; 6,025) să fie la 3 − 1 µm de
  // el, deasupra lui. Peretele exterior bombează spre celulă: coarda dintre două eșantioane e mai departe decât arcul,
  // deci pereții cer săgeata bucății (fără ea, celulele de aici intră în `maiJosPesteMarja`).
  const FLAT2: SculaOracol = { tip: 'plata', diametru: 2 };
  const g: GrilaOracol = { x0: 0, y0: 0, latime: 12, inaltime: 12, celula: 0.05 };
  const rho = 2, cx = 6.025, cy = 6.025 - (rho + 1 - 1e-6), a0 = 30, a1 = 150;
  const pol = (a: number): readonly [number, number] => [cx + rho * Math.cos((a * Math.PI) / 180), cy + rho * Math.sin((a * Math.PI) / 180)];
  const [sx, sy] = pol(a0), [ex, ey] = pol(a1);
  const o = judeca(`G21 G90 G17\nG0 Z5\nG0 X${sx} Y${sy}\nG1 Z-0.05\nG3 X${ex} Y${ey} I${cx - sx} J${cy - sy}\nG0 Z5\n`, g, FLAT2);
  const P = campDinFunctie(g, (x, y) => (dArc(x, y, cx, cy, rho, a0, a1) <= 1 ? -0.05 : 0));
  const A = alarme(P, o);
  assert.ok(A.includes(120 * o.nx + 120) && A.length >= 3, `alarmele: ${A.length}, celula (120, 120) la ${o.z[120 * o.nx + 120]}`);
  assert.ok(saltMax(o, A) < pragVechi(o, FLAT2), `saltul ${saltMax(o, A)}, pragul vechi ${pragVechi(o, FLAT2)}`);
  const c = compara(P, o, FLAT2);
  assert.deepEqual([c.maiSus, c.maiJosPesteMarja, c.pePerete], [0, 0, A.length]);
});

// ---------------------------------------------------------------------------------------------------------------
// Programe aleatoare de linii (rampe incluse) pe coordonate nerotunde, față de exact.

/** Silueta pe hârtie, independent de oracol: plata 0, bila R − √(R² − r²), V-ul r / tan(α/2). */
function hHartie(s: SculaOracol): (r: number) => number {
  const R = s.diametru / 2;
  if (s.tip === 'bila') return (r) => R - Math.sqrt(Math.max(0, R * R - r * r));
  if (s.tip === 'v') return (r) => r / Math.tan((s.unghi * Math.PI) / 360);
  return () => 0;
}

/**
 * Exactul pe celule pentru linii (a, b în 3D): pe fiecare linie, t ∈ [0, 1] cu distanța în XY ≤ R e un interval (rădăcinile
 * unei ecuații de gradul 2), iar z(t) + h(dist(t)) e convexă pe el (h convexă și nedescrescătoare, distanța convexă):
 * minimul prin căutare ternară. Fața e z = 0.
 */
function exactLinii(g: GrilaOracol, s: SculaOracol, linii: readonly (readonly [number, number, number, number, number, number])[]): Float64Array {
  const R = s.diametru / 2, h = hHartie(s), c = g.celula;
  const nx = Math.ceil(g.latime / c - 1e-9), ny = Math.ceil(g.inaltime / c - 1e-9);
  const E = new Float64Array(nx * ny);
  for (const [ax, ay, az, bx, by, bz] of linii) {
    const vx = bx - ax, vy = by - ay, a = vx * vx + vy * vy;
    // Celulele din dreptunghiul liniei lărgit cu R (și o celulă): dincolo, distanța trece de R.
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - R - g.x0) / c) - 1), i1 = Math.min(nx - 1, Math.ceil((Math.max(ax, bx) + R - g.x0) / c) + 1);
    const j0 = Math.max(0, Math.floor((Math.min(ay, by) - R - g.y0) / c) - 1), j1 = Math.min(ny - 1, Math.ceil((Math.max(ay, by) + R - g.y0) / c) + 1);
    for (let j = j0; j <= j1; j++) {
      const qy = g.y0 + (j + 0.5) * c;
      for (let i = i0; i <= i1; i++) {
        const qx = g.x0 + (i + 0.5) * c;
        const b = 2 * ((ax - qx) * vx + (ay - qy) * vy), cc = (ax - qx) ** 2 + (ay - qy) ** 2 - R * R;
        const D = b * b - 4 * a * cc;
        if (D < 0) continue;
        const lo = Math.max(0, (-b - Math.sqrt(D)) / (2 * a)), hi = Math.min(1, (-b + Math.sqrt(D)) / (2 * a));
        if (lo > hi) continue;
        const f = (t: number): number => az + (bz - az) * t + h(Math.min(R, Math.hypot(ax + vx * t - qx, ay + vy * t - qy)));
        let l = lo, r = hi;
        for (let it = 0; it < 100; it++) {
          const m1 = l + (r - l) / 3, m2 = r - (r - l) / 3;
          if (f(m1) <= f(m2)) r = m2;
          else l = m1;
        }
        const k = j * nx + i;
        E[k] = Math.min(E[k]!, f(lo), f(hi), f((l + r) / 2));
      }
    }
  }
  return E;
}

test('programe aleatoare de linii pe coordonate nerotunde (rampe, adâncimi apropiate, margini la 2 µm de un rând): față de exact, 0 mai sus și 0 sub marginea peretelui', () => {
  let seed = 20261019;
  const rnd = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const uni = (a: number, b: number): number => a + (b - a) * rnd();
  const nr = (v: number): number => Number(v.toFixed(6));
  const g: GrilaOracol = { x0: 0, y0: 0, latime: 12, inaltime: 12, celula: 0.05 };
  const scule: readonly SculaOracol[] = [FLAT6, { tip: 'plata', diametru: 2 }, { tip: 'bila', diametru: 4 }, V90];
  let pereti = 0;
  for (let p = 0; p < 8; p++) {
    const s = scule[p % scule.length]!, R = s.diametru / 2;
    const linii: (readonly [number, number, number, number, number, number])[] = [];
    let zPrec = -uni(0.02, 3);
    for (let m = 0; m < 2; m++) {
      let ax = uni(3, 9), ay = uni(3, 9), bx = uni(3, 9), by = uni(3, 9);
      if (rnd() < 0.5) {
        const yc = (40 + Math.floor(rnd() * 160) + 0.5) * g.celula;
        ay = by = yc - (R - uni(0, 2e-6)) * (rnd() < 0.5 ? 1 : -1);
        ax = uni(1.5, 4);
        bx = uni(8, 10.5);
      }
      const za = rnd() < 0.5 ? zPrec + uni(-0.04, 0.04) : -uni(0.02, 3.2);
      const zb = rnd() < 0.3 ? za - uni(-0.8, 0.8) : za;
      zPrec = zb;
      linii.push([nr(ax), nr(ay), nr(Math.min(-0.005, za)), nr(bx), nr(by), nr(Math.min(-0.005, zb))]);
    }
    const text = ['G21 G90 G17', 'G0 Z5', ...linii.flatMap(([ax, ay, az, bx, by, bz]) => ['G0 Z5', `G0 X${ax} Y${ay}`, `G1 Z${az}`, `G1 X${bx} Y${by} Z${bz}`]), 'G0 Z5'].join('\n') + '\n';
    const o = judeca(text, g, s);
    const E = exactLinii(g, s, linii);
    const c = compara(E, o, s);
    assert.equal(c.maiSus, 0, `programul ${p} (${s.tip} Ø${s.diametru}): exactul peste oracol pe ${c.maiSus} celule, max ${c.maiSusMax}\n${text}`);
    assert.equal(c.maiJosPesteMarja, 0, `programul ${p} (${s.tip} Ø${s.diametru}): exactul sub marjă în afara pereților pe ${c.maiJosPesteMarja} celule\n${text}`);
    pereti += c.pePerete;
  }
  assert.ok(pereti > 0, 'niciun program n-a pus exactul pe un perete: proba nu mai cade în fâșie');
});
