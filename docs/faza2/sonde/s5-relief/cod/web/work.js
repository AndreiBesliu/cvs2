// Worker generic al sondei: blur separabil si drop-cutter pe randuri, peste SharedArrayBuffer.
import { blurH, blurV, gaussKernel } from '../lib/hf.mjs';
let st = {};
onmessage = (e) => {
  const m = e.data;
  if (m.cmd === 'init') {
    st = { nx: m.nx, ny: m.ny, A: new Float32Array(m.sabA), B: m.sabB ? new Float32Array(m.sabB) : null, C: m.sabC ? new Float32Array(m.sabC) : null, K: m.sigma ? gaussKernel(m.sigma) : null };
    if (m.off) st.off = { di: new Int32Array(m.off.di), dj: new Int32Array(m.off.dj), rs: new Float64Array(m.off.rs), n: m.off.n };
    postMessage({ ok: 1 }); return;
  }
  const t0 = performance.now();
  if (m.cmd === 'h') blurH(st.A, st.B, st.nx, st.ny, st.K, m.j0, m.j1);
  else if (m.cmd === 'v') blurV(st.B, st.A, st.nx, st.ny, st.K, m.j0, m.j1);
  else if (m.cmd === 'dc') { // randurile de raster m.lines[k]: CL in C[line*nx + i]
    const { nx, ny, A, C, off } = st;
    for (let li = m.l0; li < m.l1; li++) {
      const j = li * m.step;
      for (let i = 0; i < nx; i++) {
        let best = 0;
        for (let k = 0; k < off.n; k++) {
          const ii = i + off.di[k], jj = j + off.dj[k];
          if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
          const v = A[jj * nx + ii] - off.rs[k]; if (v > best) best = v;
        }
        C[li * nx + i] = best;
      }
    }
  }
  postMessage({ ok: 1, ms: performance.now() - t0 });
};
