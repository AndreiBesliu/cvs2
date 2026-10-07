// T1-T6: oracole pe hartie (analitice). Fiecare functie intoarce randuri de rezultat.
import { createRequire } from 'node:module';
import { circle, rrect, transformContour, matScale, matRotTrans, countKinds, cubicToBiarcs, cubicOffsetTH, contourToLA, arcToCubics, TAU } from './geom.mjs';
import { areaRegion, lengthRegion, truth, sdRoundBox, distEllipse, distCubic, cubicPointNormal, maxDevOut, maxDevTruthToOut, densePolys, maxGap, winding } from './oracol.mjs';
import * as AD from './adaptoare.mjs';
const require = createRequire(import.meta.url);

// aria regiunii independenta de orientare: adancimea de includere decide semnul (par-impar)
export function areaEO(region, h) {
  const polys = densePolys(region, h);
  let A = 0;
  region.forEach((c, i) => {
    const a = Math.abs(areaRegion([c]));
    const p = polys[i][Math.floor(polys[i].length / 3)];
    const others = polys.filter((_, j) => j !== i);
    const inside = winding(others, p[0], p[1]).evenodd;
    A += inside ? -a : a;
  });
  return A;
}
const fmt = (x, d = 4) => (x === null || x === undefined || Number.isNaN(x)) ? '-' : (Math.abs(x) !== 0 && (Math.abs(x) < 1e-3 || Math.abs(x) >= 1e6) ? x.toExponential(2) : x.toFixed(d));
const kinds = (r) => { const k = countKinds(r); return Object.entries(k).filter(([n, v]) => v && n !== 'contururi').map(([n, v]) => v + n).join('+') + ` /${k.contururi}c`; };

export function libsOffset() { return [AD.cavalier, AD.flatten, AD.makerjs, AD.paperjs, { ...AD.skia, nume: AD.skia.nume + ' precision=100', offset: (r, d) => AD.skia.offset(r, d, { precision: 100 }) }, AD.makeClipper(0.001, 0), AD.makeClipper(0.001, 0.001)]; }
export function libsBool() { return [AD.cavalier, AD.flatten, AD.makerjs, AD.paperjs, AD.skia, AD.makeClipper(0.001, 0), AD.makeClipper(0.001, 0.001)]; }

// ---------- T1: offset de cerc ----------
export function T1() {
  const rows = [];
  const cases = [{ r: 50, d: 3 }, { r: 50, d: -3 }, { r: 1220, d: 3.175 }, { r: 0.5, d: 0.01 }, { r: 0.05, d: -0.01 }];
  for (const L of libsOffset()) for (const { r, d } of cases) {
    const R = r + d; const h = Math.min(0.01, R / 2000);
    try {
      const t0 = performance.now();
      const out = L.offset([circle(0, 0, r)], d);
      const ms = performance.now() - t0;
      const A = Math.abs(areaEO(out, h)), P = lengthRegion(out);
      const devOut = maxDevOut(out, (x, y) => Math.hypot(x, y) - R, h);
      const tp = []; for (let i = 0; i < 3600; i++) tp.push([R * Math.cos(i / 3600 * TAU), R * Math.sin(i / 3600 * TAU)]);
      const devIn = maxDevTruthToOut(tp, out, h);
      rows.push({ test: 'T1 offset cerc', lib: L.nume, caz: `r=${r} d=${d}`, entitati: kinds(out), errArieRel: (A - truth.circleArea(R)) / truth.circleArea(R), errPerimRel: (P - truth.circlePerim(R)) / truth.circlePerim(R), abatereMax: Math.max(devOut, devIn), ms });
    } catch (e) { rows.push({ test: 'T1 offset cerc', lib: L.nume, caz: `r=${r} d=${d}`, eroare: e.message.slice(0, 100) }); }
  }
  return rows;
}

// ---------- T2: offset de dreptunghi rotunjit rotit 30 grade ----------
export function T2() {
  const rows = [];
  const W = 100, H = 60, r = 8, rot = Math.PI / 6, cx = 100, cy = 50;
  const inp = [rrect(cx, cy, W, H, r, rot)];
  // verificarea constructorului fata de adevarul analitic (sanity)
  const inDev = maxDevOut(inp, (x, y) => sdRoundBox(x, y, cx, cy, W, H, r, rot), 0.01);
  rows.push({ test: 'T2 intrare', lib: 'model propriu (rotire exacta)', caz: 'rrect 100x60 r8 rotit 30°', entitati: kinds(inp), abatereMax: inDev, errArieRel: (Math.abs(areaRegion(inp)) - truth.rrectOffArea(W, H, r, 0)) / truth.rrectOffArea(W, H, r, 0) });
  for (const L of libsOffset()) for (const d of [3, -3, -10]) {
    try {
      const t0 = performance.now();
      const out = L.offset(inp, d);
      const ms = performance.now() - t0;
      const h = 0.01;
      const A = Math.abs(areaEO(out, h)), P = lengthRegion(out);
      const devOut = maxDevOut(out, (x, y) => sdRoundBox(x, y, cx, cy, W, H, r, rot) - d, h);
      // adevarul: forma decalata exacta (pentru d<-r colturile devin ascutite)
      const e = -d; const tr = d >= 0 ? rrect(cx, cy, W + 2 * d, H + 2 * d, r + d, rot) : rrect(cx, cy, W - 2 * e, H - 2 * e, Math.max(0, r - e), rot);
      const tpts = densePolys([tr], 0.02).flat();
      const devIn = maxDevTruthToOut(tpts, out, h);
      rows.push({ test: 'T2 offset rrect rotit', lib: L.nume, caz: `d=${d}`, entitati: kinds(out), errArieRel: (A - truth.rrectOffArea(W, H, r, d)) / truth.rrectOffArea(W, H, r, d), errPerimRel: (P - truth.rrectOffPerim(W, H, r, d)) / truth.rrectOffPerim(W, H, r, d), abatereMax: Math.max(devOut, devIn), ms });
    } catch (e) { rows.push({ test: 'T2 offset rrect rotit', lib: L.nume, caz: `d=${d}`, eroare: e.message.slice(0, 100) }); }
  }
  return rows;
}

// ---------- T3: offset de contur DESCHIS (o parte), cu arc si colt ----------
export function T3() {
  const rows = [];
  const path = { closed: false, segs: [
    { k: 'L', x0: 0, y0: 0, x1: 40, y1: 0 },
    { k: 'A', cx: 40, cy: 10, r: 10, a0: -Math.PI / 2, da: Math.PI / 2 },
    { k: 'L', x0: 50, y0: 10, x1: 50, y1: 40 },
    { k: 'L', x0: 50, y0: 40, x1: 20, y1: 60 },
  ] };
  // distanta exacta la calea originala (oracol: L/A analitic)
  const distPath = (x, y) => {
    let best = Infinity;
    for (const s of path.segs) {
      if (s.k === 'L') { const dx = s.x1 - s.x0, dy = s.y1 - s.y0, l2 = dx * dx + dy * dy; let t = ((x - s.x0) * dx + (y - s.y0) * dy) / l2; t = Math.max(0, Math.min(1, t)); best = Math.min(best, Math.hypot(s.x0 + t * dx - x, s.y0 + t * dy - y)); }
      else { const a = Math.atan2(y - s.cy, x - s.cx); let rel = ((a - s.a0) % TAU + TAU) % TAU; if (rel <= s.da) best = Math.min(best, Math.abs(Math.hypot(x - s.cx, y - s.cy) - s.r)); else { best = Math.min(best, Math.hypot(x - (s.cx + s.r * Math.cos(s.a0)), y - (s.cy + s.r * Math.sin(s.a0))), Math.hypot(x - (s.cx + s.r * Math.cos(s.a0 + s.da)), y - (s.cy + s.r * Math.sin(s.a0 + s.da)))); } }
    }
    return best;
  };
  for (const d of [2, -2]) {
    try {
      const out = AD.cavalier.offsetOpen(path, d);
      const dev = maxDevOut(out, (x, y) => distPath(x, y) - Math.abs(d), 0.005);
      // pe hartie: dreapta = 40 + 12·π/2 + 30 + racord r=2 pe unghiul de intoarcere θ=acos(20/√1300) + 36,0555
      const Lr = 40 + 6 * Math.PI + 30 + 2 * Math.acos(20 / Math.hypot(30, 20)) + Math.hypot(30, 20);
      // stanga: 40 + 8·π/2 + 28,92977 + 34,98483 (L2 si L3 taiate la intersectia lor, calculata de mana)
      const Ll = 40 + 4 * Math.PI + 28.92977 + 34.98483;
      const st = out[0] ? out[0].segs[0] : null; const side = st && st.k === 'L' ? (st.y0 > 0 ? 'stanga' : 'dreapta') : '?';
      rows.push({ test: 'T3 offset deschis, o parte', lib: AD.cavalier.nume, caz: `L-arc-L-colt, d=${d} (${side})`, entitati: kinds(out), abatereMax: dev, gol: maxGap(out), lungime: lengthRegion(out), lungimeHartie: side === 'stanga' ? Ll : Lr });
    } catch (e) { rows.push({ test: 'T3 offset deschis', lib: AD.cavalier.nume, caz: `d=${d}`, eroare: e.message }); }
  }
  // paperjs-offset pe cale deschisa (pentru comparatie)
  try {
    const { PaperOffset, toPaper, fromPaper } = AD.paperjs.raw;
    const out = fromPaper(PaperOffset.offset(toPaper([path]), 2, { join: 'round', insert: false }));
    const dev = maxDevOut(out, (x, y) => distPath(x, y) - 2, 0.005);
    rows.push({ test: 'T3 offset deschis, o parte', lib: AD.paperjs.nume, caz: 'd=2', entitati: kinds(out), abatereMax: dev, gol: maxGap(out) });
  } catch (e) { rows.push({ test: 'T3 offset deschis', lib: AD.paperjs.nume, caz: 'd=2', eroare: e.message }); }
  rows.push({ test: 'T3 offset deschis, o parte', lib: 'Clipper2 / Skia', caz: '-', nota: 'offsetul deschis inconjoara linia pe ambele parti (EndType/stroke); nu exista offset pe o singura parte [citit]' });
  return rows;
}

// ---------- T4: boolean pe doua cercuri + cazuri degenerate ----------
export function T4() {
  const rows = [];
  const r = 30;
  const sd1 = (x, y) => Math.hypot(x, y) - r;
  const mk = (c) => [[circle(0, 0, r)], [circle(c, 0, r)]];
  for (const L of libsBool()) {
    for (const c of [30, 59.999, 60.001]) for (const op of ['union', 'inter', 'diff', 'xor']) {
      const sd2 = (x, y) => Math.hypot(x - c, y) - r;
      const lens = truth.lens(r, c), Ac = Math.PI * r * r;
      const exp = { union: 2 * Ac - lens, inter: lens, diff: Ac - lens, xor: 2 * Ac - 2 * lens }[op];
      const sdf = { union: (x, y) => Math.min(sd1(x, y), sd2(x, y)), inter: (x, y) => Math.max(sd1(x, y), sd2(x, y)), diff: (x, y) => Math.max(sd1(x, y), -sd2(x, y)), xor: (x, y) => Math.min(Math.abs(Math.min(sd1(x, y), sd2(x, y))), Math.abs(Math.max(sd1(x, y), sd2(x, y)))) }[op];
      try {
        const [A, B] = mk(c);
        const t0 = performance.now();
        const out = L.bool(A, B, op);
        const ms = performance.now() - t0;
        const h = 0.005;
        const Aout = out.length ? Math.abs(areaEO(out, h)) : 0;
        const devOut = out.length ? maxDevOut(out, sdf, h) : 0;
        rows.push({ test: 'T4 boolean cercuri', lib: L.nume, caz: `c=${c} ${op}`, entitati: kinds(out), errArieAbs: Aout - exp, errArieRel: exp > 0 ? (Aout - exp) / exp : null, abatereMax: devOut, ms });
      } catch (e) { rows.push({ test: 'T4 boolean cercuri', lib: L.nume, caz: `c=${c} ${op}`, eroare: (e instanceof AD.Nesuportat ? 'NESUPORTAT: ' : '') + e.message.slice(0, 100) }); }
    }
    // muchii coincidente: doua patrate cu latura comuna -> dreptunghi 20x10
    try {
      const a = [rrect(5, 5, 10, 10, 0)], b = [rrect(15, 5, 10, 10, 0)];
      const out = L.bool(a, b, 'union');
      rows.push({ test: 'T4 muchie comuna', lib: L.nume, caz: 'patrat ∪ patrat (latura comuna)', entitati: kinds(out), errArieAbs: Math.abs(areaEO(out, 0.005)) - 200 });
    } catch (e) { rows.push({ test: 'T4 muchie comuna', lib: L.nume, caz: 'patrat ∪ patrat', eroare: e.message.slice(0, 100) }); }
    // acelasi cerc de doua ori
    try {
      const out = L.bool([circle(10, 10, 25)], [circle(10, 10, 25)], 'union');
      rows.push({ test: 'T4 cerc identic', lib: L.nume, caz: 'C ∪ C', entitati: kinds(out), errArieAbs: Math.abs(areaEO(out, 0.005)) - Math.PI * 625 });
    } catch (e) { rows.push({ test: 'T4 cerc identic', lib: L.nume, caz: 'C ∪ C', eroare: e.message.slice(0, 100) }); }
    // detaliu mic pe placa mare: placa 2440x1220 ∪ cerc r=0.01 centrat pe muchia de sus
    try {
      const out = L.bool([rrect(1220, 610, 2440, 1220, 0)], [circle(1220, 1220, 0.01)], 'union');
      const polys = densePolys(out, 0.0005);
      const inBump = winding(polys, 1220, 1220.008).evenodd, outside = !winding(polys, 1220.012, 1220.002).evenodd;
      rows.push({ test: 'T4 detaliu 0,01 pe 2440', lib: L.nume, caz: 'placa ∪ cerc r=0,01', entitati: kinds(out), corect: inBump && outside });
    } catch (e) { rows.push({ test: 'T4 detaliu 0,01 pe 2440', lib: L.nume, caz: 'placa ∪ cerc r=0,01', eroare: e.message.slice(0, 100) }); }
  }
  return rows;
}

// ---------- T5: transformari ----------
export function T5() {
  const rows = [];
  // rotire de dreptunghi rotunjit in modelul propriu (primitiva + matrice)
  const W = 100, H = 60, r = 8;
  const base = rrect(0, 0, W, H, r, 0);
  const rot = transformContour(base, matRotTrans(Math.PI / 6, 100, 50));
  rows.push({ test: 'T5 rotire 30°', lib: 'model propriu', caz: 'rrect 100x60 r8', entitati: kinds([rot]), abatereMax: maxDevOut([rot], (x, y) => sdRoundBox(x, y, 100, 50, W, H, r, Math.PI / 6), 0.01) });
  // scalare neuniforma 2x1 a unui cerc -> elipsa
  for (const R of [50, 1220]) {
    const a = 2 * R, b = R;
    const de = (x, y) => distEllipse(x, y, a, b);
    const c = circle(0, 0, R);
    const K = transformContour(c, matScale(2, 1), { arcAs: 'K' });
    rows.push({ test: 'T5 scalare 2x1', lib: 'conica (exact)', caz: `cerc r=${R}`, entitati: kinds([K]), abatereMax: maxDevOut([K], de, R / 2000) });
    for (const tol of [0.01, 0.001]) {
      // cubice: cel mai mic n (pe cerc) care respecta toleranta
      let n = 4, dev = Infinity, Cc = null;
      while (n <= 256) { Cc = transformContour(c, matScale(2, 1), { arcAs: 'C', n }); dev = maxDevOut([Cc], de, R / 2000); if (dev <= tol) break; n *= 2; }
      rows.push({ test: 'T5 scalare 2x1', lib: 'cubice κ (aprox.)', caz: `cerc r=${R}, tol ${tol}`, entitati: kinds([Cc]), abatereMax: dev });
      const Ab = transformContour(c, matScale(2, 1), { arcAs: 'A', tol: tol * 0.9 });
      rows.push({ test: 'T5 scalare 2x1', lib: 'biarce proprii (aprox.)', caz: `cerc r=${R}, tol ${tol}`, entitati: kinds([Ab]), abatereMax: maxDevOut([Ab], de, R / 2000), gol: maxGap([Ab]) });
    }
  }
  // cubicele cercului (paper.js) la r=1220: abaterea cercului insusi
  for (const R of [50, 1220]) {
    const cc = { closed: true, segs: circle(0, 0, R).segs.flatMap((s) => arcToCubics(s, 4)) };
    rows.push({ test: 'T5 cerc ca 4 cubice', lib: 'reprezentarea paper.js', caz: `r=${R}`, entitati: kinds([cc]), abatereMax: maxDevOut([cc], (x, y) => Math.hypot(x, y) - R, R / 2000) });
  }
  return rows;
}

// ---------- T6: offset de cubica ----------
export function T6() {
  const rows = [];
  const { Bezier } = require('bezier-js');
  const curves = {
    'C (fara inflexiune)': { k: 'C', x0: 0, y0: 0, x1: 0, y1: 50, x2: 100, y2: 50, x3: 100, y3: 0 },
    'S (cu inflexiune)': { k: 'C', x0: 0, y0: 0, x1: 30, y1: 40, x2: 70, y2: -40, x3: 100, y3: 0 },
  };
  for (const [name, cv] of Object.entries(curves)) {
    // raza minima de curbura (pentru a alege d fara cuspizi)
    let rmin = Infinity; for (let i = 0; i <= 2000; i++) { const t = i / 2000; const h = 1e-5; const [p0, n0] = cubicPointNormal(cv, Math.max(0, t - h)); const [p1, n1] = cubicPointNormal(cv, Math.min(1, t + h)); const ds = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); const dth = Math.abs(Math.atan2(n0[0] * n1[1] - n0[1] * n1[0], n0[0] * n1[0] + n0[1] * n1[1])); if (dth > 0) rmin = Math.min(rmin, ds / dth); }
    for (const d of [3, -3]) {
      if (Math.abs(d) >= rmin * 0.95) { rows.push({ test: 'T6 offset cubica', lib: '-', caz: `${name} d=${d}`, nota: `sarit: |d| >= raza minima ${rmin.toFixed(2)}` }); continue; }
      // adevarul: punctele exacte ale offsetului p(t) + d n(t) (n = normala la dreapta)
      const tpts = []; for (let i = 0; i <= 2000; i++) { const [p, n] = cubicPointNormal(cv, i / 2000); tpts.push([p[0] + n[0] * d, p[1] + n[1] * d]); }
      const measure = (out) => { const devOut = maxDevOut(out, (x, y) => distCubic(cv, x, y) - Math.abs(d), 0.01); const devIn = maxDevTruthToOut(tpts, out, 0.01); return Math.max(devOut, devIn); };
      // bezier-js
      try {
        const bz = new Bezier(cv.x0, cv.y0, cv.x1, cv.y1, cv.x2, cv.y2, cv.x3, cv.y3);
        const offs = bz.offset(-d); // bezier-js: normala la stanga
        const segs = offs.map((b) => b.points.length === 4 ? { k: 'C', x0: b.points[0].x, y0: b.points[0].y, x1: b.points[1].x, y1: b.points[1].y, x2: b.points[2].x, y2: b.points[2].y, x3: b.points[3].x, y3: b.points[3].y } : { k: 'Q', x0: b.points[0].x, y0: b.points[0].y, x1: b.points[1].x, y1: b.points[1].y, x2: b.points[2].x, y2: b.points[2].y });
        const out = [{ closed: false, segs }];
        // verifica semnul: daca abaterea e mare, incearca semnul opus
        let dev = measure(out);
        if (dev > Math.abs(d)) { const o2 = bz.offset(d).map((b) => ({ k: 'C', x0: b.points[0].x, y0: b.points[0].y, x1: b.points[1].x, y1: b.points[1].y, x2: b.points[2].x, y2: b.points[2].y, x3: b.points[3].x, y3: b.points[3].y })); const dv2 = measure([{ closed: false, segs: o2 }]); if (dv2 < dev) { dev = dv2; out[0].segs = o2; } }
        rows.push({ test: 'T6 offset cubica', lib: 'bezier-js 6.1.4 offset()', caz: `${name} d=${d}`, entitati: kinds(out), abatereMax: dev, gol: maxGap(out) });
      } catch (e) { rows.push({ test: 'T6 offset cubica', lib: 'bezier-js', caz: `${name} d=${d}`, eroare: e.message }); }
      // paperjs-offset pe calea deschisa cu o cubica
      try {
        const { PaperOffset, toPaper, fromPaper } = AD.paperjs.raw;
        // conventia de semn pe cale deschisa nu e documentata: se incearca ambele semne, se pastreaza cel mai bun
        const o1 = fromPaper(PaperOffset.offset(toPaper([{ closed: false, segs: [cv] }]), -d, { insert: false }));
        const o2 = fromPaper(PaperOffset.offset(toPaper([{ closed: false, segs: [cv] }]), d, { insert: false }));
        const m1 = measure(o1), m2 = measure(o2); const out = m1 <= m2 ? o1 : o2;
        rows.push({ test: 'T6 offset cubica', lib: 'paperjs-offset 2.2.1', caz: `${name} d=${d}`, entitati: kinds(out), abatereMax: Math.min(m1, m2), gol: maxGap(out) });
      } catch (e) { rows.push({ test: 'T6 offset cubica', lib: 'paperjs-offset', caz: `${name} d=${d}`, eroare: e.message }); }
      // propriu: Tiller-Hanson cu subdivizare (iesire: cubice)
      for (const tol of [0.01, 0.001]) {
        const out = [{ closed: false, segs: cubicOffsetTH(cv, d, tol * 0.9) }];
        rows.push({ test: 'T6 offset cubica', lib: `propriu Tiller-Hanson, tol ${tol}`, caz: `${name} d=${d}`, entitati: kinds(out), abatereMax: measure(out), gol: maxGap(out) });
      }
      // propriu: cubica -> biarce (o singura aproximare) -> offset EXACT al arcelor (cavalier)
      for (const tol of [0.01, 0.001]) {
        const la = { closed: false, segs: cubicToBiarcs(cv, tol * 0.9) };
        const out = AD.cavalier.offsetOpen(la, d);
        rows.push({ test: 'T6 offset cubica', lib: `biarce proprii (tol ${tol}) + offset exact cavalier`, caz: `${name} d=${d}`, entitati: kinds(out), abatereMax: measure(out), gol: maxGap(out), arceIntrare: la.segs.length });
      }
    }
  }
  return rows;
}

export { fmt, kinds };
