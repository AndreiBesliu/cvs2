// Sonda s5-relief (aruncabila). Freze, suprafete analitice si CL analitic (oracolul).
// CL = pozitia varfului frezei (cutter location, cota varfului). Toate unitatile in mm.
export const DEG = Math.PI / 180;

export const ball = (R) => ({ kind: 'ball', R, name: `bila R${R}` });
export const flat = (R) => ({ kind: 'flat', R, name: `dreapta R${R}` });
// includedDeg = unghiul inclus al V-ului (90 = V90); alpha = jumatate de unghi, fata de axa
export const vbit = (R, includedDeg) => ({ kind: 'v', R, alpha: (includedDeg * DEG) / 2, name: `V${includedDeg} R${R}` });

// cat se ridica suprafata frezei deasupra varfului la raza r (r <= R)
export function rise(t, r) {
  if (t.kind === 'ball') { const q = t.R * t.R - r * r; return t.R - Math.sqrt(q > 0 ? q : 0); }
  if (t.kind === 'flat') return 0;
  return r / Math.tan(t.alpha);
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------- suprafete analitice, fiecare cu: z(x,y), cellMax(x0,x1,y0,y1), cl(tool,x,y) exact ----------
export function plane(a, b, c) {
  return {
    name: `plan z=${a}x+${b}y+${c}`,
    z: (x, y) => a * x + b * y + c,
    cellMax: (x0, x1, y0, y1) => Math.max(a * x0, a * x1) + Math.max(b * y0, b * y1) + c,
    cl(t, x, y) {
      const z0 = a * x + b * y + c, g = Math.hypot(a, b);
      if (t.kind === 'ball') return z0 + t.R * (Math.sqrt(1 + g * g) - 1);
      if (t.kind === 'flat') return z0 + t.R * g;
      return Math.max(z0, z0 + t.R * g - t.R / Math.tan(t.alpha));
    },
  };
}

// profil radial (sfera / cilindru) de raza Rs peste podeaua z=0; d = distanta orizontala la axa
function radialCL(t, d, Rs) {
  const R = t.R; let z = -Infinity;
  if (t.kind === 'ball') { if (d <= Rs + R) z = Math.sqrt((Rs + R) ** 2 - d * d) - R; }
  else if (t.kind === 'flat') { if (d <= R) z = Rs; else if (d - R <= Rs) z = Math.sqrt(Rs * Rs - (d - R) ** 2); }
  else {
    const ca = Math.cos(t.alpha), sa = Math.sin(t.alpha), k = 1 / Math.tan(t.alpha);
    const rc = d - Rs * ca; // raza punctului de contact pe flanc
    if (rc <= 0) z = Math.sqrt(Math.max(0, Rs * Rs - d * d)); // contact in varf
    else if (rc <= R) z = (Rs - d * ca) / sa; // contact pe flanc
    else if (d - R <= Rs) z = Math.sqrt(Rs * Rs - (d - R) ** 2) - R * k; // contact pe muchia de la raza R
  }
  return Math.max(z, 0);
}
const zRad = (d, Rs) => (d < Rs ? Math.sqrt(Rs * Rs - d * d) : 0);

export function hemisphere(cx, cy, Rs) {
  return {
    name: `semisfera R${Rs}`,
    z: (x, y) => zRad(Math.hypot(x - cx, y - cy), Rs),
    cellMax: (x0, x1, y0, y1) => zRad(Math.hypot(clamp(cx, x0, x1) - cx, clamp(cy, y0, y1) - cy), Rs),
    cl: (t, x, y) => radialCL(t, Math.hypot(x - cx, y - cy), Rs),
    volume: (2 / 3) * Math.PI * Rs ** 3,
  };
}

// cilindru culcat, axa pe Y la x=cx; rasterul pe X traverseaza curbura
export function cylinderY(cx, Rc) {
  return {
    name: `cilindru R${Rc}`,
    z: (x) => zRad(Math.abs(x - cx), Rc),
    cellMax: (x0, x1) => zRad(Math.abs(clamp(cx, x0, x1) - cx), Rc),
    cl: (t, x) => radialCL(t, Math.abs(x - cx), Rc),
  };
}

// ---------- profile 1D pe bucati liniare (invariante pe Y): perete subtire, canal cu pereti la beta grade ----------
// pieces: [{x0,x1,z0,z1}] acoperind un interval; in afara: 0. CL exact: pe fiecare bucata f = S - rise(|x'-x|) e concava
// (S liniar, rise convex) => cautare ternara pe bucata, plus capetele. Nu imparte cod cu dilatarea pe grila.
export function piecewise1D(name, pieces) {
  const S = (x) => { let z = 0; for (const p of pieces) if (x >= p.x0 && x <= p.x1) { const t = p.x1 > p.x0 ? (x - p.x0) / (p.x1 - p.x0) : 0; z = Math.max(z, p.z0 + t * (p.z1 - p.z0)); } return z; };
  const segMax = (a, b) => { // max exact al lui S pe [a,b] (liniar pe bucati => capete + capetele bucatilor)
    let m = Math.max(S(a), S(b));
    for (const p of pieces) {
      if (p.x1 < a || p.x0 > b) continue;
      const lo = Math.max(a, p.x0), hi = Math.min(b, p.x1);
      const at = (x) => (p.x1 > p.x0 ? p.z0 + ((x - p.x0) / (p.x1 - p.x0)) * (p.z1 - p.z0) : Math.max(p.z0, p.z1));
      m = Math.max(m, at(lo), at(hi));
    }
    return m;
  };
  return {
    name,
    z: (x) => S(x),
    cellMax: (x0, x1) => segMax(x0, x1),
    cl(t, x) {
      let best = 0; // podeaua
      const L = x - t.R, H = x + t.R;
      for (const p of pieces) {
        let lo = Math.max(L, p.x0), hi = Math.min(H, p.x1);
        if (lo > hi) continue;
        const f = (u) => { const zz = p.x1 > p.x0 ? p.z0 + ((u - p.x0) / (p.x1 - p.x0)) * (p.z1 - p.z0) : Math.max(p.z0, p.z1); return zz - rise(t, Math.min(t.R, Math.abs(u - x))); };
        // concava pe [lo,hi]; separ in x (|u-x| are colt) pentru siguranta
        const parts = x > lo && x < hi ? [[lo, x], [x, hi]] : [[lo, hi]];
        for (let [a, b] of parts) {
          best = Math.max(best, f(a), f(b));
          for (let it = 0; it < 200 && b - a > 1e-13; it++) { const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3; if (f(m1) < f(m2)) a = m1; else b = m2; }
          best = Math.max(best, f((a + b) / 2));
        }
      }
      return best;
    },
  };
}

export function thinWall(xw, w, Hw) { return piecewise1D(`perete ${w} mm x ${Hw} mm`, [{ x0: xw, x1: xw + w, z0: Hw, z1: Hw }]); }

// canal cu fund de latime wb, pereti la betaDeg fata de orizontala, adancime Hg; platou Hg in jur (pana la +-span)
export function groove(xc, wb, betaDeg, Hg, span) {
  const run = betaDeg >= 89.999 ? 0 : Hg / Math.tan(betaDeg * DEG);
  const a = xc - wb / 2, b = xc + wb / 2;
  return piecewise1D(`canal ${betaDeg} grade`, [
    { x0: xc - span, x1: a - run, z0: Hg, z1: Hg },
    { x0: a - run, x1: a, z0: Hg, z1: 0 },
    { x0: b, x1: b + run, z0: 0, z1: Hg },
    { x0: b + run, x1: xc + span, z0: Hg, z1: Hg },
  ]);
}

// inel (platou cu gaura): inaltime Hp pentru r in [r1,r2]
export function annulus(cx, cy, r1, r2, Hp) {
  const dist = (x, y) => { const r = Math.hypot(x - cx, y - cy); return Math.max(0, r1 - r, r - r2); };
  return {
    name: `inel ${r1}-${r2} (gaura)`,
    z: (x, y) => (dist(x, y) === 0 ? Hp : 0),
    cellMax(x0, x1, y0, y1) { // celula atinge inelul daca dmin <= r2 si dmax >= r1
      const dmin = Math.hypot(clamp(cx, x0, x1) - cx, clamp(cy, y0, y1) - cy);
      const dmax = Math.hypot(Math.max(Math.abs(x0 - cx), Math.abs(x1 - cx)), Math.max(Math.abs(y0 - cy), Math.abs(y1 - cy)));
      return dmin <= r2 && dmax >= r1 ? Hp : 0;
    },
    cl(t, x, y) { const d = dist(x, y); return d <= t.R ? Math.max(0, Hp - rise(t, d)) : 0; },
  };
}
