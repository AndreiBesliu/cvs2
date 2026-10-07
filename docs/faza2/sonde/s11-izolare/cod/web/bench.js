// bench.js - sonda s11 (aruncabila): costul de a NU avea SharedArrayBuffer, in aceeasi rulare de browser.
// Blur gaussian sigma=4 px pe relief Float32 4000x4000 si rasterul de finisare drop-cutter (bila R3, s5 varianta C) pe 16 workeri:
//  (a) SharedArrayBuffer (ca s5);  (b) transfer: banda + halo copiate de firul principal si transferate, rezultat transferat inapoi;
//  (c) banda detinuta de worker: doar halo-urile se schimba intre vecini.
// Plus jobul 2D al s4 la 0,1 mm: mutarile in SAB / copiate la fiecare worker / filtrate pe worker si transferate.
// Verificari: bit cu bit intre variante + oracol pe hartie (impulsuri / varfuri puse exact la marginea benzilor) + control negativ (halo prea mic).
import { gaussKernel, blurH, blurV, offsets, dropRow } from '../lib/hf.mjs';
import { ball } from '../lib/geom.mjs';
import { makeField } from '../lib/s4/core.mjs';
import { hashField } from '../lib/s4/hash.mjs';
import { job2d, countMoves } from '../lib/s4/jobs.mjs';

const P = new URLSearchParams(location.search);
const NW = +(P.get('w') || 16), n = +(P.get('n') || 4000);
const REPS = { blur: +(P.get('rb') || 7), dc: +(P.get('rd') || 5), s4: +(P.get('rs') || 5) };
const PARTS = (P.get('parts') || 'coi,blur,dc,s4').split(',');
const mode = location.pathname.split('/')[2] || '?';
const R = { mode, parts: PARTS, reps: REPS, workers: NW, n, ua: navigator.userAgent, crossOriginIsolated: self.crossOriginIsolated, sab_in_pagina: typeof SharedArrayBuffer !== 'undefined', hardwareConcurrency: navigator.hardwareConcurrency };
const logEl = document.getElementById('log');
const log = (...a) => { const s = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '); console.log(s); logEl.textContent += '\n' + s; };
const now = () => performance.now();
const med = (a) => { const s = [...a].sort((x, y) => x - y); return +s[Math.floor(s.length / 2)].toFixed(2); };
const r2 = (x) => +x.toFixed(2);
const post = (name, obj) => fetch('/rezultat?nume=' + name, { method: 'POST', body: JSON.stringify(obj, null, 1) });
const band = (k, total) => [Math.floor((k * total) / NW), Math.floor(((k + 1) * total) / NW)];

function cmpBits(a, b) {
  if (a.length !== b.length) return { diferite: -1 };
  const ua = new Uint32Array(a.buffer, a.byteOffset, a.length), ub = new Uint32Array(b.buffer, b.byteOffset, b.length);
  let d = 0, first = -1;
  for (let k = 0; k < ua.length; k++) if (ua[k] !== ub[k]) { d++; if (first < 0) first = k; }
  return { diferite: d, primul_index: first };
}
function terrain(N) { // acelasi teren ca s5/web/probe.js
  const H = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const dx = (i - N / 2) / (N / 4), dy = (j - N / 2) / (N / 4);
    H[j * N + i] = 5 + 2 * Math.sin(i / 97) * Math.cos(j / 131) + 8 * Math.exp(-(dx * dx + dy * dy)) + 0.3 * Math.sin(i / 7.3 + j / 11.1);
  }
  return H;
}
async function gpuInfo() {
  const cv = document.createElement('canvas'), gl = cv.getContext('webgl2') || cv.getContext('webgl');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  R.webgl_renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
  R.software_renderer = /swiftshader|llvmpipe|software|basic render|warp/i.test(R.webgl_renderer || '');
  if (navigator.gpu) {
    const ad = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (ad) R.webgpu = { vendor: ad.info.vendor, architecture: ad.info.architecture, isFallbackAdapter: !!ad.info.isFallbackAdapter };
  }
}

const mkPool = () => Array.from({ length: NW }, () => new Worker(new URL('./bw.js', import.meta.url), { type: 'module' }));
const wsA = mkPool(), wsB = mkPool(); // A: doar varianta SAB; B: transfer si banda proprie
const call = (w, msg, tr) => new Promise((res, rej) => {
  w.onmessage = (e) => (e.data && e.data.err ? rej(new Error(e.data.err)) : res(e.data));
  w.onerror = (e) => rej(new Error('worker: ' + (e.message || e)));
  w.postMessage(msg, tr || []);
});

// ======================================================= BLUR
const SIG = 4, K = gaussKernel(SIG), KR = K.r;
let sabBlur = null;
async function blurA(src) { // (a) SAB: relieful sta deja in memoria comuna (copierea lui nu intra in timp), rezultatul in A
  if (!sabBlur) sabBlur = { A: new SharedArrayBuffer(n * n * 4), B: new SharedArrayBuffer(n * n * 4) };
  await Promise.all(wsA.map((w) => call(w, { cmd: 'initSab', nx: n, ny: n, sabA: sabBlur.A, sabB: sabBlur.B, sigma: SIG })));
  const A = new Float32Array(sabBlur.A); A.set(src);
  const t0 = now();
  for (const cmd of ['h', 'v']) await Promise.all(wsA.map((w, k) => { const [j0, j1] = band(k, n); return call(w, { cmd, j0, j1 }); }));
  return { ms: now() - t0, out: A };
}
async function blurB(src, halo = KR) { // (b) transfer: banda + halo copiate (slice) si transferate; rezultatele transferate inapoi, apoi asamblate
  const t0 = now(); let tCopy = 0;
  const outs = await Promise.all(wsB.map((w, k) => {
    const [j0, j1] = band(k, n), g0 = Math.max(0, j0 - halo), g1 = Math.min(n, j1 + halo);
    const tc = now(); const buf = src.slice(g0 * n, g1 * n); tCopy += now() - tc;
    return call(w, { cmd: 'blurT', nx: n, ny: n, sigma: SIG, buf: buf.buffer, gj0: g0, j0, j1 }, [buf.buffer]).then((res) => ({ res, j0 }));
  }));
  const tBands = now() - t0;
  const out = new Float32Array(n * n);
  for (const { res, j0 } of outs) out.set(new Float32Array(res.out), j0 * n);
  return { ms: now() - t0, ms_benzi_inapoi: tBands, ms_copiere_intrare: tCopy, out };
}
async function setOwn(src) { // (c) pregatire, NEcronometrata: fiecare worker primeste o data banda lui
  await Promise.all(wsB.map((w, k) => { const [j0, j1] = band(k, n); const b = src.slice(j0 * n, j1 * n); return call(w, { cmd: 'setOwn', nx: n, ny: n, buf: b.buffer, oj0: j0, oj1: j1 }, [b.buffer]); }));
}
async function exchange(halo) { // marginile benzilor, cerute de la fiecare worker
  return Promise.all(wsB.map((w) => call(w, { cmd: 'edges', r: halo })));
}
const halos = (ed, k) => { const hT = k > 0 ? ed[k - 1].bot : null, hB = k < NW - 1 ? ed[k + 1].top : null; return { hT, hB, tr: [hT, hB].filter(Boolean) }; };
async function blurC(halo = KR) { // (c) banda detinuta de worker: 2 drumuri dus-intors, doar halo-uri; rezultatul ramane in worker
  const t0 = now();
  const ed = await exchange(halo);
  await Promise.all(wsB.map((w, k) => { const h = halos(ed, k); return call(w, { cmd: 'blurOwn', sigma: SIG, haloTop: h.hT, haloBot: h.hB }, h.tr); }));
  return { ms: now() - t0 };
}
async function gatherOwn() {
  const parts = await Promise.all(wsB.map((w) => call(w, { cmd: 'getOwn' })));
  const out = new Float32Array(n * n); for (const p of parts) out.set(new Float32Array(p.buf), p.oj0 * n); return out;
}
// oracol pe hartie pentru blur: impulsuri unitare puse la marginile benzilor (-13..+12 randuri), raspunsul = g(dx)*g(dy)
function impulseField() {
  const F = new Float32Array(n * n), imp = [];
  for (let k = 1; k < NW; k++) {
    const [j0] = band(k, n);
    for (const d of [-13, -12, -11, -1, 0, 1, 11, 12]) for (const i of [200 + 37 * k, 2000 + 53 * k]) { F[(j0 + d) * n + i] = 1; imp.push([i, j0 + d]); }
  }
  return { F, imp };
}
function paperBlur(imp) { // cod independent: g(d) = exp(-d^2/(2 sigma^2)) / S, |d| <= 3 sigma, in float64
  const r = Math.ceil(3 * SIG); let S = 0; const g = [];
  for (let d = -r; d <= r; d++) S += Math.exp(-(d * d) / (2 * SIG * SIG));
  for (let d = -r; d <= r; d++) g.push(Math.exp(-(d * d) / (2 * SIG * SIG)) / S);
  const E = new Float64Array(n * n);
  for (const [ip, jp] of imp) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) E[(jp + dj) * n + ip + di] += g[di + r] * g[dj + r];
  return { E, S, peak: g[r] * g[r] };
}
function cmpPaper(out, E, tol) {
  let maxErr = 0, bad = 0, sum = 0;
  for (let k = 0; k < out.length; k++) { const e = Math.abs(out[k] - E[k]); sum += out[k]; if (e > maxErr) maxErr = e; if (e > tol) bad++; }
  return { eroare_max: maxErr, puncte_peste_toleranta: bad, suma_iesirii: sum, toleranta: tol };
}

// ======================================================= DROP-CUTTER (raster de finisare, bila R3, celula 0,1 mm, pas 6 celule)
const STEP = 6, nLines = Math.ceil(n / STEP), TOOL = ball(3), OFF = offsets(TOOL, 0.1, 'capsule');
let HMAX = 0; for (let q = 0; q < OFF.n; q++) HMAX = Math.max(HMAX, Math.abs(OFF.dj[q]));
const offMsg = { di: OFF.di, dj: OFF.dj, rs: OFF.rs, n: OFF.n };
let sabDc = null;
async function dcA(src) {
  if (!sabDc) sabDc = { A: new SharedArrayBuffer(n * n * 4), C: new SharedArrayBuffer(nLines * n * 4) };
  new Float32Array(sabDc.A).set(src);
  await Promise.all(wsA.map((w) => call(w, { cmd: 'initSab', nx: n, ny: n, sabA: sabDc.A, sabC: sabDc.C, off: offMsg })));
  const t0 = now();
  await Promise.all(wsA.map((w, k) => { const [l0, l1] = band(k, nLines); return call(w, { cmd: 'dc', step: STEP, l0, l1 }); }));
  return { ms: now() - t0, out: new Float32Array(sabDc.C) };
}
async function dcB(src, halo = HMAX) {
  const t0 = now(); let tCopy = 0;
  const outs = await Promise.all(wsB.map((w, k) => {
    const [l0, l1] = band(k, nLines), g0 = Math.max(0, l0 * STEP - halo), g1 = Math.min(n, (l1 - 1) * STEP + halo + 1);
    const tc = now(); const buf = src.slice(g0 * n, g1 * n); tCopy += now() - tc;
    return call(w, { cmd: 'dcT', nx: n, ny: n, buf: buf.buffer, gj0: g0, off: offMsg, step: STEP, l0, l1 }, [buf.buffer]).then((res) => ({ res, l0 }));
  }));
  const tBands = now() - t0;
  const out = new Float32Array(nLines * n); for (const { res, l0 } of outs) out.set(new Float32Array(res.out), l0 * n);
  return { ms: now() - t0, ms_benzi_inapoi: tBands, ms_copiere_intrare: tCopy, out };
}
async function dcC(halo = HMAX) {
  const t0 = now();
  const ed = await exchange(halo);
  const outs = await Promise.all(wsB.map((w, k) => {
    const [j0, j1] = band(k, n), l0 = Math.ceil(j0 / STEP), l1 = Math.min(nLines, Math.ceil(j1 / STEP)), h = halos(ed, k);
    return call(w, { cmd: 'dcOwn', off: offMsg, step: STEP, l0, l1, haloTop: h.hT, haloBot: h.hB }, h.tr).then((res) => ({ res, l0 }));
  }));
  const out = new Float32Array(nLines * n); for (const { res, l0 } of outs) out.set(new Float32Array(res.out), l0 * n);
  return { ms: now() - t0, out };
}
// oracol pe hartie: varfuri de 5 mm pe teren 0, puse la marginile benzilor (b) si (c); CL = max(0, 5 - rise(d)), rise(d) = R - sqrt(R^2 - d^2)
const H0 = 5;
function spikeField() {
  // randurile critice: prima si ultima linie de raster a fiecarui worker, in ambele impartiri ((b) pe linii, (c) pe randuri);
  // varfuri la +-29..31 randuri (limita discului: |dj| <= 30) si +-1; FIECARE varf in coloana lui (zonele de influenta nu se ating)
  const F = new Float32Array(n * n), sp = [], seen = new Set(); let col = 0;
  const add = (j) => { if (j < 0 || j >= n) return; const i = 40 + 70 * (col++ % 50); const key = j * n + i; if (seen.has(key)) return; seen.add(key); F[key] = H0; sp.push([i, j]); };
  for (let k = 0; k < NW; k++) {
    const [l0, l1] = band(k, nLines), [j0, j1] = band(k, n), c0 = Math.ceil(j0 / STEP), c1 = Math.min(nLines, Math.ceil(j1 / STEP));
    for (const fr of [l0 * STEP, c0 * STEP]) for (const d of [-31, -30, -29, -1, 0, 1]) add(fr + d);
    for (const lr of [(l1 - 1) * STEP, (c1 - 1) * STEP]) for (const d of [-1, 0, 1, 29, 30, 31]) add(lr + d);
  }
  return { F, sp };
}
function paperCL(sp) { // cod independent de hf.mjs / geom.mjs
  const Rt = 3, h = 0.1, E = new Float64Array(nLines * n);
  for (const [is, js] of sp) {
    for (let li = Math.max(0, Math.floor((js - 32) / STEP)); li <= Math.min(nLines - 1, Math.ceil((js + 32) / STEP)); li++) {
      const j = li * STEP;
      for (let i = Math.max(0, is - 33); i <= Math.min(n - 1, is + 33); i++) {
        const gx = Math.max(0, Math.abs(i - is) - 1.5), gy = Math.max(0, Math.abs(j - js) - 0.5), d = h * Math.hypot(gx, gy);
        if (d > Rt + 1e-12) continue;
        const v = H0 - (Rt - Math.sqrt(Math.max(0, Rt * Rt - d * d)));
        if (v > E[li * n + i]) E[li * n + i] = v;
      }
    }
  }
  return E;
}
function cmpCL(out, E, tol) {
  let maxErr = 0, bad = 0, minSigned = 0;
  for (let k = 0; k < out.length; k++) { const e = out[k] - E[k]; if (Math.abs(e) > maxErr) maxErr = Math.abs(e); if (e < minSigned) minSigned = e; if (Math.abs(e) > tol) bad++; }
  return { eroare_max: maxErr, scobitura_max: -minSigned, puncte_peste_toleranta: bad, toleranta: tol };
}

// ======================================================= s4: jobul 2D la 0,1 mm (194 208 mutari), dale intercalate pe workeri
const S4_HASH = 'b00917a30715ff44'; // amprenta masurata de s4 (Node, 1/4/8/16 fire, si Edge) pentru acest job
function s4Setup() {
  const job = job2d(), fieldDef = { ...job.field, cell: 0.1 }, F0 = makeField(fieldDef), nty = F0.nty;
  const ownRows = (k) => { const a = []; for (let r = k; r < nty; r += NW) a.push(r); return a; };
  // pentru filtrare: intervalul de randuri de dale atins de fiecare mutare (+ raza sculei, + 1 celula)
  const ranges = (withRadius) => job.ops.map((o) => {
    const Rt = withRadius ? o.tool.d / 2 : 0, mv = o.moves, nm = mv.length / 9, t0 = new Int32Array(nm), t1 = new Int32Array(nm);
    for (let q = 0; q < nm; q++) {
      const b = q * 9; let ylo = Math.min(mv[b + 2], mv[b + 5]), yhi = Math.max(mv[b + 2], mv[b + 5]);
      if (mv[b] !== 0) { const rad = Math.hypot(mv[b + 1] - mv[b + 7], mv[b + 2] - mv[b + 8]); ylo = Math.min(ylo, mv[b + 8] - rad); yhi = Math.max(yhi, mv[b + 8] + rad); }
      const j0 = Math.floor((ylo - Rt - fieldDef.y0) / fieldDef.cell - 0.5) - 1, j1 = Math.ceil((yhi + Rt - fieldDef.y0) / fieldDef.cell - 0.5) + 1;
      t0[q] = Math.max(0, j0 >> 6); t1[q] = Math.min(nty - 1, j1 >> 6);
    }
    return { t0, t1 };
  });
  const filtered = (withRadius) => { // o trecere pe mutari: fiecare worker primeste doar mutarile care ating randurile lui de dale
    const rg = ranges(withRadius);
    return Array.from({ length: NW }, (_, k) => job.ops.map((o, oi) => {
      const { t0, t1 } = rg[oi], mv = o.moves, keep = [];
      for (let q = 0; q < t0.length; q++) { const span = t1[q] - t0[q]; if (span >= NW - 1 || (((k - t0[q]) % NW) + NW) % NW <= span) keep.push(q); }
      const out = new Float64Array(keep.length * 9); for (let z = 0; z < keep.length; z++) out.set(mv.subarray(keep[z] * 9, keep[z] * 9 + 9), z * 9);
      return { tool: o.tool, moves: out };
    }));
  };
  return { job, fieldDef, ownRows, filtered };
}
async function s4Run(S, opsFor, transfer, ws) {
  const t0 = now();
  const per = typeof opsFor === 'function' ? opsFor() : null; // pregatirea (filtrarea) intra in timp
  const tPrep = now() - t0;
  const res = await Promise.all(ws.map((w, k) => {
    const ops = per ? per[k] : opsFor;
    return call(w, { cmd: 's4', fieldDef: S.fieldDef, ownRows: S.ownRows(k), ops }, transfer ? ops.map((o) => o.moves.buffer) : []);
  }));
  const F = makeField(S.fieldDef); let tiles = 0;
  for (const r of res) for (const [i, t] of r.tiles) { F.tiles[i] = t; F.allocated++; tiles++; }
  return { ms: now() - t0, ms_pregatire: tPrep, F, dale: tiles, worker_ms_max: Math.max(...res.map((r) => r.ms)) };
}

async function main() {
  await gpuInfo();
  log('mod', mode, 'crossOriginIsolated', self.crossOriginIsolated, 'SAB in pagina', R.sab_in_pagina, '| WebGL:', R.webgl_renderer, '| WebGPU:', R.webgpu);
  // ---------- izolarea: SAB in worker si postMessage cu SAB ----------
  if (PARTS.includes('coi')) {
    const w = wsA[0];
    R.worker_crossOriginIsolated = (await call(w, { cmd: 'initSab', nx: 1, ny: 1, sabA: new ArrayBuffer(4) })).coi;
    if (R.sab_in_pagina) {
      const sab = new SharedArrayBuffer(16), v = new Float32Array(sab);
      try {
        await call(w, { cmd: 'initSab', nx: 2, ny: 2, sabA: sab, sabB: new SharedArrayBuffer(16), sigma: 0.5 });
        v.set([1, 2, 3, 4]); await call(w, { cmd: 'h', j0: 0, j1: 2 }); R.sab_postMessage_merge = true;
      } catch (e) { R.sab_postMessage_merge = false; R.sab_eroare = String(e); }
    }
    log('worker crossOriginIsolated', R.worker_crossOriginIsolated, 'SAB postMessage', R.sab_postMessage_merge);
  }
  const SAB = R.sab_in_pagina;
  let H = null;
  if (PARTS.includes('blur') || PARTS.includes('dc')) { const t = now(); H = terrain(n); R.teren_ms = Math.round(now() - t); }

  // ---------------------------------------------------- BLUR
  if (PARTS.includes('blur')) {
    const B = R.blur = { sigma: SIG, raza_kernel: KR };
    let t = now(); const T1 = new Float32Array(n * n), REF = new Float32Array(n * n); blurH(H, T1, n, n, K); blurV(T1, REF, n, n, K); B.ref_1fir_ms = Math.round(now() - t);
    // oracolul pe hartie (impulsuri la marginea benzilor) + controalele negative
    const { F: IF, imp } = impulseField(), P0 = paperBlur(imp), TOL = 1e-7;
    B.hartie = { S: P0.S, varf_impuls_izolat: P0.peak, impulsuri: imp.length };
    B.oracol = {};
    if (SAB) { const a = await blurA(IF); B.oracol.a_sab = cmpPaper(a.out, P0.E, TOL); }
    B.oracol.b_transfer = cmpPaper((await blurB(IF)).out, P0.E, TOL);
    await setOwn(IF); await blurC(); B.oracol.c_banda_proprie = cmpPaper(await gatherOwn(), P0.E, TOL);
    B.oracol.CONTROL_b_halo_minus_1 = cmpPaper((await blurB(IF, KR - 1)).out, P0.E, TOL);
    await setOwn(IF); await blurC(KR - 1); B.oracol.CONTROL_c_halo_minus_1 = cmpPaper(await gatherOwn(), P0.E, TOL);
    log('blur oracol', B.oracol);
    // cronometrare alternata a, b, c pe teren; prima repetitie e si verificarea bit cu bit
    const ta = [], tb = [], tbBands = [], tbCopy = [], tc = [];
    for (let rep = 0; rep < REPS.blur; rep++) {
      if (SAB) { const a = await blurA(H); ta.push(a.ms); if (rep === 0) B.bit_a_vs_ref = cmpBits(a.out, REF); }
      const b = await blurB(H); tb.push(b.ms); tbBands.push(b.ms_benzi_inapoi); tbCopy.push(b.ms_copiere_intrare); if (rep === 0) B.bit_b_vs_ref = cmpBits(b.out, REF);
      await setOwn(H); const c = await blurC(); tc.push(c.ms); if (rep === 0) B.bit_c_vs_ref = cmpBits(await gatherOwn(), REF);
    }
    B.ms = { a_sab: SAB ? med(ta) : null, b_transfer: med(tb), b_transfer_benzi_inapoi: med(tbBands), b_copiere_intrare: med(tbCopy), c_banda_proprie: med(tc) };
    B.ms_toate = { a_sab: ta.map(r2), b_transfer: tb.map(r2), c_banda_proprie: tc.map(r2) };
    if (SAB) B.raport = { b_pe_a: r2(B.ms.b_transfer / B.ms.a_sab), c_pe_a: r2(B.ms.c_banda_proprie / B.ms.a_sab) };
    log('blur', B.ms, B.raport || '', 'bit', B.bit_a_vs_ref || '', B.bit_b_vs_ref, B.bit_c_vs_ref);
    await post('bench-' + mode, R);
  }

  // ---------------------------------------------------- DROP-CUTTER
  if (PARTS.includes('dc')) {
    const D = R.dc = { linii: nLines, puncte_CL: nLines * n, offseturi: OFF.n, halo_randuri: HMAX, scula: TOOL.name };
    const { F: SF, sp } = spikeField(), E = paperCL(sp), TOL = 1e-6;
    D.varfuri = sp.length; D.oracol = {};
    if (SAB) D.oracol.a_sab = cmpCL((await dcA(SF)).out, E, TOL);
    D.oracol.b_transfer = cmpCL((await dcB(SF)).out, E, TOL);
    await setOwn(SF); D.oracol.c_banda_proprie = cmpCL((await dcC()).out, E, TOL);
    D.oracol.CONTROL_b_halo_minus_1 = cmpCL((await dcB(SF, HMAX - 1)).out, E, TOL);
    D.oracol.CONTROL_c_halo_minus_1 = cmpCL((await dcC(HMAX - 1)).out, E, TOL);
    log('dc oracol', D.oracol);
    await setOwn(H);
    const ta = [], tb = [], tbCopy = [], tc = []; let outA = null, outB = null, outC = null;
    for (let rep = 0; rep < REPS.dc; rep++) {
      if (SAB) { const a = await dcA(H); ta.push(a.ms); if (rep === 0) outA = a.out.slice(); }
      const b = await dcB(H); tb.push(b.ms); tbCopy.push(b.ms_copiere_intrare); if (rep === 0) outB = b.out;
      const c = await dcC(); tc.push(c.ms); if (rep === 0) outC = c.out;
    }
    // referinta pe un fir (dropRow din s5/lib/hf.mjs) pe 3 linii
    let refDiff = 0; for (const li of [0, Math.floor(nLines / 2), nLines - 1]) { const row = dropRow({ nx: n, ny: n }, H, OFF, li * STEP, new Float64Array(n)); for (let i = 0; i < n; i++) if (Math.fround(row[i]) !== outB[li * n + i]) refDiff++; }
    D.bit_b_vs_ref_3linii = refDiff;
    if (SAB) D.bit_a_vs_b = cmpBits(outA, outB);
    D.bit_c_vs_b = cmpBits(outC, outB);
    D.ms = { a_sab: SAB ? med(ta) : null, b_transfer: med(tb), b_copiere_intrare: med(tbCopy), c_banda_proprie: med(tc) };
    D.ms_toate = { a_sab: ta.map(r2), b_transfer: tb.map(r2), c_banda_proprie: tc.map(r2) };
    if (SAB) D.raport = { b_pe_a: r2(D.ms.b_transfer / D.ms.a_sab), c_pe_a: r2(D.ms.c_banda_proprie / D.ms.a_sab) };
    log('dc', D.ms, D.raport || '', 'bit', D.bit_a_vs_b || '', D.bit_c_vs_b, 'ref', refDiff);
    await post('bench-' + mode, R);
  }
  H = null;

  // ---------------------------------------------------- s4
  if (PARTS.includes('s4')) {
    const S = s4Setup(), Q = R.s4 = { mutari: countMoves(S.job), celula: 0.1, amprenta_asteptata_s4: S4_HASH };
    const opsSab = SAB ? S.job.ops.map((o) => { const a = new Float64Array(new SharedArrayBuffer(o.moves.byteLength)); a.set(o.moves); return { tool: o.tool, moves: a }; }) : null;
    Q.amprente = {};
    const ta = [], tb = [], tf = [], tfPrep = [];
    for (let rep = 0; rep < REPS.s4; rep++) {
      if (SAB) { const a = await s4Run(S, opsSab, false, wsA); ta.push(a.ms); if (rep === 0) { Q.amprente.a_mutari_in_sab = hashField(a.F); Q.dale = a.dale; } }
      const b = await s4Run(S, S.job.ops, false, wsB); tb.push(b.ms); if (rep === 0) Q.amprente.b_mutari_copiate = hashField(b.F);
      const f = await s4Run(S, () => S.filtered(true), true, wsB); tf.push(f.ms); tfPrep.push(f.ms_pregatire); if (rep === 0) Q.amprente.b2_mutari_filtrate_transferate = hashField(f.F);
    }
    const bug = await s4Run(S, () => S.filtered(false), true, wsB); Q.amprente.CONTROL_filtru_fara_raza_sculei = hashField(bug.F);
    Q.ms = { a_mutari_in_sab: SAB ? med(ta) : null, b_mutari_copiate: med(tb), b2_filtrate_transferate: med(tf), b2_din_care_filtrare: med(tfPrep) };
    Q.ms_toate = { a: ta.map(r2), b: tb.map(r2), b2: tf.map(r2) };
    if (SAB) Q.raport = { b_pe_a: r2(Q.ms.b_mutari_copiate / Q.ms.a_mutari_in_sab), b2_pe_a: r2(Q.ms.b2_filtrate_transferate / Q.ms.a_mutari_in_sab) };
    log('s4', Q.ms, Q.raport || '', Q.amprente);
  }
  [...wsA, ...wsB].forEach((w) => w.terminate());
  await post('bench-' + mode, R);
  log('GATA');
  window.__done = true;
}
main().catch(async (e) => { R.eroare = String((e && e.stack) || e); log('EROARE', R.eroare); await post('bench-' + mode, R); window.__done = true; });
