// render-core.mjs — v3-panza-igpu (ARUNCABIL). Redesenul exact al stratului de vectori, ACELAȘI cod pe firul principal și
// în worker (Path2D există și în worker). Găleți spațiale 32x16 (ca în s6), linie de 1 pixel fizic, culling pe vedere.
import { toPath2D } from './geom.mjs';
import { SHEET_W, SHEET_H } from './scene.mjs';

export const CSS_W = 1281, CSS_H = 721;
export const fitS = Math.min(CSS_W / SHEET_W, CSS_H / SHEET_H) * 0.95;
export const camAt = (i) => ({ cx: SHEET_W / 2 + 300 * Math.sin(i * 0.05), cy: SHEET_H / 2 + 150 * Math.cos(i * 0.037), s: fitS });
const hit = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

export function buildBuckets(shapes) {
  const GX = 32, GY = 16, m = new Map();
  for (const sh of shapes) {
    const bx = Math.min(GX - 1, Math.max(0, Math.floor((sh.bb[0] + sh.bb[2]) / 2 / SHEET_W * GX))), by = Math.min(GY - 1, Math.max(0, Math.floor((sh.bb[1] + sh.bb[3]) / 2 / SHEET_H * GY)));
    const key = by * GX + bx; let b = m.get(key); if (!b) { b = { path: new Path2D(), bb: [Infinity, Infinity, -Infinity, -Infinity] }; m.set(key, b); }
    toPath2D(sh, b.path); b.bb[0] = Math.min(b.bb[0], sh.bb[0]); b.bb[1] = Math.min(b.bb[1], sh.bb[1]); b.bb[2] = Math.max(b.bb[2], sh.bb[2]); b.bb[3] = Math.max(b.bb[3], sh.bb[3]);
    b.segs = (b.segs || 0) + sh.subs.reduce((s, x) => s + x.segs.length, 0);
  }
  return [...m.values()];
}

// Redesen exact PE FELII: la fiecare apel desenează găleți până la ~segBudget segmente, într-un tampon din spate.
// Întoarce true când redesenul e complet (tamponul poate fi copiat pe pânza vizibilă).
export function drawSlice(ctx, buckets, cam, W, H, dpr, state, segBudget) {
  const k = cam.s * dpr;
  if (state.next === 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
  ctx.setTransform(k, 0, 0, k, W / 2 - cam.cx * k, H / 2 - cam.cy * k); ctx.lineWidth = 1 / (cam.s * dpr); ctx.strokeStyle = '#1a1a1a';
  const vr = [cam.cx - W / 2 / k, cam.cy - H / 2 / k, cam.cx + W / 2 / k, cam.cy + H / 2 / k]; let used = 0;
  while (state.next < buckets.length && used < segBudget) { const b = buckets[state.next++]; if (hit(b.bb, vr)) { ctx.stroke(b.path); used += b.segs; } }
  return state.next >= buckets.length;
}

// Desen exact: întoarce câte găleți a desenat. W, H = pixeli fizici ai pânzei; dpr = devicePixelRatio.
export function drawExact(ctx, buckets, cam, W, H, dpr) {
  const k = cam.s * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(k, 0, 0, k, W / 2 - cam.cx * k, H / 2 - cam.cy * k);
  ctx.lineWidth = 1 / (cam.s * dpr); ctx.strokeStyle = '#1a1a1a';
  const vr = [cam.cx - W / 2 / k, cam.cy - H / 2 / k, cam.cx + W / 2 / k, cam.cy + H / 2 / k]; let n = 0;
  for (const b of buckets) if (hit(b.bb, vr)) { ctx.stroke(b.path); n++; }
  return n;
}

export function calib(n = 4e6) { const t0 = performance.now(); let a = 0.5; for (let i = 0; i < n; i++) a = (a * 1.0000001 + 0.3) % 7.13; const t = performance.now() - t0; if (a === 42) console.log(a); return t; }
export const summ = (a) => { if (!a.length) return { n: 0 }; const s = [...a].sort((x, y) => x - y); const q = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; const r = (x) => Math.round(x * 100) / 100; return { n: a.length, med: r(q(0.5)), p95: r(q(0.95)), max: r(s[s.length - 1]) }; };
