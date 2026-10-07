// app.mjs — sonda s6-panza (ARUNCABIL). Pagina de măsură: randatoare, cadre, fidelitate la zoom, clic, regula de umplere.
// ?page=bench&r=c2d|c2dcull|pixi|pixium|ck|gl|glstrip|hybrid&n=..&tp=..&hf=0|1&mode=pan|zoom
// ?page=fid&r=c2d|pixi|pixiarc|pixium|ck|gl01|gl001&zoom=1000&cx=..&cy=..&theta=..
// ?page=click&n=20000   ?page=fill   ?page=info
import { toPath2D, toCK, flattenSeg, shapeDist, inside, segStart, TAU } from './geom.mjs';
import { makeScene, SHEET_W, SHEET_H, mulberry32, circle, glyphShapes, sceneStats } from './scene.mjs';
import { distAnalytic } from './oracle.mjs';
import Flatbush from 'flatbush';
import * as opentype from 'opentype.js';

const Q = new URLSearchParams(location.search);
const CSS_W = 1281, CSS_H = 721;
const stage = document.getElementById('stage');
const logEl = document.getElementById('log');
const log = (s) => { logEl.textContent += s + '\n'; };
const pct = (a, p) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const r3 = (x) => Math.round(x * 1000) / 1000;

async function loadFont() { return opentype.parse(await (await fetch('/font/arial.ttf')).arrayBuffer()); }
function loadScript(src) { return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); }); }
function makeCanvas(z = 0) { const cv = document.createElement('canvas'); cv.style.zIndex = String(z); stage.appendChild(cv); return cv; }
async function sizeCanvas(cv) {
  const dpr = devicePixelRatio, naive = [Math.round(CSS_W * dpr), Math.round(CSS_H * dpr)];
  const exact = await new Promise((ok) => {
    const ro = new ResizeObserver((es) => { const e = es[0]; ro.disconnect(); const b = e.devicePixelContentBoxSize && e.devicePixelContentBoxSize[0]; ok(b ? [b.inlineSize, b.blockSize] : naive); });
    try { ro.observe(cv, { box: 'device-pixel-content-box' }); } catch { ro.observe(cv); }
  });
  cv.width = exact[0]; cv.height = exact[1];
  return { dpr, naive, exact, cssRect: cv.getBoundingClientRect().toJSON() };
}
const fitS = Math.min(CSS_W / SHEET_W, CSS_H / SHEET_H) * 0.95;
const camPan = (i) => ({ cx: SHEET_W / 2 + 300 * Math.sin(i * 0.05), cy: SHEET_H / 2 + 150 * Math.cos(i * 0.037), s: fitS });
const camZoom = (i) => { const u = 0.5 - 0.5 * Math.cos(i * TAU / 120); return { cx: 900, cy: 500, s: fitS * Math.pow(2, 6 * u) }; };
function viewRect(cam, W, H, dpr) { const k = cam.s * dpr; return [cam.cx - W / 2 / k, cam.cy - H / 2 / k, cam.cx + W / 2 / k, cam.cy + H / 2 / k]; }
const hit = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

// ---------------- randatoare ----------------
function rendC2D(cv, shapes, opt = {}) {
  const ctx = cv.getContext('2d', { alpha: !!opt.alpha });
  const t0 = performance.now(); let big = null, buckets = null;
  if (!opt.bucket) { big = new Path2D(); for (const sh of shapes) toPath2D(sh, big); }
  else {
    const GX = 32, GY = 16, m = new Map();
    for (const sh of shapes) {
      const bx = Math.min(GX - 1, Math.max(0, Math.floor((sh.bb[0] + sh.bb[2]) / 2 / SHEET_W * GX))), by = Math.min(GY - 1, Math.max(0, Math.floor((sh.bb[1] + sh.bb[3]) / 2 / SHEET_H * GY)));
      const key = by * GX + bx; let b = m.get(key); if (!b) { b = { path: new Path2D(), bb: [Infinity, Infinity, -Infinity, -Infinity] }; m.set(key, b); }
      toPath2D(sh, b.path); b.bb[0] = Math.min(b.bb[0], sh.bb[0]); b.bb[1] = Math.min(b.bb[1], sh.bb[1]); b.bb[2] = Math.max(b.bb[2], sh.bb[2]); b.bb[3] = Math.max(b.bb[3], sh.bb[3]);
    }
    buckets = [...m.values()];
  }
  const buildMs = performance.now() - t0; let drawn = 0;
  const sel = opt.handles ? shapes.filter((_, i) => i % Math.max(1, Math.floor(shapes.length / 1000)) === 0).slice(0, 1000) : [];
  return {
    buildMs, ctx, get drawn() { return drawn; },
    sync() { ctx.getImageData(0, 0, 1, 1); },
    draw(cam) {
      const W = cv.width, H = cv.height, dpr = devicePixelRatio, k = cam.s * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (opt.alpha) ctx.clearRect(0, 0, W, H); else { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
      ctx.setTransform(k, 0, 0, k, W / 2 - cam.cx * k, H / 2 - cam.cy * k);
      ctx.lineWidth = (opt.lwDev ? 1 / dpr : 1) / cam.s; ctx.strokeStyle = '#1a1a1a';
      if (big) { ctx.stroke(big); drawn = 1; }
      else { const vr = viewRect(cam, W, H, dpr); drawn = 0; for (const b of buckets) if (hit(b.bb, vr)) { ctx.stroke(b.path); drawn++; } }
      if (sel.length) { // mânere de selecție în spațiul ecranului (1000 de forme)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const P = new Path2D(), Hd = new Path2D(), hs = 3;
        for (const sh of sel) {
          const x0 = (sh.bb[0] - cam.cx) * cam.s + CSS_W / 2, y0 = (sh.bb[1] - cam.cy) * cam.s + CSS_H / 2, x1 = (sh.bb[2] - cam.cx) * cam.s + CSS_W / 2, y1 = (sh.bb[3] - cam.cy) * cam.s + CSS_H / 2;
          if (x1 < 0 || y1 < 0 || x0 > CSS_W || y0 > CSS_H) continue;
          P.rect(x0, y0, x1 - x0, y1 - y0);
          for (const [hx, hy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [(x0 + x1) / 2, y0], [(x0 + x1) / 2, y1], [x0, (y0 + y1) / 2], [x1, (y0 + y1) / 2]]) Hd.rect(hx - hs, hy - hs, 2 * hs, 2 * hs);
        }
        ctx.lineWidth = 1; ctx.strokeStyle = '#0a84ff'; ctx.stroke(P); ctx.fillStyle = '#fff'; ctx.fill(Hd); ctx.stroke(Hd);
      }
    },
  };
}

function pixiPath(g, sh, k) {
  for (const sub of sh.subs) {
    const st = segStart(sub.segs[0]); g.moveTo(st[0] * k, st[1] * k);
    for (const s of sub.segs) {
      if (s.t === 'L') g.lineTo(s.x1 * k, s.y1 * k);
      else if (s.t === 'A') g.arc(s.cx * k, s.cy * k, s.r * k, s.a0, s.a0 + s.da, s.da < 0);
      else g.bezierCurveTo(s.x1 * k, s.y1 * k, s.x2 * k, s.y2 * k, s.x3 * k, s.y3 * k);
    }
    if (sub.closed) g.closePath();
  }
}
async function rendPixi(cv, shapes, opt = {}) {
  const PIXI = await import('/node_modules/pixi.js/dist/pixi.mjs');
  const app = new PIXI.Application();
  await app.init({ canvas: cv, width: CSS_W, height: CSS_H, resolution: devicePixelRatio, autoDensity: false, antialias: true, background: 0xffffff, preference: 'webgl', autoStart: false, sharedTicker: false, preserveDrawingBuffer: !!opt.preserve, powerPreference: 'high-performance' });
  app.ticker.stop();
  const k = opt.um ? 1000 : 1, world = new PIXI.Container(); app.stage.addChild(world);
  const t0 = performance.now();
  if (opt.fillShapes) { for (const f of opt.fillShapes) { const g = new PIXI.Graphics(); f(g, k); world.addChild(g); } }
  else for (let i = 0; i < shapes.length; i += 1000) { const g = new PIXI.Graphics(); for (const sh of shapes.slice(i, i + 1000)) pixiPath(g, sh, k); g.stroke({ width: 1, color: 0x1a1a1a, pixelLine: true }); world.addChild(g); }
  const set = (cam) => { world.scale.set(cam.s / k); world.position.set(CSS_W / 2 - cam.cx * cam.s, CSS_H / 2 - cam.cy * cam.s); };
  set({ cx: SHEET_W / 2, cy: SHEET_H / 2, s: fitS }); app.renderer.render(app.stage); // forțează teselarea
  const buildMs = performance.now() - t0;
  const gl = app.renderer.gl, b1 = new Uint8Array(4);
  return { buildMs, app, sync() { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b1); }, draw(cam) { set(cam); app.renderer.render(app.stage); } };
}

let CKp = null;
async function getCK() { if (!CKp) { CKp = loadScript('/node_modules/canvaskit-wasm/bin/canvaskit.js').then(() => window.CanvasKitInit({ locateFile: (f) => '/node_modules/canvaskit-wasm/bin/' + f })); } return CKp; }
async function rendCK(cv, shapes, opt = {}) {
  const CK = await getCK();
  const surface = CK.MakeWebGLCanvasSurface(cv, null, { preserveDrawingBuffer: opt.preserve ? 1 : 0, antialias: 0 });
  const paint = new CK.Paint(); paint.setAntiAlias(true);
  if (opt.fill) { paint.setStyle(CK.PaintStyle.Fill); paint.setColor(CK.Color(0, 0, 0, 1)); } else { paint.setStyle(CK.PaintStyle.Stroke); paint.setColor(CK.Color(26, 26, 26, 1)); }
  const t0 = performance.now(), paths = [];
  const B = () => (CK.PathBuilder ? new CK.PathBuilder() : new CK.Path());
  for (let i = 0; i < shapes.length; i += 1000) { const b = B(); for (const sh of shapes.slice(i, i + 1000)) toCK(sh, b); paths.push(b.detach ? b.detach() : b); }
  const draw = (cam) => {
    const c = surface.getCanvas(), W = cv.width, H = cv.height, k = cam.s * devicePixelRatio;
    c.clear(CK.WHITE); c.save(); c.concat([k, 0, W / 2 - cam.cx * k, 0, k, H / 2 - cam.cy * k, 0, 0, 1]);
    if (!opt.fill) paint.setStrokeWidth(opt.lwDev ? 0 : 1 / cam.s); // 0 = linie-păr Skia (1 px fizic)
    for (const p of paths) c.drawPath(p, paint);
    c.restore(); surface.flush();
  };
  draw({ cx: SHEET_W / 2, cy: SHEET_H / 2, s: fitS });
  const gl = cv.getContext('webgl2'), b1 = new Uint8Array(4);
  return { buildMs: performance.now() - t0, draw, CK, sync() { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b1); } };
}

// ---- WebGL2: trasee (segmente instanțiate sau LINE_STRIP) + câmp de înălțime ----
function compile(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); gl.attachShader(p, s); }
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p;
}
const VS_QUAD = `#version 300 es
layout(location=0) in vec3 a; layout(location=1) in vec3 b;
uniform vec2 uC; uniform float uK; uniform vec2 uPx; uniform float uHW; out float vZ;
void main(){ vec2 pa=(a.xy-uC)*uK, pb=(b.xy-uC)*uK; vec2 d=pb-pa; float L=length(d); vec2 dir=L>1e-6?d/L:vec2(1.0,0.0); vec2 n=vec2(-dir.y,dir.x);
 float t=float(gl_VertexID&1); float side=(gl_VertexID>>1)==1?1.0:-1.0;
 vec2 p=mix(pa,pb,t)+n*side*uHW+dir*(t*2.0-1.0)*uHW; gl_Position=vec4(p*uPx*vec2(1.0,-1.0),0.0,1.0); vZ=mix(a.z,b.z,t); }`;
const VS_STRIP = `#version 300 es
layout(location=0) in vec3 a; uniform vec2 uC; uniform float uK; uniform vec2 uPx; out float vZ;
void main(){ gl_Position=vec4((a.xy-uC)*uK*uPx*vec2(1.0,-1.0),0.0,1.0); vZ=a.z; }`;
const FS_TP = `#version 300 es
precision highp float; in float vZ; out vec4 o;
void main(){ float u=clamp(-vZ/3.0,0.0,1.0); o=vec4(mix(vec3(0.2,0.6,1.0),vec3(0.0,0.1,0.5),u),1.0); }`;
const VS_HF = `#version 300 es
layout(location=0) in vec2 a; uniform vec2 uC; uniform float uK; uniform vec2 uPx; out vec2 vUV;
void main(){ vUV=a/vec2(${SHEET_W}.0,${SHEET_H}.0); gl_Position=vec4((a-uC)*uK*uPx*vec2(1.0,-1.0),0.0,1.0); }`;
const FS_HF = `#version 300 es
precision highp float; precision highp sampler2D; uniform sampler2D uH; in vec2 vUV; out vec4 o;
void main(){ ivec2 sz=textureSize(uH,0); ivec2 p=clamp(ivec2(vUV*vec2(sz)),ivec2(0),sz-1);
 float hl=texelFetch(uH,clamp(p-ivec2(1,0),ivec2(0),sz-1),0).r, hr=texelFetch(uH,clamp(p+ivec2(1,0),ivec2(0),sz-1),0).r;
 float hu=texelFetch(uH,clamp(p-ivec2(0,1),ivec2(0),sz-1),0).r, hd=texelFetch(uH,clamp(p+ivec2(0,1),ivec2(0),sz-1),0).r;
 vec3 n=normalize(vec3((hl-hr)*1.7,(hu-hd)*1.7,1.0)); float l=clamp(dot(n,normalize(vec3(-0.5,-0.6,0.8))),0.0,1.0);
 float h=texelFetch(uH,p,0).r; o=vec4(vec3(0.86,0.72,0.52)*(0.35+0.65*l)*(1.0+h*0.04),1.0); }`;
const FS_FILL = `#version 300 es
precision highp float; out vec4 o; void main(){ o=vec4(0.0,0.0,0.0,1.0); }`;
const VS_FILL = `#version 300 es
layout(location=0) in vec2 a; uniform float uK; uniform vec2 uPx; void main(){ gl_Position=vec4(a*uK*uPx*vec2(1.0,-1.0),0.0,1.0); }`;

function makeToolpath(tp) { // raster în zigzag peste placă: tp segmente, ~1 mm fiecare, cu Z variabil
  const per = 2420, rows = Math.ceil(tp / per), dy = 1200 / rows, pts = new Float32Array((tp + 1) * 3);
  let j = 0;
  for (let i = 0; i <= tp; i++) {
    const r = Math.floor(i / per), u = i - r * per, x = 10 + (r & 1 ? per - u : u) * (2420 / per), y = 10 + r * dy + 0.15 * Math.sin(x * 0.07);
    pts[j++] = x; pts[j++] = y; pts[j++] = -1.5 - 1.4 * Math.sin(x * 0.011) * Math.cos(y * 0.017);
  }
  return pts;
}
function rendGL(cv, opt = {}) {
  const gl = cv.getContext('webgl2', { antialias: true, alpha: !!opt.alpha, premultipliedAlpha: true, preserveDrawingBuffer: !!opt.preserve, powerPreference: 'high-performance' });
  const t0 = performance.now(); const out = { gl };
  let tpProg, tpVao, nPts = 0, hfProg, hfVao, tex, hfData;
  if (opt.tp) {
    const pts = makeToolpath(opt.tp); nPts = pts.length / 3;
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
    tpVao = gl.createVertexArray(); gl.bindVertexArray(tpVao);
    if (opt.mode === 'strip') { tpProg = compile(gl, VS_STRIP, FS_TP); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0); }
    else {
      tpProg = compile(gl, VS_QUAD, FS_TP);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0); gl.vertexAttribDivisor(0, 1);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 12, 12); gl.vertexAttribDivisor(1, 1);
    }
    gl.bindVertexArray(null); out.vboMB = pts.byteLength / 1048576;
  }
  if (opt.hf) {
    const HW = 4096, HH = 2048; hfData = new Float32Array(HW * HH);
    for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) { const g = Math.abs(((x * 37 + y * 11) % 512) - 256) < 6 ? -3 : 0; hfData[y * HW + x] = -1.2 * Math.sin(x * 0.013) * Math.cos(y * 0.021) + g; }
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32F, HW, HH);
    const tu = performance.now(); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, HW, HH, gl.RED, gl.FLOAT, hfData); gl.finish(); out.hfUploadMs = performance.now() - tu;
    hfProg = compile(gl, VS_HF, FS_HF); hfVao = gl.createVertexArray(); gl.bindVertexArray(hfVao);
    const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, SHEET_W, 0, 0, SHEET_H, SHEET_W, SHEET_H]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0); gl.bindVertexArray(null);
    out.tile = new Float32Array(256 * 256);
  }
  let frame = 0;
  out.draw = (cam) => {
    const W = cv.width, H = cv.height, k = cam.s * devicePixelRatio;
    gl.viewport(0, 0, W, H); gl.clearColor(1, 1, 1, opt.alpha ? 0 : 1); gl.clear(gl.COLOR_BUFFER_BIT);
    if (opt.hf) {
      if (opt.hfup) { // simulare în curs: o dală de 256x256 rescrisă la fiecare cadru
        const tx = (frame * 256) % 4096, ty = ((Math.floor(frame * 256 / 4096) * 256) % 2048); out.tile.fill(-2 - (frame % 7) * 0.1);
        gl.bindTexture(gl.TEXTURE_2D, tex); gl.texSubImage2D(gl.TEXTURE_2D, 0, tx, ty, 256, 256, gl.RED, gl.FLOAT, out.tile);
      }
      gl.useProgram(hfProg); gl.bindVertexArray(hfVao); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform2f(gl.getUniformLocation(hfProg, 'uC'), cam.cx, cam.cy); gl.uniform1f(gl.getUniformLocation(hfProg, 'uK'), k); gl.uniform2f(gl.getUniformLocation(hfProg, 'uPx'), 2 / W, 2 / H);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    if (opt.tp) {
      gl.useProgram(tpProg); gl.bindVertexArray(tpVao);
      gl.uniform2f(gl.getUniformLocation(tpProg, 'uC'), cam.cx, cam.cy); gl.uniform1f(gl.getUniformLocation(tpProg, 'uK'), k); gl.uniform2f(gl.getUniformLocation(tpProg, 'uPx'), 2 / W, 2 / H);
      if (opt.mode === 'strip') gl.drawArrays(gl.LINE_STRIP, 0, nPts);
      else { gl.uniform1f(gl.getUniformLocation(tpProg, 'uHW'), 0.6 * devicePixelRatio); for (let r = 0; r < (opt.rep || 1); r++) gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nPts - 1); } // rep = martor de încărcare GPU
    }
    gl.bindVertexArray(null); frame++;
  };
  out.buildMs = performance.now() - t0; const b1 = new Uint8Array(4);
  out.sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b1);
  return out;
}
// Canvas2D cu bitmap de interacțiune: desen exact o dată (linie-păr), apoi la pan/zoom doar drawImage (neclar la zoom
// până la redesen). Varianta 'ib' ține bitmapul ca ImageBitmap (rezident pe GPU) și NU citește înapoi din pânza ascunsă.
async function rendC2DBmp(cv, shapes, opt = {}) {
  const off = new OffscreenCanvas(cv.width, cv.height); const base = rendC2D(off, shapes, { bucket: true, alpha: !!opt.alpha, lwDev: !!opt.ib });
  const cam0 = { cx: SHEET_W / 2, cy: SHEET_H / 2, s: fitS }; const t0 = performance.now(); base.draw(cam0);
  let src = off; if (opt.ib) src = await createImageBitmap(off); else base.sync(); const exactMs = performance.now() - t0;
  const ctx = cv.getContext('2d', { alpha: !!opt.alpha }); const dpr = devicePixelRatio, W = cv.width, H = cv.height;
  return { buildMs: base.buildMs, exactMs, sync() { ctx.getImageData(0, 0, 1, 1); }, draw(cam) {
    const k0 = cam0.s * dpr, k = cam.s * dpr, q = k / k0, tx0 = W / 2 - cam0.cx * k0, ty0 = H / 2 - cam0.cy * k0, tx = W / 2 - cam.cx * k, ty = H / 2 - cam.cy * k;
    ctx.setTransform(1, 0, 0, 1, 0, 0); if (opt.alpha) ctx.clearRect(0, 0, W, H); else { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
    ctx.setTransform(q, 0, 0, q, tx - q * tx0, ty - q * ty0); ctx.drawImage(src, 0, 0);
  } };
}

// ---------------- bucla de cadre ----------------
function runFrames(drawFn, camFn, frames = 120, warm = 20, capMs = 9000) {
  return new Promise((ok) => {
    const iv = [], cpu = []; let i = 0, last = 0, tMeas = 0; const tStart = performance.now();
    const tick = (ts) => {
      const a = performance.now(); drawFn(camFn(i)); const b = performance.now();
      const warming = i < warm && b - tStart < 1500; // încălzire: 20 de cadre sau 1,5 s, ce vine întâi
      if (!warming) { if (!tMeas) tMeas = a; cpu.push(b - a); if (last) iv.push(ts - last); }
      last = ts; i++;
      if (cpu.length < frames && !(tMeas && performance.now() - tMeas > capMs)) requestAnimationFrame(tick); else ok({ iv, cpu });
    };
    requestAnimationFrame(tick);
  });
}
const summ = (a) => ({ n: a.length, med: r3(pct(a, 0.5)), p95: r3(pct(a, 0.95)), max: r3(Math.max(...a)) });

async function gpuInfo() {
  const c = document.createElement('canvas'), gl = c.getContext('webgl2'); const e = gl && gl.getExtension('WEBGL_debug_renderer_info');
  const out = { webgl2: !!gl, renderer: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : null, vendor: e ? gl.getParameter(e.UNMASKED_VENDOR_WEBGL) : null, maxTex: gl && gl.getParameter(gl.MAX_TEXTURE_SIZE), dpr: devicePixelRatio, ua: navigator.userAgent };
  try { const ad = navigator.gpu && await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }); out.webgpu = ad ? { vendor: ad.info.vendor, architecture: ad.info.architecture, device: ad.info.device, description: ad.info.description } : null; } catch (err) { out.webgpu = 'eroare: ' + err; }
  return out;
}

// ---------------- pagina: cadre ----------------
async function pageBench() {
  const r = Q.get('r') || 'c2d', n = +(Q.get('n') || 10000), tp = +(Q.get('tp') || 0), mode = Q.get('mode') || 'pan', frames = +(Q.get('frames') || 120);
  const font = await loadFont(); let t0 = performance.now();
  const shapes = n ? makeScene(n, 7, font) : []; const genMs = performance.now() - t0;
  const res = { r, n, tp, mode, dpr: devicePixelRatio, genMs: Math.round(genMs), scena: n ? sceneStats(shapes) : null };
  const cv = makeCanvas(0); res.canvas = await sizeCanvas(cv);
  let R;
  if (r === 'c2d') R = rendC2D(cv, shapes, { lwDev: Q.get('lw') === 'dev' });
  else if (r === 'c2dcull') R = rendC2D(cv, shapes, { bucket: true, lwDev: Q.get('lw') === 'dev' });
  else if (r === 'c2dbmp') R = await rendC2DBmp(cv, shapes, { ib: Q.get('ib') === '1' });
  else if (r === 'pixi') R = await rendPixi(cv, shapes, {});
  else if (r === 'pixium') R = await rendPixi(cv, shapes, { um: true });
  else if (r === 'ck') R = await rendCK(cv, shapes, { lwDev: Q.get('lw') === 'dev' });
  else if (r === 'gl') R = rendGL(cv, { tp, hf: Q.get('hf') === '1', hfup: Q.get('hfup') === '1', rep: +(Q.get('rep') || 1) });
  else if (r === 'glstrip') R = rendGL(cv, { tp, mode: 'strip', hf: Q.get('hf') === '1' });
  else if (r === 'hybrid') {
    const glR = rendGL(cv, { tp, mode: Q.get('strip') === '1' ? 'strip' : undefined, hf: Q.get('hf') === '1', hfup: Q.get('hfup') === '1' }); // v3: strip=1 -> traseele ca LINE_STRIP
    const cv2 = makeCanvas(1); await sizeCanvas(cv2);
    const c2 = Q.get('bmp') === '1' ? await rendC2DBmp(cv2, shapes, { alpha: true, ib: Q.get('ib') === '1' }) : rendC2D(cv2, shapes, { bucket: true, alpha: true, handles: true, lwDev: Q.get('lw') === 'dev' });
    R = { buildMs: glR.buildMs + c2.buildMs, hfUploadMs: glR.hfUploadMs, vboMB: glR.vboMB, draw(cam) { glR.draw(cam); c2.draw(cam); }, sync() { glR.sync(); c2.sync(); } };
  }
  res.lw = Q.get('lw') || 'css'; res.buildMs = Math.round(R.buildMs); if (R.hfUploadMs) res.hfUploadMs = r3(R.hfUploadMs); if (R.vboMB) res.vboMB = r3(R.vboMB);
  const sync = Q.get('sync') !== '0'; res.sync = sync; if (R.exactMs) res.exactMs = r3(R.exactMs);
  if (window.__mark) await window.__mark('start'); // v3: timpul de procesor pe tip de proces, citit din Node prin CDP
  const fr = await runFrames(sync ? (c) => { R.draw(c); R.sync(); } : (c) => R.draw(c), mode === 'zoom' ? camZoom : camPan, frames);
  if (window.__mark) await window.__mark('end');
  res.interval_ms = summ(fr.iv); res.cadru_ms = summ(fr.cpu); res.cadre_peste_16_7ms = fr.cpu.filter((x) => x > 16.7).length;
  if (performance.memory) res.heapMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
  return res;
}

// ---------------- pagina: fidelitate la zoom (cerc R=50 mm, plin) ----------------
async function pageFid() {
  const r = Q.get('r') || 'c2d', Z = +(Q.get('zoom') || 1000), Cx = +(Q.get('cx') || 150), Cy = +(Q.get('cy') || 150), th = (Q.has('theta') ? +Q.get('theta') : 37) * Math.PI / 180, R = 50;
  const cam = { cx: Cx + R * Math.cos(th), cy: Cy + R * Math.sin(th), s: Z };
  const cv = makeCanvas(0); const sz = await sizeCanvas(cv); let W = cv.width, H = cv.height; const dpr = devicePixelRatio, k = Z * dpr;
  const sh = circle(Cx, Cy, R); let nVert = 0; // 0 = exact (fără poligon)
  if (r === 'c2d') {
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(k, 0, 0, k, W / 2 - cam.cx * k, H / 2 - cam.cy * k); ctx.fillStyle = '#000'; ctx.fill(toPath2D(sh, new Path2D()));
  } else if (r === 'c2dsw') { // v3: aceeași cale, dar pânza SOFTWARE (willReadFrequently): rasterul Skia pe procesor
    const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(k, 0, 0, k, W / 2 - cam.cx * k, H / 2 - cam.cy * k); ctx.fillStyle = '#000'; ctx.fill(toPath2D(sh, new Path2D()));
  } else if (r === 'c2drtc') { // v3: coordonatele căii relative la centrul vederii (scăderea în double), translația pânzei mică
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(k, 0, 0, k, W / 2, H / 2); ctx.fillStyle = '#000'; ctx.fill(toPath2D(circle(Cx - cam.cx, Cy - cam.cy, R), new Path2D()));
  } else if (r === 'pixi' || r === 'pixiarc' || r === 'pixium') {
    const um = r === 'pixium', kk = um ? 1000 : 1;
    const P = await rendPixi(cv, [], { preserve: true, um, fillShapes: [(g, q) => { if (r === 'pixiarc') { g.moveTo((Cx + R) * q, Cy * q); g.arc(Cx * q, Cy * q, R * q, 0, TAU, false); g.closePath(); } else g.circle(Cx * q, Cy * q, R * q); g.fill({ color: 0x000000 }); }] });
    P.draw(cam);
    nVert = r === 'pixiarc' ? Math.max(6, Math.floor(6 * Math.cbrt(R * kk) * 2)) : 4 * Math.ceil(2.3 * Math.sqrt(2 * R * kk));
  } else if (r === 'ck') {
    const C = await rendCK(cv, [sh], { preserve: true, fill: true }); C.draw(cam);
  } else if (r === 'gl01' || r === 'gl001') {
    const tol = r === 'gl01' ? 0.01 : 0.001, pts = []; flattenSeg(sh.subs[0].segs[0], tol, pts); nVert = pts.length / 2;
    const gl = cv.getContext('webgl2', { antialias: true, preserveDrawingBuffer: true }); const prog = compile(gl, VS_FILL, FS_FILL);
    const rel = new Float32Array(2 + pts.length + 2); rel[0] = Cx - cam.cx; rel[1] = Cy - cam.cy; // relativ la centrul vederii, calculat în double (RTC)
    for (let i = 0; i < pts.length; i++) rel[2 + i] = pts[i] - (i % 2 ? cam.cy : cam.cx); rel[2 + pts.length] = pts[0] - cam.cx; rel[3 + pts.length] = pts[1] - cam.cy;
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, rel, gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.viewport(0, 0, W, H); gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(prog);
    gl.uniform1f(gl.getUniformLocation(prog, 'uK'), k); gl.uniform2f(gl.getUniformLocation(prog, 'uPx'), 2 / W, 2 / H); gl.drawArrays(gl.TRIANGLE_FAN, 0, rel.length / 2);
  }
  await new Promise((ok) => requestAnimationFrame(() => ok()));
  const Wr = W, Hr = H; W = cv.width; H = cv.height; const pixiShift = (W !== Wr || H !== Hr) ? [W, H] : null; void pixiShift;
  const oc = new OffscreenCanvas(W, H).getContext('2d', { willReadFrequently: true }); oc.drawImage(cv, 0, 0); const px = oc.getImageData(0, 0, W, H).data;
  // detecția muchiei la 50 % acoperire, pe linii aproape perpendiculare pe muchie
  const rows = Math.abs(Math.cos(th)) >= Math.abs(Math.sin(th)); const dev = [], resid = [];
  const cov = (x, y) => 1 - px[(y * W + x) * 4] / 255;
  const polyDev = (phi) => { if (!nVert) return 0; const st = TAU / nVert; let q = ((phi % TAU) + TAU) % TAU; const kk = Math.floor(q / st); const mid = (kk + 0.5) * st; return (R * Math.cos(st / 2) / Math.cos(q - mid) - R); };
  const L1 = rows ? H : W, L2 = rows ? W : H;
  for (let a = 0; a < L1; a += 2) {
    const cr = [];
    for (let b = 0; b + 1 < L2; b++) { const c0 = rows ? cov(b, a) : cov(a, b), c1 = rows ? cov(b + 1, a) : cov(a, b + 1); if ((c0 - 0.5) * (c1 - 0.5) < 0) cr.push(b + 0.5 + (0.5 - c0) / (c1 - c0)); }
    if (cr.length !== 1) continue;
    const xd = rows ? cr[0] : a + 0.5, yd = rows ? a + 0.5 : cr[0];
    const wx = cam.cx + (xd - W / 2) / k, wy = cam.cy + (yd - H / 2) / k; // mm (double)
    const d = (Math.hypot(wx - Cx, wy - Cy) - R) * k; dev.push(d);
    resid.push(d - polyDev(Math.atan2(wy - Cy, wx - Cx)) * k);
  }
  const absd = dev.map(Math.abs), absr = resid.map(Math.abs);
  const iw = absd.indexOf(Math.max(...absd)); // v3: câte puncte trec de 0,1 px și unde e cel mai rău
  const v3extra = { n_peste_0_1px: absd.filter((x) => x > 0.1).length, n_peste_0_25px: absd.filter((x) => x > 0.25).length, cel_mai_rau_index: iw, cel_mai_rau_din: absd.length };
  return { ...v3extra, r, zoom_px_per_mm: Z, centru_mm: [Cx, Cy], theta_grade: Q.has('theta') ? +Q.get('theta') : 37, dpr, canvas: sz.exact, puncte: dev.length, nVarfuri: nVert || 'exact',
    abatere_max_px: r3(Math.max(...absd)), abatere_p95_px: r3(pct(absd, 0.95)), abatere_medie_px: r3(dev.reduce((s, x) => s + x, 0) / dev.length),
    prezis_max_px: nVert ? r3(Math.max(...dev.map((d, i) => Math.abs(d - resid[i])))) : 0, rezidual_fata_de_prezis_max_px: r3(Math.max(...absr)) };
}

// ---------------- pagina: clic (Pointer Events) pe 20 k forme ----------------
async function pageClick() {
  const n = +(Q.get('n') || 20000), font = await loadFont(); const shapes = makeScene(n, 7, font); const probes = shapes.filter((s) => s.an);
  const cv = makeCanvas(0); const sz = await sizeCanvas(cv); const R = rendC2D(cv, shapes, { bucket: true });
  const cam = { cx: 545, cy: 1290, s: 1.25 }; R.draw(cam);
  const fb = new Flatbush(shapes.length, 16); for (const s of shapes) fb.add(s.bb[0], s.bb[1], s.bb[2], s.bb[3]); fb.finish();
  const TOLPX = 5, events = [];
  cv.addEventListener('pointerdown', (e) => {
    const t0 = performance.now(); const rc = cv.getBoundingClientRect();
    const xCss = e.clientX - rc.left, yCss = e.clientY - rc.top, wx = cam.cx + (xCss - rc.width / 2) / cam.s, wy = cam.cy + (yCss - rc.height / 2) / cam.s, tol = TOLPX / cam.s;
    let best = -1, bd = tol;
    for (const id of fb.search(wx - tol, wy - tol, wx + tol, wy + tol)) { const d = shapeDist(shapes[id], wx, wy, bd + 1e-9); if (d < bd - 1e-9 || (Math.abs(d - bd) <= 1e-9 && id > best)) { bd = Math.min(bd, d); best = id; } }
    const t1 = performance.now();
    events.push({ clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType, wx, wy, id: best, d: best >= 0 ? bd : null, hitMs: t1 - t0, dispatchToHandledMs: t1 - e.timeStamp });
  });
  // ținte: puncte cu răspuns analitic (oracle.mjs), în coordonate de pagină CSS
  const rc = cv.getBoundingClientRect(); const rnd = mulberry32(5); const targets = [];
  const toPage = (wx, wy) => [rc.left + rc.width / 2 + (wx - cam.cx) * cam.s, rc.top + rc.height / 2 + (wy - cam.cy) * cam.s];
  const tol = TOLPX / cam.s;
  for (let i = 0; i < 120; i++) {
    const p = probes[i % probes.length]; const wx0 = p.bb[0] - 2 + rnd() * (p.bb[2] - p.bb[0] + 4), wy0 = p.bb[1] - 2 + rnd() * (p.bb[3] - p.bb[1] + 4);
    const [x, y] = toPage(wx0, wy0); const wx = cam.cx + (x - rc.left - rc.width / 2) / cam.s, wy = cam.cy + (y - rc.top - rc.height / 2) / cam.s;
    let want = -1, wd = tol; for (const q of probes) { const d = distAnalytic(q.an, wx, wy); if (d < wd - 1e-9 || (Math.abs(d - wd) <= 1e-9 && q.id > want)) { wd = Math.min(wd, d); want = q.id; } }
    targets.push({ x, y, wx, wy, want, wd: want >= 0 ? wd : null });
  }
  window.__events = events;
  return { n: shapes.length, dpr: devicePixelRatio, canvas: sz, viewport: [innerWidth, innerHeight], cam_s: cam.s, targets };
}

// ---------------- pagina: regula de umplere — ecran vs nucleu vs isPointInPath ----------------
async function pageFill() {
  const font = await loadFont(); const sh = [];
  const D = (cx, cy, R, r, same) => ({ kind: same ? 'gogoasa-aceeasi-orientare' : 'gogoasa-orientari-opuse', subs: [circle(cx, cy, R).subs[0], circle(cx, cy, r, !same).subs[0]] });
  sh.push(D(60, 60, 50, 25, true), D(180, 60, 50, 25, false));
  { const segs = [], P = []; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; P.push([300 + 50 * Math.cos(a), 60 + 50 * Math.sin(a)]); }
    for (let i = 0; i < 5; i++) segs.push({ t: 'L', x0: P[i][0], y0: P[i][1], x1: P[(i + 1) % 5][0], y1: P[(i + 1) % 5][1] }); sh.push({ kind: 'pentagrama', subs: [{ segs, closed: true }] }); }
  sh.push({ kind: 'doua-cercuri-suprapuse', subs: [circle(400, 60, 40).subs[0], circle(440, 60, 40).subs[0]] });
  for (const g of glyphShapes(font, 'B8O@', 20, 230, 100)) { g.kind = 'glifa'; sh.push(g); }
  for (const s of sh) { s.bb = [Infinity, Infinity, -Infinity, -Infinity]; for (const sub of s.subs) for (const g of sub.segs) { const t = []; flattenSeg(g, 0.01, t); for (let i = 0; i < t.length; i += 2) { s.bb[0] = Math.min(s.bb[0], t[i]); s.bb[1] = Math.min(s.bb[1], t[i + 1]); s.bb[2] = Math.max(s.bb[2], t[i]); s.bb[3] = Math.max(s.bb[3], t[i + 1]); } } }
  const cam = { cx: 250, cy: 140, s: 2.2 }; const out = { dpr: devicePixelRatio, reguli: {} };
  for (const rule of ['nonzero', 'evenodd']) {
    const cv = makeCanvas(0); await sizeCanvas(cv); const W = cv.width, H = cv.height, k = cam.s * devicePixelRatio;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.setTransform(k, 0, 0, k, W / 2 - cam.cx * k, H / 2 - cam.cy * k); ctx.fillStyle = '#000';
    const paths = sh.map((s) => toPath2D(s, new Path2D())); for (const p of paths) ctx.fill(p, rule);
    const px = ctx.getImageData(0, 0, W, H).data; const rnd = mulberry32(rule === 'nonzero' ? 11 : 12);
    const st = { puncte: 0, ecran_vs_nucleu: 0, ecran_vs_isPointInPath: 0, nucleu_vs_isPointInPath: 0, pe_forma: {} };
    for (let i = 0; i < 6000; i++) {
      const j = i % sh.length, s = sh[j]; const wx = s.bb[0] + rnd() * (s.bb[2] - s.bb[0]), wy = s.bb[1] + rnd() * (s.bb[3] - s.bb[1]);
      if (shapeDist(s, wx, wy) * k < 1.5) continue; // prea aproape de contur: pixel de margine
      const X = W / 2 + (wx - cam.cx) * k, Y = H / 2 + (wy - cam.cy) * k; const xi = Math.floor(X), yi = Math.floor(Y);
      const scr = px[(yi * W + xi) * 4] < 128, ker = inside(s, wx, wy, rule), ipp = ctx.isPointInPath(paths[j], xi + 0.5, yi + 0.5, rule);
      st.puncte++; if (scr !== ker) st.ecran_vs_nucleu++; if (scr !== ipp) st.ecran_vs_isPointInPath++; if (ker !== ipp) st.nucleu_vs_isPointInPath++;
      const f = st.pe_forma[s.kind] = st.pe_forma[s.kind] || { n: 0, pline: 0 }; f.n++; if (ker) f.pline++;
    }
    out.reguli[rule] = st; cv.remove();
  }
  // diferența dintre reguli, pe nucleu (aceleași puncte pentru ambele)
  return out;
}

// ---------------- v3-panza-igpu: adăugiri ----------------
// Calibrarea procesorului: o buclă fixă de aritmetică; la încetinirea CDP de k ori trebuie să dureze ~k ori mai mult.
export function calib(n = 4e6) { const t0 = performance.now(); let a = 0.5; for (let i = 0; i < n; i++) a = (a * 1.0000001 + 0.3) % 7.13; const t = performance.now() - t0; if (a === 42) console.log(a); return t; }
// Adaptorul folosit de pagină (verificat la FIECARE rulare, nu o dată pe browser).
function rendererNow() { const c = document.createElement('canvas'), g = c.getContext('webgl2'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : null; }
// Martor de instrument: getImageData mută pânza Canvas2D de pe GPU pe procesor? Operația-test (blur mare) e ieftină pe GPU și
// scumpă pe procesor. Pânza A: blur + citire de 1 px, de 12 ori. Pânza B (martor): willReadFrequently (procesor din start).
async function pageDeaccel() {
  const out = { dpr: devicePixelRatio };
  const src = new OffscreenCanvas(512, 512), sc = src.getContext('2d'); for (let i = 0; i < 40; i++) { sc.fillStyle = `hsl(${i * 37},70%,50%)`; sc.fillRect((i * 53) % 480, (i * 97) % 480, 60, 60); }
  for (const [name, opts] of [['implicit', {}], ['willReadFrequently', { willReadFrequently: true }]]) {
    const cv = makeCanvas(0); await sizeCanvas(cv); const ctx = cv.getContext('2d', opts); const W = cv.width, H = cv.height, t = [];
    for (let i = 0; i < 12; i++) {
      const a = performance.now(); ctx.filter = 'blur(24px)'; for (let j = 0; j < 4; j++) ctx.drawImage(src, (j * 300) % W, 0, W / 2, H); ctx.filter = 'none';
      ctx.getImageData(0, 0, 1, 1); t.push(r3(performance.now() - a));
    }
    // operația care desparte clar GPU de procesor: 40 de umpleri pe toată pânza, cu gradient radial și transparență
    const t2 = [];
    for (let i = 0; i < 12; i++) {
      const a = performance.now();
      for (let j = 0; j < 40; j++) { const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2 + j, H / 2, W / 1.5); g.addColorStop(0, `rgba(${j * 6},80,160,0.06)`); g.addColorStop(1, 'rgba(250,200,40,0.04)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      ctx.getImageData(0, 0, 1, 1); t2.push(r3(performance.now() - a));
    }
    out[name] = t; out[name + '_umpleri'] = t2; cv.remove();
  }
  return out;
}
async function pageBenchV3() { const c = calib(); const r = await pageBench(); r.calib_ms = r3(c); r.gl_renderer = rendererNow(); return r; }
async function pageFidV3() { const r = await pageFid(); r.gl_renderer = rendererNow(); return r; }
async function pageClickV3() { const c = calib(); const r = await pageClick(); r.calib_ms = r3(c); r.gl_renderer = rendererNow(); return r; }

const pages = { bench: pageBenchV3, fid: pageFidV3, click: pageClickV3, fill: pageFill, info: gpuInfo, deaccel: pageDeaccel };
window.__result = (pages[Q.get('page') || 'info'])().then((r) => { log('gata'); return r; }, (e) => { log('EROARE ' + e.stack); return { eroare: String(e && e.stack || e) }; });
