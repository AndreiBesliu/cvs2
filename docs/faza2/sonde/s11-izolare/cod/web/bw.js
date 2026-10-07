// bw.js - worker-ul sondei s11 (aruncabil). Trei feluri de a primi datele:
//  (a) SharedArrayBuffer: memorie comuna, ca in s5 (blur pe randuri, drop-cutter pe linii);
//  (b) transfer: fiecare worker primeste banda lui + halo (copie facuta de firul principal, transferata), intoarce rezultatul transferat;
//  (c) banda detinuta de worker: datele stau in worker; la fiecare operatie se schimba doar halo-urile (r randuri) cu vecinii.
// Plus jobul s4 (simulare) cu mutarile in SAB, copiate sau filtrate pe worker.
import { blurH, blurV, gaussKernel } from '../lib/hf.mjs';
import { makeField, runJob } from '../lib/s4/core.mjs';

let st = {};
const now = () => performance.now();

// blur vertical pe o banda locala: randurile globale [j0,j1) din src, care tine randurile globale [gj0, gj0+rows).
// ACEEASI ordine de operatii ca blurV din hf.mjs (dst=0, apoi += w*src pentru t=-r..r), deci acelasi rezultat bit cu bit.
// Clamparea locala (lj) e no-op cand halo-ul e complet; cu halo prea mic replica marginea benzii (bugul controlului negativ).
function blurVBand(src, rows, gj0, dst, nx, ny, K, j0, j1) {
  const { k, r } = K;
  for (let j = j0; j < j1; j++) {
    const o = (j - j0) * nx;
    for (let i = 0; i < nx; i++) dst[o + i] = 0;
    for (let t = -r; t <= r; t++) {
      let jj = j + t; jj = jj < 0 ? 0 : jj >= ny ? ny - 1 : jj;
      let lj = jj - gj0; if (lj < 0) lj = 0; else if (lj >= rows) lj = rows - 1;
      const w = k[t + r], oo = lj * nx;
      for (let i = 0; i < nx; i++) dst[o + i] += w * src[oo + i];
    }
  }
}
// drop-cutter (varianta C din s5) pe liniile [l0,l1), linia li la randul j = li*step; H tine randurile globale [gj0, gj0+rows).
// Testul de margine e la fel de ieftin ca in s5 (jj < 0 || jj >= rows, cu jj local): cu halo complet, randurile globale valide sunt
// toate in banda, deci rezultatul e acelasi; cu halo prea mic, randurile lipsa sunt sarite (bugul controlului negativ: CL prea jos).
// Doua copii textuale identice: S pentru SAB (gj0 = 0, rows = ny), T pentru transfer, ca JIT-ul sa nu le amestece.
function dcBandS(H, rows, gj0, nx, off, step, l0, l1, out, o0) {
  const di = off.di, dj = off.dj, rs = off.rs, no = off.n;
  for (let li = l0; li < l1; li++) {
    const jl = li * step - gj0, o = (li - l0) * nx + o0;
    for (let i = 0; i < nx; i++) {
      let best = 0;
      for (let q = 0; q < no; q++) {
        const ii = i + di[q], jj = jl + dj[q];
        if (ii < 0 || jj < 0 || ii >= nx || jj >= rows) continue;
        const v = H[jj * nx + ii] - rs[q]; if (v > best) best = v;
      }
      out[o + i] = best;
    }
  }
}
function dcBandT(H, rows, gj0, nx, off, step, l0, l1, out, o0) {
  const di = off.di, dj = off.dj, rs = off.rs, no = off.n;
  for (let li = l0; li < l1; li++) {
    const jl = li * step - gj0, o = (li - l0) * nx + o0;
    for (let i = 0; i < nx; i++) {
      let best = 0;
      for (let q = 0; q < no; q++) {
        const ii = i + di[q], jj = jl + dj[q];
        if (ii < 0 || jj < 0 || ii >= nx || jj >= rows) continue;
        const v = H[jj * nx + ii] - rs[q]; if (v > best) best = v;
      }
      out[o + i] = best;
    }
  }
}
// copie textuala a lui blurH din s5/lib/hf.mjs, folosita doar de caile fara SAB (aceleasi operatii, aceeasi ordine)
function blurHT(src, dst, nx, ny, K, j0 = 0, j1 = ny) {
  const { k, r } = K;
  for (let j = j0; j < j1; j++) {
    const o = j * nx;
    for (let i = 0; i < nx; i++) {
      let s = 0;
      if (i >= r && i < nx - r) for (let t = -r; t <= r; t++) s += k[t + r] * src[o + i + t];
      else for (let t = -r; t <= r; t++) { let ii = i + t; ii = ii < 0 ? 0 : ii >= nx ? nx - 1 : ii; s += k[t + r] * src[o + ii]; }
      dst[o + i] = s;
    }
  }
}
const mkOff = (o) => ({ di: new Int32Array(o.di), dj: new Int32Array(o.dj), rs: new Float64Array(o.rs), n: o.n });

onmessage = (e) => {
  const m = e.data, t0 = now();
  // ---------- (a) SharedArrayBuffer ----------
  if (m.cmd === 'initSab') {
    st.nx = m.nx; st.ny = m.ny;
    st.A = new Float32Array(m.sabA); st.B = m.sabB ? new Float32Array(m.sabB) : null; st.C = m.sabC ? new Float32Array(m.sabC) : null;
    st.K = m.sigma ? gaussKernel(m.sigma) : null; st.off = m.off ? mkOff(m.off) : null;
    postMessage({ ok: 1, coi: self.crossOriginIsolated }); return;
  }
  if (m.cmd === 'h') { blurH(st.A, st.B, st.nx, st.ny, st.K, m.j0, m.j1); postMessage({ ms: now() - t0 }); return; }
  if (m.cmd === 'v') { blurV(st.B, st.A, st.nx, st.ny, st.K, m.j0, m.j1); postMessage({ ms: now() - t0 }); return; }
  if (m.cmd === 'dc') { // bucla din s5/web/work.js (aceeasi forma), peste SAB: gj0 = 0, rows = ny, iesirea direct in C
    dcBandS(st.A, st.ny, 0, st.nx, st.off, m.step, m.l0, m.l1, st.C, m.l0 * st.nx);
    postMessage({ ms: now() - t0 }); return;
  }
  // ---------- (b) transfer: banda + halo vin de la firul principal, rezultatul se intoarce transferat ----------
  if (m.cmd === 'blurT') {
    const K = gaussKernel(m.sigma), src = new Float32Array(m.buf), rows = src.length / m.nx;
    const tmp = new Float32Array(src.length);
    blurHT(src, tmp, m.nx, rows, K, 0, rows);
    const out = new Float32Array((m.j1 - m.j0) * m.nx);
    blurVBand(tmp, rows, m.gj0, out, m.nx, m.ny, K, m.j0, m.j1);
    postMessage({ ms: now() - t0, out: out.buffer }, [out.buffer]); return;
  }
  if (m.cmd === 'dcT') {
    const H = new Float32Array(m.buf), rows = H.length / m.nx, off = mkOff(m.off);
    const out = new Float32Array((m.l1 - m.l0) * m.nx);
    dcBandT(H, rows, m.gj0, m.nx, off, m.step, m.l0, m.l1, out, 0);
    postMessage({ ms: now() - t0, out: out.buffer }, [out.buffer]); return;
  }
  // ---------- (c) banda detinuta de worker ----------
  if (m.cmd === 'setOwn') { st.nx = m.nx; st.ny = m.ny; st.own = new Float32Array(m.buf); st.oj0 = m.oj0; st.oj1 = m.oj1; postMessage({ ok: 1 }); return; }
  if (m.cmd === 'edges') { // copii ale primelor si ultimelor r randuri ale benzii
    const nx = st.nx, rows = st.oj1 - st.oj0, r = Math.min(m.r, rows);
    const top = st.own.slice(0, r * nx), bot = st.own.slice((rows - r) * nx);
    postMessage({ ms: now() - t0, top: top.buffer, bot: bot.buffer }, [top.buffer, bot.buffer]); return;
  }
  if (m.cmd === 'blurOwn' || m.cmd === 'dcOwn') { // [haloSus | banda | haloJos] -> calcul; banda noua ramane in worker (blur)
    const nx = st.nx, ny = st.ny, rows = st.oj1 - st.oj0;
    const hT = m.haloTop ? new Float32Array(m.haloTop) : null, hB = m.haloBot ? new Float32Array(m.haloBot) : null;
    const nT = hT ? hT.length / nx : 0, nB = hB ? hB.length / nx : 0, all = new Float32Array((nT + rows + nB) * nx);
    if (hT) all.set(hT, 0); all.set(st.own, nT * nx); if (hB) all.set(hB, (nT + rows) * nx);
    const gj0 = st.oj0 - nT, R = nT + rows + nB;
    if (m.cmd === 'blurOwn') {
      const K = gaussKernel(m.sigma), tmp = new Float32Array(all.length);
      blurHT(all, tmp, nx, R, K, 0, R);
      const out = new Float32Array(rows * nx);
      blurVBand(tmp, R, gj0, out, nx, ny, K, st.oj0, st.oj1);
      st.own = out; postMessage({ ms: now() - t0 }); return;
    }
    const off = mkOff(m.off), out = new Float32Array(Math.max(0, m.l1 - m.l0) * nx);
    dcBandT(all, R, gj0, nx, off, m.step, m.l0, m.l1, out, 0);
    postMessage({ ms: now() - t0, out: out.buffer }, [out.buffer]); return;
  }
  if (m.cmd === 'getOwn') { const c = st.own.slice(); postMessage({ buf: c.buffer, oj0: st.oj0 }, [c.buffer]); return; }
  // ---------- jobul s4: randuri de dale intercalate (randul r -> workerul r mod N), dalele se intorc transferate ----------
  if (m.cmd === 's4') {
    const F = makeField(m.fieldDef);
    F.own = new Uint8Array(F.nty); for (const r of m.ownRows) F.own[r] = 1;
    runJob(F, { ops: m.ops });
    const tiles = [], bufs = [];
    F.tiles.forEach((t, i) => { if (t) { tiles.push([i, t]); bufs.push(t.buffer); } });
    postMessage({ ms: now() - t0, tiles, coi: self.crossOriginIsolated }, bufs); return;
  }
  postMessage({ err: 'cmd necunoscut ' + m.cmd });
};
