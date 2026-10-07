// Sonda s5-relief: bas-relief din scena STL de ~1,4 M triunghiuri, la 4000x4000.
// Oracole: (a) Poisson pe o functie analitica (solutia discreta exacta e chiar functia) ; (b) fara compresie, reconstructia
// trebuie sa redea harta originala pana la o constanta ; (c) adancimea finala = tinta.
import { gradients, compress, divergence, applyL, solvePoisson } from './lib/basrelief.mjs';
import { makeGrid } from './lib/hf.mjs';
import { readSTL, writeSTL, sceneMesh, rasterNodes } from './lib/mesh.mjs';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const N = +(process.argv.find((a) => a.startsWith('--n='))?.slice(4) || 4000);
const CYC = +(process.argv.find((a) => a.startsWith('--cicluri='))?.slice(10) || 8);
const now = () => performance.now();
const out = { n: N, cicluri: CYC };

// (a) oracol analitic pentru rezolvitor
{
  const n = Math.min(N, 1024), h = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h[j * n + i] = 5 * Math.cos((Math.PI * (i + 0.5)) / n) * Math.cos((2 * Math.PI * (j + 0.5)) / n) + 2 * Math.cos((3 * Math.PI * (i + 0.5)) / n) + 0.5 * Math.sin((7 * i) / n) * Math.sin((5 * j) / n);
  const f = applyL(h, n, n, new Float32Array(n * n));
  const t = now(); const { u, hist } = solvePoisson(f, n, n, 12); const ms = now() - t;
  let mh = 0, mu = 0; for (let k = 0; k < h.length; k++) { mh += h[k]; mu += u[k]; } mh /= h.length; mu /= u.length;
  let e = 0, top = 0; for (let k = 0; k < h.length; k++) { e = Math.max(e, Math.abs(u[k] - mu - (h[k] - mh))); top = Math.max(top, Math.abs(h[k] - mh)); }
  out.oracol_poisson = { n, eroare_max_mm: +e.toExponential(3), amplitudine_mm: +top.toFixed(3), reziduu_relativ_pe_ciclu: hist.map((x) => +x.toExponential(2)), ms: Math.round(ms) };
  console.log('oracol Poisson', out.oracol_poisson);
}

// (b,c) scena
mkdirSync('date', { recursive: true });
if (!existsSync('date/scena.stl')) writeSTL('date/scena.stl', sceneMesh(1));
let t = now(); const T = readSTL('date/scena.stl'); out.citire_ms = Math.round(now() - t); out.triunghiuri = T.length / 9;
const g = makeGrid(N, N, 200 / N, 0, 0);
t = now(); const H = rasterNodes(T, g, 0); out.raster_ms = Math.round(now() - t);
let zmin = Infinity, zmax = -Infinity; for (const v of H) { zmin = Math.min(zmin, v); zmax = Math.max(zmax, v); }
out.adancime_model_mm = +(zmax - zmin).toFixed(2);
t = now(); const { gx, gy } = gradients(H, N, N); out.gradienti_ms = Math.round(now() - t);

// (b) fara compresie si fara prag: trebuie sa iasa H inapoi
{
  const f = divergence(gx, gy, N, N); t = now(); const { u, hist } = solvePoisson(f, N, N, CYC); const ms = now() - t;
  let mh = 0, mu = 0; for (let k = 0; k < H.length; k++) { mh += H[k]; mu += u[k]; } mh /= H.length; mu /= u.length;
  let e = 0; for (let k = 0; k < H.length; k++) e = Math.max(e, Math.abs(u[k] - mu - (H[k] - mh)));
  out.identitate = { eroare_max_mm: +e.toExponential(3), reziduu_relativ_pe_ciclu: hist.map((x) => +x.toExponential(2)), poisson_ms: Math.round(ms), ms_pe_ciclu: Math.round(ms / CYC) };
  console.log('identitate', out.identitate);
}
// (c) compresia reala: prag pe panta 10 (84 grade), a = 4, adancime tinta 8 mm
{
  const h = g.h; t = now();
  const cx = compress(gx, h, 4, 10), cy = compress(gy, h, 4, 10), f = divergence(cx, cy, N, N);
  const tPrep = now() - t; t = now();
  const { u, hist } = solvePoisson(f, N, N, CYC); const ms = now() - t;
  let lo = Infinity, hi = -Infinity; for (const v of u) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const D = 8; for (let k = 0; k < u.length; k++) u[k] = ((u[k] - lo) / (hi - lo)) * D;
  let lo2 = Infinity, hi2 = -Infinity; for (const v of u) { lo2 = Math.min(lo2, v); hi2 = Math.max(hi2, v); }
  out.compresie = { prag_panta: 10, a: 4, adancime_tinta_mm: D, adancime_obtinuta_mm: +(hi2 - lo2).toFixed(4), factor_compresie: +((zmax - zmin) / D).toFixed(1), pregatire_ms: Math.round(tPrep), poisson_ms: Math.round(ms), reziduu_relativ_final: +hist[hist.length - 1].toExponential(2) };
  console.log('compresie', out.compresie);
  // imagine PGM mica (512) a bas-reliefului, pentru ochi
  const S = 512, img = Buffer.alloc(S * S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const k = Math.floor((S - 1 - j) * N / S) * N + Math.floor(i * N / S); img[j * S + i] = Math.round((u[k] / D) * 255); }
  writeFileSync('rezultate/basrelief-512.pgm', Buffer.concat([Buffer.from(`P5 ${S} ${S} 255\n`), img]));
}
writeFileSync('rezultate/basrelief.json', JSON.stringify(out, null, 1));
