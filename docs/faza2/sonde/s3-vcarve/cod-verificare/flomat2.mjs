// C3: flo-mat pe dreptunghiul rotunjit 30x16 r4, cu TREI conversii ale arcelor (a sondei: cubice de 30 grd; o cubica pe
// sfert; patratice de 15 grd), in 8 pozitii. Fiecare caz intr-un worker cu limita de 8 s (agatare = esec).
import { Worker } from 'node:worker_threads';
const LIMIT = 8000;
const workerSrc = `import { parentPort, workerData } from 'node:worker_threads';
const FM = await import(${JSON.stringify(new URL('./node_modules/flo-mat/browser/index.js', import.meta.url).href)});
const t = performance.now(); try { const m = FM.findMats(workerData, { applySat: false, simplify: false }); parentPort.postMessage({ ok: true, ms: performance.now() - t }); }
catch (e) { parentPort.postMessage({ ok: false, err: String(e.message).slice(0, 60) }); }`;
const run = (loops) => new Promise((res) => { const w = new Worker(workerSrc, { eval: true, workerData: loops, type: 'module' }); const to = setTimeout(() => { w.terminate(); res({ ok: false, hang: true }); }, LIMIT); w.on('message', (m) => { clearTimeout(to); w.terminate(); res(m); }); w.on('error', (e) => { clearTimeout(to); res({ ok: false, err: String(e.message).slice(0, 60) }); }); });
const P = Math.PI;
function rr(x, y, w, h, rc, mode) {
  const arcs = [[x + w - rc, y + rc, -P / 2, 0], [x + w - rc, y + h - rc, 0, P / 2], [x + rc, y + h - rc, P / 2, P], [x + rc, y + rc, P, 3 * P / 2]];
  const lines = [[[x + rc, y], [x + w - rc, y]], [[x + w, y + rc], [x + w, y + h - rc]], [[x + w - rc, y + h], [x + rc, y + h]], [[x, y + h - rc], [x, y + rc]]];
  const arc = ([cx, cy, a0, a1]) => { const out = []; const n = mode === 'cub30' ? 3 : mode === 'cub90' ? 1 : 6; for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n, b = a0 + (a1 - a0) * (i + 1) / n; const p0 = [cx + rc * Math.cos(a), cy + rc * Math.sin(a)], p3 = [cx + rc * Math.cos(b), cy + rc * Math.sin(b)];
    if (mode === 'quad15') { const m = (a + b) / 2, r2 = rc / Math.cos((b - a) / 2); out.push([p0, [cx + r2 * Math.cos(m), cy + r2 * Math.sin(m)], p3]); }
    else { const k = 4 / 3 * Math.tan((b - a) / 4); out.push([p0, [p0[0] - k * rc * Math.sin(a), p0[1] + k * rc * Math.cos(a)], [p3[0] + k * rc * Math.sin(b), p3[1] - k * rc * Math.cos(b)], p3]); } } return out; };
  const loop = []; for (let i = 0; i < 4; i++) { loop.push(lines[i]); loop.push(...arc(arcs[i])); } return [loop];
}
const tr = (loops, a, dx, dy, s) => loops.map((l) => l.map((B) => B.map(([x, y]) => [(x * Math.cos(a) - y * Math.sin(a)) * s + dx, (x * Math.sin(a) + y * Math.cos(a)) * s + dy])));
const pos = [[0, 0, 0, 1], [0.001, 0, 0, 1], [0.1, 0, 0, 1], [0.7, 3.3, 1.7, 1], [0, 0.123, 0.456, 1], [0, 0, 0, 0.1], [0, 0, 0, 10], [0.3, 100, 37, 2]];
for (const mode of ['cub30', 'cub90', 'quad15']) { const res = [];
  for (const [a, dx, dy, s] of pos) { const r = await run(tr(rr(0, 0, 30, 16, 4, mode), a, dx, dy, s)); res.push(r.ok ? 'ok' : r.hang ? 'AGATAT' : 'EROARE'); }
  console.log(mode.padEnd(7), res.join(' '), '| ok', res.filter((x) => x === 'ok').length, '/', res.length); }
