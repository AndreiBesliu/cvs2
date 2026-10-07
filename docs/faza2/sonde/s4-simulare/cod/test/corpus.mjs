// corpus.mjs — piesele de referință: IR pentru nucleu + TEXT G-code scris de mână/de un scriitor
// minimal pentru oracol + valoarea pe hârtie (formulă închisă, scrisă aici, independent de ambele).
import { readFileSync, existsSync } from 'node:fs';

const L = (ax, ay, az, bx, by, bz) => [0, ax, ay, az, bx, by, bz, 0, 0];
const A = (cw, ax, ay, az, bx, by, bz, cx, cy) => [cw ? 2 : 3, ax, ay, az, bx, by, bz, cx, cy];
const op = (tool, moves) => ({ tool, moves: Float64Array.from(moves.flat()) });

function scula(t) {
  if (t.kind === 'v') return `(SCULA v D=${t.d} A=${t.angle})`;
  if (t.kind === 'profile') return `(SCULA profile D=${t.d} P=${t.pts.map((p) => p.join(':')).join(',')})`;
  return `(SCULA ${t.kind} D=${t.d})`;
}
const f = (v) => (Math.round(v * 1e6) / 1e6).toString();
// Scriitor minimal IR -> G-code (absolut, mm, arce cu I/J relativ). Doar pentru teste.
export function toGcode(ops) {
  const out = ['G21 G90 G17'];
  let cx = null, cy = null, cz = null;
  for (const o of ops) {
    out.push(scula(o.tool));
    const mv = o.moves;
    for (let i = 0; i < mv.length; i += 9) {
      const [k, ax, ay, az, bx, by, bz, ccx, ccy] = mv.subarray(i, i + 9);
      if (ax !== cx || ay !== cy || az !== cz) { out.push(`G0 Z5`); out.push(`G0 X${f(ax)} Y${f(ay)}`); out.push(`G1 Z${f(az)}`); }
      if (k === 0) out.push(`G1 X${f(bx)} Y${f(by)} Z${f(bz)}`);
      else out.push(`G${k} X${f(bx)} Y${f(by)} Z${f(bz)} I${f(ccx - ax)} J${f(ccy - ay)}`);
      cx = bx; cy = by; cz = bz;
    }
    out.push('G0 Z5'); cz = 5;
  }
  return out.join('\n') + '\n';
}

// distanța punct-segment (pentru valorile pe hârtie)
const dSeg = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
// distanța la un arc (unghiuri cu atan2: altă metodă decât nucleul, care folosește produse vectoriale)
const dArc = (px, py, cx, cy, r, a0deg, a1deg) => {
  let a = (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
  while (a < a0deg) a += 360;
  if (a <= a1deg) return Math.abs(Math.hypot(px - cx, py - cy) - r);
  const e0 = [cx + r * Math.cos((a0deg * Math.PI) / 180), cy + r * Math.sin((a0deg * Math.PI) / 180)];
  const e1 = [cx + r * Math.cos((a1deg * Math.PI) / 180), cy + r * Math.sin((a1deg * Math.PI) / 180)];
  return Math.min(Math.hypot(px - e0[0], py - e0[1]), Math.hypot(px - e1[0], py - e1[1]));
};
const pol = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];

const FLAT6 = { kind: 'flat', d: 6 }, BALL6 = { kind: 'ball', d: 6 };
const V90 = { kind: 'v', d: 12, angle: 90 }, V60 = { kind: 'v', d: 6, angle: 60 };
const PROF = { kind: 'profile', d: 10, pts: [[0, 0], [2, 0], [5, 3]] };

export function cases() {
  const C = [];
  // 1. șanț cu freză plată: lățime D, adâncime exactă
  C.push({
    id: 'sant-plat', field: { x0: 0, y0: 0, w: 60, h: 40, cell: 0.05 }, zProg: -3,
    ops: [op(FLAT6, [L(10, 20, -3, 50, 20, -3)])],
    paper: (x, y) => (dSeg(x, y, 10, 20, 50, 20) <= 3 ? -3 : 0),
    edge: (x, y) => Math.abs(dSeg(x, y, 10, 20, 50, 20) - 3),
  });
  // 2. șanț cu bilă: secțiunea e un cerc de rază R
  C.push({
    id: 'sant-bila', field: { x0: 0, y0: 0, w: 60, h: 40, cell: 0.05 }, zProg: -2,
    ops: [op(BALL6, [L(10, 20, -2, 50, 20, -2)])],
    paper: (x, y) => { const d = dSeg(x, y, 10, 20, 50, 20); return d <= 3 ? Math.min(0, -2 + 3 - Math.sqrt(9 - d * d)) : 0; },
    section: { x: 30, R: 3, centerY: 20, zc: 1 },
  });
  // 3. V la 90°: triunghi cu unghi drept; V la 60°
  C.push({
    id: 'sant-v90', field: { x0: 0, y0: 0, w: 60, h: 40, cell: 0.05 }, zProg: -2,
    ops: [op(V90, [L(10, 20, -2, 50, 20, -2)])],
    paper: (x, y) => { const d = dSeg(x, y, 10, 20, 50, 20); return d <= 6 ? Math.min(0, -2 + d) : 0; },
    vangle: { x: 30, centerY: 20, expectDeg: 90 },
  });
  C.push({
    id: 'sant-v60', field: { x0: 0, y0: 0, w: 60, h: 40, cell: 0.05 }, zProg: -1.5,
    ops: [op(V60, [L(10, 20, -1.5, 50, 20, -1.5)])],
    paper: (x, y) => { const d = dSeg(x, y, 10, 20, 50, 20); return d <= 3 ? Math.min(0, -1.5 + d / Math.tan(Math.PI / 6)) : 0; },
    vangle: { x: 30, centerY: 20, expectDeg: 60 },
  });
  // 4. șanț pe arc G3 de la 30° la 120° (r=25), și același arc ca G2 scris cu R
  {
    const [sx, sy] = pol(40, 40, 25, 30), [ex, ey] = pol(40, 40, 25, 120);
    C.push({
      id: 'arc-g3', field: { x0: 0, y0: 0, w: 80, h: 80, cell: 0.05 }, zProg: -3,
      ops: [op(FLAT6, [A(false, sx, sy, -3, ex, ey, -3, 40, 40)])],
      paper: (x, y) => (dArc(x, y, 40, 40, 25, 30, 120) <= 3 ? -3 : 0),
      edge: (x, y) => Math.abs(dArc(x, y, 40, 40, 25, 30, 120) - 3),
      radial: { cx: 40, cy: 40, angles: [30, 45, 60, 90, 120], expect: 6 },
    });
    C.push({
      id: 'arc-g2-R', field: { x0: 0, y0: 0, w: 80, h: 80, cell: 0.05 }, zProg: -3,
      ops: [op(FLAT6, [A(true, ex, ey, -3, sx, sy, -3, 40, 40)])],
      gcode: `G21 G90\n${scula(FLAT6)}\nG0 Z5\nG0 X${f(ex)} Y${f(ey)}\nG1 Z-3\nG2 X${f(sx)} Y${f(sy)} R25\nG0 Z5\n`,
      paper: (x, y) => (dArc(x, y, 40, 40, 25, 30, 120) <= 3 ? -3 : 0),
      edge: (x, y) => Math.abs(dArc(x, y, 40, 40, 25, 30, 120) - 3),
      sameAs: 'arc-g3',
    });
  }
  // 5. cerc complet G3 cu I/J; arc mare (> 180°) cu R negativ
  C.push({
    id: 'cerc-complet', field: { x0: 0, y0: 0, w: 60, h: 60, cell: 0.05 }, zProg: -3,
    ops: [op(FLAT6, [A(false, 45, 30, -3, 45, 30, -3, 30, 30)])],
    paper: (x, y) => (Math.abs(Math.hypot(x - 30, y - 30) - 15) <= 3 ? -3 : 0),
    edge: (x, y) => Math.abs(Math.abs(Math.hypot(x - 30, y - 30) - 15) - 3),
  });
  {
    const [sx, sy] = pol(30, 30, 15, 0), [ex, ey] = pol(30, 30, 15, 270);
    C.push({
      id: 'arc-mare-R-neg', field: { x0: 0, y0: 0, w: 60, h: 60, cell: 0.05 }, zProg: -3,
      ops: [op(FLAT6, [A(false, sx, sy, -3, ex, ey, -3, 30, 30)])],
      gcode: `G21 G90\n${scula(FLAT6)}\nG0 Z5\nG0 X${f(sx)} Y${f(sy)}\nG1 Z-3\nG3 X${f(ex)} Y${f(ey)} R-15\nG0 Z5\n`,
      paper: (x, y) => (dArc(x, y, 30, 30, 15, 0, 270) <= 3 ? -3 : 0),
      edge: (x, y) => Math.abs(dArc(x, y, 30, 30, 15, 0, 270) - 3),
    });
  }
  // 6. plonjări
  C.push({
    id: 'plonjare-plata', field: { x0: 0, y0: 0, w: 40, h: 40, cell: 0.05 }, zProg: -5,
    ops: [op(FLAT6, [L(20, 20, 5, 20, 20, -5)])],
    paper: (x, y) => (Math.hypot(x - 20, y - 20) <= 3 ? -5 : 0),
    edge: (x, y) => Math.abs(Math.hypot(x - 20, y - 20) - 3),
  });
  C.push({
    id: 'plonjare-bila', field: { x0: 0, y0: 0, w: 40, h: 40, cell: 0.05 }, zProg: -4,
    ops: [op(BALL6, [L(20, 20, 5, 20, 20, -4)])],
    paper: (x, y) => { const r = Math.hypot(x - 20, y - 20); return r <= 3 ? Math.min(0, -4 + 3 - Math.sqrt(9 - r * r)) : 0; },
  });
  // 7. rampă cu plată: pe fiecare celulă, minimul liniar pe intervalul fezabil
  C.push({
    id: 'rampa-plata', field: { x0: 0, y0: 0, w: 60, h: 40, cell: 0.05 }, zProg: -3,
    ops: [op(FLAT6, [L(10, 20, 0, 40, 20, -3)])],
    paper: (x, y) => {
      const e = y - 20; if (Math.abs(e) > 3) return 0;
      const w = Math.sqrt(9 - e * e), ta = Math.max(0, (x - 10 - w) / 30), tb = Math.min(1, (x - 10 + w) / 30);
      return ta > tb ? 0 : Math.min(0, -3 * tb);
    },
  });
  // 8. rampă cu bilă și cu V (Z variabil, formă închisă în nucleu) — doar oracolul
  C.push({ id: 'rampa-bila', field: { x0: 0, y0: 0, w: 60, h: 40, cell: 0.05 }, zProg: -3, ops: [op(BALL6, [L(10, 20, 0, 40, 25, -3)])] });
  C.push({ id: 'rampa-v90', field: { x0: 0, y0: 0, w: 60, h: 40, cell: 0.05 }, zProg: -3, ops: [op(V90, [L(10, 20, -0.5, 40, 22, -3), L(40, 22, -3, 45, 30, -1)])] });
  // 9. elice: o tură completă G3 cu Z de la 0 la -2 (nucleul: coarde; oracolul: arcul adevărat)
  C.push({ id: 'elice', field: { x0: 0, y0: 0, w: 40, h: 40, cell: 0.05 }, zProg: -2, ops: [op(FLAT6, [A(false, 30, 20, 0, 30, 20, -2, 20, 20)])] });
  // 10. sculă de profil h(r): fund plat 4 mm, pereți la 45°
  C.push({
    id: 'profil-h(r)', field: { x0: 0, y0: 0, w: 60, h: 40, cell: 0.05 }, zProg: -2,
    ops: [op(PROF, [L(10, 20, -2, 50, 20, -2)])],
    paper: (x, y) => { const d = dSeg(x, y, 10, 20, 50, 20); return d <= 5 ? Math.min(0, -2 + Math.max(0, d - 2)) : 0; },
  });
  C.push({ id: 'profil-rampa', field: { x0: 0, y0: 0, w: 60, h: 40, cell: 0.05 }, zProg: -2.5, ops: [op(PROF, [L(10, 20, 0, 40, 22, -2.5)])] });
  // 11. trăsătură de 0,01 mm: V60 la z=-0,01, celulă 0,002 mm
  C.push({
    id: 'mic-0.01', field: { x0: 0, y0: 0, w: 2, h: 1, cell: 0.002 }, zProg: -0.01,
    ops: [op(V60, [L(0.2, 0.5, -0.01, 1.8, 0.5, -0.01)])],
    paper: (x, y) => { const d = dSeg(x, y, 0.2, 0.5, 1.8, 0.5); return d <= 3 ? Math.min(0, -0.01 + d / Math.tan(Math.PI / 6)) : 0; },
  });
  // 12. mare: linie de 2430 mm și arc cu r=1000 pe placa întreagă la 0,25 mm (fără oracol: prea mare)
  {
    const [sx, sy] = pol(1220, -400, 1000, 60), [ex, ey] = pol(1220, -400, 1000, 120);
    C.push({
      id: 'mare-2440', field: { x0: 0, y0: 0, w: 2440, h: 1220, cell: 0.25 }, zProg: -3, noOracle: true,
      ops: [op(FLAT6, [L(5, 1000, -3, 2435, 1000, -3), A(false, sx, sy, -3, ex, ey, -3, 1220, -400)])],
      paper: (x, y) => (Math.min(dSeg(x, y, 5, 1000, 2435, 1000), dArc(x, y, 1220, -400, 1000, 60, 120)) <= 3 ? -3 : 0),
      edge: (x, y) => Math.abs(Math.min(dSeg(x, y, 5, 1000, 2435, 1000), dArc(x, y, 1220, -400, 1000, 60, 120)) - 3),
      window: [[0, 980, 30, 1020], [1200, 980, 1240, 1020], [2410, 980, 2440, 1020], [1200, 580, 1240, 620], [700, 480, 760, 540]],
    });
  }
  // 13. linie + arc tangent + linie (colț rotunjit): fără cocoașă la joncțiuni
  C.push({
    id: 'tangent', field: { x0: 0, y0: 0, w: 60, h: 60, cell: 0.05 }, zProg: -3,
    ops: [op(FLAT6, [L(10, 10, -3, 40, 10, -3), A(false, 40, 10, -3, 50, 20, -3, 40, 20), L(50, 20, -3, 50, 50, -3)])],
    paper: (x, y) => (Math.min(dSeg(x, y, 10, 10, 40, 10), dArc(x, y, 40, 20, 10, -90, 0), dSeg(x, y, 50, 20, 50, 50)) <= 3 ? -3 : 0),
    edge: (x, y) => Math.abs(Math.min(dSeg(x, y, 10, 10, 40, 10), dArc(x, y, 40, 20, 10, -90, 0), dSeg(x, y, 50, 20, 50, 50)) - 3),
  });
  // 14. aproape coincidente: două șanțuri la 6,001 mm (creastă de 0,001 mm) + un șanț dublat (idempotență)
  C.push({
    id: 'aproape-coincident', field: { x0: 0, y0: 0, w: 60, h: 40, cell: 0.05 }, zProg: -3,
    ops: [op(FLAT6, [L(10, 15, -3, 50, 15, -3), L(10, 21.001, -3, 50, 21.001, -3)])],
    paper: (x, y) => (Math.min(dSeg(x, y, 10, 15, 50, 15), dSeg(x, y, 10, 21.001, 50, 21.001)) <= 3 ? -3 : 0),
    edge: (x, y) => Math.min(Math.abs(dSeg(x, y, 10, 15, 50, 15) - 3), Math.abs(dSeg(x, y, 10, 21.001, 50, 21.001) - 3)),
  });
  C.push({ id: 'dublat', field: { x0: 0, y0: 0, w: 60, h: 40, cell: 0.05 }, zProg: -3, ops: [op(FLAT6, [L(10, 20, -3, 50, 20, -3), L(50, 20, -3, 10, 20, -3)])], sameAs: 'sant-plat' });
  // 15. litere reale (font de sistem citit cu opentype.js, doar în teste): gravură V60 pe contur
  const glyph = glyphCase();
  if (glyph) C.push(glyph);
  return C;
}

function glyphCase() {
  const fonts = ['C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/segoeui.ttf'];
  const fp = fonts.find((p) => existsSync(p));
  if (!fp) return null;
  return { id: 'litere-Bg', lazyGlyph: fp, field: { x0: 0, y0: 0, w: 70, h: 50, cell: 0.05 }, zProg: -0.5 };
}

// opentype.js e încărcat doar aici (test), contururile Q/C sunt aplatizate la 0,1 mm
export async function resolveGlyph(c) {
  const opentype = (await import('opentype.js')).default ?? (await import('opentype.js'));
  const buf = readFileSync(c.lazyGlyph);
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const path = font.getPath('Bg', 5, 40, 40); // em = 40 mm, linia de bază la y=10
  const moves = [];
  let cx = 0, cy = 0, sx = 0, sy = 0;
  const flip = (y) => 50 - y; // fontul are Y în jos
  const z = -0.5;
  const lineTo = (x, y) => { moves.push(L(cx, flip(cy), z, x, flip(y), z)); cx = x; cy = y; };
  for (const cmd of path.commands) {
    if (cmd.type === 'M') { cx = sx = cmd.x; cy = sy = cmd.y; }
    else if (cmd.type === 'L') lineTo(cmd.x, cmd.y);
    else if (cmd.type === 'Q' || cmd.type === 'C') {
      const p0 = [cx, cy];
      const n = Math.max(2, Math.ceil(Math.hypot(cmd.x - cx, cmd.y - cy) / 0.1));
      for (let i = 1; i <= n; i++) {
        const t = i / n, u = 1 - t;
        let x, y;
        if (cmd.type === 'Q') { x = u * u * p0[0] + 2 * u * t * cmd.x1 + t * t * cmd.x; y = u * u * p0[1] + 2 * u * t * cmd.y1 + t * t * cmd.y; }
        else {
          x = u * u * u * p0[0] + 3 * u * u * t * cmd.x1 + 3 * u * t * t * cmd.x2 + t * t * t * cmd.x;
          y = u * u * u * p0[1] + 3 * u * u * t * cmd.y1 + 3 * u * t * t * cmd.y2 + t * t * t * cmd.y;
        }
        lineTo(x, y);
      }
    } else if (cmd.type === 'Z') { if (cx !== sx || cy !== sy) lineTo(sx, sy); }
  }
  return { ...c, ops: [op(V60, moves.filter((m) => m[1] !== m[4] || m[2] !== m[5]))] };
}
