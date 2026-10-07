// oracle.mjs — ORACOLUL de referință (SONDĂ). ZERO importuri, niciun cod comun cu nucleul.
// Citește TEXTUL G-code-ului (G0/G1/G2/G3, I/J sau R, G90/G91, G20/G21, comentarii) și
// judecă brutal: grilă densă Float64, fiecare mutare eșantionată des (pas = cell/div), iar la
// fiecare eșantion se ia minimul siluetei sculei pe toate celulele din rază.
// Proprietate folosită la comparare: eșantionarea NU poate găsi un punct mai adânc decât
// minimul exact => oracol >= exact; diferența e mărginită de pasul de eșantionare.
// Scula se declară în text: (SCULA flat D=6) (SCULA ball D=6) (SCULA v D=12 A=90)
//                            (SCULA profile D=10 P=0:0,2:0,5:3)

function silueta(def) {
  const R = def.D / 2;
  if (def.tip === 'flat') return { R, z: (r) => 0 };
  if (def.tip === 'ball') return { R, z: (r) => R * (1 - Math.cos(Math.asin(Math.min(1, r / R)))) };
  if (def.tip === 'v') {
    const jum = (def.A / 2) * (Math.PI / 180);
    return { R, z: (r) => (r * Math.cos(jum)) / Math.sin(jum) };
  }
  if (def.tip === 'profile') {
    const P = def.P;
    return {
      R, z: (r) => {
        for (let i = 0; i + 1 < P.length; i++) {
          const [r0, h0] = P[i], [r1, h1] = P[i + 1];
          if (r <= r1) return h0 + ((r - r0) / (r1 - r0)) * (h1 - h0);
        }
        return P[P.length - 1][1];
      },
    };
  }
  throw new Error('oracol: sculă necunoscută ' + def.tip);
}

function citesteScula(com) {
  const m = /SCULA\s+(\w+)(.*)/i.exec(com);
  if (!m) return null;
  const def = { tip: m[1].toLowerCase() };
  for (const w of m[2].trim().split(/\s+/)) {
    const [k, v] = w.split('=');
    if (!k) continue;
    if (k.toUpperCase() === 'P') def.P = v.split(',').map((x) => x.split(':').map(Number));
    else def[k.toUpperCase()] = Number(v);
  }
  return def;
}

// Parser: întoarce o listă de mișcări în mm absolut, fiecare cu scula ei.
export function parseGcode(text) {
  const mutari = [];
  let abs = true, scara = 1, mod = 0, scula = null;
  let x = 0, y = 0, z = 50;
  for (let linie of text.split(/\r?\n/)) {
    // comentarii (...) și ;...
    let com = '';
    linie = linie.replace(/\(([^)]*)\)/g, (_, c) => { com += c + ' '; return ' '; });
    const sc = linie.indexOf(';');
    if (sc >= 0) { com += linie.slice(sc + 1); linie = linie.slice(0, sc); }
    const s = citesteScula(com);
    if (s) scula = s;
    const cuv = {};
    const gs = [];
    const re = /([A-Za-z])\s*([-+]?(?:\d+\.?\d*|\.\d+))/g;
    let mm;
    while ((mm = re.exec(linie))) {
      const L = mm[1].toUpperCase(), v = Number(mm[2]);
      if (L === 'G') gs.push(v); else cuv[L] = v;
    }
    for (const g of gs) {
      if (g === 90) abs = true; else if (g === 91) abs = false;
      else if (g === 20) scara = 25.4; else if (g === 21) scara = 1;
      else if (g === 0 || g === 1 || g === 2 || g === 3) mod = g;
    }
    const areAxa = 'X' in cuv || 'Y' in cuv || 'Z' in cuv;
    if (!areAxa) continue;
    const nx = 'X' in cuv ? (abs ? cuv.X * scara : x + cuv.X * scara) : x;
    const ny = 'Y' in cuv ? (abs ? cuv.Y * scara : y + cuv.Y * scara) : y;
    const nz = 'Z' in cuv ? (abs ? cuv.Z * scara : z + cuv.Z * scara) : z;
    if (mod === 0 || mod === 1) {
      mutari.push({ tip: 'L', a: [x, y, z], b: [nx, ny, nz], scula });
    } else {
      let cx, cy;
      if ('R' in cuv) {
        // forma R: centrul pe mediatoare; R<0 => arcul mare
        const r = cuv.R * scara, ar = Math.abs(r);
        const mx = (x + nx) / 2, my = (y + ny) / 2, qx = nx - x, qy = ny - y, q = Math.hypot(qx, qy);
        const hh = Math.sqrt(Math.max(0, ar * ar - (q / 2) * (q / 2)));
        // pentru G3 (trigonometric) cu arc mic, centrul e la stânga coardei
        let sgn = mod === 3 ? 1 : -1;
        if (r < 0) sgn = -sgn;
        cx = mx - (sgn * hh * qy) / q; cy = my + (sgn * hh * qx) / q;
      } else {
        cx = x + (cuv.I || 0) * scara; cy = y + (cuv.J || 0) * scara;
      }
      mutari.push({ tip: mod === 3 ? 'CCW' : 'CW', a: [x, y, z], b: [nx, ny, nz], c: [cx, cy], scula });
    }
    x = nx; y = ny; z = nz;
  }
  return mutari;
}

// Puncte de-a lungul unei mișcări, la pas <= pas (în XY; și în Z pentru plonjări).
function puncte(mv, pas) {
  const [x0, y0, z0] = mv.a, [x1, y1, z1] = mv.b;
  const out = [];
  if (mv.tip === 'L') {
    const len = Math.max(Math.hypot(x1 - x0, y1 - y0), Math.abs(z1 - z0));
    const n = Math.max(1, Math.ceil(len / pas));
    for (let i = 0; i <= n; i++) out.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, z0 + ((z1 - z0) * i) / n]);
    return out;
  }
  const [cx, cy] = mv.c;
  const r = Math.hypot(x0 - cx, y0 - cy);
  const u0 = Math.atan2(y0 - cy, x0 - cx);
  let u1 = Math.atan2(y1 - cy, x1 - cx);
  let unghi;
  const acelasi = Math.hypot(x1 - x0, y1 - y0) < 1e-9;
  if (mv.tip === 'CCW') { unghi = u1 - u0; while (unghi <= 0) unghi += 2 * Math.PI; if (acelasi) unghi = 2 * Math.PI; }
  else { unghi = u1 - u0; while (unghi >= 0) unghi -= 2 * Math.PI; if (acelasi) unghi = -2 * Math.PI; }
  const len = Math.max(Math.abs(unghi) * r, Math.abs(z1 - z0));
  const n = Math.max(1, Math.ceil(len / pas));
  for (let i = 0; i <= n; i++) {
    const u = u0 + (unghi * i) / n;
    out.push([cx + r * Math.cos(u), cy + r * Math.sin(u), z0 + ((z1 - z0) * i) / n]);
  }
  return out;
}

// Rularea brută: întoarce grila densă (Float64Array nx*ny, rând după rând).
export function judeca(text, { x0, y0, w, h, cell, top = 0, div = 8 }) {
  const nx = Math.ceil(w / cell - 1e-9), ny = Math.ceil(h / cell - 1e-9);
  const g = new Float64Array(nx * ny).fill(top);
  const pas = cell / div;
  let cache = null, cacheDef = null;
  for (const mv of parseGcode(text)) {
    if (mv.a[2] >= top && mv.b[2] >= top) continue;
    if (mv.scula !== cacheDef) { cacheDef = mv.scula; cache = silueta(mv.scula); }
    const S = cache, R = S.R;
    for (const [px, py, pz] of puncte(mv, pas)) {
      if (pz >= top) continue;
      // raza până la care silueta mai poate coborî sub suprafața plăcii (bisecție, h monotonă)
      let rmax = R;
      if (pz + S.z(R) > top) { let lo = 0, hi = R; for (let it = 0; it < 60; it++) { const mid = (lo + hi) / 2; if (pz + S.z(mid) > top) hi = mid; else lo = mid; } rmax = hi; }
      const ia = Math.max(0, Math.floor((px - rmax - x0) / cell)), ib = Math.min(nx - 1, Math.ceil((px + rmax - x0) / cell));
      const ja = Math.max(0, Math.floor((py - rmax - y0) / cell)), jb = Math.min(ny - 1, Math.ceil((py + rmax - y0) / cell));
      for (let j = ja; j <= jb; j++) {
        const yy = y0 + (j + 0.5) * cell - py;
        for (let i = ia; i <= ib; i++) {
          const xx = x0 + (i + 0.5) * cell - px;
          const r = Math.sqrt(xx * xx + yy * yy);
          if (r > R) continue;
          const zt = pz + S.z(r);
          const k = j * nx + i;
          if (zt < g[k]) g[k] = zt;
        }
      }
    }
  }
  return { nx, ny, g, pas };
}
