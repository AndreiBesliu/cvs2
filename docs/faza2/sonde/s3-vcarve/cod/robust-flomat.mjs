// Robustete flo-mat: fiecare caz intr-un worker separat, cu limita de timp (agatare = esec).
// node robust-flomat.mjs
import { Worker } from 'node:worker_threads';
import { corpus } from './corpus.mjs';
import { toBezierLoops } from './src/ma-flomat.mjs';
const LIMIT = +(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 15000);
const rot = (loops, a, dx, dy, s) => loops.map(l => l.map(B => B.map(([x, y]) => [(x * Math.cos(a) - y * Math.sin(a)) * s + dx, (x * Math.sin(a) + y * Math.cos(a)) * s + dy])));
const workerSrc = `
import { parentPort, workerData } from 'node:worker_threads';
const FM = await import(${JSON.stringify(new URL('./node_modules/flo-mat/browser/index.js', import.meta.url).href)});
const t = performance.now();
try { const m = FM.findMats(workerData, { applySat: false, simplify: false }); parentPort.postMessage({ ok: true, ms: performance.now() - t, mats: m.length }); }
catch (e) { parentPort.postMessage({ ok: false, ms: performance.now() - t, err: String(e.message).slice(0, 70) }); }`;
const run = (loops) => new Promise((res) => {
  const w = new Worker(workerSrc, { eval: true, workerData: loops, type: 'module' });
  const to = setTimeout(() => { w.terminate(); res({ ok: false, hang: true }); }, LIMIT);
  w.on('message', (m) => { clearTimeout(to); w.terminate(); res(m); });
  w.on('error', (e) => { clearTimeout(to); res({ ok: false, err: String(e.message).slice(0, 70) }); });
});
const C = corpus();
const cases = [];
for (const S of C.filter(s => !s.name.startsWith('placuta') && !s.name.startsWith('firma'))) cases.push([S.name, toBezierLoops(S.loops)]);
const rr = toBezierLoops(C.find(s => s.name.startsWith('drept_rot')).loops);
for (const [a, dx, dy, s] of [[0.001, 0, 0, 1], [0.1, 0, 0, 1], [0.7, 3.3, 1.7, 1], [0, 0.123, 0.456, 1], [0, 0, 0, 0.1], [0, 0, 0, 10], [0.3, 100, 37, 2]]) cases.push([`drept_rotunjit rot=${a} dx=${dx} s=${s}`, rot(rr, a, dx, dy, s)]);
const out = [];
for (const [name, loops] of cases) { const r = await run(loops); out.push({ name, ...r }); console.log(name.padEnd(42), r.ok ? `ok ${r.ms.toFixed(0)} ms` : r.hang ? `AGATAT (> ${LIMIT / 1000} s)` : `EROARE ${r.err}`); }
console.log(`\nok ${out.filter(o => o.ok).length} / ${out.length}; erori ${out.filter(o => !o.ok && !o.hang).length}; agatari ${out.filter(o => o.hang).length}`);
