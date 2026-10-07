// (c) Intrari murdare, ca in DXF-urile reale: polilinii de 5 000 de segmente, segmente de lungime zero, varfuri
// duplicate, arce aproape coliniare (bulge 1e-9..1e-6), arce minuscule (r 0,001 mm), un 8 care se autointersecteaza.
// Asteptat: rezultat corect sau eroare curata, explicita; niciodata blocaj, niciodata gunoi tacut.
// Fiecare offset ruleaza intr-un worker cu termen de 20 s.
import fs from 'node:fs';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

if (!isMainThread) {
  const cc = await import('cavalier-contours-js');
  parentPort.on('message', (m) => {
    const t0 = performance.now();
    try {
      const pl = m.closed ? cc.plineClosed(m.verts) : cc.plineOpen(m.verts);
      const si = m.scanSelf ? pl.scanForSelfIntersect() : null;
      const res = m.opts ? pl.parallelOffsetOpt(m.d, { ...cc.defaultPlineOffsetOptions(), ...m.opts }) : pl.parallelOffset(m.d);
      const ms = performance.now() - t0;
      const out = res.map((q) => { const v = []; for (let i = 0; i < q.vertexCount; i++) { const a = q.at(i); v.push([a.x, a.y, a.bulge]); } return { v, closed: q.isClosed, area: q.isClosed ? q.area() : null }; });
      parentPort.postMessage({ status: 'ok', out, ms, selfIntersects: si });
    } catch (e) { parentPort.postMessage({ status: 'exceptie', msg: String(e && e.message || e).slice(0, 200), ms: performance.now() - t0 }); }
  });
} else {
  const { insideExact } = await import('./adevar.mjs');
  const RAPID = process.argv.includes('--rapid'); // --rapid: mai putine niveluri, 5 repetari, esantionare 0,2 mm pe intrarile dense
  const HD = { hS: RAPID ? 0.2 : 0.05 };
  const { plineToSegs, samplesOf, dSeg, P } = await import('./oracol-v1.mjs');
  const { fmt, median } = await import('./comun.mjs');

  // worker persistent; la depasirea termenului se termina si se recreeaza
  let W = null;
  const spawn = () => { W = new Worker(new URL(import.meta.url)); W.unref(); };
  spawn();
  const call = (msg, ms = 20000) => new Promise((res) => {
    const tm = setTimeout(() => { W.terminate(); spawn(); res({ status: 'blocaj', ms }); }, ms);
    W.once('message', (m) => { clearTimeout(tm); res(m); });
    W.postMessage(msg);
  });

  const toSegs = (verts, closed) => plineToSegs(verts.map(([x, y, b]) => ({ x, y, bulge: b })), closed);
  // index rapid de distanta (grila de celule) pentru intrari mari; verificat contra distantei directe pe 2 000 de puncte
  function fastTruth(region, cell) {

    const segs = region.flatMap((c) => c.segs);
    const bb = segs.map((s) => { if (s.k === 'L') return [Math.min(s.x0, s.x1), Math.min(s.y0, s.y1), Math.max(s.x0, s.x1), Math.max(s.y0, s.y1)]; const p0 = P(s, 0), p1 = P(s, 1), pm = P(s, 0.5); const sag = s.r * (1 - Math.cos(Math.min(Math.PI, Math.abs(s.da)) / 2)) + 1e-9; return [Math.min(p0[0], p1[0], pm[0]) - sag, Math.min(p0[1], p1[1], pm[1]) - sag, Math.max(p0[0], p1[0], pm[0]) + sag, Math.max(p0[1], p1[1], pm[1]) + sag]; });
    // arcele mari (> 180 grade) primesc caseta cercului
    segs.forEach((s, i) => { if (s.k === 'A' && Math.abs(s.da) > Math.PI / 2) bb[i] = [s.cx - s.r, s.cy - s.r, s.cx + s.r, s.cy + s.r]; });
    let X0 = Infinity, Y0 = Infinity; for (const b of bb) { X0 = Math.min(X0, b[0]); Y0 = Math.min(Y0, b[1]); }
    const grid = new Map(); const key = (i, j) => i * 100003 + j;
    bb.forEach((b, k) => { for (let i = Math.floor((b[0] - X0) / cell); i <= Math.floor((b[2] - X0) / cell); i++) for (let j = Math.floor((b[1] - Y0) / cell); j <= Math.floor((b[3] - Y0) / cell); j++) { const K = key(i, j); if (!grid.has(K)) grid.set(K, []); grid.get(K).push(k); } });
    const maxRing = 4000;
    const d = (x, y) => {
      const ci = Math.floor((x - X0) / cell), cj = Math.floor((y - Y0) / cell); let best = Infinity;
      for (let ring = 0; ring < maxRing; ring++) {
        for (let i = ci - ring; i <= ci + ring; i++) for (let j = cj - ring; j <= cj + ring; j++) {
          if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== ring) continue;
          const L = grid.get(key(i, j)); if (!L) continue; for (const k of L) { const v = dSeg(segs[k], x, y); if (v < best) best = v; }
        }
        if (best <= ring * cell) break;
      }
      return best;
    };
    return { sd: (x, y) => { const v = d(x, y); return insideExact(region, x, y) ? v : -v; }, d };

  }

  // adevarul pe nivelul L: puncte pe normalele segmentelor de intrare + evantaie la varfuri (pentru offset exterior)
  function normalTruth(region, L, sd) {
    const pts = [];
    for (const c of region) for (const s of c.segs) for (const t of [0.25, 0.5, 0.75]) {
      const p = P(s, t), q = P(s, Math.min(1, t + 1e-7)), p0 = P(s, Math.max(0, t - 1e-7)); const tx = q[0] - p0[0], ty = q[1] - p0[1], l = Math.hypot(tx, ty); if (!(l > 0)) continue;
      const nx = -ty / l, ny = tx / l; const c0 = [p[0] + nx * L, p[1] + ny * L]; // L>0: spre stanga = interior la CCW
      if (Math.abs(sd(c0[0], c0[1]) - L) < 1e-9) pts.push(c0);
    }
    return pts;
  }
  async function runClosed(name, verts, L, cfg = {}) {
    const region = [toSegs(verts, true)];
    const ft = fastTruth(region, cfg.cell || 2);
    const r = await call({ verts, closed: true, d: L, opts: cfg.opts, scanSelf: cfg.scanSelf });
    const rec = { caz: name, nivel: L, status: r.status, ms: r.ms, msg: r.msg, selfIntersects: r.selfIntersects };
    if (r.status !== 'ok') return rec;
    const loops = r.out.map((o) => toSegs(o.v, o.closed));
    rec.bucle = loops.length; rec.varfuri = r.out.reduce((a, o) => a + o.v.length, 0);
    rec.nan = r.out.some((o) => o.v.some((v) => v.some((x) => !Number.isFinite(x))));
    if (rec.nan) return rec;
    let e = 0; for (const p of samplesOf(loops, cfg.hS || 0.05)) e = Math.max(e, Math.abs(ft.sd(p[0], p[1]) - L));
    rec.iesireAdevar = loops.length ? e : null;
    const tp = normalTruth(region, L, ft.sd); rec.puncteAdevar = tp.length;
    const segs = loops.flatMap((c) => c.segs); let h = 0; for (const q of tp) { let b = Infinity; for (const s of segs) { const v = dSeg(s, q[0], q[1]); if (v < b) b = v; if (b < 1e-9) break; } h = Math.max(h, b); }
    rec.adevarIesire = tp.length ? h : null;
    rec.ariiIesire = r.out.map((o) => o.area);
    return rec;
  }

  const out = [];
  const log = (r) => { out.push(r); console.log(`${r.caz.padEnd(44)} L=${String(r.nivel).padEnd(9)} ${r.status.padEnd(9)} ${fmt(r.ms, 1)} ms | bucle ${r.bucle ?? '-'} | iesire->adevar ${fmt(r.iesireAdevar)} | adevar->iesire ${fmt(r.adevarIesire)} (${r.puncteAdevar ?? '-'} pct)${r.selfIntersects !== undefined && r.selfIntersects !== null ? ' | autointersectie: ' + r.selfIntersects : ''}${r.msg ? ' | ' + r.msg : ''}${r.nan ? ' | NaN!' : ''}`); };

  // 1) elipsa 100 x 50 aplatizata in 5 000 de segmente (CCW)
  const N = 5000;
  const ell = Array.from({ length: N }, (_, i) => { const t = 2 * Math.PI * i / N; return [100 * Math.cos(t), 50 * Math.sin(t), 0]; });
  { // indexul rapid verificat contra distantei directe (fara index) pe 2 000 de puncte
    const { distIndex, dist } = await import('./oracol-v1.mjs');
    const reg = [toSegs(ell, true)], ft = fastTruth(reg, 2), ix = distIndex(reg); let m = 0, s = 3;
    const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < 2000; i++) { const x = -120 + 240 * rnd(), y = -70 + 140 * rnd(); m = Math.max(m, Math.abs(ft.d(x, y) - dist(ix, x, y))); }
    console.log('index rapid vs distanta directa, 2 000 de puncte: diferenta max', m); out.push({ caz: 'verificare index rapid', diferentaMax: m });
  }
  for (const L of (RAPID ? [3.175, -3.175] : [3.175, -3.175, 20, 30])) log(await runClosed('elipsa 5000 segmente', ell, L, HD));
  // timp: mediana a 7 repetari, in worker (offset +-3,175)
  for (const L of [3.175, -3.175]) { const ts = []; for (let i = 0; i < (RAPID ? 5 : 7); i++) ts.push((await call({ verts: ell, closed: true, d: L })).ms); out.push({ caz: 'timp elipsa 5000', nivel: L, msMedian: median(ts), msToate: ts }); console.log(`  timp offset elipsa 5000, L=${L}: mediana ${fmt(median(ts), 1)} ms din ${ts.length} (${ts.map((t) => t.toFixed(0)).join(', ')})`); }
  // 2) curba ondulata (spline aplatizat) 5 000 de segmente, cu zone concave
  const wav = Array.from({ length: N }, (_, i) => { const t = 2 * Math.PI * i / N, r = 50 + 8 * Math.sin(5 * t) + 3 * Math.sin(13 * t); return [r * Math.cos(t), r * Math.sin(t), 0]; });
  for (const L of (RAPID ? [3.175, 6] : [3.175, -3.175, 6, -6])) log(await runClosed('ondulata 5000 segmente', wav, L, HD));
  { const ts = []; for (let i = 0; i < (RAPID ? 5 : 7); i++) ts.push((await call({ verts: wav, closed: true, d: 3.175 })).ms); out.push({ caz: 'timp ondulata 5000', nivel: 3.175, msMedian: median(ts), msToate: ts }); console.log(`  timp offset ondulata 5000, L=3.175: mediana ${fmt(median(ts), 1)} ms din ${ts.length}`); }
  // 3) varfuri duplicate consecutive (segmente de lungime zero): fiecare al 50-lea varf dublat
  const dup = []; ell.forEach((v, i) => { dup.push(v); if (i % 50 === 0) dup.push([v[0], v[1], 0]); });
  for (const L of [3.175, -3.175]) log(await runClosed('elipsa cu 100 de varfuri duplicate', dup, L, HD));
  // 3b) duplicate exacte + bulge pe segmentul de lungime zero (arc de lungime zero)
  const sqz = [[0, 0, 0], [50, 0, 0], [50, 0, 0.5], [50, 50, 0], [0, 50, 0]];
  for (const L of [3.175, -3.175]) log(await runClosed('patrat cu arc de lungime zero', sqz, L, { cell: 1 }));
  // 3c) varfuri aproape duplicate (1e-9 .. 1e-6 mm), sub posEqualEps = 1e-5
  for (const e of [1e-9, 1e-7, 1e-6]) { const nd = [[0, 0, 0], [50, 0, 0], [50 + e, e, 0], [50, 50, 0], [0, 50, 0]]; log(await runClosed(`patrat cu varf aproape dublu (${e})`, nd, -3.175, { cell: 1 })); }
  // 4) arce aproape coliniare: dreptunghi 100 x 60 cu fiecare latura arc de bulge b
  for (const b of [1e-9, 1e-8, 1e-7, 1e-6]) {
    const rv = [[0, 0, b], [100, 0, b], [100, 60, b], [0, 60, b]];
    for (const L of [3.175, -3.175]) log(await runClosed(`dreptunghi cu laturi-arc bulge ${b}`, rv, L, { cell: 1 }));
  }
  // 4b) latura impartita in 10 bucati cu bulge alternant +-1e-7
  { const v = []; for (let i = 0; i < 10; i++) v.push([10 * i, 0, i % 2 ? 1e-7 : -1e-7]); v.push([100, 0, 0], [100, 60, 0], [0, 60, 0]); for (const L of [3.175, -3.175]) log(await runClosed('latura din 10 arce bulge +-1e-7', v, L, { cell: 1 })); }
  // 5) arce minuscule: patrat 50 cu colturi rotunjite r = 0,001
  { const r = 0.001, b = Math.tan(Math.PI / 8); const v = [[r, 0, 0], [50 - r, 0, b], [50, r, 0], [50, 50 - r, b], [50 - r, 50, 0], [r, 50, b], [0, 50 - r, 0], [0, r, b]];
    for (const L of [3.175, -3.175, 0.0005, 0.002, -0.0005]) log(await runClosed('patrat cu colturi r=0,001', v, L, { cell: 1, hS: 0.0002 })); }
  // 5b) cerc minuscul ca intrare separata: r = 0,001 / 1e-5 / 4e-6 (sub posEqualEps)
  for (const r of [0.001, 1e-5, 4e-6]) { const v = [[r, 0, 1], [-r, 0, 1]]; for (const L of [-3.175, r / 2, 2 * r]) log(await runClosed(`cerc r=${r}`, v, L, { cell: 0.5, hS: Math.min(0.05, r / 4) })); }
  // 6) 8 care se autointersecteaza (lemniscata Bernoulli, 400 de varfuri), cu optiunile implicite si cu handleSelfIntersects
  const lem = Array.from({ length: 400 }, (_, i) => { const t = 2 * Math.PI * i / 400, s = Math.sin(t), c = Math.cos(t); return [50 * c / (1 + s * s), 50 * s * c / (1 + s * s), 0]; });
  for (const opts of [undefined, { handleSelfIntersects: true }]) for (const L of [1, -1]) {
    const r = await call({ verts: lem, closed: true, d: L, opts, scanSelf: true });
    const rec = { caz: `optul (8) ${opts ? 'handleSelfIntersects' : 'implicit'}`, nivel: L, status: r.status, ms: r.ms, selfIntersects: r.selfIntersects, msg: r.msg };
    if (r.status === 'ok') {
      rec.bucle = r.out.length; rec.arii = r.out.map((o) => o.area);
      // fiecare punct al iesirii la distanta |L| de cale (fara semn: regiunea unui 8 nu e definita)
      const segsIn = toSegs(lem, true).segs; const ft = fastTruth([{ closed: true, segs: segsIn }], 2); let e = 0;
      for (const p of samplesOf(r.out.map((o) => toSegs(o.v, o.closed)), 0.05)) e = Math.max(e, Math.abs(ft.d(p[0], p[1]) - Math.abs(L)));
      rec.iesireLaDistantaL = e;
    }
    out.push(rec); console.log(`${rec.caz.padEnd(44)} L=${String(L).padEnd(9)} ${rec.status.padEnd(9)} ${fmt(rec.ms, 1)} ms | bucle ${rec.bucle ?? '-'} arii ${JSON.stringify((rec.arii || []).map((a) => a === null ? "deschisa" : +a.toFixed(2)))} | |dist-|L|| max ${fmt(rec.iesireLaDistantaL)} | scanForSelfIntersect: ${rec.selfIntersects}`);
  }
  fs.writeFileSync(RAPID ? 'rez-c-murdar-rapid.json' : 'rez-c-murdar.json', JSON.stringify(out, null, 1));
  W.terminate();
}
