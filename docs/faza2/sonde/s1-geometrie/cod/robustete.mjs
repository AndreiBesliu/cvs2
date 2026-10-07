// T7: robustete pe un corpus aleator (>= 500 de cazuri) + glife reale dintr-un TTF.
// Oracolul: clasificarea punctelor (inauntru/afara) fata de predicatul exact, calculat din INTRARI,
// ignorand o banda ingusta langa frontiere. Orice punct clasificat gresit = topologie gresita.
import fs from 'node:fs';
import { circle, rrect, rng, transformContour, matRotTrans, flattenContour, segStart, TAU } from './geom.mjs';
import { densePolys, makeDistIndex, distTo } from './oracol.mjs';
import * as AD from './adaptoare.mjs';

const otm = await import('opentype.js');
const ot = otm.default || otm;
const FONT_PATH = process.env.FONT_TTF || 'C:/Windows/Fonts/arial.ttf';
const buf = fs.readFileSync(FONT_PATH);
const font = ot.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

// ---------- index de infasurare pe benzi orizontale (oracol rapid) ----------
function windIndex(polys) {
  const segs = [];
  let y0 = Infinity, y1 = -Infinity;
  for (const P of polys) for (let i = 0; i + 1 < P.length; i++) { const a = P[i], b = P[i + 1]; if (a[1] === b[1]) continue; segs.push([a[0], a[1], b[0], b[1]]); y0 = Math.min(y0, a[1], b[1]); y1 = Math.max(y1, a[1], b[1]); }
  const nb = 256, bh = (y1 - y0) / nb || 1;
  const bands = Array.from({ length: nb }, () => []);
  for (const s of segs) { const lo = Math.max(0, Math.floor((Math.min(s[1], s[3]) - y0) / bh)), hi = Math.min(nb - 1, Math.floor((Math.max(s[1], s[3]) - y0) / bh)); for (let k = lo; k <= hi; k++) bands[k].push(s); }
  return { bands, y0, bh, nb };
}
function evenOdd(wi, x, y) {
  const k = Math.floor((y - wi.y0) / wi.bh);
  if (!(k >= 0 && k < wi.nb)) return false; // si pentru iesire goala (NaN)
  let c = 0;
  for (const s of wi.bands[k]) if ((s[1] <= y) !== (s[3] <= y)) { const xi = s[0] + (y - s[1]) * (s[2] - s[0]) / (s[3] - s[1]); if (xi > x) c++; }
  return (c & 1) === 1;
}

// ---------- corpus ----------
export function glyph(ch, size, x, y, rot) {
  const p = font.getPath(ch, 0, 0, size);
  const out = []; let cur = null, px = 0, py = 0, sx = 0, sy = 0;
  for (const c of p.commands) {
    if (c.type === 'M') { if (cur && cur.segs.length) out.push(cur); cur = { closed: true, segs: [] }; px = sx = c.x; py = sy = -c.y; }
    else if (c.type === 'L') { cur.segs.push({ k: 'L', x0: px, y0: py, x1: c.x, y1: -c.y }); px = c.x; py = -c.y; }
    else if (c.type === 'Q') { cur.segs.push({ k: 'Q', x0: px, y0: py, x1: c.x1, y1: -c.y1, x2: c.x, y2: -c.y }); px = c.x; py = -c.y; }
    else if (c.type === 'C') { cur.segs.push({ k: 'C', x0: px, y0: py, x1: c.x1, y1: -c.y1, x2: c.x2, y2: -c.y2, x3: c.x, y3: -c.y }); px = c.x; py = -c.y; }
    else if (c.type === 'Z') { if (Math.hypot(px - sx, py - sy) > 1e-12) cur.segs.push({ k: 'L', x0: px, y0: py, x1: sx, y1: sy }); px = sx; py = sy; }
  }
  if (cur && cur.segs.length) out.push(cur);
  // segmente degenerate (lungime 0) eliminate la usa de intrare
  const clean = out.map((c) => ({ closed: true, segs: c.segs.filter((s) => { const a = segStart(s); const e = s.k === 'L' ? [s.x1, s.y1] : s.k === 'Q' ? [s.x2, s.y2] : [s.x3, s.y3]; return Math.hypot(e[0] - a[0], e[1] - a[1]) > 1e-12 || s.k !== 'L'; }) }));
  return normalize(clean.map((c) => transformContour(c, matRotTrans(rot, x, y))));
}
// orientare dupa adancimea de includere: par = CCW, impar = CW (o singura autoritate pentru "gaura")
export function normalize(region) {
  const polys = region.map((c) => flattenContour(c, 0.01));
  const area = (P) => { let a = 0; for (let i = 0; i + 1 < P.length; i++) a += P[i][0] * P[i + 1][1] - P[i + 1][0] * P[i][1]; return a / 2; };
  return region.map((c, i) => {
    const p = polys[i][0];
    let depth = 0;
    polys.forEach((Q, j) => { if (j === i) return; let cr = 0; for (let k = 0; k + 1 < Q.length; k++) { const a = Q[k], b = Q[k + 1]; if ((a[1] <= p[1]) !== (b[1] <= p[1])) { const xi = a[0] + (p[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1]); if (xi > p[0]) cr++; } } if (cr & 1) depth++; });
    const ccw = depth % 2 === 0;
    return (area(polys[i]) > 0) === ccw ? c : AD.reverseContour(c);
  });
}
function star(rnd, cx, cy, R) {
  for (let tries = 0; tries < 50; tries++) {
    const n = 5 + Math.floor(rnd() * 20);
    const angs = Array.from({ length: n }, (_, i) => (i + 0.15 + 0.7 * rnd()) / n * TAU);
    const pts = angs.map((a) => { const r = R * (0.4 + 0.6 * rnd()); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
    const segs = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const bu = rnd() < 0.5 ? 0 : (rnd() - 0.5) * 0.5;
      if (bu === 0) segs.push({ k: 'L', x0: a[0], y0: a[1], x1: b[0], y1: b[1] });
      else { const dx = b[0] - a[0], dy = b[1] - a[1], kk = (1 - bu * bu) / (4 * bu); const ccx = (a[0] + b[0]) / 2 - dy * kk, ccy = (a[1] + b[1]) / 2 + dx * kk; segs.push({ k: 'A', cx: ccx, cy: ccy, r: Math.hypot(a[0] - ccx, a[1] - ccy), a0: Math.atan2(a[1] - ccy, a[0] - ccx), da: 4 * Math.atan(bu) }); }
    }
    const c = { closed: true, segs };
    if (!selfIntersects(flattenContour(c, R * 1e-3))) return c;
  }
  return circle(cx, cy, R);
}
function selfIntersects(P) {
  const n = P.length - 1;
  const inter = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; };
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) { if (i === 0 && j === n - 1) continue; if (inter(P[i], P[i + 1], P[j], P[j + 1])) return true; }
  return false;
}

export function buildCorpus(seed = 12345) {
  const rnd = rng(seed);
  const OPS = ['union', 'inter', 'diff', 'xor'];
  const cases = [];
  // (a) 150 boolean intre doua poligoane linie+arc
  for (let i = 0; i < 150; i++) {
    const S = [1, 10, 100, 2440][i % 4];
    const A = [star(rnd, 0, 0, S)], B = [star(rnd, S * (rnd() - 0.5), S * (rnd() - 0.5), S * (0.3 + 0.7 * rnd()))];
    cases.push({ id: `stea-${i}`, fam: 'linie+arc', kind: 'bool', A, B, op: OPS[i % 4], S });
  }
  // (b) 150 boolean glifa ∘ (cerc | rrect | stea), glife reale B g 8 & ®
  const GL = ['B', 'g', '8', '&', '®'];
  for (let i = 0; i < 150; i++) {
    const S = [1, 10, 100, 2440][i % 4];
    const A = glyph(GL[i % 5], S, 0, 0, rnd() * TAU * (i % 3 === 0 ? 0 : 1));
    const k = i % 3;
    const bx = S * (0.1 + 0.5 * rnd()), by = S * (0.1 + 0.5 * rnd());
    const B = [k === 0 ? circle(bx, by, S * (0.1 + 0.3 * rnd())) : k === 1 ? rrect(bx, by, S * (0.2 + 0.5 * rnd()), S * (0.1 + 0.3 * rnd()), S * 0.03, rnd() * TAU) : star(rnd, bx, by, S * 0.35)];
    cases.push({ id: `glifa-${GL[i % 5]}-${i}`, fam: 'glifa TTF', kind: 'bool', A, B, op: OPS[(i >> 1) % 4], S });
  }
  // (c) 150 offseturi (glife, stele, dreptunghiuri rotunjite), in afara si inauntru
  for (let i = 0; i < 150; i++) {
    const S = [1, 10, 100, 2440][i % 4];
    const k = i % 3;
    const A = k === 0 ? glyph(GL[i % 5], S, 0, 0, rnd() * TAU) : k === 1 ? [star(rnd, 0, 0, S * 0.5)] : [rrect(0, 0, S, S * 0.6, S * 0.08, rnd() * TAU)];
    const sgn = rnd() < 0.5 ? -1 : 1;
    const d = sgn * S * (k === 0 ? (0.004 + 0.03 * rnd()) : (0.005 + 0.1 * rnd()));
    cases.push({ id: `offset-${['glifa', 'stea', 'rrect'][k]}-${i}`, fam: 'offset', kind: 'off', A, d, S });
  }
  // (d) cazuri degenerate
  let j = 0;
  for (const g of [-1e-3, -1e-6, -1e-9, 0, 1e-9, 1e-6, 1e-3]) for (const op of ['union', 'inter']) cases.push({ id: `tangent-${g}-${op}`, fam: 'degenerat', kind: 'bool', A: [circle(0, 0, 30)], B: [circle(60 + g, 0, 30)], op, S: 60 });
  for (const op of OPS) cases.push({ id: `identic-${op}`, fam: 'degenerat', kind: 'bool', A: [circle(3, 4, 25)], B: [circle(3, 4, 25)], op, S: 50 });
  for (const op of OPS) cases.push({ id: `concentric-${op}`, fam: 'degenerat', kind: 'bool', A: [circle(0, 0, 30)], B: [circle(0, 0, 20)], op, S: 60 });
  for (const op of ['union', 'diff', 'xor']) cases.push({ id: `latura-comuna-${op}`, fam: 'degenerat', kind: 'bool', A: [rrect(5, 5, 10, 10, 0)], B: [rrect(15, 5, 10, 10, 0)], op, S: 20 });
  for (const op of ['union', 'diff', 'xor']) cases.push({ id: `latura-partiala-${op}`, fam: 'degenerat', kind: 'bool', A: [rrect(5, 5, 10, 10, 0)], B: [rrect(15, 7.5, 10, 5, 0)], op, S: 20 });
  for (const op of ['union', 'inter', 'diff']) cases.push({ id: `arc-comun-${op}`, fam: 'degenerat', kind: 'bool', A: [rrect(0, 0, 40, 20, 5)], B: [rrect(10, 0, 40, 20, 5)], op, S: 50 });
  for (const op of ['union', 'diff']) cases.push({ id: `detaliu-0.01-pe-2440-${op}`, fam: 'degenerat', kind: 'bool', A: [rrect(1220, 610, 2440, 1220, 0)], B: [circle(1220, 1220, 0.01)], op, S: 2440, band: 0.002, probes: [[1220, 1220.008], [1220, 1219.992], [1220.012, 1220.0005], [1220.012, 1219.9995]] });
  for (const op of ['diff']) cases.push({ id: `fanta-0.01-pe-2440`, fam: 'degenerat', kind: 'bool', A: [rrect(1220, 610, 2440, 1220, 0)], B: [rrect(1220, 610, 0.01, 2000, 0)], op, S: 2440, band: 0.002, probes: [[1220, 600], [1219.9, 600], [1220.1, 600]] });
  for (const ch of GL) cases.push({ id: `glifa-cu-ea-insasi-${ch}`, fam: 'degenerat', kind: 'bool', A: glyph(ch, 50, 10, 10, 0.3), B: glyph(ch, 50, 10, 10, 0.3), op: 'union', S: 50 });
  for (const ch of GL) cases.push({ id: `glifa-departe-${ch}`, fam: 'degenerat', kind: 'off', A: glyph(ch, 20, 2440, 1220, 0), d: 0.01, S: 20 });
  for (const ch of GL) cases.push({ id: `glifa-offset-mic-${ch}`, fam: 'degenerat', kind: 'off', A: glyph(ch, 10, 0, 0, 0), d: -0.001, S: 10, band: 0.0004 });
  cases.push({ id: 'cerc-mic-dispare', fam: 'degenerat', kind: 'off', A: [circle(0, 0, 0.05)], d: -0.06, S: 0.1 });
  cases.push({ id: 'cerc-mic-in-afara', fam: 'degenerat', kind: 'off', A: [circle(0, 0, 0.05)], d: 0.01, S: 0.1 });
  for (let i = 0; i < 5; i++) { const s = star(rnd, 0, 0, 40); cases.push({ id: `stea-cu-ea-insasi-${i}`, fam: 'degenerat', kind: 'bool', A: [s], B: [s], op: OPS[i % 4], S: 80 }); }
  for (const op of ['union', 'inter']) cases.push({ id: `rrect-rotit-1e-9-${op}`, fam: 'degenerat', kind: 'bool', A: [rrect(0, 0, 40, 20, 5, 0.3)], B: [rrect(0, 0, 40, 20, 5, 0.3 + 1e-9)], op, S: 50 });
  return cases;
}

// ---------- evaluarea unui caz ----------
function bboxOf(regions) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const r of regions) for (const P of densePolys(r, 1e9)) for (const p of P) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return [x0, y0, x1, y1]; }

export function prepCase(cs) {
  // tot ce tine de oracol se calculeaza O DATA pe caz, din intrari
  const regs = cs.kind === 'bool' ? [cs.A, cs.B] : [cs.A];
  const bb = bboxOf(regs);
  const pad = cs.kind === 'off' ? Math.abs(cs.d) * 1.5 + cs.S * 0.02 : cs.S * 0.02;
  const X0 = bb[0] - pad, Y0 = bb[1] - pad, X1 = bb[2] + pad, Y1 = bb[3] + pad;
  const diag = Math.hypot(X1 - X0, Y1 - Y0);
  const h = diag / 3000;
  // banda >= toleranta declarata a celei mai grosiere biblioteci (Clipper aplatizeaza la 0,001 mm)
  const band = cs.band ?? Math.max(diag * 2e-4, 0.003);
  const polysA = densePolys(cs.A, h), wA = windIndex(polysA), dA = makeDistIndex(polysA, diag / 128);
  let wB = null, dB = null;
  if (cs.kind === 'bool') { const pB = densePolys(cs.B, h); wB = windIndex(pB); dB = makeDistIndex(pB, diag / 128); }
  const G = 40, pts = [];
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) pts.push([X0 + (X1 - X0) * (i + 0.5) / G, Y0 + (Y1 - Y0) * (j + 0.5) / G]);
  if (cs.probes) pts.push(...cs.probes);
  const checks = [];
  for (const [x, y] of pts) {
    const inA = evenOdd(wA, x, y);
    let exp;
    if (cs.kind === 'bool') {
      const da = distTo(dA, x, y), db = distTo(dB, x, y);
      if (da < band || db < band) continue;
      const inB = evenOdd(wB, x, y);
      exp = { union: inA || inB, inter: inA && inB, diff: inA && !inB, xor: inA !== inB }[cs.op];
    } else {
      const da = distTo(dA, x, y);
      if (Math.abs(da - Math.abs(cs.d)) < band) continue;
      exp = cs.d > 0 ? (inA || da < cs.d) : (inA && da > -cs.d);
    }
    checks.push([x, y, exp]);
  }
  return { checks, h, band, diag };
}

export function evalCase(lib, cs, prep) {
  let out, ms;
  const opt = { tolFit: Math.max(1e-4, cs.S * 2e-6) };
  if (lib.call) {
    // biblioteca ruleaza intr-un worker cu termen (vezi lucrator.mjs): un apel blocat devine 'blocaj'
    const r = lib.call(cs.kind === 'bool' ? { kind: 'bool', A: cs.A, B: cs.B, op: cs.op, opt } : { kind: 'off', A: cs.A, d: cs.d, opt });
    if (r.status !== 'ok') return r;
    out = r.out; ms = r.ms;
  } else {
    const t0 = performance.now();
    try {
      out = cs.kind === 'bool' ? lib.bool(cs.A, cs.B, cs.op, opt) : lib.offset(cs.A, cs.d, opt);
    } catch (e) {
      if (e instanceof AD.Nesuportat) return { status: 'nesuportat', ms: performance.now() - t0 };
      return { status: 'exceptie', msg: String(e && e.message || e).slice(0, 120), ms: performance.now() - t0 };
    }
    ms = performance.now() - t0;
  }
  for (const c of out) for (const s of c.segs) for (const v of Object.values(s)) if (typeof v === 'number' && !Number.isFinite(v)) return { status: 'exceptie', msg: 'coordonata NaN/Infinit', ms };
  const wi = windIndex(densePolys(out, prep.h));
  let bad = 0;
  for (const [x, y, exp] of prep.checks) if (evenOdd(wi, x, y) !== exp) bad++;
  let ent = 0; for (const c of out) ent += c.segs.length;
  return { status: bad ? 'topologie' : 'ok', bad, ms, ent };
}

export function libsRobust() {
  return [
    AD.cavalier,
    { ...AD.flatten, offset: () => { throw new AD.Nesuportat('polygon-offset 1.1.4 incompatibil cu core 1.6.14'); } },
    // maker.js: offsetul unei glife de 2 440 mm dureaza ~5,8 s/caz [masurat]; peste 1 m se sare (raportat ca nesuportat)
    { ...AD.makerjs, offset: (r, d, o) => { let lo = Infinity, hi = -Infinity; for (const c of r) for (const sg of c.segs) for (const v of [sg.x0, sg.y0, sg.cx, sg.cy]) if (v !== undefined) { lo = Math.min(lo, v); hi = Math.max(hi, v); } if (hi - lo > 1000) throw new AD.Nesuportat("maker: prea lent peste 1 m"); return AD.makerjs.offset(r, d, o); } },
    AD.paperjs,
    { ...AD.skia, nume: AD.skia.nume, offset: (r, d) => AD.skia.offset(r, d, { precision: 100 }) },
    AD.makeClipper(0.001, 0),
  ];
}

export function runCorpus({ seed = 12345, limit = Infinity, libs = libsRobust(), log = false, stride = 1 } = {}) {
  const cases = buildCorpus(seed).filter((_, i) => i % stride === 0).slice(0, limit);
  const res = {};
  for (const L of libs) res[L.nume] = { total: 0, ok: 0, topologie: 0, exceptie: 0, blocaj: 0, nesuportat: 0, ms: 0, exemple: [], peFam: {} };
  let ci = 0;
  for (const cs of cases) {
    if (++ci % 50 === 0) process.stderr.write(`progres ${ci}/${cases.length}\n`);
    const prep = prepCase(cs);
    for (const L of libs) {
      const r = evalCase(L, cs, prep);
      const R = res[L.nume];
      R.total++; R[r.status]++; R.ms += r.ms;
      const f = (R.peFam[cs.fam] ||= { total: 0, ok: 0, topologie: 0, exceptie: 0, blocaj: 0, nesuportat: 0 }); f.total++; f[r.status]++;
      if ((r.status === 'topologie' || r.status === 'exceptie' || r.status === 'blocaj') && R.exemple.length < 12) R.exemple.push(`${cs.id}: ${r.status}${r.bad ? ' (' + r.bad + ' pct)' : ''}${r.msg ? ' ' + r.msg : ''}`);
      if (log && r.status !== 'ok' && r.status !== 'nesuportat') console.log(L.nume.slice(0, 24), cs.id, r.status, r.bad || '', r.msg || '');
    }
  }
  return { n: cases.length, res };
}
