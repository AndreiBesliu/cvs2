// bench-node.mjs — debit, memorie, determinism între împărțiri, în Node.
// node bench/bench-node.mjs [--quick]
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync(new URL('../out/', import.meta.url), { recursive: true });
import os from 'node:os';
import { makeField, runJob, stats } from '../src/core.mjs';
import { hashField } from '../src/hash.mjs';
import { job2d, job3d, countMoves } from './jobs.mjs';
import { makePool, runParallel, shareOps } from './pool-node.mjs';

const quick = process.argv.includes('--quick');
const REPS = quick ? 3 : 5;
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[(s.length - 1) >> 1]; };
const out = { node: process.version, cpu: os.cpus()[0].model, threads: os.cpus().length, load1: os.loadavg()[0], rez: {} };
const log = (k, v) => { out.rez[k] = v; console.log(k, JSON.stringify(v)); };

function single(job, cell, reps) {
  const times = []; let F, h;
  for (let r = 0; r < reps; r++) {
    F = makeField({ ...job.field, cell });
    const t0 = performance.now(); runJob(F, job); times.push(performance.now() - t0);
    const hh = hashField(F); if (h && hh !== h) throw new Error('NEDETERMINIST între repetări'); h = hh;
  }
  return { F, ms: med(times), all: times.map((t) => +t.toFixed(0)), hash: h };
}

// 1) job 2D pe placa întreagă, la 0,25 și 0,1 mm
const j2 = job2d(), n2 = countMoves(j2);
for (const cell of [0.25, 0.1]) {
  const r = single(j2, cell, REPS), st = stats(r.F);
  log(`2d@${cell}`, { mutari: n2, ms_median: +r.ms.toFixed(0), ms_toate: r.all, mutari_pe_s: Math.round(n2 / (r.ms / 1000)), hash: r.hash,
    celule: st.cells, dale_alocate: `${st.tilesAlloc}/${st.tilesTotal}`, MB_dens: +(st.denseBytes / 2 ** 20).toFixed(1), MB_rar: +(st.sparseBytes / 2 ** 20).toFixed(1),
    dale_uniforme: st.tilesUniform, MB_rar_cu_uniforme_comprimate: +(st.sparseBytesIfUniformCollapsed / 2 ** 20).toFixed(1) });
}
// 2) rastru 3D: subset de 400 de linii (1 M mutări) repetat; întregul (5 M) o dată pe un fir și pe N fire
const j3s = job3d(400, 2500), n3s = countMoves(j3s);
{
  const r = single(j3s, 0.1, REPS);
  // celule evaluate ~ aria capsulei / cell²: estimare pentru debitul pe celulă
  log('3d-subset@0.1', { mutari: n3s, ms_median: +r.ms.toFixed(0), ms_toate: r.all, mutari_pe_s: Math.round(n3s / (r.ms / 1000)), hash: r.hash });
}
const j3 = job3d(), n3 = countMoves(j3);
let h3 = null;
if (!quick) {
  const r = single(j3, 0.1, 1); h3 = r.hash; const st = stats(r.F);
  log('3d-complet@0.1-1fir', { mutari: n3, ms: +r.ms.toFixed(0), mutari_pe_s: Math.round(n3 / (r.ms / 1000)), hash: r.hash, MB_rar: +(st.sparseBytes / 2 ** 20).toFixed(1), dale: `${st.tilesAlloc}/${st.tilesTotal}` });
}
// 3) fire: aceeași amprentă la orice împărțire, și accelerarea
const sh2 = shareOps(j2.ops), sh3 = shareOps((quick ? j3s : j3).ops);
const hRef2 = out.rez['2d@0.1'].hash;
for (const n of quick ? [1, 8] : [1, 4, 8, 16]) {
  const pool = await makePool(n);
  const t2 = [], t3 = []; let hp2, hp3;
  for (let r = 0; r < (quick ? 2 : 3); r++) {
    const a = await runParallel(pool, { ...j2.field, cell: 0.1 }, sh2); t2.push(a.ms); hp2 = hashField(a.F);
    const b = await runParallel(pool, { ...(quick ? j3s : j3).field, cell: 0.1 }, sh3); t3.push(b.ms); hp3 = hashField(b.F);
  }
  await pool.close();
  log(`fire=${n}`, { '2d@0.1_ms': +med(t2).toFixed(0), '2d_hash_identic': hp2 === hRef2, ['3d' + (quick ? '-subset' : '') + '@0.1_ms']: +med(t3).toFixed(0), '3d_hash': hp3, '3d_hash_identic': quick ? hp3 === out.rez['3d-subset@0.1'].hash : hp3 === h3 });
}
out.load1_end = os.loadavg()[0];
writeFileSync(new URL('../out/bench-node' + (quick ? '-quick' : '') + '.json', import.meta.url), JSON.stringify(out, null, 1));
