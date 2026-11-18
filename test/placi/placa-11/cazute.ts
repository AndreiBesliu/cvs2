import { FOAIA, FREZA_RAMA, URECHI } from './genereaza.ts';

/**
 * Proba urechilor pe G-code, a plăcii 11 (felia 11.7↑), independentă de aplicație: citește programul scris, nu IR-ul, și
 * taie cu discul frezei, nu cu nucleul simulării. O folosesc proba plăcii (`placa11.test.ts`) și, ca a doua plasă, proba
 * urechilor de la export (`urechi.export.test.ts`, felia 11.3↑c).
 */
const NL = String.fromCharCode(10);
const numar = (r: RegExpExecArray | null): number | undefined => (r ? Number(r[1]) : undefined);

/**
 * Plăcuțele căzute la capătul unui program de ramă: rasterul foii la 0,1 mm, tăiat de discul frezei pe fiecare segment coborât
 * la toată grosimea (arcele, pe 16 coarde), apoi umplut din marginea foii prin lemnul rămas pe fund; o plăcuță al cărei mijloc
 * nu e atins nu mai ține de foaie. Cu `taieUrechile`, și segmentele ridicate pe urechi taie (proba de control).
 */
export function cazute(text: string, mijloace: readonly (readonly [number, number])[], taieUrechile = false): number[] {
  const h = 0.1, R = FREZA_RAMA.diametru / 2;
  const nx = Math.round(FOAIA.latime / h), ny = Math.round(FOAIA.inaltime / h);
  const g = new Uint8Array(nx * ny);
  const prag = -FOAIA.grosime + (taieUrechile ? URECHI.grosime : 0) + 1e-3;
  const taie = (ax: number, ay: number, bx: number, by: number): void => {
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - R) / h)), i1 = Math.min(nx - 1, Math.ceil((Math.max(ax, bx) + R) / h));
    const j0 = Math.max(0, Math.floor((Math.min(ay, by) - R) / h)), j1 = Math.min(ny - 1, Math.ceil((Math.max(ay, by) + R) / h));
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = (i + 0.5) * h, py = (j + 0.5) * h;
      const t = L2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)) : 0;
      const ex = ax + t * dx - px, ey = ay + t * dy - py;
      if (ex * ex + ey * ey < R * R) g[j * nx + i] = 1;
    }
  };
  let x = Number.NaN, y = Number.NaN, z = Number.NaN;
  for (const l of text.split(NL)) {
    const m = /^G([0123]) /.exec(l);
    if (!m) continue;
    const X = numar(/X(-?\d+\.\d+)/.exec(l)) ?? x, Y = numar(/Y(-?\d+\.\d+)/.exec(l)) ?? y, Z = numar(/Z(-?\d+\.\d+)/.exec(l)) ?? z;
    if (Math.max(z, Z) <= prag && (X !== x || Y !== y)) {
      if (m[1] === '2' || m[1] === '3') {
        const semn = m[1] === '2' ? -1 : 1;
        const cx = x + (numar(/I(-?\d+\.\d+)/.exec(l)) ?? 0), cy = y + (numar(/J(-?\d+\.\d+)/.exec(l)) ?? 0);
        const r = Math.hypot(x - cx, y - cy), a0 = Math.atan2(y - cy, x - cx);
        let s = semn * (Math.atan2(Y - cy, X - cx) - a0);
        while (s <= 0) s += 2 * Math.PI;
        let px = x, py = y;
        for (let k = 1; k <= 16; k++) {
          const a = a0 + semn * s * (k / 16);
          const qx = k === 16 ? X : cx + r * Math.cos(a), qy = k === 16 ? Y : cy + r * Math.sin(a);
          taie(px, py, qx, qy);
          px = qx; py = qy;
        }
      } else taie(x, y, X, Y);
    }
    x = X; y = Y; z = Z;
  }
  const coada = new Int32Array(nx * ny);
  let cap = 0, capat = 0;
  const pune = (k: number): void => { if (g[k] === 0) { g[k] = 2; coada[capat++] = k; } };
  for (let i = 0; i < nx; i++) { pune(i); pune((ny - 1) * nx + i); }
  for (let j = 0; j < ny; j++) { pune(j * nx); pune(j * nx + nx - 1); }
  while (cap < capat) {
    const k = coada[cap++]!, i = k % nx;
    if (i > 0) pune(k - 1);
    if (i < nx - 1) pune(k + 1);
    if (k >= nx) pune(k - nx);
    if (k < (ny - 1) * nx) pune(k + nx);
  }
  const rez: number[] = [];
  mijloace.forEach(([mx, my], k) => { if (g[Math.floor(my / h) * nx + Math.floor(mx / h)] !== 2) rez.push(k); });
  return rez;
}
