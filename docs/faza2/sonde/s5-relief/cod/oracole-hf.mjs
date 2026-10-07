// Sonda s5-relief: oracolele pe harta de inaltime.
// 1) CL pe grila vs CL analitic (plan, sfera, cilindru) + corpus care rupe coincidentele (perete 0,01 mm, canale 30/60/90, inel cu gaura)
//    pentru 3 variante: A = esantion in nod (ca rasterizarea GPU / vechiul), B = A + maxim pe vecini (lema coardei veche),
//    C = maxim pe celula (conservativ) + distanta minima segment->celula (propunerea). Verificarea e pe SEGMENTE (16 sub-esantioane).
// 2) creasta (scallop) cu bila pe plan: simulator independent vs R - sqrt(R^2 - (s/2)^2), si pe panta transversala
// 3) volumul semisferei vs 2/3 pi R^3; 4) cuantizarea pe 16 biti (Uint16) si half-float
import { ball, flat, vbit, rise, plane, hemisphere, cylinderY, thinWall, groove, annulus, DEG } from './lib/geom.mjs';
import { makeGrid, sampleNodes, sampleCellMax, offsets, dropRow, chordFilterRow, checkRowAgainstExact } from './lib/hf.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const QUICK = process.argv.includes('--quick');
const out = { cl: [], sweep: [], scallop: [], volume: [], quant: [] };
const tools = [ball(3), flat(3), vbit(6, 90), vbit(6, 60)];
const surfaces = [
  plane(0, 0, 5), plane(Math.tan(30 * DEG), 0, 2), plane(0.3, 0.4, 3),
  hemisphere(25, 25, 20), cylinderY(25, 15),
  thinWall(20.003, 0.01, 5), groove(25, 1, 30, 5, 30), groove(25, 1, 60, 5, 30), groove(25, 1, 90, 5, 30),
  annulus(25, 25, 5, 12, 4),
];
const h = 0.1, g = makeGrid(501, 501, h);
const rows = QUICK ? [250, 323] : [250, 251, 323, 180, 400];
const t0 = Date.now();
for (const surf of surfaces) {
  const Hn = sampleNodes(g, surf), Hc = sampleCellMax(g, surf);
  for (const tool of tools) {
    const offN = offsets(tool, h, 'node'), offCap = offsets(tool, h, 'capsule');
    const res = { surf: surf.name, tool: tool.name };
    for (const [variant, fn] of [
      ['A_nod', (j) => dropRow(g, Hn, offN, j, new Float64Array(g.nx))],
      ['B_nod_vecini', (j) => chordFilterRow(g, Hn, offN, j)],
      ['C_celula_segment', (j) => dropRow(g, Hc, offCap, j, new Float64Array(g.nx))],
    ]) {
      let gouge = 0, exMax = -Infinity, exSum = 0, nodeErrMax = 0, nodeDefMax = 0;
      for (const j of rows) {
        const row = fn(j);
        const m = Math.ceil(tool.R / h) + 3; // evit marginea grilei
        const c = checkRowAgainstExact(g, row, j, surf, tool, 16, m, g.nx - 1 - m);
        gouge = Math.max(gouge, c.gouge); exMax = Math.max(exMax, c.exMax); exSum += c.exMean;
        for (let i = m; i < g.nx - m; i++) { // eroarea in noduri (oracolul CL analitic)
          const e = row[i] - surf.cl(tool, g.x0 + i * h, g.y0 + j * h);
          nodeErrMax = Math.max(nodeErrMax, Math.abs(e)); nodeDefMax = Math.max(nodeDefMax, -e);
        }
      }
      res[variant] = { scobitura_max_mm: +gouge.toExponential(3), surplus_mediu_mm: +(exSum / rows.length).toExponential(3), surplus_max_mm: +exMax.toExponential(3), eroare_noduri_max_mm: +nodeErrMax.toExponential(3), sub_model_in_noduri_mm: +Math.max(0, nodeDefMax).toExponential(3) };
    }
    out.cl.push(res);
  }
}
console.log(`CL pe grila: ${out.cl.length} combinatii in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

// --- pasul celulei pentru varianta C (inclusiv 0,61 mm = 2440 mm / 4000) ---
for (const hh of [0.05, 0.1, 0.2, 0.61]) {
  for (const [surf, tool] of [[hemisphere(25, 25, 20), ball(3)], [groove(25, 1, 60, 5, 30), ball(3)], [hemisphere(25, 25, 20), vbit(6, 90)]]) {
    const n = Math.round(50 / hh) + 1, gg = makeGrid(n, n, hh);
    const Hc = sampleCellMax(gg, surf), off = offsets(tool, hh, 'capsule');
    const j = Math.round(25.37 / hh), row = dropRow(gg, Hc, off, j, new Float64Array(n));
    const m = Math.ceil(tool.R / hh) + 3; const c = checkRowAgainstExact(gg, row, j, surf, tool, 16, m, n - 1 - m);
    out.sweep.push({ celula_mm: hh, surf: surf.name, tool: tool.name, scobitura_max_mm: +c.gouge.toExponential(3), surplus_mediu_mm: +c.exMean.toFixed(4), surplus_max_mm: +c.exMax.toFixed(4) });
  }
}

// --- creasta (scallop): simulator independent al suprafetei prelucrate ---
// Simulatorul primeste doar punctele de traseu (CL) si scrie bila ca sfera: z = zc - sqrt(R^2 - d^2). Nu foloseste rise().
function simulateBallPasses(passes, R, yA, yB, dy) { // passes: [{y, zTip}] cu traseu de-a lungul lui X (z constant pe X)
  const res = [];
  for (let y = yA; y <= yB + 1e-12; y += dy) {
    let zm = Infinity;
    for (const p of passes) { const d = Math.abs(y - p.y); if (d <= R) { const z = p.zTip + R - Math.sqrt(R * R - d * d); if (z < zm) zm = z; } }
    res.push([y, zm]);
  }
  return res;
}
for (const [R, s] of [[3, 1], [3, 0.5], [1.5, 0.3], [6.35, 2]]) {
  for (const crossDeg of [0, 20]) {
    const b = Math.tan(crossDeg * DEG), surf = plane(0, b, 5);
    const tool = ball(R);
    // pasurile se fac cu drop-cutter-ul real (varianta C) pe o grila cu h = s/10 (pasul lateral = 10 celule)
    const hh = s / 10, n = 201, gg = makeGrid(n, n, hh);
    const Hc = sampleCellMax(gg, surf), off = offsets(tool, hh, 'capsule');
    const passes = [];
    for (let j = 60; j <= 140; j += 10) { const row = dropRow(gg, Hc, off, j, new Float64Array(n)); passes.push({ y: j * hh, zTip: row[100] }); }
    const prof = simulateBallPasses(passes, R, passes[2].y, passes[6].y, s / 2000);
    let sc = 0; for (const [y, z] of prof) sc = Math.max(sc, z - surf.z(0, y));
    const cos = Math.cos(crossDeg * DEG);
    const formula = (R - Math.sqrt(R * R - (s / (2 * cos)) ** 2)) / cos;
    // ce ar da traseul cu CL exact (analitic) - separa eroarea de grila de geometrie
    const passesExact = passes.map((p) => ({ y: p.y, zTip: surf.cl(tool, 0, p.y) }));
    let scE = 0; for (const [y, z] of simulateBallPasses(passesExact, R, passes[2].y, passes[6].y, s / 2000)) scE = Math.max(scE, z - surf.z(0, y));
    out.scallop.push({ R, pas_lateral_mm: s, panta_transversala_grade: crossDeg, formula_mm: +formula.toFixed(6), simulat_cu_CL_exact_mm: +scE.toFixed(6), simulat_cu_CL_grila_C_mm: +sc.toFixed(6) });
  }
}

// --- volumul semisferei ---
for (const hh of [0.5, 0.2, 0.1, 0.05]) {
  const surf = hemisphere(0, 0, 20), n = Math.round(44 / hh) + 1, gg = makeGrid(n, n, hh, -22, -22);
  let vNode = 0, vMax = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -22 + i * hh, y = -22 + j * hh;
    vNode += surf.z(x, y) * hh * hh; vMax += surf.cellMax(x - hh / 2, x + hh / 2, y - hh / 2, y + hh / 2) * hh * hh;
  }
  out.volume.push({ celula_mm: hh, volum_analitic_mm3: +surf.volume.toFixed(3), volum_noduri_mm3: +vNode.toFixed(3), eroare_rel_noduri: +((vNode - surf.volume) / surf.volume).toExponential(3), volum_max_celula_mm3: +vMax.toFixed(3), eroare_rel_max_celula: +((vMax - surf.volume) / surf.volume).toExponential(3), greutate_stejar_g: +((vNode / 1000) * 0.75).toFixed(2) });
}

// --- cuantizare: Uint16 cu scara pe strat vs half-float, pe semisfera R20 (0..20 mm) si pe un relief de 60 mm ---
for (const top of [20, 60]) {
  const surf = hemisphere(0, 0, top), n = 801, gg = makeGrid(n, n, (2 * top + 4) / (n - 1), -top - 2, -top - 2);
  const H = sampleNodes(gg, surf); let lo = Infinity, hi = -Infinity; for (const v of H) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const scale = (hi - lo) / 65535; let eU = 0, eH = 0, hasF16 = typeof Math.f16round === 'function';
  for (const v of H) { const q = Math.round((v - lo) / scale) * scale + lo; eU = Math.max(eU, Math.abs(q - v)); if (hasF16) eH = Math.max(eH, Math.abs(Math.f16round(v) - v)); }
  out.quant.push({ inaltime_max_mm: top, uint16_pas_mm: +scale.toExponential(3), uint16_eroare_max_mm: +eU.toExponential(3), f16_disponibil_in_node: hasF16, f16_eroare_max_mm: hasF16 ? +eH.toExponential(3) : null });
}

mkdirSync('rezultate', { recursive: true });
writeFileSync('rezultate/oracole-hf.json', JSON.stringify(out, null, 1));
// rezumat pe consola
const worst = (v) => Math.max(...out.cl.map((r) => r[v].scobitura_max_mm));
console.log('scobitura maxima pe tot corpusul: A=%s B=%s C=%s mm', worst('A_nod'), worst('B_nod_vecini'), worst('C_celula_segment'));
for (const r of out.cl) console.log(r.surf.padEnd(26), r.tool.padEnd(10), 'A', String(r.A_nod.scobitura_max_mm).padEnd(10), 'B', String(r.B_nod_vecini.scobitura_max_mm).padEnd(10), 'C', String(r.C_celula_segment.scobitura_max_mm).padEnd(10), 'C surplus mediu', r.C_celula_segment.surplus_mediu_mm, 'max', r.C_celula_segment.surplus_max_mm);
console.table(out.sweep); console.table(out.scallop); console.table(out.volume); console.table(out.quant);
console.log(`total ${((Date.now() - t0) / 1000).toFixed(1)} s`);
