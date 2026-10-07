// Sonda 3: memoria undo-ului pe un document de 50 k noduri. Trei strategii:
//   A) copii complete (structuredClone, ca în ediția întâi), B) Immer cu partajare structurală + patch-uri,
//   C) jurnal de comenzi care ține valorile VECHI și NOI ale câmpurilor atinse.
// Plus: exactitatea undo-ului prin „operația inversă” (x + dx - dx) față de restaurarea valorii stocate.
// Rulare: node --expose-gc p3-undo.mjs [N=50000]
import { makeDoc } from './lib/doc.mjs';
import { produceWithPatches, enablePatches, applyPatches, setAutoFreeze } from 'immer';
import { writeFileSync } from 'node:fs';
enablePatches();
const N = Number(process.argv[2] ?? 50000);
const MODE = process.argv[3] ?? 'all';
if (MODE === 'all') {
  // fiecare strategie în procesul ei, ca GC-ul unei strategii să nu strice măsurarea alteia
  const { execFileSync } = await import('node:child_process');
  const out = { N };
  for (const m of ['full', 'immer-freeze', 'immer-nofreeze', 'journal', 'inverse']) Object.assign(out, JSON.parse(execFileSync(process.execPath, ['--expose-gc', '--max-old-space-size=16384', 'p3-undo.mjs', String(N), m], { encoding: 'utf8', maxBuffer: 1 << 24 })));
  console.log(JSON.stringify(out, null, 1));
  writeFileSync('out/p3-undo.json', JSON.stringify(out, null, 1));
  process.exit(0);
}
const gc = () => { global.gc(); global.gc(); };
const mem = () => { gc(); const m = process.memoryUsage(); return m.heapUsed + m.arrayBuffers; };
const MB = (b) => +(b / 1048576).toFixed(2);
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const r = { N };

let m0 = mem();
let doc = makeDoc(N);
r.docMB = MB(mem() - m0);
const ids = Object.keys(doc.nodes).filter((k) => k !== 'root');

// A) copii complete
if (MODE === 'full') {
  const K = 10, snaps = [], times = [];
  const a = mem();
  for (let i = 0; i < K; i++) { const t = performance.now(); snaps.push(structuredClone(doc)); times.push(performance.now() - t); }
  r.fullCopy = { perStepMB: MB((mem() - a) / K), cloneMsMedian: Math.round(median(times)), for200StepsGB: +(((mem() - a) / K) * 200 / 1073741824).toFixed(1) };
  snaps.length = 0;
}

// B) Immer: 100 de editări (mută câte un nod), păstrând toate versiunile + patch-urile inverse
for (const freeze of MODE === 'immer-freeze' ? [true] : MODE === 'immer-nofreeze' ? [false] : []) {
  setAutoFreeze(freeze);
  let base = doc; doc = null; gc();
  const a = mem();
  const versions = [base], inv = [], times = [];
  for (let i = 0; i < 100; i++) {
    const id = ids[(i * 7919) % ids.length];
    const t = performance.now();
    const [next, , inverse] = produceWithPatches(base, (d) => { d.nodes[id].transform[4] += 1.5; });
    times.push(performance.now() - t);
    versions.push(next); inv.push(inverse); base = next;
  }
  const per = (mem() - a) / 100;
  // undo complet prin patch-urile inverse, verificat față de prima versiune
  let cur = base; for (let i = inv.length - 1; i >= 0; i--) cur = applyPatches(cur, inv[i]);
  r[freeze ? 'immerFreeze' : 'immerNoFreeze'] = { perStepKB: +(per / 1024).toFixed(1), firstEditMs: Math.round(times[0]), editMsMedian: +median(times.slice(1)).toFixed(2), undoBackToStartExact: JSON.stringify(cur.nodes) === JSON.stringify(versions[0].nodes) };
}

// C) jurnal de comenzi: valorile vechi/noi ale câmpurilor atinse
if (MODE === 'journal') {
  const journal = [];
  const a = mem();
  for (let i = 0; i < 1000; i++) {
    const id = ids[(i * 7919) % ids.length], n = doc.nodes[id];
    const before = n.transform.slice(), after = before.slice(); after[4] += 1.5;
    journal.push({ type: 'move', id, before, after }); n.transform = after;
  }
  const perSmall = (mem() - a) / 1000;
  // o comandă mare: „selectează tot și mută” — 50 k noduri, valorile vechi într-un Float64Array
  const b = mem();
  const before = new Float64Array(ids.length * 6);
  ids.forEach((id, i) => before.set(doc.nodes[id].transform, i * 6));
  const big = { type: 'moveMany', ids, dx: 0.1, before };
  ids.forEach((id) => { doc.nodes[id].transform[4] += 0.1; });
  journal.push(big);
  const bigMB = MB(mem() - b);
  // undo prin restaurarea valorilor stocate
  ids.forEach((id, i) => { for (let k = 0; k < 6; k++) doc.nodes[id].transform[k] = before[i * 6 + k]; });
  const exactRestore = ids.every((id, i) => doc.nodes[id].transform.every((v, k) => Object.is(v, before[i * 6 + k])));
  r.journal = { perSmallCmdBytes: Math.round(perSmall), selectAllMoveCmdMB: bigMB, exactRestore };
}

// Exactitatea „operației inverse”: mutare x + 0.1 - 0.1 și rotire cu 30° apoi cu -30°, pe toate punctele de start
if (MODE === 'inverse') {
  const xs = ids.map((id) => doc.nodes[id].transform[4]);
  const back = xs.map((x) => x + 0.1 - 0.1);
  const bad = back.filter((v, i) => !Object.is(v, xs[i])).length;
  const pts = []; for (const id of ids) { const n = doc.nodes[id]; if (n.type === 'vector') for (const sp of n.subpaths) pts.push(sp.start); }
  const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
  let rb = 0, rmax = 0;
  for (const [x, y] of pts) { const x1 = c * x - s * y, y1 = s * x + c * y; const x2 = c * x1 + s * y1, y2 = -s * x1 + c * y1; if (!Object.is(x2, x) || !Object.is(y2, y)) rb++; rmax = Math.max(rmax, Math.abs(x2 - x), Math.abs(y2 - y)); }
  r.inverseMath = { translate: { coords: xs.length, notBitExact: bad, pct: +((100 * bad) / xs.length).toFixed(2), maxErrMm: Math.max(...back.map((v, i) => Math.abs(v - xs[i]))) },
    rotate30: { points: pts.length, notBitExact: rb, pct: +((100 * rb) / pts.length).toFixed(1), maxErrMm: rmax },
    paper: { expr: '(0.1 + 0.2) - 0.2', got: (0.1 + 0.2) - 0.2, exact: 0.1 } };
}
delete r.N; if (MODE !== 'full') delete r.docMB;
console.log(JSON.stringify(r));
