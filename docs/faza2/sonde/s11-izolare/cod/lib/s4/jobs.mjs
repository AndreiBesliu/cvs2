// jobs.mjs — joburile de măsurat (sintetice, dar cu forma unui job real). Deterministe (PRNG cu sămânță).
const L = (a, ax, ay, az, bx, by, bz) => a.push(0, ax, ay, az, bx, by, bz, 0, 0);
const A = (a, cw, ax, ay, az, bx, by, bz, cx, cy) => a.push(cw ? 2 : 3, ax, ay, az, bx, by, bz, cx, cy);
function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0) / 4294967296); }

// Placă 2440×1220×18: 24 de piese decupate (4 treceri, colțuri rotunjite = G3), 16 găuri/piesă
// frezate elicoidal, 12 buzunare cu inele (linii + arce), 12 zone de V-carve (mutări scurte, Z variabil).
export function job2d() {
  const prof = [], holes = [], pock = [], vc = [];
  const W = 380, Hh = 280, gx = 400, gy = 300, rc = 13; // traseul sculei: colț r=13
  const rnd = rng(7);
  for (let pr = 0; pr < 4; pr++) for (let pc = 0; pc < 6; pc++) {
    const x0 = 15 + pc * gx, y0 = 15 + pr * gy, x1 = x0 + W, y1 = y0 + Hh, pi = pr * 6 + pc;
    for (const z of [-4.6, -9.2, -13.8, -18.3]) {
      L(prof, x0 + rc, y0, z, x1 - rc, y0, z); A(prof, false, x1 - rc, y0, z, x1, y0 + rc, z, x1 - rc, y0 + rc);
      L(prof, x1, y0 + rc, z, x1, y1 - rc, z); A(prof, false, x1, y1 - rc, z, x1 - rc, y1, z, x1 - rc, y1 - rc);
      L(prof, x1 - rc, y1, z, x0 + rc, y1, z); A(prof, false, x0 + rc, y1, z, x0, y1 - rc, z, x0 + rc, y1 - rc);
      L(prof, x0, y1 - rc, z, x0, y0 + rc, z); A(prof, false, x0, y0 + rc, z, x0 + rc, y0, z, x0 + rc, y0 + rc);
    }
    for (let h = 0; h < 16; h++) { // gaură Ø8 cu freză Ø6: cerc r=1, 3 ture elicoidale + tură finală
      const cx = x0 + 30 + (h % 8) * 45, cy = h < 8 ? y0 + 25 : y1 - 25;
      let z = 0;
      for (let t = 0; t < 3; t++) { A(holes, false, cx + 1, cy, z, cx - 1, cy, z - 2.5, cx, cy); A(holes, false, cx - 1, cy, z - 2.5, cx + 1, cy, z - 5, cx, cy); z -= 5; }
      A(holes, false, cx + 1, cy, -15, cx - 1, cy, -15, cx, cy); A(holes, false, cx - 1, cy, -15, cx + 1, cy, -15, cx, cy);
    }
    if (pi % 2 === 0) { // buzunar 200×120 cu inele la pas 2,4 mm, 2 treceri
      const px0 = x0 + 90, py0 = y0 + 80, px1 = px0 + 200, py1 = py0 + 120;
      for (const z of [-3, -6]) for (let k = 0; k < 25; k++) {
        const o = 3 + k * 2.4, r = Math.max(0.5, 10 - k * 0.4);
        const a0 = px0 + o, b0 = py0 + o, a1 = px1 - o, b1 = py1 - o;
        if (a1 - a0 < 2 * r || b1 - b0 < 2 * r) break;
        L(pock, a0 + r, b0, z, a1 - r, b0, z); A(pock, false, a1 - r, b0, z, a1, b0 + r, z, a1 - r, b0 + r);
        L(pock, a1, b0 + r, z, a1, b1 - r, z); A(pock, false, a1, b1 - r, z, a1 - r, b1, z, a1 - r, b1 - r);
        L(pock, a1 - r, b1, z, a0 + r, b1, z); A(pock, false, a0 + r, b1, z, a0, b1 - r, z, a0 + r, b1 - r);
        L(pock, a0, b1 - r, z, a0, b0 + r, z); A(pock, false, a0, b0 + r, z, a0 + r, b0, z, a0 + r, b0 + r);
      }
    } else { // V-carve: 60 de "litere" a câte ~260 de mutări de 0,25 mm, adâncime 0,3..3 mm
      for (let s = 0; s < 60; s++) {
        let x = x0 + 40 + rnd() * 300, y = y0 + 40 + rnd() * 200, hd = rnd() * 6.283, ph = rnd() * 6.283, z = -0.3;
        for (let k = 0; k < 258; k++) {
          hd += (rnd() - 0.5) * 0.5; ph += 0.05;
          const nx = x + 0.25 * Math.cos(hd), ny = y + 0.25 * Math.sin(hd), nz = -0.3 - 2.7 * (0.5 + 0.5 * Math.sin(ph));
          L(vc, x, y, z, nx, ny, nz); x = nx; y = ny; z = nz;
        }
      }
    }
  }
  const ops = [
    { tool: { kind: 'flat', d: 6 }, moves: Float64Array.from(holes) },
    { tool: { kind: 'flat', d: 6 }, moves: Float64Array.from(pock) },
    { tool: { kind: 'v', d: 12, angle: 60 }, moves: Float64Array.from(vc) },
    { tool: { kind: 'flat', d: 6 }, moves: Float64Array.from(prof) },
  ];
  return { field: { x0: -5, y0: -5, w: 2450, h: 1230 }, ops };
}

// Rastru de finisare 3D: 300×300 mm, bilă Ø3, pas lateral 0,15, mutări de 0,12 mm => ~5 M mutări.
export function relief(x, y) { return -4 + 2.5 * Math.sin(x / 19) * Math.cos(y / 23) + 0.8 * Math.sin((x + 2 * y) / 7); }
export function job3d(lines = 2001, segs = 2500) {
  const pts = new Float64Array(lines * (segs + 1) * 3);
  let o = 0;
  for (let l = 0; l < lines; l++) {
    const y = l * 0.15;
    for (let s = 0; s <= segs; s++) {
      const x = (l % 2 === 0 ? s : segs - s) * 0.12;
      pts[o++] = x; pts[o++] = y; pts[o++] = relief(x, y);
    }
  }
  return { field: { x0: -2, y0: -2, w: 304, h: 304 }, ops: [{ tool: { kind: 'ball', d: 3 }, poly: pts }] };
}
export function countMoves(job) { let n = 0; for (const op of job.ops) n += op.poly ? op.poly.length / 3 - 1 : op.moves.length / 9; return n; }
