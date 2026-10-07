// (e) Deriva PathKit (pathkit-wasm 1.0, build-ul recomandat de s1): lant de 100 de operatii alternante
// (reuniune / diferenta) cu cercuri si dreptunghiuri rotunjite. Dupa fiecare operatie rezultatul trece prin modelul
// neutru (conica -> arc cu conicToArc din s1, arc -> conica la intrare), cum ar face produsul.
// Oracol EXACT, independent: apartenenta unui punct la rezultat = plierea predicatelor exacte ale surselor;
// abaterea frontierei = min_i |distanta cu semn la sursa i|. Apoi remediul s1: re-ancorarea arcelor pe cercurile-sursa.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { arcToConics, conicToArc } from '../geom.mjs';
import { P, samplesOf, dSeg } from './oracol-v1.mjs';
import { reanchorR3 } from './remediu-r3.mjs';
const require = createRequire(import.meta.url);
const PK = await require('pathkit-wasm/bin/pathkit.js')({ wasmBinary: fs.readFileSync(new URL('../node_modules/pathkit-wasm/bin/pathkit.wasm', import.meta.url)) });

// ---------- surse exacte ----------
function rngf(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function makeChain(seed, X0, Y0, W, H, nOps = 100) {
  const rnd = rngf(seed); const src = [];
  src.push({ t: 'rr', cx: X0 + W / 2, cy: Y0 + H / 2, w: W * 0.8, h: H * 0.8, r: Math.min(W, H) * 0.05 });
  for (let i = 1; i <= nOps; i++) {
    const cx = X0 + W * (0.05 + 0.9 * rnd()), cy = Y0 + H * (0.05 + 0.9 * rnd()), s = Math.min(W, H) * (0.03 + 0.12 * rnd());
    if (i % 2) src.push({ t: 'c', cx, cy, r: s });
    else src.push({ t: 'rr', cx, cy, w: 2 * s, h: s * (0.6 + rnd()), r: s * 0.25 });
  }
  return src; // operatia i (i>=1): impar = reuniune, par = diferenta
}
const sdf = (s, x, y) => {
  if (s.t === 'c') return Math.hypot(x - s.cx, y - s.cy) - s.r;
  const qx = Math.abs(x - s.cx) - (s.w / 2 - s.r), qy = Math.abs(y - s.cy) - (s.h / 2 - s.r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - s.r;
};
const member = (src, n, x, y) => { let v = sdf(src[0], x, y) < 0; for (let i = 1; i <= n; i++) { const b = sdf(src[i], x, y) < 0; v = i % 2 ? (v || b) : (v && !b); } return v; };
function srcContour(s) {
  if (s.t === 'c') return { closed: true, segs: [{ k: 'A', cx: s.cx, cy: s.cy, r: s.r, a0: 0, da: Math.PI }, { k: 'A', cx: s.cx, cy: s.cy, r: s.r, a0: Math.PI, da: Math.PI }] };
  const hw = s.w / 2, hh = s.h / 2, r = s.r, cx = s.cx, cy = s.cy, H = Math.PI / 2;
  return { closed: true, segs: [
    { k: 'L', x0: cx - hw + r, y0: cy - hh, x1: cx + hw - r, y1: cy - hh }, { k: 'A', cx: cx + hw - r, cy: cy - hh + r, r, a0: -H, da: H },
    { k: 'L', x0: cx + hw, y0: cy - hh + r, x1: cx + hw, y1: cy + hh - r }, { k: 'A', cx: cx + hw - r, cy: cy + hh - r, r, a0: 0, da: H },
    { k: 'L', x0: cx + hw - r, y0: cy + hh, x1: cx - hw + r, y1: cy + hh }, { k: 'A', cx: cx - hw + r, cy: cy + hh - r, r, a0: H, da: H },
    { k: 'L', x0: cx - hw, y0: cy + hh - r, x1: cx - hw, y1: cy - hh + r }, { k: 'A', cx: cx - hw + r, cy: cy - hh + r, r, a0: 2 * H, da: H }] };
}
// ---------- adaptorul (ca in s1): model neutru <-> PathKit ----------
function toPK(region) {
  const p = PK.NewPath(); p.setFillType(PK.FillType.EVENODD);
  for (const c of region) {
    const s0 = P(c.segs[0], 0); p.moveTo(s0[0], s0[1]);
    for (const s of c.segs) {
      if (s.k === 'L') p.lineTo(s.x1, s.y1);
      else if (s.k === 'A') for (const k of arcToConics(s)) p.conicTo(k.x1, k.y1, k.x2, k.y2, k.w);
      else if (s.k === 'K') p.conicTo(s.x1, s.y1, s.x2, s.y2, s.w);
      else if (s.k === 'Q') p.quadTo(s.x1, s.y1, s.x2, s.y2);
      else if (s.k === 'C') p.cubicTo(s.x1, s.y1, s.x2, s.y2, s.x3, s.y3);
    }
    p.close();
  }
  return p;
}
function fromPK(p) {
  const out = []; let cur = null, x = 0, y = 0, sx = 0, sy = 0; const st = { K: 0, Q: 0, C: 0 };
  for (const c of p.toCmds()) {
    const v = c[0];
    if (v === PK.MOVE_VERB) { if (cur && cur.segs.length) out.push(cur); cur = { closed: false, segs: [] }; x = sx = c[1]; y = sy = c[2]; }
    else if (v === PK.LINE_VERB) { cur.segs.push({ k: 'L', x0: x, y0: y, x1: c[1], y1: c[2] }); x = c[1]; y = c[2]; }
    else if (v === PK.CONIC_VERB) { const s = { k: 'K', x0: x, y0: y, x1: c[1], y1: c[2], x2: c[3], y2: c[4], w: c[5] }; const a = conicToArc(s, 1e-5); if (!a) st.K++; cur.segs.push(a || s); x = c[3]; y = c[4]; }
    else if (v === PK.QUAD_VERB) { st.Q++; cur.segs.push({ k: 'Q', x0: x, y0: y, x1: c[1], y1: c[2], x2: c[3], y2: c[4] }); x = c[3]; y = c[4]; }
    else if (v === PK.CUBIC_VERB) { st.C++; cur.segs.push({ k: 'C', x0: x, y0: y, x1: c[1], y1: c[2], x2: c[3], y2: c[4], x3: c[5], y3: c[6] }); x = c[5]; y = c[6]; }
    else if (v === PK.CLOSE_VERB) { if (Math.hypot(x - sx, y - sy) > 0) cur.segs.push({ k: 'L', x0: x, y0: y, x1: sx, y1: sy }); cur.closed = true; out.push(cur); cur = null; x = sx; y = sy; }
  }
  if (cur && cur.segs.length) out.push(cur);
  return { region: out, st };
}
// conica ramasa nerecunoscuta: evaluare pentru masuratori
const Pk = (s, t) => { if (s.k !== 'K') return P(s, t); const u = 1 - t, d = u * u + 2 * s.w * u * t + t * t; return [(u * u * s.x0 + 2 * s.w * u * t * s.x1 + t * t * s.x2) / d, (u * u * s.y0 + 2 * s.w * u * t * s.y1 + t * t * s.y2) / d]; };
function samplePts(region, n = 12) { const pts = []; for (const c of region) for (const s of c.segs) for (let i = 0; i <= n; i++) pts.push(Pk(s, i / n)); return pts; }

// ---------- masuratori ----------
function measure(src, n, region, scale) {
  const pts = samplePts(region);
  let dev = 0; for (const p of pts) { let m = Infinity; for (let i = 0; i <= n; i++) m = Math.min(m, Math.abs(sdf(src[i], p[0], p[1]))); dev = Math.max(dev, m); }
  // arcele: centru/raza fata de cercul-sursa cel mai apropiat (cercuri + colturile dreptunghiurilor)
  const circles = []; for (let i = 0; i <= n; i++) { const s = src[i]; if (s.t === 'c') circles.push([s.cx, s.cy, s.r]); else { const hw = s.w / 2 - s.r, hh = s.h / 2 - s.r; for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) circles.push([s.cx + a * hw, s.cy + b * hh, s.r]); } }
  let dc = 0, dr = 0, nA = 0, nK = 0, nL = 0;
  for (const c of region) for (const s of c.segs) {
    if (s.k === 'K') nK++; if (s.k === 'L') nL++;
    if (s.k !== 'A') continue; nA++;
    let best = null; for (const q of circles) { const e = Math.hypot(s.cx - q[0], s.cy - q[1]) + Math.abs(s.r - q[2]); if (!best || e < best.e) best = { e, q }; }
    dc = Math.max(dc, Math.hypot(s.cx - best.q[0], s.cy - best.q[1])); dr = Math.max(dr, Math.abs(s.r - best.q[2]));
  }
  // adevar -> iesire: puncte pe frontierele surselor unde apartenenta finala se schimba (test la +-delta pe normala)
  const del = scale * 1e-6, tp = [];
  for (let i = 0; i <= n; i++) for (const p of samplesOf([srcContour(src[i])], scale / 400)) {
    const g = 1e-7 * scale, gx = (sdf(src[i], p[0] + g, p[1]) - sdf(src[i], p[0] - g, p[1])) / (2 * g), gy = (sdf(src[i], p[0], p[1] + g) - sdf(src[i], p[0], p[1] - g)) / (2 * g), l = Math.hypot(gx, gy);
    const a = member(src, n, p[0] + gx / l * del, p[1] + gy / l * del), b = member(src, n, p[0] - gx / l * del, p[1] - gy / l * del);
    if (a !== b) tp.push(p);
  }
  const segs = region.flatMap((c) => c.segs);
  let h = 0; for (const q of tp) { let b = Infinity; for (const s of segs) { const v = s.k === 'K' ? Math.min(...[...Array(33).keys()].map((i) => { const z = Pk(s, i / 32); return Math.hypot(z[0] - q[0], z[1] - q[1]); })) : dSeg(s, q[0], q[1]); if (v < b) b = v; } h = Math.max(h, b); }
  return { abatereFrontiera: dev, abatereCentruArc: dc, abatereRazaArc: dr, arce: nA, conice: nK, linii: nL, contururi: region.length, puncteAdevar: tp.length, adevarIesire: tp.length ? h : 0 };
}

// ---------- remediul: re-ancorare pe primitivele-sursa + varfuri recalculate ca intersectii exacte ----------
function primitivesOf(src, n) {
  const prims = [];
  for (let i = 0; i <= n; i++) { const c = srcContour(src[i]); for (const s of c.segs) prims.push(s.k === 'A' ? { k: 'A', cx: s.cx, cy: s.cy, r: s.r } : { k: 'L', x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 }); }
  return prims;
}
function matchPrim(s, prims, eps) {
  const cand = [];
  if (s.k === 'A') { for (const q of prims) if (q.k === 'A' && Math.hypot(s.cx - q.cx, s.cy - q.cy) < eps && Math.abs(s.r - q.r) < eps) cand.push(q); }
  else if (s.k === 'L') {
    for (const q of prims) if (q.k === 'L') { const dx = q.x1 - q.x0, dy = q.y1 - q.y0, l = Math.hypot(dx, dy); const d0 = Math.abs((s.x0 - q.x0) * dy - (s.y0 - q.y0) * dx) / l, d1 = Math.abs((s.x1 - q.x0) * dy - (s.y1 - q.y0) * dx) / l; if (d0 < eps && d1 < eps) cand.push(q); }
  }
  // dedublare: aceeasi primitiva geometrica (de ex. aceeasi latura a doua surse identice) conteaza o data
  const uniq = []; for (const q of cand) if (!uniq.some((u) => q.k === 'A' ? Math.hypot(u.cx - q.cx, u.cy - q.cy) + Math.abs(u.r - q.r) < 1e-12 : Math.abs(u.x0 - q.x0) + Math.abs(u.y0 - q.y0) + Math.abs(u.x1 - q.x1) + Math.abs(u.y1 - q.y1) < 1e-12)) uniq.push(q);
  return uniq;
}
function intersectPrims(a, b, near) {
  const pts = [];
  const LL = (p, q) => { const d1x = p.x1 - p.x0, d1y = p.y1 - p.y0, d2x = q.x1 - q.x0, d2y = q.y1 - q.y0, den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-18) return; const t = ((q.x0 - p.x0) * d2y - (q.y0 - p.y0) * d2x) / den; pts.push([p.x0 + t * d1x, p.y0 + t * d1y]); };
  const LC = (p, c) => { const dx = p.x1 - p.x0, dy = p.y1 - p.y0, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l; const fx = p.x0 - c.cx, fy = p.y0 - c.cy; const bb = fx * ux + fy * uy, cc2 = fx * fx + fy * fy - c.r * c.r, disc = bb * bb - cc2; if (disc < 0) { const t = -bb; pts.push([p.x0 + t * ux, p.y0 + t * uy]); return; } const sq = Math.sqrt(disc); for (const t of [-bb - sq, -bb + sq]) pts.push([p.x0 + t * ux, p.y0 + t * uy]); };
  const CC = (c1, c2) => { const dx = c2.cx - c1.cx, dy = c2.cy - c1.cy, d = Math.hypot(dx, dy); if (d === 0) return; const a2 = (c1.r * c1.r - c2.r * c2.r + d * d) / (2 * d), h2 = c1.r * c1.r - a2 * a2, h = h2 > 0 ? Math.sqrt(h2) : 0; const mx = c1.cx + a2 * dx / d, my = c1.cy + a2 * dy / d; pts.push([mx - h * dy / d, my + h * dx / d], [mx + h * dy / d, my - h * dx / d]); };
  if (a.k === 'L' && b.k === 'L') LL(a, b); else if (a.k === 'L') LC(a, b); else if (b.k === 'L') LC(b, a); else CC(a, b);
  let best = null; for (const p of pts) { const e = Math.hypot(p[0] - near[0], p[1] - near[1]); if (!best || e < best.e) best = { e, p }; }
  return best;
}
function reanchor(region, src, n, eps, mode) {
  const prims = primitivesOf(src, n); const st = { potrivite: 0, nepotrivite: 0, ambigue: 0, varfuriRecalculate: 0, varfuriFaraIntersectie: 0 };
  const out = region.map((c) => {
    const m = c.segs.map((s) => { if (mode === 'arce' && s.k !== 'A') return null; const u = matchPrim(s, prims, eps); if (u.length === 1) st.potrivite++; else if (u.length === 0) st.nepotrivite++; else st.ambigue++; return u.length === 1 ? u[0] : (u.length ? u[0] : null); });
    if (mode === 'arce') {
      // R1 (cum propune s1): doar centrul si raza arcului se inlocuiesc; capetele se proiecteaza radial
      return { closed: c.closed, segs: c.segs.map((s, i) => { const q = m[i]; if (!q || s.k !== 'A') return s; const p0 = Pk(s, 0), p1 = Pk(s, 1); const a0 = Math.atan2(p0[1] - q.cy, p0[0] - q.cx); let a1 = Math.atan2(p1[1] - q.cy, p1[0] - q.cx); let da = a1 - a0; if (s.da > 0) { while (da <= 0) da += 2 * Math.PI; } else { while (da >= 0) da -= 2 * Math.PI; } return { k: 'A', cx: q.cx, cy: q.cy, r: q.r, a0, da }; }) };
    }
    // R2: toate primitivele ancorate, fiecare varf = intersectia exacta a celor doua primitive vecine
    const N = c.segs.length; const V = [];
    for (let i = 0; i < N; i++) { const a = m[(i - 1 + N) % N], b = m[i]; const near = Pk(c.segs[i], 0); if (a && b && a !== b) { const r = intersectPrims(a, b, near); if (r && r.e < eps) { V.push(r.p); st.varfuriRecalculate++; continue; } } st.varfuriFaraIntersectie++; V.push(near); }
    return { closed: c.closed, segs: c.segs.map((s, i) => { const p0 = V[i], p1 = V[(i + 1) % N], q = m[i]; if (s.k === 'L' || !q) return s.k === 'L' ? { k: 'L', x0: p0[0], y0: p0[1], x1: p1[0], y1: p1[1] } : s; const a0 = Math.atan2(p0[1] - q.cy, p0[0] - q.cx); let da = Math.atan2(p1[1] - q.cy, p1[0] - q.cx) - a0; if (s.da > 0) { while (da <= 0) da += 2 * Math.PI; } else { while (da >= 0) da -= 2 * Math.PI; } return { k: 'A', cx: q.cx, cy: q.cy, r: q.r, a0, da }; }) };
  });
  return { region: out, st };
}
function maxGapK(region) { let g = 0; for (const c of region) { const n = c.segs.length; for (let i = 0; i < n; i++) { const a = Pk(c.segs[i], 1), b = Pk(c.segs[(i + 1) % n], 0); g = Math.max(g, Math.hypot(a[0] - b[0], a[1] - b[1])); } } return g; }

// ---------- rulare ----------
const scenarii = [['placa 2440 (0..2440)', 0, 0, 2440, 1220], ['placa 2440 centrata in origine', -1220, -610, 2440, 1220], ['detaliu 100 mm langa origine', 0, 0, 100, 50]];
const rez = [];
for (const [nume, X0, Y0, W, H] of scenarii) {
  const src = makeChain(777, X0, Y0, W, H, 100);
  let region = [srcContour(src[0])];
  const conicNerec = []; const t0 = performance.now(); const checkpoints = {};
  for (let i = 1; i <= 100; i++) {
    const a = toPK(region), b = toPK([srcContour(src[i])]);
    const r = PK.MakeFromOp(a, b, i % 2 ? PK.PathOp.UNION : PK.PathOp.DIFFERENCE);
    const f = fromPK(r); a.delete(); b.delete(); r.delete();
    region = f.region; conicNerec.push(f.st.K + f.st.Q + f.st.C);
    if ([1, 10, 50, 100].includes(i)) checkpoints[i] = measure(src, i, region, Math.max(W, H));
  }
  const ms = performance.now() - t0;
  const fin = checkpoints[100];
  const rec = { scenariu: nume, msLant: ms, conicaNerecunoscuteTotal: conicNerec.reduce((a, b) => a + b, 0), checkpoints };
  // remediu: R1 (doar arce, cum propune s1) si R2 (arce + linii + varfuri recalculate), eps = 1e-3 mm
  for (const [mode, eps] of [['arce', 1e-3], ['tot', 1e-3], ['tot', 1e-5]]) {
    const R = reanchor(region, src, 100, eps, mode);
    rec[`remediu_${mode}_eps${eps}`] = { ...R.st, golMax: maxGapK(R.region), ...measure(src, 100, R.region, Math.max(W, H)) };
  }
  for (const eps of [1e-3, 1e-4]) { const R = reanchorR3(region, primitivesOf(src, 100), eps, Pk, intersectPrims); rec[`remediu_R3_eps${eps}`] = { ...R.st, golMax: maxGapK(R.region), ...measure(src, 100, R.region, Math.max(W, H)) }; }
  rez.push(rec);
  for (const eps of [1e-3, 1e-4]) { const r = rec[`remediu_R3_eps${eps}`]; console.log(`  remediu R3 (potrivire pe 3 puncte, eps ${eps}): abatere frontiera ${r.abatereFrontiera.toExponential(2)} | gol ${r.golMax.toExponential(2)} | adevar->iesire ${r.adevarIesire.toExponential(2)} | centru arc ${r.abatereCentruArc.toExponential(2)} | potrivite ${r.potrivite}, nepotrivite ${r.nepotrivite}, ambigue ${r.ambigue}, varfuri fara intersectie ${r.varfuriFaraIntersectie}`); }
  const r1 = rec['remediu_arce_eps0.001'], r2 = rec['remediu_tot_eps0.001'];
  console.log(`\n${nume}: ${ms.toFixed(0)} ms pentru 100 de operatii; conice nerecunoscute ca arce (cumulat) ${rec.conicaNerecunoscuteTotal}`);
  for (const k of [1, 10, 50, 100]) { const c = checkpoints[k]; console.log(`  dupa ${String(k).padStart(3)} op.: abatere frontiera ${c.abatereFrontiera.toExponential(2)} | centru arc ${c.abatereCentruArc.toExponential(2)} | raza arc ${c.abatereRazaArc.toExponential(2)} | adevar->iesire ${c.adevarIesire.toExponential(2)} (${c.puncteAdevar} pct) | ${c.contururi} contururi, ${c.arce} arce, ${c.linii} linii, ${c.conice} conice`); }
  console.log(`  remediu R1 (doar arce re-ancorate, capete proiectate): abatere frontiera ${r1.abatereFrontiera.toExponential(2)} | gol max intre segmente ${r1.golMax.toExponential(2)} | potrivite ${r1.potrivite}, nepotrivite ${r1.nepotrivite}, ambigue ${r1.ambigue}`);
  console.log(`  remediu R2 (arce + linii, varfuri = intersectii exacte): abatere frontiera ${r2.abatereFrontiera.toExponential(2)} | gol ${r2.golMax.toExponential(2)} | adevar->iesire ${r2.adevarIesire.toExponential(2)} | varfuri recalculate ${r2.varfuriRecalculate}, fara intersectie ${r2.varfuriFaraIntersectie}, nepotrivite ${r2.nepotrivite}, ambigue ${r2.ambigue}`);
  const r3 = rec['remediu_tot_eps0.00001']; console.log(`  remediu R2 cu eps 1e-5: abatere ${r3.abatereFrontiera.toExponential(2)} | nepotrivite ${r3.nepotrivite} | varfuri fara intersectie ${r3.varfuriFaraIntersectie}`);
}
// CONTROL NEGATIV: un lant in care rezultatul e deplasat cu 1e-4 mm trebuie sa iasa din podeaua masuratorii
{
  const src = makeChain(777, 0, 0, 100, 50, 10); let region = [srcContour(src[0])];
  for (let i = 1; i <= 10; i++) { const a = toPK(region), b = toPK([srcContour(src[i])]); const r = PK.MakeFromOp(a, b, i % 2 ? PK.PathOp.UNION : PK.PathOp.DIFFERENCE); region = fromPK(r).region; a.delete(); b.delete(); r.delete(); }
  const sh = region.map((c) => ({ closed: c.closed, segs: c.segs.map((s) => s.k === 'A' ? { ...s, cx: s.cx + 1e-4 } : s.k === 'L' ? { ...s, x0: s.x0 + 1e-4, x1: s.x1 + 1e-4 } : s) }));
  const m0 = measure(src, 10, region, 100), m1 = measure(src, 10, sh, 100);
  console.log(`\nCONTROL: deplasare 1e-4 mm -> abatere ${m1.abatereFrontiera.toExponential(2)} (fara deplasare ${m0.abatereFrontiera.toExponential(2)}): ${m1.abatereFrontiera > 5e-5 && m1.abatereFrontiera > 10 * m0.abatereFrontiera ? 'PRINS' : 'NEPRINS'}`);
  rez.push({ control: 'deplasare 1e-4', fara: m0.abatereFrontiera, cu: m1.abatereFrontiera });
}
fs.writeFileSync('rez-e-deriva.json', JSON.stringify(rez, null, 1));
