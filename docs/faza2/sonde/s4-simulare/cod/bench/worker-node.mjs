// worker-node.mjs — un fir care rulează ACELAȘI nucleu pe rândurile de dale care îi aparțin.
import { parentPort } from 'node:worker_threads';
import { makeField, runJob } from '../src/core.mjs';
parentPort.on('message', ({ fieldDef, ownRows, ops }) => {
  const F = makeField(fieldDef);
  F.own = new Uint8Array(F.nty);
  for (const r of ownRows) F.own[r] = 1;
  const t0 = performance.now();
  runJob(F, { ops });
  const ms = performance.now() - t0;
  const tiles = [], bufs = [];
  F.tiles.forEach((t, i) => { if (t) { tiles.push([i, t]); bufs.push(t.buffer); } });
  parentPort.postMessage({ ms, tiles }, bufs);
});
