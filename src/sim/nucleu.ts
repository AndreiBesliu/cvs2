/**
 * Nucleul de simulare (ADR 0010, ADR 0047 §2): pe fiecare celulă, EXACT, cât de jos ajunge suprafața sculei în timpul unei
 * mutări, fără eșantionare de-a lungul ei. Portat din sonda s4 (`docs/faza2/sonde/s4-simulare/cod/src/core.mjs`, §4.1),
 * pe atlasul din `camp.ts` și cu trigonometria deterministă din `unghi.ts`:
 * - linia 3D cu freza plată, bila sau V-ul: formă închisă, minimul unei funcții convexe pe intervalul în care scula
 *   acoperă celula; plonjarea verticală: discul sculei la Z-ul cel mai jos;
 * - arcul la Z constant, cu orice formă: distanța exactă de la celulă la arc (în deschiderea lui) sau la capete;
 * - elicea cu freza plată: intervalul exact de unghiuri în care scula acoperă celula; Z-ul e liniar în unghi, deci
 *   minimul e la un capăt al intersecției (`acos` și `atan2` pe celulă, ale noastre).
 * Elicea cu bila sau cu V-ul n-are încă formă exactă: programul o refuză înainte (`program.ts`).
 *
 * Scula e o siluetă h(r) ≥ 0, nedescrescătoare, cu h(0) = 0: înălțimea muchiei deasupra vârfului la raza r ≤ R. Peste R,
 * coada sculei e un cilindru: peretele. Fără subtăieri (limita oricărui câmp de înălțimi).
 *
 * Determinismul (ADR 0047 §6): în bucla pe celulă doar + − × ÷ √ min max și funcțiile din `unghi.ts`; o celulă e scrisă
 * doar de banda ei; „cea mai adâncă tăietură câștigă” face rezultatul independent de ordinea mutărilor și de numărul de
 * benzi (minimul valorilor rotunjite la Float32 e rotunjirea minimului).
 */
import type { FormaScula } from '../ir/ir.ts';
import { alocaDala, M, NEATINSA, SH, SH2, type Camp } from './camp.ts';
import { acosD, atan2D, tanD } from './unghi.ts';

/** Mutările nucleului: câte 10 numere, [fel, ax, ay, az, bx, by, bz, cx, cy, baleiaj]. Felul: 0 linie, 2 arc orar, 3 arc trigonometric. */
export const STRIDE = 10;
export const LINIE = 0;
export const ARC_ORAR = 2;
export const ARC_TRIG = 3;

const DOI_PI = 6.283185307179586;

/** Scula ca date (o primește workerul): forma și diametrul. */
export type DateScula = { readonly forma: FormaScula; readonly diametru: number };

/** Mutările unei scule (ADR 0084): după o schimbare, aceeași foaie se taie mai departe cu alta. */
export type GrupSimulare = { readonly scula: DateScula; readonly mutari: Float64Array };

/** Silueta: felul (0 plată, 1 bilă, 2 V), raza, pătratul ei și panta V-ului (h = k·r). */
export type Silueta = { readonly fel: 0 | 1 | 2; readonly R: number; readonly R2: number; readonly k: number };

export function silueta(s: DateScula): Silueta {
  const R = s.diametru / 2;
  const f = s.forma;
  if (f.tip === 'plata') return { fel: 0, R, R2: R * R, k: 0 };
  if (f.tip === 'bila') return { fel: 1, R, R2: R * R, k: 0 };
  return { fel: 2, R, R2: R * R, k: 1 / tanD((f.unghi * Math.PI) / 360) };
}

/** h(d), d în [0, R]. */
function H(T: Silueta, d: number): number {
  if (T.fel === 0) return 0;
  if (T.fel === 1) {
    const q = T.R2 - d * d;
    return T.R - Math.sqrt(q > 0 ? q : 0);
  }
  return T.k * d;
}

/** Raza până la care scula mai coboară sub fața plăcii, cu vârful la `adanc` sub ea. */
export function raza(T: Silueta, adanc: number): number {
  if (adanc <= 0) return 0;
  if (T.fel === 0) return T.R;
  if (T.fel === 1) {
    if (adanc >= T.R) return T.R;
    const q = T.R2 - (T.R - adanc) * (T.R - adanc);
    return Math.min(T.R, Math.sqrt(q > 0 ? q : 0));
  }
  return Math.min(T.R, adanc / T.k);
}

/** Primul și ultimul rând de celule de scris, tăiate la câmp. */
function randuri(F: Camp, ymin: number, ymax: number): readonly [number, number] {
  let j0 = Math.floor((ymin - F.y0) / F.celula - 0.5), j1 = Math.ceil((ymax - F.y0) / F.celula - 0.5);
  if (j0 < 0) j0 = 0;
  if (j1 > F.ny - 1) j1 = F.ny - 1;
  return [j0, j1];
}

/** Linia 3D (G0 / G1) de la A la B. */
export function taieLinie(F: Camp, T: Silueta, ax: number, ay: number, az: number, bx: number, by: number, bz: number): void {
  const top = F.sus;
  if (az >= top && bz >= top) return;
  const cell = F.celula, R = T.R, R2 = T.R2, loc = F.loc, unif = F.uniforma, ntx = F.ntx, bn = F.banda.n, bw = F.banda.w;
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const L2 = dx * dx + dy * dy, L = Math.sqrt(L2), plonjare = L2 < 1e-18;
  const m = plonjare ? 0 : dz / L, fel = T.fel, k = T.k, k2 = k * k, m2 = m * m;
  const invL2 = plonjare ? 0 : 1 / L2, invL = plonjare ? 0 : 1 / L, mBila = -m / Math.sqrt(1 + m2);
  const zlo = az < bz ? az : bz;
  // Căutarea e limitată la raza efectivă (mai departe scula nu coboară sub față); calculul pe celulă rămâne exact.
  const Re = raza(T, top - zlo) * (1 + 1e-12) + 1e-9, Re2 = Re * Re;
  const [j0, j1] = randuri(F, (ay < by ? ay : by) - Re, (ay > by ? ay : by) + Re);
  const xmin = (ax < bx ? ax : bx) - Re, xmax = (ax > bx ? ax : bx) + Re;
  let atlas = F.atlas;
  for (let j = j0; j <= j1; j++) {
    if (bn > 1 && (j >> SH) % bn !== bw) continue;
    const py = F.y0 + (j + 0.5) * cell;
    // Intervalul x al capsulei pe rând (un superset, cu o celulă în plus); calculul exact e pe celulă.
    let xlo = xmax, xhi = xmin;
    const ea = py - ay, eb = py - by;
    if (ea * ea <= Re2) { const w = Math.sqrt(Re2 - ea * ea); if (ax - w < xlo) xlo = ax - w; if (ax + w > xhi) xhi = ax + w; }
    if (eb * eb <= Re2) { const w = Math.sqrt(Re2 - eb * eb); if (bx - w < xlo) xlo = bx - w; if (bx + w > xhi) xhi = bx + w; }
    if (!plonjare) {
      // Banda dreptunghiulară: 0 ≤ (P − A)·D ≤ L² și |(P − A) × D| ≤ Re·L, liniare în x.
      let lo = xmin, hi = xmax;
      if (dx !== 0) {
        const p = (-ea * dy) / dx, q = (L2 - ea * dy) / dx;
        lo = Math.max(lo, Math.min(p, q) + ax); hi = Math.min(hi, Math.max(p, q) + ax);
      } else if (ea * dy < 0 || ea * dy > L2) { lo = 1; hi = 0; }
      if (dy !== 0) {
        const p = (-Re * L + ea * dx) / dy, q = (Re * L + ea * dx) / dy;
        lo = Math.max(lo, Math.min(p, q) + ax); hi = Math.min(hi, Math.max(p, q) + ax);
      } else if (Math.abs(ea) > Re) { lo = 1; hi = 0; }
      else { lo = Math.max(lo, xmin); hi = Math.min(hi, xmax); }
      if (lo <= hi) { if (lo < xlo) xlo = lo; if (hi > xhi) xhi = hi; }
    }
    if (xlo > xhi) continue;
    let i0 = Math.floor((xlo - F.x0) / cell - 0.5) - 1, i1 = Math.ceil((xhi - F.x0) / cell - 0.5) + 1;
    if (i0 < 0) i0 = 0;
    if (i1 > F.nx - 1) i1 = F.nx - 1;
    const roff = (j & M) << SH, trow = (j >> SH) * ntx;
    let tcur = -1, d = -1, s = NEATINSA;
    for (let i = i0; i <= i1; i++) {
      const tx = i >> SH;
      if (tx !== tcur) { tcur = tx; d = trow + tx; s = loc[d]!; }
      const kk = roff | (i & M);
      const cur = s >= 0 ? atlas[(s << SH2) | kk]! : s === NEATINSA ? top : unif[d]!;
      const px = F.x0 + (i + 0.5) * cell;
      const ex = px - ax, ey = py - ay;
      let zs: number;
      if (plonjare) {
        const q = ex * ex + ey * ey;
        if (q > R2) continue;
        zs = zlo + H(T, Math.sqrt(q));
      } else {
        const cr = ex * dy - ey * dx, perp2 = cr * cr * invL2;
        if (perp2 > R2) continue;
        if (cur <= zlo) continue; // celula e deja mai adâncă decât orice punct al sculei pe mutarea asta
        const tp = (ex * dx + ey * dy) * invL2;
        const srho = Math.sqrt(R2 - perp2), half = srho * invL;
        let ta = tp - half, tb = tp + half;
        if (ta < 0) ta = 0;
        if (tb > 1) tb = 1;
        if (ta > tb) continue;
        if (fel === 0) {
          zs = az + dz * (dz > 0 ? ta : tb);
        } else if (fel === 1) {
          const rho2 = R2 - perp2, sa = (ta - tp) * L, sb = (tb - tp) * L;
          let sv = mBila * srho;
          if (sv < sa) sv = sa; else if (sv > sb) sv = sb;
          const q = rho2 - sv * sv;
          zs = az + dz * tp + m * sv + R - Math.sqrt(q > 0 ? q : 0);
        } else {
          const sa = (ta - tp) * L, sb = (tb - tp) * L;
          let sv: number;
          if (m >= k) sv = sa;
          else if (m <= -k) sv = sb;
          else sv = perp2 > 0 ? (-m * Math.sqrt(perp2)) / Math.sqrt(k2 - m2) : 0;
          if (sv < sa) sv = sa; else if (sv > sb) sv = sb;
          zs = az + dz * tp + m * sv + k * Math.sqrt(sv * sv + perp2);
        }
      }
      if (zs < cur) {
        if (s < 0) { s = alocaDala(F, d); atlas = F.atlas; }
        atlas[(s << SH2) | kk] = zs;
      }
    }
  }
}

/**
 * Arcul în planul XY, de la A la B în jurul lui C, cu baleiajul `S` (> 0, în radiani; ≥ 2π = cercul întreg). La Z
 * constant: exact pe celulă, pentru orice formă. Cu Z diferit la capete: elicea, doar cu freza plată.
 */
export function taieArc(
  F: Camp, T: Silueta, ax: number, ay: number, az: number, bx: number, by: number, bz: number,
  cx: number, cy: number, trig: boolean, S: number,
): void {
  const top = F.sus;
  if (az >= top && bz >= top) return;
  if (az !== bz) {
    if (T.fel !== 0) throw new Error('elicea cu bila sau cu V-ul nu se simulează încă');
    eliceaPlata(F, T, ax, ay, az, bz, cx, cy, trig, S);
    return;
  }
  // Arcul orar de la A la B e arcul trigonometric de la B la A.
  if (!trig) { let t = ax; ax = bx; bx = t; t = ay; ay = by; by = t; }
  const z = az, cell = F.celula, R = T.R, loc = F.loc, unif = F.uniforma, ntx = F.ntx, bn = F.banda.n, bw = F.banda.w;
  const ux = ax - cx, uy = ay - cy, vx = bx - cx, vy = by - cy;
  const r = Math.sqrt(ux * ux + uy * uy);
  const plin = S >= DOI_PI, mare = !plin && S > Math.PI;
  const inauntru = (wx: number, wy: number): boolean => {
    if (plin) return true;
    const c0 = ux * wy - uy * wx, c1 = wx * vy - wy * vx;
    if (!mare) return c0 >= 0 && c1 >= 0;
    return !(vx * wy - vy * wx > 0 && wx * uy - wy * ux > 0);
  };
  // Cutia arcului (capetele și extremele de pe axe din deschiderea lui), dilatată cu raza efectivă.
  let bx0 = Math.min(ax, bx), bx1 = Math.max(ax, bx), by0 = Math.min(ay, by), by1 = Math.max(ay, by);
  if (inauntru(1, 0)) bx1 = cx + r;
  if (inauntru(-1, 0)) bx0 = cx - r;
  if (inauntru(0, 1)) by1 = cy + r;
  if (inauntru(0, -1)) by0 = cy - r;
  const Re = raza(T, top - z) * (1 + 1e-12) + 1e-9;
  bx0 -= Re; bx1 += Re; by0 -= Re; by1 += Re;
  const ro = r + Re, ri = r - Re;
  const [j0, j1] = randuri(F, by0, by1);
  let atlas = F.atlas;
  for (let j = j0; j <= j1; j++) {
    if (bn > 1 && (j >> SH) % bn !== bw) continue;
    const py = F.y0 + (j + 0.5) * cell, ey = py - cy;
    if (ey * ey > ro * ro) continue;
    const xo = Math.sqrt(ro * ro - ey * ey);
    const xi = ri > 0 && ey * ey < ri * ri ? Math.sqrt(ri * ri - ey * ey) : -1;
    const roff = (j & M) << SH, trow = (j >> SH) * ntx;
    for (let parte = 0; parte < (xi >= 0 ? 2 : 1); parte++) {
      let xlo: number, xhi: number;
      if (xi < 0) { xlo = cx - xo; xhi = cx + xo; }
      else if (parte === 0) { xlo = cx - xo; xhi = cx - xi; }
      else { xlo = cx + xi; xhi = cx + xo; }
      if (xlo < bx0) xlo = bx0;
      if (xhi > bx1) xhi = bx1;
      if (xlo > xhi) continue;
      let i0 = Math.floor((xlo - F.x0) / cell - 0.5) - 1, i1 = Math.ceil((xhi - F.x0) / cell - 0.5) + 1;
      if (i0 < 0) i0 = 0;
      if (i1 > F.nx - 1) i1 = F.nx - 1;
      let tcur = -1, d = -1, s = NEATINSA;
      for (let i = i0; i <= i1; i++) {
        const px = F.x0 + (i + 0.5) * cell, wx = px - cx;
        let dist: number;
        if (inauntru(wx, ey)) dist = Math.abs(Math.sqrt(wx * wx + ey * ey) - r);
        else {
          const qa = (px - ax) * (px - ax) + (py - ay) * (py - ay), qb = (px - bx) * (px - bx) + (py - by) * (py - by);
          dist = Math.sqrt(qa < qb ? qa : qb);
        }
        if (dist > R) continue;
        const zs = z + H(T, dist);
        const tx = i >> SH;
        if (tx !== tcur) { tcur = tx; d = trow + tx; s = loc[d]!; }
        const kk = roff | (i & M);
        const cur = s >= 0 ? atlas[(s << SH2) | kk]! : s === NEATINSA ? top : unif[d]!;
        if (zs < cur) {
          if (s < 0) { s = alocaDala(F, d); atlas = F.atlas; }
          atlas[(s << SH2) | kk] = zs;
        }
      }
    }
  }
}

/**
 * Elicea cu freza plată, exact pe celulă: pe cercul traseului, unghiurile la care scula acoperă celula formează un
 * interval [φ − α, φ + α] (φ = unghiul celulei, cos α din legea cosinusului); Z-ul e liniar în unghiul parcurs, deci
 * cel mai jos punct e la un capăt al intersecției intervalului cu [0, S].
 */
function eliceaPlata(F: Camp, T: Silueta, ax: number, ay: number, az: number, bz: number, cx: number, cy: number, trig: boolean, S: number): void {
  const cell = F.celula, R = T.R, R2 = T.R2, top = F.sus, loc = F.loc, unif = F.uniforma, ntx = F.ntx, bn = F.banda.n, bw = F.banda.w;
  const rx = ax - cx, ry = ay - cy, r = Math.sqrt(rx * rx + ry * ry), th0 = atan2D(ry, rx);
  const dir = trig ? 1 : -1, dz = bz - az;
  const ro = r + R, ri = r - R;
  const [j0, j1] = randuri(F, cy - ro, cy + ro);
  let atlas = F.atlas;
  for (let j = j0; j <= j1; j++) {
    if (bn > 1 && (j >> SH) % bn !== bw) continue;
    const py = F.y0 + (j + 0.5) * cell, wy = py - cy;
    if (wy * wy > ro * ro) continue;
    const xo = Math.sqrt(ro * ro - wy * wy);
    // Inelul, nu tot discul: pe un cerc mare, interiorul (ρ < r − R) nu e atins (recenzia 19.10: 80 ms → câțiva ms la r = 500).
    const xi = ri > 0 && wy * wy < ri * ri ? Math.sqrt(ri * ri - wy * wy) : -1;
    const roff = (j & M) << SH, trow = (j >> SH) * ntx;
    for (let parte = 0; parte < (xi >= 0 ? 2 : 1); parte++) {
      const xlo = xi < 0 || parte === 0 ? cx - xo : cx + xi, xhi = xi < 0 || parte === 1 ? cx + xo : cx - xi;
      let i0 = Math.floor((xlo - F.x0) / cell - 0.5) - 1, i1 = Math.ceil((xhi - F.x0) / cell - 0.5) + 1;
      if (i0 < 0) i0 = 0;
      if (i1 > F.nx - 1) i1 = F.nx - 1;
      let tcur = -1, d = -1, s = NEATINSA;
      for (let i = i0; i <= i1; i++) {
        const wx = F.x0 + (i + 0.5) * cell - cx, rho2 = wx * wx + wy * wy, rho = Math.sqrt(rho2);
        if (rho > ro || (ri > 0 && rho < ri)) continue;
        const C = rho > 1e-12 ? (rho2 + r * r - R2) / (2 * rho * r) : (r <= R ? -2 : 2);
        if (C > 1) continue;
        let u: number;
        if (C <= -1) u = dz < 0 ? S : 0;
        else {
          const al = acosD(C);
          let v = dir * (atan2D(wy, wx) - th0);
          v = v - DOI_PI * Math.floor(v / DOI_PI);
          u = -1;
          for (let kk = -1; kk <= 1; kk++) {
            const lo = Math.max(0, v - al + DOI_PI * kk), hi = Math.min(S, v + al + DOI_PI * kk);
            if (lo > hi) continue;
            const cand = dz < 0 ? hi : lo;
            if (u < 0 || (dz < 0 ? cand > u : cand < u)) u = cand;
          }
          if (u < 0) continue;
        }
        const zs = az + (dz * u) / S;
        const tx = i >> SH;
        if (tx !== tcur) { tcur = tx; d = trow + tx; s = loc[d]!; }
        const kq = roff | (i & M);
        const cur = s >= 0 ? atlas[(s << SH2) | kq]! : s === NEATINSA ? top : unif[d]!;
        if (zs < cur) {
          if (s < 0) { s = alocaDala(F, d); atlas = F.atlas; }
          atlas[(s << SH2) | kq] = zs;
        }
      }
    }
  }
}

/** Toate mutările, în ordine, pe câmpul dat (doar în rândurile benzii lui). */
export function ruleaza(F: Camp, scula: DateScula, mutari: Float64Array): void {
  const T = silueta(scula);
  const n = mutari.length / STRIDE;
  for (let q = 0; q < n; q++) {
    const o = q * STRIDE, fel = mutari[o]!;
    if (fel === LINIE) taieLinie(F, T, mutari[o + 1]!, mutari[o + 2]!, mutari[o + 3]!, mutari[o + 4]!, mutari[o + 5]!, mutari[o + 6]!);
    else {
      taieArc(F, T, mutari[o + 1]!, mutari[o + 2]!, mutari[o + 3]!, mutari[o + 4]!, mutari[o + 5]!, mutari[o + 6]!,
        mutari[o + 7]!, mutari[o + 8]!, fel === ARC_TRIG, mutari[o + 9]!);
    }
  }
}
