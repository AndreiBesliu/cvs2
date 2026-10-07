// lat-worker.mjs — v3-panza-igpu (ARUNCABIL). Redesenul exact în worker, cu OffscreenCanvas.
// Moduri: 'tc' = pânza primită prin transferControlToOffscreen (worker-ul desenează direct pe ecran);
//         'ib' = pânză proprie în worker -> transferToImageBitmap -> postMessage (transfer) -> firul principal o afișează.
import * as opentype from '/node_modules/opentype.js/dist/opentype.mjs';
import { makeScene } from './scene.mjs';
import { buildBuckets, drawExact, camAt, calib, summ } from './render-core.mjs';

let buckets = null, ctx = null, cv = null, mode = null, dpr = 1, ackResolve = null;
const now = () => performance.timeOrigin + performance.now(); // ceas comun cu firul principal

self.onmessage = async (ev) => {
  const m = ev.data;
  if (m.cmd === 'init') {
    mode = m.mode; dpr = m.dpr; const c0 = calib();
    const font = opentype.parse(await (await fetch('/font/arial.ttf')).arrayBuffer());
    const t0 = performance.now(); const shapes = makeScene(m.n, 7, font); const genMs = performance.now() - t0;
    const t1 = performance.now(); buckets = buildBuckets(shapes); const buildMs = performance.now() - t1;
    cv = mode === 'tc' ? m.canvas : new OffscreenCanvas(m.W, m.H); ctx = cv.getContext('2d', { alpha: false, willReadFrequently: mode === 'ibsw' }); // ibsw = pânză SOFTWARE (procesorul worker-ului), nu procesul GPU
    drawExact(ctx, buckets, camAt(0), cv.width, cv.height, dpr); // primul desen (încălzire)
    self.postMessage({ cmd: 'ready', calib_ms: c0, genMs, buildMs, shapes: shapes.length, W: cv.width, H: cv.height });
  } else if (m.cmd === 'calib') {
    self.postMessage({ cmd: 'calib', calib_ms: calib() });
  } else if (m.cmd === 'ack') { if (ackResolve) { const r = ackResolve; ackResolve = null; r(); } }
  else if (m.cmd === 'storm') {
    const t0 = performance.now(), rec = [], iv = [], tib = []; let i = 1, last = 0;
    if (mode === 'tc') {
      await new Promise((ok) => {
        const tick = (ts) => {
          if (last) iv.push(ts - last); last = ts;
          const a = performance.now(); drawExact(ctx, buckets, camAt(i++), cv.width, cv.height, dpr); rec.push(performance.now() - a);
          if (performance.now() - t0 < m.durMs) self.requestAnimationFrame(tick); else ok();
        };
        self.requestAnimationFrame(tick);
      });
    } else { // ib: desen -> ImageBitmap -> transfer; următorul desen după confirmarea afișării (presiune inversă)
      while (performance.now() - t0 < m.durMs) {
        const a = performance.now(); drawExact(ctx, buckets, camAt(i++), cv.width, cv.height, dpr); const b = performance.now();
        const bmp = cv.transferToImageBitmap(); const c = performance.now(); rec.push(b - a); tib.push(c - b);
        const acked = new Promise((ok) => { ackResolve = ok; });
        self.postMessage({ cmd: 'frame', bmp, tPost: now(), i }, [bmp]);
        await acked; const t = performance.now(); if (last) iv.push(t - last); last = t;
      }
    }
    self.postMessage({ cmd: 'stormDone', frames: rec.length, rec_ms: summ(rec), interval_ms: summ(iv), tib_ms: summ(tib), calib_ms: calib() });
  }
};
