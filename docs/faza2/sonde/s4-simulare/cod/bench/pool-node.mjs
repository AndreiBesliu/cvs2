// pool-node.mjs — împarte rândurile de dale intercalat pe N fire (rândul r -> firul r mod N).
import { Worker } from 'node:worker_threads';
import { makeField } from '../src/core.mjs';
export function shareOps(ops) {
  return ops.map((o) => {
    const src = o.poly || o.moves;
    const sab = new SharedArrayBuffer(src.byteLength); const a = new Float64Array(sab); a.set(src);
    return o.poly ? { tool: o.tool, poly: a } : { tool: o.tool, moves: a };
  });
}
export async function makePool(n) {
  const ws = Array.from({ length: n }, () => new Worker(new URL('./worker-node.mjs', import.meta.url)));
  return { ws, close: () => Promise.all(ws.map((w) => w.terminate())) };
}
export async function runParallel(pool, fieldDef, sharedOps) {
  const F = makeField(fieldDef), n = pool.ws.length;
  const t0 = performance.now();
  const res = await Promise.all(pool.ws.map((w, k) => new Promise((ok) => {
    const ownRows = []; for (let r = k; r < F.nty; r += n) ownRows.push(r);
    w.once('message', ok); w.postMessage({ fieldDef, ownRows, ops: sharedOps });
  })));
  for (const r of res) for (const [i, t] of r.tiles) { F.tiles[i] = t; F.allocated++; }
  return { F, ms: performance.now() - t0, perWorker: res.map((r) => r.ms) };
}
