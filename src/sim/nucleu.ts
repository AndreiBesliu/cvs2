/**
 * Nucleul de simulare (ADR 0010, ADR 0047 §2): pe fiecare celulă, EXACT, cât de jos ajunge suprafața sculei în timpul unei
 * mutări, fără eșantionare de-a lungul ei. Portat din sonda s4 (`docs/faza2/sonde/s4-simulare/cod/src/core.mjs`, §4.1),
 * pe atlasul din `camp.ts` și cu trigonometria deterministă din `unghi.ts`:
 * - linia 3D cu freza plată, bila sau V-ul: formă închisă, minimul unei funcții convexe pe intervalul în care scula
 *   acoperă celula; plonjarea verticală: discul sculei la Z-ul cel mai jos;
 * - arcul la Z constant, cu orice formă: distanța exactă de la celulă la arc (în deschiderea lui) sau la capete;
 * - elicea cu freza plată: intervalul exact de unghiuri în care scula acoperă celula; Z-ul e liniar în unghi, deci
 *   minimul e la un capăt al intersecției (`acos` și `atan2` pe celulă, ale noastre);
 * - linia înclinată cu toroidala (ADR 0303 §2): minimul funcției convexe m·s + h(√(s² + p²)), prin înjumătățirea derivatei
 *   (monotonă), cu un număr fix de pași;
 * - elicea cu bila și cu toroidala (ADR 0303 §2, felia 16.A↑e-2): pe ultima tură, pe fiecare bucată a cercului în care scula
 *   acoperă celula, minimul în distanța d (`eliceaRotunda`), cu un număr fix de pași.
 * Elicea cu V-ul n-are încă formă exactă: programul o refuză înainte (`program.ts`).
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
import { acosD, atan2D, cosD, tanD } from './unghi.ts';

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

/**
 * Silueta: felul (0 plată, 1 bilă, 2 V, 3 toroidală), raza, pătratul ei, panta V-ului și raza vârfului lui plat (ADR 0092;
 * 0 = ascuțit): h = k·max(0, r − a). La toroidală (ADR 0303 §2), `a` e raza discului plat (R − ρ), `rho` raza colțului:
 * h = 0 pe r ≤ a, ρ − √(ρ² − (r − a)²) dincolo.
 */
export type Silueta = {
  readonly fel: 0 | 1 | 2 | 3; readonly R: number; readonly R2: number; readonly k: number; readonly a: number; readonly rho: number;
};

export function silueta(s: DateScula): Silueta {
  const R = s.diametru / 2;
  const f = s.forma;
  if (f.tip === 'plata') return { fel: 0, R, R2: R * R, k: 0, a: 0, rho: 0 };
  if (f.tip === 'bila') return { fel: 1, R, R2: R * R, k: 0, a: 0, rho: 0 };
  if (f.tip === 'toroidala') return { fel: 3, R, R2: R * R, k: 0, a: R - f.raza, rho: f.raza };
  return { fel: 2, R, R2: R * R, k: 1 / tanD((f.unghi * Math.PI) / 360), a: (f.varf ?? 0) / 2, rho: 0 };
}

/** h(d), d în [0, R]. */
function H(T: Silueta, d: number): number {
  if (T.fel === 0) return 0;
  if (T.fel === 1) {
    const q = T.R2 - d * d;
    return T.R - Math.sqrt(q > 0 ? q : 0);
  }
  if (T.fel === 3) {
    if (d <= T.a) return 0;
    const e = d - T.a, q = T.rho * T.rho - e * e;
    return T.rho - Math.sqrt(q > 0 ? q : 0);
  }
  return d > T.a ? T.k * (d - T.a) : 0;
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
  if (T.fel === 3) {
    if (adanc >= T.rho) return T.R;
    const q = T.rho * T.rho - (T.rho - adanc) * (T.rho - adanc);
    return Math.min(T.R, T.a + Math.sqrt(q > 0 ? q : 0));
  }
  return Math.min(T.R, T.a + adanc / T.k);
}

/** Pașii înjumătățirii pe linia înclinată cu toroidala: intervalul (cel mult 2·R) ajunge sub 1e-15 mm. */
const PASI_TOROIDALA = 64;

/**
 * Linia înclinată cu toroidala (ADR 0303 §2): argumentul minimului lui F(s) = m·s + h(√(s² + p²)) pe [sa, sb] (s de-a lungul
 * mutării, în mm, față de proiecția celulei; p² = `perp2`). F e convexă (h convexă și nedescrescătoare, distanța convexă), deci
 * derivata F'(s) = m + h'(d)·s / d e nedescrescătoare: capetele, dacă derivata nu-și schimbă semnul pe interval, altfel
 * rădăcina ei, prin înjumătățire cu un număr fix de pași (doar + − × ÷ √: aceeași amprentă în Node și în browser). Pe orizontală
 * (m = 0) minimul e la s = 0, tăiat la interval.
 */
function minimToroidala(T: Silueta, m: number, perp2: number, sa: number, sb: number): number {
  if (m === 0) return sa > 0 ? sa : sb < 0 ? sb : 0;
  const a = T.a, rho2 = T.rho * T.rho;
  const deriv = (s: number): number => {
    const d = Math.sqrt(s * s + perp2);
    if (d <= a) return m;
    const e = d - a, q = rho2 - e * e;
    if (q <= 0) return s > 0 ? Infinity : s < 0 ? -Infinity : m;
    return m + (e / Math.sqrt(q)) * (s / d);
  };
  if (deriv(sa) >= 0) return sa;
  if (deriv(sb) <= 0) return sb;
  let lo = sa, hi = sb;
  for (let it = 0; it < PASI_TOROIDALA; it++) {
    const mij = (lo + hi) / 2;
    if (deriv(mij) < 0) lo = mij; else hi = mij;
  }
  return (lo + hi) / 2;
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
  const m = plonjare ? 0 : dz / L, fel = T.fel, k = T.k, k2 = k * k, m2 = m * m, va = T.a, va2 = va * va;
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
        } else if (fel === 3) {
          const sa = (ta - tp) * L, sb = (tb - tp) * L, sv = minimToroidala(T, m, perp2, sa, sb);
          zs = az + dz * tp + m * sv + H(T, Math.sqrt(sv * sv + perp2));
        } else {
          // z(s) + k·max(0, √(s² + p²) − a), convexă în s: minimul liber, apoi tăiat la [sa, sb]. Cu vârful plat (a > 0,
          // ADR 0092) și p < a, pe discul vârfului (|s| ≤ c, c = √(a² − p²)) funcția e liniară (panta m); punctul staționar al
          // conului, dacă iese în disc, se mută pe marginea lui din partea care coboară (acolo 0 e în subgradient).
          const sa = (ta - tp) * L, sb = (tb - tp) * L;
          let sv: number;
          if (m >= k) sv = sa;
          else if (m <= -k) sv = sb;
          else {
            sv = perp2 > 0 ? (-m * Math.sqrt(perp2)) / Math.sqrt(k2 - m2) : 0;
            if (perp2 < va2) {
              const c = Math.sqrt(va2 - perp2);
              if (sv < c && sv > -c) sv = m > 0 ? -c : m < 0 ? c : sv;
            }
          }
          if (sv < sa) sv = sa; else if (sv > sb) sv = sb;
          const rho = Math.sqrt(sv * sv + perp2);
          zs = az + dz * tp + m * sv + (rho > va ? k * (rho - va) : 0);
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
 * constant: exact pe celulă, pentru orice formă. Cu Z diferit la capete: elicea, cu freza plată, cu bila și cu toroidala.
 */
export function taieArc(
  F: Camp, T: Silueta, ax: number, ay: number, az: number, bx: number, by: number, bz: number,
  cx: number, cy: number, trig: boolean, S: number,
): void {
  const top = F.sus;
  if (az >= top && bz >= top) return;
  if (az !== bz) {
    if (T.fel === 0) eliceaPlata(F, T, ax, ay, az, bz, cx, cy, trig, S);
    else if (T.fel === 1 || T.fel === 3) eliceaRotunda(F, T, ax, ay, az, bz, cx, cy, trig, S);
    else throw new Error('elicea cu V-ul nu se simulează încă');
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

/** Pașii secțiunii de aur pe elicea rotundă: intervalul (cel mult R) se strânge cu 0,618 la fiecare pas, sub 1e-13 mm. */
const PASI_AUR = 64;
const AUR = 0.6180339887498949;

/**
 * Elicea cu bila sau cu toroidala, exact pe celulă (ADR 0303 §2, felia 16.A↑e-2). Bila e toroidala cu discul plat a = 0 și
 * raza colțului ρ = R. Celula e la distanța p de centrul elicei (raza r); când scula e la unghiul ψ față de celulă, distanța
 * dintre ele e d(ψ) = √(p² + r² − 2pr·cos ψ), iar cel mai jos punct al sculei e z(u) + h(d(ψ)).
 *
 * Urcarea se citește de la capăt (u' = S − u, unghiul celulei S − v), deci Z-ul scade mereu cu u (panta m < 0, pe radian).
 * Pe fiecare bucată a cercului în care scula acoperă celula (|ψ| ≤ α), latura de dinaintea trecerii peste celulă (ψ ≤ 0) doar
 * coboară, deci minimul ei e la capătul ei; pe latura de după (ψ ≥ 0), F(d) = h(d) + m·ψ(d), iar semnul lui F' e semnul lui
 * G(d) − |m|, cu G(d) = h'(d)·√((d² − (p − r)²)((p + r)² − d²)) / (2d) = dh/dψ, fără trigonometrie. G e crescătoare cât
 * scula acoperă celula doar pe o bucată din cerc, și crescătoare apoi descrescătoare când o acoperă de pe tot cercul (pe bilă,
 * pe hârtie: g'' are cel mult o rădăcină în cos ψ, pe ramura de după domeniu; pe toroidală, sonda din ADR 0303 §2); deci
 * mulțimea {G ≥ |m|} e un interval [d1, d2], iar minimul lui F e în d1 sau în capătul bucății. d1 vine prin înjumătățire, iar
 * maximul lui G (doar când G e sub |m| la capăt) prin secțiunea de aur, cu un număr fix de pași (doar + − × ÷ √, plus
 * `acosD` / `cosD` o dată pe candidat). Celulele de pe tururi mai vechi decât ultimele 2π sunt deja mai jos pe tura
 * următoare, deci se caută doar în fereastra [max(0, S − 2π), S].
 */
function eliceaRotunda(F: Camp, T: Silueta, ax: number, ay: number, az: number, bz: number, cx: number, cy: number, trig: boolean, S: number): void {
  const cell = F.celula, R = T.R, R2 = T.R2, top = F.sus, loc = F.loc, unif = F.uniforma, ntx = F.ntx, bn = F.banda.n, bw = F.banda.w;
  const va = T.fel === 1 ? 0 : T.a, rc = T.fel === 1 ? T.R : T.rho, rc2 = rc * rc;
  const rx = ax - cx, ry = ay - cy, r = Math.sqrt(rx * rx + ry * ry), th0 = atan2D(ry, rx);
  const dir = trig ? 1 : -1, urca = bz > az;
  const z0 = urca ? bz : az, dz = urca ? az - bz : bz - az, m = dz / S, mm = -m, zCapat = z0 + dz;
  const U0 = S > DOI_PI ? S - DOI_PI : 0;
  const ro = r + R, ri = r - R;
  const [j0, j1] = randuri(F, cy - ro, cy + ro);
  let atlas = F.atlas;
  // Pe celula curentă: A = p² + r², B = 2pr, δ = |p − r|, σ = p + r.
  let A = 0, B = 0, del = 0, sig = 0;
  const hp = (d: number): number => {
    if (d <= va) return 0;
    const e = d - va, q = rc2 - e * e;
    return q > 0 ? e / Math.sqrt(q) : Infinity;
  };
  const G = (d: number): number => {
    if (d <= 0) return 0;
    const h1 = hp(d);
    if (h1 === 0) return 0;
    const w = (d - del) * (d + del) * (sig - d) * (sig + d);
    if (h1 === Infinity) return Infinity;
    return w > 0 ? (h1 * Math.sqrt(w)) / (2 * d) : 0;
  };
  const dPsi = (psi: number): number => {
    const q = A - B * cosD(psi);
    return q > 0 ? Math.sqrt(q) : 0;
  };
  /** Primul d din [lo, hi] cu G(d) ≥ |m|, știind G(lo) < |m| ≤ G(hi) și G crescătoare acolo. */
  const prag = (lo: number, hi: number): number => {
    for (let it = 0; it < PASI_TOROIDALA; it++) {
      const mij = (lo + hi) / 2;
      if (G(mij) < mm) lo = mij; else hi = mij;
    }
    return (lo + hi) / 2;
  };
  for (let j = j0; j <= j1; j++) {
    if (bn > 1 && (j >> SH) % bn !== bw) continue;
    const py = F.y0 + (j + 0.5) * cell, wy = py - cy;
    if (wy * wy > ro * ro) continue;
    const xo = Math.sqrt(ro * ro - wy * wy);
    const xi = ri > 0 && wy * wy < ri * ri ? Math.sqrt(ri * ri - wy * wy) : -1;
    const roff = (j & M) << SH, trow = (j >> SH) * ntx;
    for (let parte = 0; parte < (xi >= 0 ? 2 : 1); parte++) {
      const xlo = xi < 0 || parte === 0 ? cx - xo : cx + xi, xhi = xi < 0 || parte === 1 ? cx + xo : cx - xi;
      let i0 = Math.floor((xlo - F.x0) / cell - 0.5) - 1, i1 = Math.ceil((xhi - F.x0) / cell - 0.5) + 1;
      if (i0 < 0) i0 = 0;
      if (i1 > F.nx - 1) i1 = F.nx - 1;
      let tcur = -1, d = -1, s = NEATINSA;
      for (let i = i0; i <= i1; i++) {
        const wx = F.x0 + (i + 0.5) * cell - cx, p2 = wx * wx + wy * wy, p = Math.sqrt(p2);
        const dmin = p > r ? p - r : r - p;
        if (dmin > R) continue;
        const tx = i >> SH;
        if (tx !== tcur) { tcur = tx; d = trow + tx; s = loc[d]!; }
        const kq = roff | (i & M);
        const cur = s >= 0 ? atlas[(s << SH2) | kq]! : s === NEATINSA ? top : unif[d]!;
        // Cel mai jos punct posibil: Z-ul capătului, cu scula cât mai aproape de celulă.
        if (zCapat + H(T, dmin) >= cur) continue;
        let zs = Infinity;
        A = p2 + r * r; B = 2 * p * r; del = dmin; sig = p + r;
        if (B <= 1e-12) {
          // Celula în centrul elicei (sau elicea de rază 0): distanța nu se schimbă, deci cel mai jos e la capăt.
          const dd = Math.sqrt(A);
          if (dd <= R) zs = zCapat + H(T, dd);
        } else {
          const C = (A - R2) / B;
          const plin = C <= -1, al = plin ? Math.PI : acosD(C);
          let v = dir * (atan2D(wy, wx) - th0);
          v = v - DOI_PI * Math.floor(v / DOI_PI);
          if (urca) { v = S - v; v = v - DOI_PI * Math.floor(v / DOI_PI); }
          const kmin = Math.ceil((U0 - al - v) / DOI_PI), kmax = Math.floor((S + al - v) / DOI_PI);
          for (let k = kmin; k <= kmax; k++) {
            const c = v + DOI_PI * k;
            const pa = U0 - c > -al ? U0 - c : -al, pb = S - c < al ? S - c : al;
            if (pa > pb) continue;
            if (pb <= 0) {
              const z = z0 + m * (c + pb) + H(T, dPsi(pb));
              if (z < zs) zs = z;
              continue;
            }
            // Latura de după trecere: ψ în [ψL, pb], d în [dL, dR].
            const pL = pa > 0 ? pa : 0;
            const dL = pL === 0 ? del : dPsi(pL);
            let dR = pb === al && !plin ? R : dPsi(pb);
            if (dR < dL) dR = dL;
            const zR = z0 + m * (c + pb) + H(T, dR);
            if (zR < zs) zs = zR;
            const gL = G(dL);
            let d1 = -1;
            if (gL >= mm) d1 = dL;
            else if (G(dR) >= mm) d1 = prag(dL, dR);
            else {
              // G sub |m| la ambele capete: urcă peste |m| doar dacă maximul lui e peste (secțiunea de aur).
              let lo = dL, hi = dR, x1 = hi - AUR * (hi - lo), x2 = lo + AUR * (hi - lo), g1 = G(x1), g2 = G(x2);
              for (let it = 0; it < PASI_AUR; it++) {
                if (g1 <= g2) { lo = x1; x1 = x2; g1 = g2; x2 = lo + AUR * (hi - lo); g2 = G(x2); }
                else { hi = x2; x2 = x1; g2 = g1; x1 = hi - AUR * (hi - lo); g1 = G(x1); }
              }
              const dS = g1 >= g2 ? x1 : x2;
              if ((g1 >= g2 ? g1 : g2) >= mm) d1 = prag(dL, dS);
            }
            if (d1 >= 0) {
              const ps = d1 === dL ? pL : acosD((A - d1 * d1) / B);
              const z = z0 + m * (c + ps) + H(T, d1);
              if (z < zs) zs = z;
            }
          }
        }
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
