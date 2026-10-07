// Postul: IR (trasee 3D pe treceri) -> text G-code GRBL, cu potrivire de arce G2/G3 (XY circular, Z liniar pe unghi).
import { order } from './vcarve.mjs';

function circ(a, b, c) {
  const bx = b[0] - a[0], by = b[1] - a[1], cx = c[0] - a[0], cy = c[1] - a[1]; const D = 2 * (bx * cy - by * cx); if (Math.abs(D) < 1e-14) return null;
  const b2 = bx * bx + by * by, c2 = cx * cx + cy * cy; const ux = (cy * b2 - by * c2) / D, uy = (bx * c2 - cx * b2) / D; return [a[0] + ux, a[1] + uy, Math.hypot(ux, uy)];
}
function tryArc(P, i, j, tol, zFloor) {
  const m = (i + j) >> 1; const C = circ(P[i], P[m], P[j]); if (!C || C[2] > 2000 || C[2] < 0.005) return null;
  const [cx, cy, R] = C; const ang = (p) => Math.atan2(p[1] - cy, p[0] - cx);
  const dir = Math.sign((P[m][0] - P[i][0]) * (P[j][1] - P[i][1]) - (P[m][1] - P[i][1]) * (P[j][0] - P[i][0])) > 0 ? 1 : -1; // 1 = trigonometric (G3): mijlocul arcului e la dreapta coardei
  const phi = [0]; let a0 = ang(P[i]);
  for (let k = i + 1; k <= j; k++) { let d = ang(P[k]) - ang(P[k - 1]); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (Math.sign(d) !== dir && Math.abs(d) > 1e-12) return null; phi.push(phi[phi.length - 1] + d); }
  const tot = phi[phi.length - 1]; if (Math.abs(tot) > 2 * Math.PI - 1e-3 || Math.abs(tot) < 1e-6) return null;
  for (let k = i; k <= j; k++) { const p = P[k]; if (Math.abs(Math.hypot(p[0] - cx, p[1] - cy) - R) > tol) return null;
    const zl = P[i][2] + (P[j][2] - P[i][2]) * phi[k - i] / tot; if (Math.abs(zl - p[2]) > tol) return null;
    if (k > i) { const c = Math.hypot(p[0] - P[k - 1][0], p[1] - P[k - 1][1]); if (c * c / (8 * R) > tol + 0.004) return null; } }
  if (zFloor) { // garda: arcul nu are voie sa coboare sub suprafata ideala (nici o sapatura din toleranta arcului)
    const a0 = Math.atan2(P[i][1] - cy, P[i][0] - cx);
    for (let q = 1; q < 16; q++) { const f = q / 16; const a = a0 + tot * f; const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a); const z = P[i][2] + (P[j][2] - P[i][2]) * f; if (z < zFloor(x, y) - 0.0005) return null; } }
  return { cx, cy, R, dir };
}
const f4 = (v) => { const s = v.toFixed(4); return s === '-0.0000' ? '0.0000' : s; };

export function toGcode(ir, P) {
  const tolArc = P.tolArc ?? 0.003; const safe = 5; const L = ['(sonda s3-vcarve: V-carve pe axa mediala)', 'G21 G90 G17 G94'];
  let arcs = 0, lines = 0, rapids = 0, plunges = 0, cutLen = 0;
  let at = null;
  for (const op of ir.ops) {
    L.push(`T${op.tool} M6`, 'M3 S18000', `G0 Z${safe}`); at = null; const zf = op.tool === 1 ? P.zFloor : null;
    for (const pass of op.passes) {
      for (const path of order(pass.paths)) {
        const s = path[0];
        if (!at || Math.hypot(at[0] - s[0], at[1] - s[1]) > 1e-7 || Math.abs(at[2] - s[2]) > 1e-7) {
          if (at) { L.push(`G0 Z${safe}`); rapids++; }
          L.push(`G0 X${f4(s[0])} Y${f4(s[1])}`); rapids++;
          L.push(`G1 Z${f4(s[2])} F300`); plunges++;
        }
        let i = 0; const n = path.length;
        if (n === 1) { at = s; continue; }
        while (i < n - 1) {
          let best = null, bj = i + 1;
          if (n - i >= 4) { let lastOk = null, lastJ = -1;
            // cautare pe lungimi crescatoare (x1,5): 4 puncte coliniare nu opresc un arc lung
            for (let span = 3; ; span = Math.ceil(span * 1.5)) { const j = Math.min(n - 1, i + span); const a = tryArc(path, i, j, tolArc, zf); if (a) { lastOk = a; lastJ = j; } if (j === n - 1) break; }
            if (lastOk) { // rafinare liniara in sus de la lastJ
              let jj = lastJ + 1; while (jj < n) { const a = tryArc(path, i, jj, tolArc, zf); if (!a) break; lastOk = a; lastJ = jj; jj++; }
              best = lastOk; bj = lastJ; } }
          const e = path[bj];
          if (best) { const p0 = path[i]; L.push(`G${best.dir > 0 ? 3 : 2} X${f4(e[0])} Y${f4(e[1])} Z${f4(e[2])} I${f4(best.cx - p0[0])} J${f4(best.cy - p0[1])} F1000`); arcs++; }
          else { L.push(`G1 X${f4(e[0])} Y${f4(e[1])} Z${f4(e[2])} F1000`); lines++; }
          for (let k = i + 1; k <= bj; k++) cutLen += Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1], path[k][2] - path[k - 1][2]);
          i = bj;
        }
        at = path[n - 1];
      }
    }
    L.push(`G0 Z${safe}`); rapids++;
  }
  L.push('M5', 'M30');
  return { text: L.join('\n') + '\n', stats: { totalLines: L.length, motion: arcs + lines + rapids + plunges, arcs, lines, rapids, plunges, cutLenMm: Math.round(cutLen) } };
}
