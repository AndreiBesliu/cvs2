// page.mjs — ACELAȘI nucleu în browser (determinism + debit) și varianta WebGPU compute (comparată).
import { makeField, runJob } from '../src/core.mjs';
import { hashField, toDense } from '../src/hash.mjs';
import { job2d, job3d, countMoves } from '../bench/jobs.mjs';

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[(s.length - 1) >> 1]; };
function hashInput(job) {
  let h = 0x811c9dc5 | 0;
  for (const op of job.ops) {
    const a = op.poly || op.moves;
    const u = new Uint32Array(a.buffer, a.byteOffset, a.length * 2);
    for (let k = 0; k < u.length; k++) h = Math.imul(h ^ u[k], 0x01000193);
  }
  return (h >>> 0).toString(16);
}
window.hashInput = hashInput;
window.envInfo = async () => {
  const gl = document.getElementById('c').getContext('webgl');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  const r = { ua: navigator.userAgent, webgl: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'n/a', webgpu: null, coi: self.crossOriginIsolated, cores: navigator.hardwareConcurrency };
  if (navigator.gpu) {
    const ad = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (ad) r.webgpu = { vendor: ad.info.vendor, architecture: ad.info.architecture, device: ad.info.device, description: ad.info.description, maxStorageBufferBindingSize: ad.limits.maxStorageBufferBindingSize, maxBufferSize: ad.limits.maxBufferSize };
  }
  return r;
};
window.cpu = async (which, cell, reps, lines) => {
  const job = which === '2d' ? job2d() : job3d(lines, 2500);
  const t = []; let h;
  for (let r = 0; r < reps; r++) {
    const F = makeField({ ...job.field, cell });
    const t0 = performance.now(); runJob(F, job); t.push(performance.now() - t0);
    h = hashField(F);
  }
  return { which, cell, mutari: countMoves(job), ms_median: Math.round(med(t)), ms_toate: t.map(Math.round), hash: h, hash_intrare: hashInput(job) };
};

// ---------------------------------------------------------------- WebGPU: aceeași formulă (bilă, segment 3D) în f32, atomicMin pe i32
const WGSL = `
struct Prm { cell: f32, R: f32, R2: f32, Q: f32, nx: u32, ny: u32, W: u32, segBase: u32, nSeg: u32, p0: u32, p1: u32, p2: u32 };
@group(0) @binding(0) var<uniform> P: Prm;
@group(0) @binding(1) var<storage, read> pts: array<f32>;
@group(0) @binding(2) var<storage, read_write> grid: array<atomic<i32>>;
@compute @workgroup_size(64)
fn main(@builtin(workgroup_id) wg: vec3<u32>, @builtin(local_invocation_index) li: u32) {
  let seg = P.segBase + wg.y;
  if (seg >= P.nSeg) { return; }
  let loc = wg.x * 64u + li;
  if (loc >= P.W * P.W) { return; }
  let o = seg * 3u;
  let ax = pts[o]; let ay = pts[o + 1u]; let az = pts[o + 2u];
  let bx = pts[o + 3u]; let by = pts[o + 4u]; let bz = pts[o + 5u];
  let i = i32(floor((min(ax, bx) - P.R) / P.cell - 0.5)) + i32(loc % P.W);
  let j = i32(floor((min(ay, by) - P.R) / P.cell - 0.5)) + i32(loc / P.W);
  if (i < 0 || j < 0 || i >= i32(P.nx) || j >= i32(P.ny)) { return; }
  let px = (f32(i) + 0.5) * P.cell; let py = (f32(j) + 0.5) * P.cell;
  let dx = bx - ax; let dy = by - ay; let dz = bz - az;
  let L2 = dx * dx + dy * dy;
  let ex = px - ax; let ey = py - ay;
  let k = u32(j) * P.nx + u32(i);
  let zlo = min(az, bz);
  if (atomicLoad(&grid[k]) <= i32(floor(zlo * P.Q))) { return; }
  var zs: f32;
  if (L2 < 1e-12) {
    let q = ex * ex + ey * ey;
    if (q > P.R2) { return; }
    zs = zlo + P.R - sqrt(max(P.R2 - q, 0.0));
  } else {
    let L = sqrt(L2); let cr = ex * dy - ey * dx; let perp2 = cr * cr / L2;
    if (perp2 > P.R2) { return; }
    let tp = (ex * dx + ey * dy) / L2; let srho = sqrt(P.R2 - perp2); let half = srho / L;
    let ta = max(tp - half, 0.0); let tb = min(tp + half, 1.0);
    if (ta > tb) { return; }
    let m = dz / L; let sa = (ta - tp) * L; let sb = (tb - tp) * L;
    let s = clamp(-m * srho / sqrt(1.0 + m * m), sa, sb);
    zs = az + dz * tp + m * s + P.R - sqrt(max(P.R2 - perp2 - s * s, 0.0));
  }
  let zq = i32(floor(zs * P.Q));
  if (zq < 0) { atomicMin(&grid[k], zq); }
}`;

window.gpu = async (lines, cell, reps) => {
  const ad = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  const dev = await ad.requestDevice({ requiredLimits: { maxStorageBufferBindingSize: ad.limits.maxStorageBufferBindingSize, maxBufferSize: ad.limits.maxBufferSize } });
  const job = job3d(lines, 2500), op = job.ops[0], R = op.tool.d / 2, Q = 1e5;
  const nP = op.poly.length / 3, nSeg = nP - 1;
  const f32 = new Float32Array(op.poly.length);
  for (let k = 0; k < nP; k++) { f32[3 * k] = op.poly[3 * k] - job.field.x0; f32[3 * k + 1] = op.poly[3 * k + 1] - job.field.y0; f32[3 * k + 2] = op.poly[3 * k + 2]; }
  const F0 = makeField({ ...job.field, cell });
  const nx = F0.nx, ny = F0.ny;
  const W = Math.ceil((2 * R + 0.15) / cell) + 3;
  const ptsBuf = dev.createBuffer({ size: f32.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  dev.queue.writeBuffer(ptsBuf, 0, f32);
  const gridBuf = dev.createBuffer({ size: nx * ny * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
  const readBuf = dev.createBuffer({ size: nx * ny * 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  const mod = dev.createShaderModule({ code: WGSL });
  const info = await mod.getCompilationInfo();
  if (info.messages.some((m) => m.type === 'error')) throw new Error(info.messages.map((m) => m.message).join('\n'));
  const pipe = dev.createComputePipeline({ layout: 'auto', compute: { module: mod, entryPoint: 'main' } });
  const CH = 65535, nCh = Math.ceil(nSeg / CH);
  const bgs = [];
  for (let c = 0; c < nCh; c++) {
    const u = dev.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const ab = new ArrayBuffer(48), fv = new Float32Array(ab), uv = new Uint32Array(ab);
    fv[0] = cell; fv[1] = R; fv[2] = R * R; fv[3] = Q; uv[4] = nx; uv[5] = ny; uv[6] = W; uv[7] = c * CH; uv[8] = nSeg;
    dev.queue.writeBuffer(u, 0, ab);
    bgs.push(dev.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: u } }, { binding: 1, resource: { buffer: ptsBuf } }, { binding: 2, resource: { buffer: gridBuf } }] }));
  }
  const wgx = Math.ceil((W * W) / 64);
  const times = [];
  for (let r = 0; r < reps; r++) {
    const enc0 = dev.createCommandEncoder(); enc0.clearBuffer(gridBuf); dev.queue.submit([enc0.finish()]);
    await dev.queue.onSubmittedWorkDone();
    const t0 = performance.now();
    for (let c0 = 0; c0 < nCh; c0 += 8) { // câte 8 bucăți pe submit, ca să nu atingem TDR-ul Windows
      const enc = dev.createCommandEncoder(); const pass = enc.beginComputePass(); pass.setPipeline(pipe);
      for (let c = c0; c < Math.min(nCh, c0 + 8); c++) { pass.setBindGroup(0, bgs[c]); pass.dispatchWorkgroups(wgx, Math.min(CH, nSeg - c * CH), 1); }
      pass.end(); dev.queue.submit([enc.finish()]);
      await dev.queue.onSubmittedWorkDone();
    }
    times.push(performance.now() - t0);
  }
  const enc = dev.createCommandEncoder(); enc.copyBufferToBuffer(gridBuf, 0, readBuf, 0, nx * ny * 4); dev.queue.submit([enc.finish()]);
  const tr0 = performance.now(); await readBuf.mapAsync(GPUMapMode.READ);
  const g = new Int32Array(readBuf.getMappedRange().slice(0)); readBuf.unmap(); const tRead = performance.now() - tr0;
  // comparația cu nucleul CPU (aceeași formulă în f64, stocată f32), cuantizat la fel (unități de 10 nm)
  const tc0 = performance.now(); runJob(F0, job); const tCpu = performance.now() - tc0;
  const D = toDense(F0);
  let eq = 0, dif1 = 0, dif10 = 0, maxd = 0, cutG = 0, cutC = 0;
  for (let k = 0; k < D.length; k++) {
    const qc = D[k] < 0 ? Math.floor(D[k] * Q) : 0, qg = g[k];
    if (qc < 0) cutC++; if (qg < 0) cutG++;
    const d = Math.abs(qc - qg);
    if (d === 0) eq++; if (d > 100) dif1++; if (d > 1000) dif10++; if (d > maxd) maxd = d;
  }
  dev.destroy();
  return { mutari: nSeg, W, ms_gpu_median: Math.round(med(times)), ms_gpu_toate: times.map(Math.round), ms_citire_grila: Math.round(tRead), ms_cpu_1fir_aceeasi_pagina: Math.round(tCpu),
    celule: D.length, celule_identice_bit: eq, celule_dif_peste_1um: dif1, celule_dif_peste_10um: dif10, dif_max_um: maxd / 100, celule_taiate_cpu: cutC, celule_taiate_gpu: cutG };
};
document.getElementById('o').textContent = 'gata';
window.__ready = true;
