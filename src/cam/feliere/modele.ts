/**
 * Modelele de umplere care nu sunt simple linii paralele (felia 3.6k, ADR 0191 §3b), portate din OrcaSlicer (`src/libslic3r/
 * Fill/`, la `9005b64`): liniile oscilante (`FillLine`), fagurele (`FillHoneycomb`), giroidul (`FillGyroid`, undele), hașura
 * în cruce (`FillCrossHatch`), curba Hilbert, coardele lui Arhimede și spirala octogramă (`FillPlanePath`). Fiecare dă
 * polilinii (x, y, …) în coordonatele patului, tăiate de regiune (par-impar); ordinea lor o face cine le cere.
 *
 * Unitățile: mm și grade. `sp` e pasul liniilor la 100 % (`pas(w, h)`), `d` densitatea (0–1], `unghi` direcția de bază.
 */
import { taiePolilinie } from './linii.ts';

type Poligoane = readonly ArrayLike<number>[];

/** Rotirea punctelor (x, y, …) cu unghiul dat (grade), în jurul punctului (cx, cy). */
export function rotit(p: ArrayLike<number>, unghi: number, cx = 0, cy = 0): number[] {
  const u = (unghi * Math.PI) / 180, co = Math.cos(u), si = Math.sin(u), r: number[] = [];
  for (let i = 0; i < p.length; i += 2) { const x = p[i]! - cx, y = p[i + 1]! - cy; r.push(cx + x * co - y * si, cy + x * si + y * co); }
  return r;
}

/** Cutia poligoanelor: [x0, y0, x1, y1]. */
function cutie(pol: Poligoane): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of pol) for (let i = 0; i < q.length; i += 2) { x0 = Math.min(x0, q[i]!); x1 = Math.max(x1, q[i]!); y0 = Math.min(y0, q[i + 1]!); y1 = Math.max(y1, q[i + 1]!); }
  return [x0, y0, x1, y1];
}

/** Poliliniile generate într-un reper rotit cu `unghi`, aduse înapoi în reperul patului și tăiate de regiune. */
function inapoi(linii: readonly number[][], unghi: number, pol: Poligoane): number[][] {
  return linii.flatMap((l) => taiePolilinie(unghi === 0 ? l : rotit(l, unghi), pol));
}

/**
 * Liniile oscilante (`line`): linii la pasul sp / d, una din două înclinată cu `pasul − sp` de la un capăt la celălalt al
 * piesei; capetele, prelungite cu 0,3 · sp peste marginea regiunii (spre pereți), ca OrcaSlicer.
 */
export function oscilante(pol: Poligoane, unghi: number, sp: number, d: number): number[][] {
  const a = unghi + 90;
  const rot = pol.map((q) => rotit(q, -a));
  const [, y0, , y1] = cutie(rot);
  const [x0, , x1] = cutie(rot);
  const ls = sp / d, osc = ls - sp, extra = 0.3 * sp;
  const linii: number[][] = [];
  // Linia de la (x − o, y0) la (x + o, y1), prelungită cu 1 mm la ambele capete (pe aceeași dreaptă), ca tăietura s-o prindă.
  const e = 1 / Math.max(y1 - y0, 1e-9);
  for (let k = Math.floor(x0 / ls); k * ls <= x1 + 1e-9; k++) {
    const o = Math.abs(k) % 2 === 1 ? osc : 0, x = k * ls;
    for (const b of taiePolilinie([x - o - 2 * o * e, y0 - 1, x + o + 2 * o * e, y1 + 1], rot)) {
      // Capetele, prelungite pe y (în reperul liniilor), ca `FillLine`.
      const [ax, ay, bx, by] = [b[0]!, b[1]!, b[b.length - 2]!, b[b.length - 1]!];
      const [jx, jy, sx, sy] = ay <= by ? [ax, ay, bx, by] : [bx, by, ax, ay];
      linii.push(rotit([jx, jy - extra, sx, sy + extra], a));
    }
  }
  return linii;
}

/** Fagurele (`honeycomb`): coloane în zigzag care închid hexagoane, la distanța sp / d; direcția, cu alternarea stratului. */
export function fagure(pol: Poligoane, unghi: number, sp: number, d: number): number[][] {
  const a = unghi + 90;
  const distanta = sp / d, latura = distanta / (Math.sqrt(3) / 2), latime = 2 * distanta;
  const inaltime = 3 * latura, scurt = (distanta * Math.sqrt(3)) / 3, dx = sp / 2, dy = (dx * Math.sqrt(3)) / 3;
  const cx = latime / 2, cy = latura;
  // Cutia regiunii, rotită în jurul centrului hexagonului, aliniată la grila modelului.
  const [bx0, by0, bx1, by1] = cutie([rotit([...cutieColturi(pol)], a, cx, cy)]);
  const x0 = Math.min(bx0, Math.floor(bx0 / latime) * latime), y0 = Math.min(by0, Math.floor(by0 / inaltime) * inaltime);
  const linii: number[][] = [];
  for (let x = x0; x <= bx1;) {
    let p: number[] = [];
    let ax = [x + dx, x + distanta - dx];
    for (let i = 0; i < 2; i++) {
      p = invers(p);
      for (let y = y0; y <= by1; y += scurt + latura + scurt + latura) {
        p.push(ax[1]!, y + dy, ax[0]!, y + scurt - dy, ax[0]!, y + scurt + latura + dy, ax[1]!, y + scurt + latura + scurt - dy,
          ax[1]!, y + scurt + latura + scurt + latura + dy);
      }
      ax = [ax[1]! + distanta, ax[0]! + distanta];
      x += distanta;
    }
    linii.push(rotit(p, -a, cx, cy));
  }
  return linii.flatMap((l) => taiePolilinie(l, pol));
}

const cutieColturi = (pol: Poligoane): number[] => { const [x0, y0, x1, y1] = cutie(pol); return [x0, y0, x1, y0, x1, y1, x0, y1]; };
const invers = (p: number[]): number[] => { const r: number[] = []; for (let i = p.length - 2; i >= 0; i -= 2) r.push(p[i]!, p[i + 1]!); return r; };

/** Funcția undei giroidului (`FillGyroid.cpp`, `f`): înălțimea undei la x, pe secțiunea z. */
function undaGiroid(x: number, zs: number, zc: number, vertical: boolean, flip: boolean): number {
  if (vertical) {
    const faza = (zc < 0 ? Math.PI : 0) + Math.PI;
    const a = Math.sin(x + faza), b = -zc, rez = zs * Math.cos(x + faza + (flip ? Math.PI : 0)), r = Math.hypot(a, b);
    return Math.asin(a / r) + Math.asin(rez / r) + Math.PI;
  }
  const faza = zs < 0 ? Math.PI : 0;
  const a = Math.cos(x + faza), b = -zs, rez = zc * Math.sin(x + faza + (flip ? 0 : Math.PI)), r = Math.hypot(a, b);
  return Math.asin(a / r) + Math.asin(rez / r) + 0.5 * Math.PI;
}

/** O perioadă a undei (0 … 2π), subîmpărțită cât abaterea trece de toleranță (`make_one_period`). */
function perioadaGiroid(zc: number, zs: number, vertical: boolean, flip: boolean, tol: number): [number, number][] {
  const p: [number, number][] = [];
  for (let x = 0; x < 2 * Math.PI - 1e-9; x += Math.PI / 2) p.push([x, undaGiroid(x, zs, zc, vertical, flip)]);
  p.push([2 * Math.PI, undaGiroid(2 * Math.PI, zs, zc, vertical, flip)]);
  for (let pas = 0; pas < 20; pas++) {
    const n = p.length;
    for (let i = 1; i < n; i++) {
      const [lx, ly] = p[i - 1]!, [rx, ry] = p[i]!;
      const x = lx + (rx - lx) / 2, y = undaGiroid(x, zs, zc, vertical, flip);
      if (Math.abs((x - lx) * (y - ry) - (y - ly) * (x - rx)) > tol * tol) p.push([x, y]);
    }
    if (p.length === n) break;
    p.sort((a, b) => a[0] - b[0]);
  }
  return p;
}

/**
 * Giroidul (`gyroid`): undele secțiunii giroidului la înălțimea z, la pasul sp / (2,44 · d), pe direcția unghi − 45°; de la un
 * strat la altul undele se mută (și se întorc pe verticală), deci umplerea e una 3D.
 */
export function giroid(pol: Poligoane, unghi: number, sp: number, d: number, z: number): number[][] {
  const ua = unghi - 45;
  const rot = ua === 0 ? pol : pol.map((q) => rotit(q, -ua));
  const dA = Math.max(1e-6, d * 2.44);
  const distanta = sp / dA, scala = sp / dA;
  let [x0, y0, x1, y1] = cutie(rot);
  const pasO = 2 * Math.PI * distanta;
  const ox = Math.floor(x0 / pasO) * pasO - 10 * sp, oy = Math.floor(y0 / pasO) * pasO - 10 * sp;
  x0 -= sp; y0 -= sp; x1 += sp; y1 += sp;
  const tol = Math.min(sp / 2, 0.2) / scala;
  const zz = z / scala, zs = Math.sin(zz), zc = Math.cos(zz);
  const vertical = Math.abs(zs) <= Math.abs(zc);
  let lo = [(x0 - ox) / scala, (y0 - oy) / scala], hi = [(x1 - ox) / scala, (y1 - oy) / scala];
  let jos = 0, flip = true;
  if (vertical) { flip = false; jos = -Math.PI; lo = [lo[1]!, lo[0]!]; hi = [hi[1]!, hi[0]!]; }
  const impar = perioadaGiroid(zc, zs, vertical, flip, tol), par = perioadaGiroid(zc, zs, vertical, !flip, tol);
  let fmin = Infinity, fmax = -Infinity;
  for (const q of [impar, par]) for (const [, y] of q) { fmin = Math.min(fmin, y); fmax = Math.max(fmax, y); }
  const linii: number[][] = [];
  for (let i = Math.ceil((lo[1]! - fmax - jos) / Math.PI); jos + i * Math.PI + fmin <= hi[1]!; i++) {
    const per = i % 2 === 0 ? impar : par, perioada = per[per.length - 1]![0], n = per.length - 1;
    let px = Math.floor(lo[0]! / perioada) * perioada, j = 0;
    while (j + 1 < n && px + per[j + 1]![0] <= lo[0]!) j++;
    const l: number[] = [];
    for (let pas = 0; pas < 1e6; pas++) {
      let x = px + per[j]![0], y = per[j]![1] + jos + i * Math.PI;
      const ultim = x >= hi[0]!;
      if (vertical) [x, y] = [y, x];
      l.push(ox + x * scala, oy + y * scala);
      if (ultim) break;
      if (++j === n) { j = 0; px += perioada; }
    }
    linii.push(l);
  }
  return inapoi(linii, ua, pol);
}

/** Hașura în cruce (`crosshatch`): straturi de linii drepte, apoi tranziții în zigzag spre direcția cealaltă, după z. */
export function crosshatch(pol: Poligoane, unghi: number, sp: number, d: number, z: number): number[][] {
  const rot = unghi === 0 ? pol : pol.map((q) => rotit(q, -unghi));
  let ls = sp / d;
  if (d < 0.999) ls *= 1.08;
  let [x0, y0, x1, y1] = cutie(rot);
  x0 = Math.min(x0, Math.floor(x0 / (4 * ls)) * 4 * ls); y0 = Math.min(y0, Math.floor(y0 / (4 * ls)) * 4 * ls);
  const repetare = d < 0.3 ? Math.min(1, Math.max(0.2, 1 - Math.exp(-5 * d))) : 1;
  const linii = straturiCrosshatch(z, repetare, ls, x1 - x0, y1 - y0).map((l) => l.map((v, i) => v + (i % 2 === 0 ? x0 : y0)));
  return inapoi(linii, unghi, pol).filter((l) => lungimeL(l) >= 0.8 * sp);
}

const lungimeL = (p: readonly number[]): number => { let L = 0; for (let i = 2; i < p.length; i += 2) L += Math.hypot(p[i]! - p[i - 2]!, p[i + 1]! - p[i - 1]!); return L; };

function straturiCrosshatch(zIn: number, repetare: number, grila: number, latime: number, inaltime: number): number[][] {
  const tranzitie = grila * 0.4, rep = grila * repetare;
  const z = zIn + rep / 2 + tranzitie;
  const perioada = tranzitie + rep;
  const rest = z - Math.floor(z / perioada) * perioada;
  const tz = rest - rep;
  const faza = (z % (perioada * 2)) - (perioada - 1e-6);
  const directie = faza <= 0 ? -1 : 1;
  if (tz < 0) return repetitie(directie, grila, latime, inaltime);
  const progres = (tz % tranzitie) / tranzitie;
  return progres < 0.5 ? transformare((progres + 0.1) * 2, directie, grila, latime, inaltime) : transformare((1.1 - progres) * 2, -directie, grila, latime, inaltime);
}

function repetitie(directie: number, grila: number, latimeIn: number, inaltimeIn: number): number[][] {
  const [latime, inaltime] = directie < 0 ? [inaltimeIn, latimeIn] : [latimeIn, inaltimeIn];
  const r: number[][] = [];
  for (let i = 0; i < Math.floor(inaltime / grila) + 1; i++) r.push([0, grila * i, latime, grila * i]);
  return directie < 0 ? r.map(schimbaXY) : r;
}

const schimbaXY = (l: number[]): number[] => { const r: number[] = []; for (let i = 0; i < l.length; i += 2) r.push(l[i + 1]!, l[i]!); return r; };

function transformare(progres: number, directie: number, grilaIn: number, latimeIn: number, inaltimeIn: number): number[][] {
  const grila = grilaIn * 2;
  const o = progres * (1 / 8) * grila;
  const ciclu = [0.25 * grila - o, o, 0.25 * grila + o, o, 0.75 * grila - o, -o, 0.75 * grila + o, -o];
  const [latime, inaltime] = directie < 0 ? [inaltimeIn, latimeIn] : [latimeIn, inaltimeIn];
  const impar: number[] = [];
  for (let i = 0; i < Math.trunc(latime / grila + 2); i++) for (let j = 0; j < ciclu.length; j += 2) impar.push(ciclu[j]! + i * grila, ciclu[j + 1]!);
  const r: number[][] = [];
  const n = Math.trunc(inaltime / grila + 2);
  for (let i = 0; i < n; i++) r.push(impar.map((v, j) => (j % 2 === 0 ? v : v + grila * i)));
  for (let i = 0; i < n; i++) r.push(impar.map((v, j) => (j % 2 === 0 ? v - 0.5 * grila : v + (i + 0.5) * grila)));
  return directie < 0 ? r.map(schimbaXY) : r;
}

/** Punctul n al curbei Hilbert (`hilbert_n_to_xy`). */
function hilbertXY(n: number): [number, number] {
  const urm = [4, 0, 0, 12, 0, 4, 4, 8, 12, 8, 8, 4, 8, 12, 12, 0];
  const dx = [0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0];
  const dy = [0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1];
  let cifre = 0;
  for (let c = n; c > 0; c = Math.floor(c / 4)) cifre++;
  let stare = cifre & 1 ? 4 : 0, x = 0, y = 0;
  for (let i = cifre - 1; i >= 0; i--) {
    const c = Math.floor(n / 4 ** i) % 4;
    stare += c;
    x += dx[stare]! * 2 ** i; y += dy[stare]! * 2 ** i;
    stare = urm[stare]!;
  }
  return [x, y];
}

export type FelCurba = 'hilbertcurve' | 'archimedeanchords' | 'octagramspiral';

/**
 * Curbele planului (`FillPlanePath`): Hilbert (pornită din colțul cutiei piesei), coardele lui Arhimede și spirala octogramă
 * (centrate în cutia piesei), la distanța sp / d între linii; direcția, unghi + 90° (fără alternare). `cutiePiesa`: cutia
 * piesei întregi (aceeași pe fiecare strat), [x0, y0, x1, y1].
 */
export function curba(fel: FelCurba, pol: Poligoane, unghi: number, sp: number, d: number, cutiePiesa: readonly [number, number, number, number]): number[][] {
  const a = unghi + 90;
  const dist = sp / d;
  const [bx0, by0, bx1, by1] = cutie([rotit(cutieColturiDin(cutiePiesa), -a)]);
  const centrata = fel !== 'hilbertcurve';
  const [sx, sy] = centrata ? [(bx0 + bx1) / 2, (by0 + by1) / 2] : [bx0, by0];
  const minx = Math.ceil((bx0 - sx) / dist), miny = Math.ceil((by0 - sy) / dist), maxx = Math.ceil((bx1 - sx) / dist), maxy = Math.ceil((by1 - sy) / dist);
  const p: number[] = [];
  if (fel === 'hilbertcurve') {
    let sz = 2;
    while (sz < Math.max(maxx + 1 - minx, maxy + 1 - miny)) sz *= 2;
    for (let i = 0; i < sz * sz; i++) { const [x, y] = hilbertXY(i); p.push(x + minx, y + miny); }
  } else {
    const rmax = Math.hypot(maxx, maxy) * Math.SQRT2 + 1.5;
    if (fel === 'archimedeanchords') {
      const rez = 0.012 / dist;
      let theta = 0, r = 1;
      p.push(0, 0, 1, 0);
      while (r < rmax) { theta += 2 * Math.acos(1 - Math.min(1, rez / r)); r = 1 + theta / (2 * Math.PI); p.push(r * Math.cos(theta), r * Math.sin(theta)); }
    } else {
      let r = 0;
      const inc = Math.SQRT2;
      p.push(0, 0);
      while (r < rmax) {
        r += inc;
        const rx = r / Math.SQRT2, r2 = r + rx;
        p.push(r, 0, r2, rx, rx, rx, rx, r2, 0, r, -rx, r2, -rx, rx, -r2, rx, -r, 0, -r2, -rx, -rx, -rx, -rx, -r2, 0, -r, rx, -r2, rx, -rx, r2 + inc, -rx);
      }
    }
  }
  const l = p.map((v, i) => v * dist + (i % 2 === 0 ? sx : sy));
  return inapoi([l], a, pol);
}

const cutieColturiDin = ([x0, y0, x1, y1]: readonly [number, number, number, number]): number[] => [x0, y0, x1, y0, x1, y1, x0, y1];
