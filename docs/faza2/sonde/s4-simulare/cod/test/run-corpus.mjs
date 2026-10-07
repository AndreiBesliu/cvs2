// run-corpus.mjs — nucleu vs hârtie vs oracol, pe corpusul care rupe coincidențele.
// Rulare: node test/run-corpus.mjs [--poison=NUME]   (otrava schimbă nucleul ca să vedem că verificările au dinți)
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync(new URL('../out/', import.meta.url), { recursive: true });
import { pathToFileURL } from 'node:url';
const { makeField, runJob, stats } = await import(process.env.CORE ? pathToFileURL(process.env.CORE).href : '../src/core.mjs');
import { hashField, toDense } from '../src/hash.mjs';
import { judeca } from '../oracle/oracle.mjs';
import { cases, toGcode, resolveGlyph } from './corpus.mjs';

const poison = (process.argv.find((a) => a.startsWith('--poison=')) || '').slice(9);
if (poison) globalThis.__POISON = poison;

const rez = [];
const hashes = {};
let fail = 0;
for (let c of cases()) {
  if (c.lazyGlyph) c = await resolveGlyph(c);
  const F = makeField(c.field);
  const t0 = performance.now();
  const n = runJob(F, c);
  const tCore = performance.now() - t0;
  const D = toDense(F);
  const { nx, ny } = F, cell = c.field.cell, x0 = c.field.x0, y0 = c.field.y0;
  const r = { id: c.id, mutari: n, celule: nx * ny, ms_nucleu: +tCore.toFixed(1) };
  hashes[c.id] = hashField(F);
  // invariant: niciodată mai adânc decât Z-ul programat
  let zmin = Infinity; for (let k = 0; k < D.length; k++) if (D[k] < zmin) zmin = D[k];
  r.zmin = +zmin.toFixed(6);
  r.inv_adancime = zmin >= c.zProg - 1e-6 ? 'ok' : 'PICAT';
  if (r.inv_adancime !== 'ok') fail++;
  // valoarea pe hârtie, pe toate celulele (sau pe ferestre la placa mare)
  if (c.paper) {
    let bad = 0, maxe = 0, tie = 0, checked = 0;
    const wins = c.window || [[x0, y0, x0 + nx * cell, y0 + ny * cell]];
    for (const [wx0, wy0, wx1, wy1] of wins) {
      const ia = Math.max(0, Math.floor((wx0 - x0) / cell)), ib = Math.min(nx - 1, Math.ceil((wx1 - x0) / cell));
      const ja = Math.max(0, Math.floor((wy0 - y0) / cell)), jb = Math.min(ny - 1, Math.ceil((wy1 - y0) / cell));
      for (let j = ja; j <= jb; j++) for (let i = ia; i <= ib; i++) {
        const x = x0 + (i + 0.5) * cell, y = y0 + (j + 0.5) * cell;
        if (c.edge && c.edge(x, y) < 1e-9) { tie++; continue; }
        const e = Math.abs(D[j * nx + i] - c.paper(x, y));
        checked++;
        if (e > maxe) maxe = e;
        if (e > 1e-5) bad++;
      }
    }
    r.hartie = { celule: checked, gresite: bad, eroare_max_mm: +maxe.toExponential(2), egalitati_pe_muchie: tie };
    if (bad) fail++;
  }
  // secțiunea bilei: cerc de rază R (ajustare Kasa pe punctele tăiate ale coloanei x)
  if (c.section) {
    const i = Math.floor((c.section.x - x0) / cell);
    let Sx = 0, Sy = 0, Sxx = 0, Syy = 0, Sxy = 0, Sxz = 0, Syz = 0, Sz = 0, N = 0;
    for (let j = 0; j < ny; j++) {
      const z = D[j * nx + i]; if (!(z < -1e-4)) continue;
      const y = y0 + (j + 0.5) * cell, zz = z;
      const q = y * y + zz * zz;
      Sx += y; Sy += zz; Sxx += y * y; Syy += zz * zz; Sxy += y * zz; Sxz += y * q; Syz += zz * q; Sz += q; N++;
    }
    // rezolvă [Sxx Sxy Sx; Sxy Syy Sy; Sx Sy N] [a b c] = [Sxz Syz Sz]; cerc: y²+z² = a y + b z + c
    const Am = [[Sxx, Sxy, Sx], [Sxy, Syy, Sy], [Sx, Sy, N]], bv = [Sxz, Syz, Sz];
    const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const d0 = det(Am), sol = [0, 1, 2].map((k) => det(Am.map((row, ri) => row.map((v, ci) => (ci === k ? bv[ri] : v)))) / d0);
    const yc = sol[0] / 2, zc = sol[1] / 2, Rfit = Math.sqrt(sol[2] + yc * yc + zc * zc);
    r.sectiune_bila = { R_ajustat: +Rfit.toFixed(5), R_hartie: c.section.R, centru_y: +yc.toFixed(5), centru_z: +zc.toFixed(5), puncte: N };
    if (Math.abs(Rfit - c.section.R) > 0.005) fail++;
  }
  // unghiul V: dreaptă pe fiecare perete (celule cu -adâncime < z < -0,1), unghiul inclus
  if (c.vangle) {
    const i = Math.floor((c.vangle.x - x0) / cell);
    const fit = (side) => {
      let Sx = 0, Sy = 0, Sxx = 0, Sxy = 0, N = 0;
      for (let j = 0; j < ny; j++) {
        const y = y0 + (j + 0.5) * cell, z = D[j * nx + i];
        if ((y - c.vangle.centerY) * side <= cell || !(z < -0.1)) continue;
        Sx += y; Sy += z; Sxx += y * y; Sxy += y * z; N++;
      }
      return (N * Sxy - Sx * Sy) / (N * Sxx - Sx * Sx);
    };
    const sL = fit(-1), sR = fit(1);
    const ang = (Math.atan(1 / Math.abs(sL)) + Math.atan(1 / Math.abs(sR))) * (180 / Math.PI);
    r.unghi_V = { grade_masurat: +ang.toFixed(4), grade_hartie: c.vangle.expectDeg, pante: [+sL.toFixed(5), +sR.toFixed(5)] };
    if (Math.abs(ang - c.vangle.expectDeg) > 0.05) fail++;
  }
  // lățimea radială a șanțului pe arc
  if (c.radial) {
    const out = {};
    for (const a of c.radial.angles) {
      let cnt = 0;
      const rad = (a * Math.PI) / 180;
      const step = cell / 4;
      for (let s = 15; s <= 35; s += step) {
        const x = c.radial.cx + s * Math.cos(rad), y = c.radial.cy + s * Math.sin(rad);
        const i = Math.floor((x - x0) / cell), j = Math.floor((y - y0) / cell);
        if (D[j * nx + i] < -2.999) cnt++;
      }
      out[a + '°'] = +(cnt * step).toFixed(3);
    }
    r.latime_radiala_mm = out;
  }
  // oracolul: aceeași piesă, citită din TEXTUL G-code-ului
  if (!c.noOracle) {
    const gtxt = c.gcode ?? toGcode(c.ops);
    const t1 = performance.now();
    const O = judeca(gtxt, { ...c.field, top: 0, div: 8 });
    const tOr = performance.now() - t1;
    let missed = 0, over = 0, maxd = 0, diff1um = 0;
    for (let k = 0; k < D.length; k++) {
      const d = O.g[k] - D[k]; // >= 0 așteptat (oracolul eșantionează => nu poate fi mai adânc)
      if (d < -1e-5) missed++; // nucleul a lăsat material pe care oracolul l-a tăiat => nucleul greșește
      if (d > 1e-3) over++;
      if (Math.abs(d) > 1e-3 / 1) diff1um++;
      if (Math.abs(d) > maxd) maxd = Math.abs(d);
    }
    r.oracol = { ms: +tOr.toFixed(0), pas_esantion_mm: O.pas, nucleu_mai_sus: missed, nucleu_mai_jos_1um: over, dif_max_mm: +maxd.toExponential(2), proc_celule_dif: +((100 * diff1um) / D.length).toFixed(4) };
    if (missed) fail++;
  }
  if (c.sameAs) { r.identic_cu = c.sameAs + (hashes[c.sameAs] === hashes[c.id] ? ': DA' : ': NU'); if (hashes[c.sameAs] !== hashes[c.id]) fail++; }
  const st = stats(F);
  r.dale = `${st.tilesAlloc}/${st.tilesTotal}`;
  rez.push(r);
  console.log(JSON.stringify(r));
}
writeFileSync(new URL('../out/corpus' + (poison ? '-otrava-' + poison : '') + '.json', import.meta.url), JSON.stringify({ poison, fail, rez, hashes }, null, 1));
console.log(poison ? `OTRAVĂ ${poison}: ${fail} verificări picate` : `VERDICT: ${fail} verificări picate`);
