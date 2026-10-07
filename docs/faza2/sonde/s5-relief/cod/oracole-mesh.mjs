// Sonda s5-relief: oracolele pe plasa de triunghiuri (STL) si comparatia plasa exacta vs harta de inaltime.
// 1) drop-cutter exact pe plasa unei semisfere inscrise: CL trebuie sa stea intre CL analitic(rho_min) si CL analitic(Rs)
// 2) plan din 2 triunghiuri: CL egal cu formula; cazuri aproape tangente (flancul V90 paralel cu planul la 45 grade)
// 3) scobitura fata de PLASA (nu fata de grila): harta conservativa (C) vs harta in nod (A), pe semisfera, pe un perete
//    de 0,01 mm si pe scena mare; verificarea pe segmente foloseste drop-cutter-ul exact pe plasa (alt cod decat grila)
// 4) scena de ~1,4 M triunghiuri: STL scris/citit, timpi de rasterizare 4000x4000 si debitul drop-cutter-ului exact
import { ball, flat, vbit, hemisphere, plane, DEG } from './lib/geom.mjs';
import { makeGrid, offsets, dropRow } from './lib/hf.mjs';
import { uvHemisphere, toTriArray, paramMesh, MeshIndex, distPointTri, rasterNodes, rasterCellMax, sceneMesh, writeSTL, readSTL } from './lib/mesh.mjs';
import { writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';

const QUICK = process.argv.includes('--quick');
const SCENE = !process.argv.includes('--no-scene');
const out = { hemi: [], plan: [], gouge: [], scena: {} };
const tools = [ball(3), flat(3), vbit(6, 90), vbit(6, 60)];
const now = () => performance.now();
// generator determinist (fara Math.random, ca cifrele sa se reproduca)
let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);

// ---- 1) semisfera inscrisa ----
{
  const Rs = 20, T = uvHemisphere(0, 0, Rs, 90, 360, 32);
  let rhoMin = Infinity; const n = T.length / 9;
  let degenerate = 0;
  for (let k = 0; k < n; k++) {
    const o = 9 * k; if (T[o + 2] === 0 && T[o + 5] === 0 && T[o + 8] === 0) continue;
    const ux = T[o + 3] - T[o], uy = T[o + 4] - T[o + 1], uz = T[o + 5] - T[o + 2], vx = T[o + 6] - T[o], vy = T[o + 7] - T[o + 1], vz = T[o + 8] - T[o + 2];
    if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) < 1e-12) { degenerate++; continue; } // triunghiuri de arie 0 la pol
    const d = distPointTri([0, 0, 0], [T[o], T[o + 1], T[o + 2]], [T[o + 3], T[o + 4], T[o + 5]], [T[o + 6], T[o + 7], T[o + 8]]);
    if (!Number.isFinite(d)) throw new Error('distanta nefinita');
    rhoMin = Math.min(rhoMin, d);
  }
  if (!Number.isFinite(rhoMin) || rhoMin >= Rs) throw new Error('rho_min invalid: ' + rhoMin);
  const idx = new MeshIndex(T, 1.0), hi = hemisphere(0, 0, Rs), lo = hemisphere(0, 0, rhoMin);
  for (const tool of tools) {
    let viol = 0, maxDev = 0, N = QUICK ? 400 : 2000; const t0 = now();
    for (let q = 0; q < N; q++) {
      const x = (rnd() * 2 - 1) * 26, y = (rnd() * 2 - 1) * 26;
      const z = idx.drop(tool, x, y, 0), zl = lo.cl(tool, x, y), zh = hi.cl(tool, x, y);
      if (!(z >= zl - 1e-9 && z <= zh + 1e-9)) viol++; // NaN numara ca abatere
      maxDev = Math.max(maxDev, Math.abs(z - zh));
    }
    out.hemi.push({ tool: tool.name, triunghiuri: n, degenerate_sarite: degenerate, rho_min: +rhoMin.toFixed(6), Rs, puncte: N, in_afara_intervalului: viol, abatere_max_fata_de_sfera_mm: +maxDev.toExponential(3), us_pe_punct: +((now() - t0) * 1000 / N).toFixed(1) });
  }
}

// ---- 2) plan exact + aproape tangent ----
{
  for (const [deg, label] of [[30, 'plan 30 grade'], [45, 'plan 45 grade (flanc V90 paralel)'], [45 + 1e-6, 'plan 45+1e-6 grade'], [0, 'plan orizontal (fata coincidenta cu talpa dreapta)']]) {
    const a = Math.tan(deg * DEG), surf = plane(a, 0, 3);
    const T = toTriArray([[-50, -50, surf.z(-50, -50)], [50, -50, surf.z(50, -50)], [50, 50, surf.z(50, 50)], [-50, -50, surf.z(-50, -50)], [50, 50, surf.z(50, 50)], [-50, 50, surf.z(-50, 50)]]);
    const idx = new MeshIndex(T, 10);
    for (const tool of tools) {
      let e = 0; for (let q = 0; q < 200; q++) { const x = (rnd() * 2 - 1) * 30, y = (rnd() * 2 - 1) * 30; e = Math.max(e, Math.abs(idx.drop(tool, x, y) - surf.cl(tool, x, y))); }
      out.plan.push({ caz: label, tool: tool.name, eroare_max_mm: +e.toExponential(3) });
    }
  }
}

// ---- 3) scobitura fata de plasa: A (nod) vs C (celula + segment) ----
function gougeVsMesh(name, T, g, rowsJ, tool, sub, i0, i1) {
  const idx = new MeshIndex(T, Math.max(1, tool.R));
  const Hn = rasterNodes(T, g, 0), Hc = rasterCellMax(T, g, 0);
  const offN = offsets(tool, g.h, 'node'), offC = offsets(tool, g.h, 'capsule');
  const r = { caz: name, tool: tool.name, celula_mm: g.h };
  for (const [v, H, off] of [['A_nod', Hn, offN], ['C_celula_segment', Hc, offC]]) {
    let gouge = 0, exSum = 0, exMax = -Infinity, cnt = 0;
    for (const j of rowsJ) {
      const row = dropRow(g, H, off, j, new Float64Array(g.nx)); const y = g.y0 + j * g.h;
      for (let i = i0; i < i1; i++) for (let s = 0; s < sub; s++) {
        const t = s / sub, x = g.x0 + (i + t) * g.h, zp = (1 - t) * row[i] + t * row[i + 1];
        const ze = idx.drop(tool, x, y, 0), e = zp - ze;
        if (-e > gouge) gouge = -e; exSum += e; cnt++; if (e > exMax) exMax = e;
      }
    }
    r[v] = { scobitura_max_mm: +gouge.toExponential(3), surplus_mediu_mm: +(exSum / cnt).toFixed(4), surplus_max_mm: +exMax.toFixed(4) };
  }
  return r;
}
{
  const g = makeGrid(521, 521, 0.1, -26, -26);
  const Th = uvHemisphere(0, 0, 20, 90, 360, 32);
  for (const tool of tools) out.gouge.push(gougeVsMesh('semisfera plasa', Th, g, QUICK ? [263] : [260, 263, 300], tool, 8, 40, 480));
  // perete subtire 0,01 x 30 x 5 mm (cutie din 12 triunghiuri), intre noduri
  const box = (x0, x1, y0, y1, z0, z1) => { const p = []; const V = (x, y, z) => [x, y, z];
    const q = (a, b, c, d) => p.push(a, b, c, a, c, d);
    q(V(x0, y0, z1), V(x1, y0, z1), V(x1, y1, z1), V(x0, y1, z1)); q(V(x0, y0, z0), V(x1, y0, z0), V(x1, y0, z1), V(x0, y0, z1));
    q(V(x1, y0, z0), V(x1, y1, z0), V(x1, y1, z1), V(x1, y0, z1)); q(V(x1, y1, z0), V(x0, y1, z0), V(x0, y1, z1), V(x1, y1, z1));
    q(V(x0, y1, z0), V(x0, y0, z0), V(x0, y0, z1), V(x0, y1, z1)); return p; };
  const Tw = toTriArray(box(0.003, 0.013, -15, 15, 0, 5));
  for (const tool of tools) out.gouge.push(gougeVsMesh('perete 0,01 mm (plasa)', Tw, g, [260], tool, 8, 150, 370));
}
console.table(out.hemi); console.table(out.plan);
for (const r of out.gouge) console.log(r.caz.padEnd(24), r.tool.padEnd(10), 'A', JSON.stringify(r.A_nod), 'C', JSON.stringify(r.C_celula_segment));

// ---- 4) scena mare ----
if (SCENE) {
  mkdirSync('date', { recursive: true });
  const path = 'date/scena.stl';
  let t0 = now();
  if (!existsSync(path)) { const T = sceneMesh(1); writeSTL(path, T); out.scena.generare_ms = Math.round(now() - t0); }
  t0 = now(); const T = readSTL(path); out.scena.citire_stl_ms = Math.round(now() - t0);
  out.scena.triunghiuri = T.length / 9; out.scena.stl_MB = +(statSync(path).size / 1e6).toFixed(1);
  const g = makeGrid(4000, 4000, 0.05, 0, 0); // 200 x 200 mm la 0,05 mm
  t0 = now(); const Hn = rasterNodes(T, g, 0); out.scena.raster_nod_4000_ms = Math.round(now() - t0);
  t0 = now(); const Hc = rasterCellMax(T, g, 0); out.scena.raster_conservativ_4000_ms = Math.round(now() - t0);
  let dmax = 0, dsum = 0; for (let k = 0; k < Hn.length; k++) { const d = Hc[k] - Hn[k]; if (d < -1e-5) out.scena.conservativ_sub_nod = (out.scena.conservativ_sub_nod || 0) + 1; dmax = Math.max(dmax, d); dsum += d; }
  out.scena.conservativ_minus_nod_mediu_mm = +(dsum / Hn.length).toFixed(5); out.scena.conservativ_minus_nod_max_mm = +dmax.toFixed(3);
  t0 = now(); const idx = new MeshIndex(T, 2); out.scena.index_ms = Math.round(now() - t0);
  // debitul drop-cutter-ului exact pe plasa vs pe grila, pe aceleasi puncte
  for (const tool of [ball(3), flat(3), vbit(6, 90)]) {
    const N = QUICK ? 1500 : 4000, j = 2000, y = j * g.h; idx.visited = idx.evaluated = 0;
    // punctele stau la >= 5 mm de marginea grilei: grila trebuie sa acopere plasa + raza frezei (altfel sapa la margine)
    const I0 = 100; t0 = now(); const zm = new Float64Array(N); for (let i = 0; i < N; i++) zm[i] = idx.drop(tool, (I0 + i) * g.h, y, 0); const tMesh = now() - t0;
    const off = offsets(tool, g.h, 'capsule'); t0 = now(); const row = dropRow(g, Hc, off, j, new Float64Array(g.nx)); const tRow = now() - t0;
    let gouge = 0, ex = 0; for (let i = 0; i < Math.min(N, g.nx - 2 * I0); i++) { gouge = Math.max(gouge, zm[i] - row[I0 + i]); ex += row[I0 + i] - zm[i]; }
    out.scena[tool.name] = { plasa_CL_pe_s: Math.round(N / (tMesh / 1000)), triunghiuri_vizitate_pe_punct: Math.round(idx.visited / N), evaluate_pe_punct: Math.round(idx.evaluated / N), grila_CL_pe_s_1fir: Math.round(g.nx / (tRow / 1000)), offseturi: off.n, grila_C_sub_plasa_in_noduri_mm: +gouge.toExponential(3), surplus_mediu_grila_C_mm: +(ex / N).toFixed(4) };
  }
  // scobitura pe segmente pe scena (2 randuri x 300 noduri x 4 sub-esantioane) - fata de plasa
  const gS = { ...g };
  const r = { caz: 'scena 1,4M (plasa)', tool: 'bila R3' };
  for (const [v, H, mode] of [['A_nod', Hn, 'node'], ['C_celula_segment', Hc, 'capsule']]) {
    const off = offsets(ball(3), g.h, mode); let gouge = 0, cnt = 0, exs = 0;
    for (const j of [1700, 2333]) { const row = dropRow(gS, H, off, j, new Float64Array(g.nx)); for (let i = 1500; i < 1800; i++) for (let s = 0; s < 4; s++) { const t = s / 4, zp = (1 - t) * row[i] + t * row[i + 1], ze = idx.drop(ball(3), (i + t) * g.h, j * g.h, 0); gouge = Math.max(gouge, ze - zp); exs += zp - ze; cnt++; } }
    r[v] = { scobitura_max_mm: +gouge.toExponential(3), surplus_mediu_mm: +(exs / cnt).toFixed(4) };
  }
  out.gouge.push(r); console.log(JSON.stringify(r));
  console.log(out.scena);
  globalThis.__scene = { T, Hn, Hc, g };
}
mkdirSync('rezultate', { recursive: true });
writeFileSync('rezultate/oracole-mesh.json', JSON.stringify(out, null, 1));
