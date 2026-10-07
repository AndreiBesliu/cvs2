// (d) Offset pe o singura parte al unui contur DESCHIS, unde raza de curbura e mai mica decat offsetul (d = 3,175).
// Adevarul: punctele p = c(t) + s*d*n(t) care nu sunt "taiate" (distanta la cale >= d), plus evantaiele de la colturile
// convexe ale partii respective. Iesirea: fiecare punct la distanta d de cale si pe partea ceruta.
import fs from 'node:fs';
import * as cc from 'cavalier-contours-js';
import { contourToLA } from '../geom.mjs';
import { plineToSegs, samplesOf, dSeg, P, maxGap } from './oracol-v1.mjs';
import { toPlines, fmt } from './comun.mjs';

const D = 3.175;
const Ls = (x0, y0, x1, y1) => ({ k: 'L', x0, y0, x1, y1 });
const As = (cx, cy, r, a0, da) => ({ k: 'A', cx, cy, r, a0, da });
const cases = [
  // L - arc r=1 (90 grade la stanga) - L
  ['L-arc r1-L (90 grade)', { closed: false, segs: [Ls(-30, 0, 0, 0), As(0, 1, 1, -Math.PI / 2, Math.PI / 2), Ls(1, 1, 1, 30)] }],
  // ac de par: dus pe y=1, intoarcere r=1 (180 grade, orar), intors pe y=-1
  ['ac de par r=1 (180 grade)', { closed: false, segs: [Ls(-30, 1, 0, 1), As(0, 0, 1, Math.PI / 2, -Math.PI), Ls(0, -1, -30, -1)] }],
  // zigzag cu unghiuri ascutite (V de 22,6 grade)
  ['zigzag ascutit', { closed: false, segs: [Ls(0, 0, 20, 2), Ls(20, 2, 0, 4), Ls(0, 4, 20, 6), Ls(20, 6, 0, 8)] }],
  // cubica in bucla stransa (raza minima de curbura < d), prin biarcele proprii (0,002)
  ['cubica stransa (biarce)', { closed: false, segs: [{ k: 'C', x0: 0, y0: 0, x1: 30, y1: 0, x2: -20, y2: 8, x3: 10, y3: 8 }] }],
  // spirala de arce cu raze descrescatoare (5 -> 0,5)
  ['arce cu raza 5..0,5', { closed: false, segs: (() => { const s = []; let x = 0, y = 0, a = 0; for (const r of [5, 4, 3, 2, 1.5, 1, 0.75, 0.5]) { const cx = x - r * Math.sin(a), cy = y + r * Math.cos(a); const a0 = a - Math.PI / 2; s.push(As(cx, cy, r, a0, Math.PI / 2)); x = cx + r * Math.cos(a0 + Math.PI / 2); y = cy + r * Math.sin(a0 + Math.PI / 2); a += Math.PI / 2; } return s; })() }],
];
// raza minima de curbura a cubicei (pe hartie: |B'|^3 / |B' x B''|, esantionat dens)
{ const c = cases[3][1].segs[0]; let rmin = Infinity; for (let i = 0; i <= 20000; i++) { const t = i / 20000, u = 1 - t; const dx = 3 * (u * u * (c.x1 - c.x0) + 2 * u * t * (c.x2 - c.x1) + t * t * (c.x3 - c.x2)), dy = 3 * (u * u * (c.y1 - c.y0) + 2 * u * t * (c.y2 - c.y1) + t * t * (c.y3 - c.y2)); const ex = 6 * (u * (c.x2 - 2 * c.x1 + c.x0) + t * (c.x3 - 2 * c.x2 + c.x1)), ey = 6 * (u * (c.y2 - 2 * c.y1 + c.y0) + t * (c.y3 - 2 * c.y2 + c.y1)); const k = Math.abs(dx * ey - dy * ex) / Math.pow(dx * dx + dy * dy, 1.5); rmin = Math.min(rmin, 1 / k); } console.log('cubica: raza minima de curbura', rmin.toFixed(4), 'mm (< d =', D, ')'); }

const out = [];
for (const [name, path0] of cases) {
  const path = path0.segs.some((s) => s.k === 'C') ? contourToLA(path0, 0.002) : path0; // calea efectiv decalata (L/A)
  const truthPath = path0; // adevarul: calea ORIGINALA (cu cubica)
  const dPath = (x, y) => { let b = Infinity; for (const s of truthPath.segs) b = Math.min(b, dSeg(s, x, y)); return b; };
  const tol = path0.segs.some((s) => s.k === 'C') ? 0.002 : 1e-9;
  for (const side of [1, -1]) { // +1 = stanga, -1 = dreapta
    const pl = toPlines([path])[0];
    let res, err = null; const t0 = performance.now();
    try { res = pl.parallelOffset((process.env.SABOTAJ === "parte" ? -side : side) * D); } catch (e) { err = e.message; } // control negativ: partea opusa
    const ms = performance.now() - t0;
    if (err) { out.push({ caz: name, parte: side, eroare: err }); console.log(name, side, 'EROARE', err); continue; }
    const loops = res.map((q) => { const v = []; for (let i = 0; i < q.vertexCount; i++) { const a = q.at(i); v.push({ x: a.x, y: a.y, bulge: a.bulge }); } return plineToSegs(v, q.isClosed); });
    // iesire -> adevar: distanta d si partea corecta (prin cel mai apropiat punct al caii, cand e in interiorul unui segment)
    let e = 0, parteGresita = 0;
    for (const p of samplesOf(loops, 0.01)) {
      e = Math.max(e, Math.abs(dPath(p[0], p[1]) - D));
      // partea: pe segmentul cel mai apropiat, semnul produsului vectorial tangenta x (p - proiectie)
      let best = Infinity, sg = 0, laVarf = false;
      for (const s of truthPath.segs) for (let i = 0; i <= 400; i++) { const q = P(s, i / 400); const dd = Math.hypot(p[0] - q[0], p[1] - q[1]); if (dd < best) { best = dd; laVarf = i === 0 || i === 400; const q2 = P(s, Math.min(1, i / 400 + 1e-6)), q1 = P(s, Math.max(0, i / 400 - 1e-6)); sg = Math.sign((q2[0] - q1[0]) * (p[1] - q[1]) - (q2[1] - q1[1]) * (p[0] - q[0])); } }
      if (!laVarf && sg !== 0 && sg !== side) parteGresita++; // langa un varf partea e ambigua (evantaiul colturilor)
    }
    // adevar -> iesire
    const tp = [];
    for (const s of truthPath.segs) for (let i = 1; i < 400; i++) { const t = i / 400, q = P(s, t), q2 = P(s, t + 1e-7), q1 = P(s, t - 1e-7); const tx = q2[0] - q1[0], ty = q2[1] - q1[1], l = Math.hypot(tx, ty); const p = [q[0] - ty / l * D * side, q[1] + tx / l * D * side]; if (dPath(p[0], p[1]) >= D - 1e-9) tp.push(p); }
    // evantaie la varfurile interioare
    for (let i = 0; i + 1 < truthPath.segs.length; i++) { const a = truthPath.segs[i], b = truthPath.segs[i + 1]; const v = P(a, 1); const ta = (() => { const q2 = P(a, 1), q1 = P(a, 1 - 1e-7); return Math.atan2(q2[1] - q1[1], q2[0] - q1[0]); })(), tb = (() => { const q2 = P(b, 1e-7), q1 = P(b, 0); return Math.atan2(q2[1] - q1[1], q2[0] - q1[0]); })(); let dt = tb - ta; while (dt > Math.PI) dt -= 2 * Math.PI; while (dt < -Math.PI) dt += 2 * Math.PI; for (let k = 0; k <= 20; k++) { const ang = ta + dt * k / 20 + side * Math.PI / 2; const p = [v[0] + D * Math.cos(ang), v[1] + D * Math.sin(ang)]; if (dPath(p[0], p[1]) >= D - 1e-9) tp.push(p); } }
    const segs = loops.flatMap((c) => c.segs); let h = 0; for (const q of tp) { let b = Infinity; for (const s of segs) b = Math.min(b, dSeg(s, q[0], q[1])); h = Math.max(h, b); }
    const rec = { caz: name, parte: side > 0 ? 'stanga' : 'dreapta', rezultate: res.length, deschise: res.filter((q) => !q.isClosed).length, seg: segs.length, arce: segs.filter((s) => s.k === 'A').length, iesireAdevar: loops.length ? e : null, parteGresita, puncteAdevar: tp.length, adevarIesire: tp.length ? h : null, gol: maxGap(loops), ms, tolDeclarata: tol };
    rec.ok = (rec.iesireAdevar === null || rec.iesireAdevar <= tol * 1.01 + 1e-9) && rec.parteGresita === 0 && (tp.length === 0 ? res.length === 0 : h <= tol * 1.01 + 1e-9);
    out.push(rec);
    console.log(`${rec.ok ? 'OK  ' : 'PICA'} ${name.padEnd(28)} ${rec.parte.padEnd(8)} rezultate ${rec.rezultate} (deschise ${rec.deschise}) ${rec.seg} seg/${rec.arce} arce | iesire->adevar ${fmt(rec.iesireAdevar)} | parte gresita ${parteGresita} | adevar->iesire ${fmt(rec.adevarIesire)} (${tp.length} pct) | gol ${fmt(rec.gol)} | ${fmt(ms, 2)} ms`);
  }
}
fs.writeFileSync(process.env.SABOTAJ ? "rez-d-deschis-sabotaj.json" : "rez-d-deschis.json", JSON.stringify(out, null, 1)); console.log("OK " + out.filter((r) => r.ok).length + "/" + out.length);
