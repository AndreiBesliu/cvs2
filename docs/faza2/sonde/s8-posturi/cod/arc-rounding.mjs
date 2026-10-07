// Sonda s8-posturi (aruncabila). Intrebarea: cate zecimale si ce prag de coarda trebuie sa aiba un post
// ca un arc G2/G3 scris in text sa treaca verificarea de capat a GRBL (error:33) si sa nu se
// transforme intr-un cerc intreg dupa rotunjire.
//
// Regula GRBL 1.1 (citita din gnea/grbl grbl/gcode.c, re-scrisa aici, fara cod comun):
//   r = hypot(I, J); target_r = |capat - (start + IJ)|; delta = |target_r - r|
//   eroare 33 daca delta > 0.005 && (delta > 0.5 || delta > 0.001 * r)   [toate in mm, G20 se converteste]
// Regula unghiului (grbl/motion_control.c, mc_arc): unghiul = atan2(cross, dot) intre vectorii centru->start
// si centru->capat; la CW, daca unghiul >= -5e-7 se scade 2*pi; la CCW, daca <= 5e-7 se aduna 2*pi.
// Deci un arc mic al carui capat rotunjit cade pe start sau "in spate" devine cerc intreg.
//
// Oracolul: geometria exacta a arcului (centru, raza, unghiuri), calculata inainte de orice rotunjire, si
// marginea analitica (strategia B): delta <= |eS| + |eE| + 2|eC| <= 4 * (sqrt(2)/2) * 10^-d = 2.83 * 10^-d, si
// "rasturnarea" cere coarda <= ~sqrt(2) * 10^-d. Simularea trebuie sa ramana sub aceste margini.

const MM_PER_INCH = 25.4;
const EPS = 5e-7;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fmt = (v, d) => v.toFixed(d); // ce scrie postul in fisier
const rd = (s) => Number(s); // ce citeste controlerul (parse independent de formatare)

function runConfig({ unit, d, strategy, n, seed, minChordRes, minSweepRad = 0, f32 = false }) {
  const F = f32 ? Math.fround : (v) => v; // controlerul calculeaza in float32
  const rnd = mulberry32(seed);
  const scale = unit === 'inch' ? MM_PER_INCH : 1; // fisier -> mm
  const res = Math.pow(10, -d) * scale; // rezolutia in mm
  let err33 = 0, flips = 0, skipped = 0, maxDelta = 0, maxDev = 0, n33small = 0;
  for (let k = 0; k < n; k++) {
    // raza log-uniforma 0.005 .. 2440 mm, centru pe o placa 2440 x 2440, unghiuri oarecare
    const r = 0.005 * Math.pow(2440 / 0.005, rnd());
    const cx = 2440 * rnd(), cy = 2440 * rnd();
    const a0 = 2 * Math.PI * rnd();
    const sweepDeg = 1e-5 * Math.pow(359.99 / 1e-5, rnd()); // 0.00001 .. 359.99 grade
    const cw = rnd() < 0.5;
    const s = (sweepDeg * Math.PI) / 180 * (cw ? -1 : 1);
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a0 + s), y1 = cy + r * Math.sin(a0 + s);
    const chord = Math.hypot(x1 - x0, y1 - y0);
    if (minChordRes > 0 && chord < minChordRes * res) { skipped++; continue; } // postul scrie G1
    if (minSweepRad > 0 && Math.abs(s) < minSweepRad) { skipped++; continue; } // la fel
    // textul (in unitatea fisierului)
    const X0 = fmt(x0 / scale, d), Y0 = fmt(y0 / scale, d);
    const X1 = fmt(x1 / scale, d), Y1 = fmt(y1 / scale, d);
    let I, J;
    if (strategy === 'A') { I = fmt((cx - x0) / scale, d); J = fmt((cy - y0) / scale, d); }
    else { I = fmt(cx / scale - rd(X0), d); J = fmt(cy / scale - rd(Y0), d); }
    // ce vede controlerul, in mm
    const sx = F(F(rd(X0)) * scale), sy = F(F(rd(Y0)) * scale), ex = F(F(rd(X1)) * scale), ey = F(F(rd(Y1)) * scale);
    const ii = F(F(rd(I)) * scale), jj = F(F(rd(J)) * scale);
    const ccx = F(sx + ii), ccy = F(sy + jj);
    const rc = F(Math.hypot(ii, jj));
    const targetR = F(Math.hypot(F(ex - ccx), F(ey - ccy)));
    const delta = Math.abs(F(targetR - rc));
    if (delta > maxDelta) maxDelta = delta;
    if (delta > 0.005 && (delta > 0.5 || delta > 0.001 * rc)) { err33++; if (r < 5) n33small++; continue; }
    // unghiul calculat ca in mc_arc
    // GRBL: r_axis = -IJ (vectorul centru->start), rt = capat - centru
    const r0x = -ii, r0y = -jj, rtx = F(ex - ccx), rty = F(ey - ccy);
    let ang = F(Math.atan2(F(F(r0x * rty) - F(r0y * rtx)), F(F(r0x * rtx) + F(r0y * rty))));
    if (cw) { if (ang >= -EPS) ang -= 2 * Math.PI; } else { if (ang <= EPS) ang += 2 * Math.PI; }
    if (Math.abs(ang - s) > Math.PI) { flips++; continue; }
    // abaterea drumului trasat fata de arcul exact (aprox.: deplasarea centrului + diferenta de raza)
    const dev = Math.hypot(ccx - cx, ccy - cy) + Math.abs(rc - r);
    if (dev > maxDev) maxDev = dev;
  }
  return { unit, d, strategy, minChordRes, minSweepRad, f32, n, skipped, err33, n33small, flips, maxDelta, maxDev, res };
}

const N = Number(process.argv[2] || 200000);
const configs = [];
for (const strategy of ['A', 'B']) {
  for (const d of [2, 3, 4]) configs.push({ unit: 'mm', d, strategy, n: N, seed: 1000 + d, minChordRes: 0 });
  for (const d of [3, 4, 5, 6]) configs.push({ unit: 'inch', d, strategy, n: N, seed: 2000 + d, minChordRes: 0 });
}
// acelasi lucru, dar postul refuza arcele cu coarda < 10 rezolutii (le scrie G1)
for (const d of [3, 4]) configs.push({ unit: 'mm', d, strategy: 'B', n: N, seed: 1000 + d, minChordRes: 10 });
for (const d of [4, 5]) configs.push({ unit: 'inch', d, strategy: 'B', n: N, seed: 2000 + d, minChordRes: 10 });

// garda completa: coarda >= 10 rezolutii SI unghi >= 1e-4 rad (de 200 de ori peste EPS-ul GRBL), in float32
for (const d of [3, 4]) configs.push({ unit: 'mm', d, strategy: 'B', n: N, seed: 1000 + d, minChordRes: 10, minSweepRad: 1e-4, f32: true });
for (const d of [4, 5]) configs.push({ unit: 'inch', d, strategy: 'B', n: N, seed: 2000 + d, minChordRes: 10, minSweepRad: 1e-4, f32: true });
// fara garzi, dar in float32, ca sa se vada efectul preciziei controlerului
configs.push({ unit: 'mm', d: 3, strategy: 'B', n: N, seed: 1003, minChordRes: 0, f32: true });

const t0 = performance.now();
const rows = configs.map(runConfig);
const ms = performance.now() - t0;
console.log('unit dec strat chord>=res sweep>=rad f32      n      G1   err33(r<5mm)   flips   maxDelta_mm  maxDev_mm   margine_hartie_mm(2.83*rez)');
for (const r of rows) {
  console.log(
    [r.unit.padEnd(4), String(r.d).padStart(3), r.strategy.padStart(5), String(r.minChordRes).padStart(13),
      String(r.minSweepRad).padStart(10), (r.f32 ? 'da' : 'nu').padStart(3), String(r.n).padStart(7), String(r.skipped).padStart(6), `${r.err33}(${r.n33small})`.padStart(14),
      String(r.flips).padStart(7), r.maxDelta.toExponential(2).padStart(12), r.maxDev.toExponential(2).padStart(10),
      (2 * Math.SQRT2 * r.res).toExponential(2).padStart(15)].join(' ')
  );
}
console.log(`timp total ${ms.toFixed(0)} ms (${rows.length} configuratii x ${N} arce)`);
