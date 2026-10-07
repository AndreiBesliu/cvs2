// memorie.mjs — cât ocupă placa întreagă (job 2D) după mărimea dalei și formatul celulei.
// Rulează nucleul o dată pe 0,25 și 0,1 mm, apoi recalculează alocarea pentru dale de 16/32/64/128.
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync(new URL('../out/', import.meta.url), { recursive: true });
import { makeField, runJob } from '../src/core.mjs';
import { toDense } from '../src/hash.mjs';
import { job2d } from './jobs.mjs';
const job = job2d(), rez = {};
for (const cell of [0.25, 0.1]) {
  const F = makeField({ ...job.field, cell });
  runJob(F, job);
  const D = toDense(F), nx = F.nx, ny = F.ny;
  let cut = 0; for (let k = 0; k < D.length; k++) if (D[k] < 0) cut++;
  const r = { celule: nx * ny, celule_taiate: cut, proc_taiat: +((100 * cut) / (nx * ny)).toFixed(1), MB_dens_f32: +((nx * ny * 4) / 2 ** 20).toFixed(0) };
  for (const T of [16, 32, 64, 128]) {
    const tx = Math.ceil(nx / T), ty = Math.ceil(ny / T), used = new Uint8Array(tx * ty), uni = new Float64Array(tx * ty).fill(NaN), mixed = new Uint8Array(tx * ty);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const v = D[j * nx + i], t = ((j / T) | 0) * tx + ((i / T) | 0);
      if (v < 0) used[t] = 1;
      if (Number.isNaN(uni[t])) uni[t] = v; else if (uni[t] !== v) mixed[t] = 1;
    }
    let n = 0, nu = 0; for (let t = 0; t < used.length; t++) if (used[t]) { n++; if (!mixed[t]) nu++; }
    r['dala' + T] = { dale: n, MB_f32: +((n * T * T * 4) / 2 ** 20).toFixed(0), MB_f32_uniforme_comprimate: +(((n - nu) * T * T * 4) / 2 ** 20).toFixed(0), MB_u16: +(((n - nu) * T * T * 2) / 2 ** 20).toFixed(0), eficienta: +((100 * cut) / (n * T * T)).toFixed(0) + '%' };
  }
  rez['celula ' + cell] = r;
  console.log('celula', cell, JSON.stringify(r));
}
writeFileSync(new URL('../out/memorie.json', import.meta.url), JSON.stringify(rez, null, 1));
