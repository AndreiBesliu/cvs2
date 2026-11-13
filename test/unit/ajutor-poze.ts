import type { ImagineRGBA } from '../../src/trasare/trasare.ts';

/**
 * Pozele sintetice ale probelor luminii (ADR 0224): un desen cu linii pe hârtie, cu cerneala știută pe pixel, luminat inegal,
 * cu zgomot; la cerere o pată plină, o umbră tare, masa în jurul foii (foaia ușor rotită) sau creta pe tablă (cerneala
 * deschisă pe fondul închis). Acoperirea unei linii de grosime w la distanța d de axa ei e clamp(w/2 − d + 0,5), deci
 * cerneala adevărată (acoperirea de cel puțin 50 %) e d ≤ w/2.
 */
export type Poza = ImagineRGBA & {
  /** Cerneala adevărată, pe foaie (1), și foaia (1; restul e masa). */
  readonly adevar: Uint8Array; readonly hartie: Uint8Array;
  /** Luminozitatea fiecărui pixel, 0–1 (cea scrisă și în RGBA), și acoperirea lui cu cerneală (0 pe masă). */
  readonly l: Float32Array; readonly acoperire: Float32Array;
};

export type CumPoza = {
  readonly W: number; readonly H: number;
  /** Lumina în (x, y), ca factor; lipsă: 0,97 peste tot. */
  readonly lumina?: (x: number, y: number) => number;
  readonly pata?: boolean; readonly umbra?: boolean; readonly masa?: boolean; readonly creta?: boolean;
  /** Un desen rar (un zigzag larg, un cerc, o linie: cerneala nu umple nicio fereastră), în locul celui des. */
  readonly rar?: boolean;
  /** Un desen dat (liniile lui), în locul celui des sau rar. */
  readonly desen?: readonly Linie[];
  /** Abaterea zgomotului (aproape gaussian); lipsă: 0,025. */
  readonly zgomot?: number;
  readonly samanta?: number;
};

export type Linie = { readonly P: ReadonlyArray<readonly [number, number]>; readonly w: number };

/** Desenul, pe o foaie de W × H: patru rânduri de zigzaguri (3–6 px), un cerc (4 px), o spirală (3 px). */
export function desenPoza(W: number, H: number, masa = false): Linie[] {
  // Pe masă, desenul se strânge spre mijloc, ca să nu atingă marginea foii rotite.
  const sx = (masa ? 0.82 : 0.95) * W / 1200, sy = (masa ? 0.82 : 0.95) * H / 800;
  const ox = masa ? 0.09 * W : 0.02 * W, oy = masa ? 0.09 * H : 0.02 * H;
  const L: Linie[] = [];
  for (let rand = 0; rand < 4; rand++) {
    const P: Array<[number, number]> = [];
    for (let t = 0; t <= 140; t++) P.push([ox + (40 + t * 6) * sx, oy + (60 + rand * 120) * sy + 22 * sy * Math.sin(t * 0.55) + 10 * sy * Math.sin(t * 0.13 + rand)]);
    L.push({ P, w: 3 + rand });
  }
  L.push({ P: Array.from({ length: 121 }, (_, k) => [ox + 980 * sx + 90 * sx * Math.cos((2 * Math.PI * k) / 120), oy + 200 * sy + 90 * sy * Math.sin((2 * Math.PI * k) / 120)] as [number, number]), w: 4 });
  L.push({ P: Array.from({ length: 300 }, (_, k) => { const u = (k / 299) * 6 * Math.PI, r = 8 + u * 9; return [ox + 980 * sx + r * sx * Math.cos(u), oy + 520 * sy + r * sy * Math.sin(u)] as [number, number]; }), w: 3 });
  return L;
}

/** Desenul rar, ca în e2e: un zigzag cu dinții la 25 px, un cerc (raza 55) și o linie, toate de 6 px, pe o foaie de 600 × 400. */
export function desenRar(W: number, H: number): Linie[] {
  const sx = W / 600, sy = H / 400;
  return [
    { P: Array.from({ length: 9 }, (_, i) => [(100 + 25 * i) * sx, (100 + (i % 2 === 0 ? -25 : 25)) * sy] as [number, number]), w: 6 },
    { P: Array.from({ length: 121 }, (_, k) => [(450 + 55 * Math.cos((2 * Math.PI * k) / 120)) * sx, (200 + 55 * Math.sin((2 * Math.PI * k) / 120)) * sy] as [number, number]), w: 6 },
    { P: [[100 * sx, 300 * sy], [350 * sx, 320 * sy]], w: 6 },
  ];
}

/** Acoperirea cu cerneală a fiecărui pixel (centrul lui la x + 0,5, y + 0,5), de la linii și dreptunghiuri pline. */
export function acoperirePoza(W: number, H: number, linii: readonly Linie[], pline: ReadonlyArray<readonly [number, number, number, number]> = []): Float32Array {
  const a = new Float32Array(W * H);
  for (const { P, w } of linii) {
    for (let i = 0; i + 1 < P.length; i++) {
      const [ax, ay] = P[i] ?? [0, 0], [bx, by] = P[i + 1] ?? [0, 0];
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - w)), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + w));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by) - w)), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + w));
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
          const c = Math.max(0, Math.min(1, w / 2 - Math.hypot(ax + t * dx - px, ay + t * dy - py) + 0.5));
          const p = y * W + x;
          if (c > (a[p] ?? 0)) a[p] = c;
        }
      }
    }
  }
  for (const [x0, y0, x1, y1] of pline) {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.ceil(y1)); y++) {
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) {
        const c = Math.max(0, Math.min(1, x + 1 - x0, x1 - x)) * Math.max(0, Math.min(1, y + 1 - y0, y1 - y));
        const p = y * W + x;
        if (c > (a[p] ?? 0)) a[p] = c;
      }
    }
  }
  return a;
}

/** Lumina care scade dintr-un colț în cel opus (de la 87,5 % la 17,5 %: de cinci ori), cu vignetarea, ca în prototip. */
export const luminaLaterala = (W: number, H: number) => (x: number, y: number): number =>
  1 - 0.45 * (x / W) - 0.25 * (y / H) - 0.25 * (((x - W / 2) / W) ** 2 + ((y - H / 2) / H) ** 2);

export function poza(o: CumPoza): Poza {
  const { W, H } = o;
  let s = o.samanta ?? 3;
  const r = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  // Ca în prototip: suma a șase uniforme, centrată (abaterea ~0,71), înmulțită cu `zgomot`.
  const gauss = (): number => { let t = 0; for (let i = 0; i < 6; i++) t += r(); return t - 3; };
  const pline: Array<readonly [number, number, number, number]> = o.pata ? [[0.125 * W, 0.65 * H, 0.39 * W, 0.875 * H]] : [];
  const ac = acoperirePoza(W, H, o.desen ?? (o.rar ? desenRar(W, H) : desenPoza(W, H, o.masa)), pline);
  const lumina = o.lumina ?? ((): number => 0.97), zg = o.zgomot ?? 0.025;
  const date = new Uint8ClampedArray(W * H * 4), adevar = new Uint8Array(W * H), hartie = new Uint8Array(W * H).fill(1), l = new Float32Array(W * H);
  const acoperire = new Float32Array(W * H);
  const [fond, cer] = o.creta ? [0.15, 0.85] : [0.93, 0.12];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (o.masa) {
        const u = (x - W / 2) * Math.cos(0.04) + (y - H / 2) * Math.sin(0.04), v = -(x - W / 2) * Math.sin(0.04) + (y - H / 2) * Math.cos(0.04);
        if (Math.abs(u) > W / 2 - 0.025 * W || Math.abs(v) > H / 2 - 0.03 * H) hartie[p] = 0;
      }
      let lum = lumina(x, y);
      if (o.umbra && x / W + 0.6 * (y / W) > 700 / 1200 && x / W + 0.6 * (y / W) < 980 / 1200) lum *= 0.62;
      const c = hartie[p] ? ac[p] ?? 0 : 0;
      adevar[p] = hartie[p] && c >= 0.5 ? 1 : 0;
      acoperire[p] = c;
      const baza = hartie[p] ? fond * (1 - c) + cer * c : 0.18;
      const v = Math.max(0, Math.min(1, lum * baza + zg * gauss()));
      l[p] = v;
      const b = Math.round(255 * v);
      date[4 * p] = b; date[4 * p + 1] = b; date[4 * p + 2] = b; date[4 * p + 3] = 255;
    }
  }
  return { latime: W, inaltime: H, date, adevar, hartie, l, acoperire };
}

/**
 * Cerneala găsită (câmpul peste prag) față de cea adevărată: în plus și lipsă, ca parte din cerneala adevărată. O greșeală e
 * un pixel clar de partea cealaltă: în plus, unul cu acoperirea sub 0,4 (sau de pe masă); lipsă, unul cu acoperirea de cel
 * puțin 0,6. Pe marginea unei trăsături subțiri, pragul automat (mijlocul mediilor claselor, ADR 0220 §3) cade la acoperirea
 * ~0,47, nu 0,5 (pixelii parțiali trag media cernelii spre hârtie): un pixel cu 0,47–0,5 nu e o greșeală a luminii.
 */
export function erori(p: Poza, f: Float32Array, T: number): { readonly plus: number; readonly lipsa: number } {
  let plus = 0, lipsa = 0, ad = 0;
  for (let i = 0; i < p.adevar.length; i++) {
    const e = (f[i] ?? 0) >= T, c = p.acoperire[i] ?? 0;
    if (p.adevar[i] === 1) ad++;
    if (e && c < 0.4) plus++;
    if (!e && c >= 0.6) lipsa++;
  }
  return { plus: plus / Math.max(1, ad), lipsa: lipsa / Math.max(1, ad) };
}

// ── Foaia pozată oblic (ADR 0225) ──────────────────────────────────────────────────────────────────────────────────

/** Foaia A4 (mm) și formele de pe ea, de mărime știută: un pătrat de 60 mm, un disc de 50, un dreptunghi de 120 × 25 și un
 *  inel de 70 / 50 (y în jos, din colțul stânga-sus al foii). */
export const FOAIE_A4 = { w: 210, h: 297 } as const;
type FormaFoaie = { readonly fel: 'patrat' | 'disc' | 'drept' | 'inel'; readonly cx: number; readonly cy: number; readonly a: number; readonly b: number };
export const FORME_FOAIE: readonly FormaFoaie[] = [
  { fel: 'patrat', cx: 60, cy: 70, a: 60, b: 60 },
  { fel: 'disc', cx: 150, cy: 75, a: 25, b: 0 },
  { fel: 'drept', cx: 105, cy: 155, a: 120, b: 25 },
  { fel: 'inel', cx: 105, cy: 230, a: 35, b: 25 },
];
/** Distanța cu semn de la (x, y) mm la marginea formei (negativă înăuntru). */
function distForma(f: FormaFoaie, x: number, y: number): number {
  const dx = x - f.cx, dy = y - f.cy;
  if (f.fel === 'disc') return Math.hypot(dx, dy) - f.a;
  if (f.fel === 'inel') { const r = Math.hypot(dx, dy); return Math.max(r - f.a, f.b - r); }
  const qx = Math.abs(dx) - f.a / 2, qy = Math.abs(dy) - f.b / 2;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
}
/** Distanța de la (x, y) mm la marginea celei mai apropiate forme de pe foaie. */
export const distFormeFoaie = (x: number, y: number): number => Math.min(...FORME_FOAIE.map((f) => Math.abs(distForma(f, x, y))));

type P2 = readonly [number, number];
/** Omografia care duce `de[i]` în `la[i]` (4 perechi), cu h33 = 1 (Gauss cu pivot pe 8 × 8). */
function omografie4(de: readonly P2[], la: readonly P2[]): Float64Array {
  const M: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = de[i] ?? [0, 0], [u, v] = la[i] ?? [0, 0];
    M.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let k = 0; k < 8; k++) {
    let p = k;
    for (let i = k + 1; i < 8; i++) if (Math.abs(M[i]?.[k] ?? 0) > Math.abs(M[p]?.[k] ?? 0)) p = i;
    [M[k], M[p]] = [M[p] ?? [], M[k] ?? []];
    for (let i = 0; i < 8; i++) {
      if (i === k) continue;
      const f = (M[i]?.[k] ?? 0) / (M[k]?.[k] ?? 1);
      for (let j = k; j <= 8; j++) (M[i] as number[])[j] = (M[i]?.[j] ?? 0) - f * (M[k]?.[j] ?? 0);
    }
  }
  return Float64Array.from([...M.map((r, i) => (r[8] ?? 0) / (r[i] ?? 1)), 1]);
}
const prin = (H: Float64Array, x: number, y: number): P2 => {
  const w = (H[6] ?? 0) * x + (H[7] ?? 0) * y + (H[8] ?? 1);
  return [((H[0] ?? 0) * x + (H[1] ?? 0) * y + (H[2] ?? 0)) / w, ((H[3] ?? 0) * x + (H[4] ?? 0) * y + (H[5] ?? 0)) / w];
};

export type PozaFoaie = ImagineRGBA & {
  /** Colțurile adevărate ale foii în poză (stânga-sus, dreapta-sus, dreapta-jos, stânga-jos ai foii), în px. */
  readonly colturi: readonly [P2, P2, P2, P2];
};
export type CumFoaie = {
  readonly W: number; readonly H: number; readonly focala: number;
  /** Unghiurile foii față de cameră (grade): înclinarea în jurul lui X, rotirea în planul ei, și în jurul lui Y. */
  readonly inclinare: number; readonly rotire: number; readonly laterala: number;
  /** Depărtarea centrului foii de cameră, în mm. */
  readonly dist: number;
  /** Foaia toată (fără masă în jur): masa nu se vede. */
  readonly faraMasa?: boolean;
};

/** Colțurile foii A4 în poză (stânga-sus, dreapta-sus, dreapta-jos, stânga-jos ai foii), cu camera dată. */
export function colturiFoaie(o: CumFoaie): readonly [P2, P2, P2, P2] {
  const { W, H, focala: f } = o;
  const rx = (o.inclinare * Math.PI) / 180, rz = (o.rotire * Math.PI) / 180, ry = (o.laterala * Math.PI) / 180;
  const Rx = [[1, 0, 0], [0, Math.cos(rx), -Math.sin(rx)], [0, Math.sin(rx), Math.cos(rx)]];
  const Ry = [[Math.cos(ry), 0, Math.sin(ry)], [0, 1, 0], [-Math.sin(ry), 0, Math.cos(ry)]];
  const Rz = [[Math.cos(rz), -Math.sin(rz), 0], [Math.sin(rz), Math.cos(rz), 0], [0, 0, 1]];
  const mul = (A: number[][], B: number[][]): number[][] => A.map((r) => (B[0] ?? []).map((_, j) => r.reduce((s, a, k) => s + a * (B[k]?.[j] ?? 0), 0)));
  const R = mul(Rx, mul(Ry, Rz));
  const proiecteaza = (x: number, y: number): P2 => {
    const u = x - FOAIE_A4.w / 2, v = y - FOAIE_A4.h / 2, r = (i: number, j: number): number => R[i]?.[j] ?? 0;
    const X = r(0, 0) * u + r(0, 1) * v, Y = r(1, 0) * u + r(1, 1) * v, Z = r(2, 0) * u + r(2, 1) * v + o.dist;
    return [W / 2 + (f * X) / Z, H / 2 + (f * Y) / Z];
  };
  return [proiecteaza(0, 0), proiecteaza(FOAIE_A4.w, 0), proiecteaza(FOAIE_A4.w, FOAIE_A4.h), proiecteaza(0, FOAIE_A4.h)];
}

/**
 * O foaie A4 cu formele ei, pozată cu o cameră pinhole (centrul optic în mijlocul imaginii), pe o masă (0,2, cu o textură
 * în dungi), cu lumina dintr-o parte (de la 100 % la 50 %) și zgomot; 3 × 3 eșantioane pe pixel.
 */
export function pozaFoaie(o: CumFoaie): PozaFoaie {
  const { W, H } = o, colturi = colturiFoaie(o);
  const inv = omografie4(colturi, [[0, 0], [FOAIE_A4.w, 0], [FOAIE_A4.w, FOAIE_A4.h], [0, FOAIE_A4.h]]);
  let s = 9;
  const r = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const date = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let t = 0;
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          const [u, v] = prin(inv, x + (i + 0.5) / 3, y + (j + 0.5) / 3);
          const peFoaie = o.faraMasa === true || (u >= 0 && v >= 0 && u <= FOAIE_A4.w && v <= FOAIE_A4.h);
          t += peFoaie ? (FORME_FOAIE.some((fo) => distForma(fo, u, v) <= 0) ? 0.12 : 0.93) : 0.2 + 0.05 * Math.sin(x * 0.07 + y * 0.013);
        }
      }
      const g = Math.max(0, Math.min(1, ((1 - 0.35 * (x / W) - 0.15 * (y / H)) * t) / 9 + 0.015 * (r() + r() + r() - 1.5)));
      const b = Math.round(255 * g);
      date[4 * (y * W + x)] = b; date[4 * (y * W + x) + 1] = b; date[4 * (y * W + x) + 2] = b; date[4 * (y * W + x) + 3] = 255;
    }
  }
  return { latime: W, inaltime: H, date, colturi };
}

/** Pozele probelor (1600 × 1200 px, focala 1400): aproape din față, înclinată 25°, 40°, rotită 30° în planul ei. */
export const POZE_FOAIE = {
  fata: { W: 1600, H: 1200, focala: 1400, inclinare: 8, rotire: 3, laterala: 2, dist: 420 },
  inclinata25: { W: 1600, H: 1200, focala: 1400, inclinare: 25, rotire: 8, laterala: 5, dist: 440 },
  inclinata40: { W: 1600, H: 1200, focala: 1400, inclinare: 40, rotire: -12, laterala: 10, dist: 470 },
  rotita30: { W: 1600, H: 1200, focala: 1400, inclinare: 15, rotire: 30, laterala: 0, dist: 470 },
} as const satisfies Record<string, CumFoaie>;

// ── Poze color (ADR 0226) ──────────────────────────────────────────────────────────────────────────────────────────────

/** Hârtia albă și cele cinci cerneluri ale pozelor color: roșu, albastru, verde, negru și galben (cerneala deschisă). */
export const HARTIE_COLOR = [242, 240, 234] as const;
export const CERNELURI_COLOR: ReadonlyArray<readonly [number, number, number]> = [
  [196, 38, 42], [38, 72, 186], [44, 146, 70], [28, 26, 30], [236, 196, 36],
];

/** Clasa adevărată în (x, y) (0: hârtia, 1–5: cernelurile): formele pline (un disc, un dreptunghi, un triunghi, linii negre,
 *  un inel) sau, cu `linii`, un desen cu trăsături de 6 px (cercuri și linii). */
function clasaColor(x: number, y: number, W: number, H: number, linii: boolean): number {
  const u = x / W, v = y / H;
  if (linii) {
    const g = 3, cerc = (cx: number, cy: number, r: number): boolean => Math.abs(Math.hypot(x - cx, y - cy) - r) < g;
    if (cerc(0.2 * W, 0.3 * H, 60)) return 1;
    if ((Math.abs(y - 0.25 * H) < g && x > 0.4 * W && x < 0.6 * W) || (Math.abs(x - 0.5 * W) < g && y > 0.3 * H && y < 0.55 * H)) return 2;
    if (Math.abs((x - 0.1 * W) - (y - 0.6 * H)) < g * 1.4 && y > 0.6 * H && y < 0.9 * H) return 3;
    for (const vv of [0.62, 0.72, 0.82]) if (Math.abs(y - vv * H) < g && x > 0.4 * W && x < 0.62 * W) return 4;
    return cerc(0.8 * W, 0.55 * H, 50) ? 5 : 0;
  }
  if (Math.hypot(u - 0.2, (v - 0.3) * (H / W)) < 0.1) return 1;
  if (u > 0.4 && u < 0.6 && v > 0.15 && v < 0.45) return 2;
  if (v > 0.6 && v < 0.9 && Math.abs(u - 0.2) < (v - 0.6) * 0.5) return 3;
  for (const vv of [0.62, 0.72, 0.82]) if (u > 0.4 && u < 0.62 && Math.abs(v - vv) < 0.018) return 4;
  const r = Math.hypot(u - 0.8, (v - 0.55) * (H / W));
  return r < 0.11 && r > 0.06 ? 5 : 0;
}

export type CumColor = {
  readonly W: number; readonly H: number;
  /** Lumina dintr-o parte (de la 1 la 1 − laterala, plus 8 % pe verticală), umbra tare (o bandă la 60 %) și o dominantă
   *  care se schimbă de-a lungul foii (roșul de la +6 % la −6 %, albastrul invers). */
  readonly laterala?: number; readonly umbra?: boolean; readonly dominanta?: boolean;
  /** Creta colorată (deschisă) pe tablă (0,12), cu negrul înlocuit de alb. */
  readonly tabla?: boolean;
  /** Un desen cu linii colorate de 6 px, în locul formelor pline. */
  readonly linii?: boolean;
  /** Fundalul transparent (alfa 0) în locul hârtiei. */
  readonly transparent?: boolean;
  readonly zgomot?: number; readonly samanta?: number;
};
export type PozaColor = ImagineRGBA & {
  /** Clasa majoritară a fiecărui pixel și dacă pixelul e curat (o singură clasă, nu pe o margine). */
  readonly adevar: Uint8Array; readonly curat: Uint8Array;
};

/** O poză color sintetică, 2 × 2 eșantioane pe pixel, cu zgomot (aproape gaussian, abaterea `zgomot`, implicit 0,02). */
export function pozaColor(o: CumColor): PozaColor {
  const { W, H } = o, d = new Uint8ClampedArray(W * H * 4), adevar = new Uint8Array(W * H), curat = new Uint8Array(W * H);
  let s = o.samanta ?? 11;
  const rnd = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const culoare = (c: number): readonly [number, number, number] => {
    if (c === 0) return o.tabla ? [30, 34, 32] : HARTIE_COLOR;
    const k = CERNELURI_COLOR[c - 1] ?? [0, 0, 0];
    return o.tabla ? (c === 4 ? [235, 235, 230] : [k[0] * 0.5 + 120, k[1] * 0.5 + 120, k[2] * 0.5 + 120]) : k;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nr = [0, 0, 0, 0, 0, 0], acc = [0, 0, 0];
      let alfa = 0;
      for (let j = 0; j < 2; j++) {
        for (let i = 0; i < 2; i++) {
          const c = clasaColor(x + 0.25 + 0.5 * i, y + 0.25 + 0.5 * j, W, H, o.linii === true);
          nr[c] = (nr[c] ?? 0) + 1;
          const k = culoare(c);
          acc[0] = (acc[0] ?? 0) + k[0]; acc[1] = (acc[1] ?? 0) + k[1]; acc[2] = (acc[2] ?? 0) + k[2];
          alfa += o.transparent && c === 0 ? 0 : 1;
        }
      }
      let mx = 0;
      for (let c = 1; c < 6; c++) if ((nr[c] ?? 0) > (nr[mx] ?? 0)) mx = c;
      adevar[y * W + x] = mx;
      curat[y * W + x] = (nr[mx] ?? 0) === 4 ? 1 : 0;
      const u = x / W, v = y / H;
      let l = 1 - (o.laterala ?? 0) * u - 0.08 * v;
      if (o.umbra && u > 0.62 && u < 0.72) l *= 0.6;
      const dr = o.dominanta ? 1.06 - 0.12 * u : 1, db = o.dominanta ? 0.94 + 0.12 * u : 1, z = o.zgomot ?? 0.02;
      const zg = (): number => 255 * z * (rnd() + rnd() + rnd() - 1.5);
      const q = 4 * (y * W + x);
      d[q] = (l * dr * (acc[0] ?? 0)) / 4 + zg(); d[q + 1] = (l * (acc[1] ?? 0)) / 4 + zg(); d[q + 2] = (l * db * (acc[2] ?? 0)) / 4 + zg();
      d[q + 3] = Math.round((255 * alfa) / 4);
    }
  }
  return { latime: W, inaltime: H, date: d, adevar, curat };
}

export type CuloriMasurate = {
  /** Câte culori au ieșit (cu fundalul). */
  readonly K: number;
  /** Clasele adevărate rupte în mai multe culori (a doua culoare a clasei are peste 5 % din pixelii ei curați) și perechile
   *  de clase unite (aceeași culoare majoritară); numele: „hârtia” și indicii cernelurilor, 1–5. */
  readonly despartite: readonly string[]; readonly unite: readonly string[];
  /** Pixelii curați care nu au culoarea majoritară a clasei lor. */
  readonly gresite: number;
  /** Culoarea majoritară a fiecărei clase, ca [r, g, b] din paletă. */
  readonly culori: ReadonlyArray<readonly [number, number, number]>;
};

/** Culorile găsite de trasare față de clasele adevărate ale pozei, pe pixelii curați. */
export function culoriMasurate(p: PozaColor, r: { readonly etichete: Uint8Array; readonly raport: { readonly paleta: ReadonlyArray<{ readonly hex: string }> } }): CuloriMasurate {
  const K = r.raport.paleta.length, n = p.latime * p.inaltime, m = Array.from({ length: 6 }, () => new Float64Array(K));
  for (let i = 0; i < n; i++) {
    const e = r.etichete[i] ?? 255, c = m[p.adevar[i] ?? 0];
    if (p.curat[i] && e < K && c) c[e] = (c[e] ?? 0) + 1;
  }
  const nume = ['hârtia', '1', '2', '3', '4', '5'];
  const despartite: string[] = [], maj: number[] = [];
  let gresite = 0, tot = 0;
  for (let c = 0; c < 6; c++) {
    const rand = [...(m[c] ?? [])], suma = rand.reduce((a, b) => a + b, 0), ord = rand.map((v, k) => [v, k] as const).sort((a, b) => b[0] - a[0]);
    maj.push(ord[0]?.[1] ?? -1);
    if (suma > 0 && (ord[1]?.[0] ?? 0) > 0.05 * suma) despartite.push(nume[c] ?? '');
    gresite += suma - (ord[0]?.[0] ?? 0); tot += suma;
  }
  const unite: string[] = [];
  for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) if (maj[a] === maj[b] && (maj[a] ?? -1) >= 0) unite.push(`${nume[a]}+${nume[b]}`);
  const hex = (k: number): readonly [number, number, number] => {
    const h = r.raport.paleta[k]?.hex ?? '#000000';
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  };
  return { K, despartite, unite, gresite: gresite / Math.max(1, tot), culori: maj.map((k) => hex(k)) };
}
