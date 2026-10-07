// Sonda s5-relief in browser (headed, GPU real): GPU info, combinare, blur CPU/workeri/WebGPU, drop-cutter CPU/workeri/WebGPU,
// sculptura + afisare WebGL2 (2D umbrit si plasa 3D) la 4000x4000.
import { ball, flat, vbit } from '../lib/geom.mjs';
import { offsets, dropRow, combine, gaussKernel, blurH, blurV, dab, smoothDab } from '../lib/hf.mjs';

const P = new URLSearchParams(location.search);
const QUICK = P.has('quick');
const n = +(P.get('n') || 4000);
const R = { quick: QUICK, n, ua: navigator.userAgent, crossOriginIsolated: self.crossOriginIsolated, hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory };
const logEl = document.getElementById('log');
const log = (...a) => { console.log(a.join(' ')); logEl.textContent += '\n' + a.join(' '); };
const med = (a) => { const s = [...a].sort((x, y) => x - y); return +s[Math.floor(s.length / 2)].toFixed(2); };
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(2); };
const now = () => performance.now();
const post = (name, obj) => fetch('/rezultat?nume=' + name, { method: 'POST', body: JSON.stringify(obj, null, 1) });
const REPS = QUICK ? 3 : 5;

function terrain(N) {
  const H = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const dx = (i - N / 2) / (N / 4), dy = (j - N / 2) / (N / 4);
    H[j * N + i] = 5 + 2 * Math.sin(i / 97) * Math.cos(j / 131) + 8 * Math.exp(-(dx * dx + dy * dy)) + 0.3 * Math.sin(i / 7.3 + j / 11.1);
  }
  return H;
}
const maxDiff = (a, b, k0 = 0, k1 = a.length) => { let m = 0; for (let k = k0; k < k1; k++) { const d = Math.abs(a[k] - b[k]); if (d > m) m = d; } return m; };

async function main() {
  // ---------- GPU ----------
  const cv = document.getElementById('c');
  const gl = cv.getContext('webgl2', { antialias: false, powerPreference: 'high-performance' });
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  R.webgl = { renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null, vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : null, maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE), floatLinear: !!gl.getExtension('OES_texture_float_linear'), colorBufferFloat: !!gl.getExtension('EXT_color_buffer_float') };
  R.software_renderer = /swiftshader|llvmpipe|software|basic render/i.test(R.webgl.renderer || '');
  let device = null;
  if (navigator.gpu) {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (adapter) {
      const info = adapter.info || {};
      const L = adapter.limits;
      R.webgpu = { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description, isFallbackAdapter: !!(info.isFallbackAdapter ?? adapter.isFallbackAdapter), limits: { maxBufferSize: L.maxBufferSize, maxStorageBufferBindingSize: L.maxStorageBufferBindingSize, maxTextureDimension2D: L.maxTextureDimension2D, maxComputeWorkgroupsPerDimension: L.maxComputeWorkgroupsPerDimension }, features: [...adapter.features] };
      device = await adapter.requestDevice({ requiredLimits: { maxBufferSize: L.maxBufferSize, maxStorageBufferBindingSize: L.maxStorageBufferBindingSize } });
      device.lost.then((i) => log('WebGPU device lost: ' + i.message));
    }
  }
  R.float16Array = typeof Float16Array !== 'undefined';
  log('WebGL:', R.webgl.renderer, '| WebGPU:', JSON.stringify(R.webgpu && { v: R.webgpu.vendor, a: R.webgpu.architecture, d: R.webgpu.description }));

  // ---------- date ----------
  let t = now(); const H1 = terrain(n); R.teren_generare_ms = Math.round(now() - t);
  const H2 = new Float32Array(n * n); for (let k = 0; k < n * n; k++) H2[k] = 12 - 0.7 * H1[k] + ((k * 2654435761) % 1000) * 1e-4;
  const O = new Float32Array(n * n);

  // ---------- combinare pe CPU ----------
  R.combinare_cpu_ms = {};
  for (const op of ['add', 'max', 'min']) { const ts = []; for (let r = 0; r < REPS; r++) { t = now(); combine(op, H1, H2, O); ts.push(now() - t); } R.combinare_cpu_ms[op] = med(ts); }
  log('combinare CPU ms', JSON.stringify(R.combinare_cpu_ms));

  // ---------- blur gaussian sigma=4 px pe tot relieful ----------
  const K = gaussKernel(4), T1 = new Float32Array(n * n), B1 = new Float32Array(n * n);
  { const ts = []; for (let r = 0; r < (QUICK ? 1 : 3); r++) { t = now(); blurH(H1, T1, n, n, K); blurV(T1, B1, n, n, K); ts.push(now() - t); } R.blur_cpu_1fir_ms = med(ts); }
  log('blur CPU 1 fir ms', R.blur_cpu_1fir_ms);

  // workeri pe SharedArrayBuffer
  const mkW = () => new Worker(new URL('./work.js', import.meta.url), { type: 'module' });
  const call = (w, msg) => new Promise((res) => { w.onmessage = (e) => res(e.data); w.postMessage(msg); });
  R.blur_workeri_ms = {};
  const sabA = new SharedArrayBuffer(n * n * 4), sabB = new SharedArrayBuffer(n * n * 4), A = new Float32Array(sabA);
  for (const W of [4, 8, 16].filter((w) => w <= navigator.hardwareConcurrency)) {
    const ws = Array.from({ length: W }, mkW);
    await Promise.all(ws.map((w) => call(w, { cmd: 'init', nx: n, ny: n, sabA, sabB, sigma: 4 })));
    const ts = [];
    for (let r = 0; r < REPS; r++) {
      A.set(H1); t = now();
      const part = (cmd) => Promise.all(ws.map((w, k) => call(w, { cmd, j0: Math.floor((k * n) / W), j1: Math.floor(((k + 1) * n) / W) })));
      await part('h'); await part('v'); ts.push(now() - t);
    }
    R.blur_workeri_ms[W] = med(ts); R.blur_workeri_vs_cpu_maxdiff = maxDiff(A, B1);
    ws.forEach((w) => w.terminate());
  }
  log('blur workeri ms', JSON.stringify(R.blur_workeri_ms));

  // ---------- WebGPU: blur ----------
  if (device) {
    const U = GPUBufferUsage;
    const mk = (size, usage) => device.createBuffer({ size, usage });
    const bufA = mk(n * n * 4, U.STORAGE | U.COPY_DST | U.COPY_SRC), bufB = mk(n * n * 4, U.STORAGE | U.COPY_DST | U.COPY_SRC);
    const kbuf = mk(K.k.byteLength, U.STORAGE | U.COPY_DST); device.queue.writeBuffer(kbuf, 0, K.k);
    const uni = [0, 1].map((dir) => { const b = mk(16, U.UNIFORM | U.COPY_DST); device.queue.writeBuffer(b, 0, new Int32Array([n, n, K.r, dir])); return b; });
    const mod = device.createShaderModule({ code: `
      struct U { nx: u32, ny: u32, r: i32, dir: u32 }
      @group(0) @binding(0) var<storage, read> src: array<f32>;
      @group(0) @binding(1) var<storage, read_write> dst: array<f32>;
      @group(0) @binding(2) var<storage, read> kw: array<f32>;
      @group(0) @binding(3) var<uniform> u: U;
      @compute @workgroup_size(16, 16)
      fn main(@builtin(global_invocation_id) g: vec3<u32>) {
        if (g.x >= u.nx || g.y >= u.ny) { return; }
        var s = 0.0;
        for (var t = -u.r; t <= u.r; t++) {
          var x = i32(g.x); var y = i32(g.y);
          if (u.dir == 0u) { x = clamp(x + t, 0, i32(u.nx) - 1); } else { y = clamp(y + t, 0, i32(u.ny) - 1); }
          s += kw[t + u.r] * src[u32(y) * u.nx + u32(x)];
        }
        dst[g.y * u.nx + g.x] = s;
      }` });
    const pipe = device.createComputePipeline({ layout: 'auto', compute: { module: mod, entryPoint: 'main' } });
    const bg = (s, d, u) => device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: s } }, { binding: 1, resource: { buffer: d } }, { binding: 2, resource: { buffer: kbuf } }, { binding: 3, resource: { buffer: u } }] });
    const bgH = bg(bufA, bufB, uni[0]), bgV = bg(bufB, bufA, uni[1]);
    t = now(); device.queue.writeBuffer(bufA, 0, H1); await device.queue.onSubmittedWorkDone(); R.webgpu_upload_64MB_ms = +(now() - t).toFixed(2);
    const run = async () => { const e = device.createCommandEncoder(); for (const b of [bgH, bgV]) { const p = e.beginComputePass(); p.setPipeline(pipe); p.setBindGroup(0, b); p.dispatchWorkgroups(Math.ceil(n / 16), Math.ceil(n / 16)); p.end(); } device.queue.submit([e.finish()]); await device.queue.onSubmittedWorkDone(); };
    await run(); // incalzire
    const ts = []; for (let r = 0; r < REPS; r++) { device.queue.writeBuffer(bufA, 0, H1); await device.queue.onSubmittedWorkDone(); t = now(); await run(); ts.push(now() - t); }
    R.blur_webgpu_ms = med(ts);
    const rb = mk(n * n * 4, U.MAP_READ | U.COPY_DST);
    t = now(); { const e = device.createCommandEncoder(); e.copyBufferToBuffer(bufA, 0, rb, 0, n * n * 4); device.queue.submit([e.finish()]); await rb.mapAsync(GPUMapMode.READ); }
    const G = new Float32Array(rb.getMappedRange().slice(0)); rb.unmap(); R.webgpu_readback_64MB_ms = +(now() - t).toFixed(2);
    R.blur_webgpu_vs_cpu_maxdiff = maxDiff(G, B1);
    log('blur WebGPU ms', R.blur_webgpu_ms, 'upload', R.webgpu_upload_64MB_ms, 'readback', R.webgpu_readback_64MB_ms, 'diff', R.blur_webgpu_vs_cpu_maxdiff);

    // ---------- WebGPU: combinare (date deja pe GPU) ----------
    const cmod = device.createShaderModule({ code: `
      @group(0) @binding(0) var<storage, read> a: array<f32>;
      @group(0) @binding(1) var<storage, read_write> b: array<f32>;
      @compute @workgroup_size(256) fn main(@builtin(global_invocation_id) g: vec3<u32>) { let k = g.x + g.y * 65535u * 256u; if (k < arrayLength(&a)) { b[k] = max(a[k], b[k]); } }` });
    const cp = device.createComputePipeline({ layout: 'auto', compute: { module: cmod, entryPoint: 'main' } });
    const cbg = device.createBindGroup({ layout: cp.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: bufA } }, { binding: 1, resource: { buffer: bufB } }] });
    const groups = Math.ceil((n * n) / 256), gx = Math.min(groups, 65535), gy = Math.ceil(groups / 65535);
    const crun = async () => { const e = device.createCommandEncoder(); const p = e.beginComputePass(); p.setPipeline(cp); p.setBindGroup(0, cbg); p.dispatchWorkgroups(gx, gy); p.end(); device.queue.submit([e.finish()]); await device.queue.onSubmittedWorkDone(); };
    await crun(); { const ts2 = []; for (let r = 0; r < REPS; r++) { t = now(); await crun(); ts2.push(now() - t); } R.combinare_max_webgpu_ms_rezident = med(ts2); }

    // ---------- WebGPU: drop-cutter raster (varianta C: maxim pe celula + capsula) ----------
    const dmod = device.createShaderModule({ code: `
      struct U { nx: u32, ny: u32, step: u32, nOff: u32, line0: u32, nLines: u32, floorZ: f32, pad: u32 }
      @group(0) @binding(0) var<storage, read> H: array<f32>;
      @group(0) @binding(1) var<storage, read_write> OUT: array<f32>;
      @group(0) @binding(2) var<storage, read> off: array<vec4<f32>>;
      @group(0) @binding(3) var<uniform> u: U;
      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) g: vec3<u32>) {
        let i = g.x; if (i >= u.nx || g.y >= u.nLines) { return; }
        let li = u.line0 + g.y; let j = i32(li * u.step);
        var best = u.floorZ;
        for (var k = 0u; k < u.nOff; k++) {
          let o = off[k]; let ii = i32(i) + i32(o.x); let jj = j + i32(o.y);
          if (ii < 0 || jj < 0 || ii >= i32(u.nx) || jj >= i32(u.ny)) { continue; }
          best = max(best, H[u32(jj) * u.nx + u32(ii)] - o.z);
        }
        OUT[li * u.nx + i] = best;
      }` });
    const dpipe = device.createComputePipeline({ layout: 'auto', compute: { module: dmod, entryPoint: 'main' } });
    const step = 6, nLines = Math.ceil(n / step), outBuf = mk(nLines * n * 4, U.STORAGE | U.COPY_SRC), rb2 = mk(nLines * n * 4, U.MAP_READ | U.COPY_DST);
    device.queue.writeBuffer(bufA, 0, H1);
    R.dropcutter = {};
    const g = { nx: n, ny: n, h: 0.1 };
    for (const tool of [ball(3), flat(3), vbit(3, 90)]) {
      const off = offsets(tool, 0.1, 'capsule');
      const ob = new Float32Array(off.n * 4); for (let k = 0; k < off.n; k++) { ob[4 * k] = off.di[k]; ob[4 * k + 1] = off.dj[k]; ob[4 * k + 2] = off.rs[k]; }
      const offBuf = mk(ob.byteLength, U.STORAGE | U.COPY_DST); device.queue.writeBuffer(offBuf, 0, ob);
      const CH = 64, chunks = [];
      for (let l0 = 0; l0 < nLines; l0 += CH) {
        const ub = mk(32, U.UNIFORM | U.COPY_DST); const dv = new DataView(new ArrayBuffer(32));
        [n, n, step, off.n, l0, Math.min(CH, nLines - l0)].forEach((v, k) => dv.setUint32(4 * k, v, true)); dv.setFloat32(24, 0, true);
        device.queue.writeBuffer(ub, 0, dv.buffer);
        chunks.push({ bg: device.createBindGroup({ layout: dpipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: bufA } }, { binding: 1, resource: { buffer: outBuf } }, { binding: 2, resource: { buffer: offBuf } }, { binding: 3, resource: { buffer: ub } }] }), lines: Math.min(CH, nLines - l0) });
      }
      const drun = async () => { for (const c of chunks) { const e = device.createCommandEncoder(); const p = e.beginComputePass(); p.setPipeline(dpipe); p.setBindGroup(0, c.bg); p.dispatchWorkgroups(Math.ceil(n / 64), c.lines); p.end(); device.queue.submit([e.finish()]); } await device.queue.onSubmittedWorkDone(); };
      await drun();
      const ts3 = []; for (let r = 0; r < (QUICK ? 2 : 3); r++) { t = now(); await drun(); ts3.push(now() - t); }
      { const e = device.createCommandEncoder(); e.copyBufferToBuffer(outBuf, 0, rb2, 0, nLines * n * 4); device.queue.submit([e.finish()]); await rb2.mapAsync(GPUMapMode.READ); }
      const OUTG = new Float32Array(rb2.getMappedRange().slice(0)); rb2.unmap();
      // referinta CPU pe 2 linii (acelasi algoritm, alt cod: JS float64)
      let diff = 0; t = now();
      for (const li of [17, Math.floor(nLines / 2)]) { const row = dropRow(g, H1, off, li * step, new Float64Array(n)); for (let i = 0; i < n; i++) diff = Math.max(diff, Math.abs(row[i] - OUTG[li * n + i])); }
      const cpuPerLine = (now() - t) / 2;
      // workeri CPU pe tot rasterul
      const W = Math.min(16, navigator.hardwareConcurrency), sabC = new SharedArrayBuffer(nLines * n * 4);
      const ws = Array.from({ length: W }, mkW); A.set(H1);
      await Promise.all(ws.map((w) => call(w, { cmd: 'init', nx: n, ny: n, sabA, sabC, off: { di: off.di, dj: off.dj, rs: off.rs, n: off.n } })));
      let tW = null;
      if (!QUICK || tool.kind === 'ball') { t = now(); await Promise.all(ws.map((w, k) => call(w, { cmd: 'dc', step, l0: Math.floor((k * nLines) / W), l1: Math.floor(((k + 1) * nLines) / W) }))); tW = now() - t; }
      ws.forEach((w) => w.terminate());
      const C = new Float32Array(sabC);
      R.dropcutter[tool.name] = { linii: nLines, puncte_CL: nLines * n, offseturi: off.n, webgpu_ms: med(ts3), cpu_1fir_ms_pe_linie: +cpuPerLine.toFixed(1), cpu_1fir_ms_estimat_tot: Math.round(cpuPerLine * nLines), [`workeri${W}_ms_tot`]: tW && Math.round(tW), webgpu_vs_cpu_maxdiff: diff, workeri_vs_webgpu_maxdiff: tW ? maxDiff(C, OUTG) : null };
      log('drop-cutter', tool.name, JSON.stringify(R.dropcutter[tool.name]));
    }
  }
  await post('main', R);

  // ---------- WebGL2: sculptura + afisare ----------
  const H = H1.slice(), tmp = new Float32Array(400 * 400);
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32F, n, n);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  const px = new Uint8Array(4);
  t = now(); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, n, n, gl.RED, gl.FLOAT, H); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); R.webgl_upload_complet_ms = +(now() - t).toFixed(1);
  const p2d = prog(`#version 300 es
    void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0, 1); }`, `#version 300 es
    precision highp float; precision highp sampler2D;
    uniform sampler2D uH; uniform vec2 uView; uniform float uZs; out vec4 o;
    void main(){ vec2 p = gl_FragCoord.xy / uView; float a = uView.x / uView.y; vec2 q = vec2((p.x - 0.5) * a + 0.5, p.y);
      if (q.x < 0.0 || q.x > 1.0) { o = vec4(0.12, 0.12, 0.12, 1); return; }
      int N = textureSize(uH, 0).x - 1; ivec2 t = ivec2(q * float(N));
      float zl = texelFetch(uH, ivec2(max(t.x - 1, 0), t.y), 0).r, zr = texelFetch(uH, ivec2(min(t.x + 1, N), t.y), 0).r;
      float zd = texelFetch(uH, ivec2(t.x, max(t.y - 1, 0)), 0).r, zu = texelFetch(uH, ivec2(t.x, min(t.y + 1, N)), 0).r;
      vec3 nr = normalize(vec3((zl - zr) * uZs, (zd - zu) * uZs, 2.0)); float l = max(dot(nr, normalize(vec3(-0.5, 0.6, 0.6))), 0.0);
      o = vec4(vec3(0.82, 0.72, 0.55) * (0.25 + 0.75 * l), 1.0); }`);
  const p3d = prog(`#version 300 es
    precision highp float; precision highp sampler2D;
    uniform sampler2D uH; uniform int uS; uniform mat4 uM; uniform float uCell; out vec3 vN;
    void main(){ int N = textureSize(uH, 0).x - 1; int i = min((gl_VertexID >> 1) * uS, N); int j = min((gl_InstanceID + (gl_VertexID & 1)) * uS, N);
      float z = texelFetch(uH, ivec2(i, j), 0).r;
      float zx = texelFetch(uH, ivec2(min(i + uS, N), j), 0).r - texelFetch(uH, ivec2(max(i - uS, 0), j), 0).r;
      float zy = texelFetch(uH, ivec2(i, min(j + uS, N)), 0).r - texelFetch(uH, ivec2(i, max(j - uS, 0)), 0).r;
      vN = normalize(vec3(-zx, -zy, 4.0 * float(uS) * uCell)); gl_Position = uM * vec4(float(i) * uCell, float(j) * uCell, z, 1.0); }`, `#version 300 es
    precision highp float; in vec3 vN; out vec4 o;
    void main(){ float l = max(dot(normalize(vN), normalize(vec3(-0.5, 0.6, 0.6))), 0.0); o = vec4(vec3(0.82, 0.72, 0.55) * (0.25 + 0.75 * l), 1.0); }`);
  // matrice de vedere: perspectiva simpla, privire oblica spre centrul reliefului (n*0.1 mm)
  const S = n * 0.1;
  const persp = (f, a, zn, zf) => { const t2 = 1 / Math.tan(f / 2); return [t2 / a, 0, 0, 0, 0, t2, 0, 0, 0, 0, (zf + zn) / (zn - zf), -1, 0, 0, (2 * zf * zn) / (zn - zf), 0]; };
  const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
  const lookAt = (e, c, u) => { const sub = (p, q) => p.map((v, k) => v - q[k]), nrm = (p) => { const l = Math.hypot(...p); return p.map((v) => v / l); }, cr = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]], dt = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
    const z = nrm(sub(e, c)), x = nrm(cr(u, z)), y = cr(z, x); return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dt(x, e), -dt(y, e), -dt(z, e), 1]; };
  const M = new Float32Array(mul(persp(0.8, cv.width / cv.height, 1, S * 5), lookAt([S * 0.5, -S * 0.6, S * 0.9], [S * 0.5, S * 0.5, 0], [0, 0, 1])));
  gl.viewport(0, 0, cv.width, cv.height); gl.enable(gl.DEPTH_TEST);
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const draw = (mode) => {
    gl.clearColor(0.12, 0.12, 0.12, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (mode.view === '2d') { gl.useProgram(p2d); gl.uniform1i(gl.getUniformLocation(p2d, 'uH'), 0); gl.uniform2f(gl.getUniformLocation(p2d, 'uView'), cv.width, cv.height); gl.uniform1f(gl.getUniformLocation(p2d, 'uZs'), 10); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    else { const s = mode.stride, G = Math.ceil(n / s); gl.useProgram(p3d); gl.uniform1i(gl.getUniformLocation(p3d, 'uH'), 0); gl.uniform1i(gl.getUniformLocation(p3d, 'uS'), s); gl.uniform1f(gl.getUniformLocation(p3d, 'uCell'), 0.1); gl.uniformMatrix4fv(gl.getUniformLocation(p3d, 'uM'), false, M); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 2 * G, G - 1); }
  };
  const loop = (mode, frames) => new Promise((res) => {
    let f = 0, last = null; const iv = [], cpu = []; const reps = mode.reps || 1;
    const frame = (ts) => {
      if (last !== null) iv.push(ts - last); last = ts;
      const c0 = now();
      if (mode.sculpt) {
        const a = f * 0.05, cx = n / 2 + n * 0.3 * Math.cos(a), cy = n / 2 + n * 0.3 * Math.sin(a);
        const r = mode.sculpt === 'neteda' ? smoothDab(H, n, n, cx, cy, 64, 3, tmp) : dab(H, n, n, cx, cy, 64, 0.05);
        gl.pixelStorei(gl.UNPACK_ROW_LENGTH, n); gl.texSubImage2D(gl.TEXTURE_2D, 0, r.i0, r.j0, r.w, r.hgt, gl.RED, gl.FLOAT, H, r.j0 * n + r.i0); gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
      }
      for (let r = 0; r < reps; r++) draw(mode); cpu.push(now() - c0);
      if (++f < frames) requestAnimationFrame(frame);
      else res({ cadre: iv.length, interval_median_ms: med(iv), interval_p95_ms: pct(iv, 0.95), cadre_peste_20ms: iv.filter((x) => x > 20).length, cpu_median_ms: med(cpu), cpu_p95_ms: pct(cpu, 0.95), fps_median: +(1000 / med(iv)).toFixed(1) });
    };
    requestAnimationFrame(frame);
  });
  R.afisare = {};
  const F = QUICK ? 90 : 180;
  for (const [name, mode] of [['repaus_2d', { view: '2d' }], ['2d_pensula_adauga', { view: '2d', sculpt: 'adauga' }], ['2d_pensula_neteda', { view: '2d', sculpt: 'neteda' }],
    ['3d_1000x1000_pensula', { view: '3d', stride: 4, sculpt: 'adauga' }], ['3d_2000x2000_pensula', { view: '3d', stride: 2, sculpt: 'adauga' }], ['3d_4000x4000_pensula', { view: '3d', stride: 1, sculpt: 'adauga' }],
    // rezerva: monitorul de 60 Hz plafoneaza; desenez plasa 4000x4000 (32 M triunghiuri) de k ori pe cadru
    ['3d_4000x4000_x2', { view: '3d', stride: 1, sculpt: 'adauga', reps: 2 }], ['3d_4000x4000_x4', { view: '3d', stride: 1, sculpt: 'adauga', reps: 4 }], ['3d_4000x4000_x8', { view: '3d', stride: 1, sculpt: 'adauga', reps: 8 }],
    ['2d_x32', { view: '2d', sculpt: 'adauga', reps: 32 }]]) {
    R.afisare[name] = await loop(mode, F); log('afisare', name, JSON.stringify(R.afisare[name]));
  }
  // costul pensulei singure pe CPU (fara GPU), mediana pe 200 de aplicari
  { const ts = []; for (let k = 0; k < 200; k++) { t = now(); dab(H, n, n, 1000 + k, 1500, 64, 0.01); ts.push(now() - t); } R.pensula_adauga_r64_cpu_ms = med(ts); }
  { const ts = []; for (let k = 0; k < 200; k++) { t = now(); smoothDab(H, n, n, 1000 + k, 1500, 64, 3, tmp); ts.push(now() - t); } R.pensula_neteda_r64_cpu_ms = med(ts); }
  { const ts = []; for (let k = 0; k < 50; k++) { t = now(); dab(H, n, n, 1000 + k, 1500, 200, 0.01); ts.push(now() - t); } R.pensula_adauga_r200_cpu_ms = med(ts); }
  await post('main', R);
  log('GATA');
  window.__done = true;
}
main().catch(async (e) => { R.eroare = String(e && e.stack || e); log('EROARE', R.eroare); await post('main', R); window.__done = true; });
