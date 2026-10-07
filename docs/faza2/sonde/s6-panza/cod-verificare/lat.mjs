// lat.mjs — v3-panza-igpu (ARUNCABIL). Latența intrării (mouse real prin CDP -> Pointer Events) în timp ce stratul de vectori
// se redesenează exact, la 50 k forme vizibile: pe firul principal vs în worker (OffscreenCanvas).
// ?mode=idle|busy|main|worker|workerbmp&n=50000&busyMs=100
//   idle = martor negativ (nimic nu rulează); busy = martor pozitiv (bucle JS de busyMs pe firul principal, una după alta);
//   main = redesen exact pe firul principal, cadru după cadru; worker = transferControlToOffscreen; workerbmp = ImageBitmap transferat.
import * as opentype from 'opentype.js';
import Flatbush from 'flatbush';
import { makeScene } from './scene.mjs';
import { shapeDist } from './geom.mjs';
import { CSS_W, CSS_H, buildBuckets, drawExact, drawSlice, camAt, calib, summ } from './render-core.mjs';

const Q = new URLSearchParams(location.search);
const MODE = Q.get('mode') || 'main', N = +(Q.get('n') || 50000), BUSY = +(Q.get('busyMs') || 100), SEG = +(Q.get('seg') || 25000);
const stage = document.getElementById('stage'), logEl = document.getElementById('log');
const now = () => performance.timeOrigin + performance.now();
function makeCanvas(z) { const cv = document.createElement('canvas'); cv.style.zIndex = String(z); stage.appendChild(cv); return cv; }
async function sizeCanvas(cv) {
  return new Promise((ok) => { const ro = new ResizeObserver((es) => { const b = es[0].devicePixelContentBoxSize && es[0].devicePixelContentBoxSize[0]; ro.disconnect(); cv.width = b ? b.inlineSize : Math.round(CSS_W * devicePixelRatio); cv.height = b ? b.blockSize : Math.round(CSS_H * devicePixelRatio); ok(); }); ro.observe(cv, { box: 'device-pixel-content-box' }); });
}
function rendererNow() { const g = document.createElement('canvas').getContext('webgl2'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : null; }

async function setup() {
  const res = { mode: MODE, n: N, dpr: devicePixelRatio, gl_renderer: rendererNow(), calib_main_ms: calib() };
  const font = opentype.parse(await (await fetch('/font/arial.ttf')).arrayBuffer());
  const shapes = makeScene(N, 7, font); // pentru hit-test (pe firul principal, în toate modurile)
  const fb = new Flatbush(shapes.length, 16); for (const s of shapes) fb.add(s.bb[0], s.bb[1], s.bb[2], s.bb[3]); fb.finish();
  const vec = makeCanvas(0); await sizeCanvas(vec); const top = makeCanvas(1); await sizeCanvas(top);
  const tctx = top.getContext('2d'); const W = vec.width, H = vec.height, dpr = devicePixelRatio;
  let vctx = null, buckets = null, worker = null, bmpCtx = null; const wmsg = [];
  let back = null, bctx = null;
  if (MODE === 'main' || MODE === 'mainsw' || MODE === 'slices') { vctx = vec.getContext('2d', { alpha: false, willReadFrequently: MODE === 'mainsw' }); const t = performance.now(); buckets = buildBuckets(shapes); res.buildMs = performance.now() - t; drawExact(vctx, buckets, camAt(0), W, H, dpr); }
  if (MODE === 'slices') { back = new OffscreenCanvas(W, H); bctx = back.getContext('2d', { alpha: false }); res.segBudget = SEG; }
  else if (MODE === 'worker' || MODE === 'workerbmp' || MODE === 'workersw') {
    worker = new Worker('./lat-worker.mjs', { type: 'module' });
    const ready = new Promise((ok) => { worker.addEventListener('message', function f(e) { if (e.data.cmd === 'ready') { worker.removeEventListener('message', f); ok(e.data); } }); });
    if (MODE === 'worker') { const off = vec.transferControlToOffscreen(); worker.postMessage({ cmd: 'init', mode: 'tc', n: N, dpr, canvas: off }, [off]); }
    else { bmpCtx = vec.getContext('bitmaprenderer'); worker.postMessage({ cmd: 'init', mode: MODE === 'workersw' ? 'ibsw' : 'ib', n: N, dpr, W, H }); }
    res.worker_init = await ready;
    if (MODE === 'workerbmp' || MODE === 'workersw') worker.addEventListener('message', (e) => { // afișarea bitmapului primit + confirmare la cadrul următor
      if (e.data.cmd !== 'frame') return; const tRecv = now(); const a = performance.now(); bmpCtx.transferFromImageBitmap(e.data.bmp); const b = performance.now();
      requestAnimationFrame(() => { wmsg.push({ msg_ms: tRecv - e.data.tPost, tfib_ms: b - a, to_raf_ms: now() - e.data.tPost }); worker.postMessage({ cmd: 'ack' }); });
    });
  }
  // ----- răspunsul la intrare: hit-test pe 50 k + marcaj pe stratul de interacțiune -----
  const evs = [], moves = []; let px = 0, py = 0;
  const toWorld = (e) => { const rc = top.getBoundingClientRect(), cam = camAt(0); return [cam.cx + (e.clientX - rc.left - rc.width / 2) / cam.s, cam.cy + (e.clientY - rc.top - rc.height / 2) / cam.s, cam.s]; };
  top.addEventListener('pointerdown', (e) => {
    const t0 = performance.now(); const [wx, wy, s] = toWorld(e), tol = 5 / s; let best = -1, bd = tol;
    for (const id of fb.search(wx - tol, wy - tol, wx + tol, wy + tol)) { const d = shapeDist(shapes[id], wx, wy, bd + 1e-9); if (d < bd) { bd = d; best = id; } }
    tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, W, H); tctx.strokeStyle = best >= 0 ? '#e33' : '#33e'; tctx.lineWidth = 2;
    tctx.beginPath(); tctx.arc((e.clientX - top.getBoundingClientRect().left) * dpr, (e.clientY - top.getBoundingClientRect().top) * dpr, 12 * dpr, 0, 6.2832); tctx.stroke();
    const t1 = performance.now(); const rec = { ts: e.timeStamp, delay: t0 - e.timeStamp, handler: t1 - t0, hit: best };
    requestAnimationFrame(() => { rec.to_raf = performance.now() - e.timeStamp; }); evs.push(rec);
  });
  top.addEventListener('pointermove', (e) => { const t0 = performance.now(); px = e.clientX; py = e.clientY; moves.push(t0 - e.timeStamp); });
  const et = []; new PerformanceObserver((l) => { for (const x of l.getEntries()) if (x.name === 'pointerdown') et.push({ start: x.startTime, delay: x.processingStart - x.startTime, duration: x.duration }); }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  const longT = []; try { new PerformanceObserver((l) => { for (const x of l.getEntries()) longT.push(x.duration); }).observe({ type: 'longtask', buffered: false }); } catch { /* fără longtask */ }
  void px; void py;

  window.__startStorm = async (durMs) => {
    evs.length = 0; moves.length = 0; et.length = 0; longT.length = 0; wmsg.length = 0;
    const t0 = performance.now(); const out = {};
    if (MODE === 'main' || MODE === 'mainsw') {
      const rec = [], iv = []; let i = 1, last = 0;
      await new Promise((ok) => { const tick = (ts) => { if (last) iv.push(ts - last); last = ts; const a = performance.now(); drawExact(vctx, buckets, camAt(i++), W, H, dpr); rec.push(performance.now() - a); if (performance.now() - t0 < durMs) requestAnimationFrame(tick); else ok(); }; requestAnimationFrame(tick); });
      Object.assign(out, { frames: rec.length, rec_ms: summ(rec), interval_ms: summ(iv) });
    } else if (MODE === 'slices') { // felii de ~SEG segmente pe cadru în tamponul din spate; la final, o copie pe pânza vizibilă
      const rec = [], iv = [], full = []; let i = 1, last = 0, st = { next: 0 }, tStart = performance.now();
      await new Promise((ok) => { const tick = (ts) => {
        if (last) iv.push(ts - last); last = ts; const a = performance.now();
        if (drawSlice(bctx, buckets, camAt(i), W, H, dpr, st, SEG)) { vctx.drawImage(back, 0, 0); full.push(performance.now() - tStart); tStart = performance.now(); st = { next: 0 }; i++; }
        rec.push(performance.now() - a); if (performance.now() - t0 < durMs) requestAnimationFrame(tick); else ok(); };
      requestAnimationFrame(tick); });
      Object.assign(out, { frames: rec.length, rec_ms: summ(rec), interval_ms: summ(iv), redesen_complet_ms: summ(full), redesene_complete: full.length });
    } else if (worker) {
      const done = new Promise((ok) => { worker.addEventListener('message', function f(e) { if (e.data.cmd === 'stormDone') { worker.removeEventListener('message', f); ok(e.data); } }); });
      worker.postMessage({ cmd: 'storm', durMs }); Object.assign(out, await done);
      if (MODE === 'workerbmp' || MODE === 'workersw') out.transfer = { msg_ms: summ(wmsg.map((x) => x.msg_ms)), tfib_ms: summ(wmsg.map((x) => x.tfib_ms)), post_to_raf_ms: summ(wmsg.map((x) => x.to_raf_ms)) };
    } else if (MODE === 'busy') {
      await new Promise((ok) => { const step = () => { const a = performance.now(); while (performance.now() - a < BUSY) { /* martor pozitiv */ } if (performance.now() - t0 < durMs) setTimeout(step, 0); else ok(); }; setTimeout(step, 0); });
    } else { await new Promise((ok) => setTimeout(ok, durMs)); }
    await new Promise((ok) => setTimeout(ok, 300)); // ultimele rAF / intrări Event Timing
    out.pointerdown = { n: evs.length, delay_ms: summ(evs.map((x) => x.delay)), handler_ms: summ(evs.map((x) => x.handler)), to_raf_ms: summ(evs.filter((x) => x.to_raf != null).map((x) => x.to_raf)), hit_ok: evs.filter((x) => x.hit >= -1).length };
    out.event_timing = { n_peste_16ms: et.length, din_total: evs.length, delay_ms: summ(et.map((x) => x.delay)), duration_ms: summ(et.map((x) => x.duration)) };
    out.pointermove_delay_ms = summ(moves); out.longtask = { n: longT.length, total_ms: Math.round(longT.reduce((s, x) => s + x, 0)), max_ms: Math.round(Math.max(0, ...longT)) };
    out.durata_ms = Math.round(performance.now() - t0); out.calib_main_dupa_ms = calib();
    return out;
  };
  return res;
}
window.__ready = setup().then((r) => { logEl.textContent = 'gata ' + MODE; return r; }, (e) => ({ eroare: String(e && e.stack || e) }));
