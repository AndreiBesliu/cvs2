// Remediul R3 (propus de verificare, varianta imbunatatita a ideii s1): fiecare segment (linie, arc SAU conica
// nerecunoscuta) se potriveste cu primitiva-sursa pe care stau 3 puncte ale lui (capete + mijloc), la eps;
// centrul/raza recuperate din conica NU se folosesc (sunt prost conditionate la arce scurte).
// Apoi fiecare varf = intersectia exacta a primitivelor vecine (cea mai apropiata de varful float32).
export function reanchorR3(region, prims, eps, Pk, intersectPrims) {
  const st = { potrivite: 0, nepotrivite: 0, ambigue: 0, varfuriRecalculate: 0, varfuriFaraIntersectie: 0 };
  const onPrim = (q, p) => q.k === 'A' ? Math.abs(Math.hypot(p[0] - q.cx, p[1] - q.cy) - q.r) : (() => { const dx = q.x1 - q.x0, dy = q.y1 - q.y0, l = Math.hypot(dx, dy); return Math.abs((p[0] - q.x0) * dy - (p[1] - q.y0) * dx) / l; })();
  const same = (a, b) => a.k === b.k && (a.k === 'A' ? Math.hypot(a.cx - b.cx, a.cy - b.cy) + Math.abs(a.r - b.r) < 1e-12 : Math.abs(((b.x0 - a.x0) * (a.y1 - a.y0) - (b.y0 - a.y0) * (a.x1 - a.x0))) / Math.hypot(a.x1 - a.x0, a.y1 - a.y0) < 1e-12 && Math.abs(((b.x1 - a.x0) * (a.y1 - a.y0) - (b.y1 - a.y0) * (a.x1 - a.x0))) / Math.hypot(a.x1 - a.x0, a.y1 - a.y0) < 1e-12);
  const out = region.map((c) => {
    const m = c.segs.map((s) => {
      const pts = [Pk(s, 0), Pk(s, 0.5), Pk(s, 1)];
      const want = s.k === 'L' ? 'L' : 'A';
      const cand = []; for (const q of prims) if (q.k === want && pts.every((p) => onPrim(q, p) < eps) && !cand.some((u) => same(u, q))) cand.push(q);
      if (cand.length === 1) st.potrivite++; else if (!cand.length) st.nepotrivite++; else st.ambigue++;
      return cand.length === 1 ? cand[0] : null;
    });
    const N = c.segs.length, V = [];
    for (let i = 0; i < N; i++) { const a = m[(i - 1 + N) % N], b = m[i], near = Pk(c.segs[i], 0); if (a && b && !same(a, b)) { const r = intersectPrims(a, b, near); if (r && r.e < eps) { V.push(r.p); st.varfuriRecalculate++; continue; } } if (a && b && same(a, b)) { V.push(near); st.varfuriRecalculate++; continue; } st.varfuriFaraIntersectie++; V.push(near); }
    return { closed: c.closed, segs: c.segs.map((s, i) => { const p0 = V[i], p1 = V[(i + 1) % N], q = m[i]; if (!q) return s; if (q.k === 'L') return { k: 'L', x0: p0[0], y0: p0[1], x1: p1[0], y1: p1[1] }; const a0 = Math.atan2(p0[1] - q.cy, p0[0] - q.cx); let da = Math.atan2(p1[1] - q.cy, p1[0] - q.cx) - a0; const ccw = s.k === "A" ? s.da > 0 : ((Pk(s, 0.5)[0] - p0[0]) * (p1[1] - p0[1]) - (Pk(s, 0.5)[1] - p0[1]) * (p1[0] - p0[0])) > 0; /* mijlocul la dreapta coardei = arc CCW (centrul la stanga) */ if (ccw) { while (da <= 0) da += 2 * Math.PI; } else { while (da >= 0) da -= 2 * Math.PI; } return { k: 'A', cx: q.cx, cy: q.cy, r: q.r, a0, da }; }) };
  });
  return { region: out, st };
}
