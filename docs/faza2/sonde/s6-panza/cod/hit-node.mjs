// hit-node.mjs — sonda s6-panza (ARUNCABIL). Hit-test pe 20 k forme: rbush vs flatbush vs scanare liniară,
// distanța exactă (geom.mjs) verificată față de oracolul analitic (oracle.mjs, fără cod comun).
// Rulare: node hit-node.mjs [--n 20000] [--q 5000] [--json out.json]
import fs from 'node:fs';
import opentype from 'opentype.js';
import RBush from 'rbush';
import Flatbush from 'flatbush';
import { shapeDist, inside } from './geom.mjs';
import { makeScene, sceneStats, mulberry32 } from './scene.mjs';
import { distAnalytic, insideAnalytic, cubicRoots } from './oracle.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg('--n', 20000), Q = +arg('--q', 5000), OUT = arg('--json', null);
const ns = () => Number(process.hrtime.bigint()) / 1e6;
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const med = (a) => pct(a, 0.5);
const r6 = (x) => Math.round(x * 1e6) / 1e6;

// 0) oracolul însuși, pe valori calculate pe hârtie
const paper = [];
{
  const parab = { t: 'quad', x0: -1, y0: 1, x1: 0, y1: -1, x2: 1, y2: 1 }; // y = x^2 pe [-1, 1]
  paper.push({ ce: 'parabola y=x^2, punct (0,1): sqrt(3)/2', got: distAnalytic(parab, 0, 1), want: Math.sqrt(3) / 2 });
  paper.push({ ce: 'parabola y=x^2, punct (0,-2): 2', got: distAnalytic(parab, 0, -2), want: 2 });
  paper.push({ ce: 'cerc r=40, punct la 43 de centru: 3', got: distAnalytic({ t: 'circle', cx: 0, cy: 0, r: 40 }, 43 * Math.cos(1), 43 * Math.sin(1)), want: 3 });
  paper.push({ ce: 'segment (0,0)-(3,4), punct (3,0): 12/5', got: distAnalytic({ t: 'seg', x0: 0, y0: 0, x1: 3, y1: 4 }, 3, 0), want: 2.4 });
  paper.push({ ce: 'arc r=30 0..120 grade, punct pe raza la 200 grade, d=10: distanța la capătul cel mai apropiat', got: distAnalytic({ t: 'arc', cx: 0, cy: 0, r: 30, a0: 0, da: 2 * Math.PI / 3 }, 10 * Math.cos(200 * Math.PI / 180), 10 * Math.sin(200 * Math.PI / 180)),
    want: Math.min(Math.hypot(10 * Math.cos(200 * Math.PI / 180) - 30, 10 * Math.sin(200 * Math.PI / 180)), Math.hypot(10 * Math.cos(200 * Math.PI / 180) - 30 * Math.cos(2 * Math.PI / 3), 10 * Math.sin(200 * Math.PI / 180) - 30 * Math.sin(2 * Math.PI / 3))) });
  const rr = cubicRoots(1, -6, 11, -6).sort((a, b) => a - b); // (t-1)(t-2)(t-3)
  paper.push({ ce: 'Cardano (t-1)(t-2)(t-3): 1,2,3', got: rr.join(','), want: '1,2,3', ok: rr.every((x, i) => Math.abs(x - (i + 1)) < 1e-12) });
}
for (const p of paper) if (p.ok === undefined) p.ok = Math.abs(p.got - p.want) < 1e-12;

const font = opentype.parse(fs.readFileSync('C:/Windows/Fonts/arial.ttf').buffer);
let t0 = ns();
const shapes = makeScene(N, 7, font);
const genMs = ns() - t0;
const stats = sceneStats(shapes);
const probes = shapes.filter((s) => s.an);

// 1) indexurile
function buildRBush() { const t = new RBush(16); t.load(shapes.map((s) => ({ minX: s.bb[0], minY: s.bb[1], maxX: s.bb[2], maxY: s.bb[3], id: s.id }))); return t; }
function buildFlat() { const f = new Flatbush(shapes.length, 16); for (const s of shapes) f.add(s.bb[0], s.bb[1], s.bb[2], s.bb[3]); f.finish(); return f; }
const buildR = [], buildF = [];
let rb, fb;
for (let i = 0; i < 7; i++) { t0 = ns(); rb = buildRBush(); buildR.push(ns() - t0); t0 = ns(); fb = buildFlat(); buildF.push(ns() - t0); }

// 2) hit-test: cea mai apropiată formă în toleranță; egalitate (sub 1e-9 mm) -> cea de deasupra (id mai mare)
function pick(cands, px, py, tol) {
  let best = -1, bd = tol;
  for (const id of cands) {
    const d = shapeDist(shapes[id], px, py, bd + 1e-9);
    if (d < bd - 1e-9 || (Math.abs(d - bd) <= 1e-9 && id > best && d <= tol)) { bd = Math.min(bd, d); best = id; }
  }
  return { id: best, d: best >= 0 ? bd : Infinity };
}
const hitR = (px, py, tol) => pick(rb.search({ minX: px - tol, minY: py - tol, maxX: px + tol, maxY: py + tol }).map((o) => o.id), px, py, tol);
const hitF = (px, py, tol) => pick(fb.search(px - tol, py - tol, px + tol, py + tol), px, py, tol);
const hitScan = (px, py, tol) => { const c = []; for (const s of shapes) if (s.bb[0] <= px + tol && s.bb[2] >= px - tol && s.bb[1] <= py + tol && s.bb[3] >= py - tol) c.push(s.id); return pick(c, px, py, tol); };

const rnd = mulberry32(99);
const zooms = [{ nume: 'placa intreaga (0,6 px/mm)', s: 0.6 }, { nume: '4 px/mm', s: 4 }, { nume: '40 px/mm', s: 40 }];
const TOL_PX = 5;
const results = [];
for (const z of zooms) {
  const tol = TOL_PX / z.s;
  const pts = []; for (let i = 0; i < Q; i++) pts.push([rnd() * 2440, rnd() * 1220]);
  // jumătate din puncte lângă o curbă (unde contează): un punct de pe contur + abatere < tol
  for (let i = 0; i < Q / 2; i++) { const sh = shapes[1 + Math.floor(rnd() * (shapes.length - 1 - probes.length))]; const s = sh.subs[0].segs[0]; const x = s.t === 'A' ? s.cx + s.r * Math.cos(s.a0) : s.x0, y = s.t === 'A' ? s.cy + s.r * Math.sin(s.a0) : s.y0; pts[i] = [x + (rnd() - 0.5) * tol, y + (rnd() - 0.5) * tol]; }
  const lat = { rbush: [], flatbush: [], scan: [] }; let mism = 0, mismScan = 0, hits = 0, cand = [];
  for (const [px, py] of pts) {
    let a = ns(); const r1 = hitR(px, py, tol); lat.rbush.push(ns() - a);
    a = ns(); const r2 = hitF(px, py, tol); lat.flatbush.push(ns() - a);
    a = ns(); const r3 = hitScan(px, py, tol); lat.scan.push(ns() - a);
    if (r1.id !== r2.id) mism++; if (r1.id !== r3.id || (r1.id >= 0 && Math.abs(r1.d - r3.d) > 1e-12)) mismScan++;
    if (r1.id >= 0) hits++;
    cand.push(fb.search(px - tol, py - tol, px + tol, py + tol).length);
  }
  results.push({ zoom: z.nume, tol_mm: r6(tol), interogari: pts.length, lovituri: hits, candidati_median: med(cand), candidati_p95: pct(cand, 0.95),
    rbush_ms: { med: r6(med(lat.rbush)), p95: r6(pct(lat.rbush, 0.95)), max: r6(Math.max(...lat.rbush)) },
    flatbush_ms: { med: r6(med(lat.flatbush)), p95: r6(pct(lat.flatbush, 0.95)), max: r6(Math.max(...lat.flatbush)) },
    scanare_ms: { med: r6(med(lat.scan)), p95: r6(pct(lat.scan, 0.95)), max: r6(Math.max(...lat.scan)) },
    rbush_vs_flatbush_diferente: mism, index_vs_scanare_diferente: mismScan });
}

// 3) oracolul analitic pe formele-sondă (în scena de 20 k, cu indexul): cea mai apropiată + distanța
const orc = { interogari: 0, id_gresit: 0, err_max_mm: 0, pe_tip: {} };
// conturul plăcii (forma 0) e și el o formă reală, aproape de zona-sondă: intră în oracol ca dreptunghi analitic
const oracleSet = [...probes, { id: 0, kind: 'sheet', an: { t: 'rrect', cx: 1220, cy: 610, w: 2440, h: 1220, r: 0.001, rot: 0 } }];
const rndO = mulberry32(1234);
for (let i = 0; i < 6000; i++) {
  const p = probes[i % probes.length]; const m = 3; // până la 3 mm în afara casetei
  const px = p.bb[0] - m + rndO() * (p.bb[2] - p.bb[0] + 2 * m), py = p.bb[1] - m + rndO() * (p.bb[3] - p.bb[1] + 2 * m);
  let want = -1, wd = Infinity;
  for (const q of oracleSet) { const d = distAnalytic(q.an, px, py); if (d < wd - 1e-9 || (Math.abs(d - wd) <= 1e-9 && q.id > want)) { wd = Math.min(wd, d); want = q.id; } }
  const tol = 1e9; // fără prag: vrem cea mai apropiată și distanța ei
  const got = pick(fb.search(px - wd - 1, py - wd - 1, px + wd + 1, py + wd + 1), px, py, tol);
  orc.interogari++;
  const e = Math.abs(got.d - wd); if (e > orc.err_max_mm) orc.err_max_mm = e;
  const k = p.kind; orc.pe_tip[k] = orc.pe_tip[k] || { n: 0, err_max_mm: 0, id_gresit: 0 }; orc.pe_tip[k].n++; orc.pe_tip[k].err_max_mm = Math.max(orc.pe_tip[k].err_max_mm, e);
  if (got.id !== want) { orc.id_gresit++; orc.pe_tip[k].id_gresit++; if (orc.id_gresit <= 5) orc['exemplu_' + orc.id_gresit] = { px, py, want: shapes[want].kind, wd, got: got.id >= 0 ? shapes[got.id].kind : null, gd: got.d }; }
}
// cazul jocului de 0,001 mm: punct pe axă, la 0,0002 mm de cercul din stânga
{
  const px = 770 + 0.0002, py = 1290; const got = pick(fb.search(px - 1, py - 1, px + 1, py + 1), px, py, 1);
  orc.joc_0_001mm = { punct: [px, py], ales: shapes[got.id].kind, d_mm: got.d, asteptat: 'p-tan1', d_asteptat_mm: 0.0002 };
}
// 4) interior (regula de umplere) pe formele-sondă închise: nucleu vs SDF analitic
const ins = { evenodd: { n: 0, gresit: 0 }, nonzero: { n: 0, gresit: 0 }, lat_ms: [] };
for (let i = 0; i < 20000; i++) {
  const p = probes.filter((q) => q.an.t === 'circle' || q.an.t === 'rrect')[i % 7];
  const px = p.bb[0] - 2 + rndO() * (p.bb[2] - p.bb[0] + 4), py = p.bb[1] - 2 + rndO() * (p.bb[3] - p.bb[1] + 4);
  if (distAnalytic(p.an, px, py) < 1e-6) continue; // pe contur: nedefinit
  const want = insideAnalytic(p.an, px, py);
  for (const rule of ['evenodd', 'nonzero']) { ins[rule].n++; const a = ns(); const g = inside(p, px, py, rule); ins.lat_ms.push(ns() - a); if (g !== want) ins[rule].gresit++; }
}
ins.lat_ms = { med: r6(med(ins.lat_ms)), p95: r6(pct(ins.lat_ms, 0.95)) };

const out = { N, scena: stats, generare_ms: Math.round(genMs), oracol_pe_hartie: paper,
  constructie_index_ms: { rbush_med: r6(med(buildR)), flatbush_med: r6(med(buildF)) }, hit: results, oracol_analitic: orc, interior: ins };
console.log(JSON.stringify(out, null, 1));
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
